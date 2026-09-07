# Feed Documentation & Feed Inventory Reconciliation Update

## Objective

Refactor the feed reconciliation system to use **Brand + Pellet Size** as the primary reconciliation key instead of **Pellet Size** alone.

This change is required because different feed brands can have the same pellet size while using different **kg per bag** values. Using only the pellet size causes inaccurate bag calculations and unreliable mismatch detection.

The new reconciliation logic must be fully integrated with:

* Feed Inventory
* Feed Documentation
* Bags Opened
* Daily Feed Balance (Carryover)
* Feeding Summary by Brand & Pellet Size

---

# 1. Reconciliation Key

Update the reconciliation system so that all calculations use the following combination:

* Brand
* Pellet Size

**Do not use Feed Stock as the reconciliation key.**

Feed Stock should remain available only for inventory history, traceability, and reporting.

---

# 2. Feed Inventory Update

Update the **Feed Inventory** module to organize inventory using **Brand + Pellet Size**.

### Current Behavior

Currently, whenever feed is added to an existing stock, it accumulates into the existing record instead of creating a new inventory record.

This behavior should remain.

### New Requirement

The accumulation must now happen based on:

* Brand
* Pellet Size

Example:

If the user purchases:

* Skretting 4.0 mm
* Skretting 4.0 mm

The inventory should increase the quantity on the existing **Skretting 4.0 mm** record.

It should **not** create another inventory row.

If the user purchases:

* Coppens 4.0 mm

This should create or update a completely separate inventory record because it is a different Brand.

Example:

| Brand     | Pellet Size | Current Stock |
| --------- | ----------- | ------------: |
| Skretting | 4.0 mm      |       65 Bags |
| Coppens   | 4.0 mm      |       28 Bags |

Even though both are **4.0 mm**, they must remain completely independent inventory records.

### Inventory Rules

Each Brand + Pellet Size maintains its own:

* Available Bags
* Bag Weight (kg per bag)
* Feed Movement History
* Bags Opened History
* Remaining Feed History

The inventory record should remain visible until its stock reaches **0 bags**.

Do not delete or merge inventory records simply because another record uses the same pellet size.

---

# 3. Feed Inventory Integration

The reconciliation system must retrieve the following directly from Feed Inventory:

* Brand
* Pellet Size
* Bag Weight (kg per bag)

The system must **never assume a fixed bag weight**.

Every reconciliation calculation must use the configured bag weight for that Brand and Pellet Size.

If the bag weight is changed in Feed Inventory, all future calculations should use the updated value.

---

# 4. Feed Documentation Integration

Whenever a feeding record is created, the system already knows:

* Brand
* Pellet Size
* Quantity Fed (kg)

Automatically group all feeding records using:

* Brand
* Pellet Size

Then calculate:

**Total Feed Given Today**

This value represents the total kilograms fed for that Brand and Pellet Size on the selected day.

---

# 5. Bags Opened Integration

The Bags Opened module already records:

* Brand
* Pellet Size
* Number of Bags Opened

Using the Bag Weight from Feed Inventory, calculate:

**Feed Added Today = Recorded Bags Opened × Bag Weight**

This becomes the amount of new feed made available for that Brand and Pellet Size.

---

# 6. Daily Feed Balance (Carryover)

Carryover must also become:

* Brand-specific
* Pellet Size-specific

At the beginning of every day:

Automatically retrieve yesterday's remaining quantity for the same:

* Brand
* Pellet Size

This becomes today's Carryover.

Carryover continues to roll forward every day until it is completely consumed.

If no feeding is recorded on a particular day, the carryover should automatically continue to the next day unchanged.

---

# 7. Update Existing **Feeding Summary by Pellet**

**Do not create a new summary section.**

Update the existing **Feeding Summary by Pellet** on the Feed Documentation page to become:

## **Feeding Summary by Brand & Pellet Size**

### Reason

The current summary groups all feed by Pellet Size only.

This is no longer accurate because different brands can have the same pellet size while using different bag weights.

The summary must now group records by:

* Brand
* Pellet Size

This means the same pellet size can appear multiple times if it belongs to different brands.

### Example

Instead of:

