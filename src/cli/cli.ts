import { command, option, restPositionals, string } from 'cmd-ts';
import { CODEBASE_FILE } from '../constants';
import { generate as handler } from '../functions/generate';

export const cli = command({
  name: 'generate',

  args: {
    output: option({
      long: 'output',
      short: 'o',
      type: string,
      description: 'Output file path',
      defaultValue: () => CODEBASE_FILE,
    }),
    excludes: restPositionals({
      description: 'The files to exclude, relative to process.cwd()',
      displayName: 'Excludes',
      type: string,
    }),
  },
  handler,
});
