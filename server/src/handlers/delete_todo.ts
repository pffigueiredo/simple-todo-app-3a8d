import { db } from '../db';
import { todosTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type DeleteTodoInput } from '../schema';

export const deleteTodo = async (input: DeleteTodoInput): Promise<{ success: boolean }> => {
  try {
    // Delete the todo by ID
    const result = await db.delete(todosTable)
      .where(eq(todosTable.id, input.id))
      .execute();

    // Check if any rows were affected (todo existed and was deleted)
    const success = (result.rowCount ?? 0) > 0;
    
    return { success };
  } catch (error) {
    console.error('Todo deletion failed:', error);
    throw error;
  }
};