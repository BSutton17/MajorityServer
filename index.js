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

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("startGame", () => {
    io.emit("gameStarted");
  });

  socket.on("broadcast_prompt", (msg, room) => {
    console.log("room: " + room)
    console.log("msg: " + msg)
    io.to(room).emit("display_prompt", msg);
  });

  socket.on("reset_game", (room) => {
    playerAnswers = {};
    io.to(room).emit("reset_game");
  });
  socket.on("player_answer", ({ room, name, answer }) => {

    // Initialize room and playerAnswers if not already existing
    if (!rooms[room]) {
      rooms[room] = { players: [], liarSet: false };
    }

    // If it's a new name, add it to the room
    if (!rooms[room].players.includes(name)) {
      rooms[room].players.push(name);
    }

    if (!playerAnswers[room]) {
      playerAnswers[room] = {};
    }

    // Store the player's answer
    playerAnswers[room][name] = answer;

    // Track the last player to answer
    lastPlayerToAnswer[room] = name;

    const playersInRoom = rooms[room].players.length;
    const answersInRoom = Object.keys(playerAnswers[room]).length;

    
    // Check if all players have answered
    if (playersInRoom === answersInRoom) {
      const changeAnswerIndex = Math.floor(Math.random() * playersInRoom);
      const randomPlayer = rooms[room].players[changeAnswerIndex];

    // Change the selected player's answer if they have answered already
    if (playerAnswers[room][randomPlayer]) {
      playerAnswers[room][randomPlayer] = playerAnswers[room][randomPlayer] === "Yes" ? "No" : "Yes";

      // Notify the specific player whose answer was changed
      const socketId = Object.keys(playerNames).find(id => playerNames[id] === randomPlayer);
      console.log(socket.id);
      
      if (socketId) {
        io.to(socketId).emit("answer_changed", "Your answer has been changed. Lie your way through.");
        console.log("should be working")
      }
      console.log(playerNames);
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
