// commands/install.js
const { 
    SlashCommandBuilder, 
    PermissionsBitField, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
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
    data: new SlashCommandBuilder()
        .setName('install')
        .setDescription('Установить интерфейс для взаимодействия с ботом в указанном текстовом канале.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Текстовый канал для установки интерфейса бота.')
                .setRequired(true)),
    async execute(interaction) {
        try {
            // Проверка прав администратора
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                await interaction.reply({ content: 'У вас нет прав для использования этой команды.', ephemeral: true });
                logger.warn(`Пользователь ${interaction.user.tag} попытался использовать команду /install без прав администратора.`);
                return;
            }

            const channel = interaction.options.getChannel('channel');

            // Проверяем, является ли выбранный канал текстовым
            if (channel.type !== ChannelType.GuildText) {
                await interaction.reply({ content: 'Пожалуйста, выберите текстовый канал.', ephemeral: true });
                logger.warn(`Пользователь ${interaction.user.tag} выбрал не текстовый канал при использовании команды /install.`);
                return;
            }

            const serverId = interaction.guild.id;
            const serverName = interaction.guild.name;
            const interfaceChannelName = channel.name;

            // Загрузка текущей конфигурации
            let config = loadConfig();

            // Сохраняем настройку в config.json
            if (!config[serverId]) {
                config[serverId] = { name: serverName };
            } else {
                config[serverId].name = serverName; // Обновляем название, если оно изменилось
            }
            config[serverId].interfaceChannel = interfaceChannelName;
            saveConfig(config);

            // Создаём интерфейсное сообщение с кнопками
            const helpEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('Интерфейс Бота')
                .setDescription('Используйте кнопки ниже для взаимодействия с ботом.')
                .setTimestamp()
                .setFooter({ text: `Установлено ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('button_set_create_room')
                        .setLabel('Установить создание комнат')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('button_help')
                        .setLabel('Help')
                        .setStyle(ButtonStyle.Secondary)
                );

            await channel.send({
                embeds: [helpEmbed],
                components: [buttons],
            });

            await interaction.reply({ content: `Интерфейс успешно установлен в канал ${channel}.`, ephemeral: true });
            logger.info(`Интерфейс установлен в канал "${channel.name}" на сервере "${serverName}".`);
        } catch (error) {
            logger.error(`Ошибка при выполнении команды /install: ${error.stack}`);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply('Произошла ошибка при выполнении команды.');
            } else {
                await interaction.reply({ content: 'Произошла ошибка при выполнении команды.', ephemeral: true });
            }
        }
    },
};
