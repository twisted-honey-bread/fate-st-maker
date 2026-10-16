import styled from 'styled-components';
import { Button, Select } from './ui';

/* 미리보기 아래: 지금 보고 있는 결과물(정지 이미지 / 인트로 / 아웃트로)의 다운로드 옵션 */
const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  width: 100%;
  max-width: 1600px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
`;

const Opt = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;

  select { width: auto; }
`;

const Seg = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface-2);

  button {
    padding: 3px 10px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    font-size: 12px;
    cursor: pointer;
  }
  button[aria-pressed="true"] {
    background: var(--accent);
    color: var(--accent-fg);
    font-weight: 700;
  }
  button:disabled { cursor: progress; }
`;

const Info = styled.span`
  flex: 1;
  min-width: 140px;
  font-size: 12px;
  color: var(--muted);
`;

const FPS = {
  mp4: [[24, '24 fps'], [30, '30 fps'], [60, '60 fps']],
  gif: [[10, '10 fps'], [12, '12 fps'], [15, '15 fps'], [20, '20 fps']],
};

const NOTES = {
  png: '무손실 · 원본 화질',
  jpg: '용량이 작음',
  mp4: '최신 Chrome·Edge·Safari',
  gif: '256색 · 용량이 큼',
};

export function DownloadBar({
  label, formats, format, onFormat, sizes, size, onSize,
  fps, onFps, duration, onDownload, progress, onCancel,
}) {
  const busy = progress !== null;
  const formatLabel = formats.find(([v]) => v === format)?.[1] || '';
  const info = [NOTES[format], duration ? `${duration.toFixed(1)}초` : null].filter(Boolean).join(' · ');

  return (
    <Bar aria-label={`${label} 다운로드`}>
      <Seg role="group" aria-label="파일 형식">
        {formats.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={format === v} disabled={busy} onClick={() => onFormat(v)}>{l}</button>
        ))}
      </Seg>
      <Opt htmlFor="sizeSel">해상도
        <Select id="sizeSel" value={size} onChange={e => onSize(+e.target.value)} disabled={busy}>
          {sizes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Opt>
      {FPS[format] && (
        <Opt htmlFor="fpsSel">프레임
          <Select id="fpsSel" value={fps} onChange={e => onFps(+e.target.value)} disabled={busy}>
            {FPS[format].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Opt>
      )}
      <Info>{info}</Info>
      {busy && <Button type="button" onClick={onCancel}>취소</Button>}
      <Button $primary type="button" onClick={onDownload} disabled={busy}>
        {busy ? `만드는 중 ${Math.round(progress * 100)}%` : `${label} ${formatLabel} 다운로드`}
      </Button>
    </Bar>
  );
}
