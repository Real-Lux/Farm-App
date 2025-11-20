import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import database from '../services/database';
import { getTodayISO } from '../utils/dateUtils';

export function useHerdAnimals(herdType) {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAnimals = async () => {
    try {
      setLoading(true);
      const animalsData = await database.getHerdAnimals(herdType);
      setAnimals(animalsData);
    } catch (error) {
      console.error(`Erreur lors du chargement des animaux ${herdType}:`, error);
      Alert.alert('Erreur', `Impossible de charger les données ${herdType}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnimals();
  }, [herdType]);

  const saveAnimal = async (animalData, editingItem) => {
    try {
      if (editingItem) {
        await database.updateHerdAnimal(herdType, editingItem.id, animalData);
      } else {
        await database.addHerdAnimal(herdType, animalData);
      }
      await loadAnimals();
      await database.syncCaprinWithCalendar();
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'animal');
      return { success: false, error };
    }
  };

  const deleteAnimal = async (id) => {
    try {
      await database.deleteHerdAnimal(herdType, id);
      await loadAnimals();
      await database.syncCaprinWithCalendar();
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      Alert.alert('Erreur', 'Impossible de supprimer l\'animal');
      return { success: false, error };
    }
  };

  return {
    animals,
    loading,
    loadAnimals,
    saveAnimal,
    deleteAnimal
  };
}

