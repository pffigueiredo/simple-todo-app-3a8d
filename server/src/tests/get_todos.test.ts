import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { getTodos } from '../handlers/get_todos';

describe('getTodos', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no todos exist', async () => {
    const result = await getTodos();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all todos from database', async () => {
    // Create test todos
    await db.insert(todosTable)
      .values([
        {
          title: 'First Todo',
          description: 'First todo description',
          completed: false
        },
        {
          title: 'Second Todo',
          description: null,
          completed: true
        },
        {
          title: 'Third Todo',
          description: 'Third todo description',
          completed: false
        }
      ])
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(3);
    
    // Check that all expected todos are present
    const titles = result.map(todo => todo.title);
    expect(titles).toContain('First Todo');
    expect(titles).toContain('Second Todo');
    expect(titles).toContain('Third Todo');

    // Verify structure of first todo
    const firstTodo = result.find(todo => todo.title === 'First Todo');
    expect(firstTodo).toBeDefined();
    expect(firstTodo!.description).toEqual('First todo description');
    expect(firstTodo!.completed).toEqual(false);
    expect(firstTodo!.id).toBeDefined();
    expect(firstTodo!.created_at).toBeInstanceOf(Date);
    expect(firstTodo!.updated_at).toBeInstanceOf(Date);

    // Verify todo with null description
    const secondTodo = result.find(todo => todo.title === 'Second Todo');
    expect(secondTodo).toBeDefined();
    expect(secondTodo!.description).toBeNull();
    expect(secondTodo!.completed).toEqual(true);

    // Verify completed status variety
    const completedTodos = result.filter(todo => todo.completed);
    const incompleteTodos = result.filter(todo => !todo.completed);
    expect(completedTodos).toHaveLength(1);
    expect(incompleteTodos).toHaveLength(2);
  });

  it('should return todos ordered by creation date (newest first)', async () => {
    // Create todos with slight delay to ensure different timestamps
    await db.insert(todosTable)
      .values({
        title: 'Oldest Todo',
        description: 'Created first',
        completed: false
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(todosTable)
      .values({
        title: 'Middle Todo',
        description: 'Created second',
        completed: false
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(todosTable)
      .values({
        title: 'Newest Todo',
        description: 'Created last',
        completed: false
      })
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(3);
    
    // Verify ordering - newest first
    expect(result[0].title).toEqual('Newest Todo');
    expect(result[1].title).toEqual('Middle Todo');
    expect(result[2].title).toEqual('Oldest Todo');

    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should handle todos with various field values', async () => {
    // Create todo with minimal data
    await db.insert(todosTable)
      .values({
        title: 'Minimal Todo',
        // description is optional, completed has default false
      })
      .execute();

    // Create todo with all fields
    await db.insert(todosTable)
      .values({
        title: 'Complete Todo',
        description: 'Full description here',
        completed: true
      })
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(2);

    // Check minimal todo uses defaults
    const minimalTodo = result.find(todo => todo.title === 'Minimal Todo');
    expect(minimalTodo).toBeDefined();
    expect(minimalTodo!.description).toBeNull(); // Default null
    expect(minimalTodo!.completed).toEqual(false); // Default false
    expect(minimalTodo!.created_at).toBeInstanceOf(Date);
    expect(minimalTodo!.updated_at).toBeInstanceOf(Date);

    // Check complete todo
    const completeTodo = result.find(todo => todo.title === 'Complete Todo');
    expect(completeTodo).toBeDefined();
    expect(completeTodo!.description).toEqual('Full description here');
    expect(completeTodo!.completed).toEqual(true);
  });

  it('should return todos with correct data types', async () => {
    await db.insert(todosTable)
      .values({
        title: 'Type Check Todo',
        description: 'Check all types',
        completed: true
      })
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(1);
    const todo = result[0];

    // Verify all field types
    expect(typeof todo.id).toBe('number');
    expect(typeof todo.title).toBe('string');
    expect(typeof todo.description).toBe('string');
    expect(typeof todo.completed).toBe('boolean');
    expect(todo.created_at).toBeInstanceOf(Date);
    expect(todo.updated_at).toBeInstanceOf(Date);
  });
});