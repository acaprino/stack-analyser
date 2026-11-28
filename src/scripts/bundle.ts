import { build } from 'esbuild';

// One file with the CLI, every rule and every dependency: Node reads it once instead of resolving and parsing
// more than a thousand small modules, which is what makes a cold start take seconds.
await build({
  entryPoints: ['src/cli.ts'],
  outfile: 'dist/cli.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  // Dependencies written as CommonJS call `require`, which an ES module does not have.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
  // It loads a WebAssembly file by a path relative to its own module, so it has to stay a package in node_modules.
  external: ['@cdktf/hcl2json'],
});
