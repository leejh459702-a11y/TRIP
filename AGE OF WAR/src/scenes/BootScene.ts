import Phaser from 'phaser';
import { ERAS, TURRET_TIERS, UNIT_ROLES } from '../config/eras';
import { Background } from '../render/Background';
import { baseTexture, ensureTurretIcon, turretTexture } from '../render/BaseRenderer';
import { prepareEffectTextures } from '../render/Effects';
import { ensureUnitIcon, preloadUnitSprites, prepareUnitSprites } from '../render/UnitRenderer';
import { textStyle } from './ui/theme';

/** 유닛 스프라이트를 불러오고, 벡터 텍스처를 여러 프레임에 나눠 생성한 뒤 메뉴로 이동 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    preloadUnitSprites(this);
  }

  create(): void {
    const tasks: (() => void)[] = [];
    tasks.push(() => prepareUnitSprites(this));
    tasks.push(() => prepareEffectTextures(this));
    tasks.push(() => Background.prepare(this));
    for (let era = 0; era < ERAS.length; era++) {
      for (const side of [0, 1]) {
        tasks.push(() => {
          baseTexture(this, era, side);
          for (const tier of TURRET_TIERS) turretTexture(this, era, tier, side);
        });
      }
      tasks.push(() => {
        for (const role of UNIT_ROLES) ensureUnitIcon(this, era, role);
        for (const tier of TURRET_TIERS) ensureTurretIcon(this, era, tier);
      });
    }

    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 40, '크로노 프론트', textStyle(48, '#ffe066')).setOrigin(0.5);
    const bar = this.add.graphics();
    const total = tasks.length;
    let done = 0;
    const draw = () => {
      bar.clear();
      bar.fillStyle(0x0b0d14).fillRoundedRect(width / 2 - 204, height / 2 + 20, 408, 22, 8);
      bar.fillStyle(0xffe066).fillRoundedRect(width / 2 - 200, height / 2 + 24, 400 * (done / total), 14, 6);
    };
    draw();
    this.time.addEvent({
      delay: 1,
      repeat: total - 1,
      callback: () => {
        tasks[done++]();
        draw();
        if (done >= total) this.time.delayedCall(80, () => this.scene.start('MenuScene'));
      },
    });
  }
}
