/**
 * Show Portal backend (Google Apps Script, bound to the show's Google Sheet).
 * Serves rehearsal calls, cast, calendar events and Drive music to the website,
 * and saves staff edits to the Rehearsals tab.
 *
 * This code is the same for every show. Per-show values live in
 * Project Settings -> Script Properties (never in this file, which is public on GitHub):
 *   ADMIN_PIN             staff PIN for editing the call board (required for edits)
 *   CALENDAR_ID           public Google Calendar ID (…@group.calendar.google.com)
 *   MUSIC_ROOT_FOLDER_ID  Drive folder ID holding the rehearsal tracks
 *
 * VERSION 3 (2026-10-21): Time split into StartTime/EndTime; calendar sync (calendarSync.gs VERSION 3).
 *
 * First time: run setupSheets() once from the editor to create the tabs.
 */

const CONFIG = {
  REHEARSALS_SHEET_NAME: "Rehearsals",
  CAST_SHEET_NAME: "Cast"
};

function getSetting(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  return value ? String(value).trim() : "";
}

/**
 * Validates the director/staff PIN against the ADMIN_PIN script property.
 * With no ADMIN_PIN set, every PIN is rejected (editing stays locked).
 */
function verifyAdminPin(providedPin) {
  var storedPin = getSetting("ADMIN_PIN");
  if (!storedPin) return false;
  return String(providedPin).trim() === storedPin;
}

/**
 * Run once from the Apps Script editor (select setupSheets, press Run).
 * Creates the Rehearsals and Cast tabs with the expected header rows.
 */
function setupSheets() {
  getOrCreateRehearsalsSheet();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(CONFIG.CAST_SHEET_NAME)) {
    var cast = ss.insertSheet(CONFIG.CAST_SHEET_NAME);
    cast.appendRow(["Category", "Role", "Cast A", "Cast B"]);
    cast.getRange(1, 1, 1, 4).setFontWeight("bold");
  }
  Logger.log("Sheets ready. Next: set ADMIN_PIN, CALENDAR_ID and MUSIC_ROOT_FOLDER_ID in Script Properties, then Deploy.");
}

/**
 * Handles incoming GET requests:
 * - ?action=getRehearsals (or default)
 * - ?action=getCalendarEvents
 * - ?action=getMusic
 * - ?action=getCast
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getRehearsals";
  var result = [];

  try {
    if (action === "getRehearsals") {
      result = getRehearsalCalls();
    } else if (action === "getCalendarEvents") {
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
 * Handles incoming POST requests:
 * - action: "verifyPin"
 * - action: "save" (creates or updates rehearsal notice, including isArchived)
 * - action: "archive" / "delete" (sets isArchived = true)
 */
function doPost(e) {
  var response = { status: "error", message: "No data received" };

  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);

    if (data.action === "verifyPin") {
      if (verifyAdminPin(data.pin)) {
        response = { status: "success", message: "PIN accepted" };
      } else {
        response = { status: "error", message: "Invalid PIN" };
      }
      return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // All write actions require PIN verification
    if (!verifyAdminPin(data.pin)) {
      response = { status: "error", message: "Unauthorized. Invalid staff credentials." };
      return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "save") {
      response = saveRehearsalCall(data.item);
    } else if (data.action === "archive" || data.action === "delete") {
      response = setRehearsalArchivedStatus(data.id, true);
    } else if (data.action === "unarchive") {
      response = setRehearsalArchivedStatus(data.id, false);
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
 * Retrieves rehearsal notices from the Google Sheet
 * Columns: ID, Title, Date, StartTime, EndTime, Location, Type, CalledRoles, FocusScenes, Notes, IsArchived
 */
function getRehearsalCalls() {
  var sheet = getOrCreateRehearsalsSheet();
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  var headers = rows[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var idIdx = headers.indexOf("id");
  var titleIdx = headers.indexOf("title");
  var dateIdx = headers.indexOf("date");
  var timeIdx = headers.indexOf("time");
  var startIdx = headers.indexOf("starttime");
  var endIdx = headers.indexOf("endtime");
  var locIdx = headers.indexOf("location");
  var typeIdx = headers.indexOf("type");
  var rolesIdx = headers.indexOf("calledroles");
  var scenesIdx = headers.indexOf("focusscenes");
  var notesIdx = headers.indexOf("notes");
  var archIdx = headers.indexOf("isarchived");

  var list = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0] && !row[1]) continue;

    var isArch = false;
    if (archIdx !== -1) {
      var val = row[archIdx];
      isArch = (val === true || String(val).toUpperCase() === "TRUE");
    }

    list.push({
        id: String(row[idIdx !== -1 ? idIdx : 0]),
        title: String(row[titleIdx !== -1 ? titleIdx : 1] || ""),
        date: formatDateForClient(row[dateIdx !== -1 ? dateIdx : 2]),
        startTime: timeText_(row[startIdx !== -1 ? startIdx : (timeIdx !== -1 ? timeIdx : 3)]),
        endTime: timeText_(endIdx !== -1 ? row[endIdx] : ""),
        time: timeText_(row[startIdx !== -1 ? startIdx : (timeIdx !== -1 ? timeIdx : 3)]) +
              (endIdx !== -1 && row[endIdx] ? " - " + timeText_(row[endIdx]) : ""),
        location: String(row[locIdx !== -1 ? locIdx : 4] || ""),
        type: String(row[typeIdx !== -1 ? typeIdx : 5] || "Rehearsal"),
        calledRoles: parseCommaList(row[rolesIdx !== -1 ? rolesIdx : 6]),
        focusScenes: parseCommaList(row[scenesIdx !== -1 ? scenesIdx : 7]),
        notes: String(row[notesIdx !== -1 ? notesIdx : 8] || ""),
        isArchived: isArch
    });
  }

  return list;
}

