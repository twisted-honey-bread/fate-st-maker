/*
 * 배경 사진 스타일 변환 — 어떤 사진이든 예시 이미지 같은 설원 일러스트 톤으로 바꿈
 * 밝기만 뽑아(흑백) 노출·대비를 조정한 뒤, 단계 분리/2치화를 거쳐
 * 어두운 색(styleInk) ~ 밝은 색(stylePaper) 두 색으로 다시 칠함 (듀오톤)
 *
 * styleMode: none(원본) | duotone(듀오톤) | poster(단계 분리) | threshold(2치화)
 */
const cache = new Map();
const ids = new WeakMap();
let nextId = 1;
const idOf = img => {
  if (!ids.has(img)) ids.set(img, nextId++);
  return ids.get(img);
};

const MAX_SIDE = 2400;

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-6, b - a)));
  return t * t * (3 - 2 * t);
};

export function stylizeImage(img, B) {
  if (!B.styleMode || B.styleMode === 'none') return img;
  const key = [
    idOf(img), B.styleMode, B.styleExposure, B.styleContrast, B.styleLevels,
    B.styleThreshold, B.styleEdge, B.styleBlur, B.styleInk, B.stylePaper,
  ].join('|');
  if (cache.has(key)) return cache.get(key);

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const k = Math.min(1, MAX_SIDE / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * k));
  const h = Math.max(1, Math.round(ih * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  // 잡티를 줄이기 위한 사전 흐림 (2치화·단계 분리에서 붓질처럼 뭉쳐 보이게 함)
  if (B.styleBlur > 0) ctx.filter = `blur(${(B.styleBlur / 100) * h}px)`;
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = 'none';

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const [ir, ig, ib] = hexToRgb(B.styleInk);
  const [pr, pg, pb] = hexToRgb(B.stylePaper);
  const levels = Math.max(2, Math.round(B.styleLevels));
  const th = B.styleThreshold;
  const edge = Math.max(0.001, B.styleEdge);

  for (let i = 0; i < px.length; i += 4) {
    let l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    l = (l - 0.5) * B.styleContrast + 0.5 + B.styleExposure;
    l = Math.max(0, Math.min(1, l));
    if (B.styleMode === 'poster') l = Math.round(l * (levels - 1)) / (levels - 1);
    else if (B.styleMode === 'threshold') l = smoothstep(th - edge, th + edge, l);
    px[i] = ir + (pr - ir) * l;
    px[i + 1] = ig + (pg - ig) * l;
    px[i + 2] = ib + (pb - ib) * l;
  }
  ctx.putImageData(data, 0, 0);

  cache.set(key, c);
  if (cache.size > 6) cache.delete(cache.keys().next().value);
  return c;
}
