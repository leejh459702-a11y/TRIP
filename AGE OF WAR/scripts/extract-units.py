"""
컨셉아트(art/unit-concepts.webp)에서 15개 유닛 스프라이트를 잘라 게임용으로 저장한다.

실행: python3 scripts/extract-units.py   (pillow, numpy, scipy, opencv-python-headless 필요)
출력:
  src/assets/units/u{시대}_{역할}.webp   (게임 표시 크기의 2배 해상도, 투명 배경)
  src/render/unitSprites.ts               (크기·기준점·총구 위치 매니페스트)

- 이웃 유닛과 붙어 있는 영역은 다각형으로 나눈다.
- 대포 연기/불꽃, 메크·레이저 총구 섬광은 잘라낸다(발사 연출은 게임 이펙트로).
- 바닥 그림자(반투명 회색)는 제거한다(게임이 자체 그림자를 그림).
- 다른 유닛에 가려져 비어 버린 부분(방패, 말 엉덩이, 망토, 포신 등)은
  주변 색으로 인페인팅하고 외곽선을 다시 그려 채운다(COMPLETE).
"""
import json
from pathlib import Path

import cv2
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


def ellipse_mask(cx, cy, rx, ry):
    yy, xx = np.mgrid[0:H, 0:W]
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1


# 붙어 있는 덩어리들
MAMMOTH_BLOB = comp_mask((69, 418, 326, 742))
ANCIENT_BLOB = comp_mask((187, 416, 734, 1151))
MEDIEVAL_BLOB = comp_mask((73, 416, 1137, 1667))

# 매머드 뒤쪽 상아의 오른쪽 외곽선(x≈640~644)을 따라간다. 그 바깥은 창병 방패
TUSK = poly_mask([(540, 230), (620, 245), (632, 275), (642, 298), (645, 318), (644, 335), (637, 352),
                  (622, 364), (600, 372), (540, 380)])
BLADE = poly_mask([(1228, 362), (1300, 258), (1320, 268), (1248, 372)])
SWORDSMAN = rect(1130, 60, 1268, 420) | BLADE
# 석궁 몸체 + 아래로 휜 활대
CROSSBOW_AREA = poly_mask([(1368, 292), (1450, 305), (1450, 322), (1426, 324), (1424, 334), (1416, 344), (1400, 350), (1368, 350)])
CANNON = poly_mask([(308, 540), (640, 540), (640, 648), (702, 648), (702, 735), (765, 735), (765, 830), (308, 830)])

HSV = np.array(img.convert("RGB").convert("HSV")).astype(int)
SAT, VAL = HSV[..., 1], HSV[..., 2]
R, G, B = (rgba[..., i].astype(int) for i in range(3))
# 상아는 크림/갈색/검정 외곽선 → 채도 높은 파랑·금색은 창병의 방패·망토
HUE = HSV[..., 0]
BLUE = (HUE > 130) & (HUE < 190) & (SAT > 80)
GOLD = (HUE > 18) & (HUE < 45) & (SAT > 150) & (VAL > 120)
TUSK_ONLY = TUSK & ~BLUE & ~GOLD
# 석궁 영역 안의 파랑·금색(마갑)·흰색(말 다리)은 기사 쪽
HORSE_COLOR = BLUE | GOLD | ((SAT < 50) & (VAL > 150) & rect(1383, 338, 1460, 360))
CROSSBOW = CROSSBOW_AREA & ~HORSE_COLOR
CROSSBOWMAN = (rect(1268, 60, 1380, 292) | rect(1268, 292, 1376, 420) | CROSSBOW) & ~SWORDSMAN
# 궁수의 화살 끝이 전차병 망토 앞까지 나와 있음 → 파란색이 아닌 픽셀은 궁수
ARROW_TIP = rect(862, 255, 898, 285) & ~BLUE
# 창병 방패(왼쪽 절반이 상아에 가려짐)
SHIELD = ellipse_mask(641, 338, 27, 42)
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
    "u0_heavy": (rect(586, 0, 800, 420) & ~TUSK_ONLY) | (rect(586, 0, 800, 420) & (BLUE | GOLD)),
    # 상아와 그 외곽선 부스러기
    "u1_melee": TUSK_ONLY | rect(0, 0, 586, 420) | rect(586, 240, 626, 356) | (SHIELD & rect(0, 0, 636, 420)),
    "u1_heavy": ARROW_TIP | rect(0, 0, 866, 420),
    "u2_melee": rect(1268, 0, 1500, 420) & ~BLADE,
    # 칼날 외곽선, 석궁 끝 위아래로 보이는 기사 마갑 외곽선
    "u2_ranged": SWORDSMAN | ndimage.binary_dilation(BLADE, iterations=6) | rect(1440, 280, 1460, 309) | rect(1426, 323, 1460, 360),
    "u3_heavy": SMOKE_FIRE,
    "u4_heavy": MECH_FLASH | rect(1705, 0, 1774, 887),
}

