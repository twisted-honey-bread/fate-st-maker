import {
  BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, getFirstEncodableVideoCodec,
} from 'mediabunny';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { ANIMATIONS } from '../card/animation';

/*
 * 애니메이션을 프레임 단위로 그려 파일로 만듦 (실시간 녹화가 아니라 정확한 프레임 렌더링)
 * onProgress(0~1), signal(AbortSignal) 로 진행률 표시와 취소 지원
 */
const yieldToUI = () => new Promise(r => setTimeout(r, 0));

function frameRenderer(state, images, W, H) {
  const anim = ANIMATIONS[state.anim.mode];
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return { canvas, ctx, duration: anim.duration(state), draw: t => anim.draw(ctx, W, H, state, images, t) };
}

export class ExportError extends Error {}

export async function exportMp4({ state, images, width, height, fps, onProgress, signal }) {
  if (typeof VideoEncoder === 'undefined') {
    throw new ExportError('이 브라우저는 MP4 만들기를 지원하지 않습니다. 최신 Chrome, Edge, Safari 에서 시도하거나 GIF 를 선택해 주세요.');
  }
  const codec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], { width, height });
  if (!codec) {
    throw new ExportError('이 브라우저에서 쓸 수 있는 MP4 코덱이 없습니다. 해상도를 낮추거나 GIF 를 선택해 주세요.');
  }

  const { canvas, duration, draw } = frameRenderer(state, images, width, height);
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const frames = Math.ceil(duration * fps);
  try {
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted) throw new DOMException('cancelled', 'AbortError');
      draw(i / fps);
      await source.add(i / fps, 1 / fps);
      onProgress?.((i + 1) / frames);
      if (i % 4 === 0) await yieldToUI();
    }
    await output.finalize();
  } catch (e) {
    await output.cancel().catch(() => {});
    throw e;
  }
  return new Blob([output.target.buffer], { type: 'video/mp4' });
}

export async function exportGif({ state, images, width, height, fps, onProgress, signal }) {
  const { ctx, duration, draw } = frameRenderer(state, images, width, height);
  const gif = GIFEncoder();
  const frames = Math.ceil(duration * fps);
  const delay = Math.round(1000 / fps);
  for (let i = 0; i < frames; i++) {
    if (signal?.aborted) throw new DOMException('cancelled', 'AbortError');
    draw(i / fps);
    const { data } = ctx.getImageData(0, 0, width, height);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay });
    onProgress?.((i + 1) / frames);
    await yieldToUI();
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}
