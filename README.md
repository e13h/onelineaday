## Requirements

Purpose: a "one line a day" journaling app that helps me jot down a few sentences about each day and reminisce about "on this day" entries of today in previous years.

Requirements:

1. Simple, clutter free "today" view landing page with a prompt containing today's date and textbox for entering the journal entry.
2. A swipe/scroll down gesture reveals a simple list of "on this day" entries of this month and day recorded in previous years
3. A swipe/scroll left/right gesture reveals the same interface but for the previous or next month and day (swipe/scroll right for previous day, swipe/scroll left for next day)
4. Gestures should work on both desktop (scroll) and mobile (swipe). If gestures conflict, vertical scrolling reveals ‘on this day’ entries and horizontal gestures change the date.
5. No authentication, accounts, or multi-user support. Single-user, trusted-network app.
6. Data import/export must support this simple schema: a JSON file containing an array of objects where each object has 2 keys: `date` where the value is a string in ISO 8601 (YYYY-MM-DD) format and `message` where the value is a string containing that date's journal entry.
7. Data must be stored locally on the server in a lightweight and easy to backup format (e.g. SQLite). No external or hosted services.
8. Application supports “local-first” usage and does not require a connection to the server in order to type in journal entries or view cached journal entries. If the server is unreachable, modifications and entries will be cached in the user’s application and can be synced to the server later.
    1. Conflict resolution is not required; last-write-wins is acceptable.
9. The "start date" for the journal is the earliest entry provided via data import. If no data has been imported, the start date is today's date.
10. Catchup-reminder: a small push notification-style badge appears on the side of the screen with a count of the number of days missing a journal entry before or after the current day to nudge the user to fill in missing days. The badge updates live as the user swipes to different dates and fills in missing entries. If the number of catchup days is 0, no notification badge is shown. The number of days to show in the catchup reminder is as follows:
    1. The "previous days" count (displayed on the left side of the screen) is calculated as the number of days without journal entries between the start date and the current date in view.
    2. The "next days" count (displayed on the right side of the screen) is calculated as the number of days without journal entries between the current date in view and today's date.
11. If the user is viewing a date other than today’s date, a “Go to Today” button appears to quickly jump back to today
12. The user does not need to click any “edit” button on days that do not have a journal entry submitted yet. The user can simply begin typing in the text box and the text is auto saved. Some visual indicator informs the user that the autosave is complete.  Once the user navigates away from the entry that was just entered, future edits will require clicking the “edit” button first.
13. Once an entry exists for a date and the user is not currently editing the text for that journal entry, it is read-only until the user clicks ‘Edit’.
14. Dates are interpreted in the server’s local time zone.
15. Information needs to be readable on desktop and mobile platforms.

Out of scope: search, tags, rich text, images, AI features, accounts, encryption, or analytics.
