// events/voiceStateUpdate.js
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
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const server = newState.guild;
        const member = newState.member;

        const serverId = server.id;
        const config = loadConfig();
        const serverConfig = config[serverId];
        const createRoomChannelId = serverConfig ? serverConfig.createRoomChannelId : null;

        if (!createRoomChannelId) {
            // Канал для создания комнат не настроен
            logger.info(`Сервер "${server.name}" не настроил канал для создания комнат.`);
            return;
        }

        // Поиск канала по ID
        const createRoomChannel = server.channels.cache.get(createRoomChannelId);

        if (!createRoomChannel) {
            logger.warn(`Канал для создания комнат с ID "${createRoomChannelId}" не найден в сервере "${server.name}". Пожалуйста, используйте команду /install для его установки.`);
            return;
        }

        // Проверяем, что пользователь подключился к каналу для создания комнат
        if (newState.channelId && newState.channelId === createRoomChannel.id) {
            try {
                const newChannel = await server.channels.create({
                    name: `by-${member.user.username}`, // Устанавливаем префикс 'by-'
                    type: ChannelType.GuildVoice, // Тип: голосовой канал
                    parent: createRoomChannel.parent, // Устанавливаем ту же категорию, что и у исходного канала
                    permissionOverwrites: [
                        {
                            id: server.id,
                            allow: [PermissionsBitField.Flags.Connect],
                        }
                    ]
                });

                // Логируем созданный канал
                logger.info(`Создан новый канал: ${newChannel.name} (${newChannel.id}) в сервере "${server.name}".`);

                // Перемещаем пользователя в созданный канал
                await member.voice.setChannel(newChannel);
                logger.info(`Пользователь ${member.user.tag} перемещён в канал "${newChannel.name}".`);
            } catch (error) {
                logger.error(`Ошибка при создании нового голосового канала: ${error.stack}`);
            }
        }

        // Проверяем, если пользователь вышел из канала
        if (oldState.channelId && oldState.channelId !== newState.channelId) {
            const oldChannel = oldState.channel;

            // Проверяем, что канал был создан ботом (проверяем префикс) и что канал пуст
            if (oldChannel && oldChannel.name.toLowerCase().startsWith('by-') && oldChannel.members.size === 0) {
                try {
                    logger.info(`Канал ${oldChannel.name} (${oldChannel.id}) будет удалён, так как он пуст.`);
                    await oldChannel.delete();
                    logger.info(`Канал ${oldChannel.name} успешно удалён.`);
                } catch (error) {
                    logger.error(`Ошибка при удалении канала ${oldChannel.name} (${oldChannel.id}): ${error.stack}`);
                }
            }
        }
    },
};
