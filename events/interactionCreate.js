// events/interactionCreate.js
const { 
    Events, 
    EmbedBuilder, 
    StringSelectMenuBuilder,  // Используем StringSelectMenuBuilder вместо SelectMenuBuilder
    ActionRowBuilder, 
    PermissionsBitField, 
    ChannelType 
} = require('discord.js');
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
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isButton()) {
            const { customId } = interaction;

            if (customId === 'button_set_create_room') {
                // Обработка кнопки "Установить создание комнат"
                try {
                    // Проверка прав администратора
                    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                        await interaction.reply({ content: 'У вас нет прав для использования этой функции.', ephemeral: true });
                        logger.warn(`Пользователь ${interaction.user.tag} попытался использовать кнопку "Установить создание комнат" без прав администратора.`);
                        return;
                    }

                    // Получение всех голосовых каналов на сервере
                    const voiceChannels = interaction.guild.channels.cache.filter(channel => 
                        channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice
                    );

                    if (voiceChannels.size === 0) {
                        await interaction.reply({ content: 'В этом сервере нет доступных голосовых каналов для выбора.', ephemeral: true });
                        logger.info(`Пользователь ${interaction.user.tag} пытался установить канал создания комнат, но голосовых каналов нет.`);
                        return;
                    }

                    // Создание опций для выпадающего списка
                    const options = voiceChannels.map(channel => ({
                        label: channel.name,
                        description: `ID: ${channel.id}`,
                        value: channel.id,
                    }));

                    // Создание выпадающего списка
                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('select_create_room_channel')
                        .setPlaceholder('Выберите голосовой канал')
                        .addOptions(options);

                    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

                    await interaction.reply({ content: 'Пожалуйста, выберите голосовой канал из списка:', components: [actionRow], ephemeral: true });
                    logger.info(`Пользователь ${interaction.user.tag} открыл выпадающий список для выбора голосового канала.`);
                } catch (error) {
                    logger.error(`Ошибка при обработке кнопки "Установить создание комнат": ${error.stack}`);
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply('Произошла ошибка при выполнении действия.');
                    } else {
                        await interaction.reply({ content: 'Произошла ошибка при выполнении действия.', ephemeral: true });
                    }
                }
            } else if (customId === 'button_help') {
                // Обработка кнопки "Help"
                try {
                    const helpEmbed = new EmbedBuilder()
                        .setColor(0x0099ff)
                        .setTitle('Справка по Командам')
                        .setDescription('Ниже приведён список доступных команд и их описание.')
                        .addFields(
                            { name: '/clear', value: 'Удаляет все сообщения указанного пользователя в текущем канале.\n**Пример использования:**\n`/clear user: @пользователь`' },
                            { name: '/install', value: 'Устанавливает интерфейс для взаимодействия с ботом в указанном текстовом канале.\n**Пример использования:**\n`/install channel: #bot-commands`' },
                            { name: '/help', value: 'Получить информацию о доступных командах.' },
                        )
                        .setTimestamp()
                        .setFooter({ text: `Запрошено ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                    await interaction.reply({ embeds: [helpEmbed], ephemeral: false });
                    logger.info(`Пользователь ${interaction.user.tag} нажал кнопку "Help".`);
                } catch (error) {
                    logger.error(`Ошибка при обработке кнопки "Help": ${error.stack}`);
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply('Произошла ошибка при выполнении действия.');
                    } else {
                        await interaction.reply({ content: 'Произошла ошибка при выполнении действия.', ephemeral: true });
                    }
                }
            }
        } else if (interaction.isStringSelectMenu()) {  // Используем isStringSelectMenu вместо isSelectMenu()
            const { customId, values } = interaction;

            if (customId === 'select_create_room_channel') {
                try {
                    const selectedChannelId = values[0];
                    const selectedChannel = interaction.guild.channels.cache.get(selectedChannelId);

                    if (!selectedChannel) {
                        await interaction.reply({ content: 'Выбранный канал не найден.', ephemeral: true });
                        logger.warn(`Пользователь ${interaction.user.tag} выбрал несуществующий канал ID: ${selectedChannelId}.`);
                        return;
                    }

                    // Сохранение выбранного канала в config.json
                    const guildId = interaction.guild.id;
                    const guildName = interaction.guild.name;

                    let config = loadConfig();

                    if (!config[guildId]) {
                        config[guildId] = { name: guildName };
                    }

                    config[guildId].createRoomChannelId = selectedChannel.id;  // Сохраняем ID канала
                    saveConfig(config);

                    await interaction.reply({ content: `Канал для создания голосовых комнат успешно установлен на "${selectedChannel.name}".`, ephemeral: true });
                    logger.info(`Сервер "${guildName}" установил канал для создания комнат: "${selectedChannel.name}" (ID: ${selectedChannel.id}).`);
                } catch (error) {
                    logger.error(`Ошибка при обработке выбора канала для создания комнат: ${error.stack}`);
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply('Произошла ошибка при выполнении действия.');
                    } else {
                        await interaction.reply({ content: 'Произошла ошибка при выполнении действия.', ephemeral: true });
                    }
                }
            }
        } else if (interaction.isModalSubmit()) {
            const { customId } = interaction;

            if (customId === 'modal_set_create_room') {
                // Обработка модального окна "Установка канала для создания комнат"
                try {
                    // Проверка прав администратора
                    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                        await interaction.reply({ content: 'У вас нет прав для использования этой функции.', ephemeral: true });
                        logger.warn(`Пользователь ${interaction.user.tag} попытался отправить модальное окно без прав администратора.`);
                        return;
                    }

                    const channelId = interaction.fields.getTextInputValue('channelName').trim();

                    if (!channelId) {
                        await interaction.reply({ content: 'Название канала не может быть пустым.', ephemeral: true });
                        logger.warn(`Пользователь ${interaction.user.tag} отправил пустое название канала.`);
                        return;
                    }

                    const guildId = interaction.guild.id;
                    const guildName = interaction.guild.name;

                    // Проверяем, существует ли голосовой канал с таким ID
                    const channel = interaction.guild.channels.cache.get(channelId);

                    if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) {
                        await interaction.reply({ content: `Канал с ID "${channelId}" не найден или не является голосовым каналом.`, ephemeral: true });
                        logger.warn(`Пользователь ${interaction.user.tag} выбрал неверный канал ID: ${channelId}.`);
                        return;
                    }

                    // Загрузка текущей конфигурации
                    let config = loadConfig();

                    // Сохраняем настройку создания комнат
                    if (!config[guildId]) {
                        config[guildId] = { name: guildName };
                    }
                    config[guildId].createRoomChannelId = channel.id;  // Сохраняем ID канала
                    saveConfig(config);

                    await interaction.reply({ content: `Канал для создания голосовых комнат успешно установлен на "${channel.name}".`, ephemeral: true });
                    logger.info(`Сервер "${guildName}" установил канал для создания комнат: "${channel.name}" (ID: ${channel.id}).`);
                } catch (error) {
                    logger.error(`Ошибка при обработке модального окна "Установка канала для создания комнат": ${error.stack}`);
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply('Произошла ошибка при выполнении действия.');
                    } else {
                        await interaction.reply({ content: 'Произошла ошибка при выполнении действия.', ephemeral: true });
                    }
                }
            }
        }
    },
};
