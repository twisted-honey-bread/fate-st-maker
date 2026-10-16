import styled from 'styled-components';
import { Button, Checkbox, Range } from './ui';

/*
 * 참고 이미지 겹쳐 보기 — 원본 화면 캡처를 미리보기 위에 반투명하게 겹쳐 크기·위치를 맞출 때 씀
 * 미리보기 전용 (다운로드에는 포함되지 않음, 설정에도 저장되지 않음)
 * 기본은 높이에 맞춰 가운데 정렬 — 양옆에 검은 띠가 있는 휴대폰 화면 캡처도 그대로 맞음
 * 겹칠 이미지는 src/refs/ 폴더의 파일 (파일 이름이 버튼 이름, 앞의 '숫자-' 는 순서용). 폴더를 비우면 이 막대도 사라짐
 * value: { url, show, opacity, scale(%), x(%), y(%) }
 */
const REFS = Object.entries(import.meta.glob('../refs/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url]) => ({ url, label: path.split('/').pop().replace(/\.[^.]+$/, '').replace(/^\d+-/, '') }));

export const REF_DEFAULT = { url: null, show: true, opacity: 0.5, scale: 100, x: 0, y: 0 };

const Layer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;

  img {
    position: absolute;
    left: 50%;
    top: 50%;
    width: auto;
    max-width: none;
  }
`;

export function RefOverlayImage({ value }) {
  if (!value.url || !value.show) return null;
  return (
    <Layer aria-hidden="true">
      <img
        src={value.url}
        alt=""
        style={{
          height: `${value.scale}%`,
          opacity: value.opacity,
          transform: `translate(calc(-50% + ${value.x}%), calc(-50% + ${value.y}%))`,
        }}
      />
    </Layer>
  );
}

const Bar = styled.div`
  display: grid;
  gap: 8px;
  width: 100%;
  max-width: 1600px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  font-size: 12px;
  color: var(--muted);
`;

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  b { color: var(--fg); font-weight: 600; margin-right: auto; }
  label { display: inline-flex; align-items: center; gap: 5px; }
`;

const Sliders = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 6px 14px;

  label {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr) 44px;
    align-items: center;
    gap: 6px;
  }
  span:last-child { text-align: right; font-variant-numeric: tabular-nums; }
`;

const SLIDERS = [
  ['opacity', '불투명도', 0, 1, 0.01, v => `${Math.round(v * 100)}%`],
  ['scale', '크기', 50, 200, 0.1, v => `${v.toFixed(1)}%`],
  ['x', '가로 위치', -50, 50, 0.1, v => `${v.toFixed(1)}%`],
  ['y', '세로 위치', -50, 50, 0.1, v => `${v.toFixed(1)}%`],
];

export function RefOverlayBar({ value, onChange }) {
  if (!REFS.length) return null;
  const set = patch => onChange({ ...value, ...patch });

  return (
    <Bar>
      <Head>
        <b>참고 이미지 겹쳐 보기</b>
        {value.url && (
          <label htmlFor="refShow">
            <Checkbox id="refShow" checked={value.show} onChange={e => set({ show: e.target.checked })} />
            보이기
          </label>
        )}
        {REFS.map(r => (
          <Button
            key={r.url}
            type="button"
            aria-pressed={value.url === r.url}
            style={value.url === r.url ? { background: 'var(--accent)', color: 'var(--accent-fg)' } : undefined}
            onClick={() => set({ url: value.url === r.url ? null : r.url, show: true })}
          >
            {r.label}
          </Button>
        ))}
      </Head>
      {value.url && (
        <Sliders>
          {SLIDERS.map(([k, label, min, max, step, fmt]) => (
            <label key={k} htmlFor={`ref_${k}`}>
              <span>{label}</span>
              <Range id={`ref_${k}`} min={min} max={max} step={step} value={value[k]} onChange={e => set({ [k]: +e.target.value })} />
              <span>{fmt(value[k])}</span>
            </label>
          ))}
        </Sliders>
      )}
    </Bar>
  );
}
