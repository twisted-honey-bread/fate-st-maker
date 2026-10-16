// Google Fonts 목록 (index.html 의 <link> 와 짝을 맞춰 관리)
export const FONT_LIST = [
  { family: 'Noto Sans KR', label: 'Noto Sans KR (고딕)' },
  { family: 'Noto Serif KR', label: 'Noto Serif KR (명조)' },
  { family: 'Nanum Gothic', label: '나눔고딕' },
  { family: 'Nanum Myeongjo', label: '나눔명조' },
  { family: 'Black Han Sans', label: '검은고딕 (Black Han Sans)' },
  { family: 'Do Hyeon', label: '도현' },
  { family: 'Gowun Batang', label: '고운바탕' },
  { family: 'Noto Serif', label: 'Noto Serif (영문 세리프)' },
  { family: 'Cinzel', label: 'Cinzel (대문자 세리프)' },
  { family: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { family: 'EB Garamond', label: 'EB Garamond' },
  { family: 'Playfair Display', label: 'Playfair Display' },
  { family: 'Times New Roman', label: 'Times New Roman (시스템)' },
];

export const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export const fontStr = (s, px) =>
  `${s.italic ? 'italic ' : ''}${s.weight} ${px}px "${s.font}", sans-serif`;

const TEXT_KEYS = ['left', 'right', 'era', 'title', 'sub'];

// 캔버스는 폰트가 로드되기 전에 그리면 대체 폰트로 그려지므로, 그리기 전에 필요한 글자만 미리 로드
export async function ensureFonts(state) {
  const list = TEXT_KEYS.map(k => state[k]).filter(s => s.show && s.text);
  await Promise.all(list.map(s => document.fonts.load(fontStr(s, 48), s.text).catch(() => {})));
}

// 사용자가 올린 폰트 파일을 등록하고 family 이름을 돌려줌
export async function registerFontFile(file) {
  const family = file.name.replace(/\.[^.]+$/, '');
  const face = new FontFace(family, await file.arrayBuffer());
  await face.load();
  document.fonts.add(face);
  return family;
}
