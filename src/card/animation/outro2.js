import { TEXT_BASE } from '../defaults';
import { drawCard, drawText } from '../renderer';
import { fontStr } from '../fonts';
import { FILTER_SUPPORTED, mulberry32 } from '../utils';
import { toNight } from './night';
import { drawBlot, drawCircuitBand, drawRevealMask, fillOverlay } from './effects';
import { bell, clamp01, ease, layer, prog } from './util';
import { stageTime } from './timing';

/*
 * 아웃트로...? (증명완료 → 증명불가)
 *  ① 로고에서부터 화면이 어두워짐
 *  ② (①이 끝나갈 때부터) 배경의 사각형·마름모·원 무늬가 돌며 정렬됨
 *  ③ 정렬이 끝나면 초반 제목·부제가 펼쳐지며 빛무리가 생기고, 거의 다 펼쳐질 때 오른쪽 위·왼쪽 아래에 십자 섬광
 *  ④ 화면이 일렁이기 시작
 *  ⑤ 글리치가 생기며 화면이 왼쪽으로 쪼개지듯 날아감
 *  ⑥ 테마 색이 후반 색으로 바뀌며 중앙에 커다란 십자 광선(점점 사라짐) + 후반 제목이 돌며 나타남
 *  ⑦ 후반 부제 페이드 인 + 빛무리, 회로 무늬가 아래에서 올라옴 (⑥~⑦ 동안 세로로 긴 사각형·마름모 입자)
 *  ⑧ 테마 색으로 빛나던 로고가 사라지며 완성 (위아래에서 빛구슬이 계속 떨어짐)
 *  ⑨ 유지 시간 뒤 중앙에서부터 어두워짐
 * 전체 내내 배경 위에 고정된 삼각형 무늬가 깔림
 * 어두워진 장면은 흑백에 가깝게 그린 뒤 테마 색을 색조로 입힘 (밝은 부분은 흰빛, 어두운 부분은 짙은 테마 색)
 */
const holdStart = A => Math.max(stageTime(A, 'o2Logo')[1], stageTime(A, 'o2Sub2')[1]);
const fadeLength = A => stageTime(A, 'o2End')[1];

// o2Delay: 시작 전에 원래 카드를 그대로 보여 주는 시간 (단계 시간은 이 뒤부터 셈)
export const outro2Duration = state => (state.anim.o2Delay + holdStart(state.anim) + state.anim.o2Hold + fadeLength(state.anim)) / state.anim.outroSpeed;

function textStyles(state, part) {
  const A = state.anim;
  const main = {
    ...TEXT_BASE,
    text: part === 1 ? A.o2Text1 : A.o2Text2,
    font: A.outroFont,
    weight: A.outroWeight,
    size: A.o2Size,
    spacing: part === 1 ? A.o2Spacing : A.o2Spacing2,
    color: '#ffffff',
    glowColor: '#ffffff',
    glowOpacity: 0.9,
    glowBlur: 1.3,
    glowStrength: 2,
  };
  const sub = {
    ...TEXT_BASE,
    text: part === 1 ? A.o2Sub1 : A.o2Sub2,
    font: A.outroSubFont,
    weight: A.outroSubWeight,
    size: A.o2SubSize,
    spacing: part === 1 ? A.o2SubSpacing : A.o2SubSpacing2,
    color: '#f2f4f8',
    glowColor: '#ffffff',
    glowOpacity: 0.35,
    glowBlur: 0.5,
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowBlur: 0.4,
  };
  return { main, sub };
}

// 폰트 미리 로드용
export const outro2Texts = state => [...Object.values(textStyles(state, 1)), ...Object.values(textStyles(state, 2))];

