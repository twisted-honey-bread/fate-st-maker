import { useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Checkbox, ColorInput, NumberInput, Range, Select, TextInput } from '../ui';
import { EASINGS } from '../../card/animation/util';
import { IMAGE_ACCEPT, IMAGE_MAX_MB } from '../../card/utils';

const Row = styled.div`
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: center;
  gap: 8px;

  & > label {
    font-size: 12px;
    color: var(--muted);
  }
`;

const Hint = styled.p`
  grid-column: 2;
  margin: -2px 0 2px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted);
`;


const Note = styled.p`
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--surface-2);
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
`;

// SwiftUI segmented picker 같은 선택 막대 (칸 너비 균등, 콘솔 폭 전체)
const Seg = styled.div`
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-2);

  button {
    padding: 6px 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    font-size: 12px;
    cursor: pointer;
  }
  button:hover { color: var(--fg); }
  button[aria-checked="true"] {
    background: var(--surface);
    color: var(--fg);
    font-weight: 700;
    box-shadow: 0 1px 3px var(--shadow);
  }
`;

const Subhead = styled.div`
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--muted);
`;

const RangeWrap = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px;
  gap: 6px;
  align-items: center;
`;

const ImageWrap = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
`;

const Thumb = styled.div`
  flex: none;
  width: 54px;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--stage) center / contain no-repeat;
  background-image: ${p => (p.$url ? `url("${p.$url}")` : 'none')};
`;

const EaseWrap = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 6px;
  align-items: center;
`;

const Curve = styled.svg`
  width: 44px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-2);

  path { fill: none; stroke: var(--accent); stroke-width: 1.6; }
  line { stroke: var(--line); stroke-width: 1; }
`;

// 움직임 곡선 미리보기 (가로 = 시간, 세로 = 진행도)
function EaseCurve({ name }) {
  const fn = (EASINGS[name] || EASINGS.linear).fn;
  const pts = Array.from({ length: 25 }, (_, i) => {
    const p = i / 24;
    return `${(4 + p * 36).toFixed(1)},${(26 - fn(p) * 20).toFixed(1)}`;
  });
  return (
    <Curve viewBox="0 0 44 30" aria-hidden="true">
      <line x1="4" y1="26" x2="40" y2="26" />
      <line x1="4" y1="6" x2="40" y2="6" />
      <path d={`M${pts.join(' L')}`} />
    </Curve>
  );
}

const fieldId = k => 'f_' + k.replace(/\./g, '_');

function RangeField({ id, field, value, onChange }) {
  // 숫자 칸은 입력 중간값('-', '0.')을 허용하기 위해 임시 문자열을 따로 둠
  const [draft, setDraft] = useState(null);
  const { min, max, step } = field;
  return (
    <RangeWrap>
      <Range id={id} min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
      <NumberInput
        id={id + '_num'}
        aria-label={field.label}
        min={min}
        max={max}
        step={step}
        value={draft ?? value}
        onChange={e => {
          setDraft(e.target.value);
          if (e.target.value !== '' && !Number.isNaN(+e.target.value)) onChange(+e.target.value);
        }}
        onBlur={() => setDraft(null)}
      />
    </RangeWrap>
  );
}

function ImageField({ id, url, onFile, onClear }) {
  const inputRef = useRef(null);
  return (
    <ImageWrap>
      <Thumb $url={url} />
      <Button $small type="button" onClick={() => inputRef.current?.click()}>파일 선택</Button>
      <Button $small type="button" onClick={onClear} disabled={!url}>기본값</Button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </ImageWrap>
  );
}

export function Field({ field, value, onChange, fontList, imageUrl, onImageFile, onImageClear, onAction }) {
  if (field.type === 'heading') return <Subhead>{field.label}</Subhead>;
  if (field.type === 'note') return <Note>{field.label}</Note>;
  if (field.type === 'segment') {
    return (
      <Seg role="radiogroup" aria-label={field.label}>
        {field.options.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>{l}</button>
        ))}
      </Seg>
    );
  }

  const id = fieldId(field.k);
  const label = field.label + (field.unit ? ` (${field.unit})` : '');
  let control;

  switch (field.type) {
    case 'text':
      control = <TextInput id={id} value={value} onChange={e => onChange(e.target.value)} />;
      break;
    case 'color':
      control = <ColorInput id={id} value={value} onChange={e => onChange(e.target.value)} />;
      break;
    case 'check':
      control = <Checkbox id={id} checked={value} onChange={e => onChange(e.target.checked)} />;
      break;
    case 'range':
      control = <RangeField id={id} field={field} value={value} onChange={onChange} />;
      break;
    case 'select':
    case 'font': {
      const options = field.type === 'font' ? fontList.map(f => [f.family, f.label]) : field.options;
      control = (
        <Select
          id={id}
          value={String(value)}
          onChange={e => onChange(typeof value === 'number' ? +e.target.value : e.target.value)}
        >
          {options.map(([v, l]) => (
            <option key={v} value={v} style={field.type === 'font' ? { fontFamily: `"${v}"` } : undefined}>
              {l}
            </option>
          ))}
        </Select>
      );
      break;
    }
    case 'button':
      control = (
        <Button type="button" $primary id={id} onClick={() => onAction?.(field.action)}>{field.text}</Button>
      );
      break;
    case 'ease':
      control = (
        <EaseWrap>
          <Select id={id} value={value} onChange={e => onChange(e.target.value)}>
            {Object.entries(EASINGS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <EaseCurve name={value} />
        </EaseWrap>
      );
      break;
    case 'image':
      control = <ImageField id={id} url={imageUrl} onFile={onImageFile} onClear={onImageClear} />;
      break;
    default:
      control = null;
  }

  return (
    <Row>
      <label htmlFor={id}>{label}</label>
      {control}
      {field.type === 'image' && (
        <Hint>
          PNG · JPG · WEBP · SVG, 최대 {IMAGE_MAX_MB}MB.
          {field.hint && <><br />{field.hint}</>}
        </Hint>
      )}
    </Row>
  );
}
