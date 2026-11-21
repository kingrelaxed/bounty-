import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const image = fileURLToPath(new URL('./entry.png', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(output, { recursive: true });
copyFileSync(image, join(output, 'entry.png'));
