import { createGlobalStyle } from 'styled-components';

/*
 * 레이아웃: 왼쪽 미리보기 캔버스 + 오른쪽 조작 콘솔. 설원 카드에 맞춘 서리빛 중립색 + 얼음빛 파랑 강조색
 * 모든 색은 토큰으로 정의하고 라이트/다크(시스템 설정 + data-theme)를 모두 지원
 */
export const GlobalStyle = createGlobalStyle`
  :root {
    --bg: #e8edf1;
    --surface: #f6f8fa;
    --surface-2: #ffffff;
    --line: #d0d9e0;
    --line-strong: #9fb0bf;
    --accent-soft: rgba(27, 108, 179, 0.14);
    --fg: #17202b;
    --muted: #586776;
    --accent: #1b6cb3;
    --accent-fg: #ffffff;
    --stage: #dbe2e8;
    --danger: #b3212d;
    --shadow: rgba(23, 32, 43, 0.18);

    --font-ui: "Noto Sans KR", system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif;
    --font-display: "Noto Serif", "Noto Serif KR", Georgia, serif;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #10141a;
      --surface: #161b21;
      --surface-2: #1e242c;
      --line: #2b333d;
      --line-strong: #4a5764;
      --accent-soft: rgba(93, 178, 242, 0.18);
      --fg: #e3e8ed;
      --muted: #91a0ae;
      --accent: #5db2f2;
      --accent-fg: #06121e;
      --stage: #0b0e12;
      --danger: #ff6b76;
      --shadow: rgba(0, 0, 0, 0.55);
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --bg: #10141a;
    --surface: #161b21;
    --surface-2: #1e242c;
    --line: #2b333d;
    --line-strong: #4a5764;
    --accent-soft: rgba(93, 178, 242, 0.18);
    --fg: #e3e8ed;
    --muted: #91a0ae;
    --accent: #5db2f2;
    --accent-fg: #06121e;
    --stage: #0b0e12;
    --danger: #ff6b76;
    --shadow: rgba(0, 0, 0, 0.55);
    color-scheme: dark;
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font: 13px/1.45 var(--font-ui);
  }
  button, input, select { font: inherit; color: inherit; }

  /* 휴대폰 상단 안전 영역을 고정 미리보기와 같은 색으로 칠함 */
  @media (max-width: 900px) {
    body::before {
      content: "";
      position: fixed;
      inset: 0 0 auto;
      height: env(safe-area-inset-top, 0px);
      z-index: 10;
      background: var(--bg);
    }
  }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition: none !important; animation: none !important; }
  }
`;
