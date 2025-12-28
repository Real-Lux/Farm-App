import React, { useEffect, useRef } from 'react';
import dataEventService from '../services/dataEventService';

/**
 * Hook to automatically refresh data when events are emitted
 * 
 * Usage:
 * 
 * const loadProducts = async () => { ... };
 * useDataRefresh('products', loadProducts);
 * 
 * Or for multiple event types:
 * 
 * useDataRefresh(['products', 'orders'], () => {
 *   loadProducts();
 *   loadOrders();
 * });
 * 
 * @param {string|string[]} eventTypes - Event type(s) to listen to
 * @param {Function} refreshCallback - Function to call when event is emitted
 * @param {Array} dependencies - Optional dependencies array (like useEffect)
 */
export function useDataRefresh(eventTypes, refreshCallback, dependencies = []) {
  // Initialize with a no-op function if callback is not provided
  const safeCallback = refreshCallback && typeof refreshCallback === 'function' 
    ? refreshCallback 
    : () => {
        console.warn('⚠️ useDataRefresh: refreshCallback is not a function');
      };
  
  const callbackRef = useRef(safeCallback);
  
  // Keep callback ref up to date
  useEffect(() => {
    if (refreshCallback && typeof refreshCallback === 'function') {
      callbackRef.current = refreshCallback;
    } else {
      console.warn('⚠️ useDataRefresh: refreshCallback is not a function:', typeof refreshCallback);
      // Set to a no-op function instead of null to prevent errors
      callbackRef.current = () => {
        console.warn('⚠️ useDataRefresh: callback was not a function, skipping refresh');
      };
    }
  }, [refreshCallback]);

  useEffect(() => {
    const eventTypesArray = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const unsubscribes = [];

    eventTypesArray.forEach(eventType => {
      const unsubscribe = dataEventService.subscribe(eventType, (data) => {
        console.log(`🔄 useDataRefresh: ${eventType} event received, refreshing...`);
        if (callbackRef.current && typeof callbackRef.current === 'function') {
          callbackRef.current(data);
        } else {
          console.warn(`⚠️ useDataRefresh: callbackRef.current is not a function for ${eventType}. It is:`, typeof callbackRef.current);
        }
      });
      unsubscribes.push(unsubscribe);
    });

    // Cleanup: unsubscribe when component unmounts or dependencies change
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [eventTypes, ...dependencies]);
}

/**
 * Hook to refresh data when screen comes into focus AND when events are emitted
 * Combines useFocusEffect with useDataRefresh
 * 
 * Usage:
 * 
 * useDataRefreshOnFocus('products', loadProducts);
 */
export function useDataRefreshOnFocus(eventTypes, refreshCallback, dependencies = []) {
  const { useFocusEffect } = require('@react-navigation/native');
  
  // Refresh on focus
  useFocusEffect(
    React.useCallback(() => {
      console.log(`🔄 useDataRefreshOnFocus: Screen focused, refreshing ${Array.isArray(eventTypes) ? eventTypes.join(', ') : eventTypes}...`);
      refreshCallback();
    }, [refreshCallback, ...dependencies])
  );

  // Also refresh on events
  useDataRefresh(eventTypes, refreshCallback, dependencies);
}

// Re-export for convenience
export default useDataRefresh;

