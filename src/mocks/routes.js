/**
 * Trajets sauvegardes de demo
 */
export const mockSavedRoutes = [
  {
    id: 1,
    user_id: 1,
    nom: 'Domicile -> Travail',
    depart: 'Quartier Auteuil',
    arrivee: 'La Defense',
    distance_km: 6.2,
    duree_min: 28,
    densite_max: 'medium',
    cree_le: '2026-04-20T08:30:00Z',
    favori: true,
  },
  {
    id: 2,
    user_id: 1,
    nom: 'Cours -> Maison',
    depart: 'Quartier Latin',
    arrivee: 'Quartier Auteuil',
    distance_km: 5.8,
    duree_min: 32,
    densite_max: 'low',
    cree_le: '2026-04-15T17:15:00Z',
    favori: false,
  },
  {
    id: 3,
    user_id: 1,
    nom: 'Promenade detente',
    depart: 'Bercy Village',
    arrivee: 'Bois de Vincennes',
    distance_km: 3.1,
    duree_min: 18,
    densite_max: 'low',
    cree_le: '2026-04-10T14:00:00Z',
    favori: true,
  },
]

/**
 * Sources de donnees (pour la page Data Souverainete)
 */
export const dataSources = [
  {
    nom: 'Open Data Paris',
    url: 'https://opendata.paris.fr',
    type: 'public',
    fiabilite: 95,
    description: 'Donnees ouvertes officielles de la Mairie de Paris',
    licence: 'ODbL',
  },
  {
    nom: 'API RATP - Trafic temps reel',
    url: 'https://data.ratp.fr',
    type: 'transport',
    fiabilite: 90,
    description: 'Frequentation des stations metro et RER',
    licence: 'ODbL',
  },
  {
    nom: 'Evenements urbains (Que faire a Paris)',
    url: 'https://opendata.paris.fr/explore/dataset/que-faire-a-paris-',
    type: 'events',
    fiabilite: 85,
    description: 'Manifestations, concerts, expositions affectant l affluence',
    licence: 'CC BY 4.0',
  },
  {
    nom: 'INSEE - Donnees demographiques',
    url: 'https://www.insee.fr',
    type: 'demographic',
    fiabilite: 99,
    description: 'Population residente et active par IRIS',
    licence: 'Licence ouverte',
  },
]
