import { WEIGHTS } from './fonts';
import { STAGES } from './animation/timing';

/*
 * 파트 스키마 — 캔버스의 각 구성 요소(파트)마다 메인 설정과 고급 설정을 정의
 * 여기에 항목을 추가하면 입력 UI가 자동으로 생성됨
 * k: 'section.key' 경로, type: range | color | text | select | check | font | image | segment | note | heading
 * when: (state) => boolean  — 조건이 맞을 때만 표시
 */
const R = (k, label, min, max, step, unit = '') => ({ k, label, type: 'range', min, max, step, unit });
const C = (k, label) => ({ k, label, type: 'color' });
const T = (k, label) => ({ k, label, type: 'text' });
const S = (k, label, options) => ({ k, label, type: 'select', options });
const B = (k, label) => ({ k, label, type: 'check' });
// 폰트: group = FONT_GROUPS 의 키, weightKey 가 있으면 폰트와 굵기를 함께 고름
const F = (k, label, group = 'korean', weightKey = null) => ({ k, label, type: 'font', group, weightKey });
const IM = (k, label, hint) => ({ k, label, hint, type: 'image' });
const HD = label => ({ type: 'heading', label });
const EZ = (k, label) => ({ k, label, type: 'ease' });
const BTN = (action, label, text) => ({ k: `action.${action}`, action, label, text, type: 'button' });
// 그라데이션 편집기: keys = { mode, color, stops, scope } 각 항목의 state 경로 (없는 항목은 편집기에서 숨김)
const G = (label, keys, modes) => ({ k: keys.stops, label, type: 'gradient', keys, modes });
const SEG = (k, label, options) => ({ k, label, type: 'segment', options });
const NOTE = text => ({ type: 'note', label: text });
const when = (field, fn) => ({ ...field, when: fn });
const isIntro = s => s.anim.mode === 'intro';
const hasStyle = s => s.bg.styleMode !== 'none';
const isOutro = s => s.anim.mode === 'outro';
const isGen = s => s.logo.source === 'generate';
const gen = f => when(f, isGen);

// fontGroup: 'korean' 이면 폰트·굵기를 따로, 그 외(left/latin)는 정해진 '폰트 + 굵기' 선택지
// 크기·위치는 고정값 (패널에서 뺌)
// 표시 여부는 파트 이름 오른쪽 끝의 토글 (PARTS 의 toggle), 채우기는 고급 설정
// 폰트·굵기는 고급 설정 (textAdvanced)
function textMain(p, { extra = [] } = {}) {
  return [
    T(`${p}.text`, '텍스트'),
    ...extra,
  ];
}

const fontFields = (p, fontGroup = 'korean') => [
  HD('폰트'),
  ...(fontGroup === 'korean'
    ? [F(`${p}.font`, '폰트'), S(`${p}.weight`, '굵기', WEIGHTS.map(w => [w, String(w)]))]
    : [F(`${p}.font`, '폰트', fontGroup, `${p}.weight`)]),
];

// 글자·외곽선·그림자·글로우 불투명도는 고정값 — 글로우의 색·번짐·강도만 조절
function textAdvanced(p, extra = [], fontGroup = 'korean') {
  return [
    ...fontFields(p, fontGroup),
    HD('채우기'),
    G('색', { mode: `${p}.fillMode`, color: `${p}.color`, stops: `${p}.stops`, symmetric: `${p}.symmetric` }, ['solid', 'horizontal', 'vertical']),
    ...extra,
    HD('글로우 (외부 광채)'),
    C(`${p}.glowColor`, '색'),
    R(`${p}.glowBlur`, '번짐', 0, 6, 0.05, '%H'),
    R(`${p}.glowStrength`, '강도 (겹침)', 1, 6, 1),
  ];
}

