Make these updates: 
- New Navbar Page: Invoices

Create a brand-new page in the sidebar navigation called Invoices.

The Invoices page should be positioned above the Staff page and the Reports page in the navigation menu.

This page serves as the complete invoice management module for the Fish Farm Management System. From here, the farmer can configure invoice settings, create invoices, manage existing invoices, track payments, and monitor invoice statistics.


---

Page Layout

The page should be structured in the following order:

1. Page Header

Display the page title:

Invoices

Below the title, include a short description:

> Manage customer invoices, configure pricing groups, generate professional invoices, and track payment status from one central location.




---

2. Action Buttons

Place two primary action buttons at the top-right of the page.

Invoice Settings

This opens the invoice configuration page where the farmer defines all pricing and invoice defaults.

Price Groups

Configure fish pricing by creating reusable price groups.

Each price group should contain:

Group (A, B, C, D, etc.)

Display Name (e.g., Small Size, Medium Size, Big Size, Export Size)

Description (Optional)

Price per Kilogram

Status (Active/Inactive)


Example:

Group	Display Name	Price per kg

A	Small Size	₦2,000
B	Medium Size	₦2,500
C	Big Size	₦3,000
D	Export Size	₦3,500


The farmer should be able to:

Add new groups

Edit existing groups

Rename display names

Update prices whenever market prices change

Activate or deactivate groups

Delete unused groups


Changing the price of a group should only affect future invoices. Existing invoices must retain the original selling price used when they were created.

Throughout the system, groups should be displayed as:

A – Small Size

B – Medium Size

C – Big Size

D – Export Size


instead of "Group A", "Group B", etc.


---

Invoice Configuration

The farmer should also be able to configure:

Invoice Number Format (e.g., INV-000001)

Default Payment Terms

Farm Name

Farm Address

Farm Phone Number

Farm Email (Optional)

Bank Account Details

Default Notes

Default Footer Message

Tax/VAT Settings (Optional)


Do not include a farm logo. The invoice should display only the Farm Name as the business identity.


---

Create Invoice

Clicking Create Invoice opens the invoice creation form.

The workflow should be:

Step 1: Select Pond

The farmer selects the pond from which the fish is being sold.

Step 2: Customer Information

The farmer can either:

Select an existing customer

Create a new customer


Customer fields:

Customer Name

Phone Number

Email (Optional)

Business Name (Optional)

Delivery Address (Optional)


Step 3: Sale Details

Fields:

Invoice Number (Auto-generated)

Invoice Date

Due Date

Pond

Fish Species

Fish Group

Quantity (kg)

Discount (Optional)

Additional Charges (Optional)

Notes



---

Automatic Pricing

The farmer should never manually enter the selling price.

When the farmer selects a Fish Group, the system should automatically retrieve the configured price per kilogram.

Example:

Selected Group:

C – Big Size

Configured Price:

₦3,000/kg

Farmer enters:

12 kg

The system automatically calculates:

12 × ₦3,000 = ₦36,000

The farmer simply reviews the invoice and clicks Generate Invoice.


---

Invoice Calculation

Automatically calculate:

Subtotal

Discount

Additional Charges

Grand Total

Amount Paid

Outstanding Balance



---

3. Statistics Section

Below the action buttons, display summary cards showing:

Total Invoices

Total Revenue Invoiced

Paid Invoices

Pending Invoices

Partially Paid Invoices

Overdue Invoices

Outstanding Balance


These statistics should update automatically as invoices are created and payment statuses change.


---

4. Search & Filters

Provide a search bar and filtering options.

Search

Invoice Number

Customer Name


Filter

Pond

Date Range

Payment Status

Payment Method


Sort

Newest

Oldest

Highest Amount

Lowest Amount



---

5. Invoice Table

Display all invoices in a structured table.

Columns:

Invoice Number

Customer Name

Pond

Invoice Date

Due Date

Total Amount

Amount Paid

Outstanding Balance

Payment Status

Payment Method

Actions


Actions:

View

Edit

Print

Download PDF

Share

Update Payment Status

Delete (Permission-based)



---

Payment Status

Support the following statuses:

Draft

Sent

Pending

Partially Paid

Paid

Overdue

Cancelled


The farmer should be able to update payment status at any time.

For partially paid invoices, store:

Amount Paid

Remaining Balance

Payment Date

Payment Method



---

Generated Invoice

Every generated invoice should include:

Farm Information

Farm Name

Farm Address

Farm Phone Number

Farm Email (Optional)


Customer Information

Customer Name

Phone Number

Address


Invoice Information

Invoice Number

Invoice Date

Due Date

Pond

Payment Method

Payment Status


Sale Details

Description	Quantity	Unit Price	Total

Medium Size Catfish	12 kg	₦2,500/kg	₦30,000


Below the table display:

Subtotal

Discount (if applicable)

Additional Charges (if applicable)

Grand Total

Amount Paid

Outstanding Balance

Notes

Footer Message


The invoice should support:

Print

Download as PDF

Share



---

System Integration

The Invoice module should integrate seamlessly with the rest of the Fish Farm Management System.

When an invoice is generated, the system should automatically:

Link the sale to the selected Pond.

Save the customer information.

Use the configured Price Group automatically.

Calculate all totals without manual calculations.

Save the invoice in the invoice history.

Update invoice statistics.

Track payment status and outstanding balances.


When payment status changes to Paid, the system should automatically update the financial records and reporting dashboards.


---

Overall Goal

The Invoices module should function as a complete sales and billing system for catfish farmers. It should separate Invoice Settings (where pricing groups and invoice defaults are configured) from Create Invoice (where invoices are generated). This ensures the farmer only sets prices when they change, while every new invoice automatically uses the correct pricing.

The interface should be clean, fast, and intuitive, minimizing manual data entry while producing professional invoices and maintaining accurate sales, payment, and customer records.

- - When I scroll the screen and I move to another page, the page maintain that scrolling make the some of the details of that page be above like it was scrolled. It's inheriting the previous page scroll. And when you enter a page, it doesn't starr from the top, it should always start from the top showing the navbar
- Remove that currency: # ng - Nigerian naira from the create account page, it's not need since we will be getting the currency from the country 
- Also, there should be some spacing between the head title, head subtitle and the other content on the mobile screen
- And the dropdown icon on the dropdown are no longer showing, please make them visible so the user knows it's a dropdown
- Also reduce the size of terms and conditions too
- And the 'send first invite' button on the staff page should be in the middle
- For the subscription, for yearly subscription, they should save 15% not 20%