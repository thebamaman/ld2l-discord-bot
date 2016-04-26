var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var moment = require('moment');
moment().format();

var SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.google.com/calendar/feeds'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'ld2l-calendar-api.json';

// Load client secrets from a local file.
module.exports = {
  addToGoogleCalendar: function(scheduleInfo, callback) {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
      if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
      }
      // Authorize a client with the loaded credentials, then call the
      // Google Apps Script Execution API.
      authorize(JSON.parse(content), scheduleInfo, function(oauth, calEvent){
        callAppsScript(oauth, calEvent, function(eventID){
          callback(eventID);
        })
      });
    });
  },
  deleteFromCalendar: function(calEvent, callback) {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
      if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
      }
      // Authorize a client with the loaded credentials, then call the
      // Google Apps Script Execution API.
      authorize(JSON.parse(content), calEvent, function(oauth, calEvent){
        deleteEvent(oauth, calEvent, function(status){
          callback(status);
        })
      });
    });
  },
  setCaster: function(casterArray, callback) {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
      if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
      }
      // Authorize a client with the loaded credentials, then call the
      // Google Apps Script Execution API.
      authorize(JSON.parse(content), casterArray, function(oauth, casterArray, casters){
        setCaster(oauth, casterArray, function(status){
          callback(status);
        })
      });
    });
  }
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, passThruInfo, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client, passThruInfo);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Call an Apps Script function to list the folders in the user's root
 * Drive folder.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function callAppsScript(auth, scheduleInfo, callback) {
  var scriptId = 'M11dUZp9TOMHRvOK1io6Gr2l4h4jajEHq';
  var script = google.script('v1');

  if(scheduleInfo.timeZone == "SGT"){
    scheduleInfo.timeZone = "GMT+8";
  }

  var startingTime = moment(scheduleInfo.date + " " + scheduleInfo.time + " " + scheduleInfo.timePeriod, "DD/MM/YYYY hh:mm a");
  var startTime = startingTime.format("MMMM DD YYYY hh:mm a") + " " + scheduleInfo.timeZone;

  var endingTime = startingTime.add(2, 'hours');
  var endTime = endingTime.format("MMMM DD YYYY hh:mm a") + " " + scheduleInfo.timeZone;

  // Make the API request. The request object is included here as 'resource'.
  script.scripts.run({
    auth: auth,
    resource: {
      function: 'addToCalendar',
      parameters: [scheduleInfo.group, scheduleInfo.team1, scheduleInfo.team2, startTime, endTime]
    },
    scriptId: scriptId
  }, function(err, resp) {
    if (err) {
      // The API encountered a problem before the script started executing.
      console.log('The API returned an error: ' + err);
      return;
    }
    if (resp.error) {
      // The API executed, but the script returned an error.

      // Extract the first (and only) set of error details. The values of this
      // object are the script's 'errorMessage' and 'errorType', and an array
      // of stack trace elements.
      var error = resp.error.details[0];
      console.log('Script error message: ' + error.errorMessage);
      console.log('Script error stacktrace:');

      if (error.scriptStackTraceElements) {
        // There may not be a stacktrace if the script didn't start executing.
        for (var i = 0; i < error.scriptStackTraceElements.length; i++) {
          var trace = error.scriptStackTraceElements[i];
          console.log('\t%s: %s', trace.function, trace.lineNumber);
        }
      }
    }else{
      callback(resp.response.result.split("@")[0]);
    }
  });
}

function deleteEvent(auth, eventID, callback) {
  var scriptId = 'M11dUZp9TOMHRvOK1io6Gr2l4h4jajEHq';
  var script = google.script('v1');

  var eventIDFormatted = eventID + "@google.com";

  // Make the API request. The request object is included here as 'resource'.
  script.scripts.run({
    auth: auth,
    resource: {
      function: 'deleteEvent',
      parameters: [eventIDFormatted]
    },
    scriptId: scriptId
  }, function(err, resp) {
    if (err) {
      // The API encountered a problem before the script started executing.
      console.log('The API returned an error: ' + err);
      return;
    }
    if (resp.error) {
      // The API executed, but the script returned an error.

      // Extract the first (and only) set of error details. The values of this
      // object are the script's 'errorMessage' and 'errorType', and an array
      // of stack trace elements.
      var error = resp.error.details[0];
      console.log('Script error message: ' + error.errorMessage);
      console.log('Script error stacktrace:');

      if (error.scriptStackTraceElements) {
        // There may not be a stacktrace if the script didn't start executing.
        for (var i = 0; i < error.scriptStackTraceElements.length; i++) {
          var trace = error.scriptStackTraceElements[i];
          console.log('\t%s: %s', trace.function, trace.lineNumber);
        }
      }
      callback({status: "Error", message: error.errorMessage});
    }else{
      callback({status: "Success", message: "Your event has been removed"});
    }
  });
}

function setCaster(auth, casterArray, callback) {
  var scriptId = 'M11dUZp9TOMHRvOK1io6Gr2l4h4jajEHq';
  var script = google.script('v1');

  var eventIDFormatted = casterArray[0] + "@google.com";
  var descriptionFormatted = casterArray[1].toString();

  // Make the API request. The request object is included here as 'resource'.
  script.scripts.run({
    auth: auth,
    resource: {
      function: 'setCaster',
      parameters: [eventIDFormatted, descriptionFormatted]
    },
    scriptId: scriptId
  }, function(err, resp) {
    if (err) {
      // The API encountered a problem before the script started executing.
      console.log('The API returned an error: ' + err);
      return;
    }
    if (resp.error) {
      // The API executed, but the script returned an error.

      // Extract the first (and only) set of error details. The values of this
      // object are the script's 'errorMessage' and 'errorType', and an array
      // of stack trace elements.
      var error = resp.error.details[0];
      console.log('Script error message: ' + error.errorMessage);
      console.log('Script error stacktrace:');

      if (error.scriptStackTraceElements) {
        // There may not be a stacktrace if the script didn't start executing.
        for (var i = 0; i < error.scriptStackTraceElements.length; i++) {
          var trace = error.scriptStackTraceElements[i];
          console.log('\t%s: %s', trace.function, trace.lineNumber);
        }
      }
      callback({status: "Error", message: error.errorMessage});
    }else{
      callback({status: "Success", message: "Casters added to game"});
    }
  });
}
