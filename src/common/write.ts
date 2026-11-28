import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Writes `text` to `file` by way of a temporary file in the same folder, so that a reader never finds half of it.
 * A link at `file` is replaced, never followed: the analysed repository may have put it there to point outside.
 */
export async function writeAtomically(file: string, text: string): Promise<void> {
  // A device such as /dev/stdout or a FIFO cannot be replaced by a rename: write into it.
  // `stat` follows links, so a link to a regular file is not one of these and takes the rename below.
  const target = await fs.stat(file).catch(() => null);
  if (target && !target.isFile() && !target.isDirectory()) {
    await fs.writeFile(file, text, 'utf8');
    return;
  }
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${randomBytes(4).toString('hex')}.tmp`
  );
  try {
    await fs.writeFile(temporary, text, { encoding: 'utf8', flag: 'wx' });
    await fs.rename(temporary, file);
  } catch (err) {
    await fs.rm(temporary, { force: true });
    throw err;
  }
}
