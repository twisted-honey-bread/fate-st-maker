import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Checkbox, Select } from './ui';

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

const Spacer = styled.span`
  flex: 1;
`;

export function Toolbar({
  scale, onScale, format, onFormat, onDownload, busy,
  guides, onGuides, onAddFont, onExport, onImport, onReset,
}) {
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
        <Inline htmlFor="scaleSel">해상도
          <Select id="scaleSel" value={scale} onChange={e => onScale(+e.target.value)}>
            <option value={0.5}>960×540</option>
            <option value={1}>1920×1080</option>
            <option value={2}>3840×2160</option>
          </Select>
        </Inline>
        <Inline htmlFor="fmtSel">형식
          <Select id="fmtSel" value={format} onChange={e => onFormat(e.target.value)}>
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPG</option>
          </Select>
        </Inline>
        <Button $primary type="button" onClick={onDownload} disabled={busy}>
          {busy ? '만드는 중…' : '이미지 다운로드'}
        </Button>
      </Group>
      <Spacer />
      <Group>
        <Inline htmlFor="guidesChk">
          <Checkbox id="guidesChk" checked={guides} onChange={e => onGuides(e.target.checked)} />
          가이드
        </Inline>
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
