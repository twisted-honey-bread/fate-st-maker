import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { LOGO_SHAPES } from '../../card/logoGen';

/*
 * 로고 형태 선택 — 각 형태의 외곽선을 아이콘으로 그려 버튼으로 고름
 * 아이콘은 logoGen 의 outline(테두리 경로)을 작은 캔버스에 그대로 그림
 */
const Wrap = styled.div`
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: center;
  gap: 8px;

  > span { font-size: 12px; color: var(--muted); }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 4px;
`;

const Opt = styled.button`
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid ${p => (p['aria-checked'] ? 'var(--accent)' : 'var(--line)')};
  border-radius: 6px;
  background: ${p => (p['aria-checked'] ? 'var(--surface)' : 'var(--surface-2)')};
  box-shadow: ${p => (p['aria-checked'] ? '0 0 0 1px var(--accent)' : 'none')};
  color: ${p => (p['aria-checked'] ? 'var(--accent)' : 'var(--muted)')};
  cursor: pointer;

  &:hover { color: var(--fg); }
  canvas { width: 24px; height: 24px; }
`;

function ShapeIcon({ shape }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext('2d');
    const size = 48;
    g.clearRect(0, 0, size, size);
    g.save();
    g.translate(size / 2, size / 2);
    g.beginPath();
    LOGO_SHAPES[shape].outline(g, size * 0.4);
    g.lineWidth = 4;
    g.lineJoin = 'round';
    g.strokeStyle = getComputedStyle(c).color || '#888';
    g.stroke();
    g.restore();
  });
  return <canvas ref={ref} width={48} height={48} aria-hidden="true" />;
}

export function ShapePicker({ id, label, value, onChange }) {
  return (
    <Wrap>
      <span id={id}>{label}</span>
      <Grid role="radiogroup" aria-labelledby={id}>
        {Object.entries(LOGO_SHAPES).map(([k, v]) => (
          <Opt key={k} type="button" role="radio" aria-checked={value === k} title={v.label} aria-label={v.label} onClick={() => onChange(k)}>
            <ShapeIcon shape={k} />
          </Opt>
        ))}
      </Grid>
    </Wrap>
  );
}
