import { analyze, lift } from '@bemedev/codebase';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

describe('Lift function', () => {
  describe('#01 => Without exceptions', () => {
    const rootDirName = 'lift_temp';
    const folderPath = join(process.cwd(), 'src', rootDirName);
    const configPath = 'lift_temp_config.json';
    const configFullPath = join(process.cwd(), configPath);

    const file1Path = join(folderPath, 'file1.ts');
    const file2Path = join(folderPath, 'file2.ts');
    const file3Path = join(folderPath, 'file3.ts');
    const file4Path = join(folderPath, 'file4.ts');
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
    const file4Exists = () => existsSync(file4Path);
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
        JSON.stringify(
          {
            path: rootDirName,
            files: ['file1', 'file2', 'file3', 'nested/empty', 'file4'],
          },
          null,
          2,
        ),
        'utf8',
      );

      // Create file1.ts
      writeFileSync(
        file1Path,
        `
        import * as file2 from './file2';
        export const usedAcrossFiles = 42;
        export const unusedAcrossFiles = 100;
        export type UnusedType = string;
        export type UsedAcrossFilesType = number;
        console.log(file2.myVar);
        `,
        'utf8',
      );

      // Create file2.ts
      writeFileSync(
        file2Path,
        `
        import * as file1 from './file1';
        import { unusedImport } from './file3';
        export const myVar: file1.UsedAcrossFilesType = file1.usedAcrossFiles;
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

      // Create file4.ts (exports file3.ts, should be recursively cleaned up)
      writeFileSync(
        file4Path,
        `
        export * from './file3';
        `,
        'utf8',
      );
    });

    afterAll(cleanUp);

    test('#01 => run lift', () => {
      const analysis = analyze({ src: folderPath });
      result = lift(analysis, configPath);
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
    test('#15 => nested still exists (files removed in-memory, dir cleaned after saveSync)', () =>
      expect(nestedExists()).toBe(true));
    test('#16 => file4 gone', () => expect(file4Exists()).toBe(false));
    test('#17 => config files array updated', () => {
      const config = JSON.parse(readFileSync(configFullPath, 'utf8'));
      expect(config.files).toEqual(['file1', 'file2']);
    });
  });

  describe('#02 => With exceptions', () => {
    const rootDirName = 'lift_temp_ex';
    const folderPath = join(process.cwd(), 'src', rootDirName);
    const configPath = 'lift_temp_ex_config.json';
    const configFullPath = join(process.cwd(), configPath);

    const file1Path = join(folderPath, 'file1.ts');
    const file2Path = join(folderPath, 'file2.ts');

    const cleanUp = () => {
      if (existsSync(folderPath)) {
        rmSync(folderPath, { recursive: true, force: true });
      }
      if (existsSync(configFullPath)) {
        rmSync(configFullPath, { force: true });
      }
    };

    const file1Content = () => readFileSync(file1Path, 'utf8');

    let result: boolean | undefined;

    beforeAll(() => {
      cleanUp();

      // Create folders
      mkdirSync(folderPath, { recursive: true });

      // Create config file
      writeFileSync(
        configFullPath,
        JSON.stringify(
          {
            path: rootDirName,
            files: ['file1', 'file2'],
          },
          null,
          2,
        ),
        'utf8',
      );

      // Create file1.ts (with unused declarations that we will protect)
      writeFileSync(
        file1Path,
        `
        import * as file2 from './file2';
        export const usedAcrossFiles = 42;
        export const unusedAcrossFiles = 100;
        export type UnusedType = string;
        export type UsedAcrossFilesType = number;
        console.log(file2.myVar);
        `,
        'utf8',
      );

      // Create file2.ts (references only usedAcrossFiles)
      writeFileSync(
        file2Path,
        `
        import * as file1 from './file1';
        export const myVar = file1.usedAcrossFiles;
        console.log(myVar);
        `,
        'utf8',
      );
    });

    afterAll(cleanUp);

    test('#01 => run lift with exceptions', () => {
      const analysis = analyze({ src: folderPath });
      // Protect unusedAcrossFiles and UnusedType
      result = lift(
        analysis,
        configPath,
        'unusedAcrossFiles',
        'UnusedType',
      );
    });

    test('#02 => success is true', () => expect(result).toBe(true));

    test('#03 => file1 still contains protected unusedAcrossFiles', () =>
      expect(file1Content()).toContain('unusedAcrossFiles'));

    test('#04 => file1 still contains protected UnusedType', () =>
      expect(file1Content()).toContain('UnusedType'));

    test('#05 => file1 contains usedAcrossFiles', () =>
      expect(file1Content()).toContain('usedAcrossFiles'));

    test('#06 => config files array remains unchanged', () => {
      const config = JSON.parse(readFileSync(configFullPath, 'utf8'));
      expect(config.files).toEqual(['file1', 'file2']);
    });
  });

  describe('#03 => Delete empty directory exports', () => {
    const rootDirName = 'lift_temp_dir_exports';
    const folderPath = join(process.cwd(), 'src', rootDirName);
    const configPath = 'lift_temp_dir_exports_config.json';
    const configFullPath = join(process.cwd(), configPath);

    const indexPath = join(folderPath, 'index.ts');
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

    const indexContent = () => readFileSync(indexPath, 'utf8');

    let result: boolean | undefined;

    beforeAll(() => {
      cleanUp();

      // Create folders
      mkdirSync(nestedFolderPath, { recursive: true });

      // Create config file
      writeFileSync(
        configFullPath,
        JSON.stringify(
          {
            path: rootDirName,
            files: ['index', 'nested/empty'],
          },
          null,
          2,
        ),
        'utf8',
      );

      // Create index.ts with exports to the nested folder
      writeFileSync(
        indexPath,
        `
        export * from './nested';
        export { someVar } from './nested/empty';
        export const keepMe = 1;
        `,
        'utf8',
      );

      // Create nested/empty.ts which is empty
      writeFileSync(emptyFilePath, '', 'utf8'); 
    });

    afterAll(cleanUp);

    test('#01 => run lift', () => {
      const analysis = analyze({ src: folderPath });
      result = lift(analysis, configPath, 'keepMe');
    });

    test('#02 => success is true', () => expect(result).toBe(true));
    test('#03 => nested folder still exists (cleaned after saveSync)', () =>
      expect(existsSync(nestedFolderPath)).toBe(true));
    test('#04 => index.ts still contains exports to nested (dir not cleaned)', () => {
      const content = indexContent().trim();
      expect(content).toContain('./nested');
    });
  });

  describe('#04 => With exports from outside the folder path', () => {
    const rootDirName = 'lift_temp_outside/inner';
    const parentFolder = join(process.cwd(), 'src', 'lift_temp_outside');
    const folderPath = join(parentFolder, 'inner');
    const configPath = 'lift_temp_outside_config.json';
    const configFullPath = join(process.cwd(), configPath);

    const outsidePath = join(parentFolder, 'outside.ts');
    const file1Path = join(folderPath, 'file1.ts');

    const cleanUp = () => {
      if (existsSync(parentFolder)) {
        rmSync(parentFolder, { recursive: true, force: true });
      }
      if (existsSync(configFullPath)) {
        rmSync(configFullPath, { force: true });
      }
    };

    const file1Content = () => readFileSync(file1Path, 'utf8');

    let result: boolean | undefined;

    beforeAll(() => {
      cleanUp();

      // Create folders
      mkdirSync(folderPath, { recursive: true });

      // Create config file
      writeFileSync(
        configFullPath,
        JSON.stringify(
          {
            path: rootDirName,
            files: ['file1'],
          },
          null,
          2,
        ),
        'utf8',
      );

      // Create outside.ts
      writeFileSync(
        outsidePath,
        `
        export const outsideVar = 42;
        export type OutsideType = string;
        `,
        'utf8',
      );

      // Create inner/file1.ts (with unused imports from outside)
      writeFileSync(
        file1Path,
        `
        import { outsideVar, OutsideType } from '../outside';
        export const myVar = 123;
        `,
        'utf8',
      );
    });

    afterAll(cleanUp);

    test('#01 => run lift', () => {
      const analysis = analyze({ src: parentFolder });
      result = lift(analysis, configPath, 'myVar');
    });

    test('#02 => success is true', () => expect(result).toBe(true));
    test('#03 => file1 still contains imported outsideVar (not pruned because it is an outside export)', () => {
      expect(file1Content()).toContain('outsideVar');
    });
    test('#04 => file1 still contains imported OutsideType (not pruned because it is an outside export)', () => {
      expect(file1Content()).toContain('OutsideType');
    });
  });
});

