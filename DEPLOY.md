# Deploy de produção — Railway + Vercel

Arquitetura preparada:

```text
Vercel (React/Vite) → Railway (Node/Express) → Railway PostgreSQL
                                      ├─────→ S3 ou Railway Volume (fotos)
                                      ├─────→ Asaas (pagamentos)
                                      └─────→ Resend/SMTP (e-mails)
```

Nenhum segredo deve ser commitado no Git. Use os painéis do Railway e da Vercel.

## 1. Subir o backend e o PostgreSQL no Railway

1. Envie o repositório para o GitHub e crie um projeto no Railway.
2. Adicione um serviço **PostgreSQL** ao mesmo projeto.
3. Adicione um serviço para a API a partir do repositório.
4. No serviço da API, configure:
   - **Root Directory:** `/backend`
   - **Config File:** `/backend/railway.json`
5. Em **Networking**, gere o domínio público da API.
6. Em **Variables**, adicione os valores abaixo.

### Variáveis obrigatórias da API

| Variável | Valor recomendado |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `DATABASE_SSL` | `auto` |
| `FRONTEND_URL` | `https://seu-projeto.vercel.app` |
| `APP_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `JWT_SECRET` | segredo aleatório forte |
| `GUEST_JWT_SECRET` | outro segredo aleatório forte |
| `ADMIN_EMAIL` | e-mail do super-admin |

Não crie a variável `PORT`: o Railway a injeta automaticamente. `FRONTEND_URL` aceita
mais de uma origem exata, separada por vírgula, por exemplo a URL `vercel.app` e o domínio
próprio. Não use `*`, pois o app possui autenticação.

Gere cada segredo JWT separadamente:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

O arquivo `backend/railway.json` já configura o comando de início, health check em
`/api/health`, timeout e política de reinício. A aplicação escuta em `0.0.0.0:$PORT`.

Depois do deploy, confirme:

```text
https://SEU-BACKEND.up.railway.app/api/health
```

A resposta deve conter `"status":"ok"`.

## 2. Persistir as fotos

O PostgreSQL persiste usuários, eventos e metadados; ele não armazena os arquivos das
fotos. Escolha uma das opções antes de divulgar o produto.

### Opção A — S3, recomendada

Adicione ao serviço da API:

| Variável | Conteúdo |
|---|---|
| `AWS_ACCESS_KEY_ID` | chave IAM com acesso restrito ao bucket |
| `AWS_SECRET_ACCESS_KEY` | segredo IAM |
| `AWS_REGION` | região do bucket, por exemplo `sa-east-1` |
| `AWS_BUCKET_NAME` | nome do bucket |

O backend detecta `AWS_BUCKET_NAME` e passa a usar URLs assinadas. Essa opção é a mais
adequada para grande volume de fotos e múltiplas réplicas da API.

Como o upload sai diretamente do navegador, configure também o CORS do bucket, mantendo
o bloqueio de acesso público ativo:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["https://seu-projeto.vercel.app"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Inclua o domínio próprio em `AllowedOrigins` quando ele for ativado.

Mantenha a API com uma réplica enquanto o job de revelação estiver no próprio processo.
Antes de escalar para múltiplas réplicas, mova esse job para um worker único ou adicione
um lock distribuído para impedir processamento e e-mails duplicados.

### Opção B — Railway Volume

1. Anexe um Volume ao serviço da API.
2. Use o mount path `/data/uploads`.
3. Não é necessário criar outra variável: o backend detecta automaticamente
   `RAILWAY_VOLUME_MOUNT_PATH`.

Sem S3 ou Volume, uploads locais desaparecem em novos deploys. Volume é apropriado para
uma única réplica; use S3 antes de escalar horizontalmente.

## 3. Subir o frontend na Vercel

1. Importe o mesmo repositório na Vercel como um novo projeto.
2. Configure **Root Directory** como `frontend`.
3. O framework deve ser detectado como **Vite**.
4. Adicione a variável abaixo nos ambientes **Production** e **Preview**:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | `https://SEU-BACKEND.up.railway.app/api` |

5. Faça o deploy.

O `frontend/vercel.json` já configura build, diretório `dist`, fallback para rotas React,
cache de assets e cabeçalhos de segurança. Variáveis `VITE_*` são incorporadas durante o
build; sempre faça um novo deploy depois de alterá-las.

## 4. Fechar a configuração cruzada

1. Copie a URL final da Vercel.
2. Atualize `FRONTEND_URL` no Railway com essa URL, sem barra final.
3. Aplique as alterações/redeploy no Railway.
4. Teste cadastro, login, `/admin`, QR Code e upload usando a URL da Vercel.

Cada Preview da Vercel usa uma origem diferente. Para testar um Preview contra a API de
produção, adicione temporariamente sua URL exata a `FRONTEND_URL`; não libere todos os
subdomínios `vercel.app`.

## 5. Criar o super-admin no PostgreSQL de produção

O banco PostgreSQL do Railway começa vazio; o usuário criado no SQLite local não é copiado.
Há duas formas seguras:

### Pelo cadastro

Defina `ADMIN_EMAIL` com o e-mail desejado e cadastre esse endereço uma única vez pelo app.
Ele será criado diretamente como super-admin e não terá as rotas de usuário comum.

### Pelo script dentro do Railway

1. Crie temporariamente a variável selada `SUPER_ADMIN_PASSWORD` no serviço da API.
2. Aplique as variáveis.
3. No Railway, clique com o botão direito no serviço, copie o comando SSH e conecte.
4. Dentro do container, execute:

```bash
npm run create-super-admin -- seu-email@exemplo.com "Nome do administrador"
```

5. Remova `SUPER_ADMIN_PASSWORD` do Railway e aplique a alteração novamente.

O script é idempotente: se o e-mail já existir, ele atualiza a conta e mantém apenas o
papel administrativo.

## 6. Integrações opcionais para produção

### E-mail

Configure `RESEND_API_KEY` e `MAIL_FROM` com domínio verificado. Como alternativa, use
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS`. Sem provedor, mensagens ficam somente
nos logs.

### Pagamentos Asaas

Configure `ASAAS_API_KEY`, `ASAAS_ENV` e `ASAAS_WEBHOOK_TOKEN`. No Asaas, use:

```text
https://SEU-BACKEND.up.railway.app/api/payments/webhook
```

Valide todo o fluxo no sandbox antes de trocar `ASAAS_ENV` para `production`.

## Checklist final

- [ ] Deploy da API está `Active` e `/api/health` responde 200
- [ ] API usa `${{Postgres.DATABASE_URL}}`, não a URL pública copiada manualmente
- [ ] `JWT_SECRET` e `GUEST_JWT_SECRET` são fortes e diferentes
- [ ] `FRONTEND_URL` contém todas as origens oficiais e nenhuma origem genérica
- [ ] `VITE_API_URL` termina em `/api` e um novo deploy da Vercel foi feito
- [ ] Fotos continuam disponíveis após redeploy da API
- [ ] Cadastro, login, recuperação de senha e logout funcionam
- [ ] QR Code, câmera, upload e revelação foram testados em celular real
- [ ] O super-admin abre `/admin` e não recebe funcionalidades de usuário comum
- [ ] Webhook do Asaas foi validado no sandbox antes de cobranças reais
- [ ] Backups do PostgreSQL e monitoramento foram habilitados no Railway
