import * as moment from "moment-timezone";
import { stationToTimeZone } from "./TzData";

const DATE_FORMAT = "ddd, MMM D YYYY, h:mm A z";
const DATE_FORMAT_NO_TZ = "ddd, MMM D YYYY, h:mm A";

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
  /** Returns the train's number, like "123". */
  public get number(): string {
    const trainNumberMatch = this.name.match(/\d+/);
    if (trainNumberMatch == null) {
      return "";
    }
    return trainNumberMatch[0];
  }

  public get trainNumber(): string {
    const match = this.name.match("Train ([0-9]+):");
    if (match == null) {
      return "???";
    }
    return match[1];
  }

  public get description(): string {
    return `Amtrak Train ${this.number}: ${this.originStation} -> ${
      this.destinationStation
    }`;
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

  // FIXME: Make these names consistent.
  public get departStationName(): string {
    const match = this.name.match(":(.*) - ");
    if (match == null) {
      return "???";
    }
    return match[1].trim();
  }

  // FIXME: Make these names consistent.
  public get arriveStationName(): string {
    const match = this.name.match(" - (.*)");
    if (match == null) {
      return "???";
    }
    return match[1].trim();
  }
  public static FromParams(params: any): Train {
    return new Train(
      params.name,
      params.originStation,
      params.destinationStation,
      moment.tz(params.depart, stationToTimeZone(params.originStation)),
      moment.tz(params.arrive, stationToTimeZone(params.destinationStation)),
      // FIXME: Test this thoroughly. I don't understand how the timezones can
      // get messed up, exactly.
      moment(params.depart)
    );
  }

  /**
   * Parse all trains found in a Gmail message. This does not do OCR scanning,
   * and should be a bit faster, but can get less information than from
   * Train.FromOcrText.
   */
  public static FromGmailMessage(messageBody): Train[] {
    const re = /ChangeSummaryTrainInfo">(Train [^<]+)<\/span><span .*?ChangeSummaryDepart">Depart (.*?)</g;
    let match;
    const trains: Train[] = [];
    do {
      match = re.exec(messageBody);
      if (match) {
        // FIXME: Get the departure station from the message body, if possible.
        const depart = moment(match[2], "hh:mm a, ddd, MMMM DD YYYY");
        const name = match[1];
        const train = Train.Incomplete(name, depart);
        trains.push(train);
      }
    } while (match);

    return trains;
  }

  public static FromOcrText(ocrText): Train[] {
    const stationsMatch = ocrText.match(
      /(\b\w{3}\b) (\b\w{3}\b) (Round-Trip|One-Way)/m
    );
    if (stationsMatch === null) {
      return [];
    }

    const originStation = stationsMatch[1];
    const destinationStation = stationsMatch[2];

    const trains: Train[] = [];
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
          Train.Legacy(
            trainNumber,
            origin,
            destination,
            departureTime,
            arrivalTime
          )
        );
      }
    } while (match);

    return trains;
  }

  public static Incomplete(name: string, departLocalTime: moment.Moment) {
    return new Train(name, "", "", null, null, departLocalTime);
  }

  public static Legacy(
    trainName: string,
    // FIXME: Rename these to departStation/arriveStation.
    originStation: string,
    destinationStation: string,
    depart: moment.Moment,
    arrive: moment.Moment
  ) {
    return new Train(
      trainName,
      originStation,
      destinationStation,
      depart.tz(stationToTimeZone(originStation)),
      arrive.tz(stationToTimeZone(destinationStation)),
      moment(depart.format()) // Drop the timezone awareness.
    );
  }

  // Train number and human-readable stations. Example:
  // Train 173: NEW YORK (PENN STATION), NY - WASHINGTON, DC
  public name: string;

  // 3-letter station codes.
  public originStation: string;
  public destinationStation: string;

  // Timezone-aware departure and arrival times.
  public depart: moment.Moment;
  public arrive: moment.Moment;

  // Not timezone-aware - parsed from email message text.
  public departLocalTime: moment.Moment;

  constructor(
    trainName: string,
    // FIXME: Rename these to departStation/arriveStation.
    originStation: string,
    destinationStation: string,
    depart: moment.Moment,
    arrive: moment.Moment,
    departLocalTime: moment.Moment
  ) {
    this.name = trainName;
    this.arrive = arrive;
    this.depart = depart;
    this.originStation = originStation;
    this.destinationStation = destinationStation;
    this.departLocalTime = departLocalTime;
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
      name: this.name,
    };
  }

  /**
   * Return a dict of display-formatted strings representing this train, so it
   * can be shown in the web UI.
   */
  public toDisplayObject() {
    let departString: string = "???";
    if (this.depart !== null) {
      departString = this.depart.format(DATE_FORMAT);
    }
    if (this.departLocalTime !== null) {
      departString = this.departLocalTime.format(DATE_FORMAT_NO_TZ);
    }
    return {
      depart: departString,
      name: this.name,
    };
  }
}
