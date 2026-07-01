import { Node, Project } from 'ts-morph';

export /**
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
