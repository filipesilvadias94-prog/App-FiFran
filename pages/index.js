
import {useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {ResponsiveContainer,BarChart,Bar,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid} from 'recharts'

const CODE='FRANLINDA'
const supabase=createClient('https://vkbaukcrhfggzyvdhljb.supabase.co','sb_publishable_m6zc7hZNQhIcbMKUhfj-Ag_LN_YLl1H')
const MEALS=['Café','Almoço','Lanche','Janta','Sobremesa']
const CATS=['Proteína','Carboidrato','Gordura Boa','Fibra','Fruta','Vegetal','Base','Bebida','Sanduíche Completo','Sobremesa']
const PROFILES=['Filipe','Fran']
const today=()=>new Date().toISOString().slice(0,10)
const ago=d=>{let x=new Date();x.setDate(x.getDate()-d);return x.toISOString().slice(0,10)}
const def=p=>({couple_code:CODE,profile:p,daily_calorie_goal:1600,water_goal_ml:2500,photo_url:''})

export default function Home(){
const [ok,setOk]=useState(false),[code,setCode]=useState(''),[profile,setProfile]=useState('Filipe'),[mode,setMode]=useState('individual'),[tab,setTab]=useState('cardapio')
const [foods,setFoods]=useState([]),[history,setHistory]=useState([]),[settings,setSettings]=useState([]),[water,setWater]=useState([]),[cons,setCons]=useState([]),[weights,setWeights]=useState([])
const [plan,setPlan]=useState(null),[loading,setLoading]=useState(false),[msg,setMsg]=useState('')
const [form,setForm]=useState({meal:'Almoço',category:'Proteína',name:'',calories:'',is_complete_meal:false})
const [cf,setCf]=useState({meal:'Almoço',food_id:''}),[weight,setWeight]=useState('')

useEffect(()=>{if(localStorage.getItem('fiFranAuthorized')===CODE)setOk(true)},[])
useEffect(()=>{if(ok)load()},[ok])
useEffect(()=>{let h=history.find(x=>x.profile===profile&&(mode==='casal'?x.mode==='casal':true));if(h?.plan_json){try{setPlan({plan:JSON.parse(h.plan_json),total:Number(h.calories||0)})}catch{setPlan(null)}}else setPlan(null)},[profile,mode,history])

async function load(){
 setLoading(true); setMsg('')
 const [a,b,c,d,e,f]=await Promise.all([
  supabase.from('foods').select('*').eq('couple_code',CODE).order('id'),
  supabase.from('history').select('*').eq('couple_code',CODE).order('created_at',{ascending:false}),
  supabase.from('profile_settings').select('*').eq('couple_code',CODE),
  supabase.from('water_logs').select('*').eq('couple_code',CODE).eq('date',today()),
  supabase.from('daily_consumption').select('*').eq('couple_code',CODE).gte('date',ago(30)).order('date'),
  supabase.from('weight_logs').select('*').eq('couple_code',CODE).order('date')
 ])
 if(a.error||b.error||c.error||d.error||e.error||f.error)setMsg('Erro ao carregar. Rode o SQL V5 no Supabase.')
 setFoods(a.data||[]);setHistory(b.data||[]);setSettings(c.data||[]);setWater(d.data||[]);setCons(e.data||[]);setWeights(f.data||[]);setLoading(false)
}
function enter(){if(code.trim().toUpperCase()===CODE){localStorage.setItem('fiFranAuthorized',CODE);setOk(true)}else setMsg('Código incorreto.')}
const visible=()=>mode==='casal'?'Casal':profile
const st=p=>settings.find(x=>x.profile===p)||def(p)
const active=()=>st(visible())

async function saveSettings(next){
 setLoading(true)
 let row={couple_code:CODE,profile:visible(),daily_calorie_goal:Number(next.daily_calorie_goal||1600),water_goal_ml:Number(next.water_goal_ml||2500),photo_url:next.photo_url||''}
 let {error}=await supabase.from('profile_settings').upsert(row,{onConflict:'couple_code,profile'})
 if(error)setMsg('Erro ao salvar configurações.');else{setMsg('Configurações salvas.');await load()} setLoading(false)
}
function photo(file){if(!file)return;let r=new FileReader();r.onload=()=>saveSettings({...active(),photo_url:String(r.result||'')});r.readAsDataURL(file)}

const grouped=useMemo(()=>{let g={};foods.forEach(f=>{g[f.meal]=g[f.meal]||{};g[f.meal][f.category]=g[f.meal][f.category]||[];g[f.meal][f.category].push(f)});return g},[foods])
const rand=a=>a[Math.floor(Math.random()*a.length)]
function buildOnce(){let p={};MEALS.forEach(m=>{let cs=grouped[m]||{};let comp=Object.values(cs).flat().filter(i=>i.is_complete_meal||i.category==='Sanduíche Completo');let normal=Object.keys(cs).filter(c=>c!=='Sanduíche Completo');if(m==='Lanche'&&comp.length&&(normal.length===0||Math.random()<.5)){p[m]=[rand(comp)];return}p[m]=normal.map(c=>rand(cs[c])).filter(Boolean)});return p}
const totalPlan=p=>Object.values(p||{}).flat().reduce((s,i)=>s+Number(i.calories||0),0)
function best(goal){let bp=buildOnce(),bt=totalPlan(bp),bd=Math.abs(bt-goal);for(let i=0;i<250;i++){let p=buildOnce(),t=totalPlan(p),d=Math.abs(t-goal);if(d<bd){bp=p;bt=t;bd=d}}return{plan:bp,total:bt}}
async function sort(m){
 if(!foods.length)return setMsg('Cadastre alimentos antes de sortear.')
 let goal=Number(st(m==='casal'?'Casal':profile).daily_calorie_goal||1600),r=best(goal),pj=JSON.stringify(r.plan); setPlan(r); setLoading(true)
 if(m==='casal'){var {error}=await supabase.from('history').insert([{couple_code:CODE,profile:'Filipe',calories:r.total,mode:'casal',plan_json:pj,date:today()},{couple_code:CODE,profile:'Fran',calories:r.total,mode:'casal',plan_json:pj,date:today()}])}
 else{var {error}=await supabase.from('history').insert({couple_code:CODE,profile,calories:r.total,mode:'individual',plan_json:pj,date:today()})}
 if(error)setMsg('Erro ao salvar sorteio.');else setMsg(`Cardápio salvo. Meta ${goal} kcal, sorteio ${r.total} kcal.`); await load(); setLoading(false)
}
async function addFood(){
 if(!form.name.trim())return setMsg('Digite o alimento.')
 setLoading(true); let {error}=await supabase.from('foods').insert({couple_code:CODE,meal:form.meal,category:form.category,name:form.name.trim(),calories:Number(form.calories||0),is_complete_meal:Boolean(form.is_complete_meal||form.category==='Sanduíche Completo')})
 if(error)setMsg('Erro ao cadastrar alimento.');else{setForm({...form,name:'',calories:'',is_complete_meal:false});setMsg('Alimento cadastrado.');await load()} setLoading(false)
}
async function delFood(id){setLoading(true);await supabase.from('foods').delete().eq('id',id).eq('couple_code',CODE);await load();setLoading(false)}
const foodById=id=>foods.find(f=>String(f.id)===String(id))
async function addConsumed(){
 let food=foodById(cf.food_id); if(!food)return setMsg('Escolha um alimento.')
 setLoading(true); let {error}=await supabase.from('daily_consumption').insert({couple_code:CODE,profile,date:today(),meal:cf.meal,food_id:food.id,food_name:food.name,calories:Number(food.calories||0)})
 if(error)setMsg('Erro ao salvar consumo. Rode SQL V5.');else{setMsg('Consumo salvo.');await load()} setLoading(false)
}
async function delConsumed(id){setLoading(true);await supabase.from('daily_consumption').delete().eq('id',id).eq('couple_code',CODE);await load();setLoading(false)}
async function saveWeight(){
 let v=Number(weight); if(!v||v<=0)return setMsg('Digite peso válido.')
 setLoading(true); let {error}=await supabase.from('weight_logs').upsert({couple_code:CODE,profile,date:today(),weight:v},{onConflict:'couple_code,profile,date'})
 if(error)setMsg('Erro ao salvar peso.');else{setWeight('');setMsg('Peso salvo.');await load()} setLoading(false)
}
function waterNow(){return Number((water.find(w=>w.profile===profile)||{}).ml||0)}
async function addWater(x){setLoading(true);await supabase.from('water_logs').upsert({couple_code:CODE,profile,date:today(),ml:Math.max(0,waterNow()+x)},{onConflict:'couple_code,profile,date'});await load();setLoading(false)}
const todayItems=()=>cons.filter(c=>c.profile===profile&&c.date===today())
const consumed=()=>todayItems().reduce((s,c)=>s+Number(c.calories||0),0)
function byMeal(){let m={};todayItems().forEach(i=>{m[i.meal]=m[i.meal]||[];m[i.meal].push(i)});return m}
function chartCons(){let goal=Number(st(profile).daily_calorie_goal||1600),arr=[];for(let i=6;i>=0;i--){let d=ago(i);arr.push({date:d.slice(5),meta:goal,consumido:cons.filter(c=>c.profile===profile&&c.date===d).reduce((s,c)=>s+Number(c.calories||0),0)})}return arr}
const chartWeight=()=>weights.filter(w=>w.profile===profile).slice(-20).map(w=>({date:String(w.date).slice(5),peso:Number(w.weight)}))
const sumHist=d=>history.filter(h=>h.profile===profile&&(h.date||String(h.created_at||'').slice(0,10))>=ago(d)).reduce((s,h)=>s+Number(h.calories||0),0)
let a=active(),photoUrl=a.photo_url,goal=Number(a.daily_calorie_goal||1600),wml=waterNow(),wgoal=Number(st(profile).water_goal_ml||2500),wp=Math.min(100,Math.round((wml/wgoal)*100)),diff=consumed()-Number(st(profile).daily_calorie_goal||1600)

if(!ok)return <main className="screen center"><section className="login"><div className="logoGlow">💚❤️</div><h1>FILIPE & FRAN</h1><p>App fitness do casal</p><input value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&enter()} placeholder="Código do casal"/><button onClick={enter}>Entrar</button>{msg&&<div className="message">{msg}</div>}</section></main>
return <main className="screen"><div className="app">
<section className="hero"><div>{photoUrl?<img className="avatar" src={photoUrl}/>:<div className="fallback">{mode==='casal'?'💞':profile[0]}</div>}</div><div><span className="pill">online • supabase</span><h1>FILIPE & FRAN</h1><p>{visible()} • meta {goal} kcal</p></div></section>
{msg&&<div className="message">{msg}</div>}{loading&&<div className="loading">Sincronizando...</div>}
<section className="card"><h2>Perfil e modo</h2><div className="grid2"><select value={profile} onChange={e=>setProfile(e.target.value)}>{PROFILES.map(p=><option key={p}>{p}</option>)}</select><select value={mode} onChange={e=>setMode(e.target.value)}><option value="individual">Individual</option><option value="casal">Casal</option></select></div><div className="tabs"><button className={tab==='cardapio'?'active':''} onClick={()=>setTab('cardapio')}>Cardápio</button><button className={tab==='consumo'?'active':''} onClick={()=>setTab('consumo')}>Consumo</button><button className={tab==='peso'?'active':''} onClick={()=>setTab('peso')}>Peso</button></div></section>

{tab==='cardapio'&&<><section className="stats"><div className="stat"><span>Meta</span><strong>{goal}</strong><small>kcal</small></div><div className="stat"><span>7 dias</span><strong>{sumHist(7)}</strong><small>sorteio</small></div><div className="stat"><span>30 dias</span><strong>{sumHist(30)}</strong><small>sorteio</small></div></section>
<section className="card"><button onClick={()=>sort(mode)}>🎲 Sortear {mode==='casal'?'Casal':'Individual'}</button></section>
<section className="card"><h2>Metas e foto</h2><div className="grid2"><input type="number" value={a.daily_calorie_goal||1600} onChange={e=>saveSettings({...a,daily_calorie_goal:e.target.value})}/><input type="number" value={a.water_goal_ml||2500} onChange={e=>saveSettings({...a,water_goal_ml:e.target.value})}/></div><label className="file">📸 Enviar foto de {visible()}<input type="file" accept="image/*" onChange={e=>photo(e.target.files?.[0])}/></label></section>
<section className="card"><h2>Água de {profile} <span className="badge">{wml}/{wgoal}ml</span></h2><div className="bar"><div style={{width:`${wp}%`}}/></div><div className="grid3"><button onClick={()=>addWater(250)}>+250</button><button onClick={()=>addWater(500)}>+500</button><button onClick={()=>addWater(-250)}>-250</button></div></section>
{plan&&<section className="card"><h2>Cardápio sorteado <span className="badge">{plan.total} kcal</span></h2>{MEALS.map(m=><div className="meal" key={m}><strong>{m}</strong><p>{(plan.plan[m]||[]).length?(plan.plan[m]||[]).map(f=>`${f.category}: ${f.name} (${f.calories} kcal)`).join(' • '):'Sem opções'}</p></div>)}</section>}
<section className="card"><h2>Cadastrar alimento</h2><div className="grid2"><select value={form.meal} onChange={e=>setForm({...form,meal:e.target.value})}>{MEALS.map(m=><option key={m}>{m}</option>)}</select><select value={form.category} onChange={e=>setForm({...form,category:e.target.value,is_complete_meal:e.target.value==='Sanduíche Completo'})}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div><input placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input type="number" placeholder="Calorias" value={form.calories} onChange={e=>setForm({...form,calories:e.target.value})}/><label className="check"><input type="checkbox" checked={form.is_complete_meal} onChange={e=>setForm({...form,is_complete_meal:e.target.checked})}/>Refeição completa</label><button onClick={addFood}>Salvar alimento</button></section>
<section className="card"><h2>Base compartilhada <span className="badge">{foods.length} itens</span></h2>{foods.map(f=><div className="food" key={f.id}><div><strong>{f.meal} › {f.category}</strong><p>{f.name} • {f.calories} kcal {f.is_complete_meal?'• completo':''}</p></div><button className="icon" onClick={()=>delFood(f.id)}>🗑️</button></div>)}</section></>}

{tab==='consumo'&&<><section className="stats"><div className="stat"><span>Consumido</span><strong>{consumed()}</strong><small>hoje</small></div><div className="stat"><span>Meta</span><strong>{st(profile).daily_calorie_goal||1600}</strong><small>kcal</small></div><div className="stat"><span>Diferença</span><strong>{diff>0?'+':''}{diff}</strong><small>kcal</small></div></section>
<section className="card"><h2>Inserir comida consumida</h2><select value={cf.meal} onChange={e=>setCf({...cf,meal:e.target.value})}>{MEALS.map(m=><option key={m}>{m}</option>)}</select><select value={cf.food_id} onChange={e=>setCf({...cf,food_id:e.target.value})}><option value="">Escolha da base</option>{foods.map(f=><option value={f.id} key={f.id}>{f.meal} › {f.name} • {f.calories} kcal</option>)}</select><button onClick={addConsumed}>Adicionar ao dia</button></section>
<section className="card"><h2>Hoje por refeição</h2>{MEALS.map(m=><div className="meal" key={m}><strong>{m}</strong>{(byMeal()[m]||[]).length?byMeal()[m].map(i=><div className="mini" key={i.id}><span>{i.food_name} • {i.calories} kcal</span><button onClick={()=>delConsumed(i.id)}>remover</button></div>):<p>Sem itens</p>}</div>)}</section>
<section className="card"><h2>Meta x Consumido</h2><div className="chart"><ResponsiveContainer width="100%" height={220}><BarChart data={chartCons()}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.12)"/><XAxis dataKey="date" stroke="#fff"/><YAxis stroke="#fff"/><Tooltip/><Bar dataKey="meta" fill="#3ddc97"/><Bar dataKey="consumido" fill="#ff4fa3"/></BarChart></ResponsiveContainer></div></section></>}

{tab==='peso'&&<><section className="card"><h2>Peso de {profile}</h2><input type="number" step="0.1" placeholder="Peso de hoje em kg" value={weight} onChange={e=>setWeight(e.target.value)}/><button onClick={saveWeight}>Salvar peso de hoje</button></section><section className="card"><h2>Gráfico de peso</h2><div className="chart"><ResponsiveContainer width="100%" height={230}><LineChart data={chartWeight()}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.12)"/><XAxis dataKey="date" stroke="#fff"/><YAxis stroke="#fff" domain={['dataMin - 1','dataMax + 1']}/><Tooltip/><Line type="monotone" dataKey="peso" stroke="#3ddc97" strokeWidth={3} dot/></LineChart></ResponsiveContainer></div></section></>}
</div></main>
}
