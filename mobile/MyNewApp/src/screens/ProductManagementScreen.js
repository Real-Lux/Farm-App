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
  Animated,
  PanResponder
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import database from '../services/database';
import configService from '../services/configService';
import { toFrenchDate, getTodayISO, toISODate } from '../utils/dateUtils';
import { useDataRefresh } from '../hooks/useDataRefresh';
import { Calendar } from 'react-native-calendars';
import { MONTHS_FR } from '../../constants/DateConstants';

const toLocalISO = (date) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

// EGG_ANIMAL_TYPES will be loaded from database dynamically

export default function ProductManagementScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  // Get initialTab and selectedAnimalType from route params if provided
  const { initialTab, selectedAnimalType: routeSelectedAnimalType } = route?.params || {};
  const [activeTab, setActiveTab] = useState(initialTab || 'productions'); // 'productions' = egg production, 'ventes' = sales, 'activites', 'messagerie'
  const [templateSettingsModal, setTemplateSettingsModal] = useState(false);
  const [selectedAnimalType, setSelectedAnimalType] = useState(routeSelectedAnimalType || 'poussins');
  const [pricingGrids, setPricingGrids] = useState({});
  const [newAnimalTypeModal, setNewAnimalTypeModal] = useState(false);
  const [newAnimalTypeName, setNewAnimalTypeName] = useState('');
  const [copyGridModal, setCopyGridModal] = useState(false);
  const [copyFromAnimalType, setCopyFromAnimalType] = useState(null);
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    quantity: '',
    unit: 'kg',
    category: 'Vegetables',
    description: ''
  });
  
  // Messagerie template messages state
  const [templateMessages, setTemplateMessages] = useState([]);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [messageForm, setMessageForm] = useState({
    title: '',
    category: 'Adoption',
    content: ''
  });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null); // null = all categories
  const [generateMessageModal, setGenerateMessageModal] = useState(false);
  const [selectedTemplateForGeneration, setSelectedTemplateForGeneration] = useState(null);
  const [selectedOrderForGeneration, setSelectedOrderForGeneration] = useState(null);
  const [generatedMessagePreview, setGeneratedMessagePreview] = useState('');
  const [orders, setOrders] = useState([]);
  
  // Egg production state
  const [eggProduction, setEggProduction] = useState({}); // { date: { animalType: count } }
  const [selectedProductionDate, setSelectedProductionDate] = useState(getTodayISO());
  const [productionDateMonth, setProductionDateMonth] = useState(getTodayISO());
  const [productionMonthPickerVisible, setProductionMonthPickerVisible] = useState(false);
  const [productionYearPickerVisible, setProductionYearPickerVisible] = useState(false);
  const [isNavigatingProduction, setIsNavigatingProduction] = useState(false);
  const [expandedEggTypes, setExpandedEggTypes] = useState({}); // Track which egg type status bars are expanded
  const [productionModalVisible, setProductionModalVisible] = useState(false);
  const [productionForm, setProductionForm] = useState({});
  const [singleAnimalModalVisible, setSingleAnimalModalVisible] = useState(false);
  const [singleAnimalType, setSingleAnimalType] = useState(null);
  const [singleAnimalCount, setSingleAnimalCount] = useState('');
  const [singleAnimalRejected, setSingleAnimalRejected] = useState('');
  const singleAnimalInputRef = React.useRef(null);
  const singleAnimalRejectedRef = React.useRef(null);
  const [productionInfoModalVisible, setProductionInfoModalVisible] = useState(false);
  const [eggAnimalTypes, setEggAnimalTypes] = useState([]);
  const [configureAnimalsModalVisible, setConfigureAnimalsModalVisible] = useState(false);
  const [newEggAnimalTypeName, setNewEggAnimalTypeName] = useState('');
  const [newEggAnimalTypeIcon, setNewEggAnimalTypeIcon] = useState('🐔');
  const [selectedAnimalTypeToDelete, setSelectedAnimalTypeToDelete] = useState(null);

  useEffect(() => {
    loadProducts();
    loadPricingGrids();
    loadConfigs();
    // loadTemplateMessages(); // Load on demand when Client tab is accessed
    loadOrders();
    loadEggAnimalTypes();
  }, []);

  // Automatically refresh products when they change anywhere in the app
  useDataRefresh('products', loadProducts);
  useDataRefresh('orders', loadOrders);
  useDataRefresh('messages', loadTemplateMessages);
  useDataRefresh('egg_production', loadEggProduction);

  // Handle initial tab from route params - this should take precedence over saved config
  useEffect(() => {
    if (initialTab && ['productions', 'ventes', 'activites', 'messagerie'].includes(initialTab)) {
      console.log('📦 ProductManagement: Setting activeTab from initialTab:', initialTab);
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Load template messages when client tab is accessed
  useEffect(() => {
    if (activeTab === 'messagerie' && templateMessages.length === 0) {
      loadTemplateMessages();
    }
    
    if (activeTab === 'productions') {
      loadEggProduction();
    }
  }, [activeTab]);

  // Auto-focus input when single animal modal opens
  useEffect(() => {
    if (singleAnimalModalVisible && singleAnimalInputRef.current) {
      // Immediate focus to show keyboard right away
      const timer = setTimeout(() => {
        singleAnimalInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [singleAnimalModalVisible]);

  // Reload when screen comes into focus and check for initialTab and selectedAnimalType
  useFocusEffect(
    React.useCallback(() => {
      // Check route params when screen comes into focus to ensure initialTab is respected
      const routeInitialTab = route?.params?.initialTab;
      if (routeInitialTab && ['productions', 'ventes', 'activites', 'messagerie'].includes(routeInitialTab)) {
        console.log('📦 ProductManagement: Setting activeTab from route params on focus:', routeInitialTab);
        setActiveTab(routeInitialTab);
      }
      // Check for selectedAnimalType in route params
      const routeSelectedAnimalType = route?.params?.selectedAnimalType;
      if (routeSelectedAnimalType) {
        console.log('📦 ProductManagement: Setting selectedAnimalType from route params on focus:', routeSelectedAnimalType);
        setSelectedAnimalType(routeSelectedAnimalType);
        configService.saveProductManagementSelectedAnimalType(routeSelectedAnimalType);
      }
    }, [route?.params?.initialTab, route?.params?.selectedAnimalType])
  );

  const loadConfigs = async () => {
    try {
      const savedActiveTab = await configService.loadProductManagementActiveTab();
      const savedSelectedAnimalType = await configService.loadProductManagementSelectedAnimalType();
      
      // Only set activeTab from saved config if no initialTab was provided via route params
      // initialTab takes precedence over saved config - check route params directly
      const routeInitialTab = route?.params?.initialTab;
      if (!routeInitialTab && savedActiveTab && ['productions', 'ventes', 'activites', 'messagerie'].includes(savedActiveTab)) {
        setActiveTab(savedActiveTab);
      }
      
      // selectedAnimalType from route params takes precedence over saved config
      const routeSelectedAnimalType = route?.params?.selectedAnimalType;
      if (routeSelectedAnimalType) {
        setSelectedAnimalType(routeSelectedAnimalType);
        // Also save it for future use
        await configService.saveProductManagementSelectedAnimalType(routeSelectedAnimalType);
      } else if (savedSelectedAnimalType) {
        setSelectedAnimalType(savedSelectedAnimalType);
      }
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

  const loadPricingGrids = async () => {
    try {
      const savedGrids = await database.getAllPricingGrids();
      if (savedGrids && Object.keys(savedGrids).length > 0) {
        setPricingGrids(savedGrids);
      } else {
        setPricingGrids({});
      }
    } catch (error) {
      console.error('Error loading pricing grids:', error);
      setPricingGrids({});
    }
  };

  // Initialize pricing grid for selectedAnimalType if it doesn't exist (only when coming from route params)
  useEffect(() => {
    const routeSelectedAnimalType = route?.params?.selectedAnimalType;
    if (activeTab === 'ventes' && routeSelectedAnimalType && !pricingGrids[routeSelectedAnimalType]) {
      // Initialize empty pricing grid for this animal type if it came from route params
      const newGrids = { ...pricingGrids };
      newGrids[routeSelectedAnimalType] = [];
      setPricingGrids(newGrids);
      // Optionally auto-open the template settings modal to help user create pricing grid
      // setTemplateSettingsModal(true);
    }
  }, [activeTab, route?.params?.selectedAnimalType]);

  const loadTemplateMessages = async () => {
    try {
      const messages = await database.getTemplateMessages();
      setTemplateMessages(messages);
    } catch (error) {
      console.error('Error loading template messages:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const ordersData = await database.getOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadEggProduction = async () => {
    try {
      // Load egg production data from database
      const productionData = await database.getEggProduction();
      setEggProduction(productionData || {});
    } catch (error) {
      console.error('Error loading egg production:', error);
      setEggProduction({});
    }
  };

  const loadEggAnimalTypes = async () => {
    try {
      const types = await database.getEggAnimalTypes();
      setEggAnimalTypes(types);
    } catch (error) {
      console.error('Error loading egg animal types:', error);
      // Fallback to defaults
      setEggAnimalTypes([
        { key: 'poules', label: 'Poules', icon: '🐔' },
        { key: 'canards', label: 'Canards', icon: '🦆' }
      ]);
    }
  };

  const addEggAnimalType = async () => {
    if (!newEggAnimalTypeName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le type d\'animal');
      return;
    }
    
    const animalTypeKey = newEggAnimalTypeName.toLowerCase().replace(/\s+/g, '_');
    const newType = {
      key: animalTypeKey,
      label: newEggAnimalTypeName.trim(),
      icon: newEggAnimalTypeIcon
    };
    
    try {
      await database.addEggAnimalType(newType);
      await loadEggAnimalTypes();
      setNewEggAnimalTypeName('');
      setNewEggAnimalTypeIcon('🐔');
    } catch (error) {
      console.error('Error adding egg animal type:', error);
      if (error.message.includes('already exists')) {
        Alert.alert('Erreur', 'Ce type d\'animal existe déjà');
      } else {
        Alert.alert('Erreur', 'Impossible d\'ajouter le type d\'animal');
      }
    }
  };

  const deleteEggAnimalType = (animalTypeKey) => {
    Alert.alert(
      'Supprimer le type d\'animal',
      'Êtes-vous sûr de vouloir supprimer ce type d\'animal ? Cette action supprimera également toutes les données de production associées.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await database.deleteEggAnimalType(animalTypeKey);
              await loadEggAnimalTypes();
              // Also remove production data for this animal type
              const updatedProduction = { ...eggProduction };
              Object.keys(updatedProduction).forEach(date => {
                if (updatedProduction[date][animalTypeKey]) {
                  delete updatedProduction[date][animalTypeKey];
                }
              });
              setEggProduction(updatedProduction);
            } catch (error) {
              console.error('Error deleting egg animal type:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le type d\'animal');
            }
          }
        }
      ]
    );
  };

  const saveEggProduction = async (date, animalType, total, rejected = 0) => {
    try {
      await database.saveEggProduction(date, animalType, total, rejected);
      await loadEggProduction();
    } catch (error) {
      console.error('Error saving egg production:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la production');
    }
  };

  const getCurrentProductionMonth = () => {
    return new Date(productionDateMonth).getMonth();
  };

  const getCurrentProductionYear = () => {
    return new Date(productionDateMonth).getFullYear();
  };

  const navigateProductionMonth = async (direction) => {
    if (isNavigatingProduction) return;
    setIsNavigatingProduction(true);
    try {
      const current = new Date(productionDateMonth);
      const target = new Date(current.getFullYear(), current.getMonth() + direction, 15);
      const dateStr = toLocalISO(target);
      setProductionDateMonth(dateStr);
      setSelectedProductionDate(dateStr);
    } catch (error) {
      console.error('Error navigating production month:', error);
    } finally {
      setTimeout(() => setIsNavigatingProduction(false), 350);
    }
  };

  const jumpToProductionMonth = async (monthIndex) => {
    setProductionMonthPickerVisible(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    const current = new Date(productionDateMonth);
    const target = new Date(current.getFullYear(), monthIndex, 1);
    const dateStr = toLocalISO(target);
    setProductionDateMonth(dateStr);
    setSelectedProductionDate(dateStr);
  };

  const jumpToProductionYear = async (year) => {
    const current = new Date(productionDateMonth);
    const target = new Date(year, current.getMonth(), 1);
    const dateStr = toLocalISO(target);
    setProductionDateMonth(dateStr);
    setSelectedProductionDate(dateStr);
    setProductionYearPickerVisible(false);
  };

  const getProductionYearRange = () => {
    const currentYear = getCurrentProductionYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  const getEggProductionForDate = (date) => {
    return eggProduction[date] || {};
  };

  // Helper to get production data (handles both old format: number, and new format: {total, rejected})
  const getProductionData = (productionValue) => {
    if (!productionValue) return { total: 0, rejected: 0, accepted: 0 };
    if (typeof productionValue === 'number') {
      // Old format - backward compatibility
      return { total: productionValue, rejected: 0, accepted: productionValue };
    }
    // New format
    const total = productionValue.total || 0;
    const rejected = productionValue.rejected || 0;
    const accepted = total - rejected;
    return { total, rejected, accepted };
  };

  const getTotalProductionForDate = (date) => {
    const dayData = getEggProductionForDate(date);
    return Object.values(dayData).reduce((sum, value) => {
      const data = getProductionData(value);
      return sum + data.total;
    }, 0);
  };

  const getAcceptedProductionForDate = (date) => {
    const dayData = getEggProductionForDate(date);
    return Object.values(dayData).reduce((sum, value) => {
      const data = getProductionData(value);
      return sum + data.accepted;
    }, 0);
  };

  const getRejectedProductionForDate = (date) => {
    const dayData = getEggProductionForDate(date);
    return Object.values(dayData).reduce((sum, value) => {
      const data = getProductionData(value);
      return sum + data.rejected;
    }, 0);
  };

  const getBestDay = () => {
    let bestDate = null;
    let bestTotal = 0;
    Object.keys(eggProduction).forEach(date => {
      const total = getTotalProductionForDate(date);
      if (total > bestTotal) {
        bestTotal = total;
        bestDate = date;
      }
    });
    if (bestDate) {
      const accepted = getAcceptedProductionForDate(bestDate);
      const rejected = getRejectedProductionForDate(bestDate);
      return { date: bestDate, total: bestTotal, accepted, rejected };
    }
    return null;
  };

  const getYearlyTotal = (year) => {
    let total = 0;
    Object.keys(eggProduction).forEach(date => {
      if (new Date(date).getFullYear() === year) {
        total += getTotalProductionForDate(date);
      }
    });
    return total;
  };

  const getYearlyAccepted = (year) => {
    let accepted = 0;
    Object.keys(eggProduction).forEach(date => {
      if (new Date(date).getFullYear() === year) {
        accepted += getAcceptedProductionForDate(date);
      }
    });
    return accepted;
  };

  const getYearlyRejected = (year) => {
    let rejected = 0;
    Object.keys(eggProduction).forEach(date => {
      if (new Date(date).getFullYear() === year) {
        rejected += getRejectedProductionForDate(date);
      }
    });
    return rejected;
  };

  const getBestMonth = () => {
    const currentYear = getCurrentProductionYear();
    let bestMonth = null;
    let bestTotal = 0;
    let bestAccepted = 0;
    let bestRejected = 0;
    for (let i = 0; i < 12; i++) {
      const monthTotal = getMonthlyTotal(currentYear, i);
      if (monthTotal > bestTotal) {
        bestTotal = monthTotal;
        bestMonth = i;
        // Calculate accepted and rejected for this month
        let monthAccepted = 0;
        let monthRejected = 0;
        Object.keys(eggProduction).forEach(date => {
          const dateObj = new Date(date);
          if (dateObj.getFullYear() === currentYear && dateObj.getMonth() === i) {
            monthAccepted += getAcceptedProductionForDate(date);
            monthRejected += getRejectedProductionForDate(date);
          }
        });
        bestAccepted = monthAccepted;
        bestRejected = monthRejected;
      }
    }
    return bestMonth !== null ? { month: bestMonth, monthName: MONTHS_FR[bestMonth], total: bestTotal, accepted: bestAccepted, rejected: bestRejected } : null;
  };

  const getMonthlyTotal = (year, month) => {
    let total = 0;
    Object.keys(eggProduction).forEach(date => {
      const dateObj = new Date(date);
      if (dateObj.getFullYear() === year && dateObj.getMonth() === month) {
        total += getTotalProductionForDate(date);
      }
    });
    return total;
  };

  const getMonthlyStats = () => {
    const currentYear = getCurrentProductionYear();
    const stats = [];
    for (let i = 0; i < 12; i++) {
      let monthTotal = 0;
      let monthAccepted = 0;
      let monthRejected = 0;
      Object.keys(eggProduction).forEach(date => {
        const dateObj = new Date(date);
        if (dateObj.getFullYear() === currentYear && dateObj.getMonth() === i) {
          monthTotal += getTotalProductionForDate(date);
          monthAccepted += getAcceptedProductionForDate(date);
          monthRejected += getRejectedProductionForDate(date);
        }
      });
      stats.push({
        month: i,
        monthName: MONTHS_FR[i],
        total: monthTotal,
        accepted: monthAccepted,
        rejected: monthRejected
      });
    }
    return stats;
  };

  // Per-animal-type statistics
  const getAnimalTypeTotalForDate = (date, animalType) => {
    const dayData = getEggProductionForDate(date);
    const data = getProductionData(dayData[animalType]);
    return data.total;
  };

  const getAnimalTypeAcceptedForDate = (date, animalType) => {
    const dayData = getEggProductionForDate(date);
    const data = getProductionData(dayData[animalType]);
    return data.accepted;
  };

  const getAnimalTypeRejectedForDate = (date, animalType) => {
    const dayData = getEggProductionForDate(date);
    const data = getProductionData(dayData[animalType]);
    return data.rejected;
  };

  const getAnimalTypeBestDay = (animalType) => {
    let bestDate = null;
    let bestTotal = 0;
    Object.keys(eggProduction).forEach(date => {
      const count = getAnimalTypeTotalForDate(date, animalType);
      if (count > bestTotal) {
        bestTotal = count;
        bestDate = date;
      }
    });
    if (bestDate) {
      const accepted = getAnimalTypeAcceptedForDate(bestDate, animalType);
      const rejected = getAnimalTypeRejectedForDate(bestDate, animalType);
      return { date: bestDate, total: bestTotal, accepted, rejected };
    }
    return null;
  };

  const getAnimalTypeYearlyTotal = (year, animalType) => {
    let total = 0;
    Object.keys(eggProduction).forEach(date => {
      if (new Date(date).getFullYear() === year) {
        total += getAnimalTypeTotalForDate(date, animalType);
      }
    });
    return total;
  };

  const getAnimalTypeYearlyRejected = (year, animalType) => {
    let rejected = 0;
    Object.keys(eggProduction).forEach(date => {
      if (new Date(date).getFullYear() === year) {
        rejected += getAnimalTypeRejectedForDate(date, animalType);
      }
    });
    return rejected;
  };

  const getAnimalTypeBestMonth = (animalType) => {
    const currentYear = getCurrentProductionYear();
    let bestMonth = null;
    let bestTotal = 0;
    let bestAccepted = 0;
    let bestRejected = 0;
    for (let i = 0; i < 12; i++) {
      let monthTotal = 0;
      let monthAccepted = 0;
      let monthRejected = 0;
      Object.keys(eggProduction).forEach(date => {
        const dateObj = new Date(date);
        if (dateObj.getFullYear() === currentYear && dateObj.getMonth() === i) {
          monthTotal += getAnimalTypeTotalForDate(date, animalType);
          monthAccepted += getAnimalTypeAcceptedForDate(date, animalType);
          monthRejected += getAnimalTypeRejectedForDate(date, animalType);
        }
      });
      if (monthTotal > bestTotal) {
        bestTotal = monthTotal;
        bestAccepted = monthAccepted;
        bestRejected = monthRejected;
        bestMonth = i;
      }
    }
    return bestMonth !== null ? { month: bestMonth, monthName: MONTHS_FR[bestMonth], total: bestTotal, accepted: bestAccepted, rejected: bestRejected } : null;
  };

  const getAnimalTypeMonthlyStats = (animalType) => {
    const currentYear = getCurrentProductionYear();
    const stats = [];
    for (let i = 0; i < 12; i++) {
      let monthTotal = 0;
      let monthAccepted = 0;
      let monthRejected = 0;
      Object.keys(eggProduction).forEach(date => {
        const dateObj = new Date(date);
        if (dateObj.getFullYear() === currentYear && dateObj.getMonth() === i) {
          monthTotal += getAnimalTypeTotalForDate(date, animalType);
          monthAccepted += getAnimalTypeAcceptedForDate(date, animalType);
          monthRejected += getAnimalTypeRejectedForDate(date, animalType);
        }
      });
      stats.push({
        month: i,
        monthName: MONTHS_FR[i],
        total: monthTotal,
        accepted: monthAccepted,
        rejected: monthRejected
      });
    }
    return stats;
  };

  const getAnimalTypeLast7Days = (animalType) => {
    const today = new Date(selectedProductionDate);
    const last7Days = [];
    for (let i = 0; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateISO = toISODate(date.toISOString().split('T')[0]);
      const dayData = getEggProductionForDate(dateISO);
      const productionValue = dayData[animalType];
      const productionData = getProductionData(productionValue);
      last7Days.push({ 
        date: dateISO, 
        total: productionData.total,
        accepted: productionData.accepted,
        rejected: productionData.rejected
      });
    }
    return last7Days;
  };

  const toggleEggTypeExpansion = (animalType) => {
    setExpandedEggTypes(prev => ({
      ...prev,
      [animalType]: !prev[animalType]
    }));
  };

  const openProductionModal = (date) => {
    const dayData = getEggProductionForDate(date);
    const formData = {};
    eggAnimalTypes.forEach(type => {
      formData[type.key] = (dayData[type.key] || 0).toString();
    });
    setProductionForm(formData);
    setSelectedProductionDate(date);
    setProductionModalVisible(true);
  };


  const loadProducts = async () => {
    try {
      const productsData = await database.getProducts();
      const cheeseProducts = await database.getCheeseProductsForOrders();
      setProducts([...productsData, ...cheeseProducts]);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits');
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: '',
      quantity: '',
      unit: 'kg',
      category: 'Vegetables',
      description: ''
    });
    setModalVisible(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      unit: product.unit,
      category: product.category,
      description: product.description || ''
    });
    setModalVisible(true);
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.quantity) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      const productData = {
        name: productForm.name,
        description: productForm.description || `${productForm.unit} - ${productForm.category}`,
        price: parseFloat(productForm.price),
        quantity: parseInt(productForm.quantity),
        unit: productForm.unit,
        category: productForm.category
      };

      if (editingProduct) {
        await database.updateProduct(editingProduct.id, productData);
      } else {
        await database.addProduct(productData);
      }

      setModalVisible(false);
      // Note: loadProducts() is called automatically via useDataRefresh hook
      // when database.addProduct/updateProduct emits the 'products' event
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Erreur', `Impossible de ${editingProduct ? 'mettre à jour' : 'ajouter'} le produit`);
    }
  };

  const deleteProduct = (id) => {
    Alert.alert(
      'Supprimer le produit',
      'Êtes-vous sûr de vouloir supprimer ce produit?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await database.deleteProduct(id);
            // Note: loadProducts() is called automatically via useDataRefresh hook
          } catch (error) {
            console.error('Error deleting product:', error);
            Alert.alert('Erreur', 'Impossible de supprimer le produit');
          }
        }}
      ]
    );
  };

  // Template message functions
  const openAddMessageModal = () => {
    setEditingMessage(null);
    setMessageForm({
      title: '',
      category: 'Adoption',
      content: ''
    });
    setMessageModalVisible(true);
  };

  const openEditMessageModal = (message) => {
    setEditingMessage(message);
    setMessageForm({
      title: message.title,
      category: message.category,
      content: message.content
    });
    setMessageModalVisible(true);
  };

  const saveMessage = async () => {
    if (!messageForm.title || !messageForm.content) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      if (editingMessage) {
        await database.updateTemplateMessage(editingMessage.id, messageForm);
      } else {
        await database.addTemplateMessage(messageForm);
      }
      
      setMessageModalVisible(false);
      loadTemplateMessages(); // Reload the list
    } catch (error) {
      console.error('Error saving message:', error);
      Alert.alert('Erreur', `Impossible de ${editingMessage ? 'mettre à jour' : 'ajouter'} le message`);
    }
  };

  const deleteMessage = (id) => {
    Alert.alert(
      'Supprimer le message',
      'Êtes-vous sûr de vouloir supprimer ce message modèle?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await database.deleteTemplateMessage(id);
            loadTemplateMessages(); // Reload the list
          } catch (error) {
            console.error('Error deleting message:', error);
            Alert.alert('Erreur', 'Impossible de supprimer le message');
          }
        }}
      ]
    );
  };

  const copyToClipboard = (content) => {
    // In a real app, you would use Clipboard from @react-native-clipboard/clipboard
    Alert.alert('Copié', 'Message copié dans le presse-papiers');
  };

  const replaceMessageVariables = (template, order) => {
    if (!template || !order) return template;
    
    let message = template.content || template;
    
    // Replace common variables
    message = message.replace(/{nom}/g, order.customerName || 'Client');
    message = message.replace(/{date}/g, order.deliveryDate ? toFrenchDate(order.deliveryDate) : order.orderDate ? toFrenchDate(order.orderDate) : new Date().toLocaleDateString('fr-FR'));
    message = message.replace(/{heure}/g, new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    message = message.replace(/{quantite}/g, order.quantity?.toString() || '');
    
    // Replace race information
    if (order.animalDetails) {
      const animalTypes = Object.keys(order.animalDetails);
      if (animalTypes.length > 0) {
        const firstAnimal = order.animalDetails[animalTypes[0]];
        if (firstAnimal?.races && firstAnimal.races.length > 0) {
          const raceNames = firstAnimal.races.map(r => r.race).join(', ');
          message = message.replace(/{race}/g, raceNames);
        }
      }
    } else if (order.race) {
      message = message.replace(/{race}/g, order.race);
    }
    
    // Replace product information
    if (order.product) {
      message = message.replace(/{produit}/g, order.product);
    }
    
    // Replace price
    if (order.totalPrice) {
      message = message.replace(/{prix}/g, order.totalPrice.toFixed(2) + '€');
    }
    
    return message;
  };

  const generateMessagePreview = () => {
    if (!selectedTemplateForGeneration) {
      setGeneratedMessagePreview('');
      return;
    }
    
    if (selectedOrderForGeneration) {
      const preview = replaceMessageVariables(selectedTemplateForGeneration, selectedOrderForGeneration);
      setGeneratedMessagePreview(preview);
    } else {
      // Show template with placeholders
      setGeneratedMessagePreview(selectedTemplateForGeneration.content || '');
    }
  };

  useEffect(() => {
    generateMessagePreview();
  }, [selectedTemplateForGeneration, selectedOrderForGeneration]);

  const handleCopyGeneratedMessage = () => {
    if (generatedMessagePreview) {
      copyToClipboard(generatedMessagePreview);
      Alert.alert('Succès', 'Message généré copié dans le presse-papiers');
    }
  };

  const handleSendGeneratedMessage = () => {
    if (!selectedOrderForGeneration) {
      Alert.alert('Erreur', 'Veuillez sélectionner une commande pour envoyer le message');
      return;
    }
    
    if (generatedMessagePreview) {
      // In a real app, this would integrate with email/SMS service
      Alert.alert(
        'Envoyer le message',
        `Envoyer le message à ${selectedOrderForGeneration.customerName}?\n\n${selectedOrderForGeneration.customerEmail ? `Email: ${selectedOrderForGeneration.customerEmail}` : ''}\n${selectedOrderForGeneration.customerPhone ? `Téléphone: ${selectedOrderForGeneration.customerPhone}` : ''}`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Envoyer', onPress: () => {
            Alert.alert('Message', 'Fonctionnalité d\'envoi de message à venir');
          }}
        ]
      );
    }
  };


  const openTemplateSettings = () => {
    setTemplateSettingsModal(true);
  };


  const updatePricingGrid = async (index, field, value) => {
    const newGrids = { ...pricingGrids };
    const currentGrid = [...newGrids[selectedAnimalType]];
    currentGrid[index] = { ...currentGrid[index], [field]: value };
    newGrids[selectedAnimalType] = currentGrid;
    setPricingGrids(newGrids);
    
    // Save to database
    try {
      await database.savePricingGrid(selectedAnimalType, currentGrid);
    } catch (error) {
      console.error('Error saving pricing grid:', error);
    }
  };

  const addPricingRow = async () => {
    const newGrids = { ...pricingGrids };
    const currentGrid = [...newGrids[selectedAnimalType]];
    currentGrid.push({ ageMonths: 0, ageWeeks: 0, price: 0, sex: 'Tous' });
    newGrids[selectedAnimalType] = currentGrid;
    setPricingGrids(newGrids);
    
    // Save to database
    try {
      await database.savePricingGrid(selectedAnimalType, currentGrid);
    } catch (error) {
      console.error('Error saving pricing grid:', error);
    }
  };

  const removePricingRow = async (index) => {
    const newGrids = { ...pricingGrids };
    const currentGrid = newGrids[selectedAnimalType].filter((_, i) => i !== index);
    newGrids[selectedAnimalType] = currentGrid;
    setPricingGrids(newGrids);
    
    // Save to database
    try {
      await database.savePricingGrid(selectedAnimalType, currentGrid);
    } catch (error) {
      console.error('Error saving pricing grid:', error);
    }
  };

  const addNewAnimalType = async () => {
    if (!newAnimalTypeName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le type d\'animal');
      return;
    }
    
    const animalTypeKey = newAnimalTypeName.toLowerCase().replace(/\s+/g, '_');
    const newGrids = { ...pricingGrids };
    
    // If copying from existing grid, copy the data
    if (copyFromAnimalType && pricingGrids[copyFromAnimalType]) {
      // Deep copy the grid data
      newGrids[animalTypeKey] = pricingGrids[copyFromAnimalType].map(item => ({
        ...item
      }));
    } else {
      newGrids[animalTypeKey] = [];
    }
    
    setPricingGrids(newGrids);
    setSelectedAnimalType(animalTypeKey);
    setNewAnimalTypeModal(false);
    setNewAnimalTypeName('');
    setCopyFromAnimalType(null);
    
    // Save to database
    try {
      await database.savePricingGrid(animalTypeKey, newGrids[animalTypeKey]);
      if (copyFromAnimalType) {
        Alert.alert('Succès', `Grille tarifaire créée à partir de ${copyFromAnimalType}`);
      }
    } catch (error) {
      console.error('Error saving new animal type:', error);
    }
  };

  const copyPricingGrid = async (fromType, toType) => {
    if (!pricingGrids[fromType] || pricingGrids[fromType].length === 0) {
      Alert.alert('Erreur', 'La grille source est vide');
      return;
    }
    
    const newGrids = { ...pricingGrids };
    // Deep copy the grid data
    newGrids[toType] = pricingGrids[fromType].map(item => ({
      ...item
    }));
    
    setPricingGrids(newGrids);
    
    // Save to database
    try {
      await database.savePricingGrid(toType, newGrids[toType]);
      Alert.alert('Succès', `Grille tarifaire copiée depuis ${fromType}`);
    } catch (error) {
      console.error('Error copying pricing grid:', error);
      Alert.alert('Erreur', 'Impossible de copier la grille tarifaire');
    }
  };


  const ProductItem = ({ item }) => {
    const isCheeseProduct = item.type === 'cheese';
    const isLowStock = item.quantity < 20;
    
    return (
      <TouchableOpacity 
        style={[styles.productCard, isCheeseProduct && styles.cheeseProductCard]}
        onPress={() => isCheeseProduct ? null : openEditModal(item)}
        activeOpacity={isCheeseProduct ? 1 : 0.7}
      >
        <View style={styles.productHeader}>
          <View style={styles.productTitleSection}>
            <Text style={styles.productName}>
              {isCheeseProduct ? '🧀 ' : ''}{item.name}
            </Text>
            <View style={styles.categoryRow}>
              <Text style={styles.productCategory}>{item.category}</Text>
              {!isCheeseProduct && (
                <View style={[styles.stockStatusBadge, { 
                  backgroundColor: isLowStock ? '#fff3cd' : '#d4edda',
                  borderColor: isLowStock ? '#ffc107' : '#28a745'
                }]}>
                  <Text style={[styles.stockStatusText, { 
                    color: isLowStock ? '#856404' : '#155724' 
                  }]}>
                    {isLowStock ? 'Stock faible' : 'Bon stock'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.productHeaderRight}>
            <View style={styles.stockIndicator}>
              <Text style={[styles.stockStatus, { 
                color: isLowStock ? '#F44336' : '#4CAF50' 
              }]}>
                {isLowStock ? '⚠️' : '✅'}
              </Text>
            </View>
            {!isCheeseProduct && (
              <Pressable
                style={({ pressed }) => [
                  styles.deleteButtonTop,
                  pressed && styles.deleteButtonPressed
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  deleteProduct(item.id);
                }}
              >
                <Text style={styles.deleteButtonTopText}>🗑️</Text>
              </Pressable>
            )}
          </View>
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.productInfoRow}>
            <Text style={styles.productInfoLabel}>Prix:</Text>
            <Text style={styles.productInfoValue}>{item.price.toFixed(2)}€</Text>
          </View>
          <View style={styles.productInfoRow}>
            <Text style={styles.productInfoLabel}>Stock:</Text>
            <Text style={styles.productInfoValue}>{item.quantity} {item.unit || 'unité(s)'}</Text>
          </View>
          {isCheeseProduct && (
            <View style={styles.productInfoRow}>
              <Text style={styles.productInfoLabel}>Type:</Text>
              <Text style={styles.productInfoValue}>
                {item.cheeseType === 'fromage_frais' ? 'Fromage Frais' : 'Tomme'}
                {item.size && ` - ${item.size}`}
                {item.flavor && item.flavor !== 'nature' && ` - ${item.flavor}`}
              </Text>
            </View>
          )}
          {item.description && (
            <View style={styles.productDescription}>
              <Text style={styles.productDescriptionText} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          )}
        </View>
        
        {isCheeseProduct && (
          <View style={styles.cheeseProductNote}>
            <Text style={styles.cheeseProductNoteText}>
              📝 Géré dans Production Fromage
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Egg Type Card Component with Swipe-to-Delete
  const EggTypeCard = ({
    type,
    dayData,
    count,
    isExpanded,
    selectedProductionDate,
    currentYear,
    getAnimalTypeLast7Days,
    getAnimalTypeMonthlyStats,
    getAnimalTypeBestDay,
    getAnimalTypeBestMonth,
    getAnimalTypeYearlyTotal,
    getAnimalTypeYearlyRejected,
    getAnimalTypeTotalForDate,
    getAnimalTypeAcceptedForDate,
    getAnimalTypeRejectedForDate,
    getProductionData,
    toggleEggTypeExpansion,
    onAddPress,
    onDeletePress,
    toFrenchDate
  }) => {
    const slideAnim = useRef(new Animated.Value(0)).current;
    const longPressTimer = useRef(null);
    const isRevealed = useRef(false);
    const [isDeleteVisible, setIsDeleteVisible] = useState(false);

    const revealDelete = () => {
      if (isRevealed.current) return;
      isRevealed.current = true;
      setIsDeleteVisible(true);
      Animated.spring(slideAnim, {
        toValue: 80,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    };

    const hideDelete = () => {
      if (!isRevealed.current) return;
      isRevealed.current = false;
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start(() => {
        setIsDeleteVisible(false);
      });
    };

    const handleLongPress = () => {
      longPressTimer.current = setTimeout(() => {
        revealDelete();
      }, 1000); // 1 second long press
    };

    const handlePressOut = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Only respond to horizontal swipes when delete is revealed
          if (isRevealed.current && Math.abs(gestureState.dx) > 10) {
            return true;
          }
          return false;
        },
        onPanResponderGrant: () => {
          if (isRevealed.current) {
            slideAnim.setOffset(slideAnim._value);
            slideAnim.setValue(0);
          }
        },
        onPanResponderMove: (evt, gestureState) => {
          if (isRevealed.current) {
            const newValue = Math.max(0, Math.min(80, gestureState.dx));
            slideAnim.setValue(newValue);
          }
        },
        onPanResponderRelease: (evt, gestureState) => {
          if (isRevealed.current) {
            slideAnim.flattenOffset();
            if (gestureState.dx < -40) {
              // Swipe left to close
              hideDelete();
            } else if (gestureState.dx < 40) {
              // Return to revealed position
              Animated.spring(slideAnim, {
                toValue: 80,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
              }).start();
            }
          }
        },
      })
    ).current;

    const productionValue = dayData[type.key];
    const productionData = getProductionData(productionValue);
    const last7Days = getAnimalTypeLast7Days(type.key);
    const animalTypeMonthlyStats = getAnimalTypeMonthlyStats(type.key);
    const animalTypeBestDay = getAnimalTypeBestDay(type.key);
    const animalTypeBestMonth = getAnimalTypeBestMonth(type.key);
    const animalTypeYearlyTotal = getAnimalTypeYearlyTotal(currentYear, type.key);
    const animalTypeYearlyRejected = getAnimalTypeYearlyRejected(currentYear, type.key);
    const animalTypeTotalForDay = getAnimalTypeTotalForDate(selectedProductionDate, type.key);
    const animalTypeAcceptedForDay = getAnimalTypeAcceptedForDate(selectedProductionDate, type.key);
    const animalTypeRejectedForDay = getAnimalTypeRejectedForDate(selectedProductionDate, type.key);

    return (
      <View style={styles.eggTypeStatusCard}>
        <View style={styles.eggTypeStatusHeader}>
          <TouchableOpacity
            style={styles.eggTypeStatusLeft}
            onPress={() => toggleEggTypeExpansion(type.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.eggTypeIcon}>{type.icon}</Text>
            <Text style={styles.eggTypeLabel}>{type.label}</Text>
          </TouchableOpacity>
            <View style={styles.eggTypeStatusRight}>
              <View style={styles.eggTypeCountContainer}>
                {productionData.total > 0 ? (
                  <>
                    <Text style={styles.eggTypeCountTotal}>{productionData.total}</Text>
                    <Text style={styles.eggTypeCountSeparator}> • </Text>
                    <Text style={styles.eggTypeCountAccepted}>{productionData.accepted}</Text>
                    {productionData.rejected > 0 && (
                      <>
                        <Text style={styles.eggTypeCountSeparator}> • </Text>
                        <Text style={styles.eggTypeCountRejected}>{productionData.rejected}</Text>
                      </>
                    )}
                  </>
                ) : (
                  <Text style={styles.eggTypeCount}>0</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.eggTypeAddButton}
                onPress={onAddPress}
              >
                <Text style={styles.eggTypeAddButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => toggleEggTypeExpansion(type.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.eggTypeExpandIcon}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
                
                {isExpanded && (
                  <View style={styles.eggTypeStatusDetails}>
                    {/* Individual Stats for this animal type */}
                    <View style={styles.eggTypeStatsRow}>
                      <View style={styles.eggTypeStatItem}>
                        <Text style={styles.eggTypeStatLabel}>Du jour</Text>
                        <View style={styles.eggTypeStatValueWrapper}>
                          <Text style={styles.eggTypeStatValue}>{animalTypeTotalForDay}</Text>
                        </View>
                      </View>
                      <View style={styles.eggTypeStatItem}>
                        <Text style={styles.eggTypeStatLabel}>Meilleur jour</Text>
                        <View style={styles.eggTypeStatValueWrapper}>
                          <Text style={styles.eggTypeStatValue}>{animalTypeBestDay ? animalTypeBestDay.total : '0'}</Text>
                        </View>
                      </View>
                      <View style={styles.eggTypeStatItem}>
                        <Text style={styles.eggTypeStatLabel}>Meilleur mois</Text>
                        <View style={styles.eggTypeStatValueWrapper}>
                          <Text style={styles.eggTypeStatValue}>{animalTypeBestMonth ? animalTypeBestMonth.total : '0'}</Text>
                          {animalTypeBestMonth && (
                            <Text style={styles.eggTypeStatSubtext}>{animalTypeBestMonth.monthName}</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.eggTypeStatItem}>
                        <Text style={styles.eggTypeStatLabel}>Annuel</Text>
                        <View style={styles.eggTypeStatValueWrapper}>
                          <Text style={styles.eggTypeStatValue}>{animalTypeYearlyTotal}</Text>
                        </View>
                      </View>
                      <View style={styles.eggTypeStatItem}>
                        <Text style={styles.eggTypeStatLabel}>Total rejetés</Text>
                        <View style={styles.eggTypeStatValueWrapper}>
                          <Text style={[styles.eggTypeStatValue, styles.eggTypeStatValueRejected]}>{animalTypeYearlyRejected}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Last 7 Days History */}
                    <Text style={styles.eggTypeHistoryTitle}>Historique récents (7 derniers jours):</Text>
                    <View style={styles.eggTypeHistoryList}>
                      {last7Days.map(item => (
                        <View key={item.date} style={styles.eggTypeHistoryItem}>
                          <Text style={styles.eggTypeHistoryDate}>
                            {toFrenchDate(item.date)}
                          </Text>
                          <Text style={styles.eggTypeHistoryCount}>
                            {item.count} œufs
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Monthly Stats for this animal type */}
                    <Text style={styles.eggTypeHistoryTitle}>Production par mois ({currentYear}):</Text>
                    <View style={styles.monthlyBarChartContainer}>
                      {(() => {
                        const maxValue = Math.max(...animalTypeMonthlyStats.map(s => s.total), 1);
                        const chartHeight = 100;
                        return animalTypeMonthlyStats.map((stat, index) => {
                          const totalBarHeight = maxValue > 0 ? (stat.total / maxValue) * chartHeight : 0;
                          const acceptedBarHeight = stat.total > 0 ? (stat.accepted / stat.total) * totalBarHeight : 0;
                          const rejectedBarHeight = stat.total > 0 ? (stat.rejected / stat.total) * totalBarHeight : 0;
                          const hasLargeNumber = stat.total >= 1000;
                          const isEven = index % 2 === 0;
                          return (
                            <View key={stat.month} style={styles.monthlyBarChartItem}>
                              <View style={styles.monthlyBarChartBarContainer}>
                                <View style={styles.monthlyBarChartValueContainer}>
                                  {stat.total > 0 ? (
                                    <>
                                      <Text 
                                        style={hasLargeNumber ? styles.monthlyBarChartValueLarge : styles.monthlyBarChartValue}
                                        numberOfLines={1}
                                      >
                                        {stat.total}
                                      </Text>
                                      <View style={styles.monthlyBarChartValueBreakdown}>
                                        <Text style={styles.monthlyBarChartValueAccepted}>{stat.accepted}</Text>
                                        {stat.rejected > 0 && (
                                          <Text style={styles.monthlyBarChartValueRejectedText}>{stat.rejected}</Text>
                                        )}
                                      </View>
                                    </>
                                  ) : (
                                    <Text 
                                      style={styles.monthlyBarChartValue}
                                      numberOfLines={1}
                                    >
                                      0
                                    </Text>
                                  )}
                                </View>
                                <View style={styles.monthlyBarChartBarWrapper}>
                                  {stat.total > 0 && (
                                    <>
                                      {/* Accepted bar (green, at bottom) */}
                                      {stat.accepted > 0 && (
                                        <View 
                                          style={[
                                            styles.monthlyBarChartBarAccepted,
                                            { 
                                              height: Math.max(acceptedBarHeight, 2),
                                              position: 'absolute',
                                              bottom: 0,
                                              width: '70%',
                                              zIndex: 1
                                            }
                                          ]}
                                        />
                                      )}
                                      {/* Rejected bar (red, stacked on top of accepted) */}
                                      {stat.rejected > 0 && (
                                        <View 
                                          style={[
                                            styles.monthlyBarChartBarRejected,
                                            { 
                                              height: Math.max(rejectedBarHeight, 2),
                                              position: 'absolute',
                                              bottom: acceptedBarHeight,
                                              width: '70%',
                                              zIndex: 2
                                            }
                                          ]}
                                        />
                                      )}
                                      {/* Total bar (blue background, full height for reference) */}
                                      <View 
                                        style={[
                                          styles.monthlyBarChartBarTotal,
                                          { 
                                            height: Math.max(totalBarHeight, 2),
                                            position: 'absolute',
                                            bottom: 0,
                                            width: '70%',
                                            zIndex: 0,
                                            opacity: 0.3
                                          }
                                        ]}
                                      />
                                    </>
                                  )}
                                </View>
                              </View>
                              <Text style={styles.monthlyBarChartMonth}>{stat.monthName.substring(0, 3)}</Text>
                            </View>
                          );
                        });
                      })()}
                    </View>
                  </View>
                )}
        </View>
      );
    };

  const MessageItem = ({ item }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity 
        style={styles.messageCard}
        onPress={() => openEditMessageModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.messageHeader}>
          <Text style={styles.messageTitle}>{item.title || 'Sans titre'}</Text>
          <View style={[styles.categoryBadge, { 
            backgroundColor: item.category === 'Adoption' ? '#4CAF50' : 
                            item.category === 'Activité' ? '#2196F3' : '#FF9800'
          }]}>
            <Text style={styles.categoryBadgeText}>{item.category || 'Autre'}</Text>
          </View>
        </View>
        
        <View style={styles.messageContent}>
          <Text style={styles.messagePreview} numberOfLines={3}>
            {item.content || 'Aucun contenu'}
          </Text>
        </View>

        <View style={styles.messageActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.copyBtn]}
            onPress={(e) => {
              e.stopPropagation();
              copyToClipboard(item.content || '');
            }}
          >
            <Text style={styles.actionBtnText}>📋 Copier</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.generateBtn]}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedTemplateForGeneration(item);
              setGenerateMessageModal(true);
            }}
          >
            <Text style={styles.actionBtnText}>📨 Générer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={(e) => {
              e.stopPropagation();
              deleteMessage(item.id);
            }}
          >
            <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const [animalTypes, setAnimalTypes] = useState([]);
  const [addAnimalTypeModal, setAddAnimalTypeModal] = useState(false);
  const [newElevageAnimalTypeName, setNewElevageAnimalTypeName] = useState('');
  const [animalTypeStats, setAnimalTypeStats] = useState({});

  const renderVentes = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💰 Ventes</Text>
        <Text style={styles.sectionDescription}>
          Gestion des produits de la ferme : œufs, adoptions, fromages
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Ajouter Produit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.pricingInstructions}>
          <Text style={styles.instructionsTitle}>📋 Comment configurer les grilles tarifaires :</Text>
          <Text style={styles.instructionsText}>
            1. Sélectionnez un type d'animal dans les onglets ci-dessous{'\n'}
            2. Cliquez sur "⚙️ Configurer Prix" pour modifier les prix{'\n'}
            3. Ajoutez des lignes avec âge, prix et sexe{'\n'}
            4. Utilisez "+ Nouveau Type" pour créer d'autres animaux
          </Text>
        </View>
      </View>
      
      
      <View style={styles.adoptionPricing}>
        <Text style={styles.pricingTitle}>🐣 Grilles Tarifaires Adoptions</Text>
        
        <View style={styles.pricingHeaderButtons}>
          <TouchableOpacity 
            style={[styles.addButton, styles.configurePricingButton]}
            onPress={openTemplateSettings}
          >
            <Text style={styles.addButtonText}>⚙️ Configurer Prix</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addAnimalTypeButton}
            onPress={() => {
              setCopyFromAnimalType(null);
              setNewAnimalTypeModal(true);
            }}
          >
            <Text style={styles.addAnimalTypeButtonText}>+ Nouveau Type</Text>
          </TouchableOpacity>
        </View>
        
        {/* Animal Type Selector */}
        <View style={styles.animalTypeSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(pricingGrids).map((animalType) => (
              <TouchableOpacity
                key={animalType}
                style={[
                  styles.animalTypeTab,
                  selectedAnimalType === animalType && styles.animalTypeTabActive
                ]}
                onPress={async () => {
                  setSelectedAnimalType(animalType);
                  await configService.saveProductManagementSelectedAnimalType(animalType);
                }}
              >
                <Text style={[
                  styles.animalTypeTabText,
                  selectedAnimalType === animalType && styles.animalTypeTabTextActive
                ]}>
                  {animalType.charAt(0).toUpperCase() + animalType.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Current Pricing Grid */}
        <View style={styles.pricingGrid}>
          {pricingGrids[selectedAnimalType] && pricingGrids[selectedAnimalType].length > 0 ? (
            pricingGrids[selectedAnimalType].map((item, index) => (
              <View key={`${selectedAnimalType}-${index}`} style={styles.pricingRow}>
                <Text style={styles.pricingAge}>
                  {item.ageMonths === 0 && item.ageWeeks === 0 ? 'Naissance' : 
                   item.ageMonths === 0 && item.ageWeeks > 0 ? `${item.ageWeeks} semaine${item.ageWeeks > 1 ? 's' : ''}` :
                   item.ageMonths > 0 && item.ageWeeks === 0 ? `${item.ageMonths} mois` :
                   `${item.ageMonths} mois ${item.ageWeeks} semaine${item.ageWeeks > 1 ? 's' : ''}`}
                </Text>
                <Text style={styles.pricingPrice}>{item.price}€</Text>
                <Text style={styles.pricingSex}>{item.sex}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyPricingGrid}>
              <Text style={styles.emptyPricingGridText}>
                Aucune grille tarifaire configurée pour {selectedAnimalType}
              </Text>
              <Text style={styles.emptyPricingGridSubtext}>
                Utilisez les paramètres de template pour ajouter des prix
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.productsSection}>
        <View style={styles.productsSectionHeader}>
          <Text style={styles.productsSectionTitle}>📦 Produits Actuels</Text>
          <Text style={styles.productsSectionSubtitle}>
            Cliquez sur un produit pour le modifier
          </Text>
        </View>
        {products.length > 0 ? (
          products.map((item) => (
            <ProductItem key={item.id.toString()} item={item} />
          ))
        ) : (
          <View style={styles.emptyProductsState}>
            <Text style={styles.emptyProductsText}>Aucun produit configuré</Text>
            <Text style={styles.emptyProductsSubtext}>
              Ajoutez vos premiers produits pour commencer
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderActivites = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🎯 Activités</Text>
        <Text style={styles.sectionDescription}>
          Gestion des activités de la ferme : visites, formations, animations
        </Text>
      </View>
      
      <View style={styles.activitiesGrid}>
        <TouchableOpacity style={styles.activityCard}>
          <Text style={styles.activityIcon}>🚶‍♀️</Text>
          <Text style={styles.activityTitle}>Visite Guidée</Text>
          <Text style={styles.activityDescription}>Découverte de la ferme</Text>
          <View style={styles.activityStatus}>
            <Text style={styles.activityStatusText}>Actif</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.activityCard}>
          <Text style={styles.activityIcon}>🏴‍☠️</Text>
          <Text style={styles.activityTitle}>Chasse au Trésor</Text>
          <Text style={styles.activityDescription}>Animation pour enfants</Text>
          <View style={styles.activityStatus}>
            <Text style={styles.activityStatusText}>En développement</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.activityCard}>
          <Text style={styles.activityIcon}>🎓</Text>
          <Text style={styles.activityTitle}>Formations</Text>
          <Text style={styles.activityDescription}>Apprentissage agricole</Text>
          <View style={styles.activityStatus}>
            <Text style={styles.activityStatusText}>Planifié</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.activityCard}>
          <Text style={styles.activityIcon}>🎪</Text>
          <Text style={styles.activityTitle}>Événements</Text>
          <Text style={styles.activityDescription}>Fêtes et célébrations</Text>
          <View style={styles.activityStatus}>
            <Text style={styles.activityStatusText}>À venir</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getFilteredMessages = () => {
    if (!selectedCategoryFilter) {
      return templateMessages;
    }
    return templateMessages.filter(msg => msg?.category === selectedCategoryFilter);
  };

  const renderProductions = () => {
    const dayData = getEggProductionForDate(selectedProductionDate);
    const totalForDay = getTotalProductionForDate(selectedProductionDate);
    const acceptedForDay = getAcceptedProductionForDate(selectedProductionDate);
    const rejectedForDay = getRejectedProductionForDate(selectedProductionDate);
    const bestDay = getBestDay();
    const bestMonth = getBestMonth();
    const currentYear = getCurrentProductionYear();
    const yearlyTotal = getYearlyTotal(currentYear);
    const yearlyAccepted = getYearlyAccepted(currentYear);
    const yearlyRejected = getYearlyRejected(currentYear);
    const monthlyStats = getMonthlyStats();
    const selectedDateObj = new Date(selectedProductionDate);
    const isToday = selectedProductionDate === getTodayISO();
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionCard}>
          <View style={styles.productionHeaderRow}>
            <View style={styles.productionTitleSection}>
              <View style={styles.productionTitleRow}>
                <Text style={styles.sectionTitle}>🥚 Production d'Œufs</Text>
                <TouchableOpacity 
                  style={styles.productionInfoButton}
                  onPress={() => setProductionInfoModalVisible(true)}
                >
                  <Text style={styles.productionInfoIcon}>ℹ️</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionDescription}>
                Gestion quotidienne de la production d'œufs par type d'animal
              </Text>
            </View>
          </View>

          {/* Compact Date Navigation */}
          <View style={styles.compactDateRow}>
            <TouchableOpacity 
              style={styles.compactNavButton}
              onPress={() => {
                const prevDay = new Date(selectedProductionDate);
                prevDay.setDate(prevDay.getDate() - 1);
                setSelectedProductionDate(toISODate(prevDay.toISOString().split('T')[0]));
              }}
            >
              <Text style={styles.compactNavText}>‹</Text>
            </TouchableOpacity>
            
            <View style={styles.compactDateDisplay}>
              <TouchableOpacity 
                style={styles.compactDateButton}
                onPress={() => setProductionMonthPickerVisible(true)}
              >
                <Text style={styles.compactDateText}>
                  {MONTHS_FR[selectedDateObj.getMonth()]}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.compactDateButton}
                onPress={() => setProductionYearPickerVisible(true)}
              >
                <Text style={styles.compactDateText}>
                  {selectedDateObj.getFullYear()}
                </Text>
              </TouchableOpacity>
              <Text style={styles.compactDateDay}>
                {selectedDateObj.getDate()} {selectedDateObj.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.compactNavButton}
              onPress={() => {
                const nextDay = new Date(selectedProductionDate);
                nextDay.setDate(nextDay.getDate() + 1);
                const nextDayISO = toISODate(nextDay.toISOString().split('T')[0]);
                if (nextDayISO <= getTodayISO()) {
                  setSelectedProductionDate(nextDayISO);
                }
              }}
              disabled={!isToday && selectedProductionDate >= getTodayISO()}
            >
              <Text style={[styles.compactNavText, (!isToday && selectedProductionDate >= getTodayISO()) && styles.compactNavTextDisabled]}>›</Text>
            </TouchableOpacity>
          </View>
          
          {!isToday && (
            <TouchableOpacity 
              style={styles.compactTodayButton}
              onPress={() => setSelectedProductionDate(getTodayISO())}
            >
              <Text style={styles.compactTodayButtonText}>📅 Aujourd'hui</Text>
            </TouchableOpacity>
          )}

          {/* Compact Statistics */}
          <View style={styles.compactStatsRow}>
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatLabel}>Total du jour</Text>
              <Text style={styles.compactStatValue}>{totalForDay}</Text>
            </View>
            {bestDay && (
              <View style={styles.compactStatItem}>
                <Text style={styles.compactStatLabel}>Meilleur jour</Text>
                <Text style={styles.compactStatValue}>{bestDay.total}</Text>
                <Text style={styles.compactStatSubtext}>{toFrenchDate(bestDay.date)}</Text>
              </View>
            )}
            {bestMonth && (
              <View style={styles.compactStatItem}>
                <Text style={styles.compactStatLabel}>Meilleur mois</Text>
                <Text style={styles.compactStatValue}>{bestMonth.total}</Text>
                <Text style={styles.compactStatSubtext}>{bestMonth.monthName}</Text>
              </View>
            )}
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatLabel}>Total annuel</Text>
              <Text style={styles.compactStatValue}>{yearlyTotal}</Text>
            </View>
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatLabel}>Total rejetés</Text>
              <Text style={[styles.compactStatValue, styles.compactStatValueRejected]}>{yearlyRejected}</Text>
            </View>
          </View>
        </View>

        {/* Status Bar for Each Egg Type */}
        <View style={styles.eggTypesStatusContainer}>
          {eggAnimalTypes.map(type => {
            const productionValue = dayData[type.key];
            const productionData = getProductionData(productionValue);
            const isExpanded = expandedEggTypes[type.key];
            const last7Days = getAnimalTypeLast7Days(type.key);
            const animalTypeMonthlyStats = getAnimalTypeMonthlyStats(type.key);
            const animalTypeBestDay = getAnimalTypeBestDay(type.key);
            const animalTypeBestMonth = getAnimalTypeBestMonth(type.key);
            const animalTypeYearlyTotal = getAnimalTypeYearlyTotal(currentYear, type.key);
            const animalTypeYearlyRejected = getAnimalTypeYearlyRejected(currentYear, type.key);
            const animalTypeTotalForDay = getAnimalTypeTotalForDate(selectedProductionDate, type.key);
            const animalTypeAcceptedForDay = getAnimalTypeAcceptedForDate(selectedProductionDate, type.key);
            const animalTypeRejectedForDay = getAnimalTypeRejectedForDate(selectedProductionDate, type.key);
            
            return (
              <View key={type.key} style={styles.eggTypeStatusCard}>
                <View style={styles.eggTypeStatusHeader}>
                  <TouchableOpacity 
                    style={styles.eggTypeStatusLeft}
                    onPress={() => toggleEggTypeExpansion(type.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.eggTypeIcon}>{type.icon}</Text>
                    <Text style={styles.eggTypeLabel}>{type.label}</Text>
                  </TouchableOpacity>
                  <View style={styles.eggTypeStatusRight}>
                    <View style={styles.eggTypeCountContainer}>
                      {productionData.total > 0 ? (
                        <>
                          <Text style={styles.eggTypeCountTotal}>{productionData.total}</Text>
                          <Text style={styles.eggTypeCountSeparator}> • </Text>
                          <Text style={styles.eggTypeCountAccepted}>{productionData.accepted}</Text>
                          {productionData.rejected > 0 && (
                            <>
                              <Text style={styles.eggTypeCountSeparator}> • </Text>
                              <Text style={styles.eggTypeCountRejected}>{productionData.rejected}</Text>
                            </>
                          )}
                        </>
                      ) : (
                        <Text style={styles.eggTypeCount}>0</Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={styles.eggTypeAddButton}
                      onPress={() => {
                        setSingleAnimalType(type.key);
                        setSingleAnimalCount('');
                        setSingleAnimalRejected('');
                        setSingleAnimalModalVisible(true);
                      }}
                    >
                      <Text style={styles.eggTypeAddButtonText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => toggleEggTypeExpansion(type.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.eggTypeExpandIcon}>
                        {isExpanded ? '▼' : '▶'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {isExpanded && (
                  <View style={styles.eggTypeStatusDetails}>
                    {/* Individual Stats for this animal type */}
                    <View style={styles.eggTypeStatsRow}>
                      <View style={styles.eggTypeStatItem}>
                        <Text style={styles.eggTypeStatLabel}>Du jour</Text>
                        <View style={styles.eggTypeStatValueWrapper}>
                          <Text style={styles.eggTypeStatValue}>{animalTypeTotalForDay}</Text>
                        </View>
                      </View>
                      <View style={styles.eggTypeStatItem}>
                        <Text style={styles.eggTypeStatLabel}>Meilleur jour</Text>
                        <View style={styles.eggTypeStatValueWrapper}>
                          <Text style={styles.eggTypeStatValue}>{animalTypeBestDay ? animalTypeBestDay.total : '0'}</Text>
                        </View>
                      </View>
                      <View style={styles.eggTypeStatItem}>
                        <Text style={styles.eggTypeStatLabel}>Meilleur mois</Text>
                        <View style={styles.eggTypeStatValueWrapper}>
                          <Text style={styles.eggTypeStatValue}>{animalTypeBestMonth ? animalTypeBestMonth.total : '0'}</Text>
                          {animalTypeBestMonth && (
                            <Text style={styles.eggTypeStatSubtext}>{animalTypeBestMonth.monthName}</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.eggTypeStatItem}>
                        <Text style={styles.eggTypeStatLabel}>Annuel</Text>
                        <View style={styles.eggTypeStatValueWrapper}>
                          <Text style={styles.eggTypeStatValue}>{animalTypeYearlyTotal}</Text>
                        </View>
                      </View>
                      <View style={styles.eggTypeStatItem}>
                        <Text style={styles.eggTypeStatLabel}>Total rejetés</Text>
                        <View style={styles.eggTypeStatValueWrapper}>
                          <Text style={[styles.eggTypeStatValue, styles.eggTypeStatValueRejected]}>{animalTypeYearlyRejected}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Last 7 Days History */}
                    <Text style={styles.eggTypeHistoryTitle}>Historique récents (7 derniers jours):</Text>
                    <View style={styles.eggTypeHistoryList}>
                      {last7Days.map(item => (
                        <View key={item.date} style={styles.eggTypeHistoryItem}>
                          <Text style={styles.eggTypeHistoryDate}>
                            {toFrenchDate(item.date)}
                          </Text>
                          <View style={styles.eggTypeHistoryCounts}>
                            {item.total > 0 ? (
                              <>
                                <Text style={styles.eggTypeHistoryCount}>
                                  {item.accepted} acceptés
                                </Text>
                                {item.rejected > 0 && (
                                  <Text style={[styles.eggTypeHistoryCount, styles.eggTypeHistoryRejected]}>
                                    {' / '}{item.rejected} rejetés
                                  </Text>
                                )}
                              </>
                            ) : (
                              <Text style={styles.eggTypeHistoryCount}>0 œufs</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Monthly Stats for this animal type */}
                    <Text style={styles.eggTypeHistoryTitle}>Production par mois ({currentYear}):</Text>
                    <View style={styles.monthlyBarChartContainer}>
                      {(() => {
                        const maxValue = Math.max(...animalTypeMonthlyStats.map(s => s.total), 1);
                        const valueTextHeight = 20; // Space reserved for value text at top
                        const chartHeight = 100; // Bar area height (below value text)
                        return animalTypeMonthlyStats.map((stat, index) => {
                          const totalBarHeight = maxValue > 0 ? (stat.total / maxValue) * chartHeight : 0;
                          const acceptedBarHeight = stat.total > 0 ? (stat.accepted / stat.total) * totalBarHeight : 0;
                          const rejectedBarHeight = stat.total > 0 ? (stat.rejected / stat.total) * totalBarHeight : 0;
                          const hasLargeNumber = stat.total >= 1000;
                          const isEven = index % 2 === 0;
                          return (
                            <View key={stat.month} style={styles.monthlyBarChartItem}>
                              <View style={styles.monthlyBarChartBarContainer}>
                                <View style={styles.monthlyBarChartValueContainer}>
                                  {stat.total > 0 ? (
                                    <>
                                      <Text 
                                        style={hasLargeNumber ? styles.monthlyBarChartValueLarge : styles.monthlyBarChartValue}
                                        numberOfLines={1}
                                      >
                                        {stat.total}
                                      </Text>
                                      <View style={styles.monthlyBarChartValueBreakdown}>
                                        <Text style={styles.monthlyBarChartValueAccepted}>{stat.accepted}</Text>
                                        {stat.rejected > 0 && (
                                          <Text style={styles.monthlyBarChartValueRejectedText}>{stat.rejected}</Text>
                                        )}
                                      </View>
                                    </>
                                  ) : (
                                    <Text 
                                      style={styles.monthlyBarChartValue}
                                      numberOfLines={1}
                                    >
                                      0
                                    </Text>
                                  )}
                                </View>
                                <View style={styles.monthlyBarChartBarWrapper}>
                                  {stat.total > 0 && (
                                    <>
                                      {/* Accepted bar (green, at bottom) */}
                                      {stat.accepted > 0 && (
                                        <View 
                                          style={[
                                            styles.monthlyBarChartBarAccepted,
                                            { 
                                              height: Math.max(acceptedBarHeight, 2),
                                              position: 'absolute',
                                              bottom: 0,
                                              width: '70%',
                                              zIndex: 1
                                            }
                                          ]}
                                        />
                                      )}
                                      {/* Rejected bar (red, stacked on top of accepted) */}
                                      {stat.rejected > 0 && (
                                        <View 
                                          style={[
                                            styles.monthlyBarChartBarRejected,
                                            { 
                                              height: Math.max(rejectedBarHeight, 2),
                                              position: 'absolute',
                                              bottom: acceptedBarHeight,
                                              width: '70%',
                                              zIndex: 2
                                            }
                                          ]}
                                        />
                                      )}
                                      {/* Total bar (blue background, full height for reference) */}
                                      <View 
                                        style={[
                                          styles.monthlyBarChartBarTotal,
                                          { 
                                            height: Math.max(totalBarHeight, 2),
                                            position: 'absolute',
                                            bottom: 0,
                                            width: '70%',
                                            zIndex: 0,
                                            opacity: 0.3
                                          }
                                        ]}
                                      />
                                    </>
                                  )}
                                </View>
                              </View>
                              <Text style={styles.monthlyBarChartMonth}>{stat.monthName.substring(0, 3)}</Text>
                            </View>
                          );
                        });
                      })()}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Configure Animals Button */}
        <View style={styles.addAnimalTypeContainer}>
          <TouchableOpacity 
            style={styles.addAnimalTypeButton}
            onPress={() => {
              setNewEggAnimalTypeName('');
              setNewEggAnimalTypeIcon('🐔');
              setSelectedAnimalTypeToDelete(null);
              setConfigureAnimalsModalVisible(true);
            }}
          >
            <Text style={styles.addAnimalTypeButtonText}>⚙️ Configurer animaux</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMessagerie = () => {
    const filteredMessages = getFilteredMessages();
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👥 Messagerie</Text>
          <Text style={styles.sectionDescription}>
            Messages modèles pour communiquer avec vos clients : adoptions, activités, commandes
          </Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddMessageModal}>
          <Text style={styles.addButtonText}>+ Nouveau Message</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.messageCategories}>
        <View style={styles.categoryStats}>
          <TouchableOpacity 
            style={[
              styles.categoryStatItem,
              selectedCategoryFilter === 'Adoption' && styles.categoryStatItemActive
            ]}
            onPress={() => setSelectedCategoryFilter(selectedCategoryFilter === 'Adoption' ? null : 'Adoption')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.categoryStatNumber,
              selectedCategoryFilter === 'Adoption' && styles.categoryStatNumberActive
            ]}>
              {templateMessages?.filter(msg => msg?.category === 'Adoption')?.length || 0}
            </Text>
            <Text style={[
              styles.categoryStatLabel,
              selectedCategoryFilter === 'Adoption' && styles.categoryStatLabelActive
            ]}>Adoption</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.categoryStatItem,
              selectedCategoryFilter === 'Activité' && styles.categoryStatItemActive
            ]}
            onPress={() => setSelectedCategoryFilter(selectedCategoryFilter === 'Activité' ? null : 'Activité')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.categoryStatNumber,
              selectedCategoryFilter === 'Activité' && styles.categoryStatNumberActive
            ]}>
              {templateMessages?.filter(msg => msg?.category === 'Activité')?.length || 0}
            </Text>
            <Text style={[
              styles.categoryStatLabel,
              selectedCategoryFilter === 'Activité' && styles.categoryStatLabelActive
            ]}>Activité</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.categoryStatItem,
              selectedCategoryFilter === 'Commande' && styles.categoryStatItemActive
            ]}
            onPress={() => setSelectedCategoryFilter(selectedCategoryFilter === 'Commande' ? null : 'Commande')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.categoryStatNumber,
              selectedCategoryFilter === 'Commande' && styles.categoryStatNumberActive
            ]}>
              {templateMessages?.filter(msg => msg?.category === 'Commande')?.length || 0}
            </Text>
            <Text style={[
              styles.categoryStatLabel,
              selectedCategoryFilter === 'Commande' && styles.categoryStatLabelActive
            ]}>Commande</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.messagesSection}>
        <View style={styles.messagesSectionHeader}>
          <Text style={styles.messagesSectionTitle}>
            Messages Modèles
            {selectedCategoryFilter && ` (${selectedCategoryFilter})`}
          </Text>
          {selectedCategoryFilter && (
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={() => setSelectedCategoryFilter(null)}
            >
              <Text style={styles.clearFilterText}>✕ Tout afficher</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.messageList}>
          {filteredMessages?.map((item) => (
            <MessageItem key={item?.id?.toString() || Math.random().toString()} item={item} />
          )) || []}
          {filteredMessages?.length === 0 && (
            <View style={styles.emptyMessagesState}>
              <Text style={styles.emptyMessagesText}>
                {selectedCategoryFilter 
                  ? `Aucun message modèle pour la catégorie "${selectedCategoryFilter}"`
                  : 'Aucun message modèle configuré'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top * 0.8 }]} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📦 Gestion</Text>
        </View>
      </View>
      
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'productions' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('productions');
              await configService.saveProductManagementActiveTab('productions');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'productions' && styles.activeTabText]}>
              🥚 Productions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'ventes' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('ventes');
              await configService.saveProductManagementActiveTab('ventes');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'ventes' && styles.activeTabText]}>
              💰 Ventes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'activites' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('activites');
              await configService.saveProductManagementActiveTab('activites');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'activites' && styles.activeTabText]}>
              🎯 Activités
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'messagerie' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('messagerie');
              await configService.saveProductManagementActiveTab('messagerie');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'messagerie' && styles.activeTabText]}>
              👥 Messagerie
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView 
          style={styles.mainScrollView}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'productions' && renderProductions()}
          {activeTab === 'ventes' && renderVentes()}
          {activeTab === 'activites' && renderActivites()}
          {activeTab === 'messagerie' && renderMessagerie()}
        </ScrollView>

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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingProduct ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
                </Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >

              <TextInput
                style={styles.input}
                placeholder="Nom du produit"
                placeholderTextColor="#999"
                value={productForm.name}
                onChangeText={(text) => setProductForm({...productForm, name: text})}
              />

              <TextInput
                style={styles.input}
                placeholder="Prix"
                placeholderTextColor="#999"
                value={productForm.price}
                onChangeText={(text) => setProductForm({...productForm, price: text})}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Quantité"
                placeholderTextColor="#999"
                value={productForm.quantity}
                onChangeText={(text) => setProductForm({...productForm, quantity: text})}
                keyboardType="number-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Unité (kg, têtes, boîtes, etc.)"
                placeholderTextColor="#999"
                value={productForm.unit}
                onChangeText={(text) => setProductForm({...productForm, unit: text})}
              />

              <TextInput
                style={styles.input}
                placeholder="Catégorie"
                placeholderTextColor="#999"
                value={productForm.category}
                onChangeText={(text) => setProductForm({...productForm, category: text})}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optionnel)"
                placeholderTextColor="#999"
                value={productForm.description}
                onChangeText={(text) => setProductForm({...productForm, description: text})}
                multiline={true}
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={saveProduct}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    {editingProduct ? 'Modifier' : 'Sauvegarder'}
                  </Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Message Template Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={messageModalVisible}
          onRequestClose={() => setMessageModalVisible(false)}
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingMessage ? 'Modifier le message' : 'Nouveau message modèle'}
                </Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setMessageModalVisible(false)}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >

              <TextInput
                style={styles.input}
                placeholder="Titre du message *"
                placeholderTextColor="#999"
                value={messageForm.title}
                onChangeText={(text) => setMessageForm({...messageForm, title: text})}
              />

              <View style={styles.categorySelector}>
                <Text style={styles.inputLabel}>Catégorie:</Text>
                <View style={styles.categoryOptions}>
                  {['Adoption', 'Activité', 'Commande'].map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        messageForm.category === category && styles.categoryOptionSelected
                      ]}
                      onPress={() => setMessageForm({...messageForm, category})}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        messageForm.category === category && styles.categoryOptionTextSelected
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Contenu du message *"
                placeholderTextColor="#999"
                value={messageForm.content}
                onChangeText={(text) => setMessageForm({...messageForm, content: text})}
                multiline={true}
                numberOfLines={8}
              />

              <View style={styles.variableHelper}>
                <Text style={styles.variableHelperTitle}>Variables disponibles:</Text>
                <Text style={styles.variableHelperText}>
                  {'{nom}'} - Nom du client{'\n'}
                  {'{date}'} - Date{'\n'}
                  {'{heure}'} - Heure{'\n'}
                  {'{quantite}'} - Quantité{'\n'}
                  {'{race}'} - Race d'animal
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={saveMessage}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    {editingMessage ? 'Modifier' : 'Sauvegarder'}
                  </Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>


        {/* Template Settings Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={templateSettingsModal}
          onRequestClose={() => setTemplateSettingsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.pricingModalHeader}>
                <View style={styles.pricingModalHeaderTop}>
                  <Text style={styles.modalTitle}>⚙️ Configuration Grille Tarifaire</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {Object.keys(pricingGrids).length > 1 && (
                      <TouchableOpacity 
                        style={styles.copyGridButton}
                        onPress={() => setCopyGridModal(true)}
                      >
                        <Text style={styles.copyGridButtonText}>📋 Copier</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.modalCloseBtn}
                      onPress={() => setTemplateSettingsModal(false)}
                    >
                      <Text style={styles.modalCloseBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.templateDescription}>
                  Modifiez la grille tarifaire pour <Text style={styles.animalTypeHighlight}>{selectedAnimalType}</Text> :
                </Text>
              </View>
              
              <View style={styles.pricingTableContainer}>
                <View style={styles.pricingTableHeader}>
                  <View style={styles.pricingTableHeaderCellFixed}><Text style={styles.pricingTableHeaderText}>Mois</Text></View>
                  <View style={styles.pricingTableHeaderCellFixed}><Text style={styles.pricingTableHeaderText}>Sem.</Text></View>
                  <View style={styles.pricingTableHeaderCellFixed}><Text style={styles.pricingTableHeaderText}>Prix</Text></View>
                  <View style={styles.pricingTableHeaderCellSex}><Text style={styles.pricingTableHeaderText}>Sexe</Text></View>
                  <View style={styles.pricingTableHeaderCellDelete}></View>
                </View>
                <ScrollView style={styles.settingsScrollView} showsVerticalScrollIndicator={false}>
                  {(!pricingGrids[selectedAnimalType] || pricingGrids[selectedAnimalType].length === 0) ? (
                    <View style={styles.emptyPricingTableRow}>
                      <Text style={styles.emptyPricingTableText}>Aucune ligne</Text>
                    </View>
                  ) : (
                    (pricingGrids[selectedAnimalType] || []).map((item, index) => (
                      <View key={index} style={styles.pricingTableRow}>
                        <View style={styles.pricingTableCellFixed}>
                          <TextInput
                            style={styles.pricingTableInput}
                            value={item.ageMonths ? item.ageMonths.toString() : ''}
                            onChangeText={(text) => updatePricingGrid(index, 'ageMonths', parseFloat(text) || 0)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#999"
                          />
                        </View>
                        <View style={styles.pricingTableCellFixed}>
                          <TextInput
                            style={styles.pricingTableInput}
                            value={item.ageWeeks ? item.ageWeeks.toString() : ''}
                            onChangeText={(text) => updatePricingGrid(index, 'ageWeeks', parseFloat(text) || 0)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#999"
                          />
                        </View>
                        <View style={styles.pricingTableCellFixed}>
                          <TextInput
                            style={styles.pricingTableInput}
                            value={item.price.toString()}
                            onChangeText={(text) => updatePricingGrid(index, 'price', parseFloat(text) || 0)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#999"
                          />
                        </View>
                        <View style={styles.pricingTableCellSex}>
                          <View style={styles.pricingTableSexContainer}>
                            {['Tous', 'F', 'M'].map((sex) => {
                              const fullSex = sex === 'F' ? 'Femelle' : sex === 'M' ? 'Mâle' : 'Tous';
                              const isSelected = item.sex === fullSex;
                              return (
                                <TouchableOpacity
                                  key={sex}
                                  style={[
                                    styles.pricingTableSexOption,
                                    isSelected && styles.pricingTableSexOptionSelected
                                  ]}
                                  onPress={() => updatePricingGrid(index, 'sex', fullSex)}
                                >
                                  <Text style={[
                                    styles.pricingTableSexText,
                                    isSelected && styles.pricingTableSexTextSelected
                                  ]}>
                                    {sex}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                        <View style={styles.pricingTableCellDelete}>
                          <TouchableOpacity 
                            style={styles.pricingTableDeleteButton}
                            onPress={() => removePricingRow(index)}
                          >
                            <Text style={styles.pricingTableDeleteText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
                <TouchableOpacity style={styles.addRowButton} onPress={addPricingRow}>
                  <Text style={styles.addRowButtonText}>+ Ajouter</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setTemplateSettingsModal(false)}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={async () => {
                    try {
                      await database.savePricingGrid(selectedAnimalType, pricingGrids[selectedAnimalType] || []);
                      setTemplateSettingsModal(false);
                      Alert.alert('Succès', `Grille tarifaire ${selectedAnimalType} sauvegardée avec succès!`);
                    } catch (error) {
                      console.error('Error saving pricing grid:', error);
                      Alert.alert('Erreur', 'Impossible de sauvegarder la grille tarifaire');
                    }
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    Sauvegarder
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* New Animal Type Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={newAnimalTypeModal}
          onRequestClose={() => setNewAnimalTypeModal(false)}
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
                <Text style={styles.modalTitle}>🆕 Nouveau Type d'Animal</Text>
                
                <Text style={styles.templateDescription}>
                  Créez une nouvelle grille tarifaire pour un type d'animal :
                </Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Canards, Oies, Chèvres, Lapins..."
                  placeholderTextColor="#999"
                  value={newAnimalTypeName}
                  onChangeText={setNewAnimalTypeName}
                />

                {Object.keys(pricingGrids).length > 0 && (
                  <>
                    <Text style={styles.inputLabel}>Ou copier depuis une grille existante (optionnel) :</Text>
                    <ScrollView 
                      style={styles.copyFromSelector}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      <TouchableOpacity
                        style={[
                          styles.copyFromOption,
                          !copyFromAnimalType && styles.copyFromOptionSelected
                        ]}
                        onPress={() => setCopyFromAnimalType(null)}
                      >
                        <Text style={[
                          styles.copyFromOptionText,
                          !copyFromAnimalType && styles.copyFromOptionTextSelected
                        ]}>
                          Créer une grille vide
                        </Text>
                      </TouchableOpacity>
                      {Object.keys(pricingGrids)
                        .filter(type => type !== selectedAnimalType && pricingGrids[type] && pricingGrids[type].length > 0)
                        .map((animalType) => (
                          <TouchableOpacity
                            key={animalType}
                            style={[
                              styles.copyFromOption,
                              copyFromAnimalType === animalType && styles.copyFromOptionSelected
                            ]}
                            onPress={() => setCopyFromAnimalType(animalType)}
                          >
                            <Text style={[
                              styles.copyFromOptionText,
                              copyFromAnimalType === animalType && styles.copyFromOptionTextSelected
                            ]}>
                              📋 Copier depuis {animalType.charAt(0).toUpperCase() + animalType.slice(1)}
                              {pricingGrids[animalType] && ` (${pricingGrids[animalType].length} lignes)`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </>
                )}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => {
                    setNewAnimalTypeModal(false);
                    setNewAnimalTypeName('');
                  }}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={addNewAnimalType}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    Créer
                  </Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Copy Grid Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={copyGridModal}
          onRequestClose={() => setCopyGridModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📋 Copier une Grille Tarifaire</Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setCopyGridModal(false)}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.templateDescription}>
                Sélectionnez une grille à copier vers {selectedAnimalType} :
              </Text>
              
              <ScrollView 
                style={styles.copyGridSelector}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {Object.keys(pricingGrids)
                  .filter(type => type !== selectedAnimalType && pricingGrids[type] && pricingGrids[type].length > 0)
                  .map((animalType) => (
                    <TouchableOpacity
                      key={animalType}
                      style={styles.copyGridOption}
                      onPress={async () => {
                        await copyPricingGrid(animalType, selectedAnimalType);
                        setCopyGridModal(false);
                      }}
                    >
                      <Text style={styles.copyGridOptionText}>
                        📋 {animalType.charAt(0).toUpperCase() + animalType.slice(1)}
                      </Text>
                      <Text style={styles.copyGridOptionSubtext}>
                        {pricingGrids[animalType].length} ligne{pricingGrids[animalType].length > 1 ? 's' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                {Object.keys(pricingGrids).filter(type => type !== selectedAnimalType && pricingGrids[type] && pricingGrids[type].length > 0).length === 0 && (
                  <View style={styles.emptyCopyGridState}>
                    <Text style={styles.emptyCopyGridText}>
                      Aucune grille disponible à copier
                    </Text>
                  </View>
                )}
              </ScrollView>

            </View>
          </View>
        </Modal>

        {/* Generate Message Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={generateMessageModal}
          onRequestClose={() => {
            setGenerateMessageModal(false);
            setSelectedTemplateForGeneration(null);
            setSelectedOrderForGeneration(null);
            setGeneratedMessagePreview('');
          }}
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📨 Générer un Message</Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    setGenerateMessageModal(false);
                    setSelectedTemplateForGeneration(null);
                    setSelectedOrderForGeneration(null);
                    setGeneratedMessagePreview('');
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
                
                <Text style={styles.inputLabel}>Sélectionner un modèle :</Text>
                <ScrollView 
                  style={styles.templateSelector}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {templateMessages.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.templateOption,
                        selectedTemplateForGeneration?.id === template.id && styles.templateOptionSelected
                      ]}
                      onPress={() => setSelectedTemplateForGeneration(template)}
                    >
                      <Text style={[
                        styles.templateOptionText,
                        selectedTemplateForGeneration?.id === template.id && styles.templateOptionTextSelected
                      ]}>
                        {template.title}
                      </Text>
                      <Text style={styles.templateOptionCategory}>{template.category}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedTemplateForGeneration && (
                  <>
                    <Text style={styles.inputLabel}>Sélectionner une commande (optionnel) :</Text>
                    <ScrollView 
                      style={styles.orderSelector}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      <TouchableOpacity
                        style={[
                          styles.orderOption,
                          !selectedOrderForGeneration && styles.orderOptionSelected
                        ]}
                        onPress={() => setSelectedOrderForGeneration(null)}
                      >
                        <Text style={[
                          styles.orderOptionText,
                          !selectedOrderForGeneration && styles.orderOptionTextSelected
                        ]}>
                          Aucune commande (message générique)
                        </Text>
                      </TouchableOpacity>
                      {orders.slice(0, 10).map((order) => (
                        <TouchableOpacity
                          key={order.id}
                          style={[
                            styles.orderOption,
                            selectedOrderForGeneration?.id === order.id && styles.orderOptionSelected
                          ]}
                          onPress={() => setSelectedOrderForGeneration(order)}
                        >
                          <Text style={[
                            styles.orderOptionText,
                            selectedOrderForGeneration?.id === order.id && styles.orderOptionTextSelected
                          ]}>
                            {order.customerName} - {order.orderType} - {order.totalPrice?.toFixed(2)}€
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.inputLabel}>Aperçu du message :</Text>
                    <View style={styles.messagePreviewContainer}>
                      <Text style={styles.messagePreviewText}>
                        {generatedMessagePreview || selectedTemplateForGeneration.content}
                      </Text>
                    </View>
                  </>
                )}

                <View style={styles.modalActions}>
                  {generatedMessagePreview && (
                    <>
                      <TouchableOpacity 
                        style={[styles.modalBtn, styles.copyBtn]}
                        onPress={handleCopyGeneratedMessage}
                      >
                        <Text style={[styles.modalBtnText, { color: 'white' }]}>
                          📋 Copier
                        </Text>
                      </TouchableOpacity>
                      {selectedOrderForGeneration && (
                        <TouchableOpacity 
                          style={[styles.modalBtn, styles.sendBtn]}
                          onPress={handleSendGeneratedMessage}
                        >
                          <Text style={[styles.modalBtnText, { color: 'white' }]}>
                            📧 Envoyer
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Egg Production Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={productionModalVisible}
          onRequestClose={() => setProductionModalVisible(false)}
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Production d'Œufs - {toFrenchDate(selectedProductionDate)}
                </Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtn}
                  onPress={() => setProductionModalVisible(false)}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >

                {eggAnimalTypes.map(type => (
                  <View key={type.key} style={styles.productionInputGroup}>
                    <Text style={styles.inputLabel}>
                      {type.icon} {type.label}
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nombre d'œufs"
                      placeholderTextColor="#999"
                      value={productionForm[type.key] || '0'}
                      onChangeText={(text) => setProductionForm({
                        ...productionForm,
                        [type.key]: text.replace(/[^0-9]/g, '')
                      })}
                      keyboardType="number-pad"
                    />
                  </View>
                ))}

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.saveBtn]}
                    onPress={async () => {
                      try {
                        let saved = false;
                        for (const type of eggAnimalTypes) {
                          const count = parseInt(productionForm[type.key] || '0');
                          await saveEggProduction(selectedProductionDate, type.key, count);
                          if (count > 0) saved = true;
                        }
                        setProductionModalVisible(false);
                        if (saved) {
                          Alert.alert('Succès', 'Production enregistrée');
                        }
                      } catch (error) {
                        console.error('Error saving production:', error);
                        Alert.alert('Erreur', 'Impossible de sauvegarder la production');
                      }
                    }}
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

        {/* Production Month Picker Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={productionMonthPickerVisible}
          onRequestClose={() => setProductionMonthPickerVisible(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Sélectionner le mois</Text>
                <TouchableOpacity 
                  onPress={() => setProductionMonthPickerVisible(false)}
                  style={styles.pickerModalClose}
                >
                  <Text style={styles.pickerModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.pickerScrollView}
                nestedScrollEnabled={true}
                contentContainerStyle={styles.pickerScrollContent}
              >
                {MONTHS_FR.map((month, index) => {
                  const isSelected = index === getCurrentProductionMonth();
                  return (
                    <TouchableOpacity
                      key={`month-${index}`}
                      style={[
                        styles.pickerItem,
                        isSelected && styles.pickerItemSelected
                      ]}
                      onPress={() => jumpToProductionMonth(index)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        isSelected && styles.pickerItemTextSelected
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Production Year Picker Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={productionYearPickerVisible}
          onRequestClose={() => setProductionYearPickerVisible(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Sélectionner l'année</Text>
                <TouchableOpacity 
                  onPress={() => setProductionYearPickerVisible(false)}
                  style={styles.pickerModalClose}
                >
                  <Text style={styles.pickerModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerScrollView}>
                {getProductionYearRange().map((year) => {
                  const isSelected = year === getCurrentProductionYear();
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        isSelected && styles.pickerItemSelected
                      ]}
                      onPress={() => jumpToProductionYear(year)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        isSelected && styles.pickerItemTextSelected
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Single Animal Production Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={singleAnimalModalVisible}
          onRequestClose={() => {
            const count = parseInt(singleAnimalCount || '0');
            if (count > 0) {
              saveEggProduction(selectedProductionDate, singleAnimalType, count);
            }
            setSingleAnimalModalVisible(false);
            setSingleAnimalCount('');
            setSingleAnimalType(null);
          }}
        >
          <View style={styles.singleAnimalModalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                const total = parseInt(singleAnimalCount || '0');
                const rejected = parseInt(singleAnimalRejected || '0');
                if (total > 0) {
                  saveEggProduction(selectedProductionDate, singleAnimalType, total, rejected);
                }
                setSingleAnimalModalVisible(false);
                setSingleAnimalCount('');
                setSingleAnimalRejected('');
                setSingleAnimalType(null);
              }}
            />
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <TouchableOpacity 
                style={styles.singleAnimalModalContent}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.singleAnimalModalHeader}>
                  <Text style={styles.singleAnimalModalTitle}>
                    {singleAnimalType && eggAnimalTypes.find(t => t.key === singleAnimalType)?.icon} {singleAnimalType && eggAnimalTypes.find(t => t.key === singleAnimalType)?.label}
                  </Text>
                  <TouchableOpacity 
                    style={styles.singleAnimalModalClose}
                    onPress={() => {
                      const total = parseInt(singleAnimalCount || '0');
                      const rejected = parseInt(singleAnimalRejected || '0');
                      if (total > 0) {
                        saveEggProduction(selectedProductionDate, singleAnimalType, total, rejected);
                      }
                      setSingleAnimalModalVisible(false);
                      setSingleAnimalCount('');
                      setSingleAnimalRejected('');
                      setSingleAnimalType(null);
                    }}
                  >
                    <Text style={styles.singleAnimalModalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.singleAnimalModalBody}>
                  <View style={styles.singleAnimalInputsRow}>
                    <View style={styles.singleAnimalInputContainer}>
                      <Text style={styles.singleAnimalInputLabel}>Total</Text>
                      <TextInput
                        ref={singleAnimalInputRef}
                        style={styles.singleAnimalInput}
                        placeholder="Total"
                        placeholderTextColor="#999"
                        value={singleAnimalCount}
                        onChangeText={(text) => setSingleAnimalCount(text.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        autoFocus={true}
                      />
                    </View>
                    <View style={styles.singleAnimalInputContainer}>
                      <Text style={styles.singleAnimalInputLabel}>Rejetés</Text>
                      <TextInput
                        ref={singleAnimalRejectedRef}
                        style={[styles.singleAnimalInput, styles.singleAnimalInputSmall]}
                        placeholder="0"
                        placeholderTextColor="#999"
                        value={singleAnimalRejected}
                        onChangeText={(text) => setSingleAnimalRejected(text.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  
                  <View style={styles.singleAnimalInfo}>
                    <Text style={styles.singleAnimalInfoText}>
                      Acceptés: {Math.max(0, (parseInt(singleAnimalCount || '0') - parseInt(singleAnimalRejected || '0')))}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.singleAnimalOkButton}
                    onPress={() => {
                      const total = parseInt(singleAnimalCount || '0');
                      const rejected = parseInt(singleAnimalRejected || '0');
                      if (total > 0) {
                        saveEggProduction(selectedProductionDate, singleAnimalType, total, rejected);
                      }
                      setSingleAnimalModalVisible(false);
                      setSingleAnimalCount('');
                      setSingleAnimalRejected('');
                      setSingleAnimalType(null);
                    }}
                  >
                    <Text style={styles.singleAnimalOkButtonText}>Ok</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Configure Animals Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={configureAnimalsModalVisible}
          onRequestClose={() => setConfigureAnimalsModalVisible(false)}
        >
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderContainer}>
                <Text style={styles.modalTitle}>⚙️ Configurer les Animaux</Text>
                <TouchableOpacity 
                  style={styles.modalCloseBtnAbsolute}
                  onPress={() => {
                    setConfigureAnimalsModalVisible(false);
                    setNewEggAnimalTypeName('');
                    setNewEggAnimalTypeIcon('🐔');
                    setSelectedAnimalTypeToDelete(null);
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
                
                {/* Add Animal Type Section */}
                <View style={styles.configureSection}>
                  <Text style={styles.configureSectionTitle}>➕ Ajouter un type d'animal</Text>
                  <Text style={styles.templateDescription}>
                    Ajoutez un nouveau type d'animal qui produit des œufs :
                  </Text>
                  
                  <Text style={styles.inputLabel}>Nom de l'animal :</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Cailles, Pintades, Autruches..."
                    placeholderTextColor="#999"
                    value={newEggAnimalTypeName}
                    onChangeText={setNewEggAnimalTypeName}
                  />

                  <Text style={styles.inputLabel}>Icône (emoji) :</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="🐔"
                    placeholderTextColor="#999"
                    value={newEggAnimalTypeIcon}
                    onChangeText={setNewEggAnimalTypeIcon}
                    maxLength={2}
                  />

                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.saveBtn, { marginTop: 10 }]}
                    onPress={addEggAnimalType}
                  >
                    <Text style={[styles.modalBtnText, { color: 'white' }]}>
                      Ajouter
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Delete Animal Type Section */}
                <View style={[styles.configureSection, { marginTop: 30, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 20 }]}>
                  <Text style={styles.configureSectionTitle}>🗑️ Supprimer un type d'animal</Text>
                  <Text style={styles.templateDescription}>
                    Sélectionnez un type d'animal à supprimer :
                  </Text>
                  
                  <Text style={styles.inputLabel}>Type d'animal à supprimer :</Text>
                  <ScrollView 
                    style={styles.animalTypeDeleteSelector}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {eggAnimalTypes.map((animalType) => (
                      <TouchableOpacity
                        key={animalType.key}
                        style={[
                          styles.animalTypeDeleteOption,
                          selectedAnimalTypeToDelete === animalType.key && styles.animalTypeDeleteOptionSelected
                        ]}
                        onPress={() => setSelectedAnimalTypeToDelete(animalType.key)}
                      >
                        <Text style={[
                          styles.animalTypeDeleteOptionText,
                          selectedAnimalTypeToDelete === animalType.key && styles.animalTypeDeleteOptionTextSelected
                        ]}>
                          {animalType.icon} {animalType.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity 
                    style={[
                      styles.modalBtn, 
                      styles.deleteBtn, 
                      { marginTop: 10 },
                      !selectedAnimalTypeToDelete && styles.modalBtnDisabled
                    ]}
                    onPress={() => deleteEggAnimalType(selectedAnimalTypeToDelete)}
                    disabled={!selectedAnimalTypeToDelete}
                  >
                    <Text style={[styles.modalBtnText, { color: 'white' }]}>
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Production Info Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={productionInfoModalVisible}
          onRequestClose={() => setProductionInfoModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.infoModalOverlay}
            activeOpacity={1}
            onPress={() => setProductionInfoModalVisible(false)}
          >
            <TouchableOpacity 
              style={styles.infoModalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.infoModalHeader}>
                <Text style={styles.infoModalTitle}>ℹ️ À propos de la Production d'Œufs</Text>
                <TouchableOpacity 
                  style={styles.infoModalClose}
                  onPress={() => setProductionInfoModalVisible(false)}
                >
                  <Text style={styles.infoModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.infoModalBody}>
                <Text style={styles.infoModalText}>
                  Cette section permet de suivre la <Text style={styles.infoModalBold}>production quotidienne d'œufs de consommation</Text> par type d'animal (poules, canards, oies, dindes, paons).
                </Text>
                <Text style={styles.infoModalText}>
                  Vous pouvez enregistrer le nombre d'œufs collectés chaque jour pour chaque type d'animal et consulter les statistiques de production (totaux quotidiens, meilleurs jours, totaux annuels et mensuels).
                </Text>
                <Text style={styles.infoModalText}>
                  <Text style={styles.infoModalBold}>🥚 Total œufs :</Text> Indique le nombre total d'œufs ramassés pour la période.
                </Text>
                <Text style={styles.infoModalText}>
                  <Text style={styles.infoModalBold}>✅ Acceptés :</Text> Nombre d'œufs considérés comme bons ou utilisables.
                </Text>
                <Text style={styles.infoModalText}>
                  <Text style={styles.infoModalBold}>❌ Rejetés :</Text> Nombre d'œufs rejetés (abîmés, fêlés ou non utilisables).
                </Text>
                <View style={styles.infoModalSeparator} />
                <Text style={styles.infoModalImportant}>
                  ⚠️ Important :
                </Text>
                <Text style={styles.infoModalText}>
                  Cette section est <Text style={styles.infoModalBold}>indépendante</Text> de la gestion des lots d'œufs fécondés. Les œufs fécondés sont gérés séparément dans la section Élevage.
                </Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
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
  primaryButton: {
    backgroundColor: '#005F6B',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
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
  pricingInstructions: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#005F6B',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#005F6B',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
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
  featureList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  productionCategories: {
    marginBottom: 10,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#666',
  },
  productsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productsSectionHeader: {
    marginBottom: 15,
  },
  productsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productsSectionSubtitle: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyProductsState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyProductsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  emptyProductsSubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  productList: {
    // Removed maxHeight to allow proper scrolling
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  activityDescription: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
  },
  activityStatus: {
    backgroundColor: '#e8f5e8',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  activityStatusText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
  messageCategories: {
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
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  categoryStatItem: {
    alignItems: 'center',
  },
  categoryStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  categoryStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
  },
  messagesSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messagesSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  messageList: {
    // Removed maxHeight to allow proper scrolling
  },
  messageCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  messageContent: {
    marginBottom: 8,
  },
  messagePreview: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  messageActions: {
    flexDirection: 'row',
    gap: 6,
  },
  copyBtn: {
    backgroundColor: '#9C27B0',
  },
  categorySelector: {
    marginBottom: 15,
  },
  categoryOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryOptionSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  categoryOptionTextSelected: {
    color: 'white',
  },
  variableHelper: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  variableHelperTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#005F6B',
    marginBottom: 6,
  },
  variableHelperText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cheeseProductCard: {
    backgroundColor: '#fff8e1',
    borderColor: '#8B4513',
    borderWidth: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productTitleSection: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  stockStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  productHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  productDetails: {
    marginBottom: 15,
  },
  productInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  productInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  productDescription: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  productDescriptionText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  productActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    padding: 6,
    borderRadius: 6,
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
    fontSize: 10,
  },
  cheeseProductNote: {
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B4513',
  },
  cheeseProductNoteText: {
    fontSize: 11,
    color: '#8B4513',
    fontWeight: '600',
    textAlign: 'center',
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
    minHeight: 80,
    textAlignVertical: 'top',
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
  modalCloseBtnAbsolute: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  adoptionPricing: {
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
  pricingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  pricingHeaderButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  configurePricingButton: {
    backgroundColor: '#FF9800',
    flex: 1,
  },
  addAnimalTypeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    flex: 1,
  },
  addAnimalTypeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  animalTypeSelector: {
    marginBottom: 12,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
  },
  animalTypeDeleteSelector: {
    marginBottom: 12,
    maxHeight: 150, // Shows approximately 3 items (each ~50px)
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
    backgroundColor: '#f8f9fa',
  },
  animalTypeDeleteOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 6,
  },
  animalTypeDeleteOptionSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  animalTypeDeleteOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  animalTypeDeleteOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  configureSection: {
    marginBottom: 20,
  },
  configureSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  animalTypeTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  animalTypeTabActive: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  animalTypeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  animalTypeTabTextActive: {
    color: 'white',
  },
  emptyPricingGrid: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  emptyPricingGridText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  emptyPricingGridSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  pricingGrid: {
    gap: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  pricingAge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  pricingPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    flex: 1,
    textAlign: 'center',
  },
  pricingSex: {
    fontSize: 11,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  templatePreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  templatePreviewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  templatePreviewText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  templateSettings: {
    marginTop: 10,
    alignItems: 'center',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  settingsIcon: {
    fontSize: 16,
  },
  settingsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  settingsScrollView: {
    maxHeight: 250,
    marginBottom: 10,
  },
  pricingTableContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  pricingTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 2,
    borderBottomColor: '#005F6B',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  pricingTableHeaderCellFixed: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingTableHeaderCellSex: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingTableHeaderCellDelete: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingTableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#005F6B',
    textAlign: 'center',
  },
  pricingTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  pricingTableCellFixed: {
    width: 60,
    paddingHorizontal: 2,
  },
  pricingTableCellSex: {
    width: 100,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingTableCellDelete: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  pricingTableInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    fontSize: 12,
    backgroundColor: 'white',
    textAlign: 'center',
  },
  pricingTableSexContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    alignItems: 'center',
  },
  pricingTableSexOption: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingTableSexOptionSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  pricingTableSexText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  pricingTableSexTextSelected: {
    color: 'white',
  },
  pricingTableDeleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingTableDeleteText: {
    fontSize: 14,
    color: '#F44336',
  },
  emptyPricingTableRow: {
    padding: 20,
    alignItems: 'center',
  },
  emptyPricingTableText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  sexSelector: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  sexOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 70,
    alignItems: 'center',
  },
  sexOptionSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  sexOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  sexOptionTextSelected: {
    color: 'white',
  },
  removeRowButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  removeRowButtonText: {
    color: 'white',
    fontSize: 14,
  },
  addRowButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  addRowButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  // Treatment styles
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
  // Saved formulas styles
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
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
    padding: 8,
  },
  deleteHerdTypeButtonText: {
    fontSize: 18,
    color: '#F44336',
  },
  // Animal Type styles (for elevage avicole)
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
  animalTypeArrow: {
    fontSize: 20,
    color: '#666',
    marginLeft: 10,
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
  addAnimalTypeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  addAnimalTypeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
  // Category filter styles
  categoryStatItemActive: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  categoryStatNumberActive: {
    color: '#2196F3',
  },
  categoryStatLabelActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  messagesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearFilterButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clearFilterText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  emptyMessagesState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyMessagesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  generateBtn: {
    backgroundColor: '#9C27B0',
  },
  // Generate Message Modal styles
  templateSelector: {
    marginBottom: 15,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
  },
  templateOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templateOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  templateOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  templateOptionTextSelected: {
    color: '#2196F3',
  },
  templateOptionCategory: {
    fontSize: 11,
    color: '#666',
  },
  orderSelector: {
    marginBottom: 15,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
  },
  orderOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderOptionSelected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  orderOptionText: {
    fontSize: 13,
    color: '#333',
  },
  orderOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  messagePreviewContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 100,
  },
  messagePreviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  sendBtn: {
    backgroundColor: '#4CAF50',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  pricingModalHeader: {
    marginBottom: 20,
  },
  pricingModalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  animalTypeHighlight: {
    fontWeight: 'bold',
    color: '#005F6B',
    textTransform: 'capitalize',
  },
  copyGridButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  copyGridButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  copyFromSelector: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 15,
  },
  copyFromOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  copyFromOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  copyFromOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  copyFromOptionTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  copyGridSelector: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 15,
  },
  copyGridOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  copyGridOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  copyGridOptionSubtext: {
    fontSize: 12,
    color: '#666',
  },
  emptyCopyGridState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyCopyGridText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Egg production styles
  productionHeaderRow: {
    marginBottom: 12,
  },
  productionTitleSection: {
    flex: 1,
  },
  productionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productionInfoButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  productionInfoIcon: {
    fontSize: 14,
  },
  compactDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 6,
  },
  compactNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactNavText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  compactNavTextDisabled: {
    color: '#ccc',
  },
  compactDateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    gap: 4,
  },
  compactDateButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  compactDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#005F6B',
  },
  compactDateDay: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
    marginLeft: 4,
  },
  compactTodayButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'center',
  },
  compactTodayButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 11,
  },
  compactStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 4,
  },
  compactStatItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  compactStatLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  compactStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
    textAlign: 'center',
  },
  compactStatValueRejected: {
    color: '#F44336',
  },
  compactStatSubtext: {
    fontSize: 8,
    color: '#999',
    marginTop: 2,
  },
  monthlyStatsContainer: {
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
  monthlyStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  monthlyStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthlyStatItem: {
    width: '22%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  monthlyStatMonth: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  monthlyStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  eggTypesStatusContainer: {
    gap: 10,
  },
  eggTypeStatusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  eggTypeStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    minHeight: 50,
  },
  eggTypeStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eggTypeIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  eggTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  eggTypeStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eggTypeCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eggTypeCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  eggTypeCountTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  eggTypeCountSeparator: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 2,
  },
  eggTypeCountAccepted: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  eggTypeCountRejected: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  eggTypeExpandIcon: {
    fontSize: 14,
    color: '#666',
    padding: 4,
  },
  eggTypeAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eggTypeAddButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addAnimalTypeContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  addAnimalTypeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addAnimalTypeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  eggTypeStatusDetails: {
    padding: 15,
    paddingTop: 0,
    backgroundColor: '#f8f9fa',
  },
  eggTypeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 4,
  },
  eggTypeStatItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  eggTypeStatLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
    height: 16,
  },
  eggTypeStatValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  eggTypeStatValueWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 32,
    width: '100%',
  },
  eggTypeStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#005F6B',
    textAlign: 'center',
    lineHeight: 20,
    height: 20,
  },
  eggTypeStatValueRejected: {
    color: '#F44336',
  },
  eggTypeStatSubtext: {
    fontSize: 9,
    color: '#999',
    marginTop: 2,
    height: 12,
    minHeight: 12,
  },
  eggTypeHistoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  eggTypeHistoryList: {
    marginBottom: 15,
  },
  eggTypeHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  eggTypeHistoryDate: {
    fontSize: 12,
    color: '#666',
  },
  eggTypeHistoryCounts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eggTypeHistoryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  eggTypeHistoryRejected: {
    color: '#F44336',
  },
  eggTypeNoHistory: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  eggTypeMonthlyStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  eggTypeMonthlyStatItem: {
    width: '22%',
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  eggTypeMonthlyStatMonth: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  eggTypeMonthlyStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#005F6B',
  },
  // Monthly bar chart styles
  monthlyBarChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 150,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  monthlyBarChartItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: 1,
    minWidth: 0,
  },
  monthlyBarChartBarContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 130,
    marginBottom: 4,
  },
  monthlyBarChartValueContainer: {
    width: '100%',
    minHeight: 32,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 2,
    position: 'relative',
  },
  monthlyBarChartValueLeft: {
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  monthlyBarChartValueRight: {
    alignItems: 'flex-end',
    paddingRight: 2,
  },
  monthlyBarChartValue: {
    fontSize: 8,
    fontWeight: '600',
    color: '#005F6B',
    textAlign: 'center',
    width: '100%',
  },
  monthlyBarChartValueLarge: {
    fontSize: 7,
    fontWeight: '600',
    color: '#005F6B',
    textAlign: 'center',
    width: '100%',
  },
  monthlyBarChartValueBreakdown: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  monthlyBarChartValueAccepted: {
    fontSize: 7,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'center',
  },
  monthlyBarChartValueRejectedText: {
    fontSize: 7,
    fontWeight: '600',
    color: '#F44336',
    textAlign: 'center',
  },
  monthlyBarChartBarWrapper: {
    width: '100%',
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 0,
    position: 'relative',
  },
  monthlyBarChartBar: {
    width: '70%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    minHeight: 2,
    maxHeight: 100,
  },
  monthlyBarChartBarTotal: {
    width: '70%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
    minHeight: 2,
    maxHeight: 100,
  },
  monthlyBarChartBarAccepted: {
    width: '70%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    minHeight: 2,
  },
  monthlyBarChartBarRejected: {
    width: '70%',
    backgroundColor: '#F44336',
    borderRadius: 4,
    minHeight: 2,
  },
  monthlyBarChartMonth: {
    fontSize: 9,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  productionInputGroup: {
    marginBottom: 15,
  },
  // Picker modal styles
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerModalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalCloseText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  pickerScrollView: {
    maxHeight: 400,
  },
  pickerScrollContent: {
    padding: 8,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemSelected: {
    backgroundColor: '#005F6B',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  pickerItemTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Single animal modal styles
  singleAnimalModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleAnimalModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '60%',
    maxWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  eggTypeCardWrapper: {
    position: 'relative',
    marginBottom: 10,
    overflow: 'visible',
  },
  eggTypeDeleteButtonContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  eggTypeDeleteButtonRevealed: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  eggTypeDeleteButtonRevealedText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  singleAnimalModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  singleAnimalModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  singleAnimalModalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleAnimalModalCloseText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  singleAnimalModalBody: {
    padding: 20,
  },
  singleAnimalInputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  singleAnimalInputsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  singleAnimalInputContainer: {
    flex: 1,
  },
  singleAnimalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: 'white',
    minHeight: 40,
  },
  singleAnimalInputSmall: {
    flex: 0.6,
  },
  singleAnimalInfo: {
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
  },
  singleAnimalInfoText: {
    fontSize: 13,
    color: '#005F6B',
    fontWeight: '500',
  },
  singleAnimalOkButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  singleAnimalOkButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Production info modal styles
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  infoModalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalCloseText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  infoModalBody: {
    padding: 16,
  },
  infoModalText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoModalBold: {
    fontWeight: 'bold',
    color: '#005F6B',
  },
  infoModalSeparator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  infoModalImportant: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
}); 