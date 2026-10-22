"""manga/ хавтсыг уншаад manga.json-ийг автоматаар үүсгэнэ.

Бүтэц:
  manga/<id>/cover.jpg        (заавал биш)
  manga/<id>/info.json        (заавал биш) {"title": "Нэр", "genres": ["Адал явдал"]}
  manga/<id>/<бүлгийн дугаар>/01.jpg, 02.jpg, ...

Ажиллуулах:  python build_manga.py
"""
import datetime
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
MANGA = ROOT / "manga"
OUT = ROOT / "manga.json"
IMG = {".jpg", ".jpeg", ".png", ".webp"}


def natural(p):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.name)]


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


if not MANGA.is_dir():
    raise SystemExit("manga/ хавтас олдсонгүй. Эхлээд manga/<id>/<бүлэг>/ бүтэцтэй хавтас үүсгэнэ үү.")

old = {m["id"]: m for m in (load(OUT) or []) if "id" in m}
today = datetime.date.today().isoformat()
result = []

for mdir in sorted(p for p in MANGA.iterdir() if p.is_dir()):
    mid = mdir.name
    prev = old.get(mid, {})
    info = load(mdir / "info.json") or {}
    prev_ch = {str(c["n"]): c for c in prev.get("chapters", [])}
    chapters = []

    for cdir in sorted((p for p in mdir.iterdir() if p.is_dir() and p.name.isdigit()), key=lambda p: int(p.name)):
        imgs = sorted((f for f in cdir.iterdir() if f.suffix.lower() in IMG), key=natural)
        if not imgs:
            continue
        stem = imgs[0].stem
        pad = len(stem) if stem.startswith("0") else 0
        ext = imgs[0].suffix
        expected = [str(i).zfill(pad) + ext for i in range(1, len(imgs) + 1)]
        if [f.name for f in imgs] != expected:
            print(f"АНХААР: {mid}/{cdir.name} дахь файлын нэр 1,2,3... дараалалтай биш эсвэл өргөтгөл холилдсон байна.")
        old_c = prev_ch.get(cdir.name, {})
        chapters.append({
            "n": int(cdir.name),
            "title": old_c.get("title", ""),
            "date": old_c.get("date", today),
            "pages": {"base": f"/manga/{quote(mid)}/{cdir.name}/", "count": len(imgs), "ext": ext, "pad": pad},
        })

    if not chapters:
        continue
    cover = next((f for f in mdir.iterdir() if f.stem.lower() == "cover" and f.suffix.lower() in IMG), None)
    result.append({
        "id": mid,
        "title": info.get("title") or prev.get("title") or mid,
        "genres": info.get("genres") or prev.get("genres") or [],
        "cover": f"/manga/{quote(mid)}/{quote(cover.name)}" if cover else "",
        "chapters": chapters,
    })

OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Дууслаа: {len(result)} манга, {sum(len(m['chapters']) for m in result)} бүлэг -> {OUT.name}")
