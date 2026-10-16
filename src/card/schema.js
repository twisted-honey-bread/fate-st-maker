import { WEIGHTS } from './fonts';

/*
 * 파트 스키마 — 캔버스의 각 구성 요소(파트)마다 메인 설정과 고급 설정을 정의
 * 여기에 항목을 추가하면 입력 UI가 자동으로 생성됨
 * k: 'section.key' 경로, type: range | color | text | select | check | font | image | heading
 * when: (state) => boolean  — 조건이 맞을 때만 표시
 */
const R = (k, label, min, max, step, unit = '') => ({ k, label, type: 'range', min, max, step, unit });
const C = (k, label) => ({ k, label, type: 'color' });
const T = (k, label) => ({ k, label, type: 'text' });
const S = (k, label, options) => ({ k, label, type: 'select', options });
const B = (k, label) => ({ k, label, type: 'check' });
const F = (k, label) => ({ k, label, type: 'font' });
const IM = (k, label) => ({ k, label, type: 'image' });
const HD = label => ({ type: 'heading', label });
const EZ = (k, label) => ({ k, label, type: 'ease' });
const when = (field, fn) => ({ ...field, when: fn });
const isIntro = s => s.anim.mode === 'intro';
const hasStyle = s => s.bg.styleMode !== 'none';
const isOutro = s => s.anim.mode === 'outro';

function textMain(p, { x = true, y = true, extra = [] } = {}) {
  return [
    B(`${p}.show`, '표시'),
    T(`${p}.text`, '텍스트'),
    F(`${p}.font`, '폰트'),
    S(`${p}.weight`, '굵기', WEIGHTS.map(w => [w, String(w)])),
    R(`${p}.size`, '크기', 1, 20, 0.1, '%H'),
    ...(x ? [R(`${p}.x`, 'X 위치', 0, 100, 0.1, '%W')] : []),
    ...(y ? [R(`${p}.y`, 'Y (기준선)', 0, 100, 0.1, '%H')] : []),
    ...extra,
    S(`${p}.fillMode`, '채우기', [['solid', '단색'], ['gradient', '세로 그라데이션'], ['mirror', '좌우대칭 그라데이션']]),
    C(`${p}.color`, '색 1 (상단 · 가장자리)'),
    when(C(`${p}.color2`, '색 2 (하단 · 가운데)'), s => s[p].fillMode !== 'solid'),
  ];
}

function textAdvanced(p, extra = []) {
  return [
    ...extra,
    HD('글자'),
    B(`${p}.italic`, '기울임'),
    R(`${p}.spacing`, '자간', -0.1, 0.8, 0.01, 'em'),
    when(R(`${p}.mirrorCenter`, '대칭 그라데이션 가운데 폭', 0, 0.5, 0.01), s => s[p].fillMode === 'mirror'),
    when(S(`${p}.mirrorScope`, '대칭 그라데이션 기준', [['text', '글자 폭'], ['canvas', '화면 폭']]), s => s[p].fillMode === 'mirror'),
    HD('외곽선'),
    R(`${p}.strokeWidth`, '두께', 0, 1.5, 0.01, '%H'),
    when(C(`${p}.strokeColor`, '색'), s => s[p].strokeWidth > 0),
    HD('글로우 (외부 광채)'),
    R(`${p}.glowOpacity`, '불투명도', 0, 1, 0.01),
    C(`${p}.glowColor`, '색'),
    R(`${p}.glowBlur`, '번짐', 0, 6, 0.05, '%H'),
    R(`${p}.glowStrength`, '강도 (겹침)', 1, 6, 1),
    HD('그림자'),
    R(`${p}.shadowOpacity`, '불투명도', 0, 1, 0.01),
    C(`${p}.shadowColor`, '색'),
    R(`${p}.shadowBlur`, '번짐', 0, 4, 0.05, '%H'),
    R(`${p}.shadowX`, 'X 오프셋', -2, 2, 0.05, '%H'),
    R(`${p}.shadowY`, 'Y 오프셋', -2, 2, 0.05, '%H'),
  ];
}

