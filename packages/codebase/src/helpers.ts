import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve, parse } from 'path';
import { REPLACERS } from './constants';
import { FileAnalysis } from './schemas';

export type TransformModuleArgs = {
  cwd?: string;
  relativePath: string;
  moduleSpecifier: string;
};

export const transformModule = ({
  cwd = process.cwd(),
  relativePath,
  moduleSpecifier,
}: TransformModuleArgs) => {
  const out = relative(
    cwd,
    resolve(dirname(relativePath), moduleSpecifier),
  ).replaceAll('/', '.');

  return out;
};

export const writeFileAnalysis = (
  fileAnalysis: FileAnalysis,
  folderPath: string,
) => {
  const relativePath = fileAnalysis.relativePath;

  // Create the destination path in .bemedev maintaining the structure
  const destPath = join(folderPath, relativePath);
  const parsed = parse(destPath);

  try {
    // Create the destination folder if necessary
    mkdirSync(parsed.dir, { recursive: true });

    let fileContent = fileAnalysis.text;
    REPLACERS.init.forEach(([search, replace]) => {
      fileContent = fileContent.replaceAll(search, replace);
    });

    // Write the types file content
    writeFileSync(destPath, fileContent, 'utf8');

    console.log(`  ✅ ${relativePath}`);

    const out = parsed.name.replaceAll('/', '.');
    return out;
  } catch (error) {
    return console.error(`  ❌ Error for ${relativePath}:`, error);
  }
};

export const consoleStars = () => {
  console.log();
  console.log('*'.repeat(30));
  console.log();
};

export const toArray = <T>(value?: T | T[]): T[] => {
  return Array.isArray(value) ? value : !value ? [] : [value];
};

export const getFolderPath = (root: string) => {
  const cwd = process.cwd();
  const srcExists = existsSync(join(cwd, 'src'));
  const folderPath = srcExists
    ? join(cwd, 'src', root)
    : join(cwd, root);

  return folderPath;
};
