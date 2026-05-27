const { startSerialMonitor } = require('./src/serial');
const { startWebServer } = require('./src/server');

console.log('🔧 Iniciando ReDuino Back...');
startSerialMonitor();
startWebServer();
