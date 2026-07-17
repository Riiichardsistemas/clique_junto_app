const { DataTypes } = require('sequelize');
const { EVENT_TYPES, EVENT_STATUS, FILTERS } = require('../config/constants');

module.exports = (sequelize) => {
  const Event = sequelize.define(
    'Event',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: 'O nome do evento e obrigatorio.' } },
      },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      type: {
        type: DataTypes.ENUM(...EVENT_TYPES),
        allowNull: false,
        defaultValue: 'outro',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(EVENT_STATUS)),
        allowNull: false,
        defaultValue: EVENT_STATUS.DRAFT,
      },
      // Datas
      startsAt: { type: DataTypes.DATE, allowNull: true },
      endsAt: { type: DataTypes.DATE, allowNull: true }, // para de aceitar fotos
      revealAt: { type: DataTypes.DATE, allowNull: true }, // fotos aparecem
      // Configuracoes
      photoLimitPerGuest: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 }, // 0 = ilimitado
      defaultFilter: { type: DataTypes.ENUM(...FILTERS), allowNull: false, defaultValue: 'nenhum' },
      isPrivate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // Plano / pagamento
      planId: { type: DataTypes.STRING, allowNull: false, defaultValue: 'free' },
      maxGuests: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      isPaid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      pricePaidCents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      // Recap
      recapVideoUrl: { type: DataTypes.STRING, allowNull: true },
      recapStatus: {
        type: DataTypes.ENUM('none', 'processing', 'ready', 'failed'),
        allowNull: false,
        defaultValue: 'none',
      },
      // QR
      qrCodeUrl: { type: DataTypes.STRING, allowNull: true },
      revealEmailSent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // ----- Telão ao vivo (slideshow) -----
      // Chave secreta para o link compartilhável do telão
      slideshowKey: { type: DataTypes.STRING, allowNull: true, unique: true },
      // Se true, o telão exibe as fotos ao vivo (antes da revelação)
      liveWallEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // ----- Personalização (identidade visual do evento) -----
      coverImageUrl: { type: DataTypes.STRING, allowNull: true }, // imagem de fundo/capa
      logoUrl: { type: DataTypes.STRING, allowNull: true },       // logo/monograma
      themeColor: { type: DataTypes.STRING, allowNull: true },    // cor de destaque (hex)
      welcomeMessage: { type: DataTypes.TEXT, allowNull: true },  // mensagem de boas-vindas
      // Modelo da página de entrada: 'classic' (escuro) | 'convite' (claro, polaroids)
      entryTemplate: { type: DataTypes.STRING, allowNull: false, defaultValue: 'classic' },
      venueName: { type: DataTypes.STRING, allowNull: true },     // local do evento (ex: Quinta do Vale)
      invitePhoto1Url: { type: DataTypes.STRING, allowNull: true }, // polaroids do convite
      invitePhoto2Url: { type: DataTypes.STRING, allowNull: true },
      invitePhoto3Url: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: 'events', timestamps: true }
  );

  // Helpers de estado (em tempo real, baseados nas datas)
  Event.prototype.isAcceptingPhotos = function () {
    if (this.status !== EVENT_STATUS.ACTIVE) return false;
    const now = new Date();
    if (this.startsAt && now < new Date(this.startsAt)) return false;
    if (this.endsAt && now > new Date(this.endsAt)) return false;
    return true;
  };

  Event.prototype.isRevealed = function () {
    if (this.status === EVENT_STATUS.REVEALED) return true;
    if (this.revealAt && new Date() >= new Date(this.revealAt)) return true;
    return false;
  };

  return Event;
};
