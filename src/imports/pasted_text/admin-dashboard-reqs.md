I read the two pages. A few words are unclear because humanity apparently invented handwriting specifically to defeat OCR, but the intended requirements are clear enough. Here is the cleaned-up version, written as a direct implementation prompt for the AI builder.

# Admin Dashboard & Subscription Management Updates

Implement the following functionality for a new **Admin Dashboard**. The admin area should be separate from the normal family finance user interface and should allow an authorized administrator to manage users, subscriptions, plans, and account access.

## 1. Admin Dashboard

Create an **Admin Dashboard** that provides an overview of the platform.

The dashboard should show:

* Total number of registered users/accounts.
* Number of users currently on a trial.
* Number of users whose trial has expired.
* Number of users currently on a paid subscription.
* Number of users on each subscription plan.
* Subscription expiration information.
* General subscription/account statistics.

The admin dashboard should use clear statistic cards and tables consistent with the existing application design system.

---

## 2. User Management Table

Add a **Users** table below the statistics/dashboard cards.

The table should display:

* User name
* User email
* Subscription plan
* Subscription amount
* Subscription status
* Trial status, where applicable
* Subscription start date
* Subscription expiration date
* Account status

The table should support the appropriate actions for an administrator.

### Admin actions

The administrator should be able to:

* View a user's account information.
* Manage the user's subscription.
* Delete/suspend a user account where permitted.
* Access the relevant account-management actions through an action/menu button.

Use pagination if the number of users exceeds the table's normal display limit.

---

# 3. Add User

Add an **Add User** button in the Admin Dashboard.

When clicked, it should open a form that allows the administrator to create/add a user.

The form should include the information required to create the account, including:

* Name
* Email
* Subscription plan
* Subscription amount/settings where applicable
* Account access/settings

The new user should then be added to the user list.

---

# 4. Subscription Management

The administrator should be able to configure the amount a user pays for their subscription.

### Important rule

The subscription amount configured for a user should apply **only to that specific user's account**.

For example:

* User A can have a custom subscription amount.
* User B can have a different subscription amount.
* The administrator can configure the amount independently for each user.

However, there should also be support for **general/default subscription plans**.

---

# 5. Subscription Plans

Create a subscription-plan management system.

The administrator should be able to create and manage general plans such as:

* Monthly
* Yearly

Each plan should have:

* Plan name
* Billing frequency
* Price
* Description
* Status

The system should support both **single-family and multiple-family account structures** where applicable.

For example:

* A plan can apply to one family.
* A plan can support multiple families/accounts.
* The administrator should be able to configure the relevant pricing and access rules.

---

# 6. Trial Management

The system should support a **30-day free trial**.

When a new user/account is created with a trial:

* Trial period = 30 days.
* Store the trial start date.
* Automatically calculate the trial expiration date.
* Display the remaining trial period.
* Identify expired trials.
* Prevent access to paid features when the trial has expired unless the account is upgraded, according to the application's access rules.

The admin dashboard should clearly show:

* Users currently on trial.
* Users whose trial has expired.
* Trial expiration dates.

---

# 7. Subscription Status

Each user should have a clear subscription status.

Possible statuses should include:

* Trial
* Active
* Expired
* Cancelled
* Suspended

The status should automatically update based on the user's subscription/trial dates and payment state where applicable.

---

# 8. Billing Frequency

The subscription system should support:

* **Monthly billing**
* **Yearly billing**

The admin should be able to see which billing frequency each user is currently using.

The system should also calculate the relevant:

* Subscription start date
* Next billing/expiration date
* Subscription amount
* Billing frequency

---

# 9. Family / Multi-Family Support

The subscription system should support both:

### Single-family account

One family/household operating under one subscription.

### Multiple-family account

An account or subscription that can manage/access multiple families.

The admin should be able to identify which structure applies to an account and manage the appropriate subscription configuration.

---

# 10. Admin Access Control

Only authorized administrators should be able to access the Admin Dashboard.

Normal family users should **not** see:

* Admin Dashboard
* User management
* Subscription management
* Plan management
* Administrative controls

Admin functionality should be protected by role-based access control.

---

# 11. Admin Dashboard Navigation

Create an admin navigation structure that is separate from the normal family-finance navigation.

Suggested structure:

**Admin Dashboard**

* Dashboard
* Users
* Subscriptions
* Plans
* Settings

The existing family-finance navigation should remain unchanged for normal users.

---

# 12. UI / Design Requirements

The Admin Dashboard must use the **existing application design system**.

Maintain:

* Existing typography
* Existing spacing
* Existing button styles
* Existing card styles
* Existing colors
* Existing table styles
* Existing responsive behavior
* Existing mobile navigation patterns

Do not introduce a completely different visual style for the admin interface.

All tables should follow the application's existing table rules, including:

* Consistent foreground/background colors.
* First/header row styling.
* 10% opacity dividers where applicable.
* Horizontal scrolling on smaller screens.
* Sticky first column where required.
* Pagination for large datasets.

---

# 13. Responsive Design

The entire Admin Dashboard must work properly on:

* Desktop
* Tablet
* Mobile

On mobile:

* Statistic cards should resize properly.
* Tables should remain usable through horizontal scrolling.
* Buttons should wrap appropriately rather than forcing content outside the screen.
* Modals/forms should fit the screen.
* No page should inherit the previous page's scroll position.
* Opening the navigation should prevent the main page from scrolling underneath it.

---

# 14. Data & Functional Integration

Do not build this as a static UI.

Connect the Admin Dashboard to the application's actual user/account/subscription data.

When an administrator:

* Adds a user
* Changes a subscription
* Changes a subscription amount
* Changes a plan
* Changes billing frequency
* Starts/extends/ends a trial
* Suspends an account

the changes should be reflected throughout the application wherever that data is used.

All existing authentication, user accounts, family accounts, and subscription-related functionality should remain connected.

---

## Important Implementation Rule

**Do not break existing functionality.**

Before implementing the Admin Dashboard, review the existing application structure and connect the new admin functionality to the current authentication, family, user, and subscription architecture.

Do not create duplicate user, family, or subscription systems when existing ones can be reused.

The goal is to have **one connected system** where the Admin Dashboard manages the same users, families, plans, and subscriptions used by the main application.
