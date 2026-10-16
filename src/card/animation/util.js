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
