import React, { useState, useEffect, useRef } from "react";
import { Menu, X, ArrowRight, Star, CheckCircle, ChevronDown, Fish } from "lucide-react";
const imgAboutFarmer = "https://images.unsplash.com/photo-1768248559000-0775a51b0413?crop=entropy&cs=tinysrgb&fit=max&fm=webp&w=1200&q=80";

const TESTIMONIAL_AVATAR_1 = "https://images.unsplash.com/photo-1533108344127-a586d2b02479?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200";
const TESTIMONIAL_AVATAR_2 = "https://images.unsplash.com/photo-1756588534346-e8899364757b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200";
const TESTIMONIAL_AVATAR_3 = "https://images.unsplash.com/photo-1504199367641-aba8151af406?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200";
const TESTIMONIAL_AVATAR_4 = "https://images.unsplash.com/photo-1573497019189-90a00bb1f26f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200";
import {
  EVERY_PLAN_INCLUDES,
  useDynamicPlans,
  yearlyPrice,
} from "../pricingData";

interface Props { onLogin: () => void; onSignup: () => void; onAdmin?: () => void; }

const NAV_LINKS = [
  { label: "Home", href: "home" },
  { label: "About Us", href: "about" },
  { label: "Features", href: "features" },
  { label: "Pricing", href: "pricing" },
  { label: "FAQ", href: "faq" },
];

/* ── Fade-in on scroll ── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return { ref, v };
}
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, v } = useFadeIn();
  return (
    <div ref={ref} className={className}
      style={{ transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`, opacity: v ? 1 : 0, transform: v ? "none" : "translateY(20px)" }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MINI-MOCKUPS — coded app-screen previews
   ═══════════════════════════════════════════════ */

function MockRow({ label, val, green }: { label: string; val: string; green?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-[10px]">
      <span className="text-slate-500 truncate mr-2">{label}</span>
      <span className={`font-semibold shrink-0 ${green ? "text-green-600" : "text-slate-800"}`}>{val}</span>
    </div>
  );
}
function MockBadge({ label, color }: { label: string; color: "green" | "amber" | "blue" | "slate" }) {
  const cls = { green: "bg-green-100 text-green-700", amber: "bg-amber-100 text-amber-700", blue: "bg-blue-100 text-blue-700", slate: "bg-slate-100 text-slate-600" }[color];
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
}
function MockBar({ pct, color = "bg-green-500" }: { pct: number; color?: string }) {
  return <div className="w-full bg-slate-100 rounded-full h-1.5 mt-0.5"><div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>;
}

function MockFinancial() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-50 rounded-lg p-2"><p className="text-green-600 font-semibold text-[9px] mb-0.5">Revenue</p><p className="text-green-700 font-bold text-xs">₦580,000</p></div>
        <div className="bg-red-50 rounded-lg p-2"><p className="text-red-500 font-semibold text-[9px] mb-0.5">Expenses</p><p className="text-red-600 font-bold text-xs">₦320,000</p></div>
      </div>
      <div>
        <p className="text-slate-400 text-[9px] mb-1">Monthly Overview</p>
        <div className="flex items-end gap-1 h-10">
          {[45, 62, 38, 75, 55, 80].map((h, i) => <div key={i} className="flex-1 bg-green-500 rounded-t-sm opacity-80" style={{ height: `${h}%` }} />)}
        </div>
        <div className="flex justify-between text-[8px] text-slate-300 mt-0.5">
          {["J","F","M","A","M","J"].map((m, i) => <span key={i}>{m}</span>)}
        </div>
      </div>
      <MockRow label="Net Profit" val="₦260,000" green />
    </div>
  );
}

function MockPond() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-1.5 shadow-sm">
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Active Ponds</p>
      {[{n:"Pond A",s:"Catfish",c:"850 fish"},{n:"Pond B",s:"Tilapia",c:"620 fish"},{n:"Pond C",s:"Catfish",c:"430 fish"}].map(p => (
        <div key={p.n} className="flex items-center gap-2 py-1 border-b border-slate-50 last:border-0">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <div className="flex-1 min-w-0 text-[10px]">
            <p className="font-semibold text-slate-800">{p.n} <span className="font-normal text-slate-400">· {p.s}</span></p>
            <p className="text-slate-400">{p.c}</p>
          </div>
          <MockBadge label="Active" color="green" />
        </div>
      ))}
    </div>
  );
}

