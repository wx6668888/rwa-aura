const fs = require('fs');

const i18nPath = 'frontend/lib/i18n.ts';
let content = fs.readFileSync(i18nPath, 'utf8');

// 定义所有语言的 detail 结构
const details = {
  ru: `    detail: {
      'rwa-protocol-v1-launch': {
        title: 'Официальный запуск RWA Protocol V1.0',
        preview: 'RWA Protocol официально запущен в основной сети BSC с полной системой стейкинга, вывода, рефералов и узлов V1-V5...',
      },
      'v1-1-withdrawal-fee-optimization': {
        title: 'Обновление V1.1: Оптимизация расчета комиссий за вывод',
        preview: 'Это обновление исправляет неточности расчета комиссий при определенных условиях и оптимизирует потребление газа...',
      },
      'first-monthly-draw-48200': {
        title: 'Первый месячный розыгрыш: Призовой фонд $48,200',
        preview: 'Месячный розыгрыш состоится 31 марта в 20:00 UTC. В настоящее время участвуют 1,234 человека...',
      },
      'slowmist-security-partnership': {
        title: 'RWA Protocol заключает партнерство с SlowMist',
        preview: 'Мы рады объявить о стратегическом партнерстве с SlowMist, ведущей компанией в области безопасности блокчейна...',
      },
      'v5-diamond-node-reward-increase': {
        title: 'Обновление системы узлов: Награды узла V5 увеличены до 50%',
        preview: 'После обсуждения в сообществе голосование по управлению одобрило предложение об увеличении коэффициента вознаграждения узла V5 с 40% до 50%...',
      },
      'phishing-security-alert': {
        title: 'Предупреждение о безопасности: Остерегайтесь фишинговых сайтов',
        preview: 'Недавно были обнаружены фишинговые атаки, имитирующие официальный сайт RWA Protocol...',
      },
      'anniversary-airdrop-event': {
        title: 'Юбилейное событие: Эксклюзивный Airdrop',
        preview: 'Чтобы поблагодарить ранних сторонников, протокол проведет эксклюзивный airdrop токенов RWA для пользователей, которые стейкали в первый месяц...',
      },
      'maintenance-feb-7-withdrawal-pause': {
        title: 'Уведомление об обслуживании: Вывод приостановлен 7 февраля',
        preview: 'Для обеспечения стабильности системы мы проведем техническое обслуживание 7 февраля с 08:00 до 10:00 по пекинскому времени...',
      },
      'pancakeswap-listing-announcement': {
        title: 'Токен RWA теперь на PancakeSwap',
        preview: 'Токен RWA официально размещен на PancakeSwap с начальным пулом ликвидности 100,000 USDT...',
      },
      'certik-audit-completion': {
        title: 'Аудит безопасности CertiK успешно завершен',
        preview: 'Смарт-контракты RWA Protocol прошли аудит безопасности CertiK без обнаружения критических или высокорисковых уязвимостей...',
      },
      'referral-system-upgrade': {
        title: 'Крупное обновление реферальной системы',
        preview: 'Реферальная система была полностью обновлена с новыми функциями, включая отслеживание вознаграждений в реальном времени...',
      },
      'community-ama-recap': {
        title: 'Основные моменты AMA сообщества',
        preview: 'AMA сообщества на прошлой неделе успешно завершилось, команда ответила на более чем 50 вопросов о развитии протокола...',
      },
    },`,
  
  fr: `    detail: {
      'rwa-protocol-v1-launch': {
        title: 'Lancement officiel de RWA Protocol V1.0',
        preview: 'RWA Protocol est officiellement lancé sur le réseau principal BSC avec un système complet de staking, retrait, parrainage et nœuds V1-V5...',
      },
      'v1-1-withdrawal-fee-optimization': {
        title: 'Mise à jour V1.1: Optimisation du calcul des frais',
        preview: 'Cette mise à jour corrige les inexactitudes de calcul des frais dans des conditions spécifiques et optimise la consommation de gaz...',
      },
      'first-monthly-draw-48200': {
        title: 'Premier tirage mensuel: Cagnotte de $48,200',
        preview: 'Le tirage mensuel aura lieu le 31 mars à 20h00 UTC. Actuellement 1,234 participants...',
      },
      'slowmist-security-partnership': {
        title: 'RWA Protocol s\\'associe à SlowMist',
        preview: 'Nous sommes heureux d\\'annoncer un partenariat stratégique avec SlowMist, leader en sécurité blockchain...',
      },
      'v5-diamond-node-reward-increase': {
        title: 'Mise à niveau du système de nœuds: Récompenses V5 à 50%',
        preview: 'Suite à la discussion communautaire, le vote de gouvernance a approuvé la proposition d\\'augmenter le ratio de récompense du nœud V5 de 40% à 50%...',
      },
      'phishing-security-alert': {
        title: 'Alerte de sécurité: Attention aux sites de phishing',
        preview: 'Des attaques de phishing imitant le site officiel de RWA Protocol ont récemment été découvertes...',
      },
      'anniversary-airdrop-event': {
        title: 'Événement anniversaire: Airdrop exclusif',
        preview: 'Pour remercier les premiers supporters, le protocole effectuera un airdrop exclusif de tokens RWA pour les utilisateurs ayant staké le premier mois...',
      },
      'maintenance-feb-7-withdrawal-pause': {
        title: 'Avis de maintenance: Retrait suspendu le 7 février',
        preview: 'Pour assurer la stabilité du système, nous effectuerons une maintenance le 7 février de 08h00 à 10h00 heure de Pékin...',
      },
      'pancakeswap-listing-announcement': {
        title: 'Token RWA maintenant sur PancakeSwap',
        preview: 'Le token RWA est officiellement listé sur PancakeSwap avec un pool de liquidité initial de 100,000 USDT...',
      },
      'certik-audit-completion': {
        title: 'Audit de sécurité CertiK terminé avec succès',
        preview: 'Les contrats intelligents de RWA Protocol ont passé l\\'audit de sécurité CertiK sans vulnérabilités critiques ou à haut risque...',
      },
      'referral-system-upgrade': {
        title: 'Mise à niveau majeure du système de parrainage',
        preview: 'Le système de parrainage a été entièrement mis à niveau avec de nouvelles fonctionnalités incluant le suivi des récompenses en temps réel...',
      },
      'community-ama-recap': {
        title: 'Points forts de l\\'AMA communautaire',
        preview: 'L\\'AMA communautaire de la semaine dernière s\\'est terminé avec succès, l\\'équipe ayant répondu à plus de 50 questions sur le développement du protocole...',
      },
    },`,
  
  pt: `    detail: {
      'rwa-protocol-v1-launch': {
        title: 'Lançamento Oficial do RWA Protocol V1.0',
        preview: 'RWA Protocol é oficialmente lançado na rede principal BSC com sistema completo de staking, retirada, indicação e nós V1-V5...',
      },
      'v1-1-withdrawal-fee-optimization': {
        title: 'Atualização V1.1: Otimização do Cálculo de Taxas',
        preview: 'Esta atualização corrige imprecisões no cálculo de taxas em condições específicas e otimiza o consumo de gás...',
      },
      'first-monthly-draw-48200': {
        title: 'Primeiro Sorteio Mensal: Prêmio de $48,200',
        preview: 'O sorteio mensal acontecerá em 31 de março às 20h00 UTC. Atualmente 1,234 participantes...',
      },
      'slowmist-security-partnership': {
        title: 'RWA Protocol faz Parceria com SlowMist',
        preview: 'Temos o prazer de anunciar uma parceria estratégica com a SlowMist, líder em segurança blockchain...',
      },
      'v5-diamond-node-reward-increase': {
        title: 'Atualização do Sistema de Nós: Recompensas V5 para 50%',
        preview: 'Após discussão comunitária, a votação de governança aprovou a proposta de aumentar a taxa de recompensa do nó V5 de 40% para 50%...',
      },
      'phishing-security-alert': {
        title: 'Alerta de Segurança: Cuidado com Sites de Phishing',
        preview: 'Ataques de phishing imitando o site oficial do RWA Protocol foram recentemente descobertos...',
      },
      'anniversary-airdrop-event': {
        title: 'Evento de Aniversário: Airdrop Exclusivo',
        preview: 'Para agradecer aos primeiros apoiadores, o protocolo realizará um airdrop exclusivo de tokens RWA para usuários que fizeram staking no primeiro mês...',
      },
      'maintenance-feb-7-withdrawal-pause': {
        title: 'Aviso de Manutenção: Retirada Pausada em 7 de fevereiro',
        preview: 'Para garantir a estabilidade do sistema, realizaremos manutenção em 7 de fevereiro das 08h00 às 10h00 horário de Pequim...',
      },
      'pancakeswap-listing-announcement': {
        title: 'Token RWA Agora no PancakeSwap',
        preview: 'O token RWA está oficialmente listado no PancakeSwap com pool de liquidez inicial de 100,000 USDT...',
      },
      'certik-audit-completion': {
        title: 'Auditoria de Segurança CertiK Concluída com Sucesso',
        preview: 'Os contratos inteligentes do RWA Protocol passaram na auditoria de segurança da CertiK sem vulnerabilidades críticas ou de alto risco...',
      },
      'referral-system-upgrade': {
        title: 'Grande Atualização do Sistema de Indicação',
        preview: 'O sistema de indicação foi totalmente atualizado com novos recursos incluindo rastreamento de recompensas em tempo real...',
      },
      'community-ama-recap': {
        title: 'Destaques do AMA Comunitário',
        preview: 'O AMA comunitário da semana passada foi concluído com sucesso, com a equipe respondendo mais de 50 perguntas sobre o desenvolvimento do protocolo...',
      },
    },`,
  
  hi: `    detail: {
      'rwa-protocol-v1-launch': {
        title: 'RWA Protocol V1.0 आधिकारिक लॉन्च',
        preview: 'RWA Protocol आधिकारिक रूप से BSC मेननेट पर पूर्ण स्टेकिंग, निकासी, रेफरल सिस्टम और V1-V5 नोड सिस्टम के साथ लॉन्च हुआ...',
      },
      'v1-1-withdrawal-fee-optimization': {
        title: 'V1.1 अपडेट: निकासी शुल्क गणना अनुकूलन',
        preview: 'यह अपडेट विशिष्ट परिस्थितियों में निकासी शुल्क गणना की अशुद्धियों को ठीक करता है और गैस खपत को अनुकूलित करता है...',
      },
      'first-monthly-draw-48200': {
        title: 'पहला मासिक ड्रॉ: $48,200 का पुरस्कार',
        preview: 'मासिक ड्रॉ 31 मार्च को 20:00 UTC पर होगा। वर्तमान में 1,234 प्रतिभागी...',
      },
      'slowmist-security-partnership': {
        title: 'RWA Protocol ने SlowMist के साथ साझेदारी की',
        preview: 'हमें ब्लॉकचेन सुरक्षा के अग्रणी SlowMist के साथ रणनीतिक साझेदारी की घोषणा करते हुए खुशी हो रही है...',
      },
      'v5-diamond-node-reward-increase': {
        title: 'नोड सिस्टम अपग्रेड: V5 पुरस्कार 50% तक बढ़े',
        preview: 'सामुदायिक चर्चा के बाद, शासन मतदान ने V5 नोड पुरस्कार अनुपात को 40% से 50% तक बढ़ाने के प्रस्ताव को मंजूरी दी...',
      },
      'phishing-security-alert': {
        title: 'सुरक्षा चेतावनी: फ़िशिंग साइटों से सावधान रहें',
        preview: 'हाल ही में RWA Protocol आधिकारिक वेबसाइट की नकल करने वाले फ़िशिंग हमले खोजे गए हैं...',
      },
      'anniversary-airdrop-event': {
        title: 'वर्षगांठ इवेंट: विशेष एयरड्रॉप',
        preview: 'शुरुआती समर्थकों को धन्यवाद देने के लिए, प्रोटोकॉल पहले महीने में स्टेक करने वाले उपयोगकर्ताओं के लिए विशेष RWA टोकन एयरड्रॉप करेगा...',
      },
      'maintenance-feb-7-withdrawal-pause': {
        title: 'रखरखाव सूचना: 7 फरवरी को निकासी रोकी गई',
        preview: 'सिस्टम स्थिरता सुनिश्चित करने के लिए, हम 7 फरवरी को बीजिंग समय 08:00-10:00 पर सिस्टम रखरखाव करेंगे...',
      },
      'pancakeswap-listing-announcement': {
        title: 'RWA टोकन अब PancakeSwap पर',
        preview: 'RWA टोकन आधिकारिक रूप से 100,000 USDT की प्रारंभिक तरलता पूल के साथ PancakeSwap पर सूचीबद्ध है...',
      },
      'certik-audit-completion': {
        title: 'CertiK सुरक्षा ऑडिट सफलतापूर्वक पूर्ण',
        preview: 'RWA Protocol स्मार्ट कॉन्ट्रैक्ट्स ने बिना किसी गंभीर या उच्च जोखिम वाली कमजोरियों के CertiK सुरक्षा ऑडिट पास किया...',
      },
      'referral-system-upgrade': {
        title: 'रेफरल सिस्टम का बड़ा अपग्रेड',
        preview: 'रेफरल सिस्टम को रीयल-टाइम रिवॉर्ड ट्रैकिंग सहित नई सुविधाओं के साथ पूरी तरह से अपग्रेड किया गया है...',
      },
      'community-ama-recap': {
        title: 'सामुदायिक AMA मुख्य बातें',
        preview: 'पिछले सप्ताह की सामुदायिक AMA सफलतापूर्वक समाप्त हुई, टीम ने प्रोटोकॉल विकास के बारे में 50 से अधिक प्रश्नों के उत्तर दिए...',
      },
    },`
};

// 为每种语言添加 detail
Object.keys(details).forEach(lang => {
  console.log(`Adding ${lang} detail structure...`);
  
  // 找到该语言的 announce 部分结束位置
  const pattern = new RegExp(`(const ${lang}: TranslationMap = \\{[\\s\\S]*?announce: \\{[\\s\\S]*?next: '[^']+',\\n  },)`, 'g');
  
  content = content.replace(pattern, `$1\n${details[lang]}`);
});

// 保存文件
fs.writeFileSync(i18nPath, content, 'utf8');

console.log('\n✅ All detail structures added!');
console.log('Languages updated: ru, fr, pt, hi');
