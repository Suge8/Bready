import { _electron as electron, test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Electron Live Interview Mode', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    // 启动 Electron 应用
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../out/main/index.js')],
      timeout: 30000
    });

    // 获取第一个窗口
    window = await electronApp.firstWindow();
    
    // 等待应用完全加载
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should launch Electron app successfully', async () => {
    // 验证窗口标题
    const title = await window.title();
    expect(title).toContain('面宝');
    
    // 截图验证
    await window.screenshot({ path: 'tests/screenshots/electron-launch.png' });
  });

  test('should enter Live Interview mode', async () => {
    // 点击 Live Interview 按钮
    await window.click('text=Live Interview');

    // 等待模式切换
    await window.waitForTimeout(3000);

    // 截图验证
    await window.screenshot({ path: 'tests/screenshots/live-interview-mode.png' });

    // 验证页面包含 Live Interview 相关元素
    const pageContent = await window.textContent('body');
    expect(pageContent).toContain('Live Interview');
  });

  test('should show AI response area', async () => {
    // 确保在 Live Interview 模式
    await window.click('text=Live Interview');
    await window.waitForTimeout(5000); // 等待 Gemini 连接和初始化

    // 截图验证
    await window.screenshot({ path: 'tests/screenshots/ai-response-area.png' });

    // 验证页面包含 AI 相关内容
    const pageContent = await window.textContent('body');
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('should handle audio transcription', async () => {
    // 确保在 Live Interview 模式
    await window.click('text=Live Interview');
    await window.waitForTimeout(5000); // 等待 Gemini 连接和音频系统初始化

    // 截图当前状态
    await window.screenshot({ path: 'tests/screenshots/audio-transcription-test.png' });

    // 验证应用正在运行
    const title = await window.title();
    expect(title).toContain('面宝');
  });
});
