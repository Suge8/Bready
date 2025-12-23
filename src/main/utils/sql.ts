export interface UpdateClauseResult {
  setClause: string
  values: any[]
}

// 构造 SQL 更新语句的 SET 子句与对应的值列表
export function buildUpdateSetClause(
  updates: Record<string, any>,
  startParamIndex = 1,
  extraFragments: string[] = [],
): UpdateClauseResult {
  const setParts: string[] = []
  const values: any[] = []

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue
    setParts.push(`${key} = $${startParamIndex + values.length}`)
    values.push(value)
  }

  if (extraFragments.length > 0) {
    setParts.push(...extraFragments)
  }

  return {
    setClause: setParts.join(', '),
    values,
  }
}




