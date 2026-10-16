import styled from 'styled-components';
import { Section } from './Section';

const List = styled.ul`
  margin: 0;
  padding: 0 16px 14px 32px;
  font-size: 12px;
  color: var(--muted);

  li { margin-bottom: 4px; }
  b { color: var(--fg); }
`;

const NOTES = [
  ['캔버스', '16:9. 모든 값은 카드 크기 대비 비율이라 해상도와 무관하게 같은 배치로 출력.'],
  ['배경', '설원 사진 + 밝기↑·대비↓·채도↓, 흰색 워시, 가장자리 흰 비네트, 하단 흰 안개, 로고 뒤 흰 방사형 광원, 눈 입자.'],
  ['상단 텍스트', '좌측은 굵은 영문 세리프(남색 세로 그라데이션) + 흰 글로우, 우측은 가는 회색 고딕 + 흰 글로우.'],
  ['구분선 2개', '얇은 회색 선, 양 끝이 투명하게 페이드.'],
  ['로고', '짙은 단색 실루엣 + 넓은 흰 외곽 광채, 오른쪽 날개 위 푸른 가로 렌즈 플레어.'],
  ['연대', '작은 굵은 세리프(남색) + 흰 글로우, 제목 왼쪽 기준선 정렬. 연대+제목 묶음이 화면 가운데.'],
  ['제목', '굵은 고딕, 넓은 자간(~0.16em), 하늘색→진청색 세로 그라데이션, 흰 외곽선, 짙은 남색의 옅은 외곽 그림자.'],
  ['부제', '보통 굵기 회색 고딕 + 흰 글로우.'],
];

export function AnalysisNotes() {
  return (
    <Section>
      <summary>원본 효과 분석 노트</summary>
      <List>
        {NOTES.map(([k, v]) => (
          <li key={k}><b>{k}</b>: {v}</li>
        ))}
      </List>
    </Section>
  );
}
