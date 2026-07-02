import { getFolderPath } from '#helpers';
import { existsSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import edit from 'edit-json-file';
import { PROPERTIES } from '../constants';

/**
 * Removes the codebase JSON configuration file and the generated types folder.
 * @param json - The path to the codebase JSON config file.
 * @param root - The path to the generated types folder.
 */
export const cleanup = (root: string) => {
  const folderPath = getFolderPath(root);
  if (existsSync(folderPath)) {
    rmSync(folderPath, { recursive: true });
  }
};

cleanup.all = (root: string, json: string) => {
  const jsonPath = join(process.cwd(), json);
  if (existsSync(jsonPath)) unlinkSync(jsonPath);
  return cleanup(root);
};

cleanup.files = (json: string) => {
  const file = edit(join(process.cwd(), json));
  file.set(PROPERTIES.FILES, []);
  file.save();
};
