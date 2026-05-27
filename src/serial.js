const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { PORT_NAME, BAUD_RATE, SENSOR_NODE_ID, MESSAGE_REGEX } = require('./config');
const state = require('./state');

function startSerialMonitor() {
  try {
    const port = new SerialPort({ path: PORT_NAME, baudRate: BAUD_RATE });
    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    port.on('open', () => {
      console.log(`✅ Porta serial '${PORT_NAME}' aberta. Aguardando dados do gateway...`);
    });

    port.on('error', (err) => {
      console.error('❌ Erro na porta serial:', err.message);
    });

    parser.on('data', (line) => {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(MESSAGE_REGEX);

      if (!match) {
        if (trimmedLine.length > 0)
          console.log(`⚠️  IGNORADO (formato inválido): "${trimmedLine}"`);
        return;
      }

      const identificador = match[1];
      const mensagem = match[2].trim();

      console.log(`📡 Recebido — ID=${identificador} MSG="${mensagem}"`);

      if (identificador === SENSOR_NODE_ID) {
        const distancia = parseInt(mensagem, 10);
        if (!isNaN(distancia) && distancia >= 0) {
          state.lastDistance = Math.min(distancia, 80);
          state.lastUpdated = new Date().toISOString();
          console.log(`📏 Distância atualizada: ${distancia} cm`);
        } else {
          console.log(`⚠️  Valor de distância inválido: "${mensagem}"`);
        }
      }
    });

  } catch (e) {
    console.error('❌ Erro ao inicializar porta serial:', e.message);
    console.log('   Continuando sem porta serial (modo dev/simulação)...');
  }
}

module.exports = { startSerialMonitor };
