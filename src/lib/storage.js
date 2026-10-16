// localStorage 는 사생활 보호 모드 등에서 실패할 수 있으므로 항상 try/catch
const KEY = 'fate-st-maker:settings:v18';
// 이전 버전 키 — 불러올 때 기본값이 바뀐 항목만 지우고 나머지는 이어서 사용
const LEGACY = [['fate-st-maker:settings:v17', s => { if (s?.anim) delete s.anim.outroLogoColor; }]];

export function loadSettings() {
  try {
    const cur = localStorage.getItem(KEY);
    if (cur) return JSON.parse(cur);
    for (const [key, migrate] of LEGACY) {
      const old = localStorage.getItem(key);
      if (!old) continue;
      const s = JSON.parse(old);
      migrate(s);
      return s;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSettings(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 저장 실패는 무시 — 현재 화면에는 영향 없음 */
  }
}
