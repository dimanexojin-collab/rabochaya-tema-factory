# Деплой сайта «Рабочая тема»

Адрес: `https://<owner>.github.io/rabochaya-tema-factory/` — проектный сайт GitHub Pages (корень аккаунта занят сайтом kontur).
Адрес задаётся при сборке двумя переменными окружения (см. `src/config/site.ts`):

| Переменная | Значение на GitHub Pages | Свой домен |
|---|---|---|
| `SITE` (или `SITE_ORIGIN`) | `https://<owner>.github.io` | `https://example.ru` |
| `BASE` (или `BASE_PATH`) | `/rabochaya-tema-factory/` | `/` |

Из них строятся все ссылки (`url()`), canonical, `og:url`/`og:image`, JSON-LD, sitemap, `robots.txt`, `site.webmanifest`.
Код при смене адреса не меняется.

## 1. Перед публикацией
```bash
npm ci
npm run check:todo          # что не заполнено в site.ts (график, карта, доставка…)
npm run build               # check:todo + astro check + astro build
npm run audit               # SEO-аудит dist/ (ошибки → код 1)
STRICT=1 npm run build      # перед боевым запуском: падает, если обязательные поля (график) ещё TODO
```
Фото: мастер-файлы лежат в `src/assets/**` (в git), CI их не пересчитывает. Пересборка фото — локально:
`node scripts/fetch-realesrgan.mjs` (Real-ESRGAN в папку `REALESRGAN_DIR`), затем `npm run images`, `npm run images:sheet`
(контактный лист для приёмки), `npm run assets` (иконки/OG). Оригиналы от заказчика → `source/originals/{id}.jpg`.

## 2. Репозиторий и первый пуш
1. Создать репозиторий **`rabochaya-tema-factory`** (public).
2. `git init && git add . && git commit -m "init" && git branch -M main && git remote add origin … && git push -u origin main`
   (`source/`, `PLAN.md`, `QUESTIONS.md` в git не попадают — см. `.gitignore`).
3. Settings → Pages → Source: **GitHub Actions**. Workflow `.github/workflows/deploy.yml` соберёт и опубликует сайт.
   Действия закреплены по SHA, права: `contents: read` по умолчанию, `pages: write` + `id-token: write` только у deploy.
4. Заголовки на GitHub Pages задать нельзя: CSP и referrer-policy заданы `<meta>` в `src/layouts/Base.astro`.

## 3. robots.txt и sitemap (важно для подкаталога)
Роботы читают только `https://<owner>.github.io/robots.txt` — это файл **репозитория kontur**. Файл
`/rabochaya-tema-factory/robots.txt` поисковики игнорируют (он заработает после переезда на свой домен).
1. В kontur, `src/pages/robots.txt.ts`, добавить строку (отдельный маленький коммит):
   `Sitemap: https://<owner>.github.io/rabochaya-tema-factory/sitemap-index.xml`
   и не ставить `Disallow` на `/rabochaya-tema-factory/`.
2. Служебные страницы (политика, 404) закрыты `<meta name="robots" content="noindex, follow">` и исключены из sitemap.
3. Google Search Console: добавить ресурс «Префикс URL» `https://<owner>.github.io/rabochaya-tema-factory/`, отправить sitemap.
4. Яндекс.Вебмастер подкаталог отдельным сайтом не принимает: sitemap добавляется в ресурс корневого хоста
   `https://<owner>.github.io/`.

## 4. Переезд на свой домен
1. В workflow: `SITE: https://example.ru`, `BASE: /`; в репозитории — `public/CNAME` с доменом; DNS — по инструкции GitHub Pages.
2. Старые адреса 5ni.ru → новые: `data/redirects.json` (пары «старый URL → новый») — для 301 на старом хостинге/nginx.
   GitHub Pages сам 301 делать не умеет (кроме добавления «/» в конце: `/optom` → `/optom/`).
   Пути `to` указаны **без base** — это верно для своего домена (BASE=/). Если 301 со старого сайта ставить, пока сайт
   живёт на github.io, к `to` нужно добавить `https://<owner>.github.io/rabochaya-tema` (иначе редирект уведёт на kontur).
   В `from` только `https://www.5ni.ru/…` — адреса без `www` и с `http://` сначала свести к `https://www.5ni.ru` одним правилом.
   Единственная запись с `"to": null` (`/nedruzhestvennye-gosudarstva`) — отдавать 410/404, пока заказчик не решит (QUESTIONS 13).
3. После переезда начнёт работать собственный `robots.txt`; строку из kontur можно убрать.

## 5. После деплоя
- `npm run preview` + `npm run lighthouse` локально (цели: mobile perf ≥ 95, SEO 100, a11y ≥ 95, BP 100).
- Проверить: `https://<owner>.github.io/rabochaya-tema-factory/`, `/rabochaya-tema-factory/sitemap-index.xml`, любую несуществующую
  страницу (должна открыться 404 с рабочими ссылками).
