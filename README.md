# fate-st-maker

Lostbelt 타이틀 카드(16:9)를 브라우저에서 만들고 PNG/JPG로 내려받는 프론트엔드 전용 도구입니다.
React + styled-components + Vite.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 에 정적 파일 생성 (base: './' 라 아무 경로에나 올려도 동작)
```

## 구조

```
index.html                  Google Fonts 링크, #root
src/
  main.jsx                  진입점
  App.jsx                   레이아웃, 다운로드/설정 입출력/폰트 추가 처리
  styles/GlobalStyle.js     색·폰트 토큰 (라이트/다크)
  hooks/useCardState.js     카드 설정 상태, 업로드 이미지, localStorage 자동 저장
  components/
    Toolbar.jsx             상단 툴바 (해상도, 형식, 다운로드, 가이드, 설정 저장/불러오기, 초기화)
    Preview.jsx             캔버스 미리보기 (드래그&드롭으로 배경 지정)
    ControlPanel.jsx        스키마 기반 입력 콘솔
    fields/Field.jsx        입력 컨트롤 (text, range, color, select, font, check, image)
    AnalysisNotes.jsx       원본 효과 분석 노트
    Section.js, Toast.jsx, ui.js
  card/                     React 와 무관한 카드 엔진
    renderer.js             Canvas 2D 렌더러 (미리보기와 다운로드가 같은 함수 사용)
    defaults.js             원본 비율에 맞춘 기본값
    schema.js               콘솔 항목 정의
    fonts.js                폰트 목록, 폰트 로드, 사용자 폰트 등록
    background.js           배경 이미지가 없을 때 쓰는 절차적 설산
    defaultLogo.js          임시 로고 SVG
  lib/
    download.js             파일 저장 (claude.ai 아티팩트에서는 downloads 기능, 그 외엔 <a download>)
    storage.js              localStorage 래퍼
```

## 커스텀 항목 추가하기

1. `src/card/defaults.js` 의 해당 섹션에 기본값을 추가
2. `src/card/schema.js` 의 해당 섹션 `fields` 에 컨트롤을 추가 (UI는 자동 생성)
3. `src/card/renderer.js` 에서 그 값을 사용

위치·크기 값은 모두 카드 크기 대비 비율입니다. 가로 관련은 `%W`, 세로·폰트 크기·번짐은 `%H` 입니다.
그래서 해상도를 바꿔도 배치가 같습니다.

## 원본 효과 분석

| 요소 | 효과 |
|---|---|
| 배경 | 밝기↑ 대비↓ 채도↓, 흰색 워시, 흰 비네트, 하단 안개, 로고 뒤 방사형 광원, 눈 입자 |
| 왼쪽 위 | 굵은 영문 세리프, 남색 세로 그라데이션, 흰 글로우 |
| 오른쪽 위 | 가는 회색 고딕, 흰 글로우, 오른쪽 정렬 |
| 구분선 | 얇은 회색 선, 양 끝 페이드 |
| 로고 | 짙은 실루엣, 흰 외곽 광채, 푸른 가로 렌즈 플레어 |
| 연대 | 작은 굵은 세리프, 흰 글로우, 제목 왼쪽 기준선 정렬 |
| 제목 | 굵은 고딕, 넓은 자간(~0.16em), 하늘색→진청색 그라데이션, 흰 외곽선, 옅은 남색 그림자 |
| 부제 | 보통 굵기 회색 고딕, 흰 글로우 |
