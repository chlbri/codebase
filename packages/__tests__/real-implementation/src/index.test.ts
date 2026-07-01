import { lift } from '@bemedev/codebase';
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'fs';
import { join, relative } from 'path';

describe('Lift function', () => {
  const pkgDir = process.cwd();
  const codebaseDir = join(pkgDir, 'src/.bemedev');
  const codebaseBackup = join(pkgDir, 'src/.bemedev_backup');
  const configPath = join(pkgDir, '.bemedev.json');
  const configBackup = join(pkgDir, '.bemedev_backup.json');

  const getFilesRecursively = (dir: string): string[] => {
    let results: string[] = [];
    if (!existsSync(dir)) return results;
    const list = readdirSync(dir);
    for (const file of list) {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        results = results.concat(getFilesRecursively(filePath));
      } else {
        results.push(filePath);
      }
    }
    return results;
  };

  const cleanUp = () => {
    if (existsSync(codebaseBackup)) {
      rmSync(codebaseBackup, { recursive: true, force: true });
    }
    if (existsSync(configBackup)) {
      rmSync(configBackup, { force: true });
    }
  };

  const restore = () => {
    if (existsSync(codebaseBackup)) {
      rmSync(codebaseDir, { recursive: true, force: true });
      cpSync(codebaseBackup, codebaseDir, { recursive: true });
      rmSync(codebaseBackup, { recursive: true, force: true });
    }
    if (existsSync(configBackup)) {
      rmSync(configPath, { force: true });
      cpSync(configBackup, configPath);
      rmSync(configBackup, { force: true });
    }
  };

  let result: boolean;
  let remaining: string[] = [];

  beforeAll(() => {
    cleanUp();
    cpSync(codebaseDir, codebaseBackup, { recursive: true });
    cpSync(configPath, configBackup);

    const codebaseJson = JSON.parse(
      readFileSync(join(pkgDir, '.codebase.json'), 'utf8'),
    );

    result = lift(codebaseJson.CODEBASE_ANALYSIS, '.bemedev.json');

    const allFiles = getFilesRecursively(codebaseDir);
    remaining = allFiles
      .map(f => relative(pkgDir, f).replace(/\\/g, '/'))
      .sort();
  }, 60000);

  afterAll(restore);
  test('#01 => lift result is true', () => expect(result).toBe(true));
  test('#02 => file count is 26', () =>
    expect(remaining.length).toBe(29));

  test('#03 => matches the expected files list', () => {
    expect(remaining).toEqual([
      'src/.bemedev/features/arrays/castings/toArray.ts',
      'src/.bemedev/features/arrays/castings/tuple/index.ts',
      'src/.bemedev/features/arrays/types.ts',
      'src/.bemedev/features/common/castings/any.ts',
      'src/.bemedev/features/common/castings/is/defined.ts',
      'src/.bemedev/features/common/types.ts',
      'src/.bemedev/features/common/typings/extract/all.ts',
      'src/.bemedev/features/common/typings/extract/const.ts',
      'src/.bemedev/features/common/typings/extract/index.ts',
      'src/.bemedev/features/common/typings/index.ts',
      'src/.bemedev/features/functions/functions/identify.ts',
      'src/.bemedev/features/functions/functions/partialCall.ts',
      'src/.bemedev/features/functions/functions/partialCallO.ts',
      'src/.bemedev/features/functions/functions/switch.ts',
      'src/.bemedev/features/functions/types.ts',
      'src/.bemedev/features/numbers/typings/index.ts',
      'src/.bemedev/features/objects/castings/trueObject.ts',
      'src/.bemedev/features/objects/types.ts',
      'src/.bemedev/features/objects/typings/byKey.ts',
      'src/.bemedev/features/objects/typings/keysOf.ts',
      'src/.bemedev/features/strings/typings/index.ts',
      'src/.bemedev/globals/types.ts',
      'src/.bemedev/globals/utils/_unknown.ts',
      'src/.bemedev/globals/utils/castFn.ts',
      'src/.bemedev/globals/utils/expandFn.ts',
      'src/.bemedev/globals/utils/is/merge.ts',
      'src/.bemedev/globals/utils/is/object.ts',
      'src/.bemedev/globals/utils/is/primitive.ts',
      'src/.bemedev/globals/utils/typeFn.ts',
    ]);
  });
});
