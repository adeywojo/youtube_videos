// ============================================================
// Daily Bible Verse - YouTube automation (Google Apps Script)
//
// What this script does:
//   run() / triggerVerseVideo()  Verse of the day Short + prepares the prayer video
//   triggerPrayerVideo()         Prayer video (uses data saved by the verse run)
//   triggerBibleReadingVideo()   "Read the Bible in One Year" long-form video
//
// The videos themselves are rendered and uploaded by GitHub Actions in
// adeywojo/Daily_Bible_Verse_Automation. This script prepares the text,
// images and audio, then sends a repository_dispatch event to that repo.
//
// SECRETS: none are stored in this file. Add them in the Apps Script editor
// under Project Settings > Script Properties. See apps-script/README.md.
// ============================================================

// ---- Non-secret settings ----
const CLOUDINARY_CLOUD = "dcfibmhky";
const CLOUDINARY_BG = "v1765933186/Daily_Bible_Verse_Background_z9v0gi.png";
const CLOUDINARY_PRAYER_BG =
  "https://res.cloudinary.com/dcfibmhky/image/upload/w_1920,h_1920,c_fill/v1765933186/Daily_Bible_Verse_Background_1920_x_1920_px_hyskfy.png";
const GITHUB_REPO = "adeywojo/Daily_Bible_Verse_Automation";
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

// One timezone for every date calculation (the old code mixed Toronto, the
// script's own timezone and a hard-coded UTC-6 offset).
const TIMEZONE = "America/Edmonton";
const PLAN_START = { year: 2026, month: 1, day: 1 };

// Verse Shorts stay on the KJV (public domain).
const VERSE_TRANSLATION = "kjv";
const VERSE_TRANSLATION_LABEL = "KJV";

// Bible in One Year narration. The NIV is copyrighted (Biblica) and needs a
// license for audio/video readings, so this uses a public-domain translation.
// "web" = World English Bible (modern English), "kjv" = King James Version.
const READING_TRANSLATION = "web";
const READING_ATTRIBUTION =
  "Scripture quotations are from the World English Bible (WEB), which is in the public domain.";
const READING_PLAN_DAYS = 358;

// Required Script Properties (Project Settings > Script Properties)
const REQUIRED_SECRETS = [
  "ANTHROPIC_API_KEY",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GOOGLE_TTS_API_KEY",
  "GITHUB_TOKEN",
  "WEBAPP_TOKEN",
];

// ---- Verse plan (89 verses, repeats every 89 days) ----
const PLAN_13_WEEKS = [
  { ref: "Proverbs 3:5-6" },
  { ref: "Psalm 118:24" },
  { ref: "Joshua 24:15" },
  { ref: "Matthew 11:28" },
  { ref: "Isaiah 41:10" },
  { ref: "John 14:27" },
  { ref: "James 1:5" },
  { ref: "Hebrews 11:1" },
  { ref: "1 Thessalonians 5:18" },
  { ref: "Colossians 3:14" },
  { ref: "Lamentations 3:22-23" },
  { ref: "Psalm 46:1" },
  { ref: "Philippians 4:6-7" },
  { ref: "Proverbs 16:9" },
  { ref: "Psalm 37:5" },
  { ref: "Nehemiah 8:10" },
  { ref: "Ephesians 4:2" },
  { ref: "Isaiah 40:31" },
  { ref: "2 Timothy 1:7" },
  { ref: "Psalm 4:8" },
  { ref: "Psalm 32:8" },
  { ref: "Romans 8:28" },
  { ref: "Psalm 107:1" },
  { ref: "1 Corinthians 13:4-5" },
  { ref: "Psalm 62:5" },
  { ref: "Deuteronomy 31:6" },
  { ref: "Isaiah 26:3" },
  { ref: "Proverbs 4:6" },
  { ref: "Psalm 56:3" },
  { ref: "Psalm 34:1" },
  { ref: "Proverbs 22:6" },
  { ref: "Hebrews 4:9-10" },
  { ref: "Joshua 1:9" },
  { ref: "Psalm 55:22" },
  { ref: "Psalm 119:105" },
  { ref: "Mark 11:22" },
  { ref: "Psalm 100:4" },
  { ref: "Romans 12:10" },
  { ref: "Psalm 23:1-3" },
  { ref: "Isaiah 43:2" },
  { ref: "Colossians 3:15" },
  { ref: "Proverbs 11:14" },
  { ref: "Hebrews 10:23" },
  { ref: "Psalm 9:1" },
  { ref: "Galatians 6:2" },
  { ref: "Isaiah 30:15" },
  { ref: "Psalm 121:1-2" },
  { ref: "Romans 15:13" },
  { ref: "Proverbs 2:6" },
  { ref: "2 Corinthians 5:7" },
  { ref: "Psalm 16:11" },
  { ref: "1 John 4:7" },
  { ref: "Revelation 21:5" },
  { ref: "Exodus 15:2" },
  { ref: "Psalm 46:10" },
  { ref: "Isaiah 30:21" },
  { ref: "Philippians 1:6" },
  { ref: "Colossians 3:17" },
  { ref: "1 Peter 4:8" },
  { ref: "2 Corinthians 4:16" },
  { ref: "Psalm 27:1" },
  { ref: "Isaiah 41:13" },
  { ref: "Proverbs 1:7" },
  { ref: "Matthew 21:22" },
  { ref: "James 1:17" },
  { ref: "Ephesians 5:1-2" },
  { ref: "Psalm 16:8-9" },
  { ref: "1 Corinthians 16:13" },
  { ref: "2 Thessalonians 3:16" },
  { ref: "Jeremiah 33:3" },
  { ref: "Psalm 9:10" },
  { ref: "Psalm 30:5" },
  { ref: "Ruth 1:16" },
  { ref: "Micah 7:7" },
  { ref: "Romans 8:31" },
  { ref: "Psalm 29:11" },
  { ref: "Proverbs 19:20" },
  { ref: "Psalm 112:7" },
  { ref: "Psalm 95:1" },
  { ref: "Psalm 133:1" },
  { ref: "Matthew 6:33" },
  { ref: "Psalm 18:32" },
  { ref: "1 Peter 5:7" },
  { ref: "Proverbs 12:15" },
  { ref: "Isaiah 12:2" },
  { ref: "Psalm 103:2" },
  { ref: "1 Corinthians 13:13" },
  { ref: "Psalm 73:26" },
];

const THEMES_BY_DOW = {
  Monday: "Strength & Courage",
  Tuesday: "Peace & Calm",
  Wednesday: "Wisdom & Guidance",
  Thursday: "Faith & Trust",
  Friday: "Gratitude & Joy",
  Saturday: "Family & Love",
  Sunday: "Rest, Hope & Renewal",
};

