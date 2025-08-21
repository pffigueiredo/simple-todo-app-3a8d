import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type DeleteTodoInput } from '../schema';
import { deleteTodo } from '../handlers/delete_todo';

describe('deleteTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing todo', async () => {
    // Create a test todo first
    const insertResult = await db.insert(todosTable)
      .values({
        title: 'Test Todo',
        description: 'A todo for testing deletion',
        completed: false
      })
      .returning()
      .execute();

    const todoId = insertResult[0].id;

    // Delete the todo
    const deleteInput: DeleteTodoInput = { id: todoId };
    const result = await deleteTodo(deleteInput);

    // Should return success
    expect(result.success).toBe(true);

    // Verify the todo is actually deleted from database
    const remainingTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, todoId))
      .execute();

    expect(remainingTodos).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent todo', async () => {
    // Try to delete a todo that doesn't exist
    const deleteInput: DeleteTodoInput = { id: 999999 };
    const result = await deleteTodo(deleteInput);

    // Should return success: false since no rows were affected
    expect(result.success).toBe(false);
  });

  it('should not affect other todos when deleting one', async () => {
    // Create multiple test todos
    const insertResults = await db.insert(todosTable)
      .values([
        { title: 'Todo 1', description: 'First todo', completed: false },
        { title: 'Todo 2', description: 'Second todo', completed: true },
        { title: 'Todo 3', description: 'Third todo', completed: false }
      ])
      .returning()
      .execute();

    const todoToDelete = insertResults[1]; // Delete the second todo

    // Delete one specific todo
    const deleteInput: DeleteTodoInput = { id: todoToDelete.id };
    const result = await deleteTodo(deleteInput);

    // Should succeed
    expect(result.success).toBe(true);

    // Verify only the targeted todo was deleted
    const remainingTodos = await db.select()
      .from(todosTable)
      .execute();

    expect(remainingTodos).toHaveLength(2);
    
    // Verify the correct todo was deleted
    const deletedTodoExists = remainingTodos.some(todo => todo.id === todoToDelete.id);
    expect(deletedTodoExists).toBe(false);

    // Verify the other todos still exist
    const otherTodosExist = remainingTodos.every(todo => 
      todo.id === insertResults[0].id || todo.id === insertResults[2].id
    );
    expect(otherTodosExist).toBe(true);
  });

  it('should handle database constraints properly', async () => {
    // Create and delete a todo to test proper database interaction
    const insertResult = await db.insert(todosTable)
      .values({
        title: 'Constraint Test Todo',
        description: null, // Test nullable description
        completed: true
      })
      .returning()
      .execute();

    const todoId = insertResult[0].id;

    // Verify the todo exists before deletion
    const beforeDelete = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, todoId))
      .execute();

    expect(beforeDelete).toHaveLength(1);
    expect(beforeDelete[0].title).toBe('Constraint Test Todo');

    // Delete the todo
    const deleteInput: DeleteTodoInput = { id: todoId };
    const result = await deleteTodo(deleteInput);

    expect(result.success).toBe(true);

    // Verify complete removal
    const afterDelete = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, todoId))
      .execute();

    expect(afterDelete).toHaveLength(0);
  });
});