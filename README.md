Amtrak2Calendar
===============

Amtrak2Calendar is a Google Add-On that helps you create Google Calendar
events from your Amtrak reservation emails.

Amtrak2Calendar will scan your reservation e-mail and extract train
information, like departure and arrival time, and create calendar events
accordingly on your Google Calendar. This emulates what GMail normally does
for airline tickets, dinner reservations, and so on.

How to use
==========

Amtrak2Calendar is not yet available in the G Suite Marketplace - I need some
testers first. If you're a frequent Amtrak rider, you can help test it!

Try the [current release](http://amtrak2calendar.runningen.net).

If you're willing to accept the permissions (and they look scary, I know - I'm
looking for ways to restrict the permission set, but it may not be possible),
then you can click the button to "enable auto-sync."

From then on, Amtrak2Calendar will scan for new Amtrak tickets once per hour,
and sync them to your calendar as necessary.

See the code
------------

Amtrak2Calendar is deployed to http://amtrak2calendar.runningen.net. It's
implemented purely in Google Apps Script. Anyone is free to view the [live,
currently-deployed
code](https://script.google.com/d/16N8B7R4oi0fVO3Aqh5fXICTbNsP5uKi_F1ZhJ_SX8X6JJ_M6GhxrYcyV/edit?usp=sharing)

Feedback
--------

If you're brave enough to click past all of the permission warnings, and start
using Amtrak2Calendar, I'd love to hear how I can make it more useful. You can:

1. [Create an issue](https://github.com/jrunningen/amtrak2calendar/issues/new)
   on this repository.
2. Send an email to amtrak2calendar-users@googlegroups.com.

Manual build
------------

If you'd like to be sure that the code reading your e-mail is the same code in
this repo, you can also build this add-on yourself.

1. Clone this repo.
2. Install [clasp](https://github.com/google/clasp).
3. Use clasp to push this code to a new project.
4. Publish a developer version.
5. Install the developer version in your GMail account.

Explanation of permissions
==========================

When you install Amtrak2Calendar, Google is going to ask you to grant
permissions. Some of these seem overbroad, but certain API functions
Amtrak2Calendar uses require such scopes. Here's an explanation of what it's
doing.

Barring some kind of security flaw, Amtrak2Calendar doesn't collect or send
your personal information anywhere.

* `https://mail.google.com/` - Amtrak2Calendar parses train data from email bodies and attachments, using the [Gmail service](https://developers.google.com/apps-script/reference/gmail/gmail-app). All functions require this generic scope. The scope grants permission to ("Read, send, delete, and manage your email")[https://developers.google.com/identity/protocols/googlescopes#scriptv1], but Amtrak2Calendar **only** reads email contents and attachments. It does not send, delete, or manage emails. If Amtrak2Calendar can be made to work with a less broad scope, please send a pull request.
* `https://www.googleapis.com/auth/calendar.events` - Amtrak2Calendar creates and deletes calendar events for your Amtrak reservations. It also scans for calendars that you own, so that you can select which calendar to use.
* `https://www.googleapis.com/auth/documents` - Amtrak2Calendar uses Google Drive's OCR feature to extract information from PDF tickets, such as train arrival times, that isn't present in Amtrak's email bodies. This scope is needed to read back the OCR-ed text content of the train ticket, after using Drive to scan it.
* `https://www.googleapis.com/auth/drive` - Amtrak2Calendar uses Google Drive's OCR feature to extract information from PDF tickets, such as train arrival times, that isn't present in Amtrak's email bodies. PDF tickets are taken from the email attachment, temporarily written to your Google Drive account with the OCR setting enabled, then read back and deleted to get the ticket content as plain text.
* `https://www.googleapis.com/auth/gmail.addons.execute` - This is required for all GMail addons.
* `https://www.googleapis.com/auth/userinfo.email` - This lets Amtrak2Calendar view your email address, so that it can add you to the guest list of calendar events it creates.
* `https://www.googleapis.com/auth/script.scriptapp` - Installs a recurring trigger to sync your trains to your calendar automatically.
* `https://www.googleapis.com/auth/script.external_request` - This is used to load the momentjs and moment-timezone libraries necessary to convert dates. These URLs are whitelisted in appsscript.json.

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)
