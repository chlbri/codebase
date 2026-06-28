import { Project } from 'ts-morph';
import { describe, expect, test } from 'vitest';
import { analyzeExports } from './exports';

describe('analyzeExports', () => {
  const project = new Project({
    compilerOptions: {
      baseUrl: '.',
      paths: {
        '#/*': ['./src/*'],
      },
    },
  });

  test('resolves tsconfig paths and parses export aliases correctly', () => {
    const sourceFile = project.createSourceFile(
      'src/dummy-export.ts',
      `
      export * from '#/functions/add.ts';
      export * as ns from '#/functions/add.tsx';
      export { a } from '#/functions/add.ts';
      export { b as c } from '#/functions/add.tsx';
      export { d } from './local-file.ts';
      const localVal = 123;
      export { localVal };
      export default localVal;
      `,
      { overwrite: true },
    );

    const exports = analyzeExports(sourceFile);

    expect(exports).toEqual(
      expect.arrayContaining([
        {
          name: '*',
          kind: 'namespace',
          text: "export * from '#/functions/add.ts';",
          moduleSpecifier: './functions/add',
        },
        {
          name: 'ns',
          kind: 'namespace',
          text: "export * as ns from '#/functions/add.tsx';",
          moduleSpecifier: './functions/add',
        },
        {
          name: 'a',
          kind: 'named',
          text: "export { a } from '#/functions/add.ts';",
          moduleSpecifier: './functions/add',
        },
        {
          name: 'c',
          kind: 'named',
          text: "export { b as c } from '#/functions/add.tsx';",
          moduleSpecifier: './functions/add',
        },
        {
          name: 'd',
          kind: 'named',
          text: "export { d } from './local-file.ts';",
          moduleSpecifier: './local-file',
        },
        {
          name: 'localVal',
          kind: 'named',
          text: 'export { localVal };',
          moduleSpecifier: undefined,
        },
      ]),
    );
  });
});
