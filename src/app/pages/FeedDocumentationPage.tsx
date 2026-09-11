import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus, CheckCircle, X, Layers, Droplets,
  ChevronDown, ChevronLeft, ChevronRight,
  Package, BookOpen, Download, FileText, Pencil, MoreVertical, Lock, History, Fish
} from "lucide-react";
import type { FeedingRecord, FeedEditEntry, Pond, FeedItem, BagOpenLog, FeedRemainingLog } from "../types";
import { TODAY, toMon, toYr, uid, downloadCSV, openPrintWindow, fmtStockingDate, isSameDate } from "../data";
import { Card, PBtn, Pagination, PER_PAGE, StatCard, F, IC, SC, SearchableSelect, Bdg, DateInput, NumInput } from "../shared";

interface BulkRow { pondId:string; pondName:string; initialStock:number; currentCount:number; brand:string; size:string; morning:string; evening:string; morningTime:string; eveningTime:string; fishStock:string; }

const MON_NAMES=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_ABBR=["Su","Mo","Tu","We","Th","Fr","Sa"];
const MIDX_GLOBAL:{[k:string]:number}={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
type ReconStatus="matched"|"remaining_mismatch"|"bag_mismatch"|"feed_qty_mismatch"|"multiple_mismatches";
const STATUS_CFG:{[k:string]:{cls:string;label:string;rowBg:string}}={
  matched:{cls:"bg-green-100 text-green-700",label:"🟢 Matched",rowBg:"hover:bg-slate-50"},
  remaining_mismatch:{cls:"bg-amber-100 text-amber-700",label:"🟡 Remaining Mismatch",rowBg:"bg-amber-50/20 hover:bg-amber-50/50"},
  bag_mismatch:{cls:"bg-orange-100 text-orange-700",label:"🟠 Bag Count Mismatch",rowBg:"bg-orange-50/20 hover:bg-orange-50/50"},
  feed_qty_mismatch:{cls:"bg-red-100 text-red-600",label:"🔴 Feed Qty Mismatch",rowBg:"bg-red-50/20 hover:bg-red-50/50"},
  multiple_mismatches:{cls:"bg-red-200 text-red-800",label:"⛔ Multiple Mismatches",rowBg:"bg-red-50/30 hover:bg-red-50/60"},
};

const toDateLabel = (dStr: string): string => {
  if (!dStr) return "";
  const trimmed = dStr.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const mIdx = parseInt(iso[2], 10) - 1;
    const day = parseInt(iso[3], 10);
    return `${MON_NAMES[mIdx] || iso[2]} ${day}`;
  }
  return trimmed;
};

