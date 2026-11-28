import { Payload } from '../../../payload/index.js';

import type { BaseProvider, ProviderFile } from '../../../provider/base.js';

// A page, or a server template that writes one, loads a package from a CDN with a <script src> or a <link href>.
const pageFile =
  /\.(?:html?|xhtml|cshtml|razor|jsp|erb|ejs|hbs|handlebars|mustache|njk|twig|jinja2?|j2|liquid|gohtml|tmpl)$|\.blade\.php$/i;
const maxFileSize = 500_000;
const cdnHost =
  /(?:cdn|fastly)\.jsdelivr\.net|unpkg\.com|code\.jquery\.com|ajax\.googleapis\.com|code\.ionicframework\.com/i;

// npm names are lower case; a scope starts with `@`.
const npmName = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/;

/**
 * The libraries of Google Hosted Libraries (https://developers.google.com/speed/libraries) by their npm name. AngularJS
 * gives `ajax.googleapis.com/ajax/libs/angularjs/<version>/` in its own download guide.
 */
const googleLibraries = new Map([
  ['angularjs', 'angular'],
  ['bootstrap', 'bootstrap'],
  ['d3js', 'd3'],
  ['jquery', 'jquery'],
  ['jqueryui', 'jquery-ui'],
  ['threejs', 'three'],
]);

/** `name@version` or `@scope/name@version` at the start of `segments`, the version optional. */
function named(segments: string[]): { name: string; version: string } | undefined {
  const scoped = segments[0]?.startsWith('@');
  const spec = scoped ? `${segments[0]}/${segments[1] ?? ''}` : (segments[0] ?? '');
  const at = spec.indexOf('@', scoped ? 1 : 0);
  const name = at === -1 ? spec : spec.slice(0, at);
  return npmName.test(name) ? { name, version: at === -1 ? '' : spec.slice(at + 1) } : undefined;
}

/**
 * The npm package and version that a CDN address serves, when its scheme names one: jsDelivr
 * (`/npm/package@version/file`), unpkg (`/package@version/file`), and the CDN a project gives for its own files
 * (jQuery at code.jquery.com, Ionicons 2 at code.ionicframework.com, Google Hosted Libraries).
 */
export function cdnPackage(address: string): { name: string; version: string } | undefined {
  let url: URL;
  try {
    url = new URL(address.startsWith('//') ? `https:${address}` : address);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  if (host === 'cdn.jsdelivr.net' || host === 'fastly.jsdelivr.net') {
    return parts[0] === 'npm' ? named(parts.slice(1)) : undefined;
  }
  if (host === 'unpkg.com') return named(parts);
  if (host === 'code.jquery.com') {
    const file = /^jquery-(\d+\.\d+(?:\.\d+)?)(?:\.slim)?(?:\.min)?\.js$/.exec(parts[0] ?? '');
    if (file && parts.length === 1) return { name: 'jquery', version: file[1] };
    return parts[0] === 'ui' && parts.length > 2
      ? { name: 'jquery-ui', version: parts[1] }
      : undefined;
  }
  if (host === 'code.ionicframework.com') {
    return parts[0] === 'ionicons' && parts.length > 2
      ? { name: 'ionicons', version: parts[1] }
      : undefined;
  }
  if (host === 'ajax.googleapis.com' && parts[0] === 'ajax' && parts[1] === 'libs') {
    const name = googleLibraries.get(parts[2] ?? '');
    return name && parts.length > 4 ? { name, version: parts[3] } : undefined;
  }
  return undefined;
}

const scriptSource = /(?:^|\s)src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;
const linkTarget = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;

/** Each address a <script src> or a <link href> of `content` loads, with its line. A comment loads nothing. */
export function pageReferences(content: string): { address: string; line: number }[] {
  // Blank the comments, keeping their line breaks so that the lines stay true.
  const text = content.replaceAll(/<!--[\s\S]*?(?:-->|$)/g, (comment) =>
    comment.replaceAll(/[^\n]/g, ' ')
  );
  const found: { address: string; line: number }[] = [];
  let line = 1;
  let cursor = 0;
  for (const tag of text.matchAll(/<(script|link)\b([^>]*)>/gi)) {
    const value = (tag[1].toLowerCase() === 'script' ? scriptSource : linkTarget).exec(tag[2]);
    if (!value) continue;
    // The tags come in order: count the line breaks since the previous one.
    const offset = tag.index + tag[0].indexOf(value[0]);
    for (; cursor < offset; cursor++) if (text[cursor] === '\n') line++;
    // Only the group of the quoting that matched is set.
    const [, double, single, bare] = value as (string | undefined)[];
    found.push({ address: (double ?? single ?? bare ?? '').trim(), line });
  }
  return found;
}

/** The npm packages that the pages of a folder load from a CDN, as evidence of the technologies they are. */
export async function detectPageReferences(
  files: ProviderFile[],
  provider: BaseProvider
): Promise<false | Payload> {
  let payload: Payload | undefined;
  for (const file of files) {
    if (file.type !== 'file' || !pageFile.test(file.name)) continue;
    const content = await provider.open(file.fp, maxFileSize);
    if (!content || content.includes('\0') || !cdnHost.test(content)) continue;
    for (const { address, line } of pageReferences(content)) {
      const served = cdnPackage(address);
      if (!served) continue;
      payload ??= new Payload({ name: 'virtual', folderPath: file.fp });
      payload.path.add(file.fp);
      payload.addDependencyTechs([served.name], { type: 'npm', file: file.fp, line });
    }
  }
  return payload && payload.techs.size > 0 ? payload : false;
}
