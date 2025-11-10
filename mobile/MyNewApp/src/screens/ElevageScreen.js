import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  Alert,
  FlatList,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  PanResponder
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import database from '../services/database';
import configService from '../services/configService';
import { toISODate, getTodayISO, formatForCalendar, calculateEstimatedHatchingDate, addDays, getSuggestedFertilizationCheckDate } from '../utils/dateUtils';

export default function ElevageScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [lots, setLots] = useState([]);
  const [races, setRaces] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [incubationStats, setIncubationStats] = useState(null);
  const [activeTab, setActiveTab] = useState('lots');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('lot'); // 'lot', 'race', 'update', 'incubationUpdate'
  const [editingItem, setEditingItem] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [calendarModal, setCalendarModal] = useState(false);
  const [calendarField, setCalendarField] = useState(''); // 'date_creation' or 'date_eclosion'
  const [collapsedLots, setCollapsedLots] = useState({}); // Track collapsed lots
  const [isManualInputExpanded, setIsManualInputExpanded] = useState(false); // Track manual input expansion
  
  // Drag and drop state for races
  const [draggingRaceId, setDraggingRaceId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  
  const [lotForm, setLotForm] = useState({
    name: '',
    species: '', // Species selection: poussins, cailles, canards, oies, dindes, lapins, chèvres, brebis
    date_creation: '',
    incubation_start_date: '', // Date when eggs/animals were put in incubation
    fertilization_check_date: '', // Date of fertilization check
    date_eclosion: '', // Actual hatching/birth date (can be estimated or actual)
    estimated_hatching_date: '', // Calculated estimated date
    estimated_min_date: '', // Minimum estimated date
    estimated_max_date: '', // Maximum estimated date
    eggs_count: '', // Number of eggs
    fertilized_count: '', // Number of fertilized eggs
    rejected_count: '', // Number of rejected/unfertilized eggs
    hatched_count: '', // Number of hatched animals (becomes initial/current)
    races: {}, // For poultry: races within the species
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
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const manualInputExpanded = await configService.loadElevageManualInputExpanded();
      const collapsedLots = await configService.loadElevageCollapsedLots();
      
      setIsManualInputExpanded(manualInputExpanded);
      setCollapsedLots(collapsedLots);
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

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
      
      // Calculate incubation statistics from lots
      const statsData = calculateIncubationStatsFromLots(lotsData);
      setIncubationStats(statsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données d\'élevage');
    }
  };

  // Calculate incubation statistics from lots (instead of separate incubation records)
  const calculateIncubationStatsFromLots = (lotsData) => {
    const stats = {
      total_eggs: 0,
      total_fertilized: 0,
      total_hatched: 0,
      fertility_rate: 0,
      success_rate: 0,
      overall_success_rate: 0,
      by_race: {},
      by_lot: {},
      best_fecondeur: null,
      best_success_race: null
    };

    lotsData.forEach(lot => {
      if (!lot.eggs_count) return; // Skip lots without incubation data

      const raceName = Object.keys(lot.races)[0] || 'Unknown';
      
      // Initialize race stats
      if (!stats.by_race[raceName]) {
        stats.by_race[raceName] = {
          total_eggs: 0,
          total_fertilized: 0,
          total_hatched: 0,
          fertility_rate: 0,
          success_rate: 0,
          overall_success_rate: 0
        };
      }

      // Initialize lot stats
      if (!stats.by_lot[lot.id]) {
        stats.by_lot[lot.id] = {
          total_eggs: 0,
          total_fertilized: 0,
          total_hatched: 0,
          fertility_rate: 0,
          success_rate: 0,
          overall_success_rate: 0
        };
      }

      const eggs = parseInt(lot.eggs_count) || 0;
      const fertilized = parseInt(lot.fertilized_count) || 0;
      const hatched = parseInt(lot.hatched_count) || 0;

      // Add to totals
      stats.total_eggs += eggs;
      stats.total_fertilized += fertilized;
      stats.total_hatched += hatched;

      stats.by_race[raceName].total_eggs += eggs;
      stats.by_race[raceName].total_fertilized += fertilized;
      stats.by_race[raceName].total_hatched += hatched;

      stats.by_lot[lot.id].total_eggs += eggs;
      stats.by_lot[lot.id].total_fertilized += fertilized;
      stats.by_lot[lot.id].total_hatched += hatched;
    });

    // Calculate rates
    if (stats.total_eggs > 0) {
      stats.fertility_rate = (stats.total_fertilized / stats.total_eggs) * 100;
      stats.overall_success_rate = (stats.total_hatched / stats.total_eggs) * 100;
    }

    if (stats.total_fertilized > 0) {
      stats.success_rate = (stats.total_hatched / stats.total_fertilized) * 100;
    }

    // Calculate rates for each race
    Object.keys(stats.by_race).forEach(race => {
      const raceStats = stats.by_race[race];
      if (raceStats.total_eggs > 0) {
        raceStats.fertility_rate = (raceStats.total_fertilized / raceStats.total_eggs) * 100;
        raceStats.overall_success_rate = (raceStats.total_hatched / raceStats.total_eggs) * 100;
      }
      if (raceStats.total_fertilized > 0) {
        raceStats.success_rate = (raceStats.total_hatched / raceStats.total_fertilized) * 100;
      }
    });

    // Calculate rates for each lot
    Object.keys(stats.by_lot).forEach(lotId => {
      const lotStats = stats.by_lot[lotId];
      if (lotStats.total_eggs > 0) {
        lotStats.fertility_rate = (lotStats.total_fertilized / lotStats.total_eggs) * 100;
        lotStats.overall_success_rate = (lotStats.total_hatched / lotStats.total_eggs) * 100;
      }
      if (lotStats.total_fertilized > 0) {
        lotStats.success_rate = (lotStats.total_hatched / lotStats.total_fertilized) * 100;
      }
    });

    // Find best fecondeur
    let bestFertility = 0;
    let bestSuccess = 0;
    const minEggsThreshold = 10;

    Object.keys(stats.by_race).forEach(race => {
      const raceStats = stats.by_race[race];
      if (raceStats.total_eggs >= minEggsThreshold) {
        if (raceStats.fertility_rate > bestFertility) {
          bestFertility = raceStats.fertility_rate;
          stats.best_fecondeur = {
            race: race,
            fertility_rate: raceStats.fertility_rate,
            total_eggs: raceStats.total_eggs,
            total_fertilized: raceStats.total_fertilized
          };
        }
        if (raceStats.overall_success_rate > bestSuccess) {
          bestSuccess = raceStats.overall_success_rate;
          stats.best_success_race = {
            race: race,
            overall_success_rate: raceStats.overall_success_rate,
            total_eggs: raceStats.total_eggs,
            total_hatched: raceStats.total_hatched
          };
        }
      }
    });

    return stats;
  };

  const openAddLotModal = () => {
    setEditingItem(null);
    setModalType('lot');
    setLotForm({
      name: '',
      species: '',
      date_creation: getTodayISO(),
      incubation_start_date: getTodayISO(),
      fertilization_check_date: '',
      date_eclosion: '',
      estimated_hatching_date: '',
      estimated_min_date: '',
      estimated_max_date: '',
      eggs_count: '',
      fertilized_count: '',
      hatched_count: '',
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
      species: lot.species || '',
      date_creation: lot.date_creation,
      incubation_start_date: lot.incubation_start_date || lot.date_creation,
      fertilization_check_date: lot.fertilization_check_date || '',
      date_eclosion: lot.date_eclosion || lot.estimated_hatching_date || '',
      estimated_hatching_date: lot.estimated_hatching_date || '',
      estimated_min_date: lot.estimated_min_date || '',
      estimated_max_date: lot.estimated_max_date || '',
      eggs_count: lot.eggs_count?.toString() || '',
      fertilized_count: lot.fertilized_count?.toString() || '',
      rejected_count: lot.rejected_count?.toString() || '',
      hatched_count: lot.hatched_count?.toString() || '',
      races: lot.races,
      status: lot.status,
      notes: lot.notes
    });
    setModalVisible(true);
  };

  const openAddRaceModal = async () => {
    setEditingItem(null);
    setModalType('race');
    
    // Get the highest order number and add 1 for the new race
    const maxOrder = races.length > 0 
      ? Math.max(...races.map(r => r.order !== undefined ? r.order : 0), -1) + 1
      : 0;
    
    setRaceForm({
      name: '',
      type: 'poules',
      description: '',
      order: maxOrder
    });
    setModalVisible(true);
  };

  const openIncubationUpdateModal = (lot) => {
    setEditingItem(lot);
    setModalType('incubationUpdate');
    setLotForm({
      ...lot,
      eggs_count: lot.eggs_count?.toString() || '',
      fertilized_count: lot.fertilized_count?.toString() || '',
      rejected_count: lot.rejected_count?.toString() || '',
      hatched_count: lot.hatched_count?.toString() || '',
      fertilization_check_date: lot.fertilization_check_date || ''
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
    if (modalType === 'lot' || modalType === 'incubationUpdate') {
      const updatedForm = {...lotForm, [calendarField]: day.dateString};
      
      // If incubation_start_date changed, recalculate estimated hatching date
      if (calendarField === 'incubation_start_date' && updatedForm.species) {
        const hatchingDates = calculateEstimatedHatchingDate(
          updatedForm.species,
          Object.keys(updatedForm.races)[0] || '', // Use first race if multiple
          day.dateString
        );
        updatedForm.estimated_hatching_date = hatchingDates.estimatedDate;
        updatedForm.estimated_min_date = hatchingDates.minDate;
        updatedForm.estimated_max_date = hatchingDates.maxDate;
        // Auto-set date_eclosion to estimated if not set
        if (!updatedForm.date_eclosion) {
          updatedForm.date_eclosion = hatchingDates.estimatedDate;
        }
      }
      
      setLotForm(updatedForm);
    }
    setCalendarModal(false);
  };

  const saveLot = async () => {
    if (!lotForm.name || !lotForm.date_creation || !lotForm.species) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (nom, espèce, date de création)');
      return;
    }

    try {
      // Calculate estimated hatching dates if incubation_start_date is set
      let finalLotForm = {...lotForm};
      if (finalLotForm.incubation_start_date && finalLotForm.species) {
        const firstRace = Object.keys(finalLotForm.races)[0] || '';
        const hatchingDates = calculateEstimatedHatchingDate(
          finalLotForm.species,
          firstRace,
          finalLotForm.incubation_start_date
        );
        
        finalLotForm.estimated_hatching_date = hatchingDates.estimatedDate;
        finalLotForm.estimated_min_date = hatchingDates.minDate;
        finalLotForm.estimated_max_date = hatchingDates.maxDate;
        
        // If date_eclosion is not set, use estimated date
        if (!finalLotForm.date_eclosion && hatchingDates.estimatedDate) {
          finalLotForm.date_eclosion = hatchingDates.estimatedDate;
        }
      }

      // Convert string numbers to integers (only eggs_count is required initially)
      finalLotForm.eggs_count = parseInt(finalLotForm.eggs_count) || 0;
      finalLotForm.fertilized_count = parseInt(finalLotForm.fertilized_count) || 0;
      finalLotForm.rejected_count = parseInt(finalLotForm.rejected_count) || 0;
      finalLotForm.hatched_count = parseInt(finalLotForm.hatched_count) || 0;

      // Only set initial/current from hatched_count if it's actually provided
      // This allows initial creation with just eggs_count
      if (finalLotForm.hatched_count > 0 && Object.keys(finalLotForm.races).length > 0) {
        // Distribute hatched_count across races
        const raceNames = Object.keys(finalLotForm.races);
        const hatchedPerRace = Math.floor(finalLotForm.hatched_count / raceNames.length);
        const remainder = finalLotForm.hatched_count % raceNames.length;

        raceNames.forEach((raceName, index) => {
          const count = hatchedPerRace + (index < remainder ? 1 : 0);
          finalLotForm.races[raceName] = {
            ...finalLotForm.races[raceName],
            initial: count,
            current: count
          };
        });
      }

      if (editingItem) {
        await database.updateLot(editingItem.id, finalLotForm);
      } else {
        await database.addLot(finalLotForm);
      }
      
      // Sync with calendar after saving lot (including estimated hatching dates)
      await database.syncElevageWithCalendar();
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du lot:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le lot');
    }
  };

  const saveIncubationUpdate = async () => {
    if (!editingItem) return;

    try {
      const updatedLot = {
        ...editingItem,
        eggs_count: parseInt(lotForm.eggs_count) || editingItem.eggs_count || 0,
        fertilized_count: parseInt(lotForm.fertilized_count) || 0,
        rejected_count: parseInt(lotForm.rejected_count) || 0,
        hatched_count: parseInt(lotForm.hatched_count) || 0,
        fertilization_check_date: lotForm.fertilization_check_date || editingItem.fertilization_check_date || ''
      };

      // If hatched_count is set and races exist, update initial/current
      if (updatedLot.hatched_count > 0 && Object.keys(updatedLot.races).length > 0) {
        const raceNames = Object.keys(updatedLot.races);
        const hatchedPerRace = Math.floor(updatedLot.hatched_count / raceNames.length);
        const remainder = updatedLot.hatched_count % raceNames.length;

        raceNames.forEach((raceName, index) => {
          const count = hatchedPerRace + (index < remainder ? 1 : 0);
          const currentRaceData = updatedLot.races[raceName];
          updatedLot.races[raceName] = {
            ...currentRaceData,
            initial: count,
            current: currentRaceData.current || count
          };
        });
      }

      await database.updateLot(editingItem.id, updatedLot);
      await database.syncElevageWithCalendar();
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'incubation');
    }
  };

  const saveRace = async () => {
    if (!raceForm.name || !raceForm.type) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      if (editingItem) {
        // Preserve order when editing
        const raceToSave = {
          ...raceForm,
          order: editingItem.order !== undefined ? editingItem.order : 999
        };
        await database.updateRace(editingItem.id, raceToSave);
      } else {
        // Use the order from form (set in openAddRaceModal)
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

  const handleSpeciesChange = (species) => {
    const updatedForm = {
      ...lotForm,
      species: species,
      races: {} // Clear races when species changes
    };

    // Recalculate estimated dates if incubation_start_date is set
    if (updatedForm.incubation_start_date) {
      const hatchingDates = calculateEstimatedHatchingDate(
        species,
        '', // No race selected yet
        updatedForm.incubation_start_date
      );
      updatedForm.estimated_hatching_date = hatchingDates.estimatedDate;
      updatedForm.estimated_min_date = hatchingDates.minDate;
      updatedForm.estimated_max_date = hatchingDates.maxDate;
      if (!updatedForm.date_eclosion) {
        updatedForm.date_eclosion = hatchingDates.estimatedDate;
      }
    }

    setLotForm(updatedForm);
  };

  // Get available races filtered by species (for poultry) and sorted by order
  const getRacesForSpecies = (species) => {
    if (!species) return [];
    // For poultry species, filter races by matching type
    const speciesToTypeMap = {
      'poussins': 'poules',
      'cailles': 'cailles',
      'canards': 'canards',
      'oies': 'oie',
      'dindes': 'dindes'
    };
    const typeToMatch = speciesToTypeMap[species];
    let filteredRaces = [];
    
    if (!typeToMatch) {
      filteredRaces = races; // For non-poultry, return all races
    } else {
      filteredRaces = races.filter(race => race.type === typeToMatch || race.type === species);
    }
    
    // Sort by order (lower order number = higher priority)
    return filteredRaces.sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : 999;
      const orderB = b.order !== undefined ? b.order : 999;
      return orderA - orderB;
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

  const toggleLotCollapse = async (lotId) => {
    const newCollapsedLots = {
      ...collapsedLots,
      [lotId]: !collapsedLots[lotId]
    };
    setCollapsedLots(newCollapsedLots);
    await configService.saveElevageCollapsedLots(newCollapsedLots);
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
          onLongPress={() => {
            // Long press opens edit modal
            if (item.eggs_count > 0) {
              openIncubationUpdateModal(item);
            } else {
              openEditLotModal(item);
            }
          }}
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
              {item.species && (
                <Text style={styles.cardInfo}>🐾 Espèce: {item.species}</Text>
              )}
              <Text style={styles.cardInfo}>📅 Créé le: {item.date_creation}</Text>
              
              {/* Incubation dates */}
              {item.incubation_start_date && (
                <View style={styles.incubationDatesRow}>
                  <Text style={styles.incubationDateItem}>📅 Début: {item.incubation_start_date}</Text>
                  {item.fertilization_check_date && (
                    <Text style={styles.incubationDateItem}>🔍 Contrôle: {item.fertilization_check_date}</Text>
                  )}
                  {item.date_eclosion && (
                    <Text style={styles.incubationDateItem}>🐣 Éclosion: {item.date_eclosion}</Text>
                  )}
                  {item.estimated_hatching_date && !item.date_eclosion && (
                    <Text style={[styles.incubationDateItem, { color: '#2196F3', fontWeight: '600' }]}>
                      📅 Éclosion estimée: {item.estimated_hatching_date}
                    </Text>
                  )}
                </View>
              )}
              
              {/* Incubation statistics - clickable to update */}
              {item.eggs_count > 0 && (
                <>
                  <TouchableOpacity 
                    style={styles.lotIncubationStats}
                    onPress={() => openIncubationUpdateModal(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.lotIncubationStatRow}>
                      <Text style={styles.lotIncubationStatLabel}>🥚 Œufs:</Text>
                      <Text style={styles.lotIncubationStatValue}>{item.eggs_count}</Text>
                    </View>
                    <View style={styles.lotIncubationStatRow}>
                      <Text style={styles.lotIncubationStatLabel}>✅ Fécondés:</Text>
                      <Text style={styles.lotIncubationStatValue}>{item.fertilized_count || 0}</Text>
                    </View>
                    {item.rejected_count > 0 && (
                      <View style={styles.lotIncubationStatRow}>
                        <Text style={styles.lotIncubationStatLabel}>❌ Rejetés:</Text>
                        <Text style={[styles.lotIncubationStatValue, { color: '#F44336' }]}>{item.rejected_count}</Text>
                      </View>
                    )}
                    <View style={styles.lotIncubationStatRow}>
                      <Text style={styles.lotIncubationStatLabel}>🐣 Éclos:</Text>
                      <Text style={styles.lotIncubationStatValue}>{item.hatched_count || 0}</Text>
                    </View>
                    <View style={styles.tapToUpdateHint}>
                      <Text style={styles.tapToUpdateHintText}>👆 Appuyez pour mettre à jour</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.lotIncubationRates}>
                    {(() => {
                      const fertilityRate = item.eggs_count > 0 ? ((item.fertilized_count || 0) / item.eggs_count * 100).toFixed(1) : 0;
                      const successRate = item.fertilized_count > 0 ? ((item.hatched_count || 0) / item.fertilized_count * 100).toFixed(1) : 0;
                      const overallSuccessRate = item.eggs_count > 0 ? ((item.hatched_count || 0) / item.eggs_count * 100).toFixed(1) : 0;
                      
                      return (
                        <>
                          <View style={styles.lotRateItem}>
                            <Text style={styles.lotRateLabel}>Fécondité:</Text>
                            <Text style={[styles.lotRateValue, { color: fertilityRate >= 70 ? '#4CAF50' : fertilityRate >= 50 ? '#FF9800' : '#F44336' }]}>
                              {fertilityRate}%
                            </Text>
                          </View>
                          <View style={styles.lotRateItem}>
                            <Text style={styles.lotRateLabel}>Réussite:</Text>
                            <Text style={[styles.lotRateValue, { color: successRate >= 80 ? '#4CAF50' : successRate >= 60 ? '#FF9800' : '#F44336' }]}>
                              {successRate}%
                            </Text>
                          </View>
                          <View style={styles.lotRateItem}>
                            <Text style={styles.lotRateLabel}>Total:</Text>
                            <Text style={[styles.lotRateValue, { color: overallSuccessRate >= 60 ? '#4CAF50' : overallSuccessRate >= 40 ? '#FF9800' : '#F44336' }]}>
                              {overallSuccessRate}%
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </>
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
                      <Text style={styles.raceStatText}>💀 {raceData.deaths || 0} morts (♂️ {raceData.deaths_males || 0} | ♀️ {raceData.deaths_females || 0} | ❓ {raceData.deaths_unsexed || 0})</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.cardActions}>
              {item.eggs_count > 0 && (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#FF9800' }]}
                  onPress={() => openIncubationUpdateModal(item)}
                >
                  <Text style={styles.actionBtnText}>
                    {item.hatched_count ? '📋 Mettre à jour incubation' : '📋 Mettre à jour'}
                  </Text>
                </TouchableOpacity>
              )}
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

  const RaceItem = ({ item, index, totalRaces, sortedRaces }) => {
    const lotsWithRace = getLotsByRace(item.name);
    const totalStock = lotsWithRace.reduce((total, lot) => total + lot.races[item.name].current, 0);
    const isDragging = draggingRaceId === item.id;
    const isDragOver = dragOverIndex === index && draggingRaceId !== item.id;
    const longPressTimer = useRef(null);
    const touchStartY = useRef(0);
    const touchStartIndex = useRef(index);
    const isDraggingRef = useRef(false);
    const touchStartTime = useRef(0);
    const hasMoved = useRef(false);
    const touchStartX = useRef(0);
    const touchStartYRef = useRef(0);
    const cardRef = useRef(null);
    
    isDraggingRef.current = isDragging;
    
    // PanResponder that works with FlatList by using capture
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          // Don't capture if touch is on delete button
          const touchX = evt.nativeEvent.locationX;
          if (touchX > 280) {
            return false;
          }
          // Only capture if we're already dragging
          return isDraggingRef.current;
        },
        onStartShouldSetPanResponderCapture: (evt) => {
          // Capture at capture phase to beat FlatList
          if (isDraggingRef.current) {
            return true;
          }
          const touchX = evt.nativeEvent.locationX;
          if (touchX > 280) {
            return false;
          }
          return false; // Don't capture initially, wait for long press
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          if (isDraggingRef.current) {
            return true;
          }
          return false;
        },
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
          // Capture movement if dragging
          if (isDraggingRef.current) {
            return true;
          }
          // Also capture if we've held long enough and moved vertically
          const timeHeld = Date.now() - touchStartTime.current;
          if (timeHeld > 300 && Math.abs(gestureState.dy) > 15 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5) {
            // Start dragging
            setDraggingRaceId(item.id);
            touchStartY.current = evt.nativeEvent.pageY;
            touchStartIndex.current = index;
            isDraggingRef.current = true;
            return true;
          }
          return false;
        },
        onPanResponderGrant: (evt) => {
          touchStartTime.current = Date.now();
          touchStartX.current = evt.nativeEvent.locationX;
          touchStartYRef.current = evt.nativeEvent.pageY;
          touchStartY.current = evt.nativeEvent.pageY;
          touchStartIndex.current = index;
          hasMoved.current = false;
        },
        onPanResponderMove: (evt, gestureState) => {
          if (isDraggingRef.current) {
            hasMoved.current = true;
            const currentY = evt.nativeEvent.pageY;
            setDragCurrentY(currentY);
            
            // Calculate target index based on movement
            const cardHeight = 120;
            const deltaY = gestureState.dy;
            const newIndex = Math.max(0, Math.min(totalRaces - 1, Math.round(touchStartIndex.current + deltaY / cardHeight)));
            
            if (newIndex !== index && newIndex >= 0 && newIndex < totalRaces) {
              setDragOverIndex(newIndex);
            }
          }
        },
        onPanResponderRelease: async (evt) => {
          if (isDraggingRef.current) {
            // Handle drop
            if (dragOverIndex !== null && dragOverIndex !== index && sortedRaces) {
              try {
                const targetRace = sortedRaces[dragOverIndex];
                await database.reorderRaces(item.id, targetRace.id);
                loadData();
              } catch (error) {
                console.error('Erreur lors du déplacement:', error);
                Alert.alert('Erreur', 'Impossible de déplacer la race');
              }
            }
            
            // Reset dragging state
            isDraggingRef.current = false;
            setDraggingRaceId(null);
            setDragOverIndex(null);
            setDragStartY(0);
            setDragCurrentY(0);
          } else if (!hasMoved.current) {
            // Quick tap - open edit
            const touchX = evt.nativeEvent?.locationX || 0;
            const timeHeld = Date.now() - touchStartTime.current;
            if (timeHeld < 300 && touchX <= 280) {
              setTimeout(() => {
                if (!draggingRaceId) {
                  handleEdit();
                }
              }, 50);
            }
          }
          
          hasMoved.current = false;
          touchStartTime.current = 0;
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          setDraggingRaceId(null);
          setDragOverIndex(null);
          hasMoved.current = false;
          touchStartTime.current = 0;
        },
      })
    ).current;
    
    const handleLongPress = (evt) => {
      if (!isDraggingRef.current) {
        touchStartTime.current = Date.now();
        touchStartY.current = evt.nativeEvent?.pageY || 0;
        touchStartIndex.current = index;
        setDraggingRaceId(item.id);
        isDraggingRef.current = true;
      }
    };
    
    const handleEdit = () => {
      if (draggingRaceId) return;
              setEditingItem(item);
              setModalType('race');
              setRaceForm({
                name: item.name,
                type: item.type,
                description: item.description
              });
              setModalVisible(true);
    };

    const handleDelete = (e) => {
      e.stopPropagation();
      Alert.alert(
        'Supprimer la race',
        `Êtes-vous sûr de vouloir supprimer la race "${item.name}" ? Cette action est irréversible.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: async () => {
            try {
              await database.deleteRace(item.id);
              loadData();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la race');
            }
          }}
        ]
      );
    };


    const handleMoveUp = async (e) => {
      e.stopPropagation();
      if (index > 0 && sortedRaces) {
        try {
          await database.reorderRaces(item.id, sortedRaces[index - 1].id);
          loadData();
        } catch (error) {
          console.error('Erreur lors du déplacement:', error);
          Alert.alert('Erreur', 'Impossible de déplacer la race');
        }
      }
    };

    const handleMoveDown = async (e) => {
      e.stopPropagation();
      if (index < totalRaces - 1 && sortedRaces) {
        try {
          await database.reorderRaces(item.id, sortedRaces[index + 1].id);
          loadData();
        } catch (error) {
          console.error('Erreur lors du déplacement:', error);
          Alert.alert('Erreur', 'Impossible de déplacer la race');
        }
      }
    };
    
    return (
      <View
        ref={cardRef}
        style={[
          styles.card,
          isDragging && styles.cardDragging,
          isDragOver && styles.cardDragOver
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.cardContent}
          activeOpacity={isDragging ? 1 : 0.7}
          onPress={() => {
            if (!isDragging && !isDraggingRef.current) {
              handleEdit();
            }
          }}
          onLongPress={handleLongPress}
          delayLongPress={300}
          disabled={isDragging}
        >
          {/* Drag Handle on the left */}
          <View style={styles.dragHandleContainer}>
            <Text style={styles.dragHandle}>☰</Text>
          </View>
          
          {/* Main content area */}
          <View style={styles.cardMainContent}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.animalType}>🐓 {item.type}</Text>
              </View>
              <View style={styles.cardHeaderRight}>
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButtonTop,
                    pressed && styles.deleteButtonPressed
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(e);
                  }}
                >
                  <Text style={styles.deleteButtonTopText}>🗑️</Text>
                </Pressable>
              </View>
            </View>
            
            <Text style={styles.cardInfo}>{item.description}</Text>
            <Text style={styles.cardInfo}>📦 Stock total: {totalStock} animaux</Text>
            <Text style={styles.cardInfo}>📍 Présent dans {lotsWithRace.length} lot(s)</Text>
            {isDragging && (
              <Text style={styles.dragHint}>👆 Maintenez et glissez pour réorganiser</Text>
            )}
          </View>
        </TouchableOpacity>
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
        <View style={[styles.statusBarOverlay, { height: insets.top * 0.8 }]} />
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

        {activeTab === 'races' && (() => {
          const sortedRaces = [...races].sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : 999;
            const orderB = b.order !== undefined ? b.order : 999;
            return orderA - orderB;
          });
          
          return (
          <>
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.addButton} onPress={openAddRaceModal}>
                <Text style={styles.addButtonText}>+ Nouvelle Race</Text>
              </TouchableOpacity>
            </View>
            <FlatList
                data={sortedRaces}
                renderItem={({ item, index }) => (
                  <RaceItem 
                    item={item} 
                    index={index} 
                    totalRaces={sortedRaces.length}
                    sortedRaces={sortedRaces}
                  />
                )}
              keyExtractor={item => item.id.toString()}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!draggingRaceId}
            />
          </>
          );
        })()}

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

            {/* Statistiques d'incubation */}
            {incubationStats && (
              <View style={styles.statsSection}>
                <Text style={styles.statsSectionTitle}>🥚 Statistiques d'Incubation</Text>
                
                <View style={styles.globalStatsGrid}>
                  <View style={styles.globalStatCard}>
                    <Text style={styles.globalStatNumber}>{incubationStats.total_eggs}</Text>
                    <Text style={styles.globalStatLabel}>Total Œufs</Text>
                  </View>
                  <View style={styles.globalStatCard}>
                    <Text style={styles.globalStatNumber}>{incubationStats.total_fertilized}</Text>
                    <Text style={styles.globalStatLabel}>Fécondés</Text>
                  </View>
                  <View style={styles.globalStatCard}>
                    <Text style={styles.globalStatNumber}>{incubationStats.total_hatched}</Text>
                    <Text style={styles.globalStatLabel}>Éclos</Text>
                  </View>
                  <View style={styles.globalStatCard}>
                    <Text style={[styles.globalStatNumber, { color: incubationStats.fertility_rate >= 70 ? '#4CAF50' : incubationStats.fertility_rate >= 50 ? '#FF9800' : '#F44336' }]}>
                      {incubationStats.fertility_rate.toFixed(1)}%
                    </Text>
                    <Text style={styles.globalStatLabel}>Fécondité</Text>
                  </View>
                </View>

                <View style={styles.globalStatsGrid}>
                  <View style={styles.globalStatCard}>
                    <Text style={[styles.globalStatNumber, { color: incubationStats.success_rate >= 80 ? '#4CAF50' : incubationStats.success_rate >= 60 ? '#FF9800' : '#F44336' }]}>
                      {incubationStats.success_rate.toFixed(1)}%
                    </Text>
                    <Text style={styles.globalStatLabel}>Réussite</Text>
                  </View>
                  <View style={styles.globalStatCard}>
                    <Text style={[styles.globalStatNumber, { color: incubationStats.overall_success_rate >= 60 ? '#4CAF50' : incubationStats.overall_success_rate >= 40 ? '#FF9800' : '#F44336' }]}>
                      {incubationStats.overall_success_rate.toFixed(1)}%
                    </Text>
                    <Text style={styles.globalStatLabel}>Succès Total</Text>
                  </View>
                  <View style={styles.globalStatCard}>
                    <Text style={styles.globalStatNumber}>
                      {lots.filter(lot => lot.eggs_count > 0).length}
                    </Text>
                    <Text style={styles.globalStatLabel}>Lots en incubation</Text>
                  </View>
                  <View style={styles.globalStatCard}>
                    <Text style={styles.globalStatNumber}>
                      {Object.keys(incubationStats.by_race).length}
                    </Text>
                    <Text style={styles.globalStatLabel}>Races Testées</Text>
                  </View>
                </View>

                {/* Best Fecondeur Showcase */}
                {(incubationStats.best_fecondeur || incubationStats.best_success_race) && (
                  <View style={styles.bestFecondeurSection}>
                    <Text style={styles.bestFecondeurTitle}>🏆 Champions d'Incubation</Text>
                    
                    {incubationStats.best_fecondeur && (
                      <View style={styles.championCard}>
                        <Text style={styles.championLabel}>🥇 Meilleur Fécondeur</Text>
                        <Text style={styles.championName}>{incubationStats.best_fecondeur.race}</Text>
                        <Text style={styles.championStats}>
                          {incubationStats.best_fecondeur.fertility_rate.toFixed(1)}% de fécondité
                        </Text>
                        <Text style={styles.championDetails}>
                          {incubationStats.best_fecondeur.total_fertilized}/{incubationStats.best_fecondeur.total_eggs} œufs
                        </Text>
                      </View>
                    )}

                    {incubationStats.best_success_race && (
                      <View style={styles.championCard}>
                        <Text style={styles.championLabel}>🥇 Meilleur Succès Global</Text>
                        <Text style={styles.championName}>{incubationStats.best_success_race.race}</Text>
                        <Text style={styles.championStats}>
                          {incubationStats.best_success_race.overall_success_rate.toFixed(1)}% de succès total
                        </Text>
                        <Text style={styles.championDetails}>
                          {incubationStats.best_success_race.total_hatched}/{incubationStats.best_success_race.total_eggs} œufs
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

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
                        <View key={raceName} style={styles.compactRaceRow}>
                          <View style={styles.compactRaceHeader}>
                            <Text style={styles.compactRaceName}>{raceName}</Text>
                            <Text style={styles.compactRaceTotal}>{raceData.current}/{raceData.initial}</Text>
                          </View>
                          <View style={styles.compactRaceDetails}>
                            <View style={styles.compactRaceSection}>
                              <Text style={styles.compactRaceLabel}>Vivants:</Text>
                              <Text style={styles.compactRaceData}>
                                ♂️ {raceData.males||0} [{maleAlivePercent}%] | ♀️ {raceData.females||0} [{femaleAlivePercent}%] | ❓ {raceData.unsexed||0}
                        </Text>
                      </View>
                            <View style={styles.compactRaceSection}>
                              <Text style={styles.compactRaceLabel}>Morts:</Text>
                              <Text style={styles.compactRaceData}>
                                ♂️ {raceData.deaths_males||0} [{maleDeathPercent}%] | ♀️ {raceData.deaths_females||0} [{femaleDeathPercent}%] | ❓ {raceData.deaths_unsexed||0}
                              </Text>
                            </View>
                          </View>
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
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              {modalType === 'lot' && (
                <>
                  <Text style={styles.modalTitle}>
                    {editingItem ? 'Modifier le Lot' : 'Nouveau Lot'}
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Nom du lot *"
                    placeholderTextColor="#999"
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

                  {/* Species Selection */}
                  <View style={styles.inputWithLabel}>
                    <Text style={styles.inputLabel}>Espèce *</Text>
                    <View style={styles.typeSelector}>
                      {['poussins', 'cailles', 'canards', 'oies', 'dindes', 'lapins', 'chèvres', 'brebis'].map((species) => (
                        <TouchableOpacity
                          key={species}
                          style={[
                            styles.typeSelectorItem,
                            lotForm.species === species && styles.typeSelectorItemSelected
                          ]}
                          onPress={() => handleSpeciesChange(species)}
                        >
                          <Text style={[
                            styles.typeSelectorText,
                            lotForm.species === species && styles.typeSelectorTextSelected
                          ]}>
                            {species}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Incubation Start Date */}
                  {lotForm.species && (
                    <>
                      <View style={styles.dateFieldContainer}>
                        <Text style={styles.dateFieldLabel}>Date de mise en incubation/gestation *</Text>
                        <TouchableOpacity 
                          style={styles.datePickerButton}
                          onPress={() => openCalendarModal('incubation_start_date')}
                        >
                          <Text style={styles.datePickerText}>
                            {lotForm.incubation_start_date ? 
                              formatForCalendar(lotForm.incubation_start_date) : 
                              '📅 Sélectionner une date'
                            }
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Estimated Hatching Date Display */}
                      {lotForm.estimated_hatching_date && (
                        <View style={styles.estimatedDateContainer}>
                          <Text style={styles.estimatedDateTitle}>📅 Date estimée d'éclosion/naissance:</Text>
                          <Text style={styles.estimatedDateValue}>
                            {formatForCalendar(lotForm.estimated_hatching_date)}
                          </Text>
                          {lotForm.estimated_min_date && lotForm.estimated_max_date && (
                            <Text style={styles.estimatedDateRange}>
                              (Entre {formatForCalendar(lotForm.estimated_min_date)} et {formatForCalendar(lotForm.estimated_max_date)})
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Actual Hatching/Birth Date */}
                      <View style={styles.dateFieldContainer}>
                        <Text style={styles.dateFieldLabel}>Date d'éclosion/naissance (réelle ou estimée)</Text>
                        <TouchableOpacity 
                          style={styles.datePickerButton}
                          onPress={() => openCalendarModal('date_eclosion')}
                        >
                          <Text style={styles.datePickerText}>
                            {lotForm.date_eclosion ? 
                              formatForCalendar(lotForm.date_eclosion) : 
                              lotForm.estimated_hatching_date ?
                                `📅 ${formatForCalendar(lotForm.estimated_hatching_date)} (estimée)` :
                                '📅 Sélectionner une date'
                            }
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Fertilization Check Date */}
                      <View style={styles.dateFieldContainer}>
                        <Text style={styles.dateFieldLabel}>Date de contrôle de fécondité</Text>
                        <TouchableOpacity 
                          style={styles.datePickerButton}
                          onPress={() => openCalendarModal('fertilization_check_date')}
                        >
                          <Text style={styles.datePickerText}>
                            {lotForm.fertilization_check_date ? 
                              formatForCalendar(lotForm.fertilization_check_date) : 
                              '📅 Sélectionner une date'
                            }
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Incubation Statistics - Initial Setup */}
                      <Text style={styles.sectionTitle}>🥚 Données d'incubation:</Text>
                      
                      <TextInput
                        style={styles.input}
                        placeholder="Nombre d'œufs mis en incubation *"
                        placeholderTextColor="#999"
                        value={lotForm.eggs_count}
                        onChangeText={(text) => setLotForm({...lotForm, eggs_count: text})}
                        keyboardType="number-pad"
                      />

                      <Text style={styles.infoText}>
                        💡 Vous pourrez mettre à jour les données de fécondation et d'éclosion plus tard via le bouton "Mettre à jour" sur le lot.
                      </Text>
                    </>
                  )}

                  {/* Race Selection (for poultry) */}
                  {lotForm.species && ['poussins', 'cailles', 'canards', 'oies', 'dindes'].includes(lotForm.species) && (
                    <>
                      <Text style={styles.sectionTitle}>Races dans ce lot:</Text>
                  
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.raceSelector}>
                      {getRacesForSpecies(lotForm.species).map((race) => (
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
                              // Recalculate estimated dates when race is added (for special cases like barbaries)
                              if (lotForm.incubation_start_date && lotForm.species === 'canards') {
                                const hatchingDates = calculateEstimatedHatchingDate(
                                  lotForm.species,
                                  race.name,
                                  lotForm.incubation_start_date
                                );
                                setLotForm({
                                  ...lotForm,
                                  races: {
                                    ...lotForm.races,
                                    [race.name]: { initial: 0, current: 0, males: 0, females: 0, deaths: 0 }
                                  },
                                  estimated_hatching_date: hatchingDates.estimatedDate,
                                  estimated_min_date: hatchingDates.minDate,
                                  estimated_max_date: hatchingDates.maxDate
                                });
                              } else {
                                addRaceToLot(race.name);
                              }
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
                      {getRacesForSpecies(lotForm.species).length === 0 && (
                        <Text style={styles.noRacesText}>
                          Aucune race trouvée pour cette espèce. Créez d'abord une race.
                        </Text>
                      )}
                    </View>
                  </ScrollView>
                  </>
                  )}

                  {Object.entries(lotForm.races).map(([raceName, raceData]) => (
                    <View key={raceName} style={styles.raceConfig}>
                      <Text style={styles.raceConfigTitle}>{raceName}:</Text>
                      <View style={styles.raceConfigInputs}>
                        <View style={styles.inputWithLabel}>
                          <Text style={styles.inputLabel}>Initialement:</Text>
                          <TextInput
                            style={[styles.input, styles.smallInput]}
                            placeholder="0"
                            placeholderTextColor="#999"
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
                            placeholderTextColor="#999"
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
                    placeholderTextColor="#999"
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
                    placeholderTextColor="#999"
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
                    placeholderTextColor="#999"
                    value={raceForm.description}
                    onChangeText={(text) => setRaceForm({...raceForm, description: text})}
                    multiline={true}
                    numberOfLines={3}
                  />
                </>
              )}

              {modalType === 'incubationUpdate' && (
                <>
                  <Text style={styles.modalTitle}>
                    Mise à jour d'incubation: {editingItem?.name}
                  </Text>

                  {/* Incubation Timeline */}
                  <View style={styles.timelineContainer}>
                    <Text style={styles.timelineTitle}>📋 Chronologie d'incubation</Text>
                    
                    {/* Stage 1: Incubation Start */}
                    <View style={styles.timelineStep}>
                      <View style={[styles.timelineDot, styles.timelineDotCompleted]}>
                        <Text style={styles.timelineDotText}>1</Text>
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineStepTitle}>Début d'incubation</Text>
                        <Text style={styles.timelineStepDate}>
                          {formatForCalendar(editingItem?.incubation_start_date || lotForm.incubation_start_date)}
                        </Text>
                        <Text style={styles.timelineStepDetail}>
                          {editingItem?.eggs_count || lotForm.eggs_count} œufs mis en incubation
                        </Text>
                      </View>
                    </View>

                    {/* Stage 2: Fertilization Check */}
                    <View style={styles.timelineStep}>
                      <View style={[
                        styles.timelineDot, 
                        (lotForm.fertilization_check_date || editingItem?.fertilization_check_date) ? styles.timelineDotCompleted : styles.timelineDotPending
                      ]}>
                        <Text style={styles.timelineDotText}>2</Text>
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineStepTitle}>
                          Contrôle de fécondité {(lotForm.fertilization_check_date || editingItem?.fertilization_check_date) ? '(Terminé)' : '(En attente)'}
                        </Text>
                        {lotForm.fertilization_check_date || editingItem?.fertilization_check_date ? (
                          <>
                            <Text style={styles.timelineStepDate}>
                              {formatForCalendar(lotForm.fertilization_check_date || editingItem?.fertilization_check_date)}
                            </Text>
                            <TouchableOpacity 
                              style={[styles.suggestionButton, { backgroundColor: '#9E9E9E', marginBottom: 8 }]}
                              onPress={() => {
                                // Allow changing the date even after it's set
                                openCalendarModal('fertilization_check_date');
                              }}
                            >
                              <Text style={styles.suggestionButtonText}>📅 Modifier la date</Text>
                            </TouchableOpacity>
                            <View style={styles.inputGroup}>
                              <TextInput
                                style={styles.input}
                                placeholder="Nombre d'œufs fécondés"
                                placeholderTextColor="#999"
                                value={lotForm.fertilized_count}
                                onChangeText={(text) => setLotForm({...lotForm, fertilized_count: text})}
                                keyboardType="number-pad"
                              />
                              <TextInput
                                style={styles.input}
                                placeholder="Nombre d'œufs rejetés/non fécondés"
                                placeholderTextColor="#999"
                                value={lotForm.rejected_count}
                                onChangeText={(text) => setLotForm({...lotForm, rejected_count: text})}
                                keyboardType="number-pad"
                              />
                              <Text style={styles.infoText}>
                                💡 Total: {parseInt(lotForm.fertilized_count || 0) + parseInt(lotForm.rejected_count || 0)} sur {lotForm.eggs_count || editingItem?.eggs_count || 0} œufs
                              </Text>
                            </View>
                          </>
                        ) : (
                          <>
                            <Text style={styles.timelineStepSuggestion}>
                              💡 Date suggérée: {formatForCalendar(getSuggestedFertilizationCheckDate(lotForm.incubation_start_date || editingItem?.incubation_start_date))}
                            </Text>
                            <TouchableOpacity 
                              style={styles.suggestionButton}
                              onPress={() => {
                                const suggestedDate = getSuggestedFertilizationCheckDate(lotForm.incubation_start_date || editingItem?.incubation_start_date);
                                setLotForm({...lotForm, fertilization_check_date: suggestedDate});
                              }}
                            >
                              <Text style={styles.suggestionButtonText}>✓ Utiliser la date suggérée</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.suggestionButton, styles.customDateButton]}
                              onPress={() => openCalendarModal('fertilization_check_date')}
                            >
                              <Text style={styles.suggestionButtonText}>📅 Choisir une autre date</Text>
                            </TouchableOpacity>
                            {lotForm.fertilization_check_date && (
                              <View style={styles.inputGroup}>
                                <TextInput
                                  style={styles.input}
                                  placeholder="Nombre d'œufs fécondés"
                                  placeholderTextColor="#999"
                                  value={lotForm.fertilized_count}
                                  onChangeText={(text) => setLotForm({...lotForm, fertilized_count: text})}
                                  keyboardType="number-pad"
                                />
                                <TextInput
                                  style={styles.input}
                                  placeholder="Nombre d'œufs rejetés/non fécondés"
                                  placeholderTextColor="#999"
                                  value={lotForm.rejected_count}
                                  onChangeText={(text) => setLotForm({...lotForm, rejected_count: text})}
                                  keyboardType="number-pad"
                                />
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    </View>

                    {/* Stage 3: Hatching */}
                    <View style={styles.timelineStep}>
                      <View style={[
                        styles.timelineDot, 
                        (lotForm.hatched_count || editingItem?.hatched_count) ? styles.timelineDotCompleted : styles.timelineDotPending
                      ]}>
                        <Text style={styles.timelineDotText}>3</Text>
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineStepTitle}>
                          Éclosion {(lotForm.hatched_count || editingItem?.hatched_count) ? '(Terminé)' : '(En attente)'}
                        </Text>
                        {lotForm.hatched_count || editingItem?.hatched_count ? (
                          <>
                            <Text style={styles.timelineStepDate}>
                              {formatForCalendar(lotForm.date_eclosion || editingItem?.date_eclosion || lotForm.estimated_hatching_date || editingItem?.estimated_hatching_date || '')}
                            </Text>
                            <TouchableOpacity 
                              style={[styles.suggestionButton, { backgroundColor: '#9E9E9E', marginBottom: 8 }]}
                              onPress={() => openCalendarModal('date_eclosion')}
                            >
                              <Text style={styles.suggestionButtonText}>📅 Modifier la date d'éclosion</Text>
                            </TouchableOpacity>
                            <TextInput
                              style={styles.input}
                              placeholder="Nombre éclos/nés"
                              placeholderTextColor="#999"
                              value={lotForm.hatched_count}
                              onChangeText={(text) => setLotForm({...lotForm, hatched_count: text})}
                              keyboardType="number-pad"
                            />
                            <Text style={styles.infoText}>
                              💡 La modification de ce nombre mettra à jour automatiquement les quantités initiales des races.
                            </Text>
                          </>
                        ) : (
                          <>
                            {lotForm.estimated_hatching_date && (
                              <Text style={styles.timelineStepSuggestion}>
                                📅 Date estimée: {formatForCalendar(lotForm.estimated_hatching_date)}
                              </Text>
                            )}
                            <TextInput
                              style={styles.input}
                              placeholder="Nombre éclos/nés"
                              placeholderTextColor="#999"
                              value={lotForm.hatched_count}
                              onChangeText={(text) => setLotForm({...lotForm, hatched_count: text})}
                              keyboardType="number-pad"
                            />
                            <Text style={styles.infoText}>
                              💡 Le nombre éclos sera utilisé comme quantité initiale pour les races.
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
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
                    onPress={async () => {
                      const newExpanded = !isManualInputExpanded;
                      setIsManualInputExpanded(newExpanded);
                      await configService.saveElevageManualInputExpanded(newExpanded);
                    }}
                  >
                    <Text style={styles.sectionTitle}>✏️ Saisie manuelle</Text>
                    <Text style={styles.expandIndicator}>
                      {isManualInputExpanded ? '▼' : '▶'}
                    </Text>
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
                        placeholderTextColor="#999"
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
                        placeholderTextColor="#999"
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
                        placeholderTextColor="#999"
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
                        placeholderTextColor="#999"
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
                        placeholderTextColor="#999"
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
                        placeholderTextColor="#999"
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
                    placeholderTextColor="#999"
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
                  onPress={async () => {
                    if (modalType === 'lot') {
                      saveLot();
                    } else if (modalType === 'race') {
                      saveRace();
                    } else if (modalType === 'update') {
                      saveUpdate();
                    } else if (modalType === 'incubationUpdate') {
                      await saveIncubationUpdate();
                    }
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    {modalType === 'incubationUpdate' ? 'Enregistrer' : editingItem ? 'Modifier' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
                {calendarField === 'date_creation' ? 'Date de création' : 
                 calendarField === 'date_eclosion' ? 'Date d\'éclosion/naissance' :
                 calendarField === 'incubation_start_date' ? 'Date de mise en incubation/gestation' :
                 calendarField === 'fertilization_check_date' ? 'Date de contrôle de fécondité' :
                 'Sélectionner une date'}
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
    paddingTop: 38,
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
  reorderButtons: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 8,
  },
  reorderButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  reorderButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reorderButtonTextDisabled: {
    color: '#999',
  },
  deleteButtonTop: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  deleteButtonPressed: {
    opacity: 0.5,
    transform: [{ scale: 0.9 }],
  },
  deleteButtonTopText: {
    fontSize: 14,
    color: '#F44336',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandleContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardDragging: {
    opacity: 0.7,
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    transform: [{ scale: 1.02 }],
    zIndex: 1000,
  },
  cardDragOver: {
    borderTopWidth: 3,
    borderTopColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  dragHandle: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },
  cardMainContent: {
    flex: 1,
  },
  dragHint: {
    fontSize: 11,
    color: '#2196F3',
    fontStyle: 'italic',
    marginTop: 5,
    textAlign: 'center',
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
    flexDirection: 'column',
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
    maxHeight: Platform.OS === 'ios' ? '85%' : '90%',
    maxWidth: '95%',
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  expandIndicator: {
    fontSize: 16,
    color: '#005F6B',
    fontWeight: 'bold',
  },
  
  // Compact race display styles
  compactRaceRow: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#005F6B',
  },
  compactRaceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactRaceName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  compactRaceTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactRaceDetails: {
    gap: 2,
  },
  compactRaceSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactRaceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    width: 50,
  },
  compactRaceData: {
    fontSize: 11,
    color: '#333',
    fontFamily: 'monospace',
    flex: 1,
  },
  
  // Incubation styles
  incubationDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  incubationDetails: {
    marginBottom: 10,
  },
  incubationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  incubationStatRow: {
    alignItems: 'center',
  },
  incubationStatLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  incubationStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  incubationRates: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  rateItem: {
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  incubationNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
  },
  lotSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  lotSelectorItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  lotSelectorItemSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  lotSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  lotSelectorTextSelected: {
    color: 'white',
  },
  
  // Champion showcase styles
  bestFecondeurSection: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffd54f',
  },
  bestFecondeurTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    textAlign: 'center',
    marginBottom: 15,
  },
  championCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffd54f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  championLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 4,
  },
  championName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  championStats: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 2,
  },
  championDetails: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  
  // Estimated date styles
  estimatedDateContainer: {
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#005F6B',
  },
  estimatedDateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#005F6B',
    marginBottom: 5,
  },
  estimatedDateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  estimatedDateRange: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  noRacesText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    padding: 10,
    textAlign: 'center',
  },
  
  // Lot incubation display styles (similar to image)
  incubationDatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 8,
  },
  incubationDateItem: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
  lotIncubationStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lotIncubationStatRow: {
    alignItems: 'center',
  },
  lotIncubationStatLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  lotIncubationStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  tapToUpdateHint: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  tapToUpdateHintText: {
    fontSize: 11,
    color: '#FF9800',
    fontStyle: 'italic',
  },
  inputGroup: {
    marginTop: 8,
  },
  lotIncubationRates: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  lotRateItem: {
    alignItems: 'center',
  },
  lotRateLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  lotRateValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Timeline styles for incubation workflow
  timelineContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
    marginBottom: 15,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 2,
  },
  timelineDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineDotPending: {
    backgroundColor: '#FF9800',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  timelineDotText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  timelineStepDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  timelineStepDetail: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  timelineStepSuggestion: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 6,
  },
  suggestionButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  customDateButton: {
    backgroundColor: '#005F6B',
  },
  suggestionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  infoText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
});
