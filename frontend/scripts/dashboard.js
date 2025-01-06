// frontend/scripts/dashboard.js

console.log('dashboard.js загружен');

function showUserInfo(user) {
    console.log('Отображение информации о пользователе:', user);
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('username').textContent = user.username || user.id;
}

function hideUserInfo() {
    console.log('Скрытие информации о пользователе');
    document.getElementById('user-info').style.display = 'none';
}

fetch('/api/auth/user', { credentials: 'include' })
    .then(response => {
        console.log('Получение информации о пользователе: статус', response.status);
        if (response.status === 401) {
            console.log('Пользователь не авторизован');
            window.location.href = '/login'; // Перенаправление на страницу авторизации
        } else {
            return response.json();
        }
    })
    .then(user => {
        if (user) {
            showUserInfo(user);
            loadGuilds().then(() => {
                loadSettings(user.id);
            });
        }
    })
    .catch(error => {
        console.error('Ошибка при получении информации о пользователе:', error);
    });

// Функция загрузки списка серверов (гильдий)
async function loadGuilds() {
    console.log('Загрузка списка гильдий');
    try {
        const response = await fetch('/api/guilds', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Ошибка при загрузке серверов');
        }
        const guilds = await response.json();
        const guildSelect = document.getElementById('guild-select');
        guilds.forEach(guild => {
            const option = document.createElement('option');
            option.value = guild.id;
            option.textContent = guild.name;
            guildSelect.appendChild(option);
        });
        console.log('Гильдии загружены:', guilds);
    } catch (error) {
        console.error('Ошибка при загрузке гильдий:', error);
        alert('Не удалось загрузить серверы');
    }
}

// Обработчик изменения выбора сервера
document.getElementById('guild-select').addEventListener('change', async function () {
    const guildId = this.value;
    const channelSelect = document.getElementById('channel-select');
    channelSelect.innerHTML = '<option value="">--Выберите голосовой канал--</option>';

    if (guildId) {
        console.log('Выбран сервер с ID:', guildId);
        try {
            const response = await fetch(`/api/guilds/${guildId}/channels`, { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Ошибка при загрузке каналов');
            }
            const channels = await response.json();
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.value = channel.id;
                option.textContent = channel.name;
                channelSelect.appendChild(option);
            });
            console.log('Голосовые каналы загружены:', channels);
        } catch (error) {
            console.error('Ошибка при загрузке голосовых каналов:', error);
            alert('Не удалось загрузить голосовые каналы');
        }
    }
});

// Обработчик отправки формы настроек бота
document.getElementById('bot-settings-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const guildId = document.getElementById('guild-select').value;
    const voiceChannelId = document.getElementById('channel-select').value;

    if (!guildId || !voiceChannelId) {
        alert('Пожалуйста, выберите сервер и голосовой канал');
        return;
    }

    console.log('Сохранение настроек:', { guildId, voiceChannelId });

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ guildId, voiceChannelId }),
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        const message = await response.text();
        const statusDiv = document.getElementById('settings-status');
        statusDiv.textContent = message;
        statusDiv.classList.remove('error');
        statusDiv.classList.add('success');

        console.log('Настройки сохранены:', message);
    } catch (error) {
        console.error('Ошибка при сохранении настроек:', error);
        const statusDiv = document.getElementById('settings-status');
        statusDiv.textContent = `Ошибка: ${error.message}`;
        statusDiv.classList.remove('success');
        statusDiv.classList.add('error');
    }
});

// Обработчик кнопки выхода
document.getElementById('logout-button').addEventListener('click', async function () {
    console.log('Выход из сессии');
    try {
        await fetch('/api/auth/logout', { credentials: 'include' });
        hideUserInfo();
        window.location.href = '/'; // Перенаправление на главную страницу
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    }
});

// Функция загрузки текущих настроек пользователя
async function loadSettings(userId) {
    console.log('Загрузка настроек пользователя:', userId);
    try {
        const response = await fetch('/api/settings', { credentials: 'include' });
        if (response.status === 404) {
            console.log('Настройки не найдены');
            return;
        } else if (!response.ok) {
            throw new Error('Ошибка при загрузке настроек');
        }
        const settings = await response.json();
        if (settings) {
            const guildSelect = document.getElementById('guild-select');
            const channelSelect = document.getElementById('channel-select');

            // Устанавливаем выбранный сервер
            guildSelect.value = settings.guildId;
            console.log('Установлен выбранный сервер:', settings.guildId);

            // Триггерим событие изменения, чтобы загрузить голосовые каналы
            const changeEvent = new Event('change');
            guildSelect.dispatchEvent(changeEvent);

            // Ждём загрузки каналов, затем устанавливаем выбранный голосовой канал
            const observer = new MutationObserver(() => {
                if (channelSelect.querySelector(`option[value="${settings.voiceChannelId}"]`)) {
                    channelSelect.value = settings.voiceChannelId;
                    console.log('Установлен выбранный голосовой канал:', settings.voiceChannelId);
                    observer.disconnect();
                }
            });

            observer.observe(channelSelect, { childList: true });
        }
    } catch (error) {
        console.error('Ошибка при загрузке настроек:', error);
    }
}