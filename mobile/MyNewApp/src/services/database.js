// Simple test database service - no external dependencies
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
        { id: 1, customer_name: 'Marie Dupont', total_amount: 25.50, status: 'en attente', product: 'Œufs de consommation' },
        { id: 2, customer_name: 'Pierre Martin', total_amount: 15.00, status: 'terminé', product: 'Visite guidée' }
      ],
      calendar_events: [
        { id: 1, title: 'Nettoyage poulaillers', date: '2024-01-20', type: 'Entretien', product: 'Poules', notes: 'Nettoyage hebdomadaire' },
        { id: 2, title: 'Alimentation lapins', date: '2024-01-21', type: 'Alimentation', product: 'Lapins', notes: 'Foin et granulés' }
      ],
      elevage_lots: [
        { 
          id: 1, 
          name: 'Lot Janvier 2024', 
          date_creation: '2024-01-15',
          date_eclosion: '2024-02-05',
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
          name: 'Lot Février 2024', 
          date_creation: '2024-02-15',
          date_eclosion: '2024-03-07',
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
        { id: 1, name: 'Marans', type: 'poules', description: 'Poules pondeuses aux œufs chocolat' },
        { id: 2, name: 'Araucana', type: 'poules', description: 'Poules aux œufs bleus' },
        { id: 3, name: 'Cream Legbar', type: 'poules', description: 'Poules croisées aux œufs bleus' },
        { id: 4, name: 'Leghorn', type: 'poules', description: 'Excellentes pondeuses blanches' },
        { id: 5, name: 'Pekin', type: 'poules', description: 'Poules naines ornementales' },
        { id: 6, name: 'Coureur indien', type: 'canards', description: 'Canards excellents coureurs' },
        { id: 7, name: 'Cayuga', type: 'canards', description: 'Canards aux reflets verts' },
        { id: 8, name: 'Barbarie', type: 'canards', description: 'Canards de chair' }
      ],
      elevage_historique: [
        {
          id: 1,
          lot_id: 1,
          date: '2024-01-20',
          type: 'Mort',
          description: 'Mort de 2 Marans - cause naturelle',
          race: 'Marans',
          quantity: -2
        },
        {
          id: 2,
          lot_id: 1,
          date: '2024-01-25',
          type: 'Sexage',
          description: 'Identification des sexes pour les Araucana',
          race: 'Araucana',
          quantity: 0
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
    return { insertId: newOrder.id };
  }

  async getOrders() {
    console.log('📋 getOrders called - returning test data');
    return this.storage.orders;
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
    console.log('📤 exportToCSV called');
    return 'export_simulated';
  }

  async importFromCSV(tableName, csvContent) {
    console.log('📥 importFromCSV called');
    return 1;
  }

  async backupDatabase() {
    console.log('💾 backupDatabase called');
    return 'backup_simulated';
  }

  async getTableData(tableName) {
    console.log('📋 getTableData called');
    return this.storage[tableName] || [];
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
          date: new Date().toISOString().split('T')[0],
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
          date: new Date().toISOString().split('T')[0],
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
}

console.log('🏗️ Creating SimpleTestDatabaseService instance...');
const databaseService = new SimpleTestDatabaseService();
console.log('✅ SimpleTestDatabaseService created successfully');

export default databaseService;