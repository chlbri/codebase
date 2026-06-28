import { SourceFile, SyntaxKind } from 'ts-morph';
import { resolveModuleSpecifier } from './helpers';
import type { ImportInfo } from './schemas';

/**
 * Analyzes a file's imports
 */
export const analyzeImports = (
  sourceFile: SourceFile,
): ImportInfo[] => {
  const imports: ImportInfo[] = [];

  // Import declarations (import ... from '...')
  sourceFile.getImportDeclarations().forEach(importDecl => {
    // Determine if this is a type-only import
    const isTypeOnly = importDecl.isTypeOnly();

    const rawModuleSpecifier = importDecl.getModuleSpecifierValue();
    const moduleSpecifier = resolveModuleSpecifier(
      sourceFile,
      rawModuleSpecifier,
    );

    // Import default
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport) {
      imports.push({
        moduleSpecifier,
        kind: 'default',
        default: defaultImport.getText(),
        isTypeOnly,
      });
    }

    // Import namespace (* as name)
    const namespaceImport = importDecl.getNamespaceImport();
    if (namespaceImport) {
      imports.push({
        moduleSpecifier,
        kind: 'namespace',
        default: namespaceImport.getText(),
        isTypeOnly,
      });
    }

    // Named imports ({ name1, name2 })
    const namedImports = importDecl.getNamedImports();
    if (namedImports.length > 0) {
      imports.push({
        moduleSpecifier,
        kind: 'named',
        namedImports: namedImports.map(ni => ni.getName()),
        isTypeOnly,
      });
    }

    // Side-effect import (import '...')
    if (
      !defaultImport &&
      !namespaceImport &&
      namedImports.length === 0
    ) {
      imports.push({
        moduleSpecifier,
        kind: 'side-effect',
        isTypeOnly,
      });
    }
  });

  // Dynamic imports (import('...'))
  sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .forEach(callExpr => {
      if (
        callExpr.getExpression().getKind() === SyntaxKind.ImportKeyword
      ) {
        const arg = callExpr.getArguments()[0];
        if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
          const rawModuleSpecifier = arg.getText().replace(/['"]/g, '');
          const moduleSpecifier = resolveModuleSpecifier(
            sourceFile,
            rawModuleSpecifier,
          );
          imports.push({
            moduleSpecifier,
            kind: 'side-effect',
            isDynamic: true,
          });
        }
      }
    });

  return imports;
};

export const buildImportStrings = (imports: ImportInfo[]) => {
  return imports.map(imp => {
    switch (imp.kind) {
      case 'named': {
        const namedImports = imp.namedImports?.join(', ') || '';
        return `import ${imp.isTypeOnly ? 'type ' : ''}{ ${namedImports} } from '${imp.moduleSpecifier}';`;
      }
      case 'namespace':
        return `import ${imp.isTypeOnly ? 'type ' : ''}* as ${imp.default} from '${imp.moduleSpecifier}';`;
      case 'side-effect': {
        if (imp.isDynamic) {
          return `// Dynamic import: import('${imp.moduleSpecifier}')`;
        }
        return `import '${imp.moduleSpecifier}';`;
      }

      case 'default':
        return `import ${imp.isTypeOnly ? 'type ' : ''}${imp.default} from '${imp.moduleSpecifier}';`;
      default:
        return '';
    }
  });
};
