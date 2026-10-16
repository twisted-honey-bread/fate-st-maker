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
  ['title.color2', (h, s) => hslToHex(h, Math.min(0.55, s), 0.07)],
  ['title.glowColor', (h, s) => hslToHex(h, Math.max(0.85, s), 0.8)],
  ['era.color', (h, s, l) => hslToHex(h, s * 0.8, l * 0.85)],
  ['era.color2', (h, s) => hslToHex(h, Math.min(0.55, s), 0.07)],
  ['era.glowColor', (h, s) => hslToHex(h, Math.max(0.85, s), 0.8)],
  ['left.color', (h, s) => hslToHex(h, s * 0.6, 0.48)],
  ['left.color2', (h, s) => hslToHex(h, s * 0.15, 0.18)],
  ['left.glowColor', (h, s) => hslToHex(h, Math.max(0.85, s), 0.8)],
  ['right.glowColor', (h, s) => hslToHex(h, Math.max(0.85, s), 0.8)],
  ['topLine.color', (h, s) => hslToHex(h, s * 0.5, 0.53)],
  ['topLine.color2', (h, s) => hslToHex(h, s * 0.12, 0.2)],
  ['sub.color', (h) => hslToHex(h, 0.08, 0.52)],
  ['sub.color2', (h) => hslToHex(h, 0.1, 0.23)],
  ['logo.flareColor', (h) => hslToHex(h, 1, 0.65)],
  ['logo.backShadowColor', (h, s) => hslToHex(h, s * 0.35, 0.15)],
  ['anim.introLineColor', (h, s) => hslToHex(h, Math.max(0.85, s), 0.78)],
];

// 반환: { next: 새 상태, previous: 바뀌기 전 값들 (되돌리기용) }
export function applyColorTheme(state, primary) {
  const [h, s, l] = hexToHsl(primary);
  const next = { ...state };
  const previous = {};
  for (const [path, rule] of RULES) {
    const [sec, key] = path.split('.');
    previous[path] = state[sec][key];
    next[sec] = { ...next[sec], [key]: rule(h, s, l) };
  }
  return { next, previous };
}

export function restoreColors(state, previous) {
  const next = { ...state };
  for (const [path, value] of Object.entries(previous)) {
    const [sec, key] = path.split('.');
    next[sec] = { ...next[sec], [key]: value };
  }
  return next;
}
