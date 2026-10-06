# ivelt Eretz Yisroel Time

ivelt is an American forum, so every post date on it is in New York time. If you live in Eretz Yisroel, that means doing the math in your head every time you want to know when something was actually posted.

This little Chrome/Edge extension does the math for you. Dates on the forum just show up in Eretz Yisroel time, in month/day/year order, like `10/06/2025 22:15`.

This is a beta, so if something looks off, please open an issue.

## What it does

- Converts post dates, last-post dates in topic lists, and the "All times are..." note at the bottom of the page.
- Takes daylight saving into account on both sides. For a few weeks a year the gap is 6 or 8 hours instead of 7, and that comes out right too.
- Works with English, Yiddish and Hebrew month names, and with "Today" / "Yesterday".
- Leaves what people wrote alone: post text, quotes, signatures and code blocks are never touched.
- Adds nothing to the forum page. No buttons, no popups, no hover tooltips. The dates are just correct.

## Settings

Click the extension icon in the toolbar. You can change:

- the forum's time zone (New York by default)
- the time zone to show dates in (Eretz Yisroel by default)
- how the date looks: with the day of the week, date and time, time first, or 12-hour with AM/PM

Changes save on their own and show up right away in any open forum tab.

## Install

1. Download the zip from the [latest release](../../releases) and unzip it, or clone this repo.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on Developer mode.
4. Click "Load unpacked" and pick the folder.

## Good to know

- If you have a forum account and already set your time zone to Eretz Yisroel in the forum's own settings, you don't need this extension. Using both would shift the time twice.
- Dates written with slashes are read the American way (month/day/year).

## License

MIT
