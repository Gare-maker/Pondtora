UI/UX Update Request

Important

Please implement only the updates listed below.

Maintain the existing layout, page structure, spacing, and text hierarchy.

Do not redesign pages unless specifically requested.

The goal is to refine the existing experience, not rebuild it.

Ensure all updates are reflected in both the UI and functionality.

All changes must remain responsive across desktop, tablet, and mobile.



---

1. Fix Dropdown Overflow

Several dropdown menus overflow outside the viewport when opened near the right edge of the screen.

Update the dropdown positioning logic across the entire application.

Required Behavior

If a dropdown trigger is close to the right edge of the screen:

Open the dropdown toward the left.


If a dropdown trigger is close to the left edge:

Open normally toward the right.


If space is limited below:

Open upward if necessary.


The dropdown should always remain fully inside the viewport.

Apply this behavior consistently throughout the application, including but not limited to:

Feed Purchased History

Reports

Invoice

Feed Inventory

Staff

Financial Dashboard

Any page using dropdown menus



---

2. Feed Remaining (Feed Documentation)

The current implementation is incorrect.

The Feed Remaining tab is not the same as Feed Inventory.

Its purpose is to record opened feed bags that were not completely used after feeding.

Example

A 15 kg bag is opened.

12 kg is used.

3 kg remains.

The farmer logs the remaining 3 kg.

This allows the farmer to continue using the remaining feed later instead of opening another bag.

Log Feed Remaining Popup

The popup should follow the same interaction pattern as Log Bags Opened.

Use a table-style input.

Fields should include:

Feed Brand

Pellet Size

Fish Stock (Stocking Date)

Remaining Feed (kg)


Feed Remaining Table

Display:

Feed Brand

Pellet Size

Fish Stock (Stocking Date)

Remaining Feed (kg)


Add:

Edit action


Sticky Column

The first column of both:

Bags Opened

Feed Remaining


should remain sticky when horizontally scrolling.


---

3. Feed Documentation (Mobile)

Update the mobile layout of the Feed Documentation page.

Header Layout

The page should be structured as follows:

Page Title

Subtitle


Below the subtitle, place a new row containing the two primary action buttons:

Log Bags Opened

Log Feed Remaining


These two buttons should:

Be displayed on the same horizontal row.

Have equal width.

Fill the available width while respecting the page padding.

Stack only if there is genuinely not enough horizontal space on very small screens.


The layout order should be:

1. Page Title


2. Subtitle


3. Log Bags Opened + Log Feed Remaining buttons


4. Date Selector


5. Statistics Cards


6. Tabs



The Date Selector, Statistics Cards, and Tabs should always remain visible regardless of the selected tab.


---

4. Update Theme Colors

Update the application colors.

Primary Color:

#00BB58

Choose a secondary color that complements the new primary color.

Requirements:

Keep white and off-white backgrounds.

Maintain accessibility and color contrast.

Apply the updated palette consistently throughout the application.

Do not change the existing layout.



---

5. Subscription Flow

After Account Creation

Immediately after a user creates an account:

Redirect them to a dedicated Choose Your Subscription page.

This page is different from the Subscription page inside the application.

It should contain:

Heading: Choose Your Subscription

Short supporting text

All available subscription plans


Every plan button should display:

Start 30-Day Free Trial

Main Subscription Page

After the user starts the trial:

Remove every reference to 30-Day Free Trial from the normal Subscription page.

Instead display:

Current Plan

Plan Expiration Date


Example:

> Current plan expires on September 20, 2026.



Buttons should now display:

Current Plan

Get Plan


The free trial state should only exist during onboarding.


---

6. Typography & Branding

Update the application's typography.

Use Geist as the primary font across the entire product.

Product Name

Replace every occurrence of the current product name with:

Pondtora

Update:

Sidebar

Authentication pages

Dashboard

Settings

Browser title

Empty states

Every location where the product name appears


Interface Feel

Do not redesign the application.

Instead, make the interface feel:

Friendlier

Warmer

More modern


using only:

Geist font

Existing spacing

Existing hierarchy

Existing layout



---

7. Feed Inventory Terminology

Rename:

Bags Remaining

to

Bags in Stock

Apply this change consistently throughout the application.


---

8. Remove Supplier

On the Stock tab of Feed Inventory, remove Supplier from both the summary and the table.


---

9. Rename Statistics Card

Rename:

Unopened

to

In Stock


---

10. Remove Total Value Card

Remove the Total Value statistics card from the Feed Inventory page.


---

11. Purchased History

Remove the Date Picker from the Purchased History page.


---

12. Pond Details

Remove the Add Pond Cost button from the Pond Details page.


---

13. Feed Inventory (Stock Tab)

Update the Stock tab so it represents only the farmer's current inventory.

The Stock tab should no longer function as purchase history.

Remove

Purchased column

Remove From Stock column

Month filter

Total Value row

Bags row

Cost per Bag

Supplier

Total Value statistics card


Rename

Rename:

Bags Remaining

to

Bags in Stock

Inventory Logic

If multiple purchases have the same:

Feed Brand

Pellet Size

Bags per Pallet


the system should automatically merge them into one inventory record by increasing the quantity.

Individual purchases should instead be stored in the Purchased History tab.


---

14. Log Bags Opened

Update the popup.

Rename:

kg/Bag

to

Bags in Stock

This field should display the number of unopened bags currently available.


---

15. Financial Dashboard

Update the filtering system.

Allow users to select a date range.

Instead of selecting only one month, users should select:

Start Date

End Date


The dashboard should calculate all statistics using the selected date range.


---

16. Logo

Replace the current application logo with the uploaded image.

Requirements:

Use the original image.

Maintain high resolution and clarity.

Replace the logo everywhere it appears.

Do not modify or redesign the logo.



---

17. Invoice Error Workflow

Update the invoice error handling.

When an invoice is marked as Error:

Do not delete it.

Do not remove it from the Invoice table.

Keep it permanently as part of the invoice history.

Update its status to Error.

Highlight the row with a light red background.

Allow users to open and review the invoice later.

Exclude Error invoices from revenue calculations, reports, analytics, and financial summaries.


The purpose of this feature is to preserve an audit trail while preventing incorrect invoices from affecting financial records.


---

18. Country Dropdown

Update every country selection dropdown throughout the application.

Requirements

Include all African countries in the dropdown list.

Add a search field at the top of the dropdown so users can quickly find a country.

Display countries in alphabetical order.

Keep the dropdown styling consistent with the existing design system.

Ensure the dropdown remains fully responsive across desktop, tablet, and mobile.


This should be used consistently anywhere the application requires country selection.


---

General Requirements

Implement every update both visually and functionally.

Maintain the existing page layouts, spacing, typography, and component hierarchy.

Do not redesign screens unless explicitly instructed.

Ensure all pages remain fully responsive across desktop, tablet, and mobile.

Reuse existing components where appropriate.

Keep the UI consistent with the current design system.

Ensure no existing functionality is broken while implementing these updates.