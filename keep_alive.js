const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Grave Bot aktif! Uptime: ' + Math.floor(process.uptime()) + ' saniye');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    memory: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log('[SERVER] Express sunucusu ' + PORT + ' portunda baslatildi');
  console.log('[SERVER] Bot 7/24 icin hazir!');
});
