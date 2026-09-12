import React, { useState, useRef, useEffect } from "react";
import {
  ClipboardList, ChevronDown, Plus, Trash2, Pencil, Eye,
  CheckCircle, X, Copy, GripVertical, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, Link, RotateCcw
} from "lucide-react";
import { Card, Bdg, PBtn, PER_PAGE } from "../shared";
import { uid, TODAY } from "../data";
import { api } from "../../lib/api";

/* ─── Types ─────────────────────────────────────────────────── */
export interface KQuestion { id:string; text:string; category:string; options:[string,string,string,string]; correctIndex:number; }
export interface CQuestion { id:string; text:string; category:string; options:[string,string,string,string]; correctIndex:number; }
export interface KResult { id:string; name:string; email:string; phone:string; gender:string; dateTaken:string; timeTaken:string; totalCorrect:number; totalWrong:number; overallScore:number; pass:boolean; categoryBreakdown:{category:string;correct:number;total:number}[]; }
export interface CResult { id:string; name:string; email:string; phone:string; gender:string; dateTaken:string; timeTaken:string; categoryScores:{category:string;score:number}[]; overallScore:number; recommendation:"Highly Recommended"|"Recommended"|"Consider"|"Not Recommended"; }

/* ─── Constants ──────────────────────────────────────────────── */
const K_CATS=["Fish Feeding","Fish Health","Water Quality Management","Water Flow-Through System","Pond Maintenance","Equipment Operation","Repairs & Maintenance","Fish Stock Management","Harvesting","Inventory Management","Safety & Hygiene","Farm Rules & SOPs"];
const C_CATS=["Communication","Teamwork","Leadership","Responsibility","Emotional Intelligence","Integrity","Discipline","Adaptability","Initiative","Stress Management","Physical Readiness","Problem Solving"];

/* ─── Link Generation — uses current app URL + hash fragment ─── */
function getAssessmentLink(type:"knowledge"|"compatibility",ownerId:string):string{
  const base=window.location.origin+window.location.pathname;
  return`${base}#/assess/${type}/${ownerId}`;
}
function getNextRegen():string{
  const bucket=Math.floor(Date.now()/(6*60*60*1000));
  const next=new Date((bucket+1)*6*60*60*1000);
  return next.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
}

/* ─── Seed Questions (exported for hash-routed candidate view) ── */
export const INIT_K:KQuestion[]=[
  {id:"KQ-1",text:"How many times a day should fingerlings typically be fed?",category:"Fish Feeding",options:["Once a day","Twice a day","Three times a day","Four times a day"],correctIndex:2},
  {id:"KQ-2",text:"What is the ideal dissolved oxygen level for tilapia ponds?",category:"Water Quality Management",options:["1–2 mg/L","3–4 mg/L","5–7 mg/L","8–10 mg/L"],correctIndex:2},
  {id:"KQ-3",text:"Which is a common sign of fish disease?",category:"Fish Health",options:["Active feeding","Swimming near surface gasping","Normal schooling","Bright coloration"],correctIndex:1},
  {id:"KQ-4",text:"What is the primary purpose of water flow-through in pond systems?",category:"Water Flow-Through System",options:["Cool the pond","Remove waste and replenish oxygen","Increase water temperature","Reduce feed consumption"],correctIndex:1},
  {id:"KQ-5",text:"How should unused feed bags be stored?",category:"Inventory Management",options:["On wet ground","In a dry, cool, ventilated area","In direct sunlight","Near chemicals"],correctIndex:1},
  {id:"KQ-6",text:"What does the term 'FCR' stand for?",category:"Fish Feeding",options:["Feed Consumption Rate","Feed Conversion Ratio","Fish Count Record","Farm Cost Report"],correctIndex:1},
  {id:"KQ-7",text:"Which equipment is used to measure dissolved oxygen in pond water?",category:"Equipment Operation",options:["Refractometer","DO meter","pH meter","Thermometer"],correctIndex:1},
];
export const INIT_C:CQuestion[]=[
  {id:"CQ-1",text:"When there is a disagreement with a colleague, you typically:",category:"Communication",options:["Avoid the conversation","Listen to understand their perspective","Report it immediately","Argue until they agree"],correctIndex:1},
  {id:"CQ-2",text:"If assigned a task you have never done before, you would:",category:"Adaptability",options:["Refuse until trained","Ask for help and attempt it step by step","Do it exactly as your previous job","Wait for someone else"],correctIndex:1},
  {id:"CQ-3",text:"When you notice an issue outside your responsibility, you:",category:"Initiative",options:["Ignore it","Report it to the appropriate person","Wait until asked","Handle it quietly"],correctIndex:1},
  {id:"CQ-4",text:"Working under pressure with tight deadlines, you:",category:"Stress Management",options:["Panic and make mistakes","Prioritize tasks and stay focused","Give up","Work slower than normal"],correctIndex:1},
  {id:"CQ-5",text:"If you discovered a team member taking farm supplies for personal use, you would:",category:"Integrity",options:["Ignore it","Report to a supervisor","Join in if needed","Tell colleagues only"],correctIndex:1},
  {id:"CQ-6",text:"When given constructive criticism by your supervisor, you:",category:"Emotional Intelligence",options:["Get defensive","Listen and apply the feedback","Feel discouraged for weeks","Complain to coworkers"],correctIndex:1},
  {id:"CQ-7",text:"When your team is short-handed for a physically demanding task, you:",category:"Physical Readiness",options:["Wait for more staff","Step in and help","Suggest they hire someone","Pretend not to notice"],correctIndex:1},
];

