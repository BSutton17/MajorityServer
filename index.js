const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://jeopardy-buzzer.netlify.app",
    methods: ["GET", "POST"],
  },
});

let vault = 0;
//const nameList = []
io.on("connection", (socket) => {
  let isAdmin = vault == 0;
    vault++
    io.emit("admin", isAdmin)

  socket.on("pressed", (name) => {
    io.emit("list", name)
  });

  socket.on("disconnect", ()=>{
    vault--;
  })
})




server.listen(process.env.PORT || 3001, () => {
  console.log("SERVER RUNNING");
});