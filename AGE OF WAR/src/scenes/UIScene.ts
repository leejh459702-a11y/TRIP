import Phaser from 'phaser';
import type { UnitRole } from '../config/balance';
import { ERAS, getUnitStats, UNIT_ROLES } from '../config/eras';
import type { GameScene } from './GameScene';

export class UIScene extends Phaser.Scene {
  private info!: Phaser.GameObjects.Text;
  private queueText!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    const game = this.scene.get('GameScene') as GameScene;
    this.info = this.add.text(16, 16, '', { fontSize: '20px', color: '#fff', backgroundColor: '#0008' });
    this.queueText = this.add.text(640, 16, '', { fontSize: '18px', color: '#fff' }).setOrigin(0.5, 0);
    UNIT_ROLES.forEach((role: UnitRole, i) => {
      const s = getUnitStats(role, 0);
      const b = this.add
        .text(900 + i * 125, 16, `${ERAS[0].units[role].name}\n${s.cost}G`, { fontSize: '16px', color: '#fff', backgroundColor: '#335', padding: { x: 6, y: 4 } })
        .setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => game.world.train(0, role));
    });
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      const idx = ['1', '2', '3'].indexOf(e.key);
      if (idx >= 0) game.world.train(0, UNIT_ROLES[idx]);
    });
  }

  update(): void {
    const game = this.scene.get('GameScene') as GameScene;
    const s = game.world.side(0);
    this.info.setText(`골드 ${Math.floor(s.gold)}  EXP ${Math.floor(s.exp)}`);
    this.queueText.setText(`대기열 ${s.queue.items.map((i) => i.role[0]).join(' ')}  ${(s.queue.ratio * 100) | 0}%`);
  }
}
