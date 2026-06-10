import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Flame, Utensils, AlertCircle, Loader } from 'lucide-react'

export default function CustomMeals() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [kcalPer100g, setKcalPer100g] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCustomMeals()
  }, [])

  const fetchCustomMeals = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('custom_meals')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setMeals(data || [])
    } catch (err) {
      console.error('Error fetching custom meals:', err)
      setErrorMsg('No se pudieron cargar tus platos personalizados.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMeal = async (e) => {
    e.preventDefault()
    if (!name.trim() || !kcalPer100g) return

    setSaving(true)
    setErrorMsg('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const kcalVal = parseFloat(kcalPer100g)
      if (isNaN(kcalVal) || kcalVal < 0) {
        throw new Error('Las calorías deben ser un número válido mayor o igual a 0.')
      }

      const { error } = await supabase
        .from('custom_meals')
        .insert([{
          user_id: user.id,
          name: name.trim(),
          kcal_per_100g: kcalVal
        }])
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya tienes un plato registrado con este nombre.')
        }
        throw error
      }

      setName('')
      setKcalPer100g('')
      fetchCustomMeals()
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el plato.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMeal = async (id) => {
    setErrorMsg('')
    try {
      const { error } = await supabase
        .from('custom_meals')
        .delete()
        .eq('id', id)

      if (error) throw error
      setMeals(meals.filter(m => m.id !== id))
    } catch (err) {
      console.error('Error deleting meal:', err)
      setErrorMsg('No se pudo eliminar el plato.')
    }
  }

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-panel">
        <h3 className="section-title">
          <Utensils style={{ color: 'var(--secondary)' }} /> Crear Nuevo Plato Personalizado
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Define platos frecuentes (como fajitas, ensaladas completas, batidos) y sus calorías por cada 100 gramos. Así podrás añadirlos a tu diario sin tener que registrar cada ingrediente por separado.
        </p>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.8rem 1rem',
            color: '#f87171',
            fontSize: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAddMeal} style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr auto',
          gap: '1rem',
          alignItems: 'end'
        }}>
          <div className="form-group">
            <label htmlFor="meal-name">Nombre del Plato</label>
            <input
              id="meal-name"
              type="text"
              placeholder="Ej. Fajita de pollo, Batido de proteínas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="meal-kcal">kcal por 100g</label>
            <div style={{ position: 'relative' }}>
              <input
                id="meal-kcal"
                type="number"
                step="any"
                placeholder="Ej. 185"
                value={kcalPer100g}
                onChange={(e) => setKcalPer100g(e.target.value)}
                required
              />
              <span style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dark)',
                fontSize: '0.85rem'
              }}>kcal</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn-secondary"
            disabled={saving}
            style={{ height: '48px', padding: '0 1.5rem', marginBottom: '0px' }}
          >
            <Plus size={18} /> {saving ? 'Guardando...' : 'Añadir Plato'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="section-title">
          <Utensils style={{ color: 'var(--accent)' }} /> Mis Platos Guardados
        </h3>

        {loading ? (
          <div className="empty-state">
            <Loader className="animate-spin" size={32} style={{ color: 'var(--secondary)' }} />
            <p>Cargando tus platos personalizados...</p>
          </div>
        ) : meals.length === 0 ? (
          <div className="glass-panel empty-state">
            <Utensils size={48} style={{ color: 'var(--text-dark)' }} />
            <p>No tienes platos personalizados guardados todavía.</p>
            <p style={{ fontSize: '0.85rem' }}>Crea tu primer plato arriba para empezar a registrar de manera más rápida.</p>
          </div>
        ) : (
          <div className="meal-cards-grid">
            {meals.map((meal) => (
              <div key={meal.id} className="glass-panel meal-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h4 className="card-title">{meal.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <Flame size={16} style={{ color: 'var(--accent)' }} />
                      <span>{meal.kcal_per_100g} kcal por 100g</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMeal(meal.id)}
                    className="btn-danger"
                    title="Eliminar plato"
                    style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
