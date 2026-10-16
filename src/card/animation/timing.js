/*
 * 애니메이션 단계별 재생 시간 — [시작, 끝] (초, 재생 속도 1배 기준)
 * 콘솔의 ‘움직임 곡선·재생 시간’ 에서 바꾸며, 설정의 anim.times 에 저장됨
 * end 가 null 인 단계는 애니메이션 끝까지 이어짐 (시작만 조절)
 */
export const STAGES = {
  intro: [
    { id: 'introFade', label: '어두워진 화면 등장', ease: 'easeIntroFade', time: [0, 0.8] },
    { id: 'introLine', label: '상단 선 펼침', ease: 'easeIntroLine', time: [0.3, 1.5] },
    { id: 'introHeader', label: '위쪽 텍스트 등장', ease: 'easeIntroHeader', time: [0.5, 1.3] },
    { id: 'introRise', label: '상단 선 위 입자 떠오름', ease: null, time: [1.15, 2.55] },
    { id: 'introLogo', label: '로고 등장·축소', ease: 'easeIntroLogo', time: [2.4, 3.6] },
    { id: 'introReveal', label: '원형으로 밝아짐 (배경 축소 시작)', ease: 'easeIntroReveal', time: [4.3, 5.6] },
    { id: 'introTitle', label: '연대·제목 등장', ease: 'easeIntroTitle', time: [4.6, 5.4] },
    { id: 'introFlare', label: '렌즈 플레어 켜짐', ease: null, time: [4.8, 5.3] },
    { id: 'introSub', label: '하단 선·부제 등장', ease: 'easeIntroSub', time: [5.4, 6.1] },
    { id: 'introRise2', label: '하단 선 위 입자 떠오름', ease: null, time: [6.0, 7.0] },
    { id: 'introCircuit', label: '회로 무늬 상승', ease: 'easeIntroCircuit', time: [5.4, 8.0] },
    { id: 'introZoom', label: '배경 축소 (밝아짐 시작 → 끝까지)', ease: 'easeIntroZoom', time: null },
  ],
  outro: [
    { id: 'outroInk', label: '로고에서부터 어두워짐 (번짐)', ease: 'easeOutroInk', time: [0.6, 2.0] },
    { id: 'outroFlash', label: '섬광·광선 (광선이 퍼진 뒤 사라짐)', ease: 'easeOutroRays', time: [2.55, 4.1], sync: true },
    { id: 'outroDarken', label: '로고 검게 어두워짐 (글로우도 함께 사라짐)', ease: 'easeOutroDarken', time: [2.2, 2.6] },
    { id: 'outroText', label: '제목 페이드 인', ease: 'easeOutroText', time: [2.95, 4.1] },
    { id: 'outroSpread', label: '제목 펼쳐짐 (자간, 페이드 인과 함께)', ease: 'easeOutroSpread', time: null },
    { id: 'outroParticles', label: '정방형 입자 터짐', ease: null, time: [3.0, null] },
    { id: 'outroCircuit', label: '회로 무늬 상승', ease: 'easeOutroCircuit', time: [3.0, 5.8] },
    { id: 'outroGold', label: '금빛 입자 쏟아짐', ease: null, time: [4.0, null] },
    { id: 'outroEnd', label: '마지막에 완전히 어두워짐 (유지 시간 뒤)', ease: 'easeOutroEnd', time: [0, 1.4], lengthOnly: true },
  ],
  // 아웃트로 2 (증명완료 → 증명불가)
  outro2: [
    { id: 'o2Dark', label: '① 화면 암전 (로고에서부터)', ease: 'easeO2Dark', time: [0, 0.75] },
    { id: 'o2Shapes', label: '② 사각형·원 무늬가 돌며 맞춰짐', ease: 'easeO2Shapes', time: [0.55, 1.6] },
    { id: 'o2Text1', label: '③ 초반 제목·부제 펼쳐짐 + 빛무리', ease: 'easeO2Text1', time: [1.6, 2.6] },
    { id: 'o2Cross', label: '③ 오른쪽 위·왼쪽 아래 십자 섬광', ease: null, time: [2.3, 3.2] },
    { id: 'o2Wobble', label: '④ 화면 일렁임', ease: 'easeO2Wobble', time: [2.85, 3.35] },
    { id: 'o2Glitch', label: '⑤ 글리치 (왼쪽으로 쪼개지며 날아감)', ease: 'easeO2Glitch', time: [3.2, 3.65] },
    { id: 'o2Rays', label: '⑥ 테마 색 바뀜 + 중앙 십자 광선 (점점 사라짐)', ease: 'easeO2Rays', time: [3.65, 4.9] },
    { id: 'o2Text2', label: '⑥ 후반 제목이 돌며 나타남', ease: 'easeO2Text2', time: [3.65, 4.25] },
    { id: 'o2Sub2', label: '⑦ 후반 부제 페이드 인', ease: 'easeO2Sub2', time: [4.05, 4.7] },
    { id: 'o2Bits', label: '⑥~⑦ 세로 사각형·마름모 입자', ease: null, time: [3.65, 5.0] },
    { id: 'o2Logo', label: '⑧ 로고 어두워짐', ease: 'easeO2Logo', time: [4.9, 5.7] },
    { id: 'o2Orbs', label: '⑧ 위아래 빛구슬 떨어짐', ease: null, time: [4.6, null] },
    { id: 'o2End', label: '⑨ 중앙에서부터 어두워짐 (유지 시간 뒤)', ease: 'easeO2End', time: [0, 1.4], lengthOnly: true },
  ],
};

export const DEFAULT_TIMES = Object.fromEntries(
  [...STAGES.intro, ...STAGES.outro, ...STAGES.outro2].filter(s => s.time).map(s => [s.id, s.time]),
);

// 설정에서 단계 시간 읽기 (없으면 기본값)
export const stageTime = (A, id) => A.times?.[id] || DEFAULT_TIMES[id];

// 섬광의 끝을 문구 페이드 인 끝에 맞출지 (설정 anim.syncFlashToText)
export function effectiveTime(A, id) {
  const [s, e] = stageTime(A, id);
  const stage = STAGES.outro.find(x => x.id === id);
  if (stage?.sync && A.syncFlashToText) return [s, stageTime(A, 'outroText')[1]];
  return [s, e];
}
