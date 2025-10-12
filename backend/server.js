const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3002",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Willy1708',
  database: process.env.DB_NAME || 'collabtask_db',
  port: process.env.DB_PORT || 3308,  // ← TAMBAHKAN BARIS INI
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});



// Store active users
const activeUsers = new Map();

// REST API Endpoints
app.get('/api/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, status, priority, assigned_user, user_color } = req.body;
    const [result] = await pool.query(
      'INSERT INTO tasks (title, description, status, priority, assigned_user, user_color) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, status || 'todo', priority || 'medium', assigned_user, user_color]
    );
    
    const [newTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    
    // Broadcast to all clients
    io.emit('task-created', newTask[0]);
    
    res.json(newTask[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigned_user, user_color } = req.body;
    
    await pool.query(
      'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assigned_user = ?, user_color = ? WHERE id = ?',
      [title, description, status, priority, assigned_user, user_color, id]
    );
    
    const [updatedTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    
    // Broadcast to all clients
    io.emit('task-updated', updatedTask[0]);
    
    res.json(updatedTask[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    
    // Broadcast to all clients
    io.emit('task-deleted', { id: parseInt(id) });
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User joins
  socket.on('user-join', (userData) => {
    activeUsers.set(socket.id, userData);
    io.emit('users-update', Array.from(activeUsers.values()));
    console.log(`User ${userData.username} joined`);
  });

  // Task updates via socket
  socket.on('task-update', async (task) => {
    try {
      await pool.query(
        'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assigned_user = ?, user_color = ? WHERE id = ?',
        [task.title, task.description, task.status, task.priority, task.assigned_user, task.user_color, task.id]
      );
      
      socket.broadcast.emit('task-updated', task);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // User typing indicator
  socket.on('user-typing', (data) => {
    socket.broadcast.emit('user-typing', data);
  });

  // User disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      console.log(`User ${user.username} disconnected`);
      activeUsers.delete(socket.id);
      io.emit('users-update', Array.from(activeUsers.values()));
    }
  });
});

const PORT = process.env.PORT || 5004;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server ready for connections`);
});