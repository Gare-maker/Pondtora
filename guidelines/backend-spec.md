# Pondtora — Backend Specification

> Complete business logic, data model, validation rules, and API contract for backend implementation.
> Every section maps directly to a frontend feature. Implement each section so that a frontend swap-in of real API calls works without UI changes.

---

## 1. Data Models

### 1.1 Farm
```ts
Farm {
  id:       string   // format: "FARM-{uid}"
  name:     string   // required, max 100 chars
  city:     string
  state:    string
  country:  string   // default "Nigeria"
}
```

### 1.2 Pond
```ts
Pond {
  id:             string             // format: "P001", "P002", etc.
  farmId:         string             // FK → Farm.id
  name:           string             // required, unique per farm
  type:           string             // "Earthen" | "Concrete" | "Tank" | "Tarpaulin" | ...
  category:       "Production"|"Nursery"
  species:        string             // "—" when empty
  sizeM2:         string             // computed from lengthFt × widthFt
  lengthFt:       string?
  widthFt:        string?
  initialStock:   number             // 0 when empty
  currentCount:   number             // updated on mortality, transfer, stock update
  stockingDate:   string             // "—" when empty; "Mon DD, YYYY" display format
  stockMonth:     string             // e.g. "Jun"
  totalCost:      number             // cost of fish stock
  status:         "Active"|"Empty"
  notes:          string
  defaultPellet:  string?            // preferred pellet size
  maxKgByPallet:  Record<string,number>?  // { "4.0 mm": 50, "6.0 mm": 80 }
  supplier:       string?            // supplier name for current stock
  transferNote:   string?            // set when fish transferred in
}
```

### 1.3 StockEvent
```ts
StockEvent {
  id:         string     // "SE-{uid}"
  pondId:     string     // FK → Pond.id
  pondName:   string     // denormalized for reporting
  date:       string     // ISO date or display date
  species:    string
  count:      number
  avgWeight:  number     // legacy; 0 for new records
  cost:       number
  salePrice:  number?    // set on Closed events with sale
  type:       "Initial"|"Transfer"|"Restock"|"Closed"
  fromPond:   string?    // set on Transfer events
  clearedDate:string?    // set on Closed events
  supplier:   string?    // supplier at time of stocking
}
```

### 1.4 FeedingRecord
```ts
FeedingRecord {
  id:          string   // "FR-{uid}"
  date:        string   // display date "Jun 26"
  month:       string   // "Jun"
  year:        number
  pond:        string   // pond name (denormalized)
  brand:       string
  size:        string   // pellet size "4.0 mm"
  morning:     number   // kg
  evening:     number   // kg
  total:       number   // morning + evening
  recordedBy:  string
  morningTime: string?  // "HH:MM"
  eveningTime: string?
}
```

### 1.5 MortalityEntry
```ts
MortalityEntry {
  id:     string   // "MR-{uid}"
  pondId: string
  date:   string
  count:  number
  cause:  string   // "Unknown" | "Disease" | "Oxygen Depletion" | etc.
  notes:  string
}
```

### 1.6 BagOpenLog
```ts
BagOpenLog {
  id:         string   // "BO-{uid}"
  date:       string   // display date "Jun 26"
  month:      string
  year:       number
  brand:      string
  size:       string
  kgPerBag:   number
  bagsOpened: number
  totalKg:    number   // bagsOpened × kgPerBag
  fishStock:  string?  // "Species (StockingDate)"
}
```

### 1.7 FeedRemainingLog
```ts
FeedRemainingLog {
  id:          string
  brand:       string
  size:        string
  fishStock:   string   // "Species (StockingDate)"
  remainingKg: number   // > 0
  date:        string   // display date
}
```

### 1.8 FeedItem (Inventory)
```ts
FeedItem {
  id:           string   // "FI-{uid}"
  brand:        string
  size:         string
  bags:         number
  weightPerBag: number   // kg
  totalKg:      number   // bags × weightPerBag
  costPerBag:   number
  supplier:     string
  purchaseDate: string   // display date "Jun 10"
  month:        string
}
```

