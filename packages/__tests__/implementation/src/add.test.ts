import { add, init, remove } from '@bemedev/codebase';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import code from '../.codebase.json';

describe('Test add and init functions', () => {
  const rootDir = '.code';
  const jsonFile = '.codev.json';
  const tsconfigPath = join(process.cwd(), 'tsconfig.json');
  let originalTsconfig: string;

  beforeAll(() => {
    if (existsSync(tsconfigPath)) {
      originalTsconfig = readFileSync(tsconfigPath, 'utf8');
    }
  });

  afterAll(() => {
    if (existsSync(jsonFile)) {
      rmSync(jsonFile, { force: true });
    }
    const folderPath = join(process.cwd(), 'src', rootDir);
    if (existsSync(folderPath)) {
      rmSync(folderPath, { recursive: true, force: true });
    }
    if (originalTsconfig !== undefined && existsSync(tsconfigPath)) {
      writeFileSync(tsconfigPath, originalTsconfig, 'utf8');
    }
  });

  test('#01 => Should initialize codebase successfully', () => {
    const success = init(code.CODEBASE_ANALYSIS, {
      root: rootDir,
      json: jsonFile,
    });
    expect(success).toBe(true);
  });

  test('#02 => File config .codev.json should exist', () => {
    expect(existsSync(jsonFile)).toBe(true);
  });

  test('#03 => Src folder .code should exist', () => {
    const folderPath = join(process.cwd(), 'src', rootDir);
    expect(existsSync(folderPath)).toBe(true);
  });

  test('#04 => Should add codebase files successfully', () => {
    const success = add(code.CODEBASE_ANALYSIS, '');
    expect(success).toBe(true);
  });

  test('#05 => Added files should exist in the folder', () => {
    const indexPath = join(process.cwd(), 'src', rootDir, 'index.ts');
    const jsxPath = join(process.cwd(), 'src', rootDir, 'jsx.tsx');
    expect(existsSync(indexPath)).toBe(true);
    expect(existsSync(jsxPath)).toBe(true);
  });

  test('#06 => should remove index', () => {
    const success = remove(code.CODEBASE_ANALYSIS, 'index');
    expect(success).toBe(true);

    const indexPath = join(process.cwd(), 'src', rootDir, 'index.ts');
    const jsxPath = join(process.cwd(), 'src', rootDir, 'jsx.tsx');
    expect(existsSync(indexPath)).toBe(false);
    expect(existsSync(jsxPath)).toBe(true);
  });
});
