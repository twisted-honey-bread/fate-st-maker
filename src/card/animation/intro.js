import { drawCard } from '../renderer';
import { toNight } from './night';
import { drawLineLight, drawRisingParticles, fillOverlay } from './effects';
import { bell, easeInOut, easeOut, flicker, layer, prog } from './util';

/*
 * 인트로 — 어두운 장면에서 시작해 원래 타이틀 카드로 밝아짐
 *  0.0~0.8  검은 화면에서 밤 장면이 떠오름
 *  0.3~1.5  상단 선이 가운데에서 양옆으로 그려지며 푸른 빛 입자가 흩어짐
 *  0.5~1.2  왼쪽 위 · 오른쪽 위 텍스트가 상단 선 아래에서 동시에 통째로 올라옴
 *           (오른쪽 위의 '_' 뒤 글자는 자리만 차지하고 비어 있음)
 *  1.15~    상단 선 위로 입자가 떠오름
 *  2.4~3.6  로고가 살짝 확대된 상태에서 제 크기로 줄어들며 흰 실루엣으로 등장, '_' 뒤 글자도 함께 등장
 *  4.4~5.0  흰 섬광과 함께 원래 카드로 전환, 렌즈 플레어가 켜진 뒤 깜빡임
 *  4.6~5.7  연대·제목이 하단 선 아래에서 한 글자씩 올라옴
 *  5.3~6.2  부제가 하단 선 위에서 내려옴 → 하단 선 위로 입자가 떠오름 → 정지
 * 텍스트는 가장 가까운 구분선을 기준으로, 선 위의 텍스트는 아래에서 올라오고 선 아래 텍스트는 위에서 내려옴
 */
const BASE = 6.2;

// 텍스트의 기준선 위치(%H)
function baselineOf(state, key) {
  if (key === 'era') {
    return state.era.position === 'above'
      ? state.title.y - state.title.size * 1.05 + state.era.offsetY
      : state.title.y + state.era.offsetY;
  }
  return state[key].y;
}

// 가장 가까운 구분선을 기준으로 등장 설정을 만듦 (stagger 0 = 통째로)
function riseFrom(state, key, H, progress, stagger) {
  const ty = baselineOf(state, key);
  const lines = [state.topLine, state.bottomLine].filter(l => l.show);
  if (!lines.length) return { lineY: (ty / 100) * H + 1, dir: 1, progress, stagger };
  const line = lines.reduce((a, b) => (Math.abs(b.y - ty) < Math.abs(a.y - ty) ? b : a));
  return { lineY: (line.y / 100) * H, dir: ty < line.y ? 1 : -1, progress, stagger };
}

// '_' 뒤 글자의 시작 위치 (없으면 null)
function tailFrom(text) {
  const i = [...text].indexOf('_');
  return i >= 0 ? i + 1 : null;
}

const lineRange = (line, W, H) => ({
  x0: (line.left / 100) * W,
  x1: W - (line.right / 100) * W,
  y: (line.y / 100) * H,
});

export const introDuration = state => (BASE + state.anim.introHold) / state.anim.speed;

export function drawIntroFrame(ctx, W, H, state, images, time) {
  const t = time * state.anim.speed;
  const A = state.anim;

  const fadeIn = easeOut(prog(t, 0, 0.8));
  const dayMix = easeInOut(prog(t, 4.4, 5.0));
  const lineReveal = easeOut(prog(t, 0.3, 1.5));
  const headerRise = prog(t, 0.5, 1.2);
  const logoIn = easeOut(prog(t, 2.4, 3.6));
  const tailIdx = tailFrom(state.right.text);
  const tail = tailIdx !== null ? { from: tailIdx, alpha: easeOut(prog(t, 2.4, 3.2)) } : undefined;

  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 밤 장면
  if (dayMix < 1) {
    const night = toNight(state);
    const nightState = {
      ...night,
      left: { ...night.left, rise: riseFrom(state, 'left', H, headerRise, 0) },
      right: { ...night.right, rise: riseFrom(state, 'right', H, headerRise, 0), tail },
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
    drawCard(n, W, H, nightState, images);
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

  // 원래 카드
  if (dayMix > 0) {
    const dayState = {
      ...state,
      logo: { ...state.logo, flareIntensity: state.logo.flareIntensity * easeOut(prog(t, 4.8, 5.3)) * flicker(t) },
      era: { ...state.era, rise: riseFrom(state, 'era', H, prog(t, 4.6, 5.3), 0.06) },
      title: { ...state.title, rise: riseFrom(state, 'title', H, prog(t, 4.75, 5.7), 0.07) },
      sub: { ...state.sub, rise: riseFrom(state, 'sub', H, prog(t, 5.3, 6.2), 0.08) },
    };
    const { canvas, ctx: d } = layer('intro-day', W, H);
    drawCard(d, W, H, dayState, images);
    ctx.globalAlpha = dayMix;
    ctx.drawImage(canvas, 0, 0);
    ctx.globalAlpha = 1;
  }

  // 전환 섬광
  if (A.introFlash) fillOverlay(ctx, W, H, '#ffffff', 0.6 * bell(t, 4.35, 4.7, 5.3));

  // 부제 등장 직후 하단 선 위로 떠오르는 입자
  if (state.bottomLine.show) {
    drawRisingParticles(ctx, W, H, t, {
      ...lineRange(state.bottomLine, W, H),
      start: 6.0, span: 1.0, count: Math.round(30 * A.riseDensity),
      color: state.title.color, seed: A.seed + 1,
    });
  }
  ctx.restore();
}
