import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { 
  BookOpen, Plus, ChefHat, Heart, Sparkles, Clock, 
  Trash2, X, Check, Search, Utensils, Flame, ChevronDown, CheckCircle2
} from 'lucide-react'

// 3 Recetas iniciales precargadas de alta calidad
const INITIAL_COMMUNITY_RECIPES = [
  {
    id: 'preset-1',
    title: 'Macarrones con Atún y Tomate Casero',
    author_name: 'Manuel (FoodsFit)',
    description: 'El clásico almuerzo rápido, saciante y alto en proteínas para días de estudio o entrenamiento.',
    prep_time: '15 min',
    image_url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      { name: 'Pasta (Macarrones)', grams: 180, kcal_per_100g: 355 },
      { name: 'Atún al natural', grams: 120, kcal_per_100g: 84 },
      { name: 'Tomate triturado / salsa suave', grams: 150, kcal_per_100g: 30 },
      { name: 'Aceite de oliva virgen', grams: 10, kcal_per_100g: 884 }
    ],
    steps: [
      'Poner agua con sal a hervir y cocer los macarrones durante 9-11 minutos hasta que queden al dente.',
      'En una sartén, calentar el aceite de oliva a fuego medio y verter la salsa de tomate con orégano y una pizca de pimienta.',
      'Escurrir bien las latas de atún e incorporarlo a la sartén junto con el tomate durante 2 minutos.',
      'Escurrir la pasta, mezclar con la salsa en la sartén y servir caliente.'
    ]
  },
  {
    id: 'preset-2',
    title: 'Guiso Rápido de Garbanzos con Pollo y Especias',
    author_name: 'NutriFit Team',
    description: 'Plato reconfortante, rico en fibra y proteína limpia. Fácil de preparar para varios días.',
    prep_time: '20 min',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      { name: 'Garbanzos cocidos en conserva', grams: 250, kcal_per_100g: 128 },
      { name: 'Pechuga de pollo en tiras', grams: 160, kcal_per_100g: 110 },
      { name: 'Pimiento y cebolla picada', grams: 100, kcal_per_100g: 35 },
      { name: 'Aceite de oliva', grams: 8, kcal_per_100g: 884 }
    ],
    steps: [
      'Dorar el pollo cortado en dados pequeños en una sartén con el aceite de oliva hasta que coja color.',
      'Añadir las verduras troceadas y sofreír 5 minutos con pimentón dulce, comino y sal.',
      'Enjuagar y escurrir los garbanzos cocidos e integrarlos a la sartén con un chorrito de caldo o agua.',
      'Cocinar a fuego medio tapado durante 6-8 minutos para que se mezclen todos los sabores.'
    ]
  },
  {
    id: 'preset-3',
    title: 'Fajitas Proteicas de Lomo y Pimientos',
    author_name: 'Carlos Fit',
    description: 'Cena rápida, deliciosa y muy saciante con proteína magra de lomo.',
    prep_time: '12 min',
    image_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
    ingredients: [
      { name: 'Tortillas de trigo para fajitas', grams: 120, kcal_per_100g: 300 },
      { name: 'Cinta de lomo embuchado o fresco', grams: 180, kcal_per_100g: 135 },
      { name: 'Pimiento rojo y verde', grams: 120, kcal_per_100g: 28 },
      { name: 'Queso rallado bajo en grasa', grams: 30, kcal_per_100g: 250 }
    ],
    steps: [
      'Cortar la cinta de lomo y los pimientos en tiras finas estilo juliana.',
      'Cocinar en sartén antiadherente bien caliente con sal, ajo en polvo y pimienta hasta dorar.',
      'Calentar las tortillas de trigo 30 segundos en el microondas o sartén seca.',
      'Montar las fajitas rellenando con el lomo, las verduras y espolvoreando el queso por encima.'
    ]
  }
]

