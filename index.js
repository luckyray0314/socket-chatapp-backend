const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
// const fileURLToPath = require('url');
// const dirname = require('path');


const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Store connected users and their socket IDs
const users = new Map();
const userSockets = new Map(); // Map userId to socketId

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user:join', ({ userId, username }) => {
    users.set(socket.id, { userId, username });
    userSockets.set(userId, socket.id);
    io.emit('user:list', Array.from(users.values()));
  });

  socket.on('message:send', (message) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    const messageWithSender = {
      ...message,
      channelId: message.channelId, // Ensure channelId is included
      sender: {
        userId: sender.userId,
        username: sender.username,
        name: sender.username,
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop"
      },
      timestamp: new Date().toLocaleTimeString()
    };

    // If channelId is a user ID (for DMs)
    if (message.channelId.match(/^[12]$/)) {
      const recipientSocketId = userSockets.get(message.channelId);
      // Send to sender
      socket.emit('message:receive', messageWithSender);
      // Send to recipient only if they're connected
      if (recipientSocketId && recipientSocketId !== socket.id) {
        io.to(recipientSocketId).emit('message:receive', messageWithSender);
      }
    } else {
      // It's a channel message, broadcast to the channel
      io.to(message.channelId).emit('message:receive', messageWithSender);
    }
  });

  socket.on('typing:start', ({ channelId }) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (channelId.match(/^[12]$/)) {
      const recipientSocketId = userSockets.get(channelId);
      if (recipientSocketId && recipientSocketId !== socket.id) {
        io.to(recipientSocketId).emit('typing:update', {
          userId: user.userId,
          username: user.username,
          isTyping: true
        });
      }
    } else {
      socket.to(channelId).emit('typing:update', {
        userId: user.userId,
        username: user.username,
        isTyping: true
      });
    }
  });

  socket.on('typing:stop', ({ channelId }) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (channelId.match(/^[12]$/)) {
      const recipientSocketId = userSockets.get(channelId);
      if (recipientSocketId && recipientSocketId !== socket.id) {
        io.to(recipientSocketId).emit('typing:update', {
          userId: user.userId,
          username: user.username,
          isTyping: false
        });
      }
    } else {
      socket.to(channelId).emit('typing:update', {
        userId: user.userId,
        username: user.username,
        isTyping: false
      });
    }
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      userSockets.delete(user.userId);
    }
    users.delete(socket.id);
    io.emit('user:list', Array.from(users.values()));
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});