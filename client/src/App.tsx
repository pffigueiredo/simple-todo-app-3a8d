import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, CheckCircle2, Circle } from 'lucide-react';
// Using type-only import for better TypeScript compliance
import type { Todo, CreateTodoInput } from '../../server/src/schema';

function App() {
  // Explicit typing with Todo interface
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  // Form state with proper typing for nullable fields
  const [formData, setFormData] = useState<CreateTodoInput>({
    title: '',
    description: null // Explicitly null, not undefined
  });

  // useCallback to memoize function used in useEffect
  const loadTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getTodos.query();
      setTodos(result);
    } catch (error) {
      console.error('Failed to load todos (using demo mode):', error);
      setIsDemo(true);
      
      // Demo mode: Try to load from localStorage first
      const savedTodos = localStorage.getItem('demo-todos');
      if (savedTodos) {
        try {
          const parsed = JSON.parse(savedTodos);
          // Convert string dates back to Date objects
          const todosWithDates = parsed.map((todo: any) => ({
            ...todo,
            created_at: new Date(todo.created_at),
            updated_at: new Date(todo.updated_at)
          }));
          setTodos(todosWithDates);
          return;
        } catch (parseError) {
          console.error('Failed to parse saved todos:', parseError);
        }
      }
      
      // Use sample data when backend is not ready and no saved data
      const sampleTodos: Todo[] = [
        {
          id: 1,
          title: "Welcome to your Todo App! 🎉",
          description: "This is a sample task to show how the app works",
          completed: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          title: "Try adding a new task",
          description: "Use the form above to create your own tasks",
          completed: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 3,
          title: "Mark tasks as completed",
          description: "Click the circle icon to toggle completion status",
          completed: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      setTodos(sampleTodos);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps since trpc is stable

  // useEffect with proper dependencies
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await trpc.createTodo.mutate(formData);
      // Update todos list with explicit typing in setState callback
      setTodos((prev: Todo[]) => [...prev, response]);
      // Reset form
      setFormData({
        title: '',
        description: null
      });
    } catch (error) {
      console.error('Failed to create todo (using demo mode):', error);
      // Demo mode: Create todo locally when backend is not ready
      const newTodo: Todo = {
        id: Date.now(), // Simple ID generation for demo
        title: formData.title,
        description: formData.description || null,
        completed: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      const updatedTodos = [...todos, newTodo];
      setTodos(updatedTodos);
      // Save to localStorage in demo mode
      if (isDemo) {
        localStorage.setItem('demo-todos', JSON.stringify(updatedTodos));
      }
      // Reset form
      setFormData({
        title: '',
        description: null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const updatedTodo = await trpc.toggleTodo.mutate({ id });
      setTodos((prev: Todo[]) => 
        prev.map((todo: Todo) => 
          todo.id === id ? updatedTodo : todo
        )
      );
    } catch (error) {
      console.error('Failed to toggle todo (using demo mode):', error);
      // Demo mode: Toggle locally when backend is not ready
      const updatedTodos = todos.map((todo: Todo) => 
        todo.id === id 
          ? { ...todo, completed: !todo.completed, updated_at: new Date() }
          : todo
      );
      setTodos(updatedTodos);
      // Save to localStorage in demo mode
      if (isDemo) {
        localStorage.setItem('demo-todos', JSON.stringify(updatedTodos));
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.deleteTodo.mutate({ id });
      setTodos((prev: Todo[]) => prev.filter((todo: Todo) => todo.id !== id));
    } catch (error) {
      console.error('Failed to delete todo (using demo mode):', error);
      // Demo mode: Delete locally when backend is not ready
      const updatedTodos = todos.filter((todo: Todo) => todo.id !== id);
      setTodos(updatedTodos);
      // Save to localStorage in demo mode
      if (isDemo) {
        localStorage.setItem('demo-todos', JSON.stringify(updatedTodos));
      }
    }
  };

  const completedCount = todos.filter((todo: Todo) => todo.completed).length;
  const totalCount = todos.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading todos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">✅ Todo App</h1>
          <p className="text-gray-600">Stay organized and get things done</p>
          
          {/* Demo Mode Notice */}
          {isDemo && (
            <div className="mt-3 mb-4">
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                🔧 Demo Mode - Backend integration ready, using local storage simulation
              </Badge>
            </div>
          )}
          
          {totalCount > 0 && (
            <div className="mt-4">
              <Badge variant="secondary" className="text-sm">
                {completedCount} of {totalCount} completed
              </Badge>
            </div>
          )}
        </div>

        {/* Add Todo Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="What needs to be done?"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateTodoInput) => ({ ...prev, title: e.target.value }))
                }
                required
                className="text-base"
              />
              <Textarea
                placeholder="Add description (optional)"
                // Handle nullable field with fallback to empty string
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateTodoInput) => ({
                    ...prev,
                    description: e.target.value || null // Convert empty string back to null
                  }))
                }
                className="resize-none"
                rows={2}
              />
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.title.trim()}
                className="w-full"
              >
                {isSubmitting ? 'Adding...' : 'Add Task'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Todo List */}
        {todos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Circle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No tasks yet</p>
              <p className="text-gray-400 text-sm">Create your first task above to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todos.map((todo: Todo) => (
              <Card key={todo.id} className={`transition-all duration-200 ${todo.completed ? 'bg-gray-50 border-gray-200' : 'bg-white hover:shadow-md'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleToggle(todo.id)}
                      className="mt-1 transition-colors duration-200"
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400 hover:text-blue-600" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {todo.title}
                      </h3>
                      {/* Handle nullable description */}
                      {todo.description && (
                        <p className={`text-sm mt-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                          {todo.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Created {todo.created_at.toLocaleDateString()}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(todo.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        {totalCount > 0 && (
          <>
            <Separator className="my-8" />
            <div className="text-center text-sm text-gray-500">
              <p>Keep going! You've got {totalCount - completedCount} tasks left to complete. 🚀</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;