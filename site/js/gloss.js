// Light word glosses (single words / very short phrases) from a sourced glossary (data/glossary.json).
// Every entry carries its source URL; nothing is generated at runtime.
import { data } from './texts.js';
import { norm, cons } from './hnorm.js';

let G = null;
export async function loadGlossary() {
  if (G) return G;
  try { G = await data('glossary.json'); } catch { G = { verses: {} }; }
  return G;
}
// Glosses are anchored to a specific verse (see tools/build-glossary.mjs): a word is glossed only inside the verse that
// the Wiktionary sense itself quotes. Only verse text is scanned (not Rashi, headings or verse numbers).
export function glossFor(book, id, word) {
  const m = G?.verses?.[`${book} ${id}`]; if (!m) return null;
  const n = norm(word); return cons(n).length > 1 ? m[n] || null : null;
}
export function glossRef(ref, word) {
  const m = G?.verses?.[ref]; if (!m) return null;
  const n = norm(word); return cons(n).length > 1 ? m[n] || null : null;
}
export function applyGlosses(root, book) {
  if (!G?.verses || !book) return;
  for (const seg of root.querySelectorAll('.seg[data-id]')) {
    const ref = seg.dataset.ref || `${book} ${seg.dataset.id}`;
    if (!G.verses[ref]) continue;
    const t = seg.querySelector('.t') || seg;
    const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement.closest('.vn, .hn, .ketiv, .pe, .endmark, .gl, .lbl, .rashi, .fn') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
    const parts = n.nodeValue.split(/([\s\u05BE]+)/);
    if (!parts.some(p => glossRef(ref, p))) continue;
    const frag = document.createDocumentFragment();
    for (const p of parts) {
      const e = glossRef(ref, p);
      if (e) {
        const s = document.createElement('span');
        s.className = 'gl'; s.textContent = p; s.dataset.g = e.g; s.dataset.src = e.src || ''; s.dataset.lemma = e.l || ''; if (e.adapted) s.dataset.adapted = '1';
        s.tabIndex = 0; s.setAttribute('role', 'button'); s.setAttribute('aria-label', `${p} – ביאור: ${e.g}`);
        frag.appendChild(s);
      } else frag.appendChild(document.createTextNode(p));
    }
    n.parentNode.replaceChild(frag, n);
    }
  }
}

let pop = null;
function closePop() { pop?.remove(); pop = null; }
function showPop(el) {
  closePop();
  if (el.closest('.gloss-off')) return;
  pop = document.createElement('div');
  pop.className = 'gloss-pop'; pop.setAttribute('role', 'tooltip');
  const src = el.dataset.src ? `<small>מקור: <a href="${el.dataset.src}" target="_blank" rel="noopener">ויקימילון${el.dataset.lemma ? ' – ' + el.dataset.lemma : ''}</a> (CC BY-SA)${el.dataset.adapted ? ' · ניסוח מעודן' : ''}</small>` : '';
  pop.innerHTML = `<b></b> ${src}`; pop.querySelector('b').textContent = el.dataset.g;
  document.body.appendChild(pop);
  const r = el.getBoundingClientRect(), pr = pop.getBoundingClientRect();
  let top = r.bottom + 8; if (top + pr.height > innerHeight - 10) top = r.top - pr.height - 8;
  let left = Math.min(Math.max(8, r.left + r.width / 2 - pr.width / 2), innerWidth - pr.width - 8);
  pop.style.top = top + 'px'; pop.style.left = left + 'px';
}
document.addEventListener('click', e => {
  const g = e.target.closest?.('.gl');
  if (g) { e.stopPropagation(); showPop(g); } else if (!e.target.closest?.('.gloss-pop')) closePop();
}, true);
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('gl')) { e.preventDefault(); showPop(e.target); }
  if (e.key === 'Escape') closePop();
});
document.addEventListener('scroll', closePop, true);

// Any word, in any unit (incl. Rashi, Tanya, Rambam): selecting it (long-press / double-click) offers a lookup link to
// he.wiktionary. Nothing is sent anywhere unless the user taps the link (a normal navigation in a new tab).
export function lookupWord(s) {
  const w = String(s).replace(/[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C7]/g, '').replace(/[\u05B0-\u05BC\u05C1\u05C2]/g, '')
    .replace(/[\u05BE]/g, ' ').replace(/[^\u05D0-\u05EA\u05F3\u05F4"'׳״ ]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^["'׳״]+|["'׳״]+$/g, '');
  return w && w.split(' ').length <= 3 && w.length <= 30 ? w : '';
}
let lk = null, lkT = 0;
function closeLookup() { lk?.remove(); lk = null; }
document.addEventListener('selectionchange', () => {
  clearTimeout(lkT);
  lkT = setTimeout(() => {
    const sel = getSelection();
    const node = sel.rangeCount && sel.getRangeAt(0).commonAncestorContainer;
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    const w = !sel.isCollapsed && el?.closest('.r-content') ? lookupWord(sel.toString()) : '';
    if (!w) { closeLookup(); return; }
    closeLookup();
    lk = document.createElement('div'); lk.className = 'gloss-pop lookup-pop';
    lk.innerHTML = `<a target="_blank" rel="noopener"></a><small>קישור חיצוני לוויקימילון (נפתח בלשונית חדשה)</small>`;
    const a = lk.querySelector('a'); a.textContent = `חיפוש ״${w}״ בוויקימילון`;
    a.href = 'https://he.wiktionary.org/w/index.php?search=' + encodeURIComponent(w);
    document.body.appendChild(lk);
    const r = sel.getRangeAt(0).getBoundingClientRect(), pr = lk.getBoundingClientRect();
    let top = r.bottom + 10; if (top + pr.height > innerHeight - 10) top = Math.max(8, r.top - pr.height - 10);
    lk.style.top = top + 'px'; lk.style.left = Math.min(Math.max(8, r.left + r.width / 2 - pr.width / 2), innerWidth - pr.width - 8) + 'px';
  }, 350);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLookup(); });
addEventListener('hashchange', closeLookup);
