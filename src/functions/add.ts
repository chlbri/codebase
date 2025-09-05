import edit, { JsonEditor } from 'edit-json-file';
import { dirname, join, relative, resolve } from 'node:path';
import {
  FILES_PROPERTY,
  JSON_FILE_NAME,
  PATH_PROPERTY,
} from '../constants';
import {
  consoleStars,
  getFolderPath,
  transformModule,
  writeFileAnalysis,
} from '../helpers';
import { CodebaseAnalysis, type FileAnalysis } from '../schemas';
import type { NOmit } from '../types';

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
    ).replaceAll('/', '.');

    const toAdd =
      CODEBASE_ANALYSIS[_path] ?? CODEBASE_ANALYSIS[`${_path}.index`];
    if (!toAdd) return;

    additionals.push([_path, toAdd]);

    const all = additionals
      .concat(pathsEntries)
      .map(([key]) => key)
      .concat(files);

    const imports = toAdd.imports.filter(({ moduleSpecifier }) => {
      const _path = transformModule({
        cwd,
        relativePath: toAdd.relativePath,
        moduleSpecifier,
      });

      const array = [_path, `${_path}.index`].filter(p =>
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

export const add = (
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  ...files: string[]
) => {
  const isEmpty = files.length === 0;
  if (isEmpty) return console.warn('No files specified for addition.');
  try {
    const cwd = process.cwd();
    const json = join(cwd, JSON_FILE_NAME);
    let file: JsonEditor | undefined = edit(json);

    if (!file) return;

    const files = file.get(FILES_PROPERTY) as string[];
    const root = file.get(PATH_PROPERTY) as string;
    const folderPath = getFolderPath(root);

    // Release resources

    const additionals: [string, NOmit<FileAnalysis, 'exports'>][] = [];

    const pathsEntries = Object.entries(CODEBASE_ANALYSIS)
      .filter(([key]) => files.some(p => key.startsWith(p)))
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
    console.log(`🔧 Création des fichiers (${entries.size} fichiers)...`);

    let success = 0;
    const length = entries.size;

    entries.forEach(([, fileAnalysis]) => {
      const _path = writeFileAnalysis(fileAnalysis, folderPath);
      if (_path) {
        files.push(_path);
        file?.set(FILES_PROPERTY, files);
        success++;
      }
    });

    file.save();
    console.log(`✅ Fichiers créés! (${success}/${length})`);
    file = undefined;
  } catch {
    console.error(`❌ Erreur lors de la création des fichiers`);
    return false;
  }

  consoleStars();
  return true;
};
