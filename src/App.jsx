import { useState, useMemo, useEffect, useCallback } from "react";

const C = {
  bg:"#f5f0e8",      // varm beige bakgrund
  sf:"#ffffff",      // vita kort
  cd:"#faf7f2",      // ljus krämig
  br:"#e8e0d0",      // varm border
  ac:"#4a7c59",      // skogsgrönt accent
  al:"#3d6b4a",      // mörkare grönt
  ad:"#4a7c5918",    // grönt transparent
  tx:"#2c2c2c",      // nästan svart text
  mu:"#8a7f6e",      // varm grå/brun
  ok:"#4a7c59",      // grönt
  wa:"#d4882a",      // varm orange/guld
  er:"#c0392b",      // röd
  txs:"#4a4035",     // mörkbrun sekundär text
};

const MONTHS = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];

const PTYPES = [
  {id:"hyresratt",label:"Hyresrätt",icon:"🏢"},
  {id:"bostadsratt",label:"Bostadsrätt",icon:"🏠"},
  {id:"villa",label:"Villa / Radhus",icon:"🏡"},
  {id:"sommarstuga",label:"Sommarstuga",icon:"🌲"},
  {id:"utomlands",label:"Bostad utomlands",icon:"✈️"},
];
const VTYPES = [
  {id:"bil",label:"Bil",icon:"🚗"},{id:"mc",label:"MC",icon:"🏍️"},
  {id:"bat",label:"Båt",icon:"⛵"},{id:"husbil",label:"Husbil/Husvagn",icon:"🚐"},
  {id:"elcykel",label:"Elcykel",icon:"🚲"},
];
const SUBTAGS = [
  {id:"netflix",label:"Netflix",icon:"🎬"},{id:"spotify",label:"Spotify",icon:"🎵"},
  {id:"hbo",label:"HBO/Max",icon:"📺"},{id:"disney",label:"Disney+",icon:"🏰"},
  {id:"viaplay",label:"Viaplay",icon:"⚽"},{id:"gym",label:"Gym",icon:"💪"},
  {id:"mobil",label:"Mobilabonnemang",icon:"📱"},{id:"bredband",label:"Bredband",icon:"🌐"},
  {id:"el",label:"El-abonnemang",icon:"⚡"},{id:"forsakring",label:"Försäkringar",icon:"🛡️"},
  {id:"bank",label:"Bank/kortavgifter",icon:"💳"},{id:"cloud",label:"iCloud/Google One",icon:"☁️"},
];
const PROPTAGS = [
  {id:"bredband",label:"Bredband",icon:"🌐"},{id:"tv",label:"TV/streaming",icon:"📺"},
  {id:"el",label:"El & ström",icon:"⚡"},{id:"vatten",label:"Vatten & avlopp",icon:"💧"},
  {id:"samfallighet",label:"Samfällighetsavgift",icon:"🏘️"},{id:"fastighetsskatt",label:"Fastighetsskatt",icon:"🏛️"},
  {id:"hemforsakring",label:"Hemförsäkring",icon:"🛡️"},{id:"sotning",label:"Sotning",icon:"🪟"},
  {id:"sophamtning",label:"Sophämtning",icon:"🗑️"},{id:"tradgard",label:"Trädgård",icon:"🌿"},
  {id:"underhall",label:"Underhållsfond",icon:"🔧"},
];
const CATCOL = {housing:"#4a7c59",vehicle:"#d4882a",subs:"#7c6a4a",living:"#c0392b",savings:"#2980b9"};
const EDITSEC = [
  {id:"household",icon:"👨‍👩‍👧",name:"Hushållet",desc:"Namn, vuxna och barn"},
  {id:"properties",icon:"🏠",name:"Boenden",desc:"Typ av boenden"},
  {id:"property-details",icon:"📋",name:"Boendekostnader & lån",desc:"Lån, ränta, avgifter per bostad"},
  {id:"vehicle-count",icon:"🚗",name:"Fordon – antal",desc:"Hur många fordon ni har"},
  {id:"vehicle-details",icon:"🔧",name:"Fordon – kostnader",desc:"Lån, försäkring, drivmedel, service"},
  {id:"subscriptions",icon:"📱",name:"Abonnemang",desc:"Streaming, gym, bank..."},
  {id:"living",icon:"🛒",name:"Levnadskostnader",desc:"Mat, restaurang, kläder, nöje..."},
  {id:"savings",icon:"💰",name:"Sparande",desc:"ISK, pension, barnspar..."},
];

// Helpers
const fmt = n => Math.round(Number(n||0)).toLocaleString("sv-SE")+" kr";
const pct = (v,t) => t>0?((v/t)*100).toFixed(1)+"%":"0%";
const toMonthly = e => !e?.value?0: e.period==="year"?Number(e.value)/12:Number(e.value);
const daysUntil = d => d?Math.ceil((new Date(d)-new Date())/86400000):null;
const fmtDate = d => d?new Date(d).toLocaleDateString("sv-SE",{year:"numeric",month:"long",day:"numeric"}):"";

function getAmortKrav(bg) {
  if(bg>70) return {pct:2,label:"2%/år – belåning >70%",level:"high"};
  if(bg>50) return {pct:1,label:"1%/år – belåning 50–70%",level:"mid"};
  return {pct:0,label:"Inget lagkrav – belåning <50%",level:"none"};
}
function calcLoan(belopp,varde,ranta) {
  const b=Number(belopp||0),v=Number(varde||0),r=Number(ranta||0);
  if(!b||!r) return null;
  const bg=v>0?(b/v)*100:0;
  const krav=getAmortKrav(bg);
  const amort=(b*(krav.pct/100))/12;
  const ranteMan=b*(r/100)/12;
  return {bg,krav,amort,ranteMan,total:amort+ranteMan};
}

function calcTotals(data) {
  const pd=data.propertyDetails||{};
  let housing=0; const hBd=[];
  Object.entries(pd).forEach(([tid,d])=>{
    const label=PTYPES.find(p=>p.id===tid)?.label||tid;
    if(tid==="hyresratt"){
      const v=toMonthly(d.hyraEntry||{value:d.hyra,period:"month"});
      housing+=v; hBd.push({label:`${label} – Hyra`,value:v,entry:d.hyraEntry});
    } else {
      const c=calcLoan(d.lanebelopp,d.boVarde,d.ranteSats);
      if(c){housing+=c.amort+c.ranteMan;hBd.push({label:`${label} – Amortering`,value:c.amort});hBd.push({label:`${label} – Ränta`,value:c.ranteMan});}
      [["avgiftEntry","Föreningsavgift"],["driftEntry","Drift"],["extraAmortEntry","Extra amortering"]].forEach(([ek,lbl])=>{
        const e=d[ek]; if(e?.value){const v=toMonthly(e);housing+=v;hBd.push({label:`${label} – ${lbl}`,value:v,entry:e});}
      });
      const pc=d.propCostEntries||{};
      (d._propCostSelected||[]).forEach(id=>{
        const tag=PROPTAGS.find(t=>t.id===id); const e=pc[id];
        if(e?.value){const v=toMonthly(e);housing+=v;hBd.push({label:`${label} – ${tag?.label||id}`,value:v,entry:e});}
      });
      (d.customPropCosts||[]).forEach(c2=>{
        if(c2.entry?.value){const v=toMonthly(c2.entry);housing+=v;hBd.push({label:`${label} – ${c2.label}`,value:v,entry:c2.entry});}
      });
    }
  });
  const vd=data.vehicleDetails||{}; let vehicle=0; const vBd=[];
  Object.entries(vd).forEach(([k,d])=>{
    const name=d.namn||k;
    [["lanEntry","Lån/leasing"],["forsakringEntry","Försäkring"],["drivmedEntry","Drivmedel"],["serviceEntry","Service/skatt"]].forEach(([ek,lbl])=>{
      const e=d[ek]; if(e?.value){const v=toMonthly(e);vehicle+=v;vBd.push({label:`${name} – ${lbl}`,value:v,entry:e});}
    });
  });
  const sc=data.subscriptionEntries||{}; let subs=0; const sBd=[];
  (data.subscriptions||[]).forEach(id=>{
    const tag=SUBTAGS.find(t=>t.id===id); const e=sc[id];
    if(e?.value){const v=toMonthly(e);subs+=v;sBd.push({label:`${tag?.icon||""} ${tag?.label||id}`,value:v,entry:e});}
  });
  (data.customSubscriptions||[]).forEach(c=>{
    if(c.entry?.value){const v=toMonthly(c.entry);subs+=v;sBd.push({label:c.label,value:v,entry:c.entry});}
  });
  const lc=data.livingEntries||{}; let living=0; const lBd=[];
  const lLbl={mat:"Mat & dagligvaror",restaurang:"Restaurang",alkohol:"Alkohol",klader:"Kläder",barn:"Barnkostnader",husdjur:"Husdjur",hem:"Hushållstjänster",noje:"Nöje & fritid",resor:"Semesterresor",ovrigt:"Övrigt"};
  Object.entries(lc).forEach(([k,e])=>{ if(e?.value){const v=toMonthly(e);living+=v;lBd.push({label:lLbl[k]||k,value:v,entry:e});}});
  const sv=data.savingsEntries||{}; let savings=0; const svBd=[];
  const sLbl={buffert:"Buffertspar/ISK",pension:"Pension",aktier:"Aktier & fonder",barn:"Barnsparande",ovrigt:"Övrigt sparande"};
  Object.entries(sv).forEach(([k,e])=>{ if(e?.value){const v=toMonthly(e);savings+=v;svBd.push({label:sLbl[k]||k,value:v,entry:e});}});
  const total=housing+vehicle+subs+living+savings;
  const allItems=[
    ...hBd.map(i=>({...i,cat:"housing",color:CATCOL.housing})),
    ...vBd.map(i=>({...i,cat:"vehicle",color:CATCOL.vehicle})),
    ...sBd.map(i=>({...i,cat:"subs",color:CATCOL.subs})),
    ...lBd.map(i=>({...i,cat:"living",color:CATCOL.living})),
    ...svBd.map(i=>({...i,cat:"savings",color:CATCOL.savings})),
  ];
  return {housing,vehicle,subs,living,savings,total,allItems,breakdown:{housing:hBd,vehicle:vBd,subs:sBd,living:lBd,savings:svBd}};
}

