import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import database from '../services/database';

export function useElevageRaces(animalType) {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRaces = async () => {
    try {
      setLoading(true);
      const racesData = await database.getRaces(animalType);
      setRaces(racesData);
    } catch (error) {
      console.error(`Erreur lors du chargement des races ${animalType}:`, error);
      Alert.alert('Erreur', `Impossible de charger les races ${animalType}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRaces();
  }, [animalType]);

  const saveRace = async (raceData, editingItem) => {
    try {
      if (editingItem) {
        await database.updateRace(editingItem.id, raceData);
      } else {
        await database.addRace(raceData);
      }
      await loadRaces();
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la race');
      return { success: false, error };
    }
  };

  const deleteRace = async (id) => {
    try {
      await database.deleteRace(id);
      await loadRaces();
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      Alert.alert('Erreur', 'Impossible de supprimer la race');
      return { success: false, error };
    }
  };

  const reorderRaces = async (raceId1, raceId2) => {
    try {
      await database.reorderRaces(raceId1, raceId2);
      await loadRaces();
      return { success: true };
    } catch (error) {
      console.error('Erreur lors du réordonnancement:', error);
      Alert.alert('Erreur', 'Impossible de réordonner les races');
      return { success: false, error };
    }
  };

  return {
    races,
    loading,
    loadRaces,
    saveRace,
    deleteRace,
    reorderRaces
  };
}