### 1.9 Expense
```ts
Expense {
  id:         string   // "EXP-{uid}"
  category:   string   // "Feed" | "Labour" | "Medication" | "Maintenance" | "Utilities" | "Other"
  amount:     number
  date:       string   // ISO
  month:      string
  year:       number
  pond:       string   // pond name
  desc:       string
  fishStock:  string?  // "Species (StockingDate)" — auto-populated from pond's active stock
}
```

### 1.10 Revenue
```ts
Revenue {
  id:          string   // "REV-{uid}"
  source:      string   // "Fish Sales" | "Fingerling Sales" | "Other"
  amount:      number
  date:        string
  month:       string
  year:        number
  notes:       string
  pond:        string?
  stockBatch:  string?
}
```

### 1.11 TreatmentRecord
```ts
TreatmentRecord {
  id:       string   // "TR-{uid}"
  pondId:   string
  farmId:   string
  date:     string
  cause:    string
  medicine: string   // required
  remarks:  string
}
```

### 1.12 StaffMember
```ts
StaffMember {
  id:          string   // "STF-{uid}"
  name:        string
  email:       string
  phone:       string
  role:        string
  status:      "Active"|"Pending"
  joinedDate:  string
  permissions: string[]
  farms:       string[]  // farm IDs this staff member can access
}
```

### 1.13 Subscription
```ts
Subscription {
  userId:        string
  plan:          string   // "Starter"|"Growth"|"Commercial"|"3-Farm Plan"|"5-Farm Plan"|"Unlimited Farms"
  billingCycle:  "monthly"|"yearly"
  status:        "trial"|"active"|"expired"|"cancelled"
  trialStartDate:string?
  trialEndDate:  string?  // trialStartDate + 30 days
  startDate:     string?
  endDate:       string?
  pondLimit:     number   // Infinity for unlimited plans
  farmLimit:     number   // Infinity for unlimited farms plans
}
```

---

## 2. Business Rules

### 2.1 Subscription & Plan Limits

| Plan             | Ponds     | Farms     | Monthly Price |
|------------------|-----------|-----------|---------------|
| Free Trial       | 5         | 1         | ₦0            |
| Starter          | 5         | 1         | ₦3,000        |
| Growth           | 15        | 1         | ₦5,000        |
| Commercial       | Unlimited | 1         | ₦10,000       |
| 3-Farm Plan      | Unlimited | 3         | ₦24,000       |
| 5-Farm Plan      | Unlimited | 5         | ₦40,000       |
| Unlimited Farms  | Unlimited | Unlimited | ₦70,000       |

**Rules:**
- Trial starts on plan selection during signup; expires in 30 days.
- Yearly billing: 20% discount (monthly × 12 × 0.80).
- Adding a pond beyond the limit shows an upgrade modal; no pond is created.
- Adding a farm beyond the limit shows an upgrade modal; no farm is created.
- On plan upgrade/downgrade: limits update immediately.
- On trial expiry: restrict access until a paid plan is selected.
- Commercial and multi-farm plans grant unlimited ponds per farm.

---

### 2.2 Pond Management

**Create Pond:**
- Required: name, type, category (Production|Nursery)
- Auto-compute sizeM2 = lengthFt × widthFt (if provided)
- Initial status: "Empty"; species: "—"; counts: 0
- Auto-generate ID: "P" + zero-padded index (P001, P002, …)

**Add Fish Stock (Activate Pond):**
- Required: species, initialStock > 0, stockingDate
- Optional: supplier
- Sets status → "Active"
- Creates a StockEvent (type: "Initial" for first ever stock, "Restock" for subsequent)
- Sets currentCount = initialStock

**Clear Fish Stock:**
- Sets status → "Empty"
- Resets: species="—", counts=0, stockingDate="—", totalCost=0
- Creates StockEvent (type: "Closed") with clearedDate=TODAY
- **Cascade delete**: removes all FeedingRecords, TreatmentRecords, MortalityEntries for this pond

**Transfer Fish (Production Pond):**
- Allowed only to Empty ponds
- Creates StockEvent (type: "Transfer") on source pond
- Activates destination pond with transferred species/stockingDate (preserves stocking lifecycle)
- Sets transferNote on destination pond

**Nursery Transfer (Partial):**
- Allows partial count transfer (1 to currentCount)
- Transfers N% of feeding history records to destination pond
- Copies all treatment records to destination (for medical continuity)
- Source pond currentCount -= transferred amount

