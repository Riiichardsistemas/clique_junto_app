#!/usr/bin/env node

require('dotenv').config();
const db = require('../src/models');

const DEFAULT_EMAIL = 'ricahrdfbpa@hotmail.com';
const DEFAULT_NAME = 'Richard';

async function main() {
  const email = String(process.argv[2] || DEFAULT_EMAIL).trim().toLowerCase();
  const name = String(process.argv[3] || DEFAULT_NAME).trim();
  const password = String(process.env.SUPER_ADMIN_PASSWORD || '');

  if (!email) throw new Error('Informe o email do super administrador.');
  if (!name) throw new Error('Informe o nome do super administrador.');
  if (password.length < 6) {
    throw new Error('A senha deve ter pelo menos 6 caracteres.');
  }

  await db.sequelize.authenticate();
  await db.sequelize.sync();

  let user = await db.User.findOne({ where: { email } });
  const passwordHash = await db.User.hashPassword(password);
  const action = user ? 'atualizado' : 'criado';

  if (user) {
    user.name = name;
    user.passwordHash = passwordHash;
    user.role = 'admin';
    user.isActive = true;
    await user.save();
  } else {
    user = await db.User.create({
      name,
      email,
      passwordHash,
      provider: 'credentials',
      role: 'admin',
      isActive: true,
    });
  }

  console.log(`OK: super administrador ${action}: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(`ERRO: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.sequelize.close().catch(() => {});
  });
