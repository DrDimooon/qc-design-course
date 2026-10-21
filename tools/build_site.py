"""Сборка статического сайта курса (MkDocs + Material).

Зачем нужен скрипт. Содержимое репозитория лежит в корне: README в корне удобен
для чтения на GitHub, а все ссылки между файлами относительные. MkDocs при этом
требует, чтобы каталог с документами был подчинен каталогу конфига, поэтому
прямой `mkdocs build` для такой раскладки не работает. Скрипт собирает
временную сцену (копия контента + копия конфига), запускает в ней сборку и
кладет результат в ./site.

Запуск:
    python tools/build_site.py             # сборка в ./site
    python tools/build_site.py --strict    # предупреждения считаются ошибками
    python tools/build_site.py --serve     # локальный предпросмотр :8000
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAGING_NAME = ".site-build"

# Служебные каталоги и файлы, которые не попадают на сайт.
EXCLUDE_DIRS = {
    ".git",
    ".github",
    STAGING_NAME,
    "site",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".pytest_cache",
}
EXCLUDE_FILES = {"transcripts.jsonl", "package.json", "package-lock.json"}

# Маркер интерактивного виджета в исходниках: <!--qc-embed: файл.html | Заголовок | высота-->
# В репозитории GitHub не исполняет <iframe>, поэтому в .md лежит только маркер
# и видимая ссылка на виджет; настоящий <iframe> подставляется здесь, при сборке.
WIDGET_RE = re.compile(
    r"<!--qc-embed:\s*(?P<name>[^|]+?)\s*\|\s*(?P<title>[^|]*?)\s*\|\s*(?P<h>\d+)\s*-->"
)


def expand_widgets(docs_root: Path) -> int:
    """Заменяет маркеры виджетов на <iframe> с путём относительно файла урока."""
    count = 0
    for md in docs_root.rglob("*.md"):
        text = md.read_text(encoding="utf-8")
        if "qc-embed:" not in text:
            continue

        def repl(m: re.Match) -> str:
            target = docs_root / "assets" / "interactive" / m.group("name").strip()
            rel = Path(os.path.relpath(target, md.parent)).as_posix()
            return (
                f'<iframe class="qc-embed" src="{rel}" title="{m.group("title").strip()}" '
                f'height="{m.group("h").strip()}" loading="lazy"></iframe>'
            )

        new_text = WIDGET_RE.sub(repl, text)
        md.write_text(new_text, encoding="utf-8")
        count += len(WIDGET_RE.findall(text))
    return count



def stage_content(staging: Path) -> Path:
    """Копирует содержимое репозитория в staging/docs."""
    docs = staging / "docs"
    if docs.exists():
        shutil.rmtree(docs)
    docs.mkdir(parents=True)

    for item in ROOT.iterdir():
        if item.name in EXCLUDE_DIRS or item.name.startswith("."):
            continue
        target = docs / item.name
        if item.is_dir():
            shutil.copytree(
                item,
                target,
                ignore=shutil.ignore_patterns(*EXCLUDE_DIRS, "*.pyc"),
            )
        else:
            if item.name in EXCLUDE_FILES:
                continue
            shutil.copy2(item, target)
    widgets = expand_widgets(docs)
    if widgets:
        print(f"подставлено интерактивных виджетов: {widgets}")
    return docs


def stage_config(staging: Path, site_dir: Path, site_url: str | None = None) -> Path:
    """Готовит конфиг MkDocs для сцены: docs_dir -> docs, site_dir -> репозиторий."""
    source = (ROOT / "mkdocs.yml").read_text(encoding="utf-8")
    text = source.replace('docs_dir: "."', 'docs_dir: "docs"')
    if "site_dir:" not in text:
        text = text.rstrip() + "\nsite_dir: \"{}\"\n".format(site_dir.as_posix())
    if site_url and "site_url:" not in text:
        # Канонические ссылки нужны для GitHub Pages (иначе поисковики и
        # «Поделиться» смотрят на корень домена, а не на /<repo>/).
        text = text.rstrip() + "\nsite_url: \"{}\"\n".format(site_url)
    config = staging / "mkdocs.yml"
    config.write_text(text, encoding="utf-8")
    return config


def run_mkdocs(config: Path, args: argparse.Namespace) -> int:
    command = [sys.executable, "-m", "mkdocs"]
    if args.serve:
        command.append("serve")
        command += ["--dev-addr", "127.0.0.1:8000"]
    else:
        command.append("build")
        if args.strict:
            command.append("--strict")
    command += ["-f", str(config)]
    print("$ " + " ".join(command))
    return subprocess.call(command, cwd=str(config.parent))


def main() -> int:
    parser = argparse.ArgumentParser(description="Сборка сайта курса через MkDocs")
    parser.add_argument("--serve", action="store_true", help="локальный предпросмотр")
    parser.add_argument("--strict", action="store_true", help="предупреждения как ошибки")
    parser.add_argument(
        "--site-url",
        default=None,
        help="канонический адрес сайта, например https://user.github.io/qc-design-course/",
    )
    args = parser.parse_args()

    if shutil.which(sys.executable) is None:  # pragma: no cover - защита
        print("Не найден интерпретатор Python", file=sys.stderr)
        return 1

    staging = ROOT / STAGING_NAME
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    site_dir = ROOT / "site"
    stage_content(staging)
    config = stage_config(staging, site_dir, args.site_url)

    try:
        return run_mkdocs(config, args)
    finally:
        if not args.serve:
            shutil.rmtree(staging, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
