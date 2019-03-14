import { readFileSync } from "fs";
import * as moment from "moment-timezone";
import { join } from "path";

const testdataPath = "spec/testdata";

// A date just used as a stand-in for the Gmail message date, for tests, since
// we're not testing with actual GmailMessage objects.
export const dummyDate = new Date("January 1, 2018 03:24:00");
export const newerDummyDate = new Date("January 2, 2018 03:24:00");

export function testFileText(testFileName: string) {
  return readFileSync(join(testdataPath, testFileName), "utf8");
}

/**
 * Create a readable date, for testing.
 */
export function ezDate(date: string) {
  return moment(date, "YYYY-MM-DD HH:mm Z");
}

/**
 * Create a readable date, lacking timezone awareness. Used in testing
 * incomplete trains read from Gmail message data.
 */
export function ezDateNoTz(date: string) {
  return moment(date, "YYYY-MM-DD HH:mm");
}

/**
 * A custom equality for moments. Moments don't directly compare well -- I get
 * inequality on the _tzm attribute -- so we use the library's isSame() method.
 */
export function momentEqualityTester(first: any, second: any): boolean {
  if (moment.isMoment(first) && moment.isMoment(second)) {
    return first.isSame(second);
  }
}
