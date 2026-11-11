const QUESTIONS = [
  ['Vocês entregam onde?', 'Por enquanto entregamos apenas em Boa Vista/RR, com taxa fixa de R$ 15,00. Você também pode retirar sem custo no endereço da loja.'],
  ['Qual o prazo de entrega?', 'Em Boa Vista, entregamos em até 1 dia útil depois da confirmação do Pix. Quando o pedido sair para entrega, você recebe um aviso por e-mail.'],
  ['Posso cancelar meu pedido?', 'Sim! Enquanto o pedido estiver como "Pendente", você pode cancelar em Meus pedidos. O estoque volta na hora.'],
  ['Os produtos voltam ao estoque?', 'Alguns sim, outros não. Itens com o selo "Edição limitada" são produzidos uma única vez.'],
  ['Como funciona o chaveiro personalizado?', 'Depois de finalizar a compra, nossa equipe entra em contato pelo e-mail cadastrado para confirmar o nome.'],
  ['Os buttons têm alfinete seguro?', 'Sim, todos usam alfinete com trava de segurança. Mesmo assim, recomendamos supervisão de um adulto para crianças pequenas.'],
  ['Como acompanho meu pedido?', 'Em "Meus pedidos". Você recebe um aviso na hora quando o pagamento é confirmado e quando o pedido sai para entrega ou fica pronto para retirada.'],
];

export default function Faq() {
  return (
    <div className="info-page">
      <div className="shop-banner teal">
        <h1>FAQ</h1>
      </div>
      <div className="faq">
        {QUESTIONS.map(([q, a], i) => (
          <details key={q} className="faq-item" open={i === 0}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
