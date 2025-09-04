import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { CODEBASE_FILE, SRC_DIR } from 'src/constants';
import { analyze } from '../analyse';
import { CodebaseAnalysis } from '../schemas';

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
      exports += _exports?.length ?? 0;
      files++;

      const value = {
        imports: _imports,
        relativePath,
        text,
      };
      return [key, value] as const;
    },
  );

  const CODEBASE_ANALYSIS = Object.fromEntries(entries);

  const STATS = {
    files,
    imports,
    exports,
  };

  return {
    STATS,
    CODEBASE_ANALYSIS,
  };
};

export type GenerateOptions = {
  output?: string;
  excludes?: string[] | string;
  src?: string;
};

/**
 * Fonction principale d'exécution
 */
export const generate = ({
  output = CODEBASE_FILE,
  excludes,
  src = SRC_DIR,
}: GenerateOptions = {}) => {
  const _output = output.endsWith('codebase.json')
    ? output
    : `${output}.codebase.json`;

  try {
    const analysis = analyze({ src, excludes });
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

  return true;
};
