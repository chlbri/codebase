import { array, command, multioption, option, string } from 'cmd-ts';
import { CODEBASE_FILE } from '../constants';
import { generate as handler } from '../functions/generate';
import { BIN } from './constants';

export const cli = command({
  args: {
    output: option({
      long: 'output',
      short: 'o',
      type: string,
      description: 'Output file path',
      defaultValue: () => CODEBASE_FILE,
    }),

    excludes: multioption({
      description: 'The files to exclude, globs',
      long: 'excludes',
      short: 'x',
      type: array(string),
      defaultValue: () => [],
    }),
  },

  name: BIN,
  handler,
});
