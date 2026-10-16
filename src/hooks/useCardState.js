import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULTS, clone, mergeKnown } from '../card/defaults';
import { setPath } from '../card/schema';
import { DEFAULT_LOGO_URL } from '../card/defaultLogo';
import { loadImage, readFileAsDataURL } from '../card/utils';
import { loadSettings, saveSettings } from '../lib/storage';

const EMPTY_IMAGES = { bg: null, logo: null }; // 각 항목: { img: HTMLImageElement, url: dataURL }

export function useCardState() {
  const [state, setState] = useState(() => mergeKnown(DEFAULTS, loadSettings()));
  const [images, setImages] = useState(EMPTY_IMAGES);
  const [defaultLogo, setDefaultLogo] = useState(null);

  useEffect(() => {
    loadImage(DEFAULT_LOGO_URL).then(setDefaultLogo).catch(() => {});
  }, []);

  // 설정값만 자동 저장 (이미지는 용량 문제로 JSON 내보내기에서만 저장)
  useEffect(() => {
    const t = setTimeout(() => saveSettings(state), 300);
    return () => clearTimeout(t);
  }, [state]);

  const setField = useCallback((path, value) => setState(s => setPath(s, path, value)), []);

  const setImageFile = useCallback(async (key, file) => {
    const url = await readFileAsDataURL(file);
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
      images: { bg: images.bg?.url || null, logo: images.logo?.url || null },
    }),
    [state, images],
  );

  const importData = useCallback(async data => {
    const next = { bg: null, logo: null };
    for (const k of ['bg', 'logo']) {
      const url = data?.images?.[k];
      if (url) next[k] = { img: await loadImage(url), url };
    }
    setState(mergeKnown(DEFAULTS, data?.settings || data));
    setImages(next);
  }, []);

  // 렌더러에 넘길 이미지 (로고가 없으면 기본 로고)
  const renderImages = useMemo(
    () => ({ bg: images.bg?.img || null, logo: images.logo?.img || defaultLogo }),
    [images, defaultLogo],
  );

  const imageUrls = useMemo(
    () => ({ bg: images.bg?.url || null, logo: images.logo?.url || null }),
    [images],
  );

  return { state, setField, renderImages, imageUrls, setImageFile, clearImage, reset, exportData, importData };
}
