#!/usr/bin/env python3
"""Генератор статических иллюстраций и анимаций курса по квантовым вычислениям.

Запуск (из корня репозитория):

    python tools/make_figures.py

Результат (полностью перезаписывается при каждом запуске):

    assets/figures/*.png      - статические иллюстрации (6 шт.)
    assets/figures/gif/*.gif   - анимации (3 шт.)

Принципы оформления:
  * светлый фон, чистые линии, без рамок осей (стиль 3b1b / Khan Academy);
  * акценты: #3b7dd8 (синий), #e08b52 (оранжевый), #7c4dff (фиолетовый),
    серый для вспомогательных элементов;
  * все подписи на русском, шрифт DejaVu Sans;
  * числовые значения на графиках берутся из точной математики моделей;
    иллюстративные (схематичные) величины помечены словом «схематично».
"""

from __future__ import annotations

import io
import math
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Rectangle
from PIL import Image

# --------------------------------------------------------------------------- #
# Пути и константы оформления
# --------------------------------------------------------------------------- #

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "figures"
GIF_DIR = OUT_DIR / "gif"

BLUE = "#3b7dd8"
ORANGE = "#e08b52"
PURPLE = "#7c4dff"
GRAY = "#9aa1ab"
DARK_GRAY = "#6b7280"
LIGHT = "#dfe3e8"
INK = "#20242b"
BG = "#ffffff"

BLUE_SOFT = "#e9f0fb"
ORANGE_SOFT = "#fbeee5"
PURPLE_SOFT = "#efe9ff"

DPI = 130           # статические иллюстрации: ~1000 px по ширине
GIF_DPI = 100       # анимации: меньше, чтобы уложиться в лимит по размеру
GIF_MAX_KB = 600    # предел размера одного GIF-файла


def apply_style() -> None:
    """Единые параметры matplotlib для всех иллюстраций."""
    mpl.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 11,
            "figure.facecolor": BG,
            "axes.facecolor": BG,
            "savefig.facecolor": BG,
            "savefig.edgecolor": BG,
            "axes.edgecolor": GRAY,
            "axes.labelcolor": INK,
            "axes.titlecolor": INK,
            "text.color": INK,
            "xtick.color": GRAY,
            "ytick.color": GRAY,
            "axes.grid": False,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "legend.frameon": False,
            "legend.fontsize": 10,
            "mathtext.fontset": "dejavusans",
            "axes.unicode_minus": False,
        }
    )


# --------------------------------------------------------------------------- #
# Вспомогательные функции
# --------------------------------------------------------------------------- #


def check_glyphs(chars: str) -> list:
    """Возвращает список символов, которых нет в DejaVu Sans (ASCII-вывод)."""
    from matplotlib import font_manager
    from matplotlib.ft2font import FT2Font

    font_path = font_manager.findfont(font_manager.FontProperties(family="DejaVu Sans"))
    font = FT2Font(font_path)
    missing = []
    for ch in sorted(set(chars)):
        if ch in "\n\t ":
            continue
        if font.get_char_index(ord(ch)) == 0:
            missing.append("U+%04X" % ord(ch))
    return missing


def save_png(fig, path: Path) -> None:
    fig.savefig(path, dpi=DPI, facecolor=BG)
    plt.close(fig)


