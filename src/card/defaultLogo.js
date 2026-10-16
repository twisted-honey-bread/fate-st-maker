// 로고 이미지를 올리기 전에 보여줄 임시 문장(紋章)
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="#1d2127">
<path d="M160 6 l11 20 l17 -12 l-5 30 h-46 l-5 -30 l17 12z"/>
<path d="M58 50 h204 l-12 10 h-180z"/>
<g id="w">
<path d="M160 64 c-14 2 -26 12 -28 26 c-10 -4 -20 -2 -26 6 l14 6 c-6 10 -6 22 2 32 c-30 -2 -62 -12 -88 -34 c8 30 34 54 66 66 c-22 4 -40 14 -52 30 c24 -8 46 -10 70 -6 c-14 10 -24 24 -26 40 c16 -14 34 -22 54 -24 l-20 40 c-12 0 -24 8 -30 20 c20 -8 40 -6 54 6 l10 -22 z"/>
<path d="M104 238 c-20 6 -36 20 -44 40 c18 -10 38 -12 56 -6 c-4 12 -2 24 6 34 l38 -60 v-30 z" opacity=".9"/>
</g>
<use href="#w" transform="translate(320 0) scale(-1 1)"/>
</svg>`;

export const DEFAULT_LOGO_URL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG);
