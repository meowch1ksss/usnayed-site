"""Иконки сайта и OG-картинка из отрендеренного логотипа.

Запуск: python tools/make-assets.py
"""

import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, ".audit", "logo.png")
IMAGES = os.path.join(ROOT, "images")

BG = (16, 11, 28)
PURPLE = (168, 121, 255)
LIME = (183, 255, 112)
MUTED = (164, 154, 184)
SOFT = (201, 184, 230)

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_REG = "C:/Windows/Fonts/arial.ttf"


def fit(logo, box_w, box_h):
    """Вписывает логотип в рамку с сохранением пропорций."""
    w, h = logo.size
    scale = min(box_w / w, box_h / h)
    return logo.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def rounded_background(size, radius=36):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=BG + (255,))
    return img


def save_icon(size, path, padding_ratio=0.12, opaque=False):
    logo = Image.open(LOGO).convert("RGBA")
    inner = int(size * (1 - padding_ratio * 2))
    scaled = fit(logo, inner, inner)

    if opaque:
        canvas = rounded_background((size, size), radius=int(size * 0.22))
    else:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    canvas.alpha_composite(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    canvas.save(path)
    print("saved", os.path.relpath(path, ROOT), canvas.size)


def build_og(path):
    w, h = 1200, 630
    canvas = Image.new("RGB", (w, h), BG)

    # Фиолетовое свечение справа
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([w - 620, -240, w + 120, 500], fill=(124, 58, 237, 120))
    gdraw.ellipse([w - 420, 260, w + 40, 760], fill=(176, 44, 255, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), glow)

    draw = ImageDraw.Draw(canvas)

    # Логотип
    logo = fit(Image.open(LOGO).convert("RGBA"), 210, 280)
    canvas.alpha_composite(logo, (80, (h - logo.height) // 2 - 10))
    draw = ImageDraw.Draw(canvas)

    x = 340
    title_font = ImageFont.truetype(FONT_BOLD, 84)
    sub_font = ImageFont.truetype(FONT_REG, 34)
    small_font = ImageFont.truetype(FONT_REG, 24)

    # Заголовок с точкой акцента
    title = "У нас обед"
    draw.text((x, 176), title, font=title_font, fill=(246, 241, 255))
    title_w = draw.textlength(title, font=title_font)
    draw.ellipse([x + title_w + 8, 236, x + title_w + 26, 254], fill=LIME)

    # Подзаголовок с переносом по ширине
    text = "Домашние обеды с доставкой в офисы Ростова-на-Дону, Аксая и Батайска"
    max_w = w - x - 80
    lines, current = [], ""
    for word in text.split():
        probe = f"{current} {word}".strip()
        if draw.textlength(probe, font=sub_font) <= max_w:
            current = probe
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    y = 300
    for line in lines:
        draw.text((x, y), line, font=sub_font, fill=SOFT)
        y += 48

    draw.text((x, 520), "usnayed-site.pages.dev", font=small_font, fill=MUTED)
    draw.text((x + draw.textlength("usnayed-site.pages.dev", font=small_font) + 18, 520),
              "· заказ до 13:30", font=small_font, fill=MUTED)

    canvas.convert("RGB").save(path, quality=92, optimize=True)
    print("saved", os.path.relpath(path, ROOT), canvas.size)


os.makedirs(IMAGES, exist_ok=True)

save_icon(32, os.path.join(IMAGES, "favicon-32.png"))
save_icon(16, os.path.join(IMAGES, "favicon-16.png"), padding_ratio=0.06)
save_icon(180, os.path.join(IMAGES, "apple-touch-icon.png"), padding_ratio=0.18, opaque=True)
save_icon(512, os.path.join(IMAGES, "icon-512.png"), padding_ratio=0.18, opaque=True)

# favicon.ico — мультиразмерный, для старых браузеров и закладок
ico_logo = Image.open(LOGO).convert("RGBA")
ico_canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
scaled = fit(ico_logo, 232, 232)
ico_canvas.alpha_composite(scaled, ((256 - scaled.width) // 2, (256 - scaled.height) // 2))
ico_canvas.save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
print("saved favicon.ico")

build_og(os.path.join(IMAGES, "og-image.png"))
