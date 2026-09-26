
/* ============================================================
   GOVBRIDGE — APPLICATION LOGIC
   ============================================================ */

/* ---------------- Utility helpers ---------------- */
const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
const uid = (p='id')=> p+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const fmtDate = (iso)=>{ if(!iso) return '—'; const d=new Date(iso); return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); };
const daysUntil = (iso)=>{ const diff = new Date(iso) - new Date(); return Math.ceil(diff/(1000*60*60*24)); };
const inr = (n)=> '₹'+Number(n).toLocaleString('en-IN');
const escapeHtml = (s='')=> String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(msg,type='info'){
  const host = $('#toastHost');
  const el = document.createElement('div');
  el.className = 'toast '+type;
  const icons = {success:'✓',error:'!',info:'ℹ'};
  el.innerHTML = `<span>${icons[type]||''}</span><span>${escapeHtml(msg)}</span>`;
  host.appendChild(el);
  setTimeout(()=>{ el.style.transition='all .25s ease'; el.style.opacity='0'; el.style.transform='translateX(20px)'; setTimeout(()=>el.remove(),260); }, 3600);
}

function openModal(html){
  $('#modalBox').innerHTML = html;
  $('#modalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeModal(){
  $('#modalOverlay').classList.remove('open');
  document.body.style.overflow='';
}

function toggleMobileNav(){ $('#navLinks').classList.toggle('open'); }
function closeMobileNav(){ $('#navLinks').classList.remove('open'); }
function goToLandingSection(event, sectionId){
  event?.preventDefault();
  closeMobileNav();
  if(document.body.dataset.interface !== 'landing'){
    location.href = `index.html#${sectionId}`;
    return;
  }
  const section = document.getElementById(sectionId);
  if(!section) return;
  history.replaceState(null, '', `${location.pathname}${location.search}#${sectionId}`);
  section.scrollIntoView({behavior:'smooth', block:'start'});
}

/* ============================================================
   GOVBRIDGE — EVIDENCE & CAPABILITY EXTENSIONS
   Extends the existing data model, components and workflows.
   Nothing here replaces existing behaviour — it only adds to it.
   ============================================================ */

/* ---------------- Capability model ---------------- */
/* Capability dimensions used for matching. Deliberately excludes
   company age, years in business, employee count and "government
   experience" as standalone gates — those are context, not capability. */
const CAP_DIMS = [
  {key:'technology',   label:'Technology Fit',        weight:18},
  {key:'team',         label:'Team Capability',       weight:14},
  {key:'prototype',    label:'Prototype Readiness',   weight:16},
  {key:'testing',      label:'Testing Evidence',      weight:14},
  {key:'relevantWork', label:'Relevant Work',         weight:12},
  {key:'implementation',label:'Implementation Capacity',weight:12},
  {key:'finops',       label:'Financial / Operational Capacity', weight:8},
  {key:'security',     label:'Security / Compliance', weight:6}
];
/* Full capability profile fields (section 6) */
const CAP_FIELDS = [
  {key:'technology',    label:'Technology'},
  {key:'team',          label:'Team Capability'},
  {key:'prototype',     label:'Prototype Readiness'},
  {key:'testing',       label:'Testing / Validation'},
  {key:'relevantWork',  label:'Relevant Work'},
  {key:'implementation',label:'Implementation Capacity'},
  {key:'financial',     label:'Financial Capacity'},
  {key:'operational',   label:'Operational Capacity'},
  {key:'security',      label:'Security / Compliance'},
  {key:'domain',        label:'Domain Knowledge'}
];
const EVIDENCE_TYPES = ['Prototype','Testing','Deployment','Pilot','Security','Compliance','Outcome','Document','Field Data','Reference'];
const PILOT_STAGES = ['Pilot Started','Data Collection','Interim Review','Final Measurement','Verification','Outcome Decision'];
const GOV_WORKFLOW = ['Define Problem','AI Builder','Publish','Discover','Capability','Evaluate','Pilot','Measure','Verify','Procure','Scale'];
const STARTUP_WORKFLOW = ['Browse','Understand','Eligibility','Criteria','Submit','Evidence','Evaluation','Pilot','Pilot Evidence','Outcome','Procurement','Scale'];
const OUTCOME_STATUSES = ['Pending Verification','Successful','Partially Successful','Unsuccessful','Terminated','Not Recommended for Scale'];

/* Deterministic pseudo-random so demo numbers never jump around between renders */
function hashSeed(str){ let h=2166136261; for(let i=0;i<String(str).length;i++){ h^=String(str).charCodeAt(i); h=Math.imul(h,16777619); } return Math.abs(h); }
function seededPct(seed, min, max){ return min + (hashSeed(seed) % (max-min+1)); }
const clampPct = (n)=> Math.max(0, Math.min(100, Math.round(n)));

/* ---------------- Default capability profiles / KPIs ---------------- */
const CAPABILITY_SEEDS = {
  su_1:{
    technology:{score:92, note:'Edge computer-vision models running on low-cost Android hardware; no cloud dependency in the field.'},
    team:{score:88, note:'6 ML engineers, 2 agronomists and 3 field-deployment staff; two members previously built state agri-extension tooling.'},
    prototype:{score:90, note:'Working prototype in field use — crop-health scanner deployed with 3 state agriculture departments.'},
    testing:{score:86, note:'Model validated on 42,000 labelled field images; 91% top-1 accuracy on 6 target diseases.'},
    relevantWork:{score:84, note:'Punjab Agriculture Department pilot (2023) covering 2 tehsils and 11,000 farmers.'},
    implementation:{score:82, note:'Field-training playbook for agri-extension officers; 3-week district onboarding cycle.'},
    financial:{score:78, note:'Series A funded; 14 months runway; audited statements available.'},
    operational:{score:80, note:'Regional support team in Punjab and Haryana with 48-hour on-site SLA.'},
    security:{score:81, note:'ISO 27001 certified; farmer data stored in-country with consent capture.'},
    domain:{score:89, note:'Agronomy advisory reviewed by PAU-affiliated plant pathologists.'}
  },
  su_2:{
    technology:{score:87, note:'Offline-first mobile triage with on-device symptom model; syncs when connectivity returns.'},
    team:{score:90, note:'Clinical lead is a practising physician; 9 engineers with 2 having built NHM-integrated systems.'},
    prototype:{score:84, note:'ASHA companion app live with health workers across 3 states.'},
    testing:{score:88, note:'Triage concordance study against physician assessment on 1,900 cases; 87% agreement.'},
    relevantWork:{score:83, note:'NHM pilot in Odisha covering 240 ASHA workers.'},
    implementation:{score:79, note:'Training-of-trainers model; block-level rollout in 4 weeks.'},
    financial:{score:66, note:'Seed funded; 9 months runway; would need milestone-linked payments for large rollouts.'},
    operational:{score:76, note:'Remote support desk in Odia and Hindi; field supervisor per district.'},
    security:{score:85, note:'CDSCO Class A registered; patient data encrypted at rest, consent-based sharing.'},
    domain:{score:91, note:'Clinical protocols mapped to national ASHA guidelines and IMNCI.'}
  },
  su_3:{
    technology:{score:85, note:'Ultrasonic fill-level sensors plus route-optimisation engine; LoRaWAN backhaul for low-cost coverage.'},
    team:{score:76, note:'Embedded hardware team of 5 and 4 backend engineers; municipal operations advisor on retainer.'},
    prototype:{score:88, note:'Smart-bin sensor network already installed and reporting for 2 municipal corporations.'},
    testing:{score:74, note:'Sensor accuracy bench-tested at 94%; field accuracy drops to 86% in monsoon conditions.'},
    relevantWork:{score:80, note:'Pune Municipal Corporation trial across 180 bins.'},
    implementation:{score:72, note:'Installation crew model; depends on municipal staff for bin access scheduling.'},
    financial:{score:62, note:'Pre-Series A; limited working capital for large upfront hardware purchase.'},
    operational:{score:70, note:'Maintenance visits scheduled fortnightly; spare-parts lead time of 3 weeks.'},
    security:{score:68, note:'Data hosted in-country; formal security audit not yet completed.'},
    domain:{score:82, note:'Familiar with ULB ward-level waste operations and route planning constraints.'}
  }
};

const EVIDENCE_SEEDS = {
  su_1:[
    {type:'Prototype', title:'CropScan field prototype v4', description:'Android handheld scanner used by extension officers, working offline.', status:'Available', date:-240, verified:true},
    {type:'Testing', title:'Accuracy validation report', description:'91% top-1 accuracy across 42,000 labelled images covering 6 diseases.', status:'Available', date:-180, verified:true},
    {type:'Deployment', title:'Punjab Agriculture Dept. deployment', description:'Deployed across 2 tehsils reaching 11,000 farmers.', status:'Available', date:-150, verified:true},
    {type:'Security', title:'ISO 27001 certificate', description:'Information security management certification, valid through 2027.', status:'Available', date:-300, verified:true},
    {type:'Outcome', title:'Yield-loss reduction study', description:'Independent review recorded 17% reduction in late-detection yield loss.', status:'Available', date:-90, verified:false}
  ],
  su_2:[
    {type:'Prototype', title:'ASHA triage companion build 2.3', description:'Offline-first Android app in active use by health workers.', status:'Available', date:-210, verified:true},
    {type:'Testing', title:'Clinical concordance study', description:'87% agreement with physician assessment across 1,900 cases.', status:'Available', date:-120, verified:true},
    {type:'Compliance', title:'CDSCO Class A registration', description:'Registered medical software category A.', status:'Available', date:-260, verified:true},
    {type:'Pilot', title:'NHM Odisha pilot summary', description:'240 ASHA workers across 12 blocks, 6-month pilot.', status:'Available', date:-100, verified:false}
  ],
  su_3:[
    {type:'Prototype', title:'BinSense sensor unit v2', description:'Ultrasonic fill sensor with 14-month battery life.', status:'Available', date:-200, verified:true},
    {type:'Deployment', title:'Pune Municipal Corporation trial', description:'180 bins instrumented across 3 wards.', status:'Available', date:-160, verified:true},
    {type:'Testing', title:'Monsoon accuracy note', description:'Field accuracy measured at 86% during heavy rainfall, below the 94% bench figure.', status:'Available', date:-60, verified:true},
    {type:'Security', title:'Security audit', description:'Third-party security audit scheduled, not yet completed.', status:'Pending', date:-20, verified:false}
  ]
};

const KPI_TEMPLATES = {
  'Smart Cities':[
    {name:'Bin overflow complaints per month', unit:'complaints', baseline:640, target:250, dir:'down'},
    {name:'Average collection response time', unit:'hours', baseline:48, target:24, dir:'down'},
    {name:'Route fuel consumption', unit:'litres/day', baseline:920, target:700, dir:'down'}
  ],
  'Healthcare':[
    {name:'Average time to referral decision', unit:'hours', baseline:36, target:12, dir:'down'},
    {name:'Triage concordance with physician', unit:'%', baseline:62, target:85, dir:'up'},
    {name:'Cases handled per ASHA worker per week', unit:'cases', baseline:18, target:28, dir:'up'}
  ],
  'Agriculture':[
    {name:'Disease detection lead time', unit:'days', baseline:11, target:3, dir:'down'},
    {name:'Advisory reach among farmers', unit:'%', baseline:24, target:70, dir:'up'},
    {name:'Reported yield loss', unit:'%', baseline:18, target:9, dir:'down'}
  ],
  'Education':[
    {name:'Accessible courseware coverage', unit:'%', baseline:12, target:60, dir:'up'},
    {name:'Student engagement sessions per week', unit:'sessions', baseline:2, target:5, dir:'up'},
    {name:'Teacher support requests unresolved', unit:'requests', baseline:140, target:50, dir:'down'}
  ],
  'Transportation':[
    {name:'Average junction wait time', unit:'seconds', baseline:96, target:60, dir:'down'},
    {name:'Peak-hour queue length', unit:'metres', baseline:310, target:180, dir:'down'},
    {name:'Signal uptime', unit:'%', baseline:88, target:98, dir:'up'}
  ],
  'Governance':[
    {name:'Grievance misrouting rate', unit:'%', baseline:31, target:8, dir:'down'},
    {name:'Average resolution time', unit:'days', baseline:9, target:4, dir:'down'},
    {name:'SLA compliance', unit:'%', baseline:64, target:90, dir:'up'}
  ],
  _default:[
    {name:'Service response time', unit:'hours', baseline:48, target:24, dir:'down'},
    {name:'Citizen complaints per month', unit:'complaints', baseline:400, target:180, dir:'down'},
    {name:'Process compliance', unit:'%', baseline:65, target:90, dir:'up'}
  ]
};
function kpiTemplate(category){ return JSON.parse(JSON.stringify(KPI_TEMPLATES[category] || KPI_TEMPLATES._default)); }

const CRITERIA_TEMPLATES = {
  'Smart Cities':[
    {name:'Detection Accuracy', weight:25, evidence:'Field accuracy report with sample size'},
    {name:'Implementation Readiness', weight:20, evidence:'Deployment plan and installed reference site'},
    {name:'Expected Outcome', weight:25, evidence:'Baseline vs target working with measurement method'},
    {name:'Operational Sustainability', weight:15, evidence:'Maintenance model and spare-parts plan'},
    {name:'Security & Data Handling', weight:15, evidence:'Data-handling note or security audit'}
  ],
  'Healthcare':[
    {name:'Clinical Workflow Fit', weight:25, evidence:'Workflow mapping with frontline health staff'},
    {name:'Accuracy', weight:25, evidence:'Validation study against clinician assessment'},
    {name:'Privacy & Consent', weight:20, evidence:'Data-protection and consent documentation'},
    {name:'Offline Capability', weight:15, evidence:'Offline test results in low-connectivity conditions'},
    {name:'Adoption', weight:15, evidence:'Training model and prior adoption data'}
  ],
  'Transportation':[
    {name:'Safety Improvement', weight:25, evidence:'Before/after safety measurement'},
    {name:'Detection Accuracy', weight:20, evidence:'Accuracy testing under live traffic conditions'},
    {name:'Response Time', weight:20, evidence:'Signal adaptation latency measurements'},
    {name:'Scalability', weight:20, evidence:'Plan for scaling from pilot junctions to city-wide'},
    {name:'Implementation Readiness', weight:15, evidence:'Installation and integration plan'}
  ],
  _default:[
    {name:'Technical Feasibility', weight:20, evidence:'Working prototype or technical validation'},
    {name:'Pilot Readiness', weight:20, evidence:'Pilot plan with measurable milestones'},
    {name:'Expected Outcome', weight:25, evidence:'Baseline, target and measurement method'},
    {name:'Security & Compliance', weight:15, evidence:'Security or compliance documentation'},
    {name:'Implementation Capacity', weight:20, evidence:'Team, support model and rollout capacity'}
  ]
};
function criteriaTemplate(category){ return JSON.parse(JSON.stringify(CRITERIA_TEMPLATES[category] || CRITERIA_TEMPLATES._default)); }

/* ---------------- Migration: extend saved data, never replace it ---------------- */
function migrateDB(db){
  let changed = false;
  const iso = (d)=> new Date(Date.now() + d*86400000).toISOString();

  db.challenges = db.challenges || [];
  db.startups = db.startups || [];
  db.proposals = db.proposals || [];
  db.notifications = db.notifications || [];
  db.activity = db.activity || [];

  db.challenges.forEach(c=>{
    if(!c.kpis){ c.kpis = kpiTemplate(c.category); changed = true; }
    if(!c.capabilityCriteria){ c.capabilityCriteria = criteriaTemplate(c.category); changed = true; }
    if(c.baseline===undefined){
      const k = c.kpis[0]||{};
      c.baseline = k.name ? `${k.name}: ${k.baseline} ${k.unit}` : '';
      changed = true;
    }
    if(c.target===undefined){
      const k = c.kpis[0]||{};
      c.target = k.name ? `${k.name}: ${k.target} ${k.unit}` : '';
      changed = true;
    }
    if(!c.evidenceRequirements){
      c.evidenceRequirements = c.capabilityCriteria.map(x=>x.evidence).filter(Boolean);
      changed = true;
    }
    if(!c.problemImages){ c.problemImages = []; changed = true; }
    if(!c.aiDraft){ c.aiDraft = null; changed = true; }
    if(!c.auditTrail){
      c.auditTrail = [{id:uid('au'), text:`Challenge "${c.title}" created.`, actor:'Government', time:c.postedOn||iso(-20)}];
      if(c.status==='Open') c.auditTrail.push({id:uid('au'), text:'Challenge published to the startup ecosystem.', actor:'Government', time:c.postedOn||iso(-20)});
      changed = true;
    }
  });

  db.startups.forEach(s=>{
    if(!s.capability){
      s.capability = CAPABILITY_SEEDS[s.id] || defaultCapability(s);
      changed = true;
    }
    if(!s.evidence){
      s.evidence = (EVIDENCE_SEEDS[s.id]||[]).map(e=>({
        id:uid('ev'), type:e.type, title:e.title, description:e.description,
        status:e.status, date:iso(e.date), verified:e.verified
      }));
      changed = true;
    }
    if(!s.testing){ s.testing = s.capability.testing?.note || ''; changed = true; }
    if(!s.team){ s.team = `Team of ${s.teamSize||'—'}. ${s.capability.team?.note||''}`.trim(); changed = true; }
    if(!s.financialCapacity){ s.financialCapacity = s.capability.financial?.note || ''; changed = true; }
    if(!s.operationalCapacity){ s.operationalCapacity = s.capability.operational?.note || ''; changed = true; }
    if(!s.relevantWork){ s.relevantWork = s.capability.relevantWork?.note || s.prevProjects || ''; changed = true; }
    if(!s.securityCompliance){ s.securityCompliance = s.capability.security?.note || s.certifications || ''; changed = true; }
  });

  db.proposals.forEach(p=>{
    if(!p.evidence){ p.evidence = []; changed = true; }
    if(!p.evaluationEvidence){ p.evaluationEvidence = {}; changed = true; }
    if(!p.evalScores){ p.evalScores = {}; changed = true; }
    if(!p.auditTrail){
      p.auditTrail = [{id:uid('au'), text:`Solution "${p.solutionName}" submitted.`, actor:p.startupName, time:p.submittedOn||iso(-10)}];
      changed = true;
    }
    if(['Pilot','Procurement','Scaled'].includes(p.status) && !p.pilot){
      p.pilot = defaultPilot(p, db); changed = true;
    }
  });

  // keep displayed proposal counts consistent with actual proposals
  db.challenges.forEach(c=>{
    const actual = db.proposals.filter(p=>p.challengeId===c.id).length;
    if((c.proposals||0) < actual){ c.proposals = actual; changed = true; }
  });

  if(!db.schemaVersion || db.schemaVersion < 2){ db.schemaVersion = 2; changed = true; }
  return changed;
}

function defaultCapability(s){
  const cap = {};
  CAP_FIELDS.forEach(f=>{
    cap[f.key] = {score: seededPct((s.id||'x')+f.key, 58, 86), note:''};
  });
  return cap;
}

function defaultPilot(p, db){
  const ch = (db && db.challenges) ? db.challenges.find(c=>c.id===p.challengeId) : null;
  const kpis = (ch?.kpis || kpiTemplate(ch?.category)).map(k=>({
    id:uid('kpi'), name:k.name, unit:k.unit, baseline:k.baseline, target:k.target, dir:k.dir||'down',
    actual:null, evidence:'', verified:false
  }));
  return {
    objective: ch ? `Demonstrate measurable improvement against the baseline for: ${ch.title}.` : 'Demonstrate measurable improvement against the agreed baseline.',
    baseline: ch?.baseline || '',
    target: ch?.target || '',
    startDate: new Date().toISOString(),
    durationWeeks: 16,
    stage: 'Pilot Started',
    kpis,
    milestones: [
      {id:uid('ms'), name:'Deployment complete at pilot sites', done:false},
      {id:uid('ms'), name:'Baseline data confirmed', done:false},
      {id:uid('ms'), name:'Interim review with department', done:false},
      {id:uid('ms'), name:'Final measurement submitted', done:false}
    ],
    evidence: [],
    verification: {status:'Pending Verification', by:'', date:'', notes:''},
    outcomeStatus: 'Pending Verification',
    failureReason: '', lessonsLearned: '',
    issues: {technical:'', operational:'', cost:'', adoption:''},
    recommendation: '',
    auditTrail: [{id:uid('au'), text:'Pilot created.', actor:'Government', time:new Date().toISOString()}]
  };
}

/* ---------------- Seeded demo proposals & pilots ---------------- */
function seedProposals(iso){
  const mk = (o)=> Object.assign({evalScores:{}, evaluationEvidence:{}, evidence:[], auditTrail:[]}, o);

  const p1 = mk({
    id:'pr_1', challengeId:'ch_1', startupId:'su_3', startupName:'UrbanPulse Systems',
    solutionName:'BinSense Fill-Level Network', problem:'Bins overflow unpredictably because collection routes are fixed and the control room has no live visibility of fill levels.',
    description:'Ultrasonic fill-level sensors on 400 bins feeding a dispatcher dashboard, with daily route re-sequencing based on live fill data.',
    usp:'Low-cost LoRaWAN sensors with 14-month battery life, installable without modifying existing bins.',
    techStack:'LoRaWAN sensors, Node.js, PostgreSQL, route-optimisation engine', estCost:3200000,
    implementationPlan:'Ward-by-ward installation over 6 weeks, followed by 10 weeks of live operation with the municipal dispatch team.',
    expectedImpact:'Fewer overflow complaints and shorter collection response times.',
    timeline:'16-week pilot across 3 wards', prevProjects:'Pune Municipal Corporation trial across 180 bins',
    teamDetails:'5 embedded hardware engineers, 4 backend engineers, municipal operations advisor.',
    status:'Scaled', submittedOn: iso(-120), evalTotal:29,
    evalComments:'Strong field evidence from the Pune trial. Monsoon accuracy gap noted and addressed in the pilot plan.'
  });
  p1.evidence = [
    {id:uid('ev'), type:'Prototype', title:'BinSense sensor unit v2', description:'Ultrasonic fill sensor, 14-month battery life.', status:'Available', date:iso(-200), verified:true},
    {id:uid('ev'), type:'Deployment', title:'Pune trial data export', description:'6 months of fill-level readings from 180 bins.', status:'Available', date:iso(-150), verified:true},
    {id:uid('ev'), type:'Pilot', title:'Pilot final measurement report', description:'Ward-level before/after comparison with raw data appendix.', status:'Available', date:iso(-20), verified:true}
  ];
  p1.pilot = {
    objective:'Reduce bin overflow complaints and collection response time across 3 pilot wards using live fill-level data.',
    baseline:'640 overflow complaints/month; 48-hour average response time; 920 litres/day route fuel.',
    target:'Under 250 complaints/month; 24-hour response; under 700 litres/day fuel.',
    startDate: iso(-112), durationWeeks:16, stage:'Outcome Decision',
    kpis:[
      {id:uid('kpi'), name:'Bin overflow complaints per month', unit:'complaints', baseline:640, target:250, dir:'down', actual:214, evidence:'Municipal complaint register export, wards 3/7/11, final pilot month.', verified:true},
      {id:uid('kpi'), name:'Average collection response time', unit:'hours', baseline:48, target:24, dir:'down', actual:18, evidence:'Dispatch log timestamps across 1,240 collection events.', verified:true},
      {id:uid('kpi'), name:'Route fuel consumption', unit:'litres/day', baseline:920, target:700, dir:'down', actual:735, evidence:'Fuel card reconciliation for pilot ward vehicles.', verified:true}
    ],
    milestones:[
      {id:uid('ms'), name:'400 sensors installed across 3 wards', done:true},
      {id:uid('ms'), name:'Baseline data confirmed with ULB', done:true},
      {id:uid('ms'), name:'Interim review at week 8', done:true},
      {id:uid('ms'), name:'Final measurement submitted', done:true}
    ],
    evidence:[
      {id:uid('ev'), type:'Field Data', title:'Raw sensor readings (16 weeks)', description:'CSV export of all fill-level readings during the pilot window.', status:'Available', date:iso(-24), verified:true},
      {id:uid('ev'), type:'Outcome', title:'Independent verification note', description:'Municipal internal audit confirmed complaint-register figures.', status:'Available', date:iso(-18), verified:true}
    ],
    verification:{status:'Successful', by:'Urban Development Dept. — Verification Cell', date: iso(-16), notes:'All three KPIs met or exceeded target. Complaint-register figures independently reconciled against the dispatch log.'},
    outcomeStatus:'Successful', failureReason:'', lessonsLearned:'Monsoon-season accuracy dip was handled by a weekly manual spot-check on 5% of bins; this should be written into the scale contract.',
    issues:{technical:'', operational:'', cost:'', adoption:''},
    recommendation:'Recommended for scale across all 12 wards.',
    auditTrail:[
      {id:uid('au'), text:'Pilot started across 3 wards.', actor:'Government', time: iso(-112)},
      {id:uid('au'), text:'Interim review completed at week 8.', actor:'Evaluation Panel A', time: iso(-56)},
      {id:uid('au'), text:'Final measurement submitted by startup.', actor:'UrbanPulse Systems', time: iso(-24)},
      {id:uid('au'), text:'Outcome verified as Successful.', actor:'Verification Cell', time: iso(-16)}
    ]
  };
  p1.auditTrail = [
    {id:uid('au'), text:'Solution "BinSense Fill-Level Network" submitted.', actor:'UrbanPulse Systems', time: iso(-120)},
    {id:uid('au'), text:'Evaluation completed with a score of 29/35.', actor:'Evaluation Panel A', time: iso(-116)},
    {id:uid('au'), text:'Approved for controlled pilot.', actor:'Government', time: iso(-112)},
    {id:uid('au'), text:'Outcome verified; procurement initiated.', actor:'Government', time: iso(-14)},
    {id:uid('au'), text:'Solution scaled to city-wide deployment.', actor:'Government', time: iso(-6)}
  ];

  const p2 = mk({
    id:'pr_2', challengeId:'ch_2', startupId:'su_2', startupName:'MedReach AI',
    solutionName:'ASHA Triage Companion', problem:'ASHA workers have no decision-support tool, so referral decisions are delayed and inconsistent across blocks.',
    description:'Offline-first Android triage companion with an on-device symptom model, escalation workflow and teleconsultation fallback when connectivity allows.',
    usp:'Runs fully offline on entry-level devices and syncs opportunistically; clinical protocols mapped to national ASHA guidelines.',
    techStack:'Android (Kotlin), on-device TensorFlow Lite, FHIR-compatible sync layer', estCost:4100000,
    implementationPlan:'Training-of-trainers across 6 blocks, then 4-month supervised rollout with weekly clinical review.',
    expectedImpact:'Faster referral decisions and better concordance with physician assessment.',
    timeline:'4-month pilot in 2 blocks', prevProjects:'NHM Odisha pilot with 240 ASHA workers',
    teamDetails:'Clinical lead (practising physician), 9 engineers, 4 field trainers.',
    status:'Under Evaluation', submittedOn: iso(-9)
  });
  p2.evidence = [
    {id:uid('ev'), type:'Testing', title:'Clinical concordance study', description:'87% agreement with physician assessment across 1,900 cases.', status:'Available', date:iso(-120), verified:true},
    {id:uid('ev'), type:'Compliance', title:'CDSCO Class A registration', description:'Registered medical software category A.', status:'Available', date:iso(-260), verified:true},
    {id:uid('ev'), type:'Prototype', title:'Offline build 2.3', description:'Installable APK demonstrating full offline triage flow.', status:'Available', date:iso(-30), verified:false}
  ];
  p2.evalScores = {innovation:4, feasibility:4, compliance:4};
  p2.evaluationEvidence = {
    innovation:{evidence:'On-device triage without connectivity is materially different from the teleconsultation-only solutions received for this challenge.', type:'Prototype', reviewer:'Evaluation Panel B', time: iso(-6), comment:''},
    feasibility:{evidence:'Offline build 2.3 was installed and demonstrated on an entry-level device during the review session.', type:'Prototype', reviewer:'Evaluation Panel B', time: iso(-6), comment:'Works as described; sync tested on 2G.'},
    compliance:{evidence:'CDSCO Class A registration verified against the public registry.', type:'Compliance', reviewer:'Evaluation Panel B', time: iso(-5), comment:''}
  };
  p2.auditTrail = [
    {id:uid('au'), text:'Solution "ASHA Triage Companion" submitted.', actor:'MedReach AI', time: iso(-9)},
    {id:uid('au'), text:'Moved to evaluation.', actor:'Government', time: iso(-7)},
    {id:uid('au'), text:'Evidence reviewed for 3 criteria.', actor:'Evaluation Panel B', time: iso(-6)}
  ];

  const p3 = mk({
    id:'pr_3', challengeId:'ch_3', startupId:'su_1', startupName:'AgroVision Labs',
    solutionName:'CropScan Field AI', problem:'Farmers detect crop disease only after visible spread, because inspection depends on extension-officer visits.',
    description:'Phone-camera disease detection running on-device, with Punjabi-language advisory and escalation to the nearest agri-office.',
    usp:'Works offline on low-cost handsets; advisory reviewed by plant pathologists rather than generated automatically.',
    techStack:'Edge ML (TFLite), Android, Punjabi TTS, offline sync', estCost:2400000,
    implementationPlan:'Train 120 extension officers, deploy across 4 tehsils, weekly advisory review with the department.',
    expectedImpact:'Earlier detection and lower yield loss before the Rabi season.',
    timeline:'12-week pilot across 2 tehsils', prevProjects:'Punjab Agriculture Dept pilot (2023)',
    teamDetails:'6 ML engineers, 2 agronomists, 3 field-deployment staff.',
    status:'Pilot', submittedOn: iso(-40), evalTotal:31,
    evalComments:'Field evidence is strong and directly relevant. Approved for a controlled pilot ahead of Rabi.'
  });
  p3.evidence = [
    {id:uid('ev'), type:'Prototype', title:'CropScan field prototype v4', description:'Handheld scanner working offline in field conditions.', status:'Available', date:iso(-240), verified:true},
    {id:uid('ev'), type:'Testing', title:'Accuracy validation report', description:'91% top-1 accuracy on 42,000 labelled field images.', status:'Available', date:iso(-180), verified:true}
  ];
  p3.pilot = {
    objective:'Shorten disease detection lead time and widen advisory reach across 2 tehsils before the Rabi season.',
    baseline:'11-day detection lead time; 24% advisory reach; 18% reported yield loss.',
    target:'3-day lead time; 70% advisory reach; 9% reported yield loss.',
    startDate: iso(-28), durationWeeks:12, stage:'Data Collection',
    kpis:[
      {id:uid('kpi'), name:'Disease detection lead time', unit:'days', baseline:11, target:3, dir:'down', actual:null, evidence:'', verified:false},
      {id:uid('kpi'), name:'Advisory reach among farmers', unit:'%', baseline:24, target:70, dir:'up', actual:null, evidence:'', verified:false},
      {id:uid('kpi'), name:'Reported yield loss', unit:'%', baseline:18, target:9, dir:'down', actual:null, evidence:'', verified:false}
    ],
    milestones:[
      {id:uid('ms'), name:'120 extension officers trained', done:true},
      {id:uid('ms'), name:'Baseline data confirmed with department', done:true},
      {id:uid('ms'), name:'Interim review at week 6', done:false},
      {id:uid('ms'), name:'Final measurement submitted', done:false}
    ],
    evidence:[
      {id:uid('ev'), type:'Field Data', title:'Week 1–4 scan logs', description:'11,400 scans recorded across 2 tehsils with officer annotations.', status:'Available', date:iso(-7), verified:false}
    ],
    verification:{status:'Pending Verification', by:'', date:'', notes:''},
    outcomeStatus:'Pending Verification', failureReason:'', lessonsLearned:'',
    issues:{technical:'', operational:'', cost:'', adoption:''}, recommendation:'',
    auditTrail:[
      {id:uid('au'), text:'Pilot started across 2 tehsils.', actor:'Government', time: iso(-28)},
      {id:uid('au'), text:'Week 1–4 field data submitted.', actor:'AgroVision Labs', time: iso(-7)}
    ]
  };
  p3.auditTrail = [
    {id:uid('au'), text:'Solution "CropScan Field AI" submitted.', actor:'AgroVision Labs', time: iso(-40)},
    {id:uid('au'), text:'Evaluation completed with a score of 31/35.', actor:'Evaluation Panel A', time: iso(-32)},
    {id:uid('au'), text:'Approved for controlled pilot.', actor:'Government', time: iso(-28)}
  ];

  const p4 = mk({
    id:'pr_4', challengeId:'ch_5', startupId:'su_3', startupName:'UrbanPulse Systems',
    solutionName:'Adaptive Signal Controller', problem:'Fixed-timer signals cause avoidable congestion at high-traffic junctions with no live visibility for traffic police.',
    description:'Camera-fed adaptive signal timing at 5 junctions with a command-centre dashboard.',
    usp:'Reuses existing junction cameras rather than requiring new sensor hardware.',
    techStack:'Computer vision, edge controller, signal-controller integration', estCost:5600000,
    implementationPlan:'Retrofit 5 junctions, 6-month live operation with traffic police supervision.',
    expectedImpact:'Shorter junction wait times during peak hours.',
    timeline:'24-week pilot at 5 junctions', prevProjects:'Smart bin sensor deployment for 2 municipal corporations',
    teamDetails:'5 embedded engineers, 4 backend engineers.',
    status:'Pilot', submittedOn: iso(-190), evalTotal:24,
    evalComments:'Approved for pilot despite limited traffic-domain evidence, on the strength of the junction retrofit approach.'
  });
  p4.pilot = {
    objective:'Reduce peak-hour junction wait time at 5 retrofitted junctions.',
    baseline:'96-second average junction wait; 310m peak queue; 88% signal uptime.',
    target:'60-second wait; 180m queue; 98% uptime.',
    startDate: iso(-175), durationWeeks:24, stage:'Outcome Decision',
    kpis:[
      {id:uid('kpi'), name:'Average junction wait time', unit:'seconds', baseline:96, target:60, dir:'down', actual:88, evidence:'Signal controller logs across 5 junctions, weeks 14–24.', verified:true},
      {id:uid('kpi'), name:'Peak-hour queue length', unit:'metres', baseline:310, target:180, dir:'down', actual:288, evidence:'Camera-derived queue estimates, peak windows only.', verified:true},
      {id:uid('kpi'), name:'Signal uptime', unit:'%', baseline:88, target:98, dir:'up', actual:79, evidence:'Controller uptime monitoring; 41 unplanned outages recorded.', verified:true}
    ],
    milestones:[
      {id:uid('ms'), name:'5 junctions retrofitted', done:true},
      {id:uid('ms'), name:'Baseline traffic survey completed', done:true},
      {id:uid('ms'), name:'Interim review at week 12', done:true},
      {id:uid('ms'), name:'Final measurement submitted', done:true}
    ],
    evidence:[
      {id:uid('ev'), type:'Field Data', title:'Controller logs weeks 1–24', description:'Full signal timing and uptime logs for the pilot period.', status:'Available', date:iso(-20), verified:true},
      {id:uid('ev'), type:'Outcome', title:'Outage root-cause note', description:'Power fluctuation at 3 of 5 junctions caused repeated controller resets.', status:'Available', date:iso(-18), verified:true}
    ],
    verification:{status:'Unsuccessful', by:'Municipal Corporation — Traffic Engineering Cell', date: iso(-14), notes:'Wait time improved by 8% against a 38% target. Uptime fell below baseline. Outcome recorded as unsuccessful on measured evidence.'},
    outcomeStatus:'Unsuccessful',
    failureReason:'Camera-derived vehicle counts degraded at night and in rain, so the adaptive logic fell back to fixed timing for a large share of peak hours. Power instability at three junctions caused repeated controller resets.',
    lessonsLearned:'Junction retrofits need a power-conditioning assessment before selection, and night/low-visibility accuracy must be tested at the shortlisting stage rather than during the pilot.',
    issues:{
      technical:'Night and wet-weather detection accuracy fell to roughly 61%, below the level the adaptive logic requires.',
      operational:'41 unplanned outages; on-site response depended on a crew shared with the sensor business.',
      cost:'Power-conditioning hardware was not budgeted and would add an estimated ₹7.5L across 5 junctions.',
      adoption:'Traffic police reverted 2 junctions to manual control during festival weeks.'
    },
    recommendation:'Not recommended for scale in current form. A re-pilot would be reasonable after night-accuracy testing and a power-conditioning plan.',
    auditTrail:[
      {id:uid('au'), text:'Pilot started at 5 junctions.', actor:'Government', time: iso(-175)},
      {id:uid('au'), text:'Interim review flagged night-time accuracy concerns.', actor:'Traffic Engineering Cell', time: iso(-90)},
      {id:uid('au'), text:'Final measurement submitted.', actor:'UrbanPulse Systems', time: iso(-20)},
      {id:uid('au'), text:'Outcome verified as Unsuccessful.', actor:'Traffic Engineering Cell', time: iso(-14)}
    ]
  };
  p4.auditTrail = [
    {id:uid('au'), text:'Solution "Adaptive Signal Controller" submitted.', actor:'UrbanPulse Systems', time: iso(-190)},
    {id:uid('au'), text:'Evaluation completed with a score of 24/35.', actor:'Evaluation Panel A', time: iso(-180)},
    {id:uid('au'), text:'Approved for controlled pilot.', actor:'Government', time: iso(-175)},
    {id:uid('au'), text:'Outcome verified as Unsuccessful; learning record created.', actor:'Government', time: iso(-14)}
  ];

  return [p3, p2, p1, p4];
}

/* ---------------- Audit trail ---------------- */
function addAudit(entity, text, actor){
  if(!entity) return;
  entity.auditTrail = entity.auditTrail || [];
  entity.auditTrail.push({id:uid('au'), text, actor:actor||'System', time:new Date().toISOString()});
}
function auditTrailHTML(trail){
  if(!trail || !trail.length) return `<div class="empty-state"><p>No audit events recorded yet.</p></div>`;
  const items = [...trail].sort((a,b)=> new Date(a.time)-new Date(b.time));
  return `<div class="timeline">` + items.map(a=>`
    <div class="tl-item">
      <div class="tt">${escapeHtml(a.text)}</div>
      <div class="ts">${fmtDate(a.time)} · ${escapeHtml(a.actor||'System')}</div>
    </div>`).join('') + `</div>`;
}

/* ---------------- Workflow tracker (reuses .tracker) ---------------- */
function workflowTracker(stages, currentIdx, blockedIdx){
  return `<div class="tracker tracker-wide">` + stages.map((s,i)=>{
    let cls = i < currentIdx ? 'done' : (i === currentIdx ? 'current' : '');
    if(blockedIdx === i) cls = 'blocked';
    const mark = cls==='done' ? '✓' : (cls==='blocked' ? '!' : (i+1));
    const line = i < stages.length-1 ? `<div class="tr-line ${i<currentIdx?'done':''}"></div>` : '';
    return `<div class="tr-step ${cls}"><div class="circle">${mark}</div><div class="lbl">${s}</div></div>${line}`;
  }).join('') + `</div>`;
}
function govWorkflowIndex(challenge){
  if(!challenge) return 0;
  const props = DB.proposals.filter(p=>p.challengeId===challenge.id);
  if(props.some(p=>p.status==='Scaled')) return 10;
  if(props.some(p=>p.status==='Procurement')) return 9;
  if(props.some(p=>p.pilot && p.pilot.verification && p.pilot.verification.status!=='Pending Verification')) return 8;
  if(props.some(p=>p.pilot && ['Final Measurement','Verification','Outcome Decision'].includes(p.pilot.stage))) return 7;
  if(props.some(p=>p.status==='Pilot')) return 6;
  if(props.some(p=>['Under Evaluation','Approved'].includes(p.status))) return 5;
  if(props.length) return 4;
  if(challenge.status==='Open') return 3;
  if(challenge.aiDraft) return 2;
  return 1;
}
function startupWorkflowIndex(p){
  if(!p) return 0;
  if(p.status==='Scaled') return 11;
  if(p.status==='Procurement') return 10;
  if(p.pilot && p.pilot.outcomeStatus && p.pilot.outcomeStatus!=='Pending Verification') return 9;
  if(p.pilot && (p.pilot.evidence||[]).length) return 8;
  if(p.status==='Pilot') return 7;
  if(['Submitted','Under Evaluation'].includes(p.status)) return 6;
  return 5;
}

/* ---------------- Capability matching (transparent, explainable) ---------------- */
function tokenise(str){
  return String(str||'').toLowerCase().split(/[^a-z0-9+]+/).filter(t=>t.length>2);
}
function overlapScore(a, b){
  const A = new Set(tokenise(a)), B = tokenise(b);
  if(!A.size || !B.length) return 0;
  const hits = B.filter(t=>A.has(t)).length;
  return Math.min(1, hits / Math.max(3, Math.min(B.length, 6)));
}
function mapCriterionToDim(name){
  const n = String(name||'').toLowerCase();
  if(/tech|accuracy|detection|offline|clinical workflow/.test(n)) return 'technology';
  if(/team|skill/.test(n)) return 'team';
  if(/prototype|readiness|pilot ready/.test(n)) return 'prototype';
  if(/test|validat|evidence|safety improvement/.test(n)) return 'testing';
  if(/relevant|prior|experience|adoption/.test(n)) return 'relevantWork';
  if(/implement|deploy|capacity|scalab|response time/.test(n)) return 'implementation';
  if(/financ|operat|cost|sustain/.test(n)) return 'finops';
  if(/secur|privacy|complian|consent/.test(n)) return 'security';
  if(/outcome|impact/.test(n)) return 'testing';
  return null;
}
function capabilityMatch(startup, challenge){
  const cap = startup.capability || defaultCapability(startup);
  const get = (k)=> (cap[k] && typeof cap[k].score==='number') ? cap[k].score : 65;
  const techContext = [challenge?.techPref, challenge?.category, challenge?.expectedSolution].join(' ');
  const domainContext = [challenge?.category, challenge?.description, challenge?.beneficiaries].join(' ');

  const techFit = overlapScore(
    [startup.technology, cap.technology?.note, startup.industry].join(' '), techContext);
  const domainFit = overlapScore(
    [startup.industry, cap.domain?.note, cap.relevantWork?.note, startup.prevProjects].join(' '), domainContext);

  const raw = {
    technology: get('technology') * (0.82 + 0.22*techFit),
    team: get('team'),
    prototype: get('prototype'),
    testing: get('testing'),
    relevantWork: get('relevantWork') * (0.80 + 0.25*domainFit),
    implementation: get('implementation'),
    finops: (get('financial') + get('operational')) / 2,
    security: get('security')
  };

  // Challenge-specific criteria re-weight the dimensions when the department has defined them.
  const weights = {};
  CAP_DIMS.forEach(d=> weights[d.key] = d.weight);
  const crit = challenge?.capabilityCriteria || [];
  if(crit.length){
    const mapped = {};
    let mappedTotal = 0;
    crit.forEach(c=>{
      const dim = mapCriterionToDim(c.name);
      if(dim){ mapped[dim] = (mapped[dim]||0) + Number(c.weight||0); mappedTotal += Number(c.weight||0); }
    });
    if(mappedTotal > 0){
      CAP_DIMS.forEach(d=>{ weights[d.key] = (mapped[d.key] || 0) + d.weight*0.35; });
    }
  }

  const dims = CAP_DIMS.map(d=>({
    key:d.key, label:d.label,
    score: clampPct(Math.max(30, Math.min(98, raw[d.key]))),
    weight: Math.round(weights[d.key])
  }));
  const wSum = dims.reduce((s,d)=>s+d.weight, 0) || 1;
  const overall = clampPct(dims.reduce((s,d)=> s + d.score*d.weight, 0) / wSum);

  // Explanations drawn from the startup's own evidence notes — never an opaque score.
  const sorted = [...dims].sort((a,b)=>b.score-a.score);
  const noteFor = (key)=>{
    if(key==='finops') return cap.financial?.note || cap.operational?.note || '';
    return cap[key]?.note || '';
  };
  const reasons = sorted.slice(0,4).filter(d=>d.score>=70).map(d=>{
    const note = noteFor(d.key);
    return note ? `${d.label} (${d.score}%): ${note}` : `${d.label} scored ${d.score}% against this challenge.`;
  });
  const gaps = sorted.filter(d=>d.score<70).map(d=>{
    const note = noteFor(d.key);
    return note ? `${d.label} (${d.score}%): ${note}` : `${d.label} is the weakest dimension at ${d.score}%.`;
  });

  const evidenceCount = (startup.evidence||[]).length;
  const verifiedCount = (startup.evidence||[]).filter(e=>e.verified).length;

  return {overall, dims, reasons, gaps, evidenceCount, verifiedCount};
}

function capabilityBarsHTML(dims){
  return dims.map(d=>`
    <div class="cap-row">
      <span class="cap-lbl">${d.label}</span>
      <div class="progress-bar"><div style="width:${d.score}%;background:${d.score>=80?'var(--green-600)':(d.score>=65?'var(--royal-600)':'var(--amber-600)')};"></div></div>
      <span class="cap-val">${d.score}%</span>
    </div>`).join('');
}

function showWhyMatch(startupId, challengeId){
  const s = startupById(startupId); const c = challengeById(challengeId);
  if(!s) return;
  const m = capabilityMatch(s, c);
  openModal(`
    <div class="modal-head">
      <div><span class="dept small text-muted">Why this match?</span><h3 style="margin-top:4px;">${escapeHtml(s.name)} — ${m.overall}% capability match</h3></div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <p class="small text-muted" style="margin-bottom:16px;">Match against <b>${escapeHtml(c?.title||'this challenge')}</b>. The score is the weighted average of the dimensions below — each one is backed by evidence the startup has submitted.</p>
      ${capabilityBarsHTML(m.dims)}
      <div class="divider"></div>
      <div class="section-mini-title">Strong match because</div>
      ${m.reasons.length ? `<ul style="margin-bottom:16px;">${m.reasons.map(r=>`<li class="small" style="margin-bottom:8px;padding-left:16px;position:relative;"><span style="position:absolute;left:0;color:var(--green-600);">✓</span>${escapeHtml(r)}</li>`).join('')}</ul>`
        : `<p class="small text-muted" style="margin-bottom:16px;">No dimension reached the 70% threshold for this challenge.</p>`}
      ${m.gaps.length ? `<div class="section-mini-title">Where evidence is thinner</div>
        <ul style="margin-bottom:16px;">${m.gaps.map(r=>`<li class="small" style="margin-bottom:8px;padding-left:16px;position:relative;"><span style="position:absolute;left:0;color:var(--amber-600);">!</span>${escapeHtml(r)}</li>`).join('')}</ul>`:''}
      <div class="inset inset-royal">
        <p class="small"><b>How this score is built.</b> Capability is assessed on demonstrated evidence — prototype, testing, relevant work, implementation and compliance. Company age, years in business and headcount are shown as context only and carry no weight in this score, so a newer startup with a working prototype and field testing can rank above an older one without them.</p>
      </div>
      <div class="divider"></div>
      <p class="small text-muted">${m.verifiedCount} of ${m.evidenceCount} evidence items on this startup's passport are verified.</p>
      <div class="flex gap-12 mt-16">
        <button class="btn btn-secondary" onclick="closeModal();openEvidencePassport('${s.id}')">View Evidence Passport</button>
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      </div>
    </div>
  `);
}

/* ---------------- Evidence passport ---------------- */
function evidenceListHTML(items, emptyMsg){
  if(!items || !items.length) return `<div class="empty-state"><p>${emptyMsg||'No evidence recorded yet.'}</p></div>`;
  const icons = {Prototype:'🔧',Testing:'🧪',Deployment:'📦',Pilot:'🧭',Security:'🔒',Compliance:'📋',Outcome:'📈','Field Data':'📊',Document:'📄',Reference:'🔗'};
  return items.map(e=>`
    <div class="ev-item">
      <div class="ev-ic">${icons[e.type]||'📄'}</div>
      <div class="ev-body">
        <div class="ev-t">${escapeHtml(e.title)}</div>
        <div class="ev-d">${escapeHtml(e.description||'')}</div>
        <div class="ev-m">${escapeHtml(e.type)} · ${fmtDate(e.date)} · Status: ${escapeHtml(e.status||'Available')}</div>
      </div>
      <div>${e.verified?'<span class="badge badge-green"><span class="badge-dot"></span>Verified</span>':'<span class="badge badge-grey"><span class="badge-dot"></span>Unverified</span>'}</div>
    </div>`).join('');
}

function openEvidencePassport(startupId, proposalId){
  const s = startupById(startupId);
  const p = proposalId ? proposalById(proposalId) : null;
  const items = [...(s?.evidence||[]), ...(p?.evidence||[]), ...((p?.pilot?.evidence)||[])];
  openModal(`
    <div class="modal-head">
      <div><span class="dept small text-muted">Evidence Passport</span><h3 style="margin-top:4px;">${escapeHtml(s?.name || p?.startupName || 'Startup')}</h3></div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <p class="small text-muted" style="margin-bottom:12px;">Every piece of evidence this startup has put forward, in one place — prototype, testing, deployment, pilot, security, compliance and outcome.</p>
      <div class="inset">${evidenceListHTML(items, 'No evidence has been added to this passport yet.')}</div>
      <div class="flex gap-12 mt-16"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
    </div>
  `);
}

/* ---------------- AI-assisted problem builder (deterministic mock) ---------------- */
const DOMAIN_RULES = [
  {match:/garbage|waste|bin|sanitat|litter|dump/, category:'Smart Cities', domain:'municipal waste operations',
   tech:['IoT Sensors','Computer Vision','Route Optimisation','Cloud Dashboards'],
   beneficiaries:'Urban residents served by the affected municipal wards, plus sanitation staff and route supervisors',
   outcome:'collection is triggered by actual fill levels rather than a fixed timetable, so overflow becomes the exception',
   kpis:['Overflow complaints per month','Average collection response time','Route fuel consumption per day','Share of collections triggered by live data'],
   evidence:['Working fill-detection prototype','Field accuracy report under local conditions','Reference deployment with a municipal body','Data-handling and hosting note']},
  {match:/road|pothole|pavement|street|bridge|drain/, category:'Smart Cities', domain:'road and public-asset condition',
   tech:['Computer Vision','Mobile Data Capture','GIS','Predictive Maintenance'],
   beneficiaries:'Road users across the affected stretches, including public-transport operators and emergency services',
   outcome:'defects are detected and prioritised before they become safety hazards or expensive rebuilds',
   kpis:['Repair response time','Road condition score','Complaint reduction','Cost per kilometre maintained'],
   evidence:['Defect-detection accuracy report','Reference survey of a comparable road network','Field durability evidence','Integration plan with the existing works system']},
  {match:/health|patient|hospital|clinic|asha|doctor|medic|triage/, category:'Healthcare', domain:'public health service delivery',
   tech:['AI/ML','Offline-first Mobile','Telemedicine','Clinical Decision Support'],
   beneficiaries:'Residents of the affected blocks, frontline health workers and referral hospitals',
   outcome:'frontline workers get decision support at the point of care and referrals happen earlier',
   kpis:['Time to referral decision','Concordance with clinician assessment','Cases handled per worker per week','Follow-up completion rate'],
   evidence:['Clinical validation study with sample size','Offline operation test results','Data-privacy and consent documentation','Training and adoption plan']},
  {match:/crop|farm|agri|irrigat|soil|pest|yield/, category:'Agriculture', domain:'agricultural extension services',
   tech:['Computer Vision','Edge ML','Regional Language NLP','Advisory Systems'],
   beneficiaries:'Smallholder farmers in the affected tehsils and the agri-extension officers supporting them',
   outcome:'problems are identified early enough for an intervention to still change the season outcome',
   kpis:['Detection lead time','Advisory reach among farmers','Reported yield loss','Advisory accuracy verified by agronomists'],
   evidence:['Model accuracy on locally collected samples','Field trial results across a full season','Agronomist review of advisory content','Offline performance on low-cost handsets']},
  {match:/traffic|signal|junction|congestion|transport|bus|parking/, category:'Transportation', domain:'urban mobility',
   tech:['Computer Vision','Adaptive Control','IoT','Traffic Analytics'],
   beneficiaries:'Daily commuters on the affected corridors, traffic police and public-transport operators',
   outcome:'signal and dispatch decisions respond to live conditions instead of fixed assumptions',
   kpis:['Average junction wait time','Peak-hour queue length','System uptime','Incident response time'],
   evidence:['Detection accuracy at night and in rain','Reference junction or corridor deployment','Integration evidence with existing controllers','Power and uptime plan']},
  {match:/school|student|learn|teacher|education|exam/, category:'Education', domain:'school education delivery',
   tech:['EdTech','Accessibility Tech','Text-to-Speech','Offline Content Delivery'],
   beneficiaries:'Students in the affected government schools, their teachers and school administrators',
   outcome:'learning support reaches students who are currently underserved by existing courseware',
   kpis:['Courseware coverage','Weekly engagement sessions per student','Teacher support requests resolved','Assessment improvement'],
   evidence:['Accessibility conformance evidence','Classroom trial results','Content review by curriculum experts','Low-bandwidth delivery test']},
  {match:/grievance|complaint|citizen|portal|service|certificate|licen/, category:'Governance', domain:'citizen service delivery',
   tech:['NLP','Workflow Automation','API Integration','SLA Analytics'],
   beneficiaries:'Citizens filing requests through the existing channels, plus the departments receiving them',
   outcome:'requests reach the right desk the first time and move within a measurable SLA',
   kpis:['Misrouting rate','Average resolution time','SLA compliance','Repeat-complaint rate'],
   evidence:['Classification accuracy on real historical records','Integration evidence with the existing portal','Data-handling documentation','Fallback plan for misclassified cases']},
  {match:/water|flood|drain|sewage|pollut|air quality|environment/, category:'Environment', domain:'environmental monitoring',
   tech:['IoT Sensors','Remote Sensing','Predictive Analytics','Alerting Systems'],
   beneficiaries:'Residents of the affected area and the civic teams responsible for response',
   outcome:'conditions are detected early enough for a preventive response rather than a reactive one',
   kpis:['Detection lead time','Incidents prevented','Alert accuracy','Response time after alert'],
   evidence:['Sensor calibration and accuracy evidence','Field deployment reference','Alert false-positive analysis','Maintenance model']},
  {match:/police|safety|crime|emergency|fire|disaster/, category:'Public Safety', domain:'public safety response',
   tech:['Computer Vision','Geospatial Analytics','Mobile Dispatch','Alerting Systems'],
   beneficiaries:'Residents of the affected area and the response personnel serving it',
   outcome:'response teams are dispatched on better information and reach incidents faster',
   kpis:['Average response time','Incident detection accuracy','Coverage of the affected area','False-alert rate'],
   evidence:['Detection accuracy in live conditions','Reference deployment with a response agency','Data-protection documentation','Operational continuity plan']}
];

function matchDomainRule(text){
  const t = String(text||'').toLowerCase();
  return DOMAIN_RULES.find(r=>r.match.test(t)) || {
    category:'Miscellaneous', domain:'public service delivery',
    tech:['Data Platform','Workflow Automation','Analytics'],
    beneficiaries:'Citizens affected by the problem and the department responsible for the service',
    outcome:'the department can see what is happening and act on it within a measurable timeframe',
    kpis:['Service response time','Complaints per month','Process compliance','Cost per unit of service'],
    evidence:['Working prototype','Testing or validation results','Reference deployment','Data-handling documentation']
  };
}

/* Deterministic transformation of a plain-language problem into a structured challenge */
function buildProblemDraft(rawText, variant){
  const text = String(rawText||'').trim();
  const rule = matchDomainRule(text);
  const v = Number(variant||0);
  const seed = hashSeed(text + '|' + v);
  const firstSentence = (text.split(/[.!?\n]/)[0] || text).trim();
  const subject = firstSentence.length > 90 ? firstSentence.slice(0,90).trim()+'…' : firstSentence;

  const titleStems = [
    `Improving ${rule.domain} through evidence-based monitoring`,
    `Data-driven response for ${rule.domain}`,
    `Closing the response gap in ${rule.domain}`
  ];
  const title = titleStems[v % titleStems.length]
    .replace(/^./, m=>m.toUpperCase());

  const kpiSet = rule.kpis.slice(0, 3 + (v % 2));
  const durations = ['12 weeks','16 weeks','24 weeks'];
  const budgets = [[1200000,3000000],[1800000,4500000],[2500000,6000000]];
  const bud = budgets[(seed) % budgets.length];

  return {
    generatedAt: new Date().toISOString(),
    variant: v,
    sourceText: text,
    title,
    category: rule.category,
    problemStatement: `${subject}${/[.!?]$/.test(subject)?'':'.'} The department needs a solution that makes the current situation measurable and lets it act on ${rule.domain} before the problem reaches the citizen.`,
    currentSituation: `Today the process runs on fixed assumptions rather than live information. Staff find out about the problem after it has already affected people, usually through complaints, and there is no reliable record of how often it happens or where it is worst.`,
    desiredOutcome: `A working system in which ${rule.outcome}. The department should be able to show the change with numbers, not impressions.`,
    beneficiaries: rule.beneficiaries,
    baseline: `To be confirmed during pilot setup from the department's own records — for example ${kpiSet[0].toLowerCase()} over the last three months.`,
    target: `A measurable improvement on the baseline for ${kpiSet[0].toLowerCase()}, agreed with the department before the pilot begins.`,
    technicalRequirements: `Works with the department's existing systems and data; usable by current staff without specialist training; degrades safely when connectivity or power is unavailable; exports raw measurement data for independent verification.`,
    constraints: `Must operate within existing staffing levels; no dependency on infrastructure the department does not already have; all data held in-country; procurement conditional on verified pilot outcomes.`,
    technologyAreas: rule.tech.join(', '),
    kpis: kpiSet,
    pilotDuration: durations[(seed>>3) % durations.length],
    budgetMin: bud[0], budgetMax: bud[1],
    evidenceRequired: rule.evidence
  };
}

/* ---------------- Image-based problem reporting (simulated analysis) ---------------- */
const IMAGE_ANALYSIS_LIBRARY = [
  {category:'Infrastructure', issue:'Damaged road surface', impact:'Vehicle safety risk and rising maintenance cost',
   intervention:'Road-condition monitoring with predictive maintenance scheduling',
   kpis:['Repair response time','Road condition score','Complaint reduction'],
   keywords:/road|pothole|street|crack|pavement|asphalt/},
  {category:'Sanitation', issue:'Overflowing waste container with surrounding litter', impact:'Public health risk and repeat citizen complaints',
   intervention:'Fill-level monitoring with demand-based collection routing',
   kpis:['Overflow complaints per month','Collection response time','Bins collected per route'],
   keywords:/garbage|waste|bin|trash|litter|dump|sanitation/},
  {category:'Water & Drainage', issue:'Standing water and blocked drainage channel', impact:'Flooding risk, mosquito breeding and road damage',
   intervention:'Drainage-blockage detection with pre-monsoon clearance scheduling',
   kpis:['Waterlogging incidents','Clearance response time','Repeat-blockage rate'],
   keywords:/water|drain|flood|sewage|waterlog/},
  {category:'Street Lighting', issue:'Non-functional street lighting on a public stretch', impact:'Reduced night-time safety and higher incident risk',
   intervention:'Fault detection with automated ticketing to the maintenance contractor',
   kpis:['Lamp downtime','Fault resolution time','Night-time incident reports'],
   keywords:/light|lamp|dark|street ?light/},
  {category:'Traffic & Mobility', issue:'Congestion and unmanaged vehicle queueing at a junction', impact:'Commuter time loss and higher emissions at peak hours',
   intervention:'Adaptive signal timing informed by live junction data',
   kpis:['Average junction wait time','Peak queue length','Signal uptime'],
   keywords:/traffic|junction|signal|congest|vehicle|parking/},
  {category:'Public Assets', issue:'Damaged or unusable public facility', impact:'Reduced service availability for residents in the area',
   intervention:'Asset condition reporting with maintenance prioritisation',
   kpis:['Asset downtime','Repair response time','Citizen satisfaction'],
   keywords:/.*/}
];

function simulateImageAnalysis(fileName, hint){
  const basis = (fileName||'') + ' ' + (hint||'');
  const found = IMAGE_ANALYSIS_LIBRARY.find(a=>a.keywords.test(String(basis).toLowerCase()));
  const pick = found || IMAGE_ANALYSIS_LIBRARY[hashSeed(basis) % (IMAGE_ANALYSIS_LIBRARY.length-1)];
  return {
    category: pick.category,
    issue: pick.issue,
    impact: pick.impact,
    intervention: pick.intervention,
    kpis: pick.kpis,
    confidence: seededPct(basis, 72, 94),
    note: 'Simulated analysis for prototype purposes — no computer-vision service is called. An officer should confirm the observation before it is published.'
  };
}

/* ---------------- Data Store (localStorage) ---------------- */
const DB_KEY = 'govbridge_db_v1';
const API_BASE = (window.GOVBRIDGE_API_BASE || 'http://127.0.0.1:5000').replace(/\/$/, '');

function apiFetch(path, options={}){
  const headers=new Headers(options.headers||{});
  const session=getSession();
  if(session?.token) headers.set('Authorization',`Bearer ${session.token}`);
  return fetch(`${API_BASE}${path}`,{...options,headers});
}

function seedData(){
  const now = Date.now();
  const iso = (daysFromNow)=> new Date(now + daysFromNow*86400000).toISOString();

  const challenges = [
    {
      id:'ch_1', title:'Smart Waste Collection Monitoring', department:'Government of Maharashtra — Urban Dev. Dept.',
      category:'Smart Cities', location:'Pune, Maharashtra', budgetMin:1500000, budgetMax:4000000,
      description:'Design a real-time monitoring solution for municipal waste collection to reduce overflow complaints and optimise truck routes.',
      currentSituation:'Waste bins across 12 wards overflow unpredictably; routes are static and fuel-inefficient; no live visibility for control room.',
      expectedSolution:'IoT/sensor or vision-based fill-level detection with a dispatcher dashboard and route optimisation.',
      beneficiaries:'2.1 million urban residents across 12 municipal wards',
      timeline:'6 months pilot, 18 months full rollout', techPref:'IoT, Computer Vision, Cloud Dashboards',
      eligibility:'DPIIT-recognised startup, <8 years old, prior civic-tech experience preferred',
      deadline: iso(21), status:'Open', postedOn: iso(-18), proposals:3
    },
    {
      id:'ch_2', title:'AI-Assisted Rural Healthcare Access', department:'Government Health Department, Odisha',
      category:'Healthcare', location:'Koraput District, Odisha', budgetMin:2500000, budgetMax:6000000,
      description:'Build an AI-assisted triage and teleconsultation companion for ASHA workers in low-connectivity rural blocks.',
      currentSituation:'Only 1 doctor per 32,000 rural residents; ASHA workers lack decision-support tools; referrals are delayed.',
      expectedSolution:'Offline-first triage app with symptom-checker AI, escalation workflow and teleconsultation fallback.',
      beneficiaries:'480,000 residents across 6 rural blocks',
      timeline:'4 months pilot, phased scale over 12 months', techPref:'AI/ML, Offline-first mobile, Telemedicine',
      eligibility:'Healthtech startup, CDSCO awareness a plus, data-privacy compliant',
      deadline: iso(14), status:'Open', postedOn: iso(-25), proposals:5
    },
    {
      id:'ch_3', title:'Real-Time Crop Disease Detection', department:'Agriculture Department, Punjab',
      category:'Agriculture', location:'Ludhiana, Punjab', budgetMin:1200000, budgetMax:3000000,
      description:'Enable smallholder farmers to detect crop disease early using a phone-camera based diagnostic tool with local-language advisory.',
      currentSituation:'Farmers rely on delayed physical inspection by agri-extension officers; yield loss from late disease detection is significant.',
      expectedSolution:'On-device/edge ML image classification with Punjabi-language advisory and nearest-agri-office escalation.',
      beneficiaries:'85,000 smallholder farmers across 4 tehsils',
      timeline:'3 months pilot before Rabi season', techPref:'Computer Vision, Edge ML, Regional Language NLP',
      eligibility:'Agritech startup with field-trial capability', deadline: iso(9), status:'Open', postedOn: iso(-12), proposals:2
    },
    {
      id:'ch_4', title:'Digital Learning Accessibility Platform', department:'Education Department, Rajasthan',
      category:'Education', location:'Jaipur, Rajasthan', budgetMin:1800000, budgetMax:4500000,
      description:'Create an accessible digital learning companion for government school students with visual/hearing impairments.',
      currentSituation:'Limited assistive learning content in regional language; no standard accessible digital courseware across govt schools.',
      expectedSolution:'Screen-reader-friendly, sign-language and captioned courseware aligned to state curriculum.',
      beneficiaries:'14,000 students with disabilities across 220 government schools',
      timeline:'5 months pilot in 20 schools', techPref:'Accessibility Tech, EdTech, NLP/Text-to-Speech',
      eligibility:'EdTech startup with WCAG-compliant product', deadline: iso(30), status:'Open', postedOn: iso(-8), proposals:1
    },
    {
      id:'ch_5', title:'Intelligent Traffic Management', department:'Municipal Corporation, Indore',
      category:'Transportation', location:'Indore, Madhya Pradesh', budgetMin:3000000, budgetMax:8000000,
      description:'Reduce peak-hour congestion at 15 high-traffic junctions using adaptive signal control informed by live traffic data.',
      currentSituation:'Fixed-timer signals cause avoidable congestion; no centralised live traffic visibility for traffic police.',
      expectedSolution:'Adaptive signal timing driven by live camera/sensor feeds with a command-centre dashboard.',
      beneficiaries:'1.4 million commuters city-wide',
      timeline:'6 months pilot at 5 junctions, scale to 15', techPref:'Computer Vision, IoT, Traffic Analytics',
      eligibility:'Smart mobility startup, prior traffic-tech deployment preferred', deadline: iso(45), status:'Open', postedOn: iso(-5), proposals:0
    },
    {
      id:'ch_6', title:'Citizen Grievance Auto-Triage System', department:'Governance & Public Services, Delhi',
      category:'Governance', location:'New Delhi', budgetMin:900000, budgetMax:2200000,
      description:'Automatically classify and route citizen grievances filed via app/portal to the correct department to cut resolution time.',
      currentSituation:'Grievances are manually triaged causing 9-day average misrouting delay before reaching the right department.',
      expectedSolution:'NLP-based classifier integrated with the existing grievance portal API, with SLA-tracking dashboard.',
      beneficiaries:'All citizens filing grievances — approx. 40,000/month',
      timeline:'3 months pilot, 6 months full integration', techPref:'NLP, API Integration, Workflow Automation',
      eligibility:'Govtech startup with prior API-integration experience', deadline: iso(60), status:'Draft', postedOn: iso(-2), proposals:0
    }
  ];

  const startups = [
    {id:'su_1', name:'AgroVision Labs', founder:'Rhea Kapoor', industry:'Agritech', founded:2019, location:'Chandigarh, Punjab', website:'agrovisionlabs.example', teamSize:22, technology:'Computer Vision, Edge AI', prevProjects:'Deployed crop-health scanner with 3 state agri-departments', govExperience:'Yes — Punjab Agriculture Dept pilot (2023)', certifications:'DPIIT Recognised, ISO 27001', funding:'Series A, ₹18 Cr raised', verified:true},
    {id:'su_2', name:'MedReach AI', founder:'Dr. Arjun Mehta', industry:'Healthtech', founded:2020, location:'Bengaluru, Karnataka', website:'medreach.example', teamSize:34, technology:'AI Triage, Offline Mobile', prevProjects:'ASHA worker companion app used in 3 states', govExperience:'Yes — NHM pilot Odisha', certifications:'DPIIT Recognised, CDSCO Class A', funding:'Seed, ₹6 Cr raised', verified:true},
    {id:'su_3', name:'UrbanPulse Systems', founder:'Kavya Nair', industry:'Smart Cities', founded:2021, location:'Pune, Maharashtra', website:'urbanpulse.example', teamSize:16, technology:'IoT Sensors, Route Optimisation', prevProjects:'Smart bin sensors for 2 municipal corporations', govExperience:'Yes — Pune Municipal Corp trial', certifications:'DPIIT Recognised', funding:'Pre-Series A, ₹9 Cr raised', verified:false}
  ];

  const proposals = seedProposals(iso);
  const notifications = [
    {id:uid('n'), forRole:'government', text:'New solution submitted for Smart Waste Collection Monitoring.', time: iso(-2), read:false},
    {id:uid('n'), forRole:'government', text:'Pilot approaching review date for AI-Assisted Rural Healthcare Access.', time: iso(-4), read:false},
  ];

  const db = { challenges, startups, proposals, notifications, activity:[
    {id:uid('a'), text:'Challenge "Smart Waste Collection Monitoring" published.', time: iso(-18)},
    {id:uid('a'), text:'AgroVision Labs profile verified.', time: iso(-10)},
  ]};
  migrateDB(db);
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  return db;
}

function loadDB(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    if(!raw) return seedData();
    const db = JSON.parse(raw);
    if(!db || !Array.isArray(db.challenges)) return seedData();
    // Extend previously-saved data with any newer fields, never removing what's there.
    if(migrateDB(db)) localStorage.setItem(DB_KEY, JSON.stringify(db));
    return db;
  }catch(e){ return seedData(); }
}
function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
let DB = loadDB();

