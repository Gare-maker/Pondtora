# Product Requirements Document (PRD)

# Fish Pond Management System (FPMS)

**Version:** 3.0 (Revised MVP)
**Status:** MVP Scope
**Platform:** Web Application

---

# 1. Product Overview

## Purpose

The Fish Pond Management System (FPMS) is a web-based farm management platform that enables fish farmers to manage their entire farm from one centralized dashboard.

The platform focuses on:

* Financial management
* Pond management
* Feed inventory
* Feeding documentation
* Production cost tracking
* Notifications and reminders

The system is designed to reduce manual record keeping, improve inventory accuracy, minimize feed wastage, and provide complete operational visibility.

---

# 2. Product Goals

## Primary Goals

* Digitize farm operations
* Track financial performance
* Manage ponds efficiently
* Track feed inventory accurately
* Record daily feeding activities
* Reduce inventory errors
* Improve profitability
* Generate operational insights

---

# 3. User Roles

## Admin

Permissions

* Full system access
* Manage ponds
* Manage inventory
* Record financial data
* View reports
* Configure notifications

---

## Employee

Permissions

* Log feeding
* Open feed bags
* Record mortality
* View assigned ponds

Restrictions

* Cannot delete records
* Cannot modify financial records

---

## Viewer

Permissions

* Read-only access

---

# 4. Product Modules

The MVP consists of six modules.

1. Financial Dashboard
2. Pond Management
3. Feed Inventory
4. Feed Documentation
5. Pricing
6. Notifications

---

# 5. Financial Dashboard

## Objective

Provide a complete financial overview of the farm.

---

## Dashboard Metrics

Display

* Total Revenue
* Total Expenses
* Net Profit
* Feed Costs
* Fish Stock Costs
* Maintenance Costs
* General Overhead
* Inventory Value
* Total Ponds
* Total Fish Population

---

## Financial Actions

### Add Expense

Fields

* Category
* Amount
* Date
* Pond (Optional)
* Description

Expense Categories

* Feed
* Fish Stock
* Maintenance
* Medication
* Utilities
* Labor
* Transportation
* General Overhead
* Miscellaneous

---

### Add Revenue

Fields

* Revenue Source
* Amount
* Date
* Notes

Revenue Sources

* Fish Sales
* Pond Rental
* Other Income

---

## Financial Analytics

Display

* Cost vs Revenue Graph
* Monthly Profit Trend
* Expense Breakdown
* Revenue Breakdown

---

# 6. Pond Management

## Objective

Manage every pond and all activities associated with it.

---

## Pond Overview

Display

* Total Ponds
* Active Ponds
* Empty Ponds
* Total Fish Population
* Aggregate Pond Costs

---

## Pond List

Each card displays

* Pond Name
* Pond ID
* Pond Type
* Current Fish Count
* Pond Status
* Total Cost

---

## Add New Pond

Fields

* Pond Name
* Pond ID
* Pond Type
* Pond Size
* Water Capacity
* Maximum Stock Capacity
* Initial Fish Stock
* Average Fish Weight
* Stocking Date
* Notes

---

# Pond Details

The Pond Details page becomes the operational dashboard for an individual pond.

---

## Fish Information

Display

* Initial Fish Stock
* Current Fish Count
* Average Fish Weight
* Stocking Date
* Current Mortality
* Mortality Rate

---

## Mortality

Button

**Log Mortality**

Fields

* Date
* Number of Dead Fish
* Cause
* Notes

---

### Mortality Logic

Current Fish Count

=

Current Fish Count

−

Dead Fish

Mortality Rate

=

(Total Dead Fish ÷ Initial Fish Stock)

×

100

The system updates automatically

* Current Fish Count
* Mortality Percentage
* Pond Statistics

---

## Cost Tracking

Button

Add Pond Cost

Fields

* Category
* Amount
* Date
* Description

---

## Feed Summary

Automatically grouped by Brand and Feed Size.

Example

| Brand   | Size | Total Feed Given |
| ------- | ---- | ---------------- |
| Coppens | 2mm  | 24kg             |
| Coppens | 4mm  | 75kg             |
| Aqua    | 6mm  | 112kg            |

These totals are generated automatically from Feeding Documentation.

No manual editing.

---

## Feeding History

Display

* Date
* Feed Brand
* Feed Size
* Morning Feed
* Evening Feed
* Total Feed
* Employee

Example

12 June

Coppens

2mm

Morning

2kg

Evening

1kg

Total

3kg

---

## Pond Performance

Display

* Fish Growth
* Mortality Trends
* Feed Consumption
* Cost Trends

---

## Daily Feeding Calculator

Purpose

Recommend daily feed requirements.

Inputs

* Fish Count
* Average Weight
* Feeding Rate

Outputs

* Recommended Feed Size
* Morning Feed
* Evening Feed
* Daily Feed Required

---

# 7. Feed Inventory

## Objective

Manage unopened feed stock.

Inventory and feeding are intentionally separated.

---

## Inventory Summary

Display

* Total Bags
* Total Kilograms
* Opening Inventory
* Feed Purchased
* Feed Issued (Opened Bags)
* Closing Inventory

---

## Feed Purchase

Fields

* Purchase Date
* Feed Brand
* Feed Size
* Bags Purchased
* Weight Per Bag
* Cost Per Bag
* Supplier

---

# Open Feed Bags

Purpose

