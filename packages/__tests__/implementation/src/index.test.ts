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
  const folderPath = join(process.cwd(), 'src', rootDir);
  let success: boolean | void;

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

  describe('#01 => init', () => {
    test('#01 => initialize', () => {
      success = init(code.CODEBASE_ANALYSIS as any, {
        root: rootDir,
        json: jsonFile,
      });
    });

    test('#02 => success is true', () => expect(success).toBe(true));

    test('#03 => config file exists', () => {
      expect(existsSync(jsonFile)).toBe(true);
    });

    test('#04 => src folder exists', () => {
      expect(existsSync(folderPath)).toBe(true);
    });
  });

  describe('#02 => add', () => {
    test('#01 => add files', () => {
      success = add(code.CODEBASE_ANALYSIS as any, '');
    });

    test('#02 => success is true', () => expect(success).toBe(true));

    test('#03 => index file exists', () => {
      expect(existsSync(indexPath)).toBe(true);
    });

    test('#04 => jsx file exists', () => {
      expect(existsSync(jsxPath)).toBe(true);
    });
  });

  describe('#03 => remove index', () => {
    test('#01 => remove', () => {
      success = remove(code.CODEBASE_ANALYSIS as any, 'index');
    });

    test('#02 => success is true', () => expect(success).toBe(true));

    test('#03 => index file does not exist', () => {
      expect(existsSync(indexPath)).toBe(false);
    });

    test('#04 => jsx file exists', () => {
      expect(existsSync(jsxPath)).toBe(true);
    });

    test('#05 => nested file exists', () => {
      expect(existsSync(nestedPath)).toBe(true);
    });
  });

  describe('#04 => remove nested.path', () => {
    test('#01 => remove', () => {
      success = remove(code.CODEBASE_ANALYSIS as any, 'nested/path');
    });

    test('#02 => success is true', () => expect(success).toBe(true));

    test('#03 => index file does not exist', () => {
      expect(existsSync(indexPath)).toBe(false);
    });

    test('#04 => jsx file exists', () => {
      expect(existsSync(jsxPath)).toBe(true);
    });

    test('#05 => nested file does not exist', () => {
      expect(existsSync(nestedPath)).toBe(false);
    });
  });

  describe('#05 => remove nested.Tooltip', () => {
    test('#01 => remove', () => {
      success = remove(code.CODEBASE_ANALYSIS as any, 'nested/Tooltip');
    });

    test('#02 => success is true', () => expect(success).toBe(true));

    test('#03 => index file does not exist', () => {
      expect(existsSync(indexPath)).toBe(false);
    });

    test('#04 => jsx file exists', () => {
      expect(existsSync(jsxPath)).toBe(true);
    });

    test('#05 => nested file does not exist', () => {
      expect(existsSync(nestedPath)).toBe(false);
    });

    test('#06 => nested Tooltip file does not exist', () => {
      expect(existsSync(nestedTooltipPath)).toBe(false);
    });
  });

  describe('#06 => Re-add Tooltip', () => {
    test('#01 => add', () => {
      success = add(code.CODEBASE_ANALYSIS as any, 'nested/Tooltip');
    });

    test('#02 => success is true', () => expect(success).toBe(true));

    test('#03 => index file does not exist', () => {
      expect(existsSync(indexPath)).toBe(false);
    });

    test('#04 => nested Tooltip file exists', () => {
      expect(existsSync(nestedTooltipPath)).toBe(true);
    });
  });
});
