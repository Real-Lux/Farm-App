import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getBabyMales, getBabyFemales, getGrownMales, getDeceasedAnimals } from '../../utils/animalUtils';

export default function QuickStats({ animals, getHerdConfig }) {
  const herdConfig = getHerdConfig();
  const defaultSpecies = herdConfig.species[0] || 'Espèce 1';
  const secondSpecies = herdConfig.species[1];

  return (
    <View style={styles.quickStats}>
      <Text style={styles.quickStatsTitle}>Statistiques Rapides</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{animals.length}</Text>
          <Text style={styles.statLabel}>Total Animaux</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {animals.filter(a => a.species === defaultSpecies).length}
          </Text>
          <Text style={styles.statLabel}>{defaultSpecies}</Text>
        </View>
        {secondSpecies && (
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {animals.filter(a => a.species === secondSpecies).length}
            </Text>
            <Text style={styles.statLabel}>{secondSpecies}</Text>
          </View>
        )}
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {animals.filter(a => a.gender === 'femelle').length}
          </Text>
          <Text style={styles.statLabel}>Femelles</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {getBabyMales(animals).length}
          </Text>
          <Text style={styles.statLabel}>Mâles Bébés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {getBabyFemales(animals).length}
          </Text>
          <Text style={styles.statLabel}>Femelles Bébés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {getGrownMales(animals).length}
          </Text>
          <Text style={styles.statLabel}>Mâles Adultes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {getDeceasedAnimals(animals).length}
          </Text>
          <Text style={styles.statLabel}>Décédés</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quickStats: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});

