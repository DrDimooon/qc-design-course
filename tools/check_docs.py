"""Проверка целостности документации курса.

Что проверяет:
  1. frontmatter (YAML между ---) и обязательные ключи;
  2. парность fence-маркеров (``` / ~~~);
  3. локальные ссылки (вне блоков кода) — битых быть не должно;
  4. блоки <details>: без markdown="1" после </summary> нужна пустая строка,
     иначе содержимое не разберётся как markdown (ни на сайте, ни на GitHub);
  5. кастомные адмонишены (analogy / intuition / red-flag / practically)
     объявлены в HTML-структуре с markdown="1";
  6. за маркером виджета <!--qc-embed: …--> идёт видимая ссылка «**Интерактив:** …».

Запуск:
    python tools/check_docs.py           # проверка всего репозитория
    python tools/check_docs.py --quiet   # только итог
"""

from __future__ import annotations

import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", "site", ".site-build", "node_modules", "__pycache__", ".venv", "venv"}
SKIP_FILES = {"AUDIT-NOTES.md"}
FM_KEYS = ("title", "module", "difficulty", "duration", "status", "tags")
CUSTOM_TYPES = ("analogy", "intuition", "red-flag", "practically")

FENCE_OPEN = re.compile(r"^(`{3,}|~{3,})")   # открывающий: маркер + необязательный info-string
FENCE_CLOSE = re.compile(r"^(`{3,}|~{3,})\s*$")  # закрывающий: только маркер (CommonMark)
LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+(?:\s+[\"'][^\"']+[\"'])?)\)")
SUMMARY = re.compile(r"<summary>")
DETAILS = re.compile(r"<details\b")


def md_files() -> list[str]:
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.endswith(".md") and name not in SKIP_FILES:
                out.append(os.path.join(dirpath, name))
    return sorted(out)


def scan_fences(lines: list[str]) -> list[tuple[int, int | None]]:
    """Построчный разбор код-блоков: [(строка_открытия, строка_закрытия | None)].

    Открывающий маркер — минимум три ``` или ~~~ (можно с info-string),
    закрывающий — тот же символ, без info-string. Вложенность fence не допускается,
    как в CommonMark.
    """
    blocks: list[tuple[int, int | None]] = []
    marker: str | None = None
    start = 0
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if marker is None:
            m = FENCE_OPEN.match(stripped)
            if m:
                marker = m.group(1)[0]
                start = i
        elif FENCE_CLOSE.match(stripped) and stripped[0] == marker:
            blocks.append((start, i))
            marker = None
    if marker is not None:
        blocks.append((start, None))
    return blocks


def check_file(path: str) -> list[str]:
    rel = os.path.relpath(path, ROOT).replace("\\", "/")
    text = open(path, encoding="utf-8").read()
    lines = text.splitlines()
    problems: list[str] = []
    is_service = rel.startswith(".github/") or rel in ("INTERACTIVE.md", "STYLEGUIDE.md")

    # 1. frontmatter
    if lines and lines[0].strip() == "---":
        end = next((i for i in range(1, min(40, len(lines))) if lines[i].strip() == "---"), None)
        if end is None:
            problems.append(f"{rel}:1: frontmatter без закрывающего ---")
        else:
            fm = "\n".join(lines[1:end])
            for key in FM_KEYS:
                if not re.search(rf"^{key}\s*:", fm, re.M):
                    problems.append(f"{rel}:2: в frontmatter нет ключа «{key}»")
    elif not is_service:
        problems.append(f"{rel}:1: нет frontmatter")

    # 2. fence-маркеры (провалидировано и негативным контролем --selftest)
    fence_blocks = scan_fences(lines)
    for start, end in fence_blocks:
        if end is None:
            problems.append(f"{rel}:{start}: код-блок открыт fence-маркером, но не закрыт")
    code_lines: set[int] = set()
    for start, end in fence_blocks:
        code_lines.update(range(start, (end or len(lines) + 1)))

    open_tag = ""          # последняя встретившаяся строка с <details …>
    for i, line in enumerate(lines, 1):
        if i in code_lines:
            continue

        # 3. локальные ссылки
        for m in LINK.finditer(line):
            target = m.group(1).split(" ")[0].strip()
            if target.startswith(("#", "http://", "https://", "mailto:")):
                continue
            target = target.split("#")[0]
            if not target:
                continue
            if not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(path), target))):
                problems.append(f"{rel}:{i}: битая локальная ссылка -> {target}")

        # 4-5. блоки <details>
        if DETAILS.search(line) and "`" not in line:
            open_tag = line
            if "class=" in line and "markdown=" not in line:
                problems.append(f"{rel}:{i}: у <details> с классом адмонишена нужен markdown=\"1\"")
        if SUMMARY.search(line) and line.rstrip().endswith("</summary>") and "`" not in line:
            owner = line if DETAILS.search(line) else open_tag
            if 'markdown="1"' not in owner:
                nxt = lines[i].strip() if i < len(lines) else ""
                if nxt:
                    problems.append(f"{rel}:{i}: после <summary> нужна пустая строка, "
                                    f"иначе содержимое блока не отрендерится как markdown")

    # 6. маркер виджета -> видимая ссылка
    if not is_service:
        for i, line in enumerate(lines):
            if "<!--qc-embed:" in line:
                window = " ".join(lines[i:i + 4])
                if "**Интерактив:**" not in window:
                    problems.append(f"{rel}:{i+1}: после маркера виджета нет строки «**Интерактив:** …»")

    return problems


