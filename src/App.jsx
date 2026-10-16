import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { GlobalStyle } from './styles/GlobalStyle';
import { useCardState } from './hooks/useCardState';
import { Toolbar } from './components/Toolbar';
import { Preview } from './components/Preview';
import { ControlPanel } from './components/ControlPanel';
import { Toast } from './components/Toast';
import { HCR_FAMILY, ensureFonts, hcrFontReady, registerFontFile } from './card/fonts';
import { drawCard } from './card/renderer';
import { canvasToBlob, saveBlob } from './lib/download';
import { ExportError, exportGif, exportMp4 } from './lib/videoExport';
import { ANIMATIONS, ensureAnimFonts, isAnimMode } from './card/animation';
import { DownloadBar } from './components/DownloadBar';
import { RepoDefaultsDialog } from './components/RepoDefaultsDialog';
import { IMAGE_MAX_MB } from './card/utils';

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

// 출력 형식과 해상도 (해상도 값은 가로 픽셀, 세로는 16:9)
const FORMATS = {
  still: [['png', 'PNG'], ['jpg', 'JPG']],
  anim: [['mp4', 'MP4'], ['gif', 'GIF']],
};
const SIZES = {
  png: [[960, '960×540'], [1920, '1920×1080'], [3840, '3840×2160']],
  jpg: [[960, '960×540'], [1920, '1920×1080'], [3840, '3840×2160']],
  mp4: [[1280, '1280×720'], [1920, '1920×1080']],
  gif: [[480, '480×270'], [640, '640×360'], [960, '960×540']],
};
const MIME = { png: 'image/png', jpg: 'image/jpeg' };
// 겹쳐보기용 원본 캡처 (public/reference, 모두 1920×1080)
const REFERENCES = {
  'lostbelt-no1': 'reference/lostbelt-no1.jpg',
  'outro-flash': 'reference/outro-flash.jpg',
  'outro-text': 'reference/outro-text.jpg',
};
const ANIM_NAMES = { intro: '인트로', outro: '공상절제' };

