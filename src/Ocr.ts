// We parse PDF ticket attachments because they contain information not present
// in the email bodies, such as 3-letter station codes and arrival times. Ticket
// plaintext is obtained using Google Drive's OCR feature. The plaintext is then
// parsed with regexps (See Train.ts).

/**
 * Obtain plaintext from a PDF attachment.
 *
 * This function creates, then immediately deletes, a file in the user's Google
 * Drive account. It should not contribute to their storage usage once deleted.
 *
 * If a ticket isn't parsing right, it's useful for debugging to find the
 * trashed file within drive. Search your drive for the reservation ID, and
 * include trashed items in the search. From there, you can download the file
 * as plain text. Put it in the /spec/testdata directory of this repo, and
 * write a unit test against it.
 *
 * @param attachment A GmailAttachment
 * (https://developers.google.com/apps-script/reference/gmail/gmail-attachment)
 */
export function ocrAttachment(attachment) {
  const file = Drive.Files.insert(
    {
      mimeType: attachment.getContentType(),
      title: attachment.getName(),
    },
    attachment,
    { ocr: true, ocrLanguage: "en" }
  );

  console.log("Created file: %s", attachment.getName());

  const doc = DocumentApp.openById(file.id);
  const text = doc.getBody().getText();

  Drive.Files.trash(file.id);

  return text;
}
