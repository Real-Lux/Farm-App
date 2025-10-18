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
import database from '../services/database';
import configService from '../services/configService';

export default function ProductManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('elevage');
  const [templateSettingsModal, setTemplateSettingsModal] = useState(false);
  const [selectedAnimalType, setSelectedAnimalType] = useState('poussins');
  const [pricingGrids, setPricingGrids] = useState({
    poussins: [
      { ageMonths: 0, price: 5, sex: 'Tous' },
      { ageMonths: 0.25, price: 7, sex: 'Tous' },
      { ageMonths: 1, price: 10, sex: 'Tous' },
      { ageMonths: 2, price: 15, sex: 'Femelle' },
      { ageMonths: 3, price: 25, sex: 'Femelle' },
      { ageMonths: 4, price: 30, sex: 'Femelle' },
      { ageMonths: 5, price: 35, sex: 'Femelle' },
      { ageMonths: 2, price: 15, sex: 'Mâle' },
    ],
    canards: [],
    oies: [],
    chèvres: []
  });
  const [newAnimalTypeModal, setNewAnimalTypeModal] = useState(false);
  const [newAnimalTypeName, setNewAnimalTypeName] = useState('');
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    quantity: '',
    unit: 'kg',
    category: 'Vegetables'
  });
  
  // Client template messages state
  const [templateMessages, setTemplateMessages] = useState([]);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [messageForm, setMessageForm] = useState({
    title: '',
    category: 'Adoption',
    content: ''
  });

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
  const [savedFormulas, setSavedFormulas] = useState([
    {
      id: 1,
      name: 'Dosage Standard',
      formula: '0.1*X',
      description: 'Calcul dosage standard 0.1ml/kg',
      example: 'X = 25 kg → 2.5 ml'
    },
    {
      id: 2,
      name: 'Concentration',
      formula: '0.21*12/X',
      description: 'Calcul de concentration',
      example: 'X = 5 ml → 0.504'
    }
  ]);
  const [saveFormulaModal, setSaveFormulaModal] = useState(false);
  const [formulaName, setFormulaName] = useState('');

  useEffect(() => {
    loadProducts();
    loadSavedFormulas();
    loadPricingGrids();
    loadConfigs();
    loadTemplateMessages();
  }, []);

  const loadConfigs = async () => {
    try {
      const activeTab = await configService.loadProductManagementActiveTab();
      const selectedAnimalType = await configService.loadProductManagementSelectedAnimalType();
      
      setActiveTab(activeTab);
      setSelectedAnimalType(selectedAnimalType);
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

  const loadPricingGrids = async () => {
    try {
      const savedGrids = await database.getAllPricingGrids();
      if (savedGrids && Object.keys(savedGrids).length > 0) {
        setPricingGrids(prev => ({ ...prev, ...savedGrids }));
      }
    } catch (error) {
      console.error('Error loading pricing grids:', error);
    }
  };

  const loadTemplateMessages = async () => {
    try {
      const messages = await database.getTemplateMessages();
      setTemplateMessages(messages);
    } catch (error) {
      console.error('Error loading template messages:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const productsData = await database.getProducts();
      setProducts(productsData);
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
      category: 'Vegetables'
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
      category: product.category
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
        description: `${productForm.unit} - ${productForm.category}`,
        price: parseFloat(productForm.price),
        quantity: parseInt(productForm.quantity),
        category: productForm.category
      };

      if (editingProduct) {
        await database.updateProduct(editingProduct.id, productData);
      } else {
        await database.addProduct(productData);
      }

      setModalVisible(false);
      loadProducts(); // Reload the list
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
            loadProducts(); // Reload the list
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
    currentGrid.push({ ageMonths: 0, price: 0, sex: 'Tous' });
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
    newGrids[animalTypeKey] = [];
    setPricingGrids(newGrids);
    setSelectedAnimalType(animalTypeKey);
    setNewAnimalTypeModal(false);
    setNewAnimalTypeName('');
    
    // Save to database
    try {
      await database.savePricingGrid(animalTypeKey, []);
    } catch (error) {
      console.error('Error saving new animal type:', error);
    }
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

  const ProductItem = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={[styles.stockStatus, { 
          color: item.quantity < 20 ? '#F44336' : '#4CAF50' 
        }]}>
          {item.quantity < 20 ? '⚠️ Stock faible' : '✅ En stock'}
        </Text>
      </View>
      
      <View style={styles.productDetails}>
        <Text style={styles.productInfo}>💰 {item.price.toFixed(2)}€ par {item.unit || 'unité'}</Text>
        <Text style={styles.productInfo}>📦 {item.quantity} {item.unit || 'unité(s)'} disponible(s)</Text>
        <Text style={styles.productInfo}>🏷️ {item.category}</Text>
      </View>

      <View style={styles.productActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionBtnText}>✏️ Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => deleteProduct(item.id)}
        >
          <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const MessageItem = ({ item }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageTitle}>{item.title}</Text>
        <View style={[styles.categoryBadge, { 
          backgroundColor: item.category === 'Adoption' ? '#4CAF50' : 
                          item.category === 'Activité' ? '#2196F3' : '#FF9800'
        }]}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>
      </View>
      
      <View style={styles.messageContent}>
        <Text style={styles.messagePreview} numberOfLines={3}>
          {item.content}
        </Text>
      </View>

      <View style={styles.messageActions}>
            <TouchableOpacity 
          style={[styles.actionBtn, styles.copyBtn]}
          onPress={() => copyToClipboard(item.content)}
        >
          <Text style={styles.actionBtnText}>📋 Copier</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditMessageModal(item)}
        >
          <Text style={styles.actionBtnText}>✏️ Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => deleteMessage(item.id)}
        >
          <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderElevageAvicole = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🐓 Élevage Avicole</Text>
        <Text style={styles.sectionDescription}>
          Gestion complète de vos volailles : poules, canards, oies, lapins
        </Text>
        <TouchableOpacity 
          style={styles.primaryButton}
              onPress={() => navigation.navigate('ElevageScreen')}
            >
          <Text style={styles.primaryButtonText}>Accéder à l'Élevage Avicole</Text>
            </TouchableOpacity>
      </View>
      
      <View style={styles.quickStats}>
        <Text style={styles.quickStatsTitle}>Statistiques Rapides</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Lots Actifs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>156</Text>
            <Text style={styles.statLabel}>Animaux Vivants</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Races Gérées</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Morts Cette Semaine</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderElevageCaprin = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🐐 Élevage Caprin</Text>
        <Text style={styles.sectionDescription}>
          Gestion des chèvres et brebis : naissances, production laitière, généalogie
        </Text>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('CaprinScreen')}
        >
          <Text style={styles.primaryButtonText}>Accéder à l'Élevage Caprin</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.featureList}>
        <Text style={styles.featureListTitle}>Fonctionnalités disponibles :</Text>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>👶</Text>
          <Text style={styles.featureText}>Gestion des naissances et nommage</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🥛</Text>
          <Text style={styles.featureText}>Suivi de production laitière</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureText}>Statistiques par groupe</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📜</Text>
          <Text style={styles.featureText}>Historique de vie complet</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🌳</Text>
          <Text style={styles.featureText}>Arbre généalogique</Text>
        </View>
      </View>
    </View>
  );

  const renderProductions = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🥚 Productions</Text>
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
      
      <View style={styles.productionCategories}>
        <TouchableOpacity style={styles.categoryCard}>
          <Text style={styles.categoryIcon}>🥚</Text>
          <Text style={styles.categoryTitle}>Œufs de Consommation</Text>
          <Text style={styles.categoryDescription}>Gestion des œufs frais</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.categoryCard} onPress={() => setActiveTab('adoptions')}>
          <Text style={styles.categoryIcon}>🐣</Text>
          <Text style={styles.categoryTitle}>Adoptions Poussins</Text>
          <Text style={styles.categoryDescription}>Vente de poussins par âge</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.categoryCard}>
          <Text style={styles.categoryIcon}>🧀</Text>
          <Text style={styles.categoryTitle}>Fromage de Chèvre</Text>
          <Text style={styles.categoryDescription}>Produits laitiers</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.adoptionPricing}>
        <View style={styles.pricingHeader}>
          <Text style={styles.pricingTitle}>🐣 Grilles Tarifaires Adoptions</Text>
          <View style={styles.pricingHeaderButtons}>
            <TouchableOpacity 
              style={styles.configurePricingButton}
              onPress={openTemplateSettings}
            >
              <Text style={styles.configurePricingButtonText}>⚙️ Configurer Prix</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addAnimalTypeButton}
              onPress={() => setNewAnimalTypeModal(true)}
            >
              <Text style={styles.addAnimalTypeButtonText}>+ Nouveau Type</Text>
            </TouchableOpacity>
          </View>
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
                  {item.ageMonths === 0 ? 'Naissance' : 
                   item.ageMonths < 1 ? `${(item.ageMonths * 4).toFixed(0)} semaines` :
                   `${item.ageMonths} mois`}
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
        <Text style={styles.productsSectionTitle}>Produits Actuels</Text>
        {products.map((item) => (
          <ProductItem key={item.id.toString()} item={item} />
        ))}
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


  const renderClient = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>👥 Gestion Client</Text>
        <Text style={styles.sectionDescription}>
          Messages modèles pour communiquer avec vos clients : adoptions, activités, commandes
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddMessageModal}>
          <Text style={styles.addButtonText}>+ Nouveau Message</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.messageCategories}>
        <View style={styles.categoryStats}>
          <View style={styles.categoryStatItem}>
            <Text style={styles.categoryStatNumber}>
              {templateMessages.filter(msg => msg.category === 'Adoption').length}
            </Text>
            <Text style={styles.categoryStatLabel}>Adoption</Text>
          </View>
          <View style={styles.categoryStatItem}>
            <Text style={styles.categoryStatNumber}>
              {templateMessages.filter(msg => msg.category === 'Activité').length}
            </Text>
            <Text style={styles.categoryStatLabel}>Activité</Text>
          </View>
          <View style={styles.categoryStatItem}>
            <Text style={styles.categoryStatNumber}>
              {templateMessages.filter(msg => msg.category === 'Commande').length}
            </Text>
            <Text style={styles.categoryStatLabel}>Commande</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.messagesSection}>
        <Text style={styles.messagesSectionTitle}>Messages Modèles</Text>
        <View style={styles.messageList}>
          {templateMessages.map((item) => (
            <MessageItem key={item.id.toString()} item={item} />
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top }]} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🏡 Gestion de la Ferme</Text>
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
            await configService.saveProductManagementActiveTab('elevage');
          }}
        >
            <Text style={[styles.tabText, activeTab === 'elevage' && styles.activeTabText]}>
              🐓 Avicole
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'caprin' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('caprin');
              await configService.saveProductManagementActiveTab('caprin');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'caprin' && styles.activeTabText]}>
              🐐 Caprin
            </Text>
          </TouchableOpacity>
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
            style={[styles.tab, activeTab === 'traitements' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('traitements');
              await configService.saveProductManagementActiveTab('traitements');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'traitements' && styles.activeTabText]}>
              💊 Traitements
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'client' && styles.activeTab]}
            onPress={async () => {
              setActiveTab('client');
              await configService.saveProductManagementActiveTab('client');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'client' && styles.activeTabText]}>
              👥 Client
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
          {activeTab === 'caprin' && renderElevageCaprin()}
          {activeTab === 'productions' && renderProductions()}
          {activeTab === 'activites' && renderActivites()}
          {activeTab === 'traitements' && renderTraitements()}
          {activeTab === 'client' && renderClient()}
        </ScrollView>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Modifier le produit' : 'Ajouter un nouveau produit'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Nom du produit"
                value={productForm.name}
                onChangeText={(text) => setProductForm({...productForm, name: text})}
              />

              <TextInput
                style={styles.input}
                placeholder="Prix"
                value={productForm.price}
                onChangeText={(text) => setProductForm({...productForm, price: text})}
                keyboardType="decimal-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Quantité"
                value={productForm.quantity}
                onChangeText={(text) => setProductForm({...productForm, quantity: text})}
                keyboardType="number-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Unité (kg, têtes, boîtes, etc.)"
                value={productForm.unit}
                onChangeText={(text) => setProductForm({...productForm, unit: text})}
              />

              <TextInput
                style={styles.input}
                placeholder="Catégorie"
                value={productForm.category}
                onChangeText={(text) => setProductForm({...productForm, category: text})}
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
                  onPress={saveProduct}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    {editingProduct ? 'Modifier' : 'Sauvegarder'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Message Template Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={messageModalVisible}
          onRequestClose={() => setMessageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingMessage ? 'Modifier le message' : 'Nouveau message modèle'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Titre du message *"
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
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setMessageModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={saveMessage}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>
                    {editingMessage ? 'Modifier' : 'Sauvegarder'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
              <Text style={styles.modalTitle}>⚙️ Configuration Grille Tarifaire</Text>
              
              <Text style={styles.templateDescription}>
                Modifiez la grille tarifaire pour {selectedAnimalType} :
              </Text>
              
              <ScrollView style={styles.settingsScrollView} showsVerticalScrollIndicator={false}>
                {(pricingGrids[selectedAnimalType] || []).map((item, index) => (
                  <View key={index} style={styles.settingsRow}>
                    <View style={styles.settingsInputGroup}>
                      <Text style={styles.settingsLabel}>Âge (mois):</Text>
                      <TextInput
                        style={styles.settingsInput}
                        value={item.ageMonths ? item.ageMonths.toString() : ''}
                        onChangeText={(text) => updatePricingGrid(index, 'ageMonths', parseFloat(text) || 0)}
                        keyboardType="numeric"
                        placeholder="Ex: 1, 2, 3"
                      />
                    </View>
                    <View style={styles.settingsInputGroup}>
                      <Text style={styles.settingsLabel}>Prix (€):</Text>
                      <TextInput
                        style={styles.settingsInput}
                        value={item.price.toString()}
                        onChangeText={(text) => updatePricingGrid(index, 'price', parseFloat(text) || 0)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.settingsInputGroup}>
                      <Text style={styles.settingsLabel}>Sexe:</Text>
                      <View style={styles.sexSelector}>
                        {['Tous', 'Femelle', 'Mâle'].map((sex) => (
                          <TouchableOpacity
                            key={sex}
                            style={[
                              styles.sexOption,
                              item.sex === sex && styles.sexOptionSelected
                            ]}
                            onPress={() => updatePricingGrid(index, 'sex', sex)}
                          >
                            <Text style={[
                              styles.sexOptionText,
                              item.sex === sex && styles.sexOptionTextSelected
                            ]}>
                              {sex}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.removeRowButton}
                      onPress={() => removePricingRow(index)}
                    >
                      <Text style={styles.removeRowButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                
                <TouchableOpacity style={styles.addRowButton} onPress={addPricingRow}>
                  <Text style={styles.addRowButtonText}>+ Ajouter une ligne</Text>
                </TouchableOpacity>
              </ScrollView>

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

        {/* Treatment Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={treatmentModal}
          onRequestClose={() => setTreatmentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {treatmentType === 'dosage' ? '💉 Calcul de Dosage' : '🧮 Formule Personnalisée'}
              </Text>

              {treatmentType === 'dosage' ? (
                <>
                  <View style={styles.dosageSection}>
                    <Text style={styles.sectionSubtitle}>Paramètres de dosage :</Text>
                    
                    <TextInput
                      style={styles.input}
                      placeholder="Dosage par kg (ex: 0.1)"
                      value={dosageForm.dosagePerKg}
                      onChangeText={(text) => setDosageForm({...dosageForm, dosagePerKg: text})}
                      keyboardType="decimal-pad"
                    />
                    
                    <TextInput
                      style={styles.input}
                      placeholder="Concentration (mg/ml ou %) - optionnel"
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
                          value={animal.name}
                          onChangeText={(text) => updateAnimal(animal.id, 'name', text)}
                        />
                        <TextInput
                          style={[styles.input, styles.animalWeightInput]}
                          placeholder="Poids (kg)"
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

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setTreatmentModal(false)}
                >
                  <Text style={styles.modalBtnText}>Fermer</Text>
                </TouchableOpacity>
              </View>
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>💾 Sauvegarder Formule</Text>
              
              <Text style={styles.saveFormulaDescription}>
                Donnez un nom à votre formule pour la retrouver facilement :
              </Text>
              
              <TextInput
                style={styles.input}
                placeholder="Nom de la formule (ex: Dosage Antibiotique)"
                value={formulaName}
                onChangeText={setFormulaName}
              />
              
              <View style={styles.formulaPreview}>
                <Text style={styles.formulaPreviewTitle}>Formule à sauvegarder :</Text>
                <Text style={styles.formulaPreviewText}>{formulaForm.formula}</Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setSaveFormulaModal(false)}
                >
                  <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={saveFormula}
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🆕 Nouveau Type d'Animal</Text>
              
              <Text style={styles.templateDescription}>
                Créez une nouvelle grille tarifaire pour un type d'animal :
              </Text>
              
              <TextInput
                style={styles.input}
                placeholder="Ex: Canards, Oies, Chèvres, Lapins..."
                value={newAnimalTypeName}
                onChangeText={setNewAnimalTypeName}
              />

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
    backgroundColor: '#005F6B',
    paddingTop: 15,
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
    paddingVertical: 8,
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
  productsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
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
    gap: 8,
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
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stockStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  productDetails: {
    marginBottom: 15,
  },
  productInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  productActions: {
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
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  pricingHeaderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  configurePricingButton: {
    backgroundColor: '#FF9800',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  configurePricingButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  addAnimalTypeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addAnimalTypeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  animalTypeSelector: {
    marginBottom: 12,
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
    maxHeight: 300,
    marginBottom: 15,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  settingsInputGroup: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  settingsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    backgroundColor: '#f9f9f9',
  },
  sexSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  sexOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sexOptionSelected: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  sexOptionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  sexOptionTextSelected: {
    color: 'white',
  },
  removeRowButton: {
    backgroundColor: '#F44336',
    borderRadius: 4,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  removeRowButtonText: {
    color: 'white',
    fontSize: 12,
  },
  addRowButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
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
}); 