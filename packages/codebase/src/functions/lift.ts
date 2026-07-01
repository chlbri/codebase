import edit from 'edit-json-file';
import { existsSync, readdirSync, rmdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import {
  Node,
  Project,
  SyntaxKind,
  type ImportDeclaration,
  type ImportSpecifier,
} from 'ts-morph';
import { FILES_PROPERTY, PATH_PROPERTY } from '../constants';
import {
  consoleStars,
  getFolderPath,
  hasNoDeclarations,
  resolveModuleSpecifier,
} from '../helpers';
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
  outsideExportDecls: Node[],
  counter: {
    tokens: string[];
  },
): boolean => {
  const declarations = project
    .getSourceFiles()
    .filter(sf => isInsideFolder(sf.getFilePath()))
    .flatMap(sf => {
      return [
        ...sf.getTypeAliases(),
        ...sf.getInterfaces(),
        ...sf.getVariableDeclarations(),
        ...sf.getFunctions(),
        ...sf.getClasses(),
        ...sf.getEnums(),
      ];
    });

  const isDescendantOf = (child: Node, parent: Node): boolean => {
    return child.getAncestors().some(ancestor => ancestor === parent);
  };

  const isExportReference = (node: Node): boolean => {
    return node
      .getAncestors()
      .some(
        ancestor =>
          Node.isExportAssignment(ancestor) ||
          Node.isExportSpecifier(ancestor),
      );
  };

  const isInsideOtherDeclaration = (
    node: Node,
    decl: Node,
  ): boolean => {
    return node.getAncestors().some(ancestor => {
      if (ancestor === decl) return false;
      if (Node.isVariableDeclaration(decl)) {
        const stmt = decl.getVariableStatement();
        if (stmt && ancestor === stmt) return false;
      }
      return (
        Node.isTypeAliasDeclaration(ancestor) ||
        Node.isInterfaceDeclaration(ancestor) ||
        Node.isVariableDeclaration(ancestor) ||
        Node.isFunctionDeclaration(ancestor) ||
        Node.isClassDeclaration(ancestor) ||
        Node.isEnumDeclaration(ancestor) ||
        Node.isModuleDeclaration(ancestor)
      );
    });
  };

  const toDelete: typeof declarations = [];

  for (const decl of declarations) {
    if (decl.wasForgotten()) continue;

    const nameNode = decl.getNameNode();
    if (!nameNode || !Node.isIdentifier(nameNode)) continue;

    const name = nameNode.getText();
    if (exceptions.includes(name)) continue;
    if (outsideExportDecls.includes(decl)) continue;

    const sf = decl.getSourceFile();
    const declPath = sf.getFilePath();
    let refCount = 0;
    let localRefCount = 0;

    const referencedSymbols = nameNode.findReferences();
    for (const refSymbol of referencedSymbols) {
      for (const ref of refSymbol.getReferences()) {
        const refNode = ref.getNode();

        let isSelfRef =
          refNode === nameNode || isDescendantOf(refNode, decl);
        if (Node.isVariableDeclaration(decl)) {
          const stmt = decl.getVariableStatement();
          if (stmt && isDescendantOf(refNode, stmt)) {
            isSelfRef = true;
          }
        }
        if (Node.isFunctionDeclaration(decl)) {
          const parent = refNode.getParent();
          if (
            Node.isFunctionDeclaration(parent) &&
            parent.getName() === decl.getName()
          ) {
            isSelfRef = true;
          }
        }
        if (!isSelfRef && !isInsideOtherDeclaration(refNode, decl)) {
          isSelfRef = true;
        }

        if (isSelfRef) continue;

        const refPath = ref.getSourceFile().getFilePath();
        const check1 = refPath !== declPath;

        if (!check1 && isExportReference(refNode)) continue;

        if (check1) {
          refCount++;
        } else {
          localRefCount++;
        }
      }
    }

    if (refCount === 0 && localRefCount === 0) {
      toDelete.push(decl);
      counter.tokens.push(name);
    }
  }

  let anyRemoved = false;
  for (const decl of toDelete) {
    if (!decl.wasForgotten()) {
      console.log('   🗑️  Removed token :', '`' + decl.getName() + '`');
      decl.remove();
      anyRemoved = true;
    }
  }

  return anyRemoved;
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
  outsideExportDecls: Node[],
  counter: {
    imports: string[];
  },
): boolean => {
  const importDeclarations = project
    .getSourceFiles()
    .filter(sf => isInsideFolder(sf.getFilePath()))
    .flatMap(sf => sf.getImportDeclarations());

  const specsToDelete: ImportSpecifier[] = [];
  const impsToDelete: ImportDeclaration[] = [];
  const defaultImpsToRemove: ImportDeclaration[] = [];

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
      const isTypeImport = imp.isTypeOnly() || spec.isTypeOnly();

      const isProtected =
        exceptions.includes(name) ||
        nameNode
          .getDefinitionNodes()
          .some(def => outsideExportDecls.includes(def));

      if (!isTypeImport && isProtected) continue;

      // Imports are local to the file, check occurrences in the same file.
      const localIdentifiers = sf
        .getDescendantsOfKind(SyntaxKind.Identifier)
        .filter(id => id.getText() === name);
      if (localIdentifiers.length <= 1) {
        specsToDelete.push(spec);
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
      const isTypeImport = imp.isTypeOnly();

      const isProtected =
        exceptions.includes(name) ||
        defaultImport
          .getDefinitionNodes()
          .some(def => outsideExportDecls.includes(def));

      if (isTypeImport || !isProtected) {
        const localIdentifiers = sf
          .getDescendantsOfKind(SyntaxKind.Identifier)
          .filter(id => id.getText() === name);
        if (localIdentifiers.length <= 1) {
          defaultImpsToRemove.push(imp);
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
      const isTypeImport = imp.isTypeOnly();

      const isProtected =
        exceptions.includes(name) ||
        namespaceImport
          .getDefinitionNodes()
          .some(def => outsideExportDecls.includes(def));

      if (isTypeImport || !isProtected) {
        const localIdentifiers = sf
          .getDescendantsOfKind(SyntaxKind.Identifier)
          .filter(id => id.getText() === name);
        if (localIdentifiers.length <= 1) {
          impsToDelete.push(imp);
        }
      }
    }
  }

  let anyRemoved = false;
  const log = (value: { getText: () => string }) => {
    console.log('   🗑️  Removed import :', '`' + value.getText() + '`');
    counter.imports.push(value.getText());
  };

  for (const spec of specsToDelete) {
    if (!spec.wasForgotten()) {
      log(spec);
      spec.remove();
      anyRemoved = true;
    }
  }

  for (const imp of defaultImpsToRemove) {
    if (!imp.wasForgotten()) {
      const hasNamed = imp.getNamedImports().length > 0;
      const hasNamespace = !!imp.getNamespaceImport();
      log(imp);
      if (!hasNamed && !hasNamespace) {
        imp.remove();
      } else {
        imp.removeDefaultImport();
      }
      anyRemoved = true;
    }
  }

  for (const imp of impsToDelete) {
    if (!imp.wasForgotten()) {
      log(imp);
      imp.remove();
      anyRemoved = true;
    }
  }

  // 4. Empty import declarations
  for (const imp of importDeclarations) {
    if (imp.wasForgotten()) continue;
    const hasNamed = imp.getNamedImports().length > 0;
    const hasDefault = !!imp.getDefaultImport();
    const hasNamespace = !!imp.getNamespaceImport();
    if (!hasNamed && !hasDefault && !hasNamespace) {
      log(imp);
      imp.remove();
      anyRemoved = true;
    }
  }

  return anyRemoved;
};

/**
 * Searches the target directory for source files that have become completely empty.
 * If an empty file is found, it deletes it from the disk, removes it from the project,
 * and recursively cleans up any export declarations in other source files that target this file.
 *
 * @param project - The ts-morph project instance.
 * @param isInsideFolder - A function that returns true if a file path is inside the target folder.
 * @param entriesWithExports - Codebase analysis entries containing exported files.
 * @param folderPath - The absolute codebase target folder path.
 * @param jsonConfigPath - The codebase JSON config filepath.
 * @returns `true` if at least one file was deleted; false otherwise.
 */
const cleanEmptySourceFiles = (
  project: Project,
  isInsideFolder: (filePath: string) => boolean,
  folderPath: string,
  jsonConfigPath: string,
  counter: {
    files: string[];
  },
) => {
  const sourceFiles = project.getSourceFiles();
  const emptyFiles = sourceFiles.filter(
    sf => isInsideFolder(sf.getFilePath()) && hasNoDeclarations(sf),
  );

  if (emptyFiles.length === 0) return 0;
  const json = join(process.cwd(), jsonConfigPath);
  const file = edit(json);
  const deletedKeys = new Set<string>();

  for (const sf of emptyFiles) {
    const filePath = sf.getFilePath();
    const deletedPathWithoutExt = filePath.replace(/\.tsx?$/, '');

    for (const exportingSf of project.getSourceFiles()) {
      const exportDecls = exportingSf.getExportDeclarations();

      for (const decl of exportDecls) {
        const moduleSpecifier = decl.getModuleSpecifierValue();

        if (moduleSpecifier) {
          const resolvedSpec = resolve(
            exportingSf.getDirectoryPath(),
            resolveModuleSpecifier(exportingSf, moduleSpecifier),
          ).replace(/\.tsx?$/, '');

          if (resolvedSpec === deletedPathWithoutExt) decl.remove();
        }
      }
    }

    sf.delete();
    // if (existsSync(filePath)) unlinkSync(filePath);
    console.log('  ❌ Deleted file', filePath);
    console.log();

    // Collect the key to remove from the jsonConfigPath
    const relPath = relative(folderPath, filePath).replace(/\\/g, '/');
    const key = relPath.replace(/\.tsx?$/, '');
    deletedKeys.add(key);
    counter.files.push(key);
  }

  // Batch update and save the JSON configuration
  if (deletedKeys.size > 0 && existsSync(json)) {
    const files = file.get(FILES_PROPERTY) as string[] | undefined;
    if (files) {
      file.set(
        FILES_PROPERTY,
        files.filter(f => !deletedKeys.has(f)),
      );
      file.save();
    }
  }

  return emptyFiles.length;
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
  counter: {
    directories: string[];
  },
): number => {
  let deletedDirectories = 0;
  if (!existsSync(dir) || !statSync(dir).isDirectory())
    return deletedDirectories;

  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      deletedDirectories += cleanEmptyDirectories(
        fullPath,
        project,
        entriesWithExports,
        srcDir,
        counter,
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
    console.log('  🗑️  Deleted empty folder:', dir);
    counter.directories.push(relative(srcDir, dir).replace(/\\/g, '/'));
    rmdirSync(dir);
    deletedDirectories++;
  }

  return deletedDirectories;
};

export type LiftOutput = {
  tokens: string[];
  imports: string[];
  directories: string[];
  files: string[];
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
