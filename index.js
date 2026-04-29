const { Client } = require('pg');
const dotenv = require('dotenv');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const express = require('express');
const cors = require('cors');
const path = require('path');

dotenv.config();

// ----------------------------------------------------
// Configurações
const PORT_NAME = process.env.SERIAL_PORT || '/dev/ttyUSB0'; // "COM3" no Windows
const BAUD_RATE = 115200;
const NEON_DATABASE_URL = process.env.DATABASE_URL;
const HTTP_PORT = process.env.PORT || 3001;
// ----------------------------------------------------

// Expressão regular para validar o formato "XX: <mensagem>"
// O gateway Arduino envia: "47: 85" (identificador: distância em cm)
const MESSAGE_REGEX = /^(\d{2,3}):\s*(.+)$/;

// Identificador do nó sensor de ultrassom
const SENSOR_NODE_ID = process.env.SENSOR_NODE_ID || '47';

// ----------------------------------------------------
// Estado global da aplicação
// ----------------------------------------------------
let dbClient = null;
let isSystemActive = false; // Controlado pelo botão de liga/desliga do front
let lastDistance = 200;     // Última distância lida (cm)
let lastUpdated = null;     // Timestamp da última leitura

// ----------------------------------------------------
// Banco de Dados
// ----------------------------------------------------
async function setupDatabase() {
  if (!NEON_DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL não encontrada. Rodando sem persistência no banco.');
    return null;
  }

  const client = new Client({
    connectionString: NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS leituras_brutas (
      id         SERIAL PRIMARY KEY,
      identificador      VARCHAR(3)   NOT NULL,
      mensagem_processada TEXT        NOT NULL,
      distancia_cm       INTEGER,
      timestamp  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ Conectado ao PostgreSQL (Neon) e tabela 'leituras_brutas' pronta.");
  return client;
}

async function salvarLeitura(identificador, mensagem, distancia) {
  if (!dbClient) return;
  try {
    await dbClient.query(
      `INSERT INTO leituras_brutas (identificador, mensagem_processada, distancia_cm)
       VALUES ($1, $2, $3)`,
      [identificador, mensagem, distancia]
    );
  } catch (e) {
    console.error('❌ Erro ao inserir no BD:', e.message);
  }
}

// ----------------------------------------------------
// Monitor Serial
// ----------------------------------------------------
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

    parser.on('data', async (line) => {
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

      // Só processa leituras do nó sensor de ultrassom
      if (identificador === SENSOR_NODE_ID) {
        const distancia = parseInt(mensagem, 10);

        if (!isNaN(distancia) && distancia >= 0 && distancia <= 400) {
          lastDistance = distancia;
          lastUpdated = new Date().toISOString();
          console.log(`📏 Distância atualizada: ${distancia} cm`);
        } else {
          console.log(`⚠️  Valor de distância inválido: "${mensagem}"`);
        }
      }

      // Persiste tudo no banco (independente do identificador)
      await salvarLeitura(identificador, mensagem, parseInt(mensagem, 10) || null);
    });

  } catch (e) {
    console.error('❌ Erro ao inicializar porta serial:', e.message);
    console.log('   Continuando sem porta serial (modo dev/simulação)...');
  }
}

// ----------------------------------------------------
// Servidor Web (Express)
// ----------------------------------------------------
function startWebServer() {
  const app = express();

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }));

  app.use(express.json());

  // --------------------------------------------------
  // GET /api/status
  // Retorna o estado atual do sistema para o frontend
  // Resposta: { active, distance, alert, statusText, beepsPerSec, updatedAt }
  // --------------------------------------------------
  app.get('/api/status', (req, res) => {
    const state = isSystemActive
      ? buildSensorState(lastDistance)
      : { alert: 'idle', statusText: '--', beepsPerSec: '--' };

    res.json({
      active: isSystemActive,
      distance: isSystemActive ? lastDistance : null,
      alert: state.alert,
      statusText: state.statusText,
      beepsPerSec: state.beepsPerSec,
      updatedAt: lastUpdated,
    });
  });

  // --------------------------------------------------
  // POST /api/toggle
  // Liga ou desliga o sistema de sensor de ré
  // Body (opcional): { active: true | false }
  // Resposta: { active }
  // --------------------------------------------------
  app.post('/api/toggle', (req, res) => {
    if (typeof req.body?.active === 'boolean') {
      isSystemActive = req.body.active;
    } else {
      isSystemActive = !isSystemActive;
    }

    console.log(`🔘 Sistema ${isSystemActive ? 'ATIVADO' : 'DESATIVADO'}`);
    res.json({ active: isSystemActive });
  });

  // --------------------------------------------------
  // GET /api/messages
  // Histórico das últimas leituras salvas no banco
  // Query: ?limit=50 (padrão 50)
  // --------------------------------------------------
  app.get('/api/messages', async (req, res) => {
    if (!dbClient) {
      // Modo sem banco: retorna array vazio
      return res.json([]);
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    try {
      const { rows } = await dbClient.query(`
        SELECT * FROM (
          SELECT id, identificador, mensagem_processada, distancia_cm, timestamp
          FROM leituras_brutas
          ORDER BY timestamp DESC
          LIMIT $1
        ) sub
        ORDER BY timestamp ASC;
      `, [limit]);

      res.json(rows);
    } catch (e) {
      console.error('❌ Erro ao buscar mensagens:', e.message);
      res.status(500).json({ error: 'Erro ao consultar o banco de dados.' });
    }
  });

  // --------------------------------------------------
  // GET /api/health
  // Healthcheck simples
  // --------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      db: dbClient ? 'connected' : 'disconnected',
      serial: PORT_NAME,
      uptime: process.uptime(),
    });
  });

  app.listen(HTTP_PORT, () => {
    console.log(`🚀 Servidor ReDuino rodando em http://localhost:${HTTP_PORT}`);
    console.log(`   Endpoints disponíveis:`);
    console.log(`   GET  /api/status   → estado atual do sensor`);
    console.log(`   POST /api/toggle   → liga/desliga o sistema`);
    console.log(`   GET  /api/messages → histórico de leituras`);
    console.log(`   GET  /api/health   → healthcheck`);
  });
}

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------

/**
 * Replica a lógica getSensorState() do frontend
 * para manter consistência entre back e front.
 */
function buildSensorState(dist) {
  if (dist > 120) return { alert: 'safe',   statusText: 'SEGURO',  beepsPerSec: '1' };
  if (dist > 60)  return { alert: 'warn',   statusText: 'ATENÇÃO', beepsPerSec: '3' };
  if (dist > 25)  return { alert: 'danger', statusText: 'PERIGO',  beepsPerSec: '8' };
  return             { alert: 'danger', statusText: 'COLISÃO!', beepsPerSec: '∞' };
}

// ----------------------------------------------------
// Main
// ----------------------------------------------------
async function main() {
  console.log('🔧 Iniciando ReDuino Back...');

  try {
    dbClient = await setupDatabase();
  } catch (e) {
    console.warn('⚠️  Falha ao conectar ao banco:', e.message);
    console.log('   Continuando sem persistência...');
  }

  startSerialMonitor();
  startWebServer();
}

main();
