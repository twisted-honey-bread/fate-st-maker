import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { CARD_HEIGHT, CARD_WIDTH } from '../card/defaults';
import { ensureFonts } from '../card/fonts';
import { drawCard, drawGuides } from '../card/renderer';
import { PART_BY_ID } from '../card/schema';
import { ANIMATIONS, ensureAnimFonts, isAnimMode } from '../card/animation';
import { ModeSwitch, PlayerBar } from './Player';
import { BgEditBar, BgEditor, editFrameLayout } from './BgEditor';

const Pane = styled.section`
  min-width: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: safe center; /* 내용이 넘쳐도 위쪽이 잘리지 않게 */
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
  z-index: 0;
  isolation: isolate; /* 직접 조정 상자가 넘쳐도 위·아래 막대보다 뒤에 있도록 */
  width: 100%;
  max-width: 1600px;
`;

const Canvas = styled.canvas`
  position: relative;
  z-index: 1;
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

// 원본 이미지 겹쳐보기 (미리보기 전용 — 다운로드에는 포함되지 않음)
// 쌓는 순서: 배경 직접 조정의 흐린 사진(0) < 캔버스(1) < 원본 겹쳐보기(2) < 직접 조정 상자·선택 표시(3)
const Reference = styled.img`
  position: absolute;
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: 100%;
  object-fit: fill;
  pointer-events: none;
`;

// 선택한 파트 표시 (미리보기 전용 — 다운로드 이미지에는 포함되지 않음)
const Outline = styled.div`
  position: absolute;
  z-index: 3;
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
const HIT_ORDER = ['sub', 'title', 'era', 'right', 'left', 'logo']; // 상단선·하단선은 고정값이라 선택 대상 아님

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

// 애니메이션 미리보기 해상도 (재생 성능을 위해 낮춤, 다운로드는 선택한 해상도로 따로 렌더링)
const ANIM_W = 1280;
const ANIM_H = 720;

