# 🏭 IBM Calc Pro - Система управління ЧПУ виробництвом

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

Сучасна веб-система для управління виробництвом на станках з ЧПУ Star 206 та Tsugami 206 (Fanuc).

## 🎯 Ключові можливості

### 📊 Управління виробництвом
- ✅ Управління станками в режимі реального часу
- ✅ Планування та відстеження серій деталей
- ✅ Автоматичні розрахунки матеріалів та часу
- ✅ Моніторинг продуктивності

### 💻 Робота з G-code
- ✅ Парсинг та аналіз G-code
- ✅ 2D/3D візуалізація траєкторії
- ✅ Генерація програм для Fanuc
- ✅ AI-оптимізація коду

### 📈 Аналітика
- ✅ Dashboard з ключовими метриками
- ✅ OEE показники
- ✅ AI-powered аналіз даних
- ✅ Прогнозування

### 📱 Інтеграції
- ✅ Telegram бот для сповіщень
- ✅ Автоматична генерація звітів
- ✅ Експорт в PDF/Excel
- ✅ PWA для роботи офлайн

## 🚀 Швидкий старт

### Передумови

```bash
Node.js >= 18.0.0
npm >= 9.0.0
PostgreSQL >= 14
Redis (опціонально)
```

### Встановлення

1. **Клонування репозиторію**
```bash
git clone https://github.com/your-company/cnc-calc-pro.git
cd cnc-calc-pro
```

2. **Встановлення залежностей**
```bash
# Frontend
cd client
npm install

# Backend
cd ../server
npm install
```

3. **Налаштування оточення**
```bash
# Створіть .env файл для docker-compose та сервера
cp env.example .env
cp env.example server/.env
cp env.example client/.env

# Відредагуйте .env з вашими налаштуваннями
nano .env
```

4. **Налаштування бази даних**
```bash
# Створіть базу даних
createdb cnc_calc_pro

# Запустіть міграції
npm run migrate

# (Опціонально) Заповніть тестовими даними
npm run seed
```

5. **Запуск додатку**
```bash
# Development режим
npm run dev

# Production режим
npm run build
npm start
```

Додаток буде доступний за адресою: `http://localhost:3000`

## 📁 Структура проекту

```
cnc-calc-pro/
├── client/                 # React Frontend
│   ├── index.html         # UI прототип
│   ├── package.json
│   ├── src/
│   └── public/
├── server/                # Node.js Backend
│   ├── package.json
│   ├── src/
│   ├── scripts/
│   ├── uploads/
│   ├── logs/
│   └── backups/
├── database/              # База даних
│   ├── init/
│   │   └── 001-schema.sql
│   ├── migrations/
│   └── seeds/
├── docs/                  # Документація
│   ├── ARCHITECTURE.md
│   ├── PROJECT_SUMMARY.md
│   ├── API.md
│   └── USER_GUIDE.md
├── env.example
├── docker-compose.yml
├── package.json
└── README.md
```

## 🔧 Конфігурація

### .env файл

```env
# Server
NODE_ENV=production
PORT=3000
API_URL=http://localhost:3000/api

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cnc_calc_pro
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Claude AI
ANTHROPIC_API_KEY=your_anthropic_api_key

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# File Storage
UPLOAD_DIR=/uploads
MAX_FILE_SIZE=50MB
```

## 👥 Ролі користувачів

### 👑 Адміністратор
- Повний доступ до всіх функцій
- Управління користувачами
- Налаштування системи
- Доступ до всіх звітів

### 👔 Керівник
- Перегляд всіх станків та серій
- Доступ до аналітики
- Генерація звітів
- Планування виробництва

### 🔍 ВТК (Відділ технічного контролю)
- Контроль параметрів обробки
- Перевірка допусків
- Контроль якості
- Звіти з якості

### ⚙️ Оператор ЧПУ
- Управління станком
- Запуск та зупинка серій
- Введення фактичних даних
- Базові звіти

## 📱 Використання Telegram боту

### Налаштування боту

1. Створіть бота через @BotFather
2. Отримайте токен
3. Додайте токен в .env
4. Запустіть бота: `npm run telegram:start`

### Команди боту

```
/start - Початок роботи
/status - Статус всіх станків
/series - Активні серії
/report - Щоденний звіт
/alert [text] - Відправити сповіщення
```

### Автоматичні сповіщення

