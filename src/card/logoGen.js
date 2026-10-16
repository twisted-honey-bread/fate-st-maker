/*
 * 임시 로고 생성기 — 연대·제목 문자열로 GitHub 기본 프로필(identicon)처럼 좌우대칭 패턴 문장(紋章)을 만듦
 * 형태마다 어울리는 하위 요소로 실루엣을 쪼개고, 해시에서 나온 난수열이 각 하위 요소를 칠할지 정함
 * 같은 문자열 + 같은 옵션이면 항상 같은 결과가 나옴
 *
 * 알고리즘
 *  1. 입력 문자열 = `${연대}\u0000${제목}` (대소문자·공백 그대로)
 *  2. cyrb53 해시(53비트) → 하위 32비트를 시드로 mulberry32 난수열 생성
 *  3. 선택한 형태를 하위 요소로 분할 (형태별 분할 방식은 아래 SHAPES 참고, 격자 크기 N 이 분할 개수를 정함)
 *     하위 요소는 좌우대칭 쌍(또는 세로축 위의 단독 요소)으로 묶여 있고, 정해진 순서로 나열됨
 *  4. 나열 순서대로 쌍마다 난수를 하나씩 뽑아, 난수 < 채움 비율 이면 쌍을 함께 칠함 (→ 좌우대칭)
 *  5. 칠한 요소가 전체의 25% 미만이면 세로축 위 요소를 모두 칠해 너무 비지 않게 함
 *  6. 간격 옵션만큼 각 요소를 자기 중심 쪽으로 줄이고, 테두리 옵션이 켜져 있으면 실루엣 외곽선을 그림
 */

// cyrb53 — 짧은 문자열용 53비트 해시 (공개 도메인 알고리즘)
export function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/*
 * 하위 요소 = 다각형(점 배열). 단위(unit) = { polys: [다각형, 거울 다각형?], center: 세로축 위인지 }
 * 좌표는 실루엣 반지름 R 기준, 중심이 (0, 0), y 는 아래로 증가
 */
const mirror = poly => poly.map(([x, y]) => [-x, y]);
const pair = (poly, isCenter) => ({ polys: isCenter ? [poly] : [poly, mirror(poly)], center: isCenter });

// 사각형: GitHub 처럼 N×N 작은 정사각형
function squareUnits(N, R) {
  const s = (R * 1.8) / N;
  const o = -R * 0.9;
  const mid = (N - 1) / 2;
  const units = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= mid; c++) {
      const x = o + c * s;
      const y = o + r * s;
      units.push(pair([[x, y], [x + s, y], [x + s, y + s], [x, y + s]], c === mid));
    }
  }
  return units;
}

// 원형: 극좌표 — 가운데 원판 + 동심원 고리를 호(부채꼴 조각)로 나눔 (바깥 고리일수록 조각이 많음)
function circleUnits(N, R) {
  const K = Math.max(2, Math.ceil(N / 2)); // 고리 수 (가운데 원판 포함)
  const units = [];
  const arc = (r, a0, a1, steps) => Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [r * Math.sin(a), -r * Math.cos(a)]; // 각도 0 = 위쪽, 시계 방향
  });
  // 가운데 원판
  units.push(pair(arc(R / K, 0, Math.PI * 2, 24), true));
  for (let k = 1; k < K; k++) {
    const r0 = (R * k) / K;
    const r1 = (R * (k + 1)) / K;
    const M = 2 * Math.max(2, Math.round(Math.PI * (k + 0.5))); // 짝수 → 좌우대칭
    const w = (Math.PI * 2) / M;
    // 오른쪽 절반의 조각 j (0 = 맨 위에서 시작) ↔ 왼쪽 절반의 M-1-j
    for (let j = 0; j < M / 2; j++) {
      const outer = arc(r1, j * w, (j + 1) * w, 6);
      const inner = arc(r0, (j + 1) * w, j * w, 6);
      units.push(pair([...outer, ...inner], false));
    }
  }
  return units;
}

// 마름모: 45도 돌린 격자 — 작은 마름모들
function diamondUnits(N, R) {
  const units = [];
  const toXY = (u, v) => [((u - v) / 2) * R, ((u + v) / 2) * R]; // (u, v) ∈ [-1, 1]² → |x| + |y| ≤ R
  const step = 2 / N;
  for (let i = 0; i < N; i++) {
    for (let j = i; j < N; j++) {
      const u0 = -1 + i * step;
      const v0 = -1 + j * step;
      const poly = [toXY(u0, v0), toXY(u0 + step, v0), toXY(u0 + step, v0 + step), toXY(u0, v0 + step)];
      // (i, j) 의 거울은 (j, i) — i === j 면 세로축 위
      units.push(pair(poly, i === j));
    }
  }
  return units;
}

// 삼각형: 작은 정삼각형 메시 (위·아래 방향이 번갈아 나옴)
function triangleUnits(N, R) {
  const top = -R;
  const height = R * 1.8;
  const side = (height / Math.sqrt(3)) * 2 / N; // 밑변 길이 / N
  const h = height / N;
  const units = [];
  for (let r = 0; r < N; r++) {
    const yT = top + r * h;
    const yB = yT + h;
    const xt = k => -r * (side / 2) + k * side; // 윗줄 꼭짓점
    const xb = k => -(r + 1) * (side / 2) + k * side; // 아랫줄 꼭짓점
    // 위 방향 삼각형 k (0..r), 거울은 r-k
    for (let k = 0; k <= r / 2; k++) units.push(pair([[xt(k), yT], [xb(k + 1), yB], [xb(k), yB]], k === r - k));
    // 아래 방향 삼각형 k (0..r-1), 거울은 r-1-k
    for (let k = 0; k <= (r - 1) / 2; k++) units.push(pair([[xt(k), yT], [xt(k + 1), yT], [xb(k + 1), yB]], k === r - 1 - k));
  }
  return units;
}