def _master_palette(frames, colors: int, step: int = 2):
    """Общая палитра GIF по всем кадрам сразу.

    Если строить палитру только по первому кадру, цвета, которые появляются
    позже (оранжевый, синий), заменяются ближайшим серым.
    """
    width, height = frames[0].size
    cols = 4
    rows = (len(frames) + cols - 1) // cols
    sw, sh = max(1, width // step), max(1, height // step)
    sheet = Image.new("RGB", (sw * cols, sh * rows), (255, 255, 255))
    for i, frame in enumerate(frames):
        sheet.paste(frame.resize((sw, sh), Image.LANCZOS), ((i % cols) * sw, (i // cols) * sh))
    return sheet.quantize(colors=colors, method=Image.MEDIANCUT)


def _quantize(frames, colors: int):
    """Приводит кадры к общей палитре (одинаковые цвета во всём GIF)."""
    palette = _master_palette(frames, colors)
    return [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]


def save_gif(frames, path: Path, duration_ms: int = 90) -> int:
    """Собирает GIF из кадров, при необходимости уменьшая палитру и размер."""
    rgb = [f.convert("RGB") for f in frames]
    best = 0
    for colors in (128, 96, 64, 48):
        for scale in (1.0, 0.85, 0.7):
            if scale == 1.0:
                work = rgb
            else:
                w = max(1, int(rgb[0].width * scale))
                h = max(1, int(rgb[0].height * scale))
                work = [f.resize((w, h), Image.LANCZOS) for f in rgb]
            qframes = _quantize(work, colors)
            qframes[0].save(
                path,
                save_all=True,
                append_images=qframes[1:],
                duration=duration_ms,
                loop=0,
                optimize=True,
                disposal=2,
            )
            best = path.stat().st_size
            if best <= GIF_MAX_KB * 1024:
                return best
    print("  ! GIF больше %d KB даже после сжатия: %s" % (GIF_MAX_KB, path.name))
    return best


def render_frames(draw, n_frames: int, figsize, dpi: int):
    """Рендерит кадры анимации в память (PNG в BytesIO -> PIL Image)."""
    frames = []
    for i in range(n_frames):
        fig = plt.figure(figsize=figsize, dpi=dpi)
        draw(fig, i, n_frames)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", facecolor=BG)
        plt.close(fig)
        buf.seek(0)
        frames.append(Image.open(buf).convert("RGB"))
    return frames


def style_2d(ax, grid: bool = False) -> None:
    """Убирает рамки осей, при желании оставляет тонкую серую сетку."""
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.tick_params(length=0, labelsize=10)
    if grid:
        ax.grid(True, color=LIGHT, lw=0.8, zorder=0)
        ax.set_axisbelow(True)


# --------------------------------------------------------------------------- #
# Точная математика моделей (числа на графиках берутся отсюда)
# --------------------------------------------------------------------------- #

H1 = np.array([[1, 1], [1, -1]], dtype=complex) / math.sqrt(2)
X1 = np.array([[0, 1], [1, 0]], dtype=complex)


def grover_matrices(n_qubits: int = 2, marked: str = "11"):
    """Матрицы оракула и диффузора Гровера (точная модель).

    Оракул:   |x> -> (-1)^{f(x)} |x>,  f(x) = 1 для отмеченной строки.
    Диффузор: D = H^n . X^n . CZ . X^n . H^n (для n = 2 это 2|s><s| - I).
    """
    dim = 2 ** n_qubits
    oracle = np.eye(dim, dtype=complex)
    for i in range(dim):
        if format(i, "0%db" % n_qubits) == marked:
            oracle[i, i] = -1.0
    hn = np.array([[1]], dtype=complex)
    xn = np.array([[1]], dtype=complex)
    for _ in range(n_qubits):
        hn = np.kron(hn, H1)
        xn = np.kron(xn, X1)
    cz = np.eye(dim, dtype=complex)
    for i in range(dim):
        if format(i, "0%db" % n_qubits) == "1" * n_qubits:
            cz[i, i] = -1.0
    diffuser = hn @ xn @ cz @ xn @ hn
    return oracle, diffuser


def grover_states(n_qubits: int = 2, marked: str = "11", steps: int = 4):
    """Состояния и вероятности после 0, 1, 2, ... полных шагов Гровера."""
    oracle, diffuser = grover_matrices(n_qubits, marked)
    dim = 2 ** n_qubits
    state = np.ones(dim, dtype=complex) / math.sqrt(dim)  # равномерная суперпозиция
    states = [state.copy()]
    probs = [np.abs(state) ** 2]
    for _ in range(steps):
        state = diffuser @ (oracle @ state)
        states.append(state.copy())
        probs.append(np.abs(state) ** 2)
    return states, probs


def grover_oracle_state(n_qubits: int = 2, marked: str = "11"):
    """Состояние после оракула, но до диффузора (фазовая отметка элемента)."""
    oracle, _ = grover_matrices(n_qubits, marked)
    dim = 2 ** n_qubits
    state = np.ones(dim, dtype=complex) / math.sqrt(dim)
    return oracle @ state


def grover_amplitudes(k: float, n_qubits: int = 2, marked_count: int = 1):
    """Замкнутая форма амплитуд Гровера.

    theta = arcsin(sqrt(M/N));  a_отмеченный = sin((2k+1)theta),
    a_остальные = cos((2k+1)theta)/sqrt(N-1).
    """
    n_states = 2 ** n_qubits
    theta = math.asin(math.sqrt(marked_count / n_states))
    a_marked = math.sin((2 * k + 1) * theta)
    a_other = math.cos((2 * k + 1) * theta) / math.sqrt(n_states - 1)
    return a_marked, a_other, theta


def bloch_vector(theta: float, phi: float) -> np.ndarray:
    """Декартовы координаты состояния на сфере Блоха."""
    return np.array(
        [math.sin(theta) * math.cos(phi), math.sin(theta) * math.sin(phi), math.cos(theta)]
    )


# --------------------------------------------------------------------------- #
# 1. Сфера Блоха
# --------------------------------------------------------------------------- #


def figure_bloch_sphere() -> None:
    fig = plt.figure(figsize=(7.7, 6.0), dpi=DPI)
    ax = fig.add_subplot(111, projection="3d")
    ax.set_box_aspect((1, 1, 1))
    fig.subplots_adjust(left=0.02, right=0.98, top=0.97, bottom=0.07)
    ax.set_axis_off()

    u = np.linspace(0, 2 * np.pi, 80)
    v = np.linspace(0, math.pi, 50)
    sx = np.outer(np.cos(u), np.sin(v))
    sy = np.outer(np.sin(u), np.sin(v))
    sz = np.outer(np.ones_like(u), np.cos(v))
    ax.plot_surface(sx, sy, sz, color=BLUE, alpha=0.07, linewidth=0, shade=False, zorder=0)

    ring = np.linspace(0, 2 * math.pi, 240)
    ax.plot(np.cos(ring), np.sin(ring), np.zeros_like(ring), color=LIGHT, lw=1.6, zorder=1)
    ax.plot(np.cos(ring), np.zeros_like(ring), np.sin(ring), color=LIGHT, lw=1.2,
            ls=(0, (6, 5)), zorder=1)

    # оси: X - синяя, Y - фиолетовая, Z - тёмная
    for vec, color in (((1.26, 0, 0), BLUE), ((0, 1.26, 0), PURPLE), ((0, 0, 1.26), INK)):
        ax.quiver(0, 0, 0, *vec, color=color, lw=2.0, arrow_length_ratio=0.10, zorder=4)
        ax.plot([-vec[0], 0], [-vec[1], 0], [-vec[2], 0], color=color, lw=1.0,
                ls=(0, (4, 4)), alpha=0.45, zorder=2)

    def label(point, text, color, size=13, ha="center", va="center", **kw):
        ax.text(point[0], point[1], point[2], text, color=color, fontsize=size,
                ha=ha, va=va, zorder=9, **kw)

    label((0, 0, 1.30), "|0⟩", PURPLE, ha="center", va="bottom")
    label((-0.26, 0, 1.20), "Z", GRAY, 11, ha="right")
    label((0, 0, -1.30), "|1⟩", PURPLE, ha="center", va="top")
    label((1.20, 0, 0.26), "|+⟩", BLUE, ha="left")
    label((1.40, 0, 0.02), "X", GRAY, 11, ha="left")
    label((-1.20, 0, 0.26), "|−⟩", BLUE, ha="right")
    label((0, 1.20, 0.26), "|+i⟩", PURPLE, ha="left")
    label((0, 1.40, -0.18), "Y", GRAY, 11, ha="left")
    label((0, -1.20, 0.26), "|−i⟩", PURPLE, ha="right")

    # состояние |+> = (|0> + |1>)/sqrt(2)
    vec = bloch_vector(math.pi / 2, 0.0)
    ax.plot([0, vec[0]], [0, vec[1]], [0, vec[2]], color=ORANGE, lw=3.4, zorder=6)
    ax.scatter([vec[0]], [vec[1]], [vec[2]], s=110, color=ORANGE, zorder=7,
               edgecolors=BG, linewidths=1.5)

    arc = np.linspace(0, math.pi / 2, 80)
    ax.plot(np.sin(arc), np.zeros_like(arc), np.cos(arc), color=ORANGE, lw=1.4,
            ls=(0, (3, 3)), alpha=0.9, zorder=5)
    label((math.sin(math.radians(24)), 0, math.cos(math.radians(24))), "θ = 90°",
          ORANGE, 12, bbox=dict(fc=BG, ec="none", alpha=0.85, pad=1.5))

    fig.text(0.5, 0.055,
             r"$|\psi\rangle = \cos(\theta/2)|0\rangle + e^{i\varphi}\sin(\theta/2)|1\rangle$",
             ha="center", va="center", fontsize=13, color=INK)
    fig.text(0.5, 0.018,
             "Оранжевый вектор — состояние |+⟩ (θ = 90°, φ = 0). Оси: X — синяя, Y — фиолетовая, Z — тёмная.",
             ha="center", va="center", fontsize=10, color=GRAY)
    fig.text(0.5, 0.955, "Сфера Блоха: состояние одного кубита",
             ha="center", va="center", fontsize=14, color=INK)
    ax.view_init(elev=18, azim=-58)
    save_png(fig, OUT_DIR / "bloch-sphere.png")


# --------------------------------------------------------------------------- #
# 2. Окружность фаз
# --------------------------------------------------------------------------- #


def figure_phase_circle() -> None:
    fig = plt.figure(figsize=(7.7, 5.6), dpi=DPI)
    ax = fig.add_subplot(111)
    fig.subplots_adjust(left=0.07, right=0.93, top=0.88, bottom=0.30)
    style_2d(ax)
    ax.set_aspect("equal")
    ax.set_xlim(-1.5, 1.5)
    ax.set_ylim(-1.25, 1.45)
    ax.set_xticks([])
    ax.set_yticks([])

    ax.add_patch(Circle((0, 0), 1.0, fill=False, color=LIGHT, lw=2.0, zorder=1))
    ax.plot([-1.02, 1.02], [0, 0], color=LIGHT, lw=1.0, zorder=1)
    ax.plot([0, 0], [-1.02, 1.02], color=LIGHT, lw=1.0, zorder=1)
    ax.text(1.12, 0.1, "Re", color=GRAY, fontsize=11, ha="left", va="bottom")
    ax.text(-0.1, 1.12, "Im", color=GRAY, fontsize=11, ha="right", va="bottom")

    marks = [
        (0.0, "0", INK, "bottom"),
        (math.pi / 4, "π/4  (T)", ORANGE, "left"),
        (math.pi / 2, "π/2  (S)", ORANGE, "left"),
        (math.pi, "π", INK, "pi"),
        (3 * math.pi / 2, "3π/2", INK, "right"),
    ]
    for ang, name, color, side in marks:
        x, y = math.cos(ang), math.sin(ang)
        ax.plot([x * 0.86, x * 1.06], [y * 0.86, y * 1.06], color=color, lw=2.2, zorder=3)
        ax.scatter([x * 1.06], [y * 1.06], s=52, color=color, zorder=4)
        if side == "left":
            ax.text(x * 1.12, y * 1.12, name, color=color, fontsize=13, ha="left", va="center")
        elif side == "right":
            ax.text(x * 1.12, y * 1.12, name, color=color, fontsize=13, ha="right", va="center")
        elif side == "pi":
            ax.text(x * 1.16, 0.12, name, color=color, fontsize=13, ha="right", va="bottom")
        else:
            ax.text(x * 1.12, y * 1.12 - 0.1, name, color=color, fontsize=13, ha="center",
                    va="top")

    phi = math.pi / 6
    ax.annotate("", xy=(math.cos(phi), math.sin(phi)), xytext=(0, 0),
                arrowprops=dict(arrowstyle="-|>", color=PURPLE, lw=3.0, mutation_scale=22),
                zorder=6)
    ax.scatter([0], [0], s=26, color=INK, zorder=6)
    arc = np.linspace(0, phi, 100)
    ax.plot(0.32 * np.cos(arc), 0.32 * np.sin(arc), color=PURPLE, lw=1.6, zorder=5)
    ax.text(0.46, 0.02, "φ", color=PURPLE, fontsize=12, ha="left", va="center")

    fig.text(0.5, 0.945, "Окружность фаз: относительная фаза кубита",
             ha="center", va="center", fontsize=14, color=INK)
    fig.text(0.5, 0.215,
             "Фиолетовая стрелка — текущая фаза: φ = π/6 = 30° (пример).",
             ha="center", va="center", fontsize=11.5, color=PURPLE)
    fig.text(0.5, 0.135,
             r"Глобальная фаза $e^{i\varphi}$ не наблюдаема: состояния $|\psi\rangle$ и "
             r"$e^{i\varphi}|\psi\rangle$ дают одинаковые вероятности.",
             ha="center", va="center", fontsize=11, color=INK)
    fig.text(0.5, 0.06,
             "Наблюдаема только относительная фаза между |0⟩ и |1⟩: "
             "S-гейт добавляет π/2, T-гейт — π/4.",
             ha="center", va="center", fontsize=11, color=GRAY)
    save_png(fig, OUT_DIR / "phase-circle.png")


# --------------------------------------------------------------------------- #
# 3. Решётка surface code
# --------------------------------------------------------------------------- #


def figure_surface_code() -> None:
    fig = plt.figure(figsize=(7.7, 6.0), dpi=DPI)
    ax = fig.add_subplot(111)
    fig.subplots_adjust(left=0.01, right=0.62, top=0.88, bottom=0.18)
    style_2d(ax)
    ax.set_aspect("equal")
    ax.set_xlim(-1.5, 2.5)
    ax.set_ylim(-1.2, 3.1)
    ax.set_xticks([])
    ax.set_yticks([])

    half = 0.36

    def plaquette(cx, cy, kind):
        color = ORANGE if kind == "X" else BLUE
        soft = ORANGE_SOFT if kind == "X" else BLUE_SOFT
        ax.add_patch(FancyBboxPatch((cx - half, cy - half), 2 * half, 2 * half,
                                    boxstyle="round,pad=0.04", fc=soft, ec=color,
                                    lw=1.6, zorder=2))
        ax.text(cx, cy, kind, color=color, fontsize=15, ha="center", va="center",
                fontweight="bold", zorder=3)

    plaquette(0.5, 0.5, "X")
    plaquette(1.5, 0.5, "Z")
    plaquette(0.5, 1.5, "Z")
    plaquette(1.5, 1.5, "X")
    plaquette(0.5, -0.5, "Z")
    plaquette(1.5, -0.5, "X")
    plaquette(0.5, 2.5, "X")
    plaquette(1.5, 2.5, "Z")

    for col in range(3):
        for row in range(3):
            ax.add_patch(Circle((col, row), 0.13, fc=BG, ec=INK, lw=1.8, zorder=4))
            ax.scatter([col], [row], s=13, color=INK, zorder=5)

    ax.text(-1.45, 1.0, "кубиты данных (3 × 3)", color=GRAY, fontsize=10.5,
            ha="left", va="center", rotation=90)

    handles = [
        Line2D([], [], marker="o", color="none", markerfacecolor=BG, markeredgecolor=INK,
               markersize=11, label="кубит данных"),
        Line2D([], [], marker="s", color="none", markerfacecolor=ORANGE_SOFT,
               markeredgecolor=ORANGE, markersize=13, label="X-стабилизатор"),
        Line2D([], [], marker="s", color="none", markerfacecolor=BLUE_SOFT,
               markeredgecolor=BLUE, markersize=13, label="Z-стабилизатор"),
    ]
    fig.legend(handles=handles, loc="center left", bbox_to_anchor=(0.66, 0.55),
               handletextpad=0.7, borderaxespad=0.0, labelspacing=1.1)

    fig.text(0.5, 0.945, "Surface code: решётка кубитов данных и стабилизаторы",
             ha="center", va="center", fontsize=14, color=INK)
    fig.text(0.5, 0.085,
             "Плакеты (X и Z) чередуются; измерение стабилизаторов даёт синдромы ошибки.",
             ha="center", va="center", fontsize=11, color=INK)
    fig.text(0.5, 0.035,
             "Код дистанции d = 3 исправляет одну ошибку: t = ⌊(d − 1)/2⌋ = 1.",
             ha="center", va="center", fontsize=11, color=GRAY)
    save_png(fig, OUT_DIR / "surface-code-lattice.png")


# --------------------------------------------------------------------------- #
# 4. Карты связности (схематично)
# --------------------------------------------------------------------------- #


def _draw_graph(ax, nodes, edges, connectors=(), node_color=BLUE) -> None:
    for a, b in edges:
        ax.plot([nodes[a][0], nodes[b][0]], [nodes[a][1], nodes[b][1]],
                color=GRAY, lw=1.7, zorder=1, solid_capstyle="round")
    for i, (x, y) in enumerate(nodes):
        if i in connectors:
            ax.add_patch(Rectangle((x - 0.17, y - 0.17), 0.34, 0.34, fc=BG, ec=ORANGE,
                                   lw=2.0, zorder=3))
        else:
            ax.add_patch(Circle((x, y), 0.17, fc=node_color, ec=BG, lw=1.6, zorder=4))


def figure_coupling_maps() -> None:
    fig, axes = plt.subplots(1, 3, figsize=(7.7, 3.4), dpi=DPI)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.74, bottom=0.18, wspace=0.1)
    titles = ["Линейная цепочка", "Решётка 2 × 3", "Фрагмент heavy-hex"]

    # 1. цепочка
    ax = axes[0]
    style_2d(ax)
    ax.set_aspect("equal")
    nodes = [(i, 0.0) for i in range(5)]
    edges = [(i, i + 1) for i in range(4)]
    _draw_graph(ax, nodes, edges)
    ax.set_xlim(-0.6, 4.6)
    ax.set_ylim(-1.15, 0.95)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.text(2.0, -0.8, "соседи только слева и справа", color=GRAY, fontsize=9.5,
            ha="center", va="center")

    # 2. решётка 2 x 3
    ax = axes[1]
    style_2d(ax)
    ax.set_aspect("equal")
    nodes = [(c, 1.0 - r) for r in range(2) for c in range(3)]
    index = {(c, r): r * 3 + c for r in range(2) for c in range(3)}
    edges = []
    for r in range(2):
        for c in range(3):
            if c < 2:
                edges.append((index[(c, r)], index[(c + 1, r)]))
            if r < 1:
                edges.append((index[(c, r)], index[(c, r + 1)]))
    _draw_graph(ax, nodes, edges)
    ax.set_xlim(-0.7, 2.7)
    ax.set_ylim(-1.05, 1.85)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.text(1.0, -0.68, "соседи по стороне", color=GRAY, fontsize=9.5, ha="center", va="center")

    # 3. фрагмент heavy-hex: гексагон, часть рёбер идёт через связки (degree 2)
    ax = axes[2]
    style_2d(ax)
    ax.set_aspect("equal")
    hex_pts = [(math.cos(math.radians(60 * i)), math.sin(math.radians(60 * i)))
               for i in range(6)]
    nodes = list(hex_pts)
    edges = [(i, (i + 1) % 6) for i in range(6)]
    connectors = []
    for i in (0, 2, 4):
        mid = ((hex_pts[i][0] + hex_pts[(i + 1) % 6][0]) / 2.0,
               (hex_pts[i][1] + hex_pts[(i + 1) % 6][1]) / 2.0)
        connectors.append(len(nodes))
        nodes.append(mid)
    nodes.append((2.05, 0.0))
    edges.append((0, 6))
    nodes.append((-2.05, 0.0))
    edges.append((3, 7))
    _draw_graph(ax, nodes, edges, connectors=connectors)
    ax.set_xlim(-2.5, 2.5)
    ax.set_ylim(-1.35, 1.75)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.text(-2.42, 1.55, "квадрат — связка (degree 2)", color=GRAY, fontsize=9.5,
            ha="left", va="center")

    for x, title in zip((0.17, 0.5, 0.83), titles):
        fig.text(x, 0.795, title, ha="center", va="center", fontsize=12.5, color=INK)

    fig.text(0.5, 0.945, "Типы карт связности квантовых процессоров",
             ha="center", va="center", fontsize=14, color=INK)
    fig.text(0.5, 0.035,
             "Схематично: показаны типы связности, а не данные конкретного устройства.",
             ha="center", va="center", fontsize=11, color=GRAY)
    save_png(fig, OUT_DIR / "coupling-maps.png")


# --------------------------------------------------------------------------- #
# 5. Блок-схема цикла коррекции ошибок
# --------------------------------------------------------------------------- #


def figure_qec_cycle() -> None:
    fig = plt.figure(figsize=(7.7, 4.6), dpi=DPI)
    ax = fig.add_subplot(111)
    fig.subplots_adjust(left=0.02, right=0.98, top=0.86, bottom=0.14)
    style_2d(ax)
    ax.set_xlim(0, 10)
    ax.set_ylim(0.8, 6.2)
    ax.set_xticks([])
    ax.set_yticks([])

    def box(cx, cy, w, h, title, subtitle, color, soft, title_size=12):
        ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h,
                                    boxstyle="round,pad=0.06", fc=soft, ec=color,
                                    lw=1.8, zorder=2))
        ax.text(cx, cy + 0.18, title, color=INK, fontsize=title_size, ha="center",
                va="center", zorder=3)
        ax.text(cx, cy - 0.3, subtitle, color=GRAY, fontsize=9.5, ha="center",
                va="center", zorder=3)

    def arrow(x1, y1, x2, y2, color=GRAY, lw=1.8):
        ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", color=color,
                                     lw=lw, mutation_scale=18, zorder=4,
                                     shrinkA=2, shrinkB=2))

    box(1.95, 3.95, 3.0, 1.25, "Измерение синдромов", "S₁, S₂, … — стабилизаторы",
        BLUE, BLUE_SOFT, 11.5)
    box(5.2, 3.95, 2.7, 1.25, "Декодирование", "синдром → цепочка ошибок",
        PURPLE, PURPLE_SOFT, 11.5)
    box(8.4, 3.95, 3.0, 1.25, "Применение коррекции", "X или Z на нужном кубите",
        ORANGE, ORANGE_SOFT, 11.5)

    arrow(3.52, 3.95, 3.93, 3.95, INK)
    arrow(6.45, 3.95, 6.83, 3.95, INK)

    box(1.95, 5.75, 3.0, 0.95, "Ошибка на данных", "шум: X, Y, Z", GRAY, "#f1f2f4", 11.5)
    arrow(1.95, 5.22, 1.95, 4.62, GRAY)

    # цикл повторения
    ax.add_patch(FancyArrowPatch((8.4, 3.28), (8.4, 1.95), arrowstyle="-|>", color=PURPLE,
                                 lw=1.8, mutation_scale=18, zorder=4, shrinkA=2, shrinkB=2))
    ax.add_patch(FancyArrowPatch((8.4, 1.95), (1.95, 1.95), arrowstyle="-", color=PURPLE,
                                 lw=1.8, zorder=4, shrinkA=0, shrinkB=0))
    ax.add_patch(FancyArrowPatch((1.95, 1.95), (1.95, 3.28), arrowstyle="-|>", color=PURPLE,
                                 lw=1.8, mutation_scale=18, zorder=4, shrinkA=0, shrinkB=2))
    ax.text(5.15, 1.72, "следующий раунд: измерение снова идёт по кругу",
            color=PURPLE, fontsize=10.5, ha="center", va="center")

    ax.text(5.2, 2.95, "декодер: MWPM, union-find", color=GRAY, fontsize=9.5,
            ha="center", va="center")
    ax.text(8.4, 2.95, "логические данные целы", color=GRAY, fontsize=9.5,
            ha="center", va="center")

    fig.text(0.5, 0.945, "Цикл коррекции квантовых ошибок", ha="center", va="center",
             fontsize=14, color=INK)
    fig.text(0.5, 0.045,
             "Один раунд QEC: измерение синдромов не разрушает закодированное состояние.",
             ha="center", va="center", fontsize=11, color=GRAY)
    save_png(fig, OUT_DIR / "qec-cycle.png")


