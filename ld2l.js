/**
 * LD2L Bot: A discord bot for LD2L
 * Made with love and care so that we can properly schedule things in LD2L
 * @version 1.0.1
 * @author Alex Muench (Upstairs/Downstairs), Hiemanshu Sharma (hiemanshu)
 */

//Require needs deps and auth file
var fs = require('fs');
var Discord = require('./node_modules/discord.js');
var AuthDetails = require('./auth.json');
var CalendarApi = require('./ld2lCalendarApi.js');
var Firebase = require("./node_modules/firebase");

//Define symbol used to designate bot commands
var commandPredecessor = "!";

//Create bot 
var bot = new Discord.Client();

//Connect to Firebase DB
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

//Login with auth.json
bot.login(AuthDetails.email, AuthDetails.password);

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
	//logs message out to node console so we can see history in dev console
	console.log('Message from channel : ' + msg.channel.name +
		"\n====> " + msg.author.name + ": " + msg.content);
	
	message = msg.content;

	//checks to see if there is a command issued with the command predecessor
	if (message.indexOf(commandPredecessor) === 0) {
		//converts message to lowercase for easier matching
		command = message.split(" ")[0].toLowerCase().substr(1);
		//switch statement for matching commands
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
			case "findmatches":
				findMatches(message, msg.author, msg.channel);
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

/**
 * Adds user to admin list
 * @param {object} message Discord Message Object
 * @param {object} user    Discord User Object
 * @param {object} channel Discord Channel Object
 */
function addUser(message, user, channel) {
	//checks to make sure user is admin
	checkUser(user, 'admins', function() {
		//checks to make sure message was sent via PM
		if (channel.constructor.name === "PMChannel") {
			// match for username
			var regExp = /!add\s+(.+)\s*/gi;
			var userName = regExp.exec(message)[1];

			//find user on server
			var userToAdd = bot.users.get("username", userName);

			//if user exists, add him to Admin db
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
				bot.sendMessage(user, "User does not exist.  Name must match exactly, and is case sensitive");
			}
		}
	});
}


/**
 * Toggles bot on/off
 * @param {object} message Discord Message Object
 * @param {object} user    Discord User Object
 * @param {object} channel Discord Channel Object
 */
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

/**
 * Function that runs simple success callback if the bot is on.  Used to make sure events only run when bot is on 
 * @param  {function}  success Callback function that runs if the bot is on
 */
function isBotOn(success) {
	firebaseDb.child('allowBot').once('value', function(bool){
		if(bool.val()){
			console.log('bot on');
			success();
		}
		//fail silently if bot is off
	});
}

/**
 * Creates a match on the google calendar
 * @param {object} message Discord Message Object
 * @param {object} user    Discord User Object
 * @param {object} channel Discord Channel Object
 */
function scheduleMatch(message, channel, user) {
	//checks if bot is on
	isBotOn(function(){
		//checks if message was posted in scheduling channel
		if (channel.name == "scheduling"){
			var scheduleInfo = {};
			//match message to regex to grab groups of data for filling the scheduleInfo object
			var regExp = /(!schedule)\s+(Group )([a-tA-T])\s+(.+)(vs)(.+)([0-3][0-9]\/[0-1]\d\/\d\d\d\d)\s+((01|02|03|04|05|06|07|08|09|10|11|12)(:[0-5]\d))\s*([P|A][M])\s*(GMT|SGT|EDT|PDT)\s*/gi;
			var scheduleCommand = regExp.exec(message);
			
			//checks to make sure a correctly formatted schedule string was made
			if (scheduleCommand) {
				//Puts data for event in the correct places
				scheduleInfo.group = scheduleCommand[3].toUpperCase();
				scheduleInfo.team1 = scheduleCommand[4].trim();
				scheduleInfo.team2 = scheduleCommand[6].trim();
				scheduleInfo.date = scheduleCommand[7];
				scheduleInfo.time = scheduleCommand[8];
				scheduleInfo.timePeriod = scheduleCommand[11];
				scheduleInfo.timeZone = scheduleCommand[12].toUpperCase();
				//Pushes event to google calendar
				CalendarApi.addToGoogleCalendar(scheduleInfo, function(eventID){
					//Checks to make sure event was successfully posted
					if(eventID.length > 0){
						//checks to see if user already exists in registry
						checkUser(user, 'registered', function(){
							var userstring = user.id.toString();
							//adds event to user's event object
							firebaseDb.child('users/registered/' + userstring + '/events/' + eventID).set(scheduleInfo);
						}, function(){
							var userstring = user.id.toString();
							//creates new user object
							firebaseDb.child('users/registered/' + userstring).set({'name': user.name});
							//adds event to user's event object
							firebaseDb.child('users/registered/' + userstring + '/events/' + eventID).set(scheduleInfo);
						});
					}
				});
				var matchScheduledMessage = "A Group " + scheduleInfo.group + " match has been scheduled for " + scheduleInfo.team1 + " vs " + scheduleInfo.team2 + " at " +
					scheduleInfo.time + " " + scheduleInfo.timePeriod + " " + scheduleInfo.timeZone + " on " + scheduleInfo.date;
				//sends message to user letting him know his match is scheduled
				bot.sendMessage(channel, matchScheduledMessage);
			} else {
				//sends message to user if his eventstring is formatted incorrectly
				showInvalidEvent(channel);
			}
		}else{
			//sends message if user posts a schedule request in the wrong channel
			bot.sendMessage(channel, "Sorry, you can't use !schedule here");
		}
	});
	
}

