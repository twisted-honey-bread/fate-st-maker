import { fontStr } from './fonts';
import { getProceduralBackground } from './background';
import { rgba, mulberry32, FILTER_SUPPORTED } from './utils';

/*
 * 카드 렌더러 — React 와 무관한 순수 Canvas 2D 코드
 * 미리보기와 다운로드가 같은 함수를 쓰므로 결과가 항상 동일함
 * images: { bg, logo } — HTMLImageElement 또는 null (logo 는 기본 로고가 들어옴)
 * 반환: 파트별 영역 { [partId]: { x, y, w, h, hidden } } (px) — 구조도와 클릭 선택에 사용
 */
export function drawCard(ctx, W, H, state, images) {
  const layout = { bg: { x: 0, y: 0, w: W, h: H, hidden: false } };
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, W, H, state, images.bg);
  layout.topLine = drawLine(ctx, W, H, state.topLine);
  layout.bottomLine = drawLine(ctx, W, H, state.bottomLine);
  layout.logo = drawLogo(ctx, W, H, state.logo, images.logo);
  layout.left = placeText(ctx, state.left, W, H, (state.left.x / 100) * W, (state.left.y / 100) * H, 'left');
  layout.right = placeText(ctx, state.right, W, H, (state.right.x / 100) * W, (state.right.y / 100) * H, 'right');
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

function drawBackground(ctx, W, H, state, bgImage) {
  const key = [W, H, imageId(bgImage), state.logo.x, state.logo.y, JSON.stringify(state.bg)].join('|');
  let layer = bgCache.get(key);
  if (!layer) {
    layer = document.createElement('canvas');
    layer.width = W;
    layer.height = H;
    paintBackground(layer.getContext('2d'), W, H, state, bgImage);
    bgCache.set(key, layer);
    if (bgCache.size > 6) bgCache.delete(bgCache.keys().next().value);
  }
  ctx.drawImage(layer, 0, 0);
}

function paintBackground(ctx, W, H, state, bgImage) {
  const B = state.bg;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // cover 맞춤 + 확대/위치
  const src = bgImage || getProceduralBackground(W, H);
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

  let fill = s.color;
  if (s.fillMode === 'gradient') {
    fill = ctx.createLinearGradient(0, y - px * 0.85, 0, y + px * 0.1);
    fill.addColorStop(0, s.color);
    fill.addColorStop(1, s.color2);
  }
  const sw = (s.strokeWidth / 100) * H;

  const paint = () => {
    const one = (c, cx) => {
      if (sw > 0) {
        ctx.lineWidth = sw * 2;
        ctx.strokeStyle = s.strokeColor;
        ctx.strokeText(c, cx, y);
      }
      ctx.fillStyle = fill;
      ctx.fillText(c, cx, y);
    };
    if (!sp) {
      one(s.text, sx);
      return;
    }
    let cx = sx;
    for (const c of chars) {
      one(c, cx);
      cx += ctx.measureText(c).width + sp;
    }
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
  const h = (L.height / 100) * H;
  const w = ready ? (h * img.naturalWidth) / img.naturalHeight : h;
  const x = (L.x / 100) * W - w / 2;
  const y = (L.y / 100) * H - h / 2;
  const rect = { x, y, w, h, hidden: !L.show };
  if (!L.show || !ready) return rect;

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

  // 가로로 늘인 타원형 광선
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(1, th / len);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
  g.addColorStop(0, `rgba(255,255,255,${k})`);
  g.addColorStop(0.12, rgba(L.flareColor, k));
  g.addColorStop(0.45, rgba(L.flareColor, k * 0.35));
  g.addColorStop(1, rgba(L.flareColor, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-len, -len, len * 2, len * 2);
  ctx.restore();

  // 중심부 둥근 광원
  const r = th * 3;
  const g2 = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
  g2.addColorStop(0, `rgba(255,255,255,${k})`);
  g2.addColorStop(0.4, rgba(L.flareColor, k * 0.5));
  g2.addColorStop(1, rgba(L.flareColor, 0));
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(fx, fy, r, 0, Math.PI * 2);
  ctx.fill();
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
