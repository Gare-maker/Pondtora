import React, { useState, useRef, useEffect } from "react";
import {
  Fish, Plus, CheckCircle, X, ArrowRightLeft, Layers,
  Droplets, Trash2, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Eye, Download, FileText, Pencil,
  MoreVertical, TrendingUp, TrendingDown, Search, History
} from "lucide-react";
import type { Pond, Expense, MortalityEntry, FeedingRecord, StockEvent, TreatmentRecord, BagOpenLog, FeedRemainingLog, FeedItem } from "../types";
import { EXPENSE_CATS, POND_TYPES, POND_SPECIES, MORT_CAUSES, TODAY, fmt, uid, toMon, toYr, downloadCSV, openPrintWindow, fmtStockingDate } from "../data";
import { Card, Bdg, PBtn, Pagination, PER_PAGE, StatCard, Modal, F, IC, SC, SH, useSort, DateFilter, NumInput } from "../shared";

/* ─── Pond Detail (separate component so hooks are unconditional) */
function PondDetail({pond,mortality,onAddMortality,onAddCost,feedingRecords,onBack,onClosePond,onRestockPond,ponds,stockEvents,onTransfer,onNurseryTransfer,treatments,onAddTreatment,onEditFish,onSetMaxKg,inventory=[]}:{pond:Pond;mortality:MortalityEntry[];onAddMortality:(m:MortalityEntry,pondId:string)=>void;onAddCost:(e:Expense)=>void;feedingRecords:FeedingRecord[];onBack:()=>void;onClosePond:(id:string)=>void;onRestockPond:(id:string,data:{species:string;initialStock:number;stockingDate:string;stockMonth:string;supplier?:string})=>void;ponds:Pond[];stockEvents:StockEvent[];onTransfer:(fromId:string,toId:string,date:string)=>void;onNurseryTransfer:(fromId:string,toId:string,count:number,pct:number,date:string)=>void;treatments:TreatmentRecord[];onAddTreatment:(t:TreatmentRecord)=>void;onEditFish?:(pondId:string,u:{species:string;currentCount:number;stockingDate:string})=>void;onSetMaxKg:(pondId:string,size:string,maxKg:number)=>void;inventory?:FeedItem[];}){
  const invBrands=[...new Set(inventory.map(f=>f.brand))];
  const invSizesForBrand=(brand:string)=>[...new Set(inventory.filter(f=>f.brand===brand).map(f=>f.size))];
  const allInvSizes=[...new Set(inventory.map(f=>f.size))];
  const [showMort,setShowMort]=useState(false);
  const [showCost,setShowCost]=useState(false);
  const [showClose,setShowClose]=useState(false);
  const [showEditFish,setShowEditFish]=useState(false);
  const [editFishF,setEditFishF]=useState({species:pond.species==="—"?"Catfish":pond.species,count:String(pond.currentCount),stockingDate:pond.stockingDate});
  const [showUpdateQty,setShowUpdateQty]=useState(false);
  const [qtyMode,setQtyMode]=useState<"increase"|"reduce">("increase");
  const [qtyAmt,setQtyAmt]=useState("");
  const [showPondMenu,setShowPondMenu]=useState(false);
  const pondMenuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(pondMenuRef.current&&!pondMenuRef.current.contains(e.target as Node))setShowPondMenu(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const handleSaveEditFish=()=>{if(onEditFish)onEditFish(pond.id,{species:editFishF.species,currentCount:Number(editFishF.count)||pond.currentCount,stockingDate:editFishF.stockingDate||pond.stockingDate});setShowEditFish(false);};
  const handleUpdateQty=()=>{const n=Number(qtyAmt)||0;if(n<=0)return;const newCount=qtyMode==="increase"?pond.currentCount+n:Math.max(0,pond.currentCount-n);if(onEditFish)onEditFish(pond.id,{species:pond.species,currentCount:newCount,stockingDate:pond.stockingDate});setShowUpdateQty(false);setQtyAmt("");};
  const [showMaxKg,setShowMaxKg]=useState(false);
  const [maxKgSize,setMaxKgSize]=useState(allInvSizes[0]||"");
  const [maxKgValue,setMaxKgValue]=useState("");
  const [showRestock,setShowRestock]=useState(false);
  const [showTransfer,setShowTransfer]=useState(false);
  const [showNurseryTransfer,setShowNurseryTransfer]=useState(false);
  const [nurseryTF,setNurseryTF]=useState({toPond:"",count:"",pct:"100",date:TODAY});
  const [nurseryErr,setNurseryErr]=useState<Record<string,string>>({});
  const [showTreat,setShowTreat]=useState(false);
  const [pondTab,setPondTab]=useState<"feed"|"treatment">("feed");
  const [feedPage,setFeedPage]=useState(1);
  const [treatPage,setTreatPage]=useState(1);
  const [editFeedRec,setEditFeedRec]=useState<FeedingRecord|null>(null);
  const [editTreatRec,setEditTreatRec]=useState<TreatmentRecord|null>(null);
  const [treatF,setTreatF]=useState({date:TODAY,cause:"",medicine:"",remarks:""});
  const [transferF,setTransferF]=useState({toPond:"",date:TODAY,pct:"100",count:""});
  const [transferErr,setTransferErr]=useState<Record<string,string>>({});
  const emptyPonds=ponds.filter(p=>p.id!==pond.id&&p.status==="Empty");
  const [restockF,setRestockF]=useState({species:pond.species==="—"?"Catfish":pond.species,initialStock:"",stockingDate:"",supplier:""});
  const [restockErr,setRestockErr]=useState<Record<string,string>>({});
  const [mortF,setMortF]=useState({date:TODAY,count:"",cause:"Unknown",notes:""});
  const [mortErr,setMortErr]=useState<Record<string,string>>({});
  const [costF,setCostF]=useState({category:"Feed",amount:"",date:TODAY,desc:""});
  const [costErr,setCostErr]=useState<Record<string,string>>({});
  const [showMortHistory,setShowMortHistory]=useState(false);
  const [editMortEntry,setEditMortEntry]=useState<MortalityEntry|null>(null);
  const [fhMonth,setFhMonth]=useState("All");
  const pondTreatments=treatments.filter(t=>t.pondId===pond.id);
  const handleTreat=()=>{if(!treatF.medicine)return;onAddTreatment({id:uid(),pondId:pond.id,farmId:pond.farmId,date:treatF.date,cause:treatF.cause,medicine:treatF.medicine,remarks:treatF.remarks});setShowTreat(false);setTreatF({date:TODAY,cause:"",medicine:"",remarks:""});};
  const logs=mortality.filter(m=>m.pondId===pond.id);
  const dead=logs.reduce((s,m)=>s+m.count,0);
  const mRate=pond.initialStock>0?((dead/pond.initialStock)*100).toFixed(2):"0.00";
  const history=feedingRecords.filter(r=>r.pond===pond.name);
  const fhMonths=[...new Set(history.map(r=>r.month))];
  const filtHistory=fhMonth==="All"?history:history.filter(r=>r.month===fhMonth);
  const {sorted:sortedHist,sf:hSf,sd:hSd,toggle:hToggle}=useSort(filtHistory,"date");
  const feedSummary=history.reduce<{brand:string;size:string;total:number}[]>((acc,r)=>{const key=`${r.brand}__${r.size}`;const ex=acc.find(a=>`${a.brand}__${a.size}`===key);if(ex)ex.total+=r.total;else acc.push({brand:r.brand,size:r.size,total:r.total});return acc;},[]);
  const handleMort=()=>{
    const errs:Record<string,string>={};
    if(!mortF.count||Number(mortF.count)<=0)errs.count="Count is required";
    if(!mortF.date)errs.date="Date is required";
    if(Object.keys(errs).length){setMortErr(errs);return;}
    setMortErr({});
    onAddMortality({id:uid(),pondId:pond.id,date:mortF.date,count:Number(mortF.count),cause:mortF.cause,notes:mortF.notes},pond.id);
    setShowMort(false);setMortF({date:TODAY,count:"",cause:"Unknown",notes:""});
  };
  const handleCost=()=>{
    const errs:Record<string,string>={};
    if(!costF.amount||Number(costF.amount)<=0)errs.amount="Amount is required";
    if(!costF.date)errs.date="Date is required";
    if(Object.keys(errs).length){setCostErr(errs);return;}
    setCostErr({});
    const fishStock=pond.species!=="—"?`${pond.species} (${pond.stockingDate})`:undefined;
    onAddCost({id:uid(),category:costF.category,amount:Number(costF.amount),date:costF.date,month:toMon(costF.date),year:toYr(costF.date),pond:pond.name,fishStock,desc:costF.desc});
    setShowCost(false);setCostF({category:"Feed",amount:"",date:TODAY,desc:""});
  };
  const handleClose=()=>{onClosePond(pond.id);setShowClose(false);};
  const handleTransfer=()=>{
    if(!transferF.toPond){setTransferErr({toPond:"Please select a destination pond"});return;}
    setTransferErr({});
    const pct=Number(transferF.pct)||100;
    if(pct>=100){
      onTransfer(pond.id,transferF.toPond,transferF.date);
    } else {
      const count=transferF.count?Number(transferF.count):Math.round(pond.currentCount*(pct/100));
      onNurseryTransfer(pond.id,transferF.toPond,count,pct,transferF.date);
    }
    setShowTransfer(false);
    setTransferF({toPond:"",date:TODAY,pct:"100",count:""});
  };
  const handleRestock=()=>{
    const errs:Record<string,string>={};
    if(!restockF.initialStock||Number(restockF.initialStock)<=0)errs.initialStock="Initial stock count is required";
    if(!restockF.species)errs.species="Species is required";
    if(Object.keys(errs).length){setRestockErr(errs);return;}
    setRestockErr({});
    onRestockPond(pond.id,{species:restockF.species,initialStock:Number(restockF.initialStock),stockingDate:restockF.stockingDate||TODAY,stockMonth:restockF.stockingDate?toMon(restockF.stockingDate):toMon(TODAY),supplier:restockF.supplier});
    setShowRestock(false);
    setRestockF({species:"Catfish",initialStock:"",stockingDate:"",supplier:""});
  };
  return(
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px]">
      <div className="flex items-center gap-2 text-sm"><button onClick={onBack} className="text-green-600 hover:underline font-medium">← Ponds</button><span className="text-slate-300">/</span><span className="text-slate-700 font-semibold">{pond.name}</span></div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1"><h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{pond.name} — Operational Detail</h1><p className="text-xs text-slate-400">{pond.type} · {pond.species} · Stocked {fmtStockingDate(pond.stockingDate)}</p><div className="mt-1 flex items-center gap-1.5 flex-wrap"><Bdg label={pond.category||"Production"} color={pond.category==="Nursery"?"purple":"teal"}/><Bdg label={pond.status==="Active"?"Active":"Inactive"} color={pond.status==="Active"?"green":"gray"}/></div></div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile: only three-dot menu */}
          <div className="lg:hidden relative" ref={pondMenuRef}>
            <button onClick={()=>setShowPondMenu(p=>!p)} className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-green-400 hover:text-green-600 transition-colors"><MoreVertical size={17}/></button>
            {showPondMenu&&(
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[180px]">
                {pond.status==="Active"&&<>
                  <button onClick={()=>{setShowMort(true);setShowPondMenu(false);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><Plus size={13}/> Log Mortality</button>
                  <button onClick={()=>{setShowTreat(true);setShowPondMenu(false);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><Plus size={13}/> Log Treatment</button>
                  <button onClick={()=>{setShowUpdateQty(true);setShowPondMenu(false);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><Plus size={13}/> Update Quantity</button>
                  <button onClick={()=>{pond.category==="Nursery"?setShowNurseryTransfer(true):setShowTransfer(true);setShowPondMenu(false);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><ArrowRightLeft size={13}/> Transfer Fish Stock</button>
                  {pond.category!=="Nursery"&&<button onClick={()=>{setShowMaxKg(true);setShowPondMenu(false);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><Layers size={13}/> Set Max kg per Pallet</button>}
                  <button onClick={()=>{setShowClose(true);setShowPondMenu(false);}} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><X size={13}/> Clear Fish Stock</button>
                </>}
                {pond.status==="Empty"&&<button onClick={()=>{setShowRestock(true);setShowPondMenu(false);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><Plus size={13}/> Add Fish Stock</button>}
              </div>
            )}
          </div>
          {/* Desktop: full button row */}
          <div className="hidden lg:flex flex-wrap gap-2 items-center">
            {pond.status==="Active"&&<>
              <PBtn sm onClick={()=>setShowMort(true)}><Plus size={12}/> Log Mortality</PBtn>
              <PBtn sm onClick={()=>setShowTreat(true)}><Plus size={12}/> Log Treatment</PBtn>
              <PBtn sm outline onClick={()=>setShowUpdateQty(true)}>Update Qty</PBtn>
              <PBtn sm outline onClick={()=>pond.category==="Nursery"?setShowNurseryTransfer(true):setShowTransfer(true)}><ArrowRightLeft size={12}/> Transfer Fish Stock</PBtn>
              {pond.category!=="Nursery"&&<PBtn sm outline onClick={()=>setShowMaxKg(true)}>Max kg / Pallet</PBtn>}
              <PBtn sm danger onClick={()=>setShowClose(true)}>Clear Fish Stock</PBtn>
            </>}
            {pond.status==="Empty"&&<PBtn sm onClick={()=>setShowRestock(true)}><Plus size={12}/> Add Fish Stock</PBtn>}
            <Bdg label={pond.status==="Active"?"Active":"Inactive"} color={pond.status==="Active"?"green":"gray"}/>
          </div>
        </div>
      </div>
      {pond.status==="Empty"?(
        <Card className="p-8">
          <div className="flex flex-col items-center text-center">
            <Fish size={36} className="text-slate-200 mb-3"/>
            <p className="text-base font-semibold text-slate-500 mb-1">No fish stock in this pond</p>
            <p className="text-xs text-slate-400 mb-5">This pond is empty. Add a fish stock record to activate it and begin tracking feeding, mortality, and treatment data.</p>
            <PBtn onClick={()=>setShowRestock(true)}><Plus size={14}/> Add Fish Stock</PBtn>
          </div>
        </Card>
      ):(
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fish Information</p>
          {pond.status==="Active"&&<button onClick={()=>{setEditFishF({species:pond.species==="—"?"Catfish":pond.species,count:String(pond.currentCount),stockingDate:pond.stockingDate});setShowEditFish(true);}} className="flex items-center gap-1 text-xs text-slate-400 hover:text-green-600 border border-slate-200 hover:border-green-300 rounded-lg px-2 py-1 transition-colors"><Pencil size={11}/> Edit</button>}
        </div>
        {pond.transferNote&&(
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
            <ArrowRightLeft size={12} className="shrink-0"/><span>{pond.transferNote}</span>
          </div>
        )}
        {(()=>{
          const pondAge=(()=>{
            if(!pond.stockingDate||pond.stockingDate==="—")return null;
            const parts=pond.stockingDate.replace(",","").split(/\s+/);
            if(parts.length<3)return null;
            const MONTHS_FULL=["January","February","March","April","May","June","July","August","September","October","November","December"];
            const MONTHS_SHORT=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const mIdx=MONTHS_FULL.findIndex(m=>m.toLowerCase()===parts[0].toLowerCase());
            const mIdx2=MONTHS_SHORT.findIndex(m=>m.toLowerCase()===parts[0].toLowerCase());
            const monthIdx=mIdx>=0?mIdx:mIdx2>=0?mIdx2:-1;
            if(monthIdx<0)return null;
            const day=parseInt(parts[1]);
            const year=parseInt(parts[2]);
            if(isNaN(day)||isNaN(year))return null;
            const stockDate=new Date(year,monthIdx,day);
            const now=new Date(TODAY);
            const diffMs=now.getTime()-stockDate.getTime();
            if(diffMs<0)return null;
            const diffDays=Math.floor(diffMs/(1000*60*60*24));
            const months=Math.floor(diffDays/30);
            const remainDays=diffDays%30;
            if(months===0)return`${diffDays} day${diffDays!==1?"s":""}`;
            if(remainDays===0)return`${months} month${months!==1?"s":""}`;
            return`${months} month${months!==1?"s":""} ${remainDays} day${remainDays!==1?"s":""}`;
          })();
          return(
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[{l:"Initial Stock",v:pond.initialStock.toLocaleString()},{l:"Current Count",v:pond.currentCount.toLocaleString(),hi:true},{l:"Stocking Date",v:fmtStockingDate(pond.stockingDate)},{l:"Total Dead",v:String(dead),clickable:true},{l:"Mortality Rate",v:`${mRate}%`}].map(item=>(
                <div key={item.l} className={(item as any).clickable?"cursor-pointer group":""} onClick={(item as any).clickable?()=>setShowMortHistory(true):undefined}><p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.l}</p><p className={`text-xl font-bold mt-0.5 font-['Barlow_Condensed',sans-serif] ${(item as any).hi?"text-green-700":(item as any).clickable?"text-red-700 group-hover:underline":"text-slate-900"}`}>{item.v}</p></div>
              ))}
              {pondAge&&<div className="col-span-2 sm:col-span-3 lg:col-span-5 mt-1 w-full flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5"><span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Pond Age</span><span className="text-sm font-bold text-green-800">{pondAge}</span></div>}
            </div>
          );
        })()}
      </Card>
      )}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Feed Summary — by Size (Pallet)</p>
          {feedSummary.length>0&&<span className="text-xs font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">Total: {feedSummary.reduce((s,r)=>s+r.total,0)}kg</span>}
        </div>
        {(()=>{
          const allSizes=Array.from(new Set([...feedSummary.map(r=>r.size),...Object.keys(pond.maxKgByPallet||{})])).sort((a,b)=>parseFloat(a)-parseFloat(b));
          if(allSizes.length===0)return<p className="text-xs text-slate-400 text-center py-2">No feeding data recorded yet. Set Max kg / Pallet to track pallet limits.</p>;
          return(
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allSizes.map(size=>{
                const feedEntry=feedSummary.find(r=>r.size===size);
                const currentFeed=feedEntry?.total??0;
                const brand=feedEntry?.brand??"";
                const maxKg=pond.maxKgByPallet?.[size];
                const atMax=!!maxKg&&currentFeed>=maxKg;
                return(
                  <div key={size} className={`rounded-xl p-3 border flex flex-col gap-2 ${atMax?"bg-red-50 border-red-200":"bg-slate-50 border-slate-200"}`}>
                    {/* Header row: badge + edit icon */}
                    <div className="flex items-start justify-between gap-1 min-w-0">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <Bdg label={size} color={atMax?"red":"blue"}/>
                        {brand&&<span className="text-[10px] text-slate-400 truncate">{brand}</span>}
                      </div>
                      {maxKg&&(
                        <button onClick={()=>{setMaxKgSize(size);setMaxKgValue(String(maxKg));setShowMaxKg(true);}} className="shrink-0 p-1 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors">
                          <Pencil size={12}/>
                        </button>
                      )}
                    </div>
                    {/* Stats */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-slate-500 shrink-0">Fed</span>
                        <span className={`text-xs font-bold font-['Barlow_Condensed',sans-serif] ${atMax?"text-red-600":currentFeed>0?"text-green-600":"text-slate-400"}`}>{currentFeed} kg</span>
                      </div>
                      {maxKg&&(
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] text-slate-400 shrink-0">Max</span>
                          <span className="text-xs font-semibold text-red-500 font-['Barlow_Condensed',sans-serif]">{maxKg} kg</span>
                        </div>
                      )}
                      {maxKg&&(
                        <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                          <div className={`h-1 rounded-full transition-all ${atMax?"bg-red-500":"bg-green-500"}`} style={{width:`${Math.min(100,(currentFeed/maxKg)*100)}%`}}/>
                        </div>
                      )}
                      {atMax&&<p className="text-[10px] font-bold text-red-500">⚠ Limit reached</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Card>
      <Card>
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(["feed","treatment"] as const).map(t=>(
              <button key={t} onClick={()=>setPondTab(t)} className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${pondTab===t?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-800"}`}>
                {t==="feed"?"Feed History":"Treatment History"}
              </button>
            ))}
          </div>
          {pondTab==="feed"&&<div className="flex items-center gap-2"><span className="text-xs text-slate-400">Month:</span><select value={fhMonth} onChange={e=>setFhMonth(e.target.value)} className={`${SC} py-1 text-xs w-auto`}><option>All</option>{fhMonths.map(m=><option key={m}>{m}</option>)}</select></div>}
        </div>
        {pondTab==="feed"&&(<>
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[600px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-[11px] text-slate-400 w-10 sticky left-0 z-20 bg-slate-50">#</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 border-r border-slate-200 whitespace-nowrap cursor-pointer select-none hover:text-green-600" onClick={()=>hToggle("date")}><div className="flex items-center gap-1">Date<div className="flex flex-col -space-y-0.5"><ChevronUp size={9} className={hSf==="date"&&hSd==="asc"?"text-green-600":"text-slate-200"}/><ChevronDown size={9} className={hSf==="date"&&hSd==="desc"?"text-green-600":"text-slate-200"}/></div></div></th>
              <SH label="Brand" field="brand" sf={hSf} sd={hSd} onSort={hToggle}/>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Size</th>
              <SH label="Morning (kg)" field="morning" sf={hSf} sd={hSd} onSort={hToggle}/>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider whitespace-nowrap">AM Time</th>
              <SH label="Evening (kg)" field="evening" sf={hSf} sd={hSd} onSort={hToggle}/>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider whitespace-nowrap">PM Time</th>
              <SH label="Total" field="total" sf={hSf} sd={hSd} onSort={hToggle}/>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Employee</th>
              <th className="px-4 py-3 w-8"/>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {sortedHist.length===0?<tr><td colSpan={11} className="text-center text-xs text-slate-400 py-5">No feeding records for this pond.</td></tr>:sortedHist.slice((feedPage-1)*PER_PAGE,feedPage*PER_PAGE).map((r,i)=>(
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-300 text-xs font-mono sticky left-0 z-10 bg-white">{i+1}</td>
                  <td className="px-4 py-3 text-slate-500 sticky left-10 z-10 bg-white border-r border-slate-100 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.brand}</td>
                  <td className="px-4 py-3"><Bdg label={r.size} color="blue"/></td>
                  <td className="px-4 py-3">{r.morning}kg</td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{r.morningTime||"—"}</td>
                  <td className="px-4 py-3">{r.evening}kg</td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{r.eveningTime||"—"}</td>
                  <td className="px-4 py-3 font-bold text-green-700">{r.total}kg</td>
                  <td className="px-4 py-3 text-slate-400">{r.recordedBy}</td>
                  <td className="px-4 py-3"><button onClick={()=>setEditFeedRec({...r})} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"><Pencil size={13}/></button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="px-4 pb-2"><Pagination total={sortedHist.length} page={feedPage} perPage={PER_PAGE} onPage={setFeedPage}/></div>
        </>)}
        {pondTab==="treatment"&&(
          <><div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-[11px] text-slate-400 w-10">#</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Medicine Applied</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Cause</th>
              <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Remarks</th>
              <th className="px-4 py-3 w-8"/>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {pondTreatments.length===0?<tr><td colSpan={6} className="text-center text-xs text-slate-400 py-8">No treatment records. Click <strong>Log Treatment</strong> to record one.</td></tr>:pondTreatments.slice((treatPage-1)*PER_PAGE,treatPage*PER_PAGE).map((t,i)=>(
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-300 text-xs font-mono">{i+1}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{t.medicine}</td>
                  <td className="px-4 py-3 text-slate-500">{t.cause||"—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{t.remarks||"—"}</td>
                  <td className="px-4 py-3"><button onClick={()=>setEditTreatRec({...t})} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"><Pencil size={13}/></button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="px-4 pb-2"><Pagination total={pondTreatments.length} page={treatPage} perPage={PER_PAGE} onPage={setTreatPage}/></div></>
        )}
      </Card>
      {showMaxKg&&<Modal title="Set Max kg per Pallet" onClose={()=>setShowMaxKg(false)}>
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">Set the maximum cumulative feed (kg) for a pallet size for this fish stock. A notification will be sent when the limit is reached.</p>
        <F label="Pallet Size"><select value={maxKgSize} onChange={e=>setMaxKgSize(e.target.value)} className={SC}>{allInvSizes.map(s=><option key={s}>{s}</option>)}</select></F>
        <F label="Maximum kg"><input type="number" min="0" value={maxKgValue} onChange={e=>setMaxKgValue(e.target.value)} className={IC} placeholder="e.g. 500"/></F>
        {pond.maxKgByPallet&&Object.keys(pond.maxKgByPallet).length>0&&(
          <div className="space-y-1 bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Current Limits</p>
            {Object.entries(pond.maxKgByPallet).map(([size,kg])=>(
              <div key={size} className="flex items-center justify-between text-xs"><span className="text-slate-600">{size}</span><span className="font-bold text-slate-800">{kg}kg max</span></div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-1"><PBtn onClick={()=>{if(!maxKgValue)return;onSetMaxKg(pond.id,maxKgSize,Number(maxKgValue));setShowMaxKg(false);setMaxKgValue("");}}><CheckCircle size={14}/> Save</PBtn><button onClick={()=>setShowMaxKg(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showMort&&<Modal title="Log Mortality" onClose={()=>{setShowMort(false);setMortErr({});}}>
        <div className="grid grid-cols-2 gap-3">
          <div><F label="Date"><input type="date" value={mortF.date} onChange={e=>{setMortF(p=>({...p,date:e.target.value}));if(e.target.value)setMortErr(p=>({...p,date:""}));}} className={`${IC}${mortErr.date?" border-red-400":""}`}/></F>{mortErr.date&&<p className="text-xs text-red-500 mt-1">{mortErr.date}</p>}</div>
          <div><F label="Dead Fish"><NumInput allowDecimal={false} value={mortF.count} onChange={v=>{setMortF(p=>({...p,count:v}));if(v&&Number(v)>0)setMortErr(p=>({...p,count:""}));}} className={`${IC}${mortErr.count?" border-red-400":""}`} placeholder="0"/></F>{mortErr.count&&<p className="text-xs text-red-500 mt-1">{mortErr.count}</p>}</div>
        </div>
        <F label="Cause"><select value={mortF.cause} onChange={e=>setMortF(p=>({...p,cause:e.target.value}))} className={SC}>{MORT_CAUSES.map(c=><option key={c}>{c}</option>)}</select></F>
        <F label="Notes"><textarea value={mortF.notes} onChange={e=>setMortF(p=>({...p,notes:e.target.value}))} className={IC} rows={2}/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleMort}><Plus size={14}/> Log</PBtn><button onClick={()=>{setShowMort(false);setMortErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showMortHistory&&<Modal title={`Mortality History — ${pond.name}`} onClose={()=>{setShowMortHistory(false);setEditMortEntry(null);}} wide>
        {editMortEntry?(
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3"><F label="Date"><input type="date" value={editMortEntry.date} onChange={e=>setEditMortEntry(p=>p?{...p,date:e.target.value}:p)} className={IC}/></F><F label="Dead Fish"><NumInput value={editMortEntry.count} onChange={v=>setEditMortEntry(p=>p?{...p,count:Number(v)||0}:p)} className={IC} allowDecimal={false}/></F></div>
            <F label="Cause"><select value={editMortEntry.cause} onChange={e=>setEditMortEntry(p=>p?{...p,cause:e.target.value}:p)} className={SC}>{MORT_CAUSES.map(c=><option key={c}>{c}</option>)}</select></F>
            <F label="Notes"><textarea value={editMortEntry.notes} onChange={e=>setEditMortEntry(p=>p?{...p,notes:e.target.value}:p)} className={IC} rows={2}/></F>
            <div className="flex gap-2 pt-1"><PBtn onClick={()=>setEditMortEntry(null)}><CheckCircle size={14}/> Save</PBtn><button onClick={()=>setEditMortEntry(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
          </div>
        ):(
          <>
            {logs.length===0?<p className="text-sm text-slate-400 text-center py-6">No mortality records for this pond.</p>:(
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100">{["Date","Dead Fish","Cause","Notes",""].map(h=><th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                  <tbody>{[...logs].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>(
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-slate-700">{m.date}</td>
                      <td className="px-3 py-2.5 font-semibold text-red-700">{m.count.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-slate-600">{m.cause}</td>
                      <td className="px-3 py-2.5 text-slate-500 max-w-[200px] truncate">{m.notes||"—"}</td>
                      <td className="px-3 py-2.5"><button onClick={()=>setEditMortEntry({...m})} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-semibold"><Pencil size={11}/> Edit</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Total: <strong className="text-red-700">{dead.toLocaleString()} fish</strong></span>
              <button onClick={()=>setShowMortHistory(false)} className="px-4 py-2 text-sm text-slate-400">Close</button>
            </div>
          </>
        )}
      </Modal>}
      {showCost&&<Modal title="Add Pond Cost" onClose={()=>{setShowCost(false);setCostErr({});}}>
        {pond.species!=="—"&&<div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"/><span className="text-xs text-slate-500">Fish Stock:</span><span className="text-xs font-semibold text-slate-800">{pond.species} ({fmtStockingDate(pond.stockingDate)})</span></div>}
        <F label="Category"><select value={costF.category} onChange={e=>setCostF(p=>({...p,category:e.target.value}))} className={SC}>{EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}</select></F>
        <div className="grid grid-cols-2 gap-3">
          <div><F label={`Amount (${cs})`}><NumInput value={costF.amount} onChange={v=>{setCostF(p=>({...p,amount:v}));if(v&&Number(v)>0)setCostErr(p=>({...p,amount:""}));}} className={`${IC}${costErr.amount?" border-red-400":""}`} placeholder="0"/></F>{costErr.amount&&<p className="text-xs text-red-500 mt-1">{costErr.amount}</p>}</div>
          <div><F label="Date"><input type="date" value={costF.date} onChange={e=>{setCostF(p=>({...p,date:e.target.value}));if(e.target.value)setCostErr(p=>({...p,date:""}));}} className={`${IC}${costErr.date?" border-red-400":""}`}/></F>{costErr.date&&<p className="text-xs text-red-500 mt-1">{costErr.date}</p>}</div>
        </div>
        <F label="Description"><input type="text" value={costF.desc} onChange={e=>setCostF(p=>({...p,desc:e.target.value}))} className={IC} placeholder="Brief description…"/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleCost}><Plus size={14}/> Save</PBtn><button onClick={()=>{setShowCost(false);setCostErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showClose&&<Modal title="Clear Fish Stock" onClose={()=>setShowClose(false)}>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Clear fish stock in {pond.name}?</p>
          <p className="text-xs text-amber-700">This marks the pond as <strong>Inactive</strong> and removes all fish stock data (count, weight, stocking details) along with all feeding and treatment records. The pond ID and name are kept. You can restock it later to make it active again.</p>
        </div>
        <div className="flex gap-2 pt-1"><PBtn danger onClick={handleClose}>Confirm Clear</PBtn><button onClick={()=>setShowClose(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showNurseryTransfer&&<Modal title={`Nursery Transfer — ${pond.name}`} onClose={()=>{setShowNurseryTransfer(false);setNurseryTF({toPond:"",count:"",pct:"100",date:TODAY});setNurseryErr({});}} wide>
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-xs text-purple-700">Nursery ponds support partial transfers. Select the destination pond, number of fish to transfer, and the percentage of feeding history to carry over. All treatment records will be copied for medical reference.</div>
        <div><F label="Destination Pond"><select value={nurseryTF.toPond} onChange={e=>{setNurseryTF(p=>({...p,toPond:e.target.value}));if(e.target.value)setNurseryErr(p=>({...p,toPond:""}));}} className={`${SC}${nurseryErr.toPond?" border-red-400":""}`}><option value="">Select destination pond…</option>{ponds.filter(p=>p.id!==pond.id).map(p=><option key={p.id} value={p.id}>{p.name} ({p.id}) — {p.status}</option>)}</select></F>{nurseryErr.toPond&&<p className="text-xs text-red-500 mt-1">{nurseryErr.toPond}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><F label={`Fish to Transfer (max ${pond.currentCount.toLocaleString()})`}><input type="number" min="1" max={String(pond.currentCount)} value={nurseryTF.count} onChange={e=>{setNurseryTF(p=>({...p,count:e.target.value}));if(e.target.value&&Number(e.target.value)>0)setNurseryErr(p=>({...p,count:""}));}} className={`${IC}${nurseryErr.count?" border-red-400":""}`} placeholder="0"/></F>{nurseryErr.count&&<p className="text-xs text-red-500 mt-1">{nurseryErr.count}</p>}</div>
          <F label="% of Feeding History"><input type="number" min="1" max="100" value={nurseryTF.pct} onChange={e=>setNurseryTF(p=>({...p,pct:e.target.value}))} className={IC} placeholder="100"/></F>
        </div>
        <F label="Transfer Date"><input type="date" value={nurseryTF.date} onChange={e=>setNurseryTF(p=>({...p,date:e.target.value}))} className={IC}/></F>
        {nurseryTF.count&&Number(nurseryTF.count)>0&&<div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700 mb-1.5">What will be transferred:</p>
          <p>✓ <strong>{Number(nurseryTF.count).toLocaleString()} fish</strong> from {pond.name}</p>
          <p>✓ <strong>{nurseryTF.pct||100}%</strong> of feeding history records</p>
          <p>✓ <strong>All</strong> treatment records (medical reference)</p>
          {pond.maxKgByPallet&&Object.keys(pond.maxKgByPallet).length>0&&<p>✓ <strong>{nurseryTF.pct||100}%</strong> of pallet max kg limits</p>}
        </div>}
        <div className="flex gap-2 pt-1"><PBtn onClick={()=>{const errs:Record<string,string>={};if(!nurseryTF.toPond)errs.toPond="Please select a destination pond";if(!nurseryTF.count||Number(nurseryTF.count)<=0)errs.count="Fish count is required";if(Object.keys(errs).length){setNurseryErr(errs);return;}setNurseryErr({});onNurseryTransfer(pond.id,nurseryTF.toPond,Number(nurseryTF.count),Number(nurseryTF.pct)||100,nurseryTF.date);setShowNurseryTransfer(false);setNurseryTF({toPond:"",count:"",pct:"100",date:TODAY});}}><ArrowRightLeft size={14}/> Confirm Transfer</PBtn><button onClick={()=>{setShowNurseryTransfer(false);setNurseryTF({toPond:"",count:"",pct:"100",date:TODAY});setNurseryErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showTransfer&&<Modal title={`Transfer Fish Stock — ${pond.name}`} onClose={()=>{setShowTransfer(false);setTransferF({toPond:"",date:TODAY,pct:"100",count:""});setTransferErr({});}} wide>
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 grid grid-cols-2 gap-2">
          <span>Species: <strong>{pond.species}</strong></span>
          <span>Fish Count: <strong>{pond.currentCount.toLocaleString()}</strong></span>
          <span>Stocking Date: <strong>{fmtStockingDate(pond.stockingDate)}</strong></span>
          <span>Total Cost: <strong>{fmt(pond.totalCost)}</strong></span>
        </div>
        <F label="Transfer Percentage">
          <div className="flex gap-2 flex-wrap">
            {["25","50","75","100"].map(pVal=>{
              const isActive=transferF.pct===pVal;
              const btnCls="px-4 py-2 rounded-lg text-sm font-semibold border transition-all "+(isActive?"border-green-400 bg-green-50 text-green-700":"border-slate-200 text-slate-500 hover:border-green-300");
              const handlePctBtn=()=>{
                const count=pVal==="100"?"":String(Math.round(pond.currentCount*(Number(pVal)/100)));
                setTransferF(f=>({...f,pct:pVal,count}));
              };
              return <button key={pVal} type="button" onClick={handlePctBtn} className={btnCls}>{pVal}%</button>;
            })}
          </div>
          <input type="number" value={transferF.pct} onChange={e=>{const v=Math.min(100,Math.max(1,Number(e.target.value)));const cnt=v>=100?"":String(Math.round(pond.currentCount*(v/100)));setTransferF(f=>({...f,pct:String(v),count:cnt}));}} className={IC+" mt-2 max-w-[100px]"} placeholder="Custom %" min="1" max="100"/>
        </F>
        {Number(transferF.pct)<100&&<F label={`Fish Count to Transfer (of ${pond.currentCount.toLocaleString()})`}><input type="number" value={transferF.count} onChange={e=>setTransferF(f=>({...f,count:e.target.value}))} className={IC} min="1" max={pond.currentCount}/></F>}
        <div><F label={Number(transferF.pct)>=100?"Transfer To (empty ponds only)":"Transfer To"}>
          <select value={transferF.toPond} onChange={e=>{setTransferF(p=>({...p,toPond:e.target.value}));if(e.target.value)setTransferErr(p=>({...p,toPond:""}));}} className={`${SC}${transferErr.toPond?" border-red-400":""}`}>
            <option value="">Select pond…</option>
            {Number(transferF.pct)>=100
              ?emptyPonds.map(p=><option key={p.id} value={p.id}>{p.name} — {p.type} (Empty)</option>)
              :ponds.filter(p=>p.id!==pond.id).map(p=><option key={p.id} value={p.id}>{p.name} — {p.type} ({p.status})</option>)
            }
          </select>
        </F>{transferErr.toPond&&<p className="text-xs text-red-500 mt-1">{transferErr.toPond}</p>}</div>
        <F label="Transfer Date"><input type="date" value={transferF.date} onChange={e=>setTransferF(p=>({...p,date:e.target.value}))} className={IC}/></F>
        {transferF.toPond&&Number(transferF.pct)>=100&&<div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">All fish from <strong>{pond.name}</strong> → <strong>{ponds.find(p=>p.id===transferF.toPond)?.name}</strong>. <strong>{pond.name}</strong> will be cleared.</div>}
        {transferF.toPond&&Number(transferF.pct)<100&&<div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700"><strong>{Math.round(Number(transferF.pct))}%</strong> of fish ({transferF.count||Math.round(pond.currentCount*Number(transferF.pct)/100)} fish) + proportional feeding history will transfer to <strong>{ponds.find(p=>p.id===transferF.toPond)?.name}</strong>. Source pond retains remaining stock.</div>}
        <div className="flex gap-2 pt-1"><PBtn onClick={handleTransfer}><ArrowRightLeft size={14}/> Confirm Transfer</PBtn><button onClick={()=>{setShowTransfer(false);setTransferF({toPond:"",date:TODAY,pct:"100",count:""});setTransferErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {editFeedRec&&<Modal title="Edit Feeding Record" onClose={()=>setEditFeedRec(null)}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Morning (kg)"><NumInput value={editFeedRec.morning} onChange={v=>{const n=Number(v)||0;setEditFeedRec(p=>p?{...p,morning:n,total:n+p.evening}:p);}} className={IC} placeholder="0"/></F>
          <F label="Evening (kg)"><NumInput value={editFeedRec.evening} onChange={v=>{const n=Number(v)||0;setEditFeedRec(p=>p?{...p,evening:n,total:p.morning+n}:p);}} className={IC} placeholder="0"/></F>
          <F label="AM Time"><input type="time" value={editFeedRec.morningTime||""} onChange={e=>setEditFeedRec(p=>p?{...p,morningTime:e.target.value}:p)} className={IC}/></F>
          <F label="PM Time"><input type="time" value={editFeedRec.eveningTime||""} onChange={e=>setEditFeedRec(p=>p?{...p,eveningTime:e.target.value}:p)} className={IC}/></F>
        </div>
        <F label="Feed Brand"><input value={editFeedRec.brand} onChange={e=>setEditFeedRec(p=>p?{...p,brand:e.target.value}:p)} className={IC}/></F>
        <F label="Feed Size"><select value={editFeedRec.size} onChange={e=>setEditFeedRec(p=>p?{...p,size:e.target.value}:p)} className={SC}>{invSizesForBrand(editFeedRec?.brand||"").length>0?invSizesForBrand(editFeedRec?.brand||"").map(s=><option key={s}>{s}</option>):allInvSizes.map(s=><option key={s}>{s}</option>)}</select></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={()=>{setEditFeedRec(null);}}><CheckCircle size={14}/> Save Changes</PBtn><button onClick={()=>setEditFeedRec(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {editTreatRec&&<Modal title="Edit Treatment Record" onClose={()=>setEditTreatRec(null)}>
        <F label="Date"><input type="date" value={editTreatRec.date} onChange={e=>setEditTreatRec(p=>p?{...p,date:e.target.value}:p)} className={IC}/></F>
        <F label="Medicine Applied"><input value={editTreatRec.medicine} onChange={e=>setEditTreatRec(p=>p?{...p,medicine:e.target.value}:p)} className={IC}/></F>
        <F label="Cause (Optional)"><input value={editTreatRec.cause} onChange={e=>setEditTreatRec(p=>p?{...p,cause:e.target.value}:p)} className={IC}/></F>
        <F label="Remarks (Optional)"><textarea value={editTreatRec.remarks} onChange={e=>setEditTreatRec(p=>p?{...p,remarks:e.target.value}:p)} className={`${IC} resize-none`} rows={2}/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={()=>setEditTreatRec(null)}><CheckCircle size={14}/> Save Changes</PBtn><button onClick={()=>setEditTreatRec(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showTreat&&<Modal title="Log Treatment" onClose={()=>setShowTreat(false)}>
        <F label="Date"><input type="date" value={treatF.date} onChange={e=>setTreatF(p=>({...p,date:e.target.value}))} className={IC}/></F>
        <F label="Medicine Applied"><input value={treatF.medicine} onChange={e=>setTreatF(p=>({...p,medicine:e.target.value}))} className={IC} placeholder="e.g. Potassium permanganate, Salinomycin…"/></F>
        <F label="Cause (Optional)"><input value={treatF.cause} onChange={e=>setTreatF(p=>({...p,cause:e.target.value}))} className={IC} placeholder="e.g. Bacterial infection, parasites…"/></F>
        <F label="Remarks (Optional)"><textarea value={treatF.remarks} onChange={e=>setTreatF(p=>({...p,remarks:e.target.value}))} className={`${IC} resize-none`} rows={2} placeholder="Additional notes…"/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleTreat}><Plus size={14}/> Log Treatment</PBtn><button onClick={()=>setShowTreat(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showEditFish&&<Modal title="Edit Fish Information" onClose={()=>setShowEditFish(false)}>
        <F label="Species"><select value={editFishF.species} onChange={e=>setEditFishF(p=>({...p,species:e.target.value}))} className={SC}>{POND_SPECIES.map(s=><option key={s}>{s}</option>)}</select></F>
        <F label="Current Count"><input type="number" value={editFishF.count} onChange={e=>setEditFishF(p=>({...p,count:e.target.value}))} className={IC}/></F>
        <F label="Stocking Date"><input type="date" value={editFishF.stockingDate} onChange={e=>setEditFishF(p=>({...p,stockingDate:e.target.value}))} className={IC}/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleSaveEditFish}><CheckCircle size={14}/> Save Changes</PBtn><button onClick={()=>setShowEditFish(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showUpdateQty&&<Modal title="Update Fish Quantity" onClose={()=>setShowUpdateQty(false)}>
        <div className="flex gap-2 mb-1">
          <button onClick={()=>setQtyMode("increase")} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${qtyMode==="increase"?"border-green-400 bg-green-50 text-green-700":"border-slate-200 text-slate-500"}`}>Increase</button>
          <button onClick={()=>setQtyMode("reduce")} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${qtyMode==="reduce"?"border-red-400 bg-red-50 text-red-700":"border-slate-200 text-slate-500"}`}>Reduce</button>
        </div>
        <F label="Amount"><input type="number" min="1" value={qtyAmt} onChange={e=>setQtyAmt(e.target.value)} className={IC} placeholder="Enter amount"/></F>
        <div className="text-xs text-slate-400">Current count: <strong className="text-slate-700">{pond.currentCount.toLocaleString()}</strong>{qtyAmt&&Number(qtyAmt)>0&&<> → <strong className={qtyMode==="increase"?"text-green-700":"text-red-600"}>{(qtyMode==="increase"?pond.currentCount+Number(qtyAmt):Math.max(0,pond.currentCount-Number(qtyAmt))).toLocaleString()}</strong></>}</div>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleUpdateQty}><CheckCircle size={14}/> Update</PBtn><button onClick={()=>setShowUpdateQty(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showRestock&&<Modal title={`Add Fish Stock — ${pond.name}`} onClose={()=>{setShowRestock(false);setRestockErr({});}} wide>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700">
          <strong>{pond.name}</strong> ({pond.id}) · {pond.type} · {pond.sizeM2} ft² — enter new fish details below to activate this pond.
        </div>
        <F label="Species"><select value={restockF.species} onChange={e=>setRestockF(p=>({...p,species:e.target.value}))} className={SC}>{POND_SPECIES.map(s=><option key={s}>{s}</option>)}</select></F>
        <div><F label="Initial Stock (fish)"><NumInput allowDecimal={false} value={restockF.initialStock} onChange={v=>{setRestockF(p=>({...p,initialStock:v}));if(v&&Number(v)>0)setRestockErr(p=>({...p,initialStock:""}));}} className={`${IC}${restockErr.initialStock?" border-red-400":""}`} placeholder="0"/></F>{restockErr.initialStock&&<p className="text-xs text-red-500 mt-1">{restockErr.initialStock}</p>}</div>
        <F label="Stocking Date"><input type="date" value={restockF.stockingDate} onChange={e=>setRestockF(p=>({...p,stockingDate:e.target.value}))} className={IC}/></F>
        <F label="Supplier Name (Optional)"><input type="text" value={restockF.supplier} onChange={e=>setRestockF(p=>({...p,supplier:e.target.value}))} className={IC} placeholder="e.g. XYZ Hatchery"/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleRestock}><CheckCircle size={14}/> Activate Pond</PBtn><button onClick={()=>{setShowRestock(false);setRestockErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
    </div>
  );
}

/* ─── 2. Pond Management ────────────────────────────────────── */
export default function PondManagement({ponds,onAddPond,onClosePond,onRestockPond,onTransfer,onNurseryTransfer,mortality,onAddMortality,onAddCost,feedingRecords,stockEvents,treatments,onAddTreatment,activeFarmId,onDeletePond,onEditFish,onSetMaxKg,onEditPond,onScrollTop,currency="₦",inventory=[]}:{ponds:Pond[];onAddPond:(p:Pond)=>void;onClosePond:(id:string)=>void;onRestockPond:(id:string,data:{species:string;initialStock:number;stockingDate:string;stockMonth:string;supplier?:string})=>void;onTransfer:(fromId:string,toId:string,date:string)=>void;onNurseryTransfer:(fromId:string,toId:string,count:number,pct:number,date:string)=>void;mortality:MortalityEntry[];onAddMortality:(m:MortalityEntry,pondId:string)=>void;onAddCost:(e:Expense)=>void;feedingRecords:FeedingRecord[];stockEvents:StockEvent[];treatments:TreatmentRecord[];onAddTreatment:(t:TreatmentRecord)=>void;activeFarmId:string;onDeletePond?:(id:string)=>void;onEditFish?:(pondId:string,u:{species:string;currentCount:number;stockingDate:string})=>void;onSetMaxKg:(pondId:string,size:string,maxKg:number)=>void;onEditPond?:(id:string,u:Partial<Pond>)=>void;onScrollTop?:()=>void;currency?:string;inventory?:FeedItem[];}){
  const cs=currency;
  const [detailId,setDetailId]=useState<string|null>(null);
  const [showAdd,setShowAdd]=useState(false);
  const [addF,setAddF]=useState({name:"",lengthFt:"",widthFt:"",type:"Earthen",notes:"",category:"Production"});
  const [addErr,setAddErr]=useState<Record<string,string>>({});
  const [editPondId,setEditPondId]=useState<string|null>(null);
  const [editPondF,setEditPondF]=useState({name:"",type:"Earthen",lengthFt:"",widthFt:"",notes:"",category:"Production"});
  const handleSaveEditPond=()=>{if(!editPondId)return;onEditPond?.(editPondId,{name:editPondF.name,type:editPondF.type,lengthFt:editPondF.lengthFt,widthFt:editPondF.widthFt,notes:editPondF.notes,category:editPondF.category as "Production"|"Nursery",sizeM2:String((Number(editPondF.lengthFt)||0)*(Number(editPondF.widthFt)||0)||0)});setEditPondId(null);};
  const [fStatus,setFStatus]=useState("All"); const [fType,setFType]=useState("All"); const [fMonth,setFMonth]=useState("All"); const [search,setSearch]=useState("");
  const [deletePondId,setDeletePondId]=useState<string|null>(null);
  const [pondMobileMenu,setPondMobileMenu]=useState<string|null>(null);
  const pondMenuRef=useRef<HTMLDivElement>(null);
  const longPressTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    const handler=(e:MouseEvent)=>{ if(pondMenuRef.current&&!pondMenuRef.current.contains(e.target as Node))setPondMobileMenu(null); };
    if(pondMobileMenu)document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[pondMobileMenu]);
  useEffect(()=>{onScrollTop?.();},[detailId]);
  const {sorted:sortedPonds,sf,sd,toggle}=useSort(ponds,"name");
  const [pondTablePage,setPondTablePage]=useState(1);
  const pond=ponds.find(p=>p.id===detailId);

  const [showStockHist,setShowStockHist]=useState(false);
  const [stockHistYear,setStockHistYear]=useState<string>("All");
  const [stockHistMonth,setStockHistMonth]=useState<string>("All");
  const [stockHistDay,setStockHistDay]=useState<string>("All");
  const [stockDetailId,setStockDetailId]=useState<string|null>(null);
  const MONTHS_LIST=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const stockGroups=(()=>{
    type SG={key:string;stockingDate:string;speciesList:string[];supplierList:string[];pondNames:string[];pondIds:string[];totalStartCount:number;isActive:boolean};
    const groups:Record<string,SG>={};
    stockEvents.filter(e=>e.type==="Initial"||e.type==="Restock").forEach(ev=>{
      const gk=ev.date;
      if(!groups[gk])groups[gk]={key:gk,stockingDate:ev.date,speciesList:[],supplierList:[],pondNames:[],pondIds:[],totalStartCount:0,isActive:false};
      if(!groups[gk].speciesList.includes(ev.species))groups[gk].speciesList.push(ev.species);
      if(ev.supplier&&!groups[gk].supplierList.includes(ev.supplier))groups[gk].supplierList.push(ev.supplier);
      if(!groups[gk].pondNames.includes(ev.pondName)){groups[gk].pondNames.push(ev.pondName);groups[gk].pondIds.push(ev.pondId);}
      groups[gk].totalStartCount+=ev.count;
    });
    ponds.filter(p=>p.status==="Active"&&p.species!=="—").forEach(p=>{if(groups[p.stockingDate])groups[p.stockingDate].isActive=true;});
    return Object.values(groups).sort((a,b)=>b.stockingDate.localeCompare(a.stockingDate));
  })();
  const stockYears=[...new Set(stockGroups.map(g=>g.stockingDate.substring(0,4)).filter(Boolean))];
  const filtStockGroups=stockGroups.filter(g=>{
    if(stockHistYear!=="All"&&!g.stockingDate.startsWith(stockHistYear))return false;
    if(stockHistMonth!=="All"){try{const d=new Date(g.stockingDate);if(MONTHS_LIST[d.getMonth()]!==stockHistMonth)return false;}catch{return false;}}
    if(stockHistDay!=="All"&&parseInt((g.stockingDate.split("-")[2])||"0",10)!==parseInt(stockHistDay,10))return false;
    return true;
  });
  if(pond) return <PondDetail pond={pond} mortality={mortality} onAddMortality={onAddMortality} onAddCost={onAddCost} feedingRecords={feedingRecords} onBack={()=>setDetailId(null)} onClosePond={onClosePond} onRestockPond={onRestockPond} ponds={ponds} stockEvents={stockEvents} onTransfer={onTransfer} onNurseryTransfer={onNurseryTransfer} treatments={treatments} onAddTreatment={onAddTreatment} onEditFish={onEditFish} onSetMaxKg={onSetMaxKg} inventory={inventory}/>;

  const activePonds=ponds.filter(p=>p.status==="Active").length;
  const totalFish=ponds.reduce((s,p)=>s+p.currentCount,0);
  const totalCost=ponds.reduce((s,p)=>s+p.totalCost,0);
  const pondMonths=[...new Set(ponds.map(p=>p.stockMonth).filter(Boolean))];
  const filteredPonds=sortedPonds.filter(p=>{
    if(fStatus!=="All"&&p.status!==fStatus)return false;
    if(fType!=="All"&&p.type!==fType)return false;
    if(fMonth!=="All"&&p.stockMonth!==fMonth)return false;
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase())&&!p.species.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  const handleAddPond=()=>{
    const errs:Record<string,string>={};
    if(!addF.name.trim())errs.name="Pond name is required";
    if(Object.keys(errs).length){setAddErr(errs);return;}
    setAddErr({});
    const l=Number(addF.lengthFt)||0;const w=Number(addF.widthFt)||0;
    const sizeM2=l&&w?String(l*w):"";
    const autoId="P"+String(ponds.length+1).padStart(3,"0");
    onAddPond({id:autoId,name:addF.name,type:addF.type,species:"—",sizeM2,initialStock:0,currentCount:0,stockingDate:"—",stockMonth:"",totalCost:0,status:"Empty",notes:addF.notes,farmId:activeFarmId,lengthFt:addF.lengthFt,widthFt:addF.widthFt,category:addF.category as "Production"|"Nursery"});
    setShowAdd(false);
    setAddF({name:"",lengthFt:"",widthFt:"",type:"Earthen",notes:"",category:"Production"});
  };

  return(
    <div className="p-4 sm:p-6 space-y-5 max-w-[1100px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Pond Management</h1><p className="text-xs text-slate-400 mt-1 mb-2 sm:mb-0">View and manage all ponds — stock details, feeding history, and operational costs.</p></div>
        <div className="flex gap-2">
          <PBtn onClick={()=>setShowStockHist(true)} sm outline><History size={13}/> Fish Stock History</PBtn>
          <PBtn onClick={()=>setShowAdd(true)} sm><Plus size={13}/> Add Pond</PBtn>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Ponds" value={String(ponds.length)} icon={Droplets}/>
        <StatCard label="Active" value={String(activePonds)} icon={CheckCircle} hi/>
        <StatCard label="Total Fish" value={totalFish.toLocaleString()} icon={Fish}/>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className={`${IC} pl-8 w-40`}/></div>
        {([["Status",fStatus,setFStatus,["All","Active","Empty"]],["Type",fType,setFType,["All","Earthen","Concrete","Tarpaulin"]]] as any[]).map(([label,val,set,opts]:any)=>(
          <div key={label} className="flex items-center gap-1.5"><span className="text-xs text-slate-400">{label}:</span><select value={val} onChange={e=>set(e.target.value)} className={`${SC} py-1.5 text-xs w-auto`}>{opts.map((o:string)=><option key={o}>{o}</option>)}</select></div>
        ))}
      </div>
      <Card>
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">List of Ponds</p>
          <p className="text-xs text-slate-400 mt-0.5">After creating a pond, open it to add Fish Stock, manage feeding records, transfer fish, and view all activities related to that pond.</p>
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto"><table className="w-full text-sm min-w-[700px]">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 text-[11px] text-slate-400 w-10 sticky left-0 z-20 bg-slate-50">#</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 border-r border-slate-200 whitespace-nowrap cursor-pointer select-none hover:text-green-600" onClick={()=>toggle("name")}><div className="flex items-center gap-1">Pond Name<div className="flex flex-col -space-y-0.5"><ChevronUp size={9} className={sf==="name"&&sd==="asc"?"text-green-600":"text-slate-200"}/><ChevronDown size={9} className={sf==="name"&&sd==="desc"?"text-green-600":"text-slate-200"}/></div></div></th>
            <SH label="Pond ID" field="id" sf={sf} sd={sd} onSort={toggle}/>
            <SH label="Type" field="type" sf={sf} sd={sd} onSort={toggle}/>
            <SH label="Species" field="species" sf={sf} sd={sd} onSort={toggle}/>
            <SH label="Fish Count" field="currentCount" sf={sf} sd={sd} onSort={toggle}/>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Category</th>
            <SH label="Status" field="status" sf={sf} sd={sd} onSort={toggle}/>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filteredPonds.slice((pondTablePage-1)*PER_PAGE,pondTablePage*PER_PAGE).map((p,i)=>{
              const logs=mortality.filter(m=>m.pondId===p.id);
              const dead=logs.reduce((s,m)=>s+m.count,0);
              const mRate=p.initialStock>0?((dead/p.initialStock)*100).toFixed(1):"0.0";
              return(
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 text-slate-300 text-xs font-mono sticky left-0 z-10 bg-white">{i+1}</td>
                  <td className="px-4 py-3.5 sticky left-10 z-10 bg-white border-r border-slate-100 cursor-pointer hover:text-green-700" onClick={()=>setDetailId(p.id)}><p className="font-semibold text-slate-900 hover:text-green-700">{p.name}</p><p className="text-[11px] text-slate-400">{p.sizeM2} ft²</p></td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs font-mono">{p.id}</td>
                  <td className="px-4 py-3.5 text-slate-600">{p.type}</td>
                  <td className="px-4 py-3.5 text-slate-600">{p.species}</td>
                  <td className="px-4 py-3.5"><p className="font-semibold text-slate-900">{p.currentCount.toLocaleString()}</p><p className="text-[11px] text-slate-400">Mort: {mRate}%</p></td>
                  <td className="px-4 py-3.5"><Bdg label={p.category||"Production"} color={p.category==="Nursery"?"purple":"teal"}/></td>
                  <td className="px-4 py-3.5"><Bdg label={p.status==="Active"?"Active":"Inactive"} color={p.status==="Active"?"green":"gray"}/></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setDetailId(p.id)} className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-800 transition-colors"><Eye size={13}/> View</button>
                      <button onClick={()=>{setEditPondF({name:p.name,type:p.type,lengthFt:p.lengthFt||"",widthFt:p.widthFt||"",notes:p.notes,category:p.category||"Production"});setEditPondId(p.id);}} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors" title="Edit pond"><Pencil size={13}/></button>
                      <button onClick={()=>{if(p.status!=="Empty"||p.currentCount>0)return;setDeletePondId(p.id);}} disabled={p.status==="Active"||p.currentCount>0} className={`p-1.5 rounded-lg transition-colors ${p.status==="Empty"&&p.currentCount===0?"text-slate-300 hover:text-red-500 hover:bg-red-50":"text-slate-200 cursor-not-allowed"}`}><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredPonds.length===0&&<tr><td colSpan={9} className="text-center text-xs text-slate-400 py-8">No ponds match filters</td></tr>}
          </tbody>
        </table></div>
        <div className="px-4 pb-2"><Pagination total={filteredPonds.length} page={pondTablePage} perPage={PER_PAGE} onPage={setPondTablePage}/></div>
        <div className="hidden md:block px-4 pb-3 border-t border-slate-50 pt-2">
          <p className="text-[11px] text-slate-400"><span className="font-semibold text-slate-500">Tip:</span> Open any pond to add Fish Stock, manage feeding records, and view the Fish Stock currently assigned to that pond.</p>
        </div>
        {/* Mobile card list */}
        <div className="md:hidden">
          {filteredPonds.length===0&&<p className="text-center text-xs text-slate-400 py-8">No ponds match filters</p>}
          {filteredPonds.map((p,pIdx)=>{
            const isNearBottom=pIdx>=filteredPonds.length-2;
            return(
            <div key={p.id} className="flex items-center px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
              onClick={()=>setDetailId(p.id)}
              onContextMenu={e=>{e.preventDefault();setPondMobileMenu(p.id);}}
              onTouchStart={()=>{longPressTimer.current=setTimeout(()=>setPondMobileMenu(p.id),750);}}
              onTouchEnd={()=>{if(longPressTimer.current)clearTimeout(longPressTimer.current);}}
              onTouchMove={()=>{if(longPressTimer.current){clearTimeout(longPressTimer.current);longPressTimer.current=null;}}}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 text-sm truncate">{p.name}</p>
                  <Bdg label={p.category||"Production"} color={p.category==="Nursery"?"purple":"teal"}/>
                  <Bdg label={p.status==="Active"?"Active":"Inactive"} color={p.status==="Active"?"green":"gray"}/>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-slate-400 font-mono">{p.id}</span>
                  <span className="text-[11px] text-slate-400">{p.currentCount.toLocaleString()} fish</span>
                </div>
                {p.status==="Active"&&p.species!=="—"&&<p className="text-[11px] text-slate-700 font-medium mt-0.5">{p.species}{p.stockingDate&&p.stockingDate!=="—"?` · ${fmtStockingDate(p.stockingDate)}`:""}</p>}
              </div>
              <div className="relative shrink-0">
                <ChevronRight size={16} className="text-slate-300"/>
                {pondMobileMenu===p.id&&(
                  <div ref={pondMenuRef} className={`absolute right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden min-w-[160px] ${isNearBottom?"bottom-0":"top-0"}`} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>{setDetailId(p.id);setPondMobileMenu(null);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><Eye size={14}/> View Details</button>
                    <button onClick={()=>{setEditPondF({name:p.name,type:p.type,lengthFt:p.lengthFt||"",widthFt:p.widthFt||"",notes:p.notes,category:p.category||"Production"});setEditPondId(p.id);setPondMobileMenu(null);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><Pencil size={14}/> Edit</button>
                    <button
                      onClick={()=>{
                        if(p.currentCount>0){alert(`Cannot delete ${p.name}: pond still has ${p.currentCount.toLocaleString()} fish. Remove all fish stock first.`);setPondMobileMenu(null);return;}
                        setDeletePondId(p.id);setPondMobileMenu(null);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${p.currentCount>0?"text-slate-300 cursor-not-allowed":"text-red-500 hover:bg-red-50"}`}
                    ><Trash2 size={14}/> Delete Pond{p.currentCount>0&&<span className="text-[10px] text-slate-300 ml-auto">Not empty</span>}</button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </Card>
      {deletePondId&&(()=>{const p=ponds.find(x=>x.id===deletePondId);return(<Modal title="Delete Pond" onClose={()=>setDeletePondId(null)}><div className="flex flex-col items-center text-center py-2"><div className="w-12 h-12 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-4"><Trash2 size={22} className="text-red-500"/></div><p className="text-sm font-bold text-slate-800 mb-1">Are you sure you want to delete {p?.name}?</p><p className="text-xs text-slate-400 mb-5">This action cannot be undone. The pond and all its records will be permanently removed.</p><div className="flex gap-3 w-full"><button onClick={()=>{onDeletePond&&onDeletePond(deletePondId);setDeletePondId(null);}} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors">Delete Pond</button><button onClick={()=>setDeletePondId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button></div></div></Modal>);})()}
      {editPondId&&<Modal title="Edit Pond" onClose={()=>setEditPondId(null)}>
        <F label="Pond Name"><input value={editPondF.name} onChange={e=>setEditPondF(p=>({...p,name:e.target.value}))} className={IC}/></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Length (ft)"><input type="number" value={editPondF.lengthFt} onChange={e=>setEditPondF(p=>({...p,lengthFt:e.target.value}))} className={IC}/></F>
          <F label="Width (ft)"><input type="number" value={editPondF.widthFt} onChange={e=>setEditPondF(p=>({...p,widthFt:e.target.value}))} className={IC}/></F>
        </div>
        <F label="Pond Type"><select value={editPondF.type} onChange={e=>setEditPondF(p=>({...p,type:e.target.value}))} className={SC}>{POND_TYPES.map(t=><option key={t}>{t}</option>)}</select></F>
        <F label="Pond Category"><select value={editPondF.category} onChange={e=>setEditPondF(p=>({...p,category:e.target.value as "Production"|"Nursery"}))} className={SC}><option>Production</option><option>Nursery</option></select></F>
        <F label="Notes"><textarea value={editPondF.notes} onChange={e=>setEditPondF(p=>({...p,notes:e.target.value}))} className={`${IC} resize-none`} rows={2}/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleSaveEditPond}><CheckCircle size={14}/> Save Changes</PBtn><button onClick={()=>setEditPondId(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showAdd&&<Modal title="Add Pond" onClose={()=>{setShowAdd(false);setAddErr({});}}>
        <div><F label="Pond Name"><input value={addF.name} onChange={e=>{setAddF(p=>({...p,name:e.target.value}));if(e.target.value.trim())setAddErr(p=>({...p,name:""}));}} className={`${IC}${addErr.name?" border-red-400":""}`} placeholder="e.g. Pond 5"/></F>{addErr.name&&<p className="text-xs text-red-500 mt-1">{addErr.name}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Length (ft)"><input type="number" value={addF.lengthFt} onChange={e=>setAddF(p=>({...p,lengthFt:e.target.value}))} className={IC} placeholder="0"/></F>
          <F label="Width (ft)"><input type="number" value={addF.widthFt} onChange={e=>setAddF(p=>({...p,widthFt:e.target.value}))} className={IC} placeholder="0"/></F>
        </div>
        <F label="Pond Type"><select value={addF.type} onChange={e=>setAddF(p=>({...p,type:e.target.value}))} className={SC}>{POND_TYPES.map(t=><option key={t}>{t}</option>)}</select></F>
        <F label="Pond Category"><select value={addF.category} onChange={e=>setAddF(p=>({...p,category:e.target.value as "Production"|"Nursery"}))} className={SC}><option>Production</option><option>Nursery</option></select></F>
        <F label="Notes (Optional)"><textarea value={addF.notes} onChange={e=>setAddF(p=>({...p,notes:e.target.value}))} className={`${IC} resize-none`} rows={2}/></F>
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500">
          After creating a pond, open the pond to add Fish Stock and begin recording feeding, transfers, treatments, and other pond activities.
        </div>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleAddPond}><Plus size={14}/> Create Pond</PBtn><button onClick={()=>{setShowAdd(false);setAddErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showStockHist&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&(setShowStockHist(false),setStockDetailId(null))}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col" style={{maxHeight:"90vh"}}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              {stockDetailId?(
                <div className="flex items-center gap-3">
                  <button onClick={()=>setStockDetailId(null)} className="flex items-center gap-1.5 text-sm text-green-600 font-semibold hover:text-green-800 transition-colors"><ChevronLeft size={16}/> Back to List</button>
                  <span className="text-slate-300">|</span>
                  <div><h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Fish Stock Details</h2></div>
                </div>
              ):(
                <div><h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Fish Stock History</h2><p className="text-xs text-slate-400 mt-0.5">Grouped by stocking date lifecycle</p></div>
              )}
              <div className="flex items-center gap-2">
                {!stockDetailId&&<>
                  <button onClick={()=>downloadCSV("fish-stock-history.csv",["#","Stocking Date","Fish Stock(s)","Supplier(s)","Total Fish (Initial)","Current Fish"],filtStockGroups.map((g,i)=>{const cur=ponds.filter(p=>p.stockingDate===g.stockingDate&&p.status==="Active").reduce((s,p)=>s+p.currentCount,0);return[i+1,g.stockingDate,g.speciesList.join("; "),g.supplierList.join("; ")||"—",g.totalStartCount,cur];}))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:border-green-400 hover:text-green-600 transition-colors"><Download size={12}/> CSV</button>
                  <button onClick={()=>openPrintWindow("Fish Stock History",["#","Stocking Date","Fish Stock(s)","Supplier(s)","Total Fish (Initial)","Current Fish"],filtStockGroups.map((g,i)=>{const cur=ponds.filter(p=>p.stockingDate===g.stockingDate&&p.status==="Active").reduce((s,p)=>s+p.currentCount,0);return[i+1,g.stockingDate,g.speciesList.join(", "),g.supplierList.join(", ")||"—",g.totalStartCount.toLocaleString(),cur.toLocaleString()]}),"Grouped by stocking date lifecycle")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:border-green-400 hover:text-green-600 transition-colors"><FileText size={12}/> PDF</button>
                </>}
                <button onClick={()=>{setShowStockHist(false);setStockDetailId(null);}} className="text-slate-400 hover:text-slate-700 p-1 ml-1"><X size={20}/></button>
              </div>
            </div>

            {/* LIST VIEW */}
            {!stockDetailId&&(<>
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0 flex flex-wrap gap-3 items-center">
                <DateFilter year={stockHistYear} month={stockHistMonth} day={stockHistDay} onYear={setStockHistYear} onMonth={setStockHistMonth} onDay={setStockHistDay} onReset={()=>{setStockHistYear("All");setStockHistMonth("All");setStockHistDay("All");}} dates={[]}/>
                <span className="text-[11px] text-slate-400 ml-auto">{filtStockGroups.length} lifecycle{filtStockGroups.length!==1?"s":""}</span>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="sticky top-0 z-10"><tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left w-10">#</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap sticky left-0 bg-slate-50 z-20 border-r border-slate-200">Stocking Date</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Fish Stock(s)</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Supplier</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Current Fish</th>
                    <th className="px-4 py-3 w-16"/>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtStockGroups.length===0&&<tr><td colSpan={6} className="text-center text-xs text-slate-400 py-10">No fish stock records found.</td></tr>}
                    {filtStockGroups.map((g,i)=>{
                      const totalCurrent=ponds.filter(p=>p.stockingDate===g.stockingDate&&p.status==="Active").reduce((s,p)=>s+p.currentCount,0);
                      return(
                        <tr key={g.key} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={()=>setStockDetailId(g.key)}>
                          <td className="px-4 py-3 text-slate-300 text-xs font-mono">{i+1}</td>
                          <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-slate-100 whitespace-nowrap">
                            <p className="font-bold text-slate-800 text-xs">{fmtStockingDate(g.stockingDate)}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700 text-xs font-semibold">{g.speciesList.join(", ")||"—"}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{g.supplierList.length>0?g.supplierList.join(", "):<span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 font-bold text-green-700 text-xs font-['Barlow_Condensed',sans-serif]">{totalCurrent.toLocaleString()}</td>
                          <td className="px-4 py-3"><button onClick={e=>{e.stopPropagation();setStockDetailId(g.key);}} className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-800 transition-colors"><Eye size={12}/> View</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-2xl">
                <p className="text-xs text-slate-400">{filtStockGroups.length} stocking date lifecycle{filtStockGroups.length!==1?"s":""} · {ponds.length} pond{ponds.length!==1?"s":""}</p>
              </div>
            </>)}

            {/* DETAIL VIEW */}
            {stockDetailId&&(()=>{
              const grp=stockGroups.find(g=>g.key===stockDetailId);
              if(!grp)return <div className="p-8 text-center text-sm text-slate-400">Record not found.</div>;
              const totalCurrentFish=ponds.filter(p=>p.stockingDate===grp.stockingDate&&p.status==="Active").reduce((s,p)=>s+p.currentCount,0);
              const allFeedRecs=feedingRecords.filter(r=>grp.pondNames.includes(r.pond));
              const totalFeedKg=allFeedRecs.reduce((s,r)=>s+r.total,0);
              const bySize=allFeedRecs.reduce<Record<string,number>>((acc,r)=>{acc[r.size]=(acc[r.size]||0)+r.total;return acc;},{});
              const allMort=mortality.filter(m=>grp.pondIds.includes(m.pondId));
              const totalDead=allMort.reduce((s,m)=>s+m.count,0);
              const mortRate=grp.totalStartCount>0?((totalDead/grp.totalStartCount)*100).toFixed(1):"0.0";
              const fmtDate=(d:string)=>{try{return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}catch{return d;}};
              const IC2="bg-slate-50 rounded-xl px-3 py-2.5";
              return(
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {/* Section 1: Stocking Date Aggregate Details */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-0.5">Section 1</p>
                    <p className="text-base font-bold text-slate-800 mb-3">Stocking Date Aggregate Details</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      <div className={IC2}><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Stocking Date</p><p className="text-sm font-bold text-slate-900">{fmtStockingDate(grp.stockingDate)}</p></div>
                      <div className={IC2}><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Fish Stock(s)</p><p className="text-sm font-bold text-slate-900">{grp.speciesList.join(", ")||"—"}</p></div>
                      <div className={IC2}><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Supplier(s)</p><p className="text-sm font-bold text-slate-900">{grp.supplierList.join(", ")||"—"}</p></div>
                      <div className={IC2}><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Initial Total Fish</p><p className="text-sm font-bold text-slate-900">{grp.totalStartCount.toLocaleString()}</p></div>
                      <div className={IC2}><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Current Total Fish</p><p className="text-sm font-bold text-green-700">{totalCurrentFish.toLocaleString()}</p></div>
                      <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5"><p className="text-[10px] text-red-400 uppercase tracking-wider mb-0.5">Total Mortality</p><p className="text-sm font-bold text-red-700">{totalDead.toLocaleString()} fish ({mortRate}%)</p></div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Feed Summary — by Size (Pallet)</p>
                        {totalFeedKg>0&&<span className="text-xs font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">Total: {totalFeedKg}kg</span>}
                      </div>
                      {Object.keys(bySize).length===0?(
                        <p className="text-xs text-slate-400 py-2">No feeding data recorded yet.</p>
                      ):(
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {Object.entries(bySize).sort((a,b)=>{const pa=parseFloat(a[0]);const pb=parseFloat(b[0]);return(isNaN(pa)?-1:pa)-(isNaN(pb)?-1:pb);}).map(([size,kg])=>{
                            const aggMaxKg=grp.pondIds.reduce((s,pid)=>{const pp=ponds.find(x=>x.id===pid);return s+(pp?.maxKgByPallet?.[size]||0);},0)||undefined;
                            const atMax=!!aggMaxKg&&(kg as number)>=(aggMaxKg as number);
                            return(
                              <div key={size} className={`rounded-xl p-3 border flex flex-col gap-2 ${atMax?"bg-red-50 border-red-200":"bg-slate-50 border-slate-200"}`}>
                                <div className="flex items-start gap-1 min-w-0">
                                  <Bdg label={size} color={atMax?"red":"blue"}/>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] text-slate-500 shrink-0">Fed</span>
                                    <span className={`text-xs font-bold font-['Barlow_Condensed',sans-serif] ${atMax?"text-red-600":(kg as number)>0?"text-green-600":"text-slate-400"}`}>{kg} kg</span>
                                  </div>
                                  {aggMaxKg&&(<>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-[10px] text-slate-400 shrink-0">Max</span>
                                      <span className="text-xs font-semibold text-red-500 font-['Barlow_Condensed',sans-serif]">{aggMaxKg} kg</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden"><div className={`h-1 rounded-full transition-all ${atMax?"bg-red-500":"bg-green-500"}`} style={{width:`${Math.min(100,((kg as number)/aggMaxKg)*100)}%`}}/></div>
                                  </>)}
                                  {atMax&&<p className="text-[10px] font-bold text-red-500">⚠ Limit reached</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Individual Pond Breakdown */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-0.5">Section 2</p>
                    <p className="text-base font-bold text-slate-800 mb-3">Individual Pond Breakdown</p>
                    {grp.pondNames.length===0?(
                      <div className="bg-slate-50 rounded-xl px-4 py-4 text-xs text-slate-400 text-center">No pond data available.</div>
                    ):(
                      <div className="space-y-4">
                        {grp.pondNames.map((pondName,pi)=>{
                          const pondId=grp.pondIds[pi];
                          const thisPond=ponds.find(p=>p.id===pondId);
                          const pondFeed=feedingRecords.filter(r=>r.pond===pondName);
                          const pondFeedKg=pondFeed.reduce((s,r)=>s+r.total,0);
                          const pondBySz=pondFeed.reduce<Record<string,number>>((acc,r)=>{acc[r.size]=(acc[r.size]||0)+r.total;return acc;},{});
                          const pondMort=allMort.filter(m=>m.pondId===pondId);
                          const pondDead=pondMort.reduce((s,m)=>s+m.count,0);
                          const initCnt=stockEvents.filter(e=>e.pondId===pondId&&(e.type==="Initial"||e.type==="Restock")).reduce((s,e)=>s+e.count,0)||1;
                          const pondMortRate=((pondDead/initCnt)*100).toFixed(1);
                          const pondTreat=treatments.filter(t=>t.pondId===pondId);
                          const clearedEv=stockEvents.find(e=>e.pondId===pondId&&e.type==="Closed");
                          const hasSale=!!((clearedEv as any)?.salePrice>0);
                          const pondStatus=thisPond?.status==="Active"?"Active":hasSale?"Sold":"Cleared";
                          const statusColor=pondStatus==="Active"?"green":pondStatus==="Sold"?"teal":"gray";
                          return(
                            <div key={pondName} className="border border-slate-200 rounded-xl overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-slate-800 text-sm">{pondName}</p>
                                  {thisPond?.category&&<Bdg label={thisPond.category} color={thisPond.category==="Nursery"?"purple":"teal"}/>}
                                  {thisPond?.species&&thisPond.species!=="—"&&<span className="text-xs text-slate-500">{thisPond.species}</span>}
                                  {thisPond?.stockingDate&&thisPond.stockingDate!=="—"&&<span className="text-[10px] text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5">Stocked {fmtStockingDate(thisPond.stockingDate)}</span>}
                                </div>
                                <Bdg label={pondStatus} color={statusColor as any}/>
                              </div>
                              <div className="p-4 space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  <div className={IC2}><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Fish Count</p><p className="text-sm font-bold text-slate-900">{thisPond?thisPond.currentCount.toLocaleString():"—"}</p></div>
                                  <div className={IC2}><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Total Feed</p><p className="text-sm font-bold text-slate-900">{pondFeedKg} kg</p></div>
                                  <div className={IC2}><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Mortality</p><p className="text-sm font-bold text-slate-900">{pondDead} fish</p></div>
                                  <div className={IC2}><p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Mort. Rate</p><p className="text-sm font-bold text-slate-900">{pondMortRate}%</p></div>
                                </div>
                                {(()=>{
                                  const allSz=Array.from(new Set([...Object.keys(pondBySz),...Object.keys(thisPond?.maxKgByPallet||{})])).sort((a,b)=>{const pa=parseFloat(a);const pb=parseFloat(b);return(isNaN(pa)?-1:pa)-(isNaN(pb)?-1:pb);});
                                  if(allSz.length===0)return null;
                                  return(
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Feed Summary — by Size (Pallet)</p>
                                        {pondFeedKg>0&&<span className="text-xs font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">Total: {pondFeedKg}kg</span>}
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {allSz.map(sz=>{
                                          const currentFeed=pondBySz[sz]||0;
                                          const maxKg=thisPond?.maxKgByPallet?.[sz];
                                          const atMax=!!maxKg&&currentFeed>=maxKg;
                                          return(
                                            <div key={sz} className={`rounded-xl p-3 border flex flex-col gap-2 ${atMax?"bg-red-50 border-red-200":"bg-slate-50 border-slate-200"}`}>
                                              <div className="flex items-start gap-1 min-w-0">
                                                <Bdg label={sz} color={atMax?"red":"blue"}/>
                                              </div>
                                              <div className="space-y-1">
                                                <div className="flex items-center justify-between gap-1">
                                                  <span className="text-[10px] text-slate-500 shrink-0">Fed</span>
                                                  <span className={`text-xs font-bold font-['Barlow_Condensed',sans-serif] ${atMax?"text-red-600":currentFeed>0?"text-green-600":"text-slate-400"}`}>{currentFeed} kg</span>
                                                </div>
                                                {maxKg&&(<>
                                                  <div className="flex items-center justify-between gap-1">
                                                    <span className="text-[10px] text-slate-400 shrink-0">Max</span>
                                                    <span className="text-xs font-semibold text-red-500 font-['Barlow_Condensed',sans-serif]">{maxKg} kg</span>
                                                  </div>
                                                  <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden"><div className={`h-1 rounded-full transition-all ${atMax?"bg-red-500":"bg-green-500"}`} style={{width:`${Math.min(100,(currentFeed/maxKg)*100)}%`}}/></div>
                                                </>)}
                                                {atMax&&<p className="text-[10px] font-bold text-red-500">⚠ Limit reached</p>}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                                {pondTreat.length>0&&(
                                  <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Treatment History</p>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs min-w-[380px]">
                                        <thead><tr className="border-b border-slate-100"><th className="pb-1.5 pr-3 text-left text-slate-400 font-semibold">Date</th><th className="pb-1.5 pr-3 text-left text-slate-400 font-semibold">Medicine</th><th className="pb-1.5 pr-3 text-left text-slate-400 font-semibold">Cause</th><th className="pb-1.5 text-left text-slate-400 font-semibold">Remarks</th></tr></thead>
                                        <tbody className="divide-y divide-slate-50">{pondTreat.map(t=><tr key={t.id} className="hover:bg-slate-50"><td className="py-1.5 pr-3 text-slate-500 whitespace-nowrap">{t.date}</td><td className="py-1.5 pr-3 font-semibold text-slate-700">{t.medicine}</td><td className="py-1.5 pr-3 text-slate-500">{t.cause||"—"}</td><td className="py-1.5 text-slate-400">{t.remarks||"—"}</td></tr>)}</tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                                {clearedEv&&<p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">{hasSale?"Date Sold":"Date Cleared"}: {clearedEv.clearedDate||clearedEv.date}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
