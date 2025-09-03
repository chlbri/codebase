import { command, restPositionals, string } from 'cmd-ts';
import { removeFiles } from '../functions/remove';

export const remove = command({
  name: 'remove',

  args: {
    files: restPositionals({
      description: 'The files to generate, relative to @bemedev/core/src',
      displayName: 'Files',
      type: string,
    }),
  },
  handler: async ({ files }) => {
    const isEmpty = files.length === 0;
    if (isEmpty) return console.warn('No files specified for removal.');
    return removeFiles(...files);
  },
});
