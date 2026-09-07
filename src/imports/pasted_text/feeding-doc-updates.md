Feeding Documentation Updates

1. Daily Feed Date Card

Update the date displayed on the Feeding Documentation page.

Required Behaviour

Whenever the user enters the Feeding Documentation page:

The date card should automatically default to today's date.

Display the current day and month clearly.

Use the application's standard long-date format.

Example:

8 August

If the selected date is today, it may optionally display:

Today, 8 August

The default date must always be the actual current date when the page is opened.

Do not retain a previously selected date as the default when the user leaves and later reopens the page.

Users must still be able to manually select another date when required.

2. Daily Feed Edit Indicator

When a Daily Feed record has been edited, the table should clearly indicate that the record was modified.

This applies whether the record was changed through:

The Edit icon

Logging feed again for the same pond on the same date

The record should display an Edited indicator.

Do not create duplicate Daily Feed records when an existing record is modified.

3. Daily Feed Edit History

When the user clicks a Daily Feed record or its Edited indicator, display a details popup similar to the existing financial dashboard transaction history interface.

The popup should show the complete edit history, including:

Pond

Fish Stock

Pellet Size

Feed Brand

Original feed quantity

Updated feed quantity

Previous date/time

Date/time of the edit

Staff/user who made the change

Staff Login ID, where available

If the same record has been edited multiple times, display every change chronologically.

Example:

Initial Record

Feed: 50 kg

Logged: 8 August

Staff: John

Edit 1

Previous: 50 kg

Updated: 60 kg

Edited: 8 August

Staff: Mary

Edit 2

Previous: 60 kg

Updated: 55 kg

Edited: 8 August

Staff: John

Keep the Daily Feed table clean. Display the detailed history only inside the popup.

4. Remove Remaining Feed from Daily Feed Edit Popup

The Daily Feed editing interface should no longer contain a Remaining Feed tab.

Remaining Feed is no longer logged per pond. It is tied to the Fish Stock and recorded separately.

Therefore, the Daily Feed edit popup must contain only the Daily Feed editing interface.

Remove:

Remaining Feed tab

Remaining Feed fields

Remaining Feed functionality from the Daily Feed edit workflow

Do not remove the separate Fish Stock-level Remaining Feed functionality elsewhere in the application.

5. Prevent Duplicate Daily Feed Records

Update the Daily Feed logging logic so that logging feed for the same pond on the same day behaves as an edit/update, not a new record.

A Daily Feed record should be uniquely identified using the appropriate combination of:

Farm

Date

Pond

Fish Stock

Feed Brand

Pellet Size

Use the existing application relationships to ensure records from different farms, ponds, fish stocks, brands, pellet sizes, or dates are never incorrectly merged.

6. Logging Feed Again on the Same Day

If a user has already logged Daily Feed for a pond and returns to the Log Feed popup on the same day:

Existing data must automatically load.

The previously entered quantity must be visible.

The user can leave the value unchanged or modify it.

Example:

Previously:

Pond 1 → 50 kg

When Log Feed is opened again:

50 kg should already be populated.

If the user changes it:

50 kg → 65 kg

the existing record should be updated to 65 kg.

It must not create another 65 kg record.

7. Same-Day Pond Feed Behaviour

The Daily Feed record for a particular pond and day represents the current value for that feeding record.

Example:

Initial:

Pond 1 → 50 kg

User logs again:

50 kg loads automatically.

User changes it:

50 kg → 70 kg

The system stores:

70 kg

It must not calculate:

50 + 70 = 120 kg

The new value replaces the previous value.

8. Preserve Existing Data in the Log Feed Popup

When reopening the Daily Feed logging popup for a date that already contains feed records:

Load previously saved values automatically.

Show the correct pond.

Show the Fish Stock associated with that pond.

Show the previously selected Feed Brand.

Show the previously selected Pellet Size.

Show the previously entered feed quantity.

The user should immediately see what has already been logged and either leave it unchanged or edit it.

9. Daily Feed Data Integrity

All Daily Feed records must remain properly connected to:

Farm → Pond → Fish Stock → Date → Feed Brand → Pellet Size

The system must never combine records belonging to different:

Farms

Ponds

Fish Stocks

Dates

Feed Brands

Pellet Sizes

The following must update automatically whenever an existing Daily Feed record is edited:

Daily Feed table

Feed Summary by Pellet

Pond Details

Fish Stock History

Feed calculations

Relevant reconciliation calculations

Any other dependent summaries

An edit must update the existing record and all dependent calculations rather than creating duplicate feeding data.

Mobile Cost vs Revenue Chart

On mobile:

The chart should also automatically scroll to the current month when opened.

The current month must be within the initial visible viewport.

Nearby months should remain visible where screen width permits.

Users can horizontally scroll to January, December, or any other month.

The chart must not open at January simply because January is the first data point.

The price/value axis must remain visible while horizontally scrolling where technically possible.

The implementation must be responsive and must not cause the chart to overflow the application viewport.