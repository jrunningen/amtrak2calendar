// This script removes passenger names and Amtrak Rewards numbers from ticket
// text in the testdata directory.
//
// It cuts out the "PASSENGERS" line, and the line after.
//
// There's nothing terribly sensitive in Amtrak ticket text. Just first and
// last names, and Amtrak Guest Rewards numbers. I can't think of what
// nefarious things could be done with that info, but we don't need it for
// parsing, so might as well remove it.
//
// To run:
//
// ts-node tools/clear_ticket_names.ts

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const testDataDir = "spec/testdata";
for (const filename of readdirSync(testDataDir)) {
	const filepath = join(testDataDir, filename);
	const ticketText = readFileSync(filepath, "utf8");
	writeFileSync(filepath, ticketText.replace(/PASSENGERS.*$\n.*\n/m, ""));
}
