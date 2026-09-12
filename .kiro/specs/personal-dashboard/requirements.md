# Requirements Document

## Introduction

The Personal Dashboard is a standalone client-side web application built for the RevoU Coding Camp mini project. It provides a focused, minimal productivity hub accessible from any modern browser. The app combines a live clock and contextual greeting, a customisable Pomodoro focus timer, a persistent to-do list, and a quick-links panel. All user data is persisted via the Browser Local Storage API — no server or network connection is needed. Three optional challenges are included: a light/dark mode toggle, a custom user name in the greeting, and user-adjustable Pomodoro duration.

The application is delivered as a single HTML entry point (`mini-project.html`) with one companion CSS file (`css/style.css`) and one companion JavaScript file (`js/app.js`).

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **App**: Synonym for Dashboard.
- **Greeting_Widget**: The UI section that displays the current time, date, and a personalised greeting message.
- **Timer**: The Pomodoro-style countdown timer widget.
- **Todo_List**: The widget that manages the user's task items.
- **Task**: A single to-do item stored in the Todo_List.
- **Quick_Links**: The widget that displays user-defined shortcut buttons to external URLs.
- **Link**: A single Quick_Links entry consisting of a label and a URL.
- **Local_Storage**: The browser's `window.localStorage` API used for client-side persistence.
- **Theme**: The visual colour scheme of the Dashboard, either "light" or "dark".
- **Username**: The user-provided name displayed in the Greeting_Widget.
- **Pomodoro_Duration**: The countdown length (in minutes) configured for the Timer.
- **Session**: A single countdown run of the Timer from start to zero.

---

## Requirements

### Requirement 1: Live Clock and Date Display

**User Story:** As a user, I want to see the current time and date at a glance, so that I can stay oriented throughout my work session.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current local time in HH:MM:SS format.
2. WHEN the system clock advances by one second, THE Greeting_Widget SHALL update the displayed time without a page reload.
3. THE Greeting_Widget SHALL display the current local date in a format that includes the full weekday name, full month name, numeric day, and 4-digit year (e.g., Monday, 12 September 2026).
4. IF the system clock becomes unavailable or returns an invalid value, THEN THE Greeting_Widget SHALL display the last valid time value until a valid value is available again.

---

### Requirement 2: Time-of-Day Greeting

**User Story:** As a user, I want to receive a greeting that reflects the time of day, so that the Dashboard feels personal and context-aware.

#### Acceptance Criteria

1. WHEN the browser-reported local hour is between 05:00 and 11:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good Morning".
2. WHEN the browser-reported local hour is between 12:00 and 17:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good Afternoon".
3. WHEN the browser-reported local hour is between 18:00 and 21:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good Evening".
4. WHEN the browser-reported local hour is between 22:00 and 23:59 inclusive, or between 00:00 and 04:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good Night".
5. WHEN the App loads, THE Greeting_Widget SHALL evaluate the current hour and display the appropriate greeting immediately with no blank or placeholder state shown.
6. IF the browser cannot determine the local time, THEN THE Greeting_Widget SHALL display the greeting "Hello" as a fallback.

---

### Requirement 3: Custom Username in Greeting

**User Story:** As a user, I want to enter my name so that the greeting addresses me personally.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL provide an input field that allows the user to enter a Username of up to 50 characters.
2. WHEN the user submits a non-empty, non-whitespace-only Username, THE Greeting_Widget SHALL trim leading and trailing whitespace and append the trimmed Username to the greeting message (e.g., "Good Morning, Alex").
3. WHEN the user submits a non-empty Username, THE App SHALL persist the trimmed Username to Local_Storage under the key `pd_username`.
4. WHEN the App loads and Local_Storage contains a previously saved Username under `pd_username`, THE Greeting_Widget SHALL populate the input field with the saved value and display the greeting with the saved Username without requiring re-entry.
5. IF the user submits an empty string or a whitespace-only string as the Username, THEN THE Greeting_Widget SHALL clear the saved Username from Local_Storage, display the greeting without a name suffix, and clear the input field.

---

### Requirement 4: Focus Timer — Core Countdown

**User Story:** As a user, I want a Pomodoro countdown timer, so that I can time my focused work sessions.

#### Acceptance Criteria

