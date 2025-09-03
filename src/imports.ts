import { join, relative } from 'node:path';
import { SourceFile, SyntaxKind } from 'ts-morph';
import type { ImportInfo } from './types';

/**
 * Résout le moduleSpecifier en utilisant les paths du tsconfig si il commence par "#"
 */
const resolveModuleSpecifier = (
  sourceFile: SourceFile,
  moduleSpecifier: string,
): string => {
  const paths = sourceFile.getProject().getCompilerOptions().paths;

  if (!paths) return moduleSpecifier;

  const baseUrl = sourceFile.getProject().getCompilerOptions().baseUrl;
  const paths2 = Object.entries(paths);

  // Chercher la correspondance dans les paths
  for (const [pattern, mappings] of paths2) {
    // Remplacer * par une regex pour matcher
    const regexPattern = pattern.replace(/\*/g, '(.*)');
    const regex = new RegExp(`^${regexPattern}$`);
    const match = moduleSpecifier.match(regex);

    if (match) {
      // Prendre le premier mapping disponible
      const first = mappings[0];

      // Résoudre le chemin absolu
      let relativedPath = baseUrl ? join(baseUrl, first) : first;

      if (match[1]) {
        relativedPath = relativedPath.replace('*', match[1]);
      }

      // Calculer le chemin relatif depuis le fichier source actuel
      const sourceFileDir = relative(
        process.cwd(),
        sourceFile.getDirectoryPath(),
      );
      const relativePath = relative(sourceFileDir, relativedPath);

      // S'assurer que le chemin relatif commence par ./ ou ../
      return relativePath.startsWith('.')
        ? relativePath
        : `./${relativePath}`;
    }
  }

  return moduleSpecifier;
};

/**
 * Analyse les imports d'un fichier
 */
export const analyzeImports = (sourceFile: SourceFile): ImportInfo[] => {
  const imports: ImportInfo[] = [];

  // Import declarations (import ... from '...')
  sourceFile.getImportDeclarations().forEach(importDecl => {
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
      });
    }

    // Import namespace (* as name)
    const namespaceImport = importDecl.getNamespaceImport();
    if (namespaceImport) {
      imports.push({
        moduleSpecifier,
        kind: 'namespace',
        default: namespaceImport.getText(),
      });
    }

    // Named imports ({ name1, name2 })
    const namedImports = importDecl.getNamedImports();
    if (namedImports.length > 0) {
      imports.push({
        moduleSpecifier,
        kind: 'named',
        namedImports: namedImports.map(ni => ni.getName()),
      });
    }

    // Side-effect import (import '...')
    if (!defaultImport && !namespaceImport && namedImports.length === 0) {
      imports.push({
        moduleSpecifier,
        kind: 'side-effect',
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
        return `import { ${namedImports} } from '${imp.moduleSpecifier}';`;
      }
      case 'namespace':
        return `import * as ${imp.default} from '${imp.moduleSpecifier}';`;
      case 'side-effect': {
        if (imp.isDynamic) {
          return `// Dynamic import: import('${imp.moduleSpecifier}')`;
        }
        return `import '${imp.moduleSpecifier}';`;
      }

      case 'default':
        return `import ${imp.default} from '${imp.moduleSpecifier}';`;
      default:
        return '';
    }
  });
};
