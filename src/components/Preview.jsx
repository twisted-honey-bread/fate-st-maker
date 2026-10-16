import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { CARD_HEIGHT, CARD_WIDTH } from '../card/defaults';
import { ensureFonts } from '../card/fonts';
import { drawCard, drawGuides } from '../card/renderer';
import { PART_BY_ID } from '../card/schema';

const Pane = styled.section`
  min-width: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding-block: 24px;
  padding-right: 16px;
  background: var(--stage);

  /* 휴대폰: 콘솔을 스크롤해도 미리보기가 위에 고정되도록 */
  @media (max-width: 900px) {
    position: sticky;
    top: env(safe-area-inset-top, 0px);
    z-index: 5;
    padding-block: 10px;
    padding-right: 0;
    background: var(--bg);
    border-bottom: 1px solid var(--line);
  }
`;

const Frame = styled.div`
  position: relative;
  width: 100%;
  max-width: 1600px;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  background: #ffffff;
  box-shadow: 0 12px 40px var(--shadow);
  cursor: pointer;
  outline: ${p => (p.$drag ? '3px dashed var(--accent)' : 'none')};
  outline-offset: 4px;
`;

// 선택한 파트 표시 (미리보기 전용 — 다운로드 이미지에는 포함되지 않음)
const Outline = styled.div`
  position: absolute;
  pointer-events: none;
  border: 2px dashed var(--accent);
  border-radius: 3px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.7);

  span {
    position: absolute;
    left: -2px;
    bottom: 100%;
    margin-bottom: 3px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--accent);
    color: var(--accent-fg);
    font-size: 11px;
    white-space: nowrap;
  }

  /* 카드 위쪽 끝에 붙은 파트는 이름표를 아래에 */
  &[data-below] span {
    bottom: auto;
    top: 100%;
    margin: 3px 0 0;
  }
`;

const Hint = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  text-align: center;

  @media (max-width: 900px) {
    display: none;
  }
`;

// 클릭 판정 우선순위 (위에 그려지는 것부터)
const HIT_ORDER = ['sub', 'title', 'era', 'right', 'left', 'logo', 'bottomLine', 'topLine'];

function normalize(layout, W, H) {
  const out = {};
  for (const [k, r] of Object.entries(layout)) {
    out[k] = { x: (r.x / W) * 100, y: (r.y / H) * 100, w: (r.w / W) * 100, h: (r.h / H) * 100, hidden: r.hidden };
  }
  return out;
}

function hitTest(layout, px, py) {
  for (const id of HIT_ORDER) {
    const r = layout?.[id];
    if (!r || r.hidden) continue;
    const pad = id.endsWith('Line') ? 1.6 : 0.4; // 얇은 선은 판정 영역을 넓힘
    if (px >= r.x - 0.4 && px <= r.x + r.w + 0.4 && py >= r.y - pad && py <= r.y + r.h + pad) return id;
  }
  return 'bg';
}

export function Preview({ state, images, showGuides, fontVersion, layout, selected, onLayout, onSelect, onDropImage }) {
  const canvasRef = useRef(null);
  const renderId = useRef(0);
  const lastLayout = useRef('');
  const [fontsReady, setFontsReady] = useState(0);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(n => n + 1));
  }, []);

  useEffect(() => {
    const id = ++renderId.current;
    let raf = 0;
    ensureFonts(state).then(() => {
      if (id !== renderId.current) return; // 더 최신 렌더가 있으면 버림
      raf = requestAnimationFrame(() => {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        const rects = drawCard(ctx, c.width, c.height, state, images);
        if (showGuides) drawGuides(ctx, c.width, c.height, state);
        const next = normalize(rects, c.width, c.height);
        const key = JSON.stringify(next);
        if (key !== lastLayout.current) {
          lastLayout.current = key;
          onLayout(next);
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [state, images, showGuides, fontsReady, fontVersion, onLayout]);

  const handleClick = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    onSelect(hitTest(layout, px, py));
  };

  const sel = selected !== 'bg' && layout?.[selected];
  const isLine = selected.endsWith('Line');

  return (
    <Pane>
      <Frame>
        <Canvas
          ref={canvasRef}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          $drag={drag}
          role="img"
          aria-label={`${state.title.text} 타이틀 카드 미리보기. 누르면 해당 부분을 편집합니다.`}
          onClick={handleClick}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => {
            e.preventDefault();
            setDrag(false);
            const f = [...e.dataTransfer.files].find(x => x.type.startsWith('image/'));
            if (f) onDropImage(f);
          }}
        />
        {sel && (
          <Outline
            data-below={sel.y < 9 ? '' : undefined}
            style={{
              left: `calc(${sel.x}% - 4px)`,
              width: `calc(${sel.w}% + 8px)`,
              top: isLine ? `calc(${sel.y + sel.h / 2}% - 6px)` : `calc(${sel.y}% - 4px)`,
              height: isLine ? '12px' : `calc(${sel.h}% + 8px)`,
              opacity: sel.hidden ? 0.5 : 1,
            }}
          >
            <span>{PART_BY_ID[selected].title}{sel.hidden ? ' (숨김)' : ''}</span>
          </Outline>
        )}
      </Frame>
      <Hint>미리보기에서 바꾸고 싶은 부분을 누르면 해당 설정이 열립니다 · 이미지 파일을 끌어다 놓으면 배경으로 설정</Hint>
    </Pane>
  );
}
