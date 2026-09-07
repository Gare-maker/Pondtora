## Feed Documentation & Feed Reconciliation Updates

### 1. Log Remaining Feed Popup

Update the **Log Remaining Feed** popup.

Replace the **Fish Stock** input with a **Pond** dropdown.

The popup should contain:

* Pond (Dropdown)
* Stock (Automatically populated based on the selected pond)
* Feed Brand
* Pellet Size
* Remaining Feed (kg)
* Note (Optional)

### Behavior

* After the user selects a **Pond**, the **Stock** field should automatically populate with the active fish stock(s) in that pond.
* The user should not need to manually search for or select the stock after choosing a pond.
* If the pond contains only one active stock, automatically select it.
* If the pond contains multiple active stocks, display them in the Stock dropdown for selection.

---

# Feed Reconciliation Statuses

Do not display only a generic mismatch.

Support multiple reconciliation statuses, including:

* Matched
* Remaining Mismatch
* Bag Count Mismatch
* Feed Quantity Mismatch
* Multiple Mismatches

Each status should use a clear color-coded badge so users can immediately identify the type of reconciliation result.

---

# Feed Reconciliation Details

Update the Reconciliation Details popup.

When a user taps any reconciliation record, **do not** display generic fields such as:

* Feed Available
* Feed Given
* Valid

These labels are not useful and make the reconciliation difficult to understand.

Instead, display the complete reconciliation calculation exactly as the system performed it, step by step.

### Reconciliation Breakdown

Display:

**Step 1 — Total Feed Given**

Show the total feed recorded for the selected pellet size across all relevant stocks.

Example:

```
June Stock = 12 kg
July Stock = 13 kg

Total Feed Given = 25 kg
```

---

**Step 2 — Carryover Calculation**

Display:

```
Carryover from Yesterday = 8 kg

25 kg − 8 kg = 17 kg

Required New Feed Today = 17 kg
```

---

**Step 3 — Expected Bags Opened**

Display:

```
Configured Bag Weight = 15 kg

17 kg ÷ 15 kg = 1.13

Expected Bags Opened = 2 Bags
```

---

**Step 4 — Recorded Bags Opened**

Display:

```
Recorded Bags Opened = 1 Bag
```

If the values differ, highlight this section in red and clearly indicate:

**Bag Count Mismatch**

---

**Step 5 — Remaining Feed Calculation**

Display:

```
Expected Feed Available

Carryover
+
Opened Bags × Bag Weight

=

Expected Feed Available

Expected Remaining

Expected Feed Available
−
Total Feed Given

=

Expected Remaining
```

Then compare:

Expected Remaining

vs

Recorded Remaining

If they differ, highlight the difference in red and display:

**Remaining Mismatch**

---

### Error Highlighting

Instead of simply displaying "Mismatch", clearly highlight the exact calculation step where the error occurred.

For example:

* Step 3 highlighted → Bag Count Mismatch
* Step 5 highlighted → Remaining Mismatch

If multiple errors exist, highlight each affected section independently.

This makes it immediately obvious where the reconciliation failed.

---

# Notification Navigation

When a reconciliation notification is opened from the Notifications page:

* Open the Feed Documentation page.
* Automatically switch to the **Reconciliation** tab.
* Automatically load the correct date.
* Automatically open the selected reconciliation record.
* Expand the reconciliation details immediately.

The user should not have to click again to view the reconciliation.

Ensure this behavior is consistent for every reconciliation notification.

---

# Daily Feed Session Persistence

Improve the logging workflow.

If a user logs feed for one pond and saves it, then clicks **Log Feed** again on the same day:

* Preserve the currently selected date.
* Preserve the current day's session.
* Do not reset the popup.
* Allow the user to continue logging feed for another pond immediately.
* Any values that should remain constant for the current session (such as the selected date) should remain populated, while pond-specific fields should be ready for the next entry.

This makes it easy to document multiple ponds consecutively without repeatedly re-entering the same information.

---

# Daily Feed Editing

Improve the edit functionality on the **Daily Feed** tab.

When the user clicks the **Edit** icon:

* Open the exact same popup used for creating a feed record.
* Pre-populate every field with the previously saved values.

Inside the popup, provide two edit modes using tabs or a segmented control:

* **Daily Feed**
* **Remaining Feed**

The user should be able to switch between these two sections without leaving the popup.

Any changes made should update the corresponding records while preserving data integrity.

The editing experience should be identical to the original logging experience so users do not need to learn a different interface for editing records.