// ============================================================
// Helpers
// ============================================================

function secret_(name) {
  // Trim: a stray space or line break pasted with a key makes services reject it.
  const value = (PropertiesService.getScriptProperties().getProperty(name) || "").trim();
  if (!value) {
    throw new Error(
      "Missing Script Property: " + name +
      ". Add it in the Apps Script editor under Project Settings > Script Properties."
    );
  }
  return value;
}

// The public web app address (ends in /exec). Set Script Property WEBAPP_URL
// to the URL shown under Deploy > Manage deployments. Without it, Apps Script
// may report the private /dev address when run from the editor, which GitHub
// cannot reach (401 Unauthorized) and which approval links should not use.
function webAppUrl_() {
  const fromProps = PropertiesService.getScriptProperties().getProperty("WEBAPP_URL");
  return (fromProps || ScriptApp.getService().getUrl()).trim();
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Today's calendar date in TIMEZONE, plus whole days since PLAN_START.
// Uses UTC arithmetic on the calendar date, so daylight saving changes can
// never shift the count by a day.
function today_() {
  const now = new Date();
  const dateStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
  const parts = dateStr.split("-").map(Number);
  const todayUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  const startUtc = Date.UTC(PLAN_START.year, PLAN_START.month - 1, PLAN_START.day);
  const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return {
    dateStr: dateStr,
    monthDay: Utilities.formatDate(now, TIMEZONE, "MMMM d"),
    dow: dowNames[new Date(todayUtc).getUTCDay()],
    daysSinceStart: Math.round((todayUtc - startUtc) / 86400000),
  };
}

function cleanText_(text) {
  return String(text || "")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// GET a passage from bible-api.com, retrying politely if rate-limited.
function fetchBibleApi_(reference, translation) {
  const url = "https://bible-api.com/" + encodeURIComponent(reference) +
    "?translation=" + encodeURIComponent(translation);
  for (let attempt = 1; attempt <= 4; attempt++) {
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const code = resp.getResponseCode();
    if (code === 200) return JSON.parse(resp.getContentText());
    if (code === 429 || code >= 500) {
      Utilities.sleep(5000 * attempt);
      continue;
    }
    throw new Error("bible-api.com returned " + code + " for " + reference + ": " +
      resp.getContentText().slice(0, 200));
  }
  throw new Error("bible-api.com kept refusing requests for " + reference);
}

function sha1Hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, text)
    .map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); })
    .join("");
}

// Signed upload of an audio blob to Cloudinary. Returns the secure URL.
function cloudinaryUploadAudio_(blob, publicId) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = sha1Hex_(
    "public_id=" + publicId + "&timestamp=" + timestamp + secret_("CLOUDINARY_API_SECRET")
  );
  const resp = UrlFetchApp.fetch(
    "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD + "/video/upload",
    {
      method: "post",
      payload: {
        file: blob,
        public_id: publicId,
        timestamp: timestamp,
        api_key: secret_("CLOUDINARY_API_KEY"),
        signature: signature,
      },
      muteHttpExceptions: true,
    }
  );
  const data = JSON.parse(resp.getContentText());
  if (!data.secure_url) {
    throw new Error("Cloudinary upload failed for " + publicId + ": " +
      resp.getContentText().slice(0, 200));
  }
  return data.secure_url;
}

// Google Cloud Text-to-Speech. Returns base64 MP3 audio.
function synthesizeSpeech_(text, voiceName, speakingRate) {
  const resp = UrlFetchApp.fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + secret_("GOOGLE_TTS_API_KEY"),
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        input: { text: text },
        voice: { languageCode: "en-US", name: voiceName, ssmlGender: "MALE" },
        audioConfig: { audioEncoding: "MP3", speakingRate: speakingRate },
      }),
      muteHttpExceptions: true,
    }
  );
  const data = JSON.parse(resp.getContentText());
  if (!data.audioContent) {
    throw new Error("Text-to-Speech failed: " + resp.getContentText().slice(0, 200));
  }
  return data.audioContent;
}

// Sends a repository_dispatch event to the rendering repo. Returns the HTTP status.
function dispatchGithub_(eventType, clientPayload) {
  const resp = UrlFetchApp.fetch(
    "https://api.github.com/repos/" + GITHUB_REPO + "/dispatches",
    {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + secret_("GITHUB_TOKEN"),
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      payload: JSON.stringify({ event_type: eventType, client_payload: clientPayload }),
      muteHttpExceptions: true,
    }
  );
  return { status: resp.getResponseCode(), body: resp.getContentText() };
}

// ---- Bible reference safety ----
// The AI only writes the catchy part of each title; the code adds the
// reference itself. On top of that, any chapter:verse the AI writes anywhere
// must match today's verse, or the text is regenerated.

function referenceTokens_(text) {
  return String(text || "").match(/\b\d{1,3}:\d{1,3}(?:-\d{1,3})?\b/g) || [];
}

function findWrongReferences_(text, verseRef) {
  const correct = referenceTokens_(verseRef)[0] || "";
  const allowed = [correct, correct.split("-")[0]];
  return referenceTokens_(text).filter(function (t) { return allowed.indexOf(t) === -1; });
}

function buildTitle_(hook, verseRef) {
  const suffix = " | " + verseRef;
  // 90 chars leaves room for " #Shorts" under YouTube's 100-char limit.
  const maxHook = 90 - suffix.length;
  let cleanHook = cleanText_(hook).replace(/[|]+/g, "-");
  if (cleanHook.length > maxHook) cleanHook = cleanHook.slice(0, maxHook).replace(/\s+\S*$/, "");
  return cleanHook + suffix;
}

// ---- Claude: titles, descriptions and the prayer script ----

// Rotating styles for the spoken opening line of the pilot Short (v2).
const HOOK_STYLES = [
  "a short question that names a real struggle (example: 'Feeling like giving up today?')",
  "'Read this if ...' naming who needs it (example: 'Read this if you feel forgotten')",
  "'God wants you to know ...' (example: 'God wants you to know you are not alone')",
  "a bold, plain-English promise drawn from the verse (example: 'He is not done with you yet')",
];

const CAPTIONS_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string" },
    title_hook: { type: "string" },
    description: { type: "string" },
    prayer_lines: { type: "array", items: { type: "string" } },
    prayer_title_hook: { type: "string" },
    prayer_hook: { type: "string" },
    prayer_description: { type: "string" },
  },
  required: ["hook", "title_hook", "description", "prayer_lines", "prayer_title_hook", "prayer_hook",
    "prayer_description"],
  additionalProperties: false,
};

