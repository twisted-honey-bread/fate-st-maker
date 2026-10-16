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
  guides, onGuides, guidesEnabled, reference, onReference,
  onAddFont, onExport, onImport, onReset, onSaveDefaults,
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
            <Select
              id="refWhich"
              aria-label="겹쳐볼 원본"
              value={reference.which}
              onChange={e => onReference({ which: e.target.value })}
              style={{ width: 'auto' }}
            >
              <option value="auto">자동 (모드에 맞춤)</option>
              <option value="lostbelt-no1">정지 카드</option>
              <option value="outro-flash">아웃트로 · 섬광</option>
              <option value="outro-text">아웃트로 · 문구</option>
            </Select>
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
        <Button type="button" title="TTF · OTF · WOFF · WOFF2 폰트 파일 (파일 이름에 HCR/함초롬이 있으면 함초롬바탕으로 등록)" onClick={() => fontRef.current?.click()}>폰트 추가</Button>
        <Button type="button" onClick={onExport}>설정 저장</Button>
        <Button type="button" title="지금 설정으로 레포의 기본값 파일을 덮어씀 (GitHub 커밋 또는 파일 받기)" onClick={onSaveDefaults}>레포 기본값으로 저장</Button>
        <Button type="button" title="이 페이지의 ‘설정 저장’으로 만든 JSON 파일 (업로드한 이미지 포함)" onClick={() => jsonRef.current?.click()}>설정 불러오기</Button>
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
