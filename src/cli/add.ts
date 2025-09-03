import { command, restPositionals, string } from 'cmd-ts';
import { add as _add } from '../functions/add';

export const add = command({
  name: 'add',
  args: {
    files: restPositionals({
      description: 'The files to generate, relative to @bemedev/core/src',
      displayName: 'Files',
      type: string,
    }),
  },
  handler: ({ files }) => _add(...files),
});
