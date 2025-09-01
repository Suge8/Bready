/// <reference types="vitest" />
import { buildUpdateSetClause } from '../sql'

describe.skip('buildUpdateSetClause', () => {
  it('应当忽略 undefined 字段并从给定索引开始编号', () => {
    const { setClause, values } = buildUpdateSetClause({ a: 1, b: undefined, c: 'x' }, 3)
    expect(setClause).toBe('a = $3, c = $4')
    expect(values).toEqual([1, 'x'])
  })

  it('应当拼接额外片段', () => {
    const { setClause, values } = buildUpdateSetClause({ name: 'n' }, 1, ['updated_at = NOW()'])
    expect(setClause).toBe('name = $1, updated_at = NOW()')
    expect(values).toEqual(['n'])
  })
})


