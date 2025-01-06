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
const { ChannelType } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Подключаем бота и настройки
const bot = require('./bot'); // Ваш Discord бот
const settings = require('./settings'); // Ваш модуль настроек

// Middleware
app.use(cors({
    origin: 'http://185.129.49.250', // Замените на ваш фронтенд домен
    credentials: true, // Разрешить передачу куки
}));
app.use(bodyParser.json());
app.use(morgan('combined'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Установите true, если используете HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 день
    },
}));
app.use(passport.initialize());
app.use(passport.session());

// Обслуживание статических файлов
app.use('/styles', express.static(path.join(__dirname, '../frontend', 'styles')));
app.use('/scripts', express.static(path.join(__dirname, '../frontend', 'scripts')));

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

// Middleware для проверки аутентификации
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).send('Не авторизован');
}

// Маршруты аутентификации
app.get('/api/auth/discord', passport.authenticate('discord'));

app.get('/api/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        console.log('Успешная авторизация через Discord');
        res.redirect('/dashboard');
    }
);

app.get('/api/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Ошибка при выходе:', err);
            return res.status(500).send('Ошибка выхода');
        }
        res.redirect('/');
    });
});

app.get('/api/auth/user', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).send('Не авторизован');
    }
    res.json(req.user);
});

// API для гильдий и каналов
app.get('/api/guilds', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const guilds = [];

        for (const guild of bot.guilds.cache.values()) {
            try {
                const member = await guild.members.fetch(userId);
                if (member) {
                    guilds.push({ id: guild.id, name: guild.name });
                }
            } catch (error) {
                // Игнорируем гильдии, где пользователь не состоит
            }
        }

        res.json(guilds);
    } catch (error) {
        console.error('Ошибка при получении гильдий:', error);
        res.status(500).send('Ошибка сервера');
    }
});

app.get('/api/guilds/:guildId/channels', isAuthenticated, async (req, res) => {
    try {
        const { guildId } = req.params;

        const guild = bot.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).send('Сервер не найден или бот не является его участником');
        }

        const voiceChannels = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildVoice)
            .map(c => ({
                id: c.id,
                name: c.name,
            }));

        res.json(voiceChannels);
    } catch (error) {
        console.error('Ошибка при получении голосовых каналов:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// API для настроек пользователя
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
        console.log('Настройки успешно сохранены для пользователя:', req.user.id);

        res.send('Настройки сохранены');
    } catch (error) {
        console.error('Ошибка при сохранении настроек:', error);
        res.status(500).send('Ошибка сервера');
    }
});

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

// Маршруты для фронтенда

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// Страница авторизации
app.get('/login', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/login.html'));
});

// Страница управления ботом
app.get('/dashboard', isAuthenticated, (req, res) => {
    console.log('Обрабатывается маршрут /dashboard для пользователя:', req.user.id);
    res.sendFile(path.resolve(__dirname, '../frontend/dashboard.html'));
});

// Все остальные маршруты возвращают 404
app.get('*', (req, res) => {
    res.status(404).sendFile(path.resolve(__dirname, '../frontend/index.html')); // Можно изменить на 404
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
