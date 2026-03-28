const fs = require('fs');
const lines = fs.readFileSync('panel-principal.tsx', 'utf8').split('\n');

// 找到并修复重复的 setAmount
let fixed = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("setTxHash(hash)") && !fixed) {
    // 找到正确的位置，重写接下来的几行
    lines[i+1] = "      setOverlayStatus('success')";
    lines[i+2] = "      setAmount('')";
    lines[i+3] = "      // 刷新数据";
    lines[i+4] = "      if (data.refetch) data.refetch()";
    // 删除重复的 setAmount
    if (lines[i+5] && lines[i+5].includes("setAmount('')")) {
      lines.splice(i+5, 1);
    }
    fixed = true;
    console.log(`Fixed at line ${i+1}`);
    break;
  }
}

fs.writeFileSync('panel-principal.tsx', lines.join('\n'), 'utf8');
console.log('Done');
