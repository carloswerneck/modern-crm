# Deploy no Easypanel

## Passo 1 — Prepare o repositório

1. Crie um repositório no GitHub e faça push do projeto:
```bash
git init
git add .
git commit -m "chore: initial CRM setup"
git remote add origin https://github.com/seu-usuario/modern-crm.git
git push -u origin main
```

## Passo 2 — Configure no Easypanel

### Criar o banco de dados PostgreSQL

1. No Easypanel, clique em **"+ New Service"** → **"Postgres"**
2. Defina:
   - **Name:** `crm-db`
   - **User:** `crm_user`
   - **Password:** (gere uma senha forte)
   - **DB:** `crm_db`
3. Salve e anote a **connection string** gerada

### Criar o serviço da aplicação

1. Clique em **"+ New Service"** → **"App"**
2. Configure a fonte:
   - **Source:** GitHub → selecione seu repositório `modern-crm`
   - **Branch:** `main`
   - **Build Method:** **Dockerfile**

3. Configure as **variáveis de ambiente**:
```
DATABASE_URL=postgresql://crm_user:SUA_SENHA@crm-db:5432/crm_db
NEXTAUTH_SECRET=gere-uma-chave-de-32-caracteres-aleatorios
NEXTAUTH_URL=https://seu-subdominio.easypanel.host
NODE_ENV=production
```

4. Configure o **domínio**:
   - Adicione seu domínio ou use o subdomínio gerado pelo Easypanel
   - Ative **HTTPS** (Let's Encrypt automático)

5. Configure a **porta**:
   - **Port:** `3000`

6. Clique em **Deploy**

## Passo 3 — Seed inicial (primeira vez)

Após o deploy, no console do Easypanel execute:
```bash
npx tsx prisma/seed.ts
```

Ou via terminal SSH na VPS:
```bash
docker exec -it <container-id> npx tsx prisma/seed.ts
```

## Credenciais iniciais

- **URL:** https://seu-dominio.com
- **E-mail:** admin@crm.com
- **Senha:** admin123

> ⚠️ Troque a senha após o primeiro acesso!

## Gerar NEXTAUTH_SECRET

Execute no terminal:
```bash
openssl rand -base64 32
```

## Variáveis obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `NEXTAUTH_SECRET` | Chave secreta para JWT (mín. 32 chars) |
| `NEXTAUTH_URL` | URL pública da aplicação |
