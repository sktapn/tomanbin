const QUESTIONS = [
  ['Qual o prazo de entrega?', 'Os pedidos são enviados em até 3 dias úteis após a confirmação do pagamento. O prazo dos Correios varia de 5 a 12 dias úteis conforme a região.'],
  ['Posso cancelar meu pedido?', 'Sim! Enquanto o pedido estiver como "Pendente", você pode cancelar em Meus pedidos. O estoque volta na hora.'],
  ['Os produtos voltam ao estoque?', 'Alguns sim, outros não. Itens com o selo "Edição limitada" são produzidos uma única vez.'],
  ['Como funciona o chaveiro personalizado?', 'Depois de finalizar a compra, nossa equipe entra em contato pelo e-mail cadastrado para confirmar o nome.'],
  ['Os buttons têm alfinete seguro?', 'Sim, todos usam alfinete com trava de segurança. Mesmo assim, recomendamos supervisão de um adulto para crianças pequenas.'],
  ['Como acompanho meu pedido?', 'Em "Pedidos", no topo do site. Quando o status mudar, você recebe um aviso na hora, sem precisar atualizar a página.'],
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
