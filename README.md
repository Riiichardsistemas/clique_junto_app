# CLIQUE JUNTO

SaaS de álbuns colaborativos para eventos. O organizador cria o evento e compartilha um
QR Code; os convidados fotografam pelo navegador e o álbum é liberado na data definida.

## Stack

- Frontend: React, Vite e Tailwind CSS
- Backend: Node.js, Express e Sequelize
- Banco: SQLite em desenvolvimento e PostgreSQL em produção
- Arquivos: armazenamento local no desenvolvimento; S3 ou Railway Volume em produção
- Autenticação: JWT separado para organizadores e convidados
- Integrações: Asaas para pagamentos e Resend/SMTP para e-mail

## Desenvolvimento local

### Backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

A API fica em `http://localhost:4000/api` e o health check em
`http://localhost:4000/api/health`. Sem `DATABASE_URL`, o SQLite é criado automaticamente.

### Frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

O app fica em `http://localhost:5173`.

## Produção

O projeto está preparado para:

- backend e PostgreSQL no Railway;
- frontend estático Vite na Vercel;
- domínio público da API com CORS restrito ao frontend;
- health check e reinício automático;
- persistência de fotos via S3 ou Railway Volume;
- rotas React funcionando ao abrir URLs diretamente na Vercel.

Siga o passo a passo completo em [DEPLOY.md](./DEPLOY.md).

## Comandos úteis

| Diretório | Comando | Finalidade |
|---|---|---|
| `backend` | `npm run dev` | API local com recarga automática |
| `backend` | `npm start` | API em modo normal/produção |
| `backend` | `npm run create-super-admin -- email nome` | cria ou atualiza o super-admin |
| `frontend` | `npm run dev` | frontend local |
| `frontend` | `npm run build` | build de produção |

Nunca versione `.env`, chaves de API, senhas ou URLs com credenciais.
