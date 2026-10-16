import { TEXT_BASE } from '../defaults';
import { drawCard, drawText } from '../renderer';
import { toNight } from './night';
import {
  drawBlot, drawCircuitBand, drawDiamonds, drawFallingGold, drawRevealMask, drawStarFlash, fillOverlay,
} from './effects';
import { bell, easeIn, easeInOut, easeOut, flicker, layer, mixHex, prog } from './util';

/*
 * 아웃트로 (공상절제) — 타이틀 카드가 어둠에 잠기고 금빛 문구가 떠오름
 *  0.0~0.6  원래 카드
 *  0.6~2.0  로고 중심에서 어둠이 번져 밤 장면으로 바뀜
 *  0.6~2.0  (어둠이 번진 자리에서는 왼쪽 위·오른쪽 위 텍스트와 상단 선이 보이지 않음)
 *           로고는 스스로 빛나지 않는 옅은 회색 실루엣
 *  2.55~3.4 로고 아래 중심에서 노란 별 섬광 + 가로 광선, 로고가 함께 살짝 밝아짐
 *  3.0~3.7  섬광이 사라지며 로고가 검은 실루엣으로 어두워짐
 *  3.0~     양옆 가장자리에서 정방형 입자가 터져 나옴 → 서로 다른 속도로 작아지며 조금씩 위로 올라감
 *  2.95~3.9 섬광이 사라지기 전에 '공상절제' / 'Cosmos Denial' 이 페이드 인과 동시에 중앙에서 펼쳐지며 등장
 *  3.1~     108도 회로 무늬가 아래에서 반짝이며 올라옴
 *  4.0~     화면 위에서 금빛 입자가 쏟아져 내림
 *  입자가 모두 사라지면 중앙부터 어두워지며 암전
 */
const TEXT_END = 4.3;
const BURST = 3.0;
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
    // 위(크림색) → 중간(금색) → 맨 아래에서 한 번 더 바뀜(옅은 파랑)
    gradientStops: [[0, A.outroColor], [Math.max(0.05, A.outroColorStop - 0.12), A.outroColor2], [A.outroColorStop, A.outroColor2], [1, A.outroColor3]],
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
  const flashK = bell(t, 2.55, 2.8, 3.4); // 중앙 섬광 세기
  const darken = easeInOut(prog(t, 3.0, 3.7)); // 섬광이 사라지며 로고가 검게 어두워짐
  const dimOld = easeOut(prog(t, 3.0, 3.8));
  const spread = easeOut(prog(t, 2.95, 3.9)); // 페이드 인과 동시에 중앙에서 펼쳐짐

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
    const nightState = {
      ...night,
      // 어둠이 번지면서 왼쪽 위·오른쪽 위 텍스트와 상단 선은 보이지 않게 됨
      left: { ...night.left, alpha: 0 },
      right: { ...night.right, alpha: 0 },
      topLine: { ...night.topLine, show: false },
      bottomLine: { ...night.bottomLine, opacity: night.bottomLine.opacity * (1 - dimOld) },
      // 로고는 스스로 빛나지 않음: 옅은 회색 실루엣 → 섬광과 함께 살짝 밝아짐 → 섬광이 사라지면 검게 어두워짐
      logo: {
        ...night.logo,
        tintColor: mixHex(mixHex(A.outroLogoColor, '#ffffff', flashK), A.outroLogoDark, darken),
        opacity: 1,
        glowOpacity: 0.35 * flashK,
        glowBlur: 1.2,
        glowStrength: 1,
        backShadow: 0,
      },
      era: { ...night.era, alpha: 0.7 * (1 - 0.6 * dimOld) },
      title: { ...night.title, alpha: 0.7 * (1 - 0.6 * dimOld) },
      sub: { ...night.sub, alpha: 0.7 * (1 - 0.6 * dimOld) },
    };
    const { canvas, ctx: n } = layer('outro-night', W, H);
    drawCard(n, W, H, nightState, images);
    drawRevealMask(ctx, W, H, canvas, lx, ly, ink);
  }

  // 108도 회로 무늬: 아래에서 반짝이며 올라오고, 지나간 자리에 옅게 남음
  if (A.hexGrid) {
    drawCircuitBand(ctx, W, H, prog(t, 3.1, 5.9), {
      seed: A.seed, color: '#d6c496', opacity: 0.45, band: 0.3, style: 'penta', trail: 0.4, twinkle: 0.5, t,
      image: images.circuitOutro,
    });
  }

  // 금빛 별 섬광 (로고 아래쪽 중심)
  const starY = ly + (L.height / 100) * H * 0.3;
  drawStarFlash(ctx, W, H, lx, starY, bell(t, 2.55, 2.8, 3.4), A.flareColor);

  // 공상절제 문구
  const { main, sub } = outroTextStyles(state);
  // 처음엔 옅게 페이드 인 → 중앙에서 퍼지듯 자간이 넓어지며 완전히 나타남
  const textIn = spread;
  if (textIn > 0) {
    const ty = (A.outroY / 100) * H;
    drawText(ctx, { ...main, alpha: textIn, spacing: main.spacing * (0.3 + 0.7 * spread) }, W, H, W / 2, ty, 'center');
    drawText(ctx, {
      ...sub, alpha: easeOut(prog(t, 3.05, 4.0)), spacing: sub.spacing * (0.4 + 0.6 * easeOut(prog(t, 3.05, 4.0))),
    }, W, H, W / 2, ty + (A.outroSize / 100) * H * 0.62, 'center');
  }

  // 정방형 입자 (모두 사라지는 시점 = 암전 시작)
  drawDiamonds(ctx, W, H, t - BURST, {
    density: A.particleDensity, color: A.flareColor, aspect: A.particleAspect, seed: A.seed, endAt: endStart - BURST,
  });
  // 위에서 쏟아지는 금빛 입자
  drawFallingGold(ctx, W, H, t, {
    start: 4.0, seed: A.seed, count: Math.round(160 * A.particleDensity), color: '#fff3d2', maxFall: 0.2,
  });

  // 암전 (중앙부터)
  drawBlot(ctx, W, H, W / 2, H / 2, easeIn(prog(t, endStart, endStart + 1.0)));
  fillOverlay(ctx, W, H, '#000000', easeIn(prog(t, endStart + 0.3, endStart + FADE)));
  ctx.restore();
}