function buildCaptionsPrompt_(dow, theme, verseRef, verseText, hookStyle, shortPrayer) {
  return (
    "You are a Christian content writer for a Daily Bible Verse YouTube channel.\n\n" +
    "Inputs:\n" +
    "- Day: " + dow + "\n" +
    "- Theme: " + theme + "\n" +
    "- Verse Reference: " + verseRef + "\n" +
    "- Verse Text: " + verseText + "\n\n" +
    "Task 0 - Opening line (hook) for a YouTube Short:\n" +
    "- hook: 4 to 8 words. It is shown in big letters and spoken in the first second, " +
    "before the verse, to stop someone scrolling.\n" +
    "- Style: " + hookStyle + "\n" +
    "- Speak directly to the viewer's real need that this verse answers. Warm and honest, " +
    "not clickbait, no exaggerated claims.\n" +
    "- No verse reference, no book names, no numbers, no 'thee/thou', no emojis.\n\n" +
    "Task 1 - YouTube Short title and description:\n" +
    "- title_hook: 3 to 8 words, inspiring and concise. Do NOT include the verse reference, " +
    "book name, or any numbers; the reference is added automatically.\n" +
    "- description: 3 short paragraphs: (1) one-line encouragement, (2) brief faith reflection " +
    "1-2 sentences, (3) gentle CTA. Then 5 hashtags including #DailyBibleVerse #Shorts #Bible\n" +
    "- Do not mention any Bible reference or chapter:verse numbers in the description; " +
    "the reference is added automatically.\n" +
    "- No emojis\n" +
    "- Do NOT quote the verse text directly\n\n" +
    "Task 2 - Daily Prayer video script (prayer_lines):\n" +
    "- Write a deeply personal, conversational Christian prayer as if someone is genuinely speaking to God\n" +
    "- It should feel warm, intimate and natural, not formal or mechanical\n" +
    "- Use natural speech patterns, contractions like 'we're', 'you've', 'don't', 'I'm'\n" +
    "- Vary sentence length: mix short heartfelt phrases with longer flowing thoughts\n" +
    "- Include moments of vulnerability, gratitude, and quiet confidence in God\n" +
    "- Split into display lines of 10-14 words maximum each\n" +
    (shortPrayer
      ? "- Target 10-12 lines and about 150 words in total (between 140 and 170 words; a 50-60 second video read slowly). " +
        "Fewer than 130 words is too short, so count the words before answering. " +
        "Keep it focused on one need from the verse\n" +
        "- Write normal flowing sentences across the lines: capitalize only the first word of a sentence, 'I', and words " +
        "for God (You, Your, Lord, Father, Jesus). A line that continues a sentence starts in lowercase\n"
      : "- Target 18-22 lines total (for a 2-3 minute video)\n") +
    "- Each line must end at a natural pause or breath point\n" +
    "- Start with an intimate opening like 'Lord, we come to You today' or 'Father, just to be in Your presence'\n" +
    "- End with 'In Jesus name, Amen'\n" +
    "- No emojis, no rhyming, no formal 'thee' or 'thou' language\n" +
    "- Do not mention chapter:verse numbers in the prayer\n\n" +
    "- prayer_hook: 4 to 8 words spoken and shown in the first second, inviting the viewer to pray along " +
    "(examples: 'Pray this with me right now', 'Let's give this worry to God', 'If you need peace tonight, pray this'). " +
    "Vary it day to day. No reference, no numbers, no emojis.\n\n" +
    "Task 3 - Prayer video title and description:\n" +
    "- prayer_title_hook: 3 to 8 words, inspiring, reflects the theme. Do NOT include the verse " +
    "reference or any numbers; it is added automatically.\n" +
    "- prayer_description: brief intro to the prayer, then 5 hashtags including #DailyPrayer #Bible #Faith. " +
    "Do not mention any chapter:verse numbers."
  );
}

function callClaudeForCaptions_(prompt) {
  const resp = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": secret_("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    payload: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
      // Structured outputs: the response is guaranteed to be JSON matching this schema.
      output_config: { format: { type: "json_schema", schema: CAPTIONS_SCHEMA } },
    }),
    muteHttpExceptions: true,
  });

  if (resp.getResponseCode() !== 200) {
    throw new Error("Claude API error " + resp.getResponseCode() + ": " +
      resp.getContentText().slice(0, 300));
  }
  const data = JSON.parse(resp.getContentText());
  if (data.stop_reason === "refusal") throw new Error("Claude declined the request");
  if (data.stop_reason === "max_tokens") throw new Error("Claude response was cut off (max_tokens)");

  const textBlock = (data.content || []).filter(function (b) { return b.type === "text"; })[0];
  if (!textBlock) throw new Error("Claude response had no text block");
  return JSON.parse(textBlock.text);
}

// Generates captions, regenerating if the AI wrote a wrong Bible reference.
function generateCaptions_(dow, theme, verseRef, verseText, hookStyle, shortPrayer) {
  const prompt = buildCaptionsPrompt_(dow, theme, verseRef, verseText, hookStyle || HOOK_STYLES[0], !!shortPrayer);
  let lastProblem = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const c = callClaudeForCaptions_(prompt);
    if (!c.prayer_lines || !c.prayer_lines.length) {
      lastProblem = "empty prayer_lines";
      continue;
    }
    const wrong = findWrongReferences_(
      [c.hook, c.title_hook, c.description, c.prayer_title_hook, c.prayer_hook, c.prayer_description,
        c.prayer_lines.join(" ")].join("\n"),
      verseRef
    );
    if (wrong.length) {
      lastProblem = "wrong reference(s) " + wrong.join(", ") + " for " + verseRef;
      Logger.log("Attempt " + attempt + " rejected: " + lastProblem);
      continue;
    }
    return c;
  }
  // Fail loudly rather than publish a wrong verse reference.
  throw new Error("Could not generate safe captions after 3 attempts: " + lastProblem);
}

// ============================================================
// Web app entry points
//   GET  ?token=<WEBAPP_TOKEN>              run the verse job (e.g. from Make)
//   GET  ?action=approve|reject&id=<code>    approval links from the pilot email
//   POST (JSON from GitHub Actions)          "pilot Short is ready" notice
// ============================================================

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action === "approve" || params.action === "reject") {
    // Show the real error instead of Google's generic "could not complete"
    // page, and log it (Executions + Script Property last_approval_error).
    try {
      return handleApprovalLink_(params);
    } catch (err) {
      const msg = String(err && err.message || err);
      Logger.log("Approval link failed: " + msg + "\n" + (err && err.stack || ""));
      PropertiesService.getScriptProperties().setProperty("last_approval_error",
        new Date().toISOString() + " " + params.action + " " + params.id + ": " + msg);
      return pilotPage_("Something went wrong",
        "<p>The " + htmlEsc_(params.action) + " could not be completed: " + htmlEsc_(msg) + "</p>" +
        "<p>Nothing was published. Try the link again in a minute, or tell Claude what this page says.</p>");
    }
  }
  const expected = PropertiesService.getScriptProperties().getProperty("WEBAPP_TOKEN");
  const given = e && e.parameter ? e.parameter.token : "";
  if (!expected || given !== expected) {
    return jsonOutput_({ error: true, message: "Unauthorized" });
  }
  try {
    return jsonOutput_(run());
  } catch (err) {
    return jsonOutput_({ error: true, message: err.message });
  }
}

