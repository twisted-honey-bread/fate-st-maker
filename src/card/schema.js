import { WEIGHTS } from './fonts';

/*
 * 콘솔 스키마 — 여기에 항목을 추가하면 입력 UI가 자동으로 생성됨
 * k: 'section.key' 경로, type: range | color | text | select | check | font | image | heading
 */
const R = (k, label, min, max, step, unit = '') => ({ k, label, type: 'range', min, max, step, unit });
const C = (k, label) => ({ k, label, type: 'color' });
const T = (k, label) => ({ k, label, type: 'text' });
const S = (k, label, options) => ({ k, label, type: 'select', options });
const B = (k, label) => ({ k, label, type: 'check' });
const F = (k, label) => ({ k, label, type: 'font' });
const IM = (k, label) => ({ k, label, type: 'image' });
const HD = label => ({ type: 'heading', label });

function textSchema(p, { x = true, y = true, extra = [] } = {}) {
  return [
    B(`${p}.show`, '표시'),
    T(`${p}.text`, '텍스트'),
    HD('폰트'),
    F(`${p}.font`, '폰트'),
    S(`${p}.weight`, '굵기', WEIGHTS.map(w => [w, String(w)])),
    B(`${p}.italic`, '기울임'),
    R(`${p}.size`, '크기', 1, 20, 0.1, '%H'),
    R(`${p}.spacing`, '자간', -0.1, 0.8, 0.01, 'em'),
    ...(x || y || extra.length ? [HD('배치')] : []),
    ...(x ? [R(`${p}.x`, 'X 위치', 0, 100, 0.1, '%W')] : []),
    ...(y ? [R(`${p}.y`, 'Y (기준선)', 0, 100, 0.1, '%H')] : []),
    ...extra,
    HD('채우기'),
    S(`${p}.fillMode`, '방식', [['solid', '단색'], ['gradient', '세로 그라데이션']]),
    C(`${p}.color`, '색 (상단)'),
    C(`${p}.color2`, '색 (하단)'),
    HD('외곽선'),
    R(`${p}.strokeWidth`, '두께', 0, 1.5, 0.01, '%H'),
    C(`${p}.strokeColor`, '색'),
    HD('글로우 (외부 광채)'),
    C(`${p}.glowColor`, '색'),
    R(`${p}.glowOpacity`, '불투명도', 0, 1, 0.01),
    R(`${p}.glowBlur`, '번짐', 0, 6, 0.05, '%H'),
    R(`${p}.glowStrength`, '강도 (겹침)', 1, 6, 1),
    HD('그림자'),
    C(`${p}.shadowColor`, '색'),
    R(`${p}.shadowOpacity`, '불투명도', 0, 1, 0.01),
    R(`${p}.shadowBlur`, '번짐', 0, 4, 0.05, '%H'),
    R(`${p}.shadowX`, 'X 오프셋', -2, 2, 0.05, '%H'),
    R(`${p}.shadowY`, 'Y 오프셋', -2, 2, 0.05, '%H'),
  ];
}

function lineSchema(p) {
  return [
    B(`${p}.show`, '표시'),
    R(`${p}.y`, 'Y 위치', 0, 100, 0.1, '%H'),
    R(`${p}.thickness`, '두께', 0.05, 1.5, 0.01, '%H'),
    C(`${p}.color`, '색'),
    R(`${p}.opacity`, '불투명도', 0, 1, 0.01),
    R(`${p}.left`, '왼쪽 여백', 0, 50, 0.1, '%W'),
    R(`${p}.right`, '오른쪽 여백', 0, 50, 0.1, '%W'),
    R(`${p}.fade`, '양끝 페이드', 0, 50, 0.5, '%'),
  ];
}

