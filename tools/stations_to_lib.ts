// This script parses Amtrak_Stations.csv and outputs a simple library that
// returns timezones for train codes. This generated library is used to take timezones
// into account when creating calendar events, rather than assuming all stations are in
// the script's local timezone (New York, according to appsscript.json). That
// would be a very silly thing to do.
//
// Amtrak_Stations.csv is a US Government work, not subject to copyright,
// retrieved from
// https://hifld-geoplatform.opendata.arcgis.com/datasets/amtrak-stations
//
// It's conceivable that Amtrak might build a new train station. In that case,
// regenerate the library by getting a new CSV of stations from the government
// source, or some other source, and regenerate the file by running:
//
// ts-node tools/stations_to_lib.ts

import { readFileSync, writeFileSync } from "fs";
const parse = require('csv-parse/lib/sync')
const tzlookup = require("tz-lookup");

let tzData = '';

const csvData = readFileSync("Amtrak_Stations.csv", "utf8");
const records = parse(csvData).slice(1);
for (const record of records) {
  let [lon, lat, num, code, name, city, state, ...rest] = record;
  if(!lat) {
    continue;
  }
  const tz = tzlookup(lat, lon);
  tzData = tzData.concat(`  ${code}: '${tz}',\n`);
}

const tzDataCode = `// GENERATED CODE
//
// This file is generated from the stations_to_lib.ts script. Do not edit manually.

import { getTzDataNonUs } from "./tzdataNonUS";

const tzData = {
${tzData}};
export function stationToTimeZone(stationCode: string): string {
  const tzDataNonUs = getTzDataNonUs();
  if (tzDataNonUs.hasOwnProperty(stationCode)) {
    return tzDataNonUs[stationCode];
  }
  if (tzData.hasOwnProperty(stationCode)) {
    return tzData[stationCode];
  }
  return null;
}
`

writeFileSync("src/TzData.ts", tzDataCode);
