import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULTS, clone, mergeKnown, migrateSettings } from '../card/defaults';
import { setPath } from '../card/schema';
import { applyColorTheme, resetColorTheme, restoreColors } from '../card/theme';
import { generateLogo } from '../card/logoGen';
import { loadImage, readFileAsDataURL } from '../card/utils';
import { loadSettings, saveSettings } from '../lib/storage';
import { IMAGE_MAX_MB } from '../card/utils';

// 각 항목: { img: HTMLImageElement, url: dataURL } — circuitIntro/Outro: 직접 그린 회로 무늬
const IMAGE_KEYS = ['bg', 'logo', 'circuitIntro', 'circuitOutro'];
const EMPTY_IMAGES = Object.fromEntries(IMAGE_KEYS.map(k => [k, null]));

export function useCardState() {
  const [state, setState] = useState(() => mergeKnown(DEFAULTS, migrateSettings(loadSettings())));
  const [images, setImages] = useState(EMPTY_IMAGES);


  // 자동 생성 로고: 연대·제목·생성 옵션이 바뀔 때마다 다시 계산 (같은 입력이면 항상 같은 결과)
  const L = state.logo;
  const genKey = L.source === 'generate'
    ? JSON.stringify([state.era.text, state.title.text, L.genShape, L.genGrid, L.genDensity, L.genGap, L.genFrame, L.genColor])
    : null;
  const [genLogo, setGenLogo] = useState(null);
  useEffect(() => {
    if (!genKey) return undefined;
    let alive = true;
    const [era, title, shape, grid, density, gap, frame, color] = JSON.parse(genKey);
    const t = setTimeout(() => {
      loadImage(generateLogo({ era, title, shape, grid, density, gap, frame, color }))
        .then(img => alive && setGenLogo(img))
        .catch(() => {});
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [genKey]);

  // 설정값만 자동 저장 (이미지는 용량 문제로 JSON 내보내기에서만 저장)
  useEffect(() => {
    const t = setTimeout(() => saveSettings(state), 300);
    return () => clearTimeout(t);
  }, [state]);

  const setField = useCallback((path, value) => setState(s => setPath(s, path, value)), []);

  const setImageFile = useCallback(async (key, file) => {
    if (!/\.(png|jpe?g|webp|svg)$/i.test(file.name) && !/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
      throw new Error('type');
    }
    if (file.size > IMAGE_MAX_MB * 1048576) throw new Error('size');
    const url = await readFileAsDataURL(file);
    const img = await loadImage(url);
    setImages(prev => ({ ...prev, [key]: { img, url } }));
  }, []);

  // 색 한 번에 맞추기: 바뀌기 전 값을 돌려줘서 되돌릴 수 있게 함
  const applyTheme = useCallback(primary => {
    const { next, previous } = applyColorTheme(state, primary);
    setState(next);
    return previous;
  }, [state]);
  const resetTheme = useCallback(() => {
    const { next, previous } = resetColorTheme(state, DEFAULTS);
    setState(next);
    return previous;
  }, [state]);
  const undoTheme = useCallback(previous => setState(s => restoreColors(s, previous)), []);

  // 만들어진 이미지(dataURL)를 업로드한 것처럼 지정
  const setImageUrl = useCallback(async (key, url) => {
    const img = await loadImage(url);
    setImages(prev => ({ ...prev, [key]: { img, url } }));
  }, []);

  const clearImage = useCallback(key => setImages(prev => ({ ...prev, [key]: null })), []);

  const reset = useCallback(() => {
    setState(clone(DEFAULTS));
    setImages(EMPTY_IMAGES);
  }, []);

  const exportData = useCallback(
    () => ({
      version: 1,
      settings: state,
      images: Object.fromEntries(IMAGE_KEYS.map(k => [k, images[k]?.url || null])),
    }),
    [state, images],
  );

  const importData = useCallback(async data => {
    const next = { ...EMPTY_IMAGES };
    for (const k of IMAGE_KEYS) {
      const url = data?.images?.[k];
      if (url) next[k] = { img: await loadImage(url), url };
    }
    setState(mergeKnown(DEFAULTS, migrateSettings(data?.settings || data)));
    setImages(next);
  }, []);

  // 렌더러에 넘길 이미지 (로고가 없으면 기본 로고)
  const renderImages = useMemo(
    () => ({
      bg: images.bg?.img || null,
      logo: genKey ? genLogo : images.logo?.img || null, // 직접 업로드에서 올린 이미지가 없으면 로고 없음
      circuitIntro: images.circuitIntro?.img || null,
      circuitOutro: images.circuitOutro?.img || null,
    }),
    [images, genKey, genLogo],
  );

  const imageUrls = useMemo(
    () => Object.fromEntries(IMAGE_KEYS.map(k => [k, images[k]?.url || null])),
    [images],
  );

  return {
    state, setField, renderImages, imageUrls, setImageFile, clearImage, reset, exportData, importData,
    applyTheme, resetTheme, undoTheme, setImageUrl,
  };
}
