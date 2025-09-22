import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StatusBar } from 'react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import ProductManagementScreen from './src/screens/ProductManagementScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import BookingSystemScreen from './src/screens/BookingSystemScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  console.log('🚀 Application Ferme démarrant...');
  
  try {
    return (
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
              paddingBottom: 5,
              paddingTop: 5,
              height: 60,
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
            component={ProductManagementScreen}
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
            component={BookingSystemScreen}
            options={{
              tabBarIcon: ({ color }) => (
                <Text style={{ fontSize: 20, color }}>🛒</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
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
