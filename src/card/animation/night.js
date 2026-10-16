/*
 * 밤 장면 — 인트로 시작과 아웃트로(공상절제)에서 쓰는 어두운 버전의 카드
 * 원본 설정에서 색·밝기만 바꿔 같은 렌더러로 그림
 */
const dimText = (s, color, extra = {}) => ({
  ...s,
  fillMode: 'solid',
  color,
  strokeWidth: 0,
  glowColor: '#000000',
  glowOpacity: 0.6,
  glowBlur: 0.6,
  glowStrength: 1,
  shadowOpacity: 0,
  ...extra,
});

export function toNight(state) {
  const tint = state.anim.nightTint;
  return {
    ...state,
    bg: {
      ...state.bg,
      brightness: state.bg.brightness * 0.32,
      contrast: 92,
      saturate: 25,
      washColor: tint,
      washOpacity: 0.38,
      fogBottom: 0,
      vignetteColor: '#000000',
      vignette: 0.97,
      vignetteSize: 28,
      glowColor: '#3a4a63',
      glowOpacity: 0.28,
      snowOpacity: state.bg.snowOpacity * 0.45,
    },
    left: dimText(state.left, '#dfe4ea'),
    right: dimText(state.right, '#c3c9d2'),
    topLine: { ...state.topLine, fillMode: 'solid', color: '#c8d6ea', opacity: Math.max(state.topLine.opacity, 0.7) },
    bottomLine: { ...state.bottomLine, fillMode: 'solid', color: '#5f6b7e' },
    logo: {
      ...state.logo,
      tint: true,
      tintColor: '#f3f6fa',
      glowColor: '#ffffff',
      glowOpacity: 0.35,
      glowBlur: 0.8,
      glowStrength: 1,
      flare: false,
    },
    era: dimText(state.era, '#1b2a45'),
    title: dimText(state.title, '#1b2a45'),
    sub: dimText(state.sub, '#2a3448'),
  };
}