# --------------------------------------------------------------------------- #
# 6. Гровер: вероятность и амплитуды (точная модель)
# --------------------------------------------------------------------------- #


def figure_grover_iterations() -> None:
    fig, axes = plt.subplots(1, 2, figsize=(7.7, 4.6), dpi=DPI)
    fig.subplots_adjust(left=0.09, right=0.97, top=0.84, bottom=0.24, wspace=0.34)

    n_qubits, marked = 2, "11"
    _, probs = grover_states(n_qubits, marked, steps=3)
    theta = math.asin(math.sqrt(1 / 4))  # = pi/6

    # --- панель А: вероятность по итерациям -------------------------------
    ax = axes[0]
    style_2d(ax, grid=True)
    ks = np.linspace(0, 3, 241)
    curve = np.sin((2 * ks + 1) * theta) ** 2
    ax.plot(ks, curve, color=BLUE, lw=2.0, alpha=0.5, zorder=2)
    ints = [0, 1, 2, 3]
    vals = [probs[k][3] for k in ints]
    ax.plot(ints, vals, "o", color=BLUE, ms=9, zorder=4)
    offsets = [(0, 12), (0, 12), (0, 12), (0, -18)]
    for (k, v), off in zip(zip(ints, vals), offsets):
        ax.annotate("%.2f" % v, (k, v), textcoords="offset points", xytext=off,
                    ha="center", fontsize=10, color=BLUE)
    ax.axhline(0.25, color=GRAY, lw=1.1, ls=(0, (5, 4)), zorder=1)
    ax.text(-0.22, 0.2, "равномерная суперпозиция: 0.25", color=GRAY, fontsize=9,
            ha="left", va="top")
    ax.axvline(1, color=ORANGE, lw=1.2, ls=(0, (3, 3)), zorder=1)
    ax.text(1.06, 0.06, "k_opt = 1", color=ORANGE, fontsize=10.5, ha="left", va="bottom")
    ax.set_xlim(-0.3, 3.3)
    ax.set_ylim(0, 1.15)
    ax.set_xticks(ints)
    ax.set_yticks([0, 0.25, 0.5, 0.75, 1.0])
    ax.set_xlabel("номер итерации k")
    ax.set_ylabel("P(найти отмеченный)")
    ax.set_title("P(отмеченного) по итерациям", fontsize=12.5, pad=9)

    # --- панель Б: амплитуды до и после одной итерации --------------------
    ax = axes[1]
    style_2d(ax, grid=True)
    basis = ["|00⟩", "|01⟩", "|10⟩", "|11⟩"]
    after_oracle = np.real(grover_oracle_state(n_qubits, marked))
    states1, _ = grover_states(n_qubits, marked, steps=1)
    state1 = states1[1]
    if state1[3].real < 0:  # фиксируем общий знак (глобальную фазу)
        state1 = -state1
    after_iter = np.real(state1)
    idx = np.arange(4)
    w = 0.38
    ax.bar(idx - w / 2, after_oracle, w, color=BLUE, zorder=3,
           label="после оракула, до диффузора")
    ax.bar(idx + w / 2, after_iter, w, color=ORANGE, zorder=3,
           label="после одной полной итерации")
    for i, (a, b) in enumerate(zip(after_oracle, after_iter)):
        ax.text(i - w / 2, a + (0.07 if a >= 0 else -0.20), "%.2f" % a, ha="center",
                fontsize=9, color=BLUE)
        ax.text(i + w / 2, b + (0.07 if b >= 0 else -0.20), "%.2f" % b, ha="center",
                fontsize=9, color=ORANGE)
    ax.axvspan(2.62, 3.38, color=ORANGE_SOFT, zorder=0)
    ax.text(3, 1.26, "отмеченный", color=ORANGE, fontsize=9.5, ha="center", va="center")
    ax.set_xticks(idx)
    ax.set_xticklabels(basis)
    ax.set_ylim(-1.35, 1.45)
    ax.set_ylabel("амплитуда")
    ax.set_title("Амплитуды при одной итерации", fontsize=12.5, pad=9)
    ax.legend(loc="lower left", fontsize=9.5)

    fig.text(0.5, 0.945, "Алгоритм Гровера: рост амплитуды отмеченного элемента",
             ha="center", va="center", fontsize=14, color=INK)
    fig.text(0.5, 0.095,
             "Значения точны: 2 кубита (N = 4), отмечен один элемент, "
             r"P(k) = sin²((2k+1)θ), θ = π/6.",
             ha="center", va="center", fontsize=10.5, color=INK)
    fig.text(0.5, 0.048,
             "Общий знак амплитуд — глобальная фаза: вероятности не меняет.",
             ha="center", va="center", fontsize=9.5, color=GRAY)
    fig.text(0.5, 0.012,
             "После k_opt итерации ухудшают результат.",
             ha="center", va="center", fontsize=9.5, color=GRAY)
    save_png(fig, OUT_DIR / "grover-iterations.png")


