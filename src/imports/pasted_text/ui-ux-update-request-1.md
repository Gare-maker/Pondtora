## UI/UX Update Request

Please implement the following updates. Ensure all changes are reflected across desktop, tablet, and mobile while maintaining the existing design system and functionality.

---

# 1. Feed Documentation Page

## Reorder Header Controls

Update the layout of the page header.

The order should be:

1. Page Title
2. Page Subtitle
3. Date Selector (Calendar Dropdown)
4. Action Buttons

The **Date Selector** should appear **before** the action buttons because every record created on this page is tied to the selected date.

Action buttons should remain:

* Log Feeding
* Log Opened Bags
* Log Remaining Feed

Maintain the existing responsive wrapping behavior.

---

## Export Functionality

Update the export behavior.

When the user selects:

* Export CSV
* Export PDF

the exported file should include **all data associated with the currently selected date**, not just the active tab.

Include:

* Feeding records
* Opened Bags records
* Remaining Feed records
* Statistics cards
* Any other summary information displayed for the selected date

The export should represent the complete Feed Documentation page for that date.

---

## Rename Terminology

Rename:

* **Feed Remaining** → **Remaining Feed**

Apply this consistently across:

* Tabs
* Tables
* Buttons
* Popups
* Empty states
* Headers
* Labels
* Any related UI

---

## Opened Bags Tab Description

Update the helper text beneath the **Opened Bags** tab.

Replace the current description with a clearer label such as:

> **View opened bags recorded for the selected date.**

Use wording with a similar meaning if it fits the design better.

---

## Remove Description from Remaining Feed Log

In the **Remaining Feed Log** popup/modal, remove the descriptive text displayed beneath the popup title.

The popup title should remain.

The form layout should remain unchanged.

This description is unnecessary because the tab already explains the feature.

---

# 2. Report Editing

Update the **Edit Report** functionality.

When the user clicks **Edit**, open the **same form** used for creating a report.

### Requirements

* Use the exact same input fields.
* Use the same layout.
* Use the same validation rules.
* Pre-populate every field with the existing report values.
* Allow users to update the information and save the changes.

The edit experience should feel identical to creating a report, except that all existing values are already filled in.

---

# 3. Financial Dashboard

## Expense Breakdown

Add the following expense categories:

* Loan
* Others

These categories should appear consistently in:

* Add Expense
* Edit Expense
* Expense Breakdown
* Reports
* Filters
* Analytics
* Any other expense-related feature

---

# 4. Pond Management Navigation

There is currently an issue with page scroll behavior.

### Current Problem

If a user scrolls down the **Pond Management** page and then opens a pond, the **Pond Details** page opens at the same scroll position instead of starting from the top.

### Required Behavior

Whenever the user navigates to a new page:

* Automatically scroll to the top.
* Reset the page's scroll position.

Apply this behavior consistently across the entire application.

Every page should always open from the top unless intentionally preserving scroll state.

---

# 5. Mobile Long-Press Interaction

The long-press gesture used to display the Pond action menu is too sensitive.

### Current Problem

While scrolling the pond list, users accidentally trigger the action menu because their finger briefly touches a card.

### Required Update

Increase the required long-press duration before the menu appears.

### Requirements

* Normal scrolling should never trigger the action menu.
* The menu should appear only after a deliberate long press.
* Maintain a responsive but intentional interaction.

---

# 6. Mobile Pressed State

Improve the responsiveness of pressed states across the mobile application.

### Current Problem

Buttons and cards delay before showing their pressed/active visual state.

### Required Behavior

As soon as the user touches an interactive element:

* Display the pressed state immediately.
* Maintain the existing interaction animations.
* Improve perceived responsiveness throughout the app.

Apply this consistently across all interactive components.

---

# 7. Fish Stock History Date Filter

The **Filter by Date** dropdown on the Fish Stock History page is not positioning correctly.

### Required Behavior

Dropdown menus should always remain fully visible within the viewport.

If the trigger button is positioned near the:

* Left edge → Open toward the right.
* Right edge → Open toward the left.
* Bottom edge → Open upward.
* Top edge → Open downward.

Prevent the dropdown from overflowing outside the screen under all circumstances.

Apply this positioning behavior consistently to every dropdown in the application.

---

# 8. Feed Inventory

Remove the **Opened Bags** tab from the **Feed Inventory** page.

The Opened Bags feature already exists within the **Feed Documentation** module, so it should no longer appear in Feed Inventory.

Ensure any navigation, references, or links to this duplicate tab are removed.

---

# 9. Toggle Components

Update all toggle controls throughout the application.

Examples include:

* Remember Me
* I Agree to the Terms & Conditions
* Any similar toggle or switch component

### Default (Unchecked) State

The current unchecked state uses a dark/black fill.

Update it to:

* White background
* Green or black stroke (matching the application's design system)
* No dark fill
* Maintain clear contrast and accessibility

The toggle should appear clean and lightweight when unselected.

### Checked State

The checked state should remain unchanged and continue using the application's primary color.

Apply this update consistently to every toggle component across the application.
