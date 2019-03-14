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
