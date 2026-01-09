/// <reference types="vitest" />
import { membershipService } from '@renderer/lib/supabase'

describe.skip('membershipService.calculatePrice', () => {
  it('小白无折扣', () => {
    const { actualPrice, discountRate } = membershipService.calculatePrice(100, '小白')
    expect(actualPrice).toBe(100)
    expect(discountRate).toBe(1)
  })

  it('螺丝钉九折', () => {
    const { actualPrice, discountRate } = membershipService.calculatePrice(100, '螺丝钉')
    expect(actualPrice).toBe(90)
    expect(discountRate).toBe(0.9)
  })

  it('大牛八折', () => {
    const { actualPrice, discountRate } = membershipService.calculatePrice(100, '大牛')
    expect(actualPrice).toBe(80)
    expect(discountRate).toBe(0.8)
  })
})
