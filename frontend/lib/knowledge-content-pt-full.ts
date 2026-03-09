/**
 * Base de conhecimento – Português (Knowledge base full content – Portuguese)
 */
export const contentPtFull: Record<string, { title: string; content: string }> = {
  'what-is-rwa': {
    title: 'O que é o RWA Protocol?',
    content: `O RWA Protocol é um protocolo de staking descentralizado na BNB Smart Chain (BSC).

**O que pode fazer**: Fazer staking de USDT ou RWA para ganhar rendimento diário em RWA; se cumprir as condições de nível de nó, quando **utilizadores referidos fizerem staking (depósito)**, também ganha recompensas de referência em USDT com base nesse valor (ver "Nós e referências"). O protocolo usa um **modelo 50/50**: 50% dos fundos em staking vão para o tesouro, 50% para o pool de recompensas da comunidade.

**Exemplo**: Faz staking de 10.000 USDT → 5.000 para o tesouro, 5.000 para o pool; ganha rendimento diário em RWA sobre o seu staking efetivo. Se tiver referidos, quando **fizerem staking**, ganha recompensas em USDT conforme o nível.`,
  },
  'rwa-token-what': {
    title: 'O que é o token RWA? Para que serve?',
    content: `**RWA** é o **token do protocolo** na BSC (ERC-20/BEP-20), usado para rendimento, staking e funcionalidades principais.

**Principais usos**:

| Uso | Descrição |
|-----|------------|
| **Rendimento diário** | Após staking de USDT ou RWA, o rendimento é pago em **RWA** (ex.: 0,8% base × multiplicador de bloqueio). Levantamento na página Levantamento. |
| **Staking RWA** | Fazer staking de **RWA** para receber stRWA e rendimento diário; escolher bloqueio (Flexível/30/90/180/365 dias). Após o bloqueio, desbloquear para recuperar RWA. |
| **Bilhetes de loteria** | Na página Loteria, usar **RWA** para comprar bilhetes (pools em tempo real/semanal/mensal/anual). |
| **Swap** | Na página Swap, comprar **RWA** com **USDT**; também pode negociar RWA em DEX suportados. |

**Como obter RWA**: ① Comprar com USDT na página Swap; ② Ganhar com staking (pago em RWA); ③ Prémios da loteria; ④ Comprar a outros utilizadores ou em DEX. O preço do RWA varia; invista apenas o que pode perder.`,
  },
  'how-to-start': {
    title: 'Como começar? Quais os passos?',
    content: `**Quatro passos** para iniciantes:

**① Obter uma carteira**  
Instalar OKX, app Binance ou MetaMask, criar/importar uma carteira Web3 e fazer backup da frase seed.

**② Fundos em USDT**  
Enviar USDT para a carteira em **BEP-20 (BSC)**. No levantamento da Binance, escolher "BSC (BEP-20)" e o endereço BSC da sua carteira. Testar primeiro com um valor pequeno (100–200 USDT).

**③ Conectar**  
Abrir o site do RWA Protocol, clicar em "Conectar carteira", escolher a carteira e aprovar. O seu endereço abreviado (ex.: 0x1234…5678) será mostrado.

**④ Primeiro staking**  
Ir a Staking, introduzir o valor (**mín. 100 USDT equivalente**), escolher o período de bloqueio; se tiver um referidor, introduzir o endereço da carteira (apenas uma vez, o vínculo é permanente). Aprovar, depois fazer staking e confirmar. Aguardar confirmação.

**Exemplo**: A Alice faz staking de 500 USDT com bloqueio de 30 dias e referidor A; após confirmação ela ganha RWA diário e A recebe uma vez a recompensa USDT de referência sobre esse staking de 500 USDT.`,
  },
  'supported-wallets': {
    title: 'Que carteiras são suportadas?',
    content: `Todas as carteiras **compatíveis com BSC**, por exemplo:

- **OKX Wallet** (app ou extensão)
- **Binance Web3 Wallet** (na app Binance)
- **MetaMask** (extensão ou app)
- **TokenPocket**, **Trust Wallet**, etc.
- Qualquer carteira WalletConnect

**Dica**: No telemóvel, abrir o site no **navegador integrado OKX ou Binance** para uma ligação mais estável.`,
  },
  'how-to-connect': {
    title: 'Como conecto a minha carteira?',
    content: `**Passos**: Abrir o site → clicar em "Conectar carteira" (canto superior direito) → escolher a carteira (MetaMask, OKX, Binance, etc.) → na janela da carteira clicar em "Autorizar" ou "Conectar" → o seu endereço (ex.: 0x1234…5678) aparecerá.

**Importante**: Garantir que a carteira está na **rede principal BSC** (Chain ID: 56). Se estiver na Ethereum ou outra rede, o site mostrará "Rede não suportada"; adicionar ou mudar para BSC na carteira e depois conectar.`,
  },
  'what-is-gas': {
    title: 'O que é o Gas? Por que preciso de BNB?',
    content: `**Gas** é a taxa para executar uma transação on-chain. Na BSC paga em **BNB**, não em USDT nem RWA.

**Custo típico**: Um staking, um levantamento ou uma aprovação custam cerca de **0,001–0,003 BNB** (cêntimos). Se só tiver USDT e não tiver BNB, a transação falhará com "Gas insuficiente".

**Dica**: Manter pelo menos **0,01–0,05 BNB** na carteira para várias ações (ex.: primeira vez: aprovar + staking ≈ 0,004 BNB; cada levantamento ≈ 0,001–0,003 BNB).`,
  },
  'how-to-get-usdt': {
    title: 'Como obter USDT?',
    content: `Comprar USDT numa **corretora centralizada** (Binance, OKX, Huobi, etc.) com fiat ou outras moedas, depois **levantar** para a sua carteira on-chain.

**Crítico**: Levantar em **BEP-20 (BSC)** e usar o **endereço de receção BSC** da sua carteira. Se usar ERC-20 (Ethereum) ou outra rede, os fundos não funcionarão neste site e a recuperação cross-chain é complexa e arriscada. **Exemplo**: Tem 1000 USDT na Binance; levantar com rede "BSC (BEP-20)", endereço = o seu endereço BSC MetaMask, valor 500; após chegada pode fazer staking no RWA Protocol.`,
  },
  'withdraw-from-exchange': {
    title: 'Como levantar de uma corretora para a minha carteira?',
    content: `**Passos** (corretora típica):

1. Iniciar sessão, encontrar "Levantar" ou "Levantar cripto".
2. Selecionar **USDT**.
3. Rede: **BSC (BEP-20)** ou "BNB Smart Chain" (tem de ser BSC).
4. Destinatário: colar o **endereço BSC** da sua carteira (0x, 42 caracteres) do MetaMask, etc.
5. Introduzir valor, verificar taxa e líquido, completar 2FA/verificação por email.

**Chegada**: Normalmente alguns minutos. **Exemplo**: Levantamento de 500 USDT, taxa ~0,8–1 USDT, recebe ~499 USDT. Testar primeiro com 100–200 USDT.`,
  },
  'choose-bsc-network': {
    title: 'Como selecionar a rede BSC?',
    content: `Na sua carteira, adicionar ou mudar para a **rede principal BSC**. Definições comuns:

- **Nome da rede**: BNB Smart Chain ou BSC
- **Chain ID**: **56**
- **RPC URL**: Documentação BSC ou lista padrão da carteira
- **Explorador**: https://bscscan.com

Este site só suporta a rede principal BSC. Se estiver na Ethereum (Chain ID 1) ou outra cadeia, a página pedirá para mudar para BSC. No MetaMask: nome da rede no topo → Adicionar rede → introduzir o acima; na app OKX/Binance escolher "Rede principal BSC".`,
  },
  'min-deposit': {
    title: 'Qual é o depósito/staking mínimo?',
    content: `O mínimo por staking é **100 USDT equivalente**. Quer faça staking de USDT ou RWA, o sistema converte para equivalente USDT ao preço atual.

**Exemplo**: USDT: mínimo 100 USDT. RWA: se RWA = 0,50 USD, precisa de pelo menos 100 ÷ 0,5 = **200 RWA**. Abaixo de 100 USDT equivalente não pode enviar.`,
  },
  'what-is-staking': {
    title: 'O que é o staking?',
    content: `**Staking** é enviar USDT ou RWA para o contrato do protocolo para ganhar "rendimento diário em RWA" e (quando elegível) "recompensas USDT de referência/nó".

**Para onde vão os fundos**: O seu valor é dividido **50% tesouro, 50% pool da comunidade**. Não "recupera" a parte do tesouro; recebe rendimento em RWA ao longo do tempo via o seu staking. Após as regras de **período de espera, mínimo de levantamento e taxa**, pode levantar na página Levantamento.

**Exemplo**: Faz staking de 2.000 USDT → 1.000 para o tesouro, 1.000 para o pool; ganha ~2.000×0,8% = 16 USDT equivalente em RWA por dia (ao preço RWA do dia) e pode depois levantar RWA ou reclamar USDT.`,
  },
  'usdt-vs-rwa-stake': {
    title: 'Diferença entre staking USDT e RWA?',
    content: `**Staking USDT**: Envia **USDT**; o contrato paga **RWA** como rendimento diário (ex.: 0,8% × multiplicador de bloqueio). Se tiver um referidor e cumprir as regras de nó, ele recebe recompensa **USDT** de referência em **cada staking** (não uma percentagem do seu rendimento diário). Mesma divisão 50/50.

**Staking RWA**: Envia **RWA**; recebe **stRWA** e rendimento diário em **RWA**. Pode escolher **bloqueio** (30/90/180/365 dias); após o bloqueio, "Desbloquear stRWA" devolve o principal em RWA. Mesmo 50/50.

**Exemplo**: 1.000 USDT flexível → ~8 USDT equivalente RWA/dia, sem principal bloqueado. 1.000 USDT equivalente em RWA com bloqueio 90 dias → rendimento diário maior (ex.: +60%) mas principal bloqueado 90 dias, depois desbloquear para RWA.`,
  },
  'lock-period-and-yield': {
    title: 'Quais os períodos de bloqueio? Como se multiplica o rendimento?',
    content: `Opções de bloqueio e bónus (protocolo atual):

| Bloqueio | Bónus vs flexível | Nota |
|----------|-------------------|------|
| Flexível | Nenhum | O principal desbloqueado pode ser levantado a qualquer momento |
| 30 dias | +30% | Principal bloqueado 30 dias |
| 90 dias | +60% | Principal bloqueado 90 dias |
| 180 dias | +100% | Principal bloqueado 180 dias |
| 365 dias | +150% | Principal bloqueado 365 dias |

**Fórmula**: Rendimento diário ≈ staking (USDT equivalente) × **0,8%** × (1 + bónus de bloqueio), pago em RWA ao preço do dia. **Exemplo**: 10.000 USDT flexível → 80 USDT equivalente RWA/dia. 10.000 USDT, bloqueio 180 dias (+100%) → 160 USDT equivalente RWA/dia; esses 10.000 stRWA não podem ser desbloqueados antes de 180 dias. Ver página Staking e contrato.`,
  },
  'daily-yield-calc': {
    title: 'Como se calcula o rendimento diário?',
    content: `**Rendimento diário RWA ≈ o seu staking (USDT equivalente) × 0,8% × multiplicador de bloqueio**

Pago em RWA ao **preço do dia**. Multiplicador: flexível = 1, 30d ≈ 1,3, 90d ≈ 1,6, 180d = 2, 365d = 2,5 (ver interface).

**Exemplo**: Staking **5.000 USDT**, **bloqueio 90 dias** (+60%), RWA = **1 USD**. Diário: 5.000 × 0,8% × 1,6 = 64 USDT equivalente → **64 RWA/dia**. Se RWA = **0,50 USD**, então 64 ÷ 0,5 = **128 RWA/dia**. As recompensas de referência/nó são em **USDT** e reclamadas separadamente na página Levantamento.`,
  },
  'when-rewards-arrive': {
    title: 'Quando chegam as recompensas? Como verificar?',
    content: `**Liquidação**: Uma vez por dia às **UTC 0:00**; o atraso on-chain pode ser de minutos até **~2 horas**.

**Onde ver**: **Painel** → "Atividade recente": rendimento diário. **Página Levantamento**: "RWA levantável" e "USDT reclamável". **Exemplo**: Fez staking no dia 5 de março; após liquidação do dia 6 de março às UTC 0:00, normalmente verá o rendimento do dia 6 por volta das 8h–10h (hora de Pequim). Se nada após 24 h, confirmar que não acionou levantamento de emergência e contactar o apoio com o seu endereço.`,
  },
  'how-to-withdraw-rwa': {
    title: 'Como levantar o rendimento RWA?',
    content: `Na página **Levantamento**, o cartão **Levantar RWA** mostra: **Rendimento RWA liquidado** (de staking USDT e RWA); **Principal RWA desbloqueado** de staking RWA flexível (se aplicável).

Clicar em "Levantar" → confirmar na carteira e pagar Gas (pouco BNB). **Importante**: Se este levantamento **incluir principal desbloqueado** (RWA que apostou como "Flexível"), tem de levantar **o valor disponível total** (todo o rendimento + todo o principal desbloqueado) de uma vez. Usar MAX ou introduzir o total. Levantar só rendimento pode ser qualquer valor acima do mínimo e fora do período de espera. **Principal flexível**: Apenas para staking **RWA** com bloqueio **Flexível**; o principal RWA desbloqueado pode ser levantado a qualquer momento no cartão de levantamento RWA, **sem taxa, sem período de espera 24 h**. Se tiver rendimento e principal, tem de levantar ambos numa transação.`,
  },
  'withdraw-cooldown-fee': {
    title: 'Qual é o período de espera e a taxa de levantamento?',
    content: `Regras (protocolo atual):

| Item | Regra |
|------|--------|
| Mín. levantamento | Pelo menos **100** (conforme a rota de levantamento) |
| Período de espera | **24 horas** entre dois levantamentos RWA; o botão mostra contagem decrescente |
| Taxa imediata | **8%** fixo (3% recompra/queima, 3% tesouraria, 2% pool comunidade) |
| Modo stRWA | **0%** taxa, cunha **120%** em stRWA bloqueado 30 dias |
| Gas | Pouco BNB para BSC (≈ 0,001–0,003 BNB) |

**Exemplo**: Levantar **100 RWA** imediatamente → recebe **92 RWA** (8% taxa). Em modo stRWA: 0% taxa, **120 stRWA** bloqueado 30 dias. Mínimo **100**.`,
  },
  'what-is-strwa-unlock': {
    title: 'O que é desbloquear stRWA? Como fazer?',
    content: `**stRWA** é o **recibo de staking** quando faz staking de **RWA** com **bloqueio**. Durante o bloqueio não pode levantar o principal; **após o bloqueio**, na página Levantamento usar o cartão **Desbloquear stRWA** para converter stRWA de volta em RWA.

**Passos**: Página Levantamento → "Desbloquear stRWA" → verificar valor e qualquer desbloqueio/período de espera (ex.: 7 dias de desbloqueio, 3 dias de espera) → introduzir valor, confirmar, pagar Gas. **Exemplo**: Bloqueou 2.000 RWA por 90 dias; após expiração a página mostra "Desbloquear 2.000 stRWA". Confirma; 2.000 RWA voltam à sua carteira em minutos. Se o protocolo tiver atraso de 7 dias, a receção pode demorar 7 dias; ver a página.`,
  },
  'claim-usdt-rewards': {
    title: 'Como reclamar as recompensas de referência USDT?',
    content: `As recompensas de referência/nó **estão em USDT** on-chain. Na página Levantamento, o cartão **Recompensas USDT** mostra o valor reclamável. Clicar em "Reclamar" → confirmar na carteira e pagar Gas; os USDT são enviados para a sua carteira.

**Nota**: As recompensas são pagas quando **os utilizadores referidos fazem staking** (cada staking), pela sua taxa de nível sobre esse valor, não sobre o rendimento diário deles. **Exemplo**: O seu referido direto faz staking de 1.000 USDT, você é L3 (8%) → recebe 1.000×8% = **80 USDT**; soma ao seu saldo reclamável; cada reclamação custa um pouco de Gas BNB.`,
  },
  'what-is-emergency-withdraw': {
    title: 'O que é o levantamento de emergência? Consequências?',
    content: `O **levantamento de emergência** aplica-se apenas a **posições USDT em bloqueio antes do vencimento**. Devolve conforme **dias completados** (dias completados / total dias de bloqueio), depois deduz **8%** de taxa e recebe **USDT**. **Os RWA pendentes não são apagados**; só essa posição é encerrada, de forma irreversível.

**Lógica**: Devolução = principal dessa posição × (dias completados / total dias de bloqueio), depois 8% (3% recompra/queima, 3% tesouro, 2% pool da comunidade). Se o bloqueio já venceu, use o levantamento normal de principal. **Exemplo**: Bloqueio 30 dias, passaram 3 → levantamento de emergência: 3/30 = 10% a liquidar, após 8% taxa recebe USDT. **Usar apenas quando entender o risco e precisar mesmo de sair.** Ler primeiro o aviso na página.`,
  },
  'what-are-node-levels': {
    title: 'O que são os níveis de nó? O que são L1–L9?',
    content: `Os níveis de nó (**L1–L9**) são o seu escalão no sistema de referências. Escalão mais alto → **% de recompensa de referência** maior quando **os referidos fazem staking**; L4+ pode participar na **partilha de receitas do protocolo**.

**Importante**: O "% de recompensa" na tabela é sobre **o valor em staking desse utilizador**, não sobre o rendimento diário 0,8% em RWA dele. As recompensas de referência são **pagas uma vez por staking**, não diariamente. Tabela (ver página Nós e referências): L1 Quantum 3%, L2 Particle 5%, L3 Photon 8%, L4 Starship 12%, L5 Comet 17%, L6 Planet 23%, L7 Star 30%, L8 Nebula 35%, L9 Supernova 40%, com requisitos de staking de equipa e pessoal. **Exemplo**: É L3 (8%); o referido direto A faz staking de 1.000 USDT → recebe 80 USDT uma vez. Se passar a L4 (12%), o mesmo A faz staking de 1.000 novamente → recebe 120 USDT.`,
  },
  'what-is-referrer': {
    title: 'O que é um referidor? Como fica vinculado?',
    content: `O seu **referidor** é o endereço da carteira que introduz em "Endereço do referidor" no seu **primeiro staking**. Esse vínculo é **permanente** após confirmação do primeiro staking on-chain e **não pode ser alterado**.

Depois, em **cada staking**, o seu referidor e os uplines dele recebem recompensas USDT de referência sobre **esse valor** conforme o escalão e as regras de "compressão". Na página Nós e referências pode ver o seu link e estrutura; ao convidar, peça-lhes para **colar o seu endereço** em "Endereço do referidor" na página Staking. **Endereço do referidor errado?** Após confirmação do primeiro staking, o referidor fica fixo e o contrato não permite alterá-lo. Se ainda não fez staking, verificar antes do primeiro. Se já vinculado, não é corrigível on-chain; confirmar o endereço com o seu referidor (ex.: usar o link dele); para vínculos errados grandes, contactar o apoio oficial.`,
  },
  'referral-reward-calc': {
    title: 'Como são calculadas as recompensas de referência?',
    content: `**Quando**: Apenas quando um **utilizador referido faz staking**; o sistema usa **esse valor** e paga USDT ao referidor e uplines dele. **Não** lhe paga uma parte do rendimento diário 0,8% deles.

**Como**: Base: **o staking desse utilizador** (USDT ou RWA equivalente). Taxa: do referidor direto para cima pelo **% de escalão de nó**; com vários níveis, **compressão** (diferença de escalão): cada nível só recebe "o meu % menos o que já foi tomado abaixo"; total a todos os uplines ≤ **50%** desse staking. **Limite por staking**: A recompensa de cada referidor por um staking ≤ **50% do staking total desse referidor**; o excedente não é pago. **Por que menos do que esperado?** Recompensa só sobre o valor em staking, não o rendimento diário; limite 50% por staking; compressão (só recebe a diferença de escalão); referidor errado ou não vinculado.`,
  },
  'how-to-upgrade-node': {
    title: 'Como subir de nível de nó?',
    content: `O nível é **automaticamente** definido pelo sistema a partir do **staking total da equipa, estrutura e o seu staking pessoal**; não há pedido manual. O sistema atualiza após atividade de referências. **Exemplo** (ver página Nós): L1→L2: staking pessoal ≥ 500 USDT, equipa ≥ 5.000 USDT. L2→L3: pessoal ≥ 1.000, equipa ≥ 20.000. L4–L9: ver tabela. Verificar o **nível atual** e os **requisitos do nível seguinte** na página Nós e referências.`,
  },
  'lottery-rules': {
    title: 'Quais são as regras da loteria?',
    content: `Os utilizadores compram **bilhetes de loteria** com **RWA**. Os sorteios usam aleatoriedade on-chain (ex.: **Chainlink VRF**); os resultados são públicos. **Fundos**: Quando um pool é sorteado, **5%** do pool vai para o **tesouro**; os **95%** restantes são repartidos por nível (1.º 48%, 2.º 24%, 3.º 14%, 4.º 9%). Se um nível não tiver vencedor, essa parte **passa para o próximo sorteio** do mesmo pool. **Exemplo**: Um pool semanal de 10.000 USDT → 500 para o tesouro; 4.800 para o 1.º, 2.400 para o 2.º, etc.; se não houver 1.º, 4.800 passam para a semana seguinte.`,
  },
  'four-pools-diff': {
    title: 'Diferença entre os quatro pools (tempo real/semanal/mensal/anual)?',
    content: `| Pool | Hora do sorteio | Nota |
|------|-----------------|------|
| **Tempo real** | A cada **5 min** (0:00, 0:05, 0:10 UTC) | Rápido, apostas pequenas |
| **Semanal** | **Segunda** **0:00 UTC** | Uma vez por semana |
| **Mensal** | **Dia 1** do mês **0:00 UTC** | Uma vez por mês |
| **Anual** | **1 Jan** **0:00 UTC** | Uma vez por ano, pool maior |

Todas as horas em **UTC**. **Exemplo**: 10 Mar 2026 14:35 UTC → próximo tempo real 14:40 UTC; próximo semanal 17 Mar 0:00 UTC. Ver página Loteria.`,
  },
  'draw-time-utc': {
    title: 'Como é definida a hora do sorteio? (UTC)',
    content: `Todos os pools sortejam a **horas fixas UTC** conforme o contrato: **Tempo real**: a cada 5 min (0:00, 0:05, 0:10 … UTC). **Semanal**: segunda 00:00 UTC. **Mensal**: dia 1 do mês 00:00 UTC. **Anual**: 1 Jan 00:00 UTC. Ver a página Loteria para as horas exatas.`,
  },
  'buy-tickets-and-claim': {
    title: 'Como comprar bilhetes e reclamar prémios?',
    content: `**Comprar**: Na página Loteria escolher um pool (tempo real/semanal/mensal/anual), introduzir o **número de bilhetes**, pagar em RWA e confirmar. O preço pode variar por pool (ex.: 10 RWA/semanal, 50 RWA/mensal); pode haver um máximo por sorteio (ex.: 100). **Reclamar**: Após o sorteio, se ganhar, encontrar "Reclamar" para esse pool, enviar a tx e pagar Gas; os prémios são enviados para a sua carteira. Os bilhetes não ganhos não são reembolsados; pode participar no próximo sorteio. **Exemplo**: Compra 5 bilhetes semanais por 50 RWA; se ganhar no 4.º nível recebe 9% desse pool em RWA/USDT e reclama na página.`,
  },
  'how-to-buy-rwa-with-usdt': {
    title: 'Como comprar RWA com USDT?',
    content: `Na página **Swap** escolher **USDT → RWA**, introduzir o valor em USDT; a interface mostra o RWA estimado (incl. deslize/taxas). **Primeira vez** tem de **Aprovar** os USDT para o contrato, depois clicar em "Swap" e confirmar; pagar Gas e o RWA é enviado para a sua carteira. **Exemplo**: RWA ≈ 0,85 USD; introduz 850 USDT → ~1.000 RWA (talvez um pouco menos com deslize); após aprovar + swap tem ~1.000 RWA e 850 USDT a menos.`,
  },
  'where-to-see-price': {
    title: 'Onde ver o preço do RWA?',
    content: `Na página **Mercado** pode ver o **preço, gráfico, variação 24 h, volume** do RWA. Os dados são agregados da cadeia ou terceiros e são **indicativos**; a execução real é on-chain e na página Swap. Ex.: se o mínimo 24 h for 0,80 e o máximo 0,90, o seu swap pode cair nesse intervalo; ver a página Swap para a cotação exata.`,
  },
  'protocol-fund-model': {
    title: 'Qual é o modelo de fundos do protocolo? (50/50)',
    content: `Ao **fazer staking**, os fundos vão **50% para o tesouro, 50% para o pool de recompensas da comunidade**. **Tesouro**: reserva, segurança, longo prazo; não recupera a parte do tesouro no levantamento nem no levantamento de emergência. **Pool da comunidade**: paga o **rendimento diário RWA** e as **recompensas USDT de referência/nó**. **Exemplo**: 100 utilizadores fazem staking de 10.000 USDT cada → 1.000.000 no total; 500.000 para o tesouro, 500.000 para o pool. O rendimento diário RWA e USDT é pago a partir do pool e das regras; o tesouro não é devolvido aos utilizadores.`,
  },
  'treasury-and-community-pool': {
    title: 'O que são o tesouro e o pool da comunidade?',
    content: `**Tesouro**: Recebe **50%** dos fundos em staking; usado para reserva, operações, segurança, ecossistema. Também **5%** de cada pool de loteria. **Pool da comunidade**: Recebe os outros **50%** dos fundos em staking; usado para pagar o rendimento RWA e as recompensas USDT. **Exemplo**: Staking de 2.000 USDT → 1.000 para o tesouro, 1.000 para o pool. Um pool de loteria de 20.000 USDT → 1.000 (5%) para o tesouro, 19.000 para os vencedores ou próximo sorteio.`,
  },
  'lottery-5-percent-treasury': {
    title: 'O que significa "5% do pool de loteria para o tesouro"?',
    content: `Quando um pool de loteria é **distribuído**, **5%** do pool é enviado para o **tesouro** do protocolo; os **95%** restantes vão para os vencedores por nível (ou para o próximo sorteio se um nível não tiver vencedor): 1.º 48%, 2.º 24%, 3.º 14%, 4.º 9%, Tesouro 5%. **Exemplo**: Pool de 50.000 USDT → 2.500 para o tesouro; se não houver 1.º, 4.800 passam para o próximo sorteio desse pool.`,
  },
  'avoid-phishing': {
    title: 'Como evitar sites de phishing?',
    content: `- Usar **apenas o domínio e links oficiais**; não clicar em links por SMS, email ou grupos desconhecidos. Antes de conectar, verificar a **barra de endereço** para o domínio correto. **Nunca** introduzir a frase seed, a chave privada ou a palavra-passe em páginas não oficiais; este site **nunca os pede**. Em caso de dúvida, confirmar a **última URL oficial** através dos anúncios ou da comunidade.`,
  },
  'protect-private-key': {
    title: 'Como manter a minha chave privada e frase seed em segurança?',
    content: `São a **única** forma de controlar os seus ativos; quem as tiver pode mover os seus fundos. **Dicas**: Não tirar capturas de ecrã, não enviar por email/chat, não guardar em dispositivos ligados ou na nuvem. Preferir **escrever em papel** e guardar em segurança; considerar uma carteira de hardware. Este site e o apoio real **nunca** pedem a frase ou a chave; quem o fizer é um burlão.`,
  },
  'tx-pending': {
    title: 'E se a minha transação ficar pendente?',
    content: `Muitas vezes por **congestão da rede**. Tentar: 1) **Esperar 10–30 min**; muitas tx confirmam sozinhas. 2) Na carteira, encontrar a tx e usar "**Acelerar**" para reenviar com mais Gas. 3) Se ainda pendente após 1 h, verificar o estado em **BSCScan.com** com o **hash da tx**. 4) Ao contactar o apoio, fornecer o **hash da tx**. **Exemplo**: Um levantamento fica preso no MetaMask; copiar o hash (0x…), procurar no BSCScan para ver Pendente ou Falhada; se Pendente, acelerar na carteira.`,
  },
  'rewards-not-arrived': {
    title: 'As minhas recompensas não chegaram, o que fazer?',
    content: `O rendimento é liquidado diariamente às **UTC 0:00**; a chegada pode atrasar até **~2 horas**. Primeiro: 1) **Painel** → **Atividade recente** para o rendimento do dia. 2) Confirmar que não fez **levantamento de emergência** nem outras ações que alterem o estado. 3) Se **mais de 24 h** sem registo, contactar o apoio (Telegram, Discord, email) com **endereço da carteira**, **descrição**, **momento aproximado** (ex.: "Staking em 5 Mar, rendimento de 6 Mar esperado, não mostrado"). **Exemplo**: Fez staking em 5 Mar, ainda sem rendimento às 10:00 de 6 Mar; verificar a atividade recente de 6 Mar; se estiver lá, a página Levantamento pode estar só lenta; senão, contactar o apoio com endereço e hora.`,
  },
  'contact-support': {
    title: 'Como contactar o apoio?',
    content: `Usar **Telegram, Discord ou email oficiais** (ex.: rwacoin001@gmail.com). O apoio **nunca** pede a frase seed, a chave privada ou a palavra-passe. Ao reportar um problema, incluir o **endereço da carteira** (ex.: 0x1234…5678), **o que aconteceu** e o **hash da tx** se houver. Ex.: "Carteira 0x1234…5678, levantei 100 RWA em 6 Mar, não recebido, TX: 0xabcd…".`,
  },
  'compare-pancake': {
    title: 'Em que é que o RWA difere do farming de liquidez PancakeSwap?',
    content: `**PancakeSwap**: Fornece **liquidez** (ex.: par USDT–BNB), ganha **taxas de trading + recompensas de farm**; pode **remover a liquidez** e recuperar o principal (com risco de perda impermanente). **Staking RWA Protocol**: Deposita **USDT ou RWA** no protocolo; ganha **rendimento diário RWA** (ex.: 0,8% × bloqueio) e possivelmente **USDT de referência/nó**. O principal 50% tesouro, 50% pool. Só **USDT em bloqueio antes do vencimento** admitem **levantamento de emergência** (proporção dias completados + 8% taxa, devolução em USDT, irreversível). Vencidos e flexíveis usam levantamento normal de principal. **Resumo**: Farming = liquidez + recompensas, removível; staking RWA = rendimento fixo + referências, principal em parte irreversível; entender as regras antes de participar.`,
  },
  'compare-other-platforms': {
    title: 'Em que é que o RWA difere de outras plataformas de staking de alto rendimento?',
    content: `**Fonte do rendimento**: O RWA oferece **rendimento diário RWA + USDT de referência/nó** por bloqueio e escalão; outras podem ser farming APY puro ou produtos de dois ativos com estrutura e risco diferentes. **Principal e saída**: O RWA usa **50/50**. Só USDT em bloqueio antes do vencimento têm levantamento de emergência (proporção dias completados + 8% taxa, devolução USDT). Vencidos e flexíveis usam levantamento normal. Plataformas que prometem "devolução total a qualquer momento" podem ser rug pulls; o RWA **descreve explicitamente as vias de retiro do principal**. **Transparência**: O RWA tem **tesouro multisig, TimeLock, auditorias de terceiros, TVL/tesouro on-chain**. Comparar se outras plataformas têm contratos abertos, auditorias públicas e fundos verificáveis on-chain. **Dica**: Não perseguir "alto rendimento" cegamente; verificar se o principal é recuperável, de onde vem o rendimento e se há auditorias e transparência on-chain.`,
  },
  'referral-link-where': {
    title: 'Onde obter o meu link de referência?',
    content: `Na página **Nós e referências** (na navegação: "Nós" / "Referências"): a página mostra o seu **link de referência** (URL do site + o seu endereço ou código). Copiar e partilhar; quando alguém o abrir, a página Staking pode **pré-preencher o seu endereço** em "Endereço do referidor" (se não, eles colam). Se não encontrar, verificar a navegação no topo ou em baixo para "Nós", "Referências" ou "As minhas referências"; alguns produtos também têm "Obter link de referência" na página Staking.`,
  },
  'calculator-where': {
    title: 'Onde está a calculadora de rendimento? Como usar?',
    content: `Na navegação, abrir **"Calculadora de rendimento"** ou **"Calculator"** (muitas vezes em "Analíticas"). **Uso**: Introduzir o **valor a apostar**, o **bloqueio** (Flexível/30/90/180/365 dias), o **nível de nó** (se quiser estimativa de referências); a página mostra o **rendimento RWA estimado diário/mensal/anual** e as recompensas USDT possíveis. **Apenas indicativo**; não é uma promessa on-chain. O rendimento real vem da cadeia e do contrato. Usar para comparar valores e períodos de bloqueio.`,
  },
  'principal-withdraw-guide': {
    title: 'Como levanto o principal? Flexível vs bloqueado?',
    content: `A página Levantamento separa **levantamento de rendimento** e **levantamento do principal**. O principal é tratado na secção **"Levantamento do principal"**. **Quatro tipos**: USDT flexível → secção Principal, USDT flexível, instantâneo **8%** taxa (3% recompra/queima, 3% tesouraria, 2% pool). Mín. **100**. USDT bloqueio vencido → após o bloqueio, em Principal selecionar a posição USDT bloqueada, **8%** taxa. Antes do vencimento: apenas **levantamento de emergência**. RWA flexível → Principal, RWA flexível, **8%** taxa, mín. **100**. RWA bloqueio vencido → após vencimento: **instantâneo** (8%) ou **modo stRWA** (**0%**, **120%** cunhado em stRWA bloqueado 30 dias). Apenas **USDT em bloqueio antes do vencimento** usa levantamento de emergência.`,
  },
  'withdraw-arrival-time': {
    title: 'Quanto tempo até o meu levantamento chegar?',
    content: `Levantamentos (RWA ou USDT) e pedidos de recompensa USDT são **transações on-chain**. O tempo de chegada depende da confirmação BSC e da atualização da carteira. **Caso normal**: BSC produz um bloco em cerca de **3 segundos**; uma vez a sua tx incluída, confirma em **segundos a cerca de um minuto**. Se o estado for Success, o contrato já enviou RWA ou USDT para o seu endereço. Algumas carteiras demoram **alguns segundos a dezenas de segundos** a atualizar o saldo. **Mais lento**: congestão da rede ou Gas demasiado baixo. **Resumo**: em condições normais, **chegada on-chain em cerca de um minuto** após confirmar; se nada após 2–3 min, verificar a tx no BSCScan.`,
  },
  'rewards-manual-claim': {
    title: 'As recompensas entram automaticamente ou tenho de reclamar?',
    content: `**Tem de levantar/reclamar ativamente; as recompensas não são enviadas automaticamente para a carteira.** RWA: o protocolo **liquida** diariamente no seu saldo no contrato (rwaPending) mas **não envia** para a carteira. Abra a página **Levantamento**, cartão **RWA**, introduza o valor, Levantar e confirme. USDT referência/nó: igual **on-chain**, cartão **Recompensas USDT**; clicar em **Reclamar** e confirmar. **Resumo**: primeiro liquida on-chain; você **inicia levantamento ou reclamação** para chegar à carteira. Cada ação gasta um pouco de BNB em Gas.`,
  },
  'withdraw-amount-mismatch': {
    title: 'Por que o RWA levantável não bate com o meu cálculo?',
    content: `Razões comuns: **variação do preço RWA** e **unidades diferentes** (valor vs quantidade). Na cadeia guarda-se a **quantidade** RWA; se calcular "0,8% diário × USDT em staking" obtém equivalente USDT e ao dividir pelo preço RWA assumido pode não bater. O rendimento foi convertido em RWA ao preço **de então**. **Use a quantidade RWA levantável** mostrada na página ou on-chain. Levantamentos instantâneos **8%** taxa e mínimo **100**.`,
  },
  'withdraw-not-received': {
    title: 'Levantamento com sucesso mas RWA não na carteira, como verificar?',
    content: `Se a **transação mostra sucesso** mas o saldo não mudou: 1) **Cadeia e endereço**: a carteira deve estar em **BSC mainnet** e o saldo que consulta ser do **mesmo endereço** que usou para levantar. 2) **Token visível**: se RWA não está "adicionado" na carteira, adicione o **endereço do contrato RWA**. 3) **On-chain**: procure a tx de levantamento no **BSCScan** pelo seu endereço; se estado Success e Transfer com o seu endereço como destinatário, os fundos estão on-chain. 4) **Atraso**: algumas carteiras atualizam o saldo com atraso. 5) **Ainda não**: guarde o **hash da TX** e contacte o apoio com "endereço + hash + hora aproximada".`,
  },
  'rwa-usdt-separate-claim': {
    title: 'RWA e USDT reclamo separadamente?',
    content: `**Sim.** São **duas ações distintas**; cada uma tem de ser feita para esse ativo chegar à carteira. **RWA**: use o cartão **Levantamento RWA** na página Levantamento (rendimento diário em RWA). **USDT**: use o cartão **Recompensas USDT / Reclamar** (recompensas referência/nó). Reclamar um não dispara o outro. Se tiver ambos, **faça cada ação uma vez**. Cada uma gasta um pouco de BNB em Gas.`,
  },
  'no-referrals-still-earn': {
    title: 'Posso ganhar sem ter referidos?',
    content: `**Sim.** O rendimento do protocolo tem duas partes: **rendimento estático** (não precisa de referidos) e **recompensas de referência** (precisa de referidos). Enquanto **você** fizer staking de USDT ou RWA, ganha **RWA diário** (ex. 0,8% base × multiplicador bloqueio). **Independente** de referidos ou do campo referidor. **USDT** referência/nó só recebe quando **utilizadores referidos** fazem staking com o seu endereço como referidor. Sem referidos não há essa parte USDT, mas o seu **rendimento estático RWA mantém-se**. **Resumo**: sem referidos continua a ganhar **RWA estático diário**; as referências são **rendimento USDT extra**.`,
  },
  'wrong-referrer-address': {
    title: 'Meti o endereço do referidor errado, o que faço?',
    content: `**Quando o seu primeiro stake é confirmado on-chain, o referidor fica ligado permanentemente; o contrato não permite alterar nem desvincular.** Se **ainda não fez staking**: reverifique "Endereço do referidor" antes do primeiro stake. Até o primeiro stake ser confirmado nada é escrito on-chain; pode corrigir e depois fazer staking. Se **já fez staking e o referidor está definido**: não pode alterar on-chain. Se meteu outro endereço, as suas recompensas de referência irão para esse endereço; se vazio ou zero, não tem referidor e não pode adicionar depois. **Dica**: confirme o endereço com o seu referidor antes do primeiro stake. O **contrato não pode alterar o referidor**.`,
  },
  'node-level-downgrade': {
    title: 'Por que desceu o meu nível de nó?',
    content: `O nível de nó é calculado **dinamicamente** a partir do seu stake de equipa e pessoal **atual** (e estrutura), não é fixo. **Por que pode descer**: quando o stake efetivo diminui (referidos levantam, você levanta o principal) ou deixa de cumprir os requisitos do nível atual, o sistema recalcula e pode atribuir um nível inferior. **Efeito**: após a descida, os **novos** stakes dos referidos são recompensados à nova taxa (inferior). L4+ participam no reparto de receitas; abaixo de L4 deixa de participar. **Restaurar**: quando equipa/pessoal voltar a cumprir os requisitos do nível superior, o nível é restaurado. Ver página Nós e referências.`,
  },
  'direct-vs-indirect-referral': {
    title: 'Diferença entre referido direto e indireto? Como se reparte a recompensa?',
    content: `**Referido direto**: alguém que convida que **coloca o seu endereço** como referidor ao fazer staking; recebe recompensa USDT desse **stake** à sua taxa de nível (ex. L3 = 8%). **Indireto (multinível)**: o seu referido direto A convida B; B faz staking com o endereço de A como referidor, logo B é o seu referido **indireto** (segundo nível). Com vários níveis aplica-se **compressão**: cada nível só recebe "o meu % menos o que os níveis abaixo já levaram"; o total para todos os de cima é no máximo **50%** desse stake. **Exemplo**: C tem você como referidor (L3, 8%), você tem Alice (L5, 17%). C faz staking de 10.000 USDT: você 8% = 800 USDT, Alice 17%−8% = 9% = 900 USDT, total 1.700 USDT. As recompensas disparam **uma vez por stake** nesse valor.`,
  },
  'same-wallet-multiple-referrers': {
    title: 'Uma carteira pode ter mais de um referidor?',
    content: `**Não.** Um endereço de carteira só pode ter **um** referidor. Quem estiver em "Endereço do referidor" quando esse endereço faz o **primeiro stake confirmado** passa a ser o referidor permanente. Se outro partilhar depois um link de referência, **não** substitui o referidor atual; o contrato não permite alterar nem partilhar a relação. Cada endereço tem **um único referidor, permanente**.`,
  },
  'what-is-approve': {
    title: 'O que é Approve? Por que duas transações?',
    content: `Na primeira vez que faz staking ou swap, a carteira pode pedir uma transação **Approve**. É normal e obrigatória on-chain; não é um custo extra. **Approve** = permite que "este contrato gaste até X deste token". Não move os tokens ainda, só define um limite de gasto. A **segunda** transação (Stake ou Swap) é quando o contrato move os tokens. **Por que duas**: Primeira Approve — permite usar o seu USDT (ou RWA), só regista o limite, paga um pouco de Gas (BNB). Segunda Stake/Swap — ao clicar o contrato move o valor dentro do limite aprovado. Por token e contrato basta **aprovar uma vez** (ou de novo quando o limite acabar).`,
  },
  'balance-insufficient-why': {
    title: 'Diz "saldo insuficiente" mas tenho USDT, por quê?',
    content: `Verifique por ordem: 1) **Rede errada**: o protocolo só usa USDT em **BSC**. 2) **Carteira não está em BSC**: mudar para **BSC mainnet** (Chain ID: 56). 3) **Sem BNB para Gas**: fazer staking e aprovar custa **BNB**. Manter um pouco de BNB (ex. 0,01–0,05). 4) **Limite de aprovação baixo**: **voltar a aprovar** (valor mais alto ou ilimitado) e depois fazer staking. 5) **Interface desatualizada**: após depósito ou mudança de rede, atualizar ou reconectar a carteira. Se tudo estiver certo e ainda falhar, verificar o saldo USDT BSC no BSCScan e contactar o apoio com endereço, rede e captura.`,
  },
  'can-cancel-stake': {
    title: 'Posso cancelar o meu stake?',
    content: `**Não.** O protocolo **não** suporta "cancelar stake"; uma vez confirmado on-chain está ativo. **Para tirar os fundos** use a saída que corresponde ao seu **tipo de posição**: RWA com bloqueio → esperar que **termine o bloqueio**, depois na página Levantamento usar **desbloquear stRWA**. RWA flexível → o principal desbloqueado pode ser levantado na secção **Levantamento do principal**. USDT: **flexível** → levantar o principal USDT na secção Principal; **bloqueado** → esperar **vencimento**; antes do vencimento **levantamento de emergência** apenas para essa posição USDT bloqueada (proporção dias completados + 8% taxa). Apenas **USDT em bloqueio antes do vencimento** usa levantamento de emergência.`,
  },
  'multiple-stakes': {
    title: 'Posso ter mais do que um stake?',
    content: `**Sim.** O protocolo permite **vários stakes** da mesma direção com períodos de bloqueio diferentes; somam para o stake total e rendimento. Pode ter stakes USDT (rendimento RWA) e RWA (stRWA e rendimento RWA); "RWA levantável" combina o rendimento de ambos. Consulte o painel e a página Levantamento.`,
  },
  'strwa-vs-rwa': {
    title: 'Diferença entre stRWA e RWA?',
    content: `**RWA** é o **token líquido** do protocolo: pode deter, transferir, fazer staking ou swap em DEX ou na página Swap. **stRWA** é o **recibo de staking** ao fazer staking de **RWA com bloqueio** (ex. 30/90/180/365 dias); representa o principal RWA bloqueado. **Durante o bloqueio**: detém **stRWA**, não pode enviar como RWA nem levantar o principal; o contrato paga-lhe **rendimento RWA diário**. **Após o bloqueio**: na página Levantamento usar **desbloquear stRWA** para converter stRWA em **RWA**.`,
  },
  'wrong-amount-sent-tx': {
    title: 'Enviei o stake com valor errado, posso cancelar?',
    content: `**Uma vez a transação emitida não pode "desfazê-la" on-chain.** Se ainda estiver **pendente**, algumas carteiras permitem "acelerar" ou "cancelar" com outra tx (ex. gas mais alto). Se **confirmada**, o stake está ativo; só pode sair conforme o tipo de posição. **Dica**: reverificar o valor e o período de bloqueio antes de confirmar.`,
  },
  'transfer-stake-to-other': {
    title: 'Posso transferir o meu stake para outra pessoa?',
    content: `**Não.** Os stakes estão ligados à **sua direção de carteira**; o protocolo não permite "transferir stake para outra direção". O seu stake, rendimento levantável e USDT reclamável estão no contrato sob **a sua direção**. Para dar ativos a outrem tem de **levantar** quando puder (principal flexível, bloqueio vencido ou emergência para USDT bloqueado antes do vencimento) para a sua carteira e depois enviar os fundos ou eles fazerem staking da sua direção.`,
  },
  'swap-limits-slippage': {
    title: 'Há limites ou deslizamento no swap?',
    content: `A página Swap mostra uma **quantidade estimada de RWA** conforme o contrato e a pool; pode ser afetada por **deslizamento** (o preço pode mover entre enviar e a tx executar) e **limites por tx ou diários** se o protocolo ou contrato tiver. Use a **cotação em tempo real** da página Swap; para montantes grandes, considere dividir ou verificar a tolerância ao deslizamento.`,
  },
  'sell-rwa-for-usdt': {
    title: 'Posso vender RWA por USDT?',
    content: `A página Swap do protocolo foca-se em **USDT → RWA** (comprar RWA com USDT). Se **RWA → USDT** é oferecido na mesma página depende do site e anúncios. Se disponível, escolha RWA→USDT na página Swap, introduza o valor e confirme. Caso contrário, pode negociar RWA por USDT em **DEX ou exchanges** que listem RWA; o protocolo pode também adicionar RWA→USDT na app mais tarde — ver atualizações oficiais.`,
  },
  'audit-where': {
    title: 'Há auditoria? Onde ver?',
    content: `Os contratos RWA Protocol foram **auditados por terceiros**; os relatórios são públicos. **Auditores**: SlowMist e CertiK (e possivelmente outros); o projeto visa reauditar antes de alterações maiores. **Onde**: abrir a página **Segurança** ou **Auditoria** no site oficial. Encontrará nomes dos auditores, datas e ligações ou resumos dos relatórios. As auditorias reduzem o risco mas **não garantem** zero falhas; investir apenas o que pode perder.`,
  },
  'fund-safety': {
    title: 'O protocolo pode fazer "rug"? Como os fundos são garantidos?',
    content: `O protocolo é concebido para reduzir "rug" e risco de ponto único: **① Tesouraria multisig** (ex. tipo Gnosis Safe, 2-de-3). **② TimeLock** para alterações de parâmetros importantes (ex. 48 h). **③ Auditorias** (SlowMist, CertiK; relatórios na página Segurança). **④ Transparência on-chain**: endereços da tesouraria e contratos publicados. **⑤ Execução por contrato**: o seu USDT/RWA em staking vai **diretamente** para o contrato ou tesouraria; levantamentos e rendimento são executados pelo **contrato**. Estas medidas reduzem mas não eliminam o risco; investir apenas o que pode perder.`,
  },
  'site-or-wallet-stuck': {
    title: 'O site não carrega ou a carteira fica a conectar, o que fazer?',
    content: `Tentar por ordem: 1) **Rede**: outra ligação (mudar Wi‑Fi ou dados). 2) **Browser na app**: no telemóvel, abrir o site no browser **OKX** ou **Binance**. 3) **BSC**: a carteira deve estar em **BSC mainnet** (Chain ID: 56). 4) **Cache**: limpar cache e cookies do browser e recarregar. 5) **Browser**: Chrome/Brave costumam funcionar melhor. 6) **URL**: usar apenas o **domínio oficial** dos anúncios. Se ainda falhar, contactar o apoio com tipo de carteira, browser e captura.`,
  },
  'change-wallet-history': {
    title: 'Mudei de carteira/telemóvel, o meu stake antigo ainda está?',
    content: `**Sim.** Os stakes, o rendimento e o link de referência estão **on-chain** e ligados à sua **direção**, não ao dispositivo nem ao browser. Se usar a **mesma direção** (mesma frase seed / chave privada), verá tudo. **Novo telemóvel ou browser**: instalar a carteira, **restaurar** com a sua **frase seed ou chave privada** original e ligar ao site. **Nova carteira (nova direção)**: se **criou** uma carteira em vez de restaurar, é uma **direção diferente**; os stakes e recompensas da direção antiga ficam nessa direção; só essa direção (ou uma carteira restaurada com a sua seed) pode levantar e reclamar. Não pode "mover" stakes antigos para a nova direção.`,
  },
  'wallet-hacked-stake': {
    title: 'A minha carteira foi hackeada, e os fundos em staking?',
    content: `**Os fundos em staking não se movem sozinhos quando a carteira é hackeada; mas quem controlar a sua direção (seed/chave privada) pode levantar e reclamar.** Os fundos estão no **contrato**; o RWA levantável e o USDT reclamável estão sob **a sua direção**. O contrato normalmente **não** pode "transferir o stake do utilizador X para Y" nem "congelar uma direção". **Se a sua seed/chave vazou, considere os ativos expostos**; use uma carteira nova e deixe de usar a antiga. Para "mover" os ativos do contrato para segurança ainda tem de assinar com essa direção (levantar/reclamar para uma carteira nova).`,
  },
  'protocol-shutdown': {
    title: 'Se o protocolo encerrar, posso recuperar os meus fundos?',
    content: `**O contrato não desaparece**: o seu stake e rendimento levantável estão **na BSC**. Se o site ou a app caírem, o **contrato continua a executar**; em teoria pode **chamar o contrato** (ex. via BSCScan "Write Contract" + a sua carteira) para levantar e reclamar sem o frontend oficial. **Condições**: o contrato não deve estar em pausa permanente nem atualizado para inutilizável, e deve continuar a ter **a sua chave privada**. **Quanto pode recuperar** depende do **tipo de posição**: principal flexível e principal bloqueado vencido usam levantamento normal; apenas **USDT em bloqueio antes do vencimento** usa saída de emergência proporcional. Guardar **direção do contrato e ABI** para poder interagir via BSCScan se necessário.`,
  },
  'bsc-down-affect': {
    title: 'Se a BSC tiver problemas, isso afeta o meu rendimento?',
    content: `**Sim.** A liquidação, a distribuição e os levantamentos dependem de **BSC** produzir blocos e do contrato executar. Se a cadeia tiver indisponibilidade longa, fork, congestão forte ou incidente de segurança: **atraso na liquidação**; **não conseguir levantar/reclamar** (os fundos ficam no contrato até a cadeia voltar). **Resumo**: BSC é a camada base; o risco da cadeia afeta o rendimento e os levantamentos.`,
  },
  'where-history-stake': {
    title: 'Onde vejo o histórico dos meus stakes?',
    content: `**Painel**: após ligar, o **Painel** ou a página "Os meus ativos" mostra o stake total e a atividade recente. **BSCScan**: todos os stakes e levantamentos deixam **transações** na BSC. Abrir **bscscan.com**, pesquisar a sua **direção de carteira** e filtrar pelo contrato de staking para ver chamadas Stake/Withdraw e quando apostou quanto. **Leitura do contrato**: se se sentir à vontade com contratos, abrir o contrato de staking no BSCScan e usar "Read Contract" para funções de vista da sua direção. Para disputas ou montantes grandes, tomar **os registos on-chain no BSCScan** como referência.`,
  },
  'tvl-data-verify': {
    title: 'Onde posso verificar o TVL e os dados do protocolo?',
    content: `Se não confiar nos números do frontend, pode **verificar on-chain**: **TVL / stake total**: no BSCScan abrir o **contrato de staking** e verificar os seus saldos de tokens **USDT e RWA** (ou qualquer vista TVL interna). **Events**: na página do contrato ver **Events** (Stake, Withdraw) para contar stakes e volumes e comparar com "Dados do protocolo" ou estatísticas do site. **Terceiros**: se um site de dados DeFi (DeBank, DefiLlama, etc.) listar o protocolo, comparar o seu TVL e atividade on-chain com o site oficial. Os dados on-chain são a única fonte de verdade; o site e terceiros apenas agregam.`,
  },
  'treasury-address-public': {
    title: 'O endereço da tesouraria é público? Como ver o seu saldo?',
    content: `**Sim.** O **endereço da tesouraria** do protocolo é publicado (ex. em Governação / Segurança / Transparência), frequentemente um multisig tipo Gnosis Safe. **Como verificar**: no **BSCScan.com** pesquisar o **endereço da tesouraria**; verá os seus saldos de tokens (USDT, RWA, BNB, etc.) e o histórico de transferências. Não precisa do site oficial; qualquer um pode consultar. A tesouraria recebe 50% dos stakes dos utilizadores e 5% dos pools de lotaria; o endereço e saldo públicos ajudam a verificar que os fundos fluem como descrito.`,
  },
  'rwa-dynamic-sell-tax': {
    title: 'Imposto dinâmico sobre venda de RWA',
    content: `Ao **vender RWA num DEX** (ex. PancakeSwap) aplica-se um **imposto dinâmico de venda**. Compras e transferências normais não tributadas; endereços na whitelist isentos.

---

**1. Quando se aplica**

- **Apenas em vendas**: ao enviar RWA para o par DEX. Compras e transferências normais: sem imposto. Whitelist: sem limite.

---

**2. No máximo 1 venda por 24 h**

- Cada endereço não whitelist só pode completar 1 venda em 24 horas.

---

**3. Taxa**

**Taxa base** (dias médios de detenção, máx. 4%): &lt;30 dias 4%, 30–90 3%, 90–180 2%, ≥180 1%. **Total** no contrato atual = o seu **total USDT em stake** (totalStaked); não é o saldo RWA na carteira nem o RWA em stake. Sem USDT em stake, total=0: aplica-se só 4% base e não a penalidade acima de 30%.

**Penalidade por ratio de venda**: ratio = (esta venda ÷ total) × 100. Cada 1% acima de 30% adiciona 1% de taxa, sem teto. Repartição: Tesouraria 50%, queima 25%, fundo de liquidez 25%.

---

**4. O que é o «total» – exemplo (tem 1000 RWA, apostou 2000 RWA, lock 30 dias, 20 dias passados, vende 1000 RWA)**

**O que é o total** Total = o seu **total USDT em stake** no contrato (18 decimais). Não inclui saldo RWA na carteira nem RWA em stake. Só RWA em stake e nenhum USDT → total=0 → na venda só 4% base.

**O seu caso: 1000 RWA na carteira, 2000 RWA em stake, lock 30 dias e 20 passados, vende 1000 RWA**

- **A. Sem USDT em stake** Total=0 → só 4% base. **Taxa efetiva 4%**. Recebe 1000×(1−4%)=**960 RWA**.
- **B. Com 2000 USDT em stake (lock 30 dias, 20 passados)** Total=2000. 20 dias&lt;30 → base 4%. Ratio 1000÷2000×100=**50%**, 50%&gt;30% → penalidade 20%. **Taxa efetiva 4%+20%=24%**. Recebe 1000×(1−24%)=**760 RWA**.

**Só USDT**: 10.000 USDT em stake (30 dias, 20 passados). Vende 3.000 RWA → ratio 30%, sem penalidade, 4%. Vende 6.000 RWA → ratio 60%, penalidade 30%, taxa 34%.`,
  },
  'beginner-full-tutorial': {
    title: 'RWA Protocol · Guia completo de investimento para iniciantes',
    content: `Guia passo a passo para utilizadores sem experiência: desde descarregar a app do exchange até ao primeiro staking, levantamento e conversão em dinheiro.

---
## Índice

1. O que precisa
2. Passo 1: Registo no exchange
3. Passo 2: Verificação KYC
4. Passo 3: Comprar USDT
5. Passo 4: Usar a carteira (recomendado: carteira integrada do exchange)
6. Passo 5: Levantar USDT do exchange para a carteira
7. Passo 6: Aceder ao site do protocolo RWA e ligar a carteira
8. Passo 7: Fazer staking no protocolo
9. Passo 8: Levantamento e conversão em dinheiro
10. Perguntas frequentes e segurança

---
## 1. O que precisa

- **Telemóvel**: smartphone com internet (Android / iOS).
- **Documento de identidade**: para KYC do exchange e da carteira.
- **Conta / meio de pagamento**: para comprar USDT com fiat. Brasil: **PIX**, **cartão**, **PayPal**; Portugal/Europa: **cartão**, **PayPal**, **MB Way**, etc.
- **Rede**: Wi‑Fi ou 4G/5G estável recomendado.

**Termos**: **USDT** (stablecoin), **carteira** (recomendado: Web3 integrada OKX/Binance; MetaMask não é obrigatório), **BSC** (sempre escolher BSC BEP20 ao levantar e operar).

---
## 2. Passo 1: Registo no exchange

Instale a app **OKX** ou **Binance** pelo site ou loja de apps. Registe-se com o telemóvel, defina a palavra-passe e ative a autenticação em dois passos (2FA).

---
## 3. Passo 2: Verificação KYC

Na app: «Verificação de identidade» ou «KYC». Envie a foto do documento e faça a verificação facial. Após aprovação, poderá comprar e levantar.

---
## 4. Passo 3: Comprar USDT

**OKX**: Comprar / C2C → escolha USDT, método de pagamento (cartão, PIX, PayPal, etc.) e valor. **Binance**: Comprar / Compra rápida ou C2C → USDT. Confirme que depois pode levantar por **BSC (BEP20)**.

---
## 5. Passo 4: Usar a carteira

Recomendado: **carteira Web3 integrada na OKX ou Binance** (não precisa de MetaMask). Na app abra «Web3 Wallet» → crie ou recupere e guarde a frase secreta → mude a rede para **BSC** → anote o **endereço de depósito BSC** (0x…). Para levantamentos use este endereço e rede **BSC (BEP20)**.

---
## 6. Passo 5: Levantar USDT do exchange para a carteira

No exchange: **Ativos → Levantar**, moeda **USDT**, rede **BSC (BEP20)**. Cole o endereço BSC da sua carteira. Se precisar de **BNB** para gas, compre um pouco no exchange e levante para o mesmo endereço em BSC.

---
## 7. Passo 6: Aceder ao protocolo RWA e ligar a carteira

Abra o site oficial no browser ou, **a partir da app do exchange**, Descobrir → Browser DApp → cole o URL oficial. Ao ligar, escolha «OKX Wallet» ou «Binance Wallet» para vincular num passo. Confirme que está na **rede BSC (mainnet)**.

---
## 8. Passo 7: Fazer staking no protocolo

No site vá a «Staking» → escolha USDT ou RWA → introduza o valor (mín. ~100 USDT) e o período de lock → endereço do referido se tiver → aprove e confirme. Após confirmação on-chain, veja a posição e ganhos no dashboard.

---
## 9. Passo 8: Levantamento e conversão em dinheiro

Na página «Levantar» do protocolo, reclame RWA ou levante o principal (respeite cooldown e taxas) → se precisar de USDT, em «Swap» ou numa DEX troque RWA por USDT → envie USDT da carteira para o exchange em **BSC (BEP20)** → no exchange (C2C / Vender) venda USDT por **real**, **euro** ou outra fiat conforme a sua região.

**Pagamento / levantamento**: **PIX** (Brasil), **cartão**, **PayPal**, transferência bancária, etc.

---
## 10. Perguntas frequentes e segurança

Rede errada, falta de BNB, saldo que não aparece, transação pendente: ver FAQ no texto. **Segurança**: nunca partilhe a frase secreta nem a chave privada; use apenas links oficiais; teste com pouco; verifique sempre o endereço e a rede (BSC BEP20); invista apenas o que pode perder.

---
## Anexo: Lista de verificação

| Passo | Conteúdo | Feito |
|------|----------|-------|
| 1–8 | Registo, KYC, compra USDT, carteira, levantamento para carteira, ligação ao site, primeiro staking | ☐ |
| 9–12 | Levantar no protocolo, RWA→USDT, depósito no exchange, vender USDT por fiat | ☐ |

Versão do documento 1.1 | Siga a interface atual do protocolo e do seu exchange; consulte as últimas notícias para alterações.`,
  },
}
