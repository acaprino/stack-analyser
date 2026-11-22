// Proves that the packed tarball runs from an empty folder with plain node and no npm install.
//
//   node benchmarks/verify-package.mjs
//
// Runs `npm pack` here, unpacks the .tgz into a temporary folder outside the repository, and runs from there,
// with NODE_PATH empty, `node package/dist/cli.mjs` three times: `--catalogue <file>`, then an analysis of
// <repo>/tests/__fixtures__ with `--perimeter <file>` holding `{"skipDirs": [], "ignore": []}`, then the same
// analysis with `--output out.json`.
// Exits with 1 when a command fails, when the catalogue is not a non-empty JSON array of entries that all have
// `tech`, `name` and `type`, when the perimeter run writes no output, when no component has a technology proved
// by `terraform` evidence (the WebAssembly file of @cdktf/hcl2json did not load), or when none has `package`
// evidence.
// Prints the absolute path of the .tgz, whose name `npm pack` takes from the package name and version, and its
// sha256. The .tgz stays where it is, so that it can be uploaded; the unpacked folder is removed. A failed run
// removes the .tgz as well.
import { exec, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const shell = promisify(exec);
const run = promisify(execFile);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_BUFFER = 64 * 1024 * 1024;

const exists = (target) => access(target).then(() => true, () => false);

// Node finds a package by looking in the node_modules of every folder above the importing file, so a
// node_modules anywhere above the unpacked package would hide a dependency the tarball does not carry.
async function assertNoNodeModulesAbove(folder) {
  for (let dir = folder; ; dir = dirname(dir)) {
    if (await exists(join(dir, 'node_modules'))) {
      throw new Error(`${dir} has a node_modules folder, which Node would find from the unpacked package`);
    }
    if (dirname(dir) === dir) return;
  }
}

async function readJson(file, what) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`${what} wrote no readable JSON file (${file}): ${err.message}`);
  }
}

function* components(payload) {
  yield payload;
  for (const child of payload.childs) yield* components(child);
}

async function main(workdir) {
  const unpacked = join(workdir, 'unpacked');
  await mkdir(unpacked);
  await assertNoNodeModulesAbove(unpacked);

  // `npm pack` runs the prepack and prepare scripts if the package has any, so this is the real package.
  const { stdout } = await shell(`npm pack --json --pack-destination "${workdir}"`, { cwd: repo, maxBuffer: MAX_BUFFER });
  const [packed] = JSON.parse(stdout);
  const tarball = join(workdir, packed.filename);

  // Relative names: a drive letter such as `C:` would be read by GNU tar as a remote host.
  await run('tar', ['-xzf', packed.filename, '-C', 'unpacked'], { cwd: workdir });

  const cli = join('package', 'dist', 'cli.mjs');
  const fixtures = join(repo, 'tests', '__fixtures__');
  // Plain node from the unpacked folder with an empty NODE_PATH, which is how a user runs the package.
  const runCli = async (args) => {
    try {
      await run(process.execPath, [cli, ...args], {
        cwd: unpacked,
        env: { ...process.env, NODE_PATH: '' },
        maxBuffer: MAX_BUFFER,
        timeout: 5 * 60 * 1000,
      });
    } catch (err) {
      throw new Error(`node ${cli} ${args.join(' ')} failed with ${err.code ?? err.signal}:\n${String(err.stderr || err.stdout || err.message).trim()}`);
    }
  };

  await runCli(['--catalogue', 'catalogue.json']);
  const catalogue = await readJson(join(unpacked, 'catalogue.json'), '--catalogue');
  if (!Array.isArray(catalogue) || catalogue.length === 0) {
    throw new Error('--catalogue did not write a non-empty JSON array');
  }
  const incomplete = catalogue.findIndex((entry) => ['tech', 'name', 'type'].some((key) => typeof entry?.[key] !== 'string' || entry[key] === ''));
  if (incomplete !== -1) {
    throw new Error(`--catalogue entry ${incomplete} (${JSON.stringify(catalogue[incomplete])}) has no tech, name or type`);
  }

  // A perimeter that skips nothing and ignores nothing: the file is read and accepted, and the analysis still ends.
  await writeFile(join(unpacked, 'perimeter.json'), JSON.stringify({ skipDirs: [], ignore: [] }));
  await runCli([fixtures, '--perimeter', 'perimeter.json', '--output', 'perimeter-out.json']);
  const perimeterOutput = await readJson(join(unpacked, 'perimeter-out.json'), '--perimeter');
  if (perimeterOutput === null || typeof perimeterOutput !== 'object') {
    throw new Error('--perimeter wrote an output that is not a JSON object');
  }

  await runCli([fixtures, '--output', 'out.json']);
  const kinds = new Set();
  const output = await readJson(join(unpacked, 'out.json'), 'The analysis');
  for (const component of components(output)) {
    for (const item of component.evidence) kinds.add(item.kind);
  }
  const missing = {
    terraform: 'the WebAssembly file of @cdktf/hcl2json did not load, or it did not parse .terraform.lock.hcl',
    package: 'the package.json of the fixtures was not read',
  };
  const problems = Object.entries(missing).filter(([kind]) => !kinds.has(kind));
  if (problems.length > 0) {
    throw new Error(problems.map(([kind, why]) => `No component has ${kind} evidence: ${why}`).join('\n'));
  }

  await rm(unpacked, { recursive: true, force: true });
  const sha256 = createHash('sha256').update(await readFile(tarball)).digest('hex');
  console.log(`package  ${tarball}`);
  console.log(`sha256   ${sha256}`);
  console.log(`size     ${packed.size} bytes, ${packed.entryCount} files`);
}

const workdir = await mkdtemp(join(tmpdir(), 'stack-analyser-package-'));
try {
  await main(workdir);
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  await rm(workdir, { recursive: true, force: true });
  process.exit(1);
}
