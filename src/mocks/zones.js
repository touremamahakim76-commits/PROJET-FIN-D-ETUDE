/**
 * Donnees mock des zones Paris + stations RATP cles
 * Coordonnees GPS reelles — profils de frequentation par type
 *
 * Chaque zone a une "courbe horaire" simulant l'affluence sur 24h (0=vide, 100=bonde).
 */

const generateHourlyDensity = (type) => {
  const profiles = {
    touristic:   [10, 5, 5, 5, 5, 8, 15, 25, 40, 55, 70, 80, 85, 80, 75, 80, 85, 88, 90, 85, 70, 50, 30, 20],
    business:    [5, 3, 2, 2, 2, 5, 30, 70, 90, 75, 60, 55, 80, 70, 60, 55, 70, 90, 75, 40, 20, 10, 8, 6],
    residential: [15, 10, 5, 5, 5, 10, 25, 40, 30, 20, 15, 20, 25, 20, 15, 20, 30, 50, 60, 55, 45, 35, 25, 20],
    park:        [5, 2, 2, 2, 2, 5, 10, 20, 35, 45, 55, 60, 65, 70, 75, 78, 75, 65, 50, 35, 20, 10, 5, 5],
    transport:   [10, 8, 5, 5, 8, 25, 60, 95, 90, 70, 55, 60, 75, 65, 55, 60, 80, 95, 85, 60, 40, 25, 15, 10],
    shopping:    [5, 2, 2, 2, 2, 5, 10, 25, 45, 60, 70, 75, 70, 75, 80, 85, 80, 75, 70, 60, 45, 25, 15, 8],
  }
  return profiles[type] || profiles.residential
}

