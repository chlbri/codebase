import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { DEFAULT_CLI_NAME, DEFAULT_PATH_KEY } from '../constants';
import { createTypesStructure, getFolderPath } from '../helpers';
import { CodebaseAnalysis } from '../schemas';
import type { InitOptions } from './init';

/**
 * Performs a "soft" initialization of the codebase workspace.
 * It verifies that the config file, tsconfig path mapping, and folder path
 * already exist and are configured correctly. If they are, it recreates
 * the typescript types folder structure using current codebase analysis without
 * rewriting the configuration files.
 *
 * @param CODEBASE_ANALYSIS - The full codebase analysis object.
 * @param options - Options for soft initializing the project (reuses InitOptions layout).
 * @param options.root - Target directory for generated type files.
 * @param options.json - Target filepath for the codebase JSON config file.
 * @param options.path - The tsconfig compiler path alias key. Defaults to '#bemedev/*'.
 * @param options.bin - The CLI command binary name used in logging. Defaults to 'bemedev'.
 * @returns True if soft initialization passes and types are updated successfully; false if any prerequisite is missing or if type generation fails.
 */
export const softInit = (
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
  if (!configExists) return false;

  const folderPath = getFolderPath(root);
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true });
  }

  const tsconfigPath = join(cwd, 'tsconfig.json');
  const tsConfigExists = existsSync(tsconfigPath);
  if (!tsConfigExists) return false;

  const tsconfigContent = readFileSync(tsconfigPath, 'utf8');
  const tsconfig = JSON.parse(tsconfigContent);
  const relativePath = relative(process.cwd(), folderPath);

  const checkPaths =
    tsconfig?.compilerOptions?.paths?.[path]?.[0] ===
    `./${relativePath}/*`;

  if (!checkPaths) return false;

  try {
    createTypesStructure(folderPath, CODEBASE_ANALYSIS);
  } catch {
    console.error(`❌ Error creating the types structure:`);
    return false;
  }

  // 3. Create the .bemedev.json file at the root

  console.log(`🎉 ${bin} soft initialization completed successfully!`);
  return true;
};
