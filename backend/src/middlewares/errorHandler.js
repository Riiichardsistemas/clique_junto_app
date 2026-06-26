/* eslint-disable no-unused-vars */

// 404 - rota nao encontrada
function notFound(req, res, next) {
  res.status(404).json({ error: 'Rota nao encontrada.' });
}

// Handler global de erros
function errorHandler(err, req, res, next) {
  // Erros de validacao / unique do Sequelize
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ error: messages[0] || 'Dados invalidos.', details: messages });
  }

  // Erro com status definido manualmente
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    console.error('[ERRO]', err);
  }

  res.status(status).json({
    error: err.message || 'Erro interno do servidor.',
  });
}

module.exports = { notFound, errorHandler };
