const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://hypothetical.netlify.app",
    methods: ["GET", "POST"],
  },
});

let rooms = {};
let playerAnswers = {};
let playerNames = {};
let lastPlayerToAnswer = {};
let lastRandomPlayer = {}; 

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("startGame", () => {
    io.emit("gameStarted");
  });

  socket.on("broadcast_prompt", (msg, room) => {
    io.to(room).emit("display_prompt", msg);
  });

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
  
    // Track the last player to answer
    lastPlayerToAnswer[room] = name;
  
    const playersInRoom = rooms[room].players.length;
    const answersInRoom = Object.keys(playerAnswers[room]).length;
  
    // Check if all players have answered
    if (playersInRoom === answersInRoom) {
      const availablePlayers = rooms[room].players;
  
      // Select a random player (without excluding the last random player)
      const changeAnswerIndex = Math.floor(Math.random() * availablePlayers.length);
      const randomPlayer = availablePlayers[changeAnswerIndex];
  
      lastRandomPlayer[room] = randomPlayer;
  
      if (playerAnswers[room][randomPlayer]) {
        playerAnswers[room][randomPlayer] = playerAnswers[room][randomPlayer] === "Yes" ? "No" : "Yes";
  
        const socketId = Object.keys(playerNames).find(id => playerNames[id] === randomPlayer);
        if (socketId) {
          io.to(socketId).emit("answer_changed", "Your answer has been changed. Lie your way through.");
        }
      }
  
      io.to(room).emit("show_results", true);
    }
    io.to(room).emit("receive_answers", playerAnswers[room]);
  });
  

  socket.on("join_room", (room, name ) => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = { players: [], liarSet: false };
    }

    if (!rooms[room].players.includes(name)) {
      rooms[room].players.push(name);
      playerNames[socket.id] = name;
    }

    const isAdmin = rooms[room].players.length === 1;
    socket.emit("setAdmin", isAdmin);

    io.to(room).emit("updatePlayerList", rooms[room].players);
  });

  // socket.on("create_room", ( name ) => {
  //   const room = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000);
  //   socket.join(room);

  //   if (!rooms[room]) {
  //     rooms[room] = { players: [], liarSet: false };
  //   }

  //   if (!rooms[room].players.includes(name)) {
  //     rooms[room].players.push(name);
  //     playerNames[socket.id] = name;
  //   }

  //   const isAdmin = rooms[room].players.length === 1;
  //   socket.emit("setAdmin", isAdmin);

  //   io.to(room).emit("set_room", room);

  //   io.to(room).emit("updatePlayerList", rooms[room].players);
  //   console.log(`User with ID: ${socket.id} (Name: ${name}) joined room: ${room}`);
  // });

  socket.on("disconnect", () => {
    const playerName = playerNames[socket.id];
    console.log(`User Disconnected: ${playerName} (${socket.id})`);

    for (const room in rooms) {
      if (rooms[room].players.includes(playerName)) {
        rooms[room].players = rooms[room].players.filter((name) => name !== playerName);
        delete playerAnswers[room]?.[playerName];
        delete playerNames[socket.id];

        io.to(room).emit("updatePlayerList", rooms[room].players);
      }
    }
  });
});

server.listen(process.env.PORT || 3001, () => {
  console.log("SERVER RUNNING");
});
