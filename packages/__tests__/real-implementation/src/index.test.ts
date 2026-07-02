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

test.skip('## => restore', restore);
describe('Lift function', () => {
  let result: any;
  let remaining: string[] = [];
  afterAll(restore);

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
      .map(f => relative(codebaseDir, f).replace(/\\/g, '/'))
      .sort();
  }, 60000);

  test('#01 => lift result is true', () =>
    expect(result).toBeDefined());
  test('#02 => file count is 27', () =>
    expect(remaining.length).toBe(27));

  test('#03 => matches the expected files list', () => {
    expect(remaining).toEqual([
      'features/arrays/castings/toArray.ts',
      'features/arrays/castings/tuple/index.ts',
      'features/arrays/types.ts',
      'features/common/castings/any.ts',
      'features/common/castings/is/defined.ts',
      'features/common/types.ts',
      'features/common/typings/extract/index.ts',
      'features/common/typings/index.ts',
      'features/functions/functions/identify.ts',
      'features/functions/functions/partialCall.ts',
      'features/functions/functions/partialCallO.ts',
      'features/functions/functions/switch.ts',
      'features/functions/types.ts',
      'features/numbers/typings/index.ts',
      'features/objects/castings/trueObject.ts',
      'features/objects/types.ts',
      'features/objects/typings/byKey.ts',
      'features/objects/typings/keysOf.ts',
      'features/strings/typings/index.ts',
      'globals/types.ts',
      'globals/utils/_unknown.ts',
      'globals/utils/castFn.ts',
      'globals/utils/expandFn.ts',
      'globals/utils/is/merge.ts',
      'globals/utils/is/object.ts',
      'globals/utils/is/primitive.ts',
      'globals/utils/typeFn.ts',
    ]);
  });

  test('#04 => config file changes', () => {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const files = config.files as string[];
    expect(files.map(f => `${f}.ts`).sort()).toStrictEqual(remaining);
  });

  test('#05 => preserves ParamsO and ParamsA in switch.ts', () => {
    const switchPath = join(
      codebaseDir,
      'features/functions/functions/switch.ts',
    );
    const content = readFileSync(switchPath, 'utf8');
    expect(content).toContain('type ParamsO');
    expect(content).toContain('type ParamsA');
  });
});
