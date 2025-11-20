import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import database from '../services/database';

export function useGroups(herdType) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const groupsData = await database.getHerdGroups(herdType);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [herdType]);

  const addGroup = async (groupData) => {
    try {
      await database.addHerdGroup(herdType, groupData);
      await loadGroups();
      return { success: true };
    } catch (error) {
      console.error('Error adding group:', error);
      Alert.alert('Erreur', 'Impossible de créer le groupe');
      return { success: false, error };
    }
  };

  const updateGroup = async (groupId, groupData) => {
    try {
      await database.updateHerdGroup(herdType, groupId, groupData);
      await loadGroups();
      return { success: true };
    } catch (error) {
      console.error('Error updating group:', error);
      Alert.alert('Erreur', 'Impossible de modifier le groupe');
      return { success: false, error };
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      await database.deleteHerdGroup(herdType, groupId);
      await loadGroups();
      return { success: true };
    } catch (error) {
      console.error('Error deleting group:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le groupe');
      return { success: false, error };
    }
  };

  return {
    groups,
    loading,
    loadGroups,
    addGroup,
    updateGroup,
    deleteGroup
  };
}

