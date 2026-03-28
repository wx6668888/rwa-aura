/**
 * Base de connaissances – Français (Knowledge base full content – French)
 */
export const contentFrFull: Record<string, { title: string; content: string }> = {
  'what-is-rwa': {
    title: 'Qu’est-ce que le protocole RWA ?',
    content: `RWA Protocol est un protocole de staking décentralisé sur BNB Smart Chain (BSC).

**Ce que vous pouvez faire** : Staker des USDT ou du RWA pour obtenir un rendement quotidien en RWA ; si vous remplissez les conditions de niveau de nœud, lorsque **les utilisateurs parrainés stakent (dépôt)**, vous recevez aussi des récompenses de parrainage en USDT selon ce montant (voir « Nœuds et parrainages »). Le protocole utilise un **modèle 50/50** : 50 % des fonds stakés vont au trésor, 50 % au pool de récompenses communautaires.

**Exemple** : Vous stakez 10 000 USDT → 5 000 au trésor, 5 000 au pool ; vous gagnez un rendement quotidien en RWA sur votre stake effectif. Si vous avez des filleuls, quand ils **stakent**, vous gagnez des USDT selon votre niveau.`,
  },
  'rwa-token-what': {
    title: 'Qu’est-ce que le token RWA ? À quoi sert-il ?',
    content: `**RWA** est le **token du protocole** sur BSC (ERC-20/BEP-20), utilisé pour le rendement, le staking et les fonctionnalités clés.

**Usages principaux** :

| Usage | Description |
|-------|-------------|
| **Rendement quotidien** | Après avoir staké USDT ou RWA, le rendement est payé en **RWA** (ex. 0,8 % base × multiplicateur de blocage). Retrait sur la page Retrait. |
| **Staking RWA** | Staker **RWA** pour recevoir stRWA et rendement quotidien ; choisir le blocage (Flexible/30/90/180/365 jours). Après le blocage, débloquer pour récupérer le RWA. |
| **Tickets de loterie** | Sur la page Loterie, utiliser **RWA** pour acheter des tickets (pools temps réel/semaine/mois/an). |
| **Swap** | Sur la page Swap, acheter **RWA** avec **USDT** ; vous pouvez aussi trader le RWA sur les DEX supportés. |

**Comment obtenir du RWA** : ① Acheter avec USDT sur la page Swap ; ② Gagner via le staking (payé en RWA) ; ③ Gains à la loterie ; ④ Acheter à d’autres utilisateurs ou sur un DEX. Le prix du RWA varie ; n’investissez que ce que vous pouvez vous permettre de perdre.`,
  },
  'how-to-start': {
    title: 'Comment commencer ? Quelles étapes ?',
    content: `**Quatre étapes** pour les débutants :

**① Obtenir un portefeuille**  
Installer OKX, l’app Binance ou MetaMask, créer/importer un portefeuille Web3 et sauvegarder la phrase de récupération.

**② Financer en USDT**  
Envoyer des USDT au portefeuille en **BEP-20 (BSC)**. Sur le retrait Binance, choisir « BSC (BEP-20) » et l’adresse BSC de votre portefeuille. Tester d’abord avec un petit montant (100–200 USDT).

**③ Se connecter**  
Ouvrir le site RWA Protocol, cliquer sur « Connecter le portefeuille », choisir votre portefeuille et approuver. Votre adresse raccourcie (ex. 0x1234…5678) s’affichera.

**④ Premier stake**  
Aller sur Staking, saisir le montant (**min. 100 USDT équivalent**), choisir la durée de blocage ; si vous avez un parrain, saisir son adresse (une seule fois, le lien est permanent). Approuver, puis staker et confirmer. Attendre la confirmation.

**Exemple** : Alice stake 500 USDT avec blocage 30 jours et parrain A ; après confirmation elle gagne du RWA quotidien et A reçoit une fois la récompense USDT de parrainage sur ce stake de 500 USDT.`,
  },
  'supported-wallets': {
    title: 'Quels portefeuilles sont supportés ?',
    content: `Tous les portefeuilles **compatibles BSC**, par ex. :

- **OKX Wallet** (app ou extension)
- **Binance Web3 Wallet** (dans l’app Binance)
- **MetaMask** (extension ou app)
- **TokenPocket**, **Trust Wallet**, etc.
- Tout portefeuille WalletConnect

**Conseil** : Sur mobile, ouvrir le site dans le **navigateur intégré OKX ou Binance** pour une connexion plus stable.`,
  },
  'how-to-connect': {
    title: 'Comment connecter mon portefeuille ?',
    content: `**Étapes** : Ouvrir le site → cliquer sur « Connecter le portefeuille » (en haut à droite) → choisir votre portefeuille (MetaMask, OKX, Binance, etc.) → dans la fenêtre du portefeuille cliquer sur « Autoriser » ou « Connecter » → votre adresse (ex. 0x1234…5678) s’affichera.

**Important** : Vérifier que le portefeuille est sur le **réseau principal BSC** (Chain ID : 56). Si vous êtes sur Ethereum ou un autre réseau, le site affichera « Réseau non supporté » ; ajouter ou passer à BSC dans le portefeuille, puis se connecter.`,
  },
  'what-is-gas': {
    title: 'Qu’est-ce que le Gas ? Pourquoi ai-je besoin de BNB ?',
    content: `Le **Gas** est les frais pour exécuter une transaction on-chain. Sur BSC vous payez en **BNB**, pas en USDT ni RWA.

**Coût typique** : Un stake, un retrait ou une approbation coûtent environ **0,001–0,003 BNB** (quelques centimes). Si vous n’avez que des USDT et pas de BNB, la transaction échouera avec « Gas insuffisant ».

**Conseil** : Garder au moins **0,01–0,05 BNB** dans le portefeuille pour plusieurs actions (ex. première fois : approbation + stake ≈ 0,004 BNB ; chaque retrait ≈ 0,001–0,003 BNB).`,
  },
  'how-to-get-usdt': {
    title: 'Comment obtenir des USDT ?',
    content: `Acheter des USDT sur un **exchange centralisé** (Binance, OKX, Huobi, etc.) en fiat ou autres crypto, puis **retirer** vers votre portefeuille on-chain.

**Crucial** : Retirer en **BEP-20 (BSC)** et utiliser l’**adresse de réception BSC** de votre portefeuille. Si vous utilisez ERC-20 (Ethereum) ou un autre réseau, les fonds ne fonctionneront pas sur ce site et la récupération cross-chain est complexe et risquée. **Exemple** : Vous avez 1000 USDT sur Binance ; retirer avec le réseau « BSC (BEP-20) », adresse = votre adresse BSC MetaMask, montant 500 ; après réception vous pourrez staker sur RWA Protocol.`,
  },
  'withdraw-from-exchange': {
    title: 'Comment retirer d’un exchange vers mon portefeuille ?',
    content: `**Étapes** (exchange typique) :

1. Se connecter, trouver « Retrait » ou « Retirer crypto ».
2. Sélectionner **USDT**.
3. Réseau : **BSC (BEP-20)** ou « BNB Smart Chain » (doit être BSC).
4. Destinataire : coller l’**adresse BSC** de votre portefeuille (0x, 42 caractères) depuis MetaMask, etc.
5. Saisir le montant, vérifier les frais et le net, compléter la 2FA/vérification email.

**Arrivée** : En général quelques minutes. **Exemple** : Retrait de 500 USDT, frais ~0,8–1 USDT, vous recevez ~499 USDT. Tester d’abord avec 100–200 USDT.`,
  },
  'choose-bsc-network': {
    title: 'Comment sélectionner le réseau BSC ?',
    content: `Dans votre portefeuille, ajouter ou passer au **réseau principal BSC**. Paramètres courants :

- **Nom du réseau** : BNB Smart Chain ou BSC
- **Chain ID** : **56**
- **RPC URL** : Documentation BSC ou liste par défaut du portefeuille
- **Explorateur** : https://bscscan.com

Ce site ne supporte que le réseau principal BSC. Si vous êtes sur Ethereum (Chain ID 1) ou une autre chaîne, la page vous demandera de passer à BSC. Dans MetaMask : nom du réseau en haut → Ajouter un réseau → saisir les paramètres ; dans l’app OKX/Binance choisir « Réseau principal BSC ».`,
  },
  'min-deposit': {
    title: 'Quel est le dépôt/stake minimum ?',
    content: `Le minimum par stake est **100 USDT équivalent**. Que vous stakiez des USDT ou du RWA, le système convertit en équivalent USDT au prix actuel.

**Exemple** : USDT : minimum 100 USDT. RWA : si RWA = 0,50 USD, il faut au moins 100 ÷ 0,5 = **200 RWA**. En dessous de 100 USDT équivalent, l’envoi est impossible.`,
  },
  'what-is-staking': {
    title: 'Qu’est-ce que le staking ?',
    content: `Le **staking** consiste à envoyer des USDT ou du RWA au contrat du protocole pour gagner un « rendement quotidien en RWA » et (si éligible) des « récompenses USDT de parrainage/nœud ».

**Où vont les fonds** : Votre montant est réparti **50 % trésor, 50 % pool communautaire**. Vous ne « récupérez » pas la part trésor ; vous recevez du rendement RWA dans le temps via votre stake. Après les règles de **délai, minimum de retrait et frais**, vous pouvez retirer sur la page Retrait.

**Exemple** : Vous stakez 2 000 USDT → 1 000 au trésor, 1 000 au pool ; vous gagnez ~2 000×0,8 % = 16 USDT équivalent en RWA par jour (au prix RWA du jour) et pourrez plus tard retirer du RWA ou réclamer des USDT.`,
  },
  'usdt-vs-rwa-stake': {
    title: 'Différence entre staking USDT et RWA ?',
    content: `**Staking USDT** : Vous envoyez des **USDT** ; le contrat paie du **RWA** comme rendement quotidien (ex. 0,8 % × multiplicateur de blocage). Si vous avez un parrain et remplissez les règles de nœud, il reçoit une récompense **USDT** de parrainage sur **chaque stake** (pas un prélèvement sur votre rendement quotidien). Même répartition 50/50.

**Staking RWA** : Vous envoyez du **RWA** ; vous recevez **stRWA** et un rendement quotidien en **RWA**. Vous pouvez choisir un **blocage** (30/90/180/365 jours) ; après le blocage, « Débloquer stRWA » renvoie le principal en RWA. Même 50/50.

**Exemple** : 1 000 USDT en flexible → ~8 USDT équivalent RWA/jour, pas de principal bloqué. 1 000 USDT équivalent en RWA avec blocage 90 jours → rendement quotidien plus élevé (ex. +60 %) mais principal bloqué 90 jours, puis déblocage en RWA.`,
  },
  'lock-period-and-yield': {
    title: 'Quelles périodes de blocage ? Comment le rendement est-il multiplié ?',
    content: `Options de blocage et bonus (protocole actuel) :

| Blocage | Bonus vs flexible | Note |
|---------|-------------------|------|
| Flexible | Aucun | Le principal débloqué peut être retiré à tout moment |
| 30 jours | +30 % | Principal bloqué 30 jours |
| 90 jours | +60 % | Principal bloqué 90 jours |
| 180 jours | +100 % | Principal bloqué 180 jours |
| 365 jours | +150 % | Principal bloqué 365 jours |

**Formule** : Rendement quotidien ≈ stake (USDT équivalent) × **0,8 %** × (1 + bonus de blocage), payé en RWA au prix du jour. **Exemple** : 10 000 USDT en flexible → 80 USDT équivalent RWA/jour. 10 000 USDT, blocage 180 jours (+100 %) → 160 USDT équivalent RWA/jour ; ces 10 000 stRWA ne peuvent pas être débloqués avant 180 jours. Voir la page Staking et le contrat.`,
  },
  'daily-yield-calc': {
    title: 'Comment est calculé le rendement quotidien ?',
    content: `**Rendement quotidien RWA ≈ votre stake (USDT équivalent) × 0,8 % × multiplicateur de blocage**

Payé en RWA au **prix du jour**. Multiplicateur : flexible = 1, 30j ≈ 1,3, 90j ≈ 1,6, 180j = 2, 365j = 2,5 (voir l’interface).

**Exemple** : Stake **5 000 USDT**, **blocage 90 jours** (+60 %), RWA = **1 USD**. Quotidien : 5 000 × 0,8 % × 1,6 = 64 USDT équivalent → **64 RWA/jour**. Si RWA = **0,50 USD**, alors 64 ÷ 0,5 = **128 RWA/jour**. Les récompenses de parrainage/nœud sont en **USDT** et réclamées séparément sur la page Retrait.`,
  },
  'when-rewards-arrive': {
    title: 'Quand arrivent les récompenses ? Comment vérifier ?',
    content: `**Règlement** : Une fois par jour à **UTC 0:00** ; le délai on-chain peut aller de quelques minutes à **~2 heures**.

**Où voir** : **Tableau de bord** → « Activité récente » : rendement quotidien. **Page Retrait** : « RWA retirable » et « USDT réclamable ». **Exemple** : Vous stakez le 5 mars ; après le règlement du 6 mars à UTC 0:00, vous verrez en général le rendement du 6 mars vers 8h–10h (heure de Pékin). Si rien après 24 h, vérifier que vous n’avez pas déclenché de retrait d’urgence et contacter le support avec votre adresse.`,
  },
  'how-to-withdraw-rwa': {
    title: 'Comment retirer le rendement RWA ?',
    content: `Sur la page **Retrait**, la carte **Retirer RWA** affiche : **Rendement RWA réglé** (staking USDT et RWA) ; **Principal RWA débloqué** du staking RWA flexible (le cas échéant).

Cliquer sur « Retirer » → confirmer dans le portefeuille et payer le Gas (un peu de BNB). **Important** : Si ce retrait **inclut du principal débloqué** (RWA staké en « Flexible »), vous devez retirer **le montant disponible total** (tout le rendement + tout le principal débloqué) en une fois. Utiliser MAX ou saisir le total. Retirer uniquement le rendement peut être n’importe quel montant au-dessus du minimum et hors délai. **Principal flexible** : Uniquement pour le staking **RWA** avec blocage **Flexible** ; le principal RWA débloqué peut être retiré à tout moment depuis la carte de retrait RWA, **sans frais, sans délai 24 h**. Si vous avez rendement et principal, vous devez retirer les deux en une transaction.`,
  },
  'withdraw-cooldown-fee': {
    title: 'Quel est le délai et les frais de retrait ?',
    content: `Règles (protocole actuel) :

| Élément | Règle |
|---------|--------|
| Min. retrait | Au moins **100** (selon le parcours de retrait) |
| Délai | **24 heures** entre deux retraits RWA ; le bouton affiche un compte à rebours |
| Frais immédiat | **8 %** fixe (3 % rachat/brûlage, 3 % trésorerie, 2 % pool communautaire) |
| Mode stRWA | **0 %** de frais, mint **120 %** en stRWA verrouillé 30 jours |
| Gas | Un peu de BNB pour BSC (≈ 0,001–0,003 BNB) |

**Exemple** : Retirer **100 RWA** immédiatement → vous recevez **92 RWA** (8 % de frais). En mode stRWA : 0 % de frais, **120 stRWA** verrouillé 30 jours. Minimum **100**.`,
  },
  'what-is-strwa-unlock': {
    title: 'Qu’est-ce que le déblocage stRWA ? Comment faire ?',
    content: `**stRWA** est le **reçu de staking** lorsque vous stakez du **RWA** avec un **blocage**. Pendant le blocage vous ne pouvez pas retirer le principal ; **après le blocage**, sur la page Retrait utiliser la carte **Débloquer stRWA** pour reconvertir stRWA en RWA.

**Étapes** : Page Retrait → « Débloquer stRWA » → vérifier le montant et tout déblocage/délai (ex. 7 jours de déblocage, 3 jours de délai) → saisir le montant, confirmer, payer le Gas. **Exemple** : Vous avez bloqué 2 000 RWA pour 90 jours ; après expiration la page affiche « Débloquer 2 000 stRWA ». Vous confirmez ; 2 000 RWA reviennent dans votre portefeuille en quelques minutes. Si le protocole a un délai de 7 jours, la réception peut prendre 7 jours ; voir la page.`,
  },
  'claim-usdt-rewards': {
    title: 'Comment réclamer les récompenses de parrainage USDT ?',
    content: `Les récompenses de parrainage/nœud **sont en USDT** on-chain. Sur la page Retrait, la carte **Récompenses USDT** affiche le montant réclamable. Cliquer sur « Réclamer » → confirmer dans le portefeuille et payer le Gas ; les USDT sont envoyés à votre portefeuille.

**Note** : Les récompenses sont payées lorsque **les utilisateurs parrainés stakent** (chaque stake), selon votre taux de niveau sur ce montant, pas sur leur rendement quotidien. **Exemple** : Votre filleul direct stake 1 000 USDT, vous êtes L3 (8 %) → vous recevez 1 000×8 % = **80 USDT** ; cela s’ajoute à votre solde réclamable ; chaque réclamation coûte un peu de Gas BNB.`,
  },
  'what-is-emergency-withdraw': {
    title: 'Qu’est-ce que le retrait d’urgence ? Conséquences ?',
    content: `Le **retrait d’urgence** s’applique uniquement aux **positions USDT en blocage avant échéance**. Remboursement selon **jours accomplis** (jours accomplis / total jours de blocage), puis **8 %** de frais déduits, vous recevez des **USDT**. **Les RWA en attente ne sont pas effacés** ; seule cette position est clôturée, de façon irréversible.

**Logique** : Remboursement = principal de cette position × (jours accomplis / total jours de blocage), puis 8 % (3 % rachat/burn, 3 % trésor, 2 % pool communautaire). Si le blocage est arrivé à échéance, utilisez le retrait normal du principal. **Exemple** : Blocage 30 jours, 3 jours passés → retrait d’urgence : 3/30 = 10 % à liquider, après 8 % frais vous recevez des USDT. **À utiliser uniquement quand vous comprenez le risque et devez vraiment sortir.** Lire d’abord l’avis sur la page.`,
  },
  'what-are-node-levels': {
    title: 'Qu’est-ce que les niveaux de nœud ? Que sont L1–L9 ?',
    content: `Les niveaux de nœud (**L1–L9**) sont votre palier dans le système de parrainage. Palier plus élevé → **% de récompense de parrainage** plus élevé quand **les parrainés stakent** ; L4+ peut rejoindre le **partage des revenus du protocole**.

**Important** : Le « % de récompense » dans le tableau porte sur **le montant staké par cet utilisateur**, pas sur son rendement quotidien 0,8 % en RWA. Les récompenses de parrainage sont **payées une fois par stake**, pas quotidiennement. Tableau (voir page Nœuds et parrainages) : L1 Quantum 3 %, L2 Particle 5 %, L3 Photon 8 %, L4 Starship 12 %, L5 Comet 17 %, L6 Planet 23 %, L7 Star 30 %, L8 Nebula 35 %, L9 Supernova 40 %, avec exigences de stake d’équipe et personnel. **Exemple** : Vous êtes L3 (8 %) ; le filleul direct A stake 1 000 USDT → vous recevez 80 USDT une fois. Si vous passez en L4 (12 %), le même A stake à nouveau 1 000 → vous recevez 120 USDT.`,
  },
  'what-is-referrer': {
    title: 'Qu’est-ce qu’un parrain ? Comment est-il lié ?',
    content: `Votre **parrain** est l’adresse du portefeuille que vous saisissez dans « Adresse du parrain » lors de votre **premier stake**. Ce lien est **permanent** après confirmation du premier stake on-chain et **ne peut pas être modifié**.

Ensuite, à **chaque stake**, votre parrain et ses uplines reçoivent des récompenses USDT de parrainage sur **ce montant** selon le palier et les règles de « compression ». Sur la page Nœuds et parrainages vous pouvez voir votre lien et structure ; en invitant, demandez-leur de **coller votre adresse** dans « Adresse du parrain » sur la page Staking. **Mauvaise adresse de parrain ?** Une fois le premier stake confirmé, le parrain est fixé et le contrat ne permet pas de le changer. Si vous n’avez pas encore staké, vérifier avant le premier stake. Si déjà lié, ce n’est pas corrigeable on-chain ; confirmer l’adresse avec votre parrain (ex. utiliser son lien) ; pour des liaisons erronées importantes, contacter le support officiel.`,
  },
  'referral-reward-calc': {
    title: 'Comment sont calculées les récompenses de parrainage ?',
    content: `**Quand** : Uniquement quand un **utilisateur parrainé stake** ; le système utilise **ce montant** et paie des USDT à son parrain et aux uplines. Il **ne** vous paie **pas** une part de leur rendement quotidien 0,8 %.

**Comment** : Base : **le stake de cet utilisateur** (USDT ou RWA équivalent). Taux : du parrain direct vers le haut selon le **% de palier de nœud** ; avec plusieurs niveaux, **compression** (différence de palier) : chaque niveau ne reçoit que « mon % moins ce qui a déjà été pris en dessous » ; total à tous les uplines ≤ **50 %** de ce stake. **Plafond par stake** : La récompense de chaque parrain pour un stake ≤ **50 % du stake total de ce parrain** ; l’excédent n’est pas payé. **Pourquoi moins qu’attendu ?** Récompense uniquement sur le montant staké, pas le rendement quotidien ; plafond 50 % par stake ; compression (vous ne recevez que la différence de palier) ; parrain erroné ou non lié.`,
  },
  'how-to-upgrade-node': {
    title: 'Comment monter en niveau de nœud ?',
    content: `Le niveau est **automatiquement** défini par le système à partir du **stake total d’équipe, de la structure et de votre stake personnel** ; pas de demande manuelle. Le système se met à jour après l’activité de parrainage. **Exemple** (voir page Nœuds) : L1→L2 : stake personnel ≥ 500 USDT, équipe ≥ 5 000 USDT. L2→L3 : personnel ≥ 1 000, équipe ≥ 20 000. L4–L9 : voir le tableau. Vérifier le **niveau actuel** et les **exigences du niveau suivant** sur la page Nœuds et parrainages.`,
  },
  'lottery-rules': {
    title: 'Quelles sont les règles de la loterie ?',
    content: `Les utilisateurs achètent des **billets de loterie** avec du **RWA**. Les tirages utilisent l’aléatoire on-chain (ex. **Chainlink VRF**) ; les résultats sont publics. **Fonds** : Lors du tirage d’un pool, **5 %** du pool va au **trésor** ; les **95 %** restants sont répartis par niveau (1er 48 %, 2e 24 %, 3e 14 %, 4e 9 %). Si un niveau n’a pas de gagnant, cette part **passe au tirage suivant** du même pool. **Exemple** : Un pool hebdo de 10 000 USDT → 500 au trésor ; 4 800 au 1er, 2 400 au 2e, etc. ; s’il n’y a pas de 1er, 4 800 passent à la semaine suivante.`,
  },
  'four-pools-diff': {
    title: 'Différence entre les quatre pools (temps réel/semaine/mois/an) ?',
    content: `| Pool | Heure de tirage | Note |
|------|-----------------|------|
| **Temps réel** | Toutes les **5 min** (0:00, 0:05, 0:10 UTC) | Rapide, petits stakes |
| **Hebdo** | **Lundi** **0:00 UTC** | Une fois par semaine |
| **Mensuel** | **1er** du mois **0:00 UTC** | Une fois par mois |
| **Annuel** | **1er jan** **0:00 UTC** | Une fois par an, pool plus gros |

Toutes les heures en **UTC**. **Exemple** : 10 mars 2026 14:35 UTC → prochain temps réel 14:40 UTC ; prochain hebdo 17 mars 0:00 UTC. Voir la page Loterie.`,
  },
  'draw-time-utc': {
    title: 'Comment est fixée l’heure du tirage ? (UTC)',
    content: `Tous les pools tirent à des **heures fixes UTC** selon le contrat : **Temps réel** : toutes les 5 min (0:00, 0:05, 0:10 … UTC). **Hebdo** : lundi 00:00 UTC. **Mensuel** : 1er du mois 00:00 UTC. **Annuel** : 1er jan 00:00 UTC. Voir la page Loterie pour les heures exactes.`,
  },
  'buy-tickets-and-claim': {
    title: 'Comment acheter des billets et réclamer les prix ?',
    content: `**Acheter** : Sur la page Loterie choisir un pool (temps réel/semaine/mois/an), saisir le **nombre de billets**, payer en RWA et confirmer. Le prix peut varier par pool (ex. 10 RWA/semaine, 50 RWA/mois) ; il peut y avoir un max par tirage (ex. 100). **Réclamer** : Après le tirage, si vous gagnez, trouver « Réclamer » pour ce pool, envoyer la tx et payer le Gas ; les prix sont envoyés à votre portefeuille. Les billets non gagnants ne sont pas remboursés ; vous pouvez participer au tirage suivant. **Exemple** : Vous achetez 5 billets hebdo pour 50 RWA ; si vous gagnez au 4e niveau vous recevez 9 % de ce pool en RWA/USDT et réclamez sur la page.`,
  },
  'how-to-buy-rwa-with-usdt': {
    title: 'Comment acheter du RWA avec des USDT ?',
    content: `Sur la page **Swap** choisir **USDT → RWA**, saisir le montant en USDT ; l’interface affiche le RWA estimé (glissement/frais inclus). **Première fois** vous devez **Approuver** les USDT pour le contrat, puis cliquer sur « Swap » et confirmer ; payer le Gas et le RWA est envoyé à votre portefeuille. **Exemple** : RWA ≈ 0,85 USD ; vous saisissez 850 USDT → ~1 000 RWA (un peu moins avec le glissement) ; après approbation + swap vous avez ~1 000 RWA et 850 USDT en moins.`,
  },
  'where-to-see-price': {
    title: 'Où voir le prix du RWA ?',
    content: `Sur la page **Marché** vous pouvez voir le **prix, graphique, variation 24 h, volume** du RWA. Les données sont agrégées depuis la chaîne ou des tiers et sont **indicatives** ; l’exécution réelle est on-chain et sur la page Swap. Ex. si le plus bas 24 h est 0,80 et le plus haut 0,90, votre swap peut tomber dans cette fourchette ; voir la page Swap pour la cote exacte.`,
  },
  'protocol-fund-model': {
    title: 'Quel est le modèle de fonds du protocole ? (50/50)',
    content: `Lors du **staking**, les fonds vont **50 % au trésor, 50 % au pool de récompenses communautaires**. **Trésor** : réserve, sécurité, long terme ; vous ne récupérez pas la part trésor au retrait ni au retrait d’urgence. **Pool communautaire** : paie le **rendement quotidien RWA** et les **récompenses USDT de parrainage/nœud**. **Exemple** : 100 utilisateurs stakent chacun 10 000 USDT → 1 000 000 au total ; 500 000 au trésor, 500 000 au pool. Le rendement quotidien RWA et USDT est payé depuis le pool et les règles ; le trésor n’est pas renvoyé aux utilisateurs.`,
  },
  'treasury-and-community-pool': {
    title: 'Qu’est-ce que le trésor et le pool communautaire ?',
    content: `**Trésor** : Reçoit **50 %** des fonds stakés ; utilisé pour la réserve, les opérations, la sécurité, l’écosystème. Aussi **5 %** de chaque pool de loterie. **Pool communautaire** : Reçoit les autres **50 %** des fonds stakés ; utilisé pour payer le rendement RWA et les récompenses USDT. **Exemple** : Stake de 2 000 USDT → 1 000 au trésor, 1 000 au pool. Un pool de loterie de 20 000 USDT → 1 000 (5 %) au trésor, 19 000 aux gagnants ou au tirage suivant.`,
  },
  'lottery-5-percent-treasury': {
    title: 'Que signifie « 5 % du pool de loterie au trésor » ?',
    content: `Lors de la **distribution** d’un pool de loterie, **5 %** du pool est envoyé au **trésor** du protocole ; les **95 %** restants vont aux gagnants par niveau (ou au tirage suivant si un niveau n’a pas de gagnant) : 1er 48 %, 2e 24 %, 3e 14 %, 4e 9 %, Trésor 5 %. **Exemple** : Pool de 50 000 USDT → 2 500 au trésor ; s’il n’y a pas de 1er, 4 800 passent au tirage suivant de ce pool.`,
  },
  'avoid-phishing': {
    title: 'Comment éviter les sites de phishing ?',
    content: `- N’utiliser **que le domaine et les liens officiels** ; ne pas cliquer sur des liens par SMS, email ou groupes inconnus. Avant de connecter, vérifier la **barre d’adresse** pour le bon domaine. **Ne jamais** saisir la phrase de récupération, la clé privée ou le mot de passe sur des pages non officielles ; ce site **ne les demande jamais**. En cas de doute, confirmer la **dernière URL officielle** via les annonces ou la communauté.`,
  },
  'protect-private-key': {
    title: 'Comment protéger ma clé privée et ma phrase de récupération ?',
    content: `C’est le **seul** moyen de contrôler vos actifs ; quiconque les a peut déplacer vos fonds. **Conseils** : Ne pas faire de capture d’écran, ne pas envoyer par email/chat, ne pas stocker sur des appareils connectés ou dans le cloud. Préférer **écrire sur papier** et ranger en lieu sûr ; envisager un portefeuille matériel. Ce site et le vrai support **ne demandent jamais** la phrase ou la clé ; quiconque le fait est un escroc.`,
  },
  'tx-pending': {
    title: 'Ma transaction reste en attente, que faire ?',
    content: `Souvent à cause de la **congestion du réseau**. Essayer : 1) **Attendre 10–30 min** ; beaucoup de tx se confirment seules. 2) Dans le portefeuille, trouver la tx et utiliser « **Accélérer** » pour renvoyer avec plus de Gas. 3) Si toujours en attente après 1 h, vérifier le statut sur **BSCScan.com** avec le **hash de la tx**. 4) Lors du contact avec le support, fournir le **hash de la tx**. **Exemple** : Un retrait reste bloqué dans MetaMask ; copier le hash (0x…), le chercher sur BSCScan pour voir En attente ou Échouée ; si En attente, accélérer dans le portefeuille.`,
  },
  'rewards-not-arrived': {
    title: 'Mes récompenses ne sont pas arrivées, que faire ?',
    content: `Le rendement est réglé chaque jour à **UTC 0:00** ; l’arrivée peut être retardée jusqu’à **~2 heures**. D’abord : 1) **Tableau de bord** → **Activité récente** pour le rendement du jour. 2) Confirmer que vous n’avez pas fait de **retrait d’urgence** ni d’autres actions modifiant l’état. 3) Si **plus de 24 h** sans enregistrement, contacter le support (Telegram, Discord, email) avec **adresse du portefeuille**, **description**, **moment approximatif** (ex. « Staké le 5 mars, rendement du 6 mars attendu, non affiché »). **Exemple** : Vous avez staké le 5 mars, toujours pas de rendement à 10h le 6 mars ; vérifier l’activité récente pour le 6 mars ; si c’est là, la page Retrait peut juste être lente ; sinon, contacter le support avec l’adresse et l’heure.`,
  },
  'contact-support': {
    title: 'Comment contacter le support ?',
    content: `Utiliser **Telegram, Discord ou l’email officiels** (ex. rwacoin001@gmail.com). Le support **ne demande jamais** la phrase de récupération, la clé privée ou le mot de passe. Lors du signalement d’un problème, inclure l’**adresse du portefeuille** (ex. 0x1234…5678), **ce qui s’est passé** et le **hash de la tx** le cas échéant. Ex. : « Portefeuille 0x1234…5678, retiré 100 RWA le 6 mars, non reçu, TX : 0xabcd… ».`,
  },
  'compare-pancake': {
    title: 'En quoi RWA diffère-t-il du farming de liquidité PancakeSwap ?',
    content: `**PancakeSwap** : Vous fournissez de la **liquidité** (ex. paire USDT–BNB), vous gagnez des **frais de trading + récompenses de farm** ; vous pouvez **retirer la liquidité** et récupérer le principal (avec risque de perte impermanente). **Staking RWA Protocol** : Vous déposez des **USDT ou du RWA** dans le protocole ; vous gagnez un **rendement quotidien RWA** (ex. 0,8 % × blocage) et éventuellement des **USDT de parrainage/nœud**. Le principal 50 % trésor, 50 % pool. Seuls les **USDT en blocage avant échéance** admettent le **retrait d’urgence** (proportion jours accomplis + 8 % frais, retour en USDT, irréversible). À échéance et flexibles : retrait normal du principal. **Résumé** : Farming = liquidité + récompenses, retirable ; staking RWA = rendement fixe + parrainage, principal en partie irréversible ; comprendre les règles avant de participer.`,
  },
  'compare-other-platforms': {
    title: 'En quoi RWA diffère-t-il des autres plateformes de staking à haut rendement ?',
    content: `**Source du rendement** : RWA offre un **rendement quotidien RWA + USDT de parrainage/nœud** selon le blocage et le palier ; d’autres peuvent être du farming APY pur ou des produits double actif avec structure et risque différents. **Principal et sortie** : RWA utilise **50/50**. Seuls les USDT en blocage avant échéance ont retrait d’urgence (proportion jours accomplis + 8 % frais, retour USDT). À échéance et flexibles : retrait normal. Les plateformes qui promettent « retour total à tout moment » peuvent être des rug pulls ; RWA **décrit explicitement les voies de retrait du principal**. **Transparence** : RWA a un **trésor multisig, TimeLock, audits tiers, TVL/trésor on-chain**. Comparer si les autres plateformes ont des contrats ouverts, des audits publics et des fonds vérifiables on-chain. **Conseil** : Ne pas courir après le « haut rendement » sans réfléchir ; vérifier si le principal est récupérable, d’où vient le rendement et s’il y a des audits et une transparence on-chain.`,
  },
  'referral-link-where': {
    title: 'Où obtenir mon lien de parrainage ?',
    content: `Sur la page **Nœuds et parrainages** (dans la nav : « Nœuds » / « Parrainages ») : la page affiche votre **lien de parrainage** (URL du site + votre adresse ou code). Copier et partager ; quand quelqu’un l’ouvre, la page Staking peut **pré-remplir votre adresse** dans « Adresse du parrain » (sinon, ils la collent). Si vous ne le trouvez pas, vérifier la nav en haut ou en bas pour « Nœuds », « Parrainages » ou « Mon parrainage » ; certains produits ont aussi « Obtenir le lien de parrainage » sur la page Staking.`,
  },
  'calculator-where': {
    title: 'Où est la calculatrice de rendement ? Comment l’utiliser ?',
    content: `Dans la nav, ouvrir **« Calculatrice de rendement »** ou **« Calculator »** (souvent sous « Analytiques »). **Utilisation** : Saisir le **montant à staker**, le **blocage** (Flexible/30/90/180/365 jours), le **niveau de nœud** (si vous voulez une estimation du parrainage) ; la page affiche le **rendement RWA estimé quotidien/mensuel/annuel** et les récompenses USDT possibles. **À titre indicatif uniquement** ; ce n’est pas une promesse on-chain. Le rendement réel vient de la chaîne et du contrat. L’utiliser pour comparer montants et périodes de blocage.`,
  },
  'principal-withdraw-guide': {
    title: 'Comment retirer le principal ? Flexible vs bloqué ?',
    content: `La page Retrait sépare **retrait de rendement** et **retrait du principal**. Le principal est dans la section **« Retrait du principal »**. **Quatre types** : USDT flexible → section Principal, USDT flexible, instantané **8 %** de frais (3 % rachat/brûlage, 3 % trésorerie, 2 % pool). Min. **100**. USDT blocage à échéance → après le blocage, dans Principal sélectionner la position USDT bloquée, **8 %** de frais. Avant échéance : **retrait d’urgence** uniquement. RWA flexible → Principal, RWA flexible, **8 %** de frais, min. **100**. RWA blocage à échéance → après échéance : **instantané** (8 %) ou **mode stRWA** (**0 %**, **120 %** mint en stRWA verrouillé 30 jours). Seul **USDT en blocage avant échéance** utilise le retrait d’urgence.`,
  },
  'withdraw-arrival-time': {
    title: 'Combien de temps avant que mon retrait arrive ?',
    content: `Les retraits (RWA ou USDT) et les réclamations USDT sont des **transactions on-chain**. Le délai dépend de la confirmation BSC et du rafraîchissement du portefeuille. **Cas normal** : BSC produit un bloc environ toutes les **3 secondes** ; une fois votre tx incluse, confirmation en **quelques secondes à environ une minute**. Si le statut est Success, le contrat a déjà envoyé RWA ou USDT à votre adresse. Certains portefeuilles mettent **quelques secondes à quelques dizaines de secondes** à mettre à jour le solde. **Plus lent** : congestion du réseau (BSC chargé), ou Gas trop bas (tx en Pending ou échec). **Résumé** : en conditions normales, **arrivée on-chain en environ une minute** après confirmation ; si rien après 2–3 min, vérifier la tx sur BSCScan.`,
  },
  'rewards-manual-claim': {
    title: 'Les récompenses sont-elles créditées automatiquement ou à réclamer ?',
    content: `**Vous devez retirer/réclamer activement ; les récompenses ne sont pas envoyées automatiquement.** RWA : le protocole **règle** chaque jour sur votre solde en contrat (rwaPending) mais **ne l’envoie pas** au portefeuille. Ouvrez la page **Retrait**, carte **RWA**, saisissez le montant, Retirer et confirmez. USDT parrainage/nœud : idem **on-chain**, carte **Récompenses USDT** ; cliquer sur **Réclamer** et confirmer. **Résumé** : d’abord réglé on-chain ; vous **initiez retrait ou réclamation** pour que ça arrive au portefeuille. Chaque action coûte un peu de BNB en Gas.`,
  },
  'withdraw-amount-mismatch': {
    title: 'Pourquoi le RWA retirable ne correspond pas à mon calcul ?',
    content: `Raisons courantes : **évolution du prix RWA** et **unités différentes** (montant vs quantité). En chaîne est stockée la **quantité** RWA ; si vous calculez « 0,8 % journalier × USDT staké » vous obtenez l’équivalent USDT, puis en divisant par le prix RWA supposé ça peut ne pas coller. Le rendement a été converti en RWA au prix **d’alors**. **Utilisez la quantité RWA retirable** affichée sur la page ou on-chain. Retraits instantanés **8 %** de frais et minimum **100**.`,
  },
  'withdraw-not-received': {
    title: 'Retrait réussi mais RWA pas dans le portefeuille, comment vérifier ?',
    content: `Si la **transaction est en succès** mais le solde n’a pas changé : 1) **Chaîne et adresse** : le portefeuille doit être sur **BSC mainnet** et le solde consulté celui de la **même adresse** que pour le retrait. 2) **Token visible** : si RWA n’est pas « ajouté » dans le portefeuille, ajoutez l’**adresse du contrat RWA**. 3) **On-chain** : cherchez la tx de retrait sur **BSCScan** avec votre adresse ; si statut Success et Transfer avec votre adresse comme destinataire, les fonds sont on-chain. 4) **Délai** : certains portefeuilles mettent à jour le solde avec un délai. 5) **Toujours pas** : gardez le **hash de la TX** et contactez le support avec « adresse + hash + heure approximative ».`,
  },
  'rwa-usdt-separate-claim': {
    title: 'Faut-il réclamer RWA et USDT séparément ?',
    content: `**Oui.** Ce sont **deux actions distinctes** ; chacune doit être faite pour que l’actif arrive dans votre portefeuille. **RWA** : carte **Retrait RWA** sur la page Retrait (rendement journalier en RWA). **USDT** : carte **Récompenses USDT / Réclamer** (récompenses parrainage/nœud). Réclamer l’un ne déclenche pas l’autre. Si vous avez les deux, **faites chaque action une fois**. Chacune consomme un peu de BNB en Gas.`,
  },
  'no-referrals-still-earn': {
    title: 'Puis-je gagner sans avoir de filleuls ?',
    content: `**Oui.** Le rendement du protocole a deux parties : **rendement statique** (pas besoin de filleuls) et **récompenses de parrainage** (besoin de filleuls). Tant que **vous** stakez USDT ou RWA, vous gagnez du **RWA journalier** (ex. 0,8 % base × multiplicateur blocage). **Indépendant** des filleuls ou du champ parrain. Les **USDT** parrainage/nœud ne sont reçus que quand des **utilisateurs parrainés** stakent avec votre adresse comme parrain. Sans filleuls pas de cette partie USDT, mais votre **rendement statique RWA est inchangé**. **Résumé** : sans filleuls vous gagnez quand même le **RWA statique journalier** ; les parrainages sont un **revenu USDT en plus**.`,
  },
  'wrong-referrer-address': {
    title: 'J’ai mis la mauvaise adresse de parrain, que faire ?',
    content: `**Une fois votre premier stake confirmé on-chain, le parrain est lié définitivement ; le contrat ne permet pas de changer ni de délier.** Si **vous n’avez pas encore staké** : revérifiez « Adresse du parrain » avant le premier stake. Tant que le premier stake n’est pas confirmé, rien n’est écrit on-chain ; vous pouvez corriger puis staker. Si **vous avez déjà staké et le parrain est fixé** : impossible de changer on-chain. Si vous avez mis une autre adresse, vos récompenses de parrainage iront à cette adresse ; si vide ou zéro, vous n’avez pas de parrain et ne pouvez pas en ajouter après. **Conseil** : confirmez l’adresse avec votre parrain avant le premier stake. Le **contrat ne peut pas changer le parrain**.`,
  },
  'node-level-downgrade': {
    title: 'Pourquoi mon niveau de nœud a baissé ?',
    content: `Le niveau de nœud est calculé **dynamiquement** à partir de votre stake équipe et personnel **actuel** (et structure), pas fixe. **Pourquoi ça baisse** : quand le stake effectif baisse (filleuls retirent, vous retirez le principal) ou vous ne remplissez plus les conditions du niveau actuel, le système recalcule et peut attribuer un niveau inférieur. **Effet** : après la baisse, les **nouveaux** stakes des filleuls sont récompensés au nouveau taux (inférieur). L4+ participent au partage des revenus ; en dessous de L4 vous ne participez plus. **Restaurer** : quand équipe/personnel respecte à nouveau les conditions du niveau supérieur, le niveau est rétabli. Voir la page Nœuds et parrainages.`,
  },
  'direct-vs-indirect-referral': {
    title: 'Différence entre filleul direct et indirect ? Répartition des récompenses ?',
    content: `**Filleul direct** : quelqu’un que vous invitez qui **met votre adresse** comme parrain en stakant ; vous recevez la récompense USDT sur **ce stake** à votre taux de niveau (ex. L3 = 8 %). **Indirect (multiniveau)** : votre filleul direct A invite B ; B stake avec l’adresse de A comme parrain, donc B est votre filleul **indirect** (second niveau). Avec plusieurs niveaux, **compression** : chaque niveau ne reçoit que « mon % moins ce que les niveaux en dessous ont déjà pris » ; le total pour tous les niveaux au-dessus est au plus **50 %** de ce stake. **Exemple** : C a vous comme parrain (L3, 8 %), vous avez Alice (L5, 17 %). C stake 10 000 USDT : vous 8 % = 800 USDT, Alice 17 %−8 % = 9 % = 900 USDT, total 1 700 USDT. Les récompenses sont déclenchées **une fois par stake** sur ce montant.`,
  },
  'same-wallet-multiple-referrers': {
    title: 'Un portefeuille peut-il avoir plusieurs parrains ?',
    content: `**Non.** Une adresse de portefeuille ne peut avoir qu’**un** parrain. Celui indiqué dans « Adresse du parrain » lorsque cette adresse fait son **premier stake confirmé** devient le parrain permanent. Si quelqu’un d’autre partage ensuite un lien de parrainage, cela **ne remplace pas** le parrain actuel ; le contrat ne permet pas de modifier ni partager la relation. Chaque adresse a **un seul parrain, permanent**.`,
  },
  'what-is-approve': {
    title: 'Qu’est-ce qu’Approve ? Pourquoi deux transactions ?',
    content: `La première fois que vous stakez ou faites un swap, le portefeuille peut demander une transaction **Approve**. C’est normal et requis on-chain ; ce n’est pas un frais en plus. **Approve** = vous autorisez « ce contrat à dépenser jusqu’à X de ce token ». Cela ne déplace pas encore les tokens, ça fixe seulement une limite de dépense. La **deuxième** transaction (Stake ou Swap) est quand le contrat déplace les tokens. **Pourquoi deux** : Première Approve — vous autorisez l’usage de votre USDT (ou RWA), seule la limite est enregistrée, vous payez un peu de Gas (BNB). Deuxième Stake/Swap — en cliquant le contrat déplace le montant dans la limite approuvée. Par token et contrat **une approbation suffit** (ou à refaire quand la limite est épuisée).`,
  },
  'balance-insufficient-why': {
    title: '« Solde insuffisant » alors que j’ai des USDT, pourquoi ?',
    content: `Vérifier dans l’ordre : 1) **Mauvaise chaîne** : le protocole n’utilise que les USDT sur **BSC**. 2) **Portefeuille pas sur BSC** : passer à **BSC mainnet** (Chain ID: 56). 3) **Pas de BNB pour le Gas** : staker et approuver coûtent du **BNB**. Garder un peu de BNB (ex. 0,01–0,05). 4) **Limite d’approbation trop basse** : ré-**approuver** (montant plus élevé ou illimité) puis staker. 5) **Interface pas à jour** : après un dépôt ou changement de chaîne, rafraîchir ou reconnecter le portefeuille. Si tout est correct et ça échoue encore, vérifier le solde USDT BSC sur BSCScan et contacter le support avec adresse, chaîne et capture.`,
  },
  'can-cancel-stake': {
    title: 'Puis-je annuler mon stake ?',
    content: `**Non.** Le protocole **ne** prend **pas** en charge « annuler le stake » ; une fois confirmé on-chain il est actif. **Pour récupérer les fonds** utilisez la sortie qui correspond à votre **type de position** : RWA avec blocage → attendre la **fin du blocage**, puis sur la page Retrait utiliser **débloquer stRWA**. RWA flexible → le principal débloqué peut être retiré dans la section **Retrait du principal**. USDT : **flexible** → retirer le principal USDT dans la section Principal ; **bloqué** → attendre **l’échéance** ; avant échéance **retrait d’urgence** uniquement pour cette position USDT bloquée (proportion jours accomplis + 8 % de frais). Seul **USDT en blocage avant échéance** utilise le retrait d’urgence.`,
  },
  'multiple-stakes': {
    title: 'Puis-je avoir plusieurs stakes ?',
    content: `**Oui.** Le protocole autorise **plusieurs stakes** depuis la même adresse avec des périodes de blocage différentes ; ils s’additionnent pour le stake total et le rendement. Vous pouvez avoir des stakes USDT (rendement RWA) et RWA (stRWA et rendement RWA) ; « RWA retirable » combine le rendement des deux. Consulter le tableau de bord et la page Retrait.`,
  },
  'strwa-vs-rwa': {
    title: 'Différence entre stRWA et RWA ?',
    content: `**RWA** est le **token liquide** du protocole : vous pouvez le détenir, le transférer, le staker ou le swapper sur DEX ou la page Swap. **stRWA** est le **reçu de stake** quand vous stakez **RWA avec un blocage** (ex. 30/90/180/365 jours) ; il représente le principal RWA bloqué. **Pendant le blocage** : vous détenez **stRWA**, vous ne pouvez pas l’envoyer en RWA ni retirer le principal ; le contrat vous paie le **rendement RWA journalier**. **Après le blocage** : sur la page Retrait utiliser **débloquer stRWA** pour reconvertir stRWA en **RWA**.`,
  },
  'wrong-amount-sent-tx': {
    title: 'J’ai envoyé le stake avec le mauvais montant, puis-je annuler ?',
    content: `**Une fois la transaction diffusée vous ne pouvez pas l’« annuler » on-chain.** Si elle est encore **en attente**, certains portefeuilles permettent « accélérer » ou « annuler » avec une autre tx (ex. gas plus élevé). Si **confirmée**, le stake est actif ; vous ne pouvez sortir que selon le type de position. **Conseil** : revérifier le montant et la période de blocage avant de confirmer.`,
  },
  'transfer-stake-to-other': {
    title: 'Puis-je transférer mon stake à quelqu’un d’autre ?',
    content: `**Non.** Les stakes sont liés à **votre adresse de portefeuille** ; le protocole ne permet pas « transférer le stake à une autre adresse ». Votre stake, rendement retirable et USDT réclamable sont dans le contrat sous **votre adresse**. Pour donner des actifs à quelqu’un, vous devez **retirer** quand vous le pouvez (principal flexible, blocage à échéance ou urgence pour USDT bloqué avant échéance) vers votre portefeuille puis envoyer les fonds ou qu’ils stakent depuis leur adresse.`,
  },
  'swap-limits-slippage': {
    title: 'Y a-t-il des limites ou du slippage sur le swap ?',
    content: `La page Swap affiche une **quantité estimée de RWA** selon le contrat et le pool ; **slippage** (le prix peut bouger entre l’envoi et l’exécution de la tx) et **limites par tx ou journalières** si le protocole ou le contrat en a. Utiliser la **cote en direct** de la page Swap ; pour des montants importants, envisager de fractionner ou de vérifier la tolérance au slippage.`,
  },
  'sell-rwa-for-usdt': {
    title: 'Puis-je vendre du RWA contre des USDT ?',
    content: `La page Swap du protocole se concentre sur **USDT → RWA** (acheter du RWA avec des USDT). Si **RWA → USDT** est proposé sur la même page, cela dépend du site et des annonces. Si disponible, choisir RWA→USDT sur la page Swap, saisir le montant et confirmer. Sinon, vous pouvez échanger du RWA contre des USDT sur des **DEX ou exchanges** qui listent le RWA ; le protocole peut aussi ajouter RWA→USDT dans l’app plus tard — voir les mises à jour officielles.`,
  },
  'audit-where': {
    title: 'Y a-t-il un audit ? Où le consulter ?',
    content: `Les contrats RWA Protocol ont été **audités par des tiers** ; les rapports sont publics. **Auditeurs** : SlowMist et CertiK (et éventuellement d’autres) ; le projet vise à ré-auditer avant les changements majeurs. **Où** : ouvrir la page **Sécurité** ou **Audit** sur le site officiel. Vous y trouverez les noms des auditeurs, les dates et les liens ou résumés des rapports. Les audits réduisent le risque mais **ne garantissent pas** zéro bug ; n’investir que ce que vous pouvez vous permettre de perdre.`,
  },
  'fund-safety': {
    title: 'Le protocole peut-il faire un « rug » ? Comment les fonds sont-ils sécurisés ?',
    content: `Le protocole est conçu pour limiter le « rug » et le risque de point unique : **① Trésorerie multisig** (ex. type Gnosis Safe, 2-sur-3). **② TimeLock** pour les changements de paramètres importants (ex. 48 h). **③ Audits** (SlowMist, CertiK ; rapports sur la page Sécurité). **④ Transparence on-chain** : adresses de la trésorerie et des contrats publiées. **⑤ Exécution par contrat** : votre USDT/RWA staké va **directement** dans le contrat ou la trésorerie ; les retraits et le rendement sont exécutés par le **contrat**. Ces mesures réduisent mais n’éliminent pas le risque ; n’investir que ce que vous pouvez perdre.`,
  },
  'site-or-wallet-stuck': {
    title: 'Le site ne charge pas ou le portefeuille reste en connexion, que faire ?',
    content: `Essayer dans cet ordre : 1) **Réseau** : une autre connexion (changer de Wi‑Fi ou de données). 2) **Navigateur in-app** : sur mobile, ouvrir le site dans le navigateur **OKX** ou **Binance**. 3) **BSC** : le portefeuille doit être sur **BSC mainnet** (Chain ID: 56). 4) **Cache** : vider le cache et les cookies du navigateur puis recharger. 5) **Navigateur** : Chrome/Brave fonctionnent généralement le mieux. 6) **URL** : n’utiliser que le **domaine officiel** des annonces. Si ça échoue encore, contacter le support avec le type de portefeuille, le navigateur et une capture.`,
  },
  'change-wallet-history': {
    title: 'J’ai changé de portefeuille/téléphone, mon ancien stake est-il toujours là ?',
    content: `**Oui.** Les stakes, le rendement et le lien de parrainage sont **on-chain** et liés à votre **adresse**, pas à l’appareil ni au navigateur. Si vous utilisez la **même adresse** (même phrase de récupération / clé privée), vous verrez tout. **Nouveau téléphone ou navigateur** : installer le portefeuille, **restaurer** avec votre **phrase de récupération ou clé privée** d’origine puis connecter au site. **Nouveau portefeuille (nouvelle adresse)** : si vous avez **créé** un portefeuille au lieu de restaurer, c’est une **autre adresse** ; les stakes et récompenses de l’ancienne adresse restent sur celle-ci ; seule cette adresse (ou un portefeuille restauré avec sa phrase) peut retirer et réclamer. Vous ne pouvez pas « déplacer » les anciens stakes vers la nouvelle adresse.`,
  },
  'wallet-hacked-stake': {
    title: 'Mon portefeuille a été piraté, qu’en est-il des fonds stakés ?',
    content: `**Les fonds stakés ne bougent pas tout seuls quand le portefeuille est piraté ; mais quiconque contrôle votre adresse (phrase/clé privée) peut retirer et réclamer.** Les fonds sont dans le **contrat** ; le RWA retirable et l’USDT réclamable sont sous **votre adresse**. Le contrat ne peut en général **pas** « transférer le stake de l’utilisateur X à Y » ni « geler une adresse ». **Si votre phrase/clé a fuité, considérez les actifs comme exposés** ; utilisez un nouveau portefeuille et n’utilisez plus l’ancien. Pour « déplacer » les actifs du contrat en sécurité vous devez encore signer avec cette adresse (retirer/réclamer vers un nouveau portefeuille).`,
  },
  'protocol-shutdown': {
    title: 'Si le protocole s’arrête, puis-je récupérer mes fonds ?',
    content: `**Le contrat ne disparaît pas** : votre stake et rendement retirable sont **sur BSC**. Si le site ou l’app tombent, le **contrat continue de s’exécuter** ; en théorie vous pouvez **appeler le contrat** (ex. via BSCScan « Write Contract » + votre portefeuille) pour retirer et réclamer sans le frontend officiel. **Conditions** : le contrat ne doit pas être en pause permanente ni mis à jour pour être inutilisable, et vous devez toujours détenir **votre clé privée**. **Combien vous pouvez récupérer** dépend du **type de position** : principal flexible et principal bloqué à échéance utilisent le retrait normal ; seul **USDT en blocage avant échéance** utilise la sortie d’urgence proportionnelle. Conserver **l’adresse du contrat et l’ABI** pour pouvoir interagir via BSCScan si besoin.`,
  },
  'bsc-down-affect': {
    title: 'Si BSC a des problèmes, est-ce que ça affecte mon rendement ?',
    content: `**Oui.** La liquidation, la distribution et les retraits dépendent de **BSC** qui produit des blocs et du contrat qui s’exécute. Si la chaîne a une longue indisponibilité, un fork, une forte congestion ou un incident de sécurité : **retard de liquidation** (le rendement journalier est déclenché à un moment fixe ; si BSC est en mauvaise forme, ça peut être retardé ou sauté) ; **impossibilité de retirer/réclamer** (il faut envoyer une transaction ; si la chaîne s’arrête ou le RPC est down, les fonds restent dans le contrat jusqu’au retour). **Résumé** : BSC est la couche de base ; le risque de la chaîne affecte le rendement et les retraits.`,
  },
  'where-history-stake': {
    title: 'Où voir l’historique de mes stakes ?',
    content: `**Tableau de bord** : après connexion, le **Tableau de bord** ou la page « Mes actifs » affiche le stake total et l’activité récente. **BSCScan** : tous les stakes et retraits laissent des **transactions** sur BSC. Ouvrir **bscscan.com**, rechercher votre **adresse de portefeuille** et filtrer par le contrat de staking pour voir les appels Stake/Withdraw et quand vous avez staké combien. **Lecture du contrat** : si vous êtes à l’aise avec les contrats, ouvrir le contrat de staking sur BSCScan et utiliser « Read Contract » pour les fonctions de vue liées à votre adresse. Pour les litiges ou gros montants, prendre **les enregistrements on-chain sur BSCScan** comme référence.`,
  },
  'tvl-data-verify': {
    title: 'Où vérifier le TVL et les données du protocole ?',
    content: `Si vous ne faites pas confiance aux chiffres du frontend, vous pouvez **vérifier on-chain** : **TVL / stake total** : sur BSCScan ouvrir le **contrat de staking** et vérifier ses soldes de tokens **USDT et RWA** (ou toute vue TVL interne). **Events** : sur la page du contrat consulter **Events** (Stake, Withdraw) pour compter les stakes et volumes et comparer avec « Données du protocole » ou les stats du site. **Tiers** : si un site de données DeFi (DeBank, DefiLlama, etc.) liste le protocole, comparer son TVL et activité on-chain avec le site officiel. Les données on-chain sont la seule source de vérité ; le site et les tiers ne font qu’agréger.`,
  },
  'treasury-address-public': {
    title: 'L’adresse du trésor est-elle publique ? Comment voir son solde ?',
    content: `**Oui.** L’**adresse du trésor** du protocole est publiée (ex. sur Gouvernance / Sécurité / Transparence), souvent un multisig type Gnosis Safe. **Comment vérifier** : sur **BSCScan.com** rechercher l’**adresse du trésor** ; vous verrez ses soldes de tokens (USDT, RWA, BNB, etc.) et l’historique des transferts. Pas besoin du site officiel ; n’importe qui peut interroger. Le trésor reçoit 50 % des stakes des utilisateurs et 5 % des pools de loterie ; l’adresse et le solde publics aident à vérifier que les fonds circulent comme décrit.`,
  },
  'rwa-dynamic-sell-tax': {
    title: 'Taxe dynamique sur la vente de RWA',
    content: `Lorsque vous **vendez des RWA sur un DEX** (ex. PancakeSwap), une **taxe dynamique de vente** s’applique. Achats et transferts normaux non taxés ; adresses whitelist exemptées.

**1. Quand s’applique-t-elle** Uniquement aux ventes (envoi de RWA à l’adresse de la paire DEX). Achats et transferts normaux : pas de taxe. Whitelist : pas de limite.

**2. Au plus 1 vente par 24 h** Chaque adresse non whitelist ne peut effectuer qu’une vente en 24 heures.

**3. Taux** Taux de base (jours moyens de détention, max 4 %) : &lt;30 j 4 %, 30–90 3 %, 90–180 2 %, ≥180 1 %. Le **total** dans le contrat actuel = votre **total USDT staké** (totalStaked) ; ce n'est pas le solde RWA en wallet ni le RWA staké. Sans USDT staké, total=0 : seul le 4 % de base s'applique, pas la pénalité au-dessus de 30 %. **Pénalité ratio de vente** : ratio = (cette vente ÷ total) × 100. Chaque 1 % au-dessus de 30 % ajoute 1 % de taux, sans plafond. Répartition : Trésor 50 %, burn 25 %, fonds de liquidité 25 %.

---

**4. Ce qu'est le « total » – exemple (vous détenez 1000 RWA, avez staké 2000 RWA, lock 30 j, 20 j passés, vous vendez 1000 RWA)**

**Ce qu'est le total** Total = votre **total USDT staké** dans le contrat (18 décimales). N'inclut pas le solde RWA en wallet ni le RWA staké. RWA staké uniquement et aucun USDT → total=0 → à la vente seul 4 % de base.

**Votre cas : 1000 RWA en wallet, 2000 RWA stakés, lock 30 j et 20 j passés, vente de 1000 RWA**

- **A. Sans USDT staké** Total=0 → seul 4 % de base. **Taux effectif 4 %**. Vous recevez 1000×(1−4 %)=**960 RWA**.
- **B. Avec 2000 USDT stakés (lock 30 j, 20 j passés)** Total=2000. 20 j&lt;30 → base 4 %. Ratio 1000÷2000×100=**50 %**, 50 %&gt;30 % → pénalité 20 %. **Taux effectif 4 %+20 %=24 %**. Vous recevez 1000×(1−24 %)=**760 RWA**.

**USDT uniquement** : 10 000 USDT stakés (30 j, 20 passés). Vente de 3 000 RWA → ratio 30 %, pas de pénalité, 4 %. Vente de 6 000 RWA → ratio 60 %, pénalité 30 %, taux 34 %.`,
  },
  'beginner-full-tutorial': {
    title: 'RWA Protocol · Guide complet d’investissement pour débutants',
    content: `Guide pas à pas pour les utilisateurs sans expérience : du téléchargement de l’app exchange au premier staking, retrait et encaissement.

---
## Sommaire

1. Ce qu’il vous faut
2. Étape 1 : Inscription sur l’exchange
3. Étape 2 : Vérification KYC
4. Étape 3 : Acheter des USDT
5. Étape 4 : Utiliser le wallet (recommandé : wallet intégrée à l’exchange)
6. Étape 5 : Retirer des USDT de l’exchange vers le wallet
7. Étape 6 : Accéder au site du protocole RWA et connecter le wallet
8. Étape 7 : Faire du staking sur le protocole
9. Étape 8 : Retrait et encaissement
10. FAQ et sécurité

---
## 1. Ce qu’il vous faut

- **Téléphone** : smartphone avec internet (Android / iOS).
- **Pièce d’identité** : pour la KYC de l’exchange et du wallet.
- **Compte / moyen de paiement** : pour acheter des USDT en fiat. France / Europe : **carte bancaire**, **PayPal**, **SEPA**, etc.
- **Réseau** : Wi‑Fi ou 4G/5G stable recommandé.

**Termes** : **USDT** (stablecoin), **wallet** (recommandé : Web3 intégrée OKX/Binance ; MetaMask non obligatoire), **BSC** (toujours choisir BSC BEP20 pour retirer et opérer).

---
## 2. Étape 1 : Inscription sur l’exchange

Installez l’app **OKX** ou **Binance** depuis le site officiel ou l’App Store. Inscrivez-vous avec votre numéro, définissez un mot de passe et activez la 2FA.

---
## 3. Étape 2 : Vérification KYC

Dans l’app : « Vérification d’identité » ou « KYC ». Envoyez la photo de votre pièce d’identité et la vérification faciale. Une fois approuvé, achat et retrait sont possibles.

---
## 4. Étape 3 : Acheter des USDT

**OKX** : Achat / C2C → choisir USDT, moyen de paiement (carte, PayPal, etc.) et montant. **Binance** : Acheter / Achat rapide ou C2C → USDT. Vérifiez que le retrait en **BSC (BEP20)** est disponible ensuite.

---
## 5. Étape 4 : Utiliser le wallet

Recommandé : **wallet Web3 intégrée à OKX ou Binance** (MetaMask non requis). Dans l’app, ouvrez « Web3 Wallet » → créez ou récupérez et sauvegardez la phrase secrète → passez le réseau en **BSC** → notez votre **adresse de dépôt BSC** (0x…). Pour les retraits, utilisez cette adresse et le réseau **BSC (BEP20)**.

---
## 6. Étape 5 : Retirer des USDT de l’exchange vers le wallet

Sur l’exchange : **Actifs → Retirer**, devise **USDT**, réseau **BSC (BEP20)**. Collez l’adresse BSC de votre wallet. Si du **BNB** est nécessaire pour le gas, achetez-en un peu sur l’exchange et retirez-le à la même adresse en BSC.

---
## 7. Étape 6 : Accéder au protocole RWA et connecter le wallet

Ouvrez le site officiel dans le navigateur ou, **depuis l’app de l’exchange**, Découvrir → Navigateur DApp → collez l’URL officielle. Lors de la connexion, choisissez « OKX Wallet » ou « Binance Wallet » pour lier en un clic. Vérifiez que vous êtes sur le **réseau BSC (mainnet)**.

---
## 8. Étape 7 : Faire du staking sur le protocole

Sur le site, allez à « Staking » → choisissez USDT ou RWA → saisissez le montant (min. ~100 USDT) et la durée de lock → adresse du parrain si vous en avez un → approuvez et confirmez. Après confirmation on-chain, consultez la position et les gains sur le tableau de bord.

---
## 9. Étape 8 : Retrait et encaissement

Sur la page « Retrait » du protocole, réclamez les RWA ou retirez le principal (respectez le cooldown et les frais) → si besoin d’USDT, sur « Swap » ou un DEX échangez RWA contre USDT → envoyez les USDT de votre wallet vers l’exchange en **BSC (BEP20)** → sur l’exchange (C2C / Vendre), vendez les USDT contre **euros** ou autre fiat selon votre région.

**Paiement / retrait** : **carte bancaire**, **PayPal**, **virement SEPA**, etc., selon l’exchange.

---
## 10. FAQ et sécurité

Mauvais réseau, manque de BNB, solde qui n’apparaît pas, transaction en attente : voir la FAQ dans le texte. **Sécurité** : ne partagez jamais la phrase secrète ni la clé privée ; n’utilisez que les liens officiels ; testez avec un petit montant ; vérifiez toujours l’adresse et le réseau (BSC BEP20) ; n’investissez que ce que vous pouvez vous permettre de perdre.

---
## Annexe : Liste de contrôle

| Étape | Contenu | Fait |
|------|---------|------|
| 1–8 | Inscription, KYC, achat USDT, wallet, retrait vers wallet, connexion au site, premier staking | ☐ |
| 9–12 | Retrait sur le protocole, RWA→USDT, dépôt sur l’exchange, vente USDT contre fiat | ☐ |

Version du document 1.1 | Suivez l’interface actuelle du protocole et de votre exchange ; consultez les dernières annonces pour les changements.`,
  },
}
