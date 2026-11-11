# 🔒 Segurança — Tomanbin

Resumo das proteções da aplicação e de como elas são testadas (`cd server && npm test`).

## Autenticação (AuthN)
- Senhas guardadas com **hash bcrypt** (nunca em texto) e nunca devolvidas pela API.
- Login com **JWT** (algoritmo fixo `HS256`, expiração configurável). Tokens sem assinatura (`alg: none`), com outro segredo ou expirados são recusados.
- **Limite de tentativas**: 10 logins/cadastros por IP a cada 15 minutos (contra força bruta).
- Mensagem genérica no login ("E-mail ou senha incorretos"), sem dizer se o e-mail existe.
- Trocar a senha exige a **senha atual**.
- O servidor avisa (e em produção recusa iniciar) se o `JWT_SECRET` for curto.

## Autorização (AuthZ)
- Dois papéis: `admin` e `user`. O papel é sempre lido do **banco de dados**, não do token. Editar o token não dá acesso de admin.
- O cadastro público sempre cria `user`. Campos extras (como `role`) são descartados.
- Cada cliente só vê, paga e cancela **os próprios pedidos** (checagem de dono em todas as rotas).
- Avisos em tempo real (Socket.io) para admins também conferem o papel no banco.

## Validação de entrada
- Todo corpo de requisição passa por **Joi** com `stripUnknown`. Isso bloqueia **NoSQL injection** (`{"$ne": null}`) e campos não permitidos.
- A busca de produtos escapa caracteres especiais de regex.
- URLs de imagem só aceitam `http`/`https`. Pedidos têm no máximo 50 itens e quantidade de 1 a 99.
- Corpo JSON limitado a 100 KB.

## Pagamentos e pedidos
- **Preço, frete e estoque são calculados no servidor**. O navegador só informa produto e quantidade.
- Baixa de estoque **atômica** (não vende além do estoque, mesmo com compras simultâneas).
- Máximo de 3 pedidos aguardando pagamento por cliente. Pedidos não pagos são cancelados em 24 h e o estoque volta.
- A chave do gateway (Asaas) fica **só no backend**. O "simular pagamento" só existe em Sandbox/demonstração, e a demonstração nunca liga sozinha em produção.

## Infraestrutura
- `helmet` (cabeçalhos de segurança), **CORS** restrito ao `CLIENT_URL` em produção e limite geral de 300 req/min por IP.
- Erros inesperados não mostram detalhes internos ao cliente.
- Segredos só no `.env`, que está no `.gitignore`.
- `npm audit --omit=dev`: 0 vulnerabilidades nas dependências de produção.

## Checklist antes de publicar
- [ ] `JWT_SECRET` com 48+ caracteres aleatórios
- [ ] Trocar a senha do admin criada pelo seed
- [ ] Trocar a senha do banco (MongoDB Atlas) se ela já foi compartilhada
- [ ] `NODE_ENV=production` e `CLIENT_URL` com o domínio real
- [ ] Usar HTTPS (Render/Vercel já fornecem)
