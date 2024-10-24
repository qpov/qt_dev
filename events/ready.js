// events/ready.js
const { Events, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../logger'); // Импортируем логгер

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 4));
    }
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4));
}

module.exports = {
    name: Events.ClientReady, // Используйте Events.ClientReady для последних версий discord.js
    once: true,
    async execute(client) {
        logger.info(`Бот ${client.user.tag} подключен и готов к работе!`);

        try {
            // Загружаем текущую конфигурацию
            const config = loadConfig();

            // Перебираем все сервера, на которых находится бот
            const servers = client.guilds.cache;
            if (servers.size === 0) {
                logger.warn('Бот не находится ни на одном сервере.');
                return;
            }

            for (const [serverId, server] of servers) {
                logger.info(`Обрабатываем сервер: ${server.name} (${server.id})`);

                try {
                    // Получаем все каналы сервера
                    await server.channels.fetch(); // Загрузка всех каналов
                    logger.info(`Все каналы сервера "${server.name}" успешно загружены.`);

                    // Фильтруем только голосовые каналы с префиксом 'by-'
                    const byVoiceChannels = server.channels.cache.filter(channel => 
                        (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) &&
                        channel.name.toLowerCase().startsWith('by-')
                    );

                    logger.info(`Найдено ${byVoiceChannels.size} каналов с префиксом "by-" в сервере "${server.name}".`);

                    for (const [channelId, channel] of byVoiceChannels) {
                        logger.info(`Проверка канала: ${channel.name} (${channelId})`);
                        logger.info(`Количество участников в канале ${channel.name}: ${channel.members.size}`);
                        if (channel.members.size === 0) {
                            logger.info(`Канал пуст и будет удалён: ${channel.name} (${channelId})`);
                            try {
                                await channel.delete();
                                logger.info(`Канал ${channel.name} успешно удалён.`);
                            } catch (deleteError) {
                                logger.error(`Не удалось удалить канал ${channel.name} (${channelId}): ${deleteError.stack}`);
                            }
                        } else {
                            logger.info(`Канал ${channel.name} не пуст. Количество участников: ${channel.members.size}`);
                        }
                    }

                } catch (serverError) {
                    logger.error(`Ошибка при обработке сервера "${server.name}" (${server.id}): ${serverError.stack}`);
                }
            }
        } catch (error) {
            logger.error(`Ошибка при загрузке каналов или их удалении: ${error.stack}`);
        }
    },
};
