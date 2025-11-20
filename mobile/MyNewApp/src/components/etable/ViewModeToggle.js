import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ViewModeToggle({ viewMode, onModeChange, groupsCount }) {
  return (
    <View style={styles.viewModeToggle}>
      <TouchableOpacity
        style={[styles.viewModeButton, viewMode === 'all' && styles.viewModeButtonActive]}
        onPress={() => onModeChange('all')}
      >
        <Text style={[styles.viewModeButtonText, viewMode === 'all' && styles.viewModeButtonTextActive]}>
          📋 Tous
        </Text>
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
    backgroundColor: '#8B4513',
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewModeButtonTextActive: {
    color: 'white',
  },
});