def unit_pixels(key):
    """원본 캔버스 크기의 유닛 RGBA (가려진 부분 복원 전)"""
    mask, _ = UNITS[key]
    # 성분에 딸린 반투명 가장자리(안티앨리어싱)까지 포함하도록 살짝 팽창
    mask = ndimage.binary_dilation(mask, iterations=2) & (alpha > 0) & ~EXCLUDE.get(key, np.zeros_like(mask))
    px = rgba.copy()
    px[~mask] = 0
    return px


OUTLINE = np.array([34, 26, 30])  # 원화 외곽선 색(짙은 갈보라)

# 가려진 부분 복원: key -> [(영역, 외곽선 두께, 채색 함수)]
#   영역 안에서 비어 있는 픽셀을 주변 색으로 인페인팅한다. 외곽선 두께>0이면 새로 생긴 바깥 가장자리에 외곽선을 그린다.
#   채색 함수(yy, xx, px) -> (rgb, 적용 여부): 넓은 영역은 무늬를 직접 그리거나 옮겨온다
def solid(color, shade=0.0, x_ref=0):
    """단색 천(망토 등). shade>0이면 x_ref에서 멀어질수록(왼쪽) 어둡게"""
    color = np.array(color, dtype=float)
    def painter(yy, xx, px):
        f = 1 - shade * np.clip((x_ref - xx) / 20, 0, 1) if shade else np.ones(len(xx))
        return (color[None, :] * f[:, None]).astype(np.uint8), np.ones(len(xx), bool)
    return painter


def shield_painter(cx, cy, rx, ry, rim):
    """둥근 방패: 파란 안쪽 + 금테"""
    blue = np.array([52, 104, 206])
    gold = np.array([214, 160, 62])
    def painter(yy, xx, px):
        r = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        inner = r < 1 - rim / rx
        col = np.where(inner[:, None], blue[None, :] * (1 - 0.25 * r)[:, None], gold[None, :])
        # 금테 안쪽 경계선
        line = (r >= 1 - rim / rx - 0.05) & (r < 1 - rim / rx)
        col[line] = OUTLINE
        return col.astype(np.uint8), np.ones(len(xx), bool)
    return painter


def copy_shift(dx, dy=0, min_y=0):
    """같은 유닛의 다른 부분 무늬를 (dx, dy)만큼 옮겨와 칠한다"""
    def painter(yy, xx, px):
        return px[yy + dy, xx + dx, :3], (px[yy + dy, xx + dx, 3] >= 200) & (yy >= min_y)
    return painter


