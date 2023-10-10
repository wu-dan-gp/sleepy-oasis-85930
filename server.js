'use strict';

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

// empty object to store all players
var players = {};

// wss.on('connection', (ws) => {
  // console.log('Client connected');
  // ws.on('close', () => console.log('Client disconnected'));
  
  // ws.on('message', function incoming (data) {
    // // get data from string
    // var [udid, x, y, z] = data.toString().split('\t')
    // // store data to players object
    // players[udid] = {
      // position: {
        // x: parseFloat(x),
        // y: parseFloat(y),
        // z: parseFloat(z)
      // },
      // timestamp: Date.now()
    // }
    // // save player udid to the client
    // ws.udid = udid
  // })
// });
wss.on('connection', function connection (client) {
  console.log('Client connected');
  client.on('close', () => {
	  console.log('Client disconnected');
	  
	  endClient(client);
  });
  
  // on new message recieved
  client.on('message', function incoming (data) {
    // get data from string
    var [udid, x, y, z, isHost, isEnemy, currentTurn, currentActionList, currentAction] = data.toString().split('\t');
    // store data to players object
    players[udid] = {
      position: {
        x: parseFloat(x),
        y: parseFloat(y),
        z: parseFloat(z)
      },
      GUID: udid,
	  isHost: parseInt(isHost),
	  isEnemy: parseInt(isEnemy),
	  currentTurn: parseInt(currentTurn),
	  currentActionList: currentActionList,
	  currentAction: parseInt(currentAction)
    };
    // save player udid to the client
	if (isEnemy == "0")
		client.udid = udid;
  });
})

// add general WebSocket error handler
wss.on('error', function error (error) {
  console.error('WebSocket error', error);
})

function endClient(client) {
	
	if (typeof players[client.udid] !== 'undefined' && players[client.udid]) {
		
		if (players[client.udid].isHost == 1) { // delete all players
			
			wss.clients.forEach((client) => {
				client.send(JSON.stringify({players: {} })); // to signify no players 
				client.close();
				delete players[client.udid];
			});
			players = {};
		} else {
			players[client.udid] = {
			  position: {
				x: -999,
				y: -999,
				z: -999
			  },
			  GUID: '',
			  isHost: 0,
			  isEnemy: 0,
			  currentTurn: -1,
			  currentActionList: '',
			  currentAction: ''
			};
			delete players[client.udid];
			client.close();
		}
	}
}

setInterval(() => {
  wss.clients.forEach((client) => {
    // client.send(new Date().toTimeString());
	
	// filter disconnected clients
    //if (client.readyState !== WebSocket.OPEN) return
	if (client.readyState !== client.OPEN) {
		endClient(client);
		return;
	}
	
    // filter out current player by client.udid
    var otherPlayers = Object.keys(players).filter(udid => udid !== client.udid);
    // create array from the rest
    var otherPlayersPositions = otherPlayers.map(udid => players[udid]);
    // send it
    client.send(JSON.stringify({players: otherPlayersPositions}));
  });
}, 100);

// function broadcastUpdate () {
  // // broadcast messages to all clients
  // wss.clients.forEach(function each (client) {
    // // filter disconnected clients
    // if (client.readyState !== WebSocket.OPEN) return
    // // filter out current player by client.udid
    // var otherPlayers = Object.keys(players).filter(udid => udid !== client.udid)
    // // create array from the rest
    // var otherPlayersPositions = otherPlayers.map(udid => players[udid])
    // // send it
    // client.send(JSON.stringify({players: otherPlayersPositions}))
  // })
// }

// call broadcastUpdate every 0.1s
// setInterval(broadcastUpdate, 100)