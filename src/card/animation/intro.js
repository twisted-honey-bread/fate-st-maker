import { drawCard } from '../renderer';
import { toNight } from './night';
import { drawLineLight, fillOverlay } from './effects';
import { bell, easeInOut, easeOut, layer, prog } from './util';

/*
 * 인트로 — 어두운 장면에서 시작해 원래 타이틀 카드로 밝아짐
 *  0.0~0.8  검은 화면에서 밤 장면이 떠오름
 *  0.3~1.5  상단 선이 가운데에서 양옆으로 그려지며 푸른 빛 입자가 흩어짐
 *  0.4~1.4  왼쪽 위 텍스트가 상단 선 아래에서 한 글자씩 올라옴
 *  1.0~2.2  오른쪽 위 텍스트도 같은 방식으로 등장
 *  2.4~4.2  로고가 흰 실루엣으로 떠오르며 빛남
 *  4.4~5.0  흰 섬광과 함께 원래 카드로 전환
 *  4.6~5.7  연대·제목이 하단 선 아래에서 올라옴 / 5.3~6.2 부제가 하단 선 위에서 내려옴 → 이후 정지
 * 글자는 가장 가까운 구분선을 기준으로, 선 위의 텍스트는 아래에서 올라오고 선 아래 텍스트는 위에서 내려옴
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

// 가장 가까운 구분선을 기준으로 글자별 등장 설정을 만듦
function riseFrom(state, key, H, progress, stagger) {
  const ty = baselineOf(state, key);
  const lines = [state.topLine, state.bottomLine].filter(l => l.show);
  if (!lines.length) return { lineY: (ty / 100) * H + 1, dir: 1, progress, stagger };
  const line = lines.reduce((a, b) => (Math.abs(b.y - ty) < Math.abs(a.y - ty) ? b : a));
  return { lineY: (line.y / 100) * H, dir: ty < line.y ? 1 : -1, progress, stagger };
}

export const introDuration = state => (BASE + state.anim.introHold) / state.anim.speed;

export function drawIntroFrame(ctx, W, H, state, images, time) {
  const t = time * state.anim.speed;
  const A = state.anim;

  const fadeIn = easeOut(prog(t, 0, 0.8));
  const dayMix = easeInOut(prog(t, 4.4, 5.0));
  const lineReveal = easeOut(prog(t, 0.3, 1.5));

  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 밤 장면
  if (dayMix < 1) {
    const night = toNight(state);
    const nightState = {
      ...night,
      left: { ...night.left, rise: riseFrom(state, 'left', H, prog(t, 0.4, 1.4), 0.08) },
      right: { ...night.right, rise: riseFrom(state, 'right', H, prog(t, 1.0, 2.2), 0.12) },
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
  ctx.restore();
}
