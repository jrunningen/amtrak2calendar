// TODO:
// - Allow the user to configure time triggers. This might require releasing the same code as a non-gmail add-on.

import * as moment from "moment";
// Prettier will try to wrap long import statements across lines, but this breaks ts2gas compilation.
// prettier-ignore
import { syncCalendarEvent, getCalendar, getTrainCalendarEvents, getReservationCalendarEvents } from "./Calendar";
import { ocrAttachment } from "./Ocr";
import { Train } from "./Train";
import { getReservationNumber, ReservationCollection } from "./Reservation";
import { stationToTimeZone } from "./TzData";
import { fail } from "assert";

const SEARCH_RANGE = "6m";

/**
 * Return the webpage template.
 *
 * From here, users can enable or disable syncing their trains.
 */
function doGet() {
  const template = HtmlService.createTemplateFromFile("Index");
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
    if (
      trigger.getHandlerFunction() === "autoSync" &&
      trigger.getEventType() === ScriptApp.EventType.CLOCK
    ) {
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
  ScriptApp.newTrigger("autoSync")
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
 * Gets emails releted to Amtrak reservations.
 */
function getReservationThreads(): GoogleAppsScript.Gmail.GmailThread[] {
  return GmailApp.search(
    `from:etickets@amtrak.com subject:"eticket and receipt for your" newer_than:${SEARCH_RANGE}`
  );
}

/**
 * Gets emails releted to Amtrak cancellations.
 */
function getCancellationThreads(): GoogleAppsScript.Gmail.GmailThread[] {
  return GmailApp.search(
    `from:etickets@amtrak.com "reservation canceled" newer_than:${SEARCH_RANGE}`
  );
}

function getCancelledReservationNumbers(): string[] {
  return getCancellationThreads().map((thread) =>
    getReservationNumber(thread.getMessages()[0])
  );
}

/**
 * Scan the user's Gmail inbox, and sync all future Amtrak reservations to the calendar.
 *
 * This function is intended to be called as a recurring trigger, so the user
 * doesn't have to click anything - the calendar will just be updated
 * automatically, like with Gmail's native support for airline reservations.
 */
function autoSync() {
  // Remove cancellations from Calendar
  const cancelledReservationNumbers = getCancelledReservationNumbers();
  const reservationThreads = getReservationThreads();

  // Information returned to the caller.
  const reservationsFound = [];
  const trainsSynced = [];
  const reservationsFailed = [];
  const reservationsAlreadyPresent = [];

  for (const reservationThread of reservationThreads) {
    for (const message of reservationThread.getMessages()) {
      // Checking the message body is cheaper than OCRing text. Scan the email for
      // trains that should be synced. If we don't find any, we can skip the OCR.
      const messageBody = message.getBody();
      const reservationNumber = getReservationNumber(messageBody);

      reservationsFound.push(reservationNumber);

      const reservationCalendarEvents = getReservationCalendarEvents(
        reservationNumber
      );
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

      let trains: Train[] = [];
      // FIXME: There's room for improvement in the logic here. This will sync both
      // trains in a round trip, even if one already has a calendar event, possibly
      // resulting in duplicate reservations.
      try {
        trains = Train.FromOcrText(ticketText);
      } catch (error) {
        reservationsFailed.push(reservationNumber);
        continue;
      }

      for (const train of trains) {
        if (syncCalendarEvent(train, reservationNumber)) {
          trainsSynced.push(train.toParams());
        }
      }
    }
  }

  return {
    reservationsFound: reservationsFound,
    reservationsFailed: reservationsFailed,
    reservationsAlreadyPresent: reservationsAlreadyPresent,
    trainsSynced: trainsSynced,
  };
}

/**
 * Gets all the information we can from Gmail without reading OCR or changing
 * anything. This populates the list of trains the user sees on the main page.
 *
 * FIXME: This code is duplicated in autoSync(). Refactor it so that this
 * function can be called first in autoSync(), retaining the context of
 * associating trains with their gmail messages and attachments.
 */
function getReservationsFromGmail() {
  const reservations = new ReservationCollection();
  for (const thread of getReservationThreads()) {
    for (const message of thread.getMessages()) {
      // Checking the message body is cheaper than OCRing text. Scan the email for
      // trains that should be synced. If we don't find any, we can skip the OCR.
      reservations.addEmailMessageBody(message.getDate(), message.getBody());
    }
  }
  for (const cancelledReservationNumber of getCancelledReservationNumbers()) {
    reservations.cancel(cancelledReservationNumber);
  }
  return reservations.toDisplayObject();
}
