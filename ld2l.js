/**
 * LD2L Bot
 */

//Require needs deps and auth file
var fs = require('fs');
var Discord = require('./node_modules/discord.js');
var AuthDetails = require('./auth.json');
var CalendarApi = require('./ld2lCalendarApi.js');
var Firebase = require("./node_modules/firebase");

var commandPredecessor = "!";

//create bot
var bot = new Discord.Client();

//create dbs
var firebaseDb = new Firebase(AuthDetails.firebaseServer);

/**
 * Queries databases and allows use of data found
 * @param  {string}   drilldown   Path to object or value queried in relation to root DB
 * @param  {Function} callback callback function that provides data value for object or record 
 */
var useDB = function(drilldown, callback){
	firebaseDb.child(drilldown).once( 'value', function( data ){ 
        callback(data.val());     
    });
}



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
			case "add":
				addUser(message, msg.author, msg.channel);
				break;
			case "schedule":
				scheduleMatch(message, msg.channel);
				break;
			case "whoami":
				showWhoAmI(msg.author, msg.channel);
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
initializeUsers();

function addUser(message, user, channel) {
	if ((isUserAdmin(user)) && channel.constructor.name === "PMChannel") {
		var regExp = /!add\s+(.+)\s*/gi;
		var userName = regExp.exec(message)[1];

		var userToAdd = bot.users.get("username", userName);
		if (userToAdd) {
			admins.push(userToAdd.id);
			fs.writeFile('users.json', JSON.stringify({admins: admins}), function(err) {
				if (err) {
					console.log("Error saving users list file : " + err);
				}
				bot.sendMessage(user, userName + " added as an admin.");
			});
		} else {
			bot.sendMessage(user, "Invalid User.");
		}
	}
}

function scheduleMatch(message, channel) {
	if(channel.name == "scheduling"){
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
	var helpMsg = "Hi, I'm LD2L Bot!\n\n" +
	"To schedule a match, please make a post with the following structure: \n" +
	"!schedule GROUP <Letter> <Team 1> VS <Team 2> DD/MM/YYYY HH:MM AM/PM <EDT/PDT/SGT/GMT>\n" +
	"Example: GROUP E NASOLO#1 VS NASOLO#2 25/04/2016 04:00PM EDT\n\n" +
	"To know if I recognize you, use !whoami in a PM.";
	if (isUserAdmin(user)) {
		helpMsg = helpMsg + "\n\n" +
		"To add another admin use !add <user name>.\nOnly works in PM, fails silently in public channels";
	}
	bot.sendMessage(channel, helpMsgPmed);
	bot.sendMessage(user, helpMsg);
}

function initializeUsers() {
	fs.readFile('users.json', function(err, content) {
		if (err) {
			console.log('Error loading user list file: ' + err);
			return;
		}
		var parsedJson = JSON.parse(content);
		admins = parsedJson.admins;
	});
}

function showWhoAmI(user, channel) {
	if (channel.constructor.name === "PMChannel") {
		if (isUserAdmin(user)) {
			bot.sendMessage(user, "You're an admin!");
		} else {
			bot.sendMessage(user, "I'm sorry, I don't know you.")
		}
	} else {
		bot.sendMessage(user, "You can only use !whoami in a PM.")
	}
}

function isUserAdmin(user) {
	if (admins.indexOf(user.id) >= 0) {
		return true;
	}
	return false;
}
