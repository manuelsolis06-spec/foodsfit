import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, Calendar, Flame, Settings, AlertCircle, Sparkles, PlusCircle } from 'lucide-react'

export default function MealsTracker() {
  const [mealsLog, setMealsLog] = useState([])
  const [customMeals, setCustomMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  // Form State
  const [foodName, setFoodName] = useState('')
  const [grams, setGrams] = useState('')
  const [kcalPer100g, setKcalPer100g] = useState('')
  const [isCustomSelection, setIsCustomSelection] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  
  // User Profile Goal State
  const [calorieGoal, setCalorieGoal] = useState(2000)
  const [showGoalEditor, setShowGoalEditor] = useState(false)
  const [newGoal, setNewGoal] = useState('2000')

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false)
  const [calcGender, setCalcGender] = useState('male')
  const [calcWeight, setCalcWeight] = useState('')
  const [calcHeight, setCalcHeight] = useState('')
  const [calcAge, setCalcAge] = useState('')

  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const suggestionsRef = useRef(null)

  useEffect(() => {
    fetchDailyLog()
    fetchCustomMeals()
    fetchUserProfile()
  }, [date])

  // Handle clicking outside suggestions to close them
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('calorie_goal')
        .eq('id', user.id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setCalorieGoal(data.calorie_goal)
        setNewGoal(data.calorie_goal.toString())
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
    }
  }

  const updateCalorieGoal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const goalVal = parseInt(newGoal)
      if (isNaN(goalVal) || goalVal <= 0) {
        alert('Meta de calorías no válida')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, calorie_goal: goalVal })

      if (error) throw error
      setCalorieGoal(goalVal)
      setShowGoalEditor(false)
    } catch (err) {
      console.error('Error updating calorie goal:', err)
      alert('No se pudo guardar la meta.')
    }
  }

  const handleCalculateGoal = () => {
    const w = parseFloat(calcWeight)
    let h = parseFloat(calcHeight)
    const a = parseInt(calcAge)

    if (isNaN(w) || isNaN(h) || isNaN(a) || w <= 0 || h <= 0 || a <= 0) {
      alert('Por favor, ingresa valores válidos de peso, altura y edad.')
      return
    }

    // Auto-convert meters to centimeters (e.g. 1.75 to 175)
    if (h < 3) {
      h = h * 100
    }

    // Mifflin-St Jeor TMB
    let tmb = 10 * w + 6.25 * h - 5 * a
    if (calcGender === 'male') {
      tmb += 5
    } else {
      tmb -= 161
    }

    // Sedentary (x1.2)
    const maintenance = Math.round(tmb * 1.2)
    setNewGoal(maintenance.toString())
  }

  const fetchCustomMeals = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_meals')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setCustomMeals(data || [])
    } catch (err) {
      console.error('Error fetching custom meals:', err)
    }
  }

  const fetchDailyLog = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMealsLog(data || [])
    } catch (err) {
      console.error('Error fetching meals log:', err)
      setErrorMsg('Error al cargar las comidas de hoy.')
    } finally {
      setLoading(false)
    }
  }

  const handleFoodNameChange = (val) => {
    setFoodName(val)
    if (val.trim() === '') {
      setFilteredSuggestions([])
      setShowSuggestions(false)
      setIsCustomSelection(false)
      return
    }

    const filtered = customMeals.filter(m => 
      m.name.toLowerCase().includes(val.toLowerCase())
    )
    setFilteredSuggestions(filtered)
    setShowSuggestions(true)
  }

  const selectSuggestion = (meal) => {
    setFoodName(meal.name)
    setKcalPer100g(meal.kcal_per_100g.toString())
    setIsCustomSelection(true)
    setShowSuggestions(false)
  }

  const handleAddMeal = async (e) => {
    e.preventDefault()
    if (!foodName.trim() || !grams || !kcalPer100g) return

    setSaving(true)
    setErrorMsg('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const gramsVal = parseFloat(grams)
      const kcalPer100Val = parseFloat(kcalPer100g)

      if (isNaN(gramsVal) || gramsVal <= 0) {
        throw new Error('Los gramos deben ser mayores a 0.')
      }
      if (isNaN(kcalPer100Val) || kcalPer100Val < 0) {
        throw new Error('Las calorías deben ser un número válido.')
      }

      // Calculate total kcal
      const totalKcal = Math.round((kcalPer100Val / 100) * gramsVal)

      const { error } = await supabase
        .from('meals')
        .insert([{
          user_id: user.id,
          date: date,
          name: foodName.trim(),
          grams: gramsVal,
          kcal: totalKcal
        }])

      if (error) throw error

      // Reset form
      setFoodName('')
      setGrams('')
      setKcalPer100g('')
      setIsCustomSelection(false)
      fetchDailyLog()
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar la comida.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMeal = async (id) => {
    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', id)

      if (error) throw error
      setMealsLog(mealsLog.filter(m => m.id !== id))
    } catch (err) {
      console.error('Error deleting meal log:', err)
      alert('No se pudo eliminar el registro.')
    }
  }

  // Statistics
  const totalKcalToday = mealsLog.reduce((sum, item) => sum + item.kcal, 0)
  const progressPercent = Math.min(Math.round((totalKcalToday / calorieGoal) * 100), 100)
  const isGoalExceeded = totalKcalToday > calorieGoal

  // SVG Progress Ring calculations
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="animate-fade dashboard-grid">
      {/* Left Column: Form & Log List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Date Selector Header */}
        <div className="glass-panel" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.2rem 1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Fecha de Registro:</span>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
          />
        </div>

        {/* Add Food Form */}
        <div className="glass-panel">
          <h3 className="section-title">
            <PlusCircle style={{ color: 'var(--primary)' }} /> Registrar Comida
          </h3>

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
              <AlertCircle size={20} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddMeal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', position: 'relative' }}>
              
              {/* Food Name Field with suggestions */}
              <div className="form-group" style={{ position: 'relative' }} ref={suggestionsRef}>
                <label htmlFor="food-name">Alimento / Plato</label>
                <input
                  id="food-name"
                  type="text"
                  placeholder="Ej. Plátano, Fajita de pollo..."
                  value={foodName}
                  onChange={(e) => handleFoodNameChange(e.target.value)}
                  onFocus={() => { if (filteredSuggestions.length > 0) setShowSuggestions(true) }}
                  required
                  autoComplete="off"
                />

                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="suggestions-list">
                    {filteredSuggestions.map((meal) => (
                      <div
                        key={meal.id}
                        className="suggestion-item"
                        onClick={() => selectSuggestion(meal)}
                      >
                        <span style={{ fontWeight: '600' }}>{meal.name}</span>
                        <span style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>
                          {meal.kcal_per_100g} kcal/100g (Plato guardado)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grams Consumed */}
              <div className="form-group">
                <label htmlFor="grams">Gramos Comidos</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="grams"
                    type="number"
                    step="any"
                    placeholder="Ej. 150"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    required
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-dark)',
                    fontSize: '0.85rem'
                  }}>g</span>
                </div>
              </div>

              {/* kcal per 100g */}
              <div className="form-group">
                <label htmlFor="kcal-100">kcal por 100g</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="kcal-100"
                    type="number"
                    step="any"
                    placeholder="Ej. 89"
                    value={kcalPer100g}
                    onChange={(e) => {
                      setKcalPer100g(e.target.value)
                      setIsCustomSelection(false)
                    }}
                    required
                    disabled={isCustomSelection}
                    style={isCustomSelection ? { 
                      borderColor: 'var(--secondary)', 
                      background: 'rgba(139, 92, 246, 0.05)',
                      color: 'var(--text-main)'
                    } : {}}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: isCustomSelection ? 'var(--secondary)' : 'var(--text-dark)',
                    fontSize: '0.85rem',
                    fontWeight: isCustomSelection ? '600' : '400'
                  }}>kcal</span>
                </div>
              </div>

            </div>

            {isCustomSelection && (
              <div style={{ 
                fontSize: '0.85rem', 
                color: 'var(--secondary)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem',
                marginTop: '-0.75rem',
                background: 'rgba(139, 92, 246, 0.08)',
                padding: '0.5rem 0.8rem',
                borderRadius: 'var(--radius-sm)'
              }}>
                <Sparkles size={14} />
                <span>Usando la información de tu plato personalizado <strong>{foodName}</strong>. kcal calculadas automáticamente.</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ alignSelf: 'flex-end', minWidth: '160px' }}
            >
              <Plus size={18} /> {saving ? 'Registrando...' : 'Registrar'}
            </button>
          </form>
        </div>

        {/* Daily Log List */}
        <div>
          <h3 className="section-title">Comidas del Día</h3>

          {loading ? (
            <div className="empty-state">
              <p>Cargando diario...</p>
            </div>
          ) : mealsLog.length === 0 ? (
            <div className="glass-panel empty-state">
              <Flame size={40} style={{ color: 'var(--text-dark)' }} />
              <p>No hay comidas registradas para este día.</p>
              <p style={{ fontSize: '0.85rem' }}>Introduce lo que comiste en el formulario de arriba.</p>
            </div>
          ) : (
            <div className="log-list">
              {mealsLog.map((meal) => (
                <div key={meal.id} className="log-item animate-fade">
                  <div className="log-info">
                    <span className="log-name">{meal.name}</span>
                    <span className="log-meta">{meal.grams} gramos consumidos</span>
                  </div>
                  <div className="log-action">
                    <span className="log-kcal">+{meal.kcal} kcal</span>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="btn-danger"
                      title="Eliminar de hoy"
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

      {/* Right Column: Calorie Goal Summary & Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Progress Card */}
        <div className="glass-panel kcal-summary-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Resumen Diario
            </span>
            <button
              onClick={() => setShowGoalEditor(!showGoalEditor)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
              title="Ajustar meta diaria"
            >
              <Settings size={18} />
            </button>
          </div>

          {showGoalEditor ? (
            <div className="glass-panel animate-fade" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>
              <div className="form-group">
                <label>Meta de Calorías (kcal)</label>
                <input
                  type="number"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem' }}
                />
              </div>

              {/* Collapsible Calculator section */}
              <div style={{
                marginTop: '1rem',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1rem'
              }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowCalculator(!showCalculator)}
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    fontSize: '0.85rem',
                    justifyContent: 'center',
                    marginBottom: '0.8rem'
                  }}
                >
                  {showCalculator ? 'Ocultar Calculadora' : 'Calcular mi meta (Sedentario)'}
                </button>

                {showCalculator && (
                  <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div className="form-group" style={{ marginBottom: '0.3rem' }}>
                      <label style={{ fontSize: '0.75rem' }}>Género</label>
                      <select
                        value={calcGender}
                        onChange={(e) => setCalcGender(e.target.value)}
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                      >
                        <option value="male">Masculino</option>
                        <option value="female">Femenino</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group" style={{ marginBottom: '0.3rem' }}>
                        <label style={{ fontSize: '0.75rem' }}>Peso (kg)</label>
                        <input
                          type="number"
                          placeholder="Ej. 70"
                          value={calcWeight}
                          onChange={(e) => setCalcWeight(e.target.value)}
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0.3rem' }}>
                        <label style={{ fontSize: '0.75rem' }}>Altura (cm)</label>
                        <input
                          type="number"
                          placeholder="Ej. 175"
                          value={calcHeight}
                          onChange={(e) => setCalcHeight(e.target.value)}
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0.3rem' }}>
                        <label style={{ fontSize: '0.75rem' }}>Edad</label>
                        <input
                          type="number"
                          placeholder="Ej. 25"
                          value={calcAge}
                          onChange={(e) => setCalcAge(e.target.value)}
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCalculateGoal}
                      style={{ padding: '0.4rem', fontSize: '0.85rem', width: '100%', justifyContent: 'center' }}
                    >
                      Calcular y Rellenar
                    </button>

                    <p style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      lineHeight: '1.25',
                      textAlign: 'center',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px dashed var(--border-color)',
                      marginTop: '0.2rem'
                    }}>
                      ⚠️ Cálculo para estilo de vida sedentario, busque su caso específico respecto a su nivel de ejercicio físico para mayor precisión.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  className="btn-outline" 
                  onClick={() => {
                    setShowGoalEditor(false)
                    setShowCalculator(false)
                  }}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  Cancelar
                </button>
                <button 
                  className="btn-primary" 
                  onClick={updateCalorieGoal}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : null}

          {/* Calorie Goal Progress Circle */}
          <div className="kcal-circle-container">
            <svg width="180" height="180">
              {/* Background ring */}
              <circle
                stroke="rgba(255, 255, 255, 0.04)"
                fill="transparent"
                strokeWidth="12"
                r={radius}
                cx="90"
                cy="90"
              />
              {/* Progress ring */}
              <circle
                className="progress-ring-circle"
                stroke={isGoalExceeded ? '#ef4444' : 'var(--primary)'}
                fill="transparent"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={radius}
                cx="90"
                cy="90"
              />
            </svg>
            <div className="kcal-value-overlay">
              <span className="kcal-number">{totalKcalToday}</span>
              <span className="kcal-label">kcal de {calorieGoal}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            {isGoalExceeded ? (
              <p style={{ color: '#f87171', fontWeight: '600', fontSize: '0.9rem' }}>
                ¡Has superado tu meta por {totalKcalToday - calorieGoal} kcal!
              </p>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Te quedan <strong>{Math.max(0, calorieGoal - totalKcalToday)} kcal</strong> para hoy.
              </p>
            )}
            <div style={{ 
              marginTop: '1rem', 
              fontSize: '0.85rem', 
              background: 'rgba(255,255,255,0.03)', 
              padding: '0.5rem 1rem', 
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)'
            }}>
              Consumido: {progressPercent}% de tu meta
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