COMPLETE = {
    # 창병: 상아에 가려진 방패 왼쪽과 그 뒤 망토
    "u1_melee": [
        (poly_mask([(630, 281), (614, 296), (603, 322), (596, 350), (590, 378), (606, 380), (620, 365), (630, 330)]), 3,
         solid((34, 72, 170), shade=0.3, x_ref=630)),
        (SHIELD, 3, shield_painter(641, 338, 27, 42, 6)),
    ],
    # 전차병: 궁수 화살·몸에 가려진 어깨 망토와 등 망토
    "u1_heavy": [
        (poly_mask([(882, 272), (898, 266), (900, 292), (878, 300), (872, 292)]), 3, solid((44, 86, 190))),
        (poly_mask([(870, 294), (861, 308), (857, 328), (861, 344), (870, 348)]), 3, solid((40, 80, 180), shade=0.25, x_ref=870)),
    ],
    # 기사: 석궁에 가려진 마갑, 석궁병 뒤로 숨은 말 엉덩이·뒷다리
    "u2_heavy": [
        (CROSSBOW_AREA & rect(1374, 280, 1460, 360), 0, copy_shift(100, min_y=301)),
        (poly_mask([(1377, 298), (1366, 304), (1358, 316), (1355, 334), (1358, 352), (1366, 366),
                    (1375, 378), (1378, 394), (1374, 404), (1375, 413), (1379, 413)]), 3, copy_shift(62)),
    ],
    # 대포: 연기 필터에 뚫린 포구 금테·포신
    "u3_heavy": [
        (poly_mask([(640, 662), (668, 654), (690, 648), (702, 652), (705, 708), (690, 713), (660, 712), (640, 706)]), 3, None),
    ],
}


def complete(key, px):
    """이웃 유닛에 가려져 비어 버린 영역을 채운다"""
    for region, outline, painter in COMPLETE.get(key, []):
        known = px[..., 3] >= 200
        hole = region & ~known
        if not hole.any():
            continue
        ys, xs = np.nonzero(region)
        pad = 12
        y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, H)
        x0, x1 = max(xs.min() - pad * 3, 0), min(xs.max() + pad * 3 + 1, W)
        sub = px[y0:y1, x0:x1]
        k, hl = known[y0:y1, x0:x1], hole[y0:y1, x0:x1]
        # 구멍에 맞닿은 짙은 외곽선(가린 물체의 윤곽)은 색 출처에서 빼고 함께 다시 칠한다
        dark = sub[..., :3].max(axis=2) < 80
        seam = k & dark & ndimage.binary_dilation(hl, iterations=5) & region[y0:y1, x0:x1]
        src = k & ~seam
        paint = hl | seam
        # 투명 픽셀 색을 가장 가까운 출처 픽셀 색으로 바꾼 뒤 구멍을 인페인팅
        _, (iy, ix) = ndimage.distance_transform_edt(~src, return_indices=True)
        rgb = np.ascontiguousarray(sub[..., :3][iy, ix])
        rgb = cv2.inpaint(rgb, paint.astype(np.uint8) * 255, 6, cv2.INPAINT_TELEA)
        out = sub.copy()
        out[paint, :3] = rgb[paint]
        out[hl, 3] = 255
        if painter is not None:
            py, pxs = np.nonzero(paint)
            full = px.copy()
            full[y0:y1, x0:x1] = out
            col, ok = painter(py + y0, pxs + x0, full)
            out[py[ok], pxs[ok], :3] = col[ok]
        if outline:
            filled = out[..., 3] >= 128
            edge = filled & ~ndimage.binary_erosion(filled, iterations=outline)
            e = edge & hl
            out[e, :3] = OUTLINE
            # 새 외곽선 바깥에 1px 반투명 테두리(안티앨리어싱)
            aa = ndimage.binary_dilation(e, iterations=1) & ~filled & ~k
            out[aa, :3] = OUTLINE
            out[aa, 3] = 110
        px[y0:y1, x0:x1] = out
    return px


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}

    for key, (_, heavy) in UNITS.items():
        px = complete(key, unit_pixels(key))
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


if __name__ == "__main__":
    main()
