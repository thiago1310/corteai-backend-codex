# Itens pendentes do plano (dev.md)

1. Agenda robusta
   - Gerar slots com duração real dos serviços (sem placeholders com usuário nulo).
   - Respeitar feriados e bloqueios na geração automática.
   - Suportar lista de espera/encaixe.

2. Políticas de cancelamento / no-show
   - Multa/sinal em cancelamentos fora da antecedência mínima.
   - Bloqueio de cliente por no-show recorrente.

3. Financeiro avançado
   - Conciliação de compras/estoque em contas a pagar com custo/margem.
   - Gateways de pagamento (cartão/pix) e conciliação de recebíveis.
   - Fluxo de caixa/reportes/centros de custo mais completos.

4. Auditoria avançada
   - Registrar eventos sensíveis (estoque, financeiro, promoções/cashback/giftcard).
   - Mascaramento de dados sensíveis e política de retenção de logs.

5. Promoções/Fidelidade (antiabuso)
   - Regras de combinação cupom + cashback + giftcard (limites por período/categoria).
   - Estorno de cashback/giftcard ao estornar pagamentos (além de cancelamento).

6. Documentação/ops
   - Atualizar/generar Postman com endpoints atuais.
   - Criar migrations para todas as novas tabelas/colunas.
