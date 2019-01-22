import * as moment from "moment-timezone";

/**
 * Create a readable date, for testing.
 */
export function ezDate(date: string) {
  return moment(date, "YYYY-MM-DD HH:mm Z");
}
