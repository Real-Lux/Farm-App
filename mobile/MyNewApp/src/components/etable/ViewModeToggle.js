import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ViewModeToggle({ viewMode, onModeChange, groupsCount, animalsCount, getHerdConfig }) {
  const herdConfig = getHerdConfig ? getHerdConfig() : null;
  const herdColor = herdConfig ? herdConfig.color : '#8B4513';
  
  return (
    <View style={styles.viewModeToggle}>
      <TouchableOpacity
        style={[styles.viewModeButton, viewMode === 'all' && [styles.viewModeButtonActive, { backgroundColor: herdColor }]]}
        onPress={() => onModeChange('all')}
      >
        <View style={styles.tousButtonContent}>
          <Text style={styles.tousIcon}>📋</Text>
          <Text style={[styles.viewModeButtonText, viewMode === 'all' && styles.viewModeButtonTextActive]}>
            Tous
          </Text>
          {animalsCount !== undefined && (
            <View style={[styles.countBadge, { backgroundColor: herdColor }]}>
              <Text style={styles.countText}>
                {animalsCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.viewModeButton, viewMode === 'groups' && styles.viewModeButtonActive]}
        onPress={() => onModeChange('groups')}
      >
        <Text style={[styles.viewModeButtonText, viewMode === 'groups' && styles.viewModeButtonTextActive]}>
          👥 Groupes ({groupsCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#8B4513', // Will be overridden by inline style
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewModeButtonTextActive: {
    color: 'white',
  },
  tousButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tousIcon: {
    fontSize: 16,
  },
  countBadge: {
    backgroundColor: '#8B4513', // Will be overridden by inline style
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  countTextActive: {
    color: 'white',
  },
});

