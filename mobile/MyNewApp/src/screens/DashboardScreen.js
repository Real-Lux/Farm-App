import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import database from '../services/database';
import emailService from '../services/emailService';
import * as Sharing from 'expo-sharing';
import { getStatusColor, getStatusIcon } from '../../constants/StatusConstants';

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0
  });
  const [weeklyEvents, setWeeklyEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [raceSearch, setRaceSearch] = useState('');
  const [ageSearch, setAgeSearch] = useState('');
  const [raceSuggestions, setRaceSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [allLots, setAllLots] = useState([]);
  const [pricingGrids, setPricingGrids] = useState({});

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Refresh data when screen comes into focus (user navigates back to dashboard)
  useFocusEffect(
    useCallback(() => {
      console.log('📊 Dashboard: Screen focused, refreshing data...');
      // Add a small delay to ensure navigation is complete
      const timer = setTimeout(() => {
        loadDashboardData();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      // Wait for database initialization to complete
      await database.waitForInitialization();
      
      const [products, orders, events, lots, historique, pricingGrids] = await Promise.all([
        database.getProducts(),
        database.getOrders(),
        database.getEvents(),
        database.getLots(), // Get all lots from all animal types (no filter)
        database.getHistorique(),
        database.getAllPricingGrids()
      ]);

      console.log('📊 Dashboard: Loading data -', {
        products: products.length,
        orders: orders.length,
        events: events.length,
        lots: lots.length,
        lotsBySpecies: lots.reduce((acc, lot) => {
          const species = lot.species || 'unknown';
          acc[species] = (acc[species] || 0) + 1;
          return acc;
        }, {})
      });

      const pendingOrders = orders.filter(order => order.status === 'En attente');
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
      const lowStockItems = products.filter(product => (product.quantity || 0) < 10).length;

      const newStats = {
        totalProducts: products.length,
        totalOrders: orders.length,
        pendingOrders: pendingOrders.length,
        totalRevenue: totalRevenue,
        lowStockItems: lowStockItems
      };

      console.log('📊 Dashboard: Setting stats -', newStats);
      setStats(newStats);

      // Get events for the next 7 days
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const upcomingEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= today && eventDate <= nextWeek;
      });

      setWeeklyEvents(upcomingEvents);

      // Generate recent activity from all data sources
      const activity = generateRecentActivity(orders, products, events, lots, historique);
      setRecentActivity(activity);

      // Store lots and pricing grids for search
      console.log('📦 Dashboard: Setting lots for search -', {
        totalLots: lots.length,
        lotsWithRaces: lots.filter(l => l.races && Object.keys(l.races).length > 0).length,
        activeLots: lots.filter(l => l.status === 'Actif').length
      });
      setAllLots(lots);
      setPricingGrids(pricingGrids);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleExport = async (tableName) => {
    try {
      // Show loading alert
      Alert.alert('Export en cours', 'Génération du fichier CSV...');
      
      // Export data to CSV
      console.log(`Exporting ${tableName}...`);
      const exportResult = await database.exportToCSV(tableName);
      console.log(`Export result for ${tableName}:`, exportResult);
      
      if (exportResult.fileUri) {
        Alert.alert('Export réussi', `Fichier ${tableName} exporté avec succès!\n\nLe fichier a été sauvegardé sur votre appareil.`);
      } else {
        Alert.alert('Succès', `${tableName} exporté avec succès!`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erreur', error.message || `Impossible d'exporter ${tableName}`);
    }
  };

  const handleCalendarWithOrdersExport = async () => {
    try {
      Alert.alert('Export en cours', 'Génération du calendrier avec commandes...');
      
      console.log('Exporting calendar with orders...');
      const exportResult = await database.exportCalendarWithOrders();
      console.log('Calendar with orders export result:', exportResult);
      
      if (exportResult.fileUri) {
        Alert.alert('Export réussi', 'Fichier calendrier avec commandes exporté avec succès!\n\nLe fichier a été sauvegardé sur votre appareil.');
      } else {
        Alert.alert('Succès', 'Calendrier avec commandes exporté avec succès!');
      }
    } catch (error) {
      console.error('Calendar export error:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'exporter le calendrier avec commandes');
    }
  };

  const handleBackup = async () => {
    try {
      Alert.alert('Sauvegarde en cours', 'Création de la sauvegarde complète...');
      
      const filesToSend = [];
      const tables = ['products', 'orders', 'calendar_events', 'elevage_lots', 'elevage_races', 'elevage_historique', 'caprin_animals', 'caprin_settings', 'saved_formulas', 'order_pricing', 'pricing_grids', 'template_messages'];
      
      // Export each table to CSV
      for (const tableName of tables) {
        try {
          console.log(`Attempting to export ${tableName}...`);
          const exportResult = await database.exportToCSV(tableName);
          console.log(`Export result for ${tableName}:`, exportResult);
          
          if (exportResult.fileUri || exportResult.data) {
            filesToSend.push({
              uri: exportResult.fileUri,
              filename: exportResult.fileName
            });
            console.log(`Added ${tableName} to files to send`);
          }
        } catch (error) {
          console.log(`Skipping ${tableName} - error:`, error.message);
        }
      }
      
      // Create calendar with orders export
      try {
        console.log('Creating calendar with orders export...');
        const calendarResult = await database.exportCalendarWithOrders();
        console.log('Calendar with orders result:', calendarResult);
        
        if (calendarResult.fileUri || calendarResult.data) {
          filesToSend.push({
            uri: calendarResult.fileUri,
            filename: calendarResult.fileName
          });
          console.log('Added calendar with orders to files to send');
        }
      } catch (error) {
        console.log('Skipping calendar with orders - no data available');
      }

      // Create main backup JSON file
      try {
        console.log('Creating main backup...');
        const backupResult = await database.backupDatabase();
        console.log('Backup result:', backupResult);
        
        if (backupResult.fileUri || backupResult.data) {
          filesToSend.push({
            uri: backupResult.fileUri,
            filename: backupResult.fileName
          });
          console.log('Added main backup to files to send');
        }
      } catch (error) {
        console.error('Error creating main backup:', error);
      }
      
      console.log(`Total files to send: ${filesToSend.length}`, filesToSend);
      
      if (filesToSend.length === 0) {
        Alert.alert('Erreur', 'Aucune donnée à sauvegarder');
        return;
      }
      
      // Send all files via email
      Alert.alert(
        'Sauvegarde prête',
        `${filesToSend.length} fichier(s) créé(s).\n\nEnvoyer la sauvegarde complète par email à ${emailService.backupEmail}?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Envoyer par email', 
            onPress: async () => {
              try {
                await emailService.sendFullBackup(filesToSend);
              } catch (emailError) {
                console.error('Email backup error:', emailError);
                Alert.alert('Erreur', 'Impossible d\'envoyer l\'email de sauvegarde');
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Erreur', 'Impossible de créer la sauvegarde');
    }
  };

  const handleImport = async () => {
    try {
      Alert.alert(
        'Importer des données',
        'Choisissez le type d\'importation:',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Fichier JSON (Sauvegarde complète)', 
            onPress: () => handleImportJSON()
          },
          { 
            text: 'Fichier CSV (Données spécifiques)', 
            onPress: () => handleImportCSV()
          }
        ]
      );
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Erreur', 'Impossible d\'importer les données');
    }
  };

  const handleImportJSON = async () => {
    try {
      Alert.alert(
        'Import JSON',
        'Cette fonctionnalité nécessite l\'accès aux fichiers. Dans une vraie application, vous pourriez utiliser un sélecteur de fichiers.',
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Simuler Import', 
            onPress: () => {
              Alert.alert('Import simulé', 'Dans une vraie application, le fichier JSON serait lu et les données restaurées.');
            }
          }
        ]
      );
    } catch (error) {
      console.error('JSON import error:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le fichier JSON');
    }
  };

  const handleImportCSV = async () => {
    try {
      Alert.alert(
        'Import CSV',
        'Choisissez le type de données à importer:',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Commandes', onPress: () => simulateCSVImport('orders') },
          { text: 'Produits', onPress: () => simulateCSVImport('products') },
          { text: 'Événements Calendrier', onPress: () => simulateCSVImport('calendar_events') },
          { text: 'Messages Modèles', onPress: () => simulateCSVImport('template_messages') },
          { text: 'Animaux Caprins', onPress: () => simulateCSVImport('caprin_animals') }
        ]
      );
    } catch (error) {
      console.error('CSV import error:', error);
      Alert.alert('Erreur', 'Impossible d\'importer le fichier CSV');
    }
  };

  const simulateCSVImport = (dataType) => {
    Alert.alert(
      'Import CSV Simulé',
      `Importation de ${dataType} simulée.\n\nDans une vraie application:\n1. Un sélecteur de fichiers s'ouvrirait\n2. Le fichier CSV serait lu\n3. Les données seraient validées\n4. Vous pourriez choisir de fusionner ou remplacer\n5. Les données seraient importées dans la base`,
      [
        { text: 'OK' },
        { 
          text: 'Simuler Fusion', 
          onPress: () => Alert.alert('Fusion simulée', `Les données ${dataType} seraient fusionnées avec les données existantes.`)
        },
        { 
          text: 'Simuler Remplacement', 
          onPress: () => Alert.alert('Remplacement simulé', `Toutes les données ${dataType} existantes seraient remplacées.`)
        }
      ]
    );
  };

  // Status colors and icons are now imported from StatusConstants

  // Get all unique race names from lots
  const getAllRaceNames = (lots) => {
    const raceNames = new Set();
    lots.forEach(lot => {
      if (lot.races && lot.status === 'Actif') {
        Object.keys(lot.races).forEach(raceName => {
          raceNames.add(raceName);
        });
      }
    });
    return Array.from(raceNames).sort();
  };

  // Check if a lot uses estimated quantities
  const isLotEstimated = (lot) => {
    if (!lot) return false;
    return lot.eggs_count > 0 && 
           (!lot.hatched_count || lot.hatched_count === 0) && 
           lot.estimated_success_rate && 
           lot.estimated_success_rate > 0;
  };

  // Handle race search input with autocomplete
  const handleRaceSearch = async (text) => {
    setRaceSearch(text);
    if (text.length > 0) {
      const allRaces = getAllRaceNames(allLots);
      const textLower = text.toLowerCase();
      const raceSuggestions = allRaces.filter(race => 
        race.toLowerCase().includes(textLower)
      );
      
      // Also get animal type suggestions
      const animalTypeSuggestions = [];
      try {
        const animalTypes = await database.getAnimalTypes();
        animalTypes.forEach(type => {
          const config = database.getElevageConfig(type);
          const typeName = config ? config.name : type;
          const typeLabel = config ? config.animalLabel : type;
          if (typeName.toLowerCase().includes(textLower) || 
              typeLabel.toLowerCase().includes(textLower) ||
              type.toLowerCase().includes(textLower)) {
            animalTypeSuggestions.push(typeName);
          }
        });
      } catch (e) {
        console.error('Error getting animal types for suggestions:', e);
      }
      
      // Combine and limit suggestions (races first, then animal types)
      const allSuggestions = [...new Set([...raceSuggestions, ...animalTypeSuggestions])];
      setRaceSuggestions(allSuggestions.slice(0, 5));
    } else {
      setRaceSuggestions([]);
    }
    performSearch(text, ageSearch);
  };

  // Handle age search input
  const handleAgeSearch = (text) => {
    setAgeSearch(text);
    performSearch(raceSearch, text);
  };

  // Parse age input (e.g., 1.25 = 1 month 1 week, 1.5 = 1 month and a half)
  const parseAgeInput = (ageText) => {
    if (!ageText || ageText.trim() === '') return null;
    
    const num = parseFloat(ageText);
    if (isNaN(num)) return null;
    
    const months = Math.floor(num);
    const decimal = num - months;
    
    // Convert decimal to weeks (approximate)
    // 0.25 ≈ 1 week, 0.5 ≈ 2 weeks, 0.75 ≈ 3 weeks
    const weeks = Math.round(decimal * 4);
    
    return {
      months: months,
      weeks: weeks,
      totalMonths: num
    };
  };

  // Format age for display
  const formatAge = (months, weeks) => {
    const parts = [];
    if (months > 0) {
      parts.push(`${months} mois`);
    }
    if (weeks > 0) {
      parts.push(`${weeks} semaine${weeks > 1 ? 's' : ''}`);
    }
    return parts.join(' et ') || '0 mois';
  };

  // Calculate future age from a reference date
  const calculateFutureAge = (referenceDate, targetDate) => {
    if (!referenceDate || !targetDate) return { days: 0, months: 0, weeks: 0 };
    
    const ref = new Date(referenceDate);
    const target = new Date(targetDate);
    const diffMs = target - ref;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30.44);
    const weeks = Math.floor((days % 30.44) / 7);
    
    return { days, months, weeks };
  };

  // Find price from pricing grid
  const findPrice = (ageMonths, sex, pricingGrid) => {
    if (!pricingGrid || pricingGrid.length === 0) return 0;
    
    let bestMatch = null;
    let bestAgeDifference = Infinity;

    pricingGrid.forEach(item => {
      const itemAgeMonths = item.ageMonths || 0;
      const ageDifference = Math.abs(itemAgeMonths - ageMonths);
      
      const sexMatches = item.sex === 'Tous' || 
                        (sex === 'female' && item.sex === 'Femelle') ||
                        (sex === 'male' && item.sex === 'Mâle');
      
      if (sexMatches && ageDifference < bestAgeDifference) {
        bestMatch = item;
        bestAgeDifference = ageDifference;
      }
    });

    return bestMatch ? bestMatch.price : 0;
  };

  // Calculate target date when lot will reach specified age
  const calculateTargetDate = (referenceDate, targetAgeMonths) => {
    if (!referenceDate) return null;
    
    const ref = new Date(referenceDate);
    // Add months and weeks to reference date
    const totalDays = Math.round(targetAgeMonths * 30.44);
    const targetDate = new Date(ref);
    targetDate.setDate(targetDate.getDate() + totalDays);
    
    return targetDate;
  };

  // Perform search
  const performSearch = (raceQuery, ageQuery) => {
    try {
      if (!raceQuery || raceQuery.trim() === '') {
        setSearchResults([]);
        return;
      }

      const parsedAge = parseAgeInput(ageQuery);
      const today = new Date();
      const results = [];

      console.log('🔍 Performing search for:', raceQuery, 'in', allLots.length, 'lots');
      
      if (allLots.length === 0) {
        console.warn('⚠️ No lots available for search!');
        setSearchResults([]);
        return;
      }

      allLots.forEach(lot => {
        try {
          // Include all active lots, regardless of species
          if (!lot.races || lot.status !== 'Actif') {
            return;
          }

      const referenceDate = lot.date_eclosion || lot.date_creation;
      if (!referenceDate) return;

      // Get pricing grid for this lot's animal type
      const animalType = lot.species || 'poussins';
      const pricingGrid = pricingGrids?.[animalType] || [];
      
      // Get animal type config to check if animal type matches search
      const animalConfig = database.getElevageConfig(animalType);
      const animalTypeName = animalConfig ? animalConfig.name : animalType;
      const animalTypeLabel = animalConfig ? animalConfig.animalLabel : animalType;
      
      // Check if animal type matches search query (e.g., "caill" matches "cailles")
      const queryLower = raceQuery.toLowerCase();
      const animalTypeMatches = 
        animalType.toLowerCase().includes(queryLower) ||
        animalTypeName.toLowerCase().includes(queryLower) ||
        animalTypeLabel.toLowerCase().includes(queryLower);

      // If animal type matches, include all races from this lot
      // Otherwise, only include races that match the query
      Object.entries(lot.races).forEach(([raceName, raceInfo]) => {
        if (!raceInfo) return;

        // Check if race matches search OR if animal type matches search
        const raceMatches = raceName.toLowerCase().includes(queryLower);
        if (!raceMatches && !animalTypeMatches) return;

        const males = raceInfo.males || 0;
        const females = raceInfo.females || 0;
        const total = males + females;

        if (total === 0) return;

        // Calculate current age
        const currentAge = calculateFutureAge(referenceDate, today);
        const currentAgeMonths = currentAge.months + (currentAge.weeks / 4.33);
        const isActuallyAvailable = currentAge.days >= 0; // Only available if age is 0 or positive

        let targetDate = null;
        let targetAgeInfo = null;
        let isAvailableNow = false;
        let targetMalePrice = 0;
        let targetFemalePrice = 0;
        let soonestAvailableDate = null;
        let soonestAvailableAge = null;

        // Calculate soonest availability (when they reach 0 days if not available yet)
        if (!isActuallyAvailable) {
          soonestAvailableDate = new Date(referenceDate);
          soonestAvailableAge = { days: 0, months: 0, weeks: 0 };
        }

        // If age filter is specified, calculate when lot will reach that age
        if (parsedAge) {
          const targetAgeMonths = parsedAge.totalMonths;
          
          // Check if already at or past target age AND actually available (days >= 0)
          if (isActuallyAvailable && currentAgeMonths >= targetAgeMonths - 0.1) {
            // Already available at target age
            isAvailableNow = true;
            targetDate = today;
            targetAgeInfo = {
              months: parsedAge.months,
              weeks: parsedAge.weeks,
              days: Math.round(currentAge.days)
            };
            targetMalePrice = findPrice(targetAgeMonths, 'male', pricingGrid);
            targetFemalePrice = findPrice(targetAgeMonths, 'female', pricingGrid);
          } else {
            // Calculate when it will reach target age
            targetDate = calculateTargetDate(referenceDate, targetAgeMonths);
            if (targetDate && targetDate > today) {
              const daysUntil = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24));
              targetAgeInfo = {
                months: parsedAge.months,
                weeks: parsedAge.weeks,
                days: daysUntil
              };
              targetMalePrice = findPrice(targetAgeMonths, 'male', pricingGrid);
              targetFemalePrice = findPrice(targetAgeMonths, 'female', pricingGrid);
            } else {
              // Should not happen, but skip if invalid
              return;
            }
          }
        }

        // Calculate current prices (for display when no age filter)
        const malePrice = findPrice(currentAgeMonths, 'male', pricingGrid);
        const femalePrice = findPrice(currentAgeMonths, 'female', pricingGrid);

        // Calculate future dates (1, 2, 3 months from now) - only if no age filter
        const futureDates = [];
        if (!parsedAge) {
          for (let monthsAhead = 1; monthsAhead <= 3; monthsAhead++) {
            const futureDate = new Date(today);
            futureDate.setMonth(futureDate.getMonth() + monthsAhead);
            const futureAge = calculateFutureAge(referenceDate, futureDate);
            const futureAgeMonths = futureAge.months + (futureAge.weeks / 4.33);
            const futureMalePrice = findPrice(futureAgeMonths, 'male', pricingGrid);
            const futureFemalePrice = findPrice(futureAgeMonths, 'female', pricingGrid);

            futureDates.push({
              date: futureDate,
              age: futureAge,
              ageMonths: futureAgeMonths,
              malePrice: futureMalePrice,
              femalePrice: futureFemalePrice
            });
          }
        }

        // Note: animalConfig already retrieved above

        results.push({
          lotName: lot.name || `Lot ${lot.id}`,
          race: raceName,
          animalType: animalType,
          animalTypeName: animalTypeName,
          animalTypeIcon: animalConfig ? animalConfig.icon : '🐾',
          // Add match type for highlighting
          matchType: raceMatches ? 'race' : 'animalType',
          males: males,
          females: females,
          total: total,
          referenceDate: referenceDate,
          currentAge: currentAge,
          currentAgeMonths: currentAgeMonths,
          malePrice: malePrice,
          femalePrice: femalePrice,
          futureDates: futureDates,
          // New fields for age-targeted search
          targetDate: targetDate,
          targetAgeInfo: targetAgeInfo,
          isAvailableNow: isAvailableNow,
          targetMalePrice: targetMalePrice,
          targetFemalePrice: targetFemalePrice,
          // Fields for availability check
          isActuallyAvailable: isActuallyAvailable,
          soonestAvailableDate: soonestAvailableDate,
          soonestAvailableAge: soonestAvailableAge,
          // Lot estimation info
          eggs_count: lot.eggs_count,
          hatched_count: lot.hatched_count,
          estimated_success_rate: lot.estimated_success_rate
        });
      });
        } catch (lotError) {
          console.error('Error processing lot in search:', lotError, lot);
        }
      });

      console.log('✅ Search completed, found', results.length, 'results');
      setSearchResults(results);
    } catch (error) {
      console.error('❌ Error in performSearch:', error);
      Alert.alert('Erreur de recherche', 'Une erreur est survenue lors de la recherche. Veuillez réessayer.');
      setSearchResults([]);
    }
  };

  const calculateTopChickenRaces = (lots, pricingGrids) => {
    const lotRaceData = [];
    const today = new Date();

    // Helper to calculate age in days
    const calculateAgeInDays = (dateString) => {
      if (!dateString) return 0;
      const date = new Date(dateString);
      const diffMs = today - date;
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };

    // Helper to calculate age in months for pricing
    const calculateAgeInMonths = (dateString) => {
      if (!dateString) return 0;
      const date = new Date(dateString);
      const diffMs = today - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays / 30.44; // Average days per month
    };

    // Helper to find price for a specific animal type
    const findPriceForAnimalType = (ageMonths, sex, animalType) => {
      const pricingGrid = pricingGrids?.[animalType] || [];
      const totalAgeInMonths = ageMonths;
      let bestMatch = null;
      let bestAgeDifference = Infinity;

      pricingGrid.forEach(item => {
        const itemAgeMonths = item.ageMonths || 0;
        const ageDifference = Math.abs(itemAgeMonths - totalAgeInMonths);
        
        const sexMatches = item.sex === 'Tous' || 
                          (sex === 'female' && item.sex === 'Femelle') ||
                          (sex === 'male' && item.sex === 'Mâle');
        
        if (sexMatches && ageDifference < bestAgeDifference) {
          bestMatch = item;
          bestAgeDifference = ageDifference;
        }
      });

      return bestMatch ? bestMatch.price : 0;
    };

    // Collect each lot-race combination separately
    lots.forEach(lot => {
      if (!lot.races || lot.status !== 'Actif') return;

      const referenceDate = lot.date_eclosion || lot.date_creation;
      const ageInDays = calculateAgeInDays(referenceDate);
      const ageInMonths = calculateAgeInMonths(referenceDate);
      const animalType = lot.species || 'poussins';
      const animalConfig = database.getElevageConfig(animalType);

      Object.entries(lot.races).forEach(([raceName, raceInfo]) => {
        if (!raceInfo) return;

        const males = raceInfo.males || 0;
        const females = raceInfo.females || 0;
        const total = males + females;

        if (total > 0) {
          lotRaceData.push({
            lotName: lot.name || `Lot ${lot.id}`,
            race: raceName,
            animalType: animalType,
            animalTypeName: animalConfig ? animalConfig.name : animalType,
            animalTypeIcon: animalConfig ? animalConfig.icon : '🐾',
            males: males,
            females: females,
            total: total,
            ageInDays: ageInDays,
            malePrice: findPriceForAnimalType(ageInMonths, 'male', animalType),
            femalePrice: findPriceForAnimalType(ageInMonths, 'female', animalType)
          });
        }
      });
    });

    // Sort by total population and take top 4
    return lotRaceData
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  };

  const handleEventPress = async (event) => {
    // Check if this is an order-related event (Récupération)
    if (event.type === 'Récupération' && event.order_id) {
      // Navigate to BookingSystemScreen with order highlight
      if (navigation && navigation.navigate) {
        navigation.navigate('Commandes', { 
          highlightOrderId: event.order_id,
          customerName: event.customer_name 
        });
      }
      return;
    }
    
    // Check if this is a lot-related event (Éclosion, Reproduction with lot_id)
    if ((event.type === 'Reproduction' || event.title?.includes('Éclosion') || event.title?.includes('Éclosion estimée') || event.title?.includes('Éclosion réelle')) && event.lot_id) {
      console.log('🔍 Looking for lot with ID:', event.lot_id, 'in', allLots.length, 'lots');
      console.log('📋 Event details:', { title: event.title, lot_id: event.lot_id, type: event.type });
      
      // Find the lot to get its name and animal type - handle both string and number IDs
      const eventLotId = event.lot_id;
      let lot = allLots.find(l => {
        const lotId = l.id;
        // Compare as both string and number to handle type mismatches
        return lotId == eventLotId || String(lotId) === String(eventLotId) || Number(lotId) === Number(eventLotId);
      });
      
      // If lot not found in current allLots, reload from database
      if (!lot) {
        console.log('⚠️ Lot not found in allLots, reloading from database...');
        console.log('📊 Current allLots IDs:', allLots.map(l => ({ id: l.id, name: l.name, species: l.species })));
        try {
          const allLotsFromDB = await database.getLots(); // Get all lots without filter
          console.log('📦 Loaded', allLotsFromDB.length, 'lots from database');
          console.log('📊 Database lots IDs:', allLotsFromDB.map(l => ({ id: l.id, name: l.name, species: l.species })));
          
          lot = allLotsFromDB.find(l => {
            const lotId = l.id;
            return lotId == eventLotId || String(lotId) === String(eventLotId) || Number(lotId) === Number(eventLotId);
          });
          
          // If still not found by ID, try to find by name from event title
          // Event title format: "Éclosion: 2" or "Éclosion estimée: lot name" or "Éclosion réelle: lot name"
          if (!lot && event.title) {
            const titleMatch = event.title.match(/Éclosion[^:]*:\s*(.+)/);
            if (titleMatch) {
              const lotNameFromTitle = titleMatch[1].trim();
              console.log('🔍 Trying to find lot by name from title:', lotNameFromTitle);
              lot = allLotsFromDB.find(l => l.name === lotNameFromTitle || l.name === lotNameFromTitle.toString());
              
              if (lot) {
                console.log('✅ Found lot by name:', lot.name, 'species:', lot.species, 'id:', lot.id);
              } else {
                // Try partial match
                lot = allLotsFromDB.find(l => 
                  l.name && (
                    l.name.includes(lotNameFromTitle) || 
                    lotNameFromTitle.includes(l.name) ||
                    String(l.name) === String(lotNameFromTitle)
                  )
                );
                if (lot) {
                  console.log('✅ Found lot by partial name match:', lot.name, 'species:', lot.species, 'id:', lot.id);
                }
              }
            }
          }
          
          if (lot) {
            console.log('✅ Found lot in database:', lot.name, 'species:', lot.species);
            // Update allLots state for future searches
            setAllLots(allLotsFromDB);
          } else {
            console.error('❌ Lot still not found after database reload. Event lot_id:', eventLotId);
            console.error('📋 Available lot IDs:', allLotsFromDB.map(l => l.id));
            console.error('📋 Available lot names:', allLotsFromDB.map(l => l.name));
            
            // If we can't find the lot, navigate to the appropriate animal type screen anyway
            // Try to determine animal type from event notes or default to poussins
            const animalType = event.notes?.toLowerCase().includes('cailles') ? 'cailles' : 
                              event.notes?.toLowerCase().includes('canards') ? 'canards' :
                              event.notes?.toLowerCase().includes('oies') ? 'oies' :
                              event.notes?.toLowerCase().includes('dindes') ? 'dindes' :
                              event.notes?.toLowerCase().includes('lapins') ? 'lapins' : 'poussins';
            
            console.log('⚠️ Navigating to animal type screen without lot highlight:', animalType);
            if (navigation && navigation.navigate) {
              navigation.navigate('Gestion', { 
                screen: 'ElevageScreen',
                params: {
                  animalType: animalType,
                  initialTab: 'lots'
                }
              });
              Alert.alert(
                'Information', 
                `Le lot référencé par cet événement n'existe plus.\n\nVous avez été redirigé vers la page ${animalType}.`
              );
            }
            return;
          }
        } catch (error) {
          console.error('Error loading lot from database:', error);
        }
      } else {
        console.log('✅ Found lot in allLots:', lot.name, 'species:', lot.species);
      }
      
      if (lot && navigation && navigation.navigate) {
        // Determine animal type from lot species
        const animalType = lot.species || 'poussins';
        console.log('📍 Navigating to ElevageScreen for lot:', lot.name, 'animalType:', animalType, 'lot_id:', lot.id);
        navigation.navigate('Gestion', { 
          screen: 'ElevageScreen',
          params: {
            animalType: animalType,
            highlightLotId: lot.id, // Use lot.id instead of event.lot_id to ensure correct type
            highlightLotName: lot.name,
            initialTab: 'lots'
          }
        });
      } else if (!lot) {
        console.error('❌ Lot not found for event:', event);
        console.error('📋 Event lot_id:', event.lot_id, 'Type:', typeof event.lot_id);
        // Final fallback - navigate to default animal type
        if (navigation && navigation.navigate) {
          navigation.navigate('Gestion', { 
            screen: 'ElevageScreen',
            params: {
              animalType: 'poussins',
              initialTab: 'lots'
            }
          });
        }
        Alert.alert(
          'Information', 
          `Le lot référencé par cet événement n'existe plus.\n\nID recherché: ${event.lot_id}\nTitre: ${event.title}\n\nVous avez été redirigé vers la page des poussins.`
        );
      }
      return;
    }
    
    // For other events, navigate to calendar
    if (navigation && navigation.navigate) {
      navigation.navigate('Calendrier');
    }
  };

  const generateRecentActivity = (orders, products, events, lots, historique) => {
    const activities = [];
    const now = new Date();

    // Helper function to calculate time ago
    const getTimeAgo = (dateString) => {
      const date = new Date(dateString);
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Il y a moins d\'une heure';
      if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
      if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    };

    // Recent orders (last 7 days)
    const recentOrders = orders
      .filter(order => {
        const orderDate = new Date(order.orderDate);
        const daysDiff = (now - orderDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      .slice(0, 3);

    recentOrders.forEach(order => {
      let activityText = '';
      if (order.orderType === 'Adoption') {
        activityText = `🦆 Nouvelle adoption: ${order.customerName} - ${order.animalType || 'animaux'} ${order.race || ''}`;
      } else if (order.orderType === 'Autres produits') {
        activityText = `📦 Nouvelle commande de produits: ${order.customerName} - ${order.product || 'produits'}`;
      } else {
        activityText = `📦 Nouvelle commande: ${order.customerName} - ${order.orderType}`;
      }

      activities.push({
        id: `order-${order.id}`,
        text: activityText,
        time: getTimeAgo(order.orderDate),
        type: 'order',
        timestamp: new Date(order.orderDate)
      });
    });

    // Recent events (last 7 days)
    const recentEvents = events
      .filter(event => {
        const eventDate = new Date(event.date);
        const daysDiff = (now - eventDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 2);

    recentEvents.forEach(event => {
      let activityText = '';
      if (event.type === 'Récupération') {
        activityText = `📅 Récupération prévue: ${event.customer_name || 'Client'} - ${event.title}`;
      } else if (event.type === 'Alimentation') {
        activityText = `🌾 Alimentation: ${event.title}`;
      } else if (event.type === 'Entretien') {
        activityText = `🧹 Entretien: ${event.title}`;
      } else {
        activityText = `📅 ${event.type}: ${event.title}`;
      }

      activities.push({
        id: `event-${event.id}`,
        text: activityText,
        time: getTimeAgo(event.date),
        type: 'event',
        timestamp: new Date(event.date)
      });
    });

    // Recent lots (last 7 days)
    const recentLots = lots
      .filter(lot => {
        const lotDate = new Date(lot.date_creation);
        const daysDiff = (now - lotDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
      .slice(0, 2);

    recentLots.forEach(lot => {
      activities.push({
        id: `lot-${lot.id}`,
        text: `🐣 Nouveau lot créé: ${lot.name}`,
        time: getTimeAgo(lot.date_creation),
        type: 'lot',
        timestamp: new Date(lot.date_creation)
      });
    });

    // Recent historique entries (last 7 days)
    const recentHistorique = historique
      .filter(entry => {
        const entryDate = new Date(entry.date);
        const daysDiff = (now - entryDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 2);

    recentHistorique.forEach(entry => {
      let activityText = '';
      if (entry.type === 'Mort') {
        activityText = `💀 Mort enregistrée: ${entry.race} - ${entry.description}`;
      } else if (entry.type === 'Naissance') {
        activityText = `🐣 Naissance enregistrée: ${entry.race}`;
      } else {
        activityText = `📝 ${entry.type}: ${entry.race} - ${entry.description}`;
      }

      activities.push({
        id: `hist-${entry.id}`,
        text: activityText,
        time: getTimeAgo(entry.date),
        type: 'historique',
        timestamp: new Date(entry.date)
      });
    });

    // Sort all activities by timestamp (most recent first) and take top 5
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  };

  const StatCard = ({ title, value, color, icon }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top * 0.8 }]} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🐓 La Ferme Aux Oeufs Bleus</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
      </View>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollViewContent}
      >

      {/* Compact General Status */}
      <View style={styles.compactStatusContainer}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Commandes</Text>
            <Text style={[styles.statusValue, { color: '#2196F3' }]}>{stats.totalOrders}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>En Attente</Text>
            <Text style={[styles.statusValue, { color: '#FF9800' }]}>{stats.pendingOrders}</Text>
          </View>
        </View>
      </View>

      {/* Weekly Events Preview */}
      <View style={styles.weeklyEventsContainer}>
        <TouchableOpacity 
          style={styles.weeklyEventsHeader}
          onPress={() => {
            if (navigation && navigation.navigate) {
              navigation.navigate('Calendrier');
            }
          }}
        >
          <Text style={styles.weeklyEventsTitle}>
            📅 {weeklyEvents.length} événement{weeklyEvents.length > 1 ? 's' : ''} de la semaine
          </Text>
          <Text style={styles.arrowText}>→</Text>
        </TouchableOpacity>
        
        {weeklyEvents.length > 0 ? (
          <View style={styles.eventsList}>
            {weeklyEvents.slice(0, 3).map((event, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.eventItem}
                onPress={() => handleEventPress(event)}
                activeOpacity={0.7}
              >
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(event.date).toLocaleDateString('fr-FR', { 
                      weekday: 'short', 
                      day: 'numeric',
                      month: 'short'
                    })}
                  </Text>
                </View>
                {event.type === 'Récupération' && event.customer_name && (
                  <View style={styles.eventStatus}>
                    <Text style={[styles.statusBadge, { 
                      backgroundColor: getStatusColor(event.status || 'En attente') 
                    }]}>
                      {getStatusIcon(event.status || 'En attente')} {event.status || 'En attente'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {weeklyEvents.length > 3 && (
              <Text style={styles.moreEventsText}>
                +{weeklyEvents.length - 3} autres événements...
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.noEventsText}>Pas d'événement pour la semaine à venir</Text>
        )}
      </View>

      {/* Race Search Interface */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Recherche Rapide</Text>
        
        {/* Race Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchLabel}>Race:</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Ex: Araucana (tapez 'ara' pour suggestions)"
            value={raceSearch}
            onChangeText={handleRaceSearch}
            placeholderTextColor="#999"
          />
          {raceSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {raceSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setRaceSearch(suggestion);
                    setRaceSuggestions([]);
                    performSearch(suggestion, ageSearch);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Age Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchLabel}>Âge (mois, ex: 1.25 = 1 mois 1 semaine):</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Ex: 2 ou 1.5 ou 1.25"
            value={ageSearch}
            onChangeText={handleAgeSearch}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>
              {searchResults.length} lot{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
            </Text>
            {searchResults.map((result, index) => {
              const resultIsEstimated = isLotEstimated({
                eggs_count: result.eggs_count,
                hatched_count: result.hatched_count,
                estimated_success_rate: result.estimated_success_rate
              });
              
              return (
              <View key={index} style={[styles.resultCard, resultIsEstimated && styles.resultCardEstimated]}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultHeaderLeft}>
                    <View style={styles.resultRaceRow}>
                      <Text style={styles.resultAnimalTypeIcon}>{result.animalTypeIcon || '🐾'}</Text>
                      <Text style={styles.resultRace}>{result.race}</Text>
                      {result.animalTypeName && (
                        <Text style={styles.resultAnimalType}>({result.animalTypeName})</Text>
                      )}
                    </View>
                    <Text style={styles.resultLot}>{result.lotName}</Text>
                    {resultIsEstimated && (
                      <View style={styles.estimatedBadge}>
                        <Text style={styles.estimatedBadgeText}>⚠️ Estimé</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                {resultIsEstimated && (
                  <View style={styles.estimatedWarning}>
                    <Text style={styles.estimatedWarningText}>
                      ⚠️ Quantités estimées: {result.eggs_count} œufs × {result.estimated_success_rate}%
                    </Text>
                  </View>
                )}
                
                {/* Age-targeted search results */}
                {result.targetDate && (
                  <View style={styles.availabilitySectionCompact}>
                    <View style={styles.targetAvailabilityHeader}>
                      <Text style={styles.availabilityTitleCompact}>
                        {result.isAvailableNow && result.isActuallyAvailable ? '✅ Disponible maintenant' : `📅 Disponible le ${result.targetDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                      </Text>
                      {!result.isAvailableNow && result.targetAgeInfo && (
                        <Text style={styles.availabilitySubtitleCompact}>
                          Dans {result.targetAgeInfo.days} jour{result.targetAgeInfo.days > 1 ? 's' : ''} ({formatAge(result.targetAgeInfo.months, result.targetAgeInfo.weeks)})
                        </Text>
                      )}
                    </View>
                    <View style={styles.availabilityRowCompact}>
                      <Text style={styles.availabilityCompactText}>
                        ♀️ {result.females} {result.targetFemalePrice > 0 && <Text style={styles.availabilityPriceInline}>• {result.targetFemalePrice}€</Text>}
                      </Text>
                      <Text style={styles.availabilityCompactText}>
                        ♂️ {result.males} {result.targetMalePrice > 0 && <Text style={styles.availabilityPriceInline}>• {result.targetMalePrice}€</Text>}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Current Availability (when no age filter) */}
                {!result.targetDate && (
                  <>
                    {result.isActuallyAvailable ? (
                      <View style={styles.availabilitySectionCompact}>
                        <Text style={styles.availabilityTitleCompact}>✅ Disponible maintenant</Text>
                        <View style={styles.availabilityRowCompact}>
                          <Text style={styles.availabilityCompactText}>
                            ♀️ {result.females} {result.femalePrice > 0 && <Text style={styles.availabilityPriceInline}>• {result.femalePrice}€</Text>}
                          </Text>
                          <Text style={styles.availabilityCompactText}>
                            ♂️ {result.males} {result.malePrice > 0 && <Text style={styles.availabilityPriceInline}>• {result.malePrice}€</Text>}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.availabilitySectionCompact}>
                        <Text style={styles.availabilityTitleCompact}>
                          📅 Disponible le {result.soonestAvailableDate?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) || 'bientôt'}
                        </Text>
                        <Text style={styles.availabilitySubtitleCompact}>
                          Dans {Math.abs(result.currentAge.days)} jour{Math.abs(result.currentAge.days) > 1 ? 's' : ''}
                        </Text>
          </View>
                    )}
                  </>
                )}

                {/* Future Availability (only when no age filter) */}
                {!result.targetDate && result.futureDates.length > 0 && (
                  <View style={styles.futureSection}>
                    <Text style={styles.futureTitle}>Disponibilité future:</Text>
                    {result.futureDates.map((future, idx) => (
                      <View key={idx} style={styles.futureItem}>
                        <Text style={styles.futureDate}>
                          {future.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {formatAge(future.age.months, future.age.weeks)}
                        </Text>
                        <View style={styles.futurePrices}>
                          {future.femalePrice > 0 && (
                            <Text style={styles.futurePrice}>♀️ {future.femalePrice}€</Text>
                          )}
                          {future.malePrice > 0 && (
                            <Text style={styles.futurePrice}>♂️ {future.malePrice}€</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              );
            })}
          </View>
        )}

        {raceSearch && searchResults.length === 0 && (
          <Text style={styles.noResultsText}>
            Aucun lot trouvé pour "{raceSearch}"
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activité Récente</Text>
        {recentActivity.length > 0 ? (
          recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <Text style={styles.activityText}>{activity.text}</Text>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          ))
        ) : (
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>📋 Aucune activité récente</Text>
            <Text style={styles.activityTime}>Les nouvelles activités apparaîtront ici</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export de Données</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleExport('products')}
          >
            <Text style={styles.actionButtonText}>📤 Exporter Produits</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleExport('orders')}
          >
            <Text style={styles.actionButtonText}>📤 Exporter Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleExport('calendar_events')}
          >
            <Text style={styles.actionButtonText}>📅 Exporter Calendrier</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCalendarWithOrdersExport}
          >
            <Text style={styles.actionButtonText}>📋 Calendrier + Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleBackup}
          >
            <Text style={styles.actionButtonText}>💾 Sauvegarder Tout</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleImport}
          >
            <Text style={styles.actionButtonText}>📥 Importer Fichier</Text>
          </TouchableOpacity>
        </View>
        
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#005F6B', // Darker blue, like duck blue (bleu canard)
    paddingTop: 38,
  },
  headerContent: {
    padding: 10,
    paddingTop: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerDate: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  compactStatusContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weeklyEventsContainer: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weeklyEventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weeklyEventsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  arrowText: {
    fontSize: 18,
    color: '#005F6B',
    fontWeight: 'bold',
  },
  eventsList: {
    gap: 8,
  },
  eventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
  },
  eventStatus: {
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  moreEventsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 5,
  },
  noEventsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  section: {
    margin: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  activityItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 3,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#005F6B',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  raceCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#005F6B',
  },
  raceCardHeader: {
    marginBottom: 10,
  },
  raceCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  raceCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
  },
  raceCardBadge: {
    backgroundColor: '#005F6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  raceCardBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  raceCardLot: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  raceCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  raceCardStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  raceCardStatLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  raceCardStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#005F6B',
    marginBottom: 2,
  },
  raceCardStatPrice: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  raceCardDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  suggestionsContainer: {
    marginTop: 5,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#005F6B',
  },
  resultsContainer: {
    marginTop: 10,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  resultCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#005F6B',
  },
  resultCardEstimated: {
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFF8E1',
  },
  resultHeader: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  resultRaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  resultAnimalTypeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  resultRace: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginRight: 6,
  },
  resultAnimalType: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  resultLot: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginRight: 8,
  },
  estimatedBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  estimatedBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'white',
  },
  estimatedWarning: {
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  estimatedWarningText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '600',
  },
  availabilitySection: {
    marginBottom: 12,
  },
  availabilitySectionCompact: {
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  targetAvailabilityHeader: {
    marginBottom: 6,
  },
  availabilityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  availabilityTitleCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  availabilitySubtitle: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  availabilitySubtitleCompact: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  availabilityRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  availabilityItem: {
    alignItems: 'center',
  },
  availabilityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#005F6B',
    marginBottom: 2,
  },
  availabilityCompactText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#005F6B',
    flex: 1,
  },
  availabilityPrice: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  availabilityPriceInline: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  availabilityAge: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  futureSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  futureTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  futureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  futureDate: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  futurePrices: {
    flexDirection: 'row',
    gap: 8,
  },
  futurePrice: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
});