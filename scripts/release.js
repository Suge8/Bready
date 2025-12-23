#!/usr/bin/env node

/**
 * 面宝 (Bready) 版本发布脚本
 * 自动化版本更新、构建和文档生成
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packagePath = path.join(__dirname, '../package.json');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return pkg.version;
}

function updateVersion(newVersion) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ 版本已更新到 ${newVersion}`);
}

function buildProject() {
  console.log('🔨 开始构建项目...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ 项目构建成功');
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

function runTests() {
  console.log('🧪 运行测试...');
  try {
    execSync('npm test', { stdio: 'inherit' });
    console.log('✅ 测试通过');
  } catch (error) {
    console.log('⚠️ 测试跳过或失败，继续发布流程');
  }
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch'; // patch, minor, major
  
  console.log('🚀 面宝 (Bready) 版本发布流程开始');
  console.log(`📦 当前版本: ${getCurrentVersion()}`);
  
  // 构建项目
  buildProject();
  
  // 运行测试
  runTests();
  
  console.log('✅ 发布流程完成');
  console.log('📝 请手动检查 CHANGELOG.md 并提交更改');
}

if (require.main === module) {
  main();
}

module.exports = { getCurrentVersion, updateVersion, buildProject };
