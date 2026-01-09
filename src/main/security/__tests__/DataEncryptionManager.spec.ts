/// <reference types="vitest" />
import { DataEncryptionManager } from '../DataEncryptionManager'

describe.skip('DataEncryptionManager', () => {
  it('encrypt/decrypt 应该保持数据一致', () => {
    const mgr = new DataEncryptionManager()
    const secret = 'password-123'
    const data = 'hello-world'
    const enc = mgr.encrypt(data, secret)
    const dec = mgr.decrypt(enc, secret)
    expect(dec).toBe(data)
  })

  it('encryptObject/decryptObject 应该保持对象一致', () => {
    const mgr = new DataEncryptionManager()
    const secret = 'password-123'
    const obj = { a: 1, b: 'x' }
    const enc = mgr.encryptObject(obj, secret)
    const dec = mgr.decryptObject<typeof obj>(enc, secret)
    expect(dec).toEqual(obj)
  })
})
