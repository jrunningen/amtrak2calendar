import { ReservationCollection } from "../src/ReservationCollection";
import { testFileText } from "./support/Util";

describe("ReservationCollection", () => {
  it("can be converted to a display object", () => {
    const reservationCollection = new ReservationCollection();
    expect(reservationCollection.toDisplayObject()).toEqual([]);

    reservationCollection.addEmailMessageBody(testFileText("email text 1.txt"));
    expect(reservationCollection.toDisplayObject()).toEqual([
      {
        calendarSearchURL:
          "https://calendar.google.com/calendar/r/search?q=amtrak2calendar%201D4433",
        description:
          "NEW YORK (PENN STATION), NY -> WASHINGTON, DC (round trip)",
        gmailSearchURL:
          "https://mail.google.com/mail/u/0/#search/amtrak+1D4433",
        isCancelled: false,
        reservationNumber: "1D4433",
        trains: [
          {
            depart: "Fri, Jan 11 2019, 3:35 PM",
            name: "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
          },
          {
            depart: "Sun, Jan 13 2019, 6:20 PM",
            name: "Train 158: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
          },
        ],
      },
    ]);
  });
});
