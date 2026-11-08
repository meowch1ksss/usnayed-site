"""Конвертация фотографий сайта в WebP.

Проходит по images/**, пережимает JPG/PNG в WebP (длинная сторона
не больше MAX_SIDE, качество QUALITY), сохраняет рядом с оригиналом
и пишет карту соответствия в tools/image-map.json.

Запуск: python tools/convert-images.py
"""

import json
import os
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "images")
MAP_PATH = os.path.join(ROOT, "tools", "image-map.json")

MAX_SIDE = 1200
QUALITY = 80
METHOD = 6

mapping = {}
total_before = 0
total_after = 0
converted = 0
skipped = 0

for dirpath, _dirnames, filenames in os.walk(SRC):
    for name in filenames:
        ext = os.path.splitext(name)[1].lower()
        if ext not in (".jpg", ".jpeg", ".png"):
            continue

        src_path = os.path.join(dirpath, name)
        rel = os.path.relpath(src_path, ROOT).replace("\\", "/")
        webp_rel = os.path.splitext(rel)[0] + ".webp"
        webp_path = os.path.join(ROOT, webp_rel)

        before = os.path.getsize(src_path)
        total_before += before

        try:
            with Image.open(src_path) as im:
                im = ImageOps.exif_transpose(im)
                has_alpha = im.mode in ("RGBA", "LA") or "transparency" in im.info
                im = im.convert("RGBA" if has_alpha else "RGB")

                w, h = im.size
                scale = min(1.0, MAX_SIDE / max(w, h))
                if scale < 1.0:
                    im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)

                im.save(webp_path, "WEBP", quality=QUALITY, method=METHOD)
        except Exception as exc:  # noqa: BLE001
            print(f"ОШИБКА {rel}: {exc}")
            skipped += 1
            continue

        after = os.path.getsize(webp_path)
        total_after += after
        converted += 1

        with Image.open(webp_path) as out:
            ow, oh = out.size

        mapping[rel] = {
            "webp": webp_rel,
            "width": ow,
            "height": oh,
            "srcBytes": before,
            "webpBytes": after,
        }

os.makedirs(os.path.dirname(MAP_PATH), exist_ok=True)
with open(MAP_PATH, "w", encoding="utf-8") as fh:
    json.dump(mapping, fh, ensure_ascii=False, indent=2, sort_keys=True)

print(f"сконвертировано: {converted}, ошибок: {skipped}")
print(f"было: {total_before / 1024 / 1024:.1f} MB -> стало: {total_after / 1024 / 1024:.1f} MB")
if total_after:
    print(f"сжатие: x{total_before / total_after:.1f}")
