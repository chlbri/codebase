import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import code from '../.codebase.json';

import {
  add,
  cleanup,
  init,
  lift,
  remove,
  softInit,
} from '@bemedev/codebase';

describe('CLI', () => {
  const FILES = [
    'features/arrays/types',
    'features/booleans/types',
    'features/common/types',
    'features/functions/types',
    'features/numbers/constants',
    'features/numbers/types',
    'features/objects/types',
    'features/objects/utils/types',
    'features/promises/types',
    'features/strings/constants',
    'features/strings/types',
    'globals/constants',
    'globals/types',
  ];

  const root = '.bemedev';
  const json = `${root}.json`;
  const path = '#bemedev/*';
  const bin = 'bin';
  const jsonPath = join(process.cwd(), '.bemedev.json');
  const folderPath = join(process.cwd(), 'src', root);

  describe('#01 => INIT', () => {
    test('#01 => Init cmd', () =>
      init(code.CODEBASE_ANALYSIS as any, {
        json,
        root,
        path: '#bemedev/*',
        bin: 'bin',
      }));

    describe('#02 => Folders initialization', () => {
      describe('#01 => json config', () => {
        test('#01 => File exists', () => {
          const exists = existsSync(
            join(process.cwd(), '.bemedev.json'),
          );
          expect(exists).toBe(true);
        });

        describe('#02 => File is valid', () => {
          let obj: any;
          beforeAll(() => {
            const json = readFileSync(
              join(process.cwd(), '.bemedev.json'),
              {
                encoding: 'utf-8',
              },
            );
            obj = JSON.parse(json);
          });

          test.each(['path', 'files', 'version'])(
            `#0%# => Has "%s" key`,
            key => {
              expect(obj).toHaveProperty(key);
            },
          );

          test('#03 => Files are added', () => {
            const files = obj.files;
            console.log('files', files);
            expect(files).toEqual(FILES);
          });
        });
      });
    });
  });

  const fileAdded = 'features/arrays/castings/freeze';
  const fileRemoved = 'features/arrays/castings/tuple';
  describe('#02 => ADD', () => {
    test('#01 => Add cmd', () =>
      add(code.CODEBASE_ANALYSIS as any, json, fileAdded));

    describe('#02 => File is updated', () => {
      let obj: any;
      beforeAll(() => {
        const json = readFileSync(jsonPath, {
          encoding: 'utf-8',
        });
        obj = JSON.parse(json);
      });

      test(`01 => New file added : "${fileAdded}"`, () => {
        expect(obj.files).toContain(fileAdded);
      });

      test('02 => Existing file still exists : "features/arrays/types"', () => {
        expect(obj.files).toContain('features/arrays/types');
      });

      test('03 => New file added : "globals/utils/_unknown"', () => {
        expect(obj.files).toContain('globals/utils/_unknown');
      });

      test('04 => New file added : "features/arrays/castings/tuple/index"', () => {
        expect(obj.files).toContain(
          'features/arrays/castings/tuple/index',
        );
      });

      test('05 => Only 3 files are added', () => {
        const length = FILES.length + 3;
        expect(obj.files).toHaveLength(length);
      });
    });
  });

  describe('#03 => REMOVE', () => {
    test(`#01 => Remove cmd "${fileRemoved}"`, () =>
      remove(code.CODEBASE_ANALYSIS as any, json, fileRemoved));

    describe('#02 => File is updated', () => {
      let obj: any;
      beforeAll(() => {
        const json = readFileSync(jsonPath, {
          encoding: 'utf-8',
        });
        obj = JSON.parse(json);
      });

      test(`01 => File is not removed because other depended : "${fileRemoved}.index"`, () => {
        expect(obj.files).toContain(`${fileRemoved}/index`);
      });

      test('02 => Existing file still exists', () => {
        expect(obj.files).toContain('features/arrays/types');
        expect(obj.files).toContain('globals/utils/_unknown');
        expect(obj.files).toContain('features/arrays/castings/freeze');
        expect(obj.files).toContain(fileAdded);
      });
    });

    test(`#03 => Remove cmd "${fileAdded}"`, () =>
      remove(code.CODEBASE_ANALYSIS as any, json, fileAdded));

    describe('#04 => File is updated', () => {
      let obj: any;
      beforeAll(() => {
        const json = readFileSync(jsonPath, {
          encoding: 'utf-8',
        });
        obj = JSON.parse(json);
      });

      test('01 => Remaining files still exists', () => {
        expect(obj.files).toContain('features/arrays/types');
        expect(obj.files).toContain('globals/utils/_unknown');
        expect(obj.files).toContain(`${fileRemoved}/index`);
      });

      test(`02 => File is removed: "${fileAdded}"`, () => {
        expect(obj.files).not.toContain(fileAdded);
      });

      test('03 => One file is removed', () => {
        const length = FILES.length + 2;
        expect(obj.files).toHaveLength(length);
      });
    });

    test(
      `#05 => Lift`,
      () => lift(code.CODEBASE_ANALYSIS as any, json),
      60_000,
    );

    describe('#06 => FolderPath removed and JSONPATH changed', () => {
      let obj: any;
      beforeAll(() => {
        const json = readFileSync(jsonPath, {
          encoding: 'utf-8',
        });
        obj = JSON.parse(json);
      });
      test('#01 => FolderPath removed', () => {
        const exists = existsSync(folderPath);
        expect(exists).toBe(false);
      });

      test('#02 => json.files is empty', () => {
        console.log('obj', obj);
        expect(obj.files).toHaveLength(0);
      });
    });

    test(
      `#07 => softInit`,
      () =>
        softInit(code.CODEBASE_ANALYSIS as any, {
          root,
          json,
          path,
          bin,
        }),
      60_000,
    );

    describe('#06 => FolderPath is recreated and JSONPATH changed', () => {
      let obj: any;
      beforeAll(() => {
        const json = readFileSync(jsonPath, {
          encoding: 'utf-8',
        });
        obj = JSON.parse(json);
      });

      test('#01 => FolderPath recreated', () => {
        const exists = existsSync(folderPath);
        expect(exists).toBe(true);
      });

      describe('#02 => paths', () => {
        test.each(['path', 'files', 'version'])(
          `#0%# => Has "%s" key`,
          key => {
            expect(obj).toHaveProperty(key);
          },
        );
      });

      test('#03 => json.files is rinit', () => {
        expect(obj.files.sort()).toStrictEqual(FILES.sort());
      });
    });

    test(`#07 => destroy`, () => cleanup.all(root, json), 60_000);

    describe('#08 => FolderPath and JSON_PATH are removed', () => {
      test('#01 => FolderPath removed', () => {
        const exists = existsSync(folderPath);
        expect(exists).toBe(false);
      });

      test('#02 => json.files is removed', () => {
        const exists = existsSync(jsonPath);
        expect(exists).toBe(false);
      });
    });
  });
});
