const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://secretgame123.netlify.app",
    methods: ["GET", "POST"],
  },
});

let firstUserConnected = false;
let firstUserId = null; // Variable to store the ID of the first user

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Check if this is the first user to connect
  if (!firstUserConnected) {
    firstUserConnected = true;
    firstUserId = socket.id; // Store the first user's socket ID
    socket.emit("assignRole", { isAdmin: true });
  } else {
    socket.emit("assignRole", { isAdmin: false });
  }

  socket.on("send_message", (data) => {
    io.emit("receive_message", data);
  });

  socket.on("nextPage", (data) => {
    io.emit("displayPage", data);
  });

  socket.on("sendSecret", (data) => {
    io.emit("receiveSecret", data);
  });

  // Reset firstUserConnected when the first user disconnects
  socket.on("disconnect", () => {
    if (socket.id === firstUserId) {
      firstUserConnected = false;
      firstUserId = null; // Reset firstUserId when the first user disconnects
    }
    console.log(`User Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001; // Default to 3001 for local development

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
