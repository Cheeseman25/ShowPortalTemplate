/**
 * Show Portal Apps Script backend (bound to the show's Google Sheet).
 * Serves the cast list, Google Calendar events and Drive music to the website,
 * and writes call board details into calendar events when the AWS call board asks.
 *
 * The call board itself (calls, staff PIN) lives in AWS (Lambda + DynamoDB), not here.
 * This code is the same for every show. Per-show values live in
 * Project Settings -> Script Properties (never in this file, which is public on GitHub):
 *   CALENDAR_ID           public Google Calendar ID (...@group.calendar.google.com)
 *   MUSIC_ROOT_FOLDER_ID  Drive folder ID holding the rehearsal tracks
 *   AWS_SYNC_SECRET       shared secret, 32+ characters; must equal the SSM parameter
 *                         <ParameterPrefix>/sync-secret that the AWS Lambda reads
 *
 * VERSION 6 (AWS-only): Sheet call board and PIN removed; awsSync/awsAttach/awsCreate bridge added.
 *
 * First time: run setupSheets() once from the editor to create the Cast tab.
 */

const CONFIG = {
  CAST_SHEET_NAME: "Cast"
};

// When the AWS call board calls in, it sends its own copy of that day's calls. The calendar code
// reads calls through getRehearsalCalls(), which returns this copy for the one request.
var CALLS_OVERRIDE_ = null;

function getSetting(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  return value ? String(value).trim() : "";
}

/** True if the request carries the AWS bridge secret (compared without early exit). */
function verifyAwsSecret_(provided) {
  var a = String(provided || ""), b = getSetting("AWS_SYNC_SECRET");
  if (b.length < 32 || a.length !== b.length) return false; // unset or short secret never matches
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Calls handed over by AWS for this request; empty if none. */
function getRehearsalCalls() {
  return CALLS_OVERRIDE_ || [];
}

/**
 * Run once from the Apps Script editor (select setupSheets, press Run).
 * Creates the Cast tab with the expected header row.
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(CONFIG.CAST_SHEET_NAME)) {
    var cast = ss.insertSheet(CONFIG.CAST_SHEET_NAME);
    cast.appendRow(["Category", "Role", "Cast A", "Cast B"]);
    cast.getRange(1, 1, 1, 4).setFontWeight("bold");
  }
  Logger.log("Sheets ready. Next: set CALENDAR_ID, MUSIC_ROOT_FOLDER_ID and AWS_SYNC_SECRET in Script Properties, then Deploy.");
}

/**
 * Handles incoming GET requests:
 * - ?action=getCalendarEvents
 * - ?action=getMusic
 * - ?action=getCast
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";
  var result = [];

  try {
    if (action === "getCalendarEvents") {
      result = getCalendarSchedule();
    } else if (action === "getMusic") {
      result = getMusicLibrary();
    } else if (action === "getCast") {
      result = getCastRoster();
    } else {
      result = { status: "error", message: "Unknown action: " + action };
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
  .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles incoming POST requests from the AWS call board (authenticated by the shared secret):
 * - action: "awsSync"    re-sync one date's calls into the calendar
 * - action: "awsAttach"  attach a call to a chosen calendar event
 * - action: "awsCreate"  create a calendar event for a call
 */
function doPost(e) {
  var response = { status: "error", message: "No data received" };

  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === "awsSync" || data.action === "awsAttach" || data.action === "awsCreate") {
      if (!verifyAwsSecret_(data.secret)) {
        response = { status: "error", message: "Unauthorized." };
      } else {
        CALLS_OVERRIDE_ = Array.isArray(data.calls) ? data.calls : [];
        if (data.action === "awsSync") response = syncDate_(data.date);
        else response = resolveCallChoice(data.id, data.action === "awsAttach" ? "attach" : "create", data.eventId || null);
      }
    } else {
      response = { status: "error", message: "Unknown post action: " + data.action };
    }
  } catch (err) {
    response = { status: "error", message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(response))
  .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Crawls Google Drive music folder and all its child subfolders recursively
 */
function getMusicLibrary() {
  var folderId = getSetting("MUSIC_ROOT_FOLDER_ID");
  if (!folderId) return { status: "success", tracks: [] };
  var rootFolder = DriveApp.getFolderById(folderId);
  var tracks = [];

  // 1. Files in the root music folder
  crawlFolderFiles(rootFolder, "Practice Tracks", tracks);

  // 2. Files in all subfolders (e.g. Performance Tracks, Custom Cuts, etc.)
  var subfolders = rootFolder.getFolders();
  while (subfolders.hasNext()) {
    var sub = subfolders.next();
    crawlFolderFiles(sub, sub.getName(), tracks);
  }

  return { status: "success", tracks: tracks };
}

function crawlFolderFiles(folder, categoryName, trackList) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var mime = file.getMimeType();
    var name = file.getName();

    // Match audio files or mp3/m4a/wav extensions
    if (mime.indexOf("audio") > -1 || name.match(/\.(mp3|m4a|wav|aac|ogg)$/i)) {
      var fileId = file.getId();
      var cleanTitle = name.replace(/\.(mp3|m4a|wav|aac|ogg)$/i, "").trim();

      trackList.push({
          id: fileId,
          title: cleanTitle,
          filename: name,
          category: categoryName,
          previewUrl: "https://drive.google.com/file/d/" + fileId + "/preview",
          downloadUrl: "https://drive.google.com/uc?export=download&id=" + fileId
      });
    }
  }
}

