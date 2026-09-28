"""
컨셉아트(art/unit-concepts.webp)에서 15개 유닛 스프라이트를 잘라 게임용으로 저장한다.

실행: python3 scripts/extract-units.py   (pillow, numpy, scipy 필요)
출력:
  src/assets/units/u{시대}_{역할}.webp   (게임 표시 크기의 2배 해상도, 투명 배경)
  src/render/unitSprites.ts               (크기·기준점·총구 위치 매니페스트)

- 이웃 유닛과 붙어 있는 영역은 다각형으로 나눈다.
- 대포 연기/불꽃, 메크·레이저 총구 섬광은 잘라낸다(발사 연출은 게임 이펙트로).
- 바닥 그림자(반투명 회색)는 제거한다(게임이 자체 그림자를 그림).
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "unit-concepts.webp"
OUT_DIR = ROOT / "src" / "assets" / "units"
MANIFEST = ROOT / "src" / "render" / "unitSprites.ts"

# 원본에서 보병 키가 약 270px → 게임 표시 크기 배율
INFANTRY_SCALE = 0.27
HEAVY_SCALE = 0.31
TEX_RES = 2  # 텍스처는 표시 크기의 2배로 저장

img = Image.open(SRC).convert("RGBA")
W, H = img.size
rgba = np.array(img)
alpha = rgba[..., 3]
labels, _ = ndimage.label(alpha > 40)


def comp_mask(bbox):
    """bbox(y0, y1, x0, x1)와 정확히 일치하는 연결 성분 마스크"""
    y0, y1, x0, x1 = bbox
    sub = labels[y0:y1, x0:x1]
    ids, counts = np.unique(sub[sub > 0], return_counts=True)
    cid = ids[np.argmax(counts)]
    return labels == cid


def poly_mask(points):
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon(points, fill=255)
    return np.array(m) > 0


def rect(x0, y0, x1, y1):
    return poly_mask([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


# 붙어 있는 덩어리들
MAMMOTH_BLOB = comp_mask((69, 418, 326, 742))
ANCIENT_BLOB = comp_mask((187, 416, 734, 1151))
MEDIEVAL_BLOB = comp_mask((73, 416, 1137, 1667))

TUSK = poly_mask([(540, 230), (620, 245), (645, 300), (642, 330), (625, 360), (590, 375), (540, 380)])
BLADE = poly_mask([(1228, 362), (1300, 258), (1320, 268), (1248, 372)])
SWORDSMAN = rect(1130, 60, 1268, 420) | BLADE
CROSSBOW = poly_mask([(1368, 292), (1450, 305), (1450, 332), (1368, 336)])
CROSSBOWMAN = (rect(1268, 60, 1380, 292) | rect(1268, 292, 1376, 420) | CROSSBOW) & ~SWORDSMAN
CANNON = poly_mask([(308, 540), (640, 540), (640, 648), (702, 648), (702, 735), (765, 735), (765, 830), (308, 830)])

HSV = np.array(img.convert("RGB").convert("HSV")).astype(int)
SAT, VAL = HSV[..., 1], HSV[..., 2]
R, G, B = (rgba[..., i].astype(int) for i in range(3))
# 상아는 크림/갈색/검정 외곽선 → 채도 높은 파랑·금색은 창병의 방패·망토
HUE = HSV[..., 0]
BLUE = (HUE > 130) & (HUE < 190) & (SAT > 80)
GOLD = (HUE > 18) & (HUE < 45) & (SAT > 150) & (VAL > 120)
TUSK_ONLY = TUSK & ~BLUE & ~GOLD
# 궁수의 화살 끝이 전차병 망토 앞까지 나와 있음 → 파란색이 아닌 픽셀은 궁수
ARROW_TIP = rect(862, 255, 898, 285) & ~BLUE
# 대포 연기(탁한 회갈색)·불꽃(주황) 제거
SMOKE_FIRE = (rect(640, 540, 860, 830) & (((SAT < 60) & (VAL > 95)) | ((R > 190) & (B < 130) & (R - B > 90) & (VAL > 180)))) \
    | (rect(690, 690, 780, 762) & ((alpha < 250) | ((SAT < 60) & (VAL > 140)))) \
    | (rect(697, 630, 720, 715) & (((VAL > 235) & (SAT < 120)) | ((HUE < 25) & (SAT > 150) & (VAL > 200))))
# 메크 포구 섬광(밝은 청록)
MECH_FLASH = rect(1670, 600, 1774, 760) & (B > 190) & (R < 170)

UNITS = {
    # key: (마스크, 중장 여부, 공격 방식)
    "u0_melee": (comp_mask((143, 415, 8, 186)), False),
    "u0_ranged": (comp_mask((200, 415, 179, 328)), False),
    "u0_heavy": (MAMMOTH_BLOB & (rect(0, 0, 586, 420) | TUSK_ONLY), True),
    "u1_melee": (MAMMOTH_BLOB & rect(586, 0, 728, 420) & ~TUSK_ONLY, False),
    "u1_ranged": (ANCIENT_BLOB & (rect(700, 0, 866, 420) | ARROW_TIP), False),
    "u1_heavy": (ANCIENT_BLOB & rect(866, 0, 1160, 420) & ~ARROW_TIP, True),
    "u2_melee": (MEDIEVAL_BLOB & SWORDSMAN, False),
    "u2_ranged": (MEDIEVAL_BLOB & CROSSBOWMAN, False),
    "u2_heavy": (MEDIEVAL_BLOB & ~SWORDSMAN & ~CROSSBOWMAN, True),
    "u3_melee": (comp_mask((226, 415, 1594, 1774)), False),
    "u3_ranged": (comp_mask((627, 819, 45, 342)), False),
    "u3_heavy": (comp_mask((554, 821, 308, 857)) & CANNON & ~SMOKE_FIRE, True),
    "u4_melee": (comp_mask((611, 819, 858, 1121)), False),
    "u4_ranged": (comp_mask((634, 819, 1126, 1443)) & rect(1100, 400, 1392, 830), False),
    "u4_heavy": (comp_mask((482, 822, 1397, 1774)) & rect(1380, 400, 1705, 830) & ~MECH_FLASH, True),
}

# 팽창 후에도 제외할 영역(이웃 유닛 조각, 연기, 섬광)
EXCLUDE = {
    "u0_heavy": rect(586, 0, 800, 420) & ~TUSK_ONLY,
    "u1_melee": TUSK_ONLY | rect(0, 0, 586, 420),
    "u1_heavy": ARROW_TIP | rect(0, 0, 866, 420),
    "u2_melee": rect(1268, 0, 1500, 420) & ~BLADE,
    "u2_ranged": SWORDSMAN,
    "u3_heavy": SMOKE_FIRE,
    "u4_heavy": MECH_FLASH | rect(1705, 0, 1774, 887),
}

OUT_DIR.mkdir(parents=True, exist_ok=True)
manifest = {}

for key, (mask, heavy) in UNITS.items():
    # 성분에 딸린 반투명 가장자리(안티앨리어싱)까지 포함하도록 살짝 팽창
    mask = ndimage.binary_dilation(mask, iterations=2) & (alpha > 0) & ~EXCLUDE.get(key, np.zeros_like(mask))
    px = rgba.copy()
    px[~mask] = 0
    ys, xs = np.nonzero(px[..., 3] > 0)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = px[y0:y1, x0:x1].copy()
    h = crop.shape[0]

    # 바닥 그림자 제거: 아래쪽 12% 영역의 반투명·무채색 픽셀
    band = int(h * 0.12)
    sub = crop[h - band :].astype(int)
    rgb = sub[..., :3]
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    shadow = (sub[..., 3] < 235) & (sat < 30)
    crop[h - band :][shadow] = 0

    # 떨어진 작은 조각(이웃 유닛 파편, 연기 부스러기) 제거: 가장 큰 덩어리의 2% 미만
    lab2, n2 = ndimage.label(crop[..., 3] > 30)
    if n2 > 1:
        sizes = ndimage.sum(np.ones_like(lab2), lab2, index=range(1, n2 + 1))
        keep = np.isin(lab2, [i + 1 for i, a in enumerate(sizes) if a >= sizes.max() * 0.02])
        crop[~keep & (lab2 > 0)] = 0
        crop[(lab2 == 0) & (crop[..., 3] <= 30)] = 0

    ys, xs = np.nonzero(crop[..., 3] > 30)
    x0c, x1c = xs.min(), xs.max() + 1
    y1c = ys.max() + 1
    crop = crop[:, x0c:x1c]
    crop = crop[:y1c]
    h, w = crop.shape[:2]

    # 기준점: 발(아래 25%) 픽셀들의 가로 무게중심
    feet = crop[int(h * 0.75) :, :, 3] > 60
    fy, fx = np.nonzero(feet)
    anchor_x = float(fx.mean()) if len(fx) else w / 2

    # 총구/무기 끝: 몸통 높이 20~65% 구간에서 가장 오른쪽 불투명 픽셀
    rows = crop[int(h * 0.2) : int(h * 0.65), :, 3] > 60
    ry, rx = np.nonzero(rows)
    i = int(np.argmax(rx))
    muzzle_x, muzzle_y = float(rx[i]), float(ry[i] + int(h * 0.2))

    scale = (HEAVY_SCALE if heavy else INFANTRY_SCALE) * TEX_RES
    tw, th = max(1, round(w * scale)), max(1, round(h * scale))
    out = Image.fromarray(crop).resize((tw, th), Image.LANCZOS)
    out.save(OUT_DIR / f"{key}.webp", "WEBP", quality=92, method=6)

    s = tw / w  # 원본 → 텍스처 배율
    manifest[key] = {
        "w": tw,
        "h": th,
        "anchorX": round(anchor_x * s, 1),
        "muzzleX": round(muzzle_x * s, 1),
        "muzzleY": round(muzzle_y * s, 1),
    }
    print(f"{key}: {tw}x{th}  anchor={manifest[key]['anchorX']}  muzzle=({manifest[key]['muzzleX']},{manifest[key]['muzzleY']})")

lines = [
    "// 자동 생성: scripts/extract-units.py — 직접 수정하지 말 것",
    "/** 유닛 스프라이트 매니페스트 (텍스처 픽셀 기준, 텍스처는 표시 크기의 RES배) */",
    f"export const UNIT_SPRITE_RES = {TEX_RES};",
    "export interface UnitSpriteInfo { w: number; h: number; anchorX: number; muzzleX: number; muzzleY: number }",
    "export const UNIT_SPRITES: Record<string, UnitSpriteInfo> = " + json.dumps(manifest, indent=2) + ";",
    "",
]
MANIFEST.write_text("\n".join(lines), encoding="utf-8")
print("manifest ->", MANIFEST)
