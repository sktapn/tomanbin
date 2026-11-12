# 🧸 Tomanbin — E-commerce de Buttons, Chaveiros e Action Figures

Projeto Final de Arquitetura Web: loja virtual Full Stack com **Node.js + Express + MongoDB** no backend (`/server`) e **React (Vite)** no frontend (`/client`). Pagamento por **Pix** (Mercado Pago).

## Pré-requisitos
- Node.js 18+
- MongoDB local ou um cluster gratuito no [MongoDB Atlas](https://www.mongodb.com/atlas)

## Como rodar localmente

### 1. Backend
```bash
cd server
npm install
cp .env.example .env    # Windows: copy .env.example .env
npm run seed            # cria o admin, um cliente de teste e os produtos de exemplo
npm start               # ou "npm run dev" para reiniciar sozinho ao salvar
```
API em `http://localhost:5001`.

### 2. Frontend
Em outro terminal:
```bash
cd client
npm install
cp .env.example .env
npm start
```
Site em `http://localhost:5173`.

### 3. Testes
```bash
cd server
npm test
```

## Variáveis de ambiente

### `server/.env`
| Variável | Obrigatória | Descrição |
|---|---|---|
| `MONGO_URI` | ✅ | String de conexão do MongoDB |
| `JWT_SECRET` | ✅ | Segredo dos tokens de login (32+ caracteres aleatórios) |
| `PORT` | | Porta da API (padrão `5001`) |
| `CLIENT_URL` | | Endereço do frontend (padrão `http://localhost:5173`) |
| `MERCADOPAGO_ACCESS_TOKEN` | | Access Token do Mercado Pago. Sem ele, o Pix funciona em **modo demonstração** |
| `MERCADOPAGO_ENV` | | `sandbox` (teste) ou `production` |
| `SHIPPING_FEE` | | Valor do frete fixo (padrão `15`) |

As demais variáveis são opcionais e estão explicadas no `server/.env.example`.

### `client/.env`
| Variável | Descrição |
|---|---|
| `VITE_API_URL` | Endereço da API (padrão `http://localhost:5001`) |

## Contas de teste (criadas pelo `npm run seed`)
| Perfil | E-mail | Senha |
|---|---|---|
| Admin | `admin@tomanbin.com` | `admin123` |
| Cliente | `cliente@tomanbin.com` | `cliente123` |

> ⚠️ O `npm run seed` apaga os produtos e pedidos existentes.

## Backup do banco

```bash
cd server
npm run backup                                    # cria server/backups/tomanbin-<data>.bak (criptografado)
npm run restore -- backups/<arquivo>.bak          # só mostra o conteúdo
npm run restore -- backups/<arquivo>.bak --sim-apagar-tudo   # substitui o banco pelo backup
```

O workflow **Backup do banco** (`.github/workflows/backup.yml`) faz o backup todo dia no GitHub.
Ele usa os segredos `MONGO_URI` e `BACKUP_PASSPHRASE`.

## Estrutura
- **`/server`**: API REST em MVC (`models`, `controllers`, `routes`, `middlewares`), autenticação JWT + bcrypt, validação Joi, Socket.io e testes Jest.
- **`/client`**: SPA React com `react-router-dom`, axios e Context API (login, carrinho e avisos).

Detalhes de segurança em [`SECURITY.md`](SECURITY.md).
