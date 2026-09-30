import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';
import { StoryScene } from './scenes/StoryScene';
import { UIScene } from './scenes/UIScene';
import { setupOrientation } from './orientation';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#111318',
  // 화면 맞춤·가운데 정렬·모바일 세로 화면 회전은 orientation.ts 가 직접 처리
  scale: {
    mode: Phaser.Scale.NONE,
  },
  input: { activePointers: 3 },
  // 저사양에서 프레임 시간이 잘려 트윈·타이머가 느려지지 않도록 실제 경과 시간 사용
  fps: { smoothStep: false },
  render: { antialias: true },
  scene: [BootScene, MenuScene, StoryScene, GameScene, UIScene, ResultScene],
});

setupOrientation(game, document.getElementById('game')!);

// 개발 모드에서만 콘솔/자동화 테스트용 핸들 노출
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
