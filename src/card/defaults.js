/*
 * 기본값 — 원본 스크린샷(16:9)의 비율을 측정해 맞춘 값
 * 위치/크기: x·가로 관련은 %W, y·세로·폰트 크기·번짐은 %H
 */
export const CARD_WIDTH = 1920;
export const CARD_HEIGHT = 1080;

import { isSymmetric, mirrorStops } from './gradient';
// 앱의 ‘레포 기본값으로 저장’ 버튼이 덮어쓰는 파일 — 여기 있는 값이 아래 기본값보다 우선
import SAVED_DEFAULTS from './defaults.json';

export const TEXT_BASE = {
  show: true, text: '', font: 'Noto Sans KR', weight: 400, italic: false,
  size: 5, spacing: 0, scaleX: 100, x: 50, y: 50, // scaleX: 장평 % (100 = 원래 폭, 작을수록 좁음)
  // 채우기: solid = 단색(color) | horizontal = 가로 그라데이션 | vertical = 세로 그라데이션 (stops 사용)
  // mirrorScope: 가로 그라데이션 기준 — text = 글자 폭, canvas = 화면 폭
  fillMode: 'solid', color: '#333333', stops: [[0, '#333333'], [1, '#000000']], symmetric: false, mirrorScope: 'text',
  strokeWidth: 0, strokeColor: '#ffffff',
  glowColor: '#ffffff', glowOpacity: 0, glowBlur: 0.5, glowStrength: 1,
  shadowColor: '#000000', shadowOpacity: 0, shadowBlur: 0.4, shadowX: 0, shadowY: 0.15,
};

