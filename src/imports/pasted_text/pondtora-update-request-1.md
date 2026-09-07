## Pondtora Update Request

Please implement the following updates. Ensure all changes are reflected in the UI, UX, responsive layouts, and prototype behavior across desktop, tablet, and mobile.

---

# 1. Employee Assessments

## Improve Popup Scrolling

The **Knowledge Test** and **Compatibility Test** popups currently have scrolling issues.

### Requirements

* Fix the scrolling behavior.
* The popup body should scroll smoothly while the header and footer remain fixed.
* Prevent nested or conflicting scroll areas.
* Ensure long forms, long question lists, and detailed result pages scroll correctly on desktop, tablet, and mobile.

---

## Add Search to Assessment Results

Add a search bar above both assessment result tables.

Applies to:

* Knowledge Test Results
* Compatibility Test Results

The search should filter by:

* Candidate Name
* Email Address
* Phone Number

Search should update the table instantly as the user types.

---

## Improve "Copy Test Link" Experience

When an administrator selects **Copy Test Link**, do not simply copy the URL silently.

Instead:

Display a modal containing:

* Assessment Link
* Copy button
* Close button

Requirements:

* The link should be displayed inside a read-only input field.
* Users should be able to:

  * Select the link manually
  * Copy using the Copy button
* Display a success message after copying.

---

## Sticky Candidate Name Column

In both assessment result tables:

* Knowledge Test
* Compatibility Test

Make the **Candidate Name** column sticky.

When horizontally scrolling:

* Candidate Name remains fixed.
* All remaining columns scroll normally.

---

## Mobile Dropdown Behavior

On the mobile version:

When the **Test Questions** dropdown is opened:

* If positioned near the left edge, open toward the right.
* If positioned near the right edge, open toward the left.
* Keep the dropdown completely inside the viewport.
* Tapping outside the dropdown should close it.

---

## Regenerate Assessment Links

Assessment links should automatically regenerate every **6 hours**.

Requirements:

* Each assessment type maintains its own unique active link.
* Old links automatically expire after 6 hours.
* Newly generated links become the active assessment links.
* Copy Test Link should always return the currently active link.

---

# 2. Feed Summary by Pellet

Update every **Feed Summary by Pellet** card.

Each card should consistently display:

* Pellet Size
* Current Feed
* Max KG

### Example

**4mm Pellet**

Current Feed: **1,250 kg**

Max KG: **2,000 kg** *(display in red)*

### Requirements

* Every pellet card must always display all three values.
* Max KG is linked to:

  * Pellet Size
  * Pond
  * Fish Stock
* Whenever Max KG is created or updated, the corresponding card should update immediately without requiring a page refresh.
* Max KG should always use red text to distinguish it from the current feed quantity.
* Maintain responsive layouts across desktop, tablet, and mobile.

---

# 3. Public Assessment Interface (Candidate Experience)

Create a dedicated public assessment interface that candidates access using the copied assessment link.

This interface is completely separate from the main application.

Candidates should **not** be required to log in.

Use **Pondtora branding** throughout the assessment experience instead of the hiring company's branding.

---

# Public Assessment Flow

The assessment should consist of four pages.

---

## Page 1: Welcome Screen

This is the first screen after opening an assessment link.

### Header

Display:

* Pondtora Logo
* Pondtora Product Name
* Assessment Title

  * Knowledge Test
  * Compatibility Test

Do **not** display the hiring company's logo.

---

### Assessment Introduction

Display introductory text similar to:

> Welcome to the Employee Assessment Portal. Please complete this assessment honestly. Your responses will be submitted to the organization that invited you to take this assessment. The assessment is expected to take approximately 10–15 minutes.

---

### Information Card

Display:

* Assessment Type
* Number of Questions
* Estimated Duration

---

### Primary Button

**Start Assessment**

---

## Page 2: Candidate Information

Before the assessment begins, display a registration form.

### Required Fields

* Full Name
* Email Address
* Phone Number
* Gender

Checkbox:

☐ I confirm that the information provided is accurate.

Primary Button:

**Continue**

Validation:

* All required fields must be completed.
* The confirmation checkbox must be selected before continuing.

---

## Page 3: Assessment

Create a clean, distraction-free assessment experience.

### Header

Display:

* Pondtora Logo
* Pondtora
* Assessment Title

---

### Progress

Display:

* Progress Bar
* Question Counter

Example:

**Question 7 of 25**

---

### Question Card

Each question should be displayed inside a clean card.

Display:

* Question Number
* Question Text

Below the question, display answer options as **radio buttons**.

Only one answer may be selected.

---

### Navigation

Bottom navigation:

* Previous
* Next

On the final question:

Replace **Next** with:

**Submit Assessment**

The interface should automatically save progress while navigating between questions.

---

## Page 4: Submission Confirmation

After submission, display a success screen.

### Success Card

Display:

Success Icon

Title:

**Assessment Submitted Successfully**

Message:

> Thank you for completing the assessment. Your responses have been submitted successfully and have been sent to the organization for review.

Primary Button:

**Close**

---

# Administrator Workflow

After submission:

The system should automatically:

* Save all responses
* Calculate scores
* Generate category scores
* Calculate overall score
* Display results inside the Employee Assessments page

Results should appear under:

* Knowledge Test
* Compatibility Test

Administrators should continue using **View Details** to review:

* Candidate Information
* Category Breakdown
* Overall Score
* Recommendations
* Assessment Summary

---

# UI & UX Requirements

The public assessment interface should:

* Use Pondtora branding throughout.
* Be clean, modern, and professional.
* Be fully responsive on desktop, tablet, and mobile.
* Use a single-column layout.
* Display questions inside clean cards.
* Include a visible progress bar and question counter.
* Use large, touch-friendly buttons.
* Provide smooth transitions between questions.
* Keep the interface distraction-free while maintaining the same design language as the Pondtora application.

---

# 4. Navigation Update

Update the main navigation order.

Move **Reports** so that it appears **before Invoices** in the navigation menu.

This change should be reflected across desktop, tablet, and mobile navigation.