export default function RecipesBlog() {
  const [recipes, setRecipes] = useState([])
  const [savedRecipeIds, setSavedRecipeIds] = useState([])
  const [customMeals, setCustomMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal de Crear Receta
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPrepTime, setNewPrepTime] = useState('15 min')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newIngredients, setNewIngredients] = useState([
    { name: '', grams: '', kcal_per_100g: '' }
  ])
  const [newSteps, setNewSteps] = useState([''])
  const [formError, setFormError] = useState('')

  // Modal Interactivo "COCINAR"
  const [cookingRecipe, setCookingRecipe] = useState(null)
  const [activeIngredients, setActiveIngredients] = useState([])
  const [addingToDay, setAddingToDay] = useState(false)
  const [addedSuccess, setAddedSuccess] = useState(false)

  // Estado para el buscador desplegable en cada ingrediente
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null)
  const [dropdownSearch, setDropdownSearch] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    loadRecipes()
    loadCustomMeals()
    loadSavedIds()
  }, [])

  // Cerrar buscador si se pulsa fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownIndex(null)
        setDropdownSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadCustomMeals = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_meals')
        .select('*')
        .order('name', { ascending: true })
      if (!error && data) {
        setCustomMeals(data)
      }
    } catch (e) {
      console.log('Error loading custom meals for equivalence:', e)
    }
  }

  const loadSavedIds = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('foodsfit_saved_recipes') || '[]')
      setSavedRecipeIds(saved)
    } catch (e) {
      setSavedRecipeIds([])
    }
  }

  const toggleSaveRecipe = (recipeId) => {
    let updated = []
    if (savedRecipeIds.includes(recipeId)) {
      updated = savedRecipeIds.filter(id => id !== recipeId)
    } else {
      updated = [...savedRecipeIds, recipeId]
    }
    setSavedRecipeIds(updated)
    localStorage.setItem('foodsfit_saved_recipes', JSON.stringify(updated))
  }

  const loadRecipes = () => {
    setLoading(true)
    try {
      const userCustomRecipes = JSON.parse(localStorage.getItem('foodsfit_community_recipes') || '[]')
      setRecipes([...userCustomRecipes, ...INITIAL_COMMUNITY_RECIPES])
    } catch (err) {
      setRecipes(INITIAL_COMMUNITY_RECIPES)
    } finally {
      setLoading(false)
    }
  }

  const calculateIngredientKcal = (grams, kcalPer100g) => {
    const g = parseFloat(grams) || 0
    const k = parseFloat(kcalPer100g) || 0
    return Math.round((g * k) / 100)
  }

  const calculateRecipeTotalKcal = (ingredients = []) => {
    return ingredients.reduce((sum, ing) => {
      return sum + calculateIngredientKcal(ing.grams, ing.kcal_per_100g)
    }, 0)
  }

  // --- Modo COCINAR ---
  const handleOpenCookModal = (recipe) => {
    setCookingRecipe(recipe)
    setActiveIngredients(
      recipe.ingredients.map(ing => ({
        ...ing,
        grams: ing.grams,
        kcal_per_100g: ing.kcal_per_100g,
        originalKcal: ing.kcal_per_100g,
        isCustom: false,
        selectedMealName: null
      }))
    )
    setAddedSuccess(false)
    setOpenDropdownIndex(null)
  }

  const handleUpdateCookIngredientGrams = (index, value) => {
    const updated = [...activeIngredients]
    updated[index].grams = value
    setActiveIngredients(updated)
  }

  const handleSelectEquivalence = (index, meal) => {
    const updated = [...activeIngredients]
    if (!meal) {
      // Volver a la receta original
      updated[index].kcal_per_100g = updated[index].originalKcal
      updated[index].isCustom = false
      updated[index].selectedMealName = null
    } else {
      updated[index].kcal_per_100g = meal.kcal_per_100g
      updated[index].isCustom = true
      updated[index].selectedMealName = meal.name
    }
    setActiveIngredients(updated)
    setOpenDropdownIndex(null)
    setDropdownSearch('')
  }

  const handleConfirmCookAndAddToDiary = async () => {
    if (!cookingRecipe) return
    setAddingToDay(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Debes iniciar sesión para guardar en tu diario')

      const totalKcal = calculateRecipeTotalKcal(activeIngredients)
      const totalGrams = activeIngredients.reduce((acc, ing) => acc + (parseFloat(ing.grams) || 0), 0)
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase.from('meals').insert([
        {
          user_id: user.id,
          date: today,
          name: `${cookingRecipe.title} (Adaptada)`,
          grams: Math.round(totalGrams) || 1,
          kcal: totalKcal
        }
      ])

      if (error) throw error

      setAddedSuccess(true)
      setTimeout(() => {
        setCookingRecipe(null)
        setAddedSuccess(false)
      }, 1500)
    } catch (err) {
      alert(err.message || 'Error al añadir al diario')
    } finally {
      setAddingToDay(false)
    }
  }

  // --- Formulario Crear Receta ---
  const handleAddIngredientRow = () => {
    setNewIngredients([...newIngredients, { name: '', grams: '', kcal_per_100g: '' }])
  }

  const handleRemoveIngredientRow = (index) => {
    if (newIngredients.length === 1) return
    setNewIngredients(newIngredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (index, field, value) => {
    const updated = [...newIngredients]
    updated[index][field] = value
    setNewIngredients(updated)
  }

  const handleAddStepRow = () => {
    setNewSteps([...newSteps, ''])
  }

  const handleRemoveStepRow = (index) => {
    if (newSteps.length === 1) return
    setNewSteps(newSteps.filter((_, i) => i !== index))
  }

  const handleStepChange = (index, value) => {
    const updated = [...newSteps]
    updated[index] = value
    setNewSteps(updated)
  }

  const handleSaveNewRecipe = (e) => {
    e.preventDefault()
    setFormError('')

    if (!newTitle.trim()) {
      setFormError('Introduce un título para tu receta.')
      return
    }

    const validIngredients = newIngredients.filter(ing => ing.name.trim() && parseFloat(ing.grams) > 0)
    if (validIngredients.length === 0) {
      setFormError('Añade al menos un ingrediente con sus gramos y kcal.')
      return
    }

    const validSteps = newSteps.filter(s => s.trim().length > 0)
    if (validSteps.length === 0) {
      setFormError('Añade al menos un paso de preparación.')
      return
    }

    const createdRecipe = {
      id: 'custom-' + Date.now(),
      title: newTitle.trim(),
      author_name: 'Tú (Comunidad)',
      description: newDescription.trim() || 'Receta creada por usuario de la comunidad FoodsFit.',
      prep_time: newPrepTime.trim() || '15 min',
      image_url: newImageUrl.trim() || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80',
      ingredients: validIngredients.map(ing => ({
        name: ing.name.trim(),
        grams: parseFloat(ing.grams),
        kcal_per_100g: parseFloat(ing.kcal_per_100g) || 100
      })),
      steps: validSteps
    }

    const existing = JSON.parse(localStorage.getItem('foodsfit_community_recipes') || '[]')
    const updated = [createdRecipe, ...existing]
    localStorage.setItem('foodsfit_community_recipes', JSON.stringify(updated))

    setRecipes([createdRecipe, ...recipes])
    setShowCreateModal(false)

    // Reset
    setNewTitle('')
    setNewDescription('')
    setNewImageUrl('')
    setNewIngredients([{ name: '', grams: '', kcal_per_100g: '' }])
    setNewSteps([''])
  }

  const filteredRecipes = recipes.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="animate-fade">
      {/* Cabecera del Blog / Feed */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1.5rem',
        background: '#111827',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex'
            }}>
              <BookOpen size={22} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Comunidad de Recetas
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Descubre recetas, adáptalas con tu propia comida con el botón <strong>Cocinar</strong> y añádelas a tu diario.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
        >
          <Plus size={20} /> Publicar Mi Receta
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <Search 
          size={18} 
          style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }}
        />
        <input
          type="text"
          placeholder="Buscar recetas por nombre, ingrediente (pasta, pollo, atún...)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
          style={{ paddingLeft: '2.8rem', width: '100%', background: '#111827' }}
        />
      </div>

      {/* Grid de Recetas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.75rem'
      }}>
        {filteredRecipes.map((recipe) => {
          const totalKcal = calculateRecipeTotalKcal(recipe.ingredients)
          const isSaved = savedRecipeIds.includes(recipe.id)

          return (
            <div
              key={recipe.id}
              style={{
                background: '#111827',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s ease',
                boxShadow: '0 8px 24px rgba(0,0,0,0.45)'
              }}
            >
              {/* Imagen con badge */}
              <div style={{ position: 'relative', height: '200px', width: '100%', overflow: 'hidden' }}>
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80'
                  }}
                />
                
                <div style={{
                  position: 'absolute',
                  top: '0.8rem',
                  right: '0.8rem',
                  background: '#070a13',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--primary)'
                }}>
                  <Flame size={16} /> {totalKcal} kcal
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '0.8rem',
                  left: '0.8rem',
                  background: 'rgba(0,0,0,0.85)',
                  padding: '0.3rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.8rem',
                  color: '#fff'
                }}>
                  <Clock size={14} /> {recipe.prep_time}
                </div>

                <button
                  onClick={() => toggleSaveRecipe(recipe.id)}
                  style={{
                    position: 'absolute',
                    top: '0.8rem',
                    left: '0.8rem',
                    background: isSaved ? '#ef4444' : 'rgba(0,0,0,0.7)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff'
                  }}
                  title={isSaved ? 'Guardada' : 'Guardar'}
                >
                  <Heart size={18} fill={isSaved ? '#fff' : 'none'} />
                </button>
              </div>

              {/* Contenido */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.8rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Por {recipe.author_name}
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem', lineHeight: '1.3' }}>
                    {recipe.title}
                  </h3>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.4', flex: 1 }}>
                  {recipe.description}
                </p>

                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Ingredientes base ({recipe.ingredients.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {recipe.ingredients.map((ing, i) => (
                      <span key={i} style={{
                        background: 'rgba(255,255,255,0.08)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        color: 'var(--text-main)'
                      }}>
                        {ing.name} ({ing.grams}g)
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenCookModal(recipe)}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.8rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    marginTop: '0.5rem'
                  }}
                >
                  <ChefHat size={20} />
                  Cocinar y Ajustar Medidas
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* =========================================================================
          MODAL INTERACTIVO: COCINAR (FONDO OPACO 100% SÓLIDO Y BUSCADOR DE PLATOS)
          ========================================================================= */}
      {cookingRecipe && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(3, 7, 18, 0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 99999
        }}>
          <div style={{
            background: '#0d1322', // Color 100% SÓLIDO NO TRANSPARENTE
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
          }}>
            {/* Cabecera */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>
                  <ChefHat size={22} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Modo Cocinar
                  </span>
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{cookingRecipe.title}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                  Ajusta los gramos o busca tu propio plato guardado para calcular las calorías reales.
                </p>
              </div>
              <button
                onClick={() => setCookingRecipe(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={26} />
              </button>
            </div>

            {/* Totalizador de Calorías */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(239,68,68,0.2) 100%)',
              border: '1px solid rgba(249,115,22,0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '1.1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.5px' }}>CALORÍAS CALCULADAS</span>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  {calculateRecipeTotalKcal(activeIngredients)}
                  <span style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 800 }}>kcal</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.5px' }}>PESO TOTAL</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                  {activeIngredients.reduce((sum, ing) => sum + (parseFloat(ing.grams) || 0), 0)} g
                </div>
              </div>
            </div>

            {/* Lista Interactiva de Ingredientes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ingredientes y Equivalencias de la Receta
              </div>

              {activeIngredients.map((ing, idx) => {
                const ingKcal = calculateIngredientKcal(ing.grams, ing.kcal_per_100g)
                const isDropdownOpen = openDropdownIndex === idx
                
                // Filtrar platos guardados por búsqueda del usuario
                const filteredCustomMeals = customMeals.filter(m => 
                  m.name.toLowerCase().includes(dropdownSearch.toLowerCase())
                )

                return (
                  <div
                    key={idx}
                    style={{
                      background: '#161f36', // Bloque sólido
                      border: ing.isCustom ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>{ing.name}</span>
                        {ing.isCustom && (
                          <span style={{
                            background: 'rgba(139, 92, 246, 0.25)',
                            color: '#c4b5fd',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(139, 92, 246, 0.4)'
                          }}>
                            {ing.selectedMealName}
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                        {ingKcal} kcal
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '0.85rem', alignItems: 'start' }}>
                      {/* Gramos */}
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>
                          Gramos que usarás:
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={ing.grams}
                            onChange={(e) => handleUpdateCookIngredientGrams(idx, e.target.value)}
                            className="input-field"
                            style={{ padding: '0.6rem', width: '100%', fontWeight: 800, fontSize: '1.05rem', background: '#0b101d' }}
                          />
                          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            g
                          </span>
                        </div>
                      </div>

                      {/* Buscador de equivalencia interactivo con filtro de texto */}
                      <div style={{ position: 'relative' }} ref={isDropdownOpen ? dropdownRef : null}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>
                          Equivalencia ({ing.kcal_per_100g} kcal/100g):
                        </label>

                        {/* Botón selector que abre el buscador */}
                        <div
                          onClick={() => {
                            setOpenDropdownIndex(isDropdownOpen ? null : idx)
                            setDropdownSearch('')
                          }}
                          style={{
                            background: '#0b101d',
                            border: isDropdownOpen ? '1px solid var(--secondary)' : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: ing.isCustom ? '#c4b5fd' : '#fff'
                          }}
                        >
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                            {ing.isCustom ? `Mi ${ing.selectedMealName}` : `Por defecto (${ing.originalKcal} kcal/100g)`}
                          </span>
                          <ChevronDown size={16} color="var(--text-muted)" />
                        </div>

                        {/* Menú desplegable con INPUT DE BÚSQUEDA */}
                        {isDropdownOpen && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '0.4rem',
                            background: '#070b14', // Fondo 100% negro azulado sólido
                            border: '1px solid rgba(139, 92, 246, 0.4)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 12px 30px rgba(0,0,0,0.95)',
                            zIndex: 100000,
                            maxHeight: '260px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                          }}>
                            {/* Input para ESCRIBIR tu plato */}
                            <div style={{ padding: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#0f172a' }}>
                              <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Escribe tu plato (ej: Atún, Arroz...)..."
                                  value={dropdownSearch}
                                  onChange={(e) => setDropdownSearch(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.45rem 0.5rem 0.45rem 1.8rem',
                                    fontSize: '0.85rem',
                                    background: '#070b14',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '4px',
                                    color: '#fff'
                                  }}
                                />
                              </div>
                            </div>

                            {/* Opciones */}
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                              {/* Opción reset a receta original */}
                              <div
                                onClick={() => handleSelectEquivalence(idx, null)}
                                style={{
                                  padding: '0.65rem 0.85rem',
                                  fontSize: '0.83rem',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                                  background: !ing.isCustom ? 'rgba(255,255,255,0.08)' : 'transparent',
                                  color: !ing.isCustom ? 'var(--primary)' : 'var(--text-muted)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <span>Por defecto de receta</span>
                                <span style={{ fontWeight: 700 }}>{ing.originalKcal} kcal/100g</span>
                              </div>

                              {filteredCustomMeals.length > 0 ? (
                                filteredCustomMeals.map((meal) => {
                                  const isSelected = ing.selectedMealName === meal.name
                                  return (
                                    <div
                                      key={meal.id}
                                      onClick={() => handleSelectEquivalence(idx, meal)}
                                      style={{
                                        padding: '0.65rem 0.85rem',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                        color: isSelected ? '#fff' : 'var(--text-main)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'background 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'rgba(139, 92, 246, 0.2)' : 'transparent'}
                                    >
                                      <span style={{ fontWeight: isSelected ? 700 : 500 }}>Mi {meal.name}</span>
                                      <span style={{ color: 'var(--secondary)', fontWeight: 800, fontSize: '0.82rem' }}>
                                        {meal.kcal_per_100g} kcal/100g
                                      </span>
                                    </div>
                                  )
                                })
                              ) : (
                                <div style={{ padding: '0.8rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                  No hay platos que coincidan con "{dropdownSearch}"
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pasos */}
            <div style={{ marginBottom: '1.5rem', background: '#161f36', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                Instrucciones de Cocina
              </div>
              <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#e2e8f0', fontSize: '0.92rem', lineHeight: '1.4' }}>
                {cookingRecipe.steps.map((step, sIdx) => (
                  <li key={sIdx}>{step}</li>
                ))}
              </ol>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setCookingRecipe(null)}
                className="btn-outline"
                style={{ flex: 1, padding: '0.85rem' }}
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={handleConfirmCookAndAddToDiary}
                disabled={addingToDay || addedSuccess}
                className="btn-primary"
                style={{
                  flex: 2,
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 800,
                  fontSize: '1rem'
                }}
              >
                {addedSuccess ? (
                  <>
                    <CheckCircle2 size={20} color="#22c55e" /> ¡Añadido a tu diario!
                  </>
                ) : addingToDay ? (
                  'Guardando en tu diario...'
                ) : (
                  <>
                    <Utensils size={18} /> Confirmar y Añadir al Día
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PUBLICAR RECETA */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(3, 7, 18, 0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 99999
        }}>
          <div style={{
            background: '#0d1322', // Sólido
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Publicar Receta en la Comunidad</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {formError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: '0.88rem'
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveNewRecipe} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label className="label">Título de la receta *</label>
                <input
                  type="text"
                  placeholder="Ej: Pasta con Pollo y Verduras al Curry"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input-field"
                  style={{ background: '#161f36' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Tiempo estimado</label>
                  <input
                    type="text"
                    placeholder="Ej: 15 min"
                    value={newPrepTime}
                    onChange={(e) => setNewPrepTime(e.target.value)}
                    className="input-field"
                    style={{ background: '#161f36' }}
                  />
                </div>
                <div>
                  <label className="label">URL de imagen (opcional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="input-field"
                    style={{ background: '#161f36' }}
                  />
                </div>
              </div>

              <div>
                <label className="label">Descripción breve</label>
                <textarea
                  rows="2"
                  placeholder="Explica de forma resumida qué tiene de especial este plato..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', resize: 'vertical', background: '#161f36' }}
                />
              </div>

              {/* Ingredientes */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="label" style={{ margin: 0 }}>Ingredientes y Kcal *</label>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <Plus size={16} /> Añadir Ingrediente
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {newIngredients.map((ing, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 32px', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Nombre (ej: Pasta)"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                        className="input-field"
                        style={{ background: '#161f36' }}
                      />
                      <input
                        type="number"
                        placeholder="Gramos"
                        min="1"
                        value={ing.grams}
                        onChange={(e) => handleIngredientChange(i, 'grams', e.target.value)}
                        className="input-field"
                        style={{ background: '#161f36' }}
                      />
                      <input
                        type="number"
                        placeholder="Kcal/100g"
                        min="0"
                        value={ing.kcal_per_100g}
                        onChange={(e) => handleIngredientChange(i, 'kcal_per_100g', e.target.value)}
                        className="input-field"
                        style={{ background: '#161f36' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientRow(i)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pasos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="label" style={{ margin: 0 }}>Pasos de Preparación *</label>
                  <button
                    type="button"
                    onClick={handleAddStepRow}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <Plus size={16} /> Añadir Paso
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {newSteps.map((step, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', width: '20px' }}>
                        {sIdx + 1}.
                      </span>
                      <input
                        type="text"
                        placeholder={`Paso ${sIdx + 1}...`}
                        value={step}
                        onChange={(e) => handleStepChange(sIdx, e.target.value)}
                        className="input-field"
                        style={{ flex: 1, background: '#161f36' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStepRow(sIdx)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  Publicar en la Comunidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
