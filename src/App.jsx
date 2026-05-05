
import React, {useState, useEffect} from "react";
import "./index.css";

const STORAGE_KEY="mdt-v7";

const categories=["Dokumenty","Ubrania","Elektronika","Auto","Pies","Inne"];

function id(){return Date.now()+Math.random()}

export default function App(){

const [data,setData]=useState(()=>{
 try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{trips:[]}}
 catch{return {trips:[]}}
});

const [trip,setTrip]=useState(null);
const [section,setSection]=useState("plan");

useEffect(()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(data)),[data]);

function addTrip(){
 const t={id:id(),name:"Nowa podróż",reservations:[],checklists:{},costs:null};
 setData({...data,trips:[...data.trips,t]});
 setTrip(t);
}

function addReservation(){
 const name=prompt("Nazwa?");
 const cost=Number(prompt("Koszt PLN?")||0);
 const r={id:id(),name,cost};
 setData({...data,trips:data.trips.map(t=>t.id===trip.id?{...t,reservations:[...t.reservations,r]}:t)});
}

function addChecklistItem(cat){
 const text=prompt("Co dodać?");
 if(!text)return;
 const items=trip.checklists[cat]||[];
 const newItems=[...items,{id:id(),text,done:false}];
 setData({...data,trips:data.trips.map(t=>t.id===trip.id?{...t,checklists:{...t.checklists,[cat]:newItems}}:t)});
}

function toggleItem(cat,itemId){
 const items=(trip.checklists[cat]||[]).map(i=>i.id===itemId?{...i,done:!i.done}:i);
 setData({...data,trips:data.trips.map(t=>t.id===trip.id?{...t,checklists:{...t,[cat]:items}}:t)});
}

function calculateCosts(){
 const km=Number(prompt("Ile km w obie strony?")||0);
 const days=Number(prompt("Ile dni?")||0);
 const fuelPrice=Number(prompt("Cena paliwa PLN/l?")||6.5);
 const people=Number(prompt("Ile osób?")||2);

 const fuel=(km/100)*6*fuelPrice;
 const food=days*people*60;
 const reservations=trip.reservations.reduce((a,b)=>a+b.cost,0);

 const total=fuel+food+reservations;

 const min=Math.round(total*0.9);
 const max=Math.round(total*1.2);

 setData({...data,trips:data.trips.map(t=>t.id===trip.id?{...t,costs:{min,max}}:t)});
}

return(
<div className="app">

<div className="sidebar">
<button onClick={addTrip}>+ Podróż</button>
{data.trips.map(t=>(
<div key={t.id} onClick={()=>{setTrip(t);setSection("plan")}}>
{t.name}
</div>
))}
</div>

<div className="main">

{trip && (
<>
<div className="hero" style={{backgroundImage:"url('/hero.png')"}}>
<h1>{trip.name}</h1>
<div className="menu">
<button onClick={()=>setSection("plan")}>Plan</button>
<button onClick={()=>setSection("costs")}>Koszty</button>
<button onClick={()=>setSection("check")}>Checklisty</button>
<button onClick={()=>setSection("res")}>Rezerwacje</button>
<button onClick={()=>setSection("near")}>Okolica</button>
</div>
</div>

{section==="res" && (
<div>
<h2>Rezerwacje</h2>
<button onClick={addReservation}>+ Dodaj</button>
{trip.reservations.map(r=>(
<div key={r.id}>{r.name} - {r.cost} PLN</div>
))}
</div>
)}

{section==="check" && (
<div>
<h2>Checklisty</h2>
{categories.map(cat=>(
<div key={cat}>
<h3>{cat}</h3>
<button onClick={()=>addChecklistItem(cat)}>+ Dodaj</button>
{(trip.checklists[cat]||[]).map(i=>(
<div key={i.id} onClick={()=>toggleItem(cat,i.id)}>
{i.done?"✅":"⬜"} {i.text}
</div>
))}
</div>
))}
</div>
)}

{section==="costs" && (
<div>
<h2>Koszty</h2>
<button onClick={calculateCosts}>Oblicz</button>
{trip.costs && <p>{trip.costs.min} - {trip.costs.max} PLN</p>}
</div>
)}

{section==="near" && (
<div>
<h2>W okolicy</h2>
<a href="https://www.google.com/maps/search/attractions+near+me" target="_blank">Atrakcje</a><br/>
<a href="https://www.google.com/maps/search/restaurants+near+me" target="_blank">Restauracje</a>
</div>
)}

</>
)}

</div>
</div>
)
}
