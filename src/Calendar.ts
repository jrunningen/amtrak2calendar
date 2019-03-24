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
  const calendarId = getCalendarId();
  if (calendarId == null || calendarId === "") {
    return CalendarApp.getDefaultCalendar();
  }
  activeCalendar = CalendarApp.getCalendarById(calendarId);
  return activeCalendar;
}

export function getCalendarName() {
  return getCalendar().getName();
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
export function getTrainCalendarEvents(
  train: Train,
  reservationNumber: string
) {
  return getCalendar().getEvents(
    train.depart
      .clone()
      .add(-1, "day")
      .toDate(),
    train.depart
      .clone()
      .add(1, "day")
      .toDate(),
    { search: "Amtrak2Calendar " + reservationNumber }
  );
}

export function getCalendarNamesAndIds() {
  const calendars = CalendarApp.getAllOwnedCalendars();
  const results = [];
  for (const calendar of calendars) {
    results.push({
      name: calendar.getName(),
      id: calendar.getId(),
    });
  }
  return results;
}

export function getReservationCalendarEvents(reservationNumber: string) {
  const now = new Date();
  const oneYearFromNow = new Date(
    now.getTime() + 12 * 30 * 24 * 60 * 60 * 1000
  );
  const oneYearAgo = new Date(
    now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000
  );
  return getCalendar().getEvents(oneYearAgo, oneYearFromNow, {
    search: `Amtrak2Calendar ${reservationNumber}`,
  });
}

export function clearGlitchedEvents() {
  for (const event of getReservationCalendarEvents("undefined")) {
    console.warn("Removed a glitched event");
    event.deleteEvent();
  }
}
