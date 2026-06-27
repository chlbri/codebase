import edit from 'edit-json-file';
import {
  existsSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
} from 'fs';
import { join } from 'path';
import { Node, Project } from 'ts-morph';
import { PATH_PROPERTY } from '../constants';
import { getFolderPath } from '../helpers';

const _lift = (root: string) => {
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

    // A: Declarations inside the target folder
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
        changed = true;
        break;
      }
    }

    if (changed) continue;

    // B: Imports inside the target folder
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
          changed = true;
          break;
        }
      }
      if (changed) break;

      // 2. Default import
      const defaultImport = imp.getDefaultImport();
      if (
        defaultImport &&
        !defaultImport.wasForgotten() &&
        Node.isIdentifier(defaultImport)
      ) {
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
          changed = true;
          break;
        }
      }
      if (changed) break;

      // 3. Namespace import
      const namespaceImport = imp.getNamespaceImport();
      if (
        namespaceImport &&
        !namespaceImport.wasForgotten() &&
        Node.isIdentifier(namespaceImport)
      ) {
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
          changed = true;
          break;
        }
      }
      if (changed) break;

      // 4. Empty import declarations
      const hasNamed = imp.getNamedImports().length > 0;
      const hasDefault = !!imp.getDefaultImport();
      const hasNamespace = !!imp.getNamespaceImport();
      if (!hasNamed && !hasDefault && !hasNamespace) {
        imp.remove();
        changed = true;
        break;
      }
    }
  }

  // Save changes
  project.saveSync();

  // Delete files that are empty (after trimming whitespace) and inside the target folder
  const sourceFiles = project.getSourceFiles();
  for (const sf of sourceFiles) {
    const filePath = sf.getFilePath();
    if (isInsideFolder(filePath) && sf.getFullText().trim() === '') {
      project.removeSourceFile(sf);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    }
  }

  // Helper to recursively clean empty directories
  const cleanEmptyDirs = (dir: string) => {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return;

    const files = readdirSync(dir);
    for (const file of files) {
      const fullPath = join(dir, file);
      if (statSync(fullPath).isDirectory()) {
        cleanEmptyDirs(fullPath);
      }
    }

    const remaining = readdirSync(dir);
    if (remaining.length === 0) {
      rmdirSync(dir);
    }
  };

  cleanEmptyDirs(folderPath);

  return true;
};

/**
 *
 * @param jsonConfigPath
 * @returns
 */
export const lift = (jsonConfigPath: string) => {
  const json = join(process.cwd(), jsonConfigPath);
  const file = edit(json);
  const root = file.get(PATH_PROPERTY);

  if (!root || typeof root !== 'string') {
    throw new Error('Root path not found in codebase configuration.');
  }

  return _lift(root);
};
