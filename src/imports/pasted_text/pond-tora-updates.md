## Pondtora Update Request

Please implement the following updates. Ensure all changes are reflected in the UI, UX, responsive layouts, and prototype behavior across desktop, tablet, and mobile.

---

# 1. Fix Test Questions Dropdown Position

The **Test Questions** dropdown on the **Staff Assessments** page is not positioning correctly.

### Current Issue

Part of the dropdown opens outside the viewport, making some options inaccessible.

### Requirements

* Position the dropdown so it always remains fully visible.
* Since the button is located near the left side of the page, the dropdown should open toward the **right**.
* Prevent any part of the dropdown from overflowing outside the viewport.
* Maintain the existing dropdown styling, spacing, and animations.
* Clicking outside the dropdown should close it.

---

# 2. Mobile Layout for Staff Assessments Header

Update the mobile layout of the **Staff Assessments** page.

### Requirements

On mobile devices:

* Display the page title and subtitle at the top.
* Place the two primary action buttons directly underneath the header:

  * **Test Questions**
  * **Copy Test Link**
* The buttons should not appear beside the title.
* Allow the buttons to wrap naturally onto multiple lines if necessary.
* Maintain consistent spacing and alignment with the rest of the application.

---

# 3. Fix All Dropdown Positioning on the Staff Assessments Page

The dropdown components on the **Staff Assessments** page are currently overflowing outside the viewport.

### Requirements

Apply the application's standard dropdown positioning behavior to **all dropdowns** on this page.

Rules:

* Dropdowns must always remain completely inside the viewport.
* If a dropdown is close to the left edge, open toward the right.
* If it is close to the right edge, open toward the left.
* If there is not enough space below, open upward.
* If there is enough space below, open downward.
* Clicking anywhere outside the dropdown should immediately close it.

Apply this behavior to:

* Test Questions dropdown
* Copy Test Link dropdown
* Any future dropdowns on the Staff Assessments page

---

# 4. Rename Employee Assessments

Rename **Employee Assessments** throughout the application.

New name:

**Staff Assessments**

This change should be reflected consistently across:

* Navigation
* Page titles
* Headers
* Buttons
* Empty states
* Breadcrumbs
* Notifications
* Internal references
* Any user-facing text

Do not change the functionality. Only update the displayed name.

---

# 5. Feed Documentation - Daily Pellet Summary Enhancement

Add a new **Daily Pellet Summary** section to the **Feed Documentation** page.

This section should automatically summarize all feed documentation records for the currently selected date and group the data by **pellet size (MM)** (e.g., 2.0 mm, 3.0 mm, 4.0 mm, 6.0 mm).

The summary should update automatically whenever:

* The selected date changes.
* A feed record is created.
* A feed record is edited.
* A feed record is deleted.
* Opened bags are logged.
* Remaining feed is updated.

No page refresh should be required.

---

## Information to Display for Each Pellet Size

Each pellet size row or card should display:

* **Pellet Size** (e.g., 4.0 mm)
* **Carryover from Previous Day (kg)**
  Remaining feed carried over from the previous day's opened bags.
* **Feed Added Today (kg)**
  Total kilograms made available today by opening new bags for this pellet size.
* **Bags Opened Today**
  Total number of bags opened today.
* **Total Feed Available (kg)**
  Carryover + Feed Added Today.
* **Total Feed Used Today (kg)**
  Total feed consumed today across all ponds for this pellet size.
* **Closing Balance (kg)**
  Total Feed Available − Total Feed Used Today.

The **Closing Balance** should automatically become the **Carryover from Previous Day** for the next day's Daily Pellet Summary.

---

## Calculation Rules

The Daily Pellet Summary should automatically aggregate all feed documentation records for the selected date.

Follow these rules:

1. Group all feeding records by pellet size.
2. Always consume the previous day's carryover before opening new bags.
3. Only open new bags when the carryover is insufficient.
4. If multiple bags are required, automatically calculate how many bags need to be opened.
5. Any unused feed from newly opened bags becomes the day's Closing Balance.
6. The Closing Balance automatically becomes the Carryover for the following day.

---

## Relationship with Feed Inventory

The **Daily Pellet Summary** and **Feed Inventory** serve different purposes and should not always mirror one another.

### Feed Inventory

The Feed Inventory module remains the master record of:

* Feed purchases
* Current stock levels
* Bags available in inventory
* Inventory deductions when bags are opened

### Daily Pellet Summary

The Daily Pellet Summary is an operational daily ledger that tracks:

* Carryover from the previous day
* Feed added by opening bags on the selected day
* Feed consumed during the selected day
* Closing balance carried into the next day

### Requirements

* Opening a new bag should deduct the appropriate number of bags from **Feed Inventory**.
* The remaining kilograms from that opened bag should be tracked only within the **Daily Pellet Summary** as the operational carryover until fully consumed.
* Editing feed documentation, opened bags, or remaining feed should recalculate the Daily Pellet Summary without altering unrelated historical inventory records.
* The Daily Pellet Summary should calculate its values independently from the inventory display while still using inventory as the source when new bags are opened.
* Inventory values and Daily Pellet Summary values **should not always be identical**, because they represent different operational concepts and different stages of feed usage.

---

## Example Calculation (4.0 mm)

Carryover from Previous Day: **12 kg**

Feed Added Today: **30 kg** (2 bags × 15 kg)

Total Feed Available: **42 kg**

Total Feed Used Today: **37 kg**

Closing Balance: **5 kg**

On the following day:

* Carryover from Previous Day should automatically display **5 kg**.
* The system should consume this **5 kg** before opening any new bags.

---

## Purpose

The Daily Pellet Summary should function as a continuous daily feed ledger.

For every pellet size, users should be be able to immediately understand:

* What feed remained from the previous day.
* How much new feed was made available today.
* How many bags were opened today.
* The total feed available today.
* How much feed was consumed today.
* How much feed remains and will be carried over to the next day.

The layout should be clean, responsive, easy to scan, and fully consistent with the existing Pondtora design system across desktop, tablet, and mobile.
