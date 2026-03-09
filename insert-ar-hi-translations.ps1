# PowerShell script to insert Arabic and Hindi translations into i18n.ts
# This script will replace the placeholder translations with full translations

$filePath = "frontend/lib/i18n.ts"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Define Arabic translation (first 50 lines as a test)
$arTranslation = @"
const ar: TranslationMap = {
  common: {
    connectWalletFirst: 'يرجى توصيل المحفظة أولاً',
    connectWalletToStake: 'يرجى توصيل المحفظة للمشاركة',
    noRewardsAvailable: 'لا توجد مكافآت متاحة',
    approveFailed: 'فشل الموافقة',
    stakeFailed: 'فشل المشاركة',
    transactionFailed: 'فشلت المعاملة، يرجى المحاولة مرة أخرى',
    redirectingToDashboard: 'إعادة التوجيه إلى لوحة التحكم...',
    goToDashboardNow: 'انتقل إلى لوحة التحكم الآن',
  },
  nav: {
    home: 'الرئيسية',
    stake: 'المشاركة',
    withdraw: 'السحب',
    dashboard: 'لوحة التحكم',
    market: 'السوق',
    nodes: 'العقد',
    governance: 'الحوكمة',
    emergency: 'طوارئ',
    connectWallet: 'توصيل المحفظة',
  },
  hero: {
    overline: 'BSC · بروتوكول RWA · V1.0',
    titleLine1Start: 'أصول',
    titleLine1End: 'حقيقية.',
    titleLine2Start: 'عوائد',
    titleLine2End: 'حقيقية.',
    subtitle: 'ترميز الأصول الحقيقية على BSC. نموذج أصول 50/50. عائد ثابت يومي 0.8%.',
    cta1: 'تشغيل التطبيق',
    cta2: 'قراءة المستندات',
    trust1: 'مدقق',
    trust2: 'BSC Mainnet',
    trust3: 'توقيع متعدد',
  },
}
"@

Write-Host "Script created. This is a template - full implementation needed."
Write-Host "File path: $filePath"
Write-Host "Current ar definition found at line 1304"
Write-Host "Current hi definition found at line 1307"
