const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);
//https://majority1.netlify.app
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
  

  socket.on("mystery-box", (room, mystery) => {
    io.to(room).emit("set-box", mystery);
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

    const playersInRoom = rooms[room].players.length;
    const answersInRoom = Object.keys(playerAnswers[room]).length;

    socket.on("rejoin", () =>{
      answersInRoom++;
    }) 


    console.log(playersInRoom)
    console.log(answersInRoom)

    socket.on("force_next_round", (room) => {
      io.to(room).emit("show_results", true);
      io.to(room).emit("receive_answers", playerAnswers[room]);
    });

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
  
    socket.emit("setAdmin", admin); 
  
    io.to(room).emit("updatePlayerList", rooms[room].players);
  });
  

  socket.on("disconnect", () => {
    const playerName = playerNames[socket.id];
    console.log(`User Disconnected: ${playerName} (${socket.id})`);
  
    if (!playerName) return;
  
    // Find the room this player was in
    let room = null;
    for (let r in rooms) {
      if (rooms[r].players.includes(playerName)) {
        room = r;
        break;
      }
    }
  
    // If the player is in a room, remove them
    if (room) {
      rooms[room].players = rooms[room].players.filter(player => player !== playerName);
  
      io.to(room).emit("updatePlayerList", rooms[room].players);
    }
  
    // Clean up playerNames and disconnectTimers
    delete playerNames[socket.id];
    delete disconnectTimers[playerName];
  });
  
});

server.listen(process.env.PORT || 3001, () => {
  console.log("SERVER RUNNING");
});
