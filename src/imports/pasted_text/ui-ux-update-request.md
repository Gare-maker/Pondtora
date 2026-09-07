# UI/UX Update Request

**Important:** Please carefully implement the following updates. These changes should affect both the UI design and the application behavior where applicable.

---

# 1. Pond Details Page (Mobile)

Update the mobile layout of the **Pond Details** page to follow standard mobile design patterns.

### Action Buttons

Currently, all action buttons are displayed on the page.

Instead:

* Hide all action buttons on the mobile version.
* Replace them with a single **overflow/menu icon** (three dots or similar).

The menu should contain the following actions as a vertical dropdown list:

* Log Mortality
* Add Pond Cost
* Log Treatment
* Update Quantity
* Transfer Fish Stock
* Clear Fish Stock

These actions should only become visible after tapping the menu icon.

### Menu Position

The menu icon should:

* Always remain aligned to the **top-right corner**.
* Stay on the same horizontal line as the page title ("Pond Details" / "Operational Details").
* Never move onto another line.

If there is not enough horizontal space:

* Wrap the page subtitle onto multiple lines.
* Keep the page title and menu icon on the first line.
* The menu icon should only occupy the minimum width required.

---

# 2. Pond Age Card

Inside the **Fish Information** card, update the **Pond Age** component.

Currently, the green Pond Age container does not utilize the available width.

Update it so that:

* The green Pond Age container stretches across the full width of the Fish Information card.
* Respect the existing internal padding of the Fish Information card.
* The text inside should expand naturally within the wider container.

---

# 3. Remove Duplicate "Log Treatment" Button

There are currently two **Log Treatment** buttons.

Update this so that:

* Keep the **Log Treatment** button in the page header/action area.
* Remove the duplicate **Log Treatment** button from the tab/content section.

There should only be one entry point for logging treatments.

---

# 4. Revenue Table Update

Update the Revenue module.

When logging **Fish Sales**, the user selects:

* Revenue Type = Fish Sales
* Pond
* Fish Stock

After saving the revenue:

The Revenue table should display additional columns:

* Pond
* Fish Stock

If the revenue entry is **not** related to Fish Sales (for example, other income), display:

**-**

for both the Pond and Fish Stock columns.

---

# 5. Feed Documentation Tabs

Update the Feed Documentation page.

### Statistics Cards

The statistics cards at the top are shared across all tabs.

They should **always remain visible** regardless of which tab is selected.

Switching between:

* Feeding
* Bags Opened
* Feed Remaining

should only change the table/content below the statistics cards.

The statistics section should never disappear.

---

### Edit Actions

Add an **Edit** action to both:

#### Bags Opened

Every row should include an Edit button.

#### Feed Remaining

Every row should include an Edit button.

Users should be able to correct previously entered records.

---

# 6. Reports Page

Add filtering options to the Reports page.

The page should support filtering by:

* Year
* Month
* Day

Users should be able to generate reports for:

* A specific day
* An entire month
* An entire year

---

# 7. Invoice Error State

Update invoice management.

When an invoice is created incorrectly:

* Allow users to mark it as **Error**.
* Do not delete the invoice.
* Keep it in the Invoice table.
* Clearly display its status as **Error**.
* Style the row with a light red background so it is visually distinguishable.
* Error invoices should remain viewable for audit purposes but should not be included in revenue calculations or reports.

---

# 8. Financial Dashboard (Mobile)

The overflow/menu icon still moves onto another line.

Update the layout so that:

* The menu icon is always fixed at the top-right corner.
* It remains on the same row as the page title.
* If space becomes limited, wrap the page subtitle instead.
* The menu icon should only occupy the minimum amount of horizontal space needed.

---

# 9. Notifications Page

Improve the Notifications page.

### Filters

Add filtering by:

* Year
* Month
* Day

---

### Date Grouping

Group notifications by date.

Each day should have its own date header.

Example:

**Today**

* Pond A has not been fed.
* Bags Opened has not been logged.

---

**Yesterday**

* Pond B has not been fed.

This makes notifications easier to read and browse.

---

# 10. Reports Page Date Grouping

Apply the same grouping logic to the Reports page.

Reports should also be separated by date headings instead of appearing as one continuous list.

---

# 11. Reset Password Flow

Complete the password reset process.

Current flow:

* User clicks **Forgot Password**.
* User receives a password reset email.

Missing step:

After clicking the reset link from the email, the user should be taken to a **Create New Password** page where they can:

* Enter a new password.
* Confirm the new password.
* Save the password.
* Be redirected back to the Sign In page after a successful reset.

---

# 12. Subscription Pricing Cards

Update the pricing card content and layout.

## Single Farm Plans

Move the complete feature list into the **Starter** plan.

Starter should include:

* Financial Dashboard
* Pond Management
* Feed Inventory
* Feed Documentation
* Fish Stock History
* Sales Invoicing
* Reports
* Staff Management
* CSV Export
* PDF Export

Higher plans should simply display:

**Everything in Starter**

Plus their additional limit.

Example:

### Growth

* Everything in Starter
* Up to 15 ponds

### Commercial

* Everything in Growth
* Unlimited ponds

All pricing cards should have the same height for visual consistency.

---

## Multi-Farm Plans

Apply the same structure.

The **Up to 3 Farms** plan should contain the complete feature list.

The higher plans should display:

* Everything in Up to 3 Farms

Plus:

* Number of farms allowed

Remove the separate **Every Plan Includes** section, as the feature list will already be included within the first plan card.

---

## General Requirements

* Ensure all updates are reflected in both the design and functionality.
* Maintain consistency with the existing design system.
* Ensure all layouts are responsive across desktop, tablet, and mobile.
* Preserve consistent spacing, typography, and component behavior throughout the application.
