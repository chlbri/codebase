import { writeFileSync } from 'fs';
import { relative } from 'path';
import { analyze } from '../analyse';
import { DEFAULT_CODEBASE_FILE, SRC_DIR } from '../constants';
import { CodebaseAnalysis } from '../schemas';

/**
 * Transforms the raw codebase analysis data into a structured output,
 * calculating metrics such as file count, import count, and export count.
 * It filters out any exports that lack a module specifier.
 *
 * @param data - The raw codebase analysis data.
 * @returns An object containing `STATS` (aggregated file, import, and export counts)
 * and `CODEBASE_ANALYSIS` (the cleaned analysis mappings).
 */
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

      const value: any = {
        imports: _imports,
        relativePath,
        text,
        exports: _exports?.filter(
          ({ moduleSpecifier }) => moduleSpecifier !== undefined,
        ),
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
 * Performs a codebase analysis on the source files and writes the structured results (JSON)
 * to an output file. It also prints statistical summaries of the files, imports, and exports found.
 *
 * @param options - Configuration options for the codebase generation.
 * @param options.output - The target file path for the codebase analysis JSON. Defaults to 'codebase.json'.
 * @param options.excludes - File patterns or folders to exclude from the codebase analysis.
 * @param options.src - The source directory to run the analysis on. Defaults to 'src'.
 * @returns True if the analysis was successfully written; exits the process with code 1 if an error is thrown.
 */
export const generate = ({
  output = DEFAULT_CODEBASE_FILE,
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
      `📁 Analysis saved in: ${relative(process.cwd(), _output)}`,
    );
    console.log(`📊 Statistics:`);
    console.log(`   - Files analyzed: ${transformed.STATS.files}`);
    console.log(`   - Total imports: ${transformed.STATS.imports}`);
    console.log(`   - Total exports: ${transformed.STATS.exports}`);
  } catch (error) {
    console.error('❌ Error during codebase analysis:', error);
    process.exit(1);
  }

  return true;
};
