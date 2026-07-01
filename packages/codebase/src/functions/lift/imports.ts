import {
  Node,
  Project,
  SyntaxKind,
  type ImportDeclaration,
  type ImportSpecifier,
} from 'ts-morph';

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
export const removeUnusedImports = (
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
