import Phaser from 'phaser';

/** 두꺼운 외곽선 카툰 스타일 공통 값 */
export const OUTLINE = 0x1a1a24;
export const LW = 3;

/** 진영 포인트 컬러 (플레이어 파랑 / 적 빨강) */
export const TEAM = [
  { main: 0x3d8bff, light: 0x9cc6ff, dark: 0x1f4f9e },
  { main: 0xff4a3d, light: 0xffa39c, dark: 0x9e231b },
] as const;

export function shade(color: number, f: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  const k = (v: number) => Phaser.Math.Clamp(Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f), 0, 255);
  return Phaser.Display.Color.GetColor(k(c.red), k(c.green), k(c.blue));
}

/**
 * 로컬 좌표(피벗 = 0,0)로 그리는 펜. 텍스처 생성 시 캔버스 안쪽으로 평행이동한다.
 * 모든 도형은 채움 + 외곽선.
 */
export class Pen {
  constructor(readonly g: Phaser.GameObjects.Graphics, readonly ox: number, readonly oy: number) {}

  private ol(w = LW): void {
    this.g.lineStyle(w, OUTLINE, 1);
  }

  rect(x: number, y: number, w: number, h: number, fill: number, r = 0, outline = true): this {
    const g = this.g;
    g.fillStyle(fill, 1);
    if (r > 0) g.fillRoundedRect(this.ox + x, this.oy + y, w, h, r);
    else g.fillRect(this.ox + x, this.oy + y, w, h);
    if (outline) {
      this.ol();
      if (r > 0) g.strokeRoundedRect(this.ox + x, this.oy + y, w, h, r);
      else g.strokeRect(this.ox + x, this.oy + y, w, h);
    }
    return this;
  }

  circle(x: number, y: number, r: number, fill: number, outline = true): this {
    this.g.fillStyle(fill, 1).fillCircle(this.ox + x, this.oy + y, r);
    if (outline) {
      this.ol();
      this.g.strokeCircle(this.ox + x, this.oy + y, r);
    }
    return this;
  }

  ellipse(x: number, y: number, w: number, h: number, fill: number, outline = true): this {
    this.g.fillStyle(fill, 1).fillEllipse(this.ox + x, this.oy + y, w, h);
    if (outline) {
      this.ol();
      this.g.strokeEllipse(this.ox + x, this.oy + y, w, h);
    }
    return this;
  }

  poly(pts: number[], fill: number, outline = true, alpha = 1): this {
    const p: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < pts.length; i += 2) p.push(new Phaser.Math.Vector2(this.ox + pts[i], this.oy + pts[i + 1]));
    this.g.fillStyle(fill, alpha).fillPoints(p, true);
    if (outline) {
      this.ol();
      this.g.strokePoints(p, true);
    }
    return this;
  }

  /** 외곽선 있는 두꺼운 선 */
  line(x1: number, y1: number, x2: number, y2: number, color: number, width: number, outline = true): this {
    const g = this.g;
    if (outline) {
      g.lineStyle(width + LW * 2 - 1, OUTLINE, 1).lineBetween(this.ox + x1, this.oy + y1, this.ox + x2, this.oy + y2);
      g.fillStyle(OUTLINE).fillCircle(this.ox + x1, this.oy + y1, (width + LW * 2 - 1) / 2).fillCircle(this.ox + x2, this.oy + y2, (width + LW * 2 - 1) / 2);
    }
    g.lineStyle(width, color, 1).lineBetween(this.ox + x1, this.oy + y1, this.ox + x2, this.oy + y2);
    g.fillStyle(color).fillCircle(this.ox + x1, this.oy + y1, width / 2).fillCircle(this.ox + x2, this.oy + y2, width / 2);
    return this;
  }

  /** 외곽선 없는 얇은 선(하이라이트/줄 등) */
  thin(x1: number, y1: number, x2: number, y2: number, color: number, width = 2, alpha = 1): this {
    this.g.lineStyle(width, color, alpha).lineBetween(this.ox + x1, this.oy + y1, this.ox + x2, this.oy + y2);
    return this;
  }

  /** 외곽선 없는 채움(광택/그림자) */
  glow(x: number, y: number, r: number, color: number, alpha: number): this {
    this.g.fillStyle(color, alpha).fillCircle(this.ox + x, this.oy + y, r);
    return this;
  }

  arc(x: number, y: number, r: number, a0: number, a1: number, color: number, width: number, outline = true): this {
    const g = this.g;
    if (outline) {
      g.lineStyle(width + LW * 2 - 1, OUTLINE, 1).beginPath().arc(this.ox + x, this.oy + y, r, a0, a1).strokePath();
    }
    g.lineStyle(width, color, 1).beginPath().arc(this.ox + x, this.oy + y, r, a0, a1).strokePath();
    return this;
  }
}

/** 생성 텍스처의 피벗(원점) 정보 */
export const TEX_ORIGIN = new Map<string, { x: number; y: number }>();

/**
 * (w×h) 캔버스에 피벗 (px, py) 기준으로 그린 뒤 텍스처로 저장.
 * Image 생성 시 applyOrigin 으로 피벗을 맞춘다.
 */
export function makeTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  px: number,
  py: number,
  draw: (p: Pen) => void,
): string {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  draw(new Pen(g, px, py));
  g.generateTexture(key, w, h);
  g.destroy();
  TEX_ORIGIN.set(key, { x: px / w, y: py / h });
  return key;
}

export function applyOrigin(img: Phaser.GameObjects.Image): Phaser.GameObjects.Image {
  const o = TEX_ORIGIN.get(img.texture.key);
  if (o) img.setOrigin(o.x, o.y);
  return img;
}

/** 캔버스/WebGL 모두에서 동작하는 세로 그라데이션(띠 채움) */
export function gradientRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, top: number, bottom: number, bands = 90): void {
  const a = Phaser.Display.Color.IntegerToColor(top);
  const b = Phaser.Display.Color.IntegerToColor(bottom);
  const step = h / bands;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const c = Phaser.Display.Color.GetColor(
      Math.round(a.red + (b.red - a.red) * t),
      Math.round(a.green + (b.green - a.green) * t),
      Math.round(a.blue + (b.blue - a.blue) * t),
    );
    g.fillStyle(c, 1).fillRect(x, y + i * step, w, step + 1);
  }
}
