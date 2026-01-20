import React, { useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from './src/screens/DashboardScreen';
import ProductManagementScreen from './src/screens/ProductManagementScreen';
import AnimauxScreen from './src/screens/AnimauxScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import BookingSystemScreen from './src/screens/BookingSystemScreen';
import AddOrderScreen from './src/screens/AddOrderScreen';
import OrderStatsScreen from './src/screens/OrderStatsScreen';
import ElevageScreen from './src/screens/ElevageScreen';
import EtableScreen from './src/screens/EtableScreen';
import CheeseScreen from './src/screens/CheeseScreen';

const Tab = createBottomTabNavigator();

// Create a navigator component that handles both order screens
function OrdersNavigator({ route, navigation: tabNavigation }) {
  const [currentScreen, setCurrentScreen] = useState('BookingSystem');
  const [editingOrder, setEditingOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [highlightOrderId, setHighlightOrderId] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const [statsOrders, setStatsOrders] = useState([]);

  // Handle navigation parameters from other tabs
  React.useEffect(() => {
    if (route?.params) {
      if (route.params.highlightOrderId) {
        setHighlightOrderId(route.params.highlightOrderId);
        setCustomerName(route.params.customerName);
      }
    }
  }, [route?.params]);

  const navigateToAddOrder = (order = null) => {
    setEditingOrder(order);
    setCurrentScreen('AddOrder');
  };

  const navigateToBookingSystem = () => {
    setCurrentScreen('BookingSystem');
  };

  const handleSaveOrder = (newOrder, isEditing) => {
    if (isEditing) {
      setOrders(prevOrders => 
        prevOrders.map(o => o.id === newOrder.id ? newOrder : o)
          .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      );
    } else {
      setOrders(prevOrders => [newOrder, ...prevOrders]);
    }
    navigateToBookingSystem();
  };

  const mockNavigation = {
    navigate: (screenName, params) => {
      if (screenName === 'AddOrder') {
        navigateToAddOrder(params?.editingOrder);
      } else if (screenName === 'OrderStats') {
        setStatsOrders(params?.orders || orders);
        setCurrentScreen('OrderStats');
      } else if (screenName === 'Gestion' || screenName === 'Calendrier' || screenName === 'Animaux' || screenName === 'Accueil') {
        // Use the actual tab navigation to switch to other tabs
        if (tabNavigation && tabNavigation.navigate) {
          tabNavigation.navigate(screenName, params || {});
        }
      } else {
        navigateToBookingSystem();
      }
    },
    goBack: () => {
      if (currentScreen === 'OrderStats' || currentScreen === 'AddOrder') {
        setCurrentScreen('BookingSystem');
      } else {
        navigateToBookingSystem();
      }
    },
    getParent: () => tabNavigation
  };

  if (currentScreen === 'AddOrder') {
    return (
      <AddOrderScreen 
        navigation={mockNavigation}
        route={{
          params: {
            editingOrder,
            onSaveOrder: handleSaveOrder
          }
        }}
      />
    );
  }

  if (currentScreen === 'OrderStats') {
    return (
      <OrderStatsScreen 
        navigation={mockNavigation}
        route={{
          params: {
            orders: statsOrders.length > 0 ? statsOrders : orders
          }
        }}
      />
    );
  }

  return (
    <BookingSystemScreen 
      navigation={mockNavigation}
      orders={orders}
      setOrders={setOrders}
      highlightOrderId={highlightOrderId}
      customerName={customerName}
    />
  );
}

// Create a navigator component that handles Animaux, Elevage, and Etable screens
function AnimauxNavigator({ route }) {
  const [currentScreen, setCurrentScreen] = useState('Animaux');
  const [screenParams, setScreenParams] = useState({});

  // Handle route parameters for highlighting specific animals or lots, or initialTab
  React.useEffect(() => {
    if (route?.params?.highlightAnimalId) {
      console.log('🐐 AnimauxNavigator: Received highlightAnimalId:', route.params.highlightAnimalId);
      setCurrentScreen('Etable');
      setScreenParams(route.params);
    } else if (route?.params?.highlightLotId) {
      console.log('🐓 AnimauxNavigator: Received highlightLotId:', route.params.highlightLotId);
      setCurrentScreen('Elevage');
      setScreenParams(route.params);
    } else if (route?.params?.initialTab) {
      // If initialTab is for Elevage (lots, races, historique, statistiques), go to Elevage
      // Otherwise, stay on Animaux (elevage, etable, traitements)
      const elevageTabs = ['lots', 'races', 'historique', 'statistiques'];
      if (elevageTabs.includes(route.params.initialTab)) {
        console.log('🐓 AnimauxNavigator: Received initialTab for Elevage:', route.params.initialTab);
        setCurrentScreen('Elevage');
      } else {
        console.log('🐾 AnimauxNavigator: Received initialTab for Animaux:', route.params.initialTab);
        setCurrentScreen('Animaux');
      }
      setScreenParams(route.params);
    }
  }, [route?.params]);

  const navigateToElevage = (params = {}) => {
    setCurrentScreen('Elevage');
    setScreenParams(params);
  };

  const navigateToEtable = (params = {}) => {
    setCurrentScreen('Etable');
    setScreenParams(params);
  };

  const navigateToAnimaux = (params = {}) => {
    setCurrentScreen('Animaux');
    setScreenParams(params);
  };

  const mockNavigation = {
    navigate: (screenName, params = {}) => {
      console.log('🧭 AnimauxNavigator Navigation:', screenName, 'with params:', params);
      if (screenName === 'ElevageScreen') {
        navigateToElevage(params);
      } else if (screenName === 'EtableScreen') {
        navigateToEtable(params);
      } else if (screenName === 'CheeseScreen') {
        // Navigate to Gestion tab for CheeseScreen
        // This would need to be handled by the parent tab navigator
        navigateToAnimaux(params);
      } else {
        navigateToAnimaux(params);
      }
    },
    goBack: navigateToAnimaux
  };

  // Create a route object with params for child screens
  const createRoute = (params = {}) => ({
    params: { ...route?.params, ...screenParams, ...params }
  });

  if (currentScreen === 'Elevage') {
    return (
      <ElevageScreen 
        navigation={mockNavigation}
        route={createRoute()}
      />
    );
  }

  if (currentScreen === 'Etable') {
    return (
      <EtableScreen 
        navigation={mockNavigation}
        route={createRoute()}
      />
    );
  }

  return (
    <AnimauxScreen 
      navigation={mockNavigation}
      route={createRoute()}
    />
  );
}

// Create a navigator component that handles ProductManagement, Elevage, and Caprin screens
function GestionNavigator({ route }) {
  const [currentScreen, setCurrentScreen] = useState('ProductManagement');
  const [screenParams, setScreenParams] = useState({});

  // Handle route parameters for highlighting specific animals or lots, or initialTab
  React.useEffect(() => {
    if (route?.params?.highlightAnimalId) {
      console.log('🐐 GestionNavigator: Received highlightAnimalId:', route.params.highlightAnimalId);
      setCurrentScreen('Etable');
      setScreenParams(route.params);
    } else if (route?.params?.highlightLotId) {
      console.log('🐓 GestionNavigator: Received highlightLotId:', route.params.highlightLotId);
      setCurrentScreen('Elevage');  
      setScreenParams(route.params);
    } else if (route?.params?.initialTab) {
      // If initialTab is for Elevage (lots, races, historique, statistiques), go to Elevage
      // If initialTab is for Animaux (elevage, etable, traitements), navigate to Animaux tab
      // Otherwise, stay on ProductManagement (productions, activites, client)
      const elevageTabs = ['lots', 'races', 'historique', 'statistiques'];
      const animauxTabs = ['elevage', 'etable', 'traitements'];
      if (elevageTabs.includes(route.params.initialTab)) {
        console.log('🐓 GestionNavigator: Received initialTab for Elevage:', route.params.initialTab);
        setCurrentScreen('Elevage');
      } else if (animauxTabs.includes(route.params.initialTab)) {
        console.log('🐾 GestionNavigator: Received initialTab for Animaux, should navigate to Animaux tab');
        // Note: Navigation to another tab would need to be handled by parent navigator
        setCurrentScreen('ProductManagement');
      } else {
        console.log('📦 GestionNavigator: Received initialTab for ProductManagement:', route.params.initialTab);
        setCurrentScreen('ProductManagement');
      }
      setScreenParams(route.params);
    }
  }, [route?.params]);

  const navigateToProductManagement = (params = {}) => {
    setCurrentScreen('ProductManagement');
    setScreenParams(params);
  };

  const navigateToCheese = (params = {}) => {
    setCurrentScreen('Cheese');
    setScreenParams(params);
  };

  const mockNavigation = {
    navigate: (screenName, params = {}) => {
      console.log('🧭 GestionNavigator Navigation:', screenName, 'with params:', params);
      if (screenName === 'ElevageScreen' || screenName === 'EtableScreen') {
        // These should navigate to Animaux tab - would need parent navigator
        // For now, just stay on ProductManagement
        navigateToProductManagement(params);
      } else if (screenName === 'CheeseScreen') {
        navigateToCheese(params);
      } else {
        navigateToProductManagement(params);
      }
    },
    goBack: navigateToProductManagement
  };

  // Create a route object with params for child screens
  const createRoute = (params = {}) => ({
    params: { ...route?.params, ...screenParams, ...params }
  });

  if (currentScreen === 'Cheese') {
    return (
      <CheeseScreen 
        navigation={mockNavigation}
        route={route}
      />
    );
  }

  return (
    <ProductManagementScreen 
      navigation={mockNavigation}
      route={createRoute()}
    />
  );
}

// Component that uses safe area insets for tab bar
function TabNavigatorWithSafeArea() {
  const insets = useSafeAreaInsets();
  
  // Calculate bottom padding: base padding + safe area inset
  // For devices with gesture navigation, insets.bottom will be > 0
  // For devices with button navigation, insets.bottom will be 0 or small
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10);
  const tabBarHeight = 55 + bottomPadding; // Reduced base height + safe area
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: bottomPadding,
          paddingTop: 4,
          paddingHorizontal: 4,
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        }
      }}
    >
            <Tab.Screen 
              name="Accueil" 
              component={({ navigation }) => <DashboardScreen navigation={navigation} />}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 18, color }}>🏠</Text>
                ),
              }}
            />
            
            <Tab.Screen 
              name="Animaux" 
              component={AnimauxNavigator}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 18, color }}>🐾</Text>
                ),
              }}
            />
            
            <Tab.Screen 
              name="Gestion" 
              component={GestionNavigator}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 18, color }}>📦</Text>
                ),
              }}
            />
            <Tab.Screen 
              name="Calendrier" 
              component={CalendarScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 18, color }}>📅</Text>
                ),
              }}
            />
            <Tab.Screen 
              name="Commandes" 
              component={({ navigation, route }) => <OrdersNavigator navigation={navigation} route={route} />}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 18, color }}>🛒</Text>
                ),
              }}
            />
          </Tab.Navigator>
  );
}

export default function App() {
  console.log('🚀 Application Ferme démarrant...');
  
  try {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
          <NavigationContainer>
            <TabNavigatorWithSafeArea />
          </NavigationContainer>
        </View>
      </SafeAreaProvider>
    );
  } catch (error) {
    console.error('❌ App Error:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: 'red', textAlign: 'center' }}>
          Erreur Application: {error.message}
        </Text>
      </View>
    );
  }
}
