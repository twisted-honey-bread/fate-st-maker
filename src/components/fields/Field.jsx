import { useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Checkbox, ColorInput, NumberInput, Range, Select, TextInput } from '../ui';

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
        accept="image/*"
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

export function Field({ field, value, onChange, fontList, imageUrl, onImageFile, onImageClear }) {
  if (field.type === 'heading') return <Subhead>{field.label}</Subhead>;

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
    </Row>
  );
}
