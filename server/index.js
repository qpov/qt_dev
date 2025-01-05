// server/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session'); // Для сессий
const bcrypt = require('bcrypt');          // Для хэширования паролей
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// -------------------------------------
// Настройка Express
// -------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); 
// ↑ Нужно именно urlencoded, т.к. формы HTML шлют данные 
//   в формате application/x-www-form-urlencoded

// Настройка сессий
app.use(session({
  secret: 'super_secret_key', // Замените на свой ключ
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // сессия на 24 часа
  }
}));

// -------------------------------------
// Папка со статическими файлами (HTML, CSS, JS, ...)
// -------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------
// "База" пользователей - в файле (для примера)
// -------------------------------------
const USERS_FILE = path.join(__dirname, 'users.json');

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
  }
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// -------------------------------------
// Маршруты HTML-страниц (регистрация, логин)
// (Можно было бы раздавать их статически, но тут для примера)
// -------------------------------------

// (Необязательно) Если хотите вернуть index.html на "/"
app.get('/', (req, res) => {
  // Вы просто отдаёте статический файл:
  // res.sendFile(path.join(__dirname, 'public', 'index.html'));
  // Или что-то свое
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------------------------
// Маршрут регистрации (получение формы): /register (GET)
// (Если вы не используете отдельный register.html)
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Маршрут авторизации (получение формы): /login (GET)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// -------------------------------------
// Маршрут регистрации (при сабмите формы): /register (POST)
// -------------------------------------
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Проверка
  if (!username || !password) {
    return res.status(400).send('Необходимо ввести username и password');
  }

  const users = loadUsers();
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    return res.status(400).send('Пользователь с таким именем уже существует');
  }

  try {
    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    // Создаём нового пользователя
    const newUser = {
      username,
      password: hashedPassword
    };
    users.push(newUser);
    saveUsers(users);

    // Сохраняем пользователя в сессии
    req.session.user = { username: newUser.username };

    // Редирект на главную страницу /profile или / (на ваш выбор)
    return res.redirect('/profile');
  } catch (err) {
    logger.error(`Ошибка при регистрации: ${err}`);
    return res.status(500).send('Ошибка сервера при регистрации');
  }
});

// -------------------------------------
// Маршрут логина (при сабмите формы): /login (POST)
// -------------------------------------
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Необходимо ввести username и password');
  }

  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(400).send('Неверные учетные данные (пользователь не найден)');
  }

  try {
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).send('Неверный пароль');
    }
    // Сохраняем пользователя в сессии
    req.session.user = { username: user.username };

    return res.redirect('/profile');
  } catch (err) {
    logger.error(`Ошибка при логине: ${err}`);
    return res.status(500).send('Ошибка сервера при логине');
  }
});

// -------------------------------------
// Маршрут профиля (требует авторизации)
// -------------------------------------
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.send(`
    <h1>Добро пожаловать, ${req.session.user.username}!</h1>
    <p>Вы авторизованы на сайте, теперь можете управлять ботом.</p>
    <p><a href="/logout">Выйти</a></p>
  `);
});

// -------------------------------------
// Выход (логаут) - уничтожаем сессию
// -------------------------------------
app.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        logger.error(`Ошибка при logout: ${err}`);
        return res.status(500).send('Ошибка при завершении сессии');
      }
      res.clearCookie('connect.sid');
      return res.redirect('/');
    });
  } else {
    return res.redirect('/');
  }
});

// -------------------------------------
// Подключение Discord-бота
// -------------------------------------

// ...ваш код Discord-бота...
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ /* ... */ });
// прочее

// Логин бота
// client.login(process.env.BOT_TOKEN);

// -------------------------------------
// Маршруты для API (управление ботом)
// -------------------------------------
app.get('/api/status', (req, res) => {
  const status = client.isReady() ? 'Бот работает' : 'Бот не запущен';
  res.json({ status });
});

// Маршрут для отправки команды боту
app.post('/api/send-command', async (req, res) => {
    const { command } = req.body;

    if (!command) {
        logger.warn('Нет команды для отправки');
        return res.status(400).json({ success: false, error: 'Нет команды для отправки' });
    }

    try {
        // Пример отправки сообщения в канал
        const channelId = process.env.CHANNEL_ID;
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            logger.warn(`Канал с ID ${channelId} не найден`);
            return res.status(404).json({ success: false, error: 'Канал не найден' });
        }

        await channel.send(`Команда: ${command}`);
        logger.info(`Команда "${command}" отправлена в канал ID: ${channelId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error(`Ошибка при отправке команды: ${error.stack}`);
        res.status(500).json({ success: false, error: 'Не удалось отправить команду' });
    }
});

// Маршрут для отправки сообщения в определенный сервер
app.post('/api/send-message', async (req, res) => {
    const { guildId, message } = req.body;

    if (!guildId || !message) {
        logger.warn('Недостаточно данных для отправки сообщения');
        return res.status(400).json({ success: false, error: 'Необходимо указать guildId и сообщение' });
    }

    const configPath = path.join(__dirname, 'config.json');
    function loadConfig() {
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify({}, null, 4));
        }
        const data = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(data);
    }
    const config = loadConfig();
    const guildConfig = config[guildId];
    if (!guildConfig || !guildConfig.createRoomChannelId) {
        logger.warn(`Канал для guildId ${guildId} не настроен`);
        return res.status(404).json({ success: false, error: 'Канал для данного сервера не настроен' });
    }

    const channelId = guildConfig.createRoomChannelId;
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
        logger.warn(`Канал с ID ${channelId} не найден`);
        return res.status(404).json({ success: false, error: 'Канал не найден' });
    }

    try {
        await channel.send(message);
        logger.info(`Сообщение "${message}" отправлено в канал ID: ${channelId} на сервере ${guildId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error(`Ошибка при отправке сообщения: ${error.stack}`);
        res.status(500).json({ success: false, error: 'Не удалось отправить сообщение' });
    }
});

// -------------------------------------
// Запуск сервера
// -------------------------------------
app.listen(PORT, () => {
    logger.info(`Express сервер запущен на порту ${PORT}`);
  });