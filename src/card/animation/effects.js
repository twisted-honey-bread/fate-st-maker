import { FILTER_SUPPORTED, mulberry32, rgba } from '../utils';
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
/*
 * rays: 방사형 광선 설정 — count(개수), angle(첫 광선 각도, 도), length(%H), widthStart/widthEnd(%H, 중심/끝 폭),
 *       opacity(빛 띠 밝기), fade(빛이 흐려지기 시작하는 지점 0~1)
 * spread: 0→1, 광선이 중심에서 바깥으로 퍼져 나가는 진행도
 */
export function drawStarFlash(ctx, W, H, x, y, k, color, rays = null, spread = 1) {
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

  // 방사형 직선 광선: 중심에서는 가늘고 끝으로 갈수록 넓어지며, 중심에서 바깥으로 퍼져 나감
  if (rays && rays.count > 0 && spread > 0) {
    const len = (rays.length / 100) * H * spread;
    const beam = (bl, w0, w1, a0) => {
      const g = ctx.createLinearGradient(0, 0, bl, 0);
      g.addColorStop(0, `rgba(255,255,255,${a0})`);
      g.addColorStop(Math.max(0.01, Math.min(0.99, rays.fade)), `rgba(255,250,235,${a0 * 0.5})`);
      g.addColorStop(1, 'rgba(255,250,235,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -w0 / 2);
      ctx.lineTo(bl, -w1 / 2);
      ctx.lineTo(bl, w1 / 2);
      ctx.lineTo(0, w0 / 2);
      ctx.closePath();
      ctx.fill();
    };
    // 폭도 퍼지는 진행도에 맞춰 넓어짐
    const w0 = (rays.widthStart / 100) * H;
    const w1 = (rays.widthStart + (rays.widthEnd - rays.widthStart) * spread) / 100 * H;
    for (let i = 0; i < rays.count; i++) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rays.angle * Math.PI) / 180 + (i * Math.PI * 2) / rays.count);
      beam(len, w0, w1, rays.opacity * k);
      ctx.restore();
    }
  }

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
 * 터지는 순간 각자의 위치에 정방형으로 바로 나타나고(등장 애니메이션 없음),
 * 입자마다 다른 대기 시간·속도 곡선·종료 시점으로 작아지며 조금씩 위로 올라가고, endAt 까지 모두 사라짐
 * 작아질 때는 위쪽 꼭짓점(가로 중앙, 맨 위)을 기준점으로 줄어들고,
 * 가로가 더 빨리 줄어 항상 세로로 긴 마름모가 됨 (squash: 0 = 끝까지 정방형)
 */
function makeDiamonds(count, seed) {
  const rng = mulberry32(seed * 7907 + 99);
  return Array.from({ length: count }, (_, i) => {
    const left = i % 2 === 0;
    const edge = Math.pow(rng(), 1.8) * 0.2; // 가장자리에 몰리도록
    return {
      x: left ? edge : 1 - edge,
      y: rng() * 1.05 - 0.02,
      end: 0.3 + Math.pow(rng(), 0.7) * 0.7, // 사라지는 시점 (burst~endAt 구간의 비율)
      hold: rng() * 0.35, // 작아지기 시작하기 전 그대로 있는 구간 (수명 비율)
      curve: 0.5 + rng() * 2.2, // 작아지는 속도 곡선 (작을수록 초반에 빨리, 클수록 후반에 몰아서)
      size: 0.01 + Math.pow(rng(), 2.4) * 0.274, // 작은 것은 작게, 큰 것은 화면 높이의 약 28%까지
      vy: -(0.008 + rng() * 0.035), // 천천히 위로 (H/초)
      sx: 0.45 + rng() * 0.55, // 축소될 때 가로가 추가로 줄어드는 정도
    };
  });
}
const diamondCache = new Map();

