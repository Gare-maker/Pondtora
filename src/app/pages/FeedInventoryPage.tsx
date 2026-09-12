import React, { useState } from "react";
import {
  Plus, CheckCircle, Layers, Trash2, ChevronDown, ChevronUp,
  Pencil, Package, Download, FileText, Lock, Calendar, ChevronLeft, ChevronRight, Search, Fish
} from "lucide-react";
import type { FeedItem, BagOpenLog, FeedRemainingLog, Pond } from "../types";
import { FEED_SIZES, FEED_BRANDS, TODAY, fmt, uid, toMon, toYr, downloadCSV, openPrintWindow, fmtDate, fmtStockingDate } from "../data";
import { Card, Bdg, PBtn, Pagination, PER_PAGE, StatCard, Modal, F, IC, SC, SH, SearchableSelect, useSort, DateInput, NumInput } from "../shared";
import { isSameDate, toValidDbDate } from "../../lib/api";

/* ─── Feed Requirement Calculator defaults ───────────────────── */
const DEFAULT_CALC_STANDARDS:{[size:string]:{bagsPerK:number;kgPerBag:number}}={
  "Under 2.0 mm":{bagsPerK:5,kgPerBag:15},
  "2.0 mm":{bagsPerK:3,kgPerBag:15},
  "3.0 mm":{bagsPerK:8,kgPerBag:15},
  "4.0 mm":{bagsPerK:16,kgPerBag:15},
  "6.0 mm":{bagsPerK:24,kgPerBag:15},
  "9.0 mm":{bagsPerK:14,kgPerBag:15},
};

