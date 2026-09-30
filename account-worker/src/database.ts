/** Log operation names and aggregate D1 metadata only; never SQL, bindings, IDs or user content. */
export async function databaseBatch<T>(db: D1Database, operation: string, statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
  const start = performance.now();
  try {
    const results = await db.batch<T>(statements);
    console.info(JSON.stringify({ event: "database_batch", operation, statements: statements.length,
      elapsedMs: Math.round(performance.now() - start),
      rowsRead: results.reduce((sum, result) => sum + (result.meta?.rows_read ?? 0), 0),
      rowsWritten: results.reduce((sum, result) => sum + (result.meta?.rows_written ?? 0), 0), success: true }));
    return results;
  } catch (error) {
    console.info(JSON.stringify({ event: "database_batch", operation, statements: statements.length, elapsedMs: Math.round(performance.now() - start), success: false }));
    throw error;
  }
}

export async function databaseAll<T>(operation: string, statement: D1PreparedStatement): Promise<D1Result<T>> {
  const start = performance.now();
  const result = await statement.all<T>();
  console.info(JSON.stringify({ event: "database_query", operation, elapsedMs: Math.round(performance.now() - start),
    rowsRead: result.meta?.rows_read ?? 0, rowsWritten: result.meta?.rows_written ?? 0 }));
  return result;
}
