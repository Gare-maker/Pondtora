# UI/UX Update Request

Please implement the following updates. Ensure the changes are reflected in both the UI design and application behavior where applicable. All updates should remain responsive across desktop, tablet, and mobile without breaking the existing layout.

---

# 1. Replace Date Filters with a Single Date Picker

Update the filtering system across the application.

Instead of having separate **Day**, **Month**, and **Year** filters, replace them with **one unified Date Picker**.

## Date Picker Requirements

The date picker should:

* Open as a calendar popup.
* Allow users to switch between **Year**, **Month**, and **Day** selection.
* Support selecting:

  * A specific day.
  * An entire month.
* Use the same date picker component throughout the application for consistency.

Apply this update to the following pages:

* Notifications
* Reports
* Invoice
* Feed Purchased History
* Fish Stock History
* Any other page currently using separate day, month, or year filters.

### Exception

The **Feed Documentation** page already has its own date navigation pattern.

Do **not** replace it with this new date picker.

Keep its current behavior.

---

# 2. Staff Page

Remove the **Stage Access Permission** section from the Staff page.

This section is no longer required.

---

# 3. Subscription & Trial Flow

Update the subscription experience.

## Remove Free Trial Badge

Remove the persistent **30-Day Free Trial Active** badge from the Subscription page.

---

## First-Time User Experience

Every new user should automatically receive a **30-day free trial**.

Each pricing card (Single Farm and Multi-Farm) should initially display a **Start Free Trial** button.

Once the user selects a plan:

* Start the 30-day countdown.
* Update all other plan buttons to **Get Plan**.
* The selected plan should display **Current Plan**.

The **Current Plan** button should use a **gray filled** style to clearly indicate the active subscription.

---

## Trial Countdown

After the trial starts, display a message showing the expiry date.

Example:

> Your free trial expires on **August 30, 2026**.

This date should update automatically based on when the trial started.

---

## Expired Trial / Subscription

This behavior should apply to both **free trials** and **paid subscriptions**.

Once a subscription expires:

Users should still be able to:

* View existing data.
* View reports.
* Browse the application.

Users should **not** be able to:

* Add new records.
* Create invoices.
* Add ponds.
* Add feed purchases.
* Log feeding.
* Log treatments.
* Add expenses.
* Add revenue.
* Perform any create or update actions.

Whenever the user clicks any **Add**, **Create**, or editable input after expiration, display a modal:

> **Your subscription has expired. Renew your plan to continue managing your farm.**

Buttons:

* Renew Plan
* Cancel

---

# 4. Delete Pond Confirmation

When deleting an empty pond, display a confirmation dialog.

Example:

> **Are you sure you want to delete this pond? This action cannot be undone.**

Buttons:

* Delete Pond
* Cancel

---

# 5. Pond List

Remove the **Month Filter** from the Pond List page.

---

# 6. Feed Documentation

Update the **Feed Documentation** page so that the layout remains consistent regardless of which tab is selected.

Currently, when switching from the **Feeding** tab to **Bags Opened** or **Feed Remaining**, the statistics cards disappear and the page content moves upward.

This should **not** happen.

## Fixed Header Section

The following components should always remain visible at the top of the page, regardless of the selected tab:

* Date selector
* Statistics cards
* Tab navigation

Switching between tabs should only update the content below the tabs.

The page layout should remain stable without any components appearing or disappearing.

## Date-Driven Data

Everything on the Feed Documentation page is driven by the selected date.

The selected date should control:

* Statistics cards
* Feeding records
* Bags Opened records
* Feed Remaining records

When the user changes the date, every section should automatically refresh and display only the information for that selected day.

The selected date should remain active while switching between tabs.

---

# 7. Standardize Date Pickers

Apart from the **Feed Documentation** page, every page that filters data by date should use the same calendar date picker.

The date picker should support:

* Day selection.
* Month selection.
* Year selection.

Also include a **Reset Filters** button.

### Invoice

Remove the **All Years** dropdown.

Replace it with the date picker.

### Feed Purchased History

Remove all existing filters.

Replace them with the date picker.

Support selecting:

* Individual dates.
* Entire months.

### Fish Stock History

Replace existing filters with the same date picker.

Support:

* Individual dates.
* Entire months.

---

# 8. Edit Actions

Add an **Edit** icon to:

### Feed History

Allow users to edit logged feeding records.

### Treatment History

Allow users to edit logged treatment records.

These actions should open the existing form with all values pre-filled.

---

# 9. Feed Documentation Layout

## Remove Total Weight

Remove the **34 kg Total** label from the table header.

The information is already displayed below the selected date.

---

## Export Buttons

Move **Export CSV** and **Export PDF** to the top-right corner.

Requirements:

* Keep them aligned with the page title.
* They should always stay on the same line.
* If there is not enough horizontal space, wrap the subtitle instead.
* Do not move the export buttons.

---

# 10. Subscription Buttons

## Current Plan

The **Current Plan** button should have a **gray filled** style.

---

## First-Time Users

Initially every pricing card should display:

**Start Free Trial**

After a trial begins:

* Other plans become **Get Plan**.
* The selected plan becomes **Current Plan**.

Apply this to:

* Single Farm plans.
* Multi-Farm plans.

---

# 11. Edit Revenue

When editing a revenue record, display the exact same fields available in **Add Revenue**.

Include:

* Revenue Type
* Amount
* Date
* Pond
* Fish Stock
* Notes
* Any other existing fields.

If Revenue Type is **Fish Sales**, display the **Pond** and **Fish Stock** fields so users can correct them.

---

# 12. Revenue & Expense Categories

Add a new category called:

**Others**

This option should be available in both:

* Revenue Categories.
* Expense Categories.

---

# 13. Revenue vs Cost Chart

Update the **Revenue vs Cost** section.

Allow users to view all **12 months**.

Instead of compressing the chart:

* Make the chart horizontally scrollable.
* Keep the amount/axis labels fixed.
* Only the monthly data should scroll horizontally beneath the fixed labels.
* Ensure the layout remains responsive.

---

# 14. Table Navigation

Improve navigation across the application.

Currently, users must click the **View (Eye)** icon to open a details page.

Update this behavior.

For every table where the **View** icon navigates to another page:

* Make the entire clickable cell (or primary information column) navigate to the details page.
* Users should be able to click anywhere within that cell to open the details page.
* Keep the **View (Eye)** icon for visual consistency, but it should no longer be the only clickable element.

Apply this interaction consistently across all tables in the application.

---

# 15. Invoice Error Workflow

Update the invoice error handling process.

In the **All Invoices** table, keep the **Mark as Error** action.

When a user clicks **Mark as Error**, it means the invoice contains incorrect information and should no longer be treated as a valid invoice.

The system should behave as follows:

* Do **not** delete the invoice.
* Do **not** remove it from the table.
* Change its status to **Error**.
* Highlight the row with a light red background to make it visually distinct.
* Keep the invoice searchable and viewable for audit and record-keeping purposes.
* Exclude Error invoices from revenue calculations, reports, and analytics.

After an invoice has been marked as **Error**, the user should still be able to create a new invoice to replace the incorrect one. The Error invoice should remain in the history as a permanent record and should never be automatically deleted or overwritten.

---

# General Requirements

* Ensure every update is reflected visually in the UI and implemented functionally.
* Reuse existing components where appropriate.
* Maintain consistency with the existing design system.
* Ensure all pages remain fully responsive across desktop, tablet, and mobile.
* Preserve spacing, typography, alignment, and component behavior throughout the application.
* Do not introduce layout regressions or break existing functionality while implementing these updates.