let challengeSyncStarted = false;
let proposalSyncStarted = false;
function parseDatabaseList(value){
  if(Array.isArray(value)) return value;
  try{ const parsed=JSON.parse(value||'[]'); return Array.isArray(parsed)?parsed:[]; }catch(_error){ return []; }
}
async function syncChallengesFromDatabase(){
  try{
    const response = await apiFetch('/api/challenges');
    if(!response.ok) return;
    const data = await response.json();
    if(!Array.isArray(data.challenges)) return;
    data.challenges.forEach(row=>{
      const id = 'dbch_'+row.id;
      const challenge = {
        id, databaseId:row.id, title:row.title, department:row.department||'Government Department',
        category:row.category||'Miscellaneous', location:row.location||'',
        budgetMin:Number(row.budget_min||0), budgetMax:Number(row.budget_max||0),
        description:row.description||'', currentSituation:row.current_situation||'',
        expectedSolution:row.expected_solution||'', beneficiaries:row.beneficiaries||'',
        timeline:row.timeline||'', techPref:row.tech_preference||'', eligibility:row.eligibility||'',
        baseline:row.baseline||'', target:row.target||'', kpis:parseDatabaseList(row.kpis),
        capabilityCriteria:parseDatabaseList(row.capability_criteria),
        evidenceRequirements:parseDatabaseList(row.evidence_requirements),
        deadline:row.deadline||'', status:String(row.status||'Open').replace(/^./,c=>c.toUpperCase()),
        postedOn:row.created_at||'', proposals:Number(row.proposal_count||0)
      };
      const existing = DB.challenges.findIndex(item=>item.id===id);
      if(existing>=0) DB.challenges[existing]=Object.assign(DB.challenges[existing],challenge);
      else DB.challenges.unshift(challenge);
    });
    migrateDB(DB);
    saveDB(DB);
    const session=getSession();
    if(session && document.body.dataset.interface!=='login' && document.body.dataset.interface!=='landing'){
      renderAppPage(Router.current(),session);
    }
  }catch(_error){
    // The prototype's local sample challenges remain available if the API is offline.
  }
}

