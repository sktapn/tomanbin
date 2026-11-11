import { Link } from 'react-router-dom';
import { STORE } from '../config';
import { maskPhone, whatsappLink } from '../utils';

const Contact = () => (
  <>
    e-mail <a href={`mailto:${STORE.email}`}>{STORE.email}</a> ou WhatsApp{' '}
    <a href={whatsappLink(STORE.whatsapp)} target="_blank" rel="noreferrer">{maskPhone(STORE.whatsapp)}</a>
  </>
);

const PAGES = {
  trocas: {
    title: 'Trocas e devoluções',
    sections: [
      ['Arrependimento (7 dias)', <>
        Comprou e se arrependeu? Você pode desistir da compra em até <strong>7 dias corridos</strong> depois de receber o pedido,
        sem precisar explicar o motivo (art. 49 do Código de Defesa do Consumidor). Devolvemos <strong>100% do valor pago,
        incluindo a taxa de entrega</strong>, pelo mesmo meio de pagamento (Pix).
      </>],
      ['Produto com defeito', <>
        Se o produto chegar com defeito ou diferente do anunciado, você tem até <strong>90 dias</strong> para nos avisar
        (art. 26 do CDC). Nesse caso, a gente troca o item, envia outro igual ou devolve o dinheiro, como você preferir,
        e a busca do produto fica por nossa conta.
      </>],
      ['Como pedir', <>
        Fale com a gente pelo <Contact /> informando o número do pedido (está em <Link to="/meus-pedidos">Meus pedidos</Link>)
        e, se for defeito, uma foto do produto. Respondemos em até 2 dias úteis para combinar a troca, que pode ser feita na loja ou com retirada no seu endereço em Boa Vista.
      </>],
      ['Condições', <>
        O produto deve voltar sem sinais de uso e, se possível, na embalagem original. Produtos personalizados
        (por exemplo, chaveiro com nome) só podem ser trocados em caso de defeito. O reembolso é feito em até 7 dias
        úteis depois que o produto chegar até nós.
      </>],
    ],
  },
  privacidade: {
    title: 'Política de privacidade',
    sections: [
      ['Quem cuida dos seus dados', <>
        {STORE.legalName}, {STORE.document}, é a responsável pelos dados pessoais coletados nesta loja, conforme a
        Lei Geral de Proteção de Dados (Lei 13.709/2018).
      </>],
      ['Quais dados coletamos', <>
        Nome, e-mail e senha (guardada criptografada, nem nós conseguimos ver) ao criar a conta; telefone e endereço de
        entrega ao finalizar um pedido; e os dados dos seus pedidos. <strong>Não guardamos dados de cartão</strong>: o
        pagamento por Pix é processado pelo Mercado Pago.
      </>],
      ['Para que usamos', <>
        Só para processar e entregar seus pedidos, falar com você sobre eles, manter sua conta funcionando e cumprir
        obrigações legais (como emissão de nota e guarda de registros). Não vendemos nem alugamos seus dados.
      </>],
      ['Com quem compartilhamos', <>
        Apenas com quem precisa para o pedido acontecer: o Mercado Pago (pagamento) e quem faz a entrega
        (só nome, telefone e endereço) e o serviço de hospedagem do site. Todos tratam os dados só para essa finalidade.
      </>],
      ['Cookies e armazenamento', <>
        Usamos o armazenamento do navegador apenas para manter você conectado e guardar seu carrinho. Não usamos
        cookies de rastreamento ou publicidade.
      </>],
      ['Seus direitos', <>
        Você pode, a qualquer momento, pedir para ver, corrigir ou apagar seus dados, ou tirar dúvidas sobre como eles
        são usados (art. 18 da LGPD). Parte disso você mesmo faz em <Link to="/perfil">Meu perfil</Link>; para o resto,
        fale com a gente pelo <Contact />. Dados de pedidos podem ser mantidos pelo prazo exigido por lei.
      </>],
      ['Segurança', <>
        O site usa conexão criptografada (HTTPS), senhas com hash e acesso restrito ao painel administrativo.
      </>],
    ],
  },
  termos: {
    title: 'Termos de uso',
    sections: [
      ['Sobre a loja', <>
        Esta loja é operada por {STORE.legalName}, {STORE.document}, com endereço em {STORE.address}. Ao usar o site e
        fazer pedidos, você concorda com estes termos.
      </>],
      ['Conta', <>
        Você é responsável por manter sua senha em segredo e pelas compras feitas na sua conta. As informações do
        cadastro devem ser verdadeiras.
      </>],
      ['Preços e estoque', <>
        Os preços estão em reais e podem mudar sem aviso, mas o valor que vale é o do momento em que o pedido foi feito.
        O estoque é reservado quando você finaliza o pedido. Pedidos não pagos em 24 horas são cancelados
        automaticamente e o estoque é liberado.
      </>],
      ['Pagamento e envio', <>
        O pagamento é feito por Pix e confirmado automaticamente. No momento, entregamos apenas em Boa Vista/RR, em até
        1 dia útil depois da confirmação do pagamento, com taxa fixa informada no carrinho. Também é possível retirar o
        pedido sem custo no endereço da loja. O andamento aparece em <Link to="/meus-pedidos">Meus pedidos</Link>.
      </>],
      ['Trocas e privacidade', <>
        As regras de troca estão em <Link to="/trocas">Trocas e devoluções</Link> e o uso dos seus dados em{' '}
        <Link to="/privacidade">Política de privacidade</Link>.
      </>],
      ['Imagens e conteúdo', <>
        As fotos e textos do site pertencem à {STORE.name} e não podem ser copiados sem autorização. As cores reais
        dos produtos podem variar um pouco conforme a tela.
      </>],
      ['Contato', <>Dúvidas? Fale com a gente pelo <Contact />.</>],
    ],
  },
};

export default function Legal({ page }) {
  const { title, sections } = PAGES[page];
  return (
    <div className="info-page">
      <div className="shop-banner teal">
        <h1>{title}</h1>
      </div>
      <article className="legal">
        {sections.map(([h, body]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{body}</p>
          </section>
        ))}
        <p className="legal-updated">Última atualização: {STORE.updatedAt}</p>
      </article>
    </div>
  );
}
