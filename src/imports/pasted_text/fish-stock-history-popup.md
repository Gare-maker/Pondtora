1. Fish Stock History pop on pond management page

Enhance the Fish Stock History (popup) module by allowing users to view detailed information for each stocking batch.

Fish Stock History List pop 

Display all stocking batches. 

Each row should contain a View button/icon.

Stock Details Popup open which include a Back button inside the popup that returns the user to the stock list without closing the modal.

Clicking View should open a modal displaying:

Stock Information
Batch ID
Pond
Fish Species
Stocking Date
Initial Quantity
Cleared Quantity
Average Weight
Current Status
Feeding Summary
Total Feed Consumed (kg)
Feed Consumption by Pellet Size
Total Feeding Cost
Total Mortality
Mortality Rate (%)
Harvest & Sales
Revenue Generated
Expenses
cost
Performance
Profit/Loss (if available)
Popup Navigation


Include empty states where necessary.

Examples:

No fish stock records found.
No feeding history available.
No harvest records available.
No expenses recorded.


2. Subscription Page

Update the subscription plans.


Update the Subscription page to use two tabs instead of combining everything into one view.

Tab 1: Single Farm – This should contain the original single-farm subscription plans, exactly as they were in the previous version. Keep all the existing pricing, features, and plan details in this tab.
STARTER

This should be the details of th cards:
Up to 5 Ponds

₦3,000/month

Includes:

All platform features
Up to 5 ponds
GROWTH ⭐ (Most Popular)

Up to 15 Ponds

₦5,000/month

Includes:

All platform features
Up to 15 ponds
COMMERCIAL

Replace Enterprise with Commercial.

Unlimited Ponds

₦10,000/month

Includes:

All platform features
Unlimited ponds
Every Plan Includes

Display below the pricing cards.

Financial Dashboard
Pond Management
Feed Inventory
Feed Documentation
Fish Stock History
Sales Invoicing
Staff Management
Reports & Analytics
CSV Export
PDF Export
Free Trial

Replace:

1 Month Free Trial

with:

30-Day Free Trial

across the entire application.

Savings Badge

The Save 15% badge should always remain visible on the yearly billing option, even before the user selects yearly billing.
Tab 2: Multiple Farms – This should contain the multiple-farm subscription plans only. Keep all the existing pricing, features, and plan details for the multiple-farm plans in this tab.

Each tab should have its own Monthly / Yearly billing toggle, allowing users to switch between monthly and yearly pricing independently.

The Single Farm plans and Multiple Farms plans should remain separate, with no mixing of plan details between the two tabs. The interface should be clean, responsive, and easy to switch between the two subscription types. Humans do love turning one pricing page into a nesting doll of tabs and toggles, but at least this structure is much clearer than cramming everything onto one screen.


3. Update the search dropdown for Pond and Customer selection on the Create Invoice page.

Current issue: The dropdown menu is rendered inside the parent card/container, causing it to be clipped and difficult to scroll through on both mobile and desktop.

Required update:

Render the dropdown as an overlay/popover outside the parent card (do not constrain it to the card's boundaries).
Ensure the dropdown appears above other UI elements with the correct z-index.
Make the dropdown independently scrollable while keeping the page fixed.
Keep the search input fixed at the top of the dropdown so users can easily search by customer name or pond name.
Allow users to scroll through the full list smoothly and select an item without the dropdown being cut off.
The behavior should work consistently on both mobile and desktop and remain fully responsive.

The goal is to make searching and selecting a customer or pond fast and easy, without the dropdown being restricted by the card container.


4. Update the Farm Selector dropdown in the navigation bar.

Current issue: If the user opens the farm selection dropdown and then closes the navigation drawer (or dismisses the dropdown) without selecting a farm, the dropdown remains open the next time the navigation drawer is opened.

Required update:

Reset the dropdown state whenever the navigation drawer is closed.
If no farm is selected, the dropdown should be collapsed by default the next time the navigation drawer is opened.
Only keep the selected farm in memory, not the expanded/collapsed state of the dropdown.
Opening the navigation drawer should always display the farm selector in its default collapsed state unless the user intentionally expands it again.
Apply this behavior consistently on both mobile and desktop.

5. Update the Add Fish Stock button in the Pond Details section of Pond Management.

Current issue: The Add Fish Stock button is aligned to the side of the section.

Required update:

Move the Add Fish Stock button to the center of the Pond Details section.
Center it both visually and horizontally within the available space so it becomes the primary call-to-action.
Ensure the alignment remains centered and responsive on both mobile and desktop screen sizes.
Maintain consistent spacing and alignment with the rest of the UI.

6. Update the Fish Stock, Pond Details, and Feed Documentation logic to ensure all records are correctly linked to each fish stock.

Fish Stock Dependency

All of the following records are tied to a specific fish stock in a pond:

Feeding Summary
Feeding History
Treatment History
Any other stock-related records and activities

These records belong to the fish stock, not just the pond.

Required behavior:

When a fish stock is moved to another pond, all associated records (feeding history, feeding summary, treatment history, and other stock-related data) must move with that fish stock.
When a fish stock is removed, harvested, or the pond is cleared, all associated records should also be removed from that pond because they belong to the fish stock that no longer exists there.
An empty pond should not retain feeding or treatment records from a previous stock.

Pond Details

If a pond has no active fish stock, users should not be able to log activities that require an existing stock.
Disable or hide actions such as Log Treatment, Record Feeding, or any other stock-dependent actions until a new fish stock is added to the pond.

Feed Documentation

The pond selection list should display only ponds with active fish stock.
Ponds that are empty or have no active fish stock should not appear as selectable options.
This prevents users from recording feed for ponds that do not currently contain fish.

Ensure this logic is applied consistently throughout the system so that all stock-related records remain accurately associated with their corresponding fish stock and cannot exist independently of it.
