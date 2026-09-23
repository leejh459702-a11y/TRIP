import Phaser from 'phaser';
import { expRequired } from '../../systems/EraSystem';
import type { GameScene } from '../GameScene';
import { Button } from './Button';
import { textStyle } from './theme';

/**
 * 개발 모드 전용 밸런스 디버그 패널 (` 키로 토글).
 * 골드/EXP 추가, AI 전력·모드 표시. 프로덕션 빌드에서는 생성되지 않는다.
 */
export class DebugPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly info: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, private readonly game: GameScene) {
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.78).fillRoundedRect(0, 0, 400, 250, 10);
    bg.lineStyle(2, 0x7bed9f).strokeRoundedRect(0, 0, 400, 250, 10);
    const title = scene.add.text(12, 8, 'DEBUG (` 토글)', textStyle(14, '#7bed9f'));
    this.info = scene.add.text(12, 32, '', { ...textStyle(13, '#ffffff', false), lineSpacing: 3 });
    const mk = (x: number, y: number, label: string, fn: () => void) =>
      new Button(scene, { x, y, w: 120, h: 30, label, fontSize: 12, onClick: fn });
    const w = () => game.world;
    const buttons = [
      mk(70, 190, '+1000 골드', () => { w().side(0).gold += 1000; }),
      mk(200, 190, '+1000 EXP', () => { w().side(0).exp += 1000; }),
      mk(330, 190, '진화 EXP 채우기', () => {
        const s = w().side(0);
        const req = expRequired(s.era);
        if (req !== null) s.exp = Math.max(s.exp, req);
      }),
      mk(70, 226, 'AI +1000 골드', () => { w().side(1).gold += 1000; }),
      mk(200, 226, '특수기 충전', () => { w().side(0).specialCooldown = 0; }),
      mk(330, 226, '적 기지 -25%', () => {
        const b = w().side(1).base;
        b.hp = Math.max(1, b.hp - b.maxHp * 0.25);
      }),
    ];
    this.root = scene.add.container(440, 180, [bg, title, this.info, ...buttons]).setDepth(200).setVisible(false);
    scene.input.keyboard!.on('keydown-BACKTICK', () => this.root.setVisible(!this.root.visible));
  }

  update(): void {
    if (!this.root.visible) return;
    this.info.setText(this.game.debugInfo);
  }
}
