import { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";

// ═══════════════════════════════════════════════════════════════
//  CODE ROUGE v4 — "GTA DE LA SÉCURITÉ INCENDIE"
//  Canvas particles, SVG characters, Tone.js ambient, fog of war
// ═══════════════════════════════════════════════════════════════

// ─── DATA ────────────────────────────────────────────────────
const TEAMS = [
  { id:"pompiers", name:"Les Pompiers", icon:"🔥", color:"#E63946", desc:"Intervention directe" },
  { id:"serrefiles", name:"Les Serre-Files", icon:"🚪", color:"#457B9D", desc:"Évacuation & guidage" },
  { id:"direction", name:"La Direction", icon:"📋", color:"#2A9D8F", desc:"Coordination & décision" },
  { id:"secouristes", name:"Les Secouristes", icon:"⛑️", color:"#E9C46A", desc:"Premiers soins" },
];
const ROLES = ["Observateur 👁️","Décideur ✋","Expert 📖"];
const EQUIP = [
  {name:"Casque F1",icon:"🪖"},{name:"Extincteur",icon:"🧯"},{name:"Talkie",icon:"📻"},
  {name:"Gilet Fluo",icon:"🦺"},{name:"Lampe",icon:"🔦"},{name:"Plan Évac",icon:"🗺️"},{name:"Badge EPI",icon:"🏅"},
];
const TL = ["14:30","14:33","14:36","14:39","14:42","14:45","14:48","14:52"];
const MISS = [
  {id:1,title:"Chasse aux Risques",sub:"Identifiez les 8 dangers cachés dans l'open space",time:90,icon:"🔍"},
  {id:2,title:"Salle des Commandes",sub:"Activez la séquence de sécurité dans le bon ordre",time:60,icon:"🎛️"},
  {id:3,title:"Alerte Sonore",sub:"Mémorisez et identifiez les 4 types d'alarmes",time:75,icon:"🔊"},
  {id:4,title:"Téléphone Rouge",sub:"Contactez les secours — chaque seconde compte",time:60,icon:"☎️"},
  {id:5,title:"Blackout",sub:"Trouvez les équipements dans l'obscurité totale",time:45,icon:"🔦"},
  {id:6,title:"Œil de Lynx",sub:"Repérez les 6 violations de sécurité",time:60,icon:"🔎"},
  {id:7,title:"Évacuation Finale",sub:"Guidez tout le monde — ne laissez personne derrière",time:90,icon:"🏃"},
];
const CHARS = {
  marcel:{name:"Marcel",color:"#E07A5F",q:["J'ai pas vu le panneau...","Mon briquet ? Quel briquet ?","C'est juste une petite clope..."]},
  martine:{name:"Martine",color:"#81B29A",q:["Mes guirlandes font 200W seulement !","C'est Noël toute l'année !","L'ambiance c'est important non ?"]},
  gerard:{name:"Gérard",color:"#3D405B",q:["Faut bien garer mon chariot","La sortie c'est aussi un rangement","Je le déplacerai demain"]},
  sandrine:{name:"Sandrine",color:"#F2CC8F",q:["ON VA TOUS MOURIR !!!","JE TROUVE PAS LA SORTIE","AAAH LA FUMÉE !!!"]},
  drh:{name:"Le DRH",color:"#577590",q:["N'oubliez pas le formulaire RH-27B","L'exercice compte en heures sup ?","J'ai un Teams dans 5 min"]},
};
const HAZ = [
  {id:1,x:12,y:18,w:14,h:12,label:"Multiprise surchargée",hint:"Sous le bureau de Marcel, 8 appareils sur une multiprise…",cat:"élec",ic:"⚡",dng:3},
  {id:2,x:52,y:12,w:13,h:14,label:"Guirlandes électriques",hint:"Martine a branché 200W de guirlandes sur une rallonge…",cat:"élec",ic:"💡",dng:3},
  {id:3,x:72,y:55,w:16,h:12,label:"Issue de secours bloquée",hint:"Le chariot de Gérard bloque la porte coupe-feu",cat:"évac",ic:"🚪",dng:4},
  {id:4,x:28,y:52,w:12,h:12,label:"Extincteur périmé",hint:"Date de vérification : 2019. On est en 2026…",cat:"équip",ic:"🧯",dng:2},
  {id:5,x:42,y:36,w:14,h:14,label:"Tableau électrique obstrué",hint:"3 cartons empilés devant le TGBT",cat:"obst",ic:"📦",dng:3},
  {id:6,x:82,y:25,w:12,h:12,label:"Mégot mal éteint",hint:"Marcel a jeté sa clope dans la poubelle papier…",cat:"feu",ic:"🔥",dng:5},
  {id:7,x:8,y:68,w:14,h:12,label:"Produits inflammables",hint:"Bidons de solvant à côté du radiateur",cat:"stock",ic:"⚠️",dng:4},
  {id:8,x:58,y:72,w:16,h:12,label:"Plan d'évacuation absent",hint:"L'emplacement est vide — le plan a été décroché",cat:"sign",ic:"🗺️",dng:2},
];
const CTRL = [
  {id:"vent",label:"Couper Ventilation",icon:"💨",color:"#457B9D",desc:"Empêcher la propagation de fumée"},
  {id:"desf",label:"Désenfumage",icon:"🌫️",color:"#6C757D",desc:"Activer l'extraction de fumée"},
  {id:"port",label:"Portes Coupe-Feu",icon:"🚪",color:"#E9C46A",desc:"Compartimenter les zones"},
  {id:"alrm",label:"Alarme Générale",icon:"🚨",color:"#E63946",desc:"Prévenir tout le bâtiment"},
  {id:"secu",label:"Appel Secours",icon:"📞",color:"#2A9D8F",desc:"Contacter les pompiers"},
];
const ALRM = [
  {id:"incendie",label:"Incendie",desc:"2 tons alternés grave/aigu"},
  {id:"intrusion",label:"Intrusion",desc:"Signal continu aigu"},
  {id:"evacuation",label:"Évacuation",desc:"3 impulsions rapides"},
  {id:"confinement",label:"Confinement",desc:"Signal grave continu"},
];
const RPT = [
  {f:"Nature du sinistre",ph:"incendie, fuite de gaz…",ic:"🔥"},
  {f:"Adresse précise",ph:"12 rue des Lilas, Bât B",ic:"📍"},
  {f:"Étage concerné",ph:"3ème étage",ic:"🏢"},
  {f:"Nombre de victimes",ph:"0 pour l'instant",ic:"🤕"},
  {f:"Risques particuliers",ph:"produits chimiques",ic:"⚠️"},
];
const FLI = [
  {id:1,x:18,y:28,ic:"🚪",label:"Sortie de secours",r:12},
  {id:2,x:68,y:22,ic:"🧯",label:"Extincteur",r:10},
  {id:3,x:38,y:68,ic:"🗺️",label:"Plan d'évacuation",r:12},
  {id:4,x:78,y:62,ic:"⬆️",label:"Flèche directionnelle",r:10},
  {id:5,x:12,y:78,ic:"🔔",label:"Déclencheur manuel",r:10},
];
const SDIF = [
  {id:1,x:18,y:28,label:"Extincteur disparu"},{id:2,x:52,y:18,label:"Sortie masquée"},
  {id:3,x:72,y:58,label:"Câble dénudé"},{id:4,x:35,y:68,label:"Détecteur absent"},
  {id:5,x:82,y:38,label:"Produit mal stocké"},{id:6,x:15,y:53,label:"Porte bloquée"},
];
const MSZ = 13;
const MW = new Set(["1-0","1-1","1-3","1-5","1-7","1-9","1-11","2-5","2-9","2-11","3-1","3-2","3-3","3-5","3-7","3-8","3-9","4-1","4-7","4-11","5-1","5-3","5-4","5-5","5-7","5-9","5-10","6-3","6-9","6-11","7-1","7-2","7-3","7-5","7-6","7-7","7-9","8-1","8-5","8-9","8-11","9-1","9-3","9-4","9-5","9-7","9-8","9-9","10-1","10-7","10-11","11-1","11-3","11-5","11-7","11-9"]);
const MNPC = [
  {pos:[2,2],type:"Gérard",ic:"🧔",msg:"Aidez-moi avec le chariot !"},
  {pos:[4,8],type:"PMR",ic:"♿",msg:"Je ne peux pas avancer seul…"},
  {pos:[6,4],type:"Sandrine",ic:"😱",msg:"JE SUIS PERDUE !"},
  {pos:[8,10],type:"Marcel",ic:"🚬",msg:"Mon briquet !",dilemma:true},
  {pos:[10,6],type:"fumée",ic:"🌫️",msg:"Zone enfumée — détour"},
];
const SMS = [
  {from:"Marcel 🚬",text:"J'ai laissé mon briquet… tu peux me le ramener ? 😅"},
  {from:"Martine 🎄",text:"Mes guirlandes clignotent bizarre 🤔"},
  {from:"Gérard 🛒",text:"Mon chariot bloque la sortie 😤"},
  {from:"Sandrine 😱",text:"JE SENS DE LA FUMÉE !!! 😭"},
  {from:"Le DRH 👔",text:"Pensez au formulaire RH-27B svp. Cordialement."},
  {from:"Marcel 🚬",text:"C'est moi qui ai débranché le détecteur 🙄"},
  {from:"Sandrine 😱",text:"Y'A PLUS DE LUMIÈRE !!! 💀"},
];
const LESSONS = [
  "Les risques incendie sont souvent liés à des habitudes quotidiennes. Restez vigilants en permanence !",
  "La séquence de sécurité doit être respectée dans l'ordre exact. Chaque étape protège la suivante.",
  "Savoir distinguer les alarmes peut sauver des vies. Chaque son a un sens précis.",
  "Un appel aux secours structuré accélère l'intervention. Lieu, nature, victimes, risques.",
  "Sans lumière, connaître la position des équipements de sécurité devient vital.",
  "La conformité aux normes n'est pas optionnelle. Chaque détail peut faire la différence.",
  "Lors d'une évacuation, aidez les personnes vulnérables. Ne laissez personne derrière.",
];

// ─── SOUND ENGINE WITH AMBIENT ───────────────────────────────
const useSound = () => {
  const sy = useRef({});
  const on = useRef(false);
  const amb = useRef(null);

  const start = useCallback(async () => {
    if(on.current) return;
    try {
      await Tone.start();
      sy.current.m = new Tone.Synth({oscillator:{type:"square"},envelope:{attack:0.005,decay:0.1,sustain:0.2,release:0.1}}).toDestination();
      sy.current.b = new Tone.Synth({oscillator:{type:"triangle"},envelope:{attack:0.1,decay:0.3,sustain:0.8,release:0.5}}).toDestination();
      sy.current.b.volume.value = -14;
      sy.current.n = new Tone.NoiseSynth({noise:{type:"brown"},envelope:{attack:0.01,decay:0.15,sustain:0.02,release:0.05}}).toDestination();
      sy.current.n.volume.value = -26;
      sy.current.h = new Tone.MembraneSynth({pitchDecay:0.05,octaves:6,oscillator:{type:"sine"},envelope:{attack:0.001,decay:0.4,sustain:0.01,release:1.4}}).toDestination();
      sy.current.h.volume.value = -22;
      // Ambient drone
      sy.current.drone = new Tone.Synth({oscillator:{type:"sine"},envelope:{attack:2,decay:1,sustain:1,release:2}}).toDestination();
      sy.current.drone.volume.value = -30;
      on.current = true;
    } catch(e) { console.warn("Audio:",e); }
  }, []);

  const beep = useCallback((f=880,d="16n")=>{sy.current.m?.triggerAttackRelease(f,d);},[]);
  const ok = useCallback(()=>{
    if(!sy.current.m)return;const t=Tone.now();
    sy.current.m.triggerAttackRelease(523,"16n",t);
    sy.current.m.triggerAttackRelease(659,"16n",t+0.08);
    sy.current.m.triggerAttackRelease(784,"16n",t+0.16);
    sy.current.m.triggerAttackRelease(1047,"8n",t+0.24);
  },[]);
  const err = useCallback(()=>{
    if(!sy.current.m)return;const t=Tone.now();
    sy.current.m.triggerAttackRelease(180,"8n",t);sy.current.m.triggerAttackRelease(120,"4n",t+0.12);
    sy.current.n?.triggerAttackRelease("8n",t);
  },[]);
  const alarm = useCallback((type)=>{
    if(!sy.current.m)return;const t=Tone.now(),m=sy.current.m;
    if(type==="incendie"){for(let i=0;i<6;i++){m.triggerAttackRelease(440,"16n",t+i*0.3);m.triggerAttackRelease(880,"16n",t+i*0.3+0.15);}}
    else if(type==="intrusion"){for(let i=0;i<10;i++)m.triggerAttackRelease(1200,"32n",t+i*0.1);}
    else if(type==="evacuation"){for(let r=0;r<3;r++)for(let i=0;i<3;i++)m.triggerAttackRelease(660,"32n",t+r*0.6+i*0.12);}
    else if(type==="confinement"){sy.current.b?.triggerAttackRelease(110,"1n",t);m.triggerAttackRelease(220,"2n",t);}
  },[]);
  const siren = useCallback(()=>{
    if(!sy.current.m)return;const t=Tone.now();
    for(let i=0;i<12;i++)sy.current.m.triggerAttackRelease(i%2===0?620:380,"16n",t+i*0.2);
    sy.current.n?.triggerAttackRelease("2n",t);
  },[]);
  const hb = useCallback((fast)=>{sy.current.h?.triggerAttackRelease(fast?80:50,fast?"16n":"8n");},[]);
  const combo = useCallback((lv)=>{
    if(!sy.current.m)return;const t=Tone.now();
    for(let i=0;i<=lv;i++)sy.current.m.triggerAttackRelease(400+lv*100+i*80,"32n",t+i*0.06);
  },[]);
  const drone = useCallback((note="C2")=>{sy.current.drone?.triggerAttackRelease(note,"4n");},[]);
  const victory = useCallback(()=>{
    if(!sy.current.m)return;const t=Tone.now();
    [523,659,784,1047,1318].forEach((f,i)=>sy.current.m.triggerAttackRelease(f,"8n",t+i*0.15));
  },[]);

  return {start,beep,ok,err,alarm,siren,hb,combo,drone,victory};
};

// ─── PARTICLES ───────────────────────────────────────────────
const Particles = ({type="embers",intensity=1,active=true}) => {
  const cv = useRef(null); const pts = useRef([]); const af = useRef(null);
  useEffect(()=>{
    if(!active)return; const c=cv.current; if(!c)return;
    const x=c.getContext("2d"); c.width=window.innerWidth; c.height=window.innerHeight;
    const mk=()=>{
      const W=c.width,H=c.height;
      if(type==="embers")return{x:Math.random()*W,y:H+10,vx:(Math.random()-0.5)*2,vy:-(1+Math.random()*3),s:1+Math.random()*3,l:1,d:0.005+Math.random()*0.01,c:Math.random()>0.3?"#E63946":"#E9C46A"};
      if(type==="smoke")return{x:Math.random()*W,y:H+10,vx:(Math.random()-0.5)*1.5,vy:-(0.5+Math.random()*1.5),s:5+Math.random()*15,l:1,d:0.003+Math.random()*0.005,c:"rgba(120,120,120,0.15)"};
      if(type==="confetti")return{x:W/2+(Math.random()-0.5)*W*0.8,y:-10,vx:(Math.random()-0.5)*4,vy:2+Math.random()*4,s:3+Math.random()*4,l:1,d:0.003+Math.random()*0.005,c:["#E63946","#E9C46A","#2A9D8F","#457B9D","#F1FAEE"][Math.floor(Math.random()*5)]};
      return{x:W/2+(Math.random()-0.5)*200,y:H/2+(Math.random()-0.5)*200,vx:(Math.random()-0.5)*8,vy:(Math.random()-0.5)*8,s:1+Math.random()*2,l:1,d:0.02+Math.random()*0.03,c:"#E9C46A"};
    };
    const anim=()=>{
      x.clearRect(0,0,c.width,c.height);
      const rate=Math.floor(intensity*(type==="smoke"?2:type==="confetti"?4:type==="sparks"?5:3));
      for(let i=0;i<rate;i++)pts.current.push(mk());
      pts.current=pts.current.filter(p=>{
        p.x+=p.vx;p.y+=p.vy;p.l-=p.d;
        if(type==="confetti")p.vy+=0.05; // gravity
        if(p.l<=0)return false;
        x.save();x.globalAlpha=p.l;x.fillStyle=p.c;
        if(type==="embers"||type==="sparks"){x.shadowColor=p.c;x.shadowBlur=p.s*3;}
        if(type==="confetti"){
          x.translate(p.x,p.y);x.rotate(p.vx*0.5);
          x.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6);
        } else {x.beginPath();x.arc(p.x,p.y,p.s,0,Math.PI*2);x.fill();}
        x.restore();return true;
      });
      if(pts.current.length>400)pts.current.splice(0,80);
      af.current=requestAnimationFrame(anim);
    };
    anim();
    return()=>{if(af.current)cancelAnimationFrame(af.current);pts.current=[];};
  },[type,intensity,active]);
  return <canvas ref={cv} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:type==="smoke"?40:type==="confetti"?400:60}} />;
};

