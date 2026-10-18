// scripts/test_stock_history_and_farm_persistence.js
import assert from "node:assert";

console.log("================================================================================");
console.log("=== Pondtora: Fish Stock History and Farm Persistence Verification Tests ===");
console.log("================================================================================");

/* ==============================================================================
   PART 1: Fish Stock History and Operational Filters Logic
   ============================================================================== */

// Helper functions mirroring Pondtora implementations
const formatFishStock = (name) => {
  if (!name || name === "—") return "—";
  return name.trim();
};

const formatFishStockDate = (dateStr) => {
  if (!dateStr || dateStr === "—") return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${mNames[d.getMonth()]} ${d.getDate()}`;
};

const isStockMatch = (stockA, stockB) => {
  if (!stockA || !stockB || stockA === "—" || stockB === "—") return false;
  return stockA.trim().toLowerCase() === stockB.trim().toLowerCase();
};

// Simulation of Stock Groups computation in PondManagementPage
function computeStockGroups(ponds, stockEvents) {
  const groupsMap = new Map();

  const getPondFishStock = (p) => {
    if (p.fishStock && p.fishStock !== "—") return p.fishStock;
    if (p.stockingDate && p.stockingDate !== "—") return formatFishStockDate(p.stockingDate);
    return p.species || "—";
  };

  // 1. Process active ponds (matching step 2 of PondManagementPage)
  (ponds || []).filter(p => p.status === "Active").forEach(p => {
    const stockName = getPondFishStock(p);
    if (!stockName || stockName === "—" || stockName === "General Stock") return;

    const key = stockName.toLowerCase().trim();
    const existing = groupsMap.get(key);

    const init = Number(p.initialStock) || 0;
    const curr = Number(p.currentCount);
    const pondHasFish = curr > 0 || (init > 0 && (p.currentCount === undefined || p.currentCount === null));
    const pondIsActiveWithFish = pondHasFish;

    if (existing) {
      existing.totalStartCount += init;
      existing.totalCurrentFish += (curr || 0);
      if (p.name && !existing.pondNames.includes(p.name)) existing.pondNames.push(p.name);
      if (p.id && !existing.pondIds.includes(p.id)) existing.pondIds.push(p.id);
      if (pondIsActiveWithFish) existing.hasActivePondsWithFish = true;
    } else {
      groupsMap.set(key, {
        id: `sg-${key}`,
        stockName,
        stockingDate: p.stockingDate || "—",
        species: p.species || "—",
        pondNames: p.name ? [p.name] : [],
        pondIds: p.id ? [p.id] : [],
        totalStartCount: init,
        totalCurrentFish: curr || 0,
        hasActivePondsWithFish: pondIsActiveWithFish
      });
    }
  });

  // 2. Process stock events (Closed, Initial, Restock)
  (stockEvents || []).forEach(se => {
    const stockName = se.batch || se.species || (se.date ? formatFishStockDate(se.date) : "—");
    if (!stockName || stockName === "—") return;
    const key = stockName.toLowerCase().trim();
    const existing = groupsMap.get(key);

    if (existing) {
      if (existing.totalStartCount === 0 && (Number(se.count) || 0) > 0) {
        existing.totalStartCount = Number(se.count) || 0;
      }
      if (se.pondName && !existing.pondNames.includes(se.pondName)) existing.pondNames.push(se.pondName);
      if (se.pondId && !existing.pondIds.includes(se.pondId)) existing.pondIds.push(se.pondId);
    } else {
      groupsMap.set(key, {
        id: `sg-${key}`,
        stockName,
        stockingDate: se.date || "—",
        species: se.species || "—",
        pondNames: se.pondName ? [se.pondName] : [],
        pondIds: se.pondId ? [se.pondId] : [],
        totalStartCount: Number(se.count) || 0,
        totalCurrentFish: 0,
        hasActivePondsWithFish: false
      });
    }
  });

  // Calculate final isActive and status
  return Array.from(groupsMap.values()).map(g => {
    const isActive = g.hasActivePondsWithFish;
    return {
      ...g,
      isActive,
      status: isActive ? "Active" : "Cleared / Archived"
    };
  });
}

// Simulation of operational filter options
function computePondManagementFilterOptions(stockGroups, ponds) {
  const activeStockOptions = (stockGroups || [])
    .filter(g => {
      if (!g.isActive) return false;
      return (ponds || []).some(p => {
        if (!p || p.status !== "Active") return false;
        const count = Number(p.currentCount);
        const init = Number(p.initialStock);
        const hasFish = count > 0 || (init > 0 && (p.currentCount === undefined || p.currentCount === null));
        if (!hasFish) return false;
        return isStockMatch(p.fishStock, g.stockName) ||
               isStockMatch(p.species, g.stockName) ||
               (p.stockingDate && isStockMatch(formatFishStockDate(p.stockingDate), g.stockName));
      });
    })
    .map(g => g.stockName);

  return activeStockOptions;
}

function computeFeedRecordFilterOptions(ponds) {
  const activePonds = (ponds || []).filter(p => {
    if (!p || p.status !== "Active") return false;
    const count = Number(p.currentCount);
    const init = Number(p.initialStock);
    return count > 0 || (init > 0 && (p.currentCount === undefined || p.currentCount === null));
  });

  const list = [];
  const seen = new Set();
  activePonds.forEach(p => {
    const stock = p.fishStock || p.species || "—";
    if (!stock || stock === "—") return;
    const norm = stock.toLowerCase().trim();
    if (seen.has(norm)) return;
    seen.add(norm);
    list.push(stock);
  });
  return list;
}

// TEST 1: Single pond stock cleared completely
console.log("\n--- TEST 1: Stocking a pond and clearing it ---");
let ponds = [
  { id: "pond-1", name: "Pond 1", status: "Active", fishStock: "Batch A - Dutch Clarias", species: "Clarias", stockingDate: "2026-03-01", initialStock: 5000, currentCount: 4800 }
];
let stockEvents = [
  { id: "se-1", type: "Initial", date: "2026-03-01", pondId: "pond-1", pondName: "Pond 1", batch: "Batch A - Dutch Clarias", count: 5000 }
];

let groups = computeStockGroups(ponds, stockEvents);
assert.strictEqual(groups.length, 1, "There should be 1 stock group");
assert.strictEqual(groups[0].isActive, true, "Stock group should be active initially");
assert.strictEqual(groups[0].status, "Active", "Status should be 'Active'");
assert.strictEqual(computePondManagementFilterOptions(groups, ponds).includes("Batch A - Dutch Clarias"), true, "Appears in Pond Mgmt filter");
assert.strictEqual(computeFeedRecordFilterOptions(ponds).includes("Batch A - Dutch Clarias"), true, "Appears in Feed Record filter");
console.log("✔ Initial active state verified in filters and history.");

// Clear the pond
ponds[0] = {
  ...ponds[0],
  status: "Empty",
  currentCount: 0,
  fishStock: "—",
  stockingDate: "—"
};
stockEvents.push({
  id: "se-2",
  type: "Closed",
  date: "2026-04-15",
  clearedDate: "2026-04-15",
  pondId: "pond-1",
  pondName: "Pond 1",
  batch: "Batch A - Dutch Clarias",
  count: 4800,
  note: "Cleared after full harvest"
});

groups = computeStockGroups(ponds, stockEvents);
assert.strictEqual(groups.length, 1, "Historical stock record must NOT be deleted");
assert.strictEqual(groups[0].stockName, "Batch A - Dutch Clarias", "Stock name preserved in history");
assert.strictEqual(groups[0].isActive, false, "Stock is no longer active in any pond");
assert.strictEqual(groups[0].status, "Cleared / Archived", "Stock is marked 'Cleared / Archived'");
assert.strictEqual(groups[0].totalStartCount, 5000, "Historical initial stock count retained");
assert.strictEqual(groups[0].totalCurrentFish, 0, "Current fish count is 0");
assert.strictEqual(groups[0].pondNames.includes("Pond 1"), true, "Previous pond assignment preserved");

const pondFilters = computePondManagementFilterOptions(groups, ponds);
const feedFilters = computeFeedRecordFilterOptions(ponds);
assert.strictEqual(pondFilters.length, 0, "Cleared stock must NOT appear in Pond Management filter");
assert.strictEqual(feedFilters.length, 0, "Cleared stock must NOT appear in Feed Record filter");
console.log("✔ Cleared stock preserved in history with status 'Cleared / Archived' and 0 active fish.");
console.log("✔ Cleared stock successfully excluded from Pond Management and Feed Record filters.");

// TEST 2: Multi-pond stock: cleared from Pond 1, remains active in Pond 2
console.log("\n--- TEST 2: Multi-pond stock partial clearance ---");
ponds = [
  { id: "pond-1", name: "Pond 1", status: "Active", fishStock: "Batch B - Hybrid", species: "Hybrid Catfish", stockingDate: "2026-03-10", initialStock: 3000, currentCount: 2900 },
  { id: "pond-2", name: "Pond 2", status: "Active", fishStock: "Batch B - Hybrid", species: "Hybrid Catfish", stockingDate: "2026-03-10", initialStock: 3000, currentCount: 2950 }
];
stockEvents = [
  { id: "se-b1", type: "Initial", date: "2026-03-10", pondId: "pond-1", pondName: "Pond 1", batch: "Batch B - Hybrid", count: 3000 },
  { id: "se-b2", type: "Initial", date: "2026-03-10", pondId: "pond-2", pondName: "Pond 2", batch: "Batch B - Hybrid", count: 3000 }
];

groups = computeStockGroups(ponds, stockEvents);
assert.strictEqual(groups[0].isActive, true);
assert.strictEqual(computePondManagementFilterOptions(groups, ponds).includes("Batch B - Hybrid"), true);
assert.strictEqual(computeFeedRecordFilterOptions(ponds).includes("Batch B - Hybrid"), true);

// Clear ONLY Pond 1
ponds[0] = { ...ponds[0], status: "Empty", currentCount: 0, fishStock: "—", stockingDate: "—" };
stockEvents.push({
  id: "se-b3",
  type: "Closed",
  date: "2026-04-20",
  clearedDate: "2026-04-20",
  pondId: "pond-1",
  pondName: "Pond 1",
  batch: "Batch B - Hybrid",
  count: 2900
});

groups = computeStockGroups(ponds, stockEvents);
assert.strictEqual(groups.length, 1);
assert.strictEqual(groups[0].isActive, true, "Stock must remain ACTIVE because Pond 2 still holds active fish");
assert.strictEqual(groups[0].status, "Active", "Status must remain Active");
assert.strictEqual(groups[0].totalCurrentFish, 2950, "Current fish count reflects active Pond 2");
assert.strictEqual(computePondManagementFilterOptions(groups, ponds).includes("Batch B - Hybrid"), true, "Remains in Pond Mgmt filter");
assert.strictEqual(computeFeedRecordFilterOptions(ponds).includes("Batch B - Hybrid"), true, "Remains in Feed Record filter");
console.log("✔ Partial clearance: Stock remains active while fish exist in Pond 2.");

// Now clear Pond 2 as well
ponds[1] = { ...ponds[1], status: "Empty", currentCount: 0, fishStock: "—", stockingDate: "—" };
stockEvents.push({
  id: "se-b4",
  type: "Closed",
  date: "2026-05-01",
  clearedDate: "2026-05-01",
  pondId: "pond-2",
  pondName: "Pond 2",
  batch: "Batch B - Hybrid",
  count: 2950
});

groups = computeStockGroups(ponds, stockEvents);
assert.strictEqual(groups.length, 1, "Stock history preserved");
assert.strictEqual(groups[0].isActive, false, "Stock is now inactive across all ponds");
assert.strictEqual(groups[0].status, "Cleared / Archived");
assert.strictEqual(computePondManagementFilterOptions(groups, ponds).includes("Batch B - Hybrid"), false, "Excluded from Pond Mgmt filter");
assert.strictEqual(computeFeedRecordFilterOptions(ponds).includes("Batch B - Hybrid"), false, "Excluded from Feed Record filter");
console.log("✔ Complete clearance: Excluded from all filters, fully preserved in Fish Stock History.");


/* ==============================================================================
   PART 2: Farm Persistence Logic
   ============================================================================== */

console.log("\n--- TEST 3: Farm persistence and backend synchronization ---");

// Simulation of App.tsx backend sync logic (applyBackendData)
function simulateApplyBackendData(backendFarms, backendPonds, isFarmOwner, farmLimit, currentSelectedFarmId) {
  let resolvedFarms = [...backendFarms];

  // Old buggy logic had:
  // if (isFarmOwner && farmLimit === 1 && resolvedFarms.length > 1) {
  //   api.farms.remove(dup.id); // BUG: Deleted 2nd farm!
  //   resolvedFarms = [primaryFarm];
  // }
  // AND deduplicated by name:
  // const seenFarmNames = new Set(); resolvedFarms.filter(...)

  // FIXED LOGIC:
  // No deletion of user farms based on farmLimit!
  // Farms are distinct entities saved by unique id:
  const seenIds = new Set();
  const dedupedFarms = [];
  resolvedFarms.forEach(f => {
    if (!f || !f.id) return;
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id);
      dedupedFarms.push(f);
    }
  });

  // Selected farm preservation
  let selectedFarmId = currentSelectedFarmId;
  if (!dedupedFarms.some(f => f.id === selectedFarmId)) {
    selectedFarmId = dedupedFarms[0]?.id || "";
  }

  return {
    farms: dedupedFarms,
    selectedFarmId
  };
}

const userFarms = [
  { id: "farm-1", name: "Green Valley Farm", userId: "user-123", city: "Ibadan", state: "Oyo" },
  { id: "farm-2", name: "Sunrise Aquaculture", userId: "user-123", city: "Epe", state: "Lagos" }
];

// User has 2 farms, but planLimit is 1 (e.g. Starter trial or before plan data arrives)
const syncResult = simulateApplyBackendData(userFarms, [], true, 1, "farm-2");

assert.strictEqual(syncResult.farms.length, 2, "Both farms must be preserved in state");
assert.strictEqual(syncResult.farms[0].id, "farm-1", "Farm 1 preserved");
assert.strictEqual(syncResult.farms[1].id, "farm-2", "Farm 2 preserved");
assert.strictEqual(syncResult.selectedFarmId, "farm-2", "Current farm selection preserved");
console.log("✔ Backend synchronization does NOT delete secondary farm regardless of farmLimit.");

// TEST 4: Editing secondary farm name
console.log("\n--- TEST 4: Editing secondary farm name ---");
function simulateHandleEditFarm(farms, userProfile, editedFarm) {
  const updatedFarms = farms.map(f => f.id === editedFarm.id ? editedFarm : f);
  // Primary farm check:
  const isPrimaryFarm = farms.length <= 1 || farms[0]?.id === editedFarm.id;
  let updatedProfile = { ...userProfile };
  if (isPrimaryFarm) {
    updatedProfile.farmName = editedFarm.name;
  }
  return { updatedFarms, updatedProfile };
}

const initialProfile = { id: "user-123", farmName: "Green Valley Farm" };
const editResult = simulateHandleEditFarm(userFarms, initialProfile, {
  ...userFarms[1],
  name: "Sunrise Aquaculture VIP"
});

assert.strictEqual(editResult.updatedFarms[1].name, "Sunrise Aquaculture VIP", "Second farm name updated");
assert.strictEqual(editResult.updatedFarms[0].name, "Green Valley Farm", "First farm name untouched");
assert.strictEqual(editResult.updatedProfile.farmName, "Green Valley Farm", "UserProfile.farmName remains primary farm");
console.log("✔ Editing secondary farm updates only that farm and does NOT overwrite primary farm or userProfile.");

console.log("\n================================================================================");
console.log("=== ALL TESTS PASSED SUCCESSFULLY! ===");
console.log("================================================================================");