/* ─── Seed Results ───────────────────────────────────────────── */
const INIT_KR:KResult[]=[
  {id:"KR-1",name:"Aminu Garba",email:"aminu.g@mail.com",phone:"08012345678",gender:"Male",dateTaken:"2026-06-20",timeTaken:"14:32",totalCorrect:6,totalWrong:1,overallScore:86,pass:true,categoryBreakdown:[{category:"Fish Feeding",correct:2,total:2},{category:"Water Quality Management",correct:1,total:1},{category:"Fish Health",correct:1,total:1},{category:"Water Flow-Through System",correct:1,total:1},{category:"Inventory Management",correct:1,total:1},{category:"Equipment Operation",correct:0,total:1}]},
  {id:"KR-2",name:"Funmi Adeyemi",email:"funmi.a@mail.com",phone:"08023456789",gender:"Female",dateTaken:"2026-06-21",timeTaken:"10:15",totalCorrect:5,totalWrong:2,overallScore:71,pass:true,categoryBreakdown:[{category:"Fish Feeding",correct:1,total:2},{category:"Water Quality Management",correct:1,total:1},{category:"Fish Health",correct:1,total:1},{category:"Water Flow-Through System",correct:1,total:1},{category:"Inventory Management",correct:1,total:1},{category:"Equipment Operation",correct:0,total:1}]},
  {id:"KR-3",name:"Chidi Okonkwo",email:"chidi.o@mail.com",phone:"08034567890",gender:"Male",dateTaken:"2026-06-22",timeTaken:"09:45",totalCorrect:4,totalWrong:3,overallScore:57,pass:false,categoryBreakdown:[{category:"Fish Feeding",correct:1,total:2},{category:"Water Quality Management",correct:1,total:1},{category:"Fish Health",correct:0,total:1},{category:"Water Flow-Through System",correct:1,total:1},{category:"Inventory Management",correct:1,total:1},{category:"Equipment Operation",correct:0,total:1}]},
  {id:"KR-4",name:"Ngozi Eze",email:"ngozi.e@mail.com",phone:"08045678901",gender:"Female",dateTaken:"2026-06-24",timeTaken:"11:05",totalCorrect:7,totalWrong:0,overallScore:100,pass:true,categoryBreakdown:[{category:"Fish Feeding",correct:2,total:2},{category:"Water Quality Management",correct:1,total:1},{category:"Fish Health",correct:1,total:1},{category:"Water Flow-Through System",correct:1,total:1},{category:"Inventory Management",correct:1,total:1},{category:"Equipment Operation",correct:1,total:1}]},
];
const INIT_CR:CResult[]=[
  {id:"CR-1",name:"Fatima Bello",email:"fatima.b@mail.com",phone:"08056789012",gender:"Female",dateTaken:"2026-06-18",timeTaken:"11:20",categoryScores:[{category:"Communication",score:90},{category:"Teamwork",score:85},{category:"Leadership",score:75},{category:"Responsibility",score:88},{category:"Emotional Intelligence",score:82},{category:"Integrity",score:95},{category:"Discipline",score:78},{category:"Adaptability",score:92},{category:"Initiative",score:87},{category:"Stress Management",score:80},{category:"Physical Readiness",score:85},{category:"Problem Solving",score:83}],overallScore:87,recommendation:"Highly Recommended"},
  {id:"CR-2",name:"Babatunde Lawal",email:"baba.l@mail.com",phone:"08067890123",gender:"Male",dateTaken:"2026-06-19",timeTaken:"15:45",categoryScores:[{category:"Communication",score:70},{category:"Teamwork",score:65},{category:"Leadership",score:55},{category:"Responsibility",score:60},{category:"Emotional Intelligence",score:58},{category:"Integrity",score:50},{category:"Discipline",score:62},{category:"Adaptability",score:45},{category:"Initiative",score:55},{category:"Stress Management",score:48},{category:"Physical Readiness",score:70},{category:"Problem Solving",score:52}],overallScore:58,recommendation:"Consider"},
  {id:"CR-3",name:"Emeka Nwosu",email:"emeka.n@mail.com",phone:"08078901234",gender:"Male",dateTaken:"2026-06-23",timeTaken:"09:30",categoryScores:[{category:"Communication",score:78},{category:"Teamwork",score:80},{category:"Leadership",score:72},{category:"Responsibility",score:75},{category:"Emotional Intelligence",score:70},{category:"Integrity",score:82},{category:"Discipline",score:68},{category:"Adaptability",score:74},{category:"Initiative",score:76},{category:"Stress Management",score:72},{category:"Physical Readiness",score:80},{category:"Problem Solving",score:77}],overallScore:75,recommendation:"Recommended"},
];

/* ─── Scoring helpers ────────────────────────────────────────── */
function calcKResult(info:{name:string;email:string;phone:string;gender:string},answers:(number|null)[],questions:KQuestion[]):KResult{
  const catMap=new Map<string,{correct:number;total:number}>();
  let totalCorrect=0;
  questions.forEach((q,i)=>{
    if(!catMap.has(q.category))catMap.set(q.category,{correct:0,total:0});
    const cat=catMap.get(q.category)!;cat.total++;
    if(answers[i]===q.correctIndex){cat.correct++;totalCorrect++;}
  });
  const total=questions.length||1;
  return{id:uid(),name:info.name,email:info.email,phone:info.phone,gender:info.gender,dateTaken:TODAY,timeTaken:new Date().toTimeString().slice(0,5),totalCorrect,totalWrong:total-totalCorrect,overallScore:Math.round((totalCorrect/total)*100),pass:Math.round((totalCorrect/total)*100)>=70,categoryBreakdown:Array.from(catMap.entries()).map(([category,d])=>({category,...d}))};
}
function calcCResult(info:{name:string;email:string;phone:string;gender:string},answers:(number|null)[],questions:CQuestion[]):CResult{
  const catMap=new Map<string,number[]>();
  questions.forEach((q,i)=>{
    if(!catMap.has(q.category))catMap.set(q.category,[]);
    const ans=answers[i]??-1;
    const score=ans===q.correctIndex?100:ans===(q.correctIndex+1)%4?60:30;
    catMap.get(q.category)!.push(score);
  });
  const catScores=C_CATS.map(cat=>{
    const scores=catMap.get(cat);
    return{category:cat,score:scores?Math.round(scores.reduce((s,v)=>s+v,0)/scores.length):50};
  });
  const overall=Math.round(catScores.reduce((s,c)=>s+c.score,0)/catScores.length);
  const recommendation:CResult["recommendation"]=overall>=80?"Highly Recommended":overall>=65?"Recommended":overall>=50?"Consider":"Not Recommended";
  return{id:uid(),name:info.name,email:info.email,phone:info.phone,gender:info.gender,dateTaken:TODAY,timeTaken:new Date().toTimeString().slice(0,5),categoryScores:catScores,overallScore:overall,recommendation};
}

/* ─── recColor ───────────────────────────────────────────────── */
function recColor(r:CResult["recommendation"]): "green"|"blue"|"amber"|"red" {
  if(r==="Highly Recommended")return"green";
  if(r==="Recommended")return"blue";
  if(r==="Consider")return"amber";
  return"red";
}

