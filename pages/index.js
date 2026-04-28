
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const CODE = 'FRANLINDA'
const supabase = createClient(
  'https://vkbaukcrhfggzyvdhljb.supabase.co',
  'sb_publishable_m6zc7hZNQhIcbMKUhfj-Ag_LN_YLl1H'
)

const today = () => new Date().toISOString().slice(0, 10)

export default function Home() {
  const [ok, setOk] = useState(false)
  const [code, setCode] = useState('')
  const [profile, setProfile] = useState('Filipe')
  const [water, setWater] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (localStorage.getItem('fiFranAuthorized') === CODE) setOk(true)
  }, [])

  useEffect(() => {
    if (ok) load()
  }, [ok, profile])

  async function load() {
    const { data } = await supabase
      .from('water_logs')
      .select('*')
      .eq('couple_code', CODE)
      .eq('date', today())
    setWater(data || [])
  }

  function waterNow() {
    const row = water.find((w) => w.profile === profile)
    return Number(row?.ml || 0)
  }

  async function addWater(amount) {
    const total = Math.max(0, waterNow() + amount)
    await supabase
      .from('water_logs')
      .upsert(
        { couple_code: CODE, profile, date: today(), ml: total },
        { onConflict: 'couple_code,profile,date' }
      )
    await load()
  }

  async function registerWater() {
    const total = waterNow()
    if (total <= 0) {
      setMessage('Adicione água antes de registrar.')
      return
    }

    const { error } = await supabase
      .from('daily_water_records')
      .upsert(
        { couple_code: CODE, profile, date: today(), ml: total },
        { onConflict: 'couple_code,profile,date' }
      )

    if (error) {
      setMessage('Erro ao registrar água. Rode o SQL_SUPABASE_AGUA.sql no Supabase.')
      return
    }

    await supabase
      .from('water_logs')
      .delete()
      .eq('couple_code', CODE)
      .eq('profile', profile)
      .eq('date', today())

    setMessage(`Água registrada para ${profile}: ${total} ml. Contador zerado.`)
    await load()
  }

  if (!ok) {
    return (
      <main className="screen center">
        <section className="card">
          <h1>💚❤️ FILIPE & FRAN</h1>
          <input placeholder="Código do casal" value={code} onChange={(e) => setCode(e.target.value)} />
          <button onClick={() => {
            if (code.trim().toUpperCase() === CODE) {
              localStorage.setItem('fiFranAuthorized', CODE)
              setOk(true)
            }
          }}>Entrar</button>
        </section>
      </main>
    )
  }

  return (
    <main className="screen">
      <div className="app">
        <section className="card">
          <h1>💧 Registrar Água</h1>
          <select value={profile} onChange={(e) => setProfile(e.target.value)}>
            <option>Filipe</option>
            <option>Fran</option>
          </select>
          <h2>{waterNow()} ml hoje</h2>
          <div className="grid">
            <button onClick={() => addWater(250)}>+250ml</button>
            <button onClick={() => addWater(500)}>+500ml</button>
            <button onClick={() => addWater(-250)}>-250ml</button>
          </div>
          <button onClick={registerWater}>💧 Registrar Água</button>
          {message && <p>{message}</p>}
        </section>
      </div>
    </main>
  )
}
