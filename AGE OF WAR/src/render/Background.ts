import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { ERAS } from '../config/eras';

/**
 * 시대별 배경 그림(src/assets/backgrounds/era{0-4}.webp)을 2레이어로 쓴다.
 * - 원경: 그림 전체. 카메라보다 느리게 움직이는 패럴랙스
 * - 지면: 그림 아래쪽의 균일한 땅 띠를 잘라 좌우 반전 이어붙인 뒤 월드 폭 전체에 깐다(카메라와 같이 이동)
 * 진화 시 이전 시대와 크로스페이드한다.
 */

const W = BALANCE.world.width;
const GROUND = BALANCE.world.groundY;
const VIEW_W = 1280;
/** 원화 → 화면 배율 */
const ART_SCALE = 0.85;
/** 원경 스크롤 배율: 그림 폭이 카메라 이동 범위를 딱 덮도록 */
const FAR_FACTOR = Math.max(0, Math.min(1, (1672 * ART_SCALE - VIEW_W) / (W - VIEW_W)));

/**
 * 그림별 기준선(원화 픽셀 y)
 * walk: 유닛 발이 닿는 높이(= groundY)
 * band: 지면 띠가 시작하는 높이(여기부터 아래는 좌우로 균일해 이어붙일 수 있음)
 */
const ART_LINES: { walk: number; band: number }[] = [
  { walk: 716, band: 703 }, // 석기: 풀밭 띠
  { walk: 822, band: 799 }, // 고대: 풀 + 흙길
  { walk: 796, band: 740 }, // 중세: 풀밭 + 흙길
  { walk: 794, band: 769 }, // 근대: 풀 + 흙길
  { walk: 732, band: 710 }, // 미래: 금속 도로
];

const artUrls = import.meta.glob('../assets/backgrounds/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function preloadBackgrounds(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(artUrls)) {
    const name = path.split('/').pop()!.replace('.webp', '');
    scene.load.image(`bgsrc_${name}`, url);
  }
}

/** 지면 띠(좌우 반전 이어붙임) 텍스처 */
function groundTexture(scene: Phaser.Scene, era: number): string {
  const key = `bg_ground_${era}`;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get(`bgsrc_era${era}`).getSourceImage() as HTMLImageElement;
  const top = ART_LINES[era].band;
  const h = src.height - top;
  const c = document.createElement('canvas');
  c.width = src.width * 2;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, top, src.width, h, 0, 0, src.width, h);
  ctx.save();
  ctx.translate(src.width * 2, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, top, src.width, h, 0, 0, src.width, h);
  ctx.restore();
  scene.textures.addCanvas(key, c);
  return key;
}

interface EraLayers {
  group: Phaser.GameObjects.Image[];
}

export class Background {
  private layers = new Map<number, EraLayers>();
  era = -1;

  constructor(private readonly scene: Phaser.Scene, era: number) {
    this.setEra(era, true);
  }

  /** 모든 시대 지면 텍스처를 미리 생성 */
  static prepare(scene: Phaser.Scene): void {
    for (let e = 0; e < ERAS.length; e++) groundTexture(scene, e);
  }

  private build(era: number): EraLayers {
    const s = this.scene;
    const { walk, band } = ART_LINES[era];
    const far = s.add.image(0, GROUND - walk * ART_SCALE, `bgsrc_era${era}`)
      .setOrigin(0, 0)
      .setScale(ART_SCALE)
      .setScrollFactor(FAR_FACTOR, 0)
      .setDepth(-90);
    const ground = s.add.image(0, GROUND - (walk - band) * ART_SCALE, groundTexture(s, era))
      .setOrigin(0, 0)
      .setScale(ART_SCALE)
      .setDepth(-60);
    return { group: [far, ground] };
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

  update(_dt: number): void {}
}
