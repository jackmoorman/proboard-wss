const express = require('express');
const app = express();
require('dotenv').config();
const server = require('http').createServer(app);
const WebSocket = require('ws');

const PORT = process.env.PORT || 3005;

const wss = new WebSocket.Server({ server: server });

// NOTE: treating each individual "board" as a "room";
// Usings "rooms" to associate connection rooms
// Using a map to create unique rooms
const rooms = new Map();

// fires when any client connects
wss.on('connection', (ws) => {
  console.log('A new client connected.');

  // fires when the client sends a message (i.e. joining a board, leaving, or sending a board update)
  ws.on('message', (data, isBinary) => {
    const { boardId, userId, method } = JSON.parse(data);

    // message method filter for different cases.
    switch (method) {
      // when a client joins the room.
      // if the room does not yet exist, create the room, else add the user to the existing room.
      case 'join':
        console.log('joined');
        if (!rooms.has(boardId)) {
          rooms.set(boardId, [ws]);
        } else {
          const usersInRoom = rooms.get(boardId);
          usersInRoom.push(ws);
          rooms.set(boardId, usersInRoom);
        }
        break;

      // when a client leaves the room.
      // remove the client from the room, if the client is the last one in the room, delete the room entirely.
      case 'leave':
        console.log('left');
        const allUsers = rooms.get(boardId);
        for (let i = 0; i < allUsers.length; i++) {
          if (allUsers[i] == ws) {
            allUsers.splice(i, 1);
            console.log(allUsers);
            if (allUsers.length === 0) rooms.delete(boardId);
            break;
          }
        }
        break;

      // when a client changes the board, send updates to all connected clients on the room.
      case 'update':
        const { columns } = JSON.parse(data);
        const clients = rooms.get(boardId);
        clients.forEach((client) => {
          client.send(data, { binary: isBinary });
        });
        break;

      // if unknown message is sent, just return with no updates.
      default:
        return;
    }
  });
});

// log to the server when a connection is closed.
wss.on('close', (ws) => {
  console.log('A client disconnected.');
});

// finally, initialize the WebSocket server on PORT:
server.listen(PORT, () => console.log(`WS Server listening on PORT: ${PORT}`));
