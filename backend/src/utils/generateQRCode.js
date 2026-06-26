const QRCode = require('qrcode');

/**
 * Gera o PNG do QR Code (buffer) apontando para a URL do evento.
 */
async function generateQRCodeBuffer(url, opts = {}) {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: opts.scale || 10, // ~ alta resolucao
    color: { dark: '#0a0a0a', light: '#ffffff' },
  });
}

/**
 * Gera um "QR de mesa" em SVG (string) — layout bonito com nome do evento,
 * o QR Code embutido e a chamada "Fotografe o seu momento".
 * SVG evita dependencia nativa (sharp/canvas) e imprime em alta qualidade.
 */
async function generateTableSignSVG(eventName, url) {
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 1,
    scale: 12,
    color: { dark: '#0a0a0a', light: '#ffffff' },
  });

  const safeName = String(eventName || 'Nosso evento').replace(/[<&>]/g, '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1414" viewBox="0 0 1000 1414">
  <rect width="1000" height="1414" fill="#0a0a0a"/>
  <rect x="40" y="40" width="920" height="1334" rx="28" fill="#141414" stroke="#d4a853" stroke-width="2"/>
  <text x="500" y="180" text-anchor="middle" fill="#d4a853" font-family="Georgia, serif" font-size="34" letter-spacing="6">ERA UMA VEZ</text>
  <text x="500" y="300" text-anchor="middle" fill="#ffffff" font-family="Georgia, serif" font-size="64" font-style="italic">${safeName}</text>
  <rect x="270" y="420" width="460" height="460" rx="20" fill="#ffffff"/>
  <image x="290" y="440" width="420" height="420" href="${qrDataUrl}"/>
  <text x="500" y="1000" text-anchor="middle" fill="#ffffff" font-family="Georgia, serif" font-size="48">Fotografe o seu momento</text>
  <text x="500" y="1070" text-anchor="middle" fill="#9a9a9a" font-family="Arial, sans-serif" font-size="26">Aponte a câmera do seu celular para o código</text>
  <text x="500" y="1300" text-anchor="middle" fill="#d4a853" font-family="Arial, sans-serif" font-size="24">As fotos se revelam no fim do evento ✨</text>
</svg>`;
}

module.exports = { generateQRCodeBuffer, generateTableSignSVG };
