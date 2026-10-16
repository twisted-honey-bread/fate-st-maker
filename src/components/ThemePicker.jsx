import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { THEME_GROUPS, currentThemeColors, themeColors } from '../card/theme';
import { cssGradient } from '../card/gradient';
import { Button, ColorInput } from './ui';

/*
 * 테마 색 — 대표색 하나를 고르면 같은 색조로 강조색들을 한 번에 바꿈
 * 바뀔 색을 '지금 → 바꾼 뒤' 견본으로 먼저 보여주고, 적용·되돌리기·초기 색 버튼을 둠
 */
const Wrap = styled.section`
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
`;

const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;

  h2 {
    margin: 0;
    font: 700 13px/1.3 var(--font-display);
  }
`;

const Lead = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
`;

const Pick = styled.div`
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
`;

const Changes = styled.ul`
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 8px 10px;
  list-style: none;
  border-radius: 6px;
  background: var(--surface-2);
`;

const Change = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 12px auto;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);

  > i {
    font-style: normal;
    text-align: center;
  }
`;

const Swatches = styled.span`
  display: inline-flex;
  gap: 2px;
`;

const Swatch = styled.span`
  width: ${p => (Array.isArray(p.$c) ? '30px' : '14px')};
  height: 14px;
  border-radius: 3px;
  border: 1px solid var(--line-strong);
  background: ${p => (Array.isArray(p.$c) ? cssGradient(p.$c) : p.$c)};
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
`;

// 색 비교 (색 지점 목록 포함) — HSL 변환 반올림 차이(채널당 2 이하)는 같은 색으로 봄
const hexes = v => JSON.stringify(v).match(/#[0-9a-f]{6}/gi) || [];
const near = (a, b) => [16, 8, 0].every(sh => Math.abs(((parseInt(a.slice(1), 16) >> sh) & 255) - ((parseInt(b.slice(1), 16) >> sh) & 255)) <= 2);
const same = (a, b) => {
  const x = hexes(a);
  const y = hexes(b);
  return x.length === y.length && x.every((c, i) => near(c, y[i]));
};

export function ThemePicker({ state, onApply, canUndo, onUndo, onReset }) {
  const primary = state.title.color;
  const [color, setColor] = useState(primary);
  useEffect(() => setColor(primary), [primary]);

  const now = currentThemeColors(state);
  const next = useMemo(() => themeColors(state, color), [state, color]);
  const pending = THEME_GROUPS.some(g => g.paths.some(p => !same(now[p], next[p])));

  return (
    <Wrap aria-labelledby="themeHead">
      <Head>
        <h2 id="themeHead">테마 색</h2>
        <Button $small type="button" onClick={onReset} title="테마 색이 바꾸는 색들만 처음 기본값으로">초기 색으로</Button>
      </Head>
      <Lead>대표색 하나를 고르면 아래 색들이 같은 색조로 함께 바뀝니다. 글자·배치·배경 사진은 그대로입니다.</Lead>
      <Pick>
        <ColorInput id="themeColor" aria-label="대표색 (제목 위쪽 색)" value={color} onChange={e => setColor(e.target.value)} />
        <Lead>대표색 = 제목 위쪽 색</Lead>
      </Pick>
      <Changes aria-label="바뀌는 색 (지금 → 적용 후)">
        <Change aria-hidden="true">
          <span />
          <span>지금</span>
          <i />
          <span>적용 후</span>
        </Change>
        {THEME_GROUPS.map(g => (
          <Change key={g.label}>
            <span>{g.label}</span>
            <Swatches>{g.paths.map(p => <Swatch key={p} $c={now[p]} />)}</Swatches>
            <i aria-hidden="true">→</i>
            <Swatches>{g.paths.map(p => <Swatch key={p} $c={next[p]} />)}</Swatches>
          </Change>
        ))}
      </Changes>
      <Actions>
        <Button type="button" $primary disabled={!pending} onClick={() => onApply(color)} style={{ flex: 1 }}>
          {pending ? '이 색으로 바꾸기' : '지금 적용된 색입니다'}
        </Button>
        {canUndo && <Button type="button" onClick={onUndo}>되돌리기</Button>}
      </Actions>
    </Wrap>
  );
}
