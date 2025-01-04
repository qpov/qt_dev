// commands/clear.js
const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const logger = require('../logger'); // Импортируем логгер

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Удалить все сообщения указанного пользователя в текущем канале.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, чьи сообщения нужно удалить.')
                .setRequired(true)),
    async execute(interaction) {
        try {
            // Проверка прав администратора
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                await interaction.reply({ content: 'У вас нет прав для использования этой команды.', ephemeral: true });
                logger.warn(`Пользователь ${interaction.user.tag} попытался использовать команду /clear без прав администратора.`);
                return;
            }

            const targetUser = interaction.options.getUser('user');
            if (!targetUser) {
                await interaction.reply({ content: 'Пожалуйста, укажите пользователя для удаления сообщений.', ephemeral: true });
                logger.warn(`Пользователь ${interaction.user.tag} вызвал команду /clear без указания пользователя.`);
                return;
            }

            // Fetch messages from the current channel
            const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
            const userMessages = fetchedMessages.filter(msg => msg.author.id === targetUser.id);

            // Bulk delete messages
            await interaction.channel.bulkDelete(userMessages, true);

            // Send confirmation message
            const confirmation = await interaction.reply({ content: `Все сообщения от ${targetUser.tag} были удалены в этом канале.`, fetchReply: true });

            // Delete confirmation message after 5 секунд
            setTimeout(() => {
                confirmation.delete().catch(err => {
                    logger.error(`Не удалось удалить подтверждающее сообщение: ${err.stack}`);
                });
            }, 5000);

            logger.info(`Пользователь ${interaction.user.tag} удалил все сообщения от ${targetUser.tag} в канале "${interaction.channel.name}".`);
        } catch (error) {
            logger.error(`Ошибка при выполнении команды /clear: ${error.stack}`);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply('Произошла ошибка при удалении сообщений.');
                } else {
                    await interaction.reply({ content: 'Произошла ошибка при удалении сообщений.', ephemeral: true });
                }
            } catch (err) {
                logger.error(`Ошибка при отправке сообщения об ошибке: ${err.stack}`);
            }
        }
    },
};
