import Phaser from 'phaser';
import { BALANCE, type TurretTier, type UnitRole } from '../config/balance';
import { ERAS, getTurretStats, getUnitStats, TURRET_TIERS, UNIT_ROLES } from '../config/eras';
import { evolveProgress, expRequired, MAX_ERA } from '../systems/EraSystem';
import { sellRefund } from '../systems/GameWorld';
import type { CommandResult } from '../systems/types';
import type { GameScene } from './GameScene';
import { Button } from './ui/Button';
import { textStyle, UI } from './ui/theme';

type Tab = 'units' | 'turrets' | 'slots' | 'sell' | 'evolve';
const TABS: { id: Tab; label: string }[] = [
  { id: 'units', label: '유닛' },
  { id: 'turrets', label: '포탑' },
  { id: 'slots', label: '슬롯 추가' },
  { id: 'sell', label: '포탑 판매' },
  { id: 'evolve', label: '진화' },
];

const fmt = (n: number): string => Math.floor(n).toLocaleString('en-US');

/** HUD 오버레이. 모든 조작은 GameScene.command → GameWorld 명령 API로 전달된다. */
export class UIScene extends Phaser.Scene {
  private game_!: GameScene;
  private tab: Tab = 'units';
  private tabButtons: Button[] = [];
  private actionButtons: Button[] = [];
  private eraText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;
  private expBar!: Phaser.GameObjects.Graphics;
  private evolveBtn!: Button;
  private queueGfx!: Phaser.GameObjects.Graphics;
  private queueIcons: Phaser.GameObjects.Image[] = [];
  private queueLabels: Phaser.GameObjects.Text[] = [];
  private queueText!: Phaser.GameObjects.Text;
  private tooltip!: Phaser.GameObjects.Container;
  private tooltipText!: Phaser.GameObjects.Text;
  private tooltipBg!: Phaser.GameObjects.Graphics;
  private tooltipOwner: Button | null = null;
  private specialGfx!: Phaser.GameObjects.Graphics;
  private specialText!: Phaser.GameObjects.Text;
  private specialZone!: Phaser.GameObjects.Zone;
  private specialHover = false;
  private pauseBtn!: Button;
  private speedBtn!: Button;
  private muteBtn!: Button;
  private minimap!: Phaser.GameObjects.Graphics;
  private toast!: Phaser.GameObjects.Text;
  private pauseLayer!: Phaser.GameObjects.Container;
  private lastEra = -1;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.game_ = this.scene.get('GameScene') as GameScene;
    this.tab = 'units';
    this.tabButtons = [];
    this.actionButtons = [];
    this.queueIcons = [];
    this.queueLabels = [];
    this.lastEra = -1;

    this.buildStatusPanel();
    this.buildQueuePanel();
    this.buildTabs();
    this.buildTooltip();
    this.buildSpecialButton();
    this.buildSystemButtons();
    this.buildMinimap();
    this.buildPauseLayer();

    this.toast = this.add.text(640, 170, '', textStyle(22, UI.danger)).setOrigin(0.5).setAlpha(0).setDepth(50);

