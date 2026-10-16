import { fontStr } from './fonts';
import { rightText } from './defaults';
import { getProceduralBackground } from './background';
import { stylizeImage } from './stylize';
import { rgba, mulberry32, FILTER_SUPPORTED } from './utils';

/*
 * 카드 렌더러 — React 와 무관한 순수 Canvas 2D 코드
 * 미리보기와 다운로드가 같은 함수를 쓰므로 결과가 항상 동일함
 * images: { bg, logo } — HTMLImageElement 또는 null (logo 는 기본 로고가 들어옴)
 * hooks.afterBackground(ctx, W, H): 배경과 나머지 요소 사이에 그릴 것 (애니메이션 효과용)
 * 반환: 파트별 영역 { [partId]: { x, y, w, h, hidden } } (px) — 구조도와 클릭 선택에 사용
 */
export function drawCard(ctx, W, H, state, images, hooks = {}) {
  const layout = { bg: { x: 0, y: 0, w: W, h: H, hidden: false } };
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, W, H, state, images.bg);
  hooks.afterBackground?.(ctx, W, H);
  layout.topLine = drawLine(ctx, W, H, state.topLine);
  layout.bottomLine = drawLine(ctx, W, H, state.bottomLine);
  layout.logo = drawLogo(ctx, W, H, state.logo, images.logo);
  layout.left = placeText(ctx, state.left, W, H, (state.left.x / 100) * W, (state.left.y / 100) * H, 'left');
  layout.right = placeText(ctx, { ...state.right, text: rightText(state.right) }, W, H, (state.right.x / 100) * W, (state.right.y / 100) * H, 'right');
  Object.assign(layout, drawTitleGroup(ctx, W, H, state));
  layout.sub = placeText(ctx, state.sub, W, H, (state.sub.x / 100) * W, (state.sub.y / 100) * H, 'center');
  ctx.restore();
  return layout;
}

/* ---------- 배경 ----------
 * 배경은 효과가 많아 무거우므로, 같은 설정이면 그려 둔 캔버스를 재사용 (애니메이션 재생용)
 */
const bgCache = new Map();
const imageIds = new WeakMap();
let nextImageId = 1;
const imageId = img => {
  if (!img) return 0;
  if (!imageIds.has(img)) imageIds.set(img, nextImageId++);
  return imageIds.get(img);
};

/*
 * 애니메이션용 배경 변형 (캐시와 무관하게 그릴 때만 적용)
 * bg.animScale: 화면 중심 기준 확대 배율 (기본 1), bg.animBlur: 흐림 (%H, 기본 0)
 */
export function drawBackground(ctx, W, H, state, bgImage) {
  const { animScale = 1, animBlur = 0, ...bgKey } = state.bg;
  const key = [W, H, imageId(bgImage), state.logo.x, state.logo.y, JSON.stringify(bgKey)].join('|');
  let layer = bgCache.get(key);
  if (!layer) {
    layer = document.createElement('canvas');
    layer.width = W;
    layer.height = H;
    paintBackground(layer.getContext('2d'), W, H, state, bgImage);
    bgCache.set(key, layer);
    if (bgCache.size > 6) bgCache.delete(bgCache.keys().next().value);
  }
  if (animScale === 1 && !animBlur) {
    ctx.drawImage(layer, 0, 0);
    return;
  }
  // 흐림은 무거우므로 같은 값이 반복되면(어두운 장면처럼) 결과를 재사용
  if (animBlur > 0) {
    const tkey = `${key}|${animScale}|${animBlur}`;
    let t = blurCache.get(tkey);
    if (!t) {
      t = document.createElement('canvas');
      t.width = W;
      t.height = H;
      paintTransformed(t.getContext('2d'), W, H, layer, animScale, animBlur);
      blurCache.set(tkey, t);
      if (blurCache.size > 3) blurCache.delete(blurCache.keys().next().value);
    }
    ctx.drawImage(t, 0, 0);
    return;
  }
  paintTransformed(ctx, W, H, layer, animScale, 0);
}

const blurCache = new Map();

function paintTransformed(ctx, W, H, layer, scale, blur) {
  ctx.save();
  if (blur > 0 && FILTER_SUPPORTED) ctx.filter = `blur(${(blur / 100) * H}px)`;
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(layer, -W / 2, -H / 2);
  ctx.restore();
}

