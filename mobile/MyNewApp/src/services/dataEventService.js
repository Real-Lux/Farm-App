/**
 * Data Event Service
 * 
 * This service provides a centralized event system for data updates across the app.
 * When data is added, updated, or deleted, events are emitted and all subscribed
 * screens automatically refresh their data.
 * 
 * Usage in screens:
 * 
 * import dataEventService from '../services/dataEventService';
 * 
 * useEffect(() => {
 *   const unsubscribe = dataEventService.subscribe('products', () => {
 *     loadProducts(); // Reload your data
 *   });
 *   return unsubscribe; // Cleanup on unmount
 * }, []);
 */

class DataEventService {
  constructor() {
    this.listeners = {};
    console.log('📡 DataEventService initialized');
  }

  /**
   * Subscribe to data change events
   * @param {string} eventType - The type of data (e.g., 'products', 'orders', 'lots', 'animals', 'herd_animals', 'all')
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    
    this.listeners[eventType].push(callback);
    console.log(`📡 Subscribed to ${eventType} events. Total listeners: ${this.listeners[eventType].length}`);
    
    // Return unsubscribe function
    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
      console.log(`📡 Unsubscribed from ${eventType} events. Remaining listeners: ${this.listeners[eventType].length}`);
    };
  }

  /**
   * Emit an event to notify all subscribers
   * @param {string} eventType - The type of data that changed
   * @param {Object} data - Optional data to pass to listeners
   */
  emit(eventType, data = null) {
    console.log(`📡 Emitting ${eventType} event`, data ? `with data: ${JSON.stringify(data).substring(0, 100)}` : '');
    
    // Notify specific listeners
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in ${eventType} listener:`, error);
        }
      });
    }
    
    // Notify 'all' listeners (for screens that need to refresh everything)
    if (this.listeners['all']) {
      this.listeners['all'].forEach(callback => {
        try {
          callback({ eventType, data });
        } catch (error) {
          console.error(`❌ Error in 'all' listener:`, error);
        }
      });
    }
  }

  /**
   * Convenience methods for common data types
   */
  emitProductChange(data = null) {
    this.emit('products', data);
  }

  emitOrderChange(data = null) {
    this.emit('orders', data);
    // Orders might affect calendar too
    this.emit('calendar', data);
  }

  emitLotChange(data = null) {
    this.emit('lots', data);
    this.emit('elevage', data);
    // Lots affect calendar and dashboard
    this.emit('calendar', data);
    this.emit('dashboard', data);
  }

  emitAnimalTypeChange(data = null) {
    this.emit('animal_types', data);
    this.emit('elevage', data);
  }

  emitHerdTypeChange(data = null) {
    this.emit('herd_types', data);
    this.emit('etable', data);
  }

  emitHerdAnimalChange(data = null) {
    this.emit('herd_animals', data);
    this.emit('etable', data);
    this.emit('calendar', data);
    this.emit('dashboard', data);
  }

  emitRaceChange(data = null) {
    this.emit('races', data);
    this.emit('elevage', data);
  }

  emitEventChange(data = null) {
    this.emit('events', data);
    this.emit('calendar', data);
  }

  emitActivityChange(data = null) {
    this.emit('activities', data);
  }

  emitMessageChange(data = null) {
    this.emit('messages', data);
  }

  emitCheeseChange(data = null) {
    this.emit('cheese', data);
  }

  emitEggProductionChange(data = null) {
    this.emit('egg_production', data);
  }

  /**
   * Emit a change for multiple related data types
   * Useful when one action affects multiple data types
   */
  emitMultipleChanges(eventTypes, data = null) {
    eventTypes.forEach(eventType => {
      this.emit(eventType, data);
    });
  }
}

// Export singleton instance
const dataEventService = new DataEventService();
export default dataEventService;

