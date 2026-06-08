const { Router } = require('express');
const { PORT_NAME } = require('./config');
const { buildSensorState } = require('./helpers');
const state = require('./state');

const router = Router();

router.get('/status', (req, res) => {
  const sensorState = buildSensorState(state.lastDistance);

  res.json({
    active:      true,
    distance:    state.lastDistance,
    alert:       sensorState.alert,
    statusText:  sensorState.statusText,
    beepsPerSec: sensorState.beepsPerSec,
    updatedAt:   state.lastUpdated,
    canal:       state.canalAtual,
  });
});

router.post('/toggle', (req, res) => {
  if (typeof req.body?.active === 'boolean') {
    state.isSystemActive = req.body.active;
  } else {
    state.isSystemActive = !state.isSystemActive;
  }

  console.log(`🔘 Sistema ${state.isSystemActive ? 'ATIVADO' : 'DESATIVADO'}`);
  res.json({ active: state.isSystemActive });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    serial: PORT_NAME,
    uptime: process.uptime(),
  });
});

module.exports = router;
