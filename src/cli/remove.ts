import { command, restPositionals, string } from 'cmd-ts';
import { remove as _remove } from '../functions/remove';

export const remove = command({
  name: 'remove',

  args: {
    files: restPositionals({
      description: 'The files to generate, relative to @bemedev/core/src',
      displayName: 'Files',
      type: string,
    }),
  },
  handler: async ({ files }) => _remove(...files),
});
