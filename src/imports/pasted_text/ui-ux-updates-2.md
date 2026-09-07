## UI/UX Update Request

Please implement the following updates. Ensure all changes are reflected in the UI, UX, and application behavior across desktop, tablet, and mobile. Maintain the existing design system and preserve the current layouts unless otherwise specified.

---

# 1. Add Pagination to All Tables

Implement pagination across every table in the application.

### Requirements

* Display a maximum of **10 records per page**.
* If a table contains **10 or fewer records**, do not display pagination.
* If a table contains **more than 10 records**, automatically display pagination controls.

Pagination should include:

* Previous
* Next
* Page numbers
* Current page indicator

Apply this consistently to every table throughout the application.

---

# 2. Report Submission - Add Confirmation for Pumping Machines

In the **Submit Report** popup, add a confirmation step for pumping machines.

### Question

**Have you turned off all pumping machines?**

Options:

* Yes
* No

If the user selects **Yes**, display a confirmation question:

**Are you sure you personally turned off all pumping machines or assisted with this task?**

Options:

* Yes
* No

Display the note below the confirmation question:

> **Click "Yes" only if you personally carried out this task or assisted.**

The selected answers should be included in the submitted report and visible in the Report Details page.

---

# 3. Update Logo Placement

Replace every instance of the old application icon with the new logo provided.

### Navigation Bar

* Increase the logo height so it nearly fills the height of its container while maintaining appropriate padding.
* Preserve the logo's aspect ratio.
* Do not stretch or distort the image.

### Authentication Pages

Use the same logo on:

* Create Account
* Login
* Email Verification
* Forgot Password
* Reset Password

Replace every location where the previous icon/logo appears with the new logo.

---

# 4. Email Verification Flow

Update the registration flow.

### New Flow

1. Create Account
2. Email Verification
3. Subscription Selection
4. Access the Application

After a user submits the Create Account form, they should **not** be taken directly to the Subscription page.

Instead, display a dedicated **Verify Email** page.

### Verify Email Page

Include:

* Page title: **Verify Your Email**
* Short description explaining that a verification code has been sent to the registered email address.
* OTP/code input fields.
* Verify button.
* Resend Code button with an appropriate countdown timer.
* Change Email option.
* Loading, success, and error states.
* Validation for incorrect or expired codes.

Only after successful email verification should the user proceed to the Subscription page.

---

# 5. Subscription Pricing

Do not modify the subscription pricing.

Use the **same pricing structure currently used** on the main Subscription page for both:

* Single Farm Plans
* Multiple Farm Plans

Ensure the onboarding subscription page and the in-app subscription page always display identical pricing and plan information.

---

# 6. Reports Page

## Remove Resolve Status

Remove the **Resolved** status/tag completely.

The only tag displayed on report cards should be the **Report Type**:

* Daily
* Weekly
* Monthly

No other status badges should appear.

---

## Display Complete Report

Update the report cards so that the **entire report is visible immediately**.

Users should not need to click into a report to view its contents.

Display all submitted information directly on the card in a well-structured layout.

Include:

* Staff Name
* Report Type
* Report Title
* Submission Date
* Feeding information
* Morning/Evening/Both selection
* Outlet & inlet responses
* Water flushing responses
* Pumping machine responses
* Additional notes
* Every other submitted field

Arrange the information cleanly, line by line, so managers can review reports at a glance.

---

# 7. Fix Pond Details Page

There is currently a bug where opening the **Pond Details** page displays a black screen.

Please investigate and fix this issue.

### Expected Behavior

* The Pond Details page should load normally.
* All data should render correctly.
* Existing functionality should remain intact.
* Ensure the fix works across desktop, tablet, and mobile.

This is a functional bug and should be treated as a high-priority fix.

---

# 8. Invoice Page (Mobile)

Update the mobile version of the Invoice page.

Replace the visible action buttons with a single **overflow/menu icon** positioned in the top-right corner of the page header.

The menu should behave exactly like the overflow menus already implemented elsewhere in the application (such as the Pond Details page).

### Requirements

* Position the menu icon in the top-right corner of the page header.
* Hide all action buttons from the main layout.
* Tapping the menu icon should reveal the available invoice actions in a dropdown menu.
* The dropdown should automatically position itself based on available screen space:

  * Near the right edge → open toward the left.
  * Near the left edge → open toward the right.
  * Near the bottom → open upward.
  * Near the top → open downward.
* Tapping anywhere outside the dropdown should close it automatically.
* Ensure the dropdown always remains fully visible within the viewport.

Use the same reusable overflow menu component and interaction pattern already used throughout the application for consistency.
