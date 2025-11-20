import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getAnimalAge, getTotalMilkProduction, getAverageMilkProduction } from '../../utils/animalUtils';

export default function AnimalItem({ 
  item, 
  isCollapsed, 
  isHighlighted, 
  onToggleCollapse, 
  onEdit, 
  onDelete, 
  onViewGenealogy,
  getHerdConfig 
}) {
  const age = getAnimalAge(item.birthDate);
  const totalMilk = getTotalMilkProduction(item);
  const avgMilk = getAverageMilkProduction(item);
  const herdConfig = getHerdConfig();

  return (
    <View style={[
      styles.card,
      isHighlighted && styles.animalCardHighlighted
    ]}>
      <TouchableOpacity 
        style={styles.cardHeader}
        onPress={() => onToggleCollapse(item.id)}
      >
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.collapseIndicator}>
            {isCollapsed ? '▶' : '▼'}
          </Text>
          <Text style={styles.animalIcon}>
            {herdConfig.emoji[item.species] || '🐾'}
          </Text>
          <Text style={styles.cardTitle}>{item.name}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          {isCollapsed && (
            <Text style={styles.compactInfo}>
              {age}
            </Text>
          )}
          <Text style={[styles.status, { 
            color: item.exitCause === 'décès' ? '#F44336' : '#4CAF50' 
          }]}>
            {item.exitCause === 'décès' ? 'décédé' : 'vivant'}
          </Text>
        </View>
      </TouchableOpacity>
      
      {!isCollapsed && (
        <>
          <View style={styles.cardDetails}>
            <Text style={styles.cardInfo}>📅 Né(e) le: {item.birthDate}</Text>
            <Text style={styles.cardInfo}>🎂 Âge: {age}</Text>
            <Text style={styles.cardInfo}>🏷️ Race: {item.breed}</Text>
            <Text style={styles.cardInfo}>⚥ Sexe: {item.gender}</Text>
            {item.entryDate && <Text style={styles.cardInfo}>📥 Entrée le: {item.entryDate}</Text>}
            {item.entryCause && <Text style={styles.cardInfo}>📋 Cause d'entrée: {item.entryCause}</Text>}
            {item.exitDate && <Text style={styles.cardInfo}>📤 Sortie le: {item.exitDate}</Text>}
            {item.exitCause && <Text style={styles.cardInfo}>📋 Cause de sortie: {item.exitCause}</Text>}
            {item.herdNumber && <Text style={styles.cardInfo}>🏷️ Num cheptel: {item.herdNumber}</Text>}
            {item.earTagNumber && <Text style={styles.cardInfo}>🔢 N° oreille: {item.earTagNumber}</Text>}
            {item.buyerSellerName && <Text style={styles.cardInfo}>👤 Acheteur/Vendeur: {item.buyerSellerName}</Text>}
            {item.mother && <Text style={styles.cardInfo}>👩 Mère: {item.mother}</Text>}
            {item.father && <Text style={styles.cardInfo}>👨 Père: {item.father}</Text>}
          </View>

          {item.offspring && item.offspring.length > 0 && (
            <View style={styles.offspringSection}>
              <Text style={styles.offspringTitle}>👶 Descendance:</Text>
              <Text style={styles.offspringList}>
                {item.offspring.join(', ')}
              </Text>
            </View>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => onEdit(item)}
            >
              <Text style={styles.actionBtnText}>✏️ Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.genealogyBtn]}
              onPress={() => onViewGenealogy(item)}
            >
              <Text style={styles.actionBtnText}>🌳 Généalogie</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => onDelete(item.id)}
            >
              <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  animalCardHighlighted: {
    borderWidth: 3,
    borderColor: '#FFD700',
    backgroundColor: '#FFFACD',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapseIndicator: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: 'bold',
    marginRight: 10,
  },
  animalIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  compactInfo: {
    fontSize: 12,
    color: '#666',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cardInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  offspringSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  offspringTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  offspringList: {
    fontSize: 12,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#2196F3',
  },
  genealogyBtn: {
    backgroundColor: '#4CAF50',
  },
  deleteBtn: {
    backgroundColor: '#F44336',
  },
  actionBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