function MockFeedStock() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Feed Inventory</p>
      <div className="grid grid-cols-4 gap-1 text-[8px] text-slate-400 font-semibold mb-1">
        {["Brand","Size","Bags","kg"].map(h => <span key={h}>{h}</span>)}
      </div>
      {[["Coppens","3.0mm","24","480"],["Vital","2.0mm","12","240"],["Durante","1.5mm","8","120"]].map(([b,s,bags,kg]) => (
        <div key={b} className="grid grid-cols-4 gap-1 py-1 border-b border-slate-50 last:border-0 text-[10px]">
          <span className="text-slate-700 font-semibold">{b}</span>
          <span className="text-slate-500">{s}</span>
          <span className="text-slate-600">{bags}</span>
          <span className="text-green-600 font-semibold">{kg}kg</span>
        </div>
      ))}
      <div className="mt-2 flex items-center justify-between text-[9px] bg-green-50 rounded-lg px-2 py-1.5">
        <span className="text-green-600 font-semibold">Total Stock</span>
        <span className="text-green-700 font-bold">840 kg</span>
      </div>
    </div>
  );
}

function MockFeeding() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Today's Feeding Log</p>
      <div className="grid grid-cols-4 gap-1 text-[8px] text-slate-400 font-semibold mb-1">
        {["Pond","Brand","AM","PM"].map(h => <span key={h}>{h}</span>)}
      </div>
      {[["Pond A","Coppens","2.5","2.5"],["Pond B","Vital","3.0","3.0"],["Pond C","Coppens","1.8","1.8"]].map(([pond,brand,am,pm]) => (
        <div key={pond} className="grid grid-cols-4 gap-1 py-1 border-b border-slate-50 last:border-0 text-[10px]">
          <span className="text-slate-700 font-semibold">{pond}</span>
          <span className="text-slate-500">{brand}</span>
          <span className="text-slate-600">{am}kg</span>
          <span className="text-green-600 font-semibold">{pm}kg</span>
        </div>
      ))}
      <div className="mt-2 text-[9px] text-slate-400 flex justify-between">
        <span>Total fed today</span><span className="font-bold text-slate-700">15.1 kg</span>
      </div>
    </div>
  );
}

function MockInvoice() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-slate-800 text-[10px]">INV-024</p>
        <MockBadge label="Paid" color="green" />
      </div>
      <p className="text-slate-400 text-[9px] mb-2">Musa Farms · Jun 25, 2026</p>
      <div className="border border-slate-100 rounded-lg overflow-hidden mb-2">
        <div className="grid grid-cols-3 gap-1 text-[8px] text-slate-400 font-semibold bg-slate-50 px-2 py-1">{["Item","Qty","Total"].map(h=><span key={h}>{h}</span>)}</div>
        <div className="grid grid-cols-3 gap-1 px-2 py-1.5 text-[10px]">
          <span className="text-slate-700">Catfish</span><span className="text-slate-500">500 kg</span><span className="text-slate-800 font-semibold">₦425,000</span>
        </div>
      </div>
      <div className="flex justify-between font-bold text-[9px]">
        <span className="text-slate-500">Grand Total</span><span className="text-green-600">₦425,000</span>
      </div>
    </div>
  );
}

function MockReports() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Farm Reports</p>
      {[{t:"Daily Report — Jun 25",type:"Daily",s:"Open",c:"amber"},{t:"Weekly Summary — Jun 23",type:"Weekly",s:"Resolved",c:"green"},{t:"Monthly — May 2026",type:"Monthly",s:"Resolved",c:"green"}].map(r=>(
        <div key={r.t} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-[10px] truncate">{r.t}</p>
            <MockBadge label={r.type} color="blue" />
          </div>
          <MockBadge label={r.s} color={r.c as "green"|"amber"} />
        </div>
      ))}
    </div>
  );
}

function MockStaff() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Staff Members</p>
      {[{n:"Ahmed Ibrahim",r:"Farm Manager",s:"Active"},{n:"Bola Adeyemi",r:"Feeding Staff",s:"Active"},{n:"Grace Nwosu",r:"General Staff",s:"Pending"}].map(s=>(
        <div key={s.n} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[8px] font-bold text-green-700 shrink-0">{s.n[0]}</div>
          <div className="flex-1 min-w-0 text-[10px]">
            <p className="font-semibold text-slate-800">{s.n}</p>
            <p className="text-slate-400">{s.r}</p>
          </div>
          <MockBadge label={s.s} color={s.s==="Active"?"green":"amber"} />
        </div>
      ))}
    </div>
  );
}

