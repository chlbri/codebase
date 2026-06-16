import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { config } from '../config';
import {
  DEFAULT_CLI_NAME,
  DEFAULT_PATH_KEY,
  PROPERTIES,
} from '../constants';
import { getFolderPath, writeFileAnalysis } from '../helpers';
import { CodebaseAnalysis } from '../schemas';

export interface InitOptions {
  /**
   * Custom location for the .bemedev folder
   * Default: 'src/.bemedev' if src exists, otherwise '.bemedev' at the root
   */
  root: string;
  json: string;
  path?: string;
  bin?: string;
}

export const createTypesStructure = (
  folderPath: string,
  CODEBASE_ANALYSIS: CodebaseAnalysis,
) => {
  const entries = Object.entries(CODEBASE_ANALYSIS).filter(([key]) => {
    return key.endsWith('types') || key.endsWith('constants');
  });

  const PATHS: string[] = [];

  console.log(
    `🔧 Creating types structure (${entries.length} files)...`,
  );

  for (const [, fileAnalysis] of entries) {
    const file = writeFileAnalysis(fileAnalysis, folderPath);
    if (file) PATHS.push(file);
  }

  console.log(`✅ Types structure successfully created!`);
  return PATHS;
};

const initConfig = ({
  root,
  json,
  path = DEFAULT_PATH_KEY,
  bin = DEFAULT_CLI_NAME,
}: InitOptions) => {
  config.bin = bin;
  config.json = json;
  config.tsConfigPath = path;
  config.root = root;

  return { root, json, path, bin };
};

export const init = (
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  options: InitOptions,
) => {
  const { root, json, path, bin } = initConfig(options);
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

      {
        // Remove baseUrl since typescript 6.0 will no longer use it
        // const baseUrl = tsconfig.compilerOptions.baseUrl;
        // if (typeof baseUrl === 'string') {
        //   // If baseUrl is defined, calculate the relative path with respect to baseUrl
        //   relativePath = relative(baseUrl, relativePath);
        // } else {
        //   // If baseUrl is not defined, use the absolute path
        //   tsconfig.compilerOptions.baseUrl = '.';
        // }
      }

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

  console.log(`🎉 Bemedev initialization completed successfully!`);
  return true;
};
