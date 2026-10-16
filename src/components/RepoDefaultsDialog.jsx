import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, Checkbox, TextInput } from './ui';
import { GitHubError, commitFile } from '../lib/github';
import { saveBlob } from '../lib/download';

/*
 * 지금 설정을 레포의 기본값(src/card/defaults.json)으로 저장
 * - GitHub에 바로 커밋 (토큰 필요) 또는 JSON 파일로 받아 직접 교체
 * - 업로드한 이미지는 포함하지 않음 (설정 값만)
 */
export const DEFAULTS_PATH = 'src/card/defaults.json';
const TOKEN_KEY = 'fate-st-maker:github-token';
const REPO_KEY = 'fate-st-maker:github-repo';

const store = {
  get: (k, fallback = '') => {
    try { return localStorage.getItem(k) ?? sessionStorage.getItem(k) ?? fallback; } catch { return fallback; }
  },
  set: (k, v, remember) => {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
      if (v) (remember ? localStorage : sessionStorage).setItem(k, v);
    } catch { /* 저장 실패는 무시 */ }
  },
};

// TextInput 은 type="text" 로 고정돼 있어서 토큰 칸은 따로 (입력값 가림)
const PasswordInput = styled(TextInput).attrs({ type: 'password' })``;

const Dialog = styled.dialog`
  width: min(520px, calc(100vw - 32px));
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 20px 60px var(--shadow);

  &::backdrop { background: rgba(0, 0, 0, 0.45); }
`;

const Body = styled.form`
  display: grid;
  gap: 12px;
  padding: 18px 20px;

  h2 { margin: 0; font: 700 16px/1.3 var(--font-display); }
  p { margin: 0; font-size: 12px; line-height: 1.6; color: var(--muted); }
  code { font-size: 11px; }
`;

const Row = styled.label`
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
`;

const Inline = styled.label`
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
`;

const Msg = styled.p`
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--surface-2);
  color: ${p => (p.$error ? 'var(--danger)' : 'var(--fg)')} !important;

  a { color: var(--accent); }
`;

// 저장할 값: 모드는 항상 정지 이미지로 시작
export const defaultsJson = state => `${JSON.stringify({ ...state, anim: { ...state.anim, mode: 'still' } }, null, 2)}\n`;

export function RepoDefaultsDialog({ open, onClose, state, notify }) {
  const ref = useRef(null);
  const [repo, setRepo] = useState(() => store.get(REPO_KEY, 'twisted-honey-bread/fate-st-maker'));
  const [branch, setBranch] = useState('main');
  const [token, setToken] = useState(() => store.get(TOKEN_KEY));
  const [remember, setRemember] = useState(() => { try { return !!localStorage.getItem(TOKEN_KEY); } catch { return false; } });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { setMsg(null); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);

  const commit = async e => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    store.set(TOKEN_KEY, token.trim(), remember);
    store.set(REPO_KEY, repo.trim(), true);
    try {
      const url = await commitFile({
        repo: repo.trim(), branch: branch.trim(), path: DEFAULTS_PATH, token: token.trim(),
        content: defaultsJson(state), message: 'Update default settings from the app',
      });
      setMsg({ text: '커밋했습니다. 사이트를 다시 빌드·배포하면 새 기본값이 적용됩니다.', url });
      notify('레포 기본값을 지금 설정으로 저장했습니다.');
    } catch (err) {
      setMsg({ text: err instanceof GitHubError ? err.message : '커밋하지 못했습니다.', error: true });
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const blob = new Blob([defaultsJson(state)], { type: 'application/json' });
    const result = await saveBlob(blob, 'defaults.json').catch(() => null);
    if (result === 'saved') setMsg({ text: `받은 파일로 레포의 ${DEFAULTS_PATH} 를 바꾸고 커밋하면 됩니다.` });
  };

  return (
    <Dialog ref={ref} onClose={onClose} aria-labelledby="repoDefHead">
      <Body onSubmit={commit}>
        <h2 id="repoDefHead">지금 설정을 레포 기본값으로 저장</h2>
        <p>
          지금 화면의 모든 설정 값으로 <code>{DEFAULTS_PATH}</code> 를 덮어씁니다.
          다음 빌드부터 처음 열었을 때와 ‘초기화’를 눌렀을 때 이 값이 나옵니다.
          업로드한 이미지는 포함되지 않습니다.
        </p>
        <Row>저장소<TextInput value={repo} onChange={e => setRepo(e.target.value)} placeholder="owner/repo" required /></Row>
        <Row>브랜치<TextInput value={branch} onChange={e => setBranch(e.target.value)} required /></Row>
        <Row>
          GitHub 토큰
          <PasswordInput
            autoComplete="off"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="github_pat_…"
            required
          />
        </Row>
        <p>이 저장소에 Contents 읽기·쓰기 권한만 준 fine-grained 토큰을 권장합니다. 토큰은 GitHub 외에는 보내지 않습니다.</p>
        <Inline>
          <Checkbox checked={remember} onChange={e => setRemember(e.target.checked)} />
          이 브라우저에 토큰 기억하기 (끄면 탭을 닫을 때 지워짐)
        </Inline>
        {msg && (
          <Msg $error={msg.error} role="status">
            {msg.text} {msg.url && <a href={msg.url} target="_blank" rel="noreferrer">커밋 보기</a>}
          </Msg>
        )}
        <Actions>
          <Button type="button" onClick={download}>JSON 파일로 받기</Button>
          <Button type="button" onClick={onClose}>닫기</Button>
          <Button type="submit" $primary disabled={busy}>{busy ? '커밋하는 중…' : 'GitHub에 커밋'}</Button>
        </Actions>
      </Body>
    </Dialog>
  );
}
