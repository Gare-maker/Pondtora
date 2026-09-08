import type { Farm, FeedItem, Pond, Expense, Revenue, FeedingRecord, MortalityEntry, MonthData, PriceGroup, InvSettings, Invoice } from "./types";

/* ─── Constants ────────────────────────────────────────────── */
export const FEED_SIZES = ["0.2 mm","0.3 mm","0.5 mm","0.8 mm","1.2 mm","1.5 mm","2.0 mm","3.0 mm","4.0 mm","6.0 mm","9.0 mm"];
export const FEED_BRANDS = ["Omega Top","Blue Crown","EcoFloat","Aqualis","Alpha Feed","Vital Feed","TopFeed Aqua","Multi Feed","Aqua Boom","Agro Feed","NCF (Nigerian Certified Feed)","Dickem Fish Feed","Aqua Pro","Durante","Enam Papa","Tropo Farms Feed","Cycle Farms Feed","Local Commercial Pellet Feed","Coppens","Aller Aqua","Skretting","INVE Aquaculture","Zeigler","Raanan Fish Feed","Aqua Feed","Aqua Plus","Aqua Gold","Aqua Mix","Aqua Star","Aqua Master","Aqua Grow","Aqua Best","Aqua Life","Aqua Float","Aller Classic","Skretting Nutra","Coppens Advance","Coppens Premium","Regional Private Label Fish Feed","Local Compounded Floating Feed","Local Compounded Sinking Feed"];
export const EXPENSE_CATS= ["Feed","Fish Stock","Maintenance","Medication","Utilities","Labor","Transportation","Loan","General Overhead","Miscellaneous","Others"];
export const REVENUE_SRCS= ["Fish Sales","Pond Rental","Other Income","Others"];
export const POND_TYPES   = ["Earthen","Concrete","Tarpaulin"];
export const POND_SPECIES = ["Catfish","Tilapia","Carp","Salmon","Bass","Trout","Other"];
export const MORT_CAUSES = ["Unknown","Disease","Water stress","Predation","Handling","Oxygen depletion"];
export const TODAY=(()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;})();
export const INIT_FARMS:Farm[]=[
  {id:"FARM-001",name:"Aqua Laguna Station",city:"Lagos",state:"Lagos",country:"Nigeria"},
];

export const INIT_K = [
  {id:"KQ-1",text:"How many times a day should fingerlings typically be fed?",category:"Fish Feeding",options:["Once a day","Twice a day","Three times a day","Four times a day"],correctIndex:2},
  {id:"KQ-2",text:"What is the ideal dissolved oxygen level for tilapia ponds?",category:"Water Quality Management",options:["1–2 mg/L","3–4 mg/L","5–7 mg/L","8–10 mg/L"],correctIndex:2},
  {id:"KQ-3",text:"Which is a common sign of fish disease?",category:"Fish Health",options:["Active feeding","Swimming near surface gasping","Normal schooling","Bright coloration"],correctIndex:1},
  {id:"KQ-4",text:"What is the primary purpose of water flow-through in pond systems?",category:"Water Flow-Through System",options:["Cool the pond","Remove waste and replenish oxygen","Increase water temperature","Reduce feed consumption"],correctIndex:1},
  {id:"KQ-5",text:"How should unused feed bags be stored?",category:"Inventory Management",options:["On wet ground","In a dry, cool, ventilated area","In direct sunlight","Near chemicals"],correctIndex:1},
  {id:"KQ-6",text:"What does the term 'FCR' stand for?",category:"Fish Feeding",options:["Feed Consumption Rate","Feed Conversion Ratio","Fish Count Record","Farm Cost Report"],correctIndex:1},
  {id:"KQ-7",text:"Which equipment is used to measure dissolved oxygen in pond water?",category:"Equipment Operation",options:["Refractometer","DO meter","pH meter","Thermometer"],correctIndex:1},
];

