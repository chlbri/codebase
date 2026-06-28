import edit, { type JsonEditor } from 'edit-json-file';
import { dirname, join, relative, resolve } from 'path';
import { FILES_PROPERTY, PATH_PROPERTY } from '../constants';
import {
  consoleStars,
  getFolderPath,
  transformModule,
  writeFileAnalysis,
} from '../helpers';
import { CodebaseAnalysis, type FileAnalysis } from '../schemas';
import type { NOmit } from '../types';

/**
 * Recursively processes the file analysis of a target file, scanning its imports
 * and determining which imported files also need to be added to the codebase list.
 *
 * @param analysis - The file analysis details of the file being processed (omitting exports).
 * @param cwd - The current working directory.
 * @param additionals - A mutable list tracking additional file analyses that need to be added.
 * @param pathsEntries - The initial list of file entries specified to be added.
 * @param files - The current list of files already tracked in the codebase configuration.
 * @param CODEBASE_ANALYSIS - The full codebase analysis object containing all file structures.
 */
const processFileAnalysis = (
  analysis: NOmit<FileAnalysis, 'exports'>,
  cwd: string,
  additionals: [string, NOmit<FileAnalysis, 'exports'>][],
  pathsEntries: [string, NOmit<FileAnalysis, 'exports'>][],
  files: string[],
  CODEBASE_ANALYSIS: CodebaseAnalysis,
) => {
  const relativePath = analysis.relativePath;

  const keys = Object.keys(CODEBASE_ANALYSIS);
  analysis.imports.forEach(({ moduleSpecifier }) => {
    const _path = relative(
      cwd,
      resolve(dirname(relativePath), moduleSpecifier),
    );

    const all = additionals
      .concat(pathsEntries)
      .map(([key]) => key)
      .concat(files);

    const canAdd = all.every(p => p !== _path);
    if (!canAdd) return;

    const toAdd =
      CODEBASE_ANALYSIS[_path] ?? CODEBASE_ANALYSIS[`${_path}/index`];
    if (!toAdd) return;

    additionals.push([_path, toAdd]);
    all.push(_path);

    const imports = toAdd.imports.filter(({ moduleSpecifier }) => {
      const _path = transformModule({
        cwd,
        relativePath: toAdd.relativePath,
        moduleSpecifier,
      });

      const array = [_path, `${_path}/index`].filter(p =>
        keys.includes(p),
      );

      if (array.length < 1) return false;
      return array.every(p => !all.includes(p));
    });

    const toAdd2 = { ...toAdd, imports };
    const canRecurse = toAdd2.imports.length > 0;

    if (canRecurse) {
      processFileAnalysis(
        toAdd2,
        cwd,
        additionals,
        pathsEntries,
        files,
        CODEBASE_ANALYSIS,
      );
    }
  });
};

/**
 * Adds files and their required internal dependencies to the codebase configuration
 * file, creating the files on disk inside the root folder using their analyses.
 *
 * @param CODEBASE_ANALYSIS - The full codebase analysis object.
 * @param jsonConfigPath - The relative path to the codebase JSON configuration file.
 * @param paths - The file paths (module specifiers or directories) to add.
 * @returns True if the files were successfully added and the configuration was updated; false otherwise.
 */
export const add = (
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  jsonConfigPath: string,
  ...paths: string[]
) => {
  const isEmpty = paths.length === 0;
  if (isEmpty) return console.warn('No files specified for addition.');
  try {
    const cwd = process.cwd();
    const json = join(cwd, jsonConfigPath);
    let file: JsonEditor | undefined = edit(json);

    if (!file) return;

    const files = file.get(FILES_PROPERTY) as string[];
    const root = getFolderPath(file.get(PATH_PROPERTY) as string);

    // Release resources

    const additionals: [string, NOmit<FileAnalysis, 'exports'>][] = [];

    const pathsEntries = Object.entries(CODEBASE_ANALYSIS)
      .filter(([key]) => paths.some(p => key.startsWith(p)))
      .filter(([key]) => !files.includes(key));

    pathsEntries.forEach(([, analysis]) => {
      processFileAnalysis(
        analysis,
        cwd,
        additionals,
        pathsEntries,
        files,
        CODEBASE_ANALYSIS,
      );
    });

    const entries = new Set(
      pathsEntries.concat(additionals).filter(([, val]) => !!val),
    );

    consoleStars();
    console.log(`🔧 Creation of files (${entries.size} files)...`);

    let success = 0;
    const length = entries.size;

    entries.forEach(([, fileAnalysis]) => {
      const _path = writeFileAnalysis(fileAnalysis, root);
      if (_path) {
        files.push(_path);
        success++;
      }
    });

    file.set(FILES_PROPERTY, files);
    file.save();
    console.log(`✅ Files created! (${success}/${length})`);
    file = undefined;
  } catch {
    console.error(`❌ Error during file creation`);
    return false;
  }

  consoleStars();
  return true;
};
