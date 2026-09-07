## Pondtora Update Request

Please implement the following updates. Ensure all changes are reflected in both the UI design and prototype behavior across **desktop, tablet, and mobile** where applicable.

---

# 1. Feed Summary by Pallet (Pond Details)

## Display Maximum kg

Update every pallet card inside the **Feed Summary by Pallet** section.

Once a maximum kg value has been configured for a pallet, display it directly on the card.

Example:

* Current Feed: **245 kg**
* **Max kg: 890 kg** (display in **red**)

Requirements:

* The **Max kg** value should appear immediately after it is configured.
* Display it even if the current feed is **0 kg**.
* Use a red text style to distinguish it from the normal feed value.
* Keep the card responsive and maintain the existing layout.

---

# 2. Nursery Pond Feed Summary

Nursery ponds should also display the **Feed Summary by Pallet** section.

Requirements:

* Show the same pallet summary cards used in Production ponds.
* When fish are transferred from a Nursery pond:

  * Transfer the feed summary proportionally based on the selected feed percentage.
  * The destination pond should receive the corresponding pallet feed allocation.
* Any configured **Max kg per Pallet** values should also transfer appropriately where applicable.

---

# 3. Invoice Error State

Update the invoice status behavior.

When an invoice is marked as **Error**:

* Keep the invoice in the table.
* Change its status to **Error**.
* Display the row with the existing error styling (light red).
* **Remove or disable the "Mark as Paid" (checkmark) action** so the invoice cannot later be marked as paid.
* Error invoices remain viewable for auditing and reference.

---

# 4. Employee Assessments Module

Create a new page called **Employee Assessments**.

**Navigation Placement**

Place this page **immediately before the Subscription page**, making it the **second-to-last page** in the application's navigation.

---

# Employee Assessments Overview

This page is the central location for managing employee assessments.

Administrators should be able to:

* Manage assessment questions
* Copy assessment links
* Review completed assessments

The system contains **only two permanent assessment types**:

* Knowledge Test
* Compatibility Test

These assessment types are fixed and **cannot be created or deleted**.

Administrators only manage the questions.

---

# Page Header

**Title**

Employee Assessments

**Subtitle**

Manage assessment questions, distribute assessment links, and review candidate results.

---

# Header Actions

Display two primary action buttons.

## 1. Test Questions ▼

Clicking this button opens a dropdown containing:

* Knowledge Test
* Compatibility Test

Selecting either option opens its **Question Management** page.

---

## 2. Copy Test Link ▼

Clicking this button opens a dropdown containing:

* Knowledge Test
* Compatibility Test

Selecting one should immediately copy the unique assessment URL for that assessment.

Each assessment has its own permanent link.

---

# Candidate Assessment Flow

When a candidate opens an assessment link:

Display a registration form before the assessment begins.

Required fields:

* Full Name
* Email Address
* Phone Number
* Gender

Primary button:

**Start Assessment**

After submission:

* Begin the assessment immediately.
* Candidate answers every question.
* Candidate submits the assessment.
* Display a success confirmation after submission.

Candidates **must not** see:

* Correct answers
* Category scores
* Overall evaluation
* Recommendations

These are visible only to administrators.

---

# Question Management

Opening either assessment from **Test Questions** should open its dedicated Question Management page.

Administrators can:

* Add questions
* Edit questions
* Delete questions
* Reorder questions using drag-and-drop
* Assign categories

Each question card should contain:

* Question
* Category dropdown
* Answer options
* Correct answer selector
* Edit
* Delete
* Drag handle

---

# Scoring Rules

Every question has **equal weight**.

Do **not** include any score or weight field.

The application should calculate the final score automatically.

---

## Knowledge Test

Only one answer may be marked as correct.

Use a radio button or single-select control.

---

## Compatibility Test

Administrators choose one predefined answer for each question.

Candidates never see how answers are scored.

Each answer is internally mapped to its compatibility category so the application can automatically calculate:

* Category scores
* Overall compatibility score

---

# Knowledge Test Categories

Category dropdown options:

* Fish Feeding
* Fish Health
* Water Quality Management
* Water Flow-Through System
* Pond Maintenance
* Equipment Operation
* Repairs & Maintenance
* Fish Stock Management
* Harvesting
* Inventory Management
* Safety & Hygiene
* Farm Rules & SOPs

---

# Compatibility Categories

Category dropdown options:

* Communication
* Teamwork
* Leadership
* Responsibility
* Emotional Intelligence
* Integrity
* Discipline
* Adaptability
* Initiative
* Stress Management
* Physical Readiness
* Problem Solving

---

# Assessment Results

Below the header actions, create an **Assessment Results** section.

Use two tabs:

* Compatibility Test
* Knowledge Test

---

# Compatibility Test Results

Display submissions in a table.

Columns:

* Candidate Name
* Email
* Phone Number
* Overall Compatibility Score
* Date Taken
* View Details

Selecting **View Details** opens a modal or side panel displaying:

### Candidate Information

* Full Name
* Email
* Phone Number
* Gender
* Date Taken
* Time Taken

### Compatibility Category Breakdown

Display scores for:

* Communication
* Teamwork
* Leadership
* Responsibility
* Emotional Intelligence
* Integrity
* Discipline
* Adaptability
* Initiative
* Stress Management
* Physical Readiness
* Problem Solving

Also display:

* Overall Compatibility Score

### Recommendation

One of:

* Highly Recommended
* Recommended
* Consider
* Not Recommended

---

# Knowledge Test Results

Display submissions in a table.

Columns:

* Candidate Name
* Email
* Phone Number
* Overall Score
* Pass/Fail
* Date Taken
* View Details

Do **not** display category scores in the table.

Selecting **View Details** opens a modal or side panel.

### Candidate Information

Display:

* Full Name
* Email
* Phone Number
* Gender
* Date Taken
* Time Taken

### Knowledge Category Breakdown

Display performance for:

* Fish Feeding
* Fish Health
* Water Quality Management
* Water Flow-Through System
* Pond Maintenance
* Equipment Operation
* Repairs & Maintenance
* Fish Stock Management
* Harvesting
* Inventory Management
* Safety & Hygiene
* Farm Rules & SOPs

Also display:

* Total Correct Answers
* Total Wrong Answers
* Overall Score
* Pass/Fail Status

---

# General Requirements

* Integrate the Employee Assessments page into the application's existing design system.
* Use the same typography, spacing, colors, cards, tables, dropdowns, and modal components already used throughout Pondtora.
* Ensure all pages are fully responsive across desktop, tablet, and mobile.
* Apply pagination to the assessment results tables using the application's standard table pagination (10 rows per page).
* Add appropriate loading, empty, validation, and confirmation states where necessary.
* Ensure copied assessment links are unique to each assessment type and provide a success confirmation after copying.
