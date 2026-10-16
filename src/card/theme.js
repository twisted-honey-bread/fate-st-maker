/*
 * 색 한 번에 맞추기 — 제목의 위쪽 색(대표색) 하나로 관련 색들을 자동으로 정함
 * 대표색의 색조(hue)는 그대로 두고, 요소마다 채도·밝기만 원본 카드의 관계에 맞춰 조절
 */
function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function hslToHex(h, s, l) {
  const clamp = v => Math.max(0, Math.min(1, v));
  s = clamp(s);
  l = clamp(l);
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

// 대표색(primary)을 기준으로 바뀌는 색 목록 — [경로, (h, s, l) => 색]
const RULES = [
  ['title.color', (h, s, l) => hslToHex(h, s, l)],
  ['title.glowColor', (h, s) => hslToHex(h, Math.max(0.85, s), 0.8)],
  ['era.color', (h, s, l) => hslToHex(h, s * 0.8, l * 0.85)],
  ['era.glowColor', (h, s) => hslToHex(h, Math.max(0.85, s), 0.8)],
  ['left.color', (h, s) => hslToHex(h, s * 0.6, 0.48)],
  ['left.glowColor', (h, s) => hslToHex(h, Math.max(0.85, s), 0.8)],
  ['right.glowColor', (h, s) => hslToHex(h, Math.max(0.85, s), 0.8)],
  ['topLine.color', (h, s) => hslToHex(h, s * 0.5, 0.53)],
  ['sub.color', (h) => hslToHex(h, 0.08, 0.52)],
  ['logo.flareColor', (h) => hslToHex(h, 1, 0.65)],
  ['title.flareColor', (h) => hslToHex(h, 1, 0.65)],
  ['logo.backShadowColor', (h, s) => hslToHex(h, s * 0.35, 0.15)],
  ['anim.introLineColor', (h, s) => hslToHex(h, Math.max(0.85, s), 0.78)],
];

/*
 * 그라데이션 지점 목록 — 지점마다 밝기는 그대로 두고 색조(hue)만 대표색으로 바꿈
 * 채도는 대표색이 지금 제목 색보다 옅거나 진한 만큼 비례해서 조절 (회색 지점은 회색으로 남음, 같은 색을 다시 적용해도 그대로)
 */
const STOP_PATHS = ['title.stops', 'era.stops', 'left.stops', 'topLine.stops', 'sub.stops'];
const shiftStops = (stops, h, satK) =>
  stops.map(([p, c]) => {
    const [, cs, cl] = hexToHsl(c);
    return [p, hslToHex(h, Math.min(1, cs * satK), cl)];
  });

// 패널에 보여줄 묶음 (같은 색이 여러 곳에 쓰이면 대표 경로 하나만, *.stops 는 그라데이션 띠로 표시)
export const THEME_GROUPS = [
  { label: '제목 · 연대', paths: ['title.stops', 'era.stops'] },
  { label: '왼쪽 위 글자 · 상단선', paths: ['left.stops', 'topLine.stops'] },
  { label: '글로우 · 렌즈 플레어 · 선 빛', paths: ['title.glowColor', 'logo.flareColor', 'anim.introLineColor'] },
  { label: '부제 · 로고 뒤 그림자', paths: ['sub.stops', 'logo.backShadowColor'] },
];

const getAt = (state, path) => {
  const [sec, key] = path.split('.');
  return state[sec][key];
};

const ALL_PATHS = [...RULES.map(([p]) => p), ...STOP_PATHS];

// 대표색을 적용했을 때 각 경로의 값 (미리보기·적용 공통)
export function themeColors(state, primary) {
  const [h, s, l] = hexToHsl(primary);
  const satK = s / Math.max(0.05, hexToHsl(state.title.color)[1]);
  return Object.fromEntries([
    ...RULES.map(([path, rule]) => [path, rule(h, s, l)]),
    ...STOP_PATHS.map(path => [path, shiftStops(getAt(state, path), h, satK)]),
  ]);
}

export const currentThemeColors = state => Object.fromEntries(ALL_PATHS.map(path => [path, getAt(state, path)]));

// 테마가 바꾸는 색들을 기본값으로 — 반환 형식은 applyColorTheme 과 같음
export function resetColorTheme(state, defaults) {
  const previous = currentThemeColors(state);
  return { next: restoreColors(state, currentThemeColors(defaults)), previous };
}

// 반환: { next: 새 상태, previous: 바뀌기 전 값들 (되돌리기용) }
export function applyColorTheme(state, primary) {
  return { next: restoreColors(state, themeColors(state, primary)), previous: currentThemeColors(state) };
}

export function restoreColors(state, previous) {
  const next = { ...state };
  for (const [path, value] of Object.entries(previous)) {
    const [sec, key] = path.split('.');
    next[sec] = { ...next[sec], [key]: value };
  }
  return next;
}
