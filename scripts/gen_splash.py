"""Genera las imágenes que no vienen dibujadas a mano, a partir de app/assets/icon-only.png:

- app/assets/splash.png y splash-dark.png: la pantalla de inicio, con el logo al centro
  sobre el color de fondo de la app (`--color-ground` en app/src/index.css). La app tiene un
  solo tema, oscuro, así que las dos son iguales.
- app/public/favicon.png y admin/public/favicon.png: el favicon de la web de desarrollo y
  del panel de carga.

Con `--android-layers`, en cambio, corrige lo que @capacitor/assets deja mal en el ícono
adaptativo de Android: genera las capas a 48 dp y les agrega un margen de 16,7 %, pero en
app/assets/icon-foreground.png el logo ya ocupa la zona visible de 72 dp. Este paso vuelve a
escribir las dos capas a 108 dp, a resolución completa, y saca el margen.

Todo junto, en orden: `pnpm gen:assets` (necesita Pillow).
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "app" / "assets"

# El mismo color que `--color-ground`, `GROUND` (capacitor.config.ts) y `ground` (colors.xml).
GROUND = (0x0A, 0x0F, 0x1C)
SPLASH_SIZE = 2732
# El logo ocupa el 30 % del lado: entra entero en un teléfono vertical, que recorta los costados.
LOGO_SIZE = 820
# Esquinas redondeadas, para que el cuadrado no corte contra el fondo oscuro.
CORNER_RADIUS = round(LOGO_SIZE * 0.2)
FAVICON_SIZE = 192


def rounded(logo: Image.Image, size: int, radius: int) -> Image.Image:
    resized = logo.convert("RGBA").resize((size, size), Image.LANCZOS)
    # La máscara se dibuja al cuádruple y se achica: bordes suaves.
    big = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius * 4, fill=255)
    resized.putalpha(big.resize((size, size), Image.LANCZOS))
    return resized


RES = ROOT / "app" / "android" / "app" / "src" / "main" / "res"
# Una capa del ícono adaptativo mide 108 dp.
LAYER_PX = {"ldpi": 81, "mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<!-- Generado por scripts/gen_splash.py: sin margen extra, porque en
     app/assets/icon-foreground.png el logo ya ocupa la zona visible de 72 dp. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
"""


def android_layers() -> None:
    for layer in ("foreground", "background"):
        source = Image.open(ASSETS / f"icon-{layer}.png")
        for density, size in LAYER_PX.items():
            target = RES / f"mipmap-{density}" / f"ic_launcher_{layer}.png"
            if target.parent.is_dir():
                source.resize((size, size), Image.LANCZOS).save(target, optimize=True)
    for name in ("ic_launcher", "ic_launcher_round"):
        (RES / "mipmap-anydpi-v26" / f"{name}.xml").write_bytes(ADAPTIVE_XML.encode("utf-8"))
    print("gen_splash: capas del ícono adaptativo de Android a 108 dp, sin margen extra.")


def main() -> None:
    if "--android-layers" in sys.argv:
        android_layers()
        return

    logo = Image.open(ASSETS / "icon-only.png")

    splash = Image.new("RGB", (SPLASH_SIZE, SPLASH_SIZE), GROUND)
    mark = rounded(logo, LOGO_SIZE, CORNER_RADIUS)
    offset = (SPLASH_SIZE - LOGO_SIZE) // 2
    splash.paste(mark, (offset, offset), mark)
    for name in ("splash.png", "splash-dark.png"):
        splash.save(ASSETS / name, optimize=True)

    favicon = rounded(logo, FAVICON_SIZE, round(FAVICON_SIZE * 0.2))
    for app in ("app", "admin"):
        public = ROOT / app / "public"
        public.mkdir(exist_ok=True)
        favicon.save(public / "favicon.png", optimize=True)

    print("gen_splash: splash.png, splash-dark.png y favicon.png generados.")


if __name__ == "__main__":
    main()