async function syncProposalsFromDatabase(){
  const session=getSession();
  if(!session || session.demo) return;
  try{
    const endpoint=session.role==='startup'
      ? `/api/startups/${session.id}/proposals`
      : '/api/proposals';
    const response=await apiFetch(endpoint);
    if(!response.ok) return;
    const data=await response.json();
    if(!Array.isArray(data.proposals)) return;
    data.proposals.forEach(row=>{
      const id='dbpr_'+row.id;
      const prop={
        id,databaseId:row.id,challengeId:'dbch_'+row.challenge_id,startupId:row.startup_id,
        startupName:row.startup_name||'Startup',solutionName:row.solution_title,
        problem:row.problem||'',description:row.description||'',usp:row.usp||'',
        techStack:row.tech_stack||'',estCost:Number(row.estimated_cost||0),
        implementationPlan:row.implementation_plan||'',expectedImpact:row.expected_impact||'',
        timeline:row.timeline||'',prevProjects:row.previous_projects||'',teamDetails:row.team_details||'',
        approach:row.approach||'',prototypeStatus:row.prototype_status||'',
        testingEvidence:row.testing_evidence||'',securityCompliance:row.security_compliance||'',
        pilotPlan:row.pilot_plan||'',evidence:parseDatabaseList(row.evidence),
        status:row.status||'Submitted',submittedOn:row.submitted_at||'',evalScores:{},
        evaluationEvidence:{},auditTrail:[]
      };
      const existing=DB.proposals.findIndex(item=>item.id===id);
      if(existing>=0) DB.proposals[existing]=Object.assign(DB.proposals[existing],prop);
      else DB.proposals.unshift(prop);
    });
    migrateDB(DB);
    saveDB(DB);
    if(document.body.dataset.interface!=='login' && document.body.dataset.interface!=='landing'){
      renderAppPage(Router.current(),session);
    }
  }catch(_error){
    // Existing sample proposals remain usable when the API is offline.
  }
}

function addActivity(text){
  DB.activity.unshift({id:uid('a'), text, time:new Date().toISOString()});
  DB.activity = DB.activity.slice(0,30);
}
function addNotif(forRole, text){
  DB.notifications.unshift({id:uid('n'), forRole, text, time:new Date().toISOString(), read:false});
}

/* ---------------- Session ---------------- */
const SESSION_KEY = 'govbridge_session_v1';
function getSession(){
  try{
    const session=JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if(session?.demo===true && ['startup','government'].includes(session.role)) return session;
    if(session && !session.token){
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    if(session && String(session.email||'').toLowerCase().endsWith('@govbridge.demo')){
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  }catch(e){ return null; }
}
function setSession(s){ sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession(){ sessionStorage.removeItem(SESSION_KEY); }

// Public signup creates startup accounts, so open the login form on that role.
let loginRole = 'startup';
function setLoginRole(role){
  loginRole = role;
  $('#roleGovBtn').classList.toggle('active', role==='government');
  $('#roleStartupBtn').classList.toggle('active', role==='startup');
}

async function handleLogin(e){
  e.preventDefault();
  const status=$('#loginStatus');
  if(status) status.textContent='';
  const email = $('#loginEmail').value.trim();
  const pass = $('#loginPass').value;
  let valid = true;
  if(!/^\S+@\S+\.\S+$/.test(email)){ $('#fld_email').classList.add('error'); valid=false; } else { $('#fld_email').classList.remove('error'); }
  if(!pass){ $('#fld_pass').classList.add('error'); valid=false; } else { $('#fld_pass').classList.remove('error'); }
  if(!valid) return false;

  try{
    const response=await apiFetch('/api/login',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password:pass,role:loginRole})
    });
    let data={};
    try{ data=await response.json(); }
    catch(_error){ throw new Error(`Login server returned an unexpected response (HTTP ${response.status}).`); }
    if(!response.ok){
      const message=data.error||data.message||`Sign-in failed (HTTP ${response.status}).`;
      if(status) status.textContent=message;
      toast(message,'error');
      return false;
    }
    if(response.ok && data.user){
      const user=data.user;
      setSession({id:user.id,role:user.role,email:user.email,name:user.name,dept:user.organization_name,organizationName:user.organization_name,startupId:user.id,token:data.token,loginTime:new Date().toISOString()});
      toast('Signed in successfully.','success');
      Router.go(loginRole==='government' ? '/gov/dashboard' : '/startup/dashboard');
      return false;
    }
  }catch(error){
    const message=error.message==='Failed to fetch'
      ?'Could not reach the login server. Check that the backend is running.'
      :error.message;
    if(status) status.textContent=message;
    toast(message,'error');
    return false;
  }
  const message='The server response did not include an account. Try signing in again.';
  if(status) status.textContent=message;
  toast(message,'error');
  return false;
}
function enterDemo(role){
  if(!['startup','government'].includes(role)) return;
  const startup=DB.startups.find(item=>item.id==='su_3');
  setSession({
    id:null, role, email:'demo@example.invalid',
    name:role==='startup'?'Demo Startup User':'Demo Department',
    dept:'Demo Department',
    organizationName:role==='startup'?(startup?.name||'Demo Startup'):'Demo Department',
    startupId:role==='startup'?'su_3':null,
    demo:true, loginTime:new Date().toISOString()
  });
  Router.go(role==='government'?'/gov/dashboard':'/startup/dashboard');
}
function handleLogout(){
  clearSession();
  toast('Logged out.','info');
  Router.go('/');
}

