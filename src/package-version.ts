import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, 'package.json'), 'utf8'));

if (typeof version !== 'string' || version.length === 0) {
  throw new Error('Unable to resolve clawpowers-agent package version');
}

export const PACKAGE_VERSION = version;
