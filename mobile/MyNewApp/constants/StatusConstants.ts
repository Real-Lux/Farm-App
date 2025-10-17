// Centralized status constants for orders and events
// This file contains all status colors, icons, and related constants
// Update these values here to change them across the entire app

export const ORDER_STATUSES = [
  'En attente',
  'Confirmée', 
  'En préparation',
  'Prête',
  'Livrée',
  'Annulée'
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

// Status colors - consistent across all screens
export const STATUS_COLORS = {
  'En attente': '#FF9800',    // Orange
  'Confirmée': '#2196F3',     // Blue
  'En préparation': '#9C27B0', // Purple
  'Prête': '#4CAF50',         // Green
  'Livrée': '#4CAF50',        // Green
  'Annulée': '#F44336',       // Red
  'default': '#607D8B'        // Gray
} as const;

// Status icons - consistent across all screens
export const STATUS_ICONS = {
  'En attente': '⏳',
  'Confirmée': '✅',
  'En préparation': '👨‍🍳',
  'Prête': '📦',
  'Livrée': '🚚',
  'Annulée': '❌',
  'default': '📋'
} as const;

// Event type colors for calendar
export const EVENT_COLORS = {
  'Alimentation': '#4CAF50',
  'Entretien': '#FF9800',
  'Soins': '#2196F3',
  'Reproduction': '#8BC34A',
  'Vétérinaire': '#9C27B0',
  'Récupération': '#2196F3', // Blue for order pickups (commandes)
  'Autre': '#607D8B',
  // Gestion-related events (purple)
  'Création lot': '#9C27B0',
  'Éclosion': '#9C27B0',
  'Mort': '#9C27B0',
  'Sexage': '#9C27B0'
} as const;

// Helper functions
export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status as OrderStatus] || STATUS_COLORS.default;
};

export const getStatusIcon = (status: string): string => {
  return STATUS_ICONS[status as OrderStatus] || STATUS_ICONS.default;
};

export const getEventColor = (eventType: string): string => {
  return EVENT_COLORS[eventType as keyof typeof EVENT_COLORS] || EVENT_COLORS['Autre'];
};
