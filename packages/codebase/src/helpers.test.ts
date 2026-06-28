import { Project } from 'ts-morph';
import { describe, expect, test } from 'vitest';
import { hasNoDeclarations } from './helpers';

describe('hasNoDeclarations', () => {
  const project = new Project();

  describe('#01 => returning true', () => {
    test('#01 => with empty file returns true', () => {
      const file = project.createSourceFile('src/empty.ts', '', {
        overwrite: true,
      });
      expect(hasNoDeclarations(file)).toBe(true);
    });

    test('#02 => with only imports/exports returns true', () => {
      const file = project.createSourceFile(
        'src/imports-exports.ts',
        `
        import { a } from './a';
        export * from './b';
        export { a };
        `,
        { overwrite: true },
      );
      expect(hasNoDeclarations(file)).toBe(true);
    });
  });

  describe('#02 => returning false', () => {
    test('#01 => with class declaration returns false', () => {
      const file = project.createSourceFile(
        'src/class.ts',
        'class A {}',
        { overwrite: true },
      );
      expect(hasNoDeclarations(file)).toBe(false);
    });

    test('#02 => with function declaration returns false', () => {
      const file = project.createSourceFile(
        'src/function.ts',
        'function a() {}',
        { overwrite: true },
      );
      expect(hasNoDeclarations(file)).toBe(false);
    });

    test('#03 => with variable declaration returns false', () => {
      const file = project.createSourceFile(
        'src/variable.ts',
        'const a = 1;',
        { overwrite: true },
      );
      expect(hasNoDeclarations(file)).toBe(false);
    });

    test('#04 => with type alias declaration returns false', () => {
      const file = project.createSourceFile(
        'src/type.ts',
        'type A = string;',
        { overwrite: true },
      );
      expect(hasNoDeclarations(file)).toBe(false);
    });

    test('#05 => with interface declaration returns false', () => {
      const file = project.createSourceFile(
        'src/interface.ts',
        'interface A {}',
        { overwrite: true },
      );
      expect(hasNoDeclarations(file)).toBe(false);
    });

    test('#06 => with enum declaration returns false', () => {
      const file = project.createSourceFile(
        'src/enum.ts',
        'enum A {}',
        { overwrite: true },
      );
      expect(hasNoDeclarations(file)).toBe(false);
    });

    test('#07 => with module declaration returns false', () => {
      const file = project.createSourceFile(
        'src/module.ts',
        'namespace A {}',
        { overwrite: true },
      );
      expect(hasNoDeclarations(file)).toBe(false);
    });
  });
});
