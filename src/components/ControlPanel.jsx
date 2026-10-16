import { useState } from 'react';
import styled from 'styled-components';
import { PART_BY_ID, getPath } from '../card/schema';
import { HCR_FAMILY } from '../card/fonts';
import { Field } from './fields/Field';
import { AnalysisNotes } from './AnalysisNotes';
import { Section } from './Section';
import { StructureMap } from './StructureMap';

const Panel = styled.aside`
  min-width: 0;
  overflow: auto;
  background: var(--surface);
  border-left: 1px solid var(--line);

  @media (max-width: 900px) {
    overflow: visible;
    border-left: 0;
    border-top: 1px solid var(--line);
  }
`;

const PartHeader = styled.div`
  display: grid;
  gap: 2px;
  padding: 14px 16px 6px;

  h2 {
    margin: 0;
    font: 700 16px/1.3 var(--font-display);
  }
  p {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }
`;

const Body = styled.div`
  display: grid;
  gap: 7px;
  padding: 6px 16px 16px;
`;

const Notice = styled.p`
  margin: 4px 16px 0;
  padding: 8px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--surface-2);
  font-size: 12px;
  color: var(--muted);
`;

const Advanced = styled(Section)`
  border-top: 1px solid var(--line);
`;

function visibleFields(list, state) {
  const shown = list.filter(f => !f.when || f.when(state));
  // 뒤따르는 항목이 없는 소제목은 제거
  return shown.filter((f, i) => f.type !== 'heading' || (shown[i + 1] && shown[i + 1].type !== 'heading'));
}

function advancedHint(part) {
  const heads = part.advanced.filter(f => f.type === 'heading').map(f => f.label.replace(/\s*\(.*\)/, ''));
  return heads.length ? heads.join(' · ') : '세부 값';
}

export function ControlPanel({
  state, onField, fontList, imageUrls, onImageFile, onImageClear,
  layout, selected, onSelect, hcrAvailable,
}) {
  const part = PART_BY_ID[selected] || PART_BY_ID.title;
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const renderFields = list =>
    visibleFields(list, state).map((f, i) => (
      <Field
        key={f.k || `h${i}-${f.label}`}
        field={f}
        value={f.k && f.type !== 'image' ? getPath(state, f.k) : undefined}
        onChange={v => onField(f.k, v)}
        fontList={fontList}
        imageUrl={f.type === 'image' ? imageUrls[f.k] : undefined}
        onImageFile={file => onImageFile(f.k, file)}
        onImageClear={() => onImageClear(f.k)}
      />
    ));

  const partFont = part.id === 'anim' ? state.anim.mode === 'outro' && state.anim.outroFont : state[part.id]?.font;
  const usesMissingHcr = hcrAvailable === false && partFont === HCR_FAMILY;

  return (
    <Panel aria-label="입력 콘솔">
      <StructureMap layout={layout} selected={part.id} onSelect={onSelect} animMode={state.anim.mode !== 'still'} />

      <div role="tabpanel" aria-labelledby={`tab_${part.id}`}>
        <PartHeader>
          <h2>{part.title}</h2>
          <p>{part.desc}</p>
        </PartHeader>
        {usesMissingHcr && (
          <Notice>
            이 기기에 함초롬바탕이 없어 Noto Serif KR로 대신 표시하고 있습니다.
            툴바의 ‘폰트 추가’로 함초롬바탕 TTF/OTF 파일을 올리면 바로 적용됩니다.
          </Notice>
        )}
        <Body>{renderFields(part.main)}</Body>

        <Advanced open={advancedOpen} onToggle={e => setAdvancedOpen(e.currentTarget.open)}>
          <summary>
            고급 설정
            <small>{advancedHint(part)}</small>
          </summary>
          <Body>{renderFields(part.advanced)}</Body>
        </Advanced>
      </div>

      <AnalysisNotes />
    </Panel>
  );
}
