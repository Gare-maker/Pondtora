# Additional System Updates

## 1. Daily Feed Table

Update the **Daily Feed** table on the Feed Documentation page.

### Fish Stock Column

Add a new **Fish Stock** column.

The Fish Stock should **not** be selected manually.

Instead, when a user selects a **Pond** while logging feed, the system should automatically determine the active Fish Stock assigned to that pond and populate the Fish Stock column in the Daily Feed table.

This ensures the Daily Feed table always identifies which Fish Stock was fed while avoiding duplicate data entry.

---

# 2. Pond Expenses

Update the **Log Expense** popup.

When an expense is related to a pond:

* After selecting the Pond, automatically display or populate the Fish Stock currently assigned to that pond.
* Save the Fish Stock together with the expense record.

This allows all pond-related expenses to also be tracked by Fish Stock for future reporting and analysis.

---

# 3. Fish Stock History Details - Individual Pond Section

Enhance the **Individual Pond Breakdown** section in the Fish Stock History Details popup.

Each pond already belongs to a specific Fish Stock and allows users to configure **Max KG per Pellet**.

Display this information inside each Pond card.

Each Pond card should include:

* Pond Name
* Pond Category
* Fish Stock
* Stocking Date
* Current Number of Fish
* Total Feed Given
* Feed Summary by Pellet
* **Max KG per Pellet** (display for each configured pellet size)
* Total Mortality
* Mortality Rate
* Treatment History (only treatments performed while the Fish Stock was in that pond)
* Pond Status

  * Active
  * Cleared
  * Sold
* Date Cleared or Sold (if applicable)

### Max KG per Pellet

The Max KG values displayed here should be the values configured for **that specific Fish Stock within that specific pond**.

Since the same Fish Stock may exist in multiple ponds, use the **Pond ID** together with the Fish Stock to retrieve the correct Max KG per Pellet values.

Do not combine or mix Max KG values across different ponds.

Each Pond card should display only its own configured Max KG per Pellet values.

---

# 4. Feed Inventory Update

## New Feature: Feed Requirement Calculator

Add a new **Feed Requirement Calculator** button to the **Feed Inventory** page.

Place it on the same row as the **Add Feed Purchase** button.

Selecting this button opens the Feed Requirement Calculator.

This calculator is a **planning tool only**.

It helps farmers estimate:

* Number of bags required
* Total feed required (kg)
* Estimated purchase cost (optional)

The calculator **must not** create inventory records or modify inventory quantities.

---

# Calculator Flow

The calculator should have three stages:

1. Input
2. Calculation
3. Results

---

# Stage 1 - Calculator Inputs

## Section A: Stock Quantity

Display one required field.

**Number of Fish**

Example:

5,000

---

## Section B: Feed Cost (Optional)

Display a divider below the Number of Fish field.

Section title:

**Feed Cost (Optional)**

Allow users to enter the price per bag for each pellet size.

| Pellet Size | Price per Bag |
| ----------- | ------------- |
| 2.0 mm      | User Input    |
| 3.0 mm      | User Input    |
| 4.0 mm      | User Input    |
| 6.0 mm      | User Input    |
| 9.0 mm      | User Input    |

This section is optional.

If left empty, calculate feed requirements normally but omit cost calculations.

---

# Customize Calculator

Inside the calculator, add a **Customize Calculator** button.

Selecting it opens a configuration screen where users can edit the default feeding standards.

For each pellet size, allow editing of:

* Bags Required per 1,000 Fish
* KG per Bag

### Default Values

| Pellet Size | Bags / 1,000 Fish | KG per Bag |
| ----------- | ----------------- | ---------- |
| 2.0 mm      | 3                 | 15 kg      |
| 3.0 mm      | 8                 | 15 kg      |
| 4.0 mm      | 15                | 15 kg      |
| 6.0 mm      | 24                | 15 kg      |
| 9.0 mm      | 14                | 15 kg      |

Provide a **Reset to Default** button.

User changes should persist and be used for future calculations until reset.

---

# Calculate

Display a primary button:

**Calculate Feed Requirement**

Selecting this button generates the results.

---

# Stage 2 - Results

Display a summary table.

| Pellet Size | Bags Required | Total Feed (kg) | Price per Bag | Estimated Cost |

---

# Calculation Logic

## Bags Required

For each pellet size:

**Bags Required = (Number of Fish ÷ 1,000) × Bags Required per 1,000 Fish**

Support decimal values.

Example:

500 fish

2.0 mm

= 1.5 Bags

---

## Total Feed (kg)

**Total Feed = Bags Required × KG per Bag**

Example:

15 Bags × 15 kg = 225 kg

---

## Estimated Cost (Optional)

If a Price per Bag is entered:

**Estimated Cost = Bags Required × Price per Bag**

If no price is entered, display:

—

---

# Results Summary

Display:

* Total Bags Required
* Total Feed Required (kg)
* Grand Total Estimated Cost (only if prices were entered)

Example:

Total Bags Required

120 Bags

Total Feed Required

1,800 kg

Grand Total Estimated Cost

₦2,450,000

---

# Export

Provide an **Export** button.

Support:

* PDF
* CSV

The exported report should include:

* Number of Fish
* Calculation Date
* Pellet Size
* Bags Required
* Total Feed (kg)
* Price per Bag (if entered)
* Estimated Cost (if entered)
* Total Bags Required
* Total Feed Required (kg)
* Grand Total Estimated Cost (if applicable)

The exported report should have a clean, printable layout suitable for budgeting, purchasing, and sharing with staff or suppliers.

---

# Purpose

The Feed Requirement Calculator is a planning tool that estimates feed requirements for a given number of fish.

It calculates:

* Required bags for each pellet size
* Total kilograms of feed required
* Optional estimated feed costs
* Overall feed budget

The **Customize Calculator** feature allows farms to tailor feeding standards to their own practices while maintaining a **Reset to Default** option.

The **Export** feature allows the calculation to be saved as a PDF or CSV for budgeting, purchasing, planning, and record-keeping without affecting the actual Feed Inventory.
