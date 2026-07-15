#!/usr/bin/env node
/**
 * Promove (ou rebaixa) um usuário a admin pelo e-mail.
 *
 *   node scripts/makeAdmin.js contato@exemplo.com          # promove a admin
 *   node scripts/makeAdmin.js contato@exemplo.com user      # rebaixa a user
 */
require('dotenv').config();
const db = require('../src/models');

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  const role = (process.argv[3] || 'admin').trim();
  if (!email) {
    console.error('Uso: node scripts/makeAdmin.js <email> [admin|user]');
    process.exit(1);
  }
  if (!['admin', 'user'].includes(role)) {
    console.error('Role invalida. Use "admin" ou "user".');
    process.exit(1);
  }
  await db.sequelize.authenticate();
  const user = await db.User.findOne({ where: { email } });
  if (!user) {
    console.error(`Usuario nao encontrado: ${email}`);
    process.exit(1);
  }
  user.role = role;
  await user.save();
  console.log(`OK: ${email} agora e "${role}".`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
