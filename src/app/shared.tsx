import React, { useState, useMemo, useRef, useEffect } from "react";
import type { ReactNode, ElementType } from "react";
import { TrendingUp, TrendingDown, X, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import type { SortDir } from "./types";
import { COUNTRIES } from "./data";

/* ─── Shared UI ─────────────────────────────────────────────── */
export function Card({children,className=""}:{children:ReactNode;className?:string}){
  return <div className={`bg-white border border-slate-200 rounded-xl ${className}`}>{children}</div>;
}
export function Bdg({label,color}:{label:string;color:"green"|"red"|"amber"|"blue"|"gray"|"teal"|"purple"}){
  const m={green:"bg-green-50 text-green-700 border-green-200",teal:"bg-green-100 text-green-800 border-green-300",red:"bg-red-50 text-red-700 border-red-200",amber:"bg-amber-50 text-amber-700 border-amber-200",blue:"bg-blue-50 text-blue-700 border-blue-200",gray:"bg-slate-50 text-slate-600 border-slate-200",purple:"bg-purple-50 text-purple-700 border-purple-200"};
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${m[color]}`}>{label}</span>;
}
export function PBtn({children,onClick,sm,danger,outline}:{children:ReactNode;onClick?:()=>void;sm?:boolean;danger?:boolean;outline?:boolean}){
  const base="flex items-center gap-1.5 font-semibold rounded-lg transition-colors";
  const color=danger?"bg-red-500 hover:bg-red-600 text-white":outline?"border border-green-600 text-green-600 hover:bg-green-50 bg-white":"bg-green-600 hover:bg-green-700 text-white";
  return <button onClick={onClick} className={`${base} ${color} ${sm?"px-3 py-1.5 text-xs":"px-4 py-2 text-sm"}`}>{children}</button>;
}
export function Pagination({total,page,perPage,onPage}:{total:number;page:number;perPage:number;onPage:(p:number)=>void;}){
  const pages=Math.ceil(total/perPage);
  if(pages<=1)return null;
  const start=Math.max(1,page-2);
  const end=Math.min(pages,page+2);
  const nums=Array.from({length:end-start+1},(_,i)=>start+i);
  return(
    <div className="flex items-center justify-center gap-1 pt-2 pb-1">
      <button onClick={()=>onPage(page-1)} disabled={page===1} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:border-green-400 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">← Prev</button>
      {start>1&&<><span className="px-2.5 py-1.5 text-xs text-slate-400 cursor-pointer hover:text-green-600" onClick={()=>onPage(1)}>1</span>{start>2&&<span className="text-slate-300 text-xs">…</span>}</>}
      {nums.map(n=><button key={n} onClick={()=>onPage(n)} className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${n===page?"bg-green-600 text-white border-green-600":"border-slate-200 text-slate-600 hover:border-green-400 hover:text-green-600"}`}>{n}</button>)}
      {end<pages&&<>{end<pages-1&&<span className="text-slate-300 text-xs">…</span>}<span className="px-2.5 py-1.5 text-xs text-slate-400 cursor-pointer hover:text-green-600" onClick={()=>onPage(pages)}>{pages}</span></>}
      <button onClick={()=>onPage(page+1)} disabled={page===pages} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:border-green-400 hover:text-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next →</button>
    </div>
  );
}
export const PER_PAGE=10;
export function StatCard({label,value,sub,icon:Icon,trend,hi,valueColor}:{label:string;value:string;sub?:string;icon:ElementType;trend?:{dir:"up"|"down";val:string;good?:boolean};hi?:boolean;valueColor?:"green"|"red"|"neutral"}){
  const tc=trend?(trend.good===false?(trend.dir==="up"?"text-red-500":"text-green-600"):(trend.dir==="up"?"text-green-600":"text-red-500")):"";
  const vc=valueColor==="green"?"text-green-600":valueColor==="red"?"text-red-500":undefined;
  return(
    <Card className={`p-4 ${hi?"border-green-200 bg-green-50":""}`}>
      <div className="flex flex-col gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${hi?"bg-green-100":"bg-slate-100"}`}>
          <Icon size={16} className={hi?"text-green-600":"text-slate-400"}/>
        </div>
        <div className="min-w-0 overflow-hidden">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">{label}</p>
          <p className={`text-2xl font-bold mt-0.5 font-['Barlow_Condensed',sans-serif] leading-tight break-all ${vc||(hi?"text-green-700":"text-slate-900")}`}>{value}</p>
          {sub&&<p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
          {trend&&<div className={`flex items-center gap-1 mt-0.5 text-xs font-medium ${tc}`}>{trend.dir==="up"?<TrendingUp size={11}/>:<TrendingDown size={11}/>}{trend.val}</div>}
        </div>
      </div>
    </Card>
  );
}
export const Tip=({active,payload,label,yFmt}:any)=>{
  if(!active||!payload?.length)return null;
  return(
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="text-slate-500 font-medium mb-1.5">{label}</p>
      {payload.map((p:any)=>(
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{background:p.color}}/>
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-slate-800 font-semibold">{typeof p.value==="number"&&p.value>999&&yFmt?yFmt(p.value):p.value}</span>
        </div>
      ))}
    </div>
  );
};
export function Modal({title,onClose,children,wide}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
  return(
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${wide?"sm:max-w-lg":"sm:max-w-md"} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X size={18}/></button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
export function F({label,children}:{label:string;children:ReactNode}){
  return <div><label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">{label}</label>{children}</div>;
}
export const IC="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-300";
export const SC=IC+" cursor-pointer"; /* select class */

export function SearchableSelect({value,onChange,options,placeholder="Select…",className=""}:{value:string;onChange:(v:string)=>void;options:string[];placeholder?:string;className?:string}){
  const [open,setOpen]=useState(false);const [q,setQ]=useState("");const ref=useRef<HTMLDivElement>(null);
  const filtered=options.filter(o=>o.toLowerCase().includes(q.toLowerCase()));
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  return(
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={()=>setOpen(o=>!o)} className={`${IC} text-left flex items-center justify-between cursor-pointer`}>
        <span className={value?"text-slate-900":"text-slate-300"}>{value||placeholder}</span>
        <ChevronDown size={13} className="text-slate-400 shrink-0"/>
      </button>
      {open&&(
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100"><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"/></div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length===0&&<p className="text-xs text-slate-400 text-center py-3">No results</p>}
            {filtered.map(o=><button key={o} type="button" onClick={()=>{onChange(o);setOpen(false);setQ("");}} className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700 transition-colors ${o===value?"bg-green-50 text-green-700 font-semibold":""}`}>{o}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SelDrop — searchable dropdown rendered as a fixed overlay (no clip) ── */
export function SelDrop({value,onChange,options,placeholder="Select…",className="",sm=false}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string}[];placeholder?:string;className?:string;sm?:boolean}){
  const [open,setOpen]=useState(false);const [q,setQ]=useState("");
  const btnRef=useRef<HTMLButtonElement>(null);const ref=useRef<HTMLDivElement>(null);
  const [pos,setPos]=useState({top:0,left:0,width:0});
  const sel=options.find(o=>o.value===value);
  const filtered=options.filter(o=>o.label.toLowerCase().includes(q.toLowerCase()));
  const openDrop=()=>{
    if(btnRef.current){
      const r=btnRef.current.getBoundingClientRect();
      setPos({top:r.bottom+4,left:r.left,width:r.width});
    }
    setOpen(true);
  };
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node)&&btnRef.current&&!btnRef.current.contains(e.target as Node))setOpen(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);
  return(
    <div className={`relative ${className}`}>
      <button ref={btnRef} type="button" onClick={()=>open?setOpen(false):openDrop()} className={`${IC} ${sm?"text-xs py-1.5":""} text-left flex items-center justify-between cursor-pointer`}>
        <span className={sel?"text-slate-900":"text-slate-400"}>{sel?.label||placeholder}</span>
        <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${open?"rotate-180":""}`}/>
      </button>
      {open&&(
        <div ref={ref} className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden" style={{top:pos.top,left:pos.left,width:Math.max(pos.width,220)}}>
          <div className="p-2 border-b border-slate-100"><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"/></div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length===0&&<p className="text-xs text-slate-400 text-center py-3">No results</p>}
            {filtered.map(o=><button key={o.value} type="button" onClick={()=>{onChange(o.value);setOpen(false);setQ("");}} className={`w-full text-left px-3 py-2 text-xs hover:bg-green-50 hover:text-green-700 transition-colors ${o.value===value?"bg-green-50 text-green-700 font-semibold":""}`}>{o.label}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sort helpers ──────────────────────────────────────────── */
/* ─── Shared DateFilter component ─────────────────────────────── */
export const DMONTHS_S=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function DateFilter({year,month,day,onYear,onMonth,onDay,onReset,dates=[]}:{year:string;month:string;day:string;onYear:(v:string)=>void;onMonth:(v:string)=>void;onDay:(v:string)=>void;onReset:()=>void;dates?:string[]}){
  const [open,setOpen]=useState(false);
  const [dropStyle,setDropStyle]=useState<React.CSSProperties>({});
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  useEffect(()=>{
    if(open&&ref.current){
      const rect=ref.current.getBoundingClientRect();
      const dropW=240;const dropH=360;
      const left=rect.left+dropW>window.innerWidth?Math.max(8,window.innerWidth-dropW-8):Math.max(8,rect.left);
      const top=rect.bottom+dropH>window.innerHeight?Math.max(8,rect.top-dropH-4):rect.bottom+4;
      setDropStyle({position:"fixed",top,left,zIndex:9999,minWidth:dropW});
    }
  },[open]);
  const hasFilter=year!=="All"||month!=="All"||day!=="All";
  const allYears=[...new Set(dates.map(d=>d.slice(0,4)).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
  const label=day!=="All"?`${day} ${month!=="All"?month:""} ${year!=="All"?year:""}`.trim():month!=="All"?`${month} ${year!=="All"?year:""}`.trim():year!=="All"?year:"Filter by Date";
  return(
    <div className="relative" ref={ref}>
      <div className="flex gap-2 items-center">
        <button onClick={()=>setOpen(o=>!o)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${hasFilter?"border-green-400 bg-green-50 text-green-700":"border-slate-200 bg-white text-slate-600 hover:border-green-400"}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          {label}
          <ChevronDown size={11} className={open?"rotate-180 text-slate-400":"text-slate-400"} style={{transition:"transform 0.15s"}}/>
        </button>
        {hasFilter&&<button onClick={onReset} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">✕ Reset</button>}
      </div>
      {open&&(
        <div style={dropStyle} className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-4">
          <div className="space-y-3">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Year</p><div className="flex flex-wrap gap-1.5">{(["All",...allYears.length?allYears:["2025","2026"]] as string[]).map(y=><button key={y} onClick={()=>{onYear(y);if(y==="All"){onMonth("All");onDay("All");}}} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${year===y?"bg-green-600 text-white":"bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700"}`}>{y==="All"?"All Years":y}</button>)}</div></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Month</p><div className="grid grid-cols-4 gap-1">{["All",...DMONTHS_S].map(m=><button key={m} onClick={()=>onMonth(m==="All"?"All":m)} className={`px-1.5 py-1 rounded-lg text-xs font-semibold transition-colors ${month===(m==="All"?"All":m)?"bg-green-600 text-white":"bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700"}`}>{m==="All"?"All":m}</button>)}</div></div>
            {month!=="All"&&<div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Day</p><div className="grid grid-cols-7 gap-1">{["All",...Array.from({length:31},(_,i)=>String(i+1))].map(d=><button key={d} onClick={()=>onDay(d==="All"?"All":String(d).padStart(2,"0"))} className={`py-1 rounded-lg text-xs font-semibold transition-colors ${day===(d==="All"?"All":String(d).padStart(2,"0"))?"bg-green-600 text-white":"bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700"}`}>{d==="All"?"—":d}</button>)}</div></div>}
          </div>
          <button onClick={()=>{setOpen(false);}} className="mt-3 w-full py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl transition-colors">Done</button>
        </div>
      )}
    </div>
  );
}
export function SearchableCountrySelect({value,onChange}:{value:string;onChange:(v:string)=>void;}){
  const [search,setSearch]=useState("");
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const filtered=COUNTRIES.filter(c=>c.toLowerCase().includes(search.toLowerCase()));
  return(
    <div className="relative" ref={ref}>
      <button type="button" onClick={()=>setOpen(o=>!o)} className="w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-300">
        <span className={value?"text-slate-900":"text-slate-400"}>{value||"Select country…"}</span>
        <ChevronDown size={13} className="text-slate-400 shrink-0"/>
      </button>
      {open&&(
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search country…" className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"/>
          </div>
          <div className="overflow-y-auto" style={{maxHeight:200}}>
            {filtered.map(c=><button key={c} type="button" onClick={()=>{onChange(c);setOpen(false);setSearch("");}} className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 hover:text-green-700 transition-colors ${c===value?"bg-green-50 text-green-700 font-semibold":""}`}>{c}</button>)}
            {filtered.length===0&&<p className="text-center text-xs text-slate-400 py-4">No countries found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function SH({label,field,sf,sd,onSort}:{label:string;field:string;sf:string;sd:SortDir;onSort:(f:string)=>void}){
  const a=sf===field;
  return(
    <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-green-600 transition-colors" onClick={()=>onSort(field)}>
      <div className="flex items-center gap-1">{label}<div className="flex flex-col -space-y-0.5"><ChevronUp size={9} className={a&&sd==="asc"?"text-green-600":"text-slate-200"}/><ChevronDown size={9} className={a&&sd==="desc"?"text-green-600":"text-slate-200"}/></div></div>
    </th>
  );
}
export function useSort<T>(data:T[], defaultField:string){
  const [sf,setSf]=useState(defaultField);
  const [sd,setSd]=useState<SortDir>("asc");
  const toggle=(f:string)=>{if(sf===f)setSd(p=>p==="asc"?"desc":"asc");else{setSf(f);setSd("asc");}};
  const sorted=useMemo(()=>[...data].sort((a:any,b:any)=>{const va=a[sf],vb=b[sf];if(typeof va==="string")return sd==="asc"?va.localeCompare(vb):vb.localeCompare(va);return sd==="asc"?(va??0)-(vb??0):(vb??0)-(va??0);}),[data,sf,sd]);
  return {sorted,sf,sd,toggle};
}

/* ── NumInput — text-mode numeric input that stays empty when cleared ── */
export function NumInput({value,onChange,className,placeholder,allowDecimal=true}:{value:number|string;onChange:(v:string)=>void;className?:string;placeholder?:string;allowDecimal?:boolean}){
  const [str,setStr]=useState(()=>(value===0||value===""||value===null||value===undefined)?"":String(value));
  const handle=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const v=e.target.value;
    const ok=allowDecimal?/^\d*\.?\d*$/.test(v):/^\d*$/.test(v);
    if(v===""||ok){setStr(v);onChange(v);}
  };
  return <input type="text" inputMode={allowDecimal?"decimal":"numeric"} value={str} onChange={handle} className={className} placeholder={placeholder}/>;
}

/* ── DateInput — shows formatted date, opens native picker on click ── */
export function DateInput({value,onChange,className}:{value:string;onChange:(v:string)=>void;className?:string}){
  const formatted=value?(()=>{try{const d=new Date(value+"T00:00:00");return d.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});}catch{return value;}})():"Select date";
  return(
    <div className="relative">
      <div className={`pointer-events-none flex items-center gap-2 ${className||IC}`}>
        <Calendar size={13} className="text-slate-400 shrink-0"/>
        <span className={value?"text-slate-900":"text-slate-400 text-sm"}>{formatted}</span>
      </div>
      <input type="date" value={value} onChange={e=>onChange(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"/>
    </div>
  );
}
