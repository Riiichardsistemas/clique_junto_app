# 🚀 Guia de Deploy — Era Uma Vez

Backend no **Railway** (Node + Postgres) e frontend no **Vercel**.

---

## Visão geral

```
Convidado/Organizador → Vercel (frontend React)  →  Railway (API Node + Postgres)
                                                   →  S3 (fotos)   Asaas (pagamento)   Resend (e-mail)
```

Ordem recomendada: **1) Backend no Railway → 2) Frontend no Vercel → 3) Ajustar URLs cruzadas → 4) Asaas → 5) Admin.**

---

## 1. Backend no Railway

1. Crie um projeto no Railway e conecte este repositório do GitHub.
2. Em **Settings → Root Directory**, defina `backend`.
3. Adicione um banco: **New → Database → PostgreSQL**. O Railway cria a variável `DATABASE_URL` (referencie-a no serviço da API).
4. Em **Variables** do serviço da API, defina:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | (referência ao Postgres do Railway) |
| `FRONTEND_URL` | `https://SEU-APP.vercel.app` (ajuste após o passo 2) |
| `APP_URL` | `https://SEU-BACKEND.up.railway.app` |
| `JWT_SECRET` | segredo forte (veja abaixo) |
| `GUEST_JWT_SECRET` | outro segredo forte |
| `ADMIN_EMAIL` | seu e-mail (vira admin ao cadastrar) |
| `ASAAS_API_KEY` | (deixe vazio até criar a conta) |
| `ASAAS_ENV` | `sandbox` (depois `production`) |
| `ASAAS_WEBHOOK_TOKEN` | um token aleatório à sua escolha |
| `AWS_*` | credenciais do S3 (ver seção 4) |
| `RESEND_API_KEY` | chave do Resend (ver seção 5) |
| `MAIL_FROM` | `Era Uma Vez <no-reply@seudominio.com>` |

**Gerar segredos fortes:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

5. O start é `npm start` (já configurado no `package.json` e no `Procfile`). Na primeira subida, as tabelas são criadas automaticamente.
6. Teste: abra `https://SEU-BACKEND.up.railway.app/api/health` → deve responder `{ "status": "ok" }`.

---

## 2. Frontend no Vercel

1. Importe o mesmo repositório no Vercel.
2. **Root Directory:** `frontend`. Framework detectado: **Vite** (já há `vercel.json` com o rewrite de SPA).
3. **Environment Variables:**

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `https://SEU-BACKEND.up.railway.app/api` |

4. Deploy. Anote a URL final (ex.: `https://era-uma-vez.vercel.app`).

---

## 3. Ajustar URLs cruzadas

- No **Railway**, atualize `FRONTEND_URL` com a URL real do Vercel e faça redeploy (isso libera o CORS e corrige os links de QR Code, e-mails e álbum).
- Se usar domínio próprio, coloque ambos em `FRONTEND_URL` separados por vírgula.

---

## 4. Armazenamento de fotos — S3 (IMPORTANTE)

O disco do Railway é **efêmero**: sem S3, as fotos somem a cada deploy. Configure um bucket S3:

1. Crie um bucket na AWS (ex.: `era-uma-vez-fotos`), região ex. `sa-east-1`.
2. Crie um usuário IAM com permissão de leitura/escrita nesse bucket e gere chaves.
3. No Railway, defina `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`.
4. Com `AWS_BUCKET_NAME` preenchido, a API passa a usar S3 com URLs assinadas automaticamente.

> Alternativa: um **Volume** persistente do Railway montado em `backend/uploads` (mantém o modo local). S3 é mais robusto e recomendado.

---

## 5. E-mail — Resend

1. Crie conta no [Resend](https://resend.com), verifique seu domínio e gere uma API key.
2. Defina `RESEND_API_KEY` e `MAIL_FROM` (com um remetente do domínio verificado).
3. Sem isso, os e-mails (recuperação de senha, "álbum revelado") ficam só no log — **não são enviados**.

---

## 6. Pagamento — Asaas

1. Crie conta no [Asaas](https://www.asaas.com) e comece pelo **Sandbox**.
2. Em **Integrações → API**, copie a **API Key** → `ASAAS_API_KEY` no Railway. Mantenha `ASAAS_ENV=sandbox` para testes.
3. Em **Integrações → Webhooks**, cadastre a URL:
   `https://SEU-BACKEND.up.railway.app/api/payments/webhook`
   - Ative os eventos de **cobrança** (PAYMENT_CONFIRMED, PAYMENT_RECEIVED).
   - Em "Token de autenticação", use o mesmo valor de `ASAAS_WEBHOOK_TOKEN`.
4. Teste um evento pago: o app leva à página do Asaas (Pix/boleto/cartão); ao pagar, o webhook ativa o evento.
5. Quando validar tudo, troque para produção: `ASAAS_ENV=production` e a API Key de produção.

> Sem `ASAAS_API_KEY` o sistema roda em **modo mock** (útil para testar o fluxo sem cobrar de verdade — há um botão "Simular pagamento aprovado").

---

## 7. Criar o super-admin

- **Automático:** cadastre-se no app com o e-mail que está em `ADMIN_EMAIL`. Você já entra como admin.
- **Manual (a qualquer momento):** no serviço do Railway, rode no shell:
  ```bash
  npm run make-admin seu-email@exemplo.com
  ```
- Logado como admin, aparece o menu **Admin** no topo → painel de vendas, usuários e eventos em `/admin`.

---

## Checklist final antes de divulgar

- [ ] `/api/health` responde no backend
- [ ] Cadastro, login e criação de evento **grátis** funcionam
- [ ] QR Code abre a câmera do convidado e o upload conclui
- [ ] Evento **pago** leva ao Asaas e ativa após o pagamento (teste no sandbox)
- [ ] Fotos persistem após um novo deploy (S3 configurado)
- [ ] E-mail de recuperação de senha chega (Resend configurado)
- [ ] Painel `/admin` mostra as vendas de teste
- [ ] `JWT_SECRET` e `GUEST_JWT_SECRET` são segredos fortes (não os de exemplo)
