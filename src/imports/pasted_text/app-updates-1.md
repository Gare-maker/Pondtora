# Update Request

Please make the following updates to the application. Ensure all changes are reflected in the UI, UX, responsive layouts, and system behavior across desktop, tablet, and mobile.

---

# 1. Fish Stock History

## Add Treatment History

Update the **Fish Stock History Details** popup to include a **Treatment History** section.

Display it as a table.

If there are no treatment records, display an appropriate empty state.

---

## Sticky Date Column

In the Fish Stock History table, make the **Date** column sticky on the left.

When horizontally scrolling the table:

* The Date column should remain fixed.
* All other columns should scroll normally.

---

# 2. Farm Switcher Dropdown

Update the farm selector located in the top-right corner of the application.

When clicked, it should display the same dropdown component used in the left navigation sidebar.

The dropdown should include:

* List of all farms
* Active farm indicator
* Switch Farm
* Add New Farm

Use exactly the same interaction, styling, spacing, and flow as the sidebar farm selector to maintain consistency.

---

# 3. Staff Roles & Permissions

## Create Invoice Permission

Add **Create Invoice** as a permission that can be assigned to staff roles.

---

## Multiple Permissions

When creating or editing staff, allow admins to assign multiple permissions to a role.

### Example

**Feeding & Inventory Staff**

Permissions:

* Feed Documentation
* Feed Inventory
* Create Invoice

Permissions should appear in the Staff table for easy viewing.

---

## New Staff Role: Director

Add a new default role:

### Director

Permissions:

* Everything available to Farm Managers
* Access to Financial Dashboard
* Access to Reports
* Access to every assigned farm
* Can manage invoices
* Can manage staff within assigned farms

Only the Farm Owner (Admin) can create or assign Directors.

---

## Multi-Farm Role Assignment

When the account has multiple farms:

### Farm Owner (Admin)

Can:

* View all farms
* Assign Directors
* Assign Farm Managers
* Manage all staff
* Manage subscriptions

---

### Director

Can:

* Be assigned to one or more farms.
* Access only assigned farms.

---

### Farm Manager

Can:

* Be assigned to one or more farms.
* Access only assigned farms.
* Manage staff within assigned farms.

---

### Staff

Staff members should only access the farm(s) assigned to them.

---

## Farm Assignment

When assigning a Director or Farm Manager, display a multi-select field allowing the admin to choose one or more farms.

The assigned farms determine what data they can access.

---

## Display Assigned Staff

Whenever a farm is selected, display the assigned:

* Director
* Farm Manager

Below the navigation links in the sidebar, display:

* Director Name
* Farm Manager Name

This information should update automatically when switching farms.

---

# 4. Subscription Pricing (Multi-Farm)

Update the Multi-Farm subscription plans.

## Monthly Pricing

### Up to 3 Farms

₦24,000/month

### Up to 5 Farms

₦40,000/month

### Unlimited Farms

₦70,000/month

---

## Yearly Billing

Offer **20% savings** for yearly billing.

Display a persistent **Save 20%** badge.

---

# 5. Financial Dashboard (Mobile)

Update the mobile version.

Instead of displaying all action buttons across the top, replace them with a single overflow menu (three-dot or hamburger menu).

Inside the menu, display:

* Add
* Export CSV
* Export PDF

Display them as a vertical action list similar to modern mobile applications.

---

## Month Filter

Replace the horizontal month list on mobile with a dropdown.

Options should include:

* All Months
* January
* February
* ...

---

# 6. Subscription Page States

Update the subscription page behavior.

## First-Time User

During the free trial:

* Display the **30-Day Free Trial** badge.

---

## After Selecting a Plan

Once a user selects a subscription:

* Remove the Free Tier state.
* The active subscription should display **Current Plan**.
* Other plans should display **Upgrade Plan**.

---

## Trial Expired

When the 30-day trial expires:

* Remove the **30-Day Free Trial** badge.
* Display the correct subscription status.
* Prompt users to subscribe if they have not selected a paid plan.

---

# 7. Feed Inventory

