import Phaser from 'phaser';
import type { UnitRole } from '../config/balance';
import { ERAS, UNIT_ROLES } from '../config/eras';
import type { Unit } from '../entities/Unit';
import { UNIT_SPRITE_RES, UNIT_SPRITES } from './unitSprites';

/**
 * 유닛 스프라이트(컨셉아트에서 추출, scripts/extract-units.py) 로드·색 변환·애니메이션.
 * 원본은 플레이어(파랑) 색이며, 적(빨강) 텍스처는 파란 계열 색상을 붉게 회전해 런타임에 만든다.
 * 한 장짜리 그림이므로 움직임은 몸 전체의 흔들림·기울기·찌그러짐 트윈으로 표현한다.
 */

type AttackStyle = 'swing' | 'thrust' | 'recoil' | 'throw' | 'charge' | 'blast';

const spriteUrls = import.meta.glob('../assets/units/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const baseKey = (era: number, role: UnitRole) => `u${era}_${role}`;
export const unitTextureKey = (era: number, role: UnitRole, side: number) => `unit_${baseKey(era, role)}_${side}`;

/** 유닛별 모션 성격 */
interface MotionSpec {
  attack: AttackStyle;
  /** 걷기 상하 흔들림(px) */
  bob: number;
  /** 걷기 좌우 기울기(rad) */
  tilt: number;
  /** 걷기 한 주기(ms, 속도 40 기준) */
  cycle: number;
}

const MOTION: Record<string, MotionSpec> = {
  u0_melee: { attack: 'swing', bob: 3, tilt: 0.06, cycle: 620 },
  u0_ranged: { attack: 'throw', bob: 3, tilt: 0.05, cycle: 620 },
  u0_heavy: { attack: 'charge', bob: 2.5, tilt: 0.025, cycle: 1000 },
  u1_melee: { attack: 'thrust', bob: 2.5, tilt: 0.04, cycle: 640 },
  u1_ranged: { attack: 'recoil', bob: 2.5, tilt: 0.04, cycle: 640 },
  u1_heavy: { attack: 'charge', bob: 2, tilt: 0.02, cycle: 480 },
  u2_melee: { attack: 'swing', bob: 2.5, tilt: 0.045, cycle: 680 },
  u2_ranged: { attack: 'recoil', bob: 2.5, tilt: 0.04, cycle: 680 },
  u2_heavy: { attack: 'charge', bob: 3, tilt: 0.03, cycle: 560 },
  u3_melee: { attack: 'thrust', bob: 2.5, tilt: 0.04, cycle: 640 },
  u3_ranged: { attack: 'recoil', bob: 2, tilt: 0.03, cycle: 660 },
  u3_heavy: { attack: 'blast', bob: 1.2, tilt: 0.012, cycle: 900 },
  u4_melee: { attack: 'swing', bob: 2.5, tilt: 0.05, cycle: 560 },
  u4_ranged: { attack: 'recoil', bob: 2, tilt: 0.03, cycle: 600 },
  u4_heavy: { attack: 'blast', bob: 3.5, tilt: 0.02, cycle: 1100 },
};

// ───────────────────────── 로드 / 색 변환 ─────────────────────────

/** BootScene.preload 에서 호출 */
export function preloadUnitSprites(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(spriteUrls)) {
    const name = path.split('/').pop()!.replace('.webp', '');
    scene.load.image(`unitsrc_${name}`, url);
  }
}

