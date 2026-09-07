# Audit Report: Pond, Fish Stock, and Feed Reconciliation Implementation

## Executive Summary
This audit reviews the implementation of Pond vs Fish Stock separation, Fish Stock identification, feed documentation, and reconciliation logic against a 21-point checklist.

---

## Checklist Results

### POND & FISH STOCK STRUCTURE

**1. Is a Pond separate from a Fish Stock? Can you create a Pond without a Fish Stock?**
✅ **In place**
- Pond type: `{ id, name, type, species, status: "Active"|"Empty", currentCount, stockingDate, ... }`
- Fish Stock: Derived from Pond.species + Pond.stockingDate format `"${species} (${stockingDate})"`
- Pond can have status="Empty" (no Fish Stock) or status="Active" (with Fish Stock)
- PondManagementPage.tsx line 112-120: Shows "No fish stock in this pond" for empty ponds
- handleAddPond (line 514): Creates pond with species="—", status="Empty" before stocking

**2. Can a single Fish Stock exist in multiple ponds?**
✅ **In place**
- Fish Stock is identified by the tuple (species, stockingDate) 
- Multiple ponds can share the same (species, stockingDate) combination
- Reconciliation logic (line 93): `ponds.filter(p=>${p.species} (${p.stockingDate})`===fishStock).map(p=>p.name)` returns multiple ponds for same stock
- Stock History (line 475-487): Groups by stockingDate and tracks pondNames array

**3. Is Fish Stock permanently identified by Stocking Date?**
✅ **In place**
- Fish Stock identifier: `${pond.species} (${pond.stockingDate})`
- Stocking Date immutable in types.ts line 7: `stockingDate:string`
- Never changes once assigned; remains tied to the pond permanently
- Used consistently throughout reconciliation as primary key

**4. Does system group data using Fish Stock + Stocking Date (NOT by log/record creation date)?**
✅ **In place**
- Reconciliation (line 82-116): Groups by Brand + Size + FishStock tuple
- Comment line 82: "grouped by Brand+Size+FishStock"
- FeedingRecord line 10 has `pond` field (NOT fishStock field)
- Grouping derives fishStock from pond.species + pond.stockingDate
- Date filter only filters WHEN data is logged, not how it's grouped

**5. Is data correctly aggregated across ponds sharing the same Fish Stock and Stocking Date?**
✅ **In place**
- Line 94: `feedingRecords.filter(r=>r.date===selDate&&r.brand===brand&&r.size===size&&pondsForStock.includes(r.pond)).reduce((s,r)=>s+r.total,0)`
- `pondsForStock` includes ALL ponds with same fishStock (line 93)
- totalFed aggregates across all ponds for that Fish Stock + brand + size
- Same aggregation for carryover (line 96), expectedBags, recordedRemaining (line 103)

---

### FEEDING DOCUMENTATION

**6. Is feed logged against a Pond (not a Fish Stock)?**
✅ **In place**
- FeedingRecord interface line 10: `pond:string;` (NOT fishStock)
- Feed logged by pond name in bulk log (line 278): `onAddRecord({...pond:r.pondName...})`
- User interface (line 268): Bulk log table rows by activePonds

**7. After selecting a Pond, does system auto-identify the Fish Stock assigned to that Pond?**
✅ **In place**
- pondToStock helper (line 69): `${p.species} (${p.stockingDate})`
- Reconciliation line 88: Derives fishStock from pond via pondToStock
- Edit feed modal (line 150-152): Uses pondToStock to lookup existing remaining feed
- Automatic derivation, user never manually enters fishStock

**8. Is the correct Fish Stock used automatically for feeding calculations?**
✅ **In place**
- Line 94: Uses derived fishStock in aggregation
- Line 96: Uses fishStock to lookup carryover from previous day's remaining logs
- Line 100-103: All calculations use fishStock to group with matching remaining logs
- No manual selection required

**9. Does Feed Summary by Pellet update correctly from feeding records?**
✅ **In place**
- PondManagementPage line 58: `feedSummary=history.reduce(...brand__size)`
- Updates from real-time feedingRecords prop
- Grouped by (brand, size), not by fishStock
- Displayed in pellet cards (line 177-221)

---

### OPENED BAGS

**10. Are Opened Bags recorded using: Feed Brand, Pellet Size, Fish Stock, Number of Bags Opened?**
⚠️ **Partial**
- BagOpenLog interface line 12: `{id, date, month, year, brand, size, kgPerBag, bagsOpened, totalKg}`
- **MISSING**: fishStock field in BagOpenLog
- Log modal (line 893-897): Has a Fish Stock selector
- Row data (line 195): `{brand, size, kgPerBag, qty, fishStock}`
- Save handler (line 213): `onAddBagLog({...fishStock:r.fishStock||undefined})`
- BUT: BagOpenLog type definition doesn't have fishStock field!

**11. Does system auto-retrieve kg per bag from Feed Inventory?**
✅ **In place**
- Line 204: `u.kgPerBag=inv?.weightPerBag||0`
- User enters Brand+Size, system auto-fills kgPerBag from inventory
- Edit modal (line 989): kgPerBag editable but defaults from inventory

**12. Are Opened Bags associated with Fish Stock (not Pond)?**
❌ **Missing**
- BagOpenLog type (line 12) has NO fishStock field
- Type only has: `{brand, size, date, ...}`
- Reconciliation (line 101): Matches bags by brand+size ONLY, ignores fishStock entirely
- `recordedBags=bagLogs.filter(b=>b.date===selDate&&b.brand===brand&&b.size===size)`
- Does NOT filter by fishStock!
- This causes incorrect aggregation if multiple fish stocks use same brand/size on same day

---

### REMAINING FEED

**13. Is Remaining Feed recorded using: Feed Brand, Pellet Size, Fish Stock, Remaining Feed (kg)?**
✅ **In place**
- FeedRemainingLog interface line 13: `{id, brand, size, fishStock, remainingKg, date}`
- All four fields present and required
- Log modal (line 1032-1040): Requires all fields

**14. Is Remaining Feed tied to Fish Stock only (never stored against a Pond)?**
✅ **In place**
- FeedRemainingLog has fishStock (line 13), NOT pond field
- Edit modal line 955: "for {editRec.pond} on {editRec.date}" - displays context
- Line 161: Derives fishStock from pond via pondToStock
- Stored against fishStock, not pond name

**15. Does editing Remaining Feed update reconciliation immediately?**
✅ **In place**
- reconRows useMemo (line 83): Depends on remainLogs
- Line 162-163: onEditRemainLog updates state
- React triggers re-render, reconRows recalculates
- Line 103: Uses updated remainLogs in filter
- Immediate reconciliation update guaranteed

---

### FEED RECONCILIATION

**16. Does reconciliation use Fish Stock as the reference (not Pond)?**
✅ **In place**
- Reconciliation key (line 88): `${r.brand}||${r.size}||${fs}` where fs=fishStock
- Line 93: Derives pondsForStock from fishStock
- All references use fishStock, not individual ponds

**17. Does it use yesterday's Remaining Feed correctly?**
✅ **In place**
- Line 85-86: Calculates previous date correctly
- Line 96: `remainLogs.filter(r=>r.date===prevDate&&...r.fishStock===fishStock)`
- Looks up remaining from PREVIOUS day for current Fish Stock
- carryover aggregates all remaining entries for yesterday

**18. Does it calculate expected bags opened correctly?**
✅ **In place**
- Line 97: `netNeeded=Math.max(0,totalFed-carryover)`
- Line 100: `expectedBags=netNeeded===0?0:Math.ceil(netNeeded/bagWeight)`
- Formula: ceil((totalFed - carryover) / bagWeight)
- Correct logic

**19. Does it detect mismatches accurately?**
⚠️ **Partial - depends on issue #12**
- Status detection (line 106-112):
  - feed_qty_mismatch: `recordedBags>0&&totalFed>carryover+(recordedBags*bagWeight)`
  - multiple_mismatches: `bagsDiff>0&&remainDiff>=1`
  - bag_mismatch: `bagsDiff>0`
  - remaining_mismatch: `remainDiff>=1`
- Logic is correct BUT calculations are wrong because:
  - recordedBags (line 101) doesn't filter by fishStock
  - Can sum bags from multiple fish stocks incorrectly

**20. Are resolved mismatches removed automatically?**
✅ **In place**
- Line 112: status="matched" when no differences
- reconRows filters out matched rows in notifications (line 124)
- Mobile popup (line 548): `reconExpanded===rowKey` - state-based, no persistence
- Mismatches only exist when active row is selected; no permanent storage

**21. Is full calculation breakdown shown in mismatch details popup?**
✅ **In place**
- Desktop (line 572-660): 7-step detailed breakdown
- Mobile popup (line 694-759): Same 7 steps
- Each step shows intermediate values and calculations
- Feed Qty Mismatch shows availability calculation (line 720)
- All calculations are transparent

---

## CRITICAL ISSUES

### Issue #1: BagOpenLog Missing fishStock Field
**Severity**: HIGH
**Location**: types.ts line 12
**Problem**: BagOpenLog type definition lacks fishStock field
**Impact**: 
- Cannot store which fish stock bags were opened for
- Reconciliation (line 101) can't filter bags by fishStock
- If two fish stocks (same brand/size, same day) exist, bags are incorrectly aggregated
- Example: Tilapia (Jan 1) and Tilapia (Jan 5) both 4.0mm Durante → bags counted twice

**Current Code Flow**:
1. User logs bags with fishStock selected (UI line 893-897)
2. handleSaveBags (line 213) passes fishStock to onAddBagLog
3. BagOpenLog type doesn't have field → data lost
4. Reconciliation (line 101) sums ALL bags for brand+size, missing fishStock filter

**Required Fix**: Add `fishStock?: string;` to BagOpenLog interface

---

## DATA MODEL OBSERVATIONS

### Current Pond Structure
```typescript
interface Pond {
  id: string;
  name: string;
  species: string;          // e.g. "Tilapia"
  stockingDate: string;     // e.g. "2026-01-15"
  status: "Active" | "Empty";
  // Fish Stock = `${species} (${stockingDate})`
}
```

### Fish Stock Identification
- Not a separate entity; derived composite key
- Format: `"Tilapia (2026-01-15)"` or `"Catfish (2026-02-01)"`
- Immutable once pond is stocked
- Multiple ponds can have same Fish Stock

### Feed Data Flow
```
FeedingRecord (pond → auto derive fishStock)
    ↓
