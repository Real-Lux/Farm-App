import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DashboardScreen from './src/screens/DashboardScreen';
import ProductManagementScreen from './src/screens/ProductManagementScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import BookingSystemScreen from './src/screens/BookingSystemScreen';
import AddOrderScreen from './src/screens/AddOrderScreen';
import ElevageScreen from './src/screens/ElevageScreen';

const Tab = createBottomTabNavigator();

// Create a navigator component that handles both order screens
function OrdersNavigator({ route }) {
  const [currentScreen, setCurrentScreen] = useState('BookingSystem');
  const [editingOrder, setEditingOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [highlightOrderId, setHighlightOrderId] = useState(null);
  const [customerName, setCustomerName] = useState(null);

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
      } else {
        navigateToBookingSystem();
      }
    },
    goBack: navigateToBookingSystem
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

// Create a navigator component that handles ProductManagement and Elevage screens
function GestionNavigator() {
  const [currentScreen, setCurrentScreen] = useState('ProductManagement');

  const navigateToElevage = () => {
    setCurrentScreen('Elevage');
  };

  const navigateToProductManagement = () => {
    setCurrentScreen('ProductManagement');
  };

  const mockNavigation = {
    navigate: (screenName, params) => {
      if (screenName === 'ElevageScreen') {
        navigateToElevage();
      } else {
        navigateToProductManagement();
      }
    },
    goBack: navigateToProductManagement
  };

  if (currentScreen === 'Elevage') {
    return (
      <ElevageScreen 
        navigation={mockNavigation}
      />
    );
  }

  return (
    <ProductManagementScreen 
      navigation={mockNavigation}
    />
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
          <Tab.Navigator
            screenOptions={{
              tabBarActiveTintColor: '#4CAF50',
              tabBarInactiveTintColor: '#999',
              headerShown: false,
              tabBarStyle: {
                backgroundColor: 'white',
                borderTopWidth: 1,
                borderTopColor: '#e0e0e0',
                paddingBottom: 25,
                paddingTop: 8,
                height: 85,
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '600',
              }
            }}
          >
            <Tab.Screen 
              name="Accueil" 
              component={DashboardScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 20, color }}>🏠</Text>
                ),
              }}
            />
            
            <Tab.Screen 
              name="Gestion" 
              component={GestionNavigator}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 20, color }}>📦</Text>
                ),
              }}
            />
            <Tab.Screen 
              name="Calendrier" 
              component={CalendarScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 20, color }}>📅</Text>
                ),
              }}
            />
            <Tab.Screen 
              name="Commandes" 
              component={OrdersNavigator}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 20, color }}>🛒</Text>
                ),
              }}
            />
          </Tab.Navigator>
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
