import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { ERAS } from '../config/eras';
import { createRng } from '../systems/rng';
import { gradientRect, makeTexture, shade } from './draw';

/**
 * 시대별 3레이어 패럴랙스 배경(원경/중경/지면) + 하늘.
 * 진화 시 이전 시대 레이어와 크로스페이드한다.
 */

const W = BALANCE.world.width;
const GROUND = BALANCE.world.groundY;
const FAR_FACTOR = 0.2;
const MID_FACTOR = 0.5;

function skyTexture(scene: Phaser.Scene, era: number): string {
  const key = `bg_sky_${era}`;
  if (scene.textures.exists(key)) return key;
  const [top, bottom] = ERAS[era].palette.sky;
  const g = scene.make.graphics({}, false);
  gradientRect(g, 0, 0, 1280, 720, top, bottom);
  const rng = createRng(era * 97 + 3);
  if (era === 4) {
    for (let i = 0; i < 90; i++) g.fillStyle(0xffffff, 0.3 + rng() * 0.7).fillCircle(rng() * 1280, rng() * 420, rng() * 1.6 + 0.4);
  }
  // 해 / 달
  const sun = [0xfff1b8, 0xfffbe0, 0xfff6d0, 0xf4f1e8, 0xd7e6ff][era];
  g.fillStyle(sun, 0.25).fillCircle(1040, 130, 70);
  g.fillStyle(sun, 1).fillCircle(1040, 130, 44);
  g.generateTexture(key, 1280, 720);
  g.destroy();
  return key;
}

function farTexture(scene: Phaser.Scene, era: number): string {
  const pal = ERAS[era].palette;
  const width = Math.ceil(1280 + (W - 1280) * FAR_FACTOR) + 40;
  return makeTexture(scene, `bg_far_${era}`, width, 320, 0, 320, (p) => {
    const rng = createRng(era * 131 + 7);
    const pts: number[] = [0, 0];
    let x = 0;
    while (x < width + 80) {
      const peak = era === 4 ? 60 + rng() * 140 : 80 + rng() * 170;
      const half = 70 + rng() * 110;
      if (era === 4) {
        // 미래: 거대 건물 실루엣
        pts.push(x, -peak, x + half * 0.6, -peak);
        x += half * 0.6 + 10;
        pts.push(x, -40);
      } else {
        pts.push(x + half, -peak);
        x += half * 2;
        pts.push(x, -30 - rng() * 30);
      }
    }
    pts.push(width + 80, 0);
    p.poly(pts, pal.far, false);
    // 봉우리 하이라이트
    if (era < 4) {
      const hl = shade(pal.far, 1.25);
      for (let i = 2; i < pts.length - 2; i += 2) if (pts[i + 1] < -150) p.poly([pts[i] - 18, pts[i + 1] + 26, pts[i], pts[i + 1], pts[i] + 18, pts[i + 1] + 26], era === 2 || era === 1 ? 0xf4f4f4 : hl, false);
    } else {
      for (let i = 0; i < 160; i++) p.glow(rng() * width, -rng() * 180, 1.5, 0x9ef3ff, 0.8);
    }
  });
}

