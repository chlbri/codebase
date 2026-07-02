import edit from 'edit-json-file';
import { existsSync } from 'fs';
import { join } from 'path';
import { Project } from 'ts-morph';
import { PATH_PROPERTY } from '../../constants';
import { consoleStars, getFolderPath } from '../../helpers';
import { CodebaseAnalysis } from '../../schemas';
import { cleanup } from '../cleanup';
import {
  getOutsideImportsAndExports,
  removeUnusedDeclarations,
} from './declarations';
import { cleanEmptyDirectories } from './directories';
import { cleanEmptySourceFiles } from './files';
import type { LiftOutput } from './types';
export type { LiftOutput };

/**
 * Internal orchestrator for lifting codebase files. It adds the files to a ts-morph project,
 * repeatedly prunes unused declarations and imports (observing the provided exceptions),
 * purges empty files and empty folders, and saves changes back to disk.
 *
 * @param root - The codebase target folder path.
 * @param jsonConfigPath - The codebase JSON config filepath.
 * @param CODEBASE_ANALYSIS - The full codebase analysis configuration object.
 * @param exceptions - An array of identifiers to preserve during pruning.
 * @param project - An optional ts-morph project instance to reuse.
 * @returns type {@linkcode LiftOutput} if successful, false otherwise.
 */
const _lift = (
  root: string,
  jsonConfigPath: string,
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  exceptions: string[],
  project?: Project,
): LiftOutput => {
  consoleStars();
  console.log('📂 Lifting the codebase ....');
  consoleStars();

  const out: LiftOutput = {
    tokens: [],
    imports: [],
    directories: [],
    files: [],
  };

  const folderPath = getFolderPath(root);

  if (!existsSync(folderPath)) {
    console.log(`Folder not found: ${folderPath}`);
    return out;
  }

  const tsConfigFilePath = join(process.cwd(), 'tsconfig.json');
  const proj =
    project ||
    (existsSync(tsConfigFilePath)
      ? new Project({ tsConfigFilePath })
      : new Project());

  if (!project) {
    // Add all source files recursively if they weren't preloaded
    proj.addSourceFilesAtPaths(join(folderPath, '**/*.ts'));
    proj.addSourceFilesAtPaths(join(folderPath, '**/*.tsx'));
    proj.resolveSourceFileDependencies();
  }

  const isInsideFolder = (filePath: string) => {
    return filePath.startsWith(folderPath);
  };

  const { outsideExports, outsideImports } =
    getOutsideImportsAndExports(proj, isInsideFolder);

  const checkEmpties =
    outsideExports.length + outsideImports.length === 0;
  if (checkEmpties) {
    console.log('Nothing exported, cleanup');
    cleanup.files(jsonConfigPath);
    cleanup(root);
    console.log();
    console.log();
    console.log('Lifting done !!');
    return out;
  }

  const entriesWithExports = Object.entries(CODEBASE_ANALYSIS).filter(
    ([, val]) => val.exports && val.exports.length > 0,
  );

  consoleStars();
  console.log('🧹 Removing unused tokens ....');
  consoleStars();
  console.log();

  removeUnusedDeclarations(
    proj,
    isInsideFolder,
    exceptions,
    outsideExports,
    outsideImports,
    out,
  );

  console.log();
  console.log();

  if (out.tokens.length > 0) {
    console.log(`${out.tokens.length} unused tokens deleted`);
  } else console.log('No unused tokens found');

  console.log();

  if (out.imports.length > 0) {
    console.log(`${out.imports.length} unused imports deleted`);
  } else console.log('No unused imports found');

  console.log();
  console.log();
  consoleStars();
  console.log('🧹 Cleaning empty files ....');
  consoleStars();

  const emptyFilesCount = cleanEmptySourceFiles(
    proj,
    isInsideFolder,
    folderPath,
    jsonConfigPath,
    out,
  );

  if (emptyFilesCount > 0) {
    console.log(`${emptyFilesCount} empty files deleted`);
  } else console.log('No empty files found');

  // Save changes
  proj.saveSync();

  console.log();
  console.log();
  consoleStars();
  console.log('🧹 Cleaning empty directories ....');
  consoleStars();

  // Phase D: Clean empty directories
  const emptyDirectoriesCount = cleanEmptyDirectories(
    folderPath,
    proj,
    entriesWithExports,
    folderPath,
    out,
  );

  console.log();
  if (emptyDirectoriesCount > 0) {
    console.log(`${emptyDirectoriesCount} empty directories deleted`);
  } else console.log('No empty directories found');

  console.log();
  console.log();
  console.log();
  console.log();

  out.directories.sort();
  out.files.sort();
  out.imports.sort();
  out.tokens.sort();

  console.log('Lifting done !!');
  return out;
};

/**
 * Lifts and cleans up unused code, files, and directories inside the target root codebase folder,
 * while keeping any declarations or imports specified in the exception parameters.
 *
 * @param CODEBASE_ANALYSIS - The full codebase analysis config.
 * @param jsonConfigPath - The codebase JSON config filepath.
 * @param args - A parameter list of variable, function, class, or type names to preserve, optionally ending with a ts-morph Project to reuse.
 * @returns `true` if the codebase lifting was successfully completed.
 *
 * throws {@linkcode Error} if the root folder configuration is not found.
 */
export const lift = (
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  jsonConfigPath: string,
  ...args: any[]
) => {
  const exceptions: string[] = [];
  let project: Project | undefined;

  for (const arg of args) {
    if (arg instanceof Project) {
      project = arg;
    } else if (typeof arg === 'string') {
      exceptions.push(arg);
    }
  }

  const json = join(process.cwd(), jsonConfigPath);
  const file = edit(json);
  const root = file.get(PATH_PROPERTY);

  if (!root || typeof root !== 'string') {
    throw new Error('Root path not found in codebase configuration.');
  }

  return _lift(
    root,
    jsonConfigPath,
    CODEBASE_ANALYSIS,
    exceptions,
    project,
  );
};
