/**
 * Converts a file path to a dot notation key as in .manifest.ts
 * Ex: 'features/arrays/castings/all.ts' -> 'features.arrays.castings.all'
 */
export function pathToDotNotation(filePath: string): string {
  return filePath
    .replace(/\.ts$/, '') // Remove the .ts extension
    .replace(/\//g, '.'); // Replace / with .
}
