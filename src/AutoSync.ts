// TODO:
// - Allow the user to configure time triggers. This might require releasing the same code as a non-gmail add-on.

import * as moment from "moment";
// Prettier will try to wrap long import statements across lines, but this breaks ts2gas compilation.
// prettier-ignore
import { clearGlitchedEvents, getCalendar, getReservationCalendarEvents, getTrainCalendarEvents } from "./Calendar";
import { ocrAttachment } from "./Ocr";
import { getReservationNumber } from "./Reservation";
import { ReservationCollection } from "./ReservationCollection";
import { Train } from "./Train";
import { stationToTimeZone } from "./TzData";

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
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
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
    getReservationNumber(thread.getMessages()[0].getPlainBody())
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
  const reservations = new ReservationCollection();
  for (const thread of getReservationThreads()) {
    for (const message of thread.getMessages()) {
      const attachments = message.getAttachments();
      if (attachments.length <= 0) {
        // That's odd, Amtrak tickets usually have attachments. Without an attachment, we
        // can't add the reservation. Just move on.
        // FIXME: Ideally, this would be reported to the user.
        continue;
      }
      const ticketText = ocrAttachment(attachments[0]);
      if (ticketText === null) {
        // FIXME: Report OCR failure.
        continue;
      }
      reservations.addOcrText(message.getDate(), ticketText);
    }
  }
  for (const cancelledReservationNumber of getCancelledReservationNumbers()) {
    reservations.cancel(cancelledReservationNumber);
  }

  reservations.syncToCalendar();

  clearGlitchedEvents();

  // FIXME: Include error reporting from the last run. Store the information in
  // user-local storage, and display it the next time they load the page.
  // Perhaps include information on filing a bug report.
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