1. THE Timer SHALL display the remaining time in MM:SS format.
2. WHEN the App loads and no active Session exists, THE Timer SHALL display the configured Pomodoro_Duration with zero elapsed seconds.
3. WHEN the user activates the Start control and no Session is currently running, THE Timer SHALL begin counting down one second per real-world second.
4. WHILE a Session is running, THE Timer SHALL update the displayed remaining time each second.
5. WHEN the remaining time reaches 00:00, THE Timer SHALL stop automatically, display 00:00, play an audible alert signal, and transition the Session to a completed state.
6. WHEN the user activates the Stop control during a running Session, THE Timer SHALL pause the countdown and retain the displayed remaining time.
7. WHEN the user activates the Start control during a paused Session, THE Timer SHALL resume counting down from the retained remaining time.
8. WHEN the user activates the Reset control during a running or paused Session, THE Timer SHALL stop the countdown and restore the displayed time to the configured Pomodoro_Duration.

---

### Requirement 5: Customisable Pomodoro Duration

**User Story:** As a user, I want to set my own timer duration, so that I can adapt the focus session length to my workflow.

#### Acceptance Criteria

1. THE Timer SHALL provide an input control that allows the user to specify the Pomodoro_Duration in whole minutes.
2. WHEN the user sets a Pomodoro_Duration value between 1 and 60 inclusive, THE Timer SHALL accept the value and apply it to the next Session that has not yet started.
3. IF the user enters a Pomodoro_Duration value outside the range 1–60, THEN THE Timer SHALL reject the input and display a validation message indicating the valid range.
4. WHEN the user sets a valid Pomodoro_Duration, THE App SHALL persist the value to Local_Storage.
5. WHEN the App loads, IF Local_Storage contains a previously saved Pomodoro_Duration value within the range 1–60, THEN THE Timer SHALL initialise with that saved value; otherwise THE Timer SHALL initialise with a default Pomodoro_Duration of 25 minutes.
6. IF writing to Local_Storage fails when the user sets a valid Pomodoro_Duration, THEN THE App SHALL apply the value for the current session and display a message indicating the preference could not be saved.

---

### Requirement 6: To-Do List — Task Management

**User Story:** As a user, I want to manage a list of tasks, so that I can track what needs to be done during my session.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an input field accepting up to 200 characters and an Add control for creating new Tasks.
2. WHEN the user submits a non-empty task description, THE Todo_List SHALL add the Task to the list and display it immediately, and clear the input field.
3. IF the user attempts to submit a Task with an empty or whitespace-only description, THEN THE Todo_List SHALL reject the input, display an error message indicating the description is required, and not add the Task to the list.
4. WHEN a Task is displayed, THE Todo_List SHALL provide a Mark-Done control, an Edit control, and a Delete control for that Task.
5. WHEN the user activates the Mark-Done control for an incomplete Task, THE Todo_List SHALL apply strikethrough styling to the Task description text and visually distinguish it from incomplete Tasks.
6. WHEN the user activates the Mark-Done control for a completed Task, THE Todo_List SHALL remove the completed visual distinction and restore the Task to incomplete state.
7. WHEN the user activates the Edit control for a Task, THE Todo_List SHALL replace the Task description with an editable input field pre-filled with the current description, and provide a Save control and a Cancel control.
8. WHEN the user activates the Save control during editing and the edited description is non-empty and non-whitespace, THE Todo_List SHALL update the Task description and return the Task to its normal display state.
9. IF the user activates the Save control during editing with an empty or whitespace-only description, THEN THE Todo_List SHALL reject the change, display an error message indicating the description is required, and keep the edit field open.
10. WHEN the user activates the Cancel control during editing, THE Todo_List SHALL discard all changes and restore the Task to its previous description and display state.
11. WHEN the user activates the Delete control for a Task, THE Todo_List SHALL remove the Task from the list permanently without requiring additional confirmation.
12. WHEN any Task is added, edited, marked done or undone, or deleted, THE App SHALL persist the updated task list including all descriptions and completion states to Local_Storage before the next user interaction.
13. WHEN the App loads and Local_Storage contains previously saved Tasks, THE Todo_List SHALL restore and display all saved Tasks preserving each Task's description and completion state.
14. IF the App loads and Local_Storage contains no saved Tasks or the saved data is unreadable, THEN THE Todo_List SHALL display an empty list with no Tasks.

---

### Requirement 7: Quick Links — Link Management

**User Story:** As a user, I want to save and access my favourite websites with a single click, so that I can navigate quickly without typing URLs.