export const INIT_C = [
  {id:"CQ-1",text:"When there is a disagreement with a colleague, you typically:",category:"Communication",options:["Avoid the conversation","Listen to understand their perspective","Report it immediately","Argue until they agree"],correctIndex:1},
  {id:"CQ-2",text:"If assigned a task you have never done before, you would:",category:"Adaptability",options:["Refuse until trained","Ask for help and attempt it step by step","Do it exactly as your previous job","Wait for someone else"],correctIndex:1},
  {id:"CQ-3",text:"When you notice an issue outside your responsibility, you:",category:"Initiative",options:["Ignore it","Report it to the appropriate person","Wait until asked","Handle it quietly"],correctIndex:1},
  {id:"CQ-4",text:"Working under pressure with tight deadlines, you:",category:"Stress Management",options:["Panic and make mistakes","Prioritize tasks and stay focused","Give up","Work slower than normal"],correctIndex:1},
  {id:"CQ-5",text:"If you discovered a team member taking farm supplies for personal use, you would:",category:"Integrity",options:["Ignore it","Report to a supervisor","Join in if needed","Tell colleagues only"],correctIndex:1},
  {id:"CQ-6",text:"When given constructive criticism by your supervisor, you:",category:"Emotional Intelligence",options:["Get defensive","Listen and apply the feedback","Feel discouraged for weeks","Complain to coworkers"],correctIndex:1},
  {id:"CQ-7",text:"When your team is short-handed for a physically demanding task, you:",category:"Physical Readiness",options:["Wait for more staff","Step in and help","Suggest they hire someone","Pretend not to notice"],correctIndex:1},
];

export const FINANCIAL_DATA: Record<number, MonthData[]> = {
  2025: [
    {month:"Jan",revenue:280000,expenses:210000,feedCost:125000,stockCost:42000,maintenance:18000,labor:15000,utilities:5000,overhead:5000},
    {month:"Feb",revenue:310000,expenses:235000,feedCost:140000,stockCost:45000,maintenance:20000,labor:18000,utilities:7000,overhead:5000},
    {month:"Mar",revenue:295000,expenses:220000,feedCost:130000,stockCost:43000,maintenance:19000,labor:16000,utilities:6000,overhead:6000},
    {month:"Apr",revenue:340000,expenses:255000,feedCost:150000,stockCost:50000,maintenance:22000,labor:18000,utilities:8000,overhead:7000},
    {month:"May",revenue:380000,expenses:280000,feedCost:165000,stockCost:55000,maintenance:25000,labor:20000,utilities:8000,overhead:7000},
    {month:"Jun",revenue:360000,expenses:265000,feedCost:155000,stockCost:52000,maintenance:22000,labor:19000,utilities:8000,overhead:9000},
    {month:"Jul",revenue:390000,expenses:290000,feedCost:170000,stockCost:58000,maintenance:26000,labor:20000,utilities:9000,overhead:7000},
    {month:"Aug",revenue:420000,expenses:310000,feedCost:182000,stockCost:62000,maintenance:27000,labor:22000,utilities:9000,overhead:8000},
    {month:"Sep",revenue:445000,expenses:325000,feedCost:190000,stockCost:65000,maintenance:28000,labor:23000,utilities:10000,overhead:9000},
    {month:"Oct",revenue:410000,expenses:300000,feedCost:175000,stockCost:60000,maintenance:25000,labor:21000,utilities:9000,overhead:10000},
    {month:"Nov",revenue:395000,expenses:285000,feedCost:165000,stockCost:57000,maintenance:23000,labor:20000,utilities:8000,overhead:12000},
    {month:"Dec",revenue:430000,expenses:315000,feedCost:185000,stockCost:64000,maintenance:27000,labor:22000,utilities:9000,overhead:8000},
  ],
  2026: [
    {month:"Jan",revenue:380000,expenses:265000,feedCost:155000,stockCost:52000,maintenance:22000,labor:20000,utilities:8000,overhead:8000},
    {month:"Feb",revenue:420000,expenses:290000,feedCost:170000,stockCost:57000,maintenance:24000,labor:21000,utilities:9000,overhead:9000},
    {month:"Mar",revenue:395000,expenses:280000,feedCost:162000,stockCost:55000,maintenance:23000,labor:20000,utilities:9000,overhead:11000},
    {month:"Apr",revenue:510000,expenses:340000,feedCost:200000,stockCost:67000,maintenance:28000,labor:24000,utilities:10000,overhead:11000},
    {month:"May",revenue:580000,expenses:390000,feedCost:229000,stockCost:78000,maintenance:32000,labor:27000,utilities:12000,overhead:12000},
    {month:"Jun",revenue:565000,expenses:355000,feedCost:209000,stockCost:71000,maintenance:29000,labor:25000,utilities:11000,overhead:10000},
  ],
};