/* ---------- 삼각형 무늬 (시드 고정, 크기·성김만 조절) ---------- */
const polyCache = new Map();
function polyLayer(W, H, size, sparse) {
  const key = `${W}x${H}:${size}:${sparse}`;
  if (polyCache.has(key)) return polyCache.get(key);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const rng = mulberry32(4271);
  const cell = Math.max(8, (size / 100) * W);
  const cols = Math.ceil(W / cell) + 3;
  const rows = Math.ceil(H / cell) + 3;
  // 격자점을 크게 흔들어 불규칙한 삼각형을 만듦
  const pts = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, q) => [
    (q - 1 + (rng() - 0.5) * 0.85) * cell,
    (r - 1 + (rng() - 0.5) * 0.85) * cell,
  ]));
  for (let r = 0; r < rows - 1; r++) {
    for (let q = 0; q < cols - 1; q++) {
      const a = pts[r][q];
      const b = pts[r][q + 1];
      const d = pts[r + 1][q];
      const e = pts[r + 1][q + 1];
      const tris = rng() < 0.5 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]];
      for (const tri of tris) {
        // 난수는 성김과 상관없이 항상 같은 순서로 뽑음 → 성김을 바꿔도 남은 삼각형 모양은 그대로
        const keep = rng() >= sparse;
        const light = rng() < 0.5;
        const alpha = 0.35 + rng() * 0.65;
        if (!keep) continue;
        g.fillStyle = light ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
        g.beginPath();
        g.moveTo(...tri[0]);
        g.lineTo(...tri[1]);
        g.lineTo(...tri[2]);
        g.closePath();
        g.fill();
      }
    }
  }
  polyCache.set(key, c);
  if (polyCache.size > 4) polyCache.delete(polyCache.keys().next().value);
  return c;
}