Бот автоматично відправляє:
- ✅ Завершення серії
- ⚠️ Потреба в заміні прутка
- 🔧 Потреба в обслуговуванні
- ❌ Критичні помилки
- 📊 Щоденні звіти (08:00)

## 🎨 Теми оформлення

### Темна тема (за замовчуванням)
Професійна темна тема оптимізована для роботи в цеху.

### Світла тема
Доступна через налаштування користувача.

### Налаштування теми
```javascript
// В Settings
Settings > Appearance > Theme
```

## 🔌 API Документація

### Аутентифікація

```javascript
// POST /api/auth/login
{
  "username": "operator",
  "password": "password"
}

// Response
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "username": "operator",
    "role": "operator"
  }
}
```

### Приклади запитів

**Отримати список станків:**
```bash
curl -X GET http://localhost:3000/api/machines \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Створити нову серію:**
```bash
curl -X POST http://localhost:3000/api/series \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Серія A-001",
    "machine_id": 1,
    "quantity": 500,
    "material_id": 3
  }'
```

**Завантажити G-code:**
```bash
curl -X POST http://localhost:3000/api/gcode/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@program.nc"
```

Повна документація API: [docs/API.md](docs/API.md)

## 🧪 Тестування

```bash
# Запустити всі тести
npm test

# Тести з покриттям
npm run test:coverage

# E2E тести
npm run test:e2e
```

## 📦 Розгортання

### Docker

```bash
# Збірка образу
docker build -t cnc-calc-pro .

# Запуск контейнера
docker-compose up -d
```

### Netlify (Frontend)

```bash
# Збірка для продакшн
npm run build

# Деплой
netlify deploy --prod
```

### Heroku (Backend)

```bash
# Логін
heroku login

# Створення додатку
heroku create cnc-calc-pro-api

# Деплой
git push heroku main
```

## 🔒 Безпека

### Рекомендації

- ✅ Використовуйте HTTPS в продакшн
- ✅ Регулярно оновлюйте JWT секрети
- ✅ Налаштуйте rate limiting
- ✅ Використовуйте сильні паролі
- ✅ Регулярно робіть бекапи БД

### CORS налаштування

```javascript
// server/src/app.js
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
```

## 📊 Моніторинг

### Логування

Логи зберігаються в `logs/` директорії:
- `error.log` - Помилки
- `combined.log` - Всі події
- `access.log` - HTTP запити

### Метрики

Доступні через endpoint `/api/metrics`:
- Час відповіді API
- Використання пам'яті
- Кількість запитів
- Статус станків

## 🐛 Відомі проблеми

1. **3D візуалізація може бути повільною на великих файлах**
   - Рішення: Використовуйте спрощення траєкторії

2. **WebSocket може втрачати з'єднання**
   - Рішення: Реалізовано автоматичне перепідключення

## 🤝 Внесок

Ми вітаємо внески в проект!

1. Fork репозиторій
2. Створіть feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit зміни (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Відкрийте Pull Request

## 📝 Changelog

### [1.0.0] - 2026-02-02
- ✨ Початковий реліз
- ✅ Модуль управління станками
- ✅ Модуль серій виробництва
- ✅ G-code парсер та візуалізація
- ✅ Базова аналітика
- ✅ Telegram інтеграція

## 📄 Ліцензія

Цей проект ліцензовано під MIT License - дивіться [LICENSE](LICENSE) файл для деталей.

## 👨‍💻 Автори

- **Команда CNC Calc Pro** - Початкова розробка

## 🙏 Подяки

- React Team
- Node.js Community
- Three.js Team
- Anthropic (Claude AI)
- Font Awesome
- Всім контриб'юторам

## 📞 Підтримка

- 📧 Email: support@cnc-calc-pro.com
- 💬 Telegram: @cnc_calc_pro_support
- 🌐 Website: https://cnc-calc-pro.com
- 📚 Документація: https://docs.cnc-calc-pro.com

## 🗺️ Roadmap

### Q1 2026
- [ ] Мобільний додаток (React Native)
- [ ] Розширена AI аналітика
- [ ] Інтеграція з ERP системами

### Q2 2026
- [ ] IoT підключення до станків
- [ ] AR візуалізація
- [ ] Розширений CAM модуль

### Q3 2026
- [ ] Machine Learning для прогнозування
- [ ] Голосове управління
- [ ] Інтеграція з більшою кількістю станків

---

**⭐ Якщо вам сподобався проект - поставте зірочку!**

Made with ❤️ for CNC industry
