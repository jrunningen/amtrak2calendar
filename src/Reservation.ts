import { IncompleteTrain } from "./Train";

export function getReservationNumber(messageBody) {
  const match = messageBody.match("Reservation Number - ([A-Z0-9]+)");
  if (match == null) {
    return null;
  }
  return match[1];
}

export class Reservation {
  public static FromGmailMessage(messageBody): Reservation {
    const reservationNumber = getReservationNumber(messageBody);
    const trains = IncompleteTrain.FromGmailMessage(messageBody);
    return new Reservation(
      reservationNumber,
      trains,
    )
  }

  constructor(
    reservationNumber: string,
    trains: IncompleteTrain[],
  ) {
    this.reservationNumber = reservationNumber;
    this.trains = trains;
  }

  // The 6-character reservation number, like "ABC123"
  public reservationNumber: string;

  // Trains in the reservation, in order.
  public trains: IncompleteTrain[];

  // If true, this reservation appears to have been cancelled.
  public isCancelled: boolean = false;

  /**
   * A string summarizing the trip.
   */
  public description() {
    if (this.trains.length === 0) {
      return "(no trains)";
    }
    if (this.trains.length === 1) {
      return `${this.trains[0].departStationName} -> ${this.trains[0].arriveStationName} (one-way)`;
    }
    if (this.trains.length === 2) {
      const firstTrain = this.trains[0];
      const secondTrain = this.trains[1];
      if (firstTrain.departStationName === secondTrain.arriveStationName &&
        secondTrain.departStationName === firstTrain.arriveStationName) {
        return `${firstTrain.departStationName} -> ${firstTrain.arriveStationName} (round trip)`;
      }
      return `${firstTrain.departStationName} -> ${secondTrain.arriveStationName}`;
    }
    const firstTrain = this.trains[0];
    const lastTrain = this.trains[this.trains.length - 1];
    return `${firstTrain.departStationName} -> ${lastTrain.arriveStationName}`;
  }

  public toDisplayObject() {
    return {
      reservationNumber: this.reservationNumber,
      description: this.description(),
      isCancelled: this.isCancelled,
      trains: this.trains.map(train => train.toDisplayObject()),
    };
  }
}
