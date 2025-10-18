// Centralized status constants for orders and events
// This file contains all status colors, icons, and related constants
// Update these values here to change them across the entire app

export const ORDER_STATUSES = [
  'En attente',
  'Confirmée', 
  'Prête',
  'Livrée',
  'Annulée'
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

// Status definitions with descriptions for operators
export const STATUS_DEFINITIONS = {
  'En attente': {
    description: 'Commande vérifiée mais pas encore confirmée. Les animaux sont retirés du lot et ne sont plus disponibles pour d\'autres clients.',
    color: '#FF9800',
    icon: '⏳',
    priority: 1,
    affectsInventory: true,
    requiresAction: true
  },
  'Confirmée': {
    description: 'Le client a répondu et accepté le prix et la date. Commande validée.',
    color: '#2196F3',
    icon: '✅',
    priority: 2,
    affectsInventory: true,
    requiresAction: false
  },
  'Prête': {
    description: 'Les races sont disponibles et prêtes à être fournies. Commande prête pour la récupération.',
    color: '#9C27B0',
    icon: '📦',
    priority: 3,
    affectsInventory: true,
    requiresAction: true
  },
  'Livrée': {
    description: 'Commande payée et récupérée par le client. Transaction terminée.',
    color: '#4CAF50',
    icon: '🚚',
    priority: 4,
    affectsInventory: false,
    requiresAction: false
  },
  'Annulée': {
    description: 'Commande annulée. Remet les animaux et races dans le lot pour d\'autres clients.',
    color: '#F44336',
    icon: '❌',
    priority: 5,
    affectsInventory: true,
    requiresAction: false
  }
} as const;

// Status colors - consistent across all screens
export const STATUS_COLORS = {
  'En attente': '#FF9800',    // Orange
  'Confirmée': '#2196F3',     // Blue
  'Prête': '#9C27B0',         // Purple
  'Livrée': '#4CAF50',        // Green
  'Annulée': '#F44336',       // Red
  'default': '#607D8B'        // Gray
} as const;

// Status icons - consistent across all screens
export const STATUS_ICONS = {
  'En attente': '⏳',
  'Confirmée': '✅',
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

export const getStatusDefinition = (status: string) => {
  return STATUS_DEFINITIONS[status as OrderStatus] || {
    description: 'Statut non défini',
    color: '#607D8B',
    icon: '📋',
    priority: 0,
    affectsInventory: false,
    requiresAction: false
  };
};

export const getStatusesByPriority = () => {
  return [...ORDER_STATUSES].sort((a, b) => 
    STATUS_DEFINITIONS[a].priority - STATUS_DEFINITIONS[b].priority
  );
};

export const getStatusesRequiringAction = () => {
  return [...ORDER_STATUSES].filter(status => 
    STATUS_DEFINITIONS[status].requiresAction
  );
};

export const getStatusesAffectingInventory = () => {
  return [...ORDER_STATUSES].filter(status => 
    STATUS_DEFINITIONS[status].affectsInventory
  );
};