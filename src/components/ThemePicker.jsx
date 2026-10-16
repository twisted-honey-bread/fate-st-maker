import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, ColorInput } from './ui';

/* 색 한 번에 맞추기 — 제목 위쪽 색(대표색)을 고르면 관련 색들을 자동으로 맞춤 */
const Wrap = styled.div`
  display: grid;
  gap: 6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
`;

const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--muted);
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
`;

const Hint = styled.p`
  margin: 0;
  font-size: 11px;
  color: var(--muted);
`;

export function ThemePicker({ primary, onApply, canUndo, onUndo }) {
  const [color, setColor] = useState(primary);
  useEffect(() => setColor(primary), [primary]);

  return (
    <Wrap>
      <Head>
        <span>색 한 번에 맞추기</span>
        <span>대표색 = 제목 위쪽 색</span>
      </Head>
      <Row>
        <ColorInput id="themeColor" aria-label="대표색" value={color} onChange={e => setColor(e.target.value)} />
        <Button type="button" $primary onClick={() => onApply(color)}>이 색으로 맞추기</Button>
        {canUndo && <Button type="button" onClick={onUndo}>되돌리기</Button>}
      </Row>
      <Hint>제목·연대·왼쪽 위 글자·상단선·하늘색 글로우·렌즈 플레어·인트로 선 빛 색이 같은 색조로 바뀝니다.</Hint>
    </Wrap>
  );
}
