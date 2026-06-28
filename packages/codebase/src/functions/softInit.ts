import { existsSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { DEFAULT_CLI_NAME, DEFAULT_PATH_KEY } from '../constants';
import { createTypesStructure, getFolderPath } from '../helpers';
import { CodebaseAnalysis } from '../schemas';
import type { InitOptions } from './init';

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
  if (!existsSync(folderPath)) return false;

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
