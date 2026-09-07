## UI/UX Update Request

Please implement the following updates. Ensure all changes are reflected across desktop, tablet, and mobile while maintaining the existing design system, responsiveness, and current functionality.

---

# 1. Pond Details: Maximum Feed (kg) Per Pallet

Add a new action to the **Pond Details** page called:

**Set Max kg per Pallet**

> **Note:** This setting is tied to the **Fish Stock**, **not** the pond. Each fish stock can have its own maximum feed amount for each pallet size.

---

## Desktop

On **desktop and tablet**, display **Set Max kg per Pallet** as a normal action button alongside the other Pond Details action buttons.

If necessary, shorten the button label slightly so it occupies less horizontal space while remaining clear and understandable.

For example:

* Set Max kg
* Max kg per Pallet

Choose the version that best fits the existing design without making the toolbar feel crowded.

---

## Mobile

On the **mobile version**, **do not display this as a standalone button**.

Instead:

* Place **Set Max kg per Pallet** inside the existing Pond Details **Actions** dropdown/menu together with the other pond actions.
* It should follow the same interaction pattern as the rest of the actions in the menu.
* The menu should continue to behave correctly:

  * Stay within the viewport.
  * Open in the appropriate direction depending on available space.
  * Close when the user taps outside of it.

---

## Set Max kg Popup

When the user selects **Set Max kg per Pallet**, open a popup with the following fields:

* Pallet (Dropdown)
* Maximum kg (Number input)

This setting is optional.

---

## Display on Feed Summary by Pallet

Once a maximum value has been set:

* Display the **Max kg** value inside the corresponding pallet card in the **Feed Summary by Pallet** section.
* Add an **Edit** icon on the pallet card so users can update the maximum value.
* Display the maximum value immediately after saving, even if no feeding has been recorded.
* If feeding has not started:

  * Current Feed = **0 kg**
  * Max kg should still be displayed.

Ensure the pallet cards remain fully responsive across desktop, tablet, and mobile.

---

## Notifications

Add a new notification type.

Whenever the cumulative feed for a pallet reaches or exceeds its configured maximum, automatically generate a notification.

The notification should include:

* Pond Name
* Fish Stock
* Pallet Size

Example:

> Pond A • Stock (12 Mar 2026) • 3 mm pallet has reached its maximum feed limit.

This notification should appear on the Notifications page and follow the existing notification system.

---

## Feed Documentation Integration

On the Feed Documentation page, when displaying ponds and fish stocks for feeding:

If a fish stock has reached the configured maximum for a pallet:

* Display a clear red warning indicator beside the corresponding pallet/feed size.
* The warning should be be visible before feeding is logged so users know the limit has already been reached.

---

# 2. Feed Documentation Page Spacing

Increase the vertical spacing between:

* Page title
* Date selector
* Action buttons

The current spacing feels too compressed.

Maintain the existing responsive layout.

---

# 3. Toggle Components

Update every toggle/check component across the application.

Examples include:

* Remember Me
* Agree to Terms & Conditions
* Similar confirmation toggles

### Unchecked State

* White background
* Green or black border
* No dark fill

### Checked State

* Display a visible check icon inside the toggle.
* Maintain the existing primary color styling.

Apply this consistently across the application.

---

# 4. Global Scroll Position Reset

There is still a navigation issue.

### Current Problem

If the user scrolls down a page and then opens another page, the new page inherits the previous page's scroll position.

Example:

* Scroll halfway down Pond Management.
* Open Pond Details.
* Pond Details opens halfway down instead of starting from the top.

This issue occurs across multiple pages.

### Required Behavior

Implement a global scroll reset.

Whenever a new page is opened:

* Reset the scroll position to the top.
* Display the page header immediately.
* Never inherit the previous page's scroll position.

Apply this globally throughout the application.

---

# 5. Pond Categories

Add support for two pond categories.

## Categories

* Normal Pond
* Pre-Sorting Pond

---

## Create Pond

Update the **Create Pond** popup.

Add a required dropdown field:

**Pond Category**

Options:

* Normal Pond
* Pre-Sorting Pond

---

## Edit Pond

Update the **Edit Pond** functionality.

When editing a pond:

* Display the same **Pond Category** dropdown used during pond creation.
* Allow users to change the pond category at any time.

Available options:

* Normal Pond
* Pre-Sorting Pond

---

## Display Category

Display the selected category in:

* Pond List (Desktop)
* Pond List (Mobile)
* Pond Details page

---

## Dynamic Behaviour

Changing the pond category should immediately update the Pond Details page after saving.

### If the pond is a **Normal Pond**, show:

* Set Max kg per Pallet
* Feed Summary by Pallet
* Transfer Fish

### If the pond is a **Pre-Sorting Pond**, hide:

* Set Max kg per Pallet
* Feed Summary by Pallet
* Transfer Fish

Users should still be able to:

* View Fish Information
* Log Feeding from the Feed Documentation page
* Perform all other supported actions unrelated to pallet feeding.

These rules should be be enforced consistently across the application.

Whenever the pond category changes:

* Update the category badge on the Pond Details page.
* Update the category shown in the Pond List (desktop and mobile).
* Update any related permissions, notifications, and UI behavior automatically.

---

# 6. Feed Inventory

On the **Stock** tab of the Feed Inventory page:

Reduce the font size of the pallet labels (e.g. **2 mm**, **3 mm**, **4 mm**).

The labels are currently too visually dominant.

Maintain readability while giving more emphasis to the surrounding stock information.

---

# 7. Orange Accent Color

The current orange accent appears too muted.

Update it to a brighter, more vibrant orange while maintaining accessibility and proper color contrast.

Apply the updated orange consistently across all existing orange UI elements, including:

* Subscription highlights
* Best Value badges
* Calendar indicators
* Status indicators
* Any other orange accent used throughout the application.

Do not modify the primary green color.

---

# 8. Login & Create Account Logo (Desktop)

Update the logo displayed on the **Create Account** and **Login** pages in the desktop view.

### Requirements

* Add a solid **#FFFFFF** (white) background behind the logo.
* The white background should be fully opaque (100% opacity). Do **not** reduce its opacity or make it translucent.
* The white background should surround the logo cleanly so the logo remains sharp, clear, and easy to distinguish regardless of the page background.
* Maintain the logo's aspect ratio.
* Do not stretch or distort the logo.
* Ensure the logo remains centered and scales appropriately within its container.
* Apply this update only to the Login and Create Account pages in the desktop view. The rest of the application should remain unchanged.
