import {
  DEFAULT_CLI_NAME,
  DEFAULT_CODEBASE_FILE,
  DEFAULT_JSON_FILE_NAME,
  DEFAULT_PATH_KEY,
} from './constants';

export const config: {
  bin: string;
  json: string;
  tsConfigPath: string;
  root?: string;
  codebase: string;
} = {
  bin: DEFAULT_CLI_NAME,
  json: DEFAULT_JSON_FILE_NAME,
  tsConfigPath: DEFAULT_PATH_KEY,
  codebase: DEFAULT_CODEBASE_FILE,
};
