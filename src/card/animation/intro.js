import { drawBackground, drawCard } from '../renderer';
import { toNight } from './night';
import {
  drawFog,
  drawCircuitBand, drawCornerVignette, drawLineLight, drawRevealMask, drawRisingParticles, fillOverlay,
} from './effects';
import { bell, ease, easeOut, flicker, layer, prog } from './util';

/*
 * 인트로 — 어두운 장면에서 시작해 원래 타이틀 카드로 밝아짐
 *  0.0~0.8  검은 화면에서 밤 장면이 떠오름 (네 귀퉁이가 검은 원형 비네트, 배경은 흐리고 살짝 확대)
 *  0.3~1.5  상단 선이 가운데에서 양옆으로 그려지며 푸른 빛 입자가 흩어짐
 *  0.5~1.3  왼쪽 위 · 오른쪽 위 텍스트가 상단 선 아래에서 동시에 페이드 인하며 올라옴
 *           (오른쪽 위의 '_' 뒤 글자는 자리만 차지하고 비어 있음)
 *  1.15~    상단 선 위로 입자가 떠오름
 *  2.4~3.6  로고가 살짝 확대된 상태에서 제 크기로 줄어들며 흰 실루엣으로 등장, '_' 뒤 글자도 함께 등장
 *  4.3~5.6  화면 중앙에서 원형으로 넓어지며 밝아짐 (비네트 사라짐, 배경 흐림 해제)
 *           연대·제목이 페이드 인, 렌즈 플레어가 켜진 뒤 깜빡임
 *  5.4~6.1  다 밝아진 뒤 하단 선 + 부제가 함께 페이드 인 → 하단 선 위로 입자가 떠오름
 *  5.4~끝   아래에서 회로 무늬 띠가 올라감, 배경은 끝날 때까지 천천히 축소되어 원래 크기가 됨
 */
const BASE = 6.2;

// 선 아래에서 통째로 올라오는 등장 (선 위쪽만 보이도록 잘라 그림)
function riseAbove(line, H, progress) {
  return { lineY: (line.y / 100) * H, dir: 1, progress, stagger: 0 };
}

// '_' 뒤 글자의 시작 위치 — 앞/뒤를 따로 입력받으므로 문자열을 파싱하지 않음 (뒤가 비면 null)
const tailFrom = right => (right.after ? [...right.text].length + 1 : null);

const lineRange = (line, W, H) => ({
  x0: (line.left / 100) * W,
  x1: W - (line.right / 100) * W,
  y: (line.y / 100) * H,
});

export const introDuration = state => (BASE + state.anim.introHold) / state.anim.introSpeed;

