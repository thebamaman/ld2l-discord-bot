/**
 * LD2L Bot
 */

//Require needs deps and auth file
var Discord = require('./node_modules/discord.js');
var AuthDetails = require('./auth.json');

//create bot
var bot = new Discord.Client();

//Bot ready code
bot.on('ready', function () {
	console.log('Ready to begin! Serving in ' + bot.channels.length + ' channels');
});

//Bot disconnect code
bot.on('disconnected', function () {
	console.log('Disconnected!');
	//exit node.js
	process.exit(1);
});

//Bot logic to run whenever a message is received
bot.on('message', function (msg) {

	console.log('Message from channel : ' + msg.channel.name);
	if (msg.content.indexOf('!bot schedule') === 0){
		var rawData = msg.content;
		var scheduleInfo = {};
		scheduleInfo.team1 = /(?=Team 1:).+/.exec(rawData)[0].split('Team 1:')[1];
		scheduleInfo.team2 = /(?=Team 2:).+/.exec(rawData)[0].split('Team 2:')[1];
		scheduleInfo.time = /(?=Time:).+/.exec(rawData)[0].split('Time:')[1];
		console.log(scheduleInfo.team1 + " will play " + scheduleInfo.team2 + " on " + scheduleInfo.time);
	}
	if (msg.content.indexOf('!bot help') === 0){
		var helpMsg= "Hi, I'm LD2L Bot!  To schedule a match, please make a post with the following structure: \n!bot schedule\nTeam 1: [Team Name]\nTeam 2: [Team Name]\nTime: [MM/DD/YYYY HH:MM(AM/PM)(TMZ)";
		bot.sendMessage(msg.channel, helpMsg);
	}

});

//Login with auth.json
bot.login(AuthDetails.email, AuthDetails.password);