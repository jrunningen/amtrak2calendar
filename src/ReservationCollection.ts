import { getReservationNumber, Reservation } from "./Reservation";

export class ReservationCollection {
  // The "Map" type isn't polyfilled by tscompiler, and isn't supported on Apps
  // Script. So, we use a typed Object as the next best thing.
  private reservationsByNumber: { [reservationNumber: string]: Reservation };

  constructor() {
    this.reservationsByNumber = {};
  }

  public addEmailMessageBody(messageBody: string) {
    const reservationNumber = getReservationNumber(messageBody);
    if (this.hasReservation(reservationNumber)) {
      this.reservationsByNumber[reservationNumber].addEmailMessageBody(
        messageBody
      );
      return;
    }
    const res = Reservation.FromGmailMessage(messageBody);
    this.reservationsByNumber[reservationNumber] = res;
  }

  public cancel(reservationNumber: string) {
    if (this.hasReservation(reservationNumber)) {
      this.reservationsByNumber[reservationNumber].cancel();
    }
  }

  // TODO: Make this function a one-liner with map() when Google Apps Script has
  // ES6 support for Object. I don't see a way to do it with ES2015. Like:
  // return Object.values(this.reservationsByNumber).map((res: Reservation) => res.toDisplayObject());
  public toDisplayObject() {
    const reservations = [];
    for (const reservationNumber in this.reservationsByNumber) {
      if (this.hasReservation(reservationNumber)) {
        reservations.push(
          this.reservationsByNumber[reservationNumber].toDisplayObject()
        );
      }
    }
    return reservations;
  }

  private hasReservation(reservationNumber: string): boolean {
    return this.reservationsByNumber.hasOwnProperty(reservationNumber);
  }
}
