#!/usr/bin/env python3
"""Join the TTS modules into one Global script: tts/dist/Global.lua.

Paste the output into the Global script box in Tabletop Simulator.
Order matters: the importer defines FOI and helpers; the later modules use them.
"""
from pathlib import Path

here = Path(__file__).parent
parts = ["FanOfInImporter.lua", "FanOfInTable.lua", "FanOfInPacks.lua", "FanOfInReplay.lua"]
out = "\n\n".join((here / name).read_text() for name in parts)
(here / "dist").mkdir(exist_ok=True)
(here / "dist" / "Global.lua").write_text(out)
print(f"Wrote {here / 'dist' / 'Global.lua'} ({len(out)} characters)")