export function drawIntroFrame(ctx, W, H, state, images, time) {
  const t = time * state.anim.introSpeed;
  const A = state.anim;
  const end = BASE + A.introHold;

  const E = (name, p) => ease(A[name], p); // 단계별 움직임 곡선 (애니메이션 패널에서 선택)
  const fadeIn = Math.min(1, E('easeIntroFade', prog(t, 0, 0.8)));
  const reveal = Math.max(0, Math.min(1, E('easeIntroReveal', prog(t, 4.3, 5.6)))); // 중앙에서 밝아지는 원
  const lineReveal = Math.min(1, E('easeIntroLine', prog(t, 0.3, 1.5)));
  const headerIn = Math.min(1, E('easeIntroHeader', prog(t, 0.5, 1.3)));
  const logoIn = E('easeIntroLogo', prog(t, 2.4, 3.6));
  const tailIdx = tailFrom(state.right);
  const tail = tailIdx !== null ? { from: tailIdx, alpha: Math.min(1, E('easeIntroLogo', prog(t, 2.4, 3.2))) } : undefined;

  // 배경: 어두울 때는 흐리고 확대, 밝아진 뒤 흐림이 풀리고 끝까지 천천히 축소
  const zoom = 1 + (A.introZoom - 1) * (1 - E('easeIntroZoom', prog(t, 4.3, end)));
  const nightBg = { animScale: A.introZoom, animBlur: A.introBlur };
  const dayBg = { animScale: zoom, animBlur: 0 };

  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 밤 장면
  if (reveal < 1) {
    const night = toNight(state);
    const nightState = {
      ...night,
      bg: { ...night.bg, ...nightBg },
      left: { ...night.left, alpha: headerIn, rise: riseAbove(state.topLine, H, headerIn) },
      right: { ...night.right, alpha: headerIn, rise: riseAbove(state.topLine, H, headerIn), tail },
      topLine: { ...night.topLine, reveal: lineReveal },
      bottomLine: { ...night.bottomLine, show: false },
      logo: {
        ...night.logo,
        opacity: logoIn,
        scale: 1 + 0.12 * (1 - logoIn),
        glowOpacity: 0.25 + 0.6 * prog(t, 3.0, 4.2),
        glowBlur: 0.6 + 1.6 * prog(t, 3.0, 4.2),
      },
      era: { ...night.era, alpha: 0 },
      title: { ...night.title, alpha: 0 },
      sub: { ...night.sub, alpha: 0 },
    };
    const { canvas, ctx: n } = layer('intro-night', W, H);
    drawCard(n, W, H, nightState, images, {
      afterBackground: (c, w, h) => {
        drawFog(c, w, h, { seed: A.seed, t, opacity: A.fogOpacity, color: A.fogColor });
        drawCornerVignette(c, w, h, A.introCornerVignette, A.introCornerSize);
      },
    });
    drawLineLight(n, W, H, state.topLine, lineReveal, t, u => 0.3 + 1.2 * u, A.introLineColor, 1);
    if (state.topLine.show) {
      drawRisingParticles(n, W, H, t, {
        ...lineRange(state.topLine, W, H),
        start: 1.15, span: 1.4, count: Math.round(40 * A.riseDensity),
        color: A.introLineColor, seed: A.seed, lighter: true,
      });
    }
    ctx.globalAlpha = fadeIn;
    ctx.drawImage(canvas, 0, 0);
    ctx.globalAlpha = 1;
  }

  // 원래 카드 (중앙에서 원형으로 드러남)
  if (reveal > 0) {
    const groupIn = Math.min(1, E('easeIntroSub', prog(t, 5.4, 6.1))); // 하단 선 + 부제
    const dayState = {
      ...state,
      bg: { ...state.bg, ...dayBg },
      logo: { ...state.logo, flareIntensity: state.logo.flareIntensity * easeOut(prog(t, 4.8, 5.3)) * flicker(t) },
      era: { ...state.era, alpha: Math.min(1, E('easeIntroTitle', prog(t, 4.6, 5.4))) },
      title: { ...state.title, alpha: Math.min(1, E('easeIntroTitle', prog(t, 4.6, 5.4))) },
      bottomLine: { ...state.bottomLine, opacity: state.bottomLine.opacity * groupIn },
      sub: { ...state.sub, alpha: groupIn },
    };
    const circuitP = E('easeIntroCircuit', prog(t, 5.4, Math.max(5.4 + 2, end - 0.2)));
    const { canvas, ctx: d } = layer('intro-day', W, H);
    drawCard(d, W, H, dayState, images, {
      afterBackground: (c, w, h) => {
        // 흐린 배경 → 선명한 배경 (흐린 쪽은 고정값이라 캐시됨)
        if (reveal < 1 && A.introBlur > 0) {
          c.save();
          c.globalAlpha = 1 - reveal;
          drawBackground(c, w, h, { ...state, bg: { ...state.bg, animScale: A.introZoom, animBlur: A.introBlur } }, images.bg);
          c.restore();
        }
        if (A.circuit) drawCircuitBand(c, w, h, circuitP, { seed: A.seed, color: A.circuitColor, opacity: A.circuitOpacity, image: images.circuitIntro });
      },
    });
    if (state.bottomLine.show) {
      drawRisingParticles(d, W, H, t, {
        ...lineRange(state.bottomLine, W, H),
        start: 6.0, span: 1.0, count: Math.round(30 * A.riseDensity),
        color: state.title.color, seed: A.seed + 1,
      });
    }
    drawRevealMask(ctx, W, H, canvas, W / 2, H / 2, reveal);
  }

  // 전환 섬광 (선택)
  if (A.introFlash) fillOverlay(ctx, W, H, '#ffffff', 0.5 * bell(t, 4.3, 4.7, 5.3));
  ctx.restore();
}