function drawPoly(ctx, W, H, A) {
  if (A.o2PolyOpacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = A.o2PolyOpacity;
  ctx.globalCompositeOperation = A.o2PolyBlend;
  ctx.drawImage(polyLayer(W, H, A.o2PolySize, A.o2PolySparse), 0, 0);
  ctx.restore();
}

/*
 * ---------- ② 배경 무늬 ----------
 * 두 겹 마름모 → 그 안에 같은 크기의 사각형 두 개 (하나는 바로, 하나는 마름모 방향으로 45°) → 두 사각형에 모두 내접하는 원
 * 모두 한꺼번에 페이드 인되며, 함께 90° 돌아 제자리에 맞춰짐
 * p: 0~1 (②단계 진행도, 움직임 곡선 적용 후), cx·cy: 중심, dia: 바깥 마름모 중심~꼭짓점(px)
 */
function drawShapes(ctx, H, cx, cy, p, alpha, dia) {
  if (alpha <= 0 || p <= 0) return;
  const gap = H * 0.014; // 두 겹 사이 간격 (선과 선 사이 거리)
  const inner = dia - gap * Math.SQRT2; // 안쪽 겹 마름모의 중심~꼭짓점
  const sq = inner / 2; // 마름모에 내접하는 사각형의 반폭 (두 사각형 모두 같은 크기)
  const r = sq; // 두 사각형에 모두 내접하는 원
  const square = (half, rot) => {
    ctx.save();
    ctx.rotate(rot);
    ctx.strokeRect(-half, -half, half * 2, half * 2);
    ctx.restore();
  };
  ctx.save();
  ctx.globalAlpha = alpha * Math.min(1, p / 0.4);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, H * 0.0024);
  ctx.shadowColor = 'rgba(255,255,255,0.7)';
  ctx.shadowBlur = H * 0.006;
  ctx.translate(cx, cy);
  ctx.rotate((-Math.PI / 2) * (1 - p));
  const d45 = Math.PI / 4;
  square(dia / Math.SQRT2, d45);
  square(inner / Math.SQRT2, d45);
  square(sq, 0);
  square(sq, d45);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/* ---------- 빛 ---------- */
// 가로로 긴 타원형 빛 (lighter) — 후반 섬광이 터질 때만 씀
function drawHalo(ctx, cx, cy, rx, ry, k) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, cy);
  ctx.scale(rx / ry, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  g.addColorStop(0, `rgba(255,255,255,${0.6 * k})`);
  g.addColorStop(0.4, `rgba(255,255,255,${0.32 * k})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, ry, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/*
 * 성운 같은 빛무리 — 크고 작은 빛 덩어리와 가로로 긴 줄기를 겹치고 군데군데 파낸 무늬
 * 덩어리·파낸 자리마다 정해진(시드 고정) 위치를 중심으로 제각각 다른 속도로 떠다니고,
 * 밝기·크기도 천천히 오르내려 시간이 지날수록 모양이 계속 바뀜 (매 프레임 다시 그림)
 * dense: 후반용 — 더 조밀하고 가장자리가 덜 흐려짐
 */
const NW = 640;
const NH = 320;
const nebulaPuffs = new Map();
function nebulaPuffList(dense) {
  if (nebulaPuffs.has(dense)) return nebulaPuffs.get(dense);
  const rng = mulberry32(dense ? 5113 : 2087);
  const gauss = () => (rng() + rng() + rng() - 1.5) / 1.5; // -1~1, 가운데에 몰림
  // 움직임: 중심 둘레를 가로·세로 각각 다른 속도로 오가고, 밝기·크기가 숨 쉬듯 바뀜
  const motion = () => ({
    ax: (0.02 + rng() * 0.06) * NW, ay: (0.03 + rng() * 0.08) * NH,
    wx: 0.25 + rng() * 0.7, wy: 0.2 + rng() * 0.6, wa: 0.4 + rng() * 1.1, ph: rng() * 6.28,
  });
  const spread = dense ? 0.75 : 1;
  const list = [];
  // 빛 덩어리
  for (let i = 0; i < (dense ? 260 : 200); i++) {
    list.push({ x: NW / 2 + gauss() * NW * 0.42 * spread, y: NH / 2 + gauss() * NH * 0.38 * spread,
      r: 8 + Math.pow(rng(), 2) * (dense ? 45 : 60), a: (dense ? 0.05 : 0.04) + rng() * 0.08, sx: 1 + rng() * 0.8, sy: 1, ...motion() });
  }
  // 가로로 조금 뻗은 옅은 줄기
  for (let i = 0; i < 24; i++) {
    list.push({ x: NW / 2 + gauss() * NW * 0.35, y: NH / 2 + gauss() * NH * 0.35,
      r: 12 + rng() * 25, a: 0.03 + rng() * 0.05, sx: 2 + rng() * 2, sy: 0.6 + rng() * 0.4, ...motion() });
  }
  // 군데군데 파내 구름 결을 만듦 (파낸 자리도 움직여 결이 계속 바뀜)
  for (let i = 0; i < (dense ? 40 : 70); i++) {
    list.push({ x: rng() * NW, y: rng() * NH, r: 8 + rng() * 30, a: 0.12 + rng() * 0.25, sx: 1.5 + rng(), sy: 1, carve: true, ...motion() });
  }
  nebulaPuffs.set(dense, list);
  return list;
}

function nebulaLayer(dense, t) {
  const { canvas: c, ctx: g } = layer(dense ? 'o2-nebula2' : 'o2-nebula', NW, NH);
  for (const p of nebulaPuffList(dense)) {
    const x = p.x + p.ax * Math.sin(t * p.wx + p.ph);
    const y = p.y + p.ay * Math.sin(t * p.wy + p.ph * 1.7);
    const breath = Math.sin(t * p.wa + p.ph * 2.3);
    const a = p.a * (1 + 0.45 * breath);
    const r = p.r * (1 + 0.15 * breath);
    g.globalCompositeOperation = p.carve ? 'destination-out' : 'source-over';
    g.save();
    g.translate(x, y);
    g.scale(p.sx, p.sy);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
    rg.addColorStop(0, `rgba(255,255,255,${a})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(-r, -r, r * 2, r * 2);
    g.restore();
  }
  // 전체 윤곽: 타원 모양으로 가장자리를 흐림 (후반은 더 또렷하게)
  g.globalCompositeOperation = 'destination-in';
  g.save();
  g.translate(NW / 2, NH / 2);
  g.scale(NW / NH, 1);
  const edge = g.createRadialGradient(0, 0, 0, 0, 0, NH / 2);
  edge.addColorStop(0, 'rgba(0,0,0,1)');
  edge.addColorStop(dense ? 0.7 : 0.35, 'rgba(0,0,0,1)');
  edge.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = edge;
  g.fillRect(-NH / 2, -NH / 2, NH, NH);
  g.restore();
  g.globalCompositeOperation = 'source-over';
  return c;
}

