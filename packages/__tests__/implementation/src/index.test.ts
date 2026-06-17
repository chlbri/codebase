import { add, init, remove } from '@bemedev/codebase';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import code from '../.codebase.json';

describe('Test add and init functions', () => {
  // #region Configuration
  const rootDir = '.code';
  const jsonFile = '.codev.json';
  const tsconfigPath = join(process.cwd(), 'tsconfig.json');
  let originalTsconfig: string;
  const indexPath = join(process.cwd(), 'src', rootDir, 'index.ts');
  const jsxPath = join(process.cwd(), 'src', rootDir, 'jsx.tsx');

  const nestedPath = join(
    process.cwd(),
    'src',
    rootDir,
    'nested',
    'path.ts',
  );

  const nestedTooltipPath = join(
    process.cwd(),
    'src',
    rootDir,
    'nested',
    'Tooltip.tsx',
  );

  const rinit = () => {
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
  };
  // #endregion

  beforeAll(() => {
    rinit();
    if (existsSync(tsconfigPath)) {
      originalTsconfig = readFileSync(tsconfigPath, 'utf8');
    }
  });

  afterAll(rinit);

  test('#01 => Should initialize codebase successfully', () => {
    const success = init(code.CODEBASE_ANALYSIS as any, {
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
    const success = add(code.CODEBASE_ANALYSIS as any, '');
    expect(success).toBe(true);
  });

  test('#05 => Added files should exist in the folder', () => {
    expect(existsSync(indexPath)).toBe(true);
    expect(existsSync(jsxPath)).toBe(true);
  });

  test('#06 => should remove index', () => {
    const success = remove(code.CODEBASE_ANALYSIS as any, 'index');
    expect(success).toBe(true);
    expect(existsSync(indexPath)).toBe(false);
    expect(existsSync(jsxPath)).toBe(true);
    expect(existsSync(nestedPath)).toBe(true);
  });

  test('#07 => should remove nested', () => {
    const success = remove(
      code.CODEBASE_ANALYSIS as any,
      'nested/path',
    );

    expect(success).toBe(true);
    expect(existsSync(indexPath)).toBe(false);
    expect(existsSync(jsxPath)).toBe(true);
    expect(existsSync(nestedPath)).toBe(false);
  });

  test('#08 => should remove nested', () => {
    const success = remove(
      code.CODEBASE_ANALYSIS as any,
      'nested/Tooltip',
    );

    expect(success).toBe(true);
    expect(existsSync(indexPath)).toBe(false);
    expect(existsSync(jsxPath)).toBe(true);
    expect(existsSync(nestedPath)).toBe(false);
    expect(existsSync(nestedTooltipPath)).toBe(false);
  });

  test('#09 => Add Tooltip', () => {
    const success = add(
      code.CODEBASE_ANALYSIS as any,
      'nested/Tooltip',
    );

    expect(success).toBe(true);
    expect(existsSync(indexPath)).toBe(false);
    expect(existsSync(nestedTooltipPath)).toBe(true);
  });
});