/**
 * Removes a match from the google calendar
 * @param {object} message Discord Message Object
 * @param {object} user    Discord User Object
 * @param {object} channel Discord Channel Object
 */
function deScheduleMatch(message, channel, user) {
	//checks if bot is on
	isBotOn(function(){
		//checks to see if message was made via PM
		if (channel.constructor.name === "PMChannel") {
			//checks to make sure user is registered
			checkUser(user, 'registered', function(){
				//gets matchID from the 
				var regExp = /(!deschedule)\s+(.+)/gi;
				var deScheduleMatch = regExp.exec(message);
				//make sure that they only placed the event ID after the !deschedule command and not other stuff
				if (deScheduleMatch[2].indexOf(' ') == -1) {
					CalendarApi.deleteFromCalendar(deScheduleMatch[2], function(status){
						//If event removal is successful, removes event from user
						if(status.status == 'Success'){
							var userstring = user.id.toString();
							//removes event object from user on server
							firebaseDb.child('users/registered/'+ userstring +'/events/' + deScheduleMatch[2]).remove(function(error){
								if(error){
									console.log('Error removing object from ' + user.name + '\'s account');
									console.log(error);
									//sends message if user removal fails at the user level
									bot.sendMessage(user, 'Your event was removed from the calendar, but not from your account, please contact a bot admin (@Upstairs/Downstairs, @hiemanshu)');
								}
							});
							//sends success message if use
							bot.sendMessage(user, "Your event has been removed, please reschedule it if need be!");

						}else{
							//sends message if removal fails at the calendar level
							bot.sendMessage(user, "We couldn't remove your event for the following reason: " + status.message + "\nPlease try again.  If issue persists, contact an admin for help");
						}
					});
				} else {
					//sends message to user if id is malformed
					bot.sendMessage(user, "Please only put the event ID after your command.  You can use !showMatches to see a list of your events and their event IDs")
				}
			},
			function(){
				//sends message to user if they are not registered
				bot.sendMessage(channel, "Sorry, I don't have any events that you can delete");
			});
		}else{
			//send message to user if they use command outside of PM
			bot.sendMessage(user, "You can only use !deschedule in a PM.")
		}
	});	
}

/**
 * Shows all matches that a user has created
 * @param {object} user    Discord User Object
 * @param {object} channel Discord Channel Object
 */
function showMatches(user, channel) {
	//checks if bot is on
	isBotOn(function(){
		//checks to make sure command was sent via PM
		if (channel.constructor.name === "PMChannel") {
			//checks to make sure user is registered
			checkUser(user, 'registered', function() {
				var userstring = user.id.toString();
				//checks to make sure user has events
				useDB('users/registered/' + userstring, function(info){
					if(info['events']){
						//gets list of events if they exist
						firebaseDb.child('users/registered/' + userstring + '/events/').once('value', function(eventObj){
							var events = eventObj.val();
							var eventKeys = Object.keys(events);
							var eventBlock = "Here is the list of your scheduled events:\n";
							//creates string from list of events in object
							for(var i = 0, len = eventKeys.length; i < len; i++){
								var eventString = "";
								eventString+= "Event ID: " + eventKeys[i] + " || " + events[eventKeys[i]].team1 + " VS " + events[eventKeys[i]].team2 + " @ " + events[eventKeys[i]].date + "\n";
								eventBlock+= eventString;
							}
							//sends message to user with events
							bot.sendMessage(user, eventBlock);
						});
					}else{
						//sends message if user has no events
						bot.sendMessage(user, "You have no events at the moment!");
					}
				})
				
			}, function() {
				//sends message to user if they're not registered
				bot.sendMessage(user, "I'm sorry, you're not a registered user, and therefore can't have any matches!  You will be automatically registered when you schedule your first match");
			});
		} else {
			//sends message to user if they use command outside of PM
			bot.sendMessage(user, "You can only use !showMatches in a PM.");
		}
	});
	
}

/**
 * Finds all matches that a specific user has created
 * @param {object} user    Discord User Object
 * @param {object} channel Discord Channel Object
 */
