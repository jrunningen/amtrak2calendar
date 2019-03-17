import * as moment from "moment-timezone";

// These constants cannot be used directly in other /src files, because ts2gas
// doesn't seem to support exported constants, only functions. So, we define
// the formatMoment functions instead.
const DATE_FORMAT = "ddd, MMM D YYYY, h:mm A z";
const DATE_FORMAT_NO_TZ = "ddd, MMM D YYYY, h:mm A";

export function formatMoment(date): string {
	return date.format(DATE_FORMAT);
}

export function formatMomentNoTz(date): string {
	return date.format(DATE_FORMAT_NO_TZ);
}
