import styled from 'styled-components';

const Box = styled.div`
  position: fixed;
  left: 50%;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  max-width: calc(100% - 32px);
  padding: 10px 16px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-2);
  color: ${p => (p.$error ? 'var(--danger)' : 'var(--fg)')};
  box-shadow: 0 8px 24px var(--shadow);
  z-index: 20;
`;

export function Toast({ message }) {
  return (
    <div role="status" aria-live="polite">
      {message && <Box $error={message.error}>{message.text}</Box>}
    </div>
  );
}
