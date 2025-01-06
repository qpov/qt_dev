require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan'); // Логирование запросов

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined')); // Логирование всех запросов
app.use(session({
    secret: 'root', // Измените это значение
    resave: false,
    saveUninitialized: false,
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Discord Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'email', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    console.log('Получен профиль пользователя:', profile); // Лог профиля пользователя
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Routes
app.get('/api/auth/discord', passport.authenticate('discord'));

app.get('/api/auth/discord/callback',
    passport.authenticate('discord', {
        failureRedirect: '/'
    }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/api/auth/logout', (req, res) => {
    console.log('Маршрут /api/auth/logout вызван');
    req.logout((err) => {
        if (err) {
            console.error('Ошибка при выходе:', err);
            return res.status(500).send('Ошибка выхода');
        }
        console.log('Пользователь успешно вышел');
        res.redirect('/');
    });
});

app.get('/api/auth/user', (req, res) => {
    console.log('Запрос на /api/auth/user');
    if (!req.isAuthenticated()) {
        console.log('Пользователь не авторизован');
        return res.status(401).send('Не авторизован');
    }
    console.log('Пользователь авторизован:', req.user);
    res.json(req.user);
});

// Тестовый маршрут для проверки работы сервера
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
