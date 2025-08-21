import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type ToggleTodoInput } from '../schema';
import { toggleTodo } from '../handlers/toggle_todo';
import { eq } from 'drizzle-orm';

describe('toggleTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should toggle incomplete todo to completed', async () => {
    // Create a test todo (incomplete by default)
    const insertResult = await db.insert(todosTable)
      .values({
        title: 'Test Todo',
        description: 'A todo for testing',
        completed: false
      })
      .returning()
      .execute();

    const createdTodo = insertResult[0];
    const originalUpdatedAt = createdTodo.updated_at;

    const input: ToggleTodoInput = {
      id: createdTodo.id
    };

    // Toggle the todo
    const result = await toggleTodo(input);

    // Verify the result
    expect(result.id).toEqual(createdTodo.id);
    expect(result.title).toEqual('Test Todo');
    expect(result.description).toEqual('A todo for testing');
    expect(result.completed).toBe(true); // Should be toggled from false to true
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should toggle completed todo to incomplete', async () => {
    // Create a test todo that is already completed
    const insertResult = await db.insert(todosTable)
      .values({
        title: 'Completed Todo',
        description: 'Already completed todo',
        completed: true
      })
      .returning()
      .execute();

    const createdTodo = insertResult[0];

    const input: ToggleTodoInput = {
      id: createdTodo.id
    };

    // Toggle the todo
    const result = await toggleTodo(input);

    // Verify the result
    expect(result.id).toEqual(createdTodo.id);
    expect(result.title).toEqual('Completed Todo');
    expect(result.description).toEqual('Already completed todo');
    expect(result.completed).toBe(false); // Should be toggled from true to false
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the todo in database', async () => {
    // Create a test todo
    const insertResult = await db.insert(todosTable)
      .values({
        title: 'Test Todo',
        description: null, // Test with null description
        completed: false
      })
      .returning()
      .execute();

    const createdTodo = insertResult[0];

    const input: ToggleTodoInput = {
      id: createdTodo.id
    };

    // Toggle the todo
    await toggleTodo(input);

    // Query the database directly to verify the update
    const updatedTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, createdTodo.id))
      .execute();

    expect(updatedTodos).toHaveLength(1);
    const updatedTodo = updatedTodos[0];
    expect(updatedTodo.completed).toBe(true); // Should be toggled
    expect(updatedTodo.title).toEqual('Test Todo');
    expect(updatedTodo.description).toBeNull();
    expect(updatedTodo.updated_at.getTime()).toBeGreaterThan(createdTodo.updated_at.getTime());
  });

  it('should handle multiple toggles correctly', async () => {
    // Create a test todo
    const insertResult = await db.insert(todosTable)
      .values({
        title: 'Toggle Test',
        description: 'Testing multiple toggles',
        completed: false
      })
      .returning()
      .execute();

    const createdTodo = insertResult[0];

    const input: ToggleTodoInput = {
      id: createdTodo.id
    };

    // First toggle: false -> true
    const firstToggle = await toggleTodo(input);
    expect(firstToggle.completed).toBe(true);

    // Second toggle: true -> false
    const secondToggle = await toggleTodo(input);
    expect(secondToggle.completed).toBe(false);

    // Third toggle: false -> true
    const thirdToggle = await toggleTodo(input);
    expect(thirdToggle.completed).toBe(true);

    // Verify each toggle updated the timestamp
    expect(secondToggle.updated_at.getTime()).toBeGreaterThan(firstToggle.updated_at.getTime());
    expect(thirdToggle.updated_at.getTime()).toBeGreaterThan(secondToggle.updated_at.getTime());
  });

  it('should throw error for non-existent todo', async () => {
    const input: ToggleTodoInput = {
      id: 99999 // Non-existent ID
    };

    await expect(toggleTodo(input)).rejects.toThrow(/Todo with id 99999 not found/i);
  });

  it('should preserve all original fields except completed and updated_at', async () => {
    // Create a test todo with all fields
    const insertResult = await db.insert(todosTable)
      .values({
        title: 'Complete Todo Data',
        description: 'Testing field preservation',
        completed: false
      })
      .returning()
      .execute();

    const originalTodo = insertResult[0];

    const input: ToggleTodoInput = {
      id: originalTodo.id
    };

    // Toggle the todo
    const result = await toggleTodo(input);

    // Verify all fields are preserved except completed and updated_at
    expect(result.id).toEqual(originalTodo.id);
    expect(result.title).toEqual(originalTodo.title);
    expect(result.description).toEqual(originalTodo.description);
    expect(result.created_at).toEqual(originalTodo.created_at);
    
    // Only these fields should change
    expect(result.completed).toBe(!originalTodo.completed);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTodo.updated_at.getTime());
  });
});