import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Users, Plus, Trash2, CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:5004/api';
const SOCKET_URL = 'http://localhost:5004';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export default function App() {
  const [socket, setSocket] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(true);
  const [username, setUsername] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' });
  const [showAddTask, setShowAddTask] = useState(false);
  const [filter, setFilter] = useState('all');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('task-created', (task) => {
      setTasks(prev => [task, ...prev]);
      showNotification(`New task added: ${task.title}`);
    });

    socket.on('task-updated', (task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      showNotification(`Task updated: ${task.title}`);
    });

    socket.on('task-deleted', ({ id }) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      showNotification('Task deleted');
    });

    socket.on('users-update', (users) => {
      setActiveUsers(users);
    });

    return () => {
      socket.off('task-created');
      socket.off('task-updated');
      socket.off('task-deleted');
      socket.off('users-update');
    };
  }, [socket]);

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [currentUser]);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleJoin = () => {
    if (username.trim()) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const user = { username: username.trim(), color, socketId: socket.id };
      setCurrentUser(user);
      socket.emit('user-join', user);
      setShowUserModal(false);
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      await axios.post(`${API_URL}/tasks`, {
        ...newTask,
        status: 'todo',
        assigned_user: currentUser.username,
        user_color: currentUser.color
      });
      setNewTask({ title: '', description: '', priority: 'medium' });
      setShowAddTask(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const updateTaskStatus = async (task, newStatus) => {
    try {
      await axios.put(`${API_URL}/tasks/${task.id}`, {
        ...task,
        status: newStatus,
        assigned_user: currentUser.username,
        user_color: currentUser.color
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`${API_URL}/tasks/${id}`);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const getFilteredTasks = () => {
    if (filter === 'all') return tasks;
    return tasks.filter(t => t.status === filter);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress': return <Clock className="w-5 h-5 text-blue-500" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-red-500';
      case 'medium': return 'border-l-4 border-yellow-500';
      default: return 'border-l-4 border-green-500';
    }
  };

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length
  };

  if (showUserModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">CollabTask</h1>
            <p className="text-gray-600">Real-time Collaborative Todo List</p>
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="Enter your name..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none mb-4"
          />
          <button
            onClick={handleJoin}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Join Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
      {notification && (
        <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 animate-bounce">
          <p className="text-gray-800">{notification}</p>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">CollabTask</h1>
              <p className="text-gray-600">Welcome, {currentUser?.username}!</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-800">{activeUsers.length} Online</span>
              </div>
              <button
                onClick={() => setShowAddTask(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition"
              >
                <Plus className="w-5 h-5" />
                Add Task
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto">
            {activeUsers.map((user, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm whitespace-nowrap"
                style={{ backgroundColor: user.color }}
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                {user.username}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Todo</p>
                <p className="text-2xl font-bold text-gray-800">{stats.todo}</p>
              </div>
              <Circle className="w-10 h-10 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">In Progress</p>
                <p className="text-2xl font-bold text-gray-800">{stats.inProgress}</p>
              </div>
              <Clock className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-2xl font-bold text-gray-800">{stats.done}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {['all', 'todo', 'in-progress', 'done'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                  filter === f
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {getFilteredTasks().map((task) => (
              <div
                key={task.id}
                className={`bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition ${getPriorityColor(task.priority)}`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(task.status)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 text-lg">{task.title}</h3>
                      {task.description && (
                        <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span
                          className="text-xs px-2 py-1 rounded-full text-white"
                          style={{ backgroundColor: task.user_color }}
                        >
                          {task.assigned_user}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{task.priority} priority</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task, e.target.value)}
                      className="text-sm border-2 border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                    >
                      <option value="todo">Todo</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getFilteredTasks().length === 0 && (
            <div className="text-center py-12">
              <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No tasks found</p>
            </div>
          )}
        </div>
      </div>

      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Task</h2>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Task title..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none mb-3"
            />
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Description (optional)..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none mb-3 resize-none"
              rows="3"
            />
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none mb-4"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddTask(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}