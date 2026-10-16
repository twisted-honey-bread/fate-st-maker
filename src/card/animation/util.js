// 타임라인 계산 도우미
export const clamp01 = v => Math.max(0, Math.min(1, v));

// t 가 a→b 구간에서 0→1 로 진행되는 정도
export const prog = (t, a, b) => clamp01((t - a) / (b - a));

export const easeOut = p => 1 - Math.pow(1 - p, 3);
export const easeIn = p => p * p * p;
export const easeInOut = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// a 에서 시작해 peak 에서 최대(1), b 에서 다시 0 이 되는 종 모양 곡선
export const bell = (t, a, peak, b) => {
  if (t <= a || t >= b) return 0;
  return t < peak ? easeOut((t - a) / (peak - a)) : 1 - easeIn((t - peak) / (b - peak));
};

// 크기별로 재사용하는 작업용 캔버스
const layers = new Map();
export function layer(name, W, H) {
  const key = `${name}:${W}x${H}`;
  let c = layers.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    layers.set(key, c);
  }
  const ctx = c.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  return { canvas: c, ctx };
}

// 렌즈 플레어 깜빡임 (0.55~1 사이를 불규칙하게 오감)
export const flicker = t =>
  0.78 + 0.22 * (0.5 * Math.sin(t * 17.3) + 0.3 * Math.sin(t * 29.1 + 1.3) + 0.2 * Math.sin(t * 7.7 + 0.4));

// 두 hex 색을 k(0~1) 비율로 섞음
export function mixHex(a, b, k) {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  const ch = (p, sh) => (p >> sh) & 255;
  const m = sh => Math.round(ch(pa, sh) + (ch(pb, sh) - ch(pa, sh)) * Math.max(0, Math.min(1, k)));
  return `#${((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0')}`;
}

/*
 * 선택 가능한 움직임 곡선 (easing) — p: 0~1 진행도 → 0~1 (back 계열은 잠깐 범위를 넘음)
 * in = 천천히 시작, out = 천천히 끝남, inOut = 양쪽 모두 천천히
 */
const c1 = 1.70158;
export const EASINGS = {
  linear: { label: '일정 (linear)', fn: p => p },
  inSine: { label: '천천히 시작 · 약 (in sine)', fn: p => 1 - Math.cos((p * Math.PI) / 2) },
  outSine: { label: '천천히 끝 · 약 (out sine)', fn: p => Math.sin((p * Math.PI) / 2) },
  inOutSine: { label: '양쪽 천천히 · 약 (in-out sine)', fn: p => -(Math.cos(Math.PI * p) - 1) / 2 },
  inQuad: { label: '천천히 시작 (in quad)', fn: p => p * p },
  outQuad: { label: '천천히 끝 (out quad)', fn: p => 1 - (1 - p) * (1 - p) },
  inOutQuad: { label: '양쪽 천천히 (in-out quad)', fn: p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2) },
  inCubic: { label: '천천히 시작 · 강 (in cubic)', fn: p => p * p * p },
  outCubic: { label: '천천히 끝 · 강 (out cubic)', fn: p => 1 - Math.pow(1 - p, 3) },
  inOutCubic: { label: '양쪽 천천히 · 강 (in-out cubic)', fn: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2) },
  inExpo: { label: '아주 천천히 시작 (in expo)', fn: p => (p === 0 ? 0 : Math.pow(2, 10 * p - 10)) },
  outExpo: { label: '아주 천천히 끝 (out expo)', fn: p => (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)) },
  inOutExpo: {
    label: '양쪽 아주 천천히 (in-out expo)',
    fn: p => (p === 0 ? 0 : p === 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2),
  },
  outBack: { label: '살짝 넘쳤다 돌아옴 (out back)', fn: p => 1 + (c1 + 1) * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2) },
};

export const ease = (name, p) => (EASINGS[name] || EASINGS.linear).fn(p);
