import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, BookOpen, PackageOpen, ShoppingCart, Plus, Trash2, CheckCircle, Circle, Edit3, X, Sparkles, Key, ArrowLeft, RotateCcw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}

function MainApp() {
  const navigate = useNavigate();

  // --- STATE ---
  const [recipes, setRecipes] = useState(() => {
    const saved = localStorage.getItem('recipes');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        name: 'Spagetti Bolognese',
        ingredients: [
          { name: 'Kjøttdeig', amount: 500, unit: 'g' },
          { name: 'Spagetti', amount: 400, unit: 'g' },
          { name: 'Hakkede tomater', amount: 1, unit: 'boks' }
        ]
      },
      {
        id: 2,
        name: 'Taco',
        ingredients: [
          { name: 'Kjøttdeig', amount: 400, unit: 'g' },
          { name: 'Tacokrydder', amount: 1, unit: 'pose' },
          { name: 'Lefser', amount: 8, unit: 'stk' }
        ]
      }
    ];
  });

  const [pantry, setPantry] = useState(() => {
    const saved = localStorage.getItem('pantry');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Spagetti', amount: 1000, unit: 'g', expiryDate: '2027-01-01' }
    ];
  });

  const [menu, setMenu] = useState(() => {
    const saved = localStorage.getItem('menu');
    return saved ? JSON.parse(saved) : {};
  });

  const [shoppingList, setShoppingList] = useState(() => {
    const saved = localStorage.getItem('shoppingList');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('recipes', JSON.stringify(recipes)); }, [recipes]);
  useEffect(() => { localStorage.setItem('pantry', JSON.stringify(pantry)); }, [pantry]);
  useEffect(() => { localStorage.setItem('menu', JSON.stringify(menu)); }, [menu]);
  useEffect(() => { localStorage.setItem('shoppingList', JSON.stringify(shoppingList)); }, [shoppingList]);

  const convertToStandard = (amount, unit) => {
    const num = Number(amount) || 0;
    const u = (unit || '').toLowerCase().trim();

    switch (u) {
      case 'kg': return { amount: num * 1000, unit: 'g' };
      case 'l': return { amount: num * 1000, unit: 'ml' };
      case 'dl': return { amount: num * 100, unit: 'ml' };
      case 'ss': return { amount: num * 15, unit: 'g' };
      case 'tsk': return { amount: num * 5, unit: 'g' };
      default: return { amount: num, unit: u };
    }
  };

  const generateShoppingList = () => {
    const required = {};

    Object.values(menu).forEach(recipeId => {
      if (recipeId === 'rester') return;

      const recipe = recipes.find(r => r.id === Number(recipeId));
      if (recipe && recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
          const converted = convertToStandard(ing.amount, ing.unit);
          const key = `${ing.name.toLowerCase().trim()}_${converted.unit}`;

          if (!required[key]) {
            required[key] = { name: ing.name, amount: 0, unit: converted.unit };
          }
          required[key].amount += converted.amount;
        });
      }
    });

    const pantryMap = {};
    pantry.forEach(item => {
      const converted = convertToStandard(item.amount, item.unit);
      const key = `${item.name.toLowerCase().trim()}_${converted.unit}`;
      pantryMap[key] = (pantryMap[key] || 0) + converted.amount;
    });

    const newList = [];
    Object.keys(required).forEach(key => {
      const req = required[key];
      const inStock = pantryMap[key] || 0;
      const diff = req.amount - inStock;

      if (diff > 0) {
        newList.push({
          id: Date.now() + Math.random(),
          name: req.name,
          amount: Math.round(diff * 10) / 10,
          unit: req.unit,
          isBought: false
        });
      }
    });

    setShoppingList(newList);
    navigate('/handleliste');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 text-gray-900 dark:text-gray-100 max-w-md mx-auto relative overflow-x-hidden shadow-2xl">
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
        <h1 className="text-xl font-bold text-center">Ukesmeny & Matlager</h1>
      </header>

      <main className="flex-1 p-4 w-full box-border">
        <Routes>
          <Route path="/" element={<MenuPlanner menu={menu} setMenu={setMenu} recipes={recipes} generateShoppingList={generateShoppingList} />} />
          <Route path="/oppskrifter" element={<Recipes recipes={recipes} setRecipes={setRecipes} />} />
          <Route path="/lager" element={<Pantry pantry={pantry} setPantry={setPantry} />} />
          <Route path="/handleliste" element={<ShoppingList shoppingList={shoppingList} setShoppingList={setShoppingList} pantry={pantry} setPantry={setPantry} />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around p-3 z-20 shadow-lg">
        <NavItem to="/" icon={<CalendarDays />} label="Meny" />
        <NavItem to="/oppskrifter" icon={<BookOpen />} label="Oppskrifter" />
        <NavItem to="/lager" icon={<PackageOpen />} label="Lager" />
        <NavItem to="/handleliste" icon={<ShoppingCart />} label="Handle" />
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `flex flex-col items-center flex-1 ${isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
      {React.cloneElement(icon, { className: 'w-6 h-6 mb-1' })}
      <span className="text-xs">{label}</span>
    </NavLink>
  );
}

function MenuPlanner({ menu, setMenu, recipes, generateShoppingList }) {
  const days = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

  const resetMenu = () => {
    if (window.confirm('Vil du nullstille hele ukesmenyen?')) {
      setMenu({});
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ukesmeny</h2>
        <button 
          onClick={resetMenu}
          className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-xl font-semibold text-xs transition"
        >
          <RotateCcw className="w-4 h-4" /> Nullstill meny
        </button>
      </div>

      {days.map(day => (
        <div key={day} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="font-semibold w-24">{day}</span>
          <select 
            value={menu[day] || ''} 
            onChange={e => setMenu({ ...menu, [day]: e.target.value })}
            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Velg middag --</option>
            <option value="rester">❄️ Rester fra fryseren</option>
            {recipes.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      ))}
      <button 
        onClick={generateShoppingList}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition active:scale-95 mt-4"
      >
        Generer Handleliste
      </button>
    </div>
  );
}

function Recipes({ recipes, setRecipes }) {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [ingName, setIngName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiBox, setShowAiBox] = useState(false);

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  const addIngredient = () => {
    if (!ingName || !amount) return;
    setIngredients([...ingredients, { name: ingName, amount: Number(amount), unit }]);
    setIngName('');
    setAmount('');
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const openNewForm = () => {
    setEditingId(null);
    setName('');
    setIngredients([]);
    setIsFormOpen(true);
  };

  const saveRecipe = (e) => {
    e.preventDefault();
    if (!name || ingredients.length === 0) {
      alert('Vennligst fyll ut navn og minst én ingrediens.');
      return;
    }

    if (editingId) {
      setRecipes(recipes.map(r => r.id === editingId ? { ...r, name, ingredients } : r));
    } else {
      setRecipes([...recipes, { id: Date.now(), name, ingredients }]);
    }

    setName('');
    setIngredients([]);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const startEdit = (recipe) => {
    setEditingId(recipe.id);
    setName(recipe.name);
    setIngredients([...recipe.ingredients]);
    setIsFormOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setIngredients([]);
    setIsFormOpen(false);
  };

  const deleteRecipe = (id) => {
    setRecipes(recipes.filter(r => r.id !== id));
  };

  const generateWithAI = async () => {
    if (!apiKey) {
      alert('Vennligst skriv inn din Gemini API-nøkkel først.');
      return;
    }
    if (!aiPrompt) {
      alert('Skriv hva du ønsker oppskrift på.');
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Lag en middagsoppskrift basert på dette: "${aiPrompt}". 
Svar KUN med et gyldig JSON-objekt uten markdown-formatering, i dette nøyaktige formatet:
{
  "name": "Navn på retten",
  "ingredients": [
    { "name": "Ingrediensnavn", "amount": 500, "unit": "g" }
  ]
}
Tillatte enheter er kun: g, kg, ml, dl, l, ss, tsk, stk, boks, pose.`,
      });

      const rawText = response.text;
      if (!rawText) throw new Error('Fikk ikke svar fra modellen.');

      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedRecipe = JSON.parse(cleanJson);

      if (!parsedRecipe.name || !parsedRecipe.ingredients) {
        throw new Error('Ugyldig JSON-struktur.');
      }

      setRecipes([...recipes, { id: Date.now(), name: parsedRecipe.name, ingredients: parsedRecipe.ingredients }]);
      setAiPrompt('');
      setShowAiBox(false);
      setIsFormOpen(false);
      alert(`Oppskrift "${parsedRecipe.name}" ble generert!`);
    } catch (error) {
      console.error(error);
      alert(`Klarte ikke å generere oppskrift: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isFormOpen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={cancelEdit} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Tilbake til oversikt
          </button>
          <button onClick={() => setShowAiBox(!showAiBox)} className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition">
            <Sparkles className="w-4 h-4" /> AI-forslag
          </button>
        </div>

        <h2 className="text-2xl font-bold">{editingId ? 'Rediger Oppskrift' : 'Ny Oppskrift'}</h2>

        {showAiBox && (
          <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-xl border border-purple-200 dark:border-purple-800 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
              <Sparkles className="w-4 h-4" /> Generer oppskrift med Gemini AI
            </h3>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="password" placeholder="Lim inn Gemini API-nøkkel..." value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-lg p-2 text-xs" />
            </div>
            <input type="text" placeholder="Hva har du lyst på? (f.eks. rask kyllingrett med ris)" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="w-full bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 rounded-lg p-2 text-sm" />
            <button type="button" onClick={generateWithAI} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg text-sm transition flex justify-center items-center gap-2">
              {isGenerating ? 'Genererer oppskrift...' : '✨ Tryll frem oppskrift'}
            </button>
          </div>
        )}

        <form onSubmit={saveRecipe} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <input type="text" placeholder="Navn på rett..." value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" />

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <h3 className="text-sm font-semibold mb-2">Ingredienser</h3>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="Ingrediens" value={ingName} onChange={e => setIngName(e.target.value)} className="flex-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm min-w-0" />
              <input type="number" placeholder="Mengde" value={amount} onChange={e => setAmount(e.target.value)} className="w-20 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm" />
              <select value={unit} onChange={e => setUnit(e.target.value)} className="w-24 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm">
                <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="dl">dl</option><option value="l">l</option><option value="ss">ss</option><option value="tsk">tsk</option><option value="stk">stk</option><option value="boks">boks</option><option value="pose">pose</option>
              </select>
            </div>
            <button type="button" onClick={addIngredient} className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-sm font-semibold py-2 rounded-lg transition">+ Legg til ingrediens</button>

            <ul className="mt-3 space-y-2">
              {ingredients.map((ing, idx) => (
                <li key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg text-sm">
                  <span className="truncate pr-2">{ing.name} ({ing.amount} {ing.unit})</span>
                  <button type="button" onClick={() => removeIngredient(idx)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition">{editingId ? 'Lagre endringer' : 'Lagre oppskrift'}</button>
            <button type="button" onClick={cancelEdit} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold px-4 py-2.5 rounded-lg">Avbryt</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Oppskrifter</h2>
        <button onClick={openNewForm} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md transition active:scale-95">
          <Plus className="w-5 h-5" /> Ny oppskrift
        </button>
      </div>

      <div className="space-y-3">
        {recipes.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Ingen oppskrifter ennå. Trykk på "+ Ny oppskrift" for å legge til en!</p>
        ) : (
          recipes.map(recipe => (
            <div key={recipe.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start">
              <div className="space-y-1 pr-2 overflow-hidden">
                <h4 className="font-bold text-lg truncate">{recipe.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{recipe.ingredients.map(i => `${i.name} (${i.amount} ${i.unit})`).join(', ')}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(recipe)} className="text-blue-500 hover:text-blue-700 p-1"><Edit3 className="w-5 h-5" /></button>
                <button onClick={() => deleteRecipe(recipe.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Pantry({ pantry, setPantry }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');
  const [expiryDate, setExpiryDate] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const addPantryItem = (e) => {
    e.preventDefault();
    if (!name || !amount) return;

    setPantry([...pantry, {
      id: Date.now(),
      name,
      amount: Number(amount),
      unit,
      expiryDate: expiryDate || new Date().toISOString().split('T')[0]
    }]);

    setName('');
    setAmount('');
    setExpiryDate('');
    setIsFormOpen(false);
  };

  const deleteItem = (id) => {
    setPantry(pantry.filter(item => item.id !== id));
  };

  if (isFormOpen) {
    return (
      <div className="space-y-6">
        <button onClick={() => setIsFormOpen(false)} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Tilbake til lager
        </button>

        <h2 className="text-2xl font-bold">Legg til vare på lager</h2>

        <form onSubmit={addPantryItem} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
          <input type="text" placeholder="Varenavn..." value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" />
          <div className="flex gap-2">
            <input type="number" placeholder="Mengde" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm" />
            <select value={unit} onChange={e => setUnit(e.target.value)} className="w-24 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm">
              <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="dl">dl</option><option value="l">l</option><option value="ss">ss</option><option value="tsk">tsk</option><option value="stk">stk</option><option value="boks">boks</option><option value="pose">pose</option>
            </select>
          </div>
          <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm" />
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition">Legg til i lager</button>
            <button type="button" onClick={() => setIsFormOpen(false)} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold px-4 py-2.5 rounded-lg">Avbryt</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Matvarelager</h2>
        <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md transition active:scale-95">
          <Plus className="w-5 h-5" /> Ny vare
        </button>
      </div>

      <div className="space-y-3">
        {pantry.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Matlageret er tomt. Trykk på "+ Ny vare" for å legge til noe!</p>
        ) : (
          pantry.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div className="pr-2 overflow-hidden">
                <h4 className="font-bold text-base truncate">{item.name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.amount} {item.unit} • Utløp: {item.expiryDate}</p>
              </div>
              <button onClick={() => deleteItem(item.id)} className="text-red-500 hover:text-red-700 p-1 shrink-0"><Trash2 className="w-5 h-5" /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ShoppingList({ shoppingList, setShoppingList, pantry, setPantry }) {
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemUnit, setItemUnit] = useState('stk');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const addItemManual = (e) => {
    e.preventDefault();
    if (!itemName) return;

    const newItem = {
      id: Date.now() + Math.random(),
      name: itemName,
      amount: Number(itemAmount) || 1,
      unit: itemUnit,
      isBought: false
    };

    setShoppingList([...shoppingList, newItem]);
    setItemName('');
    setItemAmount('');
    setIsFormOpen(false);
  };

  const toggleBought = (id) => {
    const item = shoppingList.find(i => i.id === id);
    if (!item) return;

    const nextBoughtState = !item.isBought;

    setShoppingList(shoppingList.map(i => i.id === id ? { ...i, isBought: nextBoughtState } : i));

    if (nextBoughtState) {
      const existingPantryItem = pantry.find(p => p.name.toLowerCase().trim() === item.name.toLowerCase().trim());
      if (existingPantryItem) {
        setPantry(pantry.map(p => p.id === existingPantryItem.id ? { ...p, amount: p.amount + item.amount } : p));
      } else {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 14);
        setPantry([...pantry, {
          id: Date.now(),
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          expiryDate: expiry.toISOString().split('T')[0]
        }]);
      }
    }
  };

  const removeItem = (id) => {
    setShoppingList(shoppingList.filter(i => i.id !== id));
  };

  if (isFormOpen) {
    return (
      <div className="space-y-6">
        <button onClick={() => setIsFormOpen(false)} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Tilbake til handleliste
        </button>

        <h2 className="text-2xl font-bold">Legg til vare manuelt</h2>

        <form onSubmit={addItemManual} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
          <input type="text" placeholder="Varenavn (f.eks. Melk, Dorull)..." value={itemName} onChange={e => setItemName(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" />
          <div className="flex gap-2">
            <input type="number" placeholder="Mengde" value={itemAmount} onChange={e => setItemAmount(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm" />
            <select value={itemUnit} onChange={e => setItemUnit(e.target.value)} className="w-24 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm">
              <option value="stk">stk</option><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="dl">dl</option><option value="l">l</option><option value="ss">ss</option><option value="tsk">tsk</option><option value="boks">boks</option><option value="pose">pose</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition">Legg til på handleliste</button>
            <button type="button" onClick={() => setIsFormOpen(false)} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold px-4 py-2.5 rounded-lg">Avbryt</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Handleliste</h2>
        <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md transition active:scale-95">
          <Plus className="w-5 h-5" /> Ny vare
        </button>
      </div>

      {shoppingList.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">Handlelisten er tom. Generer fra menyen eller trykk på "+ Ny vare" for å legge til manuelt!</p>
      ) : (
        <div className="space-y-3">
          {shoppingList.map(item => (
            <div 
              key={item.id}
              onClick={() => toggleBought(item.id)}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                item.isBought 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-75' 
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                {item.isBought ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-sm truncate ${item.isBought ? 'line-through text-gray-500' : ''}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.amount} {item.unit}
                  </p>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                className="text-gray-400 hover:text-red-500 p-2 shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
