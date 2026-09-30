"""
메인 화면 시안(art/menu/main-mockup.webp, 1672×941)으로 메뉴 에셋을 만든다.

실행: python3 scripts/build-menu.py   (pillow, numpy, scipy, opencv-python-headless 필요)
출력: src/assets/menu/bg.webp (배경 전체) + 버튼별 잘라낸 그림(easy/normal/hard/story/sound.webp)

- 버튼은 시안에 그려진 크기·비율 그대로 잘라 쓴다(게임에서 같은 자리에 올려 클릭·호버 처리).
- 시안의 잘못된 글자(스토리 버튼 부제 '업적 강화', 하단 조작 안내)는 지우고, 게임이 바른 문구를 그린다.
"""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "menu" / "main-mockup.webp"
OUT = ROOT / "src" / "assets" / "menu"

# 시안 좌표(바깥 검은 테두리 포함) x0, y0, x1, y1, 모서리 반경
BUTTONS = {
    "easy": (284, 460, 651, 612, 24),
    "normal": (658, 460, 1017, 612, 24),
    "hard": (1033, 460, 1401, 612, 24),
    "story": (385, 630, 1289, 791, 28),
    "sound": (1441, 823, 1636, 899, 18),
}
# 지울 글자 띠: (x0, y0, x1, y1)
ERASE = {
    "help": (480, 824, 1195, 890),
    "story_sub": (590, 722, 1080, 766),
}


def erase_text(rgb, box):
    """띠 안의 글자(밝은 글자 + 검은 외곽선)를 주변 색으로 메운다"""
    x0, y0, x1, y1 = box
    sub = rgb[y0:y1, x0:x1].astype(int)
    luma = sub.mean(axis=2)
    sat = sub.max(axis=2) - sub.min(axis=2)
    bright = (luma > 150) | ((sub[..., 0] > 190) & (sub[..., 1] > 150) & (sat > 60))
    near = ndimage.binary_dilation(bright, iterations=10)
    dark = luma < 70
    mask = ndimage.binary_dilation(bright | (near & dark), iterations=3)
    m = np.zeros(rgb.shape[:2], np.uint8)
    m[y0:y1, x0:x1][mask] = 255
    return cv2.inpaint(np.ascontiguousarray(rgb), m, 9, cv2.INPAINT_TELEA)


def main():
    img = np.array(Image.open(SRC).convert("RGB"))
    for box in ERASE.values():
        img = erase_text(img, box)
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(img).save(OUT / "bg.webp", "WEBP", quality=88, method=6)

    layout = {"width": img.shape[1], "height": img.shape[0], "buttons": {}}
    for name, (x0, y0, x1, y1, r) in BUTTONS.items():
        crop = Image.fromarray(img[y0:y1, x0:x1]).convert("RGBA")
        mask = Image.new("L", crop.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, crop.width - 1, crop.height - 1), radius=r, fill=255)
        crop.putalpha(mask)
        crop.save(OUT / f"{name}.webp", "WEBP", quality=92, method=6)
        layout["buttons"][name] = {"x": (x0 + x1) / 2, "y": (y0 + y1) / 2, "w": x1 - x0, "h": y1 - y0}
    (OUT / "layout.json").write_text(json.dumps(layout, indent=2), encoding="utf-8")
    print(json.dumps(layout))


if __name__ == "__main__":
    main()