export const SCHEMA = [
  { id: 'left', title: '① 왼쪽 위 텍스트', desc: 'Lostbelt No.1', open: true, fields: textSchema('left') },
  { id: 'right', title: '② 오른쪽 위 텍스트', desc: '오른쪽 정렬', fields: textSchema('right') },
  { id: 'topLine', title: '상단 구분선', fields: lineSchema('topLine') },
  {
    id: 'logo', title: '③ 중앙 로고', open: true, fields: [
      IM('logo', '로고 이미지'),
      B('logo.show', '표시'),
      HD('배치'),
      R('logo.x', 'X 중심', 0, 100, 0.1, '%W'),
      R('logo.y', 'Y 중심', 0, 100, 0.1, '%H'),
      R('logo.height', '높이', 2, 90, 0.5, '%H'),
      R('logo.opacity', '불투명도', 0, 1, 0.01),
      HD('색 입히기 (단색 실루엣)'),
      B('logo.tint', '사용'),
      C('logo.tintColor', '색'),
      HD('글로우 (외곽 광채)'),
      C('logo.glowColor', '색'),
      R('logo.glowOpacity', '불투명도', 0, 1, 0.01),
      R('logo.glowBlur', '번짐', 0, 8, 0.05, '%H'),
      R('logo.glowStrength', '강도 (겹침)', 1, 6, 1),
      HD('렌즈 플레어 (가로 광선)'),
      B('logo.flare', '사용'),
      C('logo.flareColor', '색'),
      R('logo.flareX', 'X (로고 기준)', -50, 50, 0.1, '%W'),
      R('logo.flareY', 'Y (로고 기준)', -50, 50, 0.1, '%H'),
      R('logo.flareLength', '길이', 1, 40, 0.1, '%W'),
      R('logo.flareThickness', '두께', 0.1, 5, 0.05, '%H'),
      R('logo.flareIntensity', '강도', 0, 1, 0.01),
    ],
  },
  {
    id: 'era', title: '④ 연대', desc: 'A.D.1570?', fields: textSchema('era', {
      x: false, y: false, extra: [
        S('era.position', '위치', [['left', '제목 왼쪽'], ['above', '제목 위'], ['hidden', '숨김']]),
        R('era.gap', '제목과 간격', 0, 10, 0.1, '%W'),
        R('era.offsetY', 'Y 보정', -10, 10, 0.1, '%H'),
      ],
    }),
  },
  {
    id: 'title', title: '⑤ 제목', desc: '영구동토제국…', open: true, fields: textSchema('title', {
      extra: [S('title.anchor', '가운데 기준', [['group', '연대+제목 묶음'], ['title', '제목만']])],
    }),
  },
  { id: 'bottomLine', title: '하단 구분선', fields: lineSchema('bottomLine') },
  { id: 'sub', title: '⑥ 부제', desc: '짐승 나라의 황녀', fields: textSchema('sub') },
  {
    id: 'bg', title: '⑦ 배경', open: true, fields: [
      IM('bg', '배경 이미지'),
      HD('이미지 배치'),
      R('bg.zoom', '확대', 100, 300, 1, '%'),
      R('bg.posX', '가로 위치', 0, 100, 0.5, '%'),
      R('bg.posY', '세로 위치', 0, 100, 0.5, '%'),
      HD('보정 필터'),
      R('bg.brightness', '밝기', 0, 200, 1, '%'),
      R('bg.contrast', '대비', 0, 200, 1, '%'),
      R('bg.saturate', '채도', 0, 200, 1, '%'),
      R('bg.blur', '흐림', 0, 3, 0.05, '%H'),
      HD('색 덮기 (워시)'),
      C('bg.washColor', '색'),
      R('bg.washOpacity', '불투명도', 0, 1, 0.01),
      HD('안개 · 비네트'),
      R('bg.fogBottom', '하단 안개', 0, 1, 0.01),
      C('bg.vignetteColor', '비네트 색'),
      R('bg.vignette', '비네트 강도', 0, 1, 0.01),
      R('bg.vignetteSize', '비네트 안쪽 크기', 0, 95, 1, '%'),
      HD('중앙 광원 (로고 뒤)'),
      C('bg.glowColor', '색'),
      R('bg.glowOpacity', '불투명도', 0, 1, 0.01),
      R('bg.glowRadius', '반경', 2, 80, 0.5, '%W'),
      HD('눈 입자'),
      B('bg.snow', '사용'),
      R('bg.snowCount', '개수', 0, 800, 10),
      R('bg.snowOpacity', '불투명도', 0, 1, 0.01),
    ],
  },
];

export const getPath = (o, p) => p.split('.').reduce((a, k) => a[k], o);

// 'section.key' 경로를 불변 방식으로 갱신
export function setPath(state, path, value) {
  const [sec, key] = path.split('.');
  return { ...state, [sec]: { ...state[sec], [key]: value } };
}
