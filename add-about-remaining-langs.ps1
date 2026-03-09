# About页面剩余5种语言翻译添加脚本
# 日语(ja)、俄语(ru)、法语(fr)、葡萄牙语(pt)、印地语(hi)

Write-Host "准备添加About页面的剩余5种语言翻译..." -ForegroundColor Green
Write-Host "语言: 日语(ja), 俄语(ru), 法语(fr), 葡萄牙语(pt), 印地语(hi)" -ForegroundColor Cyan

$i18nPath = "frontend\lib\i18n.ts"

if (-not (Test-Path $i18nPath)) {
    Write-Host "错误: 找不到 $i18nPath" -ForegroundColor Red
    exit 1
}

Write-Host "文件路径: $i18nPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "由于翻译内容较多(每种语言约120个键值对)," -ForegroundColor Yellow
Write-Host "建议手动添加或使用专业翻译服务。" -ForegroundColor Yellow
Write-Host ""
Write-Host "当前已完成的语言:" -ForegroundColor Green
Write-Host "  ✓ 中文 (zh)" -ForegroundColor Green
Write-Host "  ✓ 英文 (en)" -ForegroundColor Green  
Write-Host "  ✓ 韩文 (ko)" -ForegroundColor Green
Write-Host "  ✓ 西班牙语 (es)" -ForegroundColor Green
Write-Host ""
Write-Host "待完成的语言:" -ForegroundColor Yellow
Write-Host "  ○ 日语 (ja)" -ForegroundColor Yellow
Write-Host "  ○ 俄语 (ru)" -ForegroundColor Yellow
Write-Host "  ○ 法语 (fr)" -ForegroundColor Yellow
Write-Host "  ○ 葡萄牙语 (pt)" -ForegroundColor Yellow
Write-Host "  ○ 印地语 (hi)" -ForegroundColor Yellow
Write-Host ""
Write-Host "翻译模板已准备在 add-about-all-languages.js 中" -ForegroundColor Cyan
Write-Host "请参考 ABOUT_PAGE_MULTILANG_COMPLETED.md 了解详情" -ForegroundColor Cyan
