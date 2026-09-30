"""
배포용 단일 HTML 만들기: dist/(npm run build 결과)의 JS를 index.html 안에 넣어
play/index.html 한 파일로 만든다. 그림은 빌드 때 JS에 이미 들어 있다.
같은 파일을 저장소 루트의 docs/index.html 에도 복사한다(GitHub Pages 주소용).

실행: npm run build && python3 scripts/build-single.py
"""
import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "dist" / "index.html").read_text(encoding="utf-8")
js_path = glob.glob(str(ROOT / "dist" / "assets" / "index-*.js"))[0]
js = Path(js_path).read_text(encoding="utf-8").replace("</script", "<\\/script")
tag = re.search(r'<script type="module" crossorigin src="[^"]+"></script>', html).group(0)
out = html.replace(tag, "").replace("</body>", '  <script type="module">' + js + "</script>\n  </body>")
for dest in (ROOT / "play" / "index.html", ROOT.parent / "docs" / "index.html"):
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(out, encoding="utf-8")
    print(f"{dest} ({len(out) / 1e6:.1f} MB)")
# Jekyll 처리 없이 그대로 서비스
(ROOT.parent / "docs" / ".nojekyll").write_text("", encoding="utf-8")
