// Simple test database service - no external dependencies
import * as FileSystem from 'expo-file-system/legacy';
import { toISODate, getTodayISO, getNowISO } from '../utils/dateUtils';
console.log('🔄 Loading simple database service...');

class SimpleTestDatabaseService {
  constructor() {
    console.log('🆕 SimpleTestDatabaseService constructor called');
    this.storage = {
      products: [
        { id: 1, name: 'Œufs de consommation', price: 3.50, quantity: 120, category: 'oeufs consommation', description: 'Douzaine d\'œufs frais de poules élevées au sol' },
        { id: 2, name: 'Adoption poussins', price: 8.00, quantity: 15, category: 'adoptions', description: 'Poussins de 3 semaines prêts à l\'adoption' },
        { id: 3, name: 'Fromage de chèvre', price: 12.50, quantity: 8, category: 'fromages', description: 'Fromage artisanal de nos chèvres' },
        { id: 4, name: 'Visite guidée', price: 5.00, quantity: 100, category: 'visites', description: 'Visite de la ferme pédagogique' }
      ],
      orders: [
        // Adoption orders - Poules
        { 
          id: 1, 
          customerName: 'Marie Dupont', 
          customerPhone: '+33123456789',
          customerEmail: 'marie@email.com',
          orderType: 'Adoption',
          animalType: 'poules',
          race: 'Marans',
          selectedGender: 'Femelles',
          selectedColor: 'Noir cuivré',
          selectedCharacteristics: ['Bonnes pondeuses', 'Rustiques'],
          ageMonths: '3',
          ageWeeks: '2',
          quantity: 4,
          totalPrice: 45.00,
          deliveryDate: '2025-10-17',
          status: 'Confirmée',
          orderDate: '2025-10-10'
        },
        { 
          id: 2, 
          customerName: 'Pierre Martin', 
          customerPhone: '+33123456790',
          customerEmail: 'pierre.martin@email.com',
          orderType: 'Adoption',
          animalType: 'poules',
          race: 'Araucana',
          selectedGender: 'Mélange',
          selectedColor: 'Bleu',
          selectedCharacteristics: ['Œufs bleus', 'Calmes'],
          ageMonths: '2',
          ageWeeks: '3',
          quantity: 6,
          totalPrice: 72.00,
          deliveryDate: '2025-10-20',
          status: 'En attente',
          orderDate: '2025-10-12'
        },
        { 
          id: 3, 
          customerName: 'Sophie Bernard', 
          customerPhone: '+33123456791',
          customerEmail: 'sophie.bernard@email.com',
          orderType: 'Adoption',
          animalType: 'poules',
          race: 'Sussex',
          selectedGender: 'Femelles',
          selectedColor: 'Blanc',
          selectedCharacteristics: ['Excellentes pondeuses', 'Dociles'],
          ageMonths: '4',
          ageWeeks: '1',
          quantity: 3,
          totalPrice: 54.00,
          deliveryDate: '2025-10-25',
          status: 'Prête',
          orderDate: '2025-10-08'
        },
        { 
          id: 4, 
          customerName: 'Jean Dubois', 
          customerPhone: '+33123456792',
          customerEmail: 'jean.dubois@email.com',
          orderType: 'Adoption',
          animalType: 'poules',
          race: 'Brahma',
          selectedGender: 'Mélange',
          selectedColor: 'Fauve',
          selectedCharacteristics: ['Grandes races', 'Rustiques'],
          ageMonths: '5',
          ageWeeks: '0',
          quantity: 2,
          totalPrice: 48.00,
          deliveryDate: '2025-01-15',
          status: 'Livrée',
          orderDate: '2025-01-05'
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
      lot_notes: {},
      caprin_settings: {
        milkRecordingMethod: 'individual', // 'individual' or 'group'
        groupMilkProduction: [] // For group recording: [{ date, total, notes }]
      },
      caprin_animals: [
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
          title: 'Annulation Commande',
          category: 'Commande',
          content: 'Bonjour {nom},\n\nNous vous informons que votre commande du {date} a été annulée.\n\nN\'hésitez pas à nous recontacter pour toute question.\n\nCordialement,\nL\'équipe de la ferme'
        }
      ]
    };
    console.log('✅ Simple storage initialized with test data');
  }

  // Products CRUD
  async addProduct(product) {
    console.log('➕ addProduct called');
    const newProduct = { id: Date.now(), ...product };
    this.storage.products.push(newProduct);
    return { insertId: newProduct.id };
  }

  async getProducts() {
    console.log('📋 getProducts called - returning test data');
    return this.storage.products;
  }

  async updateProduct(id, product) {
    console.log('✏️ updateProduct called');
    const index = this.storage.products.findIndex(p => p.id == id);
    if (index !== -1) {
      this.storage.products[index] = { ...this.storage.products[index], ...product };
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteProduct(id) {
    console.log('🗑️ deleteProduct called');
    const index = this.storage.products.findIndex(p => p.id == id);
    if (index !== -1) {
      this.storage.products.splice(index, 1);
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  // Orders CRUD
  async addOrder(order) {
    console.log('➕ addOrder called');
    const newOrder = { id: Date.now(), ...order };
    this.storage.orders.push(newOrder);
    
    // Auto-sync with calendar if delivery date exists
    if (newOrder.deliveryDate) {
      // Ensure delivery date is in ISO format
      newOrder.deliveryDate = toISODate(newOrder.deliveryDate);
      await this.syncOrdersWithCalendar();
    }
    
    return { insertId: newOrder.id };
  }

  async getOrders() {
    console.log('📋 getOrders called - returning test data');
    return this.storage.orders;
  }

  async updateOrder(id, order) {
    console.log('✏️ updateOrder called');
    const index = this.storage.orders.findIndex(o => o.id == id);
    if (index !== -1) {
      this.storage.orders[index] = { ...this.storage.orders[index], ...order };
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  // Calendar events CRUD
  async addEvent(event) {
    console.log('➕ addEvent called');
    const newEvent = { id: Date.now(), ...event };
    this.storage.calendar_events.push(newEvent);
    return { insertId: newEvent.id };
  }

  async getEvents() {
    console.log('📋 getEvents called - returning test data');
    return this.storage.calendar_events;
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
      if (backupData.lot_notes) this.storage.lot_notes = backupData.lot_notes;
      if (backupData.caprin_animals) this.storage.caprin_animals = backupData.caprin_animals;
      if (backupData.caprin_settings) this.storage.caprin_settings = backupData.caprin_settings;
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
      lot_notes: this.storage.lot_notes,
      caprin_animals: this.storage.caprin_animals,
      caprin_settings: this.storage.caprin_settings,
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
      
      // Create events for eclosion dates
      if (lot.date_eclosion) {
        const eventTitle = `Éclosion: ${lot.name}`;
        const existingEvent = existingEvents.find(event => 
          event.date === lot.date_eclosion && 
          event.title === eventTitle
        );
        
        if (!existingEvent) {
          const newEvent = {
            id: Date.now() + Math.random(),
            title: eventTitle,
            date: lot.date_eclosion,
            type: 'Reproduction',
            product: 'Élevage',
            notes: `Éclosion prévue pour le lot ${lot.name}`,
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

  // Sync all data with calendar
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
    return this.storage.orders.filter(order => order.deliveryDate === date);
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

  // Lots CRUD
  async addLot(lot) {
    console.log('➕ addLot called');
    const newLot = { id: Date.now(), ...lot };
    this.storage.elevage_lots.push(newLot);
    return { insertId: newLot.id };
  }

  async getLots() {
    console.log('📋 getLots called');
    return this.storage.elevage_lots;
  }

  async updateLot(id, lot) {
    console.log('✏️ updateLot called');
    const index = this.storage.elevage_lots.findIndex(l => l.id == id);
    if (index !== -1) {
      this.storage.elevage_lots[index] = { ...this.storage.elevage_lots[index], ...lot };
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteLot(id) {
    console.log('🗑️ deleteLot called');
    const index = this.storage.elevage_lots.findIndex(l => l.id == id);
    if (index !== -1) {
      this.storage.elevage_lots.splice(index, 1);
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  // Races CRUD
  async addRace(race) {
    console.log('➕ addRace called');
    const newRace = { id: Date.now(), ...race };
    this.storage.elevage_races.push(newRace);
    return { insertId: newRace.id };
  }

  async getRaces() {
    console.log('📋 getRaces called');
    return this.storage.elevage_races;
  }

  async updateRace(id, race) {
    console.log('✏️ updateRace called');
    const index = this.storage.elevage_races.findIndex(r => r.id == id);
    if (index !== -1) {
      this.storage.elevage_races[index] = { ...this.storage.elevage_races[index], ...race };
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteRace(id) {
    console.log('🗑️ deleteRace called');
    const index = this.storage.elevage_races.findIndex(r => r.id == id);
    if (index !== -1) {
      this.storage.elevage_races.splice(index, 1);
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  // Historique CRUD
  async addHistorique(entry) {
    console.log('➕ addHistorique called');
    const newEntry = { id: Date.now(), ...entry };
    this.storage.elevage_historique.push(newEntry);
    return { insertId: newEntry.id };
  }

  async getHistorique(lotId = null) {
    console.log('📋 getHistorique called');
    if (lotId) {
      return this.storage.elevage_historique.filter(h => h.lot_id == lotId);
    }
    return this.storage.elevage_historique;
  }

  // ========== PRICING SYSTEM ==========
  
  // Save pricing grid to database
  async savePricingGrid(animalType, pricingGrid) {
    console.log('💰 savePricingGrid called');
    if (!this.storage.pricing_grids) {
      this.storage.pricing_grids = {
        poussins: [
          { ageMonths: 0, ageWeeks: 0, price: 3.50, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 4, price: 4.00, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 8, price: 4.50, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 5.00, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 6.00, sex: 'Tous' },
          { ageMonths: 3, ageWeeks: 0, price: 7.00, sex: 'Tous' }
        ],
        canards: [
          { ageMonths: 0, ageWeeks: 0, price: 4.50, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 4, price: 5.50, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 8, price: 6.50, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 7.50, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 8.50, sex: 'Tous' },
          { ageMonths: 3, ageWeeks: 0, price: 9.50, sex: 'Tous' }
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
    this.storage.pricing_grids[animalType] = pricingGrid;
    return { success: true };
  }

  // Get pricing grid from database
  async getPricingGrid(animalType) {
    console.log('💰 getPricingGrid called');
    if (!this.storage.pricing_grids) {
      this.storage.pricing_grids = {
        poussins: [
          { ageMonths: 0, ageWeeks: 0, price: 3.50, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 4, price: 4.00, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 8, price: 4.50, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 5.00, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 6.00, sex: 'Tous' },
          { ageMonths: 3, ageWeeks: 0, price: 7.00, sex: 'Tous' }
        ],
        canards: [
          { ageMonths: 0, ageWeeks: 0, price: 4.50, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 4, price: 5.50, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 8, price: 6.50, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 7.50, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 8.50, sex: 'Tous' },
          { ageMonths: 3, ageWeeks: 0, price: 9.50, sex: 'Tous' }
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
    return this.storage.pricing_grids[animalType] || [];
  }

  // Get all pricing grids
  async getAllPricingGrids() {
    console.log('💰 getAllPricingGrids called');
    if (!this.storage.pricing_grids) {
      this.storage.pricing_grids = {
        poussins: [
          { ageMonths: 0, ageWeeks: 0, price: 3.50, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 4, price: 4.00, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 8, price: 4.50, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 5.00, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 6.00, sex: 'Tous' },
          { ageMonths: 3, ageWeeks: 0, price: 7.00, sex: 'Tous' }
        ],
        canards: [
          { ageMonths: 0, ageWeeks: 0, price: 4.50, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 4, price: 5.50, sex: 'Tous' },
          { ageMonths: 0, ageWeeks: 8, price: 6.50, sex: 'Tous' },
          { ageMonths: 1, ageWeeks: 0, price: 7.50, sex: 'Tous' },
          { ageMonths: 2, ageWeeks: 0, price: 8.50, sex: 'Tous' },
          { ageMonths: 3, ageWeeks: 0, price: 9.50, sex: 'Tous' }
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
    return this.storage.pricing_grids;
  }

  // Get available animal types with pricing grids
  async getAvailableAnimalTypes() {
    console.log('💰 getAvailableAnimalTypes called');
    const grids = this.storage.pricing_grids || {};
    return Object.keys(grids);
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
    } else if (orderDetails.orderType !== 'Adoption') {
      // For non-adoption orders, use fixed pricing
      const productPricing = {
        'Poulets': { basePrice: 8.00, unit: 'kg' },
        'Œufs de conso': { basePrice: 0.25, unit: 'pièce' },
        'Œufs fécondés': { basePrice: 0.50, unit: 'pièce' },
        'Fromage': { basePrice: 12.00, unit: 'kg' }
      };
      
      const product = productPricing[orderDetails.orderType];
      if (product && orderDetails.quantity) {
        const quantity = parseInt(orderDetails.quantity) || 0;
        totalPrice = product.basePrice * quantity;
        
        priceBreakdown.push({
          product: orderDetails.orderType,
          quantity,
          unitPrice: product.basePrice.toFixed(2),
          total: totalPrice.toFixed(2),
          unit: product.unit,
          pricingSource: 'Prix fixe'
        });
      }
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
    return { insertId: formula.id };
  }

  async deleteFormula(id) {
    console.log('🗑️ deleteFormula called');
    if (this.storage.saved_formulas) {
      this.storage.saved_formulas = this.storage.saved_formulas.filter(f => f.id !== id);
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
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteTemplateMessage(id) {
    console.log('🗑️ deleteTemplateMessage called');
    if (this.storage.template_messages) {
      this.storage.template_messages = this.storage.template_messages.filter(m => m.id !== id);
    }
    return 1;
  }

  // ========== CAPRIN ANIMALS CRUD ==========
  async addCaprinAnimal(animal) {
    console.log('➕ addCaprinAnimal called');
    const newAnimal = { 
      id: Date.now(), 
      ...animal,
      milkProduction: animal.milkProduction || [],
      offspring: animal.offspring || [],
      parents: animal.parents || { mother: animal.mother || '', father: animal.father || '' }
    };
    this.storage.caprin_animals.push(newAnimal);
    return { insertId: newAnimal.id };
  }

  async getCaprinAnimals() {
    console.log('📋 getCaprinAnimals called');
    return this.storage.caprin_animals;
  }

  async updateCaprinAnimal(id, animal) {
    console.log('✏️ updateCaprinAnimal called');
    const index = this.storage.caprin_animals.findIndex(a => a.id == id);
    if (index !== -1) {
      this.storage.caprin_animals[index] = { 
        ...this.storage.caprin_animals[index], 
        ...animal,
        parents: { mother: animal.mother || this.storage.caprin_animals[index].parents.mother, 
                  father: animal.father || this.storage.caprin_animals[index].parents.father }
      };
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteCaprinAnimal(id) {
    console.log('🗑️ deleteCaprinAnimal called');
    const index = this.storage.caprin_animals.findIndex(a => a.id == id);
    if (index !== -1) {
      this.storage.caprin_animals.splice(index, 1);
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async addMilkProduction(animalId, milkData) {
    console.log('🥛 addMilkProduction called');
    const animalIndex = this.storage.caprin_animals.findIndex(a => a.id == animalId);
    if (animalIndex !== -1) {
      if (!this.storage.caprin_animals[animalIndex].milkProduction) {
        this.storage.caprin_animals[animalIndex].milkProduction = [];
      }
      this.storage.caprin_animals[animalIndex].milkProduction.push(milkData);
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
    return { insertId: Date.now() };
  }

  async getCaprinSettings() {
    console.log('⚙️ getCaprinSettings called');
    return this.storage.caprin_settings;
  }

  async updateCaprinSettings(settings) {
    console.log('⚙️ updateCaprinSettings called');
    this.storage.caprin_settings = { ...this.storage.caprin_settings, ...settings };
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
          date_creation: lot.date_creation
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
        deaths_unsexed: newDeathsUnsexed
      };
      
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
}

console.log('🏗️ Creating SimpleTestDatabaseService instance...');
const databaseService = new SimpleTestDatabaseService();
console.log('✅ SimpleTestDatabaseService created successfully');

export default databaseService;