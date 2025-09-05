import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { REPLACERS } from './constants';
import { FileAnalysis } from './schemas';

export type TransformModuleArgs = {
  cwd?: string;
  relativePath: string;
  moduleSpecifier: string;
};

export const transformModule = ({
  cwd = process.cwd(),
  relativePath,
  moduleSpecifier,
}: TransformModuleArgs) => {
  const out = relative(
    cwd,
    resolve(dirname(relativePath), moduleSpecifier),
  ).replaceAll('/', '.');

  return out;
};

export const writeFileAnalysis = (
  fileAnalysis: FileAnalysis,
  folderPath: string,
) => {
  const relativePath = fileAnalysis.relativePath;

  // Créer le chemin de destination dans .bemedev en maintenant la structure
  const destPath = join(folderPath, relativePath);
  const destDir = dirname(destPath);

  try {
    // Créer le dossier de destination si nécessaire
    mkdirSync(destDir, { recursive: true });

    let fileContent = fileAnalysis.text;
    REPLACERS.init.forEach(([search, replace]) => {
      fileContent = fileContent.replaceAll(search, replace);
    });

    // Écrire le contenu du fichier types
    writeFileSync(destPath, fileContent, 'utf8');

    console.log(`  ✅ ${relativePath}`);
    return relativePath.slice(0, -3).replaceAll('/', '.');
  } catch (error) {
    return console.error(`  ❌ Erreur pour ${relativePath}:`, error);
  }
};

export const consoleStars = () => {
  console.log();
  console.log('*'.repeat(30));
  console.log();
};

export const toArray = <T>(value?: T | T[]): T[] => {
  return Array.isArray(value) ? value : !value ? [] : [value];
};

export const getFolderPath = (root: string) => {
  const cwd = process.cwd();
  const srcExists = existsSync(join(cwd, 'src'));
  const folderPath = srcExists ? join(cwd, 'src', root) : join(cwd, root);

  return folderPath;
};
