import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, it } from 'vitest';

it('writes a stack for a Maven project using the normal CLI', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'stack-analyser-cli-'));
  try {
    await fs.writeFile(path.join(cwd, 'pom.xml'), `<project><modelVersion>4.0.0</modelVersion>
      <groupId>sample</groupId><artifactId>app</artifactId><version>1</version>
      <dependencies><dependency><groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>`);
    const file = path.join(import.meta.dirname, 'cli.ts');
    const { stdout } = await promisify(execFile)(process.execPath, [
      '--import', import.meta.resolve('tsx'), file, '.', '--flat',
    ], { cwd, env: { ...process.env, LOG_LEVEL: 'info' } });
    expect(stdout).toContain('Output');
    const output = JSON.parse(await fs.readFile(path.join(cwd, 'output.json'), 'utf8'));
    expect(output.techs).toContain('spring-boot');
    expect(output.dependencies).toContainEqual(['maven', 'org.springframework.boot:spring-boot-starter-web', '']);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
}, 20_000);