export function Preview({
  state, images, showGuides, fontVersion, layout, selected,
  onLayout, onSelect, onDropImage, onModeChange, reference, exporting, children, bgEdit,
}) {
  const frameRef = useRef(null);
  // 직접 조정 중 카드 배치 — 끄는 동안에는 고정하고 손을 뗄 때만 다시 맞춤 (끄는 중 좌표가 흔들리지 않게)
  const [dragging, setDragging] = useState(false);
  const fitRef = useRef(null);
  if (bgEdit && (!dragging || !fitRef.current)) fitRef.current = editFrameLayout(images.bg, bgEdit.draft);
  const fit = bgEdit ? fitRef.current : null;
  const canvasRef = useRef(null);
  const renderId = useRef(0);
  const lastLayout = useRef('');
  const [fontsReady, setFontsReady] = useState(0);
  const [drag, setDrag] = useState(false);

  const mode = state.anim.mode;
  const animMode = isAnimMode(mode);
  const anim = animMode ? ANIMATIONS[mode] : null;
  const duration = anim ? anim.duration(state) : 0;

  // 재생 상태
  const [playing, setPlaying] = useState(true);
  const [loop, setLoop] = useState(true);
  const [time, setTime] = useState(0);
  const [animFontsKey, setAnimFontsKey] = useState(0);
  const timeRef = useRef(0);
  const stateRef = useRef(state);
  const imagesRef = useRef(images);
  const durationRef = useRef(duration);
  const loopRef = useRef(loop);
  stateRef.current = state;
  imagesRef.current = images;
  durationRef.current = duration;
  loopRef.current = loop;

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(n => n + 1));
  }, []);

  const publishLayout = useCallback((rects, W, H) => {
    const next = normalize(rects, W, H);
    const key = JSON.stringify(next);
    if (key !== lastLayout.current) {
      lastLayout.current = key;
      onLayout(next);
    }
  }, [onLayout]);

  // 정지 이미지 렌더링 (애니메이션 모드에서는 구조도용 배치만 계산)
  useEffect(() => {
    const id = ++renderId.current;
    let raf = 0;
    ensureFonts(state).then(() => {
      if (id !== renderId.current) return; // 더 최신 렌더가 있으면 버림
      raf = requestAnimationFrame(() => {
        if (animMode) {
          const c = document.createElement('canvas');
          c.width = 480;
          c.height = 270;
          publishLayout(drawCard(c.getContext('2d'), c.width, c.height, state, images), c.width, c.height);
          return;
        }
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        const rects = drawCard(ctx, c.width, c.height, state, images);
        if (showGuides) drawGuides(ctx, c.width, c.height, state);
        publishLayout(rects, c.width, c.height);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [state, images, showGuides, fontsReady, fontVersion, animMode, publishLayout]);

  /* ---------- 애니메이션 ---------- */
  const drawFrame = useCallback(t => {
    const c = canvasRef.current;
    const a = ANIMATIONS[stateRef.current.anim.mode];
    if (!c || !a) return;
    a.draw(c.getContext('2d'), c.width, c.height, stateRef.current, imagesRef.current, t);
  }, []);

  // 모드를 바꾸면 처음부터 재생
  useEffect(() => {
    timeRef.current = 0;
    setTime(0);
    setPlaying(true);
  }, [mode]);

  // 애니메이션용 폰트 준비
  useEffect(() => {
    if (!animMode) return undefined;
    let alive = true;
    Promise.all([ensureFonts(state), ensureAnimFonts(state)]).then(() => alive && setAnimFontsKey(k => k + 1));
    return () => { alive = false; };
  }, [animMode, state, fontVersion]);

  // 재생 루프 (파일을 만드는 동안은 멈춰서 렌더링 자원을 양보)
  useEffect(() => {
    if (!animMode || !playing || exporting) return undefined;
    let raf = 0;
    let last = performance.now();
    const step = now => {
      let t = timeRef.current + (now - last) / 1000;
      last = now;
      const d = durationRef.current;
      if (t >= d) {
        if (loopRef.current) {
          t = 0;
        } else {
          timeRef.current = d;
          setTime(d);
          drawFrame(d);
          setPlaying(false);
          return;
        }
      }
      timeRef.current = t;
      setTime(t);
      drawFrame(t);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [animMode, playing, exporting, drawFrame]);

  // 일시정지 중에는 설정이 바뀔 때 현재 프레임만 다시 그림
  useEffect(() => {
    if (animMode && !playing) drawFrame(Math.min(timeRef.current, duration));
  }, [animMode, playing, state, images, animFontsKey, duration, drawFrame]);

  const togglePlay = () => {
    if (!playing && timeRef.current >= durationRef.current) {
      timeRef.current = 0;
      setTime(0);
    }
    setPlaying(p => !p);
  };

  const seek = t => {
    setPlaying(false);
    timeRef.current = t;
    setTime(t);
    drawFrame(t);
  };

  const handleClick = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    onSelect(hitTest(layout, px, py));
  };

  const sel = !animMode && selected !== 'bg' && layout?.[selected];
  const isLine = selected.endsWith('Line');

  return (
    <Pane>
      {bgEdit
        ? <BgEditBar draft={bgEdit.draft} onApply={bgEdit.onApply} onCancel={bgEdit.onCancel} onReset={bgEdit.onReset} />
        : <ModeSwitch mode={mode} onChange={onModeChange} />}
      <Frame
        ref={frameRef}
        style={fit ? {
          width: `${fit.width}%`,
          marginTop: `${fit.top}%`,
          marginBottom: `${fit.bottom}%`,
          transform: `translateX(${fit.shift}%)`,
        } : undefined}
      >
        <Canvas
          ref={canvasRef}
          width={animMode ? ANIM_W : CARD_WIDTH}
          height={animMode ? ANIM_H : CARD_HEIGHT}
          $drag={drag}
          role="img"
          aria-label={animMode
            ? `${state.title.text} ${anim.label} 애니메이션 미리보기`
            : `${state.title.text} 타이틀 카드 미리보기. 누르면 해당 부분을 편집합니다.`}
          onClick={bgEdit ? undefined : handleClick}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => {
            e.preventDefault();
            setDrag(false);
            const f = [...e.dataTransfer.files].find(x => x.type.startsWith('image/'));
            if (f) onDropImage(f);
          }}
        />
        {reference.on && (
          <Reference
            src={reference.src}
            alt=""
            style={{ opacity: reference.opacity, mixBlendMode: reference.difference ? 'difference' : 'normal' }}
          />
        )}
        {bgEdit && (
          <BgEditor frameRef={frameRef} image={images.bg} imageUrl={bgEdit.imageUrl} draft={bgEdit.draft} onChange={bgEdit.onChange} onDragging={setDragging} />
        )}
        {sel && !bgEdit && (
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
      {animMode && (
        <PlayerBar
          playing={playing}
          onToggle={togglePlay}
          time={time}
          duration={duration}
          onSeek={seek}
          loop={loop}
          onLoop={setLoop}
        />
      )}
      {children}
      <Hint>미리보기에서 바꾸고 싶은 부분을 누르면 해당 설정이 열립니다 · 이미지 파일을 끌어다 놓으면 배경으로 설정</Hint>
    </Pane>
  );
}
