# Feed Documentation Updates

## 1. Global Success Toast Notifications

Implement a consistent success toast notification across the entire application.

Whenever a user successfully creates or logs data, display a toast notification such as:

> **Added successfully**

This should apply to all create/log actions, including (but not limited to):

* Feed documentation
* Revenue records
* Expense records
* Feed purchases
* Reports
* Mortality records
* Treatments
* Pond costs
* Fish transfers
* Stock records
* Staff assessments
* Any other successful create action

The toast component should use the same style, animation, and placement throughout the application.

---

# Feed Documentation Page Updates

## 2. Rename the Feeding Tab

On the **Feed Documentation** page, update the existing **Feeding** tab only.

Rename it to:

**Daily Feed**

Update every reference within the Feed Documentation page to use this new name.

---

## 3. Update the Daily Feed Table

Expand the **Daily Feed** table with the following columns:

| Date | Brand | Pellet Size | Stock | Carryover (kg) | Added Today (kg) | Remaining (kg) |
| ---- | ----- | ----------- | ----- | -------------- | ---------------- | -------------- |

### Column Definitions

### Carryover (kg)

* The quantity of feed carried forward from the previous day's remaining feed.
* If no carryover exists, display **—**.

### Added Today (kg)

* The quantity of feed introduced today from newly opened bags.
* If no new bags were opened, display **—**.

### Remaining (kg)

* The quantity of feed left after today's feeding.
* This value automatically becomes tomorrow's Carryover.
* If no remaining feed exists, display **—**.

Example

| Date   | Brand     | Pellet Size | Stock      | Carryover | Added Today | Remaining |
| ------ | --------- | ----------- | ---------- | --------- | ----------- | --------- |
| 27 Jun | Omega Top | 2.0 mm      | Stock #001 | 25 kg     | 15 kg       | 20 kg     |

This allows the user to quickly understand:

* What was carried over from yesterday
* How much new feed was introduced today
* What remains after today's feeding

All values must be tied to:

* Pond
* Fish Stock
* Selected Date

Carryover should always come from the previous day's Remaining value.

Remaining should automatically become the Carryover for the following day.

---

# 4. Replace Daily Pellet Summary

Remove the existing **Daily Pellet Summary** section.

Replace it with a new section called:

# Feeding Summary by Pellet

This section should automatically summarize all feed documentation records entered for the selected day.

Display pellet sizes in this order:

* 0.8 mm
* 1.5 mm
* 2.0 mm
* 3.0 mm
* 4.0 mm
* 6.0 mm

Only display pellet sizes that contain feed records for the selected date.

---

## Each Pellet Card Should Display

**Pellet Size**

**Total Feed Today (kg)**

Divider

**Feed Breakdown**

* Carryover from Yesterday
* Added Today
* Remaining

Example

### 4.0 mm

**Total Feed Today**

38 kg

──────────────

**Feed Breakdown**

Carryover from Yesterday: **8 kg**

Added Today: **30 kg**

Remaining: **12 kg**

### Definitions

**Carryover from Yesterday**

The remaining feed brought forward from the previous feeding day.

**Added Today**

The quantity of feed introduced today through newly opened bags.

**Remaining**

The quantity of feed left after today's feeding, which automatically becomes tomorrow's Carryover.

The Feeding Summary by Pellet should update automatically whenever feed documentation is:

* Added
* Edited
* Deleted

The purpose of each card is to immediately answer:

* What did I start today with?
* What did I add today?
* How much did I feed today?
* What remains after feeding?

---

# 5. Remove Remaining Feed Tab

Remove the **Remaining Feed** tab completely from the Feed Documentation page.

All remaining feed information is now incorporated into the **Daily Feed** table and the **Feeding Summary by Pellet** section.

There should no longer be a separate Remaining Feed tab.

---

# Feed Reconciliation (Mismatch) Subpage

Create a new subpage called:

**Feed Reconciliation**

or

**Feed Mismatch**

This page helps users identify inconsistencies between:

* Feed Given
* Carryover
* Bags Opened
* Remaining Feed

The reconciliation must always be calculated using **kilograms**, not bag count.

---

## Reconciliation Logic

### Step 1

For each pellet size, sum all feed given across every stock.

Example (2.0 mm)

* June Stock = 12 kg
* July Stock = 13 kg

**Total Feed Given = 25 kg**

---

### Step 2

Subtract yesterday's Carryover.

Example

Carryover = 8 kg

25 kg − 8 kg

= **17 kg**

This is the quantity of new feed required today.

---

### Step 3

Determine the expected number of bags opened.

Use the configured bag weight from Feed Inventory.

Example

Bag Weight = 15 kg

17 ÷ 15 = 1.13 bags

Round up.

Expected Bags Opened = **2**

If Bag Weight = 25 kg

17 ÷ 25 = 0.68 bags

Expected Bags Opened = **1**

Bag count is derived from kilograms.

Kilograms are always the source of truth.

---

### Step 4

Compare:

* Expected Bags Opened
* Recorded Bags Opened

If they differ, flag a mismatch.

---

### Step 5

Calculate the expected remaining.

Feed Available =

Carryover +

(Expected Bags Opened × Bag Weight)

Expected Remaining =

Feed Available − Total Feed Given

Compare:

* Expected Remaining
* Recorded Remaining

If they differ, flag a mismatch.

---

## Mismatch Table

Include the following columns:

* Date
* Pellet Size
* Total Feed Given
* Carryover
* Expected Bags Opened
* Recorded Bags Opened
* Expected Remaining
* Recorded Remaining
* Status

Status examples:

* Match (Green)
* Mismatch (Red)

Clicking a mismatch should open a detailed breakdown showing every calculation step so users can quickly identify where the discrepancy occurred.

---

# Staff Assessment Dropdown Improvements

The dropdown menus on the **Staff Assessment** page are not behaving correctly.

Update both dropdowns (**Test Questions** and **Copy Test Link**) with the following behavior.

### Layout

* Dropdown width should hug its content while respecting internal padding.
* Maintain consistent padding on all sides.
* Do not stretch unnecessarily.
* Never overflow outside the viewport.

### Smart Positioning

* The left dropdown should open to the **right**.
* The right dropdown should open to the **left**.
* If near the bottom of the viewport, open upward.
* If near the top, open downward.

### Viewport Rules

Dropdowns must always remain fully visible.

They should automatically reposition themselves whenever necessary so that no part of the menu is clipped off-screen.

Use the same responsive dropdown behavior across the entire application for consistency.
