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
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      provider: 'credentials',
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

module.exports = { register, login, me };
