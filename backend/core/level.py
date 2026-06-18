import json
from pathlib import Path

_level_file = Path(__file__).parent / "level.json"

with open(_level_file, encoding="utf-8") as f:
    _data = json.load(f)

levels: dict = _data["difficulty_levels"]

DEFAULT_LEVEL = "B1"


def get_level(cefr: str) -> dict:
    return levels.get(cefr, levels[DEFAULT_LEVEL])
