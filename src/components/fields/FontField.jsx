import { useRef } from 'react';
import styled from 'styled-components';
import { FONT_GROUPS, WEIGHTS, fontLabel } from '../../card/fonts';
import { Button, Select } from '../ui';

/*
 * 부분별 폰트 선택 — 정해진 선택지 + 이 칸에 직접 올린 폰트
 * withWeight: 폰트를 고르면 그 선택지의 기본 굵기(presetWeights)로 바뀌고, 아래 굵기 칸에서 다시 조정
 *             굵기를 바꾸면 onWeight 가 그 선택지의 기본 굵기도 함께 갱신
 * value: { font, weight }, uploaded: 이 그룹의 업로드 칸에 올린 폰트 이름 목록
 */
const Row = styled.div`
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;

  & > label {
    font-size: 12px;
    color: var(--muted);
  }
`;

const ACCEPT = '.ttf,.otf,.woff,.woff2';

export function FontField({ id, label, group, value, withWeight, presetWeights = {}, uploaded = [], onPick, onWeight, onUpload }) {
  const inputRef = useRef(null);
  const g = FONT_GROUPS[group];
  const preset = g.presets.find(([f]) => f === value.font);
  const options = [
    ...g.presets.map(([f], i) => ({ font: f, text: `${fontLabel(f)}${i === 0 ? ' (기본)' : ''}` })),
    ...uploaded.map(f => ({ font: f, text: `${f} (업로드)` })),
  ];
  const known = options.some(o => o.font === value.font);
  // 쓸 수 있는 굵기: 선택지는 그 폰트가 가진 굵기, 업로드 폰트는 전체 (없는 굵기는 브라우저가 흉내 냄)
  const weights = preset?.[2] || WEIGHTS;

  return (
    <>
      <Row>
        <label htmlFor={id}>{label}</label>
        <Select
          id={id}
          value={value.font}
          onChange={e => {
            const f = e.target.value;
            const isPreset = g.presets.some(([p]) => p === f);
            onPick(f, withWeight ? (isPreset ? presetWeights[f] : 400) : null);
          }}
          style={{ gridColumn: 2 }}
        >
          {!known && <option value={value.font}>{value.font}</option>}
          {options.map(o => (
            <option key={o.font} value={o.font} style={{ fontFamily: `"${o.font}"` }}>{o.text}</option>
          ))}
        </Select>
        <Button $small type="button" title="TTF · OTF · WOFF · WOFF2 — 이 목록에 추가되고 바로 적용" onClick={() => inputRef.current?.click()}>
          업로드
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = '';
          }}
        />
      </Row>
      {withWeight && (
        <Row>
          <label htmlFor={`${id}_weight`}>굵기</label>
          <Select
            id={`${id}_weight`}
            value={String(value.weight)}
            onChange={e => onWeight(+e.target.value, !!preset)}
            style={{ gridColumn: '2 / 4' }}
          >
            {!weights.includes(value.weight) && <option value={String(value.weight)}>{value.weight}</option>}
            {weights.map(w => <option key={w} value={String(w)}>{w}{preset && w === presetWeights[value.font] ? ' (기본)' : ''}</option>)}
          </Select>
        </Row>
      )}
    </>
  );
}
