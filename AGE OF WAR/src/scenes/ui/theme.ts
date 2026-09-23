/** UI 공통 색/폰트 */
export const UI = {
  font: '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  panel: 0x1d2130,
  panelEdge: 0x0b0d14,
  button: 0x2f3a5c,
  buttonHover: 0x3e4c78,
  buttonDown: 0x25304d,
  buttonDisabled: 0x3a3d47,
  selected: 0xf2b134,
  gold: '#ffd84a',
  exp: '#8fe3ff',
  text: '#ffffff',
  textDim: '#a9b0c4',
  danger: '#ff6b6b',
  outline: 0x0b0d14,
};

export function textStyle(size: number, color = UI.text, bold = true): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: UI.font,
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal',
    stroke: '#0b0d14',
    strokeThickness: Math.max(2, Math.round(size / 6)),
  };
}
