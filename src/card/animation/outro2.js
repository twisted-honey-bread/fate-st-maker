import { TEXT_BASE } from '../defaults';
import { drawCard, drawText, measureText } from '../renderer';
import { fontStr } from '../fonts';
import { mulberry32 } from '../utils';
import { toNight } from './night';
import { drawBlot, drawRevealMask, fillOverlay } from './effects';
import { bell, clamp01, ease, layer, mixHex, prog } from './util';
import { stageTime } from './timing';

/*
 * 아웃트로 2 (증명완료 → 증명불가)
 *  ① 로고에서부터 화면이 어두워짐
 *  ② (①이 끝나갈 때부터) 배경의 사각형·마름모·원 무늬가 돌며 정렬됨
 *  ③ 정렬이 끝나면 초반 제목·부제가 펼쳐지며 빛무리가 생기고, 거의 다 펼쳐질 때 오른쪽 위·왼쪽 아래에 십자 섬광
 *  ④ 화면이 일렁이기 시작
 *  ⑤ 글리치가 생기며 화면이 왼쪽으로 쪼개지듯 날아감
 *  ⑥ 테마 색이 후반 색으로 바뀌며 중앙에 커다란 십자 광선(점점 사라짐) + 후반 제목이 돌며 나타남
 *  ⑦ 후반 부제 페이드 인 (⑥~⑦ 동안 세로로 긴 사각형·마름모 입자)
 *  ⑧ 로고가 어두워지며 완성 (위아래에서 빛구슬이 계속 떨어짐)
 *  ⑨ 유지 시간 뒤 중앙에서부터 어두워짐
 * 전체 내내 배경 위에 고정된 삼각형 무늬가 깔림
 * 어두워진 장면은 흑백에 가깝게 그린 뒤 테마 색을 색조로 입힘 (밝은 부분은 흰빛, 어두운 부분은 짙은 테마 색)
 */
const holdStart = A => Math.max(stageTime(A, 'o2Logo')[1], stageTime(A, 'o2Sub2')[1]);
const fadeLength = A => stageTime(A, 'o2End')[1];

export const outro2Duration = state => (holdStart(state.anim) + state.anim.o2Hold + fadeLength(state.anim)) / state.anim.outroSpeed;

function textStyles(state, part) {
  const A = state.anim;
  const main = {
    ...TEXT_BASE,
    text: part === 1 ? A.o2Text1 : A.o2Text2,
    font: A.outroFont,
    weight: A.outroWeight,
    size: A.o2Size,
    spacing: A.o2Spacing,
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
    spacing: A.o2SubSpacing,
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

function drawPoly(ctx, W, H, A, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(polyLayer(W, H, A.o2PolySize, A.o2PolySparse), 0, 0);
  ctx.restore();
}

/* ---------- ② 사각형·마름모·원 무늬 (p: 0 = 돌아가 있음, 1 = 정렬) ---------- */
function drawShapes(ctx, W, H, cx, cy, p, alpha) {
  if (alpha <= 0) return;
  const off = 1 - p;
  const sc = 1 + 0.14 * off;
  const s = 0.37 * H;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, H * 0.0026);
  ctx.shadowColor = 'rgba(255,255,255,0.7)';
  ctx.shadowBlur = H * 0.006;
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);
  // 사각형
  ctx.save();
  ctx.rotate(-0.75 * off);
  ctx.strokeRect(-s, -s, s * 2, s * 2);
  ctx.restore();
  // 마름모 (큰 사각형을 45° 돌린 것)
  ctx.save();
  ctx.rotate(Math.PI / 4 + 0.95 * off);
  const m = 0.73 * H / Math.SQRT2;
  ctx.strokeRect(-m, -m, m * 2, m * 2);
  ctx.restore();
  // 원 — 끊긴 곳이 있어 도는 것이 보임
  ctx.save();
  ctx.rotate(1.4 * off);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.98, (i * Math.PI) / 2 + 0.06, ((i + 1) * Math.PI) / 2 - 0.06);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

/* ---------- 빛 ---------- */
// 가로로 긴 타원형 빛무리 (lighter)
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

