// Functions for calendar event management.

import { Train } from "./Train";

// Cache the calendar to save on API calls.
let activeCalendar = null;

/**
 * Get the configured calendar.
 *
 * If no calendar is configured, such as when the user has never visited the
 * settings menu, the user's default calendar is used.
 */
export function getCalendar() {
  if (activeCalendar != null) {
    return activeCalendar;
  }
  let calendarId = getCalendarId();
  if (calendarId == null || calendarId === "") {
    return CalendarApp.getDefaultCalendar();
  }
  activeCalendar = CalendarApp.getCalendarById(calendarId);
  return activeCalendar;
}

/**
 * Get the calendar ID.
 */
export function getCalendarId(): string {
  return PropertiesService.getUserProperties().getProperty("calendarId");
}

/**
 * Set the calendar ID.
 */
export function setCalendarId(calendarId: string) {
  PropertiesService.getUserProperties().setProperty(
    "calendarId",
    calendarId.trim()
  );
}

/**
 * Get calendar events related to a Train.
 *
 * We search using the train reservation number, the special "Amtrak2Calendar"
 * string that goes in all calendar events, and with boundaries one day before
 * and one day after the train departure.
 *
 * @param train The train.
 */
export function getTrainCalendarEvents(train: Train) {
  return getCalendar().getEvents(
    train.depart
      .clone()
      .add(-1, "day")
      .toDate(),
    train.depart
      .clone()
      .add(1, "day")
      .toDate(),
    { search: "Amtrak2Calendar " + train.reservationNumber }
  );
}

export function getReservationCalendarEvents(reservationNumber: string) {
  var now = new Date();
  var oneYearFromNow = new Date(now.getTime() + (12 * 30 * 24 * 60 * 60 * 1000));
  return CalendarApp.getDefaultCalendar().getEvents(
    now, 
    oneYearFromNow,
    {search: `Amtrak2Calendar ${reservationNumber}`});
}

/**
 * Add a train to the calender unless it's already present.
 *
 * @param train The train to create an event for.
 * @returns boolean True if an event was created, false if the event already
 *     exists.
 */
export function syncCalendarEvent(train: Train) {
  // TODO(jrunningen): This should ideally also find differences in the calendar
  // event dates, and delete or recreate it if necessary.
  if (getTrainCalendarEvents(train).length > 0) {
    return false;
  }
  createCalendarEvent(train);
  return true;
}

export function createCalendarEvent(train: Train) {
  const event = getCalendar().createEvent(
    train.description,
    train.depart.toDate(),
    train.arrive.toDate()
  );
  event.setDescription(
    "Reservation number: " +
    train.reservationNumber +
    "\nCreated by Amtrak2Calendar"
  );
  event.addGuest(Session.getEffectiveUser().getEmail());
  Logger.log("Created event %s", event.getId());
}

/**
 * Removes the given train from the calendar, if found.
 *
 * @param train
 * @returns The number of calendar events removed. 0 means no matching events
 * were found.
 */
export function removeTrainEvent(train: Train): Number {
  const events = getCalendar().getEvents(
    train.depart
      .clone()
      .add(-24, "hour")
      .toDate(),
    train.depart
      .clone()
      .add(1, "hour")
      .toDate(),
    { search: `Amtrak2Calendar ${train.reservationNumber}` }
  );

  const eventCount = events.length;
  if (eventCount === 0) {
    Logger.log(
      "Didn't find any calendar events for reservation %s",
      train.reservationNumber
    );
  }

  events.forEach((event) => {
    Logger.log(
      "Deleting cancelled reservation %s: %s",
      train.reservationNumber,
      event
    );
    event.deleteEvent();
  });

  return eventCount;
}
