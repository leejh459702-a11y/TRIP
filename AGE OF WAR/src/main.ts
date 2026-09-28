import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';
import { UIScene } from './scenes/UIScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#111318',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  // 저사양에서 프레임 시간이 잘려 트윈·타이머가 느려지지 않도록 실제 경과 시간 사용
  fps: { smoothStep: false },
  render: { antialias: true },
  scene: [BootScene, MenuScene, GameScene, UIScene, ResultScene],
});

// 개발 모드에서만 콘솔/자동화 테스트용 핸들 노출
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
