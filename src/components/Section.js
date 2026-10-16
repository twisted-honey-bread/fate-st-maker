import styled from 'styled-components';

// 접이식 콘솔 섹션
export const Section = styled.details`
  border-bottom: 1px solid var(--line);

  & > summary {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 12px 16px;
    cursor: pointer;
    font-weight: 700;
    list-style: none;
    user-select: none;
  }
  & > summary::-webkit-details-marker { display: none; }
  & > summary::before { content: "▸"; width: 10px; color: var(--muted); }
  &[open] > summary::before { content: "▾"; }
  & > summary small { font-weight: 400; font-size: 11px; color: var(--muted); }
`;