function midTexture(scene: Phaser.Scene, era: number): string {
  const pal = ERAS[era].palette;
  const width = Math.ceil(1280 + (W - 1280) * MID_FACTOR) + 40;
  return makeTexture(scene, `bg_mid_${era}`, width, 260, 0, 260, (p) => {
    const rng = createRng(era * 53 + 11);
    // 완만한 언덕
    const hill: number[] = [0, 0];
    for (let x = 0; x <= width + 60; x += 60) hill.push(x, -40 - Math.sin(x / 190 + era) * 18 - rng() * 10);
    hill.push(width + 60, 0);
    p.poly(hill, pal.mid, false);
    const dark = shade(pal.mid, 0.75);
    let x = 20;
    while (x < width) {
      const h = 50 + rng() * 70;
      switch (era) {
        case 0: // 거대 양치식물 / 야자
          p.line(x, -40, x + 4, -40 - h, 0x6b4a2a, 6, false);
          for (let k = 0; k < 5; k++) p.poly([x + 4, -40 - h, x + 4 + Math.cos(k * 1.2 - 2.6) * 40, -40 - h + Math.sin(k * 1.2 - 2.6) * 20 + 10, x + 4 + Math.cos(k * 1.2 - 2.6) * 30, -40 - h + Math.sin(k * 1.2 - 2.6) * 14 + 16], dark, false);
          break;
        case 1: // 사이프러스 + 신전
          if (rng() < 0.2) {
            p.rect(x - 30, -40 - 60, 70, 60, 0xd8cfb4, 0, false);
            for (let c = 0; c < 4; c++) p.rect(x - 26 + c * 18, -96, 8, 56, 0xefe6cc, 0, false);
            p.poly([x - 36, -100, x + 5, -122, x + 46, -100], 0xd8cfb4, false);
          } else p.ellipse(x, -40 - h / 2, 22, h, dark, false);
          break;
        case 2: // 활엽수 + 먼 성
          if (rng() < 0.12) {
            p.rect(x - 20, -40 - 90, 40, 90, 0x8c8f99, 0, false);
            for (let c = 0; c < 4; c++) p.rect(x - 20 + c * 11, -138, 7, 10, 0x8c8f99, 0, false);
            p.poly([x - 26, -130, x, -164, x + 26, -130], 0x6b3a3a, false);
          } else {
            p.rect(x - 3, -40 - h * 0.5, 6, h * 0.5, 0x5a3a1c, 0, false);
            p.circle(x, -40 - h * 0.6, h * 0.32, dark, false);
          }
          break;
        case 3: // 풍차 / 집
          if (rng() < 0.25) {
            p.rect(x - 16, -40 - 34, 32, 34, 0xc9b99a, 0, false);
            p.poly([x - 20, -74, x, -94, x + 20, -74], 0x7a3b2e, false);
          } else if (rng() < 0.2) {
            p.poly([x - 14, -40, x - 8, -130, x + 8, -130, x + 14, -40], 0xd9cdb4, false);
            for (let k = 0; k < 4; k++) {
              const a = k * (Math.PI / 2) + 0.4;
              p.thin(x, -130, x + Math.cos(a) * 50, -130 + Math.sin(a) * 50, 0x6b5a44, 6);
            }
          } else p.circle(x, -40 - h * 0.35, h * 0.28, dark, false);
          break;
        case 4: // 네온 빌딩
          {
            const bw = 30 + rng() * 40;
            const bh = 60 + rng() * 150;
            p.rect(x, -40 - bh, bw, bh, 0x2a2f48, 0, false);
            for (let wy = -40 - bh + 10; wy < -50; wy += 14) for (let wx = x + 5; wx < x + bw - 6; wx += 10) if (rng() < 0.5) p.rect(wx, wy, 5, 6, rng() < 0.5 ? 0x31e0e8 : 0xff5fd2, 0, false);
          }
          break;
      }
      x += 60 + rng() * 110;
    }
  });
}

function groundTexture(scene: Phaser.Scene, era: number): string {
  const pal = ERAS[era].palette;
  const h = 720 - GROUND + 20;
  return makeTexture(scene, `bg_ground_${era}`, W, h, 0, 20, (p) => {
    const rng = createRng(era * 17 + 5);
    p.rect(0, 0, W, h - 20, pal.ground, 0, false);
    p.rect(0, 26, W, h, pal.groundDark, 0, false);
    const top = era === 4 ? 0x5a6278 : era === 1 ? 0xb89a58 : shade(pal.mid, 1.05);
    p.rect(0, -8, W, 14, top, 0, false);
    p.thin(0, -8, W, -8, 0x1a1a24, 3);
    for (let i = 0; i < 140; i++) {
      const x = rng() * W;
      const y = 14 + rng() * (h - 40);
      if (era === 4) p.rect(x, y, 26 + rng() * 40, 3, 0x31e0e8, 0, false);
      else p.ellipse(x, y, 8 + rng() * 14, 4 + rng() * 5, shade(pal.ground, 0.8 + rng() * 0.3), false);
    }
    if (era !== 4) for (let i = 0; i < 260; i++) {
      const x = rng() * W;
      p.poly([x, -6, x + 3, -16 - rng() * 8, x + 6, -6], shade(top, 0.8), false);
    }
  });
}

