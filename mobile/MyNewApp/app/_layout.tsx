import React from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function TabLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#4CAF50" />
      <Tabs
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
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => (
              <span style={{ fontSize: 20, color }}>🏠</span>
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Products',
            tabBarIcon: ({ color }) => (
              <span style={{ fontSize: 20, color }}>📦</span>
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => (
              <span style={{ fontSize: 20, color }}>📅</span>
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color }) => (
              <span style={{ fontSize: 20, color }}>🛒</span>
            ),
          }}
        />
      </Tabs>
    </>
  );
}
