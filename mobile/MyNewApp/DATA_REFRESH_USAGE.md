# Data Refresh System - Usage Guide

This app uses an **event-based data refresh system** to ensure all screens update instantly when data changes anywhere in the app.

## How It Works

1. **Database Service** emits events when data is added, updated, or deleted
2. **Screens subscribe** to these events and automatically refresh their data
3. **No manual reloading needed** - everything updates automatically!

## Quick Start

### Option 1: Using the `useDataRefresh` Hook (Recommended)

```javascript
import { useDataRefresh } from '../hooks/useDataRefresh';

function ProductManagementScreen() {
  const [products, setProducts] = useState([]);

  const loadProducts = async () => {
    const data = await database.getProducts();
    setProducts(data);
  };

  // Automatically refresh when 'products' events are emitted
  useDataRefresh('products', loadProducts);

  // Also load on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // ... rest of your component
}
```

### Option 2: Using `useDataRefreshOnFocus` (Refresh on focus + events)

```javascript
import { useDataRefreshOnFocus } from '../hooks/useDataRefresh';

function ProductManagementScreen() {
  const [products, setProducts] = useState([]);

  const loadProducts = async () => {
    const data = await database.getProducts();
    setProducts(data);
  };

  // Refresh when screen comes into focus AND on events
  useDataRefreshOnFocus('products', loadProducts);

  // ... rest of your component
}
```

### Option 3: Manual Subscription (Advanced)

```javascript
import dataEventService from '../services/dataEventService';

function ProductManagementScreen() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const unsubscribe = dataEventService.subscribe('products', () => {
      loadProducts();
    });

    // Cleanup on unmount
    return unsubscribe;
  }, []);

  // ... rest of your component
}
```

## Available Event Types

- `'products'` - Product changes
- `'orders'` - Order changes
- `'lots'` - Elevage lot changes
- `'races'` - Race changes
- `'herd_animals'` - Herd animal changes
- `'animal_types'` - Animal type changes
- `'herd_types'` - Herd type changes
- `'events'` - Calendar event changes
- `'activities'` - Activity changes
- `'messages'` - Message changes
- `'cheese'` - Cheese changes
- `'elevage'` - Any elevage-related change
- `'etable'` - Any etable-related change
- `'calendar'` - Any calendar-related change
- `'dashboard'` - Any dashboard-related change
- `'all'` - Listen to ALL events

## Multiple Event Types

```javascript
// Listen to multiple event types
useDataRefresh(['products', 'orders'], () => {
  loadProducts();
  loadOrders();
});
```

## Examples by Screen

### ProductManagementScreen
```javascript
useDataRefresh('products', loadProducts);
useDataRefresh('messages', loadTemplateMessages);
```

### AnimauxScreen
```javascript
useDataRefresh('animal_types', loadAnimalTypes);
useDataRefresh('herd_types', loadHerdTypes);
useDataRefresh('lots', () => {
  loadAnimalTypes();
  loadAnimalTypeStats();
});
```

### ElevageScreen
```javascript
useDataRefresh('lots', loadLots);
useDataRefresh('races', loadRaces);
```

### EtableScreen
```javascript
useDataRefresh('herd_animals', loadAnimals);
useDataRefresh('herd_types', loadHerdTypes);
```

### CalendarScreen
```javascript
useDataRefresh('events', loadEvents);
useDataRefresh('orders', loadEvents); // Orders also affect calendar
useDataRefresh('lots', loadEvents); // Lots also affect calendar
```

### DashboardScreen
```javascript
useDataRefresh(['products', 'orders', 'lots', 'herd_animals'], loadDashboardData);
```

## Benefits

✅ **Instant Updates** - No need to manually reload when navigating between screens
✅ **Automatic Sync** - All screens stay in sync automatically
✅ **Less Code** - No need to call `loadProducts()` after every save
✅ **Better UX** - Users see changes immediately

## Migration Guide

### Before (Manual Reloading)
```javascript
const saveProduct = async () => {
  await database.addProduct(product);
  loadProducts(); // Manual reload
  setModalVisible(false);
};
```

### After (Automatic)
```javascript
const saveProduct = async () => {
  await database.addProduct(product);
  // Event is automatically emitted, all subscribed screens refresh!
  setModalVisible(false);
};
```

## Notes

- Events are emitted automatically by the database service
- You don't need to emit events manually in your screens
- The system is backward compatible - existing code still works
- Events are lightweight and don't affect performance



