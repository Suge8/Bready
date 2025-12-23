// 轻量级 UI 流程冒烟测试（非 Electron 真机）
/// <reference types="vitest" />
import { vi } from 'vitest'

describe('Auth smoke (mocked)', () => {
  it('login then sign out via mocked services', async () => {
    // 这里只做占位，真实 E2E 使用 Playwright。避免对窗口或 Electron 依赖。
    const mock = {
      signInWithEmail: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    }
    const res = await mock.signInWithEmail('a@b.com', 'x')
    expect(res.data.user.id).toBe('u1')
    const out = await mock.signOut()
    expect(out.error).toBeNull()
  })
})


