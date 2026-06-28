import edit from 'edit-json-file';
import {
  existsSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
} from 'fs';
import { join, relative, resolve } from 'path';
import { Node, Project } from 'ts-morph';
import { FILES_PROPERTY, PATH_PROPERTY } from '../constants';
import { getFolderPath, getSrcDir } from '../helpers';
import { CodebaseAnalysis } from '../schemas';

/**
 * Scans all declarations (type aliases, interfaces, variables, functions, classes, enums)
 * in the source files located inside the target folder. If a declaration is not referenced
 * anywhere else in the project and its name is not present in the exceptions list,
 * it is removed.
 *
 * @param project - The ts-morph project instance.
 * @param isInsideFolder - A function that returns true if a file path is inside the target folder.
 * @param exceptions - An array of names/identifiers that should not be removed even if unused.
 * @returns True if at least one declaration was removed; false otherwise.
 */
const removeUnusedDeclarations = (
  project: Project,
  isInsideFolder: (filePath: string) => boolean,
  exceptions: string[],
): boolean => {
  const declarations = project
    .getSourceFiles()
    .filter(sf => isInsideFolder(sf.getFilePath()))
    .flatMap(sf => [
      ...sf.getTypeAliases(),
      ...sf.getInterfaces(),
      ...sf.getVariableDeclarations(),
      ...sf.getFunctions(),
      ...sf.getClasses(),
      ...sf.getEnums(),
    ]);

  for (const decl of declarations) {
    if (decl.wasForgotten()) continue;

    const nameNode = decl.getNameNode();
    if (!nameNode || !Node.isIdentifier(nameNode)) continue;

    const name = nameNode.getText();
    if (exceptions.includes(name)) continue;

    const referencedSymbols = nameNode.findReferences();
    let refCount = 0;

    for (const refSymbol of referencedSymbols) {
      for (const ref of refSymbol.getReferences()) {
        if (ref.getNode() !== nameNode) {
          refCount++;
        }
      }
    }

    if (refCount === 0) {
      decl.remove();
      return true;
    }
  }

  return false;
};

/**
 * Scans all import declarations inside the target folder's source files.
 * It checks named imports, default imports, namespace imports, and empty import declarations.
 * If an imported symbol is not referenced in the file and its name is not present in
 * the exceptions list, it removes that specific import. If an import declaration becomes empty,
 * the entire import declaration is removed.
 *
 * @param project - The ts-morph project instance.
 * @param isInsideFolder - A function that returns true if a file path is inside the target folder.
 * @param exceptions - An array of names/identifiers that should not be removed even if unused.
 * @returns True if at least one import specifier or import declaration was removed; false otherwise.
 */
const removeUnusedImports = (
  project: Project,
  isInsideFolder: (filePath: string) => boolean,
  exceptions: string[],
): boolean => {
  const importDeclarations = project
    .getSourceFiles()
    .filter(sf => isInsideFolder(sf.getFilePath()))
    .flatMap(sf => sf.getImportDeclarations());

  for (const imp of importDeclarations) {
    if (imp.wasForgotten()) continue;
    const sf = imp.getSourceFile();

    // 1. Named imports
    const namedImports = imp.getNamedImports();
    for (const spec of namedImports) {
      if (spec.wasForgotten()) continue;
      const nameNode = spec.getNameNode();
      if (!Node.isIdentifier(nameNode)) continue;

      const name = nameNode.getText();
      if (exceptions.includes(name)) continue;

      const referencedSymbols = nameNode.findReferences();
      let refCount = 0;
      for (const refSymbol of referencedSymbols) {
        for (const ref of refSymbol.getReferences()) {
          if (
            ref.getSourceFile() === sf &&
            ref.getNode() !== nameNode
          ) {
            refCount++;
          }
        }
      }
      if (refCount === 0) {
        spec.remove();
        return true;
      }
    }

    // 2. Default import
    const defaultImport = imp.getDefaultImport();
    if (
      defaultImport &&
      !defaultImport.wasForgotten() &&
      Node.isIdentifier(defaultImport)
    ) {
      const name = defaultImport.getText();
      if (!exceptions.includes(name)) {
        const referencedSymbols = defaultImport.findReferences();
        let refCount = 0;
        for (const refSymbol of referencedSymbols) {
          for (const ref of refSymbol.getReferences()) {
            if (
              ref.getSourceFile() === sf &&
              ref.getNode() !== defaultImport
            ) {
              refCount++;
            }
          }
        }
        if (refCount === 0) {
          const hasNamed = imp.getNamedImports().length > 0;
          const hasNamespace = !!imp.getNamespaceImport();
          if (!hasNamed && !hasNamespace) {
            imp.remove();
          } else {
            imp.removeDefaultImport();
          }
          return true;
        }
      }
    }

    // 3. Namespace import
    const namespaceImport = imp.getNamespaceImport();
    if (
      namespaceImport &&
      !namespaceImport.wasForgotten() &&
      Node.isIdentifier(namespaceImport)
    ) {
      const name = namespaceImport.getText();
      if (!exceptions.includes(name)) {
        const referencedSymbols = namespaceImport.findReferences();
        let refCount = 0;
        for (const refSymbol of referencedSymbols) {
          for (const ref of refSymbol.getReferences()) {
            if (
              ref.getSourceFile() === sf &&
              ref.getNode() !== namespaceImport
            ) {
              refCount++;
            }
          }
        }
        if (refCount === 0) {
          imp.remove();
          return true;
        }
      }
    }

    // 4. Empty import declarations
    const hasNamed = imp.getNamedImports().length > 0;
    const hasDefault = !!imp.getDefaultImport();
    const hasNamespace = !!imp.getNamespaceImport();
    if (!hasNamed && !hasDefault && !hasNamespace) {
      imp.remove();
      return true;
    }
  }

  return false;
};

