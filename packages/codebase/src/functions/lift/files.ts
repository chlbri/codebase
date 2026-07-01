import edit from 'edit-json-file';
import { existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { Project } from 'ts-morph';
import { FILES_PROPERTY } from '../../constants';
import {
  hasNoDeclarations,
  resolveModuleSpecifier,
} from '../../helpers';

/**
 * Searches the target directory for source files that have become completely empty.
 * If an empty file is found, it deletes it from the disk, removes it from the project,
 * and recursively cleans up any export declarations in other source files that target this file.
 *
 * @param project - The ts-morph project instance.
 * @param isInsideFolder - A function that returns true if a file path is inside the target folder.
 * @param entriesWithExports - Codebase analysis entries containing exported files.
 * @param folderPath - The absolute codebase target folder path.
 * @param jsonConfigPath - The codebase JSON config filepath.
 * @returns `true` if at least one file was deleted; false otherwise.
 */
export const cleanEmptySourceFiles = (
  project: Project,
  isInsideFolder: (filePath: string) => boolean,
  folderPath: string,
  jsonConfigPath: string,
  counter: {
    files: string[];
  },
) => {
  const sourceFiles = project.getSourceFiles();
  const emptyFiles = sourceFiles.filter(
    sf => isInsideFolder(sf.getFilePath()) && hasNoDeclarations(sf),
  );

  if (emptyFiles.length === 0) return 0;
  const json = join(process.cwd(), jsonConfigPath);
  const file = edit(json);
  const deletedKeys = new Set<string>();

  for (const sf of emptyFiles) {
    const filePath = sf.getFilePath();
    const deletedPathWithoutExt = filePath.replace(/\.tsx?$/, '');

    for (const exportingSf of project.getSourceFiles()) {
      const exportDecls = exportingSf.getExportDeclarations();

      for (const decl of exportDecls) {
        const moduleSpecifier = decl.getModuleSpecifierValue();

        if (moduleSpecifier) {
          const resolvedSpec = resolve(
            exportingSf.getDirectoryPath(),
            resolveModuleSpecifier(exportingSf, moduleSpecifier),
          ).replace(/\.tsx?$/, '');

          if (resolvedSpec === deletedPathWithoutExt) decl.remove();
        }
      }
    }

    sf.delete();
    // if (existsSync(filePath)) unlinkSync(filePath);
    console.log('  ❌ Deleted file', filePath);
    console.log();

    // Collect the key to remove from the jsonConfigPath
    const relPath = relative(folderPath, filePath).replace(/\\/g, '/');
    const key = relPath.replace(/\.tsx?$/, '');
    deletedKeys.add(key);
    counter.files.push(key);
  }

  // Batch update and save the JSON configuration
  if (deletedKeys.size > 0 && existsSync(json)) {
    const files = file.get(FILES_PROPERTY) as string[] | undefined;
    if (files) {
      file.set(
        FILES_PROPERTY,
        files.filter(f => !deletedKeys.has(f)),
      );
      file.save();
    }
  }

  return emptyFiles.length;
};
