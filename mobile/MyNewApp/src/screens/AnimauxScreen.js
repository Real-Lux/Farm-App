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
  StatusBar,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import database from '../services/database';
import configService from '../services/configService';

export default function AnimauxScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  // Get initialTab from route params if provided
  const { initialTab } = route?.params || {};
  const [activeTab, setActiveTab] = useState(initialTab || 'elevage');
  
  // Elevage statistics state
  const [elevageStats, setElevageStats] = useState({
    activeLots: 0,
    totalLivingAnimals: 0,
    uniqueRaces: 0,
    deathsThisWeek: 0
  });

  // Animal types state (for Avicole)
  const [animalTypes, setAnimalTypes] = useState([]);
  const [addAnimalTypeModal, setAddAnimalTypeModal] = useState(false);
  const [newElevageAnimalTypeName, setNewElevageAnimalTypeName] = useState('');
  const [animalTypeStats, setAnimalTypeStats] = useState({});

  // Herd types state (for Étable)
  const [herdTypes, setHerdTypes] = useState([]);
  const [addHerdTypeModal, setAddHerdTypeModal] = useState(false);
  const [newHerdTypeName, setNewHerdTypeName] = useState('');
  const [herdTypeStats, setHerdTypeStats] = useState({});

  // Treatments state
  const [treatmentModal, setTreatmentModal] = useState(false);
  const [treatmentType, setTreatmentType] = useState('dosage'); // 'dosage' or 'formula'
  const [dosageForm, setDosageForm] = useState({
    animalWeight: '',
    dosagePerKg: '',
    concentration: ''
  });
  const [formulaForm, setFormulaForm] = useState({
    formula: '',
    variables: {}
  });
  const [animals, setAnimals] = useState([
    { id: 1, name: 'Animal 1', weight: '' }
  ]);
  const [savedFormulas, setSavedFormulas] = useState([]);
  const [saveFormulaModal, setSaveFormulaModal] = useState(false);
  const [formulaName, setFormulaName] = useState('');

  useEffect(() => {
    loadSavedFormulas();
    loadElevageStatistics();
    loadAnimalTypes();
    loadHerdTypes();
    loadConfigs();
  }, []);

  useEffect(() => {
    if (animalTypes.length > 0) {
      console.log('🐾 Animaux: animalTypes changed, loading stats for:', animalTypes);
      loadAnimalTypeStats();
    }
  }, [animalTypes]);

  useEffect(() => {
    if (herdTypes.length > 0) {
      console.log('🐾 Animaux: herdTypes changed, loading stats for:', herdTypes);
      loadHerdTypeStats();
    }
  }, [herdTypes]);

  // Handle initial tab from route params
  useEffect(() => {
    if (initialTab && ['elevage', 'etable', 'traitements'].includes(initialTab)) {
      console.log('🐾 Animaux: Setting activeTab from initialTab:', initialTab);
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Reload statistics when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🐾 Animaux: Screen focused, reloading data...');
      loadElevageStatistics();
      loadAnimalTypes();
      loadHerdTypes();
      // Check route params when screen comes into focus
      const routeInitialTab = route?.params?.initialTab;
      if (routeInitialTab && ['elevage', 'etable', 'traitements'].includes(routeInitialTab)) {
        console.log('🐾 Animaux: Setting activeTab from route params on focus:', routeInitialTab);
        setActiveTab(routeInitialTab);
      }
    }, [route?.params?.initialTab])
  );

  const loadConfigs = async () => {
    try {
      const savedActiveTab = await configService.loadAnimauxActiveTab();
      const routeInitialTab = route?.params?.initialTab;
      if (!routeInitialTab && savedActiveTab) {
        setActiveTab(savedActiveTab);
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

  const loadElevageStatistics = async () => {
    try {
      const stats = await database.getElevageStatistics();
      setElevageStats(stats);
    } catch (error) {
      console.error('Error loading elevage statistics:', error);
    }
  };

  const loadAnimalTypes = async () => {
    try {
      const types = await database.getAnimalTypes();
      console.log('🐾 Animaux: Loaded animal types:', types);
      setAnimalTypes(types);
      // Stats will be loaded automatically via useEffect when animalTypes changes
    } catch (error) {
      console.error('Error loading animal types:', error);
    }
  };

  const loadAnimalTypeStats = async () => {
    try {
      const stats = {};
      for (const animalType of animalTypes) {
        const lots = await database.getLots(animalType);
        const races = await database.getRaces(animalType);
        
        const activeLots = lots.filter(lot => lot.status === 'Actif');
        const totalLivingAnimals = lots.reduce((total, lot) => {
          return total + Object.values(lot.races || {}).reduce((lotTotal, race) => lotTotal + (race.current || 0), 0);
        }, 0);
        
        stats[animalType] = {
          activeLots: activeLots.length,
          totalLivingAnimals,
          uniqueRaces: races.length
        };
      }
      
      setAnimalTypeStats(stats);
    } catch (error) {
      console.error('Error loading animal type stats:', error);
    }
  };

  const deleteAnimalType = async (animalType) => {
    Alert.alert(
      'Supprimer le type d\'animal',
      `Êtes-vous sûr de vouloir supprimer le type "${getElevageTypeName(animalType)}"? Cette action ne supprime pas les données, mais masque simplement ce type de la liste.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await database.deleteAnimalType(animalType);
              setAnimalTypes(prev => prev.filter(t => t !== animalType));
              await loadAnimalTypeStats();
            } catch (error) {
              console.error('Error deleting animal type:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le type d\'animal');
            }
          }
        }
      ]
    );
  };

  const addElevageAnimalType = async () => {
    if (!newElevageAnimalTypeName.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type d\'animal');
      return;
    }
    
    // Available animal types with their keys
    const availableAnimalTypes = {
      'Poussins/Poules': 'poussins',
      'Cailles': 'cailles',
      'Canards': 'canards',
      'Oies': 'oies',
      'Paons': 'paons',
      'Dindes': 'dindes',
      'Lapins': 'lapins'
    };
    
    const animalTypeKey = availableAnimalTypes[newElevageAnimalTypeName] || newElevageAnimalTypeName.toLowerCase();
    
    // Check if already exists
    if (animalTypes.includes(animalTypeKey)) {
      Alert.alert('Erreur', 'Ce type d\'animal est déjà configuré');
      return;
    }
    
    try {
      await database.addAnimalType(animalTypeKey);
      setAnimalTypes(prev => [...prev, animalTypeKey]);
      setAddAnimalTypeModal(false);
      setNewElevageAnimalTypeName('');
      await loadAnimalTypeStats();
      Alert.alert('Succès', `Type d'animal "${newElevageAnimalTypeName}" ajouté avec succès!`);
    } catch (error) {
      console.error('Error adding animal type:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le type d\'animal');
    }
  };

  const getElevageTypeIcon = (animalType) => {
    const config = database.getElevageConfig(animalType);
    return config.icon || '🐾';
  };

  const getElevageTypeName = (animalType) => {
    const config = database.getElevageConfig(animalType);
    return config.name || animalType;
  };

  const loadHerdTypes = async () => {
    try {
      const types = await database.getHerdTypes();
      console.log('🐾 Animaux: Loaded herd types:', types);
      setHerdTypes(types);
      // Stats will be loaded automatically via useEffect when herdTypes changes
    } catch (error) {
      console.error('Error loading herd types:', error);
    }
  };

  const loadHerdTypeStats = async () => {
    try {
      const stats = {};
      for (const herdType of herdTypes) {
        const animals = await database.getHerdAnimals(herdType);
        stats[herdType] = animals.length;
      }
      setHerdTypeStats(stats);
    } catch (error) {
      console.error('Error loading herd type stats:', error);
    }
  };

  const deleteHerdType = async (herdType) => {
    Alert.alert(
      'Supprimer le troupeau',
      `Êtes-vous sûr de vouloir supprimer le troupeau ${getHerdTypeName(herdType)}? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Get current types and filter out the one to delete
              const types = await database.getHerdTypes();
              const updatedTypes = types.filter(t => t !== herdType);
              
              // Update storage directly
              const dbInstance = database;
              if (dbInstance.storage && dbInstance.storage.herd_types) {
                dbInstance.storage.herd_types = updatedTypes;
                // Also clean up related data
                if (dbInstance.storage.herd_animals && dbInstance.storage.herd_animals[herdType]) {
                  delete dbInstance.storage.herd_animals[herdType];
                }
                if (dbInstance.storage.herd_settings && dbInstance.storage.herd_settings[herdType]) {
                  delete dbInstance.storage.herd_settings[herdType];
                }
                await dbInstance.saveToStorage();
              }
              
              setHerdTypes(updatedTypes);
              await loadHerdTypeStats();
              Alert.alert('Succès', `Troupeau ${getHerdTypeName(herdType)} supprimé`);
            } catch (error) {
              console.error('Error deleting herd type:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le troupeau');
            }
          }
        }
      ]
    );
  };

  const addHerdType = async () => {
    if (!newHerdTypeName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le type de troupeau');
      return;
    }
    
    // Map display names to database keys (preserve accents)
    const herdTypeMap = {
      'Caprin': 'caprin',
      'Ovin': 'ovin',
      'Bovin': 'bovin',
      'Équin': 'équin',
      'Porcin': 'porcin'
    };
    
    const herdTypeKey = herdTypeMap[newHerdTypeName] || newHerdTypeName.toLowerCase().replace(/\s+/g, '_');
    
    // Check if already exists (case-insensitive and accent-insensitive)
    const normalizedExisting = herdTypes.map(t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    const normalizedNew = herdTypeKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (normalizedExisting.includes(normalizedNew)) {
      Alert.alert('Erreur', 'Ce type de troupeau existe déjà');
      return;
    }
    
    try {
      await database.addHerdType(herdTypeKey);
      setHerdTypes(prev => [...prev, herdTypeKey]);
      setAddHerdTypeModal(false);
      setNewHerdTypeName('');
      await loadHerdTypeStats();
      Alert.alert('Succès', `Type de troupeau "${newHerdTypeName}" ajouté avec succès!`);
    } catch (error) {
      console.error('Error adding herd type:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le type de troupeau');
    }
  };

  const getHerdTypeIcon = (herdType) => {
    const icons = {
      'caprin': '🐐',
      'ovin': '🐑',
      'bovin': '🐄',
      'équin': '🐴',
      'porcin': '🐷'
    };
    return icons[herdType] || '🐾';
  };

  const getHerdTypeName = (herdType) => {
    const names = {
      'caprin': 'Caprin',
      'ovin': 'Ovin',
      'bovin': 'Bovin',
      'équin': 'Équin',
      'porcin': 'Porcin'
    };
    return names[herdType] || herdType.charAt(0).toUpperCase() + herdType.slice(1);
  };

  const getAnimalLabel = (herdType) => {
    const labels = {
      'caprin': 'Chèvres',
      'ovin': 'Brebis',
      'bovin': 'Vaches',
      'équin': 'Chevaux',
      'porcin': 'Porcs'
    };
    return labels[herdType] || 'Animaux';
  };

  // Treatment functions
  const openTreatmentModal = (type) => {
    setTreatmentType(type);
    setTreatmentModal(true);
    if (type === 'dosage') {
      setDosageForm({
        animalWeight: '',
        dosagePerKg: '',
        concentration: ''
      });
    } else {
      setFormulaForm({
        formula: '',
        variables: {}
      });
    }
  };

  const addAnimal = () => {
    const newAnimal = {
      id: Date.now(),
      name: `Animal ${animals.length + 1}`,
      weight: ''
    };
    setAnimals([...animals, newAnimal]);
  };

  const removeAnimal = (id) => {
    if (animals.length > 1) {
      setAnimals(animals.filter(animal => animal.id !== id));
    }
  };

  const updateAnimal = (id, field, value) => {
    setAnimals(animals.map(animal => 
      animal.id === id ? { ...animal, [field]: value } : animal
    ));
  };

  const calculateDosage = () => {
    const results = animals.map(animal => {
      const weight = parseFloat(animal.weight) || 0;
      const dosagePerKg = parseFloat(dosageForm.dosagePerKg) || 0;
      const concentration = parseFloat(dosageForm.concentration) || 1;
      
      const totalDosage = weight * dosagePerKg;
      const volumeNeeded = totalDosage / concentration;
      
      return {
        ...animal,
        totalDosage: totalDosage.toFixed(2),
        volumeNeeded: volumeNeeded.toFixed(2)
      };
    });
    
    return results;
  };

  const calculateFormula = () => {
    try {
      const { formula, variables } = formulaForm;
      let processedFormula = formula;
      
      // Replace variables in formula
      Object.keys(variables).forEach(variable => {
        const value = parseFloat(variables[variable]) || 0;
        processedFormula = processedFormula.replace(new RegExp(variable, 'g'), value);
      });
      
      // Evaluate the formula (basic math operations)
      const result = eval(processedFormula);
      return isNaN(result) ? 'Erreur de calcul' : result.toFixed(2);
    } catch (error) {
      return 'Erreur de formule';
    }
  };

  const updateFormulaVariable = (variable, value) => {
    setFormulaForm({
      ...formulaForm,
      variables: {
        ...formulaForm.variables,
        [variable]: value
      }
    });
  };

  const loadSavedFormulas = async () => {
    try {
      const formulas = await database.getSavedFormulas();
      setSavedFormulas(formulas);
    } catch (error) {
      console.error('Error loading saved formulas:', error);
    }
  };

  const saveFormula = async () => {
    if (!formulaName.trim() || !formulaForm.formula.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le nom et la formule');
      return;
    }

    try {
      const newFormula = {
        id: Date.now(),
        name: formulaName.trim(),
        formula: formulaForm.formula,
        description: `Formule personnalisée: ${formulaName.trim()}`,
        example: `Variables: ${Object.keys(formulaForm.variables).map(v => `${v} = ${formulaForm.variables[v] || '?'}`).join(', ')}`
      };

      await database.saveFormula(newFormula);
      setSavedFormulas(prev => [...prev, newFormula]);
      setSaveFormulaModal(false);
      setFormulaName('');
      Alert.alert('Succès', 'Formule sauvegardée avec succès!');
    } catch (error) {
      console.error('Error saving formula:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la formule');
    }
  };

  const loadFormula = (formula) => {
    setFormulaForm({
      formula: formula.formula,
      variables: {}
    });
    setTreatmentModal(false);
    setTreatmentModal(true);
  };

  const deleteFormula = (id) => {
    Alert.alert(
      'Supprimer la formule',
      'Êtes-vous sûr de vouloir supprimer cette formule?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await database.deleteFormula(id);
            setSavedFormulas(prev => prev.filter(f => f.id !== id));
          } catch (error) {
            console.error('Error deleting formula:', error);
            Alert.alert('Erreur', 'Impossible de supprimer la formule');
          }
        }}
      ]
    );
  };

  const renderElevageAvicole = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🐓 Élevage Avicole</Text>
        <Text style={styles.sectionDescription}>
          Gestion complète de vos volailles et lapins par type
        </Text>
        
        {/* Animal Types List */}
        <View style={styles.animalTypesContainer}>
          {animalTypes.length > 0 ? (
            animalTypes.map((animalType) => {
              const stats = animalTypeStats[animalType] || { activeLots: 0, totalLivingAnimals: 0, uniqueRaces: 0 };
              const config = database.getElevageConfig(animalType);
              
              return (
                <TouchableOpacity 
                  key={animalType}
                  style={styles.animalTypeCard}
                  onPress={() => navigation.navigate('ElevageScreen', { animalType })}
                  activeOpacity={0.7}
                >
                  <View style={styles.animalTypeCardContent}>
                    <View style={styles.animalTypeCardLeft}>
                      <Text style={styles.animalTypeIcon}>{config.icon}</Text>
                      <View style={styles.animalTypeInfo}>
                        <Text style={styles.animalTypeName}>{config.name}</Text>
                        <Text style={styles.animalTypeCount}>
                          {stats.activeLots} lots • {stats.totalLivingAnimals} animaux • {stats.uniqueRaces} races
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteAnimalTypeButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        deleteAnimalType(animalType);
                      }}
                    >
                      <Text style={styles.deleteAnimalTypeButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.noAnimalTypesCard}>
              <Text style={styles.noAnimalTypesText}>Aucun type d'animal configuré</Text>
              <Text style={styles.noAnimalTypesSubtext}>
                Appuyez sur le bouton + pour ajouter un type d'animal
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.quickStats}>
        <Text style={styles.quickStatsTitle}>Statistiques Globales</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{elevageStats.activeLots}</Text>
            <Text style={styles.statLabel}>Lots Actifs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{elevageStats.totalLivingAnimals}</Text>
            <Text style={styles.statLabel}>Animaux Vivants</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{elevageStats.uniqueRaces}</Text>
            <Text style={styles.statLabel}>Races Gérées</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{elevageStats.deathsThisWeek}</Text>
            <Text style={styles.statLabel}>Morts Cette Semaine</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderElevageEtable = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🏠 Étable - Gestion des Troupeaux</Text>
        <Text style={styles.sectionDescription}>
          Gestion complète de tous vos troupeaux : naissances, production, généalogie
        </Text>
        
        {/* Herd Types List */}
        <View style={styles.herdTypesContainer}>
          {herdTypes.length > 0 ? (
            herdTypes.map((herdType) => (
              <TouchableOpacity 
                key={herdType}
                style={styles.herdTypeCard}
                onPress={() => navigation.navigate('EtableScreen', { herdType })}
                activeOpacity={0.7}
              >
                <View style={styles.herdTypeCardContent}>
                  <View style={styles.herdTypeCardLeft}>
                    <Text style={styles.herdTypeIcon}>{getHerdTypeIcon(herdType)}</Text>
                    <View style={styles.herdTypeInfo}>
                      <Text style={styles.herdTypeName}>{getHerdTypeName(herdType)}</Text>
                      <Text style={styles.herdTypeCount}>
                        {herdTypeStats[herdType] || 0} {getAnimalLabel(herdType)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteHerdTypeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteHerdType(herdType);
                    }}
                  >
                    <Text style={styles.deleteHerdTypeButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noHerdTypesCard}>
              <Text style={styles.noHerdTypesText}>Aucun troupeau configuré</Text>
              <Text style={styles.noHerdTypesSubtext}>
                Appuyez sur le bouton + pour ajouter un troupeau
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.sectionCard}
        onPress={() => navigation.navigate('CheeseScreen')}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>🧀 Production Fromage</Text>
            <Text style={styles.sectionDescription}>
              Gestion de la transformation laitière : recettes, affinage, stockage
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'Fonctionnalités Production Fromage',
                '• 📝 Gestion des recettes\n• ⏰ Suivi d\'affinage\n• 📦 Contrôle de stockage\n• 📊 Statistiques de production\n• 🏷️ Étiquetage et traçabilité',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.infoButtonText}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderTraitements = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💊 Calculs de Traitements</Text>
        <Text style={styles.sectionDescription}>
          Calculatrices pour dosages vétérinaires et formules personnalisées
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => openTreatmentModal('dosage')}
          >
            <Text style={styles.addButtonText}>💉 Calcul Dosage</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.templateButton} 
            onPress={() => openTreatmentModal('formula')}
          >
            <Text style={styles.templateButtonText}>🧮 Formule Perso</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.calculationExamples}>
        <Text style={styles.examplesTitle}>💡 Formules Sauvegardées :</Text>
        {savedFormulas.map((formula) => (
          <View key={formula.id} style={styles.exampleCard}>
            <View style={styles.formulaCardHeader}>
              <Text style={styles.exampleTitle}>{formula.name}</Text>
              <View style={styles.formulaCardActions}>
                <TouchableOpacity 
                  style={styles.loadFormulaButton}
                  onPress={() => loadFormula(formula)}
                >
                  <Text style={styles.loadFormulaButtonText}>📥 Charger</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteFormulaButton}
                  onPress={() => deleteFormula(formula.id)}
                >
                  <Text style={styles.deleteFormulaButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.exampleText}>
              • Formule: {formula.formula}{'\n'}
              • {formula.example}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top * 0.8 }]} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🐾 Animaux</Text>
        </View>
      </View>
      
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'elevage' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('elevage');
              await configService.saveAnimauxActiveTab('elevage');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'elevage' && styles.activeTabText]}>
              🐓 Avicole
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'etable' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('etable');
              await configService.saveAnimauxActiveTab('etable');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'etable' && styles.activeTabText]}>
              🏠 Étable
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'traitements' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('traitements');
              await configService.saveAnimauxActiveTab('traitements');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'traitements' && styles.activeTabText]}>
              💊 Traitements
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView 
          style={styles.mainScrollView}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'elevage' && renderElevageAvicole()}
          {activeTab === 'etable' && renderElevageEtable()}
          {activeTab === 'traitements' && renderTraitements()}
        </ScrollView>

        {/* Floating Add Button for Animal Types */}
        {activeTab === 'elevage' && (
          <TouchableOpacity
            style={styles.floatingAddButton}
            onPress={() => setAddAnimalTypeModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingAddButtonText}>+</Text>
          </TouchableOpacity>
        )}

        {/* Floating Add Button for Herd Types */}
        {activeTab === 'etable' && (
          <TouchableOpacity
            style={styles.floatingAddButton}
            onPress={() => setAddHerdTypeModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingAddButtonText}>+</Text>
          </TouchableOpacity>
        )}

        {/* Add Animal Type Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={addAnimalTypeModal}
          onRequestClose={() => setAddAnimalTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ajouter un type d'animal</Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    setAddAnimalTypeModal(false);
                    setNewElevageAnimalTypeName('');
                  }}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                Sélectionnez le type d'animal à ajouter à votre élevage
              </Text>
              
              <View style={styles.animalTypeOptions}>
                {[
                  { key: 'poussins', label: 'Poussins/Poules', icon: '🐓' },
                  { key: 'cailles', label: 'Cailles', icon: '🐦' },
                  { key: 'canards', label: 'Canards', icon: '🦆' },
                  { key: 'oies', label: 'Oies', icon: '🪿' },
                  { key: 'paons', label: 'Paons', icon: '🦚' },
                  { key: 'dindes', label: 'Dindes', icon: '🦃' },
                  { key: 'lapins', label: 'Lapins', icon: '🐰' }
                ].filter(option => !animalTypes.includes(option.key)).map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.animalTypeOption,
                      newElevageAnimalTypeName === option.label && styles.animalTypeOptionSelected
                    ]}
                    onPress={() => setNewElevageAnimalTypeName(option.label)}
                  >
                    <Text style={styles.animalTypeOptionIcon}>{option.icon}</Text>
                    <Text style={[
                      styles.animalTypeOptionText,
                      newElevageAnimalTypeName === option.label && styles.animalTypeOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {animalTypes.length >= 7 && (
                <View style={styles.noMoreTypesContainer}>
                  <Text style={styles.noMoreTypesText}>
                    Tous les types d'animaux disponibles sont déjà configurés
                  </Text>
                </View>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={addElevageAnimalType}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    Ajouter
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Herd Type Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={addHerdTypeModal}
          onRequestClose={() => setAddHerdTypeModal(false)}
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🆕 Nouveau Type de Troupeau</Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    setAddHerdTypeModal(false);
                    setNewHerdTypeName('');
                  }}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                
                <Text style={styles.templateDescription}>
                  Ajoutez un nouveau type de troupeau à gérer :
                </Text>
                
                <Text style={styles.inputLabel}>Types disponibles :</Text>
                <View style={styles.herdTypeOptions}>
                  {['Caprin', 'Ovin', 'Bovin', 'Équin', 'Porcin'].map((type) => {
                    const herdTypeMap = {
                      'Caprin': 'caprin',
                      'Ovin': 'ovin',
                      'Bovin': 'bovin',
                      'Équin': 'équin',
                      'Porcin': 'porcin'
                    };
                    const typeKey = herdTypeMap[type] || type.toLowerCase().replace(/\s+/g, '_');
                    const isSelected = newHerdTypeName.toLowerCase() === type.toLowerCase();
                    const normalizedExisting = herdTypes.map(t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
                    const normalizedNew = typeKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const alreadyExists = normalizedExisting.includes(normalizedNew);
                    
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.herdTypeOption,
                          isSelected && styles.herdTypeOptionSelected,
                          alreadyExists && styles.herdTypeOptionDisabled
                        ]}
                        onPress={() => !alreadyExists && setNewHerdTypeName(type)}
                        disabled={alreadyExists}
                      >
                        <Text style={[
                          styles.herdTypeOptionText,
                          isSelected && styles.herdTypeOptionTextSelected,
                          alreadyExists && styles.herdTypeOptionTextDisabled
                        ]}>
                          {type} {alreadyExists && '(déjà ajouté)'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Ou entrez un nom personnalisé"
                  placeholderTextColor="#999"
                  value={newHerdTypeName}
                  onChangeText={setNewHerdTypeName}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.saveBtn]}
                    onPress={addHerdType}
                  >
                    <Text style={[styles.modalBtnText, { color: 'white' }]}>
                      Ajouter
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Treatment Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={treatmentModal}
          onRequestClose={() => setTreatmentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {treatmentType === 'dosage' ? '💉 Calcul de Dosage' : '🧮 Formule Personnalisée'}
                </Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setTreatmentModal(false)}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {treatmentType === 'dosage' ? (
                <>
                  <View style={styles.dosageSection}>
                    <Text style={styles.sectionSubtitle}>Paramètres de dosage :</Text>
                    
                    <TextInput
                      style={styles.input}
                      placeholder="Dosage par kg (ex: 0.1)"
                      placeholderTextColor="#999"
                      value={dosageForm.dosagePerKg}
                      onChangeText={(text) => setDosageForm({...dosageForm, dosagePerKg: text})}
                      keyboardType="decimal-pad"
                    />
                    
                    <TextInput
                      style={styles.input}
                      placeholder="Concentration (mg/ml ou %) - optionnel"
                      placeholderTextColor="#999"
                      value={dosageForm.concentration}
                      onChangeText={(text) => setDosageForm({...dosageForm, concentration: text})}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.animalsSection}>
                    <View style={styles.animalsHeader}>
                      <Text style={styles.sectionSubtitle}>Animaux :</Text>
                      <TouchableOpacity style={styles.addAnimalButton} onPress={addAnimal}>
                        <Text style={styles.addAnimalButtonText}>+ Ajouter</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {animals.map((animal, index) => (
                      <View key={animal.id} style={styles.animalRow}>
                        <TextInput
                          style={[styles.input, styles.animalNameInput]}
                          placeholder="Nom"
                          placeholderTextColor="#999"
                          value={animal.name}
                          onChangeText={(text) => updateAnimal(animal.id, 'name', text)}
                        />
                        <TextInput
                          style={[styles.input, styles.animalWeightInput]}
                          placeholder="Poids (kg)"
                          placeholderTextColor="#999"
                          value={animal.weight}
                          onChangeText={(text) => updateAnimal(animal.id, 'weight', text)}
                          keyboardType="decimal-pad"
                        />
                        {animals.length > 1 && (
                          <TouchableOpacity 
                            style={styles.removeAnimalButton}
                            onPress={() => removeAnimal(animal.id)}
                          >
                            <Text style={styles.removeAnimalButtonText}>🗑️</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>

                  <View style={styles.resultsSection}>
                    <Text style={styles.sectionSubtitle}>Résultats :</Text>
                    {calculateDosage().map((result, index) => (
                      <View key={index} style={styles.resultCard}>
                        <Text style={styles.resultAnimalName}>{result.name}</Text>
                        <Text style={styles.resultText}>
                          Dosage total: {result.totalDosage} ml
                        </Text>
                        {dosageForm.concentration && (
                          <Text style={styles.resultText}>
                            Volume à administrer: {result.volumeNeeded} ml
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.formulaSection}>
                    <Text style={styles.sectionSubtitle}>Formule :</Text>
                    <View style={styles.formulaRow}>
                      <TextInput
                        style={[styles.input, styles.formulaInput]}
                        placeholder="Ex: 0.21*12/X"
                        placeholderTextColor="#999"
                        value={formulaForm.formula}
                        onChangeText={(text) => setFormulaForm({...formulaForm, formula: text})}
                      />
                      <View style={styles.resultInline}>
                        <Text style={styles.resultInlineText}>
                          = {formulaForm.formula ? calculateFormula() : '?'}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.formulaHelp}>
                      Utilisez X, Y, Z comme variables. Exemples: +, -, *, /, (, )
                    </Text>
                  </View>

                  <View style={styles.variablesSection}>
                    <Text style={styles.sectionSubtitle}>Variables :</Text>
                    {['X', 'Y', 'Z'].map(variable => (
                      <View key={variable} style={styles.variableRow}>
                        <Text style={styles.variableLabel}>{variable} =</Text>
                        <TextInput
                          style={[styles.input, styles.variableInput]}
                          placeholder="0"
                          placeholderTextColor="#999"
                          value={formulaForm.variables[variable] || ''}
                          onChangeText={(text) => updateFormulaVariable(variable, text)}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    ))}
                  </View>

                  <View style={styles.saveFormulaSection}>
                    <TouchableOpacity 
                      style={styles.saveFormulaButton}
                      onPress={() => setSaveFormulaModal(true)}
                    >
                      <Text style={styles.saveFormulaButtonText}>💾 Sauvegarder Formule</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

            </View>
          </View>
        </Modal>

        {/* Save Formula Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={saveFormulaModal}
          onRequestClose={() => setSaveFormulaModal(false)}
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>💾 Sauvegarder Formule</Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setSaveFormulaModal(false)}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                
                <Text style={styles.saveFormulaDescription}>
                  Donnez un nom à votre formule pour la retrouver facilement :
                </Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Nom de la formule (ex: Dosage Antibiotique)"
                  placeholderTextColor="#999"
                  value={formulaName}
                  onChangeText={setFormulaName}
                />
              
                <View style={styles.formulaPreview}>
                  <Text style={styles.formulaPreviewTitle}>Formule à sauvegarder :</Text>
                  <Text style={styles.formulaPreviewText}>{formulaForm.formula}</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.saveBtn]}
                    onPress={saveFormula}
                  >
                    <Text style={[styles.modalBtnText, { color: 'white' }]}>
                      Sauvegarder
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

// Styles - using the same styles from ProductManagementScreen
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
    backgroundColor: '#005F6B',
    paddingTop: 38,
  },
  headerContent: {
    padding: 10,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  tabContainer: {
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingVertical: 0,
  },
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 80,
  },
  activeTab: {
    borderBottomColor: '#005F6B',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#005F6B',
  },
  mainScrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 15,
    paddingTop: 10,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005F6B',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  sectionTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  infoButton: {
    backgroundColor: '#f0f8ff',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#005F6B',
  },
  infoButtonText: {
    fontSize: 16,
    color: '#005F6B',
    fontWeight: 'bold',
  },
  quickStats: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
    color: '#005F6B',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
    textAlign: 'center',
  },
  animalTypesContainer: {
    marginTop: 15,
    gap: 10,
  },
  animalTypeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  animalTypeCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  animalTypeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  animalTypeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  animalTypeInfo: {
    flex: 1,
  },
  animalTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  animalTypeCount: {
    fontSize: 13,
    color: '#666',
  },
  deleteAnimalTypeButton: {
    backgroundColor: '#F44336',
    borderRadius: 6,
    padding: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAnimalTypeButtonText: {
    fontSize: 16,
  },
  noAnimalTypesCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  noAnimalTypesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  noAnimalTypesSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  herdTypesContainer: {
    marginTop: 15,
    gap: 10,
  },
  herdTypeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  herdTypeCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  herdTypeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  herdTypeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  herdTypeInfo: {
    flex: 1,
  },
  herdTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  herdTypeCount: {
    fontSize: 13,
    color: '#666',
  },
  deleteHerdTypeButton: {
    backgroundColor: '#F44336',
    borderRadius: 6,
    padding: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHerdTypeButtonText: {
    fontSize: 16,
  },
  noHerdTypesCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  noHerdTypesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  noHerdTypesSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
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
  templateButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    flex: 1,
  },
  templateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  calculationExamples: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  exampleCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#005F6B',
    marginBottom: 6,
  },
  exampleText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  formulaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  formulaCardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  loadFormulaButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  loadFormulaButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 10,
  },
  deleteFormulaButton: {
    backgroundColor: '#F44336',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  deleteFormulaButtonText: {
    color: 'white',
    fontSize: 10,
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
    width: '90%',
    maxWidth: 400,
    maxHeight: Platform.OS === 'ios' ? '85%' : '90%',
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginBottom: 20,
    color: '#333',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
  },
  modalCloseBtnText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
  },
  modalCloseBtnText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
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
  animalTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  animalTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
    minWidth: '45%',
  },
  animalTypeOptionSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  animalTypeOptionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  animalTypeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  animalTypeOptionTextSelected: {
    color: 'white',
  },
  noMoreTypesContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  noMoreTypesText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
  },
  herdTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  herdTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
    minWidth: '45%',
  },
  herdTypeOptionSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  herdTypeOptionDisabled: {
    backgroundColor: '#e0e0e0',
    borderColor: '#ccc',
    opacity: 0.6,
  },
  herdTypeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  herdTypeOptionTextSelected: {
    color: 'white',
  },
  herdTypeOptionTextDisabled: {
    color: '#999',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  dosageSection: {
    marginBottom: 20,
  },
  animalsSection: {
    marginBottom: 20,
  },
  animalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addAnimalButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addAnimalButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  animalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  animalNameInput: {
    flex: 2,
    marginBottom: 0,
  },
  animalWeightInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeAnimalButton: {
    backgroundColor: '#F44336',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  removeAnimalButtonText: {
    color: 'white',
    fontSize: 12,
  },
  resultsSection: {
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  resultAnimalName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  formulaSection: {
    marginBottom: 20,
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  formulaInput: {
    flex: 1,
    marginBottom: 0,
  },
  resultInline: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  resultInlineText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  formulaHelp: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  variablesSection: {
    marginBottom: 20,
  },
  variableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  variableLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
    width: 20,
  },
  variableInput: {
    flex: 1,
    marginBottom: 0,
  },
  saveFormulaSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  saveFormulaButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveFormulaButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  saveFormulaDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  formulaPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  formulaPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  formulaPreviewText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
});

