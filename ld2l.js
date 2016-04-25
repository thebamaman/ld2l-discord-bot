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
	firebaseDb.child(drilldown).once('value', function(data){
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
	console.log('Message from channel : ' + msg.channel.name +
		"\n====> " + msg.author.name + ": " + msg.content);
	message = msg.content;
	if (message.indexOf(commandPredecessor) === 0) {
		command = message.split(" ")[0].toLowerCase().substr(1);
		switch (command) {
			case "add":
				addUser(message, msg.author, msg.channel);
				break;
			case "schedule":
				scheduleMatch(message, msg.channel, msg.author);
				break;
			case "deschedule":
				deScheduleMatch(message, msg.channel, msg.author);
				break;
			case "showmatches":
				showMatches(msg.author, msg.channel);
				break;
			case "whoami":
				showWhoAmI(msg.author, msg.channel);
				break;
			case "help":
				showHelp(msg.channel, msg.author);
				break;
			case "togglebot":
				toggleBot(message, msg.channel, msg.author);
				break;
			default:
				showInvalidCommand(msg.channel);
		}

	}
});

//Login with auth.json
bot.login(AuthDetails.email, AuthDetails.password);

function addUser(message, user, channel) {
	checkUser(user, 'admins', function() {
		if (channel.constructor.name === "PMChannel") {
			console.log('user verified as admin');
			var regExp = /!add\s+(.+)\s*/gi;
			var userName = regExp.exec(message)[1];

			var userToAdd = bot.users.get("username", userName);
			if (userToAdd) {
				var id = userToAdd.id.toString();
				firebaseDb.child('users/admins/' + id).set({'name': userName}, function(error){
					if (error){
						console.log("Error saving users to DB : " + err);
					} else {
						bot.sendMessage(user, userName + " added as an admin.");
					}
				});
			} else {
				bot.sendMessage(user, "Invalid User.");
			}
		}
	});
}

function toggleBot(message, channel, user){
	if (channel.constructor.name === "PMChannel") {
		checkUser(user, 'admins', function(){
			var regExp = /(!togglebot)\s+(on$|off$)/gi;
			var toggleCmd = regExp.exec(message)[2].toLowerCase();
			if (toggleCmd === 'on'){
				firebaseDb.child('allowBot').set(true);
				bot.sendMessage(user, "LD2L Bot is now on.  All messages and commands will be accepted! :D");
			}else if (toggleCmd === 'off'){
				firebaseDb.child('allowBot').set(false);
				bot.sendMessage(user, "LD2L Bot is now off.  No messages or commands, except '!toggleBot' and '!add' will be accepted :(");
			}
		});
	}
}

function isBotOn(success) {
	firebaseDb.child('allowBot').once('value', function(bool){
		if(bool.val()){
			console.log('bot on');
			success();
		}
		//fail silently if bot is off
	});
}

function scheduleMatch(message, channel, user) {
	isBotOn(function(){
		if (channel.name == "scheduling"){
			var scheduleInfo = {};
			var regExp = /(!schedule)\s+(Group )([a-tA-T])\s+(.+)(vs)(.+)([0-3][0-9]\/[0-1]\d\/\d\d\d\d)\s+([0-1]\d:[0-5]\d)\s*([P|A][M])\s*(GMT|SGT|EDT|PDT)\s*/gi;
			var scheduleCommand = regExp.exec(message);
			if (scheduleCommand) {
				scheduleInfo.group = scheduleCommand[3].toUpperCase();
				scheduleInfo.team1 = scheduleCommand[4].trim();
				scheduleInfo.team2 = scheduleCommand[6].trim();
				scheduleInfo.date = scheduleCommand[7];
				scheduleInfo.time = scheduleCommand[8];
				scheduleInfo.timePeriod = scheduleCommand[9];
				scheduleInfo.timeZone = scheduleCommand[10].toUpperCase();
				CalendarApi.addToGoogleCalendar(scheduleInfo, function(eventID){
					if(eventID.length > 0){
						checkUser(user, 'registered', function(){
							var userstring = user.id.toString();
							firebaseDb.child('users/registered/' + userstring + '/events/' + eventID).set(scheduleInfo);
						}, function(){
							var userstring = user.id.toString();
							firebaseDb.child('users/registered/' + userstring).set({'name': user.name});
							firebaseDb.child('users/registered/' + userstring + '/events/' + eventID).set(scheduleInfo);
						});
					}
				});
				var matchScheduledMessage = "A Group " + scheduleInfo.group + " match has been scheduled for " + scheduleInfo.team1 + " vs " + scheduleInfo.team2 + " at " +
					scheduleInfo.time + " " + scheduleInfo.timePeriod + " " + scheduleInfo.timeZone + " on " + scheduleInfo.date;
				bot.sendMessage(channel, matchScheduledMessage);
			} else {
				showInvalidEvent(channel);
			}
		}else{
			bot.sendMessage(channel, "Sorry, you can't use !schedule here");
		}
	});
	
}

