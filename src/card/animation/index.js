import { drawIntroFrame, introDuration } from './intro';
import { drawOutroFrame, outroDuration, outroTexts } from './outro';
import { drawOutro2Frame, outro2Duration, outro2Texts } from './outro2';
import { fontStr } from '../fonts';

// 애니메이션 종류별 길이(초)와 프레임 그리기 함수
export const ANIMATIONS = {
  intro: { label: '인트로', duration: introDuration, draw: drawIntroFrame },
  outro: { label: '아웃트로', duration: outroDuration, draw: drawOutroFrame },
  outro2: { label: '아웃트로 2', duration: outro2Duration, draw: drawOutro2Frame },
};

export const isAnimMode = mode => mode in ANIMATIONS;

// 아웃트로 문구용 폰트까지 미리 로드
export async function ensureAnimFonts(state) {
  const texts = { outro: outroTexts, outro2: outro2Texts }[state.anim.mode];
  if (!texts) return;
  await Promise.all(
    texts(state)
      .filter(s => s.text)
      .map(s => document.fonts.load(fontStr(s, 48), s.text).catch(() => {})),
  );
}
