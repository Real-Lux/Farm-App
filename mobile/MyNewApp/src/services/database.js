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
}

console.log('🏗️ Creating SimpleTestDatabaseService instance...');
const databaseService = new SimpleTestDatabaseService();
console.log('✅ SimpleTestDatabaseService created successfully');

export default databaseService;