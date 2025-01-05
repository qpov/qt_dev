// /var/www/qt/backend/index.js

require('dotenv').config(); // Подгружает .env при необходимости
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

// -- Настройки из окружения (из .env, например)
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const CALLBACK_URL = process.env.DISCORD_CALLBACK_URL; 
// Например: http://YOUR_DOMAIN_OR_IP/auth/discord/callback

const PORT = process.env.PORT || 3000;

const app = express();

// -- Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'super_secret_key', // в продакшене положите в .env
  resave: false,
  saveUninitialized: false
}));

// Инициализация Passport
app.use(passport.initialize());
app.use(passport.session());

// ------------------------------------
// Настройка passport-discord
// ------------------------------------
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify', 'guilds'] // scope: что хотим получить (минимум identify)
  },
  function(accessToken, refreshToken, profile, done) {
    // Здесь можно сохранить пользователя в БД
    // profile содержит Discord ID, username и т.д.
    return done(null, profile);
  }
));

// ------------------------------------
// Маршрут: Начало авторизации
// ------------------------------------
app.get('/auth/discord', passport.authenticate('discord'));

// ------------------------------------
// Маршрут: Callback от Discord
// ------------------------------------
app.get('/auth/discord/callback', 
  passport.authenticate('discord', { failureRedirect: '/autherror' }),
  function(req, res) {
    // Успешная авторизация
    res.redirect('/profile');
  }
);

// ------------------------------------
// Пример защищённого маршрута /profile
// ------------------------------------
function checkAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.redirect('/auth/discord');
}

app.get('/profile', checkAuth, (req, res) => {
  // req.user - объект, который вернул passport
  const { username, discriminator, id } = req.user;
  res.send(`
    <h1>Профиль Discord</h1>
    <p>Имя: ${username}#${discriminator}</p>
    <p>ID: ${id}</p>
    <p><a href="/logout">Выйти</a></p>
  `);
});

// ------------------------------------
// Выход из системы
// ------------------------------------
app.get('/logout', (req, res) => {
  req.logout(); // logout от Passport
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ------------------------------------
// Пример главной страницы
// ------------------------------------
app.get('/', (req, res) => {
  res.send(`
    <h1>Главная</h1>
    <p><a href="/auth/discord">Войти через Discord</a></p>
  `);
});

// ------------------------------------
// Ошибка авторизации
// ------------------------------------
app.get('/autherror', (req, res) => {
  res.send('Ошибка авторизации!');
});

// ------------------------------------
// Запуск сервера
// ------------------------------------
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
