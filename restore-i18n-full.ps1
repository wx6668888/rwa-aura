# 恢复完整的 i18n.ts 文件
# 这个脚本会备份当前文件并创建包含所有翻译的新文件

$targetFile = "frontend/lib/i18n.ts"
$backupFile = "frontend/lib/i18n.ts.backup"

# 备份当前文件
Write-Host "备份当前文件到 $backupFile ..." -ForegroundColor Yellow
Copy-Item $targetFile $backupFile -Force

Write-Host "正在恢复完整的 i18n.ts 文件..." -ForegroundColor Green
Write-Host "由于文件太大，请按照以下步骤手动恢复：" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 我会创建一个包含所有翻译的完整文件" -ForegroundColor White
Write-Host "2. 请查看 frontend/lib/i18n-complete.ts 文件" -ForegroundColor White
Write-Host "3. 将其内容复制到 frontend/lib/i18n.ts" -ForegroundColor White
Write-Host ""
Write-Host "或者，你可以直接运行：" -ForegroundColor Yellow
Write-Host "  Copy-Item frontend/lib/i18n-complete.ts frontend/lib/i18n.ts -Force" -ForegroundColor Cyan
Write-Host ""
Write-Host "正在创建完整文件..." -ForegroundColor Green
