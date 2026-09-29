/** 진영 색 변환: 원화는 플레이어(파랑) 기준이며, 적(빨강)은 런타임에 색상을 회전해 만든다 */

/** 파란 계열(H 185~255°) 색상을 빨강으로 회전한 캔버스를 만든다 */
export function recolorToRed(src: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const delta = max - min;
    if (delta < 0.12) continue; // 무채색(은색 갑옷, 돌, 흰색, 검정)은 유지
    const s = delta / (1 - Math.abs(2 * l - 1));
    let h: number;
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
    if (h < 185 || h > 255) continue;
    // 파랑(≈220°) → 빨강(≈2°), 청록 발광(≈190°)은 주홍빛으로
    const nh = (h + 142) % 360;
    const cc = (1 - Math.abs(2 * l - 1)) * s;
    const x = cc * (1 - Math.abs(((nh / 60) % 2) - 1));
    const m = l - cc / 2;
    let rr = 0;
    let gg = 0;
    let bb = 0;
    if (nh < 60) [rr, gg, bb] = [cc, x, 0];
    else if (nh < 120) [rr, gg, bb] = [x, cc, 0];
    else if (nh < 180) [rr, gg, bb] = [0, cc, x];
    else if (nh < 240) [rr, gg, bb] = [0, x, cc];
    else if (nh < 300) [rr, gg, bb] = [x, 0, cc];
    else [rr, gg, bb] = [cc, 0, x];
    d[i] = Math.round((rr + m) * 255);
    d[i + 1] = Math.round((gg + m) * 255);
    d[i + 2] = Math.round((bb + m) * 255);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
