const { Event } = require('../models');
const { generateQRCodeBuffer, generateTableSignSVG } = require('../utils/generateQRCode');

function guestUrl(event, req) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].replace(/\/$/, '');
  return `${base}/e/${event.slug}`;
}

// GET /api/events/:id/qrcode — PNG em alta resolucao
async function getQRCode(req, res, next) {
  try {
    const event = await Event.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });

    const buffer = await generateQRCodeBuffer(guestUrl(event, req), { scale: 12 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qrcode-${event.slug}.png"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

// GET /api/events/:id/table-sign — SVG "de mesa" para impressao
async function getTableSign(req, res, next) {
  try {
    const event = await Event.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!event) return res.status(404).json({ error: 'Evento nao encontrado.' });

    const svg = await generateTableSignSVG(event.name, guestUrl(event, req));
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', `inline; filename="placa-mesa-${event.slug}.svg"`);
    res.send(svg);
  } catch (err) {
    next(err);
  }
}

module.exports = { getQRCode, getTableSign };