# --------------------------------------------------------------------------- #
# 7. Анимация: вращение вектора состояния по сфере Блоха
# --------------------------------------------------------------------------- #


def animation_bloch_rotation(n_frames: int = 24) -> None:
    elev = math.radians(30.0)
    sy = math.sin(elev)
    cz = math.cos(elev)

    def draw(fig, i, total):
        ax = fig.add_subplot(111)
        fig.subplots_adjust(left=0.05, right=0.95, top=0.80, bottom=0.18)
        style_2d(ax)
        ax.set_aspect("equal")
        ax.set_xlim(-1.6, 1.6)
        ax.set_ylim(-1.3, 1.4)
        ax.set_xticks([])
        ax.set_yticks([])

        phi = 2 * math.pi * i / total
        px, py = math.cos(phi), -math.sin(phi) * sy

        ax.add_patch(Circle((0, 0), 1.0, fill=False, color=LIGHT, lw=1.8, zorder=1))
        mer = np.linspace(0, 2 * math.pi, 200)
        ax.plot(np.cos(mer), cz * np.sin(mer), color=LIGHT, lw=1.2, ls=(0, (6, 5)), zorder=1)
        ax.plot([0, 0], [-cz, cz], color=LIGHT, lw=1.4, zorder=1)
        ax.plot([0], [0], marker="o", ms=7, color=INK, zorder=3)

        for ang, label, lx in ((math.pi / 2, "S", 0.12), (math.pi / 4, "T", 0.0)):
            ax.plot([math.cos(ang) * 0.88], [-math.sin(ang) * sy * 0.88], "o", ms=6,
                    color=ORANGE, zorder=3)
            ax.text(math.cos(ang) * 1.02 + lx, -math.sin(ang) * sy * 1.02, label, color=ORANGE,
                    fontsize=11, ha="center", va="center")

        ax.text(0, cz + 0.08, "|0⟩", color=PURPLE, fontsize=13, ha="center", va="bottom")
        ax.text(0, -cz - 0.08, "|1⟩", color=PURPLE, fontsize=13, ha="center", va="top")

        ax.annotate("", xy=(px, py), xytext=(0, 0),
                    arrowprops=dict(arrowstyle="-|>", color=BLUE, lw=3.0, mutation_scale=20),
                    zorder=5)
        ax.scatter([px], [py], s=90, color=BLUE, zorder=6, edgecolors=BG, linewidths=1.5)

        ket = ["|+⟩", "|+i⟩", "|−⟩", "|−i⟩"][int(round(i / total * 4)) % 4]
        ax.text(0.02, 1.06, "Вращение вокруг оси Z: накопление фазы φ",
                transform=ax.transAxes, fontsize=12.5, color=INK, va="top")
        ax.text(0.02, 0.98,
                "φ = %d°   ·   состояние %s   ·   θ = 90°"
                % (round(phi * 180 / math.pi), ket),
                transform=ax.transAxes, fontsize=11.5, color=BLUE, va="top")
        ax.text(0.5, 0.02,
                "Точка движется по экватору сферы Блоха: растёт относительная фаза.",
                transform=ax.transAxes, fontsize=10, color=GRAY, ha="center", va="center")

    frames = render_frames(draw, n_frames, (6.4, 4.6), GIF_DPI)
    save_gif(frames, GIF_DIR / "bloch-rotation.gif", duration_ms=90)


