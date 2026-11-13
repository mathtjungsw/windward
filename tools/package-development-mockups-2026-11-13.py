"""Create a contact sheet and package the rendered development mockups."""

from pathlib import Path
import json
import zipfile

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "design-previews/2026-11-13-scenarios-navigation-tax"
manifest = json.loads((FOLDER / "manifest.json").read_text(encoding="utf-8"))
screens = [row for row in manifest["screenshots"] if row["device"] == "desktop"]
font = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 23)
title_font = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 36)
sheet = Image.new("RGB", (1840, 1340), "#f2efe3")
draw = ImageDraw.Draw(sheet)
draw.text((38, 24), "바람의 항로 · 상세계획 화면 시안", font=title_font, fill="#294b4d")
draw.text((40, 80), "기능별 12개 화면 · PC와 모바일 각각 제작 · 수치와 위치는 초안", font=font, fill="#60776d")

for index, row in enumerate(screens):
    x = 36 + index % 4 * 449
    y = 136 + index // 4 * 396
    draw.text((x, y), row["title"], font=font, fill="#315b5d")
    with Image.open(FOLDER / row["file"]) as source:
        source.thumbnail((425, 340), Image.Resampling.LANCZOS)
        sheet.paste(source, (x, y + 43))

sheet.save(FOLDER / "overview.jpg", quality=94, subsampling=0)
with zipfile.ZipFile(FOLDER / "windward-mockups-2026-11-13.zip", "w", zipfile.ZIP_DEFLATED) as archive:
    for row in manifest["screenshots"]:
        archive.write(FOLDER / row["file"], row["file"])
    for name in ("index.html", "overview.jpg", "manifest.json", "README.md"):
        archive.write(FOLDER / name, name)

print(json.dumps({"screenshots": len(manifest["screenshots"]), "archive": str(FOLDER / "windward-mockups-2026-11-13.zip")}, ensure_ascii=False))