    this.bindKeys();
    this.selectTab('units');
  }

  // ───────────────────────── 빌드 ─────────────────────────

  private panel(x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(UI.panelEdge, 0.9).fillRoundedRect(x - 3, y - 1, w + 6, h + 6, 12);
    g.fillStyle(UI.panel, 0.92).fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(2, 0xffffff, 0.08).strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 9);
    return g;
  }

  private buildStatusPanel(): void {
    this.panel(10, 10, 320, 116);
    this.eraText = this.add.text(24, 18, '', textStyle(16, UI.textDim));
    const coin = this.add.graphics();
    coin.fillStyle(0x0b0d14).fillCircle(34, 58, 13);
    coin.fillStyle(0xffc933).fillCircle(34, 58, 10);
    coin.fillStyle(0xfff2a8).fillCircle(31, 55, 4);
    this.goldText = this.add.text(54, 45, '', textStyle(24, UI.gold));
    this.expText = this.add.text(24, 76, '', textStyle(14, UI.exp));
    this.expBar = this.add.graphics();
    this.evolveBtn = new Button(this, {
      x: 272, y: 62, w: 92, h: 48, label: '진화', sub: 'E',
      subColor: UI.textDim,
      tooltip: () => this.evolveTooltip(),
      onClick: () => this.command((w) => w.evolve(0)),
    });
    this.hookTooltip(this.evolveBtn);
  }

  private buildQueuePanel(): void {
    this.panel(438, 10, 404, 96);
    this.add.text(452, 16, '생산 대기열', textStyle(13, UI.textDim));
    this.queueText = this.add.text(828, 16, '', textStyle(13, UI.textDim)).setOrigin(1, 0);
    this.queueGfx = this.add.graphics();
    for (let i = 0; i < BALANCE.production.maxQueue; i++) {
      const cx = 480 + i * 80;
      const img = this.add.image(cx, 60, '__DEFAULT').setVisible(false);
      this.queueIcons.push(img);
      this.queueLabels.push(this.add.text(cx, 60, '', textStyle(12)).setOrigin(0.5));
    }
  }

  private buildTabs(): void {
    this.panel(852, 10, 418, 150);
    TABS.forEach((t, i) => {
      const b = new Button(this, {
        x: 896 + i * 83, y: 32, w: 78, h: 30, label: t.label, fontSize: 13,
        onClick: () => { this.game_.sfx.click(); this.selectTab(t.id); },
      });
      this.tabButtons.push(b);
    });
    for (let i = 0; i < 3; i++) {
      const b = new Button(this, { x: 928 + i * 133, y: 106, w: 124, h: 86, label: '', sub: '', onClick: () => {} });
      this.hookTooltip(b);
      this.actionButtons.push(b);
    }
  }

  private buildTooltip(): void {
    this.tooltipBg = this.add.graphics();
    this.tooltipText = this.add.text(12, 10, '', { ...textStyle(14), wordWrap: { width: 300 }, lineSpacing: 4 });
    this.tooltip = this.add.container(0, 0, [this.tooltipBg, this.tooltipText]).setDepth(40).setVisible(false);
  }

  private hookTooltip(b: Button): void {
    b.on('hover', (on: boolean) => {
      if (on) this.tooltipOwner = b;
      else if (this.tooltipOwner === b) this.tooltipOwner = null;
    });
    b.on('denied', () => {
      this.game_.sfx.deny();
      const tip = b.tooltip?.() ?? '';
      const reason = tip.split('\n').find((l) => l.startsWith('⚠'));
      if (reason) this.showToast(reason.replace('⚠ ', ''));
    });
  }

  private buildSpecialButton(): void {
    this.specialGfx = this.add.graphics();
    this.specialText = this.add.text(1200, 640, '', { ...textStyle(15), align: 'center' }).setOrigin(0.5);
    this.specialZone = this.add.zone(1200, 640, 104, 104).setInteractive({ useHandCursor: true });
    this.specialZone.on('pointerdown', () => this.command((w) => w.useSpecial(0)));
    this.specialZone.on('pointerover', () => { this.specialHover = true; });
    this.specialZone.on('pointerout', () => { this.specialHover = false; });
  }

  private buildSystemButtons(): void {
    this.panel(10, 664, 220, 48);
    this.pauseBtn = new Button(this, { x: 50, y: 688, w: 64, h: 34, label: 'II  P', fontSize: 13, onClick: () => this.game_.togglePause() });
    this.speedBtn = new Button(this, { x: 120, y: 688, w: 64, h: 34, label: '1x  F', fontSize: 13, onClick: () => this.game_.toggleSpeed() });
    this.muteBtn = new Button(this, { x: 190, y: 688, w: 64, h: 34, label: '소리 M', fontSize: 13, onClick: () => this.game_.toggleMute() });
  }

  private buildMinimap(): void {
    this.panel(400, 672, 480, 36);
    this.minimap = this.add.graphics();
    const zone = this.add.zone(640, 690, 480, 40).setInteractive({ useHandCursor: true });
    const jump = (p: Phaser.Input.Pointer) => {
      const t = Phaser.Math.Clamp((p.x - 410) / 460, 0, 1);
      this.game_.centerCameraOn(t * BALANCE.world.width);
    };
    zone.on('pointerdown', jump);
    zone.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown) jump(p); });
  }

  private buildPauseLayer(): void {
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.55).setInteractive();
    const title = this.add.text(640, 280, '일시정지', textStyle(56)).setOrigin(0.5);
    const resume = new Button(this, { x: 640, y: 380, w: 220, h: 56, label: '계속하기 (P)', fontSize: 18, onClick: () => this.game_.togglePause() });
    const menu = new Button(this, { x: 640, y: 452, w: 220, h: 56, label: '메뉴로', fontSize: 18, onClick: () => this.game_.quitToMenu() });
    this.pauseLayer = this.add.container(0, 0, [shade, title, resume, menu]).setDepth(100).setVisible(false);
  }

  private bindKeys(): void {
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.code) {
        case 'Digit1': case 'Numpad1': this.onDigit(0); break;
        case 'Digit2': case 'Numpad2': this.onDigit(1); break;
        case 'Digit3': case 'Numpad3': this.onDigit(2); break;
        case 'Space': e.preventDefault(); this.command((w) => w.useSpecial(0)); break;
        case 'KeyE': this.command((w) => w.evolve(0)); break;
        case 'KeyP': case 'Escape': this.game_.togglePause(); break;
        case 'KeyF': this.game_.toggleSpeed(); break;
        case 'KeyM': this.game_.toggleMute(); break;
        default: break;
      }
    });
  }

  /** 1/2/3: 기본은 유닛 생산. 포탑/판매 탭이 열려 있으면 해당 탭의 버튼 */
  private onDigit(i: number): void {
    if (this.tab === 'turrets' || this.tab === 'sell') {
      const b = this.actionButtons[i];
      if (b.visible && b.enabled) b.onClick();
      else this.game_.sfx.deny();
      return;
    }
    this.command((w) => w.train(0, UNIT_ROLES[i]));
  }

  // ───────────────────────── 동작 ─────────────────────────

  private command(fn: (w: GameScene['world']) => CommandResult): void {
    if (this.game_.paused) return;
    const r = this.game_.command(fn);
    if (!r.ok) this.showToast(r.reason);
  }

  private showToast(msg: string): void {
    this.toast.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 900, duration: 400 });
  }

  private selectTab(tab: Tab): void {
    this.tab = tab;
    TABS.forEach((t, i) => this.tabButtons[i].setSelected(t.id === tab));
    this.configureActions();
  }

  /** 탭/시대가 바뀔 때 액션 버튼 구성 */
  private configureActions(): void {
    const era = this.game_.world.side(0).era;
    const [a, b, c] = this.actionButtons;
    for (const btn of this.actionButtons) {
      btn.setVisible(true).setIcon(null).setGlow(false);
      btn.label.setY(-9);
    }
    switch (this.tab) {
      case 'units':
        UNIT_ROLES.forEach((role, i) => {
          const btn = this.actionButtons[i];
          const s = getUnitStats(role, era);
          btn.setTexts(`${i + 1}. ${ERAS[era].units[role].name}`, `${fmt(s.cost)}G`, UI.gold);
          this.applyIcon(btn, `icon_unit_${era}_${role}`);
          btn.onClick = () => this.command((w) => w.train(0, role));
          btn.tooltip = () => this.unitTooltip(role);
        });
        break;
      case 'turrets':
        TURRET_TIERS.forEach((tier, i) => {
          const btn = this.actionButtons[i];
          const s = getTurretStats(tier, era);
          btn.setTexts(ERAS[era].turrets[tier].name, `${fmt(s.cost)}G`, UI.gold);
          this.applyIcon(btn, `icon_turret_${era}_${tier}`);
          btn.onClick = () => this.command((w) => w.buyTurret(0, tier));
          btn.tooltip = () => this.turretTooltip(tier);
        });
        break;
      case 'slots':
        a.onClick = () => this.command((w) => w.unlockSlot(0));
        a.tooltip = () => this.slotTooltip();
        b.setVisible(false);
        c.setVisible(false);
        break;
      case 'sell':
        for (let i = 0; i < 3; i++) {
          const btn = this.actionButtons[i];
          btn.onClick = () => this.command((w) => w.sellTurret(0, i));
          btn.tooltip = () => this.sellTooltip(i);
        }
        break;
      case 'evolve':
        a.onClick = () => this.command((w) => w.evolve(0));
        a.tooltip = () => this.evolveTooltip();
        b.setVisible(false);
        c.setVisible(false);
        break;
    }
    this.refreshActions();
  }

  private applyIcon(btn: Button, key: string): void {
    if (this.textures.exists(key)) {
      btn.setIcon(key, 0.62, 0, -14);
      btn.label.setY(22);
      btn.sub.setY(36);
    } else {
      btn.sub.setY(12);
    }
  }

  /** 매 프레임: 활성/비활성, 동적 텍스트 */
  private refreshActions(): void {
    const w = this.game_.world;
    const s = w.side(0);
    const era = s.era;
    switch (this.tab) {
      case 'units':
        UNIT_ROLES.forEach((role, i) => {
          const cost = getUnitStats(role, era).cost;
          this.actionButtons[i].setEnabled(s.gold >= cost && !s.queue.isFull);
        });
        break;
      case 'turrets': {
        const slot = w.firstEmptySlot(0);
        TURRET_TIERS.forEach((tier, i) => {
          this.actionButtons[i].setEnabled(slot >= 0 && s.gold >= getTurretStats(tier, era).cost);
        });
        break;
      }
      case 'slots': {
        const cost = w.nextSlotCost(0);
        const btn = this.actionButtons[0];
        if (cost === null) btn.setTexts('슬롯 모두 개방', `${s.unlockedSlots}/${BALANCE.turret.slotCount}`, UI.textDim);
        else btn.setTexts(`슬롯 ${s.unlockedSlots + 1} 해금`, `${fmt(cost)}G`, UI.gold);
        btn.setEnabled(cost !== null && s.gold >= cost);
        break;
      }
      case 'sell':
        for (let i = 0; i < 3; i++) {
          const btn = this.actionButtons[i];
          const t = s.turrets[i];
          if (i >= s.unlockedSlots) btn.setTexts(`슬롯 ${i + 1}`, '잠김', UI.textDim);
          else if (!t) btn.setTexts(`슬롯 ${i + 1}`, '비어 있음', UI.textDim);
          else btn.setTexts(`${i + 1}. ${ERAS[t.era].turrets[t.tier].name}`, `+${fmt(sellRefund(t.paid))}G`, UI.gold);
          btn.setEnabled(!!t);
        }
        break;
      case 'evolve': {
        const btn = this.actionButtons[0];
        const req = expRequired(era);
        if (req === null) btn.setTexts('최종 시대', ERAS[era].name, UI.textDim);
        else btn.setTexts(`→ ${ERAS[era + 1].name}`, `${fmt(s.exp)} / ${fmt(req)} EXP`, UI.exp);
        btn.setEnabled(w.canEvolve(0));
        btn.setGlow(w.canEvolve(0));
        break;
      }
    }
  }

  // ───────────────────────── 툴팁 ─────────────────────────

  private unitTooltip(role: UnitRole): string {
    const s = this.game_.world.side(0);
    const st = getUnitStats(role, s.era);
    const def = ERAS[s.era].units[role];
    const lines = [
      `${def.name} — ${def.desc}`,
      `비용 ${fmt(st.cost)}G · 생산 ${st.trainTime}s`,
      `HP ${fmt(st.hp)} · 공격 ${fmt(st.atk)} / ${st.cooldown}s`,
      `사거리 ${st.range} · 속도 ${st.speed}`,
    ];
    if (s.queue.isFull) lines.push('⚠ 대기열이 가득 찼습니다');
    else if (s.gold < st.cost) lines.push('⚠ 골드가 부족합니다');
    return lines.join('\n');
  }

  private turretTooltip(tier: TurretTier): string {
    const w = this.game_.world;
    const s = w.side(0);
    const st = getTurretStats(tier, s.era);
    const def = ERAS[s.era].turrets[tier];
    const lines = [
      `${def.name} — ${def.desc}`,
      `비용 ${fmt(st.cost)}G · 사거리 ${st.range}`,
      `DPS ${(st.damage / st.cooldown).toFixed(1)} (1발 ${fmt(st.damage)})`,
    ];
    if (st.splashRadius > 0) lines.push(`범위 반경 ${st.splashRadius}px`);
    lines.push('빈 슬롯에 설치됩니다');
    if (w.firstEmptySlot(0) < 0) lines.push('⚠ 빈 포탑 슬롯이 없습니다 (판매/슬롯 추가)');
    else if (s.gold < st.cost) lines.push('⚠ 골드가 부족합니다');
    return lines.join('\n');
  }

  private slotTooltip(): string {
    const w = this.game_.world;
    const cost = w.nextSlotCost(0);
    if (cost === null) return '모든 포탑 슬롯이 열려 있습니다';
    const lines = [`포탑 슬롯 ${w.side(0).unlockedSlots + 1}번 해금`, `비용 ${fmt(cost)}G`];
    if (w.side(0).gold < cost) lines.push('⚠ 골드가 부족합니다');
    return lines.join('\n');
  }

  private sellTooltip(i: number): string {
    const t = this.game_.world.side(0).turrets[i];
    if (!t) return `슬롯 ${i + 1}: 포탑 없음\n⚠ 판매할 포탑이 없습니다`;
    return `${ERAS[t.era].turrets[t.tier].name} 판매\n구매가 ${fmt(t.paid)}G → 환급 ${fmt(sellRefund(t.paid))}G (50%)`;
  }

  private evolveTooltip(): string {
    const s = this.game_.world.side(0);
    const req = expRequired(s.era);
    if (req === null) return '최종 시대에 도달했습니다';
    const lines = [
      `${ERAS[s.era + 1].name}로 진화`,
      `필요 EXP ${fmt(req)} (현재 ${fmt(s.exp)})`,
      `기지 최대 HP ${fmt(BALANCE.era.baseMaxHp[s.era])} → ${fmt(BALANCE.era.baseMaxHp[s.era + 1])}`,
      '새 유닛/포탑/특수기 해금',
    ];
    if (s.exp < req) lines.push('⚠ EXP가 부족합니다');
    return lines.join('\n');
  }

  // ───────────────────────── 업데이트 ─────────────────────────

  update(_t: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    const w = this.game_.world;
    if (!w) return;
    const s = w.side(0);

    if (s.era !== this.lastEra) {
      this.lastEra = s.era;
      this.configureActions();
    }

    this.eraText.setText(`${s.era + 1}시대 · ${ERAS[s.era].name}`);
    this.goldText.setText(fmt(s.gold));
    const req = expRequired(s.era);
    this.expText.setText(req === null ? `EXP ${fmt(s.exp)} (최종 시대)` : `EXP ${fmt(s.exp)} / ${fmt(req)}`);
    const prog = evolveProgress(s);
    const g = this.expBar;
    g.clear();
    g.fillStyle(0x0b0d14).fillRoundedRect(22, 98, 196, 14, 6);
    g.fillStyle(w.canEvolve(0) ? 0xffe066 : 0x4fc3f7).fillRoundedRect(24, 100, Math.max(4, 192 * prog), 10, 5);
    this.evolveBtn.setEnabled(w.canEvolve(0)).setGlow(w.canEvolve(0));
    if (s.era >= MAX_ERA) this.evolveBtn.setTexts('최종', 'MAX');

    this.refreshActions();
    for (const b of [...this.actionButtons, ...this.tabButtons, this.evolveBtn]) b.tick(dt);
    // 진화 탭 버튼도 반짝임
    this.tabButtons[4].setGlow(w.canEvolve(0)).tick(dt);

    this.drawQueue();
    this.drawSpecial();
    this.drawMinimap();
    this.updateTooltip();

    this.speedBtn.setTexts(`${this.game_.speed}x  F`);
    this.muteBtn.setTexts(this.game_.sfx.muted ? '음소거 M' : '소리 M');
    this.pauseBtn.setSelected(this.game_.paused);
    this.pauseLayer.setVisible(this.game_.paused);
  }

  private drawQueue(): void {
    const s = this.game_.world.side(0);
    const q = s.queue;
    const g = this.queueGfx;
    g.clear();
    for (let i = 0; i < q.maxSize; i++) {
      const cx = 480 + i * 80;
      g.fillStyle(0x0b0d14).fillRoundedRect(cx - 28, 34, 56, 52, 8);
      g.fillStyle(i === 0 && q.items[0] ? 0x3e4c78 : 0x2a3149).fillRoundedRect(cx - 25, 37, 50, 46, 6);
      const item = q.items[i];
      const icon = this.queueIcons[i];
      const label = this.queueLabels[i];
      if (item) {
        const key = `icon_unit_${item.era}_${item.role}`;
        if (this.textures.exists(key)) {
          if (icon.texture.key !== key) icon.setTexture(key);
          icon.setVisible(true).setScale(0.5);
          label.setText('');
        } else {
          icon.setVisible(false);
          label.setText(ERAS[item.era].units[item.role].name.slice(0, 3));
        }
      } else {
        icon.setVisible(false);
        label.setText('');
      }
    }
    g.fillStyle(0x0b0d14).fillRoundedRect(450, 90, 380, 10, 4);
    if (q.current) {
      const blocked = q.ratio >= 1;
      g.fillStyle(blocked ? 0xff9f43 : 0x7bed9f).fillRoundedRect(452, 92, 376 * q.ratio, 6, 3);
    }
    const cur = q.current;
    this.queueText.setText(cur ? (q.ratio >= 1 ? '스폰 대기 중' : `${ERAS[cur.era].units[cur.role].name} ${Math.floor(q.ratio * 100)}%`) : `${q.length}/${q.maxSize}`);
  }

  private drawSpecial(): void {
    const s = this.game_.world.side(0);
    const g = this.specialGfx;
    const cx = 1200;
    const cy = 640;
    const r = 46;
    const ready = s.specialCooldown <= 0;
    const t = this.time.now / 1000;
    g.clear();
    if (ready) g.fillStyle(0xffe066, 0.3 + 0.25 * Math.sin(t * 5)).fillCircle(cx, cy, r + 9);
    g.fillStyle(0x0b0d14).fillCircle(cx, cy + 3, r + 4);
    g.fillStyle(ready ? (this.specialHover ? 0xe8553b : 0xd8432b) : 0x3a3d47).fillCircle(cx, cy, r);
    if (!ready) {
      const frac = s.specialCooldown / BALANCE.special.cooldown;
      g.fillStyle(0x000000, 0.45);
      g.slice(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false).fillPath();
      g.lineStyle(4, 0xffe066).beginPath().arc(cx, cy, r - 2, -Math.PI / 2 + Math.PI * 2 * frac, Math.PI * 1.5, false).strokePath();
    }
    g.lineStyle(3, 0x0b0d14).strokeCircle(cx, cy, r);
    const name = ERAS[s.era].special.name;
    this.specialText.setText(ready ? `${name}\nSpace` : `${Math.ceil(s.specialCooldown)}s`);
  }

  private drawMinimap(): void {
    const w = this.game_.world;
    const g = this.minimap;
    const x0 = 410;
    const W = 460;
    const sx = (x: number) => x0 + (x / BALANCE.world.width) * W;
    g.clear();
    g.fillStyle(0x3b3322).fillRect(x0, 686, W, 8);
    g.fillStyle(0x4f8cff).fillRect(sx(w.side(0).base.x) - 6, 680, 12, 16);
    g.fillStyle(0xff5b5b).fillRect(sx(w.side(1).base.x) - 6, 680, 12, 16);
    for (const u of w.units) {
      g.fillStyle(u.side === 0 ? 0x9cc2ff : 0xff9c9c).fillRect(sx(u.x) - 1.5, u.role === 'heavy' ? 682 : 684, 3, u.role === 'heavy' ? 10 : 6);
    }
    const cam = this.game_.cameras.main;
    g.lineStyle(2, 0xffffff, 0.9).strokeRect(sx(cam.scrollX), 677, (cam.width / BALANCE.world.width) * W, 22);
  }

  private updateTooltip(): void {
    const b = this.tooltipOwner;
    if (!b || !b.visible || !b.tooltip) {
      this.tooltip.setVisible(false);
      return;
    }
    const text = b.tooltip();
    if (this.tooltipText.text !== text) this.tooltipText.setText(text);
    const tw = this.tooltipText.width + 24;
    const th = this.tooltipText.height + 20;
    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(0x0b0d14, 0.95).fillRoundedRect(0, 0, tw, th, 8);
    this.tooltipBg.lineStyle(2, UI.selected, 0.8).strokeRoundedRect(0, 0, tw, th, 8);
    const m = b.getWorldTransformMatrix();
    const x = Phaser.Math.Clamp(m.tx - tw / 2, 8, 1280 - tw - 8);
    const y = m.ty + b.h / 2 + 10;
    this.tooltip.setPosition(x, y).setVisible(true);
  }
}
