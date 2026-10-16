import { useRef, useState } from 'react';
import styled from 'styled-components';
import { colorAt, cssGradient, sortStops } from '../../card/gradient';
import { Button, ColorInput, NumberInput, Select } from '../ui';

/*
 * 피그마식 그라데이션 편집기 — 형태(단색/가로/세로), 색 지점의 위치·색을 한 곳에서 보며 편집
 * - 띠 위의 핀을 끌어 위치 조정, 띠의 빈 곳을 누르면 그 위치의 색으로 지점 추가
 * - 아래 목록에서 위치(%)·색 입력, − 로 삭제 (최소 2개)
 * - 대칭을 켜면 절반(끝 → 가운데)만 편집하고 나머지 절반은 자동으로 거울처럼 채움 (저장은 항상 전체 지점 목록)
 * value: { mode, color, stops, scope, symmetric }  — 없는 항목은 편집기에서 숨김
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
  ${p => p.$ghost && 'opacity: 0.45; pointer-events: none; border-style: dashed;'}

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

const Locked = styled.div`
  position: absolute;
  inset: 0 0 0 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px dashed rgba(255, 255, 255, 0.85);
  border-radius: 0 5px 5px 0;
  background: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0 4px, transparent 4px 9px);
  cursor: not-allowed;

  span {
    padding: 0 5px;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.45);
    color: #ffffff;
    font-size: 10px;
    white-space: nowrap;
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

// 전체 지점 → 앞쪽 절반(0~0.5) 지점 (최소 2개)
// 정렬하지 않고 저장된 순서를 유지 — 끄는 도중 지점끼리 순서가 바뀌어도 잡고 있는 지점이 바뀌지 않게
function halfStops(full) {
  const h = full.filter(([p]) => p <= 0.5);
  if (h.length >= 2) return h;
  if (h.length === 1) return [...h, [0.5, colorAt(full, 0.5)]];
  return [[0, colorAt(full, 0)], [0.5, colorAt(full, 0.5)]];
}
// 절반 → 전체 (0.5 의 지점은 한 번만)
const expandHalf = half => [...half, ...half.filter(([p]) => p < 0.5).map(([p, c]) => [round(1 - p), c])];

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
  const { mode = 'horizontal', color, stops: fullStops = [], scope, symmetric } = value;
  const canSym = 'symmetric' in value;
  const sym = canSym && !!symmetric;
  const span = sym ? 0.5 : 1; // 편집하는 범위
  const stops = sym ? halfStops(fullStops) : fullStops;
  const [sel, setSel] = useState(0);
  const trackRef = useRef(null);
  const drag = useRef(null);
  const isGrad = mode !== 'solid';
  const active = Math.min(sel, stops.length - 1);

  const setStops = next => onChange({ stops: sym ? expandHalf(next) : next });
  const updateStop = (i, patch) => setStops(stops.map((s, j) => (j === i ? [patch[0] ?? s[0], patch[1] ?? s[1]] : s)));
  const posFromEvent = e => {
    const r = trackRef.current.getBoundingClientRect();
    return Math.min(span, clamp01((e.clientX - r.left) / r.width)); // 띠는 항상 전체(0~100%), 편집은 span 까지
  };

  const addAt = p => {
    const next = [...stops, [round(p), colorAt(stops, p)]];
    setStops(next);
    setSel(next.length - 1);
  };
  // 가장 넓은 빈 구간 가운데에 추가
  const addInGap = () => {
    const s = sortStops(stops);
    let best = [0, span];
    for (let i = 1; i < s.length; i++) if (s[i][0] - s[i - 1][0] > best[1] - best[0]) best = [s[i - 1][0], s[i][0]];
    addAt((best[0] + best[1]) / 2);
  };
  const remove = i => {
    if (stops.length <= 2) return;
    setStops(stops.filter((_, j) => j !== i));
    setSel(0);
  };
  const reverse = () => setStops(stops.map(([p, c]) => [round(span - p), c]));
  // 대칭 켜기: 지금의 앞쪽 절반을 기준으로 전체를 다시 만듦 / 끄기: 지금 모양 그대로 자유 편집
  const toggleSym = on => {
    setSel(0);
    onChange(on ? { symmetric: true, stops: expandHalf(halfStops(fullStops)) } : { symmetric: false });
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
        {isGrad && canSym && (
          <Icon
            role="switch"
            aria-checked={sym}
            title={sym ? '대칭 끄기 — 전체를 자유롭게 편집' : '대칭 켜기 — 절반만 입력하면 나머지는 거울처럼'}
            $primary={sym}
            onClick={() => toggleSym(!sym)}
          >
            ◇ 대칭
          </Icon>
        )}
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
            style={{ background: cssGradient(sym ? expandHalf(stops) : stops) }}
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
                  if (d) { e.preventDefault(); updateStop(i, [round(Math.min(span, clamp01(p + d)))]); }
                  if (e.key === 'Delete' || e.key === 'Backspace') remove(i);
                }}
              >
                <span />
              </Pin>
            ))}
            {sym && (
              <>
                {/* 자동으로 채워지는 나머지 절반 — 보기만 하고 고를 수 없음 */}
                <Locked
                  title="대칭으로 자동 채워지는 부분 (편집하려면 대칭 끄기)"
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <span>자동 대칭</span>
                </Locked>
                {stops.filter(([p]) => p < 0.5).map(([p, c]) => (
                  <Pin key={`m${p}`} as="span" aria-hidden="true" $c={c} $ghost style={{ left: `${(1 - p) * 100}%` }}>
                    <span />
                  </Pin>
                ))}
              </>
            )}
          </Track>

          <Sub>
            <span>
              색 지점 {sym
                ? (mode === 'horizontal' ? '(왼쪽 끝 → 가운데 50%, 오른쪽은 자동 대칭)' : '(위 → 가운데 50%, 아래는 자동 대칭)')
                : (mode === 'horizontal' ? '(왼쪽 → 오른쪽)' : '(위 → 아래)')}
            </span>
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
                      max={span * 100}
                      step={1}
                      value={Math.round(p * 1000) / 10}
                      onChange={e => e.target.value !== '' && updateStop(i, [round(Math.min(span, clamp01(+e.target.value / 100)))])}
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
