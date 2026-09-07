## Update Request

Please make the following updates to the application. Ensure all changes are reflected in both the functionality and the UI/UX design across desktop, tablet, and mobile.

---

# 1. Invoice Management

## Edit Invoice

Allow users to edit an existing invoice.

The user should be able to update:

* Customer information
* Pond
* Fish groups
* Quantity (kg)
* Discounts
* Additional charges
* Notes
* Payment details

When an invoice is edited, all calculations should automatically recalculate, including:

* Line totals
* Total discount
* Grand total
* Outstanding balance

Historical invoice numbers should remain unchanged.

---

## Mark Invoice as Paid

Allow users to update an invoice's payment status directly from:

* Invoice History
* Invoice Details

Support the following statuses:

* Draft
* Sent
* Pending
* Partially Paid
* Paid
* Cancelled

When an invoice is marked as **Paid**:

* Update the Financial Dashboard revenue automatically.
* Update Reports automatically.
* Remove the invoice from Outstanding Payments.
* Record the payment date and payment method.

---

## Invoice Issued By

Allow staff members with the appropriate permission to access the **Invoice** module and create invoices.

When an invoice is created, the system should automatically record the logged-in staff member as the **Issued By** user.

Requirements:

* Automatically save the staff member's name.
* Display the "Issued By" field only within the admin view of the invoice.
* Customers should **not** see who created the invoice.
* Admins and authorized managers should be able to view who created every invoice for accountability and auditing.

---

# 2. Feed Inventory

## Fix Feed Purchase History Filter

The **Month** filter on the **Feed Purchase History** section is currently not displaying correctly on:

* Desktop
* Tablet
* Mobile

Fix the UI so the month selector is visible and functions correctly across all screen sizes.

---

## Remove From Stock Confirmation

When the user clicks **Remove From Stock**, display a confirmation dialog.

**Title**

Remove Feed Stock?

**Message**

> This action will mark the selected feed stock as fully consumed and remove it from the active inventory. The record will remain available in the Feed Purchase History for future reference and reporting.

Buttons:

* Cancel
* Remove from Stock

The stock should be removed only from the active inventory, not permanently deleted.

---

# 3. Fish Stock History

Enhance the Fish Stock History module by allowing users to view detailed information for each stocking batch.

## Fish Stock History List

Display all stocking batches.

Each row should contain a **View** button/icon.

---

## Stock Details Popup

Clicking **View** should open a modal displaying:

### Stock Information

* Batch ID
* Pond
* Fish Species
* Stocking Date
* Initial Quantity
* Current Quantity
* Average Weight
* Current Status

### Feeding Summary

* Total Feed Consumed (kg)
* Feed Consumption by Pellet Size
* Total Feeding Cost

### Mortality

* Total Mortality
* Mortality Rate (%)

### Harvest & Sales

* Total Fish Sold
* Total Weight Sold
* Revenue Generated

### Expenses

* Feed Cost
* Medication Cost
* Maintenance Cost
* Other Expenses

### Performance

* Profit/Loss (if available)

---

## Popup Navigation

The popup should contain two screens:

* Fish Stock History List
* Stock Details

When viewing details, include a **Back** button inside the popup that returns the user to the stock list without closing the modal.

---

## Empty States

Include empty states where necessary.

Examples:

* No fish stock records found.
* No feeding history available.
* No harvest records available.
* No expenses recorded.

---

# 4. Pond Details

Update the Pond Details page.

## Add Stocking Date

Display the original stocking date for the current fish batch.

Example:

**Stocking Date:** 15 January 2026

---

## Pond Age

Automatically calculate and display how long the fish have been in the pond.

Example:

* 4 Months 12 Days
* 1 Month 8 Days
* 6 Months

The value should update automatically based on the stocking date.

---

# 5. Feed Documentation

## Feeding Time

When recording a feeding event, allow the farmer or staff member to record the exact feeding time.

For both sessions:

* Morning Feeding Time
* Evening Feeding Time

Example:

Morning: **7:30 AM**

Evening: **5:45 PM**

---

## Pond Feed History

Display the recorded feeding times in the **Pond Details → Feed History**.

Each feeding record should include:

* Date
* Morning Feed (kg)
* Morning Feeding Time
* Evening Feed (kg)
* Evening Feeding Time
* Staff Member

---

## Feeding Alerts

Create automatic notifications.

If a pond has not been fed:

* During the morning feeding period
* During the evening feeding period

The system should generate an alert reminding the farmer or responsible staff to feed the pond.

Notifications should appear in:

* Notification Center
* Dashboard Alerts

---

# 6. Staff Management

Update the Staff module to support role-based access control.

When creating or editing a staff member, allow the admin to assign a role.

Default roles should include:

### Farm Manager

Permissions:

* Full access to every page and feature.

---

### Feeding Staff

Permissions:

* Feed Documentation
* Pond Feed History
* Feeding Records

No access to financial information or settings.

---

### Inventory Staff

Permissions:

* Feed Inventory
* Fish Stock
* Stock Purchases
* Inventory Records

No access to financial information.

---

### Feeding & Inventory Staff

Permissions:

* Feed Documentation
* Feed Inventory
* Fish Stock
* Pond Feed History

No access to financial information.

---

The assigned role should automatically determine which pages and actions the staff member can access.

Roles should be selectable during:

* Staff creation
* Staff editing

Future roles should also be easy to add.

---

# 7. Create Account Page

Update the **Create Account** page to support referral codes.

## Referral Code (Optional)

Add an optional input field labeled:

**Referral Code (Optional)**

Requirements:

* The field should not be required to create an account.
* Users can leave it empty and continue registration.
* If a referral code is entered, validate it before completing account creation.
* If the code is valid, associate the new account with the referring user.
* If the code is invalid, display a clear validation message.
* The field should appear below the main registration fields and follow the existing design system.

---

# 8. Pricing Page

Update the subscription plans.

## STARTER

Up to **5 Ponds**

**₦3,000/month**

Includes:

* All platform features
* Up to 5 ponds

---

## GROWTH ⭐ (Most Popular)

Up to **15 Ponds**

**₦5,000/month**

Includes:

* All platform features
* Up to 15 ponds

---

## COMMERCIAL

Replace **Enterprise** with **Commercial**.

**Unlimited Ponds**

**₦10,000/month**

Includes:

* All platform features
* Unlimited ponds

---

## Every Plan Includes

Display below the pricing cards.

* Financial Dashboard
* Pond Management
* Feed Inventory
* Feed Documentation
* Fish Stock History
* Sales Invoicing
* Staff Management
* Reports & Analytics
* CSV Export
* PDF Export

---

## Free Trial

Replace:

**1 Month Free Trial**

with:

**30-Day Free Trial**

across the entire application.

---

## Savings Badge

The **Save 15%** badge should always remain visible on the yearly billing option, even before the user selects yearly billing.

---

# 9. Financial Dashboard

Update the revenue comparison card.

Replace:

**Revenue -12%**

with:

**Compared to Previous Month**

The comparison value should still update dynamically, but the label should always read **Compared to Previous Month** instead of simply showing a percentage.

---

# General Requirements

* Maintain consistency with the existing design system.
* Ensure all updates are responsive across desktop, tablet, and mobile.
* Use consistent spacing, typography, colors, and reusable UI components.
* Standardize dropdowns using the existing Brand dropdown style.
* Include loading, validation, confirmation, and empty states wherever applicable.
* Ensure changes automatically synchronize across related modules, including Pond Management, Feed Documentation, Feed Inventory, Invoice Management, Financial Dashboard, Reports, and Staff Management, so all records remain accurate and consistent throughout the system.
