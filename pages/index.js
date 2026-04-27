import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const COUPLE_CODE = 'FRANLINDA'
const SUPABASE_URL = 'https://vkbaukcrhfggzyvdhljb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_m6zc7hZNQhIcbMKUhfj-Ag_LN_YLl1H'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const MEALS = ['Café', 'Almoço', 'Lanche', 'Janta']
const CATEGORIES = ['Proteína', 'Carboidrato', 'Gordura Boa', 'Fibra', 'Fruta', 'Vegetal', 'Base', 'Bebida']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export default function Home() {
  const [authorized, setAuthorized] = useState(false)
  const [code, setCode] = useState('')
  const [profile, setProfile] = useState('Filipe')
  const [mode, setMode] = useState('individual')
  const [foods, setFoods] = useState([])
  const [history, setHistory] = useState([])
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    meal: 'Almoço',
    category: 'Proteína',
    name: '',
    calories: ''
  })

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('fiFranAuthorized') : null
    if (saved === COUPLE_CODE) setAuthorized(true)
  }, [])

  useEffect(() => {
    if (authorized) loadData()
  }, [authorized])

  async function loadData() {
    setLoading(true)
    setMessage('')
    const { data: foodData, error: foodError } = await supabase
      .from('foods')
      .select('*')
      .eq('couple_code', COUPLE_CODE)
      .order('id', { ascending: true })

    const { data: historyData, error: historyError } = await supabase
      .from('history')
      .select('*')
      .eq('couple_code', COUPLE_CODE)
      .order('created_at', { ascending: false })

    if (foodError || historyError) {
      setMessage('Erro ao carregar dados. Confira as permissões RLS no Supabase.')
    }

    setFoods(foodData || [])
    setHistory(historyData || [])
    setLoading(false)
  }

  function enterApp() {
    if (code.trim().toUpperCase() === COUPLE_CODE) {
      localStorage.setItem('fiFranAuthorized', COUPLE_CODE)
      setAuthorized(true)
    } else {
      setMessage('Código incorreto.')
    }
  }

  const grouped = useMemo(() => {
    const map = {}
    foods.forEach((food) => {
      if (!map[food.meal]) map[food.meal] = {}
      if (!map[food.meal][food.category]) map[food.meal][food.category] = []
      map[food.meal][food.category].push(food)
    })
    return map
  }, [foods])

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)]
  }

  function buildPlan() {
    const plan = {}
    MEALS.forEach((meal) => {
      const categories = grouped[meal] || {}
      plan[meal] = Object.keys(categories)
        .map((category) => {
          const picked = randomItem(categories[category])
          return picked ? { ...picked } : null
        })
        .filter(Boolean)
    })
    return plan
  }

  function totalCaloriesFromPlan(plan) {
    return Object.values(plan || {})
      .flat()
      .reduce((sum, item) => sum + Number(item.calories || 0), 0)
  }

  async function shufflePlan(selectedMode) {
    if (!foods.length) {
      setMessage('Cadastre alimentos antes de sortear.')
      return
    }

    const plan = buildPlan()
    const total = totalCaloriesFromPlan(plan)
    const date = todayISO()
    const planJson = JSON.stringify(plan)

    setCurrentPlan({ plan, total, mode: selectedMode })
    setLoading(true)

    if (selectedMode === 'casal') {
      const { error } = await supabase.from('history').insert([
        { couple_code: COUPLE_CODE, profile: 'Filipe', calories: total, mode: 'casal', plan_json: planJson, date },
        { couple_code: COUPLE_CODE, profile: 'Fran', calories: total, mode: 'casal', plan_json: planJson, date }
      ])

      if (error) setMessage('Erro ao salvar histórico. Talvez falte a coluna plan_json/date ou permissão RLS.')
      else setMessage('Cardápio de casal salvo para Filipe e Fran.')
    } else {
      const { error } = await supabase.from('history').insert({
        couple_code: COUPLE_CODE,
        profile,
        calories: total,
        mode: 'individual',
        plan_json: planJson,
        date
      })

      if (error) setMessage('Erro ao salvar histórico. Talvez falte a coluna plan_json/date ou permissão RLS.')
      else setMessage(`Cardápio individual salvo para ${profile}.`)
    }

    await loadData()
    setLoading(false)
  }

  async function addFood() {
    if (!form.name.trim()) {
      setMessage('Digite o nome do alimento.')
      return
    }

    const caloriesNumber = Number(form.calories || 0)
    if (Number.isNaN(caloriesNumber) || caloriesNumber < 0) {
      setMessage('Digite calorias válidas.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('foods').insert({
      couple_code: COUPLE_CODE,
      meal: form.meal,
      category: form.category,
      name: form.name.trim(),
      calories: caloriesNumber
    })

    if (error) {
      setMessage('Erro ao cadastrar alimento. Confira as permissões RLS no Supabase.')
    } else {
      setForm({ ...form, name: '', calories: '' })
      setMessage('Alimento cadastrado e compartilhado.')
      await loadData()
    }

    setLoading(false)
  }

  async function deleteFood(id) {
    setLoading(true)
    const { error } = await supabase.from('foods').delete().eq('id', id).eq('couple_code', COUPLE_CODE)
    if (error) setMessage('Erro ao excluir alimento.')
    else {
      setMessage('Alimento removido.')
      await loadData()
    }
    setLoading(false)
  }

  function sumForProfile(days) {
    const minDate = daysAgo(days)
    return history
      .filter((h) => h.profile === profile)
      .filter((h) => new Date(h.created_at) >= new Date(minDate))
      .reduce((sum, h) => sum + Number(h.calories || 0), 0)
  }

  function sumToday() {
    const today = todayISO()
    return history
      .filter((h) => h.profile === profile)
      .filter((h) => (h.date || String(h.created_at || '').slice(0, 10)) === today)
      .reduce((sum, h) => sum + Number(h.calories || 0), 0)
  }

  const todayCalories = sumToday()
  const weekCalories = sumForProfile(7)
  const monthCalories = sumForProfile(30)

  if (!authorized) {
    return (
      <main className="screen centerScreen">
        <section className="loginCard">
          <div className="logoGlow">💚❤️</div>
          <h1>FILIPE & FRAN</h1>
          <p>App fitness do casal</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enterApp()}
            placeholder="Código do casal"
          />
          <button onClick={enterApp}>Entrar</button>
          {message && <div className="message">{message}</div>}
        </section>
      </main>
    )
  }

  return (
    <main className="screen">
      <div className="app">
        <section className="hero">
          <div>
            <span className="pill">online • supabase</span>
            <h1>FILIPE & FRAN</h1>
            <p>{profile} • {mode === 'casal' ? 'modo casal' : 'modo individual'}</p>
          </div>
          <div className="heart">💚</div>
        </section>

        {message && <div className="message">{message}</div>}
        {loading && <div className="loading">Sincronizando...</div>}

        <section className="card">
          <h2>Perfil e modo</h2>
          <div className="grid2">
            <select value={profile} onChange={(e) => setProfile(e.target.value)}>
              <option>Filipe</option>
              <option>Fran</option>
            </select>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="individual">Individual</option>
              <option value="casal">Casal</option>
            </select>
          </div>
          <button className="primary" onClick={() => shufflePlan(mode)}>
            🎲 Sortear {mode === 'casal' ? 'Casal' : 'Individual'}
          </button>
        </section>

        <section className="stats">
          <div className="stat">
            <span>Hoje</span>
            <strong>{todayCalories}</strong>
            <small>kcal</small>
          </div>
          <div className="stat">
            <span>7 dias</span>
            <strong>{weekCalories}</strong>
            <small>kcal</small>
          </div>
          <div className="stat">
            <span>30 dias</span>
            <strong>{monthCalories}</strong>
            <small>kcal</small>
          </div>
        </section>

        {currentPlan && (
          <section className="card">
            <div className="cardHeader">
              <h2>Cardápio sorteado</h2>
              <span className="calBadge">{currentPlan.total} kcal</span>
            </div>
            {MEALS.map((meal) => (
              <div className="mealBlock" key={meal}>
                <strong>{meal}</strong>
                <p>
                  {(currentPlan.plan[meal] || []).length
                    ? currentPlan.plan[meal].map((f) => `${f.category}: ${f.name} (${f.calories} kcal)`).join(' • ')
                    : 'Sem opções cadastradas'}
                </p>
              </div>
            ))}
          </section>
        )}

        <section className="card">
          <h2>Cadastrar alimento</h2>
          <div className="grid2">
            <select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })}>
              {MEALS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input
            placeholder="Nome do alimento"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="number"
            placeholder="Calorias"
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
          />
          <button onClick={addFood}>Salvar alimento</button>
        </section>

        <section className="card">
          <div className="cardHeader">
            <h2>Base compartilhada</h2>
            <span className="calBadge">{foods.length} itens</span>
          </div>
          <div className="foodList">
            {foods.length === 0 && <p className="muted">Nenhum alimento cadastrado ainda.</p>}
            {foods.map((food) => (
              <div className="foodItem" key={food.id}>
                <div>
                  <strong>{food.meal} › {food.category}</strong>
                  <p>{food.name} • {food.calories} kcal</p>
                </div>
                <button className="iconBtn" onClick={() => deleteFood(food.id)}>🗑️</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
