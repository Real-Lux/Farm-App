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
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import database from '../services/database';
import configService from '../services/configService';
import { toISODate, getTodayISO, formatForCalendar } from '../utils/dateUtils';

export default function CheeseScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('production');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('cheese'); // 'cheese', 'recipe'
  const [editingItem, setEditingItem] = useState(null);
  const [calendarModal, setCalendarModal] = useState(false);
  const [calendarField, setCalendarField] = useState('');
  const [milkData, setMilkData] = useState([]);
  const [cheeseProductions, setCheeseProductions] = useState([]);
  const [cheeseRecipes, setCheeseRecipes] = useState([]);
  const [cheeseSettings, setCheeseSettings] = useState({
    defaultRendementFromageFrais: 20, // 20% theoretical yield
    defaultRendementTomme: 10, // 10% theoretical yield
    graphPeriod: 30
  });

  const [cheeseForm, setCheeseForm] = useState({
    date: getTodayISO(),
    cheeseType: 'fromage_frais', // 'fromage_frais', 'tomme'
    milkQuantity: '',
    theoreticalYield: '',
    practicalYield: '',
    notes: '',
    recipeId: ''
  });

  const [recipeForm, setRecipeForm] = useState({
    name: '',
    cheeseType: 'fromage_frais',
    size: '50g', // '50g', '120g'
    flavor: 'nature', // 'nature', 'fines_herbes', 'tomate_pesto', 'caramel_beurre_sale', 'au_lars', 'figue_noix'
    price: '',
    description: ''
  });

  useEffect(() => {
    loadMilkData();
    loadCheeseProductions();
    loadCheeseRecipes();
    loadCheeseSettings();
  }, []);

  const loadMilkData = async () => {
    try {
      const caprinSettings = await database.getCaprinSettings();
      setMilkData(caprinSettings.groupMilkProduction || []);
    } catch (error) {
      console.error('Error loading milk data:', error);
    }
  };

  const loadCheeseProductions = async () => {
    try {
      const productions = await database.getCheeseProductions();
      setCheeseProductions(productions);
    } catch (error) {
      console.error('Error loading cheese productions:', error);
    }
  };

  const loadCheeseRecipes = async () => {
    try {
      const recipes = await database.getCheeseRecipes();
      setCheeseRecipes(recipes);
    } catch (error) {
      console.error('Error loading cheese recipes:', error);
    }
  };

  const loadCheeseSettings = async () => {
    try {
      const settings = await database.getCheeseSettings();
      setCheeseSettings(settings);
    } catch (error) {
      console.error('Error loading cheese settings:', error);
    }
  };

  const openAddCheeseModal = () => {
    setEditingItem(null);
    setModalType('cheese');
    setCheeseForm({
      date: getTodayISO(),
      cheeseType: 'fromage_frais',
      milkQuantity: '',
      theoreticalYield: '',
      practicalYield: '',
      notes: '',
      recipeId: ''
    });
    setModalVisible(true);
  };

  const openAddRecipeModal = () => {
    setEditingItem(null);
    setModalType('recipe');
    setRecipeForm({
      name: '',
      cheeseType: 'fromage_frais',
      size: '50g',
      flavor: 'nature',
      price: '',
      description: ''
    });
    setModalVisible(true);
  };

  const openEditCheeseModal = (production) => {
    setEditingItem(production);
    setModalType('cheese');
    setCheeseForm({
      date: production.date,
      cheeseType: production.cheeseType,
      milkQuantity: production.milkQuantity.toString(),
      theoreticalYield: production.theoreticalYield.toString(),
      practicalYield: production.practicalYield.toString(),
      notes: production.notes || '',
      recipeId: production.recipeId || ''
    });
    setModalVisible(true);
  };

  const openEditRecipeModal = (recipe) => {
    setEditingItem(recipe);
    setModalType('recipe');
    setRecipeForm({
      name: recipe.name,
      cheeseType: recipe.cheeseType,
      size: recipe.size,
      flavor: recipe.flavor,
      price: recipe.price.toString(),
      description: recipe.description || ''
    });
    setModalVisible(true);
  };

  const openCalendarModal = (field) => {
    setCalendarField(field);
    setCalendarModal(true);
  };

  const handleDateSelect = (day) => {
    setCheeseForm({...cheeseForm, [calendarField]: day.dateString});
    setCalendarModal(false);
  };

  const saveCheeseProduction = async () => {
    if (!cheeseForm.date || !cheeseForm.cheeseType || !cheeseForm.milkQuantity || !cheeseForm.practicalYield) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const productionData = {
        ...cheeseForm,
        milkQuantity: parseFloat(cheeseForm.milkQuantity),
        theoreticalYield: parseFloat(cheeseForm.theoreticalYield) || 0,
        practicalYield: parseFloat(cheeseForm.practicalYield),
        rendementRatio: parseFloat(cheeseForm.practicalYield) / parseFloat(cheeseForm.milkQuantity) * 100
      };

      if (editingItem) {
        await database.updateCheeseProduction(editingItem.id, productionData);
      } else {
        await database.addCheeseProduction(productionData);
      }

      setModalVisible(false);
      loadCheeseProductions();
    } catch (error) {
      console.error('Error saving cheese production:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la production');
    }
  };

  const saveRecipe = async () => {
    if (!recipeForm.name || !recipeForm.price) {
      Alert.alert('Erreur', 'Veuillez remplir le nom et le prix');
      return;
    }

    try {
      const recipeData = {
        ...recipeForm,
        price: parseFloat(recipeForm.price)
      };

      if (editingItem) {
        await database.updateCheeseRecipe(editingItem.id, recipeData);
      } else {
        await database.addCheeseRecipe(recipeData);
      }

      setModalVisible(false);
      loadCheeseRecipes();
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la recette');
    }
  };

  const deleteCheeseProduction = (id) => {
    Alert.alert(
      'Supprimer la production',
      'Êtes-vous sûr de vouloir supprimer cette production?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await database.deleteCheeseProduction(id);
            loadCheeseProductions();
          } catch (error) {
            console.error('Error deleting production:', error);
            Alert.alert('Erreur', 'Impossible de supprimer la production');
          }
        }}
      ]
    );
  };

  const deleteRecipe = (id) => {
    Alert.alert(
      'Supprimer la recette',
      'Êtes-vous sûr de vouloir supprimer cette recette?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await database.deleteCheeseRecipe(id);
            loadCheeseRecipes();
          } catch (error) {
            console.error('Error deleting recipe:', error);
            Alert.alert('Erreur', 'Impossible de supprimer la recette');
          }
        }}
      ]
    );
  };

  const getTotalMilkUsed = () => {
    return cheeseProductions.reduce((total, production) => total + production.milkQuantity, 0);
  };

  const getTotalCheeseProduced = () => {
    return cheeseProductions.reduce((total, production) => total + production.practicalYield, 0);
  };

  const getAverageRendement = () => {
    if (cheeseProductions.length === 0) return 0;
    const totalRendement = cheeseProductions.reduce((total, production) => total + production.rendementRatio, 0);
    return (totalRendement / cheeseProductions.length).toFixed(1);
  };

  const getFromageFraisProductions = () => {
    return cheeseProductions.filter(p => p.cheeseType === 'fromage_frais');
  };

  const getTommeProductions = () => {
    return cheeseProductions.filter(p => p.cheeseType === 'tomme');
  };

  const getWeeklyProduction = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoISO = oneWeekAgo.toISOString().split('T')[0];
    
    return cheeseProductions
      .filter(production => production.date >= oneWeekAgoISO)
      .reduce((total, production) => total + production.practicalYield, 0);
  };

  const getMonthlyProduction = () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const oneMonthAgoISO = oneMonthAgo.toISOString().split('T')[0];
    
    return cheeseProductions
      .filter(production => production.date >= oneMonthAgoISO)
      .reduce((total, production) => total + production.practicalYield, 0);
  };

  const getLast30DaysData = () => {
    const last30Days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateISO = date.toISOString().split('T')[0];
      
      const dayData = cheeseProductions.find(production => production.date === dateISO);
      last30Days.push({
        date: dateISO,
        total: dayData ? dayData.practicalYield : 0
      });
    }
    
    return last30Days;
  };

  const getMaxDailyProduction = () => {
    const last30Days = getLast30DaysData();
    return Math.max(...last30Days.map(day => day.total), 1);
  };

  const CheeseProductionItem = ({ item }) => (
    <View style={styles.productionCard}>
      <View style={styles.productionHeader}>
        <Text style={styles.productionDate}>📅 {item.date}</Text>
        <Text style={styles.productionType}>
          {item.cheeseType === 'fromage_frais' ? '🧀 Fromage Frais' : '🧀 Tomme'}
        </Text>
      </View>
      
      <View style={styles.productionDetails}>
        <View style={styles.productionInfoRow}>
          <Text style={styles.productionInfoLabel}>Lait utilisé:</Text>
          <Text style={styles.productionInfoValue}>{item.milkQuantity}L</Text>
        </View>
        <View style={styles.productionInfoRow}>
          <Text style={styles.productionInfoLabel}>Rendement théorique:</Text>
          <Text style={styles.productionInfoValue}>{item.theoreticalYield}%</Text>
        </View>
        <View style={styles.productionInfoRow}>
          <Text style={styles.productionInfoLabel}>Production réelle:</Text>
          <Text style={styles.productionInfoValue}>{item.practicalYield}kg</Text>
        </View>
        <View style={styles.productionInfoRow}>
          <Text style={styles.productionInfoLabel}>Rendement réel:</Text>
          <Text style={[styles.productionInfoValue, { 
            color: item.rendementRatio >= item.theoreticalYield ? '#4CAF50' : '#F44336' 
          }]}>
            {item.rendementRatio.toFixed(1)}%
          </Text>
        </View>
        {item.notes && (
          <Text style={styles.productionNotes}>Notes: {item.notes}</Text>
        )}
      </View>

      <View style={styles.productionActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditCheeseModal(item)}
        >
          <Text style={styles.actionBtnText}>✏️ Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => deleteCheeseProduction(item.id)}
        >
          <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const RecipeItem = ({ item }) => (
    <View style={styles.recipeCard}>
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeName}>{item.name}</Text>
        <Text style={styles.recipePrice}>{item.price}€</Text>
      </View>
      
      <View style={styles.recipeDetails}>
        <Text style={styles.recipeInfo}>
          {item.cheeseType === 'fromage_frais' ? '🧀 Fromage Frais' : '🧀 Tomme'} • {item.size}
        </Text>
        <Text style={styles.recipeInfo}>
          {item.flavor === 'nature' ? 'Nature' :
           item.flavor === 'fines_herbes' ? 'Fines Herbes' :
           item.flavor === 'tomate_pesto' ? 'Tomate Pesto' :
           item.flavor === 'caramel_beurre_sale' ? 'Caramel Beurre Salé' :
           item.flavor === 'au_lars' ? 'Au Lars' : 'Figue Noix'}
        </Text>
        {item.description && (
          <Text style={styles.recipeDescription}>{item.description}</Text>
        )}
      </View>

      <View style={styles.recipeActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditRecipeModal(item)}
        >
          <Text style={styles.actionBtnText}>✏️ Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => deleteRecipe(item.id)}
        >
          <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProduction = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.quickStats}>
        <Text style={styles.quickStatsTitle}>Statistiques de Production</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getTotalMilkUsed().toFixed(1)}L</Text>
            <Text style={styles.statLabel}>Lait Utilisé</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getTotalCheeseProduced().toFixed(1)}kg</Text>
            <Text style={styles.statLabel}>Fromage Produit</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getAverageRendement()}%</Text>
            <Text style={styles.statLabel}>Rendement Moyen</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getFromageFraisProductions().length}</Text>
            <Text style={styles.statLabel}>Fromages Frais</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getTommeProductions().length}</Text>
            <Text style={styles.statLabel}>Tommes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getWeeklyProduction().toFixed(1)}kg</Text>
            <Text style={styles.statLabel}>Cette Semaine</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.productionSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🧀 Productions de Fromage</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddCheeseModal}>
            <Text style={styles.addButtonText}>+ Nouvelle Production</Text>
          </TouchableOpacity>
        </View>
        
        {cheeseProductions.length > 0 ? (
          cheeseProductions.slice().reverse().map((production) => (
            <CheeseProductionItem key={production.id} item={production} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucune production enregistrée</Text>
            <Text style={styles.emptyStateSubtext}>
              Commencez par ajouter votre première production de fromage
            </Text>
          </View>
        )}
      </View>

      {/* Production Graph */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📈 Production des 30 derniers jours</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.graphScrollContainer}>
          <View style={styles.graphContainer}>
            <View style={styles.yAxisContainer}>
              <Text style={styles.yAxisLabel}>{getMaxDailyProduction().toFixed(0)}kg</Text>
              <Text style={styles.yAxisLabel}>{(getMaxDailyProduction() * 0.75).toFixed(0)}kg</Text>
              <Text style={styles.yAxisLabel}>{(getMaxDailyProduction() * 0.5).toFixed(0)}kg</Text>
              <Text style={styles.yAxisLabel}>{(getMaxDailyProduction() * 0.25).toFixed(0)}kg</Text>
              <Text style={styles.yAxisLabel}>0kg</Text>
            </View>
            
            <View style={styles.dailyGraph}>
              {getLast30DaysData().map((day, index) => (
                <View key={index} style={styles.graphBar}>
                  <View 
                    style={[
                      styles.graphBarFill, 
                      { height: Math.max(8, (day.total / getMaxDailyProduction()) * 80) }
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

  const renderRecipes = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.recipesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 Recettes de Fromage</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddRecipeModal}>
            <Text style={styles.addButtonText}>+ Nouvelle Recette</Text>
          </TouchableOpacity>
        </View>
        
        {cheeseRecipes.length > 0 ? (
          cheeseRecipes.map((recipe) => (
            <RecipeItem key={recipe.id} item={recipe} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucune recette configurée</Text>
            <Text style={styles.emptyStateSubtext}>
              Créez vos recettes pour gérer les prix de vente
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
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
          <Text style={styles.headerTitle}>🧀 Production Fromage</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>{cheeseProductions.length} productions</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'production' && styles.activeTab]}
          onPress={() => setActiveTab('production')}
        >
          <Text style={[styles.tabText, activeTab === 'production' && styles.activeTabText]}>
            🧀 Production
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'recipes' && styles.activeTab]}
          onPress={() => setActiveTab('recipes')}
        >
          <Text style={[styles.tabText, activeTab === 'recipes' && styles.activeTabText]}>
            📋 Recettes
          </Text>
        </TouchableOpacity>
      </View>
      
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.mainContent}>
          {activeTab === 'production' && renderProduction()}
          {activeTab === 'recipes' && renderRecipes()}
        </View>

        {/* Cheese Production Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible && modalType === 'cheese'}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'Modifier la Production' : 'Nouvelle Production de Fromage'}
                </Text>

                <View style={styles.dateFieldContainer}>
                  <Text style={styles.dateFieldLabel}>Date de production *</Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => openCalendarModal('date')}
                  >
                    <Text style={styles.datePickerText}>
                      {cheeseForm.date ? 
                        formatForCalendar(cheeseForm.date) : 
                        '📅 Sélectionner une date'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cheeseTypeSelector}>
                  <Text style={styles.inputLabel}>Type de fromage:</Text>
                  <View style={styles.cheeseTypeOptions}>
                    {[
                      { key: 'fromage_frais', label: '🧀 Fromage Frais' },
                      { key: 'tomme', label: '🧀 Tomme' }
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.cheeseTypeOption,
                          cheeseForm.cheeseType === type.key && styles.cheeseTypeOptionSelected
                        ]}
                        onPress={() => {
                          setCheeseForm({...cheeseForm, cheeseType: type.key});
                          // Set default theoretical yield based on type
                          const defaultYield = type.key === 'fromage_frais' ? 
                            cheeseSettings.defaultRendementFromageFrais : 
                            cheeseSettings.defaultRendementTomme;
                          setCheeseForm(prev => ({...prev, theoreticalYield: defaultYield.toString()}));
                        }}
                      >
                        <Text style={[
                          styles.cheeseTypeOptionText,
                          cheeseForm.cheeseType === type.key && styles.cheeseTypeOptionTextSelected
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Quantité de lait utilisée (L) *"
                  placeholderTextColor="#999"
                  value={cheeseForm.milkQuantity}
                  onChangeText={(text) => setCheeseForm({...cheeseForm, milkQuantity: text})}
                  keyboardType="decimal-pad"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Rendement théorique (%)"
                  placeholderTextColor="#999"
                  value={cheeseForm.theoreticalYield}
                  onChangeText={(text) => setCheeseForm({...cheeseForm, theoreticalYield: text})}
                  keyboardType="decimal-pad"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Production réelle (kg) *"
                  placeholderTextColor="#999"
                  value={cheeseForm.practicalYield}
                  onChangeText={(text) => setCheeseForm({...cheeseForm, practicalYield: text})}
                  keyboardType="decimal-pad"
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes (optionnel)"
                  placeholderTextColor="#999"
                  value={cheeseForm.notes}
                  onChangeText={(text) => setCheeseForm({...cheeseForm, notes: text})}
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
                    onPress={saveCheeseProduction}
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

        {/* Recipe Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible && modalType === 'recipe'}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {editingItem ? 'Modifier la Recette' : 'Nouvelle Recette de Fromage'}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Nom de la recette *"
                  placeholderTextColor="#999"
                  value={recipeForm.name}
                  onChangeText={(text) => setRecipeForm({...recipeForm, name: text})}
                />

                <View style={styles.cheeseTypeSelector}>
                  <Text style={styles.inputLabel}>Type de fromage:</Text>
                  <View style={styles.cheeseTypeOptions}>
                    {[
                      { key: 'fromage_frais', label: '🧀 Fromage Frais' },
                      { key: 'tomme', label: '🧀 Tomme' }
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.cheeseTypeOption,
                          recipeForm.cheeseType === type.key && styles.cheeseTypeOptionSelected
                        ]}
                        onPress={() => setRecipeForm({...recipeForm, cheeseType: type.key})}
                      >
                        <Text style={[
                          styles.cheeseTypeOptionText,
                          recipeForm.cheeseType === type.key && styles.cheeseTypeOptionTextSelected
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {recipeForm.cheeseType === 'fromage_frais' && (
                  <View style={styles.sizeSelector}>
                    <Text style={styles.inputLabel}>Taille:</Text>
                    <View style={styles.sizeOptions}>
                      {['50g', '120g'].map((size) => (
                        <TouchableOpacity
                          key={size}
                          style={[
                            styles.sizeOption,
                            recipeForm.size === size && styles.sizeOptionSelected
                          ]}
                          onPress={() => setRecipeForm({...recipeForm, size})}
                        >
                          <Text style={[
                            styles.sizeOptionText,
                            recipeForm.size === size && styles.sizeOptionTextSelected
                          ]}>
                            {size}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {recipeForm.cheeseType === 'fromage_frais' && (
                  <View style={styles.flavorSelector}>
                    <Text style={styles.inputLabel}>Saveur:</Text>
                    <View style={styles.flavorOptions}>
                      {[
                        { key: 'nature', label: 'Nature' },
                        { key: 'fines_herbes', label: 'Fines Herbes' },
                        { key: 'tomate_pesto', label: 'Tomate Pesto' },
                        { key: 'caramel_beurre_sale', label: 'Caramel Beurre Salé' },
                        { key: 'au_lars', label: 'Au Lars' },
                        { key: 'figue_noix', label: 'Figue Noix' }
                      ].map((flavor) => (
                        <TouchableOpacity
                          key={flavor.key}
                          style={[
                            styles.flavorOption,
                            recipeForm.flavor === flavor.key && styles.flavorOptionSelected
                          ]}
                          onPress={() => setRecipeForm({...recipeForm, flavor: flavor.key})}
                        >
                          <Text style={[
                            styles.flavorOptionText,
                            recipeForm.flavor === flavor.key && styles.flavorOptionTextSelected
                          ]}>
                            {flavor.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <TextInput
                  style={styles.input}
                  placeholder={recipeForm.cheeseType === 'tomme' ? 'Prix (€/kg) *' : 'Prix (€/unité) *'}
                  placeholderTextColor="#999"
                  value={recipeForm.price}
                  onChangeText={(text) => setRecipeForm({...recipeForm, price: text})}
                  keyboardType="decimal-pad"
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description (optionnel)"
                  placeholderTextColor="#999"
                  value={recipeForm.description}
                  onChangeText={(text) => setRecipeForm({...recipeForm, description: text})}
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
                    onPress={saveRecipe}
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
                <Text style={styles.calendarTitle}>Date de production</Text>
                <TouchableOpacity 
                  style={styles.calendarCloseBtn}
                  onPress={() => setCalendarModal(false)}
                >
                  <Text style={styles.calendarCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Calendar
                onDayPress={handleDateSelect}
                maxDate={getTodayISO()}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#8B4513',
                  selectedDayBackgroundColor: '#8B4513',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#8B4513',
                  dayTextColor: '#2d4150',
                  textDisabledColor: '#d9e1e8',
                  dotColor: '#00adf5',
                  selectedDotColor: '#ffffff',
                  arrowColor: '#8B4513',
                  disabledArrowColor: '#d9e1e8',
                  monthTextColor: '#8B4513',
                  indicatorColor: '#8B4513',
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
    backgroundColor: 'rgba(139, 69, 19, 0.44)',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: '#8B4513',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
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
  productionSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipesSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productionCard: {
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
  productionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productionDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  productionType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B4513',
  },
  productionDetails: {
    marginBottom: 10,
  },
  productionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productionInfoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  productionInfoValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  productionNotes: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 6,
  },
  productionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  recipeCard: {
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
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  recipePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  recipeDetails: {
    marginBottom: 10,
  },
  recipeInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  recipeDescription: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  recipeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    padding: 8,
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
  emptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#999',
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
  cheeseTypeSelector: {
    marginBottom: 15,
  },
  cheeseTypeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  cheeseTypeOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cheeseTypeOptionSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  cheeseTypeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  cheeseTypeOptionTextSelected: {
    color: 'white',
  },
  sizeSelector: {
    marginBottom: 15,
  },
  sizeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  sizeOptionSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  sizeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  sizeOptionTextSelected: {
    color: 'white',
  },
  flavorSelector: {
    marginBottom: 15,
  },
  flavorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flavorOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: '30%',
    alignItems: 'center',
  },
  flavorOptionSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  flavorOptionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  flavorOptionTextSelected: {
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
  graphScrollContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  graphContainer: {
    flexDirection: 'row',
    minWidth: 1200,
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
    gap: 2,
  },
  graphBar: {
    alignItems: 'center',
    width: 35,
    height: '100%',
    justifyContent: 'flex-end',
  },
  graphBarFill: {
    backgroundColor: '#8B4513',
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
