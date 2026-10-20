#!/usr/bin/env python3
"""
Yayın öncesi marka/içerik denetimi.

Kullanım: python3 scripts/pre-release-check.py   (exit 0 = temiz, 1 = bulgu var)

Kurallar bilinçli olarak dar tutuldu: YORUM SATIRLARI taranmaz. Gerekçe
metinleri (neden mor kullanmadığımız gibi) kod içinde yorum olarak durur ve
bunlar kullanıcıya görünmez; bulgu saymak gürültü üretir.
"""
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

COMMENT_PREFIXES = ("//", "*", "/*", "{/*", "#", "--")
CJK = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]")

# Token tanımlarının yaşadığı dosyalar: hex burada OLMALI, bulgu değil.
TOKEN_FILES = {"src/app/globals.css", "src/lib/status.ts"}

CHECKS: list[tuple[str, re.Pattern[str], str]] = [
    ("yer tutucu [MARKA ADI]", re.compile(r"\[MARKA[ _]ADI\]|\[BRAND( NAME)?\]"), "all"),
    ("lorem ipsum", re.compile(r"lorem ipsum", re.I), "all"),
    ("CJK karakter sızıntısı", CJK, "all"),
    ("rakip marka adı", re.compile(r"(?<![A-Za-zçğıöşü])(Getir|Martı|Zomato|DoorDash|Swiggy)(?![A-Za-z])"), "all"),
    ("uydurma metrik", re.compile(r"(50[.,]000\+|99[.,]2\s*%|%\s*98[.,]2|10[.,]000\+\s*teslimat|5[.,]000\+\s*kurye)"), "all"),
    ("TODO/FIXME", re.compile(r"\b(TODO|FIXME|XXX|HACK)\b"), "all"),
    ("gerçek dışı hız vaadi", re.compile(r"(kesin \d+ dakikada|asla gecikmez|her zaman en ucuz|en hızlı biziz)"), "all"),
    ("e-para iddiası", re.compile(r"elektronik para cüzdanı"), "all"),
    # Aksan hex'i yalnızca bileşen/sayfa dosyalarında bulgu: token'ı baypas etmek.
    ("hard-coded aksan hex (token baypası)", re.compile(r"#(?:FF5C35|00D5C8|FF6B00|7C3AED|5D3EBC|34D100)", re.I), "tsx"),
]


def is_comment(line: str) -> bool:
    stripped = line.strip()
    return any(stripped.startswith(prefix) for prefix in COMMENT_PREFIXES)


def iter_files() -> list[pathlib.Path]:
    return sorted(
        p
        for p in SRC.rglob("*")
        if p.suffix in {".ts", ".tsx", ".css"} and p.is_file()
    )


def main() -> int:
    findings: list[str] = []
    files = iter_files()

    for path in files:
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        for lineno, line in enumerate(text.splitlines(), start=1):
            if is_comment(line):
                continue
            for label, pattern, scope in CHECKS:
                if scope == "tsx" and (rel in TOKEN_FILES or not rel.endswith(".tsx")):
                    continue
                if pattern.search(line):
                    findings.append(f"{label}: {rel}:{lineno}: {line.strip()[:110]}")

    # <img> alt denetimi (çok satırlı etiket)
    for path in files:
        if not path.name.endswith(".tsx"):
            continue
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding="utf-8")
        for match in re.finditer(r"<img\b[^>]*>", text, re.S):
            if "alt=" not in match.group(0):
                lineno = text[: match.start()].count("\n") + 1
                findings.append(f"alt metni olmayan <img>: {rel}:{lineno}")

    # Yasal belgelerin tamamı taslak mı?
    policies = (ROOT / "src/lib/policies.ts").read_text(encoding="utf-8")
    total = len(re.findall(r'^\s+slug: "', policies, re.M))
    drafts = len(re.findall(r'status: "taslak"', policies))
    if total != drafts:
        findings.append(f"taslak olmayan yasal belge var: {drafts}/{total}")

    print("== YAYIN ÖNCESİ DENETİM ==")
    print(f"taranan dosya: {len(files)} · yasal belge: {total} (taslak: {drafts})")
    if findings:
        print(f"\nBULGU ({len(findings)}):")
        for item in findings[:40]:
            print("  -", item)
        if len(findings) > 40:
            print(f"  … ve {len(findings) - 40} bulgu daha")
        print("\nSONUÇ: yayından önce kapatılmalı")
        return 1
    print("\nSONUÇ: temiz")
    return 0


if __name__ == "__main__":
    sys.exit(main())
