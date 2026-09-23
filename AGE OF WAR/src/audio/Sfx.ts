/**
 * WebAudio 합성 효과음. 외부 사운드 파일 없이 오실레이터/노이즈로 생성한다.
 * 브라우저 정책상 첫 사용자 입력 이후에 AudioContext 가 활성화된다.
 */
type Wave = OscillatorType;

const MUTE_KEY = 'chrono-front:muted';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private last = new Map<string, number>();
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** 사용자 제스처 안에서 호출 */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* 저장 불가 환경 무시 */
    }
    return this.muted;
  }

  /** 같은 종류의 소리가 너무 자주 겹치지 않도록 제한 */
  private gate(key: string, minGapMs: number): boolean {
    if (!this.ctx || this.muted) return false;
    const now = performance.now();
    if (now - (this.last.get(key) ?? -1e9) < minGapMs) return false;
    this.last.set(key, now);
    return true;
  }

  private tone(freq: number, dur: number, type: Wave, vol: number, slideTo?: number, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number, type: BiquadFilterType = 'lowpass', delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  hit(): void {
    if (!this.gate('hit', 45)) return;
    this.noise(0.08, 0.25, 1800);
    this.tone(180 + Math.random() * 60, 0.07, 'square', 0.06, 90);
  }

  shoot(era = 0): void {
    if (!this.gate('shoot', 60)) return;
    if (era >= 4) this.tone(1400, 0.12, 'sawtooth', 0.05, 300);
    else if (era === 3) this.noise(0.12, 0.3, 2500, 'bandpass');
    else this.noise(0.06, 0.12, 4000, 'highpass');
  }

  death(): void {
    if (!this.gate('death', 80)) return;
    this.tone(320, 0.25, 'triangle', 0.1, 70);
  }

  gold(): void {
    if (!this.gate('gold', 70)) return;
    this.tone(1320, 0.07, 'square', 0.04);
    this.tone(1760, 0.1, 'square', 0.04, undefined, 0.06);
  }

  evolve(): void {
    if (!this.ctx || this.muted) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.12, undefined, i * 0.1));
    this.noise(0.8, 0.08, 6000, 'highpass', 0.3);
  }

  special(): void {
    if (!this.ctx || this.muted) return;
    this.tone(90, 0.9, 'sawtooth', 0.12, 40);
    this.tone(600, 0.6, 'sine', 0.06, 1200);
  }

  impact(): void {
    if (!this.gate('impact', 70)) return;
    this.noise(0.3, 0.35, 700);
    this.tone(70, 0.25, 'sine', 0.2, 35);
  }

  baseHit(): void {
    if (!this.gate('base', 160)) return;
    this.noise(0.15, 0.2, 500);
  }

  click(): void {
    if (!this.gate('click', 30)) return;
    this.tone(880, 0.05, 'square', 0.05, 660);
  }

  deny(): void {
    if (!this.gate('deny', 120)) return;
    this.tone(160, 0.14, 'square', 0.06, 120);
  }

  build(): void {
    if (!this.ctx || this.muted) return;
    this.noise(0.1, 0.2, 1200);
    this.tone(440, 0.1, 'square', 0.05, undefined, 0.05);
  }

  victory(win: boolean): void {
    if (!this.ctx || this.muted) return;
    const notes = win ? [523, 659, 784, 1047, 1319] : [440, 392, 349, 262];
    notes.forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.12, undefined, i * 0.16));
  }
}

/** 게임 전체에서 공유하는 인스턴스 */
export const sfx = new Sfx();
