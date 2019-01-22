import { readFileSync } from "fs";
import * as moment from "moment-timezone";
import { join } from "path";
import { IncompleteTrain, Train } from "../src/Train";
import { ezDate } from "./support/Util";

function trainEquality(train: Train) {
  return {
    asymmetricMatch(compareTo: Train) {
      return true;
    },
    jasmineToString() {
      return `<trainEquality: ${train}`;
    }
  }
}

describe("Train", () => {
  beforeEach(() => {
    // Add a custom equality for moments. Moments don't directly compare well --
    // I get inequality on the _tzm attribute -- so we use the library's
    // isSame() method.
    jasmine.addCustomEqualityTester((first: any, second: any) => {
      if (moment.isMoment(first) && moment.isMoment(second)) {
        return first.isSame(second);
      }
    });
  });
  it("can be converted to and from event parameters", () => {
    // TODO(jrunningen): null attributes probably aren't handled well by GAS's
    // callback parameters. Check that.
    const train = new Train(
      "123",
      "WAS",
      "SEA",
      "123456",
      moment("2010-01-01 0:00 -0500", "YYYY-MM-DD HH:mm Z"),
      moment("2010-01-02 0:00 -0800", "YYYY-MM-DD HH:mm Z")
    );
    expect(train.toParams()).toEqual({
      arrive: "2010-01-02T00:00:00-08:00",
      depart: "2010-01-01T00:00:00-05:00",
      originStation: "WAS",
      destinationStation: "SEA",
      reservationNumber: "123456",
      trainName: "123",
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
    const train = new Train(
      "123",
      "WAS",
      "NYP",
      "123456",
      ezDate("2017-09-04 23:56 -0400"),
      ezDate("2017-09-04 23:56 -0400")
    );
    expect(train.number).toEqual("123");
  });

  it("assembles a reasonable description", () => {
    const train = new Train(
      "123",
      "WAS",
      "NYP",
      "123456",
      ezDate("2017-09-04 23:56 -0400"),
      ezDate("2017-09-04 23:56 -0400")
    );
    expect(train.description).toEqual("Amtrak Train 123: WAS -> NYP");
  });

  it("knows time zones of stations", () => {
    const train = new Train(
      "123",
      "WAS",
      "SEA",
      "123456",
      ezDate("2017-09-04 23:56 -0400"),
      ezDate("2017-09-04 23:56 -0400")
    );
    expect(train.departTimeZone).toEqual("America/New_York");
    expect(train.arriveTimeZone).toEqual("America/Los_Angeles");
  });

  it("prints friendly dates", () => {
    const train = new Train(
      "123",
      "WAS",
      "NYP",
      "123456",
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
        [
          new Train(
            "90",
            "WAS",
            "NYP",
            "2EF3AD",
            ezDate("2017-09-04 20:30 -0400"),
            ezDate("2017-09-04 23:56 -0400")
          ),
        ],
      ],
      [
        "amtrak text 351CB8.txt",
        [
          new Train(
            "85",
            "NYP",
            "WAS",
            "351CB8",
            ezDate("2018-06-22 15:05 -0400"),
            ezDate("2018-06-22 18:30 -0400")
          ),
          new Train(
            "90",
            "WAS",
            "NYP",
            "351CB8",
            ezDate("2018-06-24 20:30 -0400"),
            ezDate("2018-06-24 23:58 -0400")
          ),
        ],
      ],
      [
        "amtrak text 7BE5F6.txt",
        [
          new Train(
            "129",
            "NYP",
            "WAS",
            "7BE5F6",
            ezDate("2018-08-17 16:35 -0400"),
            ezDate("2018-08-17 19:57 -0400"),
          ),
          new Train(
            "90",
            "WAS",
            "NYP",
            "7BE5F6",
            ezDate("2018-08-19 20:30 -0400"),
            ezDate("2018-08-19 23:58 -0400"),
          ),
        ],
      ],
      [
        "amtrak text E77A77.txt",
        [
          new Train(
            "173",
            "NYP",
            "WAS",
            "E77A77",
            ezDate("2018-03-16 16:05 -0400"),
            ezDate("2018-03-16 19:48 -0400"),
          ),
          new Train(
            "90",
            "WAS",
            "NYP",
            "E77A77",
            ezDate("2018-03-18 20:30 -0400"),
            ezDate("2018-03-18 23:58 -0400"),
          ),
        ],
      ],
      [
        "amtrak text FAKE01.txt",
        [
          new Train(
            "129",
            "NYP",
            "WAS",
            "FAKE01",
            ezDate("2018-11-16 16:35 -0500"),
            ezDate("2018-11-16 20:10 -0500"),
          ),
          // This train has some OCR text jumbled together, which makes it
          // hard to parse, but we try anyway.
          new Train(
            "2226",
            "WAS",
            "NYP",
            "FAKE01",
            ezDate("2018-11-25 18:55 -0500"),
            ezDate("2018-11-25 21:55 -0500"),
          ),
        ],
      ],
      [
        "amtrak text FAKE01 update.txt",
        [
          new Train(
            "129",
            "NYP",
            "WAS",
            "FAKE01",
            ezDate("2018-11-16 16:24 -0500"),
            ezDate("2018-11-16 19:48 -0500"),
          ),
          new Train(
            "2226",
            "WAS",
            "NYP",
            "FAKE01",
            ezDate("2018-11-25 18:55 -0500"),
            ezDate("2018-11-25 21:55 -0500"),
          ),
        ],
      ],
      [
        "amtrak text FAKE02.txt",
        [
          new Train(
            "186",
            "WAS",
            "NYP",
            "FAKE02",
            ezDate("2018-12-14 19:10 -0500"),
            ezDate("2018-12-14 22:34 -0500"),
          ),
          new Train(
            "125",
            "NYP",
            "WAS",
            "FAKE02",
            ezDate("2018-12-19 11:35 -0500"),
            ezDate("2018-12-19 15:06 -0500"),
          ),
        ],
      ],
      // This reservation has a non-East coast timezone.
      [
        "amtrak text 9368B1.txt",
        [
          new Train(
            "518",
            "SEA",
            "VAC",
            "9368B1",
            ezDate("2018-09-16 19:00 -0700"),
            ezDate("2018-09-16 23:00 -0700"),
          ),
        ],
      ],
      [
        "amtrak text 1D4433.txt",
        [
          new Train(
            "173",
            "NYP",
            "WAS",
            "1D4433",
            ezDate("2019-01-11 15:35 -0500"),
            ezDate("2019-01-11 19:10 -0500"),
          ),
          new Train(
            "158",
            "WAS",
            "NYP",
            "1D4433",
            ezDate("2019-01-13 18:20 -0500"),
            ezDate("2019-01-13 21:45 -0500"),
          ),
        ],
      ],
      [
        "amtrak text scrambled.txt",
        [
          new Train(
            "174",
            "WAS",
            "NYP",
            "123456",
            ezDate("2019-01-18 10:10 -0500"),
            ezDate("2019-01-18 13:35 -0500"),
          ),
          new Train(
            "2257",
            "NYP",
            "WAS",
            "123456",
            ezDate("2019-01-21 19:00 -0500"),
            ezDate("2019-01-21 21:59 -0500"),
          ),
        ],
      ],
    ]);
    const testdataPath = "spec/testdata";
    for (const file of testCases.keys()) {
      const ticketText = readFileSync(join(testdataPath, file), "utf8");
      const trains: Train[] = Train.FromOcrText(ticketText);
      expect(trains).toEqual(testCases.get(file));
    }
  });
  it("reads trains from emails", () => {
    const testCases = new Map([
      [
        "email text 1.txt",
        [
          new IncompleteTrain(
            "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
            "1D4433",
            ezDate("2019-01-11 15:35")
          ),
          new IncompleteTrain(
            "Train 158: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
            "1D4433",
            ezDate("2019-01-13 18:20")
          ),
        ],
      ],
    ]);
    const testdataPath = "spec/testdata";
    for (const file of testCases.keys()) {
      const messageText = readFileSync(join(testdataPath, file), "utf8");
      const trains: IncompleteTrain[] = IncompleteTrain.FromGmailMessage(messageText);
      expect(trains).toEqual(testCases.get(file));
    }
  });
});