# --------------------------------------------------------------------------- #
# 8. Анимация: цикл коррекции ошибок (3-кубитный код)
# --------------------------------------------------------------------------- #


def animation_qec_cycle(n_frames: int = 24) -> None:
    def phase_of(i):
        if i < 5:
            return "idle"
        if i < 8:
            return "error"
        if i < 12:
            return "measure"
        if i < 16:
            return "syndrome"
        if i < 20:
            return "fix"
        return "done"

    captions = {
        "idle": "Раунд коррекции: готовим измерение синдромов",
        "error": "Ошибка: X-гейт на кубите 2",
        "measure": "Измерение синдромов S₁ = Z₁Z₂ и S₂ = Z₂Z₃",
        "syndrome": "Синдром (−1, −1) → ошибка на кубите 2",
        "fix": "Коррекция: применяем X к кубиту 2",
        "done": "Ошибка исправлена, раунд повторяется",
    }

    def draw(fig, i, total):
        ax = fig.add_subplot(111)
        fig.subplots_adjust(left=0.04, right=0.96, top=0.86, bottom=0.16)
        style_2d(ax)
        ax.set_xlim(0, 6)
        ax.set_ylim(0, 5.2)
        ax.set_xticks([])
        ax.set_yticks([])

        stage = phase_of(i)
        pulse = 0.5 + 0.5 * math.sin(i / total * 2 * math.pi * 2)

        qx = [1.3, 3.0, 4.7]
        for k, x in enumerate(qx):
            ax.add_patch(Circle((x, 1.5), 0.32, fc=BG, ec=INK, lw=1.8, zorder=4))
            ax.text(x, 1.5, "q%d" % (k + 1), color=INK, fontsize=11, ha="center",
                    va="center", zorder=5)

        s1 = (2.15, 3.5)
        s2 = (3.85, 3.5)
        for (cx, cy), label, value in ((s1, "S₁ = Z₁Z₂", "−1"), (s2, "S₂ = Z₂Z₃", "−1")):
            active = stage in ("measure", "syndrome")
            edge = BLUE if active else GRAY
            face = BLUE_SOFT if active else "#f4f5f6"
            ax.add_patch(FancyBboxPatch((cx - 0.78, cy - 0.42), 1.56, 0.84,
                                        boxstyle="round,pad=0.05", fc=face, ec=edge,
                                        lw=1.8, zorder=3))
            ax.text(cx, cy + 0.14, label, color=INK if active else GRAY, fontsize=11,
                    ha="center", va="center", zorder=4)
            if stage in ("syndrome", "fix"):
                ax.text(cx, cy - 0.2, value, color=BLUE, fontsize=13, ha="center",
                        va="center", fontweight="bold", zorder=4)

        for x1, x2, (cx, cy) in ((qx[0], qx[1], s1), (qx[1], qx[2], s2)):
            ax.annotate("", xy=(cx, cy - 0.48), xytext=(x1 + (x2 - x1) * 0.5, 1.95),
                        arrowprops=dict(arrowstyle="-|>", color=GRAY if stage != "measure"
                                        else BLUE, lw=1.6, mutation_scale=15), zorder=2)

        if stage in ("error", "measure", "syndrome"):
            ax.add_patch(Circle((qx[1], 1.5), 0.42, fill=False, ec=ORANGE, lw=2.2,
                                alpha=0.5 + 0.5 * pulse, zorder=5))
            ax.text(qx[1] + 0.58, 1.5, "X", color=ORANGE, fontsize=17, ha="left",
                    va="center", fontweight="bold", zorder=6,
                    bbox=dict(fc=BG, ec="none", alpha=0.9, pad=1.0))
        if stage == "fix":
            ax.add_patch(Circle((qx[1], 1.5), 0.42, fill=False, ec=BLUE, lw=2.4,
                                alpha=0.4 + 0.6 * pulse, zorder=5))
            ax.text(qx[1] + 0.58, 1.5, "X", color=BLUE, fontsize=17, ha="left",
                    va="center", fontweight="bold", zorder=6,
                    bbox=dict(fc=BG, ec="none", alpha=0.9, pad=1.0))
        if stage == "done":
            ax.text(qx[1] + 0.52, 1.5, "OK", color=BLUE, fontsize=12, ha="left",
                    va="center", zorder=6, bbox=dict(fc=BG, ec="none", alpha=0.9, pad=1.0))

        ax.text(0.0, 4.85, captions[stage], color=INK, fontsize=12.5, va="center")
        ax.text(0.0, 0.45,
                "3-кубитный код против ошибок переворота бита: S₁ = Z₁Z₂, S₂ = Z₂Z₃",
                color=GRAY, fontsize=10, va="center")
        ax.text(6.0, 4.85, "раунд 1", color=GRAY, fontsize=11, va="center", ha="right")

    frames = render_frames(draw, n_frames, (6.4, 4.6), GIF_DPI)
    save_gif(frames, GIF_DIR / "qec-cycle.gif", duration_ms=110)


