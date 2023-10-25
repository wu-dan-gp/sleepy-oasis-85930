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
var storystate = ""; // inkle story state


wss.on('connection', function connection (client) {
	
	// on re/connect do handshake
	console.log(`a client connected!`);
	client.send(`{"Classname": "Handshake", "Methodname": "", "Parameters": ""}`);
	
	// on client disconnect
	client.on('close', () => {
	  console.log(`Client ${client.id} disconnected!`);
	  if (wss.clients.size == 0) {
		players = [];  
	  }
	});
  
	// on new message recieved
	client.on('message', function incoming (data) {
		
		var json = JSON.parse(data);
		if (json.Classname == "connect") { // connecting first time
			
			client.socketsid = uuid();
			client.id = players.length;
			if (json.Methodname == "host") {
				client.joincode = client.socketsid.substring(0,6);
				client.gamename = json.Parameters;
				players.push({
					id: client.id,
					socketsid: client.socketsid,
					joincode: client.joincode,
					ishost: true,
					gamename: client.gamename
				});
			} else {
				client.joincode = json.Parameters; // guest of host
				var host = players.find(x => x.ishost == true);
				client.gamename = host.gamename;
				players.push({
					id: client.id,
					socketsid: client.socketsid,
					joincode: client.joincode,
					ishost: false,
					gamename: client.gamename
				});
			}
			
			console.log(`Client ${client.id} connected!`);
			
			// broadcast to all clients that a client connected so everyone has same list
			wss.clients.forEach(function each(aClient) {
				players.forEach(function each(player) {
					
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
				client.id = player.id;
				client.socketsid = player.socketsid;
				console.log(`Client ${client.id} reconnected!`);
				//client.send(`{"Classname": "DialogueManager", "Methodname": "DialogueSelectedAll", "Parameters": ${storystate}}`);
			} else {
				console.log(`error: cannot find client socket id`);
			}
			
		} else {
			console.log(`broadcast: ${json.Classname}`);
			
			if (json.Methodname == "DialogueSelectedAll") {
				storystate = json.Parameters;
				console.log(`storystate: ${storystate}`);
			} else if (json.Methodname == "MakeChoiceAll") {
				var paramArray = json.Parameters;
				// deserialize
				//var jsonStoryState = JSON.parse(json.Parameters);
				// remove 1st Element
				paramArray.shift();
				//storystate = "'" + jsonStoryState + "'";
				console.log(`storystate: ${paramArray}`);
			}
			
			wss.clients.forEach(function each(aClient) {
			   aClient.send(`${data}`);
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