function lineMain(p) {
  return [
    B(`${p}.show`, '표시'),
    R(`${p}.y`, 'Y 위치', 0, 100, 0.1, '%H'),
    R(`${p}.thickness`, '두께', 0.05, 1.5, 0.01, '%H'),
    S(`${p}.fillMode`, '채우기', [['solid', '단색'], ['mirror', '좌우대칭 그라데이션']]),
    C(`${p}.color`, '색 (가장자리)'),
    when(C(`${p}.color2`, '가운데 색'), s => s[p].fillMode === 'mirror'),
  ];
}

function lineAdvanced(p) {
  return [
    when(R(`${p}.mirrorCenter`, '대칭 그라데이션 가운데 폭', 0, 0.5, 0.01), s => s[p].fillMode === 'mirror'),
    R(`${p}.opacity`, '불투명도', 0, 1, 0.01),
    R(`${p}.left`, '왼쪽 여백', 0, 50, 0.1, '%W'),
    R(`${p}.right`, '오른쪽 여백', 0, 50, 0.1, '%W'),
    R(`${p}.fade`, '양끝 페이드', 0, 50, 0.5, '%'),
  ];
}

// short: 구조도에 표시할 짧은 이름
export const PARTS = [
  {
    id: 'bg', short: '배경', title: '배경', desc: '설원 이미지와 분위기 효과',
    main: [
      IM('bg', '배경 이미지'),
      S('bg.styleMode', '사진 스타일 변환', [['duotone', '설원 톤 (듀오톤)'], ['poster', '단계 분리'], ['threshold', '2치화'], ['none', '원본 그대로']]),
      R('bg.zoom', '확대', 100, 300, 1, '%'),
      R('bg.posX', '가로 위치', 0, 100, 0.5, '%'),
      R('bg.posY', '세로 위치', 0, 100, 0.5, '%'),
      R('bg.brightness', '밝기', 0, 200, 1, '%'),
      R('bg.washOpacity', '흰색 덮기', 0, 1, 0.01),
      B('bg.snow', '눈 입자'),
    ],
    advanced: [
      when(HD('사진 스타일 변환 (업로드한 이미지에만 적용)'), hasStyle),
      when(R('bg.styleExposure', '밝게', -0.5, 0.8, 0.01), hasStyle),
      when(R('bg.styleContrast', '대비', 0.2, 3, 0.05, '배'), hasStyle),
      when(R('bg.styleLevels', '단계 수', 2, 8, 1), s => s.bg.styleMode === 'poster'),
      when(R('bg.styleThreshold', '2치화 기준', 0.05, 0.95, 0.01), s => s.bg.styleMode === 'threshold'),
      when(R('bg.styleEdge', '2치화 경계 부드럽게', 0, 0.3, 0.01), s => s.bg.styleMode === 'threshold'),
      when(R('bg.styleBlur', '잡티 줄이기 (사전 흐림)', 0, 1, 0.01, '%H'), hasStyle),
      when(C('bg.styleInk', '어두운 부분 색'), hasStyle),
      when(C('bg.stylePaper', '밝은 부분 색'), hasStyle),
      HD('보정 필터'),
      R('bg.contrast', '대비', 0, 200, 1, '%'),
      R('bg.saturate', '채도', 0, 200, 1, '%'),
      R('bg.blur', '흐림', 0, 3, 0.05, '%H'),
      C('bg.washColor', '덮기 색'),
      HD('안개 · 비네트'),
      R('bg.fogBottom', '하단 안개', 0, 1, 0.01),
      R('bg.vignette', '비네트 강도', 0, 1, 0.01),
      C('bg.vignetteColor', '비네트 색'),
      R('bg.vignetteSize', '비네트 안쪽 크기', 0, 95, 1, '%'),
      HD('중앙 광원 (로고 뒤)'),
      R('bg.glowOpacity', '불투명도', 0, 1, 0.01),
      C('bg.glowColor', '색'),
      R('bg.glowRadius', '반경', 2, 80, 0.5, '%W'),
      HD('눈 입자'),
      R('bg.snowCount', '개수', 0, 800, 10),
      R('bg.snowOpacity', '불투명도', 0, 1, 0.01),
    ],
  },
  { id: 'left', short: '좌상단', title: '왼쪽 위 텍스트', desc: 'Lostbelt No.1', main: textMain('left'), advanced: textAdvanced('left') },
  { id: 'right', short: '우상단', title: '오른쪽 위 텍스트', desc: '오른쪽 끝 기준 정렬', main: textMain('right'), advanced: textAdvanced('right') },
  { id: 'topLine', short: '상단선', title: '상단 구분선', desc: '양 끝이 흐려지는 가로선', main: lineMain('topLine'), advanced: lineAdvanced('topLine') },
  {
    id: 'logo', short: '로고', title: '중앙 로고', desc: '문장(紋章) 이미지',
    main: [
      IM('logo', '로고 이미지'),
      B('logo.show', '표시'),
      R('logo.x', 'X 중심', 0, 100, 0.1, '%W'),
      R('logo.y', 'Y 중심', 0, 100, 0.1, '%H'),
      R('logo.height', '높이', 2, 90, 0.5, '%H'),
      B('logo.flare', '렌즈 플레어'),
    ],
    advanced: [
      R('logo.opacity', '불투명도', 0, 1, 0.01),
      HD('가장자리 탄 듯한 색 (안쪽)'),
      R('logo.edgeStrength', '진하기', 0, 2, 0.01),
      C('logo.edgeColor', '색'),
      R('logo.edgeWidth', '번짐 폭', 0.05, 2, 0.01, '%H'),
      HD('뒤쪽 그림자 (원형)'),
      R('logo.backShadow', '진하기', 0, 1, 0.01),
      C('logo.backShadowColor', '색'),
      R('logo.backShadowSize', '반경', 2, 80, 0.5, '%H'),
      HD('색 입히기 (단색 실루엣)'),
      B('logo.tint', '사용'),
      when(C('logo.tintColor', '색'), s => s.logo.tint),
      HD('글로우 (외곽 광채)'),
      R('logo.glowOpacity', '불투명도', 0, 1, 0.01),
      C('logo.glowColor', '색'),
      R('logo.glowBlur', '번짐', 0, 8, 0.05, '%H'),
      R('logo.glowStrength', '강도 (겹침)', 1, 6, 1),
      HD('렌즈 플레어 (가로 광선)'),
      C('logo.flareColor', '색'),
      S('logo.flareBlend', '합성 방식', [['screen', '스크린'], ['lighter', '발광 (더하기)'], ['source-over', '보통']]),
      R('logo.flareSolid', '바탕 색 진하기 (밝은 배경에서 선명하게)', 0, 1, 0.01),
      R('logo.flareX', 'X (로고 기준)', -50, 50, 0.1, '%W'),
      R('logo.flareY', 'Y (로고 기준)', -50, 50, 0.1, '%H'),
      R('logo.flareLength', '길이', 1, 40, 0.1, '%W'),
      R('logo.flareThickness', '두께', 0.1, 5, 0.05, '%H'),
      R('logo.flareAspect', '중심 광원 가로 비율', 0.3, 4, 0.05, '배'),
      R('logo.flareIntensity', '강도', 0, 1, 0.01),
    ],
  },
  {
    id: 'era', short: '연대', title: '연대', desc: 'A.D.1570?',
    main: textMain('era', {
      x: false, y: false,
      extra: [S('era.position', '위치', [['left', '제목 왼쪽'], ['above', '제목 위'], ['hidden', '숨김']])],
    }),
    advanced: textAdvanced('era', [
      HD('배치'),
      R('era.gap', '제목과 간격', 0, 10, 0.1, '%W'),
      R('era.offsetY', 'Y 보정', -10, 10, 0.1, '%H'),
    ]),
  },
  {
    id: 'title', short: '제목', title: '제목', desc: '영구동토제국 아나스타샤',
    main: textMain('title'),
    advanced: textAdvanced('title', [
      HD('배치'),
      S('title.anchor', '가운데 기준', [['group', '연대+제목 묶음'], ['title', '제목만']]),
    ]),
  },
  { id: 'bottomLine', short: '하단선', title: '하단 구분선', desc: '제목 아래 가로선', main: lineMain('bottomLine'), advanced: lineAdvanced('bottomLine') },
  { id: 'sub', short: '부제', title: '부제', desc: '짐승 나라의 황녀', main: textMain('sub'), advanced: textAdvanced('sub') },
  {
    // 인트로/아웃트로 모드에서만 탭에 표시
    id: 'anim', short: '애니메이션', title: '애니메이션', desc: '인트로 · 아웃트로(공상절제) 연출', animOnly: true,
    main: [
      when(T('anim.outroText', '문구'), isOutro),
      when(T('anim.outroSub', '영문 부제'), isOutro),
      when(F('anim.outroFont', '문구 폰트'), isOutro),
      when(R('anim.outroHold', '문구 유지 시간', 0.5, 10, 0.1, '초'), isOutro),
      when(R('anim.introHold', '마지막 정지 시간', 0, 10, 0.1, '초'), isIntro),
      when(R('anim.introSpeed', '재생 속도', 0.3, 2, 0.01, '배'), isIntro),
      when(R('anim.outroSpeed', '재생 속도', 0.3, 2, 0.01, '배'), isOutro),
      R('anim.seed', '입자 시드', 1, 999, 1),
      S('anim.fps', 'MP4 프레임', [[24, '24 fps'], [30, '30 fps'], [60, '60 fps']]),
      S('anim.gifFps', 'GIF 프레임', [[10, '10 fps'], [12, '12 fps'], [15, '15 fps'], [20, '20 fps']]),
    ],
    advanced: [
      when(HD('움직임 곡선 (easing)'), isIntro),
      when(EZ('anim.easeIntroFade', '밤 장면 등장'), isIntro),
      when(EZ('anim.easeIntroLine', '상단 선 펼침'), isIntro),
      when(EZ('anim.easeIntroHeader', '위쪽 텍스트 등장'), isIntro),
      when(EZ('anim.easeIntroLogo', '로고 등장·축소'), isIntro),
      when(EZ('anim.easeIntroReveal', '원형으로 밝아짐'), isIntro),
      when(EZ('anim.easeIntroTitle', '연대·제목 등장'), isIntro),
      when(EZ('anim.easeIntroSub', '하단 선·부제 등장'), isIntro),
      when(EZ('anim.easeIntroZoom', '배경 축소'), isIntro),
      when(EZ('anim.easeIntroCircuit', '회로 무늬 상승'), isIntro),
      when(HD('움직임 곡선 (easing)'), isOutro),
      when(EZ('anim.easeOutroInk', '어둠 번짐'), isOutro),
      when(EZ('anim.easeOutroDarken', '로고 어두워짐'), isOutro),
      when(EZ('anim.easeOutroSpread', '문구 펼쳐짐 (자간)'), isOutro),
      when(EZ('anim.easeOutroText', '문구 페이드 인'), isOutro),
      when(EZ('anim.easeOutroCircuit', '회로 무늬 상승'), isOutro),
      when(EZ('anim.easeOutroRays', '섬광 광선 퍼짐'), isOutro),
      when(EZ('anim.easeOutroEnd', '암전'), isOutro),
      HD('밤 장면'),
      C('anim.nightTint', '색조'),
      when(HD('인트로'), isIntro),
      when(C('anim.introLineColor', '라인 빛 색'), isIntro),
      when(B('anim.introFlash', '전환 섬광'), isIntro),
      when(R('anim.riseDensity', '떠오르는 입자 양', 0, 3, 0.1, '배'), isIntro),
      when(R('anim.introZoom', '배경 시작 확대', 1, 1.3, 0.01, '배'), isIntro),
      when(R('anim.introBlur', '어두운 장면 배경 흐림', 0, 2, 0.05, '%H'), isIntro),
      when(B('anim.circuit', '회로 무늬'), isIntro),
      when(IM('circuitIntro', '회로 무늬 이미지'), s => isIntro(s) && s.anim.circuit),
      when(C('anim.circuitColor', '회로 색'), s => isIntro(s) && s.anim.circuit),
      when(R('anim.circuitOpacity', '회로 불투명도', 0, 1, 0.01), s => isIntro(s) && s.anim.circuit),
      when(HD('공상절제 문구'), isOutro),
      when(S('anim.outroWeight', '굵기', WEIGHTS.map(w => [w, String(w)])), isOutro),
      when(R('anim.outroSize', '크기', 4, 40, 0.1, '%H'), isOutro),
      when(R('anim.outroY', 'Y (기준선)', 20, 90, 0.1, '%H'), isOutro),
      when(R('anim.outroSpacing', '자간', 0, 1.5, 0.01, 'em'), isOutro),
      when(C('anim.outroColor', '색 (위)'), isOutro),
      when(C('anim.outroColor2', '색 (중간)'), isOutro),
      when(C('anim.outroColor3', '색 (맨 아래)'), isOutro),
      when(R('anim.outroColorStop', '맨 아래 색이 시작되는 위치', 0.3, 0.98, 0.01), isOutro),
      when(C('anim.outroGlow', '글로우 색'), isOutro),
      when(HD('영문 부제'), isOutro),
      when(F('anim.outroSubFont', '폰트'), isOutro),
      when(R('anim.outroSubSize', '크기', 1, 15, 0.1, '%H'), isOutro),
      when(R('anim.outroSubSpacing', '자간', 0, 2, 0.01, 'em'), isOutro),
      when(R('anim.outroSubY', 'Y (기준선)', 20, 95, 0.1, '%H'), isOutro),
      when(HD('로고'), isOutro),
      when(C('anim.outroLogoColor', '어두워진 뒤 로고 색'), isOutro),
      when(C('anim.outroLogoDark', '섬광 뒤 로고 색'), isOutro),
      when(HD('빛 · 입자'), isOutro),
      when(C('anim.flareColor', '섬광 색'), isOutro),
      when(HD('섬광 광선'), isOutro),
      when(R('anim.rayCount', '개수', 0, 16, 1), isOutro),
      when(R('anim.rayAngle', '첫 광선 각도', 0, 180, 1, '도'), isOutro),
      when(R('anim.rayLength', '길이', 5, 120, 0.5, '%H'), isOutro),
      when(R('anim.rayStartLength', '처음 나타날 때 길이 비율', 0, 1, 0.01), isOutro),
      when(R('anim.rayWidthStart', '중심 쪽 폭', 0, 8, 0.05, '%H'), isOutro),
      when(R('anim.rayWidthEnd', '끝 쪽 폭', 0, 25, 0.1, '%H'), isOutro),
      when(R('anim.rayOpacity', '빛 띠 밝기', 0, 1, 0.01), isOutro),
      when(R('anim.rayFade', '흐려지기 시작하는 지점', 0.05, 0.95, 0.01), isOutro),
      when(R('anim.particleDensity', '입자 양', 0, 3, 0.1, '배'), isOutro),
      when(C('anim.particleColor', '정방형 입자 색'), isOutro),
      when(C('anim.particleGlow', '정방형 입자 빛 번짐 색'), isOutro),
      when(R('anim.particleGlowSize', '정방형 입자 빛 번짐 크기', 0, 8, 0.1, '%H'), isOutro),
      when(R('anim.particleSquash', '작아질 때 찌그러짐 정도', 0, 0.9, 0.01), isOutro),
      when(B('anim.hexGrid', '회로 무늬'), isOutro),
      when(IM('circuitOutro', '회로 무늬 이미지'), s => isOutro(s) && s.anim.hexGrid),
    ],
  },
];

export const PART_BY_ID = Object.fromEntries(PARTS.map(p => [p.id, p]));

export const getPath = (o, p) => p.split('.').reduce((a, k) => a[k], o);

// 'section.key' 경로를 불변 방식으로 갱신
export function setPath(state, path, value) {
  const [sec, key] = path.split('.');
  return { ...state, [sec]: { ...state[sec], [key]: value } };
}
