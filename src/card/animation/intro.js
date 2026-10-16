import { drawCard } from '../renderer';
import { toNight } from './night';
import { drawLineLight, fillOverlay } from './effects';
import { bell, easeInOut, easeOut, layer, prog } from './util';

/*
 * 인트로 — 어두운 장면에서 시작해 원래 타이틀 카드로 밝아짐
 *  0.0~0.8  검은 화면에서 밤 장면이 떠오름
 *  0.3~1.5  상단 선이 가운데에서 양옆으로 그려지며 푸른 빛 입자가 흩어짐, 왼쪽 위 텍스트 등장
 *  1.0~2.2  오른쪽 위 텍스트가 한 글자씩 입력됨
 *  2.4~4.2  로고가 흰 실루엣으로 떠오르며 빛남
 *  4.4~5.0  흰 섬광과 함께 원래 카드로 전환
 *  4.6~5.6  연대·제목 등장 / 5.4~6.2 부제 등장 → 이후 정지
 */
const BASE = 6.2;

export const introDuration = state => (BASE + state.anim.introHold) / state.anim.speed;

export function drawIntroFrame(ctx, W, H, state, images, time) {
  const t = time * state.anim.speed;
  const A = state.anim;

  const fadeIn = easeOut(prog(t, 0, 0.8));
  const dayMix = easeInOut(prog(t, 4.4, 5.0));
  const lineReveal = easeOut(prog(t, 0.3, 1.5));
  const typed = Math.floor(prog(t, 1.0, 2.2) * [...state.right.text].length);

  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 밤 장면
  if (dayMix < 1) {
    const night = toNight(state);
    const nightState = {
      ...night,
      left: { ...night.left, alpha: easeOut(prog(t, 0.3, 1.1)) },
      right: { ...night.right, text: [...state.right.text].slice(0, typed).join(''), alpha: 1 },
      topLine: { ...night.topLine, reveal: lineReveal },
      bottomLine: { ...night.bottomLine, show: false },
      logo: {
        ...night.logo,
        opacity: easeOut(prog(t, 2.4, 3.2)),
        glowOpacity: 0.25 + 0.6 * prog(t, 3.0, 4.2),
        glowBlur: 0.6 + 1.6 * prog(t, 3.0, 4.2),
      },
      era: { ...night.era, alpha: 0 },
      title: { ...night.title, alpha: 0 },
      sub: { ...night.sub, alpha: 0 },
    };
    const { canvas, ctx: n } = layer('intro-night', W, H);
    drawCard(n, W, H, nightState, images);
    drawLineLight(n, W, H, state.topLine, lineReveal, t, u => 0.3 + 1.2 * u, A.introLineColor, 1);
    ctx.globalAlpha = fadeIn;
    ctx.drawImage(canvas, 0, 0);
    ctx.globalAlpha = 1;
  }

  // 원래 카드
  if (dayMix > 0) {
    const dayState = {
      ...state,
      era: { ...state.era, alpha: easeOut(prog(t, 4.6, 5.6)) },
      title: { ...state.title, alpha: easeOut(prog(t, 4.6, 5.6)) },
      sub: { ...state.sub, alpha: easeOut(prog(t, 5.4, 6.2)) },
    };
    const { canvas, ctx: d } = layer('intro-day', W, H);
    drawCard(d, W, H, dayState, images);
    ctx.globalAlpha = dayMix;
    ctx.drawImage(canvas, 0, 0);
    ctx.globalAlpha = 1;
  }

  // 전환 섬광
  if (A.introFlash) fillOverlay(ctx, W, H, '#ffffff', 0.6 * bell(t, 4.35, 4.7, 5.3));
  ctx.restore();
}
