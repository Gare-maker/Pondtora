# Additional System Updates



## 1. Automatic Pond Clearing After Full Transfer



Update the pond transfer logic.



When a user transfers **100% of a Fish Stock** from any pond (Production or Nursery):



* The source pond should automatically be marked as empty.

* The fish count should become **0**.

* The pond should return to an available/empty state.

* Any pond-specific summaries should update immediately.

* The transferred Fish Stock should continue using its original **Stocking Date** and lifecycle in the destination pond.



Partial transfers should continue to leave the remaining fish in the source pond.



---



## 2. Default Farm Creation & Farm Isolation



When a user creates a new account:



* Automatically create one default farm.

* This farm should immediately appear in the Farm Switcher dropdown.

* The user should be able to begin using the application without first creating a farm manually.



When additional farms are created:



* Every record must belong to a specific farm.

* Switching between farms should completely isolate data.



If **Farm A** is selected:



Display only Farm A data, including:



* Ponds

* Fish Stocks

* Feed Documentation

* Feed Inventory

* Feed Purchases

* Feed Reconciliation

* Expenses

* Revenue

* Financial Dashboard

* Reports

* Invoices

* Staff Assignments

* Notifications

* Fish Stock History

* Treatments

* Mortality

* Harvests

* Subscription usage

* Every other farm-related record



No data from Farm B should appear.



Likewise, when Farm B is selected, only Farm B data should be displayed.



This behavior must be consistent across the entire application, including the Financial Dashboard.



---



## 3. Notification System



Implement the complete notification system.



Notifications should be fully functional and generated automatically for relevant events, including:



* Feed Reconciliation issues

* Max KG per Pellet reached

* Reports submitted

* Reports approved/rejected

* Invoice status updates

* Pond transfers

* Harvest completion

* Subscription events

* Staff Assessment submissions

* Feed inventory alerts

* Any other important system event



Notifications should:



* Open the appropriate page when clicked.

* Mark as read correctly.

* Remove automatically when the associated issue has been resolved (where applicable).

* Stay synchronized with the underlying data.



---



## 4. Feed Reconciliation



Review and fix the reconciliation engine.



The reconciliation process for:



* Feed Quantity

* Bags Opened

* Remaining Feed



is currently not working correctly.



Implement the complete reconciliation logic according to the documented business rules.



The system should correctly:



* Detect mismatches.

* Calculate expected values.

* Compare recorded values.

* Generate reconciliation statuses.

* Display detailed calculation steps.

* Create reconciliation notifications.

* Remove reconciliation alerts once the issue has been resolved.



---



## 5. Purchased Feed History



Redesign the Purchased Feed History.



Each feed purchase should be stored as an independent purchase record.



Example:



Omega Top

4.0 mm

Purchased on 1 July



Omega Top

4.0 mm

Purchased on 15 July



These should appear as separate purchase records in the Purchase History table.



However, the Feed Inventory stock should continue accumulating quantities from all purchases.



In summary:



Purchase History = Individual purchase records.



Feed Inventory = Running accumulated stock.



---



## 6. Staff Assessment Backend Integration



Remove all placeholder and dummy data from the Staff Assessment module.



Connect the entire Staff Assessment feature to Supabase.



Everything should use live backend data, including:



* Assessment Questions

* Categories

* Candidate Registration

* Assessment Submission

* Assessment Results

* Knowledge Test

* Compatibility Test

* Result Tables

* View Details

* Copy Link

* Question Management

* Question Editing

* Question Deletion

* Question Ordering

* Category Assignment



No dummy content should remain.



---



## 7. Public Assessment Links



The public assessment links are still not functioning correctly.



Completely fix the assessment routing.



Requirements:



* The copied assessment link should open successfully in any browser.

* External users should be able to access the assessment without logging in.

* The public assessment pages should load correctly.

* The full assessment flow should work end-to-end.

* Assessment responses should save successfully.

* Submitted results should immediately appear in the Staff Assessment page.



The assessment link should be production-ready.



---



## 8. Copy Link Functionality



Inside the **Copy Assessment Link** popup:



When the user clicks **Copy**:



* The assessment URL should actually be copied to the clipboard.

* Display a confirmation that the link has been copied successfully.

* The copied URL should be immediately usable in any browser.



---



## 9. Calendar Default Date



Across the entire application:



Whenever a calendar or date picker is opened:



* The default selected date should be today's date.

* Users should still be able to select any other date afterward.



Apply this consistently to every calendar component throughout the application.



---



## 10. Price Groups



Update the Invoice module.



Price Groups should not contain any default values.



A newly created farm should initially have:



* No Price Groups.



Users must create their own Price Groups before they become available for invoice creation.



Once created:



* Price Groups should belong to the selected farm.

* Price Groups should not be shared across farms.



---



## 11. Invoice Farm Isolation



Invoices must also respect the currently selected farm.



Each farm should maintain its own:



* Customers

* Price Groups

* Invoice Settings

* Invoice History

* Invoice Statistics

* Revenue Records



Switching farms should immediately load the invoices and related data belonging only to the selected farm.



No invoice data should be shared between farms.



---  # Additional System Updates



## 1. Automatic Pond Clearing After Full Transfer



Update the pond transfer logic.



When a user transfers **100% of a Fish Stock** from any pond (Production or Nursery):



* The source pond should automatically be marked as empty.

* The fish count should become **0**.

* The pond should return to an available/empty state.

* Any pond-specific summaries should update immediately.

