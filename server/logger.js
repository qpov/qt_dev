// server/logger.js

const { createLogger, transports, format } = require('winston');
const path = require('path');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        new transports.File({ filename: path.join(__dirname, 'logs/error.log'), level: 'error' }),
        new transports.File({ filename: path.join(__dirname, 'logs/combined.log') })
    ]
});

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
