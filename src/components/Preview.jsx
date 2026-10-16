import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { CARD_HEIGHT, CARD_WIDTH } from '../card/defaults';
import { ensureFonts } from '../card/fonts';
import { drawCard, drawGuides } from '../card/renderer';

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

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  max-width: 1600px;
  height: auto;
  aspect-ratio: 16 / 9;
  background: #ffffff;
  box-shadow: 0 12px 40px var(--shadow);
  outline: ${p => (p.$drag ? '3px dashed var(--accent)' : 'none')};
  outline-offset: 4px;
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

export function Preview({ state, images, showGuides, onDropImage }) {
  const canvasRef = useRef(null);
  const renderId = useRef(0);
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
        drawCard(ctx, c.width, c.height, state, images);
        if (showGuides) drawGuides(ctx, c.width, c.height, state);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [state, images, showGuides, fontsReady]);

  return (
    <Pane>
      <Canvas
        ref={canvasRef}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        $drag={drag}
        role="img"
        aria-label={`${state.title.text} 타이틀 카드 미리보기`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => {
          e.preventDefault();
          setDrag(false);
          const f = [...e.dataTransfer.files].find(x => x.type.startsWith('image/'));
          if (f) onDropImage(f);
        }}
      />
      <Hint>이미지 파일을 미리보기 위로 끌어다 놓으면 배경으로 설정됩니다 · 크기와 위치는 카드 높이(%H)/너비(%W) 기준 비율값</Hint>
    </Pane>
  );
}