/** 파란 계열(H 185~255°) 색상을 빨강으로 회전한 캔버스를 만든다 */
function recolorToRed(src: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
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
    if (delta < 0.12) continue; // 무채색(은색 갑옷, 흰색, 검정)은 유지
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

/** 로드된 원본으로 진영별 텍스처(파랑 원본 / 빨강 변환) 등록. BootScene.create 에서 호출 */
export function prepareUnitSprites(scene: Phaser.Scene): void {
  for (let era = 0; era < ERAS.length; era++) {
    for (const role of UNIT_ROLES) {
      const src = `unitsrc_${baseKey(era, role)}`;
      if (!scene.textures.exists(src)) continue;
      const img = scene.textures.get(src).getSourceImage() as HTMLImageElement;
      const blue = unitTextureKey(era, role, 0);
      const red = unitTextureKey(era, role, 1);
      if (!scene.textures.exists(blue)) {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d')!.drawImage(img, 0, 0);
        scene.textures.addCanvas(blue, c);
      }
      if (!scene.textures.exists(red)) scene.textures.addCanvas(red, recolorToRed(img));
    }
  }
}

/** UI 아이콘(플레이어 색) */
export function ensureUnitIcon(scene: Phaser.Scene, era: number, role: UnitRole): string {
  const key = `icon_unit_${era}_${role}`;
  if (scene.textures.exists(key)) return key;
  const info = UNIT_SPRITES[baseKey(era, role)];
  const size = 96;
  const img = scene.make.image({ key: unitTextureKey(era, role, 0) }, false).setOrigin(0.5, 1);
  const scale = Math.min((size - 6) / info.w, (size - 6) / info.h);
  img.setScale(scale).setPosition(size / 2, size - 3);
  const rt = scene.make.renderTexture({ width: size, height: size }, false);
  rt.draw(img);
  rt.saveTexture(key);
  img.destroy();
  return key;
}

// ───────────────────────── 뷰 ─────────────────────────

/** 필드 유닛 1기의 표시 객체. 걷기/공격/피격/사망 트윈을 담당 */
export class UnitView {
  readonly root: Phaser.GameObjects.Container;
  /** 공격 돌진·반동용 */
  private readonly rig: Phaser.GameObjects.Container;
  /** 걷기 흔들림·기울기용 */
  private readonly body: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly walkTween: Phaser.Tweens.Tween;
  private readonly motion: MotionSpec;
  private readonly info: (typeof UNIT_SPRITES)[string];
  private readonly scaleFactor: number;
  /** 걷기 위상(트윈으로 0→2π 반복) */
  walkPhase = 0;
  private walkBlend = 0;
  private attackTween: Phaser.Tweens.TweenChain | null = null;
  private breathT = Math.random() * 10;
  dying = false;
  readonly yOffset: number;

  constructor(private readonly scene: Phaser.Scene, readonly unit: Unit, groundY: number) {
    const key = baseKey(unit.era, unit.role);
    this.info = UNIT_SPRITES[key];
    this.motion = MOTION[key];
    this.scaleFactor = 1 / UNIT_SPRITE_RES;
    this.yOffset = (unit.id % 4) * 3;
    const y = groundY + this.yOffset;

    const dispW = this.info.w * this.scaleFactor;
    this.shadow = scene.add.ellipse(unit.x, y + 1, Math.max(unit.width * 1.3, dispW * 0.55), 10, 0x000000, 0.25);
    // 기준점: 발 위치(anchorX), 바닥(아래 끝)
    this.sprite = scene.add
      .image(0, 0, unitTextureKey(unit.era, unit.role, unit.side))
      .setOrigin(this.info.anchorX / this.info.w, 1)
      .setScale(this.scaleFactor);
    this.body = scene.add.container(0, 0, [this.sprite]);
    this.rig = scene.add.container(0, 0, [this.body]);
    this.root = scene.add.container(unit.x, y, [this.rig]);
    this.root.setScale(unit.dir, 1);

    const depth = y + (unit.role === 'heavy' ? 0 : 0.5);
    this.root.setDepth(depth);
    this.shadow.setDepth(depth - 20);

    this.walkTween = scene.tweens.add({
      targets: this,
      walkPhase: Math.PI * 2,
      duration: this.motion.cycle * (40 / unit.stats.speed),
      repeat: -1,
      paused: true,
    });

    // 스폰 연출: 살짝 튀어나오며 등장
    this.rig.setScale(0.7, 0.4).setAlpha(0);
    scene.tweens.add({ targets: this.rig, scaleX: 1, scaleY: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
  }

  /** 표시 높이 */
  private get height(): number {
    return this.info.h * this.scaleFactor;
  }

  get headY(): number {
    return this.root.y - this.height;
  }

  /** 투사체 발사 위치(월드) */
  get muzzle(): { x: number; y: number } {
    const s = this.scaleFactor;
    return {
      x: this.root.x + this.unit.dir * (this.info.muzzleX - this.info.anchorX) * s,
      y: this.root.y - (this.info.h - this.info.muzzleY) * s,
    };
  }

  update(dtMs = 16): void {
    if (this.dying) return;
    const u = this.unit;
    this.root.x = u.x;
    this.shadow.x = u.x;
    const walking = u.state === 'walk';
    if (walking && this.walkTween.isPaused()) this.walkTween.resume();
    else if (!walking && !this.walkTween.isPaused()) this.walkTween.pause();

    // 걷기 ↔ 정지를 부드럽게 전환
    this.walkBlend = Phaser.Math.Clamp(this.walkBlend + (walking ? 1 : -1) * (dtMs / 180), 0, 1);
    const k = this.walkBlend;
    const ph = this.walkPhase;
    const m = this.motion;
    // 한 걸음마다 두 번 튀는 보행 리듬 + 좌우로 몸을 기울임
    const step = Math.abs(Math.sin(ph));
    this.body.y = -step * m.bob * k;
    this.body.rotation = Math.sin(ph) * m.tilt * k;
    // 착지 순간 살짝 눌리는 찌그러짐
    const squash = (1 - step) * 0.035 * k;
    // 정지 시 숨쉬기
    this.breathT += dtMs / 1000;
    const breath = (1 - k) * Math.sin(this.breathT * 2.4) * 0.012;
    this.body.setScale(1 + squash * 0.6, 1 - squash + breath);
  }

  attack(): void {
    if (this.dying) return;
    this.attackTween?.stop();
    this.rig.setPosition(0, 0).setRotation(0).setScale(1);
    const t = this.scene.tweens;
    const r = this.rig;
    switch (this.motion.attack) {
      case 'swing': // 뒤로 젖혔다가 앞으로 내려찍기
        this.attackTween = t.chain({
          targets: r,
          tweens: [
            { rotation: -0.1, x: -3, duration: 120, ease: 'Quad.Out' },
            { rotation: 0.16, x: 7, duration: 90, ease: 'Quad.In' },
            { rotation: 0, x: 0, duration: 200, ease: 'Quad.Out' },
          ],
        });
        break;
      case 'thrust': // 몸을 낮췄다가 앞으로 찌르기
        this.attackTween = t.chain({
          targets: r,
          tweens: [
            { x: -5, scaleY: 0.96, duration: 110, ease: 'Quad.Out' },
            { x: 11, scaleY: 1.02, duration: 80, ease: 'Quad.In' },
            { x: 0, scaleY: 1, duration: 200, ease: 'Quad.Out' },
          ],
        });
        break;
      case 'throw': // 뒤로 젖혔다가 던지기
        this.attackTween = t.chain({
          targets: r,
          tweens: [
            { rotation: -0.14, duration: 160, ease: 'Sine.InOut' },
            { rotation: 0.1, x: 4, duration: 90, ease: 'Quad.In' },
            { rotation: 0, x: 0, duration: 170, ease: 'Quad.Out' },
          ],
        });
        break;
      case 'recoil': // 발사 반동
        this.attackTween = t.chain({
          targets: r,
          tweens: [
            { x: -5, rotation: -0.05, duration: 60, ease: 'Quad.Out' },
            { x: 0, rotation: 0, duration: 240, ease: 'Quad.InOut' },
          ],
        });
        break;
      case 'charge': // 탈것 돌진: 몸을 웅크렸다 앞으로 들이받기
        this.attackTween = t.chain({
          targets: r,
          tweens: [
            { x: -6, rotation: -0.05, scaleX: 0.97, duration: 150, ease: 'Quad.Out' },
            { x: 12, rotation: 0.04, scaleX: 1.03, duration: 110, ease: 'Quad.In' },
            { x: 0, rotation: 0, scaleX: 1, duration: 260, ease: 'Quad.Out' },
          ],
        });
        break;
      case 'blast': // 포격: 강한 반동 + 차체 떨림
        this.attackTween = t.chain({
          targets: r,
          tweens: [
            { x: -10, scaleX: 0.95, scaleY: 1.03, duration: 70, ease: 'Quad.Out' },
            { x: 2, scaleX: 1.01, scaleY: 0.99, duration: 120, ease: 'Sine.InOut' },
            { x: 0, scaleX: 1, scaleY: 1, duration: 220, ease: 'Quad.Out' },
          ],
        });
        break;
    }
  }

  /** 포격형(대포 수레·메크) 여부 — 공격 시 총구 섬광 연출용 */
  get blasts(): boolean {
    return this.motion.attack === 'blast';
  }

  /** 피격: 흰색 플래시 + 살짝 밀림 */
  flash(): void {
    if (this.dying) return;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (!this.dying) this.sprite.clearTint();
    });
    if (!this.attackTween || !this.attackTween.isPlaying()) {
      this.scene.tweens.add({ targets: this.body, x: -3, duration: 60, yoyo: true, ease: 'Quad.Out', onComplete: () => this.body.setX(0) });
    }
  }

  /** 사망: 휘청인 뒤 쓰러지며 페이드 */
  die(onDone: () => void): void {
    if (this.dying) return;
    this.dying = true;
    this.walkTween.stop();
    this.attackTween?.stop();
    this.sprite.clearTint();
    const heavy = this.unit.role === 'heavy';
    // 보병은 뒤로 넘어지고, 탈것·기계는 기울며 주저앉음
    this.scene.tweens.chain({
      targets: this.rig,
      tweens: heavy
        ? [
            { rotation: 0.06, duration: 120, ease: 'Quad.Out' },
            { rotation: -0.35, y: 10, duration: 420, ease: 'Quad.In' },
          ]
        : [
            { rotation: 0.12, x: 3, duration: 110, ease: 'Quad.Out' },
            { rotation: -1.45, x: -12, duration: 380, ease: 'Quad.In' },
          ],
    });
    this.sprite.setTint(0xb0b0b8);
    this.scene.tweens.add({
      targets: [this.root, this.shadow],
      alpha: 0,
      delay: 520,
      duration: 450,
      onComplete: () => {
        this.destroy();
        onDone();
      },
    });
  }

  destroy(): void {
    this.walkTween.remove();
    this.root.destroy(true);
    this.shadow.destroy();
  }
}
