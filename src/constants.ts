import { join } from 'node:path';

export const SRC_DIR = join(process.cwd(), 'src');
export const OUTPUT_FILE = join(SRC_DIR, '.codebase.json');

const _REPLACER = '-|||-';

export const REPLACERS = {
  code: [
    ['\\`', `${_REPLACER}w`],
    ['`', '\\`'],
    ['${', `$${_REPLACER}{`],
    ['\\s', `${_REPLACER}s`],
    ['\\w', `${_REPLACER}w`],
  ],
  init: [
    [new RegExp('\\`', 'g'), '`'],
    [_REPLACER, ''],
  ],
} as const;

export const PATH_KEY = '#bemedev/*';
export const JSON_FILE_NAME = '.bemedev.json';

export const PATH_PROPERTY = 'path';
export const FILES_PROPERTY = 'files';
