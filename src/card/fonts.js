// 폰트 목록. fallback 은 해당 폰트가 없을 때 캔버스가 대신 쓰는 글꼴
export const FONT_LIST = [
  { family: 'HCR Batang', label: '함초롬바탕', fallback: '"Noto Serif KR", serif' },
  { family: 'Noto Sans KR', label: 'Noto Sans KR (고딕)' },
  { family: 'Noto Serif KR', label: 'Noto Serif KR (명조)', fallback: 'serif' },
  { family: 'Nanum Gothic', label: '나눔고딕' },
  { family: 'Nanum Myeongjo', label: '나눔명조', fallback: 'serif' },
  { family: 'Black Han Sans', label: '검은고딕 (Black Han Sans)' },
  { family: 'Do Hyeon', label: '도현' },
  { family: 'Gowun Batang', label: '고운바탕', fallback: 'serif' },
  { family: 'Noto Serif', label: 'Noto Serif (영문 세리프)', fallback: 'serif' },
  { family: 'Cinzel', label: 'Cinzel (대문자 세리프)', fallback: 'serif' },
  { family: 'Cormorant Garamond', label: 'Cormorant Garamond', fallback: 'serif' },
  { family: 'EB Garamond', label: 'EB Garamond', fallback: 'serif' },
  { family: 'Playfair Display', label: 'Playfair Display', fallback: 'serif' },
  { family: 'Times New Roman', label: 'Times New Roman (시스템)', fallback: 'serif' },
];

export const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const FALLBACKS = new Map(FONT_LIST.map(f => [f.family, f.fallback || 'sans-serif']));

export const fontStr = (s, px) =>
  `${s.italic ? 'italic ' : ''}${s.weight} ${px}px "${s.font}", ${FALLBACKS.get(s.font) || 'sans-serif'}`;

/*
 * 함초롬바탕(HCR Batang)은 한컴 저작권 폰트라 레포에 포함하지 않음
 * 1) 기기에 설치된 폰트(local)  2) public/lostbelt/fonts/ 에 직접 넣은 woff2 파일 순으로 찾고,
 * 둘 다 없으면 Noto Serif KR 로 대신 그려짐 (툴바의 '폰트 추가'로 TTF 를 올려도 됨)
 */
export const HCR_FAMILY = 'HCR Batang';
const HCR_SOURCES = {
  400: { local: ['HCR Batang', '함초롬바탕', 'HCRBatang', 'HCR Batang Regular'], file: 'fonts/HCRBatang.woff2' },
  700: { local: ['HCR Batang Bold', '함초롬바탕 Bold', 'HCRBatang-Bold', 'HCRBatangBold'], file: 'fonts/HCRBatang-Bold.woff2' },
};

async function loadHcrFace(weight, { local, file }) {
  const src = [...local.map(n => `local("${n}")`), `url("${file}") format("woff2")`].join(', ');
  try {
    const face = new FontFace(HCR_FAMILY, src, { weight: String(weight) });
    await face.load();
    document.fonts.add(face);
    return true;
  } catch {
    return false;
  }
}

// 함초롬바탕을 찾았는지 여부 (true/false)
export const hcrFontReady = Promise.all(
  Object.entries(HCR_SOURCES).map(([w, s]) => loadHcrFace(w, s)),
).then(([regular, bold]) => regular || bold);

const TEXT_KEYS = ['left', 'right', 'era', 'title', 'sub'];

// 캔버스는 폰트가 로드되기 전에 그리면 대체 폰트로 그려지므로, 그리기 전에 필요한 글자만 미리 로드
export async function ensureFonts(state) {
  await hcrFontReady;
  const list = TEXT_KEYS.map(k => state[k]).filter(s => s.show && s.text);
  await Promise.all(list.map(s => document.fonts.load(fontStr(s, 48), s.text).catch(() => {})));
}

/*
 * 사용자가 올린 폰트 파일 등록
 * 파일 이름이 함초롬바탕이면 기본값과 같은 'HCR Batang' 이름으로 등록해 바로 적용되게 함
 * 반환: { family, isHcr }
 */
export async function registerFontFile(file) {
  const base = file.name.replace(/\.[^.]+$/, '');
  const isHcr = /hcr|함초롬|hamchorom/i.test(base);
  const family = isHcr ? HCR_FAMILY : base;
  const weight = isHcr && /bold|-b$|볼드/i.test(base) ? '700' : '400';
  const face = new FontFace(family, await file.arrayBuffer(), isHcr ? { weight } : undefined);
  await face.load();
  document.fonts.add(face);
  return { family, isHcr };
}
