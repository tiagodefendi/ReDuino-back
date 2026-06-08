const express = require('express');
const cors = require('cors');
const { HTTP_PORT } = require('./config');
const routes = require('./routes');

function startWebServer() {
  const app = express();

  app.use(cors());  // aceita qualquer origem
  app.use(express.json());
  app.use('/api', routes);

  app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ReDuino rodando em http://localhost:${HTTP_PORT}`);
    console.log(`   GET  /api/status  → estado atual do sensor`);
    console.log(`   POST /api/toggle  → liga/desliga o sistema`);
    console.log(`   GET  /api/health  → healthcheck`);
  });
}

module.exports = { startWebServer };