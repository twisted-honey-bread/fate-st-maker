import styled, { css } from 'styled-components';

const control = css`
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 6px;
`;

export const Button = styled.button`
  ${control};
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, background 0.15s;

  &:hover:not(:disabled) { border-color: var(--muted); }
  &:disabled { opacity: 0.6; cursor: progress; }

  ${p => p.$primary && css`
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg);
    font-weight: 700;
    &:hover:not(:disabled) { border-color: var(--fg); }
  `}

  ${p => p.$danger && css`
    color: var(--danger);
    border-color: var(--danger);
  `}

  ${p => p.$small && css`
    padding: 4px 8px;
    font-size: 12px;
  `}
`;

export const Select = styled.select`
  ${control};
  width: 100%;
  padding: 5px 7px;
`;

export const TextInput = styled.input.attrs({ type: 'text' })`
  ${control};
  width: 100%;
  padding: 5px 7px;
`;

export const NumberInput = styled.input.attrs({ type: 'number' })`
  ${control};
  width: 100%;
  padding: 4px 5px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`;

export const ColorInput = styled.input.attrs({ type: 'color' })`
  ${control};
  width: 100%;
  height: 28px;
  padding: 0 2px;
  cursor: pointer;
`;

export const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  justify-self: start;
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--accent);
`;

export const Range = styled.input.attrs({ type: 'range' })`
  width: 100%;
  margin: 0;
  accent-color: var(--accent);
`;
