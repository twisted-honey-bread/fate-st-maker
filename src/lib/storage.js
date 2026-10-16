// localStorage 는 사생활 보호 모드 등에서 실패할 수 있으므로 항상 try/catch
const KEY = 'fate-st-maker:settings:v4';

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
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
