import { join, relative } from "path";
import { Project } from "ts-morph";
import * as v from "valibot";
import { addJSDocToSourceText } from "./analyse.utils";
import { SRC_DIR } from "./constants";
import { analyzeExports } from "./exports";
import { toArray } from "./helpers";
import { analyzeImports, buildImportStrings } from "./imports";
import { CodebaseAnalysisSchema } from "./schemas";
import { pathToDotNotation } from "./utils";

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
}: AnalyzeOptions = {}) => {
  console.log("🔍 Analyse du codebase en cours...");
  const excludes = toArray(_excludes);

  // Initialiser le projet ts-morph
  const project = new Project({
    tsConfigFilePath: join(process.cwd(), "tsconfig.json"),
  });

  // Ajouter tous les fichiers TypeScript du dossier src
  const sourceFiles = project.addSourceFilesAtPaths(
    [
      `${src}/**/*.ts`,
      `!${src}/**/*.test.ts`, // Exclude test files
      `!${src}/**/*.spec.ts`, // Exclude spec files
    ].concat(excludes.map((exclude) => `!${exclude}`)),
  );

  const analysis: v.InferInput<typeof CodebaseAnalysisSchema> = {};
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
      importsStrings.length > 0 ? importsStrings.join("\n") : "";

    const text =
      importsSection === ""
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
  return v.parse(CodebaseAnalysisSchema, analysis);
};
