import { Node, Project, SyntaxKind } from 'ts-morph';

//TODO: handle cases of ourside exports "*"
export const getOutsideImportsAndExports = (
  project: Project,
  isInsideFolder: (filePath: string) => boolean,
): { outsideExports: Node[]; outsideImports: Node[] } => {
  const outsideSourceFiles = project.getSourceFiles().filter(sf => {
    const path = sf.getFilePath();
    return (
      !isInsideFolder(path) &&
      !path.includes('node_modules') &&
      !sf.isDeclarationFile()
    );
  });

  const outsideExportsDecls: Node[] = [];
  for (const sf of outsideSourceFiles) {
    const exports = sf.getExportedDeclarations();
    for (const [name, nameDecls] of exports) {
      if (name === 'default') continue;

      const isExplicit = nameDecls.some(decl => {
        const declPath = decl.getSourceFile().getFilePath();
        if (!isInsideFolder(declPath)) return true;

        const isNamedExport = sf.getExportDeclarations().some(d => {
          if (d.isNamespaceExport()) {
            const nsExport = d.getNamespaceExport();
            if (nsExport) {
              return nsExport.getName() === name;
            } else {
              const targetSf = d.getModuleSpecifierSourceFile();
              return (
                targetSf?.getExportedDeclarations().has(name) ?? false
              );
            }
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
        for (const decl of nameDecls) {
          if (isInsideFolder(decl.getSourceFile().getFilePath())) {
            outsideExportsDecls.push(decl);
          }
        }
      }
    }
  }

  const outsideExportsSet = new Set<Node>(outsideExportsDecls);
  const outsideExports = Array.from(outsideExportsSet);

  const outsideImportsDecls: Node[] = [];
  for (const sf of outsideSourceFiles) {
    for (const imp of sf.getImportDeclarations()) {
      // Named imports
      for (const spec of imp.getNamedImports()) {
        const nameNode = spec.getNameNode();
        if (Node.isStringLiteral(nameNode)) {
          const sym = spec.getSymbol();
          if (sym) {
            try {
              const aliasedSym = sym.getAliasedSymbol();
              if (aliasedSym) {
                for (const def of aliasedSym.getDeclarations()) {
                  if (
                    isInsideFolder(def.getSourceFile().getFilePath())
                  ) {
                    outsideImportsDecls.push(def);
                  }
                }
              }
            } catch {
              // ignore if getAliasedSymbol throws (e.g. for unresolved imports)
            }
          }
        } else {
          for (const def of nameNode.getDefinitionNodes()) {
            if (isInsideFolder(def.getSourceFile().getFilePath())) {
              outsideImportsDecls.push(def);
            }
          }
        }
      }
      // Default import
      const defaultImport = imp.getDefaultImport();
      if (defaultImport) {
        for (const def of defaultImport.getDefinitionNodes()) {
          if (isInsideFolder(def.getSourceFile().getFilePath())) {
            outsideImportsDecls.push(def);
          }
        }
      }
      // Namespace import
      const namespaceImport = imp.getNamespaceImport();
      if (namespaceImport) {
        try {
          const refs = namespaceImport.findReferences();
          for (const refSymbol of refs) {
            for (const ref of refSymbol.getReferences()) {
              const parent = ref.getNode().getParent();
              if (parent && Node.isPropertyAccessExpression(parent)) {
                for (const defNode of parent
                  .getNameNode()
                  .getDefinitionNodes()) {
                  if (
                    isInsideFolder(
                      defNode.getSourceFile().getFilePath(),
                    )
                  ) {
                    outsideImportsDecls.push(defNode);
                  }
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // Also catch any other references/usages in the outside source files via findReferences.
  const insideDeclarations = project
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

  for (const decl of insideDeclarations) {
    const nameNode = decl.getNameNode();
    if (!nameNode || !Node.isIdentifier(nameNode)) continue;
    try {
      const referencedSymbols = nameNode.findReferences();
      for (const refSymbol of referencedSymbols) {
        for (const ref of refSymbol.getReferences()) {
          const refSf = ref.getSourceFile();
          const refPath = refSf.getFilePath();
          if (
            !isInsideFolder(refPath) &&
            !refPath.includes('node_modules') &&
            !refSf.isDeclarationFile()
          ) {
            outsideImportsDecls.push(decl);
            break;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const outsideImportsSet = new Set<Node>(
    outsideImportsDecls.filter(decl => !outsideExportsSet.has(decl)),
  );
  const outsideImports = Array.from(outsideImportsSet);

  return { outsideExports, outsideImports };
};

const getDependencies = (
  decl: Node,
  allDeclarationsSet: Set<Node>,
): Set<Node> => {
  const deps = new Set<Node>();
  const identifiers = [
    ...decl.getDescendantsOfKind(SyntaxKind.Identifier),
  ];
  if (Node.isFunctionDeclaration(decl)) {
    for (const overload of decl.getOverloads()) {
      identifiers.push(
        ...overload.getDescendantsOfKind(SyntaxKind.Identifier),
      );
    }
  }
  for (const id of identifiers) {
    try {
      const defs = id.getDefinitionNodes();
      for (const def of defs) {
        if (allDeclarationsSet.has(def) && def !== decl) {
          deps.add(def);
        }
      }
    } catch {
      // ignore
    }
  }
  return deps;
};

export const removeUnusedDeclarations = (
  project: Project,
  isInsideFolder: (filePath: string) => boolean,
  exceptions: string[],
  outsideExports: Node[],
  outsideImports: Node[],
  counter: {
    tokens: string[];
  },
): boolean => {
  const allDeclarations = project
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

  const allDeclarationsSet = new Set<Node>(allDeclarations);
  const keepSet = new Set<Node>();

  const outsideExportsSet = new Set<Node>(outsideExports);
  const outsideImportsSet = new Set<Node>(outsideImports);

  for (const decl of allDeclarations) {
    if (decl.wasForgotten()) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode || !Node.isIdentifier(nameNode)) {
      keepSet.add(decl);
      continue;
    }
    const name = nameNode.getText();
    if (
      exceptions.includes(name) ||
      outsideExportsSet.has(decl) ||
      outsideImportsSet.has(decl)
    ) {
      keepSet.add(decl);
    }
  }

  // BFS / Traversal to find all reachable declarations (Secondary tokens)
  const queue = Array.from(keepSet);
  for (const decl of queue) {
    if (decl.wasForgotten()) continue;
    const deps = getDependencies(decl, allDeclarationsSet);
    for (const dep of deps) {
      if (!keepSet.has(dep)) {
        keepSet.add(dep);
        queue.push(dep);
      }
    }
  }

  // Delete all declarations that are not inside keepSet
  let anyRemoved = false;
  for (const decl of allDeclarations) {
    if (!keepSet.has(decl)) {
      if (!decl.wasForgotten()) {
        const name = decl.getNameNode()?.getText() || 'unknown';
        console.log('   🗑️  Removed token :', '`' + name + '`');
        counter.tokens.push(name);
        decl.remove();
        anyRemoved = true;
      }
    }
  }

  return anyRemoved;
};
