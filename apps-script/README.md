# Daily Bible Verse: Apps Script

`DailyBibleVerse.gs` is the Google Apps Script that prepares the daily videos for
the Daily Bible Verse channel. It picks the verse, writes titles and the prayer
with Claude, makes narration audio, and then asks GitHub Actions in
`adeywojo/Daily_Bible_Verse_Automation` to render and upload the videos.

**No keys or passwords are stored in this file.** They live in the script's
Script Properties, so the code can be shared and kept in GitHub safely.

## One-time setup

### 1. Rotate the old keys

The previous version had keys written into the code, so treat them as exposed.
Revoke each one and create a new one:

| Script Property | Where to create it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com > API Keys |
| `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` | Cloudinary console > Settings > API Keys (create a new pair, then delete the old one) |
| `GOOGLE_TTS_API_KEY` | Google Cloud console > APIs & Services > Credentials. Restrict it to the Text-to-Speech API. |
| `GITHUB_TOKEN` | github.com > Settings > Developer settings > Fine-grained tokens. Limit it to the `Daily_Bible_Verse_Automation` repo only. |
| `WEBAPP_TOKEN` | Not from any service. Make up a long random string (30+ letters and numbers). |

The old API.Bible key is no longer used, so just revoke it.

For the GitHub token, I believe sending dispatch events needs the repository
permission **Contents: Read and write**, and reading `reading_plan.json` needs
read access. Please check GitHub's docs if the dispatch returns 403.

### 2. Add the Script Properties

In the Apps Script editor: **Project Settings** (gear icon) > **Script Properties**
> **Add script property**. Add each name from the table above with its new value.

Then run `checkSetup` from the editor and check **Execution log**. It lists any
property that's missing.

### 3. Paste the new code

Replace the code in the editor with `DailyBibleVerse.gs` and save.

### 4. Test without publishing

Run `testDryRun`. It fetches today's verse and asks Claude for titles, then logs
the result. It does **not** make audio, upload anything, or start GitHub Actions.

Do not run `run`, `triggerVerseVideo`, `triggerPrayerVideo` or
`triggerBibleReadingVideo` to test: those publish real videos.

### 5. Update the web app deployment

Web apps keep running the old version until you publish a new one:
**Deploy > Manage deployments > (pencil icon) > Version: New version > Deploy**.
The URL stays the same.

The web app now requires the token. Anything that calls the URL (for example
the Make.com "YouTube - Daily Bible Verse" scenario) must add it:

```
https://script.google.com/macros/s/<deployment id>/exec?token=<WEBAPP_TOKEN>
```

Time-based triggers inside Apps Script are not affected.

## What changed from the previous version

- **Keys moved out of the code** into Script Properties.
- **The web app checks a token.** Before, anyone with the link could run the
  whole pipeline, spending money and publishing an extra video.
- **Bible references in titles can't be wrong any more.** Claude writes only the
  catchy part of each title; the code adds the reference. If Claude writes any
  other chapter:verse anywhere in the text, the captions are regenerated, and
  after 3 failed tries nothing is published. (This caused "Philippians 4:6" on a
  Philippians 1:6 video.)
- **Claude returns guaranteed JSON** (structured outputs), replacing the
  manual clean-up of the response.
- **Removed a step that did nothing:** each run made a 30-second MP4 on
  Cloudinary, waited 10 seconds, downloaded it and never used it, leaving a new
  file on Cloudinary every day.
- **Bible in One Year now uses the World English Bible** (public domain) instead
  of the NIV, which needs a license from Biblica for audio/video readings. Set
  `READING_TRANSLATION = "kjv"` to use the KJV instead. Past NIV videos are
  unchanged.
- **Partial psalms are read correctly.** A plan entry like `119:1-48` used to
  read all of Psalm 119.
- **One timezone for all dates** (`America/Edmonton`), calculated so daylight
  saving can't shift a day. The day numbers match the videos already published
  (Day 327 on Nov 24, 2026; Matthew 21:22 that day).
- **Safe test mode** (`testDryRun`) and a setup check (`checkSetup`).

## Not changed (worth deciding later)

- The verse list has 89 entries, so verses repeat every 89 days.
- The day-of-week theme and the verse are chosen separately, so they don't
  always fit each other.
- Narration audio files (prayer and Bible reading) still accumulate on Cloudinary.

## Not tested against the live services

The logic was tested offline with stand-ins for Google's services. Calls to
bible-api.com's World English Bible text, Cloudinary, Text-to-Speech and GitHub
have not been run from this new code, so run `testDryRun` first and watch the
first real day's executions.
