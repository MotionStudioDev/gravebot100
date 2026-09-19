let canvasAvailable = true;
let createCanvas;
try {
  createCanvas = require('@napi-rs/canvas').createCanvas;
  const testCanvas = createCanvas(10, 10);
  testCanvas.getContext('2d');
} catch {
  canvasAvailable = false;
  console.log('[CAPTCHA] Canvas bulunamadi, metin moduna gecildi');
}

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createCaptchaImage(code) {
  if (!canvasAvailable) return null;
  try {
    const width = 450;
    const height = 160;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0f0c29');
    grad.addColorStop(0.5, '#302b63');
    grad.addColorStop(1, '#24243e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
    }
    for (let i = 0; i < height; i += 20) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke();
    }
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = 'rgba(' + Math.floor(Math.random()*255) + ',' + Math.floor(Math.random()*255) + ',' + Math.floor(Math.random()*255) + ',0.08)';
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 5 + Math.random() * 25;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = 'rgba(' + Math.floor(Math.random()*255) + ',' + Math.floor(Math.random()*255) + ',' + Math.floor(Math.random()*255) + ',0.15)';
      ctx.lineWidth = 15 + Math.random() * 10;
      ctx.beginPath();
      const startY = Math.random() * height;
      ctx.moveTo(-20, startY);
      for (let x = 0; x <= width + 20; x += 10) {
        ctx.lineTo(x, startY + Math.sin(x * 0.02 + i * 2) * 20);
      }
      ctx.stroke();
    }
    const colors = ['#ff6b6b','#4ecdc4','#45b7d1','#96e6a1','#dda0dd','#feca57','#ff9ff3'];
    const totalWidth = code.length * 55;
    const startX = (width - totalWidth) / 2;
    for (let i = 0; i < code.length; i++) {
      const x = startX + i * 55;
      const y = 90 + Math.random() * 15 - 7;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.random() - 0.5) * 0.6);
      ctx.font = 'bold ' + (38 + Math.floor(Math.random() * 8)) + 'px monospace';
      ctx.shadowColor = colors[i % colors.length];
      ctx.shadowBlur = 12;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillText(code[i], 0, 0);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeText(code[i], 0, 0);
      ctx.restore();
    }
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = 'rgba(' + Math.floor(Math.random()*255) + ',' + Math.floor(Math.random()*255) + ',' + Math.floor(Math.random()*255) + ',0.5)';
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(Math.random()*width, Math.random()*height, Math.random()*width, Math.random()*height, Math.random()*width, Math.random()*height);
      ctx.stroke();
    }
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = 'rgba(' + Math.floor(Math.random()*255) + ',' + Math.floor(Math.random()*255) + ',' + Math.floor(Math.random()*255) + ',' + (0.2 + Math.random() * 0.4) + ')';
      ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, width - 6, height - 6);
    return canvas.toBuffer('image/png');
  } catch (err) {
    console.error('[CAPTCHA] Canvas hatasi:', err.message);
    return null;
  }
}

module.exports = { generateCode, createCaptchaImage, isCanvasAvailable: () => canvasAvailable };
