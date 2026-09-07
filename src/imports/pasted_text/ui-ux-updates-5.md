## UI/UX Update Request

Please implement the following updates. Ensure all changes are reflected across desktop, tablet, and mobile while maintaining the existing design system.

---

# 1. Commercial Plan – "Best Value" Badge

Update the **Best Value** badge on the **Commercial** subscription card.

### Requirements

* Change the badge color to the application's orange accent.
* Use the same orange accent used throughout the Subscription page.
* Ensure the badge remains readable with proper contrast.

---

# 2. Feed Documentation (Mobile) – Remove Menu Icon

Update the **Feed Documentation** page on mobile.

### Requirements

Remove the overflow/menu icon completely.

Instead:

* Display all action buttons directly below the page title and subtitle.
* Use the same responsive wrapping layout used on other pages.
* If two buttons fit on one row, place them side by side.
* Additional buttons should wrap onto the next row.
* Maintain consistent spacing and padding.

---

# 3. Feed Documentation Calendar Indicators

Update the calendar used on the **Feed Documentation** page.

The calendar currently contains two date states:

* Has Record
* Selected

### Requirements

Use only these two colors:

* **Primary Green** → Selected date.
* **Orange Accent** → Dates that already have recorded data.

These two states should always remain visually distinct.

---

# 4. Subscription Accent Color

The orange accent used on the Subscription page is currently too saturated.

### Requirements

* Reduce the saturation slightly.
* Keep it warm and vibrant.
* Maintain sufficient contrast for accessibility.
* Apply the updated orange consistently across all subscription indicators and badges.

---

# 5. Commercial Plan Card – Unlimited Ponds Label

Update the **Commercial** subscription card.

The **Unlimited Ponds** label should no longer use the bright green color.

### Requirements

* Change its color to match the card's border (stroke) color.
* Keep the typography unchanged.
* Maintain visual consistency with the overall card design.

---

# 6. Pond Details – Feed Summary by Pallet (Mobile)

Update the **Feed Summary by Pallet** section on the **Pond Details** page for mobile devices.

### Requirements

* Display pallet summary cards in two responsive columns.
* Continue stacking downward as more cards are added.
* Cards should automatically wrap into additional rows.
* The layout should fill the available width of the container while respecting the container's padding.
* Keep card heights consistent.
* Prevent overflow and maintain proper spacing.

---

# 7. Rename Button

Update the button label throughout the application.

### Change

**Add New Pond** → **Add Pond**

Only update the text.

The functionality should remain exactly the same.

---

# 8. Report Details

Update the **Report Details** page.

The first report question should display only its original answer.

### Requirements

* Do **not** display the confirmation question for the first question.
* The confirmation prompt belongs only to questions that require additional confirmation.
* Keep the existing card layout for all report questions.

---

# 9. Feed Inventory – Purchase History Filters

Update the **Feed Purchase History** tab on the **Feed Inventory** page.

### Requirements

Add two filters above the table:

* Year
* Month

Users should be able to filter purchase history by:

* A specific year.
* A specific month within the selected year.

Use the application's existing dropdown components and styling.

Ensure the filters work correctly across desktop, tablet, and mobile.

---

# 10. Pond List (Mobile)

Update the interaction for the Pond List on mobile devices.

### Replace Menu Icon

Remove the existing overflow/menu icon from each pond card.

Replace it with a **right-facing arrow (chevron)** to indicate that the item leads to another page.

### Interaction

* **Tap the pond card** → Navigate directly to the Pond Details page.
* **Press and hold the pond card** → Display the action menu.

### Action Menu

The press-and-hold menu should contain all existing pond actions, such as:

* Edit Pond
* Delete Pond (when allowed)
* Any other existing pond actions

### Menu Behavior

* Position the popup intelligently based on available screen space.
* If opened near the bottom, display upward.
* If opened near the left edge, open toward the right.
* If opened near the right edge, open toward the left.
* Tapping anywhere outside the popup should dismiss it.
* Maintain the same popup styling and behavior used throughout the application.

---

# 11. Create Account Flow – Subscription Page Content

Update the **Subscription** page that appears during the **Create Account** onboarding flow.

Currently, the onboarding Subscription page does **not** match the main Subscription page inside the application.

### Requirements

The onboarding Subscription page should use the **exact same subscription data and content** as the main Subscription page inside the application.

This is not just about matching the layout. It must also match the content inside every subscription card.

### Single Farm Plans

Copy the content exactly from the main Subscription page, including:

* Plan names
* Pricing
* Feature list
* Descriptions
* Pond limits
* Badges
* Button states
* Card hierarchy

For example:

* **Starter** should display the complete list of features.
* **Growth** should display **Everything in Starter** plus the additional pond limit.
* **Commercial** should display **Everything in Growth** plus **Unlimited Ponds**.

The content should be identical to the main Subscription page.

### Multiple Farm Plans

Likewise, copy the complete content from the main application's Multiple Farm subscription plans.

This includes:

* Plan names
* Pricing
* Feature list
* Farm limits
* Descriptions
* Badges
* Card layout
* Button styling

For example:

* **Up to 3 Farms** should contain the full feature list.
* Higher plans should display **Everything in Up to 3 Farms** plus the increased farm limits.

### Content Consistency

The onboarding Subscription page should **reuse the exact same data source or component** as the main Subscription page whenever possible.

There should be **no differences** between the two pages in terms of:

* Plan information
* Features
* Pricing
* Card content
* Descriptions
* Visual hierarchy
* Layout
* Styling

The only difference should be the button behavior appropriate for onboarding (for example, starting a free trial or selecting a plan). Every other aspect of the Subscription page should remain identical to the version inside the main application.
