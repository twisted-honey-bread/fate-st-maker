/*
 * 기본값 — 원본 스크린샷(16:9)의 비율을 측정해 맞춘 값
 * 위치/크기: x·가로 관련은 %W, y·세로·폰트 크기·번짐은 %H
 */
export const CARD_WIDTH = 1920;
export const CARD_HEIGHT = 1080;

export const TEXT_BASE = {
  show: true, text: '', font: 'Noto Sans KR', weight: 400, italic: false,
  size: 5, spacing: 0, x: 50, y: 50,
  fillMode: 'solid', color: '#333333', color2: '#000000',
  strokeWidth: 0, strokeColor: '#ffffff',
  glowColor: '#ffffff', glowOpacity: 0, glowBlur: 0.5, glowStrength: 1,
  shadowColor: '#000000', shadowOpacity: 0, shadowBlur: 0.4, shadowX: 0, shadowY: 0.15,
};

export const DEFAULTS = {
  bg: {
    zoom: 100, posX: 50, posY: 50,
    brightness: 112, contrast: 78, saturate: 55, blur: 0,
    washColor: '#ffffff', washOpacity: 0.35,
    fogBottom: 0.55,
    vignetteColor: '#ffffff', vignette: 0.8, vignetteSize: 45,
    glowColor: '#ffffff', glowOpacity: 0.6, glowRadius: 24,
    snow: true, snowCount: 160, snowOpacity: 0.75,
  },
  left: {
    ...TEXT_BASE, text: 'Lostbelt No.1', font: 'Noto Serif', weight: 700, size: 6.0, spacing: 0.03,
    x: 6, y: 11.4, fillMode: 'gradient', color: '#3d5a80', color2: '#1a2740',
    glowOpacity: 0.9, glowBlur: 0.5,
  },
  right: {
    ...TEXT_BASE, text: '이문심도_D', font: 'Noto Sans KR', weight: 300, size: 4.3,
    x: 94.3, y: 10.6, color: '#545961', glowOpacity: 0.8, glowBlur: 0.4,
  },
  topLine: { show: true, y: 12.6, thickness: 0.22, color: '#3a4048', opacity: 0.85, left: 3, right: 1.8, fade: 10 },
  logo: {
    show: true, x: 50.3, y: 40, height: 33, opacity: 1,
    tint: false, tintColor: '#1d2127',
    glowColor: '#ffffff', glowOpacity: 0.95, glowBlur: 2.5, glowStrength: 2,
    flare: true, flareColor: '#4fb8ff', flareX: 8.9, flareY: -6.7,
    flareLength: 9, flareThickness: 0.9, flareIntensity: 0.9,
  },
  era: {
    ...TEXT_BASE, text: 'A.D.1570?', font: 'Noto Serif', weight: 700, size: 3.4, spacing: 0.02,
    color: '#1f3d6b', glowOpacity: 1, glowBlur: 0.5, glowStrength: 2,
    position: 'left', gap: 1.6, offsetY: -0.6,
  },
  title: {
    ...TEXT_BASE, text: '영구동토제국 아나스타샤', font: 'HCR Batang', weight: 700, size: 8.4, spacing: 0.16,
    x: 50, y: 72.4, anchor: 'group',
    fillMode: 'gradient', color: '#45c0ee', color2: '#0b4f9a',
    strokeWidth: 0.28, strokeColor: '#ffffff',
    glowColor: '#0a2a50', glowOpacity: 0.35, glowBlur: 0.7,
  },
  bottomLine: { show: true, y: 77.6, thickness: 0.14, color: '#7d838b', opacity: 0.8, left: 6, right: 6, fade: 18 },
  sub: {
    ...TEXT_BASE, text: '짐승 나라의 황녀', font: 'HCR Batang', weight: 400, size: 5.4,
    x: 50, y: 89.4, color: '#4b4f56', glowOpacity: 0.8, glowBlur: 0.4,
  },
};

export const clone = o => JSON.parse(JSON.stringify(o));

// 저장된 값 중 현재 스키마에 있는 키만, 같은 타입일 때만 반영 (버전이 바뀌어도 안전하게 불러오기)
export function mergeKnown(def, src) {
  const out = clone(def);
  if (!src || typeof src !== 'object') return out;
  for (const k of Object.keys(out)) {
    if (!(k in src)) continue;
    if (out[k] && typeof out[k] === 'object') out[k] = mergeKnown(out[k], src[k]);
    else if (typeof src[k] === typeof out[k]) out[k] = src[k];
  }
  return out;
}
