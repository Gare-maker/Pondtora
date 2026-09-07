# UI/UX Update Request

**Important**

Please implement only the updates listed below.

* Maintain the existing layout, page structure, spacing, and text hierarchy.
* Do **not** redesign pages unless specifically requested.
* The goal is to refine the existing experience, not rebuild it.
* Ensure all updates are reflected in both the UI and functionality.
* All changes must remain responsive across desktop, tablet, and mobile.

---

# 1. Fix Dropdown Overflow

Several dropdown menus overflow outside the viewport when opened near the right edge of the screen.

Update the dropdown positioning logic across the entire application.

## Required Behavior

If a dropdown trigger is close to the **right edge** of the screen:

* Open the dropdown toward the left.

If a dropdown trigger is close to the **left edge**:

* Open it normally toward the right.

If there is not enough space below:

* Allow the dropdown to open upward.

The dropdown should always remain completely inside the viewport.

Apply this behavior consistently across all pages that use dropdowns, including:

* Feed Purchased History
* Reports
* Invoice
* Feed Inventory
* Staff
* Financial Dashboard
* Any other page that contains dropdown menus.

---

# 2. Feed Remaining (Feed Documentation)

The current implementation is incorrect.

The **Feed Remaining** tab is **not** the same as Feed Inventory.

Its purpose is to record feed from **opened bags that were not completely used** after feeding.

### Example

A 15 kg bag is opened.

* 12 kg is used.
* 3 kg remains.

The farmer should be able to log the remaining **3 kg** so it can be used later instead of opening another bag.

## Log Feed Remaining Popup

The popup should use the same interaction pattern as **Log Bags Opened**.

Use a table-style input.

Fields:

* Feed Brand
* Pellet Size
* Fish Stock (Stocking Date)
* Remaining Feed (kg)

## Feed Remaining Table

Display:

* Feed Brand
* Pellet Size
* Fish Stock (Stocking Date)
* Remaining Feed (kg)

Add an **Edit** action for each row.

## Sticky First Column

The first column of both:

* Bags Opened
* Feed Remaining

should remain sticky while horizontally scrolling.

---

# 3. Feed Documentation (Mobile)

Update the mobile layout of the Feed Documentation page.

The layout should be:

* Page Title
* Subtitle

Below the subtitle, display two action buttons on the same row:

* **Log Bags Opened**
* **Log Feed Remaining**

Requirements:

* Equal width.
* Respect page padding.
* Only stack vertically if there is genuinely not enough space.

The page order should be:

1. Page Title
2. Subtitle
3. Log Bags Opened + Log Feed Remaining buttons
4. Date Selector
5. Statistics Cards
6. Tabs

The **Date Selector**, **Statistics Cards**, and **Tabs** should always remain visible regardless of the selected tab.

---

# 4. Subscription Flow

## After Account Creation

Immediately after a user creates an account, redirect them to a dedicated **Choose Your Subscription** page.

This page should include:

* Heading: **Choose Your Subscription**
* Supporting text
* All available subscription plans

Every subscription button should display:

**Start 30-Day Free Trial**

## Main Subscription Page

Once the user starts the free trial:

Remove all references to **30-Day Free Trial** from the normal Subscription page.

Instead display:

* Current Plan
* Plan Expiration Date

Example:

> Current plan expires on September 20, 2026.

Buttons should display:

* Current Plan
* Get Plan

The free trial state should only exist during onboarding.

---

# 5. Feed Inventory Terminology

Rename:

**Bags Remaining**

to

**Bags in Stock**

Apply this consistently throughout the application.

---

# 6. Remove Supplier

Remove **Supplier** from the Stock tab in Feed Inventory.

This applies to both the summary and the table.

---

# 7. Rename Statistics Card

Rename:

**Unopened**

to

**In Stock**

---

# 8. Remove Total Value Card

Remove the **Total Value** statistics card from the Feed Inventory page.

---

# 9. Purchased History

Remove the **Date Picker** from the Purchased History page.

---

# 10. Pond Details

Remove the **Add Pond Cost** button from the Pond Details page.

---

# 11. Feed Inventory (Stock Tab)

Update the Stock tab so it represents only the farmer's **current feed inventory**.

It should no longer function as purchase history.

### Remove

* Purchased column
* Remove From Stock column
* Month filter
* Total Value row
* Bags row
* Cost per Bag
* Supplier
* Total Value statistics card

### Rename

Rename:

**Bags Remaining**

to

**Bags in Stock**

### Inventory Logic

If multiple purchases have the same:

* Feed Brand
* Pellet Size
* Bags per Pallet

they should automatically merge into a single inventory record by increasing the quantity.

The individual purchase records should instead be stored in the **Purchased History** tab.

---

# 12. Log Bags Opened

Update the popup.

Rename:

**kg/Bag**

to

**Bags in Stock**

This field should display the number of unopened bags currently available.

---