// t: 터진 뒤 경과 시간(초), endAt: 마지막 입자가 사라지는 시각(터진 뒤 기준)
export function drawDiamonds(ctx, W, H, t, {
  density, color, glow = '#fff0b8', glowSize = 0.022, squash = 0.45, seed = 1, endAt = 3, sizeScale = 1,
}) {
  const count = Math.round(44 * density);
  if (count <= 0 || t < 0) return;
  const key = `${count}:${seed}`;
  if (!diamondCache.has(key)) {
    diamondCache.set(key, makeDiamonds(count, seed));
    if (diamondCache.size > 6) diamondCache.delete(diamondCache.keys().next().value);
  }
  // 입자는 그림자 없이 한 레이어에 모아 그린 뒤, 레이어 전체에 빛 번짐을 한 번만 줌
  // (입자끼리 서로 그림자가 겹치지 않고, 렌더링도 가벼움)
  const { canvas: pl, ctx: pc } = layer('diamonds', W, H);
  let any = false;
  for (const d of diamondCache.get(key)) {
    const age = t;
    const life = Math.max(0.3, d.end * endAt);
    if (age < 0 || age > life) continue;
    const p = age / life;
    const q = Math.max(0, (p - d.hold) / (1 - d.hold));
    const shrink = 1 - Math.pow(q, d.curve); // 입자마다 다른 속도로 작아짐
    const full = (d.size * H * sizeScale) / 2; // 처음 크기의 반폭 (sizeScale: 크기 배율)
    const base = full * shrink;
    if (base < 0.3) continue;
    const hw = base * (1 - d.sx * squash * q); // 가로가 더 빨리 줄어 세로로 긴 마름모
    const hh = base;
    const x = d.x * W;
    const top = (d.y + d.vy * age) * H - full; // 위쪽 꼭짓점 고정
    const y = top + hh;
    // 거의 흰 단색 마름모
    pc.fillStyle = color;
    pc.beginPath();
    pc.moveTo(x, y - hh);
    pc.lineTo(x + hw, y);
    pc.lineTo(x, y + hh);
    pc.lineTo(x - hw, y);
    pc.closePath();
    pc.fill();
    any = true;
  }
  if (!any) return;
  if (glowSize > 0) {
    if (FILTER_SUPPORTED) {
      // 빛 번짐은 1/4 해상도에서 흐리게 만든 뒤 확대해 깔아 줌 (전체 해상도 흐림보다 훨씬 가벼움)
      const sw = Math.max(1, Math.round(W / 4));
      const sh = Math.max(1, Math.round(H / 4));
      const { canvas: sc, ctx: sx } = layer('diamond-glow-src', sw, sh);
      sx.drawImage(pl, 0, 0, sw, sh);
      sx.globalCompositeOperation = 'source-in';
      sx.fillStyle = rgba(glow, 0.95);
      sx.fillRect(0, 0, sw, sh);
      const { canvas: bc, ctx: bx } = layer('diamond-glow', sw, sh);
      bx.filter = `blur(${(H * glowSize) / 4 / 2}px)`;
      bx.drawImage(sc, 0, 0);
      bx.filter = 'none';
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bc, 0, 0, W, H);
      ctx.drawImage(bc, 0, 0, W, H); // 두 번 깔아 밝기를 그림자 방식과 비슷하게
      ctx.restore();
    } else {
      ctx.save();
      ctx.shadowColor = rgba(glow, 0.95);
      ctx.shadowBlur = H * glowSize;
      ctx.drawImage(pl, 0, 0);
      ctx.restore();
    }
  }
  ctx.drawImage(pl, 0, 0);
}

/* ---------- 위에서 쏟아져 내리는 금빛 입자 (아웃트로) ----------
 * 화면 맨 위에서 생겨 최대 maxFall(H 비율, 기본 20%)까지만 내려오며 사라짐
 */