function paintBackground(ctx, W, H, state, bgImage) {
  const B = state.bg;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // cover 맞춤 + 확대/위치
  const src = bgImage ? stylizeImage(bgImage, B) : getProceduralBackground(W, H);
  const iw = src.naturalWidth || src.width;
  const ih = src.naturalHeight || src.height;
  const sc = Math.max(W / iw, H / ih) * (B.zoom / 100);
  const dw = iw * sc;
  const dh = ih * sc;
  const dx = ((W - dw) * B.posX) / 100;
  const dy = ((H - dh) * B.posY) / 100;
  ctx.save();
  if (FILTER_SUPPORTED) {
    ctx.filter = `brightness(${B.brightness}%) contrast(${B.contrast}%) saturate(${B.saturate}%) blur(${(B.blur / 100) * H}px)`;
  }
  ctx.drawImage(src, dx, dy, dw, dh);
  ctx.restore();

  // 색 덮기
  if (B.washOpacity > 0) {
    ctx.fillStyle = rgba(B.washColor, B.washOpacity);
    ctx.fillRect(0, 0, W, H);
  }

  // 하단 안개
  if (B.fogBottom > 0) {
    const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, `rgba(255,255,255,${B.fogBottom})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // 로고 뒤 방사형 광원
  if (B.glowOpacity > 0) {
    const L = state.logo;
    const cx = (L.x / 100) * W;
    const cy = (L.y / 100) * H;
    const r = (B.glowRadius / 100) * W;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(B.glowColor, B.glowOpacity));
    g.addColorStop(0.5, rgba(B.glowColor, B.glowOpacity * 0.5));
    g.addColorStop(1, rgba(B.glowColor, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // 타원형 비네트
  if (B.vignette > 0) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(W / H, 1);
    const outer = (H / 2) * 1.42;
    const inner = (outer * B.vignetteSize) / 100;
    const g = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
    g.addColorStop(0, rgba(B.vignetteColor, 0));
    g.addColorStop(1, rgba(B.vignetteColor, B.vignette));
    ctx.fillStyle = g;
    ctx.fillRect(-H / 2, -H / 2, H, H);
    ctx.restore();
  }

  // 눈 입자
  if (B.snow && B.snowCount > 0 && B.snowOpacity > 0) {
    const rng = mulberry32(7);
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = H * 0.003;
    for (let i = 0; i < B.snowCount; i++) {
      const x = rng() * W;
      const y = rng() * H;
      const r = ((0.6 + rng() * 2.2) / 1080) * H;
      ctx.fillStyle = `rgba(255,255,255,${B.snowOpacity * (0.35 + rng() * 0.65)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- 구분선 (양 끝 페이드) ---------- */
function drawLine(ctx, W, H, L) {
  const x0 = (L.left / 100) * W;
  const x1 = W - (L.right / 100) * W;
  const len = x1 - x0;
  const t = Math.max(1, (L.thickness / 100) * H);
  const rect = { x: x0, y: (L.y / 100) * H - t / 2, w: Math.max(0, len), h: t, hidden: !L.show };
  if (!L.show || L.opacity <= 0 || len <= 0) return rect;
  const f = Math.min(0.49, L.fade / 100);
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, rgba(L.color, 0));
  g.addColorStop(f, rgba(L.color, L.opacity));
  // 좌우대칭 그라데이션: 가장자리 색(color) → 가운데 색(color2)
  if (L.fillMode === 'mirror') {
    const c = Math.max(0, Math.min(0.5 - f - 0.001, L.mirrorCenter ?? 0.15));
    g.addColorStop(0.5 - c, rgba(L.color2, L.opacity));
    g.addColorStop(0.5 + c, rgba(L.color2, L.opacity));
  }
  g.addColorStop(1 - f, rgba(L.color, L.opacity));
  g.addColorStop(1, rgba(L.color, 0));
  // reveal: 0~1, 가운데에서 양옆으로 그려지는 정도 (애니메이션용, 기본 1)
  const reveal = L.reveal ?? 1;
  ctx.fillStyle = g;
  ctx.fillRect(rect.x + (len * (1 - reveal)) / 2, rect.y, len * reveal, t);
  return rect;
}

/* ---------- 텍스트 ---------- */
export function measureText(ctx, s, H) {
  if (!s.text) return 0;
  const px = (s.size / 100) * H;
  ctx.font = fontStr(s, px);
  const sp = s.spacing * px;
  const chars = [...s.text];
  if (!sp) return ctx.measureText(s.text).width;
  return chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + sp * (chars.length - 1);
}

// 텍스트 영역 계산 (숨김 상태여도 위치는 계산) 후 그리기
function placeText(ctx, s, W, H, x, y, align) {
  const px = (s.size / 100) * H;
  const w = Math.max(measureText(ctx, s, H), W * 0.04);
  const sx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  drawText(ctx, s, W, H, x, y, align);
  return { x: sx, y: y - px * 0.92, w, h: px * 1.12, hidden: !s.show || !s.text };
}

// 그림자 → 글로우 → 외곽선 → 채우기 순으로 레이어링
export function drawText(ctx, s, W, H, x, y, align) {
  if (!s.show || !s.text || s.alpha === 0) return 0;
  ctx.save();
  ctx.globalAlpha *= s.alpha ?? 1; // alpha: 애니메이션용 투명도 (기본 1)
  const w = measureText(ctx, s, H);
  const px = (s.size / 100) * H;
  const sp = s.spacing * px;
  const chars = [...s.text];
  const sx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // 좌우대칭 그라데이션: 가장자리 색(color) → 가운데 색(color2) → 가장자리 색, 텍스트 폭 기준
  let mirrorFill = null;
  if (s.fillMode === 'mirror') {
    const c = Math.max(0, Math.min(0.5, s.mirrorCenter ?? 0.08));
    // mirrorScope: 'text' = 글자 폭 기준, 'canvas' = 화면 폭 기준 (화면 가장자리 쪽일수록 가장자리 색)
    const [gx0, gx1] = s.mirrorScope === 'canvas' ? [0, W] : [sx, sx + Math.max(1, w)];
    mirrorFill = ctx.createLinearGradient(gx0, 0, gx1, 0);
    mirrorFill.addColorStop(0, s.color);
    mirrorFill.addColorStop(0.5 - c, s.color2);
    mirrorFill.addColorStop(0.5 + c, s.color2);
    mirrorFill.addColorStop(1, s.color);
  }
  const fillAt = dy => {
    if (mirrorFill) return mirrorFill;
    // gradientStops: [[위치 0~1, 색], ...] 세로 다단 그라데이션 (아웃트로 문구용)
    if (s.gradientStops) {
      const g = ctx.createLinearGradient(0, y + dy - px * 0.85, 0, y + dy + px * 0.1);
      for (const [pos, col] of s.gradientStops) g.addColorStop(pos, col);
      return g;
    }
    if (s.fillMode !== 'gradient') return s.color;
    const g = ctx.createLinearGradient(0, y + dy - px * 0.85, 0, y + dy + px * 0.1);
    g.addColorStop(0, s.color);
    g.addColorStop(1, s.color2);
    return g;
  };
  const fill = fillAt(0);
  const sw = (s.strokeWidth / 100) * H;

  /*
   * rise: 애니메이션용 글자별 등장 (기본 없음)
   * { lineY: 기준선 위치(px), dir: 1 = 선 아래에서 위로 올라옴 / -1 = 선 위에서 아래로 내려옴,
   *   progress: 0~1, stagger: 글자 간 시차 }
   * 선을 경계로 잘라 그려서, 글자가 선 뒤에서 나타나는 것처럼 보임
   */
  const rise = s.rise && s.rise.progress < 1 ? s.rise : null;
  let charOffset = () => 0;
  if (rise) {
    ctx.beginPath();
    if (rise.dir === 1) ctx.rect(0, 0, W, rise.lineY);
    else ctx.rect(0, rise.lineY, W, H - rise.lineY);
    ctx.clip();
    const dist = rise.dir === 1 ? rise.lineY - (y - px * 1.05) : y + px * 0.3 - rise.lineY;
    const st = rise.stagger ?? 0.1;
    const span = 1 + st * (chars.length - 1);
    charOffset = i => {
      const p = Math.max(0, Math.min(1, rise.progress * span - i * st));
      return rise.dir * Math.max(0, dist) * Math.pow(1 - p, 3);
    };
  }

  // tail: 애니메이션용 — from 번째 글자부터 alpha 로 그림 (자리는 차지)
  const tail = s.tail && s.tail.alpha < 1 ? s.tail : null;

  const paint = () => {
    const baseAlpha = ctx.globalAlpha;
    const one = (c, cx, dy = 0) => {
      if (sw > 0) {
        ctx.lineWidth = sw * 2;
        ctx.strokeStyle = s.strokeColor;
        ctx.strokeText(c, cx, y + dy);
      }
      ctx.fillStyle = dy ? fillAt(dy) : fill;
      ctx.fillText(c, cx, y + dy);
    };
    if (!sp && !rise && !tail) {
      one(s.text, sx);
      return;
    }
    let cx = sx;
    chars.forEach((c, i) => {
      ctx.globalAlpha = tail && i >= tail.from ? baseAlpha * tail.alpha : baseAlpha;
      if (ctx.globalAlpha > 0) one(c, cx, charOffset(i));
      cx += ctx.measureText(c).width + sp;
    });
    ctx.globalAlpha = baseAlpha;
  };

  if (s.shadowOpacity > 0) {
    ctx.save();
    ctx.shadowColor = rgba(s.shadowColor, s.shadowOpacity);
    ctx.shadowBlur = (s.shadowBlur / 100) * H;
    ctx.shadowOffsetX = (s.shadowX / 100) * H;
    ctx.shadowOffsetY = (s.shadowY / 100) * H;
    paint();
    ctx.restore();
  }
  if (s.glowOpacity > 0 && s.glowBlur > 0) {
    ctx.save();
    ctx.shadowColor = rgba(s.glowColor, s.glowOpacity);
    ctx.shadowBlur = (s.glowBlur / 100) * H;
    for (let i = 0; i < s.glowStrength; i++) paint();
    ctx.restore();
  }
  paint();
  ctx.restore();
  return w;
}

// 연대 + 제목 배치. 반환: { era, title } 영역
function drawTitleGroup(ctx, W, H, state) {
  const T = state.title;
  const E = state.era;
  const tW = T.show ? measureText(ctx, T, H) : 0;
  const eOn = E.show && E.text && E.position !== 'hidden';
  const eW = eOn ? measureText(ctx, E, H) : 0;
  const ty = (T.y / 100) * H;
  const cx = (T.x / 100) * W;
  const gap = (E.gap / 100) * W;
  const eyOff = (E.offsetY / 100) * H;

  const eraDraw = eOn ? E : { ...E, show: false }; // 위치 '숨김'이면 그리지 않음
  let era;
  let title;
  if (E.position === 'above') {
    era = placeText(ctx, eraDraw, W, H, cx, ty - (T.size / 100) * H * 1.05 + eyOff, 'center');
    title = placeText(ctx, T, W, H, cx, ty, 'center');
  } else {
    // 'left' 또는 'hidden' — 숨김이어도 구조도에는 제목 왼쪽 자리에 표시
    const tx = eOn && T.anchor === 'group' && tW ? cx - (eW + gap + tW) / 2 + eW + gap : cx - tW / 2;
    era = placeText(ctx, eraDraw, W, H, tx - gap, ty + eyOff, 'right');
    title = placeText(ctx, T, W, H, tx, ty, 'left');
  }
  if (!eOn) era.hidden = true;
  return { era, title };
}

/* ---------- 로고 ---------- */
function drawLogo(ctx, W, H, L, img) {
  const ready = img && img.naturalWidth;
  const h = (L.height / 100) * H * (L.scale ?? 1); // scale: 애니메이션용 확대 (기본 1)
  const w = ready ? (h * img.naturalWidth) / img.naturalHeight : h;
  const x = (L.x / 100) * W - w / 2;
  const y = (L.y / 100) * H - h / 2;
  const rect = { x, y, w, h, hidden: !L.show };
  if (!L.show || L.opacity <= 0) return rect; // 애니메이션에서 등장 전에는 그림자·글로우까지 전부 생략

  // 로고 뒤에 원형으로 퍼지는 옅은 그림자
  if (L.backShadow > 0) {
    const cx = (L.x / 100) * W;
    const cy = (L.y / 100) * H;
    const r = (L.backShadowSize / 100) * H;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    // 가우시안 모양으로 서서히 옅어져 외곽선이 보이지 않게 흩어짐
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      g.addColorStop(u, rgba(L.backShadowColor, L.backShadow * L.opacity * Math.exp(-((u * 2.4) ** 2))));
    }
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  if (!ready) return rect;

  // 단색 실루엣: 알파만 남기고 색으로 채움
  let src = img;
  if (L.tint) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = L.tintColor;
    g.fillRect(0, 0, c.width, c.height);
    src = c;
  }

  src = withInnerEdge(src, w, h, L, H);

  ctx.save();
  ctx.globalAlpha = L.opacity;
  if (L.glowOpacity > 0 && L.glowBlur > 0) {
    ctx.save();
    ctx.shadowColor = rgba(L.glowColor, L.glowOpacity);
    ctx.shadowBlur = (L.glowBlur / 100) * H;
    for (let i = 0; i < L.glowStrength; i++) ctx.drawImage(src, x, y, w, h);
    ctx.restore();
  }
  ctx.drawImage(src, x, y, w, h);
  ctx.restore();

  if (L.flare && L.flareIntensity > 0) drawFlare(ctx, W, H, L);
  return rect;
}

function drawFlare(ctx, W, H, L) {
  const fx = ((L.x + L.flareX) / 100) * W;
  const fy = ((L.y + L.flareY) / 100) * H;
  const len = (L.flareLength / 100) * W;
  const th = Math.max(1, (L.flareThickness / 100) * H);
  const k = L.flareIntensity;
  const blend = L.flareBlend || 'source-over';

  // core: 중심 색 (발광 레이어는 흰색, 바탕 레이어는 플레어 색)
  const paint = core => {
    // 가로로 늘인 타원형 광선
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(1, th / len);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
    g.addColorStop(0, rgba(core, k));
    g.addColorStop(0.12, rgba(L.flareColor, k));
    g.addColorStop(0.45, rgba(L.flareColor, k * 0.35));
    g.addColorStop(1, rgba(L.flareColor, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-len, -len, len * 2, len * 2);
    ctx.restore();

    // 중심 광원 — flareAspect 만큼 가로로 늘인 타원 (1 = 원)
    const r = th * 3;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(L.flareAspect, 1);
    const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g2.addColorStop(0, rgba(core, k));
    g2.addColorStop(0.4, rgba(L.flareColor, k * 0.5));
    g2.addColorStop(1, rgba(L.flareColor, 0));
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  ctx.save();
  // 바탕 레이어: 밝은 배경에서는 스크린·발광 합성이 거의 보이지 않으므로, 먼저 플레어 색을 보통 합성으로 깔아 줌
  if (blend !== 'source-over' && L.flareSolid > 0) {
    ctx.globalAlpha = L.flareSolid;
    paint(L.flareColor);
    ctx.globalAlpha = 1;
  }
  // 발광 레이어: 아래 레이어와 flareBlend 방식으로 합성 (screen = 스크린, lighter = 더하기)
  ctx.globalCompositeOperation = blend;
  paint('#ffffff');
  ctx.restore();
}

/* ---------- 로고 가장자리 탄 듯한 색 (안쪽 그림자) ----------
 * 로고 모양 안쪽 가장자리에만 색이 번지도록, 로고를 오려낸 바깥 영역의 그림자를 로고 위에 얹음
 */
const edgeCache = new Map();
function withInnerEdge(src, w, h, L, H) {
  const strength = L.edgeStrength ?? 0;
  if (strength <= 0) return src;
  const cw = Math.max(1, Math.ceil(w));
  const ch = Math.max(1, Math.ceil(h));
  const blur = Math.max(0.5, ((L.edgeWidth ?? 0.4) / 100) * H);
  const key = [imageId(src), cw, ch, L.tint, L.tintColor, L.edgeColor, strength, blur].join('|');
  if (edgeCache.has(key)) return edgeCache.get(key);

  const pad = Math.ceil(blur * 3);
  // 로고를 오려낸 바깥 영역
  const inv = document.createElement('canvas');
  inv.width = cw + pad * 2;
  inv.height = ch + pad * 2;
  const ig = inv.getContext('2d');
  ig.fillStyle = '#000';
  ig.fillRect(0, 0, inv.width, inv.height);
  ig.globalCompositeOperation = 'destination-out';
  ig.drawImage(src, pad, pad, cw, ch);

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const og = out.getContext('2d');
  og.drawImage(src, 0, 0, cw, ch);
  og.globalCompositeOperation = 'source-atop'; // 로고가 있는 곳에만
  og.shadowColor = rgba(L.edgeColor, Math.min(1, strength));
  og.shadowBlur = blur;
  // 바깥 영역 자체는 로고 밖이라 그려지지 않고, 그 그림자만 로고 안쪽 가장자리에 남음
  og.drawImage(inv, -pad, -pad);
  if (strength > 1) og.drawImage(inv, -pad, -pad);

  edgeCache.set(key, out);
  if (edgeCache.size > 8) edgeCache.delete(edgeCache.keys().next().value);
  return out;
}

/* ---------- 배치 가이드 (미리보기 전용) ---------- */
export function drawGuides(ctx, W, H, state) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  const v = x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); };
  const h = y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); };
  ctx.strokeStyle = 'rgba(255,0,140,0.6)';
  v(W / 2);
  h(H / 2);
  ctx.strokeStyle = 'rgba(0,160,255,0.55)';
  for (const k of ['left', 'right', 'title', 'sub']) if (state[k].show) h((state[k].y / 100) * H);
  ctx.strokeStyle = 'rgba(0,200,120,0.6)';
  ctx.setLineDash([]);
  ctx.strokeRect(W * 0.05, H * 0.05, W * 0.9, H * 0.9);
  ctx.restore();
}
