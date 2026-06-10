import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Trash2, TrendingUp, Calendar, AlertCircle, Sparkles } from 'lucide-react'

// Helper function to filter weight logs by timeRange
const filterLogsByRange = (logs, range) => {
  if (range === 'all') return logs

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  const limitDate = new Date(now)

  if (range === 'week') {
    limitDate.setDate(now.getDate() - 7)
  } else if (range === 'month') {
    limitDate.setMonth(now.getMonth() - 1)
  } else if (range === 'quarter') {
    limitDate.setMonth(now.getMonth() - 3)
  } else if (range === 'year') {
    limitDate.setFullYear(now.getFullYear() - 1)
  }

  return logs.filter(log => {
    const logDate = new Date(log.date + 'T00:00:00')
    return logDate >= limitDate
  })
}

export default function WeightTracker() {
  const [weightLogs, setWeightLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [timeRange, setTimeRange] = useState('all') // 'week', 'month', 'quarter', 'year', 'all'

  useEffect(() => {
    fetchWeightHistory()
  }, [])

  const fetchWeightHistory = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('weights')
        .select('*')
        .order('date', { ascending: true })

      if (error) throw error
      setWeightLogs(data || [])
    } catch (err) {
      console.error('Error fetching weights:', err)
      setErrorMsg('No se pudo cargar el historial de peso.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddWeight = async (e) => {
    e.preventDefault()
    if (!weight || !date) return

    setSaving(true)
    setErrorMsg('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const weightVal = parseFloat(weight)
      if (isNaN(weightVal) || weightVal <= 0) {
        throw new Error('El peso debe ser un número válido mayor a 0.')
      }

      const { error } = await supabase
        .from('weights')
        .upsert(
          {
            user_id: user.id,
            date: date,
            weight: weightVal
          },
          { onConflict: 'user_id, date' }
        )

      if (error) throw error

      setWeight('')
      fetchWeightHistory()
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el peso.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteWeight = async (id) => {
    try {
      const { error } = await supabase
        .from('weights')
        .delete()
        .eq('id', id)

      if (error) throw error
      setWeightLogs(weightLogs.filter(w => w.id !== id))
    } catch (err) {
      console.error('Error deleting weight log:', err)
      alert('No se pudo eliminar el registro.')
    }
  }

  const getSummaryStats = () => {
    if (weightLogs.length === 0) return null

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(now.getDate() - 7)

    const oneMonthAgo = new Date(now)
    oneMonthAgo.setMonth(now.getMonth() - 1)

    const parsedLogs = weightLogs.map(log => ({
      ...log,
      parsedDate: new Date(log.date + 'T00:00:00')
    }))

    const latestLog = [...parsedLogs].sort((a, b) => b.parsedDate - a.parsedDate)[0]

    const weeklyLogs = parsedLogs.filter(log => log.parsedDate >= oneWeekAgo)
    const weeklyAvg = weeklyLogs.length > 0 
      ? (weeklyLogs.reduce((sum, log) => sum + log.weight, 0) / weeklyLogs.length).toFixed(1)
      : null

    const monthlyLogs = parsedLogs.filter(log => log.parsedDate >= oneMonthAgo)
    const monthlyAvg = monthlyLogs.length > 0 
      ? (monthlyLogs.reduce((sum, log) => sum + log.weight, 0) / monthlyLogs.length).toFixed(1)
      : null

    return {
      latest: latestLog ? latestLog.weight.toFixed(1) : null,
      weeklyAvg,
      monthlyAvg
    }
  }

  const stats = getSummaryStats()

  // Calculate SVG Chart dimensions and paths
  const chartWidth = 650
  const chartHeight = 280
  const paddingLeft = 50
  const paddingRight = 30
  const paddingTop = 30
  const paddingBottom = 40

  let svgPoints = []
  let pathD = ''
  let areaD = ''
  let minW = 0, maxW = 0
  let minT = 0, maxT = 0

  const filteredLogs = filterLogsByRange(weightLogs, timeRange)

  if (filteredLogs.length > 0) {
    const weightsList = filteredLogs.map(w => w.weight)
    minW = Math.min(...weightsList) - 2
    maxW = Math.max(...weightsList) + 2
    if (minW === maxW) {
      minW -= 5
      maxW += 5
    }

    const timestamps = filteredLogs.map(w => new Date(w.date + 'T00:00:00').getTime())
    minT = Math.min(...timestamps)
    maxT = Math.max(...timestamps)

    svgPoints = filteredLogs.map((log) => {
      const t = new Date(log.date + 'T00:00:00').getTime()
      const x = timestamps.length > 1
        ? paddingLeft + ((t - minT) / (maxT - minT)) * (chartWidth - paddingLeft - paddingRight)
        : paddingLeft + (chartWidth - paddingLeft - paddingRight) / 2

      const y = chartHeight - paddingBottom - ((log.weight - minW) / (maxW - minW)) * (chartHeight - paddingTop - paddingBottom)
      
      return { x, y, log }
    })

    if (svgPoints.length > 1) {
      pathD = `M ${svgPoints[0].x} ${svgPoints[0].y} ` + svgPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
      areaD = `${pathD} L ${svgPoints[svgPoints.length - 1].x} ${chartHeight - paddingBottom} L ${svgPoints[0].x} ${chartHeight - paddingBottom} Z`
    }
  }

  // Formatting date for label
  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="animate-fade dashboard-grid weight-grid">
      
      {/* Card 1: Registrar Peso */}
      <div className="glass-panel register-card">
        <h3 className="section-title">
          <TrendingUp style={{ color: 'var(--secondary)' }} /> Registrar Peso
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

        <form onSubmit={handleAddWeight} className="form-grid-weights">
          <div className="form-group">
            <label htmlFor="weight-date">Fecha</label>
            <input
              id="weight-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="weight-input">Peso Corporal</label>
            <div style={{ position: 'relative' }}>
              <input
                id="weight-input"
                type="number"
                step="0.1"
                placeholder="Ej. 74.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
              <span style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dark)',
                fontSize: '0.85rem'
              }}>kg</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn-secondary"
            disabled={saving}
            style={{ height: '48px', padding: '0 1.5rem', marginBottom: '0px' }}
          >
            <Plus size={18} /> {saving ? 'Registrando...' : 'Registrar'}
          </button>
        </form>
      </div>

      {/* Card 2: Weight Log History */}
      <div className="history-card">
        <h3 className="section-title">Historial de Registros</h3>

        {loading ? (
          <div className="empty-state">
            <p>Cargando registros...</p>
          </div>
        ) : weightLogs.length === 0 ? (
          <div className="glass-panel empty-state">
            <Calendar size={40} style={{ color: 'var(--text-dark)' }} />
            <p>Aún no hay registros de peso guardados.</p>
            <p style={{ fontSize: '0.85rem' }}>Utiliza el formulario de arriba para registrar tu peso.</p>
          </div>
        ) : (
          <div className="log-list" style={{ maxHeight: '350px' }}>
            {[...weightLogs].reverse().map((item) => (
              <div key={item.id} className="log-item animate-fade">
                <div className="log-info">
                  <span className="log-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    {new Date(item.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="log-action">
                  <span className="log-kcal" style={{ color: 'var(--secondary)' }}>{item.weight} kg</span>
                  <button
                    onClick={() => handleDeleteWeight(item.id)}
                    className="btn-danger"
                    title="Eliminar registro"
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

      {/* Card 3: Interactive Weight Chart */}
      <div className="glass-panel chart-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem', 
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Evolución del Peso
            </span>
            {weightLogs.length > 1 && timeRange !== 'all' && (
              <span className="hide-on-mobile" style={{ fontSize: '0.85rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Sparkles size={12} /> Desliza por los puntos
              </span>
            )}
          </div>

          {/* Time range selector */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '0.35rem', 
            background: 'rgba(255,255,255,0.02)', 
            padding: '4px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-color)',
            justifyContent: 'space-between'
          }}>
            {[
              { id: 'week', label: '1 Sem' },
              { id: 'month', label: '1 Mes' },
              { id: 'quarter', label: '1 Trim' },
              { id: 'year', label: '1 Año' },
              { id: 'all', label: 'Histórico' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeRange(opt.id)}
                style={{
                  flex: '1 1 0px',
                  minWidth: '55px',
                  background: timeRange === opt.id ? 'var(--secondary)' : 'transparent',
                  border: 'none',
                  color: timeRange === opt.id ? '#fff' : 'var(--text-muted)',
                  padding: '0.5rem 0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  textAlign: 'center',
                  boxShadow: timeRange === opt.id ? '0 2px 8px var(--secondary-glow)' : 'none'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {weightLogs.length < 2 ? (
          <div style={{
            height: `${chartHeight}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem'
          }}>
            Se necesitan al menos 2 registros en fechas distintas para poder dibujar la gráfica.
          </div>
        ) : filteredLogs.length < 2 ? (
          <div style={{
            height: `${chartHeight}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem'
          }}>
            Se necesitan al menos 2 registros en el período seleccionado para poder dibujar la gráfica.
          </div>
        ) : (
          <div style={{ position: 'relative', overflowX: 'auto', width: '100%' }}>
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              style={{ width: '100%', height: 'auto' }}
            >
              <defs>
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--secondary)" />
                  <stop offset="100%" stopColor="var(--accent)" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const y = paddingTop + ratio * (chartHeight - paddingTop - paddingBottom)
                const value = maxW - ratio * (maxW - minW)
                return (
                  <g key={index}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingLeft - 10}
                      y={y + 4}
                      fill="var(--text-dark)"
                      fontSize="10"
                      textAnchor="end"
                      fontWeight="600"
                    >
                      {value.toFixed(1)}
                    </text>
                  </g>
                )
              })}

              {/* Filled Area */}
              {areaD && (
                <path
                  d={areaD}
                  fill="url(#chart-area-grad)"
                />
              )}

              {/* Line Path */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#chart-line-grad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points - Hidden in All-Time (Histórico) view */}
              {timeRange !== 'all' && svgPoints.map((pt, idx) => (
                <g key={idx}>
                  {/* Visible point */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint && hoveredPoint.idx === idx ? '10' : '6'}
                    fill={hoveredPoint && hoveredPoint.idx === idx ? '#fff' : 'var(--secondary)'}
                    stroke="var(--bg-main)"
                    strokeWidth="2.5"
                    style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
                  />
                  {/* Larger transparent touch/hover target */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="22"
                    fill="transparent"
                    style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                    onMouseEnter={() => setHoveredPoint({ idx, ...pt })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => setHoveredPoint(hoveredPoint && hoveredPoint.idx === idx ? null : { idx, ...pt })}
                  />
                </g>
              ))}

              {/* X Axis Date Labels */}
              {svgPoints.length > 0 && (() => {
                const labelsToDraw = []
                labelsToDraw.push(svgPoints[0])
                if (svgPoints.length > 2) {
                  labelsToDraw.push(svgPoints[Math.floor(svgPoints.length / 2)])
                }
                labelsToDraw.push(svgPoints[svgPoints.length - 1])

                return labelsToDraw.map((pt, idx) => (
                  <text
                    key={idx}
                    x={pt.x}
                    y={chartHeight - 15}
                    fill="var(--text-dark)"
                    fontSize="10"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {formatDateLabel(pt.log.date)}
                  </text>
                ))
              })()}

            </svg>

            {/* Hover Tooltip Info (Overlay) */}
            {hoveredPoint && timeRange !== 'all' && (
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#1f2937',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                display: 'flex',
                gap: '1rem',
                boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                zIndex: 20,
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <span>📅 <strong>{new Date(hoveredPoint.log.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</strong></span>
                <span style={{ color: 'var(--secondary)' }}>⚖️ <strong>{hoveredPoint.log.weight} kg</strong></span>
              </div>
            )}
          </div>
        )}

        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            marginTop: '1.5rem',
            marginBottom: '0.5rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.02em' }}>
                Último Peso
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {stats.latest ? `${stats.latest} kg` : '--'}
              </span>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.02em' }}>
                Prom. Semanal
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--secondary)' }}>
                {stats.weeklyAvg ? `${stats.weeklyAvg} kg` : '--'}
              </span>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.02em' }}>
                Prom. Mensual
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent)' }}>
                {stats.monthlyAvg ? `${stats.monthlyAvg} kg` : '--'}
              </span>
            </div>
          </div>
        )}

        {filteredLogs.length > 1 && (() => {
          const initialW = filteredLogs[0].weight
          const currentW = filteredLogs[filteredLogs.length - 1].weight
          const diff = currentW - initialW
          return (
            <div style={{
              marginTop: '1.5rem',
              padding: '0.8rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.9rem'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Variación en el período:</span>
              <span style={{
                fontWeight: '700',
                color: diff < 0 ? '#34d399' : diff > 0 ? '#f87171' : 'var(--text-muted)'
              }}>
                {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} kg {diff < 0 ? '📉 (Pérdida)' : diff > 0 ? '📈 (Ganancia)' : '⚖️ (Sin cambio)'}
              </span>
            </div>
          )
        })()}
      </div>

    </div>
  )
}