/* ---------------- Router ---------------- */
const Router = {
  go(path){
    const pageType=document.body.dataset.interface;
    if(path==='/login' && pageType!=='login'){ location.href='login.html'; return; }
    if(path==='/' && pageType!=='landing'){ location.href='index.html'; return; }
    if(pageType==='login' && path!=='/login'){
      const role=loginRole || 'government';
      location.href=(role==='government'?'government-dashboard.html':'startup-dashboard.html')+'#'+path;
      return;
    }
    if(path.startsWith('/gov') && pageType==='startup'){ location.href='government-dashboard.html#'+path; return; }
    if(path.startsWith('/startup') && pageType==='government'){ location.href='startup-dashboard.html#'+path; return; }
    location.hash = '#'+path;
  },
  current(){ return location.hash.replace(/^#/,'') || (document.body.dataset.interface==='landing'?'/':document.body.dataset.interface==='login'?'/login':document.body.dataset.route||'/'); }
};

const PUBLIC_ROUTES = ['/', '/login'];

function renderRoute(){
  const landingAnchor = location.hash.slice(1);
  if(document.body.dataset.interface==='landing' && ['how','problems','why','about','prototype-interfaces'].includes(landingAnchor)){
    $$('.view').forEach(v=>v.classList.remove('active'));
    $('#view-landing').classList.add('active');
    renderLanding();
    requestAnimationFrame(()=>document.getElementById(landingAnchor)?.scrollIntoView({block:'start'}));
    return;
  }
  const path = Router.current();
  const session = getSession();

  // Guard app routes
  if(!PUBLIC_ROUTES.includes(path)){
    if(!session){ Router.go('/login'); return; }
    if(path.startsWith('/gov') && session.role!=='government'){ Router.go('/startup/dashboard'); return; }
    if(path.startsWith('/startup') && session.role!=='startup'){ Router.go('/gov/dashboard'); return; }
  }

  $$('.view').forEach(v=>v.classList.remove('active'));
  window.scrollTo(0,0);

  if(path === '/'){
    $('#view-landing').classList.add('active');
    renderLanding();
  } else if(path === '/login'){
    $('#view-login').classList.add('active');
    setLoginRole(session? session.role : 'government');
  } else {
    $('#view-app').classList.add('active');
    renderAppShell(session);
    renderAppPage(path, session);
  }
  if(session && !session.demo && !challengeSyncStarted){
    challengeSyncStarted=true;
    syncChallengesFromDatabase();
  }
  if(session && !session.demo && !proposalSyncStarted){
    proposalSyncStarted=true;
    syncProposalsFromDatabase();
  }
  document.getElementById('sidebar')?.classList.remove('open');
}
window.addEventListener('hashchange', renderRoute);

/* ============================================================
   LANDING PAGE RENDER
   ============================================================ */
function computeStats(){
  const active = DB.challenges.filter(c=>c.status==='Open').length;
  const verified = DB.startups.filter(s=>s.verified).length;
  const evaluated = DB.proposals.filter(p=>['Under Evaluation','Approved','Pilot','Procurement','Scaled','Rejected'].includes(p.status)).length;
  const pilots = DB.proposals.filter(p=>p.status==='Pilot').length;
  const scaled = DB.proposals.filter(p=>p.status==='Scaled').length;
  return {active, verified, evaluated, pilots, scaled};
}

function renderLanding(){
  const icons = ['🏛️','💡','🚀','🧪','📄','📈'];
  const labels = ['Government','Innovation','Startup','Pilot','Procurement','Scale'];
  $('#lcArt').innerHTML = labels.map((l,i)=>`
    <div class="lc-node"><div class="ic">${icons[i]}</div><span>${l}</span></div>
    ${i<labels.length-1?'<svg class="lc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>':''}
  `).join('');

  const s = computeStats();
  const stats = [
    {n:s.active, l:'Active Government Challenges'},
    {n:s.verified, l:'Verified Startups'},
    {n:s.evaluated, l:'Solutions Evaluated'},
    {n:s.pilots, l:'Pilots Running'},
    {n:s.scaled, l:'Solutions Scaled'}
  ];
  $('#statsStrip').innerHTML = stats.map(st=>`<div class="stat-item"><div class="num">${st.n}</div><div class="lbl">${st.l}</div></div>`).join('');

  const open = DB.challenges.filter(c=>c.status==='Open').slice(0,4);
  $('#landingChallenges').innerHTML = open.map(c=>challengeCardHTML(c,'public')).join('');
}

function categoryColor(cat){
  const map = {Healthcare:'green',Education:'royal',Agriculture:'saffron',
    'Smart Cities':'royal','Environment':'green',Transportation:'amber',
    Cybersecurity:'red',Governance:'grey','Public Safety':'red',Miscellaneous:'grey'};
  return map[cat]||'grey';
}

function challengeCardHTML(c, mode){
  const dleft = daysUntil(c.deadline);
  return `
  <div class="ch-card">
    <div class="flex" style="justify-content:space-between;align-items:flex-start;">
      <span class="dept">${escapeHtml(c.department)}</span>
      <span class="badge badge-${categoryColor(c.category)}">${c.category}</span>
    </div>
    <h3>${escapeHtml(c.title)}</h3>
    <p class="desc">${escapeHtml(c.description.slice(0,110))}${c.description.length>110?'…':''}</p>
    <div class="meta-row">
      <span class="meta-item">📍 ${escapeHtml(c.location)}</span>
      <span class="meta-item">💰 ${inr(c.budgetMin)}–${inr(c.budgetMax)}</span>
      <span class="meta-item">⏱ ${dleft>0?dleft+' days left':'Closed'}</span>
    </div>
    <div class="foot">
      <span class="small text-muted">${c.proposals} proposal${c.proposals!==1?'s':''}</span>
      <div class="foot-actions">
        ${mode==='public'
          ? `<button class="btn btn-secondary btn-sm" onclick="Router.go('/login')">View Details</button>`
          : `<button class="btn btn-secondary btn-sm" onclick="openChallengeDetails('${c.id}')">View Details</button>
             <button class="btn btn-primary btn-sm" onclick="Router.go('/startup/submit/${c.id}')">Submit Solution</button>`
        }
      </div>
    </div>
  </div>`;
}

/* ============================================================
   APP SHELL: sidebar + topbar (role aware)
   ============================================================ */
const GOV_NAV = [
  {grp:'Overview'},
  {path:'/gov/dashboard', label:'Dashboard', icon:'grid'},
  {path:'/gov/notifications', label:'Notifications', icon:'bell'},
  {grp:'Challenges'},
  {path:'/gov/post-challenge', label:'Post Challenge', icon:'plus'},
  {path:'/gov/my-challenges', label:'My Challenges', icon:'list'},
  {path:'/gov/discover-startups', label:'Discover Startups', icon:'search'},
  {grp:'Pipeline'},
  {path:'/gov/submitted-solutions', label:'Submitted Solutions', icon:'inbox'},
  {path:'/gov/evaluation', label:'Evaluation', icon:'check'},
  {path:'/gov/pilots', label:'Pilot Projects', icon:'flask'},
  {path:'/gov/outcomes', label:'Outcome Records', icon:'check'},
  {path:'/gov/procurement', label:'Procurement', icon:'cart'},
  {path:'/gov/scale', label:'Scale & Deployment', icon:'trend'},
  {grp:'Insights'},
  {path:'/gov/analytics', label:'Analytics', icon:'chart'},
  {path:'/gov/admin', label:'Admin & Audit', icon:'shield'},
  {path:'/gov/settings', label:'Settings', icon:'gear'},
];
const STARTUP_NAV = [
  {grp:'Overview'},
  {path:'/startup/dashboard', label:'Dashboard', icon:'grid'},
  {path:'/startup/notifications', label:'Notifications', icon:'bell'},
  {grp:'Opportunities'},
  {path:'/startup/browse', label:'Browse Challenges', icon:'search'},
  {path:'/startup/recommended', label:'Recommended', icon:'star'},
  {grp:'My Pipeline'},
  {path:'/startup/proposals', label:'My Proposals', icon:'list'},
  {path:'/startup/pilots', label:'Pilot Projects', icon:'flask'},
  {path:'/startup/procurement', label:'Procurement', icon:'cart'},
  {path:'/startup/performance', label:'Performance', icon:'trend'},
  {grp:'Account'},
  {path:'/startup/profile', label:'Profile', icon:'user'},
];
const NAV_ICONS = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  bell:'<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  flask:'<path d="M9 3h6M10 3v6l-6 9a2 2 0 001.7 3h12.6a2 2 0 001.7-3l-6-9V3"/>',
  cart:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>',
  trend:'<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
  chart:'<path d="M3 3v18h18M8 17V10M13 17V6M18 17v-4"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.36.22.74.22 1.13V10a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  star:'<path d="M12 2l3 6 6 1-4.5 4 1 6L12 16l-5.5 3 1-6L3 9l6-1z"/>',
  user:'<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
};

function renderAppShell(session){
  const nav = session.role==='government' ? GOV_NAV : STARTUP_NAV;
  const path = Router.current();
  $('#sideNav').innerHTML = nav.map(item=>{
    if(item.grp) return `<div class="grp-label">${item.grp}</div>`;
    const active = path===item.path || (item.path!=='/gov/dashboard' && item.path!=='/startup/dashboard' && path.startsWith(item.path));
    return `<a href="#${item.path}" class="${active?'active':''}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${NAV_ICONS[item.icon]}</svg> ${item.label}</a>`;
  }).join('');

  $('#topAvatar').textContent = session.name.charAt(0).toUpperCase();
  $('#topName').textContent = session.role==='government' ? session.dept : session.name;
  renderNotifBadge(session.role);
}

function renderNotifBadge(role){
  const unread = DB.notifications.filter(n=>n.forRole===role && !n.read).length;
  $('#notifDot').style.display = unread>0 ? 'block':'none';
}
function toggleNotifPanel(){
  const p = $('#notifPanel');
  const showing = p.style.display==='block';
  p.style.display = showing?'none':'block';
  if(!showing) renderNotifList();
}
function renderNotifList(){
  const session = getSession(); if(!session) return;
  const list = DB.notifications.filter(n=>n.forRole===session.role);
  $('#notifList').innerHTML = list.length ? list.map(n=>`
    <div class="row-item">
      <div class="ric">${n.read?'✓':'●'}</div>
      <div class="rtxt"><div class="t1" style="white-space:normal;">${escapeHtml(n.text)}</div><div class="t2">${new Date(n.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div></div>
    </div>`).join('') : `<div class="empty-state"><p>No notifications yet.</p></div>`;
}
function clearAllNotifs(){
  const session = getSession(); if(!session) return;
  DB.notifications.forEach(n=>{ if(n.forRole===session.role) n.read=true; });
  saveDB(DB); renderNotifBadge(session.role); renderNotifList();
}
document.addEventListener('click',(e)=>{
  const panel = $('#notifPanel'); const btn = $('#notifBtn');
  if(panel && panel.style.display==='block' && !panel.contains(e.target) && !btn.contains(e.target)){ panel.style.display='none'; }
});

/* ============================================================
   APP PAGE ROUTER
   ============================================================ */
function renderAppPage(path, session){
  const page = $('#appPage');
  const setCrumb = (t)=> $('#crumbs').innerHTML = t;

  // GOVERNMENT ROUTES
  if(path==='/gov/dashboard'){ setCrumb('<b>Dashboard</b>'); return govDashboard(page); }
  if(path==='/gov/post-challenge'){ setCrumb('Challenges / <b>Post Challenge</b>'); return govPostChallenge(page); }
  if(path==='/gov/my-challenges'){ setCrumb('Challenges / <b>My Challenges</b>'); return govMyChallenges(page); }
  if(path==='/gov/discover-startups'){ setCrumb('<b>Discover Startups</b>'); return govDiscoverStartups(page); }
  if(path==='/gov/submitted-solutions'){ setCrumb('Pipeline / <b>Submitted Solutions</b>'); return govSubmittedSolutions(page); }
  if(path==='/gov/evaluation'){ setCrumb('Pipeline / <b>Evaluation</b>'); return govEvaluationList(page); }
  if(path.startsWith('/gov/evaluate/')){ setCrumb('Pipeline / Evaluation / <b>Review</b>'); return govEvaluateProposal(page, path.split('/')[3]); }
  if(path==='/gov/pilots'){ setCrumb('Pipeline / <b>Pilot Projects</b>'); return govPilots(page); }
  if(path==='/gov/procurement'){ setCrumb('Pipeline / <b>Procurement</b>'); return govProcurement(page); }
  if(path==='/gov/scale'){ setCrumb('Pipeline / <b>Scale & Deployment</b>'); return govScale(page); }
  if(path==='/gov/outcomes'){ setCrumb('Pipeline / <b>Outcome Records</b>'); return govOutcomes(page); }
  if(path==='/gov/admin'){ setCrumb('<b>Admin & Audit</b>'); return govAdmin(page); }
  if(path==='/gov/analytics'){ setCrumb('<b>Analytics</b>'); return govAnalytics(page); }
  if(path==='/gov/notifications'){ setCrumb('<b>Notifications</b>'); return notificationsPage(page,'government'); }
  if(path==='/gov/settings'){ setCrumb('<b>Settings</b>'); return govSettings(page); }

  // STARTUP ROUTES
  if(path==='/startup/dashboard'){ setCrumb('<b>Dashboard</b>'); return startupDashboard(page); }
  if(path==='/startup/browse'){ setCrumb('<b>Browse Challenges</b>'); return startupBrowse(page); }
  if(path==='/startup/recommended'){ setCrumb('<b>Recommended Challenges</b>'); return startupRecommended(page); }
  if(path==='/startup/proposals'){ setCrumb('<b>My Proposals</b>'); return startupProposals(page); }
  if(path.startsWith('/startup/submit/')){ setCrumb('Browse / <b>Submit Solution</b>'); return startupSubmit(page, path.split('/')[3]); }
  if(path==='/startup/pilots'){ setCrumb('<b>Pilot Projects</b>'); return startupPilots(page); }
  if(path==='/startup/procurement'){ setCrumb('<b>Procurement</b>'); return startupProcurement(page); }
  if(path==='/startup/performance'){ setCrumb('<b>Performance</b>'); return startupPerformance(page); }
  if(path==='/startup/profile'){ setCrumb('<b>Profile</b>'); return startupProfile(page); }
  if(path==='/startup/notifications'){ setCrumb('<b>Notifications</b>'); return notificationsPage(page,'startup'); }

  page.innerHTML = `<div class="empty-state"><p>Page not found.</p></div>`;
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */
function kpiCard(icon,color,val,lbl){
  return `<div class="kpi-card">
    <div class="top"><div class="ic" style="background:var(--${color}-100);color:var(--${color}-600);">${icon}</div></div>
    <div class="val">${val}</div><div class="lbl">${lbl}</div>
  </div>`;
}
const ICN = {
  target:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
  inbox:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>',
  flask:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3h6M10 3v6l-6 9a2 2 0 001.7 3h12.6a2 2 0 001.7-3l-6-9V3"/></svg>',
  cart:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>',
  trophy:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M17 6h3a3 3 0 01-3 4M7 6H4a3 3 0 003 4"/></svg>',
  clock:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>'
};

function statusBadge(status){
  const map = {
    'Open':'green','Draft':'grey','Closed':'grey',
    'Submitted':'royal','Under Evaluation':'amber','Approved':'green',
    'Pilot':'royal','Procurement':'saffron','Scaled':'green','Rejected':'red',
    'Not Started':'grey'
  };
  return `<span class="badge badge-${map[status]||'grey'}"><span class="badge-dot"></span>${status}</span>`;
}

const PIPELINE_STAGES = ['Submitted','Under Evaluation','Approved','Pilot','Procurement','Scaled'];
function pipelineTracker(currentStatus){
  if(currentStatus==='Rejected'){
    return `<div class="tracker">
      <div class="tr-step done"><div class="circle">✓</div><div class="lbl">Submitted</div></div>
      <div class="tr-line"></div>
      <div class="tr-step rejected"><div class="circle">✕</div><div class="lbl">Rejected</div></div>
    </div>`;
  }
  const idx = PIPELINE_STAGES.indexOf(currentStatus);
  return `<div class="tracker">` + PIPELINE_STAGES.map((s,i)=>{
    const cls = i<idx?'done':(i===idx?'current':'');
    const circle = i<idx ? '✓' : (i+1);
    const line = i < PIPELINE_STAGES.length-1 ? `<div class="tr-line ${i<idx?'done':''}"></div>` : '';
    return `<div class="tr-step ${cls}"><div class="circle">${circle}</div><div class="lbl">${s}</div></div>${line}`;
  }).join('') + `</div>`;
}

function activityTimelineHTML(items){
  if(!items.length) return `<div class="empty-state"><p>No recent activity.</p></div>`;
  return `<div class="timeline">` + items.slice(0,8).map(a=>`
    <div class="tl-item"><div class="tt">${escapeHtml(a.text)}</div><div class="ts">${new Date(a.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div></div>
  `).join('') + `</div>`;
}

function emptyState(msg, icon='📭'){
  return `<div class="empty-state"><div style="font-size:32px;">${icon}</div><p>${msg}</p></div>`;
}

/* ============================================================
   GOVERNMENT — DASHBOARD
   ============================================================ */
function govDashboard(page){
  const session = getSession();
  const myChallenges = DB.challenges;
  const props = DB.proposals;
  const kpis = {
    active: myChallenges.filter(c=>c.status==='Open').length,
    received: props.length,
    pilots: props.filter(p=>p.status==='Pilot').length,
    procurement: props.filter(p=>p.status==='Procurement').length,
    scaled: props.filter(p=>p.status==='Scaled').length
  };
  const recentChallenges = [...myChallenges].sort((a,b)=>new Date(b.postedOn)-new Date(a.postedOn)).slice(0,4);
  const recentProps = [...props].sort((a,b)=>new Date(b.submittedOn)-new Date(a.submittedOn)).slice(0,4);

  page.innerHTML = `
    <div class="page-head">
      <div><h1>Good morning, ${escapeHtml(session.dept)}</h1><p class="sub">Here's what's happening across your innovation pipeline today.</p></div>
      <button class="btn btn-primary" onclick="Router.go('/gov/post-challenge')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg> Post Challenge</button>
    </div>
    <div class="kpi-grid">
      ${kpiCard(ICN.target,'royal',kpis.active,'Active Challenges')}
      ${kpiCard(ICN.inbox,'saffron',kpis.received,'Solutions Received')}
      ${kpiCard(ICN.flask,'amber',kpis.pilots,'Pilots in Progress')}
      ${kpiCard(ICN.cart,'royal',kpis.procurement,'Procurement Initiated')}
      ${kpiCard(ICN.trophy,'green',kpis.scaled,'Successfully Scaled')}
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><h3>Government Workflow</h3><p class="small text-muted mt-8">${recentChallenges[0]?'Current stage for "'+escapeHtml(recentChallenges[0].title)+'"':'From problem definition through to scale.'}</p></div>
        <button class="link-btn small" onclick="Router.go('/gov/admin')">Admin & audit</button>
      </div>
      <div class="panel-body pad">${workflowTracker(GOV_WORKFLOW, recentChallenges[0]?govWorkflowIndex(recentChallenges[0]):0)}</div>
    </div>
    <div class="dash-grid">
      <div>
        <div class="panel">
          <div class="panel-head"><h3>Recent Challenges</h3><button class="link-btn small" onclick="Router.go('/gov/my-challenges')">View all</button></div>
          <div class="panel-body">
            ${recentChallenges.length? recentChallenges.map(c=>`
              <div class="row-item">
                <div class="ric">🏛️</div>
                <div class="rtxt"><div class="t1">${escapeHtml(c.title)}</div><div class="t2">${c.category} · ${escapeHtml(c.location)} · ${c.proposals} proposals</div></div>
                ${statusBadge(c.status)}
              </div>`).join('') : emptyState('No challenges posted yet. Click "Post Challenge" to get started.')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Recent Startup Applications</h3><button class="link-btn small" onclick="Router.go('/gov/submitted-solutions')">View all</button></div>
          <div class="panel-body">
            ${recentProps.length? recentProps.map(p=>`
              <div class="row-item">
                <div class="ric">🚀</div>
                <div class="rtxt"><div class="t1">${escapeHtml(p.solutionName)} — ${escapeHtml(p.startupName)}</div><div class="t2">for ${escapeHtml(challengeById(p.challengeId)?.title||'—')}</div></div>
                ${statusBadge(p.status)}
              </div>`).join('') : emptyState('No proposals submitted yet.')}
          </div>
        </div>
      </div>
      <div>
        <div class="panel">
          <div class="panel-head"><h3>Pilot Status</h3></div>
          <div class="panel-body">
            ${props.filter(p=>p.status==='Pilot').length? props.filter(p=>p.status==='Pilot').map(p=>`
              <div class="row-item"><div class="ric">🧪</div><div class="rtxt"><div class="t1">${escapeHtml(p.solutionName)}</div><div class="t2">${escapeHtml(p.startupName)}</div></div></div>
            `).join('') : emptyState('No pilots running currently.','🧪')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Procurement Pipeline</h3></div>
          <div class="panel-body">
            ${props.filter(p=>p.status==='Procurement').length? props.filter(p=>p.status==='Procurement').map(p=>`
              <div class="row-item"><div class="ric">🛒</div><div class="rtxt"><div class="t1">${escapeHtml(p.solutionName)}</div><div class="t2">${escapeHtml(p.startupName)}</div></div></div>
            `).join('') : emptyState('Nothing in procurement yet.','🛒')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Activity Timeline</h3></div>
          <div class="panel-body pad">${activityTimelineHTML(DB.activity)}</div>
        </div>
      </div>
    </div>
  `;
}
function challengeById(id){ return DB.challenges.find(c=>c.id===id); }
function startupById(id){ return DB.startups.find(s=>s.id===id); }
function proposalById(id){ return DB.proposals.find(p=>p.id===id); }

/* ---------------- POST CHALLENGE ---------------- */
function govPostChallenge(page){
  const categories = ['Healthcare','Education','Agriculture','Smart Cities','Environment','Transportation','Cybersecurity','Public Safety','Governance','Miscellaneous'];
  PB = {draft:null, variant:0, images:[], editing:false};
  CF_KPIS = []; CF_CRITERIA = [];
  page.innerHTML = `
    <div class="page-head"><div><h1>Post a New Challenge</h1><p class="sub">Publish a real-world problem statement for eligible startups to solve.</p></div></div>
    <div class="panel" style="max-width:820px;">
      <div class="panel-head"><h3>Where this challenge sits in the lifecycle</h3></div>
      <div class="panel-body pad">${workflowTracker(GOV_WORKFLOW, 0)}</div>
    </div>
    <div style="max-width:820px;">${problemBuilderHTML()}</div>
    <div class="card card-pad" style="max-width:820px;">
      <form id="challengeForm" onsubmit="return submitChallengeForm(event)">
        <div class="field"><label>Challenge Title *</label><input id="c_title" placeholder="e.g. Smart Waste Collection Monitoring" required><div class="err-msg">Please enter a challenge title.</div></div>
        <div class="field-row">
          <div class="field"><label>Government Department *</label><input id="c_dept" placeholder="e.g. Urban Development Department" required><div class="err-msg">Required field.</div></div>
          <div class="field"><label>Category *</label><select id="c_category" required><option value="">Select category</option>${categories.map(c=>`<option>${c}</option>`).join('')}</select><div class="err-msg">Select a category.</div></div>
        </div>
        <div class="field"><label>Problem Description *</label><textarea id="c_desc" placeholder="Describe the core problem in detail" required></textarea><div class="err-msg">Please describe the problem.</div></div>
        <div class="field"><label>Current Situation</label><textarea id="c_current" placeholder="What is the current state / pain point?"></textarea></div>
        <div class="field"><label>Expected Solution</label><textarea id="c_expected" placeholder="What kind of solution are you expecting?"></textarea></div>
        <div class="field-row">
          <div class="field"><label>Target Beneficiaries</label><input id="c_benef" placeholder="e.g. 2 million urban residents"></div>
          <div class="field"><label>Location *</label><input id="c_location" placeholder="e.g. Pune, Maharashtra" required><div class="err-msg">Required field.</div></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Budget Range (Min ₹) *</label><input id="c_budmin" type="number" min="0" placeholder="1500000" required><div class="err-msg">Required field.</div></div>
          <div class="field"><label>Budget Range (Max ₹) *</label><input id="c_budmax" type="number" min="0" placeholder="4000000" required><div class="err-msg">Required field.</div></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Expected Timeline</label><input id="c_timeline" placeholder="e.g. 6 months pilot, 18 months rollout"></div>
          <div class="field"><label>Technology Preference</label><input id="c_tech" placeholder="e.g. IoT, AI/ML, Cloud"></div>
        </div>
        <div class="field"><label>Eligibility Requirements</label><textarea id="c_eligibility" placeholder="e.g. DPIIT-recognised, <8 years old"></textarea><div class="hint">Keep eligibility about what a startup must be able to demonstrate. Age and headcount thresholds screen out capable newer teams.</div></div>
        <div class="field-row">
          <div class="field"><label>Submission Deadline *</label><input id="c_deadline" type="date" required><div class="err-msg">Please select a deadline.</div></div>
          <div class="field"><label>Attachments</label><input id="c_attach" type="file"></div>
        </div>

        <div class="form-section">
          <h4>Measurement</h4>
          <p>What the pilot will be measured against. These become the baseline and target used in before/after reporting.</p>
          <div class="field-row">
            <div class="field"><label>Baseline</label><textarea id="c_baseline" placeholder="e.g. 640 overflow complaints/month; 48-hour average response time"></textarea></div>
            <div class="field"><label>Target</label><textarea id="c_target" placeholder="e.g. Under 250 complaints/month; 24-hour response"></textarea></div>
          </div>
          <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:10px;">
            <label style="font-size:13.5px;font-weight:600;">Key Performance Indicators</label>
            <div class="flex gap-8">
              <button type="button" class="btn btn-secondary btn-sm" onclick="loadKpiTemplate()">Suggest for category</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="addKpiRow()">+ Add KPI</button>
            </div>
          </div>
          <div id="cf_kpiRows"></div>
        </div>

        <div class="form-section">
          <h4>Challenge Evaluation Criteria <span class="badge badge-grey">Optional</span></h4>
          <p>Define what matters for this specific problem. Startups see these before submitting, and reviewers score against them alongside the standard criteria.</p>
          <div class="flex gap-8" style="margin-bottom:12px;flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="loadCriteriaTemplate()">Suggest for category</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addCriterionRow()">+ Add Criterion</button>
          </div>
          <div id="cf_critRows"></div>
          <div class="field mt-16"><label>Evidence Required</label><textarea id="c_evidence" placeholder="One evidence requirement per line — e.g. Working prototype&#10;Field accuracy report"></textarea><div class="hint">One per line. This is what a startup must be able to show, whatever its size or age.</div></div>
        </div>

        <div class="flex gap-12 mt-24">
          <button type="submit" class="btn btn-primary" data-action="publish">Publish Challenge</button>
          <button type="button" class="btn btn-secondary" onclick="submitChallengeForm(null,true)">Save Draft</button>
        </div>
      </form>
    </div>
  `;
  renderKpiRows();
  renderCriteriaRows();
}
async function submitChallengeForm(e, isDraft){
  if(e) e.preventDefault();
  const req = ['c_title','c_dept','c_category','c_desc','c_location','c_budmin','c_budmax','c_deadline'];
  let valid = true;
  if(!isDraft){
    req.forEach(id=>{
      const el = $('#'+id); const field = el.closest('.field');
      if(!el.value){ field.classList.add('error'); valid=false; } else { field.classList.remove('error'); }
    });
    if(!valid){ toast('Please fill all required fields.','error'); return false; }
  }
  const ch = {
    id: uid('ch'), title:$('#c_title').value||'Untitled Challenge', department:$('#c_dept').value||'—',
    category:$('#c_category').value||'Miscellaneous', description:$('#c_desc').value||'',
    currentSituation:$('#c_current').value||'', expectedSolution:$('#c_expected').value||'',
    beneficiaries:$('#c_benef').value||'', location:$('#c_location').value||'—',
    budgetMin:Number($('#c_budmin').value||0), budgetMax:Number($('#c_budmax').value||0),
    timeline:$('#c_timeline').value||'', techPref:$('#c_tech').value||'', eligibility:$('#c_eligibility').value||'',
    deadline: $('#c_deadline').value ? new Date($('#c_deadline').value).toISOString() : new Date(Date.now()+30*86400000).toISOString(),
    status: isDraft? 'Draft':'Open', postedOn: new Date().toISOString(), proposals:0,
    // extended fields
    baseline: ($('#c_baseline')?.value||'').trim(),
    target: ($('#c_target')?.value||'').trim(),
    kpis: (typeof CF_KPIS!=='undefined' ? CF_KPIS : []).filter(k=>k.name && k.name.trim()).map(k=>({
      name:k.name.trim(), unit:k.unit||'', baseline:k.baseline||'', target:k.target||'', dir:k.dir||'down'
    })),
    capabilityCriteria: (typeof CF_CRITERIA!=='undefined' ? CF_CRITERIA : []).filter(c=>c.name && c.name.trim()).map(c=>({
      name:c.name.trim(), weight:Number(c.weight||0), evidence:(c.evidence||'').trim()
    })),
    evidenceRequirements: ($('#c_evidence')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean),
    problemImages: (typeof PB!=='undefined' ? PB.images : []).map(im=>({id:im.id, name:im.name, data:im.data, analysis:im.analysis})),
    aiDraft: (typeof PB!=='undefined' ? PB.draft : null),
    auditTrail: []
  };
  if(!ch.kpis.length) ch.kpis = kpiTemplate(ch.category);
  if(!ch.capabilityCriteria.length) ch.capabilityCriteria = criteriaTemplate(ch.category);
  if(!ch.evidenceRequirements.length) ch.evidenceRequirements = ch.capabilityCriteria.map(c=>c.evidence).filter(Boolean);

  addAudit(ch, `Challenge "${ch.title}" created.`, 'Government');
  if(ch.aiDraft) addAudit(ch, 'Problem statement generated with the assisted builder.', 'Government');
  if(ch.problemImages.length) addAudit(ch, `${ch.problemImages.length} on-ground problem image(s) attached.`, 'Government');
  if(!isDraft) addAudit(ch, 'Challenge published to the startup ecosystem.', 'Government');

  const session=getSession();
  if(session && session.id){
    try{
      const response=await apiFetch('/api/challenges',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          department_id:session.id,department:ch.department,title:ch.title,description:ch.description,
          category:ch.category,location:ch.location,budget_min:ch.budgetMin,budget_max:ch.budgetMax,
          current_situation:ch.currentSituation,expected_solution:ch.expectedSolution,
          beneficiaries:ch.beneficiaries,timeline:ch.timeline,tech_preference:ch.techPref,
          eligibility:ch.eligibility,deadline:$('#c_deadline').value||null,status:ch.status,
          baseline:ch.baseline,target:ch.target,kpis:ch.kpis,capability_criteria:ch.capabilityCriteria,
          evidence_requirements:ch.evidenceRequirements
        })
      });
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||'Challenge could not be saved to the database.');
      ch.databaseId=result.challenge_id;
      ch.id='dbch_'+result.challenge_id;
    }catch(error){
      toast(error.message==='Failed to fetch'?'Cannot reach the backend. Keep the backend terminal running and try again.':error.message,'error');
      return false;
    }
  }

  DB.challenges.unshift(ch);
  addActivity(`Challenge "${ch.title}" ${isDraft?'saved as draft':'published'}.`);
  if(!isDraft) addNotif('startup', `New challenge published: ${ch.title}.`);
  saveDB(DB);
  toast(isDraft? 'Draft saved successfully.':'Challenge published successfully.','success');
  Router.go('/gov/my-challenges');
  return false;
}

/* ---------------- MY CHALLENGES ---------------- */
function govMyChallenges(page){
  renderMyChallengesList(page,{q:'',status:'all',category:'all'});
}
function renderMyChallengesList(page, filters){
  const categories = ['all','Healthcare','Education','Agriculture','Smart Cities','Environment','Transportation','Cybersecurity','Public Safety','Governance','Miscellaneous'];
  let list = DB.challenges.filter(c=>
    (filters.status==='all'||c.status===filters.status) &&
    (filters.category==='all'||c.category===filters.category) &&
    (c.title.toLowerCase().includes(filters.q.toLowerCase()) || c.department.toLowerCase().includes(filters.q.toLowerCase()))
  );
  page.innerHTML = `
    <div class="page-head"><div><h1>My Challenges</h1><p class="sub">${DB.challenges.length} challenge${DB.challenges.length!==1?'s':''} posted so far.</p></div>
      <button class="btn btn-primary" onclick="Router.go('/gov/post-challenge')">+ Post Challenge</button></div>
    <div class="filters-bar">
      <div class="search-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg><input id="mc_search" placeholder="Search by title or department" value="${escapeHtml(filters.q)}"></div>
      <select id="mc_status"><option value="all">All Statuses</option><option ${filters.status==='Open'?'selected':''}>Open</option><option ${filters.status==='Draft'?'selected':''}>Draft</option><option ${filters.status==='Closed'?'selected':''}>Closed</option></select>
      <select id="mc_category">${categories.map(c=>`<option value="${c}" ${filters.category===c?'selected':''}>${c==='all'?'All Categories':c}</option>`).join('')}</select>
    </div>
    <div class="table-wrap card">
      <table class="data-table">
        <thead><tr><th>Title</th><th>Category</th><th>Location</th><th>Budget</th><th>Deadline</th><th>Proposals</th><th>Status</th><th></th></tr></thead>
        <tbody>
        ${list.length? list.map(c=>`
          <tr>
            <td class="td-strong">${escapeHtml(c.title)}</td>
            <td>${c.category}</td>
            <td class="td-muted">${escapeHtml(c.location)}</td>
            <td>${inr(c.budgetMin)}–${inr(c.budgetMax)}</td>
            <td class="td-muted">${fmtDate(c.deadline)}</td>
            <td>${c.proposals}</td>
            <td>${statusBadge(c.status)}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="openChallengeDetails('${c.id}')">View</button></td>
          </tr>`).join('') : `<tr><td colspan="8">${emptyState('No challenges match your filters.')}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  $('#mc_search').addEventListener('input', e=>renderMyChallengesList(page,{...filters,q:e.target.value}));
  $('#mc_status').addEventListener('change', e=>renderMyChallengesList(page,{...filters,status:e.target.value}));
  $('#mc_category').addEventListener('change', e=>renderMyChallengesList(page,{...filters,category:e.target.value}));
}

/* ---------------- CHALLENGE DETAILS MODAL ---------------- */
function openChallengeDetails(id){
  const c = challengeById(id); if(!c) return;
  const session = getSession();
  const canSubmit = session && session.role==='startup';
  openModal(`
    <div class="modal-head">
      <div><span class="dept small text-muted">${escapeHtml(c.department)}</span><h3 style="margin-top:4px;">${escapeHtml(c.title)}</h3></div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="flex gap-8" style="flex-wrap:wrap;margin-bottom:18px;">
        <span class="badge badge-${categoryColor(c.category)}">${c.category}</span>
        ${statusBadge(c.status)}
        <span class="badge badge-grey">📍 ${escapeHtml(c.location)}</span>
      </div>
      <div class="section-mini-title">Problem Statement</div>
      <p style="font-size:14px;color:var(--navy-900);margin-bottom:16px;">${escapeHtml(c.description)}</p>
      ${c.currentSituation?`<div class="section-mini-title">Current Situation</div><p style="font-size:14px;margin-bottom:16px;">${escapeHtml(c.currentSituation)}</p>`:''}
      ${c.expectedSolution?`<div class="section-mini-title">Expected Outcome</div><p style="font-size:14px;margin-bottom:16px;">${escapeHtml(c.expectedSolution)}</p>`:''}
      <div class="divider"></div>
      <div class="field-row">
        <div><div class="section-mini-title">Target Beneficiaries</div><p class="small">${escapeHtml(c.beneficiaries||'—')}</p></div>
        <div><div class="section-mini-title">Budget</div><p class="small">${inr(c.budgetMin)} – ${inr(c.budgetMax)}</p></div>
      </div>
      <div class="field-row mt-16">
        <div><div class="section-mini-title">Timeline</div><p class="small">${escapeHtml(c.timeline||'—')}</p></div>
        <div><div class="section-mini-title">Submission Deadline</div><p class="small">${fmtDate(c.deadline)} (${Math.max(daysUntil(c.deadline),0)} days left)</p></div>
      </div>
      ${c.eligibility?`<div class="mt-16"><div class="section-mini-title">Eligibility Requirements</div><p class="small">${escapeHtml(c.eligibility)}</p></div>`:''}

      ${(c.baseline||c.target)?`<div class="divider"></div>
        <div class="field-row">
          ${c.baseline?`<div><div class="section-mini-title">Baseline</div><p class="small">${escapeHtml(c.baseline)}</p></div>`:''}
          ${c.target?`<div><div class="section-mini-title">Target</div><p class="small">${escapeHtml(c.target)}</p></div>`:''}
        </div>`:''}

      ${(c.kpis||[]).length?`<div class="mt-16"><div class="section-mini-title">Key Performance Indicators</div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>KPI</th><th>Baseline</th><th>Target</th></tr></thead>
          <tbody>${c.kpis.map(k=>`<tr><td class="td-strong">${escapeHtml(k.name)}</td><td>${k.baseline} ${escapeHtml(k.unit||'')}</td><td>${k.target} ${escapeHtml(k.unit||'')}</td></tr>`).join('')}</tbody>
        </table></div></div>`:''}

      ${(c.capabilityCriteria||[]).length?`<div class="mt-16"><div class="section-mini-title">Evaluation Criteria</div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Criterion</th><th>Weight</th><th>Evidence Required</th></tr></thead>
          <tbody>${c.capabilityCriteria.map(x=>`<tr><td class="td-strong">${escapeHtml(x.name)}</td><td>${x.weight}%</td><td class="td-muted">${escapeHtml(x.evidence||'—')}</td></tr>`).join('')}</tbody>
        </table></div></div>`:''}

      ${(c.problemImages||[]).length?`<div class="mt-16"><div class="section-mini-title">On-ground Problem Report</div>
        <div class="img-thumbs">${c.problemImages.map(im=>`<div class="img-preview"><img src="${im.data}" alt="Reported problem"></div>`).join('')}</div>
        ${c.problemImages.filter(im=>im.analysis).map(im=>`<div class="inset mt-16"><p class="small"><b>${escapeHtml(im.analysis.category)}</b> — ${escapeHtml(im.analysis.issue)}. ${escapeHtml(im.analysis.impact)}.</p></div>`).join('')}
      </div>`:''}

      <div class="divider"></div>
      <div class="section-mini-title">Lifecycle Stage</div>
      ${workflowTracker(GOV_WORKFLOW, govWorkflowIndex(c))}

      ${(c.auditTrail||[]).length?`<div class="mt-16"><div class="section-mini-title">Audit Trail</div>${auditTrailHTML(c.auditTrail)}</div>`:''}

      <div class="divider"></div>
      <div class="flex gap-12">
        ${canSubmit?`<button class="btn btn-primary" onclick="closeModal();Router.go('/startup/submit/${c.id}')">Submit Solution</button>`:''}
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      </div>
    </div>
  `);
}

/* ---------------- DISCOVER STARTUPS (capability matching) ---------------- */
function govDiscoverStartups(page, challengeId){
  const open = DB.challenges.filter(c=>c.status==='Open');
  const selected = challengeById(challengeId) || open[0] || DB.challenges[0] || null;
  const ranked = [...DB.startups].map(s=>({s, m:capabilityMatch(s, selected)})).sort((a,b)=>b.m.overall-a.m.overall);

  page.innerHTML = `
    <div class="page-head"><div><h1>Discover Startups</h1><p class="sub">Matched on demonstrated capability for the challenge you select — not on years in business.</p></div></div>
    <div class="filters-bar">
      <div style="flex:1;min-width:240px;">
        <select id="ds_challenge">
          ${DB.challenges.map(c=>`<option value="${c.id}" ${selected&&c.id===selected.id?'selected':''}>${escapeHtml(c.title)}</option>`).join('')}
        </select>
      </div>
      <span class="small text-muted">Match is recalculated against the selected problem.</span>
    </div>
    ${selected?`
      <div class="inset inset-royal" style="margin-bottom:20px;">
        <p class="small"><b>Which startup can demonstrate the capability to solve this problem?</b> Scores below are built from evidence — technology fit, prototype, testing, relevant work, implementation and compliance. Company age, years in business and headcount are shown as context and carry no weight.</p>
        ${(selected.capabilityCriteria||[]).length?`<p class="small mt-8">Weighted by this challenge's own criteria: ${selected.capabilityCriteria.map(c=>`<span class="badge badge-grey" style="margin:2px 4px 2px 0;">${escapeHtml(c.name)} ${c.weight}%</span>`).join('')}</p>`:''}
      </div>`:''}
    <div class="card-grid">
      ${ranked.length ? ranked.map(r=>startupMatchCardHTML(r.s, selected)).join('') : emptyState('No startups registered yet.','🚀')}
    </div>
  `;
  const sel = $('#ds_challenge');
  if(sel) sel.addEventListener('change', e=> govDiscoverStartups(page, e.target.value));
}

