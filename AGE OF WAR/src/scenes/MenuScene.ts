import Phaser from 'phaser';
import menuLayout from '../assets/menu/layout.json';
import { sfx } from '../audio/Sfx';
import type { Difficulty } from '../config/ai';
import { STAGE_COUNT, stageLabel } from '../config/story';
import { loadStory } from '../systems/StoryProgress';
import { textStyle } from './ui/theme';

/**
 * 메인 화면. 시안 그림(src/assets/menu, scripts/build-menu.py 로 생성)을 배경으로 깔고,
 * 시안 속 버튼 자리에 같은 모양으로 잘라 낸 버튼 그림을 올려 클릭·호버를 처리한다.
 * 시안의 비율(1672×941)은 그대로 유지한 채 1280 폭에 맞춘다.
 */

const menuUrls = import.meta.glob('../assets/menu/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** BootScene.preload 에서 호출 */
export function preloadMenu(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(menuUrls)) {
    const name = path.split('/').pop()!.replace('.webp', '');
    scene.load.image(`menu_${name}`, url);
  }
}

type ButtonName = keyof typeof menuLayout.buttons;

/** 시안 좌표 → 화면 좌표 배율 */
const K = 1280 / menuLayout.width;
const CREAM = '#f7ecd0';
const GOLD = '#ffd84a';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.add.image(0, 0, 'menu_bg').setOrigin(0).setScale(K);

    this.menuButton('easy', () => this.start('easy'));
    this.menuButton('normal', () => this.start('normal'));
    this.menuButton('hard', () => this.start('hard'));
    const story = this.menuButton('story', () => this.startStory());
    // 스토리 버튼 부제(시안의 '업적 강화' 오타를 지우고 다시 그림)
    this.richLine(story, 744 - menuLayout.buttons.story.y, 20, [
      ['1-1부터 5-5까지', GOLD],
      [' · 클리어 보상으로 ', CREAM],
      ['영구 강화', GOLD],
    ]);
    this.progressBadge();

    const sound = this.menuButton('sound', () => {
      sfx.unlock();
      sfx.toggleMute();
      sfx.click();
      drawMute();
    });
    // 음소거 표시: 스피커 아이콘 위에 빨간 사선
    const muteMark = this.add.graphics();
    sound.add(muteMark);
    const drawMute = () => {
      muteMark.clear();
      if (!sfx.muted) return;
      const cx = (1482 - menuLayout.buttons.sound.x) * K;
      muteMark.lineStyle(5, 0x0b0d14).lineBetween(cx - 16, -14, cx + 16, 14);
      muteMark.lineStyle(3, 0xff4d4d).lineBetween(cx - 16, -14, cx + 16, 14);
    };
    drawMute();

    // 하단 조작 안내(시안 글자 오류를 지우고 다시 그림)
    this.richLine(null, 840 * K, 15, [['조작: ', GOLD], ['1/2/3 유닛 생산 · Space 특수기 · E 진화 · P 일시정지 · F 배속 · M 음소거', CREAM]]);
    this.richLine(null, 870 * K, 15, [['화면 이동: ', GOLD], ['←/→ 또는 A/D · 드래그 · 하단 미니맵 클릭', CREAM]]);

    this.input.keyboard!.on('keydown-ONE', () => this.start('easy'));
    this.input.keyboard!.on('keydown-TWO', () => this.start('normal'));
    this.input.keyboard!.on('keydown-THREE', () => this.start('hard'));
    this.input.keyboard!.on('keydown-S', () => this.startStory());
  }

  /** 시안 속 버튼 자리에 버튼 그림을 올리고 호버(확대)·누름(어둡게) 처리 */
  private menuButton(name: ButtonName, onClick: () => void): Phaser.GameObjects.Container {
    const b = menuLayout.buttons[name];
    const c = this.add.container(b.x * K, b.y * K);
    const img = this.add.image(0, 0, `menu_${name}`).setScale(K);
    c.add(img);
    c.setSize(b.w * K, b.h * K);
    c.setInteractive({ useHandCursor: true });
    let down = false;
    const scaleTo = (s: number) => this.tweens.add({ targets: c, scale: s, duration: 110, ease: 'Quad.Out' });
    c.on('pointerover', () => scaleTo(1.04));
    c.on('pointerout', () => {
      down = false;
      img.clearTint();
      scaleTo(1);
    });
    c.on('pointerdown', () => {
      down = true;
      img.setTint(0xc8c8c8);
    });
    c.on('pointerup', () => {
      img.clearTint();
      if (down) onClick();
      down = false;
    });
    return c;
  }

  /** 색이 섞인 한 줄 글자. parent 가 있으면 그 안에서 (0, dy) 가운데 정렬, 없으면 화면 가운데 y */
  private richLine(parent: Phaser.GameObjects.Container | null, y: number, size: number, parts: [string, string][]): void {
    const texts = parts.map(([t, color]) => {
      const s = textStyle(size, color);
      return this.add.text(0, 0, t, { ...s, strokeThickness: Math.max(3, Math.round(size / 4)) }).setOrigin(0, 0.5);
    });
    const total = texts.reduce((w, t) => w + t.width, 0);
    let x = (parent ? 0 : 640) - total / 2;
    for (const t of texts) {
      t.setPosition(x, y);
      x += t.width;
      parent?.add(t);
    }
  }

  /** 스토리 진행도 꼬리표(스토리 버튼 오른쪽 위) */
  private progressBadge(): void {
    const save = loadStory();
    const label = save.cleared >= STAGE_COUNT ? '전체 클리어!' : save.cleared === 0 ? '새로 시작' : `다음 ${stageLabel(save.cleared)}`;
    const b = menuLayout.buttons.story;
    const x = (b.x + b.w / 2) * K - 70;
    const y = (b.y - b.h / 2) * K + 2;
    const t = this.add.text(x, y, label, textStyle(15, GOLD)).setOrigin(0.5);
    const w = t.width + 24;
    const g = this.add.graphics();
    g.fillStyle(0x0b0d14, 0.95).fillRoundedRect(x - w / 2 - 2, y - 15, w + 4, 30, 15);
    g.fillStyle(0x2a2150).fillRoundedRect(x - w / 2, y - 13, w, 26, 13);
    g.lineStyle(2, 0xf2b134).strokeRoundedRect(x - w / 2, y - 13, w, 26, 13);
    t.setDepth(1);
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
