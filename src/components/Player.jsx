import styled from 'styled-components';
import { Checkbox, Range } from './ui';

/* 미리보기 위: 정지 이미지 / 인트로 / 아웃트로 전환 */
const Switch = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  max-width: 100%;
`;

const SwitchButton = styled.button`
  padding: 5px 12px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  white-space: nowrap;

  &:hover { color: var(--fg); }
  &[aria-selected="true"] {
    background: var(--accent);
    color: var(--accent-fg);
    font-weight: 700;
  }
`;

export const MODES = [
  ['still', '정지 이미지'],
  ['intro', '인트로'],
  ['outro', '아웃트로'],
];

export function ModeSwitch({ mode, onChange }) {
  return (
    <Switch role="tablist" aria-label="출력 종류">
      {MODES.map(([value, label]) => (
        <SwitchButton
          key={value}
          type="button"
          role="tab"
          aria-selected={mode === value}
          onClick={() => onChange(value)}
        >
          {label}
        </SwitchButton>
      ))}
    </Switch>
  );
}

/* 미리보기 아래: 재생 컨트롤 */
const Bar = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 1600px;
`;

const PlayButton = styled.button`
  width: 34px;
  height: 34px;
  border: 1px solid var(--accent);
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-fg);
  font-size: 13px;
  cursor: pointer;
`;

const Time = styled.span`
  min-width: 92px;
  font-size: 12px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  text-align: right;
`;

const Loop = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
`;

export function PlayerBar({ playing, onToggle, time, duration, onSeek, loop, onLoop }) {
  return (
    <Bar>
      <PlayButton type="button" onClick={onToggle} aria-label={playing ? '일시정지' : '재생'}>
        {playing ? '❚❚' : '▶'}
      </PlayButton>
      <Range
        id="timeline"
        aria-label="재생 위치"
        min={0}
        max={duration}
        step={0.01}
        value={Math.min(time, duration)}
        onChange={e => onSeek(+e.target.value)}
      />
      <Time>{time.toFixed(1)}s / {duration.toFixed(1)}s</Time>
      <Loop htmlFor="loopChk">
        <Checkbox id="loopChk" checked={loop} onChange={e => onLoop(e.target.checked)} />
        반복
      </Loop>
    </Bar>
  );
}