/* ---------------- SUBMITTED SOLUTIONS ---------------- */
function govSubmittedSolutions(page){
  const props = DB.proposals;
  page.innerHTML = `
    <div class="page-head"><div><h1>Submitted Solutions</h1><p class="sub">All startup proposals received across your challenges.</p></div></div>
    <div class="table-wrap card">
      <table class="data-table">
        <thead><tr><th>Solution</th><th>Startup</th><th>Challenge</th><th>Submitted</th><th>Est. Cost</th><th>Status</th><th></th></tr></thead>
        <tbody>
        ${props.length? props.map(p=>`
          <tr>
            <td class="td-strong">${escapeHtml(p.solutionName)}</td>
            <td>${escapeHtml(p.startupName)}</td>
            <td class="td-muted">${escapeHtml(challengeById(p.challengeId)?.title||'—')}</td>
            <td class="td-muted">${fmtDate(p.submittedOn)}</td>
            <td>${inr(p.estCost)}</td>
            <td>${statusBadge(p.status)}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="Router.go('/gov/evaluate/${p.id}')">Review</button></td>
          </tr>`).join('') : `<tr><td colspan="7">${emptyState('No solutions submitted yet.','📭')}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

/* ---------------- EVALUATION LIST ---------------- */
function govEvaluationList(page){
  const props = DB.proposals.filter(p=>p.status==='Submitted' || p.status==='Under Evaluation');
  page.innerHTML = `
    <div class="page-head"><div><h1>Evaluation</h1><p class="sub">Review and score startup proposals against transparent criteria.</p></div></div>
    <div class="table-wrap card">
      <table class="data-table">
        <thead><tr><th>Solution</th><th>Startup</th><th>Challenge</th><th>Status</th><th>Score</th><th></th></tr></thead>
        <tbody>
        ${props.length? props.map(p=>`
          <tr>
            <td class="td-strong">${escapeHtml(p.solutionName)}</td>
            <td>${escapeHtml(p.startupName)}</td>
            <td class="td-muted">${escapeHtml(challengeById(p.challengeId)?.title||'—')}</td>
            <td>${statusBadge(p.status)}</td>
            <td>${p.evalTotal? p.evalTotal+'/35' : '—'}</td>
            <td><button class="btn btn-primary btn-sm" onclick="Router.go('/gov/evaluate/${p.id}')">Evaluate</button></td>
          </tr>`).join('') : `<tr><td colspan="6">${emptyState('Nothing pending evaluation right now.','✅')}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

/* ---------------- EVALUATE SINGLE PROPOSAL ---------------- */
const EVAL_CRITERIA = [
  {key:'innovation', label:'Innovation'},
  {key:'feasibility', label:'Technical Feasibility'},
  {key:'cost', label:'Cost Effectiveness'},
  {key:'scalability', label:'Scalability'},
  {key:'impact', label:'Social Impact'},
  {key:'readiness', label:'Implementation Readiness'},
  {key:'compliance', label:'Data / Security Compliance'},
];
function govEvaluateProposal(page, id){
  const p = proposalById(id);
  if(!p){ page.innerHTML = emptyState('Proposal not found.'); return; }
  const ch = challengeById(p.challengeId);
  p.evalScores = p.evalScores || {};
  p.evaluationEvidence = p.evaluationEvidence || {};
  const su = startupById(p.startupId);
  const match = su ? capabilityMatch(su, ch) : null;
  window.__currentEvalProposal = p;
  page.innerHTML = `
    <div class="page-head"><div><h1>${escapeHtml(p.solutionName)}</h1><p class="sub">Submitted by ${escapeHtml(p.startupName)} for "${escapeHtml(ch?.title||'—')}"</p></div>${statusBadge(p.status)}</div>
    <div class="dash-grid">
      <div>
        <div class="panel"><div class="panel-head"><h3>Proposal Details</h3></div>
          <div class="panel-body pad">
            <div class="section-mini-title">Problem Being Solved</div><p class="small mt-8">${escapeHtml(p.problem||'—')}</p>
            <div class="section-mini-title mt-16">Solution Description</div><p class="small mt-8">${escapeHtml(p.description)}</p>
            <div class="section-mini-title mt-16">Innovation / USP</div><p class="small mt-8">${escapeHtml(p.usp||'—')}</p>
            <div class="field-row mt-16">
              <div><div class="section-mini-title">Technology Stack</div><p class="small mt-8">${escapeHtml(p.techStack||'—')}</p></div>
              <div><div class="section-mini-title">Estimated Cost</div><p class="small mt-8">${inr(p.estCost)}</p></div>
            </div>
            <div class="field-row mt-16">
              <div><div class="section-mini-title">Timeline</div><p class="small mt-8">${escapeHtml(p.timeline||'—')}</p></div>
              <div><div class="section-mini-title">Expected Impact</div><p class="small mt-8">${escapeHtml(p.expectedImpact||'—')}</p></div>
            </div>
          </div>
        </div>
        ${(ch?.capabilityCriteria||[]).length?`
        <div class="panel"><div class="panel-head">
          <div><h3>Challenge-Specific Criteria (1–5)</h3><p class="small text-muted mt-8">Defined by the department for this problem.</p></div>
          ${weightedCriteriaScore(p,ch)?`<span class="badge badge-royal">${weightedCriteriaScore(p,ch).pct}% weighted</span>`:''}
        </div>
          <div class="panel-body pad">
            ${ch.capabilityCriteria.map((c,i)=> evalCriterionBlockHTML(p, 'cc_'+i, c.name, p.evalScores['cc_'+i], c.evidence, c.weight)).join('')}
          </div>
        </div>`:''}
        <div class="panel"><div class="panel-head">
          <div><h3>Evaluation Criteria (1–5)</h3><p class="small text-muted mt-8">Every score carries its evidence, reviewer and timestamp.</p></div>
        </div>
          <div class="panel-body pad">
            ${EVAL_CRITERIA.map(c=> evalCriterionBlockHTML(p, c.key, c.label, p.evalScores[c.key], '', 0)).join('')}
            <div class="divider"></div>
            <div class="flex" style="justify-content:space-between;align-items:center;">
              <span style="font-weight:700;">Total Score</span>
              <span style="font-family:var(--font-head);font-size:22px;font-weight:800;color:var(--royal-600);" id="evalTotalDisplay">${evalTotal(p)}/35</span>
            </div>
            <div class="field mt-16"><label>Comments</label><textarea id="evalComments" placeholder="Reviewer notes and recommendation">${escapeHtml(p.evalComments||'')}</textarea></div>
          </div>
        </div>
      </div>
      <div>
        <div class="panel"><div class="panel-head"><h3>Startup Snapshot</h3></div>
          <div class="panel-body pad">
            <p class="small" style="font-weight:700;">${escapeHtml(p.startupName)}</p>
            <p class="small text-muted mt-8">${escapeHtml(p.teamDetails||'Team details not provided.')}</p>
            ${su?`
              <div class="divider"></div>
              <div class="cap-score"><span class="big">${match.overall}%</span><span class="cap-out">Capability Match</span></div>
              <div class="mt-16">${capabilityBarsHTML(match.dims)}</div>
              <div class="flex gap-8 mt-16" style="flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm" onclick="showWhyMatch('${su.id}','${p.challengeId}')">Why this match?</button>
                <button class="btn btn-secondary btn-sm" onclick="openEvidencePassport('${su.id}','${p.id}')">Evidence Passport</button>
              </div>`:''}
          </div>
        </div>
        <div class="panel"><div class="panel-head">
          <div><h3>Evidence Passport</h3></div>
          <span class="small text-muted">${(p.evidence||[]).length + ((su?.evidence)||[]).length} items</span>
        </div>
          <div class="panel-body pad">${evidenceListHTML([...(p.evidence||[]), ...((su?.evidence)||[])].slice(0,6), 'No evidence submitted with this proposal.')}</div>
        </div>
        ${(ch?.evidenceRequirements||[]).length?`
        <div class="panel"><div class="panel-head"><h3>Evidence Required by This Challenge</h3></div>
          <div class="panel-body pad">
            ${ch.evidenceRequirements.map(r=>`<div class="small" style="margin-bottom:8px;padding-left:16px;position:relative;"><span style="position:absolute;left:0;color:var(--royal-600);">·</span>${escapeHtml(r)}</div>`).join('')}
          </div>
        </div>`:''}
        <div class="panel"><div class="panel-head"><h3>Decision</h3></div>
          <div class="panel-body pad" style="display:flex;flex-direction:column;gap:10px;">
            <button class="btn btn-primary btn-block" onclick="decideProposal('${p.id}','Approved')">Approve for Pilot</button>
            <button class="btn btn-secondary btn-block" onclick="decideProposal('${p.id}','Under Evaluation')">Request More Information</button>
            <button class="btn btn-danger btn-block" onclick="decideProposal('${p.id}','Rejected')">Reject</button>
          </div>
        </div>
        <div class="panel"><div class="panel-head"><h3>Lifecycle</h3></div><div class="panel-body pad">${pipelineTracker(p.status)}</div></div>
        <div class="panel"><div class="panel-head"><h3>Audit Trail</h3></div><div class="panel-body pad">${auditTrailHTML(p.auditTrail)}</div></div>
      </div>
    </div>
  `;
}
function evalTotal(p){ return EVAL_CRITERIA.reduce((sum,c)=> sum + (p.evalScores?.[c.key]||0), 0); }
function setEvalScore(id, key, val){
  const p = proposalById(id); p.evalScores = p.evalScores||{}; p.evalScores[key]=val;
  saveDB(DB);
  $(`.rate-group[data-key="${key}"]`).querySelectorAll('button').forEach(b=>b.classList.toggle('active', Number(b.dataset.val)<=val));
  $('#evalTotalDisplay').textContent = evalTotal(p)+'/35';
}
function decideProposal(id, decision){
  const p = proposalById(id); if(!p) return;
  p.evalTotal = evalTotal(p);
  p.evalComments = $('#evalComments') ? $('#evalComments').value : p.evalComments;
  p.status = decision;
  if(decision==='Approved') p.status='Pilot'; // approved directly enters pilot per workflow

  const reviewer = currentReviewer();
  const withEvidence = Object.keys(p.evaluationEvidence||{}).filter(k=>(p.evaluationEvidence[k].evidence||'').trim()).length;
  addAudit(p, `Evaluation recorded: ${p.evalTotal}/35 with evidence on ${withEvidence} criteri${withEvidence===1?'on':'a'}.`, reviewer);
  addAudit(p, `Decision: ${p.status}.`, reviewer);
  const ch = challengeById(p.challengeId);
  if(ch) addAudit(ch, `Proposal "${p.solutionName}" marked ${p.status}.`, reviewer);
  if(p.status==='Pilot'){
    ensurePilot(p);
    addAudit(p.pilot, 'Pilot created following approval.', reviewer);
  }
  saveDB(DB);
  addActivity(`Proposal "${p.solutionName}" marked ${p.status}.`);
  addNotif('startup', `Your proposal "${p.solutionName}" is now: ${p.status}.`);
  toast(`Proposal ${p.status.toLowerCase()}.`, decision==='Rejected'?'error':'success');
  Router.go('/gov/evaluation');
}

/* ---------------- PILOTS ---------------- */
function govPilots(page){
  const pilots = DB.proposals.filter(p=>['Pilot','Procurement','Scaled'].includes(p.status));
  page.innerHTML = `
    <div class="page-head"><div><h1>Pilot Projects</h1><p class="sub">Controlled pilots with baseline, target and measured evidence before any procurement decision.</p></div>
      <button class="btn btn-secondary" onclick="Router.go('/gov/outcomes')">Outcome Records</button></div>
    ${pilots.length? pilots.map(p=> pilotPanelHTML(p,'government')).join('')
      : `<div class="panel"><div class="panel-body pad">${emptyState('No pilots running yet. Approve a proposal in Evaluation to start one.','🧪')}</div></div>`}
  `;
}
function advanceStage(id,newStatus){
  const p = proposalById(id); p.status = newStatus; saveDB(DB);
  addActivity(`"${p.solutionName}" moved to ${newStatus}.`);
  addNotif('startup', `"${p.solutionName}" has moved to: ${newStatus}.`);
  toast(`Moved to ${newStatus}.`,'success');
  renderAppPage(Router.current(), getSession());
}

/* ---------------- PROCUREMENT (Kanban) ---------------- */
const PROCUREMENT_STAGES = ['Pilot','Procurement','Scaled'];
function govProcurement(page){
  const inScope = DB.proposals.filter(p=>PROCUREMENT_STAGES.includes(p.status));
  page.innerHTML = `
    <div class="page-head"><div><h1>Procurement Pipeline</h1><p class="sub">Kanban view of every solution moving from pilot to scaled deployment.</p></div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
      ${PROCUREMENT_STAGES.map(stage=>`
        <div>
          <div class="section-mini-title">${stage==='Pilot'?'Pilot / POC':stage} (${inScope.filter(p=>p.status===stage).length})</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${inScope.filter(p=>p.status===stage).map(p=>`
              <div class="card card-pad">
                <p style="font-weight:700;font-size:13.8px;">${escapeHtml(p.solutionName)}</p>
                <p class="small text-muted mt-8">${escapeHtml(p.startupName)}</p>
                <p class="small text-muted mt-8">${escapeHtml(challengeById(p.challengeId)?.department||'—')}</p>
                <div class="flex" style="justify-content:space-between;margin-top:10px;">
                  <span class="small">${inr(p.estCost)}</span>
                  <span class="small text-muted">${fmtDate(p.submittedOn)}</span>
                </div>
                ${stage!=='Scaled'?`<button class="btn btn-secondary btn-sm btn-block mt-16" onclick="advanceStage('${p.id}','${stage==='Pilot'?'Procurement':'Scaled'}')">Advance →</button>`:''}
              </div>
            `).join('') || `<div class="card card-pad small text-muted" style="text-align:center;">Nothing here yet.</div>`}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ---------------- SCALE & DEPLOYMENT ---------------- */
function govScale(page){
  const scaled = DB.proposals.filter(p=>p.status==='Scaled');
  page.innerHTML = `
    <div class="page-head"><div><h1>Scale & Deployment</h1><p class="sub">Solutions that have proven themselves in pilot and procurement, now deployed at scale.</p></div></div>
    <div class="table-wrap card">
      <table class="data-table">
        <thead><tr><th>Solution</th><th>Startup</th><th>Department</th><th>Est. Cost</th><th>Deployed</th></tr></thead>
        <tbody>
        ${scaled.length? scaled.map(p=>`
          <tr><td class="td-strong">${escapeHtml(p.solutionName)}</td><td>${escapeHtml(p.startupName)}</td>
          <td class="td-muted">${escapeHtml(challengeById(p.challengeId)?.department||'—')}</td>
          <td>${inr(p.estCost)}</td><td class="td-muted">${fmtDate(p.submittedOn)}</td></tr>
        `).join('') : `<tr><td colspan="5">${emptyState('No solutions scaled yet. Advance procurement items to see them here.','📈')}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

/* ---------------- ANALYTICS ---------------- */
function govAnalytics(page){
  const cats = {};
  DB.challenges.forEach(c=> cats[c.category] = (cats[c.category]||0)+1);
  const catEntries = Object.entries(cats);
  const maxCat = Math.max(1,...catEntries.map(e=>e[1]));

  const props = DB.proposals;
  const total = props.length||1;
  const submitted = props.length;
  const evaluated = props.filter(p=>p.status!=='Submitted').length;
  const piloted = props.filter(p=>['Pilot','Procurement','Scaled'].includes(p.status)).length;
  const scaled = props.filter(p=>p.status==='Scaled').length;
  const conversionSteps = [
    {l:'Submitted', v:submitted}, {l:'Evaluated', v:evaluated}, {l:'Piloted', v:piloted}, {l:'Scaled', v:scaled}
  ];
  const maxConv = Math.max(1,...conversionSteps.map(s=>s.v));

  const pilotSuccessRate = piloted ? Math.round((scaled/piloted)*100) : 0;

  page.innerHTML = `
    <div class="page-head"><div><h1>Analytics</h1><p class="sub">Live insights computed from your GovBridge activity.</p></div></div>
    <div class="kpi-grid">
      ${kpiCard(ICN.target,'royal', DB.challenges.reduce((s,c)=>s+(c.beneficiariesNum||0),0) || (12+'.5M+'), 'Citizens Benefited (est.)')}
      ${kpiCard(ICN.trophy,'green', inr(scaled*2500000), 'Estimated Cost Savings')}
      ${kpiCard(ICN.clock,'amber', '4.5 months', 'Average Pilot Duration')}
      ${kpiCard(ICN.cart,'saffron', scaled, 'Solutions Successfully Deployed')}
    </div>
    <div class="dash-grid">
      <div class="panel"><div class="panel-head"><h3>Challenges by Category</h3></div>
        <div class="panel-body pad">
          <div class="bar-chart">
            ${catEntries.length? catEntries.map(([cat,n])=>`
              <div class="bar-col"><div class="bar-val">${n}</div><div class="bar" style="height:${(n/maxCat)*140}px;"></div><div class="bar-lbl">${cat}</div></div>
            `).join('') : emptyState('No data yet.')}
          </div>
        </div>
      </div>
      <div class="panel"><div class="panel-head"><h3>Pilot Success Rate</h3></div>
        <div class="panel-body pad" style="text-align:center;">
          <div style="font-family:var(--font-head);font-size:42px;font-weight:800;color:var(--green-600);">${pilotSuccessRate}%</div>
          <p class="small text-muted mt-8">${scaled} of ${piloted||0} piloted solutions scaled successfully</p>
          <div class="progress-bar mt-16"><div style="width:${pilotSuccessRate}%;background:var(--green-600);"></div></div>
        </div>
      </div>
    </div>
    <div class="panel"><div class="panel-head"><h3>Proposal Conversion Funnel</h3></div>
      <div class="panel-body pad">
        <div class="bar-chart" style="height:150px;">
          ${conversionSteps.map(s=>`<div class="bar-col"><div class="bar-val">${s.v}</div><div class="bar" style="height:${(s.v/maxConv)*110}px;"></div><div class="bar-lbl">${s.l}</div></div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ---------------- NOTIFICATIONS PAGE ---------------- */
function notificationsPage(page, role){
  const list = DB.notifications.filter(n=>n.forRole===role).sort((a,b)=>new Date(b.time)-new Date(a.time));
  page.innerHTML = `
    <div class="page-head"><div><h1>Notifications</h1><p class="sub">Stay on top of everything happening in your pipeline.</p></div>
    <button class="btn btn-secondary" onclick="clearAllNotifs();renderAppPage('${Router.current()}',getSession())">Mark all read</button></div>
    <div class="panel"><div class="panel-body">
      ${list.length? list.map(n=>`
        <div class="row-item">
          <div class="ric">${n.read?'✓':'●'}</div>
          <div class="rtxt"><div class="t1" style="white-space:normal;">${escapeHtml(n.text)}</div><div class="t2">${new Date(n.time).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div></div>
        </div>`).join('') : emptyState("You're all caught up.",'🔔')}
    </div></div>
  `;
}

/* ---------------- GOV SETTINGS ---------------- */
function govSettings(page){
  const session = getSession();
  page.innerHTML = `
    <div class="page-head"><div><h1>Settings</h1><p class="sub">Manage your department account.</p></div></div>
    <div class="card card-pad" style="max-width:560px;">
      <div class="field"><label>Department Name</label><input value="${escapeHtml(session.dept)}" disabled></div>
      <div class="field"><label>Contact Email</label><input value="${escapeHtml(session.email)}" disabled></div>
      <div class="field"><label>Role</label><input value="Government Officer" disabled></div>
      <p class="small text-muted">This is a frontend prototype — account settings are read-only demo data.</p>
      <button class="btn btn-danger mt-16" onclick="handleLogout()">Log out</button>
    </div>
  `;
}

/* ============================================================
   STARTUP — DASHBOARD
   ============================================================ */
function startupDashboard(page){
  const session = getSession();
  const myProps = DB.proposals.filter(p=>p.startupId===session.startupId);
  const openChallenges = DB.challenges.filter(c=>c.status==='Open');
  const kpis = {
    available: openChallenges.length,
    submitted: myProps.length,
    underEval: myProps.filter(p=>p.status==='Under Evaluation'||p.status==='Submitted').length,
    pilots: myProps.filter(p=>p.status==='Pilot').length,
    procurement: myProps.filter(p=>p.status==='Procurement').length,
    scaled: myProps.filter(p=>p.status==='Scaled').length
  };
  const recommended = openChallenges.slice(0,3);
  page.innerHTML = `
    <div class="page-head">
      <div><h1>Welcome back, ${escapeHtml(session.name)}</h1><p class="sub">Here's your current pipeline on GovBridge.</p></div>
      <button class="btn btn-primary" onclick="Router.go('/startup/browse')">Browse Challenges</button>
    </div>
    <div class="kpi-grid">
      ${kpiCard(ICN.target,'royal',kpis.available,'Available Challenges')}
      ${kpiCard(ICN.inbox,'saffron',kpis.submitted,'Submitted Proposals')}
      ${kpiCard(ICN.clock,'amber',kpis.underEval,'Under Evaluation')}
      ${kpiCard(ICN.flask,'royal',kpis.pilots,'Pilots')}
      ${kpiCard(ICN.cart,'green',kpis.procurement,'Procurement Stage')}
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><h3>Your Workflow</h3><p class="small text-muted mt-8">${myProps[0]?'Current stage for "'+escapeHtml(myProps[0].solutionName)+'"':'From browsing a challenge through to scale.'}</p></div>
        <button class="link-btn small" onclick="Router.go('/startup/profile')">Capability profile</button>
      </div>
      <div class="panel-body pad">${workflowTracker(STARTUP_WORKFLOW, myProps[0]?startupWorkflowIndex(myProps[0]):0)}</div>
    </div>
    <div class="dash-grid">
      <div>
        <div class="panel"><div class="panel-head"><h3>Recommended Government Challenges</h3><button class="link-btn small" onclick="Router.go('/startup/recommended')">View all</button></div>
          <div class="panel-body">
            ${recommended.length? recommended.map(c=>`
              <div class="row-item"><div class="ric">🏛️</div>
                <div class="rtxt"><div class="t1">${escapeHtml(c.title)}</div><div class="t2">${c.category} · ${escapeHtml(c.location)}</div></div>
                <button class="btn btn-secondary btn-sm" onclick="openChallengeDetails('${c.id}')">View</button>
              </div>`).join('') : emptyState('No open challenges right now.')}
          </div>
        </div>
        <div class="panel"><div class="panel-head"><h3>My Proposal Status</h3><button class="link-btn small" onclick="Router.go('/startup/proposals')">View all</button></div>
          <div class="panel-body">
            ${myProps.length? myProps.slice(0,4).map(p=>`
              <div class="row-item"><div class="ric">📄</div>
                <div class="rtxt"><div class="t1">${escapeHtml(p.solutionName)}</div><div class="t2">${escapeHtml(challengeById(p.challengeId)?.title||'—')}</div></div>
                ${statusBadge(p.status)}
              </div>`).join('') : emptyState("You haven't submitted any proposals yet.")}
          </div>
        </div>
      </div>
      <div>
        <div class="panel"><div class="panel-head"><h3>Pilot Progress</h3></div>
          <div class="panel-body pad">
            ${myProps.filter(p=>['Pilot','Procurement','Scaled'].includes(p.status)).length ?
              myProps.filter(p=>['Pilot','Procurement','Scaled'].includes(p.status)).map(p=>`<p class="small" style="font-weight:600;margin-bottom:6px;">${escapeHtml(p.solutionName)}</p>${pipelineTracker(p.status)}`).join('<div class="divider"></div>')
              : emptyState('No active pilots yet.','🧪')}
          </div>
        </div>
        <div class="panel"><div class="panel-head"><h3>Activity</h3></div><div class="panel-body pad">${activityTimelineHTML(DB.activity)}</div></div>
      </div>
    </div>
  `;
}

/* ---------------- BROWSE CHALLENGES ---------------- */
function startupBrowse(page){
  renderBrowseList(page, {q:'',category:'all',budget:'all',location:'all',sort:'newest'});
}
function renderBrowseList(page, f){
  const categories = ['all','Healthcare','Education','Agriculture','Smart Cities','Environment','Transportation','Cybersecurity','Public Safety','Governance','Miscellaneous'];
  const locations = ['all', ...new Set(DB.challenges.map(c=>c.location))];
  let list = DB.challenges.filter(c=>c.status==='Open');
  if(f.q) list = list.filter(c=>c.title.toLowerCase().includes(f.q.toLowerCase())||c.department.toLowerCase().includes(f.q.toLowerCase()));
  if(f.category!=='all') list = list.filter(c=>c.category===f.category);
  if(f.location!=='all') list = list.filter(c=>c.location===f.location);
  if(f.budget!=='all'){
    if(f.budget==='low') list = list.filter(c=>c.budgetMax<=2000000);
    if(f.budget==='mid') list = list.filter(c=>c.budgetMax>2000000 && c.budgetMax<=5000000);
    if(f.budget==='high') list = list.filter(c=>c.budgetMax>5000000);
  }
  if(f.sort==='newest') list.sort((a,b)=>new Date(b.postedOn)-new Date(a.postedOn));
  if(f.sort==='deadline') list.sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  if(f.sort==='budget') list.sort((a,b)=>b.budgetMax-a.budgetMax);

  page.innerHTML = `
    <div class="page-head"><div><h1>Browse Challenges</h1><p class="sub">${list.length} open challenge${list.length!==1?'s':''} matching your filters.</p></div></div>
    <div class="filters-bar">
      <div class="search-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg><input id="bc_search" placeholder="Search challenges" value="${escapeHtml(f.q)}"></div>
      <select id="bc_category">${categories.map(c=>`<option value="${c}" ${f.category===c?'selected':''}>${c==='all'?'All Categories':c}</option>`).join('')}</select>
      <select id="bc_budget"><option value="all">Any Budget</option><option value="low" ${f.budget==='low'?'selected':''}>Up to ₹20L</option><option value="mid" ${f.budget==='mid'?'selected':''}>₹20L–₹50L</option><option value="high" ${f.budget==='high'?'selected':''}>Above ₹50L</option></select>
      <select id="bc_location">${locations.map(l=>`<option value="${l}" ${f.location===l?'selected':''}>${l==='all'?'All Locations':l}</option>`).join('')}</select>
      <select id="bc_sort"><option value="newest" ${f.sort==='newest'?'selected':''}>Newest</option><option value="deadline" ${f.sort==='deadline'?'selected':''}>Deadline</option><option value="budget" ${f.sort==='budget'?'selected':''}>Budget</option></select>
    </div>
    <div class="card-grid">
      ${list.length? list.map(c=>challengeCardHTML(c,'startup')).join('') : `<div style="grid-column:1/-1;">${emptyState('No challenges match your filters. Try broadening your search.','🔍')}</div>`}
    </div>
  `;
  ['bc_search','bc_category','bc_budget','bc_location','bc_sort'].forEach(id=>{
    $('#'+id).addEventListener(id==='bc_search'?'input':'change', e=>{
      const nf = {...f}; 
      if(id==='bc_search') nf.q=e.target.value;
      if(id==='bc_category') nf.category=e.target.value;
      if(id==='bc_budget') nf.budget=e.target.value;
      if(id==='bc_location') nf.location=e.target.value;
      if(id==='bc_sort') nf.sort=e.target.value;
      renderBrowseList(page, nf);
    });
  });
}

function startupRecommended(page){
  const session = getSession();
  const startup = startupById(session.startupId) || {};
  const profileKey = `govbridge_recommendation_profile_${session.id||session.startupId}`;
  let profile = {};
  try{ profile=JSON.parse(localStorage.getItem(profileKey)||'{}'); }catch(_error){}
  page.innerHTML = `
    <div class="page-head"><div><h1>Recommended Challenges</h1><p class="sub">AI will match open challenges to your startup profile. Add a few details to improve the recommendations.</p></div></div>
    <div class="card card-pad" style="margin-bottom:20px;">
      <div class="field-row">
        <div class="field"><label for="recIndustry">Industry / domain</label><input id="recIndustry" value="${escapeHtml(profile.industry||startup.industry||'')}" placeholder="e.g. Agriculture, healthcare"></div>
        <div class="field"><label for="recTechnology">Technology / solution</label><input id="recTechnology" value="${escapeHtml(profile.technology||startup.technology||'')}" placeholder="e.g. IoT sensors, computer vision"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="recCapabilities">What your team can build or deliver</label><textarea id="recCapabilities" rows="3" placeholder="Skills, product, deployment capacity">${escapeHtml(profile.capabilities||'')}</textarea></div>
        <div class="field"><label for="recEvidence">Relevant work / evidence</label><textarea id="recEvidence" rows="3" placeholder="Prototype, pilots, results, certifications">${escapeHtml(profile.evidence||'')}</textarea></div>
      </div>
      <button class="btn btn-primary" id="getRecommendationsBtn" type="button">Get recommendations</button>
      <span class="small text-muted" id="recommendationMode" style="margin-left:12px;"></span>
      <p class="small text-muted mt-8">When AI matching is enabled, your startup details and public challenge descriptions are sent to the AI service. Login details are never sent.</p>
    </div>
    <div class="card-grid" id="recommendationResults">${emptyState('Add your profile details and choose Get recommendations.')}</div>
  `;
  $('#getRecommendationsBtn').addEventListener('click',()=>{
    $('#recommendationResults').dataset.loaded='true';
    loadStartupRecommendations(session,profileKey);
  });
  loadStartupProfileFromDatabase(session,profileKey);
  if(profile.industry||profile.technology||profile.capabilities||profile.evidence){
    $('#recommendationResults').dataset.loaded='true';
    loadStartupRecommendations(session,profileKey);
  }
}

async function loadStartupProfileFromDatabase(session,profileKey){
  if(!session.id) return;
  try{
    const response=await apiFetch(`/api/startups/${encodeURIComponent(session.id)}/profile`);
    if(!response.ok) return;
    const data=await response.json(), saved=data.profile||{};
    const profile={industry:saved.industry||'',technology:saved.technology||'',
      capabilities:saved.capabilities||'',evidence:saved.evidence||''};
    if(!Object.values(profile).some(Boolean)) return;
    localStorage.setItem(profileKey,JSON.stringify(profile));
    for(const [key,id] of Object.entries({industry:'recIndustry',technology:'recTechnology',capabilities:'recCapabilities',evidence:'recEvidence'})){
      const field=$('#'+id); if(field) field.value=profile[key];
    }
    if(!$('#recommendationResults').dataset.loaded){
      $('#recommendationResults').dataset.loaded='true';
      loadStartupRecommendations(session,profileKey);
    }
  }catch(_error){ /* Keep the browser's saved copy usable if MySQL is unavailable. */ }
}

async function loadStartupRecommendations(session,profileKey){
  const profile={
    name:session.organizationName||session.name||'',
    industry:$('#recIndustry').value.trim(), technology:$('#recTechnology').value.trim(),
    capabilities:$('#recCapabilities').value.trim(), evidence:$('#recEvidence').value.trim()
  };
  localStorage.setItem(profileKey,JSON.stringify(profile));
  const button=$('#getRecommendationsBtn'), results=$('#recommendationResults'), mode=$('#recommendationMode');
  button.disabled=true; button.textContent='Finding matches…'; mode.textContent='';
  results.innerHTML='<div class="small text-muted">Comparing your profile with open challenges…</div>';
  if(!session.demo){
    try{
      await apiFetch(`/api/startups/${encodeURIComponent(session.id)}/profile`,{
        method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(profile)
      });
    }catch(_error){ /* Recommendations still work with the local profile copy. */ }
  }
  const challenges=DB.challenges.filter(c=>c.status==='Open').map(c=>({
    id:c.databaseId||c.id,title:c.title,category:c.category,description:c.description,
    expected_solution:c.expectedSolution,technology:c.techPref,eligibility:c.eligibility,
    beneficiaries:c.beneficiaries,criteria:c.capabilityCriteria
  }));
  const renderRanked=(ranked,label)=>{
    const byId=new Map(challenges.map(c=>[String(c.id),c]));
    mode.textContent=label;
    results.innerHTML=ranked.length?ranked.map(item=>{
      const challenge=byId.get(String(item.challenge_id));
      const local=DB.challenges.find(c=>String(c.databaseId||c.id)===String(item.challenge_id));
      if(!challenge||!local) return '';
      return `<div><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin:4px 2px 8px;">
        <span class="badge badge-royal">${Math.max(0,Math.min(100,Number(item.score)||0))}% match</span>
        <span class="small text-muted">${escapeHtml(item.reason||'Relevant to your startup profile.')}</span>
      </div>${challengeCardHTML(local,'startup')}</div>`;
    }).join('') : emptyState('No open challenges are available right now.');
  };
  try{
    if(session.demo) throw new Error('Demo mode uses local keyword matching.');
    const response=await apiFetch('/api/recommendations',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({startup:profile,challenges})
    });
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||'Could not get recommendations.');
    renderRanked(data.recommendations||[],data.mode==='gemini'?'AI matched these challenges':'Keyword matching (AI unavailable)');
  }catch(error){
    const terms=value=>new Set(String(value||'').toLowerCase().match(/[a-z0-9]{3,}/g)||[]);
    const profileText=[profile.industry,profile.technology,profile.capabilities,profile.evidence].join(' ');
    const profileTerms=terms(profileText);
    const localRanked=challenges.map(challenge=>{
      const words=terms([challenge.title,challenge.category,challenge.description,challenge.expected_solution,
        challenge.technology,challenge.eligibility,challenge.beneficiaries].join(' '));
      const matches=[...profileTerms].filter(word=>words.has(word));
      return {challenge_id:String(challenge.id),score:Math.round(100*matches.length/Math.max(1,words.size)),
        reason:matches.length?`Related terms: ${matches.slice(0,5).join(', ')}`:'Review challenge details for fit.'};
    }).sort((a,b)=>b.score-a.score);
    renderRanked(localRanked,session.demo?'Local keyword matching (demo)':'Local keyword matching (backend unavailable)');
  }finally{button.disabled=false;button.textContent='Get recommendations';}
}

/* ---------------- MY PROPOSALS ---------------- */
function startupProposals(page){
  const session = getSession();
  const list = DB.proposals.filter(p=>p.startupId===session.startupId);
  page.innerHTML = `
    <div class="page-head"><div><h1>My Proposals</h1><p class="sub">Track every solution you've submitted.</p></div></div>
    <div class="table-wrap card">
      <table class="data-table">
        <thead><tr><th>Solution</th><th>Challenge</th><th>Submitted</th><th>Est. Cost</th><th>Status</th><th></th></tr></thead>
        <tbody>
        ${list.length? list.map(p=>`
          <tr><td class="td-strong">${escapeHtml(p.solutionName)}</td>
          <td class="td-muted">${escapeHtml(challengeById(p.challengeId)?.title||'—')}</td>
          <td class="td-muted">${fmtDate(p.submittedOn)}</td><td>${inr(p.estCost)}</td>
          <td>${statusBadge(p.status)}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="viewProposalTracker('${p.id}')">Track</button></td></tr>
        `).join('') : `<tr><td colspan="6">${emptyState("You haven't submitted any proposals yet. Browse open challenges to get started.",'📄')}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}
function viewProposalTracker(id){
  const p = proposalById(id);
  const ch = challengeById(p.challengeId);
  const scoredWithEvidence = Object.entries(p.evaluationEvidence||{}).filter(([k,v])=>(v.evidence||'').trim());
  openModal(`
    <div class="modal-head"><div><h3>${escapeHtml(p.solutionName)}</h3><p class="small text-muted mt-8">${escapeHtml(ch?.title||'—')}</p></div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">${pipelineTracker(p.status)}
      <div class="divider"></div>
      <div class="section-mini-title">Your Journey</div>
      ${workflowTracker(STARTUP_WORKFLOW, startupWorkflowIndex(p))}
      ${p.evalComments?`<div class="divider"></div><div class="section-mini-title">Reviewer Comments</div><p class="small mt-8">${escapeHtml(p.evalComments)}</p>`:''}
      ${scoredWithEvidence.length?`
        <div class="divider"></div>
        <div class="section-mini-title">Evidence Behind Your Scores</div>
        ${scoredWithEvidence.map(([k,v])=>`
          <div class="inset mt-8">
            <div class="k small" style="font-weight:700;">${escapeHtml(criterionLabel(k))} — ${(p.evalScores||{})[k]||0}/5</div>
            <p class="small mt-8">${escapeHtml(v.evidence)}</p>
            <p class="small text-muted mt-8">${escapeHtml(v.reviewer||'Reviewer')}${v.time?' · '+fmtDate(v.time):''}${v.type?' · '+escapeHtml(v.type)+' evidence':''}</p>
          </div>`).join('')}`:''}
      ${p.pilot && p.pilot.outcomeStatus!=='Pending Verification'?`
        <div class="divider"></div>
        <div class="section-mini-title">Verified Outcome</div>
        <div class="inset">${outcomeBadge(p.pilot.outcomeStatus)}
          ${p.pilot.verification?.notes?`<p class="small mt-8">${escapeHtml(p.pilot.verification.notes)}</p>`:''}
          ${p.pilot.lessonsLearned?`<p class="small mt-8"><b>Lessons learned:</b> ${escapeHtml(p.pilot.lessonsLearned)}</p>`:''}
        </div>`:''}
      <div class="divider"></div>
      <div class="flex" style="justify-content:space-between;align-items:center;">
        <div class="section-mini-title" style="margin-bottom:0;">Supporting Evidence</div>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();openAddProposalEvidence('${p.id}')">Add Evidence</button>
      </div>
      <div class="inset mt-16">${evidenceListHTML(p.evidence, 'No evidence attached to this proposal yet.')}</div>
      <div class="divider"></div>
      <div class="section-mini-title">Audit Trail</div>
      ${auditTrailHTML(p.auditTrail)}
    </div>
  `);
}

/* ---------------- SUBMIT SOLUTION ---------------- */
function startupSubmit(page, challengeId){
  const c = challengeById(challengeId);
  const session = getSession();
  const startup = startupById(session.startupId);
  if(!c){ page.innerHTML = emptyState('Challenge not found.'); return; }
  page.innerHTML = `
    <div class="page-head"><div><h1>Submit Solution</h1><p class="sub">For: <b>${escapeHtml(c.title)}</b> — ${escapeHtml(c.department)}</p></div></div>

    <div class="panel" style="max-width:820px;">
      <div class="panel-head"><h3>Where you are in the process</h3></div>
      <div class="panel-body pad">${workflowTracker(STARTUP_WORKFLOW, 4)}</div>
    </div>

    <div class="panel" style="max-width:820px;">
      <div class="panel-head"><h3>Understand the Problem</h3><span class="badge badge-${categoryColor(c.category)}">${c.category}</span></div>
      <div class="panel-body pad">
        <p class="small">${escapeHtml(c.description)}</p>
        <div class="kv-grid mt-16">
          ${c.baseline?`<div class="kv"><div class="k">Baseline</div><div class="v">${escapeHtml(c.baseline)}</div></div>`:''}
          ${c.target?`<div class="kv"><div class="k">Target</div><div class="v">${escapeHtml(c.target)}</div></div>`:''}
          ${c.beneficiaries?`<div class="kv"><div class="k">Beneficiaries</div><div class="v">${escapeHtml(c.beneficiaries)}</div></div>`:''}
          <div class="kv"><div class="k">Budget</div><div class="v">${inr(c.budgetMin)} – ${inr(c.budgetMax)}</div></div>
        </div>
        ${(c.kpis||[]).length?`<div class="kv mt-16"><div class="k">KPIs you will be measured on</div><div class="v">${c.kpis.map(k=>`<span class="badge badge-royal" style="margin:2px 4px 2px 0;">${escapeHtml(k.name)}${k.baseline!==''&&k.baseline!==undefined?` · ${k.baseline}→${k.target} ${escapeHtml(k.unit||'')}`:''}</span>`).join('')}</div></div>`:''}
        ${c.eligibility?`<div class="divider"></div><div class="section-mini-title">Check Eligibility</div><p class="small">${escapeHtml(c.eligibility)}</p>`:''}
        ${(c.capabilityCriteria||[]).length?`
          <div class="divider"></div>
          <div class="section-mini-title">Review Evaluation Criteria</div>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Criterion</th><th>Weight</th><th>Evidence Required</th></tr></thead>
            <tbody>${c.capabilityCriteria.map(x=>`<tr><td class="td-strong">${escapeHtml(x.name)}</td><td>${x.weight}%</td><td class="td-muted">${escapeHtml(x.evidence||'—')}</td></tr>`).join('')}</tbody>
          </table></div>`:''}
      </div>
    </div>

    <div class="card card-pad" style="max-width:820px;">
      <form id="proposalForm" onsubmit="return submitProposalForm(event,'${c.id}',false)">

        <div class="form-section">
          <h4>Solution Overview</h4>
          <p>The essentials a reviewer reads first.</p>
          <div class="field"><label>Startup Name *</label><input id="p_startup" value="${escapeHtml(startup?.name||session.organizationName||session.name)}" required></div>
          <div class="field"><label>Solution Name *</label><input id="p_name" placeholder="Name your solution" required><div class="err-msg">Required field.</div></div>
          <div class="field"><label>Problem Understanding *</label><textarea id="p_problem" placeholder="Restate the problem in your own words" required></textarea><div class="err-msg">Required field.</div></div>
          <div class="field"><label>Solution Description *</label><textarea id="p_desc" placeholder="Describe your proposed solution in detail" required></textarea><div class="err-msg">Required field.</div></div>
          <div class="field"><label>Proposed Approach</label><textarea id="p_approach" placeholder="How you would go about solving it, step by step"></textarea></div>
          <div class="field"><label>Innovation / USP</label><textarea id="p_usp" placeholder="What makes this solution unique?"></textarea></div>
        </div>

        <div class="form-section">
          <h4>Capability & Evidence</h4>
          <p>What you can already demonstrate. This carries more weight than how long you have been in business.</p>
          <div class="field-row">
            <div class="field"><label>Technology</label><input id="p_tech" placeholder="e.g. React Native, TensorFlow, AWS"></div>
            <div class="field"><label>Prototype Status</label><input id="p_prototype" placeholder="e.g. Working prototype in field use since 2024"></div>
          </div>
          <div class="field"><label>Testing / Validation Evidence</label><textarea id="p_testing" placeholder="e.g. 91% accuracy across 42,000 labelled field images"></textarea></div>
          <div class="field"><label>Relevant Work</label><textarea id="p_prev" placeholder="Relevant past work, with scale and outcome"></textarea></div>
          <div class="field"><label>Team</label><textarea id="p_team" placeholder="Key team members, roles and what they have built before"></textarea></div>
          <div class="field"><label>Security / Compliance</label><textarea id="p_security" placeholder="Certifications, data handling, consent and hosting"></textarea></div>
          <div class="field"><label>Supporting Evidence</label><textarea id="p_evidence" placeholder="One item per line — e.g. Field accuracy report&#10;ISO 27001 certificate"></textarea><div class="hint">One per line. Each becomes an item on your evidence passport for this proposal.</div></div>
        </div>

        <div class="form-section">
          <h4>Delivery & Pilot</h4>
          <p>How the pilot would actually run, and what it would cost.</p>
          <div class="field"><label>Implementation Plan</label><textarea id="p_plan" placeholder="High-level rollout plan"></textarea></div>
          <div class="field"><label>Pilot Plan</label><textarea id="p_pilotplan" placeholder="Sites, duration, how you would measure against the baseline"></textarea></div>
          <div class="field-row">
            <div class="field"><label>Expected Outcome</label><input id="p_impact" placeholder="e.g. 40% faster resolution time"></div>
            <div class="field"><label>Timeline</label><input id="p_timeline" placeholder="e.g. 3 months pilot"></div>
          </div>
          <div class="field"><label>Estimated Cost / Budget (₹) *</label><input id="p_cost" type="number" min="0" placeholder="2000000" required><div class="err-msg">Required field.</div></div>
          <div class="field"><label>Documents</label><input type="file" id="p_docs"></div>
        </div>

        <div class="flex gap-12 mt-24">
          <button type="submit" class="btn btn-primary">Submit Proposal</button>
          <button type="button" class="btn btn-secondary" onclick="submitProposalForm(null,'${c.id}',true)">Save Draft</button>
          <button type="button" class="btn btn-ghost" onclick="Router.go('/startup/browse')">Cancel</button>
        </div>
      </form>
    </div>
  `;
}
async function submitProposalForm(e, challengeId, isDraft){
  if(e) e.preventDefault();
  const req = ['p_name','p_problem','p_desc','p_cost'];
  let valid = true;
  if(!isDraft){
    req.forEach(id=>{ const el=$('#'+id); const f=el.closest('.field'); if(!el.value){f.classList.add('error');valid=false;} else f.classList.remove('error'); });
    if(!valid){ toast('Please fill all required fields.','error'); return false; }
  }
  const session = getSession();
  const prop = {
    id: uid('pr'), challengeId, startupId: session.startupId, startupName: $('#p_startup').value||session.name,
    solutionName: $('#p_name').value||'Untitled Solution', problem: $('#p_problem').value||'',
    description: $('#p_desc').value||'', usp: $('#p_usp').value||'', techStack: $('#p_tech').value||'',
    estCost: Number($('#p_cost').value||0), implementationPlan: $('#p_plan').value||'',
    expectedImpact: $('#p_impact').value||'', timeline: $('#p_timeline').value||'',
    prevProjects: $('#p_prev').value||'', teamDetails: $('#p_team').value||'',
    status: isDraft?'Draft':'Submitted', submittedOn: new Date().toISOString(), evalScores:{},
    // extended fields
    approach: $('#p_approach')?.value||'', prototypeStatus: $('#p_prototype')?.value||'',
    testingEvidence: $('#p_testing')?.value||'', securityCompliance: $('#p_security')?.value||'',
    pilotPlan: $('#p_pilotplan')?.value||'',
    evaluationEvidence:{}, auditTrail:[],
    evidence: ($('#p_evidence')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean).map(t=>({
      id:uid('ev'), type:'Document', title:t, description:'Submitted with the proposal.',
      status:'Available', date:new Date().toISOString(), verified:false
    }))
  };
  const testing = ($('#p_testing')?.value||'').trim();
  if(testing) prop.evidence.push({id:uid('ev'), type:'Testing', title:'Testing / validation summary', description:testing, status:'Available', date:new Date().toISOString(), verified:false});
  const proto = ($('#p_prototype')?.value||'').trim();
  if(proto) prop.evidence.push({id:uid('ev'), type:'Prototype', title:'Prototype status', description:proto, status:'Available', date:new Date().toISOString(), verified:false});

  addAudit(prop, `Solution "${prop.solutionName}" ${isDraft?'saved as draft':'submitted'}.`, prop.startupName);
  if(prop.evidence.length) addAudit(prop, `${prop.evidence.length} evidence item(s) attached.`, prop.startupName);

  const ch=challengeById(challengeId);
  if(ch && ch.databaseId && session.id){
    try{
      const response=await apiFetch('/api/proposals',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          challenge_id:ch.databaseId,startup_id:session.id,solution_title:prop.solutionName,
          description:prop.description,problem:prop.problem,usp:prop.usp,tech_stack:prop.techStack,
          estimated_cost:prop.estCost,implementation_plan:prop.implementationPlan,
          expected_impact:prop.expectedImpact,timeline:prop.timeline,previous_projects:prop.prevProjects,
          team_details:prop.teamDetails,approach:prop.approach,prototype_status:prop.prototypeStatus,
          testing_evidence:prop.testingEvidence,security_compliance:prop.securityCompliance,
          pilot_plan:prop.pilotPlan,evidence:prop.evidence,status:prop.status
        })
      });
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||'Proposal could not be saved to the database.');
      prop.databaseId=result.proposal_id;
      prop.id='dbpr_'+result.proposal_id;
    }catch(error){
      toast(error.message==='Failed to fetch'?'Cannot reach the backend. Keep the backend terminal running and try again.':error.message,'error');
      return false;
    }
  }

  DB.proposals.unshift(prop);
  if(ch) ch.proposals = (ch.proposals||0)+1;
  if(ch && !isDraft) addAudit(ch, `${prop.startupName} submitted "${prop.solutionName}".`, prop.startupName);
  addActivity(`${prop.startupName} submitted "${prop.solutionName}" for "${ch?.title}".`);
  addNotif('government', `New solution submitted for ${ch?.title}.`);
  saveDB(DB);
  toast(isDraft?'Draft saved.':'Proposal submitted successfully.','success');
  Router.go('/startup/proposals');
  return false;
}

