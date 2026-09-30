import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { AI_PARAMS, type Difficulty } from '../config/ai';
import { ERAS } from '../config/eras';
import { STAGE_COUNT, stageLabel } from '../config/story';
import { gradientRect } from '../render/draw';
import { Button } from './ui/Button';
import { textStyle, UI } from './ui/theme';

export interface ResultData {
  win: boolean;
  time: number;
  kills: number;
  era: number;
  difficulty: Difficulty;
  /** 스토리 모드 스테이지(기본 모드면 null) */
  stage?: number | null;
  /** 이번 판에 얻은 강화 포인트 */
  points?: number;
  firstClear?: boolean;
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(data: ResultData): void {
    const { width } = this.scale;
    const bg = this.add.graphics();
    const top = data.win ? 0x2e6fb0 : 0x5a1f2a;
    gradientRect(bg, 0, 0, 1280, 720, top, 0x111318);

    const title = this.add.text(width / 2, 170, data.win ? '승리!' : '패배', textStyle(96, data.win ? '#ffe066' : '#ff8a8a')).setOrigin(0.5).setScale(0.4);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.Out' });
    this.add.text(width / 2, 250, data.win ? '적 기지를 무너뜨렸습니다' : '기지가 함락되었습니다', textStyle(22, UI.text, false)).setOrigin(0.5);

    const story = typeof data.stage === 'number';
    const rows: [string, string][] = [
      story ? ['스테이지', stageLabel(data.stage!)] : ['난이도', AI_PARAMS[data.difficulty].label],
      ['플레이 시간', formatTime(data.time)],
      ['처치 수', `${data.kills}`],
      ['도달 시대', `${data.era + 1}시대 · ${ERAS[data.era].name}`],
    ];
    if (story) rows.push(['강화 포인트', data.win ? `+${data.points ?? 0}P${data.firstClear ? ' (첫 클리어)' : ''}` : '없음']);
    const panel = this.add.graphics();
    const ph = 30 + rows.length * 40;
    panel.fillStyle(UI.panelEdge, 0.9).fillRoundedRect(width / 2 - 230, 292, 460, ph + 8, 14);
    panel.fillStyle(UI.panel, 0.95).fillRoundedRect(width / 2 - 226, 296, 452, ph, 12);
    rows.forEach(([k, v], i) => {
      this.add.text(width / 2 - 200, 316 + i * 40, k, textStyle(20, UI.textDim, false));
      this.add.text(width / 2 + 200, 316 + i * 40, v, textStyle(22)).setOrigin(1, 0);
    });

    const by = 380 + rows.length * 40;
    if (story) {
      const stage = data.stage!;
      const hasNext = data.win && stage + 1 < STAGE_COUNT;
      const primary = hasNext ? { stage: stage + 1 } : { stage };
      new Button(this, { x: width / 2 - 240, y: by, w: 210, h: 58, label: hasNext ? `다음 스테이지 ${stageLabel(stage + 1)}` : data.win ? '다시 하기' : '다시 도전', fontSize: 19, onClick: () => this.go('GameScene', primary) });
      new Button(this, { x: width / 2, y: by, w: 210, h: 58, label: '강화하기', sub: '스테이지 선택', fontSize: 20, subColor: UI.textDim, onClick: () => this.go('StoryScene') });
      new Button(this, { x: width / 2 + 240, y: by, w: 210, h: 58, label: '메뉴로', fontSize: 20, onClick: () => this.go('MenuScene') });
      this.input.keyboard!.once('keydown-ENTER', () => this.go('GameScene', primary));
    } else {
      new Button(this, { x: width / 2 - 120, y: by, w: 210, h: 58, label: '다시 하기', fontSize: 20, onClick: () => this.go('GameScene', { difficulty: data.difficulty }) });
      new Button(this, { x: width / 2 + 120, y: by, w: 210, h: 58, label: '메뉴로', fontSize: 20, onClick: () => this.go('MenuScene') });
      this.input.keyboard!.once('keydown-ENTER', () => this.go('GameScene', { difficulty: data.difficulty }));
    }
  }

  private go(scene: string, data?: object): void {
    sfx.click();
    this.scene.start(scene, data);
  }
}
