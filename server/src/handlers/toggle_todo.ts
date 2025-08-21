import { db } from '../db';
import { todosTable } from '../db/schema';
import { type ToggleTodoInput, type Todo } from '../schema';
import { eq } from 'drizzle-orm';

export const toggleTodo = async (input: ToggleTodoInput): Promise<Todo> => {
  try {
    // First, fetch the current todo to get its current state
    const existingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, input.id))
      .execute();

    if (existingTodos.length === 0) {
      throw new Error(`Todo with id ${input.id} not found`);
    }

    const currentTodo = existingTodos[0];

    // Update the todo with toggled completed status and new updated_at timestamp
    const result = await db.update(todosTable)
      .set({
        completed: !currentTodo.completed,
        updated_at: new Date()
      })
      .where(eq(todosTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Toggle todo failed:', error);
    throw error;
  }
};