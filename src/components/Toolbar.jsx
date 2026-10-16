import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Checkbox, Range, Select } from './ui';

const Bar = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  padding-block: 10px;
  border-bottom: 1px solid var(--line);
`;

const Title = styled.h1`
  margin: 0 8px 0 0;
  font: 700 17px/1.2 var(--font-display);
  letter-spacing: 0.02em;
  white-space: nowrap;

  small {
    margin-left: 6px;
    font: 400 12px var(--font-ui);
    color: var(--muted);
  }
`;

const Group = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const Inline = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  color: var(--muted);

  select { width: auto; }
`;

const RefRange = styled(Range)`
  width: 90px;
`;

const Spacer = styled.span`
  flex: 1;
`;

export function Toolbar({
  formats, format, onFormat, sizes, size, onSize, onDownload, progress, onCancel,
  guides, onGuides, guidesEnabled, reference, onReference,
  onAddFont, onExport, onImport, onReset,
}) {
  const busy = progress !== null;
  const formatLabel = formats.find(([v]) => v === format)?.[1] || '';
  const fontRef = useRef(null);
  const jsonRef = useRef(null);
  // alert/confirm 없이 두 번 눌러 초기화
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <Bar>
      <Title>Lostbelt 타이틀 카드<small>fate-st-maker</small></Title>
      <Group>
        <Inline htmlFor="fmtSel">형식
          <Select id="fmtSel" value={format} onChange={e => onFormat(e.target.value)} disabled={busy}>
            {formats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Inline>
        <Inline htmlFor="sizeSel">해상도
          <Select id="sizeSel" value={size} onChange={e => onSize(+e.target.value)} disabled={busy}>
            {sizes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Inline>
        <Button $primary type="button" onClick={onDownload} disabled={busy}>
          {busy ? `만드는 중 ${Math.round(progress * 100)}%` : `${formatLabel} 다운로드`}
        </Button>
        {busy && <Button type="button" onClick={onCancel}>취소</Button>}
      </Group>
      <Spacer />
      <Group>
        <Inline htmlFor="guidesChk">
          <Checkbox id="guidesChk" checked={guides} disabled={!guidesEnabled} onChange={e => onGuides(e.target.checked)} />
          가이드
        </Inline>
        <Inline htmlFor="refChk" title="처음 예시 이미지를 반투명하게 겹쳐 위치와 폰트를 비교">
          <Checkbox id="refChk" checked={reference.on} onChange={e => onReference({ on: e.target.checked })} />
          원본 겹쳐보기
        </Inline>
        {reference.on && (
          <>
            <RefRange
              id="refOpacity"
              aria-label="원본 불투명도"
              min={0.05}
              max={1}
              step={0.05}
              value={reference.opacity}
              onChange={e => onReference({ opacity: +e.target.value })}
            />
            <Inline htmlFor="refDiff" title="겹친 두 이미지의 차이만 보여줌 — 정확히 겹치면 검게 보임">
              <Checkbox id="refDiff" checked={reference.difference} onChange={e => onReference({ difference: e.target.checked })} />
              차이
            </Inline>
          </>
        )}
        <Button type="button" onClick={() => fontRef.current?.click()}>폰트 추가</Button>
        <Button type="button" onClick={onExport}>설정 저장</Button>
        <Button type="button" onClick={() => jsonRef.current?.click()}>설정 불러오기</Button>
        <Button
          type="button"
          $danger={armed}
          onClick={() => {
            if (armed) { setArmed(false); onReset(); } else setArmed(true);
          }}
        >
          {armed ? '한 번 더 누르면 초기화' : '초기화'}
        </Button>
      </Group>
      <input
        ref={fontRef}
        id="fontFile"
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) onAddFont(f); e.target.value = ''; }}
      />
      <input
        ref={jsonRef}
        id="jsonFile"
        type="file"
        accept=".json,application/json"
        hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }}
      />
    </Bar>
  );
}
