/*
 * 파일 저장
 * - claude.ai 아티팩트 안에서는 일반 <a download> 가 막혀 있으므로 downloads 기능을 사용
 * - 그 밖의 일반 웹 환경에서는 <a download> 로 저장
 * 반환: 'saved' | 'declined'
 */
export async function saveBlob(blob, filename) {
  const claude = typeof window !== 'undefined' ? window.claude : undefined;
  if (claude && typeof claude.use === 'function') {
    const downloads = await claude.use('downloads');
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob });
        return 'saved';
      } catch (e) {
        if (e && e.code === 'declined') return 'declined';
        throw e;
      }
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return 'saved';
}

export const canvasToBlob = (canvas, type, quality) =>
  new Promise(resolve => canvas.toBlob(resolve, type, quality));
