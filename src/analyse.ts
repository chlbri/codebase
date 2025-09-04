import { join, relative } from 'path';
import { Project } from 'ts-morph';
import { addJSDocToSourceText } from './analyse.utils';
import { SRC_DIR } from './constants';
import { analyzeExports } from './exports';
import { toArray } from './helpers';
import { analyzeImports, buildImportStrings } from './imports';
import type { CodebaseAnalysis } from './types';
import { pathToDotNotation } from './utils';

export type AnalyzeOptions = {
  src?: string;
  excludes?: string | string[];
};

/**
 * Analyse tous les fichiers TypeScript dans src/ (sauf src/scripts/)
 */
export const analyze = ({
  src = SRC_DIR,
  excludes: _excludes,
}: AnalyzeOptions = {}): CodebaseAnalysis => {
  console.log('🔍 Analyse du codebase en cours...');
  const excludes = toArray(_excludes);

  // Initialiser le projet ts-morph
  const project = new Project({
    tsConfigFilePath: join(process.cwd(), 'tsconfig.json'),
  });

  // Ajouter tous les fichiers TypeScript du dossier src
  const sourceFiles = project.addSourceFilesAtPaths(
    [
      'src/**/*.ts',
      '!src/scripts/**/*', // Exclure le dossier scripts
      '!src/**/*.test.ts', // Exclure les fichiers de test
      '!src/**/*.spec.ts', // Exclure les fichiers de spec
    ].concat(excludes.map(exclude => `!${exclude}`)),
  );

  const analysis: CodebaseAnalysis = {};
  let processedCount = 0;

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    const relativePath = relative(src, filePath);

    // Générer le texte modifié avec JSDoc pour les exports

    const _text = addJSDocToSourceText(sourceFile);

    // #region Analyser les imports et exports
    const imports = analyzeImports(sourceFile);
    const exports = analyzeExports(sourceFile);
    // #endregion

    // Construire les imports à partir de fileAnalysis.imports
    const importsStrings = buildImportStrings(imports);

    // Combiner imports et contenu
    const importsSection =
      importsStrings.length > 0 ? importsStrings.join('\n') : '';

    const text =
      importsSection === ''
        ? _text
        : `${importsSection}

${_text}
    `;

    analysis[pathToDotNotation(relativePath)] = {
      relativePath,
      imports,
      exports,
      text,
    };

    processedCount++;

    // #region Afficher l'avancement de l'analyse par palliers de 50
    if (processedCount % 50 === 0) {
      console.log(
        `📊 Analysé ${processedCount}/${sourceFiles.length} fichiers...`,
      );
    }
    // #endregion
  }

  console.log(`✅ Analyse terminée: ${processedCount} fichiers analysés`);
  return analysis;
};
