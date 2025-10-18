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

export default function CaprinScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [animals, setAnimals] = useState([]);
  const [activeTab, setActiveTab] = useState('animals');
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
  
  const [animalForm, setAnimalForm] = useState({
    name: '',
    species: 'chèvre', // 'chèvre' or 'brebis'
    breed: '',
    birthDate: '',
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
  }, []);

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
    setModalType('genealogy');
    setGenealogyForm({
      animalId: animal.id,
      relationship: 'parent',
      relatedAnimalId: '',
      notes: ''
    });
    setModalVisible(true);
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
    if (!animalForm.name || !animalForm.species || !animalForm.birthDate) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
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
    
    return (
      <View style={styles.card}>
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
              color: item.status === 'vivant' ? '#4CAF50' : '#F44336' 
            }]}>
              {item.status}
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
              {item.mother && <Text style={styles.cardInfo}>👩 Mère: {item.mother}</Text>}
              {item.father && <Text style={styles.cardInfo}>👨 Père: {item.father}</Text>}
              {item.gender === 'femelle' && (
                <Text style={styles.cardInfo}>
                  🥛 Production totale: {totalMilk.toFixed(1)}L (moy: {avgMilk}L/jour)
                </Text>
              )}
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
              {item.gender === 'femelle' && (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.milkBtn]}
                  onPress={() => openMilkModal(item)}
                >
                  <Text style={styles.actionBtnText}>🥛 Lait</Text>
                </TouchableOpacity>
              )}
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

  const renderAnimals = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🐐🐑 Gestion Caprine</Text>
        <Text style={styles.sectionDescription}>
          Gestion complète de mes chèvres et brebis : naissances, production laitière, généalogie
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddAnimalModal}>
          <Text style={styles.addButtonText}>+ Nouvel Animal</Text>
        </TouchableOpacity>
      </View>
      
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
              {getBabyAnimals().length}
            </Text>
            <Text style={styles.statLabel}>Bébés (0-6 mois)</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {getGrownMales().length}
            </Text>
            <Text style={styles.statLabel}>Mâles Adultes</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.animalsSection}>
        <Text style={styles.animalsSectionTitle}>Animaux</Text>
        {animals.map(animal => (
          <AnimalItem key={animal.id} item={animal} />
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
              {caprinSettings.milkRecordingMethod === 'individual' 
                ? animals.reduce((total, animal) => total + getTotalMilkProduction(animal), 0).toFixed(1)
                : getTotalGroupMilkProduction().toFixed(1)
              }L
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
      
      {caprinSettings.milkRecordingMethod === 'individual' ? (
        <>
          
          <View style={styles.milkProductionList}>
            <Text style={styles.milkProductionTitle}>Production par Animal</Text>
            {animals.filter(animal => animal.gender === 'femelle').map(animal => (
              <View key={animal.id} style={styles.milkProductionCard}>
                <View style={styles.milkProductionHeader}>
                  <Text style={styles.milkProductionName}>
                    {animal.species === 'chèvre' ? '🐐' : '🐑'} {animal.name}
                  </Text>
                  <Text style={styles.milkProductionTotal}>
                    {getTotalMilkProduction(animal).toFixed(1)}L
                  </Text>
                </View>
                <Text style={styles.milkProductionAverage}>
                  Moyenne: {getAverageMilkProduction(animal)}L/jour
                </Text>
                {animal.milkProduction && animal.milkProduction.length > 0 && (
                  <View style={styles.milkProductionHistory}>
                    <Text style={styles.milkProductionHistoryTitle}>Dernières productions:</Text>
                    {animal.milkProduction.slice(-3).map((day, index) => (
                      <Text key={index} style={styles.milkProductionDay}>
                        {day.date}: {day.total}L (M: {day.morning}L, S: {day.evening}L)
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          
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
        </>
      )}
    </ScrollView>
  );

  const renderGenealogy = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🌳 Arbre Généalogique</Text>
        <Text style={styles.sectionDescription}>
          Relations familiales et lignées de vos animaux
        </Text>
      </View>
      
      <View style={styles.genealogyList}>
        {animals.map(animal => (
          <View key={animal.id} style={styles.genealogyCard}>
            <View style={styles.genealogyHeader}>
              <Text style={styles.genealogyName}>
                {animal.species === 'chèvre' ? '🐐' : '🐑'} {animal.name}
              </Text>
              <Text style={styles.genealogyBreed}>{animal.breed}</Text>
            </View>
            
            {animal.parents && (animal.parents.mother || animal.parents.father) && (
              <View style={styles.genealogyParents}>
                <Text style={styles.genealogySectionTitle}>👨‍👩‍👧‍👦 Parents:</Text>
                {animal.parents.mother && (
                  <Text style={styles.genealogyParent}>👩 Mère: {animal.parents.mother}</Text>
                )}
                {animal.parents.father && (
                  <Text style={styles.genealogyParent}>👨 Père: {animal.parents.father}</Text>
                )}
              </View>
            )}
            
            {animal.offspring && animal.offspring.length > 0 && (
              <View style={styles.genealogyOffspring}>
                <Text style={styles.genealogySectionTitle}>👶 Descendance:</Text>
                {animal.offspring.map((child, index) => (
                  <Text key={index} style={styles.genealogyChild}>
                    • {child}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'Modifier l\'Animal' : 'Nouvel Animal'}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Nom de l'animal *"
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
                  value={animalForm.mother}
                  onChangeText={(text) => setAnimalForm({...animalForm, mother: text})}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Père (optionnel)"
                  value={animalForm.father}
                  onChangeText={(text) => setAnimalForm({...animalForm, father: text})}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes"
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
          </View>
        </Modal>

        {/* Milk Production Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible && modalType === 'milk'}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
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
                value={milkForm.morning}
                onChangeText={(text) => setMilkForm({...milkForm, morning: text})}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Lait du soir (L) *"
                value={milkForm.evening}
                onChangeText={(text) => setMilkForm({...milkForm, evening: text})}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes"
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
            </View>
          </View>
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
                value={groupMilkForm.total}
                onChangeText={(text) => setGroupMilkForm({...groupMilkForm, total: text})}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes"
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
                  {['individual', 'group'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodOption,
                        caprinSettings.milkRecordingMethod === method && styles.methodOptionSelected
                      ]}
                      onPress={() => setCaprinSettings({...caprinSettings, milkRecordingMethod: method})}
                    >
                      <Text style={[
                        styles.methodOptionText,
                        caprinSettings.milkRecordingMethod === method && styles.methodOptionTextSelected
                      ]}>
                        {method === 'individual' ? '🐐 Par animal (matin/soir)' : '🐑 Par troupeau (total quotidien)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
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
                {caprinSettings.milkRecordingMethod === 'individual' 
                  ? 'Enregistrez la production de chaque animal séparément avec les quantités du matin et du soir.'
                  : 'Enregistrez la production totale quotidienne du troupeau en une seule fois.'
                }
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
                  {calendarField === 'birthDate' ? 'Date de naissance' : 'Date'}
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
                maxDate={calendarField === 'birthDate' ? getTodayISO() : undefined}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
  
});
