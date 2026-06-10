import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { LogIn, UserPlus, Key, Mail, ShieldAlert, CheckCircle } from 'lucide-react'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        if (data?.user && data?.session === null) {
          setSuccessMsg('¡Registro exitoso! Por favor, verifica tu correo electrónico para confirmar tu cuenta.')
        } else {
          setSuccessMsg('¡Usuario registrado e iniciado sesión exitosamente!')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      width: '100%',
      padding: '1rem'
    }}>
      <div className="glass-panel animate-fade" style={{
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        animationDuration: '0.6s'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            FoodsFit
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {isSignUp ? 'Crea tu cuenta personal' : 'Inicia sesión en tu espacio personal'}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            className={`tab-btn ${!isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(false); setErrorMsg(''); setSuccessMsg(''); }}
            style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}
          >
            <LogIn size={16} /> Iniciar Sesión
          </button>
          <button
            type="button"
            className={`tab-btn ${isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(true); setErrorMsg(''); setSuccessMsg(''); }}
            style={{ flex: 1, justifyContent: 'center', padding: '0.5rem' }}
          >
            <UserPlus size={16} /> Registrarse
          </button>
        </div>

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
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.8rem 1rem',
            color: '#34d399',
            fontSize: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            <CheckCircle size={20} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label htmlFor="email">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dark)'
              }} />
              <input
                id="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative', marginBottom: '2rem' }}>
            <label htmlFor="password">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dark)'
              }} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-secondary"
            disabled={loading}
            style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}
          >
            {loading ? 'Procesando...' : isSignUp ? 'Crear Cuenta' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
