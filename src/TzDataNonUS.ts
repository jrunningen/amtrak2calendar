// The following map is Amtrak station timezones outside of the US. It augments
// the dataset in tzdata.ts.
//
// I haven't been able to find a comprehensive set of Amtrak stations in Canada.
// There don't seem to be any in Mexico. The entries here are from poking around
// on amtrak.com and amtrakvacations.com.

export const tzDataNonUs = {
  VAC: 'America/Vancouver',
  MTR: 'America/Toronto',
  SLQ: 'America/Toronto',
  TCT: 'America/Toronto',
  TWO: 'America/Toronto',
  VBC: 'America/Vancouver',
  VIF: 'America/Vancouver',
};

export function getTzDataNonUs() {
  return tzDataNonUs;
}