**Update Quantity:**
- Increase or reduce currentCount by a specified amount
- Minimum currentCount: 0

**Edit Fish Information:**
- Can edit: species, currentCount, stockingDate
- Cannot create a StockEvent — this is a correction, not a stock event

**Set Max KG per Pallet:**
- Stores size → maxKg mapping on the pond
- Any pellet size can have a max configured
- Triggers a notification when cumulative feed for that pond+size reaches the max

**Delete Pond:**
- Allowed only when status="Empty"
- Removes: pond record, all associated FeedingRecords, MortalityEntries, TreatmentRecords, StockEvents, Expenses

---

### 2.3 Max KG Notification Logic

**Trigger:** On every new FeedingRecord save, check if cumulative feed for `pond+size` >= `pond.maxKgByPallet[size]`.

**Notification creation:**
- One notification per pond+size combination (keyed as `MX-{pondId}-{pelletSize}`)
- If notification already exists: update `currentFeed` value and mark `read=false` (re-notify)
- If new: create notification with type "maxkg"
- Include: pondName, fishStock label, pellet size, maxKg, currentFeed, timestamp

**Notification fields:**
```ts
AppNotification {
  id:           string
  type:         "feeding"|"bags"|"maxkg"|"reconciliation"
  pondName:     string?
  fishStock:    string?   // "Species (StockingDate)"
  size:         string?
  maxKg:        number?
  currentFeed:  number?
  time:         string?   // "HH:MM AM/PM"
  farmId:       string
  farmName:     string
  date:         string
  read:         boolean
  brand:        string?
  reconDate:    string?
  reconKey:     string?
  mismatchReason:string?
  reconStatus:  string?
}
```

---

### 2.4 Feed Inventory

**Add Purchased Feed:**
- Required: brand, size, bags > 0, costPerBag > 0
- Optional: supplier, purchaseDate, weightPerBag (default 25 kg)
- totalKg = bags × weightPerBag
- purchaseDate stored as display string "Mon DD"

**Edit Purchase:**
- All fields editable; recalculate totalKg = bags × weightPerBag

**Clear Stock:**
- Soft-removes entry from active inventory (set a `cleared=true` flag)
- Keeps record in Purchase History
- Does NOT delete the record

**Inventory Display:**
- "Bags in Stock" = purchased bags - bags opened (from BagOpenLog)
- "Total Kg" = Bags in Stock × weightPerBag
- If Bags in Stock <= 0, show as 0 (never negative)

---

### 2.5 Feeding Documentation

**Log Feeding Session (Bulk):**
- One record per pond per session
- Required: pond name, at least one of morning/evening > 0
- total = morning + evening
- date stored as display "Mon DD"
- morningTime/eveningTime: HH:MM (24h)

**Edit Feeding Record:**
- All fields editable
- Recalculate total = morning + evening
- Also allows editing the Remaining Feed log associated with this record

**Log Opened Bags:**
- Required: brand, size, bagsOpened > 0, fishStock
- totalKg = bagsOpened × kgPerBag
- fishStock auto-populated from the pond's active stock when logging from a pond context
- Multiple entries per date allowed (different brand/size/fishStock combos)

**Log Remaining Feed:**
- Required: brand, size, fishStock, remainingKg > 0
- Associates remaining feed quantity with a specific fish stock

**Feed Reconciliation:**
- Compares daily opened bag totals vs. feeding records
- Identifies discrepancies ("Bags opened but no feed logged" and "Feed logged but no bags opened")
- Creates reconciliation notification when mismatch detected
- reconKey format: "RECON-{date}-{pondName}"

---

### 2.6 Mortality

**Add Mortality Entry:**
- Required: count > 0 (implicit; validated at save)
- Sets pondId, date, cause, notes
- Pond's currentCount does NOT auto-decrement (managed via "Update Quantity")
- Mortality rate = (totalDead / initialStock) × 100

---

### 2.7 Treatments

**Add Treatment:**
- Required: medicine (the medication name)
- Optional: cause, remarks, date (defaults to today)
- Belongs to one pond; copied to destination during nursery transfer

---

### 2.8 Expenses

**Add Pond Cost:**
- Required: amount > 0, category
- Optional: description, date (defaults to today)
- Pond is auto-determined from context (the pond detail page)
- fishStock auto-populated from pond's active species + stockingDate
- month and year derived from date