## Feed Purchase History

There should be **two filters**:

* Year
* Month

---

## Edit Feed Purchase

Allow users to edit feed purchase records.

Add an **Edit** icon to every row.

Users should be able to update:

* Supplier
* Feed Brand
* Quantity
* Cost
* Purchase Date
* Notes

Changes should automatically update inventory totals.

---

# 8. Pricing Card Content

## Single Farm Plans

Update the card content.

Move the complete feature list into the **Starter** plan.

Starter includes:

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

The higher plans should simply state:

* Everything in Starter

Plus:

* Number of ponds allowed

Example:

### Growth

* Everything in Starter
* Up to 15 ponds

### Commercial

* Everything in Growth
* Unlimited ponds

All pricing cards should have the same height.

---

## Multi-Farm Plans

Apply the same structure.

The **Up to 3 Farms** plan should contain the complete feature list.

The higher plans should display:

* Everything in Up to 3 Farms

Plus:

* Number of farms allowed

Remove the separate **Every Plan Includes** section.

---

# 9. Subscription Limits

When users reach their subscription limit for:

* Ponds
* Farms

and click:

* Add Pond
* Add Farm

display an upgrade modal.

The popup should say:

> "You've reached the maximum number of ponds/farms allowed on your current subscription."

Buttons:

* Upgrade Plan
* Cancel

---

# 10. Pond Details

## Edit Fish Information

Add an **Edit** button to the Fish Information section.

Users should be able to update:

* Fish Species
* Quantity
* Average Weight
* Supplier
* Stocking Date

---

## Update Fish Quantity

Provide an **Update Quantity** action.

Users should be able to:

* Increase stock
* Reduce stock

The system should automatically update stock totals.

---

# 11. Pond List

Add action buttons.

Each pond row should contain:

* Edit
* Delete

### Rules

A pond can only be deleted if:

* There is no fish stock.
* There is no active inventory.

Otherwise, disable the **Delete** button and display an explanatory message.

---

# 12. Pond Details (Mobile)

Replace all top action buttons with a single overflow menu.

Move these actions into the menu:

* Log Mortality
* Add Pond Cost
* Log Treatment
* Transfer Fish Stock
* Clear Fish Stock

Display them as a vertical action list.

---

# 13. Invoice Management

Allow invoices to be marked as **Error**.

Instead of deleting incorrect invoices:

* Add a **Mark as Error** action.

The invoice should remain in history but display:

**Status: Error**

This status should be updated directly from the Invoice table.

Invoices marked as **Error** should **not** be included in:

* Revenue calculations
* Reports

---

# 14. Feed Documentation

Update the Feed Documentation History table.

Add two new columns:

* Morning Feeding Time
* Evening Feeding Time

These should display the exact times recorded when feeding was logged.

---

# 15. Reports

All staff members should be able to create and submit reports.

Reports should also be editable after submission by users with the appropriate permissions.

---

# 16. Feed Documentation Tabs

On the Feed Documentation page, create tabs below the statistics cards.

The tabs should be:

### Feeding

Keep the existing Feeding tab.

### Bags Opened

Display a table populated with all logged opened feed bags.

This table should be editable.

### Feed Remaining

Display a table containing:

* Feed Brand
* Pellet Size
* Stock Date
* Pond
* Remaining Quantity (kg)

Include a **Log Feed Remaining** button on this page.

---

# General Requirements

* Maintain consistency with the application's existing design system.
* Ensure all updates are fully responsive across desktop, tablet, and mobile.
* Use consistent spacing, typography, colors, and reusable components.
* Keep all dropdowns consistent with the existing Brand dropdown style.
* Add appropriate loading, validation, confirmation, and empty states wherever applicable.
* Ensure all updates automatically synchronize across related modules, including Pond Management, Feed Documentation, Feed Inventory, Fish Stock History, Invoice Management, Financial Dashboard, Reports, Staff Management, and Subscription Management.
* Ensure all new permissions, role assignments, farm assignments, and subscription limits are enforced consistently throughout the application.
