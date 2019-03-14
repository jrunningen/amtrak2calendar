import * as moment from "moment-timezone";
import { Reservation } from "../src/Reservation";
import { Train } from "../src/Train";
import { ezDate, momentEqualityTester, testFileText } from "./support/Util";

describe("Train", () => {
  beforeEach(() => {
    jasmine.addCustomEqualityTester(momentEqualityTester);
  });

  it("can be converted to and from event parameters", () => {
    // TODO(jrunningen): null attributes probably aren't handled well by GAS's
    // callback parameters. Check that.
    const train = Train.Legacy(
      "Amtrak 123: WASHINGTON DC - SEATTLE",
      "WAS",
      "SEA",
      moment("2010-01-01 0:00 -0500", "YYYY-MM-DD HH:mm Z"),
      moment("2010-01-02 0:00 -0800", "YYYY-MM-DD HH:mm Z")
    );
    expect(train.toParams()).toEqual({
      arrive: "2010-01-02T00:00:00-08:00",
      depart: "2010-01-01T00:00:00-05:00",
      originStation: "WAS",
      destinationStation: "SEA",
      name: "Amtrak 123: WASHINGTON DC - SEATTLE",
    });
    expect(Train.FromParams(train.toParams())).toEqual(train);
    expect(Train.FromParams(train.toParams()).depart).toEqual(
      moment("2010-01-01 0:00 -0500", "YYYY-MM-DD HH:mm Z")
    );
    expect(Train.FromParams(train.toParams()).arrive).toEqual(
      moment("2010-01-02 0:00 -0800", "YYYY-MM-DD HH:mm Z")
    );
  });

  it("provides a getter for the train number", () => {
    const train = Train.Legacy(
      "Amtrak 123: Foo - Bar",
      "WAS",
      "NYP",
      ezDate("2017-09-04 23:56 -0400"),
      ezDate("2017-09-04 23:56 -0400")
    );
    expect(train.number).toEqual("123");
  });

  it("assembles a reasonable description", () => {
    const train = Train.Legacy(
      "123",
      "WAS",
      "NYP",
      ezDate("2017-09-04 23:56 -0400"),
      ezDate("2017-09-04 23:56 -0400")
    );
    expect(train.description).toEqual("Amtrak Train 123: WAS -> NYP");
  });

  it("knows time zones of stations", () => {
    const train = Train.Legacy(
      "123",
      "WAS",
      "SEA",
      ezDate("2017-09-04 23:56 -0400"),
      ezDate("2017-09-04 23:56 -0400")
    );
    expect(train.departTimeZone).toEqual("America/New_York");
    expect(train.arriveTimeZone).toEqual("America/Los_Angeles");
  });

  it("prints friendly dates", () => {
    const train = Train.Legacy(
      "123",
      "WAS",
      "NYP",
      ezDate("2017-01-01 10:23 -0400"),
      ezDate("2017-02-02 23:45 -0400")
    );
    expect(train.departString).toEqual("Sun, Jan 1 2017, 9:23 AM EST");
    expect(train.arriveString).toEqual("Thu, Feb 2 2017, 10:45 PM EST");
  });

  it("can be extracted from OCR text", () => {
    const testCases = new Map([
      [
        "amtrak text 2EF3AD.txt",
        new Reservation("2EF3AD", [
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
        new Reservation("351CB8", [
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
        new Reservation("7BE5F6", [
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
        new Reservation("E77A77", [
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
        new Reservation("FAKE01", [
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
        new Reservation("FAKE01", [
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
        new Reservation("FAKE02", [
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
        new Reservation("9368B1", [
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
        new Reservation("1D4433", [
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
        new Reservation("123456", [
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
      const reservation = Reservation.FromOcrText(testFileText(file));
      expect(reservation).toEqual(testCases.get(file));
    }
  });

  it("tries to parse the stations names from the title", () => {
    const train = Train.Incomplete(
      "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
      ezDate("2019-01-21 19:00 -0500")
    );
    expect(train.trainNumber).toEqual("173");
    expect(train.departStationName).toEqual("NEW YORK (PENN STATION), NY");
    expect(train.arriveStationName).toEqual("WASHINGTON, DC");
  });

  it("can be converted to a displayObject from Incomplete constructor", () => {
    const train = Train.Incomplete(
      "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
      ezDate("2019-01-21 19:00 -0500")
    );
    expect(train.toDisplayObject()).toEqual({
      name: "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
      depart: "Mon, Jan 21 2019, 7:00 PM",
    });
  });
});
