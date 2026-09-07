I've updated the logic to reflect exactly what you described. The key point is that there is **only one date field** in the entire system: **Stocking Date**. There is no record creation date, grouping date, or any other date used for grouping.

# Fish Stock History & Subscription Updates

## 1. Subscription Page

Update the main **Subscription** page inside the application.

* Change the button text from **Get Plans** to **Get Plan**.
* This change applies only to the Subscription page inside the app.
* The onboarding subscription flow should remain unchanged.

---

# 2. Log Remaining Feed Validation

Update the **Log Remaining Feed** popup.

Make all input fields required, just like the **Log Opened Bags** popup.

Required fields:

* Feed Brand
* Pellet Size
* Fish Stock
* Remaining Feed (kg)

The form must not be submitted until every required field has been completed, and appropriate validation messages should be displayed.

---

# 3. Fish Stock Creation

Update the **Add Fish Stock** popup.

Add the following required input fields:

* Supplier Name
* Stocking Date

The **Stocking Date** is entered only once when the Fish Stock is created.

Store both values with the Fish Stock record.

Display them in the Fish Stock History Details page.

---

# 4. Fish Stock History Redesign

Redesign the Fish Stock History module to be **stock-centric** rather than **pond-centric**.

A single Fish Stock may exist in multiple ponds, so the Fish Stock History must automatically aggregate information across every pond containing that Fish Stock.

Remove the **Pond** column from the Fish Stock History table.

Each row should represent a single Fish Stock.

---

# 5. Stocking Date (Primary Grouping Key)

The **Stocking Date** is the **only date field** used to identify and group a Fish Stock throughout the system.

There should be **only one Stocking Date input** when creating a Fish Stock.

The system should **not** use:

* Record creation date
* Log creation date
* Feed documentation date
* Treatment date
* Transfer date
* Any other date

for grouping Fish Stock History.

Instead, the Stocking Date entered during Fish Stock creation becomes the permanent identifier for that Fish Stock.

### Grouping Rule

Whenever two or more Fish Stock records share:

* The same Fish Stock
* The same Stocking Date

the system must treat them as the **same Fish Stock lifecycle**.

All records belonging to those Fish Stocks should automatically be grouped into a single Fish Stock History.

If the Stocking Date is different, the system should create a separate Fish Stock History.

---

# 6. System-wide Behaviour

Every module that records information about a Fish Stock must automatically inherit the Fish Stock's Stocking Date.

This includes:

* Feeding
* Mortality
* Feed Remaining
* Bags Opened
* Feed Reconciliation
* Treatments
* Feed Summary by Pellet
* Notifications
* Fish Stock History
* Any future stock-related modules

Users should never be asked to enter the Stocking Date again after creating the Fish Stock.

The system should retrieve it automatically from the Fish Stock record.

---

# 7. Automatic Fish Stock Aggregation

Whenever multiple ponds contain the same Fish Stock with the same Stocking Date, the system should automatically combine their information.

Aggregate:

* Total Number of Fish
* Total Feed Given
* Feed Summary by Pellet
* Total Mortality
* Mortality Rate
* Death Records
* Feed Reconciliation
* Bags Opened
* Remaining Feed
* Treatment History
* Notifications
* Supplier Name
* Stocking Date
* Harvest/Clearing Status
* Any future stock-related information

Aggregation should automatically update whenever records are added, edited, deleted, or transferred.

---

# 8. Pond Transfers

Fish transfers must never create a new Fish Stock History.

When fish are transferred:

* Keep the original Stocking Date.
* Continue aggregating all information into the same Fish Stock History.
* Only the pond location changes.

The Stocking Date always remains the same unless an administrator intentionally edits it.

---

# 9. Fish Stock History Details

## Section 1 — Overall Fish Stock Summary

Display the combined information across every pond sharing the same:

* Fish Stock
* Stocking Date

Include:

* Fish Stock Name
* Supplier Name
* Stocking Date
* Total Number of Fish
* Total Feed Given
* Feed Summary by Pellet
* Total Mortality
* Mortality Rate
* Treatment Summary
* Harvest/Clearing Summary

---

## Section 2 — Pond Breakdown

Display each pond separately.

Each pond card should include:

* Pond Name
* Current Fish Count
* Total Feed Given
* Feed Summary by Pellet
* Mortality
* Treatment History (performed while the Fish Stock was in that pond)
* Date Cleared (if applicable)

This provides both the overall Fish Stock performance and the contribution of each pond.

---

# 10. Fish Stock Assignment Logic

When assigning a Fish Stock to a pond:

The system should compare:

* Fish Stock
* Stocking Date

If another pond already contains the same Fish Stock with the same Stocking Date:

* Do not create another Fish Stock History.
* Automatically merge the data into the existing Fish Stock History.
* Continue aggregating future records into the same Fish Stock History.

If the Stocking Date is different, create a separate Fish Stock History because it represents a different stocking batch.

---

# 11. Mobile Pond List

Update the mobile Pond List.

Each pond card should display the Fish Stock(s) currently assigned to that pond.

Users should immediately know which Fish Stock(s) are inside each pond without opening Pond Details.

---

# 12. Fish Stock History Export

Add export functionality to the Fish Stock History Details page.

Support:

* PDF
* CSV

Exports should include:

* Overall Fish Stock Summary
* Pond Breakdown

---

# Example

Batch A is created with:

* Supplier: XYZ Hatchery
* Stocking Date: 1 January 2026

The same Fish Stock is later assigned to:

* Pond 1
* Pond 2
* Pond 5

Because all three records share the same Fish Stock and the same Stocking Date (1 January 2026), the system treats them as one Fish Stock lifecycle.

Every feeding record, mortality record, treatment, reconciliation, remaining feed, bags opened, and notification is automatically aggregated into one Fish Stock History.

Each pond still maintains its own operational records, while the Fish Stock History provides a single, complete lifecycle view of that Fish Stock.