function deScheduleMatch(message, channel, user) {
	isBotOn(function(){
		if (channel.constructor.name === "PMChannel") {
			checkUser(user, 'registered', function(){
				var regExp = /(!deschedule)\s+(.+)/gi;
				var deScheduleMatch = regExp.exec(message);
				//make sure that they only placed the event ID after the !deschedule command
				if (deScheduleMatch[2].indexOf(' ') == -1) {
					CalendarApi.deleteFromCalendar(deScheduleMatch[2], function(status){
						//if we get back a success string
						if(status.status == 'Success'){
							var userstring = user.id.toString();
							//remove object 
							firebaseDb.child('users/registered/'+ userstring +'/events/' + deScheduleMatch[2]).remove(function(error){
								if(error){
									console.log('Error removing object from ' + user.name + '\'s account');
									console.log(error);
									//sends message if user
									bot.sendMessage(user, 'Your event was removed from the calendar, but not from your account, please contact a bot admin (@Upstairs/Downstairs, @hiemanshu)');
								}
							});
							bot.sendMessage(user, "Your event has been removed, please reschedule it if need be!");

						}else{
							bot.sendMessage(user, "We couldn't remove your event for the following reason: " + status.message + "\nPlease try again.  If issue persists, contact an admin for help");
						}
					});
				} else {
					bot.sendMessage(user, "Please only put the event ID after your command.  You can use !showMatches to see a list of your events and their event IDs")
				}
			},
			function(){
				bot.sendMessage(channel, "Sorry, I don't have any events that you can delete");
			});
		}else{
			bot.sendMessage(user, "You can only use !deschedule in a PM.")
		}
	});	
}

function showMatches(user, channel) {
	isBotOn(function(){
		if (channel.constructor.name === "PMChannel") {
			checkUser(user, 'registered', function() {
				var userstring = user.id.toString();
				firebaseDb.child('users/registered/' + userstring + '/events/').once('value', function(eventObj){
					var events = eventObj.val();
					var eventKeys = Object.keys(events);
					var eventBlock = "Here is the list of your scheduled events:\n";
					for(var i = 0, len = eventKeys.length; i < len; i++){
						var eventString = "";
						eventString+= "Event ID: " + eventKeys[i] + " || " + events[eventKeys[i]].team1 + " VS " + events[eventKeys[i]].team2 + " @ " + events[eventKeys[i]].date + "\n";
						eventBlock+= eventString;
					}
					bot.sendMessage(user, eventBlock);
				});
			}, function() {
				bot.sendMessage(user, "I'm sorry, you're not a registered user, and therefore can't have any matches!  You will be automatically registered when you schedule your first match");
			});
		} else {
			bot.sendMessage(user, "You can only use !showMatches in a PM.");
		}
	});
	
}

function showInvalidCommand(channel) {
	isBotOn(function(){
		var invalidCommandMsg = "That was a invalid command. Try again. Use !help for help."
		bot.sendMessage(channel, invalidCommandMsg);
	});
	
}

function showInvalidEvent(channel) {
	var invalidCommandMsg = "Your event format was incorrect, please try again.  If you need assistance please type '!help' in chat!"
	bot.sendMessage(channel, invalidCommandMsg);
}

function showHelp(channel, user) {
	isBotOn(function(){
		var helpMsgPmed = "Hi, " + user.mention() + "! Please check your PM for information on how to use me."
		var helpMsg = "Hi, I'm LD2L Bot!\n\n" +
		"To schedule a match, please make a post with the following structure: \n" +
		"!schedule GROUP <Letter> <Team 1> VS <Team 2> DD/MM/YYYY HH:MM AM/PM <EDT/PDT/SGT/GMT>\n" +
		"Example: GROUP E NASOLO#1 VS NASOLO#2 25/04/2016 04:00PM EDT\n\n" +
		"To know if I recognize you, use !whoami in a PM.\n\n" + 
		"To see a list of the matches you have scheduled, use !showMatches in a PM\n\n" +
		"To remove a match you have scheduled, type !deschedule <matchID> in a PM. Match IDs are shown in !showMatches";
		checkUser(user, 'admins', function() {
			helpMsg = helpMsg + "\n\n" +
			"To add another admin use !add <user name>.\nOnly works in PM, fails silently in public channels";
			bot.sendMessage(channel, helpMsgPmed);
			bot.sendMessage(user, helpMsg);
		}, function() {
			bot.sendMessage(channel, helpMsgPmed);
			bot.sendMessage(user, helpMsg);
		});
	});	
}

function showWhoAmI(user, channel) {
	isBotOn(function(){
		if (channel.constructor.name === "PMChannel") {
			checkUser(user, 'admins', function() {
				bot.sendMessage(user, "You're an admin!");
			}, function() {
				checkUser(user, 'registered', function() {
					bot.sendMessage(user, "You're a registered user!");
				}, function(){
					bot.sendMessage(user, "I don't know who you are yet...")
				});
			});
		} else {
			bot.sendMessage(user, "You can only use !whoami in a PM.")
		}
	});	
}

function checkUser(user, group, success, error) {
	useDB('users/'+ group, function(group){
		if (group[user.id]) {
			success();
		} else {
			error();
		}
  });
}
