const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.static("public")); // Serve static files from 'public' directory

app.get("/", (req, res) => {
    res.send("Hello, world!");
});

// Setup Websocket
let users = [];

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const id = 123456;

  if (token == undefined) {
    console.log("fuck u");
  } else if (token != id) {
    console.log("fuck u two");
  } else {
    next();
  }
});

io.on("connection", (socket) => {
  console.log(socket.handshake.query.name + " connected!");
  io.emit("connection notification", socket.handshake.query.name);

  socket.on("disconnect", () => {
    socket.broadcast.emit("finish typing", socket.handshake.query.name);
    console.log(socket.handshake.query.name + " disconnected!");
    io.emit("disconnection notification", socket.handshake.query.name);
  });

  socket.on("chat message", (msg) => {
    console.log("message: " + msg);
    io.emit("chat message", msg); // Broadcast message to all clients
  });

  socket.on("chat message", (msg) => {
    socket.broadcast.emit("chat message", msg);
  });
  socket.on("typing", () => {
    socket.broadcast.emit("typing", socket.handshake.query.name);
  });
  socket.on("finish typing", () => {
    socket.broadcast.emit("finish typing", socket.handshake.query.name);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
