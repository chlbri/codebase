import { Project } from 'ts-morph';
import { describe, expect, test } from 'vitest';
import { getOutsideImportsAndExports } from './declarations';

describe('getOutsideImportsAndExports', () => {
  test('#01 => handles StringLiteral named import correctly when inside folder', () => {
    const project = new Project({ useInMemoryFileSystem: true });

    // Module containing the export (inside folder)
    project.createSourceFile(
      'src/folder/local-module.ts',
      `
      export const foo = 1;
    `,
    );

    // Consumer of the export (outside folder)
    project.createSourceFile(
      'src/consumer.ts',
      `
      import { "foo" as bar } from "./folder/local-module";
      console.log(bar);
    `,
    );

    const isInsideFolder = (filePath: string) =>
      filePath.includes('/folder/');

    const { outsideImports } = getOutsideImportsAndExports(
      project,
      isInsideFolder,
    );

    expect(outsideImports.length).toBe(1);
    const defNode = outsideImports[0];
    expect(defNode.getText()).toBe('foo = 1');
  });

  test('#02 => handles StringLiteral named import gracefully when unresolved or external', () => {
    const project = new Project({ useInMemoryFileSystem: true });

    // Consumer of unresolved/external import (outside folder)
    project.createSourceFile(
      'src/consumer.ts',
      `
      import { "foo" as bar } from "./non-existent";
      import { readFileSync } from "fs";
      console.log(bar, readFileSync);
    `,
    );

    const isInsideFolder = (filePath: string) =>
      filePath.includes('/folder/');

    const { outsideImports } = getOutsideImportsAndExports(
      project,
      isInsideFolder,
    );

    expect(outsideImports.length).toBe(0);
  });
});
