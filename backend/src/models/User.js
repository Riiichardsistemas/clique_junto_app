const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: 'O nome e obrigatorio.' } },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: { msg: 'Este email ja esta cadastrado.' },
        validate: { isEmail: { msg: 'Email invalido.' } },
        set(value) {
          this.setDataValue('email', String(value || '').trim().toLowerCase());
        },
      },
      // Pode ser null para contas criadas via Google OAuth (etapa futura)
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      provider: {
        type: DataTypes.ENUM('credentials', 'google'),
        allowNull: false,
        defaultValue: 'credentials',
      },
      googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // Papel do usuario: 'user' (organizador comum) ou 'admin' (super-admin do sistema)
      role: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
      },
      // Conta ativa; admin pode desativar um usuario
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      // CPF/CNPJ (opcional) usado para gerar cobranca no Asaas
      cpfCnpj: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Incrementado ao trocar/resetar a senha para invalidar JWTs ja emitidos.
      tokenVersion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Saldo de creditos (em centavos de BRL) concedido pelo super-admin.
      // Pode ser usado no checkout para ativar um evento pago sem pagar.
      creditCents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'users',
      timestamps: true,
    }
  );

  // Metodo de instancia para validar senha
  User.prototype.checkPassword = function (plainPassword) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(plainPassword, this.passwordHash);
  };

  // Remove campos sensiveis ao serializar para JSON
  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.passwordHash;
    delete values.googleId;
    return values;
  };

  // Helper para definir a senha (gera hash)
  User.hashPassword = async function (plainPassword) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plainPassword, salt);
  };

  return User;
};
