import { readFileSync } from "fs";
import { IncompleteTrain, Train } from "../src/Train";
import { Reservation } from "../src/Reservation";
import { ezDate, momentEqualityTester } from "./support/Util";
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
            new IncompleteTrain(
              "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
              ezDate("2019-01-11 15:35")
            ),
            new IncompleteTrain(
              "Train 158: WASHINGTON, DC - NEW YORK (PENN STATION), NY",
              ezDate("2019-01-13 18:20")
            ),
          ],
        ),
      ],
    ]);
    const testdataPath = "spec/testdata";
    for (const file of testCases.keys()) {
      const messageText = readFileSync(join(testdataPath, file), "utf8");
      const reservation = Reservation.FromGmailMessage(messageText);
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
            new IncompleteTrain(
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
            new IncompleteTrain(
              "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
              ezDate("2019-01-11 15:35")
            ),
            new IncompleteTrain(
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
            new IncompleteTrain(
              "Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC",
              ezDate("2019-01-11 15:35")
            ),
            new IncompleteTrain(
              "Train 158: WASHINGTON, DC - PHILADELPHIA",
              ezDate("2019-01-13 18:20")
            ),
            new IncompleteTrain(
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
});
