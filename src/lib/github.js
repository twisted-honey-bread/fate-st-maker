/*
 * GitHub 저장소의 파일 하나를 브라우저에서 바로 커밋 (REST API: contents)
 * token: 해당 저장소 Contents 읽기·쓰기 권한이 있는 fine-grained 개인 액세스 토큰
 */
const API = 'https://api.github.com';

const utf8ToBase64 = text => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export class GitHubError extends Error {}

export async function commitFile({ repo, branch, path, content, message, token }) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const url = `${API}/repos/${repo}/contents/${path}`;
  let res;
  try {
    // 이미 있는 파일이면 sha 가 필요
    res = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers });
  } catch {
    throw new GitHubError('GitHub에 연결하지 못했습니다. 이 페이지에서는 외부 연결이 막혀 있을 수 있습니다. ‘JSON 파일로 받기’를 이용해 주세요.');
  }
  if (res.status === 401) throw new GitHubError('토큰이 올바르지 않거나 만료되었습니다.');
  // 404 = 아직 없는 파일 (새로 만듦). 저장소·브랜치가 없으면 아래 PUT 에서 404
  const sha = res.ok ? (await res.json()).sha : undefined;
  res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content: utf8ToBase64(content), branch, ...(sha ? { sha } : {}) }),
  });
  if (res.status === 401 || res.status === 403) throw new GitHubError('이 토큰으로는 저장소에 쓸 수 없습니다. Contents 읽기·쓰기 권한을 확인해 주세요.');
  if (res.status === 404) throw new GitHubError('저장소나 브랜치를 찾지 못했습니다. 이름과 토큰 권한을 확인해 주세요.');
  if (res.status === 409) throw new GitHubError('그 사이 파일이 바뀌었습니다. 다시 시도해 주세요.');
  if (!res.ok) throw new GitHubError(`커밋하지 못했습니다 (HTTP ${res.status}).`);
  const data = await res.json();
  return data.commit?.html_url;
}
