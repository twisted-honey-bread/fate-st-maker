import { TEXT_BASE } from '../defaults';
import { drawCard, drawText } from '../renderer';
import { toNight } from './night';
import {
  drawFog,
  drawBlot, drawCircuitBand, drawDiamonds, drawFallingGold, drawRevealMask, drawStarFlash, fillOverlay,
} from './effects';
import { bell, ease, easeOut, layer, mixHex, prog } from './util';
import { effectiveTime, stageTime } from './timing';

/*
 * 아웃트로 (공상절제) — 타이틀 카드가 어둠에 잠기고 금빛 문구가 떠오름
 *  0.0~0.6  원래 카드
 *  0.6~2.0  로고 중심에서 어둠이 번져 어두워진 화면으로 바뀜
 *  0.6~2.0  (어둠이 번진 자리에서는 왼쪽 위·오른쪽 위 텍스트와 상단 선이 보이지 않음)
 *           로고는 스스로 빛나지 않는 옅은 회색 실루엣
 *  2.55~4.1 로고 아래 중심에서 노란 별 섬광 + 광선, 로고가 함께 살짝 밝아짐
 *  3.0~4.1  섬광·광선이 사라지며 로고가 검은 실루엣으로 어두워짐 (문구가 다 나타나는 4.1 에 함께 끝남)
 *  3.0~     양옆 가장자리에서 정방형 입자가 터져 나옴 → 서로 다른 속도로 작아지며 조금씩 위로 올라감
 *  2.95~3.9 섬광이 사라지기 전에 '공상절제' / 'Cosmos Denial' 이 페이드 인과 동시에 중앙에서 펼쳐지며 등장
 *  3.0~     입자가 터지는 순간부터 육각형 회로 무늬가 반짝이기 시작하며 아래에서 올라옴
 *  4.0~     화면 위에서 금빛 입자가 쏟아져 내림
 *  입자가 모두 사라지면 중앙부터 완전히 어두워짐
 */
// 단계별 시간은 timing.js (콘솔에서 조절). 유지 시간은 문구가 다 나타난 뒤 0.2초부터 셈
const holdStart = A => stageTime(A, 'outroText')[1] + 0.2;
const fadeLength = A => stageTime(A, 'outroEnd')[1];

export const outroDuration = state => (holdStart(state.anim) + state.anim.outroHold + fadeLength(state.anim)) / state.anim.outroSpeed;