const fallCache = new Map();
export function drawFallingGold(ctx, W, H, t, { start, seed = 1, count = 160, color, maxFall = 0.2, sizeScale = 1 }) {
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
    const r = (d.r / 1080) * H * sizeScale;
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

export function drawRisingParticles(ctx, W, H, t, { x0, x1, y, start, span, count, color, seed, lighter = false, sizeScale = 1 }) {
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
    const r = (p.size / 1080) * H * sizeScale;
    ctx.globalAlpha = a;
    ctx.shadowBlur = r * 4;
    ctx.fillStyle = rgba(color, 1);
    ctx.beginPath();
    ctx.arc(x, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- 원형 비네트: 네 귀퉁이를 검게 (인트로의 어두워졌을 때) ---------- */
// inner: 비네트가 시작되는 안쪽 반경 (화면 대각선 절반 대비 %, 클수록 가운데가 넓게 밝음)
export function drawCornerVignette(ctx, W, H, strength, inner = 38) {
  if (strength <= 0) return;
  const i0 = Math.max(0, Math.min(0.95, inner / 100));
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(W / H, 1);
  const outer = (H / 2) * 1.42;
  const g = ctx.createRadialGradient(0, 0, outer * i0, 0, 0, outer);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.6, `rgba(0,0,0,${Math.min(1, strength * 0.6)})`);
  g.addColorStop(1, `rgba(0,0,0,${Math.min(1, strength)})`);
  ctx.fillStyle = g;
  ctx.fillRect(-H / 2, -H / 2, H, H);
  ctx.restore();
}

/* ---------- 전자 회로 무늬 (인트로의 밝아졌을 때) ----------
 * 직선·45도 대각선으로 꺾이는 회로선과 끝점 원으로 이루어진 무늬를 시드로 생성해 캐시
 * 평소에는 보이지 않고, 가로 띠 모양 영역만 회색으로 드러난 채 아래에서 위로 올라감
 */
const circuitCache = new Map();
function circuitLayer(W, H, seed, style = 'grid') {
  if (style === 'penta') return hexCircuitLayer(W, H, seed);
  const key = `${W}x${H}:${seed}`;
  if (circuitCache.has(key)) return circuitCache.get(key);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const rng = mulberry32(seed * 104729 + 3);
  /*
   * 인트로: 아래에서 위로 올라가는 세로선 + 이웃한 세로 줄로 건너가는 45도 대각선 (회로 기판 배선처럼)
   * 원·가로선 없음. 세로 줄 간격(col)을 넉넉히 두고, 선 하나가 위로 가다가 대각선으로 옆 줄에 옮겨 타며 이어짐
   */
  const col = H * 0.055; // 세로 줄 사이 간격
  const cols = Math.ceil(W / col) + 1;
  g.strokeStyle = '#ffffff';
  g.lineWidth = Math.max(1, H * 0.0016);
  g.lineCap = 'butt';
  g.lineJoin = 'miter';
  const trace = (pts, dx = 0) => {
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px + dx, py) : g.moveTo(px + dx, py)));
    g.stroke();
  };
  for (let n = 0; n < 46; n++) {
    let ci = Math.floor(rng() * cols);
    let x = ci * col;
    let y = H * (0.2 + rng() * 0.95);
    const top = y - H * (0.25 + rng() * 0.55);
    const pts = [[x, y]];
    while (y > top) {
      // 세로로 올라감
      y = Math.max(top, y - H * (0.04 + rng() * 0.16));
      pts.push([x, y]);
      if (y <= top) break;
      // 자주 옆 줄로 대각선 이동 (위쪽 45도, 가끔 두 줄 건너뜀)
      if (rng() < 0.65) {
        const dir = (ci <= 0 ? 1 : ci >= cols - 1 ? -1 : rng() < 0.5 ? -1 : 1) * (rng() < 0.25 ? 2 : 1);
        ci += dir;
        x = ci * col;
        y -= Math.abs(dir) * col;
        pts.push([x, y]);
      }
    }
    trace(pts);
    // 나란히 가는 두 번째 선 (버스)
    if (rng() < 0.2) trace(pts, col * 0.24);
  }
  if (circuitCache.size > 6) circuitCache.delete(circuitCache.keys().next().value);
  circuitCache.set(key, c);
  return c;
}

/*
 * 아웃트로 회로 무늬 — 참고 화면처럼 크고 성긴 육각형 윤곽선
 * 뾰족한 위아래(pointy-top) 육각형이라 변은 세로선과 ±30도 사선뿐. 변 일부를 빼서 끊긴 느낌을 냄
 */
