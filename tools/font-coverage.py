#!/usr/bin/env python3
"""Compute cmap / GPOS / weight facts from the shipped font files. Never guess."""
from __future__ import annotations
from pathlib import Path
import json, sys
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
TAAMIM = list(range(0x0591, 0x05B0))  # 31
# Everyday niqqud + biblical marks the table reports (meteg, rafe, holam haser, qamats qatan, puncta).
NIQQUD = {
    0x05B0: "sheva", 0x05B1: "hataf segol", 0x05B2: "hataf patah", 0x05B3: "hataf qamats",
    0x05B4: "hiriq", 0x05B5: "tsere", 0x05B6: "segol", 0x05B7: "patah", 0x05B8: "qamats",
    0x05B9: "holam", 0x05BA: "holam haser for vav", 0x05BB: "qubuts", 0x05BC: "dagesh",
    0x05BD: "meteg", 0x05BF: "rafe", 0x05C1: "shin dot", 0x05C2: "sin dot",
    0x05C4: "upper dot", 0x05C5: "lower dot", 0x05C7: "qamats qatan",
}
PUNCT = {
    0x05BE: "maqaf", 0x05C0: "paseq", 0x05C3: "sof pasuq", 0x05C6: "nun hafukha",
    0x05F3: "geresh", 0x05F4: "gershayim",
}
MARKS_05B0_05C7 = list(range(0x05B0, 0x05C8))

# Faces actually delivered and used by the picker / CSS (including lazily loaded files).
FONTS = {
    "noto": [ROOT / "site/fonts/NotoSerifHebrew.woff2"],
    "ezra": [ROOT / "site/fonts/EzraSIL.woff2"],
    "frank": [ROOT / "site/fonts/FrankRuhlLibre.woff2"],
    "ashkenaz": [ROOT / "site/fonts/taamey-ashkenaz-medium.woff2", ROOT / "site/fonts/taamey-ashkenaz-bold.woff2"],
    "sbl": [ROOT / "site/fonts/SBL_Hbrw.ttf"],
    "noto-rashi": [ROOT / "site/fonts/noto-rashi/NotoRashiHebrew.woff2"],
    "taamey-d": [ROOT / "site/fonts/taamey-d/Taamey_D.ttf"],
    "keter-yg": [ROOT / "site/fonts/keter-yg/KeterYG-Medium.ttf"],
    "david": [ROOT / "site/fonts/david-libre/DavidLibre-Regular.woff2", ROOT / "site/fonts/david-libre/DavidLibre-Bold.woff2"],
    "assistant": [ROOT / "site/fonts/assistant/Assistant.woff2"],
}


def glyph_status(font: TTFont, cp: int, cmap: dict) -> str:
    if cp not in cmap:
        return "absent"
    name = cmap[cp]
    if "glyf" in font:
        g = font["glyf"].glyphs.get(name)
        if g is None:
            return "missing-glyf"
        if getattr(g, "isComposite", lambda: False)() is True or getattr(g, "numberOfContours", 1) != 0:
            return "present"
        return "empty"
    return "present"


def present(font: TTFont, cmap: dict, cp: int) -> bool:
    return glyph_status(font, cp, cmap) not in ("absent", "empty", "missing-glyf")


def gpos_types(font: TTFont):
    if "GPOS" not in font:
        return []
    return sorted({lu.LookupType for lu in font["GPOS"].table.LookupList.Lookup})


def fvar(font: TTFont):
    if "fvar" not in font:
        return None
    axes = []
    for a in font["fvar"].axes:
        axes.append({"tag": a.axisTag, "min": a.minValue, "def": a.defaultValue, "max": a.maxValue})
    return axes


def name_of(font: TTFont, nid: int) -> str | None:
    rec = font["name"].getDebugName(nid) if "name" in font else None
    return rec


def face_facts(path: Path) -> dict:
    font = TTFont(path)
    cmap = font.getBestCmap() or {}
    taam_ok = [cp for cp in TAAMIM if present(font, cmap, cp)]
    niq_missing = [f"U+{cp:04X} {lab}" for cp, lab in NIQQUD.items() if not present(font, cmap, cp)]
    punct = {lab: present(font, cmap, cp) for cp, lab in PUNCT.items()}
    marks = [cp for cp in MARKS_05B0_05C7 if present(font, cmap, cp)]
    os2 = font["OS/2"] if "OS/2" in font else None
    return {
        "path": str(path.relative_to(ROOT)),
        "size": path.stat().st_size,
        "family": name_of(font, 1),
        "subfamily": name_of(font, 2),
        "version": name_of(font, 5),
        "weight": getattr(os2, "usWeightClass", None) if os2 else None,
        "fvar": fvar(font),
        "gpos": gpos_types(font),
        "has_mark_to_base": 4 in gpos_types(font),
        "has_mark_to_mark": 6 in gpos_types(font),
        "taamim": len(taam_ok),
        "taamim_total": 31,
        "niqqud_present": len(NIQQUD) - len(niq_missing),
        "niqqud_total": len(NIQQUD),
        "niqqud_missing": niq_missing,
        "marks_05B0_05C7": len(marks),
        "punct": punct,
        "cmap_count": len(cmap),
    }


def family_facts(faces: list[dict]) -> dict:
    # Intersection of coverage across delivered faces of the same family.
    taam = min(f["taamim"] for f in faces)
    missing = sorted(set().union(*(f["niqqud_missing"] for f in faces)))
    punct = {k: all(f["punct"][k] for f in faces) for k in faces[0]["punct"]}
    weights = [f["weight"] for f in faces]
    axes = next((f["fvar"] for f in faces if f["fvar"]), None)
    real_bold = False
    if axes and any(a["tag"] == "wght" and a["max"] >= 700 for a in axes):
        real_bold = True
    if any(w and w >= 700 for w in weights) and len(faces) > 1:
        real_bold = True
    # Two static files with a 700 face, or a variable axis reaching 700.
    if any(f["fvar"] and any(a["tag"] == "wght" and a["max"] >= 700 for a in f["fvar"]) for f in faces):
        real_bold = True
    # Native bold file (subfamily Bold or weight 700) counts even if only one file? SBL is 400 only.
    if any((f["subfamily"] or "").lower() == "bold" or (f["weight"] or 0) >= 700 for f in faces):
        real_bold = True
    return {
        "faces": faces,
        "taamim": taam,
        "niqqud_present": faces[0]["niqqud_total"] - len(missing),
        "niqqud_total": faces[0]["niqqud_total"],
        "niqqud_missing": missing,
        "punct": punct,
        "real_bold": real_bold,
        "gpos_mark_to_base": all(f["has_mark_to_base"] for f in faces),
        "gpos_mark_to_mark": all(f["has_mark_to_mark"] for f in faces),
        "marks_05B0_05C7": min(f["marks_05B0_05C7"] for f in faces),
    }


def main():
    out = {}
    for key, paths in FONTS.items():
        faces = [face_facts(p) for p in paths]
        out[key] = family_facts(faces)
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
