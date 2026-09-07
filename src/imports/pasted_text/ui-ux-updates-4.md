## UI/UX Update Request

Please implement the following updates. Ensure all changes are reflected across desktop, tablet, and mobile while maintaining the existing design system.

---

# 1. Pond Details – Feed Summary Cards (Mobile)

This update applies to the **Feed Summary** section on the **Pond Details** page.

### Mobile Layout

Make the summary cards responsive so they display in **two columns (two cards per row)** on mobile devices.

**Requirements:**

* Display two cards per row.
* Resize cards responsively to fit the available screen width.
* Maintain consistent spacing and padding.
* Keep all cards the same height.
* Ensure content does not overflow.
* Do not affect the desktop or tablet layouts.

The goal is to reduce excessive vertical scrolling while keeping the cards easy to scan.

---

# 2. Reports Page – Remove Statistics Cards

Update the **Reports** page.

Remove the statistics cards displayed at the top of the page.

This includes removing cards such as:

* Total Reports
* Open Reports

After removing them:

* Move the report list up to occupy the available space.
* Keep the page title, subtitle, filters, and report list.
* Do not replace the removed cards with any other component.

---

# 3. Page Actions (Replace Mobile Hamburger Menus)

Update **every page** that currently uses a hamburger/overflow menu to display page action buttons.

### Remove the Hamburger Menu

Remove the hamburger/overflow menu entirely from these pages.

Instead, display all page action buttons directly below the page header.

### Layout

The page layout should follow this structure:

* Page Title
* Page Subtitle
* Action Buttons

The action buttons should appear immediately below the page subtitle.

### Responsive Behavior

* Display buttons using a responsive wrapping layout.
* If two buttons fit on one row, display them side by side.
* If there are additional buttons, automatically wrap them onto the next row.
* Never allow the buttons to overflow horizontally.
* Maintain consistent spacing between rows and buttons.
* Keep the existing button styles.

This update applies consistently across every page that currently uses a hamburger/overflow menu for page actions.

---

# 4. Financial Dashboard – Cost vs Revenue Chart

The **Revenue (green) bar** in the **Cost vs Revenue** chart is currently not displaying.

Please investigate and fix this issue.

### Expected Behavior

* The Revenue (green) bars should render correctly for all available data.
* Use the application's primary green color consistently.
* Ensure both Revenue and Cost bars display correctly across desktop, tablet, and mobile.

---

# 5. Log Mortality Popup

Update the **Log Mortality** popup.

### Remove Pond Input

Remove the **Pond** input field from the form.

The mortality action is already initiated from a specific Pond Details page, so the pond should be associated automatically.

---

# 6. Total Dead Details Popup

When the user clicks the **Total Dead** statistic on the Pond Details page, open a popup displaying the complete mortality history for that pond.

### Popup Contents

Display a table containing:

* Date
* Number of Dead Fish
* Cause of Death
* Notes
* Actions

### Actions

Each row should include an **Edit** icon that allows users to update the mortality record.

### Additional Requirements

* Include loading, empty, and validation states.
* Use the application's existing modal component.

---

# 7. Report Details Page Design

Redesign the **Report Details** page to improve readability.

### Layout

Keep the existing page layout, but display every submitted question and answer inside its own individual card.

### Card Structure

Each card should contain:

* The question
* The corresponding answer

### Styling

* Use the same reusable card component throughout.
* Apply a subtle background fill different from the page background.
* Maintain consistent spacing, typography, border radius, and padding.

The objective is to allow managers to review the entire report without expanding sections.

---

# 8. Subscription Page After Create Account

Update the Subscription page shown during the Create Account onboarding flow.

### Requirements

The onboarding Subscription page should be an exact replica of the Subscription page inside the application.

It should use the same:

* Single Farm plans
* Multiple Farm plans
* Pricing
* Features
* Card layout
* Styling
* Content hierarchy

For example:

**Starter**

Contains the complete feature list.

**Growth**

Everything in Starter

Plus:

* Up to 15 ponds

**Commercial**

Everything in Growth

Plus:

* Unlimited ponds

For Multiple Farm plans:

**Up to 3 Farms**

Contains the complete feature list.

Higher plans should display:

* Everything in Up to 3 Farms
* Additional farm limits

There should be no simplified onboarding version.

---

# 9. Login Page – Remember Me

Add a **Remember Me** toggle to the Login page.

### Requirements

* Position it beside or near the Forgot Password link.
* Maintain the existing spacing and layout.
* Ensure it functions across desktop, tablet, and mobile.

---

# 10. Navigation Bar – Logout

Add a **Logout** option to the navigation.

### Placement

* Place Logout below the main navigation items.
* Separate it from the navigation using spacing or a divider.

### Confirmation

Clicking Logout should display a confirmation popup.

**Title**

Log Out

**Message**

Are you sure you want to log out of your account?

Buttons:

* Cancel
* Log Out

Only log the user out after confirmation.

After logout, redirect to the Login page.

---

# 11. Navigation Logo Quality

Improve the application logo quality.

### Requirements

* Replace the current blurred logo with a sharp, high-resolution version.
* Maintain the original aspect ratio.
* Fit naturally inside the existing logo container.
* Optimize for fast loading.
* Use the same logo consistently on:

  * Navigation bar
  * Login
  * Create Account
  * Email Verification
  * Password Reset
  * Any other authentication screens

---

# 12. Calendar Indicator Colors

Update the calendar component used throughout the application.

### Recorded Dates

Dates that contain recorded data should use the following orange color:

**#F05010**

This orange should indicate that records exist for that date.

### Selected Date

The currently selected date should continue using the application's primary green color.

### Color Meaning

* **Orange (#F05010):** Date contains records.
* **Green (Primary):** Currently selected date.

These two states should remain visually distinct and should never use the same color.

Apply this consistently to every calendar/date picker throughout the application.

---

# 13. Subscription Page Indicator Color

Update the Subscription pages.

Wherever the interface currently uses **purple** as an indicator, highlight, badge, or accent color, replace it with:

**#F05010**

### Requirements

* Replace only the purple accent/indicator color.
* Do **not** replace the application's primary green color.
* Do **not** change the overall theme or branding.
* Maintain proper color contrast and accessibility.

The orange (#F05010) should become the standard accent color for indicators and highlights on the Subscription page, while the primary green continues to represent active and selected states throughout the application.
