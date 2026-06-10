import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import MealsTracker from './components/MealsTracker'
import WeightTracker from './components/WeightTracker'
import CustomMeals from './components/CustomMeals'
import { LogOut, Flame, TrendingUp, Utensils, Loader } from 'lucide-react'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('meals') // 'meals', 'weight', 'custom'

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
        background: '#070a13',
        color: '#fff'
      }}>
        <Loader className="animate-spin" size={40} style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Cargando FoodsFit...</p>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="app-container">
      {/* Header section */}
      <header className="header">
        <div className="logo-container">
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
          }}>
            <Flame size={24} color="#fff" />
          </div>
          <h1 className="logo-text">FoodsFit</h1>
        </div>

        <div className="user-info">
          <span className="user-email">{session.user.email}</span>
          <button
            onClick={handleLogout}
            className="btn-outline"
            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tabs-nav animate-fade">
        <button
          onClick={() => setActiveTab('meals')}
          className={`tab-btn ${activeTab === 'meals' ? 'active' : ''}`}
        >
          <Flame size={18} style={{ color: activeTab === 'meals' ? 'var(--primary)' : 'inherit' }} />
          Diario de Comidas
        </button>
        <button
          onClick={() => setActiveTab('weight')}
          className={`tab-btn ${activeTab === 'weight' ? 'active' : ''}`}
        >
          <TrendingUp size={18} style={{ color: activeTab === 'weight' ? 'var(--secondary)' : 'inherit' }} />
          Evolución de Peso
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
        >
          <Utensils size={18} style={{ color: activeTab === 'custom' ? 'var(--accent)' : 'inherit' }} />
          Mis Platos Guardados
        </button>
      </nav>

      {/* Main Tab Content */}
      <main className="tab-content">
        {activeTab === 'meals' && <MealsTracker />}
        {activeTab === 'weight' && <WeightTracker />}
        {activeTab === 'custom' && <CustomMeals />}
      </main>
    </div>
  )
}
