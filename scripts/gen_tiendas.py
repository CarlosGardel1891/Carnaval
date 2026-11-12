"""Genera los gráficos de las fichas de las tiendas a partir del logo (decisión 54):

    pnpm gen:tiendas        # necesita Python 3 + Pillow

- tiendas/graficos/play-icono-512.png           ícono de Google Play: 512x512, PNG de 32 bits
- tiendas/graficos/play-destacado-1024x500.png  gráfico destacado: 1024x500, PNG sin transparencia

El ícono del App Store no se sube aparte: sale del proyecto de Xcode. Las capturas se sacan a
mano de la app (ver docs/QA.md).
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "app" / "assets" / "icon-only.png"
OUT = ROOT / "tiendas" / "graficos"

GROUND = (10, 15, 28)  # --color-ground
ACCENT = (251, 191, 36)  # --color-accent
INK = (248, 250, 252)  # --color-ink
SOFT = (203, 213, 225)  # --color-soft

# La primera que exista: Windows, macOS y Linux.
BOLD_FONTS = [
    "C:/Windows/Fonts/segoeuib.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
REGULAR_FONTS = [
    "C:/Windows/Fonts/segoeui.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    raise SystemExit("gen_tiendas: no se encontró una tipografía del sistema para el gráfico destacado.")


def play_icon() -> None:
    icon = Image.open(LOGO).convert("RGBA").resize((512, 512), Image.LANCZOS)
    icon.save(OUT / "play-icono-512.png", optimize=True)


def feature_graphic() -> None:
    width, height = 1024, 500
    canvas = Image.new("RGB", (width, height), GROUND)

    logo_size = 300
    logo = Image.open(LOGO).convert("RGBA").resize((logo_size, logo_size), Image.LANCZOS)
    # Esquinas redondeadas, como se ve el ícono en el teléfono.
    mask = Image.new("L", (logo_size, logo_size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, logo_size, logo_size), radius=66, fill=255)
    left = 84
    canvas.paste(logo, (left, (height - logo_size) // 2), mask)

    draw = ImageDraw.Draw(canvas)
    text_left = left + logo_size + 56
    draw.text((text_left, 150), "CARNAVALERO", font=font(BOLD_FONTS, 66), fill=ACCENT)
    draw.text((text_left, 244), "Carnaval de Montevideo", font=font(BOLD_FONTS, 40), fill=INK)
    draw.text((text_left, 308), "Hoy · Cerca mío · Llamadas", font=font(REGULAR_FONTS, 32), fill=SOFT)
    canvas.save(OUT / "play-destacado-1024x500.png", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    play_icon()
    feature_graphic()
    for path in sorted(OUT.glob("play-*.png")):
        with Image.open(path) as image:
            print(f"  {path.relative_to(ROOT)}: {image.width}x{image.height} {image.mode}")


if __name__ == "__main__":
    main()