// 육각형: 벌집 — 작은 육각형들이 큰 육각형을 이룸
function hexagonUnits(N, R) {
  const m = Math.max(1, Math.floor(N / 2));
  const s = (R * 0.95) / (Math.sqrt(3) * (m + 0.5));
  const hex = (cx, cy) => Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6; // 꼭짓점이 위아래로 향함
    return [cx + s * Math.cos(a), cy + s * Math.sin(a)];
  });
  const units = [];
  for (let r = -m; r <= m; r++) {
    for (let q = -m; q <= m; q++) {
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > m) continue;
      const x = s * Math.sqrt(3) * (q + r / 2);
      if (x > 1e-6) continue; // 왼쪽 절반 + 세로축만 (오른쪽은 거울)
      units.push(pair(hex(x, s * 1.5 * r), Math.abs(x) < 1e-6));
    }
  }
  return units;
}

// 방패: 격자를 방패 모양으로 잘라냄 (그릴 때 방패 외곽으로 클리핑)
function shieldUnits(N, R) {
  const inside = (x, y) => (y <= 0.1 * R ? Math.abs(x) <= 0.88 * R && y >= -0.92 * R
    : (x / (0.88 * R)) ** 2 + ((y - 0.1 * R) / (0.9 * R)) ** 2 <= 1);
  return squareUnits(N, R).filter(u => {
    const p = u.polys[0];
    const cx = (p[0][0] + p[2][0]) / 2;
    const cy = (p[0][1] + p[2][1]) / 2;
    return inside(cx, cy) || inside(p[0][0], p[0][1]) || inside(p[1][0], p[2][1]);
  });
}

function poly(g, pts) {
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

/* 형태 — units: 하위 요소 분할, outline: 테두리, clip: 하위 요소를 실루엣으로 잘라낼지 */
export const LOGO_SHAPES = {
  square: {
    label: '사각형 (작은 사각형 격자)',
    units: squareUnits,
    outline: (g, r) => g.rect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8),
  },
  circle: {
    label: '원형 (동심원과 호)',
    units: circleUnits,
    outline: (g, r) => g.arc(0, 0, r, 0, Math.PI * 2),
  },
  diamond: {
    label: '마름모 (작은 마름모 격자)',
    units: diamondUnits,
    outline: (g, r) => poly(g, [[0, -r], [r, 0], [0, r], [-r, 0]]),
  },
  triangle: {
    label: '삼각형 (삼각형 메시)',
    units: triangleUnits,
    outline: (g, r) => {
      const side = ((r * 1.8) / Math.sqrt(3)) * 2;
      poly(g, [[0, -r], [side / 2, r * 0.8], [-side / 2, r * 0.8]]);
    },
  },
  hexagon: {
    label: '육각형 (벌집)',
    units: hexagonUnits,
    outline: (g, r) => poly(g, Array.from({ length: 6 }, (_, i) => [r * Math.cos((Math.PI / 3) * i), r * Math.sin((Math.PI / 3) * i)])),
  },
  shield: {
    label: '방패 (격자를 방패로 자름)',
    units: shieldUnits,
    clip: true,
    outline: (g, r) => {
      g.moveTo(-0.88 * r, -0.92 * r);
      g.lineTo(0.88 * r, -0.92 * r);
      g.lineTo(0.88 * r, 0.1 * r);
      g.quadraticCurveTo(0.88 * r, 0.78 * r, 0, r);
      g.quadraticCurveTo(-0.88 * r, 0.78 * r, -0.88 * r, 0.1 * r);
      g.closePath();
    },
  },
};

// 다각형을 자기 무게중심 쪽으로 k 만큼 줄임 (하위 요소 사이 간격)
function shrink(pts, k) {
  if (k <= 0) return pts;
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return pts.map(([x, y]) => [cx + (x - cx) * (1 - k), cy + (y - cy) * (1 - k)]);
}

// 반환: 투명 배경 PNG dataURL
export function generateLogo({
  era, title, shape = 'shield', grid = 9, density = 0.5, gap = 0.12, frame = true, color = '#1d2127', size = 640,
}) {
  const N = Math.max(3, Math.round(grid) | 1); // 홀수
  const S = LOGO_SHAPES[shape] || LOGO_SHAPES.shield;
  const rng = mulberry32(cyrb53(`${era}\u0000${title}`) >>> 0);

  const pad = size * 0.05;
  const R = size / 2 - pad;
  const units = S.units(N, R * (frame ? 0.9 : 1));

  // 4. 나열 순서대로 난수를 뽑아 쌍을 함께 칠함
  const on = units.map(() => rng() < density);
  // 5. 너무 비면 세로축 위 요소를 채움
  const total = units.reduce((a, u) => a + u.polys.length, 0);
  const filled = units.reduce((a, u, i) => a + (on[i] ? u.polys.length : 0), 0);
  if (filled < total * 0.25) units.forEach((u, i) => { if (u.center) on[i] = true; });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  g.translate(size / 2, size / 2);
  g.fillStyle = color;
  g.strokeStyle = color;

  g.save();
  if (S.clip) {
    g.beginPath();
    S.outline(g, R * (frame ? 0.9 : 1));
    g.clip();
  }
  g.beginPath();
  units.forEach((u, i) => {
    if (!on[i]) return;
    for (const p of u.polys) poly(g, shrink(p, gap));
  });
  g.fill();
  g.restore();

  // 6. 실루엣 테두리
  if (frame) {
    g.lineWidth = R * 0.06;
    g.lineJoin = 'round';
    g.beginPath();
    S.outline(g, R * 0.98);
    g.stroke();
  }
  return canvas.toDataURL('image/png');
}
