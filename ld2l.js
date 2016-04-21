/**
 * LD2L Bot
 */

//Require needs deps and auth file
var Discord = require('./node_modules/discord.js');
var AuthDetails = require('./auth.json');
var CalendarApi = require('./ld2lCalendarApi.js');

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
		switch (command) {
			case "schedule":
				scheduleMatch(message, msg.channel);
				break;
			case "help":
				showHelp(msg.channel, msg.author);
				break;
			default:
				showInvalidCommand(msg.channel);
		}

	}
});

//Login with auth.json
bot.login(AuthDetails.email, AuthDetails.password);

function scheduleMatch(message, channel) {
	if(channel.name == "scheduling"){
		lowerCaseMessage = message.toLowerCase();

		var scheduleInfo = {};
		var regExp = /(!schedule)\s+(Group )(.)\s+(.+)(vs)(.+)([0-3][0-9]\/[0-1]\d\/\d\d\d\d)\s+([0-1]\d:[0-5]\d)\s*([P|A][M])\s*(GMT|SGT|EDT|PDT)\s*/gi;
		var scheduleCommand = regExp.exec(message);
		if (scheduleCommand) {
			scheduleInfo.group = scheduleCommand[3].toUpperCase();
			scheduleInfo.team1 = scheduleCommand[4].trim();
			scheduleInfo.team2 = scheduleCommand[6].trim();
			scheduleInfo.date = scheduleCommand[7];
			scheduleInfo.time = scheduleCommand[8];
			scheduleInfo.timePeriod = scheduleCommand[9];
			scheduleInfo.timeZone = scheduleCommand[10].toUpperCase();
			CalendarApi.addToGoogleCalendar(scheduleInfo);
			var matchScheduledMessage = "A Group " + scheduleInfo.group + " match has been scheduled for " + scheduleInfo.team1 + " vs " + scheduleInfo.team2 + " at " +
				scheduleInfo.time + " " + scheduleInfo.timePeriod + " " + scheduleInfo.timeZone + " on " + scheduleInfo.date;
			bot.sendMessage(channel, matchScheduledMessage);
		} else {
			showInvalidEvent(channel);
		}
	}else{
		bot.sendMessage(channel, "Sorry, you can't use !schedule here");
	}
}

function showInvalidCommand(channel) {
	var invalidCommandMsg = "That was a invalid command. Try again. Use !help for help."
	bot.sendMessage(channel, invalidCommandMsg);
}

function showInvalidEvent(channel) {
	var invalidCommandMsg = "Your event format was incorrect, please try again.  If you need assistance please type '!help' in chat!"
	bot.sendMessage(channel, invalidCommandMsg);
}

function showHelp(channel, user) {
	var helpMsgPmed = "Hi, " + user.mention() + "! Please check your PM for information on how to use me."
	var helpMsg = "Hi, I'm LD2L Bot!\n" +
	"To schedule a match, please make a post with the following structure: \n" +
	"!schedule GROUP <Letter> <Team 1> VS <Team 2> DD/MM/YYYY HH:MM AM/PM <EDT/PDT/SGT/GMT>\n" +
	"Example: GROUP E NASOLO#1 VS NASOLO#2 25/04/2016 04:00PM EDT";
	bot.sendMessage(channel, helpMsgPmed);
	bot.sendMessage(user, helpMsg);
}