---

### 2.9 Revenues

**Add Revenue:**
- Required: source, amount > 0
- Optional: pond, notes
- month and year derived from date

---

### 2.10 Fish Stock History

**Grouping Rule:**
- Group all StockEvents, FeedingRecords, MortalityEntries, TreatmentRecords by **stockingDate** (the date field from the initial/restock StockEvent).
- All ponds sharing the same species + stockingDate belong to the same "Fish Stock lifecycle."
- Transfers DO NOT create new lifecycles; they inherit the original stockingDate.

**Aggregate Section (Section 1):**
- Stocking Date
- Fish Stock(s): all distinct species in the group
- Supplier(s): all distinct suppliers
- Initial Total Fish: sum of Initial/Restock StockEvent counts across all ponds
- Current Total Fish: sum of `currentCount` for all Active ponds in the group
- Total Mortality: sum of all MortalityEntry counts for ponds in the group
- Mortality Rate: (totalDead / initialTotalFish) × 100
- Total Feed: sum of all FeedingRecord totals for ponds in the group
- Feed by Pellet: grouped sum of `FeedingRecord.total` by `FeedingRecord.size`
- Max KG per Pellet: sum of each pond's maxKgByPallet for that pellet size

**Individual Pond Section (Section 2):**
- Per-pond stats: currentCount, totalFeed, mortality, mortality rate
- Feed by pellet size with progress bars vs. pond maxKgByPallet
- Treatment history (for that pond only)
- Status: Active | Cleared | Sold
- Date Cleared/Sold: from Closed StockEvent

---

### 2.11 Feed Requirement Calculator

**Calculation (planning tool only — no inventory modification):**
- Input: numberOfFish, optional pricePerBag per pellet size
- For each pellet size in standards:
  - bagsRequired = (numberOfFish / 1000) × bagsPerK
  - totalKg = bagsRequired × kgPerBag
  - estimatedCost = (pricePerBag > 0) ? bagsRequired × pricePerBag : null

**Default Standards:**
| Size         | Bags/1,000 Fish | KG/Bag |
|--------------|-----------------|--------|
| Under 2.0 mm | 5               | 15     |
| 2.0 mm       | 3               | 15     |
| 3.0 mm       | 8               | 15     |
| 4.0 mm       | 16              | 15     |
| 6.0 mm       | 24              | 15     |
| 9.0 mm       | 14              | 15     |

**User Customization:**
- Users can override bagsPerK and kgPerBag per size
- Custom values persist until "Reset to Default"
- Custom values stored per user (not per farm)

**Export:**
- CSV: `downloadCSV(filename, headers, rows)` — triggers file download
- PDF: Opens print window with custom HTML layout

---

### 2.12 Financial Dashboard

**Monthly Aggregation:**
- Revenue: sum of `Revenue.amount` by month/year
- Expenses: sum of `Expense.amount` by month/year broken into categories
- Profit/Loss: revenue - expenses
- Feed Cost: sum of Expenses where category="Feed"
- Stock Cost: sum of Expenses where category="Feed" AND pond is not empty (or derive from FeedItem purchases)

**Key Metrics:**
- Total Revenue YTD
- Total Expenses YTD
- Net Profit YTD
- Monthly trend chart (last 6 months)
- Expense breakdown by category (pie chart)

---

### 2.13 Invoices

**Invoice lifecycle:** Draft → Sent → Pending → Partially Paid → Paid | Overdue | Cancelled

**Invoice fields:**
- Linked to: Customer, Pond, Species
- Line items: priceGroup × qty (kg) - discount
- Tax rate (default from InvSettings)
- Discount: invoice-level or per-item
- Additional charges
- Payment method, amount paid, outstanding balance
- Outstanding = grandTotal - amountPaid
- Status auto-updates based on amountPaid vs. grandTotal

---

### 2.14 Staff

**Permissions model:**
- Staff members belong to one or more farms
- Permissions are a string array from STAFF_PERMISSIONS list
- Status: "Active" (can log in) | "Pending" (invite sent, not accepted)

---

## 3. API Endpoints

### Auth
```
POST /auth/login     → { token, user }
POST /auth/signup    → { token, user }
POST /auth/logout
GET  /auth/me        → UserProfile
PUT  /auth/profile   → UserProfile
```