// GitHub Actions posts here when a job finishes. Only the pilot's
// "ready for approval" notice is acted on; it must carry the one-time code
// this script created when it started that render.
function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (err) { /* ignore */ }
  const props = PropertiesService.getScriptProperties();
  function note(outcome) {
    // Visible in Apps Script > Executions (click the doPost row) and in Script
    // Property last_callback, to diagnose a missing approval email.
    const summary = new Date().toISOString() + " " + (body.kind || "other") + " " +
      (body.format || "") + " " + (body.youtube_id || "") + ": " + outcome;
    Logger.log("doPost " + summary);
    props.setProperty("last_callback", summary);
  }
  if (body.kind !== "verse_short_v2_ready") {
    note("ignored (not a pilot notice)");
    return jsonOutput_({ ok: true, ignored: true });
  }

  const cbKey = "v2cb_" + String(body.callback_code || "");
  if (!body.callback_code || !props.getProperty(cbKey)) {
    note("REJECTED: unknown or already-used callback code");
    return jsonOutput_({ ok: false, message: "Unknown callback code" });
  }
  props.deleteProperty(cbKey);
  cleanupPilotRecords_();

  const approveId = Utilities.getUuid();
  const record = {
    youtube_id: String(body.youtube_id || ""),
    video_url: String(body.video_url || ""),
    title: String(body.title || ""),
    description: String(body.description || ""),
    verse_ref: String(body.verse_ref || ""),
    hook: String(body.hook || ""),
    template: String(body.template || ""),
    format: body.format === "prayer" ? "prayer" : "verse",
    run_url: String(body.run_url || ""),
    status: "pending",
    created: Date.now(),
  };
  props.setProperty("v2ap_" + approveId, JSON.stringify(record));
  try {
    sendApprovalEmail_(approveId, record);
    note("approval email sent to " + approvalEmail_());
  } catch (err) {
    note("EMAIL FAILED: " + err);
    throw err;
  }
  return jsonOutput_({ ok: true });
}

// ============================================================
// Verse of the day
// options.dryRun = true: fetches the verse and captions only. No audio,
// no uploads, no GitHub dispatch, nothing published.
// ============================================================

