# System-Wide Functional Review & Validation Checklist

Before considering the application ready for backend integration, perform a complete functional audit of the entire system. Verify that every relationship, dependency, permission, calculation, workflow, and business rule behaves exactly as specified in the product requirements.

## 1. Pond, Fish Stock & Feeding Relationships

Review the complete relationship between Ponds, Fish Stocks, and Feeding Documentation.

### Pond & Fish Stock

Verify that:

* A Pond and a Fish Stock are separate entities.
* Creating a Pond does not create a Fish Stock.
* A Fish Stock is created independently and then assigned to one or more ponds.
* A single Fish Stock can exist in multiple ponds.
* Every Fish Stock is permanently identified by its **Stocking Date**.
* The system groups Fish Stock data using:

  * Fish Stock
  * Stocking Date
* The system does not group records using record creation date or log date.
* All stock-related information is correctly aggregated across every pond sharing the same Fish Stock and Stocking Date.

---

### Feeding Documentation

Verify that:

* Feed is always logged against a **Pond**.
* After selecting a Pond, the system automatically identifies the Fish Stock currently assigned to that Pond.
* The correct Fish Stock is used automatically for all feeding calculations.
* Feeding records correctly contribute to the aggregated Fish Stock History.
* Feed Summary by Pellet updates correctly.
* Fish Stock History updates correctly.
* Pond Details update correctly.
* Individual Pond summaries remain independent while aggregated stock summaries combine data across ponds.

---

## 2. Opened Bags & Remaining Feed

Review the complete Opened Bags and Remaining Feed workflow.

### Opened Bags

Verify that Opened Bags are recorded using:

* Feed Brand
* Pellet Size
* Fish Stock
* Number of Bags Opened

Ensure that:

* The system automatically retrieves the kg per bag from Feed Inventory.
* Users never manually enter kg per bag.
* Inventory deductions occur automatically using:

  * Feed Brand
  * Pellet Size
* Opened Bags are associated with the selected Fish Stock and not a Pond.

---

### Remaining Feed

Verify that Remaining Feed is recorded using:

* Feed Brand
* Pellet Size
* Fish Stock
* Remaining Feed (kg)

Ensure that:

* Remaining Feed is tied to the Fish Stock only.
* Remaining Feed is never stored against a Pond.
* Remaining Feed integrates correctly with the reconciliation process.
* Editing Remaining Feed updates reconciliation immediately.

---

## 3. Feed Reconciliation

Review the complete reconciliation workflow.

Verify that reconciliation:

* Uses Fish Stock as the reference.
* Uses yesterday's Remaining Feed correctly.
* Calculates feed required using the documented business logic.
* Calculates expected bags opened correctly.
* Compares expected and recorded bags opened.
* Calculates expected remaining feed.
* Detects mismatches accurately.
* Updates reconciliation statuses automatically.
* Removes resolved mismatches automatically.
* Updates Notifications after a mismatch is resolved.
* Displays the full calculation breakdown in the mismatch details popup.
* Highlights exactly where the discrepancy occurred.

---

## 4. Staff Roles & Permissions

Review the complete Role & Permission system.

Verify that:

* Staff Roles function correctly.
* Every permission controls access properly.
* Hidden pages remain inaccessible.
* Users cannot access restricted screens through direct navigation.
* Navigation only displays pages permitted for that role.
* Action buttons respect assigned permissions.
* View, Create, Edit, Delete, Export, and other permissions are enforced consistently.

Ensure the **Staff Assessment** permission works correctly.

---

## 5. Farm Assignment

Review the Farm Assignment functionality.

Verify that:

* Managers can be assigned to one or more farms.
* Staff only access farms assigned to them.
* Data from unassigned farms is never visible.
* Reports, feeding, inventory, ponds, invoices, staff, and all related modules are filtered according to assigned farms.
* Farm switching respects assigned permissions.

---

## 6. Subscription Enforcement

Review the subscription system thoroughly.

Verify that:

* Every subscription plan enforces its feature limits correctly.
* Locked features remain inaccessible.
* Upgrade prompts appear where required.
* Trial accounts behave correctly.
* Plan upgrades and downgrades immediately update permissions.
* Subscription expiry correctly removes access to restricted features.
* Multi-farm limits work correctly.
* Pond limits work correctly.
* Staff limits work correctly.
* Every subscription restriction defined in the PRD is enforced throughout the application.

---

## 7. Staff Reporting

Review the complete reporting workflow.

Verify that staff members with the appropriate permissions can:

* View reports.
* Create reports.
* Edit reports (within the permitted edit window).
* Submit reports.
* View their own submitted reports.
* Managers and administrators can review submitted reports.
* Report status updates correctly.
* Outstanding reports display correctly.
* Notification logic for reports functions correctly.

---

## 8. Final System Validation

Perform a complete end-to-end review of the application.

Confirm that:

* Every feature works according to the documented business logic.
* All calculations are accurate.
* Every relationship between modules is correctly maintained.
* Conditional visibility behaves correctly.
* Permissions are enforced consistently.
* Navigation behaves correctly.
* Backend data relationships are valid.
* No workflows are broken after the latest updates.
* The application is internally consistent and fully ready for backend implementation.