# --------------------------------------------------------------------------- #
# 9. Анимация: рост амплитуд Гровера
# --------------------------------------------------------------------------- #


def animation_grover(n_frames: int = 24) -> None:
    def draw(fig, i, total):
        ax = fig.add_subplot(111)
        fig.subplots_adjust(left=0.08, right=0.97, top=0.84, bottom=0.18)
        style_2d(ax, grid=True)

        k = 2.0 * i / (total - 1)
        a_marked, a_other, _ = grover_amplitudes(k, n_qubits=2, marked_count=1)
        amps = [a_other, a_other, a_other, a_marked]

        basis = ["|00⟩", "|01⟩", "|10⟩", "|11⟩"]
        colors = [GRAY, GRAY, GRAY, ORANGE]
        ax.bar(np.arange(4), amps, 0.62, color=colors, zorder=3)
        for j, a in enumerate(amps):
            ax.text(j, a + (0.07 if a >= 0 else -0.20), "%.2f" % a, ha="center",
                    fontsize=10, color=INK if j == 3 else GRAY)
        ax.axvline(1, color=BLUE, lw=1.2, ls=(0, (3, 3)), zorder=1)
        ax.text(1.09, 0.08, "k_opt = 1", color=BLUE, fontsize=10, ha="left", va="bottom")
        ax.set_xticks(np.arange(4))
        ax.set_xticklabels(basis)
        ax.set_ylim(-1.35, 1.35)
        ax.set_ylabel("амплитуда")
        ax.set_title("Гровер: амплитуда отмеченного элемента растёт", fontsize=12.5, pad=9)

        ax.text(0.02, 0.97,
                "k = %.2f   ·   P(отмеченный) = %.2f" % (k, a_marked ** 2),
                transform=ax.transAxes, fontsize=11.5, color=INK, va="top")
        fig.text(0.5, 0.045,
                 "Значения по точной формуле: P(k) = sin²((2k+1)θ), θ = π/6 (2 кубита, N = 4).",
                 ha="center", va="center", fontsize=9.5, color=GRAY)

    frames = render_frames(draw, n_frames, (6.4, 4.4), GIF_DPI)
    save_gif(frames, GIF_DIR / "grover-iterations.gif", duration_ms=90)


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

