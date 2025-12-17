import Dexie, { Table } from 'dexie';
import { GameSession, Turn } from './types';

class GameDatabase extends Dexie {
  sessions!: Table<GameSession>;
  turns!: Table<Turn>;

  constructor() {
    super('ThienDaoDB');
    (this as any).version(1).stores({
      sessions: '++id, createdAt',
      turns: '++id, sessionId, turnIndex, [sessionId+turnIndex]'
    });
  }
}

export const db = new GameDatabase();

// --- Vector Math Helpers for Client-Side RAG ---

/**
 * Calculates Cosine Similarity between two vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Finds the top K most similar turns based on the query vector.
 * Returns both the Turn and the similarity Score for debugging.
 * 
 * @param maxTurnIndex - The current turn index. We only search turns BEFORE this index (strictly past memories).
 */
export async function findRelevantContext(
  sessionId: number, 
  queryVector: number[], 
  maxTurnIndex: number,
  topK: number = 3
): Promise<{ turn: Turn; score: number }[]> {
  // Fetch all turns for this session that have an embedding AND are from the past
  // We strictly filter turnIndex < maxTurnIndex to ensure we don't pick up "future" turns 
  // (e.g. if we are regenerating turn 5, we shouldn't see old data from turn 6 that hasn't been deleted yet)
  const allTurns = await db.turns
    .where('sessionId')
    .equals(sessionId)
    .filter(turn => 
      !!turn.embedding && 
      !!turn.narrative && 
      turn.turnIndex < maxTurnIndex
    )
    .toArray();

  if (allTurns.length === 0) return [];

  // Calculate scores
  const scoredTurns = allTurns.map(turn => ({
    turn,
    score: cosineSimilarity(queryVector, turn.embedding!)
  }));

  // Sort descending
  scoredTurns.sort((a, b) => b.score - a.score);

  // Return top K with scores
  return scoredTurns.slice(0, topK);
}