function run(options) {
  const dryRun = !!(options && options.dryRun);

  // --- 1. Pick today's verse ---
  const t = today_();
  const n = PLAN_13_WEEKS.length;
  const idx = ((t.daysSinceStart % n) + n) % n;
  const picked = PLAN_13_WEEKS[idx];
  const theme = THEMES_BY_DOW[t.dow];
  const verseRefNorm = picked.ref.replace(/[–—]/g, "-").trim();

  // --- 2. Fetch verse text ---
  const bibleData = fetchBibleApi_(verseRefNorm, VERSE_TRANSLATION);
  const cleanedVerseText = cleanText_(bibleData.text);
  if (!cleanedVerseText) throw new Error("bible-api.com returned no text for: " + verseRefNorm);

  // --- 3. Dynamic font sizing for Cloudinary (unchanged) ---
  const IMG_H = 1080;
  const len = cleanedVerseText.length;
  const TEXT_W = len <= 140 ? 980 : len <= 260 ? 940 : 900;
  const TOP_BOTTOM_MARGIN = 120;
  const GAP = 18;
  const CHAR_WIDTH_RATIO = 0.55;
  const LINE_HEIGHT_RATIO = 1.25;

  function wrapWords(text, maxChars) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (test.length <= maxChars) { line = test; }
      else { if (line) lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
  }

  function fitsCheck(fontSize) {
    const avgCharW = fontSize * CHAR_WIDTH_RATIO;
    const maxChars = Math.max(16, Math.floor(TEXT_W / avgCharW));
    const lines = wrapWords(cleanedVerseText, maxChars);
    const verseH = lines.length * (fontSize * LINE_HEIGHT_RATIO);
    const refFont = Math.max(16, Math.round(fontSize * 0.65));
    const refH = refFont * 1.2;
    const totalH = verseH + GAP + refH;
    const available = IMG_H - TOP_BOTTOM_MARGIN * 2;
    return { ok: totalH <= available, lines, refFont, verseH, refH, totalH };
  }

  let verseFontSize = len <= 120 ? 78 : len <= 200 ? 66 : len <= 320 ? 56 : 48;
  const MIN_FONT = 18;
  let chosen;
  while (verseFontSize >= MIN_FONT) {
    const test = fitsCheck(verseFontSize);
    if (test.ok) { chosen = test; break; }
    verseFontSize -= 2;
  }
  if (!chosen) chosen = fitsCheck(MIN_FONT);

  const verseImageText = chosen.lines.join("\n");
  const refFontSize = chosen.refFont;
  const blockTopFromCenter = chosen.totalH / 2;
  const verseCenterOffset = blockTopFromCenter - chosen.verseH / 2;
  const verseY = Math.round(-verseCenterOffset);

  function cloudinaryEncode(text) {
    return encodeURIComponent(text).replace(/%2C/g, "%252C");
  }

  // --- 4. Verse image URL (rendered on the fly by Cloudinary) ---
  const imageUrl =
    "https://res.cloudinary.com/" + CLOUDINARY_CLOUD + "/image/upload" +
    "/w_1080,h_1920,c_pad,b_white" +
    "/l_text:Lora_" + verseFontSize + ":" + cloudinaryEncode(verseImageText) +
    ",co_black,c_fit,w_" + TEXT_W + ",g_center,y_" + verseY +
    "/l_text:Lora_" + refFontSize + "_bold_center:" + cloudinaryEncode(verseRefNorm) +
    ",co_black,c_fit,w_" + TEXT_W + ",g_center,y_350" +
    "/" + CLOUDINARY_BG;

  // --- 5. Titles, descriptions and prayer script ---
  const props = PropertiesService.getScriptProperties();
  const prayerV2 = props.getProperty("PRAYER_V2_ENABLED") === "true";
  const shortPrayer = prayerV2 || !!(options && options.shortPrayer);
  const hookStyle = HOOK_STYLES[t.daysSinceStart % HOOK_STYLES.length];
  const captions = generateCaptions_(t.dow, theme, picked.ref, cleanedVerseText, hookStyle, shortPrayer);
  const hook = cleanText_(captions.hook).replace(/[|]+/g, "-");
  const prayerHook = cleanText_(captions.prayer_hook).replace(/[|]+/g, "-");
  const title = buildTitle_(captions.title_hook, picked.ref);
  const description = picked.ref + " (" + VERSE_TRANSLATION_LABEL + ")\n\n" + captions.description.trim();
  const prayerTitle = buildTitle_(captions.prayer_title_hook, picked.ref);
  const prayerDescription = captions.prayer_description.trim();

  const result = {
    date: t.dateStr,
    day_of_week: t.dow,
    weekly_theme: theme,
    verse_reference: picked.ref,
    cleaned_verse_text: cleanedVerseText,
    youtube_title: title,
    youtube_description: description,
    image_url: imageUrl,
    youtube_ok: false,
    youtube_id: "",
    youtube_url: "",
    youtube_error: "",
    ok: true,
    dry_run: dryRun,
    hook: hook,
    prayer_hook: prayerHook,
    pilot_v2: "off",
    prayer_v2: "off",
    prayer_lines: captions.prayer_lines,
    prayer_title: prayerTitle,
    prayer_description: prayerDescription,
  };
  if (dryRun) return result;

  // --- 7. Ask GitHub Actions to render and upload the verse Short ---
  // (The old version also made and downloaded a 30-second MP4 here that was
  // never used, and left a copy on Cloudinary every day. That step is gone.)
  const gh = dispatchGithub_("create_video", {
    image_url: imageUrl,
    youtube_title: title,
    youtube_description: description,
    callback_url: webAppUrl_(),
  });
  if (gh.status === 204) {
    result.youtube_ok = true;
    result.youtube_id = "pending";
    result.youtube_url = "pending";
  } else {
    result.youtube_error = "GitHub trigger failed: " + gh.status + " " + gh.body;
  }

  // --- 7b. Pilot: new-format Short, uploaded PRIVATE until you approve ---
  // Turn on with Script Property PILOT_V2_ENABLED = true
  if (PropertiesService.getScriptProperties().getProperty("PILOT_V2_ENABLED") === "true") {
    result.pilot_v2 = startPilotRender_({
      verse_ref: picked.ref,
      verse_text: cleanedVerseText,
      translation: VERSE_TRANSLATION_LABEL,
      theme: theme,
      hook: hook,
      youtube_title: buildTitle_(hook, picked.ref),
      youtube_description: description,
      day_index: t.daysSinceStart,
    });
  }

  // --- 7c. Prayer Short v2 (replaces the old prayer videos), PRIVATE until you approve ---
  // Turn on with Script Property PRAYER_V2_ENABLED = true
  if (prayerV2) {
    result.prayer_v2 = startPilotRender_(prayerRenderFields_(result, t), "create_prayer_short_v2");
  }

  // --- 8a. Prayer narration for the OLD prayer video. Done AFTER the verse
  // Shorts are started, so a problem here (e.g. Text-to-Speech or Cloudinary
  // keys) can never stop the verse Shorts. Skipped when Prayer Short v2
  // replaces the old prayer video (v2 makes its own narration in GitHub). ---
  let ttsAudioUrl = "";
  let prayerError = "";
  if (!prayerV2) {
    try {
      const maleVoices = [
        "en-US-Journey-D",
        "en-US-Neural2-D",
        "en-US-Neural2-J",
        "en-US-Studio-Q",
        "en-US-Polyglot-1",
      ];
      const audioContent = synthesizeSpeech_(
        captions.prayer_lines.join(" "),
        maleVoices[idx % maleVoices.length],
        0.85
      );
      const ttsBlob = Utilities.newBlob(Utilities.base64Decode(audioContent), "audio/mp3", "prayer_tts.mp3");
      ttsAudioUrl = cloudinaryUploadAudio_(ttsBlob, "prayer_tts_" + Math.floor(Date.now() / 1000));
    } catch (err) {
      prayerError = String(err && err.message || err);
      result.prayer_error = prayerError;
      Logger.log("Prayer narration failed (verse Shorts were still started): " + prayerError);
    }
  }

  // --- 8. Save prayer data for triggerPrayerVideo() ---
  PropertiesService.getScriptProperties().setProperties({
    prayer_lines: JSON.stringify(captions.prayer_lines),
    prayer_title: prayerTitle,
    prayer_description: prayerDescription,
    image_url: imageUrl,
    prayer_date: t.dateStr,
    tts_audio_url: ttsAudioUrl,
    prayer_error: prayerError,
  }, false); // false = keep all other properties (including the secrets)

  return result;
}

// Emails the owner when a scheduled job fails, then re-throws so the failure
// still shows in Apps Script's Executions list.
function notifyFailure_(jobName, err) {
  const message = String(err && err.message || err);
  try {
    MailApp.sendEmail(approvalEmail_(), "Daily Bible Verse: " + jobName + " failed",
      jobName + " failed at " + new Date().toISOString() + ":\n\n" + message +
      "\n\nNothing was published by this job. Details: Apps Script editor > Executions.");
  } catch (mailErr) {
    Logger.log("Could not send failure email: " + mailErr);
  }
  throw err;
}

// Time-based trigger target: verse Short, logged to the first sheet.
function triggerVerseVideo() {
  let result;
  try {
    result = run();
  } catch (err) {
    notifyFailure_("This morning's verse run", err);
  }
  if (result.youtube_error || result.prayer_error ||
      String(result.pilot_v2).indexOf("fail") === 0 || String(result.prayer_v2).indexOf("fail") === 0) {
    try {
      MailApp.sendEmail(approvalEmail_(), "Daily Bible Verse: part of this morning's run had a problem",
        "Verse Short: " + (result.youtube_error || "started") +
        "\nVerse pilot: " + result.pilot_v2 + "\nPrayer pilot: " + result.prayer_v2 +
        "\nOld prayer narration: " + (result.prayer_error || "ok"));
    } catch (mailErr) { Logger.log("Could not send warning email: " + mailErr); }
  }
  const sheet = SpreadsheetApp.openById("1hRghd60KKQ5oAd6hqBC4B2RCEn1bRFQuaGXWX2qxe6Y").getSheets()[0];
  sheet.appendRow([
    result.date,
    result.day_of_week,
    result.weekly_theme,
    result.verse_reference,
    result.cleaned_verse_text,
    result.youtube_description,
    result.youtube_title,
    result.youtube_ok,
    result.youtube_id,
    result.youtube_url,
    result.youtube_error,
  ]);
}

// Safe test: run this from the editor. Nothing is uploaded or published.
// Check the result under View > Logs (or Executions).
function testDryRun() {
  const result = run({ dryRun: true });
  Logger.log(JSON.stringify(result, null, 2));
}

// Checks that every required Script Property is set. Run once after setup.
function checkSetup() {
  const props = PropertiesService.getScriptProperties();
  const missing = REQUIRED_SECRETS.filter(function (k) { return !props.getProperty(k); });
  Logger.log(missing.length ? "MISSING Script Properties: " + missing.join(", ") : "All Script Properties are set.");
  const url = props.getProperty("WEBAPP_URL") || "";
  if (!/\/exec$/.test(url)) {
    Logger.log("WEBAPP_URL is " + (url ? "not an /exec address: " + url : "not set") +
      ". Set it to the Web app URL from Deploy > Manage deployments (it ends in /exec). " +
      "The pilot's approval emails need it.");
  } else {
    Logger.log("WEBAPP_URL looks right: " + url);
  }
}

// ============================================================
// Prayer video (runs after the verse job, e.g. 6:30am)
// ============================================================

function triggerPrayerVideo() {
  if (PropertiesService.getScriptProperties().getProperty("PRAYER_V2_ENABLED") === "true") {
    Logger.log("Old prayer video skipped: replaced by Prayer Short v2 (started from the 6:00 run).");
    return;
  }
  const props = PropertiesService.getScriptProperties().getProperties();

  // Only run if the verse job produced prayer data today.
  const today = today_().dateStr;
  if (props.prayer_date !== today) {
    notifyFailure_("The prayer video", new Error("No prayer data for today (" + today + "); the morning verse run " +
      "probably failed. Last prayer data: " + props.prayer_date));
  }
  if (!props.prayer_lines || !props.prayer_title) {
    notifyFailure_("The prayer video", new Error("No prayer data found. Make sure the verse job ran first."));
  }
  if (!props.tts_audio_url) {
    notifyFailure_("The prayer video", new Error("This morning's prayer narration failed, so there is no prayer video today: " +
      (props.prayer_error || "unknown error")));
  }

  const gh = dispatchGithub_("create_prayer_video", {
    image_url: props.image_url,
    clean_bg_url: CLOUDINARY_PRAYER_BG,
    prayer_lines: props.prayer_lines,
    prayer_title: props.prayer_title,
    prayer_description: props.prayer_description,
    tts_audio_url: props.tts_audio_url,
    callback_url: webAppUrl_(),
  });
  if (gh.status !== 204) {
    throw new Error("Prayer GitHub trigger failed: " + gh.status + " " + gh.body);
  }
  Logger.log("Prayer video workflow triggered successfully");
}

// ============================================================
// Read the Bible in One Year
// ============================================================

// Reads one or more whole chapters ("3" or "1-2") of a book.
function fetchChapters_(book, chapterRange) {
  const parts = String(chapterRange).split("-");
  const startChapter = parseInt(parts[0], 10);
  const endChapter = parts.length > 1 ? parseInt(parts[1], 10) : startChapter;
  const verses = [];
  for (let ch = startChapter; ch <= endChapter; ch++) {
    verses.push.apply(verses, fetchPassageVerses_(book + " " + ch));
  }
  return verses;
}

// Returns [{ref, text}] for any reference bible-api.com understands.
function fetchPassageVerses_(reference) {
  const data = fetchBibleApi_(reference, READING_TRANSLATION);
  const verses = (data.verses || [])
    .map(function (v) {
      return { ref: v.book_name + " " + v.chapter + ":" + v.verse, text: cleanText_(v.text) };
    })
    .filter(function (v) { return v.text; });
  if (!verses.length) throw new Error("No verses returned for " + reference);
  Utilities.sleep(2000); // be gentle with the free API
  return verses;
}

function triggerBibleReadingVideo() {
  // --- 1. Today's reading day ---
  // Day N = days since Jan 1. This matches the numbering already published
  // (Day 327 went out on Nov 24, 2026), so the series stays in sequence.
  const t = today_();
  const day = t.daysSinceStart;
  if (day < 1 || day > READING_PLAN_DAYS) {
    Logger.log("Reading plan complete or not started yet. Day: " + day);
    return;
  }

  // --- 2. Load the reading plan from GitHub ---
  const planResp = UrlFetchApp.fetch(
    "https://api.github.com/repos/" + GITHUB_REPO + "/contents/data/reading_plan.json",
    {
      headers: {
        Authorization: "Bearer " + secret_("GITHUB_TOKEN"),
        Accept: "application/vnd.github.v3.raw",
      },
      muteHttpExceptions: true,
    }
  );
  if (planResp.getResponseCode() !== 200) {
    throw new Error("Could not load reading plan: " + planResp.getResponseCode());
  }
  const plan = JSON.parse(planResp.getContentText());
  const todayReading = plan.find(function (p) { return p.day === day; });
  if (!todayReading) throw new Error("No reading found for day: " + day);

  const book = todayReading.book;
  const chapters = todayReading.chapters;
  const psalm = todayReading.psalm;

  // --- 3. Fetch the text (public-domain translation) ---
  const mainVerses = fetchChapters_(book, chapters);
  const mainText = mainVerses.map(function (v) { return v.text; }).join(" ");

  // A psalm entry is either a number (whole psalm) or "119:1-48" (a portion).
  // The old version read the whole psalm even when only a portion was planned.
  const psalmRef = String(psalm);
  const psalmLabel = "Psalm " + psalmRef;
  const psalmVerses = fetchPassageVerses_("Psalms " + psalmRef);
  const psalmText = psalmVerses.map(function (v) { return v.text; }).join(" ");

  const allVerses = mainVerses.concat(psalmVerses);

  // --- 4. Narration text ---
  const intro = "Read the Bible in One Year. Day " + day + " of " + READING_PLAN_DAYS + ". " +
    t.monthDay + ". " + book + " chapters " + chapters + ". And " + psalmLabel + ".";
  const fullNarration = intro + "\n\n" +
    book + " " + chapters + ".\n\n" + mainText + "\n\n" +
    psalmLabel + ".\n\n" + psalmText;
  Logger.log("Narration length: " + fullNarration.length + " characters");

  // --- 5. Text-to-speech in chunks (API limit is about 5,000 bytes per call) ---
  function chunkText(text, maxChars) {
    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let current = "";
    for (const sentence of sentences) {
      if ((current + " " + sentence).length > maxChars) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current = current ? current + " " + sentence : sentence;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks;
  }

  const chunks = chunkText(fullNarration, 4500);
  const combinedBytes = [];
  for (let i = 0; i < chunks.length; i++) {
    Logger.log("Synthesizing chunk " + (i + 1) + " of " + chunks.length);
    const bytes = Utilities.base64Decode(synthesizeSpeech_(chunks[i], "en-US-Studio-Q", 0.9));
    for (const b of bytes) combinedBytes.push(b);
    Utilities.sleep(1000);
  }
  const audioUrl = cloudinaryUploadAudio_(
    Utilities.newBlob(combinedBytes, "audio/mp3", "bible_reading.mp3"),
    "bible_reading_" + Math.floor(Date.now() / 1000)
  );

  // --- 6. Title and description ---
  const videoTitle = "Day " + day + " | " + book + " " + chapters + " & " + psalmLabel +
    " | Read the Bible in One Year";
  const videoDescription = "Day " + day + " of " + READING_PLAN_DAYS + " | " + t.monthDay + "\n\n" +
    "Today's reading: " + book + " chapters " + chapters + " and " + psalmLabel + ".\n\n" +
    "Join us as we read through the entire Bible in one year together. " +
    "Each day we read a passage from the Old or New Testament plus a Psalm.\n\n" +
    READING_ATTRIBUTION + "\n\n" +
    "#ReadTheBibleInOneYear #DailyBibleReading #Bible #" + book.replace(/\s/g, "") +
    " #BibleStudy #ChristianContent";

  // --- 7. Ask GitHub Actions to render and upload ---
  const gh = dispatchGithub_("create_bible_reading_video", {
    tts_audio_url: audioUrl,
    video_title: videoTitle,
    video_description: videoDescription,
    book: book,
    chapters: chapters,
    psalm_label: psalmLabel,
    day_number: day,
    month_day: t.monthDay,
    verses: JSON.stringify(allVerses),
    callback_url: webAppUrl_(),
  });
  if (gh.status !== 204) {
    throw new Error("GitHub trigger failed: " + gh.status + " " + gh.body);
  }
  Logger.log("Bible reading video workflow triggered for Day " + day);
}

// ============================================================
// Pilot: Verse Short v2 approval loop
//
// 1. run() starts a render in GitHub Actions (event create_verse_short_v2)
//    with a one-time callback code.
// 2. GitHub uploads the Short to YouTube as PRIVATE and POSTs back (doPost).
// 3. This script emails you a preview with Approve / Reject links.
// 4. Approve dispatches publish_verse_short_v2: YouTube public, then
//    Instagram and Facebook. Reject (or doing nothing) leaves it private.
//
// Script Properties used: PILOT_V2_ENABLED ("true" to turn on),
// APPROVAL_EMAIL (optional; defaults to the script owner's address).
// ============================================================

function startPilotRender_(fields, eventType) {
  eventType = eventType || "create_verse_short_v2";
  const props = PropertiesService.getScriptProperties();
  if (!/\/exec$/.test(webAppUrl_())) {
    Logger.log("Pilot not started: set Script Property WEBAPP_URL to the /exec Web app URL " +
      "(Deploy > Manage deployments). Current: " + webAppUrl_());
    return "not started: WEBAPP_URL missing";
  }
  const code = Utilities.getUuid();
  props.setProperty("v2cb_" + code, JSON.stringify({ created: Date.now(), verse_ref: fields.verse_ref, event: eventType }));
  const payload = Object.assign({}, fields, {
    callback_url: webAppUrl_(),
    callback_code: code,
  });
  const gh = dispatchGithub_(eventType, payload);
  if (gh.status !== 204) {
    props.deleteProperty("v2cb_" + code);
    Logger.log("Pilot dispatch failed: " + gh.status + " " + gh.body);
    return "failed: " + gh.status;
  }
  return "started";
}

function approvalEmail_() {
  return PropertiesService.getScriptProperties().getProperty("APPROVAL_EMAIL") ||
    Session.getEffectiveUser().getEmail();
}

function htmlEsc_(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sendApprovalEmail_(approveId, r) {
  const base = webAppUrl_();
  const approveUrl = base + "?action=approve&id=" + encodeURIComponent(approveId);
  const rejectUrl = base + "?action=reject&id=" + encodeURIComponent(approveId);
  const watchUrl = "https://www.youtube.com/shorts/" + encodeURIComponent(r.youtube_id);
  const studioUrl = "https://studio.youtube.com/video/" + encodeURIComponent(r.youtube_id) + "/edit";
  const html =
    "<div style='font-family:Arial,sans-serif;max-width:560px'>" +
    "<h2 style='margin:0 0 8px'>Today's new-format " + (r.format === "prayer" ? "prayer" : "verse") +
    " Short is ready</h2>" +
    "<p style='margin:0 0 4px'><b>Hook:</b> " + htmlEsc_(r.hook) + "</p>" +
    "<p style='margin:0 0 4px'><b>Title:</b> " + htmlEsc_(r.title) + "</p>" +
    "<p style='margin:0 0 4px'><b>Verse:</b> " + htmlEsc_(r.verse_ref) +
    " &nbsp; <b>Look:</b> " + htmlEsc_(r.template) + "</p>" +
    "<p style='margin:16px 0'><a href='" + watchUrl + "'>Watch the private preview</a>" +
    " (sign in as the channel) &nbsp;|&nbsp; <a href='" + studioUrl + "'>Open in YouTube Studio</a></p>" +
    "<p style='margin:20px 0'>" +
    "<a href='" + approveUrl + "' style='background:#1a7f37;color:#fff;padding:12px 22px;" +
    "border-radius:6px;text-decoration:none;font-weight:bold'>Approve and publish</a>" +
    " &nbsp; <a href='" + rejectUrl + "' style='color:#b42318'>Reject</a></p>" +
    "<p style='color:#666;font-size:13px'>Approving makes it public on YouTube, then posts it to " +
    "Instagram and Facebook. If you do nothing, it stays private.</p></div>";
  MailApp.sendEmail({
    to: approvalEmail_(),
    subject: "Approve today's " + (r.format === "prayer" ? "prayer" : "verse") + " Short: " + r.title,
    htmlBody: html,
    body: "Hook: " + r.hook + "\nTitle: " + r.title + "\nPreview: " + watchUrl +
      "\nApprove: " + approveUrl + "\nReject: " + rejectUrl,
  });
}

function pilotPage_(title, message) {
  return HtmlService.createHtmlOutput(
    "<div style='font-family:Arial,sans-serif;max-width:520px;margin:40px auto;padding:0 16px'>" +
    "<h2>" + htmlEsc_(title) + "</h2>" + message + "</div>"
  ).setTitle(title);
}

// Approval links. Approve shows a confirmation button first, so that email
// security scanners that "click" links cannot approve by accident.
function handleApprovalLink_(params) {
  const props = PropertiesService.getScriptProperties();
  const key = "v2ap_" + String(params.id || "");
  const raw = params.id ? props.getProperty(key) : null;
  if (!raw) return pilotPage_("Link expired", "<p>This approval link is no longer valid.</p>");
  const r = JSON.parse(raw);

  if (r.status !== "pending") {
    return pilotPage_("Already " + r.status, "<p>" + htmlEsc_(r.title) + " was already " + htmlEsc_(r.status) + ".</p>");
  }

  if (params.action === "reject") {
    r.status = "rejected";
    props.setProperty(key, JSON.stringify(r));
    return pilotPage_("Rejected", "<p>" + htmlEsc_(r.title) + " stays private. You can delete it in YouTube Studio.</p>");
  }

  if (params.confirm !== "1") {
    const confirmUrl = webAppUrl_() + "?action=approve&confirm=1&id=" + encodeURIComponent(params.id);
    return pilotPage_("Publish this Short?",
      "<p><b>" + htmlEsc_(r.title) + "</b></p>" +
      "<p><a href='" + confirmUrl + "' target='_top' style='background:#1a7f37;color:#fff;padding:12px 22px;" +
      "border-radius:6px;text-decoration:none;font-weight:bold'>Yes, publish it</a></p>");
  }

  // One approval at a time, so a double tap (or two copies of the email)
  // cannot start two publish runs.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return pilotPage_("Busy", "<p>Another approval is being processed. Try the link again in a moment.</p>");
  }
  try {
    const fresh = JSON.parse(props.getProperty(key) || "{}");
    if (fresh.status && fresh.status !== "pending") {
      return pilotPage_("Already " + fresh.status,
        "<p>" + htmlEsc_(fresh.title) + " was already " + htmlEsc_(fresh.status) + ".</p>");
    }
    const gh = dispatchGithub_("publish_verse_short_v2", {
      youtube_id: r.youtube_id,
      video_url: r.video_url,
      title: r.title,
      description: r.description,
    });
    if (gh.status !== 204) {
      return pilotPage_("Could not publish", "<p>GitHub returned " + gh.status + ". Try the link again later.</p>");
    }
    r.status = "approved";
    props.setProperty(key, JSON.stringify(r));
    return pilotPage_("Approved", "<p>" + htmlEsc_(r.title) +
      " will be public on YouTube within a few minutes, then posted to Instagram and Facebook.</p>");
  } finally {
    lock.releaseLock();
  }
}

// Removes pilot records older than 14 days (Script Properties have a size limit).
function cleanupPilotRecords_() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const cutoff = Date.now() - 14 * 86400000;
  Object.keys(all).forEach(function (k) {
    if (k.indexOf("v2ap_") !== 0 && k.indexOf("v2cb_") !== 0) return;
    try {
      if ((JSON.parse(all[k]).created || 0) < cutoff) props.deleteProperty(k);
    } catch (e) { props.deleteProperty(k); }
  });
}