// rx·ry: 반폭·반높이(px), k: 밝기 (1 넘으면 한 번 더 겹침), t: 시간(초) — 무늬가 시간에 따라 바뀜
function drawNebula(ctx, cx, cy, rx, ry, k, t, dense) {
  if (k <= 0) return;
  const tex = nebulaLayer(dense, t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let left = k; left > 0; left -= 1) {
    ctx.globalAlpha = Math.min(1, left);
    ctx.drawImage(tex, cx - rx, cy - ry, rx * 2, ry * 2);
  }
  ctx.restore();
}

/*
 * 십자 섬광: 가로·세로로 가늘게 뻗는 빛 (가운데 원 없음)
 * lenX·lenY: 가로·세로 반길이(px), th: 두께(px), blur: 흐림(px)
 */
function drawCross(ctx, x, y, k, lenX, lenY, th, blur = 0) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (blur > 0) {
    if (FILTER_SUPPORTED) ctx.filter = `blur(${blur}px)`;
    else {
      ctx.shadowColor = 'rgba(255,255,255,1)';
      ctx.shadowBlur = blur * 2;
    }
  }
  const line = (x0, y0, x1, y1, horizontal) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${Math.min(1, k)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    if (horizontal) ctx.fillRect(x0, y - th / 2, x1 - x0, th);
    else ctx.fillRect(x - th / 2, y0, th, y1 - y0);
  };
  if (lenX > 0) line(x - lenX, y, x + lenX, y, true);
  if (lenY > 0) line(x, y - lenY, x, y + lenY, false);
  ctx.restore();
}

/* ---------- ⑥ 제목이 제자리에서 세로축으로 돌며 나타남 (글자마다 폭이 0 → 원래 폭, 페이드 인 없음) ---------- */
function drawSpinTitle(ctx, s, W, H, cx, y, p) {
  const chars = [...(s.text || '')];
  if (!chars.length || p <= 0) return;
  const px = (s.size / 100) * H;
  ctx.save();
  ctx.font = fontStr(s, px);
  const widths = chars.map(c => ctx.measureText(c).width * ((s.scaleX ?? 100) / 100));
  ctx.restore();
  const sp = s.spacing * px; // 자리는 처음부터 그대로, 글자만 제자리에서 돎
  const total = widths.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let x = cx - total / 2;
  const n = chars.length;
  chars.forEach((c, i) => {
    const pi = clamp01(p * 1.15 - (0.15 * i) / Math.max(1, n - 1)); // 글자마다 살짝 시차
    const k = Math.max(0.02, Math.sin((pi * Math.PI) / 2));
    drawText(ctx, { ...s, text: c, spacing: 0, scaleX: (s.scaleX ?? 100) * k }, W, H, x + widths[i] / 2, y, 'center');
    x += widths[i] + sp;
  });
}

