// Simple test database service - no external dependencies
import * as FileSystem from 'expo-file-system/legacy';
import { toISODate, getTodayISO, getNowISO } from '../utils/dateUtils';

// Import data event service for real-time updates
let dataEventService;
try {
  dataEventService = require('./dataEventService').default;
} catch (error) {
  console.warn('⚠️ dataEventService not available, events will not be emitted');
  dataEventService = {
    emitProductChange: () => {},
    emitOrderChange: () => {},
    emitLotChange: () => {},
    emitHerdAnimalChange: () => {},
    emitRaceChange: () => {},
    emitAnimalTypeChange: () => {},
    emitHerdTypeChange: () => {},
    emitEventChange: () => {},
    emitActivityChange: () => {},
    emitMessageChange: () => {},
    emitCheeseChange: () => {},
  };
}

// AsyncStorage for persistence
let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (error) {
  console.warn('AsyncStorage not available, using in-memory storage fallback');
  AsyncStorage = {
    setItem: async (key, value) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      if (!global.__dbStorage) {
        global.__dbStorage = {};
      }
      global.__dbStorage[key] = value;
    },
    getItem: async (key) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (!global.__dbStorage) {
        global.__dbStorage = {};
      }
      return global.__dbStorage[key] || null;
    },
    removeItem: async (key) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      if (global.__dbStorage) {
        delete global.__dbStorage[key];
      }
    }
  };
}

console.log('🔄 Loading simple database service...');

const STORAGE_KEY = 'farmapp_database_storage';
const DEFAULT_DATA_KEY = 'farmapp_has_default_data';

