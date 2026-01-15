import { query } from './core'
import type { Preparation } from './types'

export class PreparationService {
  static async getUserPreparations(userId: string): Promise<Preparation[]> {
    const result = await query(
      'SELECT * FROM preparations WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId],
    )
    return result.rows
  }

  static async getById(id: string, userId?: string): Promise<Preparation | null> {
    const sql = userId
      ? 'SELECT * FROM preparations WHERE id = $1 AND user_id = $2'
      : 'SELECT * FROM preparations WHERE id = $1'
    const params = userId ? [id, userId] : [id]
    const result = await query(sql, params)
    return result.rows[0] || null
  }

  static async create(
    userId: string,
    name: string,
    jobDescription?: string,
    resume?: string,
    analysis?: string,
    isAnalyzing = false,
  ): Promise<Preparation> {
    const result = await query(
      `INSERT INTO preparations (user_id, name, job_description, resume, analysis, is_analyzing) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, name, jobDescription, resume || null, analysis || null, isAnalyzing],
    )
    return result.rows[0]
  }

  static async update(
    id: string,
    updates: Record<string, unknown>,
    userId?: string,
  ): Promise<Preparation | null> {
    const allowedFields = ['name', 'job_description', 'resume', 'analysis', 'is_analyzing']
    const setClause: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClause.push(`${field} = $${paramIndex}`)
        values.push(updates[field])
        paramIndex++
      }
    }

    if (setClause.length === 0) return null

    setClause.push('updated_at = NOW()')
    values.push(id)

    const sql = userId
      ? `UPDATE preparations SET ${setClause.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`
      : `UPDATE preparations SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`

    if (userId) values.push(userId)

    const result = await query(sql, values)
    return result.rows[0] || null
  }

  static async delete(id: string, userId?: string): Promise<void> {
    const sql = userId
      ? 'DELETE FROM preparations WHERE id = $1 AND user_id = $2'
      : 'DELETE FROM preparations WHERE id = $1'
    const params = userId ? [id, userId] : [id]
    await query(sql, params)
  }
}
