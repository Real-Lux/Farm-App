import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function GroupCard({ 
  group, 
  groupAnimals, 
  onEdit, 
  onDelete, 
  getHerdConfig 
}) {
  const herdConfig = getHerdConfig();

  return (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{group.name}</Text>
        <View style={styles.groupActions}>
          <TouchableOpacity
            style={styles.groupEditButton}
            onPress={() => onEdit(group)}
          >
            <Text style={styles.groupEditButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.groupDeleteButton}
            onPress={() => onDelete(group)}
          >
            <Text style={styles.groupDeleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      {group.description && (
        <Text style={styles.groupDescription}>{group.description}</Text>
      )}
      <Text style={styles.groupCount}>
        {groupAnimals.length} animal{groupAnimals.length > 1 ? 'aux' : ''}
      </Text>
      <View style={styles.groupAnimalsList}>
        {groupAnimals.slice(0, 5).map(animal => (
          <Text key={animal.id} style={styles.groupAnimalName}>
            {herdConfig.emoji[animal.species] || '🐾'} {animal.name}
          </Text>
        ))}
        {groupAnimals.length > 5 && (
          <Text style={styles.groupMoreText}>+ {groupAnimals.length - 5} autres</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  groupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  groupEditButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    padding: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupEditButtonText: {
    color: 'white',
    fontSize: 14,
  },
  groupDeleteButton: {
    backgroundColor: '#F44336',
    borderRadius: 4,
    padding: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupDeleteButtonText: {
    color: 'white',
    fontSize: 14,
  },
  groupDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  groupCount: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '600',
    marginBottom: 8,
  },
  groupAnimalsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupAnimalName: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupMoreText: {
    fontSize: 12,
    color: '#8B4513',
    fontStyle: 'italic',
  },
});

