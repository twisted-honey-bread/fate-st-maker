import styled from 'styled-components';
import { EASINGS } from '../../card/animation/util';
import { NumberInput, Select } from '../ui';
import { EaseCurve } from './Field';

/*
 * 애니메이션 단계 하나 — 이름 / 움직임 곡선 / 시작·끝(초) / 전체 길이 안에서의 위치 막대
 * stage: timing.js 의 STAGES 항목, time: [시작, 끝] (end 가 null 이면 끝까지)
 * locked: 끝 시간이 다른 단계에 맞춰져 있어 입력할 수 없음 (사유 문구)
 */
const Wrap = styled.div`
  display: grid;
  gap: 4px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--line);

  > b {
    font-size: 12px;
    font-weight: 600;
    color: var(--fg);
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 6px;
  align-items: center;
`;

const Times = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  font-size: 12px;
  color: var(--muted);

  input { width: 62px; }
  small { font-size: 11px; }
`;

const Bar = styled.div`
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: var(--surface-2);
  overflow: hidden;

  span {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 3px;
    background: var(--accent);
  }
`;

const num = v => Math.round(v * 100) / 100;

export function StageField({ id, stage, ease, time, total, locked, onEase, onTime }) {
  const [s, e] = time || [];
  const lengthOnly = stage.lengthOnly;
  const set = (i, v) => {
    if (v === '' || Number.isNaN(+v)) return;
    const next = [...time];
    next[i] = Math.max(0, +v);
    onTime(next);
  };
  const barEnd = e ?? total;
  return (
    <Wrap>
      <b>{stage.label}</b>
      {stage.ease && (
        <Row>
          <Select id={id} aria-label={`${stage.label} 움직임 곡선`} value={ease} onChange={ev => onEase(ev.target.value)}>
            {Object.entries(EASINGS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <EaseCurve name={ease} />
        </Row>
      )}
      {time && (
        <Times>
          {lengthOnly ? (
            <>
              길이
              <NumberInput aria-label={`${stage.label} 길이`} min={0} step={0.05} value={num(e)} onChange={ev => set(1, ev.target.value)} />
              초
            </>
          ) : (
            <>
              <NumberInput aria-label={`${stage.label} 시작`} min={0} step={0.05} value={num(s)} onChange={ev => set(0, ev.target.value)} />
              초 →
              {e === null ? (
                <small>끝까지</small>
              ) : (
                <>
                  <NumberInput
                    aria-label={`${stage.label} 끝`}
                    min={0}
                    step={0.05}
                    value={num(e)}
                    disabled={!!locked}
                    title={locked || undefined}
                    onChange={ev => set(1, ev.target.value)}
                  />
                  초
                </>
              )}
              {locked && <small>({locked})</small>}
            </>
          )}
        </Times>
      )}
      {time && !lengthOnly && total > 0 && (
        <Bar aria-hidden="true">
          <span style={{ left: `${(s / total) * 100}%`, width: `${Math.max(1, ((Math.max(s, barEnd) - s) / total) * 100)}%` }} />
        </Bar>
      )}
    </Wrap>
  );
}
