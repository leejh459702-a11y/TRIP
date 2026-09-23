import Phaser from 'phaser';

/** 생성 텍스처 준비 후 메뉴로 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
