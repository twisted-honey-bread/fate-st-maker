/*
 * 기본값 — 원본 스크린샷(16:9)의 비율을 측정해 맞춘 값
 * 위치/크기: x·가로 관련은 %W, y·세로·폰트 크기·번짐은 %H
 */
export const CARD_WIDTH = 1920;
export const CARD_HEIGHT = 1080;

export const TEXT_BASE = {
  show: true, text: '', font: 'Noto Sans KR', weight: 400, italic: false,
  size: 5, spacing: 0, x: 50, y: 50,
  fillMode: 'solid', color: '#333333', color2: '#000000', mirrorCenter: 0.08, mirrorScope: 'text',
  strokeWidth: 0, strokeColor: '#ffffff',
  glowColor: '#ffffff', glowOpacity: 0, glowBlur: 0.5, glowStrength: 1,
  shadowColor: '#000000', shadowOpacity: 0, shadowBlur: 0.4, shadowX: 0, shadowY: 0.15,
};

export const DEFAULTS = {
  bg: {
    // 업로드한 사진을 설원 일러스트 톤으로 변환 (절차적 기본 배경에는 적용 안 함)
    styleMode: 'duotone', styleExposure: 0.22, styleContrast: 1.15, styleLevels: 4,
    styleThreshold: 0.5, styleEdge: 0.08, styleBlur: 0.1, styleInk: '#56636f', stylePaper: '#f3f7fa',
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
    x: 6, y: 11.4, fillMode: 'mirror', mirrorScope: 'canvas', color: '#3f78b5', color2: '#262c34', mirrorCenter: 0.12,
    glowColor: '#9ad8ff', glowOpacity: 0.85, glowBlur: 0.45, glowStrength: 2,
  },
  right: {
    ...TEXT_BASE, text: '이문심도_D', font: 'Noto Sans KR', weight: 300, size: 4.3,
    x: 94.3, y: 10.6, color: '#545961', glowColor: '#9ad8ff', glowOpacity: 0.85, glowBlur: 0.45, glowStrength: 2,
  },
  topLine: {
    show: true, y: 12.6, thickness: 0.22, fillMode: 'mirror', color: '#4f86bf', color2: '#2c3138', mirrorCenter: 0.15,
    opacity: 0.85, left: 3, right: 1.8, fade: 10,
  },
  logo: {
    show: true, x: 50.3, y: 40, height: 33, opacity: 1,
    tint: false, tintColor: '#1d2127',
    glowColor: '#ffffff', glowOpacity: 0.95, glowBlur: 2.5, glowStrength: 2,
    flare: true, flareColor: '#4fb8ff', flareX: 8.9, flareY: -6.7,
    flareLength: 9, flareThickness: 0.9, flareIntensity: 0.9, flareAspect: 1.5, flareBlend: 'screen', flareSolid: 0.6,
    edgeColor: '#6e4526', edgeStrength: 0.55, edgeWidth: 0.4,
    backShadow: 0.24, backShadowColor: '#1c2733', backShadowSize: 34,
  },
  era: {
    ...TEXT_BASE, text: 'A.D.1570?', font: 'Noto Serif', weight: 700, size: 3.4, spacing: 0.02,
    fillMode: 'mirror', color: '#2b78c2', color2: '#0b1626', mirrorCenter: 0.05,
    glowColor: '#9ad8ff', glowOpacity: 0.9, glowBlur: 0.45, glowStrength: 2,
    position: 'left', gap: 1.6, offsetY: -0.6,
  },
  title: {
    ...TEXT_BASE, text: '영구동토제국 아나스타샤', font: 'HCR Batang', weight: 700, size: 8.4, spacing: 0.16,
    x: 50, y: 72.4, anchor: 'group',
    fillMode: 'mirror', color: '#2f9fe8', color2: '#0b1626', mirrorCenter: 0.06,
    glowColor: '#9ad8ff', glowOpacity: 0.85, glowBlur: 0.55, glowStrength: 2,
  },
  bottomLine: {
    show: true, y: 77.6, thickness: 0.14, fillMode: 'solid', color: '#7d838b', color2: '#4a4f56', mirrorCenter: 0.15,
    opacity: 0.8, left: 6, right: 6, fade: 18,
  },
  sub: {
    ...TEXT_BASE, text: '짐승 나라의 황녀', font: 'HCR Batang', weight: 400, size: 5.4,
    x: 50, y: 89.4, fillMode: 'mirror', color: '#7a828d', color2: '#33383f', mirrorCenter: 0.08, mirrorScope: 'text',
    glowOpacity: 0.8, glowBlur: 0.4,
  },
  // 애니메이션 (인트로 / 아웃트로·공상절제)
  anim: {
    mode: 'still', // still | intro | outro
    introSpeed: 1, // 재생 속도 (1 = 기본, 작을수록 느림)
    outroSpeed: 1,
    nightTint: '#0d1626',
    introHold: 2,
    introLineColor: '#8fd0ff',
    introFlash: false,
    introZoom: 1.06,
    introBlur: 0.5,
    circuit: true,
    circuitColor: '#8b949e',
    circuitOpacity: 0.4,
    outroText: '공상절제',
    outroSub: 'Cosmos Denial',
    outroFont: 'HCR Batang',
    outroWeight: 700,
    outroSubFont: 'Noto Serif',
    outroSize: 24.5,
    outroY: 60,
    outroSpacing: 0.42,
    outroSubSize: 7,
    outroSubSpacing: 0.72,
    outroSubY: 75.1,
    outroColor: '#ffffff',
    outroColor2: '#d8bd88',
    outroColor3: '#cfe2f5',
    outroColorStop: 0.72,
    outroGlow: '#ffd98a',
    outroHold: 3.5,
    flareColor: '#ffd27a',
    // 섬광의 방사형 광선
    rayCount: 6,
    rayAngle: 90,
    rayLength: 55,
    rayWidthStart: 0.15,
    rayWidthEnd: 3,
    rayOpacity: 0.32,
    rayCore: 0.75,
    rayFade: 0.3,
    rayStartLength: 0.8, // 처음 나타날 때의 길이 비율 (0.8 = 80% 길이에서 시작해 100%까지)
    outroLogoColor: '#c3cad3',
    outroLogoDark: '#14161b',
    particleDensity: 1,
    particleColor: '#fffef4',
    particleGlow: '#fff0b8',
    particleGlowSize: 3,
    particleSquash: 0.45,
    seed: 1,
    riseDensity: 1,
    hexGrid: true,
    // 단계별 움직임 곡선 (EASINGS 이름) — 기본값은 지금까지 쓰던 곡선과 같음
    easeIntroFade: 'outCubic',
    easeIntroLine: 'outCubic',
    easeIntroHeader: 'outCubic',
    easeIntroLogo: 'outCubic',
    easeIntroReveal: 'inOutCubic',
    easeIntroTitle: 'outCubic',
    easeIntroSub: 'outCubic',
    easeIntroZoom: 'linear',
    easeIntroCircuit: 'linear',
    easeOutroInk: 'inOutCubic',
    easeOutroDarken: 'inOutCubic',
    easeOutroSpread: 'outCubic',
    easeOutroText: 'inOutCubic',
    easeOutroCircuit: 'linear',
    easeOutroEnd: 'inCubic',
    easeOutroRays: 'outCubic',
    fps: 30,
    gifFps: 15,
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
