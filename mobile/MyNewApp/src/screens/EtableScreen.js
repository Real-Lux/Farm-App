import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Platform,
  KeyboardAvoidingView,
  InteractionManager
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import database from '../services/database';
import configService from '../services/configService';
import { toISODate, getTodayISO, formatForCalendar } from '../utils/dateUtils';
import { useHerdAnimals } from '../hooks/useHerdAnimals';
import { useGroups } from '../hooks/useGroups';
import { useHerdConfig } from '../hooks/useHerdConfig';
import AnimalItem from '../components/etable/AnimalItem';
import ViewModeToggle from '../components/etable/ViewModeToggle';
import GroupCard from '../components/etable/GroupCard';
import QuickStats from '../components/etable/QuickStats';
import { getAnimalAge, getAnimalAgeForGenealogy, getTotalMilkProduction, getAverageMilkProduction, getBabyMales, getBabyFemales, getGrownMales, getDeceasedAnimals } from '../utils/animalUtils';

export default function EtableScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('animals');
  
  // Get route parameters for highlighting specific animals and herd type
  const { highlightAnimalId, highlightAnimalName, herdType = 'caprin' } = route?.params || {};
  const [currentHerdType, setCurrentHerdType] = useState(herdType);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('animal'); // 'animal', 'milk', 'genealogy', 'settings'
  const [editingItem, setEditingItem] = useState(null);
  const [calendarModal, setCalendarModal] = useState(false);
  const [calendarField, setCalendarField] = useState('');
  const [collapsedAnimals, setCollapsedAnimals] = useState({});
  const [caprinSettings, setCaprinSettings] = useState({
    milkRecordingMethod: 'group',
    groupMilkProduction: [],
    graphPeriod: 7
  });
  const [animalSortOrder, setAnimalSortOrder] = useState('age'); // 'age', 'name', 'species', 'entryDate'
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [highlightedAnimalId, setHighlightedAnimalId] = useState(null);
  const [highlightedAnimalName, setHighlightedAnimalName] = useState(null);
  
  // Refs for scrolling
  const animalsScrollViewRef = useRef(null);
  const animalItemPositions = useRef({});
  const animalItemRefs = useRef({});
  const scrollToAnimalIdRef = useRef(null);
  
  // Use custom hooks
  const { animals, loadAnimals, saveAnimal, deleteAnimal } = useHerdAnimals(currentHerdType);
  const { groups, loadGroups, addGroup, updateGroup, deleteGroup } = useGroups(currentHerdType);
  const { getHerdConfig, getDefaultSpecies, getAvailableSpecies } = useHerdConfig(currentHerdType);
  
  const [animalForm, setAnimalForm] = useState({
    name: '',
    species: getDefaultSpecies(),
    breed: '',
    birthDate: '',
    entryDate: '',
    exitDate: '',
    entryCause: 'naissance',
    exitCause: '',
    herdNumber: '',
    earTagNumber: '',
    buyerSellerName: '',
    mother: '',
    father: '',
    gender: 'femelle',
    status: 'vivant',
    notes: ''
  });

  const [milkForm, setMilkForm] = useState({
    animalId: '',
    date: getTodayISO(),
    morning: '',
    evening: '',
    notes: ''
  });

  const [genealogyForm, setGenealogyForm] = useState({
    animalId: '',
    relationship: 'parent',
    relatedAnimalId: '',
    notes: ''
  });

  const [groupMilkForm, setGroupMilkForm] = useState({
    date: getTodayISO(),
    total: '',
    notes: ''
  });

  // Groups state
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'groups'
  const [groupModal, setGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    animalIds: []
  });
  const [selectedAnimalsForGroup, setSelectedAnimalsForGroup] = useState({});

  // Update currentHerdType when route params change
  useEffect(() => {
    if (route?.params?.herdType && route.params.herdType !== currentHerdType) {
      console.log('🔄 Updating herd type from', currentHerdType, 'to', route.params.herdType);
      setCurrentHerdType(route.params.herdType);
    }
  }, [route?.params?.herdType]);

  useEffect(() => {
    loadCaprinSettings();
    loadConfigs();
  }, [currentHerdType]);

  // Handle highlighting specific animal when navigating from calendar
  useEffect(() => {
    if (highlightAnimalId && animals.length > 0) {
      const targetAnimal = animals.find(animal => animal.id == highlightAnimalId);
      if (targetAnimal) {
        // Set highlighted animal state (like commandes do)
        setHighlightedAnimalId(highlightAnimalId);
        setHighlightedAnimalName(highlightAnimalName || targetAnimal.name);
        console.log('🐐 Highlighting animal from calendar:', targetAnimal.name);
        
        // Remove highlight after 3 seconds (like commandes do)
        setTimeout(() => {
          setHighlightedAnimalId(null);
          setHighlightedAnimalName(null);
        }, 3000);
      }
    }
  }, [highlightAnimalId, animals]);

  // Debug sort order changes
  useEffect(() => {
    console.log('🔧 Sort order changed to:', animalSortOrder);
  }, [animalSortOrder]);

  // Debug highlighting changes
  useEffect(() => {
    console.log('🎯 Highlighting state changed - ID:', highlightedAnimalId, 'Name:', highlightedAnimalName);
  }, [highlightedAnimalId, highlightedAnimalName]);

  // Auto-scroll when tab changes to animals and an animal is highlighted
  useEffect(() => {
    if (activeTab === 'animals' && scrollToAnimalIdRef.current) {
      // Use InteractionManager for better timing after tab switch
      const handle = InteractionManager.runAfterInteractions(() => {
        // Try scrolling immediately, and retry if position not yet stored
        const tryScroll = () => {
          if (animalItemPositions.current[scrollToAnimalIdRef.current]) {
            scrollToAnimal(scrollToAnimalIdRef.current);
            scrollToAnimalIdRef.current = null;
          } else {
            // Retry after a short delay if position not yet available
            setTimeout(tryScroll, 50);
          }
        };
        tryScroll();
      });
      
      return () => handle.cancel();
    }
  }, [activeTab, sortedAnimals]);

  // Initialize all animals as collapsed by default
  useEffect(() => {
    if (animals.length > 0) {
      setCollapsedAnimals(prev => {
        // Only add animals that aren't already in the state
        const updated = { ...prev };
        let hasChanges = false;
        
        animals.forEach(animal => {
          // If animal ID is not in state, default to collapsed (true)
          if (!(animal.id in updated)) {
            updated[animal.id] = true;
            hasChanges = true;
          }
        });
        
        // Remove animals that no longer exist
        const animalIds = new Set(animals.map(a => a.id));
        Object.keys(updated).forEach(id => {
          if (!animalIds.has(parseInt(id)) && !animalIds.has(id)) {
            delete updated[id];
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }
  }, [animals]); // Run when animals array changes


  const loadConfigs = async () => {
    try {
      const milkMethod = await configService.loadCaprinMilkMethod();
      const graphPeriod = await configService.loadCaprinGraphPeriod();
      
      setCaprinSettings(prev => ({
        ...prev,
        milkRecordingMethod: milkMethod,
        graphPeriod: graphPeriod
      }));
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };


  const loadCaprinSettings = async () => {
    try {
      const settings = await database.getCaprinSettings();
      setCaprinSettings(settings);
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  };

  const openAddAnimalModal = () => {
    setEditingItem(null);
    setModalType('animal');
    setAnimalForm({
      name: '',
      species: getDefaultSpecies(),
      breed: '',
      birthDate: '',
      entryDate: '',
      exitDate: '',
      entryCause: 'naissance',
      exitCause: '',
      herdNumber: '',
      earTagNumber: '',
      buyerSellerName: '',
      mother: '',
      father: '',
      gender: 'femelle',
      status: 'vivant',
      notes: ''
    });
    setModalVisible(true);
  };

  const openEditAnimalModal = (animal) => {
    setEditingItem(animal);
    setModalType('animal');
    setAnimalForm({
      name: animal.name,
      species: animal.species,
      breed: animal.breed,
      birthDate: animal.birthDate,
      entryDate: animal.entryDate || '',
      exitDate: animal.exitDate || '',
      entryCause: animal.entryCause || 'naissance',
      exitCause: animal.exitCause || '',
      herdNumber: animal.herdNumber || '',
      earTagNumber: animal.earTagNumber || '',
      buyerSellerName: animal.buyerSellerName || '',
      mother: animal.mother || '',
      father: animal.father || '',
      gender: animal.gender,
      status: animal.status,
      notes: animal.notes || ''
    });
    setModalVisible(true);
  };

  const openMilkModal = (animal) => {
    setModalType('milk');
    setMilkForm({
      animalId: animal.id,
      date: getTodayISO(),
      morning: '',
      evening: '',
      notes: ''
    });
    setModalVisible(true);
  };

  const openGenealogyModal = (animal) => {
    // Navigate to genealogy tab and highlight the animal immediately
    console.log('🐐 Navigating to genealogy for animal:', animal.name, 'ID:', animal.id);
    setHighlightedAnimalId(animal.id);
    setHighlightedAnimalName(animal.name);
    setActiveTab('genealogy');
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedAnimalId(null);
      setHighlightedAnimalName(null);
    }, 3000);
  };

  const openAnimalsFromGenealogy = (animal) => {
    // Navigate to animals tab and highlight the animal immediately
    console.log('🐐 Navigating to animals from genealogy for animal:', animal.name, 'ID:', animal.id);
    
    // Set highlight and tab change immediately
    setHighlightedAnimalId(animal.id);
    setHighlightedAnimalName(animal.name);
    setActiveTab('animals');
    
    // Expand the animal card if it's collapsed (default is collapsed)
    if (collapsedAnimals[animal.id] ?? true) {
      toggleAnimalCollapse(animal.id);
    }
    
    // Store the animal ID to scroll to after layout
    scrollToAnimalIdRef.current = animal.id;
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedAnimalId(null);
      setHighlightedAnimalName(null);
    }, 3000);
  };

  const scrollToAnimal = (animalId) => {
    if (!animalsScrollViewRef.current) return;
    
    // Use stored position if available (most reliable)
    const storedPosition = animalItemPositions.current[animalId];
    if (storedPosition !== undefined) {
      console.log('📜 Scrolling to animal ID:', animalId, 'at stored position:', storedPosition);
      animalsScrollViewRef.current.scrollTo({
        y: Math.max(0, storedPosition - 20), // 20px offset from top
        animated: true
      });
      return;
    }
    
    // Fallback to calculation
    scrollToAnimalFallback(animalId);
  };

  const scrollToAnimalFallback = (animalId) => {
    if (!animalsScrollViewRef.current) return;
    
    // Find the animal in the sorted list
    const animalIndex = sortedAnimals.findIndex(a => a.id === animalId || a.id == animalId);
    
    if (animalIndex === -1) {
      console.log('⚠️ Animal not found in sorted list');
      return;
    }
    
    // Calculate approximate position based on index
    // QuickStats: ~120px, ViewModeToggle: ~60px, section header: ~60px, sort dropdown: ~50px
    const headerHeight = 120 + 60 + 60 + 50;
    let cumulativeHeight = headerHeight;
    
    // Calculate cumulative height of all previous animals
    for (let i = 0; i < animalIndex; i++) {
      const prevAnimal = sortedAnimals[i];
      const isCollapsed = collapsedAnimals[prevAnimal.id] ?? true;
      cumulativeHeight += isCollapsed ? 100 : 290;
    }
    
    console.log('📜 Scrolling to animal at index:', animalIndex, 'calculated scrollY:', cumulativeHeight);
    animalsScrollViewRef.current.scrollTo({
      y: Math.max(0, cumulativeHeight - 20), // 20px offset from top
      animated: true
    });
  };

  const handleAnimalLayout = (animalId, event) => {
    // Measure the actual position - y is relative to parent, but we need cumulative from ScrollView start
    const { y, height } = event.nativeEvent.layout;
    
    // Find the index to calculate cumulative height from start of ScrollView
    const animalIndex = sortedAnimals.findIndex(a => a.id === animalId || a.id == animalId);
    if (animalIndex !== -1) {
      // Calculate cumulative height: header components + previous cards
      // QuickStats: ~120px, ViewModeToggle: ~60px, section header: ~60px, sort dropdown: ~50px
      const headerHeight = 120 + 60 + 60 + 50;
      let cumulativeHeight = headerHeight;
      
      // Add heights of previous animals (more accurate estimates)
      for (let i = 0; i < animalIndex; i++) {
        const prevAnimal = sortedAnimals[i];
        const isCollapsed = collapsedAnimals[prevAnimal.id] ?? true;
        cumulativeHeight += isCollapsed ? 100 : 290;
      }
      
      // Store the position
      animalItemPositions.current[animalId] = cumulativeHeight;
      
      // If this is the animal we need to scroll to, do it now with the stored position
      if (scrollToAnimalIdRef.current === animalId) {
        // Use requestAnimationFrame for immediate scroll after layout
        requestAnimationFrame(() => {
          scrollToAnimal(animalId);
          scrollToAnimalIdRef.current = null;
        });
      }
    }
  };

  const openSettingsModal = () => {
    setModalType('settings');
    setModalVisible(true);
  };

  const openGroupMilkModal = () => {
    setModalType('groupMilk');
    setGroupMilkForm({
      date: getTodayISO(),
      total: '',
      notes: ''
    });
    setModalVisible(true);
  };

  const openCalendarModal = (field) => {
    setCalendarField(field);
    setCalendarModal(true);
  };

  const handleDateSelect = (day) => {
    if (modalType === 'animal') {
      setAnimalForm({...animalForm, [calendarField]: day.dateString});
    } else if (modalType === 'milk') {
      setMilkForm({...milkForm, [calendarField]: day.dateString});
    } else if (modalType === 'groupMilk') {
      setGroupMilkForm({...groupMilkForm, [calendarField]: day.dateString});
    }
    setCalendarModal(false);
  };

  const handleSaveAnimal = async () => {
    if (!animalForm.name || !animalForm.species || !animalForm.birthDate || !animalForm.entryDate) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (nom, espèce, date de naissance, date d\'entrée)');
      return;
    }

    const animalData = {
      ...animalForm,
      milkProduction: editingItem ? editingItem.milkProduction || [] : [],
      offspring: editingItem ? editingItem.offspring || [] : [],
      parents: { mother: animalForm.mother, father: animalForm.father }
    };

    const result = await saveAnimal(animalData, editingItem);
    if (result.success) {
      setModalVisible(false);
    }
  };

  const saveMilkProduction = async () => {
    if (!milkForm.morning || !milkForm.evening) {
      Alert.alert('Erreur', 'Veuillez remplir les quantités de lait');
      return;
    }

    try {
      const milkData = {
        date: milkForm.date,
        morning: parseFloat(milkForm.morning),
        evening: parseFloat(milkForm.evening),
        total: parseFloat(milkForm.morning) + parseFloat(milkForm.evening),
        notes: milkForm.notes
      };

      await database.addMilkProduction(milkForm.animalId, milkData);
      
      // Reload animals from database
      await loadAnimals();
      setModalVisible(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la production laitière:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la production laitière');
    }
  };

  const saveGroupMilkProduction = async () => {
    if (!groupMilkForm.total) {
      Alert.alert('Erreur', 'Veuillez remplir la quantité totale de lait');
      return;
    }

    try {
      const milkData = {
        date: groupMilkForm.date,
        total: parseFloat(groupMilkForm.total),
        notes: groupMilkForm.notes
      };

      await database.addGroupMilkProduction(milkData);
      
      // Reload settings from database
      await loadCaprinSettings();
      setModalVisible(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la production laitière du troupeau:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la production laitière du troupeau');
    }
  };

  const saveSettings = async () => {
    try {
      await database.updateCaprinSettings(caprinSettings);
      // Save configs to AsyncStorage
      await configService.saveCaprinMilkMethod(caprinSettings.milkRecordingMethod);
      await configService.saveCaprinGraphPeriod(caprinSettings.graphPeriod);
      await loadCaprinSettings();
      setModalVisible(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres');
    }
  };

  const handleDeleteAnimal = (id) => {
    Alert.alert(
      'Supprimer l\'animal',
      'Êtes-vous sûr de vouloir supprimer cet animal ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          await deleteAnimal(id);
        }}
      ]
    );
  };

  const toggleAnimalCollapse = (animalId) => {
    setCollapsedAnimals(prev => ({
      ...prev,
      [animalId]: !(prev[animalId] ?? true) // Default to true (collapsed), then toggle
    }));
  };


  const getTotalGroupMilkProduction = () => {
    if (!caprinSettings.groupMilkProduction || caprinSettings.groupMilkProduction.length === 0) return 0;
    return caprinSettings.groupMilkProduction.reduce((total, day) => total + day.total, 0);
  };

  const getAverageGroupMilkProduction = () => {
    if (!caprinSettings.groupMilkProduction || caprinSettings.groupMilkProduction.length === 0) return 0;
    const total = getTotalGroupMilkProduction();
    return (total / caprinSettings.groupMilkProduction.length).toFixed(1);
  };

  const getWeeklyMilkProduction = () => {
    if (!caprinSettings.groupMilkProduction) return 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoISO = oneWeekAgo.toISOString().split('T')[0];
    
    return caprinSettings.groupMilkProduction
      .filter(day => day.date >= oneWeekAgoISO)
      .reduce((total, day) => total + day.total, 0);
  };

  const getMonthlyMilkProduction = () => {
    if (!caprinSettings.groupMilkProduction) return 0;
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const oneMonthAgoISO = oneMonthAgo.toISOString().split('T')[0];
    
    return caprinSettings.groupMilkProduction
      .filter(day => day.date >= oneMonthAgoISO)
      .reduce((total, day) => total + day.total, 0);
  };

  const getLast30DaysData = () => {
    if (!caprinSettings.groupMilkProduction) return [];
    
    const last30Days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateISO = date.toISOString().split('T')[0];
      
      const dayData = caprinSettings.groupMilkProduction.find(day => day.date === dateISO);
      last30Days.push({
        date: dateISO,
        total: dayData ? dayData.total : 0
      });
    }
    
    return last30Days;
  };

  const getPeriodData = () => {
    if (!caprinSettings.groupMilkProduction) return [];
    
    const periodDays = [];
    const today = new Date();
    
    for (let i = caprinSettings.graphPeriod - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateISO = date.toISOString().split('T')[0];
      
      const dayData = caprinSettings.groupMilkProduction.find(day => day.date === dateISO);
      periodDays.push({
        date: dateISO,
        total: dayData ? dayData.total : 0
      });
    }
    
    return periodDays;
  };

  const getMaxDailyProduction = () => {
    const last30Days = getLast30DaysData();
    return Math.max(...last30Days.map(day => day.total), 1);
  };

  const getMaxDailyProductionForPeriod = () => {
    const periodData = getPeriodData();
    return Math.max(...periodData.map(day => day.total), 1);
  };

  const getBabyAnimals = () => {
    return animals.filter(animal => {
      const birthDate = new Date(animal.birthDate);
      const today = new Date();
      const diffTime = Math.abs(today - birthDate);
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
      return diffMonths < 7; // Babies are 0-6 months old
    });
  };

  // Helper functions for genealogy tree
  const findAnimalByName = (name) => {
    return animals.find(animal => animal.name === name);
  };

  const buildFamilyTree = () => {
    const tree = [];
    const processed = new Set();

    // Find root animals (those without parents or with unknown parents)
    const rootAnimals = animals.filter(animal => 
      (!animal.parents || (!animal.parents.mother && !animal.parents.father)) &&
      !processed.has(animal.id)
    );

    const buildNode = (animal, level = 0) => {
      if (processed.has(animal.id)) return null;
      processed.add(animal.id);

      const node = {
        ...animal,
        level,
        children: []
      };

      // Find children
      const children = animals.filter(child => 
        (child.parents && 
         (child.parents.mother === animal.name || child.parents.father === animal.name)) &&
        !processed.has(child.id)
      );

      children.forEach(child => {
        const childNode = buildNode(child, level + 1);
        if (childNode) {
          node.children.push(childNode);
        }
      });

      return node;
    };

    rootAnimals.forEach(rootAnimal => {
      const rootNode = buildNode(rootAnimal);
      if (rootNode) {
        tree.push(rootNode);
      }
    });

    // Add any remaining animals that weren't connected
    animals.forEach(animal => {
      if (!processed.has(animal.id)) {
        tree.push({ ...animal, level: 0, children: [] });
      }
    });

    return tree;
  };

  const getGrownMales = () => {
    return animals.filter(animal => {
      if (animal.gender !== 'mâle') return false;
      const birthDate = new Date(animal.birthDate);
      const today = new Date();
      const diffTime = Math.abs(today - birthDate);
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
      return diffMonths >= 7; // Grown males are 7+ months old
    });
  };

  const AnimalItem = ({ item }) => {
    const isCollapsed = collapsedAnimals[item.id] ?? true; // Default to collapsed
    const age = getAnimalAge(item.birthDate);
    const totalMilk = getTotalMilkProduction(item);
    const avgMilk = getAverageMilkProduction(item);
    
    // Check if this animal is highlighted
    const isHighlighted = (highlightedAnimalId === item.id || highlightedAnimalId == item.id) || 
                         (highlightedAnimalName === item.name);
    
    return (
      <View style={[
        styles.card,
        isHighlighted && styles.animalCardHighlighted
      ]}>
        <TouchableOpacity 
          style={styles.cardHeader}
          onPress={() => toggleAnimalCollapse(item.id)}
        >
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.collapseIndicator}>
              {isCollapsed ? '▶' : '▼'}
            </Text>
            <Text style={styles.animalIcon}>
              {getHerdConfig().emoji[item.species] || '🐾'}
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
                onPress={() => openEditAnimalModal(item)}
              >
                <Text style={styles.actionBtnText}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.genealogyBtn]}
                onPress={() => openGenealogyModal(item)}
              >
                <Text style={styles.actionBtnText}>🌳 Généalogie</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => deleteAnimal(item.id)}
              >
                <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };


  const sortedAnimals = useMemo(() => {
    if (!animals || animals.length === 0) return [];
    
    const sorted = [...animals];
    console.log('🔧 Sorting animals by:', animalSortOrder, 'Total animals:', sorted.length);
    console.log('🔧 Animal names before sorting:', sorted.map(a => a.name));
    
    if (animalSortOrder === 'age') {
      // Sort by age (oldest to youngest), then deceased at the end
      sorted.sort((a, b) => {
        const aIsDeceased = a.exitCause === 'décès';
        const bIsDeceased = b.exitCause === 'décès';
        
        // Deceased animals go to the end
        if (aIsDeceased && !bIsDeceased) return 1;
        if (!aIsDeceased && bIsDeceased) return -1;
        
        // Among living animals, sort by age (oldest first)
        if (!aIsDeceased && !bIsDeceased) {
          const aAge = new Date(a.birthDate);
          const bAge = new Date(b.birthDate);
          return aAge - bAge; // Older dates first (oldest animals)
        }
        
        // Among deceased animals, sort by age (oldest first)
        const aAge = new Date(a.birthDate);
        const bAge = new Date(b.birthDate);
        return aAge - bAge;
      });
      console.log('🔧 After age sorting:', sorted.map(a => `${a.name} (${a.birthDate})`));
    } else if (animalSortOrder === 'name') {
      // Sort by name alphabetically, deceased at the end
      sorted.sort((a, b) => {
        const aIsDeceased = a.exitCause === 'décès';
        const bIsDeceased = b.exitCause === 'décès';
        
        if (aIsDeceased && !bIsDeceased) return 1;
        if (!aIsDeceased && bIsDeceased) return -1;
        
        return a.name.localeCompare(b.name);
      });
      console.log('🔧 After name sorting:', sorted.map(a => a.name));
    } else if (animalSortOrder === 'species') {
      // Sort by species, then age, deceased at the end
      sorted.sort((a, b) => {
        const aIsDeceased = a.exitCause === 'décès';
        const bIsDeceased = b.exitCause === 'décès';
        
        if (aIsDeceased && !bIsDeceased) return 1;
        if (!aIsDeceased && bIsDeceased) return -1;
        
        const speciesCompare = a.species.localeCompare(b.species);
        if (speciesCompare !== 0) return speciesCompare;
        
        // Same species, sort by age
        const aAge = new Date(a.birthDate);
        const bAge = new Date(b.birthDate);
        return aAge - bAge;
      });
      console.log('🔧 After species sorting:', sorted.map(a => `${a.name} (${a.species})`));
    } else if (animalSortOrder === 'entryDate') {
      // Sort by entry date (oldest first), deceased at the end
      sorted.sort((a, b) => {
        const aIsDeceased = a.exitCause === 'décès';
        const bIsDeceased = b.exitCause === 'décès';
        
        if (aIsDeceased && !bIsDeceased) return 1;
        if (!aIsDeceased && bIsDeceased) return -1;
        
        const aEntryDate = new Date(a.entryDate);
        const bEntryDate = new Date(b.entryDate);
        return aEntryDate - bEntryDate;
      });
      console.log('🔧 After entry date sorting:', sorted.map(a => `${a.name} (${a.entryDate})`));
    }
    
    console.log('🔧 Final sorted animal names:', sorted.map(a => a.name));
    return sorted;
  }, [animals, animalSortOrder]);

  const renderAnimals = () => (
    <ScrollView 
      ref={animalsScrollViewRef}
      style={styles.tabContent} 
      showsVerticalScrollIndicator={false}
      onTouchStart={() => setShowSortDropdown(false)}
    >
      <QuickStats animals={animals} getHerdConfig={getHerdConfig} />
      
      <ViewModeToggle 
        viewMode={viewMode} 
        onModeChange={setViewMode} 
        groupsCount={groups.length} 
      />

      {viewMode === 'groups' && (
        <View style={styles.groupsSection}>
          <View style={styles.groupsHeader}>
            <Text style={styles.groupsTitle}>👥 Groupes</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => {
                setEditingGroup(null);
                setGroupForm({ name: '', description: '', animalIds: [] });
                setSelectedAnimalsForGroup({});
                setGroupModal(true);
              }}
            >
              <Text style={styles.addButtonText}>+ Nouveau Groupe</Text>
            </TouchableOpacity>
          </View>
          
          {groups.map((group) => {
            const groupAnimals = animals.filter(a => (group.animalIds || []).includes(a.id));
            return (
              <GroupCard
                key={group.id}
                group={group}
                groupAnimals={groupAnimals}
                onEdit={(group) => {
                  setEditingGroup(group);
                  setGroupForm({
                    name: group.name,
                    description: group.description || '',
                    animalIds: group.animalIds || []
                  });
                  const selected = {};
                  (group.animalIds || []).forEach(id => selected[id] = true);
                  setSelectedAnimalsForGroup(selected);
                  setGroupModal(true);
                }}
                onDelete={(group) => {
                  Alert.alert(
                    'Supprimer le groupe',
                    `Êtes-vous sûr de vouloir supprimer le groupe "${group.name}"?`,
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: async () => {
                        await deleteGroup(group.id);
                      }}
                    ]
                  );
                }}
                getHerdConfig={getHerdConfig}
              />
            );
          })}
          
          {groups.length === 0 && (
            <View style={styles.noGroupsCard}>
              <Text style={styles.noGroupsText}>Aucun groupe créé</Text>
              <Text style={styles.noGroupsSubtext}>
                Créez des groupes pour mieux organiser vos animaux
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.animalsSection}>
        <View style={styles.animalsHeader}>
          <Text style={styles.animalsTitle}>{getHerdConfig().icon} {getHerdConfig().animalLabel || 'Animaux'}</Text>
        </View>
        
        <View style={styles.sortFilterContainer}>
          <TouchableOpacity 
            style={styles.sortDropdown}
            onPress={() => setShowSortDropdown(!showSortDropdown)}
          >
            <Text style={styles.sortDropdownText}>
              {animalSortOrder === 'age' ? 'Âge' :
               animalSortOrder === 'name' ? 'Nom' :
               animalSortOrder === 'species' ? 'Espèce' : 'Date d\'entrée'}
            </Text>
            <Text style={styles.sortDropdownArrow}>
              {showSortDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          
          {showSortDropdown && (
            <View style={styles.sortDropdownMenu}>
              {[
                { key: 'age', label: 'Âge' },
                { key: 'name', label: 'Nom' },
                { key: 'species', label: 'Espèce' },
                { key: 'entryDate', label: 'Date d\'entrée' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortDropdownItem,
                    animalSortOrder === option.key && styles.sortDropdownItemSelected
                  ]}
                  onPress={() => {
                    console.log('🔧 Setting sort order to:', option.key);
                    setAnimalSortOrder(option.key);
                    // Small delay to ensure state update
                    setTimeout(() => {
                      setShowSortDropdown(false);
                    }, 100);
                  }}
                >
                  <Text style={[
                    styles.sortDropdownItemText,
                    animalSortOrder === option.key && styles.sortDropdownItemTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {viewMode === 'all' && sortedAnimals.map((animal, index) => (
          <View
            key={`${animal.id}-${animalSortOrder}-${index}`}
            ref={(ref) => {
              if (ref) {
                animalItemRefs.current[animal.id] = ref;
              }
            }}
            onLayout={(event) => handleAnimalLayout(animal.id, event)}
          >
            <AnimalItem 
              item={animal}
              isCollapsed={collapsedAnimals[animal.id] ?? true}
              isHighlighted={(highlightedAnimalId === animal.id || highlightedAnimalId == animal.id) || 
                            (highlightedAnimalName === animal.name)}
              onToggleCollapse={toggleAnimalCollapse}
              onEdit={openEditAnimalModal}
              onDelete={handleDeleteAnimal}
              onViewGenealogy={openGenealogyModal}
              getHerdConfig={getHerdConfig}
            />
          </View>
        ))}
        
        {viewMode === 'groups' && sortedAnimals.map((animal, index) => {
          // Show animals that are not in any group, or show all if no groups exist
          const isInGroup = groups.some(group => (group.animalIds || []).includes(animal.id));
          if (groups.length > 0 && isInGroup) {
            return null; // Don't show in "all" view if in a group
          }
          return (
            <View
              key={`${animal.id}-${animalSortOrder}-${index}`}
              ref={(ref) => {
                if (ref) {
                  animalItemRefs.current[animal.id] = ref;
                }
              }}
              onLayout={(event) => handleAnimalLayout(animal.id, event)}
            >
              <AnimalItem 
                item={animal}
                isCollapsed={collapsedAnimals[animal.id] ?? true}
                isHighlighted={(highlightedAnimalId === animal.id || highlightedAnimalId == animal.id) || 
                              (highlightedAnimalName === animal.name)}
                onToggleCollapse={toggleAnimalCollapse}
                onEdit={openEditAnimalModal}
                onDelete={handleDeleteAnimal}
                onViewGenealogy={openGenealogyModal}
                getHerdConfig={getHerdConfig}
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderMilkProduction = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🥛 Production Laitière Totale</Text>
          <TouchableOpacity 
            style={styles.settingsIconButton}
            onPress={openSettingsModal}
          >
            <Text style={styles.settingsIconText}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.milkStatsGrid}>
          <View style={styles.milkStatCard}>
            <Text style={styles.milkStatNumber}>
              {getTotalGroupMilkProduction().toFixed(1)}L
            </Text>
            <Text style={styles.milkStatLabel}>Total Général</Text>
          </View>
          <View style={styles.milkStatCard}>
            <Text style={styles.milkStatNumber}>
              {animals.filter(a => a.gender === 'femelle').length}
            </Text>
            <Text style={styles.milkStatLabel}>Femelles Productives</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.milkProductionList}>
        <View style={styles.groupMilkHeader}>
          <Text style={styles.milkProductionTitle} numberOfLines={2}>Production Quotidienne du Troupeau</Text>
          <TouchableOpacity 
            style={styles.addGroupMilkButton}
            onPress={openGroupMilkModal}
          >
            <Text style={styles.addGroupMilkButtonText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>
        {caprinSettings.groupMilkProduction && caprinSettings.groupMilkProduction.length > 0 ? (
          caprinSettings.groupMilkProduction.slice(-10).reverse().map((day, index) => (
            <View key={index} style={styles.milkProductionCard}>
              <View style={styles.milkProductionHeader}>
                <Text style={styles.milkProductionName}>
                  📅 {day.date}
                </Text>
                <Text style={styles.milkProductionTotal}>
                  {day.total}L
                </Text>
              </View>
              {day.notes && (
                <Text style={styles.milkProductionAverage}>
                  Notes: {day.notes}
                </Text>
              )}
            </View>
          ))
        ) : (
          <View style={styles.noDataCard}>
            <Text style={styles.noDataText}>
              Aucune production enregistrée pour le troupeau
            </Text>
          </View>
        )}
      </View>
      
      {/* Additional Statistics for Group Method */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📊 Statistiques Détaillées</Text>
        <View style={styles.detailedStatsGrid}>
          <View style={styles.detailedStatCard}>
            <Text style={styles.detailedStatNumber}>
              {getWeeklyMilkProduction().toFixed(1)}L
            </Text>
            <Text style={styles.detailedStatLabel}>Cette Semaine</Text>
          </View>
          <View style={styles.detailedStatCard}>
            <Text style={styles.detailedStatNumber}>
              {getMonthlyMilkProduction().toFixed(1)}L
            </Text>
            <Text style={styles.detailedStatLabel}>Ce Mois</Text>
          </View>
        </View>
      </View>
      
      {/* Production Graph Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📈 Production des {caprinSettings.graphPeriod} derniers jours</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.graphScrollContainer}>
          <View style={styles.graphContainer}>
            {/* Y-axis labels */}
            <View style={styles.yAxisContainer}>
              <Text style={styles.yAxisLabel}>{getMaxDailyProductionForPeriod().toFixed(0)}L</Text>
              <Text style={styles.yAxisLabel}>{(getMaxDailyProductionForPeriod() * 0.75).toFixed(0)}L</Text>
              <Text style={styles.yAxisLabel}>{(getMaxDailyProductionForPeriod() * 0.5).toFixed(0)}L</Text>
              <Text style={styles.yAxisLabel}>{(getMaxDailyProductionForPeriod() * 0.25).toFixed(0)}L</Text>
              <Text style={styles.yAxisLabel}>0L</Text>
            </View>
            
            {/* Graph area */}
            <View style={styles.dailyGraph}>
              {getPeriodData().map((day, index) => (
                <View key={index} style={styles.graphBar}>
                  <View 
                    style={[
                      styles.graphBarFill, 
                      { height: Math.max(8, (day.total / getMaxDailyProductionForPeriod()) * 80) }
                    ]} 
                  />
                  <Text style={styles.graphBarLabel}>{day.date.split('-')[2]}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );

  const TreeNode = ({ node, isLast = false, hasSiblings = false }) => {
    const isDeceased = node.exitCause === 'décès';
    const age = getAnimalAgeForGenealogy(node.birthDate);
    const isHighlighted = (highlightedAnimalId === node.id || highlightedAnimalId == node.id) || 
                         (highlightedAnimalName === node.name);
    
    // Debug logging for all animals when highlighting is active
    if (highlightedAnimalId || highlightedAnimalName) {
      console.log(`🎯 TreeNode ${node.name}: ID=${node.id}, highlightedAnimalId=${highlightedAnimalId}, highlightedAnimalName=${highlightedAnimalName}, isHighlighted=${isHighlighted}`);
    }
    
    // Debug logging
    if (highlightedAnimalId && (highlightedAnimalId === node.id || highlightedAnimalId == node.id)) {
      console.log('🎯 Found highlighted animal in tree by ID:', node.name, 'ID:', node.id, 'Highlighted ID:', highlightedAnimalId);
    }
    if (highlightedAnimalName && highlightedAnimalName === node.name) {
      console.log('🎯 Found highlighted animal in tree by name:', node.name, 'Highlighted name:', highlightedAnimalName);
    }
    
    return (
      <View style={styles.treeNode}>
        <View style={styles.treeNodeContent}>
          {/* Connection lines */}
          {node.level > 0 && (
            <View style={styles.treeConnector}>
              <View style={[styles.treeLine, isLast && styles.treeLineLast]} />
              <View style={[styles.treeLineHorizontal, hasSiblings && styles.treeLineHorizontalWithSiblings]} />
            </View>
          )}
          
          {/* Animal card - Make it clickable */}
          <TouchableOpacity 
            style={[
              styles.treeAnimalCard,
              isDeceased && styles.treeAnimalCardDeceased,
              isHighlighted && styles.treeAnimalCardHighlighted,
              { marginLeft: node.level * 20 }
            ]}
            onPress={() => openAnimalsFromGenealogy(node)}
            activeOpacity={0.7}
          >
            <View style={styles.treeAnimalHeader}>
              <Text style={[
                styles.treeAnimalIcon,
                isDeceased && styles.treeAnimalIconDeceased
              ]}>
                {getHerdConfig().emoji[node.species] || '🐾'}
              </Text>
              <View style={styles.treeAnimalInfo}>
                <Text style={[
                  styles.treeAnimalName,
                  isDeceased && styles.treeAnimalNameDeceased
                ]}>
                  {node.name}
                </Text>
                <Text style={[
                  styles.treeAnimalDetails,
                  isDeceased && styles.treeAnimalDetailsDeceased
                ]}>
                  {node.breed} • {node.gender === 'mâle' ? '♂️' : '♀️'} • ({age})
                </Text>
                {isDeceased && (
                  <Text style={styles.treeAnimalStatus}>💀 Décédé</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Render children */}
        {node.children && node.children.length > 0 && (
          <View style={styles.treeChildren}>
            {node.children.map((child, index) => (
              <TreeNode 
                key={child.id} 
                node={child} 
                isLast={index === node.children.length - 1}
                hasSiblings={node.children.length > 1}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderGenealogy = () => {
    const familyTree = buildFamilyTree();
    
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🌳 Arbre Généalogique</Text>
          <Text style={styles.sectionDescription}>
            Relations familiales et lignées de vos animaux
          </Text>
        </View>
        
        <View style={styles.genealogyTree}>
          {familyTree.length > 0 ? (
            familyTree.map((rootNode, index) => (
              <TreeNode 
                key={rootNode.id} 
                node={rootNode} 
                isLast={index === familyTree.length - 1}
                hasSiblings={familyTree.length > 1}
              />
            ))
          ) : (
            <View style={styles.noGenealogyData}>
              <Text style={styles.noGenealogyText}>
                Aucune donnée généalogique disponible
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[styles.header, { backgroundColor: getHerdConfig().color }]}>
        <View style={[styles.statusBarOverlay, { height: insets.top * 0.8 }]} />
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {getHerdConfig().icon} Élevage {getHerdConfig().name}
          </Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>{animals.length} animaux</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'animals' && { borderBottomColor: getHerdConfig().color }]}
          onPress={() => setActiveTab('animals')}
        >
          <Text style={[styles.tabText, activeTab === 'animals' && { color: getHerdConfig().color }]}>
            {getHerdConfig().icon} {getHerdConfig().animalLabel || 'Animaux'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'milk' && { borderBottomColor: getHerdConfig().color }]}
          onPress={() => setActiveTab('milk')}
        >
          <Text style={[styles.tabText, activeTab === 'milk' && { color: getHerdConfig().color }]}>
            🥛 Lait
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'genealogy' && { borderBottomColor: getHerdConfig().color }]}
          onPress={() => setActiveTab('genealogy')}
        >
          <Text style={[styles.tabText, activeTab === 'genealogy' && { color: getHerdConfig().color }]}>
            🌳 Généalogie
          </Text>
        </TouchableOpacity>
      </View>
      
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.mainContent}>
          {activeTab === 'animals' && renderAnimals()}
          {activeTab === 'milk' && renderMilkProduction()}
          {activeTab === 'genealogy' && renderGenealogy()}
        </View>

        {/* Animal Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible && modalType === 'animal'}
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
                <Text style={styles.modalTitle}>
                  {editingItem ? 'Modifier l\'Animal' : 'Nouvel Animal'}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Nom de l'animal *"
                  placeholderTextColor="#999"
                  value={animalForm.name}
                  onChangeText={(text) => setAnimalForm({...animalForm, name: text})}
                />

                <View style={styles.speciesSelector}>
                  <Text style={styles.inputLabel}>Espèce:</Text>
                  <View style={styles.speciesOptions}>
                    {getAvailableSpecies().map((species) => (
                      <TouchableOpacity
                        key={species}
                        style={[
                          styles.speciesOption,
                          animalForm.species === species && styles.speciesOptionSelected
                        ]}
                        onPress={() => setAnimalForm({...animalForm, species})}
                      >
                        <Text style={[
                          styles.speciesOptionText,
                          animalForm.species === species && styles.speciesOptionTextSelected
                        ]}>
                          {species === 'chèvre' ? '🐐' : 
                           species === 'brebis' ? '🐑' :
                           species === 'bélier' ? '🐑' :
                           species === 'vache' ? '🐄' :
                           species === 'taureau' ? '🐄' :
                           species === 'jument' ? '🐴' :
                           species === 'étalon' ? '🐴' :
                           species === 'truie' ? '🐷' :
                           species === 'porc' ? '🐷' :
                           species === 'vache' ? '🐄' :
                           species === 'jument' ? '🐴' :
                           species === 'truie' ? '🐷' : '🐾'} {species}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Race *"
                  placeholderTextColor="#999"
                  value={animalForm.breed}
                  onChangeText={(text) => setAnimalForm({...animalForm, breed: text})}
                />

                <View style={styles.dateFieldContainer}>
                  <Text style={styles.dateFieldLabel}>Date de naissance *</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => openCalendarModal('birthDate')}
                  >
                    <Text style={styles.datePickerText}>
                      {animalForm.birthDate ? 
                        formatForCalendar(animalForm.birthDate) : 
                        '📅 Sélectionner une date'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateFieldContainer}>
                  <Text style={styles.dateFieldLabel}>Date d'entrée *</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => openCalendarModal('entryDate')}
                  >
                    <Text style={styles.datePickerText}>
                      {animalForm.entryDate ? 
                        formatForCalendar(animalForm.entryDate) : 
                        '📅 Sélectionner une date'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.selectorContainer}>
                  <Text style={styles.inputLabel}>Cause d'entrée:</Text>
                  <View style={styles.selectorOptions}>
                    {['naissance', 'décès', 'don', 'troc', 'acheté', 'vendu'].map((cause) => (
                      <TouchableOpacity
                        key={cause}
                        style={[
                          styles.selectorOption,
                          animalForm.entryCause === cause && styles.selectorOptionSelected
                        ]}
                        onPress={() => setAnimalForm({...animalForm, entryCause: cause})}
                      >
                        <Text style={[
                          styles.selectorOptionText,
                          animalForm.entryCause === cause && styles.selectorOptionTextSelected
                        ]}>
                          {cause}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.dateFieldContainer}>
                  <Text style={styles.dateFieldLabel}>Date de sortie (optionnel)</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => openCalendarModal('exitDate')}
                  >
                    <Text style={styles.datePickerText}>
                      {animalForm.exitDate ? 
                        formatForCalendar(animalForm.exitDate) : 
                        '📅 Sélectionner une date'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.selectorContainer}>
                  <Text style={styles.inputLabel}>Cause de sortie (optionnel):</Text>
                  <View style={styles.selectorOptions}>
                    {['', 'décès', 'don', 'troc', 'acheté', 'vendu'].map((cause) => (
                      <TouchableOpacity
                        key={cause || 'aucune'}
                        style={[
                          styles.selectorOption,
                          animalForm.exitCause === cause && styles.selectorOptionSelected
                        ]}
                        onPress={() => setAnimalForm({...animalForm, exitCause: cause})}
                      >
                        <Text style={[
                          styles.selectorOptionText,
                          animalForm.exitCause === cause && styles.selectorOptionTextSelected
                        ]}>
                          {cause || 'Aucune'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Num de cheptel du repère d'identification officiel"
                  placeholderTextColor="#999"
                  value={animalForm.herdNumber}
                  onChangeText={(text) => setAnimalForm({...animalForm, herdNumber: text})}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Numéro d'ordre attribués (ex: 00294)"
                  placeholderTextColor="#999"
                  value={animalForm.earTagNumber}
                  onChangeText={(text) => setAnimalForm({...animalForm, earTagNumber: text})}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Nom de l'acheteur ou du vendeur (optionnel)"
                  placeholderTextColor="#999"
                  value={animalForm.buyerSellerName}
                  onChangeText={(text) => setAnimalForm({...animalForm, buyerSellerName: text})}
                />

                <View style={styles.genderSelector}>
                  <Text style={styles.inputLabel}>Sexe:</Text>
                  <View style={styles.genderOptions}>
                    {['mâle', 'femelle'].map((gender) => (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.genderOption,
                          animalForm.gender === gender && styles.genderOptionSelected
                        ]}
                        onPress={() => setAnimalForm({...animalForm, gender})}
                      >
                        <Text style={[
                          styles.genderOptionText,
                          animalForm.gender === gender && styles.genderOptionTextSelected
                        ]}>
                          {gender === 'mâle' ? '♂️' : '♀️'} {gender}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Mère (optionnel)"
                  placeholderTextColor="#999"
                  value={animalForm.mother}
                  onChangeText={(text) => setAnimalForm({...animalForm, mother: text})}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Père (optionnel)"
                  placeholderTextColor="#999"
                  value={animalForm.father}
                  onChangeText={(text) => setAnimalForm({...animalForm, father: text})}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes"
                  placeholderTextColor="#999"
                  value={animalForm.notes}
                  onChangeText={(text) => setAnimalForm({...animalForm, notes: text})}
                  multiline={true}
                  numberOfLines={3}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.saveBtn]}
                    onPress={handleSaveAnimal}
                  >
                    <Text style={[styles.modalBtnText, { color: 'white' }]}>
                      {editingItem ? 'Modifier' : 'Ajouter'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Milk Production Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible && modalType === 'milk'}
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
              <Text style={styles.modalTitle}>Production Laitière</Text>

              <View style={styles.dateFieldContainer}>
                <Text style={styles.dateFieldLabel}>Date</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => openCalendarModal('date')}
                >
                  <Text style={styles.datePickerText}>
                    {milkForm.date ? 
                      formatForCalendar(milkForm.date) : 
                      '📅 Sélectionner une date'
                    }
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Lait du matin (L) *"
                placeholderTextColor="#999"
                value={milkForm.morning}
                onChangeText={(text) => setMilkForm({...milkForm, morning: text})}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Lait du soir (L) *"
                placeholderTextColor="#999"
                value={milkForm.evening}
                onChangeText={(text) => setMilkForm({...milkForm, evening: text})}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes"
                placeholderTextColor="#999"
                value={milkForm.notes}
                onChangeText={(text) => setMilkForm({...milkForm, notes: text})}
                multiline={true}
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={saveMilkProduction}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    Enregistrer
                  </Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Group Milk Production Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible && modalType === 'groupMilk'}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Production Laitière du Troupeau</Text>

              <View style={styles.dateFieldContainer}>
                <Text style={styles.dateFieldLabel}>Date</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => openCalendarModal('date')}
                >
                  <Text style={styles.datePickerText}>
                    {groupMilkForm.date ? 
                      formatForCalendar(groupMilkForm.date) : 
                      '📅 Sélectionner une date'
                    }
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Quantité totale de lait (L) *"
                placeholderTextColor="#999"
                value={groupMilkForm.total}
                onChangeText={(text) => setGroupMilkForm({...groupMilkForm, total: text})}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes"
                placeholderTextColor="#999"
                value={groupMilkForm.notes}
                onChangeText={(text) => setGroupMilkForm({...groupMilkForm, notes: text})}
                multiline={true}
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={saveGroupMilkProduction}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    Enregistrer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Settings Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible && modalType === 'settings'}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Paramètres Caprins</Text>

              <View style={styles.milkMethodSelector}>
                <Text style={styles.inputLabel}>Méthode d'enregistrement du lait:</Text>
                <View style={styles.methodOptions}>
                  <TouchableOpacity
                    style={[
                      styles.methodOption,
                      styles.methodOptionSelected
                    ]}
                  >
                    <Text style={[
                      styles.methodOptionText,
                      styles.methodOptionTextSelected
                    ]}>
                      🐑 Par troupeau (total quotidien)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.graphPeriodSelector}>
                <Text style={styles.inputLabel}>Période d'affichage du graphique:</Text>
                <View style={styles.periodOptions}>
                  {[7, 15, 30, 90, 365].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodOption,
                        caprinSettings.graphPeriod === period && styles.periodOptionSelected
                      ]}
                      onPress={() => setCaprinSettings({...caprinSettings, graphPeriod: period})}
                    >
                      <Text style={[
                        styles.periodOptionText,
                        caprinSettings.graphPeriod === period && styles.periodOptionTextSelected
                      ]}>
                        {period === 7 ? '7 jours' : 
                         period === 15 ? '15 jours' :
                         period === 30 ? '30 jours' :
                         period === 90 ? '3 mois' : '1 an'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.settingsDescription}>
                Enregistrez la production totale quotidienne du troupeau en une seule fois. Cette méthode est plus pratique et suffisante pour la plupart des élevages.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={saveSettings}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    Sauvegarder
                  </Text>
                </TouchableOpacity>
              </View>
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
                  {calendarField === 'birthDate' ? 'Date de naissance' : 
                   calendarField === 'entryDate' ? 'Date d\'entrée' :
                   calendarField === 'exitDate' ? 'Date de sortie' : 'Date'}
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
                maxDate={calendarField === 'birthDate' || calendarField === 'entryDate' ? getTodayISO() : undefined}
                hideArrows={false}
                enableSwipeMonths={true}
                monthFormat={'MMMM yyyy'}
                onMonthChange={(month) => {
                  // Optional: handle month change if needed
                  console.log('Month changed to:', month);
                }}
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

        {/* Group Management Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={groupModal}
          onRequestClose={() => setGroupModal(false)}
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
                <Text style={styles.modalTitle}>
                  {editingGroup ? 'Modifier le Groupe' : 'Nouveau Groupe'}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Nom du groupe *"
                  placeholderTextColor="#999"
                  value={groupForm.name}
                  onChangeText={(text) => setGroupForm({...groupForm, name: text})}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description (optionnel)"
                  placeholderTextColor="#999"
                  value={groupForm.description}
                  onChangeText={(text) => setGroupForm({...groupForm, description: text})}
                  multiline={true}
                  numberOfLines={3}
                />

                <Text style={styles.inputLabel}>Sélectionner les animaux :</Text>
                <View style={styles.animalsCheckboxList}>
                  {sortedAnimals.map((animal) => {
                    const isSelected = selectedAnimalsForGroup[animal.id] || false;
                    return (
                      <TouchableOpacity
                        key={animal.id}
                        style={styles.animalCheckboxItem}
                        onPress={() => {
                          setSelectedAnimalsForGroup(prev => ({
                            ...prev,
                            [animal.id]: !prev[animal.id]
                          }));
                        }}
                      >
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                        </View>
                        <Text style={styles.animalCheckboxName}>
                          {getHerdConfig().emoji[animal.species] || '🐾'} {animal.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={() => {
                      setGroupModal(false);
                      setSelectedAnimalsForGroup({});
                    }}
                  >
                    <Text style={styles.modalBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.saveBtn]}
                    onPress={async () => {
                      if (!groupForm.name.trim()) {
                        Alert.alert('Erreur', 'Veuillez entrer un nom pour le groupe');
                        return;
                      }
                      const selectedIds = Object.keys(selectedAnimalsForGroup).filter(id => selectedAnimalsForGroup[id]);
                      
                      try {
                        const groupData = {
                          name: groupForm.name,
                          description: groupForm.description,
                          animalIds: selectedIds.map(id => parseInt(id))
                        };
                        
                        let result;
                        if (editingGroup) {
                          result = await updateGroup(editingGroup.id, groupData);
                        } else {
                          result = await addGroup(groupData);
                        }
                        
                        if (result.success) {
                          setGroupModal(false);
                          setSelectedAnimalsForGroup({});
                          Alert.alert('Succès', `Groupe ${editingGroup ? 'modifié' : 'créé'} avec succès!`);
                        }
                      } catch (error) {
                        console.error('Error saving group:', error);
                        Alert.alert('Erreur', 'Impossible de sauvegarder le groupe');
                      }
                    }}
                  >
                    <Text style={[styles.modalBtnText, { color: 'white' }]}>
                      {editingGroup ? 'Modifier' : 'Créer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Floating Add Animal Button - Only show on animals tab */}
        {activeTab === 'animals' && (
          <TouchableOpacity
            style={styles.floatingAddButton}
            onPress={openAddAnimalModal}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingAddButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(147, 178, 189, 0.44)',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: '#8B4513', // Default brown, will be overridden by herd config
    paddingTop: 35,
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
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#8B4513', // Will be dynamic based on herd config
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#8B4513', // Will be dynamic based on herd config
  },
  mainContent: {
    flex: 1,
  },
  tabContent: {
    padding: 10,
  },
  sectionCard: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513', // Will be dynamic based on herd config
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#8B4513', // Will be dynamic based on herd config
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  quickStats: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513', // Will be dynamic based on herd config
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
    textAlign: 'center',
  },
  animalsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  animalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  animalsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513', // Will be dynamic based on herd config
    flex: 1,
  },
  sortFilterContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 4,
  },
  sortOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sortOptionSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  sortOptionText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#333',
  },
  sortOptionTextSelected: {
    color: 'white',
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
    alignSelf: 'flex-start',
  },
  sortDropdownText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  sortDropdownArrow: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  sortDropdownMenu: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  sortDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortDropdownItemSelected: {
    backgroundColor: '#8B4513',
  },
  sortDropdownItemText: {
    fontSize: 12,
    color: '#333',
  },
  sortDropdownItemTextSelected: {
    color: 'white',
  },
  animalsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  animalsList: {
    // Removed maxHeight to allow proper scrolling
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  animalCardHighlighted: {
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    color: '#8B4513', // Will be dynamic based on herd config
    fontWeight: 'bold',
    marginRight: 10,
  },
  animalIcon: {
    fontSize: 20,
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
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    marginBottom: 10,
  },
  cardInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  offspringSection: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
  },
  offspringTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  offspringList: {
    fontSize: 12,
    color: '#856404',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 70,
  },
  editBtn: {
    backgroundColor: '#2196F3',
  },
  milkBtn: {
    backgroundColor: '#4CAF50',
  },
  genealogyBtn: {
    backgroundColor: '#9C27B0',
  },
  deleteBtn: {
    backgroundColor: '#F44336',
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  milkStats: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  milkStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  milkStatsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  milkStatCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    flex: 1,
  },
  milkStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  milkStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
    textAlign: 'center',
  },
  milkProductionList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  milkProductionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    flex: 1,
    flexWrap: 'wrap',
  },
  milkProductionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  milkProductionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  milkProductionName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  milkProductionTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  milkProductionAverage: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  milkProductionHistory: {
    marginTop: 6,
  },
  milkProductionHistoryTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  milkProductionDay: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  genealogyList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  genealogyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  genealogyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  genealogyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  genealogyBreed: {
    fontSize: 12,
    color: '#666',
  },
  genealogyParents: {
    marginBottom: 8,
  },
  genealogyOffspring: {
    marginBottom: 4,
  },
  genealogySectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B4513', // Will be dynamic based on herd config
    marginBottom: 4,
  },
  genealogyParent: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  genealogyChild: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
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
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  speciesSelector: {
    marginBottom: 15,
  },
  speciesOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  speciesOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  speciesOptionSelected: {
    backgroundColor: '#8B4513', // Will be dynamic based on herd config
    borderColor: '#8B4513',
  },
  speciesOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  speciesOptionTextSelected: {
    color: 'white',
  },
  genderSelector: {
    marginBottom: 15,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  genderOptionSelected: {
    backgroundColor: '#8B4513', // Will be dynamic based on herd config
    borderColor: '#8B4513',
  },
  genderOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  genderOptionTextSelected: {
    color: 'white',
  },
  selectorContainer: {
    marginBottom: 15,
  },
  selectorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectorOptionSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  selectorOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  selectorOptionTextSelected: {
    color: 'white',
  },
  dateFieldContainer: {
    marginBottom: 15,
  },
  dateFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  datePickerButton: {
    backgroundColor: 'white',
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
    backgroundColor: '#8B4513', // Will be dynamic based on herd config
  },
  modalBtnText: {
    fontWeight: '600',
    fontSize: 16,
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
  milkMethodSelector: {
    marginBottom: 15,
  },
  methodOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  methodOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  methodOptionSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  methodOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  methodOptionTextSelected: {
    color: 'white',
  },
  graphPeriodSelector: {
    marginBottom: 15,
  },
  periodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    minWidth: '18%',
  },
  periodOptionSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  periodOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  periodOptionTextSelected: {
    color: 'white',
  },
  settingsButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  settingsButtonText: {
    color: '#8B4513',
    fontWeight: '600',
    fontSize: 12,
  },
  groupMilkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  addGroupMilkButton: {
    backgroundColor: '#8B4513',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  addGroupMilkButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  noDataCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  settingsDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  
  // New styles for settings icon and detailed statistics
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingsIconButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIconText: {
    fontSize: 18,
  },
  detailedStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  detailedStatCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flex: 1,
  },
  detailedStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  detailedStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
    textAlign: 'center',
  },
  dailyGraphContainer: {
    marginTop: 10,
  },
  graphTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  graphScrollContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  graphContainer: {
    flexDirection: 'row',
    minWidth: 1200, // Ensure enough space for 30 bars
  },
  yAxisContainer: {
    width: 50,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 10,
    paddingVertical: 5,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  dailyGraph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingVertical: 10,
    gap: 2, // Space between bars
  },
  graphBar: {
    alignItems: 'center',
    width: 35, // Fixed width for each bar
    height: '100%',
    justifyContent: 'flex-end',
  },
  graphBarFill: {
    backgroundColor: '#4CAF50',
    width: '70%',
    borderRadius: 3,
    marginBottom: 3,
  },
  graphBarLabel: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
    transform: [{ rotate: '45deg' }],
    marginTop: 3,
    width: 20,
  },
  
  // Genealogy Tree Styles
  genealogyTree: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  treeNode: {
    marginBottom: 8,
  },
  treeNodeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  treeConnector: {
    position: 'absolute',
    left: -15,
    top: 0,
    bottom: 0,
    width: 15,
  },
  treeLine: {
    position: 'absolute',
    left: 7,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#8B4513', // Will be dynamic based on herd config
  },
  treeLineLast: {
    bottom: '50%',
  },
  treeLineHorizontal: {
    position: 'absolute',
    left: 7,
    top: 20,
    width: 8,
    height: 2,
    backgroundColor: '#8B4513', // Will be dynamic based on herd config
  },
  treeLineHorizontalWithSiblings: {
    backgroundColor: '#8B4513', // Will be dynamic based on herd config
  },
  treeAnimalCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
  },
  treeAnimalCardDeceased: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d3d3d3',
  },
  treeAnimalCardHighlighted: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  treeAnimalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  treeAnimalIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  treeAnimalIconDeceased: {
    opacity: 0.6,
  },
  treeAnimalInfo: {
    flex: 1,
  },
  treeAnimalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  treeAnimalNameDeceased: {
    color: '#888',
    textDecorationLine: 'line-through',
  },
  treeAnimalDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  treeAnimalDetailsDeceased: {
    color: '#999',
  },
  treeAnimalStatus: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  treeChildren: {
    marginTop: 8,
    paddingLeft: 20,
  },
  noGenealogyData: {
    padding: 40,
    alignItems: 'center',
  },
  noGenealogyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Group management styles
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#8B4513',
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewModeButtonTextActive: {
    color: 'white',
  },
  groupsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
  },
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
  noGroupsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  noGroupsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  noGroupsSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  animalsCheckboxList: {
    maxHeight: 300,
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  animalCheckboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#8B4513',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#8B4513',
  },
  checkboxCheck: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  animalCheckboxName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  floatingAddButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
