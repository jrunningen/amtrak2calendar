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
  public static FromGmailMessage(messageBody): Reservation {
    const reservationNumber = getReservationNumber(messageBody);
    const res = new Reservation(reservationNumber, []);
    res.addEmailMessageBody(messageBody);
    return res;
  }

  public static FromOcrText(ocrText): Reservation {
    const reservationNumber = getReservationNumberFromOcrText(ocrText);
    const trains = Train.FromOcrText(ocrText);
    return new Reservation(reservationNumber, trains);
  }

  // The 6-character reservation number, like "ABC123"
  public reservationNumber: string;

  // Trains in the reservation, in order.
  public trains: Train[];

  // If true, this reservation appears to have been cancelled.
  public isCancelled: boolean = false;

  constructor(reservationNumber: string, trains: Train[]) {
    this.reservationNumber = reservationNumber;
    this.trains = trains;
  }

  public addEmailMessageBody(messageBody) {
    this.trains = this.trains.concat(Train.FromGmailMessage(messageBody));
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
    };
  }
}
