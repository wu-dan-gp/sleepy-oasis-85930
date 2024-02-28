'use strict';

const util = require('util');
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
var storystate = ""; // inkle story state


wss.on('connection', function connection (client) {
	
	// on re/connect do handshake
	console.log(`a client connected!`);
	client.send(`{"Classname": "Handshake", "Methodname": "", "Parameters": ""}`);
	
	// on client disconnect
	client.on('close', () => {
		console.log(`Client ${client.socketsid} disconnected!`);
		
		client.connected = false;
		var isRoomEmpty = players.find(x => x.joincode == client.joincode && x.connected == true);
		
		//console.log(util.inspect(isRoomEmpty, {showHidden: false, depth: null, colors: true}));
		if (isRoomEmpty == undefined) { // no more players in this room
			players = players.filter(x => x.joincode !== client.joincode);
	  	}
		console.log(`wss.clients.size ${wss.clients.size} `);
		console.log(`players.length ${players.length} `);

	  	// clear if no players
	  	if (wss.clients.size == 0) {
			players = [];  
	  	}
	});
  
	// on new message recieved
	client.on('message', function incoming (data) {
		
		var json = JSON.parse(data);
		if (json.Classname == "connect") { // connecting first time
			
			client.socketsid = uuid();
			var playerRoom = players.filter(x => x.joincode == json.JoinCode);
			client.id =  playerRoom.length;
			client.joincode = json.JoinCode;
			client.connected = true;

			console.log(`client.joincode  ${client.joincode}`);

			if (json.HostOrGuest == "host") {
				client.gamename = json.GameName;
				client.ishost = true;
				players.push(client);
			} else { // guest of host
				var host = players.find(x => x.ishost == true && x.joincode == client.joincode);
				//console.log(util.inspect(host, {showHidden: false, depth: null, colors: true}));
				if (host !== undefined) {
					client.gamename = host.gamename;
					client.ishost = false;
					players.push(client);
				} else {
					console.log(`error: cannot find joincode: ${client.joincode}`);
				}
				
			}
			
			console.log(`Client ${client.socketsid} connected!`);
			playerRoom = players.filter(x => x.joincode == client.joincode);
			var playerRoomOuter = players.filter(x => x.joincode == client.joincode);

			// broadcast to all clients in a room that a client connected so they have same list
			playerRoomOuter.forEach(function each(aClient) {

				playerRoom.forEach(function each(player) {
					if (client.id == player.id) {
						aClient.send(`{"Classname": "GameManager", "Methodname": "InitPlayersWSS", "Parameters": "['${player.id}', '${player.socketsid}', '${player.joincode}', '${player.gamename}']" }`);
					} else {
						aClient.send(`{"Classname": "GameManager", "Methodname": "InitPlayersWSS", "Parameters": "['${player.id}', '', '', '']" }`);
					}
				
				});
			});

			
		} else if (json.Classname == "reconnect") {
			
			var player = players.find(x => x.socketsid == json.Parameters);
			if (player !== undefined) {
				/*client.id = player.id;
				client.socketsid = player.socketsid;
				client.joincode = player.joincode;
				client.gamename = player.gamename;
				client.ishost = player.ishost;
				client.connected = true;*/
				console.log(`Client ${client.socketsid} reconnected!`);
				client.send(`{"Classname": "DialogueManager", "Methodname": "DialogueSelectedAll", "Parameters": ${JSON.stringify(storystate)}}`);
				//console.log(`storystate: ${JSON.stringify(storystate)}`);
			} else {
				console.log(`error: cannot find client socket id: ${json.Parameters}`);
			}
			
		} else {
			console.log(`broadcast: ${json.Classname} ${json.Methodname}`);
			
			var playerRoom = players.filter(x => x.joincode == client.joincode);
			playerRoom.forEach(function each(player) {		
				player.send(`${data}`);
			});

		}
		
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