function FeedDocumentation({
  feedingRecords = [],
  onAddRecord,
  onEditFeedRecord,
  ponds = [],
  inventory = [],
  bagLogs = [],
  onAddBagLog,
  onEditBagLog,
  onEditInv,
  remainLogs = [],
  onAddRemainLog,
  onEditRemainLog,
  onReconMismatches,
  reconFocus,
  canEditLocked,
  currentUser
}:{
  feedingRecords:FeedingRecord[];
  onAddRecord:(r:FeedingRecord)=>void|Promise<void>;
  onEditFeedRecord:(r:FeedingRecord)=>void|Promise<void>;
  ponds:Pond[];
  inventory:FeedItem[];
  bagLogs:BagOpenLog[];
  onAddBagLog:(b:BagOpenLog)=>void|Promise<void>;
  onEditBagLog?:(b:BagOpenLog)=>void|Promise<void>;
  onEditInv?:(f:FeedItem)=>void;
  remainLogs:FeedRemainingLog[];
  onAddRemainLog:(r:FeedRemainingLog)=>void|Promise<void>;
  onEditRemainLog:(r:FeedRemainingLog)=>void|Promise<void>;
  onReconMismatches?:(m:{date:string;brand:string;size:string;fishStock:string;key:string;status:string;reason:string}[])=>void;
  reconFocus?:{date:string;key:string}|null;
  canEditLocked?:boolean;
  currentUser?:{name:string;email:string};
}) {
  const realTodayLabel=(()=>{const n=new Date();return `${MON_NAMES[n.getMonth()]} ${n.getDate()}`;})();
  const isRecordEditable=(dateLabel?:string|null)=>canEditLocked||(dateLabel?isSameDate(dateLabel,TODAY)||isSameDate(dateLabel,realTodayLabel):false);
  /* ── ui state ── */
  const [showLog,setShowLog]=useState(false);
  const [feedErr,setFeedErr]=useState<Record<string,string>>({});
  const [showCal,setShowCal]=useState(false);
  const [showBagsModal,setShowBagsModal]=useState(false);
  const [bagsErr,setBagsErr]=useState<Record<string,string>>({});
  const [showRemainModal,setShowRemainModal]=useState(false);
  const [docTab,setDocTab]=useState<"daily"|"bags"|"reconciliation">("daily");
  const [reconExpanded,setReconExpanded]=useState<string|null>(null);
  const [feedMobileMenuOpen,setFeedMobileMenuOpen]=useState(false);
  const feedMobileMenuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(feedMobileMenuRef.current&&!feedMobileMenuRef.current.contains(e.target as Node))setFeedMobileMenuOpen(false);};
    if(feedMobileMenuOpen)document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[feedMobileMenuOpen]);

  /* ── derived ── */
  const activePonds=(ponds||[]).filter(p=>p&&p.status==="Active");
  const allBrands=[...new Set((inventory||[]).map(f=>f?.brand).filter(Boolean))];
  /* brands/sizes with remaining stock (for dropdowns in Log Feeding & Log Bags Opened) */
  const invByKey=(inventory||[]).reduce<Record<string,number>>((acc,f)=>{if(!f)return acc;const k=`${f.brand}|${f.size}`;acc[k]=(acc[k]||0)+(Number(f.bags)||0);return acc;},{});
  const openedByKey=(bagLogs||[]).reduce<Record<string,number>>((acc,b)=>{if(!b)return acc;const k=`${b.brand}|${b.size}`;acc[k]=(acc[k]||0)+(Number(b.bagsOpened)||0);return acc;},{});
  const inStockCombos=Object.entries(invByKey).filter(([k,total])=>Math.max(0,total-(openedByKey[k]||0))>0).map(([k])=>k);
  const inStockBrands=[...new Set(inStockCombos.map(k=>k.split("|")[0]))];
  const invBrands=inStockBrands.length>0?inStockBrands:allBrands;
  const invSizesForBrand=(brand:string)=>{
    const fromCombos=[...new Set(inStockCombos.filter(k=>k.startsWith(brand+"|")).map(k=>k.split("|")[1]))];
    if(fromCombos.length>0)return fromCombos;
    return [...new Set((inventory||[]).filter(f=>f?.brand===brand).map(f=>f.size).filter(Boolean))];
  };

  /* ── calendar ── */
  const _td=new Date();
  const [viewYear,setViewYear]=useState(_td.getFullYear());
  const [viewMonth,setViewMonth]=useState(_td.getMonth());
  const [selDate,setSelDate]=useState(`${MON_NAMES[_td.getMonth()]} ${_td.getDate()}`);
  const navMonth=(dir:number)=>{let m=viewMonth+dir,y=viewYear;if(m<0){m=11;y--;}if(m>11){m=0;y++;}setViewMonth(m);setViewYear(y);};
  const curMonLabel=MON_NAMES[viewMonth];
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const firstDayOfWeek=new Date(viewYear,viewMonth,1).getDay();
  const calCells=Array(42).fill(null).map((_,i)=>{const d=i-firstDayOfWeek+1;return(d>=1&&d<=daysInMonth)?d:null;});

  const daysWithRec=useMemo(()=>{
    const set=new Set<number>();
    const processDate=(dStrRaw?:string|null, mStr?:string|null, yNum?:number|null)=>{
      if(!dStrRaw)return;
      const dStr=String(dStrRaw).trim();
      if(mStr===curMonLabel && (!yNum||yNum===viewYear)){
        const parts=dStr.split(" ");
        if(parts.length>=2){
          const d=parseInt(parts[1],10);
          if(!isNaN(d)){set.add(d);return;}
        }
      }
      const iso=dStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if(iso){
        const y=parseInt(iso[1],10);
        const m=parseInt(iso[2],10);
        const d=parseInt(iso[3],10);
        if(y===viewYear && m===(viewMonth+1) && !isNaN(d)){set.add(d);return;}
      }
      const mon=dStr.match(/^([A-Za-z]{3})\s+(\d{1,2})/);
      if(mon){
        const mName=mon[1];
        const d=parseInt(mon[2],10);
        if(mName.toLowerCase()===curMonLabel.toLowerCase()&&(!yNum||yNum===viewYear)&&!isNaN(d)){
          set.add(d);return;
        }
      }
    };
    (feedingRecords||[]).forEach(r=>r&&processDate(r.date,r.month,r.year));
    (bagLogs||[]).forEach(b=>b&&processDate(b.date,b.month,b.year));
    (remainLogs||[]).forEach(rem=>rem&&processDate(rem.date,rem.month,rem.year));
    return set;
  },[feedingRecords,bagLogs,remainLogs,curMonLabel,viewYear,viewMonth]);

  const {selMonLabel,selDay,selYear}=useMemo(()=>{
    if(!selDate)return{selMonLabel:curMonLabel,selDay:0,selYear:viewYear};
    const iso=selDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(iso){
      const y=parseInt(iso[1],10);
      const m=parseInt(iso[2],10)-1;
      const d=parseInt(iso[3],10);
      return{selMonLabel:MON_NAMES[m]||curMonLabel,selDay:d,selYear:y};
    }
    const parts=selDate.trim().split(" ");
    if(parts.length>=2){
      return{selMonLabel:parts[0],selDay:parseInt(parts[1],10)||0,selYear:viewYear};
    }
    return{selMonLabel:curMonLabel,selDay:0,selYear:viewYear};
  },[selDate,curMonLabel,viewYear]);
  const isSelInView=selMonLabel===curMonLabel&&(!selYear||selYear===viewYear);

  /* ── pondToStock helper ── */
  const pondToStock=(pondName:string)=>{
    const p=(ponds||[]).find(x=>x&&x.name===pondName);
    if(!p) return pondName;
    if(p.species && p.species !== "—"){
      return `${p.species}${p.stockingDate && p.stockingDate !== "—" ? ` (${p.stockingDate})` : ""}`;
    }
    return pondName;
  };

  /* ── reconFocus effect ── */
  useEffect(()=>{
    if(!reconFocus||!reconFocus.date)return;
    let m=viewMonth;
    if(/^\d{4}-\d{2}-\d{2}/.test(reconFocus.date)){
      const parts=reconFocus.date.split("-");
      m=parseInt(parts[1],10)-1;
      setViewYear(parseInt(parts[0],10));
    } else {
      const parts=reconFocus.date.split(" ");
      m=MIDX_GLOBAL[parts[0]]??viewMonth;
    }
    setViewMonth(m);setDocTab("reconciliation");setSelDate(reconFocus.date);setReconExpanded(reconFocus.key);
  },[reconFocus]);

  /* ── ReconRow type ── */
  type ReconRow={fishStock:string;brand:string;size:string;ponds:string[];totalFed:number;carryover:number;netNeeded:number;bagWeight:number;expectedBags:number;recordedBags:number;expectedRemaining:number;recordedRemaining:number;status:ReconStatus;reason:string;};

  /* ── reconRows (selDate only, grouped by Brand+Size+FishStock) ── */
  const reconRows=useMemo(():ReconRow[]=>{
    const mIdx=MIDX_GLOBAL[selMonLabel]??viewMonth;
    const prevDt=new Date(selYear||viewYear,mIdx,(selDay||1)-1);
    const prevDate=`${MON_NAMES[prevDt.getMonth()]} ${prevDt.getDate()}`;
    const keySet=new Set<string>();
    (feedingRecords||[]).filter(r=>r&&isSameDate(r.date,selDate)).forEach(r=>{
      const fs=pondToStock(r.pond);
      keySet.add(`${r.brand||"—"}||${r.size||"—"}||${fs}`);
    });
    (bagLogs||[]).filter(b=>b&&isSameDate(b.date,selDate)).forEach(b=>{
      if(b.fishStock) keySet.add(`${b.brand||"—"}||${b.size||"—"}||${b.fishStock}`);
    });
    (remainLogs||[]).filter(r=>r&&isSameDate(r.date,selDate)).forEach(r=>{
      if(r.fishStock) keySet.add(`${r.brand||"—"}||${r.size||"—"}||${r.fishStock}`);
    });

    const rows:ReconRow[]=[];
    for(const compositeKey of Array.from(keySet)){
      const parts=compositeKey.split("||");
      const brand=parts[0];const size=parts[1];const fishStock=parts.slice(2).join("||");
      const pondsForStock=(ponds||[]).filter(p=>p&&pondToStock(p.name)===fishStock).map(p=>p.name);
      const fedRecords=(feedingRecords||[]).filter(r=>r&&isSameDate(r.date,selDate)&&r.brand===brand&&r.size===size&&(pondsForStock.length===0||pondsForStock.includes(r.pond))&&(Number(r.total)>0||Number(r.morning)>0||Number(r.evening)>0));
      const fedPonds=Array.from(new Set(fedRecords.map(r=>r.pond).filter(Boolean)));
      const totalFed=(feedingRecords||[]).filter(r=>r&&isSameDate(r.date,selDate)&&r.brand===brand&&r.size===size&&(pondsForStock.length===0||pondsForStock.includes(r.pond))).reduce((s,r)=>s+(Number(r.total)||0),0);
      const carryover=(remainLogs||[]).filter(r=>r&&isSameDate(r.date,prevDate)&&r.brand===brand&&r.size===size&&r.fishStock===fishStock).reduce((s,r)=>s+(Number(r.remainingKg)||0),0);
      const recordedBags=(bagLogs||[]).filter(b=>b&&isSameDate(b.date,selDate)&&b.brand===brand&&b.size===size&&(!b.fishStock||b.fishStock===fishStock)).reduce((s,b)=>s+(Number(b.bagsOpened)||0),0);
      const recordedRemaining=(remainLogs||[]).filter(r=>r&&isSameDate(r.date,selDate)&&r.brand===brand&&r.size===size&&r.fishStock===fishStock).reduce((s,r)=>s+(Number(r.remainingKg)||0),0);
      
      // If neither feed nor bags nor remaining was logged, skip
      if(totalFed===0 && recordedBags===0 && recordedRemaining===0) continue;

      const bagWeight=(inventory||[]).find(f=>f&&f.brand===brand&&f.size===size)?.weightPerBag||15;
      const netNeeded=Math.max(0,totalFed-carryover);
      const expectedBags=netNeeded===0?0:Math.ceil(netNeeded/bagWeight);
      const expectedRemaining=Math.max(0,carryover+(expectedBags*bagWeight)-totalFed);
      const bagsDiff=Math.abs(expectedBags-recordedBags);
      const remainDiff=Math.abs(expectedRemaining-recordedRemaining);
      const feedQtyIssue=recordedBags>0&&totalFed>carryover+(recordedBags*bagWeight)+0.01;
      let status:ReconStatus;let reason="";
      if(feedQtyIssue){status="feed_qty_mismatch";reason=`Feed given (${totalFed}kg) exceeds available (carryover ${carryover}kg + bags ${recordedBags*bagWeight}kg).`;}
      else if(totalFed===0&&recordedBags>0){status="bag_mismatch";reason=`${recordedBags} bag${recordedBags>1?"s":""} opened (${recordedBags*bagWeight}kg); daily feeding session pending.`;}
      else if(bagsDiff>0&&remainDiff>=1){status="multiple_mismatches";reason=`Bags: expected ${expectedBags}, recorded ${recordedBags}. Remaining: expected ${expectedRemaining}kg, recorded ${recordedRemaining}kg.`;}
      else if(bagsDiff>0){status="bag_mismatch";reason=`Expected ${expectedBags} bags opened, recorded ${recordedBags}.`;}
      else if(remainDiff>=1){status="remaining_mismatch";reason=`Expected ${expectedRemaining}kg remaining, recorded ${recordedRemaining}kg.`;}
      else{status="matched";}
      rows.push({fishStock,brand,size,ponds:fedPonds,totalFed,carryover,netNeeded,bagWeight,expectedBags,recordedBags,expectedRemaining,recordedRemaining,status,reason});
    }
    return rows;
  },[feedingRecords,bagLogs,inventory,remainLogs,selDate,selMonLabel,selDay,selYear,viewYear,viewMonth,ponds]);

  /* ── reconciliation notifications ── */
  const onReconMismatchesRef=useRef(onReconMismatches);
  onReconMismatchesRef.current=onReconMismatches;
  const prevMismatchKeyRef=useRef<string>("");
  useEffect(()=>{
    if(!onReconMismatchesRef.current)return;
    const ms=reconRows.filter(r=>r.status!=="matched").map(r=>({date:selDate,brand:r.brand,size:r.size,fishStock:r.fishStock,key:`${r.brand}__${r.size}`,status:r.status,reason:r.reason}));
    const key=ms.map(m=>`${m.date}|${m.key}|${m.status}`).join(",");
    if(key===prevMismatchKeyRef.current)return;
    prevMismatchKeyRef.current=key;
    onReconMismatchesRef.current(ms);
  },[reconRows,selDate]);

  const hasMismatchOnSelDate=reconRows.some(r=>r.status!=="matched");

  /* ── popup recon ── */
  const [popupRecon,setPopupRecon]=useState<ReconRow|null>(null);

  /* ── day view ── */
  const dayRecords=(feedingRecords||[]).filter(r=>r&&isSameDate(r.date,selDate));
  const dayGrand=dayRecords.reduce((s,r)=>s+(Number(r.total)||0),0);
  const dayRows=activePonds.map(pond=>{const rec=dayRecords.find(r=>r.pond===pond.name);return{pond,rec};});

  /* ── edit feed record state ── */
  const [editRec,setEditRec]=useState<FeedingRecord|null>(null);
  const [viewFeedRec,setViewFeedRec]=useState<FeedingRecord|null>(null);

  const openEditRec=(rec:FeedingRecord)=>setEditRec({...rec});

  const handleSaveEditAll=()=>{
    if(!editRec)return;
    const original=(feedingRecords||[]).find(r=>r.id===editRec.id);
    const newM=editRec.morning;const newE=editRec.evening;
    const hasChange=newM!==(original?.morning??0)||newE!==(original?.evening??0);
    const now=new Date().toLocaleString("en",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
    const entry:FeedEditEntry={originalMorning:original?.morning??0,updatedMorning:newM,originalEvening:original?.evening??0,updatedEvening:newE,editedAt:now,editedBy:currentUser?.name||"—",editedById:currentUser?.email||""};
    onEditFeedRecord({...editRec,total:newM+newE,editHistory:hasChange?[...(editRec.editHistory||[]),entry]:(editRec.editHistory||[])});
    setEditRec(null);
  };

  /* ── edit bag state ── */
  const [editDocBag,setEditDocBag]=useState<BagOpenLog|null>(null);
  const [editBagRemainKg,setEditBagRemainKg]=useState("");

  const openEditDocBag=(b:BagOpenLog)=>{
    setEditDocBag({...b});
    const fs=b.fishStock||"";
    const existing=(remainLogs||[]).find(r=>isSameDate(r.date,b.date)&&r.brand===b.brand&&r.size===b.size&&r.fishStock===fs);
    setEditBagRemainKg(existing?String(existing.remainingKg):"");
  };

  const handleSaveEditDocBag=()=>{
    if(!editDocBag)return;
    onEditBagLog&&onEditBagLog({...editDocBag,totalKg:editDocBag.bagsOpened*editDocBag.kgPerBag});
    const remKg=Number(editBagRemainKg);
    const fs=editDocBag.fishStock||"";
    if(remKg>0&&fs){
      const existing=(remainLogs||[]).find(r=>r.brand===editDocBag.brand&&r.size===editDocBag.size&&r.fishStock===fs&&isSameDate(r.date,editDocBag.date));
      if(existing){onEditRemainLog({...existing,remainingKg:remKg});}
      else{onAddRemainLog({id:uid(),brand:editDocBag.brand,size:editDocBag.size,fishStock:fs,remainingKg:remKg,date:editDocBag.date});}
    }
    setEditDocBag(null);
  };

  /* ── bags opened modal state ── */
  const [bagsDate,setBagsDate]=useState(TODAY);
  type BagRow={brand:string;size:string;kgPerBag:number;qty:string;fishStock:string};
  const blankBagRow=():BagRow=>{const inv=(inventory||[])[0];const b=inv?.brand||invBrands[0]||allBrands[0]||"";const s=inv?.size||invSizesForBrand(b)[0]||"";return{brand:b,size:s,kgPerBag:inv?.weightPerBag||0,qty:"",fishStock:""};};
  const [bagRows,setBagRows]=useState<BagRow[]>([]);
  const openBagsModal=()=>{setBagRows([blankBagRow()]);setShowBagsModal(true);};
  const addBagRow=()=>setBagRows(prev=>[...prev,blankBagRow()]);
  const removeBagRow=(i:number)=>setBagRows(prev=>prev.filter((_,idx)=>idx!==i));
  const updateBagRow=(i:number,k:keyof BagRow,v:string)=>setBagRows(prev=>prev.map((r,idx)=>{
    if(idx!==i)return r;
    const u={...r,[k]:v};
    if(k==="brand"||k==="size"){const inv=(inventory||[]).find(f=>f&&f.brand===(k==="brand"?v:r.brand)&&f.size===(k==="size"?v:r.size));u.kgPerBag=inv?.weightPerBag||0;}
    return u;
  }));
  const filledBagRows=bagRows.filter(r=>Number(r.qty)>0);
  const handleSaveBags=()=>{
    const errs:Record<string,string>={};
    if(!filledBagRows.length)errs.entries="Please enter at least one bags-opened entry";
    const missingFS=filledBagRows.find(r=>!r.fishStock);
    if(missingFS)errs.fishStock="Fish Stock is required for every entry";
    const missingBrand=filledBagRows.find(r=>!r.brand);
    if(missingBrand)errs.brand="Feed Brand is required for every entry";
    if(!bagsDate)errs.date="Date is required";
    if(Object.keys(errs).length){setBagsErr(errs);return;}
    setBagsErr({});
    const dateLabel=toDateLabel(bagsDate);
    filledBagRows.forEach(r=>{
      const n=Number(r.qty);
      onAddBagLog({id:uid(),date:dateLabel,month:toMon(bagsDate),year:toYr(bagsDate),brand:r.brand,size:r.size,kgPerBag:r.kgPerBag,bagsOpened:n,totalKg:n*r.kgPerBag,fishStock:r.fishStock||undefined});
    });
    setSelDate(dateLabel);
    setDocTab("bags");
    setShowBagsModal(false);
  };

  /* ── merged bags rows for display ── */
  type MergedBagRow={brand:string;size:string;fishStock:string;bagsOpened:number;remainingKg:number;lastBagLog:BagOpenLog|null};
  const mergedBagRows=useMemo(():MergedBagRow[]=>{
    const dayBagLogs=(bagLogs||[]).filter(b=>b&&isSameDate(b.date,selDate));
    const map=new Map<string,MergedBagRow>();
    dayBagLogs.forEach(b=>{
      const fs=b.fishStock||"—";
      const k=`${b.brand}||${b.size}||${fs}`;
      const existing=map.get(k);
      if(existing){existing.bagsOpened+=(Number(b.bagsOpened)||0);existing.lastBagLog=b;}
      else{map.set(k,{brand:b.brand,size:b.size,fishStock:fs,bagsOpened:Number(b.bagsOpened)||0,remainingKg:0,lastBagLog:b});}
    });
    const dayRemainLogs=(remainLogs||[]).filter(r=>r&&isSameDate(r.date,selDate));
    dayRemainLogs.forEach(r=>{
      const k=`${r.brand}||${r.size}||${r.fishStock}`;
      const existing=map.get(k);
      if(existing){existing.remainingKg+=(Number(r.remainingKg)||0);}
      else{map.set(k,{brand:r.brand,size:r.size,fishStock:r.fishStock,bagsOpened:0,remainingKg:Number(r.remainingKg)||0,lastBagLog:null});}
    });
    return Array.from(map.values());
  },[bagLogs,remainLogs,selDate]);

  /* ── log remaining feed state ── */
  type RemainRow={brand:string;size:string;fishStock:string;remainingKg:string};
  const blankRemainRow=():RemainRow=>({brand:invBrands[0]||allBrands[0]||"",size:invSizesForBrand(invBrands[0]||allBrands[0]||"")[0]||"",fishStock:"",remainingKg:""});
  const [remainRows,setRemainRows]=useState<RemainRow[]>([blankRemainRow()]);
  const addRemainRow=()=>setRemainRows(prev=>[...prev,blankRemainRow()]);
  const removeRemainRow=(i:number)=>setRemainRows(prev=>prev.filter((_,idx)=>idx!==i));
  const updateRemainRow=(i:number,k:keyof RemainRow,v:string)=>setRemainRows(prev=>prev.map((r,idx)=>idx!==i?r:{...r,[k]:v}));
  const openRemainModal=()=>{setRemainRows([blankRemainRow()]);setShowRemainModal(true);};
  const [remainValidErr,setRemainValidErr]=useState("");
  const handleSaveRemain=()=>{
    const invalid=remainRows.find(r=>!r.brand||!r.size||!r.fishStock||!(Number(r.remainingKg)>0));
    if(invalid){setRemainValidErr("All fields are required. Please complete Feed Brand, Pellet Size, Fish Stock, and Remaining Feed for every entry.");return;}
    setRemainValidErr("");
    remainRows.forEach(r=>onAddRemainLog({id:uid(),brand:r.brand,size:r.size,fishStock:r.fishStock,remainingKg:Number(r.remainingKg),date:selDate}));
    setShowRemainModal(false);
  };

  /* ── edit remain log (legacy) ── */
  const [editRemainLog,setEditRemainLog]=useState<FeedRemainingLog|null>(null);
  const handleSaveEditRemain=()=>{if(!editRemainLog)return;onEditRemainLog(editRemainLog);setEditRemainLog(null);};

  /* ── bulk log ── */
  const [bulkDate,setBulkDate]=useState(TODAY);
  const [bulkBy,setBulkBy]=useState("");
  const [bulkRows,setBulkRows]=useState<BulkRow[]>([]);
  const [savingFeed,setSavingFeed]=useState(false);
  const nowTime=()=>new Date().toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit",hour12:false});
  const [logTime]=useState(nowTime);

  const getRowsForDate=(targetDate:string)=>{
    const dateLabel=toDateLabel(targetDate);
    return activePonds.map(p=>{
      const existing=(feedingRecords||[]).find(r=>r&&r.pond===p.name&&(isSameDate(r.date,targetDate)||r.date===dateLabel));
      const defBrand=existing?.brand||invBrands[0]||allBrands[0]||"";
      const defSize=existing?.size||invSizesForBrand(defBrand)[0]||"";
      return {
        pondId:p.id,
        pondName:p.name,
        initialStock:p.initialStock||0,
        currentCount:p.currentCount||0,
        brand:defBrand,
        size:defSize,
        morning:existing?(existing.morning!=null?String(existing.morning):""):"",
        evening:existing?(existing.evening!=null?String(existing.evening):""):"",
        morningTime:existing?.morningTime||"",
        eveningTime:existing?.eveningTime||"",
        fishStock:p.species&&p.species!=="—"?`${p.species}${p.stockingDate?` (${p.stockingDate})`:""}`:""
      };
    });
  };

  const openLog=()=>{
    let initialDate = TODAY;
    if (/^\d{4}-\d{2}-\d{2}/.test(selDate)) {
      initialDate = selDate.slice(0, 10);
    } else {
      const parts = selDate.trim().split(" ");
      if (parts.length >= 2) {
        const mIdx = MIDX_GLOBAL[parts[0]];
        const d = parseInt(parts[1], 10);
        if (mIdx !== undefined && !isNaN(d)) {
          initialDate = `${viewYear}-${String(mIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
      }
    }
    setBulkDate(initialDate);
    setBulkRows(getRowsForDate(initialDate));
    setShowLog(true);
  };

  const handleBulkDateChange=(newDate:string)=>{
    setBulkDate(newDate);
    if(newDate) {
      setFeedErr(p=>({...p,date:""}));
      setBulkRows(getRowsForDate(newDate));
    }
  };

  const updateRow=(pondId:string,field:keyof BulkRow,value:string)=>setBulkRows(prev=>prev.map(r=>r.pondId===pondId?{...r,[field]:value}:r));
  const filledCount=bulkRows.filter(r=>r.morning||r.evening).length;
  const grandTotal=bulkRows.reduce((s,r)=>{const m=Number(r.morning)||0;const e=Number(r.evening)||0;return s+m+e;},0);

  const handleSaveAll=async()=>{
    const errs:Record<string,string>={};
    if(!filledCount)errs.amounts="Please enter at least one feeding amount";
    if(!bulkDate)errs.date="Date is required";
    if(Object.keys(errs).length){setFeedErr(errs);return;}
    setFeedErr({});
    setSavingFeed(true);

    const dateLabel=toDateLabel(bulkDate);
    const now=new Date().toLocaleString("en",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});

    try {
      for (const r of bulkRows) {
        const m=Number(r.morning)||0;
        const e=Number(r.evening)||0;
        if(m>0||e>0){
          const existing=(feedingRecords||[]).find(x=>x&&x.pond===r.pondName&&(isSameDate(x.date,bulkDate)||x.date===dateLabel));
          if(existing){
            const hasChange=m!==existing.morning||e!==existing.evening;
            const entry:FeedEditEntry={
              originalMorning:existing.morning,
              updatedMorning:m,
              originalEvening:existing.evening,
              updatedEvening:e,
              editedAt:now,
              editedBy:bulkBy||"—",
              editedById:""
            };
            await onEditFeedRecord({
              ...existing,
              brand:r.brand,
              size:r.size,
              morning:m,
              evening:e,
              total:m+e,
              recordedBy:bulkBy||existing.recordedBy,
              morningTime:r.morningTime||existing.morningTime,
              eveningTime:r.eveningTime||existing.eveningTime,
              editHistory:hasChange?[...(existing.editHistory||[]),entry]:(existing.editHistory||[])
            });
          } else {
            await onAddRecord({
              id:uid(),
              date:dateLabel,
              month:toMon(bulkDate),
              year:toYr(bulkDate),
              pond:r.pondName,
              brand:r.brand,
              size:r.size,
              morning:m,
              evening:e,
              total:m+e,
              recordedBy:bulkBy||"—",
              morningTime:r.morningTime||undefined,
              eveningTime:r.eveningTime||undefined
            });
          }
        }
      }
      if (bulkDate) {
        const iso = bulkDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) {
          setViewYear(parseInt(iso[1], 10));
          setViewMonth(parseInt(iso[2], 10) - 1);
        }
      }
      setSelDate(dateLabel);
      setShowLog(false);
    } catch(err:any) {
      console.error("Error saving feeding records:", err);
      setFeedErr({amounts: "Failed to save records. Please check connection."});
    } finally {
      setSavingFeed(false);
    }
  };

  /* ── download helpers ── */
  const downloadDayCSV=()=>{
    const headers=["Pond","Brand","Size","Morning (kg)","AM Time","Evening (kg)","PM Time","Total (kg)","Recorded By"];
    const feedRows=dayRows.filter(({rec})=>!!rec).map(({pond,rec})=>[pond.name,rec!.brand,rec!.size,String(rec!.morning),rec!.morningTime||"—",String(rec!.evening),rec!.eveningTime||"—",rec!.total+"kg",rec!.recordedBy]);
    downloadCSV(`feeding-records-${selDate.replace(/\s+/g,"-")}.csv`,headers,feedRows);
  };
  const downloadDayPDF=()=>{
    const headers=["Pond","Brand","Size","Morning+Evening","Total","Recorded By"];
    const feedRows=dayRows.filter(({rec})=>!!rec).map(({pond,rec})=>[pond.name,rec!.brand,rec!.size,`${rec!.morning}+${rec!.evening}kg`,rec!.total+"kg",rec!.recordedBy]);
    openPrintWindow(`Feeding Records — ${selDate}`,headers,feedRows,`${dayRecords.length} session${dayRecords.length!==1?"s":""} · ${dayGrand}kg total`);
  };

  /* ── inline styles ── */
  const TI="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-300 text-center";
  const TS="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-300";

  return(
    <div className="p-4 sm:p-6 space-y-5 max-w-[1300px]">
      {/* ── Header ── */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feeding Records</h1>
              <p className="text-xs text-slate-400 mt-1">Record and review daily feeding sessions across all active ponds.</p>
            </div>
            <div className="shrinking-0 relative" ref={feedMobileMenuRef}>
              <button onClick={()=>setFeedMobileMenuOpen(p=>!p)} className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-green-400 hover:text-green-600 transition-colors"><MoreVertical size={15}/></button>
              {feedMobileMenuOpen&&(
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[150px]">
                  <button onClick={()=>{downloadDayCSV();setFeedMobileMenuOpen(false);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><Download size={13}/> Export CSV</button>
                  <button onClick={()=>{downloadDayPDF();setFeedMobileMenuOpen(false);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><FileText size={13}/> Export PDF</button>
                </div>
              )}
            </div>
          </div>
          {/* Date selector */}
          <div className="relative">
            <button onClick={()=>setShowCal(p=>!p)} className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-green-400 hover:shadow-md transition-all text-sm font-semibold text-slate-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              <span className="font-['Barlow_Condensed',sans-serif] text-base tracking-tight">{selDate}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showCal?"rotate-180":""}`}/>
            </button>
            {showCal&&(<>
              <div className="fixed inset-0 z-20" onClick={()=>setShowCal(false)}/>
              <div className="absolute left-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-[280px]">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={()=>navMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"><ChevronLeft size={15}/></button>
                  <span className="text-sm font-bold text-slate-800 font-['Barlow_Condensed',sans-serif] tracking-wide">{curMonLabel} {viewYear}</span>
                  <button onClick={()=>navMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"><ChevronRight size={15}/></button>
                </div>
                <div className="grid grid-cols-7 mb-1">{DAY_ABBR.map(d=><div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-y-1">
                  {calCells.map((day,i)=>{
                    if(!day)return<div key={i}/>;
                    const label=`${curMonLabel} ${day}`;
                    const hasRec=daysWithRec.has(day);
                    const isSel=isSelInView&&day===selDay;
                    return(
                      <button key={i} onClick={()=>{setSelDate(label);setShowCal(false);}} className={`relative flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-full text-sm transition-all ${isSel?"bg-green-600 text-white font-semibold shadow-sm":hasRec?"text-slate-800 font-medium hover:bg-green-50":"text-slate-400 hover:bg-slate-50"}`}>
                        {day}
                        {hasRec&&!isSel&&<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{backgroundColor:"#F97316"}}/>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{backgroundColor:"#F97316"}}/>Has records</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-600 inline-block"/>Selected</span>
                  </div>
                </div>
              </div>
            </>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <PBtn onClick={openLog} sm><Plus size={13}/> Log Feeding</PBtn>
            <PBtn onClick={openBagsModal} sm outline><Package size={13}/> Log Opened Bags</PBtn>
            <PBtn onClick={openRemainModal} sm outline><Droplets size={13}/> Log Remaining Feed</PBtn>
          </div>
        </div>
      </div>

      {/* Feeding Alert */}
      {(()=>{
        const fedPonds=new Set((feedingRecords||[]).filter(r=>r&&isSameDate(r.date,TODAY)).map(r=>r.pond));
        const unfed=activePonds.filter(p=>!fedPonds.has(p.name));
        if(unfed.length===0)return null;
        return(
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center shrink-0 mt-0.5"><span className="text-amber-800 font-bold text-xs">!</span></div>
            <div>
              <p className="text-xs font-bold text-amber-800">Feeding Alert — {unfed.length} pond{unfed.length!==1?"s":""} not yet fed today</p>
              <p className="text-xs text-amber-700 mt-0.5">{unfed.map(p=>p.name).join(", ")} have not been fed today.</p>
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      {(()=>{
        const totalPonds=activePonds.length;
        const pondsFedToday=[...new Set((feedingRecords||[]).filter(r=>r&&isSameDate(r.date,selDate)).map(r=>r.pond))].length;
        const pondsRemaining=Math.max(0,totalPonds-pondsFedToday);
        const bagsOpenedToday=(bagLogs||[]).filter(b=>b&&isSameDate(b.date,selDate)).reduce((s,b)=>s+(Number(b.bagsOpened)||0),0);
        return(
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Ponds" value={String(totalPonds)} sub="active" icon={Layers}/>
            <StatCard label="Ponds Fed" value={String(pondsFedToday)} sub={selDate} icon={CheckCircle} hi/>
            <StatCard label="Ponds Remaining" value={String(pondsRemaining)} sub="not yet fed" icon={BookOpen}/>
            <StatCard label="Bags Opened" value={String(bagsOpenedToday)} sub={selDate} icon={Package}/>
          </div>
        );
      })()}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["daily","bags","reconciliation"] as const).map(t=>(
          <button key={t} onClick={()=>setDocTab(t)} className={`relative px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${docTab===t?"bg-white text-green-700 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
            {t==="daily"?"Daily Feed":t==="bags"?"Opened Bags":"Reconciliation"}
            {t==="reconciliation"&&hasMismatchOnSelDate&&<span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-white"/>}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-1 mb-3">{docTab==="daily"?"Daily feed records for the selected date.":docTab==="bags"?"Bags opened and remaining feed for the selected date.":"Compare expected vs recorded feed usage."}</p>

      {/* ── Daily Feed tab ── */}
      {docTab==="daily"&&(
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{selDate}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{dayRecords.length>0?`${dayRecords.length} session${dayRecords.length!==1?"s":""} · ${dayGrand}kg total feed`:"No feeding records for this date"}</p>
            </div>
            {mergedBagRows.filter(r=>r.bagsOpened>0).length>0&&(
              <button onClick={()=>setDocTab("bags")} className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5">
                <Package size={13}/> {mergedBagRows.filter(r=>r.bagsOpened>0).reduce((s,r)=>s+r.bagsOpened,0)} Bags Opened Today →
              </button>
            )}
          </div>

          {/* ── Opened Bags for Selected Date Quick Bar ── */}
          {mergedBagRows.filter(r=>r.bagsOpened>0).length>0?(
            <div className="px-5 py-2.5 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5"><Package size={13} className="text-blue-600"/> Opened Bags:</span>
                {mergedBagRows.filter(r=>r.bagsOpened>0).map((r,idx)=>(
                  <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-blue-200 text-blue-800 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>
                    <span className="font-bold text-slate-800">{r.brand} {r.size}</span>
                    <span className="text-slate-500 font-normal">({r.fishStock})</span>:
                    <strong className="font-bold text-blue-700">{r.bagsOpened} bag{r.bagsOpened!==1?"s":""}</strong>
                  </span>
                ))}
              </div>
              <button onClick={()=>setDocTab("bags")} className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors underline ml-auto">Manage Bags →</button>
            </div>
          ):(
            <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
              <span>No bags opened logged for {selDate}.</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1050px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left w-10 sticky left-0 z-20 bg-slate-50">#</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sticky left-10 z-20 bg-slate-50 border-r border-slate-200">Pond</th>
                  {["Fish Stock","Initial Stock","Fish Count","Feed Brand","Feed Size (Pallet)","Morning (kg)","AM Time","Evening (kg)","PM Time","Total (kg)","Recorded By"].map(h=>(
                    <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-4 py-3 w-8"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dayRows.map(({pond,rec},i)=>{
                  const hasFeed=!!rec;
                  const pondMaxKgMap=pond.maxKgByPallet;
                  const atMax=hasFeed&&pondMaxKgMap&&rec!.size in pondMaxKgMap&&(feedingRecords||[]).filter(r=>r&&r.pond===pond.name&&r.size===rec!.size).reduce((s,r)=>s+(Number(r.total)||0),0)>=(pondMaxKgMap[rec!.size]||Infinity);
                  const isEdited=(rec?.editHistory?.length||0)>0;
                  return(
                    <tr key={pond.id} onClick={()=>rec&&setViewFeedRec(rec)} className={`transition-colors ${hasFeed?"hover:bg-green-50/30 cursor-pointer":"opacity-40 hover:opacity-60"}`}>
                      <td className="px-4 py-3.5 text-slate-300 text-xs font-mono w-10 sticky left-0 z-10 bg-white">{i+1}</td>
                      <td className="px-4 py-3.5 min-w-[130px] sticky left-10 z-10 bg-white border-r border-slate-100">
                        <p className="font-semibold text-slate-900">{pond.name}</p>
                        <p className="text-[11px] text-slate-400">{pond.type}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        {pond.species!=="—"?(()=>{
                          const fs=pondToStock(pond.name);
                          const parts=fs.match(/^(.*)\s\(([^)]+)\)$/);
                          const display=parts?`${parts[1]} (${fmtStockingDate(parts[2])})`:fs;
                          const stockBags=(bagLogs||[]).filter(b=>isSameDate(b.date,selDate)&&(b.fishStock===fs||b.fishStock===display||!b.fishStock)).reduce((s,b)=>s+(Number(b.bagsOpened)||0),0);
                          return(
                            <span className="flex items-center gap-1.5">
                              <span>{display}</span>
                              {stockBags>0&&<span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md" title={`${stockBags} bag${stockBags!==1?"s":""} opened for this stock today`}>📦 {stockBags} bag{stockBags!==1?"s":""}</span>}
                            </span>
                          );
                        })():<span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-['Barlow_Condensed',sans-serif] text-base">{pond.initialStock.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-semibold text-green-700 font-['Barlow_Condensed',sans-serif] text-base">{pond.currentCount.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{rec?.brand||<span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5">{rec?<span className="flex items-center gap-1.5"><Bdg label={rec.size} color={atMax?"red":"blue"}/>{atMax&&<span className="text-[10px] font-bold text-red-500">⚠ Limit</span>}</span>:<span className="text-slate-300 text-xs">—</span>}</td>
                      <td className="px-4 py-3.5 font-medium">{rec?`${rec.morning}kg`:<span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{rec?.morningTime||<span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5 font-medium">{rec?`${rec.evening}kg`:<span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{rec?.eveningTime||<span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5">{rec?<span className="inline-flex items-center gap-1.5"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-100 text-green-800 font-bold text-sm font-['Barlow_Condensed',sans-serif]">{rec.total}kg</span>{isEdited&&<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Edited</span>}</span>:<span className="text-slate-200 text-xs">Not fed</span>}</td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs">{rec?.recordedBy||<span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}>{rec&&(isRecordEditable(rec.date)?<button onClick={()=>openEditRec(rec)} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors" title="Edit record"><Pencil size={13}/></button>:<button onClick={()=>alert("This record can only be edited by an Administrator or Manager after 24 hours.")} className="p-1.5 rounded-lg text-slate-200 cursor-not-allowed" title="Locked after 24 hours"><Lock size={13}/></button>)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {dayGrand>0&&(
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={11} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Total</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-600 text-white font-bold text-sm font-['Barlow_Condensed',sans-serif]">{dayGrand}kg</span></td>
                    <td colSpan={2}/>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {dayRecords.length===0&&(
            <div className="py-12 text-center">
              <Droplets size={32} className="text-slate-200 mx-auto mb-3"/>
              <p className="text-sm font-semibold text-slate-400">No feeding recorded on {selDate}</p>
              <p className="text-xs text-slate-300 mt-1">Select a highlighted date or log a new session</p>
            </div>
          )}
        </Card>
      )}

      {/* ── Opened Bags tab ── */}
      {docTab==="bags"&&(
        <Card>
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Opened Bags — {selDate}</p>
            <p className="text-[11px] text-slate-400">{mergedBagRows.length} entries</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Feed Brand</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Pellet Size</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Fish Stock</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Bags Opened</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Remaining Feed (kg)</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mergedBagRows.length===0&&<tr><td colSpan={6} className="text-center text-xs text-slate-400 py-8">No bags logged for {selDate}</td></tr>}
                {mergedBagRows.map((row,i)=>(
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.brand}</td>
                    <td className="px-4 py-3"><Bdg label={row.size} color="blue"/></td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{row.fishStock}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{row.bagsOpened>0?row.bagsOpened:<span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">{row.remainingKg>0?<span className="font-semibold text-amber-600">{row.remainingKg} kg</span>:<span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3">{row.lastBagLog&&(isRecordEditable(row.lastBagLog.date)?<button onClick={()=>openEditDocBag(row.lastBagLog!)} className="p-1 rounded text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors" title="Edit"><Pencil size={13}/></button>:<button onClick={()=>alert("This record can only be edited by an Administrator or Manager after 24 hours.")} className="p-1 rounded text-slate-200 cursor-not-allowed" title="Locked"><Lock size={13}/></button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Reconciliation tab ── */}
      {docTab==="reconciliation"&&(()=>{
        const issues=reconRows.filter(r=>r.status!=="matched").length;
        return(
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feed Reconciliation — {selDate}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Tap a row for the full step-by-step breakdown.</p>
              </div>
              {issues>0&&<span className="px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold">{issues} issue{issues!==1?"s":""}</span>}
            </div>
            {reconRows.length===0?(
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-slate-400">No feeding data to reconcile for {selDate}.</p>
                <p className="text-xs text-slate-300 mt-1">Log feeding sessions and opened bags to see reconciliation.</p>
              </div>
            ):(
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap sticky left-0 z-20 bg-slate-50 border-r border-slate-200 min-w-[180px]">Fish Stock</th>
                      {["Pellet Size","Feed Brand","Ponds","Exp. Feed (kg)","Rec. Feed (kg)","Exp. Bags","Rec. Bags","Exp. Remaining","Rec. Remaining","Status"].map(h=>(
                        <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reconRows.map(r=>{
                      const rowKey=`${r.fishStock}||${r.brand}||${r.size}`;
                      const expanded=reconExpanded===rowKey;
                      const highlighted=!!(reconFocus&&reconFocus.key===`${r.brand}__${r.size}`);
                      const sc=STATUS_CFG[r.status]||STATUS_CFG.matched;
                      const expectedFeedAvail=r.carryover+(r.expectedBags*r.bagWeight);
                      const bagErr=r.status==="bag_mismatch"||r.status==="multiple_mismatches";
                      const remErr=r.status==="remaining_mismatch"||r.status==="multiple_mismatches";
                      return(
                        <tr
                          key={rowKey}
                          onClick={()=>setPopupRecon(r)}
                          className={`cursor-pointer transition-colors ${sc.rowBg} ${highlighted?"outline outline-2 outline-green-400":""}`}
                          title="Click to view reconciliation detail popup"
                        >
                          <td className="px-4 py-3 sticky left-0 z-10 bg-white border-r border-slate-100 min-w-[180px]">
                            <p className="text-xs font-semibold text-slate-800 leading-tight">{r.fishStock}</p>
                          </td>
                          <td className="px-4 py-3"><Bdg label={r.size} color="blue"/></td>
                          <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{r.brand}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {r.ponds.length === 0 ? (
                              <span className="text-slate-400 italic">None logged</span>
                            ) : r.ponds.length <= 2 ? (
                              r.ponds.join(", ")
                            ) : (
                              <span className="inline-flex items-center gap-1.5" title={r.ponds.join(", ")}>
                                <span>{r.ponds.slice(0, 2).join(", ")}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 cursor-help" title={r.ponds.join(", ")}>
                                  +{r.ponds.length - 2} more
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">{r.totalFed} kg</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{r.totalFed} kg</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">{r.expectedBags}</td>
                          <td className={`px-4 py-3 font-semibold ${bagErr?"text-red-600":"text-slate-700"}`}>{r.recordedBags}</td>
                          <td className="px-4 py-3 text-slate-600">{r.expectedRemaining>0?`${r.expectedRemaining} kg`:<span className="text-slate-300">—</span>}</td>
                          <td className={`px-4 py-3 font-semibold ${remErr?"text-red-600":"text-slate-600"}`}>{r.recordedRemaining>0?`${r.recordedRemaining} kg`:<span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${sc.cls}`}>{sc.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })()}

      {/* ── Reconciliation Popup (Desktop & Mobile) ── */}
      {popupRecon&&(()=>{
        const pr=popupRecon;
        const bagErr=pr.status==="bag_mismatch"||pr.status==="multiple_mismatches";
        const remErr=pr.status==="remaining_mismatch"||pr.status==="multiple_mismatches";
        const qtyErr=pr.status==="feed_qty_mismatch";
        const pondsForRow=(feedingRecords||[]).filter(r=>r&&isSameDate(r.date,selDate)&&r.brand===pr.brand&&r.size===pr.size&&pr.ponds.includes(r.pond));
        const expectedFeedAvail=pr.carryover+(pr.expectedBags*pr.bagWeight);
        const ratio=pr.bagWeight>0?(pr.netNeeded/pr.bagWeight).toFixed(2):"—";
        const sc=STATUS_CFG[pr.status]||STATUS_CFG.matched;
        return(
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&setPopupRecon(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150" style={{maxHeight:"90vh"}}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Reconciliation Detail</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selDate} · {pr.fishStock}</p>
                  <p className="text-xs text-slate-400">{pr.brand} · {pr.size}</p>
                </div>
                <button onClick={()=>setPopupRecon(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-xs">
                <div className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center ${sc.cls}`}>{sc.label}</div>
                {/* Step 1 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Step 1 — Total Feed Given</p>
                  <div className="space-y-1 mb-2">
                    {pondsForRow.length === 0 ? (
                      <p className="text-slate-400 italic text-xs py-1">No feeding recorded for this feed today.</p>
                    ) : (
                      pondsForRow.map(r=>(
                        <div key={r.id} className="flex items-center justify-between"><span className="text-slate-500">{r.pond}</span><span className="font-semibold text-slate-700">{r.total} kg</span></div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                    <span className="font-bold text-slate-600">Total Feed Given</span>
                    <span className="font-black text-slate-900 text-sm">{pr.totalFed} kg</span>
                  </div>
                </div>
                {/* Step 2 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Step 2 — Yesterday's Remaining</p>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Carryover from Yesterday</span><span className="font-semibold text-amber-600">{pr.carryover} kg</span></div>
                </div>
                {/* Step 3 */}
                <div className={`rounded-xl p-4 border ${qtyErr?"bg-red-50 border-red-200":"bg-white border-slate-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${qtyErr?"text-red-500":"text-slate-400"}`}>Step 3 — Required New Feed{qtyErr&&" ⚠ Feed Qty Mismatch"}</p>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] pl-1">
                    <span>{pr.totalFed} kg − {pr.carryover} kg</span><span>=</span><span className={`font-black text-sm ${qtyErr?"text-red-600":"text-blue-600"}`}>{pr.netNeeded} kg</span>
                  </div>
                  {qtyErr&&<p className="text-[11px] text-red-500 font-semibold mt-1.5">Feed given ({pr.totalFed} kg) exceeds available ({pr.carryover} + {pr.recordedBags*pr.bagWeight} = {pr.carryover+pr.recordedBags*pr.bagWeight} kg)</p>}
                </div>
                {/* Step 4 */}
                <div className={`rounded-xl p-4 border ${bagErr?"bg-red-50 border-red-200":"bg-white border-slate-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${bagErr?"text-red-500":"text-slate-400"}`}>Step 4 — Expected Bags Opened{bagErr&&" ⚠ Bag Count Mismatch"}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><span className="text-slate-500">Bag Weight</span><span className="font-semibold text-slate-700">{pr.bagWeight} kg/bag</span></div>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] pl-1"><span>{pr.netNeeded} kg ÷ {pr.bagWeight} kg</span><span>=</span><span className="font-bold text-slate-600">{ratio}</span></div>
                    <div className={`flex items-center justify-between border-t pt-1.5 ${bagErr?"border-red-200":"border-slate-100"}`}>
                      <span className="font-bold text-slate-600">Rounded up to</span>
                      <span className={`font-black text-sm ${bagErr?"text-red-600":"text-slate-900"}`}>{pr.expectedBags} bags</span>
                    </div>
                  </div>
                </div>
                {/* Step 5 */}
                <div className={`rounded-xl p-4 border ${bagErr?"bg-red-50 border-red-200":"bg-white border-slate-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${bagErr?"text-red-500":"text-slate-400"}`}>Step 5 — Recorded Bags Opened</p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Recorded Bags</span>
                    <span className={`font-black text-sm ${bagErr?"text-red-600":"text-green-600"}`}>{pr.recordedBags} bag{pr.recordedBags!==1?"s":""} {bagErr?"✗":"✓"}</span>
                  </div>
                  {bagErr&&<p className="text-[11px] text-red-500 font-semibold mt-1.5">Expected {pr.expectedBags}, recorded {pr.recordedBags}</p>}
                </div>
                {/* Step 6 */}
                <div className={`rounded-xl p-4 border ${remErr?"bg-red-50 border-red-200":"bg-white border-slate-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${remErr?"text-red-500":"text-slate-400"}`}>Step 6 — Expected Remaining{remErr&&" ⚠ Remaining Mismatch"}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] pl-1"><span>{pr.carryover} + ({pr.expectedBags} × {pr.bagWeight}) − {pr.totalFed}</span><span>=</span><span className="font-bold text-slate-700">{pr.expectedRemaining} kg</span></div>
                  </div>
                </div>
                {/* Step 7 */}
                <div className={`rounded-xl p-4 border ${remErr?"bg-red-50 border-red-200":"bg-white border-slate-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${remErr?"text-red-500":"text-slate-400"}`}>Step 7 — Recorded Remaining</p>
                  <div className={`grid grid-cols-2 gap-3`}>
                    <div><p className="text-[10px] text-slate-400 mb-0.5">Expected</p><p className="font-bold text-slate-800">{pr.expectedRemaining} kg</p></div>
                    <div><p className="text-[10px] text-slate-400 mb-0.5">Recorded</p><p className={`font-bold ${remErr?"text-red-600":"text-green-600"}`}>{pr.recordedRemaining} kg {remErr?"✗":"✓"}</p></div>
                  </div>
                  {remErr&&<p className="text-[11px] text-red-500 font-semibold mt-1.5">Difference of {Math.abs(pr.expectedRemaining-pr.recordedRemaining).toFixed(1)} kg</p>}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 shrink-0">
                <button onClick={()=>setPopupRecon(null)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors">Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Bulk Feeding Log Modal ── */}
      {showLog&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&setShowLog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col" style={{maxHeight:"92vh"}}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Feeding — All Ponds</h2>
                <p className="text-xs text-slate-400 mt-0.5">Enter morning &amp; evening amounts for each pond</p>
              </div>
              <button onClick={()=>setShowLog(false)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20}/></button>
            </div>
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0 flex flex-wrap gap-4 items-end">
              <div className="min-w-[160px]">
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">Date</label>
                <DateInput value={bulkDate} onChange={handleBulkDateChange}/>
              </div>
              <div className="min-w-[200px]">
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">Recorded By</label>
                <input value={bulkBy} onChange={e=>setBulkBy(e.target.value)} className={IC} placeholder="Employee name"/>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-400">Session time:</span>
                <span className="text-sm font-semibold text-slate-700 font-['Barlow_Condensed',sans-serif]">{logTime}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left w-10 sticky left-0 z-20 bg-slate-50">#</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sticky left-10 z-20 bg-slate-50 border-r border-slate-200">Pond</th>
                    {["Fish Stock","Initial Stock","Fish Count","Feed Brand","Feed Size (Pallet)","Morning (kg)","AM Time","Evening (kg)","PM Time","Total"].map(h=>(
                      <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bulkRows.map((row,i)=>{
                    const m=Number(row.morning)||0;const e=Number(row.evening)||0;const total=m+e;
                    const hasFeed=m>0||e>0;
                    const pondObj=ponds.find(p=>p.id===row.pondId);
                    const rowMaxKg=pondObj?.maxKgByPallet?.[row.size];
                    const cumFed=(feedingRecords||[]).filter(r=>r&&r.pond===row.pondName&&r.size===row.size).reduce((s,r)=>s+(Number(r.total)||0),0);
                    const rowAtMax=!!rowMaxKg&&cumFed>=rowMaxKg;
                    return(
                      <tr key={row.pondId} className={`transition-colors ${hasFeed?"bg-green-50/40":"hover:bg-slate-50"}`}>
                        <td className="px-4 py-3 text-slate-300 text-xs font-mono w-10 sticky left-0 z-10 bg-white">{i+1}</td>
                        <td className="px-4 py-3 min-w-[130px] sticky left-10 z-10 bg-white border-r border-slate-100"><p className="font-semibold text-slate-900">{row.pondName}</p></td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap min-w-[160px]">{row.fishStock?(()=>{const parts=row.fishStock.match(/^(.*)\s\(([^)]+)\)$/);return parts?`${parts[1]} (${fmtStockingDate(parts[2])})`:row.fishStock;})():<span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-slate-500 min-w-[110px] font-['Barlow_Condensed',sans-serif] text-base">{row.initialStock.toLocaleString()}</td>
                        <td className="px-4 py-3 min-w-[100px]"><span className="font-semibold text-green-700 font-['Barlow_Condensed',sans-serif] text-base">{row.currentCount.toLocaleString()}</span></td>
                        <td className="px-3 py-2.5 min-w-[160px]">
                          <select value={row.brand} onChange={e=>updateRow(row.pondId,"brand",e.target.value)} className={TS}>
                            {invBrands.length>0?invBrands.map(b=><option key={b}>{b}</option>):<option value="">No feed in stock</option>}
                            {row.brand&&!invBrands.includes(row.brand)&&<option value={row.brand}>{row.brand}</option>}
                          </select>
                        </td>
                        <td className="px-3 py-2.5 min-w-[120px]">
                          <select value={row.size} onChange={e=>updateRow(row.pondId,"size",e.target.value)} className={TS}>
                            {invSizesForBrand(row.brand).length>0?invSizesForBrand(row.brand).map(s=><option key={s}>{s}</option>):<option value="">—</option>}
                            {row.size&&!invSizesForBrand(row.brand).includes(row.size)&&<option value={row.size}>{row.size}</option>}
                          </select>
                          {rowAtMax&&<p className="text-[10px] font-bold mt-0.5 text-red-600">⚠ Max weight reached</p>}
                        </td>
                        <td className="px-3 py-2.5 min-w-[110px]"><input type="number" value={row.morning} onChange={e=>updateRow(row.pondId,"morning",e.target.value)} className={TI} placeholder="0" min="0" step="0.5"/></td>
                        <td className="px-3 py-2.5 min-w-[100px]"><input type="time" value={row.morningTime} onChange={e=>updateRow(row.pondId,"morningTime",e.target.value)} className={`${TI} text-xs`} style={{colorScheme:"light"}}/></td>
                        <td className="px-3 py-2.5 min-w-[110px]"><input type="number" value={row.evening} onChange={e=>updateRow(row.pondId,"evening",e.target.value)} className={TI} placeholder="0" min="0" step="0.5"/></td>
                        <td className="px-3 py-2.5 min-w-[100px]"><input type="time" value={row.eveningTime} onChange={e=>updateRow(row.pondId,"eveningTime",e.target.value)} className={`${TI} text-xs`} style={{colorScheme:"light"}}/></td>
                        <td className="px-4 py-3 min-w-[80px] text-center">
                          {total>0?<span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-100 text-green-800 font-bold text-sm font-['Barlow_Condensed',sans-serif]">{total}kg</span>:<span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {bulkRows.length>0&&(
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={11} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Total</td>
                      <td className="px-4 py-3 text-center"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-600 text-white font-bold text-sm font-['Barlow_Condensed',sans-serif]">{grandTotal}kg</span></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl">
              <div>
                <p className="text-sm font-semibold text-slate-700"><span className="text-green-600">{filledCount}</span> of {bulkRows.length} ponds filled</p>
                <p className="text-xs text-slate-400 mt-0.5">Only ponds with a value entered will be saved</p>
                {feedErr.amounts&&<p className="text-xs text-red-500 mt-1">{feedErr.amounts}</p>}
                {feedErr.date&&<p className="text-xs text-red-500 mt-1">{feedErr.date}</p>}
              </div>
              <div className="flex gap-3">
                <button disabled={savingFeed} onClick={()=>{setShowLog(false);setFeedErr({});}} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors disabled:opacity-50">Cancel</button>
                <PBtn disabled={savingFeed} onClick={handleSaveAll}>
                  {savingFeed ? (
                    <span className="flex items-center gap-2">Saving...</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><CheckCircle size={15}/> Save {filledCount>0?filledCount:""} Record{filledCount!==1?"s":""}</span>
                  )}
                </PBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Opened Bags Modal ── */}
      {showBagsModal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&setShowBagsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col" style={{maxHeight:"88vh"}}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Opened Bags</h2>
                <p className="text-xs text-slate-400 mt-0.5">Record feed bags opened per fish stock</p>
              </div>
              <button onClick={()=>setShowBagsModal(false)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20}/></button>
            </div>
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="min-w-[160px] max-w-[200px]">
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">Date</label>
                <DateInput value={bagsDate} onChange={v=>{setBagsDate(v);if(v)setBagsErr(p=>({...p,date:""}));}}/>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {bagRows.map((row,i)=>(
                <div key={i} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative space-y-3">
                  {bagRows.length>1&&<button type="button" onClick={()=>removeBagRow(i)} className="absolute top-3 right-3 p-1 rounded text-slate-300 hover:text-red-400 transition-colors"><X size={13}/></button>}
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Feed Brand">
                      <SearchableSelect value={row.brand} onChange={v=>{updateBagRow(i,"brand",v);const szs=invSizesForBrand(v);if(szs.length>0&&!szs.includes(row.size))updateBagRow(i,"size",szs[0]);}} options={invBrands} placeholder="Select brand…"/>
                    </F>
                    <F label="Pellet Size">
                      <select value={row.size} onChange={e=>updateBagRow(i,"size",e.target.value)} className={SC}>{invSizesForBrand(row.brand).map(s=><option key={s}>{s}</option>)}</select>
                    </F>
                  </div>
                  <F label="Fish Stock">
                    <select value={row.fishStock} onChange={e=>updateBagRow(i,"fishStock",e.target.value)} className={SC}>
                      <option value="">Select fish stock…</option>
                      {[...new Set(activePonds.map(p=>`${p.species} (${p.stockingDate})`))].map(fs=>{const parts=fs.match(/^(.*)\s\(([^)]+)\)$/);const display=parts?`${parts[1]} (${fmtStockingDate(parts[2])})`:fs;return<option key={fs} value={fs}>{display}</option>;})}
                    </select>
                  </F>
                  <F label="Bags Opened">
                    <input type="number" min="0" value={row.qty} onChange={e=>updateBagRow(i,"qty",e.target.value)} className={IC} placeholder="0"/>
                  </F>
                  {Number(row.qty)>0&&row.kgPerBag>0&&<p className="text-xs text-green-700 font-semibold">Total: {Number(row.qty)*row.kgPerBag} kg ({row.kgPerBag} kg/bag)</p>}
                </div>
              ))}
              <button type="button" onClick={addBagRow} className="flex items-center gap-1.5 text-xs text-green-600 font-semibold hover:text-green-700 transition-colors py-1"><Plus size={13}/> Add another entry</button>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-2xl">
              <div className="flex items-center justify-end gap-3">
                <p className="text-sm text-slate-500 mr-auto"><span className="font-semibold text-green-600">{filledBagRows.length}</span> entr{filledBagRows.length!==1?"ies":"y"} filled</p>
                <button onClick={()=>{setShowBagsModal(false);setBagsErr({});}} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancel</button>
                <PBtn onClick={handleSaveBags} sm><CheckCircle size={14}/> Save Log</PBtn>
              </div>
              {(bagsErr.entries||bagsErr.fishStock||bagsErr.brand||bagsErr.date)&&<div className="mt-2 space-y-0.5">
                {bagsErr.entries&&<p className="text-xs text-red-500">{bagsErr.entries}</p>}
                {bagsErr.fishStock&&<p className="text-xs text-red-500">{bagsErr.fishStock}</p>}
                {bagsErr.brand&&<p className="text-xs text-red-500">{bagsErr.brand}</p>}
                {bagsErr.date&&<p className="text-xs text-red-500">{bagsErr.date}</p>}
              </div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Feed Record Modal ── */}
      {editRec&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&setEditRec(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{maxHeight:"90vh"}}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Edit Daily Feed</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editRec.pond} · {editRec.date}</p>
              </div>
              <button onClick={()=>setEditRec(null)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <F label="Feed Brand"><SearchableSelect value={editRec.brand} onChange={v=>setEditRec(p=>p?{...p,brand:v,size:invSizesForBrand(v)[0]||p?.size||""}:p)} options={invBrands} placeholder="Select brand…"/></F>
                <F label="Feed Size (Pallet)"><select value={editRec.size} onChange={e=>setEditRec(p=>p?{...p,size:e.target.value}:p)} className={SC}>{invSizesForBrand(editRec?.brand||"").map(s=><option key={s}>{s}</option>)}</select></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Morning (kg)"><NumInput value={editRec.morning} onChange={v=>setEditRec(p=>p?{...p,morning:Number(v)||0}:p)} className={IC} placeholder="0"/></F>
                <F label="AM Time"><input type="time" value={editRec.morningTime||""} onChange={e=>setEditRec(p=>p?{...p,morningTime:e.target.value}:p)} className={IC} style={{colorScheme:"light"}}/></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Evening (kg)"><NumInput value={editRec.evening} onChange={v=>setEditRec(p=>p?{...p,evening:Number(v)||0}:p)} className={IC} placeholder="0"/></F>
                <F label="PM Time"><input type="time" value={editRec.eveningTime||""} onChange={e=>setEditRec(p=>p?{...p,eveningTime:e.target.value}:p)} className={IC} style={{colorScheme:"light"}}/></F>
              </div>
              <F label="Recorded By"><input type="text" value={editRec.recordedBy} onChange={e=>setEditRec(p=>p?{...p,recordedBy:e.target.value}:p)} className={IC}/></F>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-3 rounded-b-2xl">
              <button onClick={()=>setEditRec(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancel</button>
              <PBtn onClick={handleSaveEditAll}><CheckCircle size={14}/> Save Changes</PBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Bag Log Modal ── */}
      {editDocBag&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&setEditDocBag(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{maxHeight:"88vh"}}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Edit Bag Log</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editDocBag.brand} · {editDocBag.size} · {editDocBag.date}</p>
              </div>
              <button onClick={()=>setEditDocBag(null)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Bags Opened</p>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Bags Opened"><NumInput value={editDocBag.bagsOpened} onChange={v=>setEditDocBag(p=>p?{...p,bagsOpened:Number(v)||0}:p)} className={IC} allowDecimal={false}/></F>
                  <F label="kg per Bag"><NumInput value={editDocBag.kgPerBag} onChange={v=>setEditDocBag(p=>p?{...p,kgPerBag:Number(v)||0}:p)} className={IC}/></F>
                </div>
                <p className="text-xs text-slate-400 mt-1">Total: <strong className="text-slate-700">{editDocBag.bagsOpened*editDocBag.kgPerBag} kg</strong></p>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Remaining Feed</p>
                <F label="Remaining Feed (kg)">
                  <input type="number" min="0" step="0.1" value={editBagRemainKg} onChange={e=>setEditBagRemainKg(e.target.value)} placeholder="e.g. 3.5" className={IC}/>
                </F>
                {editDocBag.fishStock&&<p className="text-[11px] text-slate-500 mt-1">Linked to: <span className="font-semibold">{editDocBag.fishStock}</span></p>}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-3 rounded-b-2xl">
              <button onClick={()=>setEditDocBag(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancel</button>
              <PBtn onClick={handleSaveEditDocBag}><CheckCircle size={14}/> Save Changes</PBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Remaining Feed Modal ── */}
      {showRemainModal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&setShowRemainModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col" style={{maxHeight:"88vh"}}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Remaining Feed</h2>
                <p className="text-xs text-slate-400 mt-0.5">Record leftover feed for {selDate}</p>
              </div>
              <button onClick={()=>setShowRemainModal(false)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {remainRows.map((row,i)=>(
                <div key={i} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative space-y-3">
                  {remainRows.length>1&&<button type="button" onClick={()=>removeRemainRow(i)} className="absolute top-3 right-3 p-1 rounded text-slate-300 hover:text-red-400 transition-colors"><X size={13}/></button>}
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Feed Brand">
                      <SearchableSelect value={row.brand} onChange={v=>{updateRemainRow(i,"brand",v);const szs=invSizesForBrand(v);if(szs.length>0&&!szs.includes(row.size))updateRemainRow(i,"size",szs[0]);}} options={invBrands} placeholder="Select brand…"/>
                    </F>
                    <F label="Pellet Size">
                      <select value={row.size} onChange={e=>updateRemainRow(i,"size",e.target.value)} className={SC}>{invSizesForBrand(row.brand).map(s=><option key={s}>{s}</option>)}</select>
                    </F>
                  </div>
                  <F label="Fish Stock">
                    <select value={row.fishStock} onChange={e=>updateRemainRow(i,"fishStock",e.target.value)} className={SC}>
                      <option value="">Select fish stock…</option>
                      {[...new Set(activePonds.map(p=>`${p.species} (${p.stockingDate})`))].map(fs=>{const parts=fs.match(/^(.*)\s\(([^)]+)\)$/);const display=parts?`${parts[1]} (${fmtStockingDate(parts[2])})`:fs;return<option key={fs} value={fs}>{display}</option>;})}
                    </select>
                  </F>
                  <F label="Remaining Feed (kg)">
                    <input type="number" min="0" step="0.1" value={row.remainingKg} onChange={e=>updateRemainRow(i,"remainingKg",e.target.value)} className={IC} placeholder="e.g. 3.5"/>
                  </F>
                </div>
              ))}
              <button type="button" onClick={addRemainRow} className="flex items-center gap-1.5 text-xs text-green-600 font-semibold hover:text-green-700 transition-colors py-1"><Plus size={13}/> Add another entry</button>
            </div>
            {remainValidErr&&<div className="mx-6 mb-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">{remainValidErr}</div>}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-end gap-3 rounded-b-2xl">
              <button onClick={()=>{setShowRemainModal(false);setRemainValidErr("");}} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancel</button>
              <PBtn onClick={handleSaveRemain} sm><CheckCircle size={14}/> Save Log</PBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Feed Record Detail / History Popup ── */}
      {viewFeedRec&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={e=>e.target===e.currentTarget&&setViewFeedRec(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col" style={{maxHeight:"90vh"}}>
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feed Record</h2>
                <p className="text-xs text-slate-400 mt-0.5">{viewFeedRec.pond} · {viewFeedRec.date}</p>
              </div>
              <button onClick={()=>setViewFeedRec(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-4 shrink-0"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* Details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Pond</p><p className="text-sm font-semibold text-slate-800">{viewFeedRec.pond}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Date</p><p className="text-sm font-semibold text-slate-800">{viewFeedRec.date}</p></div>
              </div>
              {(()=>{const fs=pondToStock(viewFeedRec.pond);return fs!==viewFeedRec.pond&&<div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl"><Fish size={12} className="text-teal-600 shrink-0"/><div><p className="text-[10px] uppercase tracking-wider text-teal-500 mb-0">Fish Stock</p><p className="text-xs text-teal-700 font-semibold">{fs}</p></div></div>;})()}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Feed Brand</p><p className="text-sm font-semibold text-slate-800">{viewFeedRec.brand}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Pellet Size</p><Bdg label={viewFeedRec.size} color="blue"/></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Morning</p><p className="text-sm font-bold text-slate-800">{viewFeedRec.morning} kg</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Evening</p><p className="text-sm font-bold text-slate-800">{viewFeedRec.evening} kg</p></div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-200"><p className="text-[10px] uppercase tracking-wider text-green-600 mb-0.5">Total</p><p className="text-sm font-black text-green-700">{viewFeedRec.total} kg</p></div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Recorded By</p><p className="text-sm text-slate-700">{viewFeedRec.recordedBy||"—"}</p></div>
              {/* Edit History */}
              {(viewFeedRec.editHistory?.length||0)>0&&(
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 flex items-center gap-1.5"><History size={11}/> Edit History</p>
                  <div className="space-y-2">
                    {viewFeedRec.editHistory!.map((h,i)=>(
                      <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Edit {i+1}</span>
                          <span className="text-[10px] text-slate-400">{h.editedAt}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-slate-400">Morning: </span><span className="text-slate-500 line-through mr-1">{h.originalMorning} kg</span><span className="font-semibold text-slate-800">{h.updatedMorning} kg</span></div>
                          <div><span className="text-slate-400">Evening: </span><span className="text-slate-500 line-through mr-1">{h.originalEvening} kg</span><span className="font-semibold text-slate-800">{h.updatedEvening} kg</span></div>
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{h.editedBy}</span>
                          {h.editedById&&<span className="text-slate-400 ml-1.5">({h.editedById})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex gap-2">
              {editRec===null&&isRecordEditable(viewFeedRec.date)&&<PBtn sm onClick={()=>{openEditRec(viewFeedRec);setViewFeedRec(null);}}><Pencil size={12}/> Edit</PBtn>}
              <button onClick={()=>setViewFeedRec(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Remaining Log Modal ── */}
      {editRemainLog&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&setEditRemainLog(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col p-6 gap-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Edit Remaining Feed</h2>
              <button onClick={()=>setEditRemainLog(null)} className="text-slate-400 hover:text-slate-700"><X size={18}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Feed Brand"><SearchableSelect value={editRemainLog.brand} onChange={v=>setEditRemainLog(p=>p?{...p,brand:v,size:invSizesForBrand(v)[0]||p?.size||""}:p)} options={invBrands} placeholder="Select brand…"/></F>
              <F label="Pellet Size"><select value={editRemainLog.size} onChange={e=>setEditRemainLog(p=>p?{...p,size:e.target.value}:p)} className={SC}>{invSizesForBrand(editRemainLog?.brand||"").map(s=><option key={s}>{s}</option>)}</select></F>
            </div>
            <F label="Fish Stock"><input type="text" value={editRemainLog.fishStock} onChange={e=>setEditRemainLog(p=>p?{...p,fishStock:e.target.value}:p)} className={IC}/></F>
            <F label="Remaining Feed (kg)"><NumInput value={editRemainLog.remainingKg} onChange={v=>setEditRemainLog(p=>p?{...p,remainingKg:Number(v)||0}:p)} className={IC} placeholder="e.g. 3.5"/></F>
            <div className="flex gap-2 pt-1">
              <PBtn onClick={handleSaveEditRemain}><CheckCircle size={14}/> Save Changes</PBtn>
              <button onClick={()=>setEditRemainLog(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedDocumentation;