// short: 구조도에 표시할 짧은 이름
export const PARTS = [
  {
    id: 'bg', short: '배경', title: '배경', desc: '설원 이미지와 분위기 효과',
    main: [
      IM('bg', '배경 이미지', '16:9, 1920×1080 이상 권장.'),
      HD('크기·위치'),
      when(BTN('bgEdit', '', '화면에서 끌어서 조정하기'), s => s.anim.mode === 'still'),
      R('bg.zoom', '확대', 100, 300, 1, '%'),
      R('bg.posX', '가로 위치', 0, 100, 0.5, '%'),
      R('bg.posY', '세로 위치', 0, 100, 0.5, '%'),
    ],
    // 보정 필터·비네트·중앙 광원·눈 입자 세부·사진 변환 세부 값은 고정값 (defaults.json)
    advanced: [
      HD('사진 스타일 변환'),
      S('bg.styleMode', '변환 방식', [['duotone', '듀오톤'], ['threshold', '2치화'], ['none', '원본 그대로']]),
      when(C('bg.styleInk', '톤 색 (어두운 부분)'), hasStyle),
      when(C('bg.stylePaper', '톤 색 (밝은 부분)'), hasStyle),
      HD('분위기'),
      R('bg.brightness', '밝기', 0, 200, 1, '%'),
      R('bg.washOpacity', '흰색 덮기', 0, 1, 0.01),
      B('bg.snow', '눈 입자'),
    ],
  },
  { id: 'left', short: '좌상단', title: '왼쪽 위 텍스트', desc: 'Lostbelt No.1', main: textMain('left'), advanced: textAdvanced('left', [], 'left') },
  { id: 'right', short: '우상단', title: '오른쪽 위 텍스트', desc: '오른쪽 끝 기준 정렬', main: textMain('right').flatMap(f => (f.k === 'right.text'
      ? [T('right.text', '_ 앞 텍스트'), { ...T('right.after', '_ 뒤 텍스트'), hint: '인트로에서 로고와 함께 나타납니다. 비워 두면 _ 도 표시하지 않습니다.' }]
      : [f])), advanced: textAdvanced('right') },
  {
    id: 'logo', short: '로고', title: '중앙 로고', desc: '문장(紋章) 이미지',
    main: [
      SEG('logo.source', '로고 가져오기', [['upload', '직접 업로드'], ['generate', '연대·제목으로 자동 생성']]),
      when(IM('logo', '로고 이미지', '투명 배경 PNG 또는 SVG 권장, 정사각형 640px 이상. 잘리지 않고 비율을 유지한 채 높이에 맞춰 줄어듭니다. 이미지의 빈 여백도 크기에 포함되니 여백을 잘라서 올리세요.'), s => !isGen(s)),
      gen(NOTE('연대와 제목 글자를 정해진 계산 규칙에 넣어 추상화된 로고를 만듭니다(생성형 AI가 아닌 고정 계산식입니다). 연대·제목·아래 옵션이 같으면 언제 누가 만들어도 늘 똑같은 로고가 나오고, 글자를 한 자라도 바뀌면 무늬는 완전히 달라집니다.')),
      gen({ k: 'logo.genShape', label: '형태', type: 'shape' }),
      gen(R('logo.genGrid', '분할 수', 3, 21, 2)),
      HD('배치'),
      R('logo.zoom', '크기 배율', 10, 300, 1, '%'),
      B('logo.flare', '렌즈 플레어'),
    ],
    advanced: [
      HD('글로우 (외곽 광채)'),
      C('logo.glowColor', '색'),
      R('logo.glowBlur', '번짐', 0, 8, 0.05, '%H'),
      R('logo.glowStrength', '강도 (겹침)', 1, 6, 1),
      when(HD('렌즈 플레어 (가로 광선)'), s => s.logo.flare),
      when(C('logo.flareColor', '색'), s => s.logo.flare),
      when(R('logo.flareX', 'X (로고 기준)', -50, 50, 0.1, '%W'), s => s.logo.flare),
      when(R('logo.flareY', 'Y (로고 기준)', -50, 50, 0.1, '%H'), s => s.logo.flare),
      when(R('logo.flareIntensity', '강도', 0, 1, 0.01), s => s.logo.flare),
    ],
  },
  {
    id: 'era', short: '연대', title: '연대', desc: 'A.D.1570?',
    main: textMain('era'),
    advanced: textAdvanced('era', [], 'latin'),
  },
  {
    id: 'title', short: '제목', title: '제목', desc: '영구동토제국 아나스타샤',
    main: [...textMain('title'), B('title.flare', '렌즈 플레어 (오른쪽 위)')],
    advanced: textAdvanced('title', [
      when(HD('렌즈 플레어 (오른쪽 위)'), s => s.title.flare),
      ...[
        C('title.flareColor', '색'),
        R('title.flareX', 'X (제목 오른쪽 위 기준)', -30, 30, 0.1, '%W'),
        R('title.flareY', 'Y (제목 오른쪽 위 기준)', -30, 30, 0.1, '%H'),
        R('title.flareIntensity', '강도', 0, 1, 0.01),
      ].map(f => when(f, s => s.title.flare)),
    ]),
  },
  { id: 'sub', short: '부제', title: '부제', desc: '짐승 나라의 황녀', main: textMain('sub'), advanced: textAdvanced('sub') },
  {
    // 인트로/아웃트로 모드에서만 탭에 표시
    id: 'anim', short: '애니메이션', title: '애니메이션', desc: '인트로 · 아웃트로 연출', animOnly: true,
    main: [
      when(T('anim.outroText', '제목'), isOutro),
      when(T('anim.outroSub', '부제'), isOutro),
    ],
    // 재생 속도·시드·유지 시간·안개·비네트·회로·광선·입자·제목 색·크기·위치 등은 고정값 (defaults.json)
    advanced: [
      when(HD('폰트'), isOutro),
      when(F('anim.outroFont', '제목 폰트'), isOutro),
      when(S('anim.outroWeight', '제목 폰트 굵기', WEIGHTS.map(w => [w, String(w)])), isOutro),
      when({ ...F('anim.outroSubFont', '부제 폰트', 'latin', 'anim.outroSubWeight'), weightLabel: '부제 폰트 굵기' }, isOutro),
      when(HD('움직임 곡선 · 재생 시간'), isIntro),
      ...STAGES.intro.map(st => when({ k: `stage.${st.id}`, type: 'stage', stage: st }, isIntro)),
      when(HD('움직임 곡선 · 재생 시간'), isOutro),
      when(B('anim.syncFlashToText', '섬광·로고 어두워짐을 제목이 다 나타날 때 함께 끝내기'), isOutro),
      ...STAGES.outro.map(st => when({ k: `stage.${st.id}`, type: 'stage', stage: st }, isOutro)),
    ],
  },
];

// 파트 이름 오른쪽 끝에 두는 표시 여부 토글
for (const part of PARTS) {
  if (['left', 'right', 'logo', 'era', 'title', 'sub'].includes(part.id)) part.toggle = `${part.id}.show`;
}

export const PART_BY_ID = Object.fromEntries(PARTS.map(p => [p.id, p]));

export const getPath = (o, p) => p.split('.').reduce((a, k) => a[k], o);

// 'section.key' (또는 더 깊은 'a.b.c') 경로를 불변 방식으로 갱신
export function setPath(state, path, value) {
  const set = (o, [k, ...rest]) => ({ ...o, [k]: rest.length ? set(o?.[k] ?? {}, rest) : value });
  return set(state, path.split('.'));
}