function outroTextStyles(state) {
  const A = state.anim;
  const main = {
    ...TEXT_BASE,
    text: A.outroText,
    font: A.outroFont,
    weight: A.outroWeight,
    size: A.outroSize,
    spacing: A.outroSpacing,
    scaleX: A.outroScaleX,
    fillMode: 'vertical',
    color: A.outroStops[0]?.[1] || '#ffffff',
    stops: A.outroStops,
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
    weight: A.outroSubWeight,
    size: A.outroSubSize,
    spacing: A.outroSubSpacing,
    scaleX: A.outroSubScaleX,
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
  const t = time * state.anim.outroSpeed;
  const A = state.anim;
  const L = state.logo;
  const lx = (L.x / 100) * W;
  const ly = (L.y / 100) * H;
  const endStart = holdStart(A) + A.outroHold;
  const FADE = fadeLength(A);
  const T = id => effectiveTime(A, id);
  const [flashS, flashE] = T('outroFlash');
  const flashPeak = flashS + Math.min(0.25, (flashE - flashS) / 3);
  const [darkS] = T('outroDarken');
  const [textS, textE] = T('outroText');
  const BURST = T('outroParticles')[0];

  const E = (name, p) => ease(A[name], p); // 단계별 움직임 곡선 (애니메이션 패널에서 선택)
  const clamp = v => Math.max(0, Math.min(1, v));
  const ink = clamp(E('easeOutroInk', prog(t, ...T('outroInk'))));
  const flashK = bell(t, flashS, flashPeak, flashE); // 중앙 섬광 세기
  const darken = clamp(E('easeOutroDarken', prog(t, ...T('outroDarken')))); // 섬광이 사라지며 로고가 검게 어두워짐
  const dimOld = easeOut(prog(t, darkS, darkS + 0.8));
  const spread = E('easeOutroSpread', prog(t, textS, Math.max(textS + 0.1, textE - 0.2))); // 페이드 인과 동시에 중앙에서 펼쳐짐

  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 원래 카드
  if (ink < 1) {
    const { canvas, ctx: d } = layer('outro-day', W, H);
    // 아웃트로에는 렌즈 플레어가 없음
    const dayState = { ...state, logo: { ...L, flare: false }, title: { ...state.title, flare: false } };
    drawCard(d, W, H, dayState, images);
    ctx.drawImage(canvas, 0, 0);
  }

  // 어두워졌을 때 (중심에서 번져 나옴)
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
        edgeStrength: state.logo.edgeStrength * darken, // 검게 어두워지면서 가장자리 탄 듯한 색이 나타남
      },
      era: { ...night.era, alpha: 0.7 * (1 - 0.6 * dimOld) },
      title: { ...night.title, alpha: 0.7 * (1 - 0.6 * dimOld) },
      sub: { ...night.sub, alpha: 0.7 * (1 - 0.6 * dimOld) },
    };
    const { canvas, ctx: n } = layer('outro-night', W, H);
    drawCard(n, W, H, nightState, images, {
      afterBackground: (c, w, h) => drawFog(c, w, h, { seed: A.seed, t, opacity: A.fogOpacity, color: A.fogColor, coverage: A.fogCoverage, scale: A.fogScale }),
    });
    drawRevealMask(ctx, W, H, canvas, lx, ly, ink, 1, A.revealAspect);
  }

  // 육각형 회로 무늬: 아래에서 반짝이며 올라오고, 지나간 자리에 옅게 남음
  if (A.hexGrid) {
    drawCircuitBand(ctx, W, H, E('easeOutroCircuit', prog(t, ...T('outroCircuit'))), {
      seed: A.seed, color: '#d6c496', opacity: 0.45, band: 0.3, style: 'penta', trail: 0.4, twinkle: 0.5, t,
      image: images.circuitOutro,
    });
  }

  // 금빛 별 섬광 (로고 아래쪽 중심)
  const starY = ly + (L.height / 100) * H * 0.3;
  drawStarFlash(ctx, W, H, lx, starY, flashK, A.flareColor, {
    count: A.rayCount, angle: A.rayAngle, length: A.rayLength, widthStart: A.rayWidthStart,
    widthEnd: A.rayWidthEnd, opacity: A.rayOpacity, fade: A.rayFade,
  }, A.rayStartLength + (1 - A.rayStartLength) * E('easeOutroRays', prog(t, flashS, flashPeak))); // 시작 길이에서 섬광 정점까지 늘어나고, 이후엔 길이 그대로 페이드 아웃

  // 정방형 입자 (모두 사라지는 시점 = 완전히 어두워지기 시작)
  drawDiamonds(ctx, W, H, t - BURST, {
    density: A.particleDensity, color: A.particleColor, glow: A.particleGlow, glowSize: A.particleGlowSize / 100, squash: A.particleSquash,
    seed: A.seed, endAt: endStart - BURST, sizeScale: A.diamondSize,
    inDur: A.diamondInDur, inZoom: A.diamondInZoom, inFromScale: A.diamondInScale, inFade: A.diamondInFade,
  });
  // 위에서 쏟아지는 금빛 입자
  drawFallingGold(ctx, W, H, t, {
    start: T('outroGold')[0], seed: A.seed, count: Math.round(160 * A.particleDensity), color: '#fff3d2', maxFall: 0.2, sizeScale: A.goldSize,
  });

  // 공상절제 문구 — 빛 입자보다 위에 그림
  const { main, sub } = outroTextStyles(state);
  // 처음엔 옅게 페이드 인 → 중앙에서 퍼지듯 자간이 넓어지며 완전히 나타남
  const textIn = clamp(E('easeOutroText', prog(t, textS, textE))); // 펼쳐지는 동안 천천히 페이드 인
  if (textIn > 0) {
    const ty = (A.outroY / 100) * H;
    drawText(ctx, { ...main, alpha: textIn, spacing: main.spacing * (0.3 + 0.7 * spread) }, W, H, W / 2, ty, 'center');
    drawText(ctx, {
      ...sub,
      alpha: clamp(E('easeOutroText', prog(t, textS + 0.1, textE + 0.1))),
      spacing: sub.spacing * (0.4 + 0.6 * E('easeOutroSpread', prog(t, textS + 0.1, Math.max(textS + 0.2, textE - 0.1)))),
    }, W, H, W / 2, (A.outroSubY / 100) * H, 'center');
  }


  // 완전히 어두워짐 (중앙부터)
  drawBlot(ctx, W, H, W / 2, H / 2, clamp(E('easeOutroEnd', prog(t, endStart, endStart + 1.0))));
  fillOverlay(ctx, W, H, '#000000', clamp(E('easeOutroEnd', prog(t, endStart + 0.3, endStart + FADE))));
  ctx.restore();
}
