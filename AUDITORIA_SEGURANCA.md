# Auditoria de Segurança — Clique Junto / Era Uma Vez

**Data:** 22/07/2026
**Escopo:** Backend (Node/Express + Sequelize) e Frontend (React/Vite), pré-lançamento em produção.
**Objetivo:** identificar falhas de autenticação, autorização, exposição de dados e vazamento de informação. Nenhuma regra de negócio foi alterada.

---

## 0. Correções aplicadas (22/07/2026)

Os itens **#2, #3, #4, #5, #6, #7 e #8** foram implementados no código. Resumo:

| # | O que foi feito | Arquivos alterados |
|---|-----------------|--------------------|
| #2 | `helmet` + `app.disable('x-powered-by')` + HSTS em prod + `nosniff`/CSP-sandbox no static `/uploads` | `backend/src/app.js` |
| #3 | `ASAAS_WEBHOOK_TOKEN` agora é **obrigatório** quando o Asaas está ativo — validado no boot e no handler (recusa 503 sem token) | `backend/src/app.js`, `controllers/paymentController.js` |
| #4 | Erros 5xx retornam mensagem genérica ao cliente (detalhe só no log) | `backend/src/middlewares/errorHandler.js` |
| #5 | JWT fixado em `HS256` (assinatura e verificação) + coluna `tokenVersion` com **revogação** ao trocar/resetar senha + **migração idempotente no restart** | `app.js`, `utils/generateToken.js`, `middlewares/authMiddleware.js`, `models/User.js`, `controllers/authController.js`, `frontend/src/pages/AccountSettings.jsx` |
| #6 | **CSP forte** adicionada no frontend (Vercel). Ver ressalva sobre cookie HttpOnly abaixo | `frontend/vercel.json` |
| #7 | Escape de HTML de `name`/`nickname`/`eventName` em todos os e-mails | `backend/src/utils/emailTemplates.js` |
| #8 | Floors de versão elevados: `express` 4.21, `helmet` 7.2 (novo), `nodemailer` 7, `multer` 2, `node-cron` 4, `sharp` 0.35, `sequelize` 6.37.7 | `backend/package.json` |

**⚠️ Ações necessárias para as correções entrarem em vigor:**

1. **Reinstalar dependências** (o `helmet` é novo — sem ele o servidor não sobe):
   ```bash
   cd backend && npm install && npm audit
   cd ../frontend && npm install && npm audit
   ```
   Rode localmente (não no meu ambiente), para os módulos nativos (`sqlite3`, `sharp`) serem compilados para o seu sistema. Após `npm install`, confira `npm audit`; se restar algo, `npm audit fix` (e, se necessário, `--force`). Teste envio de e-mail (nodemailer 7), upload/thumbnail (multer 2 / sharp 0.35) e o cron de revelação (node-cron 4).

2. **A migração `tokenVersion` roda sozinha no restart** do backend (`runStartupMigrations` em `app.js`), inclusive em produção — adiciona a coluna só se ela não existir. Basta reiniciar o servidor.