// ─── SVG CHAR ────────────────────────────────────────────────
const Char = ({id,size=50,bubble=false,emotion="neutral"}) => {
  const c=CHARS[id]; if(!c)return null;
  const bText = bubble ? c.q[Math.floor(Math.random()*c.q.length)] : null;
  return (
    <div style={{position:"relative",display:"inline-flex",flexDirection:"column",alignItems:"center"}}>
      {bText && <div style={{position:"absolute",bottom:"105%",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.88)",border:"1px solid "+c.color+"50",borderRadius:"8px 8px 8px 0",padding:"4px 8px",fontSize:"0.45rem",color:"#F1FAEE",whiteSpace:"nowrap",fontFamily:"'Special Elite',cursive",maxWidth:"130px",overflow:"hidden",textOverflow:"ellipsis",animation:"fadeIn 0.3s",zIndex:55}}>{bText}</div>}
      <svg width={size} height={size} viewBox="0 0 100 120" style={{filter:"drop-shadow(0 3px 6px "+c.color+"30)"}}>
        {/* legs */}
        <rect x="38" y="88" width="8" height="16" rx="3" fill={c.color} opacity="0.7" />
        <rect x="54" y="88" width="8" height="16" rx="3" fill={c.color} opacity="0.7" />
        {/* body */}
        <rect x="30" y="55" width="40" height="38" rx="8" fill={c.color} opacity="0.85" />
        {/* arms */}
        <rect x="18" y="58" width="12" height="6" rx="3" fill={c.color} opacity="0.7">
          <animateTransform attributeName="transform" type="rotate" values="0 24 61;-8 24 61;0 24 61" dur="2s" repeatCount="indefinite" />
        </rect>
        <rect x="70" y="58" width="12" height="6" rx="3" fill={c.color} opacity="0.7">
          <animateTransform attributeName="transform" type="rotate" values="0 76 61;8 76 61;0 76 61" dur="2.2s" repeatCount="indefinite" />
        </rect>
        {/* head */}
        <circle cx="50" cy="35" r="22" fill="#F4D9A0" stroke={c.color} strokeWidth="2.5" />
        {/* eyes */}
        <g>
          <circle cx="42" cy="32" r="3" fill="#1D3557" />
          <circle cx="58" cy="32" r="3" fill="#1D3557" />
          <circle cx="43" cy="31" r="1" fill="#fff" opacity="0.7" />
          <circle cx="59" cy="31" r="1" fill="#fff" opacity="0.7" />
          {emotion==="stressed" && <><line x1="37" y1="25" x2="42" y2="27" stroke="#1D3557" strokeWidth="1.5" /><line x1="63" y1="25" x2="58" y2="27" stroke="#1D3557" strokeWidth="1.5" /></>}
        </g>
        {/* mouth */}
        {emotion==="happy" && <path d="M42 42 Q50 50 58 42" stroke="#1D3557" strokeWidth="2" fill="none" />}
        {emotion==="neutral" && <line x1="43" y1="43" x2="57" y2="43" stroke="#1D3557" strokeWidth="2" />}
        {emotion==="stressed" && <path d="M42 46 Q50 40 58 46" stroke="#1D3557" strokeWidth="2" fill="none" />}
        {emotion==="panicked" && <ellipse cx="50" cy="44" rx="5" ry="6" fill="#1D3557" />}
        {/* traits */}
        {id==="marcel" && <>
          <line x1="62" y1="42" x2="78" y2="35" stroke="#AAA" strokeWidth="2" strokeLinecap="round" />
          <circle cx="80" cy="34" r="2.5" fill="#E63946"><animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" /></circle>
          <circle cx="82" cy="30" r="1.5" fill="rgba(200,200,200,0.3)"><animate attributeName="cy" values="30;22;14" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.3;0" dur="2s" repeatCount="indefinite" /></circle>
        </>}
        {id==="martine" && [28,38,50,62,72].map((px,i)=><circle key={i} cx={px} cy="14" r="2.5" fill={["#E63946","#2A9D8F","#E9C46A","#457B9D","#E63946"][i]}><animate attributeName="opacity" values="1;0.2;1" dur={0.4+i*0.15+"s"} repeatCount="indefinite" /></circle>)}
        {id==="gerard" && <><rect x="20" y="72" width="60" height="14" rx="4" fill="#6C757D" stroke="#555" strokeWidth="1" /><circle cx="28" cy="90" r="4" fill="#555" /><circle cx="72" cy="90" r="4" fill="#555" /></>}
        {id==="sandrine" && <><text x="50" y="10" textAnchor="middle" fontSize="14" fill="#E63946" fontWeight="bold">!</text><animateTransform attributeName="transform" type="translate" values="0,0;-2,0;2,0;0,0" dur="0.25s" repeatCount="indefinite" /></>}
        {id==="drh" && <><rect x="36" y="60" width="28" height="18" rx="3" fill="#457B9D" opacity="0.5" /><rect x="40" y="63" width="20" height="12" rx="2" fill="#1D3557" opacity="0.3" /></>}
      </svg>
      <div style={{fontSize:"0.4rem",color:c.color,opacity:0.6,fontFamily:"'Special Elite',cursive",marginTop:"-4px"}}>{c.name}</div>
    </div>
  );
};

// ─── CRACK SVG ───────────────────────────────────────────────
const Crack = ({show}) => {
  if(!show)return null;
  return <svg style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:310,opacity:0.5}} viewBox="0 0 100 100" preserveAspectRatio="none">
    <g stroke="rgba(255,255,255,0.35)" strokeWidth="0.2" fill="none">
      <path d="M32,0 L35,18 L28,25 L38,35 L25,55 L32,70 L28,100" />
      <path d="M35,18 L48,22 L55,30" /><path d="M28,25 L18,32 L12,50" />
      <path d="M38,35 L52,38 L60,45 L72,42" /><path d="M25,55 L15,58 L8,68" />
      <path d="M65,0 L62,15 L68,28 L72,42 L85,50 L90,65 L82,80 L88,100" />
    </g>
  </svg>;
};

// ─── ANIMATED FIRE SVG ───────────────────────────────────────
const FireSVG = ({size=40,intensity=1}) => (
  <svg width={size} height={size} viewBox="0 0 50 50" style={{opacity:0.5+intensity*0.5}}>
    <ellipse cx="25" cy="44" rx={8+intensity*4} ry="3" fill="rgba(230,57,70,0.2)" />
    <path d="M25 5 Q35 20 30 30 Q38 25 32 38 Q28 42 25 45 Q22 42 18 38 Q12 25 20 30 Q15 20 25 5Z" fill="#E63946" opacity="0.8">
      <animate attributeName="d" values="M25 5 Q35 20 30 30 Q38 25 32 38 Q28 42 25 45 Q22 42 18 38 Q12 25 20 30 Q15 20 25 5Z;M25 8 Q33 18 28 28 Q36 23 30 36 Q27 41 25 44 Q23 41 20 36 Q14 23 22 28 Q17 18 25 8Z;M25 5 Q35 20 30 30 Q38 25 32 38 Q28 42 25 45 Q22 42 18 38 Q12 25 20 30 Q15 20 25 5Z" dur="0.8s" repeatCount="indefinite" />
    </path>
    <path d="M25 15 Q31 25 28 33 Q25 38 25 40 Q25 38 22 33 Q19 25 25 15Z" fill="#E9C46A" opacity="0.9">
      <animate attributeName="d" values="M25 15 Q31 25 28 33 Q25 38 25 40 Q25 38 22 33 Q19 25 25 15Z;M25 18 Q29 24 27 31 Q25 36 25 38 Q25 36 23 31 Q21 24 25 18Z;M25 15 Q31 25 28 33 Q25 38 25 40 Q25 38 22 33 Q19 25 25 15Z" dur="0.6s" repeatCount="indefinite" />
    </path>
  </svg>
);

