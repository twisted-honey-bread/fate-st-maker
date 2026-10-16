# fate-st-maker

Fate/Grand Order 이문대(Lostbelt) 타이틀 카드 스타일의 이미지와 짧은 애니메이션을 브라우저에서 만드는 비공식 팬 메이커입니다.

**바로 쓰기:** https://twisted-honey-bread.github.io/fate-st-maker/lostbelt/

## 할 수 있는 것

- 왼쪽 위·오른쪽 위 글자, 연대, 제목, 부제, 로고, 배경 사진을 바꿔 타이틀 카드 만들기
- 테마 색 하나로 전체 색조 바꾸기
- 정지 이미지(PNG·JPG), 인트로·아웃트로 애니메이션(MP4·GIF) 내려받기
- 설정을 JSON 으로 저장하고 다시 불러오기

모든 작업은 브라우저 안에서만 이뤄지며, 올린 사진이나 입력한 글자는 어디에도 전송되지 않습니다.
MP4 저장은 최신 Chrome·Edge·Safari 에서 동작합니다.

## 직접 실행

```bash
npm install
npm run dev     # http://localhost:5173/lostbelt/
npm run build   # dist/ 에 정적 파일 생성
```

`main` 에 push 하면 GitHub Actions 가 GitHub Pages 로 배포합니다. 기본 설정값은 `src/card/defaults.json` 에 있습니다.

## 저작권 · 라이선스

- 이 프로젝트는 비공식 팬 제작물입니다. *Fate/Grand Order* 및 관련 명칭·디자인의 권리는 TYPE-MOON / FGO PROJECT 에 있습니다. 공식 이미지·로고는 포함하지 않습니다.
- **함초롬바탕**: 저작권 ㈜한글과컴퓨터. 한컴이 무료로 배포하는 글꼴로, 이 저장소는 글꼴 파일을 포함하지 않고 [눈누](https://noonnu.cc)가 제공하는 jsDelivr CDN 에서 불러옵니다. 사용 조건은 한글과컴퓨터의 함초롬체 라이선스를 따릅니다.
- **그 밖의 글꼴**: Noto Sans KR, Noto Serif KR, Noto Serif, 나눔고딕, 나눔명조, 검은고딕, 도현, 고운바탕, Cinzel, Cormorant Garamond, EB Garamond, Playfair Display, Spectral, Bodoni Moda, Libre Bodoni, Old Standard TT — Google Fonts 에서 불러오며 [SIL Open Font License 1.1](https://openfontlicense.org) 을 따릅니다.
- **사용한 라이브러리**: React, styled-components, Vite, gifenc (MIT), Mediabunny (MPL-2.0).
