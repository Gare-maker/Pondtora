# Additional UI, Settings & Assessment Updates

## 1. Password Visibility Toggle

Improve every password input across the application.

Every password field should include a password visibility toggle.

### Requirements

* Display an eye icon inside every password input.
* Tapping the icon should toggle between:

  * Hidden Password
  * Visible Password
* Preserve the current cursor position while toggling.
* Apply this consistently across the entire application, including:

  * Login
  * Create Account
  * Reset Password
  * Change Password
  * Profile Settings
  * Any future password fields.

---

## 2. Default Date Selection

Standardize date handling throughout the application.

Whenever a user opens any date picker, the default selected date should automatically be today's date.

### Requirements

* Automatically preselect the current date when any date picker opens.
* If the user does not manually change the date, today's date should be saved.
* Users should still be able to select another date if needed.

Apply this behaviour consistently across:

* Fish Stock Creation
* Feed Purchase
* Daily Feed
* Remaining Feed
* Bags Opened
* Feed Reconciliation
* Treatments
* Expenses
* Revenue
* Reports
* Invoices
* Staff Assessments
* Notifications
* Stock Transfers
* Any other page containing a date picker.

---

## 3. Default Weight per Bag

Update the **Add Purchased Feed** form.

### Requirements

* The **Weight per Bag (kg)** field should automatically default to **15 kg** whenever the form opens.
* Users may edit the value if required.
* If the field is left unchanged, **15 kg** should be saved automatically.
* All calculations that depend on bag weight should use the saved value.

---

## 4. Public Assessment Flow

Fix the public assessment workflow.

Currently, candidates complete the Candidate Information form, but the assessment questions do not appear afterward.

### Required Behaviour

After a candidate completes the registration form and clicks **Continue**, the system should:

* Validate all required fields.
* Save the candidate's information.
* Automatically navigate to the Assessment page.
* Load the correct assessment from the backend.
* Display all questions associated with that assessment.
* Display the progress bar.
* Display the question counter.
* Allow navigation using **Previous** and **Next**.
* Allow submission on the last question.

The assessment flow should always be:

1. Welcome Screen
2. Candidate Information
3. Assessment Questions
4. Assessment Submitted Successfully

The process must not stop after the Candidate Information page.

### Additional Requirements

* Ensure the assessment link loads the correct assessment.
* Retrieve assessment questions from the backend rather than placeholder data.
* If an assessment contains no questions, display a clear message such as:

> "No questions are currently available for this assessment."

instead of displaying a blank page.

* Ensure the **Continue** button correctly routes candidates to the assessment questions after validation.
* Ensure the complete assessment flow works properly on both mobile and desktop.
* Ensure candidate responses are saved correctly and are visible to administrators after submission.

---

## 5. Farm Management Editing

Improve the Farm Management section inside the **Settings** page.

Users should be able to edit the details of every farm they own.

### Farm List

Display all farms in a responsive table or card layout.

Each farm should include:

* Farm Name
* Farm Location
* Actions

Actions should include:

* View
* Edit
* Delete

---

### Edit Farm

Each farm row should include an **Edit** icon.

When the user clicks the Edit icon:

* Open the same form layout used when creating a new farm.
* Pre-populate every field with the farm's existing information.
* Allow the user to modify the details and save the changes.

The editable fields should be identical to the **Add Farm** form, including:

* Farm Name
* Farm Location
* Farm Description (if supported)
* Any additional farm fields currently available in the Create Farm form.

This ensures users have the same editing experience as creating a farm, without learning a different interface.

### Save Behaviour

When the user clicks **Save**:

* Validate all required fields.
* Update the farm in the database.
* Immediately reflect the changes throughout the application without requiring a page refresh.

The updated farm information should automatically appear in:

* Farm Selector (Navigation Dropdown)
* Dashboard
* Pond Management
* Financial Dashboard
* Reports
* Staff Assignments
* Subscription Management
* Notifications
* Every page that references that farm.

### Delete Farm

Selecting **Delete** should display a confirmation dialog before permanently removing the farm.

Example:

**Delete Farm?**

> Are you sure you want to permanently delete this farm? This action cannot be undone.

Buttons:

* Cancel
* Delete Farm

Only delete the farm after the user confirms.
