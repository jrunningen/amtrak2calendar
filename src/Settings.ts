// Settings and calendar management.
//
// From any card, users can get to a settings menu from the "..." button, where
// they can select which calendar they want to use for syncing their train
// reservations.

import { getCalendar, getCalendarId, setCalendarId } from "./Calendar";
import { simpleNotificationResponse } from "./Gmail";

/**
 * Show the settings menu.
 *
 * This is the universal action listed in appsscript.json.
 *
 * @param e The Gmail event object.
 */
function showSettingsMenu(e) {
  return CardService.newUniversalActionResponseBuilder()
    .displayAddOnCards([createSettingsCard()])
    .build();
}

/**
 * Build a card showing calendar settings.
 *
 * Users can:
 * - See the selected calendar.
 * - Click on one of the calendars they own to use it.
 * - Type a calendar ID to set the calendar manually.
 */
function createSettingsCard() {
  const card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader().setTitle("Settings"));

  const selectedCalendar = getCalendar();
  let calendarText = "No calendar selected.";
  if (selectedCalendar) {
    calendarText = selectedCalendar.getName();
  }
  const selectedCalendarSection = CardService.newCardSection()
    .setHeader("Selected calendar")
    .addWidget(CardService.newTextParagraph().setText(calendarText));
  card.addSection(selectedCalendarSection);

  // Display all owned calendars as clickable buttons.
  const calendarSettingsSection = CardService.newCardSection();
  const calendars = CalendarApp.getAllOwnedCalendars();
  for (const calendar of calendars) {
    calendarSettingsSection.addWidget(
      CardService.newTextButton()
        .setText(calendar.getName())
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("updateCalendarIdFromParam")
            .setParameters({
              "calendarId": calendar.getId(),
              "calendarName": calendar.getName(),
            })
        )
    );
  }

  // Allow the user to specify a calendar by ID, if the button list doesn't have
  // what they want.
  const updateCalendarIdAction = CardService.newAction()
    .setFunctionName("updateCalendarIdFromFormInput");
  const calendarIdInput = CardService.newTextInput()
    .setFieldName("calendarId")
    .setTitle("Calendar ID")
    .setHint("Example: hfomvvrltiot5023ilqqdhnjes@group.calendar.google.com")
    .setOnChangeAction(updateCalendarIdAction);
  let calendarId: string = getCalendarId();
  if (calendarId != null) {
    calendarIdInput.setValue(calendarId);
  }
  calendarSettingsSection.setHeader("Choose a different calendar").addWidget(calendarIdInput);

  card.addSection(calendarSettingsSection);

  return card.build();
}

// Callbacks for the different ways a user can set their calendar.

/**
 * Callback for when the user clicks an owned calendar from the list.
 *
 * @param e Callback event.
 */
function updateCalendarIdFromParam(e) {
  setCalendarId(e.parameters.calendarId);
  return simpleNotificationResponse(e, `Using calendar "${e.parameters.calendarName}"`);
}

/**
 * Callback for when the user types/pastes a calendar ID in the form field.
 *
 * @param e Callback event.
 */
function updateCalendarIdFromFormInput(e) {
  setCalendarId(e.formInput.calendarId);
}
