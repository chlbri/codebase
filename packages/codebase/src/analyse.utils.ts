import type { SourceFile } from 'ts-morph';

/**
 * Generates a JSDoc for an automatically generated exported expression
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
 * Checks if an export line contains a declaration and not just a simple re-export
 */
export const hasDeclaration = (exportLine: string): boolean => {
  const trimmed = exportLine.trim();
  const falsy =
    trimmed.startsWith('export {') || // export { something }
    trimmed.startsWith('export *') || // export * from
    trimmed.includes('} from ') || // export { a, b } from
    trimmed.match(/^export\s+\{[^}]*\}\s*;?\s*$/) || // export { a, b };
    trimmed.match(
      /^export\s+default\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*;?\s*$/,
    ); // export default identifier;

  // Re-exports and simple exports to exclude
  if (falsy) return false;

  // Declarations to include (with declaration keywords)
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
 * Extracts the name of a declaration (const, function, etc.)
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
 * Checks if a declaration is exported later in the file
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
 * Determines the declaration kind
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
 * Adds JSDoc to exported expressions in the source text
 */
export const addJSDocToSourceText = (
  sourceFile: SourceFile,
): string => {
  // Get the text without imports from the start
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

  // A simpler approach: analyze the text directly to find exports
  const lines = modifiedText.split('\n');

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();

    // Detect lines that start with export AND contain a declaration
    if (
      trimmedLine.startsWith('export ') &&
      hasDeclaration(trimmedLine)
    ) {
      // Calculate the position in the original text
      const position =
        lines.slice(0, lineIndex).join('\n').length +
        (lineIndex > 0 ? 1 : 0);

      // Determine the export name and kind
      const { exportName, declarationKind } =
        extractExportDetails(trimmedLine);

      const jsdoc = generateJSDoc(exportName, declarationKind);
      insertions.push({ position, jsdoc: `${jsdoc}\n` });
    }

    // Detect internal declarations (const, function, etc.) that are exported later
    if (
      !trimmedLine.startsWith('export ') &&
      (trimmedLine.startsWith('const ') ||
        trimmedLine.startsWith('function ') ||
        trimmedLine.startsWith('class ') ||
        trimmedLine.startsWith('interface ') ||
        trimmedLine.startsWith('type ') ||
        trimmedLine.startsWith('enum '))
    ) {
      // Check if this declaration is exported later in the file
      const declarationName = extractDeclarationName(trimmedLine);
      if (declarationName && isExportedLater(lines, declarationName)) {
        // Calculate the position in the original text
        const position =
          lines.slice(0, lineIndex).join('\n').length +
          (lineIndex > 0 ? 1 : 0);

        const declarationKind = getDeclarationKind(trimmedLine);
        const jsdoc = generateJSDoc(declarationName, declarationKind);
        insertions.push({ position, jsdoc: `${jsdoc}\n` });
      }
    }
  });

  // Sort by descending position to insert from the end to the beginning
  insertions.sort((a, b) => b.position - a.position);

  // Insert JSDocs
  for (const insertion of insertions) {
    modifiedText =
      modifiedText.slice(0, insertion.position) +
      insertion.jsdoc +
      modifiedText.slice(insertion.position);
  }

  return modifiedText;
};
