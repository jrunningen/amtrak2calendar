import { readFileSync } from "fs";
import { Train } from "../src/Train";
import { Reservation } from "../src/Reservation";
import { ezDate, momentEqualityTester, testFileText } from "./support/Util";
import { join } from "path";

describe("Reservation", () => {
  beforeEach(() => {
    jasmine.addCustomEqualityTester(momentEqualityTester);
  });

  it("can be constructed from a GMail message", () => {
    const testCases = new Map([
      [
        "email text 1.txt",
        new Reservation(
          "1D4433",
          [
            Train.Incomplete(
              "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
              ezDate("2019-01-11 15:35"),
            ),
            Train.Incomplete(
              "Train 158: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
              ezDate("2019-01-13 18:20"),
            ),
          ],
        ),
      ],
      [
        "email text 2.txt",
        new Reservation(
          "AEF964",
          [
            Train.Incomplete(
              "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
              ezDate("2018-10-17 16:05"),
            ),
            Train.Incomplete(
              "Train 124: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
              ezDate("2018-10-21 19:10"),
            ),
          ],
        ),
      ],
    ]);
    const testdataPath = "spec/testdata";
    for (const file of testCases.keys()) {
      const reservation = Reservation.FromGmailMessage(testFileText(file));
      expect(reservation).toEqual(testCases.get(file));
    }
  });

  it('describes the whole trip', () => {
    const testCases = [
      {
        reservation: new Reservation(
          "1D4433",
          [],
        ),
        expectedDescription: '(no trains)',
      }, {
        reservation: new Reservation(
          "1D4433",
          [
            Train.Incomplete(
              "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
              ezDate("2019-01-11 15:35")
            ),
          ],
        ),
        expectedDescription: 'NEW YORK (PENN STATION), NY -> WASHINGTON, DC (one-way)',
      }, {
        reservation: new Reservation(
          "1D4433",
          [
            Train.Incomplete(
              "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
              ezDate("2019-01-11 15:35")
            ),
            Train.Incomplete(
              "Train 158: WASHINGTON, DC - PHILADELPHIA",
              ezDate("2019-01-13 18:20")
            ),
          ],
        ),
        expectedDescription: 'NEW YORK (PENN STATION), NY -> PHILADELPHIA',
      }, {
        reservation: new Reservation(
          "1D4433",
          [
            Train.Incomplete(
              "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
              ezDate("2019-01-11 15:35")
            ),
            Train.Incomplete(
              "Train 158: WASHINGTON, DC - PHILADELPHIA",
              ezDate("2019-01-13 18:20")
            ),
            Train.Incomplete(
              "Train 158: PHILADELPHIA - SEATTLE",
              ezDate("2019-01-13 18:20")
            ),
          ],
        ),
        expectedDescription: 'NEW YORK (PENN STATION), NY -> SEATTLE',
      },
    ];

    for (const testCase of testCases) {
      expect(testCase.reservation.description()).toEqual(testCase.expectedDescription);
    }
  });

  it('provides urls to the calendar and gmail', () => {
    const reservation = new Reservation(
      "1D4433",
      [
        Train.Incomplete(
          "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
          ezDate("2019-01-11 15:35"),
        ),
        Train.Incomplete(
          "Train 158: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
          ezDate("2019-01-13 18:20"),
        ),
      ],
    );
    expect(reservation.calendarSearchURL()).toEqual('https://calendar.google.com/calendar/r/search?q=amtrak2calendar%201D4433');
    expect(reservation.gmailSearchURL()).toEqual('https://mail.google.com/mail/u/0/#search/amtrak+1D4433');
  });

});
