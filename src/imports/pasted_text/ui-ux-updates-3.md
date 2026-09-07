## UI/UX Update Request

Please implement the following updates. Ensure all changes are reflected across desktop, tablet, and mobile while maintaining the existing design system.

---

# 1. Pond Details – Feed Summary Cards (Mobile)

This update applies to the **Feed Summary** section on the **Pond Details** page.

### Mobile Layout

Make the summary cards responsive so they display in **two columns (two cards per row)** on mobile devices.

**Requirements:**

* Display two cards per row.
* Resize cards responsively to fit the available screen width.
* Maintain consistent spacing and padding.
* Keep all cards the same height.
* Ensure content does not overflow.
* Do not affect the desktop or tablet layouts.

The goal is to reduce excessive vertical scrolling while keeping the cards easy to scan.

---

# 2. Reports Page – Remove Statistics Cards

Update the **Reports** page.

Remove the statistics cards displayed at the top of the page.

This includes removing cards such as:

* Total Reports
* Open Reports

After removing them:

* Move the report list up to occupy the available space.
* Keep the page title, subtitle, filters, and report list.
* Do not replace the removed cards with any other component.

---

# 3. Invoice Page (Mobile) – Header Layout

Update the mobile version of the **Invoice** page.

The overflow/menu icon should always remain in the **top-right corner** of the page header.

### Requirements

* Keep the menu icon on the same row as the page title.
* The menu icon should never wrap onto the next line.
* If there is not enough horizontal space, wrap the page subtitle instead of moving the menu icon.
* The menu icon should only occupy the space it needs.
* Maintain the existing padding and alignment.
* Continue using the same reusable overflow menu component and behavior used elsewhere in the application.

---

# 4. Financial Dashboard – Cost vs Revenue Chart

The **Revenue (green) bar** in the **Cost vs Revenue** chart is currently not displaying.

Please investigate and fix this issue.

### Expected Behavior

* The Revenue (green) bars should render correctly for all available data.
* Use the application's primary green color consistently.
* Ensure both Revenue and Cost bars display correctly across desktop, tablet, and mobile.

---

# 5. Log Mortality Popup

Update the **Log Mortality** popup.

### Remove Pond Input

Remove the **Pond** input field from the form.

The mortality action is already initiated from a specific Pond Details page, so the pond is already known and should be associated automatically.

---

# 6. Total Dead Details Popup

When the user clicks the **Total Dead** statistic on the Pond Details page, open a popup displaying the complete mortality history for that pond.

### Popup Contents

Display a table containing:

* Date
* Number of Dead Fish
* Cause of Death
* Notes
* Actions

### Actions

Each row should include an **Edit** icon that allows users to update the mortality record.

### Additional Requirements

* Include appropriate empty, loading, and validation states.
* Use the application's existing modal design and styling.

---

# 7. Report Details Page Design

Redesign the **Report Details** page to improve readability.

### Layout

Keep the existing page layout, but display every submitted question and answer inside its own individual card.

### Question & Answer Cards

Each card should contain:

* The question
* The corresponding answer

### Styling Requirements

* Every question-and-answer card should use the same reusable card component.
* Use a subtle background fill that is different from the main page background.
* Maintain consistent spacing, padding, border radius, and typography.
* All cards should have the same style for visual consistency.

The objective is to allow managers to review an entire report quickly without expanding additional sections.

---

# 8. Subscription Page After Create Account

Update the **Subscription** page shown during the **Create Account** onboarding flow.

Currently, the subscription page shown after email verification does not match the main Subscription page inside the application.

### Requirements

The onboarding Subscription page should use **exactly the same content, layout, and pricing structure** as the main Subscription page inside the application.

This means:

* Use the same Single Farm and Multiple Farm sections.
* Use the same subscription prices.
* Use the same plan names.
* Use the same descriptions.
* Use the same feature lists.
* Use the same card layout and styling.

### Feature Lists

For example:

**Starter** should contain the complete list of platform features.

The higher plans should follow the same structure as the main Subscription page:

* **Growth** → Everything in Starter + additional pond limits.
* **Commercial** → Everything in Growth + unlimited ponds.

Likewise, for **Multiple Farm** plans:

* **Up to 3 Farms** should contain the complete feature list.
* Higher plans should display:

  * Everything in Up to 3 Farms
  * Plus the increased farm limits.

### Consistency

The onboarding Subscription page should not have its own simplified or different version.

It should be a direct replica of the main Subscription page inside the application so users see the exact same plans, pricing, features, and layout during onboarding and later within the product.

---

# 9. Login Page – Remember Me

Update the **Login** page.

Add a **Remember Me** toggle beneath the login credentials section.

### Requirements

* Position it near the **Forgot Password** link using a standard login layout.
* The toggle should allow users to stay signed in on the device.
* Preserve the existing spacing, typography, and design.
* Ensure the toggle works correctly on desktop, tablet, and mobile.

---

# 10. Navigation Bar – Logout

Add a **Logout** option to the navigation bar.

### Placement

* The Logout option should **not** be grouped with the main navigation links.
* Place it lower in the navigation, separated from the main navigation items with appropriate spacing or a divider.
* It should appear as its own section near the bottom of the navigation panel, following common application navigation patterns.

### Logout Confirmation

When the user clicks **Logout**, do not log them out immediately.

Instead, display a confirmation popup.

### Confirmation Popup

**Title:**

> Log Out

**Message:**

> Are you sure you want to log out of your account?

**Actions:**

* Cancel
* Log Out

Only log the user out after they confirm by clicking **Log Out**.

### Additional Requirements

* Use the application's standard confirmation modal component.
* Ensure the interaction is consistent across desktop, tablet, and mobile.
* After a successful logout, redirect the user to the Login page.
