import { SaxesParser } from 'saxes';

const orderedChildren = Symbol('ordered XML elements');
type NamedElement = readonly [string, unknown];
type Element = { [orderedChildren]?: NamedElement[] } & Record<string, unknown>;

export function xmlChildren(element: Element): readonly NamedElement[] {
  return element[orderedChildren] ?? [];
}

interface Frame {
  name: string;
  fields: Record<string, unknown>;
  text: string;
  ignored: boolean;
}

/** A dictionary with no prototype, so that a key such as `constructor` is only ever what the file says. */
function emptyRecord(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>;
}

export function parseProjectXml(
  content: string,
  {
    namespaces = [],
    preserveOrder = false,
  }: { namespaces?: readonly string[]; preserveOrder?: boolean } = {}
): null | Record<string, unknown> {
  const root = emptyRecord();
  const stack: Frame[] = [];
  const parser = new SaxesParser({ xmlns: true });
  let namespace = '';
  parser.on('doctype', () => {
    throw new Error('DTD in build manifest');
  });
  parser.on('opentag', (tag) => {
    if (stack.length >= 256) throw new Error('Build manifest nesting limit');
    if (stack.length === 0) {
      namespace = tag.uri;
      if (namespace && !namespaces.includes(namespace))
        throw new Error('Unrecognized project namespace');
    }
    const ignored = tag.uri !== namespace || stack.at(-1)?.ignored === true;
    const fields = emptyRecord();
    for (const attr of Object.values(tag.attributes)) {
      if (!attr.uri) fields[`@_${attr.local}`] = attr.value;
    }
    stack.push({ name: tag.local, fields, text: '', ignored });
  });
  function text(value: string): void {
    const frame = stack.at(-1);
    if (frame && !frame.ignored) frame.text += value;
  }
  parser.on('text', text);
  parser.on('cdata', text);
  parser.on('closetag', () => {
    const frame = stack.pop();
    // saxes reports a closing tag only after its opening one, so the stack is never empty here.
    if (frame === undefined) return;
    const { name, fields, text: raw, ignored } = frame;
    if (ignored) return;
    const parent: Element = stack.at(-1)?.fields ?? root;
    const value = Object.keys(fields).length > 0 ? fields : raw.trim();
    if (typeof value !== 'string' && raw.trim()) value['#text'] = raw.trim();
    if (preserveOrder) (parent[orderedChildren] ??= []).push([name, value]);
    const previous = parent[name];
    if (previous === undefined) parent[name] = value;
    else if (Array.isArray(previous)) previous.push(value);
    else parent[name] = [previous, value];
  });
  try {
    parser.write(content).close();
    return root;
  } catch {
    return null;
  }
}
