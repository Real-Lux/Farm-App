import React, { useState, useEffect, useMemo } from 'react';
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
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import database from '../services/database';
import configService from '../services/configService';
import { toISODate, getTodayISO, formatForCalendar } from '../utils/dateUtils';

export default function CaprinScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [animals, setAnimals] = useState([]);
  const [activeTab, setActiveTab] = useState('animals');
  
  // Get route parameters for highlighting specific animals
  const { highlightAnimalId, highlightAnimalName } = route?.params || {};
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
  
  const [animalForm, setAnimalForm] = useState({
    name: '',
    species: 'chèvre', // 'chèvre' or 'brebis'
    breed: '',
    birthDate: '',
    entryDate: '',
    exitDate: '',
    entryCause: 'naissance', // 'naissance', 'décès', 'don', 'troc', 'acheté', 'vendu'
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
    relationship: 'parent', // 'parent', 'enfant', 'frère/soeur'
    relatedAnimalId: '',
    notes: ''
  });

  const [groupMilkForm, setGroupMilkForm] = useState({
    date: getTodayISO(),
    total: '',
    notes: ''
  });

  useEffect(() => {
    loadAnimals();
    loadCaprinSettings();
    loadConfigs();
  }, []);

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

  const loadAnimals = async () => {
    try {
      const animalsData = await database.getCaprinAnimals();
      setAnimals(animalsData);
    } catch (error) {
      console.error('Erreur lors du chargement des animaux:', error);
      Alert.alert('Erreur', 'Impossible de charger les données caprines');
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
      species: 'chèvre',
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
    // Navigate to genealogy tab and highlight the animal
    console.log('🐐 Navigating to genealogy for animal:', animal.name, 'ID:', animal.id, 'Type:', typeof animal.id);
    setActiveTab('genealogy');
    setHighlightedAnimalId(animal.id);
    setHighlightedAnimalName(animal.name);
    
    // Debug: Log the highlighting state
    console.log('🎯 Set highlightedAnimalId to:', animal.id);
    console.log('🎯 Set highlightedAnimalName to:', animal.name);
    
    // Clear highlight after a few seconds
    setTimeout(() => {
      console.log('🎯 Clearing highlight after timeout');
      setHighlightedAnimalId(null);
      setHighlightedAnimalName(null);
    }, 5000); // Increased to 5 seconds for better visibility
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

  const saveAnimal = async () => {
    if (!animalForm.name || !animalForm.species || !animalForm.birthDate || !animalForm.entryDate) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (nom, espèce, date de naissance, date d\'entrée)');
      return;
    }

    try {
      const animalData = {
        ...animalForm,
        milkProduction: editingItem ? editingItem.milkProduction || [] : [],
        offspring: editingItem ? editingItem.offspring || [] : [],
        parents: { mother: animalForm.mother, father: animalForm.father }
      };

      if (editingItem) {
        await database.updateCaprinAnimal(editingItem.id, animalData);
      } else {
        await database.addCaprinAnimal(animalData);
      }

      // Reload animals from database and sync with calendar
      await loadAnimals();
      await database.syncCaprinWithCalendar();
      setModalVisible(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'animal');
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

  const deleteAnimal = (id) => {
    Alert.alert(
      'Supprimer l\'animal',
      'Êtes-vous sûr de vouloir supprimer cet animal ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await database.deleteCaprinAnimal(id);
            // Reload animals from database and sync with calendar
            await loadAnimals();
            await database.syncCaprinWithCalendar();
          } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            Alert.alert('Erreur', 'Impossible de supprimer l\'animal');
          }
        }}
      ]
    );
  };

  const toggleAnimalCollapse = (animalId) => {
    setCollapsedAnimals(prev => ({
      ...prev,
      [animalId]: !prev[animalId]
    }));
  };

  const getAnimalAge = (birthDate) => {
    const birth = new Date(birthDate);
    const today = new Date();
    const diffTime = Math.abs(today - birth);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;
    
    if (years > 0) {
      return `${years} an${years > 1 ? 's' : ''} ${months} mois`;
    } else if (months > 0) {
      return `${months} mois ${days} jour${days > 1 ? 's' : ''}`;
    } else {
      return `${days} jour${days > 1 ? 's' : ''}`;
    }
  };

  const getAnimalAgeForGenealogy = (birthDate) => {
    const birth = new Date(birthDate);
    const today = new Date();
    const diffTime = Math.abs(today - birth);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0) {
      return `${years}a ${months}m`;
    } else if (months > 0) {
      return `${months}m`;
    } else {
      return '0m';
    }
  };

  const getTotalMilkProduction = (animal) => {
    if (!animal.milkProduction || animal.milkProduction.length === 0) return 0;
    return animal.milkProduction.reduce((total, day) => total + day.total, 0);
  };

  const getAverageMilkProduction = (animal) => {
    if (!animal.milkProduction || animal.milkProduction.length === 0) return 0;
    const total = getTotalMilkProduction(animal);
    return (total / animal.milkProduction.length).toFixed(1);
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
    const isCollapsed = collapsedAnimals[item.id];
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
              {item.species === 'chèvre' ? '🐐' : '🐑'}
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

  const getBabyMales = () => {
    return animals.filter(animal => {
      if (animal.gender !== 'mâle') return false;
      const birthDate = new Date(animal.birthDate);
      const today = new Date();
      const diffTime = Math.abs(today - birthDate);
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
      return diffMonths < 7; // Baby males are 0-6 months old
    });
  };

  const getBabyFemales = () => {
    return animals.filter(animal => {
      if (animal.gender !== 'femelle') return false;
      const birthDate = new Date(animal.birthDate);
      const today = new Date();
      const diffTime = Math.abs(today - birthDate);
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
      return diffMonths < 7; // Baby females are 0-6 months old
    });
  };

  const getDeceasedAnimals = () => {
    return animals.filter(animal => animal.exitCause === 'décès');
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
      style={styles.tabContent} 
      showsVerticalScrollIndicator={false}
      onTouchStart={() => setShowSortDropdown(false)}
    >
      <View style={styles.quickStats}>
        <Text style={styles.quickStatsTitle}>Statistiques Rapides</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{animals.length}</Text>
            <Text style={styles.statLabel}>Total Animaux</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {animals.filter(a => a.species === 'chèvre').length}
            </Text>
            <Text style={styles.statLabel}>Chèvres</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {animals.filter(a => a.species === 'brebis').length}
            </Text>
            <Text style={styles.statLabel}>Brebis</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {animals.filter(a => a.gender === 'femelle').length}
            </Text>
            <Text style={styles.statLabel}>Femelles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {getBabyMales().length}
            </Text>
            <Text style={styles.statLabel}>Mâles Bébés</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {getBabyFemales().length}
            </Text>
            <Text style={styles.statLabel}>Femelles Bébés</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {getGrownMales().length}
            </Text>
            <Text style={styles.statLabel}>Mâles Adultes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {getDeceasedAnimals().length}
            </Text>
            <Text style={styles.statLabel}>Décédés</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.animalsSection}>
        <View style={styles.animalsHeader}>
          <Text style={styles.animalsTitle}>🐐 Animaux</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddAnimalModal}>
            <Text style={styles.addButtonText}>+ Nouvel Animal</Text>
          </TouchableOpacity>
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
        {sortedAnimals.map((animal, index) => (
          <AnimalItem key={`${animal.id}-${animalSortOrder}-${index}`} item={animal} />
        ))}
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
          
          {/* Animal card */}
          <View style={[
            styles.treeAnimalCard,
            isDeceased && styles.treeAnimalCardDeceased,
            isHighlighted && styles.treeAnimalCardHighlighted,
            { marginLeft: node.level * 20 }
          ]}>
            <View style={styles.treeAnimalHeader}>
              <Text style={[
                styles.treeAnimalIcon,
                isDeceased && styles.treeAnimalIconDeceased
              ]}>
                {node.species === 'chèvre' ? '🐐' : '🐑'}
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
          </View>
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
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top * 0.8 }]} />
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🐐🐑 Élevage Caprin</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>{animals.length} animaux</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'animals' && styles.activeTab]}
          onPress={() => setActiveTab('animals')}
        >
          <Text style={[styles.tabText, activeTab === 'animals' && styles.activeTabText]}>
            🐐 Animaux
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'milk' && styles.activeTab]}
          onPress={() => setActiveTab('milk')}
        >
          <Text style={[styles.tabText, activeTab === 'milk' && styles.activeTabText]}>
            🥛 Lait
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'genealogy' && styles.activeTab]}
          onPress={() => setActiveTab('genealogy')}
        >
          <Text style={[styles.tabText, activeTab === 'genealogy' && styles.activeTabText]}>
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
                    {['chèvre', 'brebis'].map((species) => (
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
                          {species === 'chèvre' ? '🐐' : '🐑'} {species}
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
                    onPress={saveAnimal}
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
    backgroundColor: '#8B4513', // Brown color for caprine theme
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
    borderBottomColor: '#8B4513',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#8B4513',
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
    color: '#8B4513',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: '#8B4513',
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
    color: '#8B4513',
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
    color: '#8B4513',
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
    color: '#8B4513',
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
    color: '#8B4513',
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
    backgroundColor: '#8B4513',
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
    backgroundColor: '#8B4513',
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
    backgroundColor: '#8B4513',
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
    backgroundColor: '#8B4513',
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
    backgroundColor: '#8B4513',
  },
  treeLineHorizontalWithSiblings: {
    backgroundColor: '#8B4513',
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
  
});