/* ─── Initial State ─────────────────────────────────────────── */
export const INIT_INV: FeedItem[] = [
  {id:"FI-001",brand:"Durante",         size:"2.0 mm",bags:15,weightPerBag:30,totalKg:450,costPerBag:8500, supplier:"AgroVet Nigeria",     purchaseDate:"Jun 10",month:"Jun",farmId:"FARM-001"},
  {id:"FI-002",brand:"Vital Feed",      size:"4.0 mm",bags:8, weightPerBag:25,totalKg:200,costPerBag:9200, supplier:"Vital Feeds Ltd",     purchaseDate:"Jun 10",month:"Jun",farmId:"FARM-001"},
  {id:"FI-003",brand:"Propac",          size:"6.0 mm",bags:22,weightPerBag:25,totalKg:550,costPerBag:7800, supplier:"UAC Nigeria Plc",     purchaseDate:"Jun 15",month:"Jun",farmId:"FARM-001"},
  {id:"FI-004",brand:"Raanan Fish Feed",size:"3.0 mm",bags:10,weightPerBag:20,totalKg:200,costPerBag:8800, supplier:"Aqua Dealers Ltd",    purchaseDate:"Jun 20",month:"Jun",farmId:"FARM-001"},
  {id:"FI-005",brand:"Durante",         size:"4.0 mm",bags:18,weightPerBag:25,totalKg:450,costPerBag:9000, supplier:"AgroVet Nigeria",     purchaseDate:"May 28",month:"May",farmId:"FARM-001"},
  {id:"FI-006",brand:"Coppens",         size:"3.0 mm",bags:12,weightPerBag:25,totalKg:300,costPerBag:11500,supplier:"Aqua Supplies Co",    purchaseDate:"May 15",month:"May",farmId:"FARM-001"},
];
export const INIT_PONDS: Pond[] = [
  {id:"P001",name:"Pond 1",type:"Earthen", species:"Tilapia", sizeM2:"2400",initialStock:3000,currentCount:2847,stockingDate:"Jan 15, 2026",stockMonth:"Jan",totalCost:485000,status:"Active",notes:"",farmId:"FARM-001",lengthFt:"60",widthFt:"40"},
  {id:"P002",name:"Pond 2",type:"Concrete",species:"Catfish", sizeM2:"1800",initialStock:2000,currentCount:1923,stockingDate:"Feb 20, 2026",stockMonth:"Feb",totalCost:368000,status:"Active",notes:"",farmId:"FARM-001",lengthFt:"50",widthFt:"36"},
  {id:"P003",name:"Pond 3",type:"Earthen", species:"Tilapia", sizeM2:"3000",initialStock:3500,currentCount:3412,stockingDate:"Apr 01, 2026",stockMonth:"Apr",totalCost:290000,status:"Active",notes:"",farmId:"FARM-001",lengthFt:"70",widthFt:"43"},
  {id:"P004",name:"Pond 4",type:"Concrete",species:"Catfish", sizeM2:"2200",initialStock:1800,currentCount:1765,stockingDate:"Mar 10, 2026",stockMonth:"Mar",totalCost:325000,status:"Active",notes:"",farmId:"FARM-001",lengthFt:"55",widthFt:"40"},
  {id:"P005",name:"Pond 5",type:"Tarpaulin",species:"—",      sizeM2:"1200",initialStock:0,   currentCount:0,   stockingDate:"—",            stockMonth:"",  totalCost:0,     status:"Empty",  notes:"Ready for new stock",farmId:"FARM-001",lengthFt:"40",widthFt:"30"},
];
export const INIT_EXP: Expense[] = [
  {id:"EXP-041",category:"Feed",       amount:92000, date:"2026-06-26",month:"Jun",year:2026,pond:"Pond 1",desc:"Durante 4.0 mm restock"},
  {id:"EXP-040",category:"Labor",      amount:35000, date:"2026-06-25",month:"Jun",year:2026,pond:"",      desc:"Monthly staff wages"},
  {id:"EXP-039",category:"Maintenance",amount:18500, date:"2026-06-24",month:"Jun",year:2026,pond:"Pond 3",desc:"Aerator repair"},
  {id:"EXP-038",category:"Fish Stock", amount:155000,date:"2026-06-22",month:"Jun",year:2026,pond:"Pond 3",desc:"Tilapia fingerlings"},
  {id:"EXP-037",category:"Utilities",  amount:22000, date:"2026-06-20",month:"Jun",year:2026,pond:"",      desc:"Electricity bill"},
  {id:"EXP-036",category:"Feed",       amount:74000, date:"2026-06-15",month:"Jun",year:2026,pond:"Pond 2",desc:"Propac 6.0 mm bags"},
  {id:"EXP-035",category:"Labor",      amount:35000, date:"2026-05-25",month:"May",year:2026,pond:"",      desc:"May staff wages"},
  {id:"EXP-034",category:"Feed",       amount:88000, date:"2026-05-18",month:"May",year:2026,pond:"Pond 1",desc:"Durante restock"},
  {id:"EXP-033",category:"Maintenance",amount:12000, date:"2026-05-10",month:"May",year:2026,pond:"Pond 4",desc:"Pump service"},
  {id:"EXP-032",category:"Fish Stock", amount:195000,date:"2026-04-05",month:"Apr",year:2026,pond:"Pond 3",desc:"Tilapia fingerlings — 3500 pcs"},
  {id:"EXP-031",category:"Feed",       amount:68000, date:"2026-04-20",month:"Apr",year:2026,pond:"Pond 3",desc:"Coppens 3.0 mm starter"},
  {id:"EXP-030",category:"Utilities",  amount:19500, date:"2026-04-30",month:"Apr",year:2026,pond:"",      desc:"April electricity"},
];
export const INIT_REV: Revenue[] = [
  {id:"REV-018",source:"Fish Sales", amount:285000,date:"2026-06-25",month:"Jun",year:2026,notes:"Catfish harvest — 580kg"},
  {id:"REV-017",source:"Fish Sales", amount:140000,date:"2026-06-18",month:"Jun",year:2026,notes:"Tilapia — 350kg to market"},
  {id:"REV-016",source:"Pond Rental",amount:45000, date:"2026-06-01",month:"Jun",year:2026,notes:"Pond 5 monthly rental"},
  {id:"REV-015",source:"Fish Sales", amount:320000,date:"2026-05-28",month:"May",year:2026,notes:"Catfish harvest — 640kg"},
  {id:"REV-014",source:"Fish Sales", amount:175000,date:"2026-05-15",month:"May",year:2026,notes:"Tilapia — 420kg"},
  {id:"REV-013",source:"Processing Fee",amount:22000,date:"2026-05-20",month:"May",year:2026,notes:"Value-added processing"},
  {id:"REV-012",source:"Fish Sales", amount:260000,date:"2026-04-22",month:"Apr",year:2026,notes:"Mixed harvest — 520kg"},
  {id:"REV-011",source:"Pond Rental",amount:45000, date:"2026-04-01",month:"Apr",year:2026,notes:"Pond 5 monthly rental"},
];
export const INIT_FEED: FeedingRecord[] = [
  {id:"FR-001",date:"Jun 26",month:"Jun",year:2026,pond:"Pond 1",brand:"Durante",         size:"4.0 mm",morning:8,evening:7, total:15,recordedBy:"Ana R."},
  {id:"FR-002",date:"Jun 26",month:"Jun",year:2026,pond:"Pond 2",brand:"Propac",          size:"6.0 mm",morning:5,evening:6, total:11,recordedBy:"Juan M."},
  {id:"FR-003",date:"Jun 26",month:"Jun",year:2026,pond:"Pond 3",brand:"Propac",          size:"6.0 mm",morning:4,evening:4, total:8, recordedBy:"Juan M."},
  {id:"FR-004",date:"Jun 26",month:"Jun",year:2026,pond:"Pond 4",brand:"Vital Feed",      size:"4.0 mm",morning:6,evening:5, total:11,recordedBy:"Chidi O."},
  {id:"FR-005",date:"Jun 25",month:"Jun",year:2026,pond:"Pond 1",brand:"Durante",         size:"4.0 mm",morning:8,evening:8, total:16,recordedBy:"Ana R."},
  {id:"FR-006",date:"Jun 25",month:"Jun",year:2026,pond:"Pond 2",brand:"Raanan Fish Feed",size:"3.0 mm",morning:6,evening:5, total:11,recordedBy:"Ana R."},
  {id:"FR-007",date:"Jun 25",month:"Jun",year:2026,pond:"Pond 3",brand:"Propac",          size:"6.0 mm",morning:5,evening:5, total:10,recordedBy:"Juan M."},
  {id:"FR-008",date:"Jun 25",month:"Jun",year:2026,pond:"Pond 4",brand:"Vital Feed",      size:"4.0 mm",morning:5,evening:5, total:10,recordedBy:"Chidi O."},
  {id:"FR-009",date:"Jun 24",month:"Jun",year:2026,pond:"Pond 1",brand:"Durante",         size:"4.0 mm",morning:7,evening:8, total:15,recordedBy:"Juan M."},
  {id:"FR-010",date:"Jun 24",month:"Jun",year:2026,pond:"Pond 3",brand:"Vital Feed",      size:"2.0 mm",morning:5,evening:5, total:10,recordedBy:"Ana R."},
  {id:"FR-011",date:"Jun 23",month:"Jun",year:2026,pond:"Pond 2",brand:"Propac",          size:"6.0 mm",morning:5,evening:6, total:11,recordedBy:"Juan M."},
  {id:"FR-012",date:"Jun 23",month:"Jun",year:2026,pond:"Pond 4",brand:"Raanan Fish Feed",size:"3.0 mm",morning:4,evening:5, total:9, recordedBy:"Chidi O."},
];
export const INIT_MORT: MortalityEntry[] = [
  {id:"MR-001",pondId:"P002",date:"Jun 24",count:12,cause:"Disease",     notes:"Observed lesions, treated with medication"},
  {id:"MR-002",pondId:"P001",date:"Jun 18",count:5, cause:"Unknown",     notes:"Found during morning inspection"},
  {id:"MR-003",pondId:"P003",date:"Jun 10",count:8, cause:"Water stress",notes:"After heavy rain event"},
  {id:"MR-004",pondId:"P004",date:"Jun 15",count:3, cause:"Unknown",     notes:"Morning inspection, no visible cause"},
  {id:"MR-005",pondId:"P001",date:"Jun 05",count:7, cause:"Disease",     notes:"Treated with potassium permanganate"},
];

