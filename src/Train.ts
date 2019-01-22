import * as moment from "moment-timezone";
import { stationToTimeZone } from "./TzData"

const DATE_FORMAT = "ddd, MMM D YYYY, h:mm A z";

export function getReservationNumber(messageBody) {
  const match = messageBody.match("Reservation Number - ([A-Z0-9]+)");
  if (match == null) {
    return null;
  }
  return match[1];
}

function ocrRegexp(): RegExp {
  const regexpParts: RegExp[] = [
    // Train and train number.
    /(TRAIN [\s\S]*?(\d+)[\s\S]*?)/,
    // Capture the year. We just capture the year here (not month or day),
    // because the month and day don't always OCR reliably.  See test file
    // "amtrak text FAKE01.txt", where it says
    // "ACELA Nov EXPRESS 25, 2018 WASHINGTON - NEW YORK (PENN".
    /(\b\d{4}\b)/,
    // Non-greedily consume extra text until departure and arrival times.
    /[\s\S]*?/,
    // Departure and arrival times come after "DEPARTS ARRIVES".
    /DEPARTS ARRIVES /,
    // This is the date string, like "(Sun Nov 25)".
    /\((.+?)\) /,
    // Consume extra misaligned text.
    /[\s\S]*?/,
    // Departure time of day.
    /(\d+:\d+ (?:AM|PM)) /,
    // Consume extra misaligned text.
    /[\s\S]*?/,
    // Arrival time of day.
    /(\d+:\d+ (?:AM|PM) ?)/,
  ];

  // Mash it all into one big RegExp.
  return new RegExp(
    regexpParts.reduce(
      (accumulator: string, current: RegExp) => accumulator + current.source,
      ""
    ),
    "mg"
  );
}

export class Train {
  public static FromParams(params: any): Train {
    return new Train(
      params.trainName,
      params.originStation,
      params.destinationStation,
      params.reservationNumber,
      moment.tz(params.depart, stationToTimeZone(params.originStation)),
      moment.tz(params.arrive, stationToTimeZone(params.destinationStation))
    );
  }

  public static FromOcrText(ocrText): Train[] {
    const stationsMatch = ocrText.match(/(\b\w{3}\b) (\b\w{3}\b) (Round-Trip|One-Way)/m);
    if (stationsMatch === null) {
      return [];
    }

    const originStation = stationsMatch[1];
    const destinationStation = stationsMatch[2];

    const trains: Train[] = [];

    // The reservation number is near the top of the ticket.
    let reservationNumber = "";
    const reservationNumberMatch = ocrText.match(
      /RESERVATION NUMBER ([A-Z0-9]{6})/m
    );
    if (reservationNumberMatch != null) {
      reservationNumber = reservationNumberMatch[1];
    }

    const re = ocrRegexp();

    let firstMatch = true;

    let match;
    do {
      match = re.exec(ocrText);
      if (match) {
        const trainNumber = match[2];
        const year = match[3];
        const dateString = match[4];
        const departureString = match[5];
        const arrivalString = match[6];

        // FIXME: Use better variable names.
        let origin = originStation;
        let destination = destinationStation;
        if (firstMatch === false) {
          // The return trip has stations reversed.
          origin = destinationStation;
          destination = originStation;
        }
        firstMatch = false;

        // FIXME: This assumes same-day arrivals.
        // FIXME: Do something sensible if we're missing timezones for one or both stations.
        const departureTime = moment.tz(
          `${dateString} ${year} ${departureString}`,
          "ddd MMM DD YYYY hh:mm a",
          stationToTimeZone(origin)
        );
        const arrivalTime = moment.tz(
          `${dateString} ${year} ${arrivalString}`,
          "ddd MMM DD YYYY hh:mm a",
          stationToTimeZone(destination)
        );

        trains.push(
          // FIXME: We need a better description than just the train number. It looks weird in calendar.
          new Train(
            trainNumber,
            origin,
            destination,
            reservationNumber,
            departureTime,
            arrivalTime
          )
        );
      }
    } while (match);

    return trains;
  }

