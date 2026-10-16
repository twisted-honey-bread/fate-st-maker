import { useRef } from 'react';
import styled from 'styled-components';
import { FONT_GROUPS, fontLabel } from '../../card/fonts';
import { Button, Select } from '../ui';

/*
 * 부분별 폰트 선택 — 정해진 선택지(폰트+굵기) + 이 칸에 직접 올린 폰트
 * value: { font, weight }, weight 키가 없는 그룹(한글)은 굵기를 따로 고름
 * uploaded: 이 그룹의 업로드 칸에 올린 폰트 이름 목록
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
const SEP = '\u0000';

export function FontField({ id, label, group, value, withWeight, uploaded = [], onPick, onUpload }) {
  const inputRef = useRef(null);
  const g = FONT_GROUPS[group];
  const options = [
    ...g.presets.map(([f, w], i) => ({
      key: `${f}${SEP}${w ?? ''}`,
      font: f,
      weight: w,
      text: `${fontLabel(f)}${w ? ` ${w}` : ''}${i === 0 ? ' (기본)' : ''}`,
    })),
    ...uploaded.map(f => ({ key: `${f}${SEP}${withWeight ? 400 : ''}`, font: f, weight: withWeight ? 400 : null, text: `${f} (업로드)` })),
  ];
  const current = `${value.font}${SEP}${withWeight ? value.weight ?? '' : ''}`;
  // 굵기만 다른 경우(예: 업로드 폰트) 이름으로라도 맞춤
  const selected = options.find(o => o.key === current) || options.find(o => o.font === value.font);

  return (
    <Row>
      <label htmlFor={id}>{label}</label>
      <Select
        id={id}
        value={selected?.key ?? ''}
        onChange={e => {
          const o = options.find(x => x.key === e.target.value);
          if (o) onPick(o.font, o.weight);
        }}
      >
        {!selected && <option value="">{value.font}</option>}
        {options.map(o => (
          <option key={o.key} value={o.key} style={{ fontFamily: `"${o.font}"` }}>{o.text}</option>
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
  );
}
