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
  // 부드러운 가장자리(안쪽 45%부터 흐려짐)까지 화면 모서리를 완전히 지나도록 끝 반경을 잡음 → p=1 에서 끊김 없음
  const r = (maxR / 0.45) * p;
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

/* ---------- 정방형(45도 회전한 정사각형) 입자: 양옆 가장자리에서 터져 나옴 (아웃트로) ----------
 * 크게 나타난 뒤 서로 다른 속도로 작아지며 조금씩 위로 올라가고, endAt 까지 모두 사라짐
 * aspect: 세로 비율 (1 = 정방형)
 */
function makeDiamonds(count, seed) {
  const rng = mulberry32(seed * 7907 + 99);
  return Array.from({ length: count }, (_, i) => {
    const left = i % 2 === 0;
    const edge = Math.pow(rng(), 1.8) * 0.2; // 가장자리에 몰리도록
    return {
      x: left ? edge : 1 - edge,
      y: rng() * 1.05 - 0.02,
      born: Math.pow(rng(), 2.5) * 0.45, // 대부분 터지는 순간에 등장
      end: 0.4 + Math.pow(rng(), 0.7) * 0.6, // 사라지는 시점 (burst~endAt 구간의 비율)
      size: 0.022 + Math.pow(rng(), 1.3) * 0.09,
      vy: -(0.008 + rng() * 0.035), // 천천히 위로 (H/초)
    };
  });
}
const diamondCache = new Map();

// t: 터진 뒤 경과 시간(초), endAt: 마지막 입자가 사라지는 시각(터진 뒤 기준)
export function drawDiamonds(ctx, W, H, t, { density, color, aspect = 1, seed = 1, endAt = 3 }) {
  const count = Math.round(90 * density);
  if (count <= 0 || t < 0) return;
  const key = `${count}:${seed}`;
  if (!diamondCache.has(key)) {
    diamondCache.set(key, makeDiamonds(count, seed));
    if (diamondCache.size > 6) diamondCache.delete(diamondCache.keys().next().value);
  }
  ctx.save();
  ctx.shadowColor = rgba(color, 0.95);
  for (const d of diamondCache.get(key)) {
    const age = t - d.born;
    const life = Math.max(0.3, d.end * endAt - d.born);
    if (age < 0 || age > life) continue;
    const p = age / life;
    const pop = Math.min(1, age / 0.12); // 빠르게 커지며 등장
    const shrink = 1 - p * p * (3 - 2 * p); // 부드럽게 작아짐
    const hw = (d.size * H * pop * shrink) / 2;
    if (hw < 0.3) continue;
    const hh = hw * aspect;
    const x = d.x * W;
    const y = (d.y + d.vy * age) * H;
    // 밝은 단색 마름모 + 넓게 번지는 노란 빛 (보케처럼)
    ctx.globalAlpha = Math.min(1, pop * 1.2);
    ctx.shadowBlur = hw * 3.2;
    ctx.fillStyle = '#fffbe9';
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fill();
    ctx.fill(); // 한 번 더 그려 빛 번짐을 진하게
  }
  ctx.restore();
}

/* ---------- 위에서 쏟아져 내리는 금빛 입자 (아웃트로) ----------
 * 화면 맨 위에서 생겨 최대 maxFall(H 비율, 기본 20%)까지만 내려오며 사라짐
 */
