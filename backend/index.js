// backend/index.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Подключаем бота и настройки
const bot = require('./bot');
const settings = require('./settings');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_default_secret',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport Discord Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'email', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    // Добавляем информацию о гильдиях
    profile.guilds = profile.guilds || [];
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Middleware to check authentication
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).send('Не авторизован');
}

// Маршруты аутентификации

app.get('/api/auth/discord', (req, res, next) => {
    console.log('Запрос на /api/auth/discord');
    next();
}, passport.authenticate('discord'));

app.get('/api/auth/discord/callback', (req, res, next) => {
    console.log('Запрос на /api/auth/discord/callback');
    next();
}, passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        console.log('Успешная авторизация через Discord');
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

// Получение списка гильдий пользователя
app.get('/api/guilds', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;

        const guilds = bot.guilds.cache.filter(guild => guild.members.cache.has(userId)).map(guild => ({
            id: guild.id,
            name: guild.name,
        }));

        res.json(guilds);
    } catch (error) {
        console.error('Ошибка при получении гильдий:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Получение голосовых каналов в гильдии
app.get('/api/guilds/:guildId/channels', isAuthenticated, async (req, res) => {
    try {
        const { guildId } = req.params;

        const guild = bot.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).send('Сервер не найден или бот не является его участником');
        }

        // Получаем голосовые каналы
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).map(c => ({
            id: c.id,
            name: c.name,
        }));

        res.json(voiceChannels);
    } catch (error) {
        console.error('Ошибка при получении голосовых каналов:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Сохранение настроек пользователя
app.post('/api/settings', isAuthenticated, async (req, res) => {
    try {
        const { guildId, voiceChannelId } = req.body;

        if (!guildId || !voiceChannelId) {
            return res.status(400).send('guildId и voiceChannelId обязательны');
        }

        const guild = bot.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).send('Бот не является участником этого сервера');
        }

        const channel = guild.channels.cache.get(voiceChannelId);
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return res.status(400).send('Выбранный канал не является голосовым');
        }

        // Сохранение настроек
        settings.setUserSettings(req.user.id, guildId, voiceChannelId);

        res.send('Настройки сохранены');
    } catch (error) {
        console.error('Ошибка при сохранении настроек:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Получение текущих настроек пользователя
app.get('/api/settings', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        const userSettings = settings.getUserSettings(userId);
        if (!userSettings) {
            return res.status(404).send('Настройки не найдены');
        }
        res.json(userSettings);
    } catch (error) {
        console.error('Ошибка при получении настроек:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// Маршрут для обслуживания фронтенда
app.use(express.static(path.join(__dirname, '../frontend')));

// Все остальные маршруты возвращают index.html (для поддержки SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Произошла ошибка:', err.stack);
    res.status(500).send('Что-то пошло не так!');
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