/**
 * Pulls live calendar feed for the season
 */
function getCalendarSchedule() {
  var calendarId = getSetting("CALENDAR_ID");
  if (!calendarId) return [];
  var cal = CalendarApp.getCalendarById(calendarId);
  if (!cal) return [];

  var now = new Date();
  var startDate = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)); // 2 weeks back
  var endDate = new Date(now.getTime() + (240 * 24 * 60 * 60 * 1000)); // 8 months out

  var events = cal.getEvents(startDate, endDate);
  var formatted = [];

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var desc = ev.getDescription() || "";
    var loc = ev.getLocation() || "";

    var meetLink = "";
    var meetMatch = (loc + " " + desc).match(/https?:\/\/meet\.google\.com\/[a-zA-Z0-9_-]+/i);
    if (meetMatch) {
      meetLink = meetMatch[0];
    }

    formatted.push({
        id: ev.getId(),
        title: ev.getTitle(),
        startTime: ev.getStartTime().toISOString(),
        endTime: ev.getEndTime().toISOString(),
        isAllDay: ev.isAllDayEvent(),
        location: loc,
        description: desc,
        meetLink: meetLink
    });
  }

  formatted.sort(function(a, b) {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  return formatted;
}

/**
 * Returns cast rows from local sheet tab if present
 */
function getCastRoster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.CAST_SHEET_NAME);
  if (!sheet) {
    var allSheets = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      var n = allSheets[i].getName().toLowerCase();
      if (n.indexOf("cast") > -1 || n.indexOf("character") > -1) {
        sheet = allSheets[i];
        break;
      }
    }
  }

  if (!sheet) return [];
  return sheet.getDataRange().getValues();
}

/**
 * Utility helpers
 */
function parseCommaList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return String(val).split(",").map(function(s) { return s.trim(); }).filter(Boolean);
}

function formatDateForClient(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var year = val.getFullYear();
    var month = ("0" + (val.getMonth() + 1)).slice(-2);
    var day = ("0" + val.getDate()).slice(-2);
    return year + "-" + month + "-" + day;
  }
  return String(val);
}

// ---------- v3 helpers ----------

/** Sheet cell to display text. Sheets may return time cells as Date objects. */
function timeText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "h:mm a");
  return String(v == null ? "" : v).trim();
}

/** Splits an old-style "4:00 PM - 6:00 PM" value into [start, end]. */
function splitTimeRange_(s) {
  var parts = String(s || "").split(/\s*[-\u2013]\s*/);
  return [parts[0] || "", parts[1] || ""];
}

/** 1-based column number of a header (case-insensitive), or -1. */
function headerCol_(sheet, name) {
  var h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
            .map(function(x) { return String(x).toLowerCase().trim(); });
  var i = h.indexOf(String(name).toLowerCase());
  return i === -1 ? -1 : i + 1;
}

