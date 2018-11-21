// Functionality for managing the Amtrak2Calendar GMail sidebar. It allows users to
// see parsed train information, and manage the corresponding calendar events, when
// viewing a single email.

import { createCalendarEvent, getCalendar, getTrainCalendarEvents, removeTrainEvent, syncCalendarEvent } from "./Calendar";
import { Train } from "./Train";
import { ocrAttachment } from "./Ocr";

/**
 * A helper function to show a notification to the user.
 *
 * @param e The event.
 * @param message The string to be displayed in the notification.
 */
export function simpleNotificationResponse(e, message: string) {
  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification()
        .setType(CardService.NotificationType.INFO)
        .setText(message)
    )
    .setNavigation(CardService.newNavigation()
      .popToRoot()
      .updateCard(buildTrainsCard(e)))
    .setStateChanged(true)
    .build();
}

/**
 * The Gmail addon triggerfunction, listed in appsscript.json.
 *
 * Called when the user opens an e-mail, before they open the Amtrak2Calendar
 * sidebar.
 *
 * @param e The Gmail event.
 */
function buildAddOn(e) {
  return [buildTrainsCard(e)];
}

/**
 * Gets the trains based on the attached PDF ticket.
 *
 * This will OCR scan the PDF ticket using Google Drive, so that the raw text
 * can be parsed by regexp. To avoid OCRing the PDF in Google Drive every time
 * the user does something, we cache the text, using the messageId as the key.
 *
 * According to documentation at
 * https://developers.google.com/apps-script/guides/support/best-practices#use_the_cache_service,
 * text remains in cache for 25 minutes.
 *
 * @param e The Gmail event object.
 */
function extractTrainsFromAttachment(e): Train[] {
  const messageId = e.messageMetadata.messageId;
  const cache = CacheService.getUserCache();
  const cachedText = cache.get(messageId);
  if (cachedText != null) {
    return Train.FromOcrText(cachedText);
  }
  const message = GmailApp.getMessageById(messageId);
  const attachments = message.getAttachments()
  if (attachments.length === 0) {
    return [];
  }
  const attachment = attachments[0];
  if (attachment === null) {
    return [];
  }
  const ticketText = ocrAttachment(attachment);
  cache.put(messageId, ticketText);
  return Train.FromOcrText(ticketText);
}

function syncReservation(e) {
  const trains = extractTrainsFromAttachment(e);
  for (const train of trains) {
    syncCalendarEvent(train);
  }
  return simpleNotificationResponse(e, `Synchronized reservation ${trains[0].reservationNumber}`)
}

/**
 * Create a card representing this reservation, with information about
 * departure, and buttons for creating and viewing calendar events.
 */
function buildTrainsCard(e) {
  const trains = extractTrainsFromAttachment(e);
  const cards = [];

  // Build a card for each recent thread from this email's sender.
  if (trains.length === 0) {
    // Not an Amtrak reservation.
    // TODO(jrunningen): Link to Github issues.
    return CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader().setTitle(
          "This doesn't look like an Amtrak reservation to me. 🚆"
        )
      )
      .build();
  }

  if (getCalendar() == null) {
    const noCalendarCard = CardService.newCardBuilder();
    noCalendarCard.setHeader(CardService.newCardHeader().setTitle("Please choose a calendar in the settings menu."));
    return noCalendarCard.build();
  }

  const card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader().setTitle(`Reservation ${trains[0].reservationNumber}`));

  const overviewSection = CardService.newCardSection().addWidget(
    CardService.newTextButton()
      .setText("Sync reservation to calendar")
      .setOnClickAction(
        CardService.newAction().setFunctionName("syncReservation")
      )
  );
  card.addSection(overviewSection);

  for (const train of trains) {
    const trainSection = CardService.newCardSection().setHeader(train.description);
    trainSection.addWidget(
      CardService.newKeyValue()
        .setTopLabel("Departure Time")
        .setContent(train.departString)
        .setMultiline(true)
    ).addWidget(
      CardService.newKeyValue()
        .setTopLabel("Arrival Time")
        .setContent(train.arriveString)
        .setMultiline(true)
    );
    const events = getTrainCalendarEvents(train);
    if (events.length > 0) {
      events.forEach((event) => {
        trainSection.addWidget(
          CardService.newTextButton()
            .setText("See in calendar")
            .setOpenLink(
              CardService.newOpenLink().setUrl(
                "https://calendar.google.com/calendar/r/search?q=amtrak2calendar%20" +
                  train.train +
                  "%20" +
                  train.reservationNumber
              )
            )
        );
        trainSection.addWidget(
          CardService.newTextButton()
            .setText("Remove from calendar")
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName("removeEventCallback")
                .setParameters(train.toParams())
            )
        );
      });
    } else {
      trainSection.addWidget(
        CardService.newTextButton()
          .setText("Add to calendar")
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName("addTrainToCalendarCallback")
              .setParameters(train.toParams())
          )
      );
    }
    card.addSection(trainSection);
  }

  return card.build();
}

function addTrainToCalendarCallback(e) {
  const train = Train.FromParams(e.parameters);
  createCalendarEvent(train);
  return simpleNotificationResponse(e, `Added train ${train.train} to your calendar`);
}

function removeEventCallback(e) {
  const train = Train.FromParams(e.parameters);
  const removedEventCount = removeTrainEvent(train);
  if (removedEventCount) {
    return simpleNotificationResponse(e, `Removed train ${train.train} to your calendar`);
  }
  return simpleNotificationResponse(e, `Didn't find train ${train.train} in your calendar`);
}
