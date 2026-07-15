const crypto = require('crypto');
const { User } = require('../models');
const { generateAuthToken } = require('../utils/generateToken');
const { sendMail } = require('../config/mailer');
const templates = require('../utils/emailTemplates');

/**
 * POST /api/auth/register
 * Cadastro do organizador (email + senha).
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha sao obrigatorios.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'Este email ja esta cadastrado.' });
    }

    const passwordHash = await User.hashPassword(password);
    // Auto-promove o primeiro admin se o email casar com ADMIN_EMAIL
    const adminEmails = String(process.env.ADMIN_EMAIL || '')
      .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const role = adminEmails.includes(normalizedEmail) ? 'admin' : 'user';
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      provider: 'credentials',
      role,
    });

    // Email de boas-vindas (mock se nao houver SMTP)
    sendMail({ to: user.email, ...templates.welcome(user.name) }).catch(() => {});

    const token = generateAuthToken(user);
    return res.status(201).json({ user: user.toJSON(), token });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Login do organizador (email + senha).
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });

    // Mensagem generica para nao revelar se o email existe
    const invalid = () => res.status(401).json({ error: 'Email ou senha incorretos.' });

    if (!user || !user.passwordHash) return invalid();

    const ok = await user.checkPassword(password);
    if (!ok) return invalid();

    const token = generateAuthToken(user);
    return res.json({ user: user.toJSON(), token });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Retorna o organizador autenticado (rota protegida).
 */
async function me(req, res) {
  return res.json({ user: req.user.toJSON() });
}

/**
 * POST /api/auth/forgot-password
 * Gera token de reset e envia email.
 */
async function forgotPassword(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email obrigatório.' });

    const user = await User.findOne({ where: { email } });
    // Responde sempre 200 para não revelar se o email existe
    if (!user) return res.json({ ok: true });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600 * 1000); // 1h
    await user.save();

    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0];
    const resetUrl = `${base}/reset-password?token=${token}`;
    await sendMail({ to: user.email, ...templates.forgotPassword(user.name, resetUrl) }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Valida token e atualiza senha.
 */
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token e senha obrigatórios.' });
    if (String(password).length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });

    const user = await User.findOne({ where: { resetPasswordToken: token } });
    if (!user || !user.resetPasswordExpires || new Date(user.resetPasswordExpires) < new Date()) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    user.passwordHash = await User.hashPassword(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/me
 * Atualiza nome, email e/ou senha do organizador.
 */
async function updateMe(req, res, next) {
  try {
    const user = req.user;
    const { name, email, password, currentPassword } = req.body;

    if (name) user.name = String(name).trim();

    if (email) {
      const normalized = String(email).trim().toLowerCase();
      const conflict = await User.findOne({ where: { email: normalized } });
      if (conflict && conflict.id !== user.id) {
        return res.status(409).json({ error: 'Este email já está em uso.' });
      }
      user.email = normalized;
    }

    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
      }
      if (user.passwordHash) {
        if (!currentPassword) return res.status(400).json({ error: 'Informe a senha atual.' });
        const ok = await user.checkPassword(currentPassword);
        if (!ok) return res.status(401).json({ error: 'Senha atual incorreta.' });
      }
      user.passwordHash = await User.hashPassword(password);
    }

    await user.save();
    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword, updateMe };
