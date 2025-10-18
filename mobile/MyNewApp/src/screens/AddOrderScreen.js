import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import database from '../services/database';
import configService from '../services/configService';
import { toISODate, getTodayISO, formatForCalendar } from '../utils/dateUtils';
import { ORDER_STATUSES, getStatusColor, getStatusIcon } from '../../constants/StatusConstants';

export default function AddOrderScreen({ navigation, route }) {
  const { editingOrder, onSaveOrder } = route.params || {};
  const insets = useSafeAreaInsets();
  
  const [expandedAnimals, setExpandedAnimals] = useState({ poussins: true });
  const [availableStock, setAvailableStock] = useState({});
  const [lots, setLots] = useState([]);
  const [lotSelectionModal, setLotSelectionModal] = useState(false);
  const [selectedRaceForLot, setSelectedRaceForLot] = useState(null);
  const [selectedAnimalForLot, setSelectedAnimalForLot] = useState(null);
  const [lotSelections, setLotSelections] = useState({}); // Track lot selections per race
  const [calendarModal, setCalendarModal] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [raceConfigModal, setRaceConfigModal] = useState(false);
  const [selectedAnimalForConfig, setSelectedAnimalForConfig] = useState(null);
  const [currentRaceConfig, setCurrentRaceConfig] = useState({
    race: '',
    ageMonths: '',
    ageWeeks: '',
    sexPreference: 'female', // Default to females
    quantity: 1,
    selectedLot: null
  });
  const [multipleRaceConfigs, setMultipleRaceConfigs] = useState([]); // Track multiple configs in modal
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [priceAdjustment, setPriceAdjustment] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState([]);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [pricingGridAvailable, setPricingGridAvailable] = useState(true);
  const [orderForm, setOrderForm] = useState(editingOrder ? {
    orderType: editingOrder.orderType || 'Adoption',
    selectedAnimals: editingOrder.selectedAnimals || ['poussins'],
    animalDetails: editingOrder.animalDetails || {
      poussins: {
        races: [],
        characteristics: [],
        colors: {},
        genders: {}
      }
    },
    ageMonths: editingOrder.ageMonths || '',
    ageWeeks: editingOrder.ageWeeks || '',
    deliveryDate: toISODate(editingOrder.deliveryDate || ''),
    customerName: editingOrder.customerName || '',
    customerPhone: editingOrder.customerPhone || '',
    customerEmail: editingOrder.customerEmail || '',
    otherDetails: editingOrder.otherDetails || '',
    product: editingOrder.product || '',
    quantity: editingOrder.quantity ? editingOrder.quantity.toString() : '',
    totalPrice: editingOrder.totalPrice ? editingOrder.totalPrice.toString() : '',
    status: editingOrder.status || 'En attente'
  } : {
    orderType: 'Adoption',
    selectedAnimals: ['poussins'],
    animalDetails: {
      poussins: {
        races: [],
        characteristics: [],
        colors: {},
        genders: {}
      }
    },
    ageMonths: '',
    ageWeeks: '',
    deliveryDate: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    otherDetails: '',
    product: '',
    quantity: '',
    totalPrice: '',
    status: 'En attente'
  });

  const orderTypes = ['Adoption', 'Poulets', 'Œufs de conso', 'Œufs fécondés', 'Fromage'];
  const animalTypes = ['poussins', 'canards', 'oie', 'lapin', 'chèvre', 'cailles'];
  const racesByAnimal = {
    poussins: ['Araucana', 'Cream Legbar', 'Leghorn', 'Marans', 'Vorwerk', 'Orpington', 'Brahma', 'Pékin', 'Soie'],
    canards: ['Coureur indien', 'Cayuga', 'Barbarie'],
    oie: ['Guinée', 'Toulouse'],
    lapin: ['Fermier'],
    chèvre: ['Alpine', 'Saanen', 'Poitevine', 'Angora'],
    cailles: ['Japonaise']
  };

  useEffect(() => {
    loadAvailableStock();
    loadCalendarEvents();
    loadConfigs();
    
    // Ensure all race configurations have unique IDs
    if (editingOrder && editingOrder.animalDetails) {
      const updatedAnimalDetails = {};
      Object.keys(editingOrder.animalDetails).forEach(animal => {
        const animalDetail = editingOrder.animalDetails[animal];
        if (animalDetail.races && Array.isArray(animalDetail.races)) {
          updatedAnimalDetails[animal] = {
            ...animalDetail,
            races: animalDetail.races.map((race, index) => ({
              ...race,
              id: race.id || `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`
            }))
          };
        } else {
          updatedAnimalDetails[animal] = animalDetail;
        }
      });
      
      if (Object.keys(updatedAnimalDetails).length > 0) {
        setOrderForm(prev => ({
          ...prev,
          animalDetails: updatedAnimalDetails
        }));
      }
    }
  }, []);

  const loadConfigs = async () => {
    try {
      const expandedAnimals = await configService.loadAddOrderExpandedAnimals();
      setExpandedAnimals(expandedAnimals);
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

  // Calculate price whenever order details change
  useEffect(() => {
    calculatePrice();
  }, [orderForm.orderType, orderForm.animalDetails, orderForm.quantity]);

  const calculatePrice = async () => {
    try {
      // Check if pricing grids are available for the selected animal types
      const pricingGrids = await database.getAllPricingGrids();
      const selectedAnimalTypes = Object.keys(orderForm.animalDetails || {});
      
      // Check if at least one selected animal type has a pricing grid
      const hasPricingGrid = selectedAnimalTypes.some(animalType => 
        pricingGrids[animalType] && pricingGrids[animalType].length > 0
      );
      
      if (!hasPricingGrid) {
        setPricingGridAvailable(false);
        setCalculatedPrice(0);
        setPriceBreakdown([]);
        return;
      }
      
      setPricingGridAvailable(true);
      
      // Calculate pricing for each animal type separately
      let totalCalculatedPrice = 0;
      let allPriceBreakdowns = [];
      
      for (const animalType of selectedAnimalTypes) {
        if (orderForm.animalDetails[animalType]?.races && orderForm.animalDetails[animalType].races.length > 0) {
          // Create a temporary order form for this specific animal type
          const animalSpecificOrder = {
            ...orderForm,
            selectedAnimals: [animalType],
            animalDetails: {
              [animalType]: orderForm.animalDetails[animalType]
            }
          };
          
          const pricingData = database.calculateOrderPrice(animalSpecificOrder);
          totalCalculatedPrice += pricingData.estimatedPrice;
          allPriceBreakdowns = [...allPriceBreakdowns, ...pricingData.priceBreakdown];
        }
      }
      
      setCalculatedPrice(totalCalculatedPrice);
      setPriceBreakdown(allPriceBreakdowns);
      
      // Update the total price field with calculated price + adjustment
      const finalPrice = totalCalculatedPrice + parseFloat(priceAdjustment || 0);
      setOrderForm(prev => ({
        ...prev,
        totalPrice: finalPrice.toFixed(2)
      }));
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };

  const loadCalendarEvents = async () => {
    try {
      const events = await database.getEvents();
      setCalendarEvents(events);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    }
  };

  // Convert events to calendar format for marked dates
  const getMarkedDates = () => {
    const marked = {};
    
    // Mark calendar events
    calendarEvents.forEach(event => {
      const date = event.date || event.event_date;
      if (date) {
        const eventDate = date.split('T')[0]; // Get YYYY-MM-DD format
        if (!marked[eventDate]) {
          marked[eventDate] = { 
            dots: [],
            marked: true
          };
        }
        
        marked[eventDate].dots.push({
          color: '#4CAF50', // Green for events
          key: event.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      }
    });

    // Mark selected delivery date
    if (orderForm.deliveryDate) {
      if (!marked[orderForm.deliveryDate]) {
        marked[orderForm.deliveryDate] = { dots: [] };
      }
      marked[orderForm.deliveryDate].selected = true;
      marked[orderForm.deliveryDate].selectedColor = '#005F6B';
    }

    return marked;
  };

  const handleDateSelect = (day) => {
    setOrderForm({...orderForm, deliveryDate: day.dateString});
    setCalendarModal(false);
  };

  const loadAvailableStock = async () => {
    try {
      const [lotsData] = await Promise.all([
        database.getLots()
      ]);
      
      setLots(lotsData);
      
      // Calculate available stock for each race
      const stockData = {};
      for (const animal in racesByAnimal) {
        for (const race of racesByAnimal[animal]) {
          const result = await database.getAvailableStock(race);
          stockData[race] = result;
        }
      }
      setAvailableStock(stockData);
    } catch (error) {
      console.error('Erreur lors du chargement du stock:', error);
    }
  };

  const orderStatuses = ORDER_STATUSES;

  // Status colors and icons are now imported from StatusConstants

  const toggleAnimalSelection = (animal) => {
    const currentAnimals = orderForm.selectedAnimals;
    let newAnimals, newDetails;
    let newExpandedAnimals = { ...expandedAnimals };
    
    if (currentAnimals.includes(animal)) {
      // Remove animal
      newAnimals = currentAnimals.filter(a => a !== animal);
      newDetails = { ...orderForm.animalDetails };
      delete newDetails[animal];
      delete newExpandedAnimals[animal];
    } else {
      // Add animal and expand it by default
      newAnimals = [...currentAnimals, animal];
      newDetails = { 
        ...orderForm.animalDetails, 
        [animal]: {
          races: [], // Start with empty races array
          characteristics: [],
          colors: {},
          genders: {}
        }
      };
      newExpandedAnimals[animal] = true;
    }
    
    setExpandedAnimals(newExpandedAnimals);
    setOrderForm({
      ...orderForm,
      selectedAnimals: newAnimals,
      animalDetails: newDetails
    });
  };

  const toggleAnimalExpansion = async (animal) => {
    const newExpandedAnimals = {
      ...expandedAnimals,
      [animal]: !expandedAnimals[animal]
    };
    setExpandedAnimals(newExpandedAnimals);
    await configService.saveAddOrderExpandedAnimals(newExpandedAnimals);
  };

  const getAnimalTotalQuantity = (animal) => {
    if (!orderForm.animalDetails[animal]?.races) return 0;
    return orderForm.animalDetails[animal].races
      .reduce((total, raceConfig) => total + (parseInt(raceConfig.quantity) || 0), 0);
  };

  const getAnimalSpecificPrice = (animal) => {
    if (!orderForm.animalDetails[animal]?.races || orderForm.animalDetails[animal].races.length === 0) {
      return 0;
    }
    
    // Create a temporary order form for this specific animal type
    const animalSpecificOrder = {
      ...orderForm,
      selectedAnimals: [animal],
      animalDetails: {
        [animal]: orderForm.animalDetails[animal]
      }
    };
    
    try {
      const pricingData = database.calculateOrderPrice(animalSpecificOrder);
      return pricingData.estimatedPrice;
    } catch (error) {
      console.error(`Error calculating price for ${animal}:`, error);
      return 0;
    }
  };

  // Group race configurations by race name
  const getRaceConfigurationsByRace = (animal) => {
    if (!orderForm.animalDetails[animal]?.races) return {};
    
    return orderForm.animalDetails[animal].races.reduce((groups, config) => {
      const race = config.race;
      if (!groups[race]) {
        groups[race] = [];
      }
      groups[race].push(config);
      return groups;
    }, {});
  };

  // Get total quantity for a specific race
  const getRaceTotalQuantity = (raceConfigs) => {
    return raceConfigs.reduce((total, config) => total + (parseInt(config.quantity) || 0), 0);
  };

  const updateRaceQuantity = (animal, race, quantity) => {
    const requestedQty = parseInt(quantity) || 0;
    const stockInfo = availableStock[race];
    
    if (stockInfo && requestedQty > stockInfo.totalStock) {
      Alert.alert(
        'Stock insuffisant',
        `Stock disponible pour ${race}: ${stockInfo.totalStock} animaux`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    const newDetails = {
      ...orderForm.animalDetails,
      [animal]: {
        ...orderForm.animalDetails[animal],
        races: {
          ...orderForm.animalDetails[animal].races,
          [race]: requestedQty
        }
      }
    };
    
    setOrderForm({
      ...orderForm,
      animalDetails: newDetails
    });
  };

  const getStockStatusColor = (race) => {
    const stockInfo = availableStock[race];
    if (!stockInfo) return '#666';
    
    if (stockInfo.totalStock === 0) return '#F44336';
    if (stockInfo.totalStock < 10) return '#FF9800';
    return '#4CAF50';
  };

  const getStockStatusText = (race) => {
    const stockInfo = availableStock[race];
    if (!stockInfo) return 'Chargement...';
    
    if (stockInfo.totalStock === 0) return '❌ Rupture de stock';
    if (stockInfo.totalStock < 10) return `⚠️ ${stockInfo.totalStock} en stock`;
    return `✅ ${stockInfo.totalStock} en stock`;
  };

  const getLotInfo = (race) => {
    const stockInfo = availableStock[race];
    if (!stockInfo || stockInfo.lots.length === 0) return '';
    
    return stockInfo.lots.map(lot => 
      `Lot ${lot.lot_name} (${lot.available} dispo)`
    ).join(', ');
  };

  const calculateAgeInMonths = (dateCreation, targetDate) => {
    const creationDate = new Date(dateCreation);
    const target = new Date(targetDate);
    const diffTime = Math.abs(target - creationDate);
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths;
  };

  const getSuggestedLots = (race, desiredAgeMonths, deliveryDate) => {
    const stockInfo = availableStock[race];
    if (!stockInfo || stockInfo.lots.length === 0) return [];
    
    const targetDate = deliveryDate || getTodayISO();
    
    return stockInfo.lots
      .map(lot => {
        const ageAtDelivery = calculateAgeInMonths(lot.date_creation, targetDate);
        const ageDifference = Math.abs(ageAtDelivery - desiredAgeMonths);
        return {
          ...lot,
          ageAtDelivery,
          ageDifference,
          isOptimal: ageDifference <= 0.5 // Optimal si différence de moins de 2 semaines
        };
      })
      .sort((a, b) => a.ageDifference - b.ageDifference);
  };

  const openLotSelection = (animal, race) => {
    setSelectedAnimalForLot(animal);
    setSelectedRaceForLot(race);
    setLotSelectionModal(true);
  };

  const selectLotForRace = (animal, race, lotId, quantity) => {
    const key = `${animal}_${race}`;
    setLotSelections(prev => ({
      ...prev,
      [key]: { lotId, quantity }
    }));
  };

  const getSelectedLotInfo = (animal, race) => {
    const key = `${animal}_${race}`;
    const selection = lotSelections[key];
    if (!selection) return null;
    
    const stockInfo = availableStock[race];
    if (!stockInfo) return null;
    
    const lot = stockInfo.lots.find(l => l.lot_id === selection.lotId);
    return lot ? { ...lot, selectedQuantity: selection.quantity } : null;
  };

  // New functions for enhanced race configuration
  const openRaceConfigModal = (animal) => {
    setSelectedAnimalForConfig(animal);
    setCurrentRaceConfig({
      race: '',
      ageMonths: '',
      ageWeeks: '',
      sexPreference: 'female', // Default to females
      quantity: 1,
      selectedLot: null
    });
    setMultipleRaceConfigs([]); // Reset multiple configs
    setRaceConfigModal(true);
  };

  const getSuggestedLotsForAge = (race, ageMonths, ageWeeks, deliveryDate, requestedQuantity = 0) => {
    const stockInfo = availableStock[race];
    if (!stockInfo || stockInfo.lots.length === 0) return [];
    
    const totalAgeInMonths = parseFloat(ageMonths || 0) + (parseFloat(ageWeeks || 0) / 4.33);
    const targetDate = deliveryDate || getTodayISO();
    
    return stockInfo.lots
      .map(lot => {
        const ageAtDelivery = calculateAgeInMonths(lot.date_creation, targetDate);
        const ageDifference = Math.abs(ageAtDelivery - totalAgeInMonths);
        const remainingAfterOrder = Math.max(0, lot.available - requestedQuantity);
        
        // Convert age difference to months, weeks, and days
        const ageDifferenceInDays = Math.round(ageDifference * 30.44); // Average days per month
        const months = Math.floor(ageDifferenceInDays / 30.44);
        const weeks = Math.floor((ageDifferenceInDays % 30.44) / 7);
        const days = Math.round(ageDifferenceInDays % 7);
        
        let ageDifferenceText = '';
        if (months > 0) ageDifferenceText += `${months} mois `;
        if (weeks > 0) ageDifferenceText += `${weeks} semaines `;
        if (days > 0) ageDifferenceText += `${days} jours`;
        if (ageDifferenceText === '') ageDifferenceText = '0 jours';
        
        return {
          ...lot,
          ageAtDelivery,
          ageDifference,
          ageDifferenceText: ageDifferenceText.trim(),
          remainingAfterOrder,
          isOptimal: ageDifference <= 0.5 // Optimal if difference is less than 2 weeks
        };
      })
      .sort((a, b) => a.ageDifference - b.ageDifference);
  };

  const saveRaceConfiguration = () => {
    if (!currentRaceConfig.race || !currentRaceConfig.quantity) {
      Alert.alert('Erreur', 'Veuillez sélectionner une race et une quantité');
      return;
    }

    const animal = selectedAnimalForConfig;
    
    // Check if this exact race + sex combination already exists in current modal
    const exactConfigExists = multipleRaceConfigs.some(config => 
      config.race === currentRaceConfig.race && config.sexPreference === currentRaceConfig.sexPreference
    );
    
    if (exactConfigExists) {
      Alert.alert('Erreur', 'Cette combinaison race + sexe a déjà été ajoutée');
      return;
    }

    // Auto-select the closest lot if no lot is chosen
    let configWithLot = { ...currentRaceConfig };
    if (!configWithLot.selectedLot) {
      const suggestedLots = getSuggestedLotsForAge(
        currentRaceConfig.race, 
        currentRaceConfig.ageMonths, 
        currentRaceConfig.ageWeeks, 
        orderForm.deliveryDate,
        currentRaceConfig.quantity || 0
      );
      if (suggestedLots.length > 0) {
        configWithLot.selectedLot = suggestedLots[0]; // Take the first (most optimal) lot
      }
    }

    const newRaceConfig = {
      ...configWithLot,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // More unique ID
    };

    // Add to multiple configs array
    setMultipleRaceConfigs(prev => [...prev, newRaceConfig]);

    // Reset current config for next addition
    setCurrentRaceConfig({
      race: currentRaceConfig.race, // Keep the same race
      ageMonths: currentRaceConfig.ageMonths, // Keep the same age
      ageWeeks: currentRaceConfig.ageWeeks, // Keep the same age
      sexPreference: currentRaceConfig.sexPreference === 'female' ? 'male' : 'female', // Switch to other sex
      quantity: 1, // Reset quantity
      selectedLot: null
    });
  };

  const saveAllRaceConfigurations = () => {
    // Always save the current configuration first (if valid)
    if (!currentRaceConfig.race || !currentRaceConfig.quantity) {
      Alert.alert('Erreur', 'Veuillez sélectionner une race et une quantité');
      return;
    }

    // Auto-select the closest lot if no lot is chosen for current config
    let configWithLot = { ...currentRaceConfig };
    if (!configWithLot.selectedLot) {
      const suggestedLots = getSuggestedLotsForAge(
        currentRaceConfig.race, 
        currentRaceConfig.ageMonths, 
        currentRaceConfig.ageWeeks, 
        orderForm.deliveryDate,
        currentRaceConfig.quantity || 0
      );
      if (suggestedLots.length > 0) {
        configWithLot.selectedLot = suggestedLots[0]; // Take the first (most optimal) lot
      }
    }

    const animal = selectedAnimalForConfig;
    const existingRaces = orderForm.animalDetails[animal]?.races || [];
    
    // Combine current config with any previously added configs
    const allConfigsToSave = [
      ...multipleRaceConfigs,
      { ...configWithLot, id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }
    ];
    
    // Check for conflicts with existing configurations
    const conflicts = allConfigsToSave.filter(newConfig => 
      existingRaces.some(existing => 
        existing.race === newConfig.race && existing.sexPreference === newConfig.sexPreference
      )
    );

    if (conflicts.length > 0) {
      Alert.alert('Erreur', 'Certaines configurations existent déjà');
      return;
    }

    const newDetails = {
      ...orderForm.animalDetails,
      [animal]: {
        ...orderForm.animalDetails[animal],
        races: [...existingRaces, ...allConfigsToSave]
      }
    };

    setOrderForm({
      ...orderForm,
      animalDetails: newDetails
    });

    setRaceConfigModal(false);
  };

  const removeRaceConfiguration = (animal, raceConfigId) => {
    const newDetails = {
      ...orderForm.animalDetails,
      [animal]: {
        ...orderForm.animalDetails[animal],
        races: orderForm.animalDetails[animal].races.filter(config => config.id !== raceConfigId)
      }
    };

    setOrderForm({
      ...orderForm,
      animalDetails: newDetails
    });
  };

  const removeModalRaceConfiguration = (configId) => {
    setMultipleRaceConfigs(prev => prev.filter(config => config.id !== configId));
  };

  const updateRaceConfigQuantity = (animal, raceConfigId, newQuantity) => {
    const newDetails = {
      ...orderForm.animalDetails,
      [animal]: {
        ...orderForm.animalDetails[animal],
        races: orderForm.animalDetails[animal].races.map(config => 
          config.id === raceConfigId ? { ...config, quantity: newQuantity } : config
        )
      }
    };

    setOrderForm({
      ...orderForm,
      animalDetails: newDetails
    });
  };

  const saveOrder = async () => {
    if (!orderForm.customerName) {
      Alert.alert('Erreur', 'Veuillez remplir le nom du client');
      return;
    }

    const orderId = editingOrder ? editingOrder.id : Date.now();
    const newOrder = {
      id: orderId,
      orderType: orderForm.orderType,
      selectedAnimals: orderForm.selectedAnimals,
      animalDetails: orderForm.animalDetails,
      ageMonths: orderForm.ageMonths,
      ageWeeks: orderForm.ageWeeks,
      customerName: orderForm.customerName,
      customerPhone: orderForm.customerPhone,
      customerEmail: orderForm.customerEmail,
      otherDetails: orderForm.otherDetails,
      product: orderForm.product,
      quantity: orderForm.quantity ? parseInt(orderForm.quantity) : null,
      totalPrice: orderForm.totalPrice ? parseFloat(orderForm.totalPrice) : 0,
      deliveryDate: toISODate(orderForm.deliveryDate),
      status: orderForm.status,
      orderDate: editingOrder ? editingOrder.orderDate : getTodayISO()
    };

    // Save pricing data to database
    try {
      const pricingData = {
        calculatedPrice: calculatedPrice,
        priceAdjustment: parseFloat(priceAdjustment || 0),
        finalPrice: parseFloat(orderForm.totalPrice || 0),
        priceBreakdown: priceBreakdown,
        calculationDate: new Date().toISOString()
      };
      await database.saveOrderPricing(orderId, pricingData);
    } catch (error) {
      console.error('Error saving pricing data:', error);
    }

    onSaveOrder(newOrder, !!editingOrder);
    navigation.goBack();
  };

  const isFormValid = orderForm.customerName && orderForm.orderType;

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
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>
              {editingOrder ? 'Modifier la commande' : 'Nouvelle Commande'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.saveButton,
              !isFormValid && styles.saveButtonDisabled
            ]}
            onPress={saveOrder}
            disabled={!isFormValid}
          >
            <Text style={[
              styles.saveButtonText,
              !isFormValid && styles.saveButtonTextDisabled
            ]}>
              {editingOrder ? 'Modifier' : 'Créer'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
        {/* Order Type Dropdown */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>Type de commande *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dropdownOptions}>
              {orderTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.dropdownOption,
                    { backgroundColor: orderForm.orderType === type ? '#005F6B' : '#f0f0f0' }
                  ]}
                  onPress={() => setOrderForm({...orderForm, orderType: type})}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    orderForm.orderType === type && { color: 'white' }
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Adoption-specific fields */}
        {orderForm.orderType === 'Adoption' && (
          <>
            {/* Pour quand? */}
            <View style={styles.dateContainer}>
              <Text style={styles.dropdownLabel}>Pour quand?</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setCalendarModal(true)}
              >
                <Text style={styles.datePickerText}>
                  {orderForm.deliveryDate ? 
                    formatForCalendar(orderForm.deliveryDate) : 
                    '📅 Sélectionner une date'
                  }
                </Text>
              </TouchableOpacity>
            </View>

            {/* Animal Types Selection */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Types d'animaux (sélection multiple)</Text>
              <View style={styles.multiSelectContainer}>
                {animalTypes.map((animal) => (
                  <TouchableOpacity
                    key={animal}
                    style={[
                      styles.characteristicOption,
                      orderForm.selectedAnimals.includes(animal) && styles.characteristicOptionSelected
                    ]}
                    onPress={() => toggleAnimalSelection(animal)}
                  >
                    <Text style={[
                      styles.characteristicOptionText,
                      orderForm.selectedAnimals.includes(animal) && styles.characteristicOptionTextSelected
                    ]}>
                      {orderForm.selectedAnimals.includes(animal) ? '✓ ' : ''}{animal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Animal Quantities */}
            {orderForm.selectedAnimals.map((animal) => (
              <View key={animal} style={styles.animalSection}>
                <View style={styles.animalSectionHeader}>
                  <TouchableOpacity 
                    style={styles.expandButton}
                    onPress={() => toggleAnimalExpansion(animal)}
                  >
                    <Text style={styles.expandButtonText}>
                      {expandedAnimals[animal] ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.animalSectionTitle}>
                    🐓 {animal.charAt(0).toUpperCase() + animal.slice(1)} ({getAnimalTotalQuantity(animal)})
                  </Text>
                </View>
                
                {/* Expandable content */}
                {expandedAnimals[animal] && (
                  <>
                    {/* Add Race Configuration Button */}
                    <TouchableOpacity 
                      style={styles.addRaceButton}
                      onPress={() => openRaceConfigModal(animal)}
                    >
                      <Text style={styles.addRaceButtonText}>
                        ➕ Ajouter une race
                      </Text>
                    </TouchableOpacity>

                    {/* Display configured races grouped by race */}
                    {Object.entries(getRaceConfigurationsByRace(animal)).map(([raceName, raceConfigs]) => (
                      <View key={raceName} style={styles.raceConfigContainer}>
                        <View style={styles.raceConfigHeader}>
                          <Text style={styles.raceConfigTitle}>
                            {raceName} - {getRaceTotalQuantity(raceConfigs)} en total
                          </Text>
                          <TouchableOpacity 
                            style={styles.removeRaceButton}
                            onPress={() => {
                              // Remove all configurations for this race
                              raceConfigs.forEach(config => removeRaceConfiguration(animal, config.id));
                            }}
                          >
                            <Text style={styles.removeRaceButtonText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                        
                        {/* Display each sex preference separately */}
                        {raceConfigs.map((raceConfig) => (
                          <View key={raceConfig.id} style={styles.sexPreferenceCard}>
                            <View style={styles.sexPreferenceHeader}>
                              <Text style={styles.sexPreferenceTitle}>
                                {raceConfig.sexPreference === 'male' ? '♂️ Mâles' :
                                 raceConfig.sexPreference === 'female' ? '♀️ Femelles' : '❓ Peu importe'} - {raceConfig.quantity} unité{raceConfig.quantity > 1 ? 's' : ''}
                              </Text>
                              <TouchableOpacity 
                                style={styles.removeSexPreferenceButton}
                                onPress={() => removeRaceConfiguration(animal, raceConfig.id)}
                              >
                                <Text style={styles.removeSexPreferenceButtonText}>✕</Text>
                              </TouchableOpacity>
                            </View>
                            
                            <View style={styles.sexPreferenceDetails}>
                              <Text style={styles.sexPreferenceDetail}>
                                📅 Âge: {raceConfig.ageMonths || 0} mois {raceConfig.ageWeeks || 0} semaines
                              </Text>
                              {raceConfig.selectedLot && (
                                <Text style={styles.sexPreferenceDetail}>
                                  📦 Lot: {raceConfig.selectedLot.lot_name} 
                                  ({raceConfig.selectedLot.ageAtDelivery?.toFixed(1)} mois)
                                </Text>
                              )}
                            </View>

                            {/* Quantity controls */}
                            <View style={styles.quantityControlsContainer}>
                              <TouchableOpacity 
                                style={styles.quantityButton}
                                onPress={() => {
                                  const current = parseInt(raceConfig.quantity) || 1;
                                  if (current > 1) {
                                    updateRaceConfigQuantity(animal, raceConfig.id, current - 1);
                                  }
                                }}
                              >
                                <Text style={styles.quantityButtonText}>-</Text>
                              </TouchableOpacity>
                              <TextInput
                                style={[styles.input, styles.quantityInputWithControls]}
                                value={raceConfig.quantity.toString()}
                                onChangeText={(text) => updateRaceConfigQuantity(animal, raceConfig.id, parseInt(text) || 1)}
                                keyboardType="number-pad"
                              />
                              <TouchableOpacity 
                                style={styles.quantityButton}
                                onPress={() => {
                                  const current = parseInt(raceConfig.quantity) || 1;
                                  updateRaceConfigQuantity(animal, raceConfig.id, current + 1);
                                }}
                              >
                                <Text style={styles.quantityButtonText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    ))}

                    {/* Pricing Section for this animal */}
                    {getAnimalTotalQuantity(animal) > 0 && (
                      <View style={styles.animalPricingSection}>
                        <Text style={styles.animalPricingTitle}>💰 Calcul du prix - {animal}</Text>
                        
                        {!pricingGridAvailable ? (
                          <View style={styles.noPricingGridContainer}>
                            <Text style={styles.noPricingGridText}>
                              ⚠️ Aucune grille tarifaire configurée pour {animal}
                            </Text>
                            <TouchableOpacity 
                              style={styles.goToPricingButton}
                              onPress={() => navigation.navigate('Gestion')}
                            >
                              <Text style={styles.goToPricingButtonText}>
                                📊 Configurer la grille tarifaire
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.animalPricingContent}>
                            <Text style={styles.animalPricingSubtotal}>
                              Sous-total {animal}: {getAnimalSpecificPrice(animal).toFixed(2)} €
                            </Text>
                            <Text style={styles.animalPricingBreakdown}>
                              Basé sur {getAnimalTotalQuantity(animal)} {animal} configuré(s)
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            ))}

          </>
        )}

        {/* Other order types fields */}
        {orderForm.orderType !== 'Adoption' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Produit *"
              value={orderForm.product}
              onChangeText={(text) => setOrderForm({...orderForm, product: text})}
            />
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Quantité *</Text>
              <View style={styles.quantityControlsContainer}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => {
                    const current = parseInt(orderForm.quantity) || 0;
                    if (current > 0) {
                      setOrderForm({...orderForm, quantity: (current - 1).toString()});
                    }
                  }}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.quantityInputWithControls]}
                  placeholder="1"
                  value={orderForm.quantity}
                  onChangeText={(text) => setOrderForm({...orderForm, quantity: text})}
                  keyboardType="number-pad"
                />
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => {
                    const current = parseInt(orderForm.quantity) || 0;
                    setOrderForm({...orderForm, quantity: (current + 1).toString()});
                  }}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Common client information */}
        <Text style={styles.sectionTitle}>Informations client</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Nom/Prénom *"
          value={orderForm.customerName}
          onChangeText={(text) => setOrderForm({...orderForm, customerName: text})}
        />

        <TextInput
          style={styles.input}
          placeholder="Contact direct (tél, msg)"
          value={orderForm.customerPhone}
          onChangeText={(text) => setOrderForm({...orderForm, customerPhone: text})}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Mail (optionnel)"
          value={orderForm.customerEmail}
          onChangeText={(text) => setOrderForm({...orderForm, customerEmail: text})}
          keyboardType="email-address"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Autres précisions"
          value={orderForm.otherDetails}
          onChangeText={(text) => setOrderForm({...orderForm, otherDetails: text})}
          multiline={true}
          numberOfLines={3}
        />

        {/* Total Price Preview */}
        <View style={styles.totalPricePreview}>
          <Text style={styles.totalPricePreviewLabel}>Prix total estimé:</Text>
          <Text style={styles.totalPricePreviewValue}>
            {orderForm.totalPrice || '0.00'} €
          </Text>
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>💰 Calcul du prix</Text>
          
          {!pricingGridAvailable ? (
            <View style={styles.noPricingGridContainer}>
              <Text style={styles.noPricingGridText}>
                ⚠️ Aucune grille tarifaire configurée
              </Text>
              <Text style={styles.noPricingGridSubtext}>
                Veuillez configurer la grille tarifaire dans la section "Productions" pour calculer automatiquement les prix.
              </Text>
              <TouchableOpacity 
                style={styles.goToPricingButton}
                onPress={() => navigation.navigate('Gestion')}
              >
                <Text style={styles.goToPricingButtonText}>
                  📊 Configurer la grille tarifaire
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Calculated Price Display */}
              <View style={styles.calculatedPriceContainer}>
                <Text style={styles.calculatedPriceLabel}>Prix calculé:</Text>
                <Text style={styles.calculatedPriceValue}>
                  {calculatedPrice.toFixed(2)} €
                </Text>
              </View>

              {/* Price Adjustment */}
              <View style={styles.priceAdjustmentContainer}>
                <Text style={styles.priceAdjustmentLabel}>Ajustement (+ ou -):</Text>
                <View style={styles.priceAdjustmentInputContainer}>
                  <TextInput
                    style={[styles.input, styles.priceAdjustmentInput]}
                    placeholder="0.00"
                    value={priceAdjustment.toString()}
                    onChangeText={(text) => {
                      setPriceAdjustment(text);
                      const adjustment = parseFloat(text || 0);
                      const finalPrice = calculatedPrice + adjustment;
                      setOrderForm({...orderForm, totalPrice: finalPrice.toFixed(2)});
                    }}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.currencySymbol}>€</Text>
                </View>
              </View>

              {/* Final Price Display */}
              <View style={styles.finalPriceContainer}>
                <Text style={styles.finalPriceLabel}>Prix total final:</Text>
                <Text style={styles.finalPriceValue}>
                  {orderForm.totalPrice || '0.00'} €
                </Text>
              </View>

              {/* Price Breakdown Toggle */}
              {priceBreakdown.length > 0 && (
                <TouchableOpacity 
                  style={styles.priceBreakdownToggle}
                  onPress={() => setShowPriceBreakdown(!showPriceBreakdown)}
                >
                  <Text style={styles.priceBreakdownToggleText}>
                    {showPriceBreakdown ? '▼' : '▶'} Détail du calcul
                  </Text>
                </TouchableOpacity>
              )}

              {/* Price Breakdown Details */}
              {showPriceBreakdown && priceBreakdown.length > 0 && (
                <View style={styles.priceBreakdownContainer}>
                  {priceBreakdown.map((item, index) => (
                    <View key={index} style={styles.priceBreakdownItem}>
                      {item.animalType ? (
                        // Adoption order breakdown
                        <>
                          <Text style={styles.priceBreakdownItemTitle}>
                            {item.animalType} - {item.race} ({item.sexPreference === 'male' ? '♂️' : item.sexPreference === 'female' ? '♀️' : '❓'})
                          </Text>
                          <Text style={styles.priceBreakdownItemDetails}>
                            {item.quantity} × {item.costPerAnimal}€ = {item.configTotal}€
                          </Text>
                          <Text style={styles.priceBreakdownItemAge}>
                            Âge: {item.ageMonths.toFixed(1)} mois
                          </Text>
                          <Text style={styles.priceBreakdownItemSource}>
                            Source: {item.pricingSource}
                          </Text>
                        </>
                      ) : (
                        // Product order breakdown
                        <>
                          <Text style={styles.priceBreakdownItemTitle}>
                            {item.product}
                          </Text>
                          <Text style={styles.priceBreakdownItemDetails}>
                            {item.quantity} {item.unit} × {item.unitPrice}€ = {item.total}€
                          </Text>
                          <Text style={styles.priceBreakdownItemSource}>
                            Source: {item.pricingSource}
                          </Text>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {orderForm.orderType !== 'Adoption' && (
          <View style={styles.dateContainer}>
            <Text style={styles.dropdownLabel}>Date de livraison</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setCalendarModal(true)}
            >
              <Text style={styles.datePickerText}>
                {orderForm.deliveryDate ? 
                  new Date(orderForm.deliveryDate).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 
                  '📅 Sélectionner une date'
                }
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statusSelector}>
          <Text style={styles.statusSelectorLabel}>Statut de la commande:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusOptionsContainer}
          >
            <View style={styles.statusOptions}>
              {orderStatuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    { backgroundColor: orderForm.status === status ? getStatusColor(status) : '#f0f0f0' }
                  ]}
                  onPress={() => setOrderForm({...orderForm, status})}
                >
                  <Text style={[
                    styles.statusOptionText,
                    orderForm.status === status && { color: 'white' }
                  ]}>
                    {getStatusIcon(status)} {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Bottom padding for scroll */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal de sélection de lots */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={lotSelectionModal}
        onRequestClose={() => setLotSelectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Choisir le lot pour {selectedRaceForLot}
            </Text>
            <Text style={styles.modalSubtitle}>
              Âge souhaité: {orderForm.ageMonths} mois {orderForm.ageWeeks} semaines
            </Text>
            <Text style={styles.modalSubtitle}>
              Livraison prévue: {orderForm.deliveryDate || 'Non définie'}
            </Text>

            <ScrollView style={styles.lotsList}>
              {selectedRaceForLot && getSuggestedLots(
                selectedRaceForLot, 
                parseInt(orderForm.ageMonths) || 0,
                orderForm.deliveryDate
              ).map((lot) => (
                <TouchableOpacity
                  key={lot.lot_id}
                  style={[
                    styles.lotOption,
                    lot.isOptimal && styles.lotOptionOptimal
                  ]}
                  onPress={() => {
                    selectLotForRace(
                      selectedAnimalForLot, 
                      selectedRaceForLot, 
                      lot.lot_id,
                      parseInt(orderForm.animalDetails[selectedAnimalForLot]?.races[selectedRaceForLot]) || 0
                    );
                    setLotSelectionModal(false);
                  }}
                >
                  <View style={styles.lotOptionHeader}>
                    <Text style={styles.lotOptionName}>
                      {lot.isOptimal ? '⭐ ' : ''}{lot.lot_name}
                    </Text>
                    <Text style={[
                      styles.lotOptionAge,
                      { color: lot.isOptimal ? '#4CAF50' : '#666' }
                    ]}>
                      {lot.ageAtDelivery} mois
                    </Text>
                  </View>
                  <Text style={styles.lotOptionDetails}>
                    📦 {lot.available} disponibles
                  </Text>
                  <Text style={styles.lotOptionDetails}>
                    📅 Créé le: {lot.date_creation}
                  </Text>
                  <Text style={styles.lotOptionDetails}>
                    🎯 Différence d'âge: {lot.ageDifference.toFixed(1)} mois
                  </Text>
                  {lot.isOptimal && (
                    <Text style={styles.optimalBadge}>
                      ✅ Âge optimal pour votre commande
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setLotSelectionModal(false)}
              >
                <Text style={styles.modalBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={calendarModal}
        onRequestClose={() => setCalendarModal(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Sélectionner une date</Text>
              <TouchableOpacity 
                style={styles.calendarCloseBtn}
                onPress={() => setCalendarModal(false)}
              >
                <Text style={styles.calendarCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.calendarSubtitle}>
              Les points verts indiquent des événements du calendrier
            </Text>
            
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={getMarkedDates()}
              markingType={'multi-dot'}
              minDate={getTodayISO()}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#005F6B',
                selectedDayBackgroundColor: '#005F6B',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#005F6B',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: '#4CAF50',
                selectedDotColor: '#ffffff',
                arrowColor: '#005F6B',
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

      {/* Race Configuration Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={raceConfigModal}
        onRequestClose={() => setRaceConfigModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.raceConfigModalContent}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                Configuration de race - {selectedAnimalForConfig}
              </Text>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
              {/* Race Selection */}
              <View style={styles.raceSelectionContainer}>
                <Text style={styles.raceSelectionLabel}>Race *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.raceOptions}>
                    {racesByAnimal[selectedAnimalForConfig]?.map((race) => (
                      <TouchableOpacity
                        key={race}
                        style={[
                          styles.raceOption,
                          { backgroundColor: currentRaceConfig.race === race ? '#005F6B' : '#f0f0f0' }
                        ]}
                        onPress={() => setCurrentRaceConfig({...currentRaceConfig, race})}
                      >
                        <Text style={[
                          styles.raceOptionText,
                          currentRaceConfig.race === race && { color: 'white' }
                        ]}>
                          {race}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Sex Preference - Moved right after race */}
              <View style={styles.sexSelectionContainer}>
                <Text style={styles.sexSelectionLabel}>Préférence de sexe</Text>
                <View style={styles.sexOptions}>
                  {[
                    { key: 'female', label: 'Femelles', icon: '♀️' },
                    { key: 'male', label: 'Mâles', icon: '♂️' },
                    { key: 'any', label: 'Peu importe', icon: '🐓' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.sexOption,
                        { backgroundColor: currentRaceConfig.sexPreference === option.key ? '#005F6B' : '#f0f0f0' }
                      ]}
                      onPress={() => setCurrentRaceConfig({...currentRaceConfig, sexPreference: option.key})}
                    >
                      <Text style={[
                        styles.sexOptionText,
                        currentRaceConfig.sexPreference === option.key && { color: 'white' }
                      ]}>
                        {option.icon} {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Age and Quantity in same line */}
              <View style={styles.ageQuantityContainer}>
                <View style={styles.ageInputGroup}>
                  <Text style={styles.ageLabel}>Mois</Text>
                  <View style={styles.compactQuantityControls}>
                    <TouchableOpacity 
                      style={styles.compactQuantityButton}
                      onPress={() => {
                        const current = parseInt(currentRaceConfig.ageMonths) || 0;
                        if (current > 0) {
                          setCurrentRaceConfig({...currentRaceConfig, ageMonths: (current - 1).toString()});
                        }
                      }}
                    >
                      <Text style={styles.compactQuantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.compactInput}
                      placeholder="0"
                      value={currentRaceConfig.ageMonths}
                      onChangeText={(text) => setCurrentRaceConfig({...currentRaceConfig, ageMonths: text})}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity 
                      style={styles.compactQuantityButton}
                      onPress={() => {
                        const current = parseInt(currentRaceConfig.ageMonths) || 0;
                        setCurrentRaceConfig({...currentRaceConfig, ageMonths: (current + 1).toString()});
                      }}
                    >
                      <Text style={styles.compactQuantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.ageInputGroup}>
                  <Text style={styles.ageLabel}>Semaines</Text>
                  <View style={styles.compactQuantityControls}>
                    <TouchableOpacity 
                      style={styles.compactQuantityButton}
                      onPress={() => {
                        const current = parseInt(currentRaceConfig.ageWeeks) || 0;
                        if (current > 0) {
                          setCurrentRaceConfig({...currentRaceConfig, ageWeeks: (current - 1).toString()});
                        }
                      }}
                    >
                      <Text style={styles.compactQuantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.compactInput}
                      placeholder="0"
                      value={currentRaceConfig.ageWeeks}
                      onChangeText={(text) => setCurrentRaceConfig({...currentRaceConfig, ageWeeks: text})}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity 
                      style={styles.compactQuantityButton}
                      onPress={() => {
                        const current = parseInt(currentRaceConfig.ageWeeks) || 0;
                        setCurrentRaceConfig({...currentRaceConfig, ageWeeks: (current + 1).toString()});
                      }}
                    >
                      <Text style={styles.compactQuantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.ageInputGroup}>
                  <Text style={styles.ageLabel}>Quantité</Text>
                  <View style={styles.compactQuantityControls}>
                    <TouchableOpacity 
                      style={styles.compactQuantityButton}
                      onPress={() => {
                        const current = parseInt(currentRaceConfig.quantity) || 1;
                        if (current > 1) {
                          setCurrentRaceConfig({...currentRaceConfig, quantity: current - 1});
                        }
                      }}
                    >
                      <Text style={styles.compactQuantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.compactInput}
                      value={currentRaceConfig.quantity.toString()}
                      onChangeText={(text) => setCurrentRaceConfig({...currentRaceConfig, quantity: parseInt(text) || 1})}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity 
                      style={styles.compactQuantityButton}
                      onPress={() => {
                        const current = parseInt(currentRaceConfig.quantity) || 1;
                        setCurrentRaceConfig({...currentRaceConfig, quantity: current + 1});
                      }}
                    >
                      <Text style={styles.compactQuantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Suggested Lots */}
              {currentRaceConfig.race && (currentRaceConfig.ageMonths || currentRaceConfig.ageWeeks) && (
                <View style={styles.suggestedLotsContainer}>
                  <Text style={styles.suggestedLotsLabel}>Lots suggérés:</Text>
                  <View style={styles.suggestedLotsList}>
                    {getSuggestedLotsForAge(
                      currentRaceConfig.race, 
                      currentRaceConfig.ageMonths, 
                      currentRaceConfig.ageWeeks, 
                      orderForm.deliveryDate,
                      currentRaceConfig.quantity || 0
                    ).slice(0, 3).map((lot) => (
                      <TouchableOpacity
                        key={lot.lot_id}
                        style={[
                          styles.suggestedLotOption,
                          lot.isOptimal && styles.suggestedLotOptionOptimal,
                          currentRaceConfig.selectedLot?.lot_id === lot.lot_id && styles.suggestedLotOptionSelected
                        ]}
                        onPress={() => setCurrentRaceConfig({...currentRaceConfig, selectedLot: lot})}
                      >
                        <View style={styles.suggestedLotHeader}>
                          <Text style={styles.suggestedLotName}>
                            {lot.isOptimal ? '⭐ ' : ''}{lot.lot_name}
                          </Text>
                          <Text style={[
                            styles.suggestedLotAge,
                            { color: lot.isOptimal ? '#4CAF50' : '#666' }
                          ]}>
                            Ils auraient {lot.ageAtDelivery.toFixed(1)} mois
                          </Text>
                        </View>
                        <Text style={styles.suggestedLotDetails}>
                          📦 {lot.available} disponibles
                          {currentRaceConfig.quantity > 0 && (
                            <Text style={styles.remainingStockText}>
                              {' '}→ il en resterait {lot.remainingAfterOrder}
                            </Text>
                          )}
                        </Text>
                        <Text style={styles.suggestedLotDetails}>
                          🎯 Différence: {lot.ageDifferenceText}
                        </Text>
                        {lot.isOptimal && (
                          <Text style={styles.optimalBadge}>
                            ✅ Âge optimal
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Show Added Configurations */}
              {multipleRaceConfigs.length > 0 && (
                <View style={styles.addedConfigsContainer}>
                  <Text style={styles.addedConfigsTitle}>Configurations ajoutées:</Text>
                  {multipleRaceConfigs.map((config) => (
                    <View key={config.id} style={styles.addedConfigCard}>
                      <View style={styles.addedConfigHeader}>
                        <Text style={styles.addedConfigTitle}>
                          {config.race} - {config.quantity} unités - {
                            config.sexPreference === 'male' ? '♂️ Mâles' :
                            config.sexPreference === 'female' ? '♀️ Femelles' : '❓ Peu importe'
                          }
                        </Text>
                        <TouchableOpacity 
                          style={styles.removeAddedConfigButton}
                          onPress={() => removeModalRaceConfiguration(config.id)}
                        >
                          <Text style={styles.removeAddedConfigButtonText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.addedConfigDetail}>
                        📅 Âge: {config.ageMonths || 0} mois {config.ageWeeks || 0} semaines
                      </Text>
                      {config.selectedLot && (
                        <Text style={styles.addedConfigDetail}>
                          📦 Lot: {config.selectedLot.lot_name} ({config.selectedLot.ageAtDelivery?.toFixed(1)} mois)
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Add Another Preference Option - Always show when race is selected */}
              {currentRaceConfig.race && (
                <View style={styles.addAnotherPreferenceContainer}>
                  <TouchableOpacity 
                    style={styles.addAnotherPreferenceButton}
                    onPress={saveRaceConfiguration}
                  >
                    <Text style={styles.addAnotherPreferenceText}>
                      ➕ Ajouter autre préférence pour {currentRaceConfig.race}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions - Always visible at bottom */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setRaceConfigModal(false)}
              >
                <Text style={styles.modalBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveAllRaceConfigurations}
              >
                <Text style={[styles.modalBtnText, { color: 'white' }]}>
                  {multipleRaceConfigs.length > 0 ? `Ajouter ${multipleRaceConfigs.length + 1} config(s)` : 'Ajouter cette configuration'}
                </Text>
              </TouchableOpacity>
            </View>
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
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: '#005F6B',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  dropdownOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  dropdownOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateContainer: {
    marginBottom: 20,
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
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  characteristicOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  characteristicOptionSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  characteristicOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  characteristicOptionTextSelected: {
    color: 'white',
  },
  animalSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#005F6B',
  },
  animalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  expandButton: {
    marginRight: 10,
    padding: 5,
  },
  expandButtonText: {
    fontSize: 16,
    color: '#005F6B',
    fontWeight: 'bold',
  },
  animalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
    flex: 1,
  },
  raceContainer: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  raceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  raceName: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  stockStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  lotInfo: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
    maxWidth: 150,
    textAlign: 'right',
  },
  selectedLotInfo: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
    maxWidth: 150,
    textAlign: 'right',
  },
  lotSelectionButton: {
    backgroundColor: '#005F6B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  lotSelectionButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  lotsList: {
    maxHeight: 400,
    marginVertical: 15,
  },
  lotOption: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lotOptionOptimal: {
    backgroundColor: '#f0f8f0',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  lotOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  lotOptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  lotOptionAge: {
    fontSize: 14,
    fontWeight: '600',
  },
  lotOptionDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  optimalBadge: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 5,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  modalBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
  quantityControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quantityButton: {
    backgroundColor: '#005F6B',
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityInputWithControls: {
    flex: 1,
    marginHorizontal: 8,
    textAlign: 'center',
    marginBottom: 0,
  },
  ageContainer: {
    marginBottom: 20,
  },
  ageInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  ageInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  ageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  ageInputWithControls: {
    marginBottom: 0,
    textAlign: 'center',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005F6B',
    marginTop: 20,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#005F6B',
    paddingBottom: 5,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  statusSelector: {
    marginBottom: 20,
  },
  statusSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  statusOptionsContainer: {
    paddingHorizontal: 0,
    minWidth: '100%',
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 0,
  },
  statusOption: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 50,
  },
  // Calendar Modal Styles
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 15,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  calendarCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCloseBtnText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  calendarSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  calendarCancelBtn: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  calendarCancelBtnText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  // New styles for enhanced race configuration
  addRaceButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  addRaceButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  raceConfigContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  raceConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  raceConfigTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  removeRaceButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeRaceButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  raceConfigDetails: {
    marginBottom: 8,
  },
  raceConfigDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  raceConfigModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '95%',
    height: '85%',
    flexDirection: 'column',
  },
  modalTitleContainer: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalScrollView: {
    flex: 1,
    padding: 16,
    paddingBottom: 0,
  },
  raceSelectionContainer: {
    marginBottom: 16,
  },
  raceSelectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  raceOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  raceOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  raceOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ageSelectionContainer: {
    marginBottom: 16,
  },
  ageSelectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  ageInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ageInputGroup: {
    flex: 1,
  },
  sexSelectionContainer: {
    marginBottom: 16,
  },
  sexSelectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sexOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  sexOption: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  sexOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quantitySelectionContainer: {
    marginBottom: 16,
  },
  quantitySelectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  suggestedLotsContainer: {
    marginBottom: 16,
  },
  suggestedLotsLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  suggestedLotsList: {
    // Remove maxHeight to allow natural flow within scrollable modal
  },
  suggestedLotOption: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestedLotOptionOptimal: {
    backgroundColor: '#f0f8f0',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  suggestedLotOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  suggestedLotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  suggestedLotName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  suggestedLotAge: {
    fontSize: 12,
    fontWeight: '600',
  },
  suggestedLotDetails: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  remainingStockText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
  },
  // Compact styles for better modal ergonomics
  compactQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  compactQuantityButton: {
    backgroundColor: '#005F6B',
    borderRadius: 4,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactQuantityButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  compactInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 6,
    fontSize: 14,
    backgroundColor: 'white',
    textAlign: 'center',
    minWidth: 40,
    maxWidth: 60,
  },
  // New styles for age and quantity in same line
  ageQuantityContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  // Styles for add another preference
  addAnotherPreferenceContainer: {
    marginBottom: 16,
  },
  addAnotherPreferenceButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  addAnotherPreferenceText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 14,
  },
  // Styles for added configurations in modal
  addedConfigsContainer: {
    marginBottom: 16,
  },
  addedConfigsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  addedConfigCard: {
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  addedConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addedConfigTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  removeAddedConfigButton: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAddedConfigButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addedConfigDetail: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  // Styles for sex preference cards
  sexPreferenceCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#4CAF50',
  },
  sexPreferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sexPreferenceTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  removeSexPreferenceButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeSexPreferenceButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sexPreferenceDetails: {
    marginBottom: 6,
  },
  sexPreferenceDetail: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  // Pricing section styles
  pricingSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  calculatedPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f8f0',
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  calculatedPriceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  calculatedPriceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  priceAdjustmentContainer: {
    marginBottom: 12,
  },
  priceAdjustmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  priceAdjustmentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceAdjustmentInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
    textAlign: 'center',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  finalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  finalPriceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  finalPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  priceBreakdownToggle: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  priceBreakdownToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  priceBreakdownContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  priceBreakdownItem: {
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  priceBreakdownItemTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  priceBreakdownItemDetails: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  priceBreakdownItemAge: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  priceBreakdownItemSource: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  // No pricing grid styles
  noPricingGridContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  noPricingGridText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  noPricingGridSubtext: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 12,
  },
  goToPricingButton: {
    backgroundColor: '#ffc107',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  goToPricingButtonText: {
    color: '#856404',
    fontWeight: '600',
    fontSize: 14,
  },
  // Animal pricing section styles
  animalPricingSection: {
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  animalPricingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  animalPricingContent: {
    alignItems: 'center',
  },
  animalPricingSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  animalPricingBreakdown: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  // Total price preview styles
  totalPricePreview: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  totalPricePreviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalPricePreviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});