# 13. Financial Dashboard

Allow users to filter data using a **date range**.

Instead of selecting only one month, users should be able to select:

* Start Date
* End Date

All dashboard calculations should be based on the selected date range.

---

# 14. Invoice Error Workflow

When an invoice is marked as **Error**:

* Do not delete it.
* Do not remove it from the Invoice table.
* Keep it permanently in the invoice history.
* Update its status to **Error**.
* Highlight the row with a light red background.
* Allow users to open and review the invoice later.
* Exclude Error invoices from revenue calculations, reports, analytics, and financial summaries.

The purpose is to preserve an audit trail while preventing incorrect invoices from affecting financial records.

---

# 15. Country Dropdown

Update every country selection dropdown in the application.

Requirements:

* Include **all African countries**.
* Add a **search bar** at the top of the dropdown.
* Display countries in alphabetical order.
* Use the existing dropdown component and styling.
* Ensure it works correctly across desktop, tablet, and mobile.

---

# 16. Reports Page & Submit Report Flow

Update both the **Reports** page and the **Submit Report** popup.

## Report Type

Move **Report Type** to the top of the form so it becomes the first input.

The rest of the form should change dynamically based on the selected report type.

Keep the existing inputs for other report types.

---

## Daily Report

When **Daily Report** is selected, display the following fields in order:

### 1. Report Title

Required text input.

---

### 2. Feeding Responsibility

Question:

**Were you the person who fed the fish today?**

Options:

* Yes
* No

Immediately below this question, display the helper text:

> **Select "Yes" only if you personally carried out this task or directly assisted in completing it.**

If the user selects **Yes**, display:

**Which feeding did you complete?**

Options:

* Morning
* Evening
* Both

---

### 3. Outlet & Inlet Responsibility

Question:

**Were you the person who locked all pond outlets and inlets?**

Options:

* Yes
* Not Me

Immediately below this question, display the helper text:

> **Select "Yes" only if you personally carried out this task or directly assisted in completing it.**

If the user selects **Yes**, display:

**Are you sure you locked all pond outlets and inlets?**

Options:

* Yes
* No

This confirmation acts as a deliberate verification step to encourage accurate reporting.

---

### 4. Water Flow / Flushing

Question:

**Did you flush the pond or carry out water flow-through today?**

Options:

* Yes
* No

Immediately below this question, display the helper text:

> **Select "Yes" only if you personally carried out this task or directly assisted in completing it.**

If the user selects **Yes**, display:

**When was it done?**

Options:

* Morning
* Evening
* Both

---

### 5. Additional Notes

Optional multiline text field.

Label:

**Additional Notes (Optional)**

---

## Report Details (View Report)

Update the Report Details page so it clearly displays every response submitted by the staff member.

Display:

* Staff Name (automatically populated)
* Report Type
* Report Title
* Date Submitted

### Feeding Responsibility

Display:

**Was the staff responsible for feeding today?**

* Yes / No

If **Yes**, display:

**Feeding Session Completed**

* Morning
* Evening
* Both

If **No**, display:

**Feeding Session Completed: No**

---

### Outlet & Inlet Responsibility

Display:

**Was the staff responsible for locking all pond outlets and inlets?**

* Yes
* Not Me

If **Yes**, display:

**Confirmed all outlets and inlets were locked**

* Yes
* No

If **Not Me**, display:

**Confirmed all outlets and inlets were locked: Not Applicable**

---

### Water Flow / Flushing

Display:

**Was the staff responsible for flushing the pond or carrying out water flow-through?**

* Yes
* No

If **Yes**, display:

**Water Flow Session**

* Morning
* Evening
* Both

If **No**, display:

**Water Flow Session: No**

---

### Additional Notes

Display:

* Additional Notes

If no note was entered, display:

**No additional notes provided.**

The Report Details page should make it easy for managers and administrators to see:

* Who submitted the report.
* Which responsibilities the staff member accepted.
* Which tasks they completed.
* When those tasks were completed.

---

# 17. Product Name

Replace every occurrence of the current product name (such as **AquaManager**, **FishFarmManager**, or any previous placeholder) with the new product name:

**Pondtora**

This update should be applied consistently throughout the entire application, including but not limited to:

* Authentication pages
* Sidebar
* Dashboard
* Subscription pages
* Settings
* Reports
* Empty states
* Page titles
* Browser title
* Email templates
* Notifications
* Invoice and PDF exports
* Any other location where the product name appears

Ensure there are no remaining references to the previous product name anywhere in the application.

---

# General Requirements

* Implement every update both visually and functionally.
* Maintain the existing page layouts, spacing, typography, and component hierarchy.
* Do not redesign screens unless explicitly instructed.
* Ensure all pages remain fully responsive across desktop, tablet, and mobile.
* Reuse existing components where appropriate.
* Keep the UI consistent with the current design system.
* Ensure no existing functionality is broken while implementing these updates.
