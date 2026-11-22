#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';
import figureSet from 'figures';
import kleur from 'kleur';
import ora from 'ora';

import { analyser, parseDeclarations } from './analyser/index.js';
import { catalogue } from './catalogue.js';
import { l } from './common/log.js';
import { flatten } from './payload/helpers.js';
import { FSProvider } from './provider/fs.js';
import { registeredRules } from './register.js';

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

/** The folders to skip and the paths to leave out, as the two options and the perimeter file both give them. */
interface Perimeter {
  skipDirs?: string[];
  ignore: string[];
}

/**
 * What is wrong with the entries of a perimeter, or `undefined`. One check for the options and for the file;
 * `names` says how the caller wrote the two lists, so that the message speaks of what the person typed.
 */
function perimeterProblem(perimeter: Perimeter, names: { skipDirs: string; ignore: string }): string | undefined {
  const notAName = perimeter.skipDirs?.find((entry) => /[\\/]/.test(entry));
  if (notAName !== undefined) {
    return `${names.skipDirs} takes folder names, not paths: "${notAName}" (to leave out one path, use ${names.ignore})`;
  }
  const outside = perimeter.ignore.find((entry) => /^[A-Za-z]:[\\/]/.test(entry) || entry.split(/[\\/]/).includes('..'));
  if (outside !== undefined) {
    return `${names.ignore} takes paths inside the project, relative to its root: "${outside}" is not one`;
  }
  return undefined;
}

/** The perimeter that a parsed JSON value holds. Throws when it is not `{"skipDirs": [names], "ignore": [paths]}`, each key optional. */
function parsePerimeter(value: unknown): Perimeter {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('the perimeter must be an object, {"skipDirs": [names], "ignore": [paths]}');
  }
  const keys = Object.keys(value);
  const unknown = keys.find((key) => key !== 'skipDirs' && key !== 'ignore');
  if (unknown !== undefined) throw new Error(`unknown key "${unknown}" (the keys are "skipDirs" and "ignore")`);
  const { skipDirs, ignore } = value as Record<string, unknown>;
  for (const [key, list] of Object.entries({ skipDirs, ignore })) {
    if (list !== undefined && !(Array.isArray(list) && list.every((entry) => typeof entry === 'string'))) {
      throw new Error(`"${key}" must be an array of strings`);
    }
  }
  return { skipDirs: skipDirs as string[] | undefined, ignore: (ignore as string[] | undefined) ?? [] };
}

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
// eslint-disable-next-line unicorn/no-await-expression-member
const pkg = JSON.parse((await fs.readFile(path.join(dirname, './../package.json'))).toString()) as {
  name: string;
  version: string;
};

/** Writes `text` to `file` by way of a temporary file in the same folder, so that a reader never finds half of it. */
async function writeAtomically(file: string, text: string): Promise<void> {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomBytes(4).toString('hex')}.tmp`);
  try {
    await fs.writeFile(temporary, text, { encoding: 'utf8', flag: 'wx' });
    await fs.rename(temporary, file);
  } catch (err) {
    await fs.rm(temporary, { force: true });
    throw err;
  }
}

/** The options an analysis takes, by the name commander gives them and the way a person types them. */
const analysisOptions = {
  output: '--output',
  flat: '--flat',
  declarations: '--declarations',
  skipDirs: '--skip-dirs',
  ignore: '--ignore',
  perimeter: '--perimeter',
};

program
  .name(pkg.name)
  .description('CLI to extract metadata from repository')
  .argument('[path]', 'repository to analyze, required unless --catalogue is given')
  .option('--catalogue <FILE>', 'write the catalogue of the rules as JSON to a file and analyse nothing; stands alone, with no path and no other option')
  .option('-o, --output <FILENAME>', 'output json to a file', 'output.json')
  .option('--flat', 'flatten the output', false)
  .option('--declarations <FILE>', 'JSON file with an array of declarations that other tools already read')
  .option('--skip-dirs <NAMES>', 'comma-separated folder names to skip at any depth, instead of the default list ("" skips none)')
  .option('--ignore <PATHS>', 'comma-separated paths, relative to the root, to leave out with everything below them')
  .option('--perimeter <FILE>', 'JSON file {"skipDirs": [names], "ignore": [paths]} that gives the two lists; not with --skip-dirs or --ignore')
  .version(pkg.version)
  .action(async (
    arg: string | undefined,
    options: { catalogue?: string; output?: string; flat: boolean; declarations?: string; skipDirs?: string; ignore?: string; perimeter?: string },
    command: Command
  ) => {
    const pathAtExecution = process.cwd();

    l.debug('Version', pkg.version);

    if (options.catalogue !== undefined) {
      // `--output` has a default value, so what counts is whether it was typed, not whether it has a value.
      const given = [
        ...(arg === undefined ? [] : ['the project']),
        ...Object.entries(analysisOptions).filter(([name]) => command.getOptionValueSource(name) === 'cli').map(([, flag]) => flag),
      ];
      if (given.length > 0) {
        l.log(kleur.bold().red(figureSet.cross), `--catalogue stands alone and analyses nothing: it cannot be combined with ${given.join(', ')}`);
        process.exit(1);
      }
      const file = path.resolve(pathAtExecution, options.catalogue);
      const entries = catalogue(registeredRules);
      try {
        await writeAtomically(file, JSON.stringify(entries, undefined, 2));
      } catch (err) {
        l.log(kleur.bold().red(figureSet.cross), `Catalogue "${file}":`, (err as Error).message);
        process.exit(1);
      }
      l.log('Catalogue', kleur.green(file), `(${entries.length} rules)`);
      return;
    }

    if (arg === undefined) command.error("error: missing required argument 'path'", { code: 'commander.missingArgument' });
    // Resolved once, so that a trailing separator or a `..` does not change what the provider and the output call the root.
    const root = path.resolve(pathAtExecution, arg);

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
    if (options.perimeter !== undefined && (options.skipDirs !== undefined || options.ignore !== undefined)) {
      l.log(kleur.bold().red(figureSet.cross), '--perimeter cannot be combined with --skip-dirs or --ignore: give the two lists in the file');
      process.exit(1);
    }

    // The perimeter comes from the two options or from the file, and either way its entries get the same check.
    let perimeter: Perimeter;
    let label = '';
    let names = { skipDirs: '--skip-dirs', ignore: '--ignore' };
    if (options.perimeter === undefined) {
      perimeter = {
        skipDirs: options.skipDirs === undefined ? undefined : parseList(options.skipDirs),
        ignore: options.ignore === undefined ? [] : parseList(options.ignore),
      };
    } else {
      const perimeterFile = path.resolve(pathAtExecution, options.perimeter);
      label = `Perimeter "${perimeterFile}": `;
      names = { skipDirs: '"skipDirs"', ignore: '"ignore"' };
      try {
        // A byte order mark, which some editors put first, is not part of the JSON.
        const text = (await fs.readFile(perimeterFile, 'utf8')).replace(/^\uFEFF/, '');
        perimeter = parsePerimeter(JSON.parse(text));
      } catch (err) {
        l.log(kleur.bold().red(figureSet.cross), label + (err as Error).message);
        process.exit(1);
      }
    }
    const problem = perimeterProblem(perimeter, names);
    if (problem !== undefined) {
      l.log(kleur.bold().red(figureSet.cross), label + problem);
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

    const provider = new FSProvider({ path: root, ignorePaths: perimeter.ignore, skipDirs: perimeter.skipDirs });
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
