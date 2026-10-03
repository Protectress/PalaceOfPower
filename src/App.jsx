import { useState, useEffect, useMemo, useRef, useCallback, Component } from "react";

/* ═══ ERROR BOUNDARY ═══ */
class EB extends Component{
  /* ═══ WHEN SOMETHING GOES WRONG ═══
     This used to offer exactly one button, and that button deleted every hcm-
     key in localStorage \u2014 which is where the schedules live, and the only copy
     of them there is. A render bug therefore cost the user everything they had
     built. Never again: the first thing offered is a BACKUP, the default action
     is a plain reload that touches nothing, and clearing is last, named for what
     it does, and behind a confirm.
     The error text is shown too. Without it a crash is unreportable. */
  constructor(p){super(p);this.state={e:false,msg:"",stack:""};}
  static getDerivedStateFromError(){return{e:true};}
  componentDidCatch(err,info){
    try{this.setState({msg:String(err&&err.message||err),
      stack:String((info&&info.componentStack)||"").split("\n").slice(0,6).join("\n")});}catch(x){}
  }
  backup(){
    try{
      const dump={};
      Object.keys(localStorage).filter(k=>k.startsWith("hcm-"))
        .forEach(k=>{dump[k]=localStorage.getItem(k);});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(new Blob([JSON.stringify(dump,null,1)],
        {type:"application/json"}));
      a.download="palaceofpower-backup-"+new Date().toISOString().slice(0,19)
        .replace(/[:T]/g,"-")+".json";
      a.click();
    }catch(e){alert("Could not write the backup: "+e);}
  }
  render(){
    if(!this.state.e)return this.props.children;
    const btn=(bg,bd,col)=>({background:bg,border:"1px solid "+bd,borderRadius:8,
      padding:"10px 20px",color:col,fontSize:14,cursor:"pointer",fontWeight:600});
    return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",
      justifyContent:"center",background:"#0f1216",color:"#e8eef5",flexDirection:"column",
      gap:14,fontFamily:"sans-serif",padding:24,textAlign:"center"}}>
      <div style={{fontSize:18,fontWeight:600}}>Something went wrong</div>
      <div style={{fontSize:13,color:"#94a3b8",maxWidth:560}}>
        Your schedules are still saved. Take a backup before doing anything else.
      </div>
      {this.state.msg&&<pre style={{fontSize:11,color:"#f472b6",maxWidth:620,
        whiteSpace:"pre-wrap",textAlign:"left",background:"rgba(244,114,182,.06)",
        border:"1px solid rgba(244,114,182,.2)",borderRadius:8,padding:"10px 12px",
        margin:0,overflow:"auto",maxHeight:200}}>{this.state.msg}
        {this.state.stack?"\n"+this.state.stack:""}</pre>}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
        <button onClick={()=>this.backup()}
          style={btn("rgba(52,211,153,.12)","rgba(52,211,153,.35)","#34d399")}>
          Download backup</button>
        <button onClick={()=>window.location.reload()}
          style={btn("rgba(148,163,184,.1)","rgba(148,163,184,.3)","#e8eef5")}>
          Reload</button>
      </div>
      <button onClick={()=>{
        if(!window.confirm("This deletes every schedule, calendar entry and setting "
          +"stored in this browser. There is no undo. Download a backup first.\n\n"
          +"Delete everything and reload?"))return;
        try{Object.keys(localStorage).filter(k=>k.startsWith("hcm-"))
          .forEach(k=>localStorage.removeItem(k));}catch(e){}
        window.location.reload();}}
        style={{...btn("transparent","rgba(148,163,184,.25)","#64748b"),fontSize:12,
          padding:"6px 14px",marginTop:6}}>
        Erase all saved data and reload</button>
    </div>;
  }
}

/* ═══ NUM INPUT ═══ */
function NI({value:v,onChange:oc,min,max,step,style:s,placeholder:ph}){const[l,sL]=useState(String(v??""));const p=useRef(v);useEffect(()=>{if(v!==p.current){sL(String(v??""));p.current=v;}},[v]);return<input type="text" inputMode="decimal" value={l} placeholder={ph} onChange={e=>sL(e.target.value)} onBlur={()=>{const n=parseFloat(l);const c=isNaN(n)?(min??0):Math.max(min??-Infinity,Math.min(max??Infinity,n));sL(String(c));p.current=c;oc(c);}} onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}} style={s}/>;}

/* ═══ PK ENGINE ═══ */
function evC(pts,t){if(!pts||!pts.length)return 0;if(pts.length===1)return pts[0].v;if(t<=pts[0].t)return pts[0].v;if(t>=pts[pts.length-1].t){const L=pts[pts.length-1],P=pts.length>1?pts[pts.length-2]:{t:L.t-1,v:L.v};if(L.v<=0)return 0;const d=L.t-P.t;if(d<=0||P.v<=0||L.v>=P.v)return Math.max(0,L.v*Math.exp(-.231*(t-L.t)));return Math.max(0,L.v*Math.exp(-(Math.log(P.v/L.v)/d)*(t-L.t)));}const n=pts.length,dl=[];for(let i=0;i<n-1;i++){const h=pts[i+1].t-pts[i].t;dl.push(h>0?(pts[i+1].v-pts[i].v)/h:0);}const m=new Array(n).fill(0);m[0]=dl[0];m[n-1]=dl[n-2];for(let i=1;i<n-1;i++){if(dl[i-1]*dl[i]<=0)m[i]=0;else m[i]=(dl[i-1]+dl[i])/2;}for(let i=0;i<n-1;i++){if(Math.abs(dl[i])<1e-10){m[i]=0;m[i+1]=0;continue;}const a=m[i]/dl[i],b=m[i+1]/dl[i],s=a*a+b*b;if(s>9){const tau=3/Math.sqrt(s);m[i]=tau*a*dl[i];m[i+1]=tau*b*dl[i];}}for(let i=0;i<n-1;i++){if(t>=pts[i].t&&t<=pts[i+1].t){const h=pts[i+1].t-pts[i].t;if(h<=0)return pts[i].v;const u=(t-pts[i].t)/h,u2=u*u,u3=u2*u;return Math.max(0,(2*u3-3*u2+1)*pts[i].v+(u3-2*u2+u)*h*m[i]+(-2*u3+3*u2)*pts[i+1].v+(u3-u2)*h*m[i+1]);}}return 0;}
function pkV(t,pk){if(t<=0||!pk)return 0;const ke=.693/Math.max(.5,pk.decayHalf),ka=ke+pk.riseSharp/Math.max(.3,pk.tPeak);if(ka<=ke)return 0;const tm=Math.log(ka/ke)/(ka-ke),cm=ka/(ka-ke)*(Math.exp(-ke*tm)-Math.exp(-ka*tm));if(cm<=0)return 0;return Math.max(0,pk.peak*ka/(ka-ke)*(Math.exp(-ke*t)-Math.exp(-ka*t))/cm);}
// E2: dose_mg / conc = mL, then mL/refDoseMl scales the curve
function e2L(t,injs,pts,refMg,conc,fl,md,pk){let s=0;const refMl=(refMg||1)/(conc||20);const f=fl??2;for(const i of injs){const dt=t-i.day;if(dt>0){const ml=(i.dose_mg||0)/(conc||20);const c=(md==="pk"?pkV(dt,pk):evC(pts,dt))*(ml/refMl);if(c>=f)s+=c;}}return s;}
// Default matrix-patch decline shape (normalized: t 0..1 over patch duration,
// v 0..1 over pg/mL-per-unit). Based on estrannaise twice-weekly matrix patch:
// starts at peak right after the onset ramp, declines to ~50% by nominal removal.
// This is the decline of the PLATEAU only; the existing quick ramp-up (onset)
// and ramp-down (post-removal) are unchanged and attach to this curve's ends.
// Decline shape sampled from estrannaise's exact patch tw 3-compartment model
// (PKParameters [16.792,0.283,5.592,4.3], W=3.5d). Normalized: t 0..1 over wear
// duration, v 0..1 over peak. Starts at peak (the quick ramp-up onset and the
// post-removal ramp-down are added separately in e2P and are NOT part of this curve).
// Declines to ~52% of peak by nominal removal, matching estrannaise.
/* Full decay, x-axis in units of one half-life: 50% at 3.5d, 25% at 7d, 12% at
   10.5d, 6% at 14d. Editable per medication like any other waveform. */
/* The ramp up lives IN the curve, visibly, for every patch — nothing synthesises
   it behind the scenes any more. Steep climb over day one, then decay. */
const DEF_PATCH_CURVE=[{t:0,v:0},{t:.0714,v:.55},{t:.1429,v:.85},{t:.2857,v:1},{t:.5,v:.826},{t:1,v:.5},{t:1.5,v:.3},{t:2,v:.18},{t:3,v:.065},{t:4,v:.024}];
const BUILD_ID="v151";         // bump every build; shown quietly beside the Settings title
const PATCH_HALF_LIFE=3.5;      // fallback normalising constant (days)
/* Washout after removal. Estradiol's own half-life is ~1h, and baseline-corrected
   serum half-life from patch studies is ~5-8h, with levels back to baseline in
   8-24h. So removal is fast but NOT instant, which is what the Wikipedia figures
   show as a near-vertical drop over half a day. */
const PATCH_WASHOUT=0.27;       // days (~6.5h half-life)
const PATCH_WASHOUT_CUTOFF=2;   // days after removal past which the tail is nil
/* Decline while worn. X is normalised to the patch's RATED wear time, Y is a
   fraction of peak. Fitted to the Estrannaise worn phase (before the removal
   nosedive) — both are near-perfect exponentials, R^2 0.994 and 0.999, which is
   why extending them past the rating is a continuation rather than a guess.
   TWICE-WEEKLY (Vivelle-Dot / Estradot / Minivelle, rated 84h): 2.5-day decline
   half-life, calibrated to measured blood levels (90 -> 45 and 112 -> 56 at 3-3.5d)
   rather than to Estrannaise's slightly slower generic 2.7d fit.
   ONCE-WEEKLY (Climara / Menostar, rated 7d): 6.8-day half-life, ~54% at day 7.
   Both run ALL THE WAY DOWN, not just to the rated duration. The rating is a
   manufacturer's changing schedule, not a physical limit — with the patch still
   adhered, delivery keeps following the same exponential the data established.
   So the curve is the paint and WEAR TIME is the brushstroke: you decide where
   the stroke ends, and removal lifts the brush (see the washout above). */
const CURVE_PATCH_TW=[{t:0,v:0},{t:0.0714,v:0.55},{t:0.1429,v:0.85},{t:0.2857,v:1},{t:0.4286,v:0.8706},{t:0.5714,v:0.7579},{t:0.7143,v:0.6598},{t:0.8571,v:0.5743},{t:1,v:0.5},{t:1.2857,v:0.3789},{t:1.5714,v:0.2872},{t:2,v:0.1895},{t:2.4286,v:0.125},{t:2.8571,v:0.0825},{t:3.4286,v:0.0474},{t:4.2857,v:0.0206}];
const CURVE_PATCH_OW=[{t:0,v:0},{t:0.0357,v:0.45},{t:0.0714,v:0.8},{t:0.1429,v:1},{t:0.2857,v:0.9025},{t:0.4286,v:0.8146},{t:0.5714,v:0.7352},{t:0.7143,v:0.6636},{t:0.8571,v:0.5989},{t:1,v:0.5405},{t:1.2857,v:0.4403},{t:1.5714,v:0.3587},{t:2,v:0.2637},{t:2.4286,v:0.1939},{t:3,v:0.1286},{t:3.5714,v:0.0854},{t:4.2857,v:0.0511}];
const PATCH_LOOPS=4;            // cycles of tail summed when the schedule wraps
const PATCH_MAX_WEAR=14;        // longest wear offered
const PATCH_SIDES=["Left","Right"];
const SLOT_LETTERS="ABCDEFGHIJKLMNOP";
/* ═══ PLACEMENT ═══ */
/* Three constants that between them stop the app and the watch disagreeing about
   where a patch goes.

   MIN_EVENT_GAP. The rotation walks patch events in time order and relies on the
   sort to keep same-instant events in a fixed order. A browser guarantees a
   stable sort; Espruino does not. Two pieces due at the same minute can
   therefore be ordered one way on the tablet and the other way on the watch, and
   both will hand the same least-recently-used spot to a different patch. Rather
   than bolt a tiebreak onto every sort and hope none was missed, the schedule
   itself is kept free of ties: no two patch events may share a moment. The
   ordering is then total by construction and no sort can undo it. Five minutes,
   because two survives neither rounding nor a clock a minute out of step.

   PROJECT_H. How far ahead a spot is DECIDED. Deciding at the moment the patch
   goes on meant deciding twice, on two devices, from states that had drifted;
   deciding early and writing it down means there is nothing left to decide. The
   dashed outline on the body diagram is that decision made visible.

   PLACE_KEY. Where the decisions live. */
const MIN_EVENT_GAP=5/1440;     // 5 minutes, in cycle-days
const SEP_EPS=1e-6;             // a tenth of a second — slack for the second-rounding below
const PROJECT_H=36;             // hours ahead of application that a spot is sealed
const PLACE_KEY="hcm-places";
const PLACE_V=1;
/* Blood level from patch PIECES at cycle-time t. Delivery follows pcurve
   evaluated at (elapsed / pdur), pdur being the half-life. The schedule LOOPS, so
   every piece is summed across neighbouring cycles and one running past the end
   contributes to the start. `taper` crossfades onset and removal so a swap
   neither spikes nor notches. */
function e2P(t,pieces,ppg,_legacyTaper,pcurve,pdur,cycleLen){
  if(!pieces||!pieces.length)return 0;
  const pg=ppg||90;
  const crv=(pcurve&&pcurve.length>=2)?pcurve:DEF_PATCH_CURVE;
  const dur=pdur>0?pdur:PATCH_HALF_LIFE;
  const cl=cycleLen>0?cycleLen:29.5;
  let s=0;
  for(const p of pieces){
    const d0=parseFloat(p.day)||0,sz=parseFloat(p.size)||0,w=parseFloat(p.wear)||0;
    if(sz<=0||w<=0)continue;
    // Per-piece brush when the piece knows its own medication, else the caller's.
    const crvP=p._curve||crv, durP=p._dur>0?p._dur:dur;
    const lv=(p._pg||pg)*sz;
    for(let k=-PATCH_LOOPS;k<=1;k++){
      const a=d0+k*cl,b=a+w,dt=t-a;
      if(dt<0||t>=b+PATCH_WASHOUT_CUTOFF)continue;
      if(dt<w){
        // Worn: read the curve directly. It already carries the ramp up, so
        // nothing is layered on top of it. Overlapping pieces simply sum —
        // additive synthesis, no crossfades.
        s+=lv*evC(crvP,dt/durP);
      }else{
        // Off: the concentration gradient collapses and serum falls with
        // estradiol's own short half-life, reaching baseline inside a day.
        s+=lv*evC(crvP,w/durP)*Math.pow(0.5,(t-b)/(p._wash>0?p._wash:PATCH_WASHOUT));
      }
    }
  }
  return s;
}

/* Pieces on the body at cycle-time t, each with its age and remaining potency
   (fraction of original delivery rate, straight off the waveform). */
/* `curLen` and `prevLen` are the WHOLE-DAY lengths of this cycle and the one
   before it. Without them this walked back by cycleLen — 29.5306 for a lunar
   month — to find a piece that wrapped the seam, while every other surface walks
   back by the cycle's real length of 30 or 29 days. The gap between those two
   numbers is frac(cycleLen), which is why the inventory could say a patch comes
   off in an hour while the events list said it came off twelve hours ago. Same
   patch, same schedule, two different ideas of where the previous cycle started.

   Only k = 0 and k = -1 can ever match, since a wear of at most 14 days cannot
   reach two cycles back, so the previous cycle's length is the only one that has
   to be exact. */
function patchesOnAt(t,pieces,cycleLen,pcurve,pdur,curLen,prevLen){
  const cl=cycleLen>0?cycleLen:29.5;
  const CL=curLen>0?curLen:cl, PL=prevLen>0?prevLen:CL;
  const crv=(pcurve&&pcurve.length>=2)?pcurve:DEF_PATCH_CURVE;
  const dur=pdur>0?pdur:PATCH_HALF_LIFE;
  const out=[];
  for(const p of pieces||[]){
    const d0=parseFloat(p.day)||0,w=parseFloat(p.wear)||0,sz=parseFloat(p.size)||0;
    if(w<=0||sz<=0)continue;
    for(let k=-PATCH_LOOPS;k<=1;k++){
      const back=k===0?0:(k>0?k*CL:-(PL+(-k-1)*CL));
      const dt=t-(d0+back);
      if(dt>=0&&dt<w){
        const cp=p._curve||crv, dp=p._dur>0?p._dur:dur;
        /* cyc = which cycle THIS instance went on in, relative to the frame being
           evaluated (0 = this cycle, -1 = wrapped from the previous one). The seater
           needs it to look the piece up in the cycle that actually placed it. */
        out.push({...p,age:dt,offIn:w-dt,cyc:k,potency:Math.max(0,Math.min(1,evC(cp,dt/dp)))});
        break;
      }
    }
  }
  return out.sort((a,b)=>(a.day-b.day)||(b.size-a.size));
}

/* Most pieces worn simultaneously anywhere in the cycle. */
/* ═══ THE PATCH POOL ═══
   Every patch medication feeds ONE list. The rotation, the seating, the day log,
   the inventory and the watch all work from it, and none of them asks which drug
   a piece carries \u2014 skin is skin, and two patches cannot share a spot whichever
   drug they hold. The medication travels ON the piece so the display can label
   and colour it, but it never affects where the piece goes.

   Before this, three separate places each looked at "the first patch
   medication": the day-log snapshot covered only medication one, the day rows
   seated each medication against its own pieces alone (so two could be handed
   the same spot), and the watch payload refused to send body positions at all
   once a second patch medication existed.

   The _id rewrite matters. Drawn pieces already carry a unique uid and keep it,
   so every override and placement recorded against them still matches. Only
   block-derived ids get the medication prefixed, because those are a hash of the
   blocks and two medications with identical blocks would otherwise be handed the
   same key and fight over one spot. */
function patchPieceList(medications,cl){
  const out=[];
  for(const m of(medications||[])){
    if(!m.enabled||m.deliveryType!=="continuous"||m.continuousType!=="patch")continue;
    const ps=(m.pieces&&m.pieces.length)?m.pieces
      :blocksToPieces(m.doses,cl,m.patchDuration||PATCH_HALF_LIFE);
    for(const p of ps){
      const raw=p._id||((parseFloat(p.day)||0)+"/"+p.size+"/"+p.wear);
      out.push({...p,
        _id:(p._id&&String(p._id).indexOf("blk")!==0)?p._id:((m.id||"m")+"-"+raw),
        _med:m.id,_medName:m.name,_medColor:m.color});
    }
  }
  return out;
}

/* ═══ med.parked \u2014 READ THIS BEFORE TOUCHING IT ═══
   A patch medication has TWO piece arrays:

     med.pieces   the schedule. Everything in the app reads this one.
     med.parked   rows that exist but are switched off. Nothing reads it.

   A medication's `maxOnBody` is how many pieces of that drug may be worn at
   once, and it is also the number of rows in its editor. Lower it from 4 to 3
   and the fourth row has to go somewhere. Deleting it would lose work the user
   spent time on; leaving it in `pieces` would keep it on the body. So it moves
   to `parked`, and moving `maxOnBody` back to 4 moves it home again, unchanged.

   Why a SEPARATE ARRAY rather than a `hidden` flag on the piece: every consumer
   in this file \u2014 the curve, the rotation, the seating, the day log, the watch
   payload, the fitter \u2014 reads `med.pieces`. With a flag, any one of them that
   forgot to filter would silently put a switched-off patch back on the body, and
   it would show up as a dose the user never scheduled. With a separate array,
   being invisible is the default and a reader has to go looking to break it.
   Do not "simplify" this into a flag.

   Parked pieces still travel with the medication through save, export and
   import, because they are the user's work \u2014 they are just not being worn. */

/* Give every piece an explicit lane, using the same greedy packing the editor
   shows: first row whose last piece has finished. Lifted out of PatchLanes so
   that parking a row and drawing a row can never disagree about which row a
   piece is in. */
function assignLanes(pieces){
  const ends=[];
  return (pieces||[]).map(p=>{
    if(p.lane!=null)return p;
    let l=0;
    while(l<ends.length&&ends[l]>(+p.day)+1e-9)l++;
    if(l===ends.length)ends.push(0);
    ends[l]=(+p.day)+(+p.wear);
    return{...p,lane:l};
  });
}
/* The pool of body locations. This is a property of a BODY, not of a drug, so it
   is the same number for every patch medication — stored on each of them and
   kept in step, which is what "universal" means on the settings card. Legacy
   schedules only had maxOnBody, which did double duty as both the pool and the
   per-medication limit, so the larger of the two is taken as the pool. */
function bodyLocOf(medications){
  let v=0;
  for(const m of(medications||[])){
    if(m.deliveryType!=="continuous"||m.continuousType!=="patch")continue;
    const b=parseInt(m.bodyLoc)||0; if(b>v)v=b;
    const o=parseInt(m.maxOnBody)||0; if(o>v)v=o;
  }
  return Math.max(2,Math.min(16,v||8));
}
/* How much of the pool the other patch medications have already claimed. A
   medication may raise its own limit only into what is left. */
function claimedBy(medications,exceptIdx){
  let n=0;
  (medications||[]).forEach((m,i)=>{
    if(i===exceptIdx)return;
    if(!m.enabled||m.deliveryType!=="continuous"||m.continuousType!=="patch")return;
    n+=Math.max(0,parseInt(m.maxOnBody)||0);
  });
  return n;
}
function peakConcurrent(pieces,cycleLen){
  const cl=cycleLen>0?cycleLen:29.5;let mx=0;
  // Index the hour grid exactly. Accumulating t by 1/24 drifts over ~700 steps and
  // makes boundary samples land inside a piece that has already come off, which
  // reads as an overlap that isn't there.
  const NS=Math.max(24,Math.round(cl*24));
  for(let i=0;i<NS;i++){const t=i*cl/NS;
    let n=0;
    for(const p of pieces||[]){
      const w=parseFloat(p.wear)||0;if(w<=0)continue;
      for(let k=-PATCH_LOOPS;k<=1;k++){const dt=t-((parseFloat(p.day)||0)+k*cl);
        if(dt>=-1e-9&&dt<w-1e-9){n++;break;}}
    }
    if(n>mx)mx=n;
  }
  return mx;
}

/* Whole patches actually opened per cycle. Cuts share a patch only when they fit
   inside one: a half and two quarters do, two thirds-of-two don't.
   First-fit-decreasing answers this optimally almost always, but overshoots by a
   patch in about 0.4% of piece combinations. Since this number gates your supply,
   an overshoot would quietly refuse a piece you actually have room for — so when
   FFD misses the theoretical floor, a bounded exact search settles it. */
/* Blood level a WHOLE patch of this medication produces at peak. Calibration says
   "this many mcg/day reads this many pg/mL"; the patch dose says what you actually
   have. A 50 mcg/day patch against a 100/90 calibration peaks at 45, with no
   second number to keep in sync by hand. */
function patchPgOf(m){
  if(!m)return 90;
  const pg=parseFloat(m.patchPgPerUnit)||90;
  const ref=parseFloat(m.patchMcgRef)||100;
  const dose=parseFloat(m.patchMcgPerUnit)||ref;
  return ref>0?pg*(dose/ref):pg;
}
function patchesUsed(pieces){
  const cents=(pieces||[]).map(p=>toCents(parseFloat(p.size)||0)).filter(c=>c>0).sort((a,b)=>b-a);
  if(!cents.length)return 0;
  const lower=Math.ceil(cents.reduce((a,b)=>a+b,0)/100);
  const bins=[];
  for(const c of cents){
    let placed=false;
    for(let i=0;i<bins.length;i++)if(bins[i]+c<=100){bins[i]+=c;placed=true;break;}
    if(!placed)bins.push(c);
  }
  let best=bins.length;
  if(best<=lower||cents.length>26)return best;
  let nodes=0;const cur=[];
  const go=i=>{
    if(best<=lower||nodes++>20000)return;
    if(i===cents.length){if(cur.length<best)best=cur.length;return;}
    if(cur.length>=best)return;
    const tried=new Set();
    for(let b=0;b<cur.length;b++){
      if(cur[b]+cents[i]>100||tried.has(cur[b]))continue;
      tried.add(cur[b]);cur[b]+=cents[i];go(i+1);cur[b]-=cents[i];
    }
    if(cur.length+1<=best){cur.push(cents[i]);go(i+1);cur.pop();}
  };
  go(0);
  return best;
}

/* ROTATION. Which spot a piece goes on is DERIVED, not remembered: the schedule
   loops, so replaying the cycle's on-events gives the same answer every time.
   Each new piece takes the free slot that has gone unused the longest, so fresh
   spots fill in order (A, B, C...) and once every spot has been used the oldest
   comes back around. With A-D on the Left and E-H on the Right, that cycles wear
   evenly across both legs instead of hammering one spot.

   The LRU state runs CONTINUOUSLY across the cycle seam. It used to be forced to
   repeat every single cycle, which meant a piece landed on the same spot every
   loop — and when the pieces per cycle don't divide evenly into the slots, that
   handed a spot back after 7 days where true LRU rests it 21. The schedule itself
   never changes; only where the pieces sit does, which is the point.

   Slot choice therefore depends on the absolute cycle number. That sequence is
   eventually periodic, so we simulate forward until the LRU state repeats and
   then jump straight to the wanted cycle instead of replaying from the epoch. */
/* SPOT HISTORY. Each spot keeps a bounded stack of timestamps — one pushed every
   time that spot is used. To choose the next spot we read (without popping) the
   top of each stack and take the spot whose most recent use is oldest. The stack
   is capped at twice the number of spots; pushing past the cap drops the oldest
   entry off the bottom, which is fine because an entry that far down can never be
   the deciding one.

   The stack, rather than a single value, is what makes corrections clean: when you
   say "that patch is actually on H, not D", we pop D's timestamp and push it onto
   H. No recomputation, and D goes back to looking exactly as rested as it was.

   The timestamp is when the spot came FREE, not when the patch went on. That
   distinction is the whole bug this replaced: stamping the on-time meant a spot
   worn for seven days carried a seven-day-old mark, so the moment it was freed it
   looked like the most rested spot on the body and got handed straight back. */
function spotStacks(cap){
  const st=[];for(let i=0;i<cap;i++)st.push([]);
  st.limit=Math.max(4,cap*2);
  return st;
}
function spotPush(st,i,t){
  const s2=st[i];s2.push(t);
  while(s2.length>st.limit)s2.shift();   // oldest falls off the bottom
}
function spotPop(st,i){return st[i].length?st[i].pop():null;}
function spotTop(st,i){return st[i].length?st[i][st[i].length-1]:-1e9;}
/* Load a snapshot's stacks. `st` is the real state. `lu` was the single
   top-of-stack value the pre-stack builds wrote; a snapshot already sitting in
   storage from one of those still has it and nothing else, so it seeds one entry
   per spot and is superseded the first time each spot is used again. Returns
   false if there's nothing usable, in which case rotation derives from scratch. */
function seedStacks(seed,st,cap){
  if(!seed)return false;
  if(Array.isArray(seed.st)&&seed.st.length===cap){
    for(let i=0;i<cap;i++){st[i]=[];for(const t of seed.st[i])spotPush(st,i,t);}
    return true;
  }
  if(Array.isArray(seed.lu)&&seed.lu.length===cap){
    for(let i=0;i<cap;i++)spotPush(st,i,seed.lu[i]);
    return true;
  }
  return false;
}
/* Keeps the best spot's stamp rather than looking it up again for every
   candidate — two calls per free spot became one array read. Same answer:
   strictly-less keeps ties on the lowest index. */
function spotPick(st,cap,free){
  let best=-1,bv=0;
  for(const i of free){
    const s=st[i],v=s.length?s[s.length-1]:-1e9;
    if(best<0||v<bv){best=i;bv=v;}
  }
  return best;
}
function rotateSlots(pieces,cl,cap,cycleIdx,seed){
  const list=(pieces||[]).filter(p=>(parseFloat(p.wear)||0)>0&&(parseFloat(p.size)||0)>0);
  const key=p=>p._id||((parseFloat(p.day)||0)+"/"+p.size+"/"+p.wear);
  const want=Math.max(0,Math.floor(cycleIdx||0));
  const freeAt=new Array(cap).fill(-1e9);
  let st=spotStacks(cap);
  /* RESUMING from a recorded snapshot — see rotSnapshot. */
  let from=0,skipBefore=-Infinity;const preset={};
  if(seedStacks(seed,st,cap)&&seed.cyc<=want){
    for(const si in(seed.occ||{})){const o=seed.occ[si];freeAt[+si]=o.off;preset[o.k]=+si;}
    from=seed.cyc;skipBefore=seed.pos;
  }
  const runCycle=c=>{
    const evs=list.map(p=>{const on=(parseFloat(p.day)||0)+c*cl;
      return{k:key(p),on,off:on+(parseFloat(p.wear)||0)};}).sort((a,b)=>a.on-b.on);
    const m={};
    for(const e of evs){
      if(e.on<=skipBefore){if(preset[e.k]!=null)m[e.k]=preset[e.k];continue;}
      const free=[];
      for(let i=0;i<cap;i++)if(freeAt[i]<=e.on+1e-9)free.push(i);
      const best=spotPick(st,cap,free);
      if(best<0)continue;                  // body full, piece spills
      freeAt[best]=e.off;
      spotPush(st,best,e.off);             // stamped with when it comes free again
      m[e.k]=best;
    }
    return m;
  };
  const sigAt=c=>{
    const parts=[];
    for(let i=0;i<cap;i++){
      const a=freeAt[i]-c*cl,b=spotTop(st,i)-c*cl;
      parts.push((a<-1e6?"-":Math.round(a*100)/100)+","+(b<-1e6?"-":Math.round(b*100)/100));
    }
    return parts.join("|");
  };
  const seen=new Map(),maps=[],tops=[];
  const LIMIT=Math.max(8,cap*4+8);
  for(let c=from;c<=want;c++){
    const sg=sigAt(c);
    if(seen.has(sg)){
      const first=seen.get(sg),period=c-first,at=first+((want-first)%period);
      return{assign:maps[at-from],lastUsed:tops[at-from],key};
    }
    seen.set(sg,c);
    maps.push(runCycle(c));
    tops.push(Array.from({length:cap},(_,i)=>spotTop(st,i)));
    if(c-from>=LIMIT&&c<want)break;
  }
  const at=maps.length-1;
  return{assign:maps[at],lastUsed:tops[at],key,stacks:st.map(a=>a.slice())};
}
/* The state to hand forward: what is on the body at `absPos` (cycle-days since
   cycle 0) and how long each slot has been resting. Small enough to live in a
   day's history record and travel with an export. */
function rotSnapshot(pieces,cl,cap,absPos,seed){
  const list=(pieces||[]).filter(p=>(parseFloat(p.wear)||0)>0&&(parseFloat(p.size)||0)>0);
  const key=p=>p._id||((parseFloat(p.day)||0)+"/"+p.size+"/"+p.wear);
  const freeAt=new Array(cap).fill(-1e9),holder=new Array(cap).fill(null);
  const st=spotStacks(cap);
  let from=0,skipBefore=-Infinity;const preset={};
  if(seedStacks(seed,st,cap)&&seed.cyc*cl<=absPos){
    for(const si in(seed.occ||{})){const o=seed.occ[si];
      freeAt[+si]=o.off;holder[+si]=o;preset[o.k]=+si;}
    from=seed.cyc;skipBefore=seed.pos;
  }
  const toCycle=Math.floor(absPos/cl);
  const MAXC=Math.max(8,cap*4+8);
  for(let c=Math.max(from,toCycle-MAXC);c<=toCycle;c++){
    const evs=list.map(p=>{const on=(parseFloat(p.day)||0)+c*cl;
      return{k:key(p),on,off:on+(parseFloat(p.wear)||0)};}).sort((a,b)=>a.on-b.on);
    for(const e of evs){
      if(e.on>absPos)break;
      if(e.on<=skipBefore)continue;
      const free=[];
      for(let i=0;i<cap;i++)if(freeAt[i]<=e.on+1e-9)free.push(i);
      const best=spotPick(st,cap,free);
      if(best<0)continue;
      freeAt[best]=e.off;spotPush(st,best,e.off);
      holder[best]={k:e.k,off:e.off};
    }
  }
  const occ={};
  for(let i=0;i<cap;i++)if(holder[i]&&holder[i].off>absPos)
    occ[i]={k:holder[i].k,off:+holder[i].off.toFixed(4)};
  return{cyc:toCycle,pos:+absPos.toFixed(4),
    st:st.map(a=>a.map(t=>+t.toFixed(4))),occ};
}
/* Tegaderm. A piece worn this long or longer wants an overpatch to survive the
   time; anything shorter doesn't. Zero switches the whole thing off. Threshold
   lives per medication, since a twice-weekly and a once-weekly patch don't want
   the same answer. */
function needsTegaderm(wear,threshold){
  const t=parseFloat(threshold)||0;
  return t>0&&(parseFloat(wear)||0)>=t;
}
/* A short, stable name for a piece — so a patch can be referred to as well as the
   spot it sits in. Ordinal by position in the day-sorted schedule, so the same
   piece carries the same tag every cycle. Patches only. */
function patchTag(pieces,p){
  if(!p)return"";
  const k=x=>x._id||((parseFloat(x.day)||0)+"/"+x.size+"/"+x.wear);
  const list=(pieces||[]).filter(x=>(parseFloat(x.wear)||0)>0&&(parseFloat(x.size)||0)>0)
    .slice().sort((a,b)=>(parseFloat(a.day)||0)-(parseFloat(b.day)||0));
  const kk=k(p),n=list.findIndex(x=>k(x)===kk);
  return n<0?"":"P"+(n+1);
}
function bodySlots(worn,maxOnBody,allPieces,cycleLen,ov,cycleIdx,seed){
  const cap=Math.max(2,maxOnBody||8),perSide=Math.floor(cap/2);
  const slots=[];
  for(let i=0;i<cap;i++)slots.push({letter:SLOT_LETTERS[i],
    side:PATCH_SIDES[Math.floor(i/perSide)]||PATCH_SIDES[1],piece:null});
  const rotSrc=(allPieces&&allPieces.length)?allPieces:worn,rotMemo={};
  const rotAt=c=>{if(!rotMemo[c])rotMemo[c]=rotateSlots(rotSrc,cycleLen||29.5,cap,c,seed);return rotMemo[c];};
  const {assign,key,lastUsed}=rotAt(cycleIdx);
  /* Where the last snapshot RECORDED each worn piece. This is the record, and it
     outranks anything the rotation would work out again — a spot already decided
     is not re-derived.

     It also closes a hole. A piece worn across the cycle seam is looked up in the
     cycle that placed it, cycleIdx-1, but rotateSlots clamps a negative cycle
     index to zero, so at cycleIdx 0 that lookup silently returns the CURRENT
     cycle's map — the spot planned for the piece's NEXT application, not the one
     it is wearing now. The snapshot then reseated the stamps to match, which
     changed the next seating, which wrote another snapshot: the patch flipped
     between two spots on every write. Reading the record first stops the question
     being asked at all. */
  const seatRec={};
  if(seed&&seed.occ)for(const si in seed.occ){const o=seed.occ[si];if(o&&o.k!=null)seatRec[o.k]=+si;}
  // Overrides are applied when SEATING, not when planning. Moving one piece must
  // move exactly that piece — the drag already records the swap partner too, so
  // every other piece keeps the spot the rotation gave it.
  const spill=[],rest=[];
  for(const w of(worn||[])){
    const o=ov&&ov[key(w)];
    const pin=(o!=null&&o>=0&&o<cap)?o:null;
    if(pin!=null&&!slots[pin].piece)slots[pin].piece=w;else rest.push(w);
  }
  for(const w of rest){
    /* A piece that went on in an EARLIER cycle keeps the spot that cycle gave it.
       Reading it out of the CURRENT cycle's map returned the slot planned for its
       NEXT application instead, so anything worn across the cycle seam appeared to
       jump to a different part of the body overnight. A patch stays where it was
       put until it comes off. */
    const back=(w&&w.cyc)|0;
    const rec=seatRec[key(w)];
    const i=(rec!=null&&rec>=0&&rec<cap)?rec
      :(back?rotAt(cycleIdx+back).assign:assign)[key(w)];
    /* Remember the spot the ROTATION wanted for this piece, resolved in the cycle
       that actually placed it. makeRot compares against this to decide whether the
       user moved a patch; comparing against the current cycle's map instead made
       every seam-crossing piece look moved, so each snapshot reseated the stacks,
       which changed the seating, which wrote another snapshot. */
    w._home=(i==null?null:i);
    if(i!=null&&!slots[i].piece)slots[i].piece=w;else spill.push(w);
  }
  // Anything displaced (by a drag, or by a full body) takes the emptiest-standing
  // spot, not whichever letter happens to come first in the alphabet.
  for(const w of spill){
    const free=slots.map((s,i)=>({s,i})).filter(x=>!x.s.piece);
    if(!free.length)break;
    // Same rule as the rotation: the spot whose most recent use is oldest.
    free.sort((a,b)=>((lastUsed&&lastUsed[a.i])??-1e9)-((lastUsed&&lastUsed[b.i])??-1e9)||a.i-b.i);
    free[0].s.piece=w;
  }
  return{slots,overflow:Math.max(0,(worn||[]).length-cap),assign,key,lastUsed};
}
/* ═══ EVENT SEPARATION ═══ */
/* Every application and every removal in one cycle, as positions on the ring.
   Applications and removals are ONE sequence, not two lists that happen to be
   sorted the same way — a patch coming off at 10:45 and the next going on at
   10:45 is exactly the collision this exists to find. */
function pieceEvents(pieces,cl){
  const L=cl>0?cl:29.5,out=[],norm=v=>((v%L)+L)%L;
  (pieces||[]).forEach((p,i)=>{
    const d=parseFloat(p.day)||0,w=parseFloat(p.wear)||0,z=parseFloat(p.size)||0;
    if(!(w>0)||!(z>0))return;
    out.push({i,kind:"on",pos:norm(d)});
    out.push({i,kind:"off",pos:norm(d+w)});
  });
  out.sort((a,b)=>a.pos-b.pos||a.i-b.i||(a.kind<b.kind?-1:1));
  return out;
}
/* Push coincident events apart. Later events move FORWARD only, so the piece you
   just put down stays where you put it and whatever was crowding it steps aside
   rather than dragging your piece backwards under the cursor.

   The cycle is a ring, so a straight left-to-right sweep would arrive back at its
   own starting point with nowhere to put the last event. The sweep therefore
   starts at the WIDEST existing gap: whatever slack the schedule has is spent on
   the wrap-around join, which is then the one join guaranteed not to need any.
   While a piece is being dragged the sweep starts at that piece instead, which
   holds it still — it is the one event the user is currently deciding. */
function separatePieces(pieces,cl,maxWear,holdId){
  const L=cl>0?cl:29.5,G=MIN_EVENT_GAP,norm=v=>((v%L)+L)%L;
  /* Whole seconds. Rounding a position to five decimals discards nearly a
     second, which is a fifth of the tolerance the gap is checked against — the
     sweep separated the events and the rounding put them back together. */
  const q=v=>Math.round(v*86400)/86400;
  const src=(pieces||[]).map(p=>({...p}));
  const ev=pieceEvents(src,L);
  if(ev.length<2)return pieces||[];
  if(ev.length*G>=L)return pieces||[];        // no arrangement satisfies it; don't mangle the schedule
  let cut=0;
  const held=holdId==null?-1:src.findIndex(p=>p._id===holdId);
  if(held>=0){
    const at=ev.findIndex(e=>e.i===held&&e.kind==="on");
    if(at>=0)cut=at;
  }else{
    let widest=-1;
    for(let k=0;k<ev.length;k++){
      const nx=(k+1<ev.length)?ev[k+1].pos:ev[0].pos+L;
      if(nx-ev[k].pos>widest){widest=nx-ev[k].pos;cut=(k+1)%ev.length;}
    }
  }
  const base=ev[cut].pos;
  let prev=-Infinity,moved=false;
  const target={};
  for(let k=0;k<ev.length;k++){
    const e=ev[(cut+k)%ev.length];
    let p=e.pos+((k>0&&e.pos<base-1e-12)?L:0);   // unroll the ring from the cut
    if(prev>-Infinity&&p<prev+G-SEP_EPS){p=prev+G;moved=true;}
    prev=p;
    target[e.i+":"+e.kind]=p;
  }
  if(!moved)return pieces||[];
  // Days first, then wear measured against the NEW day, so the two never fight.
  const cap=Math.min(PATCH_MAX_WEAR,maxWear||PATCH_MAX_WEAR);
  const days=src.map((p,i)=>{const on=target[i+":on"];
    return on==null?p:{...p,day:q(norm(on))};});
  return days.map((p,i)=>{const off=target[i+":off"];
    if(off==null)return p;
    const w=norm(q(off)-(parseFloat(p.day)||0));
    return{...p,wear:q(Math.max(G,Math.min(cap,w)))};});
}
/* True when nothing in the schedule shares a moment with anything else. The
   invariant the whole scheme rests on, so it is checkable rather than assumed. */
function eventsSeparated(pieces,cl){
  const L=cl>0?cl:29.5,ev=pieceEvents(pieces,L);
  for(let k=1;k<ev.length;k++)if(ev[k].pos-ev[k-1].pos<MIN_EVENT_GAP-SEP_EPS)return false;
  if(ev.length>1&&(ev[0].pos+L)-ev[ev.length-1].pos<MIN_EVENT_GAP-SEP_EPS)return false;
  return true;
}

/* ═══ SEALED PLACEMENTS + THE ABSOLUTE EVENT SEQUENCE ═══ */
/* A placement is a state a patch is IN, beginning when its projection appears
   36 hours out and ending when it falls off — the outline and the patch on the
   body are one entity at two ages, so one record covers both and there is only
   ever one thing to move.

   Shape is pieceKey -> {slot, until, on, cyc, src}, which is deliberately the
   same shape bodySlots already accepts for overrides: a placement IS an
   override, written for every piece at projection time instead of only for the
   ones dragged by hand. Nothing new had to learn how to seat a patch.

   The sequence beside it is the absolute record: every application and removal
   with a permanent index and a real timestamp. Both devices read the time from
   here rather than each converting a cycle fraction to a clock and rounding it
   their own way, which is where the minute of disagreement came from. */
function loadPlaces(){
  try{
    const o=JSON.parse(localStorage.getItem(PLACE_KEY)||"null");
    if(!o||o.v!==PLACE_V)return{v:PLACE_V,place:{},seq:[],next:1};
    return{v:PLACE_V,place:o.place||{},seq:Array.isArray(o.seq)?o.seq:[],next:o.next||1};
  }catch(e){return{v:PLACE_V,place:{},seq:[],next:1};}
}
function savePlaces(o){
  const now=Date.now(),place={};
  /* A placement outlives its patch by a day so a late correction still has
     something to correct, then goes. */
  for(const k in(o.place||{})){
    const v=o.place[k];
    if(v&&typeof v.slot==="number"&&v.until>now-86400000)place[k]=v;
  }
  const cut=now-DAYLOG_DAYS*86400000;
  const seq=(o.seq||[]).filter(e=>e&&typeof e.ms==="number"&&e.ms>=cut)
    .sort((a,b)=>a.ms-b.ms||a.i-b.i);
  let next=o.next||1;
  for(const e of seq)if((e.i|0)>=next)next=(e.i|0)+1;
  const out={v:PLACE_V,place,seq,next};
  try{localStorage.setItem(PLACE_KEY,JSON.stringify(out));}catch(e){}
  return out;
}
/* The unexpired placements, flattened to what bodySlots wants. */
function liveMap(place,now){
  const t=now||Date.now(),out={};
  for(const k in(place||{})){const v=place[k];if(v&&v.until>t)out[k]=v.slot;}
  return out;
}
/* The key rotateSlots uses, so a placement, a rotation assignment and an
   override all name the same piece. */
function pieceKeyOf(p){return p._id||((parseFloat(p.day)||0)+"/"+p.size+"/"+p.wear);}
function blocksToPieces(doses,cycleLen,wear){
  const cl=cycleLen>0?cycleLen:29.5;
  const w=Math.min(PATCH_MAX_WEAR,Math.max(0.5,wear||PATCH_HALF_LIFE));
  const blocks=[...(doses||[])].filter(d=>(parseFloat(d.count)||0)>0)
    .sort((a,b)=>(parseFloat(a.startDay)||0)-(parseFloat(b.startDay)||0));
  if(!blocks.length)return[];
  /* A block piece needs a name that survives the next call. These used to get a
     fresh uid() every time the function ran, so a placement, an override or a
     rotation assignment recorded against one could never be found again — the
     piece it named had been renamed by the time anything looked. The name is now
     derived from the schedule itself: same blocks, same names, every call. */
  const sig=(()=>{let h=2166136261;
    const str=blocks.map(b=>[b.startDay,b.endDay,b.count].join("_")).join(",")+"|"+cl+"|"+w;
    for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
    return(h>>>0).toString(36);})();
  const targetAt=d=>{let v=0;
    for(const b of blocks){const s0=parseFloat(b.startDay)||0,e0=parseFloat(b.endDay)||0;
      if(d>=s0-1e-9&&d<e0-1e-9)v=snapPatch(parseFloat(b.count)||0);}
    return v;};
  /* Block schedules land every piece on a whole day, so a removal and the next
     application share an instant by construction — exactly the tie the rotation
     cannot be trusted to break the same way twice. Separated on the way out, so a
     schedule still written as blocks gets the same guarantee a drawn one does.
     The shift is minutes on a curve sampled by the day; nothing visible moves. */
  const out=[],live=[];
  for(let d=0;d<Math.ceil(cl);d++){
    for(let i=live.length-1;i>=0;i--)if(d-live[i].day>=w-1e-9)live.splice(i,1);
    let have=live.reduce((a,p)=>a+p.size,0);
    const want=targetAt(d);
    while(have-want>0.02){
      let mi=0;for(let i=1;i<live.length;i++)if(live[i].size<live[mi].size)mi=i;
      if(!live.length)break;
      const rm=live.splice(mi,1)[0];rm.wear=+(d-rm.day).toFixed(2);
      have-=rm.size;
    }
    let guard=0;
    while(want-have>0.02&&guard++<10){
      let sz=0;for(const c of PIECE_SIZES)if(c<=want-have+0.02){sz=c;break;}
      if(!sz)break;
      const np={_id:"blk"+sig+"-"+d+"-"+out.filter(x=>x.day===d).length,day:d,size:sz,wear:w};
      live.push(np);out.push(np);have+=sz;
    }
  }
  return separatePieces(out.filter(p=>p.wear>0).map(p=>({...p,wear:Math.min(p.wear,w)})),
    cl,PATCH_MAX_WEAR,null);
}

/* Greedy matching pursuit against a target curve. Each piece is a decaying
   exponential from where it goes on; we repeatedly add whichever (day, size,
   wear) removes the most squared error, stopping when nothing helps, the month's
   patches run out, or the body is full. Improvement has a closed form, so this
   stays fast even on an hourly grid. */
/* The tail of a lunar month that may not happen at all.

   A lunar cycle runs 29 days or 30, depending on the moon. Cycle days 0 to 28
   always exist; the 30th day — positions 29.0 up to 30.0 — exists only in the
   long months. Anything the generator puts in there is a dose that silently
   fails to occur in roughly half of all cycles, which for a patch means either
   never putting one on or, worse, never taking one off.

   Wearing ACROSS the window is fine and stays allowed: a patch applied on day 27
   that runs into the next month is a real patch doing a real thing. It is only
   the EVENTS — an application or a removal landing inside the window — that
   cannot be relied on. And this constrains the GENERATOR only; dragging a piece
   in there by hand is a decision the user is entitled to make. */
function lunarDeadWindow(cl,isLunar){
  if(!isLunar)return null;
  const c=cl>0?cl:29.5,lo=Math.floor(c),hi=Math.ceil(c);
  return hi>lo?{lo,hi}:null;
}
function fitPatches(targetFn,budget,maxWear,cycleLen,pg,pcurve,pdur,maxOnBody,actOn,wins,maxPerDay,maxChangeDays,deadWin,minWear){
  const cl=cycleLen>0?cycleLen:29.5;
  const NS=Math.max(24,Math.round(cl*24)),step=cl/NS;
  const crv=(pcurve&&pcurve.length>=2)?pcurve:DEF_PATCH_CURVE;
  const dur=pdur>0?pdur:PATCH_HALF_LIFE;
  const tgt=new Array(NS),cur=new Array(NS).fill(0),busy=new Array(NS).fill(0);
  for(let i=0;i<NS;i++)tgt[i]=targetFn(i*step);
  const maxK=Math.max(2,Math.round(Math.min(maxWear||PATCH_MAX_WEAR,PATCH_MAX_WEAR)/step));
  const decay=new Array(maxK+1);
  for(let k=0;k<=maxK;k++)decay[k]=Math.max(0,evC(crv,(k*step)/dur));
  const hourOK=i=>{if(!actOn)return true;return inHourWindows((((i*step)%1)+1)%1*24,wins);};
  /* Same shape as hourOK: a gate on where an event may land, applied to the
     application and to the removal alike. */
  const dw=(deadWin&&deadWin.hi>deadWin.lo)?deadWin:null;
  const lunOK=i=>{if(!dw)return true;
    const p=(((i*step)%cl)+cl)%cl;
    return!(p>=dw.lo-1e-9&&p<dw.hi-1e-9);};
  /* The shortest a placed piece may be. There was a hard floor of half a day
     here; it is now yours to set, because "worth taking off for" is a judgement
     about your skin and your morning, not a property of the drug. A piece is
     only a valid dose if it stays on at least this long, so the fitter will
     reach for a smaller FRACTION rather than a briefer wear when it needs less
     hormone \u2014 which is the shape a menstrual curve actually wants. */
  const MIN_K=Math.max(2,Math.round(Math.max(0.5,minWear>0?minWear:0.5)/step));
  const cap=Math.max(2,maxOnBody||8);
  /* You have to physically do this. A schedule saying "swap something every single
     day" or "put ten pieces on this morning" is unusable however well it fits, so
     applications-per-day and how many days a cycle you touch patches at all are
     both hard limits on the search. */
  const perDayCap=Math.max(1,maxPerDay||99);
  const dayCap=Math.max(1,maxChangeDays||99);
  const nDays=Math.ceil(cl);
  const perDay=new Array(nDays+1).fill(0);
  const dayIdx=i=>Math.min(nDays,Math.floor((((i*step)%cl)+cl)%cl));
  const usedDays=()=>{let n=0;for(const v of perDay)if(v>0)n++;return n;};
  const dayOK=i=>{const d=dayIdx(i);
    if(perDay[d]>=perDayCap)return false;
    return perDay[d]>0||usedDays()<dayCap;};
  const chosen=[];
  for(let iter=0;iter<90;iter++){
    const have=chosen.map(c=>c.size);
    const sizesOK=PIECE_SIZES.filter(sz=>patchesUsed([...chosen,{size:sz}])<=budget);
    if(!sizesOK.length)break;
    let best=null;
    for(let s0=0;s0<NS;s0++){
      if(!hourOK(s0)||!dayOK(s0)||!lunOK(s0))continue;   // wrong hour, day full, or a day that may not exist
      let acc=0,acc2=0,full=false;
      for(let k=0;k<maxK;k++){
        const idx=(s0+k)%NS;
        if(busy[idx]>=cap){full=true;break;}
        acc+=(tgt[idx]-cur[idx])*decay[k]*step;
        acc2+=decay[k]*decay[k]*step;
        const K=k+1;
        if(K<MIN_K||!hourOK(s0+K)||!lunOK(s0+K))continue;
        for(const sz of sizesOK){
          const A=sz*pg,imp=2*A*acc-A*A*acc2;
          if(!best||imp>best.imp)best={imp,s0,K,sz};
        }
      }
      if(full)continue;
    }
    if(!best||best.imp<=1e-6)break;
    const A=best.sz*pg;
    for(let k=0;k<best.K;k++){const idx=(best.s0+k)%NS;cur[idx]+=A*decay[k];busy[idx]++;}
    perDay[dayIdx(best.s0)]++;
    // Keep full precision: rounding here shifts a piece boundary by enough to
    // overlap an extra sample, which shows up as a phantom breach of the body limit.
    chosen.push({_id:uid(),day:best.s0*step,size:best.sz,wear:best.K*step});
  }
  /* POLISH — matching pursuit is greedy: every piece was the best choice at the
     moment it was added, not the best choice in hindsight. Without this, RAISING a
     limit could produce a WORSE schedule (measured: 12 patches fitting worse than
     10). So sweep every piece and keep any single edit that lowers total error,
     including deleting it outright. Limits stay ceilings, never targets: this pass
     will happily hand budget back, shorten a stroke, or free a body slot when that
     matches the target curve more closely. */
  const idxOf=d=>((Math.round(d/step)%NS)+NS)%NS;
  const put=(p,sign)=>{const A=p.size*pg,K=Math.max(1,Math.round(p.wear/step)),s0=idxOf(p.day);
    for(let k=0;k<K;k++){const i=(s0+k)%NS;cur[i]+=sign*A*decay[k];busy[i]+=sign;}
    perDay[dayIdx(s0)]+=sign;};
  const err=()=>{let e=0;for(let i=0;i<NS;i++){const d=tgt[i]-cur[i];e+=d*d;}return e;};
  const feasible=(p,others)=>{
    const K=Math.round(p.wear/step),s0=idxOf(p.day);
    if(K<MIN_K||K>maxK||p.day<0||p.day>=cl)return false;
    if(!hourOK(s0)||!hourOK(s0+K))return false;
    if(!lunOK(s0)||!lunOK(s0+K))return false;
    if(!dayOK(s0))return false;
    for(let k=0;k<K;k++)if(busy[(s0+k)%NS]>=cap)return false;
    return patchesUsed([...others,p])<=budget;
  };
  for(let pass=0;pass<4;pass++){
    let improved=false;
    for(let i=0;i<chosen.length;i++){
      const orig=chosen[i];
      put(orig,-1);
      const others=chosen.filter((_,j)=>j!==i);
      let bestP=null,bestE=err();          // baseline: drop the piece entirely
      for(const dd of[-2,-1,0,1,2])for(const dw of[-2,-1,0,1,2])for(const sz of PIECE_SIZES){
        const c=(dd===0&&dw===0&&sz===orig.size)?orig
              :{...orig,day:orig.day+dd*step,wear:orig.wear+dw*step,size:sz};
        if(!feasible(c,others))continue;
        put(c,1);const e=err();put(c,-1);
        if(e<bestE-1e-9){bestE=e;bestP=c;}
      }
      if(bestP){put(bestP,1);if(bestP!==orig)improved=true;chosen[i]=bestP;}
      else{chosen.splice(i,1);i--;improved=true;}
    }
    if(!improved)break;
  }
  return chosen.sort((a,b)=>a.day-b.day);
}

// P4: configurable curve
function p4V(tH,mg,p4pk,p4Pts){if(tH<=0)return 0;const td=tH/24;if(p4Pts&&p4Pts.length>=2){return Math.max(0,evC(p4Pts,td)*(mg/100));}const pk=p4pk||{peak:17,tPeakH:4,decayH:.08};const ka=.7,ke=pk.decayH||.08;const tm=Math.log(ka/ke)/(ka-ke),cm=ka/(ka-ke)*(Math.exp(-ke*tm)-Math.exp(-ka*tm));if(cm<=0)return 0;return Math.max(0,pk.peak*(mg/100)*ka/(ka-ke)*(Math.exp(-ke*tH)-Math.exp(-ka*tH))/cm);}
function p4L(td,doses,p4pk,p4Pts){let s=0;for(const d of doses){const dt=(td-d.day)*24;if(dt>0)s+=p4V(dt,d.doseMg,p4pk,p4Pts);}return s;}

/* Menstrual reference (AFAB)
   Sources: Mayo Clinic, Medscape, Roche Elecsys reference study (Bungum et al., PMC8042396),
   UCSF Health, Cleveland Clinic. Values reflect the median or typical normo-ovulatory cycle.
   ME: pg/mL. Peak ~250-300 preovulatory (day 12.5), luteal peak ~150 (day 20).
   MP: ng/mL. Follicular <1.5, ovulation 1-3, mid-luteal peak ~10-12 (lit: 5-20 typical, median ~10).
   MF: mIU/mL. Early follicular 5-12, mid-cycle surge ~12-18, luteal 1.5-4.
   MLH: mIU/mL. Early follicular 2-12, ovulation surge median ~22 (range 8-72), peak ~40, luteal 1-7. */
const ME=[[0,40],[2,35],[5,45],[8,80],[10,130],[11.5,200],[12.5,250],[13.5,220],[14,120],[15,100],[17,120],[20,150],[22,145],[24,120],[26,80],[28,50],[29.5,40]];
const MP=[[0,.5],[10,.5],[12,.8],[13,1.5],[14,3],[15,5],[16,7.5],[17,9.5],[18,11],[19,11.8],[20,12.2],[21,12.5],[22,12],[23,11],[24,9.5],[25,7.5],[26,5.5],[27,3],[28,1.2],[29.5,.5]];
// FSH ref: mIU/mL. Lit: day 0-3 baseline 3-7, early follicular peak 6-9 at day 6-8,
// late-follicular nadir 3-5 at day 11, midcycle surge 12-15 at day 13 (driven by P4),
// luteal nadir 1.5-4, late-luteal rise begins ~day 26 to seed next cycle.
const MF=[[0,4],[2,5.5],[4,7],[6,7.5],[7,7.5],[8,7],[10,5],[11,4],[12,8],[12.5,11],[13,14],[13.5,9],[14,5],[15,3],[17,2.5],[20,2.5],[23,3],[26,3.5],[28,3.8],[29.5,4]];
// LH ref: mIU/mL, typical cycle. Low baseline, sharp mid-cycle surge
const MLH=[[0,4],[2,3.5],[4,3],[6,3.5],[8,4],[10,5],[11,6],[12,12],[12.5,28],[13,40],[13.5,30],[14,12],[14.5,6],[15,4],[17,3],[20,2.5],[23,3],[26,3.5],[29.5,4]];
/* AMAB reference — relatively flat with minor daily variations */
// T: ~600 ng/dL baseline, slight daily sine (~20% amplitude, not modeled per-day here — shown flat for monthly view)
const ME_M=[[0,30],[29.5,30]];const MP_M=[[0,.5],[29.5,.5]];const MF_M=[[0,4],[29.5,4]];const MLH_M=[[0,5],[29.5,5]];
/* Male T reference: ~600 ng/dL steady */
const MT_M=[[0,600],[29.5,600]];
// Peak values from the reference arrays — used to auto-size the chart y-axis
// so the dashed reference curves are always fully visible. Computed once at
// module load so they stay in sync with any future changes to the arrays.
// Peak = max hormone value across all waypoints in each curve.
const peakOf=arr=>arr.reduce((m,p)=>Math.max(m,p[1]),0);
const ME_PEAK=peakOf(ME),MP_PEAK=peakOf(MP),ME_M_PEAK=peakOf(ME_M),MP_M_PEAK=peakOf(MP_M);
function refI(a,d){const t=((d%29.5)+29.5)%29.5;for(let i=0;i<a.length-1;i++){if(t>=a[i][0]&&t<=a[i+1][0]){const f=(t-a[i][0])/(a[i+1][0]-a[i][0]);return a[i][1]+(a[i+1][1]-a[i][1])*.5*(1-Math.cos(f*Math.PI));}}return a[0][1];}
// Compute ambient hormone level at time t, with suppression from medications
// For AFAB: natal E2/P4 cycle, suppressed by T and GnRH agonists
// For AMAB: flat T baseline, suppressed by E2/P4 (handled by existing tSeries)
// suppressorLevel = blood level of the suppressing hormone at time t
// === MENSTRUAL PHASE MODEL =================================================
// Phase boundaries are derived dynamically from cycle length and the user's
// chosen ovulation day. The legacy 29-day textbook model used phase widths
// [Menstrual:4, Follicular:8, Ovulation:3, Luteal:8, Premenstrual:6] with
// ovulation centered on day 14. We keep those RATIOS as the default and
// stretch them proportionally for any cycle length and ovulation day.
//
// Default ovulation day for a 29-day cycle is 16, chosen to maximize how
// often the 3-day ovulation window (days 15-16-17) catches the full moon
// under lunar alignment. The new-moon → full-moon interval averages 14.77
// days, so in 1-indexed counting the full moon lands on day 15 (short
// lunations), 16 (most common), or 17 (long lunations). Day 16 as the
// midpoint catches all three. This is the "white moon cycle" framing.
//
// Note that anatomically the E2 peak occurs ~1.5 days before ovulation, so
// with ovulationDay=16 the E2 peak lands around lunar day 14.5 — slightly
// before the full moon, which matches the actual physiology.
//
// This replaces the old MEN_BASE_SHIFT constant and the user-facing
// `menShift` slider — both lived as separate hacks that combined awkwardly
// for any cycle length other than 29.
const PHASE_WIDTHS_29={mens:4,foll:8,ov:3,lut:8,pre:6};// 4+8+3+8+6=29
const CANONICAL_OV_MID=13.5;// where ovulation peaks in the 29-day reference data
const CANONICAL_CYCLE=29.5;// reference curve native cycle length
function defaultOvulationDay(cycleLen){
  // 16 in a 29-day cycle. The 3-day ovulation window is then days 15-16-17,
  // which catches the full moon as often as possible: the new-moon → full-moon
  // interval averages 14.77 days, so in 1-indexed counting the full moon
  // lands on lunar day 15 (short lunations), 16 (most common), or 17 (long
  // lunations). Scales proportionally for other cycle lengths.
  const cl=Math.max(2,Math.round(cycleLen||29.5));
  return Math.max(2,Math.min(cl-1,Math.round(cl*16/29)));
}
// Phase boundaries (0-indexed cycle day where each phase starts).
// Returns {mens, foll, ov, lut, pre, cycle}.
function phaseBoundaries(cycleLen,ovulationDay){
  const cl=Math.max(2,Math.round(cycleLen||29.5));
  const ov=Math.max(2,Math.min(cl-1,Math.round(ovulationDay||defaultOvulationDay(cl))));
  // Ovulation window: 3 days centered on ovulationDay (1-indexed).
  // In 0-indexed: phase starts at ov-2, ends at ov (inclusive).
  const ovStart=Math.max(0,ov-2);
  const ovEnd=ov;// inclusive
  // Pre-ovulation segment: indices [0, ovStart-1].
  const preLen=ovStart;
  // Menstrual:Follicular ratio is 4:12 (out of 12 pre-ov days in 29-day cycle).
  const mensLen=preLen<=0?0:Math.max(1,Math.round(preLen*PHASE_WIDTHS_29.mens/(PHASE_WIDTHS_29.mens+PHASE_WIDTHS_29.foll)));
  // Post-ovulation segment: indices [ovEnd+1, cl-1].
  const postLen=Math.max(0,cl-1-ovEnd);
  // Luteal:Premenstrual ratio is 8:14 (out of 14 post-ov days in 29-day cycle).
  const lutLen=postLen<=0?0:Math.max(1,Math.round(postLen*PHASE_WIDTHS_29.lut/(PHASE_WIDTHS_29.lut+PHASE_WIDTHS_29.pre)));
  return{
    mensStart:0,
    follStart:mensLen,
    ovStart:ovStart,
    lutStart:ovEnd+1,
    preStart:ovEnd+1+lutLen,
    cycle:cl,
    ov:ov,
  };
}
// Phase label for a 0-indexed cycle day. `cycleAnchor` rotates the phase
// calendar without moving doses: anchor=0 means cycle day 0 is phase day 0
// (start of menstrual). anchor=15 in a 29-day lunar cycle puts the phase
// calendar's day 0 on cycle index 15 (= lunar day 16, full moon) — that's
// the "red moon cycle" alignment.
function mPh(i,cycleLen,ovulationDay,cycleAnchor){
  const b=phaseBoundaries(cycleLen,ovulationDay);
  const anchor=((cycleAnchor||0)%b.cycle+b.cycle)%b.cycle;
  const s=(((i-anchor)%b.cycle)+b.cycle)%b.cycle;
  if(s<b.follStart)return"Menstrual";
  if(s<b.ovStart)return"Follicular";
  if(s<b.lutStart)return"Ovulation";
  if(s<b.preStart)return"Luteal";
  return"Premenstrual";
}

/* Short, warm descriptions of each phase for the shareable cycle snapshot.
   These describe COMMON tendencies, not rules — everyone's cycle is different,
   and the recipient view says so. `emoji` and `color` are for the phase bar. */
const PHASE_INFO={
  Menstrual:{emoji:"🌑",color:"#f87171",tone:"resting & inward",blurb:"Energy often runs low and the pull is inward — a time for rest and gentleness. Cramps and fatigue are common.",kind:"A good time to go easy and not over-schedule."},
  Follicular:{emoji:"🌱",color:"#a3e635",tone:"rising & open",blurb:"Energy and mood tend to climb — often a lighter, more optimistic, outward-looking stretch.",kind:"Usually a good window for new things and momentum."},
  Ovulation:{emoji:"☀️",color:"#fbbf24",tone:"peak & social",blurb:"Often the highest-energy, most social and confident point of the cycle.",kind:"A bright stretch — good for connection."},
  Luteal:{emoji:"🍂",color:"#c084fc",tone:"winding down",blurb:"Energy tapers and sensitivity can rise. For many this is where irritability, tiredness, or feeling more tender shows up.",kind:"This phase can be brutal for some — patience and kindness go a long way."},
  Premenstrual:{emoji:"🌧️",color:"#a78bfa",tone:"tender & raw",blurb:"The premenstrual window — emotions can run high and everything can feel like more. PMS lives here.",kind:"Be extra gentle — with them and, if it's you, with yourself."}
};

// Piecewise-linear remap from a chart day (in the user's cycle coords) to a
// reference time (in the canonical 29.5-day reference coords). The two
// halves of the cycle (pre-ovulation and post-ovulation) stretch
// independently so that the user's chosen ovulation day always lines up
// with the canonical ovulation midpoint, regardless of whether their cycle
// is shorter or longer than 29 days, or whether ovulation is early or late.
//
// `t` may be any non-negative chart day (incl. multi-cycle). We split it
// into (cycleIdx, tInCycle), apply the cycleAnchor rotation, remap, then
// offset by cycleIdx * CANONICAL_CYCLE so refI's internal mod sees a
// properly-aligned value when crossing cycle boundaries.
function refTimeForCycleDay(t,cycleLen,ovulationDay,cycleAnchor){
  const cl=Math.max(1,cycleLen||CANONICAL_CYCLE);
  const ov=Math.max(1.5,Math.min(cl-0.5,ovulationDay||defaultOvulationDay(cl)));
  // Ovulation midpoint in user coords: ov is 1-indexed and the 3-day window
  // is centered on it, so the midpoint is at (ov - 0.5) in 0-indexed days.
  const ovMidUser=ov-0.5;
  const anchor=((cycleAnchor||0)%cl+cl)%cl;
  // Handle negative t by adding cycles until t >= 0 (rare but possible
  // because of the old shift convention; keeps the function total).
  let cycleIdx=Math.floor(t/cl);
  let tRaw=t-cycleIdx*cl;
  if(tRaw<0){tRaw+=cl;cycleIdx-=1;}
  // Apply anchor: rotate the phase calendar so anchor maps to phase day 0.
  let tInCycle=tRaw-anchor;
  if(tInCycle<0)tInCycle+=cl;
  let refInCycle;
  if(tInCycle<=ovMidUser){
    // Pre-ovulation half: [0, ovMidUser] → [0, CANONICAL_OV_MID]
    const denom=ovMidUser>0?ovMidUser:1;
    refInCycle=tInCycle*CANONICAL_OV_MID/denom;
  }else{
    // Post-ovulation half: [ovMidUser, cl] → [CANONICAL_OV_MID, CANONICAL_CYCLE]
    const userPostLen=cl-ovMidUser;
    const refPostLen=CANONICAL_CYCLE-CANONICAL_OV_MID;
    const denom=userPostLen>0?userPostLen:1;
    refInCycle=CANONICAL_OV_MID+(tInCycle-ovMidUser)*refPostLen/denom;
  }
  return refInCycle+cycleIdx*CANONICAL_CYCLE;
}

// threshold = level of suppressor needed for 50% suppression
// Returns the suppressed ambient value (0 = fully suppressed, full = no suppression)
// Signature: ambientAtT(ref, t, cycleLen, ovulationDay, cycleAnchor, ...).
// The cycleAnchor rotates which cycle index is treated as phase day 0.
function ambientAtT(refArray,t,cycleLen,ovulationDay,cycleAnchor,suppressorLevel,threshold,isFlatlned){
  if(isFlatlned)return 0;// GnRH agonist kills it completely
  const refT=refTimeForCycleDay(t,cycleLen,ovulationDay,cycleAnchor);
  const raw=refI(refArray,refT);
  if(!suppressorLevel||suppressorLevel<=0)return raw;
  const k=3/(threshold||300);
  const suppFrac=1/(1+Math.exp(-k*(suppressorLevel-threshold)));
  return raw*(1-suppFrac);
}
// T suppression with rebound delay
// Returns array of {t, v} for T levels given injectable E2 time series
// reboundDays = how long the HPG axis takes to fully restart after sustained suppression
// T suppression is now computed inline via getSuppFactor("T", t) in the chart useEffects

/* ═══ LUNAR ═══ */
const SYN=29.530588861;
function jdn(d){const y=d.getFullYear(),mo=d.getMonth()+1,da=d.getDate();const a=Math.floor((14-mo)/12),yr=y+4800-a,m=mo+12*a-3;return da+Math.floor((153*m+2)/5)+365*yr+Math.floor(yr/4)-Math.floor(yr/100)+Math.floor(yr/400)-32045;}
function lunarPhase(d){const j=jdn(d);let ph=((j-2451550.26)%SYN);if(ph<0)ph+=SYN;const T=(j-2451545)/36525;return(ph+.000325*Math.sin((134.96+477198.86*T)*Math.PI/180))%SYN;}
/* Which lunation a date falls in, derived FROM lunarDayMid rather than from a
   second anchor of its own.

   getCycleIdx used to count with `floor((jdn - 2451550) / SYN)` while
   getCycleDay counts with lunarDayMid, whose phase is measured from 2451550.26
   and carries a small periodic correction. A quarter of a day's difference in
   the anchor means that for roughly a month in four, the INDEX rolls over one
   day before the lunar DAY resets \u2014 and since everything downstream works in
   `cycleIdx * cycleLen + cycleDay`, that day's absolute position leapt a whole
   cycle forward and fell back again the next morning. A snapshot written on
   such a day carried a position a month in the future, and would then be picked
   up as the rotation's seed weeks later, carrying the wrong body with it.

   Taking the first day of the month straight from lunarDayMid and counting
   lunations to it makes the two physically incapable of disagreeing. The
   division lands within 1/SYN of a whole number, so Math.round recovers the
   lunation exactly. */
function lunarCycleIdx(d){
  return Math.round((jdn(d||new Date())-(lunarDayMid(d)-1)-2451550.26)/SYN);
}
function lunarDayMid(d=new Date()){
  const mid=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  return Math.min(Math.floor(lunarPhase(mid))+1,30);
}
function monthLen(){
  // Check if any day in the next few days would show lunar day 30
  // by scanning forward from today. If we find a day 30 before day 1 reappears, it's a 30-day month.
  const today=new Date();
  const todayLD=lunarDayMid(today);
  // If we're already past day 27, scan forward
  for(let i=0;i<5;i++){
    const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()+i);
    const ld=lunarDayMid(d);
    if(ld===30)return 30;
    // If we wrapped to day 1 without seeing 30, it's 29
    if(i>0&&ld<todayLD&&ld<=2)return 29;
  }
  // If we're early in the month, check the last few days of this month
  // Find approximately when this month ends
  const ph=lunarPhase(today);
  const daysLeft=SYN-ph;
  for(let i=Math.max(0,Math.floor(daysLeft)-2);i<=Math.ceil(daysLeft)+1;i++){
    const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()+i);
    if(lunarDayMid(d)===30)return 30;
  }
  return 29;
}
// Shift needed to put menstruation (cycle day 1) on full moon (lunar day 15)
const MN=['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
function mEm(i){return MN[Math.floor((i/29)*8)%8];}
/* ═══ THE MOON, DRAWN ═══
   The emoji only has eight faces and they are somebody else's drawing. Here the
   shape is the real one: a limb on the lit side and an ellipse for the
   terminator, whose x-radius is |cos(2*pi*p)| — zero at the quarters (a straight
   edge), the full radius at new and full. Sixteen steps, the same bucketing the
   watch uses, so the two devices show the same moon on the same night.

   The illuminated area of this path works out to exactly (1 - cos(2*pi*p))/2 of
   the disc, which is the real illuminated fraction — the geometry is not an
   approximation, only the step count is. */
function moonIdx16(i){return Math.floor((i/29)*16)%16;}
function moonPath(cx,cy,r,idx){
  const p=idx/16,k=Math.cos(2*Math.PI*p),rx=Math.abs(k)*r;
  const waxing=idx<=8;
  const limb=waxing?1:0;                       // which half the sunlight is on
  /* Terminator bulges AWAY from the lit side for a crescent and INTO it for a
     gibbous, which is the difference between subtracting and adding the
     half-ellipse. */
  const term=waxing?(k>0?0:1):(k>0?1:0);
  return`M ${cx} ${cy-r} A ${r} ${r} 0 0 ${limb} ${cx} ${cy+r}`
       +` A ${rx.toFixed(3)} ${r} 0 0 ${term} ${cx} ${cy-r} Z`;
}
/* The same drawn patch in both places, so "on your body" and "in the drawer"
   read as two counts of one thing rather than two unrelated icons. */
function PatchSVG({size,color,dim}){
  const z=size||17;
  return<svg width={z} height={z} viewBox="0 0 17 17" aria-hidden="true"
    style={{display:"block",flex:"0 0 auto"}}>
    <rect x="2.5" y="4.5" width="12" height="8" rx="2.5"
      fill="none" stroke={color} strokeWidth="1.3"/>
    <rect x="6.5" y="6.5" width="4" height="4" rx="1"
      fill={color} opacity={dim?".4":".55"}/>
  </svg>;
}
function MoonSVG({day,size,lit,dim}){
  const idx=moonIdx16(day),r=size/2-1,cx=size/2,cy=size/2;
  return<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
    style={{display:"block",flex:"0 0 auto"}} aria-hidden="true">
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={dim} strokeWidth="1"/>
    {idx===8
      ?<circle cx={cx} cy={cy} r={r} fill={lit}/>
      :idx===0?null
      :<path d={moonPath(cx,cy,r,idx)} fill={lit}/>}
  </svg>;
}

/* ═══ PATCH STOCK ═══
   How many patches are left in the drawer, and when to ask for more. Nothing to
   do with the old reuse scheme — this only counts stock down.

   Stored as {n, at}: the number last entered, and when it was entered. Remaining
   is derived from those two plus the schedule, never stored, so it cannot drift
   out of step with reality. Fractions matter throughout: a 1/2 piece consumes
   half a patch, and the drawer can hold 8.5. */
function patchesPerCycle(medications,cl){
  let n=0;
  for(const p of patchPieceList(medications,cl))n+=parseFloat(p.size)||0;
  return n;
}
/* Applications from `fromDaysAgo` days ago up to now, as a total of piece sizes.
   Walks the schedule rather than assuming a rate, so an uneven cycle counts
   correctly. */
function patchesUsedSince(medications,cl,nowCd,daysAgo,cycLen){
  const pool=patchPieceList(medications,cl),L=cycLen>0?cycLen:cl;
  if(!pool.length||!(daysAgo>0))return 0;
  const perCycle=patchesPerCycle(medications,cl);
  /* Whole cycles in bulk, the remainder walked. Ten years of history should not
     cost ten years of iterations. */
  const whole=Math.floor(daysAgo/L);
  let used=whole*perCycle;
  const restStart=nowCd-(daysAgo-whole*L);
  for(const p of pool){
    const d0=parseFloat(p.day)||0,sz=parseFloat(p.size)||0;
    for(let c=-2;c<=2;c++){
      const at=d0+c*L;
      if(at>restStart-1e-9&&at<=nowCd+1e-9)used+=sz;
    }
  }
  return used;
}
/* When does the drawer run out? Walks applications forward, adding sizes, and
   returns days-from-now at the one that empties it. */
function patchesRunOutIn(medications,cl,nowCd,remaining,cycLen){
  const pool=patchPieceList(medications,cl),L=cycLen>0?cycLen:cl;
  if(!pool.length)return null;
  const perCycle=patchesPerCycle(medications,cl);
  if(!(perCycle>0))return null;
  let left=remaining;
  for(let c=0;c<24;c++){                       // two years is plenty of warning
    const evs=[];
    for(const p of pool){
      const at=(parseFloat(p.day)||0)+c*L-nowCd;
      if(at>=-1e-9)evs.push([at,parseFloat(p.size)||0]);
    }
    evs.sort((a,b)=>a[0]-b[0]);
    for(const[at,sz]of evs){
      left-=sz;
      if(left<1e-9)return at;
    }
  }
  return null;
}
function mNm(i){return{0:"New Moon",4:"Waxing Crescent",8:"First Quarter",12:"Waxing Gibbous",15:"Full Moon",19:"Waning Gibbous",23:"Last Quarter",26:"Waning Crescent"}[i]||"";}
const MOODS_FEM=[{e:'😊',k:'happy'},{e:'🌸',k:'calm'},{e:'🍃',k:'neutral'},{e:'🌧️',k:'off'},{e:'🥀',k:'down'},{e:'💧',k:'cry'},{e:'🔥',k:'irritated'},{e:'🌀',k:'anxious'},{e:'🤒',k:'sick'},{e:'✨',k:'strong'},{e:'🪷',k:'grounded'}];
const MOODS_MASC=[{e:'😊',k:'happy'},{e:'😌',k:'calm'},{e:'😐',k:'neutral'},{e:'😶',k:'off'},{e:'😞',k:'down'},{e:'😢',k:'cry'},{e:'😤',k:'irritated'},{e:'😰',k:'anxious'},{e:'🤒',k:'sick'},{e:'💪',k:'strong'},{e:'🧘',k:'grounded'}];
// Mood word tree: selecting a word reveals related words, always including a positive exit
const MOODWORDS={
  _root:["happy","sad","angry","anxious","tired","calm","grateful","confused"],
  happy:["joyful","content","excited","peaceful","loving"],
  sad:["lonely","grieving","hopeful","numb","tender"],
  angry:["frustrated","resentful","determined","overwhelmed","fierce"],
  anxious:["worried","restless","hopeful","scattered","vulnerable"],
  tired:["exhausted","drained","restful","heavy","gentle"],
  calm:["peaceful","centered","still","present","soft"],
  grateful:["blessed","appreciative","warm","connected","open"],
  confused:["uncertain","searching","curious","lost","patient"],
  lonely:["isolated","longing","reaching out","held","seen"],
  grieving:["mourning","letting go","honoring","tender","healing"],
  hopeful:["optimistic","trusting","opening","brightening","growing"],
  numb:["frozen","distant","thawing","quiet","waiting"],
  tender:["raw","sensitive","softening","open","brave"],
  frustrated:["stuck","blocked","pushing through","adapting","learning"],
  resentful:["bitter","hurt","releasing","forgiving","honest"],
  determined:["focused","driven","strong","resolute","purposeful"],
  overwhelmed:["flooded","drowning","surfacing","simplifying","breathing"],
  fierce:["powerful","protective","alive","channeling","burning"],
  worried:["fearful","tense","cautious","preparing","trusting"],
  restless:["agitated","unsettled","seeking","moving","exploring"],
  scattered:["unfocused","fragmented","gathering","centering","slowing"],
  vulnerable:["exposed","shaky","courageous","authentic","real"],
  exhausted:["depleted","spent","resting","recovering","surrendering"],
  drained:["empty","used up","refilling","nurturing","pausing"],
  restful:["relaxed","recovering","easy","unwinding","melting"],
  peaceful:["serene","tranquil","harmonious","whole","luminous"],
  centered:["grounded","balanced","aligned","rooted","home"],
};
const LIB_IMG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAADpCAYAAADS6cV7AAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAEAAElEQVR42uydd1QUWdrwn1vVEWhyzkpSEAygoqCAEXPsNiJGUBHMOXS3OecEZsdIG1AxB8CcMBIEERUJkjMdq+73h90O487Mzu7O7rezb/3O4TgD1ZX63vvk5wIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMPxjYIwRxphg3gQDAwMDA8NfUZCLxQQAkD/8moiPjyeZt8PAwMDAwPBfjlgsJoRCIdnIQrd4cv9+Kx6P1/gwkhHsDAz/2yDmFTAw/EUtcoyRSCQiZDIZBQBQU1bmGRe3d+KLly+Hcng8B6VC+cnVzfVh/779d7cLDHyAaVon2EEkElHMG2RgYGBgYPj/LMjjf2GRNzju2rxhy7gRw2ubNW2Ce3YJwWfj40PnzZz5PLBdO9y7Wze8ZO68hCf373cgyO8fI8XfXPQMDAwMDAwM/2l+Kcix4d4d29aFiYZ+bdfCE9ubGKstBIaKqIiI5ySLBRhj/ozIKW+tjY0oD0cH3K9rV7xswfwbLx8/7qE7h1AoJDHGjKeOgYGBgYHhP4HWmkZaQW6wb+fu2SMGDUpv79MCWwr0sa2xIXYwN8WigQPxkf37w3TW9/Z16za1dHXFzhbmSntjY8rD0R737tEVL1s471x2dprnd0WBia8zMDAwMDD8e9ElvPF4PDh36rgwasKEt/6tfLCDmRm2NzXBwe3b4u6dAspjIielnT97NhpjTIjFYgJjzJ47bdobFysr7GZlRblbW2NnKwuNjYkB1bypIxYN7Kdau1KyFGMsAAAICgpiMdY6AwMDAwPDn4xWuCIAgMLPhX7iBfNvdQ/sgJ0tzbG9mYna2dKCEvbpXXr21IlojLE9V5vVrlMAYnfvEIb4t6cdTE01rpaW2N3SErtammF3Wwvc1NpcbW2oT/u1aI4njBn57tLZs8MZa52BgYGBgeFPRiwWswAA2Gw2HIqLGzt8sJBytbfFdqYGVFMbc6qplYW6TTN3vGXVqkk/WvNCoZAkSRJmT4/+ydXeDtuZGKtdLS1pd2tL7GZpgt0tTbGrpSl2t7PGjuamGjszExwS0AEvnDXrMMa4SWOlgIGB4a8Dk+XKwPBfhlAoJKVSqQZjbD5/9qzEI4eOHMrN/YBIkqXicfUIApGEWq0GYxNT0Kjo92KxmJWUlMQCAJDJZJSnpyfWaDTIpanzrj4D+t32btOKRZMEUmg0mCA5AIgAgiCBpjCQiCSdnZyopk2d72W9fxc+bMigO5cvXOiiLYUjmI5zDAwMDAwM/7hV/r3T24O7SQPDRw5Pb+PdHIePGH63sDCvbeSYMVUOJiaUh7097Whhrg7wbYPnzpwZgjFGv2VR8/l8SElJ6Tlp7Nh8NwcH3NTSknKztsJu1lbYxcpaZW9sqp44evQHjLHexjUrtvl4uuFeIcF45+aNWzgcDgAwLngGBgYGBoY/DMbfstLZbDZsXL16lnBAX2xlYoh7dgmqLs3P9wAAWLVs6YHWHh7YRI+nMjPQU7nYO1DLlyzZAPAtoe03FAQCAODDu3c+A3r2rHAwM6GaWFpqbI2NcRMraxzo64eXzZ+/CQAAy+Uuwwb1Kzfjc6mOrVpi8YK5F6uqil2152Ix3xIDAwMDA8PvkKQVlrgWW61ZJjnbvqU3tjUxUjmYm1AD+/T8pD2MlZGRYTYrempS2AgRDhsxDAcFdsRDBg4oyc7OtmgkwH/UFJBQKOQAAMRMmnTR1dYGezZ1wmOGDcOjhgqvrVmxfA/G2Bx/y4rnDunfK8Pd2gI7mBgpmzk74KmTxhe/efGim/Zs30vnGBgYGBgYGBoRFAQsAIDUhw9dJ4eFp7V2c8P2xsZqVxsr2snCTOPf2ke9Z9sWCUEQWvmM2XWVla3y8/NbHT9+tN+YsJHVC+bPfYkxNvmtJjFa6xptW7PubIdWLXHUxPGPsVLZgsPl/uK4rVs3TA7u2A47mRhomtlaYWdLc7W9mQkWDeiPE87Gj9PeA8GUtjEwMDAwMPwM0rnJr1xJGC4c1K+yqbUVdjQzVbnbWGF3GyvsZmeDbU2NNYP798WnT58YrxWkv4hnb1y/dmNQp4549Srpkd+y0sViMQtjjDauWHVuaL8++OqlhP4AAJ6enpzo6GguxhglJJzpNnBAH8rGzEjlYWtNuVlZUK5WltjV2pKyMzWmQkOC8e5tW/ey2CwAAMS0jWVg+O+DiYsxMPx/scyDyJSUFM3Zk8fnH4rdt/Ze8l3Q4/MoNofNVlFqSqVS0iTJBoVKSRUVFpEVxRVGCCEcGxtLmJiYQGVlJWFiYkJrVIqPleXldPKt28M/52Rud3JtnooxJhBCtO5aycnJgBDCU8aOV6tVaiBIIIVCITl16lS6tLQUI4Tww7t35CQmCEwD0aBSAZvFAo1aTXE4XJLH5eHXL19oautqIhfOmclZvnr9FISQUiwWE1KplGa+TQYGBgaG/5OWeUREBBshBAf37FrYr1sIthToq11trKimtubY0dqE9mxih/t0CcRd/P1wry5BeNHcOScxxiQ0il/rrPsdmzcdcnN2wP4tvfGBPTtn6ixy3XG65jQYY9644SMeNXdyxHNnRO8nCOK7Na/7d71YPHZAaPf8Tv7tiwP9/T4GtG6FHU1NaVcbK+xqa4VtTQ1Urbxc8ayZMTcxxg4ATL06AwMDA8P/XcucBQCwbdOGZT06B2IzPk/tZmtNu1qZYydrM8rLoyleMnf61VNH40ZtX79mzE8H4kQ/1oJrhTSBMdafOGbUWztTY7pTmzZ486oV0T8KdJ3ATb52LWRw717YTJ+P+3bvVosxtmh0ru9CHWNsUlVV1RRjrHdw9+7Yjq18sKOZCeVqZ4ld7CyxrYUh3b6dH54+fXo2xti08WcZGBgYGBj+T6ATtLt3bl8QOXECnjsjJq9HpwDsZG6CPWwtaQcjY3pw797VGGPn3zvP99auu3b16BoYiM309BXdAgLpmwmXxgMA6JrMND52xdJFMm/XJrSdiYm6rY8PfevWtYEAv6wx/1EwY4z5kWPDKm2NBNjNzoZyNDfDg3v3+rpaKp06qF//nMiJEx9ijPWASZRjYPivgNGsGRj+A0RERLClUqnmQFzchOz379c0b+EZvX7Ltibt/dsfExgKsIrSqLh8LqIp6i2fz/8UERHBjo2IYOsy1H/tnMVFJdaVVVWgojRcS2ur8m4D+soAAEJCQijdMTKZDGOMWS9fvW5SVVOtUWs0YGBggM3NrV8DAKSnp2PdsVKplMYYI7FYTGiFu7L4a8ltHo8HGopW8/X4YGdr92CRWLx7/qyZwZXVFb7Tpk4+S5IkjRACYEraGBgYGBj+l9FZwTcuJ/hNGDcGL1gwfy+bzQYAgH17dizzb+WNHcyM5S5WlnhA925PMcYsrYWMfsPSJ8RiMfEoKcl5evS0NOGggYq4nTulv2Zl60rZJo4dfa9VMzfcMygIb1qz5mjjGPqP6K6LMRaMGDQg387ECDextlS42ttTC2fOvKALGxw7dnTCqJHD8dw5Mw7yeDxdOIER6gwMDAwM/3vourWlpFxziIqYmBczJfKqtp6bhTFGOW/e+I0YMghbGQuwvbGxum+XYM2Dm1faisVi4u+0XNUJXR7G2IYkSRCLxayIiAh2UFAQS/cjFos5QqGQvHT2bMsta1duPnP86DTt9dFvCV/tdVGi7GTHLv7tsb2ZCWVnaoyHDx6ELyUkDAcAiI6O5gIAbFizatmIoYPw9s0bxY2VFwYGBgYGhv8ZdHXjfD4fZk6bkjq4Xy9cV1LSBgBQfHw8qbOQ98fuHhI2Qqh0sjTTeDjY4ZlRkUcBfm4683fO/wsB/2cQERHB5nA5MHf6tIuuNta0q60NNSls1KeL58+Eaa9L6LwEGGMrUf8+miD/9nV3Eq/76rwCzLfPwMDAwPC/ZJ2zAAB2blwv9nZtirt2bK9+8fRpx2+W7DehpxPqtbXlLcYOF5XYmRjhAN/W9PZNG6b+nsUrFosJYaMmMwghuHTpfPCc6dMnhXbvOrVHj27TAgL8I8PCRo5MSDjTTbfRyjdFIYj1W+78Rnuphwf7t8OWBnp4wojhlRhjp8b3qzvu3q1r3ft164KtDAV48oRxnzDGfGCS5BgYGBgY/lfQCeKkm9dCh/Xvi60FBgo3e1vNtIiJSRhjLjRKSPX19WUDAGxbt+asl7MjtjUx0owYNAA/f/zY/0eL98ed1e7du+21ZNGiFVMmTfw0b/YsPGns2KyhAwfeGTl82M1+ffu8iIqagseFh+MRw4d/XL185arKoqImjYV3Y8GrE9a7t2zp1ad7F7WdmYnK1dYaL5k18zabzYbY2Fg2Qqhx2ZwgetKElw6mJho7E+MGbzcXvHa5eDdJkIzrnYGBgYHhr08jgWcUNXHCO0dTU8rNxgZ7NXXGokH9VRhj+0bHAWgt7ekRE1+42lrjJjZWKmdrSzx57NjXGGMD0LrTGyexZWR8cJ8xffrxyRMn4CkTJxSLFy/aGLd7tz+Hw4GXL18a79+/tyuXy4X8/FyPOTNmBEyaOOnsuLAxeOL4cdTCBfPWYozNGwvyRg1ozEcPF31xtDbHTW0sNQ5mJvToIYO/l9LFx8eTGGOEMUZyudx5Xkx0aWinQOzVxAlbGepT/Xv3wI/v3fMHAIhnXO8MDAwMDH9lvrvat28V+/u2xnZmJurxo0bk7Ni0YeFq6dK22sN0wpwAANi5aX1kZ9/WCidTI42brQ22MzVWd+8UgA/FxoZpz8nTKgH6C+fOWjRuTBgOHxNWuHXThglaof/tpAhBTPTU1N69e2KxeKFP4/t68/xNs0UL5klHDxtWMWbEiKoNq1bNxBizAX5OchOLFwd2bueHHUyN1c1sbHBTMzONT5MmeF70tMuNlAukU0YqKiqcLspkXadPnbLP17s53cTWnI6JmHANY0yKf2VLVwYGBgYGhr+KMNd1XLMfLhxSacTn0MMG9lNgpbLFrxyOOBwOrJUsWxPYpjVuYmGGXa3Nsau1BbY3NVZ179SR3r97Z5hO6Ke9fNluzMgRGWNHj8Krl0tW8fX430904cKF0adOneqMMba8cuVK0M6d2xdp78Pg5s0rgSdPnnRv5EEwWjB39s7xYWH0rOnR2QkJCZ66+7lw6pR/r+DO2M7YUONhbY09rKyxk6kp1aKJM144Z06SNkaOAGOkrT3XndNk3OjhSnN9Nt0toD0+c+pUZwAmQY6B4T8J01iGgeFPnlMEQcCm9eunvn+XZcwmWbSlmbkKOJwGoVBIxsbGshtZ8fjwvr3j7929uyAnJ1tDkCQmSBYAQdAAQJpZWn6cMCUqARDQO7ftHL92w4YnXD7PMCYmKnjRMsniYz8danPx4vkwjDGXz+cXfcx9f2r+rFlfL8hkCzLT0lpEjBubuGTh/Jy8vPy44cOHyzHGrFOnTgVIJJLatRs2TRs/dqwbjem3t25ef7Nz69alCCHcf9iwdCeXJq/ZPC6hoikNTSDgcLlEZXWN+nJiYvC8WbOWI4SwUCQiMMa6jHcWAKiVCqWGy+ZCfn4BTr5zZzbGGJWUlDDJcQwMjEBnYPhrgTFGUqlUQ1EU/9G9e+EFeV9oLpuDS0tKBZ8zM41lMhltYmJCA3zbAQ0A4O2b9E7v37/HLJJUYcC0QqlSV1VVY992bYnQ0F5rCIKonT9z7vSnz54cMBAIzsXtP9imTbuOKREREWw2W6+s+GvJTMnSxZn37tzxDg3p1rGZm1uErY1NqamxaUsHB4faZu7u283MLActmDNnwuYN69JoSj1LIpGwgoKCWIFdu37YtnPPEJemTebk5LxfPismeidCqDa4S1dJm7ZtkVylZMmVCqpBrlAjQFBXWwu1tbWtG1vmEomEkEqlmod377QpLizicNhcXF1ZBa/fvumRn5/vmpKSomGsdAYGRqAzMPylkEgkJADAobg9Izhsjq2drR2BMeD09HQ4duJYBADgW7duEQAAUZaWGACQh4fHRZ+WLTUWlpZ6BgYGpJm5OTu4Wzey74CB0rGTIvdPmzp5zpfCvK3eLVvsOnr06BCEUEl8fDwZGxur6d+/f97ESRH+fJ7e8ZKyki07du/6mHgpMfjNy9e5BZ8/Jz5+9PjDw/sPJ8qOH3+nVitjuDzu7pGjwoYghFQpKSkasVhMYJomZ86et9XOydm7rrZ2dMT48SdGjApP6NG9+/De/foVOzg7k04uTdkOzk7soOCQN2HjRs+laRo8PT0xxhhBcjJgjFHS7Ttri4u+spRKNeXcxAU72NnDnh07pgMAMFY6AwMDA8NfinhtGdjypUuu79+1a++m5ct3BrX1xWY8nrxP1xB8/mz8VICfy9TEYjGBEIKHt261i92yac2CWTF7t2/asOHVkyc9AQDmzp09ecRwId6+fctcksUCACAaZ7rrOrppvQPc7evXL5geEfl5ZuRkHDVhAp46cSKeMW3awQfXr3dprMT/WFIWERHBBgCI/+knz7BRIyqjo6ecAQDADQ0ONxITw04dOya+ffWqSNeSVueN0P33rs0bpwe1b4uNuRxl946B+OCO3fOjJ08OGx8+pgJjrA+NkugYGBgYGBj+q9EJrHfv3pkvWjBPc/jwgUEEQcDmVcvPBLZpjc30+eqBvXrgxLOyOQA/b6MKjTu8NXJlx+3dGxU5aSLetm3TVtY3YU426rH+vRadxWJBenq626yoqDljR4zYtmTuvLpRQ4eqRg4dWj921Kia2THReZPGhp+OjJy08NmzhwG6HvLwQ/MXXWZ+bOw2lzGjR9AL5s7e+WvPKRaLCfxz4p/+to1rYzu398PWxgKqW2AA3rl561o2mw2DBwzoHTlhPI6N3dGmkfLBwMDwb4RxuTMw/Ano4sqrt6zmvs/NJdU0bUfTNCxcvmpop5Cg07a21uTD+3dV+2JjN2zbunmF1uXNAgCsbaPK8m3Thg0A6Nq1ax2fPX2+k6+nf2LevEUzNBoNiTGmEUJYa9VjmUxG3bp1q030lMjzG1avyqytq1tAkKR906ZNRllZWxc4ODoeNNbX97C2tVvKYrMIeUNDzO5de++Hh42+fO7cuUAA+H4+AACpVKoRi8WsyZNnfAjqEDhGrVJF7dq1fQIAwKFDh3g6gSyRSDD6tiub6doVkpsnfzoWkZmRoW7VujU1bOTwsdNmzVigVquhaZMmvm/T0vCbjHcWAAAymYwZJAwMDAwM//3oaq7Pxp8a07plCzx8yKDnugYyXC4XwoeL3rtYmdK2RvqKgNat8OJZs9Y3UqqRVrCSGGPT8LCw9Aljx77lcrkAjdzVOqGKMbaQipdu7t+vNx4zamSNeOHC0dp9yQFjbD4taurbvr1Dq6TipUsaeRB4a9asHDtMOKR6YL8+eM7smQfq6+vtf7SefX192SRJwvzZs7eEhY2qr62ttQStqx9jjLSNZcxXLVn01NulCbY2NKhv09wdL5g5fY1Ot0l7+bLV4J69qt0cHHDcjh1HAZjyNQYGBgaGvwi6OPS2jev2+7XwxG621njahHEPtDFkWDx7drifuwt2tTRTOxoZqYJ9ffGuDeuWYYxRvFBI6gTevJkzY4cPHUIlJia0B+0mLo2FblJiovXc6dPf9O/TC4eHj07AGFvrFAOMMSciYuKaIUMH4b59ej/r369PJcbYSRuz17nrHefPnp7cp0c3PG/6jIIEmaw1AECS1uXeqMud/vSYaaUTx4Uf/raTWxBLd49bVkmPtfNyx47mJko7Y0N1324h+Hz88anaVrKc8BEj3zuZmNOtXdzw+mXSe4xAZ2D4z8C43BkY/kQ+f/msVqqUVEVlJZSUlnZ89uy+FQAgOyurAksrK1CqVMDT45M5Hz7Qj58+nQsAXJFMRstkMhx/5EiH4q9fI6xsbJf17TvwiVgcRIpEIkosFhMikYh6cP265ZUr15OKCgu97e0dTpw4cXogQuirWCzmicVi2LZlk8Ta0nJiTUWlprKszK+pkzNrz84d254/f06JxWKk7cWet3bj1m6+bf1SqqqrbB8+eHh/x+YdfiFSqUYoFJIIIRwfH48QQvWOTk36cNic8EP79nWUSlM0MpmM/vgxu/WDp08GfckvoHg8HpvGACTJwkYCUySTySgAoNUUxWfxOKhOLscKtVLDjAoGBkagMzD85SgqKgGBoSHZt3//gv6DBy5t2zawEABwVX01S6FSU4BIGkgCgETwMfcz/erVKx4AYIQQnXz//rr6hvqirdu3bxUKhaREkkyJxWIiIyMDffjwwerCtWtPDE0Mm9k5OWbv2hsbqVardRa8SiqV0hweW/bq2TOOvKaOVDXINbnZOQYskvUIIURLpVI6MjJSHR8fTyKENDEz54yytLIqNDAUKL8UfL5569atNjKZDOuUh4iICPb8+fOf6uvpX09Pe7uWJL95+2vltTwNRbMBERhjoBEBlIaikUKt1m3nRs2cMX1w30EDbrl6NUNqhDnMqGBgYAQ6A8NfDnMzC97AIUNPHj4V32b02Ikrg4ODNQAAFiYWBJfHIzWY5tQrFASHxyNatGpZ3apVKxUAwKVLl9pXVlV2cvdwP4QQqi8pKUEIIQwAIDtzhjp+5MhxgcCgTE1RxY72DusRQnVisZgUiUS0VCqlT5486VBfX1PVp0focndXF9rF2Yns1aPHORM9vaviRYvaPH/+3AgAQCQSUUlJSSxzc/MCa2vrpXJ5QymtoS6l3L4dixCidWtCt27daI1GA15eXssQQXQ6d+6kKwCAj6fvI6/mnhdtHOxZDUolyWJzuHw9vcrOXbqc1L2Dth07Pt22e0/3cZMmLPT09mbK1RgYGBgY/jroYtw/HTm0rLi42ADg5+1JxWIxUVtUZLl+xfJbIQEdigLatStdunBBxuN793wBvsWtZ8+cuWHs6FH0x3cfm+nOpysl271jx5DZ06eXbF2/Xrxw3pxcjDGvcZIaAMDZs/GhI0RDsG/zZlSAj4+qY8uWGn9vL5V/y5Z4zozpGu1uabrkO6T9PGvRvLlFe3fsmLVk0cIvW7ZsmQ/wcwkbYIzYbDYsXbggWypeulX7Nw6uqTFft0IiEw0amD15/PhXJw8f7qF7DgCA2NhYthCAfPbsWbvHjx9v0v6NMR4YGP7NMLshMTD8CVhYWCAAAKVabfHo3r22AJAiFApBa2VjqVRaAgDdMMbmIJfrAZ9fhBBSAwBwuVw8ZuSIyUql8omzh3MuABBCoZBOT09HGGOeeMnizU2dnQ/kFxb6mpmZXUUIKcRiMQshpAEAWiwWE4MHC+88ffDw1OvU58MxYIL+1mdd1czT9UVgp4DVCKFPYrGYkEqlNAAAJCeTCCHN2hUrTme/y2rv6uUx90vel7jPVVVxTsbG1RhjFBcZyYpUqzVqjfqsXKkIwRiTIpGIQoaGZQAg5PF4oNFoYO/Bg4C/bdaCAQBMTEyQDIASfnzvCDTxDABAJpMxljoDw78ZRmtmYPgTyM7ORgAAhYVfbbI+fFjJ4XBokUhEx0ZEsBvvN44QKkN6enkIIbXOulYqlaalxSU8n5Y+nxFCKm0cm5BKpXRc3C4/mqbsenXpcphFksH6Rvon4FvGOq29NAYAAiGkau7Z/OTI8PBy4Yjh46bGRO+eGj2tuE+f3o9cPZq+IggCJBIJ1t1vsEQCAAAuLi4PTUxN+k2ZMu0urVEpT+7a3hMAaJlMRoDvNweCs1MTBZ/Pb19SUmIhk8ko7X0TCoUCNBrN9yY3OsteJBKpOBwO5GbljEx99qxWK9CZQcLAwAh0Bob/fgoLCzEAgEAgSHv06EHHrVs3SjHGRGRcnFoqldIIIYiPjyd0LngAQJWVlQQAQMLp04ONBYYscwurJAAAr4wMbGJiQgAAlJeUT2exWJea+PhkN8gbVDRN5gEA1glnjDHKyMjAGGNB8r37q+7euyfQExhYPUt92ufUyZPO69atm7FkwdL0GzcSfRo3kgkODqYAAGytrJ5gjNmp9++zBAKBTKVWTdYJ4EJ3dwwAYG5plvv161e8ceNGAgAgPT0d6xQKsViMZDIZRghhqVSq4fP58P7Nmw4TRo2+lpX5bpCXl1clAICQGSIMDIxAZ2D4S6B1ZZuZCc68e/tGvWvL1mWTxox6cXDvjvmKmjJPDoeDRSIRhRBCWmGMITUVAAAyMt4ZAULAJckHutPFxcVpMMaEQqXy0dMXPEIIYQ6Py3Z3cPiF61oikSCZTEYlJiY2ra2qbvHy+QvOgbh9a431jSpHjxq9zsDAoOxDzgeDp49fBH67VgYC+LmzXXZeXnGDQl6b/OQJRsA6W1fb0AwhAmQyGe1VWooBAIxMzN+pNGpka2vr1PjajVz4NMbY+Pi+fRPnTolMnj1zZvKF8+d7lpaVvQ8bNy4bAEDo6YmZQcLAwAh0Bob/eiQYYwAAuZyqcXNxYRvw+XDj+jWfbVu3rx01OvzpvJkxN87JZANA23IVACBV+9mSklIKEQiMDA3rAQDSPT0RAOC8vDxnjHFTOweHe0KhkNRoKHVOwXvqB4Guva682NfXd8+okaOvuLq6Uu+zs51i5i5Y0LqN70d7ewfoGhz8EADA0zNeZ9kDAICDg4MZm8vRZ1EUr3uXLh8JgmCnpNzwAQCs8yDwWSzMZrHB2FjgAQDg5eWFdMK8pKTEbe2KFftGDR2SvWfv7n37DxwMyvv8mePv7w+WFlYfEEJlQUFBLKSL3TMwMPzbYJLiGBj+RLy9neqM9cek87m8uFs3b4559PSx761bt/RTn7/o/ub1q+6rpeLYhcsksyQSiQK03dvUlALRQAPNZv/Cin3+/JGgoaGhfNSoUY+Kior0t23ZzCvI/WrQ+BidciASib4CwFREEEBTVLOt61Y/7N+//5G7D+416dS5854OnTu/EgqFpFSKtAqBjAAAqqKipB2fz0cDBwzQODdr9nFmTHRxYWGxNwC8USgUBACACmMjgiAAKKgHAKisrCSkUqn6Y3Z265VLlly7ffOWZVl5GbDYJLQN6AAhXUJWkjSrmmeg53jw+E8oODgYUlJSmMHBwMAIdAaG/36+xaeB6NgxtGLXlo3vuHp6Jdti97U9/dORZYlXr8x/kHKP//jeQ3VZcWmkPl8fSaXSyOjoaAQAYGhkgCuryqGmrIzf+JyFhaU0QgiEQiFpbW0tJxG8NTO3mAYA0ZGRkSwAUDc+Pjs72zD5+vXFg/v37g8U5tRWV40BFgkt/VrvoGn6B1d9OhKLxUROdo5fWXn506aenh/FYjFRWlykqqiowAAAbm7fjq2rq7ZSqVTw6OnTJ9/uqxBjjDlREyZsvHP1hmV9fb3CxdGJ5x/c6cXAIcIVnUNCEg7FxV1pkMs3AADOyMhg3O0MDP8BGJc7A8OfhK1tBAkAUFFZVZD+9s2+oo8ZjsPHjJVu27mtbWBgYLKpqQnr86fPmitXrgzEGHPfvHlDAQDYOzqyARCoEd3y23lsEQCAhZEeQdM0aJPOaERDfGl5WXeMMVlZWUnrLHwMgF7lvLI0MTHBV65emcfl8OzatWt3UyQadqulT0tNwed802+H/ax/AAC9atUquqa2bgSfp3eapmmQSqU0h83hcVgsBABQXGyozdwvcmaz2eDq6qoC+LYz29VLl1rm5nwIKq8oV7i7ufH69Ou7cNOOXR06h4QkbN+0qV3el89NR4WHv4Jv/egZdzsDAyPQGRj+OkRE2FAAAF27BO1PT88wWLl2yz6MMWFmZpN+9HR8H/+AgGKFWsWSK5XGqU+f9k5JSdEAALT0aZmmVCqhoryiGwCAQpFGAAD4dfRv0NPXMzx06JAPAEBEePQRlUrlsGfPzj4ymYwSi8WkWCxmIQCc+ypnweXEBEmDXF7ZpUsXvdRnzwZeSrzUjcvjfdmwZUcOAEB8/Lf4uVgsJqVSKb1t8+aBKpXSNDQg4BgAQG5uupOenp6Fo7NTPgDAp0+fAAAgPT2dY2RkpJk7d+53j0DSvSS98uoq0tLGmtc1tOexxWvXrkUIqWpray2fvXp+qryy6rWxsXGlWCwmdWEBBgYGRqAzMPxFkGIAgA5B3bKsrK0/PX3ypPuB2N0zAAAQQnLR8GHR/QYNljs2acIhOZwC3ae6h/a9qtHQmjcvXztgjImKClMKAMDFxfMjABTX1VR1AQDk2MKxQk/fYFlu7sdjGGOTjIwMHBwcDACACJqOLS0umxEY2EmDEEwwNDEe4ePtfVne0OAct3t3BwAAkUiE4uPjSalUShcUFJjnFxYcMzez2NCpb99KAIAbV5KaY5qG7t17pQIAkkqlKowxyWaxeleUl11is9nlul3lRo8e+9WzlXdeC782z4aNHzsHMCYxxuSq1cv3FxQWNmnZus0+DIAYdzsDAyPQGRj+ciAEOOjbvuhqT8/mP9XV1VEPHj6ahDE2EYvFZO+BQ84snDe/w+Chwwa2bt366c+fQ+Bk55hGY7oTANhLpVKNWCzmIIQ0PA43u7y8whe+uczJ1WvXbuLzeTlLly6WyWQyKiQkRHPo0CHuQJEoi9aopxAI8SdOmXby0PFTpxrkCkF6ejp6m/ZmPsaY7enpSYpEIorD5dKxe3c/AISfLRWLV2nvGYoKCnzYHG4+QqguKCiIhG+15lyKoto6OjtlajQa8P3WbAZatmyZdfjwTy1Pyc50dnFxKQYACgA4ue/edTPg6ZWPHz/+JQLAjLudgYER6AwMf0mCg4NphBCeGTPrJ0sba4LG2B0ALLVCmuXh7f168OABF3R9z8ViMUsul4ONk90RtUrJP7hvr3/j8/G4/IM0TQ/CGHMBAGs0GrJPn/792SyW99QpkScxxobjxo1TAAAxb/HSwyUlJS8mhIW9/vg+M+D127ec8srq3LLiEv+zx4+3k0qlqs+fP9sumDv7YV1trXz16nWDKIpCwcHBgDFGakxP43C5xwAAfHx8SACAHZs29VA0yGHAgD77AAAiIiI0P+shqErbhlbXCU9taGTCadq0yQMOh1Ou246VGRUMDIxAZ2D4yyGVSmmhUEgKzM3fu7i6XTEyNq4FgDzdfEsSi1lJSUmsRoKOBgAYNFJ0lUBIdfPmrakYY7KoqAhjADR73rwzKqWqZtumTZMBgI4Xi0l/f//8LgGd2trb2zVdumTRpy1bNo7FGHMQQqq1qzaPLisrc46cNOVWZMTkx2PHjH1lYmwid/HwYG/ftGnM4QP7M+QKZc2mLds6I4SqYmNjWVKpVLNnz45QIJBluy7+xwEAlEolTZIkZGZlTuCwWM9atfL/IhaLiUb3jZOSklixsbHsoqLEb4L761cuh8vDzZt5HVKr1SAUMv3hGBgYGBj+wuh6tJ84erT9pInj8c6d22P09PR+cYyu/7nWSicAABbNnXO6X2gP+viRIx0AAG2LjuYCQrBx7eo5C+fMKsMY64nFYiK+0WclkmVTJMuWlErESwvXrV29c+fWrV23bdiwsF9oT+zRtAn29fHGE8aMUWxZv7Zm0dy55RvWrZnf+Lo6d/vCBfNeLVgwZ6v23jgAgG5evOg4adxYvGbV8tE6b8JvPTPG2GTBnNl3Zkyblo8xZmt/x2zIwsDwH4SZcAwM/wbEYjGxatUqOmLSxBs5Oe+7u7m53/Fwcb3Ws2/fs+7u7p8RQlRjBUAkEuGaskKPsHGTXhkIjJ/LzsgCOnTowLK0tMTx8fHk0gXzswHjiyvXb4iJjo7mbt++XaVt34oxLjPcvPlQTHlpqS+Pww0GjKGislIvLy+PtnewV9ja2Lzg8/m3YmbN2YYQagAAhDEGiURCSqVSzZpVqyS1dTWRo8PCW4jF4ioTExPi4MGD6uioKZfKyyvaHPnpmJP2fnEjQU08eZDS+c2rN36v37wRyBXyKXmfPpv36TNg6eyF81cuXbqUJZVKNcxIYGBgYGD4X7DSUVray3Y9e3RXmpkY4c4d2uNA/7bV4aNGfDoQGxuj24GtscUuFYuX9+jWDe/euXM8AIAuq/zuzZvu0VOn0DNmRA/Q/R5jjBpb+lpha3r48GG7rVu3WmGMrTHGFhwOp7GiwcIYI915169e3WHmjBi8bde2jtq/cwAALp4712PCuHC8esWKYT94FAgCETBv5swL3Tp1wp3b+WEfdxdsbsDHo0TCIoyxMWOdMzAwMDD8z1npAABr16w65enuiq1NDOUOlubYxswMjxQKFRjjxjksSCgUklwOF4RDBqcO7t+3EmNsBQAoNjaWDQCwb9/e0QsXzMPLxWLRjwJaLBazfhTuP9wLC2OMtO56AgBg//69XRcumIe3b90sJggCtNchMca8SePGvQ8fM/ohl8v9/hw6IY0xZnXyb5dpY2qEbY0NFXYmRvJA39Y4bse2WbprMd8+AwMDA8P/DFqBTRQVFTmHDRfVWBsaUG72NmpHKwtqYviY9B+tWN22qtcTE30H9OpRHzNl0gu+Hh+CgoJYOot6167toxcumEeJxUuXY4x5jZWB+Ph4MikpiRUfH0/qfnT/L2wkyEmShDVrVi1buGAevXP71qU6IRwbG8smSRLmz5p1ctrkSJz6NrV5I2+DDgJjjPr06Pawia0V7WJjrXS2MKMnjBr+BmOsp70GY50zMDAwMPxvobOaN69ZGdGlvR+2FujXt/JwxVPGhs0iEAE/WtU663b3ts0Rwwb1x9OjpszSnocTHR3NBQBITEhoP3fOrI9zZs9MW7t2ZR8ul/uH7oUgCDgQuzNw7pxZKTHR08r37NgR/PO5Q7kAABHjxw8cN3Ik3rFp08jG99/4ecRiMbFCsviOl1sTbGHAVwwO7Y5Trl/u8ivCn4GBgYGB4X/GSkfioCBWcXGxwYyI8Q/sTYyp7oEd6ZOH9ocJhUIyKSnpF+5phND3+PjGNasOR04Yj08dPTrqV87LkSxbMnvu7JlFS5Ys/LR186ZDOzZu7H4t8XzH+rIye4yxMcbYIiUlpc3mzRu6rF+3bvWKFSsy582dXSRZtmQNxtj0x3MuXy4ePmnCODxn+vSxAAC6DPhfKBzfMuBh26Z115xsLOlg/7Z4wyrJbEaYMzD8/4dxjTEw/AesdJlMRqXev99h85Yt99+kpRGTIiLmxcyevUEsFnOkUqnqV+YlweVyqWlToo6UFheKuoYELybZ3GoTU9PivgMHJmrd9RhjzFuxQiJCFMTUVFdZWVtZ2APAV7lSWcVisw0NBYa2+UWF5Rw2v8JYYBjboXPP4+3bt/jaSDEwvHPrVt/bSbdG1FRV93Z0dpowb97CwxEREey4uDh1Y8XEz8+PlZqaqq4rqWwzbNTwO1VVlUYi0bC1sxcuWDho0EBSJpNRzLfNwMDAwPA/jc6Vfu6kbPCgvn3oIQP7q+/dSx4EAKCLczeOqevi6RhjFD565IdAv1bYz9sL9+vZEx85cGAVSRIgDg/n/XidUz8djp88YSwOHzkMx+7c/vbpw3vddHXhP1j4+nFxe6OGDxN+at3KB4cEd8YL582boFVAOI2Vi8aW94G4uL4TwsJrwkQjFAdjY6dqf80kwTEwMDAw/N8T6nfvJvWdMH7s55joKBwbu3v8L44BMfHD8ehs/KlR7Vt5qx2tLdSONja4Z7eu+ObNayMBADZt2sTXCn4z6dKlBzr4tcGjhw0tnD9n5qUxo0ZWzZoRvR9j7KA7J5/Ph4Sz8cNHjhie3r9vbxw1NbK4rV8bjXDo4EKMsblYLCZ0We2NBTnGmL908dIDE8eNx3NnzLz2MSuruc77oK2HZ2BgYGBg+L+DLskMY2ywbNEC6frVq2oTExI2JpyNH1dUVGSpO6aRxY4wxsY9QjopuwR2lO/dvv1GoH97HNy5U8HBgwfdtOeyWjB3Tnrb1q3w2NGjrmCMbfl8Phw7dqxVzLSo+imTI77+9NPBNsnJyW2jJkcmhnbrigf06Y3XrVk5F2OMVkul62dNj6nGGFtijNHz57HsRoIcrVu1buCc2bMLZk6fUXH4wIExbG1d+++VyTEwMDAwMPyfEepagclNiI9fPLhvXzykf5/a+OPHp/9wOMIYG4cEtFcN6NUDY4xNZMeORfXv3Qv37xVadPXSpeDly5asad+mNR4zauSDRqVsLACAt8/fukydHPm1a9dgHBjQQdW9SwieFT3tXHF+fiutXU3sj40VLl+2FJ84caS17qJ6enpw6vjxgVMiI+6OCRuFt23btBVjzNf+mcBiMbMPBAMDAwMDQ3x8PCkWi3kAAHw+DyaMDf9sKtDDfbp3w/NnzTp85MCBbhhjFkEQ8PLxg4FdAtrh8BGid9pd1+DkTz8FjxKJirp17ky7OTmpRw0TVeXlfWgL8LNrX/dvTk6O2+CBA774t/XFzx8/7vLjvWzesCF8/Jgw+unTpx4YY4540aJp48NGp4sGD8LNXJvisWGj9usEuTbznfGxMzD8F8IkszAw/H9AJBJR8G0PcbJv335gY2+909PTa53AQC+lqqqy87VrV8Ov3bjWMHf2zAex+/axyirKcYfAwFwAcMYYZyOEkvPevx83etToq2bmZqzuPXpOcXR0eSYWi7/3UNdt2erq6vr+0qVLvc7Fn3507erVgYqamiKuQFBQXVxt/uBRUusTx49LX7x8iUxNTG/Ebt9ujQE4KpXqaptWrVPKy8sjuBxOsXat0Ny/f59GCAHGzK6oDAz/bTCaNgPDvwmMMZLJZAQAgFAopBFCWCwWE1KplL5195YPrVC37N49NB4hpHzw9EHHLavW3He0sTu+ac/e8Li47U3y875Gfi366o0pdWhGZjqYmlmAwNAYLE3Nii0tLC69ffkq4MWrV80GDBqYtH7btu7BwcFESkrK32yIEhERwd6/f7968fz5Rx8/fBjG43Jr9PT0CUQSBgSBoKKiAkxMTOvZLNZNNze3j809PLaJwsM/r1mxYtiH99mndmzf0VLf1PTNq5dPW11ISJTqGwgyZ8+evWDJkiWEVCqlf+05mW+fgYGx0BkY/ifQZn/rrHAA0DZqSU4GjDFMHBe++fOnj11P/3R08aqlC4/lZWZlfC38Wl5bXTf85ePHyyMjp78HgHkAAMWfP7s8fHJP7/2n/FFZ77Kbff7yybS2pmrivYf3wLuFN3TqHBiHEKLFYjGRkpLyN/diY2ND0TSNAoMDtiUl3Rn5Pue9Yd9+/Z54NG+e2VBXf9je2bl45MjBSoT4H3WfKSgo0JPMXzgn/0setW712knTJ0X0Wjxrgcv77GxwadHcT6PRbJBIJJURERFshJC68XMKhULS09MTS6VSmhkJDAyMQGdg+MuitcIpjLF+2qtXAWwOh/Lw9HyBEKpMAYA1PC54u3uo1QqFxsLYxOPl6zcrXrx+DSUlpUDRxXD2/PlJADAvOjSU+1VwTWPl5PRBe+oFAABcLhfycrMCaqqqEzCAut8QYQoAIIlEQkml0t90GHAM9OuNjY1JRwfH0pOyM/7l5eXf/zhq1DeFw8fHh9yxY4e6+MsXt88FeX41dTXwOT9vUl1NzRcrS8sbzZp5GuWXFDQBAK5WYNMYY/2MN2/8SRYXPDw9XiKEKnQeCsZaZ2BgBDoDw1+S+Ph4ctiwYdS+PbsWxkyNDC/5WupBUwAaSvNl0vixH9w9XG7Pmbdkf/egIL02Pq2odTu29YjdtZWS1ys6t27dtltyUlJQWlraUIzxcglCDdsxxhKJ5FtGeXIykQwAKSkpyMrO+UHM5Mj8gsICLkLoKwAQCKHftYhVdSqWSqEEiybmtWVlZSyJRAIZGRlYe98YIUR5eHggkiTp/ceOLtYzMsSzF80b16NbrxsAUIEQUi5ZtGgut5odiRAqTE9/4Xbqp1MLhg8dFMrX07fFNEBlZUX+0kUL7s+ZMUuMEMrWhRiYkcHAwAh0Boa/lDAXiURU3K4dk8+fPbP60eMnYGlhDZaW1qBWq0zS018FP3v0IDjzVdpkjVxu+LXkqwIhlKT9+F1AaGX8sWPjLly8ELtihaSvFODUp7Fjec7Ozt/i4sHBYJmRgYVCIeHp6ckpyvvEZrHJP5wHU1RUJK+vqwOVQlEBADQAgKenJyGVSmmEEPb09GTHxcWpEhPPdzwdf1YYFBQ0vWf33kfgW64NCwCg4MvnhZZmZplXz5/puW75qjNfi0sMeHy9V1ZWVnlsFotdV1fV/OL5hOE11bU9McY+EomkkLHUGRgYgc7A8JdBK7QojLFxVMQEyfNnz+ie3bsrvVq0kvTq2etVfuEHizUrVx8hCULh7ORs+/LFS/Qh54Mi4bQsauAw4S7tSUA0atShJQvmj//44cMSjLEMIaT4lctRAABLF8yTl5WWmmGM+Qgh5W/dW0ZGBgIAqC0v92GTJMjl8ltaAYsBgOZyuUCSJGRmZqowxvyx4WN2lH8tLlqwYNF23eMBgLqusqTNcNFIUo/N9tuyefO16upqCOgU2GBsZJy+dNXaSJIk6ymKshQN6Pfq6uVLNtY2VjOlUuns5ORkFgBomFHCwMAI9D8DhDFGcXFx3xt6FBYWUowrkOHPJi8vT68wv9DKw91dExM9tXvHLj0fLF0hhecPHjRzcXXFDx885GVmZtJsNpfMzc3l7dy9c2dM1JTOHp6e6XV1dV8NDQ0dst5lety9e8+iX7++b5cuXvzWysLqvYamlQQBlFKtfs3jsertLK2cEi9eslcoFNb3b98OBoCrjUvWGmNiYkJgjNH0yZMnczlcGDp4cIbs0iWcdP26x7U7tyY/e5bavKysjDTg66lGiIZ1yMl+Z2JsZAxhw4a9ZSHyo8DQQCVvaGgYP2Zi2+yMd4Yvnz8HmqbByMSYOn3qND8wMHD4uzdvViCEshLOnvVTqlScmspKzZuXL/tijJdLJJLa5ORkxkpn+Hcp0viv/gwA33Za1CrP/z6BLhaLCduiIjIVAGJjYzV/tZenW+S0903/iqAHZqFh+LNwdHSkuDyehs3hIBVF0wCANm3axPMLCHi3eeOaOWUVlVvvP3qkGTJ4aDnJInFe/hfI+ZAzNCv3/QA2wdaYm5uzjI2NFYMHD36jUlO1GINdRVVlQE11tcWnvDxapVTwlA11UFSQD9UVVcBis9S3k25NIUnyqlQqxT/GrHW7uQ3o0SMgNyen+4cPH9SJiZejRguFY7bv2tGturYOFAqVunWrVmqlUpX4Ief92ta+bZRAA1RVVhqq1Wq2sblpV32C7EB9La5r17FjuZ2NFVYpFbTszDnTlq180YChQ4c3b9kya+uGTccSLyWOqq2tAy6HDUWF+e5HD+0NkEqlV7y8vEholAnPwPAvrutEcnIygRDSAAASi8WkVCql/hmBiDFGEomElEqltFgsJiQSCfVvkgmokcdLF6LDjXNffksp/0cv8KsPKRKJiB+3RIyPF5IAQkhPT//+2X/lBv6eMAYASE5OhuDgYPDy8sLahhx/VHND8C0Ll/3i7Vu/d2/fdteoNIS+QF/Trl27C02aNHlLURSTjftfRnx8PGlhYdFobCYDQPCvHltaWor/i2qfCYwxCh8x/Mz9+3cH9hs48PnWHbu7iESiBs+SEiRNSdHs27Nn5rkzZzbbOdrf3HfwcB8AIAGAToZkOhiCkXayEwCg4fP5tFqjBg6bAw0NDWwAgOuXL3d99uSRX9GXLyPfZ+e45ud/YZuam8PkadG7xkdGTlOr1QAApFAoBN3clVdVucZMm3b50oVLrgKBAWFnbw/OLk2VhqbGG/wDOr4YMWL0JQAAkiQ1NP23TisWiwVqtZpsZACgFQsWHHzw8NEI0fBhGyZERc3Lzs42PHHsxPS6hga6maszfvH4cYdbd2739g/smHPkeHwAQqicUZ4Z/qx5pjPOMMY8Ho+nUCqV3wX9P+J5bSxAGzdM0m15/GcpHz/cE6Gd51j7DAba3yu0CsqfK5Mab+P4MT299faN6+dtXb92Hm5ocPi9m/4zta9/Rgn5/vlv7SkBAODoof2jxo0endapvT8O6dgJBwd2wm3btMFdAgPlq5YsO1f1+bOJ1lJHf/TexGIxS/htISbFYjFLzPS1/pcVtz9zo4+goCCWWCxmNd4t7D+Br68vGwBgtEi40tXeFk8cE9aAMbbTjZvQ0FAuAMCSBQvmd/JvR48PG3mCw+H8vXGNfmOO8pLPX/Zeu2xZbN8ePesG9umHl8xfdBhjbEIQhO4YdmLCmW6jR4g+tvBww317dKcWTJ+ZcPnMmSGNFpFfLJS+vr5ssVjMioiIYIvFYpb2mZDuPjDG7OiIyftD/DvgpXPmbNVe62/eM5fLhchx4S86+LXCK6VSoW6RZEY7w78il3Rj6P3r121WLlmyYmZUVHb05MizRw7tn6zbJviPrMc/7Kegt3XjuunzZ8Ts3bh8ubiupMRGZ1j8WbKMw+EAxpiHMeYhhIDFYsHdK1eCJAvn7ZkwLrwsbNSI8hnTpr5et0wSpp1T/1TTN/QrL41ACNEYY9NVi5fOvHPn1tza2hquUqkEv3Z+ZUMHD1ns7Nq08NKFS/b1Kjnu1DGwrNeAwWc1Gg38GSUqunNgjInL588PTbp727SqspJj7+yi6d+/b5qvb/u7jTW0X1h2QiEp0mpVWC53Xr5ixfJr166HsQkAV1e3PEMDs0SST6iVKmXgy9RnvjXllTCg/6AbK7Zu7ieRSDR/795/7/n+TI3un3lnwcHBRHJy8m8flJwMP/41OPib1SsBoNF/MJ+gkYsLQyM3rJ6eHlAUBVlpaR2zsrK8S4qKQIkpBEABm2CDiYkxZnPZwGazgcvlYpIkleZmFkVuzVukcbncQp0gUygUfzPGhUIgPD3FCADof1PuhE7gcSaHj73+9PHjoF69eu9atXVzdGRkJMvGxoaSSqU0j8cDuVzuPjcm6tqlS4lNunbrdmvXvgOjEULFWgURSSQSulHS2i/maXx8PJGeno4ae8Uwxi5zZ86dlZOdNRVhdXVLH5/jmMAF1dW1E9Mz05uwWWzwa9fu7KgxYRu8vVs/UalU3xWfqKgoLBKJ6MauwB/XA4lEQkilUk1pfr7H6g0bdzy8m9K9c2Dg+a179w5Wq9WAMWYVfv7c3tbJ6R2XyytXqZTA4XBgVnRUakLC+ZaDhUMWr167ad1vzdv/1JiTyWSEhYUF+vW5AFBa6oWZTnf/tSCxWIxWrVpJ7960edeVxEsTikuKuTU1tcDlcYFvoA/t2/unjAkLj2jVvn02xmICoV+f5zrrF2OMEi+eH5Nw5qzkxbPnzlXlFWBiagxtWrfJmTV7zlTPtm1v/isyTVf18ubNm6ayEydOPn340M7O1oZo0sRZplap7V6/ejkk52MuAJsF+vr6UFFcCmbGZtB34ICzS1auHC6RSGiJRIL/kfGIfikYgJBKgcYYCyaODb+dmZbR1tzUBOzsrD/V1tSZv3r10sDW1g4IkgB5QwNgjIHF5kCHoJDUfr1Chf5BQR8bvwCdhpOenv6HukbFxwtJkUhG7Y+NHfj0+dPYoi/5lhqNCgwEAmiQKwAQgv79BmyOnjFj9sKFC3/NjUFjjPkH9u4anZyUInnz5rWtrY1NRdjo0UtGjp94EiFUpbNuEs+ejdy4bs0aWoP5U6OnBYwYP/7h7wnloKAgVkpKigZj3HT//tiOaa9f2bARl2Nhaf5p3pIlDxFCH7UuV/zvWBAwxoRMJkMymQxkMtmP5/8zFkld606krUmm//QFVSQiRN/unda5uGiaZt24kNjv2fMnngWFReOzs7L4xsbGNhwOBxQKORAkAQgBIEDAYrMAIfTNXCS+ea0USjU0NMg1FEVVmJubEw4ODpUFeXmx3q1bF/fs2fNzq3bt7rFIFqjVql99VqFQ+Ke0K220SFhNGTeuMO11GrV5zUqXDaGhhdahoawd164pj+6Jm/DkycOlme8yzaurqvQ5bLba3NKSbWFjW9QlKEg4durUB5pvLvPv9wgASCgU/s31ZDIZBAUFoZSUFAQAagCAvPfvB86eOf2nly9fGggEAmhQKKBv/74pGzesi0ZcwVudB10sFBLg6Ul7eXn96jPLZDLdv9+/q0f37gXu3r3nVHZWll3nwIC767dtG4oQKj1z/PjAC5cTt+d9/uxgZGRU1NyjWSpJgkypUgVeSrwYZm/vwAvt1a/7vIULb/27ld7GLWh/ZZ7Q/+hc+BWlHTEd8P7570YbwsWN32d8fPwfmnvx8fHkyJEjqZXLpfsuX0yYqMfXAx9v73h3N9eG4uJi/CY9Pejzp49Nmzg3LRg6ShQydOioD7GxsWRERMQv8r508ul2YkLnqzdvbU1Nfd66vr4BrCwsgMvhQkF+AeTn54N/QEdqzPiJc/oNGLD1jwr1+Ph4UjfugoKCiJSUFE1qaqrtvr27UhIvJrqyEAlcLhuMjAyhsqISqioraSdnJ3razBnx7s3c7106kzDq6uUrgWwuF8ZPiZg/JSpm/T86Z9APVhOKjo42iJoSeenjh9zOQZ06X1q/des8AKgEAMOI8LB4WbzMu5m7B9nBv90NDYUr3qalD/pS9JXr29b386yYmJBNO3fmdTMxISLj4qjGk+jv3ZhQKCTPnDlDiZeKx6WnvzmoUCryPd2bPXRzd7+PSfIql00Kfzp8ZKVCoSDGjB0XOWny5DjdOcViMbFixQr63IkTY06dPr0o+32Wx+e8z9je3p4aPWbMiLkLFp/RCWUPDw8UFxenBgCYPz1q1+2byVMGDBlyeumK5SN0QvvHgRjp58eKS01Vnzr1U+TNGze2fsj5wFM2yIHS0KCvrw8CQ4Gq74ABa6fFzBCrVKo/RahjsZgQZWQgkMng2/L6syWrzYb8Hu/BGNu/ePa4TX5+PiouLga5vAFqa2tBqVSBSqUEpVIFJSXF0NAgB1VDA1AAYGxsDHb2drh7l64otP+gtwRB5AIgwPj7V0YKhUL4oxPudwd6I8+JTqE6eeRAj0f3HgUWFxUPbZA3NKmpqQWBkSGQLPIrl8N73sLbq15gaJiLEPrMQiyMAQsommoqlzeYlpaVo+rqKqirrkW1igYun8ezIgjCuLqmWk3QiG9kbOhobWnFKSgshPqG+kIPz+ZVdXU129u1b18cMTU6lSDJL4DxLzYYEQKQ0EhwCoVCEKanY/iDGrJWoAPGmB02fNi9Lx8/+yU/eeyAECoEAFi3cuXE64lX99XX1YC5mSlkZGRAC+8W1fMXLZgWF3dgkUKtbm5obHCjffu2sRMjo58gRBQgBL+5CQoiCAAMwGaz4N6tW11PxJ+yxBpqTE5WVmhWVhZgjMHUzAxat2nzhabxzvb+/lmToqKukSSp/LU4+a9KNYKAT5+yW5w+dnrmtevXwqurqsi+vftuFq9evRQh1IAxth83alT66zevDU1MTdPr6+u9KioqgM1mQU11JegbCKBLly7xu+MOTEAIyeFPTIrDGBMykQjJvknvbwrI35wfge4dYoxRfVVV65zc93bV1dVEeXkZUBoKOFw9EAgEYG5mpnZ0sC41Mrd5hxCqRQh9j6lqY/8/x1e1Y+XPmBt/lvLyd9zLf9io+nfQeO0nSBJoigKCIEA3Dv9evFgnUB+m3GqzaKkklSBQ3s7t22d4tmxzHn5eA82Xzpu79NrlyzHeLVvnHTxxvInOKGnk9dXNUdOxw0Rvk+8m27T37/BxyNDBu708fa5wOADZ2R/cHjx6FHM58UoXt2YeMG3qtE4h3bvf11nbv3N/SDe+deszTdM2s6Km3DmfcL6ZjbWtvHUb3+TmzZtX1NbVKZ48edLr9csXthbmppRwxPAV8xYtk2KMycUzZhw7c/acqE2H9p9Oxsvc/lHDCv340hcvnD/l/r17uwMDAq6uXLu+n7YfNQAArFixIiwnO+top4DA5VNjYsQqlQpKPxf6LpEs2ZmckuLfp0+fJztj9/qrVCpgs9lw5szJgJK8Ij3RsGGfjCwt3/+Wy00XZ/D29nZPOH/urY2tdfz69ZumIYQqGx935/r18JXLl++3sLbOOXXmTEuJJJgODg6GkBCp5tzxo9MOHz6y49OnT9DE1QXe5+SAQqGgR4wcvrilr/+Gxm7K2NgIdmoqgKa2qk9+wdfzgcHBN5ctX96jsUAXi8VERkYG0k4W6qfDByMTLiTsVSgUea18fPbo6evnUCoVi2SxQlJTn3cCGpr7+3c8OHfJkokihAjZt+f8hyb7j9dsLMBpmnY/GhfneP3qDbZjU8exVbXVzT7l5nJra+sIYxNjJxtraw6NMbBIEthsNhAEARRFffuhaaBpCjAGoGkKaJoGjUYDarUG2CwWVFVXU5SGymjVquVHCzOzvZGToz4bmptnNB4b/6xlohtXGGPiYFxcl/eZmZPT0tO8NSqFu1qtAS5Pn7a2tLrWrFnzhB7duzxv2bFjHiKIcvgHdvPS19eHuro6jtZS5QCA4ZkjR2zSMt51y/7wfnBtfW1AQ30d8PX4IJcrGgQCg4wW3j458tqagyPDwjS+7QPu6ZJRfss7AwBgaWmJvwv7X7HqIyIi2HFxcepF8+asun7l2qJWPi3T3Fzc55SUfG35OPXZOjabC1GRk4TC8PBPA3p2T6iqrrKbOXvO5IHCYYd3bNw89979pPkNDXUGarXmq7mZeUGrVq2pvPz8n24npWRaWpoiNiAMCFgWNnbmLs5Ows9f8p0+ffwoMDMzdamrqwU+Xw94HP7tgA4B5Twu98On/M8+b9+m+RAIOajUalCr1R9btfYp5PA4e7xbeBd7e7dGLk2bVhUWfTH4+vUrWVBYCJUVlSgrIx3TGNkp1cppHz7k+tVUVUHely8wYMCAh8dOnwmor68HjDFasmRBpzvXb6X4tWu/fvuuXcuPHznS7vrNG/MqKstD2QSBmzg7n9i8Y/dEhJDin03y0ea2IJFIhAAASkpKUEpKyq9mM+vr68Pj+/dDzp07Rzx+/pzv17JFeGlpWYvMd5mIpmkDczMzOz6fBxRFgVqtAQwAJMkGkiSBJAhQqpRQUVlV0VBfX2ZmaqZ0cHRoMDU1g+LiUgwIEz7e3mcjo6LO8Pn83D9jbvxDir322QEAUlJS8D+pHJFBQUHI0tIS/6c8DY08mxa7tm2bmnTnZmh6ehrL0cmZGjhw0L0p0dPXIYTKfk9g6ubVkkULNz28f39GSNcuG5aKpQtCQ125jo5daACAuLg4NYfDgXCh8EZmRlb3fgMHLfX08njWd8iQhwih2vj4eFKn1Bzevds3Lnbvc0NDw6qrN276IT7/Q+Pr6enpw7bNGzbExsXOaduu/YMDBw8HKpXKXx2/uvtGCMGNy5fbXrl2zc3WylqkoTTWr1Kf2b95/dIOA0HPWzQ/ftLUmBGU5tsjVldXu8+dPuPa3btJTfw7Bbw5dPhYAEKobuqYiV6Pnz5IM7I0rz1+9nQXWwvb57ow+B9536xGbjaaZLHgzavXMVwOr3buwsXRCCEqPj6eo3Wb04MGDTqvVCr9fH19UwGADA0NZVk42aZijEdOGhv+5F5KcvvVEomUzeVeffr48fLd23Z1b5DL4dKVK5XrVqyYvni59KdBAweRMpnsF8IuIyODJZPJVNKliydSGjVr7twFGxFCldu2bePev39fI/T0JHclJ9NmRkZZBgYCXFdTwwYAllSa0iCVpgBWKNwGDuq/JvfDBxgxcsTWsLCxJ2P3xy55+uxZv3dZORGr1m1eC40Sd27dqqRlMhk1d0aM37usHLA0t/jyW7FyPX092LZ+3cLjR4+s5vC4nxKvXA9BCH1qdPgpjDFndtTkaw/u3x1vum9fyXkWa6Fw0KA/7CrRlWA0zrakadpl25r1HlVVFZOePX9m07drt3ZskkQN9fWAWADV9bX1iEDZAZ0CCT0e7+injx9vyClNhbmRWYO5hTEyNzf/efCx2GDIF4DAkA/AYoNGLoeioiKUlpYGZpYWfhZ19SNycnKaP3v23FuhVPS/eSdJERUx6U7vvv3O9O7X7xJCqEw3OYODg/9QXAchBEOHDiVlMhl168qVoePDx87PTE/3oyk1WFiagYNTk5sd/DscHjdlyjOE0HsAgHmSpbqPc7QL1o/vj/AET5aX0IvUxtxxcXExvnbtmgYhpNIqqEoAKNX+vAGAzV/z8rzPXzzvU/Alb/Sz1FQ7jMHv/t17fhqNZviXgkKoqKrKGRc2Ot/Dw/1LaVnFaTMTk4p+/fqhFq1bFwgEgs8/em0aWUSkOCgIgTYX4dv6K2ZNmTL+QHlZ+bgHd++1SEtLu6ZQyEFgbAJDhgmXjZgw4Yxo7Fjo36fnSYLDnp2Zk20/6FtTmJUY40NR48b8dOXq1ZCPbLb1k6dPoUWLFu0CO7YHlVoNtIYCjUYDtEYNn798gYqKShohSLN3sE+xsrY9OWjAoCc+vr6vZBcvNhaIgvOnTnVISUmZnPvpU0huzocmlRXlAdlpmXA98QoolEpgs9mgVqlAqVSCSq0GuVoFBEkCn8cHgcAwdcigQcmPnjyZolQoixRKJXh6enIQQqr5s2cL+DweVJdWPEMI1QNAEkmSSRkZGe15PB7l5OT0fMvOPX84Y1fnJWzs9tYqWr/4LI/HA3l1dYujhw4JMjIyrPl8vTHpmRl2paWlJutWr3atq6sDfRYL0tMzoLq66hNJENXGRob1HDbnEyCk0dczAA6XgwAhYLE4gBCChgY5QZAky4iiuZim+RRNudRUV+l9eJcNlRUVUFtXB29TU9tdvnBh8aypUfeCO3eK7TdsWDJCqFY3N5KTk/+lcifd82dkZCBPT08klUox+laK9TeeE4qiDKrLyjzS0l9x3n/MJ3LT04HWAB+xkUFJYWGtSqNRCQwNqaZNmlB9+vRBbj4+HwiCLP1h8x5Ca0zRAAB/toDXKvOayxcvDhs9fNiuwoJCM2MTAXh4eIBKpYajR4+2z8zM6okx7oIQKhOLxazfKxkrzPuCEcYEj8ulAAAcHbvQOm9raGgo99q1a6ri4tK8r8VF6sOH9q9wdHKCc+fPvzv508EIkUh0T5voSSCMG0iCwJYWFhTweDVapQwBAB0cHEyEhIRoJkZOWZpy796wjx9ymyOEQCQSEWKx+BdKkE6Yf/2a571+zSbpMvGyQfKGBlCrVMDlcqG8pBjkCrncwMiInfrspTGloVh9+/bl2NragpGRUXbq/fuBHp7NTrN5rIssFqsOY0ysE4vXXLlWgY3MzTCtVNQCAEgkkn/MQtfdWHlxcUDEpIkpCrXy0eWrNzqFh4fzjhw5ovi9L0woFJIikUh16NC+0J2bt19SqVQsRwdH0FAaKK+qeI0RIjkkqwWbIEE4TBgTPWvOjl+LSWCMuUsWzHv18OEj9/hz8f7m5jbPZTIZIRKJKG1tIJ43c/bjkyeOtzM0FECPnj2eduzYYZ9w5OgDq5YuXnL52pXlgZ07ndi8bfcoiqKAJEnYt3dn77TMdxx//4BLOu1Md+36+jK7CaPHv3n7Ks105py5WydGTZmpHYD0t9vBjsePHu594XyC6F1GWkhpcYm6d99+Nw8eP9EnNDSUKxAINAAAnp56bKn0iOLhnZvhM2fOPmDj5KzZvnNnC0dHx5y/p1n96KrBGNsf2rt3yMMHD3vn53/pSmkoksflgkKpbDA2MsrxatEio7io8NDw8HDo3KVLms6d+ye58Cz3bt/e+dWbN7Pevn3bvra6mjDQ14emLi457Tq0PxUzJeog4v+8GxcWi4nfS6TTlYPs2bFtceKlxJVZWVng7dOyJrBTwM4B/Xqfd/Ns+fw33cna2DoACLQLu1r7bwOHy1WpVaq/pyBxTE1NUcX9+zgxNxenpqaqGyfePbp71z/+zBlDkkR9Pn381PHTp09WlhYWDmVlZaBQKIHH54GZmRnU1dXVUmrNa1tb20o3D3cwMTZ6ChROHjikX52ds3seSbIqaPrXdbbzJ086fPj0aVV2draXsbGhvIVPq41jxo1LAADg8/nQu1f3G0VFRd2ip8XMHD5y9PawsDC9Y8eO1W9du3rn/n1xU8srKzUdAgKrJk2MiDIwMqoqLS1FVVVVmEWSYGRkBI5OTqiVr28uQZI5+Jcu9O9WmNaabZw8Z331zBmfpKQkKyMT47CvhYUmpeXlSKlUYpIksZGhIbZ3ckJKmr5VVVOZNH367LpWrVo9omkMc2Kik4q+fvU+fPy4E0KoAQDw06dPPdYtX/7Wyd7x2pa4vf2HDhnC0c4f3TVJjPFvuqUbCXCiqKjoeyjsx2PqKitbnDt/3qqupqZ31vss14z0TCt9A/12tFoDDQ0NYGZmBmVl5YW2trZ1Dg72mR9zcvZ16d5dIxSJio0tLdMJklQDxroaoT86H7i56elt9+/di2iEPAwNjSIfPX6E5AplCwTAJQkEZuYWH33b+slmLVy4TTcXf8/S/ANJor9QHLXlgk0fpqQYpb1961rf0NC1oCDf5nnqcxaLZHmYm5u7NDQ0QH19PSjlCqCpb943FskCNocDfD4P+Hw9MDY2gpLy0go2l/fO27tFEclhHZoQNi7HpXnzLF2513cFVfwtcfQfTcb6Lc/cogXzZrzLyNyiUMq/NPfwlA4VDs7zDwzKv3vnhkW87Nz058+eDfb19U3bFRvXBSFU+mvvMCgoiHXv3j3N2BEjdibfvhPZ0rfNp+XLl/f39vV9pyuFFAuFHPD01BR++Lj3/fusSVVV1VBeWQFKlQo6BwXVTp48Obhbr16vAIB+n5raYeasmQ8/fPwIYePCUxZKVnSTSCS0VCrFGGOQSCRIIpGwJkwY9yQzLc1bKl42rUef/nsbhwd0cuTcuXNBZ+JPJWamZxiYmpgo7B0d3jZp0qSotrbmeHVl5dz3OTl+ZaWl0K69f9qhn457/154a8/WrZt+OnxkVmVlJYhGjkgUr1rV7x9NyvuFQC/JL2k9fvzohzRA0eXr19sjhErr6+tt92zbvsnMwjx23KRJydqHsgAAPkIo7/ukq6uzCB81svhD9nto4e19dNCQIYfDxo9PaqivZ11NvDBm59Yda2iatpgzZ07Pbn363NS5QCQSCVxMODvm+tWr0deuXWvj6dUC1qxf28Xbu3VSUlISKzk5+Xud+/o167alvX3VM/9LvkX+50+mFuZmMGPGjN0XEhI6FpWWeF66e8tdD+nlxcZGsCIjfxnD1wlQW1tbMjIyUp2YcDZm87r12/I/F0D0zBk3oufO6SkWCjlSmUyVkHC2/4Wz5w9nZqSb6PN5oFapQKBvAK1atj61csuWkcHBwaRuoUxKSmLt3r0bR44fH7Z4wYJDhhYWsHDRIr8uXbqk/t6X0XjQVpdUuy1fsSzq3bt3E0iEDBRqBVhZWeXo6+nHeXt7f5g6Y8ZjgiQLf4z76rwO30K/jeO/v/z/H2ncQ0CXGa97HpIk4fbt220TTsUPysvNHfvp8ycbpUoFTdxcy1u3aXM5tF+v2I4dOz9CCOHfyovQ/f7wwbgl+/bsXVFTUw1du/Y4NWvBnNWOji5vvylCnpyMjAyVdvwYpj54YHHv0f0+FWWVQdlZWfp19fX2CCEzilITNGAVh8MhOGx2NZ/PLzU2NK62srFSmZkYfzQ2NH1tamz5Nrhb5wauoaEGAAq01vovCA0N5VpZWaEjR45odAIHIQQEQYBGo2E9ffSo26WEBL2ir18tTE1MJmVkZPDramttDA0NTSqrKqG+vhbkcjkYGOiDtbUN0DSVJRAYZjo7O8mbNHHWGAiM03hs/QfNPd1LPFt7kgDc943DVd/dxwqFy6atG6OOHjk6w9XNve7sxURHhFClr68v+/nz55rJ4aPfXb58xd2xiTNMmjJ1+rgJk7b/gQQuXXIf/ChMGiUj/TKMQxDfYn268dTovxvH2D0BOBkA1JxZcxbkff60csy4sd379u17WygUss+ePauaFz19X+6HnIn9hwweM3rcuJ8AAKKjo7mmpqbI1tb2bwVbaiqkfnOR0j96YDDGBAC4nD59WlBdVibKyshwyMzMdOPx+W2rqqpAo9GAqakpVNfUVNra25U6Ojk+LykpO9e3b188aOjQRBaLpcIYw+/lCOjp60N9XZ0xABgpa5X8wo9Z+EVaGl1VW2lDEixPeX29kZrWcFkEqiMx627kzJl5enr6JXJ5AwAAZKentz6XkOBSWFgwNO/z555qpdpYrVRXt2zZavv67Zt36zbK+aNJeLpEYN26+urVU8uXT18FffyYG/Aq9aUxm0X2kssVqLq2BhBCIBAIwMjYGCorKxV1dXWfDAwMsJWVFTYyNQVTE2NMkqyXWdnvbpcUFdcQbAKp1TR2adrUzdTUZOiXz3n2FRUV1oYCAWg0GlAolUmdOnX67OrsvEcYHl5GkmRu43f39yzmv6fMHz58YMypY8ePWFlZPzl87Hjwj22MMcbExLFh1x89eNCtR/duWaOGDZ/lF9TlqdYjSAAA3Sj+bTh6yNDcF8+fm3XqHAw9+/ZZPmS4SKxbf3XrUHZ2tsXxQ4e6FxQUqPT19Xu+evVqYl5eHgwbNuz8ph07Bx+K3bsw6datqCcP7lsVFBeTHYM7o8SrN0wkEkmdbVERioiN1egMyW3btiy+cuHiSoGBALp377kkYtrUrQiheu3aTZfl5dnGzJr59tnz5yZCkTBh3tz5K02srFJ16zTGmLt10/peX4u+tujQof2DAT37ZJy9fMG1pra2c1M3l4Tg4B6ZQqGQ4+npqQkKCgrZuWXrrZRbN6lBgwbnbond20kgEJT+o/lY6Mcs8XGjRt1+8fJFl85BnV63bt36xa2bdwJICtyDg0MWjo+esmndsuVb3n14P4iiKfMmTZwPS1evXowQKi8uLtY/duTQSRKRBQuXLZssl8sbZ4vS1y5c6Ltm3bpL7f3b392+e0+Ql5cXOzU1VR0ff2LQT0d+OpeZ9hY6de5c4du23YaYGbPWUhT13brFGOsDABshVMXlcuFLTo7bqpUrDp6Vyfw93NxZ9XU1YGJjXXvl5h0biUQiz8jIQPHx8fT169dd8vPy5+jp6b0aMWpEPEKoolE2sumi2TMf375xyy20T9+ry9et7a3NUjefNGFcRkpSsllISPDJjv7tr5GYYFEaFW7TKSjBx8enSiwWo0aCmkAI0fOnzzh0JTFxbNuAji/2Hz7cRSQS1f1W0kyjuLLjmhWrljx5/HiSRq0GUxPTT+3bt9vdp1+fWx4tWrxU/dISJbWThXR2diZqampwenr67y8aqakAvt/+MTAwwCkpKfTfyfhlh4aGEteuXVPqPAZH4+JGJ91Jinn19o1NTU01NHVxgZY+Le8PEQ2WduwUcuvHzka63cYuX0qI3r5l6/bSkq8QHj72xNzFy0YplUoQi4UcqVSm0sYE3Q/ti43KyHg3QKVQOKlVKqAxBhagWgOBQGVkaKTh8rlA0xqkUqqgvr6ebGhoYClUSpJFsgzYbBYoFUogEAEUTYGevj7oCwxestns514tfLBr06YXuvTq9QYAVAihkl8LObm6upI5OTlUI6sSuFwuYIxBqVTaXrt0qeujhw+BTYK3XKEUZmW9QxWVFZYIkXylUgEKhQLqG+qBJNggMBCAoZERmFtagL6+Xrq+nt4TKxsbTFM0KiutgPLSMseGhtpu7zLSwc3dDcaGj1s0cMSINTNmzOBv2bJFfvXcucGbt2w8+eZNGnuIaNj7XXFxbSMjI+W+vr5gYmJC/8o4+oeqEcRiMeHl5fVblRK/WBd0CgIAgEgkojIzM31nzZj93M7e9v7hI4c7jR8/nh0XF0dhjPUnjBqd9rX4q+PQEcMk4yZM2vMb7/rXLFOrsrwy8kbyleHvMrM8P37M9VZrNO0qKyuBUqvByNAQ6hsaVCZGRkWurq4fVCrl0ZDgYFXooEGJfD6/VqVWA01Rv3ZeG4VCwc16+8Igv6Ckc15+fqvc3FxcXVXFAYScNRqqiVqttgFMcYDSAMYY1CoVqNVqkMvloKYoIBEJGAHoGxuCsYnZcz+/NgejomLO6KxIrfVssWPbtv5PHz1Zlv/li6OlhUXpuAkTlvYa0C9WqA03/cH8EsPYPbtinj5+EpGXl+dQV1sHxkZGwOfxoa62Nt/Dw4Myt7J8WVtZec7VzQ15t2pFBwQH3+dwOJ8aubW+Zc5qNL+q0LDZbKBpGio+f/U4Ff+Tf1rGuz6V1VW96mpqDFQqFRgZG4OJmanMv2PH9LARI44Cj5fXSCElxGLxH3bJ6+LmI4cP21tWXDxpzdp1fXzbt78mFos5Xl5elFAoxLNmzeJu2bJFvnPLxl374uKmfi0shGbuHuDTptXHrj16rhg0dNihZcuWEcnJycTdu3c1c2dOn1f0JX+dbyvfxd6tWn9yQE3Puvd2VzYS+GYAoA8AVQihGl1oZv6MGfsvXrw43rmJ0/GgwM5fr1+9OufFi1TQ09cHn1atoI2/3wGxdPXE36hYIY4dPDjg0sWL08vKyoNatWnzYtP2bZ1lMpli2PDh1JLZsw+dT0gY26tPn+T1W7Z00Ro5nNraWqQ1HpS6cBHJYsGc6VGpjx89blNWXgbuHu50p05B42fOmX8MIUQdOXgk/NDBfYfrKishMmLypEnTo/f/M1Uhf5Pl3qVLB7vEC5cvpiQlt6qrrgILazvo3WeAVLxCKokMG3Pj0YMH3RVqFVjbWsvr5Q38tu3by7bu2C3SWTxaCxLp4onBwcFw8uRJFBsbaxsePjqHRbKqDhw8bIkQwmw2G6ImR5w4Ex8/fOjQoW+27NzdGyFU+POXVCqQLN205uOHjz1t7By5AZ07Devfv/8jAICUqxfbbNuyM/VuSoqKRIjl4+dLr9m6ra+fn991rfCjNqxZ9fDNm7cdysrLwdXVtWjS5CmhPj4+b3TWMcbYrEtw51wvL6+XO3fvDQYAuHTpktvatauzXV1cCg8f+cn+t7QjXSKfRCLBa6TSkYkXLhym1CpWzPRZU0dNmrDn11r4Ne5ed+XSpUFn4k/vyvnwwcbR0Smza0jI8qiZM081NDQ0XlTZ9vb25JYtW5R/RmkaSZJA0zTweDxoaGhgab8nQvd98Xg85Q8uuO+u2oP7YmNuXr825fGDh8aURgNBwcHQu2+vsJFjJx3TWRm67+1Dxiv3xQuWvH324gVn0uQpJ5ZKl49Sq9Wk9r2rMMaGKxYuXpyWkT5PTdHA5/NrrG1sjrVq5ZMxoF+/Gxb29u9JkvyeLaobqhjTQFE0YExDwcePrVMePeiY/uoV1FRVNME0DPv06SOvrq7OnMvhAAYAuUIOPL4e2Ns71hKIOO7p6dnQzMPjlX9w8FWBQAA8Hq/s1573t1xiFEURAICrqqpa3r17t9OrV6+ompoaB0SQIyqKi3hVZaWourqao9SoDfX4fMLAwAA4HA4gAFCpNFAvV4JKpa5v3aplcc+ePZb06Nv3pO78Wenp7TesXXXz3PlzBp2DgtHsObO7dwrpfuv/Z3+Dxo+PEKLnzpmb8PTJkwGjR49aPDEiYvXMmTP5W7Zskb96/rzn1i1bzrx7l2ng6upWZ2ZicszEzExhbGhIGxkbA5fDARaLRSMAddHXr/wvBQVETXmlqUqlHFpdU8MjyW/pLQqlUm5rY1NnamqWjEky2b+jPxoweHACABQDwN9YijqhmpqcjD8XFIRlZ2c75335YoYB9/9aVCyoqq4ANpsEhL7ZFTwuF2iMgaKoGmMjI42ppUWDgUDwtq629jECVoW5uSkmSTbQCOHqimrE4fJ8GuS1ffK+fDbV4/P5fD092tzMYueC2bO3mtjYfGw0PzjbNm9cdvlC4mIehwMDhwxeN2HKlAW/1cbzm9cEETIZUFevXup56tixHZlpGW4YAJq4NC1p6uJ2qVmz5qlt/f3fe3p63hYIBFipVIJarf49g+z774KCgn5RdqdNovtFrwE2mw0qlYp18cwZ4aPHD7t8yMkd2FBZaV5fXw8GRobg4Ox037uVz60p0VOOEKT+J21YB8XHxxN/L6SgS2KbGT193cf32fPmTp/VN6BX98u6NsS69VMikeC7d+50OnRw/4XS8lIViQh2dlaWibenF8TMmNW7U7duV+Fb0y+TEcKh2Xp87t3DJ04P1ilxuvUm8ZxswI3rN/Z9yc8XONjZVvq08Jo0MWbWZQCAg7G7xx84cGBf1y5drr549szk5fPU9tbWVlRIr95vgwI7L+s3dOiVtLRU1/t3H04VGAiKR4aFb0UIKX/oNGoTPnLYlays7FZTpk6ZMXZi5DaMMWvE0KFvv+Tluc+IieklDAu78WtzNTw8nNdw5IjaIjJyy53bN6I9mzUv9fH2Vpw4ftzB268N3rFzr9X9+/crVHVVfQ/tP5RAIFbhjft3/SUSScE/k9fAahS3xN9OAF8wxv7rV4hvXDyf0HHY4KGrp86ZI8EYGwzq1bt7YVERJRSJLmzeu2dev57d7mVmZoZijN0QQu87d+7MSklJ0bBYLKxWq/URQvVSqRQAALZv365fXVlN2NrZFOgWCZVKBRPDwuR6fD2EMZ2JECoMCgriAYAKY8yZOiXiVkFeXjtLC4uGa1eu6FVXV+/D1dVByMioqqigRFXX0IC9fFpwnBydNI+ePWNt3rxBmpOTk+vi4lLKZrOrbK1sVjbp59QyIz3TWXZGFsHhcfdijAO1goK4ffuqFZvD4QgEhnIAICMiIgh1XR0iMQCfw6sBACJJLEbZtraosLAQS6VSjdZboNYlYbm7u5vdSbpzLD0zHQ/q3x8GDx18FU8cjyQSCf1rZU0cDoeO27lz5fo1axaTJAnBwSHLpKtWrUUIqXXx36KiIhwXF6eWyb5Zsnw+HxoaGgSfPn1Sp6entykvLur1+fMXKCwsRJXl5QQGQBhoqKmt/+ZW5HJBoVGBSqFgA4tFskmSIFgsjoW5uQ0iEIvNYltMmTjRBGMa0QAs9E0BUg0Z2C+Vp6f/oX3b9l8ipkz5icVi1VEUBVo34qKGhobYjatXxCZeutTz8pXLaqVG9dOpo4eJYaKxR7XhERpjzI4YP/b48+fPOP37D3o+f/GSsAVLlhKxsbGESCRSXbt9reWUyIhrBR8/W9vY2D4I6dFt//BRo04QJKnC9B8fu5b29i8B4GWj97sIAODDh0z3V89e9khOTmZpNOo+NTXVbd6+TeORJDk5OzsblCoVoJUrKRdXV2qkaOgFTOH0Dh0CSBdX11yeQP9sQEAA1iXXNXbd0zQNjazhV9of3bVX/Ly4NhjnpGW7VVRVW1ZV15grVQoe1tAsgsVqMDEzLQ3oHPIUEcTHTTu2675Xky3r1sXMnTtn1qOH9wSt2rSG0F6hizuFdL/1r/Z1/rPQWmeEdLl09rQpUR1Onz614tatyy+7detz1dfXl93Kz+86lstbzV2wQPohJ0dYXFQ0maJpnSAHgiSB0Cpnaq0FyWKzwMzcvMHazjbBxcXlsa+vb25Q9+6JAID5fL5CoVAAbPrbuDYAcE7+dMj/zZuMrgX5XzyiIiIGlpZ8cwjU1tYCRVHAZrMbzM0t6uwcbYsB0/dYbHaGu6s7cnZyqvdu0fyZg7vXS50Sy+fz1T80IvpRiWMDACk7cWLgo4cP+5eWFMdMiYmOWbJw/sYVq9euQQhVaBP3liRfu3Z75apVR0+fPj3/yL59VPikSYt/XOQxAPoWsgPNsaMHl29Yv25pZVkltPNr9yY4JGTL8LCwkz+UFrK0oQkMv6yP/60qmsaeODIoKAiJxWJkW1TEch8xApeWlmKL9HQU8m3LXA0AnCQI4iRFUTPPnjo+7G5KSkhWzvuBj58/C3zy/Fng5cTLC+dPn3a8T+9+h7r06XNfJ8x/L1fAxsaGAgCInDTl+Nw5MbMPHzuyAmP8QNsHBAEAlkqltJeXFykSie7W1NS4CwSCegAwnjVtyq6bV68POHXiWAwAXAUAvGfPHouyslIzQ0ODFzRFwezRo/Xb9++vEIlEOCE+3uPU6TMHbly9YmZkaADvMzJtMtIyE3Zv3bpOT0+PPnPuzCRAmAjs1Cnx4vnzQg6HQzg4OX+OPXjYb+PW7XD0wL6YpQvF60tLS7mYpiEzI3MwxribRCKpxxjjw4cP8xBCRZcvnDm2d0+cT3LKfTfd+zc1Nal/+PAh8fDpE0nJly8fLezti86ePtHz1q3bPmw2l9UzNPRe3wEDrnG5XAh4lxHoaO8EMVEzJgaFdk/OeZ9dlZaVJa+oqKBEIhG1c8uGjnW1NeDq7pmOEPryzyryrL+pkhAKOQgh5Zb1a1Obt2jR2T8g4DEAsAFA3atX6Oqqisr5VVVVngBQSFH0Gwtz855ZWVmuAPA+KioKHzx40Gfv7l3Lx48JCxUvXrhasnL15vr6esHC2bOP53/6THQK6pSiHZgEQkg9Y+qUUpqmoa6u3hljbCCRSBRSqZRu2rRpr7dv3rYTGOht2Hf4pxWTxo9PLv5a1AYMDS3YbE7505cvQ4vLS9GQoUNuTJ8avWzBssWbCgoKA2KmTsnmsNl10iVL4kaNHz8bAK6cOXx0GsJAy+vrXbTXphBC+M7NlDCFQs5t08b3EEGSVFxcHBUbG1t6/vx5Kjszs2l1dbVziFT6MTYigpTGxWlWrVq+rXf3LpOdm7h+PHr06NAxY8akjRw5siEz4+3tgsL8rnVKOS4sKKBdTEywNrnke6wIIQR8Pp+WLFp0cu/ePcNNTEyUU2Omz+k3YMDO5atXo23btnGnT5+u0mmwGGPOkwcPgm/dutGysLCwY9iI4T1LS0v4enr6QCIEDXUNgAGDHl8PuFwuqDUUuDo7A4EIKCktAYGpMfD5elUqlbJaq2rKMcalXD7vQ3l5JQZMGREESdI0DYjGGjaHY8xmcUTlJaVw7cpluHn9+u5pkZMPxMREb3dp1uwNABB6enqfORxO6Jrlkhnnzp/bcuP6TQ2Pyz+Sk/n6pUvzlmkAgFkAM+6npPh5ebWoDQsLm4oQomNjY9mRkZHqo0ePtjiy/2CyRqXWhI0NHzEuIuJU3NHDMGL0aF3XMiI9PV2j7SCH/14dcnJyMnHy5EkUFxdHNxK+adofwBhvAACD7LdvLd6mvx3y4sUL65LSsqDq6urm73Pe62nUaqGenp4w/3MeqFUqqK6u2W5mboabNHHGxkbGX/p17X7C1sZG3SGwI9nUw62wU3CXiwAg13k1uFyuXKVSgTZJTEc9ABT8ppeEICDxnGzs3eQUm+q66oDB/ft0ys7KMqyuqYbOQUH0gAH9548ZH7kxXigkRf8FwlxnJYjFYoLP53+4d/tejwNH913fsH7Lld07dkyLnjFjFwAA4vM/sNns0SqVatHNa9eaV5aXN6muqXIsKioGhUIBHA4LjIyMwcrKUm5uYZXWpm3bJ+bm5nI9ff1KeUPDb33HPAAgE2Sy4YmXL5uFjxwxqK6+zp8kWWBlZQV6Av1sNUWddm3ukefStGm5lY3VKwsLm/T27dtXab8jJZvNVmo0v/saUVBQEOnh4YFsbGxwUVER0golrN0nXq1NyjzFYrFOqdXqRXNmzVyamZU1Jzw8bPT58+dHDBo0KNnJyYkXHBqadPfWrZ7LV6y4dur0qdkZr19f8mzZ8nHjXBqRUEikyGSa/Xv3rjty8Mg8hAlq8eKl64YMG7YaIVQ/YswYXXhNt5hrOBwOKJVKFvzc/xs1Eu7oB4sdAQASCASqBrmcSklJge+Z7XFxv3SNA7DGisWsR0VFFEKoDgAOsNjsA2qVynLHjh3jXz192uf9u6zAO9dvj39y/8n4MSLRmT4DBhwbNWbMBa0wRz+EH7+PF6FQSHq19nozOyoqPuVO0ojJY8elPHz4cFLHjh2f6YwbrZeUDQBlAMBBCBWmv3gal/Mua+Db9HQWn88HuVyOpkyZUn4v6U6JRq2UYIzjEULZcOwYKRaLoaS83PNjbq5ZUzcX1ZTJU2RFhYU1t27eniKTyRZraAoUSgX06ht6YcDQYXvDhg0dd/P6DfSlsMAyJjJypVypbLF3T+yAutpa6Nu3/66UlKRBiRcvtbMwM58rlUqXJScns0aOHEkBABQWFnPYHDZhYmKiDAoKYkkkEujWo+fSwsLChNs3bnZ4+vjJOzaLRRsZGrGUSgXk5xdAfW1DdlpaWgdvb+8KPT09JaWmGoJCuyd16tSap6hRazgsFu/503th1xLOvNm7O3ZKUVEJNWiQkAtnZeifnat/s9taBgCFMUZb1q99l/HuHX0r6XZXgiCuaq3axcvmzy/Lzs7anJh41p4Gml1WXl7m4eGRoo0JGUZFTr756tULy6bOTT5/+fxFOqRfPymiMZSVlkK7du3SZs+etxgRBMXn86mGhoZmMyImh5WWlCjlivq21WVFHlKpNBUAAFO4S2VVFXZ3bTqaIIh5p48fX3xWFn+1X6/Q+PHhYR+yct4P9GnTprZLz+6LjWxsnmOMgx7euxd8/syZkckpyaOVDYqpz+4+eESwCdWGNWsXY4omHOwdYwmC0GCM0b7duyccOXpkzocPH9DF8+f2holEbbkkOzfn1RvC2sKq8MXTZw6xm7fOQAhFn79zh43j40nxm9ccYyPjrw8fPPCor6s/gzFupW2w0buk6Ou9jMz0dq+zM70AIE+3B3V8fDyp3ScbzYuZGZ9wPkFobWubv3nT5qFNPTyeaAW5evr06Uo2mw3XL17sc/fB3S6iQQNGFBQW2LDZbKApCuwdHcutrC2P+XfoUGvAF6RxOBzS0Eg/z8rOKdeczS43ZpkShs3taG2NIzIyMkIAUGNkZKRGCAFF099Lk3TutkYLA6ldBOpra2stDsfFjXtw/2FAbs77CVFTp05YvmTJ5qUrVixHCFWrVCrW3EVLtu7atdX76L6D429ev0mbmJrtwxgH5uXlWU6fOnUZm+RASEj3vW0CAp5FRESwIyMjNRhjszFho2+plKratctXdnFr0SJH5xWJi4tTp6SkaBqV1BB/byMPrbVM/+h+FIvFyNbWlkxNTQXtYlyr/dmgU5QAwOD166fmn3LzAt9lZLVIuX0b2dhadqUxeH/69AkeP30MXA7HiMVirS4uLYL0zDQAAoFCqSw3NjLSODo6IktLS+XU8WOv5ebkvLB1sEfW1nZgYGQEPD4fMEURCoUClZaWQmFREWFoJHDS5+uHFH8tcMzOyaFXrlxpoVapQKXNGXBxcVG3atnymnDYyHXerVs/EP7QiOe/SKizOnXt9LqsrDBk8aKlmx48erBz9swZoZ2DQ+YNHDgwU61WgzZRNu8fOTebwwGVUok4HA7Oy8tzvpKY2OteSpJxVMSEiS9fvhLweFwLiqLA0NAQXFxczvq2bXssbOyEZACoYXM4tOZvXdG/MLQjIiJIXwBwHzECBwcH/5jXgn8Ye9/duUIAJNOOq6CgIDIlJQW0JasTrl69dCE2bv+efXF7k2J37ZobNWPGxpkzZ/I7d+uWcfH8+ai9u3dd3L5j+16MsZ+2lS8sW7aMtXz5cs2+fXvWn5Wdmauvp1+weMn8wW07Bj2F4cO/74xHkARFaSjHDWtX97t08QI4Ojm3nz8zZmBpRQVLIW8gFQolVigU6FstPcZsFguzWCzMYbOVXC5PaWxijCaGj/5cUVn9oKy87KO9rY26WTMv7OPtXde1V69ELo9XRRIEpMjlmpRGSqOvry9bO29KAGAtxnjDm9TUtudOxg9PffVq+LvMzKE5ue+Hho8c8XDQ4GErew/ofVUqlf5qcuzUqVORTCZDHf39b714njrs8pXLPhX1tcsBIDQmJoYLAMorF8/3mzpxwtZXr17p29rbEDOjpxw4evQni6/FxeDu4aGf8vgpiRAiEUJlyTdvhu4/sO/YmBGiJzu2bV41LWbmToSQ4l5yssLCwgJqaqoVYyZGrEcIvXmSlHRwz8F9k2obGvR79Qx9MmFS5M7ly9eSg4YJp9CALz64/8DuUsKFxTU11WBnZw/jwscdW7RCOm35osWdD+zfb/Xlc14vAFjmUVeH0tLSCIwxf9qUSX5FhYWasWPHqbds364bL1dvXbvW6dKFC9NKiku60RRVYWNldW3AwAEFe3bvkbx6ler+8OFdL4zxfWMjY1xZUcGtLC5usnXr/s/rV69g37pxA/bs2LOOQ7K5WZlZ0DkoGJp6uMXBv7CFKvqNUir6yZN7XutWr08rzC+C0J6ha9u2b/PAxcW9YcXy5YMxpqKOx59pGtol6IShocDqbOK1pjRFwZEDB1bt3LFzkUvTJldPnj3bN0Ema339+vVpX3I/KYcNE74Ni4zcfeTAgU737qUEEYiI/vIpz+JrURHUy+uBxSGhVevWTwKCAkdPmzY7p6yszG7UiOHZXwu/6C0VL5sxVDRqm2TxwgkvX76eQGNaYGtn+2zMuAl7AgICnsXHx3NEIpEKAMDU1BSmTpjw+eDBgw72NnbYQGBAlJWUQMeAgIY586e3cvVqk4sxJlZJJDuysrPCqqoq05VKVb2hQBBc9rUE9Hg8yC8oUJeVlaEWLVrQUdNjhgwQChMb1/WOFAo/stgcztETx+1EIlGDTCajfjq4f/qZ82e2tusYeHzxwiWjIyIi2DZZWVj6ramC2YRRow6lv03v5+7Z7O3+/ftHcAWC9OjQUO6Oa9eULBYLjh050vtuUtK8t+lpQVVV5WBoaAQmJiaZNtbWD7v3Dv1JKByZhhAq/xfXZaRdmH4UhsDhcmDDylVDZWfOsHyaN6/ZdehQ/rmTx1wSLyZKK6qrve0dHdMmT4sY6O3t90Gbkc2aO2P63dPHT/o2bdoUScXLeqS+fO514MDhLe7Nmhedv3K5lUgkKvf09EQrVqzQTJwwLi4/L2+ScODgwHFTpjzQlUSySBYQJAG5ubnudnZ2NXw+/6tSqfze3etf7MSFdGUowcHBhEQigR9ryht9r3oAYHb+/ClOXZXcU6Vs6Pvi1SsiNzeXw+VwPPV5fL+K8nKorKyE2tpaIEkSuFwusEgSWGwWsEg2kOS3hj4AGCiKBrVaDSq1CjQazbcfrAGBQAA2NjZQX1d30dfPt8zLy/thSOfgm02aN89TqVTwXxIz/52s7G+uVg6HAxvWro3KfPdupUqlErBI1u3y0pJrVjaWdQTJUfPZbMLUwgwEAgHw2Fzg8nigZ6CHSZIAlUqFqysr8YcPnyAjPZ00MjLyMDIyGpyfn29ZW1traGRkBIVFBaDWqMHFxQUA8H1PT8/kqMnTjlk5Omb9kPRFREREkCO07mRteSrWVYP8M+OnsUXN5XJ14RYAANAmqiJtaavN0EEDr9bV1LQM7dV7yMy5c8+Fh4fzjh8/rpgVM23X69evpw4eOHhUZHT0CV2+wZUrV3rv2bH9Mo/LL1i9amVPNy+vdF2uUUhIiObdu3c+h/bvX5z29rUQAUZGhoZgaGgIZRWVuWVlpXkajUbBYrFYBEHQWqWXRRIkmyQItsDI0FlfX9+6oaEeGhrkUF9fB/IGOfD4fDDSFwCBERR+/aoyNjb+6t7Mo7quvv64r59fQZ8+fXKdXF0fcblc/EMirm73P8AYWxzdHzcmKfmO6P37nHZ8PT1wb+Z1Pio6eqmX9hkah4eSkpJYISEhmidJd6dIJMt25xXkw8Bhwg2rVq2Zp1XYLSPGjk2/knjZlMflQAufFkCyWZCf9wXUCgVMnDRpftSceeu5XC4oFAq7yxfPt//0IddPdka2oLqmBrVv3/5lh3YdFrTv7PXowF7ZtkcPHozj8/lVHp6ekkGDB2cPHTbsqlyhAKU2nKK7H1xfbz938cK5n3M+hnBYrBr/jh2uzli4cBUAwOghQz88ffK0aVhY2NqFK6SL/BBipQKoMcasGTFT8m5dv2Hj6uqR1sTZdb2RqRH2a92a6Dt4cDKLzcrTqDX6VlZW9eUVFXD7QmL3TZs3nv5aXmwSOS2q28SJk2+PFAlvyxsausyZN2dk5+CuJ7fv2Dz18d2Ha96/yzbU19MDFxeXD4GdOh8Ii5i4TiKR/NM9AX59JyexmACJhDx16tTUhLPn5tTV1tgTJAKCxQaapsDDzePIhs2bxwd1aPvS0sLK4EziFRfAGBIvXBi8c8fOsyySKF2xcuUg3/btH3C4XJA3NNisW768xZu0tBXVdTXtDQwMoKqq+i2tUue6ublhlVIJuZ8+0I7OToNbtGy9cs6ceWKMMd67e/eUC+fPbFTIG/jBIcFzxCvW7uRyuUoABCqVdrs8bakZxpi3ZMGCea9evZxVWlJipJDLwdzUHMzMzB619fO96NK06bEhYWH5JEkCSZLA4/Ggurra3EAgKJM3NMC927ebPX3+fNCTR49ExYVFrXLevweVWk25ubsrgrt2OdI5KPAyAKm8l3KnrVKlWWRmYTly/qJFibGxseyIiAhN2qvnQbNmz0qydXQ+efjQ0VEiUQeeTPZYnvPuXcCCefN25X3+3LJb9+5PVm3Y0EcrmBEA4OuXL3Q59tOJGRkZGf1qa2rA3NwC3Ju5XxwwcOCJgUOEV3SNK3TZoyNHeqDCQhsMAODl5YW1pX9/aNFqvLjpWkeKRCLq2JEjA27dvLEXAVibmZnB16KvoFYpqdlzZ7Rq2zE4e+e2bX3u3k3+ydDQqCoqZnrIhQsXPkilUjrl9u2OG9atu5f65DEePTosu6K8TC8pJcVxzLjxTyWrV/s3yuK1D+3R/YtGpUy6lXy3u0gkImUymWrfvn3Bz549XvUp96MrQZIWVVVVKpIk87p26XpbumLlbG27UPhXNNZfS0jSJjMiLy8vdOvWLSI1NRUa16r/ymf4NWVljk+fPsX3792Dp6+fgWigKKymrsbtY24uXfK1BJWXloNc3gCUNmGHzWKDgUAfLC2tsGtTF2RhbVlbTylPV1aWfZkUHo7cvNpkaStBflY+xGKE/gJ9wrUCD7QJQ8bLly33KiopXFKYX2jgYG8XSNEUlFeUgUKhAEQQQGpL5HSJjjRFA2gowBQNFE2BsZEx1NXXl5eWlD51dHRQtm7Tury+vv5wPSUvmR09mzC3tc1ulL9AxMfHI6FQSP+zAvvvjQ+EEL515YpPwsWLPevlDWMKiwpIExMzwtzc7EOz5s1OREXFJEokErlUKlVhjI0G9et3X0Op3eYtnN+1c+cuDwCAhXGd+fDBo9PVak312UuX3BBC1MOHD10lS5fcZbPY5uJlK4LbBbR7GBERwda69zVbtmwJTkpKuiGvq2M72NrccnZx3eLT2uvDgAFCJQCUCwSCWrVaA41bAhMECSRJAEEQUF1dbQoAZqUFBehdZiY8evQIJz18SPfu2a2TRqHq+ejeQyguKTZ1cHDoUVRYCHKFAkxMTKBeLgc+j5ft5elZTGB0dMgIUVH7zp2fkCxW2Y9VBBhjXvyxo8MuJV6e9+5dlqellUV92KiwUSPCwy807rSpS4xbsXjxkiuXEle4erg/ORof300ikTRIpVL6fHy87/bt256/fvFKPTkyonjV5s1B9SUlDQeOHFzKY3HG5nzKnalQUHoNKuWwjMzMZgZ6XOO6ulpQq5RQ3yAHgYEBtG3frqFP/14evXsPyd+watWGBw8fDqbUmqYEm4SSspKvLb1bZXb09z8QNmHCGYSQUhf605XKavNklBhj66mTJi1OTkqa5uvrWzttyhRP/5CQfA6HAycPHx5qZmvxISio2+clC2avevrsxThEkFzAGNgsFnwt+io3NTb+7OLm9kGpVGbU19YOLi4qcin6Wgwh3UO+du3Z20coFKLePbq+VKrVlrKzss5mZtaPAADqy8rsd27dqu/n5wddBgwo1u018i9ZbH/nbxhjbLFaIrEBFjGYzeX5IUTsmTNnzm2CIBTBAe2fCvQNXC9cu9lcJBKVyWQyatuWLfPfvHqxsramjqVQKvNpmtLj8/imJibGoFSr3zo6OZ4ICul6pWvXrlnoW4esX2RT8/n8ryq1GjBNA8YYnj9/1H7f7j2H8z7nNeNweUVBQZ1O9+rf92Dz5i11m03Aixcv2u6Liz3xJe+zK4sgn3QKDMwDDDJne/tPIyZMeKZSqQBjbHIkNlaY+vLl+Pz8Ar2qygqeq6vrV1dX10vde/S43MbfP0NngZ87fXrYtStXFubl5TUtLCwEQyMjcHJyAktrS7CwsvxqZWM/ceLEiZd1ZUAikYhOuXm1/9bNm88392kdv3rd+hEAgK/Enx11+NiRQx9yc9lDRcIDC5Yui9EKKYwxNtm+dfPqxIuXJhcWFEDTJk2hRYsWiaHdu6/p0qfPQ51gCAoKYllaWuI/u2+0TtjG7t49JDnpzhkel/eqdevWY0ePGoVfvX4t2LV75y0bG6v3O/bsa4sQUh7cu3dw3P59Z/38/FLiDh4KHjBgAHn27FkqatKkk9evXB7OYZGgUqkxh89DA0VD5q1YtX7j2LFjuUeOHFEcPXxg5snjJzcK9A32xyckRIrFYqJHjxDfbVu3P6qtrSN9fdtcNze1uFlRUdb12ZOnvXI/5EKXLl0u7t6/f5hIJFL/J3pmN+5SlpGRgUxMTIhvYcc43Lik7U8ERUREsLp160brrMo/U3H5T1rrP7xHx4SEBKO7d29BwadCwrW5u7OFhWUzhJAZpmk+YFypkMtzb9249drKykrTwdcXevfujZp6exfqOhL+Vm0z/Pt2yvvFnDhx5Mj406dP7MzLy+PbOziBmbkZqFQq+Jj7EThcLvTp0/vkvIWLRwqFQo5MJlOVFRZ6ToyMSLeytX64d+++7jExMdSOHTuUi+fOXf7o4cOlPUN7SMeHj7scPWPGhY+fPtpETo1aNWHSpCWTJk1i63bhO3ny2IA9e/aeNhQY1k2aMHHG0GHDjumy2vl8PdDVwTcqMYYflN0/NHZIkoSq/BKvk2dPsuX19d7l5eXCZy9eCAz09IK/5H0ChBAYCASAEeS2bdeuzL1Zs9tjR4YdRHx+DvzcbZPCGAvWr14ZfSEhYRWXy6GHDxMNioyeefGbMoMp3f4XPYOC5qrkyvWDhgzaFTN//rTo6Gju9u3bVQAgWDJv3v3zZ856OzdxruraJeSuilYXfvmc5/oq9WUwEIilp28Idk5OUF1dXYUAP/TzbU1yuex6Do/zk287/xKCwn7WltbZzh4eLxBCJQKBAOZHz2pXUV+5JCszvceXvHyuPl8POgcGvRIOGx7jF+h/Lz4+nlP0/9h777Aokq1//HTPDBlEEDCiIEpGcs455yFnyUFQgoDCAKJiToiLOeuCARUDqy6YdRV1XXPOOWAizsz5/WE3t2V1133f+97v7v1Zz9MPMPRUV1fVyed86sgRInvRoi6CIGDD6tWpuxp3Vba9eSM/bJjy5tTk5FJDC4sbiCg6MWfcuou//cYFAjoNDQz2+3h5LjW1dz4zf86cMT38rsDWU2cGdXV1ub5990703bu3ICYmBkoDB0J3d/cxczPThzaW1kWuvr53ppaXbluxanWArb3diR9+WGZLEISQy+USfT1x/44kWOKvEiyzZj05Prr54oVL9hHxCVMzMzMnU/B7XXfuXNPcuLHOVtjdk9Ld3Q1CoWCb4uCh24qKii4zyrLgwYMHQzdv2OD/5vWLpNevXhLv2zveA0GIdHcLcMQIleehQYFVxhYWRxFRtKJscu6v585PffzoIaioqHa6u3oUGZuZnT3QdMDtTOuZ8eKS4g9sHe2KEhKStjHdRtd++02zdunSyc+fP/ds//BBVohCkJOTh66uLuDz+QCIICElCdpa2pW5RUVVFIQlIGL/zevX6zx78mS4lISEx/1Hj44PUJC9kDW+oJUgiHYejycCAPy7d++KrFmzpnPa5OKSC7/+WuHu4x2YnJWzfXlNzfxVy5Zn83t6wNXdLbN8xozFfD6fBADhmTMnXefNWzD/5rVrmjLSMl3W1lb1nh5ei8xtbH6hBPm/7WCUP7Cw8ODevVpLly07097R/mLnnr06dP0mAEB2Zmr+s2fPZo7PGe9sZmV78OLFi2oFE8Zf5fMFrw8fP67o09nJqgfANStXuq9ZvmzLtcuX2BwREZDuJ8MJDAvnlVVUTrG3txc9dOhQ56TCgrwTx47PVFRQXLp527Y0Ho9HcDjkhtYzrWFl5WWRY8YYbmSsV2Buzvi6169fs7IyM9LDx45d8qVDc/6TrQ8kKZSXl//rzOUvHMXZt9HH1F6+fBm1tLSoapJ/ngD/w7lpAbIFWuB/uU5sOzs7sLe3/2yu/reoZX/BMgdE7J8cG3vrbOtpWTs7u+nefj67Ta3sOiQlJbu31W12X7BgYYmkpCTu+Wm/AUEQd+vq6jghoaHdeVlZ0x6/eFbkHxKkFxIQ8hsAEPjx42DfgIAbb169EB8yZAj/TOs5trOb69k1GzcZdXZ2knV1dQSVGDYiJjLs6tNnT1/Wb62zk5VVugUAsG3bNo/DLUeynz9/NkRUXPy9ubn52eTkxEKCID4wwgLEZ2BTZWVEWd+8KApKtqWl5Ys48CIiInD21CnT1nNnht66fSvtfOu5gZ2dHToPHz4ENosNOjrar7zcPAsjEhPXMiCWCQAQ1m9cl7B21aoVb9+84cfGxY0bm5W9BBB68wHGhoeX3Lp1uyyIy12RlZ+XkpWVJbJQTq6HKC8XdrR1qM6aNbXq5PFj3K6uT/X/YmJiICEm1qOqqrZzqKpqTQiX2zlk+PBHBEHco9ZJpXbJQr9fz50LvXrl2hhRUVFxjojYgyFDht3R1dZdkZ6TtZ0giPftr18rL66unnzwwM+J165dI6xt7TqjE2L9XT08mqh+5EtKihedPnkqvF8/2beurm5ZqRkZ6/h8PiCiXEp07MrTp074PX7yCMTExIAgSVDX0gALG+v15ZUzonsPxursVK9ZUSv/+vlzCRkZGYGppWWPubn1cYIghBwOB+bMmDZv1apVOSNHqfHTMzPdHR1dD9Jrxzy3/T+xx/+VHEJBvNrZ2bG5XC6L0pZhy6a6NKMxY9DbybnzzNHjkX9ALHLT500fQWVFipAkCQ11dcFZmeltcbFRLxPHxl/Pzx1/Z1xG2pVAf98LjtY2H+3MzTHAywunl5dXUKABcPaXX0zyc3NWGY/RQ0NdXeT6+KCxlg4GuXu+oUpawN3dXRQA4NqFC6pTSkp2ebm5ooO9NUaEc++XlxTntBw86PnhzTN9RFQ9dPCg7dyZM10L83NrMpJTcPLEifsQUTwrK0v0LzIDkYiAgIceNrYdiDh07tTpG010dNHLyQlX1NQkU6APpIioKCyYOzvL19MTrS0scFxGRv2Z48cNmYoSl8tl/V+vKf2MGWVl4YbaWsgrLqRLsNizZs2S5AGQS5YsTHGytcSUuOi9a2pqDEoK8tc5WVtj8cTCH0iS7BVobDYbgn08H6kOVkSVgQO6Rw0bLCzOzzvDXIvahdUlthYWQhsL090s9qfXm5CVfirYz+cxm80BIyMjDs/Ojk3fX1VRNsVQQ12QGT/2OCKK/ifm5Hv79/GLOopf9L1o/tH3qqurYzGZ2/+rcQMAtLYeV3O0scGY0NDzMjIyv7tvzqxZmTFREVhXtyn0k9EzRxwAyHOnT5sG+/sJZk2f9gO99xGRxQ0K2KKqpCiUFxfvsbM0wxW1tWbwCWOCxeVyWYhIZqWmrrGztBCuWV4bTfOTSh5voYOlJVoZG6OjtTWqDBmK+lo6WJiXdwQR+yEigX9ikP1RhQhzTfpY/ICIEls2b3abNa3yh9CAgF8tjIzRwdIKU+LiztWtXTsWEaVpgx8AoP7HjQmebs44RlcbF86fO43KXGfxeDyyaft2HxdbWwz297tIfQ7wqRy4NyG75cABm8ryEq+MjBSXTWvXWiLiiL5jbtm/36CsqGC3t7MjmurqoNmYMehiZ4uujvad3u6u6OPqim62dhjq4/uiZs6cfAp1EE62tNiEBgdcV5Lrj/ERka+e3btn3fb4sXHG2LHnNFVVMT466kFn51t16r05S6ur44L8fG+5OTqgn6fntfio8KOR3ICjwb5eL0cOH4wGeho4uThvCiKSNL/6oieEzYY506bVjNHURE8Xl+4tGzYE0Uby31Ir5/F4JCKyZ06fvt18jD76Ortg6cSJWcebm9UQcXBnZ+eopl1NOrwSXnF6ZhpOKim+Rscvm/bscU2IjOxKSUjYiYjSjONAJZ89ezbww/PnXjs318VHBgRe8HZxwfDg4Mfz584tpJ//47p1CWFBQW8VpGVQQVKqpzQv/xkispKTkzkAAAf3/OQZxQ09a2VigmNjY37btGlNNFU/Tj+H09raOphWFAAAdm7f7h8fGYFlEwuW0O6PZh6PzeVyWcuWLdNbtuwH9wsXLmhQxCTV1tY2ctq0aWrz58/Pzh+f85u/u7tg28aNUQumV2030dJGro/v6xOHDgUxntl/8uSi1WYmxujv6dO9ZVNdhJiYWK+A/U8uNC0g88eP99RRV8NgP693xw43B4uLi/eu77Vr11QTY6Pum+nroqXBGDTT08Ps1NQrHz58GEgpZiSV3ELkZWeuHj18EA6Rl+5RkpFAPzfXp4ioRJ9S1traauxsb9+joz4aK0tKqhu31rkHebi/DA30u0qBipCISNTV1YlkZWWJnjx6yM/GxAi97O34v/3yi+XflhC+t/+aRu+vfbt3Rzja2ggykpK2ioqJQW1tLae5uZnd3NzM5vF4bEQUz8xIu5eZnvwLzc/gE2Z9f66fX/eUyZN/BgAYz+WKAwDkjh+3ynD0aFRRUhRGhXMP07yTft6x5mYdT2cn9HZxuouILERkLZ43b6qJrh6a6Op+rJ4za9yehq0BeVnjDo8aNgytTU1x0fy5sYwwxL/t/Wkh35fXb9m8xTMnI2urn4cn+rq6Ymx42LVVS5dmIGJ/+r76bfUJPt6e/DFamlhRWrqHFt5sFgvGj8tcaGZkgPHRkQfPnDzpICIi8lW58lPjT5o1tTVBlOEoxuPxyO1b6kJDA3w/agwfhiY62sKC7OwzyxYtij/S0hL4sa3N5PHj+7YHf9obOGXSpJkhPr4dbva2WJg//hy+f68EAHDz/mUdX2+PtwPl+mEcNxjDfX1RS1UViyfkXr509uwoAID2V6+GZaem/mxlYoL+np64e+f2xDcvXtifOXJEGREHIaLElNJJa1SHDewJ9HL7SPfd3NzMpvi3eHX1XO1du3bpIKJGeUlJlY6aOjpa2wo2rl4XTucV/J1pgAD4lAW6YeXK9MgQ7hNPF2eM4AZjfFTUq7TExE5vN3eMi4pCXnnJ/J9aftKkBVtcRMRtByurbkSUozXGZctqC8NCuK+d7GzQ3d4eJ+fmbUZE2Zr5C4s9XVzQ0dYa586cyaMf3vX+vXbB+PHHvVxcsLKkZDlNXIg4KD465qmJvgHWzJu3nKEVEiSLBdXVC1PGZWW+SU4ai7HR0bh9yxZ/us/CCeO3cv39BHfv3tUC+IRJDQBQXFxY5O7mhAF+XvyYsLDrKYkJr7Iy05EbHIihIcGYOjbhwW/nztkvnj17ta2xCQb7+rZ+bGszpvu9dOnSqLGxMVfNjAwweezYqy+fvDSjGcH/C0GFyCMBgLh06eyokADfD4MG9EdvN2dMjI1pqV2yJJO2Vi5ePKs1Z+a0ucV5E+5MLyurvXXxojLTmrGzs2MDj0dyg/zDNUcqCwI8Xdq9XBw/6qmPxvmzZi0FAFBTUxMFAJiQnbVBU20kjhqujIY6mqg1cgSWFRfup9bts42+c1t9qomOFtoaGeK6Zcvsvwv07+0/ZaE3791vb6I/BqO43MdMgcWk1ZqaRb4Bvt5YMrGgCRFFOBwOLF6waEIENxiXLFgQDACQtSBLFBGJWTOmrdNTVUUTbU0sKcqvpBk7LTi9vLxMdUepCZIiw2/Q3sywwIBODRVV/KG6ejJD2CkE+fjcHT54EL8gd3z1p2oKIP9v+AMS1Lv20hybzYY3b94Yzpw2bbaft+d7dydHTIqPvb5z+/ZoWqtp/eUXH66//wM9LU2Mi4r8GRGVqf76Tcwdv9nc2AgdrK0wKzlp98ZVS1MXVFUNXb98+fBVS6ojZ5eXr4vw870eFxGBM2fNXM/wcnAiuEEtykoD0NvJ8UFTQ0OYiOhXDONPIRPN2dOn1np7uGJmevKlV68eDgMAmFM1baqRrhYOkBDvGqGoIJxcNPE07QloPXXUIi4y4rSGqipGc0NuYDfaVJWWlXs7OaOptg4GergLirIzZ71+9Mja0mDMewP1UcK506c4MpQq4nX7a+XMrAyBq7MjJkRFoYOFJQb5+H1ct2JFyL9b+fo/tdRpwY6IUkuqq1PioyOr3B0c2mTFxdHe3JzfuGXL2D7fGcINCEATPb2PZ44etUHEYTmZmVsc7W3R0921I3fcuJrQgIALhlpamDsus4lkseDc6dP23m5uL53tbHHHli1pDOHNunrxovu5c+dkaVdRVnr6QQtjU5xRWVkj+mnhiQULFogCAMysqsyJCg/B8JDg5pJJRYWhwYFvuUGBzy/8ckEVAGDdimUl/l6eWP/jxnEAAHv27BEFALh69apGgJ/3K0kRliDY3w8T4+N/8PBwzS0uLpy0efNmZ0SUHpeW2mBvYYFxkeGHELEf/b6HfvrZzdvV9bG9hQVOLsjf9u7dCw0AgNra2v+n2hrNUCp5vLk66qOE/SREu/29Pbs2blzrAgBQy9Am2ezP9iLJ4/HYzc3NbNoCz0hJPGRtboRbNm1IPty839vK1Jhvb2XVsX3LZk+AT/Wtb968GZGTnn7c1EAfjcfoYmRI0JXGLVuGAwCwOWxARNlNa9Zo/tTYOCkrcezLARLiPQFuLtiyf6/Fd4H+vf2neBkiDkiMi/2opqyMhdk5Z+vW1Wkh4gCmJUuSJPBKJpVFhHAxjBt808fLc7OPpzumJSUeR0RJKkwpAgCQGBddqz50CDqYm+LenQ35AAC05w8AYNXSpeZOVpZob2b8ABEVlyyYU6qlpipMiI6+g4jS3E+WPktGRgZ83d3P6Gtr4ZSSkkogCPhPhaIo2iMZczWwnFdSY2tlgbYW5jitvHw27eK+ceO3YbERES1GY/QwnBv84MypY94An+L0C+bMKvJxcXptY2KIjpZmaD5GF421NNFcVwf1VFXR1tAAZ1VWbEREEVoANjU2Grk7OqLWiBHCuZUVvecr4/v3SpcvXx6EiOIM67d3PrZu3WweFhrIz88fv5/D4cDdy5cHhfr7PVeUkcHwAP97dNjgwYMHQ8elpV5RHTIEY0NDLyKiakFG1lxzXT20GKOPkQGBT60MDdFcTw/dbKxx5OBBaD5GF1cvr/EFAKhjhKCnTikvMNDWRhcbm6cl+fkV92/e1PlH8i7mxiJIEuo2bMh3trFBRwuLOur/IrRLBxHJ3PHZ6y1MjNDH1RV9nF3RwtAA42OjL7S1tamx2WxARK1Ab2++oZ7uu2fPnkkBABzYudPQ3sLyTaC3z/u2Z89GUs/sPTsZEcnF8+dPcXNyQt7kySsRkQUALFpwbqv/MdXOyhyjQoMfUwhU0Pn27eiM9NTzsTHRT1OTk6d5u7ncDQ0M6Pi5qcmMGWsCACgrLeS5O9lj/aYN0yjtGAAArvz6q25IYMAZawtznFw0sQkRpeATCh6sX792vJuTI9paWvA3rlgRTGNW1/0NYsL0JmvZv1/XwdoSTQ10sWbRgkRKmxQBAOBR8bWy0sn5Lvb2s9avWpUq2kc7Xr9qlZWxvt7bqPCQm7QiM6moYPdoVRV0tLH+uG7F0nD6Xg6HA6tXrEhbvWxZEc0ka2trB0SEBG+MjQxHO0sLNBszBlUGKqK++iisLC5ai4jE9xj69/afoglEJA7s2eMTFRIqUBk4CK2MTXoiuSGvsjLSJiGiGCISycnJHBaLBRtWrHCOi4msjouNvpuSNLb6zZs3srS1T/E6qbDAwPODZPsJnS0t8Ke9u1MBgGj+5Lqnw5YK6Ynxv5rqamGwjxfamhsjN8BPsH3zZjeGACWP7D+YYGNm2uXm6PCqualJh/78P6z09PJDNpsN69eurbAwNkbtkaOwYFzOZkRUpO6TqSiZvNbEQB+D/Hxx55YtEYw+lOZUTcuxMDGa6OJoO93f061jkJysQGf0SOHieXNKaWON5k8db56ocP38Xg2QkuJzfXzera6pqcyMG7vE38293c3evjsmNPTs6tplaQRBADWfvcrUzKqpSdER4Vi/aZMfAMCEceMK46Mi31XPm5dCjYVTUlK8YYTyUPT38urAzk6NhTPm2rhZ26CBptb9/Y2NXogo1tjQ4DUhM3O1o431e43RIz+MjY85dvLkSRnqeQS1liKIKML19W3JSEzcyaKMoH8s70JEYtWqVWIAwDp06KCrlbFRp4eT3Rmq3g/g84NgJKdVVpQ729vWcH39d0/IzOS9f/9UiTYIsb1dOT4qUqA+Su0VIorSi7tg1rwyOwsrnFpWtoogCLCzs2M3NzezqUkVDfEPeOPt7iZExMH0pqDjFjXVC7fpaYwSVEwqPM3hcAAARGiPwcSCvEu+vt4YFx3xrI6yUOnxNjfz2Dwejzx56JBjQnQkzqisTAUKYW/T2rVjQwL80dTQAKdOnVIpJS0FtJZYWVk5ycXZAX29vV437dkVwLBuyb/LelEbUjQrNalZT3MUzpxavllMTBTgU0ILm1I8iNUrly+IDOGihYkRhnMDD9Zt2pC5v2n3hMkT86cbjdFtNzE0xNkzZ5bTmvK1a+eGpCcl/qYybDCaG+njogWzs+j37zuGxsbGgQW5E14H+/mujg+PnOVsZf1uYP9+guiQoNuIOIjpDv3evrf/lHGyo77e29bYpF2pnyy/n5g4pqck4evXr3UZgpTJz9gEpeQjItFrRPz4Y4iTjTX2E+G8tzExEsyZPrUMAGDOnDniNP0BABw4sEMpLytjdlRYyLmUhNhlR/bvt0dEonHn9uiJueNLM9PSTliZmgjtLMxxaU11/v9rQUGNm/VJoV+T6uPq0aavroU56ZkXHt66NRrgEw7+quVLIz1cnPne7m64pLr6d0nTBEnCT3t3Z5sYjcH05LGXpKSkmN4SsLOzYxMEAeUlJT8aj9FDWSlJdLSyQg9bOzTU0Oyx0B3Trac2Cn2cXXDdsmWJ9LwweVtkCJdfmJe3nbFW0iRJAiUzZOLiYt5raWngD4sXTQAAsLe0DNIeqdYzLj1tP1MOUF7EgXV1dQq0YcbIoaD/5nD9/fePjYl+gYgStMD/xxMFm82BqDDudeMx2lg1pWwNIsojIotOumIuqLS0NFCaL8nhcIDFYsGWzRuCbCzMMDlp7DlEZAOV/Y2IZERo2A0fT8+e1hMnNJmu6zOHjhv6ubvhhMzMLYjYm9xBu0PWrFw+V2/USIwOCvjw/P59Ow6HRvX65A66c+ecLCNxjmBo7SIAAGuWLvUO8PIQVlaU5YuJiUHN/PlVtmZmaKijg/Nmzcin3NIcAIAJ2VmTHGxtMDoy7NnZs2dNmFbv35F5/XrypLmfpxuaGuhibfWCDRKSvfmDvYS7d+dOQ2cbm2uqQweh0RgddHOyQ3tLU7QxN8PJxZP3IuIAROxN9kFExSm8yfvGaGugg40Frly2xAUAYMGCBaK1tbUc5kZHRFHarb96yZI8RxtLjI7grqGJ+ruY+d7+g43g8Xgkh8OB8ICA5yOUlDAqhPt8y6YNyYj4mULeN84MACw7u0/KPiL2Dw8KuqasoIimuto4cshAjAwJauljVRPMvz9V6hDAZnMgIznxtZ6WBhroauFQJUUcpTICK3m89dQY2PA/zHD/v+Af1y9dMsgdN77JwdoGE2KjH9KJZgAAZ3857jw2NuaSp4szVvJ44ygPH8kdzxUHAPa8efNk7e2tMTw8pJr2fjAVo7o6Lqu9vX14ZUV5c0ri2GfJCQmLVv3wQ1ZzY+PAnRt2Dlg8a061sZa2MCk65jzllWWGgYlgf7/X0WHhNxFRml47ety//HLczsbGCkNCgq9RrntySXW1n7OdHXq4ON65f/+WCSKSlAz6UogGKI+yTMeLN/aVpaVbA7w9MW9CThVtcP43xKJIRCROnGhxSU8Z+9jawhijQ7hPJ6Sl38nPyb69bt06e2rhJLhcLmtSUWFVUIA/xsZE3qsoKVk/MW/C4oToKExLSbrd1NTkSC8APTmLFixKtLOxxfy8/NWISMTGxooBAKz5Yek0PxcnXDB75myAf8WA6UV89fDhsHBfn1fDFeQwxMerffqU0t1TK8rmZaanltQsWpDRS6SfYiIkJcxIAACZfv0gJS6m0d3BDm9cueI2b9bMZUba2mhrYorTKyqiqK+KstlsSI2PL7EzN8eU+PidHW1takyl4+/YeDwemyAI2LV9a463mxMa6GjhuLS0HWfOnLQRERUFFosFJIsF/WRkIC0u9uQwBXm+jbmJMDzQb+P86dOWnmg+Ys3IWiWYc87hcKB2SXWmhYmBICYy9DoiStAuqr7jyMrKElVTUxO91Nrq5OfpJpxUlN/wSdP+LtC/t/+sQKf4mESgh+d7byfHB3fuXDL4mperrq6OVVFWmr1161Zf2kC4du3amNioyONaqiMxKij48cLZM1YmRoVf8LC3weK8vK1XL/3qh4hq9BnmPB6PZDB/FiKKF0/MrQkN8GlXHz4EhwyQ7fFyc71ECRbi72T10eMWFRWFjWvXjne2t2sP9PF52Xr8uDtjnmSL8ibsCfb3w4LcCWvoZEMul8t6+fL+EFdHJ/RydXtBh+y+JAhFREQBERV+twadnRqhgYEdLnZ2V+kEaEaOFeHs4Pg8PiK6h06AY3ptSydPmufm7ISLFszNo40uRBSfXFy03t3RDkN9vXFcctLtzKSUByuX1OYRJAmMEkvi3r17gwtz805FBHEfu9rY813t7XFcRtphRJT7r7HO+2x4xTlzqqqNdHVQmsNBBxtr3FpXFwkAsCDrUxZobW1tUEFe7s96Wpo4bOBAtLe2wsqKslmMDFOCTjwwMjLiIKKcv5fPCzcn5yskSQIdL2ncujXL380Vs9NS59Ku377a1KFdu0zjQkLuDlcYgMpKCuhkY4XZWekv5s2bNYNy03y2kVgsFty6dUuvKDe/IcjXB2urF9bOq6raO1plBNpbWXXPraoKJggChg8fLiYiKgopsbFVrvb2mJGcvJ52H/1DEiJIAIBDBw9aRoWHXba1skJbG2tMiI65NK2sonHR7Nl7J6Sn31JTHop+nm7Y1LgjimSxvqix9vmbBQCQmZK4wcnOBnfs2KFNEw7D0iGam5vZXC0tEQCAuTNnTvPxdMMlSxbHfJq/7/Hz7+0/L9B5PJ6Im6MjzpwydTHAp3OtvyL4+wX6eKODjRXOnFa5aVp5+Vxfb892PV1tTIyPvYAdHWrUfTLTy0q32pmbo5ONNXq6Ob/Mzkz/6fr16wq0kP4dDbW3D59aWrTT3EAPnWxt6dNj/nb0wDCAoKmp0cjFwf6jq6NDZ+OOHWMZnghW9cL503w9PTE6IuLi5QsX7AA+lX0V5+evtDAyxozk5LWIqMZisQARxeo3b+aurls9hJoXEgBg6+bNOosXzSlq2b/HgJrX4SGBAZ3jMtLOUkvS6yU8f+aMm72FZU8kN6QTEUfT/Jiaa7Ho0NDrvl6eXYg4mE70pY3Spq1bHXOSEg+ZUrIr2McbL50/b0Z5cMR4PB4bP+LgKG7oXSUZWdRT1+ieP3t2MY2H8l8nzOlJJUkSSooLN6mpDBNGR4RdRUSmu5UAABATE4NppaXNo0cMx3Hp6c1UfTZBlY39bgPnZWXt9vVwb7/Q2qpHC4bbt2+ru9nb94yNiTlGuU8IpluKdrMg4tCYoODHowcN6U6Ljf2ROpTjszFv2bRpbFxk5Fk3O/tTgZ5eGBsRgY07doQvnDWrWmu4Cnq5uHQtW/ZDIPU1DovFgpSomJkullbImzS5kUq6I/5J2Y2M+elfu2zZ+IiQ0EsullaoN3IU6qiNwuGDBqKnmysuXbIkCeBT5npycjKH1la/1CdFIOThn35ycnNy4CclJGylFR0Gc/pEhSwWtPz0U6CVpXlHWGjIc0Qc8F+p5X5v/xQLnR0XFyecPLm4hqqJFvkSzSAiq3DCuB80RygLRw8dgtoqI9DB0lI4e+b0Whrngv4uIpILZ81aZqCpjtIiLKGTjSXOrar0YtIfQ0jS3xHJTEk/627v9OH08eOmf1cjgUpeFQEA+Gn3riQvFxe0MjHBuvXrK6iYMxsAoLK83MPDxVkY5OuDa1asyBEVEQFEHJSfk33NzdEBvd1cuoO9PE+H+Ple8XB2xOlTKk4QBAFZlAG4f+9er0B3Z/R1tu9YPGfW2MIJ2dsS4qI61q5d6UiHSyhjjpw/s6rAbMwYTIyOuYGIsgyeBC1799q4OzpgTlbGm36ysn09DiwAAHEJCVi/ZsUidyd7HDFEqWdKafGOvjX0a1esGGduaNgzLj1tz9eMm/+aRjP0i2fPajnZWgu5QQE3JT/FZwke71OyGVWWAVMmFe0J9fd5j52doz8zHT9lzZt6erq6pycm+h1vadFt3LLF2dPFGQsKclcxJlHGz8OjK8jHBxFxCI/H+10CGu36Xl29ZLyDmbkwJyVlK0VM4lwul1VbW8vh8XjktvofQyyNjdDGxARL8vP3I+LQubNmpBrq6mBcRETnwb17e4U5IopGBgVNszY2xtysrC20ZfpPXFTmfCGi5N7t292mlfIacsdl/jx7ZlVzQ0NDAO39oMGAvoXQWSw2FBdNbLKztcLkxLHbDzY12dIuMElJSTh3+rRpTlbWTHsbK/Tx9sRt9T+G/IO8G9/bf1mzs7Njs9lsSEpKqo2Pi3lJW120AktftNWem5GWbKKjxR8m11+YER/3/uCePZ59aYq2MkmShMWzZ88019fD0SrK/BnTKxLhKwiRtJeRGxAQEBYQhMtra32pPv+uYSgiOTmZw2azYduPP85wtbdHOwsLnD9n1hw2mw1crrk4AEBjQ4NzsL9fp4WxEc6fPftHRJRBxH4b1q0rjgrhXnAwM0FFWWnUGqXSPa2iooQGvKHnsjg7a4P+6JGopTocvdyccc6cmUEMpYjg8XikmJgYJMbGntdWU8PykpKZAJ+qdihwIHZZUcHBEYOV+A7WVh1FE3Mn83iTLB8/fqz5pZdaPG/2XEMdDTTQ0cT8nOzlSUlJlscPH7aqW7fO18PJ6bGLvT2uXbnSh8uoqvqvbXQyW3Z62gZHW2ucM21akYSERF+m3y/Ex+uxq53N62kVpVMMdTWM0pMTbKsqKza6OtgdCA8KwrCQYPTz9sQgP1/ctHb1kgBvr3Mebi4dj18+1oJPZWvsismTG9wdHXHzhjVuTC23j/ZNIKK0q4M939HSUvDg2m2zLwghqYToKP7k/PxqOTk5yMvOnuru5IixkeE/P3z40IBxn8SEtPRNlkZGmJ6SuOXD8+eD4G+Uyf6/0LRZf+ae/yv9UeujlJs7/qiJoQG62Nuhv7d3p4Wx8RFnO7tf/b290MHGGoODAq43Ne0JYLPZ3zPbv7f/lzRAAgAcPHhweERISNfYuJgtX0qMou6VDfTxOqs6bBCmJ4493fb4hREtjL8ShmIjIlk2qWibjvpILMqf0AAAkGxk9DtBUJuczKmtreW4Ozpy0xKTzrTdu9f/H+K1IgAADuzb5xASGPjAzckByydNmstisYA24C6cPe0SHR7+SnOUGuaOy7rc1tZGg4yJNO3YMTYk0PeBjroaLpw3p5r25lF4IiQiqtuZGL8bo62BixbNXyEiItJrrNEW+PatdSmGujro4+YmRMQhnxl0K5alOVmaoVI/aTTW08LQQD8M8vVCPy8PTIyJ3jujsjLV38vLKCQgwMTd1tYAEUeW5OVuN9TWRF31UWhpYoJBfn7oZGODxvpjcHJhwUFE7PffGjcn+rhgaYYuFhsWvsvbzQ0zU1N+mTlt2oTCCRO8y0tK1gd6e10cOVgJ9TXUMNjPC4P8vdDSxBBVhg5CQ10tzEgeu/TapUu2K5ct80yIjl7p5+WJNQvmn7O1NMeJ+XnLKWuRQGxXzs0e9yAxLvbp/v27demNwJxkOoayevnSiiAfbwzx83tfVVERuLehQR0RR129cEGjuKBgoa+Hh/DQ/v2hsRERh33d3XHm1KmLGahzgIjD8tMyjliPMcDczMwddHnef4sgQkSijstlcT8dFPNFWMj/gRuTrK5eED02JuYX0zEG1410dR+6OzvdT09OOrho/pwIRvjju5v9e/s78DHYvHatT2RoSE9CdNTN0sLCyMP7949GxIGIqHKgqcknPTnpVyszY0wdG99Ag5X8kQX9r/rqNyqeLk4vnO1sPl48f94R4FNiKC0UmH3w8vIG8ng8uX8SbTCy1VUm5k742dXOHotz8+ewWKzeMx663r/Xi4+OejB88CCMi4y48vDhjWH098+dOeng4+763tbSomvDujWFYmKfKqQ4HA4sq67JDfL2xqkVZdsQUYRSkghGhc3giNCQZ2ZGBrjshx8WIyKLgu79VKce6PfbMPn+Qj8Xp0eLZkzPPnPskFdKfExAWmL8Bm9XJ9QaOQJ1NTRwtIoqOlqao5+bCy6cOXP+vGnTwl3tbUJz0tNLsjLS5kZwg/KmVVR4U9n18F8dHuxTlkQzdJEZ0yqnR4RwXzra2r50trF56unsjCMGDUQjLY2exfNmb7hz47JFy4F9DqVFBTs1R6mip7PjB2rRAABATFwcUsYm3CzMzb2cFBv7k6WpCRZOmMCl/3/kyH5Vfx/vV76+3q/Pnj3rSbuGCYKgMxTZtNDdsmlTXHRo6K2I4CCMDArGSC63I8TfH7XV1FB50EB0tLHuMR6jh8UFeRs5HBEYPny4GMCnE3bys7LuWI3Rx4qi4v0UmMx/HOjhn9SYig6HwwE6qY4kSaBwAYDhNvvevre/hXcRAODk4cNaE/Nyd0eGhnzIzkjHuKhIYWhQoMDR1gZdHe2xMDd3Hc3UvyVMRPebk5Hx81AFBUxNiH91+fIFl7733blzR2NSUeGK+fNnjPon0gZDwLKzUtN+8HPzxNxx4+ZQ5cufEtC6unSS4uPuDB8yGKMjwm/+2tpqKy4uDiwWC2Ijw4/Jy0ijhYkxjs/Kal68eGFNdETkXhszMyyfXHxQTFwMgDoEhvEsueKC/PNao9SweGJ+Ew2Gw+N9iu9XTZs2XVdjNLpYmOOe+h+jmONlsViwetmSItMxuthfWgaD/f1xzsxpc4N9PA47W1vigtnTM2iexQQX+68W5lTNOftrQh3gU903LfzOnzrl7WhlIchJSzlJa2HU/Zz0tOSDxRMLbtMCkwIEkMsel3U3KT7uOCLKhwcGPrQ1NcXlNdXRdC3z9u1b4hzs7fiuzi5YNa2qmnkIS9/GZrNh1/Z6m5zk1EoDdQ0cKiffExkc/MzZzrZNbYQyqo9UEc6pqlpB339w374xYUFBDwy0tTAlLm4e/R7fXcTfpuQxEP4+u3g8O/b3BLjv7e+qiFK8R6m0dFJ8SKD/1OyM9GfZGWkHVixdEkLznW/lATQNrFm61NvHxRXlpaQw0Nu7s2bBgkUXzpzRQMRBK5cvneDn5fkhNjIC9+5tdKbR5/5p80cJWgIRWWmJyQucbG1wfGZmPRMn/96tW9ZpSYkdgxUV0MfDDbNSk7dHh3G3B/h4opWZ6YfQ4MBnhfm5b0uKi95zAwI/GOnoYGhAwJNXr14N6+MBHFheWnJq5HBlDAsO6rhy5YpR33VJjI29NGygImqqKAunl5Y0HW056Fm3Zo3yqebmgXSSY2lh4c/JCWOv7Nmzy5Pqd5Cbox0/yNerm0LDo8uoWVRM/r+Ob9ETKp6Zlv6ysGDiaQbCW1+hTm9KkiRJSE9OnOxgbY7Ll1QnAYW7zsyQpxNSjra02EyvqFgdFxuNsTFRLzZvXmcOALBtw6YZuqoje/Q1NXHixLztNPzi7t27dYMDgu66Ojrh1LLyc4jIWrtiRfym9evHUvXQkogoc/nUKfll8xfFxoaE1GqPUEVPO4f7iCj+9OlTpdkzps8zNzURONnZvmvataukds68qXamZp2OllaYlpy8gLL+v2dif2/f23+/UP8dKhgDBrlvmPGbrf8FVTPzAt09cIicPKoPH47mBoboaG3NNzc2QjdHB5xTVTX2n+65osOw4uISkJORUWOsPwZTExN/bT150oi+5/SJEy4RoSEv+0mK81WVB2OQnzcumjdn7vHmZjWOCAcQUZa6xI8dOODv5+bWmZ2efAkRRyKi9MOHt9Uz05Iu6WqoYVhQwLttdXV2AJ9wRRCRbGtrU0VEkWWLFwcWjh9/08nKAq1NjNDdxQltbawwNSUJjxw8qE2Nl8XwtpIvr7+UcXOy7zEco4N7D+7V/qsGHJ15/0+SE7RA7+/k4NhuamSMO3bscAf4+pFxXC6XxWKxICsleYGjrbVwzfLlFkwtlFl7iIjDE6Ki3lsYG2FqSnJTQ0ODFvW5bExYWKupji46WlvjxIn5969cuSLN2EhDFs6dXzl7+swMRJQqzMt9EejjjQkx0RgfFYmhQYHo6+GB4QGBGBsahh629t3O5lY4taRkJe1SWbd6ua+zrQ2a6eujrZEJ+ru4tu/ZVp/AYrHAjordfGd539v39v8PDxMV22YxmPX/OOOcFgr7du70L80v2BITEvre08mpMzostLNgfM7moy0HHP5bvH80P5eQkIDSScUbTAz10dfD/cXeXbt86XsmT5yYr6upjr4+7vfaXrwwob4nMnNa5aSQAP/nni7Ob5Pi4q6tX71ifEJUxOvBCnIYHcb9MHnihLuujrZdtpamOLkw98ijuzcMqXkTAwBYsmRJnL+/z4e0pMTfEFGWJEk41NTkOHH8+LKYqIjFiYmJm3JycmbX1tYOYPJzCmiG2Fq30cvCzEigp6sp3LFjq/l/y5r8qcaJiER+zoR16ioq/DBf/zN0ktOX3BJIWeEnDx11DQ0MxDkzq5YB9CaGsKlLBABg1bJVpdqjRmF8eOhtOvlsSfWC4KTEhDv+fj44rbKy5uaVm0YyMjIgJiYGLBYL6LPGmW3T2rWWC+fOnlc0MX9RCJdbE8Ll7spKy1i1vLY2GhEVn966pZuXnrXPzcYWC8flrEFEcRZJwryp01erDBzID/D2bnv++LHtP11j/t6+t+/t32PE/JusfxpCdAAVshzwV934/yShjoic4uLC+WN0ddDe2hKr58xauPPHH8cHebg/c7C2wt27d4dS90tOLSs75GhthU621ujj4YoWJoYYEhiA9tZWaKqvjzZmZujt6oIx4aFYW1tTRecyUPyZBQBEOW9SpaGuFioPUsSJ48dd2tuw1Ysek7i4OEj+C+r6s/XlUXX1O7ZsnmtjaoyWRkbtB/fuVf/WdaFlXkNDg9a8WbPGvXjxQpr5+d/dLcUGAGjY2uDlbGODGsOUcUJaejPz6EH8/SQQIiKikBQbdzrIz7cNEbU/65OCANywZo2nr4e7wMJoDOaOy7yWlphwJyM1BSsreJsPnzisR01Sv9zscdUhAf7Pnezt3nL9/drGpafVNjY02LLZbOCIiPyOBr90ri4iSiXFxn4w09fHxfPnFwAAefvSJTM3Bwf0cXdvJkkSjD6VmHy3zL+37+17+1+3vqFJmjf+N+IwMD2v1QvnF7s7O6KRjiY6W1ui+rAhmBoXs5fF+lS2urWuLizEzw/HRkev6eh4o/Lkzp0Rm9cu11lRW2u3esUKj80bNrjt27VrDCJK08eoslgs4HA4QBAEsNhsIAgCCIKEKSWTKgN9vN6aG+mjtakx2lta3k+MiXkaGxHxyN7a6lVMdGT7/v37TQD+BT1LKVkDK0uK9g5XVOCH+gV0I6LctwhlgjreVkREFMbGxrSG+Pvh+hUrPBjr/ffVMpn9cTgcjOaGHDnY9JOluIQ4aWFj/dTVy6sqLCJiBUEQH3g8HlleXi6klYDy8nL+9s2bgxYtXrSlv5zcvZJJJSXv29vbXr58yQoIDm6ws7NjHzp0iN9yYJ/Lpk2bxz19+nSwiurI1soSHk9KUfEJAAB2dKikjRt3+Nfz54YqDVS6P2jQ4Asf3n/oJxQKbLq6OuHDh4/PJMTFesTExTrk5eSJ/vLyIC4m+uzt27aTJ0/9cu7Dhw6+kb4+aulqwf27D/TOtJ6Z9OjhQ9DS0q7ZuXdvBiL25wb4P2zvaD+2p2m/m52dHevQoUP876zoe/vevrd/s7CjBQL+N78nQRAkAAjO/vKL5dy5s9Y27dkzRGWEimhmZnpWTHJ6DUEQmJ+d/fPZ1lb73NzcdA9//x++1t+BXbtsNmza1A9YLPX+A/qPvXfnvvzrtjZks0kU5YgQGuoax2bNmxcF0C6/atnajJ+amrLOnDwt+eHDR1AYqATaOtp3LKys9/o6BExa3bD6Q3l5OX/mjMqVO7Y3mAv5wn78np7BYuIS4O8fsHTCxIkZISEhWF9fL/gTA1ekvLy8u3H79riKKRXLJSWl3tYsXeymqal3BhFJgiCEf3uBnpyczFm6dCk/Lysr9cShIzV379/r6OjqEh85ehRYWVu1JiUlZ2jr65+iFhQBgOByuWRdXZ1IZVnJ1p8PHPCQ6dcPBEIh8Pl8sLKynl5SPqVYTU1N9ObNm10EQQCbw4Huri7ZeTOmj3//sWMPb8qU01XlU2bu+2lfrpOLy/zJPF45QRBtIqKi0NXZObCitDT4xo3rwc+fPxuqNFBh5Mvnz+HRo0fw9u07YLHYoKqqCuqjR8ON6zfgQ0cHDB46FLS0tRuEfL6iQAi7RMTEZpaVlfXz9HB7NEx5WOvSpStsaCXjOwv63r637+17+581mo9iZ+fowKCAy7du3WTlTchXjUlOvgMAEBka0nLi2HE7NbWRoDhQ4cGwocOaPrS37ycE8OHDx/eKI4aNiGx7/Vrx8pUreh1dnSApIw1sURGBqKjoUT1dvZeiYmI33755Y3z9+jV75eHDf1u0pNagu6sLPrx5Y1A1pfKHH3/80VRPX//dlsZdQwmCeA+fSun4jQ0NztMqK/a9evGCNVpDExSVlH52c3c7wA2PXEgQRDsiflXh4vF4ZEtLOXnoEPARcVhECPfY0aNHh0aERxyeOW+ePZVsJ/xHLBCNxLN948ZcDxs7VBs0GOPDw9HZ1gaHKSpifGRk58Vz50wpQf5ZMT4iitRvWMvNy8na7eZkf2qMtjraWZrihlUrJrHYLMp1QsCaVcujg/x921zsbXFcZloUIhLhQSFXo8PCn9OZifUbN4YX5uceLSudFMpmc2itULz7Y5vRzm11FlN5JZPDgwPfqqso4+zpFXtvXrlgVDm5uNzX0/1pWCgX09KS7qxdvWoFffrP5s0bIgP8fbGysiIB4Hv8/Hv73r637+3f0Xg8nghJkpCTkbHKzspCUMXjKdP/i4uMOOPp7NKxoramJCU+9mcPZ4dXxvq66OnkhDFhYWhlaITD5Aegm41td2lB4bp5s2aZIX46DKePR0AmyN/3TVJsbAPjRDaJkry8HbamZpiblTUDEUlRUVF4/eyZtbe72zUnS0ucO23auiutrcZ98du/1phy4dDP+73CAwPvD5STQzcnR9y3e3cQwD8MzpoW6Ns2bMh2tbLGIE+vE/du33b9adcuz+TY2BY1ZWVMiIr6RVRU9Ks16gCf8L1X/FCT7GBt8dbK1Ajjo8MbFy+YuyAteexBYwM91NPWwBnTKn+6f/++HCIOiOBy+THhEQ8QUeJwc3Own5cnqgwbio421sibVNR4/fp1mb5jff/qlXawr+eLlITYw/Rnbc/a1Ly83D19fDz9jh8/Lk6NTY0bGHCTG+j3EhEHAoUV/J0Uv7fv7Xv73v7XAp0EANi2adPIQB8frCgrLQfKc1y7eNHUiKAgLCsqGo+IyjUL5+UH+HjilEmT5u/cvt2pori4JDEqGnf8WB/O7PPOnYsD586a/kNRfu6+igpe2ISsrETN0WrvPd3d7iMih1EbLz4+I2O/k401+ni4tbg5OR70dnNFboA/rlm2LJZRlsiiEUb/4FVIAIAn9+/rTCkp3uTuaIfKAxRRZeAgYXRY2C+IKEonjv9zBDpVovbDokVZ/m7umJ2SspYhtIeEBQY+szAyEmxeu9aHEoxsplBnwIuyAAAO7N1rOC495ayXqzOOHD4UVYcNxqFKA4R5OVnN9IlqiEiWTpq8wN7aGuMiI655urp8tLeyxJLiovVJcXHzfDzccXLRxGyq5ESkrq6ORUMPTi0rHe/r7obTykpXdHa+VafHIiUlBc+ePVObNW1aUZCv71OVoUMxPipyNyKy/ysOrf/evrfv7Xv7mzREJNgcNiTExZ6Kioy4hYgEF7gsRJSuLC3dERkcjBOy0jE5PgZLCvPm08iSs6uqeNlpaU8ozyyLOpFNtLykeJeBjgYaj9HGuMhwDA0MQF8vD5w9e0YibUnTlvLPBw5kWJiZoOEYXQz298OksfGHTh49asMU5N+glLAJgoDVK5dODgnw7VQdNhAHSEvgUDn5rjHq6jhz6tSdAF8+5/1v3eia89nTp2b5urnh3Fkzapj/X7p48Vgna2vMTk9fxmKxoLY2+asn0zBhA/fv2xc6PiPtprLSAL6LvQ02//STOcMjQCKiRHpaygY/T493EaEhD5bV1CRSaHSEjaXFHQdbm1tUXTnBVB4QUX7yxIJzNmamGB8V0Z0xNqEhKSq6fmxU1MXwgAB0tbVFCwMDHDVsGDpbWWPD+vW29AJ+J8Pv7Xv73r63f4uVzkZEYu3aVf6REeE4Z86c0l6rlyBg24YN1pMn5kVtrdvoTmV9sRFRJDEh/rWXh/sV5hkbr1+/Vvb380atUao98+fMWFi3aX3Estqa2J3btzsxPAJEQ8Ny6c2bN6ePHRv3m6ene1ttbU3ab+fPe1OwtN/sGqfd7Bs3rstyd3bAoUryGOTj+SYzKf6OmY4OGmtq46bVqxfSZ2P8IwV62eTJ2Z6uLjhvVpXHu3fvFCoreD+sXb5cBxHlwgMCunxcXN4i4mDqa+yvTR4ToQkR1Z2trF75e3rg66cP9BCR7Ps9DocDTPQm7OhQ8XRxfGttZnKTJFm9Ap3ZxMXFIS87+8wgOXn0dHbBxJjY7vSkpPaMpOQzOampGcsWVmdOmTRpvq+7R3tmcso5CrmO9R1Q5nv73r637+3f1ghEJOOiok54ODlj47Zt+aJfKCumW21Nda6VmSmmpaQcQESCtn4RcXCQny8mxca8pGvSmfKERq1raflJMzoyHHW1NbEgb8LMz4zJbxS8tHxCxEHJY+OeKw9WxAnZGTvfPn8+SlRUFPLTMlbZm5nj2pUri5jC/x8n0EsKC3NcHOwRABQRUT8qIgwzUpPPi4qJQdnEogW2RsYYERB4/Nzp0/Y0gAL8wbGctEsjMyn5nKWhkXD9qhUZ9PPo2MaieYt8ly1eUkRra5KSklCcnz/H1sIMJxXk1RIE8RkYAPU7ee3aNdWspLRn+dnjf7l28ZopIpISEpKAiP2YyRAXL17Uig6PEJQWFi1juE8IRCSam5vZ9FnJ3+nye/vevrfv7a81WiCXTyz+YbBs/25bE1PMTU/f9uP6NUl1dXX93rx5I9vW1ib3yy+/qBbkjq/2dHXBmIiw63euXdOnLWoaiz07NbUxNzMLEZGNiFIT8yasrSgt7RWqtGCdM7Mqwt/bS5CXM24Kj8djjx8/R/wvehZIACAutJ7Qc3W0wyBfr8d0IjUAEMsXLQoL9vHBRfPmrmO+4/9l+z95wJNnzwCFQpw9Y4YuSZIHszIzmo4canGbOGHCJt7UqRNeJjwfcfHKJd+pUyqax8bFrQmPCtvq4Oi6C4VCAgC+WA4gFArJ5UuWLG4927qscfeewidPnuweNGjQ3fs//ywaEhLSNXPKVKejp0+PO3b0SKink9MWKSlp89Nnznjp6I55lJmWMX3qzNlkGQCUU/21tLSQLBaLP3fGjMXPnj4TzFm0MHjkyJH3xcXFobRoYraro2Olu4uLkBsUlBubmLhcR0fncklx8byb127kbliz5npkbOwsAKDL7/jMRabr7L+37+17+xdd2Nvb/6HC++LFC+RyuQgA+FfqsHk8HrulpQXs7e0BAHp/Uv0JqTMX/nJdN1VeCwCAPB6P1NbWJrhcLpaVlcG30jgiEi0tLayWlhaa73w2xr6//1mjv09/r6WlRfhP5zd1dXWskJAQ/o4dO8xX/PBDrKKiIufD+/dwprU14PGzpwGdXV1Lf9y4Hl69edP19u1boZycnLidpfUPJVOmVBAE8YRaJwGPxyMJghCeOXgw+8edO0eMz8o88vjxkyE3rl8d5uTs3AQAM7S0tFhlZWWCkJAQVmn5lI1jY2PWSUhKSpWXl/Nra2uJv7A3SGNjYxYA9BxsPhIHiGhublFFEMTbO3fuyKqoqLRpaWiQe/c1wYvnL+T/Y26Of7eFvnTp0p6qadMyfz54YJGdnd2aSaW8uNbWUxbFE4uP3Lpxg+Xi6HTX2dElX7q/jPiatWvs3r5/P7ab3wNebh6rxuXmppeVlXWXlZUjQfyLAGnCQkSRvJxxB3bv3m1tY2Nzo7ig0FXHxOQuCoVQO2/elBlVVQUvXr8W0dbVASWlgTBcdeR2/6DAyebm5pcZteMEpcj0rFu9Omr92jXrdPV0G2bPXxiAiAqlxYXrz5//1bWtrQ2ePHkC8vLyEBoWunp8XkEGAPQUjMv65c69+/rhUVFRgVzupmfPnik01NcHP3vyhBPB5e4fZWBwiVFn/5eYB8DfDlCC+Nfwfh9i+B+Mtbe//8tB/1E45N8xv4hI1tfXf/YMBQUFgilUWlpaoKysDFtaWgh7e3vBX3wu0dzczGIyb2bT1tZGBQUF4n8qAL80X2VlZazy8nJmH8jlcgktLS2C+hz7rCNyuVyCy+VCSEiI4E8e8T+tvSV5PB5ZVlb2tfn7j+ynr60Rl8sl/+T9if/Q2Egej/dFJYNWpL62l5iNqVi8ePECv2Fd/13CHE8eOam7buPa07dv3bw5RlNz33AVFREgiPdv377/8PT50wHXrl+XkJKW8r9+45qivoHhkQ0bNtny+XzoC9JC8158/14xv2TytOs3bvh2dnYqRERF1sTFj81gPntWVVXg1atXtnp4+1gHBwcf+xZjjOqfAAAhQRDw88/742ZMnbZcTFSkY/vmerWmYz9L/9TUcmTEaBU/ewNThdLy8sZhI5QbFy2p9flP4JcQ/xf9IaJkSEjg8c72zmE7G/doEwTxeN6MGTM2//hjwe2bN0Fj1GgYY2C4ctWmDWPPnDlhXJA38cdXz1+ohkWEF4wbnzuLy+Wy+iLx9C4U4oCM5OTaixcuBIqKiYGGuvqVnq5uzrXrV9X4gm4wNTU7M1pDfXxyRvYdERGRRz09Pb19iIqKAgEAfIEAenp6Bodzgy88f/GcKJpcaiDBYunOnTd/env7R10HJ6dZSWlpNbOnTy85cGB/QldXF5iYmLZMnzIlWn7oUKIgJ+fQ8ePHVcRExR+0vX0jMWL4cHkWiwUSUlIdru7ukRHR0Q1cLpf8MzQhRCRCQkLI+vp6ZDA8mvn92QlOBJfLBS0tLaKsrEzI3NQUE0QAgPr6epJyNfX+v6ysjPjaxuXxeOTly5eJr4zpa8yaJk7i0qVL+DXGwvicrKur++zdLl26hNra2sSlS5cIWmjR1lBZWdk3CSxq3wj/hIn+bl6pd0YulwtfGz9BEBAcHPwt/X+V6dbV1RH/h0yS7DMXhJaWFkHNo/CPgDDo9yVJEoRCYe/7Iv7rK9TJh5999i0ChRZqL1++1Lxw4YJlZ2cnAgAhFAo/O1Oaw+GgsrLyTQUFhbf9+/d/KSIi8ohi2F/0fNH8QEREBDZu3Bjx008/SamoqAgJgsDRo0ejpKQkoaSk9HDMmDGnAeADAPSIiYkh/W70e36tdXV1kQAgBgACDofT9f79e7Vnz54piYuLf1RUVGwTExO729XVRd/OAoCv8atB9fX1nq9evYIHDx4Qz58/l+JwODh8+PAPgwcPhvfv34OSkhJISEgwvZG9cyMUCoHD4YBA8Kn7hw8fQkdHB3Hz5k0wMzPDyMjIwwRB3PijOfrfbCoul8vS0tLCf4cXgBpf7/5MT08nMjIyyGvXrnXHxcQ0dXZ26qzfuHEMQRAvqfFz7t686aRvbLzv7du3gIgDFi6cF37m9JmFWtpavoWFkxop/in42p5GRNnt27ePvnDh3N4nj55siYmLXKSrriuYX70w8Mb1G5VDhw/7efbseU7FxcXfKswRAODJkyfa8+fOzTh8uCVNhCQgNCS0IC1nwuzYiNBDz168ssmbWDhc+PGj5dJlyzYNVh66c9GSWr9/okAHRB5JEOXC3347a1JTU/vzu3dvb759+8GqsbGxvbSoaM7RlkMTzpw5025gaCjh7Ooyo2TKlMKG+vqEWTNnLhs0dPDN+m0NBgRBdHwJjYdBJMSWTZvCdjQ0BHZ2dOqRBMGSkpE85+TsfCAiNn41QRA0pZEEQQhv3749YuWKFcUfP7zzEWFzHrFI8tLrN288ujo7BCaW1sYg7HE/dPDn5e/evQdvH+/1aeNyxhIE0Q0AsKO+Pmrnrh0lv5z6ZbSxqcmd1JS0EA1d3XeFueMPb9uyVWmQ0kDw9vaeOWX27M3+Xp5nlVVH7l9UXe1Keyu+iROTJAgEgn4AIORwOO97enoIUVFRZDJXgUDQy9y+wlRZXC4X/kyJYD6Wy+USX7ufYnokAACLxRIKBAJRAJCghJkQAFBSUvJ9Z2dnL4Okx9VXIWOsGwcAkCRJ/lfe4Y8ai8fj/RFjIQFAyGKxgM/nS1J/s6mfJAB0AgAhKir6js/n987jl8bxJYWSbiIiItDV1aVx69atwV1dXaKIiCRJCj9+/Ch+584dsQEDBkB3dzdwOJyOQYMGCd69eyduZmZ2hCCIZ3TfdXV1XxSwjHkSuXz5sueNGzfYb9++7U2kERcXB2Vl5U5ZWdn3Hz9+lFVQUHg1bNiwNwBwh81mv2e+0xfei8XlcoH5bMbzZBYuXBh2/fr10SIiIp3S0tKEiIjIMAkJiavy8vK37t69qykUClWpdXvT1dXVRRAEZ9iwYfc8PT3Pjxgx4igi/k6g8Hg8srKyUlhRUVG2f//+3I6ODikaIKrv+EiShK6uLujp6elksVgf1NTU3igrK+8xMDA4ERkZuYsgiHbKmhMAlbty48YNzqpVq2oPHToUe/v2bZCWlgZEBDk5OWCxWNDT0wMsFuuJtLR0t6SkpEBBQUEgKSlJvHnzBrq7u5F+7pfo8d27d6wPHz5wqL3f/fHjR0U+ny8tEAi6xMTEOrW0tJ6OHj16tZub22kDA4Nm5r6h5gFv3LihNX369OYzZ84oCIVCeP/+PbS3twNJkiAjIwOioqIgFApBSkoKWCzWZ/TNVKBYLBYIBAJ6XNDT0wMdHR3Qr18/UFZWfmtoaNiQnJxcqaysfJOeI3ot3rx5o3LhwgXTmzdv9sYPBJ8MGpaYmJiAqVBpamp2v3nzRlRERATU1dXvKykpnaINhT+iib8ga5DCR+9VUAAAliypjjvzy+lV1rY2zvHxiQdFRESgqrIy73BLS9Gz58/lBg8Z/DwmNmaKX2BwNYfDgZDgoHNAgPb6DZuGl5WVvdDW1kamYVBeXi5ERKLM3p5VTgnQ6dMrfa5eubrz1cuXICIiIuwvJ0cOVx6+q4RXFlFWVtYOAH8YRqHnExGV5s+aMav58OEooRAJDkHeDY8IWaUyQvnGwoXVky9fuaLl6Oi6dtb8+bELps2Ibty3e43aaLW9S5av9PpHCnQmo7h375pqdfWyFbL9pPu5e3gHGBkZ3fth/vxZu3c15h07eYLv5evTOXfhosHvXr0ak5OVdYTksLsbdjdYEIToWQbxflVLov4WBQAWQRDtzMmn4l3Ce/fujZheOfXQw4cP+GwWPH/08KFZ29s2cPfwuLyoZqld1dQpvj817V0hKSX1esL48SGOrp4HP2mG15xGqKmfJQjieT/ZfpCVnHRp3YZ1WgFc7sn586st1i2tsdm4+cfDv134TaCjo/NUXlGhg81mqzm6uCfHxscvo3Hq/yg2R7luI86fP592//79we/evcMBAwa8/fjxo6ioqGiPlJSUEACAz+eDnJwcyMnJAQCAmJjYNRaL9ai9vf3SiBEjnllbW98ZNGjQJQAACQkJ+Pjx4yD4FNd/d+TIEWtFRcV36urqlwGAQwk5DofDecLn8/syIeGrV6+GNTc3u54/fz7l+vXrMiRJoqqqate9e/ckP378KEqSJFJCADkcTruSklI3IhLy8vJvtbS0arhc7mGCIJ7Q70/3e/jwYbvNmzfXPHv2jNTS0nppZWVVbWNjc/vmzZsDCILg6+rqXr569erojx8/SnR1dYGiouJHNTW1p5R19ZIgiM6vMRZ6TzQ2NtoeO3ZsytWrV4d+0kkINkEQBEmSpEAg6BYKhUS/fv3eUfOKAwcOJMTFxW+SJLlKIBCIjho1Cv38/M4TBHEHPpVDIsUDARGJ1atX5x08eDCqvb19+LNnz2Q6Ojp6rVoOhwNdXV0gJiZGM8zeqgslJaXHJiYm+9zd3Zfq6+uf+or1RPB4PKKsrEykpKRk89mzZ/0eP378O+HH4XCgu7sb5OTkQEZGBgCgg8ViPZOTk3srKioKkpKSKC8vT7BYrHqSJM8bGRmBra3tPoIgBF8KSfz000+GmzdvXn/y5EmNe/fugYiICLDZbOjp6QFZWVno378/PH36FN69ewccDgdYLFav0BkwYAAMGjQI7e3td4wfP35C//7979DvRdPvy5cvTQMDA08dPnwYAODPFFwOU6GUkJAAHR0d0NHRaVq+fHkKQRD3KIuRKC8v569bty67vLx8/s2bN7u/wsvYfT9neiG+mUl+QQEBAFBSUgITExOws7OrLS0tTe3o6OjNZN6yZYsgJSVlzfr162M+fPjQCf86cvXfHSbgyMrKgpeXV1tERES0l5dXY21tLSc5OZl//vx5rZqamkPnzp2T7+7u/szqFwgEwKYOL6HfTURE5NOhJiwWSElJCYYOHXrd2Nh4e1RU1Op+/frd+J8KJJoHLFq0KPv6pUtJohxOl+pIla1Kg4f+eufOLaurV64WDRw4qLSyqmoKIg6cPXXqrI2bNkUBAGjr6MDly5dAUUkJssdl53r4+s4tmzw5u/X06flGJiZVZZWVRX+kkDO8oIJjx44NP37kiMWHD2+7DYwNroaERF3u7u7+U08GraAhonxedvaRIy0tGgamRq3+fr557t7+b0oL88e3nv4ltvVMK9g4ODyfNX+RmYqKyt2JOTmbm5qaQhMSEzaMy82P+kdDhtMlZSRJwvz588dPmjjxxcaNq7UJgoB506rm66iNQhN9fVRTU5P5+OKFiZ+Lq5Dr5/cCEZXpSfwjhaGOy2Uxswbt7OzYTDQfmrBKiyZm21uYY/2Gtdx+srJQMD7rupGeNn/fzoZ4AICQAN8nI5WH8KsXzF2HiNLzZ0wv5vr7nPdycURfD9dbs6dOKdhev8kyMiTo2iAleWF6ZsoZRCQRsX98VNj1kUMGoaezAz800P/06uU/lFP17+S3JNvMmTPnoK6uLoqIiNAxyq9eEhISKCsrizIyMjhgwABUUlJCFRUVNDIyQi8vr4+lpaWblixZMjs+Pv6ch4fHQ09Pz/vu7u6XHRwc0NHRUeDv73/d19f3tp+f3z0/P79HWVlZh3bu3OlErxUiEogomZube0VTUxMlJCR6ny0pKfnVcXE4HORwOCgpKYna2toYHx//eOPGjVF0TgVlTUnExsbeFxUV7X0XU1NTdHZ2Fnp4eKCnpye6u7s/dXd3R09PT3R0dEQPDw/08PB47+zs/DgyMvIyj8dbe/HiRbW+7mV6n1RVVVXb2NgIpKSk/nAeSZJEDoeDIiIiSAk/1NLSwtGjR6ORkRGGhIS8WrVqVRxV4UDjFRCVlZWzjYyMmH0JKTcrffEpgUVffMZnqKCggN7e3sKamppCRPzdMYr0nkFEHVtbWwSALgDopq6+/Qqp34XM92Kz2SguLo6SkpI4dOhQ1NTURCcnJ+Ryub9NnDixZevWrWF0KU9ycjKHIAioqKhYOmDAAASAjj7v8LX34QNAD0EQ9P8F8vLyGBwc/Oju3bsqlGJC0hnAHR0dIyIiIl6yWCxks9kCNpuNLBYLSZL80iUkSVJIEISQxWLRc9rN4XAwLCzsxbFjx2wZ+wqWLVtmpaOjg9T9SCubdH8sFktIkqSAIAgBi8USkCTZe1EKzmcXQRC9V9/7SJIUUv0J2Ww2Pb4eABAOHDgQk5OTzx88eNASAMDd3V2UIAhISEj4SVpaWkgQRA89Nnp8BEHgl8b8tYs5Z/TvLBYLORwOvRcwODi4+9atW6a00rBu3bolysrK9Nr2fMPFXHMEABwyZAhGR0e3rV27NobJV/+Kyx4AoKSkxMPfzx89nV067E3N0FBLG23NzdHNwQELcscvZLFYsHHduqyosNDHWqPU0M7KEhcvmLfl5dOn5kurqytdbG3fO1lb46Tc3G3Y3W0cFxZ21MPBoXPV0qVJiDji1rVrpqcOHbNFxBFfkh9fGTfxLeXHdLnbvKqqZVpqapgUF3sRESURkYyJCD2hPUoVZTisdnd7G1y97IdkgiBg5fLadG9nZ4wJDf3QeuKEHgVs9s+ugqKAX4jjx1t0fTzdMD0l6SAistbOWitpb2HepaehjgDA2rd9Z6i3gyNOyMja+lc3DSWIiK9tpI1rV7l7Ojuih7PDu/ycrCO2lmY9o0YME1TyJtcgIhkS5HdlsKI8GunrPfH38XhibmyA9taW6O7k2OHqYIe2FmboYGWJqkOHIDfQX7jxx40h1EboHxYc8CLQ2+MZIhr8FV8HvUFmz56dYWxszAeAbhaL1UMxED6T8XyF+fD7CgxZWVmUk5P7khATfE0QW1tb45IlSyIZc9nf29u7BwC6SJLsoRkhzeCYDI85JsbvPQCAtra2uGzZsigG0Uj6+vo+BQA+i8Vijh37/C5gMJTPxi0lJYVcLrdt1apV4yhLg1beCERkW1lZ3aQEXDeTKfdl0H2Z+BcEF5qYmGB1dfUyRGRxuVwRDocDOTk5W0RFRYUEQXSy2WyasX9JiPQyXFp4UUyXDwCCUaNGYXFx8VFE7NcXTpLaF+zi4uIdlJDtYTJvpuCjniOkhODX9gjNpJHD4aCxsTEWFhYeREQp2mLcunVrooqKCpIk2cNisXqFDi1wmJ/1FUr0uACgS0xMDMeNG3ceEenyzd7zGo4dO+YWERHRRSUSCeg+6bWlf6f7pRUUun9aIMbFxT1FRAVEJKm5Eg0ICLjIYrGE1D7t/T6z7y+Nn/n8vvf2/b1vP8z+WCyWkF4ne3v7j7W1tXb0etbU1PCUlJQEAMD/0nO/9PeXaJU5pi99j1qDHlFRUYyJiTmOiGwAgJ07d9oZGBggQRC9e5W5pn+kKND7iqYJe3t7XLx4ccyfGVt9G210OTo65np6eAixoytux6ZNC7RVVHs0R6gIq8rLq0mShOXVNdHB3t5opKsrLJ5YsHvj2rUuzH7O//KLQVJ8/DMtNTUM9vK6e/PCBaP8zKyTAR4eGBkc/DQiKBi9nFwwKiS0vba6Oo1pVDLpiy5bY2KcfGNemDTXz69NZ/QowY/rVkQBAPCK8ndqjVJBeWnxDl83J5xeVpoLAPDs4kWp3OxsnJyfv/PxnTuaf3XO/tZWOiISv/xy2M7D3VEQFOh9EwDgypXWwTamRt2W+nrd2N5uFertfcbfzV14tKXFAv6N5wAjIkGSJGzcuC44MSHujqONpdDfy/2DnuZojOAGPkdE1tLqBcGxkaFoYTQGPVycMSc7e0tDQ4Pvx7Y2k2OHD3sXFxavS4iNu1hZWtq8c9s2CwAANocDy3+orvR0tcecnPRiauNKxcbGitV+Yz06zezq6uriHR0daeLkM4ntawTfl6mQJCkEAL6ioiKqqanR9/SwWCw+ZUH3Mn2GYOsGAIyIiHhHe0U+offVlhkbGyMAdDOZQF9G+TXrl7asnJ2dcf/+/X60l6akpKRGXl5eSJJkD5vNpoWdkGYm1Ng+s0oIghDSY6YFk5GREVZWVs6g8AtIeh7HjRvXICMj0zvuP2PcTAHSRygLAKBbX18fV65cOZEm6uPHj+taWlp+pBiogDkfX3rOl6wuNpuNANCpqqqKM2fOnN9XeaX3DSLKJCcnX5KSkkKCIPj0fH2N4X9NCDD2ET1/XfLy8pienn4KEcUoZUgqMDDwHpW/we+7x/oK3y9dlEDp1tLSwk2bNmVT78JmMtWjR4+6hoaGdjMUkK8Kyq/s+255eXmcPXv2NACA2NhYsU+x0emlKioqCAA99Jp8SbD/lXn7IwFL75Uv7J8eAMDQ0NA3Fy9eVENEYsWKFVomJia9dE17h760V/r2/S209gVFqEdWVhazs7MbEFEEEdnR0dGHxcTEBCRJ8vsqY9/yHGrcfADAgICAt4go8Rd5MEnxdKO42KiXAZ6eGObjKxipOFAQE8R9gohSiEjGhIQt1xw0lJ8zNnkT/d2De/eqr1xem7B584YURJRAROWxcTG3VAYNxJyUpOOI2D8hPPTSIFkZNNcf8z4lJvpkbAj3dhg3GBfV1ET8TzwKXxPor1/f6mdtZtruYGmFhYWF/RFxkI+z42tFGUlBeIAfv3HH9rEAAPt2787csW2HX9PuJisaova/Bp+kubmZDVThvbe7E/p7u926fenS8PHpqbN01EagkbbGx0BPt5cu1pa4ZOHCOQRJfnEBaCv8a9b4N2pYxLuXj7UQu7TLSwrXuTrYYu649EpEFEPEkfXrV3vcvHLF6EvxM5KKG0pLS8OR/fuVK4qK5ng42uHo4UO75k2vXE9rxH+UdfwHHgxobGyMCg4Ofka5uQUU0+sl3G8gPL6kpCRGRkYe3bhxY0FgYOArhsu8m2Iowj5MQEgQhNDOzu4RjdpXV1fHYrPZsGTJkoWamppIeQ6+mQEwBBcfADAmJuY2JTjg8ePHWnZ2dl0AwKcs3G9mXgxrUQAA3RoaGjhjxozJzDlExAG+vr6/UUKzh7Ze/8C9+1UGSlld3a6uru+OHTumQ6/lrFmzQjQ0NATUuwqYAuQrY6bdob3WL5vNFgJAt5OTU3dra6ttX0uC4XofFRoa+oS2av8KE/6j9QGArqFDh2JJSUkh/czGxsZABwcHpLwt/L6W+Df22y0nJycsKCioZrrFAQDmzPkE2HHixAkXFxeXHsYc/04wUu58wReEngAAhJGRkbcQUY7KrCcRsX9gYOBLKiFS0Nea/Z9ef6QMMl3mfccuKyuLU6ZMWUJ7vBITE1sp5bVHVFQUmV6dvpY+HW74lrHTHpovWeqmpqb4448/hgAArFmzxm/MmDG9Cs8fKbp/pBQCQI+GhoZg/fr1Y5kK21/hwQcOHNAqKsjfH+Ln90Jz+AgM9Q+4TvP06PDw6lHDhqG1geGtxfPmr01LSNjmbGuLeurqaKClhTGhYbcun2q1yExMnK86aGBPSmz0a0SUXFBVNd1AY5SgODfnPCIO+nnPrkgTQwNMTk5ZS+W/sP+3RiH1UyoyNOSlmb6BsLa2tt+F06c9PR3t0EBjNG5Zt6YQAGDV0qWRKUnJuGblmgiaBv5rhDmNxCYiIgK18+cuMNLUQM3hygKulwdqq47AoQrywuEDFdHD2QHnzayaIC4uDrxPiUh944rkF/pm/xXBTikJvf0sq6meo6+j2a2hpoIB3p43jfR05mWkJU9funhRVuuJw3rUJlOo5E2a62Rrtc7ZzvoHC2ODpaEBAXcjA4PRxtAItYYr48iBSmhnYoQhvt63w4OCNkdwQ1dO4fFmPnr0SPlbNTPGMbIDc3Nzm/T19XsFMS2Q/oj4qP/1KCgoYFFR0VoAgEePHilPmDDhsJmZWbuOjg4zBs5UFIQAgHp6em2IOJqeby6XyyIIAvLy8pb369cPAaDrW6y0PoJXCABobm7e/eDBgzG0YlRQULBQVlaW9h78JYFO/6QFtoODA/78889eDMUREHGgv7//lT5x9O4/uXooRtr3efx+/fohj8fbQhAEGBkZcQAAKisrPdTV1dvpODbDPSmkGCBdQsgHAFRUVER5eXmmBwNJkuSLiYlhdnb2L4jI6rtPaGbZ2NjI9fb2RgCgwzB9LW8h4/ozxixkCFK+sbGx4OzZs1r0M3ft2pXj7u7e++4EQXwmYL7B49EjIyODEyZMWEeFRL649zds2OBsZmbWyZwz+l0AQCgpKYkcDgeZ+QEMYcX38/PDS5cu0bkfIgAA27dvd6Pohv8t9PJnQo36XEgrw33vo2ioN9zEWBcBAAj8/f3vIqICAMCzZ8/UvL29b1J5Mj2MnAhmyKz7W8JkfcZH3yPosyf4kpKSgunTp2+nMudZEydO3E6FcLop+vlLSiC9vv369cO8vLzFlKAk/wfyAKgcI+W0sWMvejo7dba2nnICAFixYoV1BDf4naGGJppoaaOVgQFaGxl1RwYEPnKztvlgpKGJjuYWqDl8BBppaWBhTvZyAIBJeeNPKisOQJ1Rqhge4IdOVuYYEuDfvqm+3gkZYZ//TbOzs2MTBAFlpaUTrU1NMCMlpQwR9e3MjIW+rk64v7HBOSsrS9TPy+tHDxcXASLSXmbiv0mYAyKKTaucss7VygqHycryx4wcKUyJirySl5F2Sk9jlCAmMvTK1Uu/OtFlNUytiF4IqsxBavWSJUOOHTumyATi/xbXPB1nBQBoamzUnzAu61BkaAjaWVmiiYE+mhrqo6ujAzrb2aKuxmj0dHLomZCa0hQVFHjTREcLhw6QQz31kejv7YGxkeHHPBxdCrKT0yaG+/tPCgvwm+nl5FAe5Ok5JyYsbFV2RrogyM8HQ4MCsLKsdBIAAO8b4P7odxUREYFVq1ZFx8TEfBgyZAgyYszdlOUi/Apx84cPH47r1q0ro/vicDjw4MGDMevWrcvPysqqi46OfkMlyDDd9Kivr/8eEbXodaPWjoWICllZWdf69+9PMyIB06r9EmNkuGmFVCz6fVtb20h6fRFRNjQ09HEfYfjF2OyX4p40YycIokdCQkKYnZ1dT5Ik2NnZsek99+LFi8FpaWmHbGxs3ujq6vJ1dHRw9OjRqK6u3nuNGjUK1dXVceTIkUi56XsZI8MKExAEIYyMjLxBufdpQCJYvHhxoK2trYDxXeZaIQCgmJgY2tnZCYuKihaNHz9+mY6ODgKAgKnwWFpa8tva2lS/pPzRFu6+fftC/fz8et3OXxEANIMXfsWdK2QqdCRJ8kVFRTEhIeEEIkrQysr27dvdIiMjf1VVVe3bd09fJYi5F2mGLy0tjVlZWRvoHAc6v2H16tVFhw4dsqXfbd68eYFqamoCej6oMAdaWVlhZGRkTUhIyLGBAwd+tia0QPf09BQeOnTIkaZ/LpfL4nA4UFxcvI4WWl/ao5QQ5veZO35fLwvT/T1s2DD6ub9TLmVkZFBfX783eZSRT9Dj5OSE586dc6WNjqdPn+pmZ2dfMTQ0RGVlZZSQkEBxcXEUFRVFBQUFVFdXRz09PUFERMQbHx+fd4MGDfpDzw8A4KBBg9DMzOwdRZ/MBDuBhIQETp8+/RTl8iURcUBCQsIxStHtDaV9jZfQ+6UPfQvYbDYWFhaeZiT9Et8oC37Hp9fU1haa6o/BqMjwXVROB1z/7beROSkp46NCApdmJibkH9m3bwwiij+5f19nXtW0+Z6O9i9tTY0f54/L2oqI5NXfzlm5Odl/tDYz7omPDHsTEuD3enxmyq6Na9YY/5td3QQ1j6zIsJDjdlYWePxQ8xwPB9tHJjqauGZJdRIAgJO19fKwoEBERPZfiNH/I4Q5gYiD8seP22lnaYbaI4bjcFlZTI6MfI2IEjVzZ2cE+XhiU1OjETNxom/m78WL50xzsjI2JsfFYVRICMZGRmBq4tjnc2fPzKAF+x9pYLSlIyIiArOmTYvPzkjHjNTko+tXrcrduW3L5BlTp1Qs/6EmHxElppaX7dfVGIXDByqgqpIijhyohIpSkp02RoZYVjxx78Nbt0ZLSUl91r+0jAywOZzP4kV7duzQi48K3xrs54NVlZVT6PIZ2or8FsWjs7NTvaKiYmpERMRLfX19HDFiRK+V3dcao4lwxIgRuHbt2nlMNzTdqPPnJWtqajLU1NS6GVnEaGho2PXmzRtDpruXJoSOjg61SZMmNZqamtJWU9/s7h6auTMZBK0smJmZtb948UKdOaaDBw8Genl59WVWgq9cfIb7/Hf9JyQkvEXEIfT80eOm3/f06dNWq1evrli4cGH5okWLKuhrwYIFFYsXL54yZ86cipycnJXh4eEvKQHCdKMKAAD9/f0vMAR67149dOiQW1lZ2Q5/f/92bW3tdi0tLb7+p6qNLldX1/b8/PzG1tZWCzqHoKCgYBsdE6cFuqmpqZBhbbK+FpLZvXu3f2Ji4j1jY2McMWIEamlpoZ6eHpqZmXV6enp2WFlZdWhoaHwxsQsAUFtbG93d3XuYwodO/jt+/PgQJq0gInvu3LkFSUlJzwwMDNo1NDTaDQ0NUU9PDwcPHowDBgzoVYKYCXMA0CMlJYWZmZlMgU4iolRMTMwTZ2fnD6dOnfKWlJSEtrY24zFjxnTQuR4kSaK7u/uzI0eOBFJWpVR4ePg1hvejV6B7e3vjyZMnHRlzRtCewKysrFbKG8L/UnIlm83GwYMHo6amZu/7fCEBT9ivXz+MjY29N3Xq1IrIyMgWSlGgLXG+rKwsZmRk/HzixImwuLi4E7KyskKCIAQUjfRYWFgIt2zZ4twnJMRpamqKmjlzZnlqauqazMzMLZmZmTsnTJiwaPXq1RVNTU1miCiNiPITJ07cJy0tTe+Vz5QMkiT50tLSmJOTswcRFRITE3cqKCggHSoBAL6UlBTOmDHjIFViSHsAZePj44/Lysoik64Y+TF8KmzxNWVCAAA4ceLEx4wQI/Ethh31fNFnz54N3Ldv+7Cfdu3yTYuObR0i279rtLIyhnED700tLy89f/iEGSLKIyIhLiEBzLM0qD4k3r56atH28qnLrm31CdGhwS/srczw4N7GcIrme8/f+KvCnNr/NA2y+oYU6P4ePHigl56e2mZnZYH6GqM6lRXl0dvZ4eGcWVVFzrbWV23MTbBx55ZoAIAFCxaI/qfl7/8JljsiQlpi/Pxff/3Vx9raulZaVHJEfV2dm+rIka0EQbR7ODgYsEQ56OHh28qsN6exeBFReua0aZX54/PHSUpIgLS01HJnV9fX79+/Yx0/flzr6tWr1clJY3MOHNgX6ezs/gswkJoYSGeC8vJyPiIqlkycuGF7wzZnfSPDvStXr/Vc/MPSz8abmJoOa9asnGdlbfVbT2f3wNbTZ0KeP3uG6qNHi0ZFR82dMLk0t2zaDKAt39nzZgRfu3IjYehQZUNbU1M7ayena1RX/c1tTN76c7lB4zPTp92+dXPyutWrryUkJa13cHCgCeCL9Y50HSSXy2WJiYldA4BJiDiroaEh+cKFCwNv377NefDgQeyRI0ek+Xw+jQjSO+UkSQKfz5el4tVIz8XgwYNZKSkpfIIgPkpKSi6OjIzMu3nz5ggaMILP5wuomHdvKy8vF/J4PFJcXPymiIiId319fdT+/fszrly5YvL8+fNeV1JHRwfZ0dEBjx8/7s036FMz3TlgwICXlMXJP3DgAMvFxWVbQ0ND8PDhwysuXrw4+t27d2w+n08y6r0/y1948+YNPHz4EOikPYFAADRAhlAolAEASYB/od/RNaUEQXwEgGPU9dVGAdEMyMnJ2bxq1Sqnd+/eCVgsFosGviAI4jPGQNWRknZ2dk1sNrupp6dnYEtLC3R2dsqTJOna2dnZYGRk9E5FReXVrFmzQE1NTfTmzZt8GRmZWiUlpYBbt27RAB8CgiBYz58/HwUAB2mEPGZLSUnp4XK5LC8vrwZEbG5oaJhw4cIFaTk5OTA3N9/K5/NvDhs2jD9kyBBi69atMRs3bpyxc+dOFj1HiCgwMDAgY2JiKtPS0talpKTs27Rpkwqfz0cAID58+CBsb283BYDt2traWFdXx6LK0WYi4tJff/1V5PHjx8jn81M+fvwod/z4cXj58iUhLy8vdurUqcjTp09LU0KOEAgEdB1zm1AoBDs7O0JRUREIgviwefPm5Orq6p1paWm70tLS9mdmZhrfvXtXjKpIEHF2dn6YkZERYWNjc4R6dfGuri4poVDYC1pEH+LUF5Tk00cIBEEQCxcuDCBJcuORI0esnj9/DmJiYvQlVFdXB4IgmoYOHXrVzMysWV5e/t3Bgwezly5d6vX06VMOtSZIndz1dvXq1aYEQTxDRMLLy+vG3r17VQmCEAqFQsLQ0JBfVlY2RUFBoRkRm3/77be7ra2tovivzdu7lv379xdSfK0HANbTe47FYgFJktDZ2dk37+b9lClTfpKWlnZ7//69UCgUspi0hYjCIUOGsEaNGtVEEMSLrVu37jt79qzPixcvhARBMJVCutiefn4bIrorKCisOXr0qP+vv/4KHz9+7L1ZTEyMpaurCyYmJs337t1T279//zAKfKf3Xai69RsSEhI0v/iz2m0hIo6omDw5MzosNKmjs1OGYJGAPQJ4evc+DB04CFhionD/3gPl9g/t5ceaW8q7eroBRFkvggJ8RAbIyT/Q1tFaGRMXu3/9+s36mekpyXdu3Rzztu2tTHt7O9x/8AD6y8rCli1bgn76afc1kiTPUgBHX8UA+VLidkhIiKC8vJwPBAAKP21nCtGO4PF4RHl5uZDmicOGDbvw6NEjx8py3pKfm/aZCoUovHfv3pCd9fXT7ty9BwggbKjbWn3m2LHnxlZWTfAvPAv8xwn05ORkTnl5ec8gxQHxV65eCdHQ0DizcMmy1PLCyeaGJiZu3ULhCkQkynklj3459QuxYcMa+5CQkEN1dXUchUuXhA6fBHC/cWlpOy9fvGg7aOjgIzOrZqYOUVG5vGr9xl5rc82alZ5Nu/euWFpTe2r92tXF0bHx04ODgz+DKEREmUXz5qSGBPgX375zu5+unv6TxTW1AbVLVwCVVPOeIjI2IgoIgtgDAHtOnz5tnz8uK/zZ0+egqal1PDl7fEFKzgQ2AAgRUbFkcsHaU8dPusjJKVz78P59krWT07WOjg6VmgVzS2NCgjyfPX8hlZIQ82vVnHlBRbnZgoNNe9fFRoS5uXq47wuLiN5AgVp8VbDTIC9PnjxhEQTRBgC9R/s9ePBgWVpa2oHGxkZ5SqYRDAaCbDb7bh+CAi6XK+TxeAQAEGVlZWROTs5lNps9ggEmIf727Vsp6tlEX6FeXl6Ofn5+6xFxc3t7u9KpU6d0urq61EiS7Hn69Omo9vZ22ePHj7tt3bp1WGdn52eY73w+n9PZ2SkDAK/odwMAwtfXdysi7m1vb+9/4sQJeYFAYNHT0yPKYrG6PslSgahQKBQIhUKZO3fuqOzdu9fv4MGDA/l8PpIkSTIVmb7zSBFObyLk0qVLWa2trWBk9K98x9bW1t7fr127xiII4mVRUdEORUVFp3fv3gkRkfU1MBGaSVKMQEgQxFPqs6cAcIlmvrQAunnzJh8ABB8/fuTTCHXMw0Ko+QF7e3ugYTH77gcqr+EtAPD+gPzm7ty589GFCxc23Lx5k2Cz2QSfzwdjY2MiLi5uu5iY2I38/PzzEhISqm1tbQIAYLHZbBZBEL3eHBqFjcvlktTeo1vl7x42d67i1atXA9+/fy8kP51NjCwWCyQlJQUAAOrq6sTSpUv5iEiy2exdTU1N3Pnz5y+rq6tzuX//PgAAf8CAASK2traPIiMjvX18fH5FRKWNGzemxMTEZDQ1NSnSgppS3phzR3xpzQmCuI+IDgcOHPC8ffu2F5vN7ho6dGjrgAEDjhoaGnZISEg86ujoYGoCV3/55Zfze/fuVaSsVAIAYMiQIXwAeJOcnMzhcDg9EyZMeN3U1DQSEfkAwBk4cOCtAQMGHKKsuNdqamoPW1tb1b5G0xRPIng8HuvJkyfE0qVLBQKBgL6XXLBgAfv169dYXl7ew+Fw4NmzZ0EvXrwAgiBYtELDRNhDROjq6pJERKK2tlaaAUELX/J00rRMEMQ7MTGxgH379vns2bMn5MGDB35PnjyRlpeXR2Vl5R1ubm4rgoODGzdv3jzu8ePHC86dO8en9wciIhX/fkjBaX+Vh9H47FevXjWJj4neff/uXYX+cnJvh48YvmaUhobgw7t3AqGB0VsA4A8cOrifrLz8805+t+D8qdMqN2/f9Ltx46rC+dNnQFxCvN/pk8pzd2zd1vHy1Uvxhw8egriEBMjJycNodXWwtbN9+vFjR1dHV1fQvFlzgoryxv9UMGliuqys0i0ej8f+gzMAevX5kJAQgZioKKxasSL0xNGjxpPy8nwm5+dvt3dyOuXh49NQXl6ONFBNeXm5sK6ujjVkyJCziGhXmJO9o6X5Z1d3D/dDJEncPnTocNy1a9eIPbt3yzx99mz3+o1rJ0SGR1fT6KZ/s3M6vinOQCAiOyQo4KaNubFwz7ZtdgDAOnv2pFZeTvbHyZOL/KmEM8WwUG5PWBi3melWQUTprNTUI/qamjg+I2MP7doxMjLi1NbWcmo/xRVpF9LI7PT0m6EBAVi3bl063cel1tbhc2fPLfj5wM9jp5SVPgnjBh2ZPWPGSkRUqa2piYiLjr7p4uh8Lzw07EZNTU0unZTE4/HEkpOTOUuXLNlsqKWDhuraWFE8eSIAQFZWligiShYWF5wPCfDhz5o6NYRCqIMDjY0OSdHRT/VHj8LRgweiorQkjlYeghMy039FRJFJBQXzw4IC0c/LE4vy81fSNbTfmmG5YMECUS6XKw4A8OHDB8OAgIB3VKxUyHCfCm1tbfH48eO6zDBEH1hLFpvNhtTU1FbadQcAaG1t/VlS3NcI9I/Gefv2bV8nJ6femCTtErewsPjQ0dExsq8L7K+WJV66dMnAxsamN+mJdgsmJCQgIo76FhcbNScs+ASB2puIlpyczEFEorS0tIiKHXczEpwwICDgItPl/iVLhI53IyJr8+bNicXFxZdycnJurFmzJkdCQgIQkcjLyzsmKSmJBEEI6MQ+ExMTbGpqGs9M7PuzvdBnHCSd98Dlclmtra2D9fX1eyjljk+SJAYFBbUiojyPxyPHjRu3k3K59gCAUFtbG1taWny/tCZ0Yg8dYiAIAjgcDiCi5JkzZwIyMjIuiomJ9daVAwB/5MiRuGLFiklfyIKmFSy1GTNmLI+Ojn4dGRmJJSUlTYioiIiSGzduLIqPj39Ehw7ofABm+RwACEJCQvD+/fu2XxvzNxgwBADArVu3THNycm5S7mq6hl0IAJiamvoKESVpmhg/fvwtyjXdAwAYHR19heJbpLi4OHC53PWUy54PAD3m5uZIu9y/ttcZiVPM3CHOypUrF6irq/fmW3whV6V79OjROHfu3EIqhJVEl8YxXe5VVVUHKJc78bV4dnt7+7C9e/eqP3/+fBSNAEglSCbZ2dkxaQEBgC8qKooFBQUNNOjSl2iB3i+ysrKQmZF2I9jfF2sWLsynq13+pahuNNi6caM7E8OemgOFlYsWzPZxtP+gPECuZ4TigO5B/aTR2lAfM+KiLy6omrpx745tgYiohohKiKh4//4NtYqS4tWeLo6YlpRwq6OjQ4VJ9315AzO82bBli3NactKN6LBQjArmYqiPL/o6u6CPhwdOKp60q6PtE/9ihoV7wygfPuhHcYM6Swry9wIAVEwq3KYzSgVtTY34FgZ6aGNliTWLa+oRkfOfSpL7t1notGvi4a1bKndv3VZWHj6cMLCwuA8AAkND88slk4uukyy2PUEQDYj4wsnZOe3CuXPLxmdm/ujn5zdnsJwcZ8rkoumHWn621tPTPze3uppLEARmZWWJPn36lH/gwAHQ0tJCABDW1tZyCIK4hYie8dExLZs3bp7y9MKtrUq6qsKszIzDfAEOGqU+Snsyr3yUpKTkh831W6GftHjhzvpt0y/8dhEEKIT+CvLw7Omj2e/aXkpUlFdMKY2NgaVr1vTozZ7D4ff0oIS4OKGmqipNaVZdMlISRTevXx/j7ublnJiaejB/0iRYu7w2bMbMmavu378vZmNje0pLW+vJ8SOH/Y8eOyo4dOiw3vzZM2dPnTlz3LOHD1dXzZg259aNa/EtLS2l5eXlD//sZB8GZGEXm82GlpYWj9jY2OrGxkZpkiSFnyDESaAIn1BWVj5jYWFx3c7Ojl1fX89ftmyZ5+PHj6f369dvbXZ29o8EQTy8ceOGRXR0tIZQKEQWi0UAAPTr148Pn1DJvtpCQkIE1IlcxOXLl+lDP8gDBw6wly5d2v7bb79p05YP07IlSVIgJibWTbnEkbZAmf0BAPn69WvWokWLehhuwk/lgiQJYmJicPnyZT3aKmAerPEXIDyJ+vp6AT22+vr6XmIXFRUlAQBevXoFfSzoXhxt+u+vuBURAHrev3+vN2HChHVHjhzR+/XXX4HP54O+vv48f3//lPj4eGhqatL4+PEjEARBMtz58K1Ebm9vzzp06FAXIsr98MMPNhwOh5+amrq7vLwcsrKyRJ8/fy5ob283IwiCTRlUyOFwgM/nP2Oz2a8EAgFkZmYK+4RpCMb5zX09AyQdCrt06ZL27t27iy5duqTj7u4uDgCjjx8/Dl1dXUi5FAEACGlpaRg5cuSTL21nystwEwASEbHy/fv3ErKyspcHDx4ccvLkyVnnzp1TvnDhAlBZ5ay+ljkiCqj1vzhs2LBfAIAMCQkR9rXUEZGor68nDxw4QAIAODs7C6k9hwDAR0SFxYsXF6enp6cfOnRIpLOzE/uGVeiEOSrhTpCTk/OZ+/bjx49En7CNGBM//2v7hblvKIWcnl+DAwcOjIyNjc09duyY+a1bt4QkSZK0Zc6kB+pMB+Tz+UIAAAUFhbsCgUBIueuZkNhf8xQAIooDgBKbzb7LCF9wZs2aJdLY2NjFZrNp3vLZQTYkQQIKBF91ZVP9CxGRXTwxv/b1q9dqCWOTwj28vQ+UTS7Imz1tirmbm2e+rpHRlZ4PPWZXrl1ZEhoY1Dl4yNDVKRkJc5SVR92kDmbJ2/bjxvM/VC9ed+H8uS6VUSMxITGxPD4tYy5BEO+/8OjnABA3uWji2z2NjeOC/LxOrliyaHFCauYCyrPVCwdL81URERFBRemkmm0N29I4IiIvDUyNJ1hb2+0fKC1NnDl3QXPv/r05h37e733hXKvl7u3bs7wCAjbSfTx+/FhQV1fHAknJ+x+6ujpfv383xg6APUxZuW7YCJUAAwPDan0D/dalNbUr161aGSzKIlvGpqYu/jfg4f/nGq2J/nrmjLmBtnaXj7sbHjvWrPGvzNbZ4RUVZXjxYrMUvVEaGuq0Zk2f1hITFir0d3XB0UOHoPkY3e7m/fvTqN30RTcJj8cjkyktqW7jRi9fR1ecnDNhEa+keHlIUBDu3bFXmxGTgt07trp4ONrjQCmpbmV5+R5vV6f3WzatK7U0Nnjl4mTXfuTIEVVac928am2BsZY26o1Wx/zs7MkAwGpvbx8e5OPTk5GSfJK2YmsXzLFzsDITOFiZY1FubhntTahbvTrRwdKsc0A/GYG/j+9Dunzl1tULemmJcYL6deuivmDBfDWZZP/+/RYZGRm7TUxMmAhOzKxawahRo3DVqlVceuO+ePFCPT4+vktMTAxHjBiB/v7+TzMyMo6amZm95XA4vWVWAIA+Pj5v/8xC/6Os1b17945zcHBAylITMkukLCwsPr59+/arFjQzoRERxfft2+eQkpLiOXPmzB/LyspOhIWFHfPw8GilIVeZkJ4AgGPHju1CRJU/stDpkpMZM2akBgcHnwgODj5WVlaWRMWue1t2dnbOsGHDerOk6aRBf3//i1S2MPGlhEtEFF21alWOu7v7E+o0rx4Gkl4PY52EfcqeekxNTXHfvn15f2ShU8l+bACArVu3ZoWHh9/V09NDExMTrK2tXYCIIgwanDx69Gh6DD3S0tIYFRW1m7Zc09LSGqhSxB4qIZLf0tKi+4X5I6hwwSgejzfb09Pz/YABA5jgNnxmRj1toY8ZMwb37duX87X9zePxyPHjx4tT7yXF4/GWjxkzptfypCFc+9Z6U7X7XSNHjsSFCxeW97WYvoUvISJn3bp1ObGxsffpZDg60Q3+BQksJEkSvb2931FhOaDq3B9S9/IJgsDExMSrtIUuJiYGYWFhm6h9z6eS4r5qodN/i4mJQWNjo196evp+Z2fnrpEjR/bOIwNt8EtIhu1aWlq4bNmyQnp8urq6TxnJonwpKSmcPn16r4XOQFTsP3v27DW+vr6XXV1dH/v6+v5aVVVVd/nyZUPmGHfs2JFJVWV8stApBUdMVAwL8vN3ioj+zkInuFwu61DTIZUJ2dnL7awtb42NicYtdZuSt23cmBQS4PtaV10NVYcOwqiw0Jfr16wPpCo4hk0uKl4b5BeAMZFRLzZv3qwDABBrZyeGiCJJsdHnB8pICB1tzLD1l+M+AACrVq0So/cWyWLB4cM/m00qKEiaM316ECJyQgP8Z1sY66O54RiMCgl6Po1XMuHhw4ejaX5jZ2fHFhHhQMH4ccsiuYFYMqmoAhHlv0R3S6rnL7QyNUF7S0tcs3xpPrWHRbKyskQBAOo2bYr28fbEcl7JfIIgQFVVSdHdzaVn/vw56VQmf4m+hgaGBgW+ffDg5ihqDf4xdem9EHnO9nadNubmgmMHDw4HAFZtbS0HEdnTpk5pmDd39oMLFy4o0V/avbNhgqG2Vo8EwEdlBXnUHDEcnW1t31mbmp5ytrM9lRQfd3xq+ZTdOVlZwU1NTToM64kGlpAJ8fG9l5eRLszJSMW4qKiNHA4HeDyeCH76v2Tq2IRLwwcqoLK8XHeAmys2NWwNAwBIT044oa42AmdMr1wOAFDH5bIe3XqkHOTj0y0vJcWPCQ8/zWKzgVdYOMHH2Vk4f9assQAAm9ats/Fwcfxoa2Hy8cCeXQHMsjtEFA/z97kvLyPNt7G0vIOI/Zqbm9mLZ88eljo2DjevXR3zNVccIhIM9+2A2bNnz3N1daUz3GkYUyHttiVJks9mszE0NPQcBVPKojR+G19fXxoPnA8AOHTo0N56aFoxAAD09vZuo93Wf7bZmGNubW11Ki8vb7KwsPjMPUr1LyQIAi0sLN7QKHRfcIeyAAAuXLigOmfOnDmhoaEX7ezscPDgwSgjI4NSUlIoIiLSW3bVB4QDAQC9vLzwwYMHX1UYaML/4YcfMigITGSz2Th06FB0dnZ+W1ZWtri1tVUPEeXT09P3iIuLMzOLBfAJSe8zlzv1Hiwqp2FMSkrKzxRwB5IkKaCFHs2c4dMpb/w+WfrfJNCpBC02AMCGDRsmUeAvtEDmjxo1CqOion6tqKjYX1ZWtt/ExOQ1Y217ZGRkMC4ubjvdX2ZmZgOjDBGtrKy6Lly40J9+FkEQQGPXNzY2jg0MDGxTUlJilngJWCyWoE92e2+WtL6+PjY1NWX8gcJKAgCcO3dOPyoq6g7Vd0/fGnv4FzZ9L2SumpoaTpgwYSsiivaFzP2zKhdElMzLy9tOefhooUlnzwtp5YsuyxMTE+spLCw8snPnzsmJiYk3+vXrR5cxCthsNo4bN+4qXRJGCfTN3yLQ6bVExBEVFRVNZmZmKC4u8qVcdgAAkgJJREFU3rumdPiCFsxAnXswfPhwNDIyQhsbG7SwsMCIiIh7T548GUELa319/fv0/vuSQKeV2oqKilzKnd97KSgooJubGz8tLe3ArFmzdi9cuPBHDw+Ph9S8CD8rS5SSwuysrPkUD2YxFXOCICAxNq7J3dkFYyLCXtRv3Bhy7eJF/RB/f1SQlcZBA/oLddXVcNAAebS1tOipnj+/F9jo119/1Y2NinweFRr6pvXECU2a1iomFzWPUJJHKxMDrFkwN5HKGeAAAFw6d057XEb6Tkcba9RUU0V7CzMsK8w/hIjk3FlTg3mTCw+HhwSeC/Dx6kmIie5e/sMPEwjyk5dj5tTpS7i+PlhVXp7DXBsej0fW1dWxqGewSBYLdmzZlmZhYNjl6+qGN6mKFACAlpYWi+iocExKHHsWEeV4PB6ZmZmpERTo/+HM/v39KDpS8HVze2pjYY7r16+mwkRc1v+lEP53JsUhtXk/mFtZLmnaty9nz4H9GQBQkJKSQjx+/Bh8fHwifjlxbOXexp0HyiYXv75963b/murFuhwOB7y9PNhPn794SLJYTxXkBogOUBzQnyMiQnR2dkqeP39ueEdXR/3SxYshMzn5x1kLFpQSBHGd0rbehfsHnCBJctjHt++FY7R1H63uWU8AAEmUlwvXD1MxvXntutbHjx87hw4cIqapqbXEI5C72cjIiGNhalZ5+9btxn2790Tv3bV9vYdPQAvU19+vXVy99MXLFxm//XbB+OiBA9lb67f4dbR3EB9fv258cPv2mMqp5bvPnzsrYWdt+8jJw/sYIoqKiIh0dXd3Sy2eN2fGlavXhw4dNozw8vK8SLt8Lp8/L9564Xx3T0fXFUrofuloWACAnkePHmnExsbuPnjwoOqjR48EVIYpi8qqYrNYLIJ2D6uqqoKPj08NQRDCBQsWiNTX1wsEAgGfSrphkSRJmJiYgK+v7xoJCYmXW7duzTh69KgoJXC+yd1LjY0MCQkRPH36VHXBggXzJkyY4Hvu3Dl49+6dkMViffL9f3omUi5AGDBggAgAvPyCG5IEAMHGjRtTi4qKqlpbW/s9e/aMdqv+LgudJEmSeeQp3dejR4/g1KlTXxszSRAE/8OHD/qxsbHV586dE3zKp0Pi4cOH8PDhQ5kLFy6kHz9+PE1OTu7e4cOHR3R0dACLxWLR7lMRERHo169fr/uSygIXkCQpmD9/flJ6evqSgwcPstrb2/ksFoslFApJyj2JAoEApKSkWMOGDWPdvHmzb2b2NynIlJuVP3fu3GlLliwpOnr0KJ8kSZI6RQ5u3LghuH37tp6UlBTw+fzerGWSJGnlA/h8PsGcS6YrtqOjA548edKbFPfzzz+zHRwc+OvWrZu5atWq/ObmZqAsUxqb4LP5p9eVZvAsFgtkZGTuAHw6z575LnZ2dqxDhw7x9+zZk15UVFS1f/9+aYFAwGexWGyCIHrDHXTuB5UUyZKRkWEZGBigu7v7hsLCwniCIPhfOlq5z8RBcHAwq7y8nH/27FmTsWPHrt62bZtWW1sbnyAIks4GF35aLJLD4RBycnKkoqIiKCgoQFdXF2zevNm6rq7O+v79+8Dn84HFYpHU/Z+Nlamo/JlyUV5ezj9x4oRHfHz86h07dii+efOGTxAEwWKxSNrDR7vPlZWVWRoaGo8MDQ3viYqK1qqqqr6VlpYGWVlZkJOTuzBo0KC7NP3S4bOv5BMQhw4d4iMikZGRkXDt2jUBBejDEgqF8OLFC2xqamKJiIg40Ue0UsfO/q5LUVExeP267RYiAs/Ojig/dIimM8GNS5e0F8xfaOnk5Dwlr7BgnpiY2JuUxPiTJ44fF0iIS4C7u9tbdQ2NSZcuXws5ffoXh9WrV06vnj9/ZEZ2dipBEL89ffDAOTsn+9fVa9f+gIhOZWVlQhL4HIJkgUAgwJ6eHiAIArlcrhAR5eOiwvde+u3isH6y/aCnuxMuXrjQ+aGtzZYA2MSrmhVKkuQWBIArly+rLFowd2vTvr1z9uzYeVpRuj9/xtzZqQqKSj8WlpXNNzIy4nh7ewsAQPjkyRNWeXk5XeoIQoEA/IIDlyyaNcd4zaqV8aWTJq1duWTxzGcvnqk2bKkbO3TYsMa0tMzYkJCQD/X19cL83PHxKiNG3DNydn5f7+ICHA7nRWxY+MvXb9sUXrx40/MplPUPyopjwORJZGdn/uroYIc11QsrJSQl+sTnNhpXlE4eb2ttkaynrR2UEhfn+duxY26IOIi6FBFxACL2p7OF9+3bpxEWHDzLzswMs9PSbiKiDFD1p0lRUVuLc3IwKylRuKamtoQgiN4awF319TYuVlaoKC3VbjB6FE4clzmHqcwUFuRNMNTV4rs52L1dvGh+KhVfgsULFsx1srXpDPb1RWtjY2GAmzv/zpUrEckJ8ZdVhgzEwXKyqK+uhtGhwRgVHvIolBtyOsA/8LmjjTVamBjjjKlTGhBRBhGJN2/eqIwbl7UxMMAX161bJ9O3tIUB98lev379OE9Pz3s0shSN4w0A/P79+6OHh8fLhISEO4qKiggAQlVVVdy/fz9tDYgAANy9e9cyLCwMAaBLTk5OWFpauorGFV60aNFUyuXYRVno7xBR82sWOr2mHA4HDh48aOvp6XmfsvL4AMCnsKnpeCCKiIigqKgoampq4sSJExf1SQIkaMbf2NgYbWZmRp/q1GulMbHjqffuRcQCBhodAAi0tLRwy5Ytbn3d9wxgIzkqgUnASHxCRgIUn2Gt9LUSBaKiopiWlnaRYm60dSVeWVm5khJYzETAz+rXNTU1MSUlpa6ioiLG3d39KTMU8WcWOiISRkZGdLLeFMr92Yuux4CRpSFoe6iL6Snp6devH8bHx/da6JGRkQ2U16MHANDZ2bnr8ePHCkxrduPGjS5WVlZd8An2V8BEFuuLrtYHnlior6+PLS0tIX1c3QQNXDN9+vRS6iQ5ZFrlDIu8F5xHRkYGLSws+ElJSWuam5utvzXxjYlitmnTplAHB4f3NOBLH5hWoaSkJFpaWvITExNPJSQkxM2YMSNy9+7dMZs3b44pKCgo0tbWfkcpcEImuEp6enqvhS4qKgphYWEbGImmv7PQaa/b0qVLYzw9PXvDFswzB5gHrNjb23ctWrRoASIO+IJg7ctrCUdHxwdMC11GRgarqqqaqO/StEAmJCQ8pfdon0NwhBISEmhlZYUmJiYoJib2JTyDbnk5OQwPDc1mehvodS7JL3LiFRXjwYMHbT8ZLK3DfTzchbISEkIfdxc83rzfneZxi+bOXWxqoI/GY8ZgbXX1HDb707G8aWPHzgvw8sbG7Z/wScZnph4ZIi+LDtbm2LJ/XwTFP8hNa1fFWRrpY6CP5+nWX074jo0KP6s3ShUHyUh12ujp4oLplcl1dXWsrCx3UeqZSiGBAW8zxo49Ny4x8bSTpdWrBw8eDKXDt31Cf2xEHL5v375hTU1NKpdaLw1fvrC61trQUDBUXg51VEegs6UZVs+uSmOux7x580akp6V+nDFtSiQ9PyIiIhAaEHDJ3dkJ9+7dZfM/SQj+Owl1uezszG2Bfj6YlzPuUMvevRb0sZF0k5SUBESU2LezIT4jOaEi0Mfjl6iQYIwMDsYIbjBy/f16IrjBW1atWDGOPvYxPT5+vq2pMc6ZMbWCLk+L4gZdKsweJ0yNj8PZ06bNBQCijscToVzyEhMyM5v11NVQVlSky9/dhX/p7Fm/fjIyQB2B1z9/XOZFJVlpga6WJoaEBJ9eVlsTQbJY0FBfb1CQk73Lycam08rIGB0sLHBg//5CM32dDxkJcRdz0pLmOVqZp4QG+uf7+fgUx8bG1UZFRIxrqKvzAgC4ev68SmFuzs/enm4YFsbFysqK1Ygo+qWM7ydPnozIzc09xgAIYaKK8TU0NLCwsPCHly9fDkVEpZSUlF6hExQUdPPly5dDaTfYb7/9ZhkUFIQA0KGjo4NLly7NooXp4cOHgyk3eTfltv6qy52G70VE6YkTJ26iDm3pZUY0AyZJEk1NTTEuLu5JYWHhz3l5eRurqqry6MxWek9QyUCwfPnyRVZWVvR3hV86gYpmOCoqKmhvb98lLS3dF4pSoK6ujlu2bPnsEAY65oyIIpMnT26mYsb8vs+gT0Fjs9lCNpv9OxQ8em4zMjJolztcuHDBLjw8/DzlKv5s7IzYMtrY2HRt3rw5hf5eQUHBJaZy8mcCnRaA+fn586j90N0XA5zp6oZ/Id0x0e74kpKSGBER0Uhb1DExMQ0iIiK92dqZmZlddI4HALB+++03TXd39zcAIGSz2cJvxXKncxqsra35T58+1WPsnd5s4sLCQh6lBHXTWP7MQ3HoEIWMjAy6uLgIKioqtpw5c8aRTs6iKk2+CUqZxWLB8uXLFzCOu+UznwEAQhsbGywuLj5w9uxZS1HRL+N/lJaW8qiqgO6vCXREJIODg3czzjDosbCwwJ07d7rS4wYA2L59exxdCQIMuFaGcikcOXIkjh8//tDRo0eNmXuBOoiGBABiwYIFn80DIhKpqakPGAcL8eXk5HDOnDk/Mr0HiEhmZGQ8pHkLQ5EQkCSJYWFhN58+fep/5syZkPT09HuUUBcwBfoA+QEYFxOTyVQAabrLTEr1CAkMeo2IMjweT4QSoj3SoqLCQB9P4ccXLwYz53b31q0xznY2AgtjQ1xKIa3VrV8TEeDpIRyfmlmJiAqRQYGvBkhLYXxkxB06p4EkSchNT99iqKEhKJtUVEu929CwAJ/7KooKghH9+2NMWOg7ugqJVqZyMjNqQny9MdDDDZNjoq4Qn/ZVLxhVW1vbyBlTK2cFBfifiY2JwqiIcIyOCMfUhLHobG2NI5QUcfgAeRzYTxqHDegviA7lXlixbFnaokWLBq9cWWu4aOH8JwV5uctIkuw1rN4/farn5ej0NiQo8CYiDoA+0Ob/OKHOYrFg4Zw5kyNDQzDQ1weT4uPuxsdELczLzp6fPjZpYWpCwkVfd3e0NDFCN2c79HJ3wcz05IeJcTELxmWkN2ZnZbT5eLhjsL8/piYlPF23arkTIo4M8/MRBvp5XSJJEi5c+EV1bEwEzp5euTQqLKQtLiqqRUREBJKNjDgM1Lr+vOLCo05WFjhEQQ49XRwxPTnxaFpiws2czFT0cXFCffVROEZLA02NDDE0MAAnThh/mAJSgFtXr5pMrSirDfbz+2gx5v9r763Dolq7/vF17z0zdAooiArYYIOioKRig8TQjYKkIiAoIGAHNgZ2B9jdgB3Y3S0GStfEXr8/3Jt35NFzPM9zzhu/73yui8tgZud9r16f1QNHDR4kWTZvzvIrBQWRKjLscbJtYneKL3SKCAt6ZWTYHEOC/L59/vy+V1PPnFtMJSUlRgEBAc9YakaxDIc7AwDSPn36YHZ2dirX4ldcXGxpZWXVmHvT1tbG2NjYrZw1f/PmTWtXV1cEAGn37t2r792714M777lz5wLt7OwaFbqLi8tP29bYd0gpKChASkpKnqGhIZd7lMrmiFVVVdHX1/d9QUHBaEQUKCoqAp/P/6mgRUSyY8cOe2tra4769V84q2UVavv27XHmzJlzqqure3l5ed1mc9ycd8F07twZd+zYYS/7LIVCoQAAYM6cOWns5DlxU2XOCdAm55Y2GdgiFQgEGBER8Yj1roJdXFwa71uWMpT7vKKiIgYEBFQcOXKk0aPcvn37uJ49e/6s1fBnCp0AwHcBNH58BlukJ5adm920jUtfXx9tbGxqLSwskC3K4z4jIYSgu7v7Va5wLigoaL+CgkKjhx4REVHHChquSnk3ywIn/qPhNfDz4SyMmZkZnjp1ylvmfmhEVE5ISFjSpk2bxogTVwMhw84mAQCmU6dOmJqaur+4uNj+z2p1/ihnvnPnzmhLS0vO8JTK0rLy+Xz09PSUnDhxwpMzuLjoC0VRUF5e3vbatWsey5YtW+Do6HiTM8R+odABEZW9vLyq2FZBBgDE1tbWePjw4aEyqQwvdj9KZCcMcsxzrBGIOTk5c7g2LlYRye5Hvmzrl0xUj4SEhPyQQ9fS0sLs7Ox1srluRKSCg4Pfc5+TWUOiDh064IoVKxpbf8+dOxfGGkNi2XY5M1NTXLxg8Q81EpxDMjkheXhk2JhKRGzHHWfR/PnzrMzNsY2BHkaNDr11+uhR51PHDg86un+PW86iuTMH2liLtdSUxC5DBzOrly4ahIi9hzrY4ggHh51zs6bNNTUyRuchQ3Dbhs2u3L1u3bA2sk+XbugxwhnPnz9vsX79+u9T9zIzD3dr1xaNtZuhZffun548eaLAecqISPqYd3fydh/FCJ1HMOkpEzfK1isVnjgxLCwgoGqQrS0G+/ti1NjwvX7enuP9fXxCQvz9o5Nio5dOjh93NVDo/sLZadDnQbY2tUMcHTAsNBijo8ZiauqkmiOHD05j95giAICysjIkxMTkDbKxwWWLF0/4K4Wc/1ty6P/SPkIIIXEJCdPvX79+dtOWLS6fS7+MpigqtrKiAgghUF5ejs119erbtm93wbijcWFwYOAuNTWdlzRNNwgUFKCutlYZANTnz54deu/hvfDzZ8+eev7g8f6PH0qICBklJSUlKCw8H1QvEmFCSurE7NkzP9578DB91aq1/sHBAVvg+nU6Ly+PRwgpQ0THHRvXj71247rPt2/futfW1lirKCt/rq6sOmlsbPysW5eu3zSa6aCmtibz7u3b8qdPn42NGB12JmfFSldCyDUAuPa1pGTpgT37PO7du2W9K39X5M6dOyHI032SpbX1gsDQMRspmi4DAPjy5V3HKamZx06fOtXG3s7+Y+josBF6ei1vyLYtcAro3r17rWfPnn1m3759xtXV1WIej8dnc5WIiDh06FAqMDAw1sfHJ4fzEpOTkzddvXoVaZoGhmGgurpa8vLlS6XGl/pfgoqqq6sr7969+y2Ztg2azaMil7NnC7dAtu0lPz+foihKmpWVtWTFihXCd+/eiXk8Hp9j7RKLxRITExOej4/PlcTERG8tLa1XrADiAQAJDw+H3NxczjOG/Px8hqZpHD169NILFy4QHo9HGIb5qcfFsrdhly5dwMXFZY+qquqNsWPH3lVSUupWV1fHsG1GyDAMQUQ9AIAHDx4QtmVPlJeXF5idnT3t2bNnUh6Px5NtR0NEBhGp7t27g4WFRa2SkhK+ePFC4cKFC7yKigqgKOqH1juusOHixYsDjx8/DlKptI7H4ynJ5lEREdXV1amgoKDSSZMmDTUwMChGRNUFCxYsnTt3bvDt27e5vPDPE+UA8OTJEyIUCqk9e/aI4+Lipufn56e+e/dOwuPxeFz+nbsmljFP2q1bN1ooFK5LS0ubcezYMevVq1fHHj9+3KK2thYREZWUlEBBQaGSfccglUqBYRhARIaiKBCJRJcBoAwA4NKlS3aJiYmDZZnyZPLjf0SyAxRFIcMwpHnz5iJra+srbJsiAIA0LS1t2c6dO4PfvXsnpmmaj4gg244llUqlysrKtJOTk9TOzm5BfHz8xBkzZgAi6ufn5/tfvHixeUNDA79///6fnJ2dD6mpqd35WcsnVzNx5MgR23nz5s29cuWKhKZpWiKREJqmUSqVMoaGhjxHR8fzSUlJCV26dLlqa2vLKyoqkgKA5OnTp7127tw5PjAwUPj582fFz58/w+vXr7naB+oX908rKCjUDh06dA9N04GIyAAAiMVi4FiEELGFm5vb4r179yL5TjVHOONBKpVK+Xw+PXLkyMrIyMjAQYMG7QcAKjw8nF61apWYpmkoKipyOXnyZO+UlJShFEWp7tixY0ZgYOAmjumRazmTqT3g3tu/jDkViUQ//JthGAQAHsMwYGFh8SovL4++f/8+0dTUfKeiogIA8APBEgECFE01NdQRACBsdPCbGTNmqXm5e5xbuXzpoojImE2EkKQlc+c+KzhbMOfe/bvdS7+W7ldQUABCCFRUlMOHDx9AVUUVrly9DHX1tYfKq6tuvX//nuFTPM+LF89DPyurj0IvnxBXb+Gx61eu9Js2JXX2qZOnbLS1dSqGj3T269+/fzF3HRXV1QoSCYMikZhp06oNr3379rKbDPSHOmkpqygThmEktfU1EtZIF797965HcnzCwbdvXlEjRo6cmZSaOk27mXa9RCyG3bu3+jx99ESJJryXLQ0Nvxm1Mf7Upaf5PgBoXl1R0ezU2QKNim8VehKJZP+w4SM/AABs3LixHhGVpqROWnf3xi2hdX/rm1Fxcat19fVpoVAo/bOWxv9xTxwRqYKCAh4b3ia/qmzlKuCb/GggolZTcgH4CZk/IirkLl441aGfJeprqePQgXb3KYqCSSlJ+2KixkrYgh9BVNTYCz6+Prh27SrPn4XSaJrHXbfG90IU8rP76jA2NOSoebcuOC0zbQVN0z+Mg1RSUoLRgX6HTVq2kPTr2R1t+vRBd2eXb2GBYSsGOQ6Kd3Z2ruhn2QfjY6NvVn553+lnVb+cZfvw4UOLvn37SgGgQSAQMLK5Y0tLSzxx4sRYgO8MeUuWLEmzs7OTyrZwAYC0Q4cOuHLlylju2Hfv3rViPQLs2rVrKRuuIgAAZ8+eDWFJI+rZUNsDLp3R9Nry8vIi2EiASLaNCADErVq1wtmzZ19kaxn+sP2O+/Pr169dHBwcKuA7ZzTzq3Aud18BAQF49+5de9a72MWG3TmPW9y6dWtcuXLlLlnLuLCw0HfYsGEIAFI+n8/8zIsWCoUVR48edUNEbUTUqaioaJ+QkHC2WbNmSFGUhPN+VVRUMD09/QEhBPbv39/Nx8fnga6uLncN3AhYqUAgYEaPHv2+tLS0M/uMh4wZM+Ymyw//L2kFLlRuYWGBJ06c4HKSiqxnlsUO5vmXyViyz9/IyAjnz58/R9ZrXbdu3Vx27K34Zzl0f3//fWxtRp2ioiIOGTJkPmcARkREPOBG1MqG2n9zlCcDAOjk5FTDrQc2FJzFRnYa2HbJRq+fS9fo6upiXFzc+U+fPnXncpgrV67MGjZsWKWpqSnq6uqilpYWduzYEUeMGCHKzc2d9IuaCYKILT09Pb+y1ySVGRTEmJmZ4axZszZwNTJcKBwR1RYtWjTdyclJxIbXGyetsVX9P4xwbeKhEyUlJQgMDNwrSyzTr18/3L9//xAAgIiIiK2y61a23VRTUxPHjh37orKysjPXEsXd07Nnz8yTk5P3Wltbo76+fuP3evbsiePHjy+8ePEiN3+BxMXF3ZCJJEhpmsakpKRnrPzjUqCUn5/fexlPvnFPsARDnjLyYwTbUcHIrF2RaefOuGDBgn/pYhAKhTRFCMydOTtjkJ099jQ1xdHBQR/Wr15tDQBQ+vat4faN61MWzJ2ZvXrZ0hmb160J3bllffTalTmLxoYEfzFtayLRVlHGzm2NsW+vnhjgJXy+ZN6cNERUefnyceeE2Niz1uYW4pY62qinpibxHOF84fLJ04EXTp3yOHPwYNDk8eOzLbt3r9dRUhbZ9TLH+dOmL6Bp+ocpmykJE/Z5uo76Nm5sREWAl+crduiXQlxUxGnbvpZMTna2DwDAptUrBoUE+l2wH9AP3V2G4CAbK3SwtsThjnY4sH8/7Gfe42tYYMCLQC9h8toli/wRUZtjhiy+eLFrVmpqiq+3Z9WQQQNxcmLiOkRs8Udttf9jHroMR3oj3abMZmfYkJ1sWIzKy8sDoVDI5Ofn08uWLSO/IAUAgO/sOx8+fJCyRB1S2dD9qlWreISQBkLIlMTxcR1Lvnzy7NWrl+jY6SLg8fj1FZXVUj6fD2wF7KjQ0OAtZ06f3hkS4JfQorn+msFDhrxSVVUUP3z6vOPRo0clnm6jjIyNTUIrKsruZU6ZnBcfM+6suq7ui327dw+7cvFi2LBBji5vXr0EgUAAhQWFYefPn17Sr5/dQ3YR87Kysupbm7Q90/3bN6ek8fGxW7ftGPrq9dthTz49HKtnoA+q6qoFHh5eGwICfPMJIXVCoZBuyi3s6enJICJRUlIqjomJKXz8+LFDWVmZmKIoHsMwjKqqKj148OA8JyenlUVFRQ75+flzlixZYvHs2TMuZEyxuU7KxMTkYURExLrTp0/T+fn5UhkPnauabTx3bW0tT9ZKrK+v/6H/mK0gliKimre3d+bFixcZiqJohmE4z1DcunVr/tixY88nJycPIYTUICK9YMECr8+fP7d7+/Ztbc+ePev9/f0P6+vrv2RDgyQrKwueP39u1tDQoM6GzemfVAv/4LxKpVLQ1NSsI4QwYWFhjCzZBSKCSCSCL1++SFnLuOHZs2ftJ0yYsO7IkSMctz3nAANFUaigoEAFBQV9ioqKcuvatetFmXOV3rp1a/n169cHFBYWNlb4IiIoKCgwFEWBi4vLHUS0njp16ppDhw65Xbt2jYtEgbq6OunatesZY2PjhytWrFiYmZk5/ty5cyAWiyUURfGaenccEQtLXFPLhjnr4+Lipu3fvz/t/fv3YpqmeT97PojIqKqq8tzd3W9OmDAh9cCBA7zo6Gjq/v37jIGBwSOZ0aUMwzDAeYScBydLflJRUdHIg6qmpsbw+Xyor6+XslXyhHvef+Sd/yTVpsDu5xHXr1+f8u7dOwlFUQKWEKXx3BKJRGJqasrz8fFZlZaWNo4QUo+IGjNmzNi/Y8cO23v37oHsui0rK2MeP34s4PF4kxFxByHkFeepZ2VlAUVRmJycvPTEiRParMKieTweisVi6NOnD4mJiRkXFBS0ZNKkSZCRkSHIyspqKCkpMR47duz+kydPdn3x4gWwRZ40IQREIhHXscBQMrm0JuyLBBFRKpWKZav/NTQ0wMDAoIr1zj2rqqokAoGAJxaLgV2XjKGhIRUeHn4wPT19DCHk05AhQxSysrIaEFFl/fr1C8aNGxdcVFQkqK6uZth0DYWIcPPmTebp06e2IpFoByJ2VlBQkKakpPxwUVKpFL59+/Yv4SDZVJgMlSw21QU8Hk/8U9ImQn5W/d5I6TwpbXJW0enT+7dt3rzt1Jkznd+8eXP0yIEDI3VatSoCgNmy3zm0b59N4emzLi+ePldSVlSmbe3soVOnTnt7mJsf8vTx2U0IqVDX1gk/eeJ47stnz0FVSRm6d+0BVZWVdEnJO6vc1SutxJLv5SNfPn+B+tpqsOrfT9rf2nrNhLTUlIT0NBIVFUXy8/MBEfmB3t4DdXT1Dpp1Mrt7pqhgxubVq42gro55/vixg6qKIkYnJJz7WPpp1pFjx1LqxQy0NTEpNmrV5lrLli1f8Sii8Onz5xZF585pq6qred++eV1bUVFhdlVlBeTv3QP2Vn3q+AIlkpmVqaimrgECBYW7nh5e80MjxmycmZ3NdQkx/2sUOquQpLKtL2zoTLGysrL1i6dPu/cwN78GAOUAUEHzeMhIpVJPT0/u+1BYWMj8Kv9FCIGIiAjxz0L37F/F4eG5/FWrIqSWln3WPX3y2LOhXnQAEcGsi2nu+3cfvCYlTXLNmJaxlxBSiojD586dOeXm9Zu+BMiq+fOzgaZp0NLRAXVVNRDV1tU/evT4rUBAO71/985p5CnnckYq+aqgqNJWWVEJrl+/Dt26mFVPmJCwdNOWzZP27doXCwBRJSUlRF9fXwQAoIBke5vWrbMvXb38Yt327cPv3rxpfenSJb5OixYlrq6ujzdu3AiBgX4cm9jPepYwMzOTqq+vh9DQ0HESiSTn0qVLtmwbFjY0NMD58+dbZ2Zmzps1a1YiOwCEYTm6G6eeaWpqUrq6ursJITUsaUdd03CwrGBUVVWtZYUSIYSAsrJyvUAgkLLvBj09PWlExNmzZ08/f/58C7aAhuZChG3atOFHRkZeSE5OHkYIqXn37l3HhISElSdOnLD7+vUr1NbWwtWrV+HBgweJBQUFdoSQV5w31bt37wOtWrV6h4gGXMvQn6092barn/xONoyIixcvXnDy5EkBO+CHll1HUqkU+/btW5+RkeHaokWLSxkZGYLMzEzxqlWreB8+fJBWVFSo/qy1jFvrbC9vGZ/Pd8/Pz/fbuXPn4ry8PG2KosjXr19h+fLlPgMGDLDLzs42fP78OacIeIjYqEhlFRoiMjwej5JIJEoAALNnz163bNmykNevX0tomuZzodMmypQhhKCzs/P75ORkb/Y+ITMzE7KysiRHjhxR+FVV9C9C5YR9jrSHh0fct2/f9h8/flz1/fv3su1qvx0j5BQg25Y57O7du0yTIUIc85h0wIABPB8fn9S4uLiZ6enpgIhas2bNOpibm2v99u1bMU3TPIZheLLfQ0TJs2fPVPfu3WsBAC/NzMwobrjGhQsX+sfExLiWl5dLeTwezTAMisVi7Nq1K+Pv7+8fGBi4EwB4GRkZkJWVJTpy5EjYmDFj5pw5c6ZZbW2tmKZpHgDwpFIpwzAMUVNTozt06AANDQ1w7969RrnXRNFhXV0dFRoa2lwmfYLsABkVACjV09O7oKamZltVVSXi8/l8iUTCKCoqUh4eHpfT09Pd2XoGOHbsWMODBw/6xsbGrjh58mSPx48fA5uzp7nUFCICj8ejqqurG44ePdp+8eLFcWKxeCHDMJpN2wl/tg6aTi9j5SslEolAS0urjPv/jx8/6nO2gayOYBjmj9ov0c3dne5vb38LEYfMmj71yNYtW8wWLVp4ZPvWTYnevgEbAQD378kffuzwsfGzpk+3fv3qNbRo0RzcvTxP+ri5jW/fs+cDsVgMXr6+sH//Hrf8nXm5qmpqN5csXTr69fPnnxukUg0pw2hXV5U3F4nEvWvraptXV1dL+wywZhR4igfbmba97+g47PnEzKlEKBRS9vb2ku9zzNNSv5WXqZj26Jo3ZlzsseI7N5NOFxXFeAcH54rEYnjy+DEZZGv9sEXLlqrG7dovmTl7+nIAhedsfcMPBpFIVDlp27pt7b5VlfvdunWTrigrV6cpniItUKg1NetU3rFzl0UeHh6PCCEiW1tbXmFhofS/k8P9dxQ6nZ+fL3358mXnDatX9i4rK7cmhAx68/YtGezkqEoBpaPI58O3L6XfKIqqaaatXRPi6Sk2aNXqlIWFxQlnofAEqxTA1taWx7ZbfQ/tmpoi+QP6U1no639AAGBatGihoK6uDvT3XDOhabpgStqUqc9ePN21bNmSSRMmJM1lX8QURJy5bcMGo2nTpvG0tLX5IOXXx42LQys7q88AUPfy5cvW27dsisnbuSPm69dSTTtbx0vR0ePjs7NnHGekUiL0D5zs4+E6/MaNG/qEEHj8+DHm5uZiVlYWNTEz85uf0P12dW1NRG1t7VFCiOxUL5KXl0cJhULmjywzmelg95SVle3OnDnjkpOTs+LgwYP6lZWVeP78+b7Xrl3rW1VVxSkIIpFIQEdHh66pqYG6ujooLy+Hz58/D0bETE9PT1GTHDpoaGhI2QI4AADo0qXLEx6PJwYAPiEE2rRpI2U3KQEAzM/Pl6qqqoKzs3Pg+/fvkaOgBACprq4uHRwcfIn1zKsPHTpkFRkZefDUqVPadXV1Yk74V1RUSF++fNmGYZgiROxJCCljFWLdokWLNl+7dm3S8+fPRQKBgC8Wi8mvPEBWgOEvFAdIJJIf7lVbW/u1pqYmKSkpYWTzwAzDMIQQuqKi4lKrVq0u2dra8rKyskRZWVlQUFCAERERjJ2dnSJXW/Cz6ykqKpJy/fijRo3a+vr16zdisfj07t27eYQQfPz4Mf348WNDthCLBgCK9UoZbhAH62WR/9KnFCgrK38khMC3b99sX79+LeUEMVunAE0UGhgZGdEODg6+enp6TzIyMniEEIlMOI/XVHn+oq0LaJpuFPCmpqZ03759z9y6datbly5dAs+fPz++uLhYkx2iImUVFfVnnrqSklJjik0ikTxSUlKi6uvrxTweT/ZdSLt160aPGTNmcmBg4CwAgCNHjjgGBATMO3nyZM9Pnz5JeDwev2l0gr1/UlNTg+Xl5aasZ9j4u8LCwrFPnjzhGPpohmEYIyMjOiQkZH5cXNxOAODl5eWhp6endN++fWMXLFiw4tSpU9y+4rPcARI+n8+zsLAAGxubozY2NtOqq6tbLlu2bMOFCxcUufoK2SUKAC3Lysr6sYZbI12tiooKIYRIbty4EaWkpHT48OHDRk+fPgU2FURraWm945Q5Ihrk5OTMjouL8zx//rxCfX29hKIomhBCc73h3J/s2qdLS0vx3bt3vdlZAdKmHA0/U7wVFRXYxFAlbFSCd/v27VYy/ARK7PexqUJTVFT85ftnB0vx2CE5/RBx7qGDh8auXbVm+bIly6YiIKopq+iKRWLQ1dGF6opKxsXF5djMefOGT5oyBWwBeB3Dw8mkSZOaTc1In37i2HHxkMGDNS9dvmwREx9/lBByX+Z0uzS1tKDs2zeeQEFBImYNezbygPm7dkk/vv5oMn3W1NG3b9+d1LZjh8KUlNQCQkidm6vL+TaGreMAIN3EpG3JjZs39JGAUmhQsLfDkOE7Z83JbixMZGfTAztUhyFE6RUAvAKAU43noyhgmjxv1tCUEEIgLy+Pzv+TBnShUAj379/HrN/Uh39ZoXPCixAi3bF5c9ykiROm3rl5S8OwVSswNTW719bEeAnN5wmaqWtZHz9yxO7Fs6f6PD5P+9mTx8AgA2rq6l0vXjgXv2//7jtLFs5bGxwWclJdXefhT8pVaaFQCLKT0v4oUkDRVG1lRYWUEMqWz+eju7u7IHNqZkZ29lzq3p27c0KDA7osX7k62s7Oro4QUg8AjwAA4MULuFRcDDv37ZQ95GOKomIXz58r3r1rd3w/K6vH/Wz6XclMnbTx+rWrcdXV1Z18PN3v6rVoYc0wjIAQIvpe8GVOE0LqRw4ddF1HVyeUtfylhYWFlJ2dHZOVlYUcD/bvFBByk9H69u27HxHv+vn5HcrPz+8kEokkIpEIeDwejYiEYRhib28PgwcPXlNeXm66YcMGq48fP0pfvHjRe+HChe75+fl5TYkvvn79+kNlcGVlpRL73pHP55OqqqpGL7mgoIBnb28v2blzZ0BGRoYSa4jx2PAtZWZm9iYzM9OaEILl5eUm7u7uO06fPq3NVu/yOWHGhovFly5dar179+4AAFg8f/58MmfOHHrcuHEzGhoaeq5atWrI8+fPubwfxXlyslzjPB6P1NTU8LjjNvFwQSwWw+fPnxEAYMiQIQpTp06NGTlypPaFCxd8vn79KqYoivN0CSKigoKCsUgkak4I+dx0+hGfz6/nuNV/VbjC5RyFQqGgTZs259avXz/l6tWrs968ecOF1hlCCI9TXojIKCkpUd27d4dv377BkydPfthiUqkUGhoadBER7O3tY27fvn3k6NGjEoqipFKplG5SkCYVCAS0qanpwbCwsAsrVqzgsyQYP4TjfxLah18VHnIhWCUlJczIyKB69OjxEgCyPn36tCU/P3/UpUuX4i9cuNDy1atXAN9nBlBcCP9nvOUaGhqE89BjY2OPfvnyZc6uXbsEDMNIWSITiY6ODs/W1jaXU+YHDhyIWLJkycqTJ0+CVCqV0jQt+/z+5RwsEUtTUibo2LHj/t69e/udOXOGZg041NTUhJYtW95k271oT0/Phrt373ZOSEiYferUKSnrddOc5925c2eenZ3dLVdX11QnJ6cj2dnZsG/fvpDKyspfRpIqKyvrvnz5UgcA/EbO8+80shIAgF69ej1AxN69e/e23bBhw7rz58+rV1VVifbs2eM0Y8aM6RRFlY0cOTKhuLhY/+PHj8B2uPBkCleRLfiT5VUnDQ0NpK6uzhgR4cGDByvU1NTmlZeXN0a9KioqsGnYXENDo3HQjoxxgqWlpXD58uWW3Oc0NTUrubY82f1G03SjAf2r6YBZWVkStj21CgAiD+zdVbh3z77Qe7fvqCorK5P27dpds7K0WkDz6A7Hjh9b3rOH+YaqqirIy8sT3L9/n8nKyhL36dlz5IvnLzrr6upCQWGh8c0bN3N37drVEDU67LpJG5OrDE2q371/N/DBgwddBjrY8hxtbcrVVFQrtJppVaqqqokoQtElJZ+Uw8KDTVVVVXmmpqbzZ8yaNYMdIavo6Sk0FUmk53g8Xt3kpPgt7du3Txro4LjGYcjwnUOGDFE4evSomH324l+lnk1NTQkUFkJWURGiVAq2trbEzs4OAIDJzMzEzMxMzBMKac/8/N/SBZzCt7W15bE6hPnbFDqnzCmKkuZkZ8/PXbl8wqvXr2DQYKdnnh7CjOGj3LfJzPFdtmn5slXLVywPe/P2XYORiZESRVFQ+vUr3L59C548ftTt0aNHi4sKi2pCAnyvGBsboYqqGqioKj+2GzBgQ6euva5xNyM7G70pCgsLoaioSGravl3o+/fv6ZKPH62WZM/xjRqfsE0oFAoSEyemL1mwoO748aMzwsNDqcLCwqCIiAj+wLIy5v53yscfwD50OisrC2PGJ6TduX3X68aNGzYAACPdPJY+efQwbv70qZMUBQr21bU1FT9+2xwArkPXrt0EN2/elBYWFnLGCBYVFf3l8ArnqWdmZvIA4KO6unoZ+wIIKwgREUEoFFaMGzfO39ra+tCaNWtWCwQCK0II8/TpU3LhwoUMRDxOCKloaGigfpa3ZTemgN2UyDAMqKurV3OfLSwsBAAARUXF6hYtWvDZ/2domiYMwxCGYTQePHgw9NGjR5WzZs3adP369VZsWJAnmyPlvIOqqip88eKFKlsHAXl5eQybc3dVUlJaeuzYMd+bN28ql5SUADuakmO3QzaHLlVQUJBw4cKmOXSpVAp1dXWKNE1D69atGUQk+/fvD0tOTlbLy8sb8erVK46JjJJIJNKysjLjJUuWdAeAE56enjQASJ88eUIAAEpLS1U4r+Q3csZSAIBPnz6pcKMr2e9QDMNwnhTq6+tTPj4+V+3s7Ca/fPmy7YEDBxafOXNGwD5PimEY0NbWfgcAMHjw4KPLly8fwzDM6pMnTwLDMFJ2LCknyFFBQQFMTEzeEEKk4eHhlOwYWJlK76Z50p/ejFgsBtlRotyIzQcPHpDmzZs/B4D5iLh906ZNcWfOnBl1/vz5js+fPwc24kTJjvNs8lykrNf/ZPv27aFlZWVbTp8+TXOtUjo6OuDk5PRo6dKlcPz48eilS5fmHDt2TEJRFKE5JhSZFAXXydHESJHtxpCy952/e/fuGE1Nzen79+/XZBhGcvfuXTx27FgWIu4jhIgQkUyfPj3kzp07GqxxLqAoCiUSCTo4OFC+vr4JYWFhawghlVVVVc23bt06bcGCBWPu3r0LLMvgvzxLdXV1iWzNBffo6+vr+WyLKZ8dOLL72bNnr1esWLFh27ZtZrdv3xa8f/8+lcfjwcePHxsNJk6JMgwjZavMCWsoUrJGjUgkgtraWkX2GX3W1NSE8vJy5Lz5qqoqvkgk4rPRSm4Q0zeKoprLzpkHACISiUBNTa0Vn88HsVgMpaWlamx0iGFbDxvXjFgsRllZ8SeRR+Ls6rETABq9qKLLl2Hp6tWQPH6CV71IDHYDnZ6yA3WkWVlZjEAggAcPH/orKCpWTZ48aebuXbtjHz98pNNcT6/qypWrVkePHLVSVlEBQ0NDaGPY6pZ2My0oKyujSr98Var4Vt5bVFsPEoaB+rr656ampnsGDx+VNXCgzYOZs2cDIirGxkZtVFJSNOnes8cYqVRKeHwFiV7zFtCtR89DAECFhoZK/iyq+jN9yQ6aAnZvNNaB8Xg8ePjwTq/zhRf0JJIGu/q6BhOGkShLGUk1w1Bfa+tqzqmrqX1xdBhU2aVnz3eEkJKioiLIEwpp4Xd5if+pQifcIpqWnjF/3YaNE5SUFCEyMmZZ4qRJaeycZCpDKORl5eeLjuzY3Tt/b97wp8+eM5ZW/ZSE3p5pb9+9vwsMM+rp48cjrl29pvvy+UvJ65evVQQCgcMJiQQUFBVARUXF8dDBQ2PSUhKPmfewWD3Ky+s2IeQN2+xPMjMzG29k1apVvIiICPHatatci06f9nBzc08tvn7d5djx41sO7tpVPsLd/aiZmZlgfGLizLGjQ63u3L3nt3nzhl2rVq3aVyYU0vk/eQmsdSlheYhrp2akH75/90FA4cmT/Xr16lWspal54tyF84Elnz6BmpraGR6PJxIKhQLZaTlq6upoaGhIs33d/xHy8/OprKwsSf/+/f2uXr1qJRKJRDwej08IAbFYzPTv35+ePXu2l7GxceGKFSty1qxZM/rNmzcMABAVFRVKR0fnNdd+xhZyIQAQ/ndTW4kQUgkApHXr1pc0NDReE0KMpFIpvH37VpXP50O/fv2orO/z6ClCyN4DBw6MFolEa0+ePEmkUinD4/HIxYsXNSZOnHiYYRg4ffo0iEQihm0N+qHgSjZHWy9j+cm0M9YDwJgXL17k7N+/P+TChQueX7580X/79i2UlJQ0KhqGYUAgENBsxTQlmxckhFD19fVAUVQniUSiQQipYK+9XiAQjJw8efLanTt3hj58+FDMPkfy/PlzfPToURIiFrDvjHBK8fLly8olJSXAVgH/cpIbZ3SeP3/eOS0tLeXTp09StpBRts2LUVBQIJ6enjfnz59vy97v6SVLlpjev39/3MePH6UAgFVVVTx25O3+jIwMxaioqDUXLlwoEQgE806ePNm5vr5ewuaSZT1C8id58R9SEw0NDZRssZRsyF1JSYn8TFhxip0Q8gEAUhBx6po1a1ILCgrC9+3bp1NbWyvl6FMJISCVSpHP5xMDA4NbAFDFhSt9fHy27d+/H3V0dFbs27dPo6GhQfrmzRtYu3bt2KysLPu5c+c6nz59Glm6XS5cjVykgSvG/I0oFyMUCml3d/dlHz58OIOI+wsLC9uXlZU1HD58uH1WVtYRRBxCCGnYvHnz+WbNmiV9/PiRZmlOpSYmJjw3N7fw0aNHrx49ejQ8fvy4e2JiYt6RI0c6vH37lstj/2r+N2kSIaEJIY+7d+9+FQCIubm5hBX4dLt27YoRsa+Ojk7Orl27gq5fv86w0S0eANAyYXWphoYG3b9//3JNTc3KM2fOtC4pKUEZemiueFWntraWWr9+fcPLly+ZV69eEVbxMxKJpPWtW7ecAODI4sWLBYSQhkmTJuXq6ekt/PjxI1cfAYhIamtrobKyUoVL8zQ0NMhOuWu80YaGBigvL+f/buQR2Cl7nAdqa2tLqqurSXFxsYrbSGenhrqGzyqaKndlFCBhEKG09EsXAljsFxQy2915hIu9gwMszc3tPT0jI2fnjh0jzLp0qZg8efLI7r17X2YvEgQCAXz79Knnp5ISAz5PsbpDN9Oi+vp6mLdwAfe8tMZGjN4iamgY2q5d24jIyMgzAAC11bU0TdOoraX5BRGRbbf8rQJQbqofx+vAbTsAgNIPHzofO3500M1bN5yTExIdv339BpUVFVBXXw9SiQSMWrcGHd3mABQdVV9fByeOnwJlFaW3U9PTj42NiMjWMzR8An9HixvLssWblpa5okdnM+zb07wqb+v2CZygYAcjUAAAB3Yf6OXn4VnaQl0DB9va4prcFQub3HSrmPAxD0z0m0vb6TeX2lr0wqE2/bGPWWc0bKYp6djGENsa6GG/Xj0wIjj0W97WreNkc6JNjmXk5eku8fF0r0ZE/tULhT0HOQyoCwrwfaSgoADmLJHM1g0bAu1tBjA+3sLjsoM0/iiM/33W9Hz7QD8/nDd7dggAwP4dO6xtLHszbdu0ZGKiwjfIFnCxLWwkNTkxP3H8uIPsNf+nbQmNE5FCQkKKWVIRbjAJY2xsjKNHj97v5eX1mp3bLaUoSkJRFIaFhdW/fv3anDvQ7du3G4ezdOnSRbpnzx5hRkYGZW5uzhcIBBASEvKCbacSt2/fXpKbmyuUbZvhNuGlS5ecAwIC3rNtNyIZtjMpyLBdcVSksu1VACDR0NDA9PT01Twe74e2DUQkTegWmx85csR76tSpvikpKedHjx79zMXFpXzKlCnH3r171wwAwMvLazM7pEbMMVwRQtDHx+cdIqqyOV5ushTN4/Fgzpw5a7ipUXw+HwFA0q1bN9y0adMobq1z7Yjx8fHJLPmJiGubU1ZWxmnTpt3jighlWoAUPDw8HnMTsTgKT1la0YEDB+LTp097scdWEgqF9NKlSyexLWkSABA3b94cExIS5nOhNplhIure3t5XuHYnjnyFx+Oht7f3Ebbgj5Jh4OMBABw6dCi2W7du3DsSa2lpYUJCwuGftK3Vs4Nb1rNG0i9ndjd5T60TExNvaGtrI9e2x7Xu8fl8nDx58kUZcqLGKXEVFRXtvb29z7GUwxIej4dsixjThMYWBQIBWllZIbvG/4UVz9jYGDdu3JjetHVN9jkgokFmZuZ+lmWvXk9PD1NTU09x7GEJCQnFLEmRiBAiad68Oaampq798OFD54ULF+YMHDiwXpZ6WWaN/4xYRtPGxqaCvUYJAKCzs/NjRNSE/5p0Bk1bl7Zs2ZLg7u5eww5nkcgQ7ohatGiBERERBxHRBBE10tLSjuno6DQyvHFtgsOHDxcjohYiKnTo0OE9164HAKL27dtjbm5uHLf+AABWrFgRZmxsjIQQscyeFSsrK6Ofn18Od627d++O4tgkZciFxFpaWhgVFTWZW69/VcDJ0AF3dR/lim4uo542LdRDROI8ePDHEYMGXUDE1kHe3tLYyPBkAIBZ06bNHDViGC5btsyJjQIJWLn701nj7DXSiNgixN//ho+HOx7YvTuEyzoholaQv9+rDiatcdO6VWlc2vE37oE0jYy9fv267frc3E65OYuWRIWH7Qn08kAbi15o3FwXdZQVpDrKiuLWutoNLZtpSpwHOXxbsWh+2L4dO7y3rFvnlTxhwuixwcG3rC16YycTE3QdPrx81bJlYew+J/82uxz3wPft2DXQyd4B+/WwEB3YtXeUTMENycjIoDIyMqjqz9X6UaMjvuioqeMgGxvM27Rprqxg4gTl3h073Ptb9EIn636iwiOHZl4/VxiaPTVz8aD+VtL507IWhQf4P7IwNUVNRRUcaGOHc6fP2nnj0qX2LJ+7ClZV6S1fvjwowN//rburC+bkLPEBlsPdqq9FgXmPbhXcjQMAVJeV9bTrb90wbLBTNSK25R74n93zw4d3LHyEQpyclLSTLbYD1+FD8izNe+CmtavjAAB27dplc+DA3gBuY46LiTqQnpo8HQAgV6ZP/T/p6+cE5/LlyyeHhIS8kxn1iAoKCo2sZpwQDQkJaSguLnbgWv8AAD58+GDq7u5eCQAiTU1NjIyM3ALwnUaSpmmYMWPGIW7SFQCInZycam7evGkvu6BlhGPLyZMn3+cUEZ/PR5nxjo094/BfbFqN18jn8zE1NfUsWyz101bIpkKZz+eDkpISIGJbGTYsNVdX15vcZCxZproOHTrg1q1bJ3OGFjcqEljO+Ozs7FU9evTgDBIpAEjd3NxKKyoqOgAA4fqRU1NTJxoZGf1A86msrIxZWVmNCl2GI964Z8+eYlYQM7LMZ5ziDQ4OPs/x2HPCLycnZwnXmw4AYk1NTRw/fvx6Wc5tmefeYvTo0edat24ta5DgqFGjJIjYpkmfPw8A4ODBg9zYSykASIyMjHDbtm0Z3LMNCgpqVOiqqqoYHh6+TTZX+kfrUua6NEJDQ++wio5j7ZPy+XyMj48/JzsUpIkQ15wxY8YKdjKdBADqZQ0hboqbr6/vywsXLvjk5OSsY5n+GG6t/ZlCl30miEhycnLSBg4ciACAOjo6GBUVdS0/P98HEVu7ubmVsUpNDADYpk0btLOzQxlDWtqUDZBT6JGRkbIKXdvGxqZSVqG7uLh8QkRD2T3dZI/z2EKrLmFhYdfYvcUAgNjAwABjY2P3IqKWrCHVt2/fz9yIYk6h9+jRQ3rlyhULAIDAwMC7bNieY3NkgoODOY4JTjEYWFhYVMryQHBTFyMjIz9y1NwFBQXBbB+6WEahi5o1a4ZhYWHxAED9OwpdRr5puo9ye+vn7fNOhiuEAHxnWPMc5fLaw3lkzYZVqw55jXLF4wcODEVEvpvziDxfb68KRKRlqIV/kOUFBQU8bhof+8NPHD/ulK1VX9y2fv14zsAhhMDCefPnWVv2wcGOdkxcdMQblq+D/lXPuJA1fHk8Hnz58togb8Om8Ilx43LHBAQUBXt7o12/PmjZrQt2bmOI+hpqqKeiJDXv2AGH9LfGgf36YvuW+migqS6JCPD7rKb2Aws6qKqqwrGDBwN9PTyet9LTQ9u+fXFVTs4BbormX1bqMjNzFYL8/K707NpFunzJonQZjxRkN9HUtMlLTI1bY5e2JtLlixevBwCwZZU+93AzMjKoJw8eDHIeMghHDHK8xfLngqmpqcDDxRVzF+eEIqJg2YIF01yGDPlmom+AHVu1xqE2dtIxvn7VE8ZGVqVOSMCQwABJYmL8uRMnjjiy1yBAxGYjhgx+09/SskL2Zvl8PvQ1N3/mPmIk3rt2s4+sUPmT+1b2Fro/DfHze895lN3NzCZ6jHJhSp88Ub9+/Xq7yZOS65YtWzoDAODisWPaGamTPuzasWPkn53j31n07N+V09LSDmhra3PCQsIOVpBSFIVjxowpe/78+QBZoc5ttJiYmAPKysoIAPWWlpbiwsLCkdy7/PDhQ5vp06fn29vbM9wM75CQkLKrV68OlH3fMkJcf86cOflt27ZtnNcs4zVh+/btudGssvzfEiUlJUxMTMxnrXDyZwqDPd8Pn3v79m371NTUiyyhyw+0mSzVpnTAgAG4efPmKTKWN8V5lxRFwYoVK3J79uzJKXWJiooKjh07toBVpAoAAElJSWlt2rRBQoiII/5gPfT7MkYCcARKkydP3qajo/MDAQwn+FRVVXHkyJGZhBAwNzfnc3tm+fLlk1u1aoWEEAlFUWJ1dXWMjIxc3TSSJKOUVOfOnVvAjryUEkIkRkZGuHXr1ihZD5j7fGFh4bAePXpIZZXDokWLVnLH5bjcAaBOTU0Ng4KC1sn0rf8pOINx48aNA3v16sXIRA+kfD4fk5KSirmpYbLrmNsbFEXB1q1bR7u6uiJLcyyhKIrh3mOfPn3EV65cseHuPSwsrJL1OrkUksTExAQ3b9487VcKXeZ5UAAA+/btc/X29i5mz4f9+vXD+fPnz3v16pW1r6/vI240MWvc/kAE9BPqWymfz8eEhARZha5lZ2dX2cRDf4eI+k298qaRQc5YXbhwYW6fPn2wY8eOGBkZuZOjeGX3BIWIdP/+/R+y55ew603MRh5mAwBs3749uH///o2GKyFE0rp1a1y0aNFCNkwvAABITk7ewPHTswYVAwDo6ur6RUlJCYRCIf3gwYPhbEqKkTHaJQoKCjh+/Pg8bp/9O/KNk0++3p6Fo0eHljbx0CmBQADxMZEXu3Rsh6OGDcExgYE3EZEqK3upOSYkGF2dnbNlB/78UaQZAOBgXp7HEHsb9HIbdRMR+Rw19NWzZ209XVwwLDDw6ttXrxxchg/DlOSkVdzI2fDwcH5BQQGvoKCAxzpr36mzTx0fmpaUsMdj2NC6vqam2LN9OzTS0UVdZRXUUVbBllqaorbNdcVtm+vhqMGDmTlTMxfeunp15KmDB11HB/rfMWtrhCZ6epIof/+L5R8/mrAOsEAm+tdyyqRJt9q3MsT+5j1x5dKlc2Tv5y9753Pnzh1obdkHI8JCC5vOveUEW1VVVXP3kcM/tdBQY4K9PEvZ8BL9s0187PDhQYMdbNDP0+0K67EIEFHFW+j1YujAQZiTvdCHLR7pOik+fn9vsy6op6KGA/tZlXq7uCydkZ6eefLQIROZdgkaAGDT+vXBTg72GB4UtJqmae6GCSJ2cuhvXTXCabAIG9Dsd5Qtt8hSEhKOebu51by4f78NRVMQ7O/3KtDHZ6uSkhLExkS+jIuJKubyuPNmz/CYnjmlgqb+fgKgjIwMimM+mzNnjlfnzp2lFEWJZMJykiFDhlTfuHHDVlbQyggQcuPGje6jRo36xgpwka+vb3lDQ0O3xuIJHg8ePHhgm5SUdIn1TBlfX1/Rs2fPHJooc4orSsvOzl7K8aOzwzsYMzOz2gMHDkRMnDhxNRuKbWRaU1RUxOTk5ON/1OryR8Lu7NmzHUaPHv2Km+7GCVmZqVwSVhjX9+zZExcsWLCYYx1kU0eEzWnCihUr5rPhaDEAiFq1aoULFy7M5fP5kJGRQW3YsMGfZVkTsQxzUnau9O2mnh+7zjTi4uKOsB6dRGZanBQAMDY29h3n8XDP8ty5c+bstDExTdNiDQ0NnDhx4pafCX7uuSsrK8O8efPiOQY4BQUF6ejRo69wRhAhpPG7t2/f7tqnT59Gjn9NTU0MCgo6wAkLT0/PfXw+X0oIqVNVVUUvL69lsjPXf0dGICIpLS3t6+TkxIXKGbYwEtPT0y+xVePkZ54pd55Lly4NSkpKOiIzn7yOEILjxo27StM05OXl0VeuXGnBKigpx6DIeeibN2/O/COF3nRfI6JmWlraSTZSI2ndujWmpKQUIqKmn5/fUktLyx8moMlwzDdNI0mVlJRw2rRpD5so9ArW8JDAdy6H19zQmz9iCJONHF67ds3u+PHjHk2NOu4ek5OT09iUEGewNQCAdPDgwa84dr65c+dmDxgwoPH9A4DYwsKC2bRpkzu37cvKyoxDQkI+sqH+xn1saGhYv3LlyrFsPclwGxsbBv5rRryYTXVJzM3N61avXj2IU8B/1ZHh3smUtEn7wkJDvsg8x0YZNiNzSqRZexO06N6V2bB6tT8AwMqcHEfXkSOY3OXLR/9OaJzdo1TKhPGFvTp3lOYsnLeEPb8izeNBgJfXruGDBopvFxf3BQAIDw2+1NeyN8bFxWT8YuoktWr5knnDnRyxdQtdbK2jjeYd2mH7Fi3qzDt3wgChZ02It3d9z84dUV9DnfEYOlh0+ezZUT8eo6r5pITxdzobtcH2zZvjuPAxt1jjjchyyyOi+uJ5cw92NjHC/n36iLZt2OD87ziNFADAhPFxRwfZ2+G2DRtcAYBkyGx2TjAd2LvLd/ggB2zbUh+np6Usabq52LA8DwBgwbx5Hv17m+OkhHHXKJpunCS1fOlS934WvdHOyhpzl+eEcgU2q3KWJ7kNGVqZFDfuc0N1dU/ZCxQoKAAiKi5atCBllMtIDA0OvIWIGmxbigIAwLaNG8faWvVDoeuoM9yAkT8LV3DXvmjuXNeIkBC8dv68y+zp0wdHhIZg7bt3rSanJEWFBAXgyZMnu3KeRlT4mGOJ8eMPcuf4B5Q6J6xD27dvzw1TkXAe5Pjx4080jZ40FQY3btywCggIuMPSb2JoaOgDbuPICDvVJUuWLGeFJw4fPrx+27ZtHk1CZBSwg1rmzp27gM1NNtA0jV5eXo8Uvr8XLWdn549sWF5CCBGrq6tjfHx8DiJSfyZ8m67DLVu2hNnZ2b1n0wyyw0Iax7S2bt0aTUxMkO0VRUNDQwwLC9v1+fPnnjL1ERy/PCxevHglOzFOAiz1an5+vj+XFw8JCXnLei8SiqLEPB4PPT093yCiSpMNRdjiQ5gxY8ZM1pvhwu0MAKC9vb2U9dIoLrWAiFRKSsoqNozeQAiRurq6NpSVlfX4mRUuGxlYvnx5OGsMSNu1a4cLFy6MlE0zsMdXCQsLu6GgoMAQQhoUFBQwLCzsDBdxGjdu3EHWU60jhDDu7u5fuf3zO5PMZFIg+gMGDPjKeoxSrp4hKCjoPbe+fiVwuXXA4/Fg3bp1oY6OjhUtWrRAJycnPH78uI3Me1MJDAy8wCoeEVslLzE2NsY1a9ZM/Vm65o88NQUFBThw4ICvj49PPY/HQw0NDQwKCrqMiO2OHTs2JDQ09Bln2HKRhya0r40T+KZPn/6MU0Q1NTUGdnZ2VaxxIwUA6YgRI+oR0Yyjxv6dyGgTRUSaRK8oRKRmzpy51dnZWWJkZIRsxAoVFRUxIiKikPPq8/PzgwICAm5yNQgAIO7evTuzZMmSHC56cuvWrZ4TJ058bGxszEXVxBRFobm5Oc6fPz8CEXv3799fSlEU6ujooJ6eHhdRQQCQdunSRbpu3boM1f8aTEX/LrUp987S0ib5jh4d+oFzkI4ePWi3ceP6eXw+H76WlJg52lhXerq61FezeyNxXNwmN+eRyFH3wm8QHiEiz33k8C+2lhZ4ZM+e/jLyTHGApeVDxwEDahCRn5uby7957WKfoMCAO3a2A9BL6P4ibmxUwu4dOyKOHTwYOTUtLSHQx6egd49u2ExdBe2sLTEuYszZgv37hwR4Cp9MHDfuKFvL0DrQ2/tCz47tMSMpIYczIPLy8mjO6UJEvaRxMfda6WpLOhu1ximTk4+zkQO6SYqKzJqetaajsTF6u7nVl374YPpXlTpFCIHRYcG3fIQezKPbtx25nERTr/vu3bu9hw50qDZrbyKJjwy3/yMrf8a0aSm9unTGudMzi2WUH0UIgQXZCyZb9e6NNlb9MDd32STugd+8csVsQkxMXlpyMqZOTr6akBA/IzYyfELU6PANIf5+df5enhgTHbkPEVvKeqiIqOrr4/2yT29z3LFjh/fvWPFNBFWLiJCQ0uT4+CMRYaFMfHT0DD6fDwF+vrVRkRG7OM/jwIFdncaPi5UkJye7/J3h9p9t9KdPn7aKioq6NGDAADQ2NkbOsnZ3d/+AiD1/VaAiE9LTysrK2tC9e3fs0KEDjh079syNGzd0hUIhLatAjhw5EuTl5VWroqKCtra2uGvXLq8mxyFcSGzevHk5nLdrY2ODb9++7c52I0yWmRNe36xZM2lqaupMrk/8dyIThBCYOnXqvF69ev3LFDQuzG9qaiqKjo7euW/fvvg9e/a4ZWRkrPL19X3Xrl07VFJSwiFDhpSeOHHCk6vozsjI4LHENrBt27aprFIXAYCof//+1fv377cGAHj58mXP+Pj4U7179+aiAA3NmzfH9PT0ndzEMpnIBeF61vPz831cXV1LZCaViXV1dZlp06atlvVsWWHNS0xMXMB6i1IlJSVpbGxsYzFZ07XECnQBK6zdPD09RQKBAG1sbGpevXplJROa5bEh5uFc6JUV5tKNGzdGAQBs3bq1k6+v7wtWcaGuri6TnZ29kc1j0r8Z1qPZlM5qNuUgZg2kBmNjY+nChQv3yCgx6meCnr1HCgDgwYMHXbKzs3O3bNkSzEUbZKIhKlFRUVe7d++ObA1Bg4qKCpOZmXmeS939Tm5RVmk+f/68W0pKyilzc3Pk8Xg4atSoD58/f9ZHRNXs7OzJgwcPlrIjd6WsYSc7C0Ciq6uLs2fPnitzbB17e/s6zgikKErUsWNH3L59e4psoenvRD/+QI4QLkqGiPqbNm0alJKSstLf3/9J3759sVevXjhx4sS727Zta84prOzs7EQ3N7dPbH4ejYyMcNq0aYc5bnFEVMnOzs4aMmSIhE07SABA1KlTJ4yOjj60fPnyBf7+/seioqJyx48fvzI0NHSDt7d3Tbdu3ZCiKGzRogXGxcUVXb582b5pgfGf7XEAgLx9eaZZWVOYHTt2DGTlj3pMdCTOmJYZDQAQExF2J8DbswYRjRGRDB/sdCAqfMzbpjUaP33f/xW+1nAcYP3RY/hQfPn4cWduTSKixvDBTvf797WU7N+dFyvzLlUXz58/1dPN7URidCwGe3rjCEdHtOzWHfW1tLGTiREG+/m83LRudYxAIICFc2dEeruPYqZmZIxorFPx80sfPtAeF82eMTsjI4PKzQ3nNzUuy8vL2wpHjazWUlaQDneww/17vjsVTaKiBBEVJ8bHnzdt2xYnjh9/VFbxw+9u1OTkiSuGD3bCXdu3ewE0ziEmTT2oxPjxOzxdR+HCOXOcZfM9bEit2+5Nm/QAAGZMnTqup1knZnLi+Muy32fbxWDDqlU+QrdRb+3tbHBaVuZO2XGO69fndkpPm7wkOnrs7YxJKRjg7V0eHhKctyc/34XPF4DshkFEfvTY8I3mvXpg6qSUfTKV1b9VTJCRkSEghEBKfMJ6y549MHLM6GI+nw/pqZMyvbw88OThw125Y6UkJ22dnJL8QrYY7x9Co0X58OHDjuvXr589fvz4c3369EFtbW0cPHhwDTcP/GcbSVZAnDx5cnhERMTmcePG1ezatWtG07A0W43cIS0t7UR0dPTH3Ww1qOwxZEeqLl++PMvCwgJ5PJ40Li7uODtbnk5KSprq7+//pXv37kjTNDo6OpZxiudP8ugUIQT27t0by4aNG7gwNhfCb9myJRMWFlZYVFSUlJOTM33ixIlrt27dOpD9vu6mTZsm+fj43NPU1MQuXbpgenp6LlecBAA0Z/js3Lkzng1NSgghTGhoaHl1dTU3HIQ+deqUf2xs7PUOHTogAKC6ujomJiYWcpPdZJ5bozFVWVnZKT4+/hE3WAUAJAMGDGDOnz9v38T7JhRFwebNm5M8PT2rtLW1UV9fHzMyMnbJDLohvzLQbt++bRMZGXlJV1cX7e3t31dWVlpznjr3mRkzZsRz40MBQNy3b1+cP3/+FEVFRUBEtQULFswdNmzYOz09PdTX18fly5evkCnSIX8kmGU8RqWUlJRDDg4O2LJly8YBIkZGRpiSknLg69evXZpWMP/qnv6kgEpl9+7do+Pi4i6xkSHs1q1bTV5e3oS/6h1ya1lJSQlOnTrl4efnV+Lj44MnTpzoy32muLjYKTU19ZCjoyPKDGvhUiqiNm3aMHPnzg3mnjmfz4fk5OSdXbp04cbXMgAgcnd3/8StF26E598hC5o8I/Xr16/3mz9//uqxY8ceXbFihalsFTYitly4cOEiFxeXCi0tLdTT00M/P78H+/fvHyTTEdMrISGhuGvXrty9NigpKaG3t/f96urqEU27lvbt2xedmJh4o0OHDkjTNFpaWkpmzZqVW19f3+Fn1fx/sH4EExMTHmVmTpmDiEQgEEBk5Nj1vl5C8at790xnTc9ySZkwHk/s22eBiGqJ4+LECeNiZxBCIOM3U0SIqDBsoOOXkQMd8MPjx50zMjIorgg2beLE1M7t22GAt9dbxO+p2UZFSNNQ/vq11q71WzuN8Q+430JDE+2trHFqetqW2tqvrQAA1uWuSOzfrzeOGOZUz3azUIhIFs6bM2egjTV6jBg6+/sa+THXn5ubyyeEQPbcOYu7dmyP7QxaSGLCx+zh8Xg/7AcZT731sEGDJANtbfD27dtd/+z5/qvllJfXcaC9XY3z8KEPZEPeQqGQFgqFnBVJnj17prdh7epNe/fmdRUKhZwnTxCRXrpk6e1FixY5AgAc3r9/hJ1VX3QdMfQJIioJf8y1c5a47vgJ47aPGDYEfTzcHxw/fHiobD8tn8+HytJSU1llz4ZRuZtuGRMZsbVvb3NMTJhwiwt1/u4mkvEIKB83t9uB3t6vEFH3/v37bVydRzJBQf5FHDf4xjVreiaOH4czZkwd9U95578qkgMAUFNTgwMHDgxNTEzc36NHj4bhw4djXl6ew6+u5WctYsXFxRq/Eq5s+LzFnwgWCgBgyZIlMT169EADAwPMycmZLHMOw9OnT/vExsZeadu2LVpZWTWsXr06gav6/gPDRSAUCqvg+9xqqUxhktTQ0JBZv3795p07d840Nzf/qqWlhYqKijhgwABct25dqKzQmTZt2sE+ffqgjo4Ojhgx4sORI0e8uRBpbGysAkVRsH///hgbGxsxl+uPior6xEZ8uLWgtG7duuyAgIBPRkZGqKmpiXFxcdc/fvzYt+m7kW03mz179lxra2vO+2aio6OLZVM/sikaRDSeOnXqFmtrazQyMsKgoKCnbNiZ/Ow5yaRJ6OnTp+/v2rUrDh48+MvHjx/7cV0MBQUFPJqmYfv27cFOTk6NrVDt2rXDtLS0y4jYHACgurpaf86cOUtsbGywY8eOmJKSUrh7925vdmwm/MpIbKJsFYuKinpt3LhxysKFC3dFRkYeHTRoEFpZWeGgQYMwNjb20apVqzybrsGmey88PJz/i30kG3rmb968OSI4OPiVgYEBWlpa4qJFiyZz9Rl/da9z7W0XLlzoxHIoNF4jRVFw9+7d7unp6VudnJwkhoaGjc/RwcEBL1y4MFgmMkhKS0vV9+zZM2H8+PH7nZycJC1btkSKotDZ2fnmlStXHH9H0f2uUucU4s9SbTLMgj9ETD9+/Nh14cKFW/38/G5aWFhgXFxcGSJqyawnxX379oX4+fm9YNN7Yjb9xixevDiAE8Myz01p06ZN0YGBgS/atGmDioqKaGVl9WXevHmZXO3AH70P7tqzMtLnxsVGcYVx5ObNmz0GOdhKfYVuhYioEB8d+TE+KmpOdXW1fpCfL+7fnTcIAKDg9yJJBBGpmPCwOxZmnZnsWdNXyTioFCKqJyXGF1v06oEjhw39Oik50f/Vs0fWiChARKUTR470TYwfFxgZElIT6uf38GBeXiB34IXz5iTbWllir55dcenShcvYDhJFAIDNa9fPtu3TBz1dXPK5yJCskcU5madPnzZzHGBV20avmdTP0/0ou47/pc0REamkuLiTlua9JFs3bpz5lwrkuAWXs2hRgpODPbqOHIFzZ0ybyFmaTQTLT70IRFTIysjEeXPmTWcvqJmH84jnfXt1w+2bN05oekHc35WUlGDJwoVuXm6u6GRnh2MCA4/mbdrkwOWGfgZlZWXYsWnTKF+hxzf7Af0xNWXiLu5afycn2MQS0ogICzseHhz8qfj8+bYAAMG+vqc83d2w8PRpZ1YgK2ampl6Kixx7lGud+O+YbyvTLvjDi3zy5IlpcnLymRUrVkz8sxctFArp36gMpX5T+DQWcCxYsCC8Y8eOEisrq5q3b9/2bZrDWrx4ceaQIUMYR0dHnD59evKvrpPLN2ZkZOxic/5itkUHAQC1tbVx2LBhNVw9AOtd1wGAOD4+/iIiEm5TEULgzp07gwIDA1/p6upinz59cP78+eu5PmSu0vXQoUPCkSNH1hBCGBUVFYyLizsmEAh+uD5EbJWXlxcbFRV119LSEt3c3DAnJ2e2jFIjTZ/X7t2744cNG1YBAEz79u2Z1atXr+ciIU1bzfh8Ply+fHn4tGnTDrm6utZOmTIFX716Zcy981+sV4KI/MWLFwd069ZNNGLEiLoTJ04ENDW4Ll68aBsTE3OdzZU2sJGGp1zUgs/nw6tXrxzj4uIKHRwc0MrKCgMCAoq3bt3q1/T+/szQ5J77s2fPzPft2zc8Ojr6iIuLS3l6ejqWlpYa/spI+Z213yRKpLdkyZLVPXr0kJiYmOC0adOOcEbK7x6/6TF/lQ4AAHj27FmX3NzcnICAgNteXl44a9as7Wwu+qfnevPmTdclS5bM9vb2rjY2NkZHR0ecOXPmNLZwGP4GT/2ncuFXLXyyih0RlY8fP+6Um5s7FBEFhBBoYuw327Bhw2QXF5cGjgOha9euzOLFi1M57oMme0N3+/btMWFhYZ+7du2KJiYmKBQKnx4/frzHT2oD/mXtfPz4sXl0VIRoSmrqGAAAvkAAcdFjjw6wtMD5M6cO27hu9bAgHx8cMXTIo4iw0Oe/K9Nl5fqWNavGWPfqgVa9zau3bNw4glPqXOh9yZJFM/28PEVebq4Y5OuD3m5ur4N9fUuSE5MweWISLpg7O4NtZwNE5KUmJ0y17dcH7awsxSuXL12JiHw2Oi0AAFiVs3xe3249MMzH5wYnb35hDGs5D3Wq7trBGLPSkyf/rB6KSxPGhoevd7QZgLt2bPutXvkf9qRQKKQVFASwf9eu8AAfn3tuI0egy4jhH6ZMSVt6/PghS0Rsxn24ouJzhw2rN/RZs2aNBSIacOGKqIiosz7ePru5z+UsmDfdtK0RBvv7ViGi0S9CuTQAwKunT3slxcQcdXZyQrcRI1Do6vJ8SurkwrS0Sf5RUVH9Z86caZmUNN4iKz09Ljwk+K5wlAu6Dh/+bUl2djr3wn93Y8t4VipJiYk3xkVHv+CUeUpi4gxfTw/cuHZto/BeMm9+lK+HO86aPj3wd/Pz/4RyZ8/L+3e+/wdz638QEr9zLG4BTp06NcnExARdXV1fVVVVdWWFTGO89cuXL+bTp0/fmZaWNuePFDqrqBRmzZp1mK3oFf9kbrqUq8wFdpbz8uXLF8iGNjkhVlNTYzB9+vQl5ubmaGBggNHR0Werq6t7yFrU169fN3dzc/vK5/PRwMAAly9fnkZRFNd2KSu8VI8fPx7k6+t72dPTE+fNm/eWU7wyNRiN6/j69eud3d3d36uoqKCZmRlmZ2dv53pumxgBsl6o0aZNm6x+s5CKAgDYv3//IGdn5wZnZ2dMSUkZy855pmQqZlUWL168zsHBQULTNCorKzPh4eEvi4uLh3PHU1JSgsuXL9uHhYUd6dOnD/bt2xcTExMv3Lx5s+XPKtabrhWZeoym+f/m27Zts/y71r2szDh06NAQe3v7Kn19fRQKha8RUemvpNhkinepX/2uiTIUPH/+fIBM5JA0vTbZz5eUlJgtX758lY2NzUczMzMMDg5+vWPHjt6/W4D4NxfYUn9k7Dd9tixT3ilzc3MEAGzbti3OmjVrNiIKOPnRxBAwKSws9IyNjT3t4uJSunjx4lmyadxfyV4+nw9JiRPyQ0ODS9mOEOrhnTvmTvb9xaOGDy5BRJI0fvzmzu3a4rjoqPtcW91vKTJ2mA8iKqUmxF83bqmPQ5wG1e7cuTP0J/dvtn3LlhEzMjOXzZ469fq09PTcebNmOXz8+NGE+8yHV69Mo8LDLthbWWJUSNC128WXB/xMFob6B2b1MeuKboMHbWls4d6Rt2jDhg19mhjkGtERYRXjoyNeswV1XN88kZWfiNhqhJNT2agRw6t+J/rxZ7lbKnfZ0lTXkSPq+vWxwCEDHXHU8GEfnAcP3OvrOuqA58iR1UPt7XDwQAd0HTWyPHv27ImISMbFREX4enrWFBwr6MRevJq/j+cDY8OWOGVyyik2rPcvm4lbVDweD84VFPSflJQ0JToy8qnrKJf3bq4uNR7urhgTGYFjR4fh8CGD0c/L68XMzMw5XHEc/CarjmyfakFBQZfo6Kh3aWmp58/v26cGALAiZ0l8xOgwzJ49O5tjrrtcVOTkMnRog5qCAAN9feqePn1q9j+xOZveBytM/0eugVOeiKiQlpZ2pV27digUCk+zUQvqj0KtfxbKzcjI2MMWb0lkSTBYj10M34k1RAsWLNjMCfOftU0CABw/ftw1LCzssZGREXp7e1fevXvXjn1+ilykIyIi4qampiYKhcLnbAEckVVYsumfefPmOWRmZno9efJE/WcbjBOeT58+bZeWlranRYsWaGBggCtWrFiCiMpNc9R5eXn0XzUOm7S5dPH29j44atQoXLRo0TjuGmSPWVxcbJ+WlnaNbTtEe3v7t7Nnz27NPieau7crV644+vv7n4yJiXlXVFTkwoX4/4pnxKXn/qk1z0WaiouLLceMGXPF39//HiIq/90esOwe+6Nc9h99HhHbTZs2bb+zs3NDfHz8K0RU+TOj+p/cr3+01mSNYQUFBdi/f7+/s7PzXSMjIwwICMCbN29aN4lq/rC/WSXanCsg/aNnxcmsO3eudxsTEoxpKRNn0DQNFEVBysTEuQOs+uLMrIzlhBAI8PY64NC/P86dPXvMzzzZP5MnDx5caZYQE3Opa8eO2KdXT5wze2YOt17gT/rpa2q+GGSkJk91crCrc3Kwx2lT0lZwnjfnQHCRDkRUDfH3v2dm0pZJGT9+NufVJyYklkZGhg9HRBIbG6vAMdidOXPcnI0ukaYOBABAZWmlaUhQ8GPn4SNwy5ZNE/+jFC/7oggAQH1FRceIkBCfED+/Vf4eHmX9unfFNrrNsJuxcf0YP581XsJRMT6e7q8cbKww7XvYW8HHU1gyJiT4hgrbF3y66LTTKOcRTEdjY5yZmTmLK5hB/FEZySrb7x4/j6vubP7o0aNO+Vu2uOVv2+b5/OHzrrJFN78hQDjPkwb4XjE6Y8aMsAkTxpcnJMTP4V7+6hUrpkRGjMGM9NRsrqWioaqqi/co18/9evSs8hw16oVtv364MDs78n/KS//fBJn6A525c+dmpaenr2waJZFRGtTvbkJFRUVYvHjxJLZATrYfVqKuro6enp6Vhw8fHvRHgkPWy0LE5rNmzVplYWGBI0eOxLVr19qyn+EsYdWEhIS40aNHO3B82b/wYn43rNvYRz537twMW1vb6q5du2Jqauop2d7xptf7Vzcst/4UFRUhJycnYv78+fZNjHJZljdBdnb2OBsbmzpjY2MUCoXLuBSE7L2xdRTU37E2/qkaE+758fn8v2Rw/F0Rgt95/7I5+fr6+g5Hjx4d+D+hyP8qZNcCIlL5+fnCdevWDfuDEDolaxj+9jv8bvTTwb6+p0YNHy7BmpqW8L3GSsfDw/X2yOFDG65euGCFiKrjxo49MSYwELdu2BDCrdm/4LwBIiovnjd70nAnx8/9+1qgq4vLw2VLlng1ZWxjI1ytVixZYD0uMmL7IPv+ZQ4DrNDdxfndkYMH/bgZObJrgdtfe/fmW/W1MMeBtrb45P79nhkZGVRhYWG/1NRJ0mmzptn95rpRuHj2rPXE+IS1Dv1t6kYMH4Hr1q3LFggEf0+9lqzCEigIABGbLZk7e/bAAdboZDfgjpa2dmNIMjw0qHCwoz0e3r/fetHcud28PdwxZuzYeVyeef+efKGn6yjs0707Lpw7N5ez5GQoO+EvKgEi/HWVK0EAgvhjAQlN03Bw9+7ukZHhZ8fFxdTNnzvbl/vdjKyMmSkJE3DenFnzOGX+5P79nu4uzq+7tGuHs9Kn5COinteoUQ3xMTE7/yYO9//zkH13v+Li/zeOx1VsR9ra2qKWlhZqaGiglZUVJiYm5n/48KEzt5n+bGPLboTCwsKhY8aMuZuZmYnFxcWd/mpOijvez1jtfiFMCADA27dvu2dkZBzJyspa8FfSQn/FePiNZ0DYdEC/SZMmjYmLi+v9C+OL/BPe7j+k1P8vXOP/SRnx7zgrf5Q7/5fjf1fevNEhQWtN27WTpsTHH+CKV0+dOmXv4+2JY0KCb/O+G228aenp+SkTJuDKpcvDZZw03l+RT4ionxQ/bupQR8daX3d39Bg58nqwt/f6uPCxG12HD19v19cq318oxFHDhuKIoU44ynnEq9RJydEy+fCfEqghYotgP9/HHUyMMT05eSu3JyclJ82PDB9TVlVV1RwRqV3bt04IDQrcYGlhviE5YcKq/fl7Rrx586blqSNHus2aOnWh0G3UVYcBA9CuvzWGh4Y+K7pY1Od3IkN/eVGynk7jwkyflDTF1toSkybEreJyg2UlJUaebqOk82bOWAsAMH/enFl+3j44ceL3cAoAwNmCgiE+7u5Xhzg4YFxU5DWOl5oFVVBQwJMd8CAb+uT64jm+XpAZmJGRkUEVFBTwcnNz+T8LyaipqcG+fft6RkaG74kaG47jxsVeObB1q873l1HXLnxMWP6Y0GBcs3J5I/f1yaNHXSLGhFUMtLVp6N2tG7N68dJtAADuzs4XYyLCP7GLj4AcsuG3v+V5EEIaq7oPHDjg7u/vn+zl5ZW6Z8+eIM5o+KvhfBlrnZeTkxO3ZcuWHtza4a7/n4i4cMfk8/nwTxZRyraO/g1C+v/Suv5ff63/ZLTiv+HaeX/3tcsWhwX5+aKWqgpaWVjg2uXLo7nfr16xIt515AhMio9fz+PxgM/nw9xZs2JDg0MwddKkxVzB9O+0Bf4k72+QlpQ0LmbMmGux4eHo7ebGBHp547jIsUyYv/+mcdHR448ePThYluXyVyliRNSZOWPqdZPWrTAsKLCa02nPHj40Hx0YKJ4QHb0ZEVUSx4270L9PHxxsb4921tbYr1dPtO7VCz1HjhRbW5ijjZUl2g2wRl9v4YvVuStiOIf3H40CI6vcv1cV+9/obd4DJyWOX4eI/LmzZviPGDIYN69bFwEABAiBlIkpMzw93HFsePgcmeIh1bTkpHkjhw3BUS4jmbS0yVmIqPdnfat/BaqqqoCIileunLeYPDklKyQ4qDgo0B/9/bwfzpo13RUAQFlFBaZNy0oMDPATBwcFfFubmzuQC8fPnjEtcugQJ3QaNPD268ePA71HjcKlc+YeAAAyPjr6nMcoly//F8Jn/38J6TcV4P+uh/s/JVRlvMn/8TXDRRj+p2ov5JCD24db168XOjnaS8eGhV0dZGv7dcTgwcy5ojNB3OdmTc2M9/PyxPRJyesUWcdxzpw5trHR0dKw0KAneXl5rjJjRuk/299N5yawg6B4Mj98fhM91LTmpUn9SqvpUzOvtjNug8MHD646e+aELfv/dKCPz60AT896RNSKi4jIsejaFQO8vM7kbd7s8eDBgw4xoaEHTfR0JW31m6Pb8CEPxkVGTDp0YG+ALA3uf4u84oTT/fv32ws93N5269gekyfE3XMbOaxh6KCBkurq6hYA3/tiKYqC9PRJs0cOH4px0VEXXj5+3IM7zpP793tGRobnBfj5YFCgPwb4+W5fuDB7wqO7d3vz+fzGXB7LD837gx8KEVsXnTwZtDp3RXxMVFRCTNTYM2HBQWJPDzccExaCEeGjzy1ZsmCgiooKIKJKZtrkdH8f70pvoQdGR47dUvM9fwNFx461WpA978qY0aHYvVsXnDd7thsidhzuOBCnpkw+AQCQOjHxrJvzyGp2bCfIFfs/v/ltbW15siNG/1OPrqCgQK7Q5JDjfwicQowOD98YEuCPiEjHjhkzrY2+Po4aPgyPHTwYyX129vSs8aFBARgVEX6InZIIF4ovdAoK9LsQ5O+HsdGRK+vq6oyaRL/+0GiVVco/wU+5EZoWFF69erXj6OCgBx2MjdDdxbk6f/N2R/bYyj5Cj90jBw/GNcuXB5Q8e9ZlqIMjBnh5PeJ0Bk3TMCYwcHfPDh1w3NjwW01bw/+tCWv/ibeQkZFBZWVlMbduXemwaHb2kbPnz7etqa0FTy+f90uWr+hACKlFRMrOzo4qKiqSLM9ZknH61KlMlDANAYGBKX7BwYtqa2uBx+NBYeGpfgcPHor4WPIxEBGJSCQC0XcwDMPUUxQlUlJUlCgrK4OSkiIQQoGooQGqqqugpqaWlkolAj6Pr6WipAwisQj4PD6oqakBoahLxsYmpyelp8/X1NQqz1220ub8uTORZeVl3lKJFFRVVYuHDh+R6e7peRgIgWULFgQ+efZ0rVYz7f2q6hpvX796GZSzbIX27eLifkkJCRd7du9RNHvxIrvo8PCzn7987pS3Z29zdhGhfIvKIYcccvy+3kFERT8fn/PaWpqdV69brzxwwIDIL6Wly3R1daXKysq8/ra2S+Li46cSQr6uW7c65tzZc0vr6urqnQYOjI2KHbemvr4eZmRlzH306HESMgy0bt1mmZuLy+4BgwYV1NXV/UrPUba2tgQAwM7ODgAA7MAOwO6/PlBYWNj4Z1FRESMj35G9bs01K5ePz8/blfzu3TvFgQMdn3t5+4Rb29qeQUSTyNFhG1+/ft3f3s4+bWJa2ow1S5aM2nvw4N7+AwZsnjRlSiAiKkWEhmy7c/vOqL79+t1amJMzkBDyNSMjQ2BmZib19PRk/l2d8h95lhkZGbysrCzJl/fvO8XFRF0vPHdWKThk9KGZc+e6EEKA5T8GDw8POn/XLumhfbuG5C5ftYaRSFoatTXJ8/L3mmFjM/COjNXUfNmyRfr1taKYjx8/an34WKLKSKSdGkQNrRR4FBGLRCASiwHwu4UjEPABEYCiqXeE0A9aNNf/3LadyQeTDp3WDhs2rFRLW+tb2bcyjfExMWHV1VWTxWJxM7FYzOjq6B50HOSwzdPHP6+hoQHW5eb2fvjo4YqvX7+at9DX3zkne753VOTYw820tW5lTp2e9uzOHfNxEyZcNe/Zc9LMhQvneLi4XCUUaZO/d39ziURM5ApdDjnkkOOvOYOIaBwWFPRCSVnpSs6Klf08nJ0zqiorM+YvWuSQNnnyinfv3nY069r1jYebe4yzh8fB65cudV65dvX26vKK7lpaWg+chjhN8vILPFBfV2cydkzYvNIvpW6ACFraWiWqKkprzXv1eeAfGnqRpunXNE0DwzAglUr/moIkBLjvnj1zYsCZU6cGvnr1Ku75s+eaioqqIitrq6VTkpJmEE3Nso/vXvabnJqx9fXLl8YOjg4ZU6ZOn9q/f3/ehlWr2seOH1egqaFevXn7zkFBfn7znj557N7Xyvr6gsWLnQgh3/Ly8mhPT0/pf/psyd/wcgTTpk0TzcxMX75jx87Ifv37b16zfmOgWCym4DuvMQB8L1woKiqSIGLz6IiIBY8ePfIVKCiAsbHxGUNDw9zJ6elHCCHVTY+vqqoKVVVVGgCgUvv1LQEAUFZqhqCszB1bbKCv/7X02zcQi0SAiC33bN5ueuLEkdY1IlEyEGgvUFSs1tFudlhXT29lYkrKPUJIKQDA3LnTe3z5+DW9srLSTUlR4VL3Hr3SQ8eMOb1u3boejx8/vGljY9du2LBhL7du2uRafOXKLkoqbZ69YgVxHznyrYGhwdPV6zeaNTQ0yBW6HHLIIcdfVOgPHz40Sp806YWqqnL+zt17vYY5OmY3NDQkrN60SfVAfn74qtWrs9U1Nao7dOig3q1H94To2HELEFGQNH58yOs3r+dVVVaqaWs3u21nazt9UkbGrtLSUp3xcTFRH96/DwGUGkmlDFTX1Err6+tftjEyquvQrmNtfW3NkXt3797U0dGB1q1bg0HzlqClowlqamqgrKAAtbW1UFpaCo+ePYM7t29Dt249Rn36WNLv5csXKsqqyq2VlBWhob7hfs+ePU+6+/gvNzMze0rTNGxYtcJn69Ztq+tFIhU7W/u4rJkzlyIiz9bWFoqKiiTjxkZdOHfurJWuru6nkk8lze0dHK4vylk2kBBS/ncpc4B/k22sCSQMw5DkpJR5589fGltRXjlcJBIpE0LqZC+0qKhIkpeXRxNCPgkEAr91q9blPnj0MPLl8xftCPVhp4eHS0n8+Jh3asrKR9+//3DJ1NSUatOmjVRTR0N0/nyhWE1NS8zjIZ47dxlevXol+PLli/KzZ8/o7t272gUE+g97+fwFvHn2ss51yNAu4vp6pfLyCujb3+q2lbXtUDcf4QmWWQwSU1LUJk5M8Gyoq0/9WPKlG1/Av9K7b7+BUVFRp0XfDQIyOSV5lkQivjF06NAXAIAPHj8YQivy787Lzvm6Ljc3sKG+nq+ipJIvEolAKBRS+fn5Uvk2lUMOOeT4C95kAyEVlZXQrJlW99raWjLQxqZGIODDxo0btUb7+eXfvHN7dh/LPpu/lpbWPX/6dH5m2mQtAJiavXhxLiLumjJp0szbd26F7927N9+qt/mHSQnjl0+bkplnYmo69fatW53WrFnp+frly0El7z90FNXVtCs8cxLqamosEQG+fv4Cb168BAVFRRAIBMDn8YBQFEjEEmAYKVTX10FNXS3cuXMLaIoGQ4OW10zadzjSqk2r9UGjR98mhDRMmT4LHty+3WvTpvVpuatWuWrrNANvH5/Y4DEROawDK9XT06MQkaxcuOTM2YKCfjevX28+dMTQd4tylo38u5X536LQs7KymLy8PJpWUXk5Z8aMqRcunMtYtnTxNB6Pl+Dp6SkNDw/ns/Oq4f79+5CRIRRkZeUz/sH+ZwHgLMB3HvWFC2YnHd5zIPXNq9e9tZs1g7cvXoKKiioQmgLCo0FJRRVoHg90dXRAyjBQU13xsrluM+nrVy+xorxCwuPxWjbTa6Z+/+EDqKqoBAWBQKKooMirqPjabnx0RFls1NgOFJ8XEB01dgBFKFBQVNjTs1eP2KCgsLNSqRTatGmj+Pr16/pp0zJdautqh1j372dJCIGPz583X7V502h1ba3hhBDpuMjIKABgBg8dWjBn4UIwNTWVF8TJIYcccvxFaOlr0VpaWqS8vKKVoqIiDnN0LK+orMTz589TKSkpbxInjD915cqVwes3bWm/eP78d7dv31oY5OsTNmXSpMOFhYWTps2eHXHvxo3FmzdvDrtz55bv9evF0318vaYPtOlftHn9mj3x0ZG72rQ3m0rzaHj1+H73pIkTed/KKpr16N7DVVIvNvv0+RNdWVFBqqqqoaKqEgihQE1NDQwMDEG3efNPdQ0NB41atnwaMGbMeyUlpRfcdY+OjIRr16712b97V3DKpJTIT58+QxujNk/i4idM7N+//34uGi17rw0NklsASLqYmUlcXd2TCCElGRkZPE9PT8nfaiT9jceiaJpmoqPG7igtLfXq0LZtdsa0GfMJIR//5YMUDVKpxOD4oT26p04WtWMkEo8XTx63evPmjfW3r9/EhBCoralheDy+go6eLqioq9XrGhhcV9fW2mZm1vlGcnLqq6bHRUS1detW275+/srsc0lJwOOHjzp/+fyZEksl0NrICJrpNHuvraf3XkNdY2lUTFhhq1Yd3skYNRJCCCQlTRj64f2H3a0MDWfOzV4wnaZpmDIl7TxKma/pGZkut4qL+ycnJZ1qYaB/b8OWrX3YgjhGvjXlkEMOOX4PHF0qImoEBwZc+PD2TYflq9d2vnH5cu+8vJ3buvbsMSFz6vSFm9ev73vp8sVLndt3dIpNTDx57971dsuXrkx4/65kjKKALzXr2jUtPSsrmxCCaurqkJIY53Hv7v3492/e9aWBUOqaGqCsrHyzY8cO99U1NHaNcna9ZWxqKtbV1f1QU1MDTQrnfqXUQCqRCL5+LWl3/PBR3ZJPXzwfPHpk+fnTZ/PqimpQVFJ8bz/QccPEiRMXEEK+cXVl3Pc55b5w1tydG9evEzo4DSxatHy5vbu7O/1PRHb/1sk/dnZ2dGFhIRUaGjyjrrIqngEob9lC/0j7Du2liooCqr6+nv/6zWvmzdt3ytVVVZY0RRlIJBJQU1WF6orK2nbt2pdcunDB5OOHEmJqZgotDQ3vdelqtjAuJfUeALw5ceKA0qunb/vX1daaAI9SIATeShokN3t06/bFYejQKkLIZ+56Ck+e7Hn+7Nlx168Ve3x4/16ln7X1+YWLF0XzlJXvyBZGEIqC8+dOdzp64FhaTV2tn5qmxpSpU6dPAwDIzJySKpVIMq372zQfPHhwZWxMZMHLZy/6T0iId3d0Grrn7w6XyCGHHHL8v4Dw8HD+qlWrxHFRkbmPHz0a4zLKJSkydtzSIB+fKqTJ5U1btjkCAC8+NvpMZWWl5tqNm7sTQsQAADdv3jTavGFdUn1dfSQCfmqh2/ycvr7erjHRcWcAQPnVg7u9Lp6/FJC/K9/5xs2bPGVlZaD4NBgYGoJOs2bQIJa8FigofKMo+gOP5kmVVZRBUaAgBoAGvoBPEYqiqivKibihTkXUINaqq6vTYRg0EYlFNENABDT9sVWr1m9aGrRZk5aRdpIQ8gHgv4rEuXazzMxMmi3+U3IfOeJeQ4PIaOr06b3NLS1v5OXlkX9Cd5B/6Hh4/vz5HquWLzvy7dtX/drqaqiqqoS6ujrgCwQglkiguZ4edDIzPdOhQ7utXcy6o8Ogwft27dw2MGfRorwWzVu88PP2jRnp7X1566a1HqdOnXbj8xSGUBQBsVgioXm8WmQYsUgsRj6Pp0MIAUJRUFNXe8zMzOyrQUuDImtrm51dunatbKiv152ZNmX2lWtXA3VbNOdJpJKbLVu2vK+rq0tqaqpJXV1dOwDSp6qq6nG3Xt2jR48eexoAYPHiRXNrqquSenTtPmCYs/P5JQvnjzldULCqn1W/3cnJk4WZmZkkKytL7p3LIYcccvxFcM7QiaMHnefMmrtfu1mzgj0HDjpMjB838cOHkjleXt79hrm4XH549WrHWYsWPmzZqvWRmbNnj2xsEyYEHty82WH/oQNjXr94FS2VipSqq6uhuroaaKBE9bV1kpKPJQqlX7/SWlqaYGBoCDSfX6Jv0AL0mjevBYrfQNNU29LSUvrbt2+IiHxRQwO8f/8evpWVAU/CAA0AjFQKooYGqK6ulnRo354kJCevdgsISNfR1Sn9Wvr1Z7dGA0Cjoubz+RAfF7f21s3rocOGjZg+PjExXSgU0v9U3dXfnv8lhHxvU8vPlyKizu78HcJL5y/RCooKrjRNawAh95SUFLGvZe8tQ0e6nm5oaPgvqy0s6Hp5Wbnxzm07LRevXNKt+NLVZU+fP2uu07w5dGrbYXWPXj1OBIeF75JIJHwAULx66qrg3deXvm/fvdF5++6dYU1Nrcu30lJNgbIibWBgADye4KGhgf4xl2EjFhmYmJDM9Mn9amrrowR8fl8eTROBQPCy7NvXFUOGDDs/aNiwa4hIz5w506xVS/0ZNbV1LVroG4x1dXW9vnbtWttjRw8XtmvX/vjMWbOHseEi5Nry5JBDDjnk+MugEBHGhAbfevvqddeM1DTLfo6OxWPHjH7P4/HKc1asNCWE4NJF830fPXy8VUlZ+eS8BQtdCCE/xMoRkb994zqPx48fmd29d3/SmdOnUVGgQBsaGoKpmVmFsbHJDlMz06ue/oHbBQoKdWKRqFFXISJ3DL29u/Lsrl+/afHu7Ru/V0+eGHz9/AXKysqkqsoqSAihJVIJ0WymDR06dQRlZZWTKuoa9/r161fV09JyVYcOHeoBoJxQlBQZhgIA7StXzrfbuH5z6ucvn0a0bdd+zsKFi1Mmi8VU5j+oO/6xgi42T9J40UpKSlBbW0vx+XyGYRhgmO/O7eLFixW6desm7dKlfdvEcQk3zTqbLgICZnl5ec4SiRhsHQaemJU1bbRys2ZvXz9+bDJ//sLR9eKGsZUVFVp1dXUgFolEqmpqZYYGBmcd7RxPDBO6bXvy5IlWUVGBW0VFhZGasrJaTVXNiA9v336m+fy99nZ2nxR5vH2Xz99t6N3PVPChtHTw5QsXWjMEO7Xr0EGoqKx0S6dZsy3evgFLAQDmzZrlcP/hg9N6LZpfnzNn3lBCSCliBiFE7p3LIYcccvynXvr5wkL7ObNnnWnRvMX1VRs22GzfuLHd0ePHC9TV1I7n5OaGE0KqN61f437+7Pn1DSJRvZmp2YLw6OhcDQ2Nevg+X0RcWfleLTdnfcK5s2cnff7yGTqbdXndt1+feQlJk5fV1NQAAMCRI0cUyt6/7/6tstzl+s3b/KrKSkUlJSW+kpISSBhJlVGrNh/dR7ofM7PsWfLy3r0+a9audr9z7+6Y+/fugZqaOtrZ2r6oE4t4X0q/6FaUlyszDRKoFzWAsopKfftOHSXq6mq3Pnz4cF1HV69reXm51fv37xUNDQ2hl7lF0oSk5GypVPpDK/f/KYXOKfXCwkJ6+/btZNWqVWKZcxIuh8DmHaQrliwMv1l8fYWtre35GdOnD1AQKMDo0WH7oxInCmmaFi9fvHjB2bNn41VVVesV+PyNdQ0N9QYtWkirq6t5ZRXl7vU1tS1LP38BXQP9N9YDBqSPm5CwSSL5fspt27YZfHj1akJlVaU5j8dvD4AUAUJLpRKBsrKK5ucvn0tpQp1o27HdkTFjo7cTQhhEVM7KSM/68LEk0biNcXbK5NQ0QkgD10Mp345yyCGHHP8ZOHk6b9aMzAvnLmT06dtn5uQpmak5OTk9Hty5fUldTe1b506dBwaNGfMQEZUmTUxcVV5W6V9TUwWtWrUCiqKg9EspfPnyCaqrK0FLS/v1kJHDs5ImTl7/5fMXmDdr+siXL1/019TQDHv//r2mqL4e9Jq3oKVSqGgQNdykaPqFTrNmDEWIISFkyMNHj4AQaOAL6AUTk1OuqKuridJSJ2dev369j7uH5+7ps+aGAAB1qei0zaVzF+yLr1/3e/r8mV5FeTkgIKiqqQEQAs2aNYMe5r1OBAcEZnXt1eciANCEECkXEfg/qdB/cT6UVfgWFha8GzduimPGhN4WScTttLW0y7dv22EQGBR0NGvWrOGEEFy+JGd6YVFhqmGr1rvnL5wfTgj51sRwUIX6ep3pM2aNu3H7RqxEIqYVFZVe9OzRc+GkKVO283i8r1whHCKS6uqPuh8+VPI1NQVSPT2jcpqm67mIASJqbVq9OuTQkcNxQNNtBg8dPH706IjF8H0giDxvLocccsjxN+qEjIwMet68eZLkiRMP3rt7d4SOXjPvFStW7Tx27ECnQwePLK+vr7fXVNc80KKF/pKkSZNOM1Kp2r78He73HzzueO3aFVBWVOb3tOglcrRzuNyrb9+CnEWLrN6+eeMmlUo8KZpWr6mrKVZRUr5ibmF+0biNySNNFU3B508f7D+Vfi5t267Tx979+x6WSCSAiGT9+jU+BWcKIz6+fW1TW1UNln36XJi/Iidp5OBh+UDRBlt2HGumqUnKZHSP9u4dW12vXCu2fPz4saKysnJtP+t+DW7Obuvam5rerq+vh38yZ/6PKHREpDw9PUl+fj7Aj6xpjUVyv/g3AgCeOn7cY/68OflCoUfBnj17rShCM/uPHjUjhLx89fRprwmJSZc0tLTurFu/zpoQImpKqi/j/QMiGkyfmhl44eKFIJqiOwkUFOqVlJQKv5V92+Hh6sGMGjasoJmhYSmfz68Xi8X03StXely/fbv9sePHFTU0NEa9fP7cWiqV6igqK8PAwYPHT0hMXGwLwCtElMpz5nLIIYccfy/Y9CxBRGrOnFn7Lp4/P1xPT3fi6rUb5hNCmEXz54W8evkqkmGY3p8/ffrSpk0b8ds3b1c9ePDgaXMDA5oRi+mWbVrp62rrCOsa6nUV+IJ6bW2t2yUlH+cuXbnyvrKKSk1tTU3HcdHRw968fRNZ+uVLG4MWLQTKSsogZaRQWV0tVlNTPdXHqv+suLi4cwKBAFYvWzpl9apVSV8+fVQdMcJlb6/eve9s2LAhI2zMmP5efn4XV61axdu2bRvK9pvTNP0v1LKYkUGR/0Yn8D8lliFCoZAihHy/C0KAAABFUSCV/sgvTygKkPWCKer7ABypVKp48OD+sAULsmfr6eq8bt+u3Yq62lp7i159sgkhLxGRxEaNDVVXVxPExsWOJoSI2BC9uOmCyMzMJABAsS0EsxFxwcKF83p/ePch5uWrV8NbGbQccvHcOdibny9hpEyDTd++ov4WvXkGLQ3U1FRVoaayCiorKkBTU1NqZGKc7zzKdf0AO7ujrHUl+SfnWMshhxxy/D/rohOCiAiEEAkiOk/+lpR4+86duSFB/p678/LSPby81iPi+n379hmcPnG0N4/mRUul0sH6BvrDABAUlJWl2uqahMen96nz1Q7Nys6+gYigpKQEg4cOdQ71900eZG9nhQwDmlrapTYDbNYWX726xMSkLfP+/QvaordF3K0bN11OHDl8duqUtOXpWdOSCCFTz506fjctPX1jQWGhs52N3TM+ny8qKix09/b3v5iRkUGKiorEiEjy8/OpZcuWkaKiIrS1tSUdO3Yk+vr60qysLCT/zRHdf1tLsYqO+a5PscOKnMVdP3386FX2razTp0+fajt27Chu2dLgXl1dnaKoXqxfW1enwOPz3xNEaW1trfGnL5+1Pn38pCMSi1uoqihhTExkr2NHjyc9ePTYN35C4kAHJ6cziKjm7eX5SoEvuLJz166hzs7Ofxq6YJU7Ldvcj4h6Vy9cMFi3ciUi0PodTDuGvH33Vp9hGNTVa37g7u3bp01atyZ2gwaRfjY2lZqams9k7lHeZy6HHHLI8d/jqQMA4LLFi2P37du7pKqqCvqYW9w0t7DYO8je/kjrTp2uSyS/JldTVlaGS5fODjh27Ljj3bv3PT9//NhZIpGAgYHBA3t7+3Who8M3EUK+/OTcqumTUo7euFbcf0D//vkpmZl+hBDxgnnzpq/OXZlqN8CmlM/jN3vx+vW3g8ePGRFCqlkWVKmZmRlpohsxPz+fAADk5+eDqakpPnjwgOTl5XHV7f9YpPevKnTCcpcDAEgRkWxat3rcgb17p1SWV2hp6zQDQPgmkYi1nz17DjU11aCooAhiKULzFvqgpqoCPB4PVFRVoba29pOCgsKnzp06vexibj5u5MjBat4ewivlFZVfzxRd6EoIqVi/fr3RrvydL/v0tkzIyMpawJER/O7iyMzMJIWFhVRTGr4/Q4atLe+Bnh7Klbkccsghx3+vUrezs6OLiookWzZudNudvyvv5s2btLaWFrRu1Rp4fN61du3b1Wpra9+nAe40iMW1igoKmmKptHvZ168dX795YygFNKqqqgEEBCNj4wI7e/uFXl5eZwghNQDf2dvs7OwaPeeSkhJ61apVYkRUToiKOX3nzh3LialJ9qvXbz6fl5en7T5y5PM3r14J4mLjLq1YudxugHX/NXOWLo0mhIj+HZ2bkZFBZ2Zm/iMp3N9W6LKsaDw+D25evWS3YsWqjNu3btnxeTyw6mu5OjQ4NLdt166vrp49a3Hs+NHht27dib1x4zowyIiTU1JO9O/f/4yKmsaDdh07vlJX13hUxfLnfvr0pmdSQtKaa1eu9nJzczs8O3vhCIlEQiLGhE3++u1bZv6uPTqEkApoUlT32wo6I4MyMzPjcvwAAPD582cCAKCnp/fD8UxNTVFe+CaHHHLI8T8HjjK16HSRw5VrlzMe3ruvXPq1tDlFSCuGkQJFERAIBI3pW4ZhQCwWg4AveGnQuvWblq1aLQ/197/fTF//voznTOfl5TE/U6Qcy9u7xy97RMZG3dDR0z2xfsumIYhIT4wfv+nKxUs+Hu7uyS/fvOxz5coVj06dO1+zGmC3Q79ly5P9LCwovrIyCgCYmu9TRkFcU0PKy8vh5ftX8Pb5G1RRUQEHBwds0779XY57JSMjg/d3K3byO15uVlYWYT1y/uEDB0Zeu3o5tKigaLhUIgFTM7NbwaGh0/oNsNnTVNceOXhw2MUL55Lv37tnU1VZATo6zaT1IlGBqL7hvWGrVspSiYRfX9+gWllVMfBDyUcwMzMrnjg5fXCXLl3KBQIB4yl0u6OlqXVv2Ypc3/T09B84cuWQQw455Pj/LxpbhAkBmqJAIpHofvv8ucPDR/dbvHv9DsoqywgAAEVR2N6kPXSz6P7W0ND4qlgiAel/heXpvDwhCIU/V+Q/MyKiI8YeePXmTd9DRw6bEkJK9+XluS6av2BPC/0WD7bv3esSOSb06L07d9opKimDuro6qKurg6KiIgAASCQSoHk0IINQV1cPnz9/gdraGqBpGgwMDEBFSfmkpZXV6bCIiHVc6P/vpBD/LQ+dx+fB5k2bfU+fODbu2dNnfd69fgM9u/WoHTliRFbA2PAcQkht49Pj8UAiFqsrKStX1rPk9xfOFow4dfKExZfPXwI+lJQ0r66uVgFEkDIMSCQSacuWhiW9evXcnpA8ea6np2dZfn6+dMWKxX5XLxdvsbV3tAwODr4q502XQw455Ph/C2wdE6eIfzdySgmFQi5n/dvRVlbHMDNnzuz79uXri507mw2KjY89DQBaniNHvn/+8pmil4/3xImpGbm5K3K837x42VwsatCvrauz+vDhg/qXz5/5DKLq+3fv1KuqqiQAtMCwpSG0amX42axLl/K3b99i6ZfSjvX19WBoaPjWceCg+WFRY1ewoXsqIyMD/rHosEAgAETU2bt5s2P6uAn5g21s0KhFC2zTooUkcnTYxc/v3nXgPqugoAAvH940Sh4fN3+gzYDNoQF+T4c42O0fExyQc/LAnn4yHj+FiAJEbP7ly5dOZWVlRoioh4gC2XNfuHBBz9/P52NUZPgRQghkZGRQ8qUthxxyyPH/LhCR5OXl0QUFBbyMjIwffgoKCnh5eXn0f3r8jIwMChFV/Hy83yVOiN/E6a2stMnLO7c1RotuXXFyYuIMRFRGRAVEVEJELayq0it7967HvKzMR231WzBmRkbo4+b+YWVOThoiNkdEHiLyDuzaNTI2IvKYRfeeaNnLHMcEBV85mJfnJxA0qkDyn97Hv1hEAADjxo2b6ubm1tClbXvs1MIA9VXU0UBds6F7h47i9atWreXz+XDz5k3N7du3eEWEBW93su2Pg+36o72VJdpYWogDPN1xpJMjuo8chtOzshYhojqfz//jSACPB1fOF1j4eXs+S0wY/w0RDVjLRa7Q5ZBDDjnk+McjAgAAKSnJK0OCA6WIqA4AVMmtEpWxoaEH+pmbY58ePdDKwgKHD3aSjBw6hLHp1w8tunbFXmZd0LJbNxxmZ48z0qYcQUTNn51DUVERtm3OGy50dnnW3qAlDjC3wPio6L1nz5xx5EL3XKThryp38rMb2rVrlzQpKWnH27dvhdVl5SIeAJRXlNMIwP9WVgaqamrQyqg11ItEQBMCKJWCsrLysX6Wllui4xMOPH36lLRv3565d+9m2w2r10V8LPkU2UxLG76Vfs3r1bPXtWHDht3r2Kv7JQCoh++Jd9Wr5887Hjl6dPCLl8/DtJo1exsTN35Ihw4dHsipVuWQQw455PjvQEZGBpWZmYmPHj1qM21q5tMOHdsvz8ycPg4AaERk9uZtH52/c1cHVQ11d1pB0EYikVTU19c9qKmoelxW9u1bj549cejQ4aeGDB9+gmEYfvHly4O+lZe34vN45e1NTB4ampg8IIRIAACwslI3ZXLalsLCM04fPn0Cs65doFevXictrfouc3b1OErzeCJG+teyzOQPwg98ANB6fvs20DwederUKWxpYtKpuPiq58WLl1BKUFNPT7d2kKNTffu27Q47Dh58vL6+/qfHOn3wYPeiwqKY23duBwCigkQqBalUWqGurl5HURRU19WqIiGq6hoaYNiq1a658xeMJYR8lStzOeSQQw45/ru99N27d0sT4scvfPb82XhfP+9IX9+glWKxWFY/agCACgCIAOCbbK4eEZslJo4f9+7129jaqipNsUQCYrEYGIaRdu5set/BwS7b3dtvKyGEAUJg+5pV25ctX+7x9OlT0NDQ4Ono6kLH9u1fdjLrcqarRe+8YcOGnfiPFfqfflFm9Bz3X3l5eZSnpycDrNud+Z37nAA7HxYRW8yemjn+zp3bRjw+fzDDMJoEABjEj8oqakc9PEatcXH3vtjQ0ADyIjg55JBDDjn+uyFDRcuLjYk68v7de8fWRm3W+nr6b7IbaHe2ro4LLP8XBAoKcP/evV5527cHFBdfi6EAeDSffkUBnNXS1mLKv5UBABn+5u0bXUQGOnTo+KJ1m9YbjAxbPX/88JHDqdOnQt68eYOa6po0AAIwCArKytCld2/YvmOnMjsy9k/btv/IQydNNDhkZmSQkpIS+vr163D9+nUm3NycMg8PBy0tLYZV5PirMEbJoUP0quvXxdxpEZkWDVVVmgpqagAAXwghX5s8UDlvuhxyyCGHHP/t4KLDiKifnpa28crlK4MkYjG0MjS8171bz5v1dbV7mqmqUSJGxEglTI/3H96733vwoLOSkiJt2KrV3VHOzuMdhg0rJoRUyui1FkcP7B14+syZyKfPn1mJ6htAWVEJPn/8BDw+H9q0ac0oKSidUlNVrVZVVmaq6+pQtVmz6imZmRGEEPF/pND/KcuHpWVFzmvnwNHosb+TK3M55JBDDjn+Nyh1fv6OHYH7DxyM/vTpU8/y8nJQ5PFAQBGQSKQgYRhQUVWBVq1aPXV0dFziGxKymhDSAABgbm7OHzFCFQ8dqibXWYcWEalnzx72uHzhau9vpaWWyqqqda309fdZWFu/b9GixYM/orb9M5D/yYcFAJCZCQCQiXKPXA455JBDjv9NkI0WIyL/4N69lsU3bljyKGpE2bdSUFFVIxraWrdMjEwOuAmFVwkh1QA/Z6X7PsjFk/L0/ENKccrW1raxq8vOzg7khGpyyCGHHHLI8Tcpda6d7c+QJxTS/5Ku/snx8vLyaKFQSNva2vKEQiEt/P49eXu2HHLIIYcccvx3KHZOEQNA4w/rjf+pIpdDDjnkkEMOOeSQQw455JBDDjnkkEMOOeSQQw455JBDDjnkkEMOOeSQQw455JBDDjnkkEMOOeSQQw455JBDDjnkkEMOOeSQQw455JBDDjnkkEMOOeSQQw455JBDDjnkkEMOOeSQQw455JBDDjnkkEMOOeSQQw455JBDDjnkkEMOOeSQQw455Ph/F/8faiaAiwmzDDIAAAAASUVORK5CYII=";
const SADWORDS=new Set(["sad","lonely","grieving","numb","angry","frustrated","resentful","overwhelmed","anxious","worried","restless","scattered","tired","exhausted","drained","confused","lost","frozen","distant","bitter","hurt","fearful","tense","agitated","unfocused","fragmented","depleted","empty","drowning","stuck","blocked","isolated","longing","mourning","raw","shaky","exposed","heavy"]);
const DEF_MSGS=["Remember how you got here. You chose this path for a reason.","Try to name what you're feeling. Just naming it can help.","Whatever you're feeling, try to hold it in compassion and love.","Give this feeling space. It doesn't need to be fixed right now.","A walk somewhere green might help your body process this.","Generating love — for yourself or for someone else — puts you on the path to healing.","It's okay to feel uncomfortable and ungrounded. This is part of the process.","You won't feel better right away, but being on the path to recovery is what matters.","Try a practice that protects your nervous system. Even five minutes.","Breathe into where you feel it in your body. Let it be there."];

/* ═══ STORAGE ═══ */
const K={st:"hcm-state",sc:"hcm-schedules",cv:"hcm-curves",cl:"hcm-calendar"};
function ld(k){try{const r=localStorage.getItem(k);return r?JSON.parse(r):null;}catch(e){return null;}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

/* ═══ PRESETS — UNIFIED MEDICATION SYSTEM ═══ */
// Each medication template defines everything about a med: waveform, schedule, suppression, color
const uid=()=>Math.random().toString(36).slice(2,8);

// E2 curve presets (same data as before)
// Sampled from estrannaise's exact EV im 3-compartment model (params d,k1,k2,k3 =
// [478.0, 0.236, 4.85, 1.24]) at the 2 mg reference dose. Matches estrannaise's
// single- and multi-dose output to within ~0.3 pg/mL across a full schedule.
const CURVE_EV_IM=[{t:0,v:0},{t:0.25,v:20.8},{t:0.5,v:53.3},{t:0.75,v:80.5},{t:1,v:99.7},{t:1.25,v:111.9},{t:1.5,v:118.8},{t:1.75,v:121.8},{t:2,v:122.1},{t:2.25,v:120.4},{t:2.5,v:117.3},{t:3,v:109},{t:3.5,v:99.5},{t:4,v:89.8},{t:5,v:72},{t:6,v:57.1},{t:7,v:45.2},{t:8,v:35.7},{t:10,v:22.3},{t:12,v:13.9},{t:14,v:8.7},{t:16,v:5.4},{t:18,v:3.4},{t:21,v:1.7},{t:24,v:0.8},{t:28,v:0.3}];
// The following ester curves are sampled from estrannaise's exact 3-compartment
// models (modeldata.js PKParameters), each at the reference dose noted.
// EEn im [191.4,0.119,0.601,0.402] @ 4mg ref:
const CURVE_EEN_IM=[{t:0,v:0},{t:0.5,v:5.7},{t:1,v:18.9},{t:2,v:52.9},{t:3,v:83.9},{t:4,v:106.2},{t:5,v:119.4},{t:6,v:124.9},{t:7,v:124.7},{t:8,v:120.6},{t:10,v:106.1},{t:12,v:88.9},{t:14,v:72.5},{t:17,v:52.1},{t:20,v:36.8},{t:24,v:23},{t:28,v:14.3},{t:32,v:8.9},{t:38,v:4.4},{t:44,v:2.1}];
// EC im [246.0,0.0825,3.57,0.669] @ 4mg ref:
const CURVE_EC_IM=[{t:0,v:0},{t:0.5,v:18.9},{t:1,v:44},{t:2,v:75.5},{t:3,v:87.7},{t:4,v:90.1},{t:5,v:87.8},{t:6,v:83.3},{t:8,v:72.4},{t:10,v:61.9},{t:12,v:52.6},{t:15,v:41.1},{t:18,v:32.1},{t:22,v:23.1},{t:26,v:16.6},{t:30,v:11.9},{t:36,v:7.3},{t:42,v:4.4},{t:48,v:2.7}];
// EB im [1893.1,0.67,61.5,4.34] @ 1mg ref:
const CURVE_EB_IM=[{t:0,v:0},{t:0.15,v:122.1},{t:0.3,v:184.7},{t:0.5,v:207.5},{t:0.75,v:197.1},{t:1,v:174},{t:1.25,v:149.6},{t:1.5,v:127.3},{t:2,v:91.4},{t:2.5,v:65.4},{t:3,v:46.8},{t:3.5,v:33.5},{t:4,v:24},{t:5,v:12.3},{t:6,v:6.3},{t:7,v:3.2}];
// EUn im [471.5,0.01729,6.528,2.285] @ 10mg ref:
const CURVE_EUN_IM=[{t:0,v:0},{t:0.5,v:18.8},{t:1,v:29.8},{t:1.5,v:33.3},{t:2,v:34.2},{t:2.5,v:34.3},{t:3,v:34.2},{t:4,v:33.6},{t:5,v:33.1},{t:7,v:31.9},{t:10,v:30.3},{t:14,v:28.3},{t:21,v:25.1},{t:30,v:21.5},{t:45,v:16.6},{t:60,v:12.8},{t:90,v:7.6},{t:120,v:4.5},{t:160,v:2.3},{t:200,v:1.1}];
const CURVE_EV_SQ=[{t:0,v:0},{t:.5,v:2},{t:1,v:5},{t:2,v:12},{t:3,v:20},{t:4,v:28},{t:5,v:35},{t:7,v:44},{t:9,v:46},{t:10,v:45.8},{t:12,v:40},{t:14,v:32.4},{t:18,v:14.7},{t:24,v:0}];
const CURVE_E2_CUSTOM=[{t:0,v:0},{t:1,v:20},{t:3,v:50},{t:5,v:40},{t:8,v:25},{t:12,v:12},{t:18,v:3}];
const CURVE_P4_RECTAL=[{t:0,v:0},{t:.15,v:14},{t:.25,v:17},{t:.5,v:12},{t:1,v:5},{t:1.5,v:1},{t:2,v:0}];
const CURVE_P4_VAGINAL=[{t:0,v:0},{t:.2,v:6},{t:.35,v:8},{t:.6,v:7},{t:1,v:4},{t:1.5,v:1.5},{t:2,v:0}];
// Patch waveform: flat for duration, then drops. X = days since application, Y = fraction of steady-state (0-1)
const CURVE_PATCH=[{t:0,v:0},{t:.1,v:.8},{t:.25,v:1},{t:3,v:1},{t:3.5,v:.5},{t:4,v:0}];

const DEF_PK_E2={peak:50,tPeak:3,decayHalf:3,riseSharp:2};
const DEF_PK_P4={peak:17,tPeakH:4,decayH:.08};

function makeMed(template){
  const m={...template,id:uid(),doses:[],notes:""};
  if(m.hasSuppression&&!m.suppressions){
    let method=m.suppressionMethod||"gradual";
    if(method==="blood-level"||method==="dose-based"||method==="ceiling")method="gradual";
    const mode=m.suppressionMode||"waveform";
    const mirror=m.suppressionMirror??true;
    // Generate mirrored suppression points from the med's waveform if mirror is on
    let suppPts=[{t:0,v:0.8},{t:1,v:0.6},{t:3,v:0.3},{t:7,v:0.05},{t:14,v:0}];
    if(mirror&&m.hasWaveform&&m.points?.length>=2){suppPts=mirrorWaveform(m.points);}
    m.suppressions=[{target:m.suppressionTarget||"T",method,mode,suppMirror:mirror,suppPts,
      threshold:m.suppressionThreshold||120,effectiveness:m.suppressionEffectiveness||1,
      duration:m.suppressionDuration||m.suppressionDoseWindow||7,ceiling:m.suppressionCeiling||0,
      suppScale:1,suppTimeScale:m.suppressionTimeScale||1}];
    // T meds also suppress P4
    if(m.hormone==="T"){m.suppressions.push({target:"P4",method,mode,suppMirror:mirror,suppPts:suppPts.map(p=>({...p})),
      threshold:m.suppressionThreshold||120,effectiveness:(m.suppressionEffectiveness||0.8)*0.6,
      duration:m.suppressionDuration||14,ceiling:0,suppScale:1,suppTimeScale:m.suppressionTimeScale||1});}
  }
  if(!m.suppressions)m.suppressions=[];
  m.suppressions=m.suppressions.map(s=>{
    if(s.method==="blood-level"||s.method==="dose-based"||s.method==="ceiling")return{...s,method:"gradual",duration:s.duration||s.doseWindow||7};
    return s;
  });
  return m;
}

// Testosterone waveform curves (ng/dL, based on published PK data)
// T Cypionate IM: ~200mg injection, peaks ~800-1000 ng/dL at day 2-3, half-life ~8 days
const CURVE_TC_IM=[{t:0,v:0},{t:.5,v:200},{t:1,v:500},{t:2,v:800},{t:3,v:900},{t:4,v:850},{t:5,v:750},{t:7,v:550},{t:9,v:400},{t:11,v:300},{t:14,v:200},{t:18,v:100},{t:21,v:50},{t:28,v:20}];
// T Enanthate IM: similar to cypionate but slightly faster peak
const CURVE_TE_IM=[{t:0,v:0},{t:.5,v:250},{t:1,v:600},{t:1.5,v:850},{t:2,v:950},{t:3,v:900},{t:4,v:800},{t:6,v:600},{t:8,v:400},{t:10,v:280},{t:13,v:180},{t:16,v:100},{t:20,v:40}];
// T SubQ: slower absorption, lower peak, longer tail
const CURVE_TC_SQ=[{t:0,v:0},{t:1,v:150},{t:2,v:350},{t:3,v:500},{t:4,v:580},{t:5,v:600},{t:7,v:520},{t:9,v:420},{t:11,v:330},{t:14,v:220},{t:18,v:130},{t:21,v:70},{t:28,v:25}];
// T Gel: daily application, steady-state ~500 ng/dL
const CURVE_T_GEL=[{t:0,v:0},{t:.1,v:300},{t:.25,v:450},{t:.5,v:500},{t:.75,v:480},{t:1,v:400},{t:1.5,v:200},{t:2,v:50}];

// Helper: generate mirrored suppression points from a positive waveform
function mirrorWaveform(pts){if(!pts||pts.length<2)return[{t:0,v:0.8},{t:7,v:0.05},{t:14,v:0}];const maxV=Math.max(...pts.map(p=>p.v),1);return pts.map(p=>({t:p.t,v:Math.round(Math.min(1,p.v/maxV)*20)/20}));}

const MED_TEMPLATES={
  "ev-subq":{name:"EV SubQ 20mg/mL (approximation)",color:"#fb7185",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:{peak:46,tPeak:7,decayHalf:5,riseSharp:1.2},points:CURVE_EV_SQ.map(p=>({...p})),
    refDose:1,concentration:20,floor:2,unit:"pg/mL",hormone:"E2",axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionThreshold:120,suppressionEffectiveness:1,suppressionDuration:7,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0},
  "ev-im":{name:"EV IM (Estrannai)",color:"#f472b6",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:{peak:125,tPeak:2,decayHalf:2.5,riseSharp:3},points:CURVE_EV_IM.map(p=>({...p})),
    refDose:2,concentration:20,floor:2,unit:"pg/mL",hormone:"E2",axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionThreshold:120,suppressionEffectiveness:1,suppressionDuration:7,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0},
  "een-im":{name:"EEn IM (Estrannai)",color:"#fb7185",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:{peak:125,tPeak:6,decayHalf:7,riseSharp:2.5},points:CURVE_EEN_IM.map(p=>({...p})),
    refDose:4,concentration:20,floor:2,unit:"pg/mL",hormone:"E2",axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionThreshold:120,suppressionEffectiveness:1,suppressionDuration:7,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:7,recurStart:0},
  "ec-im":{name:"EC IM (Estrannai)",color:"#e879f9",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:{peak:90,tPeak:4,decayHalf:9,riseSharp:2},points:CURVE_EC_IM.map(p=>({...p})),
    refDose:4,concentration:20,floor:2,unit:"pg/mL",hormone:"E2",axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionThreshold:120,suppressionEffectiveness:1,suppressionDuration:7,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:7,recurStart:0},
  "eb-im":{name:"EB IM (Estrannai)",color:"#f9a8d4",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:{peak:208,tPeak:0.5,decayHalf:1,riseSharp:4},points:CURVE_EB_IM.map(p=>({...p})),
    refDose:1,concentration:20,floor:2,unit:"pg/mL",hormone:"E2",axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionThreshold:120,suppressionEffectiveness:1,suppressionDuration:7,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:2,recurStart:0},
  "eun-im":{name:"EUn IM (Estrannai)",color:"#c084fc",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:{peak:34,tPeak:2.5,decayHalf:40,riseSharp:2},points:CURVE_EUN_IM.map(p=>({...p})),
    refDose:10,concentration:100,floor:2,unit:"pg/mL",hormone:"E2",axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionThreshold:120,suppressionEffectiveness:1,suppressionDuration:7,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:14,recurStart:0},
  "e2-patch-tw":{name:"E2 Patch (twice-weekly)",color:"#c084fc",enabled:true,deliveryType:"continuous",continuousType:"patch",
    hasWaveform:true,waveformMode:"freeform",pk:DEF_PK_E2,points:CURVE_PATCH.map(p=>({...p})),
    refDose:1,concentration:null,floor:2,unit:"pg/mL",hormone:"E2",axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionThreshold:120,suppressionEffectiveness:1,suppressionDuration:7,suppressionCeiling:0,
    patchPgPerUnit:90,patchMcgPerUnit:100,patchMcgRef:100,patchTaper:0,pieces:[],
    maxOnBody:8,monthlyPatches:14,maxWear:14,maxPerDay:3,changeDayPct:70,tegadermDays:0,
    activeHoursOn:true,activeWindows:[{a:7,b:24}],fitTarget:"E2",
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0,
    patchCurve:CURVE_PATCH_TW.map(p=>({...p})),patchDuration:3.5,patchCurveDays:14},
  "e2-patch-ow":{name:"E2 Patch (once-weekly)",color:"#a78bfa",enabled:true,deliveryType:"continuous",continuousType:"patch",
    hasWaveform:true,waveformMode:"freeform",pk:DEF_PK_E2,points:CURVE_PATCH.map(p=>({...p})),
    refDose:1,concentration:null,floor:2,unit:"pg/mL",hormone:"E2",axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionThreshold:120,suppressionEffectiveness:1,suppressionDuration:7,suppressionCeiling:0,
    patchPgPerUnit:90,patchMcgPerUnit:100,patchMcgRef:100,patchTaper:0,pieces:[],
    maxOnBody:8,monthlyPatches:14,maxWear:14,maxPerDay:3,changeDayPct:70,tegadermDays:0,
    activeHoursOn:true,activeWindows:[{a:7,b:24}],fitTarget:"E2",
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0,
    patchCurve:CURVE_PATCH_OW.map(p=>({...p})),patchDuration:7,patchCurveDays:28},
  "p4-rectal":{name:"Progesterone (rectal)",color:"#a855f7",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:DEF_PK_P4,points:CURVE_P4_RECTAL.map(p=>({...p})),
    refDose:100,concentration:null,floor:0,unit:"ng/mL",hormone:"P4",axisSide:"right",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionTimeScale:3,suppressionThreshold:200,suppressionEffectiveness:0.4,suppressionDuration:1,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0},
  "p4-vaginal":{name:"Progesterone (vaginal) (approximation)",color:"#8b5cf6",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:DEF_PK_P4,points:CURVE_P4_VAGINAL.map(p=>({...p})),
    refDose:100,concentration:null,floor:0,unit:"ng/mL",hormone:"P4",axisSide:"right",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionTimeScale:3,suppressionThreshold:200,suppressionEffectiveness:0.4,suppressionDuration:1,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0},
  "spiro":{name:"Spironolactone (approximation)",color:"#fb923c",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:false,waveformMode:"freeform",pk:DEF_PK_E2,points:[],
    refDose:100,concentration:null,floor:0,unit:"",hormone:null,axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionThreshold:50,suppressionEffectiveness:0.6,suppressionDuration:1,suppressionCeiling:150,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0},
  "bica":{name:"Bicalutamide (approximation)",color:"#f59e0b",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:false,waveformMode:"freeform",pk:DEF_PK_E2,points:[],
    refDose:50,concentration:null,floor:0,unit:"",hormone:null,axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionThreshold:25,suppressionEffectiveness:0.7,suppressionDuration:1,suppressionCeiling:100,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0},
  "cypro":{name:"Cyproterone Acetate (approximation)",color:"#f97316",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:false,waveformMode:"freeform",pk:DEF_PK_E2,points:[],
    refDose:12.5,concentration:null,floor:0,unit:"",hormone:null,axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"gradual",suppressionThreshold:6,suppressionEffectiveness:0.85,suppressionDuration:1,suppressionCeiling:50,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0},
  "gnrh":{name:"GnRH Agonist / Post-orchi (approximation)",color:"#38bdf8",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:false,waveformMode:"freeform",pk:DEF_PK_E2,points:[],
    refDose:1,concentration:null,floor:0,unit:"",hormone:null,axisSide:"left",
    hasSuppression:true,suppressionTarget:"T",suppressionMethod:"flatline",suppressionThreshold:120,suppressionEffectiveness:1,suppressionDoseWindow:1,suppressionCeiling:150,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0},
  "custom":{name:"Custom Medication",color:"#22d3ee",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:DEF_PK_E2,points:CURVE_E2_CUSTOM.map(p=>({...p})),
    refDose:1,concentration:20,floor:0,unit:"units",hormone:null,axisSide:"left",
    hasSuppression:false,suppressionTarget:"T",suppressionMethod:"gradual",suppressionThreshold:120,suppressionEffectiveness:1,suppressionDuration:7,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:3.5,recurStart:0},
  "tc-im":{name:"T Cypionate IM (approximation)",color:"#38bdf8",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:{peak:900,tPeak:3,decayHalf:8,riseSharp:2},points:CURVE_TC_IM.map(p=>({...p})),
    refDose:200,concentration:200,floor:0,unit:"ng/dL",hormone:"T",axisSide:"left",
    hasSuppression:true,suppressionTarget:"E2",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionThreshold:200,suppressionEffectiveness:0.8,suppressionDuration:14,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:7,recurStart:0},
  "te-im":{name:"T Enanthate IM (approximation)",color:"#0ea5e9",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:{peak:950,tPeak:2,decayHalf:7,riseSharp:3},points:CURVE_TE_IM.map(p=>({...p})),
    refDose:200,concentration:200,floor:0,unit:"ng/dL",hormone:"T",axisSide:"left",
    hasSuppression:true,suppressionTarget:"E2",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionThreshold:200,suppressionEffectiveness:0.8,suppressionDuration:14,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:7,recurStart:0},
  "tc-subq":{name:"T Cypionate SubQ (approximation)",color:"#7dd3fc",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:{peak:600,tPeak:5,decayHalf:8,riseSharp:1.2},points:CURVE_TC_SQ.map(p=>({...p})),
    refDose:100,concentration:200,floor:0,unit:"ng/dL",hormone:"T",axisSide:"left",
    hasSuppression:true,suppressionTarget:"E2",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionThreshold:100,suppressionEffectiveness:0.8,suppressionDuration:14,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:7,recurStart:0},
  "t-gel":{name:"T Gel (daily) (approximation)",color:"#bae6fd",enabled:true,deliveryType:"single",continuousType:null,
    hasWaveform:true,waveformMode:"freeform",pk:{peak:500,tPeak:.5,decayHalf:.8,riseSharp:3},points:CURVE_T_GEL.map(p=>({...p})),
    refDose:50,concentration:null,floor:0,unit:"ng/dL",hormone:"T",axisSide:"left",
    hasSuppression:true,suppressionTarget:"E2",suppressionMethod:"gradual",suppressionMode:"waveform",suppressionMirror:true,suppressionThreshold:50,suppressionEffectiveness:0.7,suppressionDuration:1,suppressionCeiling:0,
    patchPgPerUnit:null,patchTaper:null,patchDuration:null,conservePatches:false,patchPivot:1,
    recurEnabled:false,recurDose:0,recurInterval:1,recurStart:0},
};

// Backward compat: old curve/schedule format references
const PC={name:"Custom",refDose:1,conc:20,floor:2,mode:"freeform",pk:{peak:50,tPeak:3,decayHalf:3,riseSharp:2},points:CURVE_E2_CUSTOM.map(p=>({...p}))};
const DEF_P4PK={peak:17,tPeakH:4,decayH:.08};
const P4_RECTAL=CURVE_P4_RECTAL;const P4_VAGINAL=CURVE_P4_VAGINAL;
const DEF_P4PTS=CURVE_P4_RECTAL;
const DS={name:"Default",curveIdx:0,cycleInjs:[],patches:[],p4Doses:[],p4pk:{...DEF_P4PK},p4Pts:DEF_P4PTS.map(p=>({...p})),patchPg:90,patchTaper:0,cycleRepeat:1,cycleLength:29.5,recurEnabled:false,recurDose:1.4,recurInterval:3.5,recurStart:0,showDays:29.5,ovulationDay:16,medications:null};

// Template groups for the picker UI
const TEMPLATE_GROUPS=[
  {label:"Estradiol",items:["ev-subq","ev-im","een-im","ec-im","eb-im","eun-im","e2-patch-tw","e2-patch-ow"]},
  {label:"Progesterone",items:["p4-rectal","p4-vaginal"]},
  {label:"Testosterone",items:["tc-im","te-im","tc-subq","t-gel"]},
  {label:"Anti-androgens",items:["spiro","bica","cypro","gnrh"]},
  {label:"Custom",items:["custom"]},
];

/* ═══ CHART ═══ */
const PD={top:26,right:48,bottom:42,left:48};
// Generic series renderer — handles solid, dashed, filled styles
function renderSeries(ctx,series,xS,yFn,cW,cH,calMode){
  ctx.save();ctx.beginPath();ctx.rect(PD.left,PD.top,cW,cH);ctx.clip();
  const d=series.data;if(!d||d.length<2){ctx.restore();return;}
  const col=series.color||"#94a3b8";
  // Filled (ocean) style
  if(series.style==="filled"){
    ctx.fillStyle=col.replace(/[\d.]+\)$/,'.06)').replace('rgb','rgba');
    if(!col.includes('rgba'))ctx.fillStyle=col+"0f";
    ctx.beginPath();ctx.moveTo(xS(d[0].t),PD.top+cH);
    for(const p of d)ctx.lineTo(xS(p.t),yFn(Math.max(0,p.v)));
    ctx.lineTo(xS(d[d.length-1].t),PD.top+cH);ctx.closePath();ctx.fill();
  }
  // Line
  ctx.strokeStyle=col;
  ctx.lineWidth=series.style==="dashed"?(calMode?2.5:1.2):2;
  ctx.lineJoin="round";
  if(series.style==="dashed")ctx.setLineDash([5,3]);
  ctx.beginPath();
  for(let i=0;i<d.length;i++){const x=xS(d[i].t),y=yFn(Math.max(0,d[i].v));i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.stroke();ctx.setLineDash([]);
  // Label (calMode only for ref, always for custom)
  if(series.label&&(calMode||series.showLabel)){
    const lblT=d[Math.floor(d.length*0.3)];
    if(lblT){const lx=xS(lblT.t)+3,ly=yFn(Math.max(0,lblT.v))-8;
      ctx.font="bold 10px sans-serif";const w=ctx.measureText(series.label).width;
      ctx.fillStyle="rgba(10,5,15,.75)";ctx.beginPath();const px=lx-3,py=ly-10,pw=w+6,ph=14,r=4;ctx.moveTo(px+r,py);ctx.lineTo(px+pw-r,py);ctx.quadraticCurveTo(px+pw,py,px+pw,py+r);ctx.lineTo(px+pw,py+ph-r);ctx.quadraticCurveTo(px+pw,py+ph,px+pw-r,py+ph);ctx.lineTo(px+r,py+ph);ctx.quadraticCurveTo(px,py+ph,px,py+ph-r);ctx.lineTo(px,py+r);ctx.quadraticCurveTo(px,py,px+r,py);ctx.fill();
      ctx.fillStyle=col;ctx.textAlign="left";ctx.fillText(series.label,lx,ly);}}
  ctx.restore();
}
/* == PALACE OF POWER - WATCH EMBED (paste at module scope) == */

const WATCH_APP_SRC = "var DOW3 = [\"Sun\",\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\"];\nvar APP_VER = \"v134\";\nvar D = require(\"Storage\").readJSON(\"pkpower.json\", 1) || null;\nvar TH = D ? D.theme : { bg:\"#000000\", e2:\"#ff00ff\", p4:\"#00ffff\", fg:\"#ffffff\", accent:\"#ffff00\" };\nfunction sStacks(cap) { var st = [], i; for (i = 0; i < cap; i++) st.push([]); st.limit = Math.max(4, cap * 2); return st; }\nfunction sTop(st, i) { return st[i].length ? st[i][st[i].length - 1] : -1e9; }\nfunction sPush(st, i, t) { var s2 = st[i]; s2.push(t); while (s2.length > st.limit) s2.shift(); }\n/* Remembers the best spot's stamp instead of looking it up again for every\n   candidate. This was two function calls per free spot per pick, and on a cold\n   open \\u2014 where the rotation is simulated from scratch \\u2014 it was 8,516 calls to\n   sTop alone, the single biggest cost in the minute-long first load. Same\n   answer: strictly-less keeps ties on the lowest index, exactly as before. */\nfunction sPick(st, cap, free) {\nvar best = -1, bv = 0, i, s2, v;\nfor (i = 0; i < free.length; i++) {\ns2 = st[free[i]];\nv = s2.length ? s2[s2.length - 1] : -1e9;\nif (best < 0 || v < bv) { best = free[i]; bv = v; }\n}\nreturn best;\n}\nfunction sSeed(seed, st, cap) {\nif (!seed) return false;\nvar i, j2;\nif (seed.st && seed.st.length === cap) {\nfor (i = 0; i < cap; i++) { st[i] = []; for (j2 = 0; j2 < seed.st[i].length; j2++) sPush(st, i, seed.st[i][j2]); }\nreturn true;\n}\nif (seed.lu && seed.lu.length === cap) { for (i = 0; i < cap; i++) sPush(st, i, seed.lu[i]); return true; }\nreturn false;\n}\nvar _rlistC = null;\nfunction rotList() {\nif (_rlistC) return _rlistC;\nvar src = (D && D.pieces) || [], out = [], i, p;\nfor (i = 0; i < src.length; i++) { p = src[i]; if ((+p.wear) > 0 && (+p.size) > 0) out.push(p); }\n_rlistC = out; return out;\n}\nfunction rotate(cycleIdx) {\nvar cl = D.cycleLen, cap = (D.cap || 8), seed = D.rot || null;\nvar list = rotList();\nvar want = Math.max(0, Math.floor(cycleIdx || 0));\nvar freeAt = [], i; for (i = 0; i < cap; i++) freeAt.push(-1e9);\nvar st = sStacks(cap);\nvar from = 0, skipBefore = -Infinity, preset = {};\nif (sSeed(seed, st, cap) && seed.cyc <= want) {\nfor (var si in (seed.occ || {})) { var o = seed.occ[si]; freeAt[+si] = o.off; preset[o.k] = +si; }\nfrom = seed.cyc; skipBefore = seed.pos;\n}\nfunction runCycle(c) {\nvar evs = [], pi, pp, onx;\nfor (pi = 0; pi < list.length; pi++) {\npp = list[pi]; onx = (+pp.day) + c * cl;\nevs.push({ k: pp.key, on: onx, off: onx + (+pp.wear), i: pi });\n}\nevs.sort(function (a, b) { return (a.on - b.on) || (a.i - b.i); });\nvar m = {}, e, k2, free, best;\nfor (k2 = 0; k2 < evs.length; k2++) {\ne = evs[k2];\nif (e.on <= skipBefore) { if (preset[e.k] != null) m[e.k] = preset[e.k]; continue; }\nfree = [];\nfor (i = 0; i < cap; i++) if (freeAt[i] <= e.on + 1e-9) free.push(i);\nbest = sPick(st, cap, free);\nif (best < 0) continue;\nfreeAt[best] = e.off; sPush(st, best, e.off); m[e.k] = best;\n}\nreturn m;\n}\nfunction sigAt(c) {\nvar parts = [], a, b;\nfor (i = 0; i < cap; i++) {\na = freeAt[i] - c * cl; b = sTop(st, i) - c * cl;\nparts.push((a < -1e6 ? \"-\" : Math.round(a * 100) / 100) + \",\" + (b < -1e6 ? \"-\" : Math.round(b * 100) / 100));\n}\nreturn parts.join(\"|\");\n}\nvar seen = {}, maps = [], tops = [], LIMIT = Math.max(8, cap * 4 + 8), c, sg, at;\nfor (c = from; c <= want; c++) {\nsg = sigAt(c);\nif (seen[sg] !== undefined) {\nvar first = seen[sg], period = c - first;\nat = first + ((want - first) % period);\nreturn { assign: maps[at - from], lastUsed: tops[at - from], from: from, maps: maps, tops: tops,\nperiod: period, first: first };\n}\nseen[sg] = c;\nmaps.push(runCycle(c));\nvar tp = []; for (i = 0; i < cap; i++) tp.push(sTop(st, i));\ntops.push(tp);\nif (c - from >= LIMIT && c < want) break;\n}\nat = maps.length - 1;\nreturn { assign: maps[at], lastUsed: tops[at], from: from, maps: maps, tops: tops };\n}\nvar _rcache = {}, _lucache = {};\nfunction rotInit() { _rcache = {}; _lucache = {}; _rlistC = null; }\nfunction rotAssign(c) {\ntry {\nif (_rcache[c]) return _rcache[c];\nvar r = rotate(c), i;\nif (r && r.maps) {\nfor (i = 0; i < r.maps.length; i++) {\nif (!_rcache[r.from + i]) { _rcache[r.from + i] = r.maps[i]; _lucache[r.from + i] = r.tops[i]; }\n}\nif (r.period) {\nvar span = r.first + r.period;\nfor (i = span; i < span + 40; i++) {\nvar src = r.first + ((i - r.first) % r.period);\nif (!_rcache[i] && _rcache[src]) { _rcache[i] = _rcache[src]; _lucache[i] = _lucache[src]; }\n}\n}\n}\n_rcache[c] = _rcache[c] || (r.assign || {});\n_lucache[c] = _lucache[c] || (r.lastUsed || []);\nreturn _rcache[c];\n} catch (e) { return {}; }\n}\nvar SYN = 29.530588861, LREF = 947182440000;\nfunction jdnOf(d) {\nvar y = d.getFullYear(), mo = d.getMonth() + 1, da = d.getDate();\nvar a = Math.floor((14 - mo) / 12), yr = y + 4800 - a, m = mo + 12 * a - 3;\nreturn da + Math.floor((153 * m + 2) / 5) + 365 * yr + Math.floor(yr / 4)\n- Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;\n}\nfunction lunarPh(d) {\nvar j = jdnOf(d), ph = (j - 2451550.26) % SYN;\nif (ph < 0) ph += SYN;\nvar T = (j - 2451545) / 36525;\nreturn (ph + 0.000325 * Math.sin((134.96 + 477198.86 * T) * Math.PI / 180)) % SYN;\n}\n/* Same lunation number the tablet computes, by the same route: take the first\n   day of the month straight from lunarMid and count lunations to it. The old\n   LREF-based count was a THIRD anchor \\u2014 a fixed millisecond epoch rather than\n   a calendar day \\u2014 so it disagreed with the tablet on ~1.7% of days, and the\n   rotation is keyed by this index. */\nfunction lunarIdx(d) {\nreturn Math.round((jdnOf(d) - (lunarMid(d) - 1) - 2451550.26) / SYN);\n}\nfunction lunarMid(d) {\nvar mid = new Date(d.getFullYear(), d.getMonth(), d.getDate());\nvar v = Math.floor(lunarPh(mid)) + 1;\nreturn v > 30 ? 30 : v;\n}\nfunction _pos() {\nvar n = new Date(), tf = (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()) / 86400;\nvar md = (D && D.mode) || \"fixed\";\nif (md === \"lunar\") return { day: (lunarMid(n) - 1) + tf, idx: lunarIdx(n) };\nif (md === \"manual\" && D.manualStart) {\nvar diff = Math.floor((n.getTime() - D.manualStart) / 86400000);\nvar cl = Math.round(D.cycleLen) || 30;\nreturn { day: (((diff % cl) + cl) % cl) + tf, idx: Math.floor(diff / cl) };\n}\nif (md === \"fixed\") return { day: tf, idx: 0 };\nvar e = (Date.now() - D.epochMs) / 86400000, c = (D.epochCycleDay + e) % D.cycleLen;\nreturn { day: c < 0 ? c + D.cycleLen : c,\nidx: D.epochCycleIdx + Math.floor((D.epochCycleDay + e) / D.cycleLen) };\n}\nfunction cycleDayNow() {\ntry { var v = _pos().day; return isFinite(v) ? v : (D.epochCycleDay || 0); }\ncatch (e) { return D.epochCycleDay || 0; }\n}\nfunction cycleIdxNow() {\ntry { var v = _pos().idx; return isFinite(v) ? v : (D.epochCycleIdx || 0); }\ncatch (e) { return D.epochCycleIdx || 0; }\n}\nfunction two(n){ return (n<10?\"0\":\"\") + n; }\nfunction lunarDay() {\nvar d = Math.floor(cycleDayNow()) + 1;\nreturn isFinite(d) ? d : 1;\n}\nfunction rawSteps() {\ntry { if (Bangle.getHealthStatus) return Bangle.getHealthStatus(\"day\").steps | 0; } catch (e) {}\ntry { if (Bangle.getStepCount) return Bangle.getStepCount() | 0; } catch (e) {}\nreturn 0;\n}\nvar STF = \"pksteps.json\", _led = null, _stV = 0, _stW = 0, _stT = 0;\nvar GOAL_DAY = 7000, GOAL_WEEK = GOAL_DAY * 7;\nfunction dayKey() { var d = new Date(); return \"\" + d.getFullYear() + two(d.getMonth() + 1) + two(d.getDate()); }\nfunction ledger() {\nif (_led) return _led;\ntry { _led = require(\"Storage\").readJSON(STF, 1); } catch (e) {}\nif (!_led || typeof _led !== \"object\" || !_led.h) _led = { d:\"\", b:0, h:{} };\nreturn _led;\n}\nfunction stepsRefresh() {\nvar L = ledger(), k = dayKey(), raw = rawSteps(), dirty = false, i, ks;\nif (L.d !== k) {\nif (L.d) L.h[L.d] = _stV;\nks = Object.keys(L.h).sort();\nwhile (ks.length > 6) { delete L.h[ks.shift()]; }\nL.b = L.d ? raw : 0;\nL.d = k; dirty = true;\n}\nif (raw < L.b) { L.b = 0; dirty = true; }\n_stV = raw - L.b; if (_stV < 0) _stV = 0;\n_stW = _stV; ks = Object.keys(L.h);\nfor (i = 0; i < ks.length; i++) _stW += L.h[ks[i]] | 0;\nif (_stV >= GOAL_DAY && L.g !== k) {\nL.g = k; dirty = true;\ntry { if (!Bangle.isLocked()) { Bangle.buzz(120); setTimeout(function(){ Bangle.buzz(120); }, 180); } } catch (e) {}\n}\nif (dirty) { try { require(\"Storage\").writeJSON(STF, L); } catch (e) {} }\n}\nfunction stepsCached() { var t = Date.now(); if (!_stT || t - _stT > 30000) { stepsRefresh(); _stT = t; } return _stV; }\nfunction stepsWeek() { stepsCached(); return _stW; }\nfunction commas(n) {\nn = \"\" + (n | 0); var o = \"\", i, c = 0;\nfor (i = n.length - 1; i >= 0; i--) { o = n.charAt(i) + o; if (++c % 3 === 0 && i > 0) o = \",\" + o; }\nreturn o;\n}\nvar _batV = 100, _batT = 0;\nfunction battery() { var t = Date.now(); if (!_batT || t - _batT > 30000) { try { _batV = Bangle.getBattery(); } catch (e) { try { _batV = E.getBattery(); } catch (e2) {} } _batT = t; } return _batV; }\nfunction tLabel(ts) { if (ts === \"am\") return \"AM\"; if (ts === \"pm\") return \"PM\"; return \"\" + (ts || \"\"); }\nfunction timeOffset(t) { if (!t || t === \"am\") return 0; if (t === \"pm\") return 0.5; var p = (\"\"+t).split(\":\"); return ((+p[0]||0) + (+p[1]||0)/60) / 24; }\nfunction isSpecific(t) { return !!(t && (\"\"+t).indexOf(\":\") >= 0); }\nfunction fmtClock(fr) { var mins = ((Math.round(fr*1440) % 1440) + 1440) % 1440, h = (mins/60)|0, m = mins%60, ap = h<12?\"am\":\"pm\", h12 = h%12===0?12:h%12; return h12 + \":\" + two(m) + ap; }\nfunction fmtClockS(fr) { var s = fmtClock(fr); return s.substr(0, s.length-1); }\nvar FLIP_F = \"pkflip.json\";\nfunction loadFlip() { try { var v = require(\"Storage\").readJSON(FLIP_F, 1); return !!(v && v.f); } catch (e) { return false; } }\nfunction saveFlip() { try { require(\"Storage\").writeJSON(FLIP_F, { f: flipped ? 1 : 0 }); } catch (e) {} }\nvar page = 0, flipped = loadFlip(), alertEv = null;\nvar PG = [\"clock\", \"events\", \"solar\", \"graph\"];\nfunction buildPages() {\nPG = [\"clock\", \"events\"];\nif (D && D.pieces && D.pieces.length) PG.push(\"inv\");\nPG.push(\"solar\"); PG.push(\"graph\");\n}\nfunction pg() { return PG[page] || \"clock\"; }\nfunction pgIs(n) { return pg() === n; }\nvar MONS = [\"JAN\",\"FEB\",\"MAR\",\"APR\",\"MAY\",\"JUN\",\"JUL\",\"AUG\",\"SEP\",\"OCT\",\"NOV\",\"DEC\"];\nvar DAYS = [\"SUN\",\"MON\",\"TUE\",\"WED\",\"THU\",\"FRI\",\"SAT\"];\nfunction showErr(prefix, e) {\ng.setRotation(flipped ? 2 : 0); g.clear();\ng.setColor(\"#ffffff\").setFont(\"6x8\",1).setFontAlign(-1,-1);\nvar m = (e && e.message) ? e.message : (\"\"+e), lines=[prefix], i;\nfor (i=0;i<m.length;i+=28) lines.push(m.substr(i,28));\ng.drawString(lines.join(\"\\n\"), 4, 28);\n}\nvar BG_MIX = 1;\nvar _bgImg;\nfunction bgImage() {\nif (_bgImg) return _bgImg;\nvar W = 176, H = 176, bpr = W >> 3, buf = new Uint8Array(bpr * H), y, x, o, b;\nfor (y = 0; y < H; y++) {\nif (BG_MIX === 1)      b = (y & 1) ? 0x00 : ((y & 2) ? 0x55 : 0xaa);\nelse if (BG_MIX === 2) b = (y & 1) ? 0x55 : 0xaa;\nelse                   b = (y & 1) ? 0xff : ((y & 2) ? 0x55 : 0xaa);\no = y * bpr;\nfor (x = 0; x < bpr; x++) buf[o + x] = b;\n}\n_bgImg = { width: W, height: H, bpp: 1, buffer: buf.buffer };\nreturn _bgImg;\n}\n/* The dither pattern only depends on y & 3, so four rows of it tile the whole\n   screen. Repainting a seven-pixel strip was going through fillBg, which blits\n   the entire 176x176 image \\u2014 thirty thousand pixels to cover seven rows, three\n   times per scroll step. This blits ceil(band/4) four-row tiles instead, aligned\n   so the pattern keeps its phase. */\nvar _bgTile;\nfunction bgTile() {\nif (_bgTile) return _bgTile;\nvar W = 176, bpr = W >> 3, buf = new Uint8Array(bpr * 4), y, x, o, b;\nfor (y = 0; y < 4; y++) {\nif (BG_MIX === 1)      b = (y & 1) ? 0x00 : ((y & 2) ? 0x55 : 0xaa);\nelse if (BG_MIX === 2) b = (y & 1) ? 0x55 : 0xaa;\nelse                   b = (y & 1) ? 0xff : ((y & 2) ? 0x55 : 0xaa);\no = y * bpr;\nfor (x = 0; x < bpr; x++) buf[o + x] = b;\n}\n_bgTile = { width: W, height: 4, bpp: 1, buffer: buf.buffer };\nreturn _bgTile;\n}\nfunction fillBgBand(y0, y1) {\nif (y1 < y0) return;\nif (BG_MIX <= 0) { g.setColor(\"#000000\"); g.fillRect(0, y0, 175, y1); return; }\nif (BG_MIX >= 4) { g.setColor(TH.bg);     g.fillRect(0, y0, 175, y1); return; }\ntry {\ng.setColor(TH.bg); g.setBgColor(\"#000000\");\nvar t = bgTile(), y = y0 - (((y0 % 4) + 4) % 4);\nfor (; y <= y1; y += 4) g.drawImage(t, 0, y);\n} catch (e) { g.setColor(\"#000000\"); g.fillRect(0, y0, 175, y1); }\n}\nfunction fillBg() {\nif (BG_MIX <= 0) { g.setColor(\"#000000\"); g.fillRect(0, 0, 175, 175); return; }\nif (BG_MIX >= 4) { g.setColor(TH.bg);     g.fillRect(0, 0, 175, 175); return; }\ntry {\ng.setColor(TH.bg); g.setBgColor(\"#000000\");\ng.drawImage(bgImage(), 0, 0);\n} catch (e) { g.setColor(\"#000000\"); g.fillRect(0, 0, 175, 175); }\n}\nfunction slimHeader() {\nvar t = new Date();\ng.setColor(TH.fg).setFont(\"6x8\",1).setFontAlign(-1,-1);\ng.drawString(two(t.getHours())+\":\"+two(t.getMinutes())+\"  \"+t.getDate()+\" \"+MONS[t.getMonth()], 4, 4);\n}\nfunction phaseNow() {\ntry {\nvar ph = D && D.phases;\nif (!ph || !ph.length) return \"\";\nvar d = Math.floor(cycleDayNow());\nif (!isFinite(d) || d < 0) d = 0;\nreturn \"\" + (ph[d % ph.length] || \"\");\n} catch (e) { return \"\"; }\n}\nfunction vFont(h) { try { g.setFont(\"Vector\", h); return true; } catch (e) { return false; } }\nfunction subFont() { if (!vFont(12)) g.setFont(\"6x8\", 1); }\nfunction drawCheck(x, y) {\nvar i;\ng.setColor(\"#00ff00\");\nfor (i = 0; i < 2; i++) {\ng.drawLine(x + i, y, x + 3 + i, y + 4);\ng.drawLine(x + 3 + i, y + 4, x + 9 + i, y - 5);\n}\n}\nfunction statLine(txt, tick, y, col) {\ng.setColor(col); subFont();\nvar cw = tick ? 17 : 0;\nif (g.stringWidth(txt) + cw > 172) g.setFont(\"6x8\", 1);\nvar tw = g.stringWidth(txt), left = 88 - (tw + cw) / 2;\nif (left < 2) left = 2;\ng.setFontAlign(-1, 0).drawString(txt, left, y);\nif (tick) drawCheck(left + tw + 6, y);\ng.setColor(col);\n}\nfunction drawClock() {\nvar t = new Date();\n_lastMin = t.getMinutes();\ng.setColor(TH.fg).setFontAlign(0,0);\ng.setFont(\"6x8\", 5).drawString(two(t.getHours())+\":\"+two(t.getMinutes()), 88, 50);\ng.setFont(\"6x8\", 2).drawString(DOW3[t.getDay()]+\" \"+(t.getMonth()+1)+\"/\"+t.getDate()+\"/\"+two(t.getFullYear()%100), 88, 88);\ntry { drawPhaseRow(); } catch (e2) {}\nvar st = commas(stepsCached()), wk = commas(stepsWeek());\nstatLine(battery()+\"%    \"+st+\" steps\", stepsCached() >= GOAL_DAY, 145, TH.fg);\nstatLine(\"7d  \"+wk,                     stepsWeek()  >= GOAL_WEEK, 163, TH.accent);\n}\n/* \u2550\u2550\u2550 THE MOON \u2550\u2550\u2550\n   This was a fixed crescent \\u2014 a white disc with a black one nudged over it \\u2014\n   drawn identically at new moon and full. The tablet shows one of eight emoji;\n   the watch has no emoji font, so the shape is drawn instead.\n\n   The BUCKET is computed exactly as the tablet computes it, floor(day/29*8)%8 on\n   the 0-based lunar day, so the two never disagree about which phase it is. The\n   shape then comes from that bucket's canonical phase rather than from a\n   continuous angle, for the same reason.\n\n   Geometry: k = cos(2*pi*p) is where the terminator crosses each row as a\n   fraction of that row's half-width. Waxing is lit from k*w to +w, waning from\n   -w to -k*w \\u2014 which gives an empty disc at new, a half at the quarters, and a\n   full one in between, with everything between those falling out for free. */\n/* SIXTEEN steps, not eight: new, then eighths of illumination up to full, then\n   the same eight mirrored back down. Nine distinct waxing shapes and seven\n   waning ones.\n\n   This still nests exactly inside the tablet's eight emoji buckets \\u2014\n   floor(idx16 / 2) === idx8 for every lunar day, because both are floor(d/29*N)\n   with N doubled \\u2014 so the two can never disagree about which named phase it\n   is. The watch simply resolves it more finely than an emoji can. */\nfunction moonPhase16() {\n  try {\n    var d = Math.floor(cycleDayNow());            // 0-based lunar day\n    if (!isFinite(d) || d < 0) d = 0;\n    return Math.floor((d / 29) * 16) % 16;\n  } catch (e) { return 0; }\n}\n/* The SHAPE changes eight times a lunar month; the DRAWING happens on every\n   clock repaint, because the background blit wipes the screen and everything on\n   it has to go back down. Those are different rates, so the geometry is worked\n   out once per phase and kept \\u2014 the trig runs about eight times a month\n   instead of once a minute. The fillRects still run every frame; there is no way\n   around that while the background is wiped wholesale. */\nvar _moonI = -1, _moonS = null;\nfunction moonSpans(idx, r) {\n  if (_moonI === idx && _moonS) return _moonS;\n  /* What the sky does. The steps are even in PHASE ANGLE, so the shape matches\n     the moon on the night it is drawn: k = cos(2*pi*p) is where the terminator\n     crosses each row, giving nothing lit at new, a half at the quarters, and all\n     of it at full, with the real bunching of change around the quarters left\n     intact rather than smoothed out. */\n  var k = Math.cos(2 * Math.PI * (idx / 16)), out = [], dy, w, x0, x1;\n  var minPx = 1;                     // a sliver is still a sliver at 15 pixels\n  for (dy = -r; dy <= r; dy++) {\n    w = Math.sqrt(r * r - dy * dy);\n    if (w < 0.5) continue;\n    /* The lit part always reaches the limb on one side \\u2014 the right when waxing,\n       the left when waning \\u2014 and the terminator is the other edge. Rounding it\n       outward keeps the thinnest crescent from vanishing into the new moon beside\n       it, but it is clamped to the disc so a gibbous can never spill past the\n       limb and end up drawing MORE pixels than a full moon. */\n    /* floor, not round: a filled circle includes x where x*x+y*y <= r*r, i.e.\n       |x| <= floor(w). Rounding up put pixels outside the disc, which is how a\n       gibbous ended up drawing MORE of them than a full moon. */\n    var rw = Math.floor(w + 1e-9);\n    /* Two floors, both about what a fifteen-pixel disc can show. A moon that is\n       not NEW must keep at least one lit pixel, or the thinnest crescent\n       disappears into the new moon beside it. A moon that is not FULL must keep\n       at least one DARK pixel, or a 96%-lit gibbous rounds up to a full moon and\n       three states in a row become the same picture. Neither is a fudge of the\n       astronomy \\u2014 the phase is exact; this is only refusing to round a shape\n       into its neighbour. */\n    if (idx <= 8) {\n      x1 = rw; x0 = Math.floor(k * w);\n      if (x0 < -rw) x0 = -rw;\n      if (x1 - x0 < minPx) x0 = x1 - minPx;         // keep a sliver of light\n      if (idx < 8 && x0 <= -rw && rw > 0) x0 = -rw + 1;   // keep a sliver of dark\n      if (x0 < -rw) x0 = -rw;\n    } else {\n      x0 = -rw; x1 = Math.ceil(-k * w);\n      if (x1 > rw) x1 = rw;\n      if (x1 - x0 < minPx) x1 = x0 + minPx;\n      if (x1 >= rw && rw > 0) x1 = rw - 1;\n      if (x1 > rw) x1 = rw;\n    }\n    if (x1 < x0) continue;\n    out.push(dy, x0, x1);\n  }\n  _moonI = idx; _moonS = out;\n  return out;\n}\nfunction drawMoon(cx, cy, r) {\n  var idx = moonPhase16(), i;\n  /* The unlit disc, so a new moon is still a moon and not a blank space. */\n  g.setColor(TH.p4);\n  g.drawCircle(cx, cy, r);\n  if (idx === 0) return;                                 // new: outline only\n  g.setColor(TH.fg);\n  if (idx === 8) { g.fillCircle(cx, cy, r); return; }    // full\n  var s = moonSpans(idx, r);\n  for (i = 0; i < s.length; i += 3)\n    g.fillRect(cx + s[i + 1], cy + s[i], cx + s[i + 2], cy + s[i]);\n}\nfunction drawPhaseRow() {\nvar ph = phaseNow(), ld = \"\" + lunarDay(), MOON = 15, GAP = 7;\nfunction phFont() { if (!vFont(14)) g.setFont(\"6x8\", 2); }\nphFont();\nvar nw = g.stringWidth(ld), pw = ph ? g.stringWidth(ph) : 0;\nvar total = MOON + 3 + nw + (ph ? GAP + pw : 0);\nif (total > 172) { subFont(); nw = g.stringWidth(ld); pw = ph ? g.stringWidth(ph) : 0;\ntotal = MOON + 3 + nw + (ph ? GAP + pw : 0); }\nwhile (ph && ph.length > 1 && total > 172) {\nph = ph.substr(0, ph.length - 1);\npw = g.stringWidth(ph);\ntotal = MOON + 3 + nw + GAP + pw;\n}\nvar lx = 88 - total / 2; if (lx < 2) lx = 2;\nvar LY = 115;\ndrawMoon(lx + 7, LY, 7);\ng.setColor(TH.fg).setFontAlign(-1, 0).drawString(ld, lx + MOON + 3, LY);\nif (ph) g.setColor(TH.e2).setFontAlign(-1, 0).drawString(ph, lx + MOON + 3 + nw + GAP, LY);\n}\nfunction shiftY(a){ for (var i=1;i<a.length;i+=2) a[i]+=1; }\nfunction drawGraph() {\nslimHeader();\nvar c = D.curve || {}, S = c.series || [];\nif (!S.length) {\nif (c.e2 && c.e2.length) {\nvar mk = function (n, arr, mx, col, fill) {\nvar q = [], i2; for (i2 = 0; i2 < arr.length; i2++) q.push(Math.round(Math.max(0, Math.min(1, arr[i2] / (mx || 1))) * 1000));\nreturn { n:n, u:\"\", c:col, fill:fill, max:mx || 1, q:q };\n};\nS = [mk(\"E2\", c.e2, c.e2max, TH.e2, 1), mk(\"P4\", c.p4, c.p4max, TH.p4, 0)];\n} else {\ng.setColor(TH.fg).setFont(\"6x8\",1).setFontAlign(0,0).drawString(\"no curve data\", 88, 90); return;\n}\n}\nvar n = S[0].q.length, i, s;\nvar pL = 8, pR = 168, pT = 44, pB = 138;\nfunction xOf(k) { return pL + (k / (n - 1)) * (pR - pL); }\nfunction yOf(v) { return pB - (v / 1000) * (pB - pT); }\nvar cd = cycleDayNow(), mi = Math.round((cd / D.cycleLen) * (n - 1));\nif (mi < 0) mi = 0; if (mi > n - 1) mi = n - 1;\nvar tx = xOf(mi);\nfor (i = 0; i < S.length; i++) {\ns = S[i]; if (!s.fill) continue;\ng.setColor(s.c);\nfor (var k2 = 0; k2 < n; k2 += 2) {\nvar xx = Math.round(xOf(k2)), v = s.q[k2];\nif (k2 + 1 < n && s.q[k2 + 1] > v) v = s.q[k2 + 1];\ng.fillRect(xx, Math.round(yOf(v)), Math.round(xOf(Math.min(k2 + 2, n - 1))), pB);\n}\n}\ng.setColor(TH.accent); for (var yy = pT; yy < pB; yy += 4) g.fillRect(tx, yy, tx, yy + 1);\nfor (i = 0; i < S.length; i++) {\ns = S[i]; if (s.fill) continue;\nvar pp = [], k3;\nfor (k3 = 0; k3 < n; k3++) { pp.push(xOf(k3)); pp.push(yOf(s.q[k3])); }\ng.setColor(s.c).drawPoly(pp);\nshiftY(pp); g.drawPoly(pp);\n}\ng.setColor(TH.fg).drawLine(pL, pB, pR, pB);\nfor (i = 0; i < S.length; i++) {\ns = S[i];\ng.setColor(s.fill ? TH.fg : s.c);\ng.fillRect(tx - 2, yOf(s.q[mi]) - 2, tx + 2, yOf(s.q[mi]) + 2);\n}\ng.setFont(\"6x8\", 1);\nfor (i = 0; i < S.length; i++) {\ns = S[i];\nvar col = i % 2, row = (i - col) / 2;\nvar lx = col ? 172 : 4, ly = 142 + row * 9;\nvar val = \" \" + Math.round(s.q[mi] / 1000 * s.max) + (s.u ? \" \" + s.u : \"\");\nvar nm2 = \"\" + s.n;\nwhile (nm2.length > 1 && g.stringWidth(nm2 + val) > 82) nm2 = nm2.substr(0, nm2.length - 1);\ng.setColor(s.c).setFontAlign(col ? 1 : -1, -1);\ng.drawString(nm2 + val, lx, ly);\n}\ng.setColor(TH.fg).setFont(\"6x8\", 1).setFontAlign(1, -1)\n.drawString(\"day \" + (Math.round(cd * 10) / 10) + \"/\" + Math.round(D.cycleLen), 172, 14);\nif (c.dropped) {\ng.setColor(TH.accent).setFontAlign(-1, -1).drawString(\"+\" + c.dropped + \" not shown\", 4, 14);\n}\n}\nfunction _norm(v, CL) { v = v % CL; return v < 0 ? v + CL : v; }\n/* The cycle's REAL length in whole days. Cycle boundaries sit at midnight, so a\n   29.5-day cycle actually runs 30, 29, 30, 29 days, and that is what makes the\n   fractional part of a cycle-day mean a time of day. Wrapping an event by 29.5\n   subtracts half a day and rotates the clock twelve hours \\u2014 which only ever\n   showed on a patch worn across the seam, and only on its removal. Wrap by whole\n   days and the clock time survives. Falls back for payloads from older builds. */\n/* Lunar months are 29 days or 30, alternating, so the single cycDays the tablet\n   bakes is only right for the month it synced in \\u2014 it goes stale within weeks,\n   and this watch is meant to stand on its own between syncs. lunarMid is already\n   here and is the same function the tablet's cycle day comes from, so work it out\n   locally instead. Cached per calendar day; it can only change monthly. */\nvar _cdV = 0, _cdK = -1;\nfunction cycD() {\nif ((D && D.mode) === \"lunar\") {\ntry {\n/* Numeric key. cycD is reached hundreds of times in a single pass over the\n   schedule, and building a date string each time to decide \"still the same day\"\n   cost more than the answer. */\nvar n = new Date(), k = Math.floor(n.getTime() / 3600000);\nif (_cdK === k && _cdV > 0) return _cdV;\nvar y = n.getFullYear(), mo = n.getMonth(), dd = n.getDate(), i;\n/* Day arithmetic through the Date constructor, never by adding 86400000ms \\u2014\n   that lands on 23:00 of the previous day across a daylight-saving fall-back. */\nvar first = dd - (lunarMid(new Date(y, mo, dd)) - 1);\nfor (i = 28; i <= 31; i++)\nif (lunarMid(new Date(y, mo, first + i)) === 1) { _cdV = i; _cdK = k; return i; }\n} catch (e) {}\n}\nvar v = D && D.cycDays;\nif (v > 0) return v;\nreturn Math.max(1, Math.round((D && D.cycleLen) || 29.5));\n}\nfunction _wrap(v) { var L = cycD(); v = v % L; return v < 0 ? v + L : v; }\n/* The month BEFORE this one. A patch worn across the seam was applied then, so\n   finding it means stepping back by that month's length \\u2014 29 days or 30,\n   whichever it actually was. Stepping back by THIS month's length instead is\n   what put a removal a whole day early: the tablet said tomorrow 9:43am and the\n   watch said today 9:43am, which is exactly the difference between a 30-day\n   month and a 29-day one. */\nvar _cpV = 0, _cpK = -1;\nfunction cycDP() {\nif ((D && D.mode) === \"lunar\") {\ntry {\nvar n = new Date(), k = Math.floor(n.getTime() / 3600000);\nif (_cpK === k && _cpV > 0) return _cpV;\nvar y = n.getFullYear(), mo = n.getMonth(), dd = n.getDate(), i;\nvar last = dd - lunarMid(new Date(y, mo, dd));      // last day of the previous month\nvar first = last - (lunarMid(new Date(y, mo, last)) - 1);\nfor (i = 28; i <= 31; i++)\nif (lunarMid(new Date(y, mo, first + i)) === 1) { _cpV = i; _cpK = k; return i; }\n} catch (e) {}\n}\nvar v = D && D.cycDaysPrev;\nif (v > 0) return v;\nreturn cycD();\n}\nfunction _frac(v) { v = v % 1; return v < 0 ? v + 1 : v; }\nfunction daysInCycle() { return cycD(); }\nfunction dayAt(off) {\nvar N = daysInCycle(), cd = Math.floor(cycleDayNow()) + (off | 0), cyc = cycleIdxNow();\nwhile (cd >= N) { cd -= N; cyc++; }\nwhile (cd < 0)  { cd += N; cyc--; }\nreturn { cyc: cyc, cd: cd };\n}\nfunction dayEvents(cyc, cd) {\nvar CL = (D && D.cycleLen) || 29.5, out = [], i, p, s, d0, w, off, pos;\nvar pcs = (D && D.pieces) || [], sgl = (D && D.singles) || [];\nfor (i = 0; i < pcs.length; i++) {\np = pcs[i]; d0 = +p.day; w = +p.wear;\nif (!(w > 0) || !((+p.size) > 0)) continue;\nif (Math.floor(d0) === cd)\nout.push({ at:_frac(d0), kind:\"on\", rank:2, seq:out.length, key:p.key,\nonCyc:cyc, seatAt:d0, med:p.med, size:p.sizeStr, teg:!!p.teg, vague:false });\noff = _wrap(d0 + w);\nif (Math.floor(off) === cd)\nout.push({ at:_frac(off), kind:\"off\", rank:0, seq:out.length, key:p.key,\nonCyc:cyc, seatAt:d0, med:p.med, size:p.sizeStr, vague:false });\n}\nfor (i = 0; i < sgl.length; i++) {\ns = sgl[i];\nif (!((+s.dose) > 0)) continue;\npos = _wrap((s.pos === undefined || s.pos === null) ? ((+s.day) - 1 + timeOffset(s.time)) : (+s.pos));\nif (Math.floor(pos) !== cd) continue;\nout.push({ at:_frac(pos), kind:\"take\", rank:1, seq:out.length, key:null, onCyc:cyc,\nmed:s.med, dose:s.dose, route:s.route, vague:!!s.vague });\n}\nout.sort(function (a2, b2) { return (a2.at - b2.at) || (a2.rank - b2.rank) || (a2.seq - b2.seq); });\nfor (i = 0; i < out.length; i++) { out[i].cyc = cyc; out[i].cd = cd; out[i].tod = out[i].at; }\nreturn out;\n}\nfunction scheduleRows() {\nvar CL = (D && D.cycleLen) || 29.5, now = cycleIdxNow() * CL + cycleDayNow();\nvar list = [], k, i, dd, evs, e;\nfor (k = -2; k <= 5; k++) {\ndd = dayAt(k); evs = dayEvents(dd.cyc, dd.cd);\nfor (i = 0; i < evs.length; i++) {\ne = evs[i];\ne.abs = dd.cyc * CL + dd.cd + e.at;\ne.delta = e.abs - now;\ne.base = dd.cd + e.at;\nlist.push(e);\n}\n}\nlist.sort(function (x, y) { return (x.delta - y.delta) || (x.rank - y.rank) || (x.seq - y.seq); });\nreturn list;\n}\nfunction upcomingEvents(limit) {\nvar r = scheduleRows(), out = [], i;\nfor (i = 0; i < r.length && out.length < limit; i++) if (r[i].delta >= 0) out.push(r[i]);\nreturn out;\n}\nfunction wornAt(t) {\nvar wk = Math.round(t * 1440);\nif (_wornMemo[wk]) return _wornMemo[wk];\nvar CL = (D && D.cycleLen) || 29.5, pcs = (D && D.pieces) || [], out = [], i, k, p, d0, w, dt;\nfor (i = 0; i < pcs.length; i++) {\np = pcs[i]; d0 = +p.day; w = +p.wear;\nif (!(w > 0) || !((+p.size) > 0)) continue;\n/* Whole days, and the RIGHT whole days: the occurrence before this one began a\n   previous-month-length ago. Only k = 0 and k = -1 can match at a wear of at\n   most fourteen days, so that one length is the one that has to be right. */\nvar _L = cycD(), _PL = cycDP(), _bk;\nfor (k = -4; k <= 1; k++) {\n_bk = k === 0 ? 0 : (k > 0 ? k * _L : -(_PL + (-k - 1) * _L));\ndt = t - (d0 + _bk);\nif (dt >= 0 && dt < w) { out.push({ key:p.key, day:d0, size:+p.size, age:dt, cyc:k, ix:i }); break; }\n}\n}\nout.sort(function (a, b) { return (a.day - b.day) || (b.size - a.size) || (a.ix - b.ix); });\n_wornMemo[wk] = out;\nreturn out;\n}\nvar _seatMemo = {}, _wornMemo = {};\nfunction frameReset() { _seatMemo = {}; _wornMemo = {}; }\nfunction seatAt(cyc, t) {\nvar mk = cyc + \"@\" + Math.round(t * 1440);\nif (_seatMemo[mk]) return _seatMemo[mk];\nvar cap = (D && D.cap) || 8, slots = [], i, j, w, idx, spill = [], free, best;\nfor (i = 0; i < cap; i++) slots.push(null);\nvar worn = wornAt(t), as = rotAssign(cyc), lu = _lucache[cyc] || [];\nvar ov = (D && D.ov) || {}, rest = [], o, pinSlot;\n// Where the snapshot RECORDED each worn piece. Same rule as the tablet's\n// bodySlots: a spot already decided is read, never worked out again.\nvar seatRec = {}, _sd = D && D.rot, _sk, _so;\nif (_sd && _sd.occ) for (_sk in _sd.occ) { _so = _sd.occ[_sk]; if (_so && _so.k != null) seatRec[_so.k] = +_sk; }\nfor (i = 0; i < worn.length; i++) {\nw = worn[i]; o = ov[w.key];\npinSlot = (o != null && o >= 0 && o < cap) ? o : null;\nif (pinSlot != null && !slots[pinSlot]) slots[pinSlot] = w; else rest.push(w);\n}\nfor (i = 0; i < rest.length; i++) {\nw = rest[i];\nvar bk = w.cyc | 0, rc = seatRec[w.key];\nidx = (rc != null && rc >= 0 && rc < cap) ? rc : (bk ? rotAssign(cyc + bk) : as)[w.key];\nif (idx != null && !slots[idx]) slots[idx] = w; else spill.push(w);\n}\nfor (i = 0; i < spill.length; i++) {\nfree = []; for (j = 0; j < cap; j++) if (!slots[j]) free.push(j);\nif (!free.length) break;\nbest = free[0];\nfor (j = 1; j < free.length; j++) {\nvar a = (lu[free[j]] === undefined ? -1e9 : lu[free[j]]);\nvar b = (lu[best]     === undefined ? -1e9 : lu[best]);\nif (a < b) best = free[j];\n}\nslots[best] = spill[i];\n}\n_seatMemo[mk] = slots;\nreturn slots;\n}\nfunction siteFor(e) {\nif (!e || e.kind === \"take\" || !e.key) return \"\";\ntry {\nvar sites = (D && D.sites) || [], slots = seatAt(e.onCyc, e.seatAt), i;\nfor (i = 0; i < slots.length; i++)\nif (slots[i] && slots[i].key === e.key) return sites[i] || \"\";\nreturn \"\";\n} catch (e2) { return \"\"; }\n}\nfunction _until(p, now, CL) { var L = cycD(); var v = (p - now) % L; return v < 0 ? v + L : v; }\n/* The soonest moment the CONTENTS of the window change, as an absolute\n   timestamp. Three things can change them, and every one is known here where the\n   window is built:\n     - a row still ahead crosses into the past, and the list re-sorts\n     - a row in the past ages out of the trailing window\n     - an event still beyond the horizon reaches it and APPEARS \\u2014 which is the\n       future projection arriving, both as a schedule row and as the dashed\n       reservation in the inventory\n   Recording it costs one comparison per event inside a loop that already runs. */\nvar _winAt = 0;\nfunction windowRows() {\nvar CL = (D && D.cycleLen) || 29.5, now = cycleDayNow(), ci = cycleIdxNow();\nvar _winNext = 1e9;\nvar ahead = ((D && D.aheadH) || 36) / 24, back = ((D && D.pastH) || 12) / 24;\nvar pcs = (D && D.pieces) || [], sgl = (D && D.singles) || [], out = [], i, p, s, t, d;\nfunction push(off, kind, o) {\no.off = off; o.kind = kind; o.seq = out.length;\no.rank = kind === \"on\" ? 0 : kind === \"take\" ? 1 : 2;\nout.push(o);\n}\n/* A removal is not a position of its own. Two applications can put one inside\n   this cycle: the one at `day` in this cycle, and the one at `day` in the cycle\n   before, which started a previous-month-length ago. Wrapping the removal on its\n   own by this month's length attributed it to the wrong application whenever the\n   two months differ \\u2014 every other month, for the moon. */\nfunction bothOff(day, wear, mk) {\nvar L = cycD(), PL = cycDP();\nvar a = day + wear, b = day - PL + wear;\nif (a < L - 1e-9) both(a, \"off\", mk);\nif (b >= -1e-9 && b < L - 1e-9 && Math.abs(b - a) > 1e-9) both(b, \"off\", mk);\n}\nfunction both(pos, kind, mk) {\nvar f = _until(pos, now, CL), bk = _until(now, pos, CL), w;\nif (f <= ahead) {\nvar o = mk(); push(f, kind, o);\nif (f < _winNext) _winNext = f;                 // becomes past then\n} else {\nw = f - ahead;                                   // enters the window then\nif (w < _winNext) _winNext = w;\n}\nif (bk > 0 && bk <= back) {\nvar o2 = mk(); push(-bk, kind, o2);\nw = back - bk;                                   // ages out then\nif (w < _winNext) _winNext = w;\n}\n}\nfor (i = 0; i < pcs.length; i++) {\np = pcs[i];\nif (!((+p.wear) > 0) || !((+p.size) > 0)) continue;\n(function (pp) {\nboth(_wrap(+pp.day), \"on\", function () {\nreturn { key:pp.key, med:pp.med, size:pp.sizeStr, wear:+pp.wear, day:+pp.day, teg:!!pp.teg,\ncol:pp.col || null, tag:pp.tag || null,\nmin:(pp.onMin === undefined ? null : +pp.onMin) };\n});\nbothOff((+pp.day), (+pp.wear), function () {\nreturn { key:pp.key, med:pp.med, size:pp.sizeStr, wear:+pp.wear, day:+pp.day, teg:!!pp.teg,\ncol:pp.col || null, tag:pp.tag || null,\nmin:(pp.offMin === undefined ? null : +pp.offMin) };\n});\n})(p);\n}\nfor (i = 0; i < sgl.length; i++) {\ns = sgl[i];\nif (!((+s.dose) > 0)) continue;\n(function (ss) {\nvar pos = _wrap((ss.pos === undefined || ss.pos === null)\n? ((+ss.day) - 1 + timeOffset(ss.time)) : (+ss.pos));\nboth(pos, \"take\", function () {\nreturn { key:null, med:ss.med, dose:ss.dose, route:ss.route, vague:!!ss.vague,\nmin:Math.round(_frac(pos) * 1440) % 1440 };\n});\n})(s);\n}\n_winAt = (_winNext < 1e8) ? (Date.now() + _winNext * 86400000) : 0;\nout.sort(function (x, y) { return (x.off - y.off) || (x.rank - y.rank) || (x.seq - y.seq); });\nfor (i = 0; i < out.length; i++) {\nd = out[i];\nd.site = \"\";\nif (d.key && d.off >= 0) {\n/* On the body now? Then the inventory's answer IS the answer. */\nvar sn = siteNow(d.key);\nif (sn !== null && sn !== \"\") d.site = sn;\nelse {\n/* Which cycle the application happened in, worked out in WHOLE days rather than\n   by dividing an absolute position by the fractional cycle length. That division\n   mixed a fractional CL with an integer-anchored cycle day and could land a\n   cycle out, which put a not-yet-worn piece in the wrong spot. Step the position\n   into range by the real length of the cycle it crosses, exactly as everything\n   else now does. */\nvar ap = now + d.off - (d.kind === \"off\" ? d.wear : 0), oc = ci;\nvar _L = cycD(), _PL = cycDP();\nif (ap < -1e-9) { oc = ci - 1; ap += _PL; }\nelse if (ap >= _L - 1e-9) { oc = ci + 1; ap -= _L; }\nd.site = siteFor({ kind:d.kind, key:d.key, onCyc:oc, seatAt:ap });\n}\n}\n}\nreturn out;\n}\nfunction dayWord(offDays) {\nvar now = new Date(), when = new Date(now.getTime() + offDays * 86400000);\nvar a0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());\nvar a1 = new Date(when.getFullYear(), when.getMonth(), when.getDate());\nvar dd = Math.round((a1 - a0) / 86400000);\nreturn dd === 0 ? \"today\" : dd === 1 ? \"tmrw\" : dd === -1 ? \"yest\" : DOW3[when.getDay()];\n}\nfunction clockAt(offDays) {\nvar when = new Date(Date.now() + offDays * 86400000);\nreturn fmtClock((when.getHours() * 3600 + when.getMinutes() * 60 + when.getSeconds()) / 86400);\n}\n// The tablet works out the minute each event lands on and ships it as an\n// integer. Deriving it here from a cycle fraction is what made the watch say\n// 12:43 where the app said 12:44 \\u2014 two roundings of the same number. Falls\n// back to the old derivation for a payload from an older build.\nfunction evClock(e) {\nif (e && e.min !== undefined && e.min !== null && isFinite(e.min)) return fmtClock(e.min / 1440);\nreturn clockAt(e ? e.off : 0);\n}\n// Scrolling is in PIXELS, not rows. The old version waited for the drag to\n// finish and then jumped exactly one row, which is why it never felt like\n// scrolling: nothing moved under your finger. Now the buffer itself is shifted\n// with g.scroll while you drag and only the newly uncovered strip is drawn,\n// which is how the firmware's own settings scroller stays smooth on hardware\n// this slow. g.scroll works in USER coordinates, so it follows the 180 flip\n// without any correction here.\nvar EV_H = 34, INV_H = 16, EV_TOP = 28, INV_TOP = 35, LIST_BOT = 176;\n/* \"Close enough \\u2014 do it now if you like.\" An OUTLINE, not a fill: the row\n   already carries the medication's colour and several shades of text, and a\n   filled highlight behind all that either drowns them or forces every one of\n   them to change. A green edge adds a signal without taking anything away. */\nvar EARLY_H = 3, EARLY_COL = \"#4ade80\";\n// INV_TOP is 35, not 34: the column header is drawn at y=27 in an 8px font,\n// so its last scanline IS y=34. One pixel of it inside the scrolling region\n// meant the header lost its bottom edge the moment the list moved, and the\n// chrome repaint (which stops above the list) could not put it back.\nvar LIST_R = 171, BAR_L = 172;      // list ends here; the scrollbar lives to the right of it\nvar evOff = 0, invOff = 0, _dragSuppressed = null;\n/* windowRowsCached did no caching whatsoever \\u2014 it was windowRows() in a\n   try/catch, rebuilt on EVERY frame, and windowRows walks every piece and every\n   single, sorts them, and resolves a body site for each one (which reaches all\n   the way down into the rotation). The inventory page called it a second time\n   per frame for its reservations. Nothing it produces can change faster than\n   once a minute, so it is now cached on the minute and thrown away whenever the\n   schedule itself changes. During a scroll the data is frozen entirely: only\n   pixels move. */\nvar _rcRows = null, _rcKey = \"\", _dataEpoch = 0;\nfunction rowsNow() {\n  var k = _dataEpoch + \":\" + Math.floor(Date.now() / 60000);\n  /* Never rebuild mid-gesture. Scrolling moves pixels; it must never be the\n     thing that decides to walk the whole schedule again. */\n  if (_rcRows && (_scrolling || _rcKey === k)) return _rcRows;\n  var rows;\n  try { rows = windowRows(); } catch (e) { rows = []; }\n  try { prepRows(rows); } catch (e2) {}\n  _rcRows = rows; _rcKey = k;\n  return rows;\n}\nfunction windowRowsCached() { return rowsNow(); }\n/* Every string a row draws, measured and truncated ONCE. The truncation loops\n   called g.stringWidth over and over per row per frame \\u2014 a long medication\n   name cost twenty measurements a frame, and measuring walks the string. The\n   clock time is now a baked integer from the tablet, so none of this changes\n   between minutes. */\nfunction prepRows(rows) {\n  var i, e, amt, act, when, l1, dw, tail, med, avail, ws, firstFut = -1;\n  for (i = 0; i < rows.length; i++) {\n    e = rows[i];\n    if (firstFut < 0 && e.off >= 0) firstFut = i;\n    e._past = e.off < 0;\n    amt = e.kind === \"take\" ? ((e.dose || 0) + \"mg\") : (e.size || \"\");\n    act = e.kind === \"take\" ? amt : (e.kind === \"on\" ? (\"ON \" + amt) : (\"OFF \" + amt));\n    when = (e.kind === \"take\" && e.vague) ? (e.off >= 0 ? (e.off % 1 < 0.5 ? \"AM\" : \"PM\") : \"AM\") : evClock(e);\n    dw = dayWord(e.off);\n    /* Time and day on the first line, the action on the second, both at full\n       size. The old layout crammed the time AND the action onto one line and\n       shrank the font whenever they would not fit \\u2014 which was most rows, since\n       \"10:45pm\" plus \"OFF 1/2\" is wider than the screen at this size. Shrinking\n       was a way to fit more into a fixed window; the window scrolls now, so a row\n       can take the space it needs and stay legible. */\n    g.setFont(\"6x8\", 2);\n    e._l1 = when + \" \" + dw;              // 7 + 1 + 5 chars worst case = 156px\n    e._act = act;\n    e._actW = g.stringWidth(act);\n    e._col = e.col || null;\n    tail = \"\";\n    if (e.kind === \"take\" && e.route) tail += \"  \" + e.route;\n    if (e.site) tail += \"  \" + e.site;\n    if (e.teg) tail += \" +TGDRM\";\n    med = \"\" + (e.med || \"\");\n    /* Sits to the right of the action on the second line, in the small font. */\n    avail = LIST_R - (12 + e._actW) - 4;\n    g.setFont(\"6x8\", 1);\n    while (med.length > 1 && g.stringWidth(med + tail) > avail) med = med.substr(0, med.length - 1);\n    e._l2 = med + tail;\n  }\n  for (i = 0; i < rows.length; i++) rows[i]._next = (i === firstFut);\n}\n/* The inventory's expensive half: the seating, and the reservation map built\n   out of the event window. Same minute cache, same reason. */\nvar _invS = null, _invK = \"\";\n/* \u2550\u2550\u2550 WHERE A PATCH IS, ON THE WATCH \u2550\u2550\u2550\n   The inventory page is the authority here, the same way the body diagram is on\n   the tablet. The events page had been asking a different question \\u2014 siteFor\n   seats at the piece's APPLICATION instant, in the cycle it was applied \\u2014 while\n   the inventory seats at NOW. For a patch worn across the cycle seam those are\n   two different sets of worn pieces and therefore two different answers, which\n   is exactly the B-versus-D disagreement that showed up on the tablet.\n\n   Deliberately kept free of windowRows: invState builds its reservation map FROM\n   the event window, so anything the window calls must not call invState back or\n   the two recurse. This asks seatAt directly. */\nvar _bnV = null, _bnK = \"\";\nfunction bodyNow() {\n  var k = _dataEpoch + \":\" + Math.floor(Date.now() / 60000);\n  if (_bnV && (_scrolling || _bnK === k)) return _bnV;\n  var slots = [];\n  try { slots = seatAt(cycleIdxNow(), cycleDayNow()); } catch (e) { slots = []; }\n  _bnV = { slots: slots, sites: (D && D.sites) || [] };\n  _bnK = k;\n  return _bnV;\n}\n/* The site the INVENTORY is showing for this piece, or null if it is not on the\n   body right now (in which case the caller falls back to working it out). */\nfunction siteNow(key) {\n  if (!key) return null;\n  try {\n    var b = bodyNow(), i;\n    for (i = 0; i < b.slots.length; i++)\n      if (b.slots[i] && b.slots[i].key === key) return b.sites[i] || \"\";\n  } catch (e) {}\n  return null;\n}\nfunction invState() {\n  var k = _dataEpoch + \":\" + Math.floor(Date.now() / 60000);\n  if (_invS && (_scrolling || _invK === k)) return _invS;\n  var t = cycleDayNow(), ci = cycleIdxNow();\n  var sites = (D && D.sites) || [], cap = (D && D.cap) || 8;\n  var slots = bodyNow().slots, on = 0, i, q;\n  for (i = 0; i < slots.length; i++) if (slots[i]) on++;\n  var pcs = (D && D.pieces) || [], byKey = {};\n  for (i = 0; i < pcs.length; i++) byKey[pcs[i].key] = pcs[i];\n  var resv = {}, rws, r;\n  try {\n    rws = rowsNow();\n    for (i = 0; i < rws.length; i++) {\n      r = rws[i];\n      if (r.kind !== \"on\" || r.off < 0 || !r.site) continue;\n      for (q = 0; q < sites.length; q++) if (sites[q] === r.site && resv[q] === undefined) resv[q] = r;\n    }\n  } catch (e3) {}\n  _invS = { slots:slots, sites:sites, byKey:byKey, resv:resv, on:on, cap:cap };\n  _invK = k;\n  return _invS;\n}\nfunction dataChanged() { rotInit(); _rcRows = null; _invS = null; _dueEv = null; _dataEpoch++; }\n/* ---- list geometry ------------------------------------------------------ */\nfunction listGeom() {\n  if (pgIs(\"events\")) return { top:EV_TOP, bot:LIST_BOT, h:EV_H, n:rowsNow().length, off:evOff, ev:1 };\n  if (pgIs(\"inv\"))    return { top:INV_TOP, bot:LIST_BOT, h:INV_H, n:((D && D.cap) || 8), off:invOff, ev:0 };\n  return null;\n}\nfunction listMax(gm) { var m = gm.n * gm.h - (gm.bot - gm.top); return m > 0 ? m : 0; }\nfunction listClamp() {\n  var gm = listGeom(); if (!gm) return;\n  var mx = listMax(gm), v = gm.off;\n  if (v > mx) v = mx; if (v < 0) v = 0;\n  if (gm.ev) evOff = v; else invOff = v;\n}\n/* Draw only the rows crossing a horizontal strip. The clip does the trimming,\n   so a row half in the strip draws correctly without any part-row arithmetic. */\nfunction drawBand(y0, y1, bg) {\n  var gm = listGeom(); if (!gm) return;\n  if (y0 < gm.top) y0 = gm.top;\n  if (y1 > gm.bot - 1) y1 = gm.bot - 1;\n  if (y1 < y0) return;\n  g.setClipRect(0, y0, LIST_R, y1);\n  if (bg) fillBgBand(y0, y1);\n  var first = Math.floor((y0 - gm.top + gm.off) / gm.h);\n  var last  = Math.floor((y1 - gm.top + gm.off) / gm.h);\n  if (first < 0) first = 0;\n  if (last > gm.n - 1) last = gm.n - 1;\n  var i, ry;\n  try {\n    if (gm.ev) {\n      var rows = rowsNow();\n      for (i = first; i <= last; i++) drawEventRow(rows[i], gm.top + 2 + i * gm.h - gm.off);\n    } else {\n      var st = invState();\n      for (i = first; i <= last; i++) drawInvRow(i, gm.top + i * gm.h - gm.off, st);\n    }\n  } catch (e) {}\n  g.setClipRect(0, 0, 175, 175);\n}\n/* A bar rather than a \"3-6/14\" counter: it says how far down you are without\n   anything to read, and it sits outside the scrolled strip so the shift never\n   smears it. */\n/* Two rectangles. The track covers the full width of the column, so drawing the\n   thumb on top of it erases wherever the thumb used to be \\u2014 no background pass\n   and nothing to clean up. */\nfunction drawScrollBar() {\n  var gm = listGeom(); if (!gm) return;\n  var mx = listMax(gm), h = gm.bot - gm.top;\n  if (mx <= 0) return;\n  var th = Math.round(h * h / (gm.n * gm.h));\n  if (th < 12) th = 12;\n  var ty = gm.top + Math.round((h - th) * (gm.off / mx));\n  g.setClipRect(BAR_L, gm.top, 175, gm.bot - 1);\n  g.setColor(TH.p4);     g.fillRect(BAR_L, gm.top, 175, gm.bot - 1);\n  g.setColor(TH.accent); g.fillRect(BAR_L, ty, 175, ty + th);\n  g.setClipRect(0, 0, 175, 175);\n}\n/* Repaint the strip above the list. Belt and braces: g.scroll is bounded by the\n   clip rect, so this should never be disturbed \\u2014 but a header full of\n   smeared list rows would be a miserable way to find out otherwise, and this\n   costs one blit and four strings. */\nfunction drawChromeStrip() {\n  var gm = listGeom(); if (!gm) return;\n  g.setClipRect(0, 0, 175, gm.top - 1);\n  fillBgBand(0, gm.top - 1);\n  try {\n    slimHeader();\n    if (gm.ev) evChrome(rowsNow()); else invChrome(invState());\n  } catch (e) {}\n  g.setClipRect(0, 0, 175, 175);\n}\n/* Move the list by d pixels. Shift what is already drawn, draw the sliver that\n   just came into view, and touch nothing else. */\nvar _scrolling = 0;\n/* The \"<\" and \">\" hints and the version stamp are drawn ON TOP of the list, so\n   g.scroll drags them along and every step leaves another ghost behind. Rather\n   than repaint them on each of the dozens of frames a drag produces, wipe them\n   once when the gesture starts and let the tidy-up render on release put them\n   back. */\nfunction scrollBegin() {\n  if (_scrolling) return;\n  _scrolling = 1;\n  try { drawBand(82, 94, 1); drawBand(158, 175, 1); } catch (e) {}\n}\n/* Move the offset only. Separated from the drawing so the end of a gesture can\n   settle the final position and let one ordinary render put it on screen,\n   instead of a shift followed immediately by a full repaint of the same thing. */\nfunction offsetBy(d) {\n  var gm = listGeom(); if (!gm) return 0;\n  var mx = listMax(gm); if (mx <= 0) return 0;\n  var was = gm.off, now = was + d;\n  if (now < 0) now = 0;\n  if (now > mx) now = mx;\n  d = now - was;\n  if (!d) return 0;\n  if (gm.ev) evOff = now; else invOff = now;\n  return d;\n}\nfunction scrollBy(d) {\n  var gm = listGeom(); if (!gm) return;\n  d = offsetBy(d);\n  if (!d) return;\n  try {\n    g.setRotation(flipped ? 2 : 0);\n    g.setClipRect(0, gm.top, LIST_R, gm.bot - 1);\n    g.scroll(0, -d);\n    g.setClipRect(0, 0, 175, 175);\n    if (d > 0) drawBand(gm.bot - d - 1, gm.bot - 1, 1);\n    else drawBand(gm.top, gm.top - d, 1);\n    drawScrollBar();\n    /* The header is NOT repainted here. g.scroll is bounded by the clip rect,\n       so it never reaches above the list; repainting it anyway cost a blit and\n       five strings on every single frame of every drag. */\n  } catch (e) {\n    g.setClipRect(0, 0, 175, 175);\n    render();\n  }\n}\n/* Drag events arrive far faster than this screen can be redrawn, and Espruino\n   queues every one of them. Drawing per event meant that when the finger stopped\n   there were still seconds of queued frames to work through \\u2014 and every touch\n   behind them waited its turn. That was the pause.\n   Now an event does arithmetic and nothing else: it adds to a pending distance\n   and makes sure a flush is booked. However many events pile up, they collapse\n   into one draw, and no more than one draw happens per SCROLL_MS. */\nvar _pendDy = 0, _scrollT = null, _lastDraw = 0, SCROLL_MS = 40, _drawMs = 40;\nfunction scrollFlush() {\n  _scrollT = null;\n  if (!_pendDy) return;\n  var t = Date.now(), wait = _drawMs - (t - _lastDraw);\n  if (wait > 0) { _scrollT = setTimeout(scrollFlush, wait); return; }\n  _lastDraw = t;\n  var d = _pendDy; _pendDy = 0;\n  try { scrollBy(d); } catch (e) {}\n  /* Self-tuning. A fixed 40ms was a guess about how long this screen takes to\n     put a frame up; if the truth is 70ms, asking every 40 queues work that\n     arrives late and shoves every waiting touch further back \\u2014 which is what\n     unresponsive scrolling actually IS. Measure the frame we just drew and never\n     ask for the next one sooner than that. Fewer, larger jumps beat a saturated\n     queue every time. */\n  var took = Date.now() - t;\n  _drawMs = took < SCROLL_MS ? SCROLL_MS : (took > 250 ? 250 : took);\n}\nfunction scrollQueue(d) {\n  _pendDy += d;\n  if (!_scrollT) _scrollT = setTimeout(scrollFlush, 0);\n}\n/* End of gesture: cancel anything booked, apply whatever distance is still\n   owed, and let one render put the list, the hints and the version back\n   together. Nothing is left running, so the very next tap is heard. */\nfunction scrollEnd() {\n  if (_scrollT) { clearTimeout(_scrollT); _scrollT = null; }\n  if (_pendDy) { try { offsetBy(_pendDy); } catch (e) {} _pendDy = 0; }\n  _lastDraw = 0;\n  _scrolling = 0;\n}\nfunction evChrome(rows) {\ng.setColor(TH.accent).setFont(\"6x8\", 1).setFontAlign(-1, -1).drawString(\"EVENTS\", 4, 18);\ng.setFontAlign(1, -1).drawString(rows.length ? (rows.length + \"\") : \"\", 168, 18);\n}\n/* One row. Three strings and, for the next one due, a highlight \\u2014 every\n   measurement and every truncation already done in prepRows. */\nfunction drawEventRow(e, ry) {\nif (!e) return;\nvar _dh = e.off * 24;\nif (_dh >= -0.01 && _dh <= EARLY_H) {\n/* The two text lines occupy ry..ry+31, so the frame has to sit OUTSIDE that or\n   it draws straight through the second line \\u2014 which it did. Only the right\n   edge is thickened; the left two pixels belong to the medication colour chip. */\ng.setColor(EARLY_COL);\ng.drawRect(1, ry - 2, LIST_R - 1, ry + 32);\ng.fillRect(LIST_R - 2, ry - 2, LIST_R - 1, ry + 32);\n}\nif (e._next) { g.setColor(TH.accent).fillRect(2, ry - 2, LIST_R - 1, ry + EV_H - 6); g.setColor(\"#000000\"); }\nelse g.setColor(e._past ? TH.p4 : TH.fg);\ng.setFont(\"6x8\", 2).setFontAlign(-1, -1).drawString(e._l1, 6, ry);\n/* A colour chip for the medication, so two patch drugs are told apart at a\n   glance rather than by reading the name underneath. */\nif (!e._next && e._col) { g.setColor(e._col); g.fillRect(2, ry, 3, ry + 28); }\nif (!e._next) g.setColor(e._past ? TH.p4 : TH.e2);\ng.setFont(\"6x8\", 2).setFontAlign(-1, -1).drawString(e._act, 6, ry + 16);\ng.setFont(\"6x8\", 1).drawString(e._l2, 12 + e._actW, ry + 20);\n}\nfunction drawEvents() {\nslimHeader();\nvar rows = rowsNow();\nevChrome(rows);\nif (!rows.length) {\ng.setColor(TH.fg).setFont(\"6x8\", 1).setFontAlign(0, 0).drawString(\"nothing in the window\", 88, 96);\nreturn;\n}\nlistClamp();\ndrawBand(EV_TOP, LIST_BOT - 1, 0);\ndrawScrollBar();\n}\nfunction potency(age, dur) {\nvar c = (D && D.potCurve) || [];\nif (!c.length || !(dur > 0)) return 0;\nvar u = age / dur * 10, i = Math.floor(u);\nif (i < 0) return c[0];\nif (i >= c.length - 1) return c[c.length - 1];\nreturn c[i] + (c[i + 1] - c[i]) * (u - i);\n}\nfunction invChrome(st) {\nvar many = st.cap * INV_H > (LIST_BOT - INV_TOP);\ng.setColor(TH.accent).setFont(\"6x8\", 1).setFontAlign(-1, -1)\n.drawString(many ? \"INVENTORY\" : \"PATCH INVENTORY\", 4, 18);\ng.setFontAlign(1, -1).drawString(st.on + (many ? \" on\" : \" on body\"), 168, 18);\ng.setColor(TH.p4).setFont(\"6x8\", 1).setFontAlign(-1, -1);\n/* Columns shifted left and the wear bar narrowed from 44px to 34px, the least\n   that frees room for the medication tag. The bar's fill is a fraction of its\n   own width and its colour is keyed on that fraction, not on pixels, so a\n   narrower bar still reads the same proportion in the same colour. */\ng.drawString(\"SPOT\", 4, 27); g.drawString(\"SIZE\", 26, 27);\ng.drawString(\"TTR\", 64, 27);  g.drawString(\"WEAR\", 90, 27);\ng.setFontAlign(1, -1); g.drawString(\"POT\", 146, 27); g.drawString(\"PG\", 168, 27);\n}\nfunction drawInvRow(i, ry, st) {\nvar s = st.slots[i], p = s ? st.byKey[s.key] : null, rh = INV_H;\n/* Coming off within the window, or a reserved spot whose patch goes on within\n   it. Either way the same permission applies. */\nvar _eh = 1e9;\nif (s && p) { var _lf = (+p.wear) - s.age; if (_lf >= 0) _eh = _lf * 24; }\nelse if (st.resv[i]) _eh = st.resv[i].off * 24;\nif (_eh >= -0.01 && _eh <= EARLY_H) {\n/* Starts AT ry, not above it: the first row sits flush with the top of the\n   scrolling region, so a line at ry-1 fell outside the clip and vanished. */\ng.setColor(EARLY_COL);\ng.drawRect(1, ry, LIST_R - 1, ry + rh - 2);\n}\ng.setColor(s ? TH.fg : TH.p4).setFont(\"6x8\", 1).setFontAlign(-1, -1);\ng.drawString(st.sites[i] || \"\", 4, ry + 1);\nif (!s || !p) {\nif (st.resv[i]) {\nvar _rp = st.byKey[st.resv[i].key];\nif (_rp && _rp.col) g.setColor(_rp.col);\ng.drawString(((_rp && _rp.tag) ? _rp.tag + \" \" : \"\") + \"on \" + dayWord(st.resv[i].off)\n  + \" \" + evClock(st.resv[i]), 26, ry + 1);\ng.setColor(TH.p4);\n}\nelse g.drawString(\"\\u2014\", 28, ry + 1);\nreturn;\n}\n/* Which medication. With one patch drug this is noise; with two it is the\n   difference between a row you can act on and one you cannot. The size is drawn\n   in that medication's own colour and its two-letter tag sits beside it. */\nif (p.col) g.setColor(p.col);\ng.drawString(p.sizeStr || \"\", 26, ry + 1);\nif (p.tag) { g.setFont(\"4x6\", 1); g.drawString(p.tag, 46, ry + 2); g.setFont(\"6x8\", 1); }\ng.setColor(TH.fg);\nif (p.teg) { g.setColor(TH.accent); g.drawString(\"T\", 56, ry + 1); g.setColor(TH.fg); }\nvar age = s.age, dur = (+p.dur) > 0 ? +p.dur : 3.5;\nvar left = (+p.wear) - age; if (left < 0) left = 0;\n/* A tenth of a day is 2.4 hours, which is worth showing when there is a day or\n   two left and pure noise at thirteen. Dropping the decimal above ten days keeps\n   this column to four characters, which is what lets the wear bar stay wide. */\ng.drawString((left >= 10 ? Math.round(left) : Math.round(left * 10) / 10) + \"d\", 64, ry + 1);\nvar pv = potency(age, dur), fr = (+p.wear) > 0 ? left / (+p.wear) : 0;\nif (fr > 1) fr = 1; if (fr < 0) fr = 0;\nvar x0 = 90, wpx = 34, bh = rh - 4;\nif (bh > 9) bh = 9;\ng.setColor(TH.p4); g.drawRect(x0, ry, x0 + wpx, ry + bh);\ng.setColor(fr < 0.25 ? TH.accent : TH.e2);\nif (fr > 0) g.fillRect(x0 + 1, ry + 1, x0 + 1 + Math.round((wpx - 2) * fr), ry + bh - 1);\nvar lvl = ((+p.pg) > 0 ? +p.pg : 90) * (+p.size) * potency(age, dur);\ng.setColor(TH.fg).setFontAlign(1, -1);\ng.drawString(Math.round(Math.min(pv, 1) * 100) + \"\", 146, ry + 1);\ng.drawString(Math.round(lvl) + \"\", 168, ry + 1);\n}\nfunction drawInv() {\nslimHeader();\nvar st = invState();\ninvChrome(st);\nlistClamp();\ndrawBand(INV_TOP, LIST_BOT - 1, 0);\ndrawScrollBar();\n}\nvar PLANETS = [\n{ n:\"MERCURY\", a:0.387, T:0.2408, L:252.2, e:0 }, { n:\"VENUS\",   a:0.723, T:0.6152, L:181.9, e:0 },\n{ n:\"EARTH\",   a:1.000, T:1.0000, L:100.4, e:1 }, { n:\"MARS\",    a:1.524, T:1.8808, L:355.4, e:0 },\n{ n:\"JUPITER\", a:5.203, T:11.862, L:34.3,  e:0 }, { n:\"SATURN\",  a:9.537, T:29.447, L:50.0,  e:0 },\n{ n:\"URANUS\",  a:19.191,T:84.011, L:313.2,e:0 }, { n:\"NEPTUNE\", a:30.069,T:164.79, L:304.9,e:0 }\n];\nfunction orad(a) { return 14 + 66 * Math.sqrt(a / 30.069); }\nvar _orb = null;\nfunction orbits() {\nif (_orb) return _orb;\n_orb = [];\nfor (var i = 0; i < PLANETS.length; i++) {\nvar r = orad(PLANETS[i].a), ry = r * 0.46, poly = [];\nfor (var k = 0; k <= 24; k++) { var ang = k / 24 * 6.2832; poly.push(88 + r*Math.cos(ang)); poly.push(100 + ry*Math.sin(ang)); }\n_orb.push(poly);\n}\nreturn _orb;\n}\nvar TOUR_START = 1500, TOUR_STEP = 1400;\nvar tourI = -1, tourT = null;\nfunction stopTour() { if (tourT) { clearTimeout(tourT); tourT = null; } tourI = -1; }\nfunction tourStep() {\ntourT = null;\nif (!pgIs(\"solar\") || alertEv || Bangle.isLocked()) { tourI = -1; return; }\ntourI++;\nif (tourI >= PLANETS.length) { tourI = -1; render(); return; }\nrender();\ntourT = setTimeout(tourStep, TOUR_STEP);\n}\nfunction startTour() { stopTour(); tourT = setTimeout(tourStep, TOUR_START); }\nfunction drawSolar() {\nslimHeader();\nvar J = (Date.now() - 946728000000) / 86400000, orb = orbits();\nvar i, p, th, r, x, y;\nfor (i = 0; i < orb.length; i++) { g.setColor(i === tourI ? TH.accent : TH.e2); g.drawPoly(orb[i], true); }\ng.setColor(\"#ffff00\"); g.fillCircle(88, 100, 4);\nfor (i = 0; i < PLANETS.length; i++) {\np = PLANETS[i]; th = (p.L + 360 * J / (p.T * 365.25)) * Math.PI / 180;\nr = orad(p.a); x = 88 + r * Math.cos(th); y = 100 + r * 0.46 * Math.sin(th);\nif (i === tourI) { g.setColor(TH.accent); g.fillCircle(x, y, 4); g.drawCircle(x, y, 8); g.drawCircle(x, y, 9); }\nelse {\ng.setColor(TH.fg); g.fillCircle(x, y, p.a > 3 ? 3 : 2);\nif (p.e) { g.setColor(TH.p4); g.drawCircle(x, y, 4); }\n}\n}\nif (tourI >= 0) g.setColor(TH.accent).setFont(\"6x8\", 2).setFontAlign(0, -1).drawString(PLANETS[tourI].n, 88, 18);\n}\nfunction drawAlert(e) {\ng.setRotation(flipped ? 2 : 0); g.clear(); fillBg();\ng.setColor(TH.fg).setFontAlign(0,0);\nvar tm = e.vague ? (e.tod<0.5?\"AM\":\"PM\") : fmtClock(e.tod);\ng.setFont(\"6x8\",1).drawString(tm, 88, 22);\nvar title = e.kind === \"on\" ? \"PUT ON\" : e.kind === \"off\" ? \"TAKE OFF\" : \"TAKE\";\ng.setFont(\"6x8\",3).drawString(title, 88, 44);\nvar mid = e.kind === \"take\" ? ((e.dose||\"\") + \" mg\") : (e.size ? e.size + \" patch\" : \"patch\");\ng.setFont(\"6x8\",2).drawString(mid, 88, 82);\nvar sub = e.kind === \"take\" ? (e.med + (e.route ? \"  \" + e.route : \"\")) : (e.med + (e.site ? \"  \" + e.site : \"\"));\ng.setFont(\"6x8\",1).drawString(sub.substr(0,28), 88, 108);\ng.setColor(TH.accent).drawString(\"tap to dismiss\", 88, 152);\n}\nfunction buzzFor(kind) {\ntry {\nif (kind === \"on\") { Bangle.buzz(70); setTimeout(function(){ try{Bangle.buzz(70);}catch(e){} }, 140); }\nelse if (kind === \"off\") { Bangle.buzz(500); }\nelse { Bangle.buzz(180); }\n} catch (e) {}\n}\nfunction drawHints() {\nif (alertEv) return;\ng.setColor(TH.fg).setFont(\"6x8\",1);\ng.setFontAlign(-1,0).drawString(\"<\", 2, 88);\ng.setFontAlign(1,0).drawString(\">\", 174, 88);\n}\nfunction render() {\nvar _rt0 = Date.now();\ntry {\n_scrolling = 0;\nvar rot = flipped ? 2 : 0;\nif (alertEv && !pgIs(\"events\")) { drawAlert(alertEv); return; }\ng.setRotation(rot);\nframeReset();\nfillBg();\nif (!D) {\ng.setColor(\"#ffffff\").setFont(\"6x8\",2).setFontAlign(0,0).drawString(\"no schedule\\ntransferred\", 88, 88);\ng.setFont(\"6x8\",1).setFontAlign(-1,-1).drawString(APP_VER, 2, 167);\nreturn;\n}\ng.setColor(TH.p4).setFont(\"6x8\", 1).setFontAlign(-1, -1).drawString(APP_VER, 2, 167);\nvar nm = pg();\ntry {\nif (nm === \"clock\") drawClock();\nelse if (nm === \"events\") drawEvents();\nelse if (nm === \"inv\") drawInv();\nelse if (nm === \"solar\") drawSolar();\nelse drawGraph();\n} catch (pe) {\ng.setColor(TH.accent).setFont(\"6x8\", 1).setFontAlign(0, 0);\ng.drawString(nm + \" page error\", 88, 100);\ng.drawString((\"\" + pe).substr(0, 28), 88, 112);\n}\ng.setRotation(rot); drawHints();\n_pgExp = pageExpiry();\n_renderMs[pg()] = Date.now() - _rt0;\n} catch (e) { showErr(\"draw error:\", e); }\n}\nvar iv = null, bootedAt = Date.now(), _lastFire = \"\", _lastStepDraw = 0, _lastMin = -1;\n/* The next dose is a fact with a timestamp, so work it out ONCE and then just\n   watch the clock. This used to rebuild the whole schedule every twenty seconds\n   \\u2014 eight days of events for every medication, sorted, with body sites resolved\n   \\u2014 which is roughly a thousand interpreted function calls arriving on top of\n   whatever you were doing. Now the common tick is three comparisons, and the\n   rebuild happens only when a dose actually lands or the schedule changes. */\nvar _dueAt = 0, _dueEv = null, _dueChk = 0;\nfunction refreshDue() {\ntry {\nvar n = upcomingEvents(1)[0];\n_dueEv = n || null;\n_dueAt = n ? (Date.now() + n.delta * 86400000) : (Date.now() + 3600000);\n} catch (e) { _dueEv = null; _dueAt = Date.now() + 3600000; }\n_dueChk = Date.now();\n}\nfunction checkDue() {\nvar t = Date.now();\n/* Re-ask if we have never looked, if the answer has gone five minutes past due,\n   or simply if it is ten minutes old. That last one is the safety net: the stored\n   moment is an absolute timestamp, so the only thing that can invalidate it\n   behind our back is the watch's own clock moving, and ten minutes bounds how\n   long a wrong answer could survive. Still a thirtieth of the old work. */\nif (!_dueEv || t > _dueAt + 300000 || t - _dueChk > 600000) refreshDue();\nif (!_dueEv) return;\nif (_dueAt - t >= 60000) return;              // the cheap path, almost every tick\nvar n = _dueEv, at = _dueAt;\nvar key = n.med + n.kind + Math.round(at / 60000);\nif (key !== _lastFire) {\n_lastFire = key;\nbuzzFor(n.kind);\nif (!pgIs(\"events\")) { n.at = at; n.site = siteFor(n); alertEv = n; }\n}\nrefreshDue();                                  // move on to the one after\n}\n/* Nothing on these pages can change faster than the minute they are cached on,\n   so redrawing every twenty seconds was two frames in three thrown away \\u2014 and a\n   frame is a full-screen repaint landing on top of whatever you were doing with\n   your finger. Redraw when the minute turns, or when a dose is close enough that\n   the countdown is worth watching. */\n/* The earliest moment anything on this page could LOOK different. Until then\n   there is nothing to draw, and the tick does nothing at all.\n\n   On the events page that moment is genuinely rare: the clock times are baked\n   integers that never move, so the only changes are a row crossing from upcoming\n   to done \\u2014 which is exactly when the next dose lands \\u2014 and the day words\n   turning over at midnight. The inventory also carries slow counters (time\n   remaining, potency, level) whose fastest tick is a few minutes, so it gets a\n   floor rather than being treated as idle. */\nfunction pageExpiry() {\nvar t = Date.now(), nx = t + 3600000;\nvar n = new Date(t);\nvar mid = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1).getTime();\nif (mid < nx) nx = mid;\nif (_dueEv && _dueAt > t && _dueAt < nx) nx = _dueAt;\n/* Both list pages are driven by the same window, so both wake for the same\n   moments \\u2014 including a projection arriving 36 hours before its patch does. */\nif ((pgIs(\"events\") || pgIs(\"inv\")) && _winAt > t + 1000 && _winAt < nx) nx = _winAt;\nif (pgIs(\"inv\")) { var f = t + 300000; if (f < nx) nx = f; }\nif (pgIs(\"clock\")) { var c = t + 60000; if (c < nx) nx = c; }\nreturn nx;\n}\n/* \u2550\u2550\u2550 \"WORKING\u2026\" \u2550\u2550\u2550\n   The first time you open the schedule or the inventory after a boot, the\n   rotation has to be simulated from scratch and the watch is gone for the best\n   part of a minute. Nothing on screen changes in that time, so the tap looks\n   like it was missed and you tap again, which achieves nothing.\n\n   This cannot be done on a timer. Espruino runs one thing at a time, so once the\n   heavy work starts nothing else can draw \\u2014 by the time four seconds have\n   passed there is no way to say so. The card has to go up BEFORE the work\n   begins, which means predicting that the work will be slow rather than\n   observing it.\n\n   The prediction is exact where it matters: the cost IS the cold cache, so if\n   the cache is empty this will be slow, and if it is warm it will not. After the\n   first open there is nothing to predict and no card appears. */\nvar _renderMs = {};\nfunction willBeSlow(p) {\n  if (p === \"events\") return _rcRows === null;\n  if (p === \"inv\") return _invS === null || _rcRows === null;\n  return (_renderMs[p] || 0) > 1200;\n}\nfunction showWorking(label) {\n  try {\n    g.setRotation(flipped ? 2 : 0);\n    g.setClipRect(0, 0, 175, 175);\n    fillBg();\n    slimHeader();\n    g.setColor(TH.accent);\n    g.drawRect(10, 62, 165, 116);\n    g.drawRect(11, 63, 164, 115);\n    /* \"Loading\" big, what it is loading small underneath. */\n    g.setColor(TH.fg).setFontAlign(0, 0);\n    if (!vFont(26)) g.setFont(\"6x8\", 3);\n    g.drawString(\"Loading\", 88, 82);\n    g.setColor(TH.e2).setFont(\"6x8\", 1);\n    if (label) g.drawString(label, 88, 103);\n    /* No progress bar. There is nothing to measure \\u2014 the work is one\n       uninterruptible block, so a bar could only be a decoration that pretends to\n       know how far along it is. A frame that plainly says \"Loading\" is honest and\n       does the same job. */\n    g.setColor(TH.p4).setFont(\"6x8\", 1).setFontAlign(-1, -1).drawString(APP_VER, 2, 167);\n    /* PUSH IT TO THE SCREEN NOW. Drawing only fills the buffer; Espruino sends it\n       to the LCD when it next goes idle. The heavy render is on a 20ms timer, and\n       if that fires before the flush the buffer is overwritten and the card never\n       appears at all \\u2014 which is why it was missing on the first page change\n       after a wake, when there is extra queued work delaying idle, and present\n       afterwards when there is not. A card that shows only when the watch happens\n       to be free is no reassurance at all. */\n    try { g.flip(); } catch (e2) {}\n  } catch (e) {}\n}\n/* Draw the card, RETURN so the screen actually flushes, and only then do the\n   work. Without giving up the interpreter first the card would never appear. */\n/* The card is shown for EVERY page change now, not only the ones predicted to be\n   slow. A prediction that is right most of the time still leaves the occasional\n   change feeling like a dropped tap, and nothing is lost by always saying what is\n   happening.\n\n   `_busy` is why taps stop stacking up. A page change is not instant, and a tap\n   arriving while one is in flight used to sit in the queue and then fire \\u2014 so a\n   second tap on a screen that looked unresponsive turned into two page turns at\n   once. While a change is under way, taps are ignored outright rather than\n   queued. The timestamp is a dead-man's switch: if a render somehow never\n   finishes, the watch un-sticks itself after ninety seconds instead of ignoring\n   you forever. */\nvar _busy = 0, _busyAt = 0;\n/* Are the list caches stale? Not \"have they ever been built\" \\u2014 they are keyed\n   on the minute, so after a night asleep they are present but useless, and the\n   rebuild is the slowest thing this app does. That is exactly the moment the\n   card was missing. */\nfunction cacheCold() {\n  var k = _dataEpoch + \":\" + Math.floor(Date.now() / 60000);\n  /* Only the caches THIS page needs. The events page never builds the inventory\n     one, so demanding both reported cold forever and would have put a card in\n     front of every wake regardless. */\n  if (pgIs(\"events\")) return _rcRows === null || _rcKey !== k;\n  if (pgIs(\"inv\")) return _invS === null || _invK !== k || _rcRows === null || _rcKey !== k;\n  return false;\n}\n/* `settle` is how long to wait before starting the heavy work. A tap needs only\n   long enough to let the screen flush. A WAKE needs more: the LCD powers on a\n   moment before it is ready to be drawn, so the first thing drawn after a long\n   sleep is thrown away \\u2014 which is why the card appeared all morning and not\n   first thing. On that path the card is drawn twice, once now and once after the\n   panel has settled, and only then does the work begin. */\nfunction goPage(settle) {\n  var p = pg(), d = settle || 20;\n  var label = p === \"inv\" ? \"patch inventory\" : p === \"events\" ? \"schedule\" : p;\n  _busy = 1; _busyAt = Date.now();\n  showWorking(label);\n  if (d > 120) setTimeout(function () { try { showWorking(label); } catch (e) {} }, 110);\n  setTimeout(function () {\n    try { render(); } catch (e) {}\n    _busy = 0;\n  }, d);\n}\n/* Everything a gesture or a page change might have left half-finished. After a\n   long sleep these are the flags most likely to be stale, and a stuck one\n   silently swallows taps \\u2014 which is its own kind of invisible fault. Cleared\n   in one place so there is no list to keep in step. */\nfunction wakeReset() {\n  _dg = null; _dgSup = 0;\n  _busy = 0; _busyAt = 0;\n  _pendDy = 0; _scrolling = 0;\n  _lastDraw = 0; _drawMs = SCROLL_MS;\n  if (_scrollT) { try { clearTimeout(_scrollT); } catch (e) {} _scrollT = null; }\n  _pgExp = 0;\n}\nvar _pgExp = 0;\nfunction tick() {\n/* Cheap when WIDGETS is empty, which it is unless something registered one after\n   we started \\u2014 which is precisely the case the startup call cannot catch. */\nsilenceWidgets();\ntry { checkDue(); } catch (e) {}\nif (Bangle.isLocked()) return;\nif (alertEv) { render(); return; }\nif (Date.now() < _pgExp) return;\nrender();\n}\nfunction startTick() { if (!iv) iv = setInterval(tick, 20000); }\nfunction stopTick()  { if (iv) { clearInterval(iv); iv = null; } }\ntry {\n/* \u2550\u2550\u2550 THE TOP BAR \u2550\u2550\u2550\n   This app never asks for widgets \\u2014 it never calls Bangle.loadWidgets() \\u2014 and\n   yet the battery bar keeps appearing over it. There is no watch-wide setting to\n   turn them off, because widgets are meant to be opt-IN per app. What happens is\n   that WIDGETS is a global, boot code from installed widget apps can populate it\n   whether or not we asked, and a widget redraws itself on its own schedule: some\n   call their own draw(), some call Bangle.drawWidgets() to re-lay-out. Either\n   one lands on top of whatever we had in those 24 pixels.\n\n   So we take the bar back. Every registered widget gets its draw() emptied and\n   its area cleared, which is exactly what the official widget_utils.hide() does,\n   and Bangle.drawWidgets becomes a no-op so a widget asking for a re-layout gets\n   nothing. Both changes live only in this app's interpreter session \\u2014 loading\n   any other app resets them, so nothing is broken for the rest of the watch. */\nfunction silenceWidgets() {\n  try {\n    var W = global.WIDGETS, k, w;\n    if (W) for (k in W) {\n      w = W[k];\n      if (w) { w.draw = function () {}; w.area = \"\"; w.width = 0; }\n    }\n    Bangle.drawWidgets = function () {};\n  } catch (e) {}\n}\nsilenceWidgets();\n/* Put the screen back upright on the way out. This app flips to rotation 2 when\n   worn the other way round, and that setting lives on the graphics object rather\n   than in our own state \\u2014 so whatever loads next inherits it and comes up\n   sideways. Restoring it here costs nothing and cannot be forgotten. */\nif (typeof E !== \"undefined\" && E.on) {\n  try { E.on(\"kill\", function () { try { g.setRotation(0); } catch (e2) {} }); } catch (e) {}\n}\nif (Bangle.setUI) Bangle.setUI({ mode: \"clock\" });\nif (D) {\ntry { buildPages(); } catch (e) {}\ntry { rotInit(); } catch (e) {}\nvar lastTap = 0;\nBangle.on(\"touch\", function(z, xy){\nif (!xy) return;\nif (_dragSuppressed && _dragSuppressed()) return;\n/* A page change is already under way: swallow this, do not queue it. */\nif (_busy && Date.now() - _busyAt < 90000) return;\nif (Date.now() - lastTap < 90) return;\nlastTap = Date.now();\nif (alertEv) { alertEv = null; render(); return; }\nif (xy.y < 44 || xy.y > 132) { flipped = !flipped; saveFlip(); goPage(); return; }\nif (xy.x < 88) page = (page + PG.length - 1) % PG.length; else page = (page + 1) % PG.length;\nif (pgIs(\"solar\")) startTour(); else stopTour();\nif (pgIs(\"events\")) evOff = 0;\nif (pgIs(\"inv\")) invOff = 0;\ngoPage();\n});\nvar _dg = null, _dgSup = 0;\nBangle.on(\"drag\", function(e){\nvar dy, dx;\nif (e.b) {\nif (!_dg) { _dg = { x:e.x, y:e.y, run:0, on:0 }; return; }\ndy = (e.dy === undefined) ? (e.y - _dg.y) : e.dy;\ndx = (e.dx === undefined) ? (e.x - _dg.x) : e.dx;\n_dg.x = e.x; _dg.y = e.y;\n_dg.run += Math.abs(dy) + Math.abs(dx);\nif (alertEv || !listGeom()) return;\n// A few pixels of slop so a slightly smudged tap is still a tap.\nif (_dg.run < 8) return;\n_dgSup = 1; _dg.on = 1;\ntry { scrollBegin(); if (dy) scrollQueue(-dy); } catch (err) {}\nreturn;\n}\nvar d = _dg; _dg = null;\n// One clean repaint when the finger lifts. Shifting the buffer leaves nothing\n// behind for the strip that scrolled off, so this is where anything approximate\n// gets made exact again.\nif (d && d.on) {\nscrollEnd();\ntry { render(); } catch (err2) {} \n/* Swallow only the tap that ends this gesture. The flag used to sit armed\n   until some later tap happened to come along and eat it \\u2014 so the first\n   deliberate press after a scroll did nothing. */\nsetTimeout(function(){ _dgSup = 0; }, 150);\n}\n});\n_dragSuppressed = function(){ if (_dgSup) { _dgSup = 0; return true; } return false; };\nBangle.on(\"lock\", function(on){\nif (on) { stopTick(); return; }\nwakeReset();\nif (pgIs(\"solar\")) startTour();\n/* This is the draw that was missing its card. Waking bypassed goPage entirely\n   and called render() straight out \\u2014 and after a long sleep that render is the\n   expensive one, because the caches went stale overnight. */\nif ((pgIs(\"events\") || pgIs(\"inv\")) && cacheCold()) goPage(260);\nelse render();\nstartTick();\n});\nBangle.on(\"step\", function(){\n_stV++; _stW++;\nvar t = Date.now();\nif (pgIs(\"clock\") && t - _lastStepDraw > 3000) { _lastStepDraw = t; render(); }\n});\nsetInterval(function(){\nif (pgIs(\"clock\") && !Bangle.isLocked() && new Date().getMinutes() !== _lastMin) render();\n}, 3000);\nstartTick();\n}\ntry { bgImage(); } catch (e) {}\ng.reset(); render();\n} catch (e) {\nshowErr(\"init error:\", e);\n}";

/* ══ PALACE OF POWER — tablet-side transfer ═══════════════════════════
   Bakes a snapshot of the current schedule (curve + events + site table)
   and pushes it, plus the miniature app, into the Bangle's flash so the
   watch runs standalone.

   Depends on Espruino's UART.js (vendor it into /public and load it, or
   `import "https://www.espruino.com/js/uart.js"`). That one file handles
   the Web Bluetooth chunking/flow-control; everything below is app logic.
   ──────────────────────────────────────────────────────────────────── */

/* ── slotTable: copied verbatim from watch-slots.js (verified vs the
      tablet's rotateSlots). Builds the repeating site table we ship. ── */
function slotTable(pieces, cl, cap, maxCycles) {
  var LIM = maxCycles || Math.max(16, cap * 4 + 8);
  var freeAt = [], lastUsed = [], i;
  for (i = 0; i < cap; i++) { freeAt[i] = -1e9; lastUsed[i] = -1e9; }
  var evs = pieces.filter(function (p) { return p.wear > 0 && p.size > 0; })
    .slice().sort(function (a, b) { return a.day - b.day; });
  var seen = {}, rows = [], start = 0, period = 0;
  for (var c = 0; c < LIM; c++) {
    var sig = freeAt.map(function (f, k) {
      var a = f - c * cl, b = lastUsed[k] - c * cl;
      return (a < -1e6 ? "-" : Math.round(a*100)/100) + "," + (b < -1e6 ? "-" : Math.round(b*100)/100);
    }).join("|");
    if (seen[sig] !== undefined) { start = seen[sig]; period = c - start; break; }
    seen[sig] = c;
    var row = [];
    for (i = 0; i < evs.length; i++) {
      var e = evs[i], on = e.day + c * cl, best = -1;
      for (var s = 0; s < cap; s++) {
        if (freeAt[s] > on + 1e-9) continue;
        if (best < 0 || lastUsed[s] < lastUsed[best]) best = s;
      }
      if (best < 0) { row.push(-1); continue; }
      freeAt[best] = on + e.wear; lastUsed[best] = on; row.push(best);
    }
    rows.push(row);
  }
  if (!period) { start = 0; period = rows.length; }
  return { order: evs.map(function (p) { return p.id; }),
           start: start, rows: rows.slice(start, start + period), warm: rows.slice(0, start) };
}



/* Resample an [{t,v}] series (any span) to N points across ONE cycle. */
function smoothArr(a, w) {   // w = half-window; merges sub-daily spikes into a readable daily wiggle
  var out = [], n = a.length, i, j, s, c;
  for (i = 0; i < n; i++) { s = 0; c = 0;
    for (j = i - w; j <= i + w; j++) if (j >= 0 && j < n) { s += a[j]; c++; }
    out.push(Math.round(s / c * 10) / 10);
  }
  return out;
}
function resampleCycle(series, cycleLen, n) {
  var pts = (series || []).filter(function (p) { return p.t >= 0 && p.t < cycleLen; })
                          .sort(function (a, b) { return a.t - b.t; });
  if (!pts.length) return new Array(n).fill(0);
  var out = [];
  for (var i = 0; i < n; i++) {
    var t = (i / (n - 1)) * cycleLen, lo = 0;
    while (lo < pts.length - 1 && pts[lo + 1].t <= t) lo++;
    var a = pts[lo], b = pts[Math.min(lo + 1, pts.length - 1)];
    var v = b.t === a.t ? a.v : a.v + (b.v - a.v) * ((t - a.t) / (b.t - a.t));
    out.push(Math.round(Math.max(0, v) * 10) / 10);
  }
  return out;
}

/* ── buildWatchPayload ─────────────────────────────────────────────────
   ctx is wired from the App component. Field names are the current ones in
   pk-model.jsx (2026-07) — re-check them against the file you're patching,
   since the app is still evolving. Marked ★ where they read app state.   */
/* Patch size for the watch. Snapped with the app's own toCents so the watch agrees
   with every other surface, then written ASCII (the Bangle's built-in font has no
   vulgar fractions). Eighths were wrong: a 1/3 piece was rendering as "3/8". */
function fracStr(x) {
  if (!(x > 0)) return "";
  var c = toCents(x), whole = Math.floor(c / 100), fr = c % 100;
  var map = {0:"", 25:"1/4", 33:"1/3", 50:"1/2", 67:"2/3", 75:"3/4"};
  var fs = (map[fr] !== undefined) ? map[fr] : (Math.round(fr / 5) * 5 + "/100");
  if (whole > 0) return fs ? (whole + " " + fs) : ("" + whole);
  return fs || (Math.round(x * 100) / 100 + "");
}
function buildWatchPayload(ctx) {
  var cycleLen = ctx.cycleLen || 29.5;
  var cap = Math.max(2, ctx.maxOnBody || 8);
  var N = ctx.curveN || 150;

  /* ── graph series ────────────────────────────────────────────────
     One entry per line the watch draws, each carrying its OWN scale — a custom
     medication in ng/mL shares no axis with estradiol in pg/mL. Exactly one is
     filled, and it is emitted FIRST so it lands in the bottom layer.
     Capped, because every extra line is another drawPoly of 300 numbers per
     frame and the page stops being readable well before it stops being fast.
     Overflow is dropped from the tail and counted, so the watch can say so. */
  var MAX_SERIES = 6;
  function watchColor(hex) {
    // 3-bit screen: eight colours and nothing between, so snap to the nearest.
    var pal = ["#ff0000","#00ff00","#0000ff","#ffff00","#ff00ff","#00ffff","#ffffff"];
    var h = ("" + (hex || "")).replace("#", ""), best = "#00ffff", bd = 1e9, i;
    if (h.length === 3) h = h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2);
    if (h.length !== 6) return best;
    var r = parseInt(h.substr(0,2),16), gg = parseInt(h.substr(2,2),16), b = parseInt(h.substr(4,2),16);
    for (i = 0; i < pal.length; i++) {
      var pr = parseInt(pal[i].substr(1,2),16), p2 = parseInt(pal[i].substr(3,2),16), pb = parseInt(pal[i].substr(5,2),16);
      var d = (r-pr)*(r-pr) + (gg-p2)*(gg-p2) + (b-pb)*(b-pb);
      if (d < bd) { bd = d; best = pal[i]; }
    }
    return best;
  }
  var wanted = [];
  wanted.push({ n:"E2", u:"pg/mL", c:(ctx.theme && ctx.theme.e2) || "#ff00ff", key:"E2", max:+ctx.e2Max || 1, pts:ctx.e2Series });
  wanted.push({ n:"P4", u:"ng/mL", c:(ctx.theme && ctx.theme.p4) || "#00ffff", key:"P4", max:+ctx.p4Max || 1, pts:ctx.p4Series });
  if (ctx.tSeries && ctx.tSeries.length)
    wanted.push({ n:"T", u:"ng/dL", c:"#00ff00", key:"T", max:+ctx.tMax || 1, pts:ctx.tSeries });
  (ctx.customSeries || []).forEach(function (cs) {
    if (!cs || !cs.data || cs.data.length < 2) return;
    wanted.push({ n:("" + (cs.name || "?")).substr(0, 6), u:cs.unit || "", c:cs.color, key:"",
                  max:(+cs.max || 1) * 1.15, pts:cs.data });
  });

  /* Quantise everything first, THEN decide, because the decision depends on the
     shape. Anything that never leaves the floor is a hormone the user does not
     take: dropping it beats drawing a flat line along the axis. */
  var built = [];
  wanted.forEach(function (s) {
    if (!s.pts || !s.pts.length) return;
    var r = resampleCycle(s.pts, cycleLen, N), mx = +s.max || 1, q = [], qi, peak = 0, sum = 0, v;
    /* Quantised to 0-1000 of the series' own maximum. The plot is 100px tall, so
       full floats would spend transfer time on precision the screen cannot show. */
    for (qi = 0; qi < r.length; qi++) {
      v = Math.round(Math.max(0, Math.min(1, r[qi] / mx)) * 1000);
      q.push(v); sum += v; if (v > peak) peak = v;
    }
    if (peak < 5) return;                                   // never rises off the axis
    built.push({ n:s.n, u:s.u, c:watchColor(s.c), key:s.key, fill:0, max:mx, q:q,
                 area:sum / (q.length || 1) });             // mean height = how much of the plot it covers
  });

  /* Which one gets filled. Estradiol if it is there, else testosterone, else
     progesterone; and if none of the three are present \u2014 someone tracking only
     non-hormone medications \u2014 whichever curve covers the most of the plot, since
     the fill reads as the backdrop and the biggest shape makes the best one. */
  var fillIdx = -1, i2, pri = ["E2", "T", "P4"], pk;
  for (pk = 0; pk < pri.length && fillIdx < 0; pk++)
    for (i2 = 0; i2 < built.length; i2++)
      if (built[i2].key === pri[pk]) { fillIdx = i2; break; }
  if (fillIdx < 0)
    for (i2 = 0; i2 < built.length; i2++)
      if (fillIdx < 0 || built[i2].area > built[fillIdx].area) fillIdx = i2;
  if (fillIdx >= 0) {
    built[fillIdx].fill = 1;
    built.unshift(built.splice(fillIdx, 1)[0]);             // first == bottom layer
  }
  var dropped = Math.max(0, built.length - MAX_SERIES);
  var series = built.slice(0, MAX_SERIES);

  // (1) curve snapshot — reuse the EXACT arrays the tablet chart plotted ★
  var curve = {
    series: series,
    dropped: dropped,
    e2: resampleCycle(ctx.e2Series, cycleLen, N),   // ★ chartData.e2 ([{t,v}])
    p4: resampleCycle(ctx.p4Series, cycleLen, N),   // ★ chartData.p4
    e2max: ctx.e2Max || 294,                        // ★ chartData.eM
    p4max: ctx.p4Max || 20                          // ★ chartData.pM
  };
  curve.p4 = smoothArr(curve.p4, 2);                // ~half-day smoothing: daily wiggle, not fuzz

  // (2) events, straight from `medications` (source of truth) ★
  var patchPieces = [], singles = [], rawPieces = [], patchMeds = 0;
  (ctx.medications || []).forEach(function (m) {
    if (!m.enabled) return;
    if (m.deliveryType === "continuous" && m.continuousType === "patch") {
      // m.pieces preferred; else the app's blocksToPieces(m.doses,...) — pass it in as ctx.blocksToPieces
      patchMeds++;
      var drawn = !!(m.pieces && m.pieces.length);
      var ps = drawn ? m.pieces
             : (ctx.blocksToPieces ? ctx.blocksToPieces(m.doses, cycleLen, m.patchDuration) : []);
      /* A drawn piece already carries its clock time in the FRACTIONAL part of its
         cycle day (snapToWindows places it there), which is exactly how the app's
         calendar prints it: hourLabel((day%1)*24). So the day goes over as-is and the
         watch reads the time off the fraction.
         There is no time to read from a patch medication's `doses` — those are
         blocks (startDay/endDay/count), so the old `m.doses[0].time` read undefined
         and fell through to "am", which is why every patch row said AM or PM.
         Only a legacy block-derived piece, which really does land on a whole day with
         no time information at all, stays vague. */
      ps.forEach(function (p) {
        var d0 = parseFloat(p.day) || 0;
        rawPieces.push(p);
        /* key EXACTLY as rotateSlots computes it, so the watch's port of the
           rotation can look each piece up in the assignment map it builds. */
        /* Minute of the day for the application and the removal, worked out here
           and shipped as an integer. Both sides used to convert a cycle fraction
           to a clock independently and round it their own way, which is how the
           watch came to say 12:43 where the app said 12:44. There is now one
           conversion and both read its answer. */
        var _mn = function (v) { return ((Math.round(v * 1440) % 1440) + 1440) % 1440; };
        /* The key must match the one the tablet's rotation uses, or the seed's
           occupancy names pieces the watch cannot find. patchPieceList namespaces
           block-derived ids by medication for exactly that reason; drawn pieces
           keep their own uid. */
        var _raw = p._id || (d0 + "/" + p.size + "/" + p.wear);
        var _key = (p._id && String(p._id).indexOf("blk") !== 0) ? p._id : ((m.id || "m") + "-" + _raw);
        patchPieces.push({ key: _key,
          day: d0, wear: +p.wear, size: +p.size, sizeStr: fracStr(+p.size),
          onMin: _mn(d0), offMin: _mn(d0 + (+p.wear || 0)),
          dur: (+m.patchDuration > 0 ? +m.patchDuration : PATCH_HALF_LIFE),
          pg: patchPgOf(m),
          teg: needsTegaderm(+p.wear, m.tegadermDays),   // per-med threshold; 0 = off
          /* Which medication this piece carries. The rotation does not care, but
             the inventory has to say so \u2014 with two patch drugs on the body,
             "1/2 on L C" is not enough to act on. */
          med: m.name, tag: (m.name || "?").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase(),
          col: watchColor(m.color), mi: patchMeds - 1,
          hormone: m.hormone });
      });
    } else if (m.deliveryType === "single") {
      (m.doses || []).forEach(function (d) {
        /* dosePos is the app's own: day numbers are 1-based against the calendar, so
           position = day - 1 + timeOffset(time). Baking it here keeps the watch on
           one source of truth and fixes a quiet one-day offset on every single dose. */
        var raw = d.time || "am";
        singles.push({ day: +d.day, pos: dosePos(d.day, raw), time: raw,
          vague: (raw === "am" || raw === "pm"), dose: d.dose,
          unit: m.unit || "mg", route: m.route || "", med: m.name, hormone: m.hormone });
      });
    }
  });

  // (2b) cycle phase per day \u2014 the SAME label the share screen gives a friend,
  //      computed with the app's own mPh so ovulation day and cycle anchor apply.
  var phases = [], pdN = Math.max(1, Math.ceil(cycleLen)), pdi;
  for (pdi = 0; pdi < pdN; pdi++) phases.push(mPh(pdi, cycleLen, ctx.ovulationDay || 16, ctx.cycleAnchor || 0));

  // (3) site tables over the patch pieces. TWO of them:
  //     base = the clean schedule exactly as drawn in the modeler, no corrections;
  //     tbl  = that, carried forward from the body as it stands right now, so a leg
  //            the user has adjusted travels with the schedule.
  //     The watch runs on tbl and falls back to base if its clock jumps backwards.
  var flat = patchPieces.map(function (p) {
    return { id: p.id, day: p.day, wear: p.wear, size: p.size };
  });
  /* No site table any more. The watch runs the app's own rotation itself; all it
     needs is the pieces (above) and one snapshot to start from. rotSeed is what
     makeRot writes into the day log: the stacks with the pieces seated where they
     ACTUALLY are, so a spot you moved a patch to travels with the schedule. */
  /* The inventory bar reads percent of ORIGINAL delivery straight off the patch
     waveform, same as the app. evC is a monotone cubic spline \u2014 far too much to
     port \u2014 so sample it here at 0.1 of a duration out to 4x and let the watch
     interpolate between samples. */
  var potCurve = [], pci, pcm = null;
  var _meds = ctx.medications || [];
  for (pci = 0; pci < _meds.length; pci++) {
    var _m = _meds[pci];
    if (_m && _m.enabled && _m.deliveryType === "continuous" && _m.continuousType === "patch") { pcm = _m; break; }
  }
  if (pcm) {
    var pcv = (pcm.patchCurve && pcm.patchCurve.length >= 2) ? pcm.patchCurve : DEF_PATCH_CURVE;
    /* NOT clamped to 1. patchesOnAt clamps for its own "potency" readout, but e2P
       reads evC raw when it sums a serum level, so a curve drawn with a peak above
       1.0 would be understated if this clamped. Only the floor at zero is kept. */
    for (pci = 0; pci <= 40; pci++) potCurve.push(Math.round(Math.max(0, evC(pcv, pci / 10)) * 1000) / 1000);
  }
  /* The override map, exactly as bodySlots expects it: piece key -> slot index.
     This is the input the watch was missing. bodySlots seats in three stages \u2014
     overrides first, then the rotation, then spill \u2014 and the watch only ever had
     stages two and three, so a dragged patch could not possibly land in the same
     place on both. Sending where patches "are" instead would be handing over an
     answer; sending the map hands over the INPUT and lets the same function run. */
  var ovMap = {};
  try { var _o = ctx.slotOv || {}, _k;
        for (_k in _o) { var _v = _o[_k]; if (typeof _v === "number" && _v >= 0 && _v < cap) ovMap[_k] = _v; } }
  catch (e) { ovMap = {}; }

  var rot = ctx.rotSeed || null;
  /* This used to read `if (patchMeds !== 1) rot = null` \u2014 the watch was sent NO
     body positions at all once a second patch medication existed, so its
     inventory came up blank. makeRot now snapshots the whole pool rather than
     the first medication it finds, so the snapshot is valid however many patch
     drugs there are and there is nothing left to withhold. */

  // site labels: Left/Right group + letter (matches app's PATCH_SIDES/SLOT_LETTERS)
  var LET = "ABCDEFGHIJKLMNOP", perSide = Math.floor(cap / 2), sites = [];
  for (var i = 0; i < cap; i++) sites.push((i < perSide ? "L" : "R") + " " + LET[i]);

  return {
    v: 1,
    theme: ctx.theme || { bg:"#000", e2:"#f00", p4:"#f0f", fg:"#fff", accent:"#f0f" },
    cycleLen: cycleLen,
    /* The cycle's real whole-day length. The watch wraps event positions by this
       rather than by cycleLen, for exactly the reason cycleDays explains: a
       fractional wrap rotates the time of day. */
    cycDays: ctx.cycDays || Math.round(cycleLen),
    cycDaysPrev: ctx.cycDaysPrev || ctx.cycDays || Math.round(cycleLen),
    ovulationDay: ctx.ovulationDay || 16,
    cycleAnchor: ctx.cycleAnchor || 0,
    epochMs: Date.now() - new Date().getTimezoneOffset() * 60000,  // local frame (matches the watch clock)
    epochCycleDay: ctx.nowCycleDay,    // ★ the app's current cycle-day for "today"
    epochCycleIdx: ctx.nowCycleIdx|0,  // ★ absolute cycle index now (for the table)
    units: { e2: "pg/mL", p4: "ng/mL" },
    curve: curve,
    sites: sites,
    rot: rot,
    ov: ovMap,
    cap: cap,
    potCurve: potCurve,
    mode: ctx.mode || "fixed",
    manualStart: ctx.manualStart || 0,
    pastH: PAST_HOURS,
    aheadH: ALERT_HOURS,
    pieces: patchPieces,
    singles: singles,
    /* The sealed placements, and the absolute event sequence beside them. The
       watch is handed STATE, never answers: it runs the same functions the tablet
       does and reads placements exactly as rotateSlots reads `preset`. There is no
       watch-specific placement logic to disagree with. (The placements are also
       folded into `ov` above, which is the map bodySlots already knows how to
       seat, so nothing on the watch had to learn a new shape.) */
    place: ctx.places || {},
    seq: ctx.seq || [],
    phases: phases,
    stepGoal: ctx.stepGoal || 8000
  };
}

/* Load Espruino's UART.js on demand so the tablet stays a single uploaded
   file (nothing to vendor). No-op if it's already present. */
function ensureUART() {
  if (typeof UART !== "undefined") return Promise.resolve();
  return new Promise(function (res, rej) {
    var s = document.createElement("script");
    s.src = "https://www.espruino.com/js/uart.js";
    s.onload = res; s.onerror = function(){ rej(new Error("couldn't load UART.js")); };
    document.head.appendChild(s);
  });
}

/* ── transferToWatch ───────────────────────────────────────────────────
   Chunked writes to Bangle Storage over UART. JSON.stringify on each chunk
   escapes quotes/newlines so the on-watch Storage.write sees a clean JS
   string literal.

   opts:
     wipeFirst       — erase THIS app's own three files before writing. It must
                       never be eraseAll(): that wipes every app on the watch.
                       "boots into nothing but Palace of Power" device; you'd
                       re-flash via the Web IDE to undo it. Default false.
     asDefaultClock  — make this the boot face (recommended). The watch turns
                       on straight into Palace of Power; the button still
                       reaches the launcher, so it's recoverable. Default true.
*/
// Works with either uart.js API: modern connectAsync()/promise .write,
// or the older connect(cb)/callback .write.
function uartConnect() {
  try { if (UART.getConnection && UART.getConnection()) UART.close(); } catch (e) {} // drop any stale/dead link
  if (UART.connectAsync) return UART.connectAsync();
  return new Promise(function (res, rej) {
    UART.connect(function (u) { u ? res(u) : rej(new Error("connection cancelled")); });
  });
}
/* Ask the watch something and get the answer back. Writing blind is how a
   truncated file went unnoticed: every write "succeeded" because nothing ever
   checked what landed. Returns null if this UART.js build has no eval, in which
   case the caller simply skips the check rather than failing. */
function ueval(conn, expr) {
  return new Promise(function (res) {
    try {
      if (!conn || !conn.eval) return res(null);
      var r = conn.eval(expr, function (v) { res(v); });
      if (r && r.then) r.then(res, function () { res(null); });
    } catch (e) { res(null); }
  });
}
function uwrite(conn, data) {
  if (data && data[0] !== "\x10" && data.indexOf("\n") >= 0) data = "\x10" + data; // echo-off: don't echo the line back (halves traffic)
  return new Promise(function (res, rej) {
    try { var r = conn.write(data, function () { res(); }); if (r && r.then) r.then(res, rej); }
    catch (e) { rej(e); }
  });
}

async function transferToWatch(payload, appSource, opts) {
  opts = opts || {};
  await ensureUART();
  var conn = await uartConnect();          // opens the browser's Bluetooth chooser
  // 1 char == 1 byte on the watch: escape any non-ASCII so offsets/lengths
  // can never disagree (accented names, emoji in med names were the culprit).
  function toAscii(s){ return s.replace(/[\u0080-\uFFFF]/g,
    function(c){ return "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4); }); }
  // Accumulate the whole file in RAM on the watch, then write ONCE. No byte
  // offsets, so there is no way to leave erased-flash gaps mid-file.
  async function writeFile(name, data) {
    /* Straight into flash, chunk by chunk, instead of building the whole file as
       one string in the watch's RAM first. Bangle.js 2 has on the order of 12k JS
       variable blocks and `_W += chunk` reallocates on every append, so the old
       way peaked at roughly twice the file size in RAM. Once the watch app passed
       ~50KB that ran out, the file landed TRUNCATED, and a truncated app is a
       syntax error at load \u2014 which is a boot loop, not an error message.
       Storage.write(name, data, offset, size) allocates on the first call and
       appends after that, so nothing large is ever held in memory. */
    data = toAscii(data);
    var total = data.length, nm = JSON.stringify(name);
    /* Erase FIRST. Not because write leaves duplicates \u2014 it does overwrite \u2014 but
       because flash cannot be rewritten in place: repeatedly writing the same
       filename raises "File already written with different data" (Espruino
       #1539) or exhausts pages with "Unable to find or create file" (#1707), and
       once that happens the whole filesystem needs an eraseAll to recover. A
       failed write leaves the PREVIOUS file intact, which is what makes a sync
       look like it worked while the watch keeps reading the old schedule. */
    await uwrite(conn, "try{require('Storage').erase(" + nm + ");}catch(e){}\n");
    /* Straight into flash, chunk by chunk. The previous version built the whole
       file in a watch-side variable first \u2014 `var _W=''` then `_W+=chunk` a
       hundred times \u2014 and every one of those appends reallocates, so the peak
       cost was roughly twice the file size in RAM on a device with very little.
       When it ran out, the write landed SHORT and said nothing: a truncated app
       is "Got EOF expected '}'" the next time the launcher hands control back,
       which is the error rather than a message.
       Storage.write(name,data,offset,size) allocates on the first call and fills
       in at an offset after that, so nothing bigger than one chunk is ever held
       in memory. The escaping above makes one character exactly one byte, which
       is what makes the offsets safe \u2014 that was the old flaw with this
       approach and it is fixed at the source now. */
    var CH = 512;
    for (var off = 0; off < total; off += CH) {
      await uwrite(conn, "require('Storage').write(" + nm + "," +
        JSON.stringify(data.substr(off, CH)) + "," + off +
        (off === 0 ? ("," + total) : "") + ");\n");
    }
    /* Read the length back. A sync that half-worked must not be allowed to look
       like one that worked. */
    var got = await ueval(conn, "(require('Storage').read(" + nm + ")||'').length");
    if (got !== null && got !== undefined && got !== total) {
      try { await uwrite(conn, "try{require('Storage').erase(" + nm + ");}catch(e){}\n"); } catch (e) {}
      throw new Error(name + " landed " + got + " of " + total + " bytes \u2014 the transfer was cut short, "
        + "so it was removed rather than left half-written. The watch still has its previous copy. "
        + "Try again; if it keeps happening the watch is low on storage.");
    }
  }
  try {
    // sync the watch's clock to THIS computer. Set the RTC to LOCAL time with
    // timezone 0 so getHours() reads local directly (no UTC/tz conversion to
    // get wrong); epochMs below is baked in the same local frame.
    var _localSec = Math.round((Date.now() - new Date().getTimezoneOffset()*60000) / 1000);
    await uwrite(conn, "try{E.setTimeZone(0);}catch(e){}setTime(" + _localSec + ");\n");
    /* ONLY this app's files. eraseAll() wipes every app on the watch \u2014 launcher,
       settings, every other clock face \u2014 which leaves it booting into nothing and
       needing the Bangle app loader to recover. There is never a reason for a
       schedule sync to touch anything outside its own three files. */
    if (opts.wipeFirst) await uwrite(conn,
      "['pkpower.json','pkpower.app.js','pkpower.info'].forEach(function(f){try{require('Storage').erase(f);}catch(e){}});\n");
    await writeFile("pkpower.json", JSON.stringify(payload));
    await writeFile("pkpower.app.js", appSource);
    // register as a CLOCK so it can be the boot face
    await writeFile("pkpower.info", JSON.stringify({
      id:"pkpower", name:"Palace of Power", src:"pkpower.app.js", type:"clock" }));
    if (opts.asDefaultClock !== false) {
      await uwrite(conn,
        "var s=require('Storage').readJSON('setting.json',1)||{};" +
        "s.clock='pkpower.app.js';s.timezone=0;require('Storage').writeJSON('setting.json',s);\n");
    }
    await uwrite(conn, "E.showMessage('loading\\nPalace of Power');setTimeout(function(){load('pkpower.app.js');}, 400);\n"); // deferred so writes flush first
    await new Promise(function (r) { setTimeout(r, 600); }); // let the writes flush + launch
  } finally {
    // Reset UART.js's OWN connection reference. The watch's load() drops BLE;
    // without this, the library reuses a dead connection and never re-prompts
    // (the "look at the watch, no Bluetooth window" bug — was cookie-clearing).
    try { UART.close(); } catch (e) {}
  }
  return true;
}


function drawChart(cv,data){const ctx=cv.getContext("2d");const dpr=window.devicePixelRatio||1;const rect=cv.getBoundingClientRect();cv.width=rect.width*dpr;cv.height=rect.height*dpr;ctx.scale(dpr,dpr);const W=rect.width,H=rect.height,cW=W-PD.left-PD.right,cH=H-PD.top-PD.bottom;ctx.clearRect(0,0,W,H);
const{e2,p4,tData,injs,pbs,xM,eM,pM,tM,sE,sP,sT,sERef,sPRef,ref,refFLH,ovulationDay,cycleAnchor,calMode,cycleLen,refCycleLen,ambientProfile:ap,fshData,lhData,refProfile}=data;
// Piecewise-linear remap of reference curves. Two halves of the cycle
// (pre-ov / post-ov) stretch independently so the user's ovulation day
// always lines up with the canonical ovulation midpoint, regardless of
// cycle length. If `refCycleLen` is set (custom reference length),
// `refOvDay` scales the ovulation day proportionally to that length so
// the reference shape fills the custom length naturally.
const ovDay=ovulationDay||defaultOvulationDay(cycleLen);
const refCl=(refCycleLen||cycleLen)||CANONICAL_CYCLE;
const refOvDay=refCycleLen?Math.max(2,Math.min(Math.round(refCl)-1,Math.round(ovDay*refCl/(cycleLen||CANONICAL_CYCLE)))):ovDay;
// Scale the anchor proportionally if the reference cycle length differs.
const refAnchor=refCycleLen?Math.round((cycleAnchor||0)*refCl/(cycleLen||CANONICAL_CYCLE)):(cycleAnchor||0);
const sampleRef=(arr,t)=>refI(arr,refTimeForCycleDay(t,refCl,refOvDay,refAnchor));
const xS=v=>PD.left+(v/xM)*cW,yE=v=>PD.top+cH-(v/eM)*cH,yP=v=>PD.top+cH-(v/pM)*cH;
// Select reference data based on refProfile (separate from ambient profile)
const rp=refProfile||"female";
const rME=rp==="male"?ME_M:ME,rMP=rp==="male"?MP_M:MP,rMF=rp==="male"?MF_M:MF,rMLH=rp==="male"?MLH_M:MLH;
// Grid
ctx.strokeStyle="rgba(148,163,184,.1)";ctx.lineWidth=1;for(let i=0;i<=5;i++){const y=PD.top+cH*(i/5);ctx.beginPath();ctx.moveTo(PD.left,y);ctx.lineTo(W-PD.right,y);ctx.stroke();}// FLEX TAIL — a fractional cycle length can't land on midnight every month, so
// the last partial day is the part that gets sacrificed or added to keep the next
// cycle starting cleanly. Mark where the last whole day ends; everything right of
// the dashed line is the stretch that isn't there every cycle.
const flexCl=cycleLen||CANONICAL_CYCLE;
if(flexCl>0&&Math.abs(flexCl-Math.round(flexCl))>1e-6){
  const whole=Math.floor(flexCl);
  ctx.save();
  for(let k=0;k*flexCl<xM;k++){
    const a=k*flexCl+whole,b=Math.min((k+1)*flexCl,xM);
    if(a>=xM)break;
    ctx.fillStyle="rgba(148,163,184,.07)";
    ctx.fillRect(xS(a),PD.top,xS(b)-xS(a),cH);
    ctx.strokeStyle="rgba(148,163,184,.4)";ctx.lineWidth=1;ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.moveTo(xS(a),PD.top);ctx.lineTo(xS(a),PD.top+cH);ctx.stroke();
    ctx.setLineDash([]);
    if(k===0&&xS(b)-xS(a)>26){
      ctx.fillStyle="rgba(148,163,184,.7)";ctx.font="8px sans-serif";ctx.textAlign="center";
      ctx.fillText("flex",(xS(a)+xS(b))/2,PD.top+cH-4);
    }
  }
  ctx.restore();
}
const xT=Math.min(Math.ceil(xM/5),15);for(let i=0;i<=xT;i++){const x=xS((xM/xT)*i);ctx.beginPath();ctx.moveTo(x,PD.top);ctx.lineTo(x,PD.top+cH);ctx.stroke();}
// Ambient filled areas — AMAB: T ocean, AFAB: E2 pink + P4 purple fills
if(sT&&ap==="amab"&&tData&&tData.length>1){
  renderSeries(ctx,{data:tData,color:"rgba(56,189,248,.3)",style:"filled"},xS,v=>PD.top+cH-(v/eM)*cH,cW,cH,calMode);}
if(sT&&ap==="afab"&&e2&&e2.length>1){
  renderSeries(ctx,{data:e2,color:"rgba(244,114,182,.2)",style:"filled"},xS,yE,cW,cH,calMode);}
if(sT&&ap==="afab"&&p4&&p4.length>1){
  renderSeries(ctx,{data:p4,color:"rgba(168,85,247,.15)",style:"filled"},xS,yP,cW,cH,calMode);}
// Reference curves (static, dashed in modeler, colored in calendar)
if(ref){const rm=ref===true?1:ref;const cm=!!calMode;
  const refPts=[];for(let t=0;t<=xM;t+=.1)refPts.push(t);
  if(rp==="male"){
    // Male ref: just testosterone ~600 ng/dL as a single dashed line on the left axis (scaled to eM)
    const tRefMax=800;const yTR=v=>PD.top+cH-(v/tRefMax)*cH;
    const d=refPts.map(t=>({t,v:600*rm}));
    renderSeries(ctx,{data:d,color:cm?"#38bdf8":"rgba(56,189,248,.35)",style:"dashed",label:cm?"Testosterone (~600 ng/dL)":null},xS,yTR,cW,cH,cm);
  }else{
    // Female ref: E2/P4 curves + FSH/LH
    const skipE2P4Ref=ap==="afab"&&!cm&&sT;
    if(!skipE2P4Ref){
      // E2 reference: in calendar mode always show, in modeler mode gated by
      // sERef (the dedicated reference toggle) — independent of sE which
      // controls the user's live curve. Defaults to true so existing
      // behavior is preserved on first load.
      if((sERef!==false)||cm){const d=refPts.map(t=>({t,v:sampleRef(rME,t)*rm}));
        renderSeries(ctx,{data:d,color:cm?"#d946a8":"rgba(203,213,225,.35)",style:"dashed",label:cm?"Estradiol":null},xS,yE,cW,cH,cm);}
      if((sPRef!==false)||cm){const d=refPts.map(t=>({t,v:sampleRef(rMP,t)*rm}));
        renderSeries(ctx,{data:d,color:cm?"#9f1d6f":"rgba(168,162,215,.35)",style:"dashed",label:cm?"Progesterone":null},xS,yP,cW,cH,cm);}}
    if(refFLH){const flhMax=60*rm;const yFLH=v=>PD.top+cH-(v/flhMax)*cH;
      if(fshData&&fshData.length>1){
        renderSeries(ctx,{data:fshData.map(p=>({t:p.t,v:p.v*rm})),color:"rgba(129,140,248,.4)",style:"dashed"},xS,yFLH,cW,cH,cm);
        renderSeries(ctx,{data:lhData.map(p=>({t:p.t,v:p.v*rm})),color:"rgba(165,136,235,.4)",style:"dashed"},xS,yFLH,cW,cH,cm);
      }else{
        const fshD=refPts.map(t=>({t,v:sampleRef(rMF,t)*rm}));
        const lhD=refPts.map(t=>({t,v:sampleRef(rMLH,t)*rm}));
        renderSeries(ctx,{data:fshD,color:cm?"#e8a0c8":"rgba(129,140,248,.3)",style:"dashed",label:cm?"FSH":null},xS,yFLH,cW,cH,cm);
        renderSeries(ctx,{data:lhD,color:cm?"#c26498":"rgba(165,136,235,.3)",style:"dashed",label:cm?"LH":null},xS,yFLH,cW,cH,cm);
      }}
  }}
// Injection markers
if(injs&&sE)for(const i of injs){const px=Math.round(xS(i.day));if(px>=PD.left&&px<=W-PD.right){ctx.fillStyle="rgba(251,113,133,.6)";ctx.beginPath();ctx.moveTo(px,PD.top+cH-5);ctx.lineTo(px-3,PD.top+cH);ctx.lineTo(px+3,PD.top+cH);ctx.closePath();ctx.fill();}}
// E2 line (solid)
if(sE&&e2&&e2.length>1)renderSeries(ctx,{data:e2,color:"#f472b6",style:"solid"},xS,yE,cW,cH,calMode);
// P4 line (solid)
if(sP&&p4&&p4.length>1)renderSeries(ctx,{data:p4,color:"#a855f7",style:"solid"},xS,yP,cW,cH,calMode);
// Custom medication series
if(data.customData){for(let ci2=0;ci2<data.customData.length;ci2++){const cs=data.customData[ci2];if(!cs.data||cs.data.length<2)continue;
  const csMax=cs.max*1.15||10;const yCS=v=>PD.top+cH-(v/csMax)*cH;
  renderSeries(ctx,{data:cs.data,color:cs.color||"#22d3ee",style:"solid",label:`${cs.name} (${cs.unit})`,showLabel:true},xS,yCS,cW,cH,calMode);
  // Scale ticks
  const tickX=W-PD.right+(ci2+1)*30;if(tickX<W-4){ctx.font="8px sans-serif";ctx.fillStyle=cs.color||"#22d3ee";ctx.textAlign="left";for(let i=0;i<=3;i++){const v=Math.round((csMax/3)*i*10)/10;ctx.fillText(v,tickX,yCS((csMax/3)*i)+3);}}
}}
// Axes
ctx.strokeStyle="rgba(148,163,184,.35)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(PD.left,PD.top);ctx.lineTo(PD.left,PD.top+cH);ctx.lineTo(W-PD.right,PD.top+cH);if(sP){ctx.moveTo(W-PD.right,PD.top);ctx.lineTo(W-PD.right,PD.top+cH);}ctx.stroke();
ctx.fillStyle="rgba(203,213,225,.6)";ctx.font="10px sans-serif";ctx.textAlign="center";for(let i=0;i<=xT;i++){const v=Math.round((xM/xT)*i);ctx.fillText(v,xS(v),PD.top+cH+24);}
if(sE){ctx.textAlign="right";ctx.fillStyle="#f472b6";for(let i=0;i<=5;i++)ctx.fillText(Math.round((eM/5)*i),PD.left-5,yE((eM/5)*i)+3);ctx.save();ctx.translate(9,PD.top+cH/2);ctx.rotate(-Math.PI/2);ctx.font="9px sans-serif";ctx.textAlign="center";ctx.fillText("E2 pg/mL",0,0);ctx.restore();}
if(sT){ctx.save();ctx.translate(9,PD.top+cH/2+40);ctx.rotate(-Math.PI/2);ctx.font="8px sans-serif";ctx.fillStyle="rgba(56,189,248,.5)";ctx.textAlign="center";ctx.fillText("T ng/dL",0,0);ctx.restore();}
if(sP){ctx.textAlign="left";ctx.fillStyle="#a855f7";for(let i=0;i<=5;i++)ctx.fillText(Math.round((pM/5)*i*10)/10,W-PD.right+5,yP((pM/5)*i)+3);ctx.save();ctx.translate(W-6,PD.top+cH/2);ctx.rotate(Math.PI/2);ctx.font="9px sans-serif";ctx.textAlign="center";ctx.fillText("P4 ng/mL",0,0);ctx.restore();}
ctx.fillStyle="rgba(203,213,225,.4)";ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillText("Days",PD.left+cW/2,H-5);}

function drawHov(ov,mx,e2D,p4D,xM,eM,pM,sE,sP){const ctx=ov.getContext("2d");const dpr=window.devicePixelRatio||1;const r=ov.getBoundingClientRect();ov.width=r.width*dpr;ov.height=r.height*dpr;ctx.scale(dpr,dpr);const W=r.width,H=r.height,cW=W-PD.left-PD.right,cH=H-PD.top-PD.bottom;ctx.clearRect(0,0,W,H);const day=((mx-PD.left)/cW)*xM;if(day<0||day>xM)return;const cx=PD.left+(day/xM)*cW;ctx.strokeStyle="rgba(203,213,225,.2)";ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(cx,PD.top);ctx.lineTo(cx,PD.top+cH);ctx.stroke();ctx.setLineDash([]);let ev=0,pv=0;if(sE&&e2D){let cl=e2D[0],mn=1e9;for(const p of e2D){const d=Math.abs(p.t-day);if(d<mn){mn=d;cl=p;}}ev=cl.v;}if(sP&&p4D){let cl=p4D[0],mn=1e9;for(const p of p4D){const d=Math.abs(p.t-day);if(d<mn){mn=d;cl=p;}}pv=cl.v;}const ls=[`Day ${day.toFixed(1)}`];if(sE)ls.push(`E2: ${ev.toFixed(1)}`);if(sP)ls.push(`P4: ${pv.toFixed(1)}`);ctx.font="10px monospace";const tw=Math.max(...ls.map(l=>ctx.measureText(l).width))+12;const th=ls.length*14+8;let tx=cx+10,ty=PD.top+6;if(tx+tw>W-PD.right)tx=cx-tw-10;ctx.fillStyle="rgba(15,20,30,.92)";ctx.strokeStyle="rgba(244,114,182,.2)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(tx,ty,tw,th,4);ctx.fill();ctx.stroke();ctx.textAlign="left";let ly=ty+12;ctx.fillStyle="#94a3b8";ctx.font="9px monospace";ctx.fillText(ls[0],tx+6,ly);ly+=14;if(sE){ctx.fillStyle="#f472b6";ctx.font="bold 10px monospace";ctx.fillText(ls[1],tx+6,ly);ly+=14;}if(sP){ctx.fillStyle="#a855f7";ctx.font="bold 10px monospace";ctx.fillText(ls[ls.length-1],tx+6,ly);}}

/* ═══ FREEFORM EDITOR ═══ */
function FE({points:pts,onChange:oc,color:clr,yMax:yMx,xMax:xMx}){const cr=useRef(null);const[dr,sDr]=useState(-1);const[hv,sHv]=useState(-1);const[sel,sSl]=useState(-1);const EP={top:10,right:10,bottom:22,left:36};const mT=xMx>0?xMx:Math.max(25,...pts.map(p=>p.t))+3;const mV=yMx>0?yMx:Math.max(50,...pts.map(p=>p.v))*1.15;
const cl=clr||"#fb7185";const cla=clr?clr.replace(")",",0.5)").replace("rgb","rgba"):clr==="#a855f7"?"rgba(168,85,247,.5)":"rgba(251,113,133,.5)";const cla6=clr?clr.replace(")",",0.6)").replace("rgb","rgba"):clr==="#a855f7"?"rgba(168,85,247,.6)":"rgba(251,113,133,.6)";const clb=clr?clr.replace(")",",0.15)").replace("rgb","rgba"):clr==="#a855f7"?"rgba(168,85,247,.15)":"rgba(251,113,133,.15)";const clb3=clr?clr.replace(")",",0.3)").replace("rgb","rgba"):clr==="#a855f7"?"rgba(168,85,247,.3)":"rgba(251,113,133,.3)";
const draw=useCallback(()=>{const c=cr.current;if(!c)return;const ctx=c.getContext("2d");const dpr=window.devicePixelRatio||1;const r=c.getBoundingClientRect();c.width=r.width*dpr;c.height=r.height*dpr;ctx.scale(dpr,dpr);const W=r.width,H=r.height,cW=W-EP.left-EP.right,cH=H-EP.top-EP.bottom;ctx.clearRect(0,0,W,H);const xS=t=>EP.left+(t/mT)*cW,yS=v=>EP.top+cH-(v/mV)*cH;ctx.strokeStyle=cla;ctx.lineWidth=2;ctx.lineJoin="round";ctx.beginPath();for(let t=0;t<=mT;t+=.1){const x=xS(t),y=yS(Math.max(0,evC(pts,t)));t===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();for(let i=0;i<pts.length;i++){const x=xS(pts[i].t),y=yS(pts[i].v),iS=i===sel,isH=i===hv||i===dr||iS;ctx.fillStyle=iS?"#fff":isH?cl:cla6;ctx.shadowColor=iS?"#fff":cl;ctx.shadowBlur=isH?8:3;ctx.beginPath();ctx.arc(x,y,isH?5:3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(iS){ctx.strokeStyle=cl;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.stroke();}if(isH){ctx.fillStyle=iS?"#fff":cl;ctx.font="8px monospace";ctx.textAlign="center";ctx.fillText(`${pts[i].t.toFixed(1)}d ${Math.round(pts[i].v)}`,x,y-8);}}ctx.strokeStyle="rgba(148,163,184,.2)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(EP.left,EP.top);ctx.lineTo(EP.left,EP.top+cH);ctx.lineTo(W-EP.right,EP.top+cH);ctx.stroke();ctx.fillStyle="rgba(203,213,225,.4)";ctx.font="8px sans-serif";ctx.textAlign="right";for(let i=0;i<=4;i++)ctx.fillText(Math.round((mV/4)*i),EP.left-4,yS((mV/4)*i)+3);ctx.textAlign="center";const xt=Math.min(Math.ceil(mT/3),8);for(let i=0;i<=xt;i++)ctx.fillText(Math.round((mT/xt)*i),xS((mT/xt)*i),EP.top+cH+12);},[pts,mT,mV,hv,dr,sel,cl,cla,cla6,yMx,xMx]);
useEffect(()=>{draw();},[draw]);const gc=e=>{const r=cr.current.getBoundingClientRect();const cW=r.width-EP.left-EP.right,cH=r.height-EP.top-EP.bottom;return{t:Math.max(0,((e.clientX-r.left-EP.left)/cW)*mT),v:Math.max(0,((EP.top+cH-(e.clientY-r.top))/cH)*mV)};};const fn=e=>{const r=cr.current.getBoundingClientRect();const mx=e.clientX-r.left,my=e.clientY-r.top,cW=r.width-EP.left-EP.right,cH=r.height-EP.top-EP.bottom;let b=-1,bd=18;for(let i=0;i<pts.length;i++){const px=EP.left+(pts[i].t/mT)*cW,py=EP.top+cH-(pts[i].v/mV)*cH;const d=Math.sqrt((mx-px)**2+(my-py)**2);if(d<bd){bd=d;b=i;}}return b;};const sp=sel>=0&&sel<pts.length?pts[sel]:null;
return<div><canvas ref={cr} style={{width:"100%",height:140,display:"block",cursor:dr>=0?"grabbing":hv>=0?"grab":"crosshair",borderRadius:6,border:"1px solid rgba(148,163,184,.08)"}} onMouseDown={e=>{const i=fn(e);if(i>=0){sDr(i);sSl(i);}else{const{t,v}=gc(e);oc([...pts,{t:Math.round(t*4)/4,v:Math.round(v)}].sort((a,b)=>a.t-b.t));sSl(-1);}}} onMouseMove={e=>{if(dr>=0){const{t,v}=gc(e);const u=[...pts];u[dr]={t:dr===0?0:Math.max(0,Math.round(t*4)/4),v:Math.max(0,Math.round(v))};oc(u.sort((a,b)=>a.t-b.t));}else sHv(fn(e));}} onMouseUp={()=>sDr(-1)} onMouseLeave={()=>{sDr(-1);sHv(-1);}} onDoubleClick={e=>{const i=fn(e);if(i>0){oc(pts.filter((_,j)=>j!==i));sSl(-1);}}}/>
{sp?<div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}><span style={{fontSize:9,color:cl,fontWeight:600}}>Pt{sel+1} d{sp.t.toFixed(1)}</span><NI value={sp.v} onChange={v=>{const u=[...pts];u[sel]={...u[sel],v:Math.max(0,v)};oc(u);}} min={0} step={1} style={{background:"rgba(15,23,42,.8)",border:`1px solid ${clb3}`,borderRadius:3,padding:"2px 4px",color:cl,fontSize:10,fontWeight:600,width:45,outline:"none",textAlign:"center"}}/></div>:<div style={{fontSize:8,color:"#475569",marginTop:1}}>click · drag · dbl-click delete</div>}</div>;}

/* ═══ SUPPRESSION FREEFORM EDITOR — inverted Y axis ═══ */
function SFE({points:pts,onChange:oc,color:clr,scale:sc2,timeScale:ts2,axisMax:axM,upright:upr}){const cr=useRef(null);const[dr,sDr]=useState(-1);const[hv,sHv]=useState(-1);const[sel,sSl]=useState(-1);const EP={top:22,right:10,bottom:10,left:36};const tsc=ts2||1;const mT=axM>0?axM:Math.max(10,...pts.map(p=>p.t*tsc))+2;const scl=sc2||1;const mV=Math.max(1.05,1.05*scl);
const cl=clr||"#f87171";const cla=clr?clr.replace(")",",0.5)").replace("rgb","rgba"):"rgba(248,113,113,.5)";const cla6=clr?clr.replace(")",",0.6)").replace("rgb","rgba"):"rgba(248,113,113,.6)";const clb3=clr?clr.replace(")",",0.3)").replace("rgb","rgba"):"rgba(248,113,113,.3)";
const draw=useCallback(()=>{const c=cr.current;if(!c)return;const ctx=c.getContext("2d");const dpr=window.devicePixelRatio||1;const r=c.getBoundingClientRect();c.width=r.width*dpr;c.height=r.height*dpr;ctx.scale(dpr,dpr);const W=r.width,H=r.height,cW=W-EP.left-EP.right,cH=H-EP.top-EP.bottom;ctx.clearRect(0,0,W,H);
// Flipped: Y=0 at top, Y=1 at bottom. X axis at top.
const xS=t=>EP.left+(t/mT)*cW,yS=upr?(v=>EP.top+cH-(v/mV)*cH):(v=>EP.top+(v/mV)*cH);
// Fill the suppression area
if(!upr){ctx.fillStyle=clr?clr.replace(")",",0.08)").replace("rgb","rgba"):"rgba(248,113,113,.08)";
ctx.beginPath();ctx.moveTo(xS(0),EP.top);
for(let t=0;t<=mT;t+=.1){const v=Math.max(0,Math.min(mV,evC(pts,t/tsc)*scl));ctx.lineTo(xS(t),yS(v));}
ctx.lineTo(xS(mT),EP.top);ctx.closePath();ctx.fill();}
// Draw the curve
ctx.strokeStyle=cla;ctx.lineWidth=2;ctx.lineJoin="round";ctx.beginPath();
for(let t=0;t<=mT;t+=.1){const x=xS(t),y=yS(Math.max(0,Math.min(mV,evC(pts,t/tsc)*scl)));t===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
ctx.stroke();
// Draw points — position at scaled values to match the curve
for(let i=0;i<pts.length;i++){const x=xS(pts[i].t*tsc),y=yS(pts[i].v*scl),iS=i===sel,isH=i===hv||i===dr||iS;ctx.fillStyle=iS?"#fff":isH?cl:cla6;ctx.shadowColor=iS?"#fff":cl;ctx.shadowBlur=isH?8:3;ctx.beginPath();ctx.arc(x,y,isH?5:3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;if(iS){ctx.strokeStyle=cl;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.stroke();}if(isH){ctx.fillStyle=iS?"#fff":cl;ctx.font="8px monospace";ctx.textAlign="center";ctx.fillText(`${(pts[i].t*tsc).toFixed(1)}d ${Math.round(pts[i].v*scl*100)}%`,x,y+12);}}
// Axes — X at top, Y on left pointing down
ctx.strokeStyle="rgba(148,163,184,.2)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(EP.left,EP.top);ctx.lineTo(W-EP.right,EP.top);ctx.moveTo(EP.left,EP.top);ctx.lineTo(EP.left,EP.top+cH);ctx.stroke();
ctx.fillStyle="rgba(203,213,225,.4)";ctx.font="8px sans-serif";
// Y labels (left, going down)
ctx.textAlign="right";const maxPct=Math.ceil(scl*100/25)*25;const yStep=maxPct<=100?25:maxPct<=200?50:100;for(let pct=0;pct<=maxPct;pct+=yStep){const v=pct/100;if(v<=mV)ctx.fillText(`${pct}%`,EP.left-4,yS(v)+3);}
// X labels (top)
ctx.textAlign="center";const xt=Math.min(Math.ceil(mT/3),8);for(let i=0;i<=xt;i++)ctx.fillText(Math.round((mT/xt)*i),xS((mT/xt)*i),EP.top-5);},[pts,mT,mV,hv,dr,sel,cl,cla,cla6,scl,tsc,upr]);
useEffect(()=>{draw();},[draw]);
const gc=e=>{const r=cr.current.getBoundingClientRect();const cW=r.width-EP.left-EP.right,cH=r.height-EP.top-EP.bottom;const rawV=upr?((1-(e.clientY-r.top-EP.top)/cH)*mV):(((e.clientY-r.top-EP.top)/cH)*mV);return{t:Math.max(0,((e.clientX-r.left-EP.left)/cW)*mT/tsc),v:Math.max(0,Math.min(1,rawV/scl))};};
const fn=e=>{const r=cr.current.getBoundingClientRect();const mx=e.clientX-r.left,my=e.clientY-r.top,cW=r.width-EP.left-EP.right,cH=r.height-EP.top-EP.bottom;let b=-1,bd=18;for(let i=0;i<pts.length;i++){const px=EP.left+(pts[i].t*tsc/mT)*cW,py=upr?(EP.top+cH-(pts[i].v*scl/mV)*cH):(EP.top+(pts[i].v*scl/mV)*cH);const d=Math.sqrt((mx-px)**2+(my-py)**2);if(d<bd){bd=d;b=i;}}return b;};
const sp=sel>=0&&sel<pts.length?pts[sel]:null;
return<div><canvas ref={cr} style={{width:"100%",height:120,display:"block",cursor:dr>=0?"grabbing":hv>=0?"grab":"crosshair",borderRadius:6,border:"1px solid rgba(148,163,184,.08)"}} onMouseDown={e=>{const i=fn(e);if(i>=0){sDr(i);sSl(i);}else{const{t,v}=gc(e);oc([...pts,{t:Math.round(t*4)/4,v:Math.round(v*20)/20}].sort((a,b)=>a.t-b.t));sSl(-1);}}} onMouseMove={e=>{if(dr>=0){const{t,v}=gc(e);const u=[...pts];u[dr]={t:dr===0?0:Math.max(0,Math.round(t*4)/4),v:Math.max(0,Math.min(1,Math.round(v*20)/20))};oc(u.sort((a,b)=>a.t-b.t));}else sHv(fn(e));}} onMouseUp={()=>sDr(-1)} onMouseLeave={()=>{sDr(-1);sHv(-1);}} onDoubleClick={e=>{const i=fn(e);if(i>0){oc(pts.filter((_,j)=>j!==i));sSl(-1);}}}/>
{sp?<div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}><span style={{fontSize:9,color:cl,fontWeight:600}}>Pt{sel+1} d{sp.t.toFixed(1)}</span><NI value={Math.round(sp.v*100)} onChange={v=>{const u=[...pts];u[sel]={...u[sel],v:Math.max(0,Math.min(1,v/100))};oc(u);}} min={0} max={100} step={5} style={{background:"rgba(15,23,42,.8)",border:`1px solid ${clb3}`,borderRadius:3,padding:"2px 4px",color:cl,fontSize:10,fontWeight:600,width:40,outline:"none",textAlign:"center"}}/><span style={{fontSize:8,color:cl}}>%</span></div>:<div style={{fontSize:8,color:"#475569",marginTop:1}}>click · drag · dbl-click delete · Y = suppression strength</div>}</div>;}

/* ═══ PK EDITOR ═══ */
function PE({pk,onChange:oc}){const sl={flex:1,accentColor:"#f472b6",height:3};const lb={fontSize:8,color:"#64748b",minWidth:62};const vl={fontSize:9,color:"#fb7185",minWidth:32,textAlign:"right"};const rw={display:"flex",alignItems:"center",gap:4,marginBottom:2};return<div style={{marginTop:2}}><div style={rw}><span style={lb}>Peak pg/mL</span><input type="range" min="5" max="500" step="1" value={pk.peak} onChange={e=>oc({...pk,peak:+e.target.value})} style={sl}/><span style={vl}>{pk.peak}</span></div><div style={rw}><span style={lb}>Time to peak</span><input type="range" min=".5" max="8" step=".25" value={pk.tPeak} onChange={e=>oc({...pk,tPeak:+e.target.value})} style={sl}/><span style={vl}>{pk.tPeak}d</span></div><div style={rw}><span style={lb}>Decay half</span><input type="range" min=".5" max="10" step=".25" value={pk.decayHalf} onChange={e=>oc({...pk,decayHalf:+e.target.value})} style={sl}/><span style={vl}>{pk.decayHalf}d</span></div><div style={rw}><span style={lb}>Rise sharp</span><input type="range" min=".5" max="5" step=".1" value={pk.riseSharp} onChange={e=>oc({...pk,riseSharp:+e.target.value})} style={sl}/><span style={vl}>{pk.riseSharp}</span></div></div>;}

/* ═══ P4 CURVE EDITOR ═══ */
function P4E({pk,onChange:oc}){const sl={flex:1,accentColor:"#a855f7",height:3};const lb={fontSize:8,color:"#64748b",minWidth:72};const vl={fontSize:9,color:"#a855f7",minWidth:36,textAlign:"right"};const rw={display:"flex",alignItems:"center",gap:4,marginBottom:2};return<div><div style={rw}><span style={lb}>Peak ng/mL/100mg</span><input type="range" min="5" max="40" step="1" value={pk.peak} onChange={e=>oc({...pk,peak:+e.target.value})} style={sl}/><span style={vl}>{pk.peak}</span></div><div style={rw}><span style={lb}>Decay rate</span><input type="range" min=".03" max=".2" step=".005" value={pk.decayH} onChange={e=>oc({...pk,decayH:+e.target.value})} style={sl}/><span style={vl}>{pk.decayH}</span></div></div>;}

/* Time select — supports AM/PM shortcuts and half-hour precision */
function timeOffset(t){if(!t||t==="am")return 0;if(t==="pm")return 0.5;const[h,m]=(t||"0:00").split(":").map(Number);return((h||0)+(m||0)/60)/24;}
/* Calendar and day-view labels. A stored "14:30" reads as 2:30 pm — the raw
   24-hour value never reaches the screen. */
/* A single dose's position on the cycle timeline.

   Dose day numbers are entered against the calendar, where the app labels days
   1-based: the day it calls "Day 23" is position 22. The checklist has always
   matched them that way (getMeds compares against cycleDay+1) but the graph, the
   events list and the reminders read the stored number as a raw position — so a
   dose entered as day 23 was drawn and announced a day late, and today's events
   showed yesterday's dose. Everything now goes through here.

   Patch PIECES are unaffected: their day is already a position, generated by the
   fitter rather than typed against the calendar, which is why the body diagram
   and the events list always agreed about patches. */
function dosePos(day,time){return(parseFloat(day)||0)-1+timeOffset(time||"am");}
function timeLabel(t){
  if(!t||t==="am")return"AM";
  if(t==="pm")return"PM";
  const m=/^(\d{1,2}):(\d{2})$/.exec(t);
  if(!m)return t;
  const h=parseInt(m[1],10),ap=h<12?"am":"pm",h12=h%12===0?12:h%12;
  return h12+":"+m[2]+" "+ap;
}
const TIMES=["am","pm","──","00:00","00:30","01:00","01:30","02:00","02:30","03:00","03:30","04:00","04:30","05:00","05:30","06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30"];
/* Doses are stored as "HH:MM" but nobody reads 14:30 as an afternoon. Displayed
   in 12-hour clock, identically to the patch active-hours pickers. Stored values
   are untouched, so old schedules just start reading better on refresh. */
function timeLabel12(v){
  if(!v||v==="am"||v==="pm"||v==="\u2500\u2500")return v||"am";
  const m=/^(\d{1,2}):(\d{2})$/.exec(v);
  if(!m)return v;
  const h=parseInt(m[1],10),mm=m[2];
  const ap=h<12?"am":"pm",h12=h%12===0?12:h%12;
  return h12+":"+mm+" "+ap;
}
function TimeSel({value,onChange,style:s}){return<select value={value||"am"} onChange={e=>{if(e.target.value!=="\u2500\u2500")onChange(e.target.value);}} style={{background:"rgba(15,23,42,.6)",border:"1px solid rgba(148,163,184,.15)",borderRadius:3,padding:"1px 2px",color:value==="pm"||value==="am"?"#fda4af":"#94a3b8",fontSize:8,cursor:"pointer",fontWeight:600,minWidth:52,outline:"none",...s}}>{TIMES.map(t=><option key={t} value={t}>{timeLabel12(t)}</option>)}</select>;}

/* Local date key — avoids UTC timezone shift issues with toISOString */
function localDateKey(d){const dt=d||new Date();return`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;}


/* Merge imported calendar data into existing calD — used by both JSON and share string import */
function mergeCalendarData(existing,incoming){
  const u={...existing};
  if(incoming.medChecks)u.medChecks={...(u.medChecks||{}),...incoming.medChecks};
  if(incoming.events)u.events=[...(u.events||[]),...(incoming.events||[])];
  if(incoming.patchOverrides)u.patchOverrides={...(u.patchOverrides||{}),...incoming.patchOverrides};
  if(incoming.patchStorage)u.patchStorageInv=[...(u.patchStorageInv||[]),...(incoming.patchStorageInv||[])];
  if(incoming.patchStorageInv)u.patchStorageInv=[...(u.patchStorageInv||[]),...incoming.patchStorageInv];
  if(incoming.patchReplacements)u.patchReplacements={...(u.patchReplacements||{}),...incoming.patchReplacements};
  if(incoming.dayNotes)u.dayNotes={...(u.dayNotes||{}),...incoming.dayNotes};
  return u;
}

/* ═══ PATCH PIECES ═══ */
/* A patch schedule is a list of pieces placed on a looping cycle. Each piece is
   {day, size, wear}: when it goes on, how big a cut it is, how long it stays on.
   The cycle repeats, so what is on the body at any moment is DERIVED from the
   list and the cycle day — there is no inventory to reconcile, no history to
   reconstruct, and nothing that can drift out of sync with the schedule.

   Arithmetic uses integer "cents" (value x 100) to avoid float issues. */

const PIECE_SIZES=[1,0.75,0.67,0.5,0.33,0.25];// valid cuts, largest first
const PIECE_CENTS=[100,75,67,50,33,25];// same in cents
const PIECE_LABELS={25:"¼",33:"⅓",50:"½",67:"⅔",75:"¾",100:"1"};

/* Build lookup: cents → display label, for all valid totals up to 10 */
const VALID_CENTS=new Set();
const CENTS_TO_LABEL={};
(()=>{
  const fracCents=[0,25,33,50,67,75];
  const fracLabels={0:"",25:"¼",33:"⅓",50:"½",67:"⅔",75:"¾"};
  for(let whole=0;whole<=10;whole++){
    for(const fc of fracCents){
      const c=whole*100+fc;if(c===0)continue;
      VALID_CENTS.add(c);
      CENTS_TO_LABEL[c]=whole>0?(fc>0?`${whole}${fracLabels[fc]}`:`${whole}`):fracLabels[fc];
    }
  }
})();

/* Convert decimal to cents, snapping to nearest valid value */
function toCents(v){
  const c=Math.round(v*100);
  if(VALID_CENTS.has(c))return c;
  if(c<=0)return 0;
  let best=0,bd=c;// 0 is always a candidate
  for(const vc of VALID_CENTS){const d=Math.abs(c-vc);if(d<bd){bd=d;best=vc;}}
  return best;
}
function fromCents(c){return c/100;}
function snapPatch(v){return fromCents(toCents(v));}

/* Is v one of the six valid single-piece sizes? */
function isValidPiece(v){return PIECE_CENTS.includes(toCents(v));}

/* Display a patch amount as a fraction string */
function patchFrac(v){const c=toCents(v);return CENTS_TO_LABEL[c]||snapPatch(v).toString();}
function patchFracTotal(v){return patchFrac(v);}

/* ═══ TWELFTHS ARITHMETIC ═══ */
/* Internal arithmetic uses twelfths to avoid the cents rounding issue
   (where ⅓+⅓ in cents = 33+33=66 ≠ 67). In twelfths, ⅓=4 and 4+4=8=⅔ exactly.
   Twelfths is internal only — never exposed to user as a piece size or dose. */
const PIECE_TWELFTHS=[3,4,6,8,9,12];// ¼,⅓,½,⅔,¾,1 in twelfths
const CENTS_TO_TWELFTHS={25:3,33:4,50:6,67:8,75:9,100:12};
const TWELFTHS_TO_CENTS={3:25,4:33,6:50,8:67,9:75,12:100};
function toTwelfths(cents){
  if(cents===0)return 0;
  if(CENTS_TO_TWELFTHS[cents]!==undefined)return CENTS_TO_TWELFTHS[cents];
  // For multi-piece totals (e.g. 200 = 2 wholes), break down:
  const wholes=Math.floor(cents/100);
  const frac=cents-wholes*100;
  if(CENTS_TO_TWELFTHS[frac]!==undefined||frac===0)return wholes*12+(CENTS_TO_TWELFTHS[frac]||0);
  // Snap fractional remainder
  let bestC=0,bd=Infinity;
  for(const c in CENTS_TO_TWELFTHS){const d=Math.abs(frac-(+c));if(d<bd){bd=d;bestC=+c;}}
  return wholes*12+CENTS_TO_TWELFTHS[bestC];
}
function fromTwelfths(t){
  // Convert twelfths back to cents, preserving canonical fractions
  const wholes=Math.floor(t/12);
  const frac=t-wholes*12;
  return wholes*100+(TWELFTHS_TO_CENTS[frac]||0);
}
function pieceTwelfthsToCents(t){return TWELFTHS_TO_CENTS[t]||0;}
function pieceTwelfthsToSize(t){return pieceTwelfthsToCents(t)/100;}

/* ═══ COMBO ENUMERATION ═══ */
/* Reference curve for a given hormone, honouring the male/female reference
   profile. Lets the fitter target whatever the medication actually delivers —
   a testosterone patch matches the T line, not estradiol. */
/* Active hours as a real clock window. b>a is an ordinary daytime span; b<=a
   wraps past midnight (9pm-2am). b=24 is midnight at the end of the day, which
   is what "7am - 12am" means. */
const HOUR_EPS=0.02;
function hourLabel(h){
  let hh=Math.floor(h),mm=Math.round((h-hh)*60);
  if(mm>=60){hh++;mm-=60;}            // don't render 7:00 as 6:60
  hh=((hh%24)+24)%24;
  const ap=hh<12?"am":"pm",h12=hh%12===0?12:hh%12;
  return h12+":"+String(mm).padStart(2,"0")+" "+ap;
}
const HOUR_OPTS=(()=>{const o=[];for(let h=0;h<=24;h+=0.5)o.push(h);return o;})();
const DEF_ACTIVE=[{a:7,b:24}];
/* Windows apply to EVERY day, so a cycle-locked schedule stays valid whichever
   weekday a piece lands on. Legacy saves stored a single start/end pair. */
function activeWins(m){
  if(m&&Array.isArray(m.activeWindows)&&m.activeWindows.length)return m.activeWindows;
  if(m&&(m.activeStart!=null||m.activeEnd!=null))return[{a:m.activeStart??7,b:m.activeEnd??24}];
  return DEF_ACTIVE;
}
function inOneWindow(h,a,b){
  // Midnight is hour 24 of one day and hour 0 of the next. When a window ENDS at
  // midnight, a time reading 0:00 is the closing edge, not four hours early.
  if(b>=24-HOUR_EPS&&h<=HOUR_EPS)h+=24;
  if(b>a)return h>=a-HOUR_EPS&&h<=b+HOUR_EPS;
  return h>=a-HOUR_EPS||h<=b+HOUR_EPS;      // wraps midnight
}
function inHourWindows(h,wins){
  const w=(wins&&wins.length)?wins:DEF_ACTIVE;
  for(const x of w)if(inOneWindow(h,x.a,x.b))return true;
  return false;
}
function snapToWindows(d,wins){
  const w=(wins&&wins.length)?wins:DEF_ACTIVE;
  const x=Math.round(d*24)/24;
  if(inHourWindows(((x%1)+1)%1*24,w))return x;
  const day=Math.floor(x),cand=[];
  for(let k=-1;k<=1;k++)for(const win of w){cand.push(day+k+win.a/24);cand.push(day+k+win.b/24);}
  let best=cand[0],bd=1e9;
  for(const c of cand){const dd=Math.abs(c-x);if(dd<bd){bd=dd;best=c;}}
  return best;
}
/* Gaps between windows, for shading the unavailable stretches on the timeline. */
function offBands(wins){
  const w=[...((wins&&wins.length)?wins:DEF_ACTIVE)]
    .map(x=>({a:Math.max(0,x.a),b:Math.min(24,x.b<=x.a?24:x.b)}))
    .sort((p,q)=>p.a-q.a);
  const merged=[];
  for(const x of w){const last=merged[merged.length-1];
    if(last&&x.a<=last.b+1e-9)last.b=Math.max(last.b,x.b);else merged.push({...x});}
  const out=[];let cur=0;
  for(const x of merged){if(x.a>cur+1e-9)out.push([cur,x.a]);cur=Math.max(cur,x.b);}
  if(cur<24-1e-9)out.push([cur,24]);
  return out;
}

const FIT_TARGETS=[["E2","Estradiol"],["P4","Progesterone"],["T","Testosterone"],["FSH","FSH"],["LH","LH"]];
function refArrayFor(hormone,refProfile){
  const male=refProfile==="male";
  const sets=male?{E2:ME_M,P4:MP_M,FSH:MF_M,LH:MLH_M,T:MT_M}
                 :{E2:ME,P4:MP,FSH:MF,LH:MLH,T:MT_M};
  return sets[hormone]||sets.E2;
}
/* Sampler that respects every reference customisation: a moved ovulation day, a
   shifted cycle anchor, a custom reference length (the curve stretches to fit),
   and the reference multiplier. Mirrors drawChart exactly so the fitter aims at
   the same line you can see. */
function makeRefSampler(arr,cycleLen,ovulationDay,cycleAnchor,customRefLen,refLen,refMult){
  const base=cycleLen||CANONICAL_CYCLE;
  const refCl=(customRefLen?refLen:base)||CANONICAL_CYCLE;
  const refOv=Math.max(2,Math.min(Math.round(refCl)-1,
    Math.round((ovulationDay||0)*refCl/base)));
  const refAnchor=Math.round((cycleAnchor||0)*refCl/base);
  const mult=refMult||1;
  return t=>refI(arr,refTimeForCycleDay(t,refCl,refOv,refAnchor))*mult;
}

/* ═══ UPCOMING DOSES ═══ */
const ALERT_HOURS=36;
/* Close enough that doing it now rather than exactly on the hour makes no
   difference worth worrying about. Shown as a green edge — an outline rather
   than a fill, so it reads as permission without drowning the medication colour
   or the text underneath it. */
const EARLY_HOURS=3;
const EARLY_COL="#4ade80";
const PAST_HOURS=12;    // how far the live Events list looks back; forward is ALERT_HOURS
const DOW=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
/* How many WHOLE days the cycle numbered `idx` actually contains.

   This is the fix for a bug that rotated the clock by half a day. Cycle
   boundaries are rounded to midnight — getCycleDay works in whole days and puts
   each boundary at Math.round(n*cycleLen) — so a 29.5-day cycle really runs 30,
   29, 30, 29 days, and every one of them starts at midnight. That is what makes
   a cycle-day's fractional part MEAN a time of day.

   Wrapping an event by cycleLen instead of by the cycle's real length therefore
   subtracts a non-whole number of days, and subtracting half a day from a
   cycle-day moves the hands twelve hours. It showed up only on patches worn
   across the seam, and only on the removal, since an application never wraps.
   A patch put on at midnight and worn exactly two days was being reported as
   coming off at 11:16am. Subtract whole days and the time of day survives. */
/* How many days the lunar month containing `d` actually runs.

   cycleDays() below computes a cycle's length from Math.round(n*cycleLen),
   which is exactly how getCycleDay lays out a MANUAL cycle — but a lunar cycle
   is laid out by the moon, via lunarDayMid, and the two are out of phase. The
   formula says 29 where the moon says 30 and the other way round, so a removal
   crossing the seam could land on the wrong DAY (never the wrong time — any
   whole-day wrap preserves the clock). Derived here from the same lunarDayMid
   the cycle day comes from, so the two cannot disagree. */
function lunarMonthLen(d){
  const b=d||new Date(),y=b.getFullYear(),m=b.getMonth(),dd=b.getDate();
  /* Stepping by 86400000ms would land on 23:00 of the previous day across a
     fall-back, quietly shifting the date. Day arithmetic through the Date
     constructor is the only DST-safe way to say "k days later". */
  const first=dd-(lunarDayMid(new Date(y,m,dd))-1);
  for(let k=28;k<=31;k++)
    if(lunarDayMid(new Date(y,m,first+k))===1)return k;
  return 30;
}
function cycleDays(idx,cl){
  const c=cl>0?cl:29.5,n=Math.floor(idx||0);
  return Math.max(1,Math.round((n+1)*c)-Math.round(n*c));
}
/* Days forward from nowCd to the next time the cycle reaches position p. `cl`
   must be the cycle's whole-day length (see cycleDays), not the fractional
   average, or the fractional part of the answer — the time of day — comes back
   rotated. */
function daysUntil(p,nowCd,cl){const c=cl>0?cl:29.5;return(((p-nowCd)%c)+c)%c;}
/* "tomorrow at 6:00 pm" for a real time; "tomorrow morning" when the schedule
   only says am/pm. An am dose is not a midnight dose — that's just where it sits
   on the graph — so a vague dose must never be given a fake clock time. */
function whenLabel(inDays,now,vague){
  const when=new Date(now.getTime()+inDays*86400000);
  const d0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const d1=new Date(when.getFullYear(),when.getMonth(),when.getDate());
  const diff=Math.round((d1-d0)/86400000);
  if(vague){
    const part=vague==="am"?"morning":"evening";
    return diff===0?`this ${part}`:diff===1?`tomorrow ${part}`:diff===-1?`yesterday ${part}`:`${DOW[when.getDay()]} ${part}`;
  }
  const t=hourLabel(when.getHours()+when.getMinutes()/60+when.getSeconds()/3600);
  return diff===0?`today at ${t}`:diff===1?`tomorrow at ${t}`:diff===-1?`yesterday at ${t}`:`${DOW[when.getDay()]} at ${t}`;
}
/* Same, abbreviated to fit a body slot on a wall display. Never hidden behind a
   tooltip — this screen is read from across a room, not hovered. */
function shortLabel(inDays,now,vague){
  const when=new Date(now.getTime()+inDays*86400000);
  const d0=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const d1=new Date(when.getFullYear(),when.getMonth(),when.getDate());
  const diff=Math.round((d1-d0)/86400000);
  const day=diff===0?"today":diff===1?"tmrw":diff===-1?"yest":DOW[when.getDay()].slice(0,3);
  if(vague)return day+" "+(vague==="am"?"morning":"evening");
  /* Seconds included. Without them this TRUNCATES to the minute while the day
     list, which formats the exact cycle fraction through hourLabel, ROUNDS — so
     one removal at 9:42:30 read "9:42" in the inventory and "9:43" in the events
     list. Same instant, two roundings. */
  return day+" "+hourLabel(when.getHours()+when.getMinutes()/60+when.getSeconds()/3600).replace(":00","");
}
/* Every dose due inside the alert horizon, across ALL medications. Patches have
   an on AND an off; everything else is taken and stays taken. */
function upcomingDoses(medications,cl,nowCd,now,hours,cycLen,prevLen){
  const out=[],horizon=(hours||ALERT_HOURS)/24;
  /* Everything here is measured in real days from now, so it must wrap by the
     real length of the cycle — and by the length of the RIGHT cycle. */
  const WL=cycLen>0?cycLen:cl, PL=prevLen>0?prevLen:WL;
  for(const m of medications||[]){
    if(!m.enabled)continue;
    if(m.deliveryType==="continuous"&&m.continuousType==="patch"){
      const ps=(m.pieces&&m.pieces.length)?m.pieces:blocksToPieces(m.doses,cl,m.patchDuration||PATCH_HALF_LIFE);
      for(const p of ps){
        const on=daysUntil(parseFloat(p.day)||0,nowCd,WL);
        if(on<=horizon)out.push({kind:"on",med:m,piece:p,inDays:on,label:whenLabel(on,now,null),shortl:shortLabel(on,now,null)});
        /* A removal is not a position of its own — it is the application plus
           the wear, so it is measured from the application rather than wrapped
           independently. Two candidates: the removal belonging to the application
           still ahead of us, and the one belonging to the application a cycle
           back, which may not have happened yet. The earlier of the two that is
           still in the future is the next removal.

           Wrapping the removal on its own by THIS cycle's length reported a patch
           applied late last cycle as coming off a whole cycle from now, because
           its removal sits before the point the modulo folded it to. That is the
           twelve-hour disagreement with the inventory, in its second hiding
           place. */
        const w2=parseFloat(p.wear)||0,d0v=parseFloat(p.day)||0;
        /* Where the application BEFORE now actually was. If its cycle-day has
           already passed today, it happened earlier in this cycle; if not, it
           happened in the previous one, which may be a different number of days
           long. Getting that branch wrong is what put a patch's removal a whole
           cycle away while the inventory counted down the last half hour of it. */
        const prevOn=(d0v<=nowCd)?-(nowCd-d0v):-(nowCd+PL-d0v);
        const off=(prevOn+w2>=-1e-9)?(prevOn+w2):(on+w2);
        if(off<=horizon&&(parseFloat(p.wear)||0)>0)out.push({kind:"off",med:m,piece:p,inDays:off,label:whenLabel(off,now,null),shortl:shortLabel(off,now,null)});
      }
    }else{
      for(const d of(m.doses||[])){
        const amt=parseFloat(d.dose)||0;if(amt<=0)continue;
        const raw=d.time||"am",vague=(raw==="am"||raw==="pm")?raw:null;
        const pos=dosePos(d.day,raw);
        const t=daysUntil(pos,nowCd,WL);
        if(t<=horizon)out.push({kind:"take",med:m,dose:amt,inDays:t,vague,label:whenLabel(t,now,vague),shortl:shortLabel(t,now,vague)});
      }
    }
  }
  return out.sort((a,b)=>a.inDays-b.inDays);
}
/* What the schedule says ALREADY happened, looking back. Derived the same way as
   upcomingDoses — the cycle loops, so the recent past is as computable as the near
   future. This is what the schedule called for, not a record of what you actually
   did; nothing here is stored. */
function recentDoses(medications,cl,nowCd,now,hours,cycLen,prevLen){
  const out=[],horizon=(hours||ALERT_HOURS)/24;
  const WL=cycLen>0?cycLen:cl, PL=prevLen>0?prevLen:WL;
  const back=p=>{const c=WL>0?WL:29.5;return(((nowCd-p)%c)+c)%c;};
  for(const m of medications||[]){
    if(!m.enabled)continue;
    if(m.deliveryType==="continuous"&&m.continuousType==="patch"){
      const ps=(m.pieces&&m.pieces.length)?m.pieces:blocksToPieces(m.doses,cl,m.patchDuration||PATCH_HALF_LIFE);
      for(const p of ps){
        const w=parseFloat(p.wear)||0;
        const on=back(parseFloat(p.day)||0);
        if(on>0&&on<=horizon)out.push({kind:"on",med:m,piece:p,ago:on,label:whenLabel(-on,now,null),shortl:shortLabel(-on,now,null)});
        /* Same rule looking backwards: a removal belongs to an application, so
           it is that application's moment plus the wear. */
        const d0b=parseFloat(p.day)||0;
        const prevOnB=(d0b<=nowCd)?-(nowCd-d0b):-(nowCd+PL-d0b);
        const tB=prevOnB+w;
        const off=(tB<=1e-9)?(-tB):(PL-tB);
        if(w>0&&off>0&&off<=horizon)out.push({kind:"off",med:m,piece:p,ago:off,label:whenLabel(-off,now,null),shortl:shortLabel(-off,now,null)});
      }
    }else{
      for(const d of(m.doses||[])){
        const amt=parseFloat(d.dose)||0;if(amt<=0)continue;
        const raw=d.time||"am",vague=(raw==="am"||raw==="pm")?raw:null;
        const t=back(dosePos(d.day,raw));
        if(t>0&&t<=horizon)out.push({kind:"take",med:m,dose:amt,ago:t,vague,label:whenLabel(-t,now,vague),shortl:shortLabel(-t,now,vague)});
      }
    }
  }
  return out.sort((a,b)=>a.ago-b.ago);
}

/* ═══ DAY LOG ═══ */
/* What actually happened, in plain words. The schedule is derivable, so this only
   needs to record the day as it was ACTUALLY lived — including a piece you dragged
   to the other leg. Written continuously while the app is open, so today's entry
   is always current and yesterday's freezes when the date rolls over.
   One small object per day, pruned at 90 days to match the calendar, so it stays
   the same size whether the app has been open a week or five years. */
const DAYLOG_KEY="hcm-daylog";
const DAYLOG_DAYS=90;
function dayEventsFor(cycleDay,medications,cl,ov,maxOnBody,cycleIdx,seed,cycLen,prevLen,nowAt){
  const out=[];
  /* Seating is a question about the BODY, so it is asked once, of every patch
     piece there is. Asking it per medication meant each one answered as though it
     were alone on the skin and two could be sent to the same spot. */
  const pool=patchPieceList(medications,cl);
  const poolSeat=new Map();
  for(const m of medications||[]){
    if(!m.enabled)continue;
    if(m.deliveryType==="continuous"&&m.continuousType==="patch"){
      const ps=(m.pieces&&m.pieces.length)?m.pieces:blocksToPieces(m.doses,cl,m.patchDuration||PATCH_HALF_LIFE);
      const cap=Math.max(2,maxOnBody||8);
      /* Ask the SAME seater the body diagram uses, sampled at the moment the piece
         goes on. Deriving the spot a second way here (raw rotation + raw override)
         skipped the diagram's collision and bounds handling, so a piece dragged to
         an empty slot could leave the log announcing a later piece onto a spot that
         was already occupied — and an out-of-range override printed a letter no
         slot has. A piece stays where it was put, so the on-time seating labels the
         off event too. */
      /* `ap` is the instant the piece went on for THIS occurrence — d0 for one
         applied in this cycle, d0 minus the previous cycle's length for one
         applied in the last. Seating always at d0 asked where the NEXT
         application will go, which for a seam-crossing patch is a different spot
         entirely: the inventory said B and this list said D for the same piece. */
      const spot=(p,ap)=>{
        const d0=(ap===undefined?(parseFloat(p.day)||0):ap);
        let seat=poolSeat.get(d0);
        if(!seat){seat=bodySlots(patchesOnAt(d0,pool,cl,null,null,cycLen,prevLen),cap,pool,cl,ov,cycleIdx,seed);
          poolSeat.set(d0,seat);}
        /* Match on the pooled piece, whose id may have been namespaced. */
        const pk=(pool.find(q=>q._med===m.id&&(q._id===p._id
          ||(!p._id&&Math.abs((+q.day)-(+p.day))<1e-9&&+q.size===+p.size&&+q.wear===+p.wear)))||p);
        const k=seat.key(pk);
        /* A sealed placement is the RECORD of where this piece is; the body
           diagram seats from it, so this must read it first. */
        const pin=ov?ov[k]:null;
        if(pin!=null&&seat.slots[pin])
          return ` \u2014 ${seat.slots[pin].letter}, ${seat.slots[pin].side}`;
        /* Failing that: if the piece is on the body RIGHT NOW, answer with the
           seating at this moment, because that is the one the diagram is showing.
           Seating at the application instant asks a different question \u2014 who else
           was on the body back then \u2014 and for a patch worn across the cycle seam
           the two sets differ, so the same piece came out B on the diagram and D
           in this list. Whatever is on you now is what the list must name. */
        if(nowAt!=null){
          let nseat=poolSeat.get("now");
          if(!nseat){nseat=bodySlots(patchesOnAt(nowAt,pool,cl,null,null,cycLen,prevLen),
            cap,pool,cl,ov,cycleIdx,seed);poolSeat.set("now",nseat);}
          const ns=nseat.slots.find(x=>x.piece&&nseat.key(x.piece)===k);
          if(ns)return ` \u2014 ${ns.letter}, ${ns.side}`;
        }
        const s=seat.slots.find(x=>x.piece&&seat.key(x.piece)===k);
        return s?` \u2014 ${s.letter}, ${s.side}`:"";
      };
      /* Whole days, so a removal that runs past the end of the cycle keeps its
         clock time when it lands in the next one. */
      const L=cycLen>0?cycLen:cycleDays(cycleIdx,cl);
      for(const p of ps){
        const d0=parseFloat(p.day)||0,w=parseFloat(p.wear)||0,sz=parseFloat(p.size)||0;
        if(sz<=0||w<=0)continue;
        const tag=patchTag(ps,p);
        const teg=needsTegaderm(w,m.tegadermDays);
        if(Math.floor(d0)===cycleDay)
          out.push({at:d0%1,kind:"on",tag,teg,piece:p,med:m,
            text:`Put on ${patchFracTotal(sz)} of ${m.name}${teg?" + Tegaderm":""}${spot(p,d0)}`});
        /* A removal belongs to an APPLICATION, and there are two applications
           that can put one inside this cycle: the one at d0 in this cycle, and
           the one at d0 in the cycle before — which started PL days ago, not L.

           `while(off>=L)off-=L` subtracted the CURRENT cycle's length from a
           piece applied in the PREVIOUS one. When the two differ, which for a
           lunar month is every other month, the removal landed a whole day off:
           a patch the inventory was counting down to tomorrow morning appeared
           in this list as already taken off this morning. Exactly 24 hours,
           because that is the difference between a 30-day month and a 29-day
           one. */
        const PLd=prevLen>0?prevLen:L;
        const offs=[];
        if(d0+w<L-1e-9)offs.push([d0+w,d0]);              // applied in this cycle
        if(d0-PLd+w>=-1e-9&&d0-PLd+w<L-1e-9)
          offs.push([d0-PLd+w,d0-PLd]);                    // applied in the cycle before
        for(const[off,ap]of offs)
          if(Math.floor(off)===cycleDay)
            out.push({at:off%1,kind:"off",tag,piece:p,med:m,
              text:`Took off ${patchFracTotal(sz)} of ${m.name}${spot(p,ap)}`});
      }
    }else{
      for(const d of(m.doses||[])){
        const amt=parseFloat(d.dose)||0;
        if(amt<=0)continue;
        /* Place it where the GRAPH places it: day + time, wrapped. Rounding the
           day alone put a dose entered as 5.6 on day 6 while every other surface
           drew it on day 5, and a late dose on the last day never wrapped. */
        const raw=d.time||"am";
        const pos=((dosePos(d.day,raw)%cl)+cl)%cl;
        if(Math.floor(pos)!==cycleDay)continue;
        out.push({at:pos%1,kind:"take",vague:(raw==="am"||raw==="pm")?raw:null,
          text:`Took ${amt}mg of ${m.name}`});
      }
    }
  }
  return out.sort((a,b)=>a.at-b.at);
}
function loadDayLog(){try{return JSON.parse(localStorage.getItem(DAYLOG_KEY)||"{}");}catch(e){return{};}}
function saveDayLog(log){
  const cut=new Date();cut.setDate(cut.getDate()-DAYLOG_DAYS);
  const cs=localDateKey(cut),out={};
  for(const k of Object.keys(log||{}))if(k>=cs)out[k]=log[k];
  try{localStorage.setItem(DAYLOG_KEY,JSON.stringify(out));}catch(e){}
  return out;
}

/* Two short chirps. Rising and bright when something goes ON or is taken,
   falling and lower when something comes OFF. */
/* ═══ AUDIO CONTEXTS: ONE PER SOUND, ONE PER ALARM ═══
   REVERTED, and the reason matters. This app made a FRESH AudioContext for every
   sound for months, and it worked at all hours. In v140 I replaced that with one
   long-lived shared context, called it a harmless refactor, and it broke exactly
   as badly as a shared context can:

   a browser is free to SUSPEND a context after inactivity, and a suspended
   context's currentTime STOPS ADVANCING. The alarm loop kept scheduling notes
   against that frozen clock, so fifteen minutes of pulses all queued at the same
   instant — and the moment a tap resumed the context, every one of them fired
   together. That is the "extremely loud first pulse", and it is the shared
   context's fault, not the alarm's.

   So: a fresh context per sound, as before. The persistent alarm gets ONE for
   its own lifetime rather than six hundred, and closes it on teardown. A
   short-lived context cannot be suspended out from under us. */
function newCtx(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    return AC?new AC():null;
  }catch(e){return null;}
}
const TONES={
  chime:{name:"Chime",seq:[[988,0,.14],[1319,.12,.24]]},
  bell:{name:"Bell",seq:[[660,0,.5],[990,.05,.6]]},
  soft:{name:"Soft",seq:[[523,0,.3],[659,.18,.34],[784,.36,.5]]},
  low:{name:"Low",seq:[[330,0,.35],[247,.22,.5]]},
  bright:{name:"Bright",seq:[[1175,0,.1],[1568,.09,.14],[1175,.2,.2]]},
  drop:{name:"Drop",seq:[[880,0,.18],[587,.14,.3],[440,.3,.45]]},
};
const TONE_IDS=Object.keys(TONES);
/* Plays one phrase and returns when it ends. */
function playTone(ctx,id,at,vol){
  const t=TONES[id]||TONES.chime;
  let end=0;
  for(const[f,off,dur]of t.seq){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type="sine";
    o.frequency.setValueAtTime(f*0.9,at+off);
    o.frequency.exponentialRampToValueAtTime(f,at+off+0.06);
    g.gain.setValueAtTime(0.0001,at+off);
    g.gain.exponentialRampToValueAtTime(vol===undefined?0.2:vol,at+off+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,at+off+dur);
    o.connect(g);g.connect(ctx.destination);
    o.start(at+off);o.stop(at+off+dur+0.05);
    if(off+dur>end)end=off+dur;
  }
  return end+0.1;
}
/* A short preview, capped at five seconds however long the loop would run. */
function previewTone(id,persistent){
  try{
    const ctx=newCtx();if(!ctx)return;
    let t=ctx.currentTime+0.02;
    if(persistent){while(t-ctx.currentTime<4.6)t+=playTone(ctx,id,t)+0.55;}
    else playTone(ctx,id,t);
    setTimeout(()=>{try{ctx.close();}catch(e){}},5600);
  }catch(e){}
}
let _soundNote=null;   // the app installs its logger here so chime() can report
function chime(kind){
  try{
    const ctx=newCtx();
    if(!ctx){if(_soundNote)_soundNote("chime FAILED","no AudioContext");return;}
    /* The state at the instant of playing is the whole question: "suspended"
       means the browser refused, and that is the difference between a bug in
       this app and a browser policy we cannot argue with. */
    if(_soundNote)_soundNote("chime "+kind,"ctx "+ctx.state);
    if(ctx.state==="suspended"){try{ctx.resume();}catch(e){}}
    const t0=ctx.currentTime+0.02;
    const seq=kind==="off"?[[587,0,.18],[392,.15,.30]]:[[988,0,.14],[1319,.12,.24]];
    for(const[f,at,dur]of seq){
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type="sine";
      o.frequency.setValueAtTime(f*0.9,t0+at);
      o.frequency.exponentialRampToValueAtTime(f,t0+at+0.06);
      g.gain.setValueAtTime(0.0001,t0+at);
      g.gain.exponentialRampToValueAtTime(0.2,t0+at+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+at+dur);
      o.connect(g);g.connect(ctx.destination);
      o.start(t0+at);o.stop(t0+at+dur+0.05);
    }
  }catch(e){}
}

/* ═══ PATCH LANES — the schedule editor ═══ */
/* Tracks like a media editor. Sideways drags when a piece goes on, up/down moves
   it between tracks, the right edge sets how long it stays on. */
function PatchLanes({pieces,onChange,cycleLen,pg,curve,dur,maxOnBody,budget,maxWear,
                     actOn,wins,accent,sub,brd,onSettings,fitTarget,onTargetChange,settings,
                     sepNote,onDismissSep,deadWin}){
  const LANE_H=22,SNAPH=1/24;
  const [sel,setSel]=useState(null);
  const [drag,setDrag]=useState(null);
  const laneRef=useRef(null);
  const cl=cycleLen>0?cycleLen:29.5;
  const hourOf=d=>((d%1)+1)%1*24;
  const inWin=d=>!actOn||inHourWindows(hourOf(d),wins);
  const snapWin=d=>snapToWindows(d,wins);
  const dayFromX=cx=>{const el=laneRef.current;if(!el)return 0;const r=el.getBoundingClientRect();
    const raw=((cx-r.left)/r.width)*cl;
    return Math.max(0,Math.min(cl-SNAPH,actOn?snapWin(raw):Math.round(raw/SNAPH)*SNAPH));};
  const laneFromY=(cy,n)=>{const el=laneRef.current;if(!el)return 0;const r=el.getBoundingClientRect();
    return Math.max(0,Math.min(n-1,Math.floor((cy-r.top)/LANE_H)));};
  const laned=assignLanes(pieces);
  /* The band the generator will not put an event in. Drawn rather than merely
     obeyed, so it is obvious why the fitter leaves a gap there — and obvious
     that dragging a piece in is still your call. */
  const dwin=(deadWin&&deadWin.hi>deadWin.lo)?deadWin:null;
  /* One row per piece this medication may have on the body at once \u2014 more rows
     than that would let you draw a schedule the body cannot wear. The only reason
     to go higher is a schedule drawn before the limit existed: a piece already
     sitting in a higher row is still contributing to the curve, so it is shown
     rather than hidden, and the "over body limit" warning says so. */
  const laneCount=Math.max(maxOnBody,laned.reduce((m,p)=>Math.max(m,p.lane||0),0)+1);
  /* The one door every edit leaves by. Two patch events on the same minute are
     what let the tablet and the watch order them differently and hand the same
     spot to two patches, so nothing gets out of here with a tie in it: whichever
     event is second steps forward until there are five clear minutes. `hold` is
     the piece under the cursor — that one holds still, since it is the one you
     are currently deciding, and everything else moves around it. */
  const commit=(next,hold)=>onChange(separatePieces(next,cl,maxWear,hold));
  useEffect(()=>{if(!drag)return;
    const mv=e=>{const day=dayFromX(e.clientX);
      commit(pieces.map(p=>{if(p._id!==drag.id)return p;
        if(drag.mode==="move"){const nd=actOn?snapWin(day-drag.grab):Math.round((day-drag.grab)/SNAPH)*SNAPH;
          return{...p,day:Math.max(0,Math.min(cl-SNAPH,nd)),lane:laneFromY(e.clientY,laneCount)};}
        const off=actOn?snapWin(p.day+(day-p.day)):Math.round(day/SNAPH)*SNAPH;
        return{...p,wear:Math.max(0,Math.min(maxWear,+(off-p.day).toFixed(4)))};}),drag.id);};
    const up=()=>setDrag(null);
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
    return()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
  },[drag,pieces,laneCount,actOn,wins,maxWear]);
  const add=sz=>{const np={_id:uid(),day:actOn?snapWin(0):0,size:sz,wear:Math.min(PATCH_HALF_LIFE,maxWear)};
    commit([...pieces,np],np._id);setSel(np._id);};
  const upd=(id,patch)=>commit(pieces.map(p=>p._id===id?{...p,...patch}:p),id);
  const del=id=>{commit(pieces.filter(p=>p._id!==id),null);setSel(null);};
  const used=patchesUsed(pieces),conc=peakConcurrent(pieces,cl);
  const selP=pieces.find(p=>p._id===sel)||null;
  const lbl={fontSize:8,letterSpacing:".08em",textTransform:"uppercase",color:sub};
  const chip=on=>({background:on?`${accent}33`:"rgba(148,163,184,.08)",
    border:`1px solid ${on?accent:"rgba(148,163,184,.22)"}`,color:on?accent:sub,
    borderRadius:4,padding:"2px 6px",fontSize:9,cursor:"pointer"});
  const bar=(p,a,b,key,main)=>{const on=p._id===sel;
    return<div key={key} onMouseDown={e=>{e.stopPropagation();setSel(p._id);
        setDrag({mode:"move",id:p._id,grab:dayFromX(e.clientX)-p.day});}}
      style={{position:"absolute",left:`${(a/cl)*100}%`,width:`${Math.max((b-a)/cl,.004)*100}%`,
        top:(p.lane||0)*LANE_H+3,height:LANE_H-6,borderRadius:3,cursor:"grab",
        background:on?`${accent}66`:`${accent}30`,border:`1px solid ${on?accent:accent+"88"}`,
        display:"flex",alignItems:"center",padding:"0 3px",overflow:"hidden",opacity:p.wear<=0?.35:1}}>
      <span style={{fontSize:9,fontWeight:700,color:on?"#fff":accent}}>{patchFrac(p.size)}</span>
      {b-a>1.8&&<span style={{fontSize:8,color:sub,marginLeft:4}}>{(+p.wear).toFixed(1)}d</span>}
      {main&&<div onMouseDown={e=>{e.stopPropagation();setSel(p._id);setDrag({mode:"resize",id:p._id});}}
        style={{position:"absolute",right:0,top:0,bottom:0,width:6,cursor:"ew-resize",
          borderRight:`2px solid ${on?"#fff":accent}`}}/>}
    </div>;};
  return<div style={{marginTop:6}}>
    <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
      <span style={lbl}>place</span>
      {PIECE_SIZES.map(sz=><button key={sz} onClick={()=>add(sz)} style={chip(false)}>{patchFrac(sz)}</button>)}
      <span style={{...lbl,marginLeft:6}}>{used} patches · {conc}/{maxOnBody} on body</span>
      {conc>maxOnBody&&<span style={{fontSize:9,color:"#fbbf24"}}>over body limit</span>}
      {sepNote&&<span style={{fontSize:9,color:"#fbbf24"}}
        title={"This schedule was drawn before the five-minute rule existed and had "
          +sepNote.n+" piece"+(sepNote.n===1?"":"s")+" sharing an instant with another event. "
          +"Whichever event was second has been nudged forward so the order can never "
          +"be read differently by the watch and the app. Nothing moved by more than a "
          +"few minutes."}>
        spaced {sepNote.n} piece{sepNote.n===1?"":"s"} ·
        <span style={{textDecoration:"underline",cursor:"pointer",marginLeft:3}}
          onClick={()=>onDismissSep&&onDismissSep()}>ok</span>
      </span>}
      <div style={{flex:1}}/>
      {settings}
      {onTargetChange&&<select value={fitTarget} onChange={e=>onTargetChange(e.target.value)}
        title="Which reference line the fitter aims at."
        style={{background:"rgba(15,23,42,.6)",border:`1px solid ${brd}`,borderRadius:4,
          padding:"2px 4px",color:sub,fontSize:9,outline:"none",cursor:"pointer"}}>
        {FIT_TARGETS.map(([k,label])=><option key={k} value={k}>{label}</option>)}
      </select>}
      {onSettings&&<button onClick={onSettings} style={chip(true)}>match reference</button>}
    </div>
    <div ref={laneRef} onMouseDown={()=>setSel(null)}
      style={{position:"relative",height:laneCount*LANE_H,borderRadius:5,overflow:"hidden",
        border:`1px solid ${brd}`,background:"rgba(148,163,184,.05)"}}>
      {[...Array(laneCount)].map((_,i)=><div key={"l"+i} style={{position:"absolute",left:0,right:0,
        top:i*LANE_H,height:LANE_H,background:i%2?"rgba(148,163,184,.05)":"transparent",
        borderBottom:"1px solid rgba(148,163,184,.08)"}}/>)}
      {actOn&&[].concat(...[...Array(Math.ceil(cl)+1)].map((_,i)=>
        offBands(wins).map(([s0,e0],j)=>{
          const a=i+s0/24,b=Math.min(i+e0/24,cl);
          if(a>=cl||b<=a)return null;
          return<div key={"n"+i+"_"+j} style={{position:"absolute",left:`${(a/cl)*100}%`,
            width:`${((b-a)/cl)*100}%`,top:0,bottom:0,background:"rgba(8,11,22,.4)",pointerEvents:"none"}}/>;})))}
      {laned.map(p=>{const end=p.day+p.wear,out=[bar(p,p.day,Math.min(end,cl),p._id+"m",true)];
        if(end>cl)out.push(bar(p,0,end-cl,p._id+"w",false));return out;})}
    </div>
    {selP&&<div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:5,
      padding:"5px 7px",border:`1px solid ${accent}44`,borderRadius:5}}>
      <span style={{fontSize:10,color:accent,fontWeight:600}}>
        day {Math.floor(selP.day)+1} · {(()=>{const h=hourOf(selP.day);const H=Math.floor(h+1e-6);
          const M=Math.round((h-H)*60);const ap=H<12?"am":"pm";const h12=H%12===0?12:H%12;
          return h12+":"+String(M%60).padStart(2,"0")+ap;})()}</span>
      <div style={{display:"flex",gap:3}}>
        {PIECE_SIZES.map(sz=><button key={sz} onClick={()=>upd(selP._id,{size:sz})}
          style={chip(selP.size===sz)}>{patchFrac(sz)}</button>)}
      </div>
      <span style={lbl}>wear</span>
      <input type="range" min={0} max={maxWear} step={SNAPH} value={Math.min(selP.wear,maxWear)}
        onChange={e=>{const w=+e.target.value;const off=actOn?snapWin(selP.day+w):selP.day+w;
          upd(selP._id,{wear:Math.max(0,Math.min(maxWear,+(off-selP.day).toFixed(4)))});}}
        style={{width:130,accentColor:accent}}/>
      <span style={{fontSize:10,color:accent,minWidth:64}}>
        {(+selP.wear).toFixed(2)}d · {Math.round(Math.max(0,evC(curve&&curve.length>=2?curve:DEF_PATCH_CURVE,selP.wear/(dur||PATCH_HALF_LIFE)))*100)}%</span>
      <button onClick={()=>del(selP._id)} style={{...chip(false),color:"#f87171"}}>remove</button>
    </div>}
  </div>;
}

/* ═══ MAIN ═══ */
function PasswordGate({children}){
  const[unlocked,setUnlocked]=useState(()=>{try{return localStorage.getItem("hcm-unlocked")==="yes";}catch(e){return false;}});
  const[pw,setPw]=useState("");
  const[err,setErr]=useState(false);
  if(unlocked)return children;
  const tryUnlock=()=>{
    if(pw.toLowerCase().replace(/\s+/g,"")==="ommanipadmehum"){
      try{localStorage.setItem("hcm-unlocked","yes");}catch(e){}
      setUnlocked(true);
    }else{
      setErr(true);
    }
  };
  return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#110c14",color:"#c4b5fd",fontFamily:"sans-serif",padding:20,boxSizing:"border-box"}}>
    <div style={{maxWidth:340,width:"100%",textAlign:"center"}}>
      <div style={{fontSize:18,marginBottom:20,fontStyle:"italic",lineHeight:1.5,opacity:0.85}}>Praise the jewel in the lotus.</div>
      <input
        type="text"
        value={pw}
        onChange={e=>{setPw(e.target.value);setErr(false);}}
        onKeyDown={e=>{if(e.key==="Enter")tryUnlock();}}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        style={{width:"100%",padding:"10px 12px",fontSize:14,background:"rgba(30,10,20,0.5)",border:`1px solid ${err?"#f472b6":"rgba(196,181,253,0.3)"}`,borderRadius:6,color:"#c4b5fd",outline:"none",boxSizing:"border-box",textAlign:"center"}}
      />
      <button onClick={tryUnlock} style={{marginTop:10,padding:"8px 24px",fontSize:13,background:"rgba(244,114,182,0.15)",color:"#f472b6",border:"1px solid rgba(244,114,182,0.3)",borderRadius:6,cursor:"pointer"}}>Enter</button>
      {err&&<div style={{marginTop:10,fontSize:11,color:"#f472b6",opacity:0.8}}>Not quite.</div>}
    </div>
  </div>;
}

export default function App(){return<EB><PasswordGate><HCM/></PasswordGate></EB>;}

function Clock({style}){
  const[now,setNow]=useState(()=>new Date());
  useEffect(()=>{
    // Re-render every minute, aligned to the next minute boundary so the display
    // updates as soon as the wall-clock minute rolls over rather than drifting.
    let timeoutId,intervalId;
    const tick=()=>setNow(new Date());
    const ms=60000-(Date.now()%60000);
    timeoutId=setTimeout(()=>{tick();intervalId=setInterval(tick,60000);},ms);
    return()=>{clearTimeout(timeoutId);if(intervalId)clearInterval(intervalId);};
  },[]);
  let h=now.getHours();
  const m=now.getMinutes();
  const ampm=h>=12?"PM":"AM";
  h=h%12;if(h===0)h=12;
  const mm=m<10?"0"+m:""+m;
  return<span style={style}>{h}:{mm} <span style={{opacity:0.65,fontSize:"0.85em"}}>{ampm}</span></span>;
}

function HCM(){
  const saved=useRef(ld(K.st)).current;const[loading,setLoading]=useState(true);const[tab,setTab]=useState(saved?.tab||"modeler");
  const[scheds,setScheds]=useState(()=>{const s=ld(K.sc);return s?.length?s:[{...DS}];});
  const[si,setSi]=useState(saved?.schedIdx??0);const[en,setEn]=useState(false);
  // Dose-shift control: number of days to shift all dose schedules forward (+) or
  // backward (-). User edits this value, then presses "Apply" to commit. Does
  // not auto-apply on change. Resets to 0 after each apply.
  const[doseShiftDays,setDoseShiftDays]=useState(0);
  // Per-medication dose multiplier. User edits the multiplier value (default 1)
  // and optionally toggles "floor" (round down to whole mg / nearest 12th for
  // patches). Pressing "Apply" multiplies every dose for the active medication
  // in place. Resets to 1 after applying.
  const[doseMult,setDoseMult]=useState(1);
  const[doseMultFloor,setDoseMultFloor]=useState(false);
  const[calD,setCalD]=useState(()=>ld(K.cl)||{dayNotes:Array.from({length:30},()=>({feeling:"",mood:""}))});
  /* The alarm trigger effect only re-runs when its own dependencies change, so
     a checkbox ticked in between would be invisible to the closure it holds.
     A ref is always the state as it is now, which is what "did she already take
     it" has to be asked of. */
  const calDRef=useRef(calD);
  calDRef.current=calD;
  const sc=scheds[Math.min(si,scheds.length-1)]||DS;
  // === UNIFIED MEDICATION SYSTEM ===
  // medications[] is the source of truth. Old variables (cI, pa, p4, etc.) are derived from it.
  const[medications,setMedications]=useState(()=>{
    if(!sc.medications)return[];
    return sc.medications.map(m=>{
      if(m.hasSuppression&&!m.suppressions){
        let method=m.suppressionMethod||"gradual";
        if(method==="blood-level"||method==="dose-based"||method==="ceiling")method="gradual";
        m.suppressions=[{target:m.suppressionTarget||"T",method,threshold:m.suppressionThreshold||120,effectiveness:m.suppressionEffectiveness||1,duration:m.suppressionDuration||m.suppressionDoseWindow||7,ceiling:m.suppressionCeiling||0}];
      }
      if(!m.suppressions)m.suppressions=[];
      m.suppressions=m.suppressions.map(s=>{
        if(s.method==="blood-level"||s.method==="dose-based"||s.method==="ceiling")return{...s,method:"gradual",duration:s.duration||s.doseWindow||7};
        return s;
      });
      return m;
    });
  });
  const[activeMedIdx,setActiveMedIdx]=useState(0);
  const[medSubTab,setMedSubTab]=useState("schedule");// "schedule" | "waveform" | "suppression" | "notes"
  const[showTemplatePicker,setShowTemplatePicker]=useState(false);
  const activeMed=medications[Math.min(activeMedIdx,medications.length-1)]||null;
  const updateMed=(idx,updates)=>setMedications(prev=>{const u=[...prev];u[idx]={...u[idx],...updates};return u;});
  const addMedFromTemplate=(templateKey)=>{const t=MED_TEMPLATES[templateKey];if(!t)return;const m=makeMed(t);setMedications(p=>[...p,m]);setActiveMedIdx(medications.length);setShowTemplatePicker(false);};
  /* Changing how many pieces a medication may wear at once changes how many rows
     its editor has. Lowering it must not silently destroy the row that goes
     away, and raising it again should bring that row back exactly as it was, so
     the pieces are PARKED rather than deleted.

     Parked pieces live in med.parked, a separate array from med.pieces. That is
     deliberate: everything in the app reads med.pieces, so a parked piece cannot
     leak into the curve, the rotation, the watch or the inventory by some
     consumer forgetting to filter it. Being invisible is the default rather than
     something each reader has to remember. */
  const setMedOnBody=(idx,v)=>{
    setMedications(prev=>{
      const u=[...prev],m=u[idx];
      if(!m)return prev;
      const room=bodyLocOf(prev)-claimedBy(prev,idx);
      const lim=Math.max(1,Math.min(16,Math.min(v,Math.max(1,room))));
      const laned=assignLanes(m.pieces||[]),parked=m.parked||[];
      const keep=laned.filter(p=>(p.lane||0)<lim)
        .concat(parked.filter(p=>(p.lane||0)<lim));
      const park=laned.filter(p=>(p.lane||0)>=lim)
        .concat(parked.filter(p=>(p.lane||0)>=lim));
      u[idx]={...m,maxOnBody:lim,
        pieces:separatePieces(keep,cycleLen,m.maxWear||PATCH_MAX_WEAR,null),
        parked:park};
      return u;
    });
  };
  /* One number, written to every patch medication at once. */
  const setBodyLoc=(v)=>{
    const n=Math.max(2,Math.min(16,parseInt(v)||8));
    setMedications(prev=>prev.map(m=>
      (m.deliveryType==="continuous"&&m.continuousType==="patch")
        ? {...m,bodyLoc:n,maxOnBody:Math.min(parseInt(m.maxOnBody)||n,n)}
        : m));
  };
  const removeMed=(idx)=>{if(medications.length<=0)return;snapNow();setMedications(p=>p.filter((_,i)=>i!==idx));setActiveMedIdx(a=>Math.min(a,medications.length-2));};

  // === DERIVED SCHEDULE ARRAYS from medications[] ===
  const cI=useMemo(()=>{const injs=[];for(const m of medications){if(!m.enabled||m.deliveryType!=="single"||!m.hasWaveform||m.hormone!=="E2")continue;for(const d of(m.doses||[]))injs.push({day:d.day,dose_mg:d.dose,time:d.time||"am"});}return injs;},[medications]);
  // Every enabled patch medication's pieces, flattened. Legacy schedules stored
  // dose BLOCKS; those are converted once, here, so old saves keep working.

  const p4Med=medications.find(m=>m.enabled&&m.hormone==="P4"&&m.hasWaveform);
  const p4=useMemo(()=>{const doses=[];for(const m of medications){if(!m.enabled||m.hormone!=="P4"||!m.hasWaveform)continue;for(const d of(m.doses||[]))doses.push({day:d.day,doseMg:d.dose,time:d.time||"am"});}return doses;},[medications]);
  const p4pk=p4Med?.pk||DEF_PK_P4;
  const p4Pts=p4Med?.points||CURVE_P4_RECTAL;
  const p4Mode=p4Med?.waveformMode||"freeform";

  // Recur
  const recurMed=medications.find(m=>m.enabled&&m.hormone==="E2"&&m.deliveryType==="single"&&m.recurEnabled);
  const rE=!!recurMed;const rD=recurMed?.recurDose||0;const rI2=recurMed?.recurInterval||3.5;const rS=recurMed?.recurStart||0;


  // These stay as direct state since they're global, not per-med
  const[cR,setCR]=useState(sc.cycleRepeat||1);const[cL,setCL]=useState(sc.cycleLength||29.5);
  const[sD,setSD]=useState(sc.showDays||35);const[sRef,setSRef]=useState(saved?.sRef??true);const[sE2,setSE2]=useState(saved?.sE2??true);const[sP4,setSP4]=useState(saved?.sP4??true);const[refMult,setRefMult]=useState(saved?.refMult??1);
  // Reference-line sub-toggles (only meaningful when sRef is on). Let the
  // user show/hide individual reference curves independently of their live
  // medication-driven E2/P4 curves. Default true so existing behavior is
  // unchanged on first load.
  const[sE2Ref,setSE2Ref]=useState(saved?.sE2Ref??true);
  const[sP4Ref,setSP4Ref]=useState(saved?.sP4Ref??true);
  const[customRefLen,setCustomRefLen]=useState(saved?.customRefLen??false);
  const[refLen,setRefLen]=useState(saved?.refLen||29.5);
  const[showFLH,setShowFLH]=useState(saved?.showFLH??false);
  const[showT,setShowT]=useState(saved?.showT??false);
  const[tBaseline,setTBaseline]=useState(saved?.tBaseline??600);const[tFloor,setTFloor]=useState(saved?.tFloor??15);const[tRebound,setTRebound]=useState(saved?.tRebound??7);
  
  // Ovulation day (1-indexed). Replaces the old `menShift` slider — see the
  // header notes on PHASE_WIDTHS_29 / mPh / phaseBoundaries. Default is 14
  // for a 29-day cycle, which puts ovulation on the full moon under lunar
  // alignment ("white moon cycle"). For non-29 cycles, defaultOvulationDay
  // scales it proportionally. We also accept legacy schedules that have
  // `menShift` instead — old `menShift=N` ≈ adding N days to the canonical
  // ovulation. Old MEN_BASE_SHIFT was 3, which was already baked in.
  const[ovulationDay,setOvulationDay]=useState(()=>{
    if(sc.ovulationDay!==undefined)return sc.ovulationDay;
    // Migrate from legacy menShift: old default 0 → new default 14 (white
    // moon alignment, formerly approximated by MEN_BASE_SHIFT=3).
    const legacyShift=sc.menShift??0;
    const cl=sc.cycleLength||29.5;
    return Math.max(2,Math.min(Math.round(cl)-1,defaultOvulationDay(cl)+legacyShift));
  });
  // cycleAnchor (0-indexed): rotates the phase calendar relative to the
  // cycle index without moving doses. `cycleAnchor=0` means cycle day 1
  // = phase day 1 (start of menstrual). `cycleAnchor=15` means phase day 1
  // lands on cycle day 16 — the "red moon cycle" alignment in lunar mode
  // (menstruate at full moon, ovulate at new moon). Doses keep firing on
  // their cycle day regardless of anchor.
  const[cycleAnchor,setCycleAnchor]=useState(sc.cycleAnchor??0);
  // Optional ambient-only ovulation override. null = inherit from global.
  const[ambientOvulationDay,setAmbientOvulationDay]=useState(saved?.ambientOvulationDay??null);
  // Optional ambient-only cycle-anchor override. null = inherit from global
  // cycleAnchor. Editing this only affects the ambient hormone simulation;
  // it does NOT modify the global cycle anchor or affect the user's actual
  // schedule. (Ambient is a sandbox for experimenting with AFAB hormone
  // suppression without touching real settings.)
  const[ambientCycleAnchor,setAmbientCycleAnchor]=useState(saved?.ambientCycleAnchor??null);
  const[showMen,setShowMen]=useState(saved?.showMen??true);
  const[panelTab,setPanelTab]=useState(()=>{try{return localStorage.getItem("hcm-warningSeen")==="yes"?null:"warn";}catch(e){return"warn";}});// null=closed, "warn"=warnings, "info"=how it works
  // Mark warning as seen the first time the user opens or interacts with the warn tab.
  useEffect(()=>{if(panelTab==="warn"){try{localStorage.setItem("hcm-warningSeen","yes");}catch(e){}}},[panelTab]);
  const[calView,setCalView]=useState(saved?.calView||"month");
  // Focus mode hides all UI chrome (header, tabs, top bar, warnings)
  // leaving only the day-strip + graph + calendar grid visible. Replaces
  // the old `focusMode` flag, which only hid the calendar's mini-settings
  // row (those controls now live in the main settings modal).
  const[focusMode,setFocusMode]=useState(saved?.focusMode??false);
  const[settingsOpen,setSettingsOpen]=useState(false);
  const[toolsOpen,setToolsOpen]=useState(false);
  const[redoseOpen,setRedoseOpen]=useState(false);
  const [bangleOpen, setBangleOpen] = useState(false);
  const [bangleMsg,  setBangleMsg]  = useState("");
  const [bangleBusy, setBangleBusy] = useState(false);
  const bangleCurveRef = useRef(null);
  const[rdTaken,setRdTaken]=useState("06:00");
  const[rdOut,setRdOut]=useState("");
  const[rdDose,setRdDose]=useState("");
  const[rdUnit,setRdUnit]=useState("mL");
  const[rdWinLo,setRdWinLo]=useState(5);
  const[rdWinHi,setRdWinHi]=useState(8);
  // (expandedCombos state removed — old combo picker is gone)
  // splitMenuPatchId: which inventory slot's bubbly split menu is currently open
  // (null = none). Used by the merged Patch Inventory.
  const[splitMenuPatchId,setSplitMenuPatchId]=useState(null);
  const splitMenuAnchorRef=useRef(null);
  // Pointer-based drag state. Replaces HTML5 drag-and-drop so it works on
  // touch/pen/mouse uniformly (Surface tablets, mobile, desktop).
  // - dragSourcePatchId: id of piece currently being dragged (null if no drag)
  // - dragOverPatchId: id of slot the drag is hovering (null if none)
  // - dragGhostPos: {x, y} screen coords for the floating drag preview
  const[dragSourcePatchId,setDragSourcePatchId]=useState(null);
  const[dragOverPatchId,setDragOverPatchId]=useState(null);
  const[dragGhostPos,setDragGhostPos]=useState(null);
  const[dragGhostInfo,setDragGhostInfo]=useState(null);// {label, color}
  const dragCandidateRef=useRef(null);// {patchId, startX, startY, label, color, applyCombine, sameFamilyCheck} — tentative drag, not yet started
  const DRAG_THRESHOLD_PX=5;
  // Close split menu on outside click or Escape
  useEffect(()=>{
    if(!splitMenuPatchId)return;
    let added=false;
    const onDown=()=>setSplitMenuPatchId(null);
    const onKey=(e)=>{if(e.key==="Escape")setSplitMenuPatchId(null);};
    // Defer one tick so the click that opened the menu doesn't immediately close it.
    const timer=setTimeout(()=>{
      document.addEventListener("mousedown",onDown);
      document.addEventListener("keydown",onKey);
      added=true;
    },0);
    return()=>{
      clearTimeout(timer);
      if(added){
        document.removeEventListener("mousedown",onDown);
        document.removeEventListener("keydown",onKey);
      }
    };
  },[splitMenuPatchId]);
  // Global pointer event handlers for drag-to-combine. Active whenever
  // dragCandidateRef has a tentative drag OR dragSourcePatchId is set.
  // Works for mouse, touch, and pen uniformly.
  useEffect(()=>{
    const onMove=(e)=>{
      const cand=dragCandidateRef.current;
      if(!cand)return;
      const dx=e.clientX-cand.startX;
      const dy=e.clientY-cand.startY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      // Promote tentative drag to active drag once movement exceeds threshold
      if(!cand.active&&dist>=DRAG_THRESHOLD_PX){
        cand.active=true;
        setDragSourcePatchId(cand.patchId);
        setDragGhostInfo({label:cand.label,color:cand.color});
        // Try to capture pointer so we keep getting events even if pointer leaves the element
        if(cand.targetElement&&cand.targetElement.setPointerCapture){
          try{cand.targetElement.setPointerCapture(cand.pointerId);}catch(err){}
        }
      }
      if(cand.active){
        e.preventDefault();
        setDragGhostPos({x:e.clientX,y:e.clientY});
        // Find slot under pointer
        const el=document.elementFromPoint(e.clientX,e.clientY);
        let target=el;
        let targetPatchId=null;
        while(target&&target!==document.body){
          if(target.dataset&&target.dataset.patchSlotId){
            targetPatchId=target.dataset.patchSlotId;
            break;
          }
          target=target.parentElement;
        }
        if(targetPatchId&&targetPatchId!==cand.patchId&&cand.canCombineOnto&&cand.canCombineOnto(targetPatchId)){
          setDragOverPatchId(prev=>prev===targetPatchId?prev:targetPatchId);
        }else{
          setDragOverPatchId(prev=>prev===null?prev:null);
        }
      }
    };
    const onUp=(e)=>{
      const cand=dragCandidateRef.current;
      if(!cand){return;}
      if(cand.active){
        // Drag completed — check for valid drop target
        const el=document.elementFromPoint(e.clientX,e.clientY);
        let target=el;
        let targetPatchId=null;
        while(target&&target!==document.body){
          if(target.dataset&&target.dataset.patchSlotId){
            targetPatchId=target.dataset.patchSlotId;
            break;
          }
          target=target.parentElement;
        }
        if(targetPatchId&&targetPatchId!==cand.patchId&&cand.applyCombine&&cand.canCombineOnto&&cand.canCombineOnto(targetPatchId)){
          cand.applyCombine(targetPatchId);
        }
        // Release pointer capture if held
        if(cand.targetElement&&cand.targetElement.releasePointerCapture){
          try{cand.targetElement.releasePointerCapture(cand.pointerId);}catch(err){}
        }
      }else{
        // No drag occurred — treat as click. Toggle split menu if applicable.
        if(cand.onClickFallback)cand.onClickFallback();
      }
      setDragSourcePatchId(null);
      setDragOverPatchId(null);
      setDragGhostPos(null);
      setDragGhostInfo(null);
      dragCandidateRef.current=null;
    };
    const onCancel=()=>{
      setDragSourcePatchId(null);
      setDragOverPatchId(null);
      setDragGhostPos(null);
      setDragGhostInfo(null);
      dragCandidateRef.current=null;
    };
    document.addEventListener("pointermove",onMove,{passive:false});
    document.addEventListener("pointerup",onUp);
    document.addEventListener("pointercancel",onCancel);
    return()=>{
      document.removeEventListener("pointermove",onMove);
      document.removeEventListener("pointerup",onUp);
      document.removeEventListener("pointercancel",onCancel);
    };
  },[]);
  const[patchDisplay,setPatchDisplay]=useState(saved?.patchDisplay||"both");
  const[patchAgingViz,setPatchAgingViz]=useState(saved?.patchAgingViz||"bar");// "bar" | "flower"
  // Projection-day overrides for sandbox edits (not persisted; lost on app reload)
  // Keyed by dateKey (YYYY-MM-DD). Each value is a {body, expired} snapshot.
  const[projectionOverrides,setProjectionOverrides]=useState({});
  const[calChartOpen,setCalChartOpen]=useState(true);
  const[cycleShare,setCycleShare]=useState(null);// decoded incoming #cycle= snapshot (someone else's cycle position), or null
  const[cycShareOpen,setCycShareOpen]=useState(false);
  const[cycShareName,setCycShareName]=useState(()=>{try{return localStorage.getItem("hcm-shareName")||"";}catch(e){return "";}});
  const[sharePhaseOverrides,setSharePhaseOverrides]=useState(()=>{try{return JSON.parse(localStorage.getItem("hcm-shareText"))||{};}catch(e){return {};}});// {phase:{blurb,kind}} — only edited phases stored
  useEffect(()=>{try{localStorage.setItem("hcm-shareText",JSON.stringify(sharePhaseOverrides));localStorage.setItem("hcm-shareName",cycShareName);}catch(e){}},[sharePhaseOverrides,cycShareName]);
  const[cycSharePronoun,setCycSharePronoun]=useState("they");
  const[cycShareCopied,setCycShareCopied]=useState(false);
  const[shareEditOpen,setShareEditOpen]=useState(false);
  const buildCycleShareUrl=()=>{
    // Build a MED-FREE cycle-position link. Only cycle geometry + optional name/pronoun.
    const payload={cycleLen:cycleLen,ovulationDay,cycleAnchor,isLunar,menstrual:isMenstrual};
    if(!isLunar&&manualCycleStart)payload.manualCycleStart=manualCycleStart;
    if(cycShareName.trim())payload.name=cycShareName.trim();
    if(cycSharePronoun&&cycSharePronoun!=="they")payload.pronoun=cycSharePronoun;
    if(sharePhaseOverrides&&Object.keys(sharePhaseOverrides).length)payload.phaseText=sharePhaseOverrides;
    return window.location.origin+window.location.pathname+"#cycle="+encodeURIComponent(JSON.stringify(payload));
  };
  useEffect(()=>{
    // If the app was opened via a shared cycle-snapshot link, decode it and show
    // the read-only recipient view. Contains NO medication data by construction.
    try{
      const h=window.location.hash||"";const key="#cycle=";
      if(h.startsWith(key)){const payload=JSON.parse(decodeURIComponent(h.slice(key.length)));if(payload&&typeof payload==="object")setCycleShare(payload);}
    }catch(e){/* malformed link — ignore */}
  },[]);
  const[calShowRef,setCalShowRef]=useState(false);
  const[previewConserve,setPreviewConserve]=useState(null);// modeler-only conserve override: null = follow the medication setting, true/false = force
  const[schedMode,setSchedMode]=useState(()=>{const sm=saved?.schedMode||(saved?.lunarLinked===false?"manual":"lunar");return sm==="weekday"||sm==="manual-no-men"?"manual":sm==="lunar"?"lunar":"manual";});// "lunar" | "manual"
  const isLunar=schedMode==="lunar";
  const[menstrualOn,setMenstrualOn]=useState(()=>{if(saved?.menstrualOn!==undefined)return saved.menstrualOn;const sm=saved?.schedMode||"lunar";return sm!=="weekday"&&sm!=="manual-no-men";});
  const isMenstrual=menstrualOn;
  const[manualCycleStart,setManualCycleStart]=useState(saved?.manualCycleStart||null);
  // Unified cycle info - single source of truth for all cycle computations
  // Lunar mode tracks the real synodic month (29d 12h 44m), not a tidy 29.5.
  // The flex tail absorbs the difference so cycles still start at midnight.
  const cycleLen=useMemo(()=>isLunar?SYN:(parseFloat(cL)||29.5),[isLunar,cL]);
  /* ── patch schedule derivations (need cycleLen) ── */
  const pa=useMemo(()=>{const out=[];
    for(const m of medications){
      if(!m.enabled||m.deliveryType!=="continuous"||m.continuousType!=="patch")continue;
      const ps=(m.pieces&&m.pieces.length)?m.pieces
        :blocksToPieces(m.doses,cycleLen,m.patchDuration||PATCH_HALF_LIFE);
      // Carry each piece's own brush. Two patch medications with different decline
      // curves can then coexist in one schedule — a fast-decaying twice-weekly for
      // sharp strokes, a slow once-weekly for broad washes — and each piece is
      // drawn with the curve it actually has instead of the first medication's.
      for(const p of ps)out.push({...p,_med:m.id,
        _pg:patchPgOf(m),
        _curve:(m.patchCurve&&m.patchCurve.length>=2)?m.patchCurve:DEF_PATCH_CURVE,
        _dur:m.patchDuration||PATCH_HALF_LIFE,
        _wash:m.patchWashout>0?m.patchWashout:PATCH_WASHOUT});
    }
    return out;},[medications,cycleLen]);
  const patchMed=medications.find(m=>m.enabled&&m.continuousType==="patch");
  const patchPg=patchPgOf(patchMed);
  const patchCurve=(patchMed?.patchCurve&&patchMed.patchCurve.length>=2)?patchMed.patchCurve:DEF_PATCH_CURVE;
  const patchPivot=patchMed?.patchPivot||1;
  const patchTaper=patchMed?.patchTaper||0;
  const patchDur=patchMed?.patchDuration||PATCH_HALF_LIFE;
  /* The rotation, the inventory and the watch all work in body LOCATIONS — the
     pool. A medication's own maxOnBody is a different number: how many pieces of
     THAT drug may be worn at once, which is what sizes its lanes. Before this
     they were one value doing both jobs, so "three on body, sixteen locations"
     could not be expressed at all. */
  const bodyLoc=bodyLocOf(medications);
  const maxOnBody=bodyLoc;              // kept as the name the seating call sites use
  const patchBudget=Math.max(1,patchMed?.monthlyPatches||14);
  const patchMaxWear=Math.min(PATCH_MAX_WEAR,patchMed?.maxWear||PATCH_MAX_WEAR);
  const actOn=patchMed?.activeHoursOn!==false;
  const actWins=activeWins(patchMed);
  const patchMedIdx=medications.findIndex(m=>m===patchMed);
  const setPieces=(next)=>{if(patchMedIdx>=0)updateMed(patchMedIdx,{pieces:next});};
  // Clear projection sandbox edits whenever the schedule/medication/cycle changes,
  // OR whenever today's patch body is edited (_patchTick) or rolls over
  // (_rolloverTick). Those changes invalidate the projection state the edits
  // were based on. (Placed AFTER cycleLen/manualCycleStart declarations to avoid TDZ.)
  useEffect(()=>{
    if(loading)return;
    setProjectionOverrides({});
  },[scheds,medications,cycleLen,manualCycleStart,calD._patchTick,calD._rolloverTick,loading]);
  const[dayViewIdx,setDayViewIdx]=useState(0);
  const[lunarDay,setLunarDay]=useState(()=>lunarDayMid());const[mL,setML]=useState(()=>monthLen());
  const[gMonth,setGMonth]=useState(new Date().getMonth());
  const[gYear,setGYear]=useState(new Date().getFullYear());
  // Minute-aligned heartbeat so the calendar chart's "now" line advances in real time.
  const[chartTick,setChartTick]=useState(0);
  const[waveScaleAmt,setWaveScaleAmt]=useState(1);
  useEffect(()=>{let to,iv;const beat=()=>setChartTick(t=>t+1);const ms=60000-(Date.now()%60000);to=setTimeout(()=>{beat();iv=setInterval(beat,60000);},ms);const onVis=()=>{if(!document.hidden)beat();};document.addEventListener("visibilitychange",onVis);window.addEventListener("focus",onVis);return()=>{clearTimeout(to);if(iv)clearInterval(iv);document.removeEventListener("visibilitychange",onVis);window.removeEventListener("focus",onVis);};},[]);
  useEffect(()=>{const iv=setInterval(()=>{const nd=lunarDayMid();const nm=monthLen();if(nd!==lunarDay){const wasToday=dayViewIdx===0;setLunarDay(nd);
      const now=new Date();if(now.getMonth()!==gMonth||now.getFullYear()!==gYear){setGMonth(now.getMonth());setGYear(now.getFullYear());}}if(nm!==mL)setML(nm);},300000);return()=>clearInterval(iv);},[lunarDay,mL,dayViewIdx,calView,gMonth,gYear]);
  const[dark,setDark]=useState(saved?.dark??true);
  const[palette,setPalette]=useState(saved?.palette||"rose");
  const[emojiStyle,setEmojiStyle]=useState(saved?.emojiStyle||"fem");
  const MOODS=emojiStyle==="masc"?MOODS_MASC:MOODS_FEM;
  const[ambientProfile,setAmbientProfile]=useState(saved?.ambientProfile||"amab");// "afab" | "amab"
  const[ambientCycleLen,setAmbientCycleLen]=useState(saved?.ambientCycleLen??29.5);
  const[ambientScale,setAmbientScale]=useState(saved?.ambientScale??1);
  const[refProfile,setRefProfile]=useState(saved?.refProfile||"female");// "female" | "male"
  const cvR=useRef(null),ovR=useRef(null),e2R=useRef([]),p4R2=useRef([]),tR=useRef([]),cuR=useRef([]),mR=useRef({xM:35,eM:100,pM:20});
  function cyclePosNow(){
    var _n=new Date(), _tf=(_n.getHours()*3600+_n.getMinutes()*60+_n.getSeconds())/86400;
    /* SYN, not a second truncated copy of it. This line used to say 29.530588,
       0.000000861 short of the module constant the rest of the app (and the
       watch) uses \u2014 enough to land on a different cycle INDEX within half a
       minute of a boundary, which is where a new moon puts you. */
    if(isLunar){ var SYNms=SYN*86400000, REF=947182440000;
      /* lunarDayMid() is 1-based (1..30). Every other surface converts with
         lunarDayFor = lunarDayMid-1 before comparing against piece days, which
         are 0-based. Without the -1 the watch ran a whole cycle-day ahead. */
      return { day: (lunarDay-1) + _tf, idx: Math.floor((Date.now()-REF)/SYNms) }; }
    if(manualCycleStart){ var diff=Math.floor((Date.now()-new Date(manualCycleStart))/86400000);
      var cl=Math.round(cycleLen)||30; return { day:(((diff%cl)+cl)%cl)+_tf, idx:Math.floor(diff/cl) }; }
    return { day:_tf, idx:0 };
  }
  function grabCurve(){ var m=mR.current||{}; if(e2R.current&&e2R.current.length){ var c={e2:e2R.current,p4:p4R2.current,eM:m.eM,pM:m.pM,
    t:tR.current||[], tM:m.tM||0, custom:cuR.current||[]}; bangleCurveRef.current=c; return c; } return bangleCurveRef.current; }
  async function loadToBangle(wipe){
    setBangleBusy(true); setBangleMsg("preparing schedule\u2026");
    try{
      var cur=grabCurve();
      if(!cur){
        var _pv=tab; if(tab!=="modeler") setTab("modeler");
        for(var _i=0; _i<40 && !(e2R.current&&e2R.current.length); _i++){ await new Promise(function(r){ setTimeout(r,25); }); }
        if(_pv!=="modeler") setTab(_pv);
        cur=grabCurve();
      }
      if(!cur){ throw new Error("open the Graph tab once, then sync"); }
      var pos=cyclePosNow();
      var payload=buildWatchPayload({
        medications, maxOnBody, blocksToPieces, slotOv:seatOv,
        places:places.place,
        /* Only the part of the sequence the watch will reach before the next
           sync: a fortnight forward and half a day back. The rest is history the
           tablet keeps. */
        seq:(places.seq||[]).filter(function(e){
          return e.ms > Date.now()-12*3600000 && e.ms < Date.now()+14*86400000; }),
        e2Series:cur.e2, p4Series:cur.p4, e2Max:cur.eM, p4Max:cur.pM,
        tSeries:cur.t, tMax:cur.tM, customSeries:cur.custom,
        cycleLen, ovulationDay, cycleAnchor,
        cycDays:cycLenNow, cycDaysPrev:cycLenPrev,
        nowCycleDay:pos.day, nowCycleIdx:pos.idx,
        // How the cycle is anchored, so the watch can recompute the cycle day the
        // SAME way rather than counting 24-hour steps away from the sync moment.
        mode:isLunar?"lunar":(manualCycleStart?"manual":"fixed"),
        manualStart:manualCycleStart?new Date(manualCycleStart).getTime():0,
        // The same snapshot the day log stores and hands to every future day.
        // makeRot reseats the rest stamps onto where the pieces ACTUALLY are, so
        // a leg you dragged travels forward exactly as the app draws it.
        rotSeed:(function(){
          /* Do not swallow this. When it returns null the watch has no idea where
             anything actually is and recomputes the rotation from scratch, which
             puts every patch in a different spot. Silent null is why that took
             three rounds to pin down. */
          try {
            var ap=pos.idx*cycleLen+pos.day;
            var r=makeRot(ap, seatOv, pos.idx, seedFor(ap));
            if(!r){ window.__pkRotWhy="makeRot returned nothing (no enabled patch med?)"; return null; }
            if(!r.st){ window.__pkRotWhy="snapshot has no stacks (st missing)"; return null; }
            if(!r.occ||!Object.keys(r.occ).length){ window.__pkRotWhy="snapshot has no occupied spots (occ empty)"; }
            window.__pkRotInfo="cyc "+r.cyc+", st "+r.st.length+", occ "+Object.keys(r.occ||{}).length;
            return r;
          } catch(e){ window.__pkRotWhy="makeRot threw: "+(e&&e.message||e); return null; }
        })(),
        theme:{bg:"#ff0000",e2:"#ff00ff",p4:"#00ffff",fg:"#ffffff",accent:"#ffff00"},
        curveN:150,
      });
      var _sg=payload.singles||[], _nt=_sg.filter(function(s){return !s.vague;}).length;
      var _pc=payload.pieces||[];
      setBangleMsg("choose your watch in the Bluetooth prompt\u2026");
      await transferToWatch(payload, WATCH_APP_SRC, { asDefaultClock:true, wipeFirst:!!wipe });
      var _dr=(payload.curve&&payload.curve.dropped)|0;
      if(_dr) setBangleMsg("heads up \u2014 the watch graph shows 6 curves; "+_dr+" more "+(_dr>1?"were":"was")+" left off. Everything else transferred in full.");
      var _rw=window.__pkRotWhy, _ri=window.__pkRotInfo;
      setBangleMsg("done \u2714  "+_sg.length+" doses ("+_nt+" with clock times), "+_pc.length+" patch pieces"
        +("; "+(Object.keys(payload.ov||{}).length ? Object.keys(payload.ov).length+" spot override(s) sent" : "no spot overrides"))
        +(payload.rot ? "; forward rotation seeded ("+(_ri||"?")+")"
                      : "; NO BODY POSITIONS \u2014 "+(_rw||"reason unknown")+". Patches on the watch will be in the wrong spots; tell Claude this message.")
        +" \u2014 you can leave the tablet");
    }catch(e){ setBangleMsg((e&&e.message)||"transfer failed \u2014 is the watch on and unlocked?"); }
    setBangleBusy(false);
  }
  function openBangleTool(){ var op=!bangleOpen; setBangleOpen(op); if(op && !grabCurve() && tab!=="modeler"){ var pv=tab; setTab("modeler"); setTimeout(function(){ if(pv!=="modeler") setTab(pv); }, 350); } }
  const calCvR=useRef(null);
  const[affirmOn,setAffirmOn]=useState(saved?.affirmOn??true);
  const[lutealAffirm,setLutealAffirm]=useState(saved?.lutealAffirm??false);
  const[affirmMsgs,setAffirmMsgs]=useState(()=>ld("hcm-affirm")||[...DEF_MSGS]);
  const[affirmEdit,setAffirmEdit]=useState(false);
  // curvePanel removed — was from old 5-panel system
  useEffect(()=>{try{localStorage.setItem("hcm-affirm",JSON.stringify(affirmMsgs));}catch(e){}},[affirmMsgs]);
  const ldS=useCallback((s,keepIdx)=>{setMedications(s.medications||[]);setCR(s.cycleRepeat||1);setCL(s.cycleLength||29.5);setSD(s.showDays||35);
    // Migrate legacy menShift if a schedule was saved before the
    // ovulationDay refactor. New schedules carry ovulationDay directly.
    if(s.ovulationDay!==undefined){setOvulationDay(s.ovulationDay);}
    else{const cl=s.cycleLength||29.5;setOvulationDay(Math.max(2,Math.min(Math.round(cl)-1,defaultOvulationDay(cl)+(s.menShift??0))));}
    setCycleAnchor(s.cycleAnchor??0);
    if(!keepIdx)setActiveMedIdx(0);else setActiveMedIdx(p=>Math.min(p,Math.max(0,(s.medications||[]).length-1)));},[]);
  useEffect(()=>{setLoading(false);
    try{localStorage.removeItem("hcm-curves");}catch(e){}
    try{const cal=ld(K.cl);if(cal?.events){const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);const cutStr=localDateKey(cutoff);
      const pruned=cal.events.filter(ev=>ev.recurrence!=="once"||!ev.date||ev.date>=cutStr);
      if(pruned.length!==cal.events.length){cal.events=pruned;sv(K.cl,cal);}}}catch(e){}
  },[]);

  // Patch body rollover — runs on load, then aligned to each minute boundary
  // (same heartbeat as the Clock component, so the day-view and the clock
  // update in the same render when midnight crosses).
  const rolloverRef=useRef(null);
  // Undo history
  const histRef=useRef([]);const histIdx=useRef(-1);const undoTimer=useRef(null);
  const snap=useCallback(()=>{
    if(loading)return;
    const{_patchTick,_rolloverTick,...calDClean}=calD;
    const s=JSON.stringify({sc:scheds,cl:calDClean,si});
    const h=histRef.current;
    if(h.length>0&&h[histIdx.current]===s)return;
    histRef.current=h.slice(0,histIdx.current+1);
    histRef.current.push(s);
    if(histRef.current.length>50)histRef.current.shift();
    histIdx.current=histRef.current.length-1;
  },[scheds,calD,si,loading]);
  // Immediate snap — call before a destructive action so undo has a pre-change state
  const snapNow=useCallback(()=>{clearTimeout(undoTimer.current);snap();},[snap]);
  useEffect(()=>{document.title="Palace of Power";const id=setTimeout(()=>{document.title="Palace of Power";},100);return()=>clearTimeout(id);},[tab]);
  useEffect(()=>{if(loading)return;clearTimeout(undoTimer.current);undoTimer.current=setTimeout(snap,500);},[scheds,calD,si,loading]);
  useEffect(()=>{
    const handler=e=>{
      const undo=(e.ctrlKey||e.metaKey)&&e.key==="z";
      const redo=(e.ctrlKey||e.metaKey)&&e.key==="y";
      if(undo||redo){
        // If focus is in a text input/textarea, let the browser handle native
        // text undo/redo. Otherwise the global undo restores app state and
        // the input loses focus → focus jumps to the next focusable element
        // (often the next sub-tab button), making it look like we got "booted"
        // to a different sub-tab.
        const inText=e.target&&e.target.matches&&e.target.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="color"]),textarea');
        if(inText)return;// browser handles native undo
        e.preventDefault();
        const h=histRef.current;
        if(undo){if(histIdx.current<=0)return;histIdx.current--;}
        else{if(histIdx.current>=h.length-1)return;histIdx.current++;}
        try{const s=JSON.parse(h[histIdx.current]);setScheds(s.sc);setCalD(s.cl);setSi(s.si);ldS(s.sc[Math.min(s.si,s.sc.length-1)]||DS,true);}catch(e){}
        return;
      }
      // Tab key switches modeler/calendar (only when not in an input)
      if(e.key==="Tab"&&!e.target.closest("input,textarea,select")){
        e.preventDefault();
        setTab(t=>t==="modeler"?"calendar":"modeler");
        return;
      }
      // Arrow keys navigate schedules (only when not in an input)
      if((e.key==="ArrowLeft"||e.key==="ArrowRight")&&!e.target.closest("input,textarea,select,canvas")){
        e.preventDefault();
        if(e.key==="ArrowLeft")setSi(p=>{const n=Math.max(0,p-1);ldS(scheds[n]);return n;});
        else setSi(p=>{const n=Math.min(scheds.length-1,p+1);ldS(scheds[n]);return n;});
      }
    };
    window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);
  },[ldS,scheds]);
  useEffect(()=>{if(loading)return;setScheds(p=>{const i=Math.min(si,p.length-1);const u=[...p];u[i]={...u[i],medications,cycleRepeat:cR,cycleLength:cL,showDays:sD,ovulationDay,cycleAnchor};return u;});},[medications,cR,cL,sD,ovulationDay,cycleAnchor,loading]);
  // Lazily assign stable _id to any dose that doesn't have one. Runs once
  // per medications change; the early-return check prevents infinite loops
  // (after the first pass every dose has an id, so the inner map returns
  // the same medications array → React's setState bail-out kicks in).
  useEffect(()=>{if(loading)return;
    let changed=false;
    const next=medications.map(m=>{const ds=m.doses||[];let mChanged=false;
      const newDs=ds.map(d=>{if(d._id)return d;mChanged=true;return{...d,_id:uid()};});
      if(!mChanged)return m;
      changed=true;return{...m,doses:newDs};
    });
    if(changed)setMedications(next);
  },[medications,loading]);
  /* ═══ SEPARATION, APPLIED TO SCHEDULES THAT PREDATE IT ═══ */
  /* The five-minute rule was only ever enforced at the moment a piece was drawn
     or resized, so every schedule saved before it still carries whatever
     collisions it was drawn with — a removal and an application on the same
     minute, which is precisely the tie the watch and the app can order
     differently. Enforcing it only for new edits left the schedules that
     actually matter untouched.

     This runs the same sweep over what is already stored. It settles in one
     pass: separatePieces hands back the original array when nothing needs to
     move, so once a schedule is clean this effect does nothing at all. */
  const[sepNote,setSepNote]=useState(null);
  useEffect(()=>{if(loading)return;
    /* Across ALL patch medications at once. Running it per medication left the
       one collision the rule exists to prevent: a removal from one drug landing
       on the same minute as an application of another. Both devices would then
       be free to order them differently and hand out the same spot twice.

       Every piece from every patch medication goes into one list, remembers
       where it came from, gets swept, and goes home. Order is preserved by
       separatePieces, so the way back is by index. */
    const flat=[],from=[];
    medications.forEach((m,mi)=>{
      if(m.deliveryType!=="continuous"||m.continuousType!=="patch")return;
      (m.pieces||[]).forEach((p,pi)=>{flat.push(p);from.push([mi,pi]);});
    });
    if(flat.length<2)return;
    if(eventsSeparated(flat,cycleLen))return;
    const fixed=separatePieces(flat,cycleLen,PATCH_MAX_WEAR,null);
    if(fixed===flat)return;
    let moved=0;
    const next=medications.map(m=>m);
    const touched={};
    fixed.forEach((p,i)=>{
      const [mi,pi]=from[i],q=flat[i];
      if(Math.abs((+p.day)-(+q.day))<1e-9&&Math.abs((+p.wear)-(+q.wear))<1e-9)return;
      moved++;
      if(!touched[mi]){touched[mi]=true;next[mi]={...next[mi],pieces:[...next[mi].pieces]};}
      next[mi].pieces[pi]={...q,day:p.day,wear:p.wear};
    });
    if(moved){setMedications(next);setSepNote({n:moved,at:Date.now()});}
  },[medications,cycleLen,loading]);
  /* ═══ THE ONLY COPY ═══
     localStorage holds the only copy of her schedules. This effect used to
     write whatever `scheds` happened to be the moment `loading` went false —
     and if the app threw while starting up, that was the built-in default, which
     then overwrote everything she had. A render bug became data loss.

     Two refusals, both cheap:
       - never write an empty or missing list;
       - on the FIRST write after a load, never write a list SHORTER than the one
         already stored. A real deletion still works, because by then a first
         write has happened and the guard has stood down. A failed load cannot
         get past it, because it never wrote anything to begin with.
     This does not fix a crash. It stops a crash from costing her her data. */
  const schedWrote=useRef(false);
  useEffect(()=>{
    if(loading)return;
    if(!Array.isArray(scheds)||!scheds.length)return;
    if(!schedWrote.current){
      try{
        const prev=JSON.parse(localStorage.getItem(K.sc)||"null");
        if(Array.isArray(prev)&&prev.length>scheds.length){
          console.warn("PalaceOfPower: refusing to overwrite "+prev.length
            +" saved schedules with "+scheds.length+" — the load did not complete.");
          return;
        }
      }catch(e){}
      schedWrote.current=true;
    }
    sv(K.sc,scheds);
  },[scheds,loading]);
  useEffect(()=>{if(!loading)sv(K.st,{schedIdx:si,sRef,sE2,sP4,sE2Ref,sP4Ref,refMult,showFLH,showT,tBaseline,tFloor,affirmOn,lutealAffirm,tab,showMen,calView,focusMode,schedMode,menstrualOn,manualCycleStart,dark,palette,emojiStyle,patchDisplay,patchAgingViz,ambientProfile,ambientCycleLen,ambientScale,ambientOvulationDay,ambientCycleAnchor,refProfile,customRefLen,refLen});},[si,sRef,sE2,sP4,sE2Ref,sP4Ref,refMult,showFLH,showT,tBaseline,tFloor,affirmOn,lutealAffirm,tab,showMen,calView,focusMode,schedMode,menstrualOn,manualCycleStart,dark,palette,emojiStyle,patchDisplay,patchAgingViz,ambientProfile,ambientCycleLen,ambientScale,ambientOvulationDay,ambientCycleAnchor,refProfile,customRefLen,refLen,loading]);
  useEffect(()=>{
    if(loading)return;
    // Strip ephemeral re-render triggers before persisting; they're transient state
    // for forcing component re-renders, not real data.
    const{_patchTick,_rolloverTick,...persistable}=calD;
    sv(K.cl,persistable);
  },[calD,loading]);
  // Prune old medChecks and patchOverrides entries (keep only last ~90 days)
  useEffect(()=>{
    try{localStorage.removeItem("hcm-curves");}catch(e){}
    if(loading)return;
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);const cs=localDateKey(cutoff);
    let changed=false;const u={...calD};
    // Prune medChecks
    if(u.medChecks){const checks={...u.medChecks};const old=Object.keys(checks).filter(k=>k.slice(0,10)<cs);if(old.length>0){for(const k of old)delete checks[k];u.medChecks=checks;changed=true;}}
    // Prune patch overrides older than 90 days
    if(u.patchOverrides){const ov={...u.patchOverrides};const old2=Object.keys(ov).filter(k=>k.split(":")[0]<cs);if(old2.length>0){for(const k of old2)delete ov[k];u.patchOverrides=ov;changed=true;}}
    // Cap patch storage inventory at 20 pieces (trim oldest first)
    if(u.patchStorageInv&&u.patchStorageInv.length>20){u.patchStorageInv=u.patchStorageInv.slice(-20);changed=true;}
    if(changed)setCalD(u);
  },[]); // run once on mount
  const goTo=i=>{const c=Math.max(0,Math.min(i,scheds.length-1));setSi(c);ldS(scheds[c]);setEn(false);};
  const addSc=()=>{const n={...DS,name:`Sched ${scheds.length+1}`,medications:[]};setScheds(p=>[...p,n]);setSi(scheds.length);ldS(n);};
  const dupSc=()=>{const c=scheds[si];setScheds(p=>[...p,{...c,name:c.name+" copy",medications:(c.medications||[]).map(m=>({...m,id:uid(),doses:(m.doses||[]).map(d=>({...d})),points:(m.points||[]).map(p=>({...p})),pk:{...(m.pk||{})},pieces:(m.pieces||[]).map(p=>({...p,_id:uid()})),activeWindows:(m.activeWindows||[]).map(w=>({...w})),patchCurve:(m.patchCurve||[]).map(p=>({...p}))}))}]);setSi(scheds.length);};
  const delSc=()=>{if(scheds.length<=1)return;snapNow();const u=scheds.filter((_,i)=>i!==si);setScheds(u);const ni=Math.min(si,u.length-1);setSi(ni);ldS(u[ni]);};
  const rnSc=n=>setScheds(p=>{const u=[...p];u[si]={...u[si],name:n};return u;});
  /* Shift all dose schedules in the active schedule by `days` days. Positive
     shifts forward, negative backward. Patch doses that wrap the cycle boundary
     are split into two pieces (one ending at cycleLen, one starting at 0).
     Single-day doses (injections, oral, P4) just have their `day` shifted modulo
     cycleLen. Resets the input to 0 after applying. Snapshots for undo. */
  const applyDoseShift=()=>{
    const days=parseFloat(doseShiftDays)||0;
    if(days===0)return;
    // Use the unified cycleLen, which is 29.5 in lunar mode regardless of cL.
    // If we used cL here and cL got stale, the modular arithmetic would not
    // match the chart's multi-cycle expansion (which uses cycleLen).
    const cl=parseFloat(cycleLen)||29.5;
    if(cl<=0)return;
    if(!confirm(`Shift all doses ${days>0?"+":""}${days} days?\n\nThis will move every scheduled dose for every medication. Patch doses that wrap past the end of your cycle will be split into two pieces.`))return;
    snapNow();
    const posMod=(x,m)=>((x%m)+m)%m;
    // Single-dose `day` values are integers ("day 5", "day 27"), so wrapping
    // them by a fractional cycleLen (29.5 in lunar mode) was producing
    // half-day artifacts: a day-27 dose shifted +3 days became
    // posMod(30, 29.5) = 0.5. We mod single-dose days by the rounded cycle
    // length so they always land on integer days. Patches stay fractional —
    // their startDay/endDay are already fractional-aware.
    const clInt=Math.max(1,Math.round(cl));
    const shiftMed=(m)=>{
      const newDoses=[];
      for(const d of(m.doses||[])){
        // Patch dose: has startDay/endDay
        if(d.startDay!==undefined&&d.endDay!==undefined){
          const sd=parseFloat(d.startDay)||0;
          const ed=parseFloat(d.endDay)||0;
          const dur=Math.max(0,ed-sd);
          const newSd=posMod(sd+days,cl);
          const newEdRaw=newSd+dur;
          if(newEdRaw<=cl+0.0001){
            // No wrap — single piece
            newDoses.push({...d,startDay:newSd,endDay:Math.min(newEdRaw,cl)});
          }else{
            // Wraps the boundary — represent as a SINGLE dose with endDay > cycleLen.
            // The chart's cycle expansion handles this naturally: each piece is
            // offset by cyc*cycleLen, so the dose's tail in cycle 0 (e.g. days
            // 28-31 for a [27,31] piece in a 29.5-day cycle) renders correctly.
            // No split = no seam = no taper artifacts.
            newDoses.push({...d,startDay:newSd,endDay:newEdRaw});
          }
        }else if(d.day!==undefined){
          // Single-day dose: injection, oral, etc. Mod by integer cycle length.
          newDoses.push({...d,day:posMod((parseFloat(d.day)||0)+days,clInt)});
        }else{
          // Unknown shape — pass through unchanged
          newDoses.push({...d});
        }
      }
      return{...m,doses:newDoses};
    };
    setMedications(p=>p.map(shiftMed));
    setDoseShiftDays(0);
  };
  /* Multiply all doses of the active medication by `factor`. For patches,
     each dose's `count` is snapped to the nearest valid 1/12th increment
     (since patch material comes in 12ths). For non-patch (mg) doses, the
     result keeps up to 3 decimal places, or floors to a whole mg if
     `doseMultFloor` is true. Snapshots for undo, prompts for confirmation,
     and resets the multiplier to 1 after applying. */
  const applyDoseMult=()=>{
    if(!activeMed)return;
    const factor=parseFloat(doseMult);
    if(!isFinite(factor)||factor<=0||Math.abs(factor-1)<1e-9)return;
    const isPatch=activeMed.deliveryType==="continuous"&&activeMed.continuousType==="patch";
    const floor=!!doseMultFloor;
    const doses=activeMed.doses||[];
    if(doses.length===0)return;
    // Build a preview of the new values for the confirm dialog
    const previewLines=[];
    const newDoses=doses.map(d=>{
      if(isPatch){
        const cur=parseFloat(d.count)||0;
        const raw=cur*factor;
        // snapPatch rounds to the nearest valid 12th increment
        const next=snapPatch(raw);
        previewLines.push(`  d${d.startDay}-${d.endDay}: ×${patchFracTotal(cur)} → ×${patchFracTotal(next)}`);
        return{...d,count:next};
      }else{
        const cur=parseFloat(d.dose)||0;
        let raw=cur*factor;
        let next;
        if(floor){next=Math.floor(raw);}
        else{next=Math.round(raw*1000)/1000;}
        previewLines.push(`  d${d.day}: ${cur}mg → ${next}mg`);
        return{...d,dose:next};
      }
    });
    const head=`Multiply all "${activeMed.name}" doses by ${factor}${floor&&!isPatch?" (round down)":""}?\n\n`;
    // Cap preview to keep dialog reasonable
    const maxLines=15;
    const preview=previewLines.length>maxLines
      ?previewLines.slice(0,maxLines).join("\n")+`\n  ...and ${previewLines.length-maxLines} more`
      :previewLines.join("\n");
    if(!confirm(head+preview))return;
    snapNow();
    updateMed(activeMedIdx,{doses:newDoses});
    setDoseMult(1);
    setDoseMultFloor(false);
  };
  // === DOSE SORTING + STABLE IDS =============================================
  // Doses are React-keyed by a stable `_id` so reorders during edits don't
  // confuse input focus or commit targets. A previously-reported bug —
  // "edited the 0.5 dose and the day-29 dose disappeared" — was caused by
  // sorting + index-keyed rows: NI's onBlur committed to whichever dose now
  // sat at the original index, silently overwriting an unrelated dose.
  //
  // Drafts: newly-added doses get `_draft: true` so they don't participate
  // in sorting (and instead stay at the bottom in insertion order) until the
  // user clicks Apply. This prevents a half-filled new dose from jumping
  // around the list as the user types each field.
  const ensureDoseIds=(doses)=>{if(!doses||doses.length===0)return doses;
    let needs=false;for(const d of doses){if(!d._id){needs=true;break;}}
    if(!needs)return doses;
    return doses.map(d=>d._id?d:{...d,_id:uid()});
  };
  // Single-dose sort: by `day`. Drafts sink to the bottom in original order.
  const sortD=a=>{const drafts=a.filter(d=>d._draft);const live=a.filter(d=>!d._draft);
    live.sort((x,y)=>(parseFloat(x.day)||0)-(parseFloat(y.day)||0));
    return[...live,...drafts];};
  // Patch sort: by `startDay`, then `endDay` (so overlaps cluster). Drafts
  // sink to the bottom in original order.
  const sortP=a=>{const drafts=a.filter(d=>d._draft);const live=a.filter(d=>!d._draft);
    live.sort((x,y)=>{const dx=(parseFloat(x.startDay)||0)-(parseFloat(y.startDay)||0);if(dx!==0)return dx;return(parseFloat(x.endDay)||0)-(parseFloat(y.endDay)||0);});
    return[...live,...drafts];};
  // === EXPORT/IMPORT HELPERS =================================================
  // These two helpers are the single source of truth for what a "settings"
  // payload contains. Keeping them DRY guarantees that JSON export, JSON
  // import, share-string export, and share-string import all stay in sync —
  // historically these four paths drifted (share-string only carried 4 of the
  // ~16 fields the JSON path handled).
  // View-only state (tab, calView, focusMode, showMen) is intentionally NOT
  // exported: importing on a different device shouldn't slam you into the
  // exporter's UI mode.
  /* One writer for the chime, used by every import path. The state alone would
     be forgotten on the next reload, so localStorage is written with it — the
     same pair the toggle writes. */
  /* {n, at} — the count last entered and the moment it was entered. Everything
     else is derived from those two plus the schedule. */
  /* medication id -> {n, at}: the count last entered for that patch and when.
     Per medication, because two patches are two boxes in the drawer that run out
     on their own schedules. Remaining is always derived from those two plus that
     medication's schedule. The older single-value format is read once and
     adopted by the first patch medication so an existing count is not lost. */
  const[patchStock,setPatchStock]=useState(()=>{
    try{
      const o=JSON.parse(localStorage.getItem("hcm-patchstock")||"null");
      if(o&&typeof o==="object"){
        if(o.n>0&&o.at!==undefined)return{__legacy:{n:+o.n,at:+o.at||Date.now()}};
        const out={};
        for(const k in o)if(o[k]&&o[k].n>0)out[k]={n:+o[k].n,at:+o[k].at||Date.now()};
        return out;
      }
    }catch(e){}
    return{};});
  const savePatchStock=(next)=>{
    setPatchStock(next);
    try{localStorage.setItem("hcm-patchstock",JSON.stringify(next));}catch(e){}
  };
  const[stockEdit,setStockEdit]=useState(null);   // {id, value} while typing
  /* ═══ THE PERSISTENT ALARM ═══
     A short ping is fine for a patch. Progesterone has a half-life measured in
     hours, and a missed dose at 6am is a real gap — so some medications get an
     alarm that keeps sounding until it is acknowledged, and gives up after
     fifteen minutes rather than running until the battery dies.

     Per medication: `alarmMode` is "short" (a ping), "long" (persistent) or
     "off". `alarmTone` picks the voice. Both live on the medication, so they
     travel with the schedule. */
  const ALARM_MINUTES=15;
  /* ═══ A LOG, BECAUSE WE HAVE BEEN GUESSING ═══
     Three times now a sound has not played and neither of us could say why: the
     evidence disappears the moment it fails. Every decision the trigger makes is
     recorded here — what was due, whether it sounded, and what state the audio
     context was in at that instant — so the next report is data instead of
     recollection. Kept in localStorage so it survives the reload that usually
     follows "it didn't go off". */
  const logRef=useRef(null);
  useEffect(()=>{_soundNote=(w,x)=>alog(w,x);return()=>{_soundNote=null;};});
  const alog=(what,extra)=>{
    try{
      const row={t:Date.now(),w:what,x:extra||""};
      const prev=logRef.current||JSON.parse(localStorage.getItem("hcm-soundlog")||"[]");
      const next=[...prev,row].slice(-60);
      logRef.current=next;
      localStorage.setItem("hcm-soundlog",JSON.stringify(next));
    }catch(e){}
  };
  /* On by default: not knowing whether you took it is the reason the alarm
     exists, so silencing it should answer that. Off is for anyone who would
     rather tick the box themselves. Patches are never ticked either way — they
     have no checkbox, they live in the inventory. */
  const[tickOnSilence,setTickOnSilence]=useState(()=>{
    try{return localStorage.getItem("hcm-autotick")!=="no";}catch(e){return true;}});
  /* An alarm that rang for fifteen minutes and got no answer is EVIDENCE, and
     throwing it away is the whole problem coming back: an unticked box looks
     identical to a dose that is not due yet. So an unanswered alarm is kept, and
     asked about later, when you are awake enough to know. */
  const[missed,setMissed]=useState(()=>{
    try{const a=JSON.parse(localStorage.getItem("hcm-missed")||"[]");
      return Array.isArray(a)?a:[];}catch(e){return[];}});
  const saveMissed=(next)=>{
    /* Anything older than three days is no longer a question worth answering. */
    const cut=Date.now()-3*86400000;
    const keep=next.filter(x=>x&&x.at>cut).slice(-12);
    setMissed(keep);
    try{localStorage.setItem("hcm-missed",JSON.stringify(keep));}catch(e){}
  };
  const noteMissed=(a)=>{
    if(!a)return;
    saveMissed([...missed,{id:(a.med.id||a.med.name)+":"+Math.round(a.at/60000),
      name:a.med.name,dose:a.dose,unit:a.unit,at:a.at}]);
  };
  /* Today's date, as a value that CHANGES when midnight passes.
     Nothing else in this component is on a timer — chartTick is never
     incremented — so without this the missed banner would keep offering "I took
     it" for yesterday's alarm until something unrelated happened to re-render.
     Re-armed after each fire rather than on an interval, so it tracks local
     midnight through DST. A backgrounded tab's timers get throttled hard, so
     coming back to the tab re-checks rather than trusting the timer landed. */
  const[todayKeyLive,setTodayKeyLive]=useState(()=>localDateKey());
  useEffect(()=>{
    let id=null,dead=false;
    const arm=()=>{
      if(dead)return;
      const n=new Date();
      const nx=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,2);
      id=setTimeout(()=>{setTodayKeyLive(localDateKey());arm();},Math.max(1000,nx-n));
    };
    arm();
    const vis=()=>{if(document.visibilityState==="visible")setTodayKeyLive(localDateKey());};
    document.addEventListener("visibilitychange",vis);
    return()=>{dead=true;if(id)clearTimeout(id);
      document.removeEventListener("visibilitychange",vis);};
  },[]);
  /* The unlock machinery that lived here went with the shared context. A
     context created fresh, in response to a timer, on a page the user has
     already touched at some point, starts running — which is how this app
     behaved for months before I interfered. */
  /* ═══ AUDIBLE-BUT-INAUDIBLE KEEP-ALIVE (her idea, and a good one) ═══
     Chrome exempts a page from background timer throttling while it is making
     AUDIBLE noise, and explicitly does NOT count a silent track. So the trick is
     not silence — it is sound quiet enough that you never hear it.

     A ~30 Hz sine is the right shape. Chrome measures the audio STREAM, where the
     tone is at full amplitude and plainly audible to it, while a tablet speaker
     is physically incapable of reproducing 30 Hz and emits essentially nothing.
     Loud to the browser, silent to the room.

     I could not find a documented amplitude threshold, so this does not claim to
     work: Chrome shows the tab SPEAKER ICON exactly when it considers a tab
     audible, which makes it self-verifying. Turn it on, look at the tab. Icon
     means the exemption applies. No icon means turn the level up.

     Its own context, separate from the sound paths, so nothing that happens to
     it can affect an actual alarm. */
  const[keepAudible,setKeepAudible]=useState(()=>{
    try{return localStorage.getItem("hcm-keepaudible")==="yes";}catch(e){return false;}});
  const[keepLevel,setKeepLevel]=useState(()=>{
    try{return parseFloat(localStorage.getItem("hcm-keeplevel"))||0.02;}catch(e){return 0.02;}});
  const keepRef=useRef(null);
  useEffect(()=>{
    if(!keepAudible)return;
    let ctx=null,osc=null,gain=null,dead=false;
    const start=()=>{
      if(dead||ctx)return;
      try{
        ctx=newCtx(); if(!ctx)return;
        osc=ctx.createOscillator(); gain=ctx.createGain();
        osc.type="sine"; osc.frequency.setValueAtTime(30,ctx.currentTime);
        gain.gain.setValueAtTime(keepLevel,ctx.currentTime);
        osc.connect(gain); gain.connect(ctx.destination); osc.start();
        keepRef.current=ctx;
        alog("keep-alive tone ON","30Hz at "+keepLevel+", ctx "+ctx.state);
      }catch(e){alog("keep-alive FAILED",String(e&&e.message||e));}
    };
    start();
    /* If it could not start without a gesture, start on the first one. */
    const onTouch=()=>{start();if(ctx&&ctx.state==="suspended"){try{ctx.resume();}catch(e){}}};
    window.addEventListener("pointerdown",onTouch);
    const vis=()=>{if(document.visibilityState==="visible"&&ctx&&ctx.state!=="running")
      {try{ctx.resume();}catch(e){}}};
    document.addEventListener("visibilitychange",vis);
    return()=>{dead=true;
      window.removeEventListener("pointerdown",onTouch);
      document.removeEventListener("visibilitychange",vis);
      try{if(osc)osc.stop();}catch(e){}
      try{if(ctx)ctx.close();}catch(e){}
      keepRef.current=null;
      alog("keep-alive tone OFF");};
  },[keepAudible,keepLevel]);
  /* Keeps the screen awake, for the tablet-on-a-shelf case. Off by default:
     a screen that never sleeps is not what you want in a bedroom. */
  const[keepAwake,setKeepAwake]=useState(()=>{
    try{return localStorage.getItem("hcm-wakelock")==="yes";}catch(e){return false;}});
  useEffect(()=>{
    if(!keepAwake)return;
    let lock=null,dead=false;
    const get=async()=>{
      try{
        if(navigator.wakeLock&&document.visibilityState==="visible"&&!dead)
          lock=await navigator.wakeLock.request("screen");
      }catch(e){}
    };
    get();
    const vis=()=>{if(document.visibilityState==="visible")get();};
    document.addEventListener("visibilitychange",vis);
    return()=>{dead=true;document.removeEventListener("visibilitychange",vis);
      try{if(lock)lock.release();}catch(e){}};
  },[keepAwake]);
  const[alarm,setAlarm]=useState(null);        // {med, kind, at, dose, unit, route}
  const alarmAudio=useRef(null);
  /* Runs the loop for as long as an alarm is up. Kept in one effect so there is
     exactly one place that can start or stop a sound. */
  useEffect(()=>{
    if(!alarm)return;
    let stop=false,ctx=null,timer=null;
    try{
      {
        ctx=newCtx();
        alarmAudio.current=ctx;
        alog("alarm START: "+alarm.med.name,ctx?("ctx "+ctx.state):"no AudioContext");
        const tone=alarm.med.alarmTone||"chime";
        const loop=()=>{
          if(stop||!ctx)return;
          let len=0.6;
          try{
            if(ctx.state!=="running"){try{ctx.resume();}catch(e){}}
            /* Only schedule when the clock is actually MOVING. Notes queued into
               a suspended context all land on the same instant and fire together
               the moment it resumes \u2014 one deafening chord instead of a pulse.
               If it is not running, stay quiet and try again next time. */
            if(ctx.state==="running")len=playTone(ctx,tone,ctx.currentTime+0.02,0.22);
            else alog("alarm pulse SKIPPED","ctx "+ctx.state);
          }catch(e){}
          timer=setTimeout(loop,(len+0.55)*1000);
        };
        loop();
      }
    }catch(e){}
    /* Gives up on its own. An alarm nobody silenced should not still be going
       when you get home. */
    const giveUp=setTimeout(()=>{noteMissed(alarm);setAlarm(null);},ALARM_MINUTES*60000);
    return()=>{
      stop=true;
      if(timer)clearTimeout(timer);
      clearTimeout(giveUp);
      try{if(ctx)ctx.close();}catch(e){}
      alarmAudio.current=null;
    };
  },[alarm]);
  /* Dismissing ticks the dose. The whole reason for the alarm is not knowing
     whether you took it, so silencing it has to answer that question too —
     otherwise you are back to guessing an hour later.
     If the medication cannot be matched unambiguously in today's list the alarm
     still dismisses but nothing is ticked, because a wrong tick is worse than
     no tick. */
  const dismissAlarm=(taking)=>{
    const a=alarm;
    setAlarm(null);
    /* Silenced without saying you took it is exactly as unresolved as never
       hearing it, so it is remembered the same way. */
    if(a&&!taking){noteMissed(a);return;}
    if(!a||!taking)return;
    if(tickOnSilence)tickDoseFor(a.med,new Date(a.at),a.dose);
  };
  /* Which line in today's list is THIS dose?
     The medication name alone is not enough: progesterone is taken morning AND
     evening, so the name matches twice and the old rule — tick nothing when
     ambiguous — meant the medication that most needed this got nothing at all.
     Three signals, narrowest first. The entries read like
     "Progesterone (rectal) 10mg 6:00 am", so both the amount and the clock time
     are there to be read. If it is still ambiguous after all three, tick nothing:
     a wrong tick tells you a lie about a dose. */
  const matchDoseRow=(med,when,dose)=>{
    try{
      const today=new Date();
      const di=getCycleDay(today);
      const list=getMeds(di,sc,today).meds||[];
      const nm=(med&&med.name||"").trim();
      if(!nm)return null;
      let hits=[];
      list.forEach((m,idx)=>{
        if(m.startsWith("\u{1FA79}"))return;              // patches have no checkbox
        if(m.indexOf(nm)>=0)hits.push(idx);
      });
      if(hits.length>1&&dose>0){
        const byDose=hits.filter(i=>new RegExp("(^|\\s)"+dose+"mg(\\s|$)").test(list[i]));
        if(byDose.length)hits=byDose;
      }
      if(hits.length>1&&when){
        /* Closest clock time wins. The alarm fires within a minute or two of the
           dose, so the right line is the nearest one — and ninety minutes is a
           generous bound that still cannot confuse morning with evening. */
        const mins=(txt)=>{
          const t=/(\d{1,2}):(\d{2})\s*(am|pm)\s*$/i.exec(txt);
          if(!t)return null;
          let h=(+t[1])%12; if(/pm/i.test(t[3]))h+=12;
          return h*60+(+t[2]);
        };
        const now=when.getHours()*60+when.getMinutes();
        let best=null,bd=91;
        for(const i of hits){
          const mm=mins(list[i]); if(mm===null)continue;
          let d=Math.abs(mm-now); if(d>720)d=1440-d;      // across midnight
          if(d<bd){bd=d;best=i;}
        }
        if(best!==null)hits=[best];
      }
      if(hits.length!==1)return null;                     // still ambiguous: do not guess
      return{idx:hits[0],dateKey:localDateKey(today)};
    }catch(e){return null;}
  };
  /* Has this dose ALREADY been ticked off by hand?
     The alarm exists because she does not know whether she took it. If she
     does know — because she ticked the box at 8:40 for a 9:00 dose — then the
     alarm has nothing left to tell her and should stay quiet.
     The asymmetry with ticking is deliberate. When the row cannot be matched
     unambiguously this returns false, so the alarm SOUNDS. A redundant alarm
     is a nuisance; a silent one is the failure mode this whole feature exists
     to prevent. Guessing is only ever allowed to make it ring, never to make
     it stay quiet. */
  const doseAlreadyTicked=(med,when,dose)=>{
    const hit=matchDoseRow(med,when,dose);
    if(!hit)return false;
    const cd=calDRef.current||{};
    return!!(cd.medChecks||{})[`${hit.dateKey}-${hit.idx}`];
  };
  /* Ticks the box for a dose. Only ever for TODAY: the checkbox keys are
     date-stamped and the list it resolves against is today's list, so an
     answer about yesterday would land on today's row and assert a dose that
     has not happened yet. Past days have no checkbox to tick at all, so there
     is nothing to do but refuse — see the stale branch of the missed banner,
     which stops asking the question once it can no longer be answered. */
  const tickDoseFor=(med,when,dose)=>{
    if(when&&localDateKey(when)!==localDateKey())return false;
    const hit=matchDoseRow(med,when,dose);
    if(!hit)return false;
    try{
      const u={...calD}; if(!u.medChecks)u.medChecks={};
      const pruned={...u.medChecks};
      pruned[`${hit.dateKey}-${hit.idx}`]=true;
      u.medChecks=pruned; setCalD(u);
      return true;
    }catch(e){return false;}
  };
  const applyChime=(v)=>{
    if(v===undefined||v===null)return;
    setChimeOn(!!v);
    try{localStorage.setItem("hcm-chime",v?"yes":"no");}catch(e){}
  };
  const buildSettings=()=>({
    sRef,sE2,sP4,sE2Ref,sP4Ref,refMult,showFLH,showT,
    tBaseline,tFloor,
    ambientProfile,ambientCycleLen,ambientScale,ambientOvulationDay,ambientCycleAnchor,
    refProfile,customRefLen,refLen,
    palette,dark,schedMode,emojiStyle,patchDisplay,patchAgingViz,
    menstrualOn,affirmOn,lutealAffirm,manualCycleStart,
    /* The dose chime travels with the settings. It is a medication alarm, so a
       share string or a backup that leaves it behind hands someone a schedule
       with the reminders silently switched off. */
    chimeOn,
  });
  const applySettings=(st)=>{if(!st)return;
    if(st.palette)setPalette(st.palette);
    if(st.dark!==undefined)setDark(st.dark);
    if(st.emojiStyle)setEmojiStyle(st.emojiStyle);
    if(st.patchDisplay)setPatchDisplay(st.patchDisplay);
    if(st.patchAgingViz)setPatchAgingViz(st.patchAgingViz);
    if(st.sRef!==undefined)setSRef(st.sRef);
    if(st.sE2!==undefined)setSE2(st.sE2);
    if(st.sP4!==undefined)setSP4(st.sP4);
    if(st.sE2Ref!==undefined)setSE2Ref(st.sE2Ref);
    if(st.sP4Ref!==undefined)setSP4Ref(st.sP4Ref);
    if(st.refMult!==undefined)setRefMult(st.refMult);
    if(st.showFLH!==undefined)setShowFLH(st.showFLH);
    if(st.showT!==undefined)setShowT(st.showT);
    if(st.tBaseline!==undefined)setTBaseline(st.tBaseline);
    if(st.tFloor!==undefined)setTFloor(st.tFloor);
    if(st.ambientProfile)setAmbientProfile(st.ambientProfile);
    if(st.ambientCycleLen!==undefined)setAmbientCycleLen(st.ambientCycleLen);
    if(st.ambientScale!==undefined)setAmbientScale(st.ambientScale);
    if(st.ambientOvulationDay!==undefined)setAmbientOvulationDay(st.ambientOvulationDay);
    if(st.ambientCycleAnchor!==undefined)setAmbientCycleAnchor(st.ambientCycleAnchor);
    if(st.refProfile)setRefProfile(st.refProfile);
    if(st.customRefLen!==undefined)setCustomRefLen(st.customRefLen);
    if(st.refLen!==undefined)setRefLen(st.refLen);
    if(st.schedMode)setSchedMode(st.schedMode);
    if(st.menstrualOn!==undefined)setMenstrualOn(st.menstrualOn);
    if(st.affirmOn!==undefined)setAffirmOn(st.affirmOn);
    if(st.lutealAffirm!==undefined)setLutealAffirm(st.lutealAffirm);
    if(st.manualCycleStart!==undefined)setManualCycleStart(st.manualCycleStart);
    applyChime(st.chimeOn);
  };
  // Patch state used to live in localStorage and needed its own export slot.
  // Pieces, body limit, supply and active hours are all fields on the medication
  // now, so exporting the schedules carries the entire patch setup with them.
  // Build a single payload that both exporters can serialize. The JSON path
  // uses verbose keys; the share-string path uses short ones via shortenKeys.
  /* Take a fresh snapshot right now, persist it, and return the history with it
     already folded in — state updates are async, so the caller can't wait for one. */
  const captureNow=()=>{
    try{
      const now=new Date(),k=localDateKey(now);
      const ci=getCycleIdx(now),cd=getCycleDay(now);
      const absPos=ci*cycleLen+cd+(now.getHours()*60+now.getMinutes())/1440;
      const prev=dayLog[k]||{};
      const ov={...(prev.ov||{}),...seatOv};
      const rot=makeRot(absPos,ov,ci,seedFor(absPos));
      if(!rot)return dayLog;
      const next={...dayLog,[k]:{...prev,ov,rot}};
      setDayLog(saveDayLog(next));
      return next;
    }catch(e){return dayLog;}
  };
  const buildExportPayload=()=>{const sp=shareParts;const d={};
    if(sp.schedules)d.schedules=scheds;
    if(sp.calendar){d.calendar=calD;
      /* The placements and the event sequence go with the calendar, not with
         history: they are what is ABOUT to happen as much as what has, and an
         import without them would start re-deciding spots that were already
         settled. */
      d.places=places;}
    if(sp.affirmations)d.affirmations=affirmMsgs;
    if(sp.settings)d.settings=buildSettings();
    /* Unconditional. The chime is a medication alarm, not a preference — the
       "settings" part is off by default, and a schedule shared with its dose
       reminders silently switched off is worse than no schedule at all. */
    d.chime=!!chimeOn;
    // History travels with the schedule. Each day carries the slots as they were
    // actually worn, so an import resumes the rotation from the last recorded day
    // instead of starting over and losing the legs you moved patches to.
    // Its own opt-in: the calendar is what you WROTE (events, mood notes), history
    // is what the app RECORDED. Leaving it out is a normal export — an import with
    // no history simply derives from cycle 0, same as a fresh install.
    // Exporting is a significant moment, so the snapshot is retaken at the exact
    // instant of the click rather than waiting for the next quarter-hour tick —
    // otherwise a patch you moved a minute ago wouldn't be in the file.
    if(sp.history)d.history=captureNow();
    return d;
  };
  // JSON export — verbose keys, pretty-printed, downloads as a file.
  const exportAll=()=>{const d={version:"6.0",exported:new Date().toISOString(),...buildExportPayload()};const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`hormone-cycle-${localDateKey()}.json`;a.click();URL.revokeObjectURL(u);};
  // Share string: compress JSON → base64 string
  const[importMode,setImportMode]=useState("add");// "add" | "overwrite"
  const[shareStr,setShareStr]=useState("");
  const[shareImport,setShareImport]=useState("");
  const[shareParts,setShareParts]=useState({schedules:true,calendar:true,affirmations:true,settings:false,history:false});
  const compressToString=async(data)=>{
    const json=JSON.stringify(data);const enc=new TextEncoder().encode(json);
    const cs=new CompressionStream("deflate");const w=cs.writable.getWriter();const r=cs.readable.getReader();
    w.write(enc);w.close();const chunks=[];
    while(true){const{done,value}=await r.read();if(done)break;chunks.push(value);}
    const buf=new Uint8Array(chunks.reduce((a,c)=>a+c.length,0));let off=0;for(const c of chunks){buf.set(c,off);off+=c.length;}
    let b64="";const bytes=buf;const len=bytes.length;
    const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for(let i=0;i<len;i+=3){const a=bytes[i],b=bytes[i+1]||0,c2=bytes[i+2]||0;
      b64+=chars[a>>2]+chars[((a&3)<<4)|(b>>4)]+chars[((b&15)<<2)|(c2>>6)]+chars[c2&63];}
    if(len%3===1)b64=b64.slice(0,-2)+"==";else if(len%3===2)b64=b64.slice(0,-1)+"=";
    return b64;
  };
  const decompressFromString=async(b64)=>{
    const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const clean=b64.replace(/[^A-Za-z0-9+/=]/g,"");
    const bytes=[];for(let i=0;i<clean.length;i+=4){
      const a=chars.indexOf(clean[i]),b=chars.indexOf(clean[i+1]),c2=chars.indexOf(clean[i+2]),d2=chars.indexOf(clean[i+3]);
      bytes.push((a<<2)|(b>>4));if(c2!==-1&&clean[i+2]!=="=")bytes.push(((b&15)<<4)|(c2>>2));if(d2!==-1&&clean[i+3]!=="=")bytes.push(((c2&3)<<6)|d2);}
    const buf=new Uint8Array(bytes);
    const ds=new DecompressionStream("deflate");const w=ds.writable.getWriter();const r=ds.readable.getReader();
    w.write(buf);w.close();const chunks=[];
    while(true){const{done,value}=await r.read();if(done)break;chunks.push(value);}
    const out=new Uint8Array(chunks.reduce((a,c)=>a+c.length,0));let off=0;for(const c of chunks){out.set(c,off);off+=c.length;}
    return JSON.parse(new TextDecoder().decode(out));
  };
  // Share string uses short keys to keep the URL-pasteable string compact.
  // The payload itself (built by buildExportPayload) is identical to the JSON
  // path — same settings, same patch data, same history toggle — just renamed
  // on the wire: schedules→s, calendar→c, affirmations→a, settings→t,
  // Older share strings also carried a patchData block (p) from the conserve-era
  // body/storage/history state; the import side ignores it harmlessly, since the
  // patch setup now travels inside the schedules themselves.
  const generateShareString=async()=>{
    const full=buildExportPayload();const d={v:"6"};
    if(full.schedules)d.s=full.schedules;
    if(full.calendar)d.c=full.calendar;
    if(full.affirmations)d.a=full.affirmations;
    if(full.settings)d.t=full.settings;
    const str=await compressToString(d);setShareStr("HCM1."+str);
  };
  const importShareString=async()=>{
    try{snapNow();const raw=shareImport.trim();if(!raw.startsWith("HCM1."))throw new Error("Invalid share string");
      const d=await decompressFromString(raw.slice(5));
      if(importMode==="overwrite"){
        if(d.s){setScheds(d.s);const firstUseful=d.s.findIndex(s=>(s.medications||[]).length>0);const loadIdx=firstUseful>=0?firstUseful:0;ldS(d.s[loadIdx]||DS);setSi(loadIdx);}
        if(d.c)setCalD(d.c);
        if(d.a)setAffirmMsgs(d.a);
      }else{
        if(d.s){setScheds(p=>{const merged=[...p,...d.s];const newIdx=p.length;
          const firstUseful=d.s.findIndex(s=>(s.medications||[]).length>0);
          const loadIdx=firstUseful>=0?firstUseful:0;
          setSi(newIdx+loadIdx);ldS(d.s[loadIdx]||DS);return merged;});}
        if(d.c){setCalD(p=>mergeCalendarData(p,d.c));}
        if(d.a)setAffirmMsgs(p=>[...p,...d.a]);
      }
      // Settings + patch data: same shape as JSON import, applied via the
      // shared helpers so both paths stay in sync.
      if(d.t)applySettings(d.t);
      applyChime(d.chime!==undefined?d.chime:d.ch);
      setShareImport("");alert(importMode==="overwrite"?"Data replaced!":"Data merged!");
    }catch(err){alert("Invalid share string: "+err.message);}
  };
  const[printMonths,setPrintMonths]=useState(3);
  const[icalAlarm,setIcalAlarm]=useState("08:00");
  const printCalendar=()=>{
    const cl2=cycleLen;const today=new Date();
    const wk=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    // Use astronomical lunar day for each date (no drift over years)
    const lunarDayFor=d=>lunarDayMid(d)-1;// 0-based
    let html=`<html><head><title>Hormone Cycle Calendar</title><style>
      @page{size:letter landscape;margin:0.4in;}
      *{font-family:'DM Sans',Helvetica,sans-serif;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      body{margin:0;padding:0;color:#1e1020;}
      .month-page{page-break-after:always;padding:4px;}
      .month-title{font-size:16px;font-weight:700;margin-bottom:4px;color:#1e1020;}
      .sched-name{font-size:9px;color:#888;margin-bottom:3px;}
      table{width:100%;border-collapse:collapse;table-layout:fixed;}
      th{font-size:8px;font-weight:600;color:#888;padding:3px 1px;border-bottom:2px solid #d4a0b8;text-align:center;}
      td{border:1px solid #e8c8d8;vertical-align:top;padding:2px 3px;height:82px;width:14.28%;overflow:hidden;}
      .hdr{display:flex;align-items:baseline;gap:3px;margin-bottom:1px;flex-wrap:nowrap;}
      .day-num{font-size:12px;font-weight:700;color:#1e1020;flex-shrink:0;}
      .lunar{font-size:6px;color:#7c3aed;white-space:nowrap;}
      .phase{font-size:6px;color:#db2777;font-weight:600;white-space:nowrap;}
      .med{font-size:9px;color:#1e1020;font-weight:500;line-height:1.3;}
      .other{color:#ccc;}
      .chart-page{page-break-before:always;padding:8px;text-align:center;}
    </style></head><body>`;
    for(let mi=0;mi<printMonths;mi++){
      const mDate=new Date(today.getFullYear(),today.getMonth()+mi,1);
      const mName=mDate.toLocaleDateString("en-US",{month:"long",year:"numeric"});
      const firstDow=mDate.getDay();const daysInMonth=new Date(mDate.getFullYear(),mDate.getMonth()+1,0).getDate();
      html+=`<div class="month-page"><div class="month-title">${mName}</div>`;
      html+=`<div class="sched-name">${sc.name} · Medication and Hormone Blood Level Manager</div>`;
      html+=`<table><tr>${wk.map(w=>`<th>${w}</th>`).join("")}</tr><tr>`;
      for(let i=0;i<firstDow;i++)html+=`<td class="other"></td>`;
      for(let d=1;d<=daysInMonth;d++){
        const date=new Date(mDate.getFullYear(),mDate.getMonth(),d);
        const diffDays=Math.floor((date-today)/(86400000));
        const ld=lunarDayFor(date);
        const medsResult2=getMeds(ld,sc,date);
        const phase=mPh(ld,cycleLen,ovulationDay,cycleAnchor);
        const moon=mEm(ld);
        html+=`<td>`;
        html+=`<div class="hdr"><span class="day-num">${d}</span><span class="lunar">${moon}L${ld+1}</span><span class="phase">${phase}</span></div>`;
        for(const m of medsResult2.meds)html+=`<div class="med">${m}</div>`;
        if(shouldAffirm(ld))html+=`<div class="med" style="color:#c084fc">💜</div>`;
        html+=`</td>`;
        if((firstDow+d)%7===0&&d<daysInMonth)html+=`</tr><tr>`;
      }
      const lastDow=(firstDow+daysInMonth)%7;
      if(lastDow>0)for(let i=lastDow;i<7;i++)html+=`<td class="other"></td>`;
      html+=`</tr></table></div>`;
    }
    // Chart page — render the modeler canvas to an image
    if(cvR.current){
      try{
        const canvas=cvR.current;const dataUrl=canvas.toDataURL("image/png");
        html+=`<div class="chart-page"><div class="month-title">Blood Levels — ${sc.name}</div>`;
        html+=`<img src="${dataUrl}" style="max-width:100%;border:1px solid #e5c0d0;border-radius:4px;"/>`;
        html+=`</div>`;
      }catch(e){}
    }
    html+=`</body></html>`;
    const w=window.open("","_blank");
    w.document.write(html);w.document.close();
    setTimeout(()=>{w.print();},500);
  };
  const exportIcal=()=>{
    const cl2=cycleLen;const today=new Date();
    const totalDays=Math.round(printMonths*30.44);// use same month count as print
    const pad2=n=>String(n).padStart(2,"0");
    const fmtDate=d=>`${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}`;
    const fmtDateNext=d=>{const n=new Date(d);n.setDate(n.getDate()+1);return fmtDate(n);};
    const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
    let ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//HCM//Hormone Cycle Manager//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH",`X-WR-CALNAME:${sc.name} — HCM`].join("\r\n")+"\r\n";
    for(let di=0;di<totalDays;di++){
      const date=new Date(today);date.setDate(date.getDate()+di);
      const ld=getCycleDay(date);// 0-based
      const medsResult3=getMeds(ld,sc,date);const meds=medsResult3.meds;
      const phase=mPh(ld,cycleLen,ovulationDay,cycleAnchor);
      const moon=mNm(ld);
      const hasAffirm=shouldAffirm(ld);
      if(meds.length===0&&!hasAffirm)continue;
      const desc=meds.map(m=>m.replace(/[🩹💉💊↻]/g,"").trim()).join("\\n");
      const affirmText=hasAffirm?getAffirmMsg(ld):"";
      const summary=`L${ld+1} ${phase}${meds.length>0?" — "+meds.length+" med"+(meds.length>1?"s":""):""}${hasAffirm?" 💜":""}`;
      const fullDesc=[desc,moon,affirmText?"\\n💜 "+affirmText:"","\\nAffirmations are customizable in the app"].filter(Boolean).join("\\n");
      const alarm=(()=>{if(!icalAlarm)return"";const[h,m]=icalAlarm.split(":").map(Number);const mins=h*60+m;return`BEGIN:VALARM\r\nTRIGGER;RELATED=START:PT${mins}M\r\nACTION:DISPLAY\r\nDESCRIPTION:Medication reminder\r\nEND:VALARM\r\n`;})();
      ics+=["BEGIN:VEVENT",`DTSTART;VALUE=DATE:${fmtDate(date)}`,`DTEND;VALUE=DATE:${fmtDateNext(date)}`,`SUMMARY:${summary}`,`DESCRIPTION:${fullDesc}`,`UID:hcm-${fmtDate(date)}-${uid()}@hcm`,"TRANSP:TRANSPARENT"].join("\r\n")+"\r\n"+alarm+"END:VEVENT\r\n";
    }
    ics+="END:VCALENDAR\r\n";
    const blob=new Blob([ics],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`hormone-cycle-${sc.name.replace(/\s+/g,"-")}.ics`;a.click();
    URL.revokeObjectURL(url);
    setTimeout(()=>{const timeLabel=icalAlarm?(() => {const[h,m]=icalAlarm.split(":").map(Number);return `${h>12?h-12:h||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;})():"";alert("Calendar exported!"+(icalAlarm?`\n\nReminders set for ${timeLabel} each day. These work in Apple Calendar and Outlook.\n\nGoogle Calendar and Proton ignore embedded reminders. To get notifications there, set a default notification on the calendar you import into:\n• Google: Settings → your calendar → All-day event notifications → Add notification\n• Proton: Settings → Calendars → your calendar → Default full day notifications`:"\n\nNo reminders included. To get notifications, set a default notification on the target calendar:\n• Google: Settings → your calendar → All-day event notifications\n• Proton: Settings → Calendars → your calendar → Default full day notifications"));},300);
  };
  const importRef=useRef(null);
  // JSON import — same payload shape as JSON export. Settings + patch data
  // pass through the shared apply helpers so this path is always in sync with
  // the share-string import.
  const importAll=e=>{const f=e.target?.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{snapNow();const d=JSON.parse(ev.target.result);
    if(importMode==="overwrite"){
      if(d.schedules){setScheds(d.schedules);const firstUseful=d.schedules.findIndex(s=>(s.medications||[]).length>0);const loadIdx=firstUseful>=0?firstUseful:0;ldS(d.schedules[loadIdx]||DS);setSi(loadIdx);}
      if(d.calendar)setCalD(d.calendar);if(d.places)setPlaces(savePlaces(d.places));
      if(d.affirmations)setAffirmMsgs(d.affirmations);
      if(d.history)setDayLog(saveDayLog(d.history));
    }else{
      if(d.schedules){setScheds(p=>{const merged=[...p,...d.schedules];const newIdx=p.length;
        const firstUseful=d.schedules.findIndex(s=>(s.medications||[]).length>0);
        const loadIdx=firstUseful>=0?firstUseful:0;
        setSi(newIdx+loadIdx);ldS(d.schedules[loadIdx]||DS);return merged;});}
      if(d.calendar){setCalD(p=>mergeCalendarData(p,d.calendar));}
      if(d.places)setPlaces(p=>savePlaces({v:PLACE_V,
        place:{...(p.place||{}),...(d.places.place||{})},
        seq:[...(p.seq||[]),...((d.places.seq||[]).filter(e=>!(p.seq||[]).some(x=>x.id===e.id)))],
        next:Math.max(p.next||1,d.places.next||1)}));
      if(d.history)setDayLog(p=>saveDayLog({...p,...d.history}));
      if(d.affirmations)setAffirmMsgs(p=>[...p,...d.affirmations]);
    }
    if(d.settings)applySettings(d.settings);
    applyChime(d.chime);
    alert(importMode==="overwrite"?"Data replaced!":"Data merged!");
  }catch(err){console.error("Import error:",err);alert("Import failed: "+err.message);}};r.readAsText(f);e.target.value="";};
  // Build — injs now have dose_mg + time; day = base_day + (time==="pm"?0.5:0)
  const mkDay=i=>(parseFloat(i.day)||0)+timeOffset(i.time);
  // Draw
  useEffect(()=>{const c=cvR.current;if(!c||loading)return;const sd=parseFloat(sD)||35;const cl0=cycleLen;const sdX=sd+cl0;
    // Build time samples
    const numCyc=Math.ceil(sdX/cl0)+1;
    const exPa=pa;// pieces are what we draw; e2P loops them itself
    const e2Pts=[],p4ChartPts=[];const st=Math.max(.05,sd/2000);
    const bndry=new Set();
    for(const p of exPa)for(let k=0;k<=numCyc;k++){
      const a=(parseFloat(p.day)||0)+k*cl0,b=a+(parseFloat(p.wear)||0);
      bndry.add(a);bndry.add(b);if(a>0)bndry.add(a-.001);bndry.add(b+.001);}
    const times=[];for(let tt=0;tt<=sdX;tt+=st)times.push(tt);for(const b of bndry)if(b>=0&&b<=sdX)times.push(b);times.sort((a,b)=>a-b);
    const dt=[];for(let i=0;i<times.length;i++){if(i===0||times[i]-times[i-1]>0.0001)dt.push(times[i]);}
    // Build per-med data — E2 meds go to left/right axis, non-E2/non-P4 meds get their own series
    const leftMedData=[];
    const customSeriesRaw=[];
    for(const m of medications){if(!m.enabled||!m.hasWaveform||m.deliveryType!=="single")continue;
      if(m.hormone==="P4")continue;// P4 handled separately
      const injs=[];for(let cyc=0;cyc<numCyc;cyc++){const o=cyc*cl0;for(const d of(m.doses||[])){const day=dosePos(d.day,d.time)+o,dm=parseFloat(d.dose)||0;if(dm>0&&day<=sdX)injs.push({day,dose_mg:dm});}}
      if(m.recurEnabled&&(parseFloat(m.recurInterval)||0)>0&&(parseFloat(m.recurDose)||0)>0){let rd=parseFloat(m.recurStart)||0;while(rd<=sdX){injs.push({day:rd,dose_mg:parseFloat(m.recurDose)});rd+=parseFloat(m.recurInterval);}}
      const medEntry={injs,pts:m.points||PC.points,refMg:m.refDose||1,conc:m.concentration||20,fl:m.floor??0,md:m.waveformMode||"freeform",pk:m.pk||DEF_PK_E2,hormone:m.hormone,name:m.name,color:m.color,unit:m.unit||"units",axisSide:m.axisSide||"left"};
      if(m.hormone==="E2")leftMedData.push(medEntry);
      else customSeriesRaw.push(medEntry);}
    // Build P4 data
    const exP4=[];
    for(let cyc=0;cyc<numCyc;cyc++){const o=cyc*cl0;for(const d of p4){const day=dosePos(d.day,d.time)+o,mg=parseFloat(d.doseMg)||0;if(mg>0&&day<=sdX)exP4.push({day,doseMg:mg});}}
    const p4CurvePts=p4Mode==="freeform"?p4Pts:null;
    // Precompute custom series data
    const customDataPreSupp=customSeriesRaw.map(cs=>({...cs,rawData:dt.map(t=>({t,v:e2L(t,cs.injs,cs.pts,cs.refMg,cs.conc,cs.fl,cs.md,cs.pk)}))}));
    const allExInjs=[...leftMedData,...customSeriesRaw].flatMap(d=>d.injs);
    // AFAB suppression
    const tMedData=medications.filter(m=>m.enabled&&m.hasWaveform&&m.hormone==="T"&&m.deliveryType==="single");
    // Build suppression lookup: for each target hormone, collect all suppression entries
    const allSupps={};
    for(const m of medications){if(!m.enabled)continue;
      for(const s of(m.suppressions||[])){
        if(!allSupps[s.target])allSupps[s.target]=[];
        let medInjs=null;
        if(s.method==="gradual"&&m.hasWaveform&&m.deliveryType==="single"){
          medInjs=[];for(let cyc=0;cyc<numCyc;cyc++){const o=cyc*cl0;for(const d of(m.doses||[])){const day=dosePos(d.day,d.time)+o,dm=parseFloat(d.dose)||0;if(dm>0&&day<=sdX)medInjs.push({day,dose_mg:dm});}}
        }
        allSupps[s.target].push({...s,med:m,medInjs,medPts:m.points||PC.points,medRefMg:m.refDose||1,medConc:m.concentration||20,medFl:m.floor??0,medMd:m.waveformMode||"freeform",medPk:m.pk||DEF_PK_E2});
      }}
    // Compute suppression factor for a target at time t
    // Returns 0 (fully suppressed) to 1 (no suppression)
    const getSuppFactor=(target,t)=>{
      const entries=allSupps[target];if(!entries||entries.length===0)return 1;
      let totalSuppFrac=0;
      for(const s of entries){
        if(s.method==="flatline")return 0;
        if(s.method==="gradual"){
          // Waveform mode: use the drawn suppression curve directly
          if((s.mode||"waveform")==="waveform"&&s.suppPts&&s.suppPts.length>=2&&s.med&&s.med.doses){
            let maxSuppAtT=0;
            for(const d of(s.med.doses||[])){
              for(let cyc=0;cyc<numCyc;cyc++){
                const doseDay=dosePos(d.day,d.time)+cyc*cl0;
                const elapsed=t-doseDay;
                if(elapsed>=0){
                  const sv2=Math.max(0,Math.min(1,evC(s.suppPts,elapsed/(s.suppTimeScale||1))*(s.suppScale||1)));
                  maxSuppAtT=Math.max(maxSuppAtT,sv2);
                }
              }
            }
            totalSuppFrac+=maxSuppAtT;
          }else{
            // Parametric mode: existing algorithm
            const dur=s.duration||1;const eff=Math.max(0,Math.min(1,s.effectiveness??1));
            let potency=0;
            if(s.medInjs&&s.medInjs.length>0){
              const bl=e2L(t,s.medInjs,s.medPts,s.medRefMg,s.medConc,s.medFl,s.medMd,s.medPk);
              const k=3/((s.threshold||120));
              potency=Math.max(potency,1/(1+Math.exp(-k*(bl-(s.threshold||120)))));
            }
            if(s.med&&s.med.doses){
              let totalDose=0;
              for(const d of(s.med.doses||[])){
                for(let cyc=0;cyc<numCyc;cyc++){
                  const doseDay=dosePos(d.day,d.time)+cyc*cl0;
                  const elapsed=t-doseDay;
                  if(elapsed>=0&&elapsed<dur){
                    const decay=Math.exp(-2.3*elapsed/dur);
                    totalDose+=(parseFloat(d.dose)||0)*decay;
                  }
                }
              }
              if(totalDose>0){
                const kd=6/((s.threshold||200));
                const doseFrac=(1/(1+Math.exp(-kd*(totalDose-(s.threshold||200)))))*eff;
                potency=Math.max(potency,doseFrac);
              }
            }
            totalSuppFrac+=potency*eff;
          }
        }
      }
      return Math.max(0,1-Math.min(1,totalSuppFrac));
    };

    const isFlatlined=!!(allSupps["E2"]||[]).some(s=>s.method==="flatline")||(allSupps["P4"]||[]).some(s=>s.method==="flatline");

    // Finalize custom series data with suppression applied
    const customData=customDataPreSupp.map(cs=>{const data=cs.rawData.map(p=>({t:p.t,v:Math.max(0,Math.min(p.v,p.v*getSuppFactor(cs.name,p.t)))}));const mx=Math.max(...data.map(d=>d.v),1);return{name:cs.name,color:cs.color,unit:cs.unit,axisSide:cs.axisSide,data,max:mx};});

    const cl0ForRef=cycleLen;const cl0Ambient=ambientCycleLen||29.5;
    // Ambient inherits global ovulationDay by default; if the user sets an
    // ambient-only override, that wins. (Kept proportional to ambient cycle
    // length so the override behaves naturally if cl0Ambient ≠ cycleLen.)
    const effAmbientOvDay=ambientOvulationDay??Math.round(ovulationDay*cl0Ambient/(cycleLen||29.5));
    // Same pattern for cycleAnchor: ambient inherits global anchor by default,
    // scaled proportionally if ambient cycle length differs. Editing the
    // ambient anchor only affects the ambient simulation — it does NOT
    // touch the global cycleAnchor.
    const effAmbientAnchor=ambientCycleAnchor??Math.round((cycleAnchor||0)*cl0Ambient/(cycleLen||29.5));
    /* Sample everything that raises E2 EXCEPT patches, across one cycle. Without
       this the fitter would size patches to deliver the entire reference curve on
       top of whatever you're already injecting — double-dosing by exactly the
       amount of the other medication. */
    {
      const N=192,arr=new Array(N);
      for(let i=0;i<N;i++){
        const tt=i/N*cl0;let v=0;
        for(const emd of leftMedData)v+=e2L(tt,emd.injs,emd.pts,emd.refMg,emd.conc,emd.fl,emd.md,emd.pk);
        if(showT&&ambientProfile==="afab")
          v+=ambientAtT(ME,tt,cl0Ambient,effAmbientOvDay,effAmbientAnchor,0,300,isFlatlined)*ambientScale;
        arr[i]=v;
      }
      otherE2Ref.current={arr,cl:cl0};
    }
    const fshPts=[],lhPts=[];
    for(const t of dt){
      let tBloodLevel=0;
      for(const tm of tMedData){const tmInjs=[];for(let cyc=0;cyc<numCyc;cyc++){const o=cyc*cl0;for(const d of(tm.doses||[])){const day=dosePos(d.day,d.time)+o,dm=parseFloat(d.dose)||0;if(dm>0&&day<=sdX)tmInjs.push({day,dose_mg:dm});}}tBloodLevel+=e2L(t,tmInjs,tm.points||PC.points,tm.refDose||1,tm.concentration||20,tm.floor??0,tm.waveformMode||"freeform",tm.pk||DEF_PK_E2);}
      // Left axis: E2 meds + patches + AFAB ambient (suppressed by T)
      let leftTotal=0;for(const emd of leftMedData){leftTotal+=e2L(t,emd.injs,emd.pts,emd.refMg,emd.conc,emd.fl,emd.md,emd.pk);}
      leftTotal+=e2P(t,exPa,patchPg,patchTaper,patchCurve,patchDur);
      if(showT&&ambientProfile==="afab")leftTotal+=ambientAtT(ME,t,cl0Ambient,effAmbientOvDay,effAmbientAnchor,tBloodLevel,300,isFlatlined)*ambientScale;
      // Apply E2 suppression from any medication targeting E2, clamped to never exceed unsuppressed
      const leftUnsuppressed=leftTotal;
      leftTotal=Math.min(leftUnsuppressed,leftTotal*getSuppFactor("E2",t));
      e2Pts.push({t,v:Math.max(0,leftTotal)});
      // Right axis: P4 meds + AFAB ambient P4
      let rightTotal=p4L(t,exP4,p4pk,p4CurvePts);
      if(showT&&ambientProfile==="afab")rightTotal+=ambientAtT(MP,t,cl0Ambient,effAmbientOvDay,effAmbientAnchor,tBloodLevel,300,isFlatlined)*ambientScale;
      // Apply P4 suppression, clamped to never exceed unsuppressed
      const rightUnsuppressed=rightTotal;
      rightTotal=Math.min(rightUnsuppressed,rightTotal*getSuppFactor("P4",t));
      p4ChartPts.push({t,v:Math.max(0,rightTotal)});
      if(showT&&ambientProfile==="afab"){
        fshPts.push({t,v:ambientAtT(MF,t,cl0Ambient,effAmbientOvDay,effAmbientAnchor,tBloodLevel,300,isFlatlined)*ambientScale});
        lhPts.push({t,v:ambientAtT(MLH,t,cl0Ambient,effAmbientOvDay,effAmbientAnchor,tBloodLevel,300,isFlatlined)*ambientScale});
      }
    }
    // Compute T data — AMAB ambient T, suppressed by medications targeting T
    const tPts=(showT&&ambientProfile==="amab")?(()=>{
      const base=(tBaseline||600)*ambientScale;const fl=tFloor||15;
      const isFlatT=!!(allSupps["T"]||[]).some(s=>s.method==="flatline");
      if(isFlatT)return dt.map(t=>({t,v:fl}));
      const ceilings=(allSupps["T"]||[]).filter(s=>s.method==="gradual"&&s.ceiling>0);
      const rd=Math.max(...(allSupps["T"]||[]).filter(s=>s.method==="gradual"&&s.rebound).map(s=>s.rebound),7);
      let smoothT=base;
      return dt.map((t,i)=>{
        const suppFrac=1-getSuppFactor("T",t);
        let targetT=fl+(base-fl)*(1-suppFrac);
        // Apply ceiling — cap target at the lowest active ceiling
        for(const cs of ceilings){
          const ceilSupp=1-getSuppFactor("T",t);// same suppression drives ceiling activation
          if(ceilSupp>0.1)targetT=Math.min(targetT,cs.ceiling);
        }
        const dtt=i>0?t-dt[i-1]:0;
        if(targetT<smoothT){smoothT+=(targetT-smoothT)*(1-Math.exp(-dtt*1.5));}
        else{smoothT+=(targetT-smoothT)*(1-Math.exp(-dtt/rd));}
        return{t,v:Math.max(fl,Math.min(base,smoothT))};
      });
    })():[];
    const tMax=showT&&tPts.length?Math.max(...tPts.map(p=>p.v)):0;
    const refActive=sRef;
    const refE2Max=refActive?(refProfile==="male"?ME_M_PEAK:ME_PEAK)*refMult:0;
    const refP4Max=refActive?(refProfile==="male"?MP_M_PEAK:MP_PEAK)*refMult:0;
    const eM=Math.max(...e2Pts.map(p=>p.v),showT?tMax:0,refE2Max,10)*1.15;const pM=Math.max(...p4ChartPts.map(p=>p.v),refP4Max,5)*1.2;e2R.current=e2Pts;p4R2.current=p4ChartPts;tR.current=showT?tPts:[];cuR.current=customData||[];mR.current={xM:sd,eM,pM,tM:tMax};drawChart(c,{e2:e2Pts,p4:p4ChartPts,tData:tPts,injs:allExInjs,pbs:exPa,xM:sd,eM,pM,tM:tMax,sE:sE2,sP:sP4,sT:showT,sERef:sE2Ref,sPRef:sP4Ref,ref:refActive?refMult:false,refFLH:refActive&&showFLH,ovulationDay,cycleAnchor,cycleLen:cycleLen,refCycleLen:customRefLen?refLen:cycleLen,ambientProfile,refProfile,fshData:fshPts,lhData:lhPts,customData});const ov=ovR.current;if(ov)ov.getContext("2d").clearRect(0,0,ov.width,ov.height);},[medications,pa,p4,p4pk,p4Pts,p4Mode,patchPg,patchTaper,patchCurve,patchDur,sD,cR,cycleLen,sRef,refMult,showFLH,showT,tBaseline,tFloor,sE2,sP4,sE2Ref,sP4Ref,ovulationDay,cycleAnchor,ambientOvulationDay,ambientCycleAnchor,loading,tab,ambientScale,ambientProfile,ambientCycleLen,ambientScale,refProfile,customRefLen,refLen,previewConserve]);
  // Calendar blood level chart with "you are here" marker
  // Calendar blood level chart — always shows one cycle length, samples slightly beyond to avoid edge drop
  useEffect(()=>{const c=calCvR.current;if(!c||(tab!=="calendar"&&!focusMode)||loading||!calChartOpen)return;let frame=0;const doRender=()=>{const rect=c.getBoundingClientRect();if(rect.height<10||rect.width<50){if(frame++<30){requestAnimationFrame(doRender);}return;}const cl=cycleLen;const sd=cl;const sdCalc=cl*2;
    // Time-scrubbing: cdView is the day the user is looking at (today + shift).
    // winBase is the start of the cycle window containing it, so the patch curve
    // and the now-line follow the viewed window; periodic curves (injections, P4,
    // reference) are cycle-identical so they need no offset.
    const nowMs0=Date.now();const cdToday0=getCycleDay(new Date(nowMs0));
    const cdView=cdToday0+dayViewIdx;const winBase=Math.floor(cdView/cl)*cl;
    // Build time samples
    const calPa=pa;const simEdge=null;const numCyc=3;
    const st=Math.max(.05,sd/1500);
    const bndry=new Set();
    for(const p of calPa)for(let k=0;k<=numCyc;k++){
      const a=(parseFloat(p.day)||0)+k*cl,b=a+(parseFloat(p.wear)||0);
      bndry.add(a);bndry.add(b);if(a>0)bndry.add(a-.001);bndry.add(b+.001);}
    const times=[];for(let tt=0;tt<=sdCalc;tt+=st)times.push(tt);for(const b of bndry)if(b>=0&&b<=sdCalc)times.push(b);times.sort((a,b)=>a-b);const dt=[];for(let i=0;i<times.length;i++){if(i===0||times[i]-times[i-1]>.0001)dt.push(times[i]);}
    // Build per-medication injection lists (same approach as modeler)
    const calLeftMedData=[];const calCustomRaw=[];
    for(const m of medications){if(!m.enabled||!m.hasWaveform||m.deliveryType!=="single")continue;
      if(m.hormone==="P4")continue;
      const injs=[];for(let cyc=0;cyc<numCyc;cyc++){const o=cyc*cl;for(const d of(m.doses||[])){const day=dosePos(d.day,d.time)+o,dm=parseFloat(d.dose)||0;if(dm>0&&day<=sdCalc)injs.push({day,dose_mg:dm});}}
      if(m.recurEnabled&&(parseFloat(m.recurInterval)||0)>0&&(parseFloat(m.recurDose)||0)>0){let rd=parseFloat(m.recurStart)||0;while(rd<=sdCalc){injs.push({day:rd,dose_mg:parseFloat(m.recurDose)});rd+=parseFloat(m.recurInterval);}}
      const entry={injs,pts:m.points||PC.points,refMg:m.refDose||1,conc:m.concentration||20,fl:m.floor??0,md:m.waveformMode||"freeform",pk:m.pk||DEF_PK_E2,hormone:m.hormone,name:m.name,color:m.color,unit:m.unit||"units",axisSide:m.axisSide||"left"};
      if(m.hormone==="E2")calLeftMedData.push(entry);else calCustomRaw.push(entry);}
    // Build P4 data
    const calP4d=[];
    for(let cyc=0;cyc<numCyc;cyc++){const o=cyc*cl;for(const d of p4){const day=dosePos(d.day,d.time)+o,mg=parseFloat(d.doseMg)||0;if(mg>0&&day<=sdCalc)calP4d.push({day,doseMg:mg});}}
    const calP4CurvePts=p4Mode==="freeform"?p4Pts:null;
    // Custom series with suppression
    const calCustomData=calCustomRaw.map(cs=>{const data=dt.map(t=>({t,v:e2L(t,cs.injs,cs.pts,cs.refMg,cs.conc,cs.fl,cs.md,cs.pk)}));const mx=Math.max(...data.map(d=>d.v),1);return{name:cs.name,color:cs.color,unit:cs.unit,axisSide:cs.axisSide,data,max:mx};});
    // Compute blood levels
    const e2Pts=[],calP4Pts=[];
    const allCalInjs=calLeftMedData.flatMap(d=>d.injs);
    for(const tt of dt){
      let leftTotal=0;for(const emd of calLeftMedData){leftTotal+=e2L(tt,emd.injs,emd.pts,emd.refMg,emd.conc,emd.fl,emd.md,emd.pk);}
      // Patch level from the one continuous list (grey fill · gone · body+projection).
      leftTotal+=e2P(winBase+tt,calPa,patchPg,patchTaper,patchCurve,patchDur);
      e2Pts.push({t:tt,v:Math.max(0,leftTotal)});
      calP4Pts.push({t:tt,v:p4L(tt,calP4d,p4pk,calP4CurvePts)});
    }
    // T suppression - build suppression lookup for calendar
    const calAllSupps={};
    for(const m of medications){if(!m.enabled)continue;
      for(const s of(m.suppressions||[])){
        if(!calAllSupps[s.target])calAllSupps[s.target]=[];
        let medInjs=null;
        if(s.method==="gradual"&&m.hasWaveform&&m.deliveryType==="single"){
          medInjs=[];for(let cyc2=0;cyc2<numCyc;cyc2++){const o=cyc2*cl;for(const d of(m.doses||[])){const day=dosePos(d.day,d.time)+o,dm=parseFloat(d.dose)||0;if(dm>0&&day<=sdCalc)medInjs.push({day,dose_mg:dm});}}
        }
        calAllSupps[s.target].push({...s,med:m,medInjs,medPts:m.points||PC.points,medRefMg:m.refDose||1,medConc:m.concentration||20,medFl:m.floor??0,medMd:m.waveformMode||"freeform",medPk:m.pk||DEF_PK_E2});
      }}
    const calGetSupp=(target,t)=>{
      const entries=calAllSupps[target];if(!entries||entries.length===0)return 1;
      let total=0;
      for(const s of entries){
        if(s.method==="flatline")return 0;
        if(s.method==="gradual"){
          if((s.mode||"waveform")==="waveform"&&s.suppPts&&s.suppPts.length>=2&&s.med&&s.med.doses){
            let maxSuppAtT=0;
            for(const d of(s.med.doses||[])){for(let cyc2=0;cyc2<numCyc;cyc2++){const doseDay=dosePos(d.day,d.time)+cyc2*cl;const elapsed=t-doseDay;if(elapsed>=0){maxSuppAtT=Math.max(maxSuppAtT,Math.max(0,Math.min(1,evC(s.suppPts,elapsed/(s.suppTimeScale||1))*(s.suppScale||1))));}}}
            total+=maxSuppAtT;
          }else{
            const dur=s.duration||1;const eff=Math.max(0,Math.min(1,s.effectiveness??1));
            let potency=0;
            if(s.medInjs&&s.medInjs.length>0){
              const bl=e2L(t,s.medInjs,s.medPts,s.medRefMg,s.medConc,s.medFl,s.medMd,s.medPk);
              const k=3/((s.threshold||120));potency=Math.max(potency,1/(1+Math.exp(-k*(bl-(s.threshold||120)))));
            }
            if(s.med&&s.med.doses){
              let totalDose=0;
              for(const d of(s.med.doses||[])){for(let cyc2=0;cyc2<numCyc;cyc2++){const doseDay=dosePos(d.day,d.time)+cyc2*cl;const elapsed=t-doseDay;if(elapsed>=0&&elapsed<dur){totalDose+=(parseFloat(d.dose)||0)*Math.exp(-2.3*elapsed/dur);}}}
              if(totalDose>0){const kd=6/((s.threshold||200));potency=Math.max(potency,(1/(1+Math.exp(-kd*(totalDose-(s.threshold||200)))))*eff);}
            }
            total+=potency*eff;
          }
        }
      }
      return Math.max(0,1-Math.min(1,total));
    };
    const calTPts=(showT&&ambientProfile==="amab")?(()=>{
      const base=(tBaseline||600)*ambientScale;const fl=tFloor||15;
      const isFlatT=!!(calAllSupps["T"]||[]).some(s=>s.method==="flatline");
      if(isFlatT)return dt.map(t=>({t,v:fl}));
      const ceilings=(calAllSupps["T"]||[]).filter(s=>s.method==="gradual"&&s.ceiling>0);
      const rd=Math.max(...(calAllSupps["T"]||[]).filter(s=>s.method==="gradual"&&s.rebound).map(s=>s.rebound),7);
      let smoothT=base;
      return dt.map((t,i)=>{
        const suppFrac=1-calGetSupp("T",t);
        let targetT=fl+(base-fl)*(1-suppFrac);
        for(const cs of ceilings){const ceilSupp=1-calGetSupp("T",t);if(ceilSupp>0.1)targetT=Math.min(targetT,cs.ceiling);}
        const dtt=i>0?t-dt[i-1]:0;
        if(targetT<smoothT){smoothT+=(targetT-smoothT)*(1-Math.exp(-dtt*1.5));}
        else{smoothT+=(targetT-smoothT)*(1-Math.exp(-dtt/rd));}
        return{t,v:Math.max(fl,Math.min(base,smoothT))};
      });
    })():[];
    const calTMax=showT&&calTPts.length?Math.max(...calTPts.map(p=>p.v)):0;
    const calRefMult=calShowRef?refMult:false;
    const calEm=Math.max(...e2Pts.map(p=>p.v),calShowRef?ME_PEAK*refMult:100,showT?calTMax:0)*1.15;const pM=Math.max(...calP4Pts.map(p=>p.v),calShowRef?MP_PEAK*refMult:5)*1.2;
    drawChart(c,{e2:calShowRef?[]:e2Pts,p4:calShowRef?[]:calP4Pts,tData:calShowRef?[]:calTPts,injs:calShowRef?[]:allCalInjs,pbs:calShowRef?[]:calPa,xM:sd,eM:calEm,pM,tM:calTMax,sE:!calShowRef,sP:!calShowRef,sT:!calShowRef&&showT,ref:calRefMult,refFLH:calShowRef,ovulationDay,cycleAnchor,calMode:calShowRef,cycleLen:sd,refCycleLen:customRefLen?refLen:cycleLen,ambientProfile,refProfile,customData:calShowRef?[]:calCustomData});
    const ctx=c.getContext("2d");const dpr=window.devicePixelRatio||1;const W=c.width/dpr,H=c.height/dpr;const cW=W-PD.left-PD.right,cH=H-PD.top-PD.bottom;
    // Grey out the SIMULATED past — the stretch with no recorded history, filled in
    // from the idealized schedule. Once real history covers the window, simEdge sits
    // at/before the window start and nothing is shaded.
    if(simEdge!=null){
      const simEdgeInWin=simEdge-winBase;
      if(simEdgeInWin>0.1){
        const x1=Math.max(PD.left,Math.min(PD.left+cW,PD.left+(simEdgeInWin/sd)*cW));
        ctx.save();
        ctx.fillStyle="rgba(148,163,184,.10)";ctx.fillRect(PD.left,PD.top,x1-PD.left,cH);
        ctx.strokeStyle="rgba(148,163,184,.45)";ctx.lineWidth=1;ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(x1,PD.top);ctx.lineTo(x1,PD.top+cH);ctx.stroke();ctx.setLineDash([]);
        if(simEdgeInWin<sd-0.05){ctx.fillStyle="rgba(148,163,184,.7)";ctx.font="9px sans-serif";ctx.textAlign="right";ctx.fillText("simulated ←",x1-3,PD.top+10);}
        ctx.restore();
      }
    }
    const nowD=new Date();const liveFrac=dayViewIdx===0?((nowD.getHours()*60+nowD.getMinutes())/1440):0;
    const viewInWindow=(cdView-winBase)+liveFrac;const xPos=PD.left+(viewInWindow/sd)*cW;
    const viewLabel=Math.floor(cdView)+1;const isToday=dayViewIdx===0;
    ctx.save();ctx.strokeStyle=isToday?"rgba(244,114,182,.7)":"rgba(255,255,255,.5)";ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(xPos,PD.top);ctx.lineTo(xPos,PD.top+cH);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=isToday?"rgba(244,114,182,.8)":"rgba(255,255,255,.65)";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillText(isToday?`Day ${viewLabel}`:`Day ${viewLabel} (${dayViewIdx>0?"+":""}${dayViewIdx})`,xPos,PD.top-4);ctx.restore();
  };requestAnimationFrame(doRender);},[tab,focusMode,medications,pa,p4,p4pk,p4Pts,p4Mode,patchPg,patchTaper,patchCurve,patchDur,cycleLen,lunarDay,showT,loading,ambientScale,calShowRef,refMult,ovulationDay,cycleAnchor,isLunar,manualCycleStart,calChartOpen,ambientProfile,refProfile,customRefLen,refLen,chartTick,dayViewIdx]);
  const onMM=e=>{const ov=ovR.current;if(!ov)return;const r=ov.getBoundingClientRect();const mx=e.clientX-r.left;if(mx>=PD.left&&mx<=r.width-PD.right)drawHov(ov,mx,e2R.current,p4R2.current,mR.current.xM,mR.current.eM,mR.current.pM,sE2,sP4);else ov.getContext("2d").clearRect(0,0,ov.width,ov.height);};
  const onML=()=>{const ov=ovR.current;if(ov)ov.getContext("2d").clearRect(0,0,ov.width,ov.height);};
  const[editDay,setEditDay]=useState(null);
  const[dayNotesOpen,setDayNotesOpen]=useState(false);
  const[showCustomMeds,setShowCustomMeds]=useState(false);
  const[libVisible,setLibVisible]=useState(false);const[libFade,setLibFade]=useState(0);
  const libTimer=useRef(null);
  useEffect(()=>{const now=new Date();const ms=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)-now;const t=setTimeout(()=>setDayNotesOpen(false),ms);return()=>clearTimeout(t);},[]);
  // Liberation pulse: 5s fade in, 27s hold, 5s fade out
  useEffect(()=>{
    if(!libVisible)return;
    const maxOp=dark?0.035:0.045;
    const fadeInMs=5000,holdMs=27000,fadeOutMs=5000;
    let start=null;let raf=null;
    const animate=(ts)=>{
      if(!start)start=ts;
      const elapsed=ts-start;
      let op=0;
      if(elapsed<fadeInMs){
        // Fade in: smoothstep
        const p=elapsed/fadeInMs;op=maxOp*p*p*(3-2*p);
      }else if(elapsed<fadeInMs+holdMs){
        op=maxOp;
      }else if(elapsed<fadeInMs+holdMs+fadeOutMs){
        const p=(elapsed-fadeInMs-holdMs)/fadeOutMs;op=maxOp*(1-p*p*(3-2*p));
      }else{
        setLibFade(0);setLibVisible(false);return;
      }
      setLibFade(op);
      raf=requestAnimationFrame(animate);
    };
    raf=requestAnimationFrame(animate);
    return()=>{if(raf)cancelAnimationFrame(raf);};
  },[libVisible,dark]);
  const PCLRS=["#f472b6","#c084fc","#fda4af","#e9d5ff","#fce7f3"];
  // Determine if affirmation should show for a given lunar day index
  const maxDay=isLunar?30:Math.max(60,Math.round(cycleLen));
  const getCycleDay=(date)=>{
    if(isLunar)return lunarDayMid(date)-1;
    if(!manualCycleStart)return 0;
    const startDate=new Date(manualCycleStart);
    const diff=Math.floor((date-startDate)/(86400000));
    const cl2=cycleLen>0?cycleLen:29.5;
    // A cycle always begins at midnight, so a fractional length can't be applied
    // by taking a fractional modulo — that would start cycles at noon. Instead we
    // find which cycle this date falls in and round only that cycle's START to a
    // whole day. A 29.5-day length therefore runs 30, 29, 30, 29... and averages
    // exactly 29.5, with no rounding of the length itself.
    let n=Math.floor(diff/cl2);
    // floor() and the rounded start disagree at boundaries when the fractional
    // part is under .5 (lunar 29.5306 does this), which would skip day 0 for some
    // cycles. Walk n to the cycle that actually contains this day.
    while(Math.round((n+1)*cl2)<=diff)n++;
    while(n>0&&Math.round(n*cl2)>diff)n--;
    return diff-Math.round(n*cl2);
  };
  /* Which loop of the schedule a date falls in. Slot rotation runs continuously
     across the seam, so it needs the absolute cycle number, not just the day
     within it. Same boundary walk as getCycleDay so the two never disagree. */
  const getCycleIdx=(date)=>{
    if(isLunar)return lunarCycleIdx(date);
    if(!manualCycleStart)return 0;
    const diff=Math.floor((date-new Date(manualCycleStart))/86400000);
    const cl2=cycleLen>0?cycleLen:29.5;
    let n=Math.floor(diff/cl2);
    while(Math.round((n+1)*cl2)<=diff)n++;
    while(n>0&&Math.round(n*cl2)>diff)n--;
    return n;
  };
  /* ── upcoming doses + chime (needs getCycleDay, defined above) ── */
  // Chime needs a user gesture to unlock audio, so enabling it plays a test note.
  const[chimeOn,setChimeOn]=useState(()=>{try{return localStorage.getItem("hcm-chime")==="yes";}catch(e){return false;}});
  /* key -> when we sounded it. A Map rather than a Set so old entries can be
     pruned by age; clearing the whole thing (as the Set version did once it hit
     200) could let an event still inside its window sound a second time. */
  const chimedRef=useRef(new Map());
  // One cycle of NON-patch estradiol — injections, oral, gel, plus ambient — so
  // the fitter can aim patches at the REMAINDER rather than at the whole curve.
  const otherE2Ref=useRef(null);
  // Slot overrides are a correction for the piece ON YOUR BODY RIGHT NOW, not a
  // property of the schedule. Each entry dies when that piece comes off, so next
  // cycle the rotation runs untouched. Kept out of export for the same reason.
  const[slotOv,setSlotOv]=useState(()=>{try{return JSON.parse(localStorage.getItem("hcm-slotov")||"{}");}catch(e){return{};}});
  const saveSlotOv=(next)=>{setSlotOv(next);try{localStorage.setItem("hcm-slotov",JSON.stringify(next));}catch(e){}};
  const liveOv=useMemo(()=>{const now=Date.now(),out={};let stale=false;
    for(const k of Object.keys(slotOv||{})){
      const v=slotOv[k];
      if(v&&v.until>now)out[k]=v.slot;else stale=true;
    }
    if(stale)setTimeout(()=>saveSlotOv(Object.fromEntries(Object.entries(slotOv).filter(([,v])=>v&&v.until>Date.now()))),0);
    return out;},[slotOv,chartTick]);
  /* Sealed placements and the absolute event sequence. Unlike slotOv above, this
     is not a correction — it is the record of where every patch goes, written
     once when its projection appears and read by everything afterwards. */
  const[places,setPlaces]=useState(()=>loadPlaces());
  const livePlace=useMemo(()=>liveMap(places.place,Date.now()),[places,chartTick]);
  /* What every seating call is given. A drag made this second still wins over the
     sealed record, so a correction never waits for the projector to catch up. */
  const seatOv=useMemo(()=>({...livePlace,...liveOv}),[livePlace,liveOv]);
  const[dayLog,setDayLog]=useState(()=>loadDayLog());
  /* The body as it actually stands at `absPos`, ready to hand forward. Occupancy
     comes from the SEATED diagram rather than the raw rotation, so a piece you
     dragged to the other leg is what travels; `offIn` keeps the off time correct
     even for a piece worn across the cycle seam. */
  const ROT_V=2;   // bump when the meaning of a stored snapshot changes
  /* Declared HERE, above makeRot, and not further down beside dueSoon. A
     useCallback's dependency array is evaluated at the point it is written, so
     listing cycLenNow there while declaring it two hundred lines later put the
     whole app in a temporal dead zone: "Cannot access before initialization",
     thrown before anything rendered. */
  /* The whole-day length of the cycle containing `date`. Lunar cycles are set by
     the moon and manual ones by the rounded boundary walk, so the answer has to
     come from whichever is actually laying the cycle out. */
  const cycLenAt=(date)=>isLunar?lunarMonthLen(date):cycleDays(getCycleIdx(date),cycleLen);
  const cycLenNow=cycLenAt(new Date());
  /* The cycle BEFORE this one. A piece worn across the seam started there, so
     finding it means stepping back by that cycle's length, not this one's. */
  const cycLenPrev=useMemo(()=>{
    const n=new Date();
    if(isLunar){
      /* Today minus the lunar day number lands on the last day of the previous
         month, whatever length either of them happens to be. */
      return lunarMonthLen(new Date(n.getFullYear(),n.getMonth(),n.getDate()-lunarDayMid(n)));
    }
    return cycleDays(getCycleIdx(n)-1,cycleLen);
  },[isLunar,cycleLen,chartTick]);
  const makeRot=useCallback((absPos,ov,ci,seed)=>{
    {
      /* The whole pool, not the first patch medication. This used to `return` as
         soon as it found one, so a second medication's pieces were absent from
         the snapshot entirely \u2014 the spots they were wearing looked free, and
         the rotation would hand them out again. */
      const ps=patchPieceList(medications,cycleLen);
      if(!ps.length)return null;
      const cap=Math.max(2,maxOnBody||8);
      const base=rotSnapshot(ps,cycleLen,cap,absPos,seed);
      const worn=patchesOnAt(absPos-ci*cycleLen,ps,cycleLen,null,null,cycLenNow,cycLenPrev);
      const {slots,key,assign}=bodySlots(worn,cap,ps,cycleLen,ov,ci,seed);
      const occ={},st=(base.st||[]).map(x=>x.slice());
      /* Where the PREVIOUS snapshot recorded each piece. A piece already recorded
         in a spot has not moved, so its stamps must not be touched again \u2014 that
         is what made this non-idempotent: every write reseated stamps, which
         changed the next seating, which wrote again, and patches wandered between
         legs on their own. A placed piece now stays placed until it comes off or
         you move it. */
      const prevAt={};
      if(seed&&seed.occ)for(const si in seed.occ){const o=seed.occ[si];if(o&&o.k!=null)prevAt[o.k]=+si;}
      /* Reseat the stamps onto where the pieces ACTUALLY are. For a piece the
         rotation put on D but you moved to H: pop D's stamp and push it onto H.
         Nothing is recomputed, and D goes back to looking exactly as rested as it
         was before the piece was ever assigned there. */
      slots.forEach((sl,idx)=>{
        if(!sl.piece)return;
        const pk=key(sl.piece);
        if(prevAt[pk]===idx){                       // unchanged since the last snapshot
          occ[idx]={k:pk,off:+(absPos+sl.piece.offIn).toFixed(4)};
          return;                                    // leave the stacks exactly as they were
        }
        const home=(prevAt[pk]!==undefined)?prevAt[pk]
                 :((sl.piece._home!==undefined)?sl.piece._home:(assign?assign[key(sl.piece)]:null));
        const stamp=+(absPos+sl.piece.offIn).toFixed(4);
        occ[idx]={k:key(sl.piece),off:stamp};
        if(home!=null&&home!==idx&&st[home]&&st[home].length)st[home].pop();
        /* Not if it's already the top. rotSnapshot's forward run has usually
           stamped this spot with this very value already, and a second copy
           breaks the correction: popping would reveal the duplicate instead of
           the value underneath, so the spot would still look as though this
           patch had been there. One stamp per stay. */
        if(st[idx]&&!(st[idx].length&&Math.abs(st[idx][st[idx].length-1]-stamp)<1e-6))st[idx].push(stamp);
      });
      return{...base,occ,st,v:ROT_V};
    }
    return null;
  },[medications,cycleLen,maxOnBody,cycLenNow,cycLenPrev]);
  const nowCdFrac=(()=>{const n=new Date();return getCycleDay(n)+(n.getHours()*60+n.getMinutes())/1440;})();
  /* The rotation seed is the most recent snapshot taken BEFORE the moment being
     drawn. Keyed on position rather than on date, so it can include one taken
     earlier today — and so drawing a past day doesn't get seeded from the future.
     Today's snapshot is provisional: it's retaken as the day goes on, so the last
     write of the day is the end-of-day one. If the app closes at three in the
     afternoon, that afternoon snapshot stands, which is good enough. */
  const seedFor=useCallback(absPos=>{
    let best=null;
    for(const k in(dayLog||{})){
      const r=dayLog[k]&&dayLog[k].rot;
      if(!r||typeof r.pos!=="number"||!(r.pos<absPos-1e-6))continue;
      /* Snapshots written before ROT_V were produced by makeRot comparing a worn
         piece against the WRONG cycle's assignment, so their rest-stamps were
         shuffled every time one was written. Those entries are still in the day
         log and would keep seeding the rotation with corrupted state \u2014 which is
         why the wrong-leg placements survived a watch reset. Ignore them: the
         rotation re-derives from the schedule, and the rest of each day-log entry
         (what was logged, what was taken) is untouched. */
      if(r.v!==ROT_V)continue;
      if(!best||r.pos>best.pos)best=r;
    }
    return best;
  },[dayLog]);
  // Today's entry is rewritten as things change, so it captures the day as lived
  // (including a piece you dragged). Once the date rolls over it's frozen.
  useEffect(()=>{
    if(loading)return;
    const now=new Date(),k=localDateKey(now);
    const cd=getCycleDay(now),ci=getCycleIdx(now);
    /* Snapshot position: NOW, quantised to a quarter hour. Quantising keeps this
       from rewriting storage on every tick, and taking it at the current moment
       (rather than at 23:59) means an export made at lunchtime carries the body as
       it stands at lunchtime, which is what an import needs to resume from. */
    const nowAbs=Math.floor((ci*cycleLen+nowCdFrac)*96)/96;
    const seed=seedFor(nowAbs);
    /* Only ever writes today's key. A past day is a closed record: once the date
       rolls over, nothing here can reach back and amend it, so a patch moved today
       changes today's entry and nothing else. */
    setDayLog(prev=>{
      const ov={...((prev[k]&&prev[k].ov)||{}),...seatOv};
      /* Snapshot the body as it stands at the END of the day, not at whatever
         moment the app happened to be open. It's derivable, so 23:59 is knowable
         from mid-afternoon — and it's what you want to see when you look back. */
      const inv=(()=>{
        const out=[];
        for(const m of medications||[]){
          if(!m.enabled||m.deliveryType!=="continuous"||m.continuousType!=="patch")continue;
          const ps=(m.pieces&&m.pieces.length)?m.pieces:blocksToPieces(m.doses,cycleLen,m.patchDuration||PATCH_HALF_LIFE);
          const worn=patchesOnAt(cd+0.9993,ps,cycleLen,null,null,cycLenNow,cycLenPrev);
          const {slots}=bodySlots(worn,maxOnBody,ps,cycleLen,ov,ci,seed);
          for(const s of slots)if(s.piece)
            out.push({med:m.name,size:s.piece.size,spot:`${s.letter}, ${s.side}`});
        }
        return out;
      })();
      /* Rotation state at 23:59, so tomorrow — or an import months from now —
         resumes from where the body actually was rather than from cycle 0. The
         occupancy comes from the seated diagram, not the raw rotation, so a piece
         you dragged to the other leg is what gets handed forward; `offIn` makes the
         off time absolute even for a piece worn across the cycle seam. */
      const rot=makeRot(nowAbs,ov,ci,seed);
      const entry={events:dayEventsFor(cd,medications,cycleLen,ov,maxOnBody,ci,seed,cycLenNow,cycLenPrev,nowCdFrac),
        cycleDay:cd,cycleIdx:ci,ov,inv,rot};
      if(prev[k]&&JSON.stringify(prev[k])===JSON.stringify(entry))return prev;
      return saveDayLog({...prev,[k]:entry});
    });
  },[chartTick,medications,cycleLen,seatOv,maxOnBody,loading,seedFor,nowCdFrac]);
  /* ═══ THE PROJECTOR ═══ */
  /* Decides, 36 hours ahead, which spot each patch is going to. From the moment
     it decides, that spot is taken — it is in the override map every seating
     reads, so the rotation cannot hand it to anybody else and the outline you can
     see on the body diagram is a fact rather than a forecast.

     Nothing here re-derives a placement that already exists. A piece is looked at
     once, on the tick it crosses the horizon, and then left alone until it falls
     off. That is the whole fix for patches appearing to move on their own: they
     were not moving, they were being decided again from a slightly different
     starting state each time the app recomputed.

     It also writes the event sequence: every application and removal with a
     permanent index and an absolute timestamp. The index is the order — neither
     device sorts its way back to it — and the timestamp is the clock time both
     devices show, so they cannot differ by a minute of rounding. */
  useEffect(()=>{
    if(loading)return;
    const now=new Date(),nowMs=now.getTime();
    const ci=getCycleIdx(now),nowAbs=ci*cycleLen+nowCdFrac;
    const horizon=PROJECT_H/24,cap=Math.max(2,maxOnBody||8);
    const seed=seedFor(nowAbs);
    setPlaces(prev=>{
      const place={...(prev.place||{})},seq=(prev.seq||[]).slice();
      let next=prev.next||1,changed=false;
      const byId={};for(const e of seq)byId[e.id]=e;
      /* One pool. Sealing per medication would let two of them reserve the same
         spot 36 hours out, each unaware of the other. */
      const pool=patchPieceList(medications,cycleLen);
      {
        for(const p of pool){
          const d0=parseFloat(p.day)||0,w=parseFloat(p.wear)||0,sz=parseFloat(p.size)||0;
          if(!(w>0)||!(sz>0))continue;
          /* The occurrence that matters: the one still to come inside the horizon,
             or the one currently being worn. Every earlier loop of the cycle is
             finished and every later one is not our business yet. */
          let onAbs=Math.floor(nowAbs/cycleLen)*cycleLen+d0;
          while(onAbs-nowAbs>horizon)onAbs-=cycleLen;
          while(onAbs+w<=nowAbs)onAbs+=cycleLen;
          if(onAbs-nowAbs>horizon)continue;
          const pk=pieceKeyOf(p),oc=Math.floor(onAbs/cycleLen);
          const onMs=nowMs+(onAbs-nowAbs)*86400000,offMs=onMs+w*86400000;
          if(!(place[pk]&&place[pk].until>nowMs)){
            /* Seat the body as it will stand at the instant this piece goes on,
               with every placement already sealed treated as occupied. Asking the
               same seater the diagram asks means the outline and the record agree
               because they are the same answer, not two answers that match. */
            const seat=bodySlots(patchesOnAt(onAbs-oc*cycleLen,pool,cycleLen,null,null,cycLenNow,cycLenPrev),cap,pool,cycleLen,
              liveMap(place,nowMs),oc,seed);
            const kf=seat.key,at=seat.slots.findIndex(x=>x.piece&&kf(x.piece)===pk);
            if(at>=0){place[pk]={slot:at,until:offMs,on:onMs,cyc:oc,src:"auto"};changed=true;}
          }
          const slot=place[pk]?place[pk].slot:null;
          const rec=(kind,ms,pos)=>{
            const id=pk+":"+kind+":"+oc,have=byId[id];
            if(!have){
              const e={id,i:next++,ms:Math.round(ms),pos:+pos.toFixed(6),
                k:pk,t:kind,s:slot,med:p._medName,size:sz};
              seq.push(e);byId[id]=e;changed=true;return;
            }
            /* A recorded event that has already happened is closed. One still
               ahead follows the schedule if you edit it, but keeps its index, so
               the order can never be rewritten underneath either device. */
            if(have.ms<=nowMs)return;
            if(Math.abs(have.ms-ms)>30000||have.s!==slot){
              have.ms=Math.round(ms);have.pos=+pos.toFixed(6);have.s=slot;changed=true;
            }
          };
          rec("on",onMs,onAbs);
          rec("off",offMs,onAbs+w);
        }
      }
      return changed?savePlaces({v:PLACE_V,place,seq,next}):prev;
    });
  },[chartTick,medications,cycleLen,maxOnBody,loading,seedFor,nowCdFrac,places]);
  const[dragSlot,setDragSlot]=useState(null);   // slot being picked up
  const[overSlot,setOverSlot]=useState(null);   // slot under the finger
  const dueSoon=useMemo(()=>upcomingDoses(medications,cycleLen,nowCdFrac,new Date(),ALERT_HOURS,cycLenNow,cycLenPrev),
    [medications,cycleLen,nowCdFrac,cycLenNow,cycLenPrev]);
  // Fire once, at the moment itself — not for the 36-hour warnings.
  useEffect(()=>{
    if(!chimeOn||loading)return;
    for(const ev of dueSoon){
      if(ev.inDays*1440>1.5)continue;           // only the minute it lands
      if(ev.vague)continue;                     // "morning" isn't a moment to chime at
      /* Keyed on the EVENT'S OWN MINUTE, not on the clock. The old key used
         Math.round(Date.now()/60000) \u2014 the minute we happened to notice \u2014 while
         the trigger window is 1.5 minutes wide. A window that wide almost always
         straddles two clock minutes, so the second pass built a different key,
         found nothing, and sounded the alarm again. That is the double chime,
         and it has been there since long before the persistent alarm.
         The event's own moment does not change between passes, so it fires once. */
      const evMin=Math.round((Date.now()+ev.inDays*86400000)/60000);
      const key=(ev.med.id||ev.med.name)+":"+ev.kind+":"+evMin;
      if(chimedRef.current.has(key))continue;
      /* Already ticked by hand? Then she knows, and there is nothing to say.
         Checked BEFORE the dedupe key is written, so that if she un-ticks the
         box inside the window the alarm has not already been marked as spent.
         Patches have no checkbox, so only "take" events can be answered this
         way. */
      if(ev.kind==="take"&&doseAlreadyTicked(ev.med,
          new Date(Date.now()+ev.inDays*86400000),ev.dose)){
        alog("skipped (already ticked)",ev.med.name);
        continue;
      }
      chimedRef.current.set(key,Date.now());
      if(chimedRef.current.size>200){
        const cut=Date.now()-6*3600000;
        for(const[k,t]of chimedRef.current)if(t<cut)chimedRef.current.delete(k);
      }
      const mode=ev.med.alarmMode||"short";
      if(mode==="off"){alog("skipped (off)",ev.med.name);continue;}
      alog("due: "+ev.med.name,mode+", "+ev.kind);
      if(mode==="long"&&ev.kind==="take"){
        /* Only a dose you TAKE gets the persistent treatment — a patch coming
           off is not something you can be woken up to swallow. */
        setAlarm({med:ev.med,kind:ev.kind,at:Date.now(),
          dose:ev.dose});
      }else{
        chime(ev.kind==="off"?"off":"on");
      }
      break;
    }
  },[chartTick,chimeOn,dueSoon,loading]);
  const shouldAffirm=(di)=>{
    if(!affirmOn)return false;
    const n=calD.dayNotes?.[di]||{};
    if(n.affirmForced!==undefined&&n.affirmForced!==false)return true;
    if(lutealAffirm&&(mPh(di,cycleLen,ovulationDay,cycleAnchor)==="Luteal"||mPh(di,cycleLen,ovulationDay,cycleAnchor)==="Premenstrual"))return true;
    const tags=(n.feeling||"").split(",").map(s=>s.trim()).filter(Boolean);
    if(tags.filter(w=>SADWORDS.has(w)).length>=3)return true;
    return false;
  };
  const getAffirmMsg=(di)=>{
    const n=calD.dayNotes?.[di]||{};
    // If pinned to a specific affirmation index, use that
    if(typeof n.affirmForced==="number"&&affirmMsgs[n.affirmForced])return affirmMsgs[n.affirmForced];
    const tags=(n.feeling||"").split(",").map(s=>s.trim()).filter(Boolean);
    const sadCount=Math.max(1,tags.filter(w=>SADWORDS.has(w)).length);
    return affirmMsgs.length>0?affirmMsgs[Math.floor((di*7+sadCount)%affirmMsgs.length)]:"";
  };
  const getMeds=(di,s,forDate)=>{const day=di+1;const m=[];
    for(const med of(s.medications||[])){
      if(!med.enabled)continue;
      if(med.deliveryType==="single"){
        for(const d of(med.doses||[])){
          const dd=Math.round(parseFloat(d.day)||0);
          if(dd===day){
            const dose=parseFloat(d.dose)||0;
            const time=timeLabel(d.time||"am");
            if(med.hasWaveform&&med.concentration){
              const ml=(dose/(med.concentration||20)).toFixed(3);
              m.push(`💉 ${med.name} ${dose}mg (${ml}mL) ${time}`);
            }else if(med.hasWaveform){
              m.push(`💊 ${med.name} ${dose}mg ${time}`);
            }else{
              m.push(`💊 ${med.name} ${dose>0?dose+"mg ":""}${time}`);
            }
          }
        }
        if(med.recurEnabled&&(parseFloat(med.recurInterval)||0)>0&&(parseFloat(med.recurDose)||0)>0){
          let rd=parseFloat(med.recurStart)||0;
          const ri=parseFloat(med.recurInterval)||3.5;
          while(rd<=30){if(Math.round(rd)===day){m.push(`💉 ${med.name} ${med.recurDose}mg ↻`);}rd+=ri;}
        }
      }else if(med.deliveryType==="continuous"&&med.continuousType==="patch"){
        const ps=(med.pieces&&med.pieces.length)?med.pieces:blocksToPieces(med.doses,cycleLen,med.patchDuration||PATCH_HALF_LIFE);
        const worn=patchesOnAt(day,ps,cycleLen,med.patchCurve,med.patchDuration,cycLenNow,cycLenPrev);
        for(const w of worn){
          if(w.age<1)m.push(`\u{1FA79} ${med.name} \u00d7${patchFracTotal(w.size)} on`);
          else if(w.offIn<=1)m.push(`\u{1FA79} ${med.name} \u00d7${patchFracTotal(w.size)} off`);
        }
        const tot=worn.reduce((a2,w)=>a2+w.size,0);
        if(tot>0)m.push(`\u{1FA79} \u00d7${patchFracTotal(snapPatch(tot))}`);
      }
    }
    return{meds:m};};

  const PALETTES={
    rose:{name:"deep rose",accent:"#f472b6",bg:["#110c14","#fdf2f8"],sf:["rgba(30,20,35,.6)","rgba(255,255,255,.8)"],tx:["#f0e6f0","#1e1020"],sub:["#a08aaa","#6b5070"],brd:["rgba(244,114,182,.08)","rgba(244,114,182,.15)"],ibg:["rgba(20,10,25,.8)","rgba(255,240,248,.8)"],ibd:["rgba(244,114,182,.12)","rgba(244,114,182,.2)"]},
    ocean:{name:"calm ocean",accent:"#60a5fa",bg:["#0c1118","#f0f5fc"],sf:["rgba(20,28,40,.6)","rgba(240,248,255,.8)"],tx:["#e0e8f4","#10182a"],sub:["#8098b8","#506080"],brd:["rgba(96,165,250,.08)","rgba(96,165,250,.15)"],ibg:["rgba(10,18,30,.8)","rgba(240,248,255,.8)"],ibd:["rgba(96,165,250,.12)","rgba(96,165,250,.2)"]},
    amethyst:{name:"amethyst",accent:"#a78bfa",bg:["#0f0c18","#f5f0ff"],sf:["rgba(25,18,40,.6)","rgba(248,245,255,.8)"],tx:["#e8e0f8","#1a1030"],sub:["#9888b8","#605080"],brd:["rgba(167,139,250,.08)","rgba(167,139,250,.15)"],ibg:["rgba(15,10,28,.8)","rgba(248,242,255,.8)"],ibd:["rgba(167,139,250,.12)","rgba(167,139,250,.2)"]},
    sage:{name:"soft sage",accent:"#34d399",bg:["#0c1410","#f0fdf4"],sf:["rgba(18,30,22,.6)","rgba(240,253,244,.8)"],tx:["#d8f0e0","#0a1810"],sub:["#80b098","#3d5a4a"],brd:["rgba(110,231,183,.08)","rgba(52,211,153,.18)"],ibg:["rgba(10,22,16,.8)","rgba(240,253,244,.8)"],ibd:["rgba(110,231,183,.12)","rgba(52,211,153,.22)"]},
    ember:{name:"warm ember",accent:"#fb923c",bg:["#14100c","#fff7ed"],sf:["rgba(35,25,18,.6)","rgba(255,247,237,.8)"],tx:["#f0e4d8","#20180e"],sub:["#b09878","#706050"],brd:["rgba(251,146,60,.08)","rgba(251,146,60,.15)"],ibg:["rgba(25,18,10,.8)","rgba(255,247,237,.8)"],ibd:["rgba(251,146,60,.12)","rgba(251,146,60,.2)"]},
  };
  const pal=PALETTES[palette]||PALETTES.rose;const di=dark?0:1;
  const bg=pal.bg[di];const sf=pal.sf[di];const tx=pal.tx[di];const sub=pal.sub[di];
  const brd=pal.brd[di];const ibg=pal.ibg[di];const ibd=pal.ibd[di];const accent=pal.accent;
  // Convert accent hex (#RRGGBB) to "r, g, b" tuple for rgba() composition
  const accentRgb=(()=>{const h=accent.replace("#","");return`${parseInt(h.slice(0,2),16)}, ${parseInt(h.slice(2,4),16)}, ${parseInt(h.slice(4,6),16)}`;})();
  const accentA=(a)=>`rgba(${accentRgb}, ${a})`;
  const checkColor={rose:"#ec4899",ocean:"#3b82f6",amethyst:"#8b5cf6",sage:"#34d399",ember:"#f97316"}[palette]||"#ec4899";
  const SLOT_COLORS={
    rose:["#f472b6","#a78bfa","#60a5fa","#34d399","#fb923c","#facc15","#f87171","#c084fc","#e879f9","#2dd4bf","#818cf8","#fbbf24","#fb7185","#a3e635","#38bdf8","#d946ef"],
    ocean:["#60a5fa","#34d399","#a78bfa","#f472b6","#38bdf8","#818cf8","#2dd4bf","#93c5fd","#6ee7b7","#e879f9","#fb923c","#facc15","#f87171","#a3e635","#c084fc","#67e8f9"],
    amethyst:["#a78bfa","#f472b6","#818cf8","#60a5fa","#c084fc","#e879f9","#34d399","#d8b4fe","#fb923c","#38bdf8","#facc15","#2dd4bf","#f87171","#a3e635","#67e8f9","#fbbf24"],
    sage:["#34d399","#60a5fa","#a78bfa","#f472b6","#6ee7b7","#2dd4bf","#86efac","#a7f3d0","#818cf8","#fb923c","#c084fc","#facc15","#38bdf8","#e879f9","#f87171","#a3e635"],
    ember:["#fb923c","#f472b6","#facc15","#60a5fa","#f97316","#a78bfa","#f87171","#fbbf24","#34d399","#818cf8","#e879f9","#38bdf8","#2dd4bf","#c084fc","#a3e635","#67e8f9"],
  }[palette]||["#f472b6","#a78bfa","#60a5fa","#34d399","#fb923c","#facc15","#f87171","#c084fc","#e879f9","#2dd4bf","#818cf8","#fbbf24","#fb7185","#a3e635","#38bdf8","#d946ef"];
  if(loading)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:bg,color:sub}}>Loading…</div>;
  const t={
    p:{minHeight:"100vh",background:bg,fontFamily:"'DM Sans',Helvetica,sans-serif",color:tx},
    w:{maxWidth:1200,margin:"0 auto",padding:"0 12px 80px"},
    c:{background:sf,border:`1px solid ${brd}`,borderRadius:10,padding:14,marginBottom:10},
    st:{fontSize:13,fontWeight:600,color:sub,marginBottom:6,display:"flex",alignItems:"center"},
    sn:c=>({display:"inline-flex",alignItems:"center",justifyContent:"center",width:18,height:18,borderRadius:4,background:c,fontSize:9,fontWeight:700,color:isB?"#0a1020":"#0f0616",marginRight:6,flexShrink:0}),
    rw:{display:"flex",gap:5,alignItems:"center",marginBottom:5},
    inp:{background:ibg,border:`1px solid ${ibd}`,borderRadius:5,padding:"5px 7px",color:tx,fontSize:13,fontFamily:"monospace",width:56,outline:"none"},
    inpS:{background:ibg,border:`1px solid ${ibd}`,borderRadius:5,padding:"5px 7px",color:tx,fontSize:13,fontFamily:"monospace",width:42,outline:"none"},
    btn:{background:`${accent}1f`,border:`1px solid ${accent}33`,borderRadius:5,padding:"5px 10px",color:accent,fontSize:11,cursor:"pointer",fontWeight:600},
    bP:{background:"rgba(168,85,247,.1)",border:"1px solid rgba(168,85,247,.2)",borderRadius:5,padding:"5px 10px",color:"#a855f7",fontSize:11,cursor:"pointer",fontWeight:600},
    bX:{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:14,padding:"0 4px"},
    lb:{fontSize:11,color:sub,marginRight:4},
    tog:a=>({width:30,height:16,borderRadius:8,background:a?accent:"rgba(148,163,184,.25)",border:"none",cursor:"pointer",position:"relative",marginLeft:6}),
    togD:a=>({position:"absolute",top:2,left:a?16:2,width:12,height:12,borderRadius:6,background:"#fff",transition:"left .2s"}),
    sa:d=>({background:d?"rgba(148,163,184,.04)":`${accent}1a`,border:`1px solid ${d?"rgba(148,163,184,.06)":`${accent}33`}`,borderRadius:4,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:d?"default":"pointer",color:d?sub:accent,fontSize:14,fontWeight:700}),
    sb:{background:`${accent}${dark?"0f":"14"}`,border:`1px solid ${accent}${dark?"1f":"33"}`,borderRadius:4,padding:"3px 8px",color:sub,fontSize:10,cursor:"pointer"},
    mb:a=>({background:a?`${accent}26`:"transparent",border:`1px solid ${a?`${accent}4d`:"rgba(148,163,184,.12)"}`,borderRadius:4,padding:"3px 8px",color:a?accent:sub,fontSize:10,cursor:"pointer",fontWeight:600}),
    tb:a=>({flex:1,padding:"8px 14px",background:a?`${accent}26`:"rgba(30,41,59,.2)",border:`1px solid ${a?`${accent}4d`:"rgba(148,163,184,.08)"}`,borderRadius:7,color:a?accent:sub,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"center"}),
  };

  /* Fills the screen so a half-asleep tap anywhere lands on it. */
  const alarmOverlay=alarm?<div onClick={()=>dismissAlarm(true)}
    style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(8,6,14,.97)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      gap:16,cursor:"pointer",padding:24,textAlign:"center",userSelect:"none"}}>
    <div style={{fontSize:11,letterSpacing:".18em",textTransform:"uppercase",
      color:"#f472b6",fontWeight:700}}>dose due</div>
    <div style={{fontSize:34,fontWeight:700,color:"#fff",lineHeight:1.15,maxWidth:640}}>
      {alarm.med.name}</div>
    {/* "mg", to match the events list. NOT med.unit — that is the SERUM unit
        (pg/mL), so printing it here would read "10pg/mL", which is wrong rather
        than merely bare. The take event carries no unit or route at all, which is
        why this showed a naked number. The route is already inside the
        medication name, e.g. "Progesterone (rectal)". */}
    {alarm.dose>0&&<div style={{fontSize:22,color:"#e9d5ff"}}>
      {alarm.dose}mg</div>}
    <div style={{fontSize:13,color:"#a78bfa"}}>
      {new Date(alarm.at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</div>
    {/* Tapping is the acknowledgement AND the tick. Not knowing whether you took
        it is the whole reason for the alarm, so silencing it has to answer that. */}
    <div style={{marginTop:12,padding:"14px 30px",borderRadius:14,
      border:"1px solid rgba(244,114,182,.45)",background:"rgba(244,114,182,.13)",
      color:"#fff",fontSize:17,fontWeight:600}}>Tap anywhere — taken</div>
    <div onClick={e=>{e.stopPropagation();dismissAlarm(false);}}
      style={{fontSize:12,color:"#6b7280",padding:"10px 16px"}}>
      silence without marking it taken</div>
    <div style={{fontSize:10,color:"#4b5563"}}>
      stops on its own after {ALARM_MINUTES} minutes</div>
  </div>:null;
  /* Asked when you are awake enough to answer. Deliberately NOT auto-resolved:
     the app does not know whether you took it, and guessing either way would be
     inventing a fact about your body. */
  const missedBanner=missed.length>0?<div style={{position:"sticky",top:0,zIndex:900,
    background:"rgba(251,191,36,.14)",borderBottom:"1px solid rgba(251,191,36,.4)",
    padding:"8px 14px",display:"flex",flexDirection:"column",gap:6}}>
    {missed.map((x,xi)=>{
      /* Once midnight has passed, the question has no answer left to give.
         There is no checkbox on a past day, so "I took it" cannot record
         anything — and the version of it that existed before this resolved
         against TODAY'S list and ticked today's box, asserting a dose that had
         not happened yet. So after midnight the row stops asking and simply
         reports: here is an alarm from that day that went unanswered. One
         button, which only clears the notice. Same-day rows keep both answers
         and the automatic tick. */
      const stale=localDateKey(new Date(x.at))!==todayKeyLive;
      return<div key={x.id||xi} style={{display:"flex",alignItems:"center",
      gap:10,flexWrap:"wrap",fontSize:12,color:"#fde68a"}}>
      <span style={{fontWeight:600}}>{stale?"Alarm on this date not answered":"Unanswered alarm"}</span>
      <span style={{color:"#fef3c7"}}>{x.name}{x.dose>0?` ${x.dose}${x.unit||""}`:""}</span>
      <span style={{color:"#d1a44a",fontSize:11}}>
        {new Date(x.at).toLocaleString([],stale
          ?{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}
          :{weekday:"short",hour:"numeric",minute:"2-digit"})}</span>
      <span style={{flex:1}}/>
      {stale?null:<button onClick={()=>{
          const m=(medications||[]).find(mm=>mm.name===x.name);
          if(m)tickDoseFor(m,new Date(x.at),x.dose);
          saveMissed(missed.filter((_,i)=>i!==xi));}}
        style={{background:"rgba(74,222,128,.15)",border:"1px solid rgba(74,222,128,.45)",
          borderRadius:6,padding:"3px 12px",color:"#4ade80",fontSize:11,fontWeight:600,
          cursor:"pointer"}}>I took it</button>}
      <button onClick={()=>saveMissed(missed.filter((_,i)=>i!==xi))}
        style={{background:"none",border:`1px solid ${brd}`,borderRadius:6,
          padding:"3px 12px",color:sub,fontSize:11,cursor:"pointer"}}>
        {stale?"Dismiss":"I missed it"}</button>
    </div>;})}
  </div>:null;
  return<div style={t.p}>{alarmOverlay}{missedBanner}
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
     {cycleShare&&(()=>{
       const cs=cycleShare;const clc=cs.cycleLen||29.5;
       let cd;
       if(cs.isLunar){cd=lunarDayMid(new Date())-1;}
       else if(cs.manualCycleStart){const diff=Math.floor((Date.now()-new Date(cs.manualCycleStart))/86400000);const cl2=Math.round(clc);cd=((diff%cl2)+cl2)%cl2;}
       else cd=0;
       const nm=(cs.name||"").trim();const pr=(cs.pronoun||"they").trim();const prObj=pr==="she"?"her":pr==="he"?"him":"them";const prPos=pr==="she"?"her":pr==="he"?"his":"their";
       const closeIt=()=>{try{history.replaceState(null,"",window.location.pathname+window.location.search);}catch(e){}setCycleShare(null);};
       // menstrual OFF (or a config with no phase meaning): neutral "day of regimen"
       // card — no cycle-phase language, since the sharer opted out of it.
       if(cs.menstrual===false){
         const total=cs.isLunar?30:Math.round(clc);const col="#60a5fa";
         return<div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(8,10,14,.82)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={closeIt}>
           <div onClick={e=>e.stopPropagation()} style={{maxWidth:400,width:"100%",background:"linear-gradient(180deg,#171821,#12131a)",border:`1px solid ${col}44`,borderRadius:18,padding:"26px 24px",boxShadow:`0 20px 60px rgba(0,0,0,.5), 0 0 40px ${col}22`,color:"#e8eef5",fontFamily:"'DM Sans',sans-serif",textAlign:"center"}}>
             <div style={{fontSize:40,marginBottom:8}}>📅</div>
             <div style={{fontSize:13,color:"#94a3b8",marginBottom:2}}>{nm?`${nm} is on`:"You're on"}</div>
             <div style={{fontSize:28,fontWeight:700,color:col,letterSpacing:"-.02em",lineHeight:1.1}}>day {cd+1}<span style={{fontSize:15,color:"#64748b",fontWeight:500}}> of {total}</span></div>
             <div style={{fontSize:13,color:"#64748b",marginTop:4}}>of {nm?`${prPos}`:"your"} hormonal regimen</div>
             <div style={{height:8,borderRadius:6,overflow:"hidden",background:"#ffffff12",margin:"18px 0 4px",position:"relative"}}><div style={{position:"absolute",left:0,top:0,bottom:0,width:`${(cd/total)*100}%`,background:col,opacity:.5}}/><div style={{position:"absolute",left:`${(cd/total)*100}%`,top:-3,bottom:-3,width:2,background:"#fff"}}/></div>
             <div style={{fontSize:11,color:"#64748b",marginTop:16,lineHeight:1.5,fontStyle:"italic"}}>{nm?`${nm} can add`:"You can add"} custom descriptions in settings for sharing, if desired.</div>
             <button onClick={closeIt} style={{marginTop:18,background:"transparent",border:`1px solid ${col}55`,borderRadius:10,padding:"8px 18px",color:col,fontSize:12,fontWeight:600,cursor:"pointer"}}>Close</button>
           </div>
         </div>;
       }
       // menstrual ON: warm phase card
       const phase=mPh(cd,clc,cs.ovulationDay,cs.cycleAnchor);const dflt=PHASE_INFO[phase]||PHASE_INFO.Follicular;
       const ov=(cs.phaseText&&cs.phaseText[phase])||{};
       const info={...dflt,blurb:ov.blurb||dflt.blurb,kind:ov.kind||dflt.kind};
       const dayLabel=cs.isLunar?`Lunar day ${cd+1}`:`Cycle day ${cd+1}`;
       const b=phaseBoundaries(clc,cs.ovulationDay);const segs=[["Menstrual",0,b.follStart],["Follicular",b.follStart,b.ovStart],["Ovulation",b.ovStart,b.lutStart],["Luteal",b.lutStart,b.preStart],["Premenstrual",b.preStart,b.cycle]];
       const anchor=((cs.cycleAnchor||0)%b.cycle+b.cycle)%b.cycle;const markPos=((((cd-anchor)%b.cycle)+b.cycle)%b.cycle)/b.cycle*100;
       return<div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(8,10,14,.82)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={closeIt}>
         <div onClick={e=>e.stopPropagation()} style={{maxWidth:420,width:"100%",background:"linear-gradient(180deg,#171821,#12131a)",border:`1px solid ${info.color}44`,borderRadius:18,padding:"26px 24px",boxShadow:`0 20px 60px rgba(0,0,0,.5), 0 0 40px ${info.color}22`,color:"#e8eef5",fontFamily:"'DM Sans',sans-serif",textAlign:"center"}}>
           <div style={{fontSize:44,marginBottom:6}}>{info.emoji}</div>
           <div style={{fontSize:13,color:"#94a3b8",marginBottom:2}}>{nm?`${nm} is in ${prPos}`:"You're in your"}</div>
           <div style={{fontSize:30,fontWeight:700,color:info.color,letterSpacing:"-.02em",lineHeight:1.1}}>{phase} phase</div>
           <div style={{fontSize:12,color:"#64748b",marginTop:4}}>{dayLabel} · {info.tone}</div>
           <div style={{height:8,borderRadius:6,overflow:"hidden",display:"flex",margin:"18px 0 6px"}}>
             {segs.map(([nmS,s,e])=>{const w=(e-s)/b.cycle*100;const c=(PHASE_INFO[nmS]||{}).color||"#555";return<div key={nmS} style={{width:`${w}%`,background:nmS===phase?c:`${c}55`}}/>;})}
           </div>
           <div style={{position:"relative",height:0}}><div style={{position:"absolute",left:`${markPos}%`,top:-13,transform:"translateX(-50%)",width:2,height:14,background:"#fff",boxShadow:"0 0 4px #fff"}}/></div>
           <div style={{fontSize:13,lineHeight:1.5,color:"#cbd5e1",marginTop:16}}>{info.blurb}</div>
           <div style={{fontSize:13,lineHeight:1.5,color:info.color,marginTop:10,fontWeight:500}}>{nm?info.kind.replace(/\bthem\b/g,prObj).replace(/\btheir\b/g,prPos):info.kind}</div>
           <div style={{fontSize:10,color:"#475569",marginTop:16,fontStyle:"italic"}}>Every cycle is different — this describes common patterns, not rules.</div>
           <button onClick={closeIt} style={{marginTop:18,background:"transparent",border:`1px solid ${info.color}55`,borderRadius:10,padding:"8px 18px",color:info.color,fontSize:12,fontWeight:600,cursor:"pointer"}}>Close</button>
         </div>
       </div>;
     })()}
  {/* Drag ghost — floats with pointer during a drag-to-combine. position:fixed
      so it overlays the entire viewport. pointerEvents:none so it doesn't
      interfere with elementFromPoint hit-testing. */}
  {dragGhostPos&&dragGhostInfo&&<div style={{
    position:"fixed",
    left:dragGhostPos.x-24,top:dragGhostPos.y-28,
    width:48,height:56,borderRadius:6,
    border:`1.5px solid ${dragGhostInfo.color}88`,
    background:dark?"rgba(20,16,30,0.85)":"rgba(248,246,252,0.92)",
    display:"flex",alignItems:"center",justifyContent:"center",
    boxShadow:dark?"0 8px 24px rgba(0,0,0,0.6)":"0 8px 24px rgba(168,85,247,0.25)",
    pointerEvents:"none",zIndex:9999,
    transform:"scale(1.15)",
    backdropFilter:"blur(4px)",
  }}>
    <div style={{position:"absolute",top:0,left:0,width:10,height:10,borderRadius:"0 0 5px 0",background:dragGhostInfo.color,opacity:0.85}}/>
    <span style={{fontSize:18,fontWeight:700,color:dragGhostInfo.color}}>{dragGhostInfo.label}</span>
  </div>}
  <style>{`
    [data-tip]{position:relative;}
    [data-tip]::after{content:attr(data-tip);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:rgba(15,10,20,.92);color:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:10px;white-space:normal;max-width:180px;pointer-events:none;opacity:0;transition:opacity .2s;z-index:999;line-height:1.3;}
    [data-tip]:hover::after{opacity:1;transition:opacity .2s 2.75s;}
    [data-tip-below]{position:relative;}
    [data-tip-below]::after{content:attr(data-tip-below);position:absolute;top:100%;left:50%;transform:translateX(-50%);background:rgba(15,10,20,.92);color:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:10px;white-space:normal;max-width:180px;pointer-events:none;opacity:0;transition:opacity .2s;z-index:999;line-height:1.3;margin-top:4px;}
    [data-tip-below]:hover::after{opacity:1;transition:opacity .2s 2.75s;}
    html,body{overflow-x:hidden;scrollbar-width:thin;scrollbar-color:rgba(148,163,184,.2) transparent;}
    html::-webkit-scrollbar{width:6px;height:6px;}
    html::-webkit-scrollbar-track{background:transparent;}
    html::-webkit-scrollbar-thumb{background:rgba(148,163,184,.15);border-radius:3px;}
    html::-webkit-scrollbar-thumb:hover{background:rgba(148,163,184,.35);}
    *{scrollbar-width:thin;scrollbar-color:rgba(148,163,184,.2) transparent;}
    @media(min-width:769px){html{zoom:1.3;}}
    .hcm-topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:10px 14px;border-bottom:1px solid rgba(148,163,184,.06);gap:6px;}
    .hcm-grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:7px;}
    .hcm-calgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:3px;max-width:100%;}
    .hcm-calcontrols{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
    .hcm-actions{display:flex;gap:3px;justify-self:end;}
    @media(max-width:768px){
    .hcm-topbar{grid-template-columns:1fr;justify-items:center;text-align:center;gap:8px;}
      .hcm-topbar .hcm-actions{justify-self:center;}
      .hcm-grid2{grid-template-columns:1fr;}
      .hcm-calgrid{grid-template-columns:repeat(auto-fill,minmax(90px,1fr));}
      .hcm-calcontrols{justify-content:center;}
    }
    @media(max-width:480px){
      .hcm-calgrid{grid-template-columns:repeat(3,1fr);}
    }
    html,body{margin:0;padding:0;}
  `}</style>
  <input type="file" accept=".json" ref={importRef} style={{display:"none"}} onChange={importAll}/>
  {/* Floating exit-focus button: when chrome is hidden, this is the only
      reliable way to exit focus mode. Sits in the top-right where the
      settings gear normally is. Both the chart and the calendar render
      at the same time in focus mode, so no tab toggle is needed. */}
  {focusMode&&<div style={{position:"fixed",top:8,right:8,zIndex:1000,background:dark?"rgba(20,12,25,.85)":"rgba(255,255,255,.9)",border:`1px solid ${brd}`,borderRadius:6,padding:"4px 6px",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",gap:8}}>
    <Clock style={{fontSize:11,color:tx,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}/>
    <button onClick={()=>setFocusMode(false)} style={{...t.sb,fontSize:11,padding:"3px 6px",display:"inline-flex",alignItems:"center",justifyContent:"center"}} data-tip="Exit focus mode">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="4.5,1 4.5,4.5 1,4.5"/>
        <polyline points="7.5,1 7.5,4.5 11,4.5"/>
        <polyline points="4.5,11 4.5,7.5 1,7.5"/>
        <polyline points="7.5,11 7.5,7.5 11,7.5"/>
      </svg>
    </button>
  </div>}
  {!focusMode&&<div className="hcm-topbar">
    <div style={{fontSize:14,fontWeight:700,color:tx}}>Blood Level Sketchpad and Calendar<div style={{fontSize:8,fontWeight:400,color:sub,marginTop:1}}>personal creative visualizer using additive synthesis</div></div>
    <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"nowrap",minWidth:0}}><button style={t.tb(tab==="modeler")} onClick={()=>setTab("modeler")} data-tip-below="Curve editor and dose schedule builder">Modeler</button><button style={t.tb(tab==="calendar")} onClick={()=>setTab("calendar")} data-tip-below="Calendar view with daily medication and mood tracking">Calendar</button>
      <span style={{fontSize:8,color:sub,marginLeft:4,whiteSpace:"nowrap"}}>{isLunar?"🌙 lunar month":`🔧 ${cycleLen}d`}{isMenstrual?" · menstrual":""}</span>
      {/* Liberation on sight — subtle mantra, always to the right of tabs, shrinks to fit */}
      {libFade>0&&<img src={LIB_IMG} alt="" style={{height:22,maxHeight:22,opacity:libFade,filter:dark?"invert(1)":"none",marginLeft:4,flexShrink:1,minWidth:0,objectFit:"contain"}}/>}
    </div>
    <div className="hcm-actions"><Clock style={{fontSize:11,color:tx,marginRight:8,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}/><button style={{...t.sb,fontSize:12}} onClick={()=>setSettingsOpen(!settingsOpen)} data-tip-below="Settings, data, and export">⚙</button><button style={{...t.sb,fontSize:12}} onClick={()=>{setToolsOpen(!toolsOpen);setSettingsOpen(false);}} data-tip-below="Tools — calculators and utilities">🔨</button><button style={{...t.sb,fontSize:14,padding:"2px 8px"}} onClick={()=>setDark(!dark)} data-tip-below="Toggle dark/light mode">{dark?"☀️":"🌙"}</button></div>
  </div>}
  {toolsOpen&&<div style={{background:sf,border:`1px solid ${brd}`,borderRadius:8,padding:"12px 16px",margin:"8px 0"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:600,color:tx}}>🔨 Tools</div>
      <button onClick={()=>setToolsOpen(false)} style={{...t.sb,fontSize:10,padding:"2px 8px"}}>close</button>
    </div>
        <div style={{marginTop:12}}>
          <button onClick={()=>setRedoseOpen(o=>!o)} style={{...t.btn,fontSize:10,padding:"4px 10px"}}>🩹 Rectal redose calculator {redoseOpen?"▾":"▸"}</button>
          {redoseOpen&&(()=>{
            const parse=v=>{if(!v)return null;const[h,m]=v.split(":").map(Number);if(isNaN(h))return null;return h+(m||0)/60;};
            const th=parse(rdTaken),oh=parse(rdOut);const dose=parseFloat(rdDose);
            let elapsed=(th!=null&&oh!=null)?(oh-th):null;if(elapsed!=null&&elapsed<0)elapsed+=24;
            // Absorption is spread over a window somewhere in [lo, hi] hours. A SHORTER
            // window means faster absorption → more on board at excretion → smaller
            // make-up; a LONGER window → slower → more lost → bigger make-up. So the
            // range of plausible windows gives a low→high range for the make-up dose.
            const fracAt=w=>elapsed!=null?Math.max(0,Math.min(elapsed/w,1)):null;
            const fLo=fracAt(rdWinLo),fHi=fracAt(rdWinHi);// fLo (short window) = more absorbed
            const mkLo=(fLo!=null&&dose>0)?dose*(1-fLo):null;// smaller make-up
            const mkHi=(fHi!=null&&dose>0)?dose*(1-fHi):null;// larger make-up
            const ready=mkLo!=null;const fullyAbsorbed=elapsed!=null&&elapsed>=rdWinHi;
            const dp=rdUnit==="mL"?2:1;
            return<div style={{marginTop:8,background:ibg,border:`1px solid ${ibd}`,borderRadius:8,padding:12,maxWidth:380}}>
              <div style={{background:"rgba(251,191,36,.09)",border:"1px solid rgba(251,191,36,.28)",borderRadius:6,padding:"7px 9px",fontSize:9.5,color:"#fbbf24",lineHeight:1.5,marginBottom:11}}>⚠️ <b>Forgiving medications only</b> (e.g. progesterone — wide safety margin). Do <b>not</b> use for anything with a narrow therapeutic window or where an extra partial dose could be dangerous. This is a rough linear estimate; real rectal absorption varies widely between people and days, so treat the result as a ballpark, not a precise correction.</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:9}}>
                <label style={{fontSize:9.5,color:sub}}>dose taken<br/><input type="time" value={rdTaken} onChange={e=>setRdTaken(e.target.value)} style={{marginTop:2,background:sf,border:`1px solid ${ibd}`,borderRadius:4,padding:"3px 5px",color:tx,fontSize:11,outline:"none"}}/></label>
                <label style={{fontSize:9.5,color:sub}}>excreted (BM)<br/><input type="time" value={rdOut} onChange={e=>setRdOut(e.target.value)} style={{marginTop:2,background:sf,border:`1px solid ${ibd}`,borderRadius:4,padding:"3px 5px",color:tx,fontSize:11,outline:"none"}}/></label>
                <label style={{fontSize:9.5,color:sub}}>original dose<br/><span style={{display:"inline-flex",gap:3,marginTop:2,alignItems:"center"}}><input value={rdDose} onChange={e=>setRdDose(e.target.value)} placeholder="0.23" style={{width:52,background:sf,border:`1px solid ${ibd}`,borderRadius:4,padding:"3px 5px",color:tx,fontSize:11,outline:"none"}}/><button onClick={()=>setRdUnit(u=>u==="mL"?"mg":"mL")} style={{...t.sb,fontSize:9,padding:"3px 6px"}}>{rdUnit}</button></span></label>
              </div>
              <div style={{fontSize:9.5,color:sub,marginBottom:4}}>ideal absorption window (time to full absorption)</div>
              <div style={{marginBottom:11}}><select value={`${rdWinLo}-${rdWinHi}`} onChange={e=>{const[a,b]=e.target.value.split("-").map(Number);setRdWinLo(a);setRdWinHi(b);}} style={{background:sf,border:`1px solid ${ibd}`,borderRadius:4,padding:"4px 8px",color:tx,fontSize:10,cursor:"pointer",outline:"none"}}>
                <option value="5-8">5–8 h · typical rectal progesterone</option>
                <option value="5-6">5–6 h · faster end</option>
                <option value="6-8">6–8 h · slower end</option>
                <option value="5-5">5 h · single (your usual)</option>
              </select></div>
              {ready?<div style={{background:sf,borderRadius:6,padding:"9px 11px",fontSize:11,color:tx,lineHeight:1.5}}>
                {fullyAbsorbed?<span>Held <b>{elapsed.toFixed(1)}h</b> — past the full {rdWinHi}h window, so it was <b style={{color:"#34d399"}}>fully absorbed</b>. No make-up needed.</span>:
                <span>Held <b>{elapsed.toFixed(1)}h</b> before excretion. Over a {rdWinLo===rdWinHi?`${rdWinLo}h`:`${rdWinLo}–${rdWinHi}h`} window, roughly <b>{Math.round((fLo)*100)}{rdWinLo!==rdWinHi?`–${Math.round((fHi)*100)}`:""}%</b> absorbed.<br/>Estimated make-up: <b style={{color:accent,fontSize:14}}>{rdWinLo===rdWinHi?`${mkLo.toFixed(dp)}`:`${mkLo.toFixed(dp)}–${mkHi.toFixed(dp)}`} {rdUnit}</b>{rdWinLo!==rdWinHi&&<span style={{color:sub,fontSize:10}}> (≈{(((mkLo+mkHi)/2)).toFixed(dp)} mid)</span>}</span>}
              </div>:<div style={{fontSize:10,color:sub,fontStyle:"italic"}}>Enter both times and the original dose to estimate a make-up.</div>}
              <div style={{fontSize:8.5,color:sub,marginTop:8,lineHeight:1.5,opacity:.8}}>Assumes a steady (linear) absorption rate across the window. Since you did absorb some, err toward the estimate rather than a full re-dose — and if timing slips recur, worth a line to your prescriber. Not medical advice.</div>
            </div>;
          })()}
        </div>
        <div style={{marginTop:12}}>
          <button onClick={openBangleTool} style={{...t.btn,fontSize:10,padding:"4px 10px"}}>⌚ Load to Bangle.js {bangleOpen?"▾":"▸"}</button>
          {bangleOpen&&(
            <div style={{marginTop:8,fontSize:11,color:sub,lineHeight:1.5}}>
              <div style={{marginBottom:8}}>Installs Palace of Power as the watch face and pushes your CURRENT schedule. Works from any tab. Nothing is wiped. Chrome or Edge, watch on and unlocked.</div>
              <button disabled={bangleBusy} onClick={()=>loadToBangle(false)} style={{...t.btn,fontSize:10,padding:"4px 10px",opacity:bangleBusy?0.6:1}}>{bangleBusy?"working…":"⌚ Send to watch"}</button>
              <button disabled={bangleBusy} onClick={()=>{ if(window.confirm("Remove Palace of Power's own files from the watch and send this schedule fresh?\n\nUse this if the watch is showing an old schedule. Your other watch apps are not touched.")) loadToBangle(true); }} style={{...t.btn,fontSize:10,padding:"4px 10px",marginLeft:6,opacity:bangleBusy?0.6:1}}>{bangleBusy?"working…":"↻ Clear watch + send"}</button>
              {bangleMsg&&<div style={{marginTop:6,color:tx}}>{bangleMsg}</div>}
            </div>
          )}
        </div>
  </div>}
  {settingsOpen&&<div style={{background:sf,border:`1px solid ${brd}`,borderRadius:8,padding:"12px 16px",margin:"8px 0"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:600,color:tx,display:"flex",alignItems:"baseline",gap:6}}>Settings
        <span style={{fontSize:8,fontWeight:400,color:sub,opacity:.55,letterSpacing:".06em"}}
          title="Build ID. If this doesn't change after a deploy, the deploy didn't land.">{BUILD_ID}</span></div>
      <button onClick={()=>setSettingsOpen(false)} style={{...t.bX,fontSize:14}}>×</button>
    </div>
    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
      <div style={{flex:"1 1 220px",minWidth:200}}>
        <div style={{fontSize:10,color:sub,marginBottom:5,fontWeight:600}}>Schedule Mode</div>
        <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
          <button onClick={()=>{setSchedMode("lunar");setCL(29.5);}} style={{background:isLunar?`${accent}26`:"transparent",border:`1px solid ${isLunar?`${accent}4d`:"transparent"}`,borderRadius:4,padding:"4px 10px",fontSize:10,fontWeight:isLunar?600:400,color:isLunar?accent:sub,cursor:"pointer"}} data-tip="Sync schedule to the astronomical lunar cycle (~29.5 days)">🌙 Lunar Month</button>
          <button onClick={()=>{setSchedMode("manual");if(!manualCycleStart)setManualCycleStart(new Date().toISOString().slice(0,10));}} style={{background:!isLunar?`${accent}26`:"transparent",border:`1px solid ${!isLunar?`${accent}4d`:"transparent"}`,borderRadius:4,padding:"4px 10px",fontSize:10,fontWeight:!isLunar?600:400,color:!isLunar?accent:sub,cursor:"pointer"}} data-tip="Custom cycle length for any recurring medication schedule">🔧 Custom Frequency</button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <label style={{display:"flex",alignItems:"center",gap:3,cursor:"pointer",fontSize:10,color:isMenstrual?accent:sub}} data-tip="Show menstrual cycle phases, moon names, and hormone reference curves in the calendar">
            <input type="checkbox" checked={isMenstrual} onChange={e=>setMenstrualOn(e.target.checked)} style={{accentColor:accent}}/>menstrual cycle
          </label>
          {!isLunar&&<div style={{display:"flex",gap:4,alignItems:"center"}}>
            <span style={{fontSize:10,color:sub}}>every</span>
            <NI value={cL} onChange={setCL} min={3} max={90} step={.5} style={{width:44,background:ibg,border:`2px solid ${accent}88`,borderRadius:5,padding:"3px 6px",color:accent,fontSize:12,fontWeight:700,textAlign:"center",outline:"none"}}/>
            <span style={{fontSize:10,color:sub}}>days</span>
          </div>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:8}}>
          <div>
            <div style={{fontSize:10,color:sub,marginBottom:3,fontWeight:600}}>Theme</div>
            <select value={palette} onChange={e=>setPalette(e.target.value)} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:"4px 8px",color:tx,fontSize:10,cursor:"pointer",outline:"none"}}>{Object.entries(PALETTES).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select>
          </div>
          <div>
            <div style={{fontSize:10,color:sub,marginBottom:3,fontWeight:600}}>Mood Emojis</div>
            <button onClick={()=>setEmojiStyle(s=>s==="fem"?"masc":"fem")} style={{...t.btn,fontSize:10,padding:"4px 10px"}}>{emojiStyle==="fem"?"♀ fem":"♂ masc"}</button>
          </div>
          <div>
            <div style={{fontSize:10,color:sub,marginBottom:3,fontWeight:600}}>Affirmations</div>
            <button onClick={()=>{setAffirmEdit(!affirmEdit);setSettingsOpen(false);}} style={{...t.btn,fontSize:10,padding:"4px 10px"}}>💜 Edit</button>
          </div>
        </div>
        {/* === SCHEDULES & CYCLE ===
            Consolidates the previously-separate "schedule cluster" bar
            (was at the top of the modeler tab) and the "mini settings"
            row (was on the calendar tab). One place to switch between
            schedules, rename them, create/duplicate/delete, and adjust
            the cycle's ovulation-day and phase-anchor knobs. */}
        <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${brd}`}}>
          <div style={{fontSize:10,color:sub,marginBottom:5,fontWeight:600}}>Schedules</div>
          <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:6,flexWrap:"wrap"}}>
            <button style={t.sa(si<=0)} onClick={()=>goTo(si-1)} disabled={si<=0}>‹</button>
            <div style={{flex:"1 1 120px",minWidth:100}}>{en?<input autoFocus style={{background:ibg,border:`1px solid rgba(244,114,182,.25)`,borderRadius:3,padding:"2px 5px",color:tx,fontSize:11,fontWeight:600,textAlign:"center",outline:"none",width:"100%"}} value={sc.name} onChange={e=>rnSc(e.target.value)} onBlur={()=>setEn(false)} onKeyDown={e=>{if(e.key==="Enter")setEn(false);}}/>:<div style={{fontSize:11,fontWeight:600,color:tx,cursor:"pointer",textAlign:"center"}} onClick={()=>setEn(true)} data-tip="Click to rename this schedule">{sc.name} <span style={{fontSize:7,color:sub}}>{si+1}/{scheds.length}</span></div>}</div>
            <button style={t.sa(si>=scheds.length-1)} onClick={()=>goTo(si+1)} disabled={si>=scheds.length-1}>›</button>
            <button style={t.sb} onClick={addSc} data-tip="Create a new empty schedule">+</button>
            <button style={t.sb} onClick={dupSc} data-tip="Duplicate the current schedule">Dup</button>
            {scheds.length>1&&<button style={{...t.sb,color:"#f87171"}} onClick={delSc} data-tip="Delete this schedule">Del</button>}
          </div>
          {isMenstrual&&<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",fontSize:10,color:sub}}>
            <div style={{display:"flex",alignItems:"center",gap:3}} data-tip="Cycle day on which ovulation falls. Phase boundaries (menstrual / follicular / ovulation / luteal / premenstrual) stretch around this day. For lunar alignment, day 14–15 in a 29-day cycle puts ovulation on the full moon ('white moon cycle')."><button style={{...t.sb,fontSize:11,padding:"3px 8px"}} onClick={()=>setOvulationDay(p=>Math.max(2,p-1))}>◀</button><span style={{minWidth:54,textAlign:"center"}}>ovul day {ovulationDay}</span><button style={{...t.sb,fontSize:11,padding:"3px 8px"}} onClick={()=>setOvulationDay(p=>Math.min(Math.round(cycleLen)-1,p+1))}>▶</button></div>
            <div style={{display:"flex",alignItems:"center",gap:3}} data-tip={isLunar?`Phase calendar rotation. day 1 = 1 means cycle day 1 lands on lunar day 1 (new moon — 'white moon cycle'). day 1 = 16 means cycle day 1 lands on lunar day 16 (full moon — 'red moon cycle'). Doses don't move; only phase labels and reference curves rotate.`:`Phase calendar rotation. day 1 = 1 means phase day 1 falls on the manual cycle start. Increase to rotate phases later in the cycle without moving doses.`}><button style={{...t.sb,fontSize:11,padding:"3px 8px"}} onClick={()=>setCycleAnchor(p=>{const cl=Math.round(cycleLen);return((p-1)%cl+cl)%cl;})}>◀</button><span style={{minWidth:54,textAlign:"center"}}>day 1 = {cycleAnchor+1}</span><button style={{...t.sb,fontSize:11,padding:"3px 8px"}} onClick={()=>setCycleAnchor(p=>{const cl=Math.round(cycleLen);return(p+1)%cl;})}>▶</button></div>
          </div>}
          {!isLunar&&<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:6,fontSize:10,color:sub}}>
            <span data-tip="The calendar date that corresponds to cycle day 1. Changing this shifts your entire schedule relative to the calendar.">day 1:</span>
            <input type="date" value={manualCycleStart||new Date().toISOString().slice(0,10)} onChange={e=>setManualCycleStart(e.target.value)} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:"2px 4px",color:tx,fontSize:10,outline:"none"}}/>
            <button onClick={()=>{if(confirm("This will reset your cycle — today becomes day 1.\n\nContinue?")){setManualCycleStart(new Date().toISOString().slice(0,10));}}} style={{...t.sb,fontSize:9,padding:"2px 6px",color:accent}} data-tip="Reset cycle to day 1 today">⟲ day 1 today</button>
          </div>}
        </div>
      </div>
      <div style={{flex:"1 1 280px",minWidth:240,borderLeft:`1px solid ${brd}`,paddingLeft:16}}>
        <div style={{fontSize:10,color:sub,marginBottom:5,fontWeight:600}}>Data</div>
        <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
          <select value={importMode} onChange={e=>setImportMode(e.target.value)} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:"3px 6px",color:sub,fontSize:10,outline:"none",cursor:"pointer"}} data-tip="How to handle imported data (applies to both JSON and share string)"><option value="add">Import: add to existing</option><option value="overwrite">Import: replace all</option></select>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
          {[["schedules","Schedules"],["calendar","Calendar"],["affirmations","Affirmations"],["settings","Settings"],["history","History"]].map(([k,label])=>
            <label key={k} style={{display:"flex",alignItems:"center",gap:2,cursor:"pointer",fontSize:10,color:shareParts[k]?tx:sub}}>
              <input type="checkbox" checked={shareParts[k]} onChange={e=>setShareParts(p=>({...p,[k]:e.target.checked}))} style={{accentColor:accent}}/>{label}
            </label>)}
          {/* History sub-toggle: only meaningful when Patch Data is included.
              Controls whether past-day patch snapshots ride along on export. */}

        </div>
        <div style={{display:"flex",gap:8,alignItems:"flex-start",flexWrap:"wrap",marginBottom:8}}>
          <div>
            <div style={{fontSize:9,color:sub,marginBottom:3,fontWeight:500}}>JSON</div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <button onClick={exportAll} style={{...t.btn,fontSize:10,padding:"4px 10px"}}>Export</button>
              <button onClick={()=>importRef.current?.click()} style={{...t.btn,fontSize:10,padding:"4px 10px"}}>Import</button>
            </div>
          </div>
          <div>
            <div style={{fontSize:9,color:sub,marginBottom:3,fontWeight:500}}>Share String</div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <button onClick={generateShareString} style={{...t.btn,fontSize:10,padding:"4px 10px"}}>Export</button>
            </div>
          </div>
        </div>
        {shareStr&&<div style={{marginBottom:4}}>
          <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:2}}>
            <button onClick={()=>{navigator.clipboard.writeText(shareStr).then(()=>alert("Copied!")).catch(()=>{const ta=document.createElement("textarea");ta.value=shareStr;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);alert("Copied!");});}} style={{...t.btn,fontSize:9,padding:"3px 8px"}}>Copy</button>
            <span style={{fontSize:8,color:sub}}>{shareStr.length} chars</span>
          </div>
          <textarea readOnly value={shareStr} style={{width:"100%",height:36,background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:6,color:tx,fontSize:8,fontFamily:"monospace",resize:"none",outline:"none",wordBreak:"break-all"}}/>
        </div>}
        <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:4}}>
          <input value={shareImport} onChange={e=>setShareImport(e.target.value)} placeholder="Paste share string to import..." style={{flex:1,background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:"3px 6px",color:tx,fontSize:10,fontFamily:"monospace",outline:"none"}}/>
          <button onClick={importShareString} disabled={!shareImport.trim()} style={{...t.btn,fontSize:10,padding:"3px 8px",opacity:shareImport.trim()?1:.4}}>Import</button>
        </div>
        <div style={{marginTop:12,borderTop:`1px solid ${brd}`,paddingTop:8}}>
          <div style={{fontSize:10,color:sub,marginBottom:5,fontWeight:600}}>Print Calendar & Export iCal</div>
          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:3}}>
              <NI value={printMonths} onChange={setPrintMonths} min={1} max={36} step={1} style={{width:28,background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:"2px 4px",color:tx,fontSize:10,textAlign:"center"}}/>
              <span style={{fontSize:10,color:sub}}>months</span>
            </div>
            <button onClick={printCalendar} style={{...t.btn,fontSize:10,padding:"4px 10px"}}>🖨 Print Calendar</button>
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
            <select value={icalAlarm} onChange={e=>setIcalAlarm(e.target.value)} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:"3px 6px",color:icalAlarm?"#c084fc":sub,fontSize:10,outline:"none",cursor:"pointer"}} data-tip="iCal reminder time"><option value="">no reminder</option>{Array.from({length:24},(_,i)=>{const lbl=i===0?"12 AM":i<12?`${i} AM`:i===12?"12 PM":`${i-12} PM`;return<option key={i} value={`${String(i).padStart(2,"0")}:00`}>{lbl}</option>})}</select>
            <button onClick={exportIcal} style={{...t.btn,fontSize:10,padding:"4px 10px"}}>📅 Export iCal</button>
          </div>
        </div>
      </div>
    </div>
    <div style={{marginTop:14,borderTop:`1px solid ${brd}`,paddingTop:12,
      display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
    <div style={{flex:"1 1 240px",minWidth:200,order:2}}>
      <div style={{fontSize:11,fontWeight:600,color:tx,marginBottom:2}}>🔔 Sounds</div>
      <div style={{fontSize:9,color:sub,marginBottom:8}}>The switch below turns sound on
        or off entirely. Each medication then chooses its own kind of alarm.</div>
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:tx,cursor:"pointer"}}
        title="A chirp at the moment a patch goes on or comes off, and when any dose is due. Rising for on, falling for off. Only sounds while the app is open.">
        <input type="checkbox" checked={chimeOn}
          onChange={e=>{const v=e.target.checked;setChimeOn(v);
            try{localStorage.setItem("hcm-chime",v?"yes":"no");}catch(err){}
            if(v)chime("on");}}
          style={{accentColor:accent,cursor:"pointer"}}/>
        <span style={{fontSize:12}}>{chimeOn?"\u{1F514}":"\u{1F515}"}</span>
        dose chime
      </label>
      {/* Says out loud whether sound can actually play. A browser will not start
          audio without a gesture, and a silent alarm reports nothing at all —
          so the only way to know is to be told. */}
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:tx,cursor:"pointer"}}
        title="Keeps the screen from sleeping, for a tablet that lives out in the room. Off by default — a screen that never sleeps is not what you want in a bedroom.">
        <input type="checkbox" checked={keepAwake}
          onChange={e=>{const v=e.target.checked;setKeepAwake(v);
            try{localStorage.setItem("hcm-wakelock",v?"yes":"no");}catch(err){}}}
          style={{accentColor:accent,cursor:"pointer"}}/>
        keep screen awake
      </label>
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:tx,cursor:"pointer"}}
        title={"Plays a continuous 30 Hz tone. Chrome only exempts a page from background timer throttling while it is making AUDIBLE noise \u2014 silence does not count \u2014 and 30 Hz is loud in the audio stream but below what a tablet speaker can reproduce.\n\nCHECK THE TAB: a speaker icon means Chrome considers it audible and the exemption applies. No icon means raise the level."}>
        <input type="checkbox" checked={keepAudible}
          onChange={e=>{const v=e.target.checked;setKeepAudible(v);
            try{localStorage.setItem("hcm-keepaudible",v?"yes":"no");}catch(err){}}}
          style={{accentColor:accent,cursor:"pointer"}}/>
        keep audio awake (30 Hz)
      </label>
      {keepAudible&&<label style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:sub}}
        title="Raise this until the tab shows a speaker icon. If you can hear a hum, lower it.">
        level
        <input type="range" min="0.005" max="0.25" step="0.005" value={keepLevel}
          onChange={e=>{const v=parseFloat(e.target.value);setKeepLevel(v);
            try{localStorage.setItem("hcm-keeplevel",String(v));}catch(err){}}}
          style={{width:80,accentColor:accent}}/>
        <span style={{fontFamily:"ui-monospace,monospace"}}>{keepLevel.toFixed(3)}</span>
        <span style={{color:sub}}>&mdash; raise until the tab shows a speaker icon</span>
      </label>}
      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:tx,cursor:"pointer"}}
        title="When you tap a persistent alarm away, tick that dose off as taken. Only for medications that have a checkbox — patches live in the inventory and have none.">
        <input type="checkbox" checked={tickOnSilence}
          onChange={e=>{const v=e.target.checked;setTickOnSilence(v);
            try{localStorage.setItem("hcm-autotick",v?"yes":"no");}catch(err){}}}
          style={{accentColor:accent,cursor:"pointer"}}/>
        silencing ticks the dose off
      </label>
      {/* Waiting for a real dose to find out whether sound works is how we got
          here. This fires the whole path on demand. */}
      <button onClick={()=>{
          const m=(medications||[]).find(x=>x.enabled&&(x.alarmMode||"short")==="long")
                ||(medications||[])[0];
          if(!m){alog("test: no medication");return;}
          alog("TEST fired",m.name);
          if((m.alarmMode||"short")==="long")
            setAlarm({med:m,kind:"take",at:Date.now(),dose:0});
          else chime("on");
        }}
        title="Fires the real alarm path now, using the first medication set to persistent."
        style={{...t.sb,fontSize:10}}>test alarm now</button>
      <details style={{width:"100%",marginTop:6}}>
        <summary style={{fontSize:10,color:sub,cursor:"pointer"}}>sound log</summary>
        <div style={{maxHeight:170,overflow:"auto",marginTop:5,fontSize:9,
          fontFamily:"ui-monospace,Menlo,monospace",color:sub,lineHeight:1.55}}>
          {(logRef.current||(()=>{try{return JSON.parse(localStorage.getItem("hcm-soundlog")||"[]");}
            catch(e){return[];}})()).slice().reverse().map((r,ri)=>
            <div key={ri}>
              <span style={{color:tx}}>
                {new Date(r.t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
              </span>{" "}{r.w}{r.x?"  \u2014  "+r.x:""}
            </div>)}
        </div>
        <div style={{fontSize:8,color:sub,marginTop:4,lineHeight:1.4}}>
          Every sound the app tried to make, and the state of the audio system at
          that instant. "ctx suspended" means the browser refused to play, which is
          a policy we cannot argue with; "ctx running" means it played and
          something else is wrong. Kept across reloads.
        </div>
      </details>
      {/* ═══ PER MEDICATION ═══
          A patch coming off and a short-half-life dose at 6am are not the same
          urgency, so they do not get the same sound. Listed here rather than on
          each medication card because this is where you come looking for it, and
          because seeing them together is how you notice that the one that
          matters is still set to a ping. */}
      {chimeOn&&(medications||[]).length>0&&<div style={{marginTop:10,paddingTop:8,
        borderTop:`1px solid ${brd}`}}>
        <div style={{fontSize:10,fontWeight:600,color:tx,marginBottom:5}}>Per medication</div>
        {(medications||[]).map((m,mi)=>{
          const mode=m.alarmMode||"short",tone=m.alarmTone||"chime";
          const isPatch=m.deliveryType==="continuous"&&m.continuousType==="patch";
          return<div key={m.id||mi} style={{display:"flex",alignItems:"center",gap:6,
            marginBottom:4,opacity:m.enabled?1:.45}}>
            <span style={{width:9,height:9,borderRadius:5,background:m.color||accent,
              flex:"0 0 auto"}}/>
            <span style={{fontSize:10,color:tx,flex:1,overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
            <select value={mode}
              onChange={e=>updateMed(mi,{alarmMode:e.target.value})}
              title={isPatch
                ?"Patches only ever get the short ping \u2014 a patch coming off is not something you can be woken up to swallow."
                :"Short: one ping when the dose lands.\nPersistent: fills the screen and keeps sounding until you tap it, then ticks the dose off for you. Gives up after 15 minutes.\nOff: silent."}
              style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:4,
                padding:"1px 4px",color:tx,fontSize:9,outline:"none"}}>
              <option value="short">short ping</option>
              {!isPatch&&<option value="long">persistent</option>}
              <option value="off">off</option>
            </select>
            <select value={tone} disabled={mode==="off"}
              onChange={e=>{updateMed(mi,{alarmTone:e.target.value});
                previewTone(e.target.value,mode==="long");}}
              title="Choosing a sound plays it."
              style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:4,
                padding:"1px 4px",color:mode==="off"?sub:tx,fontSize:9,outline:"none"}}>
              {TONE_IDS.map(id=><option key={id} value={id}>{TONES[id].name}</option>)}
            </select>
            <button onClick={()=>previewTone(tone,mode==="long")}
              disabled={mode==="off"} title="Preview, five seconds"
              style={{...t.sb,fontSize:9,padding:"1px 6px",
                opacity:mode==="off"?.4:1}}>▶</button>
          </div>;
        })}
        <div style={{fontSize:8,color:sub,marginTop:5,lineHeight:1.4}}>
          A persistent alarm fills the screen and keeps sounding until you tap it.
          Tapping marks the dose taken and ticks its box, so silencing it also
          answers whether you took it. It gives up on its own after 15 minutes.
        </div>
      </div>}
      <div style={{fontSize:8,color:sub,marginTop:4,lineHeight:1.4}}>
        Rising chirp when a patch goes on or a dose is due, lower one when a patch
        comes off. Doses set only to "am" or "pm" don't chime &mdash; there's no exact
        time to sound at. Give a dose a clock time to hear it.
      </div>
    </div>
    <div style={{flex:"1 1 420px",minWidth:300,order:1}}>
      <div style={{fontSize:11,fontWeight:600,color:tx,marginBottom:2}}>📤 Cycle Sharing</div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
        <div style={{flex:"1 1 260px",minWidth:240}}>
      <div style={{fontSize:9,color:sub,marginBottom:10,lineHeight:1.5,maxWidth:540}}>Creates a link showing where you are — your cycle phase (menstrual on) or your regimen day (menstrual off). It carries no medications, doses, or levels, and recomputes live on whatever device opens it.{!isMenstrual&&" Menstrual mode is off, so shares show your regimen day plainly, without phase language."}</div>
      <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap",marginBottom:10}}>
        <label style={{fontSize:9,color:sub}}>name (optional)<br/><input value={cycShareName} onChange={e=>setCycShareName(e.target.value)} placeholder="your name" style={{marginTop:2,background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:"3px 6px",color:tx,fontSize:11,outline:"none",width:130}}/></label>
        <div><div style={{fontSize:9,color:sub,marginBottom:3}}>pronoun</div><div style={{display:"flex",gap:3}}>{["she","they","he"].map(p=><button key={p} onClick={()=>setCycSharePronoun(p)} style={{fontSize:10,padding:"4px 10px",borderRadius:4,cursor:"pointer",background:cycSharePronoun===p?`${accent}26`:"transparent",border:`1px solid ${cycSharePronoun===p?`${accent}66`:ibd}`,color:cycSharePronoun===p?accent:sub}}>{p}</button>)}</div></div>
        <button onClick={()=>{const u=buildCycleShareUrl();try{navigator.clipboard.writeText(u);setCycShareCopied(true);setTimeout(()=>setCycShareCopied(false),1800);}catch(err){}}} style={{...t.btn,fontSize:10,padding:"6px 12px",background:cycShareCopied?"rgba(52,211,153,.15)":undefined,borderColor:cycShareCopied?"rgba(52,211,153,.4)":undefined,color:cycShareCopied?"#34d399":undefined}}>{cycShareCopied?"✓ copied link":"📋 copy share link"}</button>
      </div>
        </div>
        <div style={{flex:"1 1 300px",minWidth:260}}>
      {isMenstrual&&<div>
        <button onClick={()=>setShareEditOpen(o=>!o)} style={{...t.sb,fontSize:9.5,padding:"3px 9px"}}>✏️ Edit phase messages {shareEditOpen?"▾":"▸"}</button>
        {shareEditOpen&&<div style={{marginTop:8,background:ibg,border:`1px solid ${ibd}`,borderRadius:8,padding:11,maxWidth:560}}>
          <div style={{fontSize:9,color:sub,marginBottom:9,lineHeight:1.5}}>Customize what each phase says when you share it. Blank fields fall back to the defaults. These only affect the shared card, not the app.</div>
          {["Menstrual","Follicular","Ovulation","Luteal","Premenstrual"].map(ph=>{const d=PHASE_INFO[ph];const ov=sharePhaseOverrides[ph]||{};const setOv=(f,v)=>setSharePhaseOverrides(o=>({...o,[ph]:{...(o[ph]||{}),[f]:v}}));return<div key={ph} style={{marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${brd}`}}>
            <div style={{fontSize:10,fontWeight:600,color:d.color,marginBottom:3}}>{d.emoji} {ph}</div>
            <textarea value={ov.blurb??d.blurb} onChange={e=>setOv("blurb",e.target.value)} rows={2} style={{width:"100%",boxSizing:"border-box",background:sf,border:`1px solid ${ibd}`,borderRadius:4,padding:"4px 6px",color:tx,fontSize:10,outline:"none",resize:"vertical",marginBottom:3,lineHeight:1.4}} placeholder="what this phase often brings…"/>
            <textarea value={ov.kind??d.kind} onChange={e=>setOv("kind",e.target.value)} rows={1} style={{width:"100%",boxSizing:"border-box",background:sf,border:`1px solid ${ibd}`,borderRadius:4,padding:"4px 6px",color:d.color,fontSize:10,outline:"none",resize:"vertical",lineHeight:1.4}} placeholder="a kindness / heads-up line…"/>
          </div>;})}
          <button onClick={()=>{if(confirm("Reset all phase messages to the defaults?"))setSharePhaseOverrides({});}} style={{...t.sb,fontSize:9,padding:"3px 8px"}}>⟲ Reset to defaults</button>
        </div>}
      </div>}
        </div>
      </div>
    </div>
    </div>
    {(()=>{let sz=0;try{for(const k of Object.keys(localStorage)){if(k.startsWith("hcm-"))sz+=localStorage.getItem(k).length;}}catch(e){}const kb=Math.round(sz/1024);return<div style={{fontSize:8,color:kb>400?accent:sub,marginTop:8}}>Storage: {kb}KB · One-time events purge after 90 days</div>;})()}
  </div>}
  {affirmEdit&&<div style={{background:sf,border:`1px solid ${brd}`,borderRadius:8,padding:"12px 16px",margin:"8px 0"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div style={{fontSize:12,fontWeight:600,color:tx}}>Compassionate Affirmations</div>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:sub,cursor:"pointer"}}><input type="checkbox" checked={affirmOn} onChange={e=>setAffirmOn(e.target.checked)} style={{accentColor:"#c084fc"}}/>{affirmOn?"ON":"OFF"}</label>
        <button onClick={()=>{setAffirmMsgs([...DEF_MSGS]);}} style={{...t.sb,fontSize:9,padding:"2px 6px"}}>Reset</button>
        <button onClick={()=>setAffirmEdit(false)} style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:14}}>×</button>
      </div>
    </div>
    <div style={{fontSize:9,color:sub,marginBottom:8}}>These appear when 3+ difficult feelings are noted, or when pinned to specific days. Edit, remove, or add your own.</div>
    <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
      <label style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:sub,cursor:"pointer"}}><input type="checkbox" checked={lutealAffirm} onChange={e=>setLutealAffirm(e.target.checked)} style={{accentColor:"#c084fc"}} data-tip="Automatically show an affirmation every day during the luteal and premenstrual phases"/>Show during luteal &amp; premenstrual</label>
    </div>
    {affirmMsgs.map((m,j)=><div key={j} style={{display:"flex",gap:4,marginBottom:4,alignItems:"center"}}>
      <input value={m} maxLength={300} onChange={e=>{const u=[...affirmMsgs];u[j]=e.target.value;setAffirmMsgs(u);}} style={{flex:1,background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:"4px 6px",color:tx,fontSize:10,outline:"none"}}/>
      <button onClick={()=>setAffirmMsgs(affirmMsgs.filter((_,k)=>k!==j))} style={{background:"none",border:"none",color:"#f472b6",cursor:"pointer",fontSize:12,padding:"0 4px"}}>×</button>
    </div>)}
    <button onClick={()=>setAffirmMsgs([...affirmMsgs,""])} style={{...t.sb,fontSize:9,padding:"3px 8px",marginTop:4}}>+ Add affirmation</button>
  </div>}
  <div style={t.w}>
  {tab==="modeler"&&<><div style={{marginTop:10}}>
    {/* The old SCHEDULE NAVIGATOR (rename / +/Dup/Del + prev/next) was
        moved to the main settings modal. Schedules are still selectable
        from there; the modeler tab is now scoped to per-medication editing. */}
    {/* === DOSE-SHIFT CONTROL: shifts all dose days for all meds in this schedule. */}
    {!focusMode&&<>
    {medications.length>0&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,flexWrap:"wrap",fontSize:9,color:sub}}>
      <span style={{opacity:0.8}}>Shift all doses:</span>
      <div style={{display:"flex",alignItems:"center",gap:2}}>
        <button onClick={()=>setDoseShiftDays(v=>(parseFloat(v)||0)-1)} style={{...t.sb,fontSize:11,padding:"2px 6px",lineHeight:1}} data-tip="Decrease shift by 1 day">−</button>
        <NI value={doseShiftDays} onChange={setDoseShiftDays} min={-30} max={30} step={1} style={{width:36,background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 4px",color:tx,fontSize:10,textAlign:"center"}}/>
        <button onClick={()=>setDoseShiftDays(v=>(parseFloat(v)||0)+1)} style={{...t.sb,fontSize:11,padding:"2px 6px",lineHeight:1}} data-tip="Increase shift by 1 day">+</button>
      </div>
      <span style={{opacity:0.7}}>days</span>
      <button onClick={applyDoseShift} disabled={(parseFloat(doseShiftDays)||0)===0} style={{background:(parseFloat(doseShiftDays)||0)!==0?`${accent}26`:"transparent",border:`1px solid ${(parseFloat(doseShiftDays)||0)!==0?`${accent}66`:ibd}`,borderRadius:4,padding:"3px 10px",fontSize:10,fontWeight:600,color:(parseFloat(doseShiftDays)||0)!==0?accent:sub,cursor:(parseFloat(doseShiftDays)||0)!==0?"pointer":"not-allowed",opacity:(parseFloat(doseShiftDays)||0)===0?0.4:1}} data-tip="Apply: shift every dose in every medication by the selected days. Patch doses that wrap past the end of the cycle will be split.">Apply</button>
    </div>}
    {/* === MEDICATION TAB BAR === */}
    <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:0,flexWrap:"wrap",background:dark?"rgba(20,12,25,.5)":"rgba(244,114,182,.04)",borderRadius:"10px 10px 0 0",border:`1px solid ${brd}`,borderBottom:"none",padding:"6px 8px 0"}}>
      {medications.map((m,i)=><button key={m.id||i} onClick={()=>setActiveMedIdx(i)} style={{padding:"6px 12px",fontSize:10,fontWeight:activeMedIdx===i?700:500,color:activeMedIdx===i?(m.color||tx):sub,background:activeMedIdx===i?sf:"transparent",border:activeMedIdx===i?`1px solid ${brd}`:"1px solid transparent",borderBottom:activeMedIdx===i?`2px solid ${m.color||"#f472b6"}`:"2px solid transparent",borderRadius:"6px 6px 0 0",cursor:"pointer",marginBottom:-1,transition:"all .15s"}}><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:m.color||"#94a3b8",marginRight:5,verticalAlign:"middle",opacity:m.enabled?1:.3}}/>{(m.name||"").replace("(approximation)","(approx.)")}</button>)}
      <button onClick={()=>setShowTemplatePicker(!showTemplatePicker)} style={{padding:"6px 10px",fontSize:12,fontWeight:600,color:sub,background:"transparent",border:"1px solid transparent",borderRadius:"6px 6px 0 0",cursor:"pointer",marginBottom:-1}}>+</button>
    </div>

    {/* === TEMPLATE PICKER === */}
    {showTemplatePicker&&<div style={{background:sf,border:`1px solid ${brd}`,borderTop:"none",padding:12}}>
      <div style={{fontSize:11,fontWeight:600,color:tx,marginBottom:8}}>Add Medication from Template</div>
      {TEMPLATE_GROUPS.map(g=><div key={g.label} style={{marginBottom:8}}>
        <div style={{fontSize:9,fontWeight:600,color:sub,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{g.label}</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {g.items.map(key=>{const tmpl=MED_TEMPLATES[key];return<button key={key} onClick={()=>addMedFromTemplate(key)} style={{background:dark?"rgba(30,20,40,.6)":"rgba(255,245,250,.8)",border:`1px solid ${tmpl.color}33`,borderRadius:6,padding:"5px 10px",color:tmpl.color,fontSize:10,cursor:"pointer",fontWeight:500}}>{tmpl.name}</button>})}
        </div>
      </div>)}
      <button onClick={()=>setShowTemplatePicker(false)} style={{fontSize:9,color:sub,background:"none",border:"none",cursor:"pointer",marginTop:4}}>cancel</button>
    </div>}

    {/* === ACTIVE MEDICATION EDITOR === */}
    {activeMed&&<div style={{background:sf,border:`1px solid ${brd}`,borderTop:showTemplatePicker?"none":`1px solid ${brd}`,borderRadius:showTemplatePicker?"0 0 10px 10px":"0 0 10px 10px",padding:14}}>
      {/* Med header: name, color, enabled, delete */}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
        <input type="color" value={activeMed.color||"#94a3b8"} onChange={e=>updateMed(activeMedIdx,{color:e.target.value})} style={{width:24,height:24,border:"none",borderRadius:4,cursor:"pointer",padding:0}}/>
        <input value={activeMed.name} onChange={e=>updateMed(activeMedIdx,{name:e.target.value})} style={{background:ibg,border:`1px solid ${activeMed.color}33`,borderRadius:5,padding:"4px 8px",color:activeMed.color||tx,fontSize:12,fontWeight:600,outline:"none",flex:1,maxWidth:200}}/>
        <label style={{display:"flex",alignItems:"center",gap:3,cursor:"pointer",fontSize:9,color:sub}}>
          <input type="checkbox" checked={activeMed.enabled} onChange={e=>updateMed(activeMedIdx,{enabled:e.target.checked})} style={{accentColor:activeMed.color||"#c084fc"}}/>enabled
        </label>
        <select value={activeMed.deliveryType} onChange={e=>updateMed(activeMedIdx,{deliveryType:e.target.value,continuousType:e.target.value==="continuous"?"patch":null})} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 5px",color:tx,fontSize:9,outline:"none"}}>
          <option value="single">single dose</option>
          <option value="continuous">continuous (patch)</option>
        </select>
        {medications.length>1&&<button onClick={()=>removeMed(activeMedIdx)} style={{...t.sb,color:"#f87171",fontSize:9}}>Delete</button>}
        {/* === UNIVERSAL PATCH SETTINGS ===
            Deliberately a different colour from everything else on this card,
            because it is the one control here that is NOT a property of this
            medication. Body locations belong to a body: patches share the skin,
            and two of them cannot sit in the same place whichever drug they
            carry. Editing it from any patch medication edits it for all of them. */}
        {medications.some(m=>m.deliveryType==="continuous"&&m.continuousType==="patch")&&
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:7,
          padding:"3px 9px",borderRadius:6,border:"1px solid #22d3ee66",
          background:"#22d3ee14"}}>
          <span style={{fontSize:8,letterSpacing:".09em",textTransform:"uppercase",
            color:"#22d3ee",fontWeight:700}}>universal patch settings</span>
          <label style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:"#67e8f9"}}
            title={"How many distinct places on your body the rotation has to work with. "
              +"Shared by every patch medication \u2014 skin is skin, and two patches cannot "
              +"sit in the same place whichever drug they carry, so changing this here "
              +"changes it everywhere.\n\nMore locations than patches means longer rest "
              +"between reuses, which is the point.\n\nCurrently claimed by medications: "
              +claimedBy(medications,-1)+" of "+bodyLoc+"."}>
            body locations
            <select value={bodyLoc} onChange={e=>setBodyLoc(e.target.value)}
              style={{background:ibg,border:"1px solid #22d3ee55",borderRadius:3,
                padding:"1px 3px",color:"#67e8f9",fontSize:9,outline:"none"}}>
              {Array.from({length:15},(_,i)=>i+2).map(n=>
                <option key={n} value={n} disabled={n<claimedBy(medications,-1)}>{n}</option>)}
            </select>
          </label>
          <span style={{fontSize:8,color:claimedBy(medications,-1)>bodyLoc?"#f87171":sub}}>
            {claimedBy(medications,-1)}/{bodyLoc} claimed</span>
        </div>}
      </div>

      {/* Sub-tabs: Schedule | Waveform | Suppression | Notes */}
      <div style={{display:"flex",gap:0,marginBottom:8,borderBottom:`1px solid ${brd}`,alignItems:"center"}}>
        {["schedule","waveform","suppression","notes"].map(st=><button key={st} onClick={()=>setMedSubTab(st)} style={{padding:"5px 12px",fontSize:10,fontWeight:medSubTab===st?600:400,color:medSubTab===st?(activeMed.color||tx):sub,background:"transparent",border:"none",borderBottom:medSubTab===st?`2px solid ${activeMed.color||"#f472b6"}`:"2px solid transparent",cursor:"pointer",textTransform:"capitalize"}}>{st}</button>)}
        {/* Per-cycle total badge — right-aligned. Shows mg for single-dose meds (the input unit), or whole patches for continuous. */}
        {(()=>{
          if(activeMed.deliveryType==="single"){
            let total=0;for(const d of(activeMed.doses||[]))total+=parseFloat(d.dose)||0;
            if(activeMed.recurEnabled&&activeMed.recurDose&&activeMed.recurInterval){const cl2=cycleLen;let rd=parseFloat(activeMed.recurStart)||0;while(rd<=cl2){total+=parseFloat(activeMed.recurDose)||0;rd+=parseFloat(activeMed.recurInterval);}}
            return total>0?<div style={{marginLeft:"auto",fontSize:10,color:activeMed.color,fontWeight:500,padding:"5px 12px"}}>Total: {total.toFixed(activeMed.hormone==="P4"?0:1)} mg/cycle</div>:null;
          }
          if(activeMed.deliveryType==="continuous"&&activeMed.continuousType==="patch"){
            const ps=(activeMed.pieces&&activeMed.pieces.length)?activeMed.pieces
              :blocksToPieces(activeMed.doses,cycleLen,activeMed.patchDuration||PATCH_HALF_LIFE);
            if(!ps.length)return null;
            return<div style={{marginLeft:"auto",fontSize:10,color:activeMed.color,fontWeight:500,padding:"5px 12px"}}>
              {patchesUsed(ps)} patches · {ps.length} pieces</div>;
          }
          return null;
        })()}
      </div>

      {/* --- SCHEDULE SUB-TAB --- */}
      {medSubTab==="schedule"&&<div>
        {activeMed.deliveryType==="single"&&<>
          {(activeMed.doses||[]).map((d,i)=>{const overCycle=(parseFloat(d.day)||0)>=Math.round(parseFloat(cL)||29);
            const isDraft=!!d._draft;
            // Existing dose: sort on commit. Draft dose: don't sort yet —
            // it stays at the bottom until the user clicks Apply.
            const commit=(doses)=>updateMed(activeMedIdx,{doses:isDraft?doses:sortD(doses)});
            return<div key={d._id||i} style={{...t.rw,opacity:overCycle?.35:1,transition:"opacity .2s",...(isDraft?{background:`${activeMed.color||accent}0d`,borderRadius:4,padding:"2px 4px",border:`1px dashed ${activeMed.color||accent}55`}:{})}}>
              <span style={t.lb}>day</span>
              <NI value={d.day} onChange={v=>{const doses=[...(activeMed.doses||[])];doses[i]={...doses[i],day:v};commit(doses);}} min={0} max={maxDay} step={1} style={t.inpS}/>
              <TimeSel value={d.time||"am"} onChange={v=>{const doses=[...(activeMed.doses||[])];doses[i]={...doses[i],time:v};commit(doses);}}/>
              <span style={t.lb}>mg</span>
              <NI value={d.dose} onChange={v=>{const doses=[...(activeMed.doses||[])];doses[i]={...doses[i],dose:v};commit(doses);}} min={0} step={activeMed.hormone==="P4"?25:.1} style={t.inp}/>
              {activeMed.concentration&&<span style={{fontSize:7,color:"#475569"}}>{((parseFloat(d.dose)||0)/(activeMed.concentration||20)).toFixed(3)}mL</span>}
              {isDraft&&<button onClick={()=>{const doses=[...(activeMed.doses||[])];const{_draft,...rest}=doses[i];doses[i]=rest;updateMed(activeMedIdx,{doses:sortD(doses)});}} style={{background:`${accent}26`,border:`1px solid ${accent}66`,borderRadius:3,padding:"1px 6px",fontSize:9,fontWeight:600,color:accent,cursor:"pointer"}} data-tip="Apply this new dose so it joins the sorted list.">Apply</button>}
              <button style={t.bX} onClick={()=>{snapNow();const doses=(activeMed.doses||[]).filter((_,j)=>j!==i);updateMed(activeMedIdx,{doses});}}>×</button>
            </div>})}
          <button style={{...t.btn,borderColor:`${activeMed.color}33`,color:activeMed.color}} onClick={()=>{
            const doses=[...(activeMed.doses||[])];
            // Base "lastDay" off the latest non-draft dose so repeated clicks
            // don't keep stacking based on drafts at the bottom.
            const live=doses.filter(d=>!d._draft);
            const lastDay=live.length>0?(parseFloat(live[live.length-1].day)||0)+2:1;
            const defDose=activeMed.hormone==="P4"?100:0.7;
            // New doses are drafts: they live at the bottom until Apply.
            doses.push({_id:uid(),_draft:true,day:Math.min(lastDay,Math.round(parseFloat(cL)||29)-1),dose:defDose,time:"am"});
            updateMed(activeMedIdx,{doses});
          }}>+ Dose</button>
          {/* Recurring */}
          <div style={{marginTop:6,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
            <label style={{display:"flex",alignItems:"center",gap:3,cursor:"pointer",fontSize:9,color:sub}}>
              <input type="checkbox" checked={activeMed.recurEnabled||false} onChange={e=>updateMed(activeMedIdx,{recurEnabled:e.target.checked})} style={{accentColor:activeMed.color}}/>recurring
            </label>
            {activeMed.recurEnabled&&<>
              <NI value={activeMed.recurDose||0} onChange={v=>updateMed(activeMedIdx,{recurDose:v})} min={0} step={.1} style={t.inp}/>
              <span style={t.lb}>every</span>
              <NI value={activeMed.recurInterval||3.5} onChange={v=>updateMed(activeMedIdx,{recurInterval:v})} min={.5} step={.5} style={t.inpS}/>
              <span style={t.lb}>days</span>
            </>}
          </div>
          {/* Per-med cycle total now shown in sub-tabs header (right-aligned) */}
        </>}
        {activeMed.deliveryType==="continuous"&&<>
          {/* The schedule IS the piece list — drawn, not tabulated. */}
          <PatchLanes
            pieces={(activeMed.pieces&&activeMed.pieces.length)?activeMed.pieces
              :blocksToPieces(activeMed.doses,cycleLen,activeMed.patchDuration||PATCH_HALF_LIFE)}
            onChange={next=>updateMed(activeMedIdx,{pieces:next})}
            sepNote={sepNote} onDismissSep={()=>setSepNote(null)}
            deadWin={lunarDeadWindow(cycleLen,isLunar)}
            cycleLen={cycleLen} pg={patchPgOf(activeMed)}
            curve={activeMed.patchCurve} dur={activeMed.patchDuration||PATCH_HALF_LIFE}
            maxOnBody={Math.max(2,activeMed.maxOnBody||8)}
            budget={Math.max(1,activeMed.monthlyPatches||14)}
            maxWear={Math.min(PATCH_MAX_WEAR,activeMed.maxWear||PATCH_MAX_WEAR)}
            actOn={activeMed.activeHoursOn!==false}
            wins={activeWins(activeMed)}
            accent={activeMed.color} sub={sub} brd={brd}
            settings={activeMed.deliveryType==="continuous"&&activeMed.continuousType==="patch"?(
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <label style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:sub}} title="Most pieces you're willing to put on in one day. Stops the fitter proposing ten swaps in a morning.">
              max/day
              <input type="number" min="1" max="12" value={activeMed.maxPerDay||3}
                onChange={e=>updateMed(activeMedIdx,{maxPerDay:Math.max(1,Math.min(12,parseInt(e.target.value)||1))})}
                style={{width:30,background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"1px 3px",color:tx,fontSize:9,outline:"none"}}/>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:sub}} title="Share of the cycle's days you'll touch patches at all. Lower means fewer, busier change days instead of fiddling every day.">
              chg days
              <input type="number" min="5" max="100" step="5" value={activeMed.changeDayPct??70}
                onChange={e=>updateMed(activeMedIdx,{changeDayPct:Math.max(5,Math.min(100,parseInt(e.target.value)||70))})}
                style={{width:32,background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"1px 3px",color:tx,fontSize:9,outline:"none"}}/>
              <span style={{fontSize:8,color:sub}}>% ({Math.max(1,Math.round(Math.ceil(cycleLen)*(activeMed.changeDayPct??70)/100))}d)</span>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:sub}} title="Whole patches available per cycle. The fitter won't exceed it.">
              patches/mo
              <input type="number" min="1" max="60" value={activeMed.monthlyPatches||14}
                onChange={e=>updateMed(activeMedIdx,{monthlyPatches:Math.max(1,Math.min(60,parseInt(e.target.value)||1))})}
                style={{width:34,background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"1px 3px",color:tx,fontSize:9,outline:"none"}}/>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:sub}} title="Longest you'd wear one piece. Caps the wear slider and the fitter. Delivery is ~6% left at 14 days.">
              max wear
              <input type="number" min="0.5" max="28" step="0.5" value={activeMed.maxWear??PATCH_MAX_WEAR}
                onChange={e=>{
                  const v=Math.max(0.5,Math.min(PATCH_MAX_WEAR,parseFloat(e.target.value)||PATCH_MAX_WEAR));
                  const ps=(activeMed.pieces||[]).map(p=>p.wear>v?{...p,wear:v}:p);
                  updateMed(activeMedIdx,{maxWear:v,...(ps.length?{pieces:ps}:{})});
                }}
                style={{width:38,background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"1px 3px",color:tx,fontSize:9,outline:"none"}}/>
              <span style={{opacity:.6}}>d</span>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:sub}}
              title={"Shortest a generated piece may be worn. A dose only counts if it stays on at least this long \u2014 below it, the fitter reaches for a smaller FRACTION instead of a briefer wear, which is what a menstrual curve wants when it needs less hormone.\n\nRaise it if you would rather not be peeling something off after a few hours."}>
              min wear
              <input type="number" min="0.5" max="14" step="0.5"
                value={activeMed.minWear??0.5}
                onChange={e=>{
                  const cap=Math.min(PATCH_MAX_WEAR,activeMed.maxWear??PATCH_MAX_WEAR);
                  const v=Math.max(0.5,Math.min(cap,parseFloat(e.target.value)||0.5));
                  updateMed(activeMedIdx,{minWear:v});
                }}
                style={{width:38,background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"1px 3px",color:tx,fontSize:9,outline:"none"}}/>
              <span style={{opacity:.6}}>d</span>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:sub}} title="Wear this long or longer and the reminder says to overpatch with Tegaderm. 0 turns it off.">
              tegaderm at
              <input type="number" min="0" max="28" step="0.5" value={activeMed.tegadermDays??0}
                onChange={e=>updateMed(activeMedIdx,{tegadermDays:Math.max(0,Math.min(28,parseFloat(e.target.value)||0))})}
                style={{width:38,background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"1px 3px",color:tx,fontSize:9,outline:"none"}}/>
              <span style={{opacity:.6}}>d{!(activeMed.tegadermDays>0)&&" \u00b7 off"}</span>
            </label>
            {/* Everything left of here tells the FITTER how to generate a
                schedule. This one is different: it is what you have decided this
                medication may wear at once, and it is what sets the number of
                rows you can draw into. */}
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,
              padding:"2px 7px",borderRadius:5,border:`1px solid ${activeMed.color}55`,
              background:`${activeMed.color}12`}}>
              <span style={{fontSize:8,letterSpacing:".08em",textTransform:"uppercase",
                color:activeMed.color,opacity:.85}}>you decide</span>
              <label style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:sub}}
                title={"How many pieces of this medication you're willing to wear at once. This is "
                  +"the number of rows in the editor below.\n\nLowering it parks the rows that go "
                  +"away rather than deleting them \u2014 raise it again and they come back as they "
                  +"were. Parked pieces do not count towards anything until then.\n\n"
                  +"Across every patch medication this cannot exceed the "+bodyLoc
                  +" body locations you have; the others are using "
                  +claimedBy(medications,activeMedIdx)+"."}>
                max on body
                <select value={Math.max(1,activeMed.maxOnBody||8)}
                  onChange={e=>setMedOnBody(activeMedIdx,parseInt(e.target.value))}
                  style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,
                    padding:"1px 3px",color:tx,fontSize:9,outline:"none"}}>
                  {Array.from({length:16},(_,i)=>i+1)
                    .filter(n=>n<=Math.max(1,bodyLoc-claimedBy(medications,activeMedIdx))
                      ||n===(activeMed.maxOnBody||8))
                    .map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              {(activeMed.parked&&activeMed.parked.length>0)&&
                <span style={{fontSize:8,color:"#fbbf24"}}
                  title={activeMed.parked.length+" piece"+(activeMed.parked.length===1?"":"s")
                    +" are parked in rows above this limit. They are not being worn, not in the "
                    +"curve, and not sent to the watch. Raise the limit to bring them back."}>
                  {activeMed.parked.length} parked</span>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}
              title="Hours you're up to put a patch on or take one off. Both ends of a piece land inside a window. Applies to every day, so the schedule stays valid whichever weekday a piece falls on.">
              <label style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:sub,cursor:"pointer"}}>
                <input type="checkbox" checked={activeMed.activeHoursOn!==false} onChange={e=>updateMed(activeMedIdx,{activeHoursOn:e.target.checked})} style={{accentColor:activeMed.color}}/>
                active hrs
              </label>
              {activeWins(activeMed).map((w,wi)=>{
                const wins=activeWins(activeMed);
                const setW=(patch)=>updateMed(activeMedIdx,{activeWindows:wins.map((x,k)=>k===wi?{...x,...patch}:x)});
                return<span key={wi} style={{display:"inline-flex",alignItems:"center",gap:2,
                  padding:"1px 3px",borderRadius:4,border:`1px solid ${ibd}`}}>
                  <select value={w.a} onChange={e=>setW({a:parseFloat(e.target.value)})}
                    style={{background:ibg,border:"none",color:tx,fontSize:9,outline:"none",cursor:"pointer"}}>
                    {HOUR_OPTS.filter(h=>h<24).map(h=><option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                  <span style={{fontSize:8,color:sub}}>&ndash;</span>
                  <select value={w.b} onChange={e=>setW({b:parseFloat(e.target.value)})}
                    style={{background:ibg,border:"none",color:tx,fontSize:9,outline:"none",cursor:"pointer"}}>
                    {HOUR_OPTS.filter(h=>h>0).map(h=><option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                  {wins.length>1&&<button onClick={()=>updateMed(activeMedIdx,{activeWindows:wins.filter((_,k)=>k!==wi)})}
                    style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:10,padding:"0 1px"}}>&times;</button>}
                </span>;})}
              <button onClick={()=>updateMed(activeMedIdx,{activeWindows:[...activeWins(activeMed),{a:18.5,b:24}]})}
                style={{background:"none",border:`1px dashed ${ibd}`,borderRadius:4,color:sub,
                  cursor:"pointer",fontSize:9,padding:"1px 5px"}}>+ window</button>
            </div>
              </div>):null}
            fitTarget={activeMed.fitTarget||activeMed.hormone||"E2"}
            onTargetChange={v=>updateMed(activeMedIdx,{fitTarget:v})}
            onSettings={()=>{
              const tgtArr=refArrayFor(activeMed.fitTarget||activeMed.hormone||"E2",refProfile);
              const refFn=makeRefSampler(tgtArr,cycleLen,ovulationDay,cycleAnchor,customRefLen,refLen,refMult);
              // Subtract what your other medications already deliver, so the patches
              // fill only the gap. Never negative: patches can add, not remove.
              const oth=otherE2Ref.current;
              const sameHormone=(activeMed.fitTarget||activeMed.hormone||"E2")===(activeMed.hormone||"E2");
              const baseAt=t=>{
                if(!oth||!oth.arr||!sameHormone)return 0;
                const n=oth.arr.length,i=((Math.round(t/oth.cl*n)%n)+n)%n;
                return oth.arr[i]||0;
              };
              const fitted=fitPatches(
                t=>Math.max(0,refFn(t)-baseAt(t)),
                Math.max(1,activeMed.monthlyPatches||14),
                Math.min(PATCH_MAX_WEAR,activeMed.maxWear||PATCH_MAX_WEAR),
                cycleLen,patchPgOf(activeMed),activeMed.patchCurve,
                activeMed.patchDuration||PATCH_HALF_LIFE,Math.max(2,activeMed.maxOnBody||8),
                activeMed.activeHoursOn!==false,activeWins(activeMed),
                activeMed.maxPerDay||3,
                // a share of the cycle's days, not a raw count, so it scales
                // with cycle length instead of meaning something different at 28 vs 30
                Math.max(1,Math.round(Math.ceil(cycleLen)*(activeMed.changeDayPct??70)/100)),
                // Keep generated events out of the lunar month's variable last day.
                lunarDeadWindow(cycleLen,isLunar),
                activeMed.minWear||0);
              snapNow();updateMed(activeMedIdx,{pieces:separatePieces(fitted,cycleLen,patchMaxWear,null)});
            }}/>
        </>}
        {/* === DOSE MULTIPLIER: scales every dose for the active med by ×N.
             Sits at the bottom of the schedule list. Patches snap to the
             nearest 1/12 increment; mg doses keep 3 decimals or floor to a
             whole number when "round down" is checked. Always confirms before
             committing and snapshots state for undo. */}
        {(activeMed.doses||[]).length>0&&(()=>{
          const isPatch=activeMed.deliveryType==="continuous"&&activeMed.continuousType==="patch";
          const f=parseFloat(doseMult);
          const armed=isFinite(f)&&f>0&&Math.abs(f-1)>1e-9;
          return<div style={{display:"flex",alignItems:"center",gap:6,marginTop:12,flexWrap:"wrap",fontSize:9,color:sub,padding:"6px 8px",background:dark?"rgba(20,12,25,.4)":"rgba(244,114,182,.04)",border:`1px solid ${brd}`,borderRadius:6}}>
            <span style={{opacity:0.8,fontWeight:600,letterSpacing:"0.3px",textTransform:"uppercase"}}>Multiply all doses</span>
            <span style={{opacity:0.7}}>×</span>
            <NI value={doseMult} onChange={setDoseMult} min={0} step={0.1} style={{width:48,background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 4px",color:tx,fontSize:10,textAlign:"center"}}/>
            {!isPatch&&<label style={{display:"flex",alignItems:"center",gap:3,cursor:"pointer",fontSize:9,color:sub}} data-tip="Round results down to whole mg (otherwise: 3 decimals)">
              <input type="checkbox" checked={doseMultFloor} onChange={e=>setDoseMultFloor(e.target.checked)} style={{accentColor:activeMed.color||"#c084fc"}}/>round down
            </label>}
            {isPatch&&<span style={{opacity:0.55,fontStyle:"italic"}}>snaps to nearest 1/12</span>}
            <button onClick={applyDoseMult} disabled={!armed} style={{background:armed?`${accent}26`:"transparent",border:`1px solid ${armed?`${accent}66`:ibd}`,borderRadius:4,padding:"3px 10px",fontSize:10,fontWeight:600,color:armed?accent:sub,cursor:armed?"pointer":"not-allowed",opacity:armed?1:0.4}} data-tip="Multiply every dose for this medication. You'll see a preview before applying.">Apply</button>
            {armed&&<span style={{fontSize:9,opacity:0.7,marginLeft:"auto"}}>⚠ preview before commit</span>}
          </div>;
        })()}
      </div>}

      {/* --- WAVEFORM SUB-TAB --- */}
      {medSubTab==="waveform"&&<div>
        {activeMed.deliveryType==="continuous"&&activeMed.continuousType==="patch"?<div>
          <div style={{fontSize:10,color:activeMed.color,fontWeight:600,marginBottom:6}}>Patch Blood Level Sketch</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:9,color:sub}} title="The patch strength you actually have. Everything scales from this.">patch is</span>
            <NI value={activeMed.patchMcgPerUnit||100} onChange={v=>updateMed(activeMedIdx,{patchMcgPerUnit:v})} min={5} max={400} step={5} style={t.inpS}/>
            <span style={{fontSize:9,color:sub}}>mcg/day</span>
            <span style={{fontSize:9,color:sub,marginLeft:6}} title="Calibration: what a known strength reads in your blood. Set it from a lab result and every other strength scales off it.">calibrate</span>
            <NI value={activeMed.patchMcgRef||100} onChange={v=>updateMed(activeMedIdx,{patchMcgRef:v})} min={5} max={400} step={5} style={t.inpS}/>
            <span style={{fontSize:9,color:sub}}>mcg/day =</span>
            <NI value={activeMed.patchPgPerUnit||90} onChange={v=>updateMed(activeMedIdx,{patchPgPerUnit:v})} min={10} max={300} step={5} style={{...t.inpS,width:34,color:activeMed.color,border:`1px solid ${activeMed.color}33`,textAlign:"center"}}/>
            <span style={{fontSize:9,color:sub}}>pg/mL</span>
            <span style={{fontSize:9,color:activeMed.color,fontWeight:600,marginLeft:4}}>&rarr; {patchPgOf(activeMed).toFixed(0)} pg/mL per whole patch</span>
            <span style={{fontSize:9,color:sub}} title="How fast blood levels fall once the patch is OFF. Estradiol's own half-life is about an hour; measured serum half-life after patch removal is 6-8 hours, back to baseline within a day.">washout</span>
            <NI value={Math.round((activeMed.patchWashout||PATCH_WASHOUT)*24)} onChange={v=>updateMed(activeMedIdx,{patchWashout:Math.max(1,Math.min(48,v))/24})} min={1} max={48} step={1} style={t.inpS}/>
            <span style={{fontSize:8,color:sub}}>h half-life</span>
            <span style={{fontSize:9,color:sub}}>show</span>
            <NI value={activeMed.patchCurveDays||Math.min(PATCH_MAX_WEAR,(activeMed.patchDuration||3.5)*4)} onChange={v=>updateMed(activeMedIdx,{patchCurveDays:v})} min={1} max={PATCH_MAX_WEAR} step={.5} style={t.inpS}/>
            <span style={{fontSize:8,color:sub}}>d of curve</span>
            <span style={{fontSize:9,color:sub}} title="The patch's RATED wear time. The decline curve's X axis is in units of this, so t=1 is the moment it's officially due off — not the moment it stops working.">rated</span>
            <NI value={activeMed.patchDuration||3.5} onChange={v=>updateMed(activeMedIdx,{patchDuration:v})} min={1} max={30} step={.5} style={{...t.inpS,width:28,color:activeMed.color,border:`1px solid ${activeMed.color}33`,textAlign:"center"}}/>
            <span style={{fontSize:8,color:sub}}>days</span>
          </div>
          <div style={{marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}>
              <span style={{fontSize:9,color:activeMed.color,fontWeight:600}}>decline shape</span>
              <span style={{fontSize:8,color:sub,fontStyle:"italic"}}>the full decay — Y is % of peak, X is days worn. Where you end the stroke is the wear time, not this curve</span>
              <button onClick={()=>updateMed(activeMedIdx,{patchCurve:DEF_PATCH_CURVE.map(p=>({...p}))})} style={{...t.btn,fontSize:8,padding:"2px 6px",marginLeft:"auto"}} data-tip="Reset to a realistic matrix-patch decline">realistic</button>
              <button onClick={()=>updateMed(activeMedIdx,{patchCurve:CURVE_PATCH_TW.map(p=>({...p})),patchDuration:3.5})} style={{...t.btn,fontSize:8,padding:"2px 6px"}} data-tip="Twice-weekly matrix patch (Vivelle-Dot, Estradot, Minivelle) — rated 3.5 days, ~72% of peak when due off.">twice-weekly</button>
              <button onClick={()=>updateMed(activeMedIdx,{patchCurve:CURVE_PATCH_OW.map(p=>({...p})),patchDuration:7})} style={{...t.btn,fontSize:8,padding:"2px 6px"}} data-tip="Once-weekly matrix patch (Climara, Menostar) — rated 7 days, ~55% of peak at removal.">once-weekly</button>
              <button onClick={()=>updateMed(activeMedIdx,{patchCurve:[{t:0,v:1},{t:1,v:1}]})} style={{...t.btn,fontSize:8,padding:"2px 6px"}} data-tip="Flat (no fade)">flat</button>
            </div>
            <div style={{height:150}}>
              <SFE points={(activeMed.patchCurve&&activeMed.patchCurve.length>=2)?activeMed.patchCurve:DEF_PATCH_CURVE} onChange={pts=>updateMed(activeMedIdx,{patchCurve:pts})} color={activeMed.color} scale={1} timeScale={activeMed.patchDuration||3.5} axisMax={activeMed.patchCurveDays||Math.min(PATCH_MAX_WEAR,(activeMed.patchDuration||3.5)*4)} upright={true}/>
            </div>
            <div style={{fontSize:8,color:sub,fontStyle:"italic",marginTop:1}}>100% = {patchPgOf(activeMed).toFixed(0)} pg/mL per whole patch · quick on/off ramps added automatically</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4,flexWrap:"wrap"}}>
            <span style={{fontSize:9,color:sub}}>label</span>
            <select value={activeMed.hormone||""} onChange={e=>updateMed(activeMedIdx,{hormone:e.target.value||null,unit:e.target.value==="E2"?"pg/mL":e.target.value==="P4"?"ng/mL":e.target.value==="T"?"ng/dL":activeMed.unit||"",axisSide:e.target.value==="P4"?"right":"left"})} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 5px",color:tx,fontSize:9,outline:"none"}}>
              <option value="">custom</option><option value="E2">Estradiol (E2)</option><option value="P4">Progesterone (P4)</option><option value="T">Testosterone (T)</option><option value="E1">Estrone (E1)</option>
            </select>
            <span style={{fontSize:9,color:sub}}>unit</span>
            <input value={activeMed.unit||""} onChange={e=>updateMed(activeMedIdx,{unit:e.target.value})} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 5px",color:tx,fontSize:9,outline:"none",width:50}} placeholder="pg/mL"/>
            <span style={{fontSize:9,color:sub}}>axis</span>
            <select value={activeMed.axisSide||"left"} onChange={e=>updateMed(activeMedIdx,{axisSide:e.target.value})} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 5px",color:tx,fontSize:9,outline:"none"}}>
              <option value="left">left</option><option value="right">right</option>
            </select>
          </div>
        </div>:<>
        <label style={{display:"flex",alignItems:"center",gap:3,marginBottom:6,cursor:"pointer",fontSize:10,color:sub}}>
          <input type="checkbox" checked={activeMed.hasWaveform||false} onChange={e=>updateMed(activeMedIdx,{hasWaveform:e.target.checked})} style={{accentColor:activeMed.color}}/>
          This medication has measurable blood levels
        </label>
        {activeMed.hasWaveform&&<>
          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4,flexWrap:"wrap"}}>
            <span style={{fontSize:9,color:sub}}>label</span>
            <select value={activeMed.hormone||""} onChange={e=>updateMed(activeMedIdx,{hormone:e.target.value||null,unit:e.target.value==="E2"?"pg/mL":e.target.value==="P4"?"ng/mL":e.target.value==="T"?"ng/dL":activeMed.unit||"",axisSide:e.target.value==="P4"?"right":"left"})} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 5px",color:tx,fontSize:9,outline:"none"}}>
              <option value="">custom</option><option value="E2">Estradiol (E2)</option><option value="P4">Progesterone (P4)</option><option value="T">Testosterone (T)</option><option value="E1">Estrone (E1)</option>
            </select>
            <span style={{fontSize:9,color:sub}}>unit</span>
            <input value={activeMed.unit||""} onChange={e=>updateMed(activeMedIdx,{unit:e.target.value})} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 5px",color:tx,fontSize:9,outline:"none",width:50}} placeholder="pg/mL"/>
            <span style={{fontSize:9,color:sub}}>axis</span>
            <select value={activeMed.axisSide||"left"} onChange={e=>updateMed(activeMedIdx,{axisSide:e.target.value})} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 5px",color:tx,fontSize:9,outline:"none"}}>
              <option value="left">left</option><option value="right">right</option>
            </select>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4,flexWrap:"wrap"}}>
            <span style={{fontSize:9,color:sub}}>reference dose</span>
            <NI value={activeMed.refDose||1} onChange={v=>updateMed(activeMedIdx,{refDose:v})} min={.01} max={500} step={activeMed.hormone==="P4"?25:.1} style={{...t.inpS,width:34,color:activeMed.color,border:`1px solid ${activeMed.color}33`,textAlign:"center"}}/>
            <span style={{fontSize:9,color:sub}}>mg</span>
            {activeMed.concentration!=null&&<><span style={{fontSize:9,color:sub}}>concentration</span>
            <NI value={activeMed.concentration||20} onChange={v=>updateMed(activeMedIdx,{concentration:v})} min={1} max={100} step={1} style={{...t.inpS,width:28,color:activeMed.color,border:`1px solid ${activeMed.color}33`,textAlign:"center"}}/><span style={{fontSize:9,color:sub}}>mg/mL</span></>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4,flexWrap:"wrap"}}>
            <span style={{fontSize:9,color:sub}}>floor</span>
            <NI value={activeMed.floor||0} onChange={v=>updateMed(activeMedIdx,{floor:v})} min={0} max={20} step={.5} style={{...t.inpS,width:28,color:activeMed.color,border:`1px solid ${activeMed.color}33`,textAlign:"center"}}/>
            <span style={{fontSize:9,color:sub}}>{activeMed.unit||"pg/mL"}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap",fontSize:9,color:sub}}>
            <span style={{fontWeight:600,color:activeMed.color}}>scale all</span>
            <span style={{opacity:0.7}}>×</span>
            <NI value={waveScaleAmt} onChange={setWaveScaleAmt} min={0.05} step={0.1} style={{...t.inpS,width:42,color:activeMed.color,border:`1px solid ${activeMed.color}33`,textAlign:"center"}}/>
            <button onClick={()=>{const f=parseFloat(waveScaleAmt);if(!(f>0)||Math.abs(f-1)<1e-9)return;snapNow();const u=(activeMed.points||[]).map(p=>({...p,v:Math.round(p.v*f*100)/100}));updateMed(activeMedIdx,{points:u,waveformMode:"freeform"});setWaveScaleAmt(1);}} style={{...t.btn,fontSize:8,padding:"2px 8px",borderColor:`${activeMed.color}44`,color:activeMed.color}} data-tip="Multiply every point's height by this factor — keeps the shape, scales the whole curve">apply</button>
            <span style={{opacity:0.5}}>·</span>
            <span>Y max</span>
            <NI value={activeMed.waveYMax||""} onChange={v=>updateMed(activeMedIdx,{waveYMax:v>0?v:null})} min={0} step={10} style={{...t.inpS,width:42,color:tx,border:`1px solid ${ibd}`,textAlign:"center"}} placeholder="auto"/>
            <span>X max</span>
            <NI value={activeMed.waveXMax||""} onChange={v=>updateMed(activeMedIdx,{waveXMax:v>0?v:null})} min={0} step={1} style={{...t.inpS,width:38,color:tx,border:`1px solid ${ibd}`,textAlign:"center"}} placeholder="auto"/>
            <span style={{opacity:0.5}}>days</span>
          </div>
          <FE points={activeMed.points||[]} onChange={pts=>updateMed(activeMedIdx,{points:pts,waveformMode:"freeform"})} color={activeMed.color} yMax={activeMed.waveYMax||0} xMax={activeMed.waveXMax||0}/>
          <details style={{marginTop:4}}><summary style={{fontSize:9,color:sub,cursor:"pointer",userSelect:"none"}}>Generate from parameters</summary>
            <div style={{marginTop:4,padding:6,background:dark?"rgba(15,10,20,.3)":"rgba(248,240,252,.3)",borderRadius:6}}>
              {activeMed.hormone==="P4"?<P4E pk={activeMed.pk||DEF_PK_P4} onChange={pk=>updateMed(activeMedIdx,{pk})}/>:
              <PE pk={activeMed.pk||DEF_PK_E2} onChange={pk=>updateMed(activeMedIdx,{pk})}/>}
              <button style={{...t.btn,borderColor:`${activeMed.color}33`,color:activeMed.color,marginTop:4,fontSize:9}} onClick={()=>{
                snapNow();
                setMedications(prev=>{const u=[...prev];const med=u[activeMedIdx];if(!med)return prev;
                  const pk=med.pk||(med.hormone==="P4"?DEF_PK_P4:DEF_PK_E2);
                  const raw=[];const maxT=med.hormone==="P4"?2:Math.max(14,pk.decayHalf*4);
                  const step=med.hormone==="P4"?0.04:0.25;
                  for(let tt=0;tt<=maxT;tt+=step){const v=med.hormone==="P4"?p4V(tt*24,100,pk,null):pkV(tt,pk);if(v>0.01||tt===0)raw.push({t:Math.round(tt*4)/4,v:Math.round(v*10)/10});}
                  // Deduplicate: keep last value for each unique t
                  const seen=new Map();for(const p of raw)seen.set(p.t,p);
                  const pts=[...seen.values()].sort((a,b)=>a.t-b.t);
                  if(pts.length>0&&pts[pts.length-1].v>0.5)pts.push({t:pts[pts.length-1].t+1,v:0});
                  u[activeMedIdx]={...med,points:pts,waveformMode:"freeform"};return u;});
              }}>Apply to waveform</button>
            </div>
          </details>
        </>}
        {!activeMed.hasWaveform&&<div style={{fontSize:10,color:sub,fontStyle:"italic",padding:"8px 0"}}>This medication has no measurable blood levels (reminder only).</div>}
        </>}
      </div>}

      {/* --- SUPPRESSION SUB-TAB --- */}
      {medSubTab==="suppression"&&<div>
        {(()=>{const supps=activeMed.suppressions||[];
          const targetOpts=["T","E2","P4",...medications.filter(m=>m.id!==activeMed.id&&m.hormone!=="E2"&&m.hormone!=="P4"&&m.hormone!=="T"&&m.name).map(m=>m.name)];
          const updateSupp=(si2,updates)=>{const u=[...supps];u[si2]={...u[si2],...updates};updateMed(activeMedIdx,{suppressions:u,hasSuppression:u.length>0});};
          const addSupp=()=>{const last=supps[supps.length-1];let pts=last?.suppPts?last.suppPts.map(p=>({...p})):[{t:0,v:0.8},{t:1,v:0.6},{t:3,v:0.3},{t:7,v:0.05},{t:14,v:0}];let mirror=last?.suppMirror||false;if(!last&&activeMed.hasWaveform&&activeMed.points?.length>=2){const maxV=Math.max(...activeMed.points.map(p=>p.v),1);pts=activeMed.points.map(p=>({t:p.t,v:Math.round(Math.min(1,p.v/maxV)*20)/20}));mirror=true;}updateMed(activeMedIdx,{suppressions:[...supps,{target:"T",method:"gradual",mode:"waveform",suppMirror:mirror,threshold:120,effectiveness:1,duration:7,ceiling:0,suppPts:pts}],hasSuppression:true});};
          const removeSupp=si2=>{snapNow();const u=supps.filter((_,j)=>j!==si2);updateMed(activeMedIdx,{suppressions:u,hasSuppression:u.length>0});};
          return<>
            {supps.map((s,si2)=><div key={si2} style={{background:dark?"rgba(15,10,20,.4)":"rgba(248,240,252,.5)",border:`1px solid ${brd}`,borderRadius:6,padding:8,marginBottom:6}}>
              <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                <span style={{fontSize:10,color:sub}}>suppresses</span>
                <select value={s.target||"T"} onChange={e=>updateSupp(si2,{target:e.target.value})} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 5px",color:tx,fontSize:10,outline:"none"}}>
                  {targetOpts.map(opt=><option key={opt} value={opt}>{opt==="T"?"Testosterone":opt==="E2"?"Estradiol":opt==="P4"?"Progesterone":opt}</option>)}
                </select>
                <select value={s.method||"gradual"} onChange={e=>updateSupp(si2,{method:e.target.value})} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 5px",color:tx,fontSize:10,outline:"none"}}>
                  <option value="gradual">gradual suppression</option>
                  <option value="flatline">full suppression</option>
                </select>
                {supps.length>1&&<button onClick={()=>removeSupp(si2)} style={{...t.bX,fontSize:11,color:"#f87171"}}>×</button>}
              </div>
              {s.method==="gradual"&&<>
                <div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",fontSize:10,color:sub,marginBottom:4}}>
                    <span data-tip="Scale the suppression waveform intensity. 100% = as drawn, 200% = doubled.">scale</span>
                    <NI value={Math.round((s.suppScale||1)*100)} onChange={v=>updateSupp(si2,{suppScale:Math.max(0.01,v/100)})} min={1} max={500} step={5} style={{...t.inpS,width:36,color:activeMed.color,border:`1px solid ${activeMed.color}33`,textAlign:"center"}}/>
                    <span style={{fontSize:8,color:sub}}>%</span>
                    <span data-tip="Stretch the suppression waveform horizontally. 2× makes it last twice as long.">stretch</span>
                    <NI value={s.suppTimeScale||1} onChange={v=>updateSupp(si2,{suppTimeScale:Math.max(0.1,v)})} min={0.1} max={10} step={0.1} style={{...t.inpS,width:30,color:activeMed.color,border:`1px solid ${activeMed.color}33`,textAlign:"center"}}/>
                    <span style={{fontSize:8,color:sub}}>×</span>
                    <label style={{display:"flex",alignItems:"center",gap:2,cursor:"pointer",marginLeft:6}} data-tip="Mirror this medication's positive waveform as the suppression shape">
                      <input type="checkbox" checked={s.suppMirror||false} onChange={e=>{
                        if(e.target.checked&&activeMed.hasWaveform&&activeMed.points?.length>=2){
                          // Generate suppression points from the med's positive waveform, normalized to 0-1
                          const maxV=Math.max(...activeMed.points.map(p=>p.v),1);
                          const mirrored=activeMed.points.map(p=>({t:p.t,v:Math.round(Math.min(1,p.v/maxV)*20)/20}));
                          updateSupp(si2,{suppMirror:true,suppPts:mirrored});
                        }else{updateSupp(si2,{suppMirror:false});}
                      }} style={{accentColor:activeMed.color}}/>
                      <span style={{fontSize:8,color:activeMed.color}}>mirror waveform</span>
                    </label>
                  </div>
                  <SFE points={s.suppPts||[{t:0,v:0.8},{t:1,v:0.6},{t:3,v:0.3},{t:7,v:0.05},{t:14,v:0}]} onChange={pts=>updateSupp(si2,{suppPts:pts,suppMirror:false,mode:"waveform"})} color={activeMed.color} scale={s.suppScale||1} timeScale={s.suppTimeScale||1}/>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",fontSize:10,color:sub,marginTop:4}}>
                    <span data-tip="Optional: cap the target at this level. 0 = off.">ceiling</span><NI value={s.ceiling||0} onChange={v=>updateSupp(si2,{ceiling:v})} min={0} max={1000} step={10} style={{...t.inpS,width:34,color:activeMed.color,border:`1px solid ${activeMed.color}33`,textAlign:"center"}}/><span>{s.ceiling>0?`${s.target==="T"?"ng/dL":"pg/mL"}`:"off"}</span>
                  </div>
                </div>
              </>}
              {s.method==="flatline"&&<div style={{fontSize:10,color:sub,fontStyle:"italic"}}>Fully suppresses {s.target==="T"?"testosterone":s.target==="E2"?"estradiol":s.target==="P4"?"progesterone":s.target} to floor level.</div>}
            </div>)}
            <button onClick={addSupp} style={{...t.btn,fontSize:10,padding:"4px 10px"}}>+ Add Suppression Target</button>
          </>;
        })()}
      </div>}

      {/* --- NOTES SUB-TAB --- */}
      {medSubTab==="notes"&&<div>
        <textarea value={activeMed.notes||""} onChange={e=>updateMed(activeMedIdx,{notes:e.target.value})} placeholder="Add notes about this medication..." style={{width:"100%",minHeight:80,background:ibg,border:`1px solid ${ibd}`,borderRadius:6,padding:8,color:tx,fontSize:11,outline:"none",resize:"vertical",fontFamily:"'DM Sans',sans-serif"}}/>
      </div>}
    </div>}

    {/* Empty state */}
    {medications.length===0&&!showTemplatePicker&&<div style={{background:sf,border:`1px solid ${brd}`,borderRadius:10,padding:"24px 16px",textAlign:"center"}}>
      <div style={{fontSize:13,fontWeight:600,color:tx,marginBottom:6}}>No medications yet</div>
      <div style={{fontSize:10,color:sub,marginBottom:12}}>Add a medication from templates to get started.</div>
      <button onClick={()=>setShowTemplatePicker(true)} style={{...t.btn,fontSize:11,padding:"8px 16px"}}>+ Add Medication</button>
    </div>}
    </>}

    {/* === BLOOD LEVEL CHART === */}
    <div style={{...t.c,marginTop:10}}>
      {!focusMode&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3,gap:3,flexWrap:"wrap"}}><div style={{...t.st,marginBottom:0}}>Blood Levels</div><div style={{display:"flex",alignItems:"center",gap:3,flexWrap:"wrap"}}><span style={t.lb} data-tip="Total days visible on the chart">visible days</span><NI value={sD} onChange={setSD} min={3} max={365} step={1} style={t.inpS}/><span style={t.lb} data-tip="How many cycles to show on the chart">repeat</span><NI value={cR} onChange={setCR} min={1} max={20} step={1} style={{...t.inpS,width:22}}/><span style={t.lb}>×</span></div></div>}
      <div style={{position:"relative",width:"100%",height:220}}><canvas ref={cvR} style={{width:"100%",height:220,display:"block",position:"absolute",top:0,left:0}}/><canvas ref={ovR} style={{width:"100%",height:220,display:"block",position:"absolute",top:0,left:0,cursor:"crosshair"}} onMouseMove={onMM} onMouseLeave={onML}/></div>
      {!focusMode&&<div style={{fontSize:8,color:"#475569",marginTop:3,display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}><label style={{display:"flex",alignItems:"center",gap:2,cursor:"pointer"}} data-tip="Show estradiol curve on chart"><input type="checkbox" checked={sE2} onChange={e=>setSE2(e.target.checked)} style={{accentColor:"#f472b6"}}/><span style={{color:"#f472b6"}}>E2</span></label><label style={{display:"flex",alignItems:"center",gap:2,cursor:"pointer"}} data-tip="Show progesterone curve on chart"><input type="checkbox" checked={sP4} onChange={e=>setSP4(e.target.checked)} style={{accentColor:"#a855f7"}}/><span style={{color:"#a855f7"}}>P4</span></label>
        <label style={{display:"flex",alignItems:"center",gap:2,cursor:"pointer"}} data-tip="Model your body's natural hormone production. AMAB = baseline testosterone. AFAB = cycling estradiol and progesterone."><input type="checkbox" checked={showT} onChange={e=>setShowT(e.target.checked)} style={{accentColor:"#38bdf8"}}/><span style={{color:"#38bdf8"}}>ambient</span></label>
        {showT&&<select value={ambientProfile} onChange={e=>setAmbientProfile(e.target.value)} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"1px 4px",color:tx,fontSize:8,outline:"none",cursor:"pointer"}}><option value="amab">AMAB</option><option value="afab">AFAB</option></select>}
        {showT&&ambientProfile==="amab"&&<span style={{display:"flex",alignItems:"center",gap:2}} data-tip="Baseline testosterone level before any suppression (ng/dL). Average AMAB is ~600."><NI value={tBaseline} onChange={setTBaseline} min={1} max={9999} step={10} style={{width:34,background:ibg,border:"1px solid rgba(56,189,248,.3)",borderRadius:3,padding:"1px 3px",color:"#38bdf8",fontSize:8,textAlign:"center"}}/><span style={{color:"#64748b",fontSize:7}}>ng/dL</span></span>}
        {showT&&ambientProfile==="amab"&&<span style={{display:"flex",alignItems:"center",gap:2}} data-tip="Minimum T level — adrenal production floor even with full suppression"><NI value={tFloor} onChange={setTFloor} min={0} max={100} step={1} style={{width:22,background:ibg,border:"1px solid rgba(56,189,248,.3)",borderRadius:3,padding:"1px 3px",color:"#38bdf8",fontSize:8,textAlign:"center"}}/><span style={{color:"#64748b",fontSize:7}}>floor</span></span>}
        {showT&&ambientProfile==="afab"&&<span style={{display:"flex",alignItems:"center",gap:2}} data-tip="Scale ambient E2/P4 levels (1× = population average cis female)"><NI value={ambientScale} onChange={setAmbientScale} min={0.01} max={99} step={0.1} style={{width:30,background:ibg,border:"1px solid rgba(244,114,182,.3)",borderRadius:3,padding:"1px 3px",color:"#f472b6",fontSize:8,textAlign:"center"}}/><span style={{color:"#64748b",fontSize:7}}>×</span></span>}
        {showT&&ambientProfile==="afab"&&<span style={{display:"flex",alignItems:"center",gap:2}} data-tip="Cycle length for ambient E2/P4 levels"><NI value={ambientCycleLen} onChange={setAmbientCycleLen} min={7} max={90} step={.5} style={{width:28,background:ibg,border:"1px solid rgba(244,114,182,.3)",borderRadius:3,padding:"1px 3px",color:"#f472b6",fontSize:8,textAlign:"center"}}/><span style={{color:"#64748b",fontSize:7}}>d</span></span>}
        {/* Ambient ovulation day override. null = inherit from global
            ovulationDay (auto-scaled to ambientCycleLen). When the toggle is
            on, the user pins ambient ovulation to a specific day in the
            ambient cycle. Useful when the modeled ambient cycle should
            differ from the user's actual schedule. */}
        {showT&&ambientProfile==="afab"&&<span style={{display:"flex",alignItems:"center",gap:2}}>
          <button onClick={()=>{
            if(ambientOvulationDay===null||ambientOvulationDay===undefined){
              // Engage override; seed at the proportionally-scaled current value.
              const seed=Math.max(2,Math.min(Math.round(ambientCycleLen)-1,Math.round(ovulationDay*(ambientCycleLen||29.5)/(cycleLen||29.5))));
              setAmbientOvulationDay(seed);
            }else{
              setAmbientOvulationDay(null);
            }
          }} style={{background:ambientOvulationDay!==null&&ambientOvulationDay!==undefined?"rgba(244,114,182,.18)":"transparent",border:"1px solid rgba(244,114,182,.3)",borderRadius:3,padding:"1px 4px",fontSize:7,color:ambientOvulationDay!==null&&ambientOvulationDay!==undefined?"#f472b6":sub,cursor:"pointer",minWidth:46,textAlign:"center"}} data-tip={ambientOvulationDay!==null&&ambientOvulationDay!==undefined?`Override on. Click to inherit from your cycle's ovulation day (${ovulationDay}).`:`Ambient ovulation auto-scales from your cycle (currently day ${ovulationDay}). Click to set a custom ambient ovulation day.`}>{ambientOvulationDay!==null&&ambientOvulationDay!==undefined?`ov ${ambientOvulationDay}`:"ov auto"}</button>
          {ambientOvulationDay!==null&&ambientOvulationDay!==undefined&&<NI value={ambientOvulationDay} onChange={setAmbientOvulationDay} min={2} max={Math.max(2,Math.round(ambientCycleLen)-1)} step={1} style={{width:24,background:ibg,border:"1px solid rgba(244,114,182,.3)",borderRadius:3,padding:"1px 2px",color:"#f472b6",fontSize:8,textAlign:"center"}}/>}
          {/* Ambient cycle anchor override: rotates the ambient phase
              calendar without affecting the global cycleAnchor. Same
              auto/override pattern as the ovulation day above. */}
          <button onClick={()=>{
            if(ambientCycleAnchor===null||ambientCycleAnchor===undefined){
              const seed=Math.round((cycleAnchor||0)*(ambientCycleLen||29.5)/(cycleLen||29.5));
              setAmbientCycleAnchor(((seed%Math.round(ambientCycleLen))+Math.round(ambientCycleLen))%Math.round(ambientCycleLen));
            }else{
              setAmbientCycleAnchor(null);
            }
          }} style={{background:ambientCycleAnchor!==null&&ambientCycleAnchor!==undefined?"rgba(244,114,182,.18)":"transparent",border:"1px solid rgba(244,114,182,.3)",borderRadius:3,padding:"1px 4px",fontSize:7,color:ambientCycleAnchor!==null&&ambientCycleAnchor!==undefined?"#f472b6":sub,cursor:"pointer",minWidth:62,textAlign:"center"}} data-tip={ambientCycleAnchor!==null&&ambientCycleAnchor!==undefined?`Ambient day-1 override on. Click to inherit from your cycle's day 1 (= ${(cycleAnchor||0)+1}).`:`Ambient phase calendar auto-scales from your cycle (currently day 1 = ${(cycleAnchor||0)+1}). Click to set a custom ambient day-1 anchor — useful for experimenting with AFAB hormone suppression at a different phase alignment without changing your real schedule.`}>{ambientCycleAnchor!==null&&ambientCycleAnchor!==undefined?`day 1 = ${ambientCycleAnchor+1}`:"day 1 auto"}</button>
          {ambientCycleAnchor!==null&&ambientCycleAnchor!==undefined&&<NI value={ambientCycleAnchor+1} onChange={v=>{const cl=Math.round(ambientCycleLen);const n=Math.max(1,Math.min(cl,parseInt(v)||1));setAmbientCycleAnchor(n-1);}} min={1} max={Math.round(ambientCycleLen)} step={1} style={{width:24,background:ibg,border:"1px solid rgba(244,114,182,.3)",borderRadius:3,padding:"1px 2px",color:"#f472b6",fontSize:8,textAlign:"center"}}/>}
        </span>}
        <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5}}>{sRef&&<label style={{display:"flex",alignItems:"center",gap:2,cursor:"pointer"}} data-tip="Show estradiol reference curve"><input type="checkbox" checked={sE2Ref} onChange={e=>setSE2Ref(e.target.checked)} style={{accentColor:"#f472b6"}}/><span style={{color:"#f472b6"}}>E2</span></label>}{sRef&&<label style={{display:"flex",alignItems:"center",gap:2,cursor:"pointer"}} data-tip="Show progesterone reference curve"><input type="checkbox" checked={sP4Ref} onChange={e=>setSP4Ref(e.target.checked)} style={{accentColor:"#a855f7"}}/><span style={{color:"#a855f7"}}>P4</span></label>}{sRef&&<label style={{display:"flex",alignItems:"center",gap:2,cursor:"pointer"}} data-tip="Overlay FSH/LH reference curves"><input type="checkbox" checked={showFLH} onChange={e=>setShowFLH(e.target.checked)} style={{accentColor:"#818cf8"}}/><span style={{color:"#818cf8"}}>FSH/LH</span></label>}{sRef&&<span style={{display:"flex",alignItems:"center",gap:2}} data-tip="Scale the reference curve amplitude"><NI value={refMult} onChange={setRefMult} min={0.25} max={5} step={0.25} style={{width:28,background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"1px 3px",color:"#94a3b8",fontSize:8,textAlign:"center"}}/><span style={{color:"#64748b"}}>×</span></span>}<label style={{display:"flex",alignItems:"center",gap:2,cursor:"pointer"}} data-tip="Show target hormone reference curves — what you're aiming for"><input type="checkbox" checked={sRef} onChange={e=>setSRef(e.target.checked)} style={{accentColor:"#94a3b8"}}/><span style={{color:"#94a3b8"}}>ref</span></label>{sRef&&<select value={refProfile} onChange={e=>setRefProfile(e.target.value)} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"1px 4px",color:tx,fontSize:8,outline:"none",cursor:"pointer"}} data-tip="Target hormone profile to reference"><option value="female">♀ female</option><option value="male">♂ male</option></select>}{sRef&&<button onClick={()=>setCustomRefLen(!customRefLen)} style={{background:customRefLen?`${accent}1a`:"transparent",border:`1px solid ${customRefLen?`${accent}33`:ibd}`,borderRadius:3,padding:"1px 4px",fontSize:7,color:customRefLen?accent:sub,cursor:"pointer",minWidth:52,textAlign:"center"}} data-tip={customRefLen?`Custom ref length: ${refLen} days`:`Ref curves match your ${cycleLen}d cycle. Click to set a custom length.`}>{customRefLen?`ref ${refLen}d`:"auto"}</button>}{sRef&&customRefLen&&<NI value={refLen} onChange={setRefLen} min={7} max={90} step={.5} style={{width:26,background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"1px 2px",color:"#94a3b8",fontSize:8,textAlign:"center"}}/>}</span></div>}
    </div>
  </div>
  {!focusMode&&(()=>{const has29p=cI.some(i=>(parseFloat(i.day)||0)>=29)||pa.some(p=>(parseFloat(p.endDay)||0)>=29.5||(parseFloat(p.startDay)||0)>=29)||p4.some(d=>(parseFloat(d.day)||0)>=29);
    return isLunar&&has29p?<div style={{fontSize:8,color:"#fb923c",fontStyle:"italic",padding:"4px 8px",marginTop:4,lineHeight:1.4}}>⚠ Lunar day 30 doesn't occur every cycle — the moon's period varies (~29.3–29.8 days). Doses on day 29–30 may be skipped some months.</div>:null;
  })()}</>}

  {(tab==="calendar"||focusMode)&&<div style={{marginTop:10}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <div style={{display:"flex",gap:0,background:dark?"rgba(30,41,59,.5)":accentA(.08),borderRadius:5,overflow:"hidden"}}>
          <button onClick={()=>setCalView("month")} data-tip="Gregorian month grid view" style={{padding:"5px 10px",fontSize:10,fontWeight:600,color:calView==="month"?accent:sub,background:calView==="month"?accentA(.12):"transparent",border:"none",cursor:"pointer"}}>Month</button>
          <button onClick={()=>{setCalView("day");setDayViewIdx(0);}} data-tip="Single day detail view" style={{padding:"5px 10px",fontSize:10,fontWeight:600,color:calView==="day"?accent:sub,background:calView==="day"?accentA(.12):"transparent",border:"none",cursor:"pointer"}}>Day</button>
        </div>
        {calView==="month"&&<div style={{display:"flex",alignItems:"center",gap:3}}>
          <button onClick={()=>{let m=gMonth-1,y=gYear;if(m<0){m=11;y--;}setGMonth(m);setGYear(y);}} style={{...t.sb,fontSize:12,padding:"3px 8px"}}>◀</button>
          <span style={{fontSize:13,fontWeight:600,color:tx,minWidth:100,textAlign:"center"}}>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][gMonth]} {gYear}</span>
          <button onClick={()=>{let m=gMonth+1,y=gYear;if(m>11){m=0;y++;}setGMonth(m);setGYear(y);}} style={{...t.sb,fontSize:12,padding:"3px 8px"}}>▶</button>
          <button onClick={()=>{const td=new Date();setGMonth(td.getMonth());setGYear(td.getFullYear());}} style={{...t.sb,fontSize:9,padding:"3px 6px"}} data-tip="Jump to today's date">Today</button>
          {isMenstrual&&<span style={{fontSize:9,color:sub,minWidth:36,display:"inline-flex",
            alignItems:"center",gap:4}}>
            {/* The same drawn moon as the day view, so the toolbar badge and the
                day header can never show different phases. */}
            {isLunar&&<MoonSVG day={lunarDay-1} size={13} lit={dark?"#e9e4ff":"#4c1d95"} dim={sub}/>}
            <span>{isLunar?`L${lunarDay}`:`C${getCycleDay(new Date())+1}`}</span>
          </span>}
        </div>}
        {calView==="day"&&<div style={{display:"flex",alignItems:"center",gap:3}}>
          <button onClick={()=>setDayViewIdx(dayViewIdx-1)} style={{...t.sb,fontSize:12,padding:"3px 8px"}}>◀</button>
          <span style={{fontSize:13,fontWeight:600,color:tx,minWidth:60,textAlign:"center"}}>{(()=>{const d=new Date();d.setDate(d.getDate()+dayViewIdx);return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});})()}</span>
          <button onClick={()=>setDayViewIdx(dayViewIdx+1)} style={{...t.sb,fontSize:12,padding:"3px 8px"}}>▶</button>
          <button onClick={()=>setDayViewIdx(0)} style={{...t.sb,fontSize:9,padding:"3px 6px"}} data-tip="Jump to today">Today</button>
          {isMenstrual&&<span style={{fontSize:9,color:sub,minWidth:36,display:"inline-flex",
            alignItems:"center",gap:4}}>
            {/* The same drawn moon as the day view, so the toolbar badge and the
                day header can never show different phases. */}
            {isLunar&&<MoonSVG day={lunarDay-1} size={13} lit={dark?"#e9e4ff":"#4c1d95"} dim={sub}/>}
            <span>{isLunar?`L${lunarDay}`:`C${getCycleDay(new Date())+1}`}</span>
          </span>}
        </div>}
      </div>
      {/* Focus-mode toggle replaces the old "lesser settings" gear and the
          mini-settings row. Schedule selection + ovul-day + day-1 controls
          now live in the main settings modal (top-right gear). When focus
          mode is on, all UI chrome hides; this toggle stays visible so the
          user can exit. */}
      {/* Maximize / minimize button. The icon flips between outward-pointing
          corners (currently minimized — click to enter focus) and inward-
          pointing corners (currently in focus — click to exit). Inline SVG
          so the two glyphs are exact visual inverses; unicode "⛶" doesn't
          have a reliable matching inverse character across fonts. */}
      <button onClick={()=>setFocusMode(!focusMode)} style={{...t.sb,fontSize:11,padding:"3px 6px",marginLeft:"auto",display:"inline-flex",alignItems:"center",justifyContent:"center"}} data-tip={focusMode?"Exit focus mode — show all UI":"Focus mode — hide everything except the day strip, graph, and calendar"}>
        {focusMode
          ?/* Inward corners: exit focus / restore chrome */
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="4.5,1 4.5,4.5 1,4.5"/>
              <polyline points="7.5,1 7.5,4.5 11,4.5"/>
              <polyline points="4.5,11 4.5,7.5 1,7.5"/>
              <polyline points="7.5,11 7.5,7.5 11,7.5"/>
            </svg>
          :/* Outward corners: enter focus / minimize chrome */
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="1,4.5 1,1 4.5,1"/>
              <polyline points="11,4.5 11,1 7.5,1"/>
              <polyline points="1,7.5 1,11 4.5,11"/>
              <polyline points="11,7.5 11,11 7.5,11"/>
            </svg>}
      </button>
    </div>

    {/* SINGLE DAY VIEW */}
    {calView==="day"&&(()=>{
      const cl2=Math.round(cycleLen);
      const gregDate=new Date();gregDate.setDate(gregDate.getDate()+dayViewIdx);
      /* The body diagram's seating, shared by the inventory panel and the events
         list. Declared HERE, in the scope that contains both, because each of
         those is a self-invoking block with its own scope and neither can see
         the other's locals. Reaching across that boundary is what crashed the
         app: `key is not defined`, thrown while building the events rows. */
      let dayBody={evalAt:0,worn:[],slots:[],key:()=>null,assign:{},lastUsed:[],
        overflow:0,prevAt:{}};
      const cur=dayViewIdx===0;
      const i=getCycleDay(gregDate);// 0-based cycle day
      const n=calD.dayNotes?.[i]||{};const medsData=getMeds(i,sc,gregDate);const meds=medsData.meds;
      const dateStr=gregDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
      return<div style={{background:cur?(dark?accentA(.08):accentA(.12)):sf,border:`1px solid ${cur?accentA(.25):brd}`,borderRadius:12,padding:"20px 24px"}}>
        {!cur&&<div style={{background:accentA(.1),border:`1px solid ${accentA(.2)}`,borderRadius:6,padding:"6px 10px",marginBottom:10,fontSize:12,color:accent,fontWeight:600}}>⚠️ Not current day! Today is {isLunar?"Lunar":"Cycle"} Day {isLunar?lunarDay:(getCycleDay(new Date())+1)}.</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,gap:12,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:22,fontWeight:700,color:tx,marginBottom:2}}>{dateStr}</div>
            {isMenstrual&&<div style={{fontSize:16,color:sub,marginBottom:3,display:"flex",
              alignItems:"center",gap:7}}>
              {isLunar&&<MoonSVG day={i} size={19} lit={dark?"#e9e4ff":"#4c1d95"} dim={sub}/>}
              <span>{isLunar?"Lunar":"Cycle"} Day {i+1}</span>
            </div>}
            {!isMenstrual&&<div style={{fontSize:16,color:sub,marginBottom:3}}>Day {i+1} · {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][gregDate.getDay()]}</div>}
            {isLunar&&isMenstrual&&<div style={{fontSize:16,color:"#c084fc",marginBottom:1}}>{mNm(i)||""}</div>}
            {isMenstrual&&<div style={{fontSize:16,color:accent,fontWeight:600}}>{mPh(i,cycleLen,ovulationDay,cycleAnchor)}</div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,maxWidth:300,minWidth:0}}>
            {/* ═══ IN THE DRAWER ═══
                One counter per patch medication, capped at five so the corner
                cannot fill up. This is stock at home; the "on body" badge below
                is what you are wearing. Click a number to change it. */}
            {(()=>{
              const MAXC=5;
              const pm=(medications||[]).filter(m=>m.enabled
                &&m.deliveryType==="continuous"&&m.continuousType==="patch"
                &&patchesPerCycle([m],cycleLen)>0).slice(0,MAXC);
              if(!pm.length)return null;
              const legacy=patchStock.__legacy;
              const fmt=v=>{const r=Math.round(v*100)/100;
                return String(r).replace(/(\.\d*?)0+$/,"$1").replace(/\.$/,"");};
              return<div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                {pm.map((m,mi)=>{
                  const id=m.id||("m"+mi);
                  const st=patchStock[id]||(mi===0?legacy:null);
                  let rem=null,runOut=null;
                  if(st&&st.n>0){
                    const daysAgo=Math.max(0,(Date.now()-st.at)/86400000);
                    const used=patchesUsedSince([m],cycleLen,nowCdFrac,daysAgo,cycLenNow);
                    /* Wraps rather than going negative: run a box empty and it
                       starts again from the number entered, which is what
                       restocking the same amount looks like. */
                    const cyc=used>0?used%st.n:0;
                    rem=st.n-cyc;
                    if(rem<=1e-9)rem=st.n;
                    runOut=patchesRunOutIn([m],cycleLen,nowCdFrac,rem,cycLenNow);
                  }
                  const low=runOut!==null&&runOut<=7;
                  const editing=stockEdit&&stockEdit.id===id;
                  const col=m.color||accent;
                  const commit=(v)=>{
                    const num=parseFloat(v),next={...patchStock};
                    delete next.__legacy;
                    if(num>0)next[id]={n:num,at:Date.now()};else delete next[id];
                    savePatchStock(next);setStockEdit(null);
                  };
                  return<div key={id} style={{display:"flex",alignItems:"center",gap:7,
                    padding:"4px 9px",borderRadius:9,
                    border:`1px solid ${low?"#4ade8066":brd}`,
                    background:low?"#4ade801a":(dark?"rgba(255,255,255,.03)":"rgba(0,0,0,.03)")}}>
                    <PatchSVG size={16} color={low?"#4ade80":col}/>
                    {pm.length>1&&<span style={{fontSize:9,color:sub,maxWidth:74,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>}
                    {editing
                      ?<input autoFocus type="number" step="0.5" min="0" value={stockEdit.value}
                         onChange={e=>setStockEdit({id,value:e.target.value})}
                         onBlur={e=>commit(e.target.value)}
                         onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();
                           if(e.key==="Escape")setStockEdit(null);}}
                         style={{width:56,background:ibg,border:`1px solid ${ibd}`,borderRadius:5,
                           padding:"1px 5px",color:tx,fontSize:13,outline:"none"}}/>
                      :<span onClick={()=>setStockEdit({id,value:st&&st.n>0?String(st.n):""})}
                         title={st&&st.n>0
                           ?`${fmt(rem)} of ${fmt(st.n)} ${m.name} patches left in storage`
                            +(runOut!==null?`, about ${Math.round(runOut)} day`
                              +(Math.round(runOut)===1?"":"s")+" at this schedule":"")
                            +". Click to set a new count."
                           :`Click to say how many ${m.name} patches you have in storage. Halves are fine.`}
                         style={{fontSize:13,color:low?"#4ade80":tx,fontWeight:600,cursor:"pointer",
                           whiteSpace:"nowrap"}}>
                         {st&&st.n>0
                           ?<>{fmt(rem)} <span style={{fontSize:9,color:sub,fontWeight:400}}>in storage</span></>
                           :<span style={{fontSize:11,color:sub,fontWeight:400}}>set stock</span>}
                       </span>}
                    {low&&!editing&&<span title={`Only about ${Math.round(runOut)} day`
                        +(Math.round(runOut)===1?"":"s")+` of ${m.name} left \u2014 time to request a refill.`}
                      style={{display:"inline-flex",alignItems:"center",gap:4}}>
                      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="8" r="7" fill="#4ade80"/>
                        <rect x="7" y="3.6" width="2" height="5.4" rx="1" fill="#0b1220"/>
                        <circle cx="8" cy="11.6" r="1.2" fill="#0b1220"/>
                      </svg>
                      <span style={{fontSize:10,color:"#4ade80",fontWeight:700,
                        letterSpacing:".03em"}}>refill</span>
                    </span>}
                  </div>;
                })}
              </div>;
            })()}
            {dayNotesOpen&&n.mood&&<div style={{fontSize:40}}>{n.mood}</div>}
            {affirmOn&&affirmMsgs.length>0&&(()=>{const tags=(n.feeling||"").split(",").map(s=>s.trim()).filter(Boolean);const sadCount=tags.filter(w=>SADWORDS.has(w)).length;const sadTriggered=sadCount>=3;
              const forced=n.affirmForced!==undefined&&n.affirmForced!==false;const phaseNow=mPh(i,cycleLen,ovulationDay,cycleAnchor);const isLuteal=lutealAffirm&&(phaseNow==="Luteal"||phaseNow==="Premenstrual");
              const showIt=forced||isLuteal||sadTriggered;
              const pinnedIdx=typeof n.affirmForced==="number"?n.affirmForced:null;
              const displayMsg=pinnedIdx!==null&&affirmMsgs[pinnedIdx]?affirmMsgs[pinnedIdx]:getAffirmMsg(i);
              const sourceLabel=forced?(pinnedIdx!==null?"pinned":"manually shown"):isLuteal?"luteal phase affirmation":"shown because you're feeling down";
              const selectValue=forced?String(pinnedIdx!==null?pinnedIdx:"auto"):"off";
              const handleSelectChange=e=>{const u={...calD};if(!u.dayNotes)u.dayNotes=Array.from({length:30},()=>({feeling:"",mood:""}));const v=e.target.value;if(v==="off")u.dayNotes[i]={...u.dayNotes[i],affirmForced:false};else if(v==="auto")u.dayNotes[i]={...u.dayNotes[i],affirmForced:true};else u.dayNotes[i]={...u.dayNotes[i],affirmForced:parseInt(v)};setCalD(u);};
              const overlaySelect=<select value={selectValue} onChange={handleSelectChange} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%",border:"none",appearance:"none"}} aria-label="Pin or change affirmation">
                <option value="off">no pinned affirmation</option>
                <option value="auto">auto-select</option>
                {affirmMsgs.map((m,j)=><option key={j} value={j}>{m.slice(0,50)}{m.length>50?"…":""}</option>)}
              </select>;
              if(showIt)return<div style={{width:"100%",textAlign:"left"}}>
                <div style={{position:"relative",borderRadius:8,padding:"8px 12px",fontSize:11,color:sub,lineHeight:1.5,cursor:"pointer"}}>
                  <div style={{fontStyle:"italic",marginBottom:4,wordBreak:"break-word",overflowWrap:"break-word"}}>{displayMsg}</div>
                  <div style={{fontSize:9,color:dark?"rgba(244,114,182,.5)":"rgba(244,114,182,.6)"}}>
                    {sourceLabel}{" · "}<span style={{fontSize:8}}>tap to change 💜</span>
                  </div>
                  {overlaySelect}
                </div>
              </div>;
              return<div style={{width:"100%",textAlign:"right"}}>
                <div style={{position:"relative",display:"inline-block",cursor:"pointer",fontSize:18,opacity:0.75,padding:"4px 6px"}} aria-label="Pin an affirmation">
                  💜
                  {overlaySelect}
                </div>
              </div>;
            })()}
          </div>
        </div>
        {/* A past day is a record, not a live view: no dose checkboxes to tick and
            no body diagram to reconstruct. Just what happened. */}
        {dayViewIdx>=0&&meds.length>0&&(()=>{
          // Hide patch lines from the textual checklist whenever the inventory
          // panel is showing them visually (i.e., for any patch user, not just
          // conservation mode).
          const visibleMeds=pa.length>0?meds.filter(m=>!m.startsWith("🩹")):meds;
          if(visibleMeds.length===0)return null;
          return<div style={{background:"rgba(244,114,182,.05)",border:"1px solid rgba(244,114,182,.1)",borderRadius:8,padding:"10px 14px",marginBottom:12}}>
          <div style={{fontSize:13,color:accent,fontWeight:600,marginBottom:4}}>Medications</div>
          {visibleMeds.map((m,j)=>{const dateKey=localDateKey(gregDate);const origIdx=meds.indexOf(m);const checkKey=`${dateKey}-${origIdx}`;const checked=!!(calD.medChecks||{})[checkKey];const todayKey=localDateKey();const isFuture=dateKey>todayKey;
            const isPatch=m.startsWith("🩹");
            const patchMatch=isPatch&&m.match(/^(🩹 ×[^\s(]+)\s*\((.+)\)$/);
            return<div key={j} style={{fontSize:12,color:checked?sub:tx,marginBottom:isPatch?6:3,display:"flex",alignItems:"flex-start",gap:6,cursor:isFuture?"default":"pointer",opacity:checked?.7:1,transition:"all .15s"}} onClick={()=>{
              if(isFuture)return;
              const u={...calD};if(!u.medChecks)u.medChecks={};
              const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);const cutStr=localDateKey(cutoff);
              const pruned={};for(const[k,v] of Object.entries(u.medChecks)){const d=k.slice(0,10);if(d>=cutStr)pruned[k]=v;}
              pruned[checkKey]=!checked;if(!pruned[checkKey])delete pruned[checkKey];
              u.medChecks=pruned;setCalD(u);}}>
              <span style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${checked?"rgba(148,163,184,.4)":"rgba(148,163,184,.3)"}`,background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative",overflow:"visible"}}>{checked&&<svg width="22" height="22" viewBox="0 0 22 22" style={{position:"absolute",top:-2,left:-2}}><path d="M4 11.5 L9 16.5 L18 5.5" fill="none" stroke={checkColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>
              {patchMatch?<div>
                <span style={{fontSize:14,fontWeight:700}}>{patchMatch[1]}</span>
                <div style={{fontSize:12,color:sub,marginTop:2,lineHeight:"1.5"}}>{patchMatch[2]}</div>
              </div>:m}
            </div>})}
        </div>})()}
        {/* (Patches on body panel removed — its functionality is merged into the
            Patch Inventory grid below: tap a piece to split it, edit its age,
            or drag onto another same-family piece to combine.) */}
        {/* PATCH INVENTORY — steady state. Slots are PLACES on the body, not
            pieces: A-D left, E-H right, filling one side before the other, so a
            letter means the same spot day to day and rotation stays legible.
            Nothing here is editable — what's on you is derived from the schedule
            and the cycle day, so there is nothing that can drift out of sync.
            The bar reads percent of ORIGINAL delivery, straight off the waveform,
            not distance to an expiry date. */}
        {/* ═══ THE DIAGRAM'S SEATING, COMPUTED ONCE ═══
            Hoisted out here because the patch inventory and the events list are
            two SEPARATE self-invoking blocks below, and each has its own scope.
            The events list used to reach for `slots` and `key` that live inside
            the inventory's block — which throws, because they are not there.
            One computation, visible to both, is what makes them agree at all. */}
        {(()=>{
          const evalAt=(i===getCycleDay(new Date()))?nowCdFrac:i;
          const worn=pa.length?patchesOnAt(evalAt,pa,cycleLen,patchCurve,patchDur,cycLenNow,cycLenPrev):[];
          const bs=pa.length?bodySlots(worn,maxOnBody,pa,cycleLen,seatOv,getCycleIdx(gregDate),
            seedFor(getCycleIdx(gregDate)*cycleLen+evalAt)):null;
          dayBody={evalAt,worn,slots:bs?bs.slots:[],key:bs?bs.key:(()=>null),
            assign:bs?bs.assign:{},lastUsed:bs?bs.lastUsed:[],overflow:bs?bs.overflow:0,prevAt:{}};
          return null;})()}
        {dayViewIdx>=0&&pa.length>0&&(()=>{
          // Evaluate at NOW when we're looking at today, not at midnight of the
          // displayed day. Otherwise a piece applied late last night reads as
          // nearly full with hours left, while the warning beside it correctly
          // says it comes off in minutes.
          const evalAt=dayBody.evalAt;
          const worn=dayBody.worn;
          const {slots,overflow,assign,key,lastUsed}=dayBody;
          // Coming off soon: match each worn piece to its off event.
          const offSoon={};
          for(const ev of dueSoon)if(ev.kind==="off"&&ev.piece)offSoon[ev.piece._id||(ev.piece.day+"/"+ev.piece.size)]=ev;
          // Going on soon: preview them in the empty slots, in order.
          const wornIds=new Set(worn.map(w=>w._id||(w.day+"/"+w.size)));
          const onSoon=dueSoon.filter(ev=>ev.kind==="on"&&ev.piece&&!wornIds.has(ev.piece._id||(ev.piece.day+"/"+ev.piece.size)));
          /* Where the pieces going on soon are going. This is not a forecast any
             more: the projector sealed each one when it crossed the 36-hour
             horizon, so the outline simply reads the record. The old fallback
             stays for the moment before the first tick after an import, and for a
             piece whose sealed spot has somehow been taken. */
          const prevAt={},nowT=Date.now();
          for(const ev of onSoon){
            const pk=key(ev.piece),rec=places.place&&places.place[pk];
            let si=(rec&&rec.until>nowT&&!slots[rec.slot].piece&&prevAt[rec.slot]==null)?rec.slot:null;
            if(si==null){
              si=assign[pk];
              if(si==null||slots[si].piece||prevAt[si]!=null){
                const free=[];
                for(let z=0;z<slots.length;z++)if(!slots[z].piece&&prevAt[z]==null)free.push(z);
                if(!free.length)continue;
                free.sort((x,y)=>((lastUsed&&lastUsed[x])??-1e9)-((lastUsed&&lastUsed[y])??-1e9)||x-y);
                si=free[0];
              }
            }
            prevAt[si]=ev;
          }
          dayBody.prevAt=prevAt;
          /* ═══ THE VETO ═══ */
          /* You may re-site a patch at either age — an outline that has not gone on
             yet, or one stuck to you now. They are the same entity, so this is one
             rule rather than two: the placement record is rewritten, and that is
             the whole of it. Nothing recomputes afterwards.

             The spot it left pops its top stamp, so the one underneath becomes its
             barometer again and the spot goes back to looking exactly as rested as
             it was before this patch was ever put there — that happens in makeRot,
             which reseats the stacks from where the pieces actually are, and it
             needs nothing from here except the new record.

             A worn patch landing on an occupied spot swaps with its occupant,
             because a patch already stuck to you has nowhere else to be. An
             outline standing in the way just loses its claim and picks again from
             the next-oldest spot on the next tick. */
          const movePiece=(from,to)=>{
            if(from==null||to==null||from===to)return;
            const worn_=n=>(slots[n]&&slots[n].piece)||null;
            const proj_=n=>(prevAt[n]&&prevAt[n].piece)||null;
            const a=worn_(from)||proj_(from);
            if(!a)return;
            const bWorn=worn_(to),bProj=proj_(to);
            const ka=key(a);
            /* A placement dies when its patch does, so the rotation resumes on its
               own without anything to undo. An outline that has not gone on yet
               takes its whole wear from the moment it will. */
            const dead=w=>{
              const r=places.place&&places.place[key(w)];
              if(r&&r.until>Date.now())return r.until;
              const left=(w.offIn!=null)?w.offIn:(parseFloat(w.wear)||0.02);
              return Date.now()+Math.max(0.02,left)*86400000;
            };
            setPlaces(prev=>{
              const place={...(prev.place||{})};
              const put=(w,slot)=>{const pk=key(w),r=place[pk]||{};
                place[pk]={...r,slot,until:(r.until&&r.until>Date.now())?r.until:dead(w),src:"user"};};
              put(a,to);
              if(bWorn)put(bWorn,from);
              else if(bProj)delete place[key(bProj)];        // outline steps aside and re-picks
              return savePlaces({...prev,place});
            });
            /* Keep the legacy override in step for anything already worn, so an
               export written by an older build still lands the patch where it was
               put. Outlines have no equivalent there and don't need one. */
            if(a.offIn!=null){
              const next={...slotOv};
              next[ka]={slot:to,until:dead(a)};
              if(bWorn)next[key(bWorn)]={slot:from,until:dead(bWorn)};
              saveSlotOv(next);
            }
          };
          const total=snapPatch(worn.reduce((a,w)=>a+w.size,0));
          const perSide=Math.floor(Math.max(2,maxOnBody)/2);
          const sideOf=n=>PATCH_SIDES[Math.floor(n/perSide)]||PATCH_SIDES[1];
          const hp=v=>v>=.5?"#4ade80":v>=.3?"#facc15":v>=.12?"#fb923c":"#f87171";
          return<div style={{marginTop:10,padding:"9px 10px",background:sf,
            border:`1px solid ${brd}`,borderRadius:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:600,color:tx}}>On body</span>
              <span style={{fontSize:9,color:sub}}>day {i+1}</span>
              {total>0&&<span title="How much patch is on your body right now. The counter beside the date is what is left in the drawer."
                style={{display:"inline-flex",alignItems:"center",gap:5,marginLeft:"auto"}}>
                <PatchSVG size={15} color={accent}/>
                <span style={{fontSize:13,color:accent,fontWeight:600}}>×{patchFracTotal(total)}</span>
                <span style={{fontSize:9,color:sub,fontWeight:400}}>on body</span>
              </span>}
            </div>
            <div style={{display:"grid",
              gridTemplateColumns:`repeat(auto-fit,minmax(96px,1fr))`,gap:6}}>
              {slots.map((sl,n)=>{
                const p=sl.piece;const pot=p?p.potency:0;
                // The bar is LIFE REMAINING, like a battery: full green when it
                // goes on, empty red when it's about to come off. Potency stays
                // in the text below, where a number reads better than a gauge.
                const life=p?Math.max(0,Math.min(1,p.offIn/Math.max(1e-6,parseFloat(p.wear)||1))):0;
                const key=p?(p._id||(p.day+"/"+p.size)):null;
                const off=p?offSoon[key]:null;
                const prev=p?null:prevAt[n];
                const isDrag=dragSlot===n,isOver=overSlot===n&&dragSlot!=null&&dragSlot!==n;
                /* With more than one patch drug on the body, "1/2 on L C" is not
                   enough to act on \u2014 the slot has to say WHICH. The medication's
                   own colour tints the slot and its short tag labels it. */
                /* Within EARLY_HOURS of its moment, either coming off or going
                   on. The green edge sits outside the medication's own colour so
                   both are readable at once. */
                const dueH=p?(off?off.inDays*24:1e9):(prev?prev.inDays*24:1e9);
                const early=dueH<=EARLY_HOURS&&dueH>=-0.01;
                const pc=p||(prev&&prev.piece)||null;
                const mcol=(pc&&pc._medColor)||accent;
                const mnm=(pc&&pc._medName)||"";
                return<div key={sl.letter} data-slot={n}
                  onPointerDown={e=>{if(!p&&!prev)return;
                    setDragSlot(n);setOverSlot(n);
                    try{e.currentTarget.setPointerCapture(e.pointerId);}catch(err){}}}
                  onPointerMove={e=>{if(dragSlot==null)return;
                    const el=document.elementFromPoint(e.clientX,e.clientY);
                    const t=el&&el.closest&&el.closest("[data-slot]");
                    setOverSlot(t?parseInt(t.getAttribute("data-slot")):null);}}
                  onPointerUp={()=>{movePiece(dragSlot,overSlot);setDragSlot(null);setOverSlot(null);}}
                  onPointerCancel={()=>{setDragSlot(null);setOverSlot(null);}}
                  style={{padding:"6px 5px",borderRadius:6,touchAction:"none",
                  cursor:(p||prev)?(isDrag?"grabbing":"grab"):"default",
                  transform:isDrag?"scale(.94)":isOver?"scale(1.04)":"none",
                  boxShadow:isOver?`0 0 0 2px ${accent}`:"none",
                  transition:"transform .12s ease, box-shadow .12s ease",
                  background:p?`${mcol}14`:"transparent",
                  border:`1px ${p?"solid":"dashed"} ${p?mcol+"55":prev?mcol+"66":brd}`,
                  outline:early?`2px solid ${EARLY_COL}`:"none",
                  outlineOffset:early?"-1px":"0",
                  opacity:p?1:prev?.85:.4,textAlign:"center",position:"relative",
                  overflow:"hidden",minWidth:0}}>
                  {off&&<div style={{position:"absolute",top:1,right:4,fontSize:12,color:"#fbbf24",fontWeight:700,lineHeight:1}}>!</div>}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,lineHeight:1.1}}>
                    <span style={{fontSize:14,fontWeight:700,color:p?mcol:prev?mcol:sub,
                      opacity:prev?.6:1,border:`1px solid ${p?mcol+"44":brd}`,borderRadius:4,
                      padding:"0 5px"}}>{sl.letter}</span>
                    {(p||prev)&&<span style={{fontSize:9,fontWeight:600,color:sub,opacity:.5,
                      letterSpacing:".02em"}}>{patchTag(pa,p||(prev&&prev.piece))}</span>}
                  </div>
                  {mnm&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",
                    gap:3,marginTop:2}} title={mnm}>
                    <span style={{width:6,height:6,borderRadius:3,background:mcol,
                      flex:"0 0 auto",opacity:p?1:.7}}/>
                    <span style={{fontSize:8,color:mcol,fontWeight:700,letterSpacing:".04em",
                      opacity:p?.95:.7,overflow:"hidden",textOverflow:"ellipsis",
                      whiteSpace:"nowrap",maxWidth:72}}>{mnm}</span>
                  </div>}
                  <div style={{fontSize:8,color:sub,letterSpacing:".06em",textTransform:"uppercase"}}>{sideOf(n)}</div>
                  {p?<>
                    <div style={{fontSize:12,color:tx,fontWeight:600,marginTop:3}}>{patchFrac(p.size)}</div>
                    {needsTegaderm(p.wear,patchMed&&patchMed.tegadermDays)&&
                      <div style={{fontSize:9,color:tx,fontWeight:700,marginTop:2,letterSpacing:".02em"}}>+ Tegaderm</div>}
                    <div style={{height:4,borderRadius:2,background:"rgba(148,163,184,.18)",marginTop:4,overflow:"hidden"}}>
                      <div style={{width:`${Math.max(2,Math.round(life*100))}%`,height:"100%",
                        background:hp(life),transition:"width .4s linear, background .4s linear"}}/>
                    </div>
                    <div style={{fontSize:8,color:hp(life),fontWeight:600,marginTop:3,
                      lineHeight:1.25,overflowWrap:"anywhere"}}>
                      {p.offIn<1?Math.round(p.offIn*24)+"h":p.offIn.toFixed(1)+"d"}
                      <span style={{color:sub,fontWeight:400}}> until removal</span></div>
                    {off&&<div style={{fontSize:9,color:"#fbbf24",fontWeight:600,marginTop:3,lineHeight:1.2}}>
                      off<br/>{off.shortl}</div>}
                    <div style={{fontSize:8,color:sub,marginTop:3,
                      lineHeight:1.25,opacity:.85,overflowWrap:"anywhere"}}>
                      {Math.round(pot*100)}% potency</div>
                  </>:prev?<>
                    <div style={{fontSize:12,color:mcol,fontWeight:600,marginTop:3,opacity:.75}}>{patchFrac(prev.piece.size)}</div>
                    {needsTegaderm(prev.piece.wear,patchMed&&patchMed.tegadermDays)&&
                      <div style={{fontSize:9,color:tx,fontWeight:700,marginTop:2,letterSpacing:".02em"}}>+ Tegaderm</div>}
                    <div style={{fontSize:9,color:accent,fontWeight:600,marginTop:3,lineHeight:1.2,opacity:.9}}>on<br/>{prev.shortl}</div>
                  </>:<div style={{fontSize:9,color:sub,marginTop:6}}>empty</div>}
                </div>;})}
            </div>
            {overflow>0&&<div style={{fontSize:9,color:"#fbbf24",marginTop:6}}>
              {overflow} more piece{overflow>1?"s":""} scheduled than the body limit of {maxOnBody} allows.</div>}
          </div>;
        })()}
          {(()=>{
            const kD=localDateKey(gregDate),todayK=localDateKey(new Date());
            const rec=dayLog[kD],ciD=getCycleIdx(gregDate);
            const isToday=kD===todayK,isPast=kD<todayK,isFuture=kD>todayK;
            const mdE=`${gregDate.getMonth()+1}-${gregDate.getDate()}`;
            // Anything the user wrote in themselves belongs in this list too.
            const manual=(calD.events||[]).filter(ev=>{
              if(!ev.title)return false;
              if(ev.recurrence==="once")return ev.date===kD;
              if(ev.recurrence==="annual")return ev.monthDay===mdE;
              if(ev.recurrence==="cycle")return(ev.cycleDay||0)===i;
              return false;});
            /* ═══ WHERE A PATCH IS ═══
               The diagram above this list is the authority, full stop. It seats
               from `slots` (what is on the body now) and `prevAt` (spots reserved
               for pieces going on soon), and those are the letters the user reads.

               This list had been working it out again, three separate times over:
               dayEventsFor seated at each piece's application instant, the
               36-hour window's seatOf seated from one medication's pieces rather
               than the pool, and neither consulted the diagram. Three derivations
               of one fact is two too many \u2014 the same 1/3 patch came out B on the
               diagram and D in the list. Now the list ASKS. */
            const diagramSpot=pc=>{
              if(!pc||!dayBody.slots.length)return null;
              try{
                const K=dayBody.key,SL=dayBody.slots,PV=dayBody.prevAt;
                const k2=K(pc);
                const on=SL.find(x=>x.piece&&K(x.piece)===k2);
                if(on)return` \u2014 ${on.letter}, ${on.side}`;
                for(const si in PV){
                  const pv=PV[si];
                  if(pv&&pv.piece&&K(pv.piece)===k2&&SL[si])
                    return` \u2014 ${SL[si].letter}, ${SL[si].side}`;
                }
              }catch(e){}
              return null;
            };
            /* Identity for the dedupe below. Must never throw: this runs outside
               the inventory's scope, and reaching for its `key` there is what
               crashed the app. */
            const pieceId=pc=>{try{return pc?dayBody.key(pc):null;}catch(e){return null;}};
            /* Swap whatever tail a row arrived with for the diagram's answer. */
            const reSpot=(txt,pc)=>{
              const d=diagramSpot(pc);
              return d==null?txt:txt.replace(/\s*\u2014.*$/,"")+d;
            };
            const tidy=s2=>{
              let m=/^Put on (.+?) of (.+?)(\u2014.*)?$/.exec(s2)||/^Took off (.+?) of (.+?)(\u2014.*)?$/.exec(s2);
              if(m)return`${m[2].trim()} \u00d7${m[1]}${m[3]?" "+m[3]:""}`;
              m=/^Took (.+?) of (.+)$/.exec(s2);
              return m?`${m[2]} ${m[1]}`:s2;
            };
            const logged=!!(rec&&rec.events&&rec.events.length);
            const rows=[];
            for(const ev of manual)rows.push({sort:-1,when:"",kind:"note",text:ev.title});
            if(isPast){
              /* A past day is a record, not a simulation: whatever was logged is what
                 happened, and nothing is re-derived, so it can't drift as the schedule
                 changes underneath it. Records only begin the first day the app is
                 opened, though, and a blank screen for every day before that is worse
                 than useless — so an unrecorded day falls back to the schedule. Either
                 way a past day carries no position: where a patch sat is a fact about a
                 body that has since moved on, and it isn't what you're looking back for.
                 The patch's own tag travels, since that's just its place in the
                 schedule and needs nothing reconstructed. */
              if(logged){
                /* Read the record verbatim. The position in it was stamped the day it
                   happened, so it is where the patch actually sat — moving something
                   today must not reach back and rewrite it. */
                for(const ev of rec.events)rows.push({sort:ev.at,kind:ev.kind,tag:ev.tag,
                  when:ev.vague?(ev.vague==="am"?"morning":"evening"):hourLabel(ev.at*24),
                  text:tidy(ev.text)});
              }else{
                /* No record — the app wasn't open that day. The doses are still knowable
                   from the schedule, so show those; the position isn't, so it's dropped
                   rather than guessed. */
                for(const ev of dayEventsFor(i,medications,cycleLen,null,maxOnBody,ciD,null,cycLenAt(gregDate),cycLenPrev))
                  rows.push({sort:ev.at,kind:ev.kind,tag:ev.tag,
                    when:ev.vague?(ev.vague==="am"?"morning":"evening"):hourLabel(ev.at*24),
                    text:tidy(ev.text).replace(/\s*\u2014.*$/,"")});
              }
            }else{
              const derived=dayEventsFor(i,medications,cycleLen,isToday?seatOv:null,
                maxOnBody,ciD,seedFor(ciD*cycleLen+i),cycLenAt(gregDate),cycLenPrev,isToday?nowCdFrac:null);
              if(isFuture){
                for(const ev of derived)rows.push({sort:ev.at,kind:ev.kind,
                  when:ev.vague?(ev.vague==="am"?"morning":"evening"):hourLabel(ev.at*24),
                  text:reSpot(tidy(ev.text),ev.piece)});
              }else{
                /* Today: a short tail behind, a longer view ahead. Every row is
                   labelled the SAME way — from its own offset from right now, turned
                   into a real calendar moment. Rows used to arrive from two sources
                   with two labelling schemes (bare clock times for the day's own
                   events, relative phrases for the 36-hour window), which only agree
                   while the cycle-day grid and the calendar agree. One source of
                   truth means they cannot drift apart. */
                const back=PAST_HOURS/24,dedupe={},nowT=new Date();
                const label=(pos,vague)=>whenLabel(pos-nowCdFrac,nowT,vague||null);
                for(const ev of derived){
                  const pos=i+ev.at;
                  if(pos<nowCdFrac-back)continue;
                  rows.push({sort:pos,kind:ev.kind,tag:ev.tag,past:pos<nowCdFrac,
                    when:label(pos,ev.vague),text:reSpot(tidy(ev.text),ev.piece)});
                  /* Keyed on WHICH PIECE, not on what minute it rounds to. The
                     two sources feeding this list compute the same event's
                     minute by different routes, and they have disagreed by one
                     before \u2014 at which point the minute key stops matching and
                     the same removal appears twice, as two rows a minute apart.
                     A piece cannot come off twice inside a 48-hour window, so
                     its identity is an exact key. Non-patch rows have no piece
                     and keep the minute. */
                  dedupe[ev.kind+"@"+(pieceId(ev.piece)||Math.round(pos*1440))]=1;
                }
                /* Where a patch in the FORWARD window goes. The rows that come from the
                   36-hour lookahead used to carry no body position, so anything past
                   the end of today lost its spot even though the day view for that
                   same piece showed it. Sampled the way dayEventsFor samples it: the
                   seating at the moment the piece goes ON, which is also the spot it
                   keeps until it comes off. seatOv is passed, so a sealed placement —
                   and any drag on top of it — shows here immediately.
                   Past rows deliberately get nothing: a past day is a record, not a
                   simulation, and where a patch sat is not something to re-derive. */
                const seatOf=ev=>{
                  try{
                    if(ev.kind==="take"||!ev.piece)return"";
                    /* The diagram first, always. */
                    const dg=diagramSpot(ev.piece);
                    if(dg!=null)return dg;
                    const m2=ev.med;
                    const ps2=(m2.pieces&&m2.pieces.length)?m2.pieces
                      :blocksToPieces(m2.doses,cycleLen,m2.patchDuration||PATCH_HALF_LIFE);
                    const cap2=Math.max(2,maxOnBody||8);
                    const d0=parseFloat(ev.piece.day)||0,wr=parseFloat(ev.piece.wear)||0;
                    const onAbs=ciD*cycleLen+nowCdFrac+ev.inDays-(ev.kind==="off"?wr:0);
                    const st2=bodySlots(patchesOnAt(d0,ps2,cycleLen,null,null,cycLenNow,cycLenPrev),cap2,ps2,cycleLen,
                      seatOv,Math.floor(onAbs/cycleLen),seedFor(onAbs));
                    const k2=st2.key(ev.piece);
                    const s2=st2.slots.find(x=>x.piece&&st2.key(x.piece)===k2);
                    return s2?` \u2014 ${s2.letter}, ${s2.side}`:"";
                  }catch(e){return"";}
                };
                const add=(list,past)=>{for(const ev of list){
                  const snap=Math.round((nowCdFrac+(past?-ev.ago:ev.inDays))*1440)/1440;
                  const kk=ev.kind+"@"+(pieceId(ev.piece)||Math.round(snap*1440));
                  if(dedupe[kk])continue;dedupe[kk]=1;
                  rows.push({sort:snap,kind:ev.kind,when:label(snap,ev.vague),
                    color:ev.med.color,past,soon:!past&&ev.inDays<0.5,
                    text:`${ev.med.name} ${ev.kind==="take"?ev.dose+"mg":"\u00d7"+patchFrac(ev.piece.size)}`
                      +(past?"":seatOf(ev))});
                }};
                add(recentDoses(medications,cycleLen,nowCdFrac,nowT,PAST_HOURS,cycLenNow,cycLenPrev),true);
                add(dueSoon,false);
              }
            }
            rows.sort((a,b)=>a.sort-b.sort);
            const badge=kd=>kd==="on"?"ON":kd==="off"?"OFF":kd==="note"?"\u{1F4CC}":"TAKE";
            const fs2=isPast?11:10;
            const yKey=localDateKey(new Date(Date.now()-86400000));
            const title=isPast?(kD===yKey?"Yesterday's events"
              :`${gregDate.toLocaleDateString(undefined,{month:"short",day:"numeric"})} \u2014 events`)
              :isFuture?"Scheduled":"Events";
            const note=isPast?(logged?"":"not recorded \u2014 from the schedule")
              :isFuture?"":`${PAST_HOURS}h back \u00b7 ${ALERT_HOURS}h ahead`;
            return<div style={{marginTop:9,paddingTop:8,borderTop:`1px solid ${brd}`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <span style={{fontSize:isPast?11:10,fontWeight:600,color:tx}}>{title}</span>
                {note&&<span style={{fontSize:8,color:(isPast&&!logged)?"#fbbf24":sub}}>{note}</span>}
              </div>
              {rows.length===0&&<div style={{fontSize:9,color:sub,fontStyle:"italic"}}>
                nothing scheduled</div>}
              {rows.map((r,n)=>(
                <div key={n} style={{display:"flex",alignItems:"baseline",gap:6,fontSize:fs2,
                  color:sub,marginBottom:2,opacity:r.past?.6:1}}>
                  <span style={{color:r.soon?"#fbbf24":sub,minWidth:76,fontSize:fs2-1}}>{r.when}</span>
                  <span style={{color:r.kind==="off"?"#fbbf24":r.kind==="note"?sub:accent,
                    fontWeight:700,minWidth:26,fontSize:fs2-1}}>{badge(r.kind)}</span>
                  <span style={{color:r.color||tx}}>{r.text}</span>
                  {r.tag&&<span style={{color:sub,opacity:.5,fontSize:fs2-2,fontWeight:600}}>{r.tag}</span>}
                </div>))}
            </div>;})()}
        {/* Calendar Events */}
        {(()=>{const dateStr2=localDateKey(gregDate);const md=`${gregDate.getMonth()+1}-${gregDate.getDate()}`;
          const events=(calD.events||[]).filter(ev=>{
            if(ev.recurrence==="once")return ev.date===dateStr2;
            if(ev.recurrence==="annual")return ev.monthDay===md;
            if(ev.recurrence==="cycle")return(ev.cycleDay||0)===i;
            return false;
          });
          const addEvent=()=>{const u={...calD};if(!u.events)u.events=[];
            u.events.push({id:uid(),title:"",date:dateStr2,recurrence:"once",cycleDay:i,monthDay:md,created:new Date().toISOString()});
            setCalD(u);};
          const updateEvent=(evId,updates)=>{const u={...calD};u.events=(u.events||[]).map(ev=>ev.id===evId?{...ev,...updates}:ev);setCalD(u);};
          const removeEvent=(evId)=>{const u={...calD};u.events=(u.events||[]).filter(ev=>ev.id!==evId);setCalD(u);};
          return<div style={{marginBottom:8}}>
            {events.map(ev=><div key={ev.id} style={{display:"flex",gap:4,alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:11,color:sub}}>📌</span>
              <input value={ev.title} onChange={e=>updateEvent(ev.id,{title:e.target.value})} placeholder="Event or reminder..." style={{flex:1,background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:"4px 6px",color:tx,fontSize:11,outline:"none"}}/>
              <select value={ev.recurrence} onChange={e=>{const r=e.target.value;updateEvent(ev.id,{recurrence:r,date:r==="once"?dateStr2:null,cycleDay:r==="cycle"?i:null,monthDay:r==="annual"?md:null});}} style={{background:ibg,border:`1px solid ${ibd}`,borderRadius:3,padding:"2px 4px",color:sub,fontSize:8,outline:"none"}}>
                <option value="once">one-time</option>
                <option value="annual">every year</option>
                <option value="cycle">every cycle</option>
              </select>
              <button onClick={()=>removeEvent(ev.id)} style={{...t.bX,fontSize:11}}>×</button>
            </div>)}
            <button onClick={addEvent} style={{background:"none",border:`1px dashed ${brd}`,borderRadius:4,padding:"3px 8px",color:sub,fontSize:9,cursor:"pointer",width:"100%"}}>+ event or reminder</button>
          </div>;
        })()}
        {!dayNotesOpen&&<button onClick={()=>setDayNotesOpen(true)} style={{background:"rgba(168,85,247,.06)",border:"1px solid rgba(168,85,247,.12)",borderRadius:8,padding:"10px 16px",cursor:"pointer",fontSize:12,color:"#a855f7",fontWeight:500,width:"100%",textAlign:"left"}} data-tip="Track your daily mood and feelings">Tap to expand notes and mood…</button>}
        {dayNotesOpen&&<>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
            <div style={{fontSize:12,color:sub,fontWeight:600,marginBottom:4,width:"100%"}}>Mood</div>
            {MOODS.map(m=><button key={m.k} onClick={()=>{const u={...calD};if(!u.dayNotes)u.dayNotes=Array.from({length:30},()=>({feeling:"",mood:""}));u.dayNotes[i]={...u.dayNotes[i],mood:u.dayNotes[i]?.mood===m.e?"":m.e};setCalD(u);}} style={{background:n.mood===m.e?"rgba(244,114,182,.18)":sf,border:`1px solid ${n.mood===m.e?"rgba(244,114,182,.35)":brd}`,borderRadius:20,padding:"6px 12px",cursor:"pointer",fontSize:13,color:tx,display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:18}}>{m.e}</span><span style={{fontSize:10}}>{m.k}</span></button>)}
          </div>
          <div style={{marginTop:12}}>
            <div style={{fontSize:12,color:sub,fontWeight:600,marginBottom:4}}>Notes</div>
            {(()=>{const tags=(n.feeling||"").split(",").map(s=>s.trim()).filter(Boolean);const sadCount=tags.filter(w=>SADWORDS.has(w)).length;
              const lastTag=tags[tags.length-1];const suggestions=lastTag&&MOODWORDS[lastTag]?MOODWORDS[lastTag]:MOODWORDS._root;
              const availSuggs=suggestions.filter(w=>!tags.includes(w));
              return<>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
                  {availSuggs.slice(0,8).map(w=><button key={w} onClick={()=>{const u={...calD};if(!u.dayNotes)u.dayNotes=Array.from({length:30},()=>({feeling:"",mood:""}));const cur=u.dayNotes[i]?.feeling||"";const newVal=cur?cur+", "+w:w;u.dayNotes[i]={...u.dayNotes[i],feeling:newVal};setCalD(u);const allTags=newVal.split(",").map(s=>s.trim()).filter(Boolean);if(allTags.filter(t=>SADWORDS.has(t)).length>=3&&!libVisible)setLibVisible(true);}} style={{background:sf,border:`1px solid ${brd}`,borderRadius:14,padding:"3px 10px",fontSize:10,color:SADWORDS.has(w)?sub:"#f472b6",cursor:"pointer"}}>{w}</button>)}
                </div>
              </>;
            })()}
            <textarea value={n.feeling||""} onChange={e=>{const u={...calD};if(!u.dayNotes)u.dayNotes=Array.from({length:30},()=>({feeling:"",mood:""}));u.dayNotes[i]={...u.dayNotes[i],feeling:e.target.value};setCalD(u);}} style={{width:"100%",minHeight:60,background:ibg,border:`1px solid ${ibd}`,borderRadius:8,padding:10,color:tx,fontSize:12,resize:"vertical",outline:"none",lineHeight:1.5}} placeholder="How are you feeling?"/>
          </div>
          <button onClick={()=>setDayNotesOpen(false)} style={{marginTop:8,background:"none",border:`1px solid ${brd}`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:11,color:sub,width:"100%"}}>Minimize notes and mood</button>
        </>}
      </div>;
    })()}

    {/* MONTH VIEW */}
    {calView==="month"&&(()=>{
      const firstDay=new Date(gYear,gMonth,1);const lastDay=new Date(gYear,gMonth+1,0);const startDow=firstDay.getDay();const daysInMonth=lastDay.getDate();
      const prevLastDay=new Date(gYear,gMonth,0).getDate();const today=new Date();
      const weeks=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const cells=[];
      for(let i=startDow-1;i>=0;i--)cells.push({day:prevLastDay-i,other:true});
      for(let d=1;d<=daysInMonth;d++){
        const date=new Date(gYear,gMonth,d);
        const ld=getCycleDay(date)+1;const idx=Math.min(ld,29)-1;
        const isToday=d===today.getDate()&&gMonth===today.getMonth()&&gYear===today.getFullYear();
        cells.push({day:d,lunarDay:ld,idx,isToday,date});
      }
      const rem=7-(cells.length%7);if(rem<7)for(let i=1;i<=rem;i++)cells.push({day:i,other:true});
      return<div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {weeks.map(w=><div key={w} style={{textAlign:"center",fontSize:12,fontWeight:700,color:sub,padding:5}}>{w}</div>)}
          {cells.map((c,i)=>{
            if(c.other)return<div key={i} style={{padding:4,fontSize:11,color:dark?"#2a1830":"#d4b0d8",background:dark?"rgba(30,20,35,.3)":"rgba(240,220,240,.3)",borderRadius:5,minHeight:62}}><div style={{fontWeight:600}}>{c.day}</div></div>;
            const n=calD.dayNotes?.[c.idx]||{};const meds=getMeds(c.idx,sc).meds;
            return<div key={i} style={{padding:4,fontSize:11,background:c.isToday?(dark?accentA(.12):accentA(.15)):sf,border:`1px solid ${c.isToday?accentA(.25):brd}`,borderRadius:5,minHeight:62,cursor:"pointer",position:"relative",overflow:"hidden"}} onClick={()=>{setCalView("day");const diff=Math.round((c.date-today)/(86400000));setDayViewIdx(diff);}}>
              {n.mood&&<div style={{position:"absolute",top:2,right:3,fontSize:12}}>{n.mood}</div>}
              <div style={{fontWeight:700,fontSize:12,color:tx,marginBottom:1}}>{c.day}{c.isToday?" ✦":""} {isMenstrual&&<span style={{fontWeight:400,fontSize:8,color:sub}}>{isLunar?`${mEm(c.idx)} L${c.lunarDay}`:`C${c.lunarDay}`}</span>}</div>
              {isMenstrual&&<div style={{color:sub,fontSize:8,marginBottom:1}}>{mNm(c.idx)?mNm(c.idx)+" - ":""}<span style={{color:"#f472b6"}}>{mPh(c.idx,cycleLen,ovulationDay,cycleAnchor)}</span></div>}
              {meds.length>0&&<div style={{fontSize:8,color:sub,lineHeight:1.3}}>{meds.map((m,j)=><div key={j}>{m}</div>)}</div>}
              {(()=>{const ds=localDateKey(c.date);const md2=`${c.date.getMonth()+1}-${c.date.getDate()}`;
                const evts=(calD.events||[]).filter(ev=>(ev.recurrence==="once"&&ev.date===ds)||(ev.recurrence==="annual"&&ev.monthDay===md2)||(ev.recurrence==="cycle"&&(ev.cycleDay||0)===c.idx));
                return evts.length>0?<div style={{fontSize:7,color:accent,lineHeight:1.2,marginTop:1}}>{evts.map((ev,j)=><div key={j}>📌 {ev.title||"event"}</div>)}</div>:null;})()}
            </div>;
          })}
        </div>
      </div>;
    })()}

    {/* Blood level timeline */}
    <div style={{marginTop:10,background:sf,border:`1px solid ${brd}`,borderRadius:8,padding:"8px 8px 4px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setCalChartOpen(p=>!p)}><div style={{fontSize:11,fontWeight:600,color:sub}} data-tip="Click to expand/collapse the blood level chart">{calShowRef?"Hormone Reference":"Blood Levels Timeline"}</div><div style={{display:"flex",gap:4,alignItems:"center"}}>{!calShowRef&&<span style={{position:"relative",display:"inline-flex"}}><button onClick={e=>{e.stopPropagation();setCycShareOpen(o=>!o);setCycShareCopied(false);}} style={{fontSize:8,color:cycShareOpen?"#c084fc":sub,background:cycShareOpen?"rgba(192,132,252,.12)":"transparent",border:`1px solid ${cycShareOpen?"rgba(192,132,252,.3)":brd}`,borderRadius:3,padding:"1px 5px",cursor:"pointer"}} data-tip="Share where you are in your cycle — a med-free link showing your current phase">📤 share</button>{cycShareOpen&&<div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"120%",right:0,zIndex:50,background:"#12131a",border:`1px solid ${brd}`,borderRadius:8,padding:10,width:210,boxShadow:"0 8px 24px rgba(0,0,0,.4)",textAlign:"left"}}><div style={{fontSize:9,color:sub,marginBottom:6,lineHeight:1.4}}>Shares only where you are in your cycle or regimen — no medications, doses, or levels.</div><input value={cycShareName} onChange={e=>setCycShareName(e.target.value)} placeholder="name (optional)" style={{width:"100%",boxSizing:"border-box",background:ibg,border:`1px solid ${ibd}`,borderRadius:4,padding:"3px 6px",color:tx,fontSize:10,marginBottom:5,outline:"none"}}/><div style={{display:"flex",gap:3,marginBottom:7}}>{["she","they","he"].map(p=><button key={p} onClick={()=>setCycSharePronoun(p)} style={{flex:1,fontSize:9,padding:"3px 0",borderRadius:4,cursor:"pointer",background:cycSharePronoun===p?"rgba(192,132,252,.15)":"transparent",border:`1px solid ${cycSharePronoun===p?"rgba(192,132,252,.35)":brd}`,color:cycSharePronoun===p?"#c084fc":sub}}>{p}</button>)}</div><button onClick={()=>{const u=buildCycleShareUrl();try{navigator.clipboard.writeText(u);setCycShareCopied(true);setTimeout(()=>setCycShareCopied(false),1800);}catch(err){}}} style={{width:"100%",fontSize:10,fontWeight:600,padding:"5px 0",borderRadius:5,cursor:"pointer",background:cycShareCopied?"rgba(52,211,153,.15)":"rgba(192,132,252,.15)",border:`1px solid ${cycShareCopied?"rgba(52,211,153,.4)":"rgba(192,132,252,.35)"}`,color:cycShareCopied?"#34d399":"#c084fc"}}>{cycShareCopied?"✓ copied link":"copy link"}</button></div>}</span>}<button onClick={e=>{e.stopPropagation();setCalShowRef(!calShowRef);}} style={{fontSize:8,color:calShowRef?"#f472b6":sub,background:calShowRef?"rgba(244,114,182,.1)":"transparent",border:`1px solid ${calShowRef?"rgba(244,114,182,.2)":brd}`,borderRadius:3,padding:"1px 5px",cursor:"pointer"}} data-tip="Toggle between your blood levels and reference hormone curves">{calShowRef?"ref":"📊 blood"}</button><span style={{fontSize:10,color:sub}}>{calChartOpen?"▾":"▸"}</span></div></div>
      <canvas ref={calCvR} style={{width:"100%",height:calChartOpen?160:0,display:"block",marginTop:calChartOpen?4:0,overflow:"hidden"}}/>
    </div>
    {editDay!==null&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}} onClick={e=>{if(e.target===e.currentTarget)setEditDay(null);}}>
      <div style={{background:dark?"#1a1020":"#fff",border:`1px solid ${brd}`,borderRadius:12,padding:16,width:"min(440px,92vw)",maxHeight:"80vh",overflow:"auto",color:tx}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div>{isMenstrual?<><div style={{fontWeight:700,fontSize:16,color:tx}}>{isLunar?mEm(editDay):""} Day {editDay+1}</div><div style={{fontSize:12,color:sub}}>{mNm(editDay)} · {mPh(editDay,cycleLen,ovulationDay,cycleAnchor)}</div></>:<div style={{fontWeight:700,fontSize:16,color:tx}}>Day {editDay+1}</div>}</div>
          <button onClick={()=>setEditDay(null)} style={{background:"none",border:"none",color:sub,fontSize:20,cursor:"pointer"}}>×</button>
        </div>
        {getMeds(editDay,sc).meds.length>0&&<div style={{background:"rgba(244,114,182,.06)",border:"1px solid rgba(244,114,182,.12)",borderRadius:6,padding:8,marginBottom:10}}><div style={{fontSize:11,color:"#f472b6",fontWeight:600,marginBottom:3}}>From schedule</div>{getMeds(editDay,sc).meds.map((m,i)=><div key={i} style={{fontSize:12,color:tx}}>{m}</div>)}</div>}
        <div style={{fontSize:12,color:sub,marginBottom:4}}>Mood</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{MOODS.map(m=><button key={m.k} onClick={()=>{const u={...calD};if(!u.dayNotes)u.dayNotes=Array.from({length:30},()=>({feeling:"",mood:""}));u.dayNotes[editDay]={...u.dayNotes[editDay],mood:u.dayNotes[editDay]?.mood===m.e?"":m.e};setCalD(u);}} style={{background:calD.dayNotes?.[editDay]?.mood===m.e?"rgba(244,114,182,.18)":sf,border:`1px solid ${calD.dayNotes?.[editDay]?.mood===m.e?"rgba(244,114,182,.35)":brd}`,borderRadius:16,padding:"4px 8px",cursor:"pointer",fontSize:13,color:tx,display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:16}}>{m.e}</span><span style={{fontSize:10}}>{m.k}</span></button>)}</div>
        <div style={{fontSize:12,color:sub,marginBottom:4}}>Notes</div>
        <textarea value={calD.dayNotes?.[editDay]?.feeling||""} onChange={e=>{const u={...calD};if(!u.dayNotes)u.dayNotes=Array.from({length:30},()=>({feeling:"",mood:""}));u.dayNotes[editDay]={...u.dayNotes[editDay],feeling:e.target.value};setCalD(u);}} style={{width:"100%",minHeight:70,background:ibg,border:`1px solid ${ibd}`,borderRadius:6,padding:8,color:tx,fontSize:13,resize:"vertical",outline:"none"}} placeholder="How are you feeling?"/>
      </div>
    </div>}
  </div>}
  {!focusMode&&<div style={{position:"fixed",bottom:0,left:0,right:0,background:dark?"rgba(30,10,20,.97)":"rgba(255,240,248,.97)",borderTop:panelTab?`1px solid ${dark?"rgba(244,114,182,.2)":"rgba(244,114,182,.25)"}`:`3px solid #f472b6`,padding:panelTab?"0":"10px 16px",zIndex:999,transition:"padding .2s",boxShadow:panelTab?"none":(dark?"0 -4px 12px rgba(244,114,182,.12)":"0 -4px 12px rgba(244,114,182,.18)")}}>
    {!panelTab&&<div onClick={()=>setPanelTab("warn")} style={{display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:8,flexWrap:"wrap"}}>
      <span style={{fontSize:Math.min(13,window.innerWidth/30),color:"#f472b6",fontWeight:600,letterSpacing:0.2}}>Liability, Agreement, and Instructions</span>
      <span style={{fontSize:Math.min(11,window.innerWidth/36),color:dark?"#9d8ba0":"#9b6b8a"}}>— tap to read</span>
    </div>}
    {panelTab&&<>
      <div style={{display:"flex",alignItems:"stretch",borderBottom:`1px solid ${dark?"rgba(244,114,182,.15)":"rgba(244,114,182,.2)"}`}}>
        <button onClick={()=>setPanelTab(panelTab==="warn"?null:"warn")} style={{flex:1,minWidth:0,padding:"11px 8px",background:"none",border:"none",borderBottom:`2px solid ${panelTab==="warn"?"#f472b6":"transparent"}`,color:panelTab==="warn"?(dark?"#fda4af":"#9f1239"):(dark?"#9d8ba0":"#9b6b8a"),fontSize:Math.min(12,window.innerWidth/32),fontWeight:panelTab==="warn"?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Liability &amp; Agreement</button>
        <button onClick={()=>setPanelTab(panelTab==="info"?null:"info")} style={{flex:1,minWidth:0,padding:"11px 8px",background:"none",border:"none",borderBottom:`2px solid ${panelTab==="info"?(dark?"#c084fc":"#7c3aed"):"transparent"}`,color:panelTab==="info"?(dark?"#c4b5fd":"#5b21b6"):(dark?"#9d8ba0":"#9b6b8a"),fontSize:Math.min(12,window.innerWidth/32),fontWeight:panelTab==="info"?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>How This Works</button>
        <button onClick={()=>setPanelTab(null)} aria-label="Close" style={{padding:"4px",margin:"6px 8px 6px 4px",background:dark?"rgba(244,114,182,.1)":"rgba(244,114,182,.12)",border:`1px solid ${dark?"rgba(244,114,182,.25)":"rgba(244,114,182,.3)"}`,borderRadius:"50%",color:dark?"#fda4af":"#9f1239",width:30,height:30,fontSize:18,cursor:"pointer",fontFamily:"inherit",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
      </div>
    </>}
    {panelTab==="warn"&&<div data-warn-content="" onTouchMove={e=>e.stopPropagation()} style={{padding:"14px 16px",fontSize:Math.min(13,Math.max(11,window.innerWidth/32)),color:dark?"#fda4af":"#9f1239",lineHeight:1.55,maxWidth:700,margin:"0 auto",maxHeight:"55vh",overflowY:"auto",WebkitOverflowScrolling:"touch",cursor:"default"}} onClick={e=>e.stopPropagation()}>
      <div style={{marginBottom:8}}><strong>About this app.</strong> The creator made this for herself, to get a better sense of how hormone levels were accumulating in her body. She was frustrated that she had no way to gauge this. She fully understands that the visualization is inexact and unreliable — it is mostly cosmetic, creative, if not outright artistic. She does not see this app as a medical device, only as a creative project that makes managing her own hormones a little easier.</div>
      <div style={{marginBottom:8}}><strong>By using this app, you agree:</strong>
        <ul style={{margin:"4px 0 0",paddingLeft:18}}>
          <li style={{marginBottom:3}}>You are 18 or older, or a legal adult in your jurisdiction.</li>
          <li style={{marginBottom:3}}>You have read this warning in full.</li>
          <li style={{marginBottom:3}}>You accept sole responsibility for any damages, harm, or consequences that arise from your use of this app.</li>
          <li style={{marginBottom:3}}>You understand that this is not a medical device. It is a creative visualization tool that helps people get a <em>very rough</em> sense of how a medication with consistent, measurable blood levels accumulates over time.</li>
          <li style={{marginBottom:3}}>You understand this is not appropriate for managing medications where small dosing errors cause acute harm — insulin, blood thinners, antiseizure drugs, anything where being off by a small amount has immediate consequences.</li>
          <li style={{marginBottom:3}}>You will work with a healthcare professional for any actual medical decisions.</li>
        </ul>
      </div>
      <div style={{marginBottom:8}}><strong>Bloodwork is required for this to be useful.</strong> The levels shown here are estimates from blood-level curves you've drawn — they don't reflect what's actually in your body unless you've calibrated the curves against real lab results. Without regular blood tests of peak, midpoint, and trough, what you see on the chart is conjecture, not measurement.</div>
      <div style={{marginBottom:8}}><strong>Hormone cycling carries real risk.</strong> Cycling hormones can strongly affect mood, energy, sleep, and physical health. The risk is higher if you also have a natural cycle that the regimen interacts with. Some drugs have narrow safety margins. Build grounding practices and work with a clinician — ideally before you start.</div>
      <div style={{marginBottom:8}}><strong>Dosing.</strong> Smaller shifts are generally safer than large ones. Some medicines are potent at tiny doses. If something feels wrong, stay calm and seek care.</div>
      <div style={{marginBottom:8}}><strong>Note on spironolactone.</strong> Spiro is an androgen receptor blocker, not a testosterone suppressor — it does not lower T production. Blood T levels may remain high even at therapeutic doses. The widely cited research suggesting spiro's effectiveness was conducted by Dr. Jerilynn Prior, but in that study participants were also given medroxyprogesterone acetate (Provera), which is itself a potent antiandrogen. This confounds the results and makes it difficult to attribute T suppression to spiro alone.</div>
      <div style={{marginBottom:8}}><strong style={{color:"#f472b6"}}>If you're cycling hormones, you'll fare better with the right orientation.</strong> Cycling hormones surfaces a lot — emotional, physical, relational. People who do well through it tend to share certain qualities: they're actively learning to feel their own nervous system from the inside. They accept that life transitions can get messy, and they're willing to let go of patterns and relationships that are no longer serving them. They understand that they're connected to all sentient beings, both visible and invisible. Without that orientation, this regimen can hurt you. With it, the difficult stretches still come, but they pass through you instead of breaking you.</div>
      <div style={{marginBottom:4}}><button onClick={e=>{e.stopPropagation();const el=e.target.nextElementSibling;if(el)el.style.display=el.style.display==="none"?"block":"none";}} style={{background:"none",border:"none",color:dark?"#c084fc":"#7c3aed",cursor:"pointer",fontSize:Math.min(11,window.innerWidth/58),padding:0,textDecoration:"underline"}}>More on why this matters…</button><div style={{display:"none",marginTop:6}}>
        <div style={{marginBottom:6}}>I'm going to assume that if you found this app, you're already fairly open. Please know that cycling hormones creates real turbulence — in your mood, your energy, your sense of self. You can't manage this from your head alone. Many people online try to, and learn the hard way. Like signing up for an insurance policy, you have to take your nervous system hygiene seriously <em>before</em> you need it most. In short: you need to spend significant time reacquainting your head with the rest of your body. This can take hundreds of hours of work, but the fruits of this process make it completely worth it.</div>
        <div style={{marginBottom:6}}>The most reliable way to do that is <strong style={{color:"#f472b6"}}>yoga</strong>, done daily and seriously. Yoga refers to both meditation and physical practices aimed at, against all odds, becoming a kinder and more compassionate person, releasing deep-seated tension, and synchronizing the mind and the body. If you find success, it feels very much like your head has been a lake held in place by a dam, and your body is a river. Successful yoga removes this dam and eventually transforms the whole body into a single river that is maybe a tiny bit steeper and deeper at the top. You can also use other paths that work with the body and mind in a similar way: tai chi, qigong, Christian or Wiccan contemplative practice, Hindu or Buddhist sadhana, hoodoo, Jewish contemplative practice, daily ritual work. Buddhism is particularly useful because it offers techniques suited to many different temperaments — there's a genuinely wide menu of paths inside it.</div>
        <div style={{marginBottom:6}}>The specific tradition matters less than how often you're doing it — it should be daily — and whether you're following the instructions. I know that sounds grating. You absolutely should own the practice. This can be a tough balance as a queer practitioner. You'll encounter moral teachings that don't fit who you are. Some of those — like teachings that say being gay or trans is wrong — you should disregard; they reflect the social assumptions of the time and place a tradition came from, not anything spiritually true. Others will challenge you in ways modern society simply will never ask of you, and those are the ones worth staying with. It's just that finding a lineage of people who devote time, every day, to going inwards is worth its weight in gold. It goes without saying, though, that you should find places that truly make you feel welcome and unashamed, in the deepest corners of your soul.</div>
        <div style={{marginBottom:6}}>Be willing to let go. Cycling hormones tends to clarify what's actually nourishing in your life and what isn't. Relationships, jobs, habits, beliefs about yourself that were already strained may become unsustainable. This is not the regimen failing — it's the regimen working. The capacity to release what's no longer serving you is part of what makes this safe rather than destabilizing. People who try to hold everything in place while their inner chemistry shifts often suffer the most.</div>
        <div style={{marginBottom:6}}>Whatever you do, it needs to be rooted in compassion — in benefiting others, in benefiting all sentient beings. This isn't abstract. Rooting yoga in compassion matters because it widens your view. Believe me when I say I'm all about celebrating myself. But when I remember that my next-door neighbor feels just as much like "themselves" as I feel like "myself" — and then I connect the dots and realize that <em>everyone</em> feels that way — I realize that expanding my view, so my practice benefits myself and also others, is really the most intelligent thing to do. Without that, yoga becomes brittle and narrow-minded, and it won't hold you when things get hard.</div>
        <div style={{marginBottom:6}}><strong>A practice that is purely inward — body only, breath only — probably won't be enough.</strong> Western psychology has found a lot of mileage in distilling all spiritual labor down to inner transformation, but the reality is that there are latent psychic energies in the world around you, that you run into on a daily basis. Some of them are created by your coworkers, others were created by beings who have passed on from this world. Some of them are even created by animals, or subtler beings. These energies can hurt you if you ignore them, or interact with them unconsciously — but if you intentionally show them kindness and compassion, pet them, even feed them with the blessing of a legitimate spiritual lineage, they'll protect you (and everyone else) in turn. You think you're walking to work but you're actually wrestling through an invisible crowd. This is especially relevant if you're trans, and once you have some legitimate practices in your back pocket, the difference can feel almost miraculous.</div>
        <div style={{marginBottom:6}}>Find someone whose yoga has clearly made them wise, grounded, and compassionate — not someone who dabbles, but someone who takes it seriously every single day. Learn what they do. What you do daily needs to be deep enough and broad enough to address the full range of what comes up: emotional storms, physical tension, old trauma surfacing, days when nothing makes sense. A shallow approach won't hold you through this.</div>
        <div style={{marginBottom:6}}>A serious daily yoga practice protects your nervous system through the fluctuations. It slowly heals what chronic stress has done to your body. It keeps you steady when the hormones make everything feel like too much.</div>
        <div style={{marginBottom:6}}>This is especially important if you carry trauma. The turbulence of cycling will surface things. A body practice gives you somewhere to put that energy besides spiraling. It's the difference between this working and this breaking you.</div>
        <div style={{fontSize:Math.min(10,window.innerWidth/62),color:sub,fontStyle:"italic"}}>tap × above to close</div>
      </div></div>
      <div><strong>Liability.</strong> Use at your own risk. No warranties.</div>
      <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${dark?"rgba(244,114,182,.15)":"rgba(244,114,182,.2)"}`,color:dark?"#c084fc":"#7c3aed",fontSize:Math.min(11,window.innerWidth/58)}}>The app works fully offline once loaded.</div>
    </div>}
    {panelTab==="info"&&<div onTouchMove={e=>e.stopPropagation()} style={{padding:"14px 16px",fontSize:Math.min(13,Math.max(11,window.innerWidth/32)),color:dark?"#c4b5fd":"#5b21b6",lineHeight:1.55,maxWidth:700,margin:"0 auto",maxHeight:"55vh",overflowY:"auto",WebkitOverflowScrolling:"touch",cursor:"default"}} onClick={e=>e.stopPropagation()}>
      <div style={{marginBottom:8}}><strong>This app uses additive synthesis to model blood levels.</strong> Each medication produces a curve over time after a dose — rising, peaking, decaying. The app sums those curves day by day to estimate your total blood level. If one dose contributes 10 pg/mL on a given day and another contributes 11, the displayed total is 21. That's the whole math.</div>
      <svg viewBox="0 0 660 256" style={{width:"100%",height:"auto",display:"block",margin:"4px 0 12px",maxWidth:560}} xmlns="http://www.w3.org/2000/svg" aria-label="Illustration: two identical sine waves added together produce a wave twice as tall">
        <line x1="40" y1="40" x2="640" y2="40" stroke={dark?"rgba(196,181,253,0.18)":"rgba(124,58,237,0.18)"} strokeWidth="0.5" strokeDasharray="2,3"/>
        <line x1="40" y1="100" x2="640" y2="100" stroke={dark?"rgba(196,181,253,0.18)":"rgba(124,58,237,0.18)"} strokeWidth="0.5" strokeDasharray="2,3"/>
        <line x1="40" y1="200" x2="640" y2="200" stroke={dark?"rgba(196,181,253,0.18)":"rgba(124,58,237,0.18)"} strokeWidth="0.5" strokeDasharray="2,3"/>
        <polyline fill="none" stroke="#f472b6" strokeWidth="2" opacity="0.85" points="60,40.0 67,35.7 74,31.6 81,27.8 88,24.4 95,21.7 102,19.7 109,18.4 116,18.0 123,18.4 130,19.7 137,21.7 144,24.4 151,27.8 158,31.6 165,35.7 172,40.0 179,44.3 186,48.4 193,52.2 200,55.6 207,58.3 214,60.3 221,61.6 228,62.0 235,61.6 242,60.3 249,58.3 256,55.6 263,52.2 270,48.4 277,44.3 284,40.0 291,35.7 298,31.6 305,27.8 312,24.4 319,21.7 326,19.7 333,18.4 340,18.0 347,18.4 354,19.7 361,21.7 368,24.4 375,27.8 382,31.6 389,35.7 396,40.0 403,44.3 410,48.4 417,52.2 424,55.6 431,58.3 438,60.3 445,61.6 452,62.0 459,61.6 466,60.3 473,58.3 480,55.6 487,52.2 494,48.4 501,44.3 508,40.0 515,35.7 522,31.6 529,27.8 536,24.4 543,21.7 550,19.7 557,18.4 564,18.0 571,18.4 578,19.7 585,21.7 592,24.4 599,27.8 606,31.6 613,35.7 620,40.0"/>
        <text x="50" y="44" textAnchor="end" fill="#f472b6" fontSize="11" fontFamily="sans-serif">A</text>
        <polyline fill="none" stroke="#a855f7" strokeWidth="2" opacity="0.85" points="60,100.0 67,95.7 74,91.6 81,87.8 88,84.4 95,81.7 102,79.7 109,78.4 116,78.0 123,78.4 130,79.7 137,81.7 144,84.4 151,87.8 158,91.6 165,95.7 172,100.0 179,104.3 186,108.4 193,112.2 200,115.6 207,118.3 214,120.3 221,121.6 228,122.0 235,121.6 242,120.3 249,118.3 256,115.6 263,112.2 270,108.4 277,104.3 284,100.0 291,95.7 298,91.6 305,87.8 312,84.4 319,81.7 326,79.7 333,78.4 340,78.0 347,78.4 354,79.7 361,81.7 368,84.4 375,87.8 382,91.6 389,95.7 396,100.0 403,104.3 410,108.4 417,112.2 424,115.6 431,118.3 438,120.3 445,121.6 452,122.0 459,121.6 466,120.3 473,118.3 480,115.6 487,112.2 494,108.4 501,104.3 508,100.0 515,95.7 522,91.6 529,87.8 536,84.4 543,81.7 550,79.7 557,78.4 564,78.0 571,78.4 578,79.7 585,81.7 592,84.4 599,87.8 606,91.6 613,95.7 620,100.0"/>
        <text x="50" y="104" textAnchor="end" fill="#a855f7" fontSize="11" fontFamily="sans-serif">B</text>
        <text x="22" y="76" fill={dark?"#c4b5fd":"#7c3aed"} fontSize="20" fontFamily="sans-serif" opacity="0.7" fontWeight="500">+</text>
        <text x="22" y="156" fill={dark?"#c4b5fd":"#7c3aed"} fontSize="20" fontFamily="sans-serif" opacity="0.7" fontWeight="500">=</text>
        <polyline fill="none" stroke="#ec4899" strokeWidth="2.5" opacity="0.95" points="60,200.0 67,191.4 74,183.2 81,175.6 88,168.9 95,163.4 102,159.3 109,156.8 116,156.0 123,156.8 130,159.3 137,163.4 144,168.9 151,175.6 158,183.2 165,191.4 172,200.0 179,208.6 186,216.8 193,224.4 200,231.1 207,236.6 214,240.7 221,243.2 228,244.0 235,243.2 242,240.7 249,236.6 256,231.1 263,224.4 270,216.8 277,208.6 284,200.0 291,191.4 298,183.2 305,175.6 312,168.9 319,163.4 326,159.3 333,156.8 340,156.0 347,156.8 354,159.3 361,163.4 368,168.9 375,175.6 382,183.2 389,191.4 396,200.0 403,208.6 410,216.8 417,224.4 424,231.1 431,236.6 438,240.7 445,243.2 452,244.0 459,243.2 466,240.7 473,236.6 480,231.1 487,224.4 494,216.8 501,208.6 508,200.0 515,191.4 522,183.2 529,175.6 536,168.9 543,163.4 550,159.3 557,156.8 564,156.0 571,156.8 578,159.3 585,163.4 592,168.9 599,175.6 606,183.2 613,191.4 620,200.0"/>
        <text x="50" y="204" textAnchor="end" fill="#ec4899" fontSize="11" fontFamily="sans-serif">A+B</text>
      </svg>
      <div style={{marginBottom:8}}><strong>This is a sketchpad, not a meta-analysis.</strong> The app is not a precise synthesis of thousands of studies. It's a tool that lets you draw the rise-peak-decay shape of how a medication behaves in <em>your</em> blood, then stack doses on top of that shape to get a rough picture. If a medication affects you uniquely — different absorption, different clearance — you modify the waveform yourself to match what your bloodwork shows. What you see on the chart is conjecture. Treat it as a sketch.</div>
      <div style={{marginBottom:8}}><strong>This only works for medications with measurable, predictable blood levels.</strong> If a substance doesn't show up in standard bloodwork, this app can't model it. Drugs that act locally (topical creams that don't reach systemic circulation), drugs whose effects come from receptor binding rather than serum concentration, and anything where serum level doesn't correlate with effect — those won't be meaningfully captured. Some medications do show up in bloodwork but get processed unpredictably by the liver, so levels swing in ways the app can't anticipate from a fixed waveform. If you've had a lot of blood tests and consulted with a doctor, you'll know whether your levels are steady enough that this kind of model is useful for you.</div>
      <div style={{marginBottom:8}}><strong>The app can model HRT.</strong> Estradiol (oils, patches), progesterone (rectal, vaginal), testosterone (multiple esters and routes), antiandrogens (spironolactone, bicalutamide, cyproterone, GnRH agonists). Each comes with editable blood level curves you can adjust to match your own bloodwork. If you are not getting blood tests of your peak, midpoint, and trough, what the app shows is pure conjecture — every body is unique, and you have to work with a doctor.</div>
      <div style={{marginBottom:8}}><strong>The app can model cycling.</strong> You can match HRT dosages to natal female or male hormone cycles. By default, your cycle aligns to the moon — see the reference charts on the modeler tab. The cycle anchor and ovulation day are both adjustable.</div>
      <div style={{marginBottom:8}}><strong>The app can model hormone suppression.</strong> When one hormone suppresses another (T blocking E2/P4 in an AFAB baseline, or injectable E2 suppressing T in an AMAB baseline), the suppression curve and threshold are configurable. See the <em>ambient hormones</em> and the <em>suppression</em> controls on the modeler tab.</div>
      <div style={{marginBottom:8}}><strong>The app can model anything you can sketch.</strong> The custom medication slot lets you draw arbitrary blood level curves with a customizable rise and fall shape. You can model less commonly tracked metabolites like estrone, or any substance with a blood level over time graph. The app does not know what's "valid" — it will sum whatever you give it.</div>
      <div style={{fontSize:Math.min(10,window.innerWidth/62),color:sub,fontStyle:"italic"}}>tap "▼ close" above to dismiss</div>
    </div>}
  </div>}
  </div></div>;
}
