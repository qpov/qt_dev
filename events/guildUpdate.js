// events/guildUpdate.js
const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
    name: Events.GuildUpdate,
    async execute(oldGuild, newGuild) {
        const guildId = newGuild.id;
        const newName = newGuild.name;

        const config = loadConfig();

        if (config[guildId] && config[guildId].name !== newName) {
            config[guildId].name = newName;
            saveConfig(config);
            console.log(`Обновлено название гильдии "${oldGuild.name}" на "${newGuild.name}" в config.json.`);
        }
    },
};
