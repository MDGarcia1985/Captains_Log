"""Produce portable static HUD fonts without retaining Orbitron's Reserved Font Name.

File: prepare-hud-fonts.py
Author: Codex; Contact: michael@mandedesign.studio
License: SPDX-License-Identifier: MPL-2.0 (script); fonts retain SIL OFL 1.1.
Decision: DEV-2026-09-07-025. Requires fonttools; run from the repository root.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


def prepare(weight: int, style: str) -> None:
    """Freeze one weight, rename derivative metadata, and save bundled font bytes."""
    font = TTFont("assets/fonts/Orbitron.ttf")
    instantiateVariableFont(font, {"wght": weight}, inplace=True)
    family = "Captains HUD Display"
    names = {
        1: family, 2: style, 3: f"CaptainsHUDDisplay-{style}-20260907",
        4: f"{family} {style}", 6: f"CaptainsHUDDisplay-{style}",
        16: family, 17: style, 21: family, 22: style,
    }
    for record in font["name"].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    target = Path(f"assets/fonts/CaptainsHUDDisplay-{style}.ttf")
    font.save(target)
    assert "fvar" not in font
    assert font["OS/2"].usWeightClass == weight
    print(f"PASS {target}: static {weight}, renamed derivative; outlines unchanged")


prepare(500, "Medium")
prepare(600, "SemiBold")