const fallCache = new Map();
export function drawFallingGold(ctx, W, H, t, { start, seed = 1, count = 160, color, maxFall = 0.2 }) {
  if (t < start || count <= 0) return;
  const key = `${seed}:${count}`;
  if (!fallCache.has(key)) {
    const rng = mulberry32(seed * 6151 + 5);
    fallCache.set(key, Array.from({ length: count }, () => ({
      x: rng(),
      born: Math.pow(rng(), 1.3) * 3.5,
      y0: -0.01 + rng() * 0.04,
      travel: 0.25 + Math.pow(rng(), 0.8) * 0.75, // maxFall 중 얼마나 내려오는지
      life: 1.2 + rng() * 2.5,
      r: 0.5 + rng() * 1.6,
      phase: rng() * Math.PI * 2,
      tw: 4 + rng() * 8,
    })));
    if (fallCache.size > 6) fallCache.delete(fallCache.keys().next().value);
  }
  ctx.save();
  ctx.shadowColor = rgba(color, 0.9);
  for (const d of fallCache.get(key)) {
    const age = t - start - d.born;
    if (age < 0 || age > d.life) continue;
    const k = age / d.life;
    const fade = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
    const tw = 0.55 + 0.45 * Math.sin(d.phase + age * d.tw);
    const y = (d.y0 + maxFall * d.travel * (1 - Math.pow(1 - k, 2))) * H;
    const r = (d.r / 1080) * H;
    ctx.globalAlpha = fade * tw;
    ctx.shadowBlur = r * 4;
    ctx.fillStyle = rgba(color, 1);
    ctx.beginPath();
    ctx.arc(d.x * W, y, r, 0, Math.PI * 2);
    ctx.fill();
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
function circuitLayer(W, H, seed, style = 'grid') {
  if (style === 'penta') return pentaCircuitLayer(W, H, seed);
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

/*
 * 108도(정오각형 내각) 기반의 쪼개진 회로 무늬 (아웃트로)
 * 방향은 36도 단위, 꺾일 때 72도씩(내각 108도) 꺾이고 선 중간중간이 끊어짐
 */
function pentaCircuitLayer(W, H, seed) {
  const key = `penta:${W}x${H}:${seed}`;
  if (circuitCache.has(key)) return circuitCache.get(key);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const rng = mulberry32(seed * 3571 + 11);
  const unit = H * 0.045;
  g.strokeStyle = '#ffffff';
  g.lineWidth = Math.max(1, H * 0.0013);
  g.lineCap = 'butt';
  const dir = k => [Math.cos((k * Math.PI) / 5), Math.sin((k * Math.PI) / 5)];
  for (let n = 0; n < 46; n++) {
    let x = rng() * W;
    let y = rng() * H;
    let k = Math.floor(rng() * 10);
    const segs = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < segs; i++) {
      const [dx, dy] = dir(k);
      const len = unit * (1.5 + rng() * 5);
      // 선을 몇 조각으로 끊어서 그림
      const pieces = 1 + Math.floor(rng() * 3);
      for (let j = 0; j < pieces; j++) {
        const a = j / pieces;
        const b = (j + 1) / pieces - (pieces > 1 ? 0.12 : 0);
        g.beginPath();
        g.moveTo(x + dx * len * a, y + dy * len * a);
        g.lineTo(x + dx * len * b, y + dy * len * b);
        g.stroke();
      }
      x += dx * len;
      y += dy * len;
      k = (k + (rng() < 0.5 ? 2 : -2) + 10) % 10; // 72도 꺾임 = 내각 108도
    }
  }
  if (circuitCache.size > 6) circuitCache.delete(circuitCache.keys().next().value);
  circuitCache.set(key, c);
  return c;
}

/*
 * 회로 무늬를 아래에서 위로 훑으며 드러냄
 * p: 0 = 띠가 화면 아래 밖, 1 = 화면 위 밖. band: 띠 높이 (H 비율)
 * trail: 띠가 지나간 아래쪽에 남는 밝기 (0 = 남지 않음), twinkle: 0~1 반짝임 정도
 */
export function drawCircuitBand(ctx, W, H, p, {
  seed, color, opacity, band = 0.22, style = 'grid', trail = 0, twinkle = 0, t = 0, image = null,
}) {
  if (opacity <= 0 || p <= 0 || (p >= 1 && trail <= 0)) return;
  // image: 직접 그린 회로 무늬(투명 배경 PNG 등)가 있으면 화면 크기에 맞춰 사용, 색은 color 로 다시 칠함
  const pattern = image || circuitLayer(W, H, seed, style);
  const { canvas, ctx: m } = layer('circuit', W, H);
  m.drawImage(pattern, 0, 0, W, H);
  m.globalCompositeOperation = 'source-in';
  m.fillStyle = color;
  m.fillRect(0, 0, W, H);
  // 띠 영역만 남김
  m.globalCompositeOperation = 'destination-in';
  const cy = H * (1 + band) - Math.min(1, p) * H * (1 + band * 2);
  const half = (band * H) / 2;
  const gr = m.createLinearGradient(0, cy - half, 0, cy + half);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(0.35, 'rgba(0,0,0,1)');
  gr.addColorStop(0.65, 'rgba(0,0,0,1)');
  gr.addColorStop(1, `rgba(0,0,0,${trail})`);
  m.fillStyle = gr;
  m.fillRect(0, 0, W, H); // 그라데이션 끝 색(trail)이 띠 아래쪽 전체로 이어짐
  const tw = twinkle > 0 ? 1 - twinkle * (0.5 + 0.5 * Math.sin(t * 23) * Math.sin(t * 7.3 + 1)) : 1;
  ctx.save();
  ctx.globalAlpha = opacity * tw;
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
}
