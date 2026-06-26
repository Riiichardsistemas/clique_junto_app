# ERA UMA VEZ — Álbum colaborativo de fotos

Plataforma web onde o organizador cria um evento, gera um QR Code, e os convidados
fotografam pelo navegador. As fotos ficam bloqueadas até a data de revelação — como
uma câmera descartável digital.

Stack: **Backend** Node.js + Express + Sequelize (SQLite no dev, PostgreSQL em produção) ·
**Frontend** React + Vite + TailwindCSS. Autenticação do organizador via **JWT**.

---

## ✅ Etapa 1 concluída — Setup do projeto + Autenticação

- Estrutura completa de backend e frontend
- Banco: SQLite automático em desenvolvimento, PostgreSQL quando `DATABASE_URL` está definida
- Model `User` com hash de senha (bcrypt)
- Auth do organizador: **cadastro, login e sessão (GET /me)** com JWT
- Frontend: páginas Landing, Login, Cadastro e Dashboard (placeholder) + rotas protegidas
- Tema dark com destaque dourado, tipografia serifada (Playfair Display)

Verificado: 11/11 testes automatizados de autenticação passando (cadastro, login,
email duplicado, senha curta, senha errada, token ausente/inválido, rota protegida).

---

## Como rodar

### 1. Backend

> ⚠️ Antes do primeiro `npm install`, **apague a pasta `backend/node_modules`** se ela
> existir (foi deixada uma instalação parcial pelo ambiente de testes). No Windows:
> apague `backend\node_modules` pelo Explorador de Arquivos.

```bash
cd backend
copy .env.example .env   # no Windows (ou: cp .env.example .env)
npm install
npm run dev
```

API em `http://localhost:4000`. Teste rápido: `http://localhost:4000/api/health`.

Em desenvolvimento, o banco SQLite é criado automaticamente em `backend/database.sqlite`.
Para usar PostgreSQL, defina `DATABASE_URL` no `.env`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App em `http://localhost:5173`. Crie uma conta em `/register` e acesse o painel.

---

## Endpoints disponíveis (Etapa 1)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Status da API |
| POST | `/api/auth/register` | Cadastro `{ name, email, password }` |
| POST | `/api/auth/login` | Login `{ email, password }` |
| GET | `/api/auth/me` | Usuário autenticado (header `Authorization: Bearer <token>`) |

---

## Próximas etapas

2. ~~Autenticação~~ ✅ · 3. CRUD de eventos · 4. Upload (S3 / local) ·
5. Sessão de convidados · 6. Câmera · 7. Delayed reveal (cron) · 8. Álbum ·
9. QR Code · 10. Pagamentos (Stripe) · 11. Painel completo · 12. Vídeo recap ·
13. Emails · 14. Landing final · 15. Testes/UX · 16. Deploy

> Observação: Google OAuth foi previsto no model (`provider`, `googleId`) mas a
> autenticação inicial usa email + senha (JWT), conforme a stack Express do projeto.
# era_uma_vez_app
