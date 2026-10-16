import { useRef, useState } from 'react';
import styled from 'styled-components';
import { colorAt, cssGradient, sortStops } from '../../card/gradient';
import { Button, ColorInput, NumberInput, Select } from '../ui';

/*
 * 피그마식 그라데이션 편집기 — 형태(단색/가로/세로), 색 지점의 위치·색을 한 곳에서 보며 편집
 * - 띠 위의 핀을 끌어 위치 조정, 띠의 빈 곳을 누르면 그 위치의 색으로 지점 추가
 * - 아래 목록에서 위치(%)·색 입력, − 로 삭제 (최소 2개)
 * value: { mode, color, stops, scope }  — 없는 항목은 편집기에서 숨김
 * onChange(patch): 바뀐 항목만 넘김
 */
const Wrap = styled.div`
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  > span {
    flex: 1;
    font-size: 12px;
    color: var(--muted);
  }
`;

const Seg = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-2);

  button {
    padding: 3px 9px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    font-size: 12px;
    cursor: pointer;
  }
  button[aria-checked="true"] {
    background: var(--surface);
    color: var(--fg);
    font-weight: 700;
    box-shadow: 0 1px 3px var(--shadow);
  }
`;

const Icon = styled(Button).attrs({ $small: true, type: 'button' })`
  padding: 3px 7px;
  font-size: 13px;
  line-height: 1;
`;

const Track = styled.div`
  position: relative;
  margin: 26px 12px 0;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--line-strong);
  cursor: copy;
  touch-action: none;
`;

const Pin = styled.button`
  position: absolute;
  bottom: calc(100% + 2px);
  width: 22px;
  height: 22px;
  margin-left: -11px;
  padding: 3px;
  border: 2px solid ${p => (p.$active ? 'var(--accent)' : 'var(--line-strong)')};
  border-radius: 6px;
  background: ${p => (p.$active ? 'var(--accent)' : 'var(--surface)')};
  box-shadow: 0 1px 4px var(--shadow);
  cursor: ew-resize;
  touch-action: none;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 100%;
    margin-left: -4px;
    border: 4px solid transparent;
    border-top-color: ${p => (p.$active ? 'var(--accent)' : 'var(--line-strong)')};
  }

  span {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 3px;
    background: ${p => p.$c};
  }
`;

const List = styled.div`
  display: grid;
  gap: 4px;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 64px 34px minmax(0, 1fr) 28px;
  gap: 6px;
  align-items: center;
  padding: 3px 4px;
  border-radius: 6px;
  background: ${p => (p.$active ? 'var(--surface-2)' : 'transparent')};
  outline: ${p => (p.$active ? '1px solid var(--accent)' : 'none')};
`;

const Pct = styled.label`
  position: relative;

  input { padding-right: 16px; }
  &::after {
    content: '%';
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    color: var(--muted);
  }
`;

const Hex = styled.input.attrs({ type: 'text', spellCheck: false })`
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-2);
  font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
  text-transform: lowercase;
`;

const Sub = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
`;

const MODE_LABEL = { solid: '단색', horizontal: '가로', vertical: '세로' };
const clamp01 = v => Math.max(0, Math.min(1, v));
const round = v => Math.round(v * 1000) / 1000;

