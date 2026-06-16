import {
  DEFAULT_CLI_NAME,
  DEFAULT_JSON_FILE_NAME,
  DEFAULT_PATH_KEY,
} from './constants';

export const config: {
  bin: string;
  json: string;
  tsConfigPath: string;
  root?: string;
} = {
  bin: DEFAULT_CLI_NAME,
  json: DEFAULT_JSON_FILE_NAME,
  tsConfigPath: DEFAULT_PATH_KEY,
};
