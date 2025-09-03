import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  FILES_PROPERTY,
  JSON_FILE_NAME,
  PATH_KEY,
  PATH_PROPERTY,
} from '../constants';
import { getAnalysis, writeFileAnalysis } from '../helpers';
import { CodebaseAnalysis } from '../schemas';

export interface InitOptions {
  /**
   * Emplacement personnalisé pour le dossier .bemedev
   * Par défaut: 'src/.bemedev' si src existe, sinon '.bemedev' à la racine
   */
  root?: string;
  json?: string;
}

export const createTypesStructure = (
  bemedevPath: string,
  CODEBASE_ANALYSIS: CodebaseAnalysis,
) => {
  const entries = Object.entries(CODEBASE_ANALYSIS).filter(([key]) => {
    return key.endsWith('.types') || key.endsWith('.constants');
  });

  const PATHS: string[] = [];

  console.log(
    `🔧 Création de la structure de types (${entries.length} fichiers)...`,
  );

  for (const [, fileAnalysis] of entries) {
    const file = writeFileAnalysis(fileAnalysis, bemedevPath);
    if (file) PATHS.push(file);
  }

  console.log(`✅ Structure de types créée avec succès!`);
  return PATHS;
};

export const initBemedev = (options?: InitOptions) => {
  const cwd = process.cwd();
  const configFile = join(cwd, options?.json ?? JSON_FILE_NAME);
  const configExists = existsSync(configFile);

  if (configExists) return true;

  const srcExists = existsSync(join(cwd, 'src'));

  // Déterminer l'emplacement du dossier .bemedev
  const path = options?.root ?? (srcExists ? 'src/.bemedev' : '.bemedev');
  const bemedevPath = join(cwd, path);

  // 1. Créer le dossier .bemedev
  try {
    mkdirSync(join(bemedevPath), { recursive: true });
    console.log(`✅ Dossier .bemedev créé dans: ${path}`);
  } catch (error) {
    console.error(
      `❌ Erreur lors de la création du dossier .bemedev:`,
      error,
    );
    return false;
  }

  let files: string[] = [];
  // 1.5. Créer la structure des fichiers types
  try {
    const CODEBASE_ANALYSIS = getAnalysis();
    files = createTypesStructure(bemedevPath, CODEBASE_ANALYSIS);
  } catch (error) {
    console.error(
      `❌ Erreur lors de la création de la structure de types:`,
      error,
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
      let relativePath = path;
      const baseUrl = tsconfig.compilerOptions.baseUrl;

      if (typeof baseUrl === 'string') {
        // Si baseUrl est défini, calculer le chemin relatif par rapport à baseUrl

        relativePath = join(baseUrl, relativePath);
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
    [PATH_PROPERTY]: path,
    [FILES_PROPERTY]: files,
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
