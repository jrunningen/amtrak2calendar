// TODO:
// - Allow the user to configure time triggers. This might require releasing the same code as a non-gmail add-on.

import * as moment from "moment";
import { syncCalendarEvent, getCalendar, getTrainCalendarEvents, getReservationCalendarEvents} from "./Calendar";
import { ocrAttachment } from "./Ocr";
import { Train } from "./Train";
import { stationToTimeZone } from "./TzData";
import { fail } from "assert";

const SEARCH_RANGE = '6m';

/**
 * Return the webpage template.
 *
 * From here, users can enable or disable syncing their trains.
 */
function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  const template.isAutoSyncEnabled = false

  const calendars = CalendarApp.getAllOwnedCalendars();
  template.calendars = [];
  for (const calendar of calendars) {
    template.calendars.push({
      name: calendar.getName(),
      id: calendar.getId(),
    })
  }

  const selectedCalendar = getCalendar();
  template.selectedCalendar = {
    name: selectedCalendar.getName(),
    id: selectedCalendar.getId(),
  }

  return template.evaluate();
}

/**
 * Print a snippet of HTML from the named file. For including HTML fragments in
 * HTML templates. Based on the example at
 * https://developers.google.com/apps-script/guides/html/best-practices#separate_html_css_and_javascript
 * @param filename The HTML snippet to be included.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Returns true if there's a time-based trigger that runs autoSync().
 *
 * This tells the user whether they should expect train reservations to sync to
 * the calendar or not.
 */
function isAutoSyncEnabled() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction === "autoSync" &&
        trigger.getEventType() === ScriptApp.EventType.CLOCK) ) {
          return true;
    }
  }
  return false;
}

/**
 * Set up a time-based trigger for automatic syncing.
 *
 * Removes all other triggers.
 */
function createAutoSyncTrigger() {
  removeAllTriggers();
  ScriptApp.newTrigger('autoSync')
      .timeBased()
      .everyHours(1)
      .create();
}

/**
 * Remove all project triggers.
 */
function removeAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

/**
 * Scan the user's Gmail inbox, and sync all future Amtrak reservations to the calendar.
 *
 * This function is intended to be called as a recurring trigger, so the user
 * doesn't have to click anything - the calendar will just be updated
 * automatically, like with Gmail's native support for airline reservations.
 */
function autoSync() {
	// Log a blank message, so I can verify that Stackdriver Logging works during
	// normal operation.
  console.log();

  // Remove Cancellations from Calendar
  const cancellationThreads = GmailApp.search(
    `from:etickets@amtrak.com "reservation canceled" newer_than:${SEARCH_RANGE}`
  );
  const cancelledReservationNumbers = [];
  cancellationThreads.forEach((thread) => {
    const message = thread.getMessages()[0];
    const reservationNumber = getReservationNumber(message.getBody());
    cancelledReservationNumbers.push(reservationNumber);
  });

  const threads = GmailApp.search(
    `from:etickets@amtrak.com subject:"eticket and receipt for your" newer_than:${SEARCH_RANGE}`
  );

  // Information returned to the caller.
  const reservationsFound = [];
  const trainsSynced = [];
  const reservationsFailed = [];
  const reservationsAlreadyPresent = [];

  for (const thread of threads) {
    for (const message of thread.getMessages()) {
      // Checking the message body is cheaper than OCRing text. Scan the email for
      // trains that should be synced. If we don't find any, we can skip the OCR.
      const messageBody = message.getBody();
      const reservationNumber = getReservationNumber(messageBody);

      reservationsFound.push(reservationNumber);

      const reservationCalendarEvents = getReservationCalendarEvents(reservationNumber);
      if (reservationCalendarEvents.length !== 0) {
        reservationsAlreadyPresent.push(reservationNumber);

        // At least one train from the reservation is already on the calendar. Skip.
        // FIXME: If one, but not both, trains are on the calendar, we should
        // sync the absent one. Check the message body text for being a one-way
        // or round-trip ticket, and try to detect this situation.
        if (cancelledReservationNumbers.indexOf(reservationNumber) !== -1) {
          for (const event of reservationCalendarEvents) {
            event.deleteEvent();
          }
        }
      }

      const attachment = message.getAttachments()[0];
      const ticketText = ocrAttachment(attachment);
      if (ticketText === null) {
        reservationsFailed.push(reservationNumber);
        continue;
      }

      // FIXME: There's room for improvement in the logic here. This will sync both
      // trains in a round trip, even if one already has a calendar event, possibly
      // resulting in duplicate reservations.
      try {
        const trains = Train.FromOcrText(ticketText);
      } catch (error) {
        reservationsFailed.push(reservationNumber);
        continue;
      }

      for (const train of trains) {
        if(syncCalendarEvent(train)) {
          trainsSynced.push(train.description);
        }
      };
    };
  };

  return {
    reservationsFound: reservationsFound,
    reservationsFailed: reservationsFailed,
    reservationsAlreadyPresent: reservationsAlreadyPresent,
    trainsSynced: trainsSynced,
  };
}

function getReservationNumber(messageBody) {
  const match = messageBody.match("Reservation Number - ([A-Z0-9]+)");
  if (match == null) {
    return null;
  }
  return match[1];
}

export function getTrainsFromMessageBody(messageBody: string): Train[] {
  const reservationNumber = getReservationNumber(messageBody);
  const re = /ChangeSummaryTrainInfo">(Train [^<]+)<\/span><span .*?ChangeSummaryDepart">Depart (.*?)</g;
  let match;
  const trains: Train[] = [];
  do {
    match = re.exec(messageBody);
    if (match) {
      // FIXME: Get the departure station from the message body, if possible.
      const depart = moment.tz(match[2], "hh:mm a, ddd, MMMM DD YYYY", stationToTimeZone("NYP"));
      // Arrival time is not available from email message bodies. Use 1 hour as a placeholder.
      const arrive = depart.clone().add(1, "hour");
      const trainName = match[1];
      const train = new Train(
        trainName,
        "???",
        "???",
        reservationNumber,
        depart,
        arrive
      );
      trains.push(train);
    }
  } while (match);

  return trains;
}

/**
 * Get all trains from a single reservation message.
 *
 * @param message
 * @param cancelledReservationNumbers
 */
function getTrains(message, cancelledReservationNumbers) {
}