| Pellet Size | Total Feed |
| ----------- | ---------: |
| 4.0 mm      |      65 kg |

Display:

| Brand     | Pellet Size | Total Feed |
| --------- | ----------- | ---------: |
| Skretting | 4.0 mm      |      38 kg |
| Coppens   | 4.0 mm      |      27 kg |

### Each Summary Card Should Display

* Brand
* Pellet Size
* Total Feed Today (kg)

Below the total, display:

* Carryover from Yesterday
* Feed Added Today
* Remaining Feed

Example:

**Skretting**

**4.0 mm**

**Total Feed Today:** 38 kg

Feed Breakdown:

* Carryover: 8 kg
* Added Today: 30 kg
* Remaining: 12 kg

### Data Sources

The summary should automatically retrieve data from:

* Feed Documentation (Total Feed Today)
* Daily Feed Balance (Carryover & Remaining)
* Bags Opened (Feed Added Today)
* Feed Inventory (Brand, Pellet Size, Bag Weight)

### Automatic Updates

The summary must refresh automatically whenever:

* Feed Documentation changes
* Bags Opened changes
* Remaining Feed changes
* Feed Inventory changes

### Reconciliation

Each summary card represents one reconciliation group.

The reconciliation engine should perform all calculations separately for every **Brand + Pellet Size** combination.

---

# 8. Reconciliation Logic

For every Brand + Pellet Size:

### Step 1

Calculate:

**Total Feed Given Today**

(from Feed Documentation)

---

### Step 2

Retrieve:

**Carryover from Yesterday**

(from Daily Feed Balance)

---

### Step 3

Calculate:

**Feed Required from New Bags = Total Feed Given Today − Carryover**

If Carryover exceeds Total Feed Given Today, then no additional bags are required.

---

### Step 4

Retrieve:

**Bag Weight**

(from Feed Inventory)

---

### Step 5

Calculate:

**Expected Bags Opened = Feed Required from New Bags ÷ Bag Weight**

Round up because a partial bag cannot be opened.

---

### Step 6

Compare:

* Expected Bags Opened
* Recorded Bags Opened

If they differ:

Flag a reconciliation mismatch.

---

### Step 7

Calculate:

**Expected Remaining = Carryover + Feed Added Today − Total Feed Given Today**

Compare:

* Expected Remaining
* Recorded Remaining

If they differ:

Flag a reconciliation mismatch.

---

# 9. Mismatch Detection

Automatically detect:

* Incorrect bags opened.
* Missing bags opened.
* Extra bags opened.
* Incorrect remaining feed.
* Feed given that exceeds available feed.
* Feed documentation that cannot be reconciled with the selected Brand and Pellet Size.

For every mismatch, display:

* Brand
* Pellet Size
* Expected Value
* Recorded Value
* Difference
* Reconciliation Status

---

# 10. Reconciliation Status

Every Brand + Pellet Size combination should display one of the following:

🟢 **Balanced**

* All calculations reconcile successfully.

🟡 **Warning**

* Minor discrepancy detected.

🔴 **Mismatch**

* Feed Documentation, Bags Opened, Carryover, and Remaining Feed do not reconcile.

Selecting a mismatched record should display the detailed reconciliation breakdown, including the calculated values, recorded values, and the exact difference.

---

# 11. System Synchronization

The following modules must always remain synchronized:

* Feed Inventory
* Feed Documentation
* Bags Opened
* Daily Feed Balance
* Feeding Summary by Brand & Pellet Size
* Reconciliation

Any addition, edit, or deletion in one module must immediately update all related calculations and reconciliation results throughout the system.

---

# Expected Outcome

This update establishes **Brand + Pellet Size** as the single source of truth for feed reconciliation.

By integrating **Feed Inventory**, **Feed Documentation**, **Bags Opened**, **Daily Feed Balance**, and the updated **Feeding Summary by Brand & Pellet Size**, the system can accurately calculate feed usage, expected bags opened, carryover, and remaining feed while detecting mismatches even when multiple brands share the same pellet size but have different **kg per bag** values.

The result is a simpler, more accurate, and fully traceable reconciliation process that mirrors the farm's real-world workflow while eliminating reconciliation errors caused by varying bag weights across different brands.
