## Pondtora Update Request

Please implement the following updates and ensure they are fully reflected in the UI, UX, responsive layouts, and prototype behavior across desktop, tablet, and mobile.

---

# 1. Fix Assessment Link Error

The public assessment link generated from **Employee Assessments → Copy Test Link** is currently broken.

Instead of opening the assessment, it returns the following XML error:

> **RequestHeaderSectionTooLarge**
> Your request header section exceeds the maximum allowed size.

This indicates the current link generation or routing is incorrect.

### Requirements

* Fix the assessment link generation.
* The copied link should open the **Public Assessment Interface**, not an XML error page.
* Do not include unnecessary data, tokens, or large request headers in the URL.
* Generate a clean, lightweight, shareable URL for each assessment.
* Ensure the link works correctly in any browser without requiring authentication.
* The assessment should load directly into the public assessment flow:

  1. Welcome Screen
  2. Candidate Information
  3. Assessment
  4. Submission Confirmation
* Verify that both **Knowledge Test** and **Compatibility Test** links work correctly.
* Continue enforcing the existing rule that assessment links automatically regenerate every **6 hours**, while previously generated links expire.

---

# 2. Assessment Completion Rules

Update the assessment submission logic.

### Requirements

* Candidates should **not be required to answer every question** before submitting.
* Unanswered questions should simply be treated as unanswered and included in the final scoring logic.
* The **Submit Assessment** button should remain available even if some questions are skipped.
* Any unanswered questions should be recorded as blank responses.
* The administrator should still be able to see which questions were skipped in the assessment results.

---

# 3. Standardize Pellet Size Naming Across the Entire Application

The pellet size naming is currently inconsistent across different pages.

### Requirement

Use one standardized naming convention everywhere in the application.

Use this exact format:

* 1.5 mm
* 2.0 mm
* 3.0 mm
* 4.0 mm
* 6.0 mm

This format should be used consistently across every page, popup, table, dropdown, card, filter, notification, report, and form, including but not limited to:

* Feed Inventory
* Feed Documentation
* Feed Summary by Pellet
* Pond Details
* Feed Remaining
* Opened Bags
* Feed Purchase History
* Fish Stock History
* Notifications
* Revenue Records
* Invoice-related feed references
* Reports
* All dropdowns that display pellet sizes

### Additional Requirements

* Use the same ordering everywhere:

  * 1.5 mm
  * 2.0 mm
  * 3.0 mm
  * 4.0 mm
  * 6.0 mm
* Do not mix formats such as:

  * `4mm`
  * `4 MM`
  * `4.0MM`
  * `4 mm`
* All existing and newly created records should display the standardized format consistently.

---

# 4. Reset Scroll Position During Navigation

The application is currently inheriting the scroll position from the previous page.

### Current Issue

If a user scrolls down on one page and then navigates to another page, the next page opens at the same scroll position, causing the page header and navigation to be hidden.

### Requirements

* This should be fixed globally across the application.
* Every new page should always open from the top.
* Reset the scroll position to the top whenever navigating between pages.
* Ensure the page header, navigation bar, and page title are always visible immediately after navigation.
* Apply this behavior consistently across desktop, tablet, and mobile.

---

# 5. Test Questions Dropdown Position

The **Test Questions** dropdown is not positioning correctly.

### Current Issue

Part of the dropdown renders outside the viewport and becomes hidden.

### Requirements

* Position the dropdown so it always remains fully visible.
* Since the button is located near the left side of the page, the dropdown should open toward the **right**.
* Prevent the dropdown from overflowing outside the viewport.
* Maintain consistent spacing, elevation, and styling with the application's existing dropdown components.
* Clicking anywhere outside the dropdown should close it.

---

# 6. Mobile Layout for Employee Assessment Header

Update the mobile layout of the **Employee Assessments** page.

### Current Issue

The two action buttons are not positioned correctly.

### Requirements

On the mobile version:

* Display the page title and subtitle first.
* Place the two action buttons directly below the header:

  * **Test Questions**
  * **Copy Test Link**
* The buttons should appear beneath the title and subtitle, not beside them.
* Allow the buttons to wrap naturally when needed.
* Maintain consistent spacing with the rest of the application.
* Ensure the layout remains fully responsive across different mobile screen sizes.
