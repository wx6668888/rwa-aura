// 为所有语言添加 Lucky Draw 完整翻译的脚本

const translations = {
  // 日语 (ja)
  ja: {
    showMore: 'もっと見る',
    showLess: '閉じる',
    approving: '承認中...',
    justNow: 'たった今',
    prize: '賞金',
    claimNow: '今すぐ請求',
    claiming: '請求中...',
    claimed: '請求済み',
    connectWalletToView: 'ウォレットを接続してチケットを表示',
    days: '日',
    hours: '時間',
    minutes: '分',
    seconds: '秒',
    weekProgress: '週間進捗',
    totalTickets: '総チケット数',
    winChance: '当選確率',
  },
  
  // 俄语 (ru)
  ru: {
    showMore: 'Показать больше',
    showLess: 'Скрыть',
    approving: 'Одобрение...',
    justNow: 'Только что',
    prize: 'Приз',
    claimNow: 'Получить сейчас',
    claiming: 'Получение...',
    claimed: 'Получено',
    connectWalletToView: 'Подключите кошелек для просмотра',
    days: 'д',
    hours: 'ч',
    minutes: 'м',
    seconds: 'с',
    weekProgress: 'Недельный прогресс',
    totalTickets: 'Всего билетов',
    winChance: 'Шанс выигрыша',
  },
  
  // 法语 (fr)
  fr: {
    showMore: 'Afficher plus',
    showLess: 'Masquer',
    approving: 'Approbation...',
    justNow: 'À l\'instant',
    prize: 'Prix',
    claimNow: 'Réclamer',
    claiming: 'Réclamation...',
    claimed: 'Réclamé',
    connectWalletToView: 'Connectez le portefeuille pour voir',
    days: 'j',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    weekProgress: 'Progrès hebdomadaire',
    totalTickets: 'Total billets',
    winChance: 'Chance de gagner',
  },
  
  // 葡萄牙语 (pt)
  pt: {
    showMore: 'Mostrar mais',
    showLess: 'Ocultar',
    approving: 'Aprovando...',
    justNow: 'Agora',
    prize: 'Prêmio',
    claimNow: 'Reivindicar',
    claiming: 'Reivindicando...',
    claimed: 'Reivindicado',
    connectWalletToView: 'Conecte a carteira para ver',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    weekProgress: 'Progresso semanal',
    totalTickets: 'Total de bilhetes',
    winChance: 'Chance de ganhar',
  },
  
  // 印地语 (hi)
  hi: {
    showMore: 'और दिखाएं',
    showLess: 'छुपाएं',
    approving: 'स्वीकृति दे रहे हैं...',
    justNow: 'अभी',
    prize: 'पुरस्कार',
    claimNow: 'अभी दावा करें',
    claiming: 'दावा कर रहे हैं...',
    claimed: 'दावा किया गया',
    connectWalletToView: 'टिकट देखने के लिए वॉलेट कनेक्ट करें',
    days: 'दिन',
    hours: 'घंटे',
    minutes: 'मिनट',
    seconds: 'सेकंड',
    weekProgress: 'साप्ताहिक प्रगति',
    totalTickets: 'कुल टिकट',
    winChance: 'जीतने की संभावना',
  },
  
  // 阿拉伯语 (ar)
  ar: {
    showMore: 'عرض المزيد',
    showLess: 'إخفاء',
    approving: 'جاري الموافقة...',
    justNow: 'الآن',
    prize: 'جائزة',
    claimNow: 'المطالبة الآن',
    claiming: 'جاري المطالبة...',
    claimed: 'تم المطالبة',
    connectWalletToView: 'قم بتوصيل المحفظة لعرض التذاكر',
    days: 'ي',
    hours: 'س',
    minutes: 'د',
    seconds: 'ث',
    weekProgress: 'التقدم الأسبوعي',
    totalTickets: 'إجمالي التذاكر',
    winChance: 'فرصة الفوز',
  },
};

console.log('Lucky Draw 翻译数据已准备好');
console.log('请手动将这些翻译添加到 frontend/lib/i18n.ts 的相应语言部分');
console.log(JSON.stringify(translations, null, 2));
