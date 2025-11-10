import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  FlatList,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  Switch
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { toFrenchDate } from '../utils/dateUtils';
import AddOrderScreen from './AddOrderScreen';
import database from '../services/database';
import { 
  ORDER_STATUSES, 
  getStatusColor, 
  getStatusIcon, 
  getStatusDefinition,
  getStatusesByPriority,
  getStatusesRequiringAction,
  getStatusesAffectingInventory
} from '../../constants/StatusConstants';

export default function BookingSystemScreen({ navigation, orders: externalOrders, setOrders: setExternalOrders, highlightOrderId, customerName }) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState(externalOrders || []);
  const [activeFilters, setActiveFilters] = useState([]);
  const [addOrderModalVisible, setAddOrderModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'status', 'customer', 'price'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [showStatusDefinitions, setShowStatusDefinitions] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid', 'kanban'
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [selectedOrderForStatusChange, setSelectedOrderForStatusChange] = useState(null);
  const flatListRef = useRef(null);

  const orderStatuses = ORDER_STATUSES;

  useEffect(() => {
    if (externalOrders && externalOrders.length > 0) {
      setOrders(externalOrders);
    } else {
      loadOrders();
    }
  }, [externalOrders]);

  // Handle navigation from calendar with specific order highlight
  useEffect(() => {
    if (highlightOrderId && customerName && orders.length > 0) {
      // Find the order index
      const orderIndex = orders.findIndex(order => order.id === highlightOrderId);
      
      if (orderIndex !== -1) {
        // Set highlighted order
        setHighlightedOrderId(highlightOrderId);
        
        // Scroll to the specific order after a short delay to ensure the list is rendered
        setTimeout(() => {
          if (flatListRef.current) {
            try {
              flatListRef.current.scrollToIndex({
                index: orderIndex,
                animated: true,
                viewPosition: 0.5 // Center the item in the view
              });
            } catch (error) {
              // Fallback: scroll to offset if scrollToIndex fails
              console.log('ScrollToIndex failed, using fallback:', error);
              const estimatedItemHeight = 120; // Approximate height of each order card
              const offset = orderIndex * estimatedItemHeight;
              flatListRef.current.scrollToOffset({
                offset: offset,
                animated: true
              });
            }
          }
        }, 500);
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedOrderId(null);
        }, 3000);
      }
    }
  }, [highlightOrderId, customerName, orders]);

  // Update external orders when internal orders change
  useEffect(() => {
    if (setExternalOrders && orders.length > 0) {
      setExternalOrders(orders);
    }
  }, [orders, setExternalOrders]);

  const loadOrders = async () => {
    try {
      const ordersData = await database.getOrders();
      setOrders(ordersData.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)));
    } catch (error) {
      console.error('Error loading orders:', error);
      // Fallback to empty array if database fails
      setOrders([]);
    }
  };

  const openAddModal = () => {
    setEditingOrder(null);
    setAddOrderModalVisible(true);
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setAddOrderModalVisible(true);
  };

  const handleSaveOrder = async (newOrder, isEditing) => {
    try {
    if (isEditing) {
        // Update order in database
        await database.updateOrder(newOrder.id, newOrder);
      setOrders(orders.map(o => o.id === newOrder.id ? newOrder : o)
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)));
    } else {
        // Add new order to database
        await database.addOrder(newOrder);
      setOrders([newOrder, ...orders]);
    }
    
    // Sync with calendar when orders change
      await database.syncOrdersWithCalendar();
      console.log('📅 Calendar synced with updated orders');
    } catch (error) {
      console.error('Error saving order:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la commande');
    }
  };


  const deleteOrder = (id) => {
    Alert.alert(
      'Supprimer la commande',
      'Êtes-vous sûr de vouloir supprimer cette commande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            // Delete from database first
            await database.deleteOrder(id);
            // Update local state
            setOrders(orders.filter(o => o.id !== id));
            console.log('✅ Order deleted from database');
          } catch (error) {
            console.error('Error deleting order:', error);
            Alert.alert('Erreur', 'Impossible de supprimer la commande');
          }
        }}
      ]
    );
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Find the order
      const order = orders.find(o => o.id === orderId);
      if (order) {
        // Update in database
        await database.updateOrder(orderId, { ...order, status: newStatus });
        // Update local state
        setOrders(orders.map(o => 
          o.id === orderId ? { ...o, status: newStatus } : o
        ));
        // Sync with calendar
        await database.syncOrdersWithCalendar();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  // Status colors and icons are now imported from StatusConstants

  const formatDate = (dateString) => {
    return toFrenchDate(dateString);
  };


  const OrderItem = ({ item }) => {
    const isSelected = selectedOrders.includes(item.id);
    const statusDef = getStatusDefinition(item.status);
    
    return (
      <TouchableOpacity 
        style={[
          styles.orderCard,
          highlightedOrderId === item.id && styles.highlightedOrderCard,
          isSelected && styles.selectedOrderCard,
          bulkActionMode && styles.bulkActionCard
        ]}
        onPress={() => {
          if (bulkActionMode) {
            toggleOrderSelection(item.id);
          } else {
            openEditModal(item);
          }
        }}
        onLongPress={() => {
          if (!bulkActionMode) {
            setBulkActionMode(true);
            toggleOrderSelection(item.id);
          }
        }}
        activeOpacity={0.7}
      >
        {bulkActionMode && (
          <View style={styles.selectionIndicator}>
            <View style={[
              styles.selectionCheckbox,
              isSelected && styles.selectionCheckboxSelected
            ]}>
              {isSelected && <Text style={styles.selectionCheckmark}>✓</Text>}
            </View>
          </View>
        )}
        
      <View style={styles.orderHeader}>
        <View style={styles.orderTitleSection}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.orderDate}>Commande: {formatDate(item.orderDate)}</Text>
          <Text style={styles.orderType}>Type: {item.orderType}</Text>
        </View>
        <TouchableOpacity 
            style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(item.status) },
              statusDef.requiresAction && styles.statusBadgeRequiresAction
            ]}
          onPress={(e) => {
              e.stopPropagation();
              if (!bulkActionMode) {
                setSelectedOrderForStatusChange(item);
                setShowStatusChangeModal(true);
              }
          }}
        >
          <Text style={styles.statusText}>
            {getStatusIcon(item.status)} {item.status}
          </Text>
            {statusDef.requiresAction && (
              <Text style={styles.statusActionIndicator}>!</Text>
            )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.orderDetails}>
        {item.orderType === 'Adoption' && (
          <>
            {/* Handle new structure with selectedAnimals and animalDetails */}
            {item.selectedAnimals && item.animalDetails ? (
              <>
                {item.selectedAnimals.map((animalType, index) => {
                  const animalDetail = item.animalDetails[animalType];
                  if (!animalDetail || !animalDetail.races) return null;
                  
                  return animalDetail.races.map((raceConfig, raceIndex) => {
                    const animalEmoji = animalType === 'poussins' ? '🐓' : 
                                      animalType === 'canards' ? '🦆' : 
                                      animalType === 'oie' ? '🦢' : 
                                      animalType === 'lapin' ? '🐰' : 
                                      animalType === 'chèvre' ? '🐐' : 
                                      animalType === 'cailles' ? '🐦' : '🐓';
                    
                    const sexEmoji = raceConfig.sexPreference === 'male' ? '♂️' : 
                                   raceConfig.sexPreference === 'female' ? '♀️' : '❓';
                    
                    return (
                      <Text key={`${animalType}_${raceIndex}`} style={styles.orderInfo}>
                        {animalEmoji} {raceConfig.quantity} {animalType} {raceConfig.race} {sexEmoji}
                      </Text>
                    );
                  });
                })}
                {item.ageMonths && <Text style={styles.orderInfo}>📅 Âge: {item.ageMonths} mois {item.ageWeeks && `${item.ageWeeks} semaines`}</Text>}
              </>
            ) : (
              /* Handle old structure for backward compatibility */
          <>
            <Text style={styles.orderInfo}>🐓 {item.animalType} - {item.race}</Text>
            {item.selectedGender && (
              <Text style={styles.orderInfo}>⚧️ {item.selectedGender}</Text>
            )}
            {item.selectedColor && (
              <Text style={styles.orderInfo}>🎨 Couleur: {item.selectedColor}</Text>
            )}
            {item.selectedCharacteristics && item.selectedCharacteristics.length > 0 && (
              <Text style={styles.orderInfo}>✨ {item.selectedCharacteristics.join(', ')}</Text>
            )}
            {item.ageMonths && <Text style={styles.orderInfo}>📅 Âge: {item.ageMonths} mois {item.ageWeeks && `${item.ageWeeks} semaines`}</Text>}
              </>
            )}
          </>
        )}
        {item.product && (
          <Text style={styles.orderInfo}>📦 {item.product} {item.quantity && `× ${item.quantity}`}</Text>
        )}
        <Text style={styles.orderInfo}>💰 {item.totalPrice.toFixed(2)}€</Text>
        {item.customerPhone && (
          <Text style={styles.orderInfo}>📞 {item.customerPhone}</Text>
        )}
        {item.customerEmail && (
          <Text style={styles.orderInfo}>📧 {item.customerEmail}</Text>
        )}
        {item.deliveryDate && (
          <Text style={styles.orderInfo}>🏠 Récupération: {formatDate(item.deliveryDate)}</Text>
        )}
      </View>

        {!bulkActionMode && (
      <View style={styles.orderActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.messageBtn]}
          onPress={(e) => {
            e.stopPropagation();
            if (item.customerEmail) {
              Alert.alert(
                'Envoyer un message',
                `Envoyer un message à ${item.customerName}?\nEmail: ${item.customerEmail}`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Envoyer', onPress: () => {
                    Alert.alert('Message', 'Fonctionnalité d\'envoi de message à venir');
                  }}
                ]
              );
            } else if (item.customerPhone) {
              Alert.alert(
                'Envoyer un message',
                `Envoyer un SMS à ${item.customerName}?\nTéléphone: ${item.customerPhone}`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Envoyer', onPress: () => {
                    Alert.alert('Message', 'Fonctionnalité d\'envoi de SMS à venir');
                  }}
                ]
              );
            } else {
              Alert.alert('Information', 'Aucune information de contact disponible pour ce client');
            }
          }}
        >
          <Text style={styles.actionBtnText}>💬 Message</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.callBtn]}
          onPress={(e) => {
            e.stopPropagation();
            Alert.alert('Appeler le client', `Appeler ${item.customerName}?\n${item.customerPhone}`)
          }}
        >
          <Text style={styles.actionBtnText}>📞 Appeler</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={(e) => {
            e.stopPropagation();
            deleteOrder(item.id);
          }}
        >
          <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
        )}
      </TouchableOpacity>
  );
  };

  const getOrderStats = () => {
    const stats = orderStatuses.reduce((acc, status) => {
      acc[status] = orders.filter(o => o.status === status).length;
      return acc;
    }, {});
    
    const totalRevenue = orders
      .filter(o => o.status === 'Livrée')
      .reduce((sum, o) => sum + o.totalPrice, 0);
    
    return { ...stats, totalRevenue };
  };

  const stats = getOrderStats();

  const toggleStatusFilter = (status) => {
    setActiveFilters(prev => {
      if (prev.includes(status)) {
        // Remove filter
        return prev.filter(f => f !== status);
      } else {
        // Add filter
        return [...prev, status];
      }
    });
  };

  // Enhanced filtering and sorting functions
  const getFilteredAndSortedOrders = () => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.customerName.toLowerCase().includes(query) ||
        order.customerPhone?.includes(query) ||
        order.customerEmail?.toLowerCase().includes(query) ||
        order.orderType.toLowerCase().includes(query) ||
        order.animalType?.toLowerCase().includes(query) ||
        order.race?.toLowerCase().includes(query)
      );
    }

    // Apply status filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(order => activeFilters.includes(order.status));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.orderDate) - new Date(b.orderDate);
          break;
        case 'status':
          const statusA = getStatusDefinition(a.status);
          const statusB = getStatusDefinition(b.status);
          comparison = statusA.priority - statusB.priority;
          break;
        case 'customer':
          comparison = a.customerName.localeCompare(b.customerName);
          break;
        case 'price':
          comparison = a.totalPrice - b.totalPrice;
          break;
        default:
          comparison = new Date(b.orderDate) - new Date(a.orderDate);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredOrders = getFilteredAndSortedOrders();

  // Bulk actions
  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    setSelectedOrders(filteredOrders.map(order => order.id));
  };

  const clearSelection = () => {
    setSelectedOrders([]);
  };

  const bulkUpdateStatus = (newStatus) => {
    Alert.alert(
      'Mise à jour en lot',
      `Changer le statut de ${selectedOrders.length} commande(s) vers "${newStatus}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => {
          setOrders(orders.map(order => 
            selectedOrders.includes(order.id) 
              ? { ...order, status: newStatus }
              : order
          ));
          setSelectedOrders([]);
          setBulkActionMode(false);
        }}
      ]
    );
  };

  const bulkDeleteOrders = () => {
    Alert.alert(
      'Suppression en lot',
      `Supprimer ${selectedOrders.length} commande(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => {
          setOrders(orders.filter(order => !selectedOrders.includes(order.id)));
          setSelectedOrders([]);
          setBulkActionMode(false);
        }}
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top * 0.8 }]} />
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerIcon}>🛒</Text>
            <Text style={styles.headerTitleText}>Commandes</Text>
            <Text style={styles.orderCount}>({filteredOrders.length})</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerActionBtn} 
              onPress={() => setShowStatusDefinitions(!showStatusDefinitions)}
            >
              <Text style={styles.headerActionText}>ℹ️</Text>
            </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
              <Text style={styles.addButtonText}>+ Nouvelle</Text>
          </TouchableOpacity>
          </View>
        </View>
      </View>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>

      {/* Compact Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.compactControlsRow}>
          {/* Search Icon */}
          <TouchableOpacity 
            style={[styles.controlIcon, showSearchBar && styles.controlIconActive]}
            onPress={() => setShowSearchBar(!showSearchBar)}
          >
            <Text style={styles.controlIconText}>🔍</Text>
          </TouchableOpacity>
          
          {/* Sort Dropdown */}
          <TouchableOpacity 
            style={styles.sortDropdown}
            onPress={() => setShowSortModal(true)}
          >
            <Text style={styles.sortDropdownText}>
              {sortBy === 'date' ? '📅' : sortBy === 'status' ? '🏷️' : sortBy === 'customer' ? '👤' : '💰'}
            </Text>
            <Text style={styles.sortDropdownArrow}>▼</Text>
          </TouchableOpacity>
          
          {/* Sort Order Toggle */}
          <TouchableOpacity 
            style={styles.sortOrderToggle}
            onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <Text style={styles.sortOrderText}>{sortOrder === 'asc' ? '↑' : '↓'}</Text>
          </TouchableOpacity>
          
          {/* Filter Toggle */}
          <TouchableOpacity 
            style={[styles.controlIcon, activeFilters.length > 0 && styles.controlIconActive]}
            onPress={() => {
              if (activeFilters.length > 0) {
                setActiveFilters([]);
              } else {
                setShowFilterModal(true);
              }
            }}
          >
            <Text style={styles.controlIconText}>
              {activeFilters.length > 0 ? '🔽' : '🔽'}
            </Text>
            {activeFilters.length > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilters.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Collapsible Search Bar */}
        {showSearchBar && (
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom, téléphone, email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              autoFocus={true}
            />
            <TouchableOpacity 
              style={styles.clearSearchBtn}
              onPress={() => {
                setSearchQuery('');
                setShowSearchBar(false);
              }}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Status Definitions Modal */}
      {showStatusDefinitions && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showStatusDefinitions}
          onRequestClose={() => setShowStatusDefinitions(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowStatusDefinitions(false)}
          >
            <View style={styles.statusDefinitionsModal}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Définitions des Statuts</Text>
                <TouchableOpacity 
                  style={styles.closeModalBtn}
                  onPress={() => setShowStatusDefinitions(false)}
                >
                  <Text style={styles.closeModalText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.statusDefinitionsList}>
                {getStatusesByPriority().map((status) => {
                  const def = getStatusDefinition(status);
                  return (
                    <View key={status} style={styles.statusDefinitionItem}>
                      <View style={styles.statusDefinitionHeader}>
                        <View style={[styles.statusDefinitionBadge, { backgroundColor: def.color }]}>
                          <Text style={styles.statusDefinitionIcon}>{def.icon}</Text>
                          <Text style={styles.statusDefinitionName}>{status}</Text>
                        </View>
                        <View style={styles.statusDefinitionFlags}>
                          {def.requiresAction && (
                            <Text style={styles.statusFlag}>⚠️ Action requise</Text>
                          )}
                          {def.affectsInventory && (
                            <Text style={styles.statusFlag}>📦 Affecte stock</Text>
                          )}
                        </View>
                      </View>
                      <Text style={styles.statusDefinitionDescription}>{def.description}</Text>
                    </View>
                  );
                })}
              </ScrollView>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Sort Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSortModal}
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Trier par</Text>
                <TouchableOpacity 
                  style={styles.closeModalBtn}
                  onPress={() => setShowSortModal(false)}
                >
                  <Text style={styles.closeModalText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={styles.modalSubtitle}>Sélectionnez le critère de tri:</Text>
                <View style={styles.modalOptions}>
                  <TouchableOpacity 
                    style={[styles.modalOption, sortBy === 'date' && styles.modalOptionSelected]}
                    onPress={() => {
                      setSortBy('date');
                      setShowSortModal(false);
                    }}
                  >
                    <Text style={styles.modalOptionIcon}>📅</Text>
                    <Text style={styles.modalOptionText}>Date</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalOption, sortBy === 'status' && styles.modalOptionSelected]}
                    onPress={() => {
                      setSortBy('status');
                      setShowSortModal(false);
                    }}
                  >
                    <Text style={styles.modalOptionIcon}>🏷️</Text>
                    <Text style={styles.modalOptionText}>Statut</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalOption, sortBy === 'customer' && styles.modalOptionSelected]}
                    onPress={() => {
                      setSortBy('customer');
                      setShowSortModal(false);
                    }}
                  >
                    <Text style={styles.modalOptionIcon}>👤</Text>
                    <Text style={styles.modalOptionText}>Client</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalOption, sortBy === 'price' && styles.modalOptionSelected]}
                    onPress={() => {
                      setSortBy('price');
                      setShowSortModal(false);
                    }}
                  >
                    <Text style={styles.modalOptionIcon}>💰</Text>
                    <Text style={styles.modalOptionText}>Prix</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filtrer par statut</Text>
                <TouchableOpacity 
                  style={styles.closeModalBtn}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={styles.closeModalText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={styles.modalSubtitle}>Sélectionnez les statuts à afficher:</Text>
                <View style={styles.modalOptions}>
                  {orderStatuses.map(status => {
                    const statusDef = getStatusDefinition(status);
                    return (
                      <TouchableOpacity 
                        key={status}
                        style={[styles.modalOption, { borderLeftColor: statusDef.color }]}
                        onPress={() => {
                          setActiveFilters([status]);
                          setShowFilterModal(false);
                        }}
                      >
                        <Text style={styles.modalOptionIcon}>{statusDef.icon}</Text>
                        <Text style={styles.modalOptionText}>{status}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showStatusChangeModal}
        onRequestClose={() => setShowStatusChangeModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusChangeModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Changer le statut</Text>
                <TouchableOpacity 
                  style={styles.closeModalBtn}
                  onPress={() => setShowStatusChangeModal(false)}
                >
                  <Text style={styles.closeModalText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                {selectedOrderForStatusChange && (
                  <>
                    <View style={styles.statusChangeInfo}>
                      <Text style={styles.statusChangeLabel}>Commande:</Text>
                      <Text style={styles.statusChangeValue}>{selectedOrderForStatusChange.customerName}</Text>
                      <Text style={styles.statusChangeLabel}>Statut actuel:</Text>
                      <View style={[styles.currentStatusBadge, { backgroundColor: getStatusColor(selectedOrderForStatusChange.status) }]}>
                        <Text style={styles.currentStatusText}>
                          {getStatusIcon(selectedOrderForStatusChange.status)} {selectedOrderForStatusChange.status}
                        </Text>
                      </View>
                      <Text style={styles.statusChangeDescription}>
                        {getStatusDefinition(selectedOrderForStatusChange.status).description}
                      </Text>
                    </View>
                    <Text style={styles.modalSubtitle}>Sélectionnez le nouveau statut:</Text>
                    <View style={styles.modalOptions}>
                      {orderStatuses.map(status => {
                        const statusDef = getStatusDefinition(status);
                        return (
                          <TouchableOpacity 
                            key={status}
                            style={[styles.modalOption, { borderLeftColor: statusDef.color }]}
                            onPress={() => {
                              updateOrderStatus(selectedOrderForStatusChange.id, status);
                              setShowStatusChangeModal(false);
                              setSelectedOrderForStatusChange(null);
                            }}
                          >
                            <Text style={styles.modalOptionIcon}>{statusDef.icon}</Text>
                            <Text style={styles.modalOptionText}>{status}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bulk Status Change Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showBulkStatusModal}
        onRequestClose={() => setShowBulkStatusModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBulkStatusModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Changer le statut</Text>
                <TouchableOpacity 
                  style={styles.closeModalBtn}
                  onPress={() => setShowBulkStatusModal(false)}
                >
                  <Text style={styles.closeModalText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <View style={styles.statusChangeInfo}>
                  <Text style={styles.statusChangeLabel}>Commandes sélectionnées:</Text>
                  <Text style={styles.statusChangeValue}>{selectedOrders.length} commande{selectedOrders.length !== 1 ? 's' : ''}</Text>
                </View>
                <Text style={styles.modalSubtitle}>Sélectionnez le nouveau statut:</Text>
                <View style={styles.modalOptions}>
                  {orderStatuses.map(status => {
                    const statusDef = getStatusDefinition(status);
                    return (
                      <TouchableOpacity 
                        key={status}
                        style={[styles.modalOption, { borderLeftColor: statusDef.color }]}
                        onPress={() => {
                          bulkUpdateStatus(status);
                          setShowBulkStatusModal(false);
                        }}
                      >
                        <Text style={styles.modalOptionIcon}>{statusDef.icon}</Text>
                        <Text style={styles.modalOptionText}>{status}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Compact Status Overview */}
      <View style={styles.statusOverviewContainer}>
        <View style={styles.statusOverviewRow}>
            {getStatusesByPriority().map((status) => {
            const statusCount = stats[status] || 0;
              const statusDef = getStatusDefinition(status);
              const isActive = activeFilters.includes(status);
              
            return (
              <TouchableOpacity
                key={status}
                style={[
                    styles.statusOverviewChip,
                    { backgroundColor: '#f5f5f5', borderColor: statusDef.color },
                    isActive && styles.statusOverviewChipActive
                ]}
                onPress={() => toggleStatusFilter(status)}
              >
                  <Text style={styles.statusOverviewIcon}>{statusDef.icon}</Text>
                  <Text style={styles.statusOverviewCount}>{statusCount}</Text>
                  {statusDef.requiresAction && statusCount > 0 && (
                    <View style={styles.statusOverviewActionDot} />
                  )}
              </TouchableOpacity>
            );
          })}
          </View>
        </View>

      {/* Active filters indicator */}
      {activeFilters.length > 0 && (
        <View style={styles.activeFiltersContainer}>
          <View style={styles.activeFiltersTextContainer}>
            <Text style={styles.activeFiltersText} numberOfLines={1}>
              Filtres actifs: {activeFilters.join(', ')} ({filteredOrders.length} commande{filteredOrders.length !== 1 ? 's' : ''})
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => setActiveFilters([])}
          >
            <Text style={styles.clearFiltersText}>Tout afficher</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bulk Action Controls */}
      {bulkActionMode && (
        <View style={styles.bulkActionContainer}>
          <View style={styles.bulkActionInfo}>
            <Text style={styles.bulkActionText}>
              {selectedOrders.length} commande{selectedOrders.length !== 1 ? 's' : ''} sélectionnée{selectedOrders.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity 
              style={styles.selectAllBtn}
              onPress={selectedOrders.length === filteredOrders.length ? clearSelection : selectAllOrders}
            >
              <Text style={styles.selectAllText}>
                {selectedOrders.length === filteredOrders.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bulkActionButtons}>
            <TouchableOpacity 
              style={styles.bulkActionBtn}
              onPress={() => setBulkActionMode(false)}
            >
              <Text style={styles.bulkActionBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bulkActionBtn, styles.bulkDeleteBtn]}
              onPress={bulkDeleteOrders}
            >
              <Text style={styles.bulkActionBtnText}>🗑️ Supprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bulkActionBtn, styles.bulkStatusBtn]}
              onPress={() => setShowBulkStatusModal(true)}
            >
              <Text style={styles.bulkActionBtnText}>🏷️ Statut</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={filteredOrders}
        renderItem={({ item }) => <OrderItem item={item} />}
        keyExtractor={item => item.id.toString()}
        style={styles.orderList}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          // Fallback if scrollToIndex fails
          console.log('Scroll to index failed:', info);
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeFilters.length > 0 
                ? '🔍 Aucune commande ne correspond aux filtres sélectionnés'
                : '📋 Aucune commande pour le moment'
              }
            </Text>
          </View>
        )}
      />

      {/* Add/Edit Order Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={addOrderModalVisible}
        onRequestClose={() => setAddOrderModalVisible(false)}
      >
        <AddOrderScreen
          navigation={{
            goBack: () => setAddOrderModalVisible(false),
            navigate: (screenName) => {
              setAddOrderModalVisible(false);
              // Navigate to the main tab navigator
              if (screenName === 'Gestion') {
                // Switch to the Gestion tab
                navigation.navigate('Gestion');
              }
            }
          }}
          route={{
            params: {
              editingOrder: editingOrder,
              onSaveOrder: (newOrder, isEditing) => {
                handleSaveOrder(newOrder, isEditing);
                setAddOrderModalVisible(false);
              }
            }
          }}
        />
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
    padding: 10,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15, // Add horizontal padding to the container
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    fontSize: 20,
    marginRight: 8,
    color: 'white',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  orderCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerActionText: {
    color: 'white',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // Compact controls styles
  controlsContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  compactControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  controlIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  controlIconActive: {
    backgroundColor: '#005F6B',
    borderColor: '#005F6B',
  },
  controlIconText: {
    fontSize: 18,
    color: '#666',
  },
  sortDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  sortDropdownText: {
    fontSize: 16,
    marginRight: 4,
  },
  sortDropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  sortOrderToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#005F6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortOrderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF5722',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  clearSearchBtn: {
    padding: 5,
  },
  clearSearchText: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Compact status overview styles
  statusOverviewContainer: {
    backgroundColor: 'white',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  statusOverviewChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  statusOverviewChipActive: {
    borderWidth: 2,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  statusOverviewIcon: {
    fontSize: 12,
    color: '#666',
    marginBottom: 1,
  },
  statusOverviewCount: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333',
  },
  statusOverviewActionDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF5722',
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 60, // Consistent height
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 8,
  },
  filterChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minWidth: 70,
    width: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  filterChipRequiresAction: {
    borderWidth: 3,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  filterActionIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF5722',
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    borderRadius: 8,
    width: 16,
    height: 16,
    textAlign: 'center',
    lineHeight: 16,
  },
  filterChipActive: {
    backgroundColor: '#f0f8ff',
    borderWidth: 2, // Same border width as inactive
    shadowOpacity: 0.1,
    elevation: 2,
  },
  filterIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  filterCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  filterCountActive: {
    color: '#005F6B',
  },
  filterLabel: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
    flexShrink: 1,
  },
  filterLabelActive: {
    color: '#005F6B',
    fontWeight: '600',
  },
  revenueChip: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  activeFiltersContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 40, // Consistent height
  },
  activeFiltersTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  clearFiltersButton: {
    backgroundColor: '#1976d2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  orderList: {
    padding: 15,
  },
  orderCard: {
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
  highlightedOrderCard: {
    borderWidth: 3,
    borderColor: '#4CAF50',
    backgroundColor: '#f0f8f0',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderTitleSection: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 15,
  },
  orderInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  messageBtn: {
    backgroundColor: '#9C27B0',
  },
  callBtn: {
    backgroundColor: '#4CAF50',
  },
  deleteBtn: {
    backgroundColor: '#F44336',
  },
  actionBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 11,
  },
  orderType: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDefinitionsModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeModalBtn: {
    padding: 5,
  },
  closeModalText: {
    fontSize: 20,
    color: '#666',
  },
  statusDefinitionsList: {
    padding: 20,
  },
  statusDefinitionItem: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statusDefinitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDefinitionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDefinitionIcon: {
    fontSize: 16,
    marginRight: 6,
    color: 'white',
  },
  statusDefinitionName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusDefinitionFlags: {
    flexDirection: 'row',
    gap: 8,
  },
  statusFlag: {
    fontSize: 10,
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusDefinitionDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  // Bulk action styles
  bulkActionContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  bulkActionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bulkActionText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  selectAllBtn: {
    backgroundColor: '#1976d2',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectAllText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionBtn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  bulkActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  bulkDeleteBtn: {
    backgroundColor: '#ffebee',
  },
  bulkDeleteBtn: {
    backgroundColor: '#ffebee',
  },
  bulkStatusBtn: {
    backgroundColor: '#e8f5e8',
  },
  // Enhanced order card styles
  selectedOrderCard: {
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  bulkActionCard: {
    opacity: 0.8,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1,
  },
  selectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCheckboxSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  selectionCheckmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadgeRequiresAction: {
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  statusActionIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF5722',
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    borderRadius: 6,
    width: 12,
    height: 12,
    textAlign: 'center',
    lineHeight: 12,
  },
  // New modal styles
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOptions: {
    gap: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e0e0e0',
  },
  modalOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#2196F3',
  },
  modalOptionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusChangeInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusChangeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusChangeValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 10,
  },
  currentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  currentStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statusChangeDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 16,
  },
}); 