import { Reservation } from "../src/Reservation";
import { Train } from "../src/Train";
import { formatMomentNoTz } from "../src/DateFormat";
import {
  dummyDate,
  newerDummyDate,
  ezDate,
  ezDateNoTz,
  momentEqualityTester,
  testFileText,
  createMockEvent,
  createMockEventFromTrain,
} from "./support/Util";

describe("Reservation", () => {
  beforeEach(() => {
    jasmine.addCustomEqualityTester(momentEqualityTester);
  });

  it("can be constructed from a GMail message", () => {
    const testCases = new Map([
      [
        "email text 1.txt",
        new Reservation("1D4433", dummyDate, [
          Train.Incomplete(
            "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
            ezDate("2019-01-11 15:35")
          ),
          Train.Incomplete(
            "Train 158: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
            ezDate("2019-01-13 18:20")
          ),
        ]),
      ],
      [
        "email text 2.txt",
        new Reservation("AEF964", dummyDate, [
          Train.Incomplete(
            "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
            ezDate("2018-10-17 16:05")
          ),
          Train.Incomplete(
            "Train 124: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
            ezDate("2018-10-21 19:10")
          ),
        ]),
      ],
    ]);
    for (const file of testCases.keys()) {
      const reservation = Reservation.NewBlank();
      reservation.addEmailMessageBody(dummyDate, testFileText(file));
      expect(reservation).toEqual(testCases.get(file));
    }
  });

  it("describes the whole trip", () => {
    const testCases = [
      {
        reservation: new Reservation("1D4433", dummyDate, []),
        expectedDescription: "(no trains)",
      },
      {
        reservation: new Reservation("1D4433", dummyDate, [
          Train.Incomplete(
            "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
            ezDate("2019-01-11 15:35")
          ),
        ]),
        expectedDescription:
          "NEW YORK (PENN STATION), NY -> WASHINGTON, DC (one-way)",
      },
      {
        reservation: new Reservation("1D4433", dummyDate, [
          Train.Incomplete(
            "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
            ezDate("2019-01-11 15:35")
          ),
          Train.Incomplete(
            "Train 158: WASHINGTON, DC - PHILADELPHIA",
            ezDate("2019-01-13 18:20")
          ),
        ]),
        expectedDescription: "NEW YORK (PENN STATION), NY -> PHILADELPHIA",
      },
      {
        reservation: new Reservation("1D4433", dummyDate, [
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
        ]),
        expectedDescription: "NEW YORK (PENN STATION), NY -> SEATTLE",
      },
    ];

    for (const testCase of testCases) {
      expect(testCase.reservation.description()).toEqual(
        testCase.expectedDescription
      );
    }
  });

  it("provides urls to the calendar and gmail", () => {
    const reservation = new Reservation("1D4433", dummyDate, [
      Train.Incomplete(
        "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
        ezDate("2019-01-11 15:35 -0500")
      ),
      Train.Incomplete(
        "Train 158: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
        ezDate("2019-01-13 18:20 -0500")
      ),
    ]);
    expect(reservation.calendarSearchURL()).toEqual(
      "https://calendar.google.com/calendar/r/search?q=amtrak2calendar%201D4433"
    );
    expect(reservation.gmailSearchURL()).toEqual(
      "https://mail.google.com/mail/u/0/#search/amtrak+1D4433"
    );
  });

  // FIXME: Names and reservation descriptions differ depending on whether
  // information was added by email message body or OCR text. We can get away
  // with this for now, because we only use one or the other in a single
  // operation. Still, it's jarring, and should be made consistent.
  it("handles changes to reservations from OCR text", () => {
    const want = {
      calendarSearchURL:
        "https://calendar.google.com/calendar/r/search?q=amtrak2calendar%20ABCDEF",
      description: "NYP -> WAS (round trip)",
      gmailSearchURL: "https://mail.google.com/mail/u/0/#search/amtrak+ABCDEF",
      isCancelled: false,
      reservationNumber: "ABCDEF",
      trains: [
        {
          depart: formatMomentNoTz(ezDateNoTz("2019-04-19 15:35")),
          name: "173",
        },
        {
          depart: formatMomentNoTz(ezDateNoTz("2019-04-21 20:30")),
          name: "90",
        },
      ],
      rescheduledTrains: [
        [
          {
            depart: formatMomentNoTz(ezDateNoTz("2019-03-15 15:35")),
            name: "173",
          },
          {
            depart: formatMomentNoTz(ezDateNoTz("2019-03-17 20:30")),
            name: "90",
          },
        ],
      ],
    };

    // The order in which they're added shouldn't matter. The most recent
    // itinerary is canonical.
    const reservationInOrder = Reservation.NewBlank();
    reservationInOrder.addOcrText(
      dummyDate,
      testFileText("ocr text original reservation.txt")
    );
    reservationInOrder.addOcrText(
      newerDummyDate,
      testFileText("ocr text modified reservation.txt")
    );
    expect(reservationInOrder.toDisplayObject()).toEqual(want);

    const reservationOutOfOrder = Reservation.NewBlank();
    reservationOutOfOrder.addOcrText(
      newerDummyDate,
      testFileText("ocr text modified reservation.txt")
    );
    reservationOutOfOrder.addOcrText(
      dummyDate,
      testFileText("ocr text original reservation.txt")
    );
    expect(reservationOutOfOrder.toDisplayObject()).toEqual(want);
  });

  it("handles changes to reservations from email message bodies", () => {
    const want = {
      calendarSearchURL:
        "https://calendar.google.com/calendar/r/search?q=amtrak2calendar%20ABCDEF",
      description: "NEW YORK (PENN STATION), NY -> WASHINGTON, DC (round trip)",
      gmailSearchURL: "https://mail.google.com/mail/u/0/#search/amtrak+ABCDEF",
      isCancelled: false,
      reservationNumber: "ABCDEF",
      trains: [
        {
          depart: formatMomentNoTz(ezDateNoTz("2019-04-19 15:35")),
          name: "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
        },
        {
          depart: formatMomentNoTz(ezDateNoTz("2019-04-21 20:30")),
          name: "Train 90: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
        },
      ],
      rescheduledTrains: [
        [
          {
            depart: formatMomentNoTz(ezDateNoTz("2019-03-15 15:35")),
            name: "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
          },
          {
            depart: formatMomentNoTz(ezDateNoTz("2019-03-17 20:30")),
            name: "Train 90: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
          },
        ],
      ],
    };

    // The order in which they're added shouldn't matter. The most recent
    // itinerary is canonical.
    const reservationInOrder = Reservation.NewBlank();
    reservationInOrder.addEmailMessageBody(
      dummyDate,
      testFileText("email text original reservation.txt")
    );
    reservationInOrder.addEmailMessageBody(
      newerDummyDate,
      testFileText("email text modified reservation.txt")
    );
    expect(reservationInOrder.toDisplayObject()).toEqual(want);

    const reservationOutOfOrder = Reservation.NewBlank();
    reservationOutOfOrder.addEmailMessageBody(
      newerDummyDate,
      testFileText("email text modified reservation.txt")
    );
    reservationOutOfOrder.addEmailMessageBody(
      dummyDate,
      testFileText("email text original reservation.txt")
    );
    expect(reservationOutOfOrder.toDisplayObject()).toEqual(want);
  });

  it("rejects mismatched reservation numbers", () => {
    const reservation = Reservation.NewBlank();
    reservation.addEmailMessageBody(
      dummyDate,
      testFileText("email text 1.txt")
    );
    expect(() => {
      reservation.addEmailMessageBody(
        dummyDate,
        testFileText("email text 2.txt")
      );
    }).toThrow(new Error("reservation number mismatch"));
  });

  it("can be extracted from OCR text", () => {
    const testCases = new Map([
      [
        "amtrak text 2EF3AD.txt",
        new Reservation("2EF3AD", dummyDate, [
          Train.Legacy(
            "90",
            "WAS",
            "NYP",
            ezDate("2017-09-04 20:30 -0400"),
            ezDate("2017-09-04 23:56 -0400")
          ),
        ]),
      ],
      [
        "amtrak text 351CB8.txt",
        new Reservation("351CB8", dummyDate, [
          Train.Legacy(
            "85",
            "NYP",
            "WAS",
            ezDate("2018-06-22 15:05 -0400"),
            ezDate("2018-06-22 18:30 -0400")
          ),
          Train.Legacy(
            "90",
            "WAS",
            "NYP",
            ezDate("2018-06-24 20:30 -0400"),
            ezDate("2018-06-24 23:58 -0400")
          ),
        ]),
      ],
      [
        "amtrak text 7BE5F6.txt",
        new Reservation("7BE5F6", dummyDate, [
          Train.Legacy(
            "129",
            "NYP",
            "WAS",
            ezDate("2018-08-17 16:35 -0400"),
            ezDate("2018-08-17 19:57 -0400")
          ),
          Train.Legacy(
            "90",
            "WAS",
            "NYP",
            ezDate("2018-08-19 20:30 -0400"),
            ezDate("2018-08-19 23:58 -0400")
          ),
        ]),
      ],
      [
        "amtrak text E77A77.txt",
        new Reservation("E77A77", dummyDate, [
          Train.Legacy(
            "173",
            "NYP",
            "WAS",
            ezDate("2018-03-16 16:05 -0400"),
            ezDate("2018-03-16 19:48 -0400")
          ),
          Train.Legacy(
            "90",
            "WAS",
            "NYP",
            ezDate("2018-03-18 20:30 -0400"),
            ezDate("2018-03-18 23:58 -0400")
          ),
        ]),
      ],
      [
        "amtrak text FAKE01.txt",
        new Reservation("FAKE01", dummyDate, [
          Train.Legacy(
            "129",
            "NYP",
            "WAS",
            ezDate("2018-11-16 16:35 -0500"),
            ezDate("2018-11-16 20:10 -0500")
          ),
          // This train has some OCR text jumbled together, which makes it
          // hard to parse, but we try anyway.
          Train.Legacy(
            "2226",
            "WAS",
            "NYP",
            ezDate("2018-11-25 18:55 -0500"),
            ezDate("2018-11-25 21:55 -0500")
          ),
        ]),
      ],
      [
        "amtrak text FAKE01 update.txt",
        new Reservation("FAKE01", dummyDate, [
          Train.Legacy(
            "129",
            "NYP",
            "WAS",
            ezDate("2018-11-16 16:24 -0500"),
            ezDate("2018-11-16 19:48 -0500")
          ),
          Train.Legacy(
            "2226",
            "WAS",
            "NYP",
            ezDate("2018-11-25 18:55 -0500"),
            ezDate("2018-11-25 21:55 -0500")
          ),
        ]),
      ],
      [
        "amtrak text FAKE02.txt",
        new Reservation("FAKE02", dummyDate, [
          Train.Legacy(
            "186",
            "WAS",
            "NYP",
            ezDate("2018-12-14 19:10 -0500"),
            ezDate("2018-12-14 22:34 -0500")
          ),
          Train.Legacy(
            "125",
            "NYP",
            "WAS",
            ezDate("2018-12-19 11:35 -0500"),
            ezDate("2018-12-19 15:06 -0500")
          ),
        ]),
      ],
      // This reservation has a non-East coast timezone.
      [
        "amtrak text 9368B1.txt",
        new Reservation("9368B1", dummyDate, [
          Train.Legacy(
            "518",
            "SEA",
            "VAC",
            ezDate("2018-09-16 19:00 -0700"),
            ezDate("2018-09-16 23:00 -0700")
          ),
        ]),
      ],
      [
        "amtrak text 1D4433.txt",
        new Reservation("1D4433", dummyDate, [
          Train.Legacy(
            "173",
            "NYP",
            "WAS",
            ezDate("2019-01-11 15:35 -0500"),
            ezDate("2019-01-11 19:10 -0500")
          ),
          Train.Legacy(
            "158",
            "WAS",
            "NYP",
            ezDate("2019-01-13 18:20 -0500"),
            ezDate("2019-01-13 21:45 -0500")
          ),
        ]),
      ],
      [
        "amtrak text scrambled.txt",
        new Reservation("123456", dummyDate, [
          Train.Legacy(
            "174",
            "WAS",
            "NYP",
            ezDate("2019-01-18 10:10 -0500"),
            ezDate("2019-01-18 13:35 -0500")
          ),
          Train.Legacy(
            "2257",
            "NYP",
            "WAS",
            ezDate("2019-01-21 19:00 -0500"),
            ezDate("2019-01-21 21:59 -0500")
          ),
        ]),
      ],
    ]);
    const testdataPath = "spec/testdata";
    for (const file of testCases.keys()) {
      const reservation = Reservation.FromOcrText(
        dummyDate,
        testFileText(file)
      );
      expect(reservation).toEqual(testCases.get(file));
    }
  });

  it("adds new trains to the calendar", () => {
    const reservation = new Reservation("123456", dummyDate, [
      Train.Legacy(
        "174",
        "WAS",
        "NYP",
        ezDate("2019-01-18 10:10 -0500"),
        ezDate("2019-01-18 13:35 -0500")
      ),
      Train.Legacy(
        "2257",
        "NYP",
        "WAS",
        ezDate("2019-01-21 19:00 -0500"),
        ezDate("2019-01-21 21:59 -0500")
      ),
    ]);

    spyOn(reservation.trains[0], "createCalendarEvent").and.stub();
    spyOn(reservation.trains[1], "createCalendarEvent").and.stub();

    reservation.syncEvents([]);

    expect(reservation.trains[0].createCalendarEvent).toHaveBeenCalled();
    expect(reservation.trains[1].createCalendarEvent).toHaveBeenCalled();
  });

  it("leaves up to date calendar unchanged", () => {
    const reservation = new Reservation("123456", dummyDate, [
      Train.Legacy(
        "174",
        "WAS",
        "NYP",
        ezDate("2019-01-18 10:10 -0500"),
        ezDate("2019-01-18 13:35 -0500")
      ),
      Train.Legacy(
        "2257",
        "NYP",
        "WAS",
        ezDate("2019-01-21 19:00 -0500"),
        ezDate("2019-01-21 21:59 -0500")
      ),
    ]);

    spyOn(reservation.trains[0], "createCalendarEvent").and.stub();
    spyOn(reservation.trains[1], "createCalendarEvent").and.stub();

    const events = [
      createMockEventFromTrain(reservation.trains[0], reservation.reservationNumber),
      createMockEventFromTrain(reservation.trains[1], reservation.reservationNumber),
    ];

    expect(reservation.trains[0].matchCalendarEvent(reservation.reservationNumber, events[0])).toBeTruthy();
    expect(reservation.trains[1].matchCalendarEvent(reservation.reservationNumber, events[1])).toBeTruthy();

    reservation.syncEvents(events);

    expect(reservation.trains[0].createCalendarEvent).not.toHaveBeenCalled();
    expect(reservation.trains[1].createCalendarEvent).not.toHaveBeenCalled();
    expect(events[0].deleteEvent).not.toHaveBeenCalled();
    expect(events[1].deleteEvent).not.toHaveBeenCalled();
  });

  it("removes duplicate events", () => {
    const reservation = new Reservation("123456", dummyDate, [
      Train.Legacy(
        "174",
        "WAS",
        "NYP",
        ezDate("2019-01-18 10:10 -0500"),
        ezDate("2019-01-18 13:35 -0500")
      ),
      Train.Legacy(
        "2257",
        "NYP",
        "WAS",
        ezDate("2019-01-21 19:00 -0500"),
        ezDate("2019-01-21 21:59 -0500")
      ),
    ]);

    spyOn(reservation.trains[0], "createCalendarEvent").and.stub();
    spyOn(reservation.trains[1], "createCalendarEvent").and.stub();

    const events = [
      createMockEventFromTrain(reservation.trains[0], reservation.reservationNumber),
      createMockEventFromTrain(reservation.trains[0], reservation.reservationNumber),
      createMockEventFromTrain(reservation.trains[1], reservation.reservationNumber),
      createMockEventFromTrain(reservation.trains[1], reservation.reservationNumber),
    ];

    reservation.syncEvents(events);

    expect(reservation.trains[0].createCalendarEvent).not.toHaveBeenCalled();
    expect(reservation.trains[1].createCalendarEvent).not.toHaveBeenCalled();
    expect(events[0].deleteEvent).not.toHaveBeenCalled();
    expect(events[1].deleteEvent).toHaveBeenCalled();
    expect(events[2].deleteEvent).not.toHaveBeenCalled();
    expect(events[3].deleteEvent).toHaveBeenCalled();
  });

  it("removes non-matching events", () => {
    const reservation = new Reservation("123456", dummyDate, [
      Train.Legacy(
        "174",
        "WAS",
        "NYP",
        ezDate("2019-01-18 10:10 -0500"),
        ezDate("2019-01-18 13:35 -0500")
      ),
      Train.Legacy(
        "2257",
        "NYP",
        "WAS",
        ezDate("2019-01-21 19:00 -0500"),
        ezDate("2019-01-21 21:59 -0500")
      ),
    ]);

    spyOn(reservation.trains[0], "createCalendarEvent").and.stub();
    spyOn(reservation.trains[1], "createCalendarEvent").and.stub();

    const events = [
      createMockEventFromTrain(reservation.trains[0], reservation.reservationNumber),
      createMockEventFromTrain(reservation.trains[1], reservation.reservationNumber),
      createMockEvent(
        "other title",
        reservation.trains[0].depart.toDate(),
        reservation.trains[0].arrive.toDate(),
        "other description",
      ),
    ];

    reservation.syncEvents(events);

    expect(reservation.trains[0].createCalendarEvent).not.toHaveBeenCalled();
    expect(reservation.trains[1].createCalendarEvent).not.toHaveBeenCalled();
    expect(events[0].deleteEvent).not.toHaveBeenCalled();
    expect(events[1].deleteEvent).not.toHaveBeenCalled();
    expect(events[2].deleteEvent).toHaveBeenCalled();
  });

  it("handles trains that depart and arrive on different days", () => {
    const reservation = Reservation.NewBlank();
    reservation.addOcrText(
      dummyDate,
      testFileText("train ends on different day.txt")
    );
    const train = reservation.trains[1];
    expect(train.depart).toEqual(ezDate("2019-12-02 21:05"));
    expect(train.arrive).toEqual(ezDate("2019-12-03 00:30"));
  });
});
