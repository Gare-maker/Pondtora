import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { api, auth } from "../lib/api";
import { supabase } from "../lib/supabase";
import { projectId } from "../../utils/supabase/info";
import pondtoraLogo from "../imports/loo-2.svg";
import {
  LayoutDashboard, Fish, Package, BookOpen, Tag,
  Plus, TrendingUp, TrendingDown, CheckCircle,
  X, Calculator, ArrowUpRight, ArrowDownRight,
  Layers, Droplets, Trash2, Menu, ChevronDown,
  ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, Eye, Search,
  Download, FileText, BadgeCheck, Pencil, Users, Mail, Phone, ArrowRightLeft, History, Filter, Crown, Receipt, MoreVertical, AlertCircle, Bell, LogOut, ClipboardList, Lock, Loader2, Copy, Database, ExternalLink, Settings, EyeOff,
  Sparkles, CreditCard
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import type { View, SortDir, MonthData, FeedItem, Pond, Expense, Revenue, FeedingRecord, FeedEditEntry, MortalityEntry, BagOpenLog, FeedRemainingLog, StaffMember, Report, UserProfile, StockEvent, PriceGroup, Customer, InvSettings, InvoiceLineItem, Invoice, Farm, TreatmentRecord, WItem, EditEntry } from "./types";
import { EXPENSE_CATS, REVENUE_SRCS, POND_TYPES, POND_SPECIES, MORT_CAUSES, TODAY, fmt, yFmt, uid, toMon, toYr, PAYMENT_METHODS, INV_STATUSES, STAFF_PERMISSIONS, STAFF_ROLES_ALL, INIT_INV_SETTINGS, ADMIN_NAME, downloadCSV, openPrintWindow, COUNTRY_CURRENCIES, COUNTRIES, DIAL_CODES, FLAG_EMOJI, convertNGN, fmtStockingDate } from "./data";
import { Card, Bdg, PBtn, Pagination, PER_PAGE, StatCard, Tip, Modal, F, IC, SC, SearchableSelect, SelDrop, DMONTHS_S, DateFilter, SearchableCountrySelect, SH, useSort, DateInput, NumInput } from "./shared";
import InvoicesPage from "./pages/InvoicesPage";
import FeedDocumentationPage from "./pages/FeedDocumentationPage";
import PondManagementPage from "./pages/PondManagementPage";
import FeedInventoryPage from "./pages/FeedInventoryPage";
import AuthScreenPage from "./pages/AuthScreen";
import LandingPage from "./pages/LandingPage";
import EmployeeAssessmentsPage, { CandidateAssessment, INIT_C } from "./pages/EmployeeAssessmentsPage";
import { Toaster, toast } from "sonner";
import { useDynamicPlans } from "../lib/plansStore";
import { syncUserProfileToAdmin, getUserAdminOverride, logActivity, recordSuccessfulPayment, loadAllAdminUsers } from "../lib/userSync";
import { initializePaystackCheckout, getActivePaystackPublicKey, loadPaystackConfig } from "../lib/paystack";
import confetti from "canvas-confetti";

/* ─── Sidebar ───────────────────────────────────────────────── */
const NAV:{id:View;icon:React.ElementType;label:string}[]=[
  {id:"financial",     icon:LayoutDashboard,label:"Financial Dashboard"},
  {id:"ponds",         icon:Droplets,       label:"Pond Management"},
  {id:"inventory",     icon:Package,        label:"Feed Stock"},
  {id:"documentation", icon:BookOpen,       label:"Feeding Records"},
  {id:"reports",       icon:FileText,       label:"Reports"},
  {id:"invoices",      icon:Receipt,        label:"Invoices"},
  {id:"staff",         icon:Users,          label:"Staff"},
  {id:"assessments",   icon:ClipboardList,  label:"Staff Assessments"},
  {id:"pricing",       icon:Crown,          label:"Subscription"},
  {id:"settings",      icon:Settings,       label:"Settings"},
];
/* Map nav id → permission name (undefined = always visible) */
const NAV_PERM:Partial<Record<View,string>>={
  financial:"Financial Dashboard",ponds:"Pond Management",inventory:"Feed Stock",
  documentation:"Feeding Records",invoices:"Invoice",reports:"Reports",assessments:"Staff Assessment",
};
function Sidebar({active,onNav,collapsed,onToggle,farms,activeFarmId,onSwitchFarm,onAddFarm,sideOpen,staff,unreadCount,onNotifications,onLogout,hasPerm,isOwner,userProfile,currentStaff}:{active:View;onNav:(v:View)=>void;collapsed:boolean;onToggle:()=>void;farms:Farm[];activeFarmId:string;onSwitchFarm:(id:string)=>void;onAddFarm:()=>void;sideOpen:boolean;staff?:StaffMember[];unreadCount?:number;onNotifications?:()=>void;onLogout?:()=>void;hasPerm?:(p:string)=>boolean;isOwner?:boolean;userProfile?:UserProfile|null;currentStaff?:StaffMember|null;}){
  const [farmOpen,setFarmOpen]=useState(false);
  const [showLogoutModal,setShowLogoutModal]=useState(false);
  const farmDropRef=useRef<HTMLDivElement>(null);
  const activeFarm=farms.find(f=>f.id===activeFarmId)||farms[0];

  const displayName=(userProfile?.name||currentStaff?.name||userProfile?.email?.split("@")[0]||"User").trim();
  const displayRole=isOwner?(userProfile?.role||"Farm Owner"):(currentStaff?.role||"Staff Member");
  const userInitials=displayName
    ? displayName.split(/\s+/).filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase()
    : "U";

  /* reset dropdown when the mobile drawer closes */
  useEffect(()=>{if(!sideOpen)setFarmOpen(false);},[sideOpen]);
  /* close on click-outside */
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(farmDropRef.current&&!farmDropRef.current.contains(e.target as Node))setFarmOpen(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);
  return(
    <div className="flex flex-col border-r border-slate-200 bg-white w-full h-full">
      <div className={`h-14 flex items-center gap-2.5 border-b border-slate-100 shrink-0 ${collapsed?"justify-center px-2":"px-4"}`}>
        <img src={pondtoraLogo} alt="Pondtora" className="h-10 w-auto rounded-lg shrink-0" style={{objectFit:"contain",imageRendering:"auto"}}/>
        {!collapsed&&<div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900 leading-none font-['Barlow_Condensed',sans-serif]">Pondtora</p><p className="text-[10px] text-slate-400 mt-0.5">v1.0</p></div>}
        {onNotifications&&(
          <button onClick={onNotifications} title="Notifications" className="relative p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-slate-50 transition-colors shrink-0">
            <Bell size={16}/>
            {(unreadCount??0)>0&&<span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500"/>}
          </button>
        )}
      </div>
      {/* Farm Switcher */}
      {!collapsed&&(
        <div ref={farmDropRef} className="px-3 py-2.5 border-b border-slate-100 relative">
          <button onClick={()=>setFarmOpen(p=>!p)} className="w-full flex items-center gap-2 bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2 transition-colors">
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{activeFarm?.name||"Select Farm"}</p>
              <p className="text-[10px] text-slate-400 truncate">{activeFarm?.city}, {activeFarm?.state}</p>
            </div>
            <ChevronDown size={12} className={`text-slate-400 transition-transform shrink-0 ${farmOpen?"rotate-180":""}`}/>
          </button>
          {farmOpen&&(
            <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {farms.map(f=>(
                <button key={f.id} onClick={()=>{onSwitchFarm(f.id);setFarmOpen(false);}}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${f.id===activeFarmId?"bg-green-50":""}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${f.id===activeFarmId?"bg-green-500":"bg-slate-200"} shrink-0`}/>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{f.name}</p>
                    <p className="text-[10px] text-slate-400">{f.city}, {f.state}</p>
                  </div>
                  {f.id===activeFarmId&&<CheckCircle size={12} className="text-green-500 shrink-0 ml-auto"/>}
                </button>
              ))}
              {isOwner&&<div className="border-t border-slate-100">
                <button onClick={()=>{onAddFarm();setFarmOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-green-600 font-semibold hover:bg-green-50 transition-colors">
                  <Plus size={12}/> Add New Farm
                </button>
              </div>}
            </div>
          )}
        </div>
      )}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {NAV.filter(({id})=>{
          if(id==="pricing"||id==="settings")return isOwner===true;
          const perm=NAV_PERM[id];
          if(!perm)return true;
          return hasPerm?hasPerm(perm):true;
        }).map(({id,icon:Icon,label})=>{
          const isA=active===id;
          const showDivider=id==="pricing";
          return(
            <React.Fragment key={id}>
              {showDivider&&<div className={`${collapsed?"mx-1":"mx-2"} my-2 border-t border-slate-200`}/>}
              <button onClick={()=>onNav(id)} title={collapsed?label:undefined}
                className={`w-full flex items-center gap-2.5 rounded-lg text-[13px] transition-all mb-0.5 ${collapsed?"justify-center px-0 py-2.5":"px-3 py-2.5"} ${isA?"bg-green-50 text-green-700 font-semibold":"text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
                <Icon size={16} className={isA?"text-green-600":""}/>
                {!collapsed&&<span className="flex-1 text-left truncate">{label}</span>}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
      {!collapsed&&staff&&staff.length>0&&(()=>{
        const director=staff.find(s=>s.role==="Director"&&s.farms&&s.farms.includes(activeFarmId)&&s.status==="Active");
        const manager=staff.find(s=>s.role==="Farm Manager"&&s.farms&&s.farms.includes(activeFarmId)&&s.status==="Active");
        if(!director&&!manager)return null;
        return(
          <div className="px-3 py-2 border-t border-slate-100">
            {director&&<div className="text-[10px] text-slate-400"><span className="font-semibold text-slate-500">Director:</span> {director.name}</div>}
            {manager&&<div className="text-[10px] text-slate-400"><span className="font-semibold text-slate-500">Farm Mgr:</span> {manager.name}</div>}
          </div>
        );
      })()}
      <div className="border-t border-slate-100 shrink-0">
        {!collapsed&&(
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate" title={displayName}>
                {displayName}
              </p>
              <p className="text-[10px] text-slate-400 truncate capitalize">
                {displayRole}
              </p>
            </div>
          </div>
        )}
        {onLogout&&(
          <div className={`px-2 ${collapsed?"pt-2":""}`}>
            <button onClick={()=>setShowLogoutModal(true)} title="Log Out" className={`w-full flex items-center gap-2 py-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors text-xs ${collapsed?"justify-center":""}`}>
              <ArrowRightLeft size={14} className="rotate-90"/>
              {!collapsed&&<span>Log Out</span>}
            </button>
          </div>
        )}
        <div className={`px-2 pb-3 ${collapsed?"pt-1":""}`}>
          <button onClick={onToggle} title={collapsed?"Expand":"Collapse"} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs">
            {collapsed?<ChevronsRight size={16}/>:<><ChevronsLeft size={15}/><span>Collapse</span></>}
          </button>
        </div>
      </div>
      {showLogoutModal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-slate-900 mb-2 font-['Barlow_Condensed',sans-serif]">Log Out</h3>
            <p className="text-sm text-slate-500 mb-5">Are you sure you want to log out of your account?</p>
            <div className="flex gap-3">
              <button onClick={()=>setShowLogoutModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={()=>{setShowLogoutModal(false);onLogout&&onLogout();}} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors">Log Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Access Denied ─────────────────────────────────────────── */
function AccessDenied(){
  return(
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-3 p-6">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center"><Lock size={24} className="text-slate-400"/></div>
      <h2 className="text-base font-bold text-slate-800 font-['Barlow_Condensed',sans-serif]">Access Restricted</h2>
      <p className="text-sm text-slate-400 text-center max-w-xs">You don't have permission to view this page. Contact your administrator to request access.</p>
    </div>
  );
}

/* ─── 1. Financial Dashboard ────────────────────────────────── */
function FinancialDashboard({expenses,revenues,onAddExpense,onAddRevenue,onEditExpense,onEditRevenue,stockEvents,ponds,inventory,currency="₦",currentUser}:{expenses:Expense[];revenues:Revenue[];onAddExpense:(e:Expense)=>void;onAddRevenue:(r:Revenue)=>void;onEditExpense:(e:Expense)=>void;onEditRevenue:(r:Revenue)=>void;stockEvents?:StockEvent[];ponds?:Pond[];inventory?:FeedItem[];currency?:string;currentUser?:{name:string;email:string};}){
  const cs=currency;
  const [selYear,setSelYear]=useState(new Date().getFullYear());
  const [dashFilterYear,setDashFilterYear]=useState(new Date().getFullYear());
  const [dashFilterMonth,setDashFilterMonth]=useState(()=>new Date().toLocaleString("en",{month:"short"}));
  const [showCustomPicker,setShowCustomPicker]=useState(false);
  const [customStart,setCustomStart]=useState("");
  const [customEnd,setCustomEnd]=useState("");
  const [customApplied,setCustomApplied]=useState(false);
  const DASH_MONTHS=["All","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DASH_YEARS=[2024,2025,2026,2027];
  const [showExp,setShowExp]=useState(false);
  const [showRev,setShowRev]=useState(false);
  const [dashMenuOpen,setDashMenuOpen]=useState(false);
  const dashMenuRef=useRef<HTMLDivElement>(null);
  const chartScrollRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(dashMenuRef.current&&!dashMenuRef.current.contains(e.target as Node))setDashMenuOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const [editExp,setEditExp]=useState<Expense|null>(null);
  const [editRev,setEditRev]=useState<Revenue|null>(null);
  const [viewExp,setViewExp]=useState<Expense|null>(null);
  const [viewRev,setViewRev]=useState<Revenue|null>(null);
  const [expF,setExpF]=useState({category:"Feed",amount:"",date:TODAY,pond:"",desc:"",fishStock:""});
  const [expFErr,setExpFErr]=useState<Record<string,string>>({});
  const [revF,setRevF]=useState({source:"Fish Sales",amount:"",date:TODAY,notes:"",pond:"",stockBatch:""});
  const [revFErr,setRevFErr]=useState<Record<string,string>>({});
  const [expSort,setExpSort]=useState("date"); const [expDir,setExpDir]=useState<SortDir>("desc");
  const [expPage,setExpPage]=useState(1);
  const [revPage,setRevPage]=useState(1);
  const toggleExpSort=(f:string)=>{if(expSort===f)setExpDir(p=>p==="asc"?"desc":"asc");else{setExpSort(f);setExpDir("asc");}};
  const openEditExp=(e:Expense)=>setEditExp({...e});
  const openEditRev=(r:Revenue)=>setEditRev({...r});
  const handleSaveEditExp=()=>{
    if(!editExp)return;
    const original=expenses.find(x=>x.id===editExp.id);
    const entry:EditEntry={originalAmount:original?.amount||0,updatedAmount:editExp.amount,originalDate:original?.date||"",updatedDate:editExp.date,originalDesc:original?.desc||"",updatedDesc:editExp.desc,editedAt:new Date().toISOString(),editedBy:currentUser?.name||"Unknown",editedById:currentUser?.email||""};
    const updated:Expense={...editExp,originalDesc:editExp.originalDesc??editExp.desc,editHistory:[...(editExp.editHistory||[]),entry]};
    onEditExpense(updated);setEditExp(null);
  };
  const handleSaveEditRev=()=>{
    if(!editRev)return;
    const original=revenues.find(x=>x.id===editRev.id);
    const entry:EditEntry={originalAmount:original?.amount||0,updatedAmount:editRev.amount,originalDate:original?.date||"",updatedDate:editRev.date,originalDesc:original?.notes||"",updatedDesc:editRev.notes,editedAt:new Date().toISOString(),editedBy:currentUser?.name||"Unknown",editedById:currentUser?.email||""};
    const updated:Revenue={...editRev,originalNotes:editRev.originalNotes??editRev.notes,editHistory:[...(editRev.editHistory||[]),entry]};
    onEditRevenue(updated);setEditRev(null);
  };

  // Scroll chart to current month on mount and when year changes
  useEffect(()=>{
    const el=chartScrollRef.current;
    if(!el)return;
    const curMonIdx=new Date().getMonth();
    const colW=72;
    const targetX=curMonIdx*colW-el.clientWidth/2+colW/2;
    el.scrollLeft=Math.max(0,targetX);
  },[selYear]);

  // Real chart data — all 12 months of the selected year from actual expenses/revenues
  const MONTHS_12=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const yearRevs=revenues.filter(r=>r.year===selYear);
  const yearExps=expenses.filter(e=>e.year===selYear);
  const filtExp=expenses.filter(e=>{
    if(customApplied&&customStart&&customEnd){return e.date>=customStart&&e.date<=customEnd;}
    return dashFilterMonth==="All"?e.year===dashFilterYear:e.month===dashFilterMonth&&e.year===dashFilterYear;
  });
  const filtRev=revenues.filter(r=>{
    if(customApplied&&customStart&&customEnd){return r.date>=customStart&&r.date<=customEnd;}
    return dashFilterMonth==="All"?r.year===dashFilterYear:r.month===dashFilterMonth&&r.year===dashFilterYear;
  });
  // Real stats from filtered data
  const totalRev=filtRev.reduce((s,r)=>s+r.amount,0);
  const totalExp=filtExp.reduce((s,e)=>s+e.amount,0);
  const netProfit=totalRev-totalExp;
  const feedCost=filtExp.filter(e=>e.category==="Feed").reduce((s,e)=>s+e.amount,0);
  const stockCost=filtExp.filter(e=>e.category==="Fish Stock").reduce((s,e)=>s+e.amount,0);
  const maintCost=filtExp.filter(e=>e.category==="Maintenance").reduce((s,e)=>s+e.amount,0);
  const overhead=filtExp.filter(e=>["Labor","Utilities","General Overhead"].includes(e.category)).reduce((s,e)=>s+e.amount,0);
  const inventoryValue=(inventory||[]).reduce((s,f)=>s+f.bags*f.costPerBag,0);
  const pieRows=[
    {name:"Feed",value:feedCost,color:"#0d9488"},
    {name:"Fish Stock",value:stockCost,color:"#3b82f6"},
    {name:"Maintenance",value:maintCost,color:"#f59e0b"},
    {name:"Labor",value:filtExp.filter(e=>e.category==="Labor").reduce((s,e)=>s+e.amount,0),color:"#8b5cf6"},
    {name:"Utilities",value:filtExp.filter(e=>e.category==="Utilities").reduce((s,e)=>s+e.amount,0),color:"#ec4899"},
    {name:"Overhead",value:filtExp.filter(e=>e.category==="General Overhead").reduce((s,e)=>s+e.amount,0),color:"#64748b"},
    {name:"Loan",value:filtExp.filter(e=>e.category==="Loan").reduce((s,e)=>s+e.amount,0),color:"#ef4444"},
    {name:"Transport",value:filtExp.filter(e=>e.category==="Transportation").reduce((s,e)=>s+e.amount,0),color:"#f97316"},
    {name:"Medication",value:filtExp.filter(e=>e.category==="Medication").reduce((s,e)=>s+e.amount,0),color:"#84cc16"},
    {name:"Others",value:filtExp.filter(e=>["Others","Miscellaneous"].includes(e.category)).reduce((s,e)=>s+e.amount,0),color:"#94a3b8"},
  ].filter(p=>p.value>0);
  const chartData=MONTHS_12.map(m=>({month:m,Revenue:yearRevs.filter(r=>r.month===m).reduce((s,r)=>s+r.amount,0),Expenses:yearExps.filter(e=>e.month===m).reduce((s,e)=>s+e.amount,0)}));
  const sortedExp=useMemo(()=>[...filtExp].sort((a:any,b:any)=>{const va=a[expSort],vb=b[expSort];if(typeof va==="string")return expDir==="asc"?va.localeCompare(vb):vb.localeCompare(va);return expDir==="asc"?(va??0)-(vb??0):(vb??0)-(va??0);}),[filtExp,expSort,expDir]);
  const handleAddExp=()=>{
    const errs:Record<string,string>={};
    if(!expF.amount||Number(expF.amount)<=0)errs.amount="Amount is required";
    if(!expF.date)errs.date="Date is required";
    if(Object.keys(errs).length){setExpFErr(errs);return;}
    setExpFErr({});
    onAddExpense({id:uid(),category:expF.category,amount:Number(expF.amount),date:expF.date,month:toMon(expF.date),year:toYr(expF.date),pond:expF.pond,desc:expF.desc,originalDesc:expF.desc,fishStock:expF.fishStock||undefined,createdBy:currentUser?.name||undefined,createdById:currentUser?.email||undefined});
    setShowExp(false);setExpF({category:"Feed",amount:"",date:TODAY,pond:"",desc:"",fishStock:""});
  };
  const handleAddRev=()=>{
    const errs:Record<string,string>={};
    if(!revF.amount||Number(revF.amount)<=0)errs.amount="Amount is required";
    if(!revF.date)errs.date="Date is required";
    if(Object.keys(errs).length){setRevFErr(errs);return;}
    setRevFErr({});
    const se=revF.stockBatch?stockEvents?.find(e=>e.id===revF.stockBatch):undefined;
    const batchLabel=se?`${se.species} — ${se.count.toLocaleString()} fish (stocked ${se.date})`:undefined;
    const selPondObj=revF.source==="Fish Sales"&&revF.pond?(ponds||[]).find(p=>p.name===revF.pond):undefined;
    const revFishStock=selPondObj&&selPondObj.species!=="—"?`${selPondObj.species} (${selPondObj.stockingDate})`:undefined;
    onAddRevenue({id:uid(),source:revF.source,amount:Number(revF.amount),date:revF.date,month:toMon(revF.date),year:toYr(revF.date),notes:revF.notes,originalNotes:revF.notes,pond:revF.source==="Fish Sales"?revF.pond||undefined:undefined,stockBatch:revF.source==="Fish Sales"&&batchLabel?batchLabel:undefined,fishStock:revFishStock,createdBy:currentUser?.name||undefined,createdById:currentUser?.email||undefined});
    setShowRev(false);
    setRevF({source:"Fish Sales",amount:"",date:TODAY,notes:"",pond:"",stockBatch:""});
  };

  return(
    <div className="p-4 sm:p-6 space-y-5 max-w-[1320px]">
      <div className="flex items-start gap-3 justify-between">
        <div className="min-w-0 flex-1"><h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Financial Dashboard</h1><p className="text-xs text-slate-400 mt-1 mb-2 sm:mb-0">Track revenue, expenses, and profitability across all farm operations.</p></div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile: three-dot menu (CSV/PDF only) */}
          <div className="lg:hidden relative" ref={dashMenuRef}>
            <button onClick={()=>setDashMenuOpen(p=>!p)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-green-400 hover:text-green-600 transition-colors"><MoreVertical size={15}/></button>
            {dashMenuOpen&&(
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px]">
                <button onClick={()=>{const label=customApplied?`${customStart}-${customEnd}`:`${dashFilterMonth==="All"?"Full Year":dashFilterMonth}-${dashFilterYear}`;downloadCSV(`expenses-${label}.csv`,["Date","Category","Amount","Pond","Description"],filtExp.map(e=>[e.date,e.category,e.amount,e.pond||"",e.desc]));setDashMenuOpen(false);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><Download size={13}/> Export Expenses</button>
                <button onClick={()=>{const label=customApplied?`${customStart}-${customEnd}`:`${dashFilterMonth==="All"?"Full Year":dashFilterMonth}-${dashFilterYear}`;downloadCSV(`revenues-${label}.csv`,["Date","Source","Amount","Pond","Notes"],filtRev.map(r=>[r.date,r.source,r.amount,r.pond||"",r.notes]));setDashMenuOpen(false);}} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><FileText size={13}/> Export Revenue</button>
              </div>
            )}
          </div>
          {/* Desktop: full buttons */}
          <button onClick={()=>{const label=customApplied?`${customStart}-to-${customEnd}`:`${dashFilterMonth==="All"?"all":dashFilterMonth}-${dashFilterYear}`;downloadCSV(`expenses-${label}.csv`,["Date","Category",`Amount (${cs})`,`Pond`,"Description"],filtExp.map(e=>[e.date,e.category,e.amount,e.pond||"",e.desc]));}} className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:border-green-400 hover:text-green-600 transition-colors"><Download size={12}/> Export CSV</button>
          <button onClick={()=>{const label=customApplied?`${customStart} to ${customEnd}`:`${dashFilterMonth==="All"?"All Months":dashFilterMonth} ${dashFilterYear}`;openPrintWindow(`Financial Statement — ${label}`,["Date","Category","Amount","Pond","Description"],filtExp.map(e=>[e.date,e.category,fmt(e.amount),e.pond||"",e.desc]));}} className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:border-green-400 hover:text-green-600 transition-colors"><FileText size={12}/> PDF</button>
          <div className="hidden lg:flex gap-2">
            <PBtn onClick={()=>setShowExp(true)} sm><Plus size={13}/> Add Expense</PBtn>
            <PBtn onClick={()=>setShowRev(true)} sm><ArrowUpRight size={13}/> Add Revenue</PBtn>
          </div>
        </div>
      </div>
      {/* Mobile: add buttons row below header */}
      <div className="flex gap-2 lg:hidden">
        <PBtn onClick={()=>setShowExp(true)} sm><Plus size={13}/> Add Expense</PBtn>
        <PBtn onClick={()=>setShowRev(true)} sm><ArrowUpRight size={13}/> Add Revenue</PBtn>
      </div>
      <div className="flex flex-wrap gap-2 items-start">
        {/* Year select */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Year</label>
          <select value={dashFilterYear} onChange={e=>{setDashFilterYear(Number(e.target.value));setCustomApplied(false);setShowCustomPicker(false);setExpPage(1);setRevPage(1);}} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-green-300 appearance-none cursor-pointer pr-8 min-w-[90px]">
            {DASH_YEARS.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {/* Month select */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Month</label>
          <select value={dashFilterMonth} onChange={e=>{setDashFilterMonth(e.target.value);setCustomApplied(false);setShowCustomPicker(false);setExpPage(1);setRevPage(1);}} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-green-300 appearance-none cursor-pointer pr-8 min-w-[110px]">
            {DASH_MONTHS.map(m=><option key={m} value={m}>{m==="All"?"All Months":m}</option>)}
          </select>
        </div>
        {/* Custom Range button */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Range</label>
          <button onClick={()=>setShowCustomPicker(p=>!p)} className={`px-3 py-1.5 text-sm rounded-lg border font-semibold transition-colors ${showCustomPicker||customApplied?"border-green-400 bg-green-50 text-green-700":"border-slate-200 bg-white text-slate-600 hover:border-green-400 hover:text-green-600"}`}>
            {customApplied?`${customStart}→${customEnd}`:"Custom Range"}
          </button>
        </div>
        {customApplied&&<button onClick={()=>{setCustomApplied(false);setCustomStart("");setCustomEnd("");setShowCustomPicker(false);}} className="self-end mb-0.5 text-xs text-slate-400 hover:text-red-500 font-semibold transition-colors px-2 py-1.5">✕ Reset</button>}
      </div>
      {showCustomPicker&&(
        <div className="flex flex-wrap items-end gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">From</label>
            <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-300"/>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">To</label>
            <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-300"/>
          </div>
          <button onClick={()=>{if(customStart&&customEnd){setCustomApplied(true);setShowCustomPicker(false);}}} className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors">Apply Filter</button>
          <button onClick={()=>{setCustomApplied(false);setCustomStart("");setCustomEnd("");setShowCustomPicker(false);}} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">Reset</button>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Revenue"  value={fmt(totalRev)}  sub={`${filtRev.length} entries`} icon={ArrowUpRight} trend={totalRev>0?{dir:"up",val:`${Math.round((netProfit/totalRev)*100)}% margin`}:undefined}/>
        <StatCard label="Total Expenses" value={fmt(totalExp)}  sub={`${filtExp.length} entries`} icon={ArrowDownRight} trend={totalExp>0?{dir:"up",val:`${filtExp.length} records`,good:false}:undefined}/>
        <StatCard label="Net Profit"     value={fmt(netProfit)} sub={`${totalRev>0?Math.round((netProfit/totalRev)*100):0}% margin`} icon={TrendingUp} hi valueColor={netProfit>0?"green":netProfit<0?"red":"neutral"}/>
        <StatCard label="Feed Costs"     value={fmt(feedCost)}  sub={feedCost>0&&totalExp>0?`${Math.round((feedCost/totalExp)*100)}% of total`:undefined} icon={Layers}/>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Fish Stock Costs" value={fmt(stockCost)} icon={Fish}/>
        <StatCard label="Maintenance"      value={fmt(maintCost)} icon={Calculator}/>
        <StatCard label="Labor + Overhead" value={fmt(overhead)}  icon={Layers}/>
        <StatCard label="Inventory Value"  value={fmt(inventoryValue)} sub={`${(inventory||[]).length} items`} icon={Package}/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Cost vs Revenue</p>
            <div className="relative"><select value={selYear} onChange={e=>{setSelYear(Number(e.target.value));}} className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-green-300 appearance-none pr-7 cursor-pointer">{DASH_YEARS.map(y=><option key={y} value={y}>{y}</option>)}</select><ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
          </div>
          {(()=>{
            const maxVal=Math.max(...chartData.map(d=>Math.max(d.Revenue,d.Expenses)),1);
            const mag=Math.pow(10,Math.floor(Math.log10(maxVal)));
            const niceMax=Math.ceil(maxVal/mag)*mag;
            const CHART_H=240;
            const X_H=24;
            const YAXIS_W=54;
            const BAR_MIN_W=Math.max(chartData.length*72,240);
            return(
              <>
                <div className="flex" style={{gap:0}}>
                  {/* Sticky Y-axis strip — overflow:hidden clips the invisible 16px plot area */}
                  <div style={{width:YAXIS_W,flexShrink:0,overflow:"hidden",background:"white",zIndex:1}}>
                    <BarChart width={YAXIS_W+16} height={CHART_H} data={chartData} margin={{top:4,right:0,left:0,bottom:X_H}}>
                      <YAxis tickFormatter={yFmt} tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} width={YAXIS_W} domain={[0,niceMax]}/>
                      <Bar dataKey="Revenue" fill="transparent" isAnimationActive={false}/>
                    </BarChart>
                  </div>
                  {/* Scrollable bars */}
                  <div className="overflow-x-auto flex-1 min-w-0" ref={chartScrollRef}>
                    <div style={{minWidth:BAR_MIN_W}}>
                      <ResponsiveContainer width="100%" height={CHART_H}>
                        <BarChart data={chartData} margin={{top:4,right:8,left:0,bottom:0}} barGap={3} barCategoryGap="25%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                          <XAxis dataKey="month" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false} height={X_H}/>
                          <YAxis width={0} domain={[0,niceMax]} tick={false} axisLine={false} tickLine={false}/>
                          <Tooltip content={(p:any)=><Tip {...p} yFmt={yFmt}/>}/>
                          <Bar dataKey="Revenue"  name="Revenue"  fill="#00BB58" radius={[4,4,0,0]} isAnimationActive={false}/>
                          <Bar dataKey="Expenses" name="Expenses" fill="#f43f5e" radius={[4,4,0,0]} isAnimationActive={false}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-5 mt-1">
                  <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#00BB58]"/><span className="text-[11px] text-slate-500">Revenue</span></div>
                  <div className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f43f5e]"/><span className="text-[11px] text-slate-500">Expenses</span></div>
                </div>
              </>
            );
          })()}
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Expense Breakdown</p>
            
          </div>
          {pieRows.length===0?<p className="text-xs text-slate-400 py-4 text-center">No data</p>:(
            <><ResponsiveContainer width="100%" height={150}><PieChart><Pie data={pieRows} dataKey="value" cx="50%" cy="50%" outerRadius={68} innerRadius={38} isAnimationActive={false}>{pieRows.map(e=><Cell key={e.name} fill={e.color}/>)}</Pie><Tooltip formatter={(v:number)=>fmt(v)}/></PieChart></ResponsiveContainer>
            <div className="space-y-1.5 mt-2">{pieRows.map(e=><div key={e.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:e.color}}/><span className="text-slate-500">{e.name}</span></div><span className="text-slate-800 font-semibold">{fmt(e.value)}</span></div>)}</div></>
          )}
        </Card>
      </div>
      <Card>
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wider text-slate-600">Expense Records</p><p className="text-[11px] text-slate-400">{sortedExp.length} records</p></div>
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 text-[11px] text-slate-400 w-10 sticky left-0 z-20 bg-slate-50">#</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 border-r border-slate-200 whitespace-nowrap cursor-pointer select-none hover:text-green-600 transition-colors" onClick={()=>toggleExpSort("date")}><div className="flex items-center gap-1">Date<div className="flex flex-col -space-y-0.5"><ChevronUp size={9} className={expSort==="date"&&expDir==="asc"?"text-green-600":"text-slate-200"}/><ChevronDown size={9} className={expSort==="date"&&expDir==="desc"?"text-green-600":"text-slate-200"}/></div></div></th>
            <SH label="Category" field="category" sf={expSort} sd={expDir} onSort={toggleExpSort}/>
            <SH label="Amount" field="amount" sf={expSort} sd={expDir} onSort={toggleExpSort}/>
            <SH label="Pond" field="pond" sf={expSort} sd={expDir} onSort={toggleExpSort}/>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider whitespace-nowrap">Fish Stock</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Description</th>
            <th className="px-4 py-3 w-16 text-center text-[11px] text-slate-400 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {sortedExp.slice((expPage-1)*PER_PAGE,expPage*PER_PAGE).map((e,i)=>(
              <tr key={e.id} onClick={()=>setViewExp(e)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-4 py-3 text-slate-300 text-xs font-mono sticky left-0 z-10 bg-white">{i+1}</td>
                <td className="px-4 py-3 sticky left-10 z-10 bg-white border-r border-slate-100 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">{e.date}</span>
                    {(e.editHistory?.length||0)>0&&<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">Edited</span>}
                  </div>
                </td>
                <td className="px-4 py-3"><Bdg label={e.category} color="amber"/></td>
                <td className="px-4 py-3 font-bold text-red-500 font-['Barlow_Condensed',sans-serif]">{fmt(e.amount)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{e.pond||"—"}</td>
                <td className="px-4 py-3 text-xs text-teal-600 font-medium">{e.fishStock||<span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3 text-slate-600">{e.originalDesc??e.desc}</td>
                <td className="px-4 py-3 text-center" onClick={ev=>ev.stopPropagation()}>
                  <button onClick={()=>openEditExp(e)} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"><Pencil size={13}/></button>
                </td>
              </tr>
            ))}
            {sortedExp.length===0&&<tr><td colSpan={8} className="text-center text-xs text-slate-400 py-8">No expenses for selected period</td></tr>}
          </tbody>
        </table></div>
        <div className="px-4 pb-2"><Pagination total={sortedExp.length} page={expPage} perPage={PER_PAGE} onPage={setExpPage}/></div>
      </Card>
      <Card>
        <div className="px-5 py-3 border-b border-slate-100"><p className="text-xs font-bold uppercase tracking-wider text-slate-600">Revenue Records</p></div>
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 text-[11px] text-slate-400 w-10 sticky left-0 z-20 bg-slate-50">#</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 border-r border-slate-200">Date</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Source</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Amount</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Pond</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Fish Stock</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Notes</th>
            <th className="px-4 py-3 w-8"/>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filtRev.slice((revPage-1)*PER_PAGE,revPage*PER_PAGE).map((r,i)=>(
              <tr key={r.id} onClick={()=>setViewRev(r)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-4 py-3 text-slate-300 text-xs font-mono sticky left-0 z-10 bg-white">{i+1}</td>
                <td className="px-4 py-3 sticky left-10 z-10 bg-white border-r border-slate-100 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">{r.date}</span>
                    {(r.editHistory?.length||0)>0&&<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">Edited</span>}
                  </div>
                </td>
                <td className="px-4 py-3"><Bdg label={r.source} color="teal"/></td>
                <td className="px-4 py-3 font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">{fmt(r.amount)}</td>
                <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{r.source==="Fish Sales"&&r.pond?r.pond:<span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3 text-xs text-teal-600 font-medium max-w-[180px] truncate">{r.fishStock||<span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{r.originalNotes??r.notes}</td>
                <td className="px-4 py-3 text-center" onClick={ev=>ev.stopPropagation()}>
                  <button onClick={()=>openEditRev(r)} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"><Pencil size={13}/></button>
                </td>
              </tr>
            ))}
            {filtRev.length===0&&<tr><td colSpan={8} className="text-center text-xs text-slate-400 py-8">No revenue for selected period</td></tr>}
          </tbody>
        </table></div>
        <div className="px-4 pb-2"><Pagination total={filtRev.length} page={revPage} perPage={PER_PAGE} onPage={setRevPage}/></div>
      </Card>
      {showExp&&<Modal title="Add Expense" onClose={()=>{setShowExp(false);setExpFErr({}); }}>
        <F label="Category"><select value={expF.category} onChange={e=>setExpF(p=>({...p,category:e.target.value}))} className={SC}>{EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}</select></F>
        <div className="grid grid-cols-2 gap-3">
          <div><F label={`Amount (${cs})`}><NumInput value={expF.amount} onChange={v=>{setExpF(p=>({...p,amount:v}));if(v&&Number(v)>0)setExpFErr(p=>({...p,amount:""}));}} className={`${IC}${expFErr.amount?" border-red-400 focus:ring-red-200":""}`} placeholder="Enter amount"/></F>{expFErr.amount&&<p className="text-xs text-red-500 mt-1">{expFErr.amount}</p>}</div>
          <div><F label="Date"><DateInput value={expF.date} onChange={v=>{setExpF(p=>({...p,date:v}));if(v)setExpFErr(p=>({...p,date:""}));}}/></F>{expFErr.date&&<p className="text-xs text-red-500 mt-1">{expFErr.date}</p>}</div>
        </div>
        <F label="Pond (Optional)"><select value={expF.pond} onChange={e=>{const pn=e.target.value;const pd=(ponds||[]).find(p=>p.name===pn);const fs=pd&&pd.species!=="—"?`${pd.species} (${pd.stockingDate})`:"";setExpF(p=>({...p,pond:pn,fishStock:fs}));}} className={SC}><option value="">None</option>{(ponds||[]).map(p=><option key={p.id}>{p.name}</option>)}</select></F>
        {expF.fishStock&&<div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg"><Fish size={12} className="text-teal-600 shrink-0"/><span className="text-xs text-teal-700 font-semibold">{expF.fishStock}</span></div>}
        <F label="Description"><input type="text" value={expF.desc} onChange={e=>setExpF(p=>({...p,desc:e.target.value}))} className={IC} placeholder="Brief description…"/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleAddExp}><Plus size={14}/> Save</PBtn><button onClick={()=>{setShowExp(false);setExpFErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {showRev&&<Modal title="Add Revenue" onClose={()=>{setShowRev(false);setRevFErr({});}}>
        <F label="Revenue Source"><select value={revF.source} onChange={e=>setRevF(p=>({...p,source:e.target.value,pond:"",stockBatch:""}))} className={SC}>{REVENUE_SRCS.map(s=><option key={s}>{s}</option>)}</select></F>
        {revF.source==="Fish Sales"&&<F label="Sold From (Pond)"><select value={revF.pond} onChange={e=>setRevF(p=>({...p,pond:e.target.value,stockBatch:""}))} className={SC}><option value="">Select pond (optional)</option>{(ponds||[]).filter(p=>p.status==="Active").map(p=><option key={p.id}>{p.name}</option>)}</select></F>}
        {revF.source==="Fish Sales"&&revF.pond&&(()=>{const selPond=(ponds||[]).find(p=>p.name===revF.pond);const stockEventsForPond=(stockEvents||[]).filter(e=>selPond&&e.pondId===selPond.id).sort((a,b)=>b.date.localeCompare(a.date));return(<F label="Stock Batch"><select value={revF.stockBatch} onChange={e=>setRevF(p=>({...p,stockBatch:e.target.value}))} className={SC}><option value="">Current active stock</option>{stockEventsForPond.map(ev=><option key={ev.id} value={ev.id}>{ev.species} — {ev.count.toLocaleString()} fish (stocked {ev.date})</option>)}</select></F>);})()}
        <div className="grid grid-cols-2 gap-3">
          <div><F label={`Amount (${cs})`}><NumInput value={revF.amount} onChange={v=>{setRevF(p=>({...p,amount:v}));if(v&&Number(v)>0)setRevFErr(p=>({...p,amount:""}));}} className={`${IC}${revFErr.amount?" border-red-400 focus:ring-red-200":""}`} placeholder="Enter amount"/></F>{revFErr.amount&&<p className="text-xs text-red-500 mt-1">{revFErr.amount}</p>}</div>
          <div><F label="Date"><DateInput value={revF.date} onChange={v=>{setRevF(p=>({...p,date:v}));if(v)setRevFErr(p=>({...p,date:""}));}}/></F>{revFErr.date&&<p className="text-xs text-red-500 mt-1">{revFErr.date}</p>}</div>
        </div>
        <F label="Notes"><input type="text" value={revF.notes} onChange={e=>setRevF(p=>({...p,notes:e.target.value}))} className={IC} placeholder="Optional notes…"/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleAddRev}><Plus size={14}/> Save</PBtn><button onClick={()=>{setShowRev(false);setRevFErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {editExp&&<Modal title="Edit Expense" onClose={()=>setEditExp(null)}>
        <F label="Category"><select value={editExp.category} onChange={e=>setEditExp(p=>p?{...p,category:e.target.value}:p)} className={SC}>{EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}</select></F>
        <div className="grid grid-cols-2 gap-3"><F label={`Amount (${cs})`}><NumInput value={editExp.amount} onChange={v=>setEditExp(p=>p?{...p,amount:Number(v)||0}:p)} className={IC} placeholder="Enter amount"/></F><F label="Date"><DateInput value={editExp.date} onChange={v=>setEditExp(p=>p?{...p,date:v,month:toMon(v),year:toYr(v)}:p)}/></F></div>
        <F label="Pond"><select value={editExp.pond} onChange={e=>setEditExp(p=>p?{...p,pond:e.target.value}:p)} className={SC}><option value="">None</option>{(ponds||[]).map(p=><option key={p.id}>{p.name}</option>)}</select></F>
        <F label="Description"><input type="text" value={editExp.desc} onChange={e=>setEditExp(p=>p?{...p,desc:e.target.value}:p)} className={IC}/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleSaveEditExp}><CheckCircle size={14}/> Save Changes</PBtn><button onClick={()=>setEditExp(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {editRev&&<Modal title="Edit Revenue" onClose={()=>setEditRev(null)}>
        <F label="Revenue Source"><select value={editRev.source} onChange={e=>setEditRev(p=>p?{...p,source:e.target.value,pond:undefined,stockBatch:undefined}:p)} className={SC}>{REVENUE_SRCS.map(s=><option key={s}>{s}</option>)}</select></F>
        {editRev.source==="Fish Sales"&&<F label="Sold From (Pond)"><select value={editRev.pond||""} onChange={e=>setEditRev(p=>p?{...p,pond:e.target.value||undefined,stockBatch:undefined}:p)} className={SC}><option value="">Select pond (optional)</option>{(ponds||[]).filter(p=>p.status==="Active").map(p=><option key={p.id}>{p.name}</option>)}</select></F>}
        {editRev.source==="Fish Sales"&&editRev.pond&&(()=>{const selPond=(ponds||[]).find(p=>p.name===editRev.pond);const evts=(stockEvents||[]).filter(e=>selPond&&e.pondId===selPond.id).sort((a,b)=>b.date.localeCompare(a.date));return(<F label="Fish Stock / Batch"><select value={editRev.stockBatch||""} onChange={e=>setEditRev(p=>p?{...p,stockBatch:e.target.value||undefined}:p)} className={SC}><option value="">Current active stock</option>{evts.map(ev=><option key={ev.id} value={`${ev.species} — ${ev.count.toLocaleString()} fish (stocked ${ev.date})`}>{ev.species} — {ev.count.toLocaleString()} fish (stocked {ev.date})</option>)}</select></F>);})()}
        <div className="grid grid-cols-2 gap-3"><F label={`Amount (${cs})`}><NumInput value={editRev.amount} onChange={v=>setEditRev(p=>p?{...p,amount:Number(v)||0}:p)} className={IC} placeholder="Enter amount"/></F><F label="Date"><DateInput value={editRev.date} onChange={v=>setEditRev(p=>p?{...p,date:v,month:toMon(v),year:toYr(v)}:p)}/></F></div>
        <F label="Notes"><input type="text" value={editRev.notes} onChange={e=>setEditRev(p=>p?{...p,notes:e.target.value}:p)} className={IC}/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleSaveEditRev}><CheckCircle size={14}/> Save Changes</PBtn><button onClick={()=>setEditRev(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
      {viewExp&&<Modal title="Expense Details" onClose={()=>setViewExp(null)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Category</p><p className="text-sm font-semibold text-slate-800">{viewExp.category}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Amount</p><p className="text-sm font-bold text-red-500 font-['Barlow_Condensed',sans-serif]">{fmt(viewExp.amount)}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Date</p><p className="text-sm text-slate-700">{viewExp.date}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Pond</p><p className="text-sm text-slate-700">{viewExp.pond||"—"}</p></div>
          </div>
          {viewExp.fishStock&&<div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg"><Fish size={12} className="text-teal-600 shrink-0"/><div><p className="text-[10px] uppercase tracking-wider text-teal-500 mb-0.5">Fish Stock</p><p className="text-xs text-teal-700 font-semibold">{viewExp.fishStock}</p></div></div>}
          <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Description</p><p className="text-sm text-slate-700">{(viewExp.originalDesc??viewExp.desc)||"—"}</p></div>
          {(viewExp.createdBy)&&<div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Created By</p><p className="text-sm text-slate-700">{viewExp.createdBy}{viewExp.createdById&&<span className="text-slate-400 ml-1.5 text-xs">({viewExp.createdById})</span>}</p></div>}
          {(viewExp.editHistory?.length||0)>0&&<div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 flex items-center gap-1.5"><History size={11}/> Edit History</p>
            <div className="space-y-2">
              {viewExp.editHistory!.map((entry,idx)=>(
                <div key={idx} className="border border-amber-200 bg-amber-50 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-800">{entry.editedBy}</span>
                    <span className="text-amber-600 font-mono">{new Date(entry.editedAt).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                  {entry.editedById&&<p className="text-amber-600">{entry.editedById}</p>}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white rounded-lg p-2 border border-amber-100"><p className="text-[10px] text-slate-400 mb-0.5">Amount</p><p className="text-slate-500 line-through">{fmt(entry.originalAmount)}</p><p className="text-slate-800 font-semibold">{fmt(entry.updatedAmount)}</p></div>
                    <div className="bg-white rounded-lg p-2 border border-amber-100"><p className="text-[10px] text-slate-400 mb-0.5">Date</p><p className="text-slate-500 line-through text-[11px]">{entry.originalDate}</p><p className="text-slate-800 font-semibold text-[11px]">{entry.updatedDate}</p></div>
                  </div>
                  {(entry.originalDesc!==entry.updatedDesc)&&<div className="bg-white rounded-lg p-2 border border-amber-100"><p className="text-[10px] text-slate-400 mb-0.5">Description</p>{entry.originalDesc&&<p className="text-slate-500 line-through text-[11px]">{entry.originalDesc}</p>}<p className="text-slate-800 font-semibold text-[11px]">{entry.updatedDesc||"—"}</p></div>}
                </div>
              ))}
            </div>
          </div>}
        </div>
        <div className="pt-2"><button onClick={()=>setViewExp(null)} className="px-4 py-2 text-sm text-slate-400">Close</button></div>
      </Modal>}
      {viewRev&&<Modal title="Revenue Details" onClose={()=>setViewRev(null)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Source</p><p className="text-sm font-semibold text-slate-800">{viewRev.source}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Amount</p><p className="text-sm font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">{fmt(viewRev.amount)}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Date</p><p className="text-sm text-slate-700">{viewRev.date}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Pond</p><p className="text-sm text-slate-700">{viewRev.pond||"—"}</p></div>
          </div>
          {viewRev.fishStock&&<div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg"><Fish size={12} className="text-teal-600 shrink-0"/><div><p className="text-[10px] uppercase tracking-wider text-teal-500 mb-0.5">Fish Stock</p><p className="text-xs text-teal-700 font-semibold">{viewRev.fishStock}</p></div></div>}
          <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Notes</p><p className="text-sm text-slate-700">{(viewRev.originalNotes??viewRev.notes)||"—"}</p></div>
          {(viewRev.createdBy)&&<div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Created By</p><p className="text-sm text-slate-700">{viewRev.createdBy}{viewRev.createdById&&<span className="text-slate-400 ml-1.5 text-xs">({viewRev.createdById})</span>}</p></div>}
          {(viewRev.editHistory?.length||0)>0&&<div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 flex items-center gap-1.5"><History size={11}/> Edit History</p>
            <div className="space-y-2">
              {viewRev.editHistory!.map((entry,idx)=>(
                <div key={idx} className="border border-amber-200 bg-amber-50 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-800">{entry.editedBy}</span>
                    <span className="text-amber-600 font-mono">{new Date(entry.editedAt).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                  {entry.editedById&&<p className="text-amber-600">{entry.editedById}</p>}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white rounded-lg p-2 border border-amber-100"><p className="text-[10px] text-slate-400 mb-0.5">Amount</p><p className="text-slate-500 line-through">{fmt(entry.originalAmount)}</p><p className="text-slate-800 font-semibold">{fmt(entry.updatedAmount)}</p></div>
                    <div className="bg-white rounded-lg p-2 border border-amber-100"><p className="text-[10px] text-slate-400 mb-0.5">Date</p><p className="text-slate-500 line-through text-[11px]">{entry.originalDate}</p><p className="text-slate-800 font-semibold text-[11px]">{entry.updatedDate}</p></div>
                  </div>
                  {(entry.originalDesc!==entry.updatedDesc)&&<div className="bg-white rounded-lg p-2 border border-amber-100"><p className="text-[10px] text-slate-400 mb-0.5">Notes</p>{entry.originalDesc&&<p className="text-slate-500 line-through text-[11px]">{entry.originalDesc}</p>}<p className="text-slate-800 font-semibold text-[11px]">{entry.updatedDesc||"—"}</p></div>}
                </div>
              ))}
            </div>
          </div>}
        </div>
        <div className="pt-2"><button onClick={()=>setViewRev(null)} className="px-4 py-2 text-sm text-slate-400">Close</button></div>
      </Modal>}
    </div>
  );
}

/* ─── Pond Detail and Pond Management extracted to PondManagementPage ── */
// function PondDetail — see pages/PondManagementPage.tsx

/* ─── 2. Pond Management — see pages/PondManagementPage.tsx ─── */
// function PondManagement placeholder (removed — imported from pages/PondManagementPage.tsx)

/* ─── 3. Feed Inventory — see pages/FeedInventoryPage.tsx ─── */
// function FeedInventory placeholder (removed — imported from pages/FeedInventoryPage.tsx)

/* ─── 4. Feed Documentation — see pages/FeedDocumentationPage.tsx ─── */
// placeholder start — actual body removed

/* ─── 5. Pricing ────────────────────────────────────────────── */
function Pricing({ponds}:{ponds:Pond[]}){
  const activePonds=ponds.filter(p=>p.status==="Active");
  const [fSpecies,setFSpecies]=useState("All");
  const species=[...new Set(activePonds.map(p=>p.species))];
  const data=activePonds.map(p=>({pond:p.name,species:p.species,fish:p.currentCount,totalCost:p.totalCost,costPerFish:p.currentCount>0?Math.round(p.totalCost/p.currentCount):0,sellKg:p.species==="Catfish"?1100:750,estRevenue:p.currentCount*(p.species==="Catfish"?1100:750),estProfit:p.currentCount*(p.species==="Catfish"?1100:750)-p.totalCost}));
  const {sorted,sf,sd,toggle}=useSort(data,"pond");
  const filtData=sorted.filter(d=>fSpecies==="All"||d.species===fSpecies);
  const totRev=filtData.reduce((s,d)=>s+d.estRevenue,0); const totProfit=filtData.reduce((s,d)=>s+d.estProfit,0); const totFish=filtData.reduce((s,d)=>s+d.fish,0); const totCost=filtData.reduce((s,d)=>s+d.totalCost,0);
  return(
    <div className="p-4 sm:p-6 space-y-5 max-w-[1100px]">
      <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Pricing & Profitability</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Fish" value={totFish.toLocaleString()} icon={Fish}/>
        <StatCard label="Avg Cost/Fish" value={fmt(totFish>0?Math.round(totCost/totFish):0)} sub="all-in" icon={Calculator} hi/>
        <StatCard label="Est. Revenue" value={fmt(totRev)} icon={ArrowUpRight}/>
        <StatCard label="Est. Net Profit" value={fmt(totProfit)} icon={TrendingUp}/>
      </div>
      <div className="flex items-center gap-2"><span className="text-xs text-slate-400">Species:</span><select value={fSpecies} onChange={e=>setFSpecies(e.target.value)} className={`${SC} py-1.5 text-xs w-auto`}><option>All</option>{species.map(s=><option key={s}>{s}</option>)}</select></div>
      <Card><div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]">
        <thead><tr className="border-b border-slate-100 bg-slate-50">
          <th className="px-4 py-3 text-[11px] text-slate-400 w-10 sticky left-0 z-20 bg-slate-50">#</th>
          <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 border-r border-slate-200 whitespace-nowrap cursor-pointer select-none hover:text-green-600" onClick={()=>toggle("pond")}><div className="flex items-center gap-1">Pond<div className="flex flex-col -space-y-0.5"><ChevronUp size={9} className={sf==="pond"&&sd==="asc"?"text-green-600":"text-slate-200"}/><ChevronDown size={9} className={sf==="pond"&&sd==="desc"?"text-green-600":"text-slate-200"}/></div></div></th>
          <SH label="Species" field="species" sf={sf} sd={sd} onSort={toggle}/>
          <SH label="Fish Count" field="fish" sf={sf} sd={sd} onSort={toggle}/>
          <SH label="Total Cost" field="totalCost" sf={sf} sd={sd} onSort={toggle}/>
          <SH label="Cost/Fish" field="costPerFish" sf={sf} sd={sd} onSort={toggle}/>
          <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Sell/kg</th>
          <SH label="Est. Revenue" field="estRevenue" sf={sf} sd={sd} onSort={toggle}/>
          <SH label="Est. Profit" field="estProfit" sf={sf} sd={sd} onSort={toggle}/>
          <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">ROI</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-50">
          {filtData.slice(0,12).map((row,i)=>{const roi=row.totalCost>0?((row.estProfit/row.totalCost)*100).toFixed(1):"0.0";return(
            <tr key={row.pond} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3.5 text-slate-300 text-xs font-mono sticky left-0 z-10 bg-white">{i+1}</td>
              <td className="px-4 py-3.5 font-semibold text-slate-900 sticky left-10 z-10 bg-white border-r border-slate-100">{row.pond}</td>
              <td className="px-4 py-3.5 text-slate-500">{row.species}</td>
              <td className="px-4 py-3.5 font-bold font-['Barlow_Condensed',sans-serif]">{row.fish.toLocaleString()}</td>
              <td className="px-4 py-3.5 text-red-500 font-semibold font-['Barlow_Condensed',sans-serif]">{fmt(row.totalCost)}</td>
              <td className="px-4 py-3.5 text-slate-600">{fmt(row.costPerFish)}</td>
              <td className="px-4 py-3.5 text-slate-600">{fmt(row.sellKg)}</td>
              <td className="px-4 py-3.5 font-semibold font-['Barlow_Condensed',sans-serif]">{fmt(row.estRevenue)}</td>
              <td className="px-4 py-3.5 font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">{fmt(row.estProfit)}</td>
              <td className="px-4 py-3.5"><Bdg label={`${roi}%`} color={parseFloat(roi)>20?"green":parseFloat(roi)>0?"amber":"red"}/></td>
            </tr>
          );})}
          {filtData.length===0&&<tr><td colSpan={10} className="text-center text-xs text-slate-400 py-8">No ponds match filter</td></tr>}
        </tbody>
      </table></div></Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">Cost Allocation</p>
          <div className="space-y-3">
            {[{l:"Feed",pct:59,v:1850000},{l:"Fish Stock",pct:20,v:620000},{l:"Maintenance",pct:6,v:180000},{l:"Labor",pct:7,v:210000},{l:"Overhead",pct:8,v:260000}].map(item=>(
              <div key={item.l}><div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{item.l}</span><span className="font-semibold text-slate-800">{fmt(item.v)}</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{width:`${item.pct}%`}}/></div></div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">Revenue vs Profit</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={filtData} margin={{top:4,right:4,left:-10,bottom:0}} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
              <XAxis dataKey="pond" tick={{fontSize:11,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={yFmt} tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} width={52}/>
              <Tooltip content={<Tip yFmt={yFmt}/>}/><Legend wrapperStyle={{fontSize:11}}/>
              <Bar dataKey="estRevenue" name="Revenue" fill="#0d9488" radius={[4,4,0,0]} maxBarSize={32} isAnimationActive={false}/>
              <Bar dataKey="estProfit"  name="Profit"  fill="#a7f3d0" radius={[4,4,0,0]} maxBarSize={32} isAnimationActive={false}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

/* ─── 6. Staff ──────────────────────────────────────────────── */
function StaffPage({staff,onAdd,onEdit,onDelete,farms,activeFarmId}:{staff:StaffMember[];onAdd:(s:StaffMember)=>void;onEdit:(s:StaffMember)=>void;onDelete:(id:string)=>void;farms?:Farm[];activeFarmId?:string;}){
  const [showInvite,setShowInvite]=useState(false);
  const [editMember,setEditMember]=useState<StaffMember|null>(null);
  const [staffPage,setStaffPage]=useState(1);
  const [form,setForm]=useState({name:"",email:"",phone:"",role:"Feeding Staff",permissions:[] as string[],farms:[] as string[]});
  const [inviteErr,setInviteErr]=useState<Record<string,string>>({});
  const initials=(name:string)=>name.split(" ").map(w=>w[0]||"").join("").toUpperCase().slice(0,2)||"?";
  const colors=["bg-green-100 text-green-700","bg-blue-100 text-blue-700","bg-purple-100 text-purple-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700"];
  const colorFor=(id:string)=>colors[id.charCodeAt(0)%colors.length];

  const handleInvite=()=>{
    const errs:Record<string,string>={};
    if(!form.name.trim())errs.name="Staff name is required";
    if(!form.email.trim())errs.email="Email address is required";
    if(Object.keys(errs).length){setInviteErr(errs);return;}
    setInviteErr({});
    onAdd({id:uid(),name:form.name,email:form.email,phone:form.phone,role:form.role,status:"Pending",joinedDate:TODAY,permissions:form.permissions,farms:form.farms});
    setForm({name:"",email:"",phone:"",role:"Feeding Staff",permissions:[],farms:[]});
    setShowInvite(false);
  };
  const togglePerm=(perm:string,perms:string[],setter:(p:string[])=>void)=>{setter(perms.includes(perm)?perms.filter(x=>x!==perm):[...perms,perm]);};
  const toggleFarm=(fid:string,fids:string[],setter:(f:string[])=>void)=>{setter(fids.includes(fid)?fids.filter(x=>x!==fid):[...fids,fid]);};
  const handleSaveEdit=()=>{if(!editMember)return;onEdit(editMember);setEditMember(null);};

  const active=staff.filter(s=>s.status==="Active").length;
  const pending=staff.filter(s=>s.status==="Pending").length;

  return(
    <div className="p-4 sm:p-6 space-y-5 max-w-[1000px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Staff</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage team members with access to Feeding Records and Feed Stock</p>
        </div>
        <PBtn onClick={()=>setShowInvite(true)} sm><Mail size={13}/> Invite Staff</PBtn>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Staff" value={String(staff.length)} icon={Users}/>
        <StatCard label="Active" value={String(active)} icon={CheckCircle} hi/>
        <StatCard label="Pending Invite" value={String(pending)} icon={Mail}/>
      </div>

      {/* Staff list */}
      {staff.length===0?(
        <Card className="p-12 text-center">
          <Users size={36} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-sm font-semibold text-slate-400 mb-1">No staff members yet</p>
          <p className="text-xs text-slate-300 mb-4">Invite team members to give them access to feeding records and feed stock.</p>
          <div className="flex justify-center"><PBtn onClick={()=>setShowInvite(true)}><Mail size={14}/> Send First Invite</PBtn></div>
        </Card>
      ):(
        <div className="space-y-2">
          {staff.slice((staffPage-1)*PER_PAGE,staffPage*PER_PAGE).map(s=>(
            <Card key={s.id} className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${colorFor(s.id)}`}>{initials(s.name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                    <Bdg label={s.status} color={s.status==="Active"?"green":"amber"}/>
                    <Bdg label={s.role} color={s.role==="Director"?"purple":s.role==="Admin"?"teal":"blue"}/>
                    {s.permissions&&s.permissions.slice(0,2).map(p=><Bdg key={p} label={p} color="gray"/>)}
                    {s.permissions&&s.permissions.length>2&&<span className="text-[11px] text-slate-400">+{s.permissions.length-2} more</span>}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-4 gap-y-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-400 min-w-0"><Mail size={10} className="shrink-0"/><span className="truncate">{s.email}</span></span>
                    {s.phone&&<span className="flex items-center gap-1 text-xs text-slate-400 shrink-0"><Phone size={10}/>{s.phone}</span>}
                  </div>
                  {/* Mobile action row */}
                  <div className="flex flex-wrap gap-1.5 mt-2 sm:hidden">
                    {s.status==="Pending"&&<button onClick={()=>onEdit({...s,status:"Active"})} className="flex items-center gap-1 text-xs font-semibold text-green-600 border border-green-200 bg-green-50 px-2.5 py-1 rounded-lg">Activate</button>}
                    <button onClick={()=>setEditMember({...s})} className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg hover:text-green-600 hover:border-green-200"><Pencil size={11}/> Edit</button>
                    <button onClick={()=>{if(confirm(`Remove ${s.name}?`))onDelete(s.id);}} className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg hover:text-red-500 hover:border-red-200"><Trash2 size={11}/> Remove</button>
                  </div>
                </div>
                {/* Desktop actions */}
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {s.status==="Pending"&&<button onClick={()=>onEdit({...s,status:"Active"})} className="text-xs font-semibold text-green-600 hover:text-green-800 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors">Activate</button>}
                  <button onClick={()=>setEditMember({...s})} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"><Pencil size={14}/></button>
                  <button onClick={()=>{if(confirm(`Remove ${s.name}?`))onDelete(s.id);}} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
            </Card>
          ))}
          <Pagination total={staff.length} page={staffPage} perPage={PER_PAGE} onPage={setStaffPage}/>
        </div>
      )}


      {/* Invite modal */}
      {showInvite&&<Modal title="Invite Staff Member" onClose={()=>{setShowInvite(false);setInviteErr({});}} wide>
        <div><F label="Full Name"><input value={form.name} onChange={e=>{setForm(p=>({...p,name:e.target.value}));if(e.target.value.trim())setInviteErr(p=>({...p,name:""}));}} className={`${IC}${inviteErr.name?" border-red-400":""}`} placeholder="e.g. Ana Rodriguez"/></F>{inviteErr.name&&<p className="text-xs text-red-500 mt-1">{inviteErr.name}</p>}</div>
        <div><F label="Email Address"><input type="email" value={form.email} onChange={e=>{setForm(p=>({...p,email:e.target.value}));if(e.target.value.trim())setInviteErr(p=>({...p,email:""}));}} className={`${IC}${inviteErr.email?" border-red-400":""}`} placeholder="ana@example.com"/></F>{inviteErr.email&&<p className="text-xs text-red-500 mt-1">{inviteErr.email}</p>}</div>
        <F label="Phone (Optional)"><input type="tel" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} className={IC} placeholder="+234 …"/></F>
        <F label="Role"><select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} className={SC}>{STAFF_ROLES_ALL.map(r=><option key={r}>{r}</option>)}</select></F>
        <F label="Permissions">
          <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5">
            {STAFF_PERMISSIONS.map(perm=>(
              <label key={perm} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.permissions.includes(perm)} onChange={()=>togglePerm(perm,form.permissions,p=>setForm(prev=>({...prev,permissions:p})))} className="custom-check w-4 h-4 appearance-none border border-slate-300 rounded bg-white checked:bg-green-600 checked:border-green-600 transition-colors cursor-pointer"/>
                <span className="text-xs text-slate-700">{perm}</span>
              </label>
            ))}
          </div>
        </F>
        {farms&&farms.length>0&&<F label="Farm Assignment">
          <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
            {farms.map(f=>(
              <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.farms.includes(f.id)} onChange={()=>toggleFarm(f.id,form.farms,fs=>setForm(prev=>({...prev,farms:fs})))} className="custom-check w-4 h-4 appearance-none border border-slate-300 rounded bg-white checked:bg-green-600 checked:border-green-600 transition-colors cursor-pointer"/>
                <span className="text-xs text-slate-700">{f.name}</span>
              </label>
            ))}
          </div>
        </F>}
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700">An invite will be sent to <strong>{form.email||"their email"}</strong>.</div>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleInvite}><Mail size={14}/> Send Invite</PBtn><button onClick={()=>{setShowInvite(false);setInviteErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}

      {/* Edit modal */}
      {editMember&&<Modal title="Edit Staff Member" onClose={()=>setEditMember(null)} wide>
        <F label="Full Name"><input value={editMember.name} onChange={e=>setEditMember(p=>p?{...p,name:e.target.value}:p)} className={IC}/></F>
        <F label="Email Address"><input type="email" value={editMember.email} onChange={e=>setEditMember(p=>p?{...p,email:e.target.value}:p)} className={IC}/></F>
        <F label="Phone"><input type="tel" value={editMember.phone} onChange={e=>setEditMember(p=>p?{...p,phone:e.target.value}:p)} className={IC}/></F>
        <F label="Role"><select value={editMember.role} onChange={e=>setEditMember(p=>p?{...p,role:e.target.value}:p)} className={SC}>{STAFF_ROLES_ALL.map(r=><option key={r}>{r}</option>)}</select></F>
        <F label="Permissions">
          <div className="border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5">
            {STAFF_PERMISSIONS.map(perm=>(
              <label key={perm} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(editMember.permissions||[]).includes(perm)} onChange={()=>{const perms=(editMember.permissions||[]);setEditMember(p=>p?{...p,permissions:perms.includes(perm)?perms.filter(x=>x!==perm):[...perms,perm]}:p);}} className="custom-check w-4 h-4 appearance-none border border-slate-300 rounded bg-white checked:bg-green-600 checked:border-green-600 transition-colors cursor-pointer"/>
                <span className="text-xs text-slate-700">{perm}</span>
              </label>
            ))}
          </div>
        </F>
        {farms&&farms.length>0&&<F label="Farm Assignment">
          <div className="border border-slate-200 rounded-xl p-3 space-y-1.5">
            {farms.map(f=>(
              <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(editMember.farms||[]).includes(f.id)} onChange={()=>{const fids=(editMember.farms||[]);setEditMember(p=>p?{...p,farms:fids.includes(f.id)?fids.filter(x=>x!==f.id):[...fids,f.id]}:p);}} className="custom-check w-4 h-4 appearance-none border border-slate-300 rounded bg-white checked:bg-green-600 checked:border-green-600 transition-colors cursor-pointer"/>
                <span className="text-xs text-slate-700">{f.name}</span>
              </label>
            ))}
          </div>
        </F>}
        <F label="Status"><select value={editMember.status} onChange={e=>setEditMember(p=>p?{...p,status:e.target.value as "Active"|"Pending"}:p)} className={SC}><option>Active</option><option>Pending</option></select></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleSaveEdit}><CheckCircle size={14}/> Save Changes</PBtn><button onClick={()=>setEditMember(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
    </div>
  );
}

/* ─── 7. Reports ─────────────────────────────────────────────── */
function ReportsPage({reports,staff,onAdd,onEdit}:{reports:Report[];staff:StaffMember[];onAdd:(r:Report)=>void;onEdit:(r:Report)=>void;}){
  const [typeFilter,setTypeFilter]=useState<"All"|"Daily"|"Weekly"|"Monthly">("All");
  const [dateSearch,setDateSearch]=useState("");
  const [showModal,setShowModal]=useState(false);
  const [fTitle,setFTitle]=useState(""); const [fType,setFType]=useState<"Daily"|"Weekly"|"Monthly">("Daily"); const [fContent,setFContent]=useState(""); const [fAuthor,setFAuthor]=useState("Admin");
  /* Daily report fields */
  const [fFedFish,setFFedFish]=useState<"Yes"|"No"|"">("");
  const [fFedFishConfirm,setFFedFishConfirm]=useState<"Yes"|"No"|"">("");
  const [fFeedSession,setFFeedSession]=useState<"Morning"|"Evening"|"Both"|"">("");
  const [fOutletLocked,setFOutletLocked]=useState<"Yes"|"Not Me"|"">("");
  const [fOutletConfirm,setFOutletConfirm]=useState<"Yes"|"No"|"">("");
  const [fWaterFlow,setFWaterFlow]=useState<"Yes"|"No"|"">("");
  const [fWaterFlowConfirm,setFWaterFlowConfirm]=useState<"Yes"|"No"|"">("");
  const [fWaterSession,setFWaterSession]=useState<"Morning"|"Evening"|"Both"|"">("");
  const [fPumpsOff,setFPumpsOff]=useState<"Yes"|"No"|"">("");
  const [fPumpsOffConfirm,setFPumpsOffConfirm]=useState<"Yes"|"No"|"">("");
  const [fEquipStored,setFEquipStored]=useState<"Yes"|"No"|"">("");
  const [fEquipConfirm,setFEquipConfirm]=useState<"Yes"|"No"|"">("");
  const [fNotes,setFNotes]=useState("");
  const filtered=reports.filter(r=>{
    const mt=typeFilter==="All"||r.type===typeFilter;
    const md=!dateSearch||r.date===dateSearch||r.date.toLowerCase().includes(dateSearch.toLowerCase());
    return mt&&md;
  });
  const [reportPage,setReportPage]=useState(1);
  const [submitError,setSubmitError]=useState("");
  const [editReport,setEditReport]=useState<Report|null>(null);
  const isWithin6h=(r:Report)=>{if(!r.timestamp)return false;return Date.now()-new Date(r.timestamp).getTime()<6*60*60*1000;};
  const openEditReport=(r:Report)=>{
    setEditReport(r);
    setFTitle(r.title);
    setFType(r.type);
    setFAuthor(r.author);
    setFFedFish(""); setFFedFishConfirm(""); setFFeedSession(""); setFOutletLocked(""); setFOutletConfirm("");
    setFWaterFlow(""); setFWaterFlowConfirm(""); setFWaterSession(""); setFPumpsOff(""); setFPumpsOffConfirm("");
    setFEquipStored(""); setFEquipConfirm(""); setFNotes(""); setFContent(""); setSubmitError("");
    if(r.type==="Daily"){
      const pairs=r.content.split(" | ").reduce<Record<string,string>>((acc,p)=>{const idx=p.indexOf(": ");if(idx>-1)acc[p.slice(0,idx).trim()]=p.slice(idx+2).trim();return acc;},{});
      if(pairs["Fed fish today"])setFFedFish(pairs["Fed fish today"] as "Yes"|"No");
      if(pairs["Feeding session"])setFFeedSession(pairs["Feeding session"] as "Morning"|"Evening"|"Both");
      if(pairs["Locked all pond outlets/inlets"])setFOutletLocked(pairs["Locked all pond outlets/inlets"] as "Yes"|"Not Me");
      if(pairs["Outlet lock confirmed"])setFOutletConfirm(pairs["Outlet lock confirmed"] as "Yes"|"No");
      if(pairs["Pond flush/water flow-through"])setFWaterFlow(pairs["Pond flush/water flow-through"] as "Yes"|"No");
      if(pairs["Water flow session"])setFWaterSession(pairs["Water flow session"] as "Morning"|"Evening"|"Both");
      if(pairs["Pumping machines & electrical devices off"])setFPumpsOff(pairs["Pumping machines & electrical devices off"] as "Yes"|"No");
      if(pairs["Pumps off confirmed"])setFPumpsOffConfirm(pairs["Pumps off confirmed"] as "Yes"|"No");
      if(pairs["Equipment properly stored"])setFEquipStored(pairs["Equipment properly stored"] as "Yes"|"No");
      if(pairs["Equipment storage confirmed"])setFEquipConfirm(pairs["Equipment storage confirmed"] as "Yes"|"No");
      if(pairs["Additional notes"])setFNotes(pairs["Additional notes"]);
    } else {
      setFContent(r.content);
    }
    setShowModal(true);
  };
  const handleSubmit=()=>{
    setSubmitError("");
    if(!fTitle.trim()){setSubmitError("Report title is required.");return;}
    let content=fContent.trim();
    if(fType==="Daily"){
      if(fOutletLocked==="Yes"&&!fOutletConfirm){setSubmitError("Please confirm whether you locked all pond outlets and inlets.");return;}
      if(fWaterFlow==="Yes"&&!fWaterSession){setSubmitError("Please select when water flow-through was done.");return;}
      if(fPumpsOff==="Yes"&&!fPumpsOffConfirm){setSubmitError("Please confirm whether pumping machines and electrical devices were turned off.");return;}
      if(fEquipStored==="Yes"&&!fEquipConfirm){setSubmitError("Please confirm whether equipment is properly stored.");return;}
      const parts:string[]=[];
      if(fFedFish){parts.push(`Fed fish today: ${fFedFish}`);if(fFedFish==="Yes"&&fFeedSession)parts.push(`Feeding session: ${fFeedSession}`);}
      if(fOutletLocked){const effectiveOutlet=fOutletLocked==="Yes"&&fOutletConfirm==="No"?"No":fOutletLocked;parts.push(`Locked all pond outlets/inlets: ${effectiveOutlet}`);if(fOutletLocked==="Yes"&&fOutletConfirm)parts.push(`Outlet lock confirmed: ${fOutletConfirm}`);}
      if(fWaterFlow){parts.push(`Pond flush/water flow-through: ${fWaterFlow}`);if(fWaterFlow==="Yes"&&fWaterSession)parts.push(`Water flow session: ${fWaterSession}`);}
      if(fPumpsOff){const effectivePumps=fPumpsOff==="Yes"&&fPumpsOffConfirm==="No"?"No":fPumpsOff;parts.push(`Pumping machines & electrical devices off: ${effectivePumps}`);if(fPumpsOff==="Yes"&&fPumpsOffConfirm)parts.push(`Pumps off confirmed: ${fPumpsOffConfirm}`);}
      if(fEquipStored){const effectiveEquip=fEquipStored==="Yes"&&fEquipConfirm==="No"?"No":fEquipStored;parts.push(`Equipment properly stored: ${effectiveEquip}`);if(fEquipStored==="Yes"&&fEquipConfirm)parts.push(`Equipment storage confirmed: ${fEquipConfirm}`);}
      if(fNotes.trim())parts.push(`Additional notes: ${fNotes.trim()}`);
      content=parts.join(" | ")||content||"Daily report submitted.";
    }
    if(!content)return;
    if(editReport){
      onEdit({...editReport,title:fTitle.trim(),content,type:fType,author:fAuthor.trim()||"Admin"});
      setEditReport(null);
    } else {
      onAdd({id:uid(),title:fTitle.trim(),content,type:fType,author:fAuthor.trim()||"Admin",date:TODAY,status:"Open",tags:[],timestamp:new Date().toISOString()});
    }
    setFTitle("");setFType("Daily");setFContent("");setFFedFish("");setFFedFishConfirm("");setFFeedSession("");setFOutletLocked("");setFOutletConfirm("");setFWaterFlow("");setFWaterFlowConfirm("");setFWaterSession("");setFPumpsOff("");setFPumpsOffConfirm("");setFEquipStored("");setFEquipConfirm("");setFNotes("");setSubmitError("");setShowModal(false);
  };
  const TB="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors";
  const TA="bg-green-600 text-white"; const TI="bg-white border border-slate-200 text-slate-500 hover:text-green-600 hover:border-green-300";
  const dateLabel=(d:string)=>{const today=new Date(TODAY);const rd=new Date(d);if(isNaN(rd.getTime()))return d;const diff=Math.round((today.getTime()-rd.getTime())/(1000*60*60*24));if(diff===0)return"Today";if(diff===1)return"Yesterday";return rd.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});};
  const pagedReports=filtered.slice((reportPage-1)*PER_PAGE,reportPage*PER_PAGE);
  const grouped=pagedReports.reduce<{label:string;date:string;items:Report[]}[]>((acc,r)=>{const lbl=dateLabel(r.date);const ex=acc.find(g=>g.date===r.date);if(ex)ex.items.push(r);else acc.push({label:lbl,date:r.date,items:[r]});return acc;},[]).sort((a,b)=>b.date.localeCompare(a.date));
  const parseReportFields=(content:string)=>{
    const parts=content.split(" | ").filter(Boolean);
    return parts.map(p=>{const idx=p.indexOf(": ");return idx>-1?{label:p.slice(0,idx),value:p.slice(idx+2)}:{label:"",value:p};});
  };
  return(
    <div className="p-4 sm:p-6 space-y-5 max-w-[1300px]">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Reports</h1><p className="text-xs text-slate-400 mt-0.5">Farm operational reports and incident logs</p></div>
        <PBtn onClick={()=>setShowModal(true)} sm><Plus size={13}/> Submit Report</PBtn>
      </div>
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">{(["All","Daily","Weekly","Monthly"] as const).map(t=><button key={t} onClick={()=>setTypeFilter(t)} className={`${TB} ${typeFilter===t?TA:TI}`}>{t}</button>)}</div>
          <div className="w-px h-5 bg-slate-200"/>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Date:</span>
            <input type="date" value={dateSearch} onChange={e=>setDateSearch(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-300" style={{colorScheme:"light"}}/>
            {dateSearch&&<button onClick={()=>setDateSearch("")} className="text-xs text-green-600 underline">Clear</button>}
          </div>
        </div>
      </Card>
      {(()=>{
        const activeStaff=staff.filter(s=>s.status==="Active");
        if(activeStaff.length===0)return null;
        const targetDate=dateSearch||TODAY;
        const submittedAuthors=new Set(reports.filter(r=>r.type==="Daily"&&r.date===targetDate).map(r=>r.author));
        const pending=activeStaff.filter(s=>!submittedAuthors.has(s.name));
        const allSubmitted=pending.length===0;
        return(
          <div className={`rounded-xl border px-4 py-3 ${allSubmitted?"bg-green-50 border-green-200":"bg-orange-50 border-orange-200"}`}>
            {allSubmitted?(
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500 shrink-0"/>
                <p className="text-sm font-semibold text-green-700">All required reports have been submitted.</p>
              </div>
            ):(
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-orange-500 shrink-0"/>
                  <p className="text-sm font-semibold text-orange-800">Reports Pending — {pending.length} outstanding</p>
                </div>
                <p className="text-xs text-orange-700 mb-2">The following staff have not submitted {dateSearch?"a report for this date":"today's report"}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {pending.map(s=><span key={s.id} className="px-2.5 py-1 bg-orange-100 border border-orange-200 rounded-lg text-xs font-semibold text-orange-800">{s.name}</span>)}
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {filtered.length===0?(
        <Card className="p-12 text-center"><FileText size={36} className="text-slate-200 mx-auto mb-3"/><p className="text-slate-400 font-semibold text-sm">{reports.length===0?"No reports submitted yet":"No reports match filters"}</p></Card>
      ):(
        <><div className="space-y-6">{grouped.map(group=>(
          <div key={group.date}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{group.label}</p>
            <div className="space-y-3">{group.items.map(r=>(
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5"><FileText size={16} className="text-slate-400"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{r.title}</h3>
                      <Bdg label={r.type} color={r.type==="Daily"?"blue":r.type==="Weekly"?"teal":"amber"}/>
                    </div>
                    <p className="text-xs text-slate-400">By <span className="font-semibold text-slate-600">{r.author}</span> · {r.date}</p>
                  </div>
                  {isWithin6h(r)&&<button onClick={()=>openEditReport(r)} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors"><Pencil size={11}/> Edit</button>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                  {parseReportFields(r.content).filter(f=>!f.label.toLowerCase().includes("confirmed")).map((f,i)=>(
                    <div key={i} className="bg-slate-50 rounded-xl px-3 py-2.5">
                      {f.label&&<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{f.label}</p>}
                      <p className="text-xs font-semibold text-slate-800">{f.value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}</div>
          </div>
        ))}</div>
        <Pagination total={filtered.length} page={reportPage} perPage={PER_PAGE} onPage={setReportPage}/></>
      )}
      {showModal&&<Modal title={editReport?"Edit Report":"Submit Report"} onClose={()=>{setShowModal(false);setEditReport(null);}} wide>
        <F label="Report Type"><select className={SC} value={fType} onChange={e=>setFType(e.target.value as "Daily"|"Weekly"|"Monthly")}><option>Daily</option><option>Weekly</option><option>Monthly</option></select></F>
        <F label="Report Title"><input className={IC} placeholder="e.g. Morning inspection — Pond 2" value={fTitle} onChange={e=>setFTitle(e.target.value)}/></F>
        {fType==="Daily"?(
          <div className="space-y-4">
            {/* Feeding */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-slate-800">Were you the person who fed the fish today?</p>
              <div className="flex gap-2">{(["Yes","No"] as const).map(v=><button key={v} type="button" onClick={()=>{setFFedFish(v);if(v==="No")setFFeedSession("");}} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${fFedFish===v?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:border-green-400"}`}>{v}</button>)}</div>
              {fFedFish==="Yes"&&(<><p className="text-sm font-semibold text-slate-800 mt-2">Which feeding did you complete?</p><div className="flex gap-2">{(["Morning","Evening","Both"] as const).map(v=><button key={v} type="button" onClick={()=>setFFeedSession(v)} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${fFeedSession===v?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:border-green-400"}`}>{v}</button>)}</div></>)}
            </div>
            {/* Outlet */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-slate-800">Did you lock the outlets and inlets and properly check to confirm?</p>
              <div className="flex gap-2">{(["Yes","Not Me"] as const).map(v=><button key={v} type="button" onClick={()=>{setFOutletLocked(v);if(v==="Not Me")setFOutletConfirm("");}} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${fOutletLocked===v?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:border-green-400"}`}>{v}</button>)}</div>
              {fOutletLocked==="Yes"&&(<><p className="text-sm font-semibold text-slate-800 mt-2">Are you sure you locked all pond outlets and inlets?</p><div className="flex gap-2">{(["Yes","No"] as const).map(v=><button key={v} type="button" onClick={()=>setFOutletConfirm(v)} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${fOutletConfirm===v?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:border-green-400"}`}>{v}</button>)}</div></>)}
            </div>
            {/* Water Flow */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-slate-800">Did you flush the pond or carry out water flow-through today?</p>
              <div className="flex gap-2">{(["Yes","No"] as const).map(v=><button key={v} type="button" onClick={()=>{setFWaterFlow(v);if(v==="No")setFWaterSession("");}} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${fWaterFlow===v?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:border-green-400"}`}>{v}</button>)}</div>
              {fWaterFlow==="Yes"&&(<><p className="text-sm font-semibold text-slate-800 mt-2">When was it done?</p><div className="flex gap-2">{(["Morning","Evening","Both"] as const).map(v=><button key={v} type="button" onClick={()=>setFWaterSession(v)} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${fWaterSession===v?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:border-green-400"}`}>{v}</button>)}</div></>)}
            </div>
            {/* Pumps & Electrical */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-slate-800">Have you turned off all pumping machines and electrical devices properly?</p>
              <div className="flex gap-2">{(["Yes","No"] as const).map(v=><button key={v} type="button" onClick={()=>{setFPumpsOff(v);if(v==="No")setFPumpsOffConfirm("");}} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${fPumpsOff===v?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:border-green-400"}`}>{v}</button>)}</div>
              {fPumpsOff==="Yes"&&(<><p className="text-sm font-semibold text-slate-800 mt-2">Are you sure you personally turned off all pumping machines or assisted with this task?</p><div className="flex gap-2">{(["Yes","No"] as const).map(v=><button key={v} type="button" onClick={()=>setFPumpsOffConfirm(v)} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${fPumpsOffConfirm===v?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:border-green-400"}`}>{v}</button>)}</div><p className="text-xs text-slate-400 italic mt-1">Click &quot;Yes&quot; only if you personally carried out this task or assisted.</p></>)}
            </div>
            {/* Equipment Storage */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-slate-800">Are all equipment properly stored?</p>
              <div className="flex gap-2">{(["Yes","No"] as const).map(v=><button key={v} type="button" onClick={()=>{setFEquipStored(v);if(v==="No")setFEquipConfirm("");}} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${fEquipStored===v?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:border-green-400"}`}>{v}</button>)}</div>
              {fEquipStored==="Yes"&&(<><p className="text-sm font-semibold text-slate-800 mt-2">Are you sure?</p><div className="flex gap-2">{(["Yes","No"] as const).map(v=><button key={v} type="button" onClick={()=>setFEquipConfirm(v)} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${fEquipConfirm===v?"bg-green-600 text-white border-green-600":"bg-white text-slate-600 border-slate-200 hover:border-green-400"}`}>{v}</button>)}</div></>)}
            </div>
            <F label="Additional Notes (Optional)"><textarea className={`${IC} min-h-[80px] resize-y`} placeholder="Any other observations or actions taken…" value={fNotes} onChange={e=>setFNotes(e.target.value)}/></F>
          </div>
        ):(
          <F label="Content"><textarea className={`${IC} min-h-[120px] resize-y`} placeholder="Describe observations, issues or actions taken…" value={fContent} onChange={e=>setFContent(e.target.value)}/></F>
        )}
        <F label="Recorded By">
          {staff.filter(s=>s.status==="Active").length>0
            ?<select className={SC} value={fAuthor} onChange={e=>setFAuthor(e.target.value)}><option value="Admin">Admin</option>{staff.filter(s=>s.status==="Active").map(s=><option key={s.id} value={s.name}>{s.name} — {s.role}</option>)}</select>
            :<input className={IC} placeholder="Name of recorder" value={fAuthor} onChange={e=>setFAuthor(e.target.value)}/>
          }
        </F>
        {submitError&&<p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</p>}
        <div className="flex gap-2 pt-1"><PBtn onClick={handleSubmit}><CheckCircle size={14}/> {editReport?"Save Changes":"Submit"}</PBtn><button onClick={()=>{setShowModal(false);setEditReport(null);}} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}
    </div>
  );
}

/* ─── 7b. Notifications ─────────────────────────────────────── */
interface AppNotification { id:string; type:"feeding"|"bags"|"maxkg"|"reconciliation"|"report"|"transfer"|"invoice"; pondName?:string; fishStock?:string; size?:string; maxKg?:number; currentFeed?:number; time?:string; farmId:string; farmName:string; date:string; read:boolean; brand?:string; reconDate?:string; reconKey?:string; mismatchReason?:string; reconStatus?:string; reportId?:string; reportTitle?:string; reportAuthor?:string; reportStatus?:string; message?:string; }

function NotificationsPage({notifications,onMarkRead,onMarkAllRead,farms,activeFarmId,farmCount,onNotifNav}:{notifications:AppNotification[];onMarkRead:(id:string)=>void;onMarkAllRead:()=>void;farms:Farm[];activeFarmId:string;farmCount:number;onNotifNav?:(n:AppNotification)=>void;}){
  const unread=notifications.filter(n=>!n.read).length;
  const [nYear,setNYear]=useState("All");
  const [nMonth,setNMonth]=useState("All");
  const [nDay,setNDay]=useState("All");
  const [notifPage,setNotifPage]=useState(1);
  const allMonths=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const allYears=[...new Set(notifications.map(n=>n.date.slice(0,4)))].sort().reverse();
  const allDays=Array.from({length:31},(_,i)=>String(i+1).padStart(2,"0"));
  const filtered=notifications.filter(n=>{
    const ry=nYear==="All"||n.date.startsWith(nYear);
    const rm=nMonth==="All"||(()=>{const d=new Date(n.date);return!isNaN(d.getTime())&&allMonths[d.getMonth()]===nMonth;})();
    const rd=nDay==="All"||(()=>{const d=new Date(n.date);return!isNaN(d.getTime())&&String(d.getDate()).padStart(2,"0")===nDay;})();
    return ry&&rm&&rd;
  });
  const dateLabel=(d:string)=>{const today=new Date(TODAY);const nd=new Date(d);if(isNaN(nd.getTime()))return d;const diff=Math.round((today.getTime()-nd.getTime())/(1000*60*60*24));if(diff===0)return"Today";if(diff===1)return"Yesterday";return nd.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});};
  const pagedNotifs=filtered.slice((notifPage-1)*PER_PAGE,notifPage*PER_PAGE);
  const grouped=pagedNotifs.reduce<{label:string;date:string;items:AppNotification[]}[]>((acc,n)=>{const lbl=dateLabel(n.date);const ex=acc.find(g=>g.date===n.date);if(ex)ex.items.push(n);else acc.push({label:lbl,date:n.date,items:[n]});return acc;},[]).sort((a,b)=>b.date.localeCompare(a.date));
  return(
    <div className="p-4 sm:p-6 space-y-5 max-w-[760px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Notifications</h1>
          <p className="text-xs text-slate-400 mt-0.5">{unread>0?`${unread} unread notification${unread!==1?"s":""}`:""}</p>
        </div>
        {unread>0&&<button onClick={onMarkAllRead} className="text-xs font-semibold text-green-600 hover:text-green-800 transition-colors">Mark all as read</button>}
      </div>
      <DateFilter year={nYear} month={nMonth} day={nDay} onYear={v=>{setNYear(v);setNotifPage(1);}} onMonth={v=>{setNMonth(v);setNotifPage(1);}} onDay={v=>{setNDay(v);setNotifPage(1);}} onReset={()=>{setNYear("All");setNMonth("All");setNDay("All");setNotifPage(1);}} dates={notifications.map(n=>n.date)}/>
      {filtered.length===0?(
        <Card className="p-12 text-center">
          <Bell size={36} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-sm font-semibold text-slate-400 mb-1">No notifications</p>
          <p className="text-xs text-slate-300">{notifications.length===0?"All ponds are on track!":"No notifications match filters"}</p>
        </Card>
      ):(<>
        <div className="space-y-6">{grouped.map(group=>(
          <div key={group.date}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{group.label}</p>
            <Card>
              <div className="divide-y divide-slate-100">
                {group.items.map(n=>(
                  <div key={n.id} onClick={()=>{if(!n.read)onMarkRead(n.id);onNotifNav?.(n);}} className={`flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-slate-50 ${!n.read?"bg-green-50":""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.type==="feeding"?"bg-green-100":n.type==="maxkg"?"bg-red-100":n.type==="reconciliation"?n.reconStatus==="matched"?"bg-green-100":n.reconStatus==="remaining_mismatch"?"bg-amber-100":n.reconStatus==="bag_mismatch"?"bg-orange-100":"bg-red-100":n.type==="report"?"bg-blue-100":n.type==="transfer"?"bg-teal-100":n.type==="invoice"?"bg-purple-100":"bg-amber-100"}`}>
                      {n.type==="feeding"?<Fish size={14} className="text-green-600"/>:n.type==="maxkg"?<Layers size={14} className="text-red-600"/>:n.type==="reconciliation"?<AlertCircle size={14} className={n.reconStatus==="remaining_mismatch"?"text-amber-600":n.reconStatus==="bag_mismatch"?"text-orange-600":"text-red-600"}/>:n.type==="report"?<FileText size={14} className="text-blue-600"/>:n.type==="transfer"?<ArrowRightLeft size={14} className="text-teal-600"/>:n.type==="invoice"?<Receipt size={14} className="text-purple-600"/>:<Package size={14} className="text-amber-600"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 leading-snug">
                        {n.type==="feeding"?`Pond ${n.pondName} has not been fed today.`:n.type==="maxkg"?(()=>`Max KG Reached — Pond: ${n.pondName} | Fish Stock: ${n.fishStock} | Pellet: ${n.size} | Max: ${n.maxKg} kg | Current: ${n.currentFeed??n.maxKg} kg${n.time?` | ${n.date} ${n.time}`:""}`)():n.type==="reconciliation"?(()=>{const statusLabel={matched:"Matched",remaining_mismatch:"Remaining Mismatch",bag_mismatch:"Bag Count Mismatch",feed_qty_mismatch:"Feed Qty Mismatch",multiple_mismatches:"Multiple Mismatches"}[n.reconStatus||""]||"Issue";return`Reconciliation ${statusLabel}: ${n.brand} ${n.size} on ${n.reconDate}.${n.mismatchReason?" "+n.mismatchReason:""}`;})():n.type==="report"?`Report submitted: "${n.reportTitle}" by ${n.reportAuthor}.`:n.type==="transfer"||n.type==="invoice"?n.message||"":(n.message||"Bags Opened has not been logged today.")}
                      </p>
                      {n.type==="reconciliation"&&<p className="text-[11px] text-blue-500 mt-0.5 font-medium">Tap to view reconciliation →</p>}
                      {farmCount>1&&<p className="text-[11px] text-slate-400 mt-0.5">{n.farmName}</p>}
                    </div>
                    {!n.read&&<span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-2"/>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ))}</div>
        <Pagination total={filtered.length} page={notifPage} perPage={PER_PAGE} onPage={setNotifPage}/>
      </>)}
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("AppErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto text-center my-12 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 font-['Barlow_Condensed',sans-serif]">
              {this.props.fallbackTitle || "Unable to display this view"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              A temporary issue occurred while loading this section.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="px-4 py-2 text-xs font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── 8. Subscription (replaces Pricing) ────────────────────── */
function SubscriptionPage({
  farmCount = 1,
  activePlan,
  setActivePlan,
  trialStartDate,
  setTrialStartDate,
  currency = "₦",
  convertPrice = (n: number) => n,
  userProfile,
  activeFarmName,
}: {
  farmCount?: number;
  activePlan: string | null;
  setActivePlan: (p: string | null) => void;
  trialStartDate: string | null;
  setTrialStartDate: (d: string | null) => void;
  currency?: string;
  convertPrice?: (n: number) => number;
  userProfile?: UserProfile | null;
  activeFarmName?: string;
}) {
  const cs = currency || "₦";
  const cvt = typeof convertPrice === "function" ? convertPrice : ((n: number) => n);
  const dynamicPlansResult = useDynamicPlans() || {};
  const singlePlans = Array.isArray(dynamicPlansResult.singleFarmPlans) ? dynamicPlansResult.singleFarmPlans : [];
  const multiPlans = Array.isArray(dynamicPlansResult.multiFarmPlans) ? dynamicPlansResult.multiFarmPlans : [];
  
  const [subTab, setSubTab] = useState<"single" | "multi">("single");
  const [yearlyS, setYearlyS] = useState(false); /* single farm billing toggle */
  const [yearlyM, setYearlyM] = useState(false); /* multi farm billing toggle */
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const adminOverride = useMemo(() => {
    try {
      return getUserAdminOverride(userProfile?.email);
    } catch {
      return { isSuspended: false, hasFreeAccess: false, customAmount: null, activePlan: null };
    }
  }, [userProfile?.email]);

  const adminUsers = useMemo(() => {
    try {
      return loadAllAdminUsers() || [];
    } catch {
      return [];
    }
  }, []);

  const currentAdminUser = useMemo(() => {
    if (!userProfile?.email) return null;
    const em = (userProfile.email || "").trim().toLowerCase();
    return (adminUsers || []).find(u => (u?.email || "").trim().toLowerCase() === em) || null;
  }, [adminUsers, userProfile?.email]);

  const isPaidActive = Boolean(currentAdminUser?.subscriptionStatus === "Active" && currentAdminUser?.subscriptionExpiry);
  
  const formattedExpiryDate = useMemo(() => {
    if (!currentAdminUser?.subscriptionExpiry) return null;
    try {
      const d = new Date(currentAdminUser.subscriptionExpiry);
      if (isNaN(d.getTime())) return String(currentAdminUser.subscriptionExpiry);
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return String(currentAdminUser.subscriptionExpiry);
    }
  }, [currentAdminUser?.subscriptionExpiry]);

  const trialExpiryDate = useMemo(() => {
    if (!trialStartDate) return null;
    try {
      const d = new Date(trialStartDate);
      if (isNaN(d.getTime())) return null;
      d.setDate(d.getDate() + 30);
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return null;
    }
  }, [trialStartDate]);

  const EVERY_PLAN_INCLUDES = [
    "Financial Dashboard",
    "Pond Management",
    "Feed Stock",
    "Feeding Records",
    "Fish Stock History",
    "Sales Invoicing",
    "Staff Management",
    "Reports & Analytics",
    "CSV Export",
    "PDF Export",
  ];

  const BillingToggle = ({ yearly, setYearly }: { yearly: boolean; setYearly: (v: boolean) => void }) => (
    <div className="inline-flex items-center gap-3 bg-slate-100 rounded-full p-1">
      <button
        onClick={() => setYearly(false)}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
          !yearly ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => setYearly(true)}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
          yearly ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
        }`}
      >
        Yearly <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">Save 20%</span>
      </button>
    </div>
  );

  const dp = (mp: number, yr: boolean) => {
    const price = typeof mp === "number" && !isNaN(mp) ? mp : 0;
    return yr ? Math.round(price * 12 * 0.8) : price;
  };
  const sv = (mp: number) => {
    const price = typeof mp === "number" && !isNaN(mp) ? mp : 0;
    return Math.round(price * 12 * 0.2);
  };

  const handlePaystackPayment = async (plan: any, isYearly: boolean) => {
    if (!plan) return;
    if (adminOverride.hasFreeAccess) {
      toast.info("Your farm account has Complimentary Lifetime VIP Access.");
      return;
    }

    const baseMonthly = typeof plan.monthlyPrice === "number" && !isNaN(plan.monthlyPrice) ? plan.monthlyPrice : 0;
    const calculatedPrice = adminOverride.customAmount !== null
      ? adminOverride.customAmount
      : (isYearly ? Math.round(baseMonthly * 12 * 0.8) : baseMonthly);

    setCheckoutLoading(plan.name || "plan");

    try {
      const success = await initializePaystackCheckout({
        email: userProfile?.email || "customer@pondtora.com",
        amount: calculatedPrice,
        planName: plan.name || "Subscription",
        billingCycle: isYearly ? "yearly" : "monthly",
        userName: userProfile?.name || "",
        phone: userProfile?.phone || "",
        farmName: activeFarmName || userProfile?.farmName || "Primary Farm",
        onSuccess: res => {
          recordSuccessfulPayment({
            email: userProfile?.email || "",
            planName: plan.name,
            billingFrequency: isYearly ? "yearly" : "monthly",
            amount: calculatedPrice,
            reference: res.reference,
          });
          setActivePlan(plan.name);
          setTrialStartDate(null);
          api.profile.updatePlan(plan.name, TODAY).catch(console.warn);
          try {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          } catch {}
          toast.success(`🎉 Payment Successful! You are now subscribed to ${plan.name}. Ref: ${res.reference}`);
          setCheckoutLoading(null);
        },
        onClose: () => {
          setCheckoutLoading(null);
          toast.info("Paystack checkout window closed.");
        },
      });

      if (!success) {
        setCheckoutLoading(null);
      }
    } catch (err: any) {
      setCheckoutLoading(null);
      console.error("Paystack Checkout Error:", err);
      toast.error("Unable to initiate Paystack payment. Please try again.");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      <div className="text-center pt-4 pb-2">
        {adminOverride.hasFreeAccess ? (
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-1.5 text-purple-800 text-xs font-semibold mb-4">
            <Crown size={14} className="text-purple-600" /> <strong>Complimentary Lifetime Access:</strong> Your farm account has full VIP access with zero billing required.
          </div>
        ) : isPaidActive && formattedExpiryDate ? (
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-emerald-800 text-xs font-semibold mb-4">
            <CheckCircle size={14} className="text-emerald-600" /> <strong>Active Paid Subscription:</strong> {activePlan} ({currentAdminUser?.billingFrequency || "monthly"}) — Expires on <strong>{formattedExpiryDate}</strong> {currentAdminUser?.paystackReference ? `· Ref: ${currentAdminUser.paystackReference}` : ""}
          </div>
        ) : trialExpiryDate ? (
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 text-green-700 text-xs font-semibold mb-4">
            <Crown size={13} /> Your free trial expires on <strong>{trialExpiryDate}</strong>
          </div>
        ) : null}

        {adminOverride.customAmount !== null && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3 max-w-md mx-auto mb-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-600 shrink-0" />
              <div className="text-left">
                <p className="font-bold">Special Negotiated Discount Applied</p>
                <p className="text-amber-700 text-[11px]">Your custom rate: <strong>₦{(adminOverride.customAmount || 0).toLocaleString()}</strong></p>
              </div>
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
          Simple, Transparent Subscriptions
        </h1>
        <p className="text-slate-400 text-sm mt-2 mb-5">Pay securely with Paystack. Instant activation. Cancel anytime.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mx-auto">
        <button
          onClick={() => setSubTab("single")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            subTab === "single" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Single Farm
        </button>
        <button
          onClick={() => setSubTab("multi")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            subTab === "multi" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Multiple Farms {(farmCount || 1) > 1 && <span className="ml-1 text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">{farmCount}</span>}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-1 mb-3 text-center">
        {subTab === "single" ? "Manage one farm with plans based on the number of ponds." : "Manage multiple farms under a single account."}
      </p>

      {/* Single Farm Tab */}
      {subTab === "single" && (
        <div className="space-y-5">
          <div className="flex justify-center"><BillingToggle yearly={yearlyS} setYearly={setYearlyS} /></div>
          {yearlyS && <p className="text-xs text-green-600 font-semibold text-center">Billed annually — save 20% on your subscription.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {singlePlans.map(plan => {
              const isCurrent = activePlan === plan.name;
              const isCheckingThis = checkoutLoading === plan.name;
              const planPrice = adminOverride.customAmount !== null
                ? adminOverride.customAmount
                : dp(plan.monthlyPrice || 0, yearlyS);

              return (
                <div key={plan.name} className={`rounded-2xl border-2 ${plan.color || "border-slate-200"} bg-white p-6 flex flex-col relative shadow-sm hover:shadow-md transition-shadow`}>
                  {plan.badge && (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold ${plan.badge === "Popular" ? "bg-green-600 text-white" : "bg-[#F97316] text-white"}`}>
                      {plan.badge}
                    </span>
                  )}
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">{plan.name}</p>
                    <p className={`text-sm font-semibold mb-3 ${plan.limit === "Unlimited active ponds" ? "text-slate-700" : "text-green-600"}`}>
                      {plan.limit || "Unlimited active ponds"}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                        {cs}{cvt(planPrice).toLocaleString()}
                      </span>
                      <span className="text-slate-400 text-sm">{yearlyS ? "/year" : "/month"}</span>
                    </div>
                    {yearlyS && adminOverride.customAmount === null && (
                      <p className="text-[11px] text-green-600 mt-1">Save {cs}{cvt(sv(plan.monthlyPrice || 0)).toLocaleString()} per year</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{plan.desc || ""}</p>
                  </div>
                  <div className="mb-4 space-y-1.5 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Includes:</p>
                    {plan.name === "Starter" ? (
                      EVERY_PLAN_INCLUDES.map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-slate-600">
                          <CheckCircle size={12} className="text-green-500 shrink-0" />{f}
                        </div>
                      ))
                    ) : plan.name === "Growth" ? (
                      <>
                        <div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Everything in Starter</div>
                        <div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Up to 15 active ponds</div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Everything in Growth</div>
                        <div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Unlimited active ponds</div>
                      </>
                    )}
                  </div>

                  {isPaidActive && isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 mt-3 text-center flex items-center justify-center gap-1.5 border border-emerald-200">
                      <CheckCircle size={14} className="text-emerald-600" /> Current Active Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePaystackPayment(plan, yearlyS)}
                      disabled={isCheckingThis}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all mt-3 flex items-center justify-center gap-2 shadow-sm ${
                        plan.badge === "Popular"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : plan.badge === "Best Value"
                          ? "bg-[#F97316] hover:bg-[#ea6c0a] text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {isCheckingThis ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Processing…
                        </>
                      ) : (
                        <>
                          <CreditCard size={14} /> Pay with Paystack
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Multiple Farms Tab */}
      {subTab === "multi" && (
        <div className="space-y-5">
          <div className="flex justify-center"><BillingToggle yearly={yearlyM} setYearly={setYearlyM} /></div>
          {yearlyM && <p className="text-xs text-green-600 font-semibold text-center">Billed annually — save 20% on your subscription.</p>}
          {(farmCount || 1) > 1 && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <Fish size={16} className="text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700">You currently have <strong>{farmCount} farms</strong>. Choose a plan that supports your number of farms.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {multiPlans.map(plan => {
              const isCurrent = activePlan === plan.name;
              const isCheckingThis = checkoutLoading === plan.name;
              const planPrice = adminOverride.customAmount !== null
                ? adminOverride.customAmount
                : dp(plan.monthlyPrice || 0, yearlyM);

              return (
                <div key={plan.name} className={`rounded-2xl border-2 ${plan.color || "border-slate-200"} bg-white p-6 flex flex-col relative shadow-sm hover:shadow-md transition-shadow`}>
                  {plan.badge && (
                    <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold ${plan.badge === "Popular" ? "bg-green-600 text-white" : "bg-[#F97316] text-white"}`}>
                      {plan.badge}
                    </span>
                  )}
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">{plan.name}</p>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Fish size={11} className="text-green-500" />
                      <p className={`text-sm font-semibold ${plan.farmLimit === Infinity ? "text-slate-900" : "text-green-600"}`}>{plan.farms || "Multiple farms"}</p>
                    </div>
                    <p className="text-[11px] text-teal-600 font-medium mb-2">Unlimited active ponds per farm</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                        {cs}{cvt(planPrice).toLocaleString()}
                      </span>
                      <span className="text-slate-400 text-sm">{yearlyM ? "/year" : "/month"}</span>
                    </div>
                    {yearlyM && adminOverride.customAmount === null && (
                      <p className="text-[10px] text-green-600 mt-0.5">Save {cs}{cvt(sv(plan.monthlyPrice || 0)).toLocaleString()} per year</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{plan.desc || ""}</p>
                  </div>
                  <div className="mb-4 space-y-1.5 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Includes:</p>
                    {plan.farmLimit === 3 ? (
                      <>{[...EVERY_PLAN_INCLUDES, "Unlimited active ponds per farm"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />{f}</div>
                      ))}</>
                    ) : plan.farmLimit === 5 ? (
                      <>
                        <div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Everything in the 3-Farm Plan</div>
                        <div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Up to 5 farms</div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Everything in the 5-Farm Plan</div>
                        <div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Unlimited farms</div>
                      </>
                    )}
                  </div>

                  {isPaidActive && isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 mt-auto text-center flex items-center justify-center gap-1.5 border border-emerald-200">
                      <CheckCircle size={14} className="text-emerald-600" /> Current Active Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePaystackPayment(plan, yearlyM)}
                      disabled={isCheckingThis}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all mt-auto flex items-center justify-center gap-2 shadow-sm ${
                        plan.badge === "Popular"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : plan.badge === "Best Value"
                          ? "bg-[#F97316] hover:bg-[#ea6c0a] text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {isCheckingThis ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Processing…
                        </>
                      ) : (
                        <>
                          <CreditCard size={14} /> Pay with Paystack
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paystack Security & Supported Payment Options */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-semibold">
          <Lock size={13} className="text-green-600" /> 256-bit SSL Secure Checkout powered by <strong>Paystack</strong>
        </div>
        <p className="text-[11px] text-slate-400">
          Supports Nigerian Debit & Credit Cards (Mastercard, Visa, Verve), Direct Bank Transfers, USSD, and Apple Pay.
        </p>
      </div>
    </div>
  );
}

/* ─── 9. Settings Page ───────────────────────────────────────── */
function SettingsPage({farms,onAddFarm,onEditFarm,onDeleteFarm,userProfile,onUpdateProfile,isOwner,ponds,activePlan}:{
  farms:Farm[];onAddFarm:(d:{name:string;city:string;state:string;country:string})=>void;onEditFarm:(f:Farm)=>void;onDeleteFarm:(id:string)=>void;
  userProfile:UserProfile|null;onUpdateProfile:(u:{name:string;phone:string})=>Promise<void>;isOwner:boolean;ponds:Pond[];activePlan:string|null;
}){
  const [tab,setTab]=useState<"profile"|"farms">("profile");
  /* ── Profile ── */
  const [profF,setProfF]=useState({name:userProfile?.name||"",phone:userProfile?.phone||""});
  useEffect(()=>{setProfF({name:userProfile?.name||"",phone:userProfile?.phone||""});},[userProfile]);
  const [profSaving,setProfSaving]=useState(false);
  const [profMsg,setProfMsg]=useState<{type:"success"|"error";text:string}|null>(null);
  const saveProfile=async()=>{
    if(!profF.name.trim()){setProfMsg({type:"error",text:"Name is required"});return;}
    setProfSaving(true);setProfMsg(null);
    try{await onUpdateProfile(profF);setProfMsg({type:"success",text:"Profile updated successfully"});}
    catch(e:any){setProfMsg({type:"error",text:e.message||"Failed to save"});}
    finally{setProfSaving(false);}
  };
  /* ── Change password ── */
  const [passF,setPassF]=useState({cur:"",np:"",cp:""});
  const [showCurP,setShowCurP]=useState(false);
  const [showNp,setShowNp]=useState(false);
  const [showCp,setShowCp]=useState(false);
  const [passLoading,setPassLoading]=useState(false);
  const [passMsg,setPassMsg]=useState<{type:"success"|"error";text:string}|null>(null);
  const changePassword=async()=>{
    if(!passF.cur){setPassMsg({type:"error",text:"Current password is required"});return;}
    if(!passF.np||passF.np.length<6){setPassMsg({type:"error",text:"New password must be at least 6 characters"});return;}
    if(passF.np!==passF.cp){setPassMsg({type:"error",text:"Passwords do not match"});return;}
    setPassLoading(true);setPassMsg(null);
    try{
      // Verify current password by re-authenticating
      const email=userProfile?.email||"";
      const {error:signInErr}=await supabase.auth.signInWithPassword({email,password:passF.cur});
      if(signInErr)throw new Error("Current password is incorrect");
      const {error:updateErr}=await supabase.auth.updateUser({password:passF.np});
      if(updateErr)throw updateErr;
      setPassMsg({type:"success",text:"Password changed successfully"});
      setPassF({cur:"",np:"",cp:""});
    }catch(e:any){setPassMsg({type:"error",text:e.message||"Failed to change password"});}
    finally{setPassLoading(false);}
  };
  const handleForgotPassword=async()=>{
    const email=userProfile?.email;
    if(!email)return;
    await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}?type=recovery`});
    toast.success("Password reset link sent to your email.");
  };
  /* ── Farm section ── */
  const [viewFarm,setViewFarm]=useState<Farm|null>(null);
  const [editFarm,setEditFarm]=useState<Farm|null>(null);
  const [editF,setEditF]=useState({name:"",city:"",state:"",country:"Nigeria"});
  const openEdit=(f:Farm)=>{setEditFarm(f);setEditF({name:f.name,city:f.city||"",state:f.state||"",country:f.country||"Nigeria"});};
  const handleSaveEdit=()=>{if(!editFarm||!editF.name.trim())return;onEditFarm({...editFarm,...editF});setEditFarm(null);toast.success("Farm updated");};
  const [deleteId,setDeleteId]=useState<string|null>(null);
  const deleteFarmObj=farms.find(f=>f.id===deleteId);
  const [showAdd,setShowAdd]=useState(false);
  const [addF,setAddF]=useState({name:"",city:"",state:"",country:"Nigeria"});
  const handleAdd=()=>{if(!addF.name.trim())return;onAddFarm(addF);setAddF({name:"",city:"",state:"",country:"Nigeria"});setShowAdd(false);};
  const S2="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-300 transition";
  const L2="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1";
  const initials=(userProfile?.name||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return(
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your profile and farm details.</p>
      </div>
      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={()=>setTab("profile")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab==="profile"?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-800"}`}>Profile Settings</button>
        <button onClick={()=>setTab("farms")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab==="farms"?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-800"}`}>Farm Settings</button>
      </div>

      {/* ── Profile Settings ── */}
      {tab==="profile"&&(
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-700 mb-5">Profile Information</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xl font-bold shrink-0 ring-2 ring-green-200">{initials}</div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{userProfile?.name||"—"}</p>
                <p className="text-xs text-slate-400">{userProfile?.email||"—"}</p>
                <p className="text-[11px] text-slate-300 mt-0.5">Avatar is generated from your initials</p>
              </div>
            </div>
            <div className="space-y-4">
              <div><label className={L2}>Full Name</label><input value={profF.name} onChange={e=>setProfF(p=>({...p,name:e.target.value}))} className={S2} placeholder="Your full name"/></div>
              <div>
                <label className={L2}>Email Address</label>
                <input value={userProfile?.email||""} disabled className={S2+" opacity-50 cursor-not-allowed"}/>
                <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed here. Contact support to update.</p>
              </div>
              <div><label className={L2}>Phone Number</label><input value={profF.phone} onChange={e=>setProfF(p=>({...p,phone:e.target.value}))} className={S2} placeholder="+234 800 000 0000"/></div>
            </div>
            {profMsg&&(
              <div className={`flex items-center gap-2 text-xs mt-4 px-3 py-2.5 rounded-lg border ${profMsg.type==="success"?"text-green-700 bg-green-50 border-green-200":"text-red-600 bg-red-50 border-red-200"}`}>
                {profMsg.type==="success"?<CheckCircle size={13}/>:<AlertCircle size={13}/>}{profMsg.text}
              </div>
            )}
            <div className="flex justify-end mt-5">
              <button onClick={saveProfile} disabled={profSaving} className="flex items-center gap-1.5 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
                {profSaving?<><Loader2 size={14} className="animate-spin"/>Saving…</>:<><CheckCircle size={14}/>Save Profile</>}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-700 mb-5">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className={L2}>Current Password</label>
                <div className="relative">
                  <input type={showCurP?"text":"password"} value={passF.cur} onChange={e=>setPassF(p=>({...p,cur:e.target.value}))} className={S2} placeholder="Enter current password"/>
                  <button type="button" tabIndex={-1} onClick={()=>setShowCurP(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showCurP?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className={L2}>New Password</label>
                <div className="relative">
                  <input type={showNp?"text":"password"} value={passF.np} onChange={e=>setPassF(p=>({...p,np:e.target.value}))} className={S2} placeholder="Min. 6 characters"/>
                  <button type="button" tabIndex={-1} onClick={()=>setShowNp(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showNp?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className={L2}>Confirm New Password</label>
                <div className="relative">
                  <input type={showCp?"text":"password"} value={passF.cp} onChange={e=>setPassF(p=>({...p,cp:e.target.value}))} className={S2} placeholder="Re-enter new password"/>
                  <button type="button" tabIndex={-1} onClick={()=>setShowCp(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showCp?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
            </div>
            {passMsg&&(
              <div className={`flex items-center gap-2 text-xs mt-4 px-3 py-2.5 rounded-lg border ${passMsg.type==="success"?"text-green-700 bg-green-50 border-green-200":"text-red-600 bg-red-50 border-red-200"}`}>
                {passMsg.type==="success"?<CheckCircle size={13}/>:<AlertCircle size={13}/>}{passMsg.text}
              </div>
            )}
            <div className="flex items-center justify-between mt-5">
              <button type="button" onClick={handleForgotPassword} className="text-xs text-green-600 hover:text-green-800 font-semibold underline-offset-2 hover:underline transition-colors">
                Forgot Password?
              </button>
              <button onClick={changePassword} disabled={passLoading} className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
                {passLoading?<><Loader2 size={14} className="animate-spin"/>Changing…</>:<><Lock size={14}/>Change Password</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Farm Settings ── */}
      {tab==="farms"&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">{farms.length} farm{farms.length!==1?"s":""} on your account</p>
            {isOwner&&<button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors"><Plus size={13}/> Add Farm</button>}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {farms.length===0?(
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-slate-400 mb-3">No farms yet.</p>
                {isOwner&&<button onClick={()=>setShowAdd(true)} className="text-sm text-green-600 font-semibold hover:text-green-800">Create your first farm →</button>}
              </div>
            ):(
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Farm Name</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Location</th>
                      <th className="px-5 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Ponds</th>
                      <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {farms.map(f=>{
                      const cnt=ponds.filter(p=>p.farmId===f.id).length;
                      return(
                        <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-semibold text-slate-800">{f.name}</p>
                            <p className="text-xs text-slate-400 sm:hidden">{[f.city,f.state,f.country].filter(Boolean).join(", ")||"—"}</p>
                          </td>
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            <p className="text-sm text-slate-600">{[f.city,f.state,f.country].filter(Boolean).join(", ")||"—"}</p>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{cnt}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={()=>setViewFarm(f)} title="View" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye size={14}/></button>
                              {isOwner&&<button onClick={()=>openEdit(f)} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"><Pencil size={14}/></button>}
                              {isOwner&&farms.length>1&&<button onClick={()=>setDeleteId(f.id)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!isOwner&&(
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              <Lock size={13} className="shrink-0"/><span>You have view-only access to farm details. Contact your administrator to make changes.</span>
            </div>
          )}
        </div>
      )}

      {/* View Farm Modal */}
      {viewFarm&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&setViewFarm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div><h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Farm Details</h2><p className="text-xs text-slate-400 mt-0.5">Read-only view</p></div>
              <button onClick={()=>setViewFarm(null)} className="text-slate-400 hover:text-slate-700 p-1"><X size={18}/></button>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {[
                  ["Farm Name",viewFarm.name],
                  ["Country",viewFarm.country||"—"],
                  ["City",viewFarm.city||"—"],
                  ["State / Region",viewFarm.state||"—"],
                  ["Total Ponds",String(ponds.filter(p=>p.farmId===viewFarm.id).length)],
                  ["Active Ponds",String(ponds.filter(p=>p.farmId===viewFarm.id&&p.status==="Active").length)],
                  ["Fish Stocks",String(ponds.filter(p=>p.farmId===viewFarm.id&&p.species!=="—"&&p.status==="Active").length)],
                  ["Subscription Plan",activePlan||"Free Trial"],
                ].map(([label,val])=>(
                  <div key={label}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{val}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 pb-5 pt-2 border-t border-slate-100">
              <button onClick={()=>setViewFarm(null)} className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Farm Modal */}
      {editFarm&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&setEditFarm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div><h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Edit Farm</h2><p className="text-xs text-slate-400 mt-0.5">Update farm details</p></div>
              <button onClick={()=>setEditFarm(null)} className="text-slate-400 hover:text-slate-700 p-1"><X size={18}/></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div><label className={L2}>Farm Name *</label><input value={editF.name} onChange={e=>setEditF(p=>({...p,name:e.target.value}))} className={S2} placeholder="e.g. Green Valley Fish Farm"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={L2}>City</label><input value={editF.city} onChange={e=>setEditF(p=>({...p,city:e.target.value}))} className={S2} placeholder="Lagos"/></div>
                <div><label className={L2}>State / Region</label><input value={editF.state} onChange={e=>setEditF(p=>({...p,state:e.target.value}))} className={S2} placeholder="Lagos State"/></div>
              </div>
              <div><label className={L2}>Country</label><input value={editF.country} onChange={e=>setEditF(p=>({...p,country:e.target.value}))} className={S2} placeholder="Nigeria"/></div>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={handleSaveEdit} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"><CheckCircle size={14}/> Save Changes</button>
              <button onClick={()=>setEditFarm(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Farm Modal */}
      {showAdd&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div><h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Add New Farm</h2><p className="text-xs text-slate-400 mt-0.5">Uses your existing account credentials</p></div>
              <button onClick={()=>setShowAdd(false)} className="text-slate-400 hover:text-slate-700 p-1"><X size={18}/></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div><label className={L2}>Farm Name *</label><input value={addF.name} onChange={e=>setAddF(p=>({...p,name:e.target.value}))} className={S2} placeholder="e.g. Green Valley Fish Farm"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={L2}>City</label><input value={addF.city} onChange={e=>setAddF(p=>({...p,city:e.target.value}))} className={S2} placeholder="Lagos"/></div>
                <div><label className={L2}>State / Region</label><input value={addF.state} onChange={e=>setAddF(p=>({...p,state:e.target.value}))} className={S2} placeholder="Lagos State"/></div>
              </div>
              <div><label className={L2}>Country</label><input value={addF.country} onChange={e=>setAddF(p=>({...p,country:e.target.value}))} className={S2} placeholder="Nigeria"/></div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
                <p className="font-semibold mb-0.5">Same account credentials</p>
                <p>This farm will be linked to your existing login and email address.</p>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={handleAdd} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"><Plus size={14}/> Create Farm</button>
              <button onClick={()=>setShowAdd(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Delete Farm?</h2>
              <button onClick={()=>setDeleteId(null)} className="text-slate-400 hover:text-slate-700 p-1"><X size={18}/></button>
            </div>
            <div className="px-6 py-4 space-y-1">
              <p className="text-sm text-slate-600">Are you sure you want to permanently delete <strong className="text-slate-800">{deleteFarmObj?.name}</strong>?</p>
              <p className="text-xs text-red-500">This action cannot be undone. All farm data will be removed.</p>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={()=>{onDeleteFarm(deleteId!);setDeleteId(null);}} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors">Delete Farm</button>
              <button onClick={()=>setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Auth ───────────────────────────────────────────────────── */
const AIC="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-300 transition";

/* ─── Verify Email Screen ────────────────────────────────────── */
function VerifyEmailScreen({email,onVerified,onChangeEmail}:{email:string;onVerified:()=>void;onChangeEmail:()=>void;}){
  const [otp,setOtp]=useState(["","","","","",""]);
  const [status,setStatus]=useState<"idle"|"loading"|"success"|"error">("idle");
  const [errMsg,setErrMsg]=useState("");
  const [countdown,setCountdown]=useState(0);
  const inputRefs=useRef<(HTMLInputElement|null)[]>([]);
  useEffect(()=>{if(countdown>0){const t=setTimeout(()=>setCountdown(c=>c-1),1000);return ()=>clearTimeout(t);};},[countdown]);
  const handleOtpChange=(idx:number,val:string)=>{
    if(!/^\d?$/.test(val))return;
    const next=[...otp];next[idx]=val;setOtp(next);
    if(val&&idx<5)inputRefs.current[idx+1]?.focus();
  };
  const handleOtpKey=(idx:number,e:React.KeyboardEvent<HTMLInputElement>)=>{
    if(e.key==="Backspace"&&!otp[idx]&&idx>0){inputRefs.current[idx-1]?.focus();}
  };
  const handleOtpPaste=(e:React.ClipboardEvent)=>{
    const paste=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if(paste.length){const next=paste.split("").concat(Array(6).fill("")).slice(0,6);setOtp(next);inputRefs.current[Math.min(paste.length,5)]?.focus();}
    e.preventDefault();
  };
  const handleVerify=(e:React.FormEvent)=>{
    e.preventDefault();
    const code=otp.join("");
    if(code.length<6){setErrMsg("Please enter the complete 6-digit code.");setStatus("error");return;}
    setStatus("loading");setErrMsg("");
    setTimeout(()=>{
      if(code==="000000"){setErrMsg("Invalid or expired code. Please try again.");setStatus("error");}
      else{setStatus("success");setTimeout(()=>onVerified(),1200);}
    },1200);
  };
  const handleResend=()=>{if(countdown>0)return;setOtp(["","","","","",""]);setStatus("idle");setErrMsg("");setCountdown(60);inputRefs.current[0]?.focus();};
  return(
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src={pondtoraLogo} alt="Pondtora" className="h-10 w-auto object-contain"/>
          <span className="text-lg font-extrabold font-['Barlow_Condensed',sans-serif] text-slate-900">Pondtora</span>
        </div>
        {status==="success"?(
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto"><CheckCircle size={30} className="text-green-500"/></div>
            <div><p className="font-bold text-slate-800 text-base">Email Verified!</p><p className="text-xs text-slate-400 mt-1">Taking you to subscription setup…</p></div>
          </div>
        ):(
          <>
            <div className="mb-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-4">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif] mb-2">Verify Your Email</h1>
              <p className="text-sm text-slate-500 leading-relaxed">We sent a 6-digit verification code to<br/><span className="font-semibold text-slate-700">{email}</span></p>
            </div>
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((d,i)=>(
                  <input key={i} ref={el=>{inputRefs.current[i]=el;}} type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e=>handleOtpChange(i,e.target.value)}
                    onKeyDown={e=>handleOtpKey(i,e)}
                    className={`w-11 h-12 text-center text-lg font-bold border-2 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-300 transition-colors ${status==="error"?"border-red-300 bg-red-50":"border-slate-200 focus:border-green-400"}`}
                  />
                ))}
              </div>
              {status==="error"&&errMsg&&<p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{errMsg}</p>}
              <button type="submit" disabled={status==="loading"} className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors">
                {status==="loading"?"Verifying…":"Verify Email"}
              </button>
            </form>
            <div className="mt-4 space-y-3 text-center">
              <button onClick={handleResend} disabled={countdown>0} className={`text-sm font-semibold transition-colors ${countdown>0?"text-slate-300 cursor-not-allowed":"text-green-600 hover:text-green-800"}`}>
                {countdown>0?`Resend code in ${countdown}s`:"Resend Code"}
              </button>
              <div><button onClick={onChangeEmail} className="text-xs text-slate-400 hover:text-slate-600 underline">Change email address</button></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Choose Plan Screen (post-signup) ──────────────────────── */
function ChoosePlanScreen({onSelectPlan}:{onSelectPlan:(plan:string)=>void;}){
  const cs = "₦";
  const cvt = (n: number) => n;
  const { singleFarmPlans: singlePlans = [], multiFarmPlans: multiPlans = [] } = useDynamicPlans() || {};
  const [planTab,setPlanTab]=useState<"single"|"multi">("single");
  const [yearlyS,setYearlyS]=useState(false);
  const [yearlyM,setYearlyM]=useState(false);
  const EVERY_PLAN_INCLUDES=["Financial Dashboard","Pond Management","Feed Stock","Feeding Records","Fish Stock History","Sales Invoicing","Staff Management","Reports & Analytics","CSV Export","PDF Export"];
  const dp=(mp:number,yr:boolean)=>yr?Math.round(mp*12*0.80):mp;
  const sv=(mp:number)=>Math.round(mp*12*0.20);
  const BillingToggle=({yearly,setYearly}:{yearly:boolean;setYearly:(v:boolean)=>void})=>(
    <div className="inline-flex items-center gap-3 bg-slate-100 rounded-full p-1">
      <button onClick={()=>setYearly(false)} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${!yearly?"bg-white text-slate-900 shadow-sm":"text-slate-500"}`}>Monthly</button>
      <button onClick={()=>setYearly(true)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${yearly?"bg-white text-slate-900 shadow-sm":"text-slate-500"}`}>
        Yearly <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">Save 20%</span>
      </button>
    </div>
  );
  return(
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-6 overflow-y-auto">
      <div className="w-full max-w-4xl py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <img src={pondtoraLogo} alt="Pondtora" className="h-10 w-auto object-contain"/>
            <span className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Pondtora</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mb-2">Choose Your Subscription</h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">Start with a free 30-day trial. No payment required to start. Cancel anytime.</p>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mx-auto mb-4">
          <button onClick={()=>setPlanTab("single")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${planTab==="single"?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-800"}`}>Single Farm</button>
          <button onClick={()=>setPlanTab("multi")} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${planTab==="multi"?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-800"}`}>Multiple Farms</button>
        </div>
        {planTab==="single"&&(
          <div className="space-y-5">
            <div className="flex justify-center"><BillingToggle yearly={yearlyS} setYearly={setYearlyS}/></div>
            {yearlyS&&<p className="text-xs text-green-600 font-semibold text-center">Billed annually — save 20% on your subscription.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {singlePlans.map(plan=>(
                <div key={plan.name} className={`rounded-2xl border-2 ${plan.color} bg-white p-6 flex flex-col relative`}>
                  {plan.badge&&<span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold ${plan.badge==="Popular"?"bg-green-600 text-white":"bg-[#F97316] text-white"}`}>{plan.badge}</span>}
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">{plan.name}</p>
                    <p className={`text-sm font-semibold mb-3 ${plan.limit==="Unlimited active ponds"?"text-slate-700":"text-green-600"}`}>{plan.limit}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif]">{cs}{cvt(dp(plan.monthlyPrice,yearlyS)).toLocaleString()}</span>
                      <span className="text-slate-400 text-sm">{yearlyS?"/year":"/month"}</span>
                    </div>
                    {yearlyS&&<p className="text-[11px] text-green-600 mt-1">Save {cs}{cvt(sv(plan.monthlyPrice)).toLocaleString()} per year</p>}
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{plan.desc}</p>
                  </div>
                  <div className="mb-4 space-y-1.5 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Includes:</p>
                    {plan.name==="Starter"?EVERY_PLAN_INCLUDES.map(f=><div key={f} className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0"/>{f}</div>):plan.name==="Growth"?(<><div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0"/>Everything in Starter</div><div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0"/>Up to 15 active ponds</div></>):(<><div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0"/>Everything in Growth</div><div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0"/>Unlimited active ponds</div></>)}
                  </div>
                  <button onClick={()=>onSelectPlan(plan.name)} className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors mt-3 ${plan.badge==="Popular"?"bg-green-600 hover:bg-green-700 text-white":plan.badge==="Best Value"?"bg-[#F97316] hover:bg-[#ea6c0a] text-white":"border-2 border-slate-200 hover:border-green-400 text-slate-700"}`}>Try 30 Days for Free</button>
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">All plans include a <strong className="text-slate-700">30-day free trial</strong>. No payment required to start. Cancel or change plans anytime.</p>
            </div>
          </div>
        )}
        {planTab==="multi"&&(
          <div className="space-y-5">
            <div className="flex justify-center"><BillingToggle yearly={yearlyM} setYearly={setYearlyM}/></div>
            {yearlyM&&<p className="text-xs text-green-600 font-semibold text-center">Billed annually — save 20% on your subscription.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {multiPlans.map(plan=>(
                <div key={plan.name} className={`rounded-2xl border-2 ${plan.color} bg-white p-6 flex flex-col relative`}>
                  {plan.badge&&<span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold ${plan.badge==="Popular"?"bg-green-600 text-white":"bg-[#F97316] text-white"}`}>{plan.badge}</span>}
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">{plan.name}</p>
                    <div className="flex items-center gap-1.5 mb-1"><Fish size={11} className="text-green-500"/><p className={`text-sm font-semibold ${plan.farmLimit===Infinity?"text-slate-900":"text-green-600"}`}>{plan.farms}</p></div>
                    <p className="text-[11px] text-teal-600 font-medium mb-2">Unlimited active ponds per farm</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif]">{cs}{cvt(dp(plan.monthlyPrice,yearlyM)).toLocaleString()}</span>
                      <span className="text-slate-400 text-sm">{yearlyM?"/year":"/month"}</span>
                    </div>
                    {yearlyM&&<p className="text-[10px] text-green-600 mt-0.5">Save {cs}{cvt(sv(plan.monthlyPrice)).toLocaleString()} per year</p>}
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{plan.desc}</p>
                  </div>
                  <div className="mb-4 space-y-1.5 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Includes:</p>
                    {plan.farmLimit===3?(<>{[...EVERY_PLAN_INCLUDES,"Unlimited active ponds per farm"].map(f=><div key={f} className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0"/>{f}</div>)}</>):plan.farmLimit===5?(<><div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0"/>Everything in the 3-Farm Plan</div><div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0"/>Up to 5 farms</div></>):(<><div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0"/>Everything in the 5-Farm Plan</div><div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0"/>Unlimited farms</div></>)}
                  </div>
                  <button onClick={()=>onSelectPlan(plan.name)} className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors mt-auto ${plan.badge==="Popular"?"bg-green-600 hover:bg-green-700 text-white":plan.badge==="Best Value"?"bg-[#F97316] hover:bg-[#ea6c0a] text-white":"border-2 border-slate-200 hover:border-green-400 text-slate-700"}`}>Try 30 Days for Free</button>
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">All plans include a <strong className="text-slate-700">30-day free trial</strong>. No payment required to start. Cancel or change plans anytime.</p>
              <p className="text-xs text-slate-400 mt-1">Prices shown in {cs}. Plans differ only in the number of farms supported.</p>
            </div>
          </div>
        )}
        <p className="text-center text-xs text-slate-400 mt-6">You can change or cancel your plan at any time from Settings → Subscription.</p>
      </div>
    </div>
  );
}

/* ─── Candidate hash-routing wrapper ────────────────────────── */
function parseAssessUrlParts(hash:string):{type:"knowledge"|"compatibility";ownerId:string}|null{
  const m=hash.match(/^#\/assess\/(knowledge|compatibility)\/([^/]+)$/);
  if(!m)return null;
  return{type:m[1] as "knowledge"|"compatibility",ownerId:m[2]};
}
function CandidateRoute(){
  const [parts]=useState(()=>parseAssessUrlParts(window.location.hash));
  if(!parts){
    return(
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-6" style={{fontFamily:"'Barlow',sans-serif"}}>
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <AlertCircle size={32} className="text-amber-500"/>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Invalid Assessment Link</h2>
          <p className="text-sm text-slate-500">This assessment link is not valid or has expired. Please contact your administrator for a new link.</p>
        </div>
      </div>
    );
  }
  return(
    <div style={{fontFamily:"'Barlow',sans-serif"}}>
      <CandidateAssessment
        type={parts.type}
        ownerId={parts.ownerId}
        onClose={()=>{window.location.hash="";window.location.reload();}}
      />
    </div>
  );
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function saveLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

/* ─── Root ──────────────────────────────────────────────────── */
export default function App({ onAdmin }: { onAdmin?: () => void } = {}){
  const [isAuth,setIsAuth]=useState<boolean>(()=>localStorage.getItem("pondtora_is_auth")==="true");
  const [showLanding,setShowLanding]=useState<boolean>(()=>localStorage.getItem("pondtora_show_landing")!=="false");
  const [authInitialView,setAuthInitialView]=useState<"login"|"create">("login");
  const [userProfile,setUserProfile]=useState<UserProfile|null>(()=>loadLocal("pondtora_user_profile",null));
  const [active,setActive_]=useState<View>("financial");
  const setActive=(v:View)=>{setActive_(v);};
  const [sideOpen,setSideOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const [mFarmOpen,setMFarmOpen]=useState(false);
  const mFarmRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(mFarmRef.current&&!mFarmRef.current.contains(e.target as Node))setMFarmOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==="Escape")setMFarmOpen(false);};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[]);
  
  const [farms,setFarms]=useState<Farm[]>(()=>loadLocal("pondtora_farms",[]));
  const [activeFarmId,setActiveFarmId]=useState<string>(()=>localStorage.getItem("pondtora_active_farm_id")||"");
  const [showAddFarm,setShowAddFarm]=useState(false);
  const [addFarmF,setAddFarmF]=useState({name:"",city:"",state:"",country:"Nigeria"});
  
  const [ponds,setPonds]=useState<Pond[]>(()=>loadLocal("pondtora_ponds",[]));
  const [inventory,setInventory]=useState<FeedItem[]>(()=>loadLocal("pondtora_inventory",[]));
  const [feeding,setFeeding]=useState<FeedingRecord[]>(()=>loadLocal("pondtora_feeding",[]));
  const [bagLogs,setBagLogs]=useState<BagOpenLog[]>(()=>loadLocal("pondtora_bag_logs",[]));
  const [remainLogs,setRemainLogs]=useState<FeedRemainingLog[]>(()=>loadLocal("pondtora_remain_logs",[]));
  const [expenses,setExpenses]=useState<Expense[]>(()=>loadLocal("pondtora_expenses",[]));
  const [revenues,setRevenues]=useState<Revenue[]>(()=>loadLocal("pondtora_revenues",[]));
  const [mortality,setMortality]=useState<MortalityEntry[]>(()=>loadLocal("pondtora_mortality",[]));
  const [treatments,setTreatments]=useState<TreatmentRecord[]>(()=>loadLocal("pondtora_treatments",[]));
  const [staff,setStaff]=useState<StaffMember[]>(()=>loadLocal("pondtora_staff",[]));
  const [stockEvents,setStockEvents]=useState<StockEvent[]>(()=>loadLocal("pondtora_stock_events",[]));
  const [reports,setReports]=useState<Report[]>(()=>loadLocal("pondtora_reports",[]));
  const [customers,setCustomers]=useState<Customer[]>(()=>loadLocal("pondtora_customers",[]));
  const [priceGroups,setPriceGroups]=useState<PriceGroup[]>(()=>loadLocal("pondtora_price_groups",[]));
  const [invoices,setInvoices]=useState<Invoice[]>(()=>loadLocal("pondtora_invoices",[]));
  const [invSettings,setInvSettings]=useState<InvSettings>(()=>loadLocal("pondtora_inv_settings",INIT_INV_SETTINGS));

  const [kQuestionsState,setKQuestions_]=useState<any[]>(()=>loadLocal("pondtora_k_questions",[]));
  const [cQuestionsState,setCQuestions_]=useState<any[]>(()=>loadLocal("pondtora_c_questions",INIT_C));
  const [kResultsState,setKResults_]=useState<any[]>(()=>loadLocal("pondtora_k_results",[]));
  const [cResultsState,setCResults_]=useState<any[]>(()=>loadLocal("pondtora_c_results",[]));

  /* ── LocalStorage Synchronizers ── */
  useEffect(()=>{localStorage.setItem("pondtora_is_auth",isAuth?"true":"false");},[isAuth]);
  useEffect(()=>{localStorage.setItem("pondtora_show_landing",showLanding?"true":"false");},[showLanding]);
  useEffect(()=>{saveLocal("pondtora_user_profile",userProfile);},[userProfile]);
  useEffect(()=>{saveLocal("pondtora_farms",farms);},[farms]);
  useEffect(()=>{if(activeFarmId)localStorage.setItem("pondtora_active_farm_id",activeFarmId);},[activeFarmId]);
  useEffect(()=>{saveLocal("pondtora_ponds",ponds);},[ponds]);
  useEffect(()=>{saveLocal("pondtora_inventory",inventory);},[inventory]);
  useEffect(()=>{saveLocal("pondtora_feeding",feeding);},[feeding]);
  useEffect(()=>{saveLocal("pondtora_bag_logs",bagLogs);},[bagLogs]);
  useEffect(()=>{saveLocal("pondtora_remain_logs",remainLogs);},[remainLogs]);
  useEffect(()=>{saveLocal("pondtora_expenses",expenses);},[expenses]);
  useEffect(()=>{saveLocal("pondtora_revenues",revenues);},[revenues]);
  useEffect(()=>{saveLocal("pondtora_mortality",mortality);},[mortality]);
  useEffect(()=>{saveLocal("pondtora_treatments",treatments);},[treatments]);
  useEffect(()=>{saveLocal("pondtora_staff",staff);},[staff]);
  useEffect(()=>{saveLocal("pondtora_stock_events",stockEvents);},[stockEvents]);
  useEffect(()=>{saveLocal("pondtora_reports",reports);},[reports]);
  useEffect(()=>{saveLocal("pondtora_customers",customers);},[customers]);
  useEffect(()=>{saveLocal("pondtora_price_groups",priceGroups);},[priceGroups]);
  useEffect(()=>{saveLocal("pondtora_invoices",invoices);},[invoices]);
  useEffect(()=>{saveLocal("pondtora_inv_settings",invSettings);},[invSettings]);
  useEffect(()=>{saveLocal("pondtora_k_questions",kQuestionsState);},[kQuestionsState]);
  useEffect(()=>{saveLocal("pondtora_c_questions",cQuestionsState);},[cQuestionsState]);
  useEffect(()=>{saveLocal("pondtora_k_results",kResultsState);},[kResultsState]);
  useEffect(()=>{saveLocal("pondtora_c_results",cResultsState);},[cResultsState]);

  useEffect(()=>{
    if(farms.length>0&&(!activeFarmId||!farms.some(f=>f.id===activeFarmId))){
      setActiveFarmId(farms[0].id);
    }
  },[farms,activeFarmId]);
  /* ── Subscription state (global so limits apply everywhere) ── */
  const [activePlan,setActivePlan_]=useState<string|null>(()=>localStorage.getItem("pondtora_plan"));
  const [trialStartDate,setTrialStartDate_]=useState<string|null>(()=>localStorage.getItem("pondtora_trial_start"));

  // Check live admin override (suspension, free VIP access, custom rates)
  const [adminOverride, setAdminOverride] = useState(() => getUserAdminOverride(userProfile?.email));

  useEffect(() => {
    setAdminOverride(getUserAdminOverride(userProfile?.email));
    const handleUsersUpdate = () => setAdminOverride(getUserAdminOverride(userProfile?.email));
    window.addEventListener("pondtora:users_updated", handleUsersUpdate);
    return () => window.removeEventListener("pondtora:users_updated", handleUsersUpdate);
  }, [userProfile?.email, isAuth]);

  // Synchronize user profile directly to Admin dashboard on any change
  useEffect(() => {
    if (isAuth && userProfile) {
      syncUserProfileToAdmin(userProfile, activePlan, farms.length);
    }
  }, [isAuth, userProfile, activePlan, farms.length]);

  const setActivePlan=(plan:string|null)=>{
    setActivePlan_(plan);
    if(plan)localStorage.setItem("pondtora_plan",plan);else localStorage.removeItem("pondtora_plan");
    // Persist to DB asynchronously
    if(plan)api.profile.updatePlan(plan).catch(console.warn);
    if (userProfile) {
      syncUserProfileToAdmin(userProfile, plan, farms.length);
      logActivity("Subscription Plan Changed", "subscription", `${userProfile.name} selected plan ${plan || "None"}`, userProfile.email);
    }
  };
  const setTrialStartDate=(d:string|null)=>{
    setTrialStartDate_(d);
    if(d)localStorage.setItem("pondtora_trial_start",d);else localStorage.removeItem("pondtora_trial_start");
  };
  const PLAN_POND_LIMITS:Record<string,number>={
    "Starter":5,"Growth":15,"Commercial":Infinity,
    "3-Farm Plan":Infinity,"5-Farm Plan":Infinity,"Unlimited Farms":Infinity,
  };
  const PLAN_FARM_LIMITS:Record<string,number>={
    "Starter":1,"Growth":1,"Commercial":1,
    "3-Farm Plan":3,"5-Farm Plan":5,"Unlimited Farms":Infinity,
  };
  const pondLimit = adminOverride.hasFreeAccess ? Infinity : (activePlan ? PLAN_POND_LIMITS[activePlan] ?? 5 : 5);
  const farmLimit = adminOverride.hasFreeAccess ? Infinity : (activePlan ? PLAN_FARM_LIMITS[activePlan] ?? 1 : 1);
  const mainRef=useRef<HTMLElement>(null);
  useEffect(()=>{mainRef.current?.scrollTo({top:0,behavior:"instant"});},[active]);
  const nav=(v:View)=>{setActive(v);setSideOpen(false);};
  const handleAddFarm=()=>{
    if(!addFarmF.name)return;
    if(farms.length>=farmLimit){setUpgradeModalMsg(farmLimit===1?`Your current plan supports 1 farm. Upgrade to a multi-farm plan to add more farms.`:`You've reached the limit of ${farmLimit} farms on your plan. Upgrade to add more farms.`);setShowUpgradeModal(true);setShowAddFarm(false);return;}
    const newFarm:Farm={id:uid(),name:addFarmF.name,city:addFarmF.city,state:addFarmF.state,country:addFarmF.country};
    setFarms(prev=>[...prev,newFarm]);
    setActiveFarmId(newFarm.id);
    setShowAddFarm(false);
    setAddFarmF({name:"",city:"",state:"",country:"Nigeria"});
    toast.success("Farm created");
    api.farms.create(newFarm).catch(e=>{console.warn("Farm save failed",e);toast.error("Farm saved locally — sync when online");});
  };
  const handleEditFarm=(f:Farm)=>{
    setFarms(prev=>prev.map(x=>x.id===f.id?f:x));
    toast.success("Farm updated");
    api.farms.update(f).catch(console.warn);
  };
  const handleDeleteFarm=(id:string)=>{
    setFarms(prev=>prev.filter(f=>f.id!==id));
    if(activeFarmId===id){const remaining=farms.filter(f=>f.id!==id);if(remaining.length>0)setActiveFarmId(remaining[0].id);}
    toast.success("Farm deleted");
    api.farms.remove(id).catch(console.warn);
  };
  /* Create a farm directly from the Settings page (takes plain data object) */
  const handleAddFarmDirect=(d:{name:string;city:string;state:string;country:string})=>{
    if(!d.name.trim())return;
    if(farms.length>=farmLimit){setUpgradeModalMsg(farmLimit===1?`Your current plan supports 1 farm. Upgrade to a multi-farm plan to add more farms.`:`You've reached the limit of ${farmLimit} farms on your plan. Upgrade to add more farms.`);setShowUpgradeModal(true);return;}
    const newFarm:Farm={id:uid(),name:d.name,city:d.city,state:d.state,country:d.country};
    setFarms(prev=>[...prev,newFarm]);
    setActiveFarmId(newFarm.id);
    toast.success("Farm created");
    api.farms.create(newFarm).catch(console.warn);
  };
  const handleUpdateProfile=async(u:{name:string;phone:string})=>{
    setUserProfile(p=>p?{...p,name:u.name,phone:u.phone}:p);
    api.profile.update({name:u.name,phone:u.phone}).catch(console.warn);
  };
  const addTreatment=(t:TreatmentRecord)=>{setTreatments(prev=>[t,...prev]);toast.success("Treatment recorded");api.treatments.create(t).catch(console.warn);};
  const addPond=(p:Pond)=>{
    const farmPonds=ponds.filter(x=>x.farmId===activeFarmId);
    if(farmPonds.length>=pondLimit){const planLabel=activePlan||"free trial";setUpgradeModalMsg(`You've reached the limit of ${pondLimit===Infinity?"unlimited":pondLimit} ponds on the ${planLabel} plan. Upgrade to add more ponds.`);setShowUpgradeModal(true);return;}
    const nameConflict=farmPonds.some(x=>x.name.trim().toLowerCase()===p.name.trim().toLowerCase());
    if(nameConflict){toast.error(`A pond named "${p.name}" already exists in this farm.`);return;}
    const np={...p,farmId:activeFarmId};
    setPonds(prev=>[...prev,np]);
    toast.success("Pond added");
    api.ponds.create(np).catch(console.warn);
  };
  const closePond=(id:string)=>{
    const p=ponds.find(x=>x.id===id);
    const closed={...p!,status:"Empty" as const,currentCount:0,initialStock:0,avgWeight:undefined,stockingDate:"—",stockMonth:"",totalCost:0,species:"—"};
    setPonds(prev=>prev.map(x=>x.id===id?closed:x));
    if(p){
      api.ponds.update(closed).catch(console.warn);
      const se={id:uid(),pondId:id,pondName:p.name,date:TODAY,species:p.species,count:p.currentCount,cost:p.totalCost,type:"Closed" as const,clearedDate:TODAY};
      setStockEvents(prev=>[...prev,se]);
      api.stockEvents.create(se).catch(console.warn);
      setFeeding(prev=>prev.filter(r=>r.pond!==p.name));
      setTreatments(prev=>prev.filter(t=>t.pondId!==id));
      setMortality(prev=>prev.filter(m=>m.pondId!==id));
    }
  };
  const restockPond=(id:string,data:{species:string;initialStock:number;stockingDate:string;stockMonth:string;supplier?:string})=>{
    const p=ponds.find(x=>x.id===id);
    const updated=p?{...p,...data,currentCount:data.initialStock,totalCost:0,status:"Active" as const,transferNote:undefined}:null;
    setPonds(prev=>prev.map(x=>x.id===id&&updated?updated:x));
    if(updated)api.ponds.update(updated).catch(console.warn);
    const se={id:uid(),pondId:id,pondName:p?.name||"",date:data.stockingDate,species:data.species,count:data.initialStock,cost:0,type:"Restock" as const,supplier:data.supplier};
    if(p){setStockEvents(prev=>[...prev,se]);api.stockEvents.create(se).catch(console.warn);}
  };
  const addExp=(e:Expense)=>{const ne={...e,farmId:activeFarmId};setExpenses(prev=>[ne,...prev]);toast.success("Expense added");api.expenses.create(ne).catch(console.warn);};
  const editExp=(e:Expense)=>{setExpenses(prev=>prev.map(x=>x.id===e.id?e:x));api.expenses.update(e).catch(console.warn);};
  const addRev=(r:Revenue)=>{const nr={...r,farmId:activeFarmId};setRevenues(prev=>[nr,...prev]);toast.success("Revenue added");api.revenues.create(nr).catch(console.warn);};
  const editRev=(r:Revenue)=>{setRevenues(prev=>prev.map(x=>x.id===r.id?r:x));api.revenues.update(r).catch(console.warn);};
  const setPondMaxKg=(pondId:string,size:string,maxKg:number)=>setPonds(prev=>prev.map(p=>p.id===pondId?{...p,maxKgByPallet:{...(p.maxKgByPallet||{}),[size]:maxKg}}:p));
  const addFeed=(r:FeedingRecord)=>{
    setFeeding(prev=>{
      const updated=[r,...prev];
      /* check if cumulative for this pond+size reached max */
      const pond=ponds.find(p=>p.name===r.pond);
      if(pond?.maxKgByPallet?.[r.size]){
        const maxKg=pond.maxKgByPallet[r.size];
        const cumulative=updated.filter(x=>x.pond===r.pond&&x.size===r.size).reduce((s,x)=>s+x.total,0);
        if(cumulative>=maxKg){
          const farm=farms.find(f=>f.id===pond.farmId)||farms[0];
          const notifId=`MX-${pond.id}-${r.size}`.replace(/[\s.]/g,"_");
          const fishStockLabel=`${pond.species} (${pond.stockingDate})`;
          const nowTime=new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
          setExtraNotifs(p=>{const existing=p.find(n=>n.id===notifId);if(existing){return p.map(n=>n.id===notifId?{...n,currentFeed:cumulative,time:nowTime,read:false}:n);}return[...p,{id:notifId,type:"maxkg" as any,pondName:pond.name,fishStock:fishStockLabel,size:r.size,maxKg,currentFeed:cumulative,time:nowTime,farmId:pond.farmId,farmName:farm?.name||"",date:TODAY,read:false}];});
        }
      }
      return updated;
    });
    toast.success("Feeding logged");
    api.feeding.create(r).catch(console.warn);
  };
  const editFeedRecord=(r:FeedingRecord)=>{setFeeding(prev=>prev.map(x=>x.id===r.id?r:x));api.feeding.update(r).catch(console.warn);};
  const addBagLog=(b:BagOpenLog)=>{
    setBagLogs(prev=>{
      const bStock=b.fishStock||"";
      const existing=prev.find(x=>x.date===b.date&&x.brand===b.brand&&x.size===b.size&&(x.fishStock||"")===(bStock));
      if(existing){
        const updated={...existing,bagsOpened:b.bagsOpened,totalKg:b.totalKg,kgPerBag:b.kgPerBag};
        api.bagLogs.update(updated).catch(console.warn);
        return prev.map(x=>x.id===existing.id?updated:x);
      }
      api.bagLogs.create(b).catch(console.warn);
      return[b,...prev];
    });
    toast.success("Bags logged");
  };
  const editBagLog=(b:BagOpenLog)=>{setBagLogs(prev=>prev.map(x=>x.id===b.id?b:x));api.bagLogs.update(b).catch(console.warn);};
  const addRemainLog=(r:FeedRemainingLog)=>{setRemainLogs(prev=>[r,...prev]);toast.success("Remaining feed logged");api.remainLogs.create(r).catch(console.warn);};
  const editRemainLog=(r:FeedRemainingLog)=>{setRemainLogs(prev=>prev.map(x=>x.id===r.id?r:x));api.remainLogs.update(r).catch(console.warn);};
  const addInv=(f:FeedItem)=>{const fWithFarm={...f,farmId:activeFarmId};setInventory(prev=>[...prev,fWithFarm]);toast.success("Feed purchase recorded");api.inventory.create(fWithFarm).catch(console.warn);};
  const delInv=(id:string)=>{setInventory(prev=>prev.filter(f=>f.id!==id));api.inventory.remove(id).catch(console.warn);};
  const editInv=(f:FeedItem)=>{setInventory(prev=>prev.map(x=>x.id===f.id?f:x));api.inventory.update(f).catch(console.warn);};
  const editFish=(id:string,u:{species:string;currentCount:number;stockingDate:string})=>{setPonds(prev=>prev.map(p=>{if(p.id!==id)return p;const np={...p,...u};api.ponds.update(np).catch(console.warn);return np;}));};
  const deletePond=(id:string)=>{setPonds(prev=>prev.filter(p=>p.id!==id));api.ponds.remove(id).catch(console.warn);};
  const addMort=(m:MortalityEntry,pondId:string)=>{
    toast.success("Mortality recorded");
    setMortality(prev=>[m,...prev]);
    setPonds(prev=>prev.map(p=>p.id===pondId?{...p,currentCount:Math.max(0,p.currentCount-m.count)}:p));
    api.mortality.create(m).catch(console.warn);
    const updPond=ponds.find(p=>p.id===pondId);
    if(updPond)api.ponds.update({...updPond,currentCount:Math.max(0,updPond.currentCount-m.count)}).catch(console.warn);
  };
  const transferStock=(fromId:string,toId:string,date:string)=>{
    const fromPond=ponds.find(p=>p.id===fromId);
    const toPond=ponds.find(p=>p.id===toId);
    if(!fromPond||!toPond)return;
    const dateLabel=`${toMon(date)} ${new Date(date).getDate()}, ${new Date(date).getFullYear()}`;
    const clearedFrom={...fromPond,status:"Empty" as const,currentCount:0,initialStock:0,avgWeight:undefined,stockingDate:"—",stockMonth:"",totalCost:0,species:"—",transferNote:undefined,maxKgByPallet:undefined};
    const filledTo={...toPond,status:"Active" as const,species:fromPond.species,initialStock:fromPond.initialStock,currentCount:fromPond.currentCount,stockingDate:fromPond.stockingDate,stockMonth:fromPond.stockMonth,totalCost:fromPond.totalCost,maxKgByPallet:fromPond.maxKgByPallet,transferNote:`Stock received from ${fromPond.name} on ${dateLabel}`};
    /* move all pond data */
    setPonds(prev=>prev.map(p=>{
      if(p.id===fromId)return clearedFrom;
      if(p.id===toId)return filledTo;
      return p;
    }));
    api.ponds.update(clearedFrom).catch(console.warn);
    api.ponds.update(filledTo).catch(console.warn);
    /* remap feeding records from old pond to new pond and persist */
    const remappedFeeding=feeding.filter(r=>r.pond===fromPond.name).map(r=>({...r,pond:toPond.name}));
    setFeeding(prev=>prev.map(r=>r.pond===fromPond.name?{...r,pond:toPond.name}:r));
    remappedFeeding.forEach(r=>api.feeding.update(r).catch(console.warn));
    /* remap treatments — create copies on destination, persist */
    const pondTreatments=treatments.filter(t=>t.pondId===fromId);
    const remappedTreatments=pondTreatments.map(t=>({...t,id:uid(),pondId:toId,farmId:toPond.farmId}));
    setTreatments(prev=>[...prev.filter(t=>t.pondId!==fromId),...remappedTreatments]);
    remappedTreatments.forEach(t=>api.treatments.create(t).catch(console.warn));
    /* remap mortality */
    setMortality(prev=>prev.map(m=>m.pondId===fromId?{...m,pondId:toId}:m));
    const seTransfer={id:uid(),pondId:toId,pondName:toPond.name,date:dateLabel,species:fromPond.species,count:fromPond.currentCount,cost:fromPond.totalCost,type:"Transfer" as const,fromPond:fromPond.name};
    const seClosed={id:uid(),pondId:fromId,pondName:fromPond.name,date:dateLabel,species:fromPond.species,count:fromPond.currentCount,cost:fromPond.totalCost,type:"Closed" as const,clearedDate:dateLabel};
    setStockEvents(prev=>[...prev,seTransfer,seClosed]);
    api.stockEvents.create(seTransfer).catch(console.warn);
    api.stockEvents.create(seClosed).catch(console.warn);
    // Transfer notification
    const farm=farms.find(f=>f.id===activeFarmId)||farms[0];
    const tnid=`transfer-full-${uid()}`;
    setExtraNotifs(prev=>[...prev,{id:tnid,type:"transfer" as any,pondName:fromPond.name,farmId:activeFarmId,farmName:farm?.name||"",date:TODAY,read:false,message:`${fromPond.currentCount.toLocaleString()} fish fully transferred from ${fromPond.name} to ${toPond.name}`}]);
    toast.success("Stock transferred");
  };
  const nurseryTransfer=(fromId:string,toId:string,count:number,pct:number,date:string)=>{
    const fromPond=ponds.find(p=>p.id===fromId);
    const toPond=ponds.find(p=>p.id===toId);
    if(!fromPond||!toPond)return;
    const fraction=Math.min(1,Math.max(0,pct/100));
    const dateLabel=`${toMon(date)} ${new Date(date).getDate()}, ${new Date(date).getFullYear()}`;
    const safeCount=Math.min(count,fromPond.currentCount);
    const costShare=fromPond.currentCount>0?fromPond.totalCost*(safeCount/fromPond.currentCount):0;
    const isFullTransfer=safeCount>=fromPond.currentCount;
    /* update pond counts */
    setPonds(prev=>prev.map(p=>{
      if(p.id===fromId){
        if(isFullTransfer)return{...p,status:"Empty" as const,currentCount:0,initialStock:0,avgWeight:undefined,stockingDate:"—",stockMonth:"",totalCost:0,species:"—",transferNote:undefined};
        return{...p,currentCount:Math.max(0,p.currentCount-safeCount),totalCost:Math.max(0,p.totalCost-costShare)};
      }
      if(p.id===toId)return{...p,status:"Active",species:p.status==="Empty"?fromPond.species:p.species,initialStock:(p.initialStock||0)+safeCount,currentCount:(p.currentCount||0)+safeCount,stockingDate:p.status==="Empty"||p.stockingDate==="—"?fromPond.stockingDate:p.stockingDate,stockMonth:p.status==="Empty"||!p.stockMonth?fromPond.stockMonth:p.stockMonth,totalCost:(p.totalCost||0)+costShare,transferNote:`${safeCount.toLocaleString()} fish received from ${fromPond.name} (Nursery) on ${dateLabel}`};
      return p;
    }));
    /* split feeding records proportionally */
    const pondFeeding=feeding.filter(r=>r.pond===fromPond.name);
    if(pondFeeding.length>0){
      if(isFullTransfer){
        /* remap all source feeding to destination */
        const remapped=pondFeeding.map(r=>({...r,pond:toPond.name}));
        setFeeding(prev=>prev.map(r=>r.pond===fromPond.name?{...r,pond:toPond.name}:r));
        remapped.forEach(r=>api.feeding.update(r).catch(console.warn));
      } else {
        /* destination gets fraction, source keeps (1-fraction) */
        const transferFeeding:typeof feeding=pondFeeding.map(r=>({...r,id:uid(),pond:toPond.name,morning:Math.round(r.morning*fraction*10)/10,evening:Math.round(r.evening*fraction*10)/10,total:Math.round(r.total*fraction*10)/10}));
        const remainFraction=1-fraction;
        const reducedSource=pondFeeding.map(r=>({...r,morning:Math.round(r.morning*remainFraction*10)/10,evening:Math.round(r.evening*remainFraction*10)/10,total:Math.round(r.total*remainFraction*10)/10}));
        setFeeding(prev=>[
          ...prev.map(r=>r.pond===fromPond.name?{...r,morning:Math.round(r.morning*remainFraction*10)/10,evening:Math.round(r.evening*remainFraction*10)/10,total:Math.round(r.total*remainFraction*10)/10}:r),
          ...transferFeeding
        ]);
        reducedSource.forEach(r=>api.feeding.update(r).catch(console.warn));
        transferFeeding.forEach(r=>api.feeding.create(r).catch(console.warn));
      }
    }
    /* copy all treatments */
    const pondTreatments=treatments.filter(t=>t.pondId===fromId);
    const transferTreatments=pondTreatments.map(t=>({...t,id:uid(),pondId:toId,farmId:toPond.farmId}));
    if(transferTreatments.length>0)setTreatments(prev=>[...prev,...transferTreatments]);
    /* split maxKgByPallet: destination gets fraction, source keeps (1-fraction) */
    if(fromPond.maxKgByPallet&&Object.keys(fromPond.maxKgByPallet).length>0){
      const toExisting=toPond.maxKgByPallet||{};
      const mergedTo:Record<string,number>={};
      const reducedFrom:Record<string,number>={};
      [...new Set([...Object.keys(fromPond.maxKgByPallet),...Object.keys(toExisting)])].forEach(sz=>{
        mergedTo[sz]=Math.round((toExisting[sz]||0)+(fromPond.maxKgByPallet![sz]||0)*fraction);
      });
      Object.keys(fromPond.maxKgByPallet).forEach(sz=>{
        reducedFrom[sz]=isFullTransfer?0:Math.round((fromPond.maxKgByPallet![sz]||0)*(1-fraction));
      });
      setPonds(prev=>prev.map(p=>{
        if(p.id===toId)return{...p,maxKgByPallet:mergedTo};
        if(p.id===fromId&&!isFullTransfer)return{...p,maxKgByPallet:reducedFrom};
        return p;
      }));
    }
    /* persist pond updates */
    const updatedFrom=isFullTransfer?{...fromPond,status:"Empty" as const,currentCount:0,initialStock:0,avgWeight:undefined,stockingDate:"—",stockMonth:"",totalCost:0,species:"—",transferNote:undefined}:{...fromPond,currentCount:Math.max(0,fromPond.currentCount-safeCount),totalCost:Math.max(0,fromPond.totalCost-costShare)};
    api.ponds.update(updatedFrom).catch(console.warn);
    /* stock event */
    const seTransfer={id:uid(),pondId:toId,pondName:toPond.name,date:dateLabel,species:fromPond.species,count:safeCount,cost:costShare,type:"Transfer" as const,fromPond:fromPond.name};
    setStockEvents(prev=>[...prev,seTransfer]);
    api.stockEvents.create(seTransfer).catch(console.warn);
    if(isFullTransfer){
      const seClosed={id:uid(),pondId:fromId,pondName:fromPond.name,date:dateLabel,species:fromPond.species,count:safeCount,cost:costShare,type:"Closed" as const,clearedDate:dateLabel};
      setStockEvents(prev=>[...prev,seClosed]);
      api.stockEvents.create(seClosed).catch(console.warn);
    }
    /* Add notification for transfer */
    const farm=farms.find(f=>f.id===activeFarmId)||farms[0];
    const nid=`transfer-${uid()}`;
    setExtraNotifs(prev=>[...prev,{id:nid,type:"transfer" as any,pondName:fromPond.name,farmId:activeFarmId,farmName:farm?.name||"",date:TODAY,read:false,message:`${safeCount.toLocaleString()} fish transferred from ${fromPond.name} to ${toPond.name}`}]);
    toast.success(`${safeCount.toLocaleString()} fish transferred${isFullTransfer?" — source pond cleared":""}`);
  };
  const [showChoosePlan,setShowChoosePlan]=useState(false);
  const [showVerifyEmail,setShowVerifyEmail]=useState(false);
  const [pendingUser,setPendingUser]=useState<UserProfile|null>(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [setupSql,setSetupSql]=useState<string|null>(null);
  const [showSetup,setShowSetup]=useState(false);
  const [setupRunning,setSetupRunning]=useState(false);
  const [setupError,setSetupError]=useState<string|null>(null);
  const [sqlCopied,setSqlCopied]=useState(false);

  /* ── Apply backend data to state with smart merge ── */
  const applyBackendData=useCallback((d:any)=>{
    if(d.farms?.length>0){
      setFarms(d.farms);
      setActiveFarmId(prev=>(d.farms.some((f:any)=>f.id===prev)?prev:d.farms[0].id));
    }
    if(d.userProfiles?.length>0){
      const up=d.userProfiles[0];
      if(up.activePlan)setActivePlan(up.activePlan);
      if(up.trialStartDate)setTrialStartDate(up.trialStartDate);
    }
    if(d.ponds?.length>0)setPonds(d.ponds);
    if(d.stockEvents?.length>0)setStockEvents(d.stockEvents);
    if(d.feedInventory?.length>0)setInventory(d.feedInventory);
    if(d.feedingRecords?.length>0)setFeeding(d.feedingRecords);
    if(d.bagOpenLogs?.length>0)setBagLogs(d.bagOpenLogs);
    if(d.feedRemainingLogs?.length>0)setRemainLogs(d.feedRemainingLogs);
    if(d.expenses?.length>0)setExpenses(d.expenses);
    if(d.revenues?.length>0)setRevenues(d.revenues);
    if(d.mortalityEntries?.length>0)setMortality(d.mortalityEntries);
    if(d.treatmentRecords?.length>0)setTreatments(d.treatmentRecords);
    if(d.staffMembers?.length>0)setStaff(d.staffMembers);
    if(d.reports?.length>0)setReports(d.reports);
    if(d.customers?.length>0)setCustomers(d.customers);
    if(d.priceGroups?.length>0)setPriceGroups(d.priceGroups);
    if(d.invoices?.length>0)setInvoices(d.invoices);
    if(d.invoiceSettings)setInvSettings(d.invoiceSettings);
    if(d.knowledgeQuestions?.length>0)setKQuestions_(d.knowledgeQuestions);
    if(d.compatibilityQuestions?.length>0)setCQuestions_(d.compatibilityQuestions);
    if(d.knowledgeResults)setKResults_(d.knowledgeResults);
    if(d.compatibilityResults)setCResults_(d.compatibilityResults);
  },[]);

  /* ── Auto-create tables then reload ── */
  const runAutoSetup=useCallback(async()=>{
    setSetupRunning(true);
    setSetupError(null);
    try{
      const r=await api.autoSetup();
      if(r.success){
        setShowSetup(false);
        const d=await api.loadAll() as any;
        if(!d.needsSetup)applyBackendData(d);
      } else if(r.needsManual){
        setSetupSql(r.sql||"");
        setSetupError("Automatic setup unavailable — please run the SQL manually.");
      }
    }catch(e:any){
      const sqlRes=await api.setup().catch(()=>({sql:""}));
      setSetupSql(sqlRes.sql);
      setSetupError("Deploy the Edge Function first, then click 'Retry'.");
    }finally{setSetupRunning(false);}
  },[applyBackendData]);

  /* ── Backend data loading ── */
  const loadFromBackend=useCallback(async()=>{
    try{
      const d=await api.loadAll() as any;
      if(d.needsSetup){
        setShowSetup(true);
        runAutoSetup();
        return;
      }
      applyBackendData(d);
    }catch(e){console.warn("Backend load failed, using local state",e);}
  },[applyBackendData,runAutoSetup]);

  /* ── Restore session via Supabase Auth ── */
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        const meta=session.user.user_metadata??{};
        const country=meta.country||"Nigeria";
        const cc=COUNTRY_CURRENCIES[country]??COUNTRY_CURRENCIES["Nigeria"];
        setUserProfile({
          id:session.user.id,
          name:meta.name||session.user.email?.split("@")[0]||"User",
          farmName:meta.farm_name||"My Fish Farm",
          city:meta.city||"",state:meta.state||"",country,
          email:session.user.email||"",phone:meta.phone||"",
          currencySymbol:meta.currency_symbol||cc.symbol,
          currencyCode:meta.currency_code||cc.code,
        });
        setIsAuth(true);
        setShowLanding(false);
        loadFromBackend();
      }
      setAuthLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"){
        setIsAuth(false);setUserProfile(null);setShowLanding(true);
      } else if(session?.user && (event==="SIGNED_IN" || event==="TOKEN_REFRESHED")){
        const meta=session.user.user_metadata??{};
        const country=meta.country||"Nigeria";
        const cc=COUNTRY_CURRENCIES[country]??COUNTRY_CURRENCIES["Nigeria"];
        setUserProfile({
          id:session.user.id,
          name:meta.name||session.user.email?.split("@")[0]||"User",
          farmName:meta.farm_name||"My Fish Farm",
          city:meta.city||"",state:meta.state||"",country,
          email:session.user.email||"",phone:meta.phone||"",
          currencySymbol:meta.currency_symbol||cc.symbol,
          currencyCode:meta.currency_code||cc.code,
        });
        setIsAuth(true);
        setShowLanding(false);
        loadFromBackend();
      }
    });
    return ()=>subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const handleLogin=(profile:UserProfile)=>{
    setUserProfile(profile);
    setIsAuth(true);
    setShowLanding(false);
    loadFromBackend();
  };
  const handleLogout=async()=>{
    await auth.signOut().catch(console.warn);
    setIsAuth(false);setUserProfile(null);setShowLanding(true);
  };
  const handleSignup=(profile:UserProfile)=>{
    // With Supabase, if we get here a session exists (signUp returned session immediately)
    // Show plan selector before entering the app
    setPendingUser(profile);
    setShowChoosePlan(true);
  };
  const addReport=(r:Report)=>{
    const rr={...r,farmId:activeFarmId};
    setReports(prev=>[rr,...prev]);
    toast.success("Report saved");
    api.reports.create(rr).catch(console.warn);
    const farm=farms.find(f=>f.id===activeFarmId);
    const nid=`report-submitted-${rr.id}`;
    setExtraNotifs(prev=>[...prev.filter(n=>n.id!==nid),{id:nid,type:"report" as const,farmId:activeFarmId,farmName:farm?.name||"",date:TODAY,read:false,reportId:rr.id,reportTitle:rr.title,reportAuthor:rr.author,reportStatus:"submitted"}]);
  };
  const editReportFn=(r:Report)=>{setReports(prev=>prev.map(x=>x.id===r.id?r:x));api.reports.update(r).catch(console.warn);};
  const addStaff=(s:StaffMember)=>{
    setStaff(prev=>[...prev,s]);
    toast.success("Staff member invited — they will receive an email to set their password");
    api.staff.invite({
      email:s.email,name:s.name,phone:s.phone,role:s.role,
      farms:s.farms,permissions:s.permissions,
      appUrl:window.location.origin,
    }).then(res=>{
      if(res.staffMember?.id){setStaff(prev=>prev.map(x=>x.id===s.id?{...x,id:res.staffMember.id}:x));}
    }).catch(console.warn);
  };
  const editStaff=(s:StaffMember)=>{setStaff(prev=>prev.map(x=>x.id===s.id?s:x));api.staff.update(s).catch(console.warn);};
  const delStaff=(id:string)=>{setStaff(prev=>prev.filter(s=>s.id!==id));api.staff.remove(id).catch(console.warn);};
  const [showUpgradeModal,setShowUpgradeModal]=useState(false);
  const [upgradeModalMsg,setUpgradeModalMsg]=useState("");
  const [readNotifIds,setReadNotifIds]=useState<Set<string>>(new Set());
  const [extraNotifs,setExtraNotifs]=useState<AppNotification[]>([]);
  const [reconFocus,setReconFocus]=useState<{date:string;key:string}|null>(null);
  const onReconMismatches=useCallback((ms:{date:string;brand:string;size:string;fishStock?:string;key:string;status:string;reason:string}[])=>{
    setExtraNotifs(prev=>{
      const existing=prev.filter(n=>n.type==="reconciliation"&&n.farmId===activeFarmId);
      const filtered=prev.filter(n=>!(n.type==="reconciliation"&&n.farmId===activeFarmId));
      const farm=farms.find(f=>f.id===activeFarmId);
      const newNotifs:AppNotification[]=ms.map(m=>({
        id:`recon-${activeFarmId}-${m.date}-${m.brand}-${m.size}-${(m.fishStock||"").replace(/[\s.()/]/g,"_")}`.replace(/[\s.]/g,"_"),
        type:"reconciliation" as const,brand:m.brand,size:m.size,fishStock:m.fishStock,
        reconDate:m.date,reconKey:m.key,mismatchReason:m.reason,reconStatus:m.status,
        farmId:activeFarmId,farmName:farm?.name||"",date:TODAY,read:false,
      }));
      const existingKey=existing.map(n=>n.id).sort().join(",");
      const newKey=newNotifs.map(n=>n.id).sort().join(",");
      if(existingKey===newKey&&ms.length===0)return prev;
      if(existingKey===newKey&&newNotifs.every((n,i)=>n.reconStatus===existing[i]?.reconStatus))return prev;
      return[...filtered,...newNotifs];
    });
  },[activeFarmId,farms]);
  /* ── Assessment state aliases (use early-declared state) ── */
  const kQuestions=kQuestionsState;
  const cQuestions=cQuestionsState;
  const kResults=kResultsState;
  const cResults=cResultsState;
  const addKResult=(r:any)=>{setKResults_(prev=>[...prev,r]);api.kResults.create(r).catch(console.warn);};
  const addCResult=(r:any)=>{setCResults_(prev=>[...prev,r]);api.cResults.create(r).catch(console.warn);};
  const saveKQuestions=(qs:any[])=>{
    qs.forEach(q=>{
      if(kQuestionsState.find((x:any)=>x.id===q.id))api.kQuestions.update(q).catch(console.warn);
      else api.kQuestions.create(q).catch(console.warn);
    });
    const removed=kQuestionsState.filter((q:any)=>!qs.find((x:any)=>x.id===q.id));
    removed.forEach((q:any)=>api.kQuestions.remove(q.id).catch(console.warn));
    setKQuestions_(qs);
  };
  const saveCQuestions=(qs:any[])=>{
    qs.forEach(q=>{
      if(cQuestionsState.find((x:any)=>x.id===q.id))api.cQuestions.update(q).catch(console.warn);
      else api.cQuestions.create(q).catch(console.warn);
    });
    const removed=cQuestionsState.filter((q:any)=>!qs.find((x:any)=>x.id===q.id));
    removed.forEach((q:any)=>api.cQuestions.remove(q.id).catch(console.warn));
    setCQuestions_(qs);
  };
  const addInvoice=(inv:Invoice)=>{const ni={...inv,farmId:activeFarmId};setInvoices(prev=>[ni,...prev]);toast.success("Invoice created");api.invoices.create(ni).catch(console.warn);};
  const editInvoice=(inv:Invoice)=>{
    const old=invoices.find(x=>x.id===inv.id);
    setInvoices(prev=>prev.map(x=>x.id===inv.id?inv:x));
    api.invoices.update(inv).catch(console.warn);
    if(old&&old.status!==inv.status){
      const farm=farms.find(f=>f.id===activeFarmId)||farms[0];
      const nid=`inv-status-${inv.id}`;
      setExtraNotifs(prev=>[...prev.filter(n=>n.id!==nid),{id:nid,type:"invoice" as any,farmId:activeFarmId,farmName:farm?.name||"",date:TODAY,read:false,message:`Invoice ${inv.invNumber} status: ${inv.status}`}]);
    }
  };
  const addCustomer=(c:Customer)=>{const nc={...c,farmId:activeFarmId};setCustomers(prev=>[...prev,nc]);api.customers.create(nc).catch(console.warn);};
  const addPriceGroup=(g:PriceGroup)=>{const ng={...g,farmId:activeFarmId};setPriceGroups(prev=>[...prev,ng]);api.priceGroups.create(ng).catch(console.warn);};
  const editPriceGroup=(g:PriceGroup)=>{setPriceGroups(prev=>prev.map(x=>x.id===g.id?g:x));api.priceGroups.update(g).catch(console.warn);};
  const delPriceGroup=(id:string)=>{setPriceGroups(prev=>prev.filter(g=>g.id!==id));api.priceGroups.remove(id).catch(console.warn);};
  /* Derived data — computed unconditionally before any early return (Rules of Hooks) */
  const farmPonds=ponds.filter(p=>p.farmId===activeFarmId);
  const farmFeeding=feeding.filter(r=>!r.pond||(()=>{const p=ponds.find(x=>x.name===r.pond);return !p||p.farmId===activeFarmId;})());
  const farmInventory=inventory.filter(i=>!i.farmId||i.farmId===activeFarmId);
  const farmExpenses=expenses.filter(e=>!e.farmId||e.farmId===activeFarmId);
  const farmRevenues=revenues.filter(r=>!r.farmId||r.farmId===activeFarmId);
  const farmReports=reports.filter(r=>!r.farmId||r.farmId===activeFarmId);
  const farmTreatments=treatments.filter(t=>t.farmId===activeFarmId);
  const farmCustomers=customers.filter(c=>!c.farmId||c.farmId===activeFarmId);
  const farmPriceGroups=priceGroups.filter(g=>!g.farmId||g.farmId===activeFarmId);
  const farmInvoices=invoices.filter(i=>!i.farmId||i.farmId===activeFarmId);
  /* Permission derivation — owner has all permissions */
  const currentStaff=staff.find(s=>s.email===userProfile?.email);
  const isOwner=!currentStaff||currentStaff.role==="Admin";
  const hasPerm=(p:string)=>isOwner||((currentStaff?.permissions||[]).includes(p));
  const accessibleFarms=isOwner?farms:farms.filter(f=>currentStaff?.farms?.includes(f.id));
  const notifications=useMemo(()=>{
    const todayLbl=`${toMon(TODAY)} ${new Date(TODAY).getDate()}`;
    const fedToday=new Set(feeding.filter(r=>r.date===todayLbl).map(r=>r.pond));
    const bagsToday=bagLogs.some(b=>b.date===todayLbl);
    const farm=farms.find(f=>f.id===activeFarmId)||farms[0];
    const notifs:AppNotification[]=[];
    farmPonds.filter(p=>p.status==="Active"&&!fedToday.has(p.name)).forEach(p=>{
      const nid=`notif-feed-${p.id}`;
      notifs.push({id:nid,type:"feeding",pondName:p.name,farmId:activeFarmId,farmName:farm?.name||"",date:TODAY,read:readNotifIds.has(nid)});
    });
    if(!bagsToday){const nid=`notif-bags-${activeFarmId}`;notifs.push({id:nid,type:"bags",farmId:activeFarmId,farmName:farm?.name||"",date:TODAY,read:readNotifIds.has(nid)});}
    // Feed inventory low-stock alerts (≤3 bags remaining)
    const openedByKey=bagLogs.reduce<Record<string,number>>((acc,b)=>{const k=`${b.brand}|${b.size}`;acc[k]=(acc[k]||0)+b.bagsOpened;return acc;},{});
    const invByKey=farmInventory.reduce<Record<string,number>>((acc,i)=>{const k=`${i.brand}|${i.size}`;acc[k]=(acc[k]||0)+i.bags;return acc;},{});
    Object.entries(invByKey).forEach(([k,total])=>{const inStock=Math.max(0,total-(openedByKey[k]||0));if(inStock<=3&&inStock>=0){const nid=`inv-low-${activeFarmId}-${k}`;const[brand,size]=k.split("|");notifs.push({id:nid,type:"bags" as any,farmId:activeFarmId,farmName:farm?.name||"",date:TODAY,read:readNotifIds.has(nid),message:`Low stock: ${brand} ${size} — only ${inStock} bag${inStock!==1?"s":""} remaining`});}});
    const farmExtraNotifs=extraNotifs.filter(n=>n.farmId===activeFarmId).map(n=>({...n,read:n.read||readNotifIds.has(n.id)}));
    return [...notifs,...farmExtraNotifs];
  },[farmPonds,feeding,bagLogs,farmInventory,activeFarmId,farms,readNotifIds,extraNotifs]);
  const unreadCount=notifications.filter(n=>!n.read).length;
  const markRead=(id:string)=>{setReadNotifIds(prev=>new Set([...prev,id]));setExtraNotifs(prev=>prev.map(n=>n.id===id?{...n,read:true}:n));};
  const markAllRead=()=>{setReadNotifIds(prev=>new Set([...prev,...notifications.map(n=>n.id)]));setExtraNotifs(prev=>prev.map(n=>({...n,read:true})));};
  /* Auth gate — must come AFTER all hooks */
  if(authLoading) return(
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-green-600"/>
        <p className="text-sm text-slate-400">Loading Pondtora…</p>
      </div>
    </div>
  );
  if(showVerifyEmail&&pendingUser) return(
    <VerifyEmailScreen email={pendingUser.email} onVerified={()=>{setShowVerifyEmail(false);setShowChoosePlan(true);}} onChangeEmail={()=>{setShowVerifyEmail(false);setPendingUser(null);}}/>
  );
  if(showChoosePlan&&pendingUser) return(
    <ChoosePlanScreen onSelectPlan={async(plan:string)=>{
      const profile=pendingUser!;
      setActivePlan(plan);setTrialStartDate(TODAY);setUserProfile(profile);setIsAuth(true);setShowChoosePlan(false);setPendingUser(null);
      // DB trigger already created the farm + profile on sign-up — just update the plan
      api.profile.updatePlan(plan, TODAY).catch(console.warn);
      // Load data (farm + profile created by trigger)
      loadFromBackend();
    }}/>
  );
  const _hash=window.location.hash;
  if(parseAssessUrlParts(_hash)) return <CandidateRoute/>;
  if(!isAuth && showLanding) return <LandingPage onLogin={()=>{window.scrollTo(0,0);setAuthInitialView("login");setShowLanding(false);}} onSignup={()=>{window.scrollTo(0,0);setAuthInitialView("create");setShowLanding(false);}} onAdmin={onAdmin}/>;
  if(!isAuth) return <AuthScreenPage onLogin={handleLogin} onSignup={handleSignup} initialView={authInitialView} onAdmin={onAdmin}/>;
  if(isAuth && adminOverride.isSuspended) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-['Barlow',sans-serif]">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-white">Account Suspended</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Your farm account (<strong className="text-white">{userProfile?.email}</strong>) has been temporarily suspended by the platform administrator.
          </p>
          <p className="text-xs text-slate-500">
            Please reach out to the site administrator at <a href="mailto:edafejesugarec@gmail.com" className="text-green-400 hover:underline">edafejesugarec@gmail.com</a> to reactivate your access.
          </p>
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }
  /* currency helpers derived from user's country */
  const cs=userProfile?.currencySymbol??"₦";
  const userCountry=userProfile?.country??"Nigeria";
  const cvt=(n:number)=>convertNGN(n,userCountry);
  return(
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden" style={{fontFamily:"'Barlow',sans-serif"}}>
      <Toaster position="top-right" richColors duration={2500}/>
      {/* ── Database Setup Wizard ── */}
      {showSetup&&(setupSql||setupRunning)&&(
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                {setupRunning?<Loader2 size={20} className="text-green-600 animate-spin"/>:<Database size={20} className="text-green-600"/>}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                  {setupRunning?"Setting up database…":"Database Setup"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {setupRunning?"Creating all required tables, please wait…":"Automatic setup failed — run SQL manually."}
                </p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              {setupRunning?(
                <div className="flex flex-col items-center gap-4 py-6">
                  <Loader2 size={36} className="text-green-500 animate-spin"/>
                  <p className="text-sm text-slate-500 text-center">Creating database tables…<br/><span className="text-xs text-slate-400">This only happens once.</span></p>
                </div>
              ):(
                <>
                  {setupError&&<p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{setupError}</p>}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-1 relative">
                    <pre className="text-[10px] text-slate-600 leading-relaxed overflow-x-auto p-3 max-h-52 overflow-y-auto whitespace-pre-wrap">{setupSql}</pre>
                    <button onClick={()=>{navigator.clipboard.writeText(setupSql);setSqlCopied(true);setTimeout(()=>setSqlCopied(false),2000);}} className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:text-green-600 hover:border-green-300 transition-colors shadow-sm">
                      <Copy size={12}/>{sqlCopied?"Copied!":"Copy SQL"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">Copy the SQL above, paste it into the <a href={`https://supabase.com/dashboard/project/${projectId}/sql/new`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-semibold">Supabase SQL Editor <ExternalLink size={10} className="inline"/></a>, run it, then click Done below.</p>
                </>
              )}
            </div>
            {!setupRunning&&(
              <div className="px-6 pb-5 flex gap-2 border-t border-slate-100 pt-4">
                <button onClick={runAutoSetup} className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:border-green-300 hover:text-green-600 transition-colors font-semibold">Retry Auto-Setup</button>
                <button onClick={()=>{setShowSetup(false);loadFromBackend();}} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"><CheckCircle size={15}/> Done — Tables Created</button>
              </div>
            )}
          </div>
        </div>
      )}
      {sideOpen&&<div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={()=>setSideOpen(false)}/>}
      {/* Desktop sidebar — always in flow, collapsible */}
      <div className={`hidden lg:flex flex-col shrink-0 h-screen overflow-hidden transition-[width] duration-200 ${collapsed?"w-16":"w-64"}`}>
        <Sidebar active={active} onNav={nav} collapsed={collapsed} onToggle={()=>setCollapsed(p=>!p)} farms={accessibleFarms} activeFarmId={activeFarmId} onSwitchFarm={setActiveFarmId} onAddFarm={()=>setShowAddFarm(true)} sideOpen={true} staff={staff} unreadCount={unreadCount} onNotifications={()=>nav("notifications")} onLogout={handleLogout} hasPerm={hasPerm} isOwner={isOwner} userProfile={userProfile} currentStaff={currentStaff}/>
      </div>
      {/* Mobile sidebar — fixed drawer */}
      <div className={`fixed lg:hidden inset-y-0 left-0 z-40 w-64 transition-transform duration-200 ${sideOpen?"translate-x-0":"-translate-x-full"}`}>
        <Sidebar active={active} onNav={nav} collapsed={false} onToggle={()=>setSideOpen(false)} farms={accessibleFarms} activeFarmId={activeFarmId} onSwitchFarm={id=>{setActiveFarmId(id);setSideOpen(false);}} onAddFarm={()=>{setSideOpen(false);setShowAddFarm(true);}} sideOpen={sideOpen} staff={staff} unreadCount={unreadCount} onNotifications={()=>{nav("notifications");setSideOpen(false);}} onLogout={handleLogout} hasPerm={hasPerm} isOwner={isOwner} userProfile={userProfile} currentStaff={currentStaff}/>
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
          <button onClick={()=>setSideOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><Menu size={20} className="text-slate-600"/></button>
          <div className="relative" ref={mFarmRef}>
            <button onClick={()=>setMFarmOpen(p=>!p)} className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg">
              <span className="truncate max-w-[140px]">{farms.find(f=>f.id===activeFarmId)?.name||"Select Farm"}</span><ChevronDown size={11} className={`transition-transform ${mFarmOpen?"rotate-180":""}`}/>
            </button>
            {mFarmOpen&&(
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[200px]">
                {accessibleFarms.map(f=>(
                  <button key={f.id} onClick={()=>{setActiveFarmId(f.id);setMFarmOpen(false);}} className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${f.id===activeFarmId?"bg-green-50":""}`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.id===activeFarmId?"bg-green-500":"bg-slate-200"}`}/>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{f.name}</p>
                      <p className="text-[10px] text-slate-400">{f.city}, {f.state}</p>
                    </div>
                    {f.id===activeFarmId&&<CheckCircle size={12} className="text-green-500 shrink-0"/>}
                  </button>
                ))}
                {isOwner&&<div className="border-t border-slate-100">
                  <button onClick={()=>{setMFarmOpen(false);setShowAddFarm(true);}} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-green-600 font-semibold hover:bg-green-50 transition-colors"><Plus size={12}/> Add New Farm</button>
                </div>}
              </div>
            )}
          </div>
        </div>
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <AppErrorBoundary key={active}>
            {active==="financial"     &&(hasPerm("Financial Dashboard")?<FinancialDashboard expenses={farmExpenses} revenues={farmRevenues} onAddExpense={addExp} onAddRevenue={addRev} onEditExpense={editExp} onEditRevenue={editRev} stockEvents={stockEvents} ponds={farmPonds} inventory={farmInventory} currency={cs} currentUser={{name:userProfile?.name||"",email:userProfile?.email||""}}/>:<AccessDenied/>)}
            {active==="ponds"         &&(hasPerm("Pond Management")?<PondManagementPage ponds={farmPonds} onAddPond={addPond} onClosePond={closePond} onRestockPond={restockPond} onTransfer={transferStock} onNurseryTransfer={nurseryTransfer} mortality={mortality} onAddMortality={addMort} onAddCost={addExp} feedingRecords={farmFeeding} stockEvents={stockEvents} treatments={farmTreatments} onAddTreatment={addTreatment} activeFarmId={activeFarmId} onDeletePond={deletePond} onEditFish={editFish} onSetMaxKg={setPondMaxKg} onEditPond={(id,u)=>setPonds(prev=>prev.map(p=>p.id===id?{...p,...u}:p))} onScrollTop={()=>mainRef.current?.scrollTo({top:0,behavior:"instant"})} currency={cs} inventory={farmInventory}/>:<AccessDenied/>)}
            {active==="inventory"     &&(hasPerm("Feed Stock")?<FeedInventoryPage inventory={farmInventory} onAdd={addInv} onDelete={delInv} feedingRecords={farmFeeding} bagLogs={bagLogs} onEditBagLog={editBagLog} onEditInv={editInv} currency={cs} canEditLocked={isOwner||currentStaff?.role==="Farm Manager"}/>:<AccessDenied/>)}
            {active==="documentation" &&(hasPerm("Feeding Records")?<FeedDocumentationPage feedingRecords={farmFeeding} onAddRecord={addFeed} onEditFeedRecord={editFeedRecord} ponds={farmPonds} inventory={farmInventory} bagLogs={bagLogs} onAddBagLog={addBagLog} onEditBagLog={editBagLog} onEditInv={editInv} remainLogs={remainLogs} onAddRemainLog={addRemainLog} onEditRemainLog={editRemainLog} onReconMismatches={onReconMismatches} reconFocus={reconFocus} canEditLocked={isOwner||currentStaff?.role==="Farm Manager"} currentUser={{name:userProfile?.name||"",email:userProfile?.email||""}}/>:<AccessDenied/>)}
            {active==="invoices"      &&(hasPerm("Invoice")?<InvoicesPage ponds={farmPonds} invoices={farmInvoices} customers={farmCustomers} priceGroups={farmPriceGroups} settings={invSettings} onAddInvoice={addInvoice} onEditInvoice={editInvoice} onAddCustomer={addCustomer} onAddPriceGroup={addPriceGroup} onEditPriceGroup={editPriceGroup} onDeletePriceGroup={delPriceGroup} onUpdateSettings={(s)=>{setInvSettings(s);api.invSettings.update(s).catch(console.warn);}} currentUser={userProfile?.name} currency={cs}/>:<AccessDenied/>)}
            {active==="staff"         &&(isOwner?<StaffPage staff={staff} onAdd={addStaff} onEdit={editStaff} onDelete={delStaff} farms={farms} activeFarmId={activeFarmId}/>:<AccessDenied/>)}
            {active==="reports"       &&(hasPerm("Reports")?<ReportsPage reports={farmReports} staff={staff} onAdd={addReport} onEdit={editReportFn}/>:<AccessDenied/>)}
            {active==="assessments"   &&(hasPerm("Staff Assessment")?<EmployeeAssessmentsPage kQuestions={kQuestions} cQuestions={cQuestions} kResults={kResults} cResults={cResults} onSaveKQuestions={saveKQuestions} onSaveCQuestions={saveCQuestions} onAddKResult={addKResult} onAddCResult={addCResult} ownerId={userProfile?.id??""}/>:<AccessDenied/>)}
            {active==="pricing"       &&(isOwner?<SubscriptionPage farmCount={farms.length} activePlan={activePlan} setActivePlan={setActivePlan} trialStartDate={trialStartDate} setTrialStartDate={setTrialStartDate} currency={cs} convertPrice={cvt} userProfile={userProfile} activeFarmName={farms.find(f=>f.id===activeFarmId)?.name||userProfile?.farmName}/>:<AccessDenied/>)}
            {active==="settings"      &&<SettingsPage farms={isOwner?farms:accessibleFarms} onAddFarm={handleAddFarmDirect} onEditFarm={handleEditFarm} onDeleteFarm={handleDeleteFarm} userProfile={userProfile} onUpdateProfile={handleUpdateProfile} isOwner={isOwner} ponds={ponds} activePlan={activePlan}/>}
            {active==="notifications" &&<NotificationsPage notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} farms={farms} activeFarmId={activeFarmId} farmCount={farms.length} onNotifNav={(n)=>{if(n.type==="reconciliation"&&n.reconDate&&n.reconKey){nav("documentation");setReconFocus({date:n.reconDate,key:n.reconKey});}}}/>}
          </AppErrorBoundary>
        </main>
      </div>
      {/* Add Farm Modal */}
      {showAddFarm&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&setShowAddFarm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div><h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Add New Farm</h2><p className="text-xs text-slate-400 mt-0.5">Uses your existing account credentials</p></div>
              <button onClick={()=>setShowAddFarm(false)} className="text-slate-400 hover:text-slate-700 p-1"><X size={18}/></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <F label="Farm Name"><input value={addFarmF.name} onChange={e=>setAddFarmF(p=>({...p,name:e.target.value}))} className={IC} placeholder="e.g. Green Valley Fish Farm"/></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="City"><input value={addFarmF.city} onChange={e=>setAddFarmF(p=>({...p,city:e.target.value}))} className={IC} placeholder="Lagos"/></F>
                <F label="State"><input value={addFarmF.state} onChange={e=>setAddFarmF(p=>({...p,state:e.target.value}))} className={IC} placeholder="Lagos State"/></F>
              </div>
              <F label="Country"><input value={addFarmF.country} onChange={e=>setAddFarmF(p=>({...p,country:e.target.value}))} className={IC} placeholder="Nigeria"/></F>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                <p className="font-semibold mb-0.5">Same account credentials</p>
                <p>This farm will be linked to your existing login, phone number, and email address.</p>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <PBtn onClick={handleAddFarm}><Plus size={14}/> Create Farm</PBtn>
              <button onClick={()=>setShowAddFarm(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showUpgradeModal&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&setShowUpgradeModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Upgrade Required</h2>
              <button onClick={()=>setShowUpgradeModal(false)} className="text-slate-400 hover:text-slate-700 p-1"><X size={18}/></button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600">{upgradeModalMsg}</p>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <PBtn onClick={()=>{setShowUpgradeModal(false);nav("pricing");}}>Upgrade Plan</PBtn>
              <button onClick={()=>setShowUpgradeModal(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
