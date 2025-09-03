import { command, option, string } from 'cmd-ts';
import { JSON_FILE_NAME } from '../constants';
import { init as handler } from '../functions/init';

export const init = command({
  name: 'initialize',

  args: {
    root: option({
      long: 'path',
      description: 'The path of the main folder',
      short: 'p',
      // displayName: 'Path',
      type: string,
      defaultValue: () => 'src/.bemedev',
    }),
    json: option({
      long: 'json',
      description: 'Whether to use JSON format',
      short: 'j',
      type: string,
      defaultValue: () => JSON_FILE_NAME,
    }),
  },
  handler,
});