/* ─── Score Bar ──────────────────────────────────────────────── */
function ScoreBar({score}:{score:number}){
  const color=score>=80?"bg-green-500":score>=65?"bg-blue-500":score>=50?"bg-amber-500":"bg-red-500";
  return<div className="flex items-center gap-2"><div className="flex-1 bg-slate-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${color} transition-all`} style={{width:`${Math.min(100,score)}%`}}/></div><span className="text-xs font-bold text-slate-700 w-8 text-right">{score}%</span></div>;
}

/* ─── Question Card ──────────────────────────────────────────── */
function QuestionCard({q,idx,total,onMoveUp,onMoveDown,onEdit,onDelete}:{q:KQuestion|CQuestion;idx:number;total:number;onMoveUp:()=>void;onMoveDown:()=>void;onEdit:()=>void;onDelete:()=>void;}){
  return(
    <div className="border border-slate-200 rounded-xl bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0">
          <GripVertical size={16} className="text-slate-200 cursor-grab"/>
          <button onClick={onMoveUp} disabled={idx===0} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-default"><ArrowUp size={12}/></button>
          <button onClick={onMoveDown} disabled={idx===total-1} className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-default"><ArrowDown size={12}/></button>
          <span className="text-[10px] font-bold text-slate-300 mt-0.5">{idx+1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-slate-800 leading-snug">{q.text||<span className="italic text-slate-300">No question text</span>}</p>
            <div className="flex gap-1 shrink-0">
              <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"><Pencil size={13}/></button>
              <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13}/></button>
            </div>
          </div>
          <div className="mb-2.5"><Bdg label={q.category} color="blue"/></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {q.options.map((opt,oi)=>(
              <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${oi===q.correctIndex?"bg-green-50 border-green-200 text-green-800 font-semibold":"border-slate-100 text-slate-500"}`}>
                <span className={`w-4 h-4 rounded-full border text-[10px] flex items-center justify-center font-bold shrink-0 ${oi===q.correctIndex?"border-green-500 bg-green-500 text-white":"border-slate-300 text-slate-400"}`}>{String.fromCharCode(65+oi)}</span>
                <span className="truncate">{opt||<span className="italic opacity-50">Empty</span>}</span>
                {oi===q.correctIndex&&<CheckCircle size={11} className="ml-auto text-green-500 shrink-0"/>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Question Edit Modal ────────────────────────────────────── */
function QuestionModal({q,cats,title,onSave,onClose}:{q:KQuestion|CQuestion;cats:string[];title:string;onSave:(q:KQuestion|CQuestion)=>void;onClose:()=>void;}){
  const [form,setForm]=useState({...q,options:[...q.options] as [string,string,string,string]});
  const setOpt=(i:number,v:string)=>setForm(p=>({...p,options:p.options.map((o,oi)=>oi===i?v:o) as [string,string,string,string]}));
  return(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{maxHeight:"90vh"}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <p className="font-bold text-slate-800">{title}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Question</label>
            <textarea value={form.text} onChange={e=>setForm(p=>({...p,text:e.target.value}))} rows={3} placeholder="Enter question text..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Category</label>
            <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              {cats.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Answer Options <span className="normal-case font-normal text-slate-400">(click circle to mark correct)</span></label>
            <div className="space-y-2">
              {form.options.map((opt,oi)=>(
                <div key={oi} className="flex items-center gap-2">
                  <button onClick={()=>setForm(p=>({...p,correctIndex:oi}))} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${form.correctIndex===oi?"border-green-500 bg-green-500":"border-slate-300 hover:border-green-400"}`}>
                    {form.correctIndex===oi&&<div className="w-2 h-2 rounded-full bg-white"/>}
                  </button>
                  <span className="text-xs font-bold text-slate-400 w-5">{String.fromCharCode(65+oi)}.</span>
                  <input value={opt} onChange={e=>setOpt(oi,e.target.value)} placeholder={`Option ${String.fromCharCode(65+oi)}`} className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2 shrink-0">
          <PBtn onClick={()=>{if(!form.text.trim())return;onSave(form);}}><CheckCircle size={14}/> Save Question</PBtn>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-700">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Question Manager Panel ─────────────────────────────────── */
function QuestionManager({type,questions,cats,onSave,onClose}:{type:"knowledge"|"compatibility";questions:(KQuestion|CQuestion)[];cats:string[];onSave:(qs:(KQuestion|CQuestion)[])=>void;onClose:()=>void;}){
  const [qs,setQs]=useState([...questions]);
  const [editQ,setEditQ]=useState<KQuestion|CQuestion|null>(null);
  const [isNew,setIsNew]=useState(false);
  const title=type==="knowledge"?"Knowledge Test — Questions":"Compatibility Test — Questions";
  const moveUp=(i:number)=>setQs(p=>{const a=[...p];[a[i-1],a[i]]=[a[i],a[i-1]];return a;});
  const moveDown=(i:number)=>setQs(p=>{const a=[...p];[a[i],a[i+1]]=[a[i+1],a[i]];return a;});
  const deleteQ=(id:string)=>setQs(p=>p.filter(q=>q.id!==id));
  const handleSave=(q:KQuestion|CQuestion)=>{
    if(isNew)setQs(p=>[...p,q]);
    else setQs(p=>p.map(x=>x.id===q.id?q:x));
    setEditQ(null);
  };
  const addNew=()=>{
    const id=uid();
    const blank:KQuestion={id,text:"",category:cats[0],options:["","","",""],correctIndex:0};
    setEditQ(blank);setIsNew(true);
  };
  return(
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-8 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col mb-8" style={{maxHeight:"calc(100vh - 5rem)"}}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div>
              <p className="font-bold text-slate-800">{title}</p>
              <p className="text-xs text-slate-400">{qs.length} question{qs.length!==1?"s":""}</p>
            </div>
            <div className="flex gap-2">
              <PBtn sm onClick={addNew}><Plus size={13}/> Add Question</PBtn>
              <PBtn sm onClick={()=>{onSave(qs);onClose();}}><CheckCircle size={13}/> Save & Close</PBtn>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 ml-1"><X size={16}/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {qs.length===0&&<p className="text-center text-sm text-slate-400 py-8">No questions yet. Click "Add Question" to get started.</p>}
            {qs.map((q,i)=>(
              <QuestionCard key={q.id} q={q} idx={i} total={qs.length}
                onMoveUp={()=>moveUp(i)} onMoveDown={()=>moveDown(i)}
                onEdit={()=>{setEditQ(q);setIsNew(false);}} onDelete={()=>deleteQ(q.id)}/>
            ))}
          </div>
        </div>
      </div>
      {editQ&&<QuestionModal q={editQ} cats={cats} title={isNew?"Add Question":"Edit Question"} onSave={handleSave} onClose={()=>setEditQ(null)}/>}
    </>
  );
}

/* ─── Copy Link Modal ────────────────────────────────────────── */
function CopyLinkModal({type,onClose,onPreview,ownerId=""}:{type:"knowledge"|"compatibility";onClose:()=>void;onPreview:()=>void;ownerId?:string;}){
  const link=getAssessmentLink(type,ownerId);
  const [copied,setCopied]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  const handleCopy=()=>{
    if(navigator.clipboard?.writeText){
      navigator.clipboard.writeText(link).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);}).catch(()=>fallbackCopy());
    }else{fallbackCopy();}
  };
  const fallbackCopy=()=>{
    const ta=document.createElement("textarea");
    ta.value=link;ta.style.position="fixed";ta.style.opacity="0";
    document.body.appendChild(ta);ta.focus();ta.select();
    try{document.execCommand("copy");}catch{}
    document.body.removeChild(ta);
    setCopied(true);setTimeout(()=>setCopied(false),2500);
  };
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="font-bold text-slate-800">Assessment Link</p>
            <p className="text-xs text-slate-400">{type==="knowledge"?"Knowledge Test":"Compatibility Test"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Active Link</label>
            <div className="flex gap-2">
              <input ref={inputRef} readOnly value={link} onClick={()=>inputRef.current?.select()} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-text select-all"/>
              <button onClick={handleCopy} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${copied?"bg-green-50 border-green-200 text-green-700":"border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {copied?<><CheckCircle size={13}/> Copied!</>:<><Copy size={13}/> Copy</>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
            <RotateCcw size={13} className="text-amber-500 shrink-0"/>
            <p className="text-xs text-amber-700">Links auto-regenerate every 6 hours. Next update at <strong>{getNextRegen()}</strong>.</p>
          </div>
          {copied&&<div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-100">
            <CheckCircle size={13} className="text-green-500 shrink-0"/>
            <p className="text-xs text-green-700">Link copied to clipboard successfully!</p>
          </div>}
        </div>
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2">
          <PBtn onClick={onPreview}><Eye size={14}/> Preview as Candidate</PBtn>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-700 sm:ml-auto">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Result Detail Modals ───────────────────────────────────── */
function KResultModal({r,onClose}:{r:KResult;onClose:()=>void;}){
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{maxHeight:"90vh"}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <p className="font-bold text-slate-800">Knowledge Test — Result Detail</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Candidate Information</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {([["Full Name",r.name],["Email",r.email],["Phone",r.phone],["Gender",r.gender],["Date Taken",r.dateTaken],["Time Taken",r.timeTaken]] as [string,string][]).map(([l,v])=>(
                <div key={l}><p className="text-[10px] text-slate-400">{l}</p><p className="text-sm font-semibold text-slate-800 break-all">{v}</p></div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Category Breakdown</p>
            <div className="space-y-2">
              {r.categoryBreakdown.map(cb=>(
                <div key={cb.category} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-44 shrink-0 leading-tight">{cb.category}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${cb.correct===cb.total?"bg-green-500":cb.correct===0?"bg-red-400":"bg-amber-400"}`} style={{width:cb.total?`${(cb.correct/cb.total)*100}%`:"0%"}}/>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 w-12 text-right">{cb.correct}/{cb.total}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-1">Correct</p><p className="text-2xl font-black text-green-700 font-['Barlow_Condensed',sans-serif]">{r.totalCorrect}</p></div>
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">Wrong</p><p className="text-2xl font-black text-red-600 font-['Barlow_Condensed',sans-serif]">{r.totalWrong}</p></div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Overall Score</p><p className="text-2xl font-black text-slate-800 font-['Barlow_Condensed',sans-serif]">{r.overallScore}%</p></div>
            <div className={`rounded-xl border p-3 text-center ${r.pass?"bg-green-50 border-green-100":"bg-red-50 border-red-100"}`}><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</p><p className={`text-2xl font-black font-['Barlow_Condensed',sans-serif] ${r.pass?"text-green-700":"text-red-600"}`}>{r.pass?"PASS":"FAIL"}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
function CResultModal({r,onClose}:{r:CResult;onClose:()=>void;}){
  const c=recColor(r.recommendation);
  const colorCls={green:"bg-green-50 border-green-200 text-green-700",blue:"bg-blue-50 border-blue-200 text-blue-700",amber:"bg-amber-50 border-amber-200 text-amber-700",red:"bg-red-50 border-red-200 text-red-700"}[c]||"";
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{maxHeight:"90vh"}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <p className="font-bold text-slate-800">Compatibility Test — Result Detail</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Candidate Information</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {([["Full Name",r.name],["Email",r.email],["Phone",r.phone],["Gender",r.gender],["Date Taken",r.dateTaken],["Time Taken",r.timeTaken]] as [string,string][]).map(([l,v])=>(
                <div key={l}><p className="text-[10px] text-slate-400">{l}</p><p className="text-sm font-semibold text-slate-800 break-all">{v}</p></div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Category Scores</p>
            <div className="space-y-2.5">
              {r.categoryScores.map(cs=>(
                <div key={cs.category}><div className="flex items-center justify-between mb-0.5"><span className="text-xs text-slate-600">{cs.category}</span></div><ScoreBar score={cs.score}/></div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Overall Score</p><p className="text-2xl font-black text-slate-800 font-['Barlow_Condensed',sans-serif]">{r.overallScore}%</p></div>
            <div className={`rounded-xl border p-3 text-center ${colorCls}`}><p className="text-[10px] font-bold uppercase tracking-wider mb-1">Recommendation</p><p className="text-sm font-black leading-tight">{r.recommendation}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Table Pagination ───────────────────────────────────────── */
function TablePagination({page,total,perPage,onChange}:{page:number;total:number;perPage:number;onChange:(p:number)=>void;}){
  const pages=Math.ceil(total/perPage)||1;
  if(pages<=1)return null;
  return(
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <span className="text-xs text-slate-400">Showing {Math.min((page-1)*perPage+1,total)}–{Math.min(page*perPage,total)} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={()=>onChange(1)} disabled={page===1} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronsLeft size={14}/></button>
        <button onClick={()=>onChange(page-1)} disabled={page===1} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={14}/></button>
        {Array.from({length:Math.min(5,pages)},(_,i)=>{
          let p=Math.max(1,Math.min(pages-4,page-2))+i;
          return<button key={p} onClick={()=>onChange(p)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p===page?"bg-green-600 text-white":"text-slate-500 hover:bg-slate-100"}`}>{p}</button>;
        })}
        <button onClick={()=>onChange(page+1)} disabled={page===pages} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={14}/></button>
        <button onClick={()=>onChange(pages)} disabled={page===pages} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronsRight size={14}/></button>
      </div>
    </div>
  );
}

/* ─── Candidate Assessment Overlay ──────────────────────────── */
export function CandidateAssessment({
  type,
  questions: questionsProp,
  ownerId,
  onSubmitK,
  onSubmitC,
  onClose,
}:{
  type:"knowledge"|"compatibility";
  questions?:(KQuestion|CQuestion)[];
  ownerId?:string;
  onSubmitK?:(r:KResult)=>void;
  onSubmitC?:(r:CResult)=>void;
  onClose:()=>void;
}){
  type Phase="welcome"|"register"|"loading"|"assessment"|"success";
  const [phase,setPhase]=useState<Phase>("welcome");
  const [info,setInfo]=useState({name:"",email:"",phone:"",gender:"Male",confirm:false});
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [fetchErr,setFetchErr]=useState<string|null>(null);
  const [questions,setQuestions]=useState<(KQuestion|CQuestion)[]>(questionsProp??[]);
  const [answers,setAnswers]=useState<(number|null)[]>((questionsProp??[]).map(()=>null));
  const [currentQ,setCurrentQ]=useState(0);
  const [submitting,setSubmitting]=useState(false);

  /* Sync when questions prop changes (admin preview live reload) */
  useEffect(()=>{
    if(questionsProp!==undefined){
      setQuestions(questionsProp);
      setAnswers(questionsProp.map(()=>null));
      setCurrentQ(0);
    }
  },[questionsProp?.length]);

  const testLabel=type==="knowledge"?"Knowledge Test":"Compatibility Test";
  const totalQ=questions.length;

  /* ── Shared sticky header ── */
  const Hdr=({showClose=true}:{showClose?:boolean})=>(
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-10 shrink-0">
      <div>
        <p className="text-base font-black text-slate-900 font-['Barlow_Condensed',sans-serif]">Pondtora</p>
        <p className="text-xs text-slate-400">{testLabel}</p>
      </div>
      {showClose&&(
        <button onClick={onClose} className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors" title="Close">
          <X size={16}/>
        </button>
      )}
    </header>
  );

  /* ── Field validation ── */
  const validateInfo=()=>{
    const e:Record<string,string>={};
    if(!info.name.trim())e.name="Full name is required";
    if(!info.email.trim())e.email="Email address is required";
    else if(!/\S+@\S+\.\S+/.test(info.email))e.email="Please enter a valid email";
    if(!info.phone.trim())e.phone="Phone number is required";
    if(!info.confirm)e.confirm="Please confirm your information is accurate";
    setErrors(e);
    return Object.keys(e).length===0;
  };

  /* ── Continue: validate → fetch questions → open assessment ── */
  const handleContinue=async()=>{
    if(!validateInfo())return;
    setFetchErr(null);
    /* Admin preview: questions already supplied via props */
    if(questionsProp!==undefined){
      setPhase("assessment");
      return;
    }
    /* Public link: fetch from backend */
    setPhase("loading");
    try{
      const qs = await api.public.getQuestions(type, ownerId || "");
      const safeQs: any[] = Array.isArray(qs) ? qs : [];
      if (safeQs.length === 0) {
        throw new Error("No questions found for this assessment. Please contact the test administrator.");
      }
      setQuestions(safeQs);
      setAnswers(safeQs.map(()=>null));
      setCurrentQ(0);
      setPhase("assessment");
    }catch(e:any){
      setFetchErr(e.message||"Failed to load questions. Check your connection and try again.");
      setPhase("register");
    }
  };

  /* ── Submit ── */
  const handleSubmit=async()=>{
    if(submitting)return;
    setSubmitting(true);
    const ci={name:info.name.trim(),email:info.email.trim(),phone:info.phone.trim(),gender:info.gender};
    const result=type==="knowledge"
      ?calcKResult(ci,answers,questions as KQuestion[])
      :calcCResult(ci,answers,questions as CQuestion[]);
    if(ownerId){
      /* Public flow: save to Supabase via api.public */
      try{
        await api.public.submitResult(type, ownerId, result);
      }catch(e){console.warn("Result save failed",e);}
    }else{
      /* Admin preview: fire callbacks so parent can record & navigate */
      if(type==="knowledge")onSubmitK?.(result as KResult);
      else onSubmitC?.(result as CResult);
    }
    setSubmitting(false);
    setPhase("success");
  };

  /* ══ WELCOME ══════════════════════════════════════════════════ */
  if(phase==="welcome")return(
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-y-auto">
      <Hdr/>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mx-auto">
              <ClipboardList size={32} className="text-green-600"/>
            </div>
            <h1 className="text-2xl font-black text-slate-800">{testLabel}</h1>
            <p className="text-sm text-slate-500 leading-relaxed">Welcome to the Pondtora Staff Assessment Portal. Please complete this assessment honestly — your responses will be submitted to the organisation that invited you. It should take approximately 10–15 minutes.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {[["Assessment type",testLabel],["Estimated duration","10–15 minutes"],["Instructions","Select the best answer for each question"]].map(([l,v])=>(
              <div key={l} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">{l}</span>
                <span className="text-sm font-semibold text-slate-800 text-right">{v}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>setPhase("register")} className="w-full py-3.5 bg-[#00BB58] text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors shadow-sm">
            Start Assessment →
          </button>
        </div>
      </main>
    </div>
  );

  /* ══ REGISTER ═════════════════════════════════════════════════ */
  if(phase==="register")return(
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-y-auto">
      <Hdr/>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-5">
          <div>
            <h2 className="text-xl font-black text-slate-800">Candidate Information</h2>
            <p className="text-sm text-slate-400 mt-1">Please fill in your details. We will load the questions once you continue.</p>
          </div>
          {fetchErr&&(
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
              <X size={14} className="shrink-0 mt-0.5 text-red-500"/>
              <div><p className="font-semibold mb-0.5">Could not load questions</p><p>{fetchErr}</p></div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            {([["name","Full Name","text"],["email","Email Address","email"],["phone","Phone Number","tel"]] as [string,string,string][]).map(([field,label,inputType])=>(
              <div key={field}>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">{label}</label>
                <input
                  type={inputType}
                  value={(info as any)[field]}
                  onChange={e=>setInfo(p=>({...p,[field]:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&handleContinue()}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition ${errors[field]?"border-red-300 bg-red-50":"border-slate-200"}`}
                  placeholder={label}
                />
                {errors[field]&&<p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Gender</label>
              <select
                value={info.gender}
                onChange={e=>setInfo(p=>({...p,gender:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              >
                {["Male","Female","Prefer not to say"].map(g=><option key={g}>{g}</option>)}
              </select>
            </div>
            <div className={`flex items-start gap-3 p-3.5 rounded-xl border transition ${errors.confirm?"border-red-200 bg-red-50":"border-slate-100 bg-slate-50"}`}>
              <input type="checkbox" id="confirm-chk" checked={info.confirm} onChange={e=>setInfo(p=>({...p,confirm:e.target.checked}))} className="mt-0.5 w-4 h-4 accent-green-600"/>
              <label htmlFor="confirm-chk" className="text-sm text-slate-600 cursor-pointer leading-snug">I confirm that the information above is accurate and truthful.</label>
            </div>
            {errors.confirm&&<p className="text-xs text-red-500 -mt-2">{errors.confirm}</p>}
          </div>
          <button onClick={handleContinue} className="w-full py-3.5 bg-[#00BB58] text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors shadow-sm">
            Continue →
          </button>
          <button onClick={()=>{setErrors({});setFetchErr(null);setPhase("welcome");}} className="w-full py-2 text-sm text-slate-400 hover:text-slate-700 transition-colors">
            ← Back
          </button>
        </div>
      </main>
    </div>
  );

  /* ══ LOADING (fetching questions after Continue) ══════════════ */
  if(phase==="loading")return(
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col">
      <Hdr showClose={false}/>
      <main className="flex-1 flex flex-col items-center justify-center gap-5 p-6">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
          <ClipboardList size={28} className="text-green-600"/>
        </div>
        <div className="text-center">
          <p className="text-base font-black text-slate-800 mb-1">Loading Assessment</p>
          <p className="text-sm text-slate-400">Please wait while we prepare your questions…</p>
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i=>(
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-green-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>
          ))}
        </div>
      </main>
    </div>
  );

  /* ══ ASSESSMENT ═══════════════════════════════════════════════ */
  if(phase==="assessment"){
    /* No questions returned */
    if(totalQ===0)return(
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-y-auto">
        <Hdr/>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
              <ClipboardList size={28} className="text-slate-400"/>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 mb-2">No Questions Available</h2>
              <p className="text-sm text-slate-500 leading-relaxed">No questions are currently available for this assessment. Please contact the organisation that sent you this link for assistance.</p>
            </div>
            <button onClick={()=>setPhase("register")} className="w-full py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">← Back</button>
          </div>
        </main>
      </div>
    );

    const q=questions[currentQ];
    const opts:string[]=Array.isArray(q?.options)?q.options:[];
    const pct=Math.round(((currentQ+1)/totalQ)*100);
    const isLast=currentQ===totalQ-1;
    const unanswered=answers.filter(a=>a===null).length;

    return(
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col">
        <Hdr/>
        {/* Progress bar */}
        <div className="bg-white border-b border-slate-100 px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Question {currentQ+1} of {totalQ}</span>
            <span className="text-xs font-bold text-green-600">{pct}% complete</span>
          </div>
          <div className="bg-slate-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-[#00BB58] transition-all duration-300" style={{width:`${pct}%`}}/>
          </div>
        </div>
        {/* Question */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-start justify-center">
          <div className="max-w-lg w-full space-y-4">
            {q?(
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
                <div className="flex items-start gap-3 mb-5">
                  <span className="w-7 h-7 rounded-lg bg-green-100 text-green-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{currentQ+1}</span>
                  <p className="text-sm sm:text-base font-semibold text-slate-800 leading-snug">{q.text}</p>
                </div>
                <div className="space-y-2.5">
                  {opts.map((opt,oi)=>(
                    <label key={oi} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none ${answers[currentQ]===oi?"bg-green-50 border-green-300 shadow-sm":"border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                      <input type="radio" name={`q-${currentQ}`} checked={answers[currentQ]===oi} onChange={()=>setAnswers(p=>{const a=[...p];a[currentQ]=oi;return a;})} className="w-4 h-4 accent-green-600 shrink-0"/>
                      <span className={`text-sm leading-snug ${answers[currentQ]===oi?"text-green-800 font-semibold":"text-slate-700"}`}>{String.fromCharCode(65+oi)}. {opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ):(
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-400">Question unavailable</div>
            )}
            {isLast&&unanswered>0&&(
              <p className="text-xs text-slate-400 text-center">{unanswered} question{unanswered!==1?"s":""} left unanswered — you can still submit.</p>
            )}
          </div>
        </main>
        {/* Navigation footer */}
        <div className="bg-white border-t border-slate-100 px-4 sm:px-6 py-4 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={()=>setCurrentQ(p=>p-1)}
              disabled={currentQ===0}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <ChevronLeft size={16}/><span className="hidden sm:inline">Previous</span>
            </button>
            {/* Dot navigator — shows up to 15 questions */}
            {totalQ<=15&&(
              <div className="flex items-center gap-1 overflow-x-auto">
                {Array.from({length:totalQ},(_,i)=>(
                  <button
                    key={i}
                    onClick={()=>setCurrentQ(i)}
                    title={`Question ${i+1}`}
                    className={`w-6 h-6 rounded-full text-[10px] font-bold shrink-0 transition-colors ${i===currentQ?"bg-green-600 text-white":answers[i]!==null?"bg-green-100 text-green-700":"bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                  >{i+1}</button>
                ))}
              </div>
            )}
            {!isLast?(
              <button
                onClick={()=>setCurrentQ(p=>p+1)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-[#00BB58] text-white text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm"
              >
                <span className="hidden sm:inline">Next</span><ChevronRight size={16}/>
              </button>
            ):(
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#00BB58] text-white text-sm font-bold hover:bg-green-600 transition-colors shadow-sm disabled:opacity-60"
              >
                {submitting
                  ?<><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Saving…</>
                  :<><CheckCircle size={16}/>Submit Assessment</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ══ SUCCESS ══════════════════════════════════════════════════ */
  return(
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-y-auto">
      <Hdr showClose={false}/>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto ring-4 ring-green-50">
            <CheckCircle size={40} className="text-green-600"/>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800">Submitted Successfully!</h2>
            <p className="text-sm text-slate-500 leading-relaxed">Thank you for completing the <strong>{testLabel}</strong>. Your responses have been recorded and sent to the organisation for review.</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-xs text-green-700 text-left space-y-1">
            <p className="font-semibold">What happens next?</p>
            <p>The hiring team will review your results and contact you if your profile matches their requirements.</p>
          </div>
          <button onClick={onClose} className="w-full py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Close</button>
        </div>
      </main>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function EmployeeAssessmentsPage({
  kQuestions=[],cQuestions=[],kResults=[],cResults=[],
  onSaveKQuestions,onSaveCQuestions,onAddKResult,onAddCResult,ownerId=""
}:{
  kQuestions?:KQuestion[];cQuestions?:CQuestion[];kResults?:KResult[];cResults?:CResult[];
  onSaveKQuestions?:(qs:KQuestion[])=>void;onSaveCQuestions?:(qs:CQuestion[])=>void;
  onAddKResult?:(r:KResult)=>void;onAddCResult?:(r:CResult)=>void;
  ownerId?:string;
}){
  const [activeTab,setActiveTab]=useState<"compatibility"|"knowledge">("compatibility");

  /* Search */
  const [kSearch,setKSearch]=useState("");
  const [cSearch,setCSearch]=useState("");

  /* Modals */
  const [qManagerType,setQManagerType]=useState<"knowledge"|"compatibility"|null>(null);
  const [copyModal,setCopyModal]=useState<"knowledge"|"compatibility"|null>(null);
  const [candidateTest,setCandidateTest]=useState<"knowledge"|"compatibility"|null>(null);
  const [viewKResult,setViewKResult]=useState<KResult|null>(null);
  const [viewCResult,setViewCResult]=useState<CResult|null>(null);

  /* Dropdowns */
  const [testDropOpen,setTestDropOpen]=useState(false);
  const [copyDropOpen,setCopyDropOpen]=useState(false);
  const [testDropDir,setTestDropDir]=useState<{h:"left"|"right";v:"top"|"bottom"}>({h:"left",v:"top"});
  const [copyDropDir,setCopyDropDir]=useState<{h:"left"|"right";v:"top"|"bottom"}>({h:"right",v:"top"});
  const testDropRef=useRef<HTMLDivElement>(null);
  const copyDropRef=useRef<HTMLDivElement>(null);

  const calcDropDir=(ref:React.RefObject<HTMLDivElement|null>,dropW=200,dropH=120):{h:"left"|"right";v:"top"|"bottom"}=>{
    if(!ref.current)return{h:"left",v:"top"};
    const r=ref.current.getBoundingClientRect();
    const spaceRight=window.innerWidth-r.right;
    const spaceBottom=window.innerHeight-r.bottom;
    const h:("left"|"right")=spaceRight<dropW&&r.left>spaceRight?"right":"left";
    const v:("top"|"bottom")=spaceBottom<dropH?"bottom":"top";
    return{h,v};
  };

  const openTestDrop=()=>{
    if(!testDropOpen)setTestDropDir(calcDropDir(testDropRef,200,90));
    setTestDropOpen(v=>!v);setCopyDropOpen(false);
  };
  const openCopyDrop=()=>{
    if(!copyDropOpen)setCopyDropDir(calcDropDir(copyDropRef,210,90));
    setCopyDropOpen(v=>!v);setTestDropOpen(false);
  };

  /* Pagination */
  const [kPage,setKPage]=useState(1);
  const [cPage,setCPage]=useState(1);

  /* Close dropdowns on outside click */
  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      if(testDropRef.current&&!testDropRef.current.contains(e.target as Node))setTestDropOpen(false);
      if(copyDropRef.current&&!copyDropRef.current.contains(e.target as Node))setCopyDropOpen(false);
    };
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);

  /* Reset page when search changes */
  useEffect(()=>{setKPage(1);},[kSearch]);
  useEffect(()=>{setCPage(1);},[cSearch]);

  /* Filtered results */
  const filteredK=kResults.filter(r=>{
    const q=kSearch.toLowerCase();
    return!q||r.name.toLowerCase().includes(q)||r.email.toLowerCase().includes(q)||r.phone.includes(q);
  });
  const filteredC=cResults.filter(r=>{
    const q=cSearch.toLowerCase();
    return!q||r.name.toLowerCase().includes(q)||r.email.toLowerCase().includes(q)||r.phone.includes(q);
  });

  const kSlice=filteredK.slice((kPage-1)*PER_PAGE,kPage*PER_PAGE);
  const cSlice=filteredC.slice((cPage-1)*PER_PAGE,cPage*PER_PAGE);

  return(
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#f5f7fa] -mx-4 -mt-4 px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Staff Assessments</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage assessment questions, distribute links, and review candidate results.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {/* Test Questions dropdown */}
          <div className="relative" ref={testDropRef}>
            <button onClick={openTestDrop} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              <ClipboardList size={15}/> Test Questions <ChevronDown size={14} className={`transition-transform duration-200 ${testDropOpen?"rotate-180":""}`}/>
            </button>
            {testDropOpen&&(
              <div className={`absolute bg-white border border-slate-200 rounded-xl shadow-xl z-30 min-w-[180px] max-w-[90vw] py-1 overflow-hidden ${testDropDir.v==="bottom"?"bottom-full mb-1.5":"top-full mt-1.5"} ${testDropDir.h==="right"?"right-0":"left-0"}`}>
                {(["knowledge","compatibility"] as const).map(t=>(
                  <button key={t} onClick={()=>{setQManagerType(t);setTestDropOpen(false);}} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 font-medium">
                    {t==="knowledge"?"Knowledge Test":"Compatibility Test"}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Copy Link dropdown */}
          <div className="relative" ref={copyDropRef}>
            <button onClick={openCopyDrop} className="flex items-center gap-1.5 px-4 py-2 bg-[#00BB58] text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm">
              <Link size={15}/> Copy Test Link <ChevronDown size={14} className={`transition-transform duration-200 ${copyDropOpen?"rotate-180":""}`}/>
            </button>
            {copyDropOpen&&(
              <div className={`absolute bg-white border border-slate-200 rounded-xl shadow-xl z-30 min-w-[200px] max-w-[90vw] py-1 overflow-hidden ${copyDropDir.v==="bottom"?"bottom-full mb-1.5":"top-full mt-1.5"} ${copyDropDir.h==="right"?"right-0":"left-0"}`}>
                {(["knowledge","compatibility"] as const).map(t=>(
                  <button key={t} onClick={()=>{setCopyModal(t);setCopyDropOpen(false);}} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 font-medium">
                    {t==="knowledge"?"Knowledge Test":"Compatibility Test"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results section */}
      <Card>
        {/* Tabs */}
        <div className="px-5 pt-5 border-b border-slate-100">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-4">
            {(["compatibility","knowledge"] as const).map(t=>(
              <button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab===t?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-800"}`}>
                {t==="compatibility"?"Compatibility Test":"Knowledge Test"}
              </button>
            ))}
          </div>
        </div>

        {/* Compatibility Table */}
        {activeTab==="compatibility"&&(
          <>
            <div className="px-4 pt-4 pb-2">
              <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={cSearch} onChange={e=>setCSearch(e.target.value)} placeholder="Search by name, email, phone..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead><tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-[11px] text-slate-400 font-semibold w-10 text-center">#</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider sticky left-0 z-10 bg-slate-50">Candidate Name</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Overall Score</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Date Taken</th>
                  <th className="px-4 py-3 w-20"/>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {cSlice.length===0&&<tr><td colSpan={7} className="text-center text-xs text-slate-400 py-8">{cSearch?"No results match your search.":"No compatibility test results yet."}</td></tr>}
                  {cSlice.map((r,i)=>{
                    const col=recColor(r.recommendation);
                    const scoreCls=r.overallScore>=80?"text-green-600":r.overallScore>=65?"text-blue-600":r.overallScore>=50?"text-amber-600":"text-red-600";
                    return(
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 text-xs text-slate-400 text-center">{(cPage-1)*PER_PAGE+i+1}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800 sticky left-0 bg-white">{r.name}</td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">{r.email}</td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">{r.phone}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold font-['Barlow_Condensed',sans-serif] ${scoreCls}`}>{r.overallScore}%</span>
                            <Bdg label={r.recommendation} color={col as any}/>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">{r.dateTaken}</td>
                        <td className="px-4 py-3.5">
                          <button onClick={()=>setViewCResult(r)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-green-600 hover:bg-green-50 border border-green-200 transition-colors"><Eye size={12}/> View</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination page={cPage} total={filteredC.length} perPage={PER_PAGE} onChange={setCPage}/>
          </>
        )}

        {/* Knowledge Table */}
        {activeTab==="knowledge"&&(
          <>
            <div className="px-4 pt-4 pb-2">
              <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={kSearch} onChange={e=>setKSearch(e.target.value)} placeholder="Search by name, email, phone..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[680px]">
                <thead><tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-[11px] text-slate-400 font-semibold w-10 text-center">#</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider sticky left-0 z-10 bg-slate-50">Candidate Name</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Result</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Date Taken</th>
                  <th className="px-4 py-3 w-20"/>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {kSlice.length===0&&<tr><td colSpan={8} className="text-center text-xs text-slate-400 py-8">{kSearch?"No results match your search.":"No knowledge test results yet."}</td></tr>}
                  {kSlice.map((r,i)=>(
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-slate-400 text-center">{(kPage-1)*PER_PAGE+i+1}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 sticky left-0 bg-white">{r.name}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{r.email}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{r.phone}</td>
                      <td className="px-4 py-3.5 text-sm font-bold font-['Barlow_Condensed',sans-serif] text-slate-700">{r.overallScore}%</td>
                      <td className="px-4 py-3.5"><Bdg label={r.pass?"Pass":"Fail"} color={r.pass?"green":"red"}/></td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{r.dateTaken}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={()=>setViewKResult(r)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-green-600 hover:bg-green-50 border border-green-200 transition-colors"><Eye size={12}/> View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination page={kPage} total={filteredK.length} perPage={PER_PAGE} onChange={setKPage}/>
          </>
        )}
      </Card>

      {/* Question Manager */}
      {qManagerType==="knowledge"&&(
        <QuestionManager type="knowledge" questions={kQuestions} cats={K_CATS}
          onSave={qs=>{onSaveKQuestions&&onSaveKQuestions(qs as KQuestion[]);}} onClose={()=>setQManagerType(null)}/>
      )}
      {qManagerType==="compatibility"&&(
        <QuestionManager type="compatibility" questions={cQuestions} cats={C_CATS}
          onSave={qs=>{onSaveCQuestions&&onSaveCQuestions(qs as CQuestion[]);}} onClose={()=>setQManagerType(null)}/>
      )}

      {/* Copy Link Modal */}
      {copyModal&&(
        <CopyLinkModal type={copyModal} onClose={()=>setCopyModal(null)} ownerId={ownerId}
          onPreview={()=>{setCandidateTest(copyModal);setCopyModal(null);}}/>
      )}

      {/* Candidate Assessment Overlay */}
      {candidateTest&&(
        <CandidateAssessment
          type={candidateTest}
          questions={candidateTest==="knowledge"?kQuestions:cQuestions}
          onSubmitK={r=>{onAddKResult&&onAddKResult(r);setActiveTab("knowledge");setCandidateTest(null);}}
          onSubmitC={r=>{onAddCResult&&onAddCResult(r);setActiveTab("compatibility");setCandidateTest(null);}}
          onClose={()=>setCandidateTest(null)}
        />
      )}

      {/* Result Detail Modals */}
      {viewKResult&&<KResultModal r={viewKResult} onClose={()=>setViewKResult(null)}/>}
      {viewCResult&&<CResultModal r={viewCResult} onClose={()=>setViewCResult(null)}/>}
    </div>
  );
}
