# Публикация курса

Короткий чек-лист: что сделать, чтобы репозиторий и сайт курса стали публичными. Имя репозитория зафиксировано — **`qc-design-course`**.

## 1. Локальная подготовка (уже сделано)

- `git init` выполнен, ветка `main`, файлы подготовлены к первому коммиту;
- **имя автора прописано в локальном конфиге репозитория**: `user.name = DrDimooon`, `user.email = DrDimooon@users.noreply.github.com` — это «безопасный» адрес GitHub: он не раскрывает личную почту, но коммиты при этом связываются с вашим аккаунтом и отображаются в вашем профиле;
- `.gitignore` на месте: `site/`, `.site-build/`, `.venv/`, `__pycache__/` и прочее не попадают в историю; `.gitattributes` фиксирует LF;
- лицензия — **MIT** (файл `LICENSE`), владелец — `DrDimooon`;
- `AUDIT-NOTES.md` — рабочий журнал аудита; он лежит в репозитории, но исключён из сборки сайта (`exclude_docs` в `mkdocs.yml`).

> **Чтобы коммиты привязывались к аккаунту**, в GitHub проверьте Settings → Emails: включите «Keep my email addresses private» и добавьте адрес `DrDimooon@users.noreply.github.com` (он же отображается как «noreply» в настройках). Если адрес не добавлен, GitHub не сопоставит коммиты с профилем, даже если они отправлены на него.

## 2. Первый коммит и удалённый репозиторий

```bash
git add -A
git commit -m "QC course: initial import (modules 00-06, labs, katas, projects, tests, resources)"

# создать пустой репозиторий на GitHub с именем qc-design-course (без README) и связать:
git remote add origin https://github.com/DrDimooon/qc-design-course.git
git push -u origin main
```

Токен понадобится только для `push` (GitHub → Settings → Developer settings → Personal access tokens → fine-grained, scope «Contents: read and write»). Альтернатива — GitHub CLI: `gh auth login`, затем `gh repo create qc-design-course --public --source=. --push`. Локальный `user.email` при этом уже не нужно настраивать: адрес noreply прописан в конфиге репозитория.

## 3. Оформление страницы репозитория

| Поле | Значение |
|---|---|
| Описание | «Учебный курс по проектированию и оптимизации квантовых компьютеров: 7 модулей, лабы, каты, проекты, экзамены» / «An engineering course on designing and optimizing quantum computers — modules, labs, katas, projects» |
| Темы (topics) | `quantum-computing`, `qiskit`, `quantum-error-correction`, `education`, `course`, `russian` |
| Лицензия | MIT (файл `LICENSE` уже в репозитории) |
| Сайт (в настройках) | `https://<ВАШ_ЛОГИН>.github.io/qc-design-course/` |

## 4. Сайт на GitHub Pages

Воркфлоу `.github/workflows/deploy-pages.yml` уже настроен: он собирает сайт через `tools/build_site.py --strict` (предупреждения = ошибки) и выкладывает его в Pages.

Остаётся один раз включить Pages: **Settings → Pages → Build and deployment → Source: GitHub Actions**. После этого каждый `push` в `main` будет пересобирать и передеплоивать сайт.

Адрес сайта: `https://<ВАШ_ЛОГИН>.github.io/qc-design-course/`.

## 5. Что попадёт на сайт (и что стоит проверить)

- В сборку попадают все 91 md-файл, включая **ключи с ответами** (`tests/answers/*`) — на них ведут прямые ссылки из квизов (20 штук), поэтому исключить их из сборки нельзя, не переписав ссылки. Если ответы нужно убрать с публичного сайта, это отдельная задача: перенести их в приватный репозиторий или заменить ссылки на «ключи лежат в репозитории» без прямой ссылки.
- `AUDIT-NOTES.md` и служебные каталоги (`site/`, `.site-build/`) на сайт не попадают.
- Локальная проверка перед пушем: `python tools/build_site.py --strict` и `python tools/build_site.py --serve` (открыть http://127.0.0.1:8000).

## 6. Полезные мелочи

- Домен: можно подключить свой (CNAME в ветке `gh-pages` или через `custom domain` в настройках Pages).
- Версионирование курса: теги `v1.0`, `v1.1` — по ним удобно ссылаться в README и в «Узнать подробнее».
- Зеркало для длинных материалов: `AUDIT-NOTES.md` удобно держать в репозитории как историю ревизий.