/* ─── Utils ─────────────────────────────────────────────────── */
export const fmt  = (n:number) => "₦"+n.toLocaleString();
export const yFmt = (v:number) => v>=1000000?`₦${(v/1000000).toFixed(1)}M`:v>=1000?`₦${(v/1000).toFixed(0)}K`:`₦${v}`;
export const uid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
export const toMon= (d:string) => { try{return new Date(d).toLocaleString("en",{month:"short"})}catch{return "Jun"} };
export const toYr = (d:string) => { try{return new Date(d).getFullYear()}catch{return 2026} };
export function fmtStockingDate(d:string):string{
  if(!d||d==="—"||d.trim()==="")return"—";
  let dt=new Date(d);
  if(isNaN(dt.getTime()))dt=new Date(d.replace(",",""));
  if(isNaN(dt.getTime()))return d;
  const day=dt.getUTCDate();
  const month=dt.toLocaleString("en-US",{month:"long",timeZone:"UTC"});
  const year=dt.getUTCFullYear();
  return`${day} ${month}, ${year}`;
}

export function fmtDate(d:string):string{
  if(!d||d==="—"||d.trim()==="")return"—";
  // Try ISO format first
  let dt=new Date(d);
  if(isNaN(dt.getTime()))dt=new Date(d.replace(",",""));
  if(isNaN(dt.getTime()))return d;
  const day=dt.getUTCDate();
  const month=dt.toLocaleString("en-US",{month:"long",timeZone:"UTC"});
  const year=dt.getUTCFullYear();
  return`${day} ${month}, ${year}`;
}

