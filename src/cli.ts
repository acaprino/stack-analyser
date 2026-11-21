#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import timer from 'node:timers/promises';
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
  .version(pkg.version)
  .action(async (arg: string, options: { output?: string; flat: boolean; declarations?: string }) => {
    const pathAtExecution = process.cwd();
    const root = path.isAbsolute(arg) ? arg : path.join(pathAtExecution, arg);

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

    // Checked before anything is analysed, so a bad file never leaves an output behind.
    let declarations: Declaration[] | undefined;
    if (options.declarations) {
      const declarationsFile = path.resolve(pathAtExecution, options.declarations);
      try {
        declarations = parseDeclarations(JSON.parse(await fs.readFile(declarationsFile, 'utf8')));
      } catch (err) {
        l.log(kleur.bold().red(figureSet.cross), `Declarations "${declarationsFile}":`, (err as Error).message);
        process.exit(1);
      }
    }

    const spinner = ora(`Analysing`).start();

    await timer.setTimeout(500);
    const res = await analyser({
      provider: new FSProvider({ path: root, ignorePaths: [] }),
      declarations,
    });
    spinner.succeed('Analysed');

    if (options.output) {
      const output = options.flat ? flatten(res, { merge: true }) : res;
      const file = path.join(pathAtExecution, options.output);
      await fs.writeFile(file, JSON.stringify(output.toJson(root), undefined, 2));
      l.log('');
      l.log('Output', kleur.green(file));
    }
  });

program.parse(process.argv);
