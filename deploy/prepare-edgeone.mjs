import { readFile, writeFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);
const { headers } = JSON.parse(
  await readFile(new URL('edgeone.json', projectRoot), 'utf8'),
);

// Direct uploads accept runtime settings only; omit build/install commands.
await writeFile(
  new URL('dist/edgeone.json', projectRoot),
  `${JSON.stringify({ headers }, null, 2)}\n`,
);