/**
 * Searches the target directory for source files that have become completely empty.
 * If an empty file is found, it deletes it from the disk, removes it from the project,
 * and recursively cleans up any export declarations in other source files that target this file.
 *
 * @param project - The ts-morph project instance.
 * @param isInsideFolder - A function that returns true if a file path is inside the target folder.
 * @param entriesWithExports - Codebase analysis entries containing exported files.
 * @param srcDir - The absolute codebase source directory path.
 * @param folderPath - The absolute codebase target folder path.
 * @param jsonConfigPath - The codebase JSON config filepath.
 * @returns `true` if at least one file was deleted; false otherwise.
 */
const cleanEmptySourceFiles = (
  project: Project,
  isInsideFolder: (filePath: string) => boolean,
  entriesWithExports: [string, any][],
  srcDir: string,
  folderPath: string,
  jsonConfigPath: string,
): boolean => {
  const sourceFiles = project.getSourceFiles();
  const json = join(process.cwd(), jsonConfigPath);
  const file = edit(json);

  for (const sf of sourceFiles) {
    const filePath = sf.getFilePath();

    if (isInsideFolder(filePath) && sf.getFullText().trim() === '') {
      const deletedPathWithoutExt = filePath.replace(/\.tsx?$/, '');

      for (const [, fileAnalysis] of entriesWithExports) {
        const exportingFilePath = join(
          srcDir,
          fileAnalysis.relativePath,
        );

        const exportingSf = project.getSourceFile(exportingFilePath);
        if (exportingSf) {
          const exportDecls = exportingSf.getExportDeclarations();

          for (const decl of exportDecls) {
            const moduleSpecifier = decl.getModuleSpecifierValue();
            if (moduleSpecifier) {
              const resolvedSpec = resolve(
                exportingSf.getDirectoryPath(),
                moduleSpecifier,
              ).replace(/\.tsx?$/, '');

              if (resolvedSpec === deletedPathWithoutExt) decl.remove();
            }
          }
        }
      }

      project.removeSourceFile(sf);
      if (existsSync(filePath)) unlinkSync(filePath);

      // Remove the file from jsonConfigPath
      const relPath = relative(folderPath, filePath).replace(
        /\\/g,
        '/',
      );
      const key = relPath.replace(/\.tsx?$/, '');

      if (existsSync(json)) {
        const files = file.get(FILES_PROPERTY) as string[] | undefined;
        if (files) {
          file.set(
            FILES_PROPERTY,
            files.filter(f => f !== key),
          );
          file.save();
        }
      }

      return true;
    }
  }

  return false;
};

/**
 * Recursively scans and cleans up empty subdirectories within the specified directory,
 * and removes any export declarations targeting files inside those empty subdirectories.
 *
 * @param dir - The directory path to inspect and clean.
 * @param project - The ts-morph project instance.
 * @param entriesWithExports - Codebase analysis entries containing exported files.
 * @param srcDir - The absolute codebase source directory path.
 */
