// Fallback to React Native's built-in storage if AsyncStorage is not available
let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (error) {
  console.warn('AsyncStorage not available, using in-memory storage fallback');
  // Fallback to in-memory storage
  AsyncStorage = {
    setItem: async (key, value) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      // In-memory fallback
      if (!global.__configStorage) {
        global.__configStorage = {};
      }
      global.__configStorage[key] = value;
    },
    getItem: async (key) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      // In-memory fallback
      if (!global.__configStorage) {
        global.__configStorage = {};
      }
      return global.__configStorage[key] || null;
    },
    multiRemove: async (keys) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        keys.forEach(key => window.localStorage.removeItem(key));
      }
      // In-memory fallback
      if (!global.__configStorage) {
        global.__configStorage = {};
      }
      keys.forEach(key => delete global.__configStorage[key]);
    }
  };
}

class ConfigService {
  constructor() {
    this.configKeys = {
      CAPRIN_MILK_METHOD: 'caprin_milk_method',
      CAPRIN_GRAPH_PERIOD: 'caprin_graph_period',
      ELEVAGE_MANUAL_INPUT_EXPANDED: 'elevage_manual_input_expanded',
      ELEVAGE_COLLAPSED_LOTS: 'elevage_collapsed_lots',
      PRODUCT_MANAGEMENT_ACTIVE_TAB: 'product_management_active_tab',
      PRODUCT_MANAGEMENT_SELECTED_ANIMAL_TYPE: 'product_management_selected_animal_type',
      CALENDAR_VIEW_MODE: 'calendar_view_mode',
      DASHBOARD_STATS_EXPANDED: 'dashboard_stats_expanded',
      ADD_ORDER_EXPANDED_ANIMALS: 'add_order_expanded_animals',
      BOOKING_SYSTEM_FILTER_STATUS: 'booking_system_filter_status',
      BOOKING_SYSTEM_SORT_ORDER: 'booking_system_sort_order'
    };
  }

  // Generic save method
  async saveConfig(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      console.log(`✅ Config saved: ${key}`, value);
    } catch (error) {
      console.error(`❌ Error saving config ${key}:`, error);
    }
  }

  // Generic load method
  async loadConfig(key, defaultValue = null) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`❌ Error loading config ${key}:`, error);
      return defaultValue;
    }
  }

  // Caprin Screen Configs
  async saveCaprinMilkMethod(method) {
    await this.saveConfig(this.configKeys.CAPRIN_MILK_METHOD, method);
  }

  async loadCaprinMilkMethod() {
    return await this.loadConfig(this.configKeys.CAPRIN_MILK_METHOD, 'group');
  }

  async saveCaprinGraphPeriod(period) {
    await this.saveConfig(this.configKeys.CAPRIN_GRAPH_PERIOD, period);
  }

  async loadCaprinGraphPeriod() {
    return await this.loadConfig(this.configKeys.CAPRIN_GRAPH_PERIOD, 7);
  }

  // Elevage Screen Configs
  async saveElevageManualInputExpanded(expanded) {
    await this.saveConfig(this.configKeys.ELEVAGE_MANUAL_INPUT_EXPANDED, expanded);
  }

  async loadElevageManualInputExpanded() {
    return await this.loadConfig(this.configKeys.ELEVAGE_MANUAL_INPUT_EXPANDED, false);
  }

  async saveElevageCollapsedLots(collapsedLots) {
    await this.saveConfig(this.configKeys.ELEVAGE_COLLAPSED_LOTS, collapsedLots);
  }

  async loadElevageCollapsedLots() {
    return await this.loadConfig(this.configKeys.ELEVAGE_COLLAPSED_LOTS, {});
  }

  // Product Management Screen Configs
  async saveProductManagementActiveTab(tab) {
    await this.saveConfig(this.configKeys.PRODUCT_MANAGEMENT_ACTIVE_TAB, tab);
  }

  async loadProductManagementActiveTab() {
    return await this.loadConfig(this.configKeys.PRODUCT_MANAGEMENT_ACTIVE_TAB, 'elevage');
  }

  async saveProductManagementSelectedAnimalType(animalType) {
    await this.saveConfig(this.configKeys.PRODUCT_MANAGEMENT_SELECTED_ANIMAL_TYPE, animalType);
  }

  async loadProductManagementSelectedAnimalType() {
    return await this.loadConfig(this.configKeys.PRODUCT_MANAGEMENT_SELECTED_ANIMAL_TYPE, 'poussins');
  }

  // Add Order Screen Configs
  async saveAddOrderExpandedAnimals(expandedAnimals) {
    await this.saveConfig(this.configKeys.ADD_ORDER_EXPANDED_ANIMALS, expandedAnimals);
  }

  async loadAddOrderExpandedAnimals() {
    return await this.loadConfig(this.configKeys.ADD_ORDER_EXPANDED_ANIMALS, { poussins: true });
  }

  // Booking System Screen Configs
  async saveBookingSystemFilterStatus(status) {
    await this.saveConfig(this.configKeys.BOOKING_SYSTEM_FILTER_STATUS, status);
  }

  async loadBookingSystemFilterStatus() {
    return await this.loadConfig(this.configKeys.BOOKING_SYSTEM_FILTER_STATUS, 'all');
  }

  async saveBookingSystemSortOrder(order) {
    await this.saveConfig(this.configKeys.BOOKING_SYSTEM_SORT_ORDER, order);
  }

  async loadBookingSystemSortOrder() {
    return await this.loadConfig(this.configKeys.BOOKING_SYSTEM_SORT_ORDER, 'date_desc');
  }

  // Clear all configs (for debugging)
  async clearAllConfigs() {
    try {
      const keys = Object.values(this.configKeys);
      await AsyncStorage.multiRemove(keys);
      console.log('✅ All configs cleared');
    } catch (error) {
      console.error('❌ Error clearing configs:', error);
    }
  }

  // Get all configs (for debugging)
  async getAllConfigs() {
    try {
      const configs = {};
      for (const [name, key] of Object.entries(this.configKeys)) {
        configs[name] = await this.loadConfig(key);
      }
      return configs;
    } catch (error) {
      console.error('❌ Error getting all configs:', error);
      return {};
    }
  }
}

export default new ConfigService();