/* ---------------- STARTUP PILOTS / PROCUREMENT / PERFORMANCE ---------------- */
function startupPilots(page){
  const session = getSession();
  const list = DB.proposals.filter(p=>p.startupId===session.startupId && ['Pilot','Procurement','Scaled'].includes(p.status));
  page.innerHTML = `
    <div class="page-head"><div><h1>Pilot Projects</h1><p class="sub">Record measurements and submit evidence for your running pilots.</p></div></div>
    ${list.length? list.map(p=> pilotPanelHTML(p,'startup')).join('')
      : `<div class="panel"><div class="panel-body pad">${emptyState('No pilots yet. Get a proposal approved to start one.','🧪')}</div></div>`}
  `;
}
function startupProcurement(page){
  const session = getSession();
  const list = DB.proposals.filter(p=>p.startupId===session.startupId && ['Procurement','Scaled'].includes(p.status));
  page.innerHTML = `
    <div class="page-head"><div><h1>Procurement</h1><p class="sub">Solutions of yours moving through government procurement.</p></div></div>
    <div class="table-wrap card"><table class="data-table">
      <thead><tr><th>Solution</th><th>Department</th><th>Est. Cost</th><th>Status</th></tr></thead>
      <tbody>${list.length? list.map(p=>`<tr><td class="td-strong">${escapeHtml(p.solutionName)}</td><td class="td-muted">${escapeHtml(challengeById(p.challengeId)?.department||'—')}</td><td>${inr(p.estCost)}</td><td>${statusBadge(p.status)}</td></tr>`).join('') : `<tr><td colspan="4">${emptyState('Nothing in procurement yet.','🛒')}</td></tr>`}</tbody>
    </table></div>
  `;
}
function startupPerformance(page){
  const session = getSession();
  const list = DB.proposals.filter(p=>p.startupId===session.startupId);
  const total = list.length||1;
  const scaled = list.filter(p=>p.status==='Scaled').length;
  const rejected = list.filter(p=>p.status==='Rejected').length;
  const successRate = list.length ? Math.round((scaled/list.length)*100) : 0;
  page.innerHTML = `
    <div class="page-head"><div><h1>Performance</h1><p class="sub">How your proposals have performed on GovBridge.</p></div></div>
    <div class="kpi-grid">
      ${kpiCard(ICN.inbox,'royal',list.length,'Total Proposals')}
      ${kpiCard(ICN.trophy,'green',scaled,'Scaled Deployments')}
      ${kpiCard(ICN.clock,'amber',list.filter(p=>['Submitted','Under Evaluation'].includes(p.status)).length,'Under Review')}
      ${kpiCard(ICN.target,'red',rejected,'Rejected')}
    </div>
    <div class="panel"><div class="panel-head"><h3>Success Rate</h3></div>
      <div class="panel-body pad" style="text-align:center;">
        <div style="font-family:var(--font-head);font-size:42px;font-weight:800;color:var(--royal-600);">${successRate}%</div>
        <div class="progress-bar mt-16"><div style="width:${successRate}%;"></div></div>
      </div>
    </div>
  `;
}

