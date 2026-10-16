import { drawIntroFrame, introDuration } from './intro';
import { drawOutroFrame, outroDuration, outroTexts } from './outro';
import { fontStr } from '../fonts';

// 애니메이션 종류별 길이(초)와 프레임 그리기 함수
export const ANIMATIONS = {
  intro: { label: '인트로', duration: introDuration, draw: drawIntroFrame },
  outro: { label: '아웃트로', duration: outroDuration, draw: drawOutroFrame },
};

export const isAnimMode = mode => mode in ANIMATIONS;

// 아웃트로 문구용 폰트까지 미리 로드
export async function ensureAnimFonts(state) {
  if (state.anim.mode !== 'outro') return;
  await Promise.all(
    outroTexts(state)
      .filter(s => s.text)
      .map(s => document.fonts.load(fontStr(s, 48), s.text).catch(() => {})),
  );
}