export function isSameDate(d1?: string | null, d2?: string | null): boolean {
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  const s1 = d1.trim();
  const s2 = d2.trim();
  if (s1 === s2) return true;

  const normalize = (val: string): string => {
    const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const clean = val.replace(/,/g, "").trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      const mIdx = months.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
      const day = parseInt(parts[1], 10);
      if (mIdx !== -1 && !isNaN(day)) {
        const year = parts[2] && /^\d{4}$/.test(parts[2]) ? parseInt(parts[2], 10) : new Date().getFullYear();
        return `${year}-${String(mIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return val;
  };

  return normalize(s1) === normalize(s2);
}

export const PAYMENT_METHODS=["Cash","Bank Transfer","POS","Cheque","Other"];
export const INV_STATUSES:Invoice["status"][]=["Draft","Sent","Pending","Partially Paid","Paid","Overdue","Cancelled","Error"];
export const STAFF_PERMISSIONS=["Financial Dashboard","Pond Management","Pond Details","Feed Stock","Feeding Records","Invoice","Reports","Staff Assessment"];
export const STAFF_ROLES_ALL=["Admin","Director","Farm Manager","Feeding Staff","General Staff"];
export const INIT_PRICE_GROUPS:PriceGroup[]=[
  {id:"PG-A",group:"A",displayName:"Small Size",   description:"Catfish under 200g",pricePerKg:2000,status:"Active"},
  {id:"PG-B",group:"B",displayName:"Medium Size",  description:"Catfish 200–400g",  pricePerKg:2500,status:"Active"},
  {id:"PG-C",group:"C",displayName:"Big Size",     description:"Catfish 400–700g",  pricePerKg:3000,status:"Active"},
  {id:"PG-D",group:"D",displayName:"Export Size",  description:"Catfish above 700g", pricePerKg:3500,status:"Active"},
];
export const INIT_INV_SETTINGS:InvSettings={farmName:"Aqua Laguna Station",farmAddress:"123 Fish Farm Road, Lagos",farmPhone:"+234 800 000 0000",farmEmail:"info@aqualaguna.com",bankDetails:"Aqua Laguna Station · GTBank · 0123456789",defaultNotes:"Thank you for your purchase.",footerMessage:"All sales are final. Payment within agreed terms.",taxRate:0,invoicePrefix:"INV",paymentTerms:"Payment due within 7 days"};

export const ADMIN_NAME = "Juan Morales";

export const downloadCSV=(filename:string,headers:string[],rows:(string|number)[][])=>{
  const esc=(v:string|number)=>`"${String(v).replace(/"/g,'""')}"`;
  const csv=[headers,...rows].map(r=>r.map(esc).join(",")).join("\n");
  const a=document.createElement("a"); a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv); a.download=filename; a.click();
};
export const openPrintWindow=(title:string,headers:string[],rows:(string|number)[][],subtitle?:string)=>{
  const th=headers.map(h=>`<th>${h}</th>`).join("");
  const tb=rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("");
  const html=`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:sans-serif;padding:24px;color:#0f172a}h1{font-size:20px;font-weight:700;margin:0}p.sub{font-size:12px;color:#64748b;margin:4px 0 20px}table{border-collapse:collapse;width:100%;font-size:13px}th{background:#f1f5f9;padding:8px 12px;text-align:left;font-weight:600;border:1px solid #e2e8f0}td{padding:8px 12px;border:1px solid #e2e8f0}tr:nth-child(even){background:#f8fafc}@media print{body{padding:0}}</style></head><body><h1>${title}</h1>${subtitle?`<p class="sub">${subtitle}</p>`:""}<table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></body></html>`;
  const w=window.open("","_blank"); if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
};

