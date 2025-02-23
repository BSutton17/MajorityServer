const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://majority1.netlify.app",
    methods: ["GET", "POST"],
  },
});

let rooms = {};
let playerAnswers = {};
let playerNames = {};
let disconnectTimers = {}; 

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("startGame", () => {
    io.emit("gameStarted");
  });

  socket.on("broadcast_options", (room, options) => {
    io.to(room).emit("display_options", options);
  });
  

  // socket.on("mystery-box", (room, mystery) => {
  //   io.to(room).emit("set-box", mystery);
  // });
  
  socket.on("reset_game", (room) => {
    playerAnswers = {};
    io.to(room).emit("reset_game");
  });

  socket.on("player_answer", ({ room, name, answer }) => {
    if (!rooms[room]) {
      rooms[room] = { players: [], liarSet: false };
    }

    if (!rooms[room].players.includes(name)) {
      rooms[room].players.push(name);
    }

    if (!playerAnswers[room]) {
      playerAnswers[room] = {};
    }

    playerAnswers[room][name] = answer;

    const playersInRoom = rooms[room].players.length;
    const answersInRoom = Object.keys(playerAnswers[room]).length;

    socket.on("rejoin", () =>{
      answersInRoom++;
    }) 

    // Check if all players have answered
    if (playersInRoom === answersInRoom) {
      io.to(room).emit("show_results", true);
      io.to(room).emit("receive_answers", playerAnswers[room]);
    }
  });

  socket.on("join_room", (room, name, admin) => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }

    if (!rooms[room].players.includes(name)) {
      rooms[room].players.push(name);
      playerNames[socket.id] = name;
    }

    // If the player was in the disconnect timers, cancel removal
    if (disconnectTimers[name]) {
      clearTimeout(disconnectTimers[name]);
      delete disconnectTimers[name];
    }

    const isAdmin = rooms[room].players.length === 1;
    socket.emit("setAdmin", isAdmin);

    io.to(room).emit("updatePlayerList", rooms[room].players);
  });

  socket.on("disconnect", () => {
    const playerName = playerNames[socket.id];
    console.log(`User Disconnected: ${playerName} (${socket.id})`);

    if (!playerName) return;

    // Set a timer to allow reconnection before removing the player
    disconnectTimers[playerName] = setTimeout(() => {
      for (const room in rooms) {
        if (rooms[room].players.includes(playerName)) {
          rooms[room].players = rooms[room].players.filter((name) => name !== playerName);
          delete playerAnswers[room]?.[playerName];
          delete playerNames[socket.id];

          io.to(room).emit("updatePlayerList", rooms[room].players);
        }
      }
      delete disconnectTimers[playerName];
    }, 60000);
  });
});

server.listen(process.env.PORT || 3001, () => {
  console.log("SERVER RUNNING");
});
