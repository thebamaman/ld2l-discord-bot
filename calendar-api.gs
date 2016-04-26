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
  event.deleteEventSeries();  
}

function setCaster(eventID, casters) {
  calendar = getCalendar();
  event = calendar.getEventSeriesById(eventID);
  event.setDescription(casters);
  return(event.getDescription());  
}