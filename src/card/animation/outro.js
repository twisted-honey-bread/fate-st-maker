import { TEXT_BASE } from '../defaults';
import { drawCard, drawText } from '../renderer';
import { toNight } from './night';
import {
  drawBlot, drawDiamonds, drawDust, drawHexGrid, drawRevealMask, drawStarFlash, fillOverlay,
} from './effects';
import { bell, easeIn, easeInOut, easeOut, flicker, layer, prog } from './util';

/*
 * 아웃트로 (공상절제) — 타이틀 카드가 어둠에 잠기고 금빛 문구가 떠오름
 *  0.0~0.6  원래 카드
 *  0.6~1.8  로고 중심에서 어둠이 번져 밤 장면으로 바뀜
 *  1.8~2.6  로고가 흰 실루엣으로 강하게 빛남, 상단 텍스트가 흐려짐
 *  2.5~3.1  금빛 별 섬광 + 가로 광선
 *  2.75~    양옆 가장자리에서 세로로 긴 마름모 입자가 나타나 위로 떠오름, 육각 격자가 비침
 *  2.9~3.9  '공상절제' / 'Cosmos Denial' 등장, 로고와 제목은 흐려짐
 *  유지 후 1.3초 동안 중앙부터 어두워지며 암전
 */
const TEXT_END = 3.9;
const FADE = 1.4;

export const outroDuration = state => (TEXT_END + state.anim.outroHold + FADE) / state.anim.speed;

function outroTextStyles(state) {
  const A = state.anim;
  const main = {
    ...TEXT_BASE,
    text: A.outroText,
    font: A.outroFont,
    weight: A.outroWeight,
    size: A.outroSize,
    spacing: 0.42,
    fillMode: 'gradient',
    color: A.outroColor,
    color2: A.outroColor2,
    strokeWidth: 0,
    glowColor: A.outroGlow,
    glowOpacity: 0.55,
    glowBlur: 1.6,
    glowStrength: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.7,
    shadowBlur: 0.8,
    shadowX: 0,
    shadowY: 0.25,
  };
  const sub = {
    ...TEXT_BASE,
    text: A.outroSub,
    font: A.outroSubFont,
    weight: 500,
    size: A.outroSize * 0.28,
    spacing: 0.85,
    color: '#f2ede2',
    glowColor: A.outroGlow,
    glowOpacity: 0.4,
    glowBlur: 0.6,
    shadowOpacity: 0.6,
    shadowBlur: 0.4,
  };
  return { main, sub };
}

// 폰트 미리 로드용
export const outroTexts = state => Object.values(outroTextStyles(state));

export function drawOutroFrame(ctx, W, H, state, images, time) {
  const t = time * state.anim.speed;
  const A = state.anim;
  const L = state.logo;
  const lx = (L.x / 100) * W;
  const ly = (L.y / 100) * H;
  const endStart = TEXT_END + A.outroHold;

  const ink = easeInOut(prog(t, 0.6, 2.0));
  const glowUp = prog(t, 1.8, 2.6);
  const dimOld = easeOut(prog(t, 3.0, 3.8));

  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 원래 카드
  if (ink < 1) {
    const { canvas, ctx: d } = layer('outro-day', W, H);
    // 렌즈 플레어 깜빡임
    const dayState = { ...state, logo: { ...L, flareIntensity: L.flareIntensity * flicker(t) } };
    drawCard(d, W, H, dayState, images);
    ctx.drawImage(canvas, 0, 0);
  }

  // 밤 장면 (중심에서 번져 나옴)
  if (ink > 0) {
    const night = toNight(state);
    const headerAlpha = 1 - 0.75 * glowUp;
    const nightState = {
      ...night,
      left: { ...night.left, alpha: headerAlpha * (1 - dimOld) },
      right: { ...night.right, alpha: headerAlpha * (1 - dimOld) },
      topLine: { ...night.topLine, opacity: night.topLine.opacity * headerAlpha * (1 - dimOld) },
      bottomLine: { ...night.bottomLine, opacity: night.bottomLine.opacity * (1 - dimOld) },
      logo: {
        ...night.logo,
        opacity: 1 - 0.8 * dimOld,
        glowOpacity: 0.3 + 0.7 * glowUp,
        glowBlur: 0.8 + 2.4 * glowUp,
        glowStrength: 2,
      },
      era: { ...night.era, alpha: 0.7 * (1 - 0.6 * dimOld) },
      title: { ...night.title, alpha: 0.7 * (1 - 0.6 * dimOld) },
      sub: { ...night.sub, alpha: 0.7 * (1 - 0.6 * dimOld) },
    };
    const { canvas, ctx: n } = layer('outro-night', W, H);
    drawCard(n, W, H, nightState, images);
    drawRevealMask(ctx, W, H, canvas, lx, ly, ink);
  }

  // 육각 격자
  if (A.hexGrid) drawHexGrid(ctx, W, H, 0.22 * easeOut(prog(t, 3.0, 3.8)), '#d6c496');

  // 금빛 별 섬광 (로고 아래쪽 중심)
  const starY = ly + (L.height / 100) * H * 0.3;
  drawStarFlash(ctx, W, H, lx, starY, bell(t, 2.5, 2.75, 3.4), A.flareColor);

  // 공상절제 문구
  const { main, sub } = outroTextStyles(state);
  const textIn = easeOut(prog(t, 2.9, 3.7));
  if (textIn > 0) {
    const scale = 1.06 - 0.06 * textIn;
    const ty = (A.outroY / 100) * H;
    ctx.save();
    ctx.translate(W / 2, ty);
    ctx.scale(scale, scale);
    ctx.translate(-W / 2, -ty);
    drawText(ctx, { ...main, alpha: textIn }, W, H, W / 2, ty, 'center');
    ctx.restore();
    drawText(ctx, { ...sub, alpha: easeOut(prog(t, 3.2, 3.9)) }, W, H, W / 2, ty + (A.outroSize / 100) * H * 0.62, 'center');
  }

  // 입자
  drawDiamonds(ctx, W, H, t - 2.75, A.particleDensity, A.flareColor, A.particleAspect);
  drawDust(ctx, W, H, t, 0.8 * prog(t, 3.2, 4.2) * A.particleDensity, '#fff3d6');

  // 암전 (중앙부터)
  drawBlot(ctx, W, H, W / 2, H / 2, easeIn(prog(t, endStart, endStart + 1.0)));
  fillOverlay(ctx, W, H, '#000000', easeIn(prog(t, endStart + 0.3, endStart + FADE)));
  ctx.restore();
}
