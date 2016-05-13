function addToCalendar(group, team1, team2, startTime, endTime) {
  calendar = getCalendar();
  title = 'Group ' + group + ': ' + team1 + " vs " + team2;
  var newEvent = calendar.createEvent(title, new Date(startTime), new Date(endTime));
  return newEvent.getId();
}

function getCalendar() {
  calendars = CalendarApp.getCalendarsByName("Learn Dota 2 Spring League 2016");
  return calendars[0];
}

function deleteEvent(eventID) {
  calendar = getCalendar();
  event = calendar.getEventSeriesById(eventID);
  var eventName = event.getTitle();
  event.deleteEventSeries();
  return eventName;
}

function setCaster(eventID, casters) {
  calendar = getCalendar();
  event = calendar.getEventSeriesById(eventID);
  event.setDescription(casters);
  return event.getDescription();  
}

function getEvents(date){
  calendar = getCalendar();
  var eventArray = calendar.getEventsForDay(new Date(date));
  var returnArray = [];
  for (var i = 0, len = eventArray.length; i<len; i++){
    var eventObj = {
      id: eventArray[i].getId(),
      name: eventArray[i].getTitle(),
      time: eventArray[i].getStartTime() 
    }
    returnArray.push(eventObj);
  }
  return JSON.stringify(returnArray);
}