import { mulberry32 } from './utils';

/* 배경 이미지가 없을 때 쓰는 절차적 설산 배경 (크기별 캐시) */
const cache = new Map();

// 중간점 변위법으로 능선 높이 배열 생성
function ridge(rng, pow, rough) {
  const N = (1 << pow) + 1;
  const a = new Array(N).fill(0);
  a[0] = rng();
  a[N - 1] = rng();
  let step = N - 1;
  let amp = 1;
  while (step > 1) {
    const h = step / 2;
    for (let i = h; i < N; i += step) a[i] = (a[i - h] + a[i + h]) / 2 + (rng() - 0.5) * amp;
    amp *= rough;
    step = h;
  }
  return a;
}

const LAYERS = [
  { base: 0.5, amp: 0.3, top: '#9aa9b6', bot: '#e7edf1', rough: 0.58 },
  { base: 0.6, amp: 0.26, top: '#8b9aa8', bot: '#eef2f5', rough: 0.55 },
  { base: 0.74, amp: 0.2, top: '#a5b2bd', bot: '#f3f6f8', rough: 0.6 },
  { base: 0.88, amp: 0.12, top: '#c3ccd4', bot: '#f8f9fa', rough: 0.5 },
];

export function getProceduralBackground(W, H) {
  const key = `${W}x${H}`;
  if (cache.has(key)) return cache.get(key);

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#c4cfd9');
  sky.addColorStop(0.5, '#e4eaef');
  sky.addColorStop(1, '#f4f6f8');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  const rng = mulberry32(42);
  for (const L of LAYERS) {
    const r = ridge(rng, 8, L.rough);
    const pts = r.map((v, i) => [(i / (r.length - 1)) * W, (L.base - (v - 0.5) * L.amp) * H]);
    const minY = Math.min(...pts.map(p => p[1]));

    g.beginPath();
    g.moveTo(0, H);
    pts.forEach(([x, y]) => g.lineTo(x, y));
    g.lineTo(W, H);
    g.closePath();
    const gr = g.createLinearGradient(0, minY, 0, H);
    gr.addColorStop(0, L.top);
    gr.addColorStop(0.55, L.bot);
    gr.addColorStop(1, '#ffffff');
    g.fillStyle = gr;
    g.fill();

    // 능선 아래로 흘러내리는 눈 자국
    g.save();
    g.clip();
    g.lineWidth = H * 0.012;
    g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const p = pts[Math.floor(rng() * pts.length)];
      const len = H * (0.03 + rng() * 0.07);
      const sg = g.createLinearGradient(0, p[1], 0, p[1] + len);
      sg.addColorStop(0, 'rgba(255,255,255,0.45)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = sg;
      g.beginPath();
      g.moveTo(p[0], p[1] + H * 0.004);
      g.lineTo(p[0] + (rng() - 0.5) * W * 0.03, p[1] + len);
      g.stroke();
    }
    g.restore();
  }

  cache.set(key, c);
  return c;
}
