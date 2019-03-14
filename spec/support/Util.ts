import { readFileSync } from "fs";
import * as moment from "moment-timezone";
import { join } from "path";

const testdataPath = "spec/testdata";

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
 * A custom equality for moments. Moments don't directly compare well -- I get
 * inequality on the _tzm attribute -- so we use the library's isSame() method.
 */
export function momentEqualityTester(first: any, second: any): boolean {
  if (moment.isMoment(first) && moment.isMoment(second)) {
    return first.isSame(second);
  }
}
