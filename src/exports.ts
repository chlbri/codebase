import { SourceFile, SyntaxKind } from 'ts-morph';
import type { ExportInfo } from './types';

export const analyzeExports = (sourceFile: SourceFile) => {
  const exports: ExportInfo[] = [];

  // Export declarations (export ...)
  sourceFile.getExportDeclarations().forEach(exportDecl => {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    const exportText = exportDecl.getText();

    // Named exports
    const namedExports = exportDecl.getNamedExports();
    namedExports.forEach(namedExport => {
      exports.push({
        name: namedExport.getName(),
        kind: 'named',
        text: exportText,
        moduleSpecifier,
      });
    });

    // Namespace export (export * from '...')
    if (exportDecl.isNamespaceExport()) {
      exports.push({
        name: '*',
        kind: 'namespace',
        text: exportText,
        moduleSpecifier,
      });
    }
  });

  // Export assignments (export = ...)
  sourceFile.getExportAssignments().forEach(exportAssignment => {
    if (exportAssignment.isExportEquals()) {
      exports.push({
        name: 'default',
        kind: 'default',
        text: exportAssignment.getText(),
      });
    }
  });

  // Exported declarations (export function, export class, etc.)
  sourceFile.getExportedDeclarations().forEach((declarations, name) => {
    declarations.forEach(decl => {
      let declarationKind: ExportInfo['declarationKind'];

      if (decl.getKind() === SyntaxKind.FunctionDeclaration) {
        declarationKind = 'function';
      } else if (decl.getKind() === SyntaxKind.ClassDeclaration) {
        declarationKind = 'class';
      } else if (decl.getKind() === SyntaxKind.InterfaceDeclaration) {
        declarationKind = 'interface';
      } else if (decl.getKind() === SyntaxKind.TypeAliasDeclaration) {
        declarationKind = 'type';
      } else if (decl.getKind() === SyntaxKind.VariableDeclaration) {
        declarationKind = 'variable';
      } else if (decl.getKind() === SyntaxKind.EnumDeclaration) {
        declarationKind = 'enum';
      }

      exports.push({
        name,
        kind: name === 'default' ? 'default' : 'named',
        text: decl.getText(),
        declarationKind,
      });
    });
  });

  return exports;
};