const safeFileName = s => (s || '').replace(/[\\/:*?"<>|]/g, '').trim() || 'lostbelt';

export default function App() {
  const card = useCardState();
  const { state, renderImages } = card;
  const [formatByKind, setFormatByKind] = useState({ still: 'png', anim: 'mp4' });
  const [sizeByFormat, setSizeByFormat] = useState({ png: 1920, jpg: 1920, mp4: 1920, gif: 640 });
  const [guides, setGuides] = useState(false);
  // 원본 예시 이미지 겹쳐보기 (public/reference 의 이미지)
  const [reference, setReference] = useState({ on: false, opacity: 0.5, difference: false, which: 'auto' });
  const referenceSrc = REFERENCES[
    reference.which === 'auto' ? (state.anim.mode === 'outro' ? 'outro-text' : 'lostbelt-no1') : reference.which
  ];
  const [progress, setProgress] = useState(null); // null = 대기, 0~1 = 만드는 중
  const abortRef = useRef(null);
  // 부분별 업로드 칸에 올린 폰트 이름 { left, latin, korean } (이 탭에서만 유지)
  const [uploadedFonts, setUploadedFonts] = useState({ left: [], latin: [], korean: [] });
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState('title');
  const [layout, setLayout] = useState(null);
  const [hcrAvailable, setHcrAvailable] = useState(null);
  const [fontVersion, setFontVersion] = useState(0);
  const [themeUndo, setThemeUndo] = useState(null); // 색 한 번에 맞추기 직전 값
  const [repoDialog, setRepoDialog] = useState(false);
  const [bgDraft, setBgDraft] = useState(null); // 배경 직접 조정 중인 값 { zoom, posX, posY } (적용 전)
  const viewState = bgDraft ? { ...state, bg: { ...state.bg, ...bgDraft } } : state;

  useEffect(() => {
    hcrFontReady.then(setHcrAvailable);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((text, error = false) => setToast({ text, error, at: Date.now() }), []);

  const animMode = isAnimMode(state.anim.mode);
  const kind = animMode ? 'anim' : 'still';
  const format = formatByKind[kind];
  const size = sizeByFormat[format];

  const handleDownload = async () => {
    const W = size;
    const H = Math.round((size * 9) / 16);
    const base = safeFileName(state.title.text);
    setProgress(0);
    try {
      await ensureFonts(state);
      let blob;
      let name;
      if (!animMode) {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        drawCard(c.getContext('2d'), W, H, state, renderImages);
        blob = await canvasToBlob(c, MIME[format], 0.95);
        name = `${base}.${format}`;
      } else {
        await ensureAnimFonts(state);
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const opts = {
          state, images: renderImages, width: W, height: H,
          fps: format === 'mp4' ? state.anim.fps : state.anim.gifFps,
          onProgress: setProgress, signal: ctrl.signal,
        };
        blob = format === 'mp4' ? await exportMp4(opts) : await exportGif(opts);
        name = `${base}_${ANIM_NAMES[state.anim.mode]}.${format}`;
      }
      const result = await saveBlob(blob, name);
      notify(result === 'saved'
        ? `${W}×${H} ${format.toUpperCase()} 파일을 저장했습니다 (${(blob.size / 1048576).toFixed(1)}MB).`
        : '저장을 취소했습니다.');
    } catch (e) {
      if (e?.name === 'AbortError') notify('만들기를 취소했습니다.');
      else notify(e instanceof ExportError ? e.message : '파일을 만들지 못했습니다. 해상도를 낮춰 다시 시도해 주세요.', true);
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  const handleModeChange = mode => {
    card.setField('anim.mode', mode);
    if (mode === 'still') setSelected(sel => (sel === 'anim' ? 'title' : sel));
    else setSelected('anim');
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

  // 폰트 칸의 '업로드': 그 칸의 목록에 추가하고 바로 적용 (한글 칸에 함초롬바탕을 올리면 기본 이름으로 등록)
  const handleFontUpload = async (field, file) => {
    try {
      const { family, isHcr } = await registerFontFile(file, { allowHcr: field.group === 'korean' });
      setFontVersion(v => v + 1);
      if (isHcr) {
        setHcrAvailable(true);
        card.setField(field.k, HCR_FAMILY);
        notify('함초롬바탕을 적용했습니다.');
        return;
      }
      setUploadedFonts(prev => ({
        ...prev,
        [field.group]: prev[field.group].includes(family) ? prev[field.group] : [...prev[field.group], family],
      }));
      card.setField(field.k, family);
      if (field.weightKey) card.setField(field.weightKey, 400);
      notify(`"${family}" 폰트를 올려 적용했습니다. 새로고침하면 다시 올려야 합니다.`);
    } catch {
      notify('폰트 파일을 읽지 못했습니다. ttf, otf, woff, woff2 파일만 쓸 수 있습니다.', true);
    }
  };

  const handleImageFile = async (key, file) => {
    try {
      await card.setImageFile(key, file);
    } catch (e) {
      notify(e?.message === 'size'
        ? `이미지가 너무 큽니다 (${(file.size / 1048576).toFixed(1)}MB). ${IMAGE_MAX_MB}MB 이하로 줄여 주세요.`
        : '이미지를 읽지 못했습니다. PNG, JPG, WEBP, SVG 파일을 사용해 주세요.', true);
    }
  };

  return (
    <>
      <GlobalStyle />
      <Shell>
        <Toolbar
          guides={guides}
          onGuides={setGuides}
          guidesEnabled={!animMode}
          reference={reference}
          onReference={patch => setReference(r => ({ ...r, ...patch }))}
          onExport={handleExport}
          onSaveDefaults={() => setRepoDialog(true)}
          onImport={handleImport}
          onReset={() => { card.reset(); notify('기본값으로 되돌렸습니다.'); }}
        />
        <Main>
          <Preview
            state={viewState}
            bgEdit={bgDraft && {
              draft: bgDraft,
              imageUrl: card.imageUrls.bg,
              onChange: setBgDraft,
              onReset: () => setBgDraft({ zoom: 100, posX: 50, posY: 50 }),
              onCancel: () => setBgDraft(null),
              onApply: () => {
                for (const k of ['zoom', 'posX', 'posY']) card.setField(`bg.${k}`, Math.round(bgDraft[k] * 10) / 10);
                setBgDraft(null);
                notify('배경 크기·위치를 적용했습니다.');
              },
            }}
            images={renderImages}
            showGuides={guides}
            fontVersion={fontVersion}
            layout={layout}
            selected={selected}
            onLayout={setLayout}
            onSelect={setSelected}
            onModeChange={handleModeChange}
            reference={{ ...reference, src: referenceSrc }}
            exporting={progress !== null}
            onDropImage={file => handleImageFile('bg', file)}
          >
            <DownloadBar
              label={animMode ? ANIM_NAMES[state.anim.mode] : '이미지'}
              formats={FORMATS[kind]}
              format={format}
              onFormat={f => setFormatByKind(prev => ({ ...prev, [kind]: f }))}
              sizes={SIZES[format]}
              size={size}
              onSize={v => setSizeByFormat(prev => ({ ...prev, [format]: v }))}
              fps={format === 'gif' ? state.anim.gifFps : state.anim.fps}
              onFps={v => card.setField(format === 'gif' ? 'anim.gifFps' : 'anim.fps', v)}
              duration={animMode ? ANIMATIONS[state.anim.mode].duration(state) : 0}
              onDownload={handleDownload}
              progress={progress}
              onCancel={() => abortRef.current?.abort()}
            />
          </Preview>
          <ControlPanel
            state={state}
            onField={card.setField}
            uploadedFonts={uploadedFonts}
            onFontUpload={handleFontUpload}
            imageUrls={card.imageUrls}
            onImageFile={handleImageFile}
            onImageClear={card.clearImage}
            layout={layout}
            selected={selected}
            onSelect={setSelected}
            hcrAvailable={hcrAvailable}
            onAction={action => {
              if (action !== 'bgEdit') return;
              const { zoom, posX, posY } = state.bg;
              setBgDraft({ zoom, posX, posY });
            }}
            onApplyTheme={hex => {
              setThemeUndo(card.applyTheme(hex));
              notify('대표색에 맞춰 색을 바꿨습니다. 마음에 들지 않으면 되돌리기를 누르세요.');
            }}
            onResetTheme={() => {
              setThemeUndo(card.resetTheme());
              notify('테마 색을 처음 기본값으로 되돌렸습니다.');
            }}
            canUndoTheme={!!themeUndo}
            onUndoTheme={() => {
              card.undoTheme(themeUndo);
              setThemeUndo(null);
              notify('색을 이전으로 되돌렸습니다.');
            }}
          />
        </Main>
      </Shell>
      <RepoDefaultsDialog open={repoDialog} onClose={() => setRepoDialog(false)} state={state} notify={notify} />
      <Toast message={toast} />
    </>
  );
}
