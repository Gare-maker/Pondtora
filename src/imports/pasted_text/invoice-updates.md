Make these updates
- Generate invoices not working and also add ability to print on any devices
- On the invoice page, there should be a filter at the top that filter by year and then month just like the one on the financial page, so what you select will reflect on the statistics and the table
- When you want to log feed bought this should be the list and there should be a search bar on the dropdown to enable user search fast rather than scrolling: 1. Omega Top


2. Blue Crown


3. EcoFloat


4. Aqualis


5. Alpha Feed


6. Vital Feed


7. TopFeed Aqua


8. Multi Feed


9. Aqua Boom


10. Agro Feed


11. NCF (Nigerian Certified Feed)


12. Dickem Fish Feed


13. Aqua Pro


14. Durante


15. Enam Papa


16. Tropo Farms Feed


17. Cycle Farms Feed


18. Local Commercial Pellet Feed


19. Coppens


20. Aller Aqua


21. Skretting


22. INVE Aquaculture


23. Zeigler


24. Raanan Fish Feed


25. Aqua Feed


26. Aqua Plus


27. Aqua Gold


28. Aqua Mix


29. Aqua Star


30. Aqua Master


31. Aqua Grow


32. Aqua Best


33. Aqua Life


34. Aqua Float


35. Aller Classic


36. Skretting Nutra


37. Coppens Advance


38. Coppens Premium


39. Regional Private Label Fish Feed


40. Local Compounded Floating Feed


41. Local Compounded Sinking Feed
- Where you have feed size, add this: (pallet). So it's feed size (pallet)
- Also this should be the list that comes up when you click on fish size/pallet: Powder

Crumble

0.3 mm

0.5 mm

0.8 mm

1.0 mm

1.2 mm

1.5 mm

2.0 mm

3.0 mm

4.0 mm

5.0 mm

6.0 mm

8.0 mm

10.0 mm

12.0 mm

- Update the Existing Invoice Flow: Update the existing Invoices module and Create Invoice workflow. Do not redesign the overall page structure or create a new navigation item. Retain the existing Invoice page, Invoice Settings, statistics cards, filters, invoice history table, and general layout. Only update the invoice creation flow and related invoice display to support selling multiple fish groups in a single invoice. Update the Create Invoice Modal. The current invoice creation flow only allows the farmer to select one Fish Group and enter one Quantity (kg). Replace this section with a multi-line item sales table. A customer should be able to purchase multiple fish groups (different sizes/grades) within a single invoice. Remove the current: Fish Group dropdown. Quantity (kg) input. Replace them with the following table: Group	Display Name	Quantity (kg)	Price/kg	Discount	Total	Action. Each row represents one fish group being sold. Group Dropdown populated from the configured Price Groups.

Options:

A

B

C

D

...


Display Name

Automatically populate after selecting a group.

Example:

Group C → Big Size

Quantity (kg)

The farmer enters the weight sold for that group.

Price/kg

Automatically retrieve the configured selling price from Invoice Settings.

This field should be read-only.

Discount

Improve the discount system.

Allow the farmer to choose between:

Apply Discount to Entire Invoice

Apply Discount to Specific Fish Group


If Entire Invoice is selected, show one discount field below the invoice summary.

If Specific Fish Group is selected, each row should have its own discount field.

Total

Automatically calculate:

Quantity × Price/kg − Discount

Update instantly whenever the quantity, group, or discount changes.

Action

Each row should include:

Remove Row



---

Add Fish Group

Below the table, add an Add Fish Group button.

Clicking it adds another row to the table.

There should be no practical limit to the number of fish groups that can be added to one invoice.

Example:

Group	Display Name	Quantity	Price/kg	Total

A	Small Size	8 kg	₦2,000	₦16,000
C	Big Size	12 kg	₦3,000	₦36,000
D	Export Size	5 kg	₦3,500	₦17,500



---

Update the Invoice Summary

Automatically calculate and display:

Total Fish Groups

Total Weight (kg)

Subtotal

Discount

Additional Charges

Grand Total

Amount Paid

Outstanding Balance


Every value should update automatically whenever:

A quantity changes

A group changes

A row is added

A row is removed

A discount changes

Additional charges change


No manual calculations should ever be required.


---

Update the Generated Invoice

Update the generated invoice to display all fish groups sold in that invoice.

Instead of one item, display a complete line-item table.

Example:

Description	Quantity	Unit Price	Discount	Total

Small Size Catfish	8 kg	₦2,000/kg	₦1,000	₦15,000
Big Size Catfish	12 kg	₦3,000/kg	₦0	₦36,000
Export Size Catfish	5 kg	₦3,500/kg	₦500	₦17,000


Below the table display:

Total Fish Groups

Total Weight

Subtotal

Discount

Additional Charges

Grand Total

Amount Paid

Outstanding Balance



---

Update the Invoice History Table

Since an invoice can now contain multiple fish groups, update the existing Invoice History table.

Use these columns:

| Invoice No. | Customer | Pond | Fish Groups | Total Weight (kg) | Grand Total | Payment Status | Date | Actions |

Fish Groups

Display a summary of the groups included in the invoice.

Examples:

A

A, C

A, C, D

A +2 more (if many groups)


Total Weight

Automatically sum the quantities from every line item.

Example:

8 kg + 12 kg + 5 kg = 25 kg

Display 25 kg in the table.

Grand Total

Display the final invoice amount after discounts and additional charges.

Actions

Keep the existing actions:

View

Edit

Print

Download PDF

Share

Update Payment Status

Delete (Permission-based)



---

Update the View Invoice Page

When the user clicks View, show the full breakdown of the invoice.

Display:

Group	Display Name	Quantity	Unit Price	Discount	Line Total



Below the table display:

Total Fish Groups

Total Weight

Subtotal

Discount

Additional Charges

Grand Total

Amount Paid

Outstanding Balance


The goal of this update is to make the Invoice module accurately reflect real-world catfish sales, where customers commonly purchase multiple fish groups in a single transaction. The system should automatically calculate all pricing, maintain a detailed breakdown for each fish group, and keep both the generated invoice and the invoice history consistent with this new workflow.
- On the pond details page, I want your to the by size in the feed summary to by size (pallet). Also, in that section I want you to add total kg of all th pallets