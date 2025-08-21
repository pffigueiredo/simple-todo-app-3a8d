import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type UpdateTodoInput, type CreateTodoInput } from '../schema';
import { updateTodo } from '../handlers/update_todo';
import { eq } from 'drizzle-orm';

describe('updateTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test todo
  const createTestTodo = async (data: Partial<CreateTodoInput> = {}) => {
    const todoData = {
      title: 'Test Todo',
      description: 'Test Description',
      ...data
    };

    const result = await db.insert(todosTable)
      .values(todoData)
      .returning()
      .execute();

    return result[0];
  };

  it('should update todo title only', async () => {
    const testTodo = await createTestTodo();
    
    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      title: 'Updated Title'
    };

    const result = await updateTodo(updateInput);

    expect(result.id).toEqual(testTodo.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual(testTodo.description); // Should remain unchanged
    expect(result.completed).toEqual(testTodo.completed); // Should remain unchanged
    expect(result.created_at).toEqual(testTodo.created_at); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testTodo.updated_at).toBe(true); // Should be updated
  });

  it('should update todo description only', async () => {
    const testTodo = await createTestTodo();
    
    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      description: 'Updated Description'
    };

    const result = await updateTodo(updateInput);

    expect(result.id).toEqual(testTodo.id);
    expect(result.title).toEqual(testTodo.title); // Should remain unchanged
    expect(result.description).toEqual('Updated Description');
    expect(result.completed).toEqual(testTodo.completed); // Should remain unchanged
    expect(result.updated_at > testTodo.updated_at).toBe(true); // Should be updated
  });

  it('should update todo completion status only', async () => {
    const testTodo = await createTestTodo();
    
    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      completed: true
    };

    const result = await updateTodo(updateInput);

    expect(result.id).toEqual(testTodo.id);
    expect(result.title).toEqual(testTodo.title); // Should remain unchanged
    expect(result.description).toEqual(testTodo.description); // Should remain unchanged
    expect(result.completed).toEqual(true);
    expect(result.updated_at > testTodo.updated_at).toBe(true); // Should be updated
  });

  it('should update multiple fields at once', async () => {
    const testTodo = await createTestTodo();
    
    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      title: 'Updated Title',
      description: 'Updated Description',
      completed: true
    };

    const result = await updateTodo(updateInput);

    expect(result.id).toEqual(testTodo.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Updated Description');
    expect(result.completed).toEqual(true);
    expect(result.created_at).toEqual(testTodo.created_at); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testTodo.updated_at).toBe(true); // Should be updated
  });

  it('should set description to null', async () => {
    const testTodo = await createTestTodo({ description: 'Original Description' });
    
    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      description: null
    };

    const result = await updateTodo(updateInput);

    expect(result.id).toEqual(testTodo.id);
    expect(result.description).toBeNull();
    expect(result.title).toEqual(testTodo.title); // Should remain unchanged
    expect(result.completed).toEqual(testTodo.completed); // Should remain unchanged
  });

  it('should persist changes in database', async () => {
    const testTodo = await createTestTodo();
    
    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      title: 'Updated Title',
      completed: true
    };

    await updateTodo(updateInput);

    // Verify changes are persisted in database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, testTodo.id))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toEqual('Updated Title');
    expect(todos[0].completed).toEqual(true);
    expect(todos[0].description).toEqual(testTodo.description); // Should remain unchanged
    expect(todos[0].updated_at > testTodo.updated_at).toBe(true); // Should be updated
  });

  it('should throw error when todo does not exist', async () => {
    const updateInput: UpdateTodoInput = {
      id: 999, // Non-existent ID
      title: 'Updated Title'
    };

    await expect(updateTodo(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle todo with null description', async () => {
    const testTodo = await createTestTodo({ description: null });
    
    const updateInput: UpdateTodoInput = {
      id: testTodo.id,
      title: 'Updated Title'
    };

    const result = await updateTodo(updateInput);

    expect(result.id).toEqual(testTodo.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toBeNull(); // Should remain null
    expect(result.completed).toEqual(testTodo.completed); // Should remain unchanged
  });

  it('should only update updated_at when no other fields provided', async () => {
    const testTodo = await createTestTodo();
    
    const updateInput: UpdateTodoInput = {
      id: testTodo.id
    };

    const result = await updateTodo(updateInput);

    expect(result.id).toEqual(testTodo.id);
    expect(result.title).toEqual(testTodo.title); // Should remain unchanged
    expect(result.description).toEqual(testTodo.description); // Should remain unchanged
    expect(result.completed).toEqual(testTodo.completed); // Should remain unchanged
    expect(result.created_at).toEqual(testTodo.created_at); // Should remain unchanged
    expect(result.updated_at > testTodo.updated_at).toBe(true); // Should be updated
  });
});