/* ─── 3. Feed Inventory ─────────────────────────────────────── */
export default function FeedInventory({inventory,onAdd,onDelete,feedingRecords,bagLogs,remainLogs=[],ponds=[],onEditBagLog,onEditInv,currency="₦",canEditLocked}:{inventory:FeedItem[];onAdd:(f:FeedItem)=>void;onDelete:(id:string)=>void;feedingRecords:any[];bagLogs:BagOpenLog[];remainLogs?:FeedRemainingLog[];ponds?:Pond[];onEditBagLog:(b:BagOpenLog)=>void;onEditInv?:(f:FeedItem)=>void;currency?:string;canEditLocked?:boolean;}){
  const realTodayFmt=(()=>{const n=new Date();const day=n.getDate();const mon=n.toLocaleString("en-US",{month:"long"});const yr=n.getFullYear();return`${day} ${mon}, ${yr}`;})();
  const isPurchaseEditable=(purchaseDate:string)=>canEditLocked||purchaseDate===realTodayFmt;
  const cs=currency;
  const [tab,setTab]=useState<"stock"|"daily_bags"|"purchases">("stock");
  const [showBuy,setShowBuy]=useState(false);
  /* calculator state */
  const [showCalc,setShowCalc]=useState(false);
  const [calcFish,setCalcFish]=useState("");
  const [calcPrices,setCalcPrices]=useState<Record<string,string>>({});
  const [calcStandards,setCalcStandards]=useState<Record<string,{bagsPerK:number;kgPerBag:number}>>(()=>Object.fromEntries(Object.entries(DEFAULT_CALC_STANDARDS).map(([k,v])=>[k,{...v}])));
  const [calcStep,setCalcStep]=useState<"input"|"results">("input");
  const [showCustomize,setShowCustomize]=useState(false);
  const [customEdit,setCustomEdit]=useState<Record<string,{bagsPerK:string;kgPerBag:string}>>({});
  const [buyF,setBuyF]=useState({date:TODAY,brand:"Durante",size:"4.0 mm",bags:"",wpb:"15",cpb:"",supplier:""});
  const [buyErr,setBuyErr]=useState<Record<string,string>>({});
  const [fBrand,setFBrand]=useState("All"); const [fSize,setFSize]=useState("All"); const [fMonth,setFMonth]=useState("All");
  const {sorted:sortedInv,sf,sd,toggle}=useSort(inventory,"brand");
  const brands=[...new Set(inventory.map(f=>f.brand))]; const sizes=[...new Set(inventory.map(f=>f.size))]; const months=[...new Set(inventory.map(f=>f.month).filter(Boolean))];
  const filtInv=sortedInv.filter(f=>(fBrand==="All"||f.brand===fBrand)&&(fSize==="All"||f.size===fSize)&&(fMonth==="All"||f.month===fMonth));
  const totalBagsPurchased=inventory.reduce((s,f)=>s+f.bags,0);
  const totalBagsOpened=bagLogs.reduce((s,b)=>s+(Number(b.bagsOpened)||0),0);
  const totalBagsInStock=Math.max(0,totalBagsPurchased-totalBagsOpened);
  const totalKgInStock=Object.values(inventory.reduce<Record<string,{brand:string;size:string;wpb:number;bags:number}>>((acc,f)=>{
    const k=`${f.brand}|${f.size}|${f.weightPerBag}`;
    if(!acc[k])acc[k]={brand:f.brand,size:f.size,wpb:f.weightPerBag||15,bags:0};
    acc[k].bags+=f.bags;
    return acc;
  },{})).reduce((s,row)=>{
    const opened=bagLogs.filter(b=>b.brand===row.brand&&b.size===row.size).reduce((sb,b)=>sb+(Number(b.bagsOpened)||0),0);
    const inStock=Math.max(0,row.bags-opened);
    return s+(inStock*row.wpb);
  },0);
  const invValue=inventory.reduce((s,f)=>s+f.bags*f.costPerBag,0);
  const handleBuy=()=>{
    const errs:Record<string,string>={};
    if(!buyF.bags||Number(buyF.bags)<=0)errs.bags="Bags purchased is required";
    if(!buyF.cpb||Number(buyF.cpb)<=0)errs.cpb="Cost per bag is required";
    if(!buyF.date)errs.date="Purchase date is required";
    if(Object.keys(errs).length){setBuyErr(errs);return;}
    setBuyErr({});
    const bags=Number(buyF.bags),wpb=Number(buyF.wpb);onAdd({id:uid(),brand:buyF.brand,size:buyF.size,bags,weightPerBag:wpb,totalKg:bags*wpb,costPerBag:Number(buyF.cpb),supplier:buyF.supplier,purchaseDate:fmtDate(buyF.date),month:toMon(buyF.date)});
    setShowBuy(false);setBuyErr({});setBuyF({date:TODAY,brand:"Durante",size:"4.0 mm",bags:"",wpb:"15",cpb:"",supplier:""});};
  const [clearConfirmId,setClearConfirmId]=useState<string|null>(null);
  const [clearConfirmLabel,setClearConfirmLabel]=useState("");
  const handleDelete=(id:string,brand:string,size:string)=>{setClearConfirmId(id);setClearConfirmLabel(`${brand} ${size}`);};
  /* purchase history filters */
  const [pFMonth,setPFMonth]=useState<string>("All");
  const [pFYear,setPFYear]=useState<string>("All");
  const purchaseYears=["2026"];
  const purchaseMonths=[...new Set(inventory.map(f=>f.month).filter(Boolean))];
  /* edit purchase */
  const [editPurchase,setEditPurchase]=useState<FeedItem|null>(null);
  const [purchasePage,setPurchasePage]=useState(1);
  const filtPurchases=inventory.filter(f=>{
    if(pFMonth!=="All"&&f.month!==pFMonth)return false;
    return true;
  });
  const pagedPurchases=[...filtPurchases].reverse().slice((purchasePage-1)*PER_PAGE,purchasePage*PER_PAGE);
  /* daily bags opened tab state */
  const [dailyDate, setDailyDate] = useState(TODAY);
  const [fDailyStock, setFDailyStock] = useState("All");
  const [fDailyBrand, setFDailyBrand] = useState("All");
  const [fDailySize, setFDailySize] = useState("All");
  const [dailySearch, setDailySearch] = useState("");
  const [dailyPage, setDailyPage] = useState(1);

  const shiftDailyDate = (days: number) => {
    const d = new Date(dailyDate || TODAY);
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setDailyDate(`${y}-${m}-${day}`);
    setDailyPage(1);
  };

  const dailyDateStr = toValidDbDate(dailyDate) || dailyDate;
  const dayBagLogs = (bagLogs || []).filter(b => isSameDate(b.date, dailyDateStr));
  const dayRemainLogs = (remainLogs || []).filter(r => isSameDate(r.date, dailyDateStr));

  const dailyMap: Record<string, { fishStock: string; brand: string; size: string; bagsOpened: number; kgPerBag: number; totalKgOpened: number; remainingKg: number }> = {};

  dayBagLogs.forEach(b => {
    const stock = (b.fishStock && b.fishStock.trim() && b.fishStock !== "—") ? b.fishStock.trim() : "General Stock";
    const brand = b.brand || "Standard";
    const size = b.size || "4.0 mm";
    const key = `${stock}__${brand}__${size}`;
    const bags = Number(b.bagsOpened) || 0;
    const kgPb = Number(b.kgPerBag) || 15;
    const kg = Number(b.totalKg) || (bags * kgPb);

    if (!dailyMap[key]) {
      dailyMap[key] = {
        fishStock: stock,
        brand,
        size,
        bagsOpened: bags,
        kgPerBag: kgPb,
        totalKgOpened: kg,
        remainingKg: 0
      };
    } else {
      dailyMap[key].bagsOpened += bags;
      dailyMap[key].totalKgOpened += kg;
    }
  });

  dayRemainLogs.forEach(r => {
    const stock = (r.fishStock && r.fishStock.trim() && r.fishStock !== "—") ? r.fishStock.trim() : "General Stock";
    const brand = r.brand || "Standard";
    const size = r.size || "4.0 mm";
    const key = `${stock}__${brand}__${size}`;
    const rem = Number(r.remainingKg) || 0;

    if (!dailyMap[key]) {
      dailyMap[key] = {
        fishStock: stock,
        brand,
        size,
        bagsOpened: 0,
        kgPerBag: 15,
        totalKgOpened: 0,
        remainingKg: rem
      };
    } else {
      dailyMap[key].remainingKg = rem;
    }
  });

  Object.values(dailyMap).forEach(item => {
    if (item.remainingKg === 0) {
      const match = (remainLogs || [])
        .filter(rl => (rl.fishStock === item.fishStock || (!rl.fishStock && item.fishStock === "General Stock")) && rl.brand === item.brand && rl.size === item.size && rl.date <= dailyDateStr)
        .sort((a,b) => b.date.localeCompare(a.date))[0];
      if (match) {
        item.remainingKg = Number(match.remainingKg) || 0;
      }
    }
  });

  const dailyGroupedRows = Object.values(dailyMap).sort((a,b) => {
    if (a.fishStock !== b.fishStock) return a.fishStock.localeCompare(b.fishStock);
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    return a.size.localeCompare(b.size);
  });

  const allDailyStocks = [...new Set([
    ...dailyGroupedRows.map(r => r.fishStock),
    ...ponds.filter(p => p.species && p.species !== "—").map(p => `${p.species}${p.stockingDate ? ` (${p.stockingDate})` : ""}`)
  ])].filter(Boolean);
  const allDailyBrands = [...new Set([
    ...dailyGroupedRows.map(r => r.brand),
    ...FEED_BRANDS
  ])];
  const allDailySizes = [...new Set([
    ...dailyGroupedRows.map(r => r.size),
    ...FEED_SIZES
  ])];

  const filteredDailyRows = dailyGroupedRows.filter(r => {
    if (fDailyStock !== "All" && r.fishStock !== fDailyStock) return false;
    if (fDailyBrand !== "All" && r.brand !== fDailyBrand) return false;
  const fmtFishStock = (stock: string) => {
    if (!stock || stock === "—" || stock === "General Stock") return stock || "General Stock";
    const match = stock.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      const species = match[1].trim();
      const rawDate = match[2].trim();
      const formatted = fmtStockingDate(rawDate);
      return `${species} (${formatted !== "—" ? formatted : rawDate})`;
    }
    const formatted = fmtStockingDate(stock);
    if (formatted !== "—" && formatted !== stock && !formatted.includes("NaN")) {
      return formatted;
    }
    return stock;
  };

  const filteredDailyRows = dailyGroupedRows.filter(r => {
    if (fDailyStock !== "All" && r.fishStock !== fDailyStock) return false;
    if (fDailyBrand !== "All" && r.brand !== fDailyBrand) return false;
    if (fDailySize !== "All" && r.size !== fDailySize) return false;
    if (dailySearch && !r.fishStock.toLowerCase().includes(dailySearch.toLowerCase()) && !fmtFishStock(r.fishStock).toLowerCase().includes(dailySearch.toLowerCase()) && !r.brand.toLowerCase().includes(dailySearch.toLowerCase())) return false;
    return true;
  });

  const dayTotalBags = filteredDailyRows.reduce((s, r) => s + r.bagsOpened, 0);
  const dayTotalKgOpened = filteredDailyRows.reduce((s, r) => s + r.totalKgOpened, 0);
  const dayTotalRemainingKg = filteredDailyRows.reduce((s, r) => s + r.remainingKg, 0);
  const dayTotalStocksCount = new Set(filteredDailyRows.map(r => r.fishStock)).size;

  return(
    <div className="p-4 sm:p-6 space-y-5 w-full">
      <div className="sticky top-0 z-10 bg-[#f5f7fa] -mx-4 -mt-4 px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feed Stock</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage purchased feed stock, track daily bags opened, and view usage.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={()=>{setShowCalc(true);setCalcStep("input");setShowCustomize(false);}} className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-1.5 bg-white"><Layers size={12}/> Feed Requirement Calculator</button>
          <PBtn onClick={()=>setShowBuy(true)} sm><Plus size={13}/> Add Purchased Feed</PBtn>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Bags" value={String(totalBagsInStock)} sub={`${totalBagsOpened} opened · ${totalBagsPurchased} purchased`} icon={Package} hi/>
        <StatCard label="Total Kg" value={`${totalKgInStock}kg`} sub="in stock" icon={Layers}/>
      </div>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {([
          ["stock", "Stock"],
          ["daily_bags", "Daily Bags Opened"],
          ["purchases", "Purchase History"]
        ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === t ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-1 mb-3">
        {tab === "stock"
          ? "Current active feed stock and inventory levels."
          : tab === "daily_bags"
          ? "Daily feed bags opened and remaining kg tracked per fish stock, brand, and pellet."
          : "Complete record of all feed purchases."}
      </p>
      {tab==="stock"&&(
        <><div className="flex flex-wrap gap-2 items-center">
          {([["Brand",fBrand,setFBrand,["All",...brands]],["Size",fSize,setFSize,["All",...sizes]]] as any[]).map(([label,val,set,opts]:any)=>(
            <div key={label} className="flex items-center gap-1.5"><span className="text-xs text-slate-400">{label}:</span><select value={val} onChange={e=>set(e.target.value)} className={`${SC} py-1.5 text-xs w-auto`}>{opts.map((o:string)=><option key={o}>{o}</option>)}</select></div>
          ))}
        </div>
        {/* Desktop table */}
        <Card className="hidden md:block"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 text-[11px] text-slate-400 w-10 sticky left-0 z-20 bg-slate-50">#</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 border-r border-slate-200 whitespace-nowrap cursor-pointer select-none hover:text-green-600" onClick={()=>toggle("brand")}><div className="flex items-center gap-1">Brand<div className="flex flex-col -space-y-0.5"><ChevronUp size={9} className={sf==="brand"&&sd==="asc"?"text-green-600":"text-slate-200"}/><ChevronDown size={9} className={sf==="brand"&&sd==="desc"?"text-green-600":"text-slate-200"}/></div></div></th>
            <SH label="Size" field="size" sf={sf} sd={sd} onSort={toggle}/>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider whitespace-nowrap">Bags in Stock</th>
            <SH label="Kg Per Bag" field="weightPerBag" sf={sf} sd={sd} onSort={toggle}/>
            <SH label="Total Kg" field="totalKg" sf={sf} sd={sd} onSort={toggle}/>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {(()=>{
              const merged=Object.values(filtInv.reduce<Record<string,FeedItem&{_b:number}>>((acc,item)=>{
                const key=`${item.brand}|${item.size}|${item.weightPerBag}`;
                if(!acc[key])acc[key]={...item,_b:0};
                acc[key]._b+=item.bags;
                acc[key].bags=acc[key]._b;
                return acc;
              },{}));
              return merged.length===0
                ?[<tr key="empty"><td colSpan={6} className="text-center text-xs text-slate-400 py-8">No items match filters</td></tr>]
                :merged.map((row,i)=>{
                  const opened=bagLogs.filter(b=>b.brand===row.brand&&b.size===row.size).reduce((s,b)=>s+b.bagsOpened,0);
                  const inStock=Math.max(0,row.bags-opened);
                  return(
                    <tr key={row.id+i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 text-slate-300 text-xs font-mono sticky left-0 z-10 bg-white">{i+1}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 sticky left-10 z-10 bg-white border-r border-slate-100">{row.brand}</td>
                      <td className="px-4 py-3.5"><Bdg label={row.size} color="blue"/></td>
                      <td className="px-4 py-3.5"><span className={`font-bold ${inStock===0?"text-red-500":inStock<=3?"text-amber-500":"text-green-700"}`}>{inStock}</span></td>
                      <td className="px-4 py-3.5 text-slate-500">{row.weightPerBag}kg</td>
                      <td className="px-4 py-3.5 font-semibold">{inStock * row.weightPerBag}kg</td>
                    </tr>
                  );
                });
            })()}
          </tbody>
        </table></div></Card>
        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {(()=>{
            const merged=Object.values(filtInv.reduce<Record<string,FeedItem&{_b:number}>>((acc,item)=>{
              const key=`${item.brand}|${item.size}|${item.weightPerBag}`;
              if(!acc[key])acc[key]={...item,_b:0};
              acc[key]._b+=item.bags;
              acc[key].bags=acc[key]._b;
              return acc;
            },{}));
            if(merged.length===0)return[<p key="empty" className="text-center text-xs text-slate-400 py-8">No items match filters</p>];
            return merged.map((row,i)=>{
              const opened=bagLogs.filter(b=>b.brand===row.brand&&b.size===row.size).reduce((s,b)=>s+b.bagsOpened,0);
              const inStock=Math.max(0,row.bags-opened);
              return(
                <div key={row.id+i} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-slate-300 font-mono w-5 shrink-0">{i+1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 leading-tight">{row.size}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{row.brand} · {row.weightPerBag}kg/bag</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${inStock===0?"text-red-500":inStock<=3?"text-amber-500":"text-green-700"}`}>{inStock} bags</span>
                  </div>
                </div>
              );
            });
          })()}
        </div></>
      )}
      {tab==="daily_bags"&&(
        <div className="space-y-4">
          {/* Top Date bar & filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button onClick={()=>shiftDailyDate(-1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors" title="Previous Day"><ChevronLeft size={16}/></button>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-green-600"/>
                <input type="date" value={dailyDate} onChange={e=>{setDailyDate(e.target.value);setDailyPage(1);}} className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-green-500"/>
              </div>
              <button onClick={()=>shiftDailyDate(1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors" title="Next Day"><ChevronRight size={16}/></button>
              {dailyDate!==TODAY&&(
                <button onClick={()=>{setDailyDate(TODAY);setDailyPage(1);}} className="px-2.5 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">Today</button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={()=>downloadCSV(`daily-feed-bags-${dailyDate}.csv`,["#","Fish Stock","Brand","Pellet Size","Bags Opened","Kg/Bag","Total Kg Opened","Remaining Kg in Bag"],dailyGroupedRows.map((r,i)=>[i+1,fmtFishStock(r.fishStock),r.brand,r.size,r.bagsOpened,r.kgPerBag,r.totalKgOpened,r.remainingKg]))} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:border-green-400 hover:text-green-600 transition-colors"><Download size={12}/> CSV</button>
              <button onClick={()=>openPrintWindow(`Daily Feed Bags Report — ${fmtStockingDate(dailyDate)}`,["#","Fish Stock","Brand","Pellet Size","Bags Opened","Kg/Bag","Total Kg Opened","Remaining Kg in Bag"],dailyGroupedRows.map((r,i)=>[i+1,fmtFishStock(r.fishStock),r.brand,r.size,`${r.bagsOpened} bag${r.bagsOpened!==1?"s":""}`,`${r.kgPerBag}kg`,`${r.totalKgOpened}kg`,`${r.remainingKg}kg`]),`Daily Feed Bags Opened & Remaining Log for ${fmtStockingDate(dailyDate)}`)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:border-green-400 hover:text-green-600 transition-colors"><FileText size={12}/> Print</button>
            </div>
          </div>

          {/* KPI Stat Cards for that Day */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Bags Opened" value={`${dayTotalBags} bag${dayTotalBags!==1?"s":""}`} sub={`On ${fmtStockingDate(dailyDate)}`} icon={Package} hi/>
            <StatCard label="Total Feed Opened" value={`${dayTotalKgOpened}kg`} sub="Opened feed weight" icon={Layers}/>
            <StatCard label="Remaining In Opened Bags" value={`${dayTotalRemainingKg}kg`} sub="Across active stocks" icon={CheckCircle}/>
            <StatCard label="Fish Stocks Fed" value={String(dayTotalStocksCount)} sub="Stocks active on date" icon={Fish}/>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"/>
              <input value={dailySearch} onChange={e=>{setDailySearch(e.target.value);setDailyPage(1);}} placeholder="Search stock or brand…" className={`${IC} pl-8 w-44`}/>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Stock:</span>
              <select value={fDailyStock} onChange={e=>{setFDailyStock(e.target.value);setDailyPage(1);}} className={`${SC} py-1.5 text-xs w-auto`}>
                <option value="All">All Stocks</option>
                {allDailyStocks.map(s=><option key={s} value={s}>{fmtFishStock(s)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Brand:</span>
              <select value={fDailyBrand} onChange={e=>{setFDailyBrand(e.target.value);setDailyPage(1);}} className={`${SC} py-1.5 text-xs w-auto`}>
                <option value="All">All Brands</option>
                {allDailyBrands.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Pellet:</span>
              <select value={fDailySize} onChange={e=>{setFDailySize(e.target.value);setDailyPage(1);}} className={`${SC} py-1.5 text-xs w-auto`}>
                <option value="All">All Sizes</option>
                {allDailySizes.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Feed Bags Opened & Remaining Log</p>
                <p className="text-xs text-slate-400 mt-0.5">Feed bags opened for each fish stock, brand, pellet size, and the remaining kg on {fmtStockingDate(dailyDate)}.</p>
              </div>
              <span className="text-xs text-slate-400">{filteredDailyRows.length} record{filteredDailyRows.length!==1?"s":""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-[11px] text-slate-400 w-10 sticky left-0 z-20 bg-slate-50">#</th>
                    <th className="text-left px-4 py-3 text-[11px] text-slate-600 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 border-r border-slate-200">Fish Stock</th>
                    <th className="text-left px-4 py-3 text-[11px] text-slate-600 uppercase tracking-wider">Feed Brand</th>
                    <th className="text-left px-4 py-3 text-[11px] text-slate-600 uppercase tracking-wider">Pellet Size</th>
                    <th className="text-right px-4 py-3 text-[11px] text-slate-600 uppercase tracking-wider">Bags Opened</th>
                    <th className="text-right px-4 py-3 text-[11px] text-slate-600 uppercase tracking-wider">Kg / Bag</th>
                    <th className="text-right px-4 py-3 text-[11px] text-slate-600 uppercase tracking-wider">Total Kg Opened</th>
                    <th className="text-right px-4 py-3 text-[11px] text-slate-600 uppercase tracking-wider">Remaining (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredDailyRows.length===0?(
                    <tr><td colSpan={8} className="text-center text-xs text-slate-400 py-10">No feed bags opened or recorded for {fmtStockingDate(dailyDate)}. Select another date or open bags from Feeding Records.</td></tr>
                  ):filteredDailyRows.slice((dailyPage-1)*PER_PAGE, dailyPage*PER_PAGE).map((r,i)=>(
                    <tr key={`${r.fishStock}__${r.brand}__${r.size}__${i}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 text-slate-300 text-xs font-mono sticky left-0 z-10 bg-white">{(dailyPage-1)*PER_PAGE+i+1}</td>
                      <td className="px-4 py-3.5 sticky left-10 z-10 bg-white border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"/>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{fmtFishStock(r.fishStock)}</p>
                            <p className="text-[10px] text-slate-400">Tied Stock</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">{r.brand}</td>
                      <td className="px-4 py-3.5"><Bdg label={r.size} color="blue"/></td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">{r.bagsOpened} bag{r.bagsOpened!==1?"s":""}</td>
                      <td className="px-4 py-3.5 text-right text-slate-500">{r.kgPerBag}kg</td>
                      <td className="px-4 py-3.5 text-right font-bold text-green-700 font-['Barlow_Condensed',sans-serif] text-base">{r.totalKgOpened}kg</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-['Barlow_Condensed',sans-serif] ${r.remainingKg>0?"bg-amber-100 text-amber-900 border border-amber-200":"bg-slate-100 text-slate-500"}`}>
                          {r.remainingKg}kg
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {filteredDailyRows.length>0&&(
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                      <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-500">Daily Grand Total:</td>
                      <td className="px-4 py-3 text-right text-slate-900">{dayTotalBags} bags</td>
                      <td className="px-4 py-3 text-right text-slate-400">—</td>
                      <td className="px-4 py-3 text-right text-green-700 text-base font-['Barlow_Condensed',sans-serif]">{dayTotalKgOpened}kg</td>
                      <td className="px-4 py-3 text-right text-amber-800 text-base font-['Barlow_Condensed',sans-serif]">{dayTotalRemainingKg}kg</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-2.5">
            {filteredDailyRows.length===0?(
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400">
                No feed bags opened or recorded for {fmtStockingDate(dailyDate)}.
              </div>
            ):filteredDailyRows.map((r,i)=>(
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fish Stock</span>
                    <p className="text-sm font-bold text-slate-900">{fmtFishStock(r.fishStock)}</p>
                  </div>
                  <Bdg label={r.size} color="blue"/>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2">
                  <div><span className="text-slate-400">Brand: </span><strong className="text-slate-700">{r.brand}</strong></div>
                  <div><span className="text-slate-400">Bags Opened: </span><strong className="text-slate-900">{r.bagsOpened} bags</strong></div>
                  <div><span className="text-slate-400">Total Opened: </span><strong className="text-green-700 font-bold">{r.totalKgOpened}kg</strong></div>
                  <div><span className="text-slate-400">Remaining: </span><strong className="text-amber-800 font-bold">{r.remainingKg}kg</strong></div>
                </div>
              </div>
            ))}
          </div>

          <Pagination total={filteredDailyRows.length} page={dailyPage} perPage={PER_PAGE} onPage={setDailyPage}/>
        </div>
      )}
      {tab==="purchases"&&(
        <Card>
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Feed Purchase History</p>
              <div className="flex items-center gap-1.5"><span className="text-xs text-slate-400">Year:</span><select value={pFYear} onChange={e=>{setPFYear(e.target.value);setPurchasePage(1);}} className={`${SC} py-1 text-xs w-auto`}><option>All</option>{purchaseYears.map(y=><option key={y}>{y}</option>)}</select></div>
              <div className="flex items-center gap-1.5"><span className="text-xs text-slate-400">Month:</span><select value={pFMonth} onChange={e=>{setPFMonth(e.target.value);setPurchasePage(1);}} className={`${SC} py-1 text-xs w-auto`}><option>All</option>{purchaseMonths.map(m=><option key={m}>{m}</option>)}</select></div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-slate-400">{filtPurchases.length} purchase{filtPurchases.length!==1?"s":""}</p>
              <button onClick={()=>downloadCSV("feed-purchases.csv",["#","Purchased","Brand","Size","Bags","Kg/Bag","Total Kg","Cost/Bag","Total Value","Supplier"],filtPurchases.map((r,i)=>[i+1,r.purchaseDate,r.brand,r.size,r.bags,r.weightPerBag,r.totalKg,r.costPerBag,r.bags*r.costPerBag,r.supplier||""]))} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-500 text-[11px] font-semibold hover:border-green-400 hover:text-green-600 transition-colors"><Download size={11}/> CSV</button>
              <button onClick={()=>openPrintWindow("Feed Purchase History",["#","Purchased","Brand","Size","Bags","Kg/Bag","Total Kg","Cost/Bag","Total Value","Supplier"],filtPurchases.map((r,i)=>[i+1,r.purchaseDate,r.brand,r.size,r.bags,`${r.weightPerBag}kg`,`${r.totalKg}kg`,fmt(r.costPerBag),fmt(r.bags*r.costPerBag),r.supplier||"—"]),"All purchased feed stock")} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-500 text-[11px] font-semibold hover:border-green-400 hover:text-green-600 transition-colors"><FileText size={11}/> PDF</button>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-[11px] text-slate-400 w-10 sticky left-0 z-20 bg-slate-50">#</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 border-r border-slate-200 whitespace-nowrap">Purchased</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Brand</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Size</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Bags</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Wt/Bag</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Total Kg</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Cost/Bag</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Total Value</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Supplier</th>
              <th className="px-4 py-3 w-8"/>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtPurchases.length===0&&<tr><td colSpan={11} className="text-center text-xs text-slate-400 py-8">No purchases recorded yet</td></tr>}
              {pagedPurchases.map((row,i)=>(
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 text-slate-300 text-xs font-mono text-center sticky left-0 z-10 bg-white">{i+1}</td>
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap sticky left-10 z-10 bg-white border-r border-slate-100">{row.purchaseDate}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-900">{row.brand}</td>
                  <td className="px-4 py-3.5"><Bdg label={row.size} color="blue"/></td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{row.bags}</td>
                  <td className="px-4 py-3.5 text-slate-500">{row.weightPerBag}kg</td>
                  <td className="px-4 py-3.5 text-slate-600">{row.totalKg}kg</td>
                  <td className="px-4 py-3.5 text-slate-500">{fmt(row.costPerBag)}</td>
                  <td className="px-4 py-3.5 font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">{fmt(row.bags*row.costPerBag)}</td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">{row.supplier||"—"}</td>
                  <td className="px-4 py-3.5">{isPurchaseEditable(row.purchaseDate)?<button onClick={()=>setEditPurchase({...row})} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors" title="Edit"><Pencil size={13}/></button>:<button onClick={()=>alert("This record can only be edited by an Administrator or Manager after 24 hours.")} className="p-1.5 rounded-lg text-slate-200 cursor-not-allowed" title="Locked after 24 hours"><Lock size={13}/></button>}</td>
                </tr>
              ))}
            </tbody>
            {filtPurchases.length>0&&(
              <tfoot><tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={8} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Spend</td>
                <td className="px-4 py-3 font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">{fmt(filtPurchases.reduce((s,f)=>s+f.bags*f.costPerBag,0))}</td>
                <td/>
              </tr></tfoot>
            )}
          </table></div>
          <div className="px-4 pb-2"><Pagination total={filtPurchases.length} page={purchasePage} perPage={PER_PAGE} onPage={setPurchasePage}/></div>
        </Card>
      )}
      {editPurchase&&<Modal title="Edit Purchase" onClose={()=>setEditPurchase(null)} wide>
        <div className="grid grid-cols-2 gap-3">
          <F label="Feed Brand"><SearchableSelect value={editPurchase.brand} onChange={v=>setEditPurchase(p=>p?{...p,brand:v}:p)} options={FEED_BRANDS}/></F>
          <F label="Pellet Size"><select value={editPurchase.size} onChange={e=>setEditPurchase(p=>p?{...p,size:e.target.value}:p)} className={SC}>{FEED_SIZES.map(s=><option key={s}>{s}</option>)}</select></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Bags Purchased"><NumInput value={editPurchase.bags} onChange={v=>{const n=Number(v)||0;setEditPurchase(p=>p?{...p,bags:n,totalKg:n*p.weightPerBag}:p);}} className={IC} allowDecimal={false}/></F>
          <F label="kg Per Bag"><NumInput value={editPurchase.weightPerBag} onChange={v=>{const n=Number(v)||0;setEditPurchase(p=>p?{...p,weightPerBag:n,totalKg:p.bags*n}:p);}} className={IC}/></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label={`Unit Price (${cs})`}><NumInput value={editPurchase.costPerBag} onChange={v=>setEditPurchase(p=>p?{...p,costPerBag:Number(v)||0}:p)} className={IC}/></F>
          <F label="Total Cost"><p className="px-3 py-2 text-sm font-bold text-green-700">{fmt(editPurchase.bags*editPurchase.costPerBag)}</p></F>
        </div>
        <F label="Supplier"><input value={editPurchase.supplier||""} onChange={e=>setEditPurchase(p=>p?{...p,supplier:e.target.value}:p)} className={IC} placeholder="Supplier name"/></F>
        <F label="Purchase Date (e.g. Jun 10)"><input value={editPurchase.purchaseDate||""} onChange={e=>setEditPurchase(p=>p?{...p,purchaseDate:e.target.value}:p)} className={IC} placeholder="Jun 10"/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={()=>{if(editPurchase&&onEditInv){onEditInv(editPurchase);setEditPurchase(null);}}}><CheckCircle size={14}/> Save Changes</PBtn><button onClick={()=>setEditPurchase(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {clearConfirmId&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0"><Trash2 size={18} className="text-red-600"/></div>
              <div><h3 className="font-bold text-slate-900 text-base">Clear Stock?</h3><p className="text-xs text-slate-500 mt-0.5 font-mono">{clearConfirmLabel}</p></div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">This action marks the selected feed stock as fully consumed and removes it from the active inventory. The record will remain available in the <strong>Feed Purchase History</strong> for future reference and reporting.</p>
            <div className="flex gap-3">
              <button onClick={()=>setClearConfirmId(null)} className="flex-1 py-2.5 text-sm text-slate-600 font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={()=>{onDelete(clearConfirmId!);setClearConfirmId(null);}} className="flex-1 py-2.5 text-sm text-white font-semibold bg-red-500 hover:bg-red-600 rounded-xl transition-colors">Clear Stock</button>
            </div>
          </div>
        </div>
      )}
      {showCalc&&(()=>{
        const fish=Number(calcFish)||0;
        const calcRows=Object.entries(calcStandards).map(([size,std])=>{
          const bags=(fish/1000)*std.bagsPerK;
          const totalKg=bags*std.kgPerBag;
          const ppb=Number(calcPrices[size])||0;
          const cost=ppb>0?bags*ppb:undefined;
          return{size,bags,totalKg,ppb,cost};
        });
        const totalBagsR=calcRows.reduce((s,r)=>s+r.bags,0);
        const totalKgR=calcRows.reduce((s,r)=>s+r.totalKg,0);
        const hasCost=calcRows.some(r=>r.cost!==undefined);
        const totalCost=hasCost?calcRows.reduce((s,r)=>s+(r.cost||0),0):undefined;
        const closeCalc=()=>{setShowCalc(false);setCalcStep("input");setShowCustomize(false);};
        const exportCSV=()=>{
          const headers=["Number of Fish","Calculation Date","Pellet Size","Bags Required","Total Feed (kg)",...(hasCost?["Price per Bag ({cs})","Estimated Cost ({cs})"]:[])];
          const rows=calcRows.map(r=>[String(fish),new Date().toLocaleDateString(),r.size,r.bags.toFixed(1),r.totalKg.toFixed(1),...(hasCost?[r.ppb>0?String(r.ppb):"",r.cost!==undefined?r.cost.toFixed(0):""]:[])]);
          rows.push([String(fish),new Date().toLocaleDateString(),"TOTAL",totalBagsR.toFixed(1),totalKgR.toFixed(0),...(hasCost?["",totalCost!==undefined?totalCost.toFixed(0):""]:[])]);
          downloadCSV("feed-requirement-calculator.csv",headers,rows);
        };
        const exportPDF=()=>{
          const w=window.open("","_blank");
          if(!w)return;
          const html=`<!DOCTYPE html><html><head><title>Feed Requirement Calculator</title><style>body{font-family:sans-serif;padding:24px;color:#1e293b}h1{font-size:20px;font-weight:700;margin-bottom:4px}p.sub{font-size:12px;color:#64748b;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0}td{padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}.tf td{background:#f8fafc;font-weight:700;border-top:2px solid #e2e8f0}.sum{display:flex;gap:16px;margin-bottom:20px}.sc{flex:1;background:#f8fafc;border-radius:8px;padding:12px;text-align:center}.sl{font-size:10px;text-transform:uppercase;color:#64748b;margin-bottom:4px}.sv{font-size:22px;font-weight:700}@media print{body{padding:0}}</style></head><body><h1>Feed Requirement Calculator</h1><p class="sub">Number of Fish: <strong>${fish.toLocaleString()}</strong> &nbsp;&middot;&nbsp; Date: ${new Date().toLocaleDateString()}</p><div class="sum"><div class="sc"><p class="sl">Total Bags Required</p><p class="sv">${totalBagsR.toFixed(1)}</p></div><div class="sc"><p class="sl">Total Feed Required</p><p class="sv">${totalKgR.toFixed(0)} kg</p></div>${totalCost!==undefined?`<div class="sc"><p class="sl">Grand Total Cost</p><p class="sv">&#8358;${totalCost.toLocaleString()}</p></div>`:""}</div><table><thead><tr><th>Pellet Size</th><th>Bags Required</th><th>Total Feed (kg)</th>${hasCost?"<th>Price per Bag (&#8358;)</th><th>Estimated Cost (&#8358;)</th>":""}</tr></thead><tbody>${calcRows.map(r=>`<tr><td>${r.size}</td><td>${r.bags.toFixed(1)}</td><td>${r.totalKg.toFixed(1)}</td>${hasCost?`<td>${r.ppb>0?"&#8358;"+r.ppb.toLocaleString():"&mdash;"}</td><td>${r.cost!==undefined?"&#8358;"+r.cost.toLocaleString():"&mdash;"}</td>`:""}</tr>`).join("")}<tr class="tf"><td><strong>Total</strong></td><td><strong>${totalBagsR.toFixed(1)}</strong></td><td><strong>${totalKgR.toFixed(0)} kg</strong></td>${hasCost?`<td></td><td><strong>&#8358;${totalCost?.toLocaleString()}</strong></td>`:""}</tr></tbody></table></body></html>`;
          w.document.write(html);
          w.document.close();
          setTimeout(()=>w.print(),400);
        };
        return(
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-bold text-slate-900 text-base font-['Barlow_Condensed',sans-serif]">{showCustomize?"Customize Calculator":"Feed Requirement Calculator"}</h2>
                  {!showCustomize&&<p className="text-xs text-slate-400 mt-0.5">{calcStep==="input"?"Estimate bags, feed quantity, and cost for your fish stock":"Results based on "+fish.toLocaleString()+" fish"}</p>}
                </div>
                <button onClick={closeCalc} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 text-lg leading-none">×</button>
              </div>
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {showCustomize?(
                  <>
                    <p className="text-xs text-slate-500">Adjust default feeding standards. Changes persist until reset.</p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider text-left">Pellet Size</th>
                          <th className="px-4 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider text-left">Bags / 1,000 Fish</th>
                          <th className="px-4 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider text-left">KG per Bag</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {Object.entries(calcStandards).map(([size,std])=>(
                            <tr key={size}>
                              <td className="px-4 py-2.5"><Bdg label={size} color="blue"/></td>
                              <td className="px-4 py-2.5"><input type="number" value={customEdit[size]?.bagsPerK??String(std.bagsPerK)} onChange={e=>setCustomEdit(p=>({...p,[size]:{bagsPerK:e.target.value,kgPerBag:p[size]?.kgPerBag??String(std.kgPerBag)}}))} className={`${IC} w-24`}/></td>
                              <td className="px-4 py-2.5"><input type="number" value={customEdit[size]?.kgPerBag??String(std.kgPerBag)} onChange={e=>setCustomEdit(p=>({...p,[size]:{kgPerBag:e.target.value,bagsPerK:p[size]?.bagsPerK??String(std.bagsPerK)}}))} className={`${IC} w-24`}/></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ):calcStep==="input"?(
                  <>
                    <F label="Number of Fish"><input type="number" value={calcFish} onChange={e=>setCalcFish(e.target.value)} className={IC} placeholder="e.g. 5000"/></F>
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs font-semibold text-slate-600 mb-3">Feed Cost <span className="font-normal text-slate-400">(Optional)</span></p>
                      <p className="text-xs text-slate-400 mb-3">Enter the price per bag for each pellet size to include cost estimates.</p>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-4 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider text-left">Pellet Size</th>
                            <th className="px-4 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider text-left">Price per Bag ({cs})</th>
                          </tr></thead>
                          <tbody className="divide-y divide-slate-50">
                            {Object.keys(calcStandards).map(size=>(
                              <tr key={size}>
                                <td className="px-4 py-2.5"><Bdg label={size} color="blue"/></td>
                                <td className="px-4 py-2.5"><input type="number" value={calcPrices[size]||""} onChange={e=>setCalcPrices(p=>({...p,[size]:e.target.value}))} className={`${IC} w-40`} placeholder="Optional"/></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ):(
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-green-600 uppercase tracking-wider mb-0.5">Total Bags Required</p>
                        <p className="text-2xl font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">{totalBagsR.toFixed(1)}</p>
                        <p className="text-[10px] text-green-500">bags</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-blue-600 uppercase tracking-wider mb-0.5">Total Feed Required</p>
                        <p className="text-2xl font-bold text-blue-700 font-['Barlow_Condensed',sans-serif]">{totalKgR.toFixed(0)}</p>
                        <p className="text-[10px] text-blue-500">kg</p>
                      </div>
                    </div>
                    {totalCost!==undefined&&(
                      <div className="bg-amber-50 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-amber-600 uppercase tracking-wider mb-0.5">Grand Total Estimated Cost</p>
                        <p className="text-2xl font-bold text-amber-700 font-['Barlow_Condensed',sans-serif] break-all">{cs}{totalCost.toLocaleString()}</p>
                      </div>
                    )}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      {hasCost&&<p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-600">Estimated Cost Breakdown</p>}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" style={{minWidth: hasCost?"560px":"360px"}}>
                          <thead><tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-4 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider text-left sticky left-0 bg-slate-50 z-10">Pellet Size</th>
                            <th className="px-4 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider text-right">Bags Required</th>
                            <th className="px-4 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider text-right">Total Feed (kg)</th>
                            {hasCost&&<th className="px-4 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider text-right">Price per Bag</th>}
                            {hasCost&&<th className="px-4 py-2.5 text-[11px] text-slate-500 uppercase tracking-wider text-right">Total Estimated Cost</th>}
                          </tr></thead>
                          <tbody className="divide-y divide-slate-50">
                            {calcRows.map(r=>(
                              <tr key={r.size} className="hover:bg-slate-50">
                                <td className="px-4 py-2.5 sticky left-0 bg-white z-10"><Bdg label={r.size} color="blue"/></td>
                                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{r.bags.toFixed(1)}</td>
                                <td className="px-4 py-2.5 text-right text-slate-600">{r.totalKg.toFixed(1)} kg</td>
                                {hasCost&&<td className="px-4 py-2.5 text-right text-slate-500 text-xs whitespace-nowrap">{r.ppb>0?`${cs}${r.ppb.toLocaleString()}`:"—"}</td>}
                                {hasCost&&<td className="px-4 py-2.5 text-right font-semibold text-slate-800 whitespace-nowrap">{r.cost!==undefined?`${cs}${r.cost.toLocaleString()}`:"—"}</td>}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                              <td className="px-4 py-2.5 text-slate-700 sticky left-0 bg-slate-50 z-10">Total</td>
                              <td className="px-4 py-2.5 text-right text-slate-900">{totalBagsR.toFixed(1)}</td>
                              <td className="px-4 py-2.5 text-right text-slate-900">{totalKgR.toFixed(0)} kg</td>
                              {hasCost&&<td/>}
                              {hasCost&&<td className="px-4 py-2.5 text-right text-amber-700 whitespace-nowrap">{cs}{totalCost?.toLocaleString()}</td>}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">Calculated for <strong>{fish.toLocaleString()} fish</strong> · {new Date().toLocaleDateString()}</p>
                  </>
                )}
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0 flex-wrap">
                {showCustomize?(
                  <>
                    <button onClick={()=>{setCalcStandards(Object.fromEntries(Object.entries(DEFAULT_CALC_STANDARDS).map(([k,v])=>[k,{...v}])));setCustomEdit({});}} className="text-xs text-red-500 hover:underline">Reset to Default</button>
                    <div className="flex gap-2">
                      <button onClick={()=>{setCustomEdit({});setShowCustomize(false);}} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
                      <PBtn sm onClick={()=>{const updated:Record<string,{bagsPerK:number;kgPerBag:number}>={};Object.keys(calcStandards).forEach(size=>{const bpk=Number(customEdit[size]?.bagsPerK??calcStandards[size].bagsPerK);const kpb=Number(customEdit[size]?.kgPerBag??calcStandards[size].kgPerBag);updated[size]={bagsPerK:isNaN(bpk)?calcStandards[size].bagsPerK:bpk,kgPerBag:isNaN(kpb)?calcStandards[size].kgPerBag:kpb};});setCalcStandards(updated);setCustomEdit({});setShowCustomize(false);}}>Save Standards</PBtn>
                    </div>
                  </>
                ):calcStep==="input"?(
                  <>
                    <button onClick={()=>{setShowCustomize(true);setCustomEdit({});}} className="text-xs text-slate-500 hover:text-green-600 hover:underline flex items-center gap-1"><Layers size={12}/> Customize Calculator</button>
                    <div className="flex gap-2">
                      <button onClick={closeCalc} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
                      <PBtn sm onClick={()=>{if(!calcFish||Number(calcFish)<=0)return;setCalcStep("results");}}>Calculate Feed Requirement</PBtn>
                    </div>
                  </>
                ):(
                  <>
                    <div className="flex items-center gap-2">
                      <button onClick={exportCSV} className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"><Download size={12}/> CSV</button>
                      <button onClick={exportPDF} className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"><FileText size={12}/> PDF</button>
                    </div>
                    <button onClick={()=>{setCalcStep("input");}} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">← Recalculate</button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {showBuy&&<Modal title="Add Purchased Feed" onClose={()=>{setShowBuy(false);setBuyErr({});}} wide>
        <div className="grid grid-cols-2 gap-3">
          <div><F label="Purchase Date"><DateInput value={buyF.date} onChange={v=>{setBuyF(p=>({...p,date:v}));if(v)setBuyErr(p=>({...p,date:""}));}}/></F>{buyErr.date&&<p className="text-xs text-red-500 mt-1">{buyErr.date}</p>}</div>
          <F label="Feed Brand"><SearchableSelect value={buyF.brand} onChange={v=>setBuyF(p=>({...p,brand:v}))} options={FEED_BRANDS} placeholder="Select brand…"/></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Feed Size (Pallet)"><select value={buyF.size} onChange={e=>setBuyF(p=>({...p,size:e.target.value}))} className={SC}>{FEED_SIZES.map(s=><option key={s}>{s}</option>)}</select></F>
          <div><F label="Bags Purchased"><NumInput allowDecimal={false} value={buyF.bags} onChange={v=>{setBuyF(p=>({...p,bags:v}));if(v&&Number(v)>0)setBuyErr(p=>({...p,bags:""}));}} className={`${SC}${buyErr.bags?" border-red-400 focus:ring-red-200":""}`} placeholder="0"/></F>{buyErr.bags&&<p className="text-xs text-red-500 mt-1">{buyErr.bags}</p>}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Weight Per Bag (kg)"><NumInput value={buyF.wpb} onChange={v=>setBuyF(p=>({...p,wpb:v}))} className={IC}/></F>
          <div><F label="Cost per Bag"><NumInput value={buyF.cpb} onChange={v=>{setBuyF(p=>({...p,cpb:v}));if(v&&Number(v)>0)setBuyErr(p=>({...p,cpb:""}));}} className={`${IC}${buyErr.cpb?" border-red-400 focus:ring-red-200":""}`} placeholder="0"/></F>{buyErr.cpb&&<p className="text-xs text-red-500 mt-1">{buyErr.cpb}</p>}</div>
        </div>
        <F label="Supplier"><input value={buyF.supplier} onChange={e=>setBuyF(p=>({...p,supplier:e.target.value}))} className={IC} placeholder="Supplier name"/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleBuy}><Plus size={14}/> Save Purchase</PBtn><button onClick={()=>{setShowBuy(false);setBuyErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
    </div>
  );
}