function cloudTexture(scene: Phaser.Scene): string {
  return makeTexture(scene, 'bg_cloud', 200, 90, 100, 60, (p) => {
    p.ellipse(0, 0, 150, 40, 0xffffff, false);
    p.circle(-30, -10, 26, 0xffffff, false);
    p.circle(14, -18, 32, 0xffffff, false);
    p.circle(46, -4, 20, 0xffffff, false);
  });
}

interface EraLayers {
  group: Phaser.GameObjects.Image[];
}

export class Background {
  private layers = new Map<number, EraLayers>();
  private clouds: Phaser.GameObjects.Image[] = [];
  era = -1;

  constructor(private readonly scene: Phaser.Scene, era: number) {
    this.setEra(era, true);
    const cloud = cloudTexture(scene);
    const rng = createRng(99);
    for (let i = 0; i < 7; i++) {
      const c = scene.add.image(rng() * 1600, 60 + rng() * 170, cloud)
        .setScrollFactor(0.08, 0)
        .setAlpha(0.55 + rng() * 0.3)
        .setScale(0.6 + rng() * 0.8)
        .setDepth(-80);
      this.clouds.push(c);
    }
  }

  /** 모든 시대 텍스처를 미리 생성 */
  static prepare(scene: Phaser.Scene): void {
    for (let e = 0; e < ERAS.length; e++) {
      skyTexture(scene, e);
      farTexture(scene, e);
      midTexture(scene, e);
      groundTexture(scene, e);
    }
    cloudTexture(scene);
  }

  private build(era: number): EraLayers {
    const s = this.scene;
    const sky = s.add.image(0, 0, skyTexture(s, era)).setOrigin(0).setScrollFactor(0).setDepth(-100);
    const far = s.add.image(0, GROUND - 30, farTexture(s, era)).setOrigin(0, 1).setScrollFactor(FAR_FACTOR, 0).setDepth(-90);
    const mid = s.add.image(0, GROUND - 4, midTexture(s, era)).setOrigin(0, 1).setScrollFactor(MID_FACTOR, 0).setDepth(-70);
    const ground = s.add.image(0, GROUND - 20, groundTexture(s, era)).setOrigin(0, 0).setDepth(-60);
    return { group: [sky, far, mid, ground] };
  }

  setEra(era: number, instant = false): void {
    if (era === this.era) return;
    const prev = this.layers.get(this.era);
    let next = this.layers.get(era);
    if (!next) {
      next = this.build(era);
      this.layers.set(era, next);
    }
    // 진행 중인 크로스페이드를 정리하고, 이전/다음 시대 외 레이어는 숨김
    for (const [e, l] of this.layers) {
      this.scene.tweens.killTweensOf(l.group);
      if (e !== era && l !== prev) for (const o of l.group) o.setAlpha(0);
    }
    for (const o of next.group) this.scene.children.bringToTop(o);
    this.era = era;
    if (instant || !prev) {
      for (const o of next.group) o.setAlpha(1);
      if (prev) for (const o of prev.group) o.setAlpha(0);
      return;
    }
    for (const o of next.group) o.setAlpha(0);
    this.scene.tweens.add({ targets: next.group, alpha: 1, duration: 1400, ease: 'Sine.InOut' });
    this.scene.tweens.add({ targets: prev.group, alpha: 0, duration: 1400, ease: 'Sine.InOut' });
  }

  update(dt: number): void {
    for (const c of this.clouds) {
      c.x += dt * 8 * c.scale;
      if (c.x > 1700) c.x = -200;
    }
    const tint = this.era === 4 ? 0x7a6fb0 : 0xffffff;
    for (const c of this.clouds) if (c.tintTopLeft !== tint) c.setTint(tint);
  }
}
