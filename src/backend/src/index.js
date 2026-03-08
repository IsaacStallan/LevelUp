// DIAGNOSTIC BUILD — minimal server to test Railway connectivity
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), v: 'v10-minimal', port: PORT, pid: process.pid });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[diag] Minimal server bound to 0.0.0.0:${PORT} pid=${process.pid}`);
});
