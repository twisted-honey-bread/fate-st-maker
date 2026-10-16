import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { THEME_GROUPS, currentThemeColors, themeColors } from '../card/theme';
import { cssGradient } from '../card/gradient';
import { Button } from './ui';

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

// 머리줄 오른쪽의 색 견본 (누르면 색 선택기)
const Pick = styled.label`
  flex: none;
  display: inline-flex;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  cursor: pointer;

  input {
    width: 64px;
    height: 22px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: none;
    cursor: pointer;
  }
  input::-webkit-color-swatch-wrapper { padding: 0; }
  input::-webkit-color-swatch { border: 0; border-radius: 3px; }
  input::-moz-color-swatch { border: 0; border-radius: 3px; }
`;

const Changes = styled.ul`
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 10px 12px;
  list-style: none;
  border-radius: 8px;
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line);
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

export function ThemePicker({ state, onApply, canUndo, onUndo, onReset, onPreview }) {
  const primary = state.title.color;
  const [color, setColor] = useState(primary);
  useEffect(() => setColor(primary), [primary]);

  const now = currentThemeColors(state);
  const next = useMemo(() => themeColors(state, color), [state, color]);
  // 대표색을 실제로 바꿨고, 그 결과 바뀌는 색이 있을 때만 미리보기·적용 버튼을 보여줌
  const pending = !same(color, primary) && THEME_GROUPS.some(g => g.paths.some(p => !same(now[p], next[p])));
  // 고르는 중인 색을 미리보기 캔버스에 바로 반영 (적용 전, 설정은 바뀌지 않음)
  useEffect(() => {
    onPreview?.(pending ? color : null);
  }, [pending, color, onPreview]);
  useEffect(() => () => onPreview?.(null), [onPreview]);

  return (
    <Wrap aria-labelledby="themeHead">
      <Head>
        <h2 id="themeHead">테마 색</h2>
        <Pick title="대표색 (제목 위쪽 색) 고르기">
          <input type="color" id="themeColor" aria-label="대표색 (제목 위쪽 색)" value={color} onChange={e => setColor(e.target.value)} />
        </Pick>
      </Head>
      <Lead>대표색 하나를 고르면 아래 색들이 같은 색조로 함께 바뀝니다. 고르는 동안 미리보기에 바로 보이고, ‘이 색으로 바꾸기’를 눌러야 적용됩니다.</Lead>
      {pending && (
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
      )}
      <Actions>
        {pending && (
          <Button type="button" $primary onClick={() => onApply(color)} style={{ flex: 1 }}>이 색으로 바꾸기</Button>
        )}
        {pending && <Button type="button" onClick={() => setColor(primary)}>취소</Button>}
        {canUndo && !pending && <Button type="button" onClick={onUndo}>되돌리기</Button>}
        <Button type="button" onClick={onReset} title="테마 색이 바꾸는 색들만 처음 기본값으로" style={{ marginLeft: 'auto' }}>초기 색으로</Button>
      </Actions>
    </Wrap>
  );
}
