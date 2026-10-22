"""Red Ribbon удирдлагын апп. Ажиллуулах:  python manga_admin.py
Сайтын хавтсанд (index.html-ийн хажууд) хийж ажиллуулбал хавтсыг өөрөө олно."""
import datetime
import json
import re
import shutil
import subprocess
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, simpledialog, ttk

HERE = Path(__file__).resolve().parent
CFG = HERE / "admin_config.json"
IMG = {".jpg", ".jpeg", ".png", ".webp"}


def natural(p):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", Path(p).name)]


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Red Ribbon - удирдлага")
        self.geometry("940x620")
        self.root_dir = HERE
        try:
            self.root_dir = Path(json.loads(CFG.read_text(encoding="utf-8"))["project"])
        except Exception:
            pass
        self.data, self.cur = [], None
        self.build_ui()
        self.load()

    # ---------- дэлгэц ----------
    def build_ui(self):
        top = ttk.Frame(self, padding=8)
        top.pack(fill="x")
        ttk.Label(top, text="Сайтын хавтас:").pack(side="left")
        self.path_var = tk.StringVar(value=str(self.root_dir))
        ttk.Entry(top, textvariable=self.path_var, state="readonly").pack(side="left", fill="x", expand=True, padx=6)
        ttk.Button(top, text="Сонгох", command=self.pick_project).pack(side="left")

        body = ttk.Frame(self, padding=8)
        body.pack(fill="both", expand=True)
        left = ttk.Frame(body)
        left.pack(side="left", fill="y")
        self.lb = tk.Listbox(left, width=28, exportselection=False)
        self.lb.pack(fill="y", expand=True)
        self.lb.bind("<<ListboxSelect>>", lambda e: self.select())
        ttk.Button(left, text="Шинэ манга нэмэх", command=self.add_manga).pack(fill="x", pady=(6, 0))
        ttk.Button(left, text="Манга устгах", command=self.del_manga).pack(fill="x", pady=(4, 0))

        right = ttk.Frame(body, padding=(12, 0))
        right.pack(side="left", fill="both", expand=True)
        form = ttk.LabelFrame(right, text="Мангын мэдээлэл", padding=8)
        form.pack(fill="x")
        self.v_id, self.v_title, self.v_genres, self.v_cover = (tk.StringVar() for _ in range(4))
        rows = [("ID", self.v_id, True), ("Нэр", self.v_title, False), ("Жанр (таслалаар)", self.v_genres, False)]
        for i, (lab, var, ro) in enumerate(rows):
            ttk.Label(form, text=lab).grid(row=i, column=0, sticky="w", pady=2)
            ttk.Entry(form, textvariable=var, state="readonly" if ro else "normal").grid(row=i, column=1, columnspan=2, sticky="ew", pady=2, padx=6)
        ttk.Label(form, text="Cover").grid(row=3, column=0, sticky="w")
        ttk.Label(form, textvariable=self.v_cover).grid(row=3, column=1, sticky="w", padx=6)
        ttk.Button(form, text="Cover сонгох", command=self.pick_cover).grid(row=3, column=2, sticky="e")
        ttk.Button(form, text="Хадгалах", command=self.save_info).grid(row=4, column=2, sticky="e", pady=6)
        form.columnconfigure(1, weight=1)

        ch = ttk.LabelFrame(right, text="Бүлгүүд", padding=8)
        ch.pack(fill="both", expand=True, pady=(8, 0))
        self.tree = ttk.Treeview(ch, columns=("n", "title", "pages", "date"), show="headings", height=8)
        for c, t, w in (("n", "№", 50), ("title", "Бүлгийн нэр", 280), ("pages", "Хуудас", 70), ("date", "Огноо", 100)):
            self.tree.heading(c, text=t)
            self.tree.column(c, width=w)
        self.tree.pack(fill="both", expand=True)
        self.tree.bind("<Double-1>", lambda e: self.rename_chapter())
        bar = ttk.Frame(ch)
        bar.pack(fill="x", pady=(6, 0))
        for t, cmd in (("Бүлэг нэмэх (хавтас сонгох)", self.add_chapter_folder),
                       ("Бүлэг нэмэх (зураг сонгох)", self.add_chapter_files),
                       ("Нэр засах", self.rename_chapter), ("Бүлэг устгах", self.del_chapter)):
            ttk.Button(bar, text=t, command=cmd).pack(side="left", padx=(0, 6))

        bottom = ttk.Frame(self, padding=8)
        bottom.pack(fill="x")
        self.status = tk.StringVar(value="Бэлэн")
        ttk.Label(bottom, textvariable=self.status).pack(side="left")
        ttk.Button(bottom, text="Сайтад тавих (Deploy)", command=self.deploy).pack(side="right")

    # ---------- өгөгдөл ----------
    @property
    def jpath(self):
        return self.root_dir / "manga.json"

    def load(self):
        try:
            self.data = json.loads(self.jpath.read_text(encoding="utf-8"))
        except Exception:
            self.data = []
        self.refresh()

    def write(self):
        self.jpath.write_text(json.dumps(self.data, ensure_ascii=False, indent=2), encoding="utf-8")

    def refresh(self, keep=None):
        self.lb.delete(0, "end")
        for m in self.data:
            self.lb.insert("end", m["title"])
        ids = [m["id"] for m in self.data]
        if keep in ids:
            self.lb.selection_set(ids.index(keep))
        self.select()

    def select(self):
        s = self.lb.curselection()
        self.cur = self.data[s[0]] if s else None
        m = self.cur or {}
        self.v_id.set(m.get("id", ""))
        self.v_title.set(m.get("title", ""))
        self.v_genres.set(", ".join(m.get("genres", [])))
        self.v_cover.set(m.get("cover") or "(алга)")
        self.tree.delete(*self.tree.get_children())
        for c in m.get("chapters", []):
            self.tree.insert("", "end", iid=str(c["n"]), values=(c["n"], c.get("title", ""), c["pages"].get("count", 0), c.get("date", "")))

    def need_manga(self):
        if not self.cur:
            messagebox.showinfo("Анхаар", "Эхлээд зүүн талаас мангаа сонгоно уу.")
        return self.cur

    # ---------- үйлдлүүд ----------
    def pick_project(self):
        d = filedialog.askdirectory(initialdir=self.root_dir, title="Сайтын хавтас (index.html байгаа)")
        if d:
            self.root_dir = Path(d)
            self.path_var.set(d)
            CFG.write_text(json.dumps({"project": d}), encoding="utf-8")
            self.load()

    def add_manga(self):
        title = simpledialog.askstring("Шинэ манга", "Мангын нэр:", parent=self)
        if not title:
            return
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or f"manga-{len(self.data) + 1}"
        mid = simpledialog.askstring("Шинэ манга", "ID (жижиг латин үсэг, тоо, зураас; дараа нь солихгүй):", initialvalue=slug, parent=self)
        if not mid:
            return
        mid = mid.strip().lower()
        if not re.fullmatch(r"[a-z0-9-]+", mid) or any(m["id"] == mid for m in self.data):
            messagebox.showerror("Алдаа", "ID буруу эсвэл аль хэдийн байна.")
            return
        (self.root_dir / "manga" / mid).mkdir(parents=True, exist_ok=True)
        self.data.append({"id": mid, "title": title.strip(), "genres": [], "cover": "", "chapters": []})
        self.write()
        self.refresh(mid)
        self.status.set("Манга нэмэгдлээ. Бүлэг нэмсний дараа сайтад харагдана.")

    def save_info(self):
        if not self.need_manga():
            return
        self.cur["title"] = self.v_title.get().strip() or self.cur["id"]
        self.cur["genres"] = [g.strip() for g in self.v_genres.get().split(",") if g.strip()]
        self.write()
        self.refresh(self.cur["id"])
        self.status.set("Хадгаллаа.")

    def pick_cover(self):
        if not self.need_manga():
            return
        f = filedialog.askopenfilename(title="Cover зураг", filetypes=[("Зураг", "*.jpg *.jpeg *.png *.webp")])
        if not f:
            return
        mdir = self.root_dir / "manga" / self.cur["id"]
        mdir.mkdir(parents=True, exist_ok=True)
        for old in mdir.glob("cover.*"):
            old.unlink()
        ext = Path(f).suffix.lower()
        shutil.copy2(f, mdir / f"cover{ext}")
        self.cur["cover"] = f"/manga/{self.cur['id']}/cover{ext}"
        self.write()
        self.refresh(self.cur["id"])

    def add_chapter_folder(self):
        d = filedialog.askdirectory(title="Бүлгийн зургууд байгаа хавтас")
        if d:
            self.add_chapter(Path(d).iterdir())

    def add_chapter_files(self):
        fs = filedialog.askopenfilenames(title="Бүлгийн зургууд", filetypes=[("Зураг", "*.jpg *.jpeg *.png *.webp")])
        if fs:
            self.add_chapter(fs)

    def add_chapter(self, files):
        if not self.need_manga():
            return
        files = sorted((Path(f) for f in files if Path(f).suffix.lower() in IMG), key=natural)
        if not files:
            messagebox.showerror("Алдаа", "Зураг олдсонгүй.")
            return
        exts = {f.suffix.lower() for f in files}
        if len(exts) > 1:
            messagebox.showerror("Алдаа", "Бүх зургийн төрөл (jpg, png, webp) ижил байх ёстой.")
            return
        ext = exts.pop()
        nxt = max([c["n"] for c in self.cur["chapters"]] or [0]) + 1
        n = simpledialog.askinteger("Бүлэг", "Бүлгийн дугаар:", initialvalue=nxt, minvalue=1, parent=self)
        if not n:
            return
        if any(c["n"] == n for c in self.cur["chapters"]) and not messagebox.askyesno("Давхцаж байна", f"Бүлэг {n} аль хэдийн байна. Дарж бичих үү?"):
            return
        title = simpledialog.askstring("Бүлэг", "Бүлгийн нэр (заавал биш):", parent=self) or ""
        mid = self.cur["id"]
        cdir = self.root_dir / "manga" / mid / str(n)
        shutil.rmtree(cdir, ignore_errors=True)
        cdir.mkdir(parents=True)
        pad = max(2, len(str(len(files))))
        for i, f in enumerate(files, 1):
            shutil.copy2(f, cdir / f"{str(i).zfill(pad)}{ext}")
        ch = {"n": n, "title": title.strip(), "date": datetime.date.today().isoformat(),
              "pages": {"base": f"/manga/{mid}/{n}/", "count": len(files), "ext": ext, "pad": pad}}
        self.cur["chapters"] = sorted([c for c in self.cur["chapters"] if c["n"] != n] + [ch], key=lambda c: c["n"])
        self.write()
        self.refresh(mid)
        self.status.set(f"Бүлэг {n}: {len(files)} хуудас нэмэгдлээ.")

    def sel_chapter(self):
        if not self.need_manga():
            return None
        s = self.tree.selection()
        if not s:
            messagebox.showinfo("Анхаар", "Жагсаалтаас бүлгээ сонгоно уу.")
            return None
        return next(c for c in self.cur["chapters"] if str(c["n"]) == s[0])

    def rename_chapter(self):
        c = self.sel_chapter()
        if not c:
            return
        t = simpledialog.askstring("Бүлгийн нэр", f"Бүлэг {c['n']}-ийн нэр:", initialvalue=c.get("title", ""), parent=self)
        if t is not None:
            c["title"] = t.strip()
            self.write()
            self.refresh(self.cur["id"])

    def del_chapter(self):
        c = self.sel_chapter()
        if not c or not messagebox.askyesno("Устгах", f"Бүлэг {c['n']}-ийг зургийнх нь хамт устгах уу?"):
            return
        shutil.rmtree(self.root_dir / "manga" / self.cur["id"] / str(c["n"]), ignore_errors=True)
        self.cur["chapters"].remove(c)
        self.write()
        self.refresh(self.cur["id"])

    def del_manga(self):
        if not self.need_manga():
            return
        if not messagebox.askyesno("Устгах", f"'{self.cur['title']}' мангыг бүх бүлэг, зургийнх нь хамт устгах уу? Үүнийг буцаах боломжгүй."):
            return
        shutil.rmtree(self.root_dir / "manga" / self.cur["id"], ignore_errors=True)
        self.data.remove(self.cur)
        self.write()
        self.refresh()

    def deploy(self):
        root = self.root_dir
        cmds = ["git add -A", 'git commit -m "Update manga"', "git push"] if (root / ".git").exists() else ["vercel --prod"]
        self.status.set("Deploy хийж байна...")

        def run():
            out = []
            for c in cmds:
                r = subprocess.run(c, cwd=root, shell=True, capture_output=True, text=True, encoding="utf-8", errors="replace")
                out.append(f"> {c}\n{(r.stdout + r.stderr).strip()[-500:]}")
            self.after(0, lambda: (self.status.set("Deploy дууслаа."), messagebox.showinfo("Үр дүн", "\n\n".join(out))))

        threading.Thread(target=run, daemon=True).start()


if __name__ == "__main__":
    App().mainloop()
