// Produce a blind adjudication sheet from repo×tech predictions. No expected labels or
// detection reasons enter the selection. Run with REPORT.json CANDIDATE_PACKAGE.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [reportPath, candidate] = process.argv.slice(2);
if (!reportPath || !candidate) throw new Error('Expected REPORT.json CANDIDATE_PACKAGE');
const report = JSON.parse(await readFile(reportPath, 'utf8'));
const { listTech } = await import(pathToFileURL(resolve(candidate, 'dist/common/techs.generated.js')));
const catalog = new Map(listTech.map(({ key, type }) => [key, type]));
const strata = {
  framework: ['framework', 'ui', 'ui_framework', 'orm', 'validation', 'ssg', 'cms'],
  development: ['test', 'linter', 'tool'],
  delivery: ['builder', 'ci', 'iac', 'automation'],
  service: ['ai', 'analytics', 'auth', 'cloud', 'collaboration', 'communication', 'crm', 'db', 'etl', 'hosting',
    'maps', 'messaging', 'monitoring', 'network', 'notification', 'payment', 'queue', 'saas', 'security', 'storage'],
  environment: ['language', 'runtime', 'package_manager'],
  other: [],
};
const seed = 'specfy-github-review-predictions-v1';
const hash = (...parts) => createHash('sha256').update([seed, ...parts].join('\0')).digest('hex');
const groups = new Map(Object.keys(strata).map((key) => [key, new Map()]));
for (const row of report.projects) {
  if (row.candidate?.status !== 'ok' || row.baseline?.status !== 'ok') continue;
  for (const id of new Set(row.candidate.techs)) {
    const type = catalog.get(id);
    if (!type) throw new Error(`Candidate catalog does not contain ${id}`);
    const stratum = Object.keys(strata).find((s) => strata[s].includes(type)) ?? 'other';
    const languages = groups.get(stratum);
    if (!languages.has(row.language)) languages.set(row.language, []);
    languages.get(row.language).push({ repo: row.repo, commit: row.commit, language: row.language, id, type, stratum });
  }
}
const queues = [...groups].map(([stratum, languages]) => {
  const ordered = [...languages].sort(([a], [b]) => hash(stratum, a).localeCompare(hash(stratum, b)));
  for (const [, rows] of ordered) rows.sort((a, b) => hash(a.repo, a.id).localeCompare(hash(b.repo, b.id)));
  const queue = [];
  while (ordered.some(([, rows]) => rows.length)) {
    for (const [, rows] of ordered) if (rows.length) queue.push(rows.shift());
  }
  return queue;
});
const selected = [];
while (selected.length < 60 && queues.some((rows) => rows.length)) {
  for (const queue of queues) if (queue.length && selected.length < 60) selected.push(queue.shift());
}
console.log(JSON.stringify(selected, null, 2));