function itemsForMonth(allItems,m) {
  return allItems.filter(item=>{
    if(!item.entry) return item.value>0;
    if(item.entry.period==="year") return Number(item.entry.month||1)===m;
    return item.value>0;
  }).map(item=>({...item,displayValue:item.entry?.period==="year"?Number(item.entry.value||0):item.value,isAnnual:item.entry?.period==="year"}));
}
function monthTotal(allItems,m) {
  return allItems.reduce((sum,item)=>{
    if(!item.entry) return sum+item.value;
    if(item.entry.period==="year") return sum+(Number(item.entry.month||1)===m?Number(item.entry.value||0):0);
    return sum+item.value;
  },0);
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  app:{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",paddingTop:"10vh",padding:"10vh 12px 24px",background:C.bg,color:C.tx,fontFamily:"system-ui,-apple-system,sans-serif"},
  card:{background:C.sf,border:`1px solid ${C.br}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:540,position:"relative",overflow:"hidden"},
  bar:{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#6c63ff,#8b85ff,#4ecca3)"},
  prog:{display:"flex",gap:4,marginBottom:24},
  dot:(done,active)=>({height:3,flex:1,borderRadius:2,background:done?"#6c63ff":active?"#8b85ff":C.br,transition:"background 0.3s"}),
  slabel:{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:C.ac,marginBottom:6},
  h1:{fontSize:20,lineHeight:1.3,color:C.tx,marginBottom:6,fontWeight:700},
  sub:{fontSize:13,color:C.mu,marginBottom:18,lineHeight:1.5},
  nav:{display:"flex",gap:8,marginTop:16,alignItems:"center"},
  btnP:{flex:1,background:C.ac,border:"none",borderRadius:12,padding:"14px 18px",color:"white",fontSize:15,fontWeight:700,cursor:"pointer"},
  btnB:{background:"transparent",border:`1px solid ${C.br}`,borderRadius:12,padding:"14px 16px",color:C.mu,fontSize:13,cursor:"pointer"},
  btnSk:{background:"transparent",border:`1px dashed ${C.br}`,borderRadius:12,padding:"14px 14px",color:C.mu,fontSize:13,cursor:"pointer"},
  optBtn:(sel)=>({background:sel?C.ad:C.cd,border:`1px solid ${sel?C.ac:C.br}`,borderRadius:14,padding:"14px 16px",color:sel?C.al:C.tx,fontSize:15,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12,marginBottom:8,width:"100%"}),
  countRow:{display:"flex",alignItems:"center",gap:14,background:C.cd,border:`1px solid ${C.br}`,borderRadius:14,padding:"14px 16px",marginBottom:8},
  countBtn:{width:40,height:40,borderRadius:10,border:`1px solid ${C.br}`,background:C.sf,color:C.tx,fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  inp:{width:"100%",background:C.cd,border:`1px solid ${C.br}`,borderRadius:12,padding:"13px 14px",color:C.tx,fontFamily:"inherit",fontSize:14,outline:"none",marginBottom:8,boxSizing:"border-box"},
  inpRow:{display:"flex",gap:8,marginBottom:8},
  pfx:{background:C.cd,border:`1px solid ${C.br}`,borderRadius:12,padding:"13px 14px",color:C.mu,fontSize:12,whiteSpace:"nowrap",display:"flex",alignItems:"center"},
  lcard:{background:C.cd,border:`1px solid ${C.br}`,borderRadius:16,padding:16,marginBottom:12},
  lcardT:{fontSize:11,letterSpacing:1.5,textTransform:"uppercase",color:C.mu,marginBottom:14},
  calcBox:{background:C.ad,border:`1px solid ${C.ac}`,borderRadius:12,padding:"14px 16px",margin:"10px 0"},
  pill:(lvl)=>({display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:8,fontSize:11,fontWeight:600,marginBottom:8,
    background:lvl==="none"?"#8884aa22":lvl==="mid"?"#f5a62322":"#ff6b6b22",
    border:`1px solid ${lvl==="none"?C.mu:lvl==="mid"?C.wa:C.er}`,
    color:lvl==="none"?C.mu:lvl==="mid"?C.wa:C.er}),
  tag:(sel)=>({background:sel?C.ad:C.cd,border:`1px solid ${sel?C.ac:C.br}`,borderRadius:10,padding:"7px 12px",fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,margin:"0 5px 6px 0"}),
  vbox:{background:"#f5a62311",border:`1px solid ${C.wa}`,borderRadius:12,padding:"14px 16px",marginTop:12},
  totalCard:{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.ad,border:`1px solid ${C.ac}`,borderRadius:14,padding:"16px 18px",marginBottom:20},
  catCard:{background:C.cd,border:`1px solid ${C.br}`,borderRadius:14,padding:"14px 16px",marginBottom:8},
  // flex money
  fmWrap:{background:C.cd,border:`1px solid ${C.br}`,borderRadius:12,padding:"11px 13px",marginBottom:8},
  fmTop:{display:"flex",alignItems:"center",gap:8},
  fmLbl:{flex:1,fontSize:13,color:C.tx},
  fmInput:{background:"transparent",border:"none",outline:"none",color:C.tx,fontFamily:"inherit",fontSize:13,width:90,textAlign:"right"},
  ptgl:{display:"flex",border:`1px solid ${C.br}`,borderRadius:6,overflow:"hidden",flexShrink:0},
  pBtn:(act)=>({padding:"3px 7px",fontSize:11,cursor:"pointer",border:"none",background:act?C.ac:"transparent",color:act?"white":C.mu}),
  fmSub:{display:"flex",alignItems:"center",gap:8,marginTop:7,paddingTop:7,borderTop:`1px solid ${C.br}`},
  msel:{background:"transparent",border:`1px solid ${C.br}`,borderRadius:6,color:C.mu,fontFamily:"inherit",fontSize:11,padding:"2px 5px",outline:"none",cursor:"pointer"},
  // edit menu
  overlay:{position:"fixed",inset:0,background:"#0f0f13cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,padding:"0 16px 24px"},
  sheet:{background:C.sf,border:`1px solid ${C.br}`,borderRadius:20,width:"100%",maxWidth:540,overflow:"hidden",maxHeight:"80vh",overflowY:"auto"},
  sheetH:{padding:"18px 22px 14px",borderBottom:`1px solid ${C.br}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.sf},
  eItem:{display:"flex",alignItems:"center",gap:12,padding:"14px 22px",cursor:"pointer",border:"none",background:"transparent",width:"100%",textAlign:"left",borderBottom:`1px solid ${C.br}`},
  // chart
  chartWrap:{background:C.sf,border:`1px solid ${C.br}`,borderRadius:16,padding:18,marginBottom:10},
  tabBar:{display:"flex",gap:4,background:C.cd,border:`1px solid ${C.br}`,borderRadius:10,padding:3,marginBottom:14},
  tab:(act)=>({flex:1,padding:"7px",border:"none",borderRadius:7,fontFamily:"inherit",fontSize:12,cursor:"pointer",background:act?C.ac:"transparent",color:act?"white":C.mu}),
  legRow:(act)=>({display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:8,cursor:"pointer",background:act?C.ad:"transparent",border:act?`1px solid ${C.ac}44`:"1px solid transparent"}),
  detPanel:{background:C.cd,border:`1px solid ${C.br}`,borderRadius:12,padding:14,marginTop:8},
  // calendar
  calWrap:{background:C.sf,border:`1px solid ${C.br}`,borderRadius:16,padding:18,marginBottom:10},
  calItem:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.br}44`,fontSize:13},
  annBadge:{background:"#f5a62322",border:`1px solid ${C.wa}`,borderRadius:4,padding:"1px 5px",fontSize:10,color:C.wa,marginLeft:4},
};

// ── FlexMoneyInput ──────────────────────────────────────────────────────────
function FlexMoneyInput({label,entry={},onChange}) {
  const period=entry.period||"month", month=entry.month||1, value=entry.value||"";
  const set=patch=>onChange({...entry,...patch});
  const equiv=period==="year"&&value?` ≈ ${fmt(Number(value)/12)}/mån`:"";
  return (
    <div style={S.fmWrap}>
      <div style={S.fmTop}>
        <span style={S.fmLbl}>{label}</span>
        <input style={S.fmInput} type="number" placeholder="0" value={value} onChange={e=>set({value:e.target.value})} />
        <div style={S.ptgl}>
          <button style={S.pBtn(period==="month")} onClick={()=>set({period:"month"})}>mån</button>
          <button style={S.pBtn(period==="year")} onClick={()=>set({period:"year"})}>år</button>
        </div>
      </div>
      {period==="year"&&(
        <div style={S.fmSub}>
          <span style={{fontSize:11,color:C.mu,flexShrink:0}}>Betalas i</span>
          <select style={S.msel} value={month} onChange={e=>set({month:Number(e.target.value)})}>
            {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
          {value&&<span style={{fontSize:11,color:C.ok+"88",marginLeft:"auto"}}>{equiv}</span>}
        </div>
      )}
    </div>
  );
}

function CounterRow({label,value,onChange,min=0,max=10}) {
  return (
    <div style={S.countRow}>
      <span style={{flex:1,fontSize:14}}>{label}</span>
      <button style={S.countBtn} onClick={()=>onChange(Math.max(min,value-1))}>−</button>
      <span style={{fontSize:20,fontWeight:600,minWidth:28,textAlign:"center",color:C.al}}>{value}</span>
      <button style={S.countBtn} onClick={()=>onChange(Math.min(max,value+1))}>+</button>
    </div>
  );
}

function PropCostBlock({d,update,typeId,label="Omkostnader"}) {
  const entries=d.propCostEntries||{}, custom=d.customPropCosts||[], toggled=d._propCostSelected||[];
  const toggle=id=>update(typeId,"_propCostSelected",toggled.includes(id)?toggled.filter(x=>x!==id):[...toggled,id]);
  const addCustom=()=>update(typeId,"customPropCosts",[...custom,{label:"",entry:{period:"month",value:""}}]);
  const updateCustom=(i,field,val)=>{const u=[...custom];u[i]={...u[i],[field]:val};update(typeId,"customPropCosts",u);};

  // Live total — uppdateras i realtid
  const total=toggled.reduce((sum,id)=>{
    const e=entries[id]; return sum+(e?.value?toMonthly(e):0);
  },0)+custom.reduce((sum,c)=>sum+(c.entry?.value?toMonthly(c.entry):0),0);

  return (
    <div style={{marginTop:16,borderTop:`1px solid ${C.br}`,paddingTop:16}}>
      {/* Rubrik med live-summa */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:11,letterSpacing:1.5,textTransform:"uppercase",color:C.ac,fontWeight:700}}>{label}</div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:C.mu,marginBottom:1}}>totalt / mån</div>
          <div style={{fontSize:total>0?20:14,fontWeight:800,color:total>0?C.ac:C.mu,transition:"all 0.2s"}}>
            {Math.round(total).toLocaleString("sv-SE")} kr
          </div>
        </div>
      </div>

      {/* Tagg-väljare */}
      <div style={{display:"flex",flexWrap:"wrap",marginBottom:toggled.length>0?10:4}}>
        {PROPTAGS.map(tag=>(
          <button key={tag.id} style={S.tag(toggled.includes(tag.id))} onClick={()=>toggle(tag.id)}>{tag.icon} {tag.label}</button>
        ))}
      </div>

      {/* Valda fält */}
      {toggled.map(id=>{
        const tag=PROPTAGS.find(t=>t.id===id);
        const val=entries[id]?.value;
        return (
          <div key={id} style={{position:"relative"}}>
            <FlexMoneyInput label={`${tag.icon} ${tag.label}`} entry={entries[id]||{}} onChange={e=>update(typeId,"propCostEntries",{...entries,[id]:e})} />
          </div>
        );
      })}

      {/* Egna kostnader */}
      {custom.map((c,i)=>(
        <div key={i} style={{marginBottom:6}}>
          <input style={{...S.inp,marginBottom:4}} placeholder="Namn på kostnad" value={c.label} onChange={e=>updateCustom(i,"label",e.target.value)} />
          <FlexMoneyInput label={c.label||"Kostnad"} entry={c.entry||{}} onChange={e=>updateCustom(i,"entry",e)} />
        </div>
      ))}
      <button onClick={addCustom} style={{background:"transparent",border:`1px dashed ${C.br}`,borderRadius:10,padding:"8px 12px",color:C.mu,cursor:"pointer",fontSize:12,width:"100%",marginBottom:4}}>
        + Lägg till egen kostnad
      </button>

      {/* Summa-rad om något är ifyllt */}
      {total>0&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:10,borderTop:`1px solid ${C.br}`}}>
          <span style={{fontSize:11,color:C.mu,textTransform:"uppercase",letterSpacing:1}}>Summa {label.toLowerCase()}</span>
          <span style={{fontSize:16,fontWeight:800,color:C.ac}}>{Math.round(total).toLocaleString("sv-SE")} kr/mån</span>
        </div>
      )}
    </div>
  );
}

function LoanBlock({d,update,typeId}) {
  const calc=useMemo(()=>calcLoan(d.lanebelopp,d.boVarde,d.ranteSats),[d.lanebelopp,d.boVarde,d.ranteSats]);
  const days=daysUntil(d.villkorsDatum);
  return (
    <div>
      <div style={{marginBottom:8}}>
        <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:4}}>Bostadens marknadsvärde</span>
        <div style={S.inpRow}>
          <input style={{...S.inp,flex:1,marginBottom:0}} type="number" placeholder="ex. 3 500 000" value={d.boVarde||""} onChange={e=>update(typeId,"boVarde",e.target.value)} />
          <div style={S.pfx}>kr</div>
        </div>
      </div>
      <div style={{marginBottom:8}}>
        <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:4}}>Totalt lånebelopp</span>
        <div style={S.inpRow}>
          <input style={{...S.inp,flex:1,marginBottom:0}} type="number" placeholder="ex. 2 200 000" value={d.lanebelopp||""} onChange={e=>update(typeId,"lanebelopp",e.target.value)} />
          <div style={S.pfx}>kr</div>
        </div>
      </div>
      <div style={{marginBottom:8}}>
        <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:4}}>Räntesats % / år</span>
        <div style={S.inpRow}>
          <input style={{...S.inp,flex:1,marginBottom:0}} type="number" step="0.01" placeholder="ex. 3.75" value={d.ranteSats||""} onChange={e=>update(typeId,"ranteSats",e.target.value)} />
          <div style={S.pfx}>%/år</div>
        </div>
      </div>
      {calc&&(
        <div style={S.calcBox}>
          <span style={S.pill(calc.krav.level)}>{calc.krav.level==="none"?"✓":calc.krav.level==="mid"?"⚠":"▲"} {calc.krav.label}</span>
          {d.boVarde>0&&<div style={{fontSize:11,color:C.mu,marginBottom:8}}>Belåningsgrad: <strong style={{color:C.tx}}>{calc.bg.toFixed(1)}%</strong></div>}
          <div style={{borderTop:`1px solid ${C.br}`,paddingTop:8}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span style={{color:C.mu}}>Amortering/mån</span><span style={{color:C.al,fontWeight:600}}>{fmt(calc.amort)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span style={{color:C.mu}}>Ränta/mån</span><span style={{color:C.al,fontWeight:600}}>{fmt(calc.ranteMan)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginTop:6,paddingTop:6,borderTop:`1px solid ${C.br}`}}><span style={{color:C.tx,fontWeight:600}}>Total/mån</span><span style={{color:C.al,fontWeight:700,fontSize:16}}>{fmt(calc.total)}</span></div>
          </div>
          <div style={{fontSize:10,color:C.mu+"88",marginTop:6}}>Regler fr.o.m. 1 april 2026</div>
        </div>
      )}
      {calc&&calc.krav.pct===0&&<FlexMoneyInput label="Frivillig amortering" entry={d.extraAmortEntry||{}} onChange={e=>update(typeId,"extraAmortEntry",e)} />}
      <div style={S.vbox}>
        <div style={{fontSize:11,color:C.wa,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>📅 Nästa villkorsändring</div>
        <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:4}}>Datum</span>
        <input style={{...S.inp,colorScheme:"dark"}} type="date" value={d.villkorsDatum||""} onChange={e=>update(typeId,"villkorsDatum",e.target.value)} />
        <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:4}}>Bindningstid</span>
        <select style={{...S.inp,appearance:"none"}} value={d.bindning||""} onChange={e=>update(typeId,"bindning",e.target.value)}>
          <option value="">Välj bindningstid</option>
          {["Rörlig (3 mån)","1 år","2 år","3 år","5 år","10 år"].map((v,i)=><option key={i} value={v.toLowerCase().replace(" ","_")}>{v}</option>)}
        </select>
        <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:4}}>Förväntad ny räntesats</span>
        <div style={S.inpRow}>
          <input style={{...S.inp,flex:1,marginBottom:0}} type="number" step="0.01" placeholder="ex. 3.20" value={d.nyRanta||""} onChange={e=>update(typeId,"nyRanta",e.target.value)} />
          <div style={S.pfx}>%/år</div>
        </div>
        {d.nyRanta&&d.lanebelopp&&(()=>{
          const ny=calcLoan(d.lanebelopp,d.boVarde,d.nyRanta);
          const diff=ny&&calc?ny.ranteMan-calc.ranteMan:0;
          return ny?(<div style={{background:C.cd,border:`1px solid ${C.br}`,borderRadius:8,padding:"9px 11px",fontSize:12}}>
            <div style={{color:C.mu,marginBottom:3}}>Förändring vid villkorsändring</div>
            <div style={{color:diff>0?C.er:C.ok,fontWeight:600}}>{diff>0?"+":""}{fmt(diff)}/mån i räntekostnad</div>
            <div style={{color:C.mu,fontSize:11,marginTop:2}}>Ny total: {fmt(ny.total)}/mån</div>
          </div>):null;
        })()}
        {days!==null&&days>=0&&days<=30&&<div style={{background:"#ff6b6b18",border:`1px solid ${C.er}`,borderRadius:8,padding:"9px 11px",fontSize:12,color:C.er,marginTop:8}}>🚨 Villkorsändring om <strong>{days} dagar</strong> — {fmtDate(d.villkorsDatum)}</div>}
        {days!==null&&days>30&&days<=90&&<div style={{background:"#f5a62318",border:`1px solid ${C.wa}`,borderRadius:8,padding:"9px 11px",fontSize:12,color:C.wa,marginTop:8}}>⏳ Villkorsändring om <strong>{days} dagar</strong> — {fmtDate(d.villkorsDatum)}</div>}
        {days!==null&&days>90&&<div style={{fontSize:11,color:C.mu,marginTop:8}}>✓ Nästa: {fmtDate(d.villkorsDatum)} ({days} dagar)</div>}
      </div>
    </div>
  );
}

// Charts
function polar(cx,cy,r,a){const rad=(a*Math.PI)/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};}

function DonutChart({slices,total,activeId,onHover}) {
  const cx=110,cy=110,r=80,sw=28; let cum=-90;
  const paths=slices.filter(s=>s.value>0).map(s=>{
    const frac=s.value/total,start=cum;cum+=frac*360;
    const s1=polar(cx,cy,r,start),s2=polar(cx,cy,r,cum);
    return {...s,d:`M ${s1.x} ${s1.y} A ${r} ${r} 0 ${frac>0.5?1:0} 1 ${s2.x} ${s2.y}`,frac};
  });
  return (
    <svg viewBox="0 0 220 220" style={{width:"100%",maxWidth:200,display:"block",margin:"0 auto"}}>
      {paths.map(p=>(
        <path key={p.id} d={p.d} fill="none" stroke={p.color} strokeWidth={p.id===activeId?sw+6:sw} strokeLinecap="butt"
          style={{cursor:"pointer",transition:"stroke-width 0.2s",opacity:activeId&&p.id!==activeId?0.4:1}}
          onMouseEnter={()=>onHover(p.id)} onMouseLeave={()=>onHover(null)} onClick={()=>onHover(p.id===activeId?null:p.id)} />
      ))}
      <text x={cx} y={cy-8} textAnchor="middle" fill={C.mu} fontSize="10" fontFamily="system-ui">Total</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill={C.tx} fontSize="14" fontWeight="600">{Math.round(total).toLocaleString("sv-SE")}</text>
      <text x={cx} y={cy+26} textAnchor="middle" fill={C.mu} fontSize="10" fontFamily="system-ui">kr/mån</text>
    </svg>
  );
}

function BarChart({slices,total,activeId,onHover}) {
  const max=Math.max(...slices.map(s=>s.value),1);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {slices.filter(s=>s.value>0).map(s=>(
        <div key={s.id} style={{cursor:"pointer",opacity:activeId&&s.id!==activeId?0.4:1,transition:"opacity 0.2s"}}
          onMouseEnter={()=>onHover(s.id)} onMouseLeave={()=>onHover(null)} onClick={()=>onHover(s.id===activeId?null:s.id)}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
            <span>{s.icon} {s.label}</span>
            <span style={{color:s.color,fontWeight:600}}>{fmt(s.value)}</span>
          </div>
          <div style={{background:C.br,borderRadius:6,height:10,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(s.value/max)*100}%`,background:s.color,borderRadius:6,transition:"width 0.4s ease"}} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSection({t,data}) {
  const [ct,setCt]=useState("donut"),[activeId,setActiveId]=useState(null);

  // Build granular slices — per fastighet, per fordon, sedan resten
  const housingColors=["#4a7c59","#6fa882","#3d6b4a","#8bc4a0","#2d5240","#a8d4b8"];
  const vehicleColors=["#d4882a","#e8a84a","#b8721f","#f0c070"];

  const slices=[];

  // Boende — per fastighet
  const pd=data?.propertyDetails||{};
  PTYPES.forEach((pt,pi)=>{
    const d=pd[pt.id];
    if(!d) return;
    const items=t.breakdown.housing?.filter(i=>i.label.startsWith(pt.label))||[];
    const total=items.reduce((a,i)=>a+i.value,0);
    if(total>0) slices.push({
      id:`housing_${pt.id}`,
      label:pt.label,
      icon:pt.icon,
      value:total,
      color:housingColors[pi%housingColors.length],
      cat:"housing",
      breakdown:items,
    });
  });

  // Fordon — per fordon
  const vd=data?.vehicleDetails||{};
  const vc=data?.vehicleCounts||{};
  let vIdx=0;
  VTYPES.forEach(vt=>{
    for(let i=0;i<(vc[vt.id]||0);i++){
      const key=`${vt.id}_${i}`;
      const d=vd[key];
      if(!d) { vIdx++; continue; }
      const name=d.namn||`${vt.label} ${i+1}`;
      const items=t.breakdown.vehicle?.filter(item=>item.label.startsWith(name+' –')||item.label.startsWith((d.namn||'')+' –'))||[];
      // fallback: split vehicle total evenly if no name match
      const total=items.reduce((a,i2)=>a+i2.value,0);
      if(total>0) slices.push({
        id:`vehicle_${key}`,
        label:name,
        icon:vt.icon,
        value:total,
        color:vehicleColors[vIdx%vehicleColors.length],
        cat:"vehicle",
        breakdown:items,
      });
      vIdx++;
    }
  });

  // Om inga per-fordon matchade, lägg hela fordon som ett segment
  if(!slices.some(s=>s.cat==="vehicle")&&t.vehicle>0){
    slices.push({id:"vehicle",label:"Fordon",icon:"🚗",value:t.vehicle,color:vehicleColors[0],cat:"vehicle",breakdown:t.breakdown.vehicle||[]});
  }

  // Abonnemang, Levnadskostnader, Sparande
  if(t.subs>0)    slices.push({id:"subs",   label:"Abonnemang",      icon:"📱",value:t.subs,   color:"#7c6a4a",cat:"subs",   breakdown:t.breakdown.subs||[]});
  if(t.living>0)  slices.push({id:"living", label:"Levnadskostnader",icon:"🛒",value:t.living, color:"#c0392b",cat:"living", breakdown:t.breakdown.living||[]});
  if(t.savings>0) slices.push({id:"savings",label:"Sparande",         icon:"💰",value:t.savings,color:"#2980b9",cat:"savings",breakdown:t.breakdown.savings||[]});

  const active=slices.find(s=>s.id===activeId);
  const total=slices.reduce((a,s)=>a+s.value,0);

  return (
    <div style={S.chartWrap}>
      <div style={{fontSize:11,color:C.mu,textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>Fördelning av utgifter</div>
      <div style={S.tabBar}>
        <button style={S.tab(ct==="donut")} onClick={()=>setCt("donut")}>Cirkeldiagram</button>
        <button style={S.tab(ct==="bar")} onClick={()=>setCt("bar")}>Stapeldiagram</button>
      </div>
      {ct==="donut"
        ?<DonutChart slices={slices} total={total} activeId={activeId} onHover={setActiveId} />
        :<BarChart slices={slices} total={total} activeId={activeId} onHover={setActiveId} />}

      <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:14}}>
        {slices.map(s=>(
          <div key={s.id} style={S.legRow(activeId===s.id)} onClick={()=>setActiveId(activeId===s.id?null:s.id)}>
            <div style={{width:9,height:9,borderRadius:"50%",background:s.color,flexShrink:0}} />
            <span style={{fontSize:12,flex:1}}>{s.icon} {s.label}</span>
            <span style={{fontSize:12,fontWeight:700,color:s.color}}>{fmt(s.value)}</span>
            <span style={{fontSize:11,color:C.mu,minWidth:36,textAlign:"right"}}>{pct(s.value,total)}</span>
          </div>
        ))}
      </div>

      {active&&active.breakdown.length>0&&(
        <div style={S.detPanel}>
          <div style={{fontSize:11,letterSpacing:1.5,textTransform:"uppercase",color:active.color,marginBottom:10}}>{active.icon} {active.label} — detaljer</div>
          {active.breakdown.filter(i=>i.value>0).sort((a,b)=>b.value-a.value).map((item,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.br}`,fontSize:12}}>
              <span style={{color:C.mu}}>{item.label.split(" – ").slice(1).join(" – ")||item.label}{item.entry?.period==="year"&&<span style={S.annBadge}>årsvis</span>}</span>
              <span style={{color:active.color,fontWeight:600}}>{fmt(item.value)}/mån</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0 0",fontSize:13,marginTop:4}}>
            <span style={{color:C.tx,fontWeight:600}}>Totalt</span>
            <span style={{color:active.color,fontWeight:700,fontSize:16}}>{fmt(active.value)}/mån</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthlyCalendar({t}) {
  const now=new Date();
  const [vm,setVm]=useState(now.getMonth()+1),[vy,setVy]=useState(now.getFullYear());
  const goBack=()=>vm===1?(setVm(12),setVy(y=>y-1)):setVm(m=>m-1);
  const goFwd=()=>vm===12?(setVm(1),setVy(y=>y+1)):setVm(m=>m+1);
  const items=itemsForMonth(t.allItems,vm);
  const total=monthTotal(t.allItems,vm);
  const annualItems=items.filter(i=>i.isAnnual);
  const recurringItems=items.filter(i=>!i.isAnnual);
  return (
    <div style={S.calWrap}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <button style={{...S.countBtn,width:32,height:32}} onClick={goBack}>‹</button>
        <span style={{fontSize:17,fontWeight:600}}>{MONTHS[vm-1]} {vy}</span>
        <button style={{...S.countBtn,width:32,height:32}} onClick={goFwd}>›</button>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${C.br}`}}>
        <span style={{fontSize:11,color:C.mu,textTransform:"uppercase",letterSpacing:1}}>Månadstotal</span>
        <span style={{fontSize:24,fontWeight:700,color:C.al}}>{Math.round(total).toLocaleString("sv-SE")} kr</span>
      </div>
      {items.length===0&&<div style={{textAlign:"center",padding:20,color:C.mu,fontSize:13}}>Inga registrerade utgifter denna månad</div>}
      {recurringItems.length>0&&(
        <>
          <div style={{fontSize:10,color:C.mu,textTransform:"uppercase",letterSpacing:1.5,marginBottom:7}}>Fasta månadsutgifter</div>
          {recurringItems.sort((a,b)=>b.displayValue-a.displayValue).map((item,i)=>(
            <div key={i} style={S.calItem}>
              <span style={{color:C.mu,display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:item.color,display:"inline-block"}} />
                {item.label}
              </span>
              <span style={{color:item.color,fontWeight:600}}>{fmt(item.displayValue)}</span>
            </div>
          ))}
        </>
      )}
      {annualItems.length>0&&(
        <>
          <div style={{fontSize:10,color:C.wa,textTransform:"uppercase",letterSpacing:1.5,margin:"12px 0 7px"}}>🗓 Årsbetalningar denna månad</div>
          {annualItems.sort((a,b)=>b.displayValue-a.displayValue).map((item,i)=>(
            <div key={i} style={S.calItem}>
              <span style={{color:C.mu,display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:item.color,display:"inline-block"}} />
                {item.label}
                <span style={S.annBadge}>årsvis</span>
              </span>
              <span style={{color:C.wa,fontWeight:600}}>{fmt(item.displayValue)}</span>
            </div>
          ))}
          <div style={{fontSize:10,color:C.mu+"55",textAlign:"right",marginTop:8}}>Månadssnitt exkl. årsbetalningar: {fmt(t.total)}</div>
        </>
      )}
    </div>
  );
}

function EditMenu({onSelect,onClose}) {
  return (
    <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={S.sheet}>
        <div style={S.sheetH}>
          <span style={{fontSize:18,fontWeight:600}}>Vad vill du ändra?</span>
          <button onClick={onClose} style={{background:C.cd,border:`1px solid ${C.br}`,borderRadius:8,width:30,height:30,cursor:"pointer",color:C.mu,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {EDITSEC.map(s=>(
          <button key={s.id} style={S.eItem} onClick={()=>onSelect(s.id)}>
            <span style={{fontSize:20,width:30,textAlign:"center",flexShrink:0}}>{s.icon}</span>
            <span style={{flex:1,textAlign:"left"}}>
              <div style={{fontSize:14,color:C.tx}}>{s.name}</div>
              <div style={{fontSize:11,color:C.mu,marginTop:2}}>{s.desc}</div>
            </span>
            <span style={{color:C.mu}}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────────────────────
function NavBar({onNext,onBack,onSkip,nextLabel="Nästa",disabled=false,showSkip=false}) {
  return (
    <div style={S.nav}>
      {onBack&&<button style={S.btnB} onClick={onBack}>← Tillbaka</button>}
      {showSkip&&<button style={S.btnSk} onClick={onSkip}>Hoppa över</button>}
      <button style={{...S.btnP,opacity:disabled?0.4:1}} onClick={onNext} disabled={disabled}>{nextLabel} →</button>
    </div>
  );
}

function StepWelcome({onNext}) {
  return (
    <div>
      <div style={S.slabel}>Välkommen</div>
      <h1 style={S.h1}>Kartlägg er hushållsekonomi</h1>
      <p style={S.sub}>Gå igenom boenden, lån, fordon och kostnader steg för steg. Ange kostnader per månad eller år — vi räknar om automatiskt.</p>
      <NavBar onNext={onNext} nextLabel="Kom igång" />
    </div>
  );
}

function StepHousehold({data,setData,onNext,onBack}) {
  return (
    <div>
      <div style={S.slabel}>Hushållet</div>
      <h2 style={S.h1}>Vilka ingår i hushållet?</h2>
      <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:4}}>Namn på hushållet</span>
      <input style={S.inp} placeholder="ex. Douglas och Camilla" value={data.name||""} onChange={e=>setData({...data,name:e.target.value})} />
      <CounterRow label="Antal vuxna" value={data.adults??2} onChange={v=>setData({...data,adults:v})} min={1} />
      <CounterRow label="Antal barn" value={data.children??0} onChange={v=>setData({...data,children:v})} />
      <NavBar onNext={onNext} onBack={onBack} disabled={!data.name} />
    </div>
  );
}

function StepProperties({data,setData,onNext,onBack}) {
  const sel=data.propertyTypes||[];
  const toggle=id=>setData({...data,propertyTypes:sel.includes(id)?sel.filter(x=>x!==id):[...sel,id]});
  return (
    <div>
      <div style={S.slabel}>Boenden</div>
      <h2 style={S.h1}>Vilka typer av boenden har ni?</h2>
      {PTYPES.map(p=>(
        <button key={p.id} style={S.optBtn(sel.includes(p.id))} onClick={()=>toggle(p.id)}>
          <span style={{fontSize:20,width:26,textAlign:"center"}}>{p.icon}</span>
          <span style={{flex:1}}>{p.label}</span>
          {sel.includes(p.id)&&<span style={{background:C.ac,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"white"}}>✓</span>}
        </button>
      ))}
      <NavBar onNext={onNext} onBack={onBack} onSkip={onNext} showSkip disabled={sel.length===0&&false} nextLabel={sel.length>0?"Nästa":"Nästa"} />
    </div>
  );
}

function StepPropertyDetails({data,setData,onNext,onBack}) {
  const types=data.propertyTypes||[], details=data.propertyDetails||{};
  const update=(tid,field,val)=>setData({...data,propertyDetails:{...details,[tid]:{...(details[tid]||{}),[field]:val}}});
  if(types.length===0){onNext();return null;}
  return (
    <div>
      <div style={S.slabel}>Boendekostnader & lån</div>
      <h2 style={S.h1}>Detaljer för era boenden</h2>
      <p style={S.sub}>Lån och ränta beräknas automatiskt. Avgifter kan anges per månad eller år.</p>
      {types.map(tid=>{
        const d=details[tid]||{}, pt=PTYPES.find(p=>p.id===tid);
        return (
          <div key={tid} style={S.lcard}>
            <div style={S.lcardT}>{pt?.icon} {pt?.label}</div>
            {tid==="hyresratt"?(
              <><FlexMoneyInput label="Månadshyra" entry={d.hyraEntry||{}} onChange={e=>update(tid,"hyraEntry",e)} /><PropCostBlock d={d} update={update} typeId={tid} label="Övriga kostnader för hyresrätten" /></>
            ):(
              <>
                <LoanBlock d={d} update={update} typeId={tid} />
                {tid==="bostadsratt"&&<FlexMoneyInput label="Månadsavgift till förening" entry={d.avgiftEntry||{}} onChange={e=>update(tid,"avgiftEntry",e)} />}
                <PropCostBlock d={d} update={update} typeId={tid}
                  label={tid==="villa"?"Omkostnader villa":tid==="sommarstuga"?"Omkostnader sommarstuga":tid==="utomlands"?"Omkostnader utomlandsbostad":"Övriga kostnader"} />
              </>
            )}
          </div>
        );
      })}
      <NavBar onNext={onNext} onBack={onBack} />
    </div>
  );
}

function StepVehicleCount({data,setData,onNext,onBack}) {
  const hasAny=Object.values(data.vehicleCounts||{}).some(v=>v>0);
  return (
    <div>
      <div style={S.slabel}>Fordon</div>
      <h2 style={S.h1}>Hur många fordon har ni?</h2>
      <p style={S.sub}>Hoppa över om ni inte har några.</p>
      {VTYPES.map(v=>(
        <CounterRow key={v.id} label={`${v.icon} ${v.label}`}
          value={data.vehicleCounts?.[v.id]??0}
          onChange={val=>setData({...data,vehicleCounts:{...(data.vehicleCounts||{}),[v.id]:val}})} />
      ))}
      <div style={S.nav}>
        {onBack&&<button style={S.btnB} onClick={onBack}>← Tillbaka</button>}
        <button style={S.btnSk} onClick={()=>onNext(false)}>Hoppa över</button>
        {hasAny&&<button style={S.btnP} onClick={()=>onNext(true)}>Nästa →</button>}
      </div>
    </div>
  );
}

function StepVehicleDetails({data,setData,onNext,onBack}) {
  const counts=data.vehicleCounts||{}, details=data.vehicleDetails||{};
  const vehicles=[];
  VTYPES.forEach(type=>{for(let i=0;i<(counts[type.id]||0);i++) vehicles.push({...type,index:i});});
  const vkey=v=>`${v.id}_${v.index}`;
  const update=(v,field,val)=>setData({...data,vehicleDetails:{...details,[vkey(v)]:{...(details[vkey(v)]||{}),[field]:val}}});
  const get=(v,field)=>details[vkey(v)]?.[field];
  if(vehicles.length===0){onNext();return null;}
  return (
    <div>
      <div style={S.slabel}>Fordonskostnader</div>
      <h2 style={S.h1}>Vad kostar fordonen?</h2>
      <p style={S.sub}>Ange per månad eller år — t.ex. årsvis försäkring eller service.</p>
      {vehicles.map(v=>(
        <div key={vkey(v)} style={S.lcard}>
          <div style={S.lcardT}>{v.icon} {v.label}{vehicles.filter(x=>x.id===v.id).length>1?` #${v.index+1}`:""}</div>
          <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:4}}>Modell / reg.nr</span>
          <input style={S.inp} placeholder="ex. Toyota RAV4 · ABC123" value={get(v,"namn")||""} onChange={e=>update(v,"namn",e.target.value)} />
          <FlexMoneyInput label="Billån / leasing" entry={get(v,"lanEntry")||{}} onChange={e=>update(v,"lanEntry",e)} />
          <FlexMoneyInput label="Försäkring" entry={get(v,"forsakringEntry")||{}} onChange={e=>update(v,"forsakringEntry",e)} />
          <FlexMoneyInput label="Drivmedel (snitt)" entry={get(v,"drivmedEntry")||{}} onChange={e=>update(v,"drivmedEntry",e)} />
          <FlexMoneyInput label="Service + skatt + däck" entry={get(v,"serviceEntry")||{}} onChange={e=>update(v,"serviceEntry",e)} />
        </div>
      ))}
      <NavBar onNext={onNext} onBack={onBack} />
    </div>
  );
}

function StepSubscriptions({data,setData,onNext,onBack}) {
  const sel=data.subscriptions||[], entries=data.subscriptionEntries||{}, custom=data.customSubscriptions||[];
  const toggle=id=>setData({...data,subscriptions:sel.includes(id)?sel.filter(x=>x!==id):[...sel,id]});
  const addCustom=()=>setData({...data,customSubscriptions:[...custom,{label:"",entry:{period:"month",value:""}}]});
  const updateCustom=(i,field,val)=>{const u=[...custom];u[i]={...u[i],[field]:val};setData({...data,customSubscriptions:u});};
  return (
    <div>
      <div style={S.slabel}>Abonnemang</div>
      <h2 style={S.h1}>Vilka abonnemang har ni?</h2>
      <p style={S.sub}>Globala tjänster — inte knutna till en specifik bostad.</p>
      <div style={{display:"flex",flexWrap:"wrap",marginBottom:12}}>
        {SUBTAGS.map(s=><button key={s.id} style={S.tag(sel.includes(s.id))} onClick={()=>toggle(s.id)}>{s.icon} {s.label}</button>)}
      </div>
      {sel.map(id=>{
        const sub=SUBTAGS.find(s=>s.id===id);
        return <FlexMoneyInput key={id} label={`${sub.icon} ${sub.label}`} entry={entries[id]||{}} onChange={e=>setData({...data,subscriptionEntries:{...entries,[id]:e}})} />;
      })}
      {custom.map((s,i)=>(
        <div key={i} style={{marginBottom:6}}>
          <input style={{...S.inp,marginBottom:4}} placeholder="Namn på abonnemang" value={s.label} onChange={e=>updateCustom(i,"label",e.target.value)} />
          <FlexMoneyInput label={s.label||"Abonnemang"} entry={s.entry||{}} onChange={e=>updateCustom(i,"entry",e)} />
        </div>
      ))}
      <button onClick={addCustom} style={{background:"transparent",border:`1px dashed ${C.br}`,borderRadius:10,padding:"9px 14px",color:C.mu,cursor:"pointer",fontSize:12,width:"100%",marginBottom:10}}>
        + Lägg till eget abonnemang
      </button>
      <NavBar onNext={onNext} onBack={onBack} onSkip={onNext} showSkip nextLabel="Spara & nästa" />
    </div>
  );
}

function StepLivingCosts({data,setData,onNext,onBack}) {
  const entries=data.livingEntries||{};
  const upd=(k,e)=>setData({...data,livingEntries:{...entries,[k]:e}});
  const fields=[
    {key:"mat",label:"Mat & dagligvaror"},{key:"restaurang",label:"Restaurang & takeaway"},
    {key:"alkohol",label:"Alkohol & systemet"},{key:"klader",label:"Kläder & skor"},
    {key:"barn",label:"Barnkostnader"},{key:"husdjur",label:"Husdjur"},
    {key:"hem",label:"Hushållsnära tjänster"},{key:"noje",label:"Nöje & fritid"},
    {key:"resor",label:"Semesterresor"},{key:"ovrigt",label:"Övrigt / buffert"},
  ];
  return (
    <div>
      <div style={S.slabel}>Levnadskostnader</div>
      <h2 style={S.h1}>Vad spenderar ni på vardagslivet?</h2>
      {fields.map(f=><FlexMoneyInput key={f.key} label={f.label} entry={entries[f.key]||{}} onChange={e=>upd(f.key,e)} />)}
      <NavBar onNext={onNext} onBack={onBack} onSkip={onNext} showSkip nextLabel="Spara & nästa" />
    </div>
  );
}

function StepSavings({data,setData,onNext,onBack}) {
  const entries=data.savingsEntries||{};
  const upd=(k,e)=>setData({...data,savingsEntries:{...entries,[k]:e}});
  const fields=[
    {key:"buffert",label:"Buffertspar / ISK / sparkonto"},{key:"pension",label:"Pensionssparande"},
    {key:"aktier",label:"Aktier & fonder"},{key:"barn",label:"Barnsparande"},{key:"ovrigt",label:"Övrigt sparande"},
  ];
  return (
    <div>
      <div style={S.slabel}>Sparande</div>
      <h2 style={S.h1}>Hur ser ert sparande ut?</h2>
      {fields.map(f=><FlexMoneyInput key={f.key} label={f.label} entry={entries[f.key]||{}} onChange={e=>upd(f.key,e)} />)}
      <NavBar onNext={onNext} onBack={onBack} onSkip={onNext} showSkip nextLabel="Spara & nästa" />
    </div>
  );
}

function StepSummary({data,onBack,onFinish}) {
  const t=calcTotals(data);
  const cats=[
    {label:"Boende",total:t.housing,icon:"🏠"},{label:"Fordon",total:t.vehicle,icon:"🚗"},
    {label:"Abonnemang",total:t.subs,icon:"📱"},{label:"Levnadskostnader",total:t.living,icon:"🛒"},
    {label:"Sparande",total:t.savings,icon:"💰"},
  ];
  return (
    <div>
      <div style={S.slabel}>Sammanfattning</div>
      <h2 style={S.h1}>Er ekonomiska profil är klar ✓</h2>
      <div style={S.totalCard}>
        <div><div style={{fontSize:11,color:C.mu,textTransform:"uppercase",letterSpacing:1}}>Total månadskostnad (snitt)</div><div style={{fontSize:11,color:C.mu}}>{data.name||"Hushållet"}</div></div>
        <div style={{fontSize:26,fontWeight:700,color:C.al}}>{t.total.toLocaleString("sv-SE")} kr</div>
      </div>
      {cats.filter(c=>c.total>0).map(cat=>(
        <div key={cat.label} style={S.catCard}>
          <div style={{fontSize:10,color:C.mu,textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>{cat.icon} {cat.label}</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:C.mu}}>Snitt / mån</span>
            <span style={{color:C.al,fontWeight:600}}>{fmt(cat.total)}</span>
          </div>
        </div>
      ))}
      <NavBar onNext={onFinish} onBack={onBack} nextLabel="Gå till dashboard" />
    </div>
  );
}

// ── OverviewTab — three sections: fixed / variable / annual ──────────────────
function OverviewTab({t, purchases, budgets, onGoLog}) {
  const monthKey = getCurrentMonthKey();
  const thisMonth = purchases.filter(p => p.monthKey === monthKey);

  // ── Section 1: Fixed monthly costs (from onboarding, never changes)
  const fixedCats = [
    {label:"Boende",       value:t.housing,  icon:"🏠", color:CATCOL.housing,  sub:"Lån, ränta, amortering, avgifter"},
    {label:"Fordon",       value:t.vehicle,  icon:"🚗", color:CATCOL.vehicle,  sub:"Lån, försäkring, drivmedel"},
    {label:"Abonnemang",   value:t.subs,     icon:"📱", color:CATCOL.subs,     sub:"Streaming, bredband, gym..."},
    {label:"Sparande",     value:t.savings,  icon:"💰", color:CATCOL.savings,  sub:"ISK, pension, barnspar"},
  ].filter(c=>c.value>0);
  const fixedTotal = fixedCats.reduce((a,c)=>a+c.value, 0);

  // ── Section 2: Variable — budget vs actual from purchase log
  const variableCats = PURCHASE_CATS.filter(c =>
    budgets[c.id] || thisMonth.some(p=>p.cat===c.id)
  ).map(c => {
    const budget = budgets[c.id] || 0;
    const spent  = thisMonth.filter(p=>p.cat===c.id).reduce((a,p)=>a+Number(p.amount),0);
    const over   = budget>0 && spent>budget;
    const pct    = budget>0 ? Math.min((spent/budget)*100,100) : 0;
    return {...c, budget, spent, over, pct};
  });
  const varSpent  = variableCats.reduce((a,c)=>a+c.spent, 0);
  const varBudget = variableCats.reduce((a,c)=>a+c.budget, 0);
  const recentPurchases = [...thisMonth].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4);

  // ── Section 3: Annual — all items with period=year, grouped by month
  const annualItems = t.allItems.filter(i=>i.entry?.period==="year");
  const annualByMonth = {};
  annualItems.forEach(i=>{
    const m = Number(i.entry.month||1);
    if(!annualByMonth[m]) annualByMonth[m]=[];
    annualByMonth[m].push(i);
  });
  const annualTotal = annualItems.reduce((a,i)=>a+Number(i.entry.value||0),0);
  const nowMonth = new Date().getMonth()+1;
  const upcomingMonths = [];
  for(let offset=0; offset<12; offset++){
    const m = ((nowMonth-1+offset)%12)+1;
    if(annualByMonth[m]) upcomingMonths.push({month:m, items:annualByMonth[m]});
  }

  const secTitle = (txt,sub,color="#fff") => (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:14,fontWeight:700,color,letterSpacing:0.1}}>{txt}</div>
      {sub&&<div style={{fontSize:12,color:C.mu,marginTop:3}}>{sub}</div>}
    </div>
  );

  const divider = <div style={{borderTop:`1px solid ${C.br}`,margin:"20px 0"}} />;

  return (
    <div>
      {/* ── SECTION 1: FAST ─────────────────────────────────── */}
      <div style={{background:"#fff",border:`1px solid ${C.br}`,borderRadius:18,padding:"18px 18px",marginBottom:12,overflow:"hidden",position:"relative",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,#4a7c59,#7ab893)"}} />
        {secTitle("🔒 Fasta månadskostnader","Bolån, fordon, abonnemang, sparande",C.tx)}
        {fixedCats.map(cat=>{
          const subs = t.breakdown[cat.id]?.filter(i=>i.value>0)||[];
          return (
            <div key={cat.label} style={{marginBottom:10,borderRadius:12,overflow:"hidden",border:`1px solid ${cat.color}22`}}>
              {/* Huvudrad */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:cat.color+"0d"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:34,height:34,borderRadius:9,background:cat.color+"22",border:`1px solid ${cat.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{cat.icon}</div>
                  <div>
                    <div style={{fontSize:13,color:C.tx,fontWeight:700}}>{cat.label}</div>
                    <div style={{fontSize:10,color:C.mu}}>{cat.sub}</div>
                  </div>
                </div>
                <span style={{fontWeight:800,color:cat.color,fontSize:15}}>{fmt(cat.value)}</span>
              </div>
              {/* Underkategorier */}
              {subs.length>0&&(
                <div style={{background:"#faf7f2",borderTop:`1px solid ${cat.color}18`}}>
                  {subs.map((sub,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 12px 7px 20px",borderBottom:i<subs.length-1?`1px solid ${C.br}`:undefined}}>
                      <span style={{fontSize:12,color:C.mu,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:cat.color+"88",display:"inline-block",flexShrink:0}}/>
                        {sub.label.split(" – ").slice(1).join(" – ")||sub.label}
                        {sub.entry?.period==="year"&&<span style={{background:C.wa+"22",border:`1px solid ${C.wa}44`,borderRadius:4,padding:"1px 5px",fontSize:9,color:C.wa,marginLeft:3}}>årsvis</span>}
                      </span>
                      <span style={{fontSize:12,fontWeight:600,color:cat.color+"bb"}}>{fmt(sub.value)}/mån</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Progressbar */}
              <div style={{background:cat.color+"11",height:3}}>
                <div style={{height:"100%",width:`${(cat.value/Math.max(fixedTotal,1))*100}%`,background:cat.color,transition:"width 0.4s"}} />
              </div>
            </div>
          );
        })}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:12,marginTop:8,borderTop:`1px solid ${C.br}`}}>
          <span style={{fontSize:11,color:C.mu,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Summa fast / mån</span>
          <span style={{fontSize:24,fontWeight:800,color:C.ac}}>{fmt(fixedTotal)}</span>
        </div>
      </div>

      {divider}

      {/* ── SECTION 2: RÖRLIG ───────────────────────────────── */}
      <div style={{background:"#fff",border:`1px solid ${C.br}`,borderRadius:18,padding:"18px 18px",marginBottom:12,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
        {secTitle("📊 Rörliga utgifter — "+fmtMonthLabel(monthKey),"Faktiska köp denna månad vs budget",C.tx)}
        {variableCats.length===0?(
          <div style={{textAlign:"center",padding:"20px 0",color:C.mu,fontSize:13}}>
            Inga köp loggade denna månad ännu.
            <br/><button onClick={onGoLog} style={{background:"transparent",border:"none",color:C.ac,cursor:"pointer",fontSize:13,marginTop:8,textDecoration:"underline",fontWeight:600}}>Gå till köplog →</button>
          </div>
        ):(
          <>
            {variableCats.map(cat=>(
              <div key={cat.id} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:13,color:C.tx,display:"flex",alignItems:"center",gap:8,fontWeight:600}}>
                    <span style={{fontSize:18}}>{cat.icon}</span>{cat.label}
                  </span>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontWeight:700,color:cat.over?C.er:C.al,fontSize:14}}>{cat.spent.toLocaleString("sv-SE")} kr</span>
                    {cat.budget>0&&<span style={{fontSize:11,color:C.mu}}> / {cat.budget.toLocaleString("sv-SE")}</span>}
                  </div>
                </div>
                {cat.budget>0&&(
                  <div style={{background:"#f0ebe0",borderRadius:6,height:6,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${cat.pct}%`,background:cat.over?C.er:C.ac,borderRadius:6,transition:"width 0.4s"}} />
                  </div>
                )}
                {cat.over&&<div style={{fontSize:11,color:C.er,marginTop:3,fontWeight:600}}>⚠ {(cat.spent-cat.budget).toLocaleString("sv-SE")} kr över budget</div>}
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:12,marginTop:4,borderTop:`1px solid ${C.br}`}}>
              <div>
                <div style={{fontSize:11,color:C.mu,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Spenderat denna månad</div>
                {varBudget>0&&<div style={{fontSize:11,color:varSpent>varBudget?C.er:C.ac,marginTop:2,fontWeight:600}}>
                  {varSpent>varBudget?`${(varSpent-varBudget).toLocaleString("sv-SE")} kr över budget`:`${(varBudget-varSpent).toLocaleString("sv-SE")} kr kvar`}
                </div>}
              </div>
              <span style={{fontSize:24,fontWeight:800,color:varSpent>varBudget?C.er:C.wa}}>{fmt(varSpent)}</span>
            </div>
          </>
        )}
        {recentPurchases.length>0&&(
          <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${C.br}`}}>
            <div style={{fontSize:10,color:C.mu,marginBottom:10,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Senaste köp</div>
            {recentPurchases.map(p=>{
              const ci=PURCHASE_CATS.find(c=>c.id===p.cat)||{icon:"📦",color:C.mu};
              return (
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.br}`,fontSize:13}}>
                  <span style={{color:C.txs,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:15}}>{ci.icon}</span>{p.desc}</span>
                  <span style={{color:C.al,fontWeight:700}}>{Number(p.amount).toLocaleString("sv-SE")} kr</span>
                </div>
              );
            })}
            <button onClick={onGoLog} style={{background:"transparent",border:"none",color:C.ac,cursor:"pointer",fontSize:12,marginTop:10,textDecoration:"underline",padding:0,fontWeight:600}}>
              Visa alla köp →
            </button>
          </div>
        )}
      </div>

      {divider}

      {/* ── SECTION 3: ÅRSUTGIFTER ──────────────────────────── */}
      <div style={{background:"#fff",border:`1px solid ${C.br}`,borderRadius:18,padding:"18px 18px",marginBottom:12,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
        {secTitle("📅 Årsutgifter","Betalningar en gång per år — kronologisk ordning",C.tx)}
        {annualTotal===0?(
          <div style={{textAlign:"center",padding:"16px 0",color:C.mu,fontSize:13}}>Inga årsbetalningar registrerade ännu.</div>
        ):(
          <>
            {upcomingMonths.map(({month,items})=>{
              const isPast=month<nowMonth;
              const isCurrent=month===nowMonth;
              return (
                <div key={month} style={{marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:isCurrent?C.ac:isPast?C.br:C.wa,flexShrink:0}} />
                    <span style={{fontSize:11,fontWeight:700,color:isCurrent?C.ac:isPast?C.mu:C.wa,textTransform:"uppercase",letterSpacing:1.5}}>
                      {MONTHS[month-1]}{isCurrent?" — denna månad":""}
                    </span>
                    <span style={{fontSize:12,color:C.mu,marginLeft:"auto",fontWeight:600}}>{items.reduce((a,i)=>a+Number(i.entry.value||0),0).toLocaleString("sv-SE")} kr</span>
                  </div>
                  {items.map((item,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0 7px 16px",borderBottom:`1px solid ${C.br}`,fontSize:13,opacity:isPast?0.5:1}}>
                      <span style={{color:C.txs,display:"flex",alignItems:"center",gap:7}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:item.color,display:"inline-block",flexShrink:0}} />
                        {item.label}
                      </span>
                      <span style={{color:C.wa,fontWeight:700}}>{Number(item.entry.value||0).toLocaleString("sv-SE")} kr</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:12,marginTop:4,borderTop:`1px solid ${C.br}`}}>
              <div>
                <div style={{fontSize:11,color:C.mu,textTransform:"uppercase",letterSpacing:1.5,fontWeight:600}}>Totalt per år</div>
                <div style={{fontSize:11,color:C.mu,marginTop:2}}>≈ {fmt(annualTotal/12)}/mån i snitt</div>
              </div>
              <span style={{fontSize:24,fontWeight:800,color:C.wa}}>{annualTotal.toLocaleString("sv-SE")} kr</span>
            </div>
          </>
        )}
      </div>

      {/* ── GRAND TOTAL ─────────────────────────────────────── */}
      <div style={{background:"linear-gradient(135deg,#e8f5ec,#f0f7ed)",border:`1px solid #4a7c5933`,borderRadius:18,padding:"18px 18px",marginTop:4,boxShadow:"0 2px 12px rgba(74,124,89,0.12)"}}>
        <div style={{fontSize:11,color:C.ac,textTransform:"uppercase",letterSpacing:1.5,marginBottom:14,fontWeight:700}}>Sammanlagd månadskostnad</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:C.mu}}>Fasta kostnader</span>
            <span style={{color:C.ac,fontWeight:700}}>{fmt(fixedTotal)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:C.mu}}>Rörliga (denna månad)</span>
            <span style={{color:C.wa,fontWeight:700}}>{fmt(varSpent)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
            <span style={{color:C.mu}}>Årsutgifter (månadssnitt)</span>
            <span style={{color:C.wa,fontWeight:700}}>{fmt(annualTotal/12)}</span>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:14,borderTop:`1px solid #4a7c5933`}}>
          <span style={{fontSize:12,color:C.ac,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700}}>Total / mån</span>
          <span style={{fontSize:30,fontWeight:800,color:C.ac}}>{fmt(fixedTotal+varSpent+annualTotal/12)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Purchase categories (maps to living cost keys)
const PURCHASE_CATS = [
  {id:"mat",    label:"Mat & dagligvaror",  icon:"🛒", color:"#ff6b6b"},
  {id:"restaurang",label:"Restaurang",      icon:"🍽️", color:"#ff8c69"},
  {id:"alkohol",label:"Alkohol",            icon:"🍷", color:"#c084fc"},
  {id:"klader", label:"Kläder & skor",      icon:"👕", color:"#60a5fa"},
  {id:"barn",   label:"Barnkostnader",      icon:"🧸", color:"#f472b6"},
  {id:"husdjur",label:"Husdjur",            icon:"🐾", color:"#a3e635"},
  {id:"hem",    label:"Hushållstjänster",   icon:"🧹", color:"#34d399"},
  {id:"noje",   label:"Nöje & fritid",      icon:"🎮", color:"#fbbf24"},
  {id:"resor",  label:"Resor",              icon:"✈️", color:"#38bdf8"},
  {id:"ovrigt", label:"Övrigt",             icon:"📦", color:"#94a3b8"},
  {id:"fordon", label:"Fordon (extra)",     icon:"🚗", color:"#4ecca3"},
  {id:"boende", label:"Boende (extra)",     icon:"🏠", color:"#6c63ff"},
];

function getCurrentMonthKey() {
  const n=new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;
}
function fmtMonthLabel(key) {
  const [y,m]=key.split("-");
  return MONTHS[parseInt(m)-1]+" "+y;
}

// ── PurchaseLog component
function PurchaseLog({purchases,setPurchases,budgets}) {
  const [filterCat,setFilterCat]=useState("all");
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({desc:"",amount:"",cat:"mat",date:new Date().toISOString().slice(0,10)});
  const [deleteId,setDeleteId]=useState(null);

  const monthKey=getCurrentMonthKey();
  // Group by month for display, default show current
  const [viewMonth,setViewMonth]=useState(monthKey);

  // All months that have purchases
  const allMonths=[...new Set(purchases.map(p=>p.monthKey))].sort().reverse();
  if(!allMonths.includes(monthKey)) allMonths.unshift(monthKey);

  const monthPurchases=purchases.filter(p=>p.monthKey===viewMonth);
  const filtered=filterCat==="all"?monthPurchases:monthPurchases.filter(p=>p.cat===filterCat);
  const sorted=[...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date));

  // Totals per category this month
  const catTotals={};
  monthPurchases.forEach(p=>{catTotals[p.cat]=(catTotals[p.cat]||0)+Number(p.amount);});
  const monthTotal=Object.values(catTotals).reduce((a,b)=>a+b,0);

  const addPurchase=()=>{
    if(!form.desc||!form.amount) return;
    const mk=form.date.slice(0,7);
    const newP={id:Date.now(),desc:form.desc,amount:Number(form.amount),cat:form.cat,date:form.date,monthKey:mk};
    setPurchases([...purchases,newP]);
    setForm({desc:"",amount:"",cat:form.cat,date:new Date().toISOString().slice(0,10)});
    setShowAdd(false);
    setViewMonth(mk);
  };

  const deletePurchase=id=>setPurchases(purchases.filter(p=>p.id!==id));

  const catInfo=id=>PURCHASE_CATS.find(c=>c.id===id)||{label:id,icon:"📦",color:C.mu};

  return (
    <div>
      {/* Month selector */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,marginBottom:12}}>
        {allMonths.map(mk=>(
          <button key={mk} onClick={()=>setViewMonth(mk)}
            style={{flexShrink:0,padding:"6px 12px",borderRadius:8,fontSize:12,cursor:"pointer",border:`1px solid ${viewMonth===mk?C.ac:C.br}`,background:viewMonth===mk?C.ad:C.cd,color:viewMonth===mk?C.al:C.mu,whiteSpace:"nowrap"}}>
            {fmtMonthLabel(mk)}
          </button>
        ))}
      </div>

      {/* Monthly total + add button */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <div style={{fontSize:10,color:C.mu,textTransform:"uppercase",letterSpacing:1}}>Totalt spenderat</div>
          <div style={{fontSize:22,fontWeight:700,color:C.al}}>{monthTotal.toLocaleString("sv-SE")} kr</div>
        </div>
        <button onClick={()=>setShowAdd(true)}
          style={{background:C.ac,border:"none",borderRadius:10,padding:"10px 16px",color:"white",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          + Nytt köp
        </button>
      </div>

      {/* Budget bars per category */}
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
        {PURCHASE_CATS.filter(c=>catTotals[c.id]||budgets[c.id]).map(cat=>{
          const spent=catTotals[cat.id]||0;
          const budget=budgets[cat.id]||0;
          const pctUsed=budget>0?Math.min((spent/budget)*100,100):0;
          const over=budget>0&&spent>budget;
          return (
            <div key={cat.id}
              onClick={()=>setFilterCat(filterCat===cat.id?"all":cat.id)}
              style={{background:filterCat===cat.id?cat.color+"18":C.sf,border:`1px solid ${filterCat===cat.id?cat.color:C.br}`,borderRadius:10,padding:"10px 13px",cursor:"pointer",transition:"all 0.15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:budget>0?6:0}}>
                <span style={{fontSize:13,display:"flex",alignItems:"center",gap:7}}><span>{cat.icon}</span>{cat.label}</span>
                <div style={{textAlign:"right"}}>
                  <span style={{fontWeight:600,color:over?C.er:cat.color,fontSize:13}}>{spent.toLocaleString("sv-SE")} kr</span>
                  {budget>0&&<span style={{fontSize:11,color:C.mu}}> / {budget.toLocaleString("sv-SE")}</span>}
                </div>
              </div>
              {budget>0&&(
                <div style={{background:C.br,borderRadius:4,height:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pctUsed}%`,background:over?C.er:cat.color,borderRadius:4,transition:"width 0.4s"}} />
                </div>
              )}
              {over&&<div style={{fontSize:10,color:C.er,marginTop:4}}>⚠ {(spent-budget).toLocaleString("sv-SE")} kr över budget</div>}
            </div>
          );
        })}
      </div>

      {/* Filter pill */}
      {filterCat!=="all"&&(
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:12,color:C.mu}}>Visar:</span>
          <span style={{background:catInfo(filterCat).color+"22",border:`1px solid ${catInfo(filterCat).color}`,borderRadius:6,padding:"3px 10px",fontSize:12,color:catInfo(filterCat).color}}>
            {catInfo(filterCat).icon} {catInfo(filterCat).label}
          </span>
          <button onClick={()=>setFilterCat("all")} style={{background:"transparent",border:"none",color:C.mu,fontSize:11,cursor:"pointer"}}>✕ Rensa</button>
        </div>
      )}

      {/* Purchase list */}
      {sorted.length===0?(
        <div style={{textAlign:"center",padding:"28px 0",color:C.mu,fontSize:13}}>
          {filterCat==="all"?"Inga köp registrerade denna månad":"Inga köp i denna kategori"}
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {sorted.map(p=>{
            const ci=catInfo(p.cat);
            return (
              <div key={p.id} style={{background:C.sf,border:`1px solid ${C.br}`,borderRadius:10,padding:"11px 13px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:8,background:ci.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{ci.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.desc}</div>
                  <div style={{fontSize:11,color:C.mu,marginTop:1}}>{ci.label} · {p.date}</div>
                </div>
                <div style={{fontWeight:700,color:ci.color,fontSize:14,flexShrink:0}}>{Number(p.amount).toLocaleString("sv-SE")} kr</div>
                <button onClick={()=>setDeleteId(p.id)}
                  style={{background:"transparent",border:`1px solid ${C.br}`,borderRadius:6,width:26,height:26,cursor:"pointer",color:C.mu,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add purchase sheet */}
      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"#0f0f13cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:"0 16px 24px"}}
          onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div style={{background:C.sf,border:`1px solid ${C.br}`,borderRadius:20,width:"100%",maxWidth:540,overflow:"hidden"}}>
            <div style={{padding:"18px 20px 14px",borderBottom:`1px solid ${C.br}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:16,fontWeight:600}}>Nytt köp</span>
              <button onClick={()=>setShowAdd(false)} style={{background:C.cd,border:`1px solid ${C.br}`,borderRadius:8,width:28,height:28,cursor:"pointer",color:C.mu,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{padding:"16px 20px 20px"}}>
              {/* Category selector */}
              <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:6}}>Kategori</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
                {PURCHASE_CATS.map(c=>(
                  <button key={c.id} onClick={()=>setForm({...form,cat:c.id})}
                    style={{padding:"5px 10px",borderRadius:7,fontSize:12,cursor:"pointer",border:`1px solid ${form.cat===c.id?c.color:C.br}`,background:form.cat===c.id?c.color+"22":"transparent",color:form.cat===c.id?c.color:C.mu}}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
              <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:5}}>Beskrivning</span>
              <input style={{...S.inp}} placeholder="ex. Skor HM" value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} />
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}>
                  <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:5}}>Belopp</span>
                  <div style={S.inpRow}>
                    <input style={{...S.inp,flex:1,marginBottom:0}} type="number" placeholder="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} />
                    <div style={S.pfx}>kr</div>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <span style={{fontSize:11,color:C.mu,display:"block",marginBottom:5}}>Datum</span>
                  <input style={{...S.inp,colorScheme:"dark",marginBottom:0}} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
                </div>
              </div>
              <button onClick={addPurchase} disabled={!form.desc||!form.amount}
                style={{...S.btnP,marginTop:12,opacity:!form.desc||!form.amount?0.4:1}}>
                Spara köp →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId&&(
        <div style={{position:"fixed",inset:0,background:"#0f0f13cc",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:24}}>
          <div style={{background:C.sf,border:`1px solid ${C.br}`,borderRadius:16,padding:24,maxWidth:320,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>Ta bort köp?</div>
            <div style={{fontSize:13,color:C.mu,marginBottom:20}}>Det här går inte att ångra.</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setDeleteId(null)} style={{...S.btnB,flex:1}}>Avbryt</button>
              <button onClick={()=>{deletePurchase(deleteId);setDeleteId(null);}} style={{flex:1,background:C.er,border:"none",borderRadius:10,padding:"12px",color:"white",fontSize:14,fontWeight:600,cursor:"pointer"}}>Ta bort</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({data,onEdit,purchases,setPurchases}) {
  const t=useMemo(()=>calcTotals(data),[data]);
  const cats=[
    {label:"Boende",total:t.housing,icon:"🏠",color:CATCOL.housing},
    {label:"Fordon",total:t.vehicle,icon:"🚗",color:CATCOL.vehicle},
    {label:"Abonnemang",total:t.subs,icon:"📱",color:CATCOL.subs},
    {label:"Levnadskostnader",total:t.living,icon:"🛒",color:CATCOL.living},
    {label:"Sparande",total:t.savings,icon:"💰",color:CATCOL.savings},
  ].filter(c=>c.total>0);
  const maxCat=Math.max(...cats.map(c=>c.total),1);
  const [tab,setTab]=useState("overview");
  const villkor=[];
  Object.entries(data.propertyDetails||{}).forEach(([tid,d])=>{
    const days=daysUntil(d.villkorsDatum);
    if(days!==null&&days>=0) villkor.push({label:PTYPES.find(p=>p.id===tid)?.label||tid,days,datum:d.villkorsDatum,nyRanta:d.nyRanta});
  });
  villkor.sort((a,b)=>a.days-b.days);

  // Build budgets from living entries
  const budgets={};
  const le=data.livingEntries||{};
  Object.entries(le).forEach(([k,e])=>{ if(e?.value) budgets[k]=toMonthly(e); });

  return (
    <div style={{width:"100%",maxWidth:"100%",margin:"0 auto",padding:"0 0 80px",background:C.bg,minHeight:"100vh",minHeight:"100dvh"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(160deg,#e8f5ec 0%,#f0ede4 60%,#f5f0e8 100%)",padding:"52px 20px 24px",borderBottom:`1px solid ${C.br}`,marginBottom:0}}>
        <div style={{fontSize:10,letterSpacing:3,color:C.ac,textTransform:"uppercase",marginBottom:8,fontWeight:700}}>Hushållsekonomi</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <h1 style={{fontSize:30,fontWeight:800,marginBottom:6,letterSpacing:-0.5,color:C.tx}}>{data.name||"Ert hushåll"}</h1>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{background:"#4a7c5920",border:"1px solid #4a7c5940",borderRadius:20,padding:"3px 12px",fontSize:11,color:C.ac,fontWeight:600}}>{data.adults??2} vuxna</span>
              <span style={{background:"#4a7c5920",border:"1px solid #4a7c5940",borderRadius:20,padding:"3px 12px",fontSize:11,color:C.ac,fontWeight:600}}>{data.children??0} barn</span>
            </div>
          </div>
          <button onClick={onEdit} style={{background:"#fff",border:`1px solid ${C.br}`,borderRadius:12,padding:"10px 16px",color:C.tx,cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:600,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
            ✏️ Ändra
          </button>
        </div>
      </div>

      {/* Villkor alerts */}
      {villkor.slice(0,2).length>0&&(
        <div style={{padding:"12px 16px 0"}}>
          {villkor.slice(0,2).map((v,i)=>(
            <div key={i} style={{marginBottom:8,padding:"10px 14px",borderRadius:12,fontSize:12,display:"flex",justifyContent:"space-between",alignItems:"center",
              ...(v.days<=30?{background:"#ff6b6b18",border:`1px solid ${C.er}`,color:C.er}
                :v.days<=90?{background:"#f5a62318",border:`1px solid ${C.wa}`,color:C.wa}
                :{background:C.cd,border:`1px solid ${C.br}`,color:C.mu})}}>
              <span>{v.days<=30?"🚨":v.days<=90?"⏳":"📅"} <strong>{v.label}</strong> — {fmtDate(v.datum)}{v.nyRanta?` · ${v.nyRanta}%`:""}</span>
              <span style={{fontWeight:700,marginLeft:10}}>{v.days}d</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar — sticky */}
      <div style={{position:"sticky",top:0,zIndex:10,background:C.bg,padding:"10px 16px 8px",borderBottom:`1px solid ${C.br}`}}>
        <div style={{display:"flex",gap:3,background:"#ede8df",border:`1px solid ${C.br}`,borderRadius:14,padding:4}}>
          {[["overview","Översikt"],["chart","Diagram"],["calendar","Månadsplan"],["log","Köplog"]].map(([id,lbl])=>(
            <button key={id} style={{flex:1,padding:"10px 4px",border:"none",borderRadius:11,fontFamily:"inherit",fontSize:12,fontWeight:tab===id?700:500,cursor:"pointer",background:tab===id?C.ac:"transparent",color:tab===id?"white":C.mu,transition:"all 0.15s",boxShadow:tab===id?"0 2px 8px rgba(74,124,89,0.3)":"none"}} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"16px 16px 0"}}>

      {tab==="overview"&&(
        <OverviewTab t={t} purchases={purchases} budgets={budgets} onGoLog={()=>setTab("log")} />
      )}
      {tab==="chart"&&<ChartSection t={t} data={data} />}
      {tab==="calendar"&&<MonthlyCalendar t={t} />}
      {tab==="log"&&<PurchaseLog purchases={purchases} setPurchases={setPurchases} budgets={budgets} />}

      <div style={{background:C.ad,border:`1px dashed ${C.ac}`,borderRadius:14,padding:"14px 16px",marginTop:16,marginBottom:16,textAlign:"center"}}>
        <div style={{fontSize:12,color:C.al,marginBottom:3}}>🔜 Kommande funktioner</div>
        <div style={{fontSize:12,color:C.mu,lineHeight:1.6}}>Löneberäkning · Disponibel inkomst · Firebase-sync</div>
      </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
const ALL_STEPS=["welcome","household","properties","property-details","vehicle-count","vehicle-details","subscriptions","living","savings","summary","dashboard"];
const PROG_STEPS=ALL_STEPS.filter(s=>s!=="welcome"&&s!=="dashboard");
const STORAGE_KEY="hushall-ekonomi-v1";
const STEP_KEY="hushall-step-v1";

export default function App() {
  const [si,setSi]=useState(0);
  const [data,setData]=useState({});
  const [purchases,setPurchasesRaw]=useState([]);
  const [editMenu,setEditMenu]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [saveStatus,setSaveStatus]=useState(null);
  const PURCHASES_KEY="hushall-purchases-v1";

  // Load from localStorage on mount
  useEffect(()=>{
    try {
      const dr=localStorage.getItem(STORAGE_KEY);
      const sr=localStorage.getItem(STEP_KEY);
      const pr=localStorage.getItem(PURCHASES_KEY);
      if(dr) setData(JSON.parse(dr));
      if(pr) setPurchasesRaw(JSON.parse(pr));
      if(sr) {
        const savedStep=parseInt(sr,10);
        if(savedStep>=ALL_STEPS.indexOf("dashboard")) setSi(ALL_STEPS.indexOf("dashboard"));
        else setSi(savedStep||0);
      }
    } catch(e) {}
    setLoaded(true);
  },[]);

  const saveData=useCallback((newData,newSi)=>{
    setSaveStatus("saving");
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(newData));
      localStorage.setItem(STEP_KEY,String(newSi));
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus(null),2000);
    } catch(e) { setSaveStatus("error"); }
  },[]);

  const setPurchases=useCallback((newP)=>{
    setPurchasesRaw(newP);
    setSaveStatus("saving");
    try {
      localStorage.setItem(PURCHASES_KEY,JSON.stringify(newP));
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus(null),2000);
    } catch(e) { setSaveStatus("error"); }
  },[]);

  const setDataAndSave=useCallback((newData)=>{
    setData(newData);
    saveData(newData,si);
  },[si,saveData]);

  const setSiAndSave=useCallback((fn)=>{
    setSi(prev=>{
      const next=typeof fn==="function"?fn(prev):fn;
      saveData(data,next);
      return next;
    });
  },[data,saveData]);

  const step=ALL_STEPS[si];
  const next=()=>setSiAndSave(i=>i+1);
  const goTo=id=>{
    const idx=ALL_STEPS.indexOf(id);
    setSi(idx);
    saveData(data,idx);
  };
  const cp=PROG_STEPS.indexOf(step);

  if(!loaded) return (
    <div style={{...S.app,gap:12}}>
      <div style={{width:32,height:32,border:`3px solid ${C.br}`,borderTopColor:C.ac,borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{color:C.mu,fontSize:13}}>Laddar sparad data...</span>
    </div>
  );

  return (
    <div style={step==="dashboard"?{background:C.bg,minHeight:"100vh"}:S.app}>
      {/* Save status indicator */}
      {saveStatus&&(
        <div style={{position:"fixed",bottom:16,right:16,background:saveStatus==="saved"?C.ok:saveStatus==="error"?C.er:C.mu,color:"white",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:600,zIndex:999,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
          {saveStatus==="saving"&&"💾 Sparar..."}
          {saveStatus==="saved"&&"✓ Sparat"}
          {saveStatus==="error"&&"⚠ Kunde inte spara"}
        </div>
      )}

      {step!=="dashboard"&&step!=="welcome"&&(
        <div style={{width:"100%",maxWidth:560,marginBottom:12}}>
          <div style={S.prog}>
            {PROG_STEPS.map((s,i)=><div key={s} style={S.dot(i<cp,i===cp)} />)}
          </div>
        </div>
      )}
      {step!=="dashboard"?(
        <div style={S.card}>
          <div style={S.bar} />
          {step==="welcome"&&<StepWelcome onNext={next} />}
          {step==="household"&&<StepHousehold data={data} setData={setDataAndSave} onNext={next} onBack={si>1?()=>goTo("dashboard"):null} />}
          {step==="properties"&&<StepProperties data={data} setData={setDataAndSave} onNext={next} onBack={()=>goTo("dashboard")} />}
          {step==="property-details"&&<StepPropertyDetails data={data} setData={setDataAndSave} onNext={next} onBack={()=>goTo("dashboard")} />}
          {step==="vehicle-count"&&<StepVehicleCount data={data} setData={setDataAndSave} onBack={()=>goTo("dashboard")} onNext={has=>{has?next():goTo("subscriptions");}} />}
          {step==="vehicle-details"&&<StepVehicleDetails data={data} setData={setDataAndSave} onNext={next} onBack={()=>goTo("dashboard")} />}
          {step==="subscriptions"&&<StepSubscriptions data={data} setData={setDataAndSave} onNext={next} onBack={()=>goTo("dashboard")} />}
          {step==="living"&&<StepLivingCosts data={data} setData={setDataAndSave} onNext={next} onBack={()=>goTo("dashboard")} />}
          {step==="savings"&&<StepSavings data={data} setData={setDataAndSave} onNext={next} onBack={()=>goTo("dashboard")} />}
          {step==="summary"&&<StepSummary data={data} onBack={()=>setSiAndSave(i=>i-1)} onFinish={()=>goTo("dashboard")} />}
          {si>=ALL_STEPS.indexOf("household")&&step!=="summary"&&(
            <div style={{textAlign:"center",marginTop:14}}>
              <button onClick={()=>goTo("dashboard")} style={{background:"transparent",border:"none",color:C.mu,fontSize:11,cursor:"pointer",textDecoration:"underline"}}>
                Tillbaka till dashboard
              </button>
            </div>
          )}
        </div>
      ):(
        <Dashboard data={data} onEdit={()=>setEditMenu(true)} purchases={purchases} setPurchases={setPurchases} />
      )}
      {editMenu&&<EditMenu onSelect={id=>{setEditMenu(false);goTo(id);}} onClose={()=>setEditMenu(false)} />}
    </div>
  );
}
