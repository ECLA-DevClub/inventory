# Деплой: Railway + Supabase + Vercel

Документ описывает перенос бэкенда с Render на Railway и фотографий с Backblaze B2 на Supabase Storage.

---

## 1. Supabase Storage — хранилище фотографий

### 1.1. Создать bucket

1. Откройте проект в [supabase.com](https://supabase.com) → раздел **Storage**.
2. **New bucket**:
   - Name: `furniture-photos`
   - **Public bucket: включить.**
     Фото открываются по QR-коду без входа в систему, поэтому bucket должен быть публичным. Приватный режим тоже поддерживается (см. `SUPABASE_BUCKET_PUBLIC=false`), но тогда каждое фото идёт через бэкенд и грузится медленнее.
3. Create.

Альтернатива: bucket создаст скрипт миграции с флагом `--create-bucket` (шаг 4).

### 1.2. Взять ключи

**Project Settings → API:**

| Что | Куда |
|---|---|
| Project URL | `SUPABASE_URL` |
| `service_role` secret | `SUPABASE_SERVICE_KEY` |

> ⚠️ `service_role` — это ключ полного доступа в обход всех ограничений. Он используется **только на сервере**. Никогда не добавляйте его во фронтенд и не коммитьте в git.

---

## 2. Railway — бэкенд

### 2.1. Создать сервис

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → выберите репозиторий.
2. Откройте созданный сервис → **Settings**:
   - **Root Directory:** `backend`
     Это обязательно — иначе Railway не найдёт `Dockerfile` и `requirements.txt`.
   - **Builder:** Dockerfile (подхватится автоматически из `backend/railway.json`).

### 2.2. Задать переменные окружения

**Variables → Raw Editor**, вставить и заполнить:

```
SECRET_KEY=<сгенерировать>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

DATABASE_URL=<connection string из Supabase>

FRONTEND_PUBLIC_URL=https://<ваш-проект>.vercel.app
BACKEND_PUBLIC_URL=https://<ваш-сервис>.up.railway.app

SUPABASE_URL=https://<ваш-проект>.supabase.co
SUPABASE_SERVICE_KEY=<service_role secret>
SUPABASE_BUCKET=furniture-photos
SUPABASE_BUCKET_PUBLIC=true
SUPABASE_KEY_PREFIX=item_photos
MAX_PHOTO_SIZE_MB=10
```

Сгенерировать `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

`DATABASE_URL` берётся в Supabase: **Project Settings → Database → Connection string → URI**. Пароль подставляется вместо `[YOUR-PASSWORD]`.

> Порт задавать не нужно: Railway передаёт его через `PORT`, и `Dockerfile` это учитывает.

### 2.3. Получить домен

**Settings → Networking → Generate Domain.** Полученный адрес вида `https://xxx.up.railway.app`:

- впишите в переменную `BACKEND_PUBLIC_URL` этого же сервиса;
- впишите во фронтенд (шаг 3).

### 2.4. Проверить

```bash
curl https://<ваш-сервис>.up.railway.app/
```

Ожидаемый ответ:

```json
{"status":"online","message":"Inventory API is running","docs":"/docs"}
```

Документация API: `https://<ваш-сервис>.up.railway.app/docs`

---

## 3. Vercel — фронтенд

1. В файле `frontend/.env.production` заменить `REPLACE-ME` на домен Railway:

   ```
   VITE_API_URL=https://<ваш-сервис>.up.railway.app
   ```

2. Ту же переменную продублировать в Vercel: **Project Settings → Environment Variables** → `VITE_API_URL` для окружения Production.
3. Передеплоить проект.

> Переменные `VITE_*` вшиваются в бандл на этапе сборки. После их изменения обязательна пересборка — простого перезапуска недостаточно.

---

## 4. Перенос существующих фотографий

Если в базе уже есть мебель с фото на Backblaze B2 или в локальной папке `static/item_photos`, перенесите файлы.

Запускать из папки `backend` с заполненным `.env` (включая старые `S3_*` переменные, если фото лежат в B2):

```bash
# Посмотреть, что будет перенесено, ничего не меняя
python scripts/migrate_photos_to_supabase.py --create-bucket --dry-run

# Выполнить перенос
python scripts/migrate_photos_to_supabase.py --create-bucket
```

Скрипт идемпотентный — повторный запуск пропустит уже перенесённые записи.

После успешного переноса переменные `S3_*` можно удалить из Railway.

### Обратная совместимость

Пока фото не перенесены, старые ссылки продолжают работать: бэкенд читает их из B2 через эндпоинт `/furniture/photo-proxy/...`, если заданы переменные `S3_*`. Новые загрузки всегда идут в Supabase.

---

## 5. Отключение Render

Отключайте только после того, как:

- [ ] `/` на Railway отвечает `status: online`;
- [ ] вход в систему работает с домена Vercel;
- [ ] фотографии открываются в списке и в карточке мебели;
- [ ] загрузка нового фото сохраняется и отображается;
- [ ] старые фото перенесены скриптом (шаг 4).

Затем в Render: **Settings → Delete Service** либо приостановка сервиса.

---

## 6. Локальная разработка

```bash
cd backend
cp .env.example .env      # заполнить значения
python -m venv venv
venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

Если `DATABASE_URL` не задан, приложение поднимется на локальном SQLite (`backend/inventory.db`) — Postgres для разработки не обязателен.

Фронтенд:

```bash
cd frontend
npm install
npm run dev
```

Адрес бэкенда для разработки берётся из `frontend/.env` (`http://127.0.0.1:8000`).

---

## 7. Переменные окружения — справочник

| Переменная | Обязательна | Назначение |
|---|---|---|
| `SECRET_KEY` | да | Подпись JWT-токенов |
| `ALGORITHM` | нет | Алгоритм подписи, по умолчанию `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | нет | Время жизни токена, по умолчанию 60 |
| `DATABASE_URL` | да на проде | Строка подключения к PostgreSQL |
| `FRONTEND_PUBLIC_URL` | да | Домен фронтенда: CORS и ссылки в QR-кодах |
| `BACKEND_PUBLIC_URL` | да | Домен бэкенда: ссылки на фото в приватном режиме |
| `CORS_ORIGINS` | нет | Дополнительные домены для CORS, через запятую |
| `SUPABASE_URL` | да | URL проекта Supabase |
| `SUPABASE_SERVICE_KEY` | да | Ключ `service_role`, только сервер |
| `SUPABASE_BUCKET` | нет | Имя bucket, по умолчанию `furniture-photos` |
| `SUPABASE_BUCKET_PUBLIC` | нет | `true` — раздача через CDN, `false` — через бэкенд |
| `SUPABASE_KEY_PREFIX` | нет | Папка внутри bucket, по умолчанию `item_photos` |
| `MAX_PHOTO_SIZE_MB` | нет | Лимит размера фото, по умолчанию 10 |
| `S3_*` | нет | Легаси Backblaze B2, только чтение старых фото |