### Subscription
```
GET  /subscription            → Subscription
POST /subscription/select     body: { plan, billingCycle }
POST /subscription/cancel
GET  /subscription/plans      → Plan[]
```

### Farms
```
GET    /farms                 → Farm[]
POST   /farms                 body: Farm  (validates farmLimit)
PUT    /farms/:id             body: Partial<Farm>
DELETE /farms/:id
```

### Ponds
```
GET    /ponds?farmId=         → Pond[]
POST   /ponds                 body: Pond  (validates pondLimit)
PUT    /ponds/:id             body: Partial<Pond>
DELETE /ponds/:id             (only if status=Empty)
POST   /ponds/:id/activate    body: { species, initialStock, stockingDate, supplier }
POST   /ponds/:id/clear       body: { salePrice? }
POST   /ponds/:id/transfer    body: { toPondId, date }
POST   /ponds/:id/transfer-nursery body: { toPondId, count, pct, date }
POST   /ponds/:id/update-qty  body: { mode: "increase"|"reduce", amount }
PUT    /ponds/:id/max-kg      body: { size, maxKg }
```

### Stock Events
```
GET  /stock-events?farmId=    → StockEvent[]
```

### Feeding Records
```
GET    /feeding?farmId=&date=  → FeedingRecord[]
POST   /feeding                body: FeedingRecord
PUT    /feeding/:id            body: Partial<FeedingRecord>
DELETE /feeding/:id
```

### Mortality
```
GET    /mortality?farmId=     → MortalityEntry[]
POST   /mortality             body: MortalityEntry
PUT    /mortality/:id         body: Partial<MortalityEntry>
DELETE /mortality/:id
```

### Treatments
```
GET    /treatments?farmId=    → TreatmentRecord[]
POST   /treatments            body: TreatmentRecord
DELETE /treatments/:id
```

### Feed Inventory
```
GET    /inventory?farmId=     → FeedItem[]
POST   /inventory             body: FeedItem
PUT    /inventory/:id         body: Partial<FeedItem>
DELETE /inventory/:id
POST   /inventory/:id/clear   → marks cleared=true
```

### Bag Logs
```
GET    /bag-logs?farmId=      → BagOpenLog[]
POST   /bag-logs              body: BagOpenLog
PUT    /bag-logs/:id          body: Partial<BagOpenLog>
DELETE /bag-logs/:id
```

### Remaining Feed Logs
```
GET    /remain-logs?farmId=   → FeedRemainingLog[]
POST   /remain-logs           body: FeedRemainingLog
PUT    /remain-logs/:id       body: Partial<FeedRemainingLog>
```

### Expenses
```
GET    /expenses?farmId=      → Expense[]
POST   /expenses              body: Expense
PUT    /expenses/:id          body: Partial<Expense>
DELETE /expenses/:id
```

### Revenues
```
GET    /revenues?farmId=      → Revenue[]
POST   /revenues              body: Revenue
PUT    /revenues/:id          body: Partial<Revenue>
DELETE /revenues/:id
```

### Notifications
```
GET    /notifications?farmId= → AppNotification[]
PUT    /notifications/:id/read
POST   /notifications/mark-all-read
```

### Staff
```
GET    /staff?farmId=         → StaffMember[]
POST   /staff                 body: StaffMember
PUT    /staff/:id             body: Partial<StaffMember>
DELETE /staff/:id
POST   /staff/:id/invite      → resend invitation email
```

### Reports
```
GET    /reports?farmId=       → Report[]
POST   /reports               body: Report
PUT    /reports/:id           body: Partial<Report>
DELETE /reports/:id
```

### Customers
```
GET    /customers             → Customer[]
POST   /customers             body: Customer
PUT    /customers/:id
DELETE /customers/:id
```

### Invoices
```
GET    /invoices?farmId=      → Invoice[]
POST   /invoices              body: Invoice
PUT    /invoices/:id          body: Partial<Invoice>
DELETE /invoices/:id
POST   /invoices/:id/send     → updates status to "Sent"
```

### Price Groups
```
GET    /price-groups?farmId=  → PriceGroup[]
POST   /price-groups          body: PriceGroup
PUT    /price-groups/:id
DELETE /price-groups/:id
```