/**
 * Saves or updates a rehearsal call in the Sheet, ensuring isArchived is tracked in Col 10
 */
function saveRehearsalCall(item) {
  var sheet = getOrCreateRehearsalsSheet();
  var rows = sheet.getDataRange().getValues();
  var targetRow = -1;

  for (var r = 1; r < rows.length; r++) {
    if (String(rows[r][0]) === String(item.id)) {
      targetRow = r + 1;
      break;
    }
  }

  var parts = splitTimeRange_(item.time);
  var startT = item.startTime || parts[0];
  var endT = item.endTime || parts[1];

  var rowData = [
    item.id || ("reh-" + new Date().getTime()),
    item.title || "Rehearsal Call",
    item.date || "",
    startT,
    endT,
    item.location || "",
    item.type || "Rehearsal",
    Array.isArray(item.calledRoles) ? item.calledRoles.join(", ") : (item.calledRoles || ""),
    Array.isArray(item.focusScenes) ? item.focusScenes.join(", ") : (item.focusScenes || ""),
    item.notes || "",
    Boolean(item.isArchived === true || item.isArchived === "true" || item.isArchived === "TRUE")
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  try { syncRehearsalById(rowData[0]); } catch (err) { Logger.log("calendar sync: " + err); }

  return { status: "success", id: rowData[0] };
}

/**
 * Sets the isArchived column without deleting the row
 */
function setRehearsalArchivedStatus(id, archiveBoolean) {
  var sheet = getOrCreateRehearsalsSheet();
  var rows = sheet.getDataRange().getValues();
  var found = false;

  for (var r = 1; r < rows.length; r++) {
    if (String(rows[r][0]) === String(id)) {
      var archCol = headerCol_(sheet, "isarchived");
      if (archCol === -1) archCol = 11;
      sheet.getRange(r + 1, archCol).setValue(archiveBoolean);
      found = true;
      break;
    }
  }

  if (found) {
    try { syncRehearsalById(id); } catch (err) { Logger.log("calendar sync: " + err); }
    return { status: "success", id: id, isArchived: archiveBoolean };
  } else {
    return { status: "error", message: "Notice ID not found: " + id };
  }
}

/**
 * Ensures the Rehearsals sheet exists with proper column headers
 */
function getOrCreateRehearsalsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.REHEARSALS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.REHEARSALS_SHEET_NAME);
    sheet.appendRow([
        "ID",
        "Title",
        "Date",
        "StartTime",
        "EndTime",
        "Location",
        "Type",
        "CalledRoles",
        "FocusScenes",
        "Notes",
        "IsArchived"
    ]);
  } else {
    // Check if IsArchived header exists
    var lastCol = sheet.getLastColumn();
    if (lastCol < 10) {
      sheet.getRange(1, 10).setValue("IsArchived");
    }
  }
  return sheet;
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
