import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * The file URL of the tsx loader, to pass to `node --import` when a test runs the CLI from source.
 * `import.meta.resolve` is not available in vitest 3, so it is resolved through `require`.
 */
export const tsxImport = pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href;
