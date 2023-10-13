'use strict';

const express = require('express');
const { Server } = require('ws');

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html';

const server = express()
  .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new Server({ server });

var uuid = require('uuid-random');
var players = [];

// wss.on('connection', (ws) => {
  // console.log('Client connected');
  // wss.on('close', () => console.log('Client disconnected'));
  
  // wss.on('message', function incoming (data) {
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
    // wss.udid = udid
  // })
// });

wss.on('connection', function connection (client) {
	client.socketsid = uuid();
	client.id = players.length;
	players.push({
		id: client.id,
		socketsid: client.socketsid
	});
	
	console.log(`Client ${client.id} connected!`);
	//client.send(`{"Classname": "GameManager", "Methodname": "InitPlayersWSS", "Parameters": "${client.id}, ${client.socketsid}"}`);
	
	//Send client data back to client for reference
	wss.clients.forEach(function each(aClient) {
		players.forEach(function each(player) {
			var emptyString = "";
			if (client.id == player.id) {
				aClient.send(`{"Classname": "GameManager", "Methodname": "InitPlayersWSS", "Parameters": "${player.id},${player.socketsid}"}`);
			} else {
				aClient.send(`{"Classname": "GameManager", "Methodname": "InitPlayersWSS", "Parameters": "${player.id},${emptyString}"}`);
			}
		  
		});
	});
	
	// on client disconnect
	client.on('close', () => {
	  console.log(`Client ${client.id} disconnected!`);
	  if (wss.clients.size == 0) {
		players = [];  
	  }
	});
  
	// on new message recieved
	client.on('message', function incoming (data) {
		
		wss.clients.forEach(function each(aClient) {
		   aClient.send(`${data}`);
		});
	});
});

// add general WebSocket error handler
wss.on('error', function error (error) {
  console.error('WebSocket error', error);
});

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

/* setInterval(() => {
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
}, 100); */

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