SPECIAL_CHARS = "⟩⟨ψφθπ√→±≈≤≥⊗⌊⌋·−×²³"


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    apply_style()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    GIF_DIR.mkdir(parents=True, exist_ok=True)

    missing = check_glyphs(SPECIAL_CHARS)
    if missing:
        print("  ! Нет глифов в DejaVu Sans: %s" % ", ".join(missing))

    print("Генерация иллюстраций в %s" % OUT_DIR)

    tasks = [
        ("bloch-sphere.png", figure_bloch_sphere),
        ("phase-circle.png", figure_phase_circle),
        ("surface-code-lattice.png", figure_surface_code),
        ("coupling-maps.png", figure_coupling_maps),
        ("qec-cycle.png", figure_qec_cycle),
        ("grover-iterations.png", figure_grover_iterations),
    ]
    for name, func in tasks:
        func()
        print("  [OK] %s" % name)

    gifs = [
        ("gif/bloch-rotation.gif", animation_bloch_rotation),
        ("gif/qec-cycle.gif", animation_qec_cycle),
        ("gif/grover-iterations.gif", animation_grover),
    ]
    for name, func in gifs:
        func()
        print("  [OK] %s" % name)

    print("\nСозданные файлы:")
    total = 0
    for name in [t[0] for t in tasks] + [g[0] for g in gifs]:
        path = OUT_DIR / name
        size = path.stat().st_size
        total += size
        print("  %-32s %8.1f KB" % (name, size / 1024))
    print("  %-32s %8.1f KB" % ("ВСЕГО", total / 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
