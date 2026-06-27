import { lift } from '@bemedev/codebase';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

describe('Test lift function', () => {
  const rootDirName = 'lift_temp';
  const folderPath = join(process.cwd(), 'src', rootDirName);
  const configPath = 'lift_temp_config.json';
  const configFullPath = join(process.cwd(), configPath);

  const file1Path = join(folderPath, 'file1.ts');
  const file2Path = join(folderPath, 'file2.ts');
  const file3Path = join(folderPath, 'file3.ts');
  const nestedFolderPath = join(folderPath, 'nested');
  const emptyFilePath = join(nestedFolderPath, 'empty.ts');

  const cleanUp = () => {
    if (existsSync(folderPath)) {
      rmSync(folderPath, { recursive: true, force: true });
    }
    if (existsSync(configFullPath)) {
      rmSync(configFullPath, { force: true });
    }
  };

  const file1Exists = () => existsSync(file1Path);
  const file2Exists = () => existsSync(file2Path);
  const file3Exists = () => existsSync(file3Path);
  const emptyExists = () => existsSync(emptyFilePath);
  const nestedExists = () => existsSync(nestedFolderPath);

  const file1Content = () => readFileSync(file1Path, 'utf8');
  const file2Content = () => readFileSync(file2Path, 'utf8');

  let result: boolean | undefined;

  beforeAll(() => {
    cleanUp();

    // Create folders
    mkdirSync(nestedFolderPath, { recursive: true });

    // Create config file
    writeFileSync(
      configFullPath,
      JSON.stringify({ path: rootDirName }, null, 2),
      'utf8',
    );

    // Create file1.ts
    writeFileSync(
      file1Path,
      `
      export const usedAcrossFiles = 42;
      export const unusedAcrossFiles = 100;
      export type UnusedType = string;
      export type UsedAcrossFilesType = number;
      `,
      'utf8',
    );

    // Create file2.ts
    writeFileSync(
      file2Path,
      `
      import { usedAcrossFiles, UsedAcrossFilesType } from './file1';
      import { unusedImport } from './file3';
      export const myVar: UsedAcrossFilesType = usedAcrossFiles;
      export const unusedVar = 200;
      console.log(myVar);
      `,
      'utf8',
    );

    // Create file3.ts
    writeFileSync(
      file3Path,
      `
      export const unusedImport = 'hello';
      export const totallyUnused = 'world';
      `,
      'utf8',
    );

    // Create nested/empty.ts (will become empty)
    writeFileSync(
      emptyFilePath,
      `
      export const toBeDeleted = 1;
      `,
      'utf8',
    );
  });

  afterAll(cleanUp);

  test('#01 => run lift', () => {
    result = lift(configPath);
  });

  test('#02 => success is true', () => expect(result).toBe(true));
  test('#03 => file1 exists', () => expect(file1Exists()).toBe(true));

  test('#04 => file1 contains usedAcrossFiles', () =>
    expect(file1Content()).toContain('usedAcrossFiles'));

  test('#05 => file1 contains UsedAcrossFilesType', () =>
    expect(file1Content()).toContain('UsedAcrossFilesType'));

  test('#06 => file1 does not contain unusedAcrossFiles', () =>
    expect(file1Content()).not.toContain('unusedAcrossFiles'));

  test('#07 => file1 does not contain UnusedType', () =>
    expect(file1Content()).not.toContain('UnusedType'));

  test('#08 => file2 exists', () => expect(file2Exists()).toBe(true));

  test('#09 => file2 contains myVar', () =>
    expect(file2Content()).toContain('myVar'));

  test('#10 => file2 does not contain unusedVar', () =>
    expect(file2Content()).not.toContain('unusedVar'));

  test('#11 => file2 does not contain unusedImport', () =>
    expect(file2Content()).not.toContain('unusedImport'));

  test('#12 => file2 does not contain import from file3', () =>
    expect(file2Content()).not.toContain('./file3'));

  test('#13 => file3 gone', () => expect(file3Exists()).toBe(false));
  test('#14 => empty gone', () => expect(emptyExists()).toBe(false));
  test('#15 => nested gone', () => expect(nestedExists()).toBe(false));
});
