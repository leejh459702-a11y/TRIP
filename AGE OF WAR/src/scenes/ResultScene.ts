import Phaser from 'phaser';

export interface ResultData {
  win: boolean;
  time: number;
  kills: number;
  era: number;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(data: ResultData): void {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 60, data.win ? '승리!' : '패배...', { fontSize: '64px', color: '#fff' }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 10, `시간 ${Math.floor(data.time)}초 · 처치 ${data.kills} · 시대 ${data.era + 1}`, { fontSize: '24px', color: '#ddd' }).setOrigin(0.5);
    const btn = this.add.text(width / 2, height / 2 + 80, '[ 다시 시작 ]', { fontSize: '28px', color: '#ffe066' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
