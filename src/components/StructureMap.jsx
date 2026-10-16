import styled, { css } from 'styled-components';
import { PARTS } from '../card/schema';

/*
 * 카드 구조도 — 실제 렌더링 영역(layout)을 축소해 각 파트를 블록으로 표시
 * 블록이나 아래 탭을 누르면 해당 파트의 설정 패널이 열림
 */
const Wrap = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
`;

const Heading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--muted);
`;

const Map = styled.div`
  position: relative;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 6px;
`;

const blockBase = css`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  background: var(--surface);
  color: var(--muted);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;

  &:hover { border-color: var(--accent); color: var(--fg); }

  ${p => p.$hidden && css`
    border-style: dashed;
    opacity: 0.55;
  `}

  ${p => p.$active && css`
    z-index: 2;
    border: 2px solid var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 700;
    opacity: 1;
  `}
`;

const Bg = styled.button`
  ${blockBase};
  inset: 0;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 6px 8px;
  border-radius: 6px;
  background:
    repeating-linear-gradient(0deg, transparent 0 calc(25% - 1px), var(--line) calc(25% - 1px) 25%),
    repeating-linear-gradient(90deg, transparent 0 calc(12.5% - 1px), var(--line) calc(12.5% - 1px) 12.5%),
    var(--surface-2);
  ${p => p.$active && css`
    background:
      repeating-linear-gradient(0deg, transparent 0 calc(25% - 1px), var(--line) calc(25% - 1px) 25%),
      repeating-linear-gradient(90deg, transparent 0 calc(12.5% - 1px), var(--line) calc(12.5% - 1px) 12.5%),
      var(--accent-soft);
  `}

  /* 배경은 선택해도 항상 맨 뒤 (다른 블록을 가리지 않도록) */
  && { z-index: 0; }
`;

const Block = styled.button`
  ${blockBase};
  z-index: 1;
  white-space: nowrap;

  ${p => p.$line && css`
    /* 선 이름표는 선 아래 왼쪽에 (위쪽은 텍스트와 겹침) */
    justify-content: flex-start;
    padding-left: 8%;
    border-radius: 999px;
    span { transform: translateY(9px); }
  `}
`;

const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Tab = styled.button`
  padding: 3px 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 12px;
  cursor: pointer;

  &:hover { border-color: var(--muted); }

  &[aria-selected="true"] {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-fg);
    font-weight: 700;
  }
`;

const pct = v => `${Math.round(v * 1000) / 1000}%`;

export function StructureMap({ layout, selected, onSelect, animMode }) {
  const parts = PARTS.filter(p => p.id !== 'bg' && !p.animOnly);
  const tabs = PARTS.filter(p => !p.animOnly || animMode);
  return (
    <Wrap>
      <Heading>
        <span>카드 구조 · 눌러서 편집할 부분 선택</span>
        <span>16 : 9</span>
      </Heading>
      <Map>
        <Bg
          type="button"
          $active={selected === 'bg'}
          onClick={() => onSelect('bg')}
          aria-label="배경 선택"
        >
          배경
        </Bg>
        {layout && parts.map(p => {
          const r = layout[p.id];
          if (!r) return null;
          const isLine = p.id.endsWith('Line');
          const style = isLine
            ? { left: pct(r.x), width: pct(r.w), top: `calc(${pct(r.y + r.h / 2)} - 3px)`, height: '6px' }
            : { left: pct(r.x), width: pct(r.w), top: pct(r.y), height: pct(r.h) };
          return (
            <Block
              key={p.id}
              type="button"
              style={style}
              $line={isLine}
              $hidden={r.hidden}
              $active={selected === p.id}
              onClick={() => onSelect(p.id)}
              aria-label={`${p.title} 선택${r.hidden ? ' (숨김)' : ''}`}
              title={p.title}
            >
              <span>{p.short}</span>
            </Block>
          );
        })}
      </Map>
      <Tabs role="tablist" aria-label="편집할 부분">
        {tabs.map(p => (
          <Tab
            key={p.id}
            type="button"
            role="tab"
            id={`tab_${p.id}`}
            aria-selected={selected === p.id}
            onClick={() => onSelect(p.id)}
          >
            {p.short}
          </Tab>
        ))}
      </Tabs>
    </Wrap>
  );
}
