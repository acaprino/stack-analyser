import { tokens } from '../manifestTokens.js';

import type { Dependency } from '../../../types/index.js';

const name = /^[\w.-]+$/;

/**
 * The literal module IDs of an sbt build definition (`.sbt`): `"group" % "artifact" % "version"`, with `%%` or `%%%` for
 * a Scala artifact, whatever follows (`% Test`). sbt's ModuleID needs the three parts; a version that is not a literal
 * stays empty. The file is Scala and is never run, so a computed ID is not read. Scala's own parser (scalameta) runs on
 * the JVM, not in this package: the tokens are read as the Gradle and Swift manifests are.
 */
export function sbtDependencies(source: string): Dependency[] {
  const items = tokens(source, 'scala');
  const result: Dependency[] = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind !== 'string') continue;
    let j = i + 1;
    while (j < items.length && items[j].kind === 'symbol' && items[j].value === '%') j++;
    const operators = j - i - 1;
    const artifact = items[j];
    if (operators < 1 || operators > 3 || artifact?.kind !== 'string') continue;
    if (items[j + 1]?.value !== '%' || items[j + 2]?.value === '%' || !items[j + 2]) continue;
    const group = items[i].value;
    if (!name.test(group) || !name.test(artifact.value)) continue;
    result.push(['maven', `${group}:${artifact.value}`, items[j + 2].kind === 'string' ? items[j + 2].value : '']);
    i = j + 2;
  }
  return result;
}
