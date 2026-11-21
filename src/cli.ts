#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';
import figureSet from 'figures';
import kleur from 'kleur';
import ora from 'ora';

import { analyser, parseDeclarations } from './analyser/index.js';
import { l } from './common/log.js';
import { flatten } from './payload/helpers.js';
import { FSProvider } from './provider/fs.js';

import type { Declaration } from './types/index.js';

import './autoload.js';

const program = new Command();

/** Splits a comma-separated option value. Entries are trimmed and empty ones dropped, so `""` is an empty list. */
function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
// eslint-disable-next-line unicorn/no-await-expression-member
const pkg = JSON.parse((await fs.readFile(path.join(dirname, './../package.json'))).toString()) as {
  version: string;
};

program
  .name('stack-analyser')
  .description('CLI to extract metadata from repository')
  .argument('<path>', 'repository to analyze')
  .option('-o, --output <FILENAME>', 'output json to a file', 'output.json')
  .option('--flat', 'flatten the output', false)
  .option('--declarations <FILE>', 'JSON file with an array of declarations that other tools already read')
  .option('--skip-dirs <NAMES>', 'comma-separated folder names to skip at any depth, instead of the default list ("" skips none)')
  .option('--ignore <PATHS>', 'comma-separated paths, relative to the root, to leave out with everything below them')
  .version(pkg.version)
  .action(async (arg: string, options: { output?: string; flat: boolean; declarations?: string; skipDirs?: string; ignore?: string }) => {
    const pathAtExecution = process.cwd();
    // Resolved once, so that a trailing separator or a `..` does not change what the provider and the output call the root.
    const root = path.resolve(pathAtExecution, arg);

    l.debug('Version', pkg.version);

    try {
      const stat = await fs.stat(root);
      if (!stat.isDirectory()) {
        l.log(kleur.bold().red(figureSet.cross), `Path "${root}" is not a folder`);
        process.exit(1);
      }
    } catch {
      l.log(kleur.bold().red(figureSet.cross), `Path "${root}" does not exist`);
      process.exit(1);
    }

    l.log(kleur.bold().magenta(figureSet.triangleRight), 'Path', kleur.cyan(root));

    // Everything below is checked before anything is analysed, so a bad option never leaves an output behind.
    const skipDirs = options.skipDirs === undefined ? undefined : parseList(options.skipDirs);
    const ignorePaths = options.ignore === undefined ? [] : parseList(options.ignore);

    const notAName = skipDirs?.find((entry) => /[\\/]/.test(entry));
    if (notAName !== undefined) {
      l.log(kleur.bold().red(figureSet.cross), `--skip-dirs takes folder names, not paths: "${notAName}" (to leave out one path, use --ignore)`);
      process.exit(1);
    }
    const outside = ignorePaths.find((entry) => /^[A-Za-z]:[\\/]/.test(entry) || entry.split(/[\\/]/).includes('..'));
    if (outside !== undefined) {
      l.log(kleur.bold().red(figureSet.cross), `--ignore takes paths inside the project, relative to its root: "${outside}" is not one`);
      process.exit(1);
    }

    let declarations: Declaration[] | undefined;
    if (options.declarations !== undefined) {
      const declarationsFile = path.resolve(pathAtExecution, options.declarations);
      try {
        // A byte order mark, which some editors put first, is not part of the JSON.
        const text = (await fs.readFile(declarationsFile, 'utf8')).replace(/^\uFEFF/, '');
        declarations = parseDeclarations(JSON.parse(text));
      } catch (err) {
        l.log(kleur.bold().red(figureSet.cross), `Declarations "${declarationsFile}":`, (err as Error).message);
        process.exit(1);
      }
    }

    const spinner = ora(`Analysing`).start();

    const provider = new FSProvider({ path: root, ignorePaths, skipDirs });
    const res = await analyser({ provider, declarations });
    spinner.succeed('Analysed');

    if (options.output) {
      const output = options.flat ? flatten(res, { merge: true }) : res;
      const file = path.resolve(pathAtExecution, options.output);
      // The base the provider writes its paths with, which is what has to come off them.
      await fs.writeFile(file, JSON.stringify(output.toJson(provider.basePath), undefined, 2));
      l.log('');
      l.log('Output', kleur.green(file));
    }
  });

program.parse(process.argv);