* The transferred Fish Stock should continue using its original **Stocking Date** and lifecycle in the destination pond.



Partial transfers should continue to leave the remaining fish in the source pond.



---



## 2. Default Farm Creation & Farm Isolation



When a user creates a new account:



* Automatically create one default farm.

* This farm should immediately appear in the Farm Switcher dropdown.

* The user should be able to begin using the application without first creating a farm manually.



When additional farms are created:



* Every record must belong to a specific farm.

* Switching between farms should completely isolate data.



If **Farm A** is selected:



Display only Farm A data, including:



* Ponds

* Fish Stocks

* Feed Documentation

* Feed Inventory

* Feed Purchases

* Feed Reconciliation

* Expenses

* Revenue

* Financial Dashboard

* Reports

* Invoices

* Staff Assignments

* Notifications

* Fish Stock History

* Treatments

* Mortality

* Harvests

* Subscription usage

* Every other farm-related record



No data from Farm B should appear.



Likewise, when Farm B is selected, only Farm B data should be displayed.



This behavior must be consistent across the entire application, including the Financial Dashboard.



---



## 3. Notification System



Implement the complete notification system.



Notifications should be fully functional and generated automatically for relevant events, including:



* Feed Reconciliation issues

* Max KG per Pellet reached

* Reports submitted

* Reports approved/rejected

* Invoice status updates

* Pond transfers

* Harvest completion

* Subscription events

* Staff Assessment submissions

* Feed inventory alerts

* Any other important system event



Notifications should:



* Open the appropriate page when clicked.

* Mark as read correctly.

* Remove automatically when the associated issue has been resolved (where applicable).

* Stay synchronized with the underlying data.



---



## 4. Feed Reconciliation



Review and fix the reconciliation engine.



The reconciliation process for:



* Feed Quantity

* Bags Opened

* Remaining Feed



is currently not working correctly.



Implement the complete reconciliation logic according to the documented business rules.



The system should correctly:



* Detect mismatches.

* Calculate expected values.

* Compare recorded values.

* Generate reconciliation statuses.

* Display detailed calculation steps.

* Create reconciliation notifications.

* Remove reconciliation alerts once the issue has been resolved.



---



## 5. Purchased Feed History



Redesign the Purchased Feed History.



Each feed purchase should be stored as an independent purchase record.



Example:



Omega Top

4.0 mm

Purchased on 1 July



Omega Top

4.0 mm

Purchased on 15 July



These should appear as separate purchase records in the Purchase History table.



However, the Feed Inventory stock should continue accumulating quantities from all purchases.



In summary:



Purchase History = Individual purchase records.



Feed Inventory = Running accumulated stock.



---



## 6. Staff Assessment Backend Integration



Remove all placeholder and dummy data from the Staff Assessment module.



Connect the entire Staff Assessment feature to Supabase.



Everything should use live backend data, including:



* Assessment Questions

* Categories

* Candidate Registration

* Assessment Submission

* Assessment Results

* Knowledge Test

* Compatibility Test

* Result Tables

* View Details

* Copy Link

* Question Management

* Question Editing

* Question Deletion

* Question Ordering

* Category Assignment



No dummy content should remain.



---



## 7. Public Assessment Links



The public assessment links are still not functioning correctly.



Completely fix the assessment routing.



Requirements:



* The copied assessment link should open successfully in any browser.

* External users should be able to access the assessment without logging in.

* The public assessment pages should load correctly.

* The full assessment flow should work end-to-end.

* Assessment responses should save successfully.

* Submitted results should immediately appear in the Staff Assessment page.



The assessment link should be production-ready.



---



## 8. Copy Link Functionality



Inside the **Copy Assessment Link** popup:



When the user clicks **Copy**:



* The assessment URL should actually be copied to the clipboard.

* Display a confirmation that the link has been copied successfully.

* The copied URL should be immediately usable in any browser.



---



## 9. Calendar Default Date



Across the entire application:



Whenever a calendar or date picker is opened:



* The default selected date should be today's date.

* Users should still be able to select any other date afterward.



Apply this consistently to every calendar component throughout the application.



---



## 10. Price Groups



Update the Invoice module.



Price Groups should not contain any default values.



A newly created farm should initially have:



* No Price Groups.



Users must create their own Price Groups before they become available for invoice creation.



Once created:



* Price Groups should belong to the selected farm.

* Price Groups should not be shared across farms.



---



## 11. Invoice Farm Isolation



Invoices must also respect the currently selected farm.



Each farm should maintain its own:



* Customers

* Price Groups

* Invoice Settings

* Invoice History

* Invoice Statistics

* Revenue Records



Switching farms should immediately load the invoices and related data belonging only to the selected farm.



No invoice data should be shared between farms.



---



## 12. Backend Readiness Verification



Before considering the application backend-ready, perform a complete validation to ensure:



* Every button works.

* Every popup works.

* Every form submits correctly.

* CRUD operations are fully functional.

* Business rules are enforced.

* Permissions are respected.

* Farm isolation is enforced.

* Subscription restrictions work correctly.

* Notifications function correctly.

* Staff Assessment uses live backend data.

* Public assessment links function correctly.

* Copy-to-clipboard works correctly.

* Feed Reconciliation calculations are accurate.

* Feed Inventory calculations are accurate.

* Fish Stock aggregation behaves according to the Stocking Date lifecycle.

* Financial Dashboard values update correctly for the selected farm.

* All frontend functionality is fully synchronized with Supabase and ready for production use.

 



