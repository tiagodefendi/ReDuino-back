const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT_NAME:        process.env.SERIAL_PORT    || 'COM6',
  BAUD_RATE:        19200,
  DATABASE_URL:     process.env.DATABASE_URL,
  HTTP_PORT:        process.env.PORT           || 3001,
  FRONTEND_URL:     process.env.FRONTEND_URL   || 'http://localhost:3000',
  SENSOR_NODE_ID:   process.env.SENSOR_NODE_ID || '47',
  MESSAGE_REGEX:    /^(\d{2,3}):\s*(.+)$/,
};
