import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { AI_PARAMS, DIFFICULTIES, type Difficulty } from '../config/ai';
import { STAGE_COUNT, stageLabel } from '../config/story';
import { loadStory } from '../systems/StoryProgress';
import { gradientRect } from '../render/draw';
import { Button } from './ui/Button';
import { textStyle, UI } from './ui/theme';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width } = this.scale;
    const bg = this.add.graphics();
    gradientRect(bg, 0, 0, 1280, 720, 0x1b1f3a, 0xf2b56b);

    this.add.text(width / 2, 150, '크로노 프론트', textStyle(84, '#ffe066')).setOrigin(0.5);
    this.add.text(width / 2, 222, '원시 시대부터 미래까지, 한 줄의 전선을 지켜라', textStyle(22, UI.text, false)).setOrigin(0.5);
    this.add.text(width / 2, 282, '기본 모드 · 난이도 선택', textStyle(22, UI.textDim)).setOrigin(0.5);

    DIFFICULTIES.forEach((d, i) => {
      const p = AI_PARAMS[d];
      const b = new Button(this, {
        x: width / 2 + (i - 1) * 250, y: 352, w: 220, h: 96, label: p.label, sub: p.desc, fontSize: 26, subColor: UI.textDim,
        onClick: () => this.start(d),
      });
      b.label.setY(-14);
      b.sub.setY(24);
    });

    const save = loadStory();
    const progress = save.cleared >= STAGE_COUNT ? '전체 클리어!' : `다음 스테이지 ${stageLabel(save.cleared)}`;
    const story = new Button(this, {
      x: width / 2, y: 478, w: 470, h: 84, label: '스토리 모드', sub: `1-1 → 5-5 · 클리어 보상으로 영구 강화 · ${progress}`, fontSize: 28, subColor: UI.gold,
      onClick: () => this.startStory(),
    });
    story.label.setY(-13);
    story.sub.setY(22);
    story.setGlow(true);
    this.events.on('update', (_t: number, dt: number) => story.tick(dt / 1000));

    const help = [
      '조작: 1/2/3 유닛 생산 · Space 특수기 · E 진화 · P 일시정지 · F 배속 · M 음소거',
      '화면 이동: ←/→ 또는 A/D, 드래그, 하단 미니맵 클릭',
    ];
    this.add.text(width / 2, 590, help.join('\n'), { ...textStyle(16, UI.textDim, false), align: 'center', lineSpacing: 8 }).setOrigin(0.5);

    const mute = new Button(this, {
      x: 1200, y: 680, w: 110, h: 40, label: sfx.muted ? '음소거' : '소리 켜짐', fontSize: 14,
      onClick: () => {
        sfx.unlock();
        sfx.toggleMute();
        mute.setTexts(sfx.muted ? '음소거' : '소리 켜짐');
        sfx.click();
      },
    });

    this.input.keyboard!.on('keydown-ONE', () => this.start('easy'));
    this.input.keyboard!.on('keydown-TWO', () => this.start('normal'));
    this.input.keyboard!.on('keydown-THREE', () => this.start('hard'));
    this.input.keyboard!.on('keydown-S', () => this.startStory());
  }

  private startStory(): void {
    sfx.unlock();
    sfx.click();
    this.scene.start('StoryScene');
  }

  private start(difficulty: Difficulty): void {
    sfx.unlock();
    sfx.click();
    this.scene.start('GameScene', { difficulty });
  }
}
