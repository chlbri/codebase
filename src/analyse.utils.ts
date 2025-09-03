import type { SourceFile } from 'ts-morph';

/**
 * Génère un JSDoc pour une expression exportée générée automatiquement
 */
export const generateJSDoc = (
  exportName: string,
  declarationKind?: string,
): string => {
  const kindText = declarationKind ? ` ${declarationKind}` : '';
  return `/**
 * ${exportName}${kindText} - Auto-generated expression
 * 
 * ⚠️ WARNING: This expression is auto-generated and should not be modified.
 * Any manual changes will be overwritten during the next generation.
 * 
 * @generated
 * @readonly
 * @author chlbri (bri_lvi@icloud.com)
 */`;
};

export const extractExportDetails = (trimmedLine: string) => {
  let exportName = 'export';
  let declarationKind: string | undefined;

  if (trimmedLine.includes('export default ')) {
    exportName = 'default';
    if (trimmedLine.includes('function')) declarationKind = 'function';
    else if (trimmedLine.includes('class')) declarationKind = 'class';
    else declarationKind = 'value';
  } else if (trimmedLine.includes('export const ')) {
    const match = trimmedLine.match(/export const (\w+)/);
    exportName = match ? match[1] : 'const';
    declarationKind = 'variable';
  } else if (trimmedLine.includes('export let ')) {
    const match = trimmedLine.match(/export let (\w+)/);
    exportName = match ? match[1] : 'let';
    declarationKind = 'variable';
  } else if (trimmedLine.includes('export var ')) {
    const match = trimmedLine.match(/export var (\w+)/);
    exportName = match ? match[1] : 'var';
    declarationKind = 'variable';
  } else if (trimmedLine.includes('export function ')) {
    const match = trimmedLine.match(/export function (\w+)/);
    exportName = match ? match[1] : 'function';
    declarationKind = 'function';
  } else if (trimmedLine.includes('export class ')) {
    const match = trimmedLine.match(/export class (\w+)/);
    exportName = match ? match[1] : 'class';
    declarationKind = 'class';
  } else if (trimmedLine.includes('export interface ')) {
    const match = trimmedLine.match(/export interface (\w+)/);
    exportName = match ? match[1] : 'interface';
    declarationKind = 'interface';
  } else if (trimmedLine.includes('export type ')) {
    const match = trimmedLine.match(/export type (\w+)/);
    exportName = match ? match[1] : 'type';
    declarationKind = 'type';
  } else if (trimmedLine.includes('export enum ')) {
    const match = trimmedLine.match(/export enum (\w+)/);
    exportName = match ? match[1] : 'enum';
    declarationKind = 'enum';
  }
  return { exportName, declarationKind };
};

/**
 * Vérifie si une ligne d'export contient une déclaration et non pas un simple re-export
 */
export const hasDeclaration = (exportLine: string): boolean => {
  const trimmed = exportLine.trim();
  const falsy =
    trimmed.startsWith('export {') || // export { something }
    trimmed.startsWith('export *') || // export * from
    trimmed.includes('} from ') || // export { a, b } from
    trimmed.match(/^export\s+\{[^}]*\}\s*;?\s*$/) || // export { a, b };
    trimmed.match(/^export\s+default\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*;?\s*$/); // export default identifier;

  // Re-exports et exports simples à exclure
  if (falsy) return false;

  // Déclarations à inclure (avec mots-clés de déclaration)
  const keywords = [
    'export const ',
    'export let ',
    'export var ',
    'export function ',
    'export class ',
    'export interface ',
    'export type ',
    'export enum ',
    'export namespace ',
    'export default function ',
    'export default class ',
    'export default interface ',
    'export default enum ',
    'export default const ',
    'export default let ',
    'export default var ',
  ];

  return keywords.some(kw => trimmed.includes(kw));
};

/**
 * Extrait le nom d'une déclaration (const, function, etc.)
 */
