// Times a whole CLI run, from spawn to exit, five times on one project.
//
//   node benchmarks/startup.mjs CLI PROJECT [--max-ms N]
//
// Prints the five times and their median in milliseconds. Exits with 1 when the median is above N.
// Every run happens in an empty temporary folder, so the CLI's output file never lands in the repository,
// and a run that fails or writes no output is an error (exit 2), never a fast time.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const RUNS = 5;

function usage(message) {
  console.error(`${message}\nusage: node benchmarks/startup.mjs CLI PROJECT [--max-ms N]`);
  process.exit(2);
}

const args = process.argv.slice(2);
const maxIndex = args.indexOf('--max-ms');
let maxMs;
if (maxIndex !== -1) {
  maxMs = Number(args[maxIndex + 1]);
  if (args[maxIndex + 1] === undefined || !Number.isFinite(maxMs) || maxMs < 0) {
    usage('--max-ms needs a number of milliseconds');
  }
  args.splice(maxIndex, 2);
}
if (args.length !== 2) {
  usage('expected a CLI file and a project folder');
}
const cli = path.resolve(args[0]);
const project = path.resolve(args[1]);

async function once(cwd) {
  const started = performance.now();
  const child = spawn(process.execPath, [cli, project], { cwd, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => (stderr += chunk));
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  const elapsed = performance.now() - started;
  if (code !== 0) {
    throw new Error(`${cli} exited with ${code}\n${stderr}`);
  }
  JSON.parse(await fs.readFile(path.join(cwd, 'output.json'), 'utf8'));
  return elapsed;
}

const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-analyser-startup-'));
const times = [];
try {
  for (let run = 1; run <= RUNS; run++) {
    await fs.rm(path.join(cwd, 'output.json'), { force: true });
    times.push(await once(cwd));
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
} finally {
  await fs.rm(cwd, { recursive: true, force: true });
}

const median = [...times].sort((a, b) => a - b)[Math.floor(RUNS / 2)];
console.log(`${path.relative(process.cwd(), cli) || cli} on ${project}`);
times.forEach((time, index) => console.log(`run ${index + 1}: ${Math.round(time)} ms`));
console.log(`median: ${Math.round(median)} ms`);

if (maxMs !== undefined && median > maxMs) {
  console.log(`over the limit of ${maxMs} ms`);
  process.exit(1);
}
