[1:46 AM, 7/9/2026] Gare: Update the Discount System

Update the discount system to support two discount modes:

1. General Discount

The farmer can enter a General Discount (₦/kg) that applies to every fish group in the invoice.

The value entered represents the discount per kilogram, not a one-time deduction from the invoice.

Formula:

> Group Discount = Quantity (kg) × General Discount (₦/kg)



Each fish group calculates its own discount based on its quantity.

Example

General Discount: ₦20/kg

Group	Quantity	Discount/kg	Total Discount

A	10 kg	₦20	₦200
B	25 kg	₦20	₦500
C	50 kg	₦20	₦1,000


Total Invoice Discount:

₦200 + ₦500 + ₦1,000 = ₦1,700


---

2. Individual Group Discounts

Instead of using one general discount, the farmer can choose to assign a different discount per kilogr…
[5:35 AM, 7/9/2026] Gare: I want you to update the invoice, remove the list of month you can filter with and update the filter to be  a drop down for year, and a drop down for month, when you click on the month you see the days you issued invoice indicated with green dots, when you select any one you see all data from that day, so the statistics will reflect financial data and invoices history from that day selected . Also, there should be a vie all button for the month so you can see all the data for that month, so you see for a single day or a whole month
[5:37 AM, 7/9/2026] Gare: This should be your priority: I want you to fix the generate invoices so I can see the invoice and then print. Currently, if I click on generate invoices after I have fill it out, it turns blank, so please fix it, this should be your priority, make sure you fix it
[5:54 AM, 7/9/2026] Gare: I want you to make some updates:
- This should be your priority: I want you to fix the generate invoices so I can see the invoice and then print. Currently, if I click on generate invoices after I have fill it out, it turns blank, so please fix it, this should be your priority, make sure you fix it.
- I want you to update the invoice, remove the list of month you can filter with and update the filter to be  a drop down for year, and a drop down for month, when you click on the month you see the days you issued invoice indicated with green dots, when you select any one you see all data from that day, so the statistics will reflect financial data and invoices history from that day selected . Also, there should be a vie all button for the month so you can see all…
[6:18 AM, 7/9/2026] Gare: I want you to make some updates:
- This should be your priority: I want you to fix the generate invoices so I can see the invoice and then print. Currently, if I click on generate invoices after I have fill it out, it turns blank, so please fix it, this should be your priority, make sure you fix it.
- I want you to update the invoice, remove the list of month you can filter with and update the filter to be  a drop down for year, and a drop down for month, when you click on the month you see the days you issued invoice indicated with green dots, when you select any one you see all data from that day, so the statistics will reflect financial data and invoices history from that day selected . Also, there should be a vie all button for the month so you can see all…
[6:22 AM, 7/9/2026] Gare: Update Request for the Invoice & Reports Module

Please make the following updates. The first item is the highest priority and must be fixed before anything else.


---

1. HIGH PRIORITY: Fix Invoice Generation

This is the highest priority.

Currently, after completing the invoice form and clicking Generate Invoice, the page becomes blank instead of displaying the generated invoice.

Expected Behavior

Clicking Generate Invoice should successfully generate the invoice.

Display the invoice in a preview screen.

The preview should show all invoice details, including:

Customer information

Pond

Invoice number

Date

Fish groups

Quantity

Unit price

Discounts

Totals

Payment information


From the preview page, the farmer should be able to:

Print the invoice

Download it as a PDF

Share it

Return to the invoice list



Do not allow the screen to become blank. Ensure the invoice preview renders correctly every time.


---

2. Update Invoice Filters

Replace the current month filter with a more intuitive date filtering system.

Year Filter

Replace the existing month list with a Year dropdown.

Example:

2024

2025

2026



---

Month Filter

Add a Month dropdown.

Example:

January

February

March

...



---

Calendar Day Selection

After selecting a month, display a calendar for that month.

Requirements:

Days that contain one or more invoices should display a green indicator (dot).

Days with no invoices should have no indicator.


When the user clicks a specific day:

Filter the Invoice History to show only invoices created on that day.

Update all statistics cards to reflect only the data from the selected day.


Statistics should update accordingly, including:

Total Invoices

Revenue

Paid Invoices

Pending Invoices

Outstanding Balance



---

View Entire Month

Include a View All button for the selected month.

Clicking View All should:

Display every invoice created during that month.

Update the statistics cards using the month's data.


The user should be able to switch between:

A single day

The entire month


without leaving the page.


---

3. Update the Discount System

Replace the existing discount logic with two discount modes.

General Discount

The farmer can enter a General Discount (₦/kg).

This value represents a discount for every kilogram, not a one-time deduction from the invoice.

Formula

Group Discount = Quantity (kg) × General Discount (₦/kg)

Each fish group should calculate its own discount using its own quantity.

Example

General Discount = ₦20/kg

Group	Quantity	Discount/kg	Total Discount

A	10 kg	₦20	₦200
B	25 kg	₦20	₦500
C	50 kg	₦20	₦1,000


Invoice Discount:

₦200 + ₦500 + ₦1,000 = ₦1,700


---

Individual Group Discounts

The farmer can choose to assign a different discount per kilogram to each fish group.

Each group calculates its own discount independently.

Formula

Group Discount = Quantity (kg) × Discount per kg

Example

Group	Quantity	Discount/kg	Total Discount

A	10 kg	₦20	₦200
B	25 kg	₦30	₦750
C	50 kg	₦15	₦750


Total Invoice Discount:

₦200 + ₦750 + ₦750 = ₦1,700

Each line total should be calculated independently.


---

Invoice Calculation

For every fish group:

Gross Amount = Quantity × Price per kg

Group Discount = Quantity × Discount per kg

Line Total = Gross Amount − Group Discount

After calculating all line items:

Subtotal = Sum of all Gross Amounts

Total Discount = Sum of all Group Discounts

Grand Total = Subtotal − Total Discount + Additional Charges


---

Business Rules

Every discount value must always be treated as ₦ per kilogram (₦/kg).

Never treat the discount as a one-time deduction from a line item or the invoice.

In General Discount mode, apply the same discount per kilogram to every fish group.

In Individual Group Discount mode, each fish group can have its own discount per kilogram.

All calculations must update instantly whenever quantities, prices, discounts, or fish groups change.



---

4. Standardize Dropdown Components

Update every dropdown component in the application to match the existing Brand dropdown.

Requirements:

White background

Scrollable list

Consistent spacing

Consistent border radius

Same hover and selected states

Same width and styling

Same interaction behavior


All dropdowns throughout the application should use this component for a consistent user experience.


---

5. Update the Reports Page Layout

The Reports page currently has different spacing and width compared to the rest of the application.

Update it so it matches the layout used on all other pages.

Requirements:

Stretch the content to the same width as the Dashboard and other modules.

Use the same left and right margins.

Align cards, charts, filters, and tables consistently with the rest of the application.

Maintain a responsive layout across desktop and tablet screen sizes.


The Reports page should feel like a natural part of the application rather than using a different layout.