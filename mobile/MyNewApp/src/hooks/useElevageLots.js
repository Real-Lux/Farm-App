import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import database from '../services/database';

export function useElevageLots(animalType) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLots = async () => {
    try {
      setLoading(true);
      const lotsData = await database.getLots(animalType);
      setLots(lotsData);
    } catch (error) {
      console.error(`Erreur lors du chargement des lots ${animalType}:`, error);
      Alert.alert('Erreur', `Impossible de charger les lots ${animalType}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLots();
  }, [animalType]);

  const saveLot = async (lotData, editingItem) => {
    try {
      if (editingItem) {
        await database.updateLot(editingItem.id, lotData);
      } else {
        await database.addLot(lotData);
      }
      await loadLots();
      await database.syncElevageWithCalendar();
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le lot');
      return { success: false, error };
    }
  };

  const deleteLot = async (id) => {
    try {
      await database.deleteLot(id);
      await loadLots();
      await database.syncElevageWithCalendar();
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le lot');
      return { success: false, error };
    }
  };

  return {
    lots,
    loading,
    loadLots,
    saveLot,
    deleteLot
  };
}