class SimpleTestDatabaseService {
  constructor() {
    console.log('🆕 SimpleTestDatabaseService constructor called');
    this._isInitialized = false;
    this._initPromise = null;
    this.storage = {
      products: [
        { id: 1, name: 'Œufs de consommation', price: 3.50, quantity: 120, category: 'oeufs consommation', description: 'Douzaine d\'œufs frais de poules élevées au sol' },
        { id: 2, name: 'Adoption poussins', price: 8.00, quantity: 15, category: 'adoptions', description: 'Poussins de 3 semaines prêts à l\'adoption' },
        { id: 3, name: 'Fromage de chèvre', price: 12.50, quantity: 8, category: 'fromages', description: 'Fromage artisanal de nos chèvres' },
        { id: 4, name: 'Visite guidée', price: 5.00, quantity: 100, category: 'visites', description: 'Visite de la ferme pédagogique' }
      ],
      orders: [
        // Fresh example orders with current order types and animal types
        {
          id: 1,
          orderType: 'Adoption',
          selectedAnimals: ['poussins'],
          animalDetails: {
            poussins: {
              races: [
                {
                  id: '1_1',
                  race: 'Araucana',
                  ageMonths: 2,
                  ageWeeks: 0,
                  sexPreference: 'female',
                  quantity: 3,
                  selectedLot: {
                    lot_id: 1,
                    lot_name: 'Lot Araucana 1',
                    ageAtDelivery: 2.0
                  }
                }
              ],
              characteristics: [],
              colors: {},
              genders: {}
            }
          },
          ageMonths: 2,
          ageWeeks: 0,
          customerName: 'Marie Dubois',
          customerPhone: '06 12 34 56 78',
          customerEmail: 'marie.dubois@email.com',
          otherDetails: 'Commande pour un élevage familial',
          product: '',
          quantity: 3,
          totalPrice: 45.00,
          deliveryDate: '2025-10-15',
          status: 'Confirmée',
          orderDate: '2025-10-01'
        },
        {
          id: 2,
          orderType: 'Adoption',
          selectedAnimals: ['canards'],
          animalDetails: {
            canards: {
              races: [
                {
                  id: '2_1',
                  race: 'Coureur indien',
                  ageMonths: 1,
                  ageWeeks: 2,
                  sexPreference: 'any',
                  quantity: 2,
                  selectedLot: {
                    lot_id: 2,
                    lot_name: 'Lot Coureur 1',
                    ageAtDelivery: 1.5
                  }
                }
              ],
              characteristics: [],
              colors: {},
              genders: {}
            }
          },
          ageMonths: 1,
          ageWeeks: 2,
          customerName: 'Pierre Martin',
          customerPhone: '06 98 76 54 32',
          customerEmail: 'pierre.martin@email.com',
          otherDetails: 'Pour un étang privé',
          product: '',
          quantity: 2,
          totalPrice: 30.00,
          deliveryDate: '2025-10-20',
          status: 'En attente',
          orderDate: '2025-10-02'
        },
        {
          id: 3,
          orderType: 'Poulets',
          selectedAnimals: [],
          animalDetails: {},
          ageMonths: '',
          ageWeeks: '',
          customerName: 'Sophie Laurent',
          customerPhone: '06 55 44 33 22',
          customerEmail: 'sophie.laurent@email.com',
          otherDetails: 'Commande pour restaurant',
          product: 'Poulets fermiers',
          quantity: 10,
          totalPrice: 150.00,
          deliveryDate: '2025-10-25',
          status: 'Prête',
          orderDate: '2025-10-03'
        },
        {
          id: 4,
          orderType: 'Œufs de conso',
          selectedAnimals: [],
          animalDetails: {},
          ageMonths: '',
          ageWeeks: '',
          customerName: 'Jean Dupont',
          customerPhone: '06 11 22 33 44',
          customerEmail: 'jean.dupont@email.com',
          otherDetails: 'Livraison hebdomadaire',
          product: 'Œufs frais',
          quantity: 30,
          totalPrice: 18.00,
          deliveryDate: '2025-10-12',
          status: 'Livrée',
          orderDate: '2025-10-01'
        },
        { 
          id: 5, 
          customerName: 'Claire Moreau', 
          customerPhone: '+33123456793',
          customerEmail: 'claire.moreau@email.com',
          orderType: 'Adoption',
          animalType: 'poules',
          race: 'Orpington',
          selectedGender: 'Femelles',
          selectedColor: 'Rouge',
          selectedCharacteristics: ['Bonnes couveuses', 'Calmes'],
          ageMonths: '3',
          ageWeeks: '2',
          quantity: 5,
          totalPrice: 75.00,
          deliveryDate: '2025-01-30',
          status: 'Annulée',
          orderDate: '2025-01-11'
        },
        
        // Œufs de consommation orders
        { 
          id: 6, 
          customerName: 'Michel Leroy', 
          customerPhone: '+33123456794',
          customerEmail: 'michel.leroy@email.com',
          orderType: 'Œufs de conso',
          product: 'Œufs de consommation',
          quantity: 60,
          totalPrice: 18.00,
          deliveryDate: '2025-01-18',
          status: 'Confirmée',
          orderDate: '2025-01-14'
        },
        { 
          id: 7, 
          customerName: 'Isabelle Petit', 
          customerPhone: '+33123456795',
          customerEmail: 'isabelle.petit@email.com',
          orderType: 'Œufs de conso',
          product: 'Œufs de consommation',
          quantity: 120,
          totalPrice: 35.00,
          deliveryDate: '2025-01-22',
          status: 'En attente',
          orderDate: '2025-01-16'
        },
        { 
          id: 8, 
          customerName: 'Robert Blanc', 
          customerPhone: '+33123456796',
          customerEmail: 'robert.blanc@email.com',
          orderType: 'Œufs de conso',
          product: 'Œufs de consommation',
          quantity: 30,
          totalPrice: 9.00,
          deliveryDate: '2025-01-19',
          status: 'Prête',
          orderDate: '2025-01-13'
        },
        
        // Fromage orders
        { 
          id: 9, 
          customerName: 'Nathalie Roux', 
          customerPhone: '+33123456797',
          customerEmail: 'nathalie.roux@email.com',
          orderType: 'Fromage',
          product: 'Fromage de chèvre',
          quantity: 3,
          totalPrice: 45.00,
          deliveryDate: '2025-01-21',
          status: 'Confirmée',
          orderDate: '2025-01-15'
        },
        { 
          id: 10, 
          customerName: 'François Durand', 
          customerPhone: '+33123456798',
          customerEmail: 'francois.durand@email.com',
          orderType: 'Fromage',
          product: 'Fromage de chèvre',
          quantity: 1,
          totalPrice: 15.00,
          deliveryDate: '2025-01-23',
          status: 'En attente',
          orderDate: '2025-01-17'
        },
        
        // Visite orders
        { 
          id: 11, 
          customerName: 'École Primaire Saint-Pierre', 
          customerPhone: '+33123456799',
          customerEmail: 'contact@ecole-saint-pierre.fr',
          orderType: 'Visite',
          product: 'Visite guidée',
          quantity: 25,
          totalPrice: 125.00,
          deliveryDate: '2025-01-24',
          status: 'Prête',
          orderDate: '2025-01-09'
        },
        { 
          id: 12, 
          customerName: 'Famille Lambert', 
          customerPhone: '+33123456800',
          customerEmail: 'famille.lambert@email.com',
          orderType: 'Visite',
          product: 'Visite guidée',
          quantity: 4,
          totalPrice: 20.00,
          deliveryDate: '2025-01-26',
          status: 'Livrée',
          orderDate: '2025-01-07'
        },
        
        // Mixed orders with different statuses for testing
        { 
          id: 13, 
          customerName: 'Association Les Amis des Animaux', 
          customerPhone: '+33123456801',
          customerEmail: 'contact@amis-animaux.org',
          orderType: 'Adoption',
          animalType: 'poules',
          race: 'Marans',
          selectedGender: 'Femelles',
          selectedColor: 'Noir cuivré',
          selectedCharacteristics: ['Rustiques', 'Bonnes pondeuses'],
          ageMonths: '2',
          ageWeeks: '4',
          quantity: 8,
          totalPrice: 96.00,
          deliveryDate: '2025-01-28',
          status: 'En attente',
          orderDate: '2025-01-18'
        },
        { 
          id: 14, 
          customerName: 'Restaurant Le Coq Doré', 
          customerPhone: '+33123456802',
          customerEmail: 'commande@coq-dore.fr',
          orderType: 'Œufs de conso',
          product: 'Œufs de consommation',
          quantity: 200,
          totalPrice: 60.00,
          deliveryDate: '2025-01-29',
          status: 'Confirmée',
          orderDate: '2025-01-19'
        },
        { 
          id: 15, 
          customerName: 'Boutique Bio Nature', 
          customerPhone: '+33123456803',
          customerEmail: 'achats@bio-nature.fr',
          orderType: 'Fromage',
          product: 'Fromage de chèvre',
          quantity: 10,
          totalPrice: 150.00,
          deliveryDate: '2025-01-31',
          status: 'Prête',
          orderDate: '2025-01-20'
        }
      ],
      calendar_events: [
        // Only order pickup events will be generated automatically from orders
      ],
      elevage_lots: [
        { 
          id: 1, 
          name: 'Lot Janvier 2025', 
          date_creation: '2025-01-15',
          date_eclosion: '2025-02-05',
          races: {
            'Marans': { 
              initial: 50, 
              current: 45, 
              males: 22, 
              females: 23,
              unsexed: 0, 
              deaths: 5,
              deaths_males: 3,
              deaths_females: 2,
              deaths_unsexed: 0
            },
            'Araucana': { 
              initial: 30, 
              current: 28, 
              males: 14, 
              females: 14,
              unsexed: 0, 
              deaths: 2,
              deaths_males: 1,
              deaths_females: 1,
              deaths_unsexed: 0
            }
          },
          status: 'Actif',
          notes: 'Premier lot de l\'année, bon taux de survie'
        },
        { 
          id: 2, 
          name: 'Lot Février 2025', 
          date_creation: '2025-02-15',
          date_eclosion: '2025-03-07',
          races: {
            'Marans': { 
              initial: 35, 
              current: 32, 
              males: 10, 
              females: 12,
              unsexed: 10, 
              deaths: 3,
              deaths_males: 2,
              deaths_females: 1,
              deaths_unsexed: 0
            },
            'Cream Legbar': { 
              initial: 40, 
              current: 37, 
              males: 18, 
              females: 19,
              unsexed: 0, 
              deaths: 3,
              deaths_males: 1,
              deaths_females: 2,
              deaths_unsexed: 0
            },
            'Pekin': { 
              initial: 25, 
              current: 23, 
              males: 0, 
              females: 0,
              unsexed: 23, 
              deaths: 2,
              deaths_males: 0,
              deaths_females: 0,
              deaths_unsexed: 2
            }
          },
          status: 'Actif',
          notes: 'Lot avec nouvelles races et quelques Marans'
        }
      ],
      elevage_races: [
        { id: 1, name: 'Araucana', type: 'poules', description: 'Poules aux œufs bleus' },
        { id: 2, name: 'Cream Legbar', type: 'poules', description: 'Poules croisées aux œufs bleus' },
        { id: 3, name: 'Leghorn', type: 'poules', description: 'Excellentes pondeuses blanches' },
        { id: 4, name: 'Marans', type: 'poules', description: 'Poules pondeuses aux œufs chocolat' },
        { id: 5, name: 'Vorwerk', type: 'poules', description: 'Poules allemandes robustes' },
        { id: 6, name: 'Orpington', type: 'poules', description: 'Poules anglaises douces' },
        { id: 7, name: 'Brahma', type: 'poules', description: 'Poules géantes asiatiques' },
        { id: 8, name: 'Pékin', type: 'poules', description: 'Poules naines ornementales' },
        { id: 9, name: 'Soie', type: 'poules', description: 'Poules soyeuses ornementales' },
        { id: 10, name: 'Coureur indien', type: 'canards', description: 'Canards excellents coureurs' },
        { id: 11, name: 'Cayuga', type: 'canards', description: 'Canards aux reflets verts' },
        { id: 12, name: 'Barbarie', type: 'canards', description: 'Canards de chair' },
        { id: 13, name: 'Japonaise', type: 'cailles', description: 'Cailles japonaises pondeuses' }
      ],
      elevage_historique: [
        {
          id: 1,
          lot_id: 1,
          date: '2025-01-20',
          type: 'Mort',
          description: 'Mort de 2 Marans - cause naturelle',
          race: 'Marans',
          quantity: -2
        },
        {
          id: 2,
          lot_id: 1,
          date: '2025-01-25',
          type: 'Sexage',
          description: 'Identification des sexes pour les Araucana',
          race: 'Araucana',
          quantity: 0
        }
      ],
      elevage_incubations: [
        // Example incubation data
        {
          id: 1,
          lot_id: 1,
          race: 'Marans',
          eggs_count: 50,
          fertilized_count: 42,
          hatched_count: 38,
          incubation_start_date: '2025-01-15',
          fertilization_check_date: '2025-01-22',
          hatching_date: '2025-02-05',
          notes: 'Première incubation de l\'année - excellents résultats'
        },
        {
          id: 2,
          lot_id: 1,
          race: 'Araucana',
          eggs_count: 30,
          fertilized_count: 25,
          hatched_count: 22,
          incubation_start_date: '2025-01-15',
          fertilization_check_date: '2025-01-22',
          hatching_date: '2025-02-05',
          notes: 'Bons résultats pour les Araucana'
        }
      ],
      lot_notes: {},
      caprin_settings: {
        milkRecordingMethod: 'individual', // 'individual' or 'group'
        groupMilkProduction: [] // For group recording: [{ date, total, notes }]
      },
      // Unified herd management - supports multiple herd types
      herd_types: ['caprin', 'ovin', 'bovin', 'équin', 'porcin'], // Available herd types
      elevage_animal_types: ['poussins', 'cailles', 'canards', 'oies', 'paons', 'dindes', 'lapins'], // Available animal types for elevage
      herd_settings: {
        caprin: {
          groups: [],
          milkRecordingMethod: 'group',
          groupMilkProduction: []
        },
        ovin: {
          groups: [],
          milkRecordingMethod: 'group',
          groupMilkProduction: []
        },
        bovin: {
          groups: [],
          milkRecordingMethod: 'group',
          groupMilkProduction: []
        },
        équin: {
          groups: [],
          milkRecordingMethod: 'group',
          groupMilkProduction: []
        },
        porcin: {
          groups: [],
          milkRecordingMethod: 'group',
          groupMilkProduction: []
        }
      },
      herd_animals: {
        // Caprin (goats/sheep) - existing data
        caprin: [
        {
          id: 1,
          name: 'Canelle',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2022-09-24',
          entryDate: '2022-09-24',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH001',
          earTagNumber: '00294',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Très productive',
          milkProduction: [
            { date: '2025-01-15', morning: 2.5, evening: 2.8, total: 5.3, notes: '' },
            { date: '2025-01-14', morning: 2.3, evening: 2.6, total: 4.9, notes: '' },
            { date: '2025-01-13', morning: 2.7, evening: 2.9, total: 5.6, notes: 'Excellente production' },
            { date: '2025-01-12', morning: 2.4, evening: 2.5, total: 4.9, notes: '' }
          ],
          offspring: ['Amaretto', 'Saffron'],
          parents: { mother: '', father: '' }
        },
        {
          id: 2,
          name: 'Vanille',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2022-09-24',
          entryDate: '2022-09-24',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH002',
          earTagNumber: '00295',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Mère expérimentée',
          milkProduction: [
            { date: '2025-01-15', morning: 3.2, evening: 3.5, total: 6.7, notes: '' },
            { date: '2025-01-14', morning: 3.0, evening: 3.3, total: 6.3, notes: '' },
            { date: '2025-01-13', morning: 3.4, evening: 3.6, total: 7.0, notes: 'Production stable' },
            { date: '2025-01-12', morning: 3.1, evening: 3.2, total: 6.3, notes: '' }
          ],
          offspring: ['Cardamone', 'Curcuma'],
          parents: { mother: '', father: '' }
        },
        {
          id: 3,
          name: 'Pistache',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2022-02-05',
          entryDate: '2022-02-05',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH003',
          earTagNumber: '00296',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Bonne productrice',
          milkProduction: [
            { date: '2025-01-15', morning: 2.8, evening: 3.0, total: 5.8, notes: '' },
            { date: '2025-01-14', morning: 2.6, evening: 2.8, total: 5.4, notes: '' },
            { date: '2025-01-13', morning: 2.9, evening: 3.1, total: 6.0, notes: 'Production stable' },
            { date: '2025-01-12', morning: 2.7, evening: 2.9, total: 5.6, notes: '' }
          ],
          offspring: ['Chia', 'Tonka'],
          parents: { mother: '', father: '' }
        },
        {
          id: 4,
          name: 'Amande',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2022-02-04',
          entryDate: '2022-02-04',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH004',
          earTagNumber: '00297',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Très calme',
          milkProduction: [
            { date: '2025-01-15', morning: 2.2, evening: 2.4, total: 4.6, notes: '' },
            { date: '2025-01-14', morning: 2.0, evening: 2.2, total: 4.2, notes: '' },
            { date: '2025-01-13', morning: 2.3, evening: 2.5, total: 4.8, notes: 'Production régulière' },
            { date: '2025-01-12', morning: 2.1, evening: 2.3, total: 4.4, notes: '' }
          ],
          offspring: ['Cora', 'Bourbon'],
          parents: { mother: '', father: '' }
        },
        {
          id: 5,
          name: 'Kinder',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2022-02-04',
          entryDate: '2022-02-04',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH005',
          earTagNumber: '00298',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Jeune et énergique',
          milkProduction: [
            { date: '2025-01-15', morning: 2.0, evening: 2.2, total: 4.2, notes: '' },
            { date: '2025-01-14', morning: 1.9, evening: 2.1, total: 4.0, notes: '' },
            { date: '2025-01-13', morning: 2.1, evening: 2.3, total: 4.4, notes: 'En progression' },
            { date: '2025-01-12', morning: 1.8, evening: 2.0, total: 3.8, notes: '' }
          ],
          offspring: ['Citronnelle', 'Juzou'],
          parents: { mother: '', father: '' }
        },
        {
          id: 6,
          name: 'Anis',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2022-03-25',
          entryDate: '2022-03-25',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH006',
          earTagNumber: '00299',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Parfumée et douce',
          milkProduction: [
            { date: '2025-01-15', morning: 2.6, evening: 2.8, total: 5.4, notes: '' },
            { date: '2025-01-14', morning: 2.4, evening: 2.6, total: 5.0, notes: '' },
            { date: '2025-01-13', morning: 2.7, evening: 2.9, total: 5.6, notes: 'Bonne production' },
            { date: '2025-01-12', morning: 2.5, evening: 2.7, total: 5.2, notes: '' }
          ],
          offspring: ['Cayenne', 'Fénugrec'],
          parents: { mother: '', father: '' }
        },
        {
          id: 7,
          name: 'Bounty',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2022-03-25',
          entryDate: '2022-03-25',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH007',
          earTagNumber: '00300',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Couleur chocolat',
          milkProduction: [
            { date: '2025-01-15', morning: 2.4, evening: 2.6, total: 5.0, notes: '' },
            { date: '2025-01-14', morning: 2.2, evening: 2.4, total: 4.6, notes: '' },
            { date: '2025-01-13', morning: 2.5, evening: 2.7, total: 5.2, notes: 'Production stable' },
            { date: '2025-01-12', morning: 2.3, evening: 2.5, total: 4.8, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 8,
          name: 'Marguerite',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2022-06-01',
          entryDate: '2022-06-01',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH008',
          earTagNumber: '00301',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fleur de printemps',
          milkProduction: [
            { date: '2025-01-15', morning: 2.9, evening: 3.1, total: 6.0, notes: '' },
            { date: '2025-01-14', morning: 2.7, evening: 2.9, total: 5.6, notes: '' },
            { date: '2025-01-13', morning: 3.0, evening: 3.2, total: 6.2, notes: 'Excellente production' },
            { date: '2025-01-12', morning: 2.8, evening: 3.0, total: 5.8, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 9,
          name: 'Muscade',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2023-03-20',
          entryDate: '2023-03-20',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH009',
          earTagNumber: '00302',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Épice douce',
          milkProduction: [
            { date: '2025-01-15', morning: 2.1, evening: 2.3, total: 4.4, notes: '' },
            { date: '2025-01-14', morning: 2.0, evening: 2.2, total: 4.2, notes: '' },
            { date: '2025-01-13', morning: 2.2, evening: 2.4, total: 4.6, notes: 'Jeune femelle' },
            { date: '2025-01-12', morning: 1.9, evening: 2.1, total: 4.0, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 10,
          name: 'Cajou',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2023-03-07',
          entryDate: '2023-03-07',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH010',
          earTagNumber: '00303',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Noix tropicale',
          milkProduction: [
            { date: '2025-01-15', morning: 2.3, evening: 2.5, total: 4.8, notes: '' },
            { date: '2025-01-14', morning: 2.1, evening: 2.3, total: 4.4, notes: '' },
            { date: '2025-01-13', morning: 2.4, evening: 2.6, total: 5.0, notes: 'Production en hausse' },
            { date: '2025-01-12', morning: 2.2, evening: 2.4, total: 4.6, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 11,
          name: 'Pécan',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2023-03-17',
          entryDate: '2023-03-17',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH011',
          earTagNumber: '00304',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Noix américaine',
          milkProduction: [
            { date: '2025-01-15', morning: 2.0, evening: 2.2, total: 4.2, notes: '' },
            { date: '2025-01-14', morning: 1.9, evening: 2.1, total: 4.0, notes: '' },
            { date: '2025-01-13', morning: 2.1, evening: 2.3, total: 4.4, notes: 'Production stable' },
            { date: '2025-01-12', morning: 1.8, evening: 2.0, total: 3.8, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 12,
          name: 'Pili',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2023-04-01',
          entryDate: '2023-04-01',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH012',
          earTagNumber: '00305',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Noix des Philippines',
          milkProduction: [
            { date: '2025-01-15', morning: 2.2, evening: 2.4, total: 4.6, notes: '' },
            { date: '2025-01-14', morning: 2.0, evening: 2.2, total: 4.2, notes: '' },
            { date: '2025-01-13', morning: 2.3, evening: 2.5, total: 4.8, notes: 'Bonne production' },
            { date: '2025-01-12', morning: 2.1, evening: 2.3, total: 4.4, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 13,
          name: 'Coco',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2023-03-03',
          entryDate: '2023-03-03',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH013',
          earTagNumber: '00306',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Tropicale et douce',
          milkProduction: [
            { date: '2025-01-15', morning: 2.5, evening: 2.7, total: 5.2, notes: '' },
            { date: '2025-01-14', morning: 2.3, evening: 2.5, total: 4.8, notes: '' },
            { date: '2025-01-13', morning: 2.6, evening: 2.8, total: 5.4, notes: 'Production excellente' },
            { date: '2025-01-12', morning: 2.4, evening: 2.6, total: 5.0, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 14,
          name: 'Marley',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2024-02-18',
          entryDate: '2024-02-18',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH014',
          earTagNumber: '00307',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Reggae et détendue',
          milkProduction: [
            { date: '2025-01-15', morning: 1.8, evening: 2.0, total: 3.8, notes: 'Première lactation' },
            { date: '2025-01-14', morning: 1.6, evening: 1.8, total: 3.4, notes: '' },
            { date: '2025-01-13', morning: 1.9, evening: 2.1, total: 4.0, notes: 'En progression' },
            { date: '2025-01-12', morning: 1.7, evening: 1.9, total: 3.6, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 15,
          name: 'Praline',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2024-02-21',
          entryDate: '2024-02-21',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH015',
          earTagNumber: '00308',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Délicieuse et sucrée',
          milkProduction: [
            { date: '2025-01-15', morning: 1.9, evening: 2.1, total: 4.0, notes: 'Première lactation' },
            { date: '2025-01-14', morning: 1.7, evening: 1.9, total: 3.6, notes: '' },
            { date: '2025-01-13', morning: 2.0, evening: 2.2, total: 4.2, notes: 'Bonne progression' },
            { date: '2025-01-12', morning: 1.8, evening: 2.0, total: 3.8, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 16,
          name: 'Nougatine',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2024-02-21',
          entryDate: '2024-02-21',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH016',
          earTagNumber: '00309',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Sœur de Praline',
          milkProduction: [
            { date: '2025-01-15', morning: 1.7, evening: 1.9, total: 3.6, notes: 'Première lactation' },
            { date: '2025-01-14', morning: 1.5, evening: 1.7, total: 3.2, notes: '' },
            { date: '2025-01-13', morning: 1.8, evening: 2.0, total: 3.8, notes: 'En développement' },
            { date: '2025-01-12', morning: 1.6, evening: 1.8, total: 3.4, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 17,
          name: 'Oreo',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2024-02-25',
          entryDate: '2024-02-25',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH017',
          earTagNumber: '00310',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Noir et blanc',
          milkProduction: [
            { date: '2025-01-15', morning: 1.6, evening: 1.8, total: 3.4, notes: 'Première lactation' },
            { date: '2025-01-14', morning: 1.4, evening: 1.6, total: 3.0, notes: '' },
            { date: '2025-01-13', morning: 1.7, evening: 1.9, total: 3.6, notes: 'Production en hausse' },
            { date: '2025-01-12', morning: 1.5, evening: 1.7, total: 3.2, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 18,
          name: 'Méringue',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2024-02-25',
          entryDate: '2024-02-25',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH018',
          earTagNumber: '00311',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Légère et aérée',
          milkProduction: [
            { date: '2025-01-15', morning: 1.8, evening: 2.0, total: 3.8, notes: 'Première lactation' },
            { date: '2025-01-14', morning: 1.6, evening: 1.8, total: 3.4, notes: '' },
            { date: '2025-01-13', morning: 1.9, evening: 2.1, total: 4.0, notes: 'Bonne progression' },
            { date: '2025-01-12', morning: 1.7, evening: 1.9, total: 3.6, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 19,
          name: 'Cacao',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2024-02-27',
          entryDate: '2024-02-27',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH019',
          earTagNumber: '00312',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Chocolat pur',
          milkProduction: [
            { date: '2025-01-15', morning: 1.7, evening: 1.9, total: 3.6, notes: 'Première lactation' },
            { date: '2025-01-14', morning: 1.5, evening: 1.7, total: 3.2, notes: '' },
            { date: '2025-01-13', morning: 1.8, evening: 2.0, total: 3.8, notes: 'Production stable' },
            { date: '2025-01-12', morning: 1.6, evening: 1.8, total: 3.4, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 20,
          name: 'Crème',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2024-02-27',
          entryDate: '2024-02-27',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH020',
          earTagNumber: '00313',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Douce et onctueuse',
          milkProduction: [
            { date: '2025-01-15', morning: 1.9, evening: 2.1, total: 4.0, notes: 'Première lactation' },
            { date: '2025-01-14', morning: 1.7, evening: 1.9, total: 3.6, notes: '' },
            { date: '2025-01-13', morning: 2.0, evening: 2.2, total: 4.2, notes: 'Excellente progression' },
            { date: '2025-01-12', morning: 1.8, evening: 2.0, total: 3.8, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 21,
          name: 'Biscotte',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2024-02-29',
          entryDate: '2024-02-29',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH021',
          earTagNumber: '00314',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Croustillante',
          milkProduction: [
            { date: '2025-01-15', morning: 1.6, evening: 1.8, total: 3.4, notes: 'Première lactation' },
            { date: '2025-01-14', morning: 1.4, evening: 1.6, total: 3.0, notes: '' },
            { date: '2025-01-13', morning: 1.7, evening: 1.9, total: 3.6, notes: 'En développement' },
            { date: '2025-01-12', morning: 1.5, evening: 1.7, total: 3.2, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 22,
          name: 'Chacotte',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2024-02-29',
          entryDate: '2024-02-29',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH022',
          earTagNumber: '00315',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Sœur de Biscotte',
          milkProduction: [
            { date: '2025-01-15', morning: 1.8, evening: 2.0, total: 3.8, notes: 'Première lactation' },
            { date: '2025-01-14', morning: 1.6, evening: 1.8, total: 3.4, notes: '' },
            { date: '2025-01-13', morning: 1.9, evening: 2.1, total: 4.0, notes: 'Bonne progression' },
            { date: '2025-01-12', morning: 1.7, evening: 1.9, total: 3.6, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 23,
          name: 'Cookies',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2024-03-01',
          entryDate: '2024-03-01',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH023',
          earTagNumber: '00316',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Délicieuse et croquante',
          milkProduction: [
            { date: '2025-01-15', morning: 1.7, evening: 1.9, total: 3.6, notes: 'Première lactation' },
            { date: '2025-01-14', morning: 1.5, evening: 1.7, total: 3.2, notes: '' },
            { date: '2025-01-13', morning: 1.8, evening: 2.0, total: 3.8, notes: 'Production en hausse' },
            { date: '2025-01-12', morning: 1.6, evening: 1.8, total: 3.4, notes: '' }
          ],
          offspring: [],
          parents: { mother: '', father: '' }
        },
        {
          id: 24,
          name: 'Amaretto',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2025-02-27',
          entryDate: '2025-02-27',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH024',
          earTagNumber: '00317',
          buyerSellerName: '',
          mother: 'Canelle',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Canelle - Liqueur italienne',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Canelle', father: '' }
        },
        {
          id: 25,
          name: 'Saffron',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2025-02-28',
          entryDate: '2025-02-28',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH025',
          earTagNumber: '00318',
          buyerSellerName: '',
          mother: 'Canelle',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Canelle - Épice dorée',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Canelle', father: '' }
        },
        {
          id: 26,
          name: 'Cardamone',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2025-02-28',
          entryDate: '2025-02-28',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH026',
          earTagNumber: '00319',
          buyerSellerName: '',
          mother: 'Vanille',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Vanille - Épice parfumée',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Vanille', father: '' }
        },
        {
          id: 27,
          name: 'Curcuma',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2025-03-01',
          entryDate: '2025-03-01',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH027',
          earTagNumber: '00320',
          buyerSellerName: '',
          mother: 'Vanille',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Vanille - Épice dorée',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Vanille', father: '' }
        },
        {
          id: 28,
          name: 'Chia',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2025-03-01',
          entryDate: '2025-03-01',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH028',
          earTagNumber: '00321',
          buyerSellerName: '',
          mother: 'Pistache',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Pistache - Graine nutritive',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Pistache', father: '' }
        },
        {
          id: 29,
          name: 'Tonka',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2025-03-02',
          entryDate: '2025-03-02',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH029',
          earTagNumber: '00322',
          buyerSellerName: '',
          mother: 'Pistache',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Pistache - Haricot parfumé',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Pistache', father: '' }
        },
        {
          id: 30,
          name: 'Cora',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2025-03-02',
          entryDate: '2025-03-02',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH030',
          earTagNumber: '00323',
          buyerSellerName: '',
          mother: 'Amande',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille d\'Amande - Cœur de fruit',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Amande', father: '' }
        },
        {
          id: 31,
          name: 'Bourbon',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2025-03-03',
          entryDate: '2025-03-03',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH031',
          earTagNumber: '00324',
          buyerSellerName: '',
          mother: 'Amande',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille d\'Amande - Whisky américain',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Amande', father: '' }
        },
        {
          id: 32,
          name: 'Citronnelle',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2025-03-06',
          entryDate: '2025-03-06',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH032',
          earTagNumber: '00325',
          buyerSellerName: '',
          mother: 'Kinder',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Kinder - Herbe citronnée',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Kinder', father: '' }
        },
        {
          id: 33,
          name: 'Juzou',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2025-03-06',
          entryDate: '2025-03-06',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH033',
          earTagNumber: '00326',
          buyerSellerName: '',
          mother: 'Kinder',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Kinder - Nom unique',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Kinder', father: '' }
        },
        {
          id: 34,
          name: 'Cayenne',
          species: 'chèvre',
          breed: 'Alpine',
          birthDate: '2025-03-06',
          entryDate: '2025-03-06',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH034',
          earTagNumber: '00327',
          buyerSellerName: '',
          mother: 'Anis',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille d\'Anis - Piment fort',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Anis', father: '' }
        },
        {
          id: 35,
          name: 'Fénugrec',
          species: 'chèvre',
          breed: 'Saanen',
          birthDate: '2025-03-06',
          entryDate: '2025-03-06',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'CH035',
          earTagNumber: '00328',
          buyerSellerName: '',
          mother: 'Anis',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille d\'Anis - Graine médicinale',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Anis', father: '' }
        }
      ],
      // Ovin (sheep) - 3 examples
      ovin: [
        {
          id: 1001,
          name: 'Bélier',
          species: 'brebis',
          breed: 'Mérinos',
          birthDate: '2021-05-15',
          entryDate: '2021-05-15',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'OV001',
          earTagNumber: '01001',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'mâle',
          status: 'vivant',
          notes: 'Bélier reproducteur principal',
          milkProduction: [],
          offspring: ['Laine', 'Touffe'],
          parents: { mother: '', father: '' }
        },
        {
          id: 1002,
          name: 'Laine',
          species: 'brebis',
          breed: 'Mérinos',
          birthDate: '2023-03-20',
          entryDate: '2023-03-20',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'OV002',
          earTagNumber: '01002',
          buyerSellerName: '',
          mother: 'Bélier',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Bélier - Excellente productrice de laine',
          milkProduction: [
            { date: '2025-01-15', morning: 1.2, evening: 1.3, total: 2.5, notes: '' },
            { date: '2025-01-14', morning: 1.1, evening: 1.2, total: 2.3, notes: '' }
          ],
          offspring: [],
          parents: { mother: 'Bélier', father: '' }
        },
        {
          id: 1003,
          name: 'Touffe',
          species: 'brebis',
          breed: 'Texel',
          birthDate: '2023-04-10',
          entryDate: '2023-04-10',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'OV003',
          earTagNumber: '01003',
          buyerSellerName: '',
          mother: 'Bélier',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Bélier - Race Texel',
          milkProduction: [
            { date: '2025-01-15', morning: 1.0, evening: 1.1, total: 2.1, notes: '' }
          ],
          offspring: [],
          parents: { mother: 'Bélier', father: '' }
        }
      ],
      // Bovin (cattle) - 3 examples
      bovin: [
        {
          id: 2001,
          name: 'Belle',
          species: 'vache',
          breed: 'Holstein',
          birthDate: '2019-08-12',
          entryDate: '2019-08-12',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'BO001',
          earTagNumber: '02001',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Vache laitière principale',
          milkProduction: [
            { date: '2025-01-15', morning: 12.5, evening: 13.2, total: 25.7, notes: 'Excellente production' },
            { date: '2025-01-14', morning: 12.0, evening: 12.8, total: 24.8, notes: '' }
          ],
          offspring: ['Veau', 'Tache'],
          parents: { mother: '', father: '' }
        },
        {
          id: 2002,
          name: 'Veau',
          species: 'taureau',
          breed: 'Charolais',
          birthDate: '2024-02-15',
          entryDate: '2024-02-15',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'BO002',
          earTagNumber: '02002',
          buyerSellerName: '',
          mother: 'Belle',
          father: '',
          gender: 'mâle',
          status: 'vivant',
          notes: 'Fils de Belle - Taureau reproducteur',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Belle', father: '' }
        },
        {
          id: 2003,
          name: 'Tache',
          species: 'vache',
          breed: 'Holstein',
          birthDate: '2024-03-20',
          entryDate: '2024-03-20',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'BO003',
          earTagNumber: '02003',
          buyerSellerName: '',
          mother: 'Belle',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Belle - Jeune vache',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Belle', father: '' }
        }
      ],
      // Équin (horses) - 3 examples
      équin: [
        {
          id: 3001,
          name: 'Étoile',
          species: 'jument',
          breed: 'Pur-sang arabe',
          birthDate: '2018-06-10',
          entryDate: '2018-06-10',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'EQ001',
          earTagNumber: '03001',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Jument de race arabe',
          milkProduction: [],
          offspring: ['Galop', 'Crinière'],
          parents: { mother: '', father: '' }
        },
        {
          id: 3002,
          name: 'Galop',
          species: 'étalon',
          breed: 'Pur-sang arabe',
          birthDate: '2022-05-15',
          entryDate: '2022-05-15',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'EQ002',
          earTagNumber: '03002',
          buyerSellerName: '',
          mother: 'Étoile',
          father: '',
          gender: 'mâle',
          status: 'vivant',
          notes: 'Fils d\'Étoile - Étalon prometteur',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Étoile', father: '' }
        },
        {
          id: 3003,
          name: 'Crinière',
          species: 'jument',
          breed: 'Selle français',
          birthDate: '2022-07-20',
          entryDate: '2022-07-20',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'EQ003',
          earTagNumber: '03003',
          buyerSellerName: '',
          mother: 'Étoile',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille d\'Étoile - Jument de selle',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Étoile', father: '' }
        }
      ],
      // Porcin (pigs) - 3 examples
      porcin: [
        {
          id: 4001,
          name: 'Groin',
          species: 'truie',
          breed: 'Large White',
          birthDate: '2020-09-10',
          entryDate: '2020-09-10',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'PO001',
          earTagNumber: '04001',
          buyerSellerName: '',
          mother: '',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Truie reproductrice principale',
          milkProduction: [],
          offspring: ['Cochonnet', 'Rosette'],
          parents: { mother: '', father: '' }
        },
        {
          id: 4002,
          name: 'Cochonnet',
          species: 'porc',
          breed: 'Large White',
          birthDate: '2024-01-15',
          entryDate: '2024-01-15',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'PO002',
          earTagNumber: '04002',
          buyerSellerName: '',
          mother: 'Groin',
          father: '',
          gender: 'mâle',
          status: 'vivant',
          notes: 'Fils de Groin - Porc en croissance',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Groin', father: '' }
        },
        {
          id: 4003,
          name: 'Rosette',
          species: 'truie',
          breed: 'Pietrain',
          birthDate: '2024-02-20',
          entryDate: '2024-02-20',
          exitDate: null,
          entryCause: 'naissance',
          exitCause: null,
          herdNumber: 'PO003',
          earTagNumber: '04003',
          buyerSellerName: '',
          mother: 'Groin',
          father: '',
          gender: 'femelle',
          status: 'vivant',
          notes: 'Fille de Groin - Race Pietrain',
          milkProduction: [],
          offspring: [],
          parents: { mother: 'Groin', father: '' }
        }
      ]
    },
      egg_production: {}, // { date: { animalType: count } }
      egg_animal_types: [
        { key: 'poules', label: 'Poules', icon: '🐔' },
        { key: 'canards', label: 'Canards', icon: '🦆' },
        { key: 'oies', label: 'Oies', icon: '🪿' },
        { key: 'dindes', label: 'Dindes', icon: '🦃' },
        { key: 'paons', label: 'Paons', icon: '🦚' }
      ],
      template_messages: [
        {
          id: 1,
          title: 'Confirmation Adoption Poussin',
          category: 'Adoption',
          content: 'Bonjour {nom},\n\nVotre adoption de {quantite} poussins de race {race} est confirmée pour le {date}.\n\nMerci de votre confiance !\n\nCordialement,\nL\'équipe de la ferme'
        },
        {
          id: 2,
          title: 'Rappel Visite Guidée',
          category: 'Activité',
          content: 'Bonjour {nom},\n\nNous vous rappelons votre visite guidée prévue le {date} à {heure}.\n\nAu plaisir de vous accueillir !\n\nCordialement,\nL\'équipe de la ferme'
        },
        {
          id: 3,
          title: 'Confirmation Commande',
          category: 'Commande',
          content: 'Bonjour {nom},\n\nNous vous confirmons votre commande du {date}.\n\nDétails de la commande :\n- Produit : {produit}\n- Quantité : {quantite}\n- Montant total : {prix}\n\nVotre commande sera prête pour le {date}.\n\nMerci de votre confiance !\n\nCordialement,\nL\'équipe de la ferme'
        },
        {
          id: 4,
          title: 'Commande Prête',
          category: 'Commande',
          content: 'Bonjour {nom},\n\nVotre commande est prête !\n\nVous pouvez venir récupérer votre commande dès maintenant.\n\nDétails :\n- Produit : {produit}\n- Quantité : {quantite}\n- Montant : {prix}\n\nAu plaisir de vous accueillir !\n\nCordialement,\nL\'équipe de la ferme'
        },
        {
          id: 5,
          title: 'Rappel Commande',
          category: 'Commande',
          content: 'Bonjour {nom},\n\nNous vous rappelons que votre commande du {date} est en préparation.\n\nDétails :\n- Produit : {produit}\n- Quantité : {quantite}\n- Montant : {prix}\n\nNous vous tiendrons informé dès qu\'elle sera prête.\n\nCordialement,\nL\'équipe de la ferme'
        },
        {
          id: 6,
          title: 'Annulation Commande',
          category: 'Commande',
          content: 'Bonjour {nom},\n\nNous vous informons que votre commande du {date} a été annulée.\n\nN\'hésitez pas à nous recontacter pour toute question.\n\nCordialement,\nL\'équipe de la ferme'
        },
        {
          id: 7,
          title: 'Commande Livrée',
          category: 'Commande',
          content: 'Bonjour {nom},\n\nVotre commande a été livrée avec succès !\n\nDétails :\n- Produit : {produit}\n- Quantité : {quantite}\n- Montant : {prix}\n\nNous espérons que vous serez satisfait de votre achat.\n\nMerci de votre confiance !\n\nCordialement,\nL\'équipe de la ferme'
        }
      ]
    };
    console.log('✅ Simple storage initialized with test data');
    
    // Initialize data loading
    this._initPromise = this.initializeData();
  }

  // Wait for initialization to complete
  async waitForInitialization() {
    if (this._isInitialized) {
      return;
    }
    if (this._initPromise) {
      await this._initPromise;
    }
  }

  // Initialize data from persistent storage
  async initializeData() {
    try {
      console.log('📂 Loading data from persistent storage...');
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('✅ Found saved data, loading...');
        console.log(`📊 Orders in saved data: ${parsedData.orders ? parsedData.orders.length : 'undefined'} orders`);
        
        // Store default orders before overwriting
        const defaultOrders = [...this.storage.orders];
        
        // Replace storage with saved data, but ensure all required keys exist with defaults if missing
        this.storage = {
          // Use saved data as primary source - IMPORTANT: Use empty array if orders is explicitly set to empty array
          products: parsedData.products !== undefined ? parsedData.products : this.storage.products,
          // Always use saved orders if they exist (even if empty array), only fallback to defaults if truly undefined
          orders: Array.isArray(parsedData.orders) ? parsedData.orders : (parsedData.orders !== undefined ? parsedData.orders : defaultOrders),
          calendar_events: parsedData.calendar_events !== undefined ? parsedData.calendar_events : this.storage.calendar_events,
          elevage_lots: parsedData.elevage_lots !== undefined ? parsedData.elevage_lots : this.storage.elevage_lots,
          elevage_races: parsedData.elevage_races !== undefined ? parsedData.elevage_races : this.storage.elevage_races,
          elevage_historique: parsedData.elevage_historique !== undefined ? parsedData.elevage_historique : this.storage.elevage_historique,
          elevage_incubations: parsedData.elevage_incubations !== undefined ? parsedData.elevage_incubations : this.storage.elevage_incubations,
          lot_notes: parsedData.lot_notes !== undefined ? parsedData.lot_notes : this.storage.lot_notes,
          caprin_animals: parsedData.caprin_animals !== undefined ? parsedData.caprin_animals : this.storage.caprin_animals,
          caprin_settings: parsedData.caprin_settings !== undefined ? parsedData.caprin_settings : this.storage.caprin_settings,
          herd_types: parsedData.herd_types !== undefined ? parsedData.herd_types : this.storage.herd_types,
          elevage_animal_types: parsedData.elevage_animal_types !== undefined ? parsedData.elevage_animal_types : this.storage.elevage_animal_types,
          herd_animals: parsedData.herd_animals !== undefined ? parsedData.herd_animals : this.storage.herd_animals,
          herd_settings: parsedData.herd_settings !== undefined ? parsedData.herd_settings : this.storage.herd_settings,
          saved_formulas: parsedData.saved_formulas !== undefined ? parsedData.saved_formulas : this.storage.saved_formulas,
          order_pricing: parsedData.order_pricing !== undefined ? parsedData.order_pricing : this.storage.order_pricing,
          egg_production: parsedData.egg_production !== undefined ? parsedData.egg_production : (this.storage.egg_production || {}),
          egg_animal_types: parsedData.egg_animal_types !== undefined ? parsedData.egg_animal_types : (this.storage.egg_animal_types || [
            { key: 'poules', label: 'Poules', icon: '🐔' },
            { key: 'canards', label: 'Canards', icon: '🦆' },
            { key: 'oies', label: 'Oies', icon: '🪿' },
            { key: 'dindes', label: 'Dindes', icon: '🦃' },
            { key: 'paons', label: 'Paons', icon: '🦚' }
          ]),
          template_messages: parsedData.template_messages !== undefined ? parsedData.template_messages : this.storage.template_messages,
          pricing_grids: parsedData.pricing_grids !== undefined ? parsedData.pricing_grids : this.storage.pricing_grids,
          cheese_productions: parsedData.cheese_productions !== undefined ? parsedData.cheese_productions : (this.storage.cheese_productions || []),
          cheese_recipes: parsedData.cheese_recipes !== undefined ? parsedData.cheese_recipes : (this.storage.cheese_recipes || []),
          cheese_settings: parsedData.cheese_settings !== undefined ? parsedData.cheese_settings : (this.storage.cheese_settings || {})
        };
        
        // Migrate old caprin_animals to herd_animals.caprin if needed
        if (this.storage.caprin_animals && this.storage.caprin_animals.length > 0) {
          if (!this.storage.herd_animals) {
            this.storage.herd_animals = {};
          }
          if (!this.storage.herd_animals.caprin || this.storage.herd_animals.caprin.length === 0) {
            console.log('🔄 Migrating caprin_animals to herd_animals.caprin');
            this.storage.herd_animals.caprin = [...this.storage.caprin_animals];
          }
        }
        
        // Initialize herd_settings if missing
        if (!this.storage.herd_settings) {
          this.storage.herd_settings = {};
        }
        // Ensure each herd type has settings initialized
        const herdTypes = this.storage.herd_types || ['caprin', 'ovin', 'bovin', 'équin', 'porcin'];
        herdTypes.forEach(herdType => {
          if (!this.storage.herd_settings[herdType]) {
            this.storage.herd_settings[herdType] = {
              groups: [],
              milkRecordingMethod: 'group',
              groupMilkProduction: []
            };
          }
        });
        
        console.log(`✅ Data loaded from persistent storage - ${this.storage.orders.length} orders loaded`);
      } else {
        console.log('📝 No saved data found, using default data');
        // Save default data only once
        const hasDefaultData = await AsyncStorage.getItem(DEFAULT_DATA_KEY);
        if (!hasDefaultData) {
          await this.saveToStorage();
          await AsyncStorage.setItem(DEFAULT_DATA_KEY, 'true');
        }
      }
      this._isInitialized = true;
      console.log('✅ Database initialization complete');
    } catch (error) {
      console.error('❌ Error loading data from storage:', error);
      console.error('Error details:', error.message, error.stack);
      // Continue with default data if loading fails
      this._isInitialized = true;
    }
  }

  // Save data to persistent storage
  async saveToStorage() {
    try {
      const dataToSave = JSON.stringify(this.storage);
      await AsyncStorage.setItem(STORAGE_KEY, dataToSave);
      console.log(`💾 Data saved to persistent storage - ${this.storage.orders.length} orders saved`);
    } catch (error) {
      console.error('❌ Error saving data to storage:', error);
      console.error('Error details:', error.message, error.stack);
      // Don't throw - allow app to continue, but log the error
    }
  }

  // Products CRUD
  async addProduct(product) {
    console.log('➕ addProduct called');
    const newProduct = { id: Date.now(), ...product };
    this.storage.products.push(newProduct);
    await this.saveToStorage();
    dataEventService.emitProductChange(newProduct);
    return { insertId: newProduct.id };
  }

  async getProducts() {
    await this.waitForInitialization();
    console.log('📋 getProducts called - returning test data');
    return this.storage.products;
  }

  async updateProduct(id, product) {
    console.log('✏️ updateProduct called');
    const index = this.storage.products.findIndex(p => p.id == id);
    if (index !== -1) {
      this.storage.products[index] = { ...this.storage.products[index], ...product };
      await this.saveToStorage();
      dataEventService.emitProductChange({ id, ...product });
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteProduct(id) {
    console.log('🗑️ deleteProduct called');
    const index = this.storage.products.findIndex(p => p.id == id);
    if (index !== -1) {
      this.storage.products.splice(index, 1);
      await this.saveToStorage();
      dataEventService.emitProductChange({ id, deleted: true });
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  // Orders CRUD
  async addOrder(order) {
    console.log('➕ addOrder called');
    console.log(`📊 Current orders count before adding: ${this.storage.orders.length}`);
    const newOrder = { id: Date.now(), ...order };
    this.storage.orders.push(newOrder);
    console.log(`✅ Order added with id: ${newOrder.id}, new count: ${this.storage.orders.length}`);
    
    // Auto-sync with calendar if delivery date exists
    if (newOrder.deliveryDate) {
      // Ensure delivery date is in ISO format
      newOrder.deliveryDate = toISODate(newOrder.deliveryDate);
      await this.syncOrdersWithCalendar();
    }
    
    // Track egg consumption if order contains eggs
    await this.trackEggConsumption(newOrder.id, newOrder);
    
    await this.saveToStorage();
    dataEventService.emitOrderChange(newOrder);
    return { insertId: newOrder.id };
  }

  async getOrders() {
    await this.waitForInitialization();
    console.log('📋 getOrders called - returning test data');
    // Migrate old "poules" to "poussins" for backward compatibility
    const migratedOrders = this.storage.orders.map(order => {
      if (order.animalType === 'poules') {
        return {
          ...order,
          animalType: 'poussins'
        };
      }
      return order;
    });
    return migratedOrders;
  }

  async updateOrder(id, order) {
    console.log('✏️ updateOrder called');
    const index = this.storage.orders.findIndex(o => o.id == id);
    if (index !== -1) {
      this.storage.orders[index] = { ...this.storage.orders[index], ...order };
      
      // Update egg consumption tracking
      await this.trackEggConsumption(id, this.storage.orders[index]);
      
      await this.saveToStorage();
      dataEventService.emitOrderChange({ id, ...order });
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteOrder(id) {
    console.log(`🗑️ deleteOrder called for id: ${id}`);
    console.log(`📊 Current orders count before deletion: ${this.storage.orders.length}`);
    const index = this.storage.orders.findIndex(o => o.id == id);
    if (index !== -1) {
      this.storage.orders.splice(index, 1);
      console.log(`✅ Order deleted, new count: ${this.storage.orders.length}`);
      
      // Remove egg consumption tracking
      await this.removeEggConsumption(id);
      
      await this.saveToStorage();
      // Sync with calendar after deletion
      await this.syncOrdersWithCalendar();
      dataEventService.emitOrderChange({ id, deleted: true });
      return { rowsAffected: 1 };
    }
    console.log(`⚠️ Order with id ${id} not found`);
    return { rowsAffected: 0 };
  }

  // Calendar events CRUD
  async addEvent(event) {
    console.log('➕ addEvent called');
    const newEvent = { id: Date.now(), ...event };
    this.storage.calendar_events.push(newEvent);
    await this.saveToStorage();
    dataEventService.emitEventChange(newEvent);
    return { insertId: newEvent.id };
  }

  async getEvents() {
    await this.waitForInitialization();
    console.log('📋 getEvents called - returning test data');
    return this.storage.calendar_events;
  }

  async getEventsForDateRange(startDate, endDate) {
    console.log(`📋 getEventsForDateRange called for ${startDate} to ${endDate}`);
    
    const allEvents = this.storage.calendar_events;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter events within the date range
    const filteredEvents = allEvents.filter(event => {
      const eventDate = new Date(event.date || event.event_date);
      return eventDate >= start && eventDate <= end;
    });
    
    console.log(`📋 Found ${filteredEvents.length} events in date range`);
    return filteredEvents;
  }

  // Statistics methods for ProductManagementScreen
  async getElevageStatistics() {
    console.log('📊 getElevageStatistics called');
    
    const lots = this.storage.elevage_lots || [];
    const races = this.storage.elevage_races || [];
    const historique = this.storage.elevage_historique || [];
    
    // Calculate active lots
    const activeLots = lots.filter(lot => lot.status === 'Actif');
    
    // Calculate total living animals
    let totalLivingAnimals = 0;
    let totalDeathsThisWeek = 0;
    const uniqueRaces = new Set();
    
    // Get date range for "this week"
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    for (const lot of lots) {
      if (lot.status === 'Actif' && lot.races) {
        for (const [raceName, raceData] of Object.entries(lot.races)) {
          totalLivingAnimals += raceData.current || 0;
          uniqueRaces.add(raceName);
        }
      }
    }
    
    // Calculate deaths this week from historique
    for (const entry of historique) {
      if (entry.type === 'Mort' && entry.date) {
        const entryDate = new Date(entry.date);
        if (entryDate >= weekAgo && entryDate <= today) {
          // Extract number from description if possible
          const match = entry.description.match(/(\d+)/);
          if (match) {
            totalDeathsThisWeek += parseInt(match[1]);
          } else {
            totalDeathsThisWeek += 1; // Assume 1 if no number found
          }
        }
      }
    }
    
    return {
      activeLots: activeLots.length,
      totalLivingAnimals,
      uniqueRaces: uniqueRaces.size,
      deathsThisWeek: totalDeathsThisWeek
    };
  }

  // Export/Import functionality
  async exportToCSV(tableName) {
    console.log('📤 exportToCSV called for:', tableName);
    
    // Get data from our storage
    const data = this.storage[tableName] || [];
    console.log(`📊 Found ${data.length} records for ${tableName}:`, data);
    
    if (data.length === 0) {
      throw new Error(`Aucune donnée à exporter pour ${tableName}`);
    }

        // Generate CSV content - use specialized method for specific data types
        let csvContent;
        if (tableName === 'caprin_animals') {
          csvContent = this.generateCaprinCSV(data);
        } else if (tableName === 'caprin_settings') {
          csvContent = this.generateCaprinSettingsCSV(data);
        } else if (tableName === 'order_pricing') {
          csvContent = this.generateOrderPricingCSV(data);
        } else if (tableName === 'pricing_grids') {
          csvContent = this.generatePricingGridsCSV(data);
        } else if (tableName === 'template_messages') {
          csvContent = this.generateTemplateMessagesCSV(data);
        } else {
          csvContent = this.generateCSV(data, tableName);
        }
    
    const fileName = `${tableName}_${getTodayISO()}.csv`;
    
    console.log(`📝 Generated CSV content (${csvContent.length} chars):`, csvContent.substring(0, 200) + '...');
    
    // For mobile, create file and return path
    try {
      const fileUri = `${FileSystem.documentDirectory}export_${fileName}`;
      console.log(`💾 Writing file to: ${fileUri}`);
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      // Verify file was created
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log(`✅ File created successfully:`, fileInfo);
      
      return { fileUri, fileName, data: csvContent };
    } catch (error) {
      console.log('❌ FileSystem error:', error);
      // For web or other platforms
      return { data: csvContent, fileName };
    }
  }

  generateCSV(data, tableName = '') {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      `# FarmApp Export - ${tableName} - ${getTodayISO()}`,
      `# Generated on: ${new Date().toLocaleString('fr-FR')}`,
      `# Total records: ${data.length}`,
      '',
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }

  generateCaprinCSV(animals) {
    if (!animals || animals.length === 0) return '';
    
    const headers = [
      'id', 'name', 'species', 'breed', 'birthDate', 'mother', 'father', 
      'gender', 'status', 'notes', 'totalMilkProduction', 'averageMilkProduction', 
      'offspringCount', 'milkProductionDays'
    ];
    
    const csvRows = [
      `# FarmApp Export - caprin_animals - ${getTodayISO()}`,
      `# Generated on: ${new Date().toLocaleString('fr-FR')}`,
      `# Total records: ${animals.length}`,
      '',
      headers.join(','),
      ...animals.map(animal => {
        const totalMilk = animal.milkProduction ? 
          animal.milkProduction.reduce((total, day) => total + day.total, 0) : 0;
        const avgMilk = animal.milkProduction && animal.milkProduction.length > 0 ? 
          (totalMilk / animal.milkProduction.length).toFixed(1) : 0;
        const offspringCount = animal.offspring ? animal.offspring.length : 0;
        const milkDays = animal.milkProduction ? animal.milkProduction.length : 0;
        
        return [
          animal.id,
          animal.name,
          animal.species,
          animal.breed,
          animal.birthDate,
          animal.mother || '',
          animal.father || '',
          animal.gender,
          animal.status,
          animal.notes || '',
          totalMilk.toFixed(1),
          avgMilk,
          offspringCount,
          milkDays
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
      })
    ];
    
    return csvRows.join('\n');
  }

  generateCaprinSettingsCSV(settings) {
    if (!settings) return '';
    
    const headers = ['milkRecordingMethod', 'totalGroupMilkProduction', 'groupMilkDays'];
    
    const totalGroupMilk = settings.groupMilkProduction ? 
      settings.groupMilkProduction.reduce((total, day) => total + day.total, 0) : 0;
    const groupMilkDays = settings.groupMilkProduction ? settings.groupMilkProduction.length : 0;
    
    const csvRows = [
      headers.join(','),
      [
        settings.milkRecordingMethod || 'individual',
        totalGroupMilk.toFixed(1),
        groupMilkDays
      ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    ];
    
    return csvRows.join('\n');
  }

  generateOrderPricingCSV(pricingData) {
    if (!pricingData || Object.keys(pricingData).length === 0) return '';
    
    const headers = [
      'orderId', 'calculatedPrice', 'priceAdjustment', 'finalPrice', 
      'calculationDate', 'priceBreakdown'
    ];
    
    const csvRows = [
      headers.join(','),
      ...Object.entries(pricingData).map(([orderId, pricing]) => [
        orderId,
        pricing.calculatedPrice || 0,
        pricing.priceAdjustment || 0,
        pricing.finalPrice || 0,
        pricing.calculationDate || '',
        JSON.stringify(pricing.priceBreakdown || []).replace(/"/g, '""')
      ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    ];
    
    return csvRows.join('\n');
  }

  generatePricingGridsCSV(pricingGrids) {
    if (!pricingGrids || Object.keys(pricingGrids).length === 0) return '';
    
    const headers = ['animalType', 'ageMonths', 'price', 'sex'];
    const csvRows = [headers.join(',')];
    
    Object.entries(pricingGrids).forEach(([animalType, grid]) => {
      grid.forEach(item => {
        csvRows.push([
          animalType,
          item.ageMonths || 0,
          item.price || 0,
          item.sex || ''
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','));
      });
    });
    
    return csvRows.join('\n');
  }

  generateTemplateMessagesCSV(messages) {
    if (!messages || messages.length === 0) return '';
    
    const headers = ['id', 'title', 'category', 'content'];
    const csvRows = [
      `# FarmApp Export - template_messages - ${getTodayISO()}`,
      `# Generated on: ${new Date().toLocaleString('fr-FR')}`,
      `# Total records: ${messages.length}`,
      '',
      headers.join(','),
      ...messages.map(message => [
        message.id || '',
        message.title || '',
        message.category || '',
        message.content || ''
      ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    ];
    
    return csvRows.join('\n');
  }

  async importFromCSV(tableName, csvContent) {
    console.log('📥 importFromCSV called');
    return 1;
  }

  async restoreFromBackup(backupData) {
    console.log('📥 restoreFromBackup called');
    
    try {
      // Restore all data from backup
      if (backupData.products) this.storage.products = backupData.products;
      if (backupData.orders) this.storage.orders = backupData.orders;
      if (backupData.calendar_events) this.storage.calendar_events = backupData.calendar_events;
      if (backupData.elevage_lots) this.storage.elevage_lots = backupData.elevage_lots;
      if (backupData.elevage_races) this.storage.elevage_races = backupData.elevage_races;
      if (backupData.elevage_historique) this.storage.elevage_historique = backupData.elevage_historique;
      if (backupData.elevage_incubations) this.storage.elevage_incubations = backupData.elevage_incubations;
      if (backupData.lot_notes) this.storage.lot_notes = backupData.lot_notes;
      if (backupData.caprin_animals) this.storage.caprin_animals = backupData.caprin_animals;
      if (backupData.caprin_settings) this.storage.caprin_settings = backupData.caprin_settings;
      if (backupData.herd_types) this.storage.herd_types = backupData.herd_types;
      if (backupData.elevage_animal_types) this.storage.elevage_animal_types = backupData.elevage_animal_types;
      if (backupData.herd_animals) this.storage.herd_animals = backupData.herd_animals;
      if (backupData.herd_settings) this.storage.herd_settings = backupData.herd_settings;
      if (backupData.saved_formulas) this.storage.saved_formulas = backupData.saved_formulas;
      if (backupData.order_pricing) this.storage.order_pricing = backupData.order_pricing;
      if (backupData.template_messages) this.storage.template_messages = backupData.template_messages;
      if (backupData.pricing_grids) this.storage.pricing_grids = backupData.pricing_grids;
      
      console.log('✅ Database restored from backup successfully');
      return { success: true, message: 'Base de données restaurée avec succès' };
    } catch (error) {
      console.error('❌ Error restoring from backup:', error);
      return { success: false, message: 'Erreur lors de la restauration: ' + error.message };
    }
  }

  async backupDatabase() {
    console.log('💾 backupDatabase called');
    
    const backupData = {
      // FarmApp Backup File
      _metadata: {
        app_name: 'FarmApp',
        export_type: 'full_backup',
        export_date: getNowISO(),
        generated_on: new Date().toLocaleString('fr-FR'),
        version: '1.0.0',
        description: 'Sauvegarde complète de toutes les données de la ferme'
      },
      // Data tables
      products: this.storage.products,
      orders: this.storage.orders,
      calendar_events: this.storage.calendar_events,
      elevage_lots: this.storage.elevage_lots,
      elevage_races: this.storage.elevage_races,
      elevage_historique: this.storage.elevage_historique,
      elevage_incubations: this.storage.elevage_incubations,
      lot_notes: this.storage.lot_notes,
      caprin_animals: this.storage.caprin_animals,
      caprin_settings: this.storage.caprin_settings,
      herd_types: this.storage.herd_types,
      elevage_animal_types: this.storage.elevage_animal_types,
      herd_animals: this.storage.herd_animals,
      herd_settings: this.storage.herd_settings,
      saved_formulas: this.storage.saved_formulas,
      order_pricing: this.storage.order_pricing,
      template_messages: this.storage.template_messages,
      pricing_grids: this.storage.pricing_grids,
      backup_date: getNowISO()
    };

    const fileName = `farmapp_backup_${getTodayISO()}.json`;
    
    // For mobile, create file and return path
    try {
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2));
      return { fileUri, fileName, data: backupData };
    } catch (error) {
      console.log('FileSystem not available for backup, returning data only:', error);
      return { data: backupData, fileName };
    }
  }

  async getTableData(tableName) {
    console.log('📋 getTableData called');
    return this.storage[tableName] || [];
  }

  // Debug function to list all files in documents directory
  async listDocumentFiles() {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      console.log('📁 Files in documents directory:', files);
      
      // Get detailed info for each file
      for (const file of files) {
        const fileUri = `${FileSystem.documentDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        console.log(`📄 ${file}:`, fileInfo);
      }
      
      return files;
    } catch (error) {
      console.log('❌ Error listing files:', error);
      return [];
    }
  }

  // ========== CALENDAR-ORDERS INTEGRATION ==========

  // Sync orders with calendar events
  async syncOrdersWithCalendar() {
    console.log('🔄 Syncing orders with calendar events...');
    
    const orders = this.storage.orders || [];
    const existingEvents = this.storage.calendar_events || [];
    
    console.log(`📋 Found ${orders.length} orders to sync`);
    // console.log('📋 Orders data:', orders);
    
    // Create calendar events for orders with delivery dates
    for (const order of orders) {
      // console.log(`🔍 Processing order ${order.id}:`, order);
      if (order.deliveryDate) {
        // Ensure delivery date is in ISO format
        const isoDeliveryDate = toISODate(order.deliveryDate);
        console.log(`📅 Order ${order.id} has delivery date: ${order.deliveryDate} -> ${isoDeliveryDate}`);
        
        const eventTitle = `Récupération: ${order.customerName}`;
        const eventDescription = this.generateOrderEventDescription(order);
        
        // Check if event already exists
        const existingEvent = existingEvents.find(event => 
          event.date === isoDeliveryDate && 
          event.title === eventTitle
        );
        
        if (!existingEvent) {
          const newEvent = {
            id: Date.now() + Math.random(),
            title: eventTitle,
            date: isoDeliveryDate,
            type: 'Récupération',
            product: order.orderType,
            notes: eventDescription,
            order_id: order.id,
            customer_name: order.customerName,
            customer_phone: order.customerPhone,
            customer_email: order.customerEmail,
            total_price: order.totalPrice,
            created_at: getNowISO()
          };
          
          this.storage.calendar_events.push(newEvent);
          // console.log(`✅ Created calendar event for order ${order.id}:`, newEvent);
        } else {
          console.log(`⚠️ Event already exists for order ${order.id}`);
        }
      } else {
        console.log(`❌ Order ${order.id} has no delivery date`);
      }
    }
    
    // console.log(`📅 Calendar now has ${this.storage.calendar_events.length} events`);
    // console.log('📅 All calendar events:', this.storage.calendar_events);
  }

  // Sync elevage events with calendar
  async syncElevageWithCalendar() {
    console.log('🔄 Syncing elevage events with calendar...');
    
    const lots = this.storage.elevage_lots || [];
    const historique = this.storage.elevage_historique || [];
    const existingEvents = this.storage.calendar_events || [];
    
    // Create events for lot creation dates
    for (const lot of lots) {
      if (lot.date_creation) {
        const eventTitle = `Création lot: ${lot.name}`;
        const existingEvent = existingEvents.find(event => 
          event.date === lot.date_creation && 
          event.title === eventTitle
        );
        
        if (!existingEvent) {
          const newEvent = {
            id: Date.now() + Math.random(),
            title: eventTitle,
            date: lot.date_creation,
            type: 'Entretien',
            product: 'Élevage',
            notes: `Nouveau lot créé avec ${Object.keys(lot.races).length} race(s)`,
            lot_id: lot.id,
            created_at: getNowISO()
          };
          
          this.storage.calendar_events.push(newEvent);
          // console.log(`✅ Created calendar event for lot ${lot.id}:`, newEvent);
        }
      }
      
      // Create events for estimated hatching dates (if different from actual)
      if (lot.estimated_hatching_date && lot.estimated_hatching_date !== lot.date_eclosion) {
        const eventTitle = `Éclosion estimée: ${lot.name}`;
        const existingEvent = existingEvents.find(event => 
          event.date === lot.estimated_hatching_date && 
          event.title === eventTitle &&
          event.lot_id === lot.id
        );
        
        if (!existingEvent) {
          const dateRange = lot.estimated_min_date && lot.estimated_max_date ?
            ` (Entre ${lot.estimated_min_date} et ${lot.estimated_max_date})` : '';
          const newEvent = {
            id: Date.now() + Math.random(),
            title: eventTitle,
            date: lot.estimated_hatching_date,
            type: 'Reproduction',
            product: 'Élevage',
            notes: `Éclosion/naissance estimée pour le lot ${lot.name}${dateRange}`,
            lot_id: lot.id,
            is_estimated: true,
            created_at: getNowISO()
          };
          
          this.storage.calendar_events.push(newEvent);
        }
      }
      
      // Create events for actual eclosion dates
      if (lot.date_eclosion) {
        const eventTitle = lot.estimated_hatching_date === lot.date_eclosion ? 
          `Éclosion: ${lot.name}` : `Éclosion réelle: ${lot.name}`;
        const existingEvent = existingEvents.find(event => 
          event.date === lot.date_eclosion && 
          event.title === eventTitle &&
          event.lot_id === lot.id
        );
        
        if (!existingEvent) {
          const newEvent = {
            id: Date.now() + Math.random(),
            title: eventTitle,
            date: lot.date_eclosion,
            type: 'Reproduction',
            product: 'Élevage',
            notes: `Éclosion/naissance pour le lot ${lot.name}`,
            lot_id: lot.id,
            created_at: getNowISO()
          };
          
          this.storage.calendar_events.push(newEvent);
          // console.log(`✅ Created calendar event for eclosion ${lot.id}:`, newEvent);
        }
      }
    }
    
    // Create events for historique entries
    for (const entry of historique) {
      if (entry.date && entry.type === 'Mort') {
        const eventTitle = `Mort: ${entry.race}`;
        const existingEvent = existingEvents.find(event => 
          event.date === entry.date && 
          event.title === eventTitle &&
          event.historique_id === entry.id
        );
        
        if (!existingEvent) {
          const newEvent = {
            id: Date.now() + Math.random(),
            title: eventTitle,
            date: entry.date,
            type: 'Soins',
            product: 'Élevage',
            notes: entry.description,
            lot_id: entry.lot_id,
            historique_id: entry.id,
            created_at: getNowISO()
          };
          
          this.storage.calendar_events.push(newEvent);
          // console.log(`✅ Created calendar event for historique ${entry.id}:`, newEvent);
        }
      }
    }
    
    console.log(`📅 Calendar now has ${this.storage.calendar_events.length} events after elevage sync`);
  }

  // Sync caprin events with calendar
  async syncCaprinWithCalendar() {
    console.log('🔄 Syncing caprin events with calendar...');
    
    const animals = this.storage.caprin_animals || [];
    const existingEvents = this.storage.calendar_events || [];
    
    // Create events for birth dates
    for (const animal of animals) {
      if (animal.birthDate) {
        const eventTitle = `Naissance: ${animal.name} (${animal.species})`;
        const eventExists = existingEvents.some(event => 
          event.title === eventTitle && event.date === animal.birthDate
        );
        
        if (!eventExists) {
          const newEvent = {
            id: Date.now() + Math.random(),
            title: eventTitle,
            date: animal.birthDate,
            type: 'Naissance',
            product: animal.species === 'chèvre' ? 'Chèvre' : 'Brebis',
            notes: `Race: ${animal.breed}, Sexe: ${animal.gender}`
          };
          
          this.storage.calendar_events.push(newEvent);
        }
      }
    }
    
    console.log(`📅 Calendar now has ${this.storage.calendar_events.length} events after caprin sync`);
  }

  // Sync all data with calendar - only when explicitly needed
  async syncAllWithCalendar() {
    console.log('🔄 Syncing all data with calendar...');
    await this.syncOrdersWithCalendar();
    await this.syncElevageWithCalendar();
    await this.syncCaprinWithCalendar();
    console.log('✅ All data synced with calendar');
  }

  // Generate description for order calendar events
  generateOrderEventDescription(order) {
    let description = `Commande ${order.orderType}`;
    
    if (order.orderType === 'Adoption') {
      description += ` - ${order.animalType} ${order.race}`;
      if (order.ageMonths) {
        description += ` (${order.ageMonths} mois)`;
      }
    } else if (order.product) {
      description += ` - ${order.product}`;
      if (order.quantity) {
        description += ` (${order.quantity})`;
      }
    }
    
    description += ` - ${order.totalPrice}€`;
    
    if (order.customerPhone) {
      description += ` - Tel: ${order.customerPhone}`;
    }
    
    return description;
  }

  // Get calendar events for a specific date
  async getEventsForDate(date) {
    return this.storage.calendar_events.filter(event => event.date === date);
  }

  // Get orders for a specific date
  async getOrdersForDate(date) {
    const orders = this.storage.orders.filter(order => order.deliveryDate === date);
    // Migrate old "poules" to "poussins" for backward compatibility
    return orders.map(order => {
      if (order.animalType === 'poules') {
        return {
          ...order,
          animalType: 'poussins'
        };
      }
      return order;
    });
  }

  // Export calendar events with order details to CSV
  async exportCalendarWithOrders() {
    console.log('📤 exportCalendarWithOrders called');
    
    // Sync orders with calendar first
    await this.syncOrdersWithCalendar();
    
    const events = this.storage.calendar_events || [];
    if (events.length === 0) {
      throw new Error('Aucun événement de calendrier à exporter');
    }

    // Create detailed CSV with all order information
    const csvData = events.map(event => ({
      date: event.date,
      title: event.title,
      type: event.type,
      customer_name: event.customer_name || '',
      customer_phone: event.customer_phone || '',
      customer_email: event.customer_email || '',
      order_type: event.product || '',
      total_price: event.total_price || '',
      notes: event.notes || '',
      order_id: event.order_id || '',
      created_at: event.created_at || ''
    }));

    const csvContent = this.generateCSV(csvData);
    const fileName = `calendrier_commandes_${getTodayISO()}.csv`;
    
    try {
      const fileUri = `${FileSystem.documentDirectory}export_${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      // Verify file was created
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log(`✅ Calendar with orders CSV created:`, fileInfo);
      
      return { fileUri, fileName, data: csvContent };
    } catch (error) {
      console.log('❌ FileSystem error for calendar export:', error);
      return { data: csvContent, fileName };
    }
  }

  // ========== ELEVAGE CRUD ==========

  // Egg Incubation CRUD
  async addEggIncubation(incubation) {
    console.log('🥚 addEggIncubation called');
    const newIncubation = { 
      id: Date.now(), 
      ...incubation,
      created_at: new Date().toISOString()
    };
    this.storage.elevage_incubations.push(newIncubation);
    await this.saveToStorage();
    return { insertId: newIncubation.id };
  }

  async getEggIncubations(lotId = null) {
    console.log('📋 getEggIncubations called');
    if (lotId) {
      return this.storage.elevage_incubations.filter(inc => inc.lot_id === lotId);
    }
    return this.storage.elevage_incubations;
  }

  async updateEggIncubation(id, incubation) {
    console.log('✏️ updateEggIncubation called');
    const index = this.storage.elevage_incubations.findIndex(inc => inc.id == id);
    if (index !== -1) {
      this.storage.elevage_incubations[index] = { 
        ...this.storage.elevage_incubations[index], 
        ...incubation,
        updated_at: new Date().toISOString()
      };
      await this.saveToStorage();
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteEggIncubation(id) {
    console.log('🗑️ deleteEggIncubation called');
    const index = this.storage.elevage_incubations.findIndex(inc => inc.id == id);
    if (index !== -1) {
      this.storage.elevage_incubations.splice(index, 1);
      await this.saveToStorage();
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  // Get incubation statistics
  async getIncubationStatistics(year = null) {
    console.log('📊 getIncubationStatistics called');
    let incubations = this.storage.elevage_incubations;
    
    if (year) {
      incubations = incubations.filter(inc => {
        const incYear = new Date(inc.created_at).getFullYear();
        return incYear === year;
      });
    }

    const stats = {
      total_eggs: 0,
      total_fertilized: 0,
      total_hatched: 0,
      fertility_rate: 0,
      success_rate: 0,
      overall_success_rate: 0,
      by_race: {},
      by_lot: {},
      best_fecondeur: null,
      best_success_race: null
    };

    incubations.forEach(inc => {
      const race = inc.race;
      const lotId = inc.lot_id;
      
      // Initialize race stats
      if (!stats.by_race[race]) {
        stats.by_race[race] = {
          total_eggs: 0,
          total_fertilized: 0,
          total_hatched: 0,
          fertility_rate: 0,
          success_rate: 0,
          overall_success_rate: 0
        };
      }
      
      // Initialize lot stats
      if (!stats.by_lot[lotId]) {
        stats.by_lot[lotId] = {
          total_eggs: 0,
          total_fertilized: 0,
          total_hatched: 0,
          fertility_rate: 0,
          success_rate: 0,
          overall_success_rate: 0
        };
      }

      // Add to totals
      stats.total_eggs += inc.eggs_count || 0;
      stats.total_fertilized += inc.fertilized_count || 0;
      stats.total_hatched += inc.hatched_count || 0;
      
      stats.by_race[race].total_eggs += inc.eggs_count || 0;
      stats.by_race[race].total_fertilized += inc.fertilized_count || 0;
      stats.by_race[race].total_hatched += inc.hatched_count || 0;
      
      stats.by_lot[lotId].total_eggs += inc.eggs_count || 0;
      stats.by_lot[lotId].total_fertilized += inc.fertilized_count || 0;
      stats.by_lot[lotId].total_hatched += inc.hatched_count || 0;
    });

    // Calculate rates
    if (stats.total_eggs > 0) {
      stats.fertility_rate = (stats.total_fertilized / stats.total_eggs) * 100;
      stats.overall_success_rate = (stats.total_hatched / stats.total_eggs) * 100;
    }
    
    if (stats.total_fertilized > 0) {
      stats.success_rate = (stats.total_hatched / stats.total_fertilized) * 100;
    }

    // Calculate rates for each race
    Object.keys(stats.by_race).forEach(race => {
      const raceStats = stats.by_race[race];
      if (raceStats.total_eggs > 0) {
        raceStats.fertility_rate = (raceStats.total_fertilized / raceStats.total_eggs) * 100;
        raceStats.overall_success_rate = (raceStats.total_hatched / raceStats.total_eggs) * 100;
      }
      if (raceStats.total_fertilized > 0) {
        raceStats.success_rate = (raceStats.total_hatched / raceStats.total_fertilized) * 100;
      }
    });

    // Calculate rates for each lot
    Object.keys(stats.by_lot).forEach(lotId => {
      const lotStats = stats.by_lot[lotId];
      if (lotStats.total_eggs > 0) {
        lotStats.fertility_rate = (lotStats.total_fertilized / lotStats.total_eggs) * 100;
        lotStats.overall_success_rate = (lotStats.total_hatched / lotStats.total_eggs) * 100;
      }
      if (lotStats.total_fertilized > 0) {
        lotStats.success_rate = (lotStats.total_hatched / lotStats.total_fertilized) * 100;
      }
    });

    // Find best fecondeur (highest fertility rate with minimum eggs threshold)
    let bestFertility = 0;
    let bestSuccess = 0;
    const minEggsThreshold = 10; // Minimum eggs to be considered

    Object.keys(stats.by_race).forEach(race => {
      const raceStats = stats.by_race[race];
      if (raceStats.total_eggs >= minEggsThreshold) {
        if (raceStats.fertility_rate > bestFertility) {
          bestFertility = raceStats.fertility_rate;
          stats.best_fecondeur = {
            race: race,
            fertility_rate: raceStats.fertility_rate,
            total_eggs: raceStats.total_eggs,
            total_fertilized: raceStats.total_fertilized
          };
        }
        if (raceStats.overall_success_rate > bestSuccess) {
          bestSuccess = raceStats.overall_success_rate;
          stats.best_success_race = {
            race: race,
            overall_success_rate: raceStats.overall_success_rate,
            total_eggs: raceStats.total_eggs,
            total_hatched: raceStats.total_hatched
          };
        }
      }
    });

    return stats;
  }

  // Lots CRUD
  async addLot(lot) {
    console.log('➕ addLot called');
    const newLot = { id: Date.now(), ...lot };
    this.storage.elevage_lots.push(newLot);
    await this.saveToStorage();
    dataEventService.emitLotChange(newLot);
    return { insertId: newLot.id };
  }

  async getLots(animalType = null) {
    await this.waitForInitialization();
    console.log('📋 getLots called', animalType ? `for ${animalType}` : '');
    let lots = this.storage.elevage_lots;
    
    // Filter by animal type if provided
    if (animalType) {
      lots = lots.filter(lot => lot.species === animalType);
    }
    
    return lots;
  }

  async updateLot(id, lot) {
    console.log('✏️ updateLot called');
    const index = this.storage.elevage_lots.findIndex(l => l.id == id);
    if (index !== -1) {
      this.storage.elevage_lots[index] = { ...this.storage.elevage_lots[index], ...lot };
      await this.saveToStorage();
      dataEventService.emitLotChange({ id, ...lot });
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteLot(id) {
    console.log('🗑️ deleteLot called');
    const index = this.storage.elevage_lots.findIndex(l => l.id == id);
    if (index !== -1) {
      this.storage.elevage_lots.splice(index, 1);
      await this.saveToStorage();
      dataEventService.emitLotChange({ id, deleted: true });
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  // Races CRUD
  async addRace(race) {
    console.log('➕ addRace called');
    // If order is not provided, set it to the end of the list
    let order = race.order;
    if (order === undefined) {
      const maxOrder = this.storage.elevage_races.length > 0
        ? Math.max(...this.storage.elevage_races.map(r => r.order !== undefined ? r.order : 0), -1) + 1
        : 0;
      order = maxOrder;
    }
    const newRace = { id: Date.now(), ...race, order };
    this.storage.elevage_races.push(newRace);
    await this.saveToStorage();
    dataEventService.emitRaceChange(newRace);
    return { insertId: newRace.id };
  }

  async getRaces(animalType = null) {
    await this.waitForInitialization();
    console.log('📋 getRaces called', animalType ? `for ${animalType}` : '');
    // Migrate old "poules" to "poussins" for backward compatibility
    // Also ensure all races have an order field
    let races = this.storage.elevage_races.map((race, index) => {
      const migratedRace = {
        ...race,
        order: race.order !== undefined ? race.order : index
      };
      if (race.type === 'poules') {
        migratedRace.type = 'poussins';
      }
      return migratedRace;
    });
    
    // Filter by animal type if provided
    if (animalType) {
      const config = this.getElevageConfig(animalType);
      const raceTypes = config.raceTypes || [];
      races = races.filter(race => {
        // Check if race type matches any of the config race types
        return raceTypes.some(rt => race.type === rt || race.type === animalType);
      });
    }
    
    // Sort by order
    return races.sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : 999;
      const orderB = b.order !== undefined ? b.order : 999;
      return orderA - orderB;
    });
  }

  async updateRace(id, race) {
    console.log('✏️ updateRace called');
    const index = this.storage.elevage_races.findIndex(r => r.id == id);
    if (index !== -1) {
      this.storage.elevage_races[index] = { ...this.storage.elevage_races[index], ...race };
      await this.saveToStorage();
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteRace(id) {
    console.log('🗑️ deleteRace called');
    const index = this.storage.elevage_races.findIndex(r => r.id == id);
    if (index !== -1) {
      this.storage.elevage_races.splice(index, 1);
      await this.saveToStorage();
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async reorderRaces(raceId1, raceId2) {
    console.log('🔄 reorderRaces called');
    const race1Index = this.storage.elevage_races.findIndex(r => r.id == raceId1);
    const race2Index = this.storage.elevage_races.findIndex(r => r.id == raceId2);
    
    if (race1Index === -1 || race2Index === -1) {
      return { rowsAffected: 0 };
    }
    
    // Swap the order values
    const race1 = this.storage.elevage_races[race1Index];
    const race2 = this.storage.elevage_races[race2Index];
    
    const tempOrder = race1.order !== undefined ? race1.order : race1Index;
    race1.order = race2.order !== undefined ? race2.order : race2Index;
    race2.order = tempOrder;
    
    await this.saveToStorage();
    return { rowsAffected: 2 };
  }

  // Historique CRUD
  async addHistorique(entry) {
    console.log('➕ addHistorique called');
    const newEntry = { id: Date.now(), ...entry };
    this.storage.elevage_historique.push(newEntry);
    await this.saveToStorage();
    return { insertId: newEntry.id };
  }

  async getHistorique(lotId = null, animalType = null) {
    await this.waitForInitialization();
    console.log('📋 getHistorique called', animalType ? `for ${animalType}` : '');
    let historique = this.storage.elevage_historique;
    
    // Filter by lot ID if provided
    if (lotId) {
      historique = historique.filter(h => h.lot_id == lotId);
    }
    
    // Filter by animal type if provided (need to check lot species)
    if (animalType && !lotId) {
      const lots = await this.getLots(animalType);
      const lotIds = new Set(lots.map(l => l.id));
      historique = historique.filter(h => lotIds.has(h.lot_id));
    }
    
    return historique;
  }

  // ========== PRICING SYSTEM ==========
  
  // Initialize default pricing grids
  _initializeDefaultPricingGrids() {
    if (!this.storage.pricing_grids) {
      this.storage.pricing_grids = {
        poussins: [
          { ageMonths: 0, ageWeeks: 0, price: 5, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 1, price: 10, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 10, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 15, sex: 'Femelle' },
          { ageMonths: 3, ageWeeks: 0, price: 20, sex: 'Femelle' },
          { ageMonths: 3, ageWeeks: 0, price: 15, sex: 'Mâle' },
          { ageMonths: 4, ageWeeks: 0, price: 25, sex: 'Femelle' },
          { ageMonths: 5, ageWeeks: 0, price: 30, sex: 'Femelle' },
          { ageMonths: 6, ageWeeks: 0, price: 35, sex: 'Femelle' }
        ],
        canards: [
          { ageMonths: 0, ageWeeks: 0, price: 5, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 1, price: 10, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 15, sex: 'Femelle' },
          { ageMonths: 2, ageWeeks: 0, price: 15, sex: 'Mâle' },
          { ageMonths: 2, ageWeeks: 0, price: 25, sex: 'Femelle' }
        ],
        oie: [
          { ageMonths: 0, ageWeeks: 0, price: 8.00, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 4, price: 10.00, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 8, price: 12.00, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 15.00, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 18.00, sex: 'Tous' },
          { ageMonths: 3, ageWeeks: 0, price: 22.00, sex: 'Tous' }
        ],
        lapin: [
          { ageMonths: 0, ageWeeks: 0, price: 6.00, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 4, price: 8.00, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 8, price: 10.00, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 12.00, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 15.00, sex: 'Tous' },
          { ageMonths: 3, ageWeeks: 0, price: 18.00, sex: 'Tous' }
        ],
        chèvre: [
          { ageMonths: 0, ageWeeks: 0, price: 25.00, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 4, price: 30.00, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 8, price: 35.00, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 40.00, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 50.00, sex: 'Tous' },
          { ageMonths: 3, ageWeeks: 0, price: 60.00, sex: 'Tous' }
        ],
        cailles: [
          { ageMonths: 0, ageWeeks: 0, price: 2.50, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 4, price: 3.00, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 8, price: 3.50, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 4.00, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 4.50, sex: 'Tous' },
          { ageMonths: 3, ageWeeks: 0, price: 5.00, sex: 'Tous' }
        ]
      };
    }
  }
  
  // Save pricing grid to database
  async savePricingGrid(animalType, pricingGrid) {
    console.log('💰 savePricingGrid called');
    this._initializeDefaultPricingGrids();
    this.storage.pricing_grids[animalType] = pricingGrid;
    await this.saveToStorage();
    return { success: true };
  }

  // Get pricing grid from database
  async getPricingGrid(animalType) {
    console.log('💰 getPricingGrid called');
    this._initializeDefaultPricingGrids();
    return this.storage.pricing_grids[animalType] || [];
  }

  // Get all pricing grids
  async getAllPricingGrids() {
    console.log('💰 getAllPricingGrids called');
    this._initializeDefaultPricingGrids();
    return this.storage.pricing_grids;
  }

  // Get available animal types with pricing grids
  async getAvailableAnimalTypes() {
    console.log('💰 getAvailableAnimalTypes called');
    const grids = this.storage.pricing_grids || {};
    return Object.keys(grids);
  }

  // ========== HERD-SPECIFIC CONFIGURATIONS ==========
  getHerdConfig(herdType) {
    const configs = {
      caprin: {
        name: 'Caprin',
        icon: '🐐',
        color: '#87CEEB', // bleu ciel moins fort (sky blue)
        species: ['chèvre', 'bouc'],
        defaultSpecies: 'chèvre',
        animalLabel: 'Chèvres',
        emoji: { 'chèvre': '🐐', 'bouc': '🐐' },
        description: 'Gestion des chèvres et boucs'
      },
      ovin: {
        name: 'Ovin',
        icon: '🐑',
        color: '#6B8E23',
        species: ['brebis', 'bélier'],
        defaultSpecies: 'brebis',
        animalLabel: 'Brebis',
        emoji: { 'brebis': '🐑', 'bélier': '🐑' },
        description: 'Gestion des brebis et béliers'
      },
      bovin: {
        name: 'Bovin',
        icon: '🐄',
        color: '#CD5C5C', // rouge moins fort (indian red)
        species: ['vache', 'taureau'],
        defaultSpecies: 'vache',
        animalLabel: 'Vaches',
        emoji: { 'vache': '🐄', 'taureau': '🐄' },
        description: 'Gestion des vaches et taureaux'
      },
      équin: {
        name: 'Équin',
        icon: '🐴',
        color: '#8B4513',
        species: ['jument', 'étalon'],
        defaultSpecies: 'jument',
        animalLabel: 'Chevaux',
        emoji: { 'jument': '🐴', 'étalon': '🐴' },
        description: 'Gestion des juments et étalons'
      },
      porcin: {
        name: 'Porcin',
        icon: '🐷',
        color: '#FFB6C1',
        species: ['truie', 'porc'],
        defaultSpecies: 'truie',
        animalLabel: 'Porcs',
        emoji: { 'truie': '🐷', 'porc': '🐷' },
        description: 'Gestion des truies et porcs'
      }
    };
    return configs[herdType] || {
      name: herdType.charAt(0).toUpperCase() + herdType.slice(1),
      icon: '🐾',
      color: '#8B4513',
      species: ['animal'],
      defaultSpecies: 'animal',
      animalLabel: 'Animaux',
      emoji: { 'animal': '🐾' },
      description: `Gestion du troupeau ${herdType}`
    };
  }

  // ========== ELEVAGE-SPECIFIC CONFIGURATIONS ==========
  getElevageConfig(animalType) {
    const configs = {
      'poussins': {
        name: 'Poussins/Poules',
        icon: '🐓',
        color: '#FF9800',
        species: ['poussins'],
        defaultSpecies: 'poussins',
        animalLabel: 'Poussins',
        emoji: { 'poussins': '🐓' },
        description: 'Gestion des poussins et poules',
        raceTypes: ['poules']
      },
      'cailles': {
        name: 'Cailles',
        icon: '🐦',
        color: '#9C27B0',
        species: ['cailles'],
        defaultSpecies: 'cailles',
        animalLabel: 'Cailles',
        emoji: { 'cailles': '🐦' },
        description: 'Gestion des cailles',
        raceTypes: ['cailles']
      },
      'canards': {
        name: 'Canards',
        icon: '🦆',
        color: '#2196F3',
        species: ['canards'],
        defaultSpecies: 'canards',
        animalLabel: 'Canards',
        emoji: { 'canards': '🦆' },
        description: 'Gestion des canards',
        raceTypes: ['canards']
      },
      'oies': {
        name: 'Oies',
        icon: '🪿',
        color: '#4CAF50',
        species: ['oies'],
        defaultSpecies: 'oies',
        animalLabel: 'Oies',
        emoji: { 'oies': '🪿' },
        description: 'Gestion des oies',
        raceTypes: ['oie']
      },
      'paons': {
        name: 'Paons',
        icon: '🦚',
        color: '#00BCD4',
        species: ['paons'],
        defaultSpecies: 'paons',
        animalLabel: 'Paons',
        emoji: { 'paons': '🦚' },
        description: 'Gestion des paons',
        raceTypes: ['paons']
      },
      'dindes': {
        name: 'Dindes',
        icon: '🦃',
        color: '#FF5722',
        species: ['dindes'],
        defaultSpecies: 'dindes',
        animalLabel: 'Dindes',
        emoji: { 'dindes': '🦃' },
        description: 'Gestion des dindes',
        raceTypes: ['dindes']
      },
      'lapins': {
        name: 'Lapins',
        icon: '🐰',
        color: '#795548',
        species: ['lapins'],
        defaultSpecies: 'lapins',
        animalLabel: 'Lapins',
        emoji: { 'lapins': '🐰' },
        description: 'Gestion des lapins',
        raceTypes: ['lapin']
      }
    };
    return configs[animalType] || {
      name: animalType.charAt(0).toUpperCase() + animalType.slice(1),
      icon: '🐾',
      color: '#005F6B',
      species: [animalType],
      defaultSpecies: animalType,
      animalLabel: animalType,
      emoji: { [animalType]: '🐾' },
      description: `Gestion des ${animalType}`,
      raceTypes: [animalType]
    };
  }

  // ========== HERD GROUPS MANAGEMENT ==========
  async getHerdGroups(herdType) {
    console.log(`📋 getHerdGroups called for ${herdType}`);
    if (!this.storage.herd_settings || !this.storage.herd_settings[herdType]) {
      return [];
    }
    return this.storage.herd_settings[herdType].groups || [];
  }

  async addHerdGroup(herdType, group) {
    console.log(`➕ addHerdGroup called for ${herdType}`);
    if (!this.storage.herd_settings) {
      this.storage.herd_settings = {};
    }
    if (!this.storage.herd_settings[herdType]) {
      this.storage.herd_settings[herdType] = {
        groups: [],
        milkRecordingMethod: 'group',
        groupMilkProduction: []
      };
    }
    if (!this.storage.herd_settings[herdType].groups) {
      this.storage.herd_settings[herdType].groups = [];
    }
    const newGroup = {
      id: Date.now(),
      name: group.name,
      animalIds: group.animalIds || [],
      description: group.description || '',
      createdAt: new Date().toISOString()
    };
    this.storage.herd_settings[herdType].groups.push(newGroup);
    await this.saveToStorage();
    return { insertId: newGroup.id };
  }

  async updateHerdGroup(herdType, groupId, group) {
    console.log(`✏️ updateHerdGroup called for ${herdType}`);
    if (!this.storage.herd_settings || !this.storage.herd_settings[herdType] || !this.storage.herd_settings[herdType].groups) {
      return { rowsAffected: 0 };
    }
    const index = this.storage.herd_settings[herdType].groups.findIndex(g => g.id == groupId);
    if (index !== -1) {
      this.storage.herd_settings[herdType].groups[index] = {
        ...this.storage.herd_settings[herdType].groups[index],
        ...group,
        updatedAt: new Date().toISOString()
      };
      await this.saveToStorage();
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteHerdGroup(herdType, groupId) {
    console.log(`🗑️ deleteHerdGroup called for ${herdType}`);
    if (!this.storage.herd_settings || !this.storage.herd_settings[herdType] || !this.storage.herd_settings[herdType].groups) {
      return { rowsAffected: 0 };
    }
    const index = this.storage.herd_settings[herdType].groups.findIndex(g => g.id == groupId);
    if (index !== -1) {
      this.storage.herd_settings[herdType].groups.splice(index, 1);
      await this.saveToStorage();
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async addAnimalsToGroup(herdType, groupId, animalIds) {
    console.log(`➕ addAnimalsToGroup called for ${herdType}`);
    if (!this.storage.herd_settings || !this.storage.herd_settings[herdType] || !this.storage.herd_settings[herdType].groups) {
      return { rowsAffected: 0 };
    }
    const group = this.storage.herd_settings[herdType].groups.find(g => g.id == groupId);
    if (group) {
      // Add only unique IDs
      const existingIds = new Set(group.animalIds || []);
      animalIds.forEach(id => existingIds.add(id));
      group.animalIds = Array.from(existingIds);
      await this.saveToStorage();
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async removeAnimalsFromGroup(herdType, groupId, animalIds) {
    console.log(`➖ removeAnimalsFromGroup called for ${herdType}`);
    if (!this.storage.herd_settings || !this.storage.herd_settings[herdType] || !this.storage.herd_settings[herdType].groups) {
      return { rowsAffected: 0 };
    }
    const group = this.storage.herd_settings[herdType].groups.find(g => g.id == groupId);
    if (group) {
      const idsToRemove = new Set(animalIds);
      group.animalIds = (group.animalIds || []).filter(id => !idsToRemove.has(id));
      await this.saveToStorage();
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  // Find matching price from pricing grid for specific animal type
  findMatchingPrice(animalType, ageMonths, ageWeeks, sexPreference) {
    const pricingGrids = this.storage.pricing_grids || {};
    const pricingGrid = pricingGrids[animalType] || [];
    const totalAgeInMonths = parseFloat(ageMonths || 0) + (parseFloat(ageWeeks || 0) / 4.33);
    
    // Find the best matching price entry
    let bestMatch = null;
    let bestAgeDifference = Infinity;
    
    pricingGrid.forEach(item => {
      const itemAgeMonths = item.ageMonths || 0;
      const ageDifference = Math.abs(itemAgeMonths - totalAgeInMonths);
      
      // Check if sex matches (or if item is "Tous")
      const sexMatches = item.sex === 'Tous' || 
                        (sexPreference === 'female' && item.sex === 'Femelle') ||
                        (sexPreference === 'male' && item.sex === 'Mâle') ||
                        sexPreference === 'any';
      
      if (sexMatches && ageDifference < bestAgeDifference) {
        bestMatch = item;
        bestAgeDifference = ageDifference;
      }
    });
    
    return bestMatch ? bestMatch.price : 0;
  }

  // Parse age string to months for comparison
  parseAgeToMonths(ageString) {
    if (ageString.includes('Naissance')) return 0;
    if (ageString.includes('1 semaine')) return 0.25;
    if (ageString.includes('1 mois')) return 1;
    if (ageString.includes('2 mois')) return 2;
    if (ageString.includes('3 mois')) return 3;
    if (ageString.includes('4 mois')) return 4;
    if (ageString.includes('5+ mois')) return 5;
    
    // Try to extract number from string
    const match = ageString.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  calculateOrderPrice(orderDetails) {
    let totalPrice = 0;
    let priceBreakdown = [];

    if (orderDetails.orderType === 'Adoption' && orderDetails.animalDetails) {
      // Calculate price for each animal type and race configuration using pricing grid
      Object.entries(orderDetails.animalDetails).forEach(([animalType, animalDetail]) => {
        if (animalDetail.races && Array.isArray(animalDetail.races)) {
          animalDetail.races.forEach(raceConfig => {
            // Find matching price from pricing grid for this specific animal type
            const pricePerAnimal = this.findMatchingPrice(
              animalType,
              raceConfig.ageMonths,
              raceConfig.ageWeeks,
              raceConfig.sexPreference
            );
            
            // Calculate total for this configuration
            const quantity = parseInt(raceConfig.quantity) || 1;
            const configTotal = pricePerAnimal * quantity;
            
            totalPrice += configTotal;
            
            // Calculate age in months for display
            const ageInMonths = parseFloat(raceConfig.ageMonths || 0) + (parseFloat(raceConfig.ageWeeks || 0) / 4.33);
            
            priceBreakdown.push({
              animalType,
              race: raceConfig.race,
              sexPreference: raceConfig.sexPreference,
              ageMonths: ageInMonths,
              quantity,
              costPerAnimal: pricePerAnimal.toFixed(2),
              configTotal: configTotal.toFixed(2),
              pricingSource: `Grille tarifaire ${animalType}`
            });
          });
        }
      });
    } else if (orderDetails.orderType === 'Autres produits' && orderDetails.selectedProducts) {
      // For 'Autres produits' orders, calculate price from selected products
      orderDetails.selectedProducts.forEach(product => {
        const productTotal = product.price * (product.quantity || 1);
        totalPrice += productTotal;
        
        priceBreakdown.push({
          item: product.name,
          quantity: product.quantity || 1,
          unitPrice: product.price.toFixed(2),
          total: productTotal.toFixed(2),
          category: product.category || 'Product',
          pricingSource: 'Produit sélectionné'
        });
      });
    }

    return {
      estimatedPrice: totalPrice,
      priceBreakdown,
      calculationDate: new Date().toISOString()
    };
  }

  async saveOrderPricing(orderId, pricingData) {
    console.log('💰 saveOrderPricing called');
    if (!this.storage.order_pricing) {
      this.storage.order_pricing = {};
    }
    this.storage.order_pricing[orderId] = pricingData;
    await this.saveToStorage();
    return { success: true };
  }

  async getOrderPricing(orderId) {
    console.log('💰 getOrderPricing called');
    return this.storage.order_pricing?.[orderId] || null;
  }

  async getAllOrderPricing() {
    console.log('💰 getAllOrderPricing called');
    return this.storage.order_pricing || {};
  }

  // ========== SAVED FORMULAS CRUD ==========
  
  async getSavedFormulas() {
    console.log('📋 getSavedFormulas called');
    return this.storage.saved_formulas || [];
  }

  async saveFormula(formula) {
    console.log('💾 saveFormula called');
    if (!this.storage.saved_formulas) {
      this.storage.saved_formulas = [];
    }
    this.storage.saved_formulas.push(formula);
    await this.saveToStorage();
    return { insertId: formula.id };
  }

  async deleteFormula(id) {
    console.log('🗑️ deleteFormula called');
    if (this.storage.saved_formulas) {
      this.storage.saved_formulas = this.storage.saved_formulas.filter(f => f.id !== id);
      await this.saveToStorage();
    }
    return 1;
  }

  // ========== TEMPLATE MESSAGES CRUD ==========
  
  async getTemplateMessages() {
    console.log('📋 getTemplateMessages called');
    return this.storage.template_messages || [];
  }

  async addTemplateMessage(message) {
    console.log('➕ addTemplateMessage called');
    if (!this.storage.template_messages) {
      this.storage.template_messages = [];
    }
    const newMessage = { id: Date.now(), ...message };
    this.storage.template_messages.push(newMessage);
    await this.saveToStorage();
    return { insertId: newMessage.id };
  }

  async updateTemplateMessage(id, message) {
    console.log('✏️ updateTemplateMessage called');
    if (!this.storage.template_messages) {
      this.storage.template_messages = [];
    }
    const index = this.storage.template_messages.findIndex(m => m.id == id);
    if (index !== -1) {
      this.storage.template_messages[index] = { ...this.storage.template_messages[index], ...message };
      await this.saveToStorage();
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteTemplateMessage(id) {
    console.log('🗑️ deleteTemplateMessage called');
    if (this.storage.template_messages) {
      this.storage.template_messages = this.storage.template_messages.filter(m => m.id !== id);
      await this.saveToStorage();
    }
    return 1;
  }

  // ========== UNIFIED HERD ANIMALS CRUD ==========
  // Generic methods for all herd types
  async addHerdAnimal(herdType, animal) {
    console.log(`➕ addHerdAnimal called for ${herdType}`);
    if (!this.storage.herd_animals) {
      this.storage.herd_animals = {};
    }
    if (!this.storage.herd_animals[herdType]) {
      this.storage.herd_animals[herdType] = [];
    }
    const newAnimal = { 
      id: Date.now(), 
      ...animal,
      milkProduction: animal.milkProduction || [],
      offspring: animal.offspring || [],
      parents: animal.parents || { mother: animal.mother || '', father: animal.father || '' }
    };
    this.storage.herd_animals[herdType].push(newAnimal);
    await this.saveToStorage();
    dataEventService.emitHerdAnimalChange({ herdType, ...newAnimal });
    return { insertId: newAnimal.id };
  }

  async getHerdAnimals(herdType) {
    await this.waitForInitialization();
    console.log(`📋 getHerdAnimals called for ${herdType}`);
    if (!this.storage.herd_animals || !this.storage.herd_animals[herdType]) {
      return [];
    }
    return this.storage.herd_animals[herdType];
  }

  async updateHerdAnimal(herdType, id, animal) {
    console.log(`✏️ updateHerdAnimal called for ${herdType}`);
    if (!this.storage.herd_animals || !this.storage.herd_animals[herdType]) {
      return { rowsAffected: 0 };
    }
    const index = this.storage.herd_animals[herdType].findIndex(a => a.id == id);
    if (index !== -1) {
      const updatedAnimal = { 
        ...this.storage.herd_animals[herdType][index], 
        ...animal,
        parents: { 
          mother: animal.mother || this.storage.herd_animals[herdType][index].parents?.mother || '', 
          father: animal.father || this.storage.herd_animals[herdType][index].parents?.father || '' 
        }
      };
      this.storage.herd_animals[herdType][index] = updatedAnimal;
      await this.saveToStorage();
      dataEventService.emitHerdAnimalChange({ herdType, id, ...updatedAnimal });
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteHerdAnimal(herdType, id) {
    console.log(`🗑️ deleteHerdAnimal called for ${herdType}`);
    if (!this.storage.herd_animals || !this.storage.herd_animals[herdType]) {
      return { rowsAffected: 0 };
    }
    const index = this.storage.herd_animals[herdType].findIndex(a => a.id == id);
    if (index !== -1) {
      this.storage.herd_animals[herdType].splice(index, 1);
      await this.saveToStorage();
      dataEventService.emitHerdAnimalChange({ herdType, id, deleted: true });
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async getHerdTypes() {
    await this.waitForInitialization();
    console.log('📋 getHerdTypes called');
    return this.storage.herd_types || [];
  }

  async addHerdType(herdType) {
    console.log(`➕ addHerdType called: ${herdType}`);
    if (!this.storage.herd_types) {
      this.storage.herd_types = [];
    }
    // Check for duplicates (normalize for comparison to handle accents)
    const normalizedExisting = this.storage.herd_types.map(t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    const normalizedNew = herdType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (!normalizedExisting.includes(normalizedNew)) {
      this.storage.herd_types.push(herdType);
      if (!this.storage.herd_animals) {
        this.storage.herd_animals = {};
      }
      if (!this.storage.herd_animals[herdType]) {
        this.storage.herd_animals[herdType] = [];
      }
      dataEventService.emitHerdTypeChange(herdType);
      // Initialize herd-specific settings
      if (!this.storage.herd_settings) {
        this.storage.herd_settings = {};
      }
      if (!this.storage.herd_settings[herdType]) {
        this.storage.herd_settings[herdType] = {
          groups: [],
          milkRecordingMethod: 'group',
          groupMilkProduction: []
        };
      }
      await this.saveToStorage();
    } else {
      console.log(`⚠️ Herd type ${herdType} already exists (normalized check)`);
    }
    return { success: true };
  }

  // ========== ELEVAGE ANIMAL TYPES MANAGEMENT ==========
  async getAnimalTypes() {
    await this.waitForInitialization();
    console.log('📋 getAnimalTypes called');
    return this.storage.elevage_animal_types || [];
  }

  async addAnimalType(animalType) {
    console.log(`➕ addAnimalType called: ${animalType}`);
    if (!this.storage.elevage_animal_types) {
      this.storage.elevage_animal_types = [];
    }
    // Check for duplicates (normalize for comparison to handle accents)
    const normalizedExisting = this.storage.elevage_animal_types.map(t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    const normalizedNew = animalType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (!normalizedExisting.includes(normalizedNew)) {
      this.storage.elevage_animal_types.push(animalType);
      await this.saveToStorage();
      dataEventService.emitAnimalTypeChange(animalType);
    } else {
      console.log(`⚠️ Animal type ${animalType} already exists (normalized check)`);
    }
    return { success: true };
  }

  async deleteAnimalType(animalType) {
    console.log(`🗑️ deleteAnimalType called: ${animalType}`);
    if (!this.storage.elevage_animal_types) {
      return { success: false };
    }
    
    // Remove from list
    this.storage.elevage_animal_types = this.storage.elevage_animal_types.filter(t => t !== animalType);
    
    // Note: We don't delete the actual lots/races data, just remove from active types list
    // This allows users to re-add the type later if needed
    
    await this.saveToStorage();
    return { success: true };
  }

  // ========== CAPRIN ANIMALS CRUD (Backward compatibility) ==========
  async addCaprinAnimal(animal) {
    console.log('➕ addCaprinAnimal called (backward compatibility)');
    // Use unified method
    return await this.addHerdAnimal('caprin', animal);
  }

  async getCaprinAnimals() {
    await this.waitForInitialization();
    console.log('📋 getCaprinAnimals called');
    // Try to get from unified structure first, fallback to old structure
    if (this.storage.herd_animals && this.storage.herd_animals.caprin) {
      return this.storage.herd_animals.caprin;
    }
    return this.storage.caprin_animals || [];
  }

  async updateCaprinAnimal(id, animal) {
    console.log('✏️ updateCaprinAnimal called (backward compatibility)');
    // Use unified method
    return await this.updateHerdAnimal('caprin', id, animal);
  }

  async deleteCaprinAnimal(id) {
    console.log('🗑️ deleteCaprinAnimal called (backward compatibility)');
    // Use unified method
    return await this.deleteHerdAnimal('caprin', id);
  }

  async addMilkProduction(animalId, milkData) {
    console.log('🥛 addMilkProduction called');
    // Try unified structure first
    if (this.storage.herd_animals && this.storage.herd_animals.caprin) {
      const animalIndex = this.storage.herd_animals.caprin.findIndex(a => a.id == animalId);
      if (animalIndex !== -1) {
        if (!this.storage.herd_animals.caprin[animalIndex].milkProduction) {
          this.storage.herd_animals.caprin[animalIndex].milkProduction = [];
        }
        this.storage.herd_animals.caprin[animalIndex].milkProduction.push(milkData);
        await this.saveToStorage();
        return { insertId: Date.now() };
      }
    }
    // Fallback to old structure
    const animalIndex = this.storage.caprin_animals?.findIndex(a => a.id == animalId);
    if (animalIndex !== -1) {
      if (!this.storage.caprin_animals[animalIndex].milkProduction) {
        this.storage.caprin_animals[animalIndex].milkProduction = [];
      }
      this.storage.caprin_animals[animalIndex].milkProduction.push(milkData);
      await this.saveToStorage();
      return { insertId: Date.now() };
    }
    return { insertId: null };
  }

  async addGroupMilkProduction(milkData) {
    console.log('🥛 addGroupMilkProduction called');
    if (!this.storage.caprin_settings.groupMilkProduction) {
      this.storage.caprin_settings.groupMilkProduction = [];
    }
    this.storage.caprin_settings.groupMilkProduction.push(milkData);
    await this.saveToStorage();
    return { insertId: Date.now() };
  }

  async getCaprinSettings() {
    console.log('⚙️ getCaprinSettings called');
    return this.storage.caprin_settings;
  }

  async updateCaprinSettings(settings) {
    console.log('⚙️ updateCaprinSettings called');
    this.storage.caprin_settings = { ...this.storage.caprin_settings, ...settings };
    await this.saveToStorage();
    return { rowsAffected: 1 };
  }

  // Méthodes utilitaires pour l'élevage
  async getAvailableStock(race) {
    console.log('🔍 getAvailableStock called for race:', race);
    let totalStock = 0;
    const lots = [];
    
    for (const lot of this.storage.elevage_lots) {
      if (lot.status === 'Actif' && lot.races[race]) {
        const raceData = lot.races[race];
        totalStock += raceData.current;
        lots.push({
          lot_id: lot.id,
          lot_name: lot.name,
          available: raceData.current,
          males: raceData.males || 0,
          females: raceData.females || 0,
          date_creation: lot.date_creation,
          races: lot.races, // Include full races data with characteristicsTracking
          eggs_count: lot.eggs_count,
          estimated_success_rate: lot.estimated_success_rate,
          hatched_count: lot.hatched_count
        });
      }
    }
    
    return { totalStock, lots };
  }

  async updateLotRaceQuantity(lotId, race, updates) {
    console.log('✏️ updateLotRaceQuantity called');
    const lotIndex = this.storage.elevage_lots.findIndex(l => l.id == lotId);
    if (lotIndex !== -1 && this.storage.elevage_lots[lotIndex].races[race]) {
      const currentRace = this.storage.elevage_lots[lotIndex].races[race];
      
      // Calculate new death counts including unsexed
      const newDeathsMales = updates.deaths_males !== undefined ? updates.deaths_males : currentRace.deaths_males || 0;
      const newDeathsFemales = updates.deaths_females !== undefined ? updates.deaths_females : currentRace.deaths_females || 0;
      const newDeathsUnsexed = updates.deaths_unsexed !== undefined ? updates.deaths_unsexed : currentRace.deaths_unsexed || 0;
      const totalDeaths = newDeathsMales + newDeathsFemales + newDeathsUnsexed;
      
      // Calculate new living counts
      const newMales = updates.males !== undefined ? updates.males : currentRace.males || 0;
      const newFemales = updates.females !== undefined ? updates.females : currentRace.females || 0;
      const newUnsexed = updates.unsexed !== undefined ? updates.unsexed : currentRace.unsexed || 0;
      const totalLiving = newMales + newFemales + newUnsexed;
      
      this.storage.elevage_lots[lotIndex].races[race] = {
        ...currentRace,
        males: newMales,
        females: newFemales,
        unsexed: newUnsexed,
        current: totalLiving,
        deaths: totalDeaths,
        deaths_males: newDeathsMales,
        deaths_females: newDeathsFemales,
        deaths_unsexed: newDeathsUnsexed,
        characteristicsTracking: updates.characteristicsTracking !== undefined ? updates.characteristicsTracking : (currentRace.characteristicsTracking || {})
      };
      
      const lot = this.storage.elevage_lots[lotIndex];
      await this.saveToStorage();
      dataEventService.emitLotChange({ id: lotId, ...lot });
      
      // Ajouter à l'historique avec détails par sexe
      const maleDeaths = newDeathsMales - (currentRace.deaths_males || 0);
      const femaleDeaths = newDeathsFemales - (currentRace.deaths_females || 0);
      const unsexedDeaths = newDeathsUnsexed - (currentRace.deaths_unsexed || 0);
      
      if (maleDeaths > 0 || femaleDeaths > 0 || unsexedDeaths > 0) {
        let description = `Morts: `;
        const parts = [];
        if (maleDeaths > 0) parts.push(`${maleDeaths} mâle(s)`);
        if (femaleDeaths > 0) parts.push(`${femaleDeaths} femelle(s)`);
        if (unsexedDeaths > 0) parts.push(`${unsexedDeaths} non-sexé(s)`);
        description += parts.join(', ') + ` - ${race}`;
        
        await this.addHistorique({
          lot_id: lotId,
          date: getTodayISO(),
          type: 'Mort',
          description: description,
          race: race,
          quantity: -(maleDeaths + femaleDeaths + unsexedDeaths),
          details: {
            deaths_males: maleDeaths,
            deaths_females: femaleDeaths,
            deaths_unsexed: unsexedDeaths
          }
        });
      }
      
      // Ajouter à l'historique pour le sexage
      const sexingChanges = [];
      if (updates.males !== undefined && updates.males !== currentRace.males) {
        sexingChanges.push(`♂️${updates.males}`);
      }
      if (updates.females !== undefined && updates.females !== currentRace.females) {
        sexingChanges.push(`♀️${updates.females}`);
      }
      if (updates.unsexed !== undefined && updates.unsexed !== currentRace.unsexed) {
        sexingChanges.push(`❓${updates.unsexed}`);
      }
      
      if (sexingChanges.length > 0 && (maleDeaths === 0 && femaleDeaths === 0 && unsexedDeaths === 0)) {
        await this.addHistorique({
          lot_id: lotId,
          date: getTodayISO(),
          type: 'Sexage',
          description: `Mise à jour sexage: ${sexingChanges.join(', ')} - ${race}`,
          race: race,
          quantity: 0
        });
      }
      
      await this.saveToStorage();
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  // Notes management for lots
  async saveLotNotes(lotId, race, notes) {
    console.log('💾 saveLotNotes called');
    const noteKey = `${lotId}_${race}`;
    this.storage.lot_notes = this.storage.lot_notes || {};
    this.storage.lot_notes[noteKey] = {
      lot_id: lotId,
      race: race,
      notes: notes,
      updated_at: getNowISO()
    };
    await this.saveToStorage();
    return { rowsAffected: 1 };
  }

  async getLotNotes(lotId, race) {
    console.log('📝 getLotNotes called');
    const noteKey = `${lotId}_${race}`;
    this.storage.lot_notes = this.storage.lot_notes || {};
    return this.storage.lot_notes[noteKey]?.notes || '';
  }

  async getAllLotNotes() {
    console.log('📋 getAllLotNotes called');
    this.storage.lot_notes = this.storage.lot_notes || {};
    return Object.values(this.storage.lot_notes);
  }

  // Cheese Production Management
  async addCheeseProduction(production) {
    console.log('🧀 addCheeseProduction called');
    this.storage.cheese_productions = this.storage.cheese_productions || [];
    const newProduction = {
      id: Date.now(),
      ...production,
      createdAt: new Date().toISOString()
    };
    this.storage.cheese_productions.push(newProduction);
    await this.saveToStorage();
    return newProduction;
  }

  async getCheeseProductions() {
    console.log('🧀 getCheeseProductions called');
    this.storage.cheese_productions = this.storage.cheese_productions || [];
    return this.storage.cheese_productions;
  }

  async updateCheeseProduction(id, production) {
    console.log('🧀 updateCheeseProduction called');
    this.storage.cheese_productions = this.storage.cheese_productions || [];
    const index = this.storage.cheese_productions.findIndex(p => p.id === id);
    if (index !== -1) {
      this.storage.cheese_productions[index] = { 
        ...this.storage.cheese_productions[index], 
        ...production, 
        updatedAt: new Date().toISOString() 
      };
      await this.saveToStorage();
      return this.storage.cheese_productions[index];
    }
    throw new Error('Cheese production not found');
  }

  async deleteCheeseProduction(id) {
    console.log('🧀 deleteCheeseProduction called');
    this.storage.cheese_productions = this.storage.cheese_productions || [];
    this.storage.cheese_productions = this.storage.cheese_productions.filter(p => p.id !== id);
    await this.saveToStorage();
  }

  // Cheese Recipes Management
  async addCheeseRecipe(recipe) {
    console.log('🧀 addCheeseRecipe called');
    this.storage.cheese_recipes = this.storage.cheese_recipes || [];
    const newRecipe = {
      id: Date.now(),
      ...recipe,
      createdAt: new Date().toISOString()
    };
    this.storage.cheese_recipes.push(newRecipe);
    await this.saveToStorage();
    return newRecipe;
  }

  async getCheeseRecipes() {
    console.log('🧀 getCheeseRecipes called');
    this.storage.cheese_recipes = this.storage.cheese_recipes || [];
    return this.storage.cheese_recipes;
  }

  async updateCheeseRecipe(id, recipe) {
    console.log('🧀 updateCheeseRecipe called');
    this.storage.cheese_recipes = this.storage.cheese_recipes || [];
    const index = this.storage.cheese_recipes.findIndex(r => r.id === id);
    if (index !== -1) {
      this.storage.cheese_recipes[index] = { 
        ...this.storage.cheese_recipes[index], 
        ...recipe, 
        updatedAt: new Date().toISOString() 
      };
      await this.saveToStorage();
      return this.storage.cheese_recipes[index];
    }
    throw new Error('Cheese recipe not found');
  }

  async deleteCheeseRecipe(id) {
    console.log('🧀 deleteCheeseRecipe called');
    this.storage.cheese_recipes = this.storage.cheese_recipes || [];
    this.storage.cheese_recipes = this.storage.cheese_recipes.filter(r => r.id !== id);
    await this.saveToStorage();
  }

  // Cheese Settings Management
  async getCheeseSettings() {
    console.log('🧀 getCheeseSettings called');
    this.storage.cheese_settings = this.storage.cheese_settings || {
      defaultRendementFromageFrais: 20,
      defaultRendementTomme: 10,
      graphPeriod: 30
    };
    return this.storage.cheese_settings;
  }

  async updateCheeseSettings(settings) {
    console.log('🧀 updateCheeseSettings called');
    this.storage.cheese_settings = { ...this.storage.cheese_settings, ...settings };
    await this.saveToStorage();
  }

  // Get cheese products for orders (from recipes)
  async getCheeseProductsForOrders() {
    console.log('🧀 getCheeseProductsForOrders called');
    const recipes = await this.getCheeseRecipes();
    return recipes.map(recipe => ({
      id: `cheese_${recipe.id}`,
      name: recipe.name,
      price: recipe.price,
      unit: recipe.cheeseType === 'tomme' ? 'kg' : 'unité',
      category: 'Fromage',
      description: recipe.description || `${recipe.cheeseType === 'fromage_frais' ? 'Fromage Frais' : 'Tomme'} - ${recipe.size || 'kg'} - ${recipe.flavor || 'Nature'}`,
      quantity: 0, // Will be set based on available stock
      type: 'cheese',
      recipeId: recipe.id,
      cheeseType: recipe.cheeseType,
      size: recipe.size,
      flavor: recipe.flavor
    }));
  }

  // Get available cheese stock based on production
  async getAvailableCheeseStock() {
    console.log('🧀 getAvailableCheeseStock called');
    const productions = await this.getCheeseProductions();
    const recipes = await this.getCheeseRecipes();
    
    // Calculate total production by type
    const stockByType = {};
    productions.forEach(production => {
      if (!stockByType[production.cheeseType]) {
        stockByType[production.cheeseType] = 0;
      }
      stockByType[production.cheeseType] += production.practicalYield;
    });

    // Map to recipes and calculate available quantities
    const availableStock = recipes.map(recipe => {
      const totalStock = stockByType[recipe.cheeseType] || 0;
      let availableQuantity = 0;
      
      if (recipe.cheeseType === 'fromage_frais') {
        // For fromage frais, calculate based on size (assuming 1kg = 20 units of 50g or 8 units of 120g)
        const sizeInKg = recipe.size === '50g' ? 0.05 : 0.12;
        availableQuantity = Math.floor(totalStock / sizeInKg);
      } else {
        // For tomme, stock is in kg
        availableQuantity = Math.floor(totalStock);
      }
      
      return {
        recipeId: recipe.id,
        availableQuantity: Math.max(0, availableQuantity)
      };
    });

    return availableStock;
  }

  // Egg production methods
  async saveEggProduction(date, animalType, total, rejected = 0) {
    try {
      if (!this.storage.egg_production) {
        this.storage.egg_production = {};
      }
      if (!this.storage.egg_production[date]) {
        this.storage.egg_production[date] = {};
      }
      // Store as object with total and rejected
      // For backward compatibility, if we receive just a number, treat it as total with 0 rejected
      if (typeof total === 'object' && total !== null) {
        // Already an object
        this.storage.egg_production[date][animalType] = total;
      } else {
        this.storage.egg_production[date][animalType] = {
          total: total || 0,
          rejected: rejected || 0
        };
      }
      await this.saveToStorage();
      
      // Emit event for data refresh
      if (dataEventService && dataEventService.emitEggProductionChange) {
        dataEventService.emitEggProductionChange({ date, animalType, total, rejected });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving egg production:', error);
      throw error;
    }
  }

  async getEggProduction() {
    try {
      return this.storage.egg_production || {};
    } catch (error) {
      console.error('Error getting egg production:', error);
      return {};
    }
  }

  async getEggProductionForDate(date) {
    try {
      return (this.storage.egg_production && this.storage.egg_production[date]) || {};
    } catch (error) {
      console.error('Error getting egg production for date:', error);
      return {};
    }
  }

  // Egg animal types management
  async getEggAnimalTypes() {
    try {
      if (!this.storage.egg_animal_types) {
        // Initialize with default types
        const defaultTypes = [
          { key: 'poules', label: 'Poules', icon: '🐔' },
          { key: 'canards', label: 'Canards', icon: '🦆' },
          { key: 'oies', label: 'Oies', icon: '🪿' },
          { key: 'dindes', label: 'Dindes', icon: '🦃' },
          { key: 'paons', label: 'Paons', icon: '🦚' }
        ];
        this.storage.egg_animal_types = defaultTypes;
        await this.saveToStorage();
      }
      return this.storage.egg_animal_types || [];
    } catch (error) {
      console.error('Error getting egg animal types:', error);
      return [
        { key: 'poules', label: 'Poules', icon: '🐔' },
        { key: 'canards', label: 'Canards', icon: '🦆' },
        { key: 'oies', label: 'Oies', icon: '🪿' },
        { key: 'dindes', label: 'Dindes', icon: '🦃' },
        { key: 'paons', label: 'Paons', icon: '🦚' }
      ];
    }
  }

  async addEggAnimalType(animalType) {
    try {
      if (!this.storage.egg_animal_types) {
        await this.getEggAnimalTypes(); // Initialize if needed
      }
      // Check if already exists
      const exists = this.storage.egg_animal_types.find(t => t.key === animalType.key);
      if (exists) {
        throw new Error('Animal type already exists');
      }
      this.storage.egg_animal_types.push(animalType);
      await this.saveToStorage();
      return { success: true };
    } catch (error) {
      console.error('Error adding egg animal type:', error);
      throw error;
    }
  }

  async deleteEggAnimalType(animalTypeKey) {
    try {
      if (!this.storage.egg_animal_types) {
        await this.getEggAnimalTypes(); // Initialize if needed
      }
      this.storage.egg_animal_types = this.storage.egg_animal_types.filter(t => t.key !== animalTypeKey);
      await this.saveToStorage();
      return { success: true };
    } catch (error) {
      console.error('Error deleting egg animal type:', error);
      throw error;
    }
  }

  // ========== EGG CONSUMPTION TRACKING ==========
  
  // Track egg consumption from orders
  async trackEggConsumption(orderId, order) {
    try {
      if (!this.storage.egg_consumption) {
        this.storage.egg_consumption = {};
      }
      
      // Check if order contains egg products
      let eggConsumption = {};
      
      // Check selectedProducts for egg products
      if (order.selectedProducts && Array.isArray(order.selectedProducts)) {
        order.selectedProducts.forEach(product => {
          // Check if product name or category contains "œuf" or "egg"
          const productName = (product.name || '').toLowerCase();
          const productCategory = (product.category || '').toLowerCase();
          
          if (productName.includes('œuf') || productName.includes('oeuf') || productName.includes('egg') || 
              productCategory === 'eggs' || productCategory === 'œufs' || productCategory.includes('oeuf') || productCategory.includes('œuf')) {
            // Extract animal type from product name or use default
            let animalType = 'poules'; // default
            if (productName.includes('canard')) animalType = 'canards';
            else if (productName.includes('oie')) animalType = 'oies';
            else if (productName.includes('dinde')) animalType = 'dindes';
            
            const quantity = product.quantity || 0;
            if (quantity > 0) {
              eggConsumption[animalType] = (eggConsumption[animalType] || 0) + quantity;
            }
          }
        });
      }
      
      // Also check product field for backward compatibility
      if (order.product && typeof order.product === 'string') {
        const productName = order.product.toLowerCase();
        if (productName.includes('œuf') || productName.includes('oeuf') || productName.includes('egg')) {
          let animalType = 'poules';
          if (productName.includes('canard')) animalType = 'canards';
          else if (productName.includes('oie')) animalType = 'oies';
          
          const quantity = order.quantity || 0;
          if (quantity > 0) {
            eggConsumption[animalType] = (eggConsumption[animalType] || 0) + quantity;
          }
        }
      }
      
      // Store consumption if any eggs were found
      if (Object.keys(eggConsumption).length > 0) {
        this.storage.egg_consumption[orderId] = {
          orderId,
          orderDate: order.orderDate || new Date().toISOString().split('T')[0],
          deliveryDate: order.deliveryDate || null,
          consumption: eggConsumption,
          lastUpdated: new Date().toISOString()
        };
        await this.saveToStorage();
      }
      
      return { success: true, consumption: eggConsumption };
    } catch (error) {
      console.error('Error tracking egg consumption:', error);
      return { success: false, error };
    }
  }

  // Get egg consumption for an order
  async getEggConsumptionForOrder(orderId) {
    try {
      return this.storage.egg_consumption?.[orderId] || null;
    } catch (error) {
      console.error('Error getting egg consumption:', error);
      return null;
    }
  }

  // Get all egg consumption
  async getAllEggConsumption() {
    try {
      return this.storage.egg_consumption || {};
    } catch (error) {
      console.error('Error getting all egg consumption:', error);
      return {};
    }
  }

  // Remove egg consumption when order is deleted
  async removeEggConsumption(orderId) {
    try {
      if (this.storage.egg_consumption && this.storage.egg_consumption[orderId]) {
        delete this.storage.egg_consumption[orderId];
        await this.saveToStorage();
      }
      return { success: true };
    } catch (error) {
      console.error('Error removing egg consumption:', error);
      return { success: false, error };
    }
  }

  // Crosscheck egg production vs orders consumption
  async crosscheckEggStock(date, animalType) {
    try {
      const production = await this.getEggProductionForDate(date);
      const productionData = production[animalType] || { total: 0, rejected: 0 };
      const available = productionData.total - (productionData.rejected || 0);
      
      // Get all orders with egg consumption for this date and animal type
      const allConsumption = await this.getAllEggConsumption();
      let totalConsumed = 0;
      
      Object.values(allConsumption).forEach(consumption => {
        // Check if consumption is for this date and animal type
        if (consumption.deliveryDate === date || consumption.orderDate === date) {
          if (consumption.consumption[animalType]) {
            totalConsumed += consumption.consumption[animalType];
          }
        }
      });
      
      return {
        date,
        animalType,
        produced: productionData.total,
        rejected: productionData.rejected || 0,
        available,
        consumed: totalConsumed,
        remaining: available - totalConsumed,
        status: available - totalConsumed >= 0 ? 'ok' : 'deficit'
      };
    } catch (error) {
      console.error('Error crosschecking egg stock:', error);
      return null;
    }
  }

  // Get crosscheck for all dates and animal types
  async getAllEggStockCrosscheck() {
    try {
      const production = await this.getEggProduction();
      const consumption = await this.getAllEggConsumption();
      const crosschecks = [];
      
      // Process each production date
      Object.keys(production).forEach(date => {
        Object.keys(production[date]).forEach(animalType => {
          const productionData = production[date][animalType];
          const available = productionData.total - (productionData.rejected || 0);
          
          // Calculate consumption for this date and animal type
          let totalConsumed = 0;
          Object.values(consumption).forEach(cons => {
            if ((cons.deliveryDate === date || cons.orderDate === date) && 
                cons.consumption[animalType]) {
              totalConsumed += cons.consumption[animalType];
            }
          });
          
          crosschecks.push({
            date,
            animalType,
            produced: productionData.total,
            rejected: productionData.rejected || 0,
            available,
            consumed: totalConsumed,
            remaining: available - totalConsumed,
            status: available - totalConsumed >= 0 ? 'ok' : 'deficit'
          });
        });
      });
      
      return crosschecks;
    } catch (error) {
      console.error('Error getting all egg stock crosscheck:', error);
      return [];
    }
  }
}

console.log('🏗️ Creating SimpleTestDatabaseService instance...');
const databaseService = new SimpleTestDatabaseService();
console.log('✅ SimpleTestDatabaseService created successfully');

export default databaseService;