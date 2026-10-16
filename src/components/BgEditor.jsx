import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { CARD_HEIGHT as H, CARD_WIDTH as W } from '../card/defaults';
import { Button } from './ui';

/*
 * 배경 크기·위치를 사진 편집 툴처럼 직접 조정
 * - 사진 안쪽을 끌면 이동, 모서리 손잡이를 끌면 반대쪽 모서리를 고정한 채 확대/축소
 * - 카드 밖으로 넘친(잘리는) 부분은 캔버스 뒤에 흐리게 보여줌
 * - 값은 렌더러와 같은 식(cover 맞춤 × 확대, 남는 폭 × 위치 %)으로 되돌려 계산 → 적용을 누르면 state 에 반영
 */
const ZOOM_MIN = 100;
const ZOOM_MAX = 300;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 렌더러(paintBackground)와 같은 배치 계산 — 카드 1920×1080 기준
export function bgGeometry(iw, ih, { zoom, posX, posY }) {
  const base = Math.max(W / iw, H / ih);
  const dw = iw * base * (zoom / 100);
  const dh = ih * base * (zoom / 100);
  return { base, dw, dh, dx: ((W - dw) * posX) / 100, dy: ((H - dh) * posY) / 100 };
}

// 원하는 왼쪽 위 좌표 → 위치 % (남는 폭이 0이면 위치는 의미 없음)
const toPos = (d, free, prev) => (Math.abs(free) < 0.5 ? prev : clamp((d / free) * 100, 0, 100));

const Ghost = styled.img`
  position: absolute;
  z-index: 0;
  max-width: none;
  opacity: 0.35;
  pointer-events: none;
`;

const Box = styled.div`
  position: absolute;
  z-index: 3;
  border: 2px solid var(--accent);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
  cursor: move;
  touch-action: none;
`;

const Handle = styled.span`
  position: absolute;
  width: 16px;
  height: 16px;
  margin: -9px;
  border: 2px solid var(--accent);
  border-radius: 3px;
  background: #ffffff;
  touch-action: none;
`;

const CORNERS = {
  nw: { left: 0, top: 0, cursor: 'nwse-resize' },
  ne: { left: '100%', top: 0, cursor: 'nesw-resize' },
  sw: { left: 0, top: '100%', cursor: 'nesw-resize' },
  se: { left: '100%', top: '100%', cursor: 'nwse-resize' },
};

export const imageSize = image => (image ? [image.naturalWidth || image.width, image.naturalHeight || image.height] : [W, H]);

/*
 * 직접 조정 중 미리보기 배치: 사진 전체(넘친 부분 포함)가 보이도록 카드를 줄이고 가운데로 옮김
 * 반환값의 % 는 미리보기 영역 너비 기준 (margin 의 % 와 같음)
 */
export function editFrameLayout(image, draft) {
  const [iw, ih] = imageSize(image);
  const g = bgGeometry(iw, ih, draft);
  const x0 = Math.min(0, g.dx);
  const x1 = Math.max(W, g.dx + g.dw);
  const y0 = Math.min(0, g.dy);
  const y1 = Math.max(H, g.dy + g.dh);
  // 카드 너비 % — 가로로도, 세로로도(미리보기 너비의 약 55% 높이 안에) 다 들어오게
  const width = Math.min(78, 94 / ((x1 - x0) / W), 55 / ((y1 - y0) / W));
  const s = width / W; // 카드 좌표 1 → 미리보기 너비 %
  return {
    width,
    shift: (((x0 + x1) / 2 - W / 2) / W) * -100, // 카드 자신 너비 기준 %
    top: -y0 * s + 2,
    bottom: (y1 - H) * s + 2,
  };
}

export function BgEditor({ frameRef, image, imageUrl, draft, onChange, onDragging }) {
  const [iw, ih] = imageSize(image);
  const g = bgGeometry(iw, ih, draft);
  const drag = useRef(null);

  const pct = (v, total) => `${(v / total) * 100}%`;
  const box = { left: pct(g.dx, W), top: pct(g.dy, H), width: pct(g.dw, W), height: pct(g.dh, H) };

  const start = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = frameRef.current.getBoundingClientRect();
    drag.current = { corner, x: e.clientX, y: e.clientY, k: W / rect.width, rect, draft, g };
    e.currentTarget.setPointerCapture(e.pointerId);
    onDragging?.(true);
  };

  const move = e => {
    const d = drag.current;
    if (!d) return;
    const { g: g0, draft: d0, k } = d;
    if (!d.corner) {
      const nx = g0.dx + (e.clientX - d.x) * k;
      const ny = g0.dy + (e.clientY - d.y) * k;
      onChange({ ...d0, posX: toPos(nx, W - g0.dw, d0.posX), posY: toPos(ny, H - g0.dh, d0.posY) });
      return;
    }
    // 반대쪽 모서리 고정
    const west = d.corner.includes('w');
    const north = d.corner.includes('n');
    const ax = west ? g0.dx + g0.dw : g0.dx;
    const ay = north ? g0.dy + g0.dh : g0.dy;
    const px = (e.clientX - d.rect.left) * k;
    const py = (e.clientY - d.rect.top) * k;
    const want = Math.max(Math.abs(px - ax), Math.abs(py - ay) * (iw / ih));
    const zoom = clamp((want / (iw * g0.base)) * 100, ZOOM_MIN, ZOOM_MAX);
    const n = bgGeometry(iw, ih, { ...d0, zoom });
    const nx = west ? ax - n.dw : ax;
    const ny = north ? ay - n.dh : ay;
    onChange({
      zoom: Math.round(zoom * 10) / 10,
      posX: toPos(nx, W - n.dw, d0.posX),
      posY: toPos(ny, H - n.dh, d0.posY),
    });
  };

  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    onDragging?.(false);
  };
  const handlers = { onPointerMove: move, onPointerUp: end, onPointerCancel: end };

  return (
    <>
      {imageUrl && <Ghost src={imageUrl} alt="" style={box} />}
      <Box style={box} onPointerDown={e => start(e, null)} {...handlers} aria-label="배경 이미지 영역 — 끌어서 이동">
        {Object.entries(CORNERS).map(([c, s]) => (
          <Handle
            key={c}
            style={s}
            onPointerDown={e => start(e, c)}
            {...handlers}
            aria-label="모서리를 끌어 확대·축소"
          />
        ))}
      </Box>
    </>
  );
}

/* 미리보기 위: 직접 조정 중일 때의 안내와 적용/취소 */
const Bar = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  width: 100%;
  max-width: 1600px;
  padding: 8px 12px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: var(--surface);
  font-size: 12px;
  color: var(--muted);

  b { color: var(--fg); }
  span { flex: 1; min-width: 180px; }
`;

export function BgEditBar({ draft, onApply, onCancel, onReset }) {
  // Enter = 적용, Esc = 취소
  useEffect(() => {
    const key = e => {
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter' && e.target.tagName !== 'INPUT') onApply();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onApply, onCancel]);

  return (
    <Bar role="toolbar" aria-label="배경 직접 조정">
      <span>
        <b>배경 직접 조정</b> · 사진을 끌어 이동, 모서리를 끌어 확대 · 확대 {Math.round(draft.zoom)}% · 가로 {Math.round(draft.posX)}% · 세로 {Math.round(draft.posY)}%
      </span>
      <Button $small type="button" onClick={onReset}>처음 위치로</Button>
      <Button $small type="button" onClick={onCancel}>취소</Button>
      <Button $small $primary type="button" onClick={onApply}>적용</Button>
    </Bar>
  );
}