// 코드에 적어 둔 기본값 (항목 목록·자료형의 기준). 실제 기본값 = 이것 + defaults.json
const BASE_DEFAULTS = {
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
    x: 6, y: 11.4, fillMode: 'horizontal', mirrorScope: 'canvas', color: '#3f78b5', stops: mirrorStops('#3f78b5', '#262c34', 0.12), symmetric: true,
    glowColor: '#9ad8ff', glowOpacity: 0.85, glowBlur: 0.45, glowStrength: 2,
  },
  right: {
    // text = '_' 앞, after = '_' 뒤 (인트로에서 로고와 함께 나타남) — 따로 입력하므로 각 칸에 '_' 가 들어가도 됨
    ...TEXT_BASE, text: '이문심도', after: 'D', font: 'Noto Sans KR', weight: 300, size: 4.3,
    x: 94.3, y: 10.6, color: '#545961', stops: [[0, '#545961'], [1, '#2b2f35']], glowColor: '#9ad8ff', glowOpacity: 0.85, glowBlur: 0.45, glowStrength: 2,
  },
  topLine: {
    show: true, y: 12.6, thickness: 0.22, fillMode: 'horizontal', color: '#4f86bf', stops: mirrorStops('#4f86bf', '#2c3138', 0.15), symmetric: true,
    opacity: 0.85, left: 3, right: 1.8, fade: 10,
  },
  logo: {
    show: true, x: 50.3, y: 40, height: 33, zoom: 100, opacity: 1, // 실제 높이 = height × zoom%
    source: 'upload', // upload = 직접 업로드(없으면 기본 로고) | generate = 연대·제목으로 자동 생성
    // 임시 로고 생성 옵션 (연대·제목으로 패턴 생성)
    genShape: 'shield', genGrid: 9, genDensity: 0.5, genGap: 0.12, genFrame: true, genColor: '#1d2127',
    tint: false, tintColor: '#1d2127',
    glowColor: '#ffffff', glowOpacity: 0.3, glowBlur: 2.5, glowStrength: 2,
    flare: true, flareColor: '#4fb8ff', flareX: 8.9, flareY: -6.7,
    flareLength: 9, flareThickness: 0.9, flareIntensity: 0.9, flareAspect: 1.5, flareBlend: 'screen', flareSolid: 0.6,
    edgeColor: '#6e4526', edgeStrength: 0.55, edgeWidth: 0.4,
    backShadow: 0.24, backShadowColor: '#1c2733', backShadowSize: 34,
  },
  era: {
    ...TEXT_BASE, text: 'A.D.1570?', font: 'Noto Serif', weight: 700, size: 3.4, spacing: 0.02,
    fillMode: 'horizontal', color: '#2b78c2', stops: mirrorStops('#2b78c2', '#0b1626', 0.05), symmetric: true,
    glowColor: '#9ad8ff', glowOpacity: 0.9, glowBlur: 0.45, glowStrength: 2,
    position: 'left', gap: 1.6, offsetY: -0.6,
  },
  title: {
    ...TEXT_BASE, text: '영구동토제국 아나스타샤', font: 'HCR Batang', weight: 700, size: 8.4, spacing: 0.16,
    x: 50, y: 72.4, anchor: 'group',
    fillMode: 'horizontal', color: '#2f9fe8', stops: mirrorStops('#2f9fe8', '#0b1626', 0.06), symmetric: true,
    glowColor: '#9ad8ff', glowOpacity: 0.85, glowBlur: 0.55, glowStrength: 2,
  },
  bottomLine: {
    show: true, y: 77.6, thickness: 0.14, fillMode: 'solid', color: '#7d838b', stops: mirrorStops('#7d838b', '#4a4f56', 0.15), symmetric: true,
    opacity: 0.8, left: 6, right: 6, fade: 18,
  },
  sub: {
    ...TEXT_BASE, text: '짐승 나라의 황녀', font: 'HCR Batang', weight: 400, size: 5.4,
    x: 50, y: 89.4, fillMode: 'horizontal', color: '#7a828d', stops: mirrorStops('#7a828d', '#33383f', 0.08), symmetric: true, mirrorScope: 'text',
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
    // 어두워졌을 때 비네트: 배경 원형 비네트(인트로·아웃트로) + 인트로의 네 귀퉁이 비네트
    nightVignette: 0.97,
    nightVignetteSize: 28,
    introCornerVignette: 0.9,
    introCornerSize: 38,
    // 어두워졌을 때의 구름·안개 노이즈 — 진하기(불투명도), 자욱함(덮는 면적), 덩어리 크기
    fogOpacity: 0.25,
    fogCoverage: 0.35,
    fogScale: 1,
    fogColor: '#b9c2cc',
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
    outroScaleX: 100,
    outroSubSize: 7,
    outroSubSpacing: 0.72,
    outroSubScaleX: 100,
    outroSubY: 75.1,
    // 문구 세로 그라데이션: 위(흰색) → 중간(금색) → 맨 아래에서 한 번 더 바뀜(옅은 파랑)
    outroStops: [[0, '#ffffff'], [0.6, '#d8bd88'], [0.72, '#d8bd88'], [1, '#cfe2f5']],
    outroSymmetric: false,
    outroGlow: '#ffd98a',
    outroHold: 3.5,
    flareColor: '#ffd27a',
    // 섬광의 방사형 광선
    rayCount: 6,
    rayAngle: 90,
    rayLength: 40,
    rayWidthStart: 2,
    rayWidthEnd: 10,
    rayOpacity: 0.15,
    rayFade: 0.3,
    rayStartLength: 0.6, // 처음 나타날 때의 길이 비율 (0.6 = 60% 길이에서 시작해 100%까지)
    outroLogoColor: '#ffffff', // 어두워질 때 함께 순백 실루엣
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

// 오른쪽 위에 실제로 그릴 문자열: 앞 + '_' + 뒤 (뒤가 비면 앞만)
export const rightText = r => (r.after ? `${r.text}_${r.after}` : r.text);

// 예전 저장값을 지금 형식으로
export function migrateSettings(src) {
  if (!src || typeof src !== 'object') return src;
  const out = { ...src };
  // 오른쪽 위를 한 칸에 '이문심도_D' 처럼 입력 → 앞/뒤 두 칸
  const r = out.right;
  if (r && typeof r.text === 'string' && r.after === undefined) {
    const i = r.text.indexOf('_');
    out.right = { ...r, text: i >= 0 ? r.text.slice(0, i) : r.text, after: i >= 0 ? r.text.slice(i + 1) : '' };
  }
  // 색 1·색 2(+가운데 폭) → 그라데이션 지점 목록
  for (const k of ['left', 'right', 'era', 'title', 'sub', 'topLine', 'bottomLine']) {
    const s = out[k];
    if (!s || s.stops !== undefined || typeof s.color !== 'string') continue;
    const c2 = typeof s.color2 === 'string' ? s.color2 : s.color;
    const mode = s.fillMode;
    out[k] = {
      ...s,
      fillMode: mode === 'mirror' ? 'horizontal' : mode === 'gradient' ? 'vertical' : 'solid',
      stops: mode === 'gradient' ? [[0, s.color], [1, c2]] : mirrorStops(s.color, c2, s.mirrorCenter ?? 0.1),
    };
  }
  // 대칭 여부가 저장돼 있지 않으면 지점 모양으로 판단
  for (const k of ['left', 'right', 'era', 'title', 'sub', 'topLine', 'bottomLine']) {
    const s = out[k];
    if (s && Array.isArray(s.stops) && s.symmetric === undefined) out[k] = { ...s, symmetric: isSymmetric(s.stops) };
  }
  const A = out.anim;
  if (A && A.outroStops === undefined && typeof A.outroColor === 'string') {
    const stop = A.outroColorStop ?? 0.72;
    out.anim = { ...A, outroStops: [[0, A.outroColor], [Math.max(0.05, stop - 0.12), A.outroColor2], [stop, A.outroColor2], [1, A.outroColor3]] };
  }
  return out;
}

export const clone = o => JSON.parse(JSON.stringify(o));

// 저장된 값 중 현재 스키마에 있는 키만, 같은 타입일 때만 반영 (버전이 바뀌어도 안전하게 불러오기)
export function mergeKnown(def, src) {
  const out = clone(def);
  if (!src || typeof src !== 'object') return out;
  for (const k of Object.keys(out)) {
    if (!(k in src)) continue;
    if (Array.isArray(out[k])) { if (Array.isArray(src[k])) out[k] = clone(src[k]); } // 그라데이션 지점 목록 등
    else if (out[k] && typeof out[k] === 'object') out[k] = mergeKnown(out[k], src[k]);
    else if (typeof src[k] === typeof out[k]) out[k] = src[k];
  }
  return out;
}

// 실제 기본값: 코드 기본값 위에 defaults.json 을 덮음 (없는 항목·자료형이 다른 항목은 무시)
export const DEFAULTS = mergeKnown(BASE_DEFAULTS, migrateSettings(SAVED_DEFAULTS));
