import { join, relative } from 'path';
import { Project } from 'ts-morph';
import * as v from 'valibot';
import { addJSDocToSourceText } from './analyse.utils';
import { SRC_DIR } from './constants';
import { analyzeExports } from './exports';
import { toArray } from './helpers';
import { analyzeImports, buildImportStrings } from './imports';
import { CodebaseAnalysisSchema } from './schemas';
import { pathToDotNotation } from './utils';

export type AnalyzeOptions = {
  src?: string;
  excludes?: string | string[];
};

/**
 * Analyzes all TypeScript files in src/ (except src/scripts/)
 */
export const analyze = ({
  src = SRC_DIR,
  excludes: _excludes,
}: AnalyzeOptions = {}) => {
  console.log('🔍 Codebase analysis in progress...');
  const excludes = toArray(_excludes);

  // Initialize the ts-morph project
  const project = new Project({
    tsConfigFilePath: join(process.cwd(), 'tsconfig.json'),
  });

  // Add all TypeScript files from the src folder
  const sourceFiles = project.addSourceFilesAtPaths(
    [
      `${src}/**/*.ts`,
      `!${src}/**/*.test.ts`, // Exclude test files
      `!${src}/**/*.spec.ts`, // Exclude spec files
    ].concat(excludes.map(exclude => `!${exclude}`)),
  );

  const analysis: v.InferInput<typeof CodebaseAnalysisSchema> = {};
  let processedCount = 0;

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    const relativePath = relative(src, filePath);

    // Generate modified text with JSDoc for exports

    const _text = addJSDocToSourceText(sourceFile);

    // #region Analyze imports and exports
    const imports = analyzeImports(sourceFile);
    const exports = analyzeExports(sourceFile);
    // #endregion

    // Build imports from fileAnalysis.imports
    const importsStrings = buildImportStrings(imports);

    // Combine imports and content
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

    // #region Display analysis progress in increments of 50
    if (processedCount % 50 === 0) {
      console.log(
        `📊 Analyzed ${processedCount}/${sourceFiles.length} files...`,
      );
    }
    // #endregion
  }

  console.log(
    `✅ Analysis completed: ${processedCount} files analyzed`,
  );
  return v.parse(CodebaseAnalysisSchema, analysis);
};
