import Phaser from 'phaser';
import { textStyle, UI } from './theme';

export interface ButtonOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  subColor?: string;
  fontSize?: number;
  tooltip?: () => string;
  onClick: () => void;
}

/** 둥근 사각형 버튼. 비활성/선택/반짝임 상태와 툴팁 지원 */
export class Button extends Phaser.GameObjects.Container {
  readonly bg: Phaser.GameObjects.Graphics;
  readonly label: Phaser.GameObjects.Text;
  readonly sub: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Image | null = null;
  enabled = true;
  selected = false;
  glow = false;
  private hover = false;
  private down = false;
  readonly w: number;
  readonly h: number;
  tooltip?: () => string;
  onClick: () => void;
  private glowT = 0;

  constructor(scene: Phaser.Scene, o: ButtonOptions) {
    super(scene, o.x, o.y);
    this.w = o.w;
    this.h = o.h;
    this.tooltip = o.tooltip;
    this.onClick = o.onClick;
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, o.sub ? -9 : 0, o.label, textStyle(o.fontSize ?? 15)).setOrigin(0.5);
    this.sub = scene.add.text(0, 12, o.sub ?? '', textStyle(13, o.subColor ?? UI.gold)).setOrigin(0.5);
    this.add([this.bg, this.label, this.sub]);
    this.setSize(o.w, o.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => { this.hover = true; this.redraw(); this.emit('hover', true); });
    this.on('pointerout', () => { this.hover = false; this.down = false; this.redraw(); this.emit('hover', false); });
    this.on('pointerdown', () => { this.down = true; this.redraw(); });
    this.on('pointerup', () => {
      const wasDown = this.down;
      this.down = false;
      this.redraw();
      if (wasDown) {
        if (this.enabled) this.onClick();
        else this.emit('denied');
      }
    });
    scene.add.existing(this);
    this.redraw();
  }

  setIcon(key: string | null, scale = 1, dx = 0, dy = 0): this {
    if (this.icon) this.icon.destroy();
    this.icon = null;
    if (key) {
      this.icon = this.scene.add.image(dx, dy, key).setScale(scale);
      this.addAt(this.icon, 1);
    }
    return this;
  }

  setEnabled(v: boolean): this {
    if (this.enabled !== v) {
      this.enabled = v;
      this.redraw();
    }
    return this;
  }

  setSelected(v: boolean): this {
    if (this.selected !== v) {
      this.selected = v;
      this.redraw();
    }
    return this;
  }

  setGlow(v: boolean): this {
    this.glow = v;
    return this;
  }

  setTexts(label: string, sub?: string, subColor?: string): this {
    if (this.label.text !== label) this.label.setText(label);
    if (sub !== undefined && this.sub.text !== sub) this.sub.setText(sub);
    if (subColor) this.sub.setColor(subColor);
    return this;
  }

  tick(dt: number): void {
    if (!this.glow) {
      if (this.glowT !== 0) { this.glowT = 0; this.redraw(); }
      return;
    }
    this.glowT += dt;
    this.redraw();
  }

  redraw(): void {
    const g = this.bg;
    const { w, h } = this;
    g.clear();
    let fill = UI.button;
    if (!this.enabled) fill = UI.buttonDisabled;
    else if (this.down) fill = UI.buttonDown;
    else if (this.hover) fill = UI.buttonHover;
    if (this.glow && this.enabled) {
      const a = 0.35 + 0.35 * Math.sin(this.glowT * 6);
      g.fillStyle(0xffe066, a).fillRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 12);
    }
    g.fillStyle(UI.outline).fillRoundedRect(-w / 2 - 3, -h / 2 - 3 + 3, w + 6, h + 6, 10);
    g.fillStyle(fill).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.fillStyle(0xffffff, this.enabled ? 0.12 : 0.05).fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.4, 6);
    g.lineStyle(this.selected ? 3 : 2, this.selected ? UI.selected : UI.outline).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    const a = this.enabled ? 1 : 0.5;
    this.label.setAlpha(a);
    this.sub.setAlpha(a);
    this.icon?.setAlpha(a);
  }
}
