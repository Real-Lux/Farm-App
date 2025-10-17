import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import database from '../services/database';
import { toISODate, getTodayISO, formatForCalendar } from '../utils/dateUtils';

export default function ElevageScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [lots, setLots] = useState([]);
  const [races, setRaces] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [activeTab, setActiveTab] = useState('lots');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('lot'); // 'lot', 'race', 'update'
  const [editingItem, setEditingItem] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [calendarModal, setCalendarModal] = useState(false);
  const [calendarField, setCalendarField] = useState(''); // 'date_creation' or 'date_eclosion'
  const [collapsedLots, setCollapsedLots] = useState({}); // Track collapsed lots
  const [isManualInputExpanded, setIsManualInputExpanded] = useState(false); // Track manual input expansion
  
  const [lotForm, setLotForm] = useState({
    name: '',
    date_creation: '',
    date_eclosion: '',
    races: {},
    status: 'Actif',
    notes: ''
  });

  const [raceForm, setRaceForm] = useState({
    name: '',
    type: 'poules',
    description: ''
  });

  const [updateForm, setUpdateForm] = useState({
    lot_id: '',
    race: '',
    deaths_males: '',
    deaths_females: '',
    deaths_unsexed: '',
    males: '',
    females: '',
    unsexed: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lotsData, racesData, historiqueData] = await Promise.all([
        database.getLots(),
        database.getRaces(),
        database.getHistorique()
      ]);
      setLots(lotsData);
      setRaces(racesData);
      setHistorique(historiqueData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données d\'élevage');
    }
  };

  const openAddLotModal = () => {
    setEditingItem(null);
    setModalType('lot');
    setLotForm({
      name: '',
      date_creation: getTodayISO(),
      date_eclosion: '',
      races: {},
      status: 'Actif',
      notes: ''
    });
    setModalVisible(true);
  };

  const openEditLotModal = (lot) => {
    setEditingItem(lot);
    setModalType('lot');
    setLotForm({
      name: lot.name,
      date_creation: lot.date_creation,
      date_eclosion: lot.date_eclosion,
      races: lot.races,
      status: lot.status,
      notes: lot.notes
    });
    setModalVisible(true);
  };

  const openAddRaceModal = () => {
    setEditingItem(null);
    setModalType('race');
    setRaceForm({
      name: '',
      type: 'poules',
      description: ''
    });
    setModalVisible(true);
  };

  const openUpdateModal = async (lot, race) => {
    setModalType('update');
    
    // Load existing notes for this lot and race
    let existingNotes = '';
    try {
      const notes = await database.getLotNotes(lot.id, race);
      existingNotes = notes || '';
    } catch (error) {
      console.log('No existing notes found');
    }
    
    setUpdateForm({
      lot_id: lot.id,
      race: race,
      deaths_males: lot.races[race].deaths_males?.toString() || '0',
      deaths_females: lot.races[race].deaths_females?.toString() || '0',
      deaths_unsexed: lot.races[race].deaths_unsexed?.toString() || '0',
      males: lot.races[race].males?.toString() || '0',
      females: lot.races[race].females?.toString() || '0',
      unsexed: lot.races[race].unsexed?.toString() || '0',
      notes: existingNotes
    });
    setModalVisible(true);
  };

  const openCalendarModal = (field) => {
    setCalendarField(field);
    setCalendarModal(true);
  };

  const handleDateSelect = (day) => {
    setLotForm({...lotForm, [calendarField]: day.dateString});
    setCalendarModal(false);
  };

  const saveLot = async () => {
    if (!lotForm.name || !lotForm.date_creation) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      if (editingItem) {
        await database.updateLot(editingItem.id, lotForm);
      } else {
        await database.addLot(lotForm);
      }
      
      // Sync with calendar after saving lot
      await database.syncElevageWithCalendar();
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du lot:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le lot');
    }
  };

  const saveRace = async () => {
    if (!raceForm.name || !raceForm.type) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      if (editingItem) {
        await database.updateRace(editingItem.id, raceForm);
      } else {
        await database.addRace(raceForm);
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la race:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la race');
    }
  };

  const saveUpdate = async () => {
    if (!updateForm.lot_id || !updateForm.race) {
      Alert.alert('Erreur', 'Informations de lot manquantes');
      return;
    }

    try {
      const updates = {
        deaths_males: parseInt(updateForm.deaths_males) || 0,
        deaths_females: parseInt(updateForm.deaths_females) || 0,
        deaths_unsexed: parseInt(updateForm.deaths_unsexed) || 0,
        males: parseInt(updateForm.males) || 0,
        females: parseInt(updateForm.females) || 0,
        unsexed: parseInt(updateForm.unsexed) || 0
      };

      await database.updateLotRaceQuantity(updateForm.lot_id, updateForm.race, updates);
      
      // Save notes persistently
      if (updateForm.notes.trim()) {
        await database.saveLotNotes(updateForm.lot_id, updateForm.race, updateForm.notes);
        
        // Also add to historique for tracking
        await database.addHistorique({
          lot_id: updateForm.lot_id,
          date: new Date().toISOString().split('T')[0],
          type: 'Note',
          description: updateForm.notes,
          race: updateForm.race,
          quantity: 0
        });
      }
      
      // Sync with calendar after updating
      await database.syncElevageWithCalendar();
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour les données');
    }
  };

  const deleteLot = (id) => {
    Alert.alert(
      'Supprimer le lot',
      'Êtes-vous sûr de vouloir supprimer ce lot ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await database.deleteLot(id);
            // Sync with calendar after deletion
            await database.syncElevageWithCalendar();
            loadData();
          } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            Alert.alert('Erreur', 'Impossible de supprimer le lot');
          }
        }}
      ]
    );
  };

  const addRaceToLot = (raceName) => {
    setLotForm({
      ...lotForm,
      races: {
        ...lotForm.races,
        [raceName]: { initial: 0, current: 0, males: 0, females: 0, deaths: 0 }
      }
    });
  };

  const updateRaceInLot = (raceName, field, value) => {
    setLotForm({
      ...lotForm,
      races: {
        ...lotForm.races,
        [raceName]: {
          ...lotForm.races[raceName],
          [field]: parseInt(value) || 0
        }
      }
    });
  };

  const removeRaceFromLot = (raceName) => {
    const newRaces = { ...lotForm.races };
    delete newRaces[raceName];
    setLotForm({
      ...lotForm,
      races: newRaces
    });
  };

  const getStockStatus = (current, initial) => {
    const ratio = current / initial;
    if (ratio > 0.8) return { color: '#4CAF50', text: '✅ Bon stock' };
    if (ratio > 0.5) return { color: '#FF9800', text: '⚠️ Stock moyen' };
    return { color: '#F44336', text: '❌ Stock faible' };
  };

  const getTotalAnimals = () => {
    return lots.reduce((total, lot) => {
      return total + Object.values(lot.races).reduce((lotTotal, race) => lotTotal + race.current, 0);
    }, 0);
  };

  const getLotsByRace = (raceName) => {
    return lots.filter(lot => lot.races[raceName] && lot.races[raceName].current > 0);
  };

  const toggleLotCollapse = (lotId) => {
    setCollapsedLots(prev => ({
      ...prev,
      [lotId]: !prev[lotId]
    }));
  };

  const getLotStatus = (lot) => {
    const totalAlive = Object.values(lot.races).reduce((total, race) => total + race.current, 0);
    const totalInitial = Object.values(lot.races).reduce((total, race) => total + race.initial, 0);
    const survivalRate = totalInitial > 0 ? (totalAlive / totalInitial) : 0;
    
    if (totalAlive === 0) return { status: 'Épuisé', color: '#F44336' };
    if (survivalRate < 0.5) return { status: 'Faible', color: '#FF9800' };
    if (survivalRate < 0.8) return { status: 'Moyen', color: '#FF9800' };
    return { status: 'Actif', color: '#4CAF50' };
  };

  // Helper functions for interactive corrections
  const addDeath = (gender) => {
    const currentDeaths = parseInt(updateForm[`deaths_${gender}`]) || 0;
    const currentAlive = parseInt(updateForm[gender]) || 0;
    
    if (currentAlive > 0) {
      setUpdateForm({
        ...updateForm,
        [`deaths_${gender}`]: (currentDeaths + 1).toString(),
        [gender]: (currentAlive - 1).toString()
      });
    } else {
      Alert.alert('Erreur', 'Aucun animal vivant de ce sexe à marquer comme mort');
    }
  };

  const correctSex = (fromGender, toGender) => {
    const currentFrom = parseInt(updateForm[fromGender]) || 0;
    
    if (currentFrom > 0) {
      setUpdateForm({
        ...updateForm,
        [fromGender]: (currentFrom - 1).toString(),
        [toGender]: (parseInt(updateForm[toGender]) + 1).toString()
      });
    } else {
      Alert.alert('Erreur', 'Aucun animal de ce sexe à corriger');
    }
  };

  const getCurrentTotals = () => {
    const totalAlive = (parseInt(updateForm.males) || 0) + (parseInt(updateForm.females) || 0) + (parseInt(updateForm.unsexed) || 0);
    const totalDeaths = (parseInt(updateForm.deaths_males) || 0) + (parseInt(updateForm.deaths_females) || 0) + (parseInt(updateForm.deaths_unsexed) || 0);
    return { totalAlive, totalDeaths };
  };

  const LotItem = ({ item }) => {
    const isCollapsed = collapsedLots[item.id];
    const lotStatus = getLotStatus(item);
    const totalAlive = Object.values(item.races).reduce((total, race) => total + race.current, 0);
    const totalInitial = Object.values(item.races).reduce((total, race) => total + race.initial, 0);
    
    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardHeader}
          onPress={() => toggleLotCollapse(item.id)}
        >
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.collapseIndicator}>
              {isCollapsed ? '▶' : '▼'}
            </Text>
            <Text style={styles.cardTitle}>{item.name}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {isCollapsed && (
              <Text style={styles.compactInfo}>
                {totalAlive}/{totalInitial}
              </Text>
            )}
            <Text style={[styles.status, { color: lotStatus.color }]}>
              {lotStatus.status}
            </Text>
          </View>
        </TouchableOpacity>
        
        {!isCollapsed && (
          <>
            <View style={styles.cardDetails}>
              <Text style={styles.cardInfo}>📅 Créé le: {item.date_creation}</Text>
              {item.date_eclosion && (
                <Text style={styles.cardInfo}>🐣 Éclosion: {item.date_eclosion}</Text>
              )}
              <Text style={styles.cardInfo}>📊 Vivants: {totalAlive} / Initial: {totalInitial}</Text>
            </View>

            <View style={styles.racesSection}>
              <Text style={styles.racesSectionTitle}>Races dans ce lot:</Text>
              {Object.entries(item.races).map(([raceName, raceData]) => {
                const status = getStockStatus(raceData.current, raceData.initial);
                return (
                  <TouchableOpacity 
                    key={raceName} 
                    style={styles.raceItem}
                    onPress={() => openUpdateModal(item, raceName)}
                  >
                    <View style={styles.raceInfo}>
                      <Text style={styles.raceName}>{raceName}</Text>
                      <Text style={[styles.stockStatus, { color: status.color }]}>
                        {status.text}
                      </Text>
                    </View>
                    <View style={styles.raceStats}>
                      <Text style={styles.raceStatText}>🐓 {raceData.current} restants (♂️ {raceData.males || 0} | ♀️ {raceData.females || 0} | ❓ {raceData.unsexed || 0})</Text>
                      <Text style={styles.raceStatText}>
                        💀 {raceData.deaths || 0} morts (♂️ {raceData.deaths_males || 0} | ♀️ {raceData.deaths_females || 0} | ❓ {raceData.deaths_unsexed || 0})
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => openEditLotModal(item)}
              >
                <Text style={styles.actionBtnText}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => deleteLot(item.id)}
              >
                <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  const RaceItem = ({ item }) => {
    const lotsWithRace = getLotsByRace(item.name);
    const totalStock = lotsWithRace.reduce((total, lot) => total + lot.races[item.name].current, 0);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.animalType}>🐓 {item.type}</Text>
        </View>
        
        <Text style={styles.cardInfo}>{item.description}</Text>
        <Text style={styles.cardInfo}>📦 Stock total: {totalStock} animaux</Text>
        <Text style={styles.cardInfo}>📍 Présent dans {lotsWithRace.length} lot(s)</Text>
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => {
              setEditingItem(item);
              setModalType('race');
              setRaceForm({
                name: item.name,
                type: item.type,
                description: item.description
              });
              setModalVisible(true);
            }}
          >
            <Text style={styles.actionBtnText}>✏️ Modifier</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const HistoriqueItem = ({ item }) => (
    <View style={styles.historiqueItem}>
      <View style={styles.historiqueHeader}>
        <Text style={styles.historiqueDate}>{item.date}</Text>
        <Text style={[styles.historiqueType, { 
          color: item.type === 'Mort' ? '#F44336' : '#2196F3' 
        }]}>
          {item.type}
        </Text>
      </View>
      <Text style={styles.historiqueDescription}>{item.description}</Text>
      {item.race && <Text style={styles.historiqueRace}>Race: {item.race}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top }]} />
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🐓 Gestion d'Élevage</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>{getTotalAnimals()} animaux</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'lots' && styles.activeTab]}
          onPress={() => setActiveTab('lots')}
        >
          <Text style={[styles.tabText, activeTab === 'lots' && styles.activeTabText]}>
            Lots ({lots.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'races' && styles.activeTab]}
          onPress={() => setActiveTab('races')}
        >
          <Text style={[styles.tabText, activeTab === 'races' && styles.activeTabText]}>
            Races ({races.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'historique' && styles.activeTab]}
          onPress={() => setActiveTab('historique')}
        >
          <Text style={[styles.tabText, activeTab === 'historique' && styles.activeTabText]}>
            Historique
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'statistiques' && styles.activeTab]}
          onPress={() => setActiveTab('statistiques')}
        >
          <Text style={[styles.tabText, activeTab === 'statistiques' && styles.activeTabText]}>
            Statistiques
          </Text>
        </TouchableOpacity>
      </View>
      
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.content}>
        {activeTab === 'lots' && (
          <>
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.addButton} onPress={openAddLotModal}>
                <Text style={styles.addButtonText}>+ Nouveau Lot</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={lots}
              renderItem={({ item }) => <LotItem item={item} />}
              keyExtractor={item => item.id.toString()}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}

        {activeTab === 'races' && (
          <>
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.addButton} onPress={openAddRaceModal}>
                <Text style={styles.addButtonText}>+ Nouvelle Race</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={races}
              renderItem={({ item }) => <RaceItem item={item} />}
              keyExtractor={item => item.id.toString()}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}

        {activeTab === 'historique' && (
          <FlatList
            data={historique.sort((a, b) => new Date(b.date) - new Date(a.date))}
            renderItem={({ item }) => <HistoriqueItem item={item} />}
            keyExtractor={item => item.id.toString()}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        {activeTab === 'statistiques' && (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {/* Statistiques globales */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>📊 Statistiques Globales</Text>
              
              <View style={styles.globalStatsGrid}>
                <View style={styles.globalStatCard}>
                  <Text style={styles.globalStatNumber}>{getTotalAnimals()}</Text>
                  <Text style={styles.globalStatLabel}>Total Vivants</Text>
                </View>
                <View style={styles.globalStatCard}>
                  <Text style={styles.globalStatNumber}>{lots.length}</Text>
                  <Text style={styles.globalStatLabel}>Lots Actifs</Text>
                </View>
                <View style={styles.globalStatCard}>
                  <Text style={styles.globalStatNumber}>{races.length}</Text>
                  <Text style={styles.globalStatLabel}>Races Gérées</Text>
                </View>
                <View style={styles.globalStatCard}>
                  <Text style={styles.globalStatNumber}>
                    {lots.reduce((total, lot) => {
                      return total + Object.values(lot.races).reduce((sum, race) => sum + (race.deaths || 0), 0);
                    }, 0)}
                  </Text>
                  <Text style={styles.globalStatLabel}>Total Morts</Text>
                </View>
              </View>
            </View>

            {/* Statistiques par lot */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>📦 Statistiques par Lot</Text>
              
              {lots.map((lot) => {
                const totalInitial = Object.values(lot.races).reduce((sum, race) => sum + race.initial, 0);
                const totalAlive = Object.values(lot.races).reduce((sum, race) => sum + race.current, 0);
                const totalDeaths = Object.values(lot.races).reduce((sum, race) => sum + (race.deaths || 0), 0);
                const totalMales = Object.values(lot.races).reduce((sum, race) => sum + (race.males || 0), 0);
                const totalFemales = Object.values(lot.races).reduce((sum, race) => sum + (race.females || 0), 0);
                const totalDeathsMales = Object.values(lot.races).reduce((sum, race) => sum + (race.deaths_males || 0), 0);
                const totalDeathsFemales = Object.values(lot.races).reduce((sum, race) => sum + (race.deaths_females || 0), 0);
                const survivalRate = totalInitial > 0 ? ((totalAlive / totalInitial) * 100) : 0;
                
                return (
                  <View key={lot.id} style={styles.lotStatsCard}>
                    <Text style={styles.lotStatsTitle}>{lot.name}</Text>
                    <Text style={styles.lotStatsDate}>📅 Créé le: {lot.date_creation}</Text>
                    
                    <View style={styles.lotStatsGrid}>
                      <View style={styles.lotStatItem}>
                        <Text style={styles.lotStatNumber}>{totalInitial}</Text>
                        <Text style={styles.lotStatLabel}>Initiaux</Text>
                      </View>
                      <View style={styles.lotStatItem}>
                        <Text style={styles.lotStatNumber}>{totalAlive}</Text>
                        <Text style={styles.lotStatLabel}>Vivants</Text>
                      </View>
                      <View style={styles.lotStatItem}>
                        <Text style={styles.lotStatNumber}>{totalDeaths}</Text>
                        <Text style={styles.lotStatLabel}>Morts</Text>
                      </View>
                      <View style={styles.lotStatItem}>
                        <Text style={styles.lotStatNumber}>{survivalRate.toFixed(1)}%</Text>
                        <Text style={styles.lotStatLabel}>Survie</Text>
                      </View>
                    </View>

                    <View style={styles.genderStatsRow}>
                      <View style={styles.genderStatGroup}>
                        <Text style={styles.genderStatTitle}>Vivants:</Text>
                        <Text style={styles.genderStatText}>(♂️ {totalMales} | ♀️ {totalFemales} | ❓ {Object.values(lot.races).reduce((sum, race) => sum + (race.unsexed || 0), 0)})</Text>
                      </View>
                      <View style={styles.genderStatGroup}>
                        <Text style={styles.genderStatTitle}>Morts:</Text>
                        <Text style={styles.genderStatText}>(♂️ {totalDeathsMales} | ♀️ {totalDeathsFemales} | ❓ {Object.values(lot.races).reduce((sum, race) => sum + (race.deaths_unsexed || 0), 0)})</Text>
                      </View>
                    </View>

                    {/* Détail par race */}
                    <Text style={styles.raceStatsTitle}>Détail par race:</Text>
                    {Object.entries(lot.races).map(([raceName, raceData]) => {
                      const totalAlive = (raceData.males || 0) + (raceData.females || 0) + (raceData.unsexed || 0);
                      const totalDeaths = (raceData.deaths_males || 0) + (raceData.deaths_females || 0) + (raceData.deaths_unsexed || 0);
                      
                      const maleAlivePercent = totalAlive > 0 ? ((raceData.males || 0) / totalAlive * 100).toFixed(1) : '0.0';
                      const femaleAlivePercent = totalAlive > 0 ? ((raceData.females || 0) / totalAlive * 100).toFixed(1) : '0.0';
                      const maleDeathPercent = totalDeaths > 0 ? ((raceData.deaths_males || 0) / totalDeaths * 100).toFixed(1) : '0.0';
                      const femaleDeathPercent = totalDeaths > 0 ? ((raceData.deaths_females || 0) / totalDeaths * 100).toFixed(1) : '0.0';
                      
                      return (
                        <View key={raceName} style={styles.raceStatsRow}>
                          <Text style={styles.raceStatsName}>{raceName}:</Text>
                          <Text style={styles.raceStatsDetail}>
                            {raceData.current}/{raceData.initial} (♂️ {raceData.males||0} [{maleAlivePercent}%] | ♀️ {raceData.females||0} [{femaleAlivePercent}%] | ❓ {raceData.unsexed||0}) 💀 {raceData.deaths||0} (♂️ {raceData.deaths_males||0} [{maleDeathPercent}%] | ♀️ {raceData.deaths_females||0} [{femaleDeathPercent}%] | ❓ {raceData.deaths_unsexed||0})
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            {/* Statistiques par race */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>🐓 Statistiques par Race</Text>
              
              {races.map((race) => {
                const lotsWithRace = lots.filter(lot => lot.races[race.name]);
                const totalStock = lotsWithRace.reduce((total, lot) => total + lot.races[race.name].current, 0);
                const totalInitial = lotsWithRace.reduce((total, lot) => total + lot.races[race.name].initial, 0);
                const totalDeaths = lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].deaths || 0), 0);
                const totalMales = lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].males || 0), 0);
                const totalFemales = lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].females || 0), 0);
                const survivalRate = totalInitial > 0 ? ((totalStock / totalInitial) * 100) : 0;
                
                if (totalInitial === 0) return null;
                
                return (
                  <View key={race.id} style={styles.raceStatsCard}>
                    <Text style={styles.raceStatsTitle}>{race.name}</Text>
                    <Text style={styles.raceStatsType}>🐓 {race.type}</Text>
                    
                    <View style={styles.raceStatsGrid}>
                      <View style={styles.raceStatItem}>
                        <Text style={styles.raceStatNumber}>{totalStock}</Text>
                        <Text style={styles.raceStatLabel}>Vivants</Text>
                      </View>
                      <View style={styles.raceStatItem}>
                        <Text style={styles.raceStatNumber}>{totalDeaths}</Text>
                        <Text style={styles.raceStatLabel}>Morts</Text>
                      </View>
                      <View style={styles.raceStatItem}>
                        <Text style={styles.raceStatNumber}>{survivalRate.toFixed(1)}%</Text>
                        <Text style={styles.raceStatLabel}>Survie</Text>
                      </View>
                      <View style={styles.raceStatItem}>
                        <Text style={styles.raceStatNumber}>{lotsWithRace.length}</Text>
                        <Text style={styles.raceStatLabel}>Lots</Text>
                      </View>
                    </View>

                    <View style={styles.genderStatsRow}>
                      {(() => {
                        const totalAlive = totalMales + totalFemales + lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].unsexed || 0), 0);
                        const totalDeaths = lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].deaths_males || 0), 0) + 
                                           lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].deaths_females || 0), 0) + 
                                           lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].deaths_unsexed || 0), 0);
                        const totalDeathsMales = lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].deaths_males || 0), 0);
                        const totalDeathsFemales = lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].deaths_females || 0), 0);
                        const totalDeathsUnsexed = lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].deaths_unsexed || 0), 0);
                        
                        const maleAlivePercent = totalAlive > 0 ? ((totalMales / totalAlive * 100).toFixed(1)) : '0.0';
                        const femaleAlivePercent = totalAlive > 0 ? ((totalFemales / totalAlive * 100).toFixed(1)) : '0.0';
                        const maleDeathPercent = totalDeaths > 0 ? ((totalDeathsMales / totalDeaths * 100).toFixed(1)) : '0.0';
                        const femaleDeathPercent = totalDeaths > 0 ? ((totalDeathsFemales / totalDeaths * 100).toFixed(1)) : '0.0';
                        
                        return (
                          <View style={styles.raceGenderStatsContainer}>
                            <View style={styles.raceGenderStatGroup}>
                              <Text style={styles.raceGenderStatTitle}>Vivants:</Text>
                              <Text style={styles.raceGenderStatText}>(♂️ {totalMales} [{maleAlivePercent}%] | ♀️ {totalFemales} [{femaleAlivePercent}%] | ❓ {lotsWithRace.reduce((total, lot) => total + (lot.races[race.name].unsexed || 0), 0)})</Text>
                            </View>
                            <View style={styles.raceGenderStatGroup}>
                              <Text style={styles.raceGenderStatTitle}>Morts:</Text>
                              <Text style={styles.raceGenderStatText}>(♂️ {totalDeathsMales} [{maleDeathPercent}%] | ♀️ {totalDeathsFemales} [{femaleDeathPercent}%] | ❓ {totalDeathsUnsexed})</Text>
                            </View>
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
        </View>

        {/* Modal pour ajout/modification */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {modalType === 'lot' && (
                <>
                  <Text style={styles.modalTitle}>
                    {editingItem ? 'Modifier le Lot' : 'Nouveau Lot'}
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Nom du lot *"
                    value={lotForm.name}
                    onChangeText={(text) => setLotForm({...lotForm, name: text})}
                  />

                  <View style={styles.dateFieldContainer}>
                    <Text style={styles.dateFieldLabel}>Date de création *</Text>
                    <TouchableOpacity 
                      style={styles.datePickerButton}
                      onPress={() => openCalendarModal('date_creation')}
                    >
                      <Text style={styles.datePickerText}>
                        {lotForm.date_creation ? 
                          formatForCalendar(lotForm.date_creation) : 
                          '📅 Sélectionner une date'
                        }
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateFieldContainer}>
                    <Text style={styles.dateFieldLabel}>Date d'éclosion</Text>
                    <TouchableOpacity 
                      style={styles.datePickerButton}
                      onPress={() => openCalendarModal('date_eclosion')}
                    >
                      <Text style={styles.datePickerText}>
                        {lotForm.date_eclosion ? 
                          formatForCalendar(lotForm.date_eclosion) : 
                          '📅 Sélectionner une date'
                        }
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sectionTitle}>Races dans ce lot:</Text>
                  
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.raceSelector}>
                      {races.map((race) => (
                        <TouchableOpacity
                          key={race.id}
                          style={[
                            styles.raceSelectorItem,
                            lotForm.races[race.name] && styles.raceSelectorItemSelected
                          ]}
                          onPress={() => {
                            if (lotForm.races[race.name]) {
                              removeRaceFromLot(race.name);
                            } else {
                              addRaceToLot(race.name);
                            }
                          }}
                        >
                          <Text style={[
                            styles.raceSelectorText,
                            lotForm.races[race.name] && styles.raceSelectorTextSelected
                          ]}>
                            {lotForm.races[race.name] ? '✓ ' : ''}{race.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {Object.entries(lotForm.races).map(([raceName, raceData]) => (
                    <View key={raceName} style={styles.raceConfig}>
                      <Text style={styles.raceConfigTitle}>{raceName}:</Text>
                      <View style={styles.raceConfigInputs}>
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>Initialement:</Text>
                          <TextInput
                            style={[styles.input, styles.smallInput]}
                            placeholder="0"
                            value={raceData.initial?.toString() || ''}
                            onChangeText={(text) => updateRaceInLot(raceName, 'initial', text)}
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>Vivant:</Text>
                          <TextInput
                            style={[styles.input, styles.smallInput]}
                            placeholder="0"
                            value={raceData.current?.toString() || ''}
                            onChangeText={(text) => updateRaceInLot(raceName, 'current', text)}
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Notes"
                    value={lotForm.notes}
                    onChangeText={(text) => setLotForm({...lotForm, notes: text})}
                    multiline={true}
                    numberOfLines={3}
                  />
                </>
              )}

              {modalType === 'race' && (
                <>
                  <Text style={styles.modalTitle}>
                    {editingItem ? 'Modifier la Race' : 'Nouvelle Race'}
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Nom de la race *"
                    value={raceForm.name}
                    onChangeText={(text) => setRaceForm({...raceForm, name: text})}
                  />

                  <View style={styles.typeSelector}>
                    {['poules', 'canards', 'oie', 'lapin', 'chèvre'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeSelectorItem,
                          raceForm.type === type && styles.typeSelectorItemSelected
                        ]}
                        onPress={() => setRaceForm({...raceForm, type})}
                      >
                        <Text style={[
                          styles.typeSelectorText,
                          raceForm.type === type && styles.typeSelectorTextSelected
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Description"
                    value={raceForm.description}
                    onChangeText={(text) => setRaceForm({...raceForm, description: text})}
                    multiline={true}
                    numberOfLines={3}
                  />
                </>
              )}

              {modalType === 'update' && (
                <>
                  <Text style={styles.modalTitle}>
                    Mettre à jour {updateForm.race}
                  </Text>

                  {/* Current Status Display */}
                  <View style={styles.statusDisplayContainer}>
                    <Text style={styles.statusDisplayTitle}>📊 État actuel</Text>
                    <View style={styles.statusDisplayGrid}>
                      <View style={styles.statusDisplayItem}>
                        <Text style={styles.statusDisplayLabel}>Vivants</Text>
                        <Text style={[styles.statusDisplayValue, { color: '#4CAF50' }]}>
                          {getCurrentTotals().totalAlive}
                        </Text>
                        <Text style={styles.statusDisplayBreakdown}>
                          (♂️ {updateForm.males} | ♀️ {updateForm.females} | ❓ {updateForm.unsexed})
                        </Text>
                      </View>
                      <View style={styles.statusDisplayItem}>
                        <Text style={styles.statusDisplayLabel}>Morts</Text>
                        <Text style={[styles.statusDisplayValue, { color: '#F44336' }]}>
                          {getCurrentTotals().totalDeaths}
                        </Text>
                        <Text style={styles.statusDisplayBreakdown}>
                          (♂️ {updateForm.deaths_males} | ♀️ {updateForm.deaths_females} | ❓ {updateForm.deaths_unsexed})
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Add Deaths Section */}
                  <View style={styles.actionSection}>
                    <Text style={styles.actionSectionTitle}>➕ Ajouter un décès</Text>
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.deathButton]}
                        onPress={() => addDeath('males')}
                        disabled={parseInt(updateForm.males) === 0}
                      >
                        <Text style={styles.actionButtonText}>♂️ Mâle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.deathButton]}
                        onPress={() => addDeath('females')}
                        disabled={parseInt(updateForm.females) === 0}
                      >
                        <Text style={styles.actionButtonText}>♀️ Femelle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.deathButton]}
                        onPress={() => addDeath('unsexed')}
                        disabled={parseInt(updateForm.unsexed) === 0}
                      >
                        <Text style={styles.actionButtonText}>❓ Non-sexé</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Sex Correction Section */}
                  <View style={styles.actionSection}>
                    <Text style={styles.actionSectionTitle}>🔄 Corriger le sexe</Text>
                    <Text style={styles.correctionSubtitle}>Cliquez pour transférer 1 animal d'un sexe vers un autre</Text>
                    <View style={styles.correctionGrid}>
                      <View style={styles.correctionColumn}>
                        <View style={styles.correctionHeader}>
                          <Text style={styles.correctionLabel}>♂️ Mâles</Text>
                          <Text style={styles.correctionCount}>({parseInt(updateForm.males) || 0})</Text>
                        </View>
                        <TouchableOpacity 
                          style={[
                            styles.correctionButtonFixed,
                            parseInt(updateForm.males) === 0 && styles.correctionButtonDisabled
                          ]}
                          onPress={() => correctSex('males', 'females')}
                          disabled={parseInt(updateForm.males) === 0}
                        >
                          <Text style={styles.correctionButtonText}>→ ♀️ Femelle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[
                            styles.correctionButtonFixed,
                            parseInt(updateForm.males) === 0 && styles.correctionButtonDisabled
                          ]}
                          onPress={() => correctSex('males', 'unsexed')}
                          disabled={parseInt(updateForm.males) === 0}
                        >
                          <Text style={styles.correctionButtonText}>→ ❓ Non-sexé</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.correctionColumn}>
                        <View style={styles.correctionHeader}>
                          <Text style={styles.correctionLabel}>♀️ Femelles</Text>
                          <Text style={styles.correctionCount}>({parseInt(updateForm.females) || 0})</Text>
                        </View>
                        <TouchableOpacity 
                          style={[
                            styles.correctionButtonFixed,
                            parseInt(updateForm.females) === 0 && styles.correctionButtonDisabled
                          ]}
                          onPress={() => correctSex('females', 'males')}
                          disabled={parseInt(updateForm.females) === 0}
                        >
                          <Text style={styles.correctionButtonText}>→ ♂️ Mâle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[
                            styles.correctionButtonFixed,
                            parseInt(updateForm.females) === 0 && styles.correctionButtonDisabled
                          ]}
                          onPress={() => correctSex('females', 'unsexed')}
                          disabled={parseInt(updateForm.females) === 0}
                        >
                          <Text style={styles.correctionButtonText}>→ ❓ Non-sexé</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.correctionColumn}>
                        <View style={styles.correctionHeader}>
                          <Text style={styles.correctionLabel}>❓ Non-sexés</Text>
                          <Text style={styles.correctionCount}>({parseInt(updateForm.unsexed) || 0})</Text>
                        </View>
                        <TouchableOpacity 
                          style={[
                            styles.correctionButtonFixed,
                            parseInt(updateForm.unsexed) === 0 && styles.correctionButtonDisabled
                          ]}
                          onPress={() => correctSex('unsexed', 'males')}
                          disabled={parseInt(updateForm.unsexed) === 0}
                        >
                          <Text style={styles.correctionButtonText}>→ ♂️ Mâle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[
                            styles.correctionButtonFixed,
                            parseInt(updateForm.unsexed) === 0 && styles.correctionButtonDisabled
                          ]}
                          onPress={() => correctSex('unsexed', 'females')}
                          disabled={parseInt(updateForm.unsexed) === 0}
                        >
                          <Text style={styles.correctionButtonText}>→ ♀️ Femelle</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Manual Input Section */}
                  <TouchableOpacity 
                    style={styles.manualInputHeader}
                    onPress={() => setIsManualInputExpanded(!isManualInputExpanded)}
                  >
                    <View style={styles.manualInputHeaderLeft}>
                      <Text style={styles.expandIndicator}>
                        {isManualInputExpanded ? '▼' : '▶'}
                      </Text>
                      <Text style={styles.sectionTitle}>✏️ Saisie manuelle</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {isManualInputExpanded && (
                    <View style={styles.manualInputSection}>
                      <Text style={styles.manualInputSubtitle}>Animaux vivants:</Text>
                      <View style={styles.threeColumnInputs}>
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>♂️ Mâles:</Text>
                          <TextInput
                            style={[styles.input, styles.thirdInput]}
                            placeholder="0"
                            value={updateForm.males}
                            onChangeText={(text) => setUpdateForm({...updateForm, males: text})}
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>♀️ Femelles:</Text>
                          <TextInput
                            style={[styles.input, styles.thirdInput]}
                            placeholder="0"
                            value={updateForm.females}
                            onChangeText={(text) => setUpdateForm({...updateForm, females: text})}
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>❓ Non-sexés:</Text>
                          <TextInput
                            style={[styles.input, styles.thirdInput]}
                            placeholder="0"
                            value={updateForm.unsexed}
                            onChangeText={(text) => setUpdateForm({...updateForm, unsexed: text})}
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>

                      <Text style={styles.manualInputSubtitle}>Morts cumulés:</Text>
                      <View style={styles.threeColumnInputs}>
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>💀♂️ Morts mâles:</Text>
                          <TextInput
                            style={[styles.input, styles.thirdInput]}
                            placeholder="0"
                            value={updateForm.deaths_males}
                            onChangeText={(text) => setUpdateForm({...updateForm, deaths_males: text})}
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>💀♀️ Morts femelles:</Text>
                          <TextInput
                            style={[styles.input, styles.thirdInput]}
                            placeholder="0"
                            value={updateForm.deaths_females}
                            onChangeText={(text) => setUpdateForm({...updateForm, deaths_females: text})}
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>💀❓ Morts non-sexés:</Text>
                          <TextInput
                            style={[styles.input, styles.thirdInput]}
                            placeholder="0"
                            value={updateForm.deaths_unsexed}
                            onChangeText={(text) => setUpdateForm({...updateForm, deaths_unsexed: text})}
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Notes Section */}
                  <Text style={styles.sectionTitle}>📝 Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Ajouter des notes sur cette mise à jour..."
                    value={updateForm.notes}
                    onChangeText={(text) => setUpdateForm({...updateForm, notes: text})}
                    multiline={true}
                    numberOfLines={4}
                  />
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={() => {
                    if (modalType === 'lot') saveLot();
                    else if (modalType === 'race') saveRace();
                    else if (modalType === 'update') saveUpdate();
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    {editingItem ? 'Modifier' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
        </Modal>

        {/* Calendar Modal */}
        <Modal
          visible={calendarModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setCalendarModal(false)}
        >
          <View style={styles.calendarModalOverlay}>
            <View style={styles.calendarModalContent}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>
                  {calendarField === 'date_creation' ? 'Date de création' : 'Date d\'éclosion'}
                </Text>
                <TouchableOpacity 
                  style={styles.calendarCloseBtn}
                  onPress={() => setCalendarModal(false)}
                >
                  <Text style={styles.calendarCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Calendar
                onDayPress={handleDateSelect}
                minDate={calendarField === 'date_creation' ? getTodayISO() : undefined}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#005F6B',
                  selectedDayBackgroundColor: '#005F6B',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#005F6B',
                  dayTextColor: '#2d4150',
                  textDisabledColor: '#d9e1e8',
                  dotColor: '#00adf5',
                  selectedDotColor: '#ffffff',
                  arrowColor: '#005F6B',
                  disabledArrowColor: '#d9e1e8',
                  monthTextColor: '#005F6B',
                  indicatorColor: '#005F6B',
                  textDayFontWeight: '300',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '300',
                  textDayFontSize: 16,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 13
                }}
              />
              
              <TouchableOpacity 
                style={styles.calendarCancelBtn}
                onPress={() => setCalendarModal(false)}
              >
                <Text style={styles.calendarCancelBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff', // Light blue-gray instead of white
  },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(147, 178, 189, 0.44)', // Lighter blue with more opacity
    paddingHorizontal: 10, // Add horizontal padding
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: '#005F6B',
    paddingTop: 15,
  },
  headerContent: {
    padding: 15,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 25,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerStats: {
    alignItems: 'center',
  },
  headerStatsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#005F6B',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#005F6B',
  },
  content: {
    flex: 1,
  },
  actionBar: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addButton: {
    backgroundColor: '#005F6B',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  list: {
    flex: 1,
    padding: 15,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collapseIndicator: {
    fontSize: 16,
    color: '#005F6B',
    fontWeight: 'bold',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  compactInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  animalType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  cardDetails: {
    marginBottom: 15,
  },
  cardInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  racesSection: {
    marginBottom: 15,
  },
  racesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  raceItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  raceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  raceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stockStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  raceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  raceStatText: {
    fontSize: 11,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#2196F3',
  },
  deleteBtn: {
    backgroundColor: '#F44336',
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  historiqueItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#005F6B',
  },
  historiqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  historiqueDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  historiqueType: {
    fontSize: 11,
    fontWeight: '600',
  },
  historiqueDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  historiqueRace: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
    marginBottom: 10,
  },
  raceSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  raceSelectorItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  raceSelectorItemSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  raceSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  raceSelectorTextSelected: {
    color: 'white',
  },
  raceConfig: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  raceConfigTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  raceConfigInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWithLabel: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  smallInput: {
    flex: 1,
    marginBottom: 0,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  typeSelectorItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeSelectorItemSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  typeSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  typeSelectorTextSelected: {
    color: 'white',
  },
  genderInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  threeColumnInputs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  halfInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 1,
    marginBottom: 0,
  },
  calculationHelper: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  calculationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#005F6B',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
  },
  modalBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Statistiques styles
  statsSection: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005F6B',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#005F6B',
    paddingBottom: 5,
  },
  globalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  globalStatCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  globalStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  globalStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  lotStatsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#005F6B',
  },
  lotStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  lotStatsDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  lotStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  lotStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  lotStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  lotStatLabel: {
    fontSize: 10,
    color: '#666',
  },
  genderStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 8,
  },
  genderStatGroup: {
    alignItems: 'center',
  },
  genderStatTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  genderStatText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  raceStatsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#005F6B',
    marginTop: 8,
    marginBottom: 5,
  },
  raceStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    marginBottom: 2,
  },
  raceStatsName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#005F6B',
    flex: 1,
    marginRight: 8,
  },
  raceStatsDetail: {
    fontSize: 11,
    color: '#333',
    fontFamily: 'monospace',
    flex: 2,
    textAlign: 'right',
  },
  raceStatsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  raceStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  raceStatsType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  raceStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  raceStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  raceStatNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  raceStatLabel: {
    fontSize: 9,
    color: '#666',
  },
  raceGenderStatsContainer: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  raceGenderStatGroup: {
    alignItems: 'center',
    marginBottom: 4,
  },
  raceGenderStatTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  raceGenderStatText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  dateFieldContainer: {
    marginBottom: 15,
  },
  dateFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  datePickerButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarCloseBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCloseBtnText: {
    fontSize: 18,
    color: '#666',
  },
  calendarCancelBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    alignItems: 'center',
  },
  calendarCancelBtnText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  
  // New styles for interactive update modal
  statusDisplayContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statusDisplayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusDisplayGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusDisplayItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusDisplayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  statusDisplayValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusDisplayBreakdown: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  
  actionSection: {
    marginBottom: 20,
  },
  actionSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  deathButton: {
    backgroundColor: '#F44336',
  },
  correctionButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  correctionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  correctionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  correctionColumn: {
    flex: 1,
    alignItems: 'center',
  },
  correctionHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  correctionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  correctionCount: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  correctionButtonFixed: {
    backgroundColor: '#2196F3',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 6,
    width: '100%',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  correctionButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  correctionButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  manualInputSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  manualInputSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 5,
  },
  manualInputHeader: {
    marginBottom: 10,
  },
  manualInputHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIndicator: {
    fontSize: 16,
    color: '#005F6B',
    fontWeight: 'bold',
    marginRight: 8,
  },
});
