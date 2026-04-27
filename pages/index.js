import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase=createClient('https://vkbaukcrhfggzyvdhljb.supabase.co','sb_publishable_m6zc7hZNQhIcbMKUhfj-Ag_LN_YLl1H')
const CODE='FRANLINDA'
export default function Home(){
const [ok,setOk]=useState(false),[code,setCode]=useState(''),[profile,setProfile]=useState('Filipe')
const [foods,setFoods]=useState([]),[history,setHistory]=useState([])
const [name,setName]=useState(''),[calories,setCalories]=useState('')
async function load(){
 const {data:f}=await supabase.from('foods').select('*').eq('couple_code',CODE)
 const {data:h}=await supabase.from('history').select('*').eq('couple_code',CODE)
 setFoods(f||[]); setHistory(h||[])
}
useEffect(()=>{if(ok)load()},[ok])
const total=history.filter(x=>x.profile===profile).reduce((a,b)=>a+Number(b.calories||0),0)
async function addFood(){
 await supabase.from('foods').insert({couple_code:CODE,meal:'Almoço',category:'Proteína',name,calories:Number(calories||0)})
 setName(''); setCalories(''); load()
}
if(!ok) return <div style={{padding:40,fontFamily:'Arial'}}><h1>💚 FILIPE & FRAN</h1><input value={code} onChange={e=>setCode(e.target.value)} placeholder='Código do casal'/><button onClick={()=>setOk(code===CODE)}>Entrar</button></div>
return <div style={{padding:40,fontFamily:'Arial'}}><h1>💚 FILIPE & FRAN</h1>
<select value={profile} onChange={e=>setProfile(e.target.value)}><option>Filipe</option><option>Fran</option></select>
<p>Total histórico: {total} kcal</p>
<input placeholder='Nome alimento' value={name} onChange={e=>setName(e.target.value)}/>
<input placeholder='Calorias' value={calories} onChange={e=>setCalories(e.target.value)}/>
<button onClick={addFood}>Salvar</button>
</div>
}