  // FIXME: Rename fields, make them make more sense.
  // FIXME: Build in default behavior when arrival time is unset.
  public train: string; // Stores the train number.
  public originStation: string;
  public destinationStation: string;
  public reservationNumber: string;
  public depart: moment.Moment;
  public arrive: moment.Moment;

  constructor(
    trainName: string,
    // FIXME: Rename these to departStation/arriveStation.
    originStation: string,
    destinationStation: string,
    reservationNumber: string,
    depart: moment.Moment,
    arrive: moment.Moment
  ) {
    this.arrive = arrive.tz(stationToTimeZone(destinationStation));
    this.depart = depart.tz(stationToTimeZone(originStation));
    this.reservationNumber = reservationNumber;
    this.train = trainName;
    this.originStation = originStation;
    this.destinationStation = destinationStation;
  }

  /** Returns the train's number, like "123". */
  public get number(): string {
    const trainNumberMatch = this.train.match(/\d+/);
    if (trainNumberMatch == null) {
      return "";
    }
    return trainNumberMatch[0];
  }

  public get description(): string {
    return `Amtrak Train ${this.number}: ${this.originStation} -> ${this.destinationStation}`;
  }

  public get departString(): string {
    return this.depart.format(DATE_FORMAT);
  }

  public get arriveString(): string {
    return this.arrive.format(DATE_FORMAT);
  }

  public get departTimeZone(): string {
    return stationToTimeZone(this.originStation);
  }

  public get arriveTimeZone(): string {
    return stationToTimeZone(this.destinationStation);
  }

  /**
   * Return a dict representing this train, so it can be stored in callback params and rebuilt in a callback.
   *
   * Train.FromParams(train.toParams()) === train.
   */
  public toParams() {
    return {
      arrive: this.arrive.format(),
      depart: this.depart.format(),
      originStation: this.originStation,
      destinationStation: this.destinationStation,
      reservationNumber: this.reservationNumber,
      trainName: this.train,
    };
  }
}

/**
 * An IncompleteTrain lacks some information, like 3-letter station codes and
 * arrival time. Its information is extracted from email message bodies.
 *
 * Departure time is not timezone-aware.
 */
export class IncompleteTrain {
  // Train number and human-readable stations. Example:
  // Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC
  public name: string;
  public reservationNumber: string;
  // Not timezone-aware.
  public depart: moment.Moment; 

  constructor(
    name: string,
    reservationNumber: string,
    depart: moment.Moment,
  ) {
    this.reservationNumber = reservationNumber;
    this.name = name;
    this.depart = depart;
  }

  public static FromGmailMessage(messageBody): IncompleteTrain[] {
    const reservationNumber = getReservationNumber(messageBody);
    const re = /ChangeSummaryTrainInfo">(Train [^<]+)<\/span><span .*?ChangeSummaryDepart">Depart (.*?)</g;
    let match;
    const trains: IncompleteTrain[] = [];
    do {
      match = re.exec(messageBody);
      if (match) {
        // FIXME: Get the departure station from the message body, if possible.
        const depart = moment(match[2], "hh:mm a, ddd, MMMM DD YYYY");
        // Arrival time is not available from email message bodies. Use 1 hour as a placeholder.
        const arrive = depart.clone().add(1, "hour");
        const trainName = match[1];
        const train = new IncompleteTrain(
          trainName,
          reservationNumber,
          depart,
        );
        trains.push(train);
      }
    } while (match);

    return trains;
  }

  /**
   * Return a dict representing this train, so it can be stored in callback params and rebuilt in a callback.
   *
   * Train.FromParams(train.toParams()) === train.
   */
  public toParams() {
    return {
      depart: this.depart.format(),
      name: this.name,
      reservationNumber: this.reservationNumber,
    };
  }
}
