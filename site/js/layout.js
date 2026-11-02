// Page geometry for the paged reader (pure, unit-tested).
// Wide landscape screens get a two-page spread; measures under 14em are set ragged (start-aligned),
// because justifying ~4 words per line leaves wide word gaps.
export function pageGeometry({ W, H, size, spreadPref = true }) {
  const spread = spreadPref && W >= 1000 && W >= H * 1.2;
  const half = spread ? W / 2 : W;
  const P = Math.round(Math.min(half - (spread ? 72 : W < 480 ? 36 : 56), size * (spread ? 26 : 30)));
  return { spread, P, gap: half - P, ragged: P / size < 14 };
}
