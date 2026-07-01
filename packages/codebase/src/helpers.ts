import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve, parse } from 'path';
import type { SourceFile } from 'ts-morph';
import { REPLACERS } from './constants';
import { FileAnalysis, type CodebaseAnalysis } from './schemas';

/**
 * Resolves the moduleSpecifier using the tsconfig paths if it starts with "#"
 */
const _resolveModuleSpecifier = (
  sourceFile: SourceFile,
  moduleSpecifier: string,
): string => {
  const paths = sourceFile.getProject().getCompilerOptions().paths;

  if (!paths) return moduleSpecifier;

  const baseUrl = sourceFile.getProject().getCompilerOptions().baseUrl;
  const paths2 = Object.entries(paths);

  // Find the match in paths
  for (const [pattern, mappings] of paths2) {
    // Replace * with a regex to match
    const regexPattern = pattern.replace(/\*/g, '(.*)');
    const regex = new RegExp(`^${regexPattern}$`);
    const match = moduleSpecifier.match(regex);

    if (match) {
      // Take the first available mapping
      const first = mappings[0];

      // Resolve the absolute path
      let relativedPath = baseUrl ? join(baseUrl, first) : first;

      if (match[1]) {
        relativedPath = relativedPath.replace('*', match[1]);
      }

      // Calculate the relative path from the current source file
      const sourceFileDir = relative(
        process.cwd(),
        sourceFile.getDirectoryPath(),
      );
      const relativePath = relative(sourceFileDir, relativedPath);

      // Make sure the relative path starts with ./ or ../
      const resolved = relativePath.startsWith('.')
        ? relativePath
        : `./${relativePath}`;

      return resolved;
    }
  }

  return moduleSpecifier;
};

export const resolveModuleSpecifier = (
  sourceFile: SourceFile,
  moduleSpecifier: string,
): string => {
  return _resolveModuleSpecifier(sourceFile, moduleSpecifier).replace(
    /\.tsx?$/,
    '',
  );
};

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
  );

  return out;
};

export const pathToJsonKey = (relativePath: string, name: string) => {
  const parts = relativePath.split('/');
  parts.pop();
  parts.push(name);
  return parts.join('/');
};

export const writeFileAnalysis = (
  fileAnalysis: FileAnalysis,
  folderPath: string,
) => {
  const relativePath = fileAnalysis.relativePath;
  // Create the destination path in root maintaining the structure
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
    return pathToJsonKey(relativePath, parsed.name);
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

export const getSrcDir = () => {
  const cwd = process.cwd();
  const srcExists = existsSync(join(cwd, 'src'));
  return srcExists ? join(cwd, 'src') : cwd;
};

export const getFolderPath = (root: string) => {
  const srcDir = getSrcDir();
  const folderPath = join(srcDir, root);
  return folderPath;
};

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
    try {
      const file = writeFileAnalysis(fileAnalysis, folderPath);
      if (file) PATHS.push(file);
    } catch {
      console.error(
        `❌ Error creating the file ${fileAnalysis.relativePath}:`,
      );
    }
  }

  console.log(`✅ Types structure successfully created!`);
  return PATHS;
};

/**
 * Checks if a SourceFile does not contain any declarations (types, variables, classes, functions, enums, interfaces, namespaces).
 *
 * @param sourceFile - The ts-morph SourceFile instance.
 * @returns `true` if the file has no declarations; `false` otherwise.
 */
export const hasNoDeclarations = (sourceFile: SourceFile): boolean => {
  const hasLiveReExports = sourceFile
    .getExportDeclarations()
    .some(decl => {
      const target = decl.getModuleSpecifierSourceFile();
      return target && !target.wasForgotten();
    });

  return (
    sourceFile.getClasses().length === 0 &&
    sourceFile.getFunctions().length === 0 &&
    sourceFile.getVariableDeclarations().length === 0 &&
    sourceFile.getTypeAliases().length === 0 &&
    sourceFile.getInterfaces().length === 0 &&
    sourceFile.getEnums().length === 0 &&
    sourceFile.getModules().length === 0 &&
    !hasLiveReExports
  );
};
