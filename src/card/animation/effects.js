import { mulberry32, rgba } from '../utils';
import { clamp01, layer } from './util';

/* ---------- 라인 드로잉: 양 끝의 빛 + 흩날리는 푸른 입자 (인트로) ---------- */
const lineSparks = (() => {
  const rng = mulberry32(31);
  return Array.from({ length: 48 }, () => ({
    u: rng(), // 선 위 위치 (0~1)
    dy: (rng() - 0.5) * 0.03, // 위아래 흩어짐 (%H 비율)
    drift: (rng() - 0.3) * 0.02,
    life: 0.5 + rng() * 0.9,
    size: 0.6 + rng() * 1.6,
  }));
})();

// reveal: 선이 그려진 정도, revealTime(u): 선 위 위치 u 에 빛이 도달한 시각
// 양 끝의 빛은 선 끝보다 조금 안쪽(inset, W 비율)에 놓이는 가로로 살짝 긴 마름모
export function drawLineLight(ctx, W, H, line, reveal, t, revealTime, color, alpha, { inset = 0.025, aspect = 1.5 } = {}) {
  if (alpha <= 0) return;
  const x0 = (line.left / 100) * W;
  const x1 = W - (line.right / 100) * W;
  const mid = (x0 + x1) / 2;
  const half = ((x1 - x0) / 2) * reveal;
  const y = (line.y / 100) * H;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';

  // 양 끝의 빛
  if (reveal < 1 || t < revealTime(1) + 0.4) {
    const headAlpha = reveal < 1 ? 1 : clamp01(1 - (t - revealTime(1)) / 0.4);
    const inner = Math.min(half, inset * W);
    for (const x of [mid - half + inner, mid + half - inner]) {
      const r = H * 0.014;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(aspect, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(255,255,255,${headAlpha})`);
      g.addColorStop(0.3, rgba(color, headAlpha * 0.8));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // 지나간 자리에 흩어지는 입자
  for (const p of lineSparks) {
    const born = revealTime(Math.abs(p.u - 0.5) * 2);
    const age = t - born;
    if (age < 0 || age > p.life) continue;
    const k = 1 - age / p.life;
    const x = x0 + (x1 - x0) * p.u;
    const py = y + (p.dy + p.drift * age) * H;
    ctx.fillStyle = rgba(color, k * 0.9);
    const s = (p.size / 1080) * H * 2;
    ctx.fillRect(x - s / 2, py - s / 2, s, s);
  }
  ctx.restore();
}

/* ---------- 잉크 번짐: 중심에서 원형으로 퍼지며 다른 장면을 드러냄 ---------- */
export function drawRevealMask(ctx, W, H, source, cx, cy, p, alpha = 1) {
  if (p <= 0) return;
  if (p >= 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(source, 0, 0);
    ctx.restore();
    return;
  }
  const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  const r = maxR * 1.35 * p;
  const { canvas, ctx: m } = layer('mask', W, H);
  m.drawImage(source, 0, 0);
  m.globalCompositeOperation = 'destination-in';
  const g = m.createRadialGradient(cx, cy, r * 0.45, cx, cy, Math.max(1, r));
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  m.fillStyle = g;
  m.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
}

/* ---------- 금빛 섬광: 4갈래 별 + 화면을 가로지르는 선 (아웃트로) ---------- */
export function drawStarFlash(ctx, W, H, x, y, k, color) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 가로 선
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, rgba(color, 0));
  lg.addColorStop(0.5, rgba(color, 0.9 * k));
  lg.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = lg;
  ctx.fillRect(0, y - H * 0.0012, W, H * 0.0024);

  // 별 모양 (가로로 긴 광선 + 세로 광선)
  const ray = (len, thick) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, thick / len);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
    g.addColorStop(0, `rgba(255,255,255,${k})`);
    g.addColorStop(0.2, rgba(color, 0.8 * k));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-len, -len, len * 2, len * 2);
    ctx.restore();
  };
  ray(W * 0.16 * (0.6 + 0.4 * k), H * 0.01);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 2);
  ctx.translate(-x, -y);
  ray(H * 0.14 * (0.6 + 0.4 * k), H * 0.008);
  ctx.restore();

  // 중심 광원
  const r = H * 0.09;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${k})`);
  g.addColorStop(0.25, rgba(color, 0.7 * k));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/* ---------- 다이아몬드 입자: 양옆 가장자리에서 나타나 위로 떠오름 (아웃트로) ----------
 * 세로로 긴 마름모, y축으로만 이동
 */
function makeDiamonds(count) {
  const rng = mulberry32(99);
  return Array.from({ length: count }, (_, i) => {
    const left = i % 2 === 0;
    const edge = Math.pow(rng(), 1.8) * 0.2; // 가장자리에 몰리도록
    return {
      x: left ? edge : 1 - edge,
      y: 0.05 + rng() * 1.0,
      born: Math.pow(rng(), 2.2) * 1.6,
      life: 0.8 + rng() * 2.0,
      size: 0.01 + Math.pow(rng(), 1.8) * 0.06,
      vy: -(0.03 + rng() * 0.12), // 위로 떠오르는 속도 (H/초)
    };
  });
}
const diamondCache = new Map();

export function drawDiamonds(ctx, W, H, t, density, color, aspect = 1.8) {
  const count = Math.round(90 * density);
  if (count <= 0 || t < 0) return;
  if (!diamondCache.has(count)) diamondCache.set(count, makeDiamonds(count));
  ctx.save();
  ctx.shadowColor = rgba(color, 0.9);
  for (const d of diamondCache.get(count)) {
    const age = t - d.born;
    if (age < 0 || age > d.life) continue;
    const p = age / d.life;
    const a = p < 0.12 ? p / 0.12 : 1 - (p - 0.12) / 0.88;
    const hw = (d.size * H * (0.55 + 0.45 * Math.min(1, p * 5))) / 2; // 가로 반폭
    const hh = hw * aspect; // 세로 반높이
    const x = d.x * W;
    const y = (d.y + d.vy * age) * H;
    ctx.globalAlpha = a;
    ctx.shadowBlur = hw * 2.2;
    const g = ctx.createLinearGradient(x, y - hh, x, y + hh);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#fffbea');
    g.addColorStop(1, rgba(color, 1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- 반짝이는 먼지 입자 ---------- */
const dust = (() => {
  const rng = mulberry32(7);
  return Array.from({ length: 140 }, () => ({
    x: rng(),
    y: Math.pow(rng(), 1.5) * 0.55,
    r: 0.6 + rng() * 1.4,
    phase: rng() * Math.PI * 2,
    speed: 1.5 + rng() * 3,
    fall: 0.005 + rng() * 0.015,
  }));
})();

export function drawDust(ctx, W, H, t, alpha, color) {
  if (alpha <= 0) return;
  ctx.save();
  for (const d of dust) {
    const tw = 0.5 + 0.5 * Math.sin(d.phase + t * d.speed);
    ctx.fillStyle = rgba(color, alpha * tw * 0.9);
    const y = ((d.y + d.fall * t) % 1) * H;
    ctx.beginPath();
    ctx.arc(d.x * W, y, (d.r / 1080) * H, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- 육각형 격자 (중앙에서 바깥으로 갈수록 흐려짐) ---------- */
export function drawHexGrid(ctx, W, H, alpha, color) {
  if (alpha <= 0) return;
  const R = H * 0.17;
  const dx = Math.sqrt(3) * R;
  const dy = 1.5 * R;
  const cx = W / 2;
  const cy = H / 2;
  const maxD = Math.hypot(cx, cy);
  ctx.save();
  ctx.lineWidth = Math.max(1, H * 0.0012);
  for (let row = -1; row * dy < H + R; row++) {
    for (let col = -1; col * dx < W + dx; col++) {
      const x = col * dx + (row % 2 ? dx / 2 : 0);
      const y = row * dy;
      const fade = 1 - Math.hypot(x - cx, y - cy) / maxD;
      if (fade <= 0) continue;
      ctx.strokeStyle = rgba(color, alpha * fade * fade);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = Math.PI / 6 + (i * Math.PI) / 3;
        const px = x + R * Math.cos(ang);
        const py = y + R * Math.sin(ang);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ---------- 화면 덮기 ---------- */
export function fillOverlay(ctx, W, H, color, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// 중앙에서 퍼지는 검은 얼룩
export function drawBlot(ctx, W, H, cx, cy, p) {
  if (p <= 0) return;
  const r = Math.hypot(W, H) * 0.75 * p;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r));
  g.addColorStop(0, 'rgba(0,0,0,0.95)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/* ---------- 선 위로 떠오르는 입자 (인트로) ----------
 * 시드로 위치·속도를 정해 매번 같은 모양이 나오게 함 (시드를 바꾸면 다른 배치)
 * x0~x1: 선 범위(px), y: 선 위치(px), start: 시작 시각, span: 입자가 생겨나는 기간
 */
const risingCache = new Map();
function makeRising(seed, count) {
  const key = `${seed}:${count}`;
  if (risingCache.has(key)) return risingCache.get(key);
  const rng = mulberry32(seed * 7919 + 17);
  const list = Array.from({ length: count }, () => ({
    u: rng(),
    born: rng(),
    life: 0.7 + rng() * 0.9,
    speed: 0.035 + rng() * 0.09, // H/초
    size: 0.7 + rng() * 1.8,
    phase: rng() * Math.PI * 2,
    sway: (rng() - 0.5) * 0.006,
  }));
  if (risingCache.size > 20) risingCache.delete(risingCache.keys().next().value);
  risingCache.set(key, list);
  return list;
}

export function drawRisingParticles(ctx, W, H, t, { x0, x1, y, start, span, count, color, seed, lighter = false }) {
  if (count <= 0 || t < start) return;
  ctx.save();
  if (lighter) ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = rgba(color, 0.9);
  for (const p of makeRising(seed, count)) {
    const age = t - (start + p.born * span);
    if (age < 0 || age > p.life) continue;
    const k = age / p.life;
    const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
    const x = x0 + (x1 - x0) * p.u + Math.sin(age * 3 + p.phase) * p.sway * W;
    const py = y - p.speed * age * H;
    const r = (p.size / 1080) * H;
    ctx.globalAlpha = a;
    ctx.shadowBlur = r * 4;
    ctx.fillStyle = rgba(color, 1);
    ctx.beginPath();
    ctx.arc(x, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- 원형 비네트: 네 귀퉁이를 검게 (인트로의 어두운 장면) ---------- */
export function drawCornerVignette(ctx, W, H, strength) {
  if (strength <= 0) return;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(W / H, 1);
  const outer = (H / 2) * 1.42;
  const g = ctx.createRadialGradient(0, 0, outer * 0.38, 0, 0, outer);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.6, `rgba(0,0,0,${strength * 0.6})`);
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(-H / 2, -H / 2, H, H);
  ctx.restore();
}

/* ---------- 전자 회로 무늬 (인트로의 밝은 장면) ----------
 * 직선·45도 대각선으로 꺾이는 회로선과 끝점 원으로 이루어진 무늬를 시드로 생성해 캐시
 * 평소에는 보이지 않고, 가로 띠 모양 영역만 회색으로 드러난 채 아래에서 위로 올라감
 */
const circuitCache = new Map();
function circuitLayer(W, H, seed) {
  const key = `${W}x${H}:${seed}`;
  if (circuitCache.has(key)) return circuitCache.get(key);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const rng = mulberry32(seed * 104729 + 3);
  const step = H * 0.028;
  const cols = Math.ceil(W / step);
  const rows = Math.ceil(H / step);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  g.strokeStyle = '#ffffff';
  g.fillStyle = '#ffffff';
  g.lineWidth = Math.max(1, H * 0.0016);
  g.lineCap = 'square';
  const node = (x, y, filled) => {
    g.beginPath();
    g.arc(x, y, step * 0.28, 0, Math.PI * 2);
    if (filled) g.fill();
    else g.stroke();
  };
  for (let n = 0; n < 90; n++) {
    let gx = Math.floor(rng() * cols);
    let gy = Math.floor(rng() * rows);
    let [dx, dy] = rng() < 0.5 ? [1, 0] : [0, -1];
    g.beginPath();
    g.moveTo(gx * step, gy * step);
    const start = [gx * step, gy * step];
    const segs = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < segs; i++) {
      const len = 2 + Math.floor(rng() * 7);
      gx += dx * len;
      gy += dy * len;
      g.lineTo(gx * step, gy * step);
      // 다음 방향: 45도씩만 꺾음
      const idx = dirs.findIndex(d => d[0] === dx && d[1] === dy);
      const turn = rng() < 0.5 ? 1 : -1;
      const near = dirs.filter(d => Math.abs(d[0] - dx) + Math.abs(d[1] - dy) === 1 || (d[0] === dx && d[1] === dy));
      [dx, dy] = near[Math.floor(rng() * near.length)] || dirs[(idx + turn + 8) % 8];
    }
    g.stroke();
    node(start[0], start[1], rng() < 0.4);
    node(gx * step, gy * step, rng() < 0.4);
  }
  // 평행한 버스 선
  for (let n = 0; n < 8; n++) {
    const y0 = Math.floor(rng() * rows) * step;
    const x0 = Math.floor(rng() * cols * 0.7) * step;
    const len = (6 + Math.floor(rng() * 14)) * step;
    const lanes = 2 + Math.floor(rng() * 3);
    for (let l = 0; l < lanes; l++) {
      g.beginPath();
      g.moveTo(x0, y0 + l * step * 0.6);
      g.lineTo(x0 + len, y0 + l * step * 0.6);
      g.stroke();
    }
  }
  if (circuitCache.size > 6) circuitCache.delete(circuitCache.keys().next().value);
  circuitCache.set(key, c);
  return c;
}

// p: 0 = 띠가 화면 아래 밖, 1 = 화면 위 밖. band: 띠 높이 (H 비율)
export function drawCircuitBand(ctx, W, H, p, { seed, color, opacity, band = 0.22 }) {
  if (p <= 0 || p >= 1 || opacity <= 0) return;
  const pattern = circuitLayer(W, H, seed);
  const { canvas, ctx: m } = layer('circuit', W, H);
  m.drawImage(pattern, 0, 0);
  m.globalCompositeOperation = 'source-in';
  m.fillStyle = color;
  m.fillRect(0, 0, W, H);
  // 띠 영역만 남김
  m.globalCompositeOperation = 'destination-in';
  const cy = H * (1 + band) - p * H * (1 + band * 2);
  const half = (band * H) / 2;
  const gr = m.createLinearGradient(0, cy - half, 0, cy + half);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(0.35, 'rgba(0,0,0,1)');
  gr.addColorStop(0.65, 'rgba(0,0,0,1)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  m.fillStyle = gr;
  m.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
}