/* ─── Country / Currency data ────────────────────────────────── */
export const COUNTRY_CURRENCIES:Record<string,{symbol:string;code:string;name:string}>={
  "Nigeria":{symbol:"₦",code:"NGN",name:"Nigerian Naira"},
  "United States":{symbol:"$",code:"USD",name:"US Dollar"},
  "United Kingdom":{symbol:"£",code:"GBP",name:"British Pound"},
  "Ghana":{symbol:"₵",code:"GHS",name:"Ghanaian Cedi"},
  "Kenya":{symbol:"KSh",code:"KES",name:"Kenyan Shilling"},
  "South Africa":{symbol:"R",code:"ZAR",name:"South African Rand"},
  "Canada":{symbol:"C$",code:"CAD",name:"Canadian Dollar"},
  "Australia":{symbol:"A$",code:"AUD",name:"Australian Dollar"},
  "India":{symbol:"₹",code:"INR",name:"Indian Rupee"},
  "Brazil":{symbol:"R$",code:"BRL",name:"Brazilian Real"},
  "Mexico":{symbol:"MX$",code:"MXN",name:"Mexican Peso"},
  "UAE":{symbol:"AED",code:"AED",name:"UAE Dirham"},
  "Egypt":{symbol:"E£",code:"EGP",name:"Egyptian Pound"},
  "Ethiopia":{symbol:"Br",code:"ETB",name:"Ethiopian Birr"},
  "Tanzania":{symbol:"TSh",code:"TZS",name:"Tanzanian Shilling"},
  "Uganda":{symbol:"USh",code:"UGX",name:"Ugandan Shilling"},
  "Rwanda":{symbol:"RF",code:"RWF",name:"Rwandan Franc"},
  "Zambia":{symbol:"ZK",code:"ZMW",name:"Zambian Kwacha"},
  "Zimbabwe":{symbol:"RTGS$",code:"ZWL",name:"Zimbabwean Dollar"},
  "France":{symbol:"€",code:"EUR",name:"Euro"},
  "Germany":{symbol:"€",code:"EUR",name:"Euro"},
  "Netherlands":{symbol:"€",code:"EUR",name:"Euro"},
  "Spain":{symbol:"€",code:"EUR",name:"Euro"},
  "Italy":{symbol:"€",code:"EUR",name:"Euro"},
  "China":{symbol:"¥",code:"CNY",name:"Chinese Yuan"},
  "Japan":{symbol:"¥",code:"JPY",name:"Japanese Yen"},
  "Philippines":{symbol:"₱",code:"PHP",name:"Philippine Peso"},
  "Indonesia":{symbol:"Rp",code:"IDR",name:"Indonesian Rupiah"},
  "Malaysia":{symbol:"RM",code:"MYR",name:"Malaysian Ringgit"},
  "Singapore":{symbol:"S$",code:"SGD",name:"Singapore Dollar"},
};
export const COUNTRIES=[
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon",
  "Central African Republic","Chad","Comoros","Congo (Republic)","Congo (DR)","Djibouti",
  "Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana",
  "Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi",
  "Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria",
  "Rwanda","São Tomé and Príncipe","Senegal","Seychelles","Sierra Leone","Somalia",
  "South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe",
  "Australia","Brazil","Canada","China","France","Germany","India","Indonesia",
  "Italy","Japan","Malaysia","Mexico","Netherlands","Philippines","Saudi Arabia","Singapore",
  "Spain","UAE","United Kingdom","United States"
].sort();
export const DIAL_CODES:Record<string,string>={"Nigeria":"+234","United States":"+1","United Kingdom":"+44","Ghana":"+233","Kenya":"+254","South Africa":"+27","Canada":"+1","Australia":"+61","India":"+91","Brazil":"+55","Mexico":"+52","UAE":"+971","Egypt":"+20","Ethiopia":"+251","Tanzania":"+255","Uganda":"+256","Rwanda":"+250","Zambia":"+260","Zimbabwe":"+263","France":"+33","Germany":"+49","Netherlands":"+31","Spain":"+34","Italy":"+39","China":"+86","Japan":"+81","Philippines":"+63","Indonesia":"+62","Malaysia":"+60","Singapore":"+65"};
export const FLAG_EMOJI:Record<string,string>={"Nigeria":"🇳🇬","United States":"🇺🇸","United Kingdom":"🇬🇧","Ghana":"🇬🇭","Kenya":"🇰🇪","South Africa":"🇿🇦","Canada":"🇨🇦","Australia":"🇦🇺","India":"🇮🇳","Brazil":"🇧🇷","Mexico":"🇲🇽","UAE":"🇦🇪","Egypt":"🇪🇬","Ethiopia":"🇪🇹","Tanzania":"🇹🇿","Uganda":"🇺🇬","Rwanda":"🇷🇼","Zambia":"🇿🇲","Zimbabwe":"🇿🇼","France":"🇫🇷","Germany":"🇩🇪","Netherlands":"🇳🇱","Spain":"🇪🇸","Italy":"🇮🇹","China":"🇨🇳","Japan":"🇯🇵","Philippines":"🇵🇭","Indonesia":"🇮🇩","Malaysia":"🇲🇾","Singapore":"🇸🇬"};
/* NGN to local currency rates (approximate, 2025 reference) */
export const NGN_FX:Record<string,number>={"Nigeria":1,"United States":0.00062,"United Kingdom":0.00049,"Ghana":0.0092,"Kenya":0.082,"South Africa":0.011,"Canada":0.00085,"Australia":0.00095,"India":0.052,"Brazil":0.0036,"Mexico":0.011,"UAE":0.0023,"Egypt":0.031,"Ethiopia":0.074,"Tanzania":1.62,"Uganda":2.32,"Rwanda":0.89,"Zambia":0.017,"Zimbabwe":0.21,"France":0.00057,"Germany":0.00057,"Netherlands":0.00057,"Spain":0.00057,"Italy":0.00057,"China":0.0045,"Japan":0.093,"Philippines":0.035,"Indonesia":9.9,"Malaysia":0.0028,"Singapore":0.00083};
export function convertNGN(nairaAmount:number,country:string):number{
  const rate=NGN_FX[country]??1;
  const val=nairaAmount*rate;
  if(country==="Nigeria")return nairaAmount;
  if(val>=1000)return Math.round(val);
  if(val>=10)return Math.round(val*10)/10;
  return Math.round(val*100)/100;
}
