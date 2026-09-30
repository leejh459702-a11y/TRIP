import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { CHAPTERS, getStage, REPLAY_POINTS, STAGE_COUNT, STAGES_PER_CHAPTER, stageLabel, UPGRADES, upgradeCost } from '../config/story';
import { gradientRect } from '../render/draw';
import { buyUpgrade, canUpgrade, isStageUnlocked, loadStory, refundUpgrades, saveStory, type StorySave } from '../systems/StoryProgress';
import { Button } from './ui/Button';
import { textStyle, UI } from './ui/theme';

/** 스토리 모드: 스테이지 선택(왼쪽) + 영구 강화(오른쪽) */
export class StoryScene extends Phaser.Scene {
  private save!: StorySave;
  private stageButtons: Button[] = [];
  private upgradeRows: { btn: Button; level: Phaser.GameObjects.Text; effect: Phaser.GameObjects.Text; bar: Phaser.GameObjects.Graphics }[] = [];
  private pointsText!: Phaser.GameObjects.Text;
  private nextText!: Phaser.GameObjects.Text;

  constructor() {
    super('StoryScene');
  }

  create(): void {
    this.save = loadStory();
    this.stageButtons = [];
    this.upgradeRows = [];
    const bg = this.add.graphics();
    gradientRect(bg, 0, 0, 1280, 720, 0x1b1f3a, 0x3b2a4a);

    this.add.text(640, 44, '스토리 모드', textStyle(40, '#ffe066')).setOrigin(0.5);
    new Button(this, { x: 90, y: 44, w: 130, h: 44, label: '← 메뉴', fontSize: 17, onClick: () => this.go('MenuScene') });
    this.pointsText = this.add.text(1240, 44, '', textStyle(22, UI.gold)).setOrigin(1, 0.5);

    this.panel(30, 92, 640, 580);
    this.panel(690, 92, 560, 580);

    // ── 스테이지 ──
    this.add.text(50, 108, '스테이지', textStyle(22));
    this.add.text(650, 112, '클리어하면 다음 스테이지가 열립니다', textStyle(14, UI.textDim, false)).setOrigin(1, 0);
    for (let c = 0; c < CHAPTERS; c++) {
      const y = 180 + c * 88;
      this.add.text(56, y, `${c + 1}장`, textStyle(22, UI.textDim)).setOrigin(0, 0.5);
      for (let n = 0; n < STAGES_PER_CHAPTER; n++) {
        const stage = c * STAGES_PER_CHAPTER + n;
        const b = new Button(this, {
          x: 170 + n * 106, y, w: 94, h: 70, label: stageLabel(stage), sub: '', fontSize: 22,
          onClick: () => this.startStage(stage),
        });
        b.label.setY(-12);
        b.sub.setY(18);
        this.stageButtons.push(b);
      }
    }
    this.nextText = this.add.text(350, 640, '', { ...textStyle(16, UI.text, false), align: 'center' }).setOrigin(0.5);

    // ── 강화 ──
    this.add.text(710, 108, '강화', textStyle(22));
    this.add.text(1230, 112, '포인트는 스테이지를 클리어하면 얻습니다', textStyle(14, UI.textDim, false)).setOrigin(1, 0);
    UPGRADES.forEach((u, i) => {
      const y = 180 + i * 88;
      this.add.text(712, y - 36, u.name, textStyle(20));
      const level = this.add.text(1020, y - 33, '', textStyle(16, UI.textDim)).setOrigin(1, 0);
      const bar = this.add.graphics();
      const effect = this.add.text(712, y + 12, '', textStyle(14, UI.exp, false));
      const btn = new Button(this, {
        x: 1150, y, w: 150, h: 60, label: '강화', sub: '', fontSize: 18,
        onClick: () => {
          if (buyUpgrade(this.save, u.key)) {
            saveStory(this.save);
            sfx.build();
            this.refresh();
          }
        },
      });
      btn.label.setY(-11);
      btn.sub.setY(15);
      btn.on('denied', () => sfx.deny());
      this.upgradeRows.push({ btn, level, effect, bar });
    });
    new Button(this, {
      x: 1150, y: 632, w: 150, h: 40, label: '강화 초기화', fontSize: 14,
      tooltip: () => '쓴 포인트를 모두 돌려받습니다',
      onClick: () => {
        refundUpgrades(this.save);
        saveStory(this.save);
        sfx.click();
        this.refresh();
      },
    });
    this.add.text(712, 632, '강화 효과는 스토리 모드에만 적용됩니다', textStyle(13, UI.textDim, false)).setOrigin(0, 0.5);

    this.refresh();
    this.input.keyboard!.once('keydown-ESC', () => this.go('MenuScene'));
    this.input.keyboard!.on('keydown-ENTER', () => this.startStage(Math.min(this.save.cleared, STAGE_COUNT - 1)));
  }

  private panel(x: number, y: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(UI.panelEdge, 0.9).fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 14);
    g.fillStyle(UI.panel, 0.92).fillRoundedRect(x, y, w, h, 12);
  }

  private refresh(): void {
    const s = this.save;
    this.pointsText.setText(`강화 포인트 ${s.points}P`);
    this.stageButtons.forEach((b, i) => {
      const unlocked = isStageUnlocked(s, i);
      const cleared = i < s.cleared;
      b.setEnabled(unlocked);
      b.setSelected(unlocked && !cleared);
      b.setGlow(unlocked && !cleared);
      b.setTexts(stageLabel(i), cleared ? '클리어' : unlocked ? '도전!' : '잠김', cleared ? '#8fe38f' : unlocked ? UI.gold : UI.textDim);
    });
    if (s.cleared >= STAGE_COUNT) {
      this.nextText.setText('모든 스테이지를 클리어했습니다!\n재도전하면 스테이지마다 ' + REPLAY_POINTS + 'P를 얻습니다');
    } else {
      const next = getStage(s.cleared);
      this.nextText.setText(`다음 도전: ${next.label} · 첫 클리어 +${next.firstClearPoints}P (재도전 +${REPLAY_POINTS}P)\nEnter 로 바로 시작`);
    }
    UPGRADES.forEach((u, i) => {
      const row = this.upgradeRows[i];
      const lv = s.levels[u.key];
      const max = lv >= u.maxLevel;
      row.level.setText(`Lv ${lv}/${u.maxLevel}`);
      row.effect.setText(max ? `${u.describe(lv)} (최대)` : `${u.describe(lv)} → ${u.describe(lv + 1).replace(/^.* /, '')}`);
      const g = row.bar;
      g.clear();
      const x = 712;
      const y = 180 + i * 88 - 3;
      for (let k = 0; k < u.maxLevel; k++) {
        g.fillStyle(k < lv ? 0xffd84a : 0x3a3d47).fillRoundedRect(x + k * 30, y, 26, 8, 3);
      }
      row.btn.setEnabled(canUpgrade(s, u.key));
      row.btn.setTexts(max ? '최대' : '강화', max ? '' : `${upgradeCost(lv)}P`, s.points >= upgradeCost(lv) ? UI.gold : UI.danger);
    });
  }

  private startStage(stage: number): void {
    if (!isStageUnlocked(this.save, stage)) {
      sfx.deny();
      return;
    }
    sfx.unlock();
    this.go('GameScene', { stage });
  }

  private go(scene: string, data?: object): void {
    sfx.click();
    this.scene.start(scene, data);
  }
}
