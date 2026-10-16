import { useState } from 'react';
import styled from 'styled-components';
import { PART_BY_ID, getPath } from '../card/schema';
import { HCR_FAMILY } from '../card/fonts';
import { Field } from './fields/Field';
import { GradientEditor } from './fields/GradientEditor';
import { FontField } from './fields/FontField';
import { StageField } from './fields/StageField';
import { ShapePicker } from './fields/ShapePicker';
import { ANIMATIONS } from '../card/animation';
import { effectiveTime, stageTime } from '../card/animation/timing';
import { Section } from './Section';
import { StructureMap } from './StructureMap';
import { ThemePicker } from './ThemePicker';

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
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
  row-gap: 2px;
  padding: 14px 16px 6px;

  p { grid-column: 1 / -1; }

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

// 파트 표시 여부 스위치 (이름 오른쪽 끝)
const Switch = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;

  input {
    appearance: none;
    position: relative;
    width: 34px;
    height: 20px;
    margin: 0;
    border-radius: 10px;
    background: var(--line-strong);
    cursor: pointer;
    transition: background 0.15s;
  }
  input::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    transition: transform 0.15s;
  }
  input:checked { background: var(--accent); }
  input:checked::after { transform: translateX(14px); }
  input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
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

function advancedHint(part, state) {
  // 현재 모드에서 보이는 소제목만, 중복 없이
  const heads = visibleFields(part.advanced, state)
    .filter(f => f.type === 'heading')
    .map(f => f.label.replace(/\s*\(.*\)/, ''));
  const unique = [...new Set(heads)];
  return unique.length ? unique.join(' · ') : '세부 값';
}

export function ControlPanel({
  state, onField, uploadedFonts, onFontUpload, imageUrls, onImageFile, onImageClear,
  layout, selected, onSelect, hcrAvailable, onApplyTheme, onResetTheme, canUndoTheme, onUndoTheme, onAction, onPreviewTheme,
}) {
  const part = PART_BY_ID[selected] || PART_BY_ID.title;
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const renderFields = list =>
    visibleFields(list, state).map((f, i) => (f.type === 'shape' ? (
      <ShapePicker key={f.k} id={`f_${f.k.replace(/\./g, '_')}`} label={f.label} value={getPath(state, f.k)} onChange={v => onField(f.k, v)} />
    ) : f.type === 'stage' ? (() => {
      const st = f.stage;
      const A = state.anim;
      const total = ANIMATIONS[A.mode] ? ANIMATIONS[A.mode].duration({ ...state, anim: { ...A, introSpeed: 1, outroSpeed: 1 } }) : 0;
      const time = st.time ? (st.sync ? effectiveTime(A, st.id) : stageTime(A, st.id)) : null;
      return (
        <StageField
          key={f.k}
          id={`f_stage_${st.id}`}
          stage={st}
          ease={st.ease ? A[st.ease] : null}
          time={time}
          total={total}
          locked={st.sync && A.syncFlashToText ? '제목 페이드 인 끝과 같음' : null}
          onEase={v => onField(`anim.${st.ease}`, v)}
          onTime={v => onField(`anim.times.${st.id}`, v)}
        />
      );
    })() : f.type === 'font' ? (
      <FontField
        key={f.k}
        id={`f_${f.k.replace(/\./g, '_')}`}
        label={f.label}
        weightLabel={f.weightLabel}
        group={f.group}
        withWeight={!!f.weightKey}
        value={{ font: getPath(state, f.k), weight: f.weightKey ? getPath(state, f.weightKey) : null }}
        uploaded={uploadedFonts[f.group] || []}
        presetWeights={state.fontWeights?.[f.group]}
        onPick={(font, weight) => {
          onField(f.k, font);
          if (f.weightKey && weight) onField(f.weightKey, weight);
        }}
        onWeight={(w, isPreset) => {
          onField(f.weightKey, w);
          // 정해진 선택지면 그 선택지의 기본 굵기도 갱신 (레포 기본값 저장에 포함)
          if (isPreset) onField(`fontWeights.${f.group}.${getPath(state, f.k)}`, w);
        }}
        onUpload={file => onFontUpload(f, file)}
      />
    ) : f.type === 'gradient' ? (
      <GradientEditor
        key={f.k}
        id={`f_${f.k.replace(/\./g, '_')}`}
        label={f.label}
        modes={f.modes}
        value={{
          ...Object.fromEntries(Object.entries(f.keys).map(([n, path]) => [n, getPath(state, path)])),
          mode: f.keys.mode ? getPath(state, f.keys.mode) : f.modes[0],
        }}
        onChange={patch => Object.entries(patch).forEach(([n, v]) => f.keys[n] && onField(f.keys[n], v))}
      />
    ) : (
      <Field
        key={f.k || `h${i}-${f.label}`}
        field={f}
        value={f.k && f.type !== 'image' && f.type !== 'button' ? getPath(state, f.k) : undefined}
        onChange={v => onField(f.k, v)}
        imageUrl={f.type === 'image' ? imageUrls[f.k] : undefined}
        onImageFile={file => onImageFile(f.k, file)}
        onImageClear={() => onImageClear(f.k)}
        onAction={onAction}
      />
    )));

  const partFont = part.id === 'anim' ? state.anim.mode === 'outro' && state.anim.outroFont : state[part.id]?.font;
  const usesMissingHcr = hcrAvailable === false && partFont === HCR_FAMILY;

  return (
    <Panel aria-label="입력 콘솔">
      <ThemePicker state={state} onApply={onApplyTheme} canUndo={canUndoTheme} onUndo={onUndoTheme} onReset={onResetTheme} onPreview={onPreviewTheme} />
      <StructureMap layout={layout} selected={part.id} onSelect={onSelect} animMode={state.anim.mode !== 'still'} />

      <div role="tabpanel" aria-labelledby={`tab_${part.id}`}>
        <PartHeader>
          <h2>{part.title}</h2>
          {part.toggle && (
            <Switch>
              {getPath(state, part.toggle) ? '표시' : '숨김'}
              <input
                type="checkbox"
                role="switch"
                aria-label={`${part.title} 표시`}
                checked={!!getPath(state, part.toggle)}
                onChange={e => onField(part.toggle, e.target.checked)}
              />
            </Switch>
          )}
        </PartHeader>
        {usesMissingHcr && (
          <Notice>
            이 기기에 함초롬바탕이 없어 Noto Serif KR로 대신 표시하고 있습니다.
            폰트 칸의 ‘업로드’로 함초롬바탕 TTF/OTF 파일을 올리면 바로 적용됩니다.
          </Notice>
        )}
        <Body>{renderFields(part.main)}</Body>

        <Advanced open={advancedOpen} onToggle={e => setAdvancedOpen(e.currentTarget.open)}>
          <summary>
            <span style={{ whiteSpace: 'nowrap' }}>고급 설정</span>
            <small>{advancedHint(part, state)}</small>
          </summary>
          <Body>{renderFields(part.advanced)}</Body>
        </Advanced>
      </div>

    </Panel>
  );
}
