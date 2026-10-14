import { Recipe, PantryItem, DayPlan, AppSettings } from '../types';
import { addDaysToDate, formatDateToISO } from '../utils/unitConverter';

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'recipe-bolognese',
    name: 'Spagetti Bolognese',
    category: 'Kjøtt',
    description: 'Klassisk italiensk favoritt med fyldig tomatsaus og parmesan.',
    prepTimeMinutes: 30,
    ingredients: [
      { id: 'ing-1', name: 'Kjøttdeig', amount: 400, unit: 'g' },
      { id: 'ing-2', name: 'Hakkede tomater', amount: 1, unit: 'boks' },
      { id: 'ing-3', name: 'Spagetti', amount: 350, unit: 'g' },
      { id: 'ing-4', name: 'Gul løk', amount: 1, unit: 'stk' },
      { id: 'ing-5', name: 'Hvitløksfedd', amount: 2, unit: 'stk' },
      { id: 'ing-6', name: 'Tomatpuré', amount: 2, unit: 'ss' },
      { id: 'ing-7', name: 'Revet parmesan', amount: 60, unit: 'g' }
    ],
    instructions: [
      'Kok spagetti i rikelig med saltet vann etter anvisning på pakken.',
      'Finhakk løk og hvitløk. Stek gyllent i litt olje i en dyp panne.',
      'Ha i kjøttdeig og brun den godt under omrøring.',
      'Tilsett tomatpuré og stek i 1 minutt før du heller over hakkede tomater.',
      'La sausen småkoke i 15–20 minutter. Smak til med salt, pepper og oregano.',
      'Server med nykokt pasta og rikelig med revet parmesan!'
    ],
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000
  },
  {
    id: 'recipe-taco',
    name: 'Klassisk Norsk Taco',
    category: 'Kjøtt',
    description: 'Fredagstacoen med sprø skjell, tacolefser og friske grønnsaker.',
    prepTimeMinutes: 20,
    ingredients: [
      { id: 'ing-8', name: 'Karbonadedeig', amount: 400, unit: 'g' },
      { id: 'ing-9', name: 'Tacokrydder', amount: 1, unit: 'pk' },
      { id: 'ing-10', name: 'Tacolefser', amount: 8, unit: 'stk' },
      { id: 'ing-11', name: 'Mais', amount: 1, unit: 'boks' },
      { id: 'ing-12', name: 'Rømme', amount: 1, unit: 'boks' },
      { id: 'ing-13', name: 'Revet ost', amount: 200, unit: 'g' },
      { id: 'ing-14', name: 'Agurk', amount: 1, unit: 'stk' },
      { id: 'ing-15', name: 'Paprika', amount: 1, unit: 'stk' },
      { id: 'ing-16', name: 'Tomater', amount: 2, unit: 'stk' }
    ],
    instructions: [
      'Brun karbonadedeigen i en stekepanne. Rør inn tacokrydder og 1 dl vann. La simre til vannet har kokt inn.',
      'Kutt agurk, paprika og tomater i terninger.',
      'Varm tacolefsene forsiktig i ovnen eller mikrobølgeovn.',
      'Sett alt på bordet og la alle bygge sine egne favoritter.'
    ],
    createdAt: Date.now() - 90000,
    updatedAt: Date.now() - 90000
  },
  {
    id: 'recipe-laks',
    name: 'Kremet Lakseform med Grønnsaker',
    category: 'Fisk',
    description: 'Enkel og sunn middag i ovnsform med laks, brokkoli og fløtesaus.',
    prepTimeMinutes: 35,
    ingredients: [
      { id: 'ing-17', name: 'Laksefilet', amount: 500, unit: 'g' },
      { id: 'ing-18', name: 'Matfløte', amount: 3, unit: 'dl' },
      { id: 'ing-19', name: 'Brokkoli', amount: 1, unit: 'stk' },
      { id: 'ing-20', name: 'Purreløk', amount: 1, unit: 'stk' },
      { id: 'ing-21', name: 'Poteter', amount: 600, unit: 'g' },
      { id: 'ing-22', name: 'Sitron', amount: 0.5, unit: 'stk' }
    ],
    instructions: [
      'Sett stekeovnen på 200 °C. Kok poteter i lettsaltet vann.',
      'Del brokkoli i buketter og purreløk i ringer. Legg i en ildfast form.',
      'Skjær laksefiletene i porsjonsstykker og legg over grønnsakene.',
      'Bland fløte med salt, pepper og litt sitronsaft. Hell over formen.',
      'Stek midt i ovnen i 20–25 minutter til laksen er gjennomstekt.'
    ],
    createdAt: Date.now() - 80000,
    updatedAt: Date.now() - 80000
  },
  {
    id: 'recipe-kyllingwok',
    name: 'Kyllingwok med Nudler & Grønnsaker',
    category: 'Kylling',
    description: 'Fargerik og knasende wok med saftig kylling og soyasaus.',
    prepTimeMinutes: 20,
    ingredients: [
      { id: 'ing-23', name: 'Kyllingfilet', amount: 400, unit: 'g' },
      { id: 'ing-24', name: 'Eggenudler', amount: 250, unit: 'g' },
      { id: 'ing-25', name: 'Wokgrønnsaker', amount: 400, unit: 'g' },
      { id: 'ing-26', name: 'Soyasaus', amount: 3, unit: 'ss' },
      { id: 'ing-27', name: 'Sweet chilisaus', amount: 2, unit: 'ss' },
      { id: 'ing-28', name: 'Sesamolje', amount: 1, unit: 'ss' }
    ],
    instructions: [
      'Kok nudlene etter anvisning og skyll i kaldt vann.',
      'Skjær kyllingfilet i strimler og stek på høy varme i wok eller dyp panne.',
      'Tilsett wokgrønnsakene og fres i 3–4 minutter.',
      'Vend inn nudler, soyasaus, sweet chilisaus og sesamolje.',
      'Varm alt godt igjennom og server rykende varmt.'
    ],
    createdAt: Date.now() - 70000,
    updatedAt: Date.now() - 70000
  },
  {
    id: 'recipe-pannekaker',
    name: 'Grove Pannekaker med Blåbærsyltetøy',
    category: 'Vegetar',
    description: 'Mettende pannekaker med havregryn og grovt mel.',
    prepTimeMinutes: 25,
    ingredients: [
      { id: 'ing-29', name: 'Hvetemel', amount: 200, unit: 'g' },
      { id: 'ing-30', name: 'Sammalt hvete', amount: 100, unit: 'g' },
      { id: 'ing-31', name: 'Melk', amount: 6, unit: 'dl' },
      { id: 'ing-32', name: 'Egg', amount: 3, unit: 'stk' },
      { id: 'ing-33', name: 'Smør', amount: 50, unit: 'g' },
      { id: 'ing-34', name: 'Blåbærsyltetøy', amount: 1, unit: 'glass' }
    ],
    instructions: [
      'Visp sammen mel, sammalt hvete og halvparten av melken til en klumpfri røre.',
      'Tilsett resten av melken og visp inn eggene.',
      'Smelt smøret og rør inn i røren. La svelle i 15 minutter.',
      'Stek tynne, gylne pannekaker i litt smør på middels varme.',
      'Nyt med rørte blåbær eller syltetøy!'
    ],
    createdAt: Date.now() - 60000,
    updatedAt: Date.now() - 60000
  },
  {
    id: 'recipe-tomatsuppe',
    name: 'Hjemmelaget Tomatsuppe med Egg',
    category: 'Suppe',
    description: 'Fyldig og varmende suppe toppet med kokte egg og makaroni.',
    prepTimeMinutes: 25,
    ingredients: [
      { id: 'ing-35', name: 'Hakkede tomater', amount: 2, unit: 'boks' },
      { id: 'ing-36', name: 'Grønnsaksbuljong', amount: 5, unit: 'dl' },
      { id: 'ing-37', name: 'Gul løk', amount: 1, unit: 'stk' },
      { id: 'ing-38', name: 'Egg', amount: 4, unit: 'stk' },
      { id: 'ing-39', name: 'Makaroni', amount: 150, unit: 'g' },
      { id: 'ing-40', name: 'Matfløte', amount: 1, unit: 'dl' }
    ],
    instructions: [
      'Kok eggene smilende (ca. 8 minutter) og kok makaroni i egen kjele.',
      'Fres hakket løk i litt smør til den er blank.',
      'Hell over hakkede tomater og buljong. La koke i 10 minutter.',
      'Kjør suppen glatt med stavmikser. Rør inn matfløte og smak til.',
      'Server med makaroni og egg skåret i båter.'
    ],
    createdAt: Date.now() - 50000,
    updatedAt: Date.now() - 50000
  },
  {
    id: 'recipe-kjottkaker',
    name: 'Klassiske Kjøttkaker i Brun Saus',
    category: 'Kjøtt',
    description: 'Norsk husmannskost på sitt aller beste med ertestuing og poteter.',
    prepTimeMinutes: 45,
    ingredients: [
      { id: 'ing-41', name: 'Kjøttdeig', amount: 500, unit: 'g' },
      { id: 'ing-42', name: 'Potetmel', amount: 2, unit: 'ss' },
      { id: 'ing-43', name: 'Melk', amount: 1.5, unit: 'dl' },
      { id: 'ing-44', name: 'Brun saus', amount: 1, unit: 'pk' },
      { id: 'ing-45', name: 'Poteter', amount: 800, unit: 'g' },
      { id: 'ing-46', name: 'Ertestuing', amount: 1, unit: 'pk' },
      { id: 'ing-47', name: 'Tyttebærsyltetøy', amount: 1, unit: 'glass' }
    ],
    instructions: [
      'Rør kjøttdeigen seig med salt. Tilsett potetmel, pepper, muskat og melk litt etter litt.',
      'Form til runde kjøttkaker med en fuktet skje og brun dem pent på begge sider.',
      'Lag brun saus og legg kjøttkakene oppi. La dem trekke i 15–20 minutter.',
      'Kok poteter og varm ertestuing etter anvisning.',
      'Server med tyttebærsyltetøy!'
    ],
    createdAt: Date.now() - 40000,
    updatedAt: Date.now() - 40000
  }
];

