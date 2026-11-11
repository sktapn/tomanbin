# 🧸 Tomanbin — E-commerce de Buttons, Chaveiros e Action Figures

Projeto Final de Arquitetura Web — **Sistema Full Stack** (Node.js + Express + MongoDB + React).

Loja virtual onde clientes veem produtos, filtram por categoria, montam o carrinho e pagam com **Pix**. Administradores cadastram produtos, gerenciam pedidos e usuários e acompanham as vendas em um dashboard.

| Camada | Tecnologias |
|---|---|
| **Backend (`/server`)** | Node.js, Express, MongoDB + Mongoose, bcrypt, JWT, Joi, Socket.io, Helmet, express-rate-limit, Jest + Supertest |
| **Frontend (`/client`)** | React 18 + Vite, react-router-dom, axios, Context API, socket.io-client, CSS (Flexbox/Grid) |
| **Pagamento** | Pix via **Mercado Pago** (padrão), Asaas ou modo demonstração |

---

## ▶️ Como rodar localmente

### Pré-requisitos
- **Node.js 18+**
- **MongoDB**: local ou um cluster gratuito no [MongoDB Atlas](https://www.mongodb.com/atlas)

### 1. Backend (`/server`)
```bash
cd server
npm install
cp .env.example .env      # Windows: copy .env.example .env
# edite o .env: MONGO_URI e JWT_SECRET são obrigatórios
npm run seed              # cria admin, cliente de teste e 12 produtos de exemplo
npm run dev               # ou: npm start
```
A API sobe em **http://localhost:5001**. Teste com `GET /api/health`.

### 2. Frontend (`/client`)
```bash
cd client
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5001
npm run dev
```
O site abre em **http://localhost:5173**. Para abrir no celular (mesmo Wi-Fi), use o endereço **Network** que o Vite mostra no terminal.

### 3. Testes automatizados (Jest)
```bash
cd server
npm test
```

### Contas de teste (criadas pelo `npm run seed`)
| Perfil | E-mail | Senha |
|---|---|---|
| Admin | `admin@quelita.com` | `admin123` |
| Cliente | `cliente@quelita.com` | `cliente123` |

> O seed **apaga produtos e pedidos** e recria os produtos de exemplo. As ilustrações ficam em `server/public/products` e são servidas em `/static/products`.

---

## 🔑 Variáveis de ambiente

### `server/.env`
| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `PORT` | | `5001` | Porta da API |
| `MONGO_URI` | ✅ | `mongodb+srv://usuario:senha@cluster.mongodb.net/tomanbin` | Conexão com o MongoDB |
| `JWT_SECRET` | ✅ | 48+ caracteres aleatórios | Assina os tokens de login. Gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | | `1d` | Validade do login |
| `CLIENT_URL` | | `http://localhost:5173` | Origem liberada no CORS e no Socket.io |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | | `admin@quelita.com` / `admin123` | Admin criado pelo seed |
| `API_PUBLIC_URL` | | `http://localhost:5001` | Usado nas URLs das imagens do seed |
| `PAYMENT_PROVIDER` | | `mercadopago` \| `asaas` \| `demo` | Se vazio, usa o gateway que tiver chave; sem chave, usa a demonstração |
| `MERCADOPAGO_ACCESS_TOKEN` | | `APP_USR-...` | Access Token (Credenciais de teste do Mercado Pago) |
| `MERCADOPAGO_ENV` | | `sandbox` \| `production` | Ambiente do Mercado Pago |
| `ASAAS_API_KEY` / `ASAAS_ENV` | | `$aact_hmlg_...` / `sandbox` | Alternativa: Pix pelo Asaas |
| `SHIPPING_FEE` | | `15` | Frete fixo em R$ |
| `PICKUP_INFO` | | texto | Instruções de retirada (opção sem frete) |
| `AUTH_RATE_LIMIT` | | `10` | Tentativas de login/cadastro por IP a cada 15 min |
| `API_RATE_LIMIT` | | `300` | Requisições por IP por minuto |
| `MAX_PENDING_ORDERS` | | `3` | Pedidos aguardando pagamento por cliente |
| `PENDING_ORDER_TTL_HOURS` | | `24` | Pedidos não pagos são cancelados depois desse tempo |

### `client/.env`
| Variável | Exemplo |
|---|---|
| `VITE_API_URL` | `http://localhost:5001` |

A mensagem da faixa de promoção da loja fica em `client/src/config.js` (`PROMO_MESSAGE`).

---

## 🏗 Arquitetura

### Backend: MVC adaptado para API
A "View" é a resposta em **JSON**.
```
server/src
├── config/            # db.js (conexão Mongo), shipping.js (frete)
├── models/            # (M) User, Product, Order — schemas Mongoose
├── controllers/       # (C) regras de negócio
├── routes/            # verbo HTTP + URL → middlewares → controller
├── middlewares/       # auth (AuthN/AuthZ), validate (Joi), rateLimit, errorHandler
├── validators/        # schemas Joi
├── services/          # mercadopago.js, asaas.js, demoPix.js (pagamento Pix)
├── utils/             # AppError, asyncHandler, cpf
├── socket.js          # Socket.io (tempo real)
├── app.js             # app Express (usado também pelos testes)
├── server.js          # sobe HTTP + Socket.io + limpeza de pedidos não pagos
└── seed.js
```

### Entidades e relacionamentos
- **User** `{ name, email, password (hash bcrypt), role: 'admin' | 'user', cpf? }`
- **Product** `{ name, description, price, category, images[], stock, tag, active, createdBy → User }`
- **Order** `{ user → User, items[{ product → Product, name, price, quantity }], subtotal, deliveryMethod: 'entrega' | 'retirada', shippingFee, total, status, shippingAddress?, payment{ provider, pixId, status, ... } }`

### Endpoints

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/api/auth/register` | Público | Cadastro (sempre cria `user`) |
| POST | `/api/auth/login` | Público | Login (retorna o token JWT) |
| GET | `/api/auth/me` | Logado | Usuário atual |
| GET | `/api/products` | Público | Lista (filtros `category`, `tag`, `search`, `sort`, `page`, `limit`) |
| GET | `/api/products/categories` | Público | Categorias |
| GET | `/api/products/:id` | Público | Detalhe |
| POST | `/api/products` | **Admin** | Criar produto |
| PUT | `/api/products/:id` | **Admin** | Editar produto |
| DELETE | `/api/products/:id` | **Admin** | Excluir produto |
| GET | `/api/orders/shipping` | Público | Valor do frete e informação de retirada |
| POST | `/api/orders` | Logado | Criar pedido (preço, frete e estoque calculados no servidor) |
| GET | `/api/orders/mine` | Logado | Meus pedidos |
| GET | `/api/orders/:id` | Dono/Admin | Detalhe do pedido |
| PATCH | `/api/orders/:id/cancel` | Dono | Cancelar pedido pendente (devolve o estoque) |
| POST | `/api/orders/:id/pay` | Dono/Admin | Gerar o Pix (QR Code + copia e cola) |
| GET | `/api/orders/:id/payment` | Dono/Admin | Consultar o pagamento no gateway |
| POST | `/api/orders/:id/payment/simulate` | Dono/Admin | Simular pagamento (só em teste/demonstração) |
| GET | `/api/orders` | **Admin** | Todos os pedidos |
| GET | `/api/orders/stats` | **Admin** | Dados do dashboard |
| PATCH | `/api/orders/:id/status` | **Admin** | Alterar status |
| DELETE | `/api/orders/:id` | **Admin** | Excluir pedido |
| PUT | `/api/users/me` | Logado | Editar nome / trocar senha (exige a senha atual) |
| GET | `/api/users` | **Admin** | Listar usuários |
| GET | `/api/users/:id` | **Admin** | Detalhe |
| PUT | `/api/users/:id` | **Admin** | Alterar nome/perfil |
| DELETE | `/api/users/:id` | **Admin** | Excluir usuário |

Códigos usados: `200`, `201`, `204`, `400` (validação), `401` (não logado), `403` (sem permissão), `404`, `409` (e-mail duplicado), `429` (excesso de tentativas).

### Frontend
```
client/src
├── api/axios.js        # instância axios: token JWT + mensagens de erro amigáveis
├── context/            # AuthContext (login e nível de acesso), CartContext, ToastContext
├── components/         # Navbar, Footer, ProductCard, ImageGallery, Sidebar, ProtectedRoute,
│                       # BackButton, AuthLayout, Feedback (Spinner/Skeleton/Alert)
├── pages/              # Home, Shop, ProductDetail, Cart, Payment, Login, Register,
│   │                   # Profile, MyOrders, About, Faq, NotFound
│   └── admin/          # Dashboard, AdminProducts, ProductForm, AdminOrders, AdminUsers
├── services/           # socket.js, cep.js (ViaCEP/BrasilAPI)
└── config.js           # mensagem da faixa de promoção
```
- **SPA** com `react-router-dom`. Rotas protegidas por login e por papel (`<ProtectedRoute role="admin" />`).
- **Estado do usuário** no `AuthContext`: o token salvo é revalidado em `/auth/me` ao abrir o site.
- **UX**: skeletons e spinners, alertas de erro, toasts, galeria de imagens, filtro por categoria, busca, paginação, CEP com preenchimento automático, frete ou retirada e página de pagamento Pix.
- **Responsivo**: Grid/Flexbox, menu hambúrguer e tabelas que viram cards no celular.

---

## 🔒 Segurança
Resumo (detalhes em [`SECURITY.md`](SECURITY.md)):
- Senhas com **hash bcrypt** e login com **JWT** (`HS256`).
- **AuthZ** com papel lido do banco: editar o token não dá acesso de admin.
- Validação **Joi** em todas as entradas (bloqueia NoSQL injection e campos extras como `role`).
- **Limite de tentativas** no login, Helmet, CORS restrito e erros sem detalhes internos.
- Preço, frete e estoque calculados **só no servidor**, com baixa de estoque atômica.

---

## 🚀 Diferenciais implementados
- **WebSockets (Socket.io)**: aviso de **novo pedido** e de **pagamento recebido** para o admin, aviso de **mudança de status** para o cliente e **estoque ao vivo** no catálogo.
- **Testes (Jest + Supertest)**: validação, proteção de rotas (401/403), tokens forjados, NoSQL injection, limite de tentativas, hash de senha, integração com os gateways Pix (com `fetch` simulado) e cobrança única em requisições simultâneas.
- **Pagamento Pix real (sandbox)** com Mercado Pago ou Asaas, e modo demonstração para apresentar sem internet.

---

## 🎬 Roteiro da apresentação (3–5 min)
1. **Cadastro**: criar um cliente novo. Mostrar a validação (e-mail inválido, senhas diferentes) e o medidor de força da senha.
2. **Erro de login**: senha errada → "E-mail ou senha incorretos".
3. **Fluxo do cliente**: escolher uma categoria, abrir um produto (galeria), adicionar ao carrinho, escolher entrega (CEP preenche o endereço) ou retirada, gerar o Pix e confirmar o pagamento.
4. **Diferença de acesso**: como cliente, tentar abrir `/admin` → é redirecionado (a API responderia **403**).
5. **Admin**: entrar como admin (em outra janela) → aviso em tempo real do pedido pago → dashboard com o total de vendas.
6. **CRUD**: criar um produto, editar preço/estoque, excluir. Alterar o status de um pedido → o cliente recebe o aviso ao vivo.

---

## 🧾 Commits
O projeto usa **commits semânticos** (`feat:`, `fix:`, `docs:`, `test:`, `style:`, `refactor:`, `chore:`).
