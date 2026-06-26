const cron = require('node-cron');
const { Op } = require('sequelize');
const { Event, Photo, User } = require('../models');
const { EVENT_STATUS } = require('../config/constants');
const { sendMail } = require('../config/mailer');
const templates = require('../utils/emailTemplates');

/**
 * Revela eventos cujo revealAt ja passou e que ainda nao foram revelados.
 * Executa a cada minuto.
 */
async function runRevealCheck() {
  const now = new Date();
  const due = await Event.findAll({
    where: {
      revealAt: { [Op.ne]: null, [Op.lte]: now },
      status: { [Op.notIn]: [EVENT_STATUS.REVEALED, EVENT_STATUS.DRAFT] },
    },
  });

  for (const event of due) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await Photo.update({ isVisible: true }, { where: { eventId: event.id } });
      event.status = EVENT_STATUS.REVEALED;
      // eslint-disable-next-line no-await-in-loop
      await event.save();

      if (!event.revealEmailSent) {
        // eslint-disable-next-line no-await-in-loop
        const user = await User.findByPk(event.userId);
        if (user) {
          const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0];
          const albumUrl = `${base}/e/${event.slug}/album`;
          const tpl = templates.eventRevealed(user.name, event.name, albumUrl);
          // eslint-disable-next-line no-await-in-loop
          await sendMail({ to: user.email, ...tpl }).catch(() => {});
        }
        event.revealEmailSent = true;
        // eslint-disable-next-line no-await-in-loop
        await event.save();
      }
      console.log(`[revealJob] Evento revelado: ${event.slug}`);
    } catch (e) {
      console.error('[revealJob] erro ao revelar', event.id, e.message);
    }
  }
}

function startRevealJob() {
  // A cada minuto
  cron.schedule('* * * * *', () => {
    runRevealCheck().catch((e) => console.error('[revealJob]', e.message));
  });
  console.log('[revealJob] Agendado (a cada minuto).');
}

module.exports = { startRevealJob, runRevealCheck };
