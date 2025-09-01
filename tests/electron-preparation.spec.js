import { test, expect } from '@playwright/test'

const shouldRun = process.env.API_E2E === '1'

test.describe('HTTP API smoke (preparation)', () => {
  test.skip(!shouldRun, 'Set API_E2E=1 and run `npm run dev:api` to enable')

  test('create and list preparations', async ({ request }) => {
    const userId = '00000000-0000-0000-0000-000000000001' // 使用已存在的管理员用户或替换
    const create = await request.post('http://localhost:3001/api/preparation/create', {
      data: {
        args: [
          {
            user_id: userId,
            title: 'Smoke Prep',
            company: 'ACME',
            position: 'QA',
            description: 'e2e',
          },
        ],
      },
    })
    expect(create.ok()).toBeTruthy()

    const list = await request.post('http://localhost:3001/api/preparation/get-all', {
      data: { args: [userId] },
    })
    expect(list.ok()).toBeTruthy()
    const body = await list.json()
    expect(Array.isArray(body.data)).toBe(true)
  })
})