Issue feed from inventory into operational use.

This is the ONLY place inventory is deducted.

---

## Log Open Bags

Fields

* Date
* Feed Brand
* Feed Size
* Number of Bags Opened
* Weight Per Bag
* Opened By

---

### System Logic

When submitted

1.

Verify available bags

↓

2.

Deduct opened bags from inventory

↓

3.

Create Open Feed Batch

↓

4.

Calculate total available kilograms

---

Example

Inventory

Coppens

4mm

20 Bags

User Opens

3 Bags

Inventory becomes

17 Bags

Open Feed Batch

75kg

---

## Open Feed Batches

Display

* Feed Brand
* Feed Size
* Bags Opened
* Initial Weight
* Remaining Weight
* Date Opened
* Status

Status

* Open
* Completed

---

## Inventory History

Display

* Purchases
* Bags Opened
* Inventory Adjustments

---

## Feed Forecast Calculator

Purpose

Estimate total feed needed until harvest.

Inputs

* Fish Count
* Current Weight
* Target Weight
* FCR
* Feed Bag Weight
* Cost

Outputs

* Feed Required (kg)
* Bags Required
* Estimated Cost
* Monthly Feed Plan

---

# 8. Feed Documentation

## Objective

Document every feeding event.

Feed Documentation DOES NOT deduct inventory.

It deducts only from Open Feed Batches.

---

## Log Feeding

Fields

* Date
* Pond
* Open Feed Batch
* Feed Brand
* Feed Size
* Morning Feed
* Evening Feed
* Notes

---

### Feeding Logic

System

Calculate

Morning +

Evening

=

Total Feed

↓

Deduct from Open Feed Batch Remaining Weight

↓

Update Remaining Weight

↓

Create Feeding Record

↓

Update Pond Feed History

↓

Update Pond Feed Summary

---

Example

Open Feed Batch

75kg

Morning

8kg

Evening

10kg

Remaining

57kg

Inventory stays unchanged.

---

## Pond Integration

Every feeding record automatically updates the selected pond.

The system maintains cumulative feed totals grouped by:

* Feed Brand
* Feed Size

Example

Today

Pond 1

Coppens

2mm

2kg

Tomorrow

Pond 1

Coppens

2mm

4kg

System automatically updates

Coppens

2mm

6kg Total

---

## Feeding History

Display

* Date
* Pond
* Feed Brand
* Feed Size
* Morning Feed
* Evening Feed
* Total Feed
* Recorded By

---

## Filters

* Pond
* Brand
* Feed Size
* Date Range

---

## Outputs

* Daily Feed Usage
* Feed History
* Feed Usage by Pond
* Feed Usage by Brand
* Feed Usage by Feed Size
* Remaining Open Feed Stock

---

# 9. Pricing

## Objective

Calculate production costs and profitability.

Display

* Cost Per Fish
* Cost Per Pond
* Feed Cost Allocation
* Operational Cost Allocation
* Expected Revenue
* Expected Profit
* Suggested Selling Price
* ROI

---

# 10. Notifications

## Feeding

* Morning Reminder
* Evening Reminder

---

## Inventory

* Low Stock
* Reorder Alert
* Out of Stock

---

## Pond

* Mortality Alert
* Sampling Reminder
* Harvest Reminder

---

## Financial

* High Expense Alert
* Monthly Summary
* Revenue Performance Alert

---

# 11. Data Relationships

The platform follows one source of truth.

Feed Purchase

↓

Feed Inventory

(Unopened Bags)

↓

Open Feed Bags

↓

Open Feed Batch

↓

Feed Documentation

↓

Pond Feed History

↓

Pond Feed Summary

This ensures:

* Inventory is deducted only once.
* Feeding history remains accurate.
* Every pond has a complete feeding record.
* Remaining feed can always be tracked.

---

# 12. Business Rules

## Inventory Rules

* Inventory stores unopened bags only.
* Feeding never deducts inventory.
* Only "Open Feed Bags" deduct inventory.

---

## Open Feed Rules

* Every opened bag creates an Open Feed Batch.
* Multiple Open Feed Batches can exist simultaneously.
* Feed is consumed only from an Open Feed Batch.
* When Remaining Weight reaches 0kg, the batch status changes to Completed.

---

## Feeding Rules

* Every feeding record must reference an Open Feed Batch.
* Every feeding record must reference a Pond.
* Feed records automatically update Pond Feed Summary.
* Feed records automatically update Pond Feed History.

---

## Pond Rules

* Every pond maintains its own feed history.
* Feed totals are grouped by Feed Brand and Feed Size.
* Mortality automatically updates Current Fish Count.
* Current Fish Count can never exceed Initial Fish Stock.

---

# 13. Future Roadmap

Phase 2

* Water Quality Monitoring
* AI Feed Recommendations
* Growth Forecasting
* WhatsApp Notifications

Phase 3

* Multi-Farm Management
* Fish Marketplace
* Veterinary Module
* Market Price Intelligence

---

# MVP Scope

The first release includes:

* Financial Dashboard
* Pond Management
* Feed Inventory
* Open Feed Bag Management
* Feed Documentation
* Daily Feeding Calculator
* Feed Forecast Calculator
* Pricing
* Notifications

This architecture provides a scalable foundation for fish farm operations while ensuring inventory accuracy, traceable feeding records, and clear separation between stock management and daily farm activities.
