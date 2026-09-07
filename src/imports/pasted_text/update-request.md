# Update Request

**Important:** The previous updates have not been fully implemented. The code changes are not being reflected in the UI/design.

**Before making the updates below:**

* Fully implement all previously requested changes.
* Ensure every implemented feature is visible in the design.
* Verify that the UI reflects the actual functionality.
* Do not leave any feature partially implemented or hidden.

Once all previous updates are visible, proceed with the following changes.

---

# 1. Feed Documentation

## Add Edit Actions

On the **Feed Documentation** page, add an **Edit** button/icon to both of these tabs:

### Bags Opened

Every row in the table should have an Edit action so users can update incorrectly entered records.

### Feed Remaining

Every row in the table should also have an Edit action.

Users should be able to update the remaining feed information while keeping inventory calculations synchronized.

---

# 2. Pond Details (Mobile)

Update the mobile version of the **Pond Details** page.

The overflow menu (three-dot or menu icon) should always appear at the **top-right corner**, aligned with the page title.

If there is limited horizontal space:

* Wrap the page title and subtitle onto multiple lines.
* Do not move the menu icon to another line.

Move all page actions into the overflow menu.

The menu should contain:

* Log Mortality
* Add Pond Cost
* Log Treatment
* Update Quantity
* Transfer Fish Stock
* Clear Fish Stock

These actions should only be visible after the user taps the menu icon.

---

# 3. Tab Descriptions

Update every tab component throughout the application.

Each tab should display a short descriptive text explaining its purpose.

Requirements:

* Place the description directly below the tab navigation.
* Left-align the text.
* Use consistent typography and spacing.
* The description should change based on the selected tab.

Apply this pattern consistently across all pages that use tabs.

---

# 4. Notifications

Create a dedicated **Notifications** page.

This page should display only operational reminders.

## Notification Types

### Feed Documentation Reminder

Generate a notification when:

* Daily feeding has not been documented.
* A pond has not been fed for the current day.

These reminders should be generated separately for each affected pond.

---

### Bags Opened Reminder

Generate a notification when **Bags Opened** has not been logged for the current day.

---

# 5. Notification Icon

Add a notification icon to the application's navigation.

Placement:

* Position it beside the application logo.
* Align it to the far right of the logo area.
* Maintain the existing padding and spacing used throughout the navigation.

The notification icon should:

* Display a red notification badge when there are unread notifications.
* Open the Notifications page when clicked.

---

# 6. Notification Visibility Based on Subscription & Role

## Single Farm Plan

Users should only receive notifications for that single farm.

Do **not** display the farm name inside notifications because there is only one farm.

---

## Multiple Farm Plan

Notifications should include the farm name.

### Farm Owner (Admin)

Can see notifications from **all farms**.

Each notification should display the associated farm name.

---

### Director

Can only see notifications from the farms assigned to them.

Each notification should include the farm name.

---

### Farm Manager

Can only see notifications from the farms assigned to them.

Each notification should include the farm name.

---

### Other Staff

Can only see notifications from the farm(s) they are assigned to.

If multiple farms are assigned, display the farm name with each notification.

---

# 7. Push Notifications

Support push notifications for operational reminders.

Users should receive push notifications for:

* Feeding not documented.
* Pond not fed.
* Bags Opened not logged.

Unread notifications should also display a red badge on the notification icon until viewed.

---

# 8. Multi-Farm Subscription

Update the **Multi-Farm** subscription plans.

All Multi-Farm plans should support **unlimited ponds** within each farm.

The only subscription limitation should be the **number of farms** allowed.

Update the subscription cards and feature lists to clearly reflect this.

Example:

* Up to 3 Farms → Unlimited ponds per farm
* Up to 5 Farms → Unlimited ponds per farm
* Unlimited Farms → Unlimited ponds per farm

This should be clearly displayed in the pricing page and enforced throughout the application.

---

# 9. Revenue Logging

Update the **Log Revenue** workflow.

When the user selects a **Pond**, automatically display another field called **Fish Stock** (or **Stock Batch**).

Behavior:

* Automatically preselect the **current active stock** in the selected pond.
* The field should also function as a dropdown.
* Expanding the dropdown should display all historical stock batches previously recorded for that pond.
* Display the current active stock at the top of the list, followed by older stock batches in chronological order.
* The user may choose a different stock batch if needed.

This ensures every revenue record is linked to the correct fish stock batch for accurate reporting, inventory tracking, and sales history.

---

# General Requirements

* Fully implement all previously requested features before applying these updates.
* Ensure every feature is reflected visually in the UI, not just in the underlying code.
* Maintain consistency with the existing design system.
* Ensure all updates are responsive across desktop, tablet, and mobile.
* Keep spacing, typography, colors, and reusable components consistent throughout the application.
* Ensure all new functionality automatically synchronizes across related modules, including Notifications, Feed Documentation, Pond Management, Fish Stock History, Revenue Logging, Staff Permissions, and Subscription Management.
