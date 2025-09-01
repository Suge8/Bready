// 基于 Playwright 的轻量 API 冒烟测试（需要本地 HTTP 服务：npm run dev:api）
// 默认在 CI 跳过；本地手动设置 API_E2E=1 才执行。
import { test, expect, request } from '@playwright/test'

const shouldRun = process.env.API_E2E === '1'

test.describe('HTTP API smoke (auth/preparation)', () => {
  test.skip(!shouldRun, 'Set API_E2E=1 and run `npm run dev:api` to enable')

  test('sign up -> sign in -> verify session', async ({ request }) => {
    const email = `e2e_${Date.now()}@bready.app`
    const password = 'Pass1234!'

    // sign up
    const r1 = await request.post('http://localhost:3001/api/auth/sign-up', {
      data: { args: [{ email, password }] },
    })
    expect(r1.ok()).toBeTruthy()

    // sign in
    const r2 = await request.post('http://localhost:3001/api/auth/sign-in', {
      data: { args: [{ email, password }] },
    })
    expect(r2.ok()).toBeTruthy()
    const { data } = await r2.json()
    expect(data?.token).toBeTruthy()

    // verify
    const r3 = await request.post('http://localhost:3001/api/auth/verify-session', {
      data: { args: [data.token] },
    })
    expect(r3.ok()).toBeTruthy()
  })
})



