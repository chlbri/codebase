/**
 * Convertit un chemin de fichier en clé dot notation comme dans .manifest.ts
 * Ex: 'features/arrays/castings/all.ts' -> 'features.arrays.castings.all'
 */
export function pathToDotNotation(filePath: string): string {
  return filePath
    .replace(/\.ts$/, '') // Enlever l'extension .ts
    .replace(/\//g, '.'); // Remplacer les / par des .
}
