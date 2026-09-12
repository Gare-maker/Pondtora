import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, X, CheckCircle, Filter, Tag, Eye, FileText, AlertCircle, Download, Search, Pencil, Trash2, TrendingDown, Layers, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp } from "lucide-react";
import type { Pond, Invoice, InvoiceLineItem, Customer, PriceGroup, InvSettings, SortDir, WItem } from "../types";
import { fmt, uid, TODAY, PAYMENT_METHODS, INV_STATUSES } from "../data";
import { Card, Bdg, PBtn, Pagination, StatCard, Modal, F, IC, SC, SearchableSelect, SelDrop, DateFilter, DMONTHS_S, SH, PER_PAGE } from "../shared";

export default function InvoicesPage({ponds,invoices,customers,priceGroups,settings,onAddInvoice,onEditInvoice,onDeleteInvoice,onAddCustomer,onAddPriceGroup,onEditPriceGroup,onDeletePriceGroup,onUpdateSettings,currentUser,currency="₦"}:{ponds:Pond[];invoices:Invoice[];customers:Customer[];priceGroups:PriceGroup[];settings:InvSettings;onAddInvoice:(i:Invoice)=>void;onEditInvoice:(i:Invoice)=>void;onDeleteInvoice?:(id:string)=>void;onAddCustomer:(c:Customer)=>void;onAddPriceGroup:(g:PriceGroup)=>void;onEditPriceGroup:(g:PriceGroup)=>void;onDeletePriceGroup:(id:string)=>void;onUpdateSettings:(s:InvSettings)=>void;currentUser?:string;currency?:string;}){
  const cs=currency;
  /* ── filter / sort state ── */
  const [search,setSearch]=useState(""); const [fPond,setFPond]=useState("All"); const [fStatus,setFStatus]=useState("All"); const [fMethod,setFMethod]=useState("All"); const [sortDir,setSortDir]=useState<SortDir>("desc");
  const invYears=[...new Set(invoices.map(i=>i.invoiceDate.slice(0,4)))].sort((a,b)=>b.localeCompare(a));
  const [fYear,setFYear]=useState("All"); const [fMonth,setFMonth]=useState("All"); const [fDay,setFDay]=useState("All");

  const [invMenuOpen,setInvMenuOpen]=useState(false);
  const [invPage,setInvPage]=useState(1);
  const invMenuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(invMenuRef.current&&!invMenuRef.current.contains(e.target as Node))setInvMenuOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  /* ── modal state ── */
  const [viewInv,setViewInv]=useState<Invoice|null>(null);
  const [editPayment,setEditPayment]=useState<Invoice|null>(null);
  const [deleteInvId,setDeleteInvId]=useState<string|null>(null);
  const [showGroupsPanel,setShowGroupsPanel]=useState(false); const [groupFormMode,setGroupFormMode]=useState(false); const [editGroup,setEditGroup]=useState<PriceGroup|null>(null);
  const [groupF,setGroupF]=useState({group:"",displayName:"",description:"",pricePerKg:"",status:"Active" as "Active"|"Inactive"});
  const [groupErr,setGroupErr]=useState<Record<string,string>>({});
  const [invErr,setInvErr]=useState<Record<string,string>>({});
  const [showSettings,setShowSettings]=useState(false); const [settingsF,setSettingsF]=useState({...settings});
  const [showCreate,setShowCreate]=useState(false); const [step,setStep]=useState<1|2|3>(1);
  const [wPond,setWPond]=useState(""); const [wNewCust,setWNewCust]=useState(false); const [wCust,setWCust]=useState<Customer|null>(null);
  const [custF,setCustF]=useState({name:"",phone:"",email:"",businessName:"",address:""});
  /* ── wizard line items ── */
  const [wItems,setWItems]=useState<WItem[]>([{id:uid(),groupId:"",qty:"",discount:""}]);
  const [wDiscountType,setWDiscountType]=useState<"general"|"individual">("general");
  const [wGeneralDiscPerKg,setWGeneralDiscPerKg]=useState(""); const [wAdditional,setWAdditional]=useState("");
  const [wNotes,setWNotes]=useState(settings.defaultNotes); const [wDate,setWDate]=useState(TODAY); const [wDue,setWDue]=useState(""); const [wMethod,setWMethod]=useState("Cash");
  const [payAmt,setPayAmt]=useState(""); const [payMethod,setPayMethod]=useState("Cash"); const [payDate,setPayDate]=useState(TODAY);
  const [custSuggestions,setCustSuggestions]=useState<Customer[]>([]);

  const pondObj=ponds.find(p=>p.name===wPond);
  const activePriceGroups=priceGroups.filter(g=>g.status==="Active");

  /* ── computed line items ── */
  const computedItems:InvoiceLineItem[]=wItems.map(wi=>{
    const g=priceGroups.find(pg=>pg.id===wi.groupId);
    const qty=Number(wi.qty)||0; const ppkg=g?.pricePerKg??0;
    const discPerKg=wDiscountType==="individual"?Number(wi.discount)||0:Number(wGeneralDiscPerKg)||0;
    const rowDiscount=qty*discPerKg;
    const lineTotal=Math.max(0,qty*ppkg-rowDiscount);
    return{id:wi.id,groupId:wi.groupId,groupLabel:g?`${g.group} – ${g.displayName}`:"",displayName:g?.displayName||"",qtyKg:qty,pricePerKg:ppkg,discount:rowDiscount,lineTotal};
  });
  const wSubtotal=computedItems.reduce((s,it)=>s+it.qtyKg*it.pricePerKg,0);
  const wTotalDiscount=computedItems.reduce((s,it)=>s+it.discount,0);
  const wAdditionalN=Number(wAdditional)||0;
  const wGrandTotal=Math.max(0,wSubtotal-wTotalDiscount+wAdditionalN);
  const wTotalWeight=computedItems.reduce((s,it)=>s+it.qtyKg,0);

  const nextInvNum=()=>{const n=invoices.length+1;return`${settings.invoicePrefix}-${String(n).padStart(6,"0")}`;};

  const addWItem=()=>setWItems(p=>[...p,{id:uid(),groupId:"",qty:"",discount:""}]);
  const removeWItem=(id:string)=>setWItems(p=>p.filter(x=>x.id!==id));
  const updateWItem=(id:string,field:keyof WItem,val:string)=>setWItems(p=>p.map(x=>x.id===id?{...x,[field]:val}:x));

  const resetWizard=()=>{setStep(1);setWPond("");setWCust(null);setWNewCust(false);setCustF({name:"",phone:"",email:"",businessName:"",address:""});setWItems([{id:uid(),groupId:"",qty:"",discount:""}]);setWDiscountType("general");setWGeneralDiscPerKg("");setWAdditional("");setWNotes(settings.defaultNotes);setWDate(TODAY);setWDue("");setWMethod("Cash");};

  const handleCreateInvoice=()=>{
    const customer:Customer=wNewCust?{id:uid(),...custF}:wCust!;
    const errs:Record<string,string>={};
    if(!customer||!customer.name)errs.customer="Customer name is required";
    if(wNewCust&&!custF.name.trim())errs.custName="Please enter the customer name";
    const finalItems=computedItems.filter(it=>it.qtyKg>0&&it.groupId);
    if(finalItems.length===0)errs.items="Please add at least one line item with a quantity";
    if(Object.keys(errs).length){setInvErr(errs);return;}
    setInvErr({});
    if(wNewCust&&custF.name&&!customers.find(c=>c.name.toLowerCase()===custF.name.toLowerCase()))onAddCustomer(customer);
    const newInvoice:Invoice={id:uid(),invNumber:nextInvNum(),customer,pond:wPond,species:pondObj?.species||"",items:finalItems,discountType:wDiscountType,subtotal:wSubtotal,discount:wTotalDiscount,additionalCharges:wAdditionalN,grandTotal:wGrandTotal,amountPaid:0,outstanding:wGrandTotal,status:"Pending",paymentMethod:wMethod,invoiceDate:wDate,dueDate:wDue,notes:wNotes,issuedBy:currentUser||"Admin"};
    onAddInvoice(newInvoice);
    setShowCreate(false);
    resetWizard();
    setViewInv(newInvoice);
  };

  const markInvoiceAsPaid=(inv:Invoice)=>{
    onEditInvoice({
      ...inv,
      amountPaid:inv.grandTotal,
      outstanding:0,
      status:"Paid",
      paymentMethod:inv.paymentMethod||"Cash"
    });
  };

  const openPaymentModal=(inv:Invoice)=>{
    setEditPayment(inv);
    setPayAmt(String(inv.outstanding>0?inv.outstanding:inv.grandTotal));
    setPayMethod(inv.paymentMethod||"Cash");
    setPayDate(TODAY);
  };

  const handleUpdatePayment=()=>{
    if(!editPayment)return;
    const paid=Number(payAmt)||0; const totalPaid=editPayment.amountPaid+paid; const outstanding=Math.max(0,editPayment.grandTotal-totalPaid);
    const status:Invoice["status"]=outstanding===0?"Paid":totalPaid>0?"Partially Paid":"Pending";
    onEditInvoice({...editPayment,amountPaid:totalPaid,outstanding,status,paymentMethod:payMethod});
    setEditPayment(null);setPayAmt("");
  };

  const handleSaveGroup=()=>{
    const errs:Record<string,string>={};
    if(!groupF.group.trim())errs.group="Group code is required";
    if(!groupF.displayName.trim())errs.displayName="Display name is required";
    if(!groupF.pricePerKg||Number(groupF.pricePerKg)<=0)errs.pricePerKg="Price per kg is required";
    if(Object.keys(errs).length){setGroupErr(errs);return;}
    setGroupErr({});
    if(editGroup)onEditPriceGroup({...editGroup,...groupF,pricePerKg:Number(groupF.pricePerKg)});
    else onAddPriceGroup({id:uid(),...groupF,pricePerKg:Number(groupF.pricePerKg)});
    setGroupF({group:"",displayName:"",description:"",pricePerKg:"",status:"Active"});setGroupFormMode(false);setEditGroup(null);
  };

  const buildInvoiceHTML=(inv:Invoice):string=>{
    const totalWt=(inv.items||[]).reduce((s,it)=>s+it.qtyKg,0);
    const itemRows=(inv.items||[]).map(it=>`<div style="margin:5px 0"><div style="font-weight:700;font-size:11px">${it.groupLabel||it.displayName}</div><div style="font-size:10px;color:#555;margin-top:1px">${it.qtyKg}kg × ${fmt(it.pricePerKg)}/kg</div>${it.discount>0?`<div style="font-size:10px;color:#c00;margin-top:1px">Discount: −${fmt(it.discount)}</div>`:""}<div style="font-size:12px;font-weight:700;text-align:right;margin-top:2px">${fmt(it.lineTotal)}</div></div><div style="border-top:1px dotted #ccc;margin:3px 0"></div>`).join("");
    return`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.invNumber}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Courier New',Courier,monospace;width:280px;margin:0 auto;padding:10px 8px;font-size:11px;color:#111;background:#fff}.r{display:flex;justify-content:space-between;margin:2px 0;font-size:10px}.lbl{color:#666}.b{font-weight:700}.hdr{font-size:8px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}.grand{display:flex;justify-content:space-between;font-size:15px;font-weight:900;border-top:2px solid #111;border-bottom:2px solid #111;padding:5px 0;margin:5px 0}.bal{display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#c00;margin-top:3px}.ft{font-size:8px;text-align:center;color:#777;margin-top:3px}@page{size:80mm auto;margin:3mm 2mm}</style></head><body><div style="font-size:14px;font-weight:900;text-align:center;letter-spacing:.5px;text-transform:uppercase">${settings.farmName}</div>${settings.farmAddress?`<div style="font-size:9px;color:#555;text-align:center;margin-top:2px">${settings.farmAddress}</div>`:""}${settings.farmPhone?`<div style="font-size:9px;color:#555;text-align:center">${settings.farmPhone}${settings.farmEmail?" | "+settings.farmEmail:""}</div>`:""}<hr style="border:none;border-top:2px solid #111;margin:6px 0"><div style="text-align:center;font-weight:700;font-size:13px;letter-spacing:2px">INVOICE</div><hr style="border:none;border-top:1px dashed #999;margin:6px 0"><div class="r"><span class="lbl">Invoice No:</span><span class="b">${inv.invNumber}</span></div><div class="r"><span class="lbl">Date:</span><span>${inv.invoiceDate}</span></div>${inv.dueDate?`<div class="r"><span class="lbl">Due Date:</span><span>${inv.dueDate}</span></div>`:""}<div class="r"><span class="lbl">Payment:</span><span>${inv.paymentMethod}</span></div><div class="r"><span class="lbl">Status:</span><span class="b">${inv.status}</span></div>${inv.pond?`<div class="r"><span class="lbl">Pond:</span><span>${inv.pond}</span></div>`:""}${inv.species?`<div class="r"><span class="lbl">Species:</span><span>${inv.species}</span></div>`:""}<hr style="border:none;border-top:1px dashed #999;margin:6px 0"><div class="hdr">Customer</div><div style="font-size:12px;font-weight:700">${inv.customer.name}</div>${inv.customer.businessName?`<div style="font-size:9px">${inv.customer.businessName}</div>`:""}<div style="font-size:9px;color:#555">${inv.customer.phone||""}</div>${inv.customer.address?`<div style="font-size:9px;color:#555">${inv.customer.address}</div>`:""}<hr style="border:none;border-top:1px dashed #999;margin:6px 0"><div class="hdr">Items</div>${itemRows}<hr style="border:none;border-top:2px solid #111;margin:6px 0"><div class="r"><span class="lbl">Fish Groups:</span><span>${(inv.items||[]).length}</span></div><div class="r"><span class="lbl">Total Weight:</span><span>${totalWt} kg</span></div><div class="r"><span class="lbl">Subtotal:</span><span>${fmt(inv.subtotal)}</span></div>${inv.discount>0?`<div class="r"><span class="lbl">Discount:</span><span style="color:#c00">−${fmt(inv.discount)}</span></div>`:""}${inv.additionalCharges>0?`<div class="r"><span class="lbl">Add. Charges:</span><span>+${fmt(inv.additionalCharges)}</span></div>`:""}<div class="grand"><span>TOTAL</span><span>${fmt(inv.grandTotal)}</span></div>${inv.amountPaid>0?`<div class="r"><span class="lbl">Amount Paid:</span><span style="color:#16a34a">${fmt(inv.amountPaid)}</span></div>`:""}${inv.outstanding>0?`<div class="bal"><span>Balance Due:</span><span>${fmt(inv.outstanding)}</span></div>`:""}${inv.notes||settings.bankDetails?`<hr style="border:none;border-top:1px dashed #999;margin:6px 0">`:""}${inv.notes?`<div style="font-size:9px;color:#444;margin-bottom:3px">${inv.notes}</div>`:""}${settings.bankDetails?`<div style="font-size:9px">${settings.bankDetails}</div>`:""}<hr style="border:none;border-top:1px dashed #999;margin:6px 0"><div class="ft">*** Thank you for your business! ***</div>${settings.footerMessage?`<div class="ft">${settings.footerMessage}</div>`:""}</body></html>`;
  };

  const printInvoice=(inv:Invoice)=>{
    const html=buildInvoiceHTML(inv);
    const iframe=document.createElement("iframe");
    Object.assign(iframe.style,{position:"fixed",left:"-9999px",top:"-9999px",width:"1px",height:"1px",border:"none",visibility:"hidden"});
    document.body.appendChild(iframe);
    const doc=iframe.contentWindow!.document;
    doc.open();doc.write(html);doc.close();
    const doPrint=()=>{try{iframe.contentWindow?.print();}catch(e){console.error(e);}setTimeout(()=>{if(document.body.contains(iframe))document.body.removeChild(iframe);},3000);};
    if(iframe.contentDocument?.readyState==="complete"){doPrint();}else{iframe.onload=doPrint;setTimeout(doPrint,800);}
  };

  const downloadInvoice=(inv:Invoice)=>{
    const html=buildInvoiceHTML(inv);
    const blob=new Blob([html],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`${inv.invNumber}.html`;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  };

  /* ── filtered stats source (year + month + day) ── */
  const statsSource=useMemo(()=>invoices.filter(inv=>{
    if(inv.status==="Error")return false;
    if(fYear!=="All"&&!inv.invoiceDate.startsWith(fYear))return false;
    if(fMonth!=="All"){const mi=DMONTHS_S.indexOf(fMonth);const m=inv.invoiceDate.slice(5,7);if(mi<0||m!==String(mi+1).padStart(2,"0"))return false;}
    if(fDay!=="All"&&inv.invoiceDate.slice(8,10)!==fDay)return false;
    return true;
  }),[invoices,fYear,fMonth,fDay]);

  /* Table source includes Error invoices (for audit/history); statsSource excludes them for revenue calculations */
  const tableSource=useMemo(()=>invoices.filter(inv=>{
    if(fYear!=="All"&&!inv.invoiceDate.startsWith(fYear))return false;
    if(fMonth!=="All"){const mi=DMONTHS_S.indexOf(fMonth);const m=inv.invoiceDate.slice(5,7);if(mi<0||m!==String(mi+1).padStart(2,"0"))return false;}
    if(fDay!=="All"&&inv.invoiceDate.slice(8,10)!==fDay)return false;
    return true;
  }),[invoices,fYear,fMonth,fDay]);
  const filtInvoices=tableSource.filter(inv=>{
    if(search&&!inv.invNumber.toLowerCase().includes(search.toLowerCase())&&!inv.customer.name.toLowerCase().includes(search.toLowerCase()))return false;
    if(fPond!=="All"&&inv.pond!==fPond)return false;
    if(fStatus!=="All"&&inv.status!==fStatus)return false;
    if(fMethod!=="All"&&inv.paymentMethod!==fMethod)return false;
    return true;
  }).sort((a,b)=>sortDir==="desc"?b.invoiceDate.localeCompare(a.invoiceDate):a.invoiceDate.localeCompare(b.invoiceDate));

  const totalRevInvoiced=statsSource.reduce((s,i)=>s+i.grandTotal,0);
  const paidInv=statsSource.filter(i=>i.status==="Paid").length;
  const pendingInv=statsSource.filter(i=>i.status==="Pending"||i.status==="Sent").length;
  const partialInv=statsSource.filter(i=>i.status==="Partially Paid").length;
  const overdueInv=statsSource.filter(i=>i.status==="Overdue").length;
  const totalOutstanding=statsSource.reduce((s,i)=>s+i.outstanding,0);

  const badgeCol=(s:Invoice["status"])=>s==="Paid"?"green":s==="Overdue"||s==="Error"?"red":s==="Partially Paid"?"amber":s==="Cancelled"?"gray":"blue";

  const groupsSummary=(inv:Invoice)=>{
    const groups=(inv.items||[]).map(it=>it.groupLabel.split(" – ")[0]).filter(Boolean);
    if(groups.length===0)return"—";
    if(groups.length<=2)return groups.join(", ");
    return`${groups[0]}, ${groups[1]} +${groups.length-2} more`;
  };
  const totalWeight=(inv:Invoice)=>(inv.items||[]).reduce((s,it)=>s+it.qtyKg,0);

  return(
    <div className="p-4 sm:p-6 space-y-5 max-w-[1300px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Invoices</h1><p className="text-xs text-slate-400 mt-1 mb-2 sm:mb-0">Manage customer invoices, configure pricing groups, generate professional invoices, and track payment status.</p></div>
        <div className="flex flex-wrap gap-2">
          <PBtn sm outline onClick={()=>{setSettingsF({...settings});setShowSettings(true);}}><Filter size={13}/> Invoice Settings</PBtn>
          <PBtn sm outline onClick={()=>{setShowGroupsPanel(true);setGroupFormMode(false);setEditGroup(null);}}><Tag size={13}/> Price Groups</PBtn>
          <PBtn sm onClick={()=>{setShowCreate(true);resetWizard();}}><Plus size={13}/> Create Invoice</PBtn>
        </div>
      </div>

      {/* ── Date filter ── */}
      <DateFilter year={fYear} month={fMonth} day={fDay} onYear={v=>{setFYear(v);if(v==="All"){setFMonth("All");setFDay("All");}}} onMonth={setFMonth} onDay={setFDay} onReset={()=>{setFYear("All");setFMonth("All");setFDay("All");}} dates={invoices.map(i=>i.invoiceDate)}/>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Invoices"    value={String(statsSource.length)} icon={FileText}/>
        <StatCard label="Revenue Invoiced"  value={fmt(totalRevInvoiced)} icon={ArrowUpRight} hi/>
        <StatCard label="Paid"              value={String(paidInv)} icon={CheckCircle}/>
        <StatCard label="Outstanding"       value={fmt(totalOutstanding)} icon={TrendingDown}/>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending / Sent"    value={String(pendingInv)} icon={Filter}/>
        <StatCard label="Partially Paid"    value={String(partialInv)} icon={Layers}/>
        <StatCard label="Overdue"           value={String(overdueInv)} icon={ArrowDownRight}/>
        <StatCard label="Marked as Error"    value={String(invoices.filter(i=>i.status==="Error").length)} icon={AlertCircle}/>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoice # or customer…" className={`${IC} pl-8`}/></div>
          <div className="flex items-center gap-1.5"><span className="text-xs text-slate-400">Pond:</span><select value={fPond} onChange={e=>setFPond(e.target.value)} className={`${SC} py-1.5 text-xs w-auto`}><option>All</option>{ponds.map(p=><option key={p.id}>{p.name}</option>)}</select></div>
          <div className="flex items-center gap-1.5"><span className="text-xs text-slate-400">Status:</span><select value={fStatus} onChange={e=>setFStatus(e.target.value)} className={`${SC} py-1.5 text-xs w-auto`}><option>All</option>{INV_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="flex items-center gap-1.5"><span className="text-xs text-slate-400">Method:</span><select value={fMethod} onChange={e=>setFMethod(e.target.value)} className={`${SC} py-1.5 text-xs w-auto`}><option>All</option>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
          <div className="flex items-center gap-1.5"><span className="text-xs text-slate-400">Sort:</span><select value={sortDir} onChange={e=>setSortDir(e.target.value as SortDir)} className={`${SC} py-1.5 text-xs w-auto`}><option value="desc">Newest</option><option value="asc">Oldest</option></select></div>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">All Invoices</p>
          <p className="text-[11px] text-slate-400">{filtInvoices.length} invoice{filtInvoices.length!==1?"s":""}</p>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[900px]">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 text-[11px] text-slate-400 w-10 sticky left-0 z-20 bg-slate-50">#</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider sticky left-10 z-20 bg-slate-50 border-r border-slate-200 whitespace-nowrap">Invoice #</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Pond</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider whitespace-nowrap">Fish Groups</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider whitespace-nowrap">Total Wt.</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Grand Total</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {filtInvoices.length===0&&<tr><td colSpan={10} className="text-center text-xs text-slate-400 py-12">{invoices.length===0?"No invoices yet — click Create Invoice to generate your first":"No invoices match your filters"}</td></tr>}
            {filtInvoices.slice((invPage-1)*PER_PAGE,invPage*PER_PAGE).map((inv,i)=>(
              <tr key={inv.id} className={`transition-colors ${inv.status==="Error"?"bg-red-50 hover:bg-red-100":"hover:bg-slate-50"}`}>
                <td className="px-4 py-3.5 text-slate-300 text-xs font-mono sticky left-0 z-10 bg-white">{i+1}</td>
                <td className="px-4 py-3.5 font-mono text-sm font-bold text-green-700 sticky left-10 z-10 bg-white border-r border-slate-100 cursor-pointer hover:text-green-500 underline-offset-2 hover:underline" onClick={()=>setViewInv(inv)}>{inv.invNumber}</td>
                <td className="px-4 py-3.5"><p className="font-semibold text-slate-900">{inv.customer.name}</p>{inv.customer.businessName&&<p className="text-[11px] text-slate-400">{inv.customer.businessName}</p>}</td>
                <td className="px-4 py-3.5 text-slate-600 text-xs">{inv.pond||"—"}</td>
                <td className="px-4 py-3.5 text-slate-600 text-xs font-medium">{groupsSummary(inv)}</td>
                <td className="px-4 py-3.5 text-slate-600 text-xs font-semibold">{totalWeight(inv)>0?`${totalWeight(inv)} kg`:"—"}</td>
                <td className="px-4 py-3.5 font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{fmt(inv.grandTotal)}</td>
                <td className="px-4 py-3.5"><Bdg label={inv.status} color={badgeCol(inv.status)}/></td>
                <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-xs">{inv.invoiceDate}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button onClick={()=>setViewInv(inv)} title="View" className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"><Eye size={13}/></button>
                    <button onClick={()=>printInvoice(inv)} title="Print" className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"><FileText size={13}/></button>
                    {inv.status!=="Paid"&&inv.status!=="Error"&&(
                      <button onClick={()=>markInvoiceAsPaid(inv)} title="Mark as Paid in Full" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 transition-colors border border-green-200 shadow-xs">
                        <CheckCircle size={12}/> Mark Paid
                      </button>
                    )}
                    {inv.status!=="Error"&&<button onClick={()=>openPaymentModal(inv)} title="Update Custom Payment" className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"><Layers size={13}/></button>}
                    {inv.status!=="Error"&&<button onClick={()=>onEditInvoice({...inv,status:"Error"})} title="Mark as Error" className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"><AlertCircle size={13}/></button>}
                    {onDeleteInvoice&&<button onClick={()=>setDeleteInvId(inv.id)} title="Delete Invoice" className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13}/></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Card>
      <Pagination total={filtInvoices.length} page={invPage} perPage={PER_PAGE} onPage={setInvPage}/>

      {/* ── Create Invoice Wizard ── */}
      {showCreate&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&(setShowCreate(false),resetWizard())}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 shrink-0">
              <div><h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Create Invoice</h2><p className="text-xs text-slate-400 mt-0.5">Step {step} of 3 — {step===1?"Select Pond":step===2?"Customer Details":"Sale Details"}</p></div>
              <button onClick={()=>{setShowCreate(false);resetWizard();}} className="text-slate-400 hover:text-slate-700 p-1 shrink-0"><X size={18}/></button>
            </div>
            <div className="px-4 sm:px-6 pt-3 sm:pt-4 shrink-0"><div className="flex gap-2">{[1,2,3].map(s=><div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s<=step?"bg-green-500":"bg-slate-200"}`}/>)}</div></div>
            <div className="px-4 sm:px-6 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              {step===1&&(<>
                <F label="Select Pond"><SelDrop value={wPond} onChange={v=>setWPond(v)} options={[{value:"",label:"Choose a pond…"},...ponds.map(p=>({value:p.name,label:`${p.name} — ${p.species} (${p.status})`}))]} placeholder="Choose a pond…"/></F>
                {wPond&&pondObj&&<div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700"><strong>{wPond}</strong> · {pondObj.species} · {pondObj.currentCount.toLocaleString()} fish</div>}
              </>)}
              {step===2&&(<>
                <div className="flex gap-2 mb-1">
                  <button onClick={()=>setWNewCust(false)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${!wNewCust?"border-green-400 bg-green-50 text-green-700":"border-slate-200 text-slate-500"}`}>Existing Customer</button>
                  <button onClick={()=>setWNewCust(true)} className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${wNewCust?"border-green-400 bg-green-50 text-green-700":"border-slate-200 text-slate-500"}`}>New Customer</button>
                </div>
                {!wNewCust?(<>
                  <F label="Select Customer"><SelDrop value={wCust?.id||""} onChange={v=>{setWCust(customers.find(x=>x.id===v)||null);if(v)setInvErr(p=>({...p,customer:""}));}} options={[{value:"",label:"Choose customer…"},...customers.map(c=>({value:c.id,label:`${c.name}${c.businessName?` — ${c.businessName}`:""}`}))]} placeholder="Choose customer…"/></F>
                  {invErr.customer&&<p className="text-xs text-red-500 mt-1">{invErr.customer}</p>}
                  {wCust&&<div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700"><p className="font-semibold">{wCust.name}</p>{wCust.businessName&&<p>{wCust.businessName}</p>}<p>{wCust.phone}</p></div>}
                  {customers.length===0&&<p className="text-xs text-slate-400 text-center py-2">No customers yet — switch to New Customer to add one.</p>}
                </>):(<>
                  <F label="Customer Name *">
                    <div className="relative">
                      <input value={custF.name} onChange={e=>{const v=e.target.value;setCustF(p=>({...p,name:v}));setCustSuggestions(v.length>0?customers.filter(c=>c.name.toLowerCase().includes(v.toLowerCase())).slice(0,5):[]);if(v.trim())setInvErr(p=>({...p,custName:""}));}} onBlur={()=>setTimeout(()=>setCustSuggestions([]),150)} className={`${IC}${invErr.custName?" border-red-400":""}`} placeholder="Full name"/>
                      {custSuggestions.length>0&&<div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">{custSuggestions.map(c=><button key={c.id} type="button" onMouseDown={()=>{setCustF({name:c.name,phone:c.phone||"",email:c.email||"",businessName:c.businessName||"",address:c.address||""});setCustSuggestions([]);}} className="w-full text-left px-4 py-2.5 text-xs hover:bg-green-50 border-b border-slate-100 last:border-0"><p className="font-semibold text-slate-900">{c.name}</p>{c.businessName&&<p className="text-slate-400">{c.businessName}</p>}</button>)}</div>}
                    </div>
                  </F>
                  {invErr.custName&&<p className="text-xs text-red-500 -mt-1">{invErr.custName}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Phone"><input value={custF.phone} onChange={e=>setCustF(p=>({...p,phone:e.target.value}))} className={IC} placeholder="+234…"/></F>
                    <F label="Email (Optional)"><input type="email" value={custF.email} onChange={e=>setCustF(p=>({...p,email:e.target.value}))} className={IC} placeholder="email…"/></F>
                  </div>
                  <F label="Business Name (Optional)"><input value={custF.businessName} onChange={e=>setCustF(p=>({...p,businessName:e.target.value}))} className={IC} placeholder="Company or business"/></F>
                  <F label="Delivery Address (Optional)"><input value={custF.address} onChange={e=>setCustF(p=>({...p,address:e.target.value}))} className={IC} placeholder="Address"/></F>
                </>)}
              </>)}
              {step===3&&(<>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Invoice Number"><input readOnly value={nextInvNum()} className={`${IC} bg-slate-50 cursor-default`}/></F>
                  <F label="Invoice Date"><input type="date" value={wDate} onChange={e=>setWDate(e.target.value)} className={`${IC} cursor-pointer`} style={{colorScheme:"light"}}/></F>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Due Date"><input type="date" value={wDue} onChange={e=>setWDue(e.target.value)} className={`${IC} cursor-pointer`} style={{colorScheme:"light"}}/></F>
                  <F label="Payment Method"><SearchableSelect value={wMethod} onChange={setWMethod} options={PAYMENT_METHODS}/></F>
                </div>

                {/* ── Discount type toggle ── */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Discount Mode</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={()=>setWDiscountType("general")} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${wDiscountType==="general"?"border-green-500 bg-green-50 text-green-700":"border-slate-200 text-slate-500 hover:border-green-300"}`}>General Discount ({cs}/kg)</button>
                    <button type="button" onClick={()=>setWDiscountType("individual")} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${wDiscountType==="individual"?"border-green-500 bg-green-50 text-green-700":"border-slate-200 text-slate-500 hover:border-green-300"}`}>Individual ({cs}/kg per group)</button>
                  </div>
                  {wDiscountType==="general"&&(
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-2">
                      <p className="text-xs font-bold text-green-800">Discount Rate</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={wGeneralDiscPerKg}
                          onChange={e=>setWGeneralDiscPerKg(e.target.value)}
                          className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-green-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 font-semibold"
                          placeholder="0.00"
                        />
                        <span className="text-sm font-bold text-green-700 shrink-0">{cs}/kg</span>
                      </div>
                      {Number(wGeneralDiscPerKg)>0&&wTotalWeight>0&&(
                        <p className="text-[11px] text-green-600">Total discount: –{fmt(wTotalDiscount)}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Line items table ── */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Fish Groups</label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className={`w-full text-xs ${wDiscountType==="individual"?"min-w-[600px]":"min-w-[480px]"}`}>
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-slate-500 sticky left-0 z-10 bg-slate-50 whitespace-nowrap border-r border-slate-200 min-w-[130px]">Group</th>
                            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[100px]">Display Name</th>
                            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[80px]">Qty (kg)</th>
                            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[90px]">Price/kg</th>
                            {wDiscountType==="individual"&&<th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[90px]">Disc. {cs}/kg</th>}
                            <th className="text-left px-3 py-2 font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[80px]">Total</th>
                            <th className="px-2 py-2 min-w-[28px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {wItems.map((wi)=>{
                            const g=priceGroups.find(pg=>pg.id===wi.groupId);
                            const qty=Number(wi.qty)||0; const ppkg=g?.pricePerKg??0;
                            const discPerKg=wDiscountType==="individual"?Number(wi.discount)||0:Number(wGeneralDiscPerKg)||0;
                            const lt=Math.max(0,qty*ppkg-qty*discPerKg);
                            return(
                              <tr key={wi.id} className="border-t border-slate-100">
                                <td className="px-2 py-2 sticky left-0 z-10 bg-white border-r border-slate-100">
                                  <select value={wi.groupId} onChange={e=>updateWItem(wi.id,"groupId",e.target.value)} className={`${SC} text-xs py-1.5`}><option value="">Group…</option>{activePriceGroups.map(g=><option key={g.id} value={g.id}>{g.group} – {g.displayName}</option>)}</select>
                                </td>
                                <td className="px-3 py-2 text-slate-500">{g?.displayName||"—"}</td>
                                <td className="px-2 py-2"><input type="number" min="0" step="0.1" value={wi.qty} onChange={e=>updateWItem(wi.id,"qty",e.target.value)} className={`${IC} text-xs py-1.5`} placeholder="0"/></td>
                                <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{ppkg>0?fmt(ppkg)+"/kg":"—"}</td>
                                {wDiscountType==="individual"&&<td className="px-2 py-2"><input type="number" min="0" step="0.01" value={wi.discount} onChange={e=>updateWItem(wi.id,"discount",e.target.value)} className={`${IC} text-xs py-1.5`} placeholder={`${cs}/kg`}/></td>}
                                <td className={`px-3 py-2 font-bold font-['Barlow_Condensed',sans-serif] whitespace-nowrap ${lt>0?"text-green-700":"text-slate-300"}`}>{lt>0?fmt(lt):"—"}</td>
                                <td className="px-2 py-2"><button type="button" onClick={()=>wItems.length>1?removeWItem(wi.id):undefined} className={`p-1 rounded-lg transition-colors ${wItems.length>1?"text-slate-300 hover:text-red-500 hover:bg-red-50":"text-slate-100 cursor-default"}`}><X size={12}/></button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-3 py-2 border-t border-slate-100">
                      <button type="button" onClick={addWItem} className="flex items-center gap-1.5 text-xs text-green-600 font-semibold hover:text-green-800 transition-colors"><Plus size={12}/> Add Fish Group</button>
                    </div>
                  </div>
                </div>
                {invErr.items&&<p className="text-xs text-red-500">{invErr.items}</p>}

                {/* ── Summary ── */}
                {wSubtotal>0&&(
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400"><span>Fish Groups</span><span>{wItems.filter(wi=>wi.groupId&&Number(wi.qty)>0).length}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Total Weight</span><span>{wTotalWeight} kg</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{fmt(wSubtotal)}</span></div>
                    {wTotalDiscount>0&&<div className="flex justify-between"><span className="text-slate-500">Total Discount</span><span className="font-semibold text-red-500">–{fmt(wTotalDiscount)}</span></div>}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 shrink-0">Additional Charges</span>
                      <input type="number" min="0" value={wAdditional} onChange={e=>setWAdditional(e.target.value)} className={`${IC} text-xs py-1 flex-1`} placeholder="0"/>
                      {wAdditionalN>0&&<span className="font-semibold shrink-0 text-slate-700">{fmt(wAdditionalN)}</span>}
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1"><span className="font-bold text-slate-800">Grand Total</span><span className="font-extrabold text-green-700 font-['Barlow_Condensed',sans-serif] text-sm">{fmt(wGrandTotal)}</span></div>
                  </div>
                )}
                <F label="Notes"><textarea value={wNotes} onChange={e=>setWNotes(e.target.value)} className={`${IC} resize-none`} rows={2}/></F>
              </>)}
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 shrink-0 flex justify-between items-center gap-2">
              <button onClick={()=>step>1?setStep(s=>(s-1) as 1|2|3):(setShowCreate(false),resetWizard())} className="px-3 sm:px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold whitespace-nowrap">{step===1?"Cancel":"← Back"}</button>
              <PBtn onClick={()=>step<3?setStep(s=>(s+1) as 1|2|3):handleCreateInvoice()}>{step===3?<><CheckCircle size={14}/> Generate Invoice</>:<>Next →</>}</PBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Preview Modal ── */}
      {viewInv&&(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-6" onClick={e=>e.target===e.currentTarget&&setViewInv(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[96vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-lg truncate">{viewInv.invNumber}</h2>
                <Bdg label={viewInv.status} color={badgeCol(viewInv.status)}/>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <button onClick={()=>printInvoice(viewInv)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors"><FileText size={12}/> Print</button>
                <button onClick={()=>downloadInvoice(viewInv)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:border-green-400 hover:text-green-600 transition-colors"><Download size={12}/> Download</button>
                <button onClick={()=>setViewInv(null)} className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={18}/></button>
              </div>
            </div>
            {/* Scrollable body */}
            <div className="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Farm + Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">From</p>
                  <p className="font-bold text-green-800 text-sm">{settings.farmName}</p>
                  {settings.farmAddress&&<p className="text-xs text-green-600 mt-0.5">{settings.farmAddress}</p>}
                  {settings.farmPhone&&<p className="text-xs text-green-600">{settings.farmPhone}</p>}
                  {settings.farmEmail&&<p className="text-xs text-green-600">{settings.farmEmail}</p>}
                </div>
                <div className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bill To</p>
                  <p className="font-bold text-slate-900 text-sm">{viewInv.customer.name}</p>
                  {viewInv.customer.businessName&&<p className="text-xs text-slate-500 mt-0.5">{viewInv.customer.businessName}</p>}
                  {viewInv.customer.phone&&<p className="text-xs text-slate-500">{viewInv.customer.phone}</p>}
                  {viewInv.customer.address&&<p className="text-xs text-slate-500">{viewInv.customer.address}</p>}
                </div>
              </div>
              {/* Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[["Date",viewInv.invoiceDate],["Due Date",viewInv.dueDate||"—"],["Pond",viewInv.pond||"—"],["Payment",viewInv.paymentMethod]].map(([k,v])=>(
                  <div key={k} className="bg-slate-50 rounded-lg px-3 py-2"><p className="text-[10px] text-slate-400 mb-0.5">{k}</p><p className="text-xs font-bold text-slate-800">{v}</p></div>
                ))}
                {viewInv.issuedBy&&<div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 sm:col-span-2"><p className="text-[10px] text-amber-500 mb-0.5">Issued By (Admin View)</p><p className="text-xs font-bold text-amber-800">{viewInv.issuedBy}</p></div>}
              </div>
              {/* Items */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Items</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="hidden sm:grid bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2 gap-2" style={{gridTemplateColumns:"2fr 60px 76px 68px 76px"}}>
                    <span>Description</span><span className="text-right">Qty</span><span className="text-right">Price/kg</span><span className="text-right">Disc.</span><span className="text-right">Total</span>
                  </div>
                  {(viewInv.items||[]).map((it,i)=>(
                    <div key={i} className="border-t border-slate-100 px-3 py-2.5">
                      <div className="sm:hidden">
                        <p className="font-semibold text-slate-800 text-xs mb-0.5">{it.groupLabel||it.displayName}</p>
                        <div className="flex flex-wrap justify-between gap-x-3 text-xs text-slate-500">
                          <span>{it.qtyKg} kg × {fmt(it.pricePerKg)}/kg</span>
                          {it.discount>0&&<span className="text-red-500">–{fmt(it.discount)}</span>}
                          <span className="font-bold text-slate-900">{fmt(it.lineTotal)}</span>
                        </div>
                      </div>
                      <div className="hidden sm:grid gap-2 items-center" style={{gridTemplateColumns:"2fr 60px 76px 68px 76px"}}>
                        <p className="font-medium text-slate-800 text-xs">{viewInv.species?`${viewInv.species} — `:""}{it.groupLabel||it.displayName}</p>
                        <span className="text-right text-xs text-slate-500">{it.qtyKg} kg</span>
                        <span className="text-right text-xs text-slate-500">{fmt(it.pricePerKg)}</span>
                        <span className="text-right text-xs text-slate-500">{it.discount>0?`–${fmt(it.discount)}`:"—"}</span>
                        <span className="text-right text-xs font-bold text-slate-900">{fmt(it.lineTotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Totals */}
              <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between text-xs text-slate-400"><span>Fish Groups</span><span>{(viewInv.items||[]).length}</span></div>
                <div className="flex justify-between text-xs text-slate-400"><span>Total Weight</span><span>{totalWeight(viewInv)} kg</span></div>
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-semibold">{fmt(viewInv.subtotal)}</span></div>
                {viewInv.discount>0&&<div className="flex justify-between text-slate-600"><span>Discount</span><span className="font-semibold text-red-500">–{fmt(viewInv.discount)}</span></div>}
                {viewInv.additionalCharges>0&&<div className="flex justify-between text-slate-600"><span>Additional Charges</span><span className="font-semibold">+{fmt(viewInv.additionalCharges)}</span></div>}
                <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-slate-900">Grand Total</span><span className="font-extrabold text-green-700 font-['Barlow_Condensed',sans-serif] text-lg">{fmt(viewInv.grandTotal)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Amount Paid</span><span className="font-semibold text-green-600">{fmt(viewInv.amountPaid)}</span></div>
                {viewInv.outstanding>0&&<div className="flex justify-between font-bold"><span className="text-slate-700">Balance Due</span><span className="text-red-500">{fmt(viewInv.outstanding)}</span></div>}
              </div>
              {viewInv.notes&&<div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800"><strong>Notes: </strong>{viewInv.notes}</div>}
              {settings.bankDetails&&<div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700"><strong>Bank Details: </strong>{settings.bankDetails}</div>}
            </div>
            {/* Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 shrink-0 flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-b-2xl">
              <button onClick={()=>setViewInv(null)} className="text-sm text-slate-500 hover:text-slate-800 font-semibold">← Close</button>
              <div className="flex items-center gap-2">
                {viewInv.status!=="Paid"&&viewInv.status!=="Error"&&(
                  <button
                    onClick={()=>{
                      markInvoiceAsPaid(viewInv);
                      setViewInv(prev => prev ? { ...prev, amountPaid: prev.grandTotal, outstanding: 0, status: "Paid" } : null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors shadow-xs"
                  >
                    <CheckCircle size={13}/> Mark as Paid
                  </button>
                )}
                <button onClick={()=>downloadInvoice(viewInv)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:border-green-400 hover:text-green-600 transition-colors"><Download size={13}/> Download</button>
                <button onClick={()=>printInvoice(viewInv)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"><FileText size={13}/> Print Invoice</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Update Payment Modal ── */}
      {editPayment&&<Modal title={`Update Payment — ${editPayment.invNumber}`} onClose={()=>setEditPayment(null)}>
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 space-y-1">
          <div className="flex justify-between"><span>Grand Total</span><strong>{fmt(editPayment.grandTotal)}</strong></div>
          <div className="flex justify-between"><span>Already Paid</span><strong className="text-green-700">{fmt(editPayment.amountPaid)}</strong></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span>Outstanding</span><strong className="text-red-500">{fmt(editPayment.outstanding)}</strong></div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-700">Amount Received</span>
            {editPayment.outstanding>0&&(
              <button type="button" onClick={()=>setPayAmt(String(editPayment.outstanding))} className="text-[11px] text-green-600 hover:text-green-800 font-semibold underline">
                Pay Full Balance ({fmt(editPayment.outstanding)})
              </button>
            )}
          </div>
          <input type="number" min="0" value={payAmt} onChange={e=>setPayAmt(e.target.value)} className={IC} placeholder="0"/>
        </div>
        <F label="Payment Method"><select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className={SC}>{PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}</select></F>
        <F label="Payment Date"><input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} className={IC}/></F>
        <div className="flex gap-2 pt-1"><PBtn onClick={handleUpdatePayment}><CheckCircle size={14}/> Confirm Payment</PBtn><button onClick={()=>setEditPayment(null)} className="px-4 py-2 text-sm text-slate-400">Cancel</button></div>
      </Modal>}

      {/* ── Price Groups Panel ── */}
      {showGroupsPanel&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&(setShowGroupsPanel(false),setGroupFormMode(false),setEditGroup(null))}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div><h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{groupFormMode?"Price Group Form":"Price Groups"}</h2><p className="text-xs text-slate-400 mt-0.5">Configure fish pricing — prices apply to future invoices only</p></div>
              <div className="flex items-center gap-2">
                {!groupFormMode&&<PBtn sm onClick={()=>{setGroupFormMode(true);setEditGroup(null);setGroupF({group:"",displayName:"",description:"",pricePerKg:"",status:"Active"});}}><Plus size={12}/> Add Group</PBtn>}
                <button onClick={()=>{setShowGroupsPanel(false);setGroupFormMode(false);setEditGroup(null);}} className="text-slate-400 hover:text-slate-700 p-1"><X size={18}/></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!groupFormMode?(
                <>
                  {priceGroups.length===0&&<p className="text-xs text-slate-400 text-center py-10">No price groups yet — click Add Group to create one.</p>}
                  {priceGroups.length>0&&(
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-left text-[11px] text-slate-500 uppercase tracking-wider">Group</th>
                        <th className="px-4 py-3 text-left text-[11px] text-slate-500 uppercase tracking-wider whitespace-nowrap">Display Name</th>
                        <th className="px-4 py-3 text-left text-[11px] text-slate-500 uppercase tracking-wider whitespace-nowrap">Price/kg</th>
                        <th className="px-4 py-3 text-left text-[11px] text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {priceGroups.map(g=>(
                          <tr key={g.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-slate-900 text-base font-['Barlow_Condensed',sans-serif]">{g.group}</td>
                            <td className="px-4 py-3"><p className="font-semibold text-slate-800">{g.group} – {g.displayName}</p>{g.description&&<p className="text-[11px] text-slate-400">{g.description}</p>}</td>
                            <td className="px-4 py-3 font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">{fmt(g.pricePerKg)}</td>
                            <td className="px-4 py-3"><Bdg label={g.status} color={g.status==="Active"?"green":"gray"}/></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button onClick={()=>{setEditGroup(g);setGroupF({group:g.group,displayName:g.displayName,description:g.description,pricePerKg:String(g.pricePerKg),status:g.status});setGroupFormMode(true);}} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"><Pencil size={13}/></button>
                                <button onClick={()=>{if(confirm(`Delete "${g.group} – ${g.displayName}"?`))onDeletePriceGroup(g.id);}} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13}/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              ):(
                <div className="px-6 py-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">{editGroup?"Edit Price Group":"New Price Group"}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><F label="Group Letter (A, B, C…)"><input value={groupF.group} onChange={e=>{setGroupF(p=>({...p,group:e.target.value.toUpperCase()}));if(e.target.value.trim())setGroupErr(p=>({...p,group:""}));}} className={`${IC}${groupErr.group?" border-red-400":""}`} placeholder="A" maxLength={2}/></F>{groupErr.group&&<p className="text-xs text-red-500 mt-1">{groupErr.group}</p>}</div>
                    <div><F label="Display Name"><input value={groupF.displayName} onChange={e=>{setGroupF(p=>({...p,displayName:e.target.value}));if(e.target.value.trim())setGroupErr(p=>({...p,displayName:""}));}} className={`${IC}${groupErr.displayName?" border-red-400":""}`} placeholder="e.g. Small Size"/></F>{groupErr.displayName&&<p className="text-xs text-red-500 mt-1">{groupErr.displayName}</p>}</div>
                  </div>
                  <F label="Description (Optional)"><input value={groupF.description} onChange={e=>setGroupF(p=>({...p,description:e.target.value}))} className={IC} placeholder="Optional description"/></F>
                  <div><F label="Price Per Kilogram"><input type="number" min="0" value={groupF.pricePerKg} onChange={e=>{setGroupF(p=>({...p,pricePerKg:e.target.value}));if(e.target.value&&Number(e.target.value)>0)setGroupErr(p=>({...p,pricePerKg:""}));}} className={`${IC}${groupErr.pricePerKg?" border-red-400":""}`} placeholder="0"/></F>{groupErr.pricePerKg&&<p className="text-xs text-red-500 mt-1">{groupErr.pricePerKg}</p>}</div>
                  <F label="Status"><select value={groupF.status} onChange={e=>setGroupF(p=>({...p,status:e.target.value as "Active"|"Inactive"}))} className={SC}><option>Active</option><option>Inactive</option></select></F>
                  <div className="flex gap-2 pt-1">
                    <PBtn onClick={handleSaveGroup}><CheckCircle size={14}/> {editGroup?"Save Changes":"Add Group"}</PBtn>
                    <button onClick={()=>{setGroupFormMode(false);setEditGroup(null);setGroupErr({});}} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Settings Modal ── */}
      {showSettings&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e=>e.target===e.currentTarget&&setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Invoice Settings</h2>
              <button onClick={()=>setShowSettings(false)} className="text-slate-400 hover:text-slate-700 p-1"><X size={18}/></button>
            </div>
            <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
              <F label="Farm Name"><input value={settingsF.farmName} onChange={e=>setSettingsF(p=>({...p,farmName:e.target.value}))} className={IC} placeholder="e.g. Green Valley Fish Farm"/></F>
              <F label="Farm Address"><input value={settingsF.farmAddress} onChange={e=>setSettingsF(p=>({...p,farmAddress:e.target.value}))} className={IC} placeholder="e.g. Km 14 Lagos-Ibadan Expressway, Ogun State"/></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Phone"><input value={settingsF.farmPhone} onChange={e=>setSettingsF(p=>({...p,farmPhone:e.target.value}))} className={IC} placeholder="e.g. +234 801 234 5678"/></F>
                <F label="Email (Optional)"><input type="email" value={settingsF.farmEmail} onChange={e=>setSettingsF(p=>({...p,farmEmail:e.target.value}))} className={IC} placeholder="e.g. billing@greenvalley.com"/></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Invoice Prefix"><input value={settingsF.invoicePrefix} onChange={e=>setSettingsF(p=>({...p,invoicePrefix:e.target.value}))} className={IC} placeholder="INV"/></F>
                <F label="Payment Terms"><input value={settingsF.paymentTerms} onChange={e=>setSettingsF(p=>({...p,paymentTerms:e.target.value}))} className={IC} placeholder="e.g. 7 days"/></F>
              </div>
              <F label="Bank Account Details"><textarea value={settingsF.bankDetails} onChange={e=>setSettingsF(p=>({...p,bankDetails:e.target.value}))} className={`${IC} resize-none`} rows={2} placeholder="e.g. Bank: GTBank | Account: 0123456789 | Name: Green Valley Farm"/></F>
              <F label="Default Notes"><textarea value={settingsF.defaultNotes} onChange={e=>setSettingsF(p=>({...p,defaultNotes:e.target.value}))} className={`${IC} resize-none`} rows={2} placeholder="e.g. Thank you for your patronage. Payment due within 7 days."/></F>
              <F label="Footer Message"><input value={settingsF.footerMessage} onChange={e=>setSettingsF(p=>({...p,footerMessage:e.target.value}))} className={IC} placeholder="e.g. Powered by Pondtora Fish Farm Management"/></F>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-2">
              <PBtn onClick={()=>{onUpdateSettings(settingsF);setShowSettings(false);}}><CheckCircle size={14}/> Save Settings</PBtn>
              <button onClick={()=>setShowSettings(false)} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Invoice Confirmation Modal */}
      {deleteInvId&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&setDeleteInvId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Delete Invoice</h2>
              <button onClick={()=>setDeleteInvId(null)} className="text-slate-400 hover:text-slate-700 p-1"><X size={18}/></button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600">Are you sure you want to permanently delete this invoice? This will remove the invoice record from your database.</p>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={()=>{if(onDeleteInvoice)onDeleteInvoice(deleteInvId);setDeleteInvId(null);}} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors">Delete</button>
              <button onClick={()=>setDeleteInvId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
