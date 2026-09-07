# System Audit Updates Required

The following items were identified during the system audit and need to be implemented or corrected before the application is considered backend-ready.

---

# 1. Opened Bags Must Be Fully Linked to Fish Stock

## Current Issue

Although the **Log Opened Bags** popup allows users to select:

* Feed Brand
* Pellet Size
* Fish Stock
* Number of Bags Opened

the selected **Fish Stock** is not actually being stored because the backend data model does not currently include a Fish Stock field.

As a result, the selected Fish Stock is lost after submission.

### Required Update

Update the Opened Bags schema so every record permanently stores:

* Feed Brand
* Pellet Size
* Fish Stock
* Number of Bags Opened

The Fish Stock must become part of the stored record and be available throughout the application for reconciliation, reporting, history, and backend processing.

---

# 2. Opened Bags Must Be Linked to Fish Stock Only

Opened Bags should never be associated with a Pond.

They should always be associated with the selected Fish Stock.

Every downstream feature must reference the Fish Stock, including:

* Feed Reconciliation
* Remaining Feed
* Fish Stock History
* Reports
* Notifications

---

# Staff Permissions & Access Control

The permission structure already exists but is not currently enforced.

The entire permission system must become functional.

---

# 3. Navigation Visibility

Users should only see pages they have permission to access.

Navigation items without permission should not be rendered.

---

# 4. Page Access Protection

Even if a user manually navigates to a page through a URL or deep link, the system must verify permissions before rendering it.

Unauthorized users should be denied access.

---

# 5. Action Button Permissions

Every action button throughout the application must respect permissions.

Examples include:

* Add Pond
* Edit Pond
* Delete Pond
* Add Fish Stock
* Add Expense
* Add Revenue
* Add Purchased Feed
* Log Feed
* Log Remaining Feed
* Log Opened Bags
* Invite Staff
* Create Invoice
* Staff Assessment
* Reports
* Inventory Actions

Users without permission should neither see nor use these actions.

---

# 6. Staff Assessment Permission

The Staff Assessment permission already exists.

Implement full enforcement so that users without this permission:

* Cannot see the page
* Cannot see the navigation item
* Cannot access the page directly
* Cannot perform any Staff Assessment actions

---

# Farm Assignment & Farm Switcher Enforcement

The Farm Assignment feature and the Farm Switcher dropdown in the navigation bar must work together across the entire application.

## 7. Farm Switcher Behaviour

The farm selector in the navigation bar should act as the global context for the application.

Whenever a user selects a farm from the Farm Switcher dropdown:

* Every page should immediately display data for the selected farm only.
* The selected farm should become the active working farm.
* All widgets, tables, cards, charts, summaries, reports, statistics, and popups should automatically refresh to show only data belonging to that farm.
* Users should never see mixed data from multiple farms while a specific farm is selected.

This behavior should be consistent across both desktop and mobile.

---

## 8. Farm Assignment Enforcement

Users should only be able to select farms they have been assigned to.

They must never see or access farms outside their assignment.

The Farm Switcher dropdown should display only the farms available to that user.

---

## 9. Feed Inventory

Feed Inventory must respect both:

* The user's assigned farms.
* The currently selected farm in the Farm Switcher.

Only inventory belonging to the selected farm should be displayed.

---

## 10. Financial Data

Expenses, Revenue, Financial Dashboard, and all financial summaries should automatically update based on the currently selected farm.

Users should never see financial data from another farm while a different farm is selected.

---

## 11. Reports

Reports must also respect the selected farm.

Users should only be able to:

* View reports
* Create reports
* Edit reports
* Submit reports

for the currently selected farm, provided they have the necessary permissions.

---

# Report Notifications

## 12. Report Notification System

Implement notifications for report events, including:

* Report Submitted
* Report Approved
* Report Rejected
* Report Returned for Review
* Report Status Changed

Notifications should appear in the Notifications page and follow the application's existing notification behavior.

---

# Final System Requirement

Perform a complete review of the application's business logic to ensure every page, component, workflow, popup, table, report, chart, API request, and backend query consistently respects:

* User Roles
* Staff Permissions
* Farm Assignments
* Currently Selected Farm (Farm Switcher)
* Subscription Restrictions

No feature should bypass these rules.

Changing the selected farm from the navigation bar should immediately update the entire application so that every screen displays data only for that farm, while still respecting the user's assigned permissions and subscription limits.