#### Acceptance Criteria

1. THE Quick_Links widget SHALL provide input fields for a link label and a URL, plus an Add control.
2. WHEN the user submits a label and a URL that begins with "http://" or "https://" after any prefix normalisation, THE Quick_Links widget SHALL add the Link and display it as a clickable button labelled with the submitted label.
3. IF the user attempts to add a Link where the label or URL consists solely of whitespace or is empty, THEN THE Quick_Links widget SHALL reject the input, not add the Link, and display an error message indicating which field is invalid.
4. IF the user enters a URL that does not begin with "http://" or "https://", THEN THE Quick_Links widget SHALL prepend "https://" to the URL before saving.
5. WHEN the user activates a Link button, THE App SHALL open the associated URL in a new browser tab.
6. WHILE a Link is displayed, THE Quick_Links widget SHALL provide a Delete control for that Link.
7. WHEN the user activates the Delete control for a Link, THE Quick_Links widget SHALL remove that Link from the displayed list and from Local_Storage with no undo action available.
8. WHEN any Link is added or deleted, THE App SHALL persist the complete updated link list, including each Link's label and URL, to Local_Storage.
9. WHEN the App loads and Local_Storage contains previously saved Links, THE Quick_Links widget SHALL restore and display all saved Links up to a maximum of 20 Links.
10. IF a Local_Storage read or write operation fails, THEN THE App SHALL display an error message indicating that link data could not be saved or loaded, and the Quick_Links widget SHALL continue to display the current in-session link list without clearing it.

---

### Requirement 8: Light / Dark Mode Toggle

**User Story:** As a user, I want to switch between a light and a dark colour scheme, so that I can reduce eye strain in low-light environments.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control that switches the Theme between "light" and "dark" and visually indicates the currently active Theme.
2. WHEN the user activates the toggle control, THE App SHALL apply the selected Theme to all Dashboard elements within 100 ms without a page reload.
3. WHEN the user activates the toggle control, THE App SHALL persist the selected Theme to Local_Storage.
4. WHEN the App loads, IF Local_Storage contains a previously saved Theme value of "light" or "dark", THEN THE App SHALL apply that Theme before rendering the Dashboard.
5. WHEN the App loads, IF Local_Storage contains no saved Theme value, THEN THE App SHALL apply the "light" Theme as the default.
6. IF Local_Storage is unavailable when the App loads, THEN THE App SHALL apply the "light" Theme as the fallback and continue operating without persisting the Theme preference.

---

### Requirement 9: Responsive Layout

**User Story:** As a user, I want the Dashboard to be usable on different screen sizes, so that I can access it on a laptop or a tablet without layout issues.

#### Acceptance Criteria

1. THE App SHALL render all widgets on viewport widths from 320 px to 1920 px with no horizontal scrollbar and no clipped or overflowing widget content.
2. WHEN the viewport width is below 768 px, THE App SHALL stack all widgets vertically in a single column.
3. WHEN the viewport width is between 768 px and 1279 px inclusive, THE App SHALL arrange widgets in a 2-column grid layout.
4. WHEN the viewport width is 1280 px or above, THE App SHALL arrange widgets in a 3-column grid layout.
5. WHEN the viewport width is between 768 px and 1279 px inclusive, all interactive controls in every widget SHALL have a minimum tap target size of 44 × 44 px.

---

### Requirement 10: Local Storage Persistence — General

**User Story:** As a user, I want my settings and data to survive a page refresh, so that I do not lose my work when the browser reloads.

#### Acceptance Criteria

1. THE App SHALL read all persisted values from Local_Storage during the initialisation phase before rendering any widget, and apply them as the initial state before the first paint.
2. WHEN Local_Storage is unavailable (e.g., private browsing mode with storage blocked), THE App SHALL display a non-blocking warning message visible for at least 3 seconds and continue operating with in-memory state only, losing no data silently without user notification.
3. THE App SHALL store all persisted data under keys prefixed with `pd_` to avoid conflicts with other applications sharing the same origin.
4. IF a value retrieved from Local_Storage fails to parse (e.g., corrupted or unexpected format), THEN THE App SHALL discard that value, apply the corresponding default value, and continue initialisation without interruption.
5. WHEN the App writes to Local_Storage and the write fails (e.g., storage quota exceeded), THE App SHALL display a non-blocking warning message visible for at least 3 seconds indicating that changes could not be saved.
