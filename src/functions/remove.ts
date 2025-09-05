import edit, { JsonEditor } from 'edit-json-file';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import {
  FILES_PROPERTY,
  JSON_FILE_NAME,
  PATH_PROPERTY,
} from '../constants';
import { consoleStars, getFolderPath, transformModule } from '../helpers';
import { CodebaseAnalysis, FileAnalysis } from '../schemas';

const transformModules = (
  entries: [string, FileAnalysis][],
  ...files: string[]
) => {
  const cwd = process.cwd();
  const out = entries
    .map(
      ([key, { imports, relativePath }]) =>
        [key, relativePath, imports] as const,
    )
    .map(([key, relativePath, imports]) => {
      const specifiers = imports
        .map(({ moduleSpecifier }) => {
          return transformModule({
            cwd,
            relativePath,
            moduleSpecifier,
          });
        })
        .map(_path => [_path, `${_path}.index`]) // Ajouter les variantes .index
        .flat()
        .filter(s => files.includes(s));

      return [key, Array.from(new Set(specifiers))] as const;
    });

  return out;
};

export const remove = (
  CODEBASE_ANALYSIS: CodebaseAnalysis,
  ...paths: string[]
) => {
  const isEmpty = paths.length === 0;
  if (isEmpty) return console.warn('No files specified for removal.');
  try {
    const cwd = process.cwd();
    const json = join(cwd, JSON_FILE_NAME);
    let file: JsonEditor | undefined = edit(json);

    if (!file) return;

    const root = getFolderPath(file.get(PATH_PROPERTY) as string);
    const files = file.get(FILES_PROPERTY) as string[];

    const entries2 = Object.entries(CODEBASE_ANALYSIS).filter(([key]) =>
      files.includes(key),
    );

    const entries = entries2.filter(([key]) =>
      paths.some(p => key.startsWith(p)),
    );

    // Vérifier les dépendances avant suppression
    const safesToRemove: string[] = [];
    const cannotsRemove: [string, string[]][] = [];

    entries.forEach(([key]) => {
      const modules = transformModules(entries2, ...files);
      const importedFroms = modules
        .filter(([, specifiers]) => specifiers.includes(key))
        .map(([k]) => k);

      const check = importedFroms.length > 0;

      console.log('modules', '=>', importedFroms);
      console.log('key', '=>', key);

      if (check) return cannotsRemove.push([key, importedFroms]);
      return safesToRemove.push(key);
    });

    consoleStars();
    console.log(
      `🔧 Suppression des fichiers (${entries.length} fichiers)...`,
    );

    // Afficher les fichiers qui ne peuvent pas être supprimés
    if (cannotsRemove.length > 0) {
      const len = cannotsRemove.length;
      const one =
        "fichier ne peut pas être supprimé (importé dans d'autres fichiers)";
      const many =
        "fichiers ne peuvent pas être supprimés (importés dans d'autres fichiers)";

      console.warn(`⚠️  ${len} ${len === 1 ? one : many} :`);
      cannotsRemove.forEach(([key, modules]) => {
        console.warn(`  - ⚠️  ${key} importé par :`);
        modules.forEach(m => console.warn(`    -> 📌 ${m}`));
      });
    }

    if (safesToRemove.length === 0) {
      console.warn('❌ Aucun fichier ne peut être supprimé.');
      return consoleStars();
    }

    const formatteds = safesToRemove.map(key => {
      const _path = `${key.replaceAll('.', '/')}.ts`;
      const absolute = join(root, _path);
      return [key, absolute] as const;
    });

    console.log(
      `🗑️ Suppression des fichiers (${safesToRemove.length} fichiers)...`,
    );

    let success = 0;
    const length = formatteds.length;

    formatteds.forEach(([key, path]) => {
      try {
        unlinkSync(path);
        console.log(`  - 🗑️ ${key}`);
        file?.set(
          FILES_PROPERTY,
          files.filter(key1 => key1 !== key),
        );
        success++;
      } catch (error) {
        console.error(`  - ❌ Erreur, ${key} :`, error);
      }
    });

    file.save();
    console.log(`🗑️ Fichiers supprimés! (${success}/${length})`);
    file = undefined;
  } catch {
    console.error(`❌ Erreur lors de la création des fichiers`);
    consoleStars();
    return false;
  }
  consoleStars();
  return true;
};
