# Additional System Updates



## 1. Feed Pellet List



Update every pellet size dropdown across the application to use a single standardized list.



Apply this to:



* Add Feed Purchase

* Feed Inventory

* Daily Feed Logging

* Bags Opened

* Remaining Feed

* Feed Requirement Calculator

* Feed Summary by Pellet

* Any other feature that requires pellet selection



The available pellet sizes should always be:



* Under 2.0 mm

* 2.0 mm

* 3.0 mm

* 4.0 mm

* 6.0 mm

* 9.0 mm



Every page should reference this same master list to ensure consistency across the system.



---



## 2. Fish Stock Transfer



When transferring a Fish Stock from one pond to another, transfer all stock-related feeding information along with the Fish Stock.



This includes:



* Total Feed

* Feed Summary by Pellet

* Pellet-by-Pellet totals

* Max KG per Pellet

* Daily feeding history (where applicable)

* Stocking Date

* Treatment History

* Fish Stock lifecycle



If only a percentage of the Fish Stock is transferred, the feeding data should also be transferred proportionally.



Example:



Current Total Feed:

100 kg



Transfer:

40%



Destination Pond:



* Total Feed = 40 kg

* Feed Summary by Pellet = 40% of each pellet total



Source Pond:



* Total Feed = 60 kg

* Feed Summary by Pellet = Remaining 60%



This keeps feeding records synchronized with the Fish Stock after every transfer.



---



## 3. Prevent Duplicate Ponds



Update Pond Creation validation.



The system must not allow duplicate ponds.



Validation should check both:



* Pond Name

* Pond Number/Identifier



If either already exists within the same farm:



* Prevent creation.

* Display a clear validation message indicating that the pond already exists.



Each pond should have a unique identity within its farm.



---



## 4. Remove Average Weight



Completely remove **Average Weight** from the application.



It should no longer appear in:



* Add Fish Stock popup

* Pond Details

* Fish Stock History

* Fish Stock Details

* Reports

* Statistics

* Tables

* Forms

* Calculations

* Exports (PDF/CSV)

* Backend schema (where no longer required)

* Any other UI or business logic



The system should no longer reference or depend on Average Weight anywhere.



---



## 5. Daily Feed Inventory Validation



Update the Daily Feed logging popup.



The **Feed Brand** and **Pellet Size** dropdowns must read directly from the Feed Inventory.



Display only:



* Brands that currently exist in inventory.

* Pellet sizes that currently have available stock for the selected brand.



Do not display generic or predefined pellet lists that are unavailable in inventory.



This prevents users from recording feeding using feed that is not currently in stock.



---



## 6. Default Farm Creation



When a new user creates an account:



* Automatically create a default farm.

* The user should not need to create their first farm manually.



Immediately after account creation:



* The default farm should appear in the Farm Switcher dropdown.

* It should become the currently selected farm.

* The farm should be available anywhere a farm selection is required.



This includes:



* Navigation bar farm selector

* Create Farm dropdowns

* Farm selection dialogs

* Farm assignment screens

* Any feature requiring a farm context



All newly created records should automatically belong to this default farm until the user switches to another farm or creates additional farms.



This ensures every new account has a valid working farm immediately after registration and prevents empty-state issues throughout the application. # Additional System Updates



## 1. Feed Pellet List



Update every pellet size dropdown across the application to use a single standardized list.



Apply this to:



* Add Feed Purchase

* Feed Inventory

* Daily Feed Logging

* Bags Opened

* Remaining Feed

* Feed Requirement Calculator

* Feed Summary by Pellet

* Any other feature that requires pellet selection



The available pellet sizes should always be:



* Under 2.0 mm

* 2.0 mm

* 3.0 mm

* 4.0 mm

* 6.0 mm

* 9.0 mm



Every page should reference this same master list to ensure consistency across the system.



---



## 2. Fish Stock Transfer



When transferring a Fish Stock from one pond to another, transfer all stock-related feeding information along with the Fish Stock.



This includes:



* Total Feed

* Feed Summary by Pellet

* Pellet-by-Pellet totals

* Max KG per Pellet

* Daily feeding history (where applicable)

* Stocking Date

* Treatment History

* Fish Stock lifecycle



If only a percentage of the Fish Stock is transferred, the feeding data should also be transferred proportionally.



Example:



Current Total Feed:

100 kg



Transfer:

40%



Destination Pond:



* Total Feed = 40 kg

* Feed Summary by Pellet = 40% of each pellet total



Source Pond:



* Total Feed = 60 kg

* Feed Summary by Pellet = Remaining 60%



This keeps feeding records synchronized with the Fish Stock after every transfer.



---



## 3. Prevent Duplicate Ponds



Update Pond Creation validation.



The system must not allow duplicate ponds.



Validation should check both:



* Pond Name

* Pond Number/Identifier



If either already exists within the same farm:



* Prevent creation.

* Display a clear validation message indicating that the pond already exists.



Each pond should have a unique identity within its farm.



---



## 4. Remove Average Weight



Completely remove **Average Weight** from the application.



It should no longer appear in:



* Add Fish Stock popup

* Pond Details

* Fish Stock History

* Fish Stock Details

* Reports

* Statistics

* Tables

* Forms

* Calculations

* Exports (PDF/CSV)

* Backend schema (where no longer required)

* Any other UI or business logic



The system should no longer reference or depend on Average Weight anywhere.



---



## 5. Daily Feed Inventory Validation



Update the Daily Feed logging popup.



The **Feed Brand** and **Pellet Size** dropdowns must read directly from the Feed Inventory.



Display only:



* Brands that currently exist in inventory.

* Pellet sizes that currently have available stock for the selected brand.



Do not display generic or predefined pellet lists that are unavailable in inventory.



This prevents users from recording feeding using feed that is not currently in stock.



---



## 6. Default Farm Creation



When a new user creates an account:



* Automatically create a default farm.

* The user should not need to create their first farm manually.



Immediately after account creation:



* The default farm should appear in the Farm Switcher dropdown.

* It should become the currently selected farm.

* The farm should be available anywhere a farm selection is required.



This includes:



* Navigation bar farm selector

* Create Farm dropdowns

* Farm selection dialogs

* Farm assignment screens

* Any feature requiring a farm context



All newly created records should automatically belong to this default farm until the user switches to another farm or creates additional farms.



This ensures every new account has a valid working farm immediately after registration and prevents empty-state issues throughout the application.

 