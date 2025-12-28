import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getBabyMales, getBabyFemales, getGrownMales, getDeceasedAnimals } from '../../utils/animalUtils';

export default function QuickStats({ animals, getHerdConfig }) {
  const herdConfig = getHerdConfig();
  const defaultSpecies = herdConfig.species[0] || 'Espèce 1';
  const secondSpecies = herdConfig.species[1];
  const totalFemales = animals.filter(a => a.gender === 'femelle').length;
  const totalMales = animals.filter(a => a.gender === 'mâle').length;
  const babyMales = getBabyMales(animals).length;
  const babyFemales = getBabyFemales(animals).length;
  const grownMales = getGrownMales(animals).length;
  const grownFemales = totalFemales - babyFemales;
  const deceased = getDeceasedAnimals(animals).length;

  return (
    <View style={styles.quickStats}>
      <Text style={styles.quickStatsTitle}>Statistiques Rapides</Text>
      <View style={styles.statsGrid}>
        {/* Species row */}
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: herdConfig.color }]}>
            {animals.filter(a => a.species === defaultSpecies).length}
          </Text>
          <Text style={styles.statLabel}>{defaultSpecies}</Text>
        </View>
        {secondSpecies && (
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: herdConfig.color }]}>
              {animals.filter(a => a.species === secondSpecies).length}
            </Text>
            <Text style={styles.statLabel}>{secondSpecies}</Text>
          </View>
        )}
        
        {/* Mâles | Femelles */}
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: herdConfig.color }]}>{totalMales}</Text>
          <Text style={styles.statLabel}>Mâles</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: herdConfig.color }]}>{totalFemales}</Text>
          <Text style={styles.statLabel}>Femelles</Text>
        </View>
        
        {/* Mâles Bébés | Femelles Bébés */}
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: herdConfig.color }]}>{babyMales}</Text>
          <Text style={styles.statLabel}>Mâles Bébés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: herdConfig.color }]}>{babyFemales}</Text>
          <Text style={styles.statLabel}>Femelles Bébés</Text>
        </View>
        
        {/* Mâles Adultes | Femelles Adultes */}
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: herdConfig.color }]}>{grownMales}</Text>
          <Text style={styles.statLabel}>Mâles Adultes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: herdConfig.color }]}>{grownFemales}</Text>
          <Text style={styles.statLabel}>Femelles Adultes</Text>
        </View>
        
        {/* Last row: Total | Décédés */}
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: herdConfig.color }]}>{animals.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: herdConfig.color }]}>{deceased}</Text>
          <Text style={styles.statLabel}>Décédés</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quickStats: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickStatsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 6,
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  statLabel: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
});

