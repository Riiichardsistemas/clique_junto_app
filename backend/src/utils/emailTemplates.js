// Templates HTML simples (pt-BR) para os emails transacionais.

// Escapa qualquer valor dinamico (nome, apelido, nome do evento) antes de
// interpola-lo no HTML — evita injecao de HTML/links de phishing no email.
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

const wrap = (inner) => `
<div style="background:#0a0a0a;padding:32px;font-family:Arial,sans-serif;color:#fff">
  <div style="max-width:520px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden">
    <div style="padding:24px 28px;border-bottom:1px solid #2a2a2a">
      <span style="font-family:Georgia,serif;font-size:18px;letter-spacing:3px">ERA <span style="color:#d4a853">UMA VEZ</span></span>
    </div>
    <div style="padding:28px">${inner}</div>
    <div style="padding:18px 28px;border-top:1px solid #2a2a2a;color:#777;font-size:12px">
      Voce recebeu este email porque usa a plataforma CLIQUE JUNTO.
    </div>
  </div>
</div>`;

const btn = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:#d4a853;color:#0a0a0a;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;margin-top:8px">${label}</a>`;

const welcome = (name) => ({
  subject: 'Bem-vindo ao CLIQUE JUNTO ✨',
  html: wrap(`<h2 style="font-family:Georgia,serif;margin-top:0">Ola, ${esc(name)}!</h2>
    <p style="color:#cfcfcf">Sua conta foi criada. Agora voce ja pode criar seu primeiro evento e guardar memorias inesqueciveis.</p>`),
});

const paymentConfirmed = (name, eventName, eventUrl) => ({
  subject: 'Pagamento confirmado — seu evento esta ativo!',
  html: wrap(`<h2 style="font-family:Georgia,serif;margin-top:0">Tudo certo, ${esc(name)}!</h2>
    <p style="color:#cfcfcf">O pagamento do evento <strong>${esc(eventName)}</strong> foi confirmado e ele ja esta ativo.</p>
    <p>${btn(eventUrl, 'Abrir meu evento')}</p>`),
});

const eventRevealed = (name, eventName, albumUrl) => ({
  subject: 'Seu album esta pronto! 📸',
  html: wrap(`<h2 style="font-family:Georgia,serif;margin-top:0">As memorias foram reveladas!</h2>
    <p style="color:#cfcfcf">O album do evento <strong>${esc(eventName)}</strong> acabou de ser revelado. Veja todas as fotos dos seus convidados.</p>
    <p>${btn(albumUrl, 'Ver as fotos')}</p>`),
});

const reminder24h = (name, eventName) => ({
  subject: 'Seu evento comeca em 24h ⏰',
  html: wrap(`<h2 style="font-family:Georgia,serif;margin-top:0">Falta pouco!</h2>
    <p style="color:#cfcfcf">O evento <strong>${esc(eventName)}</strong> comeca em 24 horas. Nao esqueca de imprimir o QR Code de mesa.</p>`),
});

const recapReady = (name, eventName, recapUrl) => ({
  subject: 'Seu video recap esta pronto! 🎬',
  html: wrap(`<h2 style="font-family:Georgia,serif;margin-top:0">O filme do seu evento chegou</h2>
    <p style="color:#cfcfcf">O video recap de <strong>${esc(eventName)}</strong> ja pode ser assistido e baixado.</p>
    <p>${btn(recapUrl, 'Assistir recap')}</p>`),
});

const guestAlbumReady = (nickname, eventName, albumUrl) => ({
  subject: `O álbum "${eventName}" foi revelado! 📸`,
  html: wrap(`<h2 style="font-family:Georgia,serif;margin-top:0">Suas memórias chegaram, ${esc(nickname || 'convidado')}!</h2>
    <p style="color:#cfcfcf">O álbum <strong>${esc(eventName)}</strong> acaba de ser revelado. Acesse para ver todas as fotos dos participantes.</p>
    <p>${btn(albumUrl, 'Ver o álbum')}</p>
    <p style="color:#777;font-size:13px;margin-top:16px">Você recebeu este email porque participou deste evento como convidado.</p>`),
});

const forgotPassword = (name, resetUrl) => ({
  subject: 'Redefinir senha — Clique Junto',
  html: wrap(`<h2 style="font-family:Georgia,serif;margin-top:0">Olá, ${esc(name)}!</h2>
    <p style="color:#cfcfcf">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo (válido por 1 hora).</p>
    <p>${btn(resetUrl, 'Redefinir senha')}</p>
    <p style="color:#777;font-size:13px;margin-top:16px">Se não foi você, pode ignorar este email — sua senha continua a mesma.</p>`),
});

// Notificação interna ao super admin quando um novo usuário se cadastra.
const newSignupAdmin = (user, adminUrl) => {
  const row = (label, value) =>
    `<tr>
      <td style="padding:8px 0;color:#888;font-size:13px;width:110px">${esc(label)}</td>
      <td style="padding:8px 0;color:#fff;font-size:14px;font-weight:bold">${esc(value)}</td>
    </tr>`;
  const when = new Date(user.createdAt || Date.now()).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return {
    subject: `Novo cadastro: ${esc(user.name)}`,
    html: wrap(`<h2 style="font-family:Georgia,serif;margin-top:0">Novo cadastro na plataforma</h2>
      <p style="color:#cfcfcf">Um novo usuário acabou de criar uma conta:</p>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        ${row('Nome', user.name)}
        ${row('Email', user.email)}
        ${row('Tipo', user.role === 'admin' ? 'Administrador' : 'Organizador')}
        ${row('Origem', user.provider === 'google' ? 'Google' : 'Email e senha')}
        ${row('Data', when)}
      </table>
      ${adminUrl ? `<p style="margin-top:20px">${btn(adminUrl, 'Ver no painel')}</p>` : ''}`),
  };
};

module.exports = { welcome, paymentConfirmed, eventRevealed, reminder24h, recapReady, guestAlbumReady, forgotPassword, newSignupAdmin };
