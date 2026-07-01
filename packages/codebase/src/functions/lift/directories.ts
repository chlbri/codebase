import { existsSync, readdirSync, rmdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { Project } from 'ts-morph';

/**
 * Recursively scans and cleans up empty subdirectories within the specified directory,
 * and removes any export declarations targeting files inside those empty subdirectories.
 *
 * @param dir - The directory path to inspect and clean.
 * @param project - The ts-morph project instance.
 * @param entriesWithExports - Codebase analysis entries containing exported files.
 * @param srcDir - The absolute codebase source directory path.
 */
export const cleanEmptyDirectories = (
  dir: string,
  project: Project,
  entriesWithExports: [string, any][],
  srcDir: string,
  counter: {
    directories: string[];
  },
): number => {
  let deletedDirectories = 0;
  if (!existsSync(dir) || !statSync(dir).isDirectory())
    return deletedDirectories;

  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      deletedDirectories += cleanEmptyDirectories(
        fullPath,
        project,
        entriesWithExports,
        srcDir,
        counter,
      );
    }
  }

  const remaining = readdirSync(dir);

  if (remaining.length === 0) {
    for (const [, fileAnalysis] of entriesWithExports) {
      const exportingFilePath = join(srcDir, fileAnalysis.relativePath);
      const exportingSf = project.getSourceFile(exportingFilePath);

      if (exportingSf) {
        const exportDecls = exportingSf.getExportDeclarations();

        for (const decl of exportDecls) {
          const moduleSpecifier = decl.getModuleSpecifierValue();

          if (moduleSpecifier) {
            const resolvedSpec = resolve(
              exportingSf.getDirectoryPath(),
              moduleSpecifier,
            ).replace(/\.tsx?$/, '');

            if (resolvedSpec.startsWith(dir)) decl.remove();
          }
        }
      }
    }
    console.log('  🗑️  Deleted empty folder:', dir);
    counter.directories.push(relative(srcDir, dir).replace(/\\/g, '/'));
    rmdirSync(dir);
    deletedDirectories++;
  }

  return deletedDirectories;
};
