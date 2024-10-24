// commands/cheater.js
const { SlashCommandBuilder } = require('discord.js');
const logger = require('../logger'); // Импортируем логгер

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cheater')
        .setDescription('Отметить пользователя 657183023787409428 как читера!'),
    async execute(interaction) {
        try {
            await interaction.reply({ content: `<@657183023787409428>, ты читер!`, ephemeral: false });
            logger.info(`Пользователь ${interaction.user.tag} отметил пользователя с ID 657183023787409428 как читера.`);
        } catch (error) {
            logger.error(`Ошибка при выполнении команды /cheater: ${error.stack}`);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply('Произошла ошибка при выполнении команды.');
            } else {
                await interaction.reply({ content: 'Произошла ошибка при выполнении команды.', ephemeral: true });
            }
        }
    },
};