function hexCircuitLayer(W, H, seed) {
  const key = `hex:${W}x${H}:${seed}`;
  if (circuitCache.has(key)) return circuitCache.get(key);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const rng = mulberry32(seed * 3571 + 11);
  g.strokeStyle = '#ffffff';
  g.lineWidth = Math.max(1, H * 0.0013);
  g.lineCap = 'round';
  const line = (x0, y0, x1, y1) => {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  };
  const corner = (cx, cy, r, i) => {
    const a = ((60 * i - 90) * Math.PI) / 180; // 꼭짓점이 위아래
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  // 화면을 고르게 덮도록 가로 칸마다 하나씩 + 가운데는 조금 비움
  const count = 9;
  for (let n = 0; n < count; n++) {
    const cx = ((n + 0.2 + rng() * 0.6) / count) * W;
    const cy = H * (0.1 + rng() * 0.8);
    const r = H * (0.16 + rng() * 0.2);
    const skip = new Set();
    const drop = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < drop; i++) skip.add(Math.floor(rng() * 6));
    for (let i = 0; i < 6; i++) {
      if (skip.has(i)) continue;
      const [x0, y0] = corner(cx, cy, r, i);
      const [x1, y1] = corner(cx, cy, r, i + 1);
      line(x0, y0, x1, y1);
    }
    // 안쪽에 작은 육각형 일부 (겹친 느낌)
    if (rng() < 0.4) {
      const r2 = r * (0.45 + rng() * 0.2);
      const from = Math.floor(rng() * 6);
      for (let i = from; i < from + 3; i++) {
        const [x0, y0] = corner(cx, cy, r2, i);
        const [x1, y1] = corner(cx, cy, r2, i + 1);
        line(x0, y0, x1, y1);
      }
    }
  }
  // 화면을 가로지르는 긴 가로선·30도 사선 몇 개
  for (let n = 0; n < 4; n++) {
    const y = H * (0.15 + rng() * 0.7);
    const x0 = rng() * W * 0.5;
    const len = W * (0.25 + rng() * 0.4);
    const ang = [0, 0, Math.PI / 6, -Math.PI / 6][Math.floor(rng() * 4)];
    line(x0, y, x0 + len * Math.cos(ang), y + len * Math.sin(ang));
  }
  if (circuitCache.size > 6) circuitCache.delete(circuitCache.keys().next().value);
  circuitCache.set(key, c);
  return c;
}

/*
 * 어두워졌을 때의 구름·안개 노이즈 — 저해상도 fBm 값 노이즈를 부드럽게 확대해 그림
 * t: 초 (아주 천천히 흘러감), opacity: 0~1
 */
// coverage: 0~1 화면을 덮는 면적 (클수록 자욱함), scale: 덩어리 크기 배율
const fogCache = new Map();
function fogLayer(seed, coverage, scale) {
  const key = `${seed}:${coverage}:${scale}`;
  if (fogCache.has(key)) return fogCache.get(key);
  const w = 224;
  const h = 126;
  const rng = mulberry32(seed * 7919 + 5);
  const G = 64;
  const grid = new Float32Array(G * G).map(() => rng());
  const at = (x, y) => grid[(((y % G) + G) % G) * G + (((x % G) + G) % G)];
  const smooth = v => v * v * (3 - 2 * v);
  const noise = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = smooth(x - xi);
    const fy = smooth(y - yi);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * fx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * fx;
    return a + (b - a) * fy;
  };
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      let amp = 0.5;
      let f = 1 / (28 * scale);
      for (let o = 0; o < 5; o++) {
        v += amp * noise(x * f + o * 17.3, y * f * 1.3 + o * 9.1);
        amp *= 0.5;
        f *= 2;
      }
      // 덩어리진 구름만 남기고 사이는 비움 — 덮는 면적이 클수록 기준값을 낮춤
      const k = Math.max(0, Math.min(1, (v - (0.66 - 0.42 * coverage)) / 0.35));
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * k * k);
    }
  }
  g.putImageData(img, 0, 0);
  if (fogCache.size > 8) fogCache.delete(fogCache.keys().next().value);
  fogCache.set(key, c);
  return c;
}

export function drawFog(ctx, W, H, { seed = 1, t = 0, opacity = 0.3, color = '#b9c2cc', coverage = 0.35, scale = 1 } = {}) {
  if (opacity <= 0 || coverage <= 0) return;
  const src = fogLayer(seed, coverage, scale);
  const { canvas, ctx: m } = layer('fog', W, H);
  m.imageSmoothingEnabled = true;
  m.imageSmoothingQuality = 'high';
  // 화면보다 조금 크게 그려 천천히 옆으로 흘러가게
  const drift = Math.min(0.1, t * 0.008);
  m.drawImage(src, -W * (0.05 + drift), -H * 0.05, W * 1.2, H * 1.1);
  m.globalCompositeOperation = 'source-in';
  m.fillStyle = color;
  m.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
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