3. **Definir `ASAAS_WEBHOOK_TOKEN`** (≥ 16 caracteres) no Railway e o mesmo valor no painel do Asaas. Sem isso, com o Asaas ativo, o boot em produção falhará de propósito (proteção do #3).

**Sobre a #6 (cookie HttpOnly) — ressalva de arquitetura:** seu frontend (Vercel) e backend (Railway) ficam em **domínios diferentes**. Cookie de sessão nesse cenário é *cookie de terceiro*, que os navegadores bloqueiam por padrão (exigiria `SameSite=None` + tolerância a terceiros, cada vez mais restrita). Migrar para cookie HttpOnly **quebraria a autenticação em produção**. A solução correta e segura, se quiser cookie, é servir a API sob o **mesmo domínio** do app (ex.: `app.seudominio.com` → `/api` via proxy) — aí o cookie passa a ser *first-party*. Por isso, apliquei a mitigação viável para a sua arquitetura atual: **CSP forte** (reduz o risco de XSS que roubaria o token) somada à **revogação de token do #5** (limita a janela de um token vazado). Posso fazer a migração para mesmo-domínio + cookie HttpOnly como trabalho separado, se decidir por essa topologia.

Itens **#1, #9–#20 permanecem pendentes** conforme as seções abaixo.

---

## 1. Resumo executivo

O projeto está, no geral, **bem estruturado do ponto de vista de segurança**. Os pontos fortes já implementados são relevantes:

- **IDs UUID** em todas as tabelas (elimina enumeração/IDOR por incremento).
- **Checagem de posse consistente** (`where: { id, userId: req.user.id }`) em praticamente todos os controllers (eventos, fotos, pagamentos, recap, QR). O isolamento multi-tenant está correto.
- **Sequelize com queries parametrizadas** — não há `raw` query, `sequelize.literal`, nem concatenação de SQL. Sem SQL injection.
- **bcrypt** para senhas, **mensagem de login genérica**, **forgot-password não enumerável**, proteção de **auto-lockout** do super-admin, **log de auditoria** administrativo.
- **Validação de configuração de produção** (segredos fortes, URLs https, JWT ≠ GUEST_JWT).
- `.env` **não versionado** (confirmado no histórico do git), sem source maps no `dist`, sem `console.log` no frontend, sem `dangerouslySetInnerHTML`.

Ainda assim, existem **falhas que devem ser corrigidas antes do go-live**, com destaque para o **endpoint de upload local sem autenticação**, a **ausência de cabeçalhos de segurança (Helmet)** e o **webhook de pagamento com autenticação opcional**.

**Contagem por gravidade:** 2 Altas · 6 Médias · 7 Baixas · 5 Informativas.
**Dependências:** `npm audit` reporta 14 vulnerabilidades no backend (1 crítica, 7 altas) e 2 no frontend.

---

## 2. Tabela de achados

| # | Gravidade | Arquivo | Problema | Correção | Prioridade |
|---|-----------|---------|----------|----------|------------|
| 1 | **ALTA** | `backend/src/routes/photos.js:17` · `controllers/photoController.js:56` | Upload local `PUT /photos/storage/:key` **sem autenticação** e sem validação de tipo/conteúdo | Exigir `guestMiddleware` + allowlist de extensão + servir `/uploads` com `nosniff`/`attachment` | P0 |
| 2 | **ALTA** | `backend/src/app.js` (geral) | Sem **Helmet**, `X-Powered-By` exposto, sem CSP/HSTS/nosniff na API e no static `/uploads` | Instalar `helmet`, `app.disable('x-powered-by')`, headers no static | P0 |
| 3 | **MÉDIA** | `controllers/paymentController.js:176` | Webhook Asaas com token **opcional**; produção não exige `ASAAS_WEBHOOK_TOKEN` → possível liberação de evento pago sem pagar | Tornar o token obrigatório em produção e rejeitar sem ele | P0 |
| 4 | **MÉDIA** | `middlewares/errorHandler.js:23` | `err.message` devolvido ao cliente em todos os erros (inclusive 500) → vazamento de detalhes internos | Mensagem genérica para 5xx em produção; logar só no servidor | P1 |
| 5 | **MÉDIA** | `utils/generateToken.js` · `middlewares/authMiddleware.js:20` | JWT sem revogação/refresh/rotação, expiração longa (7d/30d), algoritmo não fixado | Fixar `algorithms:['HS256']`, `tokenVersion`, refresh + expiração menor | P1 |
| 6 | **MÉDIA** | `frontend/src/api/axios.js:8` | Token em `localStorage` (roubável por qualquer XSS) | Cookie `HttpOnly`+`Secure`+`SameSite` ou, no mínimo, CSP forte | P1 |
| 7 | **MÉDIA** | `utils/emailTemplates.js` (todo) | `name`/`eventName`/`nickname` interpolados sem escape no HTML do e-mail → injeção de HTML/phishing | Escapar HTML de todo valor dinâmico | P1 |
| 8 | **MÉDIA** | `backend/package.json` | Dependências vulneráveis: `nodemailer`, `sharp`/libvips, `body-parser`, `multer` 1.x, `tar`/`node-gyp` | `npm audit fix`, atualizar nodemailer/sharp, migrar multer 2.x | P1 |
| 9 | **BAIXA** | `config/storage.js:127` · `app.js:113` | Fotos servidas em `/uploads/<key>` sem auth; privacidade pré-revelação depende só da aleatoriedade da key | Servir mídia local via endpoint autorizado; S3 já usa presigned | P2 |
| 10 | **BAIXA** | `controllers/photoController.js:86` | `create` aceita `storageKey` arbitrária (qualquer `events/...`) | Exigir prefixo `events/${event.id}/` | P2 |
| 11 | **BAIXA** | `controllers/authController.js` · `payments.js` | Sem rate-limit dedicado em `/auth/login`, `/forgot-password`, `/reset-password`, upload | Limiter estrito por rota sensível | P2 |
| 12 | **BAIXA** | `controllers/adminController.js:199+` | `LIKE '%search%'` com `%`/`_` não escapados (só admin) → varreduras caras | Escapar curingas | P3 |
| 13 | **BAIXA** | `app.js:90` | CORS `credentials:true` desnecessário (auth é Bearer, não cookie) | Remover `credentials` se mantiver Bearer | P3 |
| 14 | **BAIXA** | `controllers/authController.js:106` | `resetPasswordToken` guardado em texto puro no banco | Guardar hash (sha256) do token | P3 |
| 15 | **BAIXA** | `controllers/authController.js:18` | Política de senha fraca (mín. 6, sem complexidade) | Mín. 8-10 + verificação de vazamento | P3 |
| 16 | **INFO** | `controllers/paymentController.js:290` · `config/asaas.js:130` | PAN/CVV do cartão trafegam pelo backend → amplia escopo PCI-DSS | Usar checkout hospedado (`invoiceUrl`)/tokenização | P2 |
| 17 | **INFO** | `controllers/authController.js:29` | Auto-promoção a admin por `ADMIN_EMAIL` (quem registrar primeiro esse e-mail vira admin) | Pré-criar contas admin; não confiar em auto-promo | P3 |
| 18 | **INFO** | `payments.js:21` | Webhook state-changing sem CSRF/assinatura (coberto pelo #3) | Token obrigatório + idempotência (já parcial) | P1 |
| 19 | **INFO** | `backend/database.sqlite` | Arquivo SQLite com dados presente na pasta do projeto (não versionado) | Não incluir em pacotes/deploys | P3 |
| 20 | **INFO** | `frontend/*.timestamp-*.mjs`, `build*.log`, `.sync-test.txt` | Arquivos temporários/artefatos no repositório | Limpar e adicionar ao `.gitignore` | P3 |

---

## 3. Achados detalhados

### 🔴 #1 — Upload local sem autenticação (ALTA)

**Arquivo:** `backend/src/routes/photos.js:17-20` e `backend/src/controllers/photoController.js:56-71`

```js
// routes/photos.js — NÃO há authMiddleware/guestMiddleware aqui
router.put('/storage/:key', express.raw({ type: '*/*', limit: '40mb' }), (req, res, next) => {
  req.rawBuffer = req.body && req.body.length ? req.body : null;
  next();
}, ctrl.localStorageUpload);
```

```js
// controllers/photoController.js
function isSafeKey(key) {
  if (typeof key !== 'string' || !key.startsWith('events/')) return false;
  const normalized = path.posix.normalize(key);
  return normalized === key && !normalized.includes('..') && !path.isAbsolute(normalized);
}
async function localStorageUpload(req, res, next) {
  if (storage.useS3) return res.status(400)...;
  const key = decodeURIComponent(req.params.key);
  if (!isSafeKey(key)) return res.status(400)...;   // só valida traversal
  const buffer = req.rawBuffer;
  await storage.saveLocal(key, buffer);              // grava qualquer conteúdo
  res.json({ ok: true, key });
}
```

**Motivo:** a rota não tem nenhum middleware de autenticação. O `isSafeKey` impede *path traversal*, mas **não** verifica: (a) que a key foi emitida por `upload-url`, (b) o tipo/extensão do arquivo, (c) o Content-Type do corpo. Qualquer pessoa pode inventar uma key válida (`events/qualquer/x.html`) e gravar bytes arbitrários. O `fileFilter` do multer **não** se aplica a esta rota (ela usa `express.raw`).

**Como um atacante exploraria:**
1. `PUT /api/photos/storage/events/abc/evil.html` com corpo `<script>...</script>` (ou um SVG com script).
2. O arquivo é gravado e servido em `GET /uploads/events/abc/evil.html` pelo `express.static` — **com Content-Type `text/html`** e sem `nosniff`.
3. Resultado: **hospedagem de conteúdo arbitrário / XSS armazenado no domínio da API**, uso como servidor de phishing/malware, e enchimento de disco (DoS) já que não há limite de quantidade nem limiter nesta rota.

**Como corrigir:** exigir sessão de convidado, restringir extensão à mídia permitida, aplicar o `uploadLimiter`, e endurecer o static.

```js
// routes/photos.js
router.put('/storage/:key',
  uploadLimiter,
  guestMiddleware,                         // exige token de convidado
  express.raw({ type: '*/*', limit: '40mb' }),
  (req, res, next) => { req.rawBuffer = req.body?.length ? req.body : null; next(); },
  ctrl.localStorageUpload
);
```

```js
// controllers/photoController.js — validar extensão e dono
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.webm', '.mp4', '.mov'];
function isSafeKey(key, eventId) {
  if (typeof key !== 'string') return false;
  if (eventId && !key.startsWith(`events/${eventId}/`)) return false;   // dono da key
  else if (!key.startsWith('events/')) return false;
  const normalized = path.posix.normalize(key);
  if (normalized !== key || normalized.includes('..') || path.isAbsolute(normalized)) return false;
  return ALLOWED_EXT.includes(path.extname(normalized).toLowerCase());
}
async function localStorageUpload(req, res, next) {
  // ...
  if (!isSafeKey(key, req.event?.id)) return res.status(400).json({ error: 'Chave invalida.' });
  // ...
}
```

```js
// app.js — servir uploads de forma segura
app.use('/uploads', express.static(storage.uploadsDir, {
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline'); // ou 'attachment' para forçar download
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  },
}));
```

---

### 🔴 #2 — Ausência de cabeçalhos de segurança / Helmet (ALTA)

**Arquivo:** `backend/src/app.js` (não há `helmet`, confirmado: pacote não instalado)

**Motivo:** a API não envia `X-Content-Type-Options`, `X-Frame-Options`/CSP, `Strict-Transport-Security`, e expõe `X-Powered-By: Express` (fingerprinting). Combinado com o #1, o static serve conteúdo *sniffable*.

**Como um atacante exploraria:** *content-type sniffing* de arquivos enviados, *clickjacking* de páginas servidas pela API, e fingerprint do framework/versão para escolher exploits.

**Como corrigir:**

```bash
npm i helmet
```

```js
// app.js (logo após criar o app)
const helmet = require('helmet');
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite servir mídia ao frontend
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'none'"], imgSrc: ["'self'", 'data:'], mediaSrc: ["'self'"] },
  },
}));
app.use(helmet.hsts({ maxAge: 15552000 }));
```

*(O frontend na Vercel já define `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` e `Permissions-Policy` — bom. Falta apenas uma CSP no frontend.)*

---

### 🟠 #3 — Webhook de pagamento com autenticação opcional (MÉDIA)

**Arquivo:** `backend/src/controllers/paymentController.js:176-206`

```js
async function webhook(req, res) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expected) {                                   // <- só valida SE a var existir
    const got = req.headers['asaas-access-token'];
    if (got !== expected) return res.status(401).json({ error: 'unauthorized' });
  }
  // ... marca Plan como pago e ativa o evento
}
```

**Motivo:** se `ASAAS_WEBHOOK_TOKEN` não estiver configurado, o webhook fica **totalmente aberto**. A `validateProductionConfig()` em `app.js` **não** valida essa variável, então um deploy em produção pode subir sem ela sem qualquer aviso.

**Como um atacante exploraria:** conhecendo/adivinhando um `externalReference` (UUID do `Plan`) ou `providerPaymentId`, envia `POST /api/payments/webhook` com `{ event: 'PAYMENT_CONFIRMED', payment: { externalReference: '<id>' } }` e ativa um evento pago **sem pagar**. Os UUIDs reduzem a probabilidade (não são enumeráveis), mas o registro pode vazar por logs, URLs de fatura ou o próprio painel.

**Como corrigir:** tornar o token obrigatório e validá-lo no boot de produção.

```js
// app.js — dentro de validateProductionConfig()
if (process.env.ASAAS_API_KEY && String(process.env.ASAAS_WEBHOOK_TOKEN || '').length < 16) {
  errors.add('ASAAS_WEBHOOK_TOKEN');
}
```

```js
// paymentController.webhook — exigir sempre em produção
const expected = process.env.ASAAS_WEBHOOK_TOKEN;
if (process.env.NODE_ENV === 'production' && !expected) {
  console.error('[payments] webhook sem token configurado — rejeitando');
  return res.status(503).json({ error: 'webhook not configured' });
}
if (expected && req.headers['asaas-access-token'] !== expected) {
  return res.status(401).json({ error: 'unauthorized' });
}
```

---

### 🟠 #4 — Mensagens de erro verbosas (MÉDIA)

**Arquivo:** `backend/src/middlewares/errorHandler.js:19-25`

```js
if (status >= 500) console.error('[ERRO]', err);
res.status(status).json({ error: err.message || 'Erro interno do servidor.' });
```

**Motivo:** para erros 500 (falha de banco, bug interno) o `err.message` é enviado ao cliente. Também em `checkout`/`pixCheckout`/`cardCheckout` o erro cru do Asaas é repassado (`Falha ao criar cobranca no Asaas: ${e.message}`). Isso pode revelar detalhes de infraestrutura, nomes de colunas, ou mensagens do gateway.

**Como um atacante exploraria:** provoca erros (payloads malformados) e coleta as mensagens para mapear o backend (banco, ORM, integrações).

**Como corrigir:**

```js
function errorHandler(err, req, res, next) {
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ error: messages[0] || 'Dados invalidos.' });
  }
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('[ERRO]', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' }); // genérico
  }
  res.status(status).json({ error: err.message || 'Erro.' });
}
```

---

### 🟠 #5 — JWT: sem revogação, refresh ou pin de algoritmo (MÉDIA)

**Arquivos:** `backend/src/utils/generateToken.js`, `backend/src/middlewares/authMiddleware.js:20`, `guestMiddleware.js`

**Motivo:**
- Token do organizador dura **7 dias**, do convidado **30 dias**, sem mecanismo de invalidação. `logout` no frontend só apaga o `localStorage` — o token continua válido até expirar.
- Trocar a senha (reset) **não** invalida tokens já emitidos.
- `jwt.verify(token, secret)` **não** fixa `algorithms`, deixando a verificação aceitar qualquer algoritmo suportado pela chave (boa prática: restringir a `HS256`).
- *(Ponto positivo: o `isActive` é revalidado a cada request, então desativar a conta tem efeito imediato.)*

**Como um atacante exploraria:** um token vazado (log, dispositivo compartilhado, XSS) é utilizável por dias/semana; nem trocar a senha corta o acesso.

**Como corrigir:**

```js
// generateToken.js
function generateAuthToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'organizer', v: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h', algorithm: 'HS256' }
  );
}
```

```js
// authMiddleware.js
payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
// ...
if ((payload.v || 0) !== (user.tokenVersion || 0)) {
  return res.status(401).json({ error: 'Sessao expirada.' });
}
```

Adicionar coluna `tokenVersion` em `User`, incrementá-la no reset de senha e em “sair de todos os dispositivos”. Idealmente adotar **refresh token** (curto access token + refresh rotativo).

---

### 🟠 #6 — Token no localStorage (MÉDIA)

**Arquivo:** `frontend/src/api/axios.js:8-17`

**Motivo:** o JWT fica em `localStorage`, acessível a qualquer script na página. Um único XSS (hoje não há sink, mas dependências e conteúdo dinâmico mudam) exfiltra a sessão. Não há `HttpOnly`.

**Como corrigir:** preferir cookie `HttpOnly; Secure; SameSite=Strict` emitido pelo backend (exige então proteção CSRF). Se mantiver `localStorage`, adotar CSP estrita no frontend e as mitigações do #5 (expiração curta + revogação) para reduzir a janela de uso de um token roubado.

---

### 🟠 #7 — Injeção de HTML nos e-mails (MÉDIA)

**Arquivo:** `backend/src/utils/emailTemplates.js` (todas as funções)

```js
const welcome = (name) => ({ html: wrap(`<h2>Ola, ${name}!</h2>...`) });          // name não escapado
const guestAlbumReady = (nickname, eventName, albumUrl) => ({
  html: wrap(`... <strong>${eventName}</strong> ...`)                              // eventName não escapado
});
```

**Motivo:** `name` (cadastro), `nickname` (entrada do convidado) e `eventName` (organizador) entram sem escape no HTML. `eventName` é enviado a **todos os convidados** (e-mail de álbum revelado), então um organizador malicioso pode injetar links/markup na caixa de entrada dos convidados.

**Como um atacante exploraria:** cria evento com `name = <a href="http://phishing">Clique aqui</a>` → todos os convidados recebem o link injetado no corpo do e-mail “oficial”.

**Como corrigir:** escapar todo valor dinâmico.

```js
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const welcome = (name) => ({ subject: '...', html: wrap(`<h2>Ola, ${esc(name)}!</h2>...`) });
// aplicar esc() em name, nickname e eventName em TODOS os templates
// URLs (resetUrl/albumUrl) são geradas internamente — ok, mas encodeURI se vierem de input
```

---

### 🟠 #8 — Dependências vulneráveis (MÉDIA)

**Arquivo:** `backend/package.json`, `frontend/package.json`

`npm audit` (backend): **14 vulnerabilidades (1 crítica, 7 altas, 3 moderadas, 3 baixas)**. Destaques:

- **`nodemailer` ≤ 9.0.0 (alta):** injeção de comando SMTP via CRLF, header injection — relevante se usar SMTP.
- **`sharp` < 0.35 / libvips (alta):** CVEs de parsing de imagem — **processa uploads não confiáveis** (thumbnail/watermark). Risco direto.
- **`body-parser` < 1.20.6 (alta):** DoS quando `limit` inválido desativa a checagem de tamanho.
- **`multer` 1.4.x:** linha 1.x descontinuada; migrar para 2.x.
- **`tar`/`node-gyp`/`@tootallnate/once` (crítica/altas):** cadeia de build do `sqlite3` (usado só em dev, mas ainda presente).

Frontend: **2 vulnerabilidades** em `vite`/`esbuild` (dev server; impacto restrito ao ambiente de desenvolvimento).

**Como corrigir:**

```bash
cd backend
npm audit fix                    # correções não-quebrantes (body-parser via express, brace-expansion)
npm i nodemailer@^7 sharp@^0.34  # atualizações maiores — testar envio de e-mail e thumbnails
npm i multer@^2                  # migrar API do multer para 2.x
# Em produção use Postgres (DATABASE_URL); mantenha sqlite3 apenas como devDependency

cd ../frontend
npm audit fix
```

---

### 🟡 #9 — Mídia local servida sem autorização (BAIXA)

**Arquivos:** `config/storage.js:127-138`, `app.js:112-114`

**Motivo:** no modo local, `getReadUrl` devolve `${APP_URL}/uploads/<key>` servida por `express.static` sem autenticação. Fotos de **eventos privados** e fotos **antes da revelação** ficam acessíveis a qualquer um que tenha/adivinhe a URL — a única proteção é a aleatoriedade da key (`crypto.randomBytes(8)`), ou seja, *segurança por obscuridade*.

**Como corrigir:** servir mídia local por um endpoint que valide revelação/posse (ou token assinado de curta duração), ou usar S3 com presigned URLs (já implementado para `useS3`). No mínimo, aplicar os headers do #1.

---

### 🟡 #10 — `create` aceita `storageKey` arbitrária (BAIXA)

**Arquivo:** `controllers/photoController.js:86-89`

**Motivo:** o convidado envia `storageKey` no corpo; valida-se apenas *path safety*, não que a key pertença ao evento/convidado. É possível registrar uma `Photo` apontando para `events/<outroEvento>/...`.

**Como corrigir:** exigir prefixo do próprio evento — `isSafeKey(storageKey, event.id)` (ver correção do #1).

---

### 🟡 #11 — Rate limit ausente em rotas sensíveis (BAIXA)

**Arquivos:** `routes/auth.js`, `routes/payments.js`, `routes/photos.js`

**Motivo:** `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` e o upload local só têm o limiter global (120 req/min/IP), insuficiente contra brute-force de senha e enumeração/spam de e-mail.

**Como corrigir:**

```js
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false });
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
```

---

### 🟡 #12–#15 — Achados menores (BAIXA)

- **#12 LIKE curingas** (`adminController.js:199+`): `%${search}%` não escapa `%`/`_`. Só admin autenticado; risco de varreduras caras. Escapar curingas antes do `Op.like`.
- **#13 CORS `credentials:true`** (`app.js:100`): desnecessário com auth por Bearer. Remover `credentials` reduz superfície; a allowlist já está correta.
- **#14 Token de reset em texto puro** (`authController.js:106-108`): guardar `sha256(token)` no banco e comparar o hash; enviar o token cru só por e-mail.
- **#15 Política de senha fraca** (`authController.js:18`, mín. 6): elevar para ≥ 8-10 caracteres; opcionalmente checar contra listas de senhas vazadas.

---

### ⚪ #16–#20 — Informativos

- **#16 PCI-DSS — cartão pelo backend** (`paymentController.js:290`, `asaas.js:130`): PAN e CVV trafegam pelo seu servidor rumo ao Asaas. Isso amplia significativamente o escopo de conformidade PCI. Prefira o **checkout hospedado** (`invoiceUrl`, já usado no Pix/boleto) ou tokenização, de modo que dados de cartão nunca toquem seu servidor. Nunca logue o corpo dessas requisições.
- **#17 Auto-promoção admin** (`authController.js:29-32`): se `ADMIN_EMAIL` estiver setado e alguém registrar esse e-mail antes do dono, vira admin. Pré-crie as contas admin e trate `ADMIN_EMAIL` como *seed* único.
- **#18 Webhook sem assinatura/CSRF:** coberto pelo #3 (o Asaas usa token de header em vez de assinatura HMAC). A idempotência já existe parcialmente (`status !== 'paid'`).
- **#19 `database.sqlite`** presente na pasta (não versionado): garanta que não seja incluído em imagens/artefatos de deploy.
- **#20 Artefatos no repo:** `frontend/vite.config.js.timestamp-*.mjs`, `build.log`, `build_check.log`, `.sync-test.txt` — limpar e ignorar.

---

## 4. Cobertura do checklist solicitado

| Área | Situação |
|------|----------|
| **JWT** (exp/alg/segredo/verificação) | Segredo forte validado em prod; **falta** pin de algoritmo, revogação/refresh (#5) |
| **Cookies / LocalStorage** | Sem cookies; token em `localStorage` (#6). Sem `sessionStorage`/`IndexedDB` |
| **Middlewares** (auth/admin/role/ownership) | Presentes e corretos; posse via `userId` consistente |
| **Rotas abertas** | `/health`, `/payments/plans`, `/guests/event/:slug`, `/guests/join`, `/guests/slideshow/:key`, `/photos/event/:id`, `/photos/storage/:key` (**#1**), `/payments/webhook` (**#3**). Sem rotas de debug/test/dev |
| **IDOR / Broken Access Control** | Não encontrado — UUID + filtro por `userId`. Multi-tenant **íntegro** |
| **Mass assignment** | Mitigado (whitelist de campos em `update`) |
| **Express** (helmet/cors/x-powered-by/payload) | **Falta helmet + x-powered-by** (#2); CORS allowlist ok; limites de body ok |
| **Injeções** (SQL/NoSQL/cmd/template/proto/SSRF/XXE) | **Nenhuma**. Sequelize parametrizado; sem `child_process`/`eval`; sem XML |
| **Path Traversal** | Protegido (`isSafeKey`) — reforçar com dono da key (#10) |
| **Uploads** (tipo/MIME/tamanho/nome) | multipart valida MIME/tamanho; rota raw **não** (#1) |
| **PDF / Puppeteer** | Não usado (QR em PNG/SVG; recap via ffmpeg). SVG do QR escapa `<&>` |
| **XSS** (React/innerHTML/markdown) | Sem `dangerouslySetInnerHTML`; falta escape em e-mails (#7) |
| **SQL / Sequelize** | Sem `raw`/`literal`/concatenação. Só `Op.like` (parametrizado) |
| **Segredos** | `.env` não versionado; sem chaves no bundle; sem hardcode |
| **Frontend** (VITE_/console/source maps) | Só `VITE_API_URL`; sem `console.log`; sem `.map` no `dist` |
| **Cache** | Headers de cache imutável só em `/assets`; sem cache de resposta sensível |
| **Logs** | Sem senha/token/JWT nos logs; **cuidar** de `err` cru em 500 (#4) |
| **IA / RAG** | Não há integração de IA no projeto |
| **Multi-tenant** | Isolamento correto por `userId`/`eventId` em todas as consultas |
| **Backup / S3** | S3 com presigned; local depende de volume Railway |
| **CORS** | Allowlist por env; sem wildcard |
| **CSRF** | N/A para API Bearer; relevante só se migrar a cookies (#6) |
| **Rate limit** | Global ok; **falta** em login/upload (#11) |
| **Dependências** | 14 (backend) + 2 (frontend) vulnerabilidades (#8) |
| **Produção** | `NODE_ENV`, validação de segredos, `sync alter` off em prod, sem debug/test — **bom** |

---

## 5. Checklist final antes do go-live

**Bloqueadores (P0):**

- [ ] **#1** Proteger `PUT /photos/storage/:key` (auth de convidado + allowlist de extensão + `nosniff`/CSP no static).
- [ ] **#2** Instalar `helmet` e `app.disable('x-powered-by')`.
- [ ] **#3** Tornar `ASAAS_WEBHOOK_TOKEN` obrigatório em produção e validá-lo no boot.

**Alta prioridade (P1):**

- [ ] **#4** Erros 5xx com mensagem genérica em produção.
- [ ] **#5** Fixar `algorithms:['HS256']`, expiração menor + `tokenVersion`/refresh.
- [ ] **#6** Migrar token para cookie `HttpOnly` (ou CSP forte + expiração curta).
- [ ] **#7** Escapar HTML de `name`/`nickname`/`eventName` nos e-mails.
- [ ] **#8** `npm audit fix`; atualizar `nodemailer`, `sharp`, `body-parser`, `multer`.

**Média/baixa (P2-P3):**

- [ ] **#9/#10** Servir mídia local autorizada; exigir prefixo do evento na `storageKey`.
- [ ] **#11** Rate-limit dedicado em login/forgot/reset/upload.
- [ ] **#12-#15** Escapar curingas LIKE; revisar `credentials` no CORS; hash do token de reset; senha ≥ 8.
- [ ] **#16** Avaliar mover cartão para checkout hospedado (escopo PCI).
- [ ] **#17-#20** Pré-criar admins; limpar artefatos temporários do repo.

**Já em conformidade (manter):** UUIDs, filtros por `userId`/`eventId`, bcrypt, login genérico, forgot não enumerável, auto-lockout de admin, auditoria administrativa, validação de config de produção, `.env` fora do git, sem source maps/console no frontend, Sequelize parametrizado, guarda de path traversal, headers de segurança na Vercel.

---

*Auditoria estática de código. Recomenda-se complementar com testes dinâmicos (DAST), um pentest da rota de upload e do fluxo de pagamento, e `npm audit`/Dependabot contínuos no CI.*
