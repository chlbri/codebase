import edit from 'edit-json-file';
import { existsSync } from 'fs';
import { join } from 'path';
import { Node, Project } from 'ts-morph';
import { PATH_PROPERTY } from '../../constants';
import { consoleStars, getFolderPath } from '../../helpers';
import { CodebaseAnalysis } from '../../schemas';
import { removeUnusedDeclarations } from './declarations';
import { cleanEmptySourceFiles } from './files';
import { removeUnusedImports } from './imports';
import { cleanEmptyDirectories } from './directories';
import type { LiftOutput } from './types';

/**
 * Internal orchestrator for lifting codebase files. It adds the files to a ts-morph project,
 * repeatedly prunes unused declarations and imports (observing the provided exceptions),
 * purges empty files and empty folders, and saves changes back to disk.
 *
 * @param root - The codebase target folder path.
 * @param jsonConfigPath - The codebase JSON config filepath.
 * @param CODEBASE_ANALYSIS - The full codebase analysis configuration object.
 * @param exceptions - An array of identifiers to preserve during pruning.
 * @param project - An optional ts-morph project instance to reuse.
 * @returns type {@linkcode LiftOutput} if successful, false otherwise.
 */
const _lift = (
  root: string,
  jsonConfigPath: string,
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  exceptions: string[],
  project?: Project,
): LiftOutput => {
  consoleStars();
  console.log('📂 Lifting the codebase ....');
  consoleStars();
  const out: LiftOutput = {
    tokens: [],
    imports: [],
    directories: [],
    files: [],
  };

  const folderPath = getFolderPath(root);

  if (!existsSync(folderPath)) {
    console.log(`Folder not found: ${folderPath}`);
    return out;
  }

  const tsConfigFilePath = join(process.cwd(), 'tsconfig.json');
  const proj =
    project ||
    (existsSync(tsConfigFilePath)
      ? new Project({ tsConfigFilePath })
      : new Project());

  if (!project) {
    // Add all source files recursively if they weren't preloaded
    proj.addSourceFilesAtPaths(join(folderPath, '**/*.ts'));
    proj.addSourceFilesAtPaths(join(folderPath, '**/*.tsx'));
    proj.resolveSourceFileDependencies();
  }

  const isInsideFolder = (filePath: string) => {
    return filePath.startsWith(folderPath);
  };

  // Optimize outsideExports by avoiding querying declaration files & node_modules.
  const outsideExports = proj
    .getSourceFiles()
    .filter(sf => {
      const path = sf.getFilePath();
      return (
        !isInsideFolder(path) &&
        !path.includes('node_modules') &&
        !sf.isDeclarationFile()
      );
    })
    .flatMap(sf => {
      const exports = sf.getExportedDeclarations();
      const names: string[] = [];

      for (const [name, decls] of exports) {
        if (name === 'default') continue;

        // Check if this export name is explicitly declared/named in sf
        // (rather than being re-exported via export * from '...')
        const isExplicit = decls.some(decl => {
          const declPath = decl.getSourceFile().getFilePath();
          // If the declaration is defined outside the folder, we protect it
          if (!isInsideFolder(declPath)) return true;

          // If the declaration is defined inside the folder, we only protect it
          // if it is explicitly named in the export declarations of sf.
          const isNamedExport = sf.getExportDeclarations().some(d => {
            if (d.isNamespaceExport()) {
              return d.getNamespaceExport()?.getName() === name;
            }
            return d
              .getNamedExports()
              .some(
                n =>
                  n.getName() === name ||
                  n.getAliasNode()?.getText() === name,
              );
          });

          return isNamedExport;
        });

        if (isExplicit) {
          names.push(name);
        }
      }

      return names;
    });

  const allExceptions = [...exceptions, ...outsideExports];

  const entriesWithExports = Object.entries(CODEBASE_ANALYSIS).filter(
    ([, val]) => val.exports && val.exports.length > 0,
  );

  consoleStars();
  console.log('🧹 Removing unused tokens ....');
  consoleStars();
  console.log();

  let changed = true;

  while (changed) {
    changed = false;

    const outsideExportDecls = proj
      .getSourceFiles()
      .filter(sf => {
        const path = sf.getFilePath();
        return (
          !isInsideFolder(path) &&
          !path.includes('node_modules') &&
          !sf.isDeclarationFile()
        );
      })
      .flatMap(sf => {
        const exports = sf.getExportedDeclarations();
        const decls: Node[] = [];

        for (const [name, nameDecls] of exports) {
          // Check if this export name is explicitly declared/named in sf
          // (rather than being re-exported via export * from '...')
          const isExplicit = nameDecls.some(decl => {
            const declPath = decl.getSourceFile().getFilePath();
            // If the declaration is defined outside the folder, we protect it
            if (!isInsideFolder(declPath)) return true;

            // If the declaration is defined inside the folder, we only protect it
            // if it is explicitly named in the export declarations of sf.
            const isNamedExport = sf.getExportDeclarations().some(d => {
              if (d.isNamespaceExport()) {
                return d.getNamespaceExport()?.getName() === name;
              }
              return d
                .getNamedExports()
                .some(
                  n =>
                    n.getName() === name ||
                    n.getAliasNode()?.getText() === name,
                );
            });

            return isNamedExport;
          });

          if (isExplicit) {
            decls.push(...nameDecls);
          }
        }

        return decls;
      });

    // Phase A: Declarations
    const declsChanged = removeUnusedDeclarations(
      proj,
      isInsideFolder,
      allExceptions,
      outsideExportDecls,
      out,
    );

    // Phase B: Imports
    const importsChanged = removeUnusedImports(
      proj,
      isInsideFolder,
      exceptions,
      outsideExportDecls,
      out,
    );

    changed = declsChanged || importsChanged;
  }

  console.log();
  console.log();

  if (out.tokens.length > 0) {
    console.log(`${out.tokens.length} unused tokens deleted`);
  } else console.log('No unused tokens found');

  console.log();

  if (out.imports.length > 0) {
    console.log(`${out.imports.length} unused imports deleted`);
  } else console.log('No unused imports found');

  console.log();
  console.log();
  consoleStars();
  console.log('🧹 Cleaning empty files ....');
  consoleStars();

  const emptyFilesCount = cleanEmptySourceFiles(
    proj,
    isInsideFolder,
    folderPath,
    jsonConfigPath,
    out,
  );

  if (emptyFilesCount > 0) {
    console.log(`${emptyFilesCount} empty files deleted`);
  } else console.log('No empty files found');

  // Save changes
  proj.saveSync();

  console.log();
  console.log();
  consoleStars();
  console.log('🧹 Cleaning empty directories ....');
  consoleStars();

  // Phase D: Clean empty directories
  const emptyDirectoriesCount = cleanEmptyDirectories(
    folderPath,
    proj,
    entriesWithExports,
    folderPath,
    out,
  );

  console.log();
  if (emptyDirectoriesCount > 0) {
    console.log(`${emptyDirectoriesCount} empty directories deleted`);
  } else console.log('No empty directories found');

  console.log();
  console.log();
  console.log();
  console.log();

  out.directories.sort();
  out.files.sort();
  out.imports.sort();
  out.tokens.sort();

  console.log('Lifting done !!');
  return out;
};

/**
 * Lifts and cleans up unused code, files, and directories inside the target root codebase folder,
 * while keeping any declarations or imports specified in the exception parameters.
 *
 * @param CODEBASE_ANALYSIS - The full codebase analysis config.
 * @param jsonConfigPath - The codebase JSON config filepath.
 * @param args - A parameter list of variable, function, class, or type names to preserve, optionally ending with a ts-morph Project to reuse.
 * @returns `true` if the codebase lifting was successfully completed.
 *
 * throws {@linkcode Error} if the root folder configuration is not found.
 */
export const lift = (
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  jsonConfigPath: string,
  ...args: any[]
) => {
  const exceptions: string[] = [];
  let project: Project | undefined;

  for (const arg of args) {
    if (arg instanceof Project) {
      project = arg;
    } else if (typeof arg === 'string') {
      exceptions.push(arg);
    }
  }

  const json = join(process.cwd(), jsonConfigPath);
  const file = edit(json);
  const root = file.get(PATH_PROPERTY);

  if (!root || typeof root !== 'string') {
    throw new Error('Root path not found in codebase configuration.');
  }

  return _lift(
    root,
    jsonConfigPath,
    CODEBASE_ANALYSIS,
    exceptions,
    project,
  );
};
