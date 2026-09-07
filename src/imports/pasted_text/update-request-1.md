Update Request

Please implement the following updates. Ensure every change is fully implemented in both the functionality and UI, and that the updates are reflected consistently across desktop, tablet, and mobile.


---

1. Pond Categories

Rename the pond categories:

Pre-Sorting → Nursery

Normal → Production


Update this everywhere in the application, including:

Create Pond popup

Edit Pond popup

Pond List

Pond Details

Filters (if applicable)

Reports

Anywhere the category is displayed



---

Pond Tags

Update the order of the tags displayed on Pond cards.

Display them as:

Category Tag → Status Tag

Example:

Nursery Active

or

Production Active

The Category tag and the Active status tag must have different visual styles (different colors/backgrounds) so they are easy to distinguish.


---

2. Max Kg per Pallet

The Max Kg per Pallet feature has not been fully implemented.

Please complete it.


---

Display on Pallet Cards

When a user sets the maximum kg for a pallet, immediately display it inside the corresponding pallet card under Feed Summary by Pallet.

Example:

Pallet

Feed Used

Remaining

Max Kg: 120 kg


This should appear immediately after saving, even if no feeding has been logged yet.

If no feeding exists yet:

Feed Used = 0 kg

The Max Kg should still be visible.


---

Edit

If Max Kg has already been set, display an Edit icon on the pallet card so it can be updated.


---

Feed Documentation Popup

When logging feeding, under the Pallet field, display the configured Max Kg (if available).

Example:

Pallet: 3 mm

Max Kg: 120 kg

If the pallet has already reached its maximum configured weight, show a warning message in red directly below the pallet field.

Example:

"Maximum pallet weight has been reached."


---

Notifications

When a pallet reaches its configured maximum kg, automatically generate a notification.

The notification should include:

Pond Name

Fish Stock

Pallet

Configured Max Kg


Example:

> Pond A • Stock (12 May 2026) • 3 mm pallet has reached its configured maximum of 120 kg.



Implement this notification now so it can be reviewed in the Notification page.


---

3. Invoice Error State

When an invoice is marked as Error:

Do not delete it.

Instead:

Keep it in the Invoice table.

Update its Status to Error.

Highlight the row with a light red background.

Keep it searchable and filterable.

Allow users to open and review it later.

Exclude Error invoices from revenue calculations and financial reports.


This is for audit/history purposes.


---

4. Nursery Pond Transfer

Restore the Transfer Fish button on Nursery ponds.

However, the transfer flow must be different from Production ponds.


---

Nursery Transfer Popup

The popup should include:

Destination Pond

Number of Fish to Transfer

Percentage of Feeding History to Transfer


The transfer should automatically move:

Fish quantity

Treatment history

Feeding history (based on selected percentage)

Feed Summary by Pallet (based on selected percentage)


Example:

Transfer:

40% of fish

Automatically transfers:

40% of feeding history

40% of pallet feeding records

All treatment records (for reference)


Treatment history should always accompany transferred fish so the receiving pond maintains a complete medical history.

This process continues until the Nursery pond becomes empty.


---

5. Report Status Summary Card

On the Report page, directly below the filters, add a new status summary card.

The purpose of this card is to quickly show whether all expected reports have been submitted for the selected date.


---

If Everyone Has Submitted

Display a success state.

Example:

✅ All required reports have been submitted.

Use a light green background.


---

If Reports Are Missing

Display:

Number of outstanding reports

Names of staff who have not yet submitted


Example:

Reports Pending

The following staff have not submitted today's report:

John Doe

Mary James

Peter Okoro


Use a professionally designed card with:

Light green styling for completed states

Light orange/red accent for pending states

Appropriate spacing, icons, and typography


The card should update automatically based on the selected date filter.

Update Request

Please implement the following update:

Fish Stock History - Date Filter Dropdown

On the Fish Stock History popup, the Filter by Date dropdown is not positioning correctly.

Current issue:

When the date picker is opened, the dropdown extends outside the left side of the viewport.

Part of the calendar is cut off, making it difficult to use.


Required behavior:

The date picker must always remain fully visible within the viewport.

Since this filter is positioned near the left edge of the popup, the calendar should open towards the right, not to the left.

The dropdown should automatically detect available screen space and reposition itself so it never overflows outside the popup or screen.


Responsive Positioning Rules

Apply this positioning behavior consistently to all dropdowns and popups throughout the application:

If the trigger is near the left edge, open the dropdown toward the right.

If the trigger is near the right edge, open the dropdown toward the left.

If there isn't enough space below, open above the trigger.

Keep the entire dropdown or calendar fully within the viewport at all times.

This behavior should work consistently on desktop, tablet, and mobile.


This should specifically fix the Filter by Date dropdown in the Fish Stock History popup, while also making dropdown positioning intelligent across the entire application.

---

General Requirements

Maintain consistency with the existing design system.

Ensure all updates are responsive across desktop, tablet, and mobile.

Use existing reusable components where possible.

Ensure all related modules stay synchronized after these updates.

Reflect all changes immediately in both the design and application behavior.