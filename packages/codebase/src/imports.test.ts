import { createTests } from '@bemedev/dev-utils/vitest-extended';
import { Project } from 'ts-morph';
import { describe } from 'vitest';
import { analyzeImports } from './imports';

describe('resolveModuleSpecifier inside paths', () => {
  const { acceptation, success } = createTests(analyzeImports);
  describe('#00 => acceptation', acceptation);
  const project = new Project({
    compilerOptions: {
      baseUrl: '.',
      paths: {
        '#/*': ['./src/*'],
      },
    },
  });

  // Create a virtual file to analyze its imports
  const sourceFile1 = project.createSourceFile(
    'src/dummy.ts',
    `
    import { a } from '#/functions/add.ts';
    import { b } from '#/functions/add.tsx';
    import { c } from './local-file.ts';
    `,
  );

  describe(
    '#01 => success',
    success({
      invite: 'Case 1',
      parameters: sourceFile1,
      expected: [
        {
          moduleSpecifier: './functions/add',
          kind: 'named',
          namedImports: ['a'],
          isTypeOnly: false,
        },
        {
          moduleSpecifier: './functions/add',
          kind: 'named',
          namedImports: ['b'],
          isTypeOnly: false,
        },
        {
          moduleSpecifier: './local-file',
          kind: 'named',
          namedImports: ['c'],
          isTypeOnly: false,
        },
      ],
    }),
  );
});
