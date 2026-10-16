/*
 * 임시 로고 생성기 — 연대·제목 문자열로 GitHub 기본 프로필(identicon)처럼 좌우대칭 패턴 문장(紋章)을 만듦
 * 같은 문자열 + 같은 옵션이면 항상 같은 결과가 나옴
 *
 * 알고리즘
 *  1. 입력 문자열 = `${연대}\u0000${제목}` (대소문자·공백 그대로)
 *  2. cyrb53 해시(53비트) → 하위 32비트를 시드로 mulberry32 난수열 생성
 *  3. N×N 격자(N 홀수)에서 가운데 열 포함 왼쪽 절반 칸을 위→아래, 왼쪽→오른쪽 순서로 훑으며
 *     칸 중심이 실루엣(원·사각형 등) 안에 있으면 난수 < 채움 비율 일 때 칠함
 *  4. 왼쪽 절반을 오른쪽에 거울처럼 복사 (좌우대칭)
 *  5. 칠한 칸이 실루엣 안 칸의 25% 미만이면 가운데 열을 모두 칠해 너무 비지 않게 함
 *  6. 테두리 옵션이 켜져 있으면 실루엣 외곽선을 그림
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

/* 실루엣 — 좌표 (x, y) 는 -1~1 (y 는 아래로 증가). inside: 안쪽 판정, path: 외곽선 */
export const LOGO_SHAPES = {
  circle: {
    label: '원형',
    inside: (x, y) => x * x + y * y <= 0.94,
    path: (g, r) => g.arc(0, 0, r * 0.97, 0, Math.PI * 2),
  },
  square: {
    label: '사각형',
    inside: (x, y) => Math.abs(x) <= 0.86 && Math.abs(y) <= 0.86,
    path: (g, r) => g.rect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8),
  },
  diamond: {
    label: '마름모',
    inside: (x, y) => Math.abs(x) + Math.abs(y) <= 0.95,
    path: (g, r) => poly(g, r, [[0, -1], [1, 0], [0, 1], [-1, 0]]),
  },
  triangle: {
    label: '삼각형',
    inside: (x, y) => y <= 0.72 && y >= -0.92 + 1.75 * Math.abs(x),
    path: (g, r) => poly(g, r, [[0, -1], [0.98, 0.8], [-0.98, 0.8]]),
  },
  hexagon: {
    label: '육각형',
    inside: (x, y) => Math.abs(x) <= 0.8 && 0.5 * Math.abs(x) + 0.866 * Math.abs(y) <= 0.8,
    path: (g, r) => poly(g, r, [[0, -1], [0.87, -0.5], [0.87, 0.5], [0, 1], [-0.87, 0.5], [-0.87, -0.5]]),
  },
  shield: {
    label: '방패',
    inside: (x, y) => (y <= 0.1 ? Math.abs(x) <= 0.82 && y >= -0.86 : (x / 0.82) ** 2 + ((y - 0.1) / 0.84) ** 2 <= 1),
    path: (g, r) => {
      g.moveTo(-0.88 * r, -0.92 * r);
      g.lineTo(0.88 * r, -0.92 * r);
      g.lineTo(0.88 * r, 0.1 * r);
      g.quadraticCurveTo(0.88 * r, 0.75 * r, 0, r);
      g.quadraticCurveTo(-0.88 * r, 0.75 * r, -0.88 * r, 0.1 * r);
      g.closePath();
    },
  },
};

function poly(g, r, pts) {
  pts.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r)));
  g.closePath();
}

export const LOGO_CELLS = {
  square: '사각 칸',
  dot: '원형 점',
  diamond: '마름모 칸',
};

// 반환: 투명 배경 PNG dataURL
export function generateLogo({ era, title, shape = 'shield', grid = 9, density = 0.5, frame = true, cell = 'square', color = '#1d2127', size = 640 }) {
  const N = Math.max(5, Math.round(grid) | 1); // 홀수
  const S = LOGO_SHAPES[shape] || LOGO_SHAPES.shield;
  const rng = mulberry32(cyrb53(`${era}\u0000${title}`) >>> 0);

  // 2~4. 왼쪽 절반을 채우고 좌우대칭 복사
  const mid = (N - 1) / 2;
  const on = Array.from({ length: N }, () => new Array(N).fill(false));
  const inside = (r, c) => S.inside(((c + 0.5) / N) * 2 - 1, ((r + 0.5) / N) * 2 - 1);
  let insideCount = 0;
  let filled = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c <= mid; c++) {
      const roll = rng(); // 실루엣 밖 칸도 난수를 소비해 같은 격자에서는 결과가 안정적
      if (!inside(r, c)) continue;
      insideCount += c === mid ? 1 : 2;
      if (roll < density) {
        on[r][c] = on[r][N - 1 - c] = true;
        filled += c === mid ? 1 : 2;
      }
    }
  }
  // 5. 너무 비면 가운데 열을 채움
  if (filled < insideCount * 0.25) for (let r = 0; r < N; r++) if (inside(r, mid)) on[r][mid] = true;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  const pad = size * 0.04;
  const R = size / 2 - pad;
  const cs = (R * 2) / N; // 칸 크기
  g.translate(size / 2, size / 2);
  g.fillStyle = color;
  g.strokeStyle = color;

  // 칸 그리기
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!on[r][c]) continue;
      const x = -R + c * cs;
      const y = -R + r * cs;
      g.beginPath();
      if (cell === 'dot') g.arc(x + cs / 2, y + cs / 2, cs * 0.44, 0, Math.PI * 2);
      else if (cell === 'diamond') poly(g, 1, [[x + cs / 2, y], [x + cs, y + cs / 2], [x + cs / 2, y + cs], [x, y + cs / 2]]);
      else g.rect(x - 0.5, y - 0.5, cs + 1, cs + 1); // 이웃 칸과 틈 없이
      g.fill();
    }
  }

  // 6. 실루엣 테두리
  if (frame) {
    g.lineWidth = cs * 0.45;
    g.lineJoin = 'round';
    g.beginPath();
    S.path(g, R + cs * 0.15);
    g.stroke();
  }
  return canvas.toDataURL('image/png');
}
