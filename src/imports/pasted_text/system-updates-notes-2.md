# Additional System Updates

## 1. Free Trial Date Recording

Update the subscription onboarding logic.

When a user starts a free trial:

* Automatically record today's date as the trial start date.
* Use the system date at the moment the trial begins.
* This date should be used to calculate the trial duration and expiry accurately.
* Do not allow the trial start date to be blank or manually altered during onboarding.

---

## 2. Net Profit Color Indicators

Update all Net Profit displays across the application.

Rules:

* If Net Profit is greater than 0, display the amount in **green**.
* If Net Profit is less than 0, display the amount in **red**.
* If Net Profit is exactly 0, use the default neutral text color.

Apply this consistently on:

* Financial Dashboard
* Reports
* Analytics
* Statistics Cards
* Any page displaying Net Profit.

---

## 3. Purchased Feed History Editing

Update the Purchased Feed History.

When the user clicks **Edit** on a purchase record:

* Open the same popup used when creating a purchased feed record.
* Load all previously saved values automatically.

Users should be able to edit every field originally entered, including:

* Feed Brand
* Pellet Size
* Quantity Purchased
* Number of Bags
* kg per Bag (if applicable)
* Unit Price
* Total Cost
* Supplier
* Purchase Date
* Notes
* Any other purchase-related field

Saving the changes should update the existing purchase record instead of creating a new one.

---

## 4. Feed Inventory Filtering

Update all feed-related dropdowns.

### Log Bags Opened

Only display:

* Feed Brands currently available in Feed Inventory.
* Pellet Sizes currently available for those brands.

If a brand or pellet size has no inventory stock remaining, it should not appear in the dropdown.

---

### Log Feeding

Apply the same filtering.

The Brand and Pellet dropdowns should only display combinations that currently exist in Feed Inventory.

This prevents users from logging feed for inventory that does not exist.

---

## 5. Opened Bags Update Logic

Update the Log Bags Opened behavior.

If the user logs:

* The same Date
* The same Feed Brand
* The same Pellet Size
* The same Fish Stock

more than once,

the system should **update the existing record** instead of creating a duplicate.

This should behave exactly like an edit operation.

The latest saved value should replace the previous value for that day.

It should never accumulate or create duplicate entries for the same Brand + Pellet Size + Fish Stock + Date combination.

---

## 6. Feeding Records & Fish Stock Relationship

Update the Feeding Documentation logic.

Every feeding record should always be tied to:

* Pond
* Fish Stock currently assigned to that pond
* Stocking Date

The Feed Summary by Pellet section inside Pond Details should also remain tied to that specific Fish Stock within the pond.

When a Fish Stock is transferred to another pond:

* The Feed Summary by Pellet data should move with that Fish Stock.
* Max KG per Pellet values should also move with that Fish Stock.
* Feeding history should continue under the same Fish Stock lifecycle.

This ensures all feeding data follows the Fish Stock instead of remaining permanently attached to the original pond.

---

## 7. Default Date Behavior

Across the entire application:

Whenever users create:

* Feed Documentation
* Feed Purchases
* Expenses
* Revenue
* Treatments
* Mortality
* Reports
* Transfers
* Bags Opened
* Remaining Feed
* Fish Stock
* Harvests
* Invoices
* Any other transaction or record

the system should automatically use today's date by default.

Users may change the date manually if necessary.

---

## 8. Nursery Transfer Logic

Update the Nursery Pond transfer behavior.

When transferring fish using a percentage:

The selected percentage should also be applied to the Feed Summary by Pellet.

Example:

Current Feed Today:

50 kg

User transfers:

50%

The system should automatically split the feeding information.

Destination Pond:

25 kg

Source Pond:

25 kg

The same proportional calculation should apply to every pellet size in the Feed Summary by Pellet.

This ensures feeding history remains proportional to the transferred fish.

---

## 9. Production Pond Transfer Logic

Implement the same transfer flexibility for Production Ponds.

Users should be able to transfer either:

* 100% of the Fish Stock
* Any custom percentage

The same transfer rules used in Nursery Ponds should apply to Production Ponds, including:

* Fish Quantity
* Feeding History
* Feed Summary by Pellet
* Max KG per Pellet
* Treatment History
* Fish Stock lifecycle
* Stocking Date

Everything should remain synchronized after the transfer.

---

## 10. Remaining Stock Calculations After Transfer

When only a portion of a Fish Stock is transferred:

The originating pond should retain the remaining proportion of all stock-related data.

Example:

Current day's feeding:

50 kg

Transfer:

50%

Destination Pond:

25 kg

Source Pond:

25 kg

This proportional calculation should also apply to:

* Feed Summary by Pellet
* Max KG tracking
* Remaining Fish Count
* Any stock-specific metrics tied to that pond.

---

## 11. Required Field Validation

Improve validation across all popups and forms.

Whenever a user clicks **Save** or **Submit**:

* All required fields must be validated.
* Missing required fields should be clearly highlighted.
* Appropriate validation messages should be displayed beside the affected fields.
* Prevent submission until all required information has been provided.

Apply this consistently throughout the application, including:

* Feed Documentation
* Feed Purchases
* Log Bags Opened
* Remaining Feed
* Fish Stock
* Pond Creation
* Transfers
* Treatments
* Expenses
* Revenue
* Reports
* Staff
* Staff Assessment
* Invoices
* Subscription
* Any other data-entry popup or form.
