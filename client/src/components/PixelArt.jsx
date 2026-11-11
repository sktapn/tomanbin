/* Pixel art desenhada à mão para a identidade da Tomanbin.
 * Cada sprite é uma grade de caracteres; cada caractere vira um "pixel" da paleta.
 */

export const SPRITES = {
  bear: [
    '.XX......XX.',
    'XPPX....XPPX',
    'XPPXXXXXXPPX',
    '.XBBBBBBBBX.',
    'XBBBBBBBBBBX',
    'XBBEBBBBEBBX',
    'XBBEBBBBEBBX',
    'XBCBBNNBBCBX',
    'XBBBBMMBBBBX',
    '.XBBBBBBBBX.',
    '..XXXXXXXX..',
  ],
  heart: [
    '.XX...XX.',
    'XRRX.XRRX',
    'XRWRXRRRX',
    'XRRRRRRRX',
    '.XRRRRRX.',
    '..XRRRX..',
    '...XRX...',
    '....X....',
  ],
  star: [
    '.....X.....',
    '....XYX....',
    '....XYX....',
    'XXXXYYYXXXX',
    '.XYYYYYYYX.',
    '..XYYYYYX..',
    '..XYYXYYX..',
    '.XYYX.XYYX.',
    '.XYX...XYX.',
    'XX.......XX',
  ],
  key: [
    '.XXXX.........',
    'XGGGGX........',
    'XG..GXXXXXXXXX',
    'XG..GGGGGGGGGX',
    'XGGGGXXXXGXGXX',
    '.XXXX....X.X..',
  ],
  pin: [
    '...XXXXX...',
    '..XBBBBBX..',
    '.XBBBBBBBX.',
    'XBBEBBBEBBX',
    'XBBEBBBEBBX',
    'XBBBBBBBBBX',
    'XBMBBBBBMBX',
    'XBBMMMMMBBX',
    '.XBBBBBBBX.',
    '..XBBBBBX..',
    '...XXXXX...',
  ],
};

const DEFAULT_PALETTE = {
  X: '#151515',
  B: '#ffb26b',
  P: '#ff8fd0',
  E: '#151515',
  C: '#ff8fd0',
  N: '#151515',
  M: '#8a4b2a',
  R: '#ff5d9e',
  W: '#ffffff',
  Y: '#ffd84d',
  G: '#ffd84d',
};

export default function PixelArt({ sprite = 'bear', palette, size = 64, className = '', title }) {
  const grid = SPRITES[sprite];
  const colors = { ...DEFAULT_PALETTE, ...palette };
  const w = Math.max(...grid.map((r) => r.length));
  const h = grid.length;
  return (
    <svg
      className={`pixel-art ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {grid.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={colors[ch]} />
        )
      )}
    </svg>
  );
}