GOOD_DOC = """---
title: Контроль
module: selftest
difficulty: база
duration: 1 ч
status: само-проверка
tags: [selftest]
---

# Контроль

```python
print("закрытый блок")
```

Конец контрольного документа.
"""

BAD_DOC = """---
title: Контроль
module: selftest
difficulty: база
duration: 1 ч
status: само-проверка
tags: [selftest]
---

# Контроль

```python
print("незакрытый блок")
"""


def selftest() -> int:
    """Негативный и позитивный контроль fence-проверки (E071 из аудита)."""
    scratch = os.path.join(ROOT, ".selftest-tmp")
    os.makedirs(scratch, exist_ok=True)
    good = os.path.join(scratch, "good.md")
    bad = os.path.join(scratch, "bad.md")
    with open(good, "w", encoding="utf-8") as f:
        f.write(GOOD_DOC)
    with open(bad, "w", encoding="utf-8") as f:
        f.write(BAD_DOC)
    try:
        good_problems = check_file(good)
        bad_problems = check_file(bad)
    finally:
        os.remove(good)
        os.remove(bad)
        os.rmdir(scratch)

    good_ok = not good_problems
    bad_ok = any("не закрыт" in p for p in bad_problems)
    if not bad_ok:
        print("selftest: негативный контроль НЕ сработал:")
        for p in bad_problems:
            print("   ", p)
    if not good_ok:
        print("selftest: позитивный контроль дал ложные замечания:")
        for p in good_problems:
            print("   ", p)
    if good_ok and bad_ok:
        print("selftest OK: незакрытый код-блок ловится, валидный документ чист")
        return 0
    return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Проверка целостности документации")
    parser.add_argument("--quiet", action="store_true", help="только итог")
    parser.add_argument("--selftest", action="store_true",
                        help="самопроверка: незакрытый код-блок должен ловиться")
    args = parser.parse_args()

    if args.selftest:
        return selftest()

    files = md_files()
    problems: list[str] = []
    for f in files:
        problems.extend(check_file(f))

    if not args.quiet:
        for p in problems:
            print("  ", p)
    print(f"проверено файлов: {len(files)}; замечаний: {len(problems)}")
    if problems:
        print("НЕЛЬЗЯ ПУБЛИКОВАТЬ: исправьте замечания выше")
        return 1
    print("OK: ссылки, блоки кода, frontmatter и врезки в порядке")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
