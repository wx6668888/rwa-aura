/**
 * Base de conocimiento – Español (Knowledge base full content – Spanish)
 * Full Spanish translations for all 42 articles.
 */
export const contentEsFull: Record<string, { title: string; content: string }> = {
  'what-is-rwa': {
    title: '¿Qué es RWA Protocol?',
    content: `RWA Protocol es un protocolo de staking descentralizado en BNB Smart Chain (BSC).

**Qué puedes hacer**: Hacer staking de USDT o RWA para obtener rendimiento diario en RWA; si cumples las condiciones de nivel de nodo, cuando **los usuarios referidos hagan staking (depósito)**, también recibirás recompensas de referido en USDT según ese monto (ver "Nodos y referidos"). El protocolo usa un **modelo 50/50**: el 50% de lo apostado va al tesoro, el 50% al pool de recompensas comunitarias.

**Ejemplo**: Apostas 10.000 USDT → 5.000 al tesoro, 5.000 al pool; ganas rendimiento diario en RWA según tu stake efectivo. Si tienes referidos, cuando **apuesten**, recibes USDT según tu nivel.`,
  },
  'rwa-token-what': {
    title: '¿Qué es el token RWA? ¿Para qué sirve?',
    content: `**RWA** es el **token del protocolo** en BSC (ERC-20/BEP-20), usado para rendimiento, staking y funciones principales.

**Usos principales**:

| Uso | Descripción |
|-----|-------------|
| **Rendimiento diario** | Tras apostar USDT o RWA, el rendimiento se paga en **RWA** (ej. 0,8% base × multiplicador de bloqueo). Retira en la página de Retiro. |
| **Staking RWA** | Apuesta **RWA** para recibir stRWA y rendimiento diario; elige bloqueo (Flexible/30/90/180/365 días). Tras el bloqueo, desbloquea para recuperar RWA. |
| **Tickets de lotería** | En la página de Lotería, usa **RWA** para comprar tickets de los pools en tiempo real/semanal/mensual/anual. |
| **Swap** | En la página Swap, compra **RWA** con **USDT**; también puedes operar en DEX compatibles. |

**Cómo obtener RWA**: ① Comprar con USDT en la página Swap; ② Ganar por staking (pago en RWA); ③ Premios de lotería; ④ Comprar a otros usuarios o en DEX. El precio de RWA varía; invierte solo lo que puedas permitirte perder.`,
  },
  'how-to-start': {
    title: '¿Cómo empiezo? ¿Qué pasos sigo?',
    content: `**Cuatro pasos** para principiantes:

**① Obtén una wallet**  
Instala OKX, Binance o MetaMask, crea/importa una wallet Web3 y guarda la frase semilla.

**② Fondos en USDT**  
Envía USDT a la wallet en **BEP-20 (BSC)**. En retiro de Binance elige "BSC (BEP-20)" y la dirección BSC de tu wallet. Prueba primero con poco (100–200 USDT).

**③ Conectar**  
Abre el sitio de RWA Protocol, haz clic en "Conectar wallet", elige tu wallet y aprueba. Se mostrará tu dirección abreviada (ej. 0x1234…5678).

**④ Primer stake**  
Ve a Staking, introduce cantidad (**mín. 100 USDT equivalente**), elige período de bloqueo; si tienes referidor, introduce su dirección (solo una vez, el vínculo es permanente). Aprueba, luego apuesta y confirma. Espera la confirmación.

**Ejemplo**: Alice apuesta 500 USDT a 30 días con referidor A; tras confirmar, ella gana RWA diario y A recibe una vez la recompensa en USDT por esos 500 USDT apostados.`,
  },
  'supported-wallets': {
    title: '¿Qué wallets son compatibles?',
    content: `Todas las wallets **compatibles con BSC**, por ejemplo:

- **OKX Wallet** (app o extensión)
- **Binance Web3 Wallet** (en la app de Binance)
- **MetaMask** (extensión o app)
- **TokenPocket**, **Trust Wallet**, etc.
- Cualquier wallet con WalletConnect

**Consejo**: En móvil, abre el sitio en el **navegador integrado de OKX o Binance** para una conexión más estable.`,
  },
  'how-to-connect': {
    title: '¿Cómo conecto mi wallet?',
    content: `**Pasos**: Abre el sitio → clic en "Conectar wallet" (arriba derecha) → elige tu wallet (MetaMask, OKX, Binance, etc.) → en la ventana de la wallet haz clic en "Autorizar" o "Conectar" → aparecerá tu dirección (ej. 0x1234…5678).

**Importante**: Asegúrate de que la wallet esté en **red principal BSC** (Chain ID: 56). Si estás en Ethereum u otra red, el sitio mostrará "Red no soportada"; añade o cambia a BSC en la wallet y vuelve a conectar.`,
  },
  'what-is-gas': {
    title: '¿Qué es el Gas? ¿Por qué necesito BNB?',
    content: `**Gas** es la comisión para ejecutar una transacción en cadena. En BSC se paga en **BNB**, no en USDT ni RWA.

**Coste típico**: Un stake, un retiro o una aprobación suelen ser unos **0,001–0,003 BNB** (centavos). Si solo tienes USDT y no BNB, la transacción fallará por "Gas insuficiente".

**Consejo**: Mantén al menos **0,01–0,05 BNB** en la wallet para varias acciones (primera vez: aprobar + stake ≈ 0,004 BNB; cada retiro ≈ 0,001–0,003 BNB).`,
  },
  'how-to-get-usdt': {
    title: '¿Cómo obtengo USDT?',
    content: `Compra USDT en un **exchange centralizado** (Binance, OKX, Huobi, etc.) con fiat u otras monedas, luego **retira** a tu wallet en cadena.

**Clave**: Retira en **BEP-20 (BSC)** y usa la **dirección de recepción BSC** de tu wallet. Si usas ERC-20 (Ethereum) u otra red, los fondos no funcionarán en este sitio y la recuperación entre cadenas es compleja y arriesgada. **Ejemplo**: Tienes 1000 USDT en Binance; retira con red "BSC (BEP-20)", dirección = tu dirección BSC de MetaMask, cantidad 500; al llegar podrás hacer staking en RWA Protocol.`,
  },
  'withdraw-from-exchange': {
    title: '¿Cómo retiro del exchange a mi wallet?',
    content: `**Pasos** (exchange típico):

1. Inicia sesión, busca "Retirar" o "Retirar cripto".
2. Selecciona **USDT**.
3. Red: **BSC (BEP-20)** o "BNB Smart Chain" (debe ser BSC).
4. Destinatario: pega la **dirección BSC** de tu wallet (0x, 42 caracteres) desde MetaMask, etc.
5. Introduce cantidad, revisa comisión y neto, completa 2FA/verificación por email.

**Llegada**: Normalmente unos minutos. **Ejemplo**: Retiro de 500 USDT, comisión ~0,8–1 USDT, recibes ~499 USDT. Prueba primero con 100–200 USDT.`,
  },
  'choose-bsc-network': {
    title: '¿Cómo selecciono la red BSC?',
    content: `En tu wallet, añade o cambia a **red principal BSC**. Parámetros habituales:

- **Nombre de red**: BNB Smart Chain o BSC
- **Chain ID**: **56**
- **RPC URL**: En la documentación de BSC o lista por defecto de la wallet
- **Explorador**: https://bscscan.com

Este sitio solo soporta la red principal BSC. Si estás en Ethereum (Chain ID 1) u otra cadena, la página pedirá cambiar a BSC. En MetaMask: nombre de red arriba → Añadir red → introduce lo anterior; en la app OKX/Binance elige "Red principal BSC".`,
  },
  'min-deposit': {
    title: '¿Cuál es el depósito/stake mínimo?',
    content: `El mínimo por stake es **100 USDT equivalente**. Ya sea USDT o RWA, el sistema convierte a equivalente USDT al precio actual.

**Ejemplo**: USDT: mínimo 100 USDT. RWA: si RWA = 0,50 USD, necesitas al menos 100 ÷ 0,5 = **200 RWA**. Por debajo de 100 USDT equivalente no se puede enviar.`,
  },
  'what-is-staking': {
    title: '¿Qué es el staking?',
    content: `**Staking** es enviar USDT o RWA al contrato del protocolo para ganar "rendimiento diario en RWA" y (si aplica) "recompensas de referido/nodo en USDT".

**Dónde van los fondos**: Tu cantidad se reparte **50% tesoro, 50% pool comunitario**. No "recuperas" la parte del tesoro; recibes rendimiento en RWA con el tiempo según tu stake. Tras las reglas de **enfriamiento, mínimo de retiro y comisión**, puedes retirar en la página de Retiro.

**Ejemplo**: Apostas 2.000 USDT → 1.000 al tesoro, 1.000 al pool; ganas ~2.000×0,8% = 16 USDT equivalente en RWA al día (al precio de RWA de ese día) y luego puedes retirar RWA o reclamar USDT.`,
  },
  'usdt-vs-rwa-stake': {
    title: '¿Diferencia entre staking USDT y RWA?',
    content: `**Staking USDT**: Envías **USDT**; el contrato paga **RWA** como rendimiento diario (ej. 0,8% × multiplicador de bloqueo). Si tienes referidor y cumples reglas de nodo, ellos reciben recompensa en **USDT** por **cada uno de tus stakes** (no un % de tu rendimiento diario). Mismo reparto 50/50.

**Staking RWA**: Envías **RWA**; recibes **stRWA** y rendimiento diario en **RWA**. Puedes elegir **bloqueo** (30/90/180/365 días); tras el bloqueo, "Desbloquear stRWA" devuelve el principal en RWA. Mismo 50/50.

**Ejemplo**: 1.000 USDT flexible → ~8 USDT equivalente en RWA al día, sin principal bloqueado. 1.000 USDT equivalente en RWA con bloqueo 90 días → mayor rendimiento diario (ej. +60%) pero principal bloqueado 90 días, luego desbloquea a RWA.`,
  },
  'lock-period-and-yield': {
    title: '¿Qué períodos de bloqueo hay? ¿Cómo se multiplica el rendimiento?',
    content: `Opciones de bloqueo y bono (protocolo actual):

| Bloqueo | Bono vs flexible | Nota |
|---------|------------------|------|
| Flexible | Ninguno | El principal desbloqueado puede retirarse cuando quieras |
| 30 días | +30% | Principal bloqueado 30 días |
| 90 días | +60% | Principal bloqueado 90 días |
| 180 días | +100% | Principal bloqueado 180 días |
| 365 días | +150% | Principal bloqueado 365 días |

**Fórmula**: Rendimiento diario ≈ stake (USDT equivalente) × **0,8%** × (1 + bono de bloqueo), pagado en RWA al precio del día. **Ejemplo**: 10.000 USDT flexible → 80 USDT equivalente RWA/día. 10.000 USDT, bloqueo 180 días (+100%) → 160 USDT equivalente RWA/día; esos 10.000 stRWA no se pueden desbloquear hasta 180 días. Consulta la página de Staking y el contrato.`,
  },
  'daily-yield-calc': {
    title: '¿Cómo se calcula el rendimiento diario?',
    content: `**Rendimiento diario RWA ≈ tu stake (USDT equivalente) × 0,8% × multiplicador de bloqueo**

Pagado en RWA al **precio del día**. Multiplicador: flexible=1, 30d≈1,3, 90d≈1,6, 180d=2, 365d=2,5 (ver interfaz).

**Ejemplo**: Stake **5.000 USDT**, **bloqueo 90 días** (+60%), RWA = **1 USD**. Diario: 5.000 × 0,8% × 1,6 = 64 USDT equivalente → **64 RWA/día**. Si RWA = **0,50 USD**, entonces 64 ÷ 0,5 = **128 RWA/día**. Las recompensas de referido/nodo son en **USDT** y se reclaman aparte en la página de Retiro.`,
  },
  'when-rewards-arrive': {
    title: '¿Cuándo llegan las recompensas? ¿Cómo compruebo?',
    content: `**Liquidación**: Una vez al día a **UTC 0:00**; el retraso en cadena puede ser de minutos hasta **~2 horas**.

**Dónde ver**: **Panel** → "Actividad reciente": rendimiento diario. **Página Retiro**: "RWA retirable" y "USDT reclamable". **Ejemplo**: Apostaste el 5 de marzo; tras la liquidación del 6 de marzo UTC 0:00, sueles ver el rendimiento del 6 de marzo hacia las 8:00–10:00 (hora Pekín). Si a las 24 h no hay nada, confirma que no activaste retiro de emergencia y contacta soporte con tu dirección.`,
  },
  'how-to-withdraw-rwa': {
    title: '¿Cómo retiro el rendimiento en RWA?',
    content: `En la página **Retiro**, la tarjeta **Retirar RWA** muestra: **Rendimiento RWA liquidado** (de staking USDT y RWA); **Principal RWA desbloqueado** de staking RWA flexible (si aplica).

Clic en "Retirar" → confirma en la wallet y paga Gas (poco BNB). **Importante**: Si este retiro **incluye principal desbloqueado** (RWA que apostaste como "Flexible"), debes retirar **el importe disponible completo** (todo el rendimiento + todo el principal desbloqueado) de una vez. Usa MAX o escribe el total. Retirar solo rendimiento puede ser cualquier cantidad por encima del mínimo y fuera del enfriamiento. **Principal flexible**: Solo para staking **RWA** con bloqueo **Flexible**; el principal RWA desbloqueado puede retirarse cuando quieras desde la tarjeta de retiro RWA, **sin comisión ni enfriamiento 24 h**. Si tienes rendimiento y principal, debes retirar ambos en una transacción.`,
  },
  'withdraw-cooldown-fee': {
    title: '¿Cuál es el enfriamiento y la comisión de retiro?',
    content: `Reglas (protocolo actual):

| Concepto | Regla |
|----------|--------|
| Mín. retiro | Al menos **100** (según la ruta de retiro) |
| Enfriamiento | **24 horas** entre dos retiros de RWA; el botón muestra cuenta atrás |
| Comisión inmediata | **8%** fijo (3% recompra/quema, 3% tesorería, 2% fondo comunidad) |
| Modo stRWA | **0%** comisión, acuña **120%** en stRWA bloqueado 30 días |
| Gas | Poco BNB para BSC (≈ 0,001–0,003 BNB) |

**Ejemplo**: Retiras **100 RWA** de inmediato → recibes **92 RWA** (8% comisión). En modo stRWA: 0% comisión, **120 stRWA** bloqueado 30 días. Mínimo **100**.`,
  },
  'withdraw-arrival-time': {
    title: '¿Cuánto tarda en llegar mi retiro?',
    content: `Los retiros (RWA o USDT) y el cobro de recompensas USDT son **transacciones on-chain**. El tiempo de llegada depende de la confirmación en BSC y de la actualización de tu wallet.

**Caso normal**:
- **Confirmación on-chain**: BSC genera un bloque cada unos **3 segundos**. Una vez que tu retiro/cobro se incluye en un bloque, suele confirmarse en **segundos o en torno a un minuto**. Cuando el estado de la transacción es Success, el contrato ya ha enviado RWA o USDT a tu dirección; es decir, **ya ha llegado on-chain**.
- **Visualización en la wallet**: Algunas wallets tardan **unos segundos o decenas de segundos** en actualizar el saldo tras la confirmación. Puedes actualizar manualmente o esperar un momento. Si en BSCScan la transacción aparece como exitosa y el destinatario del Transfer es tu dirección, los activos ya están en tu dirección; suele ser solo un retraso de la interfaz.

**Cuándo puede tardar más**:
- **Congestión de red**: Si BSC tiene muchas transacciones, la inclusión en bloque puede retrasarse y la confirmación puede tardar **varios minutos**. Puedes usar "acelerar" en la wallet (más Gas) o esperar.
- **Gas insuficiente**: Si el Gas fue muy bajo, la transacción puede quedar mucho tiempo en Pending o fallar; hay que volver a enviar con Gas suficiente.

**Resumen**: En condiciones normales, el retiro/cobro **llega on-chain en torno a un minuto** después de que confirmes; el saldo en la wallet puede actualizarse unos segundos o decenas de segundos después. Si tras 2–3 minutos no hay registro, consulta el estado de la transacción en BSCScan por hash o por tu dirección; si aparece como exitosa pero el saldo en la wallet no ha cambiado, consulta "¿Qué hacer si el RWA no llegó tras el retiro?".`,
  },
  'what-is-strwa-unlock': {
    title: '¿Qué es desbloquear stRWA? ¿Cómo se hace?',
    content: `**stRWA** es el **recibo de staking** al apostar **RWA** con **bloqueo**. Durante el bloqueo no puedes retirar el principal; **tras el bloqueo**, en la página Retiro usa la tarjeta **Desbloquear stRWA** para convertir stRWA de nuevo en RWA.

**Pasos**: Página Retiro → "Desbloquear stRWA" → revisa cantidad y desbloqueo/enfriamiento (ej. 7 días desbloqueo, 3 días enfriamiento) → introduce cantidad, confirma, paga Gas. **Ejemplo**: Bloqueaste 2.000 RWA 90 días; tras vencer la página muestra "Desbloquear 2.000 stRWA". Confirmas; 2.000 RWA vuelven a tu wallet en minutos. Si el protocolo tiene retraso de 7 días, la recepción puede tardar 7 días; ver la página.`,
  },
  'claim-usdt-rewards': {
    title: '¿Cómo reclamo las recompensas de referido en USDT?',
    content: `Las recompensas de referido/nodo **están en USDT** en cadena. En la página Retiro, la tarjeta **Recompensas USDT** muestra el importe reclamable. Clic en "Reclamar" → confirma en la wallet y paga Gas; los USDT se envían a tu wallet.

**Nota**: Las recompensas se pagan cuando **los usuarios referidos hacen stake** (cada stake), según tu tasa de nivel sobre ese monto, no sobre su rendimiento diario. **Ejemplo**: Tu referido directo apuesta 1.000 USDT, tú eres L3 (8%) → recibes 1.000×8% = **80 USDT**; se suma a tu saldo reclamable; cada reclamación cuesta un poco de Gas en BNB.`,
  },
  'what-is-emergency-withdraw': {
    title: '¿Qué es el retiro de emergencia? ¿Consecuencias?',
    content: `**Retiro de emergencia** aplica solo a **posiciones USDT en bloqueo antes de vencimiento**. Se devuelve según **días completados** (días completados / total días de bloqueo), luego se deduce **8%** de comisión y recibes **USDT**. **Los RWA pendientes no se borran**; solo se cierra esa posición, de forma irreversible.

**Lógica**: Devolución = principal de esa posición × (días completados / total días de bloqueo), luego 8% (3% recompra/quema, 3% tesoro, 2% pool comunitario). Si el bloqueo ya venció, usa el retiro normal de principal. **Ejemplo**: Bloqueo 30 días, han pasado 3 → retiro de emergencia: 3/30 = 10% a liquidar, tras 8% comisión recibes USDT. **Usar solo cuando entiendas el riesgo y necesites salir antes.** Lee primero el aviso en la página.`,
  },
  'what-are-node-levels': {
    title: '¿Qué son los niveles de nodo? ¿Qué son L1–L9?',
    content: `Los niveles de nodo (**L1–L9**) son tu nivel en el sistema de referidos. Nivel más alto → **% de recompensa de referido** mayor cuando **los referidos apuestan**; L4+ puede unirse al **reparto de ingresos del protocolo**.

**Importante**: El "% de recompensa" en la tabla es sobre **el monto apostado por ese usuario**, no sobre su rendimiento diario 0,8% en RWA. Las recompensas de referido se **pagan una vez por stake**, no a diario. Tabla (ver página Nodos y referidos): L1 Quantum 3%, L2 Particle 5%, L3 Photon 8%, L4 Starship 12%, L5 Comet 17%, L6 Planet 23%, L7 Star 30%, L8 Nebula 35%, L9 Supernova 40%, con requisitos de stake de equipo y personal. **Ejemplo**: Eres L3 (8%); el referido directo A apuesta 1.000 USDT → recibes 80 USDT una vez. Si pasas a L4 (12%), el mismo A apuesta 1.000 de nuevo → recibes 120 USDT.`,
  },
  'what-is-referrer': {
    title: '¿Qué es un referidor? ¿Cómo se vincula?',
    content: `Tu **referidor** es la dirección de wallet que introduces en "Dirección del referidor" en tu **primer stake**. Ese vínculo es **permanente** tras confirmar el primer stake en cadena y **no se puede cambiar**.

Después, en **cada uno de tus stakes** tu referidor y sus superiores reciben recompensas de referido en USDT de **ese monto** según nivel y reglas de "compresión". En la página Nodos y referidos puedes ver tu enlace y estructura; al invitar, pídeles que **peguen tu dirección** en "Dirección del referidor" en la página Staking. **Referidor equivocado**: Una vez confirmado el primer stake, el referidor queda fijado y el contrato no permite cambiarlo. Si aún no has apostado, revisa bien antes del primer stake. Si ya está vinculado, no puede corregirse en cadena; confirma la dirección con tu referidor (ej. usa su enlace); para vínculos erróneos grandes, contacta soporte oficial.`,
  },
  'referral-reward-calc': {
    title: '¿Cómo se calculan las recompensas de referido?',
    content: `**Cuándo**: Solo cuando un **usuario referido hace stake**; el sistema usa **ese monto** y paga USDT a su referidor y superiores. **No** te paga un % de su rendimiento diario 0,8%.

**Cómo**: Base: **el stake de ese usuario** (USDT o RWA equivalente). Tasa: desde el referidor directo hacia arriba por **% de nivel de nodo**; con varios niveles, **compresión** (diferencia de nivel): cada nivel solo recibe "mi % menos lo que ya tomó el de abajo"; total a todos los superiores ≤ **50%** de ese stake. **Límite por stake**: La recompensa de cada referidor por un stake ≤ **50% del stake total de ese referidor**; el exceso no se paga. **Por qué menos de lo esperado**: La recompensa es solo sobre el monto apostado, no el rendimiento diario; límite 50% por stake; compresión (solo recibes la diferencia de nivel); referidor equivocado o sin vincular.`,
  },
  'how-to-upgrade-node': {
    title: '¿Cómo subo de nivel de nodo?',
    content: `El nivel lo asigna **automáticamente** el sistema según **stake total del equipo, estructura y tu stake personal**; no hay solicitud manual. Se actualiza tras actividad de referidos. **Ejemplo** (ver página Nodos): L1→L2: stake personal ≥ 500 USDT, equipo ≥ 5.000 USDT. L2→L3: personal ≥ 1.000, equipo ≥ 20.000. L4–L9 ver tabla. Revisa **nivel actual** y **requisitos del siguiente** en la página Nodos y referidos.`,
  },
  'lottery-rules': {
    title: '¿Cuáles son las reglas de la lotería?',
    content: `Los usuarios compran **tickets de lotería** con **RWA**. Los sorteos usan aleatoriedad en cadena (ej. **Chainlink VRF**); los resultados son públicos. **Fondos**: Al sortear un pool, **5%** del pool va al **tesoro**; el **95%** restante se reparte por nivel (1º 48%, 2º 24%, 3º 14%, 4º 9%). Si un nivel no tiene ganador, esa parte **pasa al siguiente sorteo** del mismo pool. **Ejemplo**: Pool semanal 10.000 USDT → 500 al tesoro; 4.800 al 1º, 2.400 al 2º, etc.; si no hay 1º, 4.800 pasan a la semana siguiente.`,
  },
  'four-pools-diff': {
    title: '¿Diferencia entre los cuatro pools (tiempo real/semanal/mensual/anual)?',
    content: `| Pool | Hora de sorteo | Nota |
|------|----------------|------|
| **Tiempo real** | Cada **5 min** (0:00, 0:05, 0:10 UTC) | Rápido, apuestas pequeñas |
| **Semanal** | **Lunes** **0:00 UTC** | Una vez por semana |
| **Mensual** | **Día 1** del mes **0:00 UTC** | Una vez al mes |
| **Anual** | **1 Ene** **0:00 UTC** | Una vez al año, pool mayor |

Todo en **UTC**. **Ejemplo**: 10 Mar 2026 14:35 UTC → próximo tiempo real 14:40 UTC; próximo semanal 17 Mar 0:00 UTC. Ver página Lotería.`,
  },
  'draw-time-utc': {
    title: '¿Cómo se fija la hora del sorteo? (UTC)',
    content: `Todos los pools sortean a **horas fijas en UTC** según el contrato: **Tiempo real**: cada 5 min (0:00, 0:05, 0:10 … UTC). **Semanal**: Lunes 00:00 UTC. **Mensual**: día 1 del mes 00:00 UTC. **Anual**: 1 Ene 00:00 UTC. Ver la página Lotería para horas exactas.`,
  },
  'buy-tickets-and-claim': {
    title: '¿Cómo compro tickets y reclamo premios?',
    content: `**Comprar**: En la página Lotería elige pool (tiempo real/semanal/mensual/anual), introduce **número de tickets**, paga en RWA y confirma. El precio puede variar por pool (ej. 10 RWA/semanal, 50 RWA/mensual); puede haber máximo por sorteo (ej. 100). **Reclamar**: Tras el sorteo, si ganas, busca "Reclamar" para ese pool, envía la tx y paga Gas; los premios se envían a tu wallet. Los tickets no premiados no se reembolsan; puedes participar en el siguiente. **Ejemplo**: Compras 5 tickets semanales por 50 RWA; si ganas 4º nivel recibes el 9% de ese pool en RWA/USDT y reclamas en la página.`,
  },
  'how-to-buy-rwa-with-usdt': {
    title: '¿Cómo compro RWA con USDT?',
    content: `En la página **Swap** elige **USDT → RWA**, introduce cantidad de USDT; la interfaz muestra RWA estimado (incl. deslizamiento/comisión). **Primera vez** debes **Aprobar** USDT para el contrato, luego clic en "Swap" y confirma; paga Gas y RWA se envía a tu wallet. **Ejemplo**: RWA ≈ 0,85 USD; introduces 850 USDT → ~1.000 RWA (algo menos por deslizamiento); tras aprobar + swap tienes ~1.000 RWA y 850 USDT menos.`,
  },
  'where-to-see-price': {
    title: '¿Dónde veo el precio de RWA?',
    content: `En la página **Mercado** puedes ver **precio, gráfico, cambio 24 h, volumen** de RWA. Los datos se agregan desde cadena o terceros y son **orientativos**; la ejecución real es en cadena y en la página Swap. Si el mínimo 24 h es 0,80 y el máximo 0,90, tu swap puede ejecutarse en ese rango; ver la página Swap para cotización exacta.`,
  },
  'protocol-fund-model': {
    title: '¿Cuál es el modelo de fondos del protocolo? (50/50)',
    content: `Al **apostar**, los fondos van **50% al tesoro, 50% al pool de recompensas comunitarias**. **Tesoro**: reserva, seguridad, largo plazo; no puedes recuperar la parte del tesoro en retiro ni retiro de emergencia. **Pool comunitario**: paga **rendimiento diario en RWA** y **recompensas de referido/nodo en USDT**. **Ejemplo**: 100 usuarios apuestan 10.000 USDT cada uno → 1.000.000 total; 500.000 al tesoro, 500.000 al pool. El rendimiento diario en RWA y USDT se paga desde el pool y las reglas; el tesoro no se devuelve a los usuarios.`,
  },
  'treasury-and-community-pool': {
    title: '¿Qué son el tesoro y el pool comunitario?',
    content: `**Tesoro**: Recibe **50%** de los fondos apostados; usado para reserva, operación, seguridad, ecosistema. También **5%** de cada pool de lotería. **Pool comunitario**: Recibe el otro **50%** de los fondos apostados; usado para pagar rendimiento RWA y recompensas USDT. **Ejemplo**: Stake 2.000 USDT → 1.000 al tesoro, 1.000 al pool. Pool de lotería 20.000 USDT → 1.000 (5%) al tesoro, 19.000 a ganadores o siguiente sorteo.`,
  },
  'lottery-5-percent-treasury': {
    title: '¿Qué significa "5% del pool de lotería al tesoro"?',
    content: `Cuando se **reparte** un pool de lotería, **5%** del pool se envía al **tesoro** del protocolo; el **95%** restante va a ganadores por nivel (o pasa al siguiente sorteo si un nivel no tiene ganador): 1º 48%, 2º 24%, 3º 14%, 4º 9%, Tesoro 5%. **Ejemplo**: Pool 50.000 USDT → 2.500 al tesoro; si no hay 1º, 4.800 pasan al siguiente sorteo de ese pool.`,
  },
  'avoid-phishing': {
    title: '¿Cómo evito sitios de phishing?',
    content: `- Usa **solo el dominio y enlaces oficiales**; no hagas clic en enlaces de SMS, email o grupos desconocidos. Antes de conectar, revisa la **barra de direcciones** para el dominio correcto. **Nunca** introduzcas frase semilla, clave privada o contraseña en páginas no oficiales; este sitio **nunca los pide**. Si tienes dudas, confirma la **URL oficial más reciente** por anuncios o comunidad.`,
  },
  'protect-private-key': {
    title: '¿Cómo guardo mi clave privada y frase semilla?',
    content: `Son la **única** forma de controlar tus activos; quien las tenga puede mover tus fondos. **Consejos**: No hagas capturas, no envíes por email/chat, no guardes en dispositivos conectados ni nube. Preferible **escribir en papel** y guardar en lugar seguro; considera una wallet hardware. Este sitio y el soporte real **nunca** piden frase semilla ni clave; quien lo haga es un estafador.`,
  },
  'tx-pending': {
    title: '¿Qué hago si mi transacción sigue pendiente?',
    content: `Suele deberse a **congestión de red**. Prueba: 1) **Esperar 10–30 min**; muchas tx se confirman solas. 2) En la wallet, busca la tx y usa "**Acelerar**" para reenviar con más Gas. 3) Si sigue pendiente tras 1 h, comprueba el estado en **BSCScan.com** con el **hash de la tx**. 4) Al contactar soporte, indica el **hash de la tx**. **Ejemplo**: Un retiro se queda colgado en MetaMask; copia el hash (0x…), búscalo en BSCScan para ver Pendiente o Fallida; si Pendiente, acelera en la wallet.`,
  },
  'rewards-not-arrived': {
    title: '¿Qué hago si no me han llegado las recompensas?',
    content: `El rendimiento se liquida cada día a **UTC 0:00**; la llegada puede retrasarse hasta **~2 horas**. Primero: 1) **Panel** → **Actividad reciente** para el rendimiento de ese día. 2) Confirma que no hiciste **retiro de emergencia** ni otras acciones que cambien el estado. 3) Si **pasadas 24 h** no hay registro, contacta soporte (Telegram, Discord, email) con **dirección de wallet**, **descripción**, **momento aproximado** (ej. "Aposté 5 Mar, esperaba rendimiento 6 Mar, no aparece"). **Ejemplo**: Apostaste 5 Mar, a las 10:00 del 6 Mar sigues sin rendimiento; revisa Actividad reciente por el 6 Mar; si está, puede ser solo retraso de la página Retiro; si no, contacta soporte con dirección y hora.`,
  },
  'contact-support': {
    title: '¿Cómo contacto con soporte?',
    content: `Usa **Telegram, Discord o email oficiales** (ej. rwacoin001@gmail.com). El soporte **nunca** pide frase semilla, clave privada ni contraseña. Al reportar un problema, incluye **dirección de wallet** (ej. 0x1234…5678), **qué pasó** y **hash de la tx** si hay. Ej.: "Wallet 0x1234…5678, retiré 100 RWA el 6 Mar, no recibido, TX: 0xabcd…".`,
  },
  'compare-pancake': {
    title: '¿En qué se diferencia RWA del farming de liquidez en PancakeSwap?',
    content: `**PancakeSwap**: Proporcionas **liquidez** (ej. par USDT–BNB), ganas **comisiones de trading + recompensas de farm**; puedes **retirar liquidez** y recuperar el principal (con riesgo de pérdida impermanente). **Staking en RWA Protocol**: Depositas **USDT o RWA** en el protocolo; ganas **rendimiento diario en RWA** (ej. 0,8% × bloqueo) y posible **USDT de referido/nodo**. El principal 50% tesoro, 50% pool. Solo **USDT en bloqueo antes de vencimiento** admiten **retiro de emergencia** (proporción días completados + 8% comisión, devolución en USDT, irreversible). Vencidos y flexibles usan retiro normal de principal. **Resumen**: Farming = liquidez + recompensas, retirable; staking RWA = rendimiento fijo + referidos, principal en parte irreversible; entiende las reglas antes de participar.`,
  },
  'compare-other-platforms': {
    title: '¿En qué se diferencia RWA de otras plataformas de staking de alto rendimiento?',
    content: `**Fuente de rendimiento**: RWA ofrece **rendimiento diario en RWA + USDT de referido/nodo** por bloqueo y nivel; otras pueden ser farming APY puro o productos duales con estructura y riesgo distintos. **Principal y salida**: RWA usa **50/50**. Solo USDT en bloqueo antes de vencimiento tienen retiro de emergencia (proporción días completados + 8% comisión, devolución USDT). Vencidos y flexibles usan retiro normal. Las plataformas que prometen "devolución total en cualquier momento" pueden ser rug pulls; RWA **describe explícitamente las vías de retiro del principal**. **Transparencia**: RWA tiene **tesoro multisig, TimeLock, auditorías terceras, TVL/tesoro en cadena**. Compara si otras plataformas tienen contrato abierto, auditorías públicas y fondos verificables en cadena. **Consejo**: No persigas "alto rendimiento" a ciegas; revisa si el principal es recuperable, de dónde viene el rendimiento y si hay auditorías y transparencia en cadena.`,
  },
  'referral-link-where': {
    title: '¿Dónde obtengo mi enlace de referido?',
    content: `En la página **Nodos y referidos** (en la navegación: "Nodos" / "Referidos") se muestra tu **enlace de referido** (URL del sitio + tu dirección o código). Copia y comparte; cuando alguien lo abra, la página Staking puede **rellenar tu dirección** en "Dirección del referidor" (si no, que la peguen). Si no lo encuentras, revisa la navegación superior o inferior para "Nodos", "Referidos" o "Mis referidos"; algunos productos también tienen "Obtener enlace de referido" en la página Staking.`,
  },
  'calculator-where': {
    title: '¿Dónde está la calculadora de rendimiento? ¿Cómo la uso?',
    content: `En la navegación abre **"Calculadora de rendimiento"** o **"Calculator"** (suele estar en "Análisis"). **Uso**: Introduce **cantidad a apostar**, **bloqueo** (Flexible/30/90/180/365 días), **nivel de nodo** (si quieres estimar referidos); la página muestra **rendimiento estimado diario/mensual/anual** en RWA y posibles recompensas USDT. **Solo orientativo**; no es una promesa en cadena. El rendimiento real depende de la cadena y el contrato. Úsala para comparar cantidades y períodos de bloqueo.`,
  },
  'principal-withdraw-guide': {
    title: '¿Cómo retiro el principal? ¿Flexible vs bloqueado?',
    content: `La página Retiro separa **retiro de rendimiento** y **retiro de principal**. El principal se gestiona en la sección **"Retiro de principal"**, no en la tarjeta de rendimiento RWA. **Cuatro tipos**: USDT flexible → sección Principal, USDT flexible, instantáneo **8%** comisión (3% recompra/quema, 3% Treasury, 2% comunidad). Mín. **100**. USDT bloqueo vencido → tras el bloqueo, en Principal selecciona la posición USDT bloqueada, instantáneo **8%**. Antes de vencimiento solo **retiro de emergencia**. RWA flexible → Principal, RWA flexible, **8%** comisión, mín. **100**. RWA bloqueo vencido → tras vencimiento: **instantáneo** (8%) o **modo stRWA** (**0%**, **120%** acuñado en stRWA bloqueado 30 días). Solo **USDT en bloqueo antes de vencimiento** usa retiro de emergencia.`,
  },
  'rewards-manual-claim': {
    title: '¿Las recompensas entran solas o debo reclamarlas?',
    content: `**Debes retirar/reclamar activamente; las recompensas no se envían solas a tu wallet.** RWA: el protocolo **liquida** cada día en tu saldo en contrato (rwaPending) pero **no lo envía** a la wallet. Abre la página **Retiro**, tarjeta **RWA**, introduce cantidad, Retirar y confirmar. USDT referido/nodo: igual **en cadena**, tarjeta **Recompensas USDT**; haz clic en **Reclamar** y confirma. **Resumen**: primero se liquida en cadena; tú **inicias retiro o reclamación** para que llegue a la wallet. Cada acción gasta un poco de BNB en Gas.`,
  },
  'withdraw-amount-mismatch': {
    title: '¿Por qué el RWA retirable no coincide con mi cálculo?',
    content: `Razones habituales: **cambio de precio RWA** y **unidades distintas** (valor vs cantidad). En cadena se guarda **cantidad** RWA; si calculas "0,8% diario × USDT apostado" obtienes equivalente USDT y al dividir por el precio RWA asumido puede no coincidir. El rendimiento se convirtió a RWA al precio **de entonces**; después el precio cambia. **Usa la cantidad retirable RWA** de la página o cadena como referencia. Retiros instantáneos **8%** comisión y mínimo **100**; la página puede mostrar bruto o neto.`,
  },
  'withdraw-not-received': {
    title: 'Retiro exitoso pero RWA no en la wallet, ¿cómo comprobar?',
    content: `Si la **transacción aparece exitosa** pero el saldo no cambió: 1) **Cadena y dirección**: que la wallet esté en **BSC mainnet** y que el saldo que miras sea de la **misma dirección** que usaste para retirar. 2) **Token visible**: si RWA no está "añadido" en la wallet, añade la **dirección del contrato RWA** (sitio o BSCScan). 3) **En cadena**: busca la tx de retiro en **BSCScan** por tu dirección; si estado Success y Transfer con tu dirección como receptor, los fondos están en cadena. 4) **Demora**: algunas wallets actualizan el saldo con retraso. 5) **Sigue mal**: guarda el **hash de la TX** y contacta soporte con "dirección + hash + hora aproximada".`,
  },
  'rwa-usdt-separate-claim': {
    title: '¿RWA y USDT se reclaman por separado?',
    content: `**Sí.** Son **dos acciones distintas**; cada una debe hacerse para que ese activo llegue a tu wallet. **RWA**: usa la tarjeta **Retiro RWA** en la página Retiro (rendimiento diario en RWA). **USDT**: usa la tarjeta **Recompensas USDT / Reclamar** (recompensas referido/nodo). Reclamar uno no dispara el otro. Si tienes ambos, **haz cada acción una vez**. Cada una gasta un poco de BNB en Gas.`,
  },
  'no-referrals-still-earn': {
    title: '¿Puedo ganar sin tener referidos?',
    content: `**Sí.** El rendimiento del protocolo tiene dos partes: **rendimiento estático** (no hace falta referidos) y **recompensas de referido** (sí hace falta). Mientras **tú** apuestes USDT o RWA, ganas **RWA diario** (ej. 0,8% base × multiplicador bloqueo). **No** depende de tener referidos ni rellenar referidor. Los **USDT** de referido/nodo solo los recibes cuando **usuarios referidos** apuestan con tu dirección como referidor. Sin referidos no hay esa parte USDT, pero tu **rendimiento estático RWA no cambia**. **Resumen**: sin referidos sigues ganando **RWA estático diario** por tu apuesta; los referidos son **ingreso USDT extra**.`,
  },
  'wrong-referrer-address': {
    title: 'Puse mal la dirección del referidor, ¿qué hago?',
    content: `**Cuando tu primera apuesta se confirma en cadena, el referidor queda ligado para siempre; el contrato no permite cambiar ni desvincular.** Si **aún no has apostado**: revisa "Dirección del referidor" antes de la primera apuesta (copia el 0x completo del referidor). Hasta que se confirme la primera apuesta no se escribe en cadena; puedes corregir y luego apostar. Si **ya apostaste y el referidor está fijado**: no se puede cambiar en cadena. Si pusiste otra dirección, tus recompensas de referido irán a esa dirección; si lo dejaste vacío o cero, no tienes referidor y no puedes añadirlo después. **Consejo**: confirma la dirección con tu referidor antes de la primera apuesta. El **contrato no puede cambiar el referidor**.`,
  },
  'node-level-downgrade': {
    title: '¿Por qué bajó mi nivel de nodo?',
    content: `El nivel de nodo se calcula **de forma dinámica** con tu apuesta de equipo y personal **actual** (y estructura), no es fijo. **Por qué puede bajar**: cuando baja la apuesta efectiva (referidos retiran, tú retiras principal) o dejas de cumplir el requisito del nivel actual, el sistema recalcula y puede asignar un nivel menor. **Efecto**: tras la bajada, las **nuevas** apuestas de referidos se recompensan al nuevo tipo (menor); lo ya pagado no se recupera. L4+ participan en reparto de ingresos; si bajas de L4 dejas de participar. **Cómo recuperar**: cuando equipo/personal vuelva a cumplir el requisito del nivel superior, se restaura. Revisa la página Nodos y referidos.`,
  },
  'direct-vs-indirect-referral': {
    title: '¿Diferencia entre referido directo e indirecto? ¿Cómo se reparte la recompensa?',
    content: `**Referido directo**: alguien que invitaste que **pone tu dirección** como referidor al apostar; recibes recompensa USDT de **esa apuesta** a tu tasa de nivel (ej. L3 = 8%). **Indirecto (multinivel)**: tu referido directo A invita a B; B apuesta con la dirección de A como referidor, así que B es tu referido **indirecto** (segundo nivel). Con varios niveles aplica **compresión**: desde el referidor directo hacia arriba, cada nivel solo recibe "mi % menos lo que ya tomaron los de abajo"; el total para todos los de arriba es como máximo **50%** de esa apuesta. **Ejemplo**: C tiene como referidor a ti (L3, 8%), tú a Alice (L5, 17%). C apuesta 10.000 USDT: tú 8% = 800 USDT, Alice 17%−8% = 9% = 900 USDT, total 1.700 USDT. Las recompensas se disparan **una vez por apuesta** por ese importe.`,
  },
  'same-wallet-multiple-referrers': {
    title: '¿Una wallet puede tener más de un referidor?',
    content: `**No.** Una dirección de wallet solo puede tener **un** referidor. Quien esté en "Dirección del referidor" cuando esa dirección hace su **primera apuesta confirmada** pasa a ser el referidor permanente. Si luego otro comparte un enlace de referido con ese usuario, **no** sustituye al referidor actual; el contrato no permite cambiar ni compartir la relación. Cada dirección tiene **un solo referidor, permanente**.`,
  },
  'what-is-approve': {
    title: '¿Qué es Approve? ¿Por qué dos transacciones?',
    content: `La primera vez que apuestas o haces swap, la wallet puede pedir una transacción **Approve**. Es normal y obligatoria en cadena; no es un cargo extra. **Approve** = permites que "este contrato gaste hasta X de este token". No mueve los tokens aún, solo fija un límite de gasto. La **segunda** transacción (Stake o Swap) es cuando el contrato mueve los tokens. **Por qué dos**: Primera Approve — permites usar tu USDT (o RWA), solo se escribe el límite, pagas un poco de Gas (BNB). Segunda Stake/Swap — al hacer clic el contrato mueve el importe dentro del límite aprobado. Por token y contrato basta **aprobar una vez** (o de nuevo cuando se agote).`,
  },
  'balance-insufficient-why': {
    title: 'Dice "saldo insuficiente" pero tengo USDT, ¿por qué?',
    content: `Comprueba en orden: 1) **Red equivocada**: el protocolo solo usa USDT en **BSC**. Si tu USDT está en Ethereum (ERC-20) u otra red, la página de apuesta lee el saldo BSC y puede mostrar 0. Solución: retira a BSC (BEP-20) o usa un puente. 2) **Wallet no está en BSC**: cambia a **BSC mainnet** (Chain ID: 56). 3) **Sin BNB para Gas**: apostar y aprobar cuesta **BNB**. Solución: ten un poco de BNB (ej. 0,01–0,05). 4) **Límite de aprobación bajo**: si aprobaste menos de lo que apuestas ahora, **vuelve a aprobar** (más cantidad o ilimitado) y luego apuesta. 5) **UI desactualizada**: tras depositar o cambiar de red, actualiza o reconecta la wallet. Si todo está bien y sigue fallando, verifica tu saldo USDT en BSC en BSCScan y contacta soporte con dirección, red y captura.`,
  },
  'can-cancel-stake': {
    title: '¿Puedo cancelar mi apuesta?',
    content: `**No.** El protocolo **no** admite "cancelar apuesta" ni "deshacer apuesta"; una vez confirmada en cadena queda activa. **Para sacar fondos** usa la salida que corresponda a tu **tipo de posición**: RWA con bloqueo → espera a que **termine el bloqueo**, luego en la página Retiro usa **desbloquear stRWA** para recuperar RWA. RWA flexible → el principal desbloqueado se puede retirar en la sección **Retiro de principal**. USDT: si es **flexible**, retira el principal USDT en la sección Principal. Si está **bloqueado**, espera al **vencimiento**; antes solo **retiro de emergencia** para esa posición USDT bloqueada (proporción días completados + 8% comisión). Solo el **USDT en bloqueo antes de vencimiento** usa retiro de emergencia.`,
  },
  'multiple-stakes': {
    title: '¿Puedo tener más de una apuesta?',
    content: `**Sí.** El protocolo permite **varias apuestas** desde la misma dirección con distintos períodos de bloqueo; se suman en apuesta total y rendimiento. Varios depósitos (ej. hoy 1.000 USDT y la semana que viene 2.000) cuentan. Tu **apuesta total** y **rendimiento diario** son la suma de todas las apuestas activas. Distintos bloqueos (ej. una de 30 días y otra de 90) coexisten; al vencer cada una, su stRWA o principal bloqueado se trata según esa apuesta. Puedes tener USDT (rendimiento RWA) y RWA (stRWA y rendimiento RWA); "RWA retirable" combina el rendimiento de ambas. Consulta el panel y la página Retiro.`,
  },
  'strwa-vs-rwa': {
    title: '¿Diferencia entre stRWA y RWA?',
    content: `**RWA** es el **token líquido** del protocolo: lo puedes tener, transferir, apostar o hacer swap en DEX o en la página Swap. **stRWA** es el **recibo de apuesta** al apostar **RWA con bloqueo** (ej. 30/90/180/365 días); representa el principal RWA bloqueado. **Durante el bloqueo**: tienes **stRWA**, no puedes enviarlo como RWA ni retirar principal; el contrato te paga **rendimiento RWA diario**. **Tras el bloqueo**: en la página Retiro usa **desbloquear stRWA** para convertir stRWA en **RWA**. RWA = token de uso libre; stRWA = recibo del principal bloqueado, se convierte en RWA al desbloquear.`,
  },
  'wrong-amount-sent-tx': {
    title: 'Envié la apuesta con cantidad equivocada, ¿puedo cancelar?',
    content: `**Una vez emitida la transacción no puedes "deshacerla" en cadena.** Si sigue **pendiente**, algunas wallets permiten "acelerar" o "cancelar" con otra tx (ej. más gas). Si está **confirmada**, la apuesta está activa; solo puedes salir según el tipo de posición (retiro de principal flexible, retiro de bloqueo vencido o retiro de emergencia para USDT bloqueado antes de vencimiento). **Consejo**: revisa cantidad y período de bloqueo antes de confirmar; considera una apuesta de prueba pequeña primero.`,
  },
  'transfer-stake-to-other': {
    title: '¿Puedo transferir mi apuesta a otra persona?',
    content: `**No.** Las apuestas están ligadas a **tu dirección de wallet**; el protocolo no permite "transferir apuesta a otra dirección". Tu apuesta, rendimiento retirable y USDT reclamable están en el contrato bajo **tu dirección**. No hay función para mover esa apuesta a otro usuario. Si quieres dar activos a otro, debes **retirar** cuando puedas (principal flexible, bloqueo vencido o emergencia para USDT bloqueado antes de vencimiento) a tu wallet y luego enviar los fondos o que ellos apuesten desde su dirección.`,
  },
  'swap-limits-slippage': {
    title: '¿Hay límites o deslizamiento en el swap?',
    content: `La página Swap muestra una **cantidad estimada de RWA** según el contrato y el pool; puede verse afectada por **deslizamiento** (el precio puede moverse entre que envías y se ejecuta la tx) y por **límites por tx o diarios** si el protocolo o contrato los tiene. Usa la **cuota en vivo** de la página Swap; para tamaños grandes, considera dividir o revisar la tolerancia al deslizamiento.`,
  },
  'sell-rwa-for-usdt': {
    title: '¿Puedo vender RWA por USDT?',
    content: `La página Swap del protocolo se centra en **USDT → RWA** (comprar RWA con USDT). Si **RWA → USDT** se ofrece en la misma página depende del sitio y los anuncios. Si está disponible, elige RWA→USDT en la página Swap, introduce cantidad y confirma (ten en cuenta deslizamiento y comisiones). Si no está en el protocolo, puedes operar RWA por USDT en **DEX o exchanges** que listen RWA; el protocolo también puede añadir RWA→USDT en la app más adelante — revisa las actualizaciones oficiales.`,
  },
  'audit-where': {
    title: '¿Hay auditoría? ¿Dónde verla?',
    content: `Los contratos del RWA Protocol han sido **auditados por terceros**; los informes son públicos. **Auditores**: SlowMist y CertiK (y posiblemente otros); el proyecto pretende reauditar antes de cambios importantes. **Dónde**: abre la página **Seguridad** o **Auditoría** en el sitio oficial (suele estar en la navegación). Verás nombres de auditores, fechas y enlaces o resúmenes. Los informes suelen cubrir alcance (apuestas, retiros, lotería), hallazgos y correcciones. Las auditorías reducen riesgo pero **no garantizan** cero fallos; solo invierte lo que puedas permitirte perder.`,
  },
  'fund-safety': {
    title: '¿Puede el protocolo hacer "rug"? ¿Cómo se asegura el dinero?',
    content: `El protocolo está pensado para reducir "rug" y riesgo de un solo punto: **① Tesoro multisig** (ej. estilo Gnosis Safe, 2-de-3). **② TimeLock** para cambios de parámetros importantes (ej. 48 h). **③ Auditorías** (SlowMist, CertiK; informes en la página Seguridad). **④ Transparencia en cadena**: direcciones del tesoro y contratos publicadas; cualquiera puede revisar saldos en un explorador BSC. **⑤ Ejecución por contrato**: tu USDT/RWA apostado entra **directo** en el contrato o tesoro según el contrato; retiros y rendimiento los ejecuta el **contrato**. Riesgo: estas medidas reducen pero no eliminan el riesgo (fallos, eventos extremos, ataques); solo invierte lo que puedas perder.`,
  },
  'site-or-wallet-stuck': {
    title: 'El sitio no carga o la wallet se queda conectando, ¿qué hago?',
    content: `Prueba en este orden: 1) **Red**: otra conexión (cambiar Wi‑Fi o datos). 2) **Navegador en app**: en móvil, abre el sitio dentro del navegador **OKX** o **Binance**; suele ser más estable. 3) **BSC**: que la wallet esté en **BSC mainnet** (Chain ID: 56). 4) **Caché**: borrar caché y cookies del navegador y recargar. 5) **Navegador**: Chrome/Brave suelen ir mejor; Safari puede dar problemas con Web3. 6) **URL**: usa solo el **dominio oficial** de los anuncios. Si sigue fallando, contacta soporte con tipo de wallet, navegador y captura.`,
  },
  'change-wallet-history': {
    title: 'Cambié de wallet/móvil, ¿sigue mi apuesta anterior?',
    content: `**Sí.** Las apuestas, el rendimiento y el enlace de referido están **en cadena** y ligados a tu **dirección**, no al dispositivo ni al navegador. Si usas la **misma dirección** (misma frase semilla / clave privada), lo verás todo. **Nuevo móvil o navegador**: instala la wallet, **restaura** con tu **frase semilla o clave privada** original y conecta al sitio; verás las mismas apuestas, RWA retirable, USDT reclamable y nivel de nodo. **Nueva wallet (nueva dirección)**: si creaste una wallet **nueva** en vez de restaurar, es **otra dirección**. Las apuestas y recompensas de la dirección antigua siguen en esa dirección; solo esa dirección (o una wallet restaurada con su semilla) puede retirar y reclamar. No puedes "mover" apuestas antiguas a la nueva dirección.`,
  },
  'wallet-hacked-stake': {
    title: 'Me hackearon la wallet, ¿qué pasa con lo apostado?',
    content: `**Los fondos apostados no se mueven solos al hackear la wallet; pero quien controle tu dirección (semilla/clave privada) puede retirar y reclamar.** Los fondos están en el **contrato**; el RWA retirable y el USDT reclamable están bajo **tu dirección**. Si el ladrón solo tomó lo que había en el saldo de la wallet, **no** puede tocar el saldo del contrato de tu dirección. Si tiene tu **semilla o clave privada**, puede conectarse como tú y **retirar RWA, reclamar USDT o retiro de emergencia** y enviar lo retirable a una dirección que controle. El contrato normalmente **no** puede "transferir la apuesta del usuario X al Y" ni "congelar una dirección". **Si tu semilla/clave se filtró, considera los activos expuestos**; usa una wallet nueva y deja de usar la antigua. Para "mover" lo del contrato a un lugar seguro aún debes firmar con esa dirección (retirar/reclamar a una wallet nueva).`,
  },
  'protocol-shutdown': {
    title: 'Si el protocolo cierra, ¿puedo recuperar mis fondos?',
    content: `**El contrato no desaparece**: tu apuesta y rendimiento retirable están **en BSC**. Si la web o la app caen, el **contrato sigue ejecutándose**; en teoría puedes **llamar al contrato** (ej. vía BSCScan "Write Contract" + tu wallet) para retirar y reclamar sin el frontend oficial. **Condiciones**: el contrato no debe estar en pausa permanente ni actualizado a no usable, y debes seguir teniendo **tu clave privada**. **Cuánto puedes sacar** depende del **tipo de posición**: principal flexible y principal bloqueado vencido usan retiro normal; solo **USDT en bloqueo antes de vencimiento** usa salida de emergencia proporcional. Guarda **dirección del contrato y ABI** por si necesitas interactuar vía BSCScan.`,
  },
  'bsc-down-affect': {
    title: 'Si BSC falla, ¿afecta a mi rendimiento?',
    content: `**Sí.** La liquidación, el reparto y los retiros dependen de que **BSC** produzca bloques y el contrato se ejecute. Si la red tiene parada larga, fork, mucha congestión o un incidente de seguridad: **retraso en liquidación** (el rendimiento diario se dispara a una hora fija; si BSC está mal, puede retrasarse o saltarse); **no poder retirar/reclamar** (hace falta enviar una transacción; si la red se para o el RPC cae, los fondos se quedan en el contrato hasta que vuelva). En un caso extremo (fallo irreversible de BSC), el estado del contrato y los activos dependerían de BSC y la comunidad. **Resumen**: BSC es la capa base; el riesgo de la red afecta al rendimiento y a los retiros.`,
  },
  'where-history-stake': {
    title: '¿Dónde veo el historial de mis apuestas?',
    content: `**Panel**: tras conectar, el **Panel** o la página "Mis activos" muestra la apuesta total y la actividad reciente; algunos productos muestran lista o línea temporal de apuestas. **BSCScan**: todas las apuestas y retiros dejan **transacciones** en BSC. Abre **bscscan.com**, busca tu **dirección de wallet** y filtra por el contrato de apuestas para ver llamadas Stake/Withdraw y cuándo apostaste cuánto. **Lectura del contrato**: si te manejas con contratos, abre el contrato de apuestas en BSCScan y usa "Read Contract" para las funciones de vista de tu dirección. Para disputas o cantidades grandes, toma **los registros en cadena en BSCScan** como referencia; el frontend puede ir retrasado o agregar distinto.`,
  },
  'tvl-data-verify': {
    title: '¿Dónde puedo verificar el TVL y los datos del protocolo?',
    content: `Si no te fías de las cifras del frontend, puedes **verificar en cadena**: **TVL / apuesta total**: en BSCScan abre el **contrato de apuestas** y revisa sus saldos de tokens **USDT y RWA** (o cualquier vista interna de TVL). **Eventos**: en la página del contrato revisa **Events** (Stake, Withdraw) para contar apuestas y volúmenes y comparar con "Datos del protocolo" o estadísticas del sitio. **Terceros**: si un sitio de datos DeFi (DeBank, DefiLlama, etc.) incluye el protocolo, compara su TVL y actividad en cadena con el sitio oficial. Los datos en cadena son la única fuente de verdad; el sitio y terceros solo los agregan.`,
  },
  'treasury-address-public': {
    title: '¿La dirección del tesoro es pública? ¿Cómo ver su saldo?',
    content: `**Sí.** La **dirección del tesoro** del protocolo se publica (ej. en Gobernanza / Seguridad / Transparencia), a menudo un multisig tipo Gnosis Safe. **Cómo verla**: en **BSCScan.com** busca la **dirección del tesoro**; verás sus saldos de tokens (USDT, RWA, BNB, etc.) y el historial de transferencias. No hace falta usar el sitio oficial; cualquiera puede consultar. El tesoro recibe el 50% de las apuestas de usuarios y el 5% de los pools de lotería; la dirección y el saldo públicos ayudan a comprobar que los fondos fluyen como se describe.`,
  },
  'rwa-dynamic-sell-tax': {
    title: 'Impuesto dinámico por venta de RWA',
    content: `Al **vender RWA en un DEX** (ej. PancakeSwap) se aplica un **impuesto dinámico de venta**. Compras y transferencias normales no tributan; direcciones en whitelist están exentas.

---

**1. Cuándo se aplica**

- **Solo en ventas**: al enviar RWA a la dirección del par DEX. Compras y transferencias normales: sin impuesto. Whitelist: sin límite.

---

**2. Máximo 1 venta cada 24 h**

- Cada dirección no whitelist solo puede completar 1 venta en 24 horas.

---

**3. Tipo impositivo**

**Tipo base** (días medios de tenencia, máx. 4%): &lt;30 días 4%, 30–90 3%, 90–180 2%, ≥180 1%. **Total** en el contrato actual = su **total USDT apostado** (totalStaked); no es el saldo RWA en wallet ni el RWA apostado. Sin USDT apostado, total=0: solo se aplica el 4% base y no la penalización por encima del 30%.

**Penalización por ratio de venta**: ratio = (esta venta ÷ total) × 100. Por cada 1% por encima del 30% se suma 1% de tipo, sin tope. Reparto: Tesoro 50%, quema 25%, fondo de liquidez 25%.

---

**4. Qué es el «total» – ejemplo (tienes 1000 RWA, apostaste 2000 RWA, lock 30 días, 20 días pasados, vendes 1000 RWA)**

**Qué es el total** Total = su **total USDT apostado** en el contrato (18 decimales). No incluye saldo RWA en wallet ni RWA apostado. Solo RWA apostado y ningún USDT → total=0 → al vender solo 4% base.

**Tu caso: 1000 RWA en wallet, 2000 RWA apostados, lock 30 días y 20 días pasados, vendes 1000 RWA**

- **A. Sin USDT apostado** Total=0 → solo 4% base. **Tipo efectivo 4%**. Recibes 1000×(1−4%)=**960 RWA**.
- **B. Con 2000 USDT apostados (lock 30 días, 20 días pasados)** Total=2000. 20 días&lt;30 → base 4%. Ratio 1000÷2000×100=**50%**, 50%&gt;30% → penalización 20%. **Tipo efectivo 4%+20%=24%**. Recibes 1000×(1−24%)=**760 RWA**.

**Solo USDT**: 10.000 USDT apostados (30 días, 20 pasados). Vende 3.000 RWA → ratio 30%, sin penalización, 4%. Vende 6.000 RWA → ratio 60%, penalización 30%, tipo 34%.`,
  },
  'beginner-full-tutorial': {
    title: 'RWA Protocol · Guía completa de inversión para principiantes',
    content: `Guía paso a paso para usuarios sin experiencia: desde descargar la app del exchange hasta el primer staking, retiro y conversión a efectivo.

---
## Índice

1. Qué necesitas
2. Paso 1: Registro en el exchange
3. Paso 2: Verificación KYC
4. Paso 3: Comprar USDT
5. Paso 4: Usar la wallet (recomendado: wallet integrada del exchange)
6. Paso 5: Retirar USDT del exchange a la wallet
7. Paso 6: Acceder al sitio del protocolo RWA y conectar la wallet
8. Paso 7: Hacer staking en el protocolo
9. Paso 8: Retiro y conversión a efectivo
10. Preguntas frecuentes y seguridad

---
## 1. Qué necesitas

- **Móvil**: smartphone con internet (Android / iOS).
- **Documento de identidad**: para KYC del exchange y la wallet.
- **Cuenta / medio de pago**: para comprar USDT con fiat. Por región: **tarjeta**, **PayPal**, **Mercado Pago** (LATAM), transferencia bancaria, etc.
- **Red**: Wi‑Fi o 4G/5G estable recomendado.

**Términos**: **USDT** (stablecoin), **wallet** (recomendado: Web3 integrada en OKX/Binance; MetaMask no es obligatorio), **BSC** (siempre elegir BSC BEP20 al retirar y operar).

---
## 2. Paso 1: Registro en el exchange

Instala la app de **OKX** o **Binance** desde su web o tienda de apps. Regístrate con tu teléfono, define contraseña y activa la autenticación en dos pasos (2FA).

---
## 3. Paso 2: Verificación KYC

En la app, ve a «Verificación de identidad» o «KYC». Sube foto del DNI y haz la verificación facial. Tras la aprobación podrás comprar y retirar.

---
## 4. Paso 3: Comprar USDT

**OKX**: Comprar / C2C → elige USDT, método de pago (tarjeta, PayPal, etc.) y cantidad. **Binance**: Comprar / Compra rápida o C2C → USDT. Asegúrate de poder retirar por **BSC (BEP20)** después.

---
## 5. Paso 4: Usar la wallet

Recomendado: **wallet Web3 integrada en OKX o Binance** (no hace falta MetaMask). En la app abre «Web3 Wallet» → crea o recupera y guarda la frase secreta → cambia la red a **BSC** → anota tu **dirección de depósito BSC** (0x…). Para retiros usa esta dirección y red **BSC (BEP20)**.

---
## 6. Paso 5: Retirar USDT del exchange a la wallet

En el exchange: **Activos → Retirar**, moneda **USDT**, red **BSC (BEP20)**. Pega la dirección BSC de tu wallet. Si hace falta **BNB** para gas, compra un poco en el exchange y retíralo a la misma dirección por BSC.

---
## 7. Paso 6: Acceder al protocolo RWA y conectar la wallet

Abre el sitio oficial en el navegador o, **desde la app del exchange**, Descubrir → Navegador DApp → pega la URL oficial. Al conectar, elige «OKX Wallet» o «Binance Wallet» para vincular en un paso. Comprueba que estás en **red BSC (mainnet)**.

---
## 8. Paso 7: Hacer staking en el protocolo

En el sitio ve a «Staking» → elige USDT o RWA → introduce cantidad (mín. ~100 USDT) y período de bloqueo → si tienes referido, su dirección → aprueba y confirma. Tras la confirmación on-chain, revisa posición y ganancias en el dashboard.

---
## 9. Paso 8: Retiro y conversión a efectivo

En «Retirar» del protocolo, reclama RWA o retira principal (respeta cooldown y comisiones) → si necesitas USDT, en «Swap» o en un DEX cambia RWA por USDT → envía USDT de tu wallet al exchange por **BSC (BEP20)** → en el exchange (C2C / Vender) vende USDT por **euro, dólar, peso** u otra fiat según tu región.

**Pago / retiro**: según tu país: **tarjeta**, **PayPal**, **Mercado Pago**, transferencia bancaria, etc.

---
## 10. Preguntas frecuentes y seguridad

Red equivocada, falta de BNB, saldo que no aparece, transacción pendiente: ver FAQ en el texto. **Seguridad**: nunca compartas frase secreta ni clave privada; usa solo enlaces oficiales; prueba con poco; verifica siempre dirección y red (BSC BEP20); invierte solo lo que puedas permitirte perder.

---
## Apéndice: Lista de comprobación

| Paso | Contenido | Hecho |
|------|-----------|-------|
| 1–8 | Registro, KYC, compra USDT, wallet, retiro a wallet, conectar al sitio, primer staking | ☐ |
| 9–12 | Retirar en protocolo, RWA→USDT, depósito en exchange, vender USDT por fiat | ☐ |

Versión del documento 1.1 | Sigue la interfaz actual del protocolo y de tu exchange; consulta las últimas noticias para cambios.`,
  },
}
