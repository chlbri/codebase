import { subcommands } from 'cmd-ts';
import { add } from './add';
import { BIN } from './constants';
import { generate } from './generate';
import { init } from './init';
import { remove } from './remove';

export const cli = subcommands({
  name: BIN,
  description: 'The CLI for to generate codebase, from @bemedev',
  cmds: {
    add,
    init,
    remove,
    generate,
  },
  version: '0.0.1',
});