/* ---------- ⑥~⑦ 세로로 긴 사각형·마름모 입자 ---------- */
const shardCache = new Map();
function drawShards(ctx, W, H, t, start, end, seed) {
  if (t < start || t > end + 1) return;
  if (!shardCache.has(seed)) {
    const rng = mulberry32(seed * 3301 + 17);
    shardCache.set(seed, Array.from({ length: 46 }, () => {
      const side = rng() < 0.75; // 대부분 양옆에
      const u = rng();
      return {
        x: side ? (u < 0.5 ? u * 0.5 : 0.75 + (u - 0.5) * 0.5) : 0.25 + u * 0.5,
        y: 0.08 + rng() * 0.84,
        born: rng() * 0.75, // 구간 안에서 생기는 시점 (비율)
        life: 0.25 + rng() * 0.45,
        size: 0.008 + Math.pow(rng(), 2.2) * 0.04,
        rect: rng() < 0.45,
        vy: -(0.01 + rng() * 0.04),
        ph: rng() * 6.28,
      };
    }));
  }
  const span = Math.max(0.1, end - start);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = 'rgba(255,255,255,0.8)';
  ctx.shadowBlur = H * 0.01;
  for (const d of shardCache.get(seed)) {
    const age = (t - start) / span - d.born;
    if (age < 0 || age > d.life) continue;
    const q = age / d.life;
    const a = (q < 0.2 ? q / 0.2 : 1 - (q - 0.2) / 0.8) * (0.75 + 0.25 * Math.sin(d.ph + t * 14));
    const h = d.size * H;
    const w = d.rect ? h * 0.3 : h * 0.55;
    const x = d.x * W;
    const y = (d.y + d.vy * age * span) * H;
    ctx.fillStyle = `rgba(255,255,255,${0.75 * a})`;
    if (d.rect) ctx.fillRect(x - w / 2, y - h / 2, w, h);
    else {
      ctx.beginPath();
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x, y + h / 2);
      ctx.lineTo(x - w / 2, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/*
 * ---------- ⑧ 위아래에서 계속 생기는 빛구슬 (위쪽은 아래로, 아래쪽은 위로) ----------
 * density: 개수 배율, size: 크기 배율, travel: 움직이는 거리 배율, opacity: 밝기
 * 입자마다 4.5초 주기로 다시 생겨나 끝날 때까지 이어짐
 */
const orbCache = new Map();
function drawOrbs(ctx, W, H, t, start, seed, { density = 1, size = 1, travel = 1, opacity = 1 } = {}) {
  const count = Math.round(90 * density);
  if (t < start || count <= 0 || opacity <= 0) return;
  const key = `${seed}:${count}`;
  if (!orbCache.has(key)) {
    const rng = mulberry32(seed * 7717 + 3);
    orbCache.set(key, Array.from({ length: count }, (_, i) => ({
      top: i % 2 === 0,
      x: rng(),
      born: rng() * 10,
      life: 1.2 + rng() * 1.8,
      travel: 0.06 + Math.pow(rng(), 0.8) * 0.2,
      r: 0.003 + Math.pow(rng(), 2) * 0.012,
      ph: rng() * 6.28,
    })));
    if (orbCache.size > 6) orbCache.delete(orbCache.keys().next().value);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const d of orbCache.get(key)) {
    const since = t - start - d.born * 0.45;
    if (since < 0) continue;
    const age = since % 4.5;
    if (age > d.life) continue;
    const k = age / d.life;
    const a = opacity * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * (0.7 + 0.3 * Math.sin(d.ph + age * 6));
    const move = d.travel * travel * (1 - Math.pow(1 - k, 2));
    const y = (d.top ? -0.01 + move : 1.01 - move) * H;
    const x = d.x * W;
    const r = d.r * H * 3 * size;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${Math.min(1, 0.85 * a)})`);
    g.addColorStop(0.3, `rgba(255,255,255,${0.35 * a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

/* ---------- ④ 일렁임 · ⑤ 글리치 (장면 전체를 가공) ---------- */
// 글리치 띠: 위치·높이·속도는 고정, 프레임마다 조금씩 떨림
const bands = (() => {
  const rng = mulberry32(9001);
  const out = [];
  let y = 0;
  while (y < 1) {
    const h = 0.01 + Math.pow(rng(), 1.5) * 0.07;
    out.push({ y, h, speed: 0.25 + rng() * 1.4, dir: rng() < 0.88 ? -1 : 0.3 });
    y += h;
  }
  return out;
})();

function distort(src, W, H, t, wob, gl) {
  let cur = src;
  if (wob > 0) {
    const { canvas, ctx: d } = layer('o2-wobble', W, H);
    d.drawImage(cur, 0, 0);
    const amp = wob * W * 0.012;
    const hs = Math.max(2, Math.round(H / 200));
    for (let y = 0; y < H; y += hs) {
      const v = y / H;
      const dx = amp * (Math.sin(v * Math.PI * 5 + t * 9) + 0.45 * Math.sin(v * Math.PI * 13 - t * 15));
      const dy = amp * 0.25 * Math.sin(v * Math.PI * 3 + t * 7);
      d.drawImage(cur, 0, y, W, hs, dx, y + dy, W, hs);
    }
    cur = canvas;
  }
  if (gl > 0) {
    const { canvas, ctx: d } = layer('o2-glitch', W, H);
    d.globalAlpha = 1 - gl;
    d.drawImage(cur, 0, 0);
    d.globalAlpha = 1;
    const q = Math.floor(t * 24); // 초당 24번 바뀌는 떨림
    const rng = mulberry32(q * 9973 + 7);
    const fly = Math.pow(gl, 1.7);
    for (const b of bands) {
      const y = b.y * H;
      const h = Math.ceil(b.h * H);
      const dx = b.dir * fly * b.speed * W + (rng() - 0.5) * 0.04 * W * gl;
      d.drawImage(cur, 0, y, W, h, dx, y, W, h);
    }
    // 밝은 조각들
    const n = Math.round(46 * gl);
    for (let i = 0; i < n; i++) {
      const bw = (0.03 + rng() * 0.22) * W;
      const bh = (0.01 + Math.pow(rng(), 2) * 0.1) * H;
      const sx = rng() * W;
      const sy = rng() * H;
      const dx = sx - rng() * 0.4 * W * gl;
      if (rng() < 0.35) {
        d.fillStyle = `rgba(255,255,255,${0.15 + rng() * 0.45})`;
        d.fillRect(dx, sy, bw, bh);
      } else {
        d.globalCompositeOperation = rng() < 0.5 ? 'lighter' : 'source-over';
        d.drawImage(cur, sx, sy, bw, bh, dx, sy, bw, bh);
        d.globalCompositeOperation = 'source-over';
      }
    }
    d.globalCompositeOperation = 'lighter';
    d.fillStyle = `rgba(255,255,255,${0.12 * gl})`;
    d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'source-over';
    cur = canvas;
  }
  return cur;
}

// 장면 전체에 테마 색을 색조로 입힘 (밝기는 그대로)
function colorize(c, W, H, color, lift) {
  c.save();
  if (lift > 0) {
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,255,255,${lift})`;
    c.fillRect(0, 0, W, H);
  }
  c.globalCompositeOperation = 'color';
  c.fillStyle = color;
  c.fillRect(0, 0, W, H);
  c.restore();
}

export function drawOutro2Frame(ctx, W, H, state, images, time) {
  const A = state.anim;
  const t = time * A.outroSpeed - A.o2Delay; // 0 보다 작으면 원래 카드 그대로
  const L = state.logo;
  const lx = (L.x / 100) * W;
  const ly = (L.y / 100) * H;
  const T = id => stageTime(A, id);
  const E = (name, p) => ease(A[name], p);
  const [switchS] = T('o2Rays');
  const part2 = t >= switchS;
  const endStart = holdStart(A) + A.o2Hold;
  const FADE = fadeLength(A);
  const ink = clamp01(E('easeO2Dark', prog(t, ...T('o2Dark'))));
  const poly = (c, w, h) => drawPoly(c, w, h, A);

  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 원래 카드 (렌즈 플레어 없음)
  if (ink < 1) {
    const { canvas, ctx: d } = layer('o2-day', W, H);
    const dayState = { ...state, logo: { ...L, flare: false }, title: { ...state.title, flare: false } };
    drawCard(d, W, H, dayState, images, { afterBackground: poly });
    ctx.drawImage(canvas, 0, 0);
  }

  if (ink > 0) {
    const { main, sub } = textStyles(state, part2 ? 2 : 1);
    const ty = (A.o2Y / 100) * H;
    const px = (main.size / 100) * H;
    const midY = ty - px * 0.38; // 제목 글자 가운데 높이
    const night = toNight(state);
    const [shapesS, shapesE] = T('o2Shapes');
    // 원래 카드의 연대·제목·부제는 무늬가 돌아가는 동안 사라짐
    const oldA = part2 ? 0 : 1 - prog(t, shapesS, shapesE);
    const logoOut = clamp01(E('easeO2Logo', prog(t, ...T('o2Logo'))));
    const logoIn = prog(t, switchS, switchS + 0.5);
    const nightState = {
      ...night,
      bg: { ...night.bg, brightness: night.bg.brightness * (part2 ? 0.28 : 0.4) }, // 색을 입히면 밝아 보이므로 더 어둡게 (후반은 더)
      left: { ...night.left, alpha: 0 },
      right: { ...night.right, alpha: 0 },
      topLine: { ...night.topLine, show: false },
      bottomLine: { ...night.bottomLine, opacity: night.bottomLine.opacity * oldA },
      era: { ...night.era, alpha: 0.7 * oldA },
      title: { ...night.title, alpha: 0.7 * oldA },
      sub: { ...night.sub, alpha: 0.7 * oldA },
      // 후반: 테마 색 로고(글로우 없음)가 ⑧에서 완전히 사라짐
      logo: part2 ? {
        ...night.logo,
        tintColor: A.o2Color2,
        opacity: logoIn * (1 - logoOut),
        glowOpacity: 0, // 글로우 없음
        glowBlur: 2.2,
        glowStrength: 2,
        backShadow: 0,
        edgeStrength: 0,
      } : { ...night.logo, show: false }, // 초반에는 로고 없음
    };

    const [wobS, wobE] = T('o2Wobble');
    const wob = part2 ? 0 : clamp01(E('easeO2Wobble', prog(t, wobS, wobE)));
    const gl = part2 ? 0 : clamp01(E('easeO2Glitch', prog(t, ...T('o2Glitch'))));
    const shapeP = clamp01(E('easeO2Shapes', prog(t, shapesS, shapesE)));
    const shapeA = part2 ? 0 : 0.1; // 마름모·사각형·원 모두 옅게
    const orbS = T('o2Orbs')[0];
    const nebula2 = part2 ? clamp01(E('easeO2Sub2', prog(t, ...T('o2Sub2')))) : 0; // 후반 빛무리는 부제와 함께 나타남
    const rays = part2 ? 1 - clamp01(E('easeO2Rays', prog(t, ...T('o2Rays')))) : 0;

    const { canvas: scene, ctx: n } = layer('o2-scene', W, H);
    drawCard(n, W, H, nightState, images, {
      afterBackground: (c, w, h) => {
        poly(c, w, h);
        drawShapes(c, h, w / 2, (A.o2ShapeY / 100) * h, shapeP, shapeA, (A.o2DiamondSize / 100) * h);
        if (part2) {
          // 섬광이 터질 때 화면 가운데가 밝게 (중앙 광선이 사라지며 함께 줄어듦)
          drawHalo(c, w / 2, midY, w * 0.5, h * 0.45, 0.4 * rays);
          // ⑧ 빛구슬과 함께: 위아래 가장자리로 갈수록 테마 색에 가까워짐 (o2EdgeGlow: 세기, o2EdgeSize: 가장자리에서 퍼지는 높이 %H)
          const edgeK = prog(t, orbS, orbS + 0.8);
          if (edgeK > 0 && A.o2EdgeGlow > 0) {
            const g = c.createLinearGradient(0, 0, 0, h);
            const a = A.o2EdgeGlow * edgeK;
            const e = Math.min(0.5, A.o2EdgeSize / 100);
            g.addColorStop(0, `rgba(255,255,255,${a})`);
            g.addColorStop(e, 'rgba(255,255,255,0)');
            g.addColorStop(1 - e, 'rgba(255,255,255,0)');
            g.addColorStop(1, `rgba(255,255,255,${a})`);
            c.save();
            c.globalCompositeOperation = 'lighter';
            c.fillStyle = g;
            c.fillRect(0, 0, w, h);
            c.restore();
          }
        }
      },
    });

    if (!part2) {
      // ③ 초반 제목·부제: 펼쳐지며 나타나고 빛무리가 커짐 (일렁임이 시작되면 더 밝아짐)
      const [t1S, t1E] = T('o2Text1');
      const sp = clamp01(E('easeO2Text1', prog(t, t1S, t1E)));
      const glowK = sp * (1 + 0.7 * wob);
      drawNebula(n, W / 2, midY, (A.o2NebulaW / 100) * W * (0.6 + 0.4 * sp), (A.o2NebulaH / 100) * H, glowK, t, false);
      drawText(n, { ...main, alpha: sp, spacing: main.spacing * (0.35 + 0.65 * sp), glowOpacity: 0.9 * sp }, W, H, W / 2, ty, 'center');
      drawText(n, { ...sub, alpha: clamp01(sp * 1.4 - 0.2), spacing: sub.spacing * (0.5 + 0.5 * sp) }, W, H, W / 2, (A.o2SubY / 100) * H, 'center');
      // 오른쪽 위·왼쪽 아래 십자 섬광
      const [cS, cE] = T('o2Cross');
      const ck = bell(t, cS, cS + (cE - cS) * 0.35, cE) + 0.35 * wob;
      if (ck > 0) {
        const args = [ck * A.o2CrossOpacity, (A.o2CrossLenX / 100) * W, (A.o2CrossLenY / 100) * H,
          Math.max(1, (A.o2CrossThick / 100) * H), (A.o2CrossBlur / 100) * H];
        drawCross(n, (A.o2Cross1X / 100) * W, (A.o2Cross1Y / 100) * H, ...args);
        drawCross(n, (A.o2Cross2X / 100) * W, (A.o2Cross2Y / 100) * H, ...args);
      }
    } else {
      // ⑥ 중앙 십자 광선 + 후반 제목 / ⑦ 부제 / 입자들
      drawCross(n, W / 2, midY, rays, W * 0.75, H * 0.75, Math.max(1.5, H * 0.004));
      drawHalo(n, W / 2, midY, W * 0.45, H * 0.07, rays * 1.2);
      drawNebula(n, W / 2, midY, (A.o2Nebula2W / 100) * W, (A.o2Nebula2H / 100) * H, nebula2 * 0.45, t, true);
      // ⑦ 아웃트로와 같은 육각형 회로 무늬가 아래에서 올라옴 (흰색으로 그려 테마 색이 입혀짐)
      if (A.hexGrid) {
        drawCircuitBand(n, W, H, clamp01(E('easeO2Circuit', prog(t, ...T('o2Circuit')))), {
          seed: A.seed, color: '#ffffff', opacity: 0.45, band: 0.3, style: 'penta', trail: 0, twinkle: 0.5, t,
          image: images.circuitOutro,
        });
      }
      const [bS, bE] = T('o2Bits');
      drawShards(n, W, H, t, bS, bE, A.seed);
      drawOrbs(n, W, H, t, orbS, A.seed, { density: A.o2OrbDensity, size: A.o2OrbSize, travel: A.o2OrbTravel, opacity: A.o2OrbOpacity });
      const p2 = clamp01(E('easeO2Text2', prog(t, ...T('o2Text2'))));
      drawSpinTitle(n, { ...main, glowOpacity: 0.75 }, W, H, W / 2, ty, p2);
      drawText(n, { ...sub, alpha: nebula2 }, W, H, W / 2, (A.o2SubY / 100) * H, 'center');
    }

    const out = wob > 0 || gl > 0 ? distort(scene, W, H, t, wob, gl) : scene;
    // 결과 캔버스에 직접 색을 입힘 (매 프레임 새로 그리는 작업용 캔버스)
    const oc = out.getContext('2d');
    colorize(oc, W, H, part2 ? A.o2Color2 : A.o2Color1, 0);
    drawRevealMask(ctx, W, H, out, lx, ly, ink, 1, A.revealAspect);
  }

  // ⑨ 중앙부터 완전히 어두워짐
  drawBlot(ctx, W, H, W / 2, H / 2, clamp01(E('easeO2End', prog(t, endStart, endStart + 1.0))), A.revealAspect);
  fillOverlay(ctx, W, H, '#000000', clamp01(E('easeO2End', prog(t, endStart + 0.3, endStart + FADE))));
  ctx.restore();
}
