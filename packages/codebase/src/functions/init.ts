import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import {
  DEFAULT_CLI_NAME,
  DEFAULT_PATH_KEY,
  PROPERTIES,
} from '../constants';
import { createTypesStructure, getFolderPath } from '../helpers';
import { CodebaseAnalysis } from '../schemas';

/**
 * Options for initializing the codebase workspace configuration.
 */
export interface InitOptions {
  /**
   * Custom location for the codebase folder (e.g. 'src/.bemedev' if src exists,
   * otherwise '.bemedev' at the root of the project).
   */
  root: string;
  /**
   * The relative path to the JSON configuration file to be created.
   */
  json: string;
  /**
   * The path mapping key to add to tsconfig.json (e.g. '#bemedev/*').
   */
  path?: string;
  /**
   * The binary command or CLI name (used in CLI feedback).
   */
  bin?: string;
}

/**
 * Initializes the codebase workspace by creating the target types folder structure,
 * updating the local tsconfig.json with path aliases, and writing a JSON config file.
 *
 * @param CODEBASE_ANALYSIS - The full codebase analysis object.
 * @param options - The initialization options.
 * @param options.root - Target directory for generated type files.
 * @param options.json - Target filepath for the codebase JSON config file.
 * @param options.path - The tsconfig compiler path alias key. Defaults to '#bemedev/*'.
 * @param options.bin - The CLI command binary name used in logging. Defaults to 'bemedev'.
 * @returns True if initialization completes successfully; false if folder creation, typescript structures, or config generation fails.
 */
export const init = (
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  {
    root,
    json,
    path = DEFAULT_PATH_KEY,
    bin = DEFAULT_CLI_NAME,
  }: InitOptions,
) => {
  const cwd = process.cwd();
  const configFile = join(cwd, json);
  const configExists = existsSync(configFile);
  if (configExists) return true;
  const folderPath = getFolderPath(root);

  // 1. Create the folder
  try {
    mkdirSync(folderPath, { recursive: true });
    console.log(`✅ Folder ${bin} created in: ${root}`);
  } catch (error) {
    console.error(`❌ Error creating the folder ${bin}:`, error);
    return false;
  }

  // eslint-disable-next-line no-useless-assignment
  let files: string[] = [];
  // 1.5. Create the types files structure
  try {
    files = createTypesStructure(folderPath, CODEBASE_ANALYSIS);
  } catch {
    console.error(`❌ Error creating the types structure:`);
    return false;
  }

  // 2. Update tsconfig.json
  const tsconfigPath = join(cwd, 'tsconfig.json');

  if (existsSync(tsconfigPath)) {
    try {
      const tsconfigContent = readFileSync(tsconfigPath, 'utf8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Initialize compilerOptions and paths if they do not exist
      if (!tsconfig.compilerOptions) {
        tsconfig.compilerOptions = {};
      }

      if (!tsconfig.compilerOptions.paths) {
        tsconfig.compilerOptions.paths = {};
      }

      // Add the path #bemedev/*
      const relativePath = relative(process.cwd(), folderPath);

      tsconfig.compilerOptions.paths[path] = [`./${relativePath}/*`];

      writeFileSync(
        tsconfigPath,
        JSON.stringify(tsconfig, null, 2),
        'utf8',
      );
      console.log(`✅ Path ${path} added to tsconfig.json`);
    } catch (error) {
      console.error(`❌ Error updating tsconfig.json:`, error);
      return false;
    }
  } else {
    console.warn(`⚠️ File tsconfig.json not found, path not added`);
  }

  // 3. Create the .bemedev.json file at the root

  const jsonConfig = {
    version: '1.0.0',
    [PROPERTIES.PATH]: root,
    [PROPERTIES.FILES]: files,
  };

  try {
    writeFileSync(
      configFile,
      JSON.stringify(jsonConfig, null, 2),
      'utf8',
    );
    console.log(`✅ File ${json} created at the root of the project`);
  } catch (error) {
    console.error(`❌ Error creating the file ${json}:`, error);
    return false;
  }

  console.log(`🎉 ${bin} initialization completed successfully!`);
  return true;
};
