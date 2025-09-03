import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { analyze } from '../analyse';
import { OUTPUT_FILE } from '../constants';
import { toArray } from '../helpers';
import { CodebaseAnalysis } from '../types';

export const transformJSON = (data: CodebaseAnalysis) => {
  let imports = 0;
  let exports = 0;
  let files = 0;

  const entries = Object.entries(data).map(
    ([
      key,
      { imports: _imports, relativePath, text, exports: _exports },
    ]) => {
      imports += _imports.length;
      exports += _exports.length;
      files++;

      const value = {
        imports: _imports,
        relativePath,
        text,
      };
      return [key, value] as const;
    },
  );

  const CODE_ANALYSIS = Object.fromEntries(entries);

  const STATS = {
    files,
    imports,
    exports,
  };

  return {
    STATS,
    CODE_ANALYSIS,
  };
};

export type GenerateOptions = {
  output?: string;
  excludes?: string[] | string;
};

/**
 * Fonction principale d'exécution
 */
export const generate = ({
  output = OUTPUT_FILE,
  excludes,
}: GenerateOptions = {}) => {
  const _output = output.endsWith('.json') ? output : `${output}.json`;

  try {
    const analysis = analyze(...toArray(excludes));
    const transformed = transformJSON(analysis);

    const json = JSON.stringify(transformed, null, 2);
    writeFileSync(_output, json);

    console.log(
      `📁 Analyse sauvegardée dans: ${relative(process.cwd(), _output)}`,
    );
    console.log(`📊 Statistiques:`);
    console.log(`   - Fichiers analysés: ${transformed.STATS.files}`);
    console.log(`   - Total imports: ${transformed.STATS.imports}`);
    console.log(`   - Total exports: ${transformed.STATS.exports}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'analyse du codebase:", error);
    process.exit(1);
  }
};

// Exécuter si ce fichier est appelé directement
if (process.argv[1]) {
  generate();
}