const cleanEmptyDirectories = (
  dir: string,
  project: Project,
  entriesWithExports: [string, any][],
  srcDir: string,
): void => {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return;

  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      cleanEmptyDirectories(
        fullPath,
        project,
        entriesWithExports,
        srcDir,
      );
    }
  }

  const remaining = readdirSync(dir);
  if (remaining.length === 0) {
    for (const [, fileAnalysis] of entriesWithExports) {
      const exportingFilePath = join(srcDir, fileAnalysis.relativePath);
      const exportingSf = project.getSourceFile(exportingFilePath);

      if (exportingSf) {
        const exportDecls = exportingSf.getExportDeclarations();

        for (const decl of exportDecls) {
          const moduleSpecifier = decl.getModuleSpecifierValue();

          if (moduleSpecifier) {
            const resolvedSpec = resolve(
              exportingSf.getDirectoryPath(),
              moduleSpecifier,
            ).replace(/\.tsx?$/, '');

            if (resolvedSpec.startsWith(dir)) decl.remove();
          }
        }
      }
    }
    rmdirSync(dir);
  }
};

/**
 * Internal orchestrator for lifting codebase files. It adds the files to a ts-morph project,
 * repeatedly prunes unused declarations and imports (observing the provided exceptions),
 * purges empty files and empty folders, and saves changes back to disk.
 *
 * @param root - The codebase target folder path.
 * @param jsonConfigPath - The codebase JSON config filepath.
 * @param CODEBASE_ANALYSIS - The full codebase analysis configuration object.
 * @param exceptions - An array of identifiers to preserve during pruning.
 * @returns True if successful, false otherwise.
 */
const _lift = (
  root: string,
  jsonConfigPath: string,
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  exceptions: string[],
): boolean => {
  const folderPath = getFolderPath(root);
  if (!existsSync(folderPath)) {
    console.warn(`Folder not found: ${folderPath}`);
    return false;
  }

  const tsconfigPath = join(process.cwd(), 'tsconfig.json');
  const project = existsSync(tsconfigPath)
    ? new Project({ tsConfigFilePath: tsconfigPath })
    : new Project();

  // Add all source files recursively
  project.addSourceFilesAtPaths(join(folderPath, '**/*.ts'));
  project.addSourceFilesAtPaths(join(folderPath, '**/*.tsx'));

  const isInsideFolder = (filePath: string) => {
    return filePath.startsWith(folderPath);
  };

  let changed = true;
  while (changed) {
    changed = false;

    // Phase A: Declarations
    changed = removeUnusedDeclarations(
      project,
      isInsideFolder,
      exceptions,
    );
    if (changed) continue;

    // Phase B: Imports
    changed = removeUnusedImports(project, isInsideFolder, exceptions);
  }

  const srcDir = getSrcDir();

  const entriesWithExports = Object.entries(CODEBASE_ANALYSIS).filter(
    ([, val]) => val.exports && val.exports.length > 0,
  );

  // Phase C: Clean empty files
  let deletedAnyFile = true;
  while (deletedAnyFile) {
    deletedAnyFile = cleanEmptySourceFiles(
      project,
      isInsideFolder,
      entriesWithExports,
      srcDir,
      folderPath,
      jsonConfigPath,
    );
  }

  // Phase D: Clean empty directories
  cleanEmptyDirectories(
    folderPath,
    project,
    entriesWithExports,
    srcDir,
  );

  // Save changes
  project.saveSync();
  return true;
};

/**
 * Lifts and cleans up unused code, files, and directories inside the target root codebase folder,
 * while keeping any declarations or imports specified in the exception parameters.
 *
 * @param CODEBASE_ANALYSIS - The full codebase analysis config.
 * @param jsonConfigPath - The codebase JSON config filepath.
 * @param exceptions - A parameter array of variable, function, class, or type names to preserve.
 * @returns `true` if the codebase lifting was successfully completed.
 *
 * throws {@linkcode Error} if the root folder configuration is not found.
 */
export const lift = (
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  jsonConfigPath: string,
  ...exceptions: string[]
): boolean => {
  const json = join(process.cwd(), jsonConfigPath);
  const file = edit(json);
  const root = file.get(PATH_PROPERTY);

  if (!root || typeof root !== 'string') {
    throw new Error('Root path not found in codebase configuration.');
  }

  return _lift(root, jsonConfigPath, CODEBASE_ANALYSIS, exceptions);
};
