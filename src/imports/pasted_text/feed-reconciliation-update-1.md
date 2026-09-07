### Feed Documentation & Reconciliation Logic Update

#### 1. Remove Feed Summary by Brand & Pellet

* Remove the entire **Feed Summary by Brand & Pellet** section.
* The Feed Documentation page should now contain only:

  * Statistics Cards
  * Tabs (Daily Feed, Opened Bags, Feed Reconciliation, etc.)
* Do not replace it with another summary section.

---

## Log Remaining Feed Popup

Rewrite the popup.

Replace **Fish Stock** as the first selectable field with **Pond**.

### Fields

* Pond (Dropdown)
* Fish Stock (Automatically populated from the selected pond)
* Feed Brand
* Pellet Size
* Remaining Feed (kg)
* Note (Optional)

### Behavior

* Selecting a pond automatically loads all active fish stocks in that pond.
* Users should not manually search for fish stocks after selecting the pond.
* Remaining Feed is always recorded against:

  * Feed Brand
  * Pellet Size
  * Fish Stock

---

## Opened Bags

Logging Opened Bags should contain:

* Feed Brand
* Pellet Size
* Fish Stock
* Number of Bags Opened

The system automatically deducts inventory using:

* Feed Brand
* Pellet Size

No additional inventory registration is required.

---

## Opened Bags Table

Replace the current table structure.

### New Columns

* Feed Brand
* Pellet Size
* Fish Stock
* Bags Opened
* Remaining Feed (kg)

Do **not** create duplicate rows.

The system should automatically merge data using:

* Feed Brand
* Pellet Size
* Fish Stock

For example:

If the user logs **Opened Bags** and later logs **Remaining Feed** using the same:

* Feed Brand
* Pellet Size
* Fish Stock

both records belong to the same row.

The **Remaining Feed** column should automatically update.

---

# Daily Feed Editing

When the **Edit** icon is clicked on the Daily Feed tab:

* Open the exact same popup used for creating feed documentation.
* Provide two edit modes:

  * Daily Feed
  * Remaining Feed
* Load all previously saved values automatically.

---

## Preserve Daily Feed Session

If a user logs feed for one pond and saves it, then clicks **Log Feed** again on the same day:

* Do not reset the popup.
* Keep:

  * Selected Date
  * Current Day Session
* Allow the user to continue documenting another pond for that same day.

---

# Feed Reconciliation

Rewrite the reconciliation logic.

Reconciliation is tied only to the selected date.

Remove the **Date** column entirely from the reconciliation table.

---

## Reconciliation Calculation

The reconciliation must be driven by kilograms, not bag count.

### Step 1

Group all Daily Feed records by:

* Feed Brand
* Pellet Size
* Fish Stock

Sum the total kilograms fed across every pond containing that Fish Stock.

---

### Step 2

Retrieve yesterday's Remaining Feed.

Subtract it from today's total feed.

The result equals the kilograms that had to come from newly opened bags.

---

### Step 3

Retrieve the bag weight from Feed Inventory.

Calculate:

**Required KG ÷ KG per Bag**

to determine the expected number of bags opened.

---

### Step 4

Compare:

* Expected Bags Opened
* Recorded Bags Opened

If they differ:

Flag a **Bag Count Mismatch**.

---

### Step 5

Calculate Expected Remaining:

**Expected Remaining = (Bags Opened × Bag Weight) − Total Feed Given**

Compare that value with the recorded Remaining Feed.

If different:

Flag a **Remaining Mismatch**.

---

## Reconciliation Statuses

Do not only support a generic mismatch.

Support multiple reconciliation states:

* Matched
* Remaining Mismatch
* Bag Count Mismatch
* Feed Quantity Mismatch
* Multiple Mismatches

Each status should use a clear color-coded badge.

---

## Reconciliation Table

Update the table.

The first column must be:

**Fish Stock**

This column must remain sticky while horizontally scrolling.

Other columns should include:

* Pellet Size
* Feed Brand
* Pond
* Expected Feed
* Recorded Feed
* Expected Bags Opened
* Recorded Bags Opened
* Expected Remaining
* Recorded Remaining
* Reconciliation Status

---

## Reconciliation Details

When a reconciliation row is opened, do **not** display confusing labels such as:

* Valid
* Feed Available
* Feed Given

Instead, display the complete calculation process step by step.

### Example Layout

**Step 1**

Total Feed Given

25 kg

**Step 2**

Yesterday's Remaining

8 kg

**Step 3**

Required New Feed

25 − 8 = 17 kg

**Step 4**

Expected Bags

17 ÷ 15 kg = 1.13

Rounded to:

2 Bags

**Step 5**

Recorded Bags

1 Bag

❌ **Bag Count Mismatch**

**Step 6**

Expected Remaining

Calculated Remaining

**Step 7**

Recorded Remaining

Comparison

Highlight exactly where the mismatch occurred so users can immediately understand why the reconciliation failed.

---

## Mobile Reconciliation

On mobile devices:

Tapping a reconciliation row should always open a responsive popup.

This applies regardless of where it is opened:

* Feed Reconciliation page
* Notifications page
* Any other navigation path

Never attempt to display full reconciliation details inside the table.

---

## Reconciliation Notifications

If any reconciliation issue exists:

Display:

* An animated red notification dot on the Reconciliation tab.
* A notification in the Notifications page.

The notification should include:

* Pond
* Fish Stock
* Pellet Size
* Reconciliation Status

When the user resolves the reconciliation:

* Remove the notification automatically.
* Remove the animated notification dot automatically.

---

## Daily Feed Table

Keep all existing Daily Feed columns.

Do **not** remove existing information.

Add the new fields alongside the existing columns.

Do **not** duplicate any columns.

Remove these columns from the Daily Feed table:

* Carryover
* Added Today
* Remaining

These values are now calculated through the reconciliation process and should no longer appear in the Daily Feed table.

---

## Feed Remaining Logic

Remaining Feed is now logged directly by the user.

The logged Remaining Feed becomes the official Remaining value for reconciliation.

Expected Remaining is calculated by the system.

Recorded Remaining comes from the user.

The reconciliation compares both values to determine whether a mismatch exists.

---

## Opened Bags Editing

Clicking the **Edit** icon on the Opened Bags table should allow the user to edit either:

* Bags Opened
* Remaining Feed

using the same edit interface.