---

## 4. Validation Rules

### Global
- All `amount` / `count` / `kg` fields: must be a positive number (> 0)
- Date fields: valid ISO date or display date (validated server-side)
- String fields: trimmed, max lengths enforced

### Pond
- name: required, unique per farm
- type: must be one of POND_TYPES
- category: "Production" | "Nursery"

### Add Fish Stock
- species: required
- initialStock: required, integer > 0
- stockingDate: required (ISO date)
- Cannot re-activate an already Active pond without clearing first

### Feeding Record
- pond: must be Active
- at least one of morning, evening must be > 0
- size: must be a valid FEED_SIZES value
- brand: must be a valid FEED_BRANDS value

### Expense
- amount: required, > 0
- category: must be one of EXPENSE_CATS

### Log Remaining Feed
- brand: required
- size: required
- fishStock: required (non-empty string)
- remainingKg: required, > 0

### Log Opened Bags
- brand: required
- size: required
- bagsOpened: required, > 0

### Mortality
- count: required, integer > 0

### Treatment
- medicine: required

### Invoice
- customer: required (selected from Customer list)
- items: at least one line item with qty > 0
- amountPaid: 0 ≤ amountPaid ≤ grandTotal

---

## 5. Automation Rules

| Trigger | Action |
|---------|--------|
| FeedingRecord saved | Check pond+size cumulative vs. maxKgByPallet; create/update maxkg notification |
| Pond cleared | Cascade delete all feeding, treatment, mortality records |
| Nursery transfer | Copy N% feeding records + all treatment records to destination pond |
| BagOpenLog saved | Check for same-date reconciliation mismatch; create recon notification |
| Subscription trial expires | Restrict feature access; prompt upgrade |
| Plan upgraded | Immediately update pondLimit and farmLimit |

---

## 6. Aggregation Logic

### Fish Stock Lifecycle Grouping
1. Collect all StockEvents of type "Initial" or "Restock"
2. Group by `stockingDate`
3. For each group, collect all ponds referenced in those events
4. Pull all FeedingRecords, MortalityEntries, TreatmentRecords for those ponds
5. Aggregate counts as described in section 2.10

### Feed Reconciliation
- For a given date:
  1. Sum BagOpenLog.totalKg by (brand, size)
  2. Sum FeedingRecord.total by (brand, size)
  3. If bagTotal ≠ feedTotal for same brand+size, flag as mismatch

### Monthly Financial Aggregation
- Group Expense and Revenue records by `month` and `year`
- Sum amounts per category

---

## 7. Error States

| Error | HTTP Status | Frontend behavior |
|-------|-------------|-------------------|
| Pond limit exceeded | 403 | Show upgrade modal |
| Farm limit exceeded | 403 | Show upgrade modal |
| Validation error | 422 | Show red error banner in form |
| Not found | 404 | Show empty state |
| Unauthorized | 401 | Redirect to login |
| Server error | 500 | Toast: "Something went wrong" |

---

## 8. Data Relationships

```
Farm
├── Pond[]
│   ├── StockEvent[]    (pondId)
│   ├── FeedingRecord[] (pond name)
│   ├── MortalityEntry[](pondId)
│   ├── TreatmentRecord[](pondId, farmId)
│   └── Expense[]       (pond name)
├── FeedItem[]
├── BagOpenLog[]
├── FeedRemainingLog[]
├── Revenue[]
├── Report[]
├── StaffMember[]
└── Invoice[]

User
├── Subscription
└── Farm[] (owned or accessible)
```

---

## 9. Notes for Backend Engineers

1. **FishStock label** throughout the app is computed as: `` `${pond.species} (${pond.stockingDate})` ``
2. **Display dates** are stored as strings like "Jun 26" — the backend should accept and return ISO dates and the frontend formats for display.
3. **Clearing a pond** is a hard cascade in the current frontend; the backend should soft-delete or archive records with a `clearedAt` timestamp for audit purposes.
4. **Notifications** are currently client-side only; move to a server-side notification table with websocket push or polling.
5. **Staff permissions** are stored as string arrays; the backend should enforce them on all protected endpoints.
6. **Calculator** is a pure client-side planning tool — no backend endpoint needed for calculation itself, only for persisting custom standards per user.