function MockAssessments() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Assessment Results</p>
      <div className="space-y-2">
        {[{n:"Aminu Garba",t:"Knowledge",sc:86,pass:true},{n:"Fatima Bello",t:"Compatibility",sc:87,pass:null},{n:"Chidi Okonkwo",t:"Knowledge",sc:57,pass:false}].map(a=>(
          <div key={a.n} className="border border-slate-100 rounded-lg p-2">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-slate-800 text-[10px]">{a.n}</p>
              {a.pass!==null?<MockBadge label={a.pass?"Pass":"Fail"} color={a.pass?"green":"amber"}/>:<MockBadge label="Recommended" color="green"/>}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-400 mb-1">
              <span>{a.t}</span><span>·</span><span className="font-semibold text-slate-600">{a.sc}%</span>
            </div>
            <MockBar pct={a.sc} color={a.sc>=70?"bg-green-500":"bg-amber-400"} />
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  { title: "Financial Dashboard", desc: "See exactly how much your farm is earning and spending. Know your profit at the end of every month without needing an accountant or exercise book.", bullets: ["Record every expense and income on your farm", "See which part of your farm costs you the most money", "Check your profit or loss for any month", "Download your financial records as Excel or PDF"], Mockup: MockFinancial },
  { title: "Pond Management", desc: "Keep proper records for every pond on your farm — from the day you stock fish to the day you harvest. No more losing records or relying on memory.", bullets: ["Add and track all your ponds in one place", "Record fish stocking, growth, and full pond history", "Log fish deaths and any medical treatments given", "Move fish between ponds and keep a record of the transfer"], Mockup: MockPond },
  { title: "Feed Stock", desc: "Always know how much feed you have on your farm. Track every bag you buy, what type it is, and how much is remaining so you are never caught off guard.", bullets: ["See how many bags of feed you have at any time", "Record every feed purchase with price and supplier details", "Track total kilograms available per feed type", "Know exactly how much feed your farm needs and what it will cost"], Mockup: MockFeedStock },
  { title: "Feeding Records", desc: "Record exactly how much feed is given to each pond every morning and evening. Your staff can log feeding from their phone, and you can check it from anywhere — even when you are not on the farm.", bullets: ["Log morning and evening feed amounts for each pond", "Track the number of feed bags opened each day", "See total feed used per pond at any time", "Download feeding records as a report whenever you need it"], Mockup: MockFeeding },
  { title: "Sales & Invoicing", desc: "Create proper sale documents for every fish you sell. Know which customers have paid and who still owes you money — all organized in one place so nothing slips through.", bullets: ["Create and send professional invoices to your buyers", "Manage your customer list with different price groups", "See clearly which invoices are paid and which are outstanding", "Download invoices as PDF to share with customers"], Mockup: MockInvoice },
  { title: "Reports & Analytics", desc: "Your staff submit a report at the end of each work day before leaving the farm. The system collects all these reports and organizes them into daily, weekly, and monthly summaries — so you always know exactly what happened on your farm.", bullets: ["Staff submit their end-of-day report before leaving the farm", "View daily, weekly, and monthly farm summaries in one place", "See feed usage, pond activity, and staff updates together", "Quickly spot problems on your farm before they become costly"], Mockup: MockReports },
  { title: "Staff Management", desc: "Add your farm workers to the system, give each one a role, and choose exactly what they can see and do on the app. You stay in control — staff can only access the parts you allow them to.", bullets: ["Add staff members and assign their job roles", "Set exact permissions for each team member", "Assign staff to specific farms you manage", "Update or remove staff access at any time"], Mockup: MockStaff },
  { title: "Staff Assessments", desc: "Before hiring or after training, use this tool to test how much a candidate or staff member knows about fish farming — and whether they will be a good fit for your team.", bullets: ["Test farming knowledge with practical, real-world questions", "Check work attitude and personality fit with 100 questions", "Get a full score breakdown by category", "Share the test link directly with candidates by email or WhatsApp"], Mockup: MockAssessments },
];

const TESTIMONIALS = [
  { name: "Chukwuemeka Okafor", role: "Catfish Farm Owner, Enugu", avatar: TESTIMONIAL_AVATAR_1, quote: "Before Pondtora, I was using exercise books and it was always a mess. Now everything is on my phone — feeding, expenses, stock. My staff cannot play with the records again." },
  { name: "Fatima Abdullahi", role: "Fish Farmer, Kano", avatar: TESTIMONIAL_AVATAR_2, quote: "Honestly, I was not sure at first but after one week I could see the difference. I now know exactly how many bags of feed we open every day. No more confusion." },
  { name: "Emeka Nwosu", role: "Commercial Fish Farmer, Lagos", avatar: TESTIMONIAL_AVATAR_3, quote: "I manage three farms and I used to miss things every week. Now my managers log everything and I see it all from my phone. My feed costs have gone down because nothing is wasted." },
  { name: "Aisha Musa", role: "Fish Farm Manager, Abuja", avatar: TESTIMONIAL_AVATAR_4, quote: "The staff reports feature alone is worth it. I know everything that happened on the farm every day — who fed, how much, what problems came up. No more stories." },
];

const FAQ_ITEMS = [
  { q: "Do I need a computer to use Pondtora?", a: "No. Pondtora works on any smartphone. Your staff can record feeding, submit reports, and track stock from their phones. You can review everything from your own phone or any computer." },
  { q: "Does it work for catfish farming?", a: "Yes. Pondtora is built specifically for catfish and tilapia farmers in Nigeria. It supports earthen, concrete, and tarpaulin ponds of any size." },
  { q: "Can my staff use it too, or only me?", a: "Both. You add your staff to the system, set exactly what each person can see and do, and they log in with their own email and password. You stay in control of who has access to what." },
  { q: "What happens after the 30-day free trial?", a: "After the trial you pick a plan that fits your farm size. Plans start at ₦3,000 per month. There is no credit card required to start the trial." },
  { q: "Is my farm data safe?", a: "Yes. Your data is stored securely in the cloud and only you and your authorized staff can see it. We do not share your information with anyone." },
  { q: "Can I use Pondtora if I am not tech-savvy?", a: "Pondtora is designed to be simple. If you can use WhatsApp, you can use Pondtora. Our support team is available to help you get started if you need assistance." },
];

export default function LandingPage({ onLogin, onSignup, onAdmin }: Props) {
  const { singleFarmPlans, multiFarmPlans } = useDynamicPlans();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [planTab, setPlanTab] = useState<"single" | "multi">("single");
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };
  const dp = (mp: number) => billing === "yearly" ? yearlyPrice(mp) : mp;
  const periodLabel = billing === "yearly" ? "/yr" : "/mo";

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'Barlow', sans-serif" }}>

      {/* ── NAVBAR ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white shadow-sm border-b border-slate-100" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="font-semibold text-[24px] leading-none text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Pondtora</span>
          </div>
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)} className="text-slate-700 text-[15px] font-medium hover:text-green-600 transition-colors">{l.label}</button>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={onLogin} className="px-5 py-2 rounded-xl border border-green-600 text-green-600 text-[14px] font-semibold hover:bg-green-50 transition-all">Login</button>
            <button onClick={onSignup} className="px-5 py-2 rounded-xl bg-green-600 text-white text-[14px] font-semibold hover:bg-green-700 transition-all shadow-md shadow-green-100">Try Free for 30 Days</button>
          </div>
          <button className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-5 pb-6 pt-3 flex flex-col gap-1">
            {NAV_LINKS.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)} className="text-left py-3 px-2 text-[16px] font-medium hover:text-green-600 border-b border-slate-50 last:border-0">{l.label}</button>
            ))}
            <div className="flex flex-col gap-2.5 pt-4">
              <button onClick={onLogin} className="w-full py-3 rounded-xl border border-green-600 text-green-600 text-[15px] font-semibold">Login</button>
              <button onClick={onSignup} className="w-full py-3 rounded-xl bg-green-600 text-white text-[15px] font-semibold">Try Free for 30 Days</button>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-white pt-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 w-full py-16 lg:py-24 relative z-10">
          <div className="max-w-3xl" style={{ animation: "lpFadeUp 0.75s ease both" }}>
            <span className="inline-block text-[13px] font-semibold text-green-900 border border-green-900/30 bg-green-50 px-3 py-1.5 rounded-lg mb-6">
              #1 Fish Farm Management Platform in Nigeria
            </span>
            <h1 className="mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(40px, 5.5vw, 72px)", lineHeight: 1.03, letterSpacing: "-0.01em" }}>
              <span className="font-semibold text-slate-900">Stop Running Your Fish Farm</span>
              <br />
              <span style={{ color: "#4b8c6e" }}>on Exercise Books and WhatsApp.</span>
            </h1>
            <p className="text-slate-600 text-xl leading-relaxed max-w-2xl mb-8">
              Pondtora keeps all your farm records in one place — ponds, feeding, feed stock, expenses, staff, sales, and reports. Know exactly what is happening on your farm, even when you are not there.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <button onClick={onSignup}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-green-600 text-white text-[16px] font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200/60">
                Start Free for 30 Days <ArrowRight size={17} />
              </button>
              <button onClick={onLogin}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-200 text-slate-700 text-[16px] font-semibold hover:border-green-600 hover:text-green-600 transition-all">
                Sign In to My Account
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#f59e0b" stroke="none" />)}</div>
                <p className="text-sm text-slate-500 font-medium">4.9 / 5 from farmers</p>
              </div>
              <span className="w-px h-4 bg-slate-200 hidden sm:block" />
              <p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">No credit card</span> required to start</p>
              <span className="w-px h-4 bg-slate-200 hidden sm:block" />
              <p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">Works on any phone</span> — Android or iPhone</p>
            </div>
          </div>
        </div>

      </section>

      {/* ── Social proof bar (separate section, no overlap) ── */}
      <div className="bg-white border-t border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6 flex flex-wrap justify-start gap-x-10 gap-y-4">
          {[
            { num: "100+", label: "Active farms" },
            { num: "2,500+", label: "Ponds tracked" },
            { num: "30 days", label: "Free trial" },
            { num: "24/7", label: "Access from any device" },
          ].map(s => (
            <div key={s.num} className="flex flex-col items-start min-w-[120px]">
              <p className="font-bold text-green-700 text-2xl leading-none mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{s.num}</p>
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 bg-[#f0fdf4]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <span className="text-[13px] font-semibold text-green-700 border border-green-700/30 bg-green-50 px-3 py-1.5 rounded-lg inline-block mb-4">How It Works</span>
              <h2 className="font-semibold text-slate-900 tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(30px, 4vw, 48px)" }}>
                Get started in 3 simple steps
              </h2>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create your free account", desc: "Sign up with your email in under two minutes. No credit card. No complicated setup. Your 30-day trial starts immediately." },
              { step: "02", title: "Add your ponds and staff", desc: "Enter your ponds, fish stock, and invite your farm workers. Give each staff member only the access they need — feeding staff, managers, or admin." },
              { step: "03", title: "Manage your farm from anywhere", desc: "Your staff record feeding and submit daily reports. You see everything on your phone in real time — expenses, feed, ponds, invoices, and staff activity." },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="flex flex-col gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xl" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{item.step}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-[20px] mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{item.title}</h3>
                    <p className="text-slate-600 text-[15px] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={300}>
            <div className="mt-12 text-center">
              <button onClick={onSignup} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-green-600 text-white text-[15px] font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100">
                Get Started Free <ArrowRight size={16} />
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── ABOUT US ── */}
      <section id="about" className="py-20 lg:py-28 bg-[#f0fdf4] overflow-hidden border-y border-green-100/60">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Image Container — neatly framed beside the text */}
            <FadeIn className="lg:col-span-5 order-2 lg:order-1">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative rounded-2xl overflow-hidden shadow-xl shadow-green-900/10 border border-green-200/60 aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5] max-h-[460px] bg-emerald-900/10">
                  <img
                    src={imgAboutFarmer}
                    alt="Fish farmer holding fresh catch"
                    className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-3.5 -right-3.5 bg-white/95 backdrop-blur-sm border border-green-100 rounded-xl px-4 py-3 shadow-lg hidden sm:flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">
                    <Fish size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Built For Fish Farmers</p>
                    <p className="text-[11px] text-slate-500">Real-time farm clarity</p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Text — RIGHT column */}
            <FadeIn delay={100} className="lg:col-span-7 order-1 lg:order-2 flex flex-col justify-center">
              <span className="text-green-700 font-bold text-[12px] uppercase tracking-widest border border-green-600/30 bg-green-100/70 px-3 py-1.5 rounded-lg inline-block w-fit mb-4">
                About Us
              </span>
              <h2 className="font-semibold text-green-950 leading-tight mb-6"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(30px, 3.5vw, 46px)" }}>
                Built for the African fish farmer
              </h2>
              <div className="space-y-4 text-slate-700 text-[15.5px] lg:text-[17px] leading-relaxed">
                <p>
                  Pondtora is a farm management platform built to help fish farmers manage their entire operation from one place — without exercise books, spreadsheets, or WhatsApp groups.
                </p>
                <p>
                  From pond and fish stock management to <strong className="text-green-950 font-semibold">feed inventory, feeding records, finances, sales, invoices, reports, and staff management,</strong> Pondtora keeps your farm organized and your records always accessible.
                </p>
                <div className="pt-2">
                  <p className="text-green-800 font-medium bg-white/80 border border-green-200/80 rounded-xl p-4 shadow-sm text-[14.5px] lg:text-[15.5px]">
                    💡 <strong className="text-green-900">Our goal:</strong> help farmers spend less time on paperwork and more time making better decisions for their farms.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <FadeIn>
            <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-16">
              <div className="max-w-lg">
                <span className="text-[13px] font-semibold text-slate-600 border border-slate-400/40 bg-slate-50 px-3 py-1.5 rounded-lg inline-block mb-5">What we offer</span>
                <h2 className="font-semibold text-slate-900 leading-tight tracking-tight"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(34px, 4vw, 56px)" }}>
                  Everything you need to run a professional fish farm
                </h2>
              </div>
              <p className="text-slate-500 text-[17px] leading-relaxed max-w-md lg:mt-8">
                Pondtora brings every aspect of your fish farm — from daily feeding logs to financial reporting — into a single, easy-to-use system.
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={Math.min(i * 50, 200)}>
                <div className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-green-50/60 hover:-translate-y-1 transition-all duration-300 border border-slate-100 hover:border-green-200 h-full">
                  <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-400 shrink-0" />
                  <div className="flex flex-col sm:flex-row flex-1">
                    {/* Text */}
                    <div className="flex-1 p-6 lg:p-7 flex flex-col gap-4">
                      <div>
                        <span className="text-[11px] font-bold text-green-600 uppercase tracking-widest">{String(i + 1).padStart(2, "0")}</span>
                        <h3 className="font-semibold text-slate-900 text-[22px] leading-tight mt-1 mb-2"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{f.title}</h3>
                        <p className="text-slate-500 text-[13.5px] leading-relaxed">{f.desc}</p>
                      </div>
                      <ul className="flex flex-col gap-2 mt-auto">
                        {f.bullets.map((b, j) => (
                          <li key={j} className="flex items-start gap-2.5">
                            <span className="w-[3px] h-3 bg-green-500 rounded-sm shrink-0 mt-0.5" />
                            <span className="text-slate-600 text-[13px] font-medium leading-relaxed">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Mockup panel */}
                    <div className="sm:w-[210px] shrink-0 flex items-center justify-center p-5 border-t sm:border-t-0 sm:border-l border-slate-100"
                      style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 60%, #f8fafc 100%)" }}>
                      <f.Mockup />
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 bg-[#f0fdf4]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <span className="text-[13px] font-semibold text-slate-600 border border-slate-400/40 bg-white px-3 py-1.5 rounded-lg inline-block mb-4">Testimonials</span>
              <h2 className="font-medium text-slate-900 tracking-tight"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(30px, 4vw, 46px)" }}>
                What Nigerian farmers are saying
              </h2>
              <p className="text-slate-500 text-base mt-3 max-w-md mx-auto">Real stories from fish farmers who switched from exercise books to Pondtora.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={i} delay={Math.min(i * 80, 200)}>
                <div className="bg-white rounded-2xl p-8 flex flex-col gap-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow h-full">
                  <div className="flex gap-1">{[1,2,3,4,5].map(s => <Star key={s} size={16} fill="#f59e0b" stroke="none" />)}</div>
                  <p className="text-slate-800 text-[17px] leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-4 border-t border-slate-100 pt-5">
                    <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-green-100" />
                    <div>
                      <p className="font-bold text-slate-900 text-[14px]">{t.name}</p>
                      <p className="text-slate-400 text-[13px]">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-5 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="text-[13px] font-semibold text-slate-600 border border-slate-400/40 bg-slate-50 px-3 py-1.5 rounded-lg inline-block mb-4">FAQ</span>
              <h2 className="font-semibold text-slate-900 tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(30px, 4vw, 48px)" }}>
                Common questions
              </h2>
            </div>
          </FadeIn>
          <div className="divide-y divide-slate-100">
            {FAQ_ITEMS.map((item, i) => (
              <FadeIn key={i} delay={i * 50}>
                <div className="py-5">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-start justify-between gap-4 text-left group">
                    <span className="text-slate-900 font-semibold text-[16px] leading-snug group-hover:text-green-700 transition-colors">{item.q}</span>
                    <ChevronDown size={18} className={`shrink-0 mt-0.5 text-slate-400 transition-transform duration-200 ${openFaq === i ? "rotate-180 text-green-600" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <p className="mt-3 text-slate-600 text-[15px] leading-relaxed pr-8">{item.a}</p>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12 flex flex-col items-center gap-4">
              <span className="text-[13px] font-semibold text-slate-600 border border-slate-400/40 bg-slate-50 px-3 py-1.5 rounded-lg">Pricing</span>
              <h2 className="font-medium text-slate-900 tracking-tight"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(30px, 4vw, 50px)" }}>
                Simple, transparent pricing
              </h2>
              <p className="text-slate-500 text-base max-w-sm">Start free. Upgrade when you are ready. Cancel anytime.</p>

              {/* Plan type tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {(["single","multi"] as const).map(tab => (
                  <button key={tab} onClick={() => setPlanTab(tab)}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${planTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    {tab === "single" ? "Single Farm" : "Multiple Farms"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 -mt-2">
                {planTab === "single" ? "Manage one farm — plans based on number of ponds." : "Manage multiple farms under one account. Unlimited ponds per farm."}
              </p>

              {/* Billing toggle */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
                {(["monthly","yearly"] as const).map(b => (
                  <button key={b} onClick={() => setBilling(b)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billing === b ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>
                    {b === "yearly"
                      ? <span className="flex items-center gap-2">Yearly <span className="bg-green-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">Save 20%</span></span>
                      : "Monthly"}
                  </button>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Single farm plans */}
          {planTab === "single" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {singleFarmPlans.map((plan, i) => (
                <FadeIn key={i} delay={i * 70}>
                  <div className={`rounded-2xl border-2 overflow-hidden flex flex-col h-full bg-white ${plan.color}`}>
                    {plan.badge && (
                      <div className={`text-center text-[12px] font-bold py-2 tracking-wide ${plan.badge === "Popular" ? "bg-green-600 text-white" : "bg-orange-500 text-white"}`}>
                        {plan.badge}
                      </div>
                    )}
                    <div className="p-6 flex flex-col gap-5 flex-1">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">{plan.name}</p>
                        <p className="text-sm font-semibold text-green-600 mb-3">{plan.limit}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="font-extrabold text-slate-900 text-[36px] leading-none"
                            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                            ₦{dp(plan.monthlyPrice).toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-sm">{periodLabel}</span>
                        </div>
                        {billing === "yearly" && (
                          <p className="text-xs text-green-600 mt-1">Save ₦{(plan.yearlySaving || (plan.monthlyPrice * 12 * 0.2)).toLocaleString()} per year</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">{plan.desc}</p>
                      </div>
                      <ul className="flex flex-col gap-2 border-t border-slate-100 pt-4 flex-1">
                        {plan.name === "Starter"
                          ? EVERY_PLAN_INCLUDES.map(f => (
                              <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                                <CheckCircle size={12} className="text-green-500 shrink-0" />{f}
                              </li>
                            ))
                          : plan.name === "Growth"
                          ? [
                              <li key="a" className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Everything in Starter</li>,
                              <li key="b" className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Up to 15 active ponds</li>,
                            ]
                          : [
                              <li key="a" className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Everything in Growth</li>,
                              <li key="b" className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Unlimited active ponds</li>,
                            ]
                        }
                      </ul>
                      <button onClick={onSignup}
                        className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all ${plan.badge === "Popular" ? "bg-green-600 text-white hover:bg-green-700 shadow-sm" : plan.badge === "Best Value" ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm" : "border border-green-600 text-green-600 hover:bg-green-50"}`}>
                        Start Free Trial
                      </button>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}

          {/* Multi farm plans */}
          {planTab === "multi" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {multiFarmPlans.map((plan, i) => (
                <FadeIn key={i} delay={i * 70}>
                  <div className={`rounded-2xl border-2 overflow-hidden flex flex-col h-full bg-white ${plan.color}`}>
                    {plan.badge && (
                      <div className={`text-center text-[12px] font-bold py-2 tracking-wide ${plan.badge === "Popular" ? "bg-green-600 text-white" : "bg-orange-500 text-white"}`}>
                        {plan.badge}
                      </div>
                    )}
                    <div className="p-6 flex flex-col gap-5 flex-1">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">{plan.name}</p>
                        <p className="text-sm font-semibold text-green-600 mb-3">{plan.farms} · Unlimited ponds/farm</p>
                        <div className="flex items-baseline gap-1">
                          <span className="font-extrabold text-slate-900 text-[36px] leading-none"
                            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                            ₦{dp(plan.monthlyPrice).toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-sm">{periodLabel}</span>
                        </div>
                        {billing === "yearly" && (
                          <p className="text-xs text-green-600 mt-1">Save ₦{(plan.monthlyPrice * 12 * 0.2).toLocaleString()} per year</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">{plan.desc}</p>
                      </div>
                      <ul className="flex flex-col gap-2 border-t border-slate-100 pt-4 flex-1">
                        {plan.farmLimit === 3
                          ? [...EVERY_PLAN_INCLUDES, "Unlimited active ponds per farm"].map(f => (
                              <li key={f} className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />{f}</li>
                            ))
                          : plan.farmLimit === 5
                          ? [
                              <li key="a" className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Everything in the 3-Farm Plan</li>,
                              <li key="b" className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Up to 5 farms</li>,
                            ]
                          : [
                              <li key="a" className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Everything in the 5-Farm Plan</li>,
                              <li key="b" className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle size={12} className="text-green-500 shrink-0" />Unlimited farms</li>,
                            ]
                        }
                      </ul>
                      <button onClick={onSignup}
                        className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all ${plan.badge === "Popular" ? "bg-green-600 text-white hover:bg-green-700 shadow-sm" : plan.badge === "Best Value" ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm" : "border border-green-600 text-green-600 hover:bg-green-50"}`}>
                        Start Free Trial
                      </button>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-5 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="relative rounded-3xl overflow-hidden" style={{ background: "#093628" }}>
              <div className="absolute inset-0">
                <img src={imgAboutFarmer} alt="" className="w-full h-full object-cover opacity-20" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(9,54,40,0.85), rgba(9,54,40,0.4))" }} />
              </div>
              <div className="relative z-10 px-8 lg:px-16 py-20 max-w-2xl">
                <span className="text-green-400 text-xs font-bold uppercase tracking-widest block mb-4">Ready to Start?</span>
                <h2 className="text-white font-semibold leading-tight mb-5"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(30px, 4vw, 54px)" }}>
                  Stop Losing Money Because of Poor Farm Records.
                </h2>
                <p className="text-green-100 text-lg leading-relaxed mb-3 max-w-md">
                  Every day you manage your farm on paper or WhatsApp is a day you risk losing money to errors, stolen feed, untracked expenses, or staff that cannot be held accountable.
                </p>
                <p className="text-green-200 text-base leading-relaxed mb-8 max-w-md">
                  Pondtora fixes that. Start free today — no credit card, no technical knowledge required.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={onSignup} className="px-8 py-4 rounded-xl bg-white text-green-900 text-[16px] font-bold hover:bg-green-50 transition-all shadow-lg">
                    Start My Free 30-Day Trial
                  </button>
                  <button onClick={onLogin} className="px-8 py-4 rounded-xl border border-white/30 text-white text-[15px] font-semibold hover:bg-white/10 transition-all">
                    Sign In
                  </button>
                </div>
                <p className="text-green-300/60 text-xs mt-5">No credit card needed · Works on any phone · Cancel anytime</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#0a1e15" }} className="text-white pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-10 pb-10 border-b border-white/10">
            <div className="flex flex-col gap-4 max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-[24px] leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Pondtora</span>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">The complete fish farm management platform. Manage ponds, feed, finances, staff and more.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div className="flex flex-col gap-3">
                <p className="font-bold text-white/40 uppercase tracking-widest text-[11px] mb-1">Product</p>
                {NAV_LINKS.map(l => (
                  <button key={l.label} onClick={() => scrollTo(l.href)} className="text-white/60 hover:text-white transition-colors text-left">{l.label}</button>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <p className="font-bold text-white/40 uppercase tracking-widest text-[11px] mb-1">Account</p>
                <button onClick={onLogin} className="text-white/60 hover:text-white text-left">Login</button>
                <button onClick={onSignup} className="text-white/60 hover:text-white text-left">Create Account</button>
                <button onClick={onSignup} className="text-white/60 hover:text-white text-left">Free Trial</button>
              </div>
              <div className="flex flex-col gap-3">
                <p className="font-bold text-white/40 uppercase tracking-widest text-[11px] mb-1">Support</p>
                <span className="text-white/60 text-sm">contact@pondtora.com</span>
              </div>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/30">
            <p>© {new Date().getFullYear()} Pondtora. All rights reserved.</p>
            <p>Your information is never shared with third parties.</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes lpFadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:none; } }
        @keyframes lpFloat  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes lpBob    { 0%,100% { transform:translateX(-50%) translateY(0); } 50% { transform:translateX(-50%) translateY(6px); } }
      `}</style>
    </div>
  );
}
