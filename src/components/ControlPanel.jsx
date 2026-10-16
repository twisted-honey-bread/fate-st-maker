import styled from 'styled-components';
import { SCHEMA, getPath } from '../card/schema';
import { Field } from './fields/Field';
import { AnalysisNotes } from './AnalysisNotes';
import { Section } from './Section';

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


const Body = styled.div`
  display: grid;
  gap: 7px;
  padding: 2px 16px 16px;
`;

export function ControlPanel({ state, onField, fontList, imageUrls, onImageFile, onImageClear }) {
  return (
    <Panel aria-label="입력 콘솔">
      <AnalysisNotes />
      {SCHEMA.map(sec => (
        <Section key={sec.id} open={sec.open}>
          <summary>
            {sec.title}
            {sec.desc && <small>{sec.desc}</small>}
          </summary>
          <Body>
            {sec.fields.map((f, i) => (
              <Field
                key={f.k || `h${i}`}
                field={f}
                value={f.k && f.type !== 'image' ? getPath(state, f.k) : undefined}
                onChange={v => onField(f.k, v)}
                fontList={fontList}
                imageUrl={f.type === 'image' ? imageUrls[f.k] : undefined}
                onImageFile={file => onImageFile(f.k, file)}
                onImageClear={() => onImageClear(f.k)}
              />
            ))}
          </Body>
        </Section>
      ))}
    </Panel>
  );
}
