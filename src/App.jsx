import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import { useCardState } from './hooks/useCardState';
import { Toolbar } from './components/Toolbar';
import { Preview } from './components/Preview';
import { ControlPanel } from './components/ControlPanel';
import { Toast } from './components/Toast';
import { CARD_HEIGHT, CARD_WIDTH } from './card/defaults';
import { FONT_LIST, ensureFonts, hcrFontReady, registerFontFile } from './card/fonts';
import { drawCard } from './card/renderer';
import { canvasToBlob, saveBlob } from './lib/download';

const Shell = styled.div`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));

  @media (max-width: 900px) {
    height: auto;
  }
`;

const Main = styled.main`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  min-height: 0;
  margin-right: calc(-1 * max(16px, env(safe-area-inset-right, 0px)));

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
    margin-right: 0;
  }
`;

const safeFileName = s => (s || '').replace(/[\\/:*?"<>|]/g, '').trim() || 'lostbelt';

export default function App() {
  const card = useCardState();
  const { state, renderImages } = card;
  const [scale, setScale] = useState(1);
  const [format, setFormat] = useState('image/png');
  const [guides, setGuides] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fontList, setFontList] = useState(FONT_LIST);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState('title');
  const [layout, setLayout] = useState(null);
  const [hcrAvailable, setHcrAvailable] = useState(null);
  const [fontVersion, setFontVersion] = useState(0);

  useEffect(() => {
    hcrFontReady.then(setHcrAvailable);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((text, error = false) => setToast({ text, error, at: Date.now() }), []);

  const handleDownload = async () => {
    setBusy(true);
    try {
      await ensureFonts(state);
      const c = document.createElement('canvas');
      c.width = Math.round(CARD_WIDTH * scale);
      c.height = Math.round(CARD_HEIGHT * scale);
      drawCard(c.getContext('2d'), c.width, c.height, state, renderImages);
      const blob = await canvasToBlob(c, format, 0.95);
      const ext = format === 'image/png' ? 'png' : 'jpg';
      const result = await saveBlob(blob, `${safeFileName(state.title.text)}.${ext}`);
      notify(result === 'saved' ? `${c.width}×${c.height} ${ext.toUpperCase()} 이미지를 저장했습니다.` : '저장을 취소했습니다.');
    } catch (e) {
      notify('이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', true);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    const blob = new Blob([JSON.stringify(card.exportData(), null, 2)], { type: 'application/json' });
    try {
      const result = await saveBlob(blob, 'fate-st-maker-settings.json');
      if (result === 'saved') notify('설정을 JSON 파일로 저장했습니다. 업로드한 이미지도 포함됩니다.');
    } catch {
      notify('설정 파일을 저장하지 못했습니다.', true);
    }
  };

  const handleImport = async file => {
    try {
      await card.importData(JSON.parse(await file.text()));
      notify('설정을 불러왔습니다.');
    } catch {
      notify('설정 파일을 읽지 못했습니다. 이 페이지에서 저장한 JSON 파일인지 확인해 주세요.', true);
    }
  };

  const handleAddFont = async file => {
    try {
      const { family, isHcr } = await registerFontFile(file);
      setFontVersion(v => v + 1);
      if (isHcr) {
        setHcrAvailable(true);
        notify('함초롬바탕을 적용했습니다.');
        return;
      }
      setFontList(list => (list.some(f => f.family === family) ? list : [...list, { family, label: `${family} (업로드)` }]));
      notify(`"${family}" 폰트를 추가했습니다. 각 텍스트의 폰트 목록에서 고르세요.`);
    } catch {
      notify('폰트 파일을 읽지 못했습니다. ttf, otf, woff, woff2 파일만 쓸 수 있습니다.', true);
    }
  };

  const handleImageFile = async (key, file) => {
    try {
      await card.setImageFile(key, file);
    } catch {
      notify('이미지를 읽지 못했습니다. PNG, JPG, SVG, WEBP 파일을 사용해 주세요.', true);
    }
  };

  return (
    <>
      <GlobalStyle />
      <Shell>
        <Toolbar
          scale={scale}
          onScale={setScale}
          format={format}
          onFormat={setFormat}
          onDownload={handleDownload}
          busy={busy}
          guides={guides}
          onGuides={setGuides}
          onAddFont={handleAddFont}
          onExport={handleExport}
          onImport={handleImport}
          onReset={() => { card.reset(); notify('기본값으로 되돌렸습니다.'); }}
        />
        <Main>
          <Preview
            state={state}
            images={renderImages}
            showGuides={guides}
            fontVersion={fontVersion}
            layout={layout}
            selected={selected}
            onLayout={setLayout}
            onSelect={setSelected}
            onDropImage={file => handleImageFile('bg', file)}
          />
          <ControlPanel
            state={state}
            onField={card.setField}
            fontList={fontList}
            imageUrls={card.imageUrls}
            onImageFile={handleImageFile}
            onImageClear={card.clearImage}
            layout={layout}
            selected={selected}
            onSelect={setSelected}
            hcrAvailable={hcrAvailable}
          />
        </Main>
      </Shell>
      <Toast message={toast} />
    </>
  );
}
