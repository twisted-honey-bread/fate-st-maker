/*
 * 그라데이션 색 지점(stops) 도우미 — stops: [[위치 0~1, '#rrggbb'], ...] (순서 무관)
 * 렌더러, 콘솔의 그라데이션 편집기, 색 한 번에 맞추기가 같이 사용
 */
const hexRgb = hex => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = ([r, g, b]) => `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;

export const sortStops = stops => [...stops].sort((a, b) => a[0] - b[0]);

// 위치 p 의 색 (지점 사이는 직선 보간)
export function colorAt(stops, p) {
  const s = sortStops(stops);
  if (!s.length) return '#000000';
  if (p <= s[0][0]) return s[0][1];
  for (let i = 1; i < s.length; i++) {
    if (p <= s[i][0]) {
      const [p0, c0] = s[i - 1];
      const [p1, c1] = s[i];
      const k = p1 > p0 ? (p - p0) / (p1 - p0) : 0;
      const a = hexRgb(c0);
      const b = hexRgb(c1);
      return rgbHex(a.map((v, j) => v + (b[j] - v) * k));
    }
  }
  return s[s.length - 1][1];
}

export function addStops(gradient, stops, alpha = 1, toColor = (c, a) => c) {
  for (const [p, c] of sortStops(stops)) gradient.addColorStop(Math.max(0, Math.min(1, p)), toColor(c, alpha));
  return gradient;
}

// CSS 미리보기용
export const cssGradient = (stops, dir = '90deg') =>
  `linear-gradient(${dir}, ${sortStops(stops).map(([p, c]) => `${c} ${(p * 100).toFixed(1)}%`).join(', ')})`;

// 예전 형식(가장자리 색 → 가운데 색, 가운데 폭)을 지점 목록으로
export const mirrorStops = (edge, center, c) => {
  const w = Math.max(0, Math.min(0.5, c));
  return [[0, edge], [0.5 - w, center], [0.5 + w, center], [1, edge]];
};