function HexInput({ value, onChange, id }) {
  const [draft, setDraft] = useState(null);
  return (
    <Hex
      id={id}
      aria-label="색 코드"
      value={draft ?? value}
      onChange={e => {
        setDraft(e.target.value);
        const v = e.target.value.trim().replace(/^#?/, '#');
        if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase());
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export function GradientEditor({ id, label, value, modes, onChange }) {
  const { mode = 'horizontal', color, stops = [], scope } = value;
  const [sel, setSel] = useState(0);
  const trackRef = useRef(null);
  const drag = useRef(null);
  const isGrad = mode !== 'solid';
  const active = Math.min(sel, stops.length - 1);

  const setStops = next => onChange({ stops: next });
  const updateStop = (i, patch) => setStops(stops.map((s, j) => (j === i ? [patch[0] ?? s[0], patch[1] ?? s[1]] : s)));
  const posFromEvent = e => {
    const r = trackRef.current.getBoundingClientRect();
    return clamp01((e.clientX - r.left) / r.width);
  };

  const addAt = p => {
    const next = [...stops, [round(p), colorAt(stops, p)]];
    setStops(next);
    setSel(next.length - 1);
  };
  // 가장 넓은 빈 구간 가운데에 추가
  const addInGap = () => {
    const s = sortStops(stops);
    let best = [0, 1];
    for (let i = 1; i < s.length; i++) if (s[i][0] - s[i - 1][0] > best[1] - best[0]) best = [s[i - 1][0], s[i][0]];
    addAt((best[0] + best[1]) / 2);
  };
  const remove = i => {
    if (stops.length <= 2) return;
    setStops(stops.filter((_, j) => j !== i));
    setSel(0);
  };
  const reverse = () => setStops(stops.map(([p, c]) => [round(1 - p), c]));
  // 왼쪽 절반을 기준으로 좌우대칭 만들기
  const mirror = () => {
    const left = sortStops(stops).filter(([p]) => p <= 0.5);
    const base = left.length ? left : [[0, stops[0][1]]];
    const right = base.filter(([p]) => p < 0.5).map(([p, c]) => [round(1 - p), c]).reverse();
    setStops([...base, ...right]);
    setSel(0);
  };

  const pinDown = (e, i) => {
    e.preventDefault();
    e.stopPropagation();
    setSel(i);
    drag.current = i;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const pinMove = e => {
    if (drag.current === null) return;
    updateStop(drag.current, [round(posFromEvent(e))]);
  };
  const pinUp = () => { drag.current = null; };

  const order = sortStops(stops.map((s, i) => [s[0], i])).map(([, i]) => i);

  return (
    <Wrap role="group" aria-label={label}>
      <Head>
        <span>{label}</span>
        {modes.length > 1 && (
          <Seg role="radiogroup" aria-label="채우기 형태">
            {modes.map(m => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => onChange({ mode: m })}>
                {MODE_LABEL[m]}
              </button>
            ))}
          </Seg>
        )}
        {isGrad && <Icon title="방향 뒤집기" aria-label="방향 뒤집기" onClick={reverse}>⇆</Icon>}
        {isGrad && <Icon title="왼쪽 절반 기준으로 좌우대칭" aria-label="좌우대칭으로 만들기" onClick={mirror}>◇</Icon>}
      </Head>

      {!isGrad && (
        <Row>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>색</span>
          <ColorInput id={id} aria-label="색" value={color} onChange={e => onChange({ color: e.target.value })} />
          <HexInput value={color} onChange={v => onChange({ color: v })} />
          <span />
        </Row>
      )}

      {isGrad && (
        <>
          <Track
            ref={trackRef}
            style={{ background: cssGradient(stops) }}
            title="빈 곳을 누르면 색 지점 추가"
            onPointerDown={e => addAt(posFromEvent(e))}
          >
            {stops.map(([p, c], i) => (
              <Pin
                key={i}
                type="button"
                $c={c}
                $active={i === active}
                style={{ left: `${p * 100}%` }}
                aria-label={`색 지점 ${Math.round(p * 100)}%`}
                onPointerDown={e => pinDown(e, i)}
                onPointerMove={pinMove}
                onPointerUp={pinUp}
                onPointerCancel={pinUp}
                onKeyDown={e => {
                  const d = e.key === 'ArrowLeft' ? -0.01 : e.key === 'ArrowRight' ? 0.01 : 0;
                  if (d) { e.preventDefault(); updateStop(i, [round(clamp01(p + d))]); }
                  if (e.key === 'Delete' || e.key === 'Backspace') remove(i);
                }}
              >
                <span />
              </Pin>
            ))}
          </Track>

          <Sub>
            <span>색 지점 {mode === 'horizontal' ? '(왼쪽 → 오른쪽)' : '(위 → 아래)'}</span>
            <Icon title="색 지점 추가" aria-label="색 지점 추가" onClick={addInGap}>＋</Icon>
          </Sub>
          <List>
            {order.map(i => {
              const [p, c] = stops[i];
              return (
                <Row key={i} $active={i === active} onFocus={() => setSel(i)} onPointerDown={() => setSel(i)}>
                  <Pct>
                    <NumberInput
                      aria-label="위치"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(p * 1000) / 10}
                      onChange={e => e.target.value !== '' && updateStop(i, [round(clamp01(+e.target.value / 100))])}
                    />
                  </Pct>
                  <ColorInput aria-label="색" value={c} onChange={e => updateStop(i, [undefined, e.target.value])} />
                  <HexInput value={c} onChange={v => updateStop(i, [undefined, v])} />
                  <Icon
                    title="색 지점 삭제"
                    aria-label="색 지점 삭제"
                    disabled={stops.length <= 2}
                    onClick={() => remove(i)}
                  >
                    −
                  </Icon>
                </Row>
              );
            })}
          </List>
          {scope !== undefined && mode === 'horizontal' && (
            <Sub>
              <span>가로 기준</span>
              <Select
                aria-label="가로 그라데이션 기준"
                value={scope}
                onChange={e => onChange({ scope: e.target.value })}
                style={{ width: 'auto' }}
              >
                <option value="text">글자 폭</option>
                <option value="canvas">화면 폭</option>
              </Select>
            </Sub>
          )}
        </>
      )}
    </Wrap>
  );
}
