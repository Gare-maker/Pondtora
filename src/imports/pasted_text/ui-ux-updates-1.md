# UI/UX Update Request

Please implement the following updates. Ensure all changes are reflected in the UI, UX, and application behavior across desktop, tablet, and mobile. Maintain the existing design system and do not redesign any pages unless specified.

---

# 1. Pond List Action Menu (Mobile)

**This update applies to the Pond List page, not the Pond Details page.**

Each pond row in the Pond List already has an **Actions (⋮) menu**. Update the behavior and content of this menu.

## Close on Outside Click

When the user taps the action menu icon:

* The dropdown should open normally.
* If the user taps anywhere outside the dropdown, it should immediately close.

This should behave like a standard mobile overflow menu.

---

## Smart Dropdown Positioning

The dropdown should automatically position itself based on available screen space.

Rules:

* If the menu icon is near the **bottom** of the screen, open the dropdown upward.
* If it is near the **top**, open downward.
* If it is near the **left edge**, open toward the right.
* If it is near the **right edge**, open toward the left.

The dropdown should always remain fully inside the viewport.

Apply this same positioning logic to every similar overflow/action menu throughout the application.

---

## Update Actions

Include the following actions:

* View Details
* Edit
* Delete Pond

**View Details** should navigate directly to the corresponding Pond Details page.

Maintain the existing delete validation rules:

* A pond can only be deleted when it is empty.
* If deletion is not allowed, disable the action and display the existing explanatory message.

---

# 2. Mobile Stock Cards

**This update applies only to the mobile version.** Do not change the desktop or tablet layouts.

Update the information hierarchy of the stock cards so farmers can identify feed stock at a glance.

## Layout

Rearrange the card content as follows.

### First Row (Primary Information)

Display these values on the **same line**:

**Pellet Size • Kg per Bag**

Example:

**2 mm • 15 kg/bag**

This first row should have the highest visual emphasis.

Requirements:

* Larger font size
* Bold or Semibold font weight
* Positioned at the very top of the card

---

### Second Row

Display:

**Feed Brand**

The Feed Brand should remain visible but should use a smaller font size and lower visual emphasis than the first row.

The objective is that users immediately recognize the pellet size and bag size before reading the brand.

---

## Card Styling

This applies **only to the mobile version**.

* Remove the card shadow.
* Replace it with a subtle border (stroke).
* Keep the existing spacing and layout.

---

# 3. Feed Purchased History Filters

Update the filters on the **Feed Purchased History** page.

The page should contain only two filters:

* Year
* Month

Remove all other date filtering options.

---

# 4. Feed Documentation (Mobile)

Update the mobile version of the Feed Documentation page.

Replace the visible action buttons with a single **overflow/menu icon** placed in the page header.

When the user taps the menu icon, display:

* Log Feeding
* Log Bags Opened
* Log Feed Remaining

The action buttons should no longer appear directly on the page.

---

## Menu Behavior

The Feed Documentation overflow menu should behave exactly like every other overflow menu in the application.

Requirements:

* Close automatically when the user taps anywhere outside the menu.
* Position itself intelligently based on available space:

  * Near the right edge → open toward the left.
  * Near the left edge → open toward the right.
  * Near the bottom → open upward.
  * Near the top → open downward.
* Never overflow outside the viewport.

Use the same reusable dropdown component and interaction pattern used throughout the application.

---

# 5. Reports Page

## Report Submission

For every responsibility question in the report form, add a confirmation step.

Example:

### Question

**Were you the person who fed the fish today?**

Options:

* Yes
* No

If **Yes** is selected, immediately display:

**Are you sure you personally carried out or assisted with this task?**

Options:

* Yes
* No

Only after confirming **Yes** should the next related input appear (Morning, Evening, Both, etc.).

Apply this confirmation pattern to every responsibility-based question, including:

* Feeding
* Locking pond outlets and inlets
* Water flushing / Flow-through
* Any future responsibility questions

---

## Report Details

Update the Report Details page.

Display the **entire report immediately** when it is opened.

Do **not** collapse, hide, or place information inside tabs, accordions, or expandable sections.

Managers and administrators should be able to review the complete report at a glance.

Display every submitted field, including:

* Staff Name
* Report Type
* Report Title
* Submission Date
* Every question asked
* Every answer provided
* Every confirmation answer
* Feeding session
* Outlet & inlet confirmation
* Water flow session
* Additional notes

Nothing should be hidden by default.

---

## Remove Status Filter

Remove the following filters completely:

* Open
* Resolved
* All

---

## Report Filters

Replace the existing filters with:

**Report Type**

* Daily
* Weekly
* Monthly

and

**Date Picker**

The Date Picker should be the only date filter on the Reports page.

---

# 6. Staff Permissions

Replace the generic permissions system with **page-based access**.

Administrators should assign access to application pages instead of abstract permissions.

Available permissions should include:

* Financial Dashboard
* Pond Management
* Pond Details
* Feed Inventory
* Feed Documentation
* Invoice
* Reports

Do **not** include:

* Notifications
* Subscription
* Settings

These are system-level features and should not appear as assignable permissions.

---

# 7. Revenue vs Cost Chart

Update the chart colors.

* Revenue should use the application's primary green.
* Cost should use a complementary pink/red that matches the design system.

---

# 8. Feed Documentation Calendar

Remove all quick month shortcut buttons from the Feed Documentation calendar.

Users should select dates directly from the calendar.

---

# 9. Table Pagination

Implement pagination across the application.

Rules:

* 10 or fewer records → No pagination.
* More than 10 records → Display pagination.

Pagination should include:

* Previous
* Next
* Page Numbers
* Current Page Indicator

Apply this consistently across every data table in the application.

---

# 10. Country Dropdown

Update every country selection dropdown throughout the application.

Requirements:

* Include all African countries.
* Add a search bar at the top.
* Display countries in alphabetical order.
* Use the existing dropdown component and styling.
* Ensure responsiveness across desktop, tablet, and mobile.
* Apply the same smart positioning and viewport behavior used throughout the application so dropdowns never overflow outside the screen.