function findMatches(message, user, channel) {
	//checks if bot is on
	isBotOn(function(){
		//checks to make sure user is admin
		checkUser(user, 'admins', function() {
			//checks to make sure message was sent via PM
			if (channel.constructor.name === "PMChannel") {
				// match for username
				var regExp = /!findmatches\s+(.+)\s*/gi;
				var userName = regExp.exec(message)[1];

				//find user on server
				var userWithMatches = bot.users.get("username", userName);

				//if user exists, add him to Admin db
				if (userWithMatches) {
					var userstring = userWithMatches.id.toString();
					checkUser(userWithMatches, 'registered', function(){
						useDB('users/registered/' + userstring, function(info){
							if(info['events']){
								//gets list of events if they exist
								firebaseDb.child('users/registered/' + userstring + '/events/').once('value', function(eventObj){
									var events = eventObj.val();
									var eventKeys = Object.keys(events);
									var eventBlock = "Here is a list of " + userWithMatches.name + "'s scheduled events:\n";
									//creates string from list of events in object
									for(var i = 0, len = eventKeys.length; i < len; i++){
										var eventString = "";
										eventString+= "Event ID: **" + eventKeys[i] + "** || " + events[eventKeys[i]].team1 + " VS " + events[eventKeys[i]].team2 + " @ " + events[eventKeys[i]].date + "\n";
										eventBlock+= eventString;
									}
									//sends message to user with events
									bot.sendMessage(user, eventBlock);
								});
							}else{
								//sends message if user has no events
								bot.sendMessage(user, "This user has not scheduled any matches");
							}
						});
					},function(){
						bot.sendMessage(user, "User is not registered yet, and therefore can't have any matches scheduled")
					});
				} else {
					bot.sendMessage(user, "User does not exist.  Name must match exactly, and is case sensitive");
				}
			}
		});
	});
	
}

/**
 * Sends message if invalid command is issued in server
 * @param {object} channel Discord Channel Object
 */
function showInvalidCommand(channel) {
	//checks to make sure bot is on
	isBotOn(function(){
		var invalidCommandMsg = "That was a invalid command. Try again. Use !help for help."
		//sends message to user letting them know command is invalid
		bot.sendMessage(channel, invalidCommandMsg);
	});
	
}

/**
 * Sends message if invalid event format is passed in a !schedule command
 * @param {object} channel Discord Channel Object
 */
function showInvalidEvent(channel) {
	var invalidCommandMsg = "Your event format was incorrect, please try again.  If you need assistance please type '!help' in chat!"
	bot.sendMessage(channel, invalidCommandMsg);
}

/**
 * Sends PM with basic commands and help to user
 * @param {object} channel Discord Channel Object
 * @param {object} user    Discord User Object
 */
function showHelp(channel, user) {
	//makes sure bot is on
	isBotOn(function(){
		//creates messasge using user's name
		var helpMsgPmed = "Hi, " + user.mention() + "! Please check your PM for information on how to use me."
		var helpMsg = "Hi, I'm LD2L Bot!\n\n" +
		"To schedule a match, please make a post with the following structure: \n" +
		"!schedule GROUP <Letter> <Team 1> VS <Team 2> DD/MM/YYYY HH:MM AM/PM <EDT/PDT/SGT/GMT>\n" +
		"Example: GROUP E NASOLO#1 VS NASOLO#2 25/04/2016 04:00PM EDT\n\n" +
		"To know if I recognize you, use !whoami in a PM.\n\n" + 
		"To see a list of the matches you have scheduled, use !showMatches in a PM\n\n" +
		"To remove a match you have scheduled, type !deschedule <matchID> in a PM. Match IDs are shown in !showMatches\n\n" +
		"If there are any issues with the bot, ping @Upstairs/Downstairs, @hiemanshu, or log an issue here: https://github.com/ammuench/ld2l-discord-bot/issues";
		//checks if user is admin, then adds additional commands
		checkUser(user, 'admins', function() {
			helpMsg = helpMsg + "\n\n" +
			"To add another admin use !add <user name>.\nOnly works in PM, fails silently in public channels";
			bot.sendMessage(channel, helpMsgPmed);
			bot.sendMessage(user, helpMsg);
		}, function() {
			//sends message without admin extras otherwise 
			bot.sendMessage(user, helpMsg);
		});
	});	
}

/**
 * Tells a user who they are via PM
 * @param {object} user    Discord User Object
 * @param {object} channel Discord Channel Object
 */
function showWhoAmI(user, channel) {
	//checks to make sure bot is on
	isBotOn(function(){
		//checks to make sure command was issued via PM
		if (channel.constructor.name === "PMChannel") {
			//checks if they're an admin
			checkUser(user, 'admins', function() {
				bot.sendMessage(user, "You're an admin!");
			}, function() {
				//if not admin, checks if they're a registerd user
				checkUser(user, 'registered', function() {
					bot.sendMessage(user, "You're a registered user!");
				}, function(){
					//if not admin or registered user, respond that you don't know who they are
					bot.sendMessage(user, "I don't know who you are yet...")
				});
			});
		} else {
			//sends message to user if they use command outside of PM
			bot.sendMessage(user, "You can only use !whoami in a PM.")
		}
	});	
}

/**
 * Checks to see if a user is a member of a specific group
 * @param  {object} user    Discord User Object
 * @param  {string} group   Name of group that the user is being checked against
 * @param  {[type]} success Callback function run if the user is a member of the group they're checked against
 * @param  {[type]} error   Callback function run if the user is NOT a member of the group they're checked against
 */
function checkUser(user, group, success, error) {
	useDB('users/'+ group, function(group){
		if (group[user.id]) {
			success();
		} else {
			error();
		}
  });
}
