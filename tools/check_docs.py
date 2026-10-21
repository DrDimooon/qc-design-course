"""Проверка целостности документации курса.

Что проверяет:
  1. frontmatter (YAML между ---) у всех файлов курса;
  2. парность fence-маркеров (``` / ~~~);
  3. существование локальных ссылок (вне блоков кода) — битых быть не должно;
  4. наличие атрибута markdown="1" у открывающих тегов <details> — иначе
     содержимое блока попадёт в HTML как сырой текст;
  5. атрибут class у кастомных адмонишенов (analogy / intuition / red-flag /
     practically) — без него не применится цветовая схема из
     assets/styles/admonitions.css.

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
SKIP_FILES = {"AUDIT-NOTES.md"}  # рабочий журнал аудита, не часть курса

FENCE = re.compile(r"^\s*(```|~~~)")
DETAILS_OPEN = re.compile(r"^\s*<details(\s|>)")
LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+(?:\s+[\"'][^\"']+[\"'])?)\)")
FM_KEYS = ("title", "module", "difficulty", "duration", "status", "tags")
CUSTOM_TYPES = ("analogy", "intuition", "red-flag", "practically")


def md_files() -> list[str]:
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.endswith(".md") and name not in SKIP_FILES:
                out.append(os.path.join(dirpath, name))
    return sorted(out)


def check_file(path: str) -> list[str]:
    rel = os.path.relpath(path, ROOT)
    text = open(path, encoding="utf-8").read()
    lines = text.splitlines()
    problems: list[str] = []

    # 1. frontmatter (у служебных файлов .github/ он не нужен — это не страницы курса)
    is_service = rel.replace("\\", "/").startswith(".github/")
    if lines and lines[0].strip() == "---":
        end = next((i for i in range(1, min(40, len(lines))) if lines[i].strip() == "---"), None)
        if end is None:
            problems.append(f"{rel}:1: frontmatter без закрывающего ---")
        else:
            fm = "\n".join(lines[1:end])
            for key in FM_KEYS:
                if not re.search(rf"^{key}\s*:", fm, re.M):
                    problems.append(f"{rel}:2: в frontmatter нет ключа «{key}»")
    else:
        if not is_service:
            problems.append(f"{rel}:1: нет frontmatter")

    # 2. fence-маркеры
    if len(FENCE.findall(text)) % 2 != 0:
        problems.append(f"{rel}:1: нечётное число fence-маркеров (код-блок не закрыт)")

    in_code = False
    for i, line in enumerate(lines, 1):
        # 3-4. ссылки и <details> — только вне блоков кода
        if FENCE.match(line):
            in_code = not in_code
            continue
        if in_code:
            continue
        if DETAILS_OPEN.match(line) and "markdown=" not in line:
            problems.append(f"{rel}:{i}: <details> без markdown=\"1\" (содержимое не отрендерится как markdown)")
        for m in LINK.finditer(line):
            target = m.group(1).split(" ")[0].strip()
            if target.startswith(("#", "http://", "https://", "mailto:")):
                continue
            target = target.split("#")[0]
            if not target:
                continue
            if not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(path), target))):
                problems.append(f"{rel}:{i}: битая локальная ссылка -> {target}")

    # 5. кастомные адмонишены в раскрытом виде: класс `admonition` и тип
    #    добавляет расширение admonition, поэтому достаточно `!!! тип "..."`.
    #    Отдельно следим, чтобы в тексте не осталось «сырых» конструкций вида
    #    `??? тип "..."` для кастомных типов: pymdownx.details не добавит им
    #    класс admonition, и цветовая схема не применится.
    for m in re.finditer(r"^\?\?\?\s+([a-z\-]+)", text, re.M):
        if m.group(1) in CUSTOM_TYPES:
            problems.append(f"{rel}: «??? {m.group(1)}» не получит класс admonition — "
                            f"используйте <details class=\"admonition {m.group(1)}\" markdown=\"1\">")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description="Проверка целостности документации")
    parser.add_argument("--quiet", action="store_true", help="только итог")
    args = parser.parse_args()

    files = md_files()
    problems: list[str] = []
    for f in files:
        problems.extend(check_file(f))

    for p in problems:
        print("  ", p)
    print(f"проверено файлов: {len(files)}; замечаний: {len(problems)}")
    if problems:
        print("НЕЛЬЗЯ ПУБЛИКОВАТЬ: исправьте замечания выше")
        return 1
    print("OK: ссылки, блоки кода и frontmatter в порядке")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
