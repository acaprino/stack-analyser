// Proves that the packed tarball runs from an empty folder with plain node and no npm install.
//
//   node benchmarks/verify-package.mjs
//
// Runs `npm pack` here, unpacks the .tgz into a temporary folder outside the repository, and runs
// `node package/dist/cli.mjs <repo>/tests/__fixtures__ --output out.json` from there with NODE_PATH empty.
// Exits with 1 when the command fails, when no component has a technology proved by `terraform` evidence
// (the WebAssembly file of @cdktf/hcl2json did not load), or when none has `package` evidence.
// Prints the absolute path of the .tgz and its sha256. The .tgz stays where it is, so that it can be
// uploaded; the unpacked folder is removed. A failed run removes the .tgz as well.
import { exec, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
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
  try {
    await run(process.execPath, [cli, fixtures, '--output', 'out.json'], {
      cwd: unpacked,
      env: { ...process.env, NODE_PATH: '' },
      maxBuffer: MAX_BUFFER,
      timeout: 5 * 60 * 1000,
    });
  } catch (err) {
    throw new Error(`node ${cli} failed with ${err.code ?? err.signal}:\n${String(err.stderr || err.stdout || err.message).trim()}`);
  }

  const kinds = new Set();
  const output = JSON.parse(await readFile(join(unpacked, 'out.json'), 'utf8'));
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
