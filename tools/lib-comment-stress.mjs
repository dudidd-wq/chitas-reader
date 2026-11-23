/** Split compact {"say":...} files so v/vd/partial/nps1 suffix bytes stay identical. */
export function endOfJsonValue(s, i) {
  const n = s.length;
  const skipWs = () => { while (i < n && (s[i] === ' ' || s[i] === '\t' || s[i] === '\n' || s[i] === '\r')) i++; };
  const parse = () => {
    skipWs();
    if (i >= n) throw new Error('truncated JSON value');
    const c = s[i];
    if (c === '"') {
      i++;
      while (i < n) {
        if (s[i] === '\\') { i += 2; continue; }
        if (s[i] === '"') { i++; return; }
        i++;
      }
      throw new Error('unterminated string');
    }
    if (c === '[') {
      i++; skipWs();
      if (s[i] === ']') { i++; return; }
      for (;;) {
        parse(); skipWs();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === ']') { i++; return; }
        throw new Error('bad array');
      }
    }
    if (c === '{') {
      i++; skipWs();
      if (s[i] === '}') { i++; return; }
      for (;;) {
        if (s[i] !== '"') throw new Error('bad object key');
        parse(); skipWs();
        if (s[i] !== ':') throw new Error('missing colon');
        i++; parse(); skipWs();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === '}') { i++; return; }
        throw new Error('bad object');
      }
    }
    const start = i;
    while (i < n && /[0-9eE+\-a-z.]/.test(s[i])) i++;
    if (i === start) throw new Error('bad literal at ' + i);
  };
  parse();
  return i;
}

export function splitSayFile(raw) {
  if (!raw.startsWith('{"say":')) throw new Error('file must start with {"say":');
  const end = endOfJsonValue(raw, '{"say":'.length);
  const suffix = raw.slice(end);
  if (suffix !== '}' && !/^,\s*"(v|vd)":/.test(suffix)) {
    throw new Error('unexpected suffix ' + JSON.stringify(suffix.slice(0, 40)));
  }
  return { suffix };
}

export function writeSayFile(raw, newSay) {
  const { suffix } = splitSayFile(raw);
  return '{"say":' + JSON.stringify(newSay) + suffix;
}

export function mapSay(node, fn, path = []) {
  if (typeof node === 'string') return fn(node, path);
  if (Array.isArray(node)) return node.map((x, i) => mapSay(x, fn, path.concat(i)));
  if (node == null) return node;
  throw new Error('unexpected say node ' + typeof node);
}

export const NON_IDENTITY_PINS = [
  'site/data/nachv/I_Samuel/15.json',
  'site/data/nachv/I_Samuel/20.json',
  'site/data/nachv/I_Samuel/6.json',
  'site/data/nachv/Isaiah/22.json',
  'site/data/nachv/Isaiah/27.json',
  'site/data/nachv/Isaiah/61.json',
  'site/data/nachv/Joshua/15.json',
  'site/data/nachv/Joshua/16.json',
  'site/data/nachv/Joshua/17.json',
  'site/data/nachv/Judges/14.json',
  'site/data/nachv/Judges/20.json',
  'site/data/nachv/Judges/8.json',
];

export function mapOleOffset(oldText, newText, pos) {
  const HATAMA = '֫';
  let oi = 0, ni = 0;
  while (oi < pos) {
    if (ni < newText.length && newText[ni] === HATAMA && (oi >= oldText.length || oldText[oi] !== HATAMA)) {
      ni++;
      continue;
    }
    if (oi < oldText.length && oldText[oi] === HATAMA && (ni >= newText.length || newText[ni] !== HATAMA)) {
      throw new Error('ole removed at ' + oi);
    }
    if (oi >= oldText.length || ni >= newText.length || oldText[oi] !== newText[ni]) {
      throw new Error('align mismatch at old=' + oi + ' new=' + ni);
    }
    oi++;
    ni++;
  }
  return ni;
}
