import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

class CSVStorageService {
  constructor() {
    this.documentsDir = FileSystem.documentDirectory;
    this.storage = {
      products: [],
      orders: [],
      calendar_events: []
    };
    this.initStorage();
  }

  async initStorage() {
    console.log('📁 Initializing CSV storage...');
    
    if (Platform.OS === 'web') {
      // For web, use localStorage as backup
      this.loadFromLocalStorage();
      console.log('✅ Using localStorage for web');
    } else {
      // For mobile, try to load existing CSV files
      await this.loadAllCSVFiles();
      console.log('✅ CSV storage initialized');
    }
  }

  // ========== FILE OPERATIONS ==========

  async loadAllCSVFiles() {
    try {
      await this.loadFromCSV('products');
      await this.loadFromCSV('orders');
      await this.loadFromCSV('calendar_events');
    } catch (error) {
      console.log('📝 No existing CSV files found, starting fresh');
    }
  }

  async loadFromCSV(tableName) {
    if (Platform.OS === 'web') return;

    try {
      const filePath = `${this.documentsDir}${tableName}.csv`;
      const fileExists = await FileSystem.getInfoAsync(filePath);
      
      if (fileExists.exists) {
        const csvContent = await FileSystem.readAsStringAsync(filePath);
        this.storage[tableName] = this.parseCSV(csvContent);
        console.log(`✅ Loaded ${this.storage[tableName].length} ${tableName} from CSV`);
      }
    } catch (error) {
      console.log(`📝 No ${tableName}.csv file found`);
    }
  }

  async saveToCSV(tableName) {
    if (Platform.OS === 'web') {
      this.saveToLocalStorage();
      return;
    }

    try {
      const csvContent = this.generateCSV(this.storage[tableName]);
      const filePath = `${this.documentsDir}${tableName}.csv`;
      await FileSystem.writeAsStringAsync(filePath, csvContent);
      console.log(`💾 Saved ${tableName} to CSV`);
    } catch (error) {
      console.error(`Error saving ${tableName} to CSV:`, error);
    }
  }

  // ========== CSV PARSING ==========

  generateCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
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

  parseCSV(csvContent) {
    if (!csvContent.trim()) return [];
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const item = {};
        headers.forEach((header, index) => {
          item[header] = values[index];
        });
        data.push(item);
      }
    }
    
    return data;
  }

  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current);
    return values;
  }

  // ========== WEB STORAGE (localStorage) ==========

  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('farmapp_data');
      if (stored) {
        this.storage = JSON.parse(stored);
      }
    } catch (error) {
      console.log('No localStorage data found');
    }
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem('farmapp_data', JSON.stringify(this.storage));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  // ========== PRODUCTS CRUD ==========

  async addProduct(product) {
    const newProduct = {
      id: Date.now(),
      ...product,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.storage.products.push(newProduct);
    await this.saveToCSV('products');
    return { insertId: newProduct.id };
  }

  async getProducts() {
    console.log('📁 CSVStorage.getProducts() called, returning:', this.storage.products.length, 'products');
    return this.storage.products;
  }

  async updateProduct(id, product) {
    const index = this.storage.products.findIndex(p => p.id == id);
    if (index !== -1) {
      this.storage.products[index] = {
        ...this.storage.products[index],
        ...product,
        updated_at: new Date().toISOString()
      };
      await this.saveToCSV('products');
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  async deleteProduct(id) {
    const index = this.storage.products.findIndex(p => p.id == id);
    if (index !== -1) {
      this.storage.products.splice(index, 1);
      await this.saveToCSV('products');
      return { rowsAffected: 1 };
    }
    return { rowsAffected: 0 };
  }

  // ========== ORDERS CRUD ==========

  async addOrder(order) {
    const newOrder = {
      id: Date.now(),
      ...order,
      order_date: new Date().toISOString()
    };
    
    this.storage.orders.push(newOrder);
    await this.saveToCSV('orders');
    return { insertId: newOrder.id };
  }

  async getOrders() {
    return this.storage.orders;
  }

  // ========== CALENDAR EVENTS CRUD ==========

  async addEvent(event) {
    const newEvent = {
      id: Date.now(),
      ...event,
      created_at: new Date().toISOString()
    };
    
    this.storage.calendar_events.push(newEvent);
    await this.saveToCSV('calendar_events');
    return { insertId: newEvent.id };
  }

  async getEvents() {
    return this.storage.calendar_events;
  }

  // ========== EXPORT/IMPORT ==========

  async exportToCSV(tableName) {
    const data = this.storage[tableName] || [];
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const csvContent = this.generateCSV(data);
    const fileName = `${tableName}_${new Date().toISOString().split('T')[0]}.csv`;

    if (Platform.OS === 'web') {
      // Web download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      return 'exported';
    } else {
      // Mobile share
      const fileUri = `${this.documentsDir}export_${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Export ${tableName} data`
        });
      }
      return fileUri;
    }
  }

  async backupDatabase() {
    const backupData = {
      products: this.storage.products,
      orders: this.storage.orders,
      calendar_events: this.storage.calendar_events,
      backup_date: new Date().toISOString()
    };

    const fileName = `farmapp_backup_${new Date().toISOString().split('T')[0]}.json`;

    if (Platform.OS === 'web') {
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      return 'backup_created';
    } else {
      const fileUri = `${this.documentsDir}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Backup Farm App Data'
        });
      }
      return fileUri;
    }
  }

  async getTableData(tableName) {
    return this.storage[tableName] || [];
  }

  // ========== IMPORT CSV ==========

  async importFromCSV(tableName, csvContent) {
    try {
      const newData = this.parseCSV(csvContent);
      // Add unique IDs to imported data
      newData.forEach(item => {
        if (!item.id) {
          item.id = Date.now() + Math.random();
        }
      });
      
      this.storage[tableName] = [...this.storage[tableName], ...newData];
      await this.saveToCSV(tableName);
      return newData.length;
    } catch (error) {
      throw new Error(`Failed to import CSV: ${error.message}`);
    }
  }
}

export default new CSVStorageService();