// Run once from the editor: grants email permission and sends a test email.
function testPilotEmail() {
  MailApp.sendEmail(approvalEmail_(), "Daily Bible Verse: approval emails work",
    "This is a test. Pilot approval emails will arrive at this address.");
  Logger.log("Test email sent to " + approvalEmail_());
}

// Run from the editor to try the whole pilot loop without touching the
// current daily videos: makes captions (dry run), starts the pilot render,
// and you get the approval email when it is uploaded (still private).
function testPilotRender() {
  const r = run({ dryRun: true });
  const status = startPilotRender_({
    verse_ref: r.verse_reference,
    verse_text: r.cleaned_verse_text,
    translation: VERSE_TRANSLATION_LABEL,
    theme: r.weekly_theme,
    hook: r.hook,
    youtube_title: buildTitle_(r.hook, r.verse_reference),
    youtube_description: r.youtube_description,
    day_index: today_().daysSinceStart,
  });
  Logger.log("Pilot render: " + status + " (hook: " + r.hook + ")");
}

// Joins prayer display lines into one text. A line that continues the
// previous sentence starts in lowercase (Claude often capitalizes every line),
// except for "I" and words for God.
const KEEP_CAPITALIZED = ["I", "I'm", "I've", "I'll", "I'd", "God", "Lord", "Jesus", "Christ", "Father",
  "Spirit", "Holy", "You", "Your", "Yours", "Yourself", "He", "His", "Him", "Amen"];

function joinPrayerLines_(lines) {
  const out = [];
  (lines || []).forEach(function (raw, i) {
    let line = cleanText_(raw);
    if (!line) return;
    const prev = out.length ? out[out.length - 1] : "";
    const continues = i > 0 && prev && !/[.!?]["')\]]?$/.test(prev);
    if (continues) {
      const first = line.split(/\s+/)[0].replace(/[^A-Za-z']/g, "");
      if (KEEP_CAPITALIZED.indexOf(first) === -1) line = line.charAt(0).toLowerCase() + line.slice(1);
    }
    out.push(line);
  });
  return out.join(" ").replace(/\s+([,.;:!?])/g, "$1");
}

// Fields for the Prayer Short v2 render (max 10 top-level fields with the callback ones).
function prayerRenderFields_(r, t) {
  return {
    verse_ref: r.verse_reference,
    prayer_text: joinPrayerLines_(r.prayer_lines),
    theme: r.weekly_theme,
    hook: r.prayer_hook,
    youtube_title: r.prayer_title,
    youtube_description: "A prayer inspired by " + r.verse_reference + " (" + VERSE_TRANSLATION_LABEL + ")\n\n" +
      r.prayer_description,
    day_index: t.daysSinceStart,
  };
}

// Run from the editor to try the prayer Short loop: writes a short prayer
// (dry run, nothing else published), starts the Prayer Short v2 render, and
// you get the approval email when it is uploaded (still private).
function testPrayerRender() {
  const r = run({ dryRun: true, shortPrayer: true });
  const status = startPilotRender_(prayerRenderFields_(r, today_()), "create_prayer_short_v2");
  Logger.log("Prayer render: " + status + " (hook: " + r.prayer_hook + ", " + r.prayer_lines.length + " lines)");
}

// Run from the editor if an approval email went missing: re-sends the email
// for the newest video still waiting for approval, and logs what it found.
function resendLatestApproval() {
  const props = PropertiesService.getScriptProperties();
  Logger.log("Last notice from GitHub: " + (props.getProperty("last_callback") || "none recorded yet"));
  const all = props.getProperties();
  let newestId = null, newest = null;
  Object.keys(all).forEach(function (k) {
    if (k.indexOf("v2ap_") !== 0) return;
    try {
      const r = JSON.parse(all[k]);
      if (r.status === "pending" && (!newest || r.created > newest.created)) { newest = r; newestId = k.slice(5); }
    } catch (e) { /* skip */ }
  });
  if (!newest) {
    Logger.log("No video is waiting for approval. If GitHub uploaded one, its notice was not accepted: " +
      "check that the latest code is deployed as a new version.");
    return;
  }
  sendApprovalEmail_(newestId, newest);
  Logger.log("Re-sent approval email for " + newest.title + " (" + newest.format + ") to " + approvalEmail_());
}
