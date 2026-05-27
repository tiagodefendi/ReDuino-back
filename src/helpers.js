function buildSensorState(dist) {
  if (dist > 45) return { alert: 'safe',   statusText: 'SEGURO',   beepsPerSec: '1' };
  if (dist > 30) return { alert: 'warn',   statusText: 'ATENÇÃO',  beepsPerSec: '3' };
  if (dist > 15) return { alert: 'danger', statusText: 'PERIGO',   beepsPerSec: '8' };
  return               { alert: 'danger', statusText: 'COLISÃO!', beepsPerSec: '∞' };
}

module.exports = { buildSensorState };