// ─── CSS ─────────────────────────────────────────────────────
const CSS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Special+Elite&family=Orbitron:wght@400;700;900&display=swap');
:root{--r:#E63946;--bl:#457B9D;--t:#2A9D8F;--g:#E9C46A;--dk:#0B0E17;--lt:#F1FAEE}
*{box-sizing:border-box;margin:0;padding:0}
html,body{overflow:hidden;touch-action:manipulation;user-select:none;-webkit-user-select:none;background:var(--dk)}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(25px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideR{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}10%{transform:translateX(-10px) rotate(-1deg)}30%{transform:translateX(8px) rotate(1deg)}50%{transform:translateX(-6px)}70%{transform:translateX(4px)}}
@keyframes heavyShake{0%,100%{transform:translate(0)}10%{transform:translate(-15px,5px) rotate(-2deg)}30%{transform:translate(12px,-3px) rotate(2deg)}50%{transform:translate(-8px,4px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes pulseSlow{0%,100%{opacity:0.6}50%{opacity:1}}
@keyframes pulseScale{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes glow{0%,100%{box-shadow:0 0 5px currentColor}50%{box-shadow:0 0 25px currentColor}}
@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
@keyframes glitch{0%,100%{transform:translate(0)}20%{transform:translate(-3px,2px);filter:hue-rotate(90deg)}40%{transform:translate(3px,-2px)}60%{transform:translate(-2px,-1px);filter:brightness(1.5)}80%{transform:translate(2px,1px)}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes blinkSlow{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes floatSlow{0%,100%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-6px) rotate(1deg)}75%{transform:translateY(6px) rotate(-1deg)}}
@keyframes countIn{0%{transform:scale(3);opacity:0}40%{transform:scale(1);opacity:1}100%{transform:scale(0.5);opacity:0}}
@keyframes comicBurst{0%{transform:scale(0) rotate(-15deg);opacity:0;filter:blur(10px)}60%{transform:scale(1.2) rotate(3deg);opacity:1;filter:blur(0)}100%{transform:scale(1) rotate(0)}}
@keyframes comicStar{0%{transform:scale(0) rotate(0)}50%{transform:scale(1.3) rotate(180deg)}100%{transform:scale(1) rotate(360deg)}}
@keyframes fireCrackle{0%,100%{opacity:0.4}25%{opacity:0.7}50%{opacity:1}75%{opacity:0.6}}
@keyframes progGlow{0%,100%{box-shadow:0 0 4px currentColor}50%{box-shadow:0 0 15px currentColor}}
@keyframes heartbeat{0%,100%{transform:scale(1)}14%{transform:scale(1.1)}28%{transform:scale(1)}42%{transform:scale(1.08)}}
@keyframes countUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes rippleOut{0%{transform:scale(0.8);opacity:0.5}100%{transform:scale(2.5);opacity:0}}
input[type="text"]{width:100%;padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:var(--lt);font-size:0.9rem;font-family:'Special Elite',cursive;outline:none;transition:border 0.2s}
input[type="text"]:focus{border-color:var(--g);box-shadow:0 0 10px rgba(233,196,106,0.15)}`;

// ─── HELPERS ─────────────────────────────────────────────────
const scr={display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"20px",position:"relative"};
const B=(v="default")=>({padding:"14px 32px",fontSize:"clamp(1rem,3vw,1.3rem)",border:"2px solid rgba(255,255,255,0.2)",borderRadius:"10px",cursor:"pointer",fontFamily:"'Bebas Neue',sans-serif",textTransform:"uppercase",letterSpacing:"2px",transition:"all 0.25s",background:"transparent",color:"var(--lt)",position:"relative",...(v==="primary"?{borderColor:"var(--r)",background:"linear-gradient(135deg,var(--r),#c1121f)",color:"#fff",boxShadow:"0 0 30px rgba(230,57,70,0.4)"}:v==="gold"?{borderColor:"var(--g)",color:"var(--g)"}:v==="teal"?{borderColor:"var(--t)",color:"var(--t)"}:{})});
const crd={background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"14px",padding:"20px",backdropFilter:"blur(12px)"};
const or=(s="0.5rem")=>({fontFamily:"'Orbitron',monospace",fontSize:s});
const se=(s="0.75rem")=>({fontFamily:"'Special Elite',cursive",fontSize:s});

const Timer = ({tl,mx})=>{const p=Math.max(0,(tl/mx)*100);const c=p>50?"var(--t)":p>20?"var(--g)":"var(--r)";return<div style={{width:"100%"}}><div style={{height:"5px",borderRadius:"3px",background:"rgba(255,255,255,0.08)",overflow:"hidden"}}><div style={{height:"100%",width:p+"%",borderRadius:"3px",background:c,transition:"width 1s linear",animation:p<20?"progGlow 0.6s infinite":"none",color:c}}/></div></div>;};

const HUD = ({mi,sc,tl,mx,team,cmb,mid})=>(
  <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"linear-gradient(180deg,rgba(6,8,16,0.96) 0%,rgba(6,8,16,0.8) 70%,transparent 100%)",padding:"8px 14px 14px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
        <span style={{fontSize:"0.95rem"}}>{team?.icon}</span>
        <span style={{...or("0.55rem"),color:"var(--g)",opacity:0.55}}>{TL[mid-1]||"14:30"}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
        <span style={{fontSize:"0.55rem",opacity:0.4}}>{mi?.icon}</span>
        <span style={{...or("0.5rem"),opacity:0.35}}>M{mi?.id}/7</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
        {cmb>=3&&<span style={{...or("0.65rem"),color:"var(--g)",fontWeight:900,animation:"pulseScale 0.5s infinite",textShadow:"0 0 10px rgba(233,196,106,0.5)"}}>{cmb>=5?"×3":"×2"}</span>}
        <span style={{...or("0.75rem"),color:"var(--g)",fontWeight:700}}>⭐{sc}</span>
      </div>
    </div>
    <Timer tl={tl} mx={mx} />
  </div>
);

const Toast = ({text,color,icon})=>(
  <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:280,background:"linear-gradient(135deg,"+color+"20,"+color+"10)",border:"2px solid "+color+"60",borderRadius:"16px",padding:"16px 28px",animation:"fadeUp 0.3s",backdropFilter:"blur(12px)",textAlign:"center",boxShadow:"0 10px 40px "+color+"30"}}>
    {icon&&<div style={{fontSize:"1.8rem",marginBottom:"4px"}}>{icon}</div>}
    <div style={{fontSize:"clamp(0.9rem,2.5vw,1.2rem)",color,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"1px"}}>{text}</div>
  </div>
);

const SMSBubble = ({msg,onX})=>(
  <div onClick={onX} style={{position:"fixed",bottom:"20px",right:"16px",width:"265px",zIndex:250,background:"linear-gradient(135deg,rgba(30,35,50,0.97),rgba(20,25,40,0.97))",border:"1px solid rgba(69,123,157,0.4)",borderRadius:"16px 16px 4px 16px",padding:"11px 13px",animation:"slideR 0.4s",boxShadow:"0 12px 40px rgba(0,0,0,0.6)"}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}><span style={{...or("0.5rem"),opacity:0.35}}>📱 SMS</span><span style={{fontSize:"0.45rem",opacity:0.25}}>maintenant</span></div>
    <div style={{fontSize:"0.65rem",color:"var(--g)",fontFamily:"'Bebas Neue',sans-serif"}}>{msg.from}</div>
    <div style={{...se("0.7rem"),lineHeight:1.5,opacity:0.85,marginTop:"2px"}}>{msg.text}</div>
    <div style={{fontSize:"0.4rem",opacity:0.2,textAlign:"right",marginTop:"4px"}}>tap pour fermer</div>
  </div>
);

const Smoke = ({i=0})=><div style={{position:"fixed",bottom:0,left:0,right:0,height:Math.min(55,i*75)+"%",background:"linear-gradient(transparent,rgba(80,80,80,"+Math.min(0.3,i*0.35)+"))",pointerEvents:"none",zIndex:45,transition:"all 2s"}}/>;
const RGlow = ({i=0.3})=><div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:35,background:"radial-gradient(ellipse at 50% 100%,rgba(230,57,70,"+i*0.15+") 0%,transparent 70%)",animation:"pulseSlow 3s infinite"}}/>;
const VHS = ()=><div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:260}}><div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(0deg,rgba(0,0,0,0.15) 0px,transparent 1px,transparent 3px)",opacity:0.5}}/><div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"rgba(255,255,255,0.1)",animation:"scanline 6s linear infinite"}}/></div>;

const TLDots = ({cur})=>(
  <div style={{display:"flex",alignItems:"center",gap:"2px",padding:"4px 0"}}>
    {TL.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"2px"}}>
      <div style={{width:"8px",height:"8px",borderRadius:"50%",background:i+1<cur?"var(--t)":i+1===cur?"var(--r)":"rgba(255,255,255,0.12)",boxShadow:i+1===cur?"0 0 8px var(--r)":"none",transition:"all 0.3s"}} />
      {i<7&&<div style={{width:"8px",height:"1px",background:i+1<cur?"var(--t)":"rgba(255,255,255,0.08)"}} />}
    </div>)}
  </div>
);

// Animated score counter
const AnimScore = ({value}) => {
  const [display, setDisplay] = useState(0);
  useEffect(()=>{
    let start = 0; const end = value; const dur = 1500; const t0 = Date.now();
    const tick = () => { const el = Date.now()-t0; const p = Math.min(el/dur,1); setDisplay(Math.round(p*end)); if(p<1) requestAnimationFrame(tick); };
    tick();
  },[value]);
  return <span>{display}</span>;
};

// ═══════════════════════════════════════════════════════
//  SCREENS
// ═══════════════════════════════════════════════════════

const TitleScreen = ({onGo,snd})=>(
  <div style={{...scr,background:"radial-gradient(ellipse at 50% 60%,#1a0a0a 0%,var(--dk) 60%)"}}>
    <Particles type="embers" intensity={0.8} />
    <RGlow i={0.5} />
    <div style={{position:"relative",zIndex:10,textAlign:"center"}}>
      <div style={{...or("0.7rem"),color:"var(--r)",opacity:0.5,letterSpacing:"8px",marginBottom:"8px",animation:"blinkSlow 3s infinite"}}>⚠ ALERTE SÉCURITÉ ⚠</div>
      <h1 style={{fontSize:"clamp(3rem,10vw,5rem)",fontFamily:"'Bebas Neue',sans-serif",color:"var(--r)",textShadow:"0 0 40px rgba(230,57,70,0.6),0 0 80px rgba(230,57,70,0.3),0 4px 0 #8b0000",letterSpacing:"6px",lineHeight:1,margin:"0 0 4px",animation:"heartbeat 2s infinite"}}>CODE ROUGE</h1>
      <div style={{...se("clamp(0.65rem,2vw,0.9rem)"),color:"var(--g)",opacity:0.7,letterSpacing:"3px",marginBottom:"6px"}}>Escape Game — Sécurité Incendie</div>
      <div style={{display:"flex",justifyContent:"center",marginBottom:"24px"}}><FireSVG size={50} intensity={1} /></div>
      <div style={{display:"flex",gap:"10px",justifyContent:"center",marginBottom:"26px",animation:"fadeUp 1s ease 0.5s backwards"}}>
        {["marcel","martine","gerard","sandrine","drh"].map((c,i)=><div key={c} style={{animation:"float 3s infinite "+i*0.3+"s"}}><Char id={c} size={40} /></div>)}
      </div>
      <div style={{display:"flex",gap:"18px",justifyContent:"center",marginBottom:"26px",opacity:0.4,...or("0.55rem")}}>
        <span>👥 3-5 joueurs</span><span>⏱️ 45-60 min</span><span>📱 Tablette</span>
      </div>
      <button style={{...B("primary"),fontSize:"clamp(1.2rem,4vw,1.6rem)",padding:"18px 50px",animation:"fadeUp 0.8s ease 0.8s backwards"}} onClick={async()=>{await snd.start();snd.siren();onGo();}}>🔥 COMMENCER</button>
      <div style={{marginTop:"18px",fontSize:"0.4rem",opacity:0.2,...or()}}>FIDUCIAL FPSG — Formation EPI</div>
    </div>
  </div>
);

const TeamScreen = ({onPick,snd})=>{
  const [sel,setSel]=useState(null);
  return(
    <div style={scr}>
      <Particles type="embers" intensity={0.3} />
      <h2 style={{fontSize:"clamp(1.3rem,4vw,1.9rem)",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"4px",marginBottom:"4px"}}>CHOISISSEZ VOTRE ÉQUIPE</h2>
      <p style={{...se("0.65rem"),opacity:0.4,marginBottom:"20px"}}>Chaque équipe a sa spécialité</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",width:"92%",maxWidth:"420px"}}>
        {TEAMS.map(t=>(
          <div key={t.id} onClick={()=>{setSel(t);snd.beep(600);}} style={{...crd,cursor:"pointer",textAlign:"center",padding:"18px 14px",border:sel?.id===t.id?"2px solid "+t.color:"1px solid rgba(255,255,255,0.08)",boxShadow:sel?.id===t.id?"0 0 25px "+t.color+"30,inset 0 0 20px "+t.color+"10":"none",background:sel?.id===t.id?"linear-gradient(135deg,"+t.color+"12,transparent)":undefined,transition:"all 0.3s"}}>
            <div style={{fontSize:"2.6rem",marginBottom:"5px",animation:sel?.id===t.id?"float 2s infinite":"none"}}>{t.icon}</div>
            <div style={{fontSize:"clamp(0.85rem,2.5vw,1.05rem)",color:t.color,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"2px"}}>{t.name}</div>
            <div style={{fontSize:"0.5rem",opacity:0.4,...se()}}>{t.desc}</div>
          </div>
        ))}
      </div>
      {sel&&<button style={{...B("primary"),marginTop:"22px",animation:"fadeUp 0.3s"}} onClick={()=>{snd.ok();onPick(sel);}}>C'est parti {sel.icon}</button>}
    </div>
  );
};

const VHSIntro = ({onEnd,snd})=>{
  const [ph,setPh]=useState(0);
  useEffect(()=>{
    snd.siren();
    const ts=[setTimeout(()=>setPh(1),2500),setTimeout(()=>{setPh(2);snd.err();},4500),setTimeout(()=>setPh(3),6500),setTimeout(()=>{setPh(4);snd.siren();},8500),setTimeout(onEnd,12000)];
    return()=>ts.forEach(clearTimeout);
  },[onEnd,snd]);
  const cams=[{n:"ACCUEIL",i:"🏢"},{n:"OPEN SPACE",i:"💻"},{n:"COULOIR 3E",i:"🚶"},{n:"PARKING",i:"🚗"}];
  return(
    <div style={{width:"100vw",height:"100vh",background:"#000",position:"relative"}}>
      <VHS />
      <Particles type="smoke" intensity={ph>=3?0.8:0} />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",width:"100%",height:"100%",gap:"2px",padding:"2px"}}>
        {cams.map((cam,i)=>(
          <div key={i} style={{background:i===2&&ph>=2?"#0a0000":"#0d0d0d",position:"relative",overflow:"hidden",borderRadius:"2px",animation:i===2&&ph===1?"glitch 0.15s infinite":"none"}}>
            {(i!==2||ph<1)&&<>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"clamp(2rem,5vw,3.5rem)",filter:"grayscale(1) contrast(1.2)",opacity:0.6}}>{cam.i}</div>
              <div style={{position:"absolute",top:"6px",left:"8px",...or("0.42rem"),color:"#0f0",opacity:0.6}}>● REC — CAM {i+1}</div>
              <div style={{position:"absolute",top:"6px",right:"8px",...or("0.42rem"),color:"#0f0",opacity:0.4}}>{cam.n}</div>
              <div style={{position:"absolute",bottom:"6px",right:"8px",...or("0.38rem"),color:"#0f0",opacity:0.3}}>14:30:0{i}</div>
            </>}
            {i===2&&ph>=2&&ph<4&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{...or("0.6rem"),color:"var(--r)",animation:"blink 0.5s infinite",textShadow:"0 0 10px var(--r)"}}>⚠ SIGNAL PERDU — CAM 3</span></div>}
            {i===2&&ph>=4&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"radial-gradient(circle,rgba(230,57,70,0.2),#0a0000)"}}><FireSVG size={60} intensity={1} /></div>}
          </div>
        ))}
      </div>
      {ph>=3&&<div style={{position:"fixed",bottom:"28px",left:"50%",transform:"translateX(-50%)",background:"rgba(230,57,70,0.15)",border:"1px solid var(--r)",borderRadius:"8px",padding:"10px 24px",zIndex:300,animation:"fadeUp 0.4s",backdropFilter:"blur(10px)",textAlign:"center"}}>
        <div style={{...or("clamp(0.6rem,2vw,0.9rem)"),color:"var(--r)",animation:"pulse 1s infinite",letterSpacing:"3px"}}>⚠ ALERTE INCENDIE — ÉTAGE 3 ⚠</div>
        <div style={{...se("0.45rem"),opacity:0.4,marginTop:"4px"}}>Déclenchement protocole de sécurité</div>
      </div>}
    </div>
  );
};

const Brief = ({mi,roles,team,cur,onGo,snd})=>{
  const [cd,setCd]=useState(null);
  useEffect(()=>{if(cd===null)return;if(cd<=0){onGo();return;}const t=setTimeout(()=>setCd(c=>c-1),1000);return()=>clearTimeout(t);},[cd,onGo]);
  if(cd!==null)return<div style={{...scr,background:"radial-gradient(circle,rgba(230,57,70,0.1),var(--dk))"}}>
    <div key={cd} style={{fontSize:"clamp(5rem,15vw,8rem)",...or(),fontWeight:900,color:cd>0?"var(--r)":"var(--t)",textShadow:cd>0?"0 0 30px rgba(230,57,70,0.4)":"0 0 30px rgba(42,157,143,0.4)",animation:"countIn 1s ease"}}>{cd>0?cd:"GO!"}</div>
  </div>;
  return(
    <div style={{...scr,background:"radial-gradient(ellipse at 50% 30%,rgba(230,57,70,0.06),var(--dk))"}}>
      <Particles type="embers" intensity={0.2} />
      <TLDots cur={cur} />
      <div style={{...or("0.5rem"),color:"var(--r)",opacity:0.4,margin:"4px 0 14px"}}>🕐 {TL[cur-1]}</div>
      <div style={{fontSize:"3.5rem",marginBottom:"6px",animation:"float 3s infinite"}}>{mi.icon}</div>
      <div style={{...or("0.5rem"),color:"var(--g)",opacity:0.5,letterSpacing:"4px",marginBottom:"4px"}}>MISSION {mi.id}/7</div>
      <h2 style={{fontSize:"clamp(1.5rem,5vw,2.3rem)",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"3px",textShadow:"0 0 30px rgba(230,57,70,0.5)",margin:"0 0 5px"}}>{mi.title}</h2>
      <p style={{...se("0.7rem"),opacity:0.5,maxWidth:"340px",textAlign:"center",marginBottom:"16px"}}>{mi.sub}</p>
      <div style={{...crd,width:"88%",maxWidth:"380px",marginBottom:"12px",padding:"12px 16px"}}>
        <div style={{...or("0.5rem"),opacity:0.3,marginBottom:"8px",letterSpacing:"2px"}}>RÔLES DE L'ÉQUIPE</div>
        <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
          {roles.map((r,i)=><div key={i} style={{padding:"7px 13px",borderRadius:"8px",fontSize:"clamp(0.7rem,2vw,0.8rem)",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(233,196,106,0.2)",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"1px"}}>{r}</div>)}
        </div>
      </div>
      <div style={{display:"flex",gap:"16px",marginBottom:"20px",opacity:0.4,...or("0.6rem")}}><span>⏱ {mi.time}s</span><span>🎯 1000pts max</span></div>
      <button style={{...B("primary"),fontSize:"clamp(1.1rem,3.5vw,1.4rem)",padding:"16px 44px"}} onClick={()=>{snd.beep(300);setCd(3);}}>LANCER LA MISSION 🎯</button>
    </div>
  );
};

const Comic = ({text,onEnd})=>{
  useEffect(()=>{const t=setTimeout(onEnd,2000);return()=>clearTimeout(t);},[onEnd]);
  const cl={BOOM:"#E63946",CRACK:"#E9C46A",SPLASH:"#457B9D",WHOOSH:"#2A9D8F",BANG:"#E63946",ZAP:"#E9C46A",POW:"#E07A5F"}[text.replace("!","")]||"#E63946";
  return(
    <div style={{...scr,background:"#060810"}}>
      <Particles type="sparks" intensity={2} />
      <svg style={{position:"absolute",width:"80vw",height:"80vw",maxWidth:"400px",maxHeight:"400px",animation:"comicStar 0.6s ease-out"}} viewBox="0 0 200 200"><polygon points="100,5 118,70 190,70 130,110 150,180 100,140 50,180 70,110 10,70 82,70" fill={cl+"15"} stroke={cl+"40"} strokeWidth="1" /></svg>
      <div style={{position:"relative",zIndex:10,fontSize:"clamp(4rem,14vw,7rem)",fontFamily:"'Bebas Neue',sans-serif",color:cl,textShadow:"4px 4px 0 #000,-2px -2px 0 "+cl+"80,0 0 40px "+cl+"60",animation:"comicBurst 0.5s ease-out",transform:"rotate(-5deg)"}}>{text}</div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
//  MISSIONS 1-4
// ═══════════════════════════════════════════════════════

const M1 = ({onDone,snd,team})=>{
  const [found,setFound]=useState([]);
  const [tl,setTl]=useState(90);
  const [shk,setShk]=useState(false);
  const [crk,setCrk]=useState(false);
  const [jok,setJok]=useState({h:2,f:1});
  const [frz,setFrz]=useState(false);
  const [hintD,setHintD]=useState(null);
  const [fb,setFb]=useState(null);
  const [wr,setWr]=useState(0);
  const [cmb,setCmb]=useState(0);
  const [lastCat,setLastCat]=useState(null);
  const [fireGrow,setFireGrow]=useState(0);

  useEffect(()=>{
    if(frz)return;
    if(tl<=0||found.length===HAZ.length){onDone({found:found.length,total:HAZ.length,time:90-tl,wrong:wr,combo:cmb});return;}
    const t=setTimeout(()=>{setTl(p=>p-1);setFireGrow(g=>g+0.012);},1000);return()=>clearTimeout(t);
  },[tl,found,frz,onDone,wr,cmb]);
  useEffect(()=>{if(tl>20||tl<=0)return;const i=setInterval(()=>snd.hb(tl<10),tl<10?500:800);return()=>clearInterval(i);},[tl,snd]);

  const tap=h=>{if(found.includes(h.id))return;setFound(p=>[...p,h.id]);setCmb(c=>c+1);setLastCat(h.cat);snd.combo(cmb);setFb({text:h.ic+" "+h.label,color:"var(--t)",icon:"✅"});setTimeout(()=>{setFb(null);setLastCat(null);},2000);};
  const miss=()=>{setWr(p=>p+1);setCmb(0);setShk(true);setCrk(true);snd.err();setFb({text:"Rien ici !",color:"var(--r)",icon:"✖"});setTimeout(()=>{setShk(false);setFb(null);},800);setTimeout(()=>setCrk(false),3000);};
  const doHint=()=>{if(jok.h<=0)return;const rem=HAZ.filter(h=>!found.includes(h.id));if(!rem.length)return;setHintD(rem[Math.floor(Math.random()*rem.length)]);setJok(p=>({...p,h:p.h-1}));snd.beep(880);setTimeout(()=>setHintD(null),4000);};
  const doFreeze=()=>{if(jok.f<=0)return;setFrz(true);setJok(p=>({...p,f:p.f-1}));snd.beep(1200);setTimeout(()=>setFrz(false),10000);};

  return(
    <div style={{minHeight:"100vh",background:"var(--dk)",position:"relative",animation:shk?"heavyShake 0.4s":"none"}}>
      <HUD mi={MISS[0]} sc={found.length*100+cmb*20} tl={tl} mx={90} team={team} cmb={cmb} mid={1} />
      <Crack show={crk}/><Smoke i={(90-tl)/90}/><RGlow i={(90-tl)/150}/>
      <Particles type="embers" intensity={(90-tl)/120} />
      {fb&&<Toast text={fb.text} color={fb.color} icon={fb.icon}/>}
      {hintD&&<div style={{position:"fixed",bottom:"78px",left:"50%",transform:"translateX(-50%)",zIndex:200,background:"rgba(233,196,106,0.1)",border:"1px solid var(--g)",borderRadius:"12px",padding:"10px 20px",...se("0.7rem"),color:"var(--g)",maxWidth:"280px",textAlign:"center",animation:"fadeUp 0.3s",backdropFilter:"blur(10px)"}}>💡 {hintD.hint}</div>}
      {frz&&<div style={{position:"fixed",top:"52px",left:"50%",transform:"translateX(-50%)",zIndex:160,...or("0.55rem"),color:"var(--bl)",animation:"pulse 1s infinite"}}>❄️ TIMER GELÉ</div>}

      {/* Growing fire indicator */}
      {fireGrow>0.3&&<div style={{position:"fixed",bottom:"10px",left:"10px",zIndex:55,animation:"floatSlow 3s infinite"}}><FireSVG size={30+fireGrow*30} intensity={fireGrow} /></div>}

      <div style={{position:"relative",width:"96%",maxWidth:"650px",aspectRatio:"16/10",margin:"55px auto 6px",background:"linear-gradient(135deg,#141820,#0a0d14)",borderRadius:"14px",border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden",boxShadow:"inset 0 0 40px rgba(0,0,0,0.5)"}} onClick={miss}>
        <div style={{position:"absolute",inset:0,opacity:0.04,backgroundImage:"linear-gradient(rgba(255,255,255,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.3) 1px,transparent 1px)",backgroundSize:"8.33% 10%"}}/>
        <div style={{position:"absolute",top:"3%",left:"4%",...or("0.35rem"),color:"var(--t)",opacity:0.25}}>OPEN SPACE — ÉTAGE 3 — FIDUCIAL</div>
        {[{x:5,y:10,w:28,h:25,l:"Bureau Marcel",c:"#E07A5F"},{x:40,y:5,w:25,h:20,l:"Bureau Martine",c:"#81B29A"},{x:68,y:45,w:28,h:25,l:"Couloir Est",c:"#577590"},{x:22,y:40,w:20,h:18,l:"Local technique",c:"#6C757D"},{x:3,y:60,w:22,h:22,l:"Stockage",c:"#E07A5F"},{x:50,y:62,w:30,h:22,l:"Sortie secours",c:"#E63946"}].map((z,i)=><div key={i} style={{position:"absolute",left:z.x+"%",top:z.y+"%",width:z.w+"%",height:z.h+"%",border:"1px dashed "+z.c+"15",borderRadius:"6px"}}><span style={{position:"absolute",bottom:"2px",left:"4px",fontSize:"0.32rem",color:z.c,opacity:0.25,...or()}}>{z.l}</span></div>)}
        <div style={{position:"absolute",left:"15%",top:"16%",zIndex:8,animation:"floatSlow 4s infinite"}}><Char id="marcel" size={36} bubble={lastCat==="feu"} emotion={found.length>5?"stressed":"neutral"} /></div>
        <div style={{position:"absolute",left:"48%",top:"6%",zIndex:8,animation:"floatSlow 4s infinite 0.5s"}}><Char id="martine" size={36} bubble={lastCat==="élec"} /></div>
        <div style={{position:"absolute",left:"75%",top:"50%",zIndex:8,animation:"floatSlow 4s infinite 1s"}}><Char id="gerard" size={36} bubble={lastCat==="évac"} /></div>
        {HAZ.map(h=>{const fd=found.includes(h.id);return<div key={h.id} onClick={e=>{e.stopPropagation();if(!fd)tap(h);}} style={{position:"absolute",left:h.x+"%",top:h.y+"%",width:h.w+"%",height:h.h+"%",borderRadius:"8px",cursor:fd?"default":"pointer",zIndex:12,background:fd?"rgba(42,157,143,0.15)":"rgba(230,57,70,0.04)",border:fd?"2px solid rgba(42,157,143,0.5)":"2px solid transparent",boxShadow:fd?"0 0 15px rgba(42,157,143,0.2)":"none",transition:"all 0.4s",display:"flex",alignItems:"center",justifyContent:"center"}}>{fd?<div style={{textAlign:"center"}}><div style={{fontSize:"1.1rem"}}>✅</div><div style={{fontSize:"0.32rem",opacity:0.5,marginTop:"1px"}}>{h.label}</div></div>:<div style={{width:"7px",height:"7px",background:"var(--r)",borderRadius:"50%",opacity:0.12,animation:"fireCrackle 2s infinite"}}/>}</div>;})}
        <div style={{position:"absolute",bottom:"6px",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"3px",background:"rgba(0,0,0,0.6)",padding:"3px 8px",borderRadius:"20px"}}>
          {HAZ.map(h=><div key={h.id} style={{width:"8px",height:"8px",borderRadius:"50%",background:found.includes(h.id)?"var(--t)":"rgba(255,255,255,0.1)",boxShadow:found.includes(h.id)?"0 0 4px var(--t)":"none",transition:"all 0.3s"}}/>)}
        </div>
      </div>
      <div style={{display:"flex",gap:"10px",justifyContent:"center",marginTop:"4px"}}>
        <button style={{...B("gold"),fontSize:"0.65rem",padding:"7px 13px",opacity:jok.h<=0?0.3:1}} onClick={doHint} disabled={jok.h<=0}>💡 Indice ({jok.h})</button>
        <button style={{...B("teal"),fontSize:"0.65rem",padding:"7px 13px",opacity:jok.f<=0?0.3:1}} onClick={doFreeze} disabled={jok.f<=0}>❄️ Gel ({jok.f})</button>
      </div>
    </div>
  );
};

const M2 = ({onDone,snd,team})=>{
  const [seq,setSeq]=useState([]);const[tl,setTl]=useState(60);const[err2,setErr2]=useState(false);const[crk,setCrk]=useState(false);const[fb,setFb]=useState(null);const[done,setDone]=useState(false);const[aBtn,setABtn]=useState(null);
  useEffect(()=>{if(tl<=0&&!done){onDone({correct:seq.length,total:5,time:60});return;}if(done)return;const t=setTimeout(()=>setTl(p=>p-1),1000);return()=>clearTimeout(t);},[tl,done,onDone,seq]);
  const press=(item,idx)=>{if(done)return;setABtn(idx);setTimeout(()=>setABtn(null),300);
    if(item.id===CTRL[seq.length].id){const ns=[...seq,item.id];setSeq(ns);snd.beep(400+ns.length*120);setFb({text:item.label,color:"var(--t)",icon:item.icon});setTimeout(()=>setFb(null),1200);if(ns.length===5){setDone(true);snd.ok();setFb({text:"SÉQUENCE COMPLÈTE !",color:"var(--t)",icon:"🎉"});setTimeout(()=>onDone({correct:5,total:5,time:60-tl}),2000);}}
    else{setSeq([]);setErr2(true);setCrk(true);snd.err();setFb({text:"ERREUR — Reset",color:"var(--r)",icon:"❌"});setTimeout(()=>{setErr2(false);setFb(null);},1200);setTimeout(()=>setCrk(false),3000);}
  };
  return(
    <div style={{minHeight:"100vh",background:"var(--dk)",position:"relative",animation:err2?"heavyShake 0.5s":"none"}}>
      <HUD mi={MISS[1]} sc={seq.length*200} tl={tl} mx={60} team={team} cmb={seq.length} mid={2}/>
      <Crack show={crk}/><RGlow i={0.2}/>
      {fb&&<Toast text={fb.text} color={fb.color} icon={fb.icon}/>}
      <div style={{padding:"58px 16px 20px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{...or("0.45rem"),color:"var(--t)",opacity:0.3,letterSpacing:"3px",marginBottom:"8px"}}>▸ PANNEAU DE CONTRÔLE SÉCURITÉ</div>
        {/* LED indicators */}
        <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>{CTRL.map((s,i)=><div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
          <div style={{width:"12px",height:"12px",borderRadius:"50%",background:i<seq.length?s.color:"rgba(255,255,255,0.08)",boxShadow:i<seq.length?"0 0 10px "+s.color:i===seq.length?"0 0 8px var(--g)":"none",border:i===seq.length?"2px solid var(--g)":"2px solid transparent",transition:"all 0.3s"}}/>
          <div style={{...or("0.3rem"),opacity:0.2}}>{i+1}</div>
        </div>)}</div>
        <div style={{...crd,width:"92%",maxWidth:"480px",padding:"16px",background:"linear-gradient(135deg,rgba(16,20,32,0.95),rgba(8,10,18,0.95))",border:"2px solid rgba(255,255,255,0.08)",boxShadow:"inset 0 0 40px rgba(0,0,0,0.5)"}}>
          <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
            {CTRL.map((item,i)=>{const d=seq.includes(item.id),nx=i===seq.length;
              return<button key={item.id} onClick={()=>press(item,i)} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px",width:"100%",background:d?item.color+"12":aBtn===i?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.02)",border:"2px solid "+(d?item.color+"60":nx?"rgba(233,196,106,0.3)":"rgba(255,255,255,0.06)"),borderRadius:"10px",cursor:d?"default":"pointer",color:"var(--lt)",fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(0.8rem,2.5vw,1rem)",letterSpacing:"1px",opacity:d?0.5:1,textAlign:"left",boxShadow:nx?"0 0 15px "+item.color+"15":"none",transition:"all 0.2s",transform:aBtn===i?"scale(0.97)":"scale(1)"}}>
                <span style={{fontSize:"1.3rem",minWidth:"28px",textAlign:"center"}}>{item.icon}</span>
                <div style={{flex:1}}><div>{item.label}</div><div style={{...se("0.42rem"),opacity:0.4}}>{item.desc}</div></div>
                {d&&<span>✅</span>}{nx&&!d&&<div style={{width:"9px",height:"9px",borderRadius:"50%",background:"var(--g)",animation:"pulse 1s infinite"}}/>}
              </button>;})}
          </div>
        </div>
      </div>
    </div>
  );
};

const M3 = ({onDone,snd,team})=>{
  const [phase,setPhase]=useState("listen");const[playing,setPlaying]=useState(null);
  const [quizOrd]=useState(()=>[...ALRM].sort(()=>Math.random()-0.5));
  const [ans,setAns]=useState([]);const[tl,setTl]=useState(75);const[fb,setFb]=useState(null);
  useEffect(()=>{if(phase!=="quiz")return;if(tl<=0){onDone({correct:ans.filter(Boolean).length,total:4,time:75});return;}const t=setTimeout(()=>setTl(p=>p-1),1000);return()=>clearTimeout(t);},[tl,phase,ans,onDone]);
  const play=id=>{setPlaying(id);snd.alarm(id);setTimeout(()=>setPlaying(null),2000);};
  const answer=id=>{const ok=id===quizOrd[ans.length].id;const na=[...ans,ok];setAns(na);if(ok){snd.ok();setFb({text:"Correct !",color:"var(--t)",icon:"✅"});}else{snd.err();setFb({text:"C'était : "+quizOrd[ans.length].label,color:"var(--r)",icon:"❌"});}setTimeout(()=>setFb(null),1500);if(na.length===4)setTimeout(()=>onDone({correct:na.filter(Boolean).length,total:4,time:75-tl}),2000);};
  return(
    <div style={{minHeight:"100vh",background:"var(--dk)",position:"relative"}}>
      <HUD mi={MISS[2]} sc={ans.filter(Boolean).length*250} tl={tl} mx={75} team={team} cmb={ans.filter(Boolean).length} mid={3}/>
      {fb&&<Toast text={fb.text} color={fb.color} icon={fb.icon}/>}
      <div style={{padding:"58px 16px 20px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        {phase==="listen"&&<>
          <div style={{...or("0.45rem"),opacity:0.3,letterSpacing:"3px",marginBottom:"5px"}}>PHASE D'ÉCOUTE</div>
          <p style={{...se("0.65rem"),opacity:0.4,marginBottom:"16px",textAlign:"center"}}>Écoutez et mémorisez chaque alarme</p>
          <div style={{display:"flex",flexDirection:"column",gap:"9px",width:"90%",maxWidth:"400px"}}>
            {ALRM.map(a=><button key={a.id} onClick={()=>play(a.id)} style={{...crd,display:"flex",alignItems:"center",gap:"12px",cursor:"pointer",padding:"13px 15px",border:playing===a.id?"2px solid var(--g)":"1px solid rgba(255,255,255,0.08)",boxShadow:playing===a.id?"0 0 25px rgba(233,196,106,0.4)":"none",transition:"all 0.3s"}}><div style={{fontSize:"1.8rem",animation:playing===a.id?"pulseScale 0.3s":"none"}}>🔊</div><div><div style={{fontSize:"0.9rem",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"1px"}}>{a.label}</div><div style={{...se("0.5rem"),opacity:0.4}}>{a.desc}</div></div></button>)}
          </div>
          <button style={{...B("primary"),marginTop:"20px"}} onClick={()=>setPhase("quiz")}>J'ai mémorisé ! →</button>
        </>}
        {phase==="quiz"&&ans.length<4&&<>
          <div style={{...or("0.45rem"),opacity:0.3,letterSpacing:"3px",marginBottom:"5px"}}>ALARME {ans.length+1}/4</div>
          <p style={{...se("0.65rem"),opacity:0.4,marginBottom:"12px"}}>Quelle alarme est-ce ?</p>
          <button style={{...B("gold"),marginBottom:"16px",fontSize:"1.4rem",padding:"12px 34px"}} onClick={()=>play(quizOrd[ans.length].id)}>🔊 Écouter</button>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",width:"90%",maxWidth:"380px"}}>
            {ALRM.map(a=><button key={a.id} onClick={()=>answer(a.id)} style={{...crd,cursor:"pointer",textAlign:"center",padding:"13px 10px",border:"2px solid rgba(255,255,255,0.1)",transition:"all 0.2s"}}><div style={{fontSize:"0.8rem",fontFamily:"'Bebas Neue',sans-serif"}}>{a.label}</div><div style={{...se("0.45rem"),opacity:0.35}}>{a.desc}</div></button>)}
          </div>
          <div style={{display:"flex",gap:"5px",marginTop:"10px"}}>{ans.map((a,i)=><div key={i} style={{width:"15px",height:"15px",borderRadius:"50%",background:a?"var(--t)":"var(--r)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.4rem"}}>{a?"✓":"✗"}</div>)}</div>
        </>}
      </div>
    </div>
  );
};

const M4 = ({onDone,snd,team})=>{
  const [phase,setPhase]=useState("dial");const[dialed,setDialed]=useState("");const[tl,setTl]=useState(60);const[rpt,setRpt]=useState({});const[fb,setFb]=useState(null);const[dialOk,setDialOk]=useState(false);const[aKey,setAKey]=useState(null);
  useEffect(()=>{if(tl<=0){onDone({dialed:dialOk,report:Object.values(rpt).filter(v=>v?.trim()).length,total:5,time:60});return;}const t=setTimeout(()=>setTl(p=>p-1),1000);return()=>clearTimeout(t);},[tl,dialOk,rpt,onDone]);
  const dial=n=>{setAKey(n);setTimeout(()=>setAKey(null),150);snd.beep(180+parseInt(n)*75);const nx=dialed+n;setDialed(nx);if(nx==="18"||nx==="112"){setDialOk(true);snd.ok();setFb({text:"Connexion établie !",color:"var(--t)",icon:"📞"});setTimeout(()=>{setFb(null);setPhase("report");},1500);}else if(nx.length>=3){snd.err();setFb({text:"Mauvais numéro !",color:"var(--r)",icon:"❌"});setTimeout(()=>{setDialed("");setFb(null);},1000);}};
  return(
    <div style={{minHeight:"100vh",background:"var(--dk)",position:"relative"}}>
      <HUD mi={MISS[3]} sc={(dialOk?200:0)+Object.values(rpt).filter(v=>v?.trim()).length*150} tl={tl} mx={60} team={team} cmb={0} mid={4}/>
      {fb&&<Toast text={fb.text} color={fb.color} icon={fb.icon}/>}
      <div style={{padding:"58px 16px 20px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        {phase==="dial"&&<>
          <div style={{fontSize:"3rem",marginBottom:"5px",animation:"heartbeat 1.5s infinite"}}>☎️</div>
          <div style={{...or("0.45rem"),opacity:0.3,letterSpacing:"3px",marginBottom:"4px"}}>TÉLÉPHONE ROUGE</div>
          <p style={{...se("0.65rem"),opacity:0.4,marginBottom:"12px"}}>Composez le numéro des secours</p>
          <div style={{width:"200px",textAlign:"center",marginBottom:"12px",...or("2rem"),letterSpacing:"10px",padding:"13px",background:"rgba(0,0,0,0.4)",border:"2px solid rgba(230,57,70,0.2)",borderRadius:"10px",color:"var(--r)",textShadow:dialed?"0 0 10px var(--r)":"none",minHeight:"54px"}}>{dialed||"—"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"5px",width:"210px"}}>
            {[1,2,3,4,5,6,7,8,9,null,0,null].map((n,i)=><button key={i} onClick={()=>n!==null&&dial(String(n))} style={{width:"64px",height:"64px",borderRadius:"50%",fontSize:"1.3rem",background:n!==null?(aKey===String(n)?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.04)"):"transparent",border:n!==null?"2px solid rgba(255,255,255,0.12)":"none",color:"var(--lt)",cursor:n!==null?"pointer":"default",...or("1.3rem"),fontWeight:700,transition:"all 0.1s",transform:aKey===String(n)?"scale(0.92)":"scale(1)"}}>{n!==null?n:""}</button>)}
          </div>
          <div style={{...se("0.5rem"),opacity:0.2,marginTop:"8px"}}>🔥 Pompiers: 18 | 🇪🇺 Urgences: 112</div>
        </>}
        {phase==="report"&&<>
          <div style={{...or("0.45rem"),opacity:0.3,letterSpacing:"3px",marginBottom:"4px"}}>RAPPORT DE SITUATION</div>
          <p style={{...se("0.65rem"),opacity:0.4,marginBottom:"12px"}}>Les secours ont besoin de ces infos</p>
          <div style={{width:"92%",maxWidth:"420px",display:"flex",flexDirection:"column",gap:"7px"}}>
            {RPT.map((r,i)=><div key={r.f} style={{...crd,padding:"9px 13px",animation:"fadeUp 0.3s ease "+i*0.08+"s backwards"}}><label style={{...or("0.48rem"),opacity:0.3,display:"flex",alignItems:"center",gap:"5px",marginBottom:"3px"}}><span>{r.ic}</span>{r.f}</label><input type="text" placeholder={r.ph} onChange={e=>setRpt(p=>({...p,[r.f]:e.target.value}))}/></div>)}
          </div>
          <button style={{...B("primary"),marginTop:"12px"}} onClick={()=>{snd.ok();setTimeout(()=>onDone({dialed:dialOk,report:Object.values(rpt).filter(v=>v?.trim()).length,total:5,time:60-tl}),1000);}}>📤 Transmettre</button>
        </>}
      </div>
    </div>
  );
};

// ─── M5: BLACKOUT ────────────────────────────────────────────
const M5 = ({onDone,snd,team})=>{
  const [pos,setPos]=useState({x:50,y:50});
  const [found,setFound]=useState([]);
  const [tl,setTl]=useState(45);
  const [fb,setFb]=useState(null);
  const [battery,setBattery]=useState(1);
  const ref=useRef(null);

  useEffect(()=>{
    if(tl<=0||found.length===FLI.length){onDone({found:found.length,total:FLI.length,time:45-tl});return;}
    const t=setTimeout(()=>{setTl(p=>p-1);setBattery(b=>Math.max(0.3,b-0.015));},1000);
    return()=>clearTimeout(t);
  },[tl,found,onDone]);
  useEffect(()=>{if(tl>15||tl<=0)return;const i=setInterval(()=>snd.hb(true),600);return()=>clearInterval(i);},[tl,snd]);

  const move=e=>{
    if(!ref.current)return;
    const r=ref.current.getBoundingClientRect();
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    const x=((cx-r.left)/r.width)*100,y=((cy-r.top)/r.height)*100;
    setPos({x,y});
    FLI.forEach(item=>{
      if(found.includes(item.id))return;
      if(Math.sqrt((x-item.x)**2+(y-item.y)**2)<item.r){
        setFound(p=>[...p,item.id]);snd.ok();
        setFb({text:item.label,color:"var(--g)",icon:item.ic});
        setTimeout(()=>setFb(null),1500);
      }
    });
  };

  const beamSize = Math.round(50 + battery * 30);

  return(
    <div style={{width:"100vw",height:"100vh",background:"#000",position:"relative"}}>
      <HUD mi={MISS[4]} sc={found.length*200} tl={tl} mx={45} team={team} cmb={found.length} mid={5}/>
      {fb&&<Toast text={fb.text} color={fb.color} icon={fb.icon}/>}
      <div ref={ref} onMouseMove={move} onTouchMove={move} onTouchStart={move}
        style={{width:"100%",height:"100%",position:"relative",cursor:"none",touchAction:"none",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,zIndex:20,pointerEvents:"none",
          background:"radial-gradient(circle "+beamSize+"px at "+pos.x+"% "+pos.y+"%,transparent 0%,rgba(0,0,0,0.03) 30%,rgba(0,0,0,0.97) 100%)"}}/>
        <div style={{position:"absolute",inset:0,opacity:0.02,
          backgroundImage:"linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
          backgroundSize:"10% 10%"}}/>
        {FLI.map(item=>(
          <div key={item.id} style={{position:"absolute",left:item.x+"%",top:item.y+"%",transform:"translate(-50%,-50%)",
            fontSize:found.includes(item.id)?"2.2rem":"1.5rem",zIndex:10,
            textShadow:found.includes(item.id)?"0 0 15px var(--g)":"none",transition:"all 0.3s"}}>
            {item.ic}
            {found.includes(item.id)&&<div style={{...or("0.38rem"),textAlign:"center",color:"var(--g)",whiteSpace:"nowrap"}}>{item.label}</div>}
          </div>
        ))}
        <div style={{position:"absolute",top:"50px",right:"10px",zIndex:30,width:"24px",height:"60px",
          border:"1px solid rgba(255,255,255,0.15)",borderRadius:"3px",overflow:"hidden",background:"rgba(0,0,0,0.5)"}}>
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:battery*100+"%",
            background:battery>0.5?"var(--t)":"var(--r)",transition:"height 1s",opacity:0.7}}/>
        </div>
        <div style={{position:"absolute",bottom:"14px",left:"50%",transform:"translateX(-50%)",zIndex:30,
          ...or("0.45rem"),color:"rgba(255,255,255,0.15)",letterSpacing:"2px"}}>
          {found.length}/{FLI.length}
        </div>
      </div>
    </div>
  );
};

// ─── M6: SPOT DIFF ───────────────────────────────────────────
const M6 = ({onDone,snd,team})=>{
  const [found,setFound]=useState([]);
  const [tl,setTl]=useState(60);
  const [fb,setFb]=useState(null);
  const [wr,setWr]=useState(0);
  const [shk,setShk]=useState(false);

  useEffect(()=>{
    if(tl<=0||found.length===SDIF.length){onDone({found:found.length,total:SDIF.length,time:60-tl,wrong:wr});return;}
    const t=setTimeout(()=>setTl(p=>p-1),1000);return()=>clearTimeout(t);
  },[tl,found,wr,onDone]);

  const tapD=d=>{if(found.includes(d.id))return;setFound(p=>[...p,d.id]);snd.ok();setFb({text:d.label,color:"var(--t)",icon:"\u2705"});setTimeout(()=>setFb(null),1200);};
  const miss=()=>{setWr(p=>p+1);setShk(true);snd.err();setTimeout(()=>setShk(false),500);};

  const Scene=({isB})=>(
    <div onClick={miss} style={{flex:1,position:"relative",background:"linear-gradient(135deg,#141820,#0a0d14)",
      borderRadius:"10px",overflow:"hidden",minHeight:"200px",
      border:"1px solid "+(isB?"rgba(230,57,70,0.12)":"rgba(42,157,143,0.12)"),
      boxShadow:"inset 0 0 20px rgba(0,0,0,0.3)"}}>
      <div style={{position:"absolute",top:"4px",left:"8px",...or("0.32rem"),opacity:0.2,
        color:isB?"var(--r)":"var(--t)"}}>{isB?"\u26A0 VIOLATIONS":"\u2713 CONFORME"}</div>
      {[{x:15,y:25,e:"\uD83D\uDDA5\uFE0F"},{x:45,y:22,e:"\uD83D\uDDA8\uFE0F"},{x:75,y:22,e:"\uD83D\uDCC1"},{x:30,y:50,e:"\uD83E\uDE91"},{x:60,y:50,e:"\uD83E\uDE91"},{x:85,y:72,e:"\uD83D\uDEAA"},{x:10,y:72,e:"\uD83D\uDDC4\uFE0F"},{x:50,y:75,e:"\uD83E\uDDEF"}].map((m,i)=>(
        <div key={i} style={{position:"absolute",left:m.x+"%",top:m.y+"%",fontSize:"clamp(0.7rem,2vw,0.95rem)"}}>{m.e}</div>
      ))}
      {[{x:25,y:38,c:"marcel"},{x:55,y:60,c:"martine"},{x:78,y:45,c:"drh"}].map((p,i)=>(
        <div key={i} style={{position:"absolute",left:p.x+"%",top:p.y+"%",animation:"floatSlow "+(3+i)+"s infinite "+i*0.4+"s"}}>
          <Char id={p.c} size={22}/>
        </div>
      ))}
      {isB&&SDIF.map(d=>(
        <div key={d.id} onClick={e=>{e.stopPropagation();tapD(d);}}
          style={{position:"absolute",left:d.x+"%",top:d.y+"%",width:"14%",height:"14%",
            transform:"translate(-50%,-50%)",borderRadius:"50%",cursor:"pointer",zIndex:10,
            background:found.includes(d.id)?"rgba(42,157,143,0.2)":"rgba(230,57,70,0.05)",
            border:found.includes(d.id)?"2px solid var(--t)":"2px solid transparent",
            boxShadow:found.includes(d.id)?"0 0 15px rgba(42,157,143,0.3)":"none",
            transition:"all 0.3s",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {found.includes(d.id)&&<span style={{fontSize:"0.75rem"}}>{"\u2705"}</span>}
        </div>
      ))}
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"var(--dk)",position:"relative",animation:shk?"shake 0.4s":"none"}}>
      <HUD mi={MISS[5]} sc={found.length*150} tl={tl} mx={60} team={team} cmb={found.length} mid={6}/>
      {fb&&<Toast text={fb.text} color={fb.color} icon={fb.icon}/>}
      <div style={{padding:"56px 10px 10px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{...se("0.6rem"),opacity:0.4,marginBottom:"6px"}}>Trouvez les {SDIF.length} violations dans la droite</div>
        <div style={{display:"flex",gap:"6px",width:"97%",maxWidth:"700px",flex:1,maxHeight:"58vh"}}>
          <Scene isB={false}/><Scene isB={true}/>
        </div>
        <div style={{display:"flex",gap:"4px",marginTop:"6px"}}>
          {SDIF.map(d=><div key={d.id} style={{width:"13px",height:"13px",borderRadius:"50%",
            background:found.includes(d.id)?"var(--t)":"rgba(255,255,255,0.1)",transition:"all 0.3s"}}/>)}
        </div>
      </div>
    </div>
  );
};

// ─── M7: MAZE WITH FOG OF WAR ───────────────────────────────
const M7 = ({onDone,snd,team})=>{
  const [pl,setPl]=useState([0,0]);
  const [path,setPath]=useState([[0,0]]);
  const [tl,setTl]=useState(90);
  const [fb,setFb]=useState(null);
  const [saved,setSaved]=useState([]);
  const [dil,setDil]=useState(null);
  const cs=Math.min(24,(typeof window!=="undefined"?window.innerWidth-40:300)/MSZ);
  const fogR = 3;

  useEffect(()=>{
    if(tl<=0||(pl[0]===12&&pl[1]===12)){
      onDone({completed:pl[0]===12&&pl[1]===12,rescued:saved.length,time:90-tl});return;
    }
    const t=setTimeout(()=>setTl(p=>p-1),1000);return()=>clearTimeout(t);
  },[tl,pl,saved,onDone]);
  useEffect(()=>{if(tl>20||tl<=0)return;const i=setInterval(()=>snd.hb(tl<10),tl<10?500:800);return()=>clearInterval(i);},[tl,snd]);

  const isVis=(r,c)=>{
    return Math.abs(r-pl[0])+Math.abs(c-pl[1])<=fogR || path.some(p=>Math.abs(p[0]-r)+Math.abs(p[1]-c)<=1);
  };

  const move=(dr,dc)=>{
    if(dil)return;
    const nr=pl[0]+dr,nc=pl[1]+dc;
    if(nr<0||nr>=MSZ||nc<0||nc>=MSZ)return;
    if(MW.has(nr+"-"+nc)){snd.err();return;}
    const npc=MNPC.find(n=>n.pos[0]===nr&&n.pos[1]===nc&&!saved.includes(n.type));
    if(npc){
      if(npc.dilemma){
        setDil(npc);
        setFb({text:"\u26A1 DILEMME: "+npc.msg,color:"var(--g)",icon:"\uD83E\uDD14"});
        return;
      }
      setSaved(p=>[...p,npc.type]);
      setFb({text:npc.ic+" "+npc.msg,color:"var(--t)",icon:"\u2705"});
      snd.ok();setTimeout(()=>setFb(null),1500);
    }
    setPl([nr,nc]);setPath(p=>[...p,[nr,nc]]);snd.beep(300);
    if(nr===12&&nc===12){snd.ok();setFb({text:"\uD83C\uDFC1 \u00c9VACUATION R\u00c9USSIE !",color:"var(--t)",icon:"\uD83C\uDF89"});}
  };

  const solveDil=(help)=>{
    if(help){
      setSaved(p=>[...p,"Marcel"]);
      setFb({text:"\uD83D\uDEAC Marcel sauv\u00e9 (sans briquet)",color:"var(--t)",icon:"\u2705"});
    } else {
      setFb({text:"On continue sans Marcel !",color:"var(--g)",icon:"\uD83C\uDFC3"});
    }
    setDil(null);snd.beep(500);setTimeout(()=>setFb(null),1500);
  };

  return(
    <div style={{minHeight:"100vh",background:"var(--dk)",position:"relative"}}>
      <HUD mi={MISS[6]} sc={saved.length*200+(pl[0]===12&&pl[1]===12?500:0)} tl={tl} mx={90} team={team} cmb={saved.length} mid={7}/>
      <Particles type="smoke" intensity={0.3}/>
      {fb&&<Toast text={fb.text} color={fb.color} icon={fb.icon}/>}

      {dil&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{...crd,maxWidth:"330px",textAlign:"center",border:"2px solid var(--g)",animation:"fadeUp 0.3s"}}>
            <div style={{fontSize:"2.2rem",marginBottom:"6px"}}>{"\uD83E\uDD14"}</div>
            <div style={{fontSize:"1.1rem",fontFamily:"'Bebas Neue',sans-serif",color:"var(--g)",marginBottom:"5px"}}>DILEMME MORAL</div>
            <div style={{...se("0.7rem"),opacity:0.65,marginBottom:"14px"}}>Marcel refuse de partir sans son briquet. L'aider vous fera perdre du temps pr\u00e9cieux.</div>
            <div style={{display:"flex",gap:"10px",justifyContent:"center"}}>
              <button style={{...B("teal"),fontSize:"0.75rem",padding:"9px 16px"}} onClick={()=>solveDil(true)}>{"\uD83E\uDD1D"} Aider Marcel</button>
              <button style={{...B(),fontSize:"0.75rem",padding:"9px 16px",borderColor:"var(--r)"}} onClick={()=>solveDil(false)}>{"\uD83C\uDFC3"} Continuer</button>
            </div>
          </div>
        </div>
      )}

      <div style={{padding:"56px 10px 10px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{...se("0.6rem"),opacity:0.4,marginBottom:"6px"}}>Guidez l'\u00e9quipe \u2014 aidez les personnes en chemin</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat("+MSZ+","+cs+"px)",gap:"1px",background:"rgba(255,255,255,0.03)",padding:"3px",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.08)"}}>
          {Array.from({length:MSZ*MSZ},(_,idx)=>{
            const r=Math.floor(idx/MSZ),c=idx%MSZ;
            const wall=MW.has(r+"-"+c);
            const npc=MNPC.find(n=>n.pos[0]===r&&n.pos[1]===c);
            const isPl=pl[0]===r&&pl[1]===c;
            const isEnd=r===12&&c===12;
            const isStart=r===0&&c===0;
            const inPath=path.some(p=>p[0]===r&&p[1]===c);
            const vis=isVis(r,c);
            return(
              <div key={idx}
                onClick={()=>{const dr=r-pl[0],dc=c-pl[1];if(Math.abs(dr)+Math.abs(dc)===1)move(dr,dc);}}
                style={{width:cs,height:cs,borderRadius:"2px",
                  background:!vis?"rgba(0,0,0,0.7)":wall?"rgba(255,255,255,0.1)":isPl?"var(--r)":isEnd?"var(--t)":isStart?"var(--bl)":inPath?"rgba(69,123,157,0.12)":"rgba(0,0,0,0.25)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:(cs*0.5)+"px",cursor:!wall&&vis?"pointer":"default",
                  boxShadow:isPl?"0 0 8px var(--r)":isEnd&&vis?"0 0 8px var(--t)":"none",
                  transition:"background 0.15s",opacity:vis?1:0.3}}>
                {isPl&&"\uD83C\uDFC3"}{isEnd&&!isPl&&vis&&"\uD83D\uDEAA"}
                {npc&&!isPl&&vis&&!saved.includes(npc.type)&&npc.ic}
                {npc&&vis&&saved.includes(npc.type)&&"\u2705"}
              </div>
            );
          })}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,50px)",gridTemplateRows:"repeat(3,50px)",gap:"3px",marginTop:"8px"}}>
          <div/><button style={{...B(),padding:"5px",fontSize:"1.1rem",borderColor:"rgba(255,255,255,0.15)"}} onClick={()=>move(-1,0)}>{"\u2191"}</button><div/>
          <button style={{...B(),padding:"5px",fontSize:"1.1rem",borderColor:"rgba(255,255,255,0.15)"}} onClick={()=>move(0,-1)}>{"\u2190"}</button>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.5rem",opacity:0.25}}>{"\uD83C\uDFC3"}</div>
          <button style={{...B(),padding:"5px",fontSize:"1.1rem",borderColor:"rgba(255,255,255,0.15)"}} onClick={()=>move(0,1)}>{"\u2192"}</button>
          <div/><button style={{...B(),padding:"5px",fontSize:"1.1rem",borderColor:"rgba(255,255,255,0.15)"}} onClick={()=>move(1,0)}>{"\u2193"}</button><div/>
        </div>
        {saved.length>0&&(
          <div style={{display:"flex",gap:"4px",marginTop:"5px",...or("0.5rem"),opacity:0.4}}>
            Sauv\u00e9s: {saved.map((r,i)=><span key={i}>{MNPC.find(n=>n.type===r)?.ic}</span>)}
          </div>
        )}
      </div>
    </div>
  );
};

const Score = ({mid,res,equips,onNext,snd})=>{
  const mi=MISS[mid-1];
  const [stars,setStars]=useState(0);
  const sc=res.score||0;
  const maxS=sc>=800?3:sc>=500?2:sc>=200?1:0;
  const eq=EQUIP[mid-1];
  useEffect(()=>{const ts=[];for(let i=1;i<=maxS;i++)ts.push(setTimeout(()=>{setStars(i);snd.beep(440+i*150);},i*500));return()=>ts.forEach(clearTimeout);},[maxS,snd]);
  return(
    <div style={scr}>
      <Particles type="embers" intensity={0.3}/>
      <div style={{...or("0.45rem"),opacity:0.3,letterSpacing:"3px",marginBottom:"4px"}}>MISSION {mid} TERMINEE</div>
      <h2 style={{fontSize:"clamp(1.3rem,4vw,1.9rem)",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"3px",color:"var(--g)",marginBottom:"4px"}}>{mi.title}</h2>
      <div style={{display:"flex",gap:"8px",margin:"14px 0"}}>{[1,2,3].map(i=><span key={i} style={{fontSize:"2.5rem",transition:"all 0.5s",opacity:i<=stars?1:0.15,transform:i<=stars?"scale(1)":"scale(0.5)",filter:i<=stars?"drop-shadow(0 0 12px var(--g))":"none"}}>&#11088;</span>)}</div>
      <div style={{...crd,width:"85%",maxWidth:"340px",marginBottom:"12px",padding:"12px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><span style={{fontSize:"0.75rem",opacity:0.5}}>Score</span><span style={{color:"var(--g)",...or("1rem"),fontWeight:700}}><AnimScore value={sc}/> pts</span></div>
        {res.time!==undefined&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}><span style={{fontSize:"0.75rem",opacity:0.5}}>Temps</span><span style={{...or("0.8rem")}}>{res.time}s</span></div>}
      </div>
      {eq&&<div style={{...crd,background:"rgba(42,157,143,0.08)",border:"1px solid rgba(42,157,143,0.25)",padding:"12px 20px",marginBottom:"12px",textAlign:"center",animation:"fadeUp 0.5s ease 0.5s backwards"}}><div style={{...or("0.48rem"),opacity:0.35,marginBottom:"5px",letterSpacing:"2px"}}>EQUIPEMENT DEBLOQUE</div><div style={{fontSize:"2.5rem",animation:"float 2s infinite"}}>{eq.icon}</div><div style={{fontSize:"0.9rem",color:"var(--t)",fontFamily:"'Bebas Neue',sans-serif",marginTop:"3px",letterSpacing:"1px"}}>{eq.name}</div></div>}
      <div style={{...crd,padding:"9px 14px",marginBottom:"16px",maxWidth:"330px",background:"rgba(233,196,106,0.04)",border:"1px solid rgba(233,196,106,0.12)"}}><div style={{...or("0.42rem"),opacity:0.3,marginBottom:"3px",letterSpacing:"1px"}}>A RETENIR</div><div style={{...se("0.7rem"),lineHeight:1.6,opacity:0.65}}>{LESSONS[mid-1]}</div></div>
      <button style={B("primary")} onClick={onNext}>{mid<7?"Mission Suivante":"Voir le Podium"}</button>
    </div>
  );
};

const Journal = ({text})=>(<div style={scr}><div style={{...crd,maxWidth:"450px",width:"90%",background:"rgba(233,196,106,0.04)",border:"1px solid rgba(233,196,106,0.15)"}}><div style={{...or("0.48rem"),opacity:0.3,marginBottom:"7px",letterSpacing:"2px"}}>JOURNAL DE BORD</div><div style={{fontFamily:"'Special Elite',cursive",fontSize:"clamp(0.8rem,2.5vw,1rem)",lineHeight:1.8,color:"var(--g)"}}>{text}</div></div></div>);

const Podium = ({team,total,equips,onRestart,snd})=>{
  useEffect(()=>{snd.victory();},[snd]);
  return(
    <div style={scr}>
      <Particles type="confetti" intensity={1.5}/><Particles type="embers" intensity={0.4}/><RGlow i={0.4}/>
      <div style={{position:"relative",zIndex:10,textAlign:"center",width:"100%",maxWidth:"440px"}}>
        <div style={{fontSize:"4rem",animation:"float 2s infinite",marginBottom:"6px"}}>&#127942;</div>
        <h1 style={{fontSize:"clamp(1.8rem,5vw,2.8rem)",fontFamily:"'Bebas Neue',sans-serif",color:"var(--g)",letterSpacing:"4px",textShadow:"0 0 30px rgba(233,196,106,0.4)",marginBottom:"3px"}}>MISSION ACCOMPLIE</h1>
        <h2 style={{fontSize:"clamp(1.1rem,3vw,1.5rem)",fontFamily:"'Bebas Neue',sans-serif",color:team.color,marginBottom:"4px"}}>{team.icon} {team.name}</h2>
        <div style={{fontSize:"clamp(2rem,6vw,3.5rem)",...or(),fontWeight:900,color:"var(--g)",margin:"12px 0",textShadow:"0 0 20px rgba(233,196,106,0.3)"}}><AnimScore value={total}/> PTS</div>
        <div style={{...crd,padding:"14px 22px",marginBottom:"16px",background:"rgba(233,196,106,0.04)",border:"1px solid rgba(233,196,106,0.2)"}}>
          <div style={{...or("0.45rem"),opacity:0.3,marginBottom:"7px",letterSpacing:"2px"}}>AVATAR FINAL</div>
          <div style={{fontSize:"3rem"}}>&#128526;</div>
          <div style={{display:"flex",gap:"5px",justifyContent:"center",marginTop:"7px",flexWrap:"wrap"}}>{equips.map((e,i)=><span key={i} style={{fontSize:"1.5rem"}} title={e.name}>{e.icon}</span>)}</div>
        </div>
        <div style={{...crd,textAlign:"center",padding:"16px",background:"linear-gradient(135deg,rgba(233,196,106,0.06),rgba(230,57,70,0.04))",border:"2px solid rgba(233,196,106,0.25)"}}>
          <div style={{...se("0.55rem"),opacity:0.45,marginBottom:"3px"}}>CERTIFICAT</div>
          <div style={{fontSize:"1rem",fontFamily:"'Bebas Neue',sans-serif",color:"var(--g)",letterSpacing:"2px"}}>Equipier de Premiere Intervention</div>
          <div style={{...se("0.65rem"),opacity:0.45,marginTop:"5px"}}>Formation Securite Incendie - Code Rouge</div>
          <div style={{...or("0.5rem"),opacity:0.25,marginTop:"7px"}}>Fiducial FPSG - {new Date().toLocaleDateString("fr-FR")}</div>
        </div>
        <button style={{...B("primary"),marginTop:"20px"}} onClick={onRestart}>Rejouer</button>
      </div>
    </div>
  );
};
    </div>
  );
};

// ═══════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════

export default function CodeRougeApp() {
  const snd = useSound();
  const [screen, setScreen] = useState("title");
  const [team, setTeam] = useState(null);
  const [curM, setCurM] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [mRes, setMRes] = useState(null);
  const [equips, setEquips] = useState([]);
  const [sms, setSms] = useState(null);
  const [comicTxt, setComicTxt] = useState("");
  const [roleRot, setRoleRot] = useState(0);

  useEffect(() => {
    if (screen !== "play") return;
    const idx = Math.min(curM - 1, SMS.length - 1);
    const t = setTimeout(() => setSms(SMS[idx]), 12000 + Math.random() * 8000);
    return () => clearTimeout(t);
  }, [screen, curM]);

  const calcScore = r => {
    let base = 0;
    if (r.found !== undefined) base = (r.found / r.total) * 1000;
    else if (r.correct !== undefined) base = (r.correct / r.total) * 1000;
    else if (r.completed) base = 1000;
    else if (r.dialed) base = 200 + (r.report / r.total) * 800;
    else base = 300;
    const tb = r.time < 30 ? 200 : r.time < 60 ? 100 : 0;
    const wp = (r.wrong || 0) * 50;
    const rb = (r.rescued || 0) * 150;
    return Math.max(0, Math.round(base + tb - wp + rb));
  };

  const handleDone = useCallback(r => {
    const sc = calcScore(r);
    r.score = sc;
    setMRes(r);
    setTotalScore(p => p + sc);
    if (curM <= EQUIP.length) setEquips(p => [...p, EQUIP[curM - 1]]);
    const comics = ["BOOM!", "CRACK!", "SPLASH!", "WHOOSH!", "BANG!", "ZAP!", "POW!"];
    setComicTxt(comics[curM - 1] || "NEXT!");
    setScreen("comic");
  }, [curM]);

  const handleScoreNext = () => {
    if (curM >= 7) { setScreen("podium"); return; }
    setScreen("journal");
    setTimeout(() => {
      setCurM(p => p + 1);
      setRoleRot(p => p + 1);
      setMRes(null);
      setScreen("brief");
    }, 3500);
  };

  const handleRestart = () => {
    setScreen("title"); setTeam(null); setCurM(1);
    setTotalScore(0); setEquips([]); setMRes(null); setRoleRot(0);
  };

  const curRoles = ROLES.map((_, i) => ROLES[(i + roleRot) % ROLES.length]);

  const renderGame = () => {
    const p = { onDone: handleDone, snd, team };
    switch (curM) {
      case 1: return <M1 {...p} />;
      case 2: return <M2 {...p} />;
      case 3: return <M3 {...p} />;
      case 4: return <M4 {...p} />;
      case 5: return <M5 {...p} />;
      case 6: return <M6 {...p} />;
      case 7: return <M7 {...p} />;
      default: return null;
    }
  };

  const journals = [
    "14h32 \u2014 On a rep\u00e9r\u00e9 les dangers. Marcel et ses clopes, Martine et ses guirlandes, G\u00e9rard et son chariot\u2026 Faut agir vite.",
    "14h36 \u2014 S\u00e9quence activ\u00e9e. Portes coupe-feu ferm\u00e9es, d\u00e9senfumage en marche. On tient bon.",
    "14h40 \u2014 Les alarmes, c'est pas juste du bruit. Chaque son a un sens. On ne se trompe plus.",
    "14h43 \u2014 Les pompiers sont pr\u00e9venus. Rapport clair, pr\u00e9cis. Chaque seconde compte.",
    "14h46 \u2014 Dans le noir total, faut conna\u00eetre son b\u00e2timent par c\u0153ur. La lampe, c'est la vie.",
    "14h50 \u2014 Rep\u00e9rer les anomalies, c'est le job de tous les jours. Pas juste pendant l'exercice.",
  ];

  return (
    <div style={{ fontFamily: "'Bebas Neue','Impact',sans-serif", background: "var(--dk)", color: "var(--lt)", minHeight: "100vh", minWidth: "100vw", overflow: "hidden", position: "relative", letterSpacing: "0.5px" }}>
      <style>{CSS}</style>

      {sms && screen === "play" && <SMSBubble msg={sms} onX={() => setSms(null)} />}

      {screen === "title" && <TitleScreen onGo={() => setScreen("team")} snd={snd} />}
      {screen === "team" && <TeamScreen onPick={t => { setTeam(t); setScreen("vhs"); }} snd={snd} />}
      {screen === "vhs" && <VHSIntro onEnd={() => setScreen("brief")} snd={snd} />}
      {screen === "brief" && <Brief mi={MISS[curM - 1]} roles={curRoles} team={team} cur={curM} onGo={() => setScreen("play")} snd={snd} />}
      {screen === "play" && renderGame()}
      {screen === "comic" && <Comic text={comicTxt} onEnd={() => setScreen("score")} />}
      {screen === "score" && mRes && <Score mid={curM} res={mRes} equips={equips} onNext={handleScoreNext} snd={snd} />}
      {screen === "journal" && <Journal text={journals[curM - 1] || "La mission continue\u2026"} />}
      {screen === "podium" && team && <Podium team={team} total={totalScore} equips={equips} onRestart={handleRestart} snd={snd} />}
    </div>
  );
}