export const extractDeclarationName = (line: string): string | null => {
  const trimmed = line.trim();

  if (trimmed.startsWith('const ')) {
    const match = trimmed.match(/const\s+(\w+)/);
    return match ? match[1] : null;
  }
  if (trimmed.startsWith('function ')) {
    const match = trimmed.match(/function\s+(\w+)/);
    return match ? match[1] : null;
  }
  if (trimmed.startsWith('class ')) {
    const match = trimmed.match(/class\s+(\w+)/);
    return match ? match[1] : null;
  }
  if (trimmed.startsWith('interface ')) {
    const match = trimmed.match(/interface\s+(\w+)/);
    return match ? match[1] : null;
  }
  if (trimmed.startsWith('type ')) {
    const match = trimmed.match(/type\s+(\w+)/);
    return match ? match[1] : null;
  }
  if (trimmed.startsWith('enum ')) {
    const match = trimmed.match(/enum\s+(\w+)/);
    return match ? match[1] : null;
  }

  return null;
};

/**
 * Vérifie si une déclaration est exportée plus tard dans le fichier
 */
export const isExportedLater = (
  lines: string[],
  declarationName: string,
): boolean => {
  return lines.some(line => {
    const trimmed = line.trim();
    return (
      trimmed === `export default ${declarationName};` ||
      trimmed.includes(`export { ${declarationName}`) ||
      trimmed.includes(`export * as ${declarationName}`)
    );
  });
};

/**
 * Détermine le type de déclaration
 */
export const getDeclarationKind = (line: string): string => {
  const trimmed = line.trim();

  if (trimmed.startsWith('const ')) return 'const';
  if (trimmed.startsWith('let ')) return 'let';
  if (trimmed.startsWith('var ')) return 'var';
  if (trimmed.startsWith('function ')) return 'function';
  if (trimmed.startsWith('class ')) return 'class';
  if (trimmed.startsWith('interface ')) return 'interface';
  if (trimmed.startsWith('type ')) return 'type';
  if (trimmed.startsWith('enum ')) return 'enum';

  return 'variable';
};

/**
 * Ajoute des JSDoc aux expressions exportées dans le texte source
 */
export const addJSDocToSourceText = (sourceFile: SourceFile): string => {
  // Obtenir le texte sans les imports dès le début
  const fullText = sourceFile.getText();
  const imports = sourceFile
    .getImportDeclarations()
    .map(importDecl => importDecl.getText());

  const linesWithoutImports = fullText
    .replace(imports.join('\n'), '')
    .trimStart();

  let modifiedText = linesWithoutImports;

  // Collecter toutes les positions d'insertion avec leurs JSDoc
  const insertions: Array<{ position: number; jsdoc: string }> = [];

  // Une approche plus simple : analyser le texte directement pour trouver les exports
  const lines = modifiedText.split('\n');

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // Détecter les lignes qui commencent par export ET contiennent une déclaration
    if (trimmedLine.startsWith('export ') && hasDeclaration(trimmedLine)) {
      // Calculer la position dans le texte original
      const position =
        lines.slice(0, lineIndex).join('\n').length +
        (lineIndex > 0 ? 1 : 0);

      // Déterminer le nom et le type d'export
      const { exportName, declarationKind } =
        extractExportDetails(trimmedLine);

      const jsdoc = generateJSDoc(exportName, declarationKind);
      insertions.push({ position, jsdoc: `${jsdoc}\n` });
    }

    // Détecter les déclarations internes (const, function, etc.) qui sont ensuite exportées
    if (
      !trimmedLine.startsWith('export ') &&
      (trimmedLine.startsWith('const ') ||
        trimmedLine.startsWith('function ') ||
        trimmedLine.startsWith('class ') ||
        trimmedLine.startsWith('interface ') ||
        trimmedLine.startsWith('type ') ||
        trimmedLine.startsWith('enum '))
    ) {
      // Vérifier si cette déclaration est exportée plus tard dans le fichier
      const declarationName = extractDeclarationName(trimmedLine);
      if (declarationName && isExportedLater(lines, declarationName)) {
        // Calculer la position dans le texte original
        const position =
          lines.slice(0, lineIndex).join('\n').length +
          (lineIndex > 0 ? 1 : 0);

        const declarationKind = getDeclarationKind(trimmedLine);
        const jsdoc = generateJSDoc(declarationName, declarationKind);
        insertions.push({ position, jsdoc: `${jsdoc}\n` });
      }
    }
  });

  // Trier par position décroissante pour insérer de la fin vers le début
  insertions.sort((a, b) => b.position - a.position);

  // Insérer les JSDoc
  for (const insertion of insertions) {
    modifiedText =
      modifiedText.slice(0, insertion.position) +
      insertion.jsdoc +
      modifiedText.slice(insertion.position);
  }

  return modifiedText;
};