export function getInitialPantryItems(): PantryItem[] {
  const now = Date.now();
  const today = new Date();

  return [
    {
      id: 'pantry-1',
      name: 'Kjøttdeig',
      amount: 400,
      unit: 'g',
      category: 'Fryser',
      expiryDate: addDaysToDate(today, 60),
      addedAt: now - 300000,
      updatedAt: now - 300000
    },
    {
      id: 'pantry-2',
      name: 'Revet ost',
      amount: 250,
      unit: 'g',
      category: 'Kjøleskap',
      expiryDate: addDaysToDate(today, 2), // Warning: expires in 2 days! Demonstrates holdbarhetssporing
      addedAt: now - 200000,
      updatedAt: now - 200000,
      notes: 'Åpnet pakke'
    },
    {
      id: 'pantry-3',
      name: 'Egg',
      amount: 6,
      unit: 'stk',
      category: 'Kjøleskap',
      expiryDate: addDaysToDate(today, 12),
      addedAt: now - 150000,
      updatedAt: now - 150000
    },
    {
      id: 'pantry-4',
      name: 'Spagetti',
      amount: 500,
      unit: 'g',
      category: 'Tørrvare',
      expiryDate: addDaysToDate(today, 250),
      addedAt: now - 100000,
      updatedAt: now - 100000
    },
    {
      id: 'pantry-5',
      name: 'Hakkede tomater',
      amount: 2,
      unit: 'boks',
      category: 'Tørrvare',
      expiryDate: addDaysToDate(today, 300),
      addedAt: now - 90000,
      updatedAt: now - 90000
    },
    {
      id: 'pantry-6',
      name: 'Hvetemel',
      amount: 1,
      unit: 'kg',
      category: 'Tørrvare',
      expiryDate: addDaysToDate(today, 180),
      addedAt: now - 80000,
      updatedAt: now - 80000
    },
    {
      id: 'pantry-7',
      name: 'Smør',
      amount: 250,
      unit: 'g',
      category: 'Kjøleskap',
      expiryDate: addDaysToDate(today, 1), // Warning: expires tomorrow!
      addedAt: now - 70000,
      updatedAt: now - 70000
    },
    {
      id: 'pantry-8',
      name: 'Gul løk',
      amount: 3,
      unit: 'stk',
      category: 'Tørrvare',
      expiryDate: addDaysToDate(today, 14),
      addedAt: now - 60000,
      updatedAt: now - 60000
    }
  ];
}

const NORWEGIAN_DAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];

export function generateInitialMealPlan(daysCount: number = 7): DayPlan[] {
  const plan: DayPlan[] = [];
  const today = new Date();

  // Recipe rotation sequence for the initial week
  const recipeIds = [
    'recipe-bolognese',
    'recipe-laks',
    'recipe-pannekaker',
    'recipe-kyllingwok',
    'recipe-taco',
    'recipe-kjottkaker',
    'recipe-tomatsuppe'
  ];

  for (let i = 0; i < daysCount; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const dateStr = formatDateToISO(targetDate);
    const dayIndex = targetDate.getDay();
    const dayName = NORWEGIAN_DAYS[dayIndex];

    plan.push({
      id: dateStr,
      date: dateStr,
      dayName: i === 0 ? `I dag (${dayName})` : i === 1 ? `I morgen (${dayName})` : dayName,
      recipeId: recipeIds[i % recipeIds.length],
      servings: 4,
      manualExcludedIngredients: []
    });
  }

  return plan;
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'global-settings',
  theme: 'system',
  planDaysCount: 7,
  notificationsEnabled: true,
  notificationHour: 9,
  autoTransferToPantry: true
};
