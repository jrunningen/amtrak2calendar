import { Train } from "./Train";

export function getReservationNumber(messageBody) {
  const match = messageBody.match("Reservation Number - ([A-Z0-9]+)");
  if (match == null) {
    return null;
  }
  return match[1];
}

export function getReservationNumberFromOcrText(ocrText) {
  const match = ocrText.match(/RESERVATION NUMBER ([A-Z0-9]{6})/m);
  if (match == null) {
    return null;
  }
  return match[1];
}

export class Reservation {
  public static FromGmailMessage(
    message: GoogleAppsScript.Gmail.GmailMessage
  ): Reservation {
    const messageBody = message.getBody();
    const reservationNumber = getReservationNumber(messageBody);
    const res = new Reservation(reservationNumber, null, []);
    res.addEmailMessageBody(message.getDate(), messageBody);
    return res;
  }

  public static FromOcrText(date: Date, ocrText): Reservation {
    const reservationNumber = getReservationNumberFromOcrText(ocrText);
    const trains = Train.FromOcrText(ocrText);
    return new Reservation(reservationNumber, date, trains);
  }

  public static NewBlank(): Reservation {
    return new Reservation("", null, []);
  }

  // The 6-character reservation number, like "ABC123"
  public reservationNumber: string = "";

  // Trains in the reservation, in order.
  public trains: Train[] = [];

  // If the reservation was modified, meaning that the user changed which trains
  // they were taking on the same reservation, then this list contains the older states.
  // Trains that have been rescheduled
  public rescheduledTrains: Train[][] = [];

  // The date of the email message that this came from. If another email message
  // is added, and it's newer, then we overwrite the current itinerary.
  private date: Date = null;

  // If true, this reservation appears to have been cancelled.
  public isCancelled: boolean = false;

  constructor(reservationNumber: string, date: Date, trains: Train[]) {
    this.reservationNumber = reservationNumber;
    this.date = date;
    this.trains = trains;
  }

  public addEmailMessageBody(date: Date, messageBody: string) {
    const reservationNumber = getReservationNumber(messageBody);

    if (this.reservationNumber === "") {
      this.reservationNumber = reservationNumber;
    }
    // If there's a mismatch in reservation number, it's a logic error.
    if (this.reservationNumber !== reservationNumber) {
      throw new Error("reservation number mismatch");
    }

    const trains = Train.FromGmailMessage(messageBody);

    // This itinerary is newer or the first, so make it current.
    if (this.date === null) {
      this.date = date;
      this.trains = trains;
      return;
    }

    if (this.date < date) {
      this.date = date;
      if (this.trains.length !== 0) {
        this.rescheduledTrains.push(this.trains);
      }
      this.trains = trains;
      return;
    }

    // Otherwise, this itinerary is older than what we have.
    this.rescheduledTrains.push(trains);
  }

  /**
   * A string summarizing the trip.
   */
  public description() {
    if (this.trains.length === 0) {
      return "(no trains)";
    }
    if (this.trains.length === 1) {
      return `${this.trains[0].departStationName} -> ${
        this.trains[0].arriveStationName
      } (one-way)`;
    }
    const firstTrain = this.trains[0];
    if (this.trains.length === 2) {
      const secondTrain = this.trains[1];
      if (
        firstTrain.departStationName === secondTrain.arriveStationName &&
        secondTrain.departStationName === firstTrain.arriveStationName
      ) {
        return `${firstTrain.departStationName} -> ${
          firstTrain.arriveStationName
        } (round trip)`;
      }
      return `${firstTrain.departStationName} -> ${
        secondTrain.arriveStationName
      }`;
    }
    const lastTrain = this.trains[this.trains.length - 1];
    return `${firstTrain.departStationName} -> ${lastTrain.arriveStationName}`;
  }

  public calendarSearchURL() {
    return (
      "https://calendar.google.com/calendar/r/search?q=amtrak2calendar%20" +
      this.reservationNumber
    );
  }

  public gmailSearchURL() {
    return (
      "https://mail.google.com/mail/u/0/#search/amtrak+" +
      this.reservationNumber
    );
  }

  public cancel() {
    this.isCancelled = true;
  }

  public toDisplayObject() {
    return {
      calendarSearchURL: this.calendarSearchURL(),
      description: this.description(),
      gmailSearchURL: this.gmailSearchURL(),
      isCancelled: this.isCancelled,
      reservationNumber: this.reservationNumber,
      trains: this.trains.map((train) => train.toDisplayObject()),
      rescheduledTrains: this.rescheduledTrains.map((trains) =>
        trains.map((train) => train.toDisplayObject())
      ),
    };
  }
}
