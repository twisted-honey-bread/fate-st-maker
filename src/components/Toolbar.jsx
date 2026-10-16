import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button } from './ui';

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
    margin-right: 6px;
    font: 400 14px var(--font-ui);
    color: var(--muted);
  }
`;

const Group = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const Spacer = styled.span`
  flex: 1;
`;

export function Toolbar({ onExport, onImport, onReset }) {
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
      <Title><small>메이커 /</small> 이문대 카드</Title>
      <Spacer />
      <Group>
        <Button type="button" onClick={onExport}>설정 저장</Button>
        <Button type="button" title="이 페이지의 ‘설정 저장’으로 만든 JSON 파일 (업로드한 이미지 포함)" onClick={() => jsonRef.current?.click()}>설정 불러오기</Button>
        <Button
          type="button"
          $danger={armed}
          onClick={() => {
            if (armed) { setArmed(false); onReset(); } else setArmed(true);
          }}
        >
          {armed ? '한 번 더 누르면 모두 초기화' : '모든 설정 초기화'}
        </Button>
      </Group>
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
