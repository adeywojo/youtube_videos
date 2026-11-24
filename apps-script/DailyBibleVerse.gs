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
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) {
    throw new Error(
      "Missing Script Property: " + name +
      ". Add it in the Apps Script editor under Project Settings > Script Properties."
    );
  }
  return value;
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

const CAPTIONS_SCHEMA = {
  type: "object",
  properties: {
    title_hook: { type: "string" },
    description: { type: "string" },
    prayer_lines: { type: "array", items: { type: "string" } },
    prayer_title_hook: { type: "string" },
    prayer_description: { type: "string" },
  },
  required: ["title_hook", "description", "prayer_lines", "prayer_title_hook", "prayer_description"],
  additionalProperties: false,
};

function buildCaptionsPrompt_(dow, theme, verseRef, verseText) {
  return (
    "You are a Christian content writer for a Daily Bible Verse YouTube channel.\n\n" +
    "Inputs:\n" +
    "- Day: " + dow + "\n" +
    "- Theme: " + theme + "\n" +
    "- Verse Reference: " + verseRef + "\n" +
    "- Verse Text: " + verseText + "\n\n" +
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
    "- Target 18-22 lines total (for a 2-3 minute video)\n" +
    "- Each line must end at a natural pause or breath point\n" +
    "- Start with an intimate opening like 'Lord, we come to You today' or 'Father, just to be in Your presence'\n" +
    "- End with 'In Jesus name, Amen'\n" +
    "- No emojis, no rhyming, no formal 'thee' or 'thou' language\n" +
    "- Do not mention chapter:verse numbers in the prayer\n\n" +
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
function generateCaptions_(dow, theme, verseRef, verseText) {
  const prompt = buildCaptionsPrompt_(dow, theme, verseRef, verseText);
  let lastProblem = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const c = callClaudeForCaptions_(prompt);
    if (!c.prayer_lines || !c.prayer_lines.length) {
      lastProblem = "empty prayer_lines";
      continue;
    }
    const wrong = findWrongReferences_(
      [c.title_hook, c.description, c.prayer_title_hook, c.prayer_description,
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
// Web app entry point (protected by WEBAPP_TOKEN)
// Call as: <web app URL>?token=<WEBAPP_TOKEN>
// ============================================================

function doGet(e) {
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
  const captions = generateCaptions_(t.dow, theme, picked.ref, cleanedVerseText);
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
    prayer_lines: captions.prayer_lines,
    prayer_title: prayerTitle,
    prayer_description: prayerDescription,
  };
  if (dryRun) return result;

  // --- 6. Prayer narration audio (used by the prayer video later) ---
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
  const ttsAudioUrl = cloudinaryUploadAudio_(ttsBlob, "prayer_tts_" + Math.floor(Date.now() / 1000));

  // --- 7. Ask GitHub Actions to render and upload the verse Short ---
  // (The old version also made and downloaded a 30-second MP4 here that was
  // never used, and left a copy on Cloudinary every day. That step is gone.)
  const gh = dispatchGithub_("create_video", {
    image_url: imageUrl,
    youtube_title: title,
    youtube_description: description,
    callback_url: ScriptApp.getService().getUrl(),
  });
  if (gh.status === 204) {
    result.youtube_ok = true;
    result.youtube_id = "pending";
    result.youtube_url = "pending";
  } else {
    result.youtube_error = "GitHub trigger failed: " + gh.status + " " + gh.body;
  }

  // --- 8. Save prayer data for triggerPrayerVideo() ---
  PropertiesService.getScriptProperties().setProperties({
    prayer_lines: JSON.stringify(captions.prayer_lines),
    prayer_title: prayerTitle,
    prayer_description: prayerDescription,
    image_url: imageUrl,
    prayer_date: t.dateStr,
    tts_audio_url: ttsAudioUrl,
  }, false); // false = keep all other properties (including the secrets)

  return result;
}

// Time-based trigger target: verse Short, logged to the first sheet.
function triggerVerseVideo() {
  const result = run();
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
}

// ============================================================
// Prayer video (runs after the verse job, e.g. 6:30am)
// ============================================================

function triggerPrayerVideo() {
  const props = PropertiesService.getScriptProperties().getProperties();

  // Only run if the verse job produced prayer data today.
  const today = today_().dateStr;
  if (props.prayer_date !== today) {
    throw new Error("Prayer data is stale or missing. Expected date: " + today + ", found: " + props.prayer_date);
  }
  if (!props.prayer_lines || !props.prayer_title) {
    throw new Error("No prayer data found. Make sure the verse job ran first.");
  }

  const gh = dispatchGithub_("create_prayer_video", {
    image_url: props.image_url,
    clean_bg_url: CLOUDINARY_PRAYER_BG,
    prayer_lines: props.prayer_lines,
    prayer_title: props.prayer_title,
    prayer_description: props.prayer_description,
    tts_audio_url: props.tts_audio_url,
    callback_url: ScriptApp.getService().getUrl(),
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
    callback_url: ScriptApp.getService().getUrl(),
  });
  if (gh.status !== 204) {
    throw new Error("GitHub trigger failed: " + gh.status + " " + gh.body);
  }
  Logger.log("Bible reading video workflow triggered for Day " + day);
}
