// logger.js
const { createLogger, format, transports } = require('winston');
const path = require('path');

// Настройка формата логов
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.splat(),
        format.printf(({ timestamp, level, message, stack }) => {
            return stack
                ? `${timestamp} [${level}]: ${message} - ${stack}`
                : `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [
        // Логи в файл ошибок
        new transports.File({ filename: path.join('logs', 'error.log'), level: 'error' }),
        // Все логи в отдельный файл
        new transports.File({ filename: path.join('logs', 'combined.log') }),
    ],
});

// Если не в продакшене, выводим логи в консоль
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, stack }) => {
                return stack
                    ? `${timestamp} [${level}]: ${message} - ${stack}`
                    : `${timestamp} [${level}]: ${message}`;
            })
        )
    }));
}

module.exports = logger;