/* ---------------- STARTUP PROFILE ---------------- */
function startupProfile(page){
  const session = getSession();
  const s = startupById(session.startupId) || {};
  page.innerHTML = `
    <div class="page-head"><div><h1>Startup Profile</h1><p class="sub">This is how government reviewers see your organisation.</p></div>${s.verified?'<span class="badge badge-green">✓ Verified Startup</span>':'<span class="badge badge-grey">Verification Pending</span>'}</div>
    <div class="card card-pad" style="max-width:760px;">
      <div class="field-row">
        <div class="field"><label>Startup Name</label><input value="${escapeHtml(s.name||'')}" disabled></div>
        <div class="field"><label>Founder</label><input value="${escapeHtml(s.founder||'')}" disabled></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Industry</label><input value="${escapeHtml(s.industry||'')}" disabled></div>
        <div class="field"><label>Founded Year</label><input value="${s.founded||''}" disabled></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Location</label><input value="${escapeHtml(s.location||'')}" disabled></div>
        <div class="field"><label>Website</label><input value="${escapeHtml(s.website||'')}" disabled></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Team Size</label><input value="${s.teamSize||''}" disabled></div>
        <div class="field"><label>Technology</label><input value="${escapeHtml(s.technology||'')}" disabled></div>
      </div>
      <div class="field"><label>Previous Projects</label><textarea disabled>${escapeHtml(s.prevProjects||'')}</textarea></div>
      <div class="field"><label>Government Experience</label><textarea disabled>${escapeHtml(s.govExperience||'')}</textarea></div>
      <div class="field-row">
        <div class="field"><label>Certifications</label><input value="${escapeHtml(s.certifications||'')}" disabled></div>
        <div class="field"><label>Funding / Scale</label><input value="${escapeHtml(s.funding||'')}" disabled></div>
      </div>
      <p class="small text-muted">This is a frontend prototype — the fields above are read-only demo data. Your capability profile below is editable and is what reviewers actually assess.</p>
      <button class="btn btn-danger mt-16" onclick="handleLogout()">Log out</button>
    </div>

    <div class="panel mt-24" style="max-width:760px;">
      <div class="panel-head">
        <div><h3>Capability Profile</h3><p class="small text-muted mt-8">What you can demonstrate for a specific problem — this drives matching, not your company age.</p></div>
      </div>
      <div class="panel-body pad">
        <div class="inset inset-royal" style="margin-bottom:18px;">
          <p class="small">A newer startup with a working prototype, test results and a capable team can rank above an older one without them. Back each capability with evidence.</p>
        </div>
        ${CAP_FIELDS.map(f=>{
          const c = (s.capability||{})[f.key] || {score:0,note:''};
          return `
          <div style="padding:14px 0;border-bottom:1px solid var(--grey-100);">
            <div class="flex" style="justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <span class="small" style="font-weight:600;">${f.label}</span>
              <div class="flex items-center gap-8">
                <input id="cap_score_${f.key}" type="number" min="0" max="100" value="${c.score||0}" style="width:84px;padding:7px 9px;border:1px solid var(--grey-300);border-radius:var(--radius-sm);font-family:inherit;font-size:13.5px;">
                <span class="small text-muted">/ 100</span>
              </div>
            </div>
            <div class="progress-bar mt-8"><div style="width:${c.score||0}%;background:${(c.score||0)>=80?'var(--green-600)':((c.score||0)>=65?'var(--royal-600)':'var(--amber-600)')};"></div></div>
            <div class="field mt-8" style="margin-bottom:8px;">
              <textarea id="cap_note_${f.key}" placeholder="Evidence for this capability — what you have built, tested or deployed, with numbers." style="min-height:58px;">${escapeHtml(c.note||'')}</textarea>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="saveCapabilityField('${s.id}','${f.key}')">Add / Update Capability</button>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="panel mt-24" style="max-width:760px;">
      <div class="panel-head">
        <div><h3>Evidence Passport</h3><p class="small text-muted mt-8">Everything a government reviewer can check, in one place.</p></div>
        <button class="btn btn-primary btn-sm" onclick="openAddEvidence('${s.id}')">Add Evidence</button>
      </div>
      <div class="panel-body pad">${evidenceListHTML(s.evidence, 'No evidence added yet. Start with your prototype and any testing results.')}</div>
    </div>
  `;
}

/* ============================================================
   GOVBRIDGE — EXTENDED UI (builder, capability, pilots, audit)
   ============================================================ */

/* ---------------- AI-assisted Problem Builder state ---------------- */
let PB = {draft:null, variant:0, images:[], editing:false};

function problemBuilderHTML(){
  return `
  <div class="panel" id="pbPanel">
    <div class="panel-head">
      <div>
        <h3>AI-Assisted Problem Builder</h3>
        <p class="small text-muted mt-8">Describe the problem in plain language. The builder turns it into a structured challenge you can publish.</p>
      </div>
      <span class="badge badge-saffron">Assisted Draft</span>
    </div>
    <div class="panel-body pad">
      <div class="field">
        <label>Describe the real-world problem *</label>
        <textarea id="pb_input" placeholder="e.g. Garbage collection vehicles are following fixed routes and bins often overflow."></textarea>
        <div class="hint">Write it the way you would explain it to a colleague. Detail helps, but a sentence is enough.</div>
      </div>
      <div class="flex gap-12" style="flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" onclick="pbGenerate()">Generate Problem Statement</button>
        <button type="button" class="btn btn-secondary" onclick="pbToggleImages()" id="pb_imgToggle">Report Problem with Image</button>
      </div>

      <div id="pb_imageArea" style="display:none;" class="mt-24">
        <div class="divider"></div>
        <div class="section-mini-title">On-ground Problem Report</div>
        <div class="img-drop">
          <p style="margin-bottom:12px;">Upload a photo of the problem, or take one directly on a phone or tablet.</p>
          <input type="file" accept="image/*" capture="environment" id="pb_file" onchange="pbHandleImage(event)" style="max-width:320px;margin:0 auto;">
          <p class="small text-muted" style="margin-top:10px;">Up to 3 images. Images are stored locally in this browser only.</p>
        </div>
        <div class="field mt-16">
          <label>What does the image show? (optional)</label>
          <input id="pb_imgHint" placeholder="e.g. broken road surface near the bus stand">
          <div class="hint">A short note improves the simulated analysis. Leave it blank to analyse from the image alone.</div>
        </div>
        <div id="pb_imgList" class="mt-16"></div>
      </div>

      <div id="pb_draftArea" class="mt-24"></div>
    </div>
  </div>`;
}

function pbToggleImages(){
  const area = $('#pb_imageArea');
  const open = area.style.display !== 'none';
  area.style.display = open ? 'none' : 'block';
  $('#pb_imgToggle').textContent = open ? 'Report Problem with Image' : 'Hide Image Report';
}

function pbHandleImage(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(PB.images.length >= 3){ toast('You can attach up to 3 images.','error'); e.target.value=''; return; }
  const reader = new FileReader();
  reader.onload = (ev)=>{
    downscaleImage(ev.target.result, 640, (dataUrl)=>{
      PB.images.push({id:uid('img'), name:file.name, data:dataUrl, analysis:null});
      pbRenderImages();
      toast('Image added. Run analysis to convert it into structured problem information.','success');
    });
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function downscaleImage(dataUrl, maxSide, cb){
  const img = new Image();
  img.onload = ()=>{
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
    try{
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', 0.72));
    }catch(err){ cb(dataUrl); }
  };
  img.onerror = ()=> cb(dataUrl);
  img.src = dataUrl;
}

function pbRenderImages(){
  const host = $('#pb_imgList'); if(!host) return;
  if(!PB.images.length){ host.innerHTML = ''; return; }
  host.innerHTML = PB.images.map((im,i)=>`
    <div class="card card-pad" style="margin-bottom:14px;">
      <div class="flex gap-12" style="flex-wrap:wrap;align-items:flex-start;">
        <div class="img-preview" style="max-width:190px;"><img src="${im.data}" alt="Reported problem image"></div>
        <div style="flex:1;min-width:220px;">
          <p class="small" style="font-weight:600;">${escapeHtml(im.name||'Image '+(i+1))}</p>
          <div class="flex gap-8 mt-16" style="flex-wrap:wrap;">
            <button type="button" class="btn btn-primary btn-sm" onclick="pbAnalyzeImage('${im.id}')">${im.analysis?'Re-analyse Image':'Analyse Image'}</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="pbRemoveImage('${im.id}')">Remove</button>
          </div>
        </div>
      </div>
      ${im.analysis ? `
        <div class="inset inset-royal mt-16">
          <div class="kv-grid">
            <div class="kv"><div class="k">Detected Category</div><div class="v">${escapeHtml(im.analysis.category)}</div></div>
            <div class="kv"><div class="k">Observed Issue</div><div class="v">${escapeHtml(im.analysis.issue)}</div></div>
            <div class="kv"><div class="k">Possible Impact</div><div class="v">${escapeHtml(im.analysis.impact)}</div></div>
            <div class="kv"><div class="k">Suggested Intervention</div><div class="v">${escapeHtml(im.analysis.intervention)}</div></div>
          </div>
          <div class="kv mt-16"><div class="k">Possible KPIs</div><div class="v">${im.analysis.kpis.map(k=>`<span class="badge badge-grey" style="margin:2px 4px 2px 0;">${escapeHtml(k)}</span>`).join('')}</div></div>
          <p class="small text-muted mt-16">Simulated analysis · indicative confidence ${im.analysis.confidence}% · ${escapeHtml(im.analysis.note)}</p>
          <button type="button" class="btn btn-saffron btn-sm mt-16" onclick="pbAddAnalysisToProblem('${im.id}')">Add to Problem</button>
        </div>` : ''}
    </div>`).join('');
}

function pbAnalyzeImage(id){
  const im = PB.images.find(x=>x.id===id); if(!im) return;
  const hint = $('#pb_imgHint') ? $('#pb_imgHint').value : '';
  im.analysis = simulateImageAnalysis(im.name, hint);
  pbRenderImages();
  toast('Image analysed. Review the observation before using it.','success');
}
function pbRemoveImage(id){
  PB.images = PB.images.filter(x=>x.id!==id);
  pbRenderImages();
  toast('Image removed.','info');
}
function pbAddAnalysisToProblem(id){
  const im = PB.images.find(x=>x.id===id); if(!im || !im.analysis) return;
  const box = $('#pb_input');
  const a = im.analysis;
  const line = `Observed on site: ${a.issue.toLowerCase()} (${a.category}). Impact: ${a.impact.toLowerCase()}. Possible intervention: ${a.intervention.toLowerCase()}.`;
  box.value = (box.value.trim() ? box.value.trim()+'\n\n' : '') + line;
  toast('Observation added to the problem description.','success');
  box.focus();
}

async function pbGenerate(){
  const text = $('#pb_input').value.trim();
  if(text.length < 12){ toast('Describe the problem in a little more detail first.','error'); return; }
  PB.variant = 0;
  PB.editing = false;
  PB.draft = buildProblemDraft(text, 0);
  PB.aiMode = 'rules';
  pbRenderDraft();
  try{
    if(window.GOVBRIDGE_DEMO_MODE) throw new Error('Demo mode uses the local drafting template.');
    const response=await apiFetch('/api/ai/problem-draft',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({description:text})
    });
    if(response.ok){
      const data=await response.json();
      if(data.mode==='gemini' && data.draft){PB.draft=data.draft;PB.aiMode='gemini';pbRenderDraft();}
    }
  }catch(_error){ /* Keep the local template draft available if the AI service is offline. */ }
  toast(PB.aiMode==='gemini'?'Gemini drafted the challenge. Review every field before publishing.':window.GOVBRIDGE_DEMO_MODE?'Demo template draft generated. Review every field before using it.':'Template draft generated. Configure Gemini to use AI drafting.','info');
}
function pbRegenerate(){
  if(!PB.draft) return;
  PB.variant = (PB.variant + 1) % 3;
  PB.editing = false;
  PB.aiMode = 'rules';
  PB.draft = buildProblemDraft(PB.draft.sourceText, PB.variant);
  pbRenderDraft();
  toast('Alternative framing generated.','info');
}
function pbEdit(){ PB.editing = true; pbRenderDraft(); }
function pbSaveEdits(){
  const d = PB.draft; if(!d) return;
  const get = (id)=> $('#'+id) ? $('#'+id).value : '';
  d.title = get('pbe_title'); d.problemStatement = get('pbe_problem');
  d.currentSituation = get('pbe_current'); d.desiredOutcome = get('pbe_outcome');
  d.beneficiaries = get('pbe_benef'); d.baseline = get('pbe_baseline'); d.target = get('pbe_target');
  d.technicalRequirements = get('pbe_tech'); d.constraints = get('pbe_constraints');
  d.technologyAreas = get('pbe_techareas'); d.pilotDuration = get('pbe_duration');
  d.kpis = get('pbe_kpis').split('\n').map(s=>s.trim()).filter(Boolean);
  d.evidenceRequired = get('pbe_evidence').split('\n').map(s=>s.trim()).filter(Boolean);
  d.budgetMin = Number(get('pbe_budmin')||0); d.budgetMax = Number(get('pbe_budmax')||0);
  PB.editing = false;
  pbRenderDraft();
  toast('Draft updated.','success');
}

function pbRenderDraft(){
  const host = $('#pb_draftArea'); if(!host) return;
  const d = PB.draft;
  if(!d){ host.innerHTML=''; return; }

  if(PB.editing){
    host.innerHTML = `
      <div class="divider"></div>
      <div class="section-mini-title">Edit Generated Statement</div>
      <div class="field"><label>Challenge Title</label><input id="pbe_title" value="${escapeHtml(d.title)}"></div>
      <div class="field"><label>Problem Statement</label><textarea id="pbe_problem">${escapeHtml(d.problemStatement)}</textarea></div>
      <div class="field"><label>Current Situation</label><textarea id="pbe_current">${escapeHtml(d.currentSituation)}</textarea></div>
      <div class="field"><label>Desired Outcome</label><textarea id="pbe_outcome">${escapeHtml(d.desiredOutcome)}</textarea></div>
      <div class="field"><label>Beneficiaries</label><input id="pbe_benef" value="${escapeHtml(d.beneficiaries)}"></div>
      <div class="field-row">
        <div class="field"><label>Baseline</label><textarea id="pbe_baseline">${escapeHtml(d.baseline)}</textarea></div>
        <div class="field"><label>Target</label><textarea id="pbe_target">${escapeHtml(d.target)}</textarea></div>
      </div>
      <div class="field"><label>Technical Requirements</label><textarea id="pbe_tech">${escapeHtml(d.technicalRequirements)}</textarea></div>
      <div class="field"><label>Constraints</label><textarea id="pbe_constraints">${escapeHtml(d.constraints)}</textarea></div>
      <div class="field-row">
        <div class="field"><label>Technology Areas</label><input id="pbe_techareas" value="${escapeHtml(d.technologyAreas)}"></div>
        <div class="field"><label>Pilot Duration</label><input id="pbe_duration" value="${escapeHtml(d.pilotDuration)}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Indicative Budget — Min (₹)</label><input id="pbe_budmin" type="number" value="${d.budgetMin}"></div>
        <div class="field"><label>Indicative Budget — Max (₹)</label><input id="pbe_budmax" type="number" value="${d.budgetMax}"></div>
      </div>
      <div class="field"><label>KPIs (one per line)</label><textarea id="pbe_kpis">${escapeHtml(d.kpis.join('\n'))}</textarea></div>
      <div class="field"><label>Evidence Required (one per line)</label><textarea id="pbe_evidence">${escapeHtml(d.evidenceRequired.join('\n'))}</textarea></div>
      <div class="flex gap-12">
        <button type="button" class="btn btn-primary" onclick="pbSaveEdits()">Save Changes</button>
        <button type="button" class="btn btn-secondary" onclick="PB.editing=false;pbRenderDraft()">Cancel</button>
      </div>`;
    return;
  }

  host.innerHTML = `
    <div class="divider"></div>
    <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <div class="section-mini-title" style="margin-bottom:0;">Generated Problem Statement</div>
      <span class="badge badge-royal">${escapeHtml(d.category)}</span>
    </div>
    <div class="inset mt-16">
      <div class="kv" style="margin-bottom:14px;"><div class="k">Challenge Title</div><div class="v" style="font-weight:700;font-size:15px;">${escapeHtml(d.title)}</div></div>
      <div class="kv" style="margin-bottom:14px;"><div class="k">Problem Statement</div><div class="v">${escapeHtml(d.problemStatement)}</div></div>
      <div class="kv-grid">
        <div class="kv"><div class="k">Current Situation</div><div class="v">${escapeHtml(d.currentSituation)}</div></div>
        <div class="kv"><div class="k">Desired Outcome</div><div class="v">${escapeHtml(d.desiredOutcome)}</div></div>
        <div class="kv"><div class="k">Beneficiaries</div><div class="v">${escapeHtml(d.beneficiaries)}</div></div>
        <div class="kv"><div class="k">Technology Areas</div><div class="v">${escapeHtml(d.technologyAreas)}</div></div>
        <div class="kv"><div class="k">Baseline</div><div class="v">${escapeHtml(d.baseline)}</div></div>
        <div class="kv"><div class="k">Target</div><div class="v">${escapeHtml(d.target)}</div></div>
        <div class="kv"><div class="k">Technical Requirements</div><div class="v">${escapeHtml(d.technicalRequirements)}</div></div>
        <div class="kv"><div class="k">Constraints</div><div class="v">${escapeHtml(d.constraints)}</div></div>
        <div class="kv"><div class="k">Pilot Duration</div><div class="v">${escapeHtml(d.pilotDuration)}</div></div>
        <div class="kv"><div class="k">Indicative Budget</div><div class="v">${inr(d.budgetMin)} – ${inr(d.budgetMax)}</div></div>
      </div>
      <div class="kv mt-16"><div class="k">KPIs</div><div class="v">${d.kpis.map(k=>`<span class="badge badge-royal" style="margin:2px 4px 2px 0;">${escapeHtml(k)}</span>`).join('')}</div></div>
      <div class="kv mt-16"><div class="k">Evidence Required</div><div class="v">${d.evidenceRequired.map(k=>`<span class="badge badge-grey" style="margin:2px 4px 2px 0;">${escapeHtml(k)}</span>`).join('')}</div></div>
    </div>
    <div class="flex gap-12 mt-16" style="flex-wrap:wrap;">
      <button type="button" class="btn btn-primary" onclick="pbUseStatement()">Use This Statement</button>
      <button type="button" class="btn btn-secondary" onclick="pbRegenerate()">Regenerate</button>
      <button type="button" class="btn btn-secondary" onclick="pbEdit()">Edit</button>
    </div>
    <p class="small text-muted mt-16">${PB.aiMode==='gemini'?'Drafted with Gemini. Verify facts, baseline, budget and requirements before publishing.':'Generated with local templates. Add a Gemini API key to enable AI drafting.'} Review every field before publishing.</p>`;
}

function pbUseStatement(){
  const d = PB.draft; if(!d) return;
  const set = (id,val)=>{ const el = $('#'+id); if(el && val!==undefined && val!==null) el.value = val; };
  set('c_title', d.title);
  set('c_desc', d.problemStatement);
  set('c_current', d.currentSituation);
  set('c_expected', d.desiredOutcome);
  set('c_benef', d.beneficiaries);
  set('c_tech', d.technologyAreas);
  set('c_budmin', d.budgetMin);
  set('c_budmax', d.budgetMax);
  set('c_timeline', d.pilotDuration + ' pilot');
  set('c_baseline', d.baseline);
  set('c_target', d.target);
  set('c_evidence', d.evidenceRequired.join('\n'));
  const cat = $('#c_category');
  if(cat){ Array.from(cat.options).forEach(o=>{ if(o.value===d.category) cat.value = d.category; }); }

  // KPI rows from the draft
  CF_KPIS = d.kpis.map(name=>({name, unit:'', baseline:'', target:'', dir:'down'}));
  renderKpiRows();
  // Criteria: keep whatever is there, seed from category template if untouched
  if(!CF_CRITERIA.length){ CF_CRITERIA = criteriaTemplate(d.category); renderCriteriaRows(); }

  toast('Challenge form filled from the generated statement.','success');
  const form = $('#challengeForm');
  if(form) form.scrollIntoView({behavior:'smooth', block:'start'});
}

/* ---------------- KPI + criteria editors on Post Challenge ---------------- */
let CF_KPIS = [];
let CF_CRITERIA = [];

function renderKpiRows(){
  const host = $('#cf_kpiRows'); if(!host) return;
  host.innerHTML = CF_KPIS.length ? CF_KPIS.map((k,i)=>`
    <div class="crit-row">
      <input placeholder="KPI name" value="${escapeHtml(k.name||'')}" oninput="CF_KPIS[${i}].name=this.value">
      <input placeholder="Baseline" value="${escapeHtml(String(k.baseline??''))}" oninput="CF_KPIS[${i}].baseline=this.value">
      <input placeholder="Target (and unit)" value="${escapeHtml(String(k.target??''))}" oninput="CF_KPIS[${i}].target=this.value">
      <button type="button" class="crit-del" onclick="CF_KPIS.splice(${i},1);renderKpiRows()" aria-label="Remove KPI">✕</button>
    </div>`).join('') : `<p class="small text-muted" style="margin-bottom:10px;">No KPIs added yet. KPIs become the baseline/target measures used in the pilot.</p>`;
}
function addKpiRow(){ CF_KPIS.push({name:'',unit:'',baseline:'',target:'',dir:'down'}); renderKpiRows(); }

function renderCriteriaRows(){
  const host = $('#cf_critRows'); if(!host) return;
  host.innerHTML = CF_CRITERIA.length ? CF_CRITERIA.map((c,i)=>`
    <div class="crit-row">
      <input placeholder="Criterion" value="${escapeHtml(c.name||'')}" oninput="CF_CRITERIA[${i}].name=this.value">
      <input placeholder="Weight %" type="number" min="0" max="100" value="${c.weight??''}" oninput="CF_CRITERIA[${i}].weight=Number(this.value)">
      <input placeholder="Evidence required" value="${escapeHtml(c.evidence||'')}" oninput="CF_CRITERIA[${i}].evidence=this.value">
      <button type="button" class="crit-del" onclick="CF_CRITERIA.splice(${i},1);renderCriteriaRows()" aria-label="Remove criterion">✕</button>
    </div>`).join('') + `<p class="small ${criteriaWeightTotal()===100?'text-muted':''}" style="color:${criteriaWeightTotal()===100?'':'var(--amber-600)'};">Total weight: ${criteriaWeightTotal()}%${criteriaWeightTotal()===100?'':' — weights usually add up to 100%.'}</p>`
    : `<p class="small text-muted" style="margin-bottom:10px;">No criteria defined. The standard evaluation criteria will be used on their own.</p>`;
}
function criteriaWeightTotal(){ return CF_CRITERIA.reduce((s,c)=>s+Number(c.weight||0),0); }
function addCriterionRow(){ CF_CRITERIA.push({name:'',weight:0,evidence:''}); renderCriteriaRows(); }
function loadCriteriaTemplate(){
  const cat = $('#c_category') ? $('#c_category').value : '';
  CF_CRITERIA = criteriaTemplate(cat || 'Miscellaneous');
  renderCriteriaRows();
  toast('Loaded a starting set of criteria for this category.','info');
}
function loadKpiTemplate(){
  const cat = $('#c_category') ? $('#c_category').value : '';
  CF_KPIS = kpiTemplate(cat || 'Miscellaneous').map(k=>({name:k.name, unit:k.unit, baseline:k.baseline, target:k.target, dir:k.dir}));
  renderKpiRows();
  toast('Loaded suggested KPIs for this category.','info');
}

/* ---------------- Capability match card (Discover Startups) ---------------- */
function startupMatchCardHTML(s, challenge){
  const m = capabilityMatch(s, challenge);
  const colour = m.overall>=80 ? 'green' : (m.overall>=65 ? 'royal' : 'amber');
  return `
  <div class="ch-card">
    <div class="flex" style="justify-content:space-between;align-items:flex-start;">
      <span class="dept">${escapeHtml(s.industry)}</span>
      ${s.verified?'<span class="badge badge-green">✓ Verified</span>':'<span class="badge badge-grey">Unverified</span>'}
    </div>
    <h3>${escapeHtml(s.name)}</h3>
    <div class="flex items-center gap-12" style="justify-content:space-between;">
      <div class="cap-score"><span class="big" style="color:var(--${colour}-600);">${m.overall}%</span><span class="cap-out">Capability Match</span></div>
      <span class="badge badge-${colour}">${m.verifiedCount}/${m.evidenceCount} evidence verified</span>
    </div>
    <div class="mt-8">${capabilityBarsHTML(m.dims)}</div>
    <div class="inset inset-${m.reasons.length?'green':'amber'}" style="padding:12px 14px;">
      <div class="k small" style="font-weight:700;margin-bottom:6px;">Why this match?</div>
      ${m.reasons.length
        ? `<ul>${m.reasons.slice(0,3).map(r=>`<li class="small" style="margin-bottom:5px;padding-left:14px;position:relative;"><span style="position:absolute;left:0;">·</span>${escapeHtml(r.length>120?r.slice(0,120)+'…':r)}</li>`).join('')}</ul>`
        : `<p class="small">No dimension cleared 70% for this challenge. Review the breakdown before shortlisting.</p>`}
    </div>
    <p class="desc">Founded ${s.founded} · ${escapeHtml(s.location)} · Team of ${s.teamSize} <span class="text-muted">(context only — not scored)</span></p>
    <div class="foot">
      <span class="small text-muted">${escapeHtml(s.funding||'')}</span>
      <div class="foot-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEvidencePassport('${s.id}')">Evidence</button>
        <button class="btn btn-primary btn-sm" onclick="showWhyMatch('${s.id}','${challenge?challenge.id:''}')">Full Breakdown</button>
      </div>
    </div>
  </div>`;
}

/* ---------------- Evaluation: evidence behind every score ---------------- */
function setEvalEvidence(id, key, field, value){
  const p = proposalById(id); if(!p) return;
  p.evaluationEvidence = p.evaluationEvidence || {};
  const rec = p.evaluationEvidence[key] || {evidence:'', type:'', reviewer:'', time:'', comment:''};
  rec[field] = value;
  rec.time = new Date().toISOString();
  if(!rec.reviewer) rec.reviewer = currentReviewer();
  p.evaluationEvidence[key] = rec;
  saveDB(DB);
}
function currentReviewer(){
  const s = getSession();
  return s && s.role==='government' ? 'Evaluation Panel — ' + (s.dept||'Government') : 'Evaluation Panel A';
}
function criterionLabel(key){
  const base = EVAL_CRITERIA.find(c=>c.key===key);
  if(base) return base.label;
  const p = window.__currentEvalProposal;
  if(key.startsWith('cc_') && p){
    const ch = challengeById(p.challengeId);
    const idx = Number(key.split('_')[1]);
    return ch?.capabilityCriteria?.[idx]?.name || 'Challenge criterion';
  }
  return key;
}
function showWhyScore(id, key){
  const p = proposalById(id); if(!p) return;
  window.__currentEvalProposal = p;
  const rec = (p.evaluationEvidence||{})[key];
  const score = (p.evalScores||{})[key];
  const label = criterionLabel(key);
  openModal(`
    <div class="modal-head">
      <div><span class="dept small text-muted">Why this score?</span><h3 style="margin-top:4px;">${escapeHtml(label)}</h3></div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="flex items-center gap-12" style="margin-bottom:16px;">
        <span class="cap-score"><span class="big">${score||0}</span><span class="cap-out">out of 5</span></span>
        ${rec?.type?`<span class="badge badge-royal">${escapeHtml(rec.type)} evidence</span>`:'<span class="badge badge-grey">No evidence type set</span>'}
      </div>
      <div class="section-mini-title">Evidence / Reason</div>
      <div class="inset mt-8">${rec?.evidence ? escapeHtml(rec.evidence) : '<span class="text-muted">No evidence has been recorded for this criterion yet. A score without evidence should not be relied on.</span>'}</div>
      ${rec?.comment?`<div class="section-mini-title mt-16">Reviewer Comment</div><p class="small mt-8">${escapeHtml(rec.comment)}</p>`:''}
      <div class="field-row mt-16">
        <div><div class="section-mini-title">Reviewer</div><p class="small">${escapeHtml(rec?.reviewer || '—')}</p></div>
        <div><div class="section-mini-title">Recorded</div><p class="small">${rec?.time ? fmtDate(rec.time) : '—'}</p></div>
      </div>
      <div class="flex gap-12 mt-24"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
    </div>
  `);
}

function evalCriterionBlockHTML(p, key, label, score, evidenceRequired, weight){
  const rec = (p.evaluationEvidence||{})[key] || {};
  return `
  <div style="padding:14px 0;border-bottom:1px solid var(--grey-100);">
    <div class="flex" style="justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
      <div>
        <span class="small" style="font-weight:600;">${escapeHtml(label)}</span>
        ${weight?`<span class="badge badge-grey" style="margin-left:8px;">${weight}%</span>`:''}
        ${evidenceRequired?`<div class="small text-muted" style="margin-top:3px;">Evidence required: ${escapeHtml(evidenceRequired)}</div>`:''}
      </div>
      <div class="rate-group" data-key="${key}">
        ${[1,2,3,4,5].map(n=>`<button type="button" data-val="${n}" class="${(score||0)>=n?'active':''}" onclick="setEvalScore('${p.id}','${key}',${n})">${n}</button>`).join('')}
      </div>
    </div>
    <div class="field-row mt-8" style="gap:10px;">
      <div class="field" style="margin-bottom:8px;">
        <select onchange="setEvalEvidence('${p.id}','${key}','type',this.value)">
          <option value="">Evidence type…</option>
          ${EVIDENCE_TYPES.map(t=>`<option ${rec.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="field" style="margin-bottom:8px;">
        <input placeholder="Reviewer" value="${escapeHtml(rec.reviewer||'')}" onchange="setEvalEvidence('${p.id}','${key}','reviewer',this.value)">
      </div>
    </div>
    <div class="field" style="margin-bottom:8px;">
      <textarea placeholder="Evidence or reason for this score — e.g. Prototype successfully tested with 3 municipal deployments." style="min-height:62px;" onchange="setEvalEvidence('${p.id}','${key}','evidence',this.value)">${escapeHtml(rec.evidence||'')}</textarea>
    </div>
    <div class="flex gap-8" style="justify-content:space-between;align-items:center;flex-wrap:wrap;">
      <span class="small text-muted">${rec.time?`Recorded ${fmtDate(rec.time)}${rec.reviewer?' · '+escapeHtml(rec.reviewer):''}`:'Not yet recorded'}</span>
      <button type="button" class="link-btn small" onclick="showWhyScore('${p.id}','${key}')">Why this score?</button>
    </div>
  </div>`;
}

function weightedCriteriaScore(p, ch){
  const crit = ch?.capabilityCriteria || [];
  if(!crit.length) return null;
  let total = 0, wSum = 0;
  crit.forEach((c,i)=>{
    const s = (p.evalScores||{})['cc_'+i];
    if(s){ total += (s/5)*Number(c.weight||0); }
    wSum += Number(c.weight||0);
  });
  if(!wSum) return null;
  return {pct: Math.round((total/wSum)*100), scored: crit.filter((c,i)=>(p.evalScores||{})['cc_'+i]).length, count: crit.length};
}

/* ---------------- Pilot management (evidence-tracked) ---------------- */
function ensurePilot(p){
  if(!p.pilot){ p.pilot = defaultPilot(p, DB); saveDB(DB); }
  return p.pilot;
}
function kpiImprovement(k){
  if(k.actual===null || k.actual===undefined || k.actual==='') return null;
  const base = Number(k.baseline), act = Number(k.actual), tgt = Number(k.target);
  if(!isFinite(base) || !isFinite(act) || base===0) return null;
  const pct = k.dir==='up' ? ((act-base)/base)*100 : ((base-act)/base)*100;
  const achieved = k.dir==='up' ? act >= tgt : act <= tgt;
  return {pct: Math.round(pct), achieved};
}
function kpiTableHTML(p, editable, role){
  const pilot = p.pilot;
  if(!pilot || !pilot.kpis.length) return `<div class="empty-state"><p>No KPIs defined for this pilot.</p></div>`;
  return `
  <div class="table-wrap">
    <table class="data-table">
      <thead><tr><th>KPI</th><th>Baseline</th><th>Target</th><th>Actual</th><th>Improvement</th><th>Evidence</th><th>Verification</th>${editable?'<th></th>':''}</tr></thead>
      <tbody>
      ${pilot.kpis.map(k=>{
        const imp = kpiImprovement(k);
        return `<tr>
          <td class="td-strong">${escapeHtml(k.name)}</td>
          <td>${k.baseline} ${escapeHtml(k.unit||'')}</td>
          <td>${k.target} ${escapeHtml(k.unit||'')}</td>
          <td>${k.actual===null||k.actual===undefined||k.actual===''?'<span class="td-muted">Not recorded</span>':`<b>${k.actual} ${escapeHtml(k.unit||'')}</b>`}</td>
          <td>${imp ? `<span class="badge badge-${imp.achieved?'green':'amber'}">${imp.pct>=0?'+':''}${imp.pct}% · ${imp.achieved?'Target achieved':'Below target'}</span>` : '<span class="td-muted">—</span>'}</td>
          <td class="td-muted" style="max-width:220px;">${k.evidence?escapeHtml(k.evidence):'<span class="td-muted">No evidence</span>'}</td>
          <td>${k.verified?'<span class="badge badge-green"><span class="badge-dot"></span>Verified</span>':'<span class="badge badge-grey"><span class="badge-dot"></span>Unverified</span>'}</td>
          ${editable?`<td><button class="btn btn-ghost btn-sm" onclick="openKpiResult('${p.id}','${k.id}','${role}')">${k.actual===null||k.actual===undefined||k.actual===''?'Add Result':'Update'}</button></td>`:''}
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>`;
}
function beforeAfterHTML(p){
  const pilot = p.pilot;
  const measured = (pilot?.kpis||[]).filter(k=>k.actual!==null && k.actual!==undefined && k.actual!=='');
  if(!measured.length) return `<div class="inset"><p class="small text-muted">No measurements recorded yet. Before/after comparison appears once the first KPI result is added.</p></div>`;
  const verified = pilot.verification && pilot.verification.status!=='Pending Verification';
  return `
    <div class="ba-flow">
      <span class="ba-node on">BEFORE</span><span class="ba-sep">→</span>
      <span class="ba-node on">PILOT</span><span class="ba-sep">→</span>
      <span class="ba-node on">AFTER</span><span class="ba-sep">→</span>
      <span class="ba-node ${verified?'ok':''}">${verified?'VERIFIED OUTCOME':'AWAITING VERIFICATION'}</span>
    </div>
    ${measured.map(k=>{
      const imp = kpiImprovement(k);
      return `
      <div style="margin-top:18px;">
        <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <span class="small" style="font-weight:700;">${escapeHtml(k.name)}</span>
          <span class="badge badge-${imp && imp.achieved?'green':'amber'}">${imp && imp.achieved?'Target achieved':'Target not met'}</span>
        </div>
        <div class="ba-grid">
          <div class="ba-cell before"><div class="ba-k">Before</div><div class="ba-v">${k.baseline}</div><div class="small text-muted">${escapeHtml(k.unit||'')}</div></div>
          <div class="ba-cell target"><div class="ba-k">Target</div><div class="ba-v">${k.target}</div><div class="small text-muted">${escapeHtml(k.unit||'')}</div></div>
          <div class="ba-cell after"><div class="ba-k">After Pilot</div><div class="ba-v">${k.actual}</div><div class="small text-muted">${escapeHtml(k.unit||'')}</div></div>
        </div>
        <div class="progress-bar"><div style="width:${Math.max(4,Math.min(100, imp?Math.abs(imp.pct):0))}%;background:${imp&&imp.achieved?'var(--green-600)':'var(--amber-600)'};"></div></div>
        <p class="small text-muted mt-8">${imp?`${imp.pct>=0?'Improvement':'Change'} of ${imp.pct}% against baseline.`:''} ${k.evidence?'Evidence: '+escapeHtml(k.evidence):'No evidence recorded.'} ${k.verified?'· Verified':'· Unverified'}</p>
      </div>`;
    }).join('')}`;
}

function openKpiResult(pid, kpiId, role){
  const p = proposalById(pid); const pilot = ensurePilot(p);
  const k = pilot.kpis.find(x=>x.id===kpiId); if(!k) return;
  const isGov = role==='government';
  openModal(`
    <div class="modal-head"><div><span class="dept small text-muted">Pilot measurement</span><h3 style="margin-top:4px;">${escapeHtml(k.name)}</h3></div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="field-row">
        <div class="field"><label>Baseline</label><input value="${k.baseline} ${escapeHtml(k.unit||'')}" disabled></div>
        <div class="field"><label>Target</label><input value="${k.target} ${escapeHtml(k.unit||'')}" disabled></div>
      </div>
      <div class="field"><label>Actual measured value *</label><input id="kpi_actual" type="number" step="any" value="${k.actual??''}" placeholder="e.g. 18"><div class="hint">Unit: ${escapeHtml(k.unit||'—')}</div></div>
      <div class="field"><label>Evidence for this measurement *</label><textarea id="kpi_evidence" placeholder="e.g. Dispatch log timestamps across 1,240 collection events.">${escapeHtml(k.evidence||'')}</textarea></div>
      ${isGov?`<div class="field"><label><input type="checkbox" id="kpi_verified" ${k.verified?'checked':''} style="width:auto;margin-right:8px;">Mark this measurement as verified</label><div class="hint">Only verify once you have seen the underlying data.</div></div>`:`<p class="small text-muted">Measurements you submit are recorded as unverified until the department verifies them.</p>`}
      <div class="flex gap-12 mt-24">
        <button class="btn btn-primary" onclick="saveKpiResult('${pid}','${kpiId}','${role}')">Save Measurement</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>`);
}
function saveKpiResult(pid, kpiId, role){
  const p = proposalById(pid); const pilot = ensurePilot(p);
  const k = pilot.kpis.find(x=>x.id===kpiId); if(!k) return;
  const actual = $('#kpi_actual').value;
  const evidence = $('#kpi_evidence').value.trim();
  if(actual===''){ toast('Enter the measured value.','error'); return; }
  if(!evidence){ toast('Record the evidence behind this measurement.','error'); return; }
  k.actual = Number(actual);
  k.evidence = evidence;
  if(role==='government'){ k.verified = $('#kpi_verified') ? $('#kpi_verified').checked : k.verified; }
  else { k.verified = false; }
  const who = role==='government' ? 'Government' : p.startupName;
  addAudit(pilot, `KPI result recorded for "${k.name}": ${k.actual} ${k.unit||''}.`, who);
  addAudit(p, `Pilot measurement updated for "${k.name}".`, who);
  saveDB(DB);
  closeModal();
  toast('Measurement saved.','success');
  renderAppPage(Router.current(), getSession());
}

function toggleMilestone(pid, msId){
  const p = proposalById(pid); const pilot = ensurePilot(p);
  const ms = pilot.milestones.find(m=>m.id===msId); if(!ms) return;
  ms.done = !ms.done;
  addAudit(pilot, `Milestone ${ms.done?'completed':'reopened'}: ${ms.name}.`, 'Government');
  saveDB(DB);
  renderAppPage(Router.current(), getSession());
}

function advancePilotStage(pid){
  const p = proposalById(pid); const pilot = ensurePilot(p);
  const i = PILOT_STAGES.indexOf(pilot.stage);
  if(i >= PILOT_STAGES.length-1){ toast('The pilot is already at the outcome decision stage.','info'); return; }
  pilot.stage = PILOT_STAGES[i+1];
  addAudit(pilot, `Pilot moved to stage: ${pilot.stage}.`, 'Government');
  addAudit(p, `Pilot stage: ${pilot.stage}.`, 'Government');
  addActivity(`Pilot for "${p.solutionName}" moved to ${pilot.stage}.`);
  addNotif('startup', `Pilot for "${p.solutionName}" is now at: ${pilot.stage}.`);
  saveDB(DB);
  toast(`Pilot stage: ${pilot.stage}.`,'success');
  renderAppPage(Router.current(), getSession());
}

function openAddPilotEvidence(pid, role){
  openModal(`
    <div class="modal-head"><div><h3>Add Pilot Evidence</h3><p class="small text-muted mt-8">Evidence is what the outcome decision rests on.</p></div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="field"><label>Evidence title *</label><input id="pe_title" placeholder="e.g. Week 1–8 dispatch logs"></div>
      <div class="field"><label>Evidence type</label><select id="pe_type">${EVIDENCE_TYPES.map(t=>`<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Description</label><textarea id="pe_desc" placeholder="What the evidence contains and how it was collected."></textarea></div>
      <div class="field"><label>Status</label><select id="pe_status"><option>Available</option><option>Pending</option><option>Under Review</option></select></div>
      <div class="flex gap-12 mt-24">
        <button class="btn btn-primary" onclick="savePilotEvidence('${pid}','${role}')">Add Evidence</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>`);
}
function savePilotEvidence(pid, role){
  const p = proposalById(pid); const pilot = ensurePilot(p);
  const title = $('#pe_title').value.trim();
  if(!title){ toast('Give the evidence a title.','error'); return; }
  pilot.evidence.push({
    id:uid('ev'), type:$('#pe_type').value, title, description:$('#pe_desc').value.trim(),
    status:$('#pe_status').value, date:new Date().toISOString(), verified: role==='government'
  });
  const who = role==='government' ? 'Government' : p.startupName;
  addAudit(pilot, `Evidence added: ${title}.`, who);
  addAudit(p, `Pilot evidence added: ${title}.`, who);
  if(role!=='government') addNotif('government', `${p.startupName} added pilot evidence for "${p.solutionName}".`);
  saveDB(DB);
  closeModal();
  toast('Evidence added.','success');
  renderAppPage(Router.current(), getSession());
}

function openVerifyOutcome(pid){
  const p = proposalById(pid); const pilot = ensurePilot(p);
  const measured = pilot.kpis.filter(k=>k.actual!==null && k.actual!==undefined && k.actual!=='');
  const achieved = measured.filter(k=>{ const i=kpiImprovement(k); return i && i.achieved; }).length;
  openModal(`
    <div class="modal-head"><div><span class="dept small text-muted">Verified outcome</span><h3 style="margin-top:4px;">${escapeHtml(p.solutionName)}</h3></div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      ${measured.length ? `<div class="inset inset-royal" style="margin-bottom:18px;"><p class="small">${achieved} of ${measured.length} measured KPI${measured.length!==1?'s':''} met target. The outcome should follow this evidence, not the evaluation score.</p></div>`
        : `<div class="inset inset-amber" style="margin-bottom:18px;"><p class="small">No KPI measurements have been recorded yet. Record at least one measurement before verifying an outcome.</p></div>`}
      <div class="field"><label>Outcome status *</label><select id="vo_status">
        ${['Successful','Partially Successful','Unsuccessful','Pending Verification'].map(s=>`<option ${pilot.outcomeStatus===s?'selected':''}>${s}</option>`).join('')}
      </select></div>
      <div class="field"><label>Verified by *</label><input id="vo_by" value="${escapeHtml(pilot.verification.by || currentReviewer())}"></div>
      <div class="field"><label>Reviewer notes / evidence relied on *</label><textarea id="vo_notes" placeholder="e.g. All three KPIs met target; complaint-register figures reconciled against dispatch logs.">${escapeHtml(pilot.verification.notes||'')}</textarea></div>
      <div class="flex gap-12 mt-24">
        <button class="btn btn-primary" onclick="saveVerifyOutcome('${pid}')">Record Verified Outcome</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>`);
}
function saveVerifyOutcome(pid){
  const p = proposalById(pid); const pilot = ensurePilot(p);
  const status = $('#vo_status').value;
  const by = $('#vo_by').value.trim();
  const notes = $('#vo_notes').value.trim();
  const measured = pilot.kpis.filter(k=>k.actual!==null && k.actual!==undefined && k.actual!=='');
  if(status!=='Pending Verification' && !measured.length){
    toast('Record at least one KPI measurement before verifying an outcome.','error'); return;
  }
  if(!by || !notes){ toast('Verified by and reviewer notes are both required.','error'); return; }
  pilot.verification = {status, by, date:new Date().toISOString(), notes};
  pilot.outcomeStatus = status;
  if(status!=='Pending Verification' && pilot.stage!=='Outcome Decision') pilot.stage = 'Outcome Decision';
  addAudit(pilot, `Outcome verified as ${status}.`, by);
  addAudit(p, `Pilot outcome verified as ${status}.`, by);
  addActivity(`Pilot outcome for "${p.solutionName}" verified as ${status}.`);
  addNotif('startup', `The pilot outcome for "${p.solutionName}" was recorded as: ${status}.`);
  saveDB(DB);
  closeModal();
  toast(`Outcome recorded as ${status}.`, status==='Unsuccessful'?'info':'success');
  renderAppPage(Router.current(), getSession());
}

function openMarkUnsuccessful(pid){
  const p = proposalById(pid); const pilot = ensurePilot(p);
  openModal(`
    <div class="modal-head"><div><span class="dept small text-muted">Learning record</span><h3 style="margin-top:4px;">${escapeHtml(p.solutionName)}</h3></div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="inset inset-royal" style="margin-bottom:18px;"><p class="small">This is an evidence and learning record, not a blacklist. Record what happened factually so future challenges are designed better. The startup remains free to apply to any challenge.</p></div>
      <div class="field"><label>Outcome status *</label><select id="mu_status">
        ${['Unsuccessful','Partially Successful','Terminated','Not Recommended for Scale'].map(s=>`<option ${pilot.outcomeStatus===s?'selected':''}>${s}</option>`).join('')}
      </select></div>
      <div class="field"><label>What happened, against the expected outcome *</label><textarea id="mu_reason" placeholder="Describe the gap between expected and actual outcome, in factual terms.">${escapeHtml(pilot.failureReason||'')}</textarea></div>
      <div class="field-row">
        <div class="field"><label>Technical issues</label><textarea id="mu_tech">${escapeHtml(pilot.issues?.technical||'')}</textarea></div>
        <div class="field"><label>Operational issues</label><textarea id="mu_ops">${escapeHtml(pilot.issues?.operational||'')}</textarea></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Cost issues</label><textarea id="mu_cost">${escapeHtml(pilot.issues?.cost||'')}</textarea></div>
        <div class="field"><label>Adoption issues</label><textarea id="mu_adopt">${escapeHtml(pilot.issues?.adoption||'')}</textarea></div>
      </div>
      <div class="field"><label>Lessons learned *</label><textarea id="mu_lessons" placeholder="What the department would do differently next time.">${escapeHtml(pilot.lessonsLearned||'')}</textarea></div>
      <div class="field"><label>Future recommendation</label><textarea id="mu_rec" placeholder="e.g. A re-pilot would be reasonable after night-accuracy testing.">${escapeHtml(pilot.recommendation||'')}</textarea></div>
      <div class="flex gap-12 mt-24">
        <button class="btn btn-primary" onclick="saveUnsuccessfulRecord('${pid}')">Save Record</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>`);
}
function saveUnsuccessfulRecord(pid){
  const p = proposalById(pid); const pilot = ensurePilot(p);
  const reason = $('#mu_reason').value.trim();
  const lessons = $('#mu_lessons').value.trim();
  if(!reason || !lessons){ toast('Record both what happened and the lessons learned.','error'); return; }
  pilot.outcomeStatus = $('#mu_status').value;
  pilot.failureReason = reason;
  pilot.lessonsLearned = lessons;
  pilot.recommendation = $('#mu_rec').value.trim();
  pilot.issues = {
    technical:$('#mu_tech').value.trim(), operational:$('#mu_ops').value.trim(),
    cost:$('#mu_cost').value.trim(), adoption:$('#mu_adopt').value.trim()
  };
  if(pilot.verification.status==='Pending Verification'){
    pilot.verification = {status:pilot.outcomeStatus, by:currentReviewer(), date:new Date().toISOString(), notes:reason};
  }
  pilot.stage = 'Outcome Decision';
  addAudit(pilot, `Outcome recorded as ${pilot.outcomeStatus} with a learning record.`, 'Government');
  addAudit(p, `Learning record created: ${pilot.outcomeStatus}.`, 'Government');
  addActivity(`Learning record created for "${p.solutionName}" (${pilot.outcomeStatus}).`);
  addNotif('startup', `A learning record was created for "${p.solutionName}". You can view the reasons and recommendations.`);
  saveDB(DB);
  closeModal();
  toast('Learning record saved.','success');
  renderAppPage(Router.current(), getSession());
}

function outcomeBadge(status){
  const map = {'Successful':'green','Partially Successful':'amber','Unsuccessful':'red','Terminated':'red','Not Recommended for Scale':'amber','Pending Verification':'grey'};
  return `<span class="badge badge-${map[status]||'grey'}"><span class="badge-dot"></span>${status||'Pending Verification'}</span>`;
}

function pilotPanelHTML(p, role){
  const pilot = ensurePilot(p);
  const ch = challengeById(p.challengeId);
  const isGov = role==='government';
  const stageIdx = Math.max(0, PILOT_STAGES.indexOf(pilot.stage));
  const verified = pilot.verification && pilot.verification.status !== 'Pending Verification';
  return `
  <div class="panel">
    <div class="panel-head">
      <div>
        <h3>${escapeHtml(p.solutionName)}</h3>
        <p class="small text-muted mt-8">${escapeHtml(p.startupName)} · ${escapeHtml(ch?.title||'—')}</p>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap;">${statusBadge(p.status)}${outcomeBadge(pilot.outcomeStatus)}</div>
    </div>
    <div class="panel-body pad">
      ${pipelineTracker(p.status)}
      <div class="divider"></div>
      <div class="section-mini-title">Pilot Workflow</div>
      ${workflowTracker(PILOT_STAGES, stageIdx)}

      <div class="kv-grid mt-16">
        <div class="kv"><div class="k">Problem</div><div class="v">${escapeHtml(ch?.title||'—')}</div></div>
        <div class="kv"><div class="k">Startup</div><div class="v">${escapeHtml(p.startupName)}</div></div>
        <div class="kv"><div class="k">Pilot Objective</div><div class="v">${escapeHtml(pilot.objective||'—')}</div></div>
        <div class="kv"><div class="k">Pilot Duration</div><div class="v">${pilot.durationWeeks} weeks · started ${fmtDate(pilot.startDate)}</div></div>
        <div class="kv"><div class="k">Baseline</div><div class="v">${escapeHtml(pilot.baseline||'—')}</div></div>
        <div class="kv"><div class="k">Target</div><div class="v">${escapeHtml(pilot.target||'—')}</div></div>
      </div>

      <div class="divider"></div>
      <div class="section-mini-title">KPIs & Measurement</div>
      ${kpiTableHTML(p, true, role)}

      <div class="divider"></div>
      <div class="section-mini-title">Before / After</div>
      ${beforeAfterHTML(p)}

      <div class="divider"></div>
      <div class="section-mini-title">Milestones</div>
      ${pilot.milestones.map(m=>`
        <div class="row-item" style="padding-left:0;padding-right:0;">
          <div class="ric" style="background:${m.done?'var(--green-100)':'var(--grey-100)'};color:${m.done?'var(--green-600)':'var(--grey-500)'};">${m.done?'✓':'○'}</div>
          <div class="rtxt"><div class="t1" style="white-space:normal;">${escapeHtml(m.name)}</div></div>
          ${isGov?`<button class="btn btn-ghost btn-sm" onclick="toggleMilestone('${p.id}','${m.id}')">${m.done?'Reopen':'Mark done'}</button>`:''}
        </div>`).join('')}

      <div class="divider"></div>
      <div class="flex" style="justify-content:space-between;align-items:center;">
        <div class="section-mini-title" style="margin-bottom:0;">Pilot Evidence</div>
        <button class="btn btn-secondary btn-sm" onclick="openAddPilotEvidence('${p.id}','${role}')">Add Evidence</button>
      </div>
      <div class="inset mt-16">${evidenceListHTML(pilot.evidence, 'No pilot evidence recorded yet.')}</div>

      ${verified ? `
        <div class="divider"></div>
        <div class="section-mini-title">Verified Outcome</div>
        <div class="inset inset-${pilot.outcomeStatus==='Successful'?'green':(pilot.outcomeStatus==='Partially Successful'?'amber':'red')}">
          <div class="kv-grid">
            <div class="kv"><div class="k">Outcome Status</div><div class="v">${escapeHtml(pilot.outcomeStatus)}</div></div>
            <div class="kv"><div class="k">Verified By</div><div class="v">${escapeHtml(pilot.verification.by||'—')}</div></div>
            <div class="kv"><div class="k">Verification Date</div><div class="v">${fmtDate(pilot.verification.date)}</div></div>
            <div class="kv"><div class="k">KPI Results</div><div class="v">${pilot.kpis.filter(k=>{const i=kpiImprovement(k);return i&&i.achieved;}).length} of ${pilot.kpis.length} met target</div></div>
          </div>
          ${pilot.verification.notes?`<div class="kv mt-16"><div class="k">Reviewer Notes</div><div class="v">${escapeHtml(pilot.verification.notes)}</div></div>`:''}
          ${pilot.failureReason?`<div class="kv mt-16"><div class="k">Why It Did Not Meet Target</div><div class="v">${escapeHtml(pilot.failureReason)}</div></div>`:''}
          ${pilot.lessonsLearned?`<div class="kv mt-16"><div class="k">Lessons Learned</div><div class="v">${escapeHtml(pilot.lessonsLearned)}</div></div>`:''}
        </div>` : ''}

      <div class="divider"></div>
      <div class="section-mini-title">Audit Trail</div>
      ${auditTrailHTML(pilot.auditTrail)}

      ${isGov?`
      <div class="divider"></div>
      <div class="flex gap-12" style="flex-wrap:wrap;">
        ${pilot.stage!=='Outcome Decision'?`<button class="btn btn-secondary btn-sm" onclick="advancePilotStage('${p.id}')">Advance to ${PILOT_STAGES[Math.min(stageIdx+1,PILOT_STAGES.length-1)]}</button>`:''}
        <button class="btn btn-secondary btn-sm" onclick="openVerifyOutcome('${p.id}')">Verify Outcome</button>
        <button class="btn btn-danger btn-sm" onclick="openMarkUnsuccessful('${p.id}')">Record Unsuccessful / Lessons</button>
        ${p.status==='Pilot'?`<button class="btn btn-primary btn-sm" onclick="requestProcurement('${p.id}')">Move to Procurement</button>`:''}
        ${p.status==='Procurement'?`<button class="btn btn-primary btn-sm" onclick="advanceStage('${p.id}','Scaled')">Mark as Scaled</button>`:''}
      </div>
      ${!verified && p.status==='Pilot' ? `<p class="small text-muted mt-16">Procurement follows a verified outcome. Record the KPI results first, then verify.</p>`:''}
      `:`
      <div class="divider"></div>
      <p class="small text-muted mt-16">Measurements you submit are recorded as unverified until the department verifies them against the underlying data. Use "Add Evidence" above to attach supporting documents to this pilot.</p>
      `}
    </div>
  </div>`;
}

/* Procurement gate: keeps the existing button working, but routes through verification */
function requestProcurement(pid){
  const p = proposalById(pid); const pilot = ensurePilot(p);
  const ok = ['Successful','Partially Successful'].includes(pilot.outcomeStatus);
  if(!ok){
    toast('Verify the pilot outcome before moving to procurement.','info');
    openVerifyOutcome(pid);
    return;
  }
  advanceStage(pid, 'Procurement');
}

/* ---------------- Outcome & learning records ---------------- */
function govOutcomes(page){
  renderOutcomeRecords(page, {q:'', status:'all'});
}
function renderOutcomeRecords(page, f){
  const records = DB.proposals.filter(p=>p.pilot && p.pilot.outcomeStatus && p.pilot.outcomeStatus!=='Pending Verification');
  let list = records.filter(p=>{
    const ch = challengeById(p.challengeId);
    const hay = [p.solutionName, p.startupName, ch?.title, p.pilot.failureReason, p.pilot.lessonsLearned].join(' ').toLowerCase();
    return (f.status==='all' || p.pilot.outcomeStatus===f.status) && (!f.q || hay.includes(f.q.toLowerCase()));
  });
  const counts = {};
  OUTCOME_STATUSES.forEach(s=> counts[s] = records.filter(p=>p.pilot.outcomeStatus===s).length);

  page.innerHTML = `
    <div class="page-head"><div><h1>Outcome Records</h1><p class="sub">Every completed pilot with its measured result — successful and unsuccessful alike.</p></div></div>
    <div class="inset inset-royal" style="margin-bottom:20px;">
      <p class="small"><b>This is a learning record, not a blacklist.</b> Unsuccessful pilots are recorded factually so future challenges can be designed better. No startup is barred from applying on the basis of a record here.</p>
    </div>
    <div class="filters-bar">
      <div class="search-box"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg><input id="oc_search" placeholder="Search by startup, solution, problem or lesson" value="${escapeHtml(f.q)}"></div>
      <select id="oc_status">
        <option value="all">All Outcomes</option>
        ${OUTCOME_STATUSES.filter(s=>s!=='Pending Verification').map(s=>`<option ${f.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="mini-grid" style="margin-bottom:22px;">
      ${['Successful','Partially Successful','Unsuccessful'].map(s=>`
        <div class="kpi-card"><div class="top"><div class="ic" style="background:var(--${s==='Successful'?'green':(s==='Partially Successful'?'amber':'red')}-100);color:var(--${s==='Successful'?'green':(s==='Partially Successful'?'amber':'red')}-600);">${ICN.flask}</div></div>
        <div class="val">${counts[s]||0}</div><div class="lbl">${s}</div></div>`).join('')}
    </div>
    ${list.length ? list.map(p=>{
      const pilot = p.pilot; const ch = challengeById(p.challengeId);
      const achieved = pilot.kpis.filter(k=>{const i=kpiImprovement(k);return i&&i.achieved;}).length;
      const measured = pilot.kpis.filter(k=>k.actual!==null&&k.actual!==undefined&&k.actual!=='').length;
      return `
      <div class="panel">
        <div class="panel-head">
          <div><h3>${escapeHtml(p.solutionName)}</h3><p class="small text-muted mt-8">${escapeHtml(p.startupName)} · ${escapeHtml(ch?.title||'—')}</p></div>
          ${outcomeBadge(pilot.outcomeStatus)}
        </div>
        <div class="panel-body pad">
          <div class="kv-grid">
            <div class="kv"><div class="k">Government Problem</div><div class="v">${escapeHtml(ch?.title||'—')}</div></div>
            <div class="kv"><div class="k">Pilot Period</div><div class="v">${fmtDate(pilot.startDate)} · ${pilot.durationWeeks} weeks</div></div>
            <div class="kv"><div class="k">Expected Outcome</div><div class="v">${escapeHtml(pilot.target||'—')}</div></div>
            <div class="kv"><div class="k">Actual Outcome</div><div class="v">${achieved} of ${measured||pilot.kpis.length} measured KPIs met target</div></div>
          </div>
          ${pilot.failureReason?`<div class="kv mt-16"><div class="k">Why It Did Not Meet Target</div><div class="v">${escapeHtml(pilot.failureReason)}</div></div>`:''}
          ${(pilot.issues && (pilot.issues.technical||pilot.issues.operational||pilot.issues.cost||pilot.issues.adoption))?`
            <div class="kv-grid mt-16">
              ${pilot.issues.technical?`<div class="kv"><div class="k">Technical Issues</div><div class="v">${escapeHtml(pilot.issues.technical)}</div></div>`:''}
              ${pilot.issues.operational?`<div class="kv"><div class="k">Operational Issues</div><div class="v">${escapeHtml(pilot.issues.operational)}</div></div>`:''}
              ${pilot.issues.cost?`<div class="kv"><div class="k">Cost Issues</div><div class="v">${escapeHtml(pilot.issues.cost)}</div></div>`:''}
              ${pilot.issues.adoption?`<div class="kv"><div class="k">Adoption Issues</div><div class="v">${escapeHtml(pilot.issues.adoption)}</div></div>`:''}
            </div>`:''}
          ${pilot.lessonsLearned?`<div class="inset inset-royal mt-16"><div class="k small" style="font-weight:700;margin-bottom:6px;">Lessons Learned</div><p class="small">${escapeHtml(pilot.lessonsLearned)}</p></div>`:''}
          ${pilot.recommendation?`<div class="kv mt-16"><div class="k">Future Recommendation</div><div class="v">${escapeHtml(pilot.recommendation)}</div></div>`:''}
          <div class="divider"></div>
          ${kpiTableHTML(p, false, 'government')}
          <div class="flex gap-12 mt-16">
            <button class="btn btn-secondary btn-sm" onclick="openEvidencePassport('${p.startupId}','${p.id}')">Evidence Passport</button>
            <button class="btn btn-ghost btn-sm" onclick="Router.go('/gov/pilots')">Open Pilot</button>
          </div>
        </div>
      </div>`;
    }).join('') : `<div class="panel"><div class="panel-body pad">${emptyState('No verified outcomes yet. Records appear here once a pilot outcome is verified.','📋')}</div></div>`}
  `;
  $('#oc_search').addEventListener('input', e=>renderOutcomeRecords(page,{...f,q:e.target.value}));
  $('#oc_status').addEventListener('change', e=>renderOutcomeRecords(page,{...f,status:e.target.value}));
}

/* ---------------- Admin / audit monitoring ---------------- */
function govAdmin(page){
  const props = DB.proposals;
  const pilots = props.filter(p=>p.pilot);
  const stat = {
    activeChallenges: DB.challenges.filter(c=>c.status==='Open').length,
    applications: props.length,
    underEval: props.filter(p=>['Submitted','Under Evaluation'].includes(p.status)).length,
    activePilots: props.filter(p=>p.status==='Pilot').length,
    pendingVerification: pilots.filter(p=>p.pilot.outcomeStatus==='Pending Verification').length,
    successful: pilots.filter(p=>p.pilot.outcomeStatus==='Successful').length,
    unsuccessful: pilots.filter(p=>['Unsuccessful','Terminated','Not Recommended for Scale'].includes(p.pilot.outcomeStatus)).length,
    procurement: props.filter(p=>p.status==='Procurement').length,
    scaled: props.filter(p=>p.status==='Scaled').length
  };
  // Combined audit stream across challenges, proposals and pilots
  const events = [];
  DB.challenges.forEach(c=> (c.auditTrail||[]).forEach(a=> events.push({...a, ctx:c.title})));
  props.forEach(p=>{
    (p.auditTrail||[]).forEach(a=> events.push({...a, ctx:p.solutionName}));
    (p.pilot?.auditTrail||[]).forEach(a=> events.push({...a, ctx:p.solutionName+' — pilot'}));
  });
  events.sort((a,b)=> new Date(b.time)-new Date(a.time));

  page.innerHTML = `
    <div class="page-head"><div><h1>Admin & Audit</h1><p class="sub">Platform-wide monitoring across every stage of the lifecycle.</p></div></div>
    <div class="kpi-grid">
      ${kpiCard(ICN.target,'royal',stat.activeChallenges,'Active Challenges')}
      ${kpiCard(ICN.inbox,'saffron',stat.applications,'Applications')}
      ${kpiCard(ICN.clock,'amber',stat.underEval,'Under Evaluation')}
      ${kpiCard(ICN.flask,'royal',stat.activePilots,'Active Pilots')}
      ${kpiCard(ICN.clock,'grey',stat.pendingVerification,'Pending Verification')}
    </div>
    <div class="kpi-grid">
      ${kpiCard(ICN.trophy,'green',stat.successful,'Successful Pilots')}
      ${kpiCard(ICN.flask,'red',stat.unsuccessful,'Unsuccessful Pilots')}
      ${kpiCard(ICN.cart,'saffron',stat.procurement,'Procurement Stage')}
      ${kpiCard(ICN.trend,'green',stat.scaled,'Scaled Solutions')}
    </div>
    <div class="dash-grid">
      <div>
        <div class="panel">
          <div class="panel-head"><h3>Outcome Summary</h3><button class="link-btn small" onclick="Router.go('/gov/outcomes')">Open records</button></div>
          <div class="panel-body pad">
            ${pilots.length ? pilots.map(p=>`
              <div class="row-item" style="padding-left:0;padding-right:0;">
                <div class="ric">🧪</div>
                <div class="rtxt"><div class="t1">${escapeHtml(p.solutionName)}</div><div class="t2">${escapeHtml(p.startupName)} · ${escapeHtml(challengeById(p.challengeId)?.title||'—')}</div></div>
                ${outcomeBadge(p.pilot.outcomeStatus)}
              </div>`).join('') : emptyState('No pilots recorded yet.','🧪')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Audit Timeline</h3><span class="small text-muted">${events.length} events</span></div>
          <div class="panel-body pad">
            ${events.length ? `<div class="timeline">${events.slice(0,25).map(e=>`
              <div class="tl-item">
                <div class="tt">${escapeHtml(e.text)}</div>
                <div class="ts">${fmtDate(e.time)} · ${escapeHtml(e.actor||'System')} · ${escapeHtml(e.ctx||'')}</div>
              </div>`).join('')}</div>` : emptyState('No audit events recorded yet.','🧾')}
          </div>
        </div>
      </div>
      <div>
        <div class="panel"><div class="panel-head"><h3>Recent Activity</h3></div>
          <div class="panel-body pad">${activityTimelineHTML(DB.activity)}</div>
        </div>
        <div class="panel"><div class="panel-head"><h3>Challenge Pipeline</h3></div>
          <div class="panel-body">
            ${DB.challenges.slice(0,8).map(c=>`
              <div class="row-item">
                <div class="ric">🏛️</div>
                <div class="rtxt"><div class="t1">${escapeHtml(c.title)}</div><div class="t2">Stage: ${GOV_WORKFLOW[govWorkflowIndex(c)]||'Define Problem'} · ${c.proposals} proposal${c.proposals!==1?'s':''}</div></div>
                ${statusBadge(c.status)}
              </div>`).join('') || emptyState('No challenges yet.')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ---------------- Startup capability profile editing ---------------- */
function saveCapabilityField(startupId, key){
  const s = startupById(startupId); if(!s) return;
  s.capability = s.capability || {};
  const scoreEl = $('#cap_score_'+key), noteEl = $('#cap_note_'+key);
  const score = Math.max(0, Math.min(100, Number(scoreEl.value||0)));
  s.capability[key] = {score, note: noteEl.value.trim()};
  saveDB(DB);
  toast('Capability updated.','success');
  renderAppPage(Router.current(), getSession());
}
function openAddEvidence(startupId){
  openModal(`
    <div class="modal-head"><div><h3>Add Evidence</h3><p class="small text-muted mt-8">Evidence is what government reviewers assess — not company age.</p></div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="field"><label>Evidence title *</label><input id="se_title" placeholder="e.g. Field accuracy validation report"></div>
      <div class="field"><label>Evidence type</label><select id="se_type">${EVIDENCE_TYPES.map(t=>`<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Description</label><textarea id="se_desc" placeholder="What it demonstrates, with numbers where possible."></textarea></div>
      <div class="field"><label>Status</label><select id="se_status"><option>Available</option><option>Pending</option><option>Under Review</option></select></div>
      <div class="flex gap-12 mt-24">
        <button class="btn btn-primary" onclick="saveStartupEvidence('${startupId}')">Add to Passport</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>`);
}
function saveStartupEvidence(startupId){
  const s = startupById(startupId); if(!s) return;
  const title = $('#se_title').value.trim();
  if(!title){ toast('Give the evidence a title.','error'); return; }
  s.evidence = s.evidence || [];
  s.evidence.unshift({
    id:uid('ev'), type:$('#se_type').value, title, description:$('#se_desc').value.trim(),
    status:$('#se_status').value, date:new Date().toISOString(), verified:false
  });
  saveDB(DB);
  addNotif('government', `${s.name} added new evidence: ${title}.`);
  closeModal();
  toast('Evidence added to your passport.','success');
  renderAppPage(Router.current(), getSession());
}

/* ---------------- Startup: proposal evidence ---------------- */
function openAddProposalEvidence(pid){
  openModal(`
    <div class="modal-head"><div><h3>Add Supporting Evidence</h3></div><button class="modal-close" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="field"><label>Evidence title *</label><input id="pv_title"></div>
      <div class="field"><label>Evidence type</label><select id="pv_type">${EVIDENCE_TYPES.map(t=>`<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label>Description</label><textarea id="pv_desc"></textarea></div>
      <div class="flex gap-12 mt-24">
        <button class="btn btn-primary" onclick="saveProposalEvidence('${pid}')">Add Evidence</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>`);
}
function saveProposalEvidence(pid){
  const p = proposalById(pid); if(!p) return;
  const title = $('#pv_title').value.trim();
  if(!title){ toast('Give the evidence a title.','error'); return; }
  p.evidence = p.evidence || [];
  p.evidence.push({id:uid('ev'), type:$('#pv_type').value, title, description:$('#pv_desc').value.trim(), status:'Available', date:new Date().toISOString(), verified:false});
  addAudit(p, `Supporting evidence added: ${title}.`, p.startupName);
  addNotif('government', `${p.startupName} added evidence to "${p.solutionName}".`);
  saveDB(DB);
  closeModal();
  toast('Evidence added.','success');
  renderAppPage(Router.current(), getSession());
}

/* ============================================================
   INIT
   ============================================================ */
if(document.getElementById('roleStartupBtn')) setLoginRole('startup');
if(window.GOVBRIDGE_DEMO_MODE){
  const loginForm=document.getElementById('loginForm');
  const demoAccess=document.getElementById('demoAccess');
  if(loginForm) loginForm.hidden=true;
  document.querySelector('.role-toggle')?.setAttribute('hidden','');
  if(demoAccess) demoAccess.hidden=false;
  document.getElementById('signupPrompt')?.setAttribute('hidden','');
  const loginIntro=document.getElementById('loginIntro');
  if(loginIntro) loginIntro.textContent='Choose a demo role to explore GovBridge.';
  const appView=document.getElementById('view-app');
  if(appView){
    const notice=document.createElement('div');
    notice.textContent='Interactive preview · Changes are saved only in this browser and are not shared with other visitors.';
    notice.style.cssText='padding:10px 18px;text-align:center;background:#fff4d6;color:#704b00;font-size:13px;border-bottom:1px solid #ead59a;';
    appView.prepend(notice);
  }
}
renderRoute();


