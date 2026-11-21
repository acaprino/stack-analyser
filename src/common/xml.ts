import { SaxesParser } from 'saxes';

type Frame = { name: string; fields: Record<string, unknown>; text: string };

export function parseProjectXml(content: string): Record<string, unknown> | null {
  const root: Record<string, unknown> = Object.create(null);
  const stack: Frame[] = [];
  const parser = new SaxesParser({ xmlns: true });
  parser.on('doctype', () => { throw new Error('DTD in build manifest'); });
  parser.on('opentag', (tag) => {
    const fields: Record<string, unknown> = Object.create(null);
    for (const attr of Object.values(tag.attributes)) {
      fields[`@_${attr.local}`] = attr.value;
    }
    stack.push({ name: tag.local, fields, text: '' });
  });
  function text(value: string) {
    const frame = stack.at(-1);
    if (frame) frame.text += value;
  }
  parser.on('text', text);
  parser.on('cdata', text);
  parser.on('closetag', () => {
    const { name, fields, text: raw } = stack.pop()!;
    const parent = stack.at(-1)?.fields ?? root;
    const value = Object.keys(fields).length ? fields : raw.trim();
    if (typeof value !== 'string' && raw.trim()) value['#text'] = raw.trim();
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