Reconciliation groups by (fishStock, brand, size)
    ↓
Looks up: carryover (from remainLogs), expected bags, recorded bags, recorded remaining
    ↓
Calculates: netNeeded, expectedBags, expectedRemaining, mismatches
```

---

## SUMMARY TABLE

| Item | Status | Evidence |
|------|--------|----------|
| 1. Pond ≠ Fish Stock | ✅ | types.ts:7, PondManagementPage:112-120 |
| 2. Multi-pond Fish Stock | ✅ | FeedDocumentationPage:93 |
| 3. Stocking Date ID | ✅ | FeedDocumentationPage:69 |
| 4. Group by Stock+Date | ✅ | FeedDocumentationPage:82-88 |
| 5. Cross-pond Aggregation | ✅ | FeedDocumentationPage:94 |
| 6. Feed logged to Pond | ✅ | FeedingRecord:10, FeedDocumentationPage:278 |
| 7. Auto Fish Stock ID | ✅ | FeedDocumentationPage:69,150 |
| 8. Auto Fish Stock use | ✅ | FeedDocumentationPage:94,96 |
| 9. Feed Summary update | ✅ | PondManagementPage:58 |
| 10. Bags: Brand+Size+Stock | ⚠️ | types.ts:12 missing fishStock |
| 11. Auto kg/bag | ✅ | FeedDocumentationPage:204 |
| 12. Bags to Fish Stock | ❌ | BagOpenLog missing fishStock field |
| 13. Remaining: Brand+Size+Stock | ✅ | types.ts:13 |
| 14. Remaining to Stock only | ✅ | FeedDocumentationPage:161 |
| 15. Remaining updates reconciliation | ✅ | FeedDocumentationPage:83 useMemo |
| 16. Reconciliation by Stock | ✅ | FeedDocumentationPage:88,93 |
| 17. Use yesterday's remaining | ✅ | FeedDocumentationPage:85-86,96 |
| 18. Calculate bags correctly | ✅ | FeedDocumentationPage:97,100 |
| 19. Detect mismatches | ⚠️ | Logic OK but depends on #12 |
| 20. Auto remove matched | ✅ | FeedDocumentationPage:112 |
| 21. Show breakdown | ✅ | FeedDocumentationPage:572-660, 694-759 |

---

## RECOMMENDATIONS

1. **URGENT**: Fix BagOpenLog type to include optional `fishStock?: string;` field
2. Update reconciliation line 101 to filter by fishStock: 
   ```typescript
   const recordedBags=bagLogs.filter(b=>
     b.date===selDate && b.brand===brand && b.size===size && 
     (b.fishStock===fishStock || !b.fishStock)  // Allow legacy records without fishStock
   ).reduce((s,b)=>s+b.bagsOpened,0);
   ```
3. Update save handler to ensure fishStock is captured (already present, but relies on type fix)
4. Add migration handler for existing bags without fishStock

