// Load MomentJS with timezones.
//
// This is hacky, but I don't know how else I'm supposed to make it work. This
// file is ignored in the clasp dev environment, and only runs on the production
// Google Apps Script environment.
//
// All of our sources are compiled from Typescript using clasp, so they all
// declare this module.exports object at the top. We don't control which order
// they load in.
//
// When we eval() the momentjs source, momentjs sees the module.exports object,
// and thinks it's in a nodejs environment, so it fills module.exports with
// momentjs exports.
//
// To keep both our app and momentjs happy, we preserve the original
// module.exports before loading momentjs, clear it, let momentjs turn
// module.exports into the moment library, rename module.exports to a global
// moment object, then restore the original module.exports.
//
// I really don't like the idea of loading code from a URL and eval-ing it. I'd
// rather vendor the libraries within this project, and not make extra external
// calls, which require an additional scope for UrlFetchApp. However, I haven't
// found any reasonable way of vendoring nodejs libraries with a Google Apps
// Script project.
//
// Keep an eye on https://github.com/google/clasp/issues/325, which appears
// related.
const exportsOrig = module.exports;
module.exports = {};
function require() {
  return module.exports;
}
eval(UrlFetchApp.fetch('https://momentjs.com/downloads/moment.min.js').getContentText());
eval(UrlFetchApp.fetch('https://momentjs.com/downloads/moment-timezone-with-data-10-year-range.js').getContentText());
const moment = module.exports;
module.exports = exportsOrig;
