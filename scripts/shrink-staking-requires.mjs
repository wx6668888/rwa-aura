/**
 * 将 require(cond, "msg") 转为 if (!cond) revert Staking_R(); 以缩小部署 bytecode
 * 仅处理 StakingContract.sol 中单行的 require（本仓库当前均满足）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "../contracts/StakingContract.sol");
let s = fs.readFileSync(file, "utf8");

if (!s.includes("error Staking_R();")) {
  s = s.replace(
    "pragma solidity ^0.8.24;\n",
    "pragma solidity ^0.8.24;\n\n/// @dev 紧凑 revert，避免主网 24KB 限制\nerror Staking_R();\n"
  );
}

function transformLine(line) {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith("require(")) return line;

  const idx = line.indexOf("require(");
  const prefix = line.slice(0, idx);
  let i = idx + "require(".length;
  let depth = 1;
  const start = i;
  while (i < line.length && depth > 0) {
    const c = line[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    i++;
  }
  // i now past closing paren of require(...)
  if (depth !== 0) return line;
  const inner = line.slice(start, i - 1);
  const commaAt = topLevelComma(inner);
  if (commaAt < 0) return line;
  const cond = inner.slice(0, commaAt).trim();
  const rest = inner.slice(commaAt + 1).trim();
  const m = rest.match(/^"[^"]*"\s*$/);
  if (!m) return line;
  const suffix = line.slice(i).replace(/^\s*;\s*/, "");
  return `${prefix}if (!(${cond})) revert Staking_R();${suffix ? " " + suffix : ""}`;
}

function topLevelComma(str) {
  let d = 0;
  for (let k = 0; k < str.length; k++) {
    const c = str[k];
    if (c === "(") d++;
    else if (c === ")") d--;
    else if (c === "," && d === 0) return k;
  }
  return -1;
}

const out = s
  .split("\n")
  .map(transformLine)
  .join("\n");

fs.writeFileSync(file, out, "utf8");
console.log("Updated", file);
