// prettier-ignore
import { getReservationNumberFromOcrText, getReservationNumber, Reservation } from "./Reservation";

export class ReservationCollection {
  // The "Map" type isn't polyfilled by tscompiler, and isn't supported on Apps
  // Script. So, we use a typed Object as the next best thing.
  private reservationsByNumber: { [reservationNumber: string]: Reservation };

  constructor() {
    this.reservationsByNumber = {};
  }

  public addOcrText(date: Date, ocrText: string) {
    const reservationNumber = getReservationNumberFromOcrText(ocrText);
    if (this.hasReservation(reservationNumber)) {
      this.reservationsByNumber[reservationNumber].addOcrText(date, ocrText);
      return;
    }

    const res = Reservation.NewBlank();
    res.addOcrText(date, ocrText);
    this.reservationsByNumber[reservationNumber] = res;
  }

  public addEmailMessageBody(date: Date, messageBody: string) {
    const reservationNumber = getReservationNumber(messageBody);
    if (this.hasReservation(reservationNumber)) {
      this.reservationsByNumber[reservationNumber].addEmailMessageBody(
        date,
        messageBody
      );
      return;
    }

    const res = Reservation.NewBlank();
    res.addEmailMessageBody(date, messageBody);
    this.reservationsByNumber[reservationNumber] = res;
  }

  public cancel(reservationNumber: string) {
    if (this.hasReservation(reservationNumber)) {
      this.reservationsByNumber[reservationNumber].cancel();
    }
  }

  public toDisplayObject() {
    const reservations = [];
    this.eachReservation((res: Reservation) => {
      reservations.push(res.toDisplayObject());
    });
    return reservations;
  }

  public syncToCalendar() {
    this.eachReservation((res: Reservation) => {
      // FIXME: Look into batching Calendar API operations, instead of syncing
      // them serially.
      res.syncToCalendar();
    });
  }

  private hasReservation(reservationNumber: string): boolean {
    return this.reservationsByNumber.hasOwnProperty(reservationNumber);
  }

  // TODO: Make this function a one-liner with map() when Google Apps Script has
  // ES6 support for Object. I don't see a way to do it with ES2015. Like:
  // return Object.values(this.reservationsByNumber).map((res: Reservation) => res.toDisplayObject());
  private eachReservation(cb: (res: Reservation) => void) {
    for (const reservationNumber in this.reservationsByNumber) {
      // Filter out other object attributes that aren't reservation numbers.
      if (this.hasReservation(reservationNumber)) {
        cb(this.reservationsByNumber[reservationNumber]);
      }
    }
  }
}