// 십자 섬광: 가로·세로로 가늘게 뻗는 빛 + 가운데 밝은 점
function drawCross(ctx, x, y, k, lenX, lenY, th) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const line = (x0, y0, x1, y1, horizontal) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${k})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    if (horizontal) ctx.fillRect(x0, y - th / 2, x1 - x0, th);
    else ctx.fillRect(x - th / 2, y0, th, y1 - y0);
  };
  line(x - lenX, y, x + lenX, y, true);
  line(x, y - lenY, x, y + lenY, false);
  const r = th * 14;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${0.9 * k})`);
  g.addColorStop(0.25, `rgba(255,255,255,${0.35 * k})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/* ---------- ⑥ 제목이 세로축으로 돌며 나타남 (글자마다 폭이 0 → 원래 폭) ---------- */
function drawSpinTitle(ctx, s, W, H, cx, y, p) {
  const chars = [...(s.text || '')];
  if (!chars.length || p <= 0) return;
  const px = (s.size / 100) * H;
  ctx.save();
  ctx.font = fontStr(s, px);
  const widths = chars.map(c => ctx.measureText(c).width * ((s.scaleX ?? 100) / 100));
  ctx.restore();
  const sp = s.spacing * px * (1 + 0.5 * (1 - p)); // 넓게 벌어진 채로 돌다가 제자리로 모임
  const total = widths.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let x = cx - total / 2;
  const n = chars.length;
  chars.forEach((c, i) => {
    const pi = clamp01(p * 1.3 - (0.3 * i) / Math.max(1, n - 1)); // 글자마다 살짝 시차
    const k = Math.max(0.02, Math.sin((pi * Math.PI) / 2));
    drawText(ctx, { ...s, text: c, spacing: 0, scaleX: (s.scaleX ?? 100) * k, alpha: (s.alpha ?? 1) * Math.min(1, pi * 4) }, W, H, x + widths[i] / 2, y, 'center');
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

/* ---------- ⑧ 위아래에서 계속 떨어지는 빛구슬 (위쪽은 아래로, 아래쪽은 위로) ---------- */
const orbCache = new Map();
function drawOrbs(ctx, W, H, t, start, seed) {
  if (t < start) return;
  if (!orbCache.has(seed)) {
    const rng = mulberry32(seed * 7717 + 3);
    orbCache.set(seed, Array.from({ length: 90 }, (_, i) => ({
      top: i % 2 === 0,
      x: rng(),
      born: rng() * 10,
      life: 1.2 + rng() * 1.8,
      travel: 0.06 + Math.pow(rng(), 0.8) * 0.2,
      r: 0.003 + Math.pow(rng(), 2) * 0.012,
      ph: rng() * 6.28,
    })));
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const d of orbCache.get(seed)) {
    const age = t - start - d.born * 0.45;
    if (age < 0 || age > d.life) continue;
    const k = age / d.life;
    const a = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * (0.7 + 0.3 * Math.sin(d.ph + age * 6));
    const move = d.travel * (1 - Math.pow(1 - k, 2));
    const y = (d.top ? -0.01 + move : 1.01 - move) * H;
    const x = d.x * W;
    const r = d.r * H * 3;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.85 * a})`);
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
  const t = time * A.outroSpeed;
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
  const poly = (c, w, h) => drawPoly(c, w, h, A, 0.05);

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
    const darken = clamp01(E('easeO2Logo', prog(t, ...T('o2Logo'))));
    const logoIn = prog(t, switchS, switchS + 0.5);
    const nightState = {
      ...night,
      bg: { ...night.bg, brightness: night.bg.brightness * 0.4 }, // 색을 입히면 밝아 보이므로 더 어둡게
      left: { ...night.left, alpha: 0 },
      right: { ...night.right, alpha: 0 },
      topLine: { ...night.topLine, show: false },
      bottomLine: { ...night.bottomLine, opacity: night.bottomLine.opacity * oldA },
      era: { ...night.era, alpha: 0.7 * oldA },
      title: { ...night.title, alpha: 0.7 * oldA },
      sub: { ...night.sub, alpha: 0.7 * oldA },
      // 초반: 옅은 실루엣 / 후반: 밝게 빛나다가 ⑧에서 검게 어두워짐 (글로우도 함께 사라짐)
      logo: part2 ? {
        ...night.logo,
        tintColor: mixHex('#ffffff', A.outroLogoDark, darken),
        opacity: logoIn,
        glowColor: '#ffffff',
        glowOpacity: 0.75 * (1 - darken),
        glowBlur: 2.2,
        glowStrength: 2,
        backShadow: 0,
        edgeStrength: 0,
      } : { ...night.logo, opacity: 0.1, glowOpacity: 0.1, backShadow: 0, edgeStrength: 0 },
    };

    const [wobS, wobE] = T('o2Wobble');
    const wob = part2 ? 0 : clamp01(E('easeO2Wobble', prog(t, wobS, wobE)));
    const gl = part2 ? 0 : clamp01(E('easeO2Glitch', prog(t, ...T('o2Glitch'))));
    const shapeP = clamp01(E('easeO2Shapes', prog(t, shapesS, shapesE)));
    const shapeA = part2 ? 0 : 0.5 * prog(t, shapesS, shapesS + 0.4);
    const rays = part2 ? 1 - clamp01(E('easeO2Rays', prog(t, ...T('o2Rays')))) : 0;

    const { canvas: scene, ctx: n } = layer('o2-scene', W, H);
    drawCard(n, W, H, nightState, images, {
      afterBackground: (c, w, h) => {
        poly(c, w, h);
        drawShapes(c, w, h, w / 2, h / 2, shapeP, shapeA);
        // 후반: 화면 가운데가 밝게 (중앙 광선이 사라지며 함께 줄어듦)
        if (part2) drawHalo(c, w / 2, midY, w * 0.5, h * 0.45, 0.07 + 0.4 * rays);
      },
    });

    if (!part2) {
      // ③ 초반 제목·부제: 펼쳐지며 나타나고 빛무리가 커짐 (일렁임이 시작되면 더 밝아짐)
      const [t1S, t1E] = T('o2Text1');
      const sp = clamp01(E('easeO2Text1', prog(t, t1S, t1E)));
      const glowK = sp * (1 + 0.7 * wob);
      drawHalo(n, W / 2, midY, W * (0.25 + 0.2 * sp), H * 0.11, glowK);
      drawText(n, { ...main, alpha: sp, spacing: main.spacing * (0.35 + 0.65 * sp), glowOpacity: 0.9 * sp }, W, H, W / 2, ty, 'center');
      drawText(n, { ...sub, alpha: clamp01(sp * 1.4 - 0.2), spacing: sub.spacing * (0.5 + 0.5 * sp) }, W, H, W / 2, (A.o2SubY / 100) * H, 'center');
      // 오른쪽 위·왼쪽 아래 십자 섬광
      const [cS, cE] = T('o2Cross');
      const ck = bell(t, cS, cS + (cE - cS) * 0.35, cE) + 0.35 * wob;
      if (ck > 0) {
        const tw = measureText(n, main, H);
        const th = Math.max(1, H * 0.0028);
        drawCross(n, W / 2 + tw / 2 + W * 0.01, ty - px * 0.95, ck, W * 0.32, H * 0.42, th);
        drawCross(n, W / 2 - tw / 2 - W * 0.01, ty + px * 0.12, ck, W * 0.32, H * 0.42, th);
      }
    } else {
      // ⑥ 중앙 십자 광선 + 후반 제목 / ⑦ 부제 / 입자들
      drawCross(n, W / 2, midY, rays, W * 0.75, H * 0.75, Math.max(1.5, H * 0.004));
      drawHalo(n, W / 2, midY, W * 0.45, H * 0.07, rays * 1.2);
      const [bS, bE] = T('o2Bits');
      drawShards(n, W, H, t, bS, bE, A.seed);
      drawOrbs(n, W, H, t, T('o2Orbs')[0], A.seed);
      const p2 = clamp01(E('easeO2Text2', prog(t, ...T('o2Text2'))));
      drawSpinTitle(n, { ...main, glowOpacity: 0.75 }, W, H, W / 2, ty, p2);
      drawText(n, { ...sub, alpha: clamp01(E('easeO2Sub2', prog(t, ...T('o2Sub2')))) }, W, H, W / 2, (A.o2SubY / 100) * H, 'center');
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
