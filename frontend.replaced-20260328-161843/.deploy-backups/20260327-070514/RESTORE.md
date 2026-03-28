# 快速恢复（部署前快照）

## 1) 恢复 tracked 文件改动
git -C "/www/wwwroot/rwaprotocol.dpdns.org/frontend/.." apply --index "/www/wwwroot/rwaprotocol.dpdns.org/frontend/.deploy-backups/20260327-070514/frontend.staged.patch" || true
git -C "/www/wwwroot/rwaprotocol.dpdns.org/frontend/.." apply "/www/wwwroot/rwaprotocol.dpdns.org/frontend/.deploy-backups/20260327-070514/frontend.unstaged.patch"

## 2) 恢复 untracked 文件（如果有）
if [ -f "/www/wwwroot/rwaprotocol.dpdns.org/frontend/.deploy-backups/20260327-070514/frontend.untracked.tar.gz" ]; then
  tar -xzf "/www/wwwroot/rwaprotocol.dpdns.org/frontend/.deploy-backups/20260327-070514/frontend.untracked.tar.gz" -C "/www/wwwroot/rwaprotocol.dpdns.org/frontend/.."
fi