export const zones = [
  // --- Lieux emblematiques ---
  {
    id: 1,
    nom: 'Tour Eiffel',
    type: 'touristic',
    latitude: 48.8584,
    longitude: 2.2945,
    radius: 250,
    description: 'Site touristique majeur — Metro Bir-Hakeim (L6), Trocadero (L9)',
    hourlyDensity: generateHourlyDensity('touristic'),
  },
  {
    id: 2,
    nom: 'Champs-Elysees — George V',
    type: 'shopping',
    latitude: 48.8698,
    longitude: 2.3076,
    radius: 350,
    description: 'Avenue commercante — Metro George V (L1), Charles de Gaulle-Etoile (L1/2/6)',
    hourlyDensity: generateHourlyDensity('shopping'),
  },
  {
    id: 5,
    nom: 'Quartier Marais — Saint-Paul',
    type: 'shopping',
    latitude: 48.8566,
    longitude: 2.3622,
    radius: 280,
    description: 'Quartier historique — Metro Saint-Paul (L1), Chemin Vert (L8)',
    hourlyDensity: generateHourlyDensity('shopping'),
  },
  {
    id: 6,
    nom: 'Parc des Buttes-Chaumont',
    type: 'park',
    latitude: 48.8809,
    longitude: 2.3829,
    radius: 400,
    description: 'Espace vert — Metro Botzaris / Buttes-Chaumont (L7bis)',
    hourlyDensity: generateHourlyDensity('park'),
  },
  {
    id: 7,
    nom: 'Jardin du Luxembourg',
    type: 'park',
    latitude: 48.8462,
    longitude: 2.3372,
    radius: 350,
    description: 'Jardin senatoral — RER B Luxembourg, Metro Odeon (L4/10)',
    hourlyDensity: generateHourlyDensity('park'),
  },
  {
    id: 9,
    nom: 'Quartier Latin — Odeon',
    type: 'residential',
    latitude: 48.8500,
    longitude: 2.3470,
    radius: 250,
    description: 'Quartier etudiant — Metro Cluny-La Sorbonne (L10), Maubert (L10)',
    hourlyDensity: generateHourlyDensity('residential'),
  },
  {
    id: 10,
    nom: 'Montmartre — Abbesses',
    type: 'touristic',
    latitude: 48.8867,
    longitude: 2.3431,
    radius: 300,
    description: 'Butte touristique, Sacre-Coeur — Metro Abbesses (L12), Anvers (L2)',
    hourlyDensity: generateHourlyDensity('touristic'),
  },
  {
    id: 11,
    nom: 'Bercy Village',
    type: 'shopping',
    latitude: 48.8330,
    longitude: 2.3833,
    radius: 200,
    description: 'Zone pietonne tranquille — Metro Cour Saint-Emilion (L14)',
    hourlyDensity: generateHourlyDensity('shopping'),
  },
  {
    id: 12,
    nom: 'Canal Saint-Martin',
    type: 'residential',
    latitude: 48.8717,
    longitude: 2.3650,
    radius: 300,
    description: 'Quartier branche, anime le soir — Metro Goncourt (L11), Jacques Bonsergent (L5)',
    hourlyDensity: generateHourlyDensity('residential'),
  },
  {
    id: 13,
    nom: 'Bois de Vincennes',
    type: 'park',
    latitude: 48.8285,
    longitude: 2.4337,
    radius: 600,
    description: 'Grand espace vert — Metro Chateau de Vincennes (L1), RER A',
    hourlyDensity: generateHourlyDensity('park'),
  },
  {
    id: 15,
    nom: 'Quartier Auteuil',
    type: 'residential',
    latitude: 48.8484,
    longitude: 2.2697,
    radius: 350,
    description: 'Quartier residentiel calme — Metro Michel-Ange Auteuil (L9/10)',
    hourlyDensity: generateHourlyDensity('residential'),
  },

  // --- Grandes gares et hubs RATP ---
  {
    id: 3,
    nom: 'Gare du Nord',
    type: 'transport',
    latitude: 48.8809,
    longitude: 2.3553,
    radius: 220,
    description: 'Gare la plus frequentee d Europe — Metro L4/5, RER B/D/E, Eurostar',
    hourlyDensity: generateHourlyDensity('transport'),
  },
  {
    id: 4,
    nom: 'Chatelet — Les Halles',
    type: 'transport',
    latitude: 48.8616,
    longitude: 2.3470,
    radius: 220,
    description: 'Plus grand carrefour souterrain monde — Metro L1/4/7/11/14, RER A/B/D',
    hourlyDensity: generateHourlyDensity('transport'),
  },
  {
    id: 8,
    nom: 'La Defense — Grande Arche',
    type: 'business',
    latitude: 48.8918,
    longitude: 2.2380,
    radius: 400,
    description: 'CBD parisien — Metro L1, RER A, Transilien L/U',
    hourlyDensity: generateHourlyDensity('business'),
  },
  {
    id: 14,
    nom: 'Place de la Republique',
    type: 'transport',
    latitude: 48.8676,
    longitude: 2.3631,
    radius: 200,
    description: 'Carrefour central Paris — Metro L3/5/8/9/11',
    hourlyDensity: generateHourlyDensity('transport'),
  },
  {
    id: 16,
    nom: 'Gare de Lyon',
    type: 'transport',
    latitude: 48.8449,
    longitude: 2.3735,
    radius: 200,
    description: 'Gare TGV Sud/Est — Metro L1/14, RER A/D',
    hourlyDensity: generateHourlyDensity('transport'),
  },
  {
    id: 17,
    nom: 'Gare Saint-Lazare',
    type: 'transport',
    latitude: 48.8752,
    longitude: 2.3250,
    radius: 220,
    description: 'Gare la plus utilisee de France — Metro L3/12/13/14, RER E, Transilien',
    hourlyDensity: generateHourlyDensity('transport'),
  },
  {
    id: 18,
    nom: 'Gare Montparnasse',
    type: 'transport',
    latitude: 48.8421,
    longitude: 2.3207,
    radius: 200,
    description: 'Gare TGV Sud-Ouest — Metro L4/6/12/13',
    hourlyDensity: generateHourlyDensity('transport'),
  },
  {
    id: 19,
    nom: 'Gare de l Est',
    type: 'transport',
    latitude: 48.8765,
    longitude: 2.3591,
    radius: 180,
    description: 'Gare TGV Est — Metro L4/5/7, RER E',
    hourlyDensity: generateHourlyDensity('transport'),
  },
  {
    id: 20,
    nom: 'Opera — Grands Boulevards',
    type: 'shopping',
    latitude: 48.8719,
    longitude: 2.3316,
    radius: 220,
    description: 'Quartier commercial — Metro L3/7/8/9, Galeries Lafayette, Printemps',
    hourlyDensity: generateHourlyDensity('shopping'),
  },

  // --- Stations RATP strategiques ---
  {
    id: 21,
    nom: 'Nation',
    type: 'transport',
    latitude: 48.8484,
    longitude: 2.3958,
    radius: 180,
    description: 'Carrefour Est parisien — Metro L1/2/6/9, RER A',
    hourlyDensity: generateHourlyDensity('transport'),
  },
  {
    id: 22,
    nom: 'Bastille',
    type: 'residential',
    latitude: 48.8533,
    longitude: 2.3692,
    radius: 200,
    description: 'Quartier anime, vie nocturne — Metro L1/5/8',
    hourlyDensity: generateHourlyDensity('residential'),
  },
  {
    id: 23,
    nom: 'Denfert-Rochereau',
    type: 'transport',
    latitude: 48.8339,
    longitude: 2.3323,
    radius: 180,
    description: 'Carrefour Sud — Metro L4/6, RER B, acces Catacombes',
    hourlyDensity: generateHourlyDensity('transport'),
  },
  {
    id: 24,
    nom: 'Oberkampf — Menilmontant',
    type: 'residential',
    latitude: 48.8640,
    longitude: 2.3790,
    radius: 250,
    description: 'Quartier vivant et mixte — Metro L5/9/11',
    hourlyDensity: generateHourlyDensity('residential'),
  },
  {
    id: 25,
    nom: 'Bibliotheque Francois Mitterrand',
    type: 'business',
    latitude: 48.8302,
    longitude: 2.3767,
    radius: 200,
    description: 'Quartier universitaire — Metro L14, RER C',
    hourlyDensity: generateHourlyDensity('business'),
  },
]

export const getDensityAtHour = (zone, hour) => {
  return zone.hourlyDensity[hour] ?? 50
}

export const getDensityLevel = (value) => {
  if (value < 4) return 'low'
  if (value < 9) return 'medium'
  return 'high'
}

export const DENSITY_COLORS = {
  low:    '#22c55e',
  medium: '#f59e0b',
  high:   '#ef4444',
}

export const DENSITY_LABELS = {
  low:    'Faible',
  medium: 'Moyenne',
  high:   'Forte',
}
