/**
 * LD2L Bot
 */

//Require needs deps and auth file
var Discord = require('./node_modules/discord.js');
var AuthDetails = require('./auth.json');

var commandPredecessor = "!";

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

	message = msg.content;
	if (message.indexOf(commandPredecessor) === 0) {
		command = message.split(" ")[0].toLowerCase().substr(1);
		console.log("\"" + command + "\"")
		switch (command) {
			case "schedule":
				scheduleMatch(message);
				break;
			case "help":
				showHelp(msg.channel);
				break;
			default:
				showInvalidCommand(msg.channel);
		}

	}
});

//Login with auth.json
bot.login(AuthDetails.email, AuthDetails.password);

function scheduleMatch(message) {
	var scheduleInfo = {};
	scheduleInfo.team1 = /(?=Team 1:).+/.exec(message)[0].split('Team 1:')[1];
	scheduleInfo.team2 = /(?=Team 2:).+/.exec(message)[0].split('Team 2:')[1];
	scheduleInfo.time = /(?=Time:).+/.exec(message)[0].split('Time:')[1];
	console.log(scheduleInfo.team1 + " will play " + scheduleInfo.team2 + " on " + scheduleInfo.time);
}

function showInvalidCommand(channel) {
	var invalidCommandMsg = "That was a invalid command. Try again. Use !help for help."
	bot.sendMessage(channel, invalidCommandMsg);
}

function showHelp(channel) {
	var helpMsg= "Hi, I'm LD2L Bot!  To schedule a match, please make a post with the following structure: \n!schedule\nTeam 1: [Team Name]\nTeam 2: [Team Name]\nTime: [MM/DD/YYYY HH:MM(AM/PM)(TMZ)";
	bot.sendMessage(channel, helpMsg);
}
