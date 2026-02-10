import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { PATH_KEY, PROPERTIES } from '../constants';
import { getFolderPath, writeFileAnalysis } from '../helpers';
import { CodebaseAnalysis } from '../schemas';

export interface InitOptions {
  /**
   * Emplacement personnalisé pour le dossier .bemedev
   * Par défaut: 'src/.bemedev' si src existe, sinon '.bemedev' à la racine
   */
  root: string;
  json: string;
}

export const createTypesStructure = (
  folderPath: string,
  CODEBASE_ANALYSIS: CodebaseAnalysis,
) => {
  const entries = Object.entries(CODEBASE_ANALYSIS).filter(([key]) => {
    return key.endsWith('types') || key.endsWith('constants');
  });

  const PATHS: string[] = [];

  console.log(
    `🔧 Création de la structure de types (${entries.length} fichiers)...`,
  );

  for (const [, fileAnalysis] of entries) {
    const file = writeFileAnalysis(fileAnalysis, folderPath);
    if (file) PATHS.push(file);
  }

  console.log(`✅ Structure de types créée avec succès!`);
  return PATHS;
};

export const init = (
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  { root, json }: InitOptions,
) => {
  const cwd = process.cwd();
  const configFile = join(cwd, json);
  const configExists = existsSync(configFile);

  if (configExists) return true;
  const folderPath = getFolderPath(root);

  // 1. Créer le dossier
  try {
    mkdirSync(folderPath, { recursive: true });
    console.log(`✅ Dossier .bemedev créé dans: ${root}`);
  } catch (error) {
    console.error(
      `❌ Erreur lors de la création du dossier .bemedev:`,
      error,
    );
    return false;
  }

  // eslint-disable-next-line no-useless-assignment
  let files: string[] = [];
  // 1.5. Créer la structure des fichiers types
  try {
    files = createTypesStructure(folderPath, CODEBASE_ANALYSIS);
  } catch {
    console.error(
      `❌ Erreur lors de la création de la structure de types:`,
    );
    return false;
  }

  // 2. Mettre à jour le tsconfig.json
  const tsconfigPath = join(cwd, 'tsconfig.json');

  if (existsSync(tsconfigPath)) {
    try {
      const tsconfigContent = readFileSync(tsconfigPath, 'utf8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Initialiser compilerOptions et paths si ils n'existent pas
      if (!tsconfig.compilerOptions) {
        tsconfig.compilerOptions = {};
      }

      if (!tsconfig.compilerOptions.paths) {
        tsconfig.compilerOptions.paths = {};
      }

      // Ajouter le path #bemedev/*
      let relativePath = relative(process.cwd(), folderPath);
      const baseUrl = tsconfig.compilerOptions.baseUrl;

      if (typeof baseUrl === 'string') {
        // Si baseUrl est défini, calculer le chemin relatif par rapport à baseUrl

        relativePath = relative(baseUrl, relativePath);
      } else {
        // Si baseUrl n'est pas défini, utiliser le chemin absolu
        tsconfig.compilerOptions.baseUrl = '.';
      }

      tsconfig.compilerOptions.paths[PATH_KEY] = [`${relativePath}/*`];

      writeFileSync(
        tsconfigPath,
        JSON.stringify(tsconfig, null, 2),
        'utf8',
      );
      console.log(`✅ Path #bemedev/* ajouté au tsconfig.json`);
    } catch (error) {
      console.error(
        `❌ Erreur lors de la mise à jour du tsconfig.json:`,
        error,
      );
      return false;
    }
  } else {
    console.warn(`⚠️ Fichier tsconfig.json introuvable, path non ajouté`);
  }

  // 3. Créer le fichier .bemedev.json à la racine

  const config = {
    version: '1.0.0',
    [PROPERTIES.PATH]: root,
    [PROPERTIES.FILES]: files,
  };

  try {
    writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
    console.log(`✅ Fichier .bemedev.json créé à la racine du projet`);
  } catch (error) {
    console.error(
      `❌ Erreur lors de la création du fichier .bemedev.json:`,
      error,
    );
    return false;
  }

  console.log(`🎉 Initialisation de bemedev terminée avec succès!`);
  return true;
};
