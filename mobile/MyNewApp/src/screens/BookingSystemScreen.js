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
  FlatList
} from 'react-native';

export default function BookingSystemScreen() {
  const [orders, setOrders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [expandedAnimals, setExpandedAnimals] = useState({});
  const [orderForm, setOrderForm] = useState({
    orderType: 'Adoption',
    selectedAnimals: ['poules'],
    animalDetails: {
      poules: {
        races: { 'Marans': 1 },
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
  const animalTypes = ['poules', 'canards', 'oie', 'lapin', 'chèvre'];
  const racesByAnimal = {
    poules: ['Marans', 'Araucana', 'Cream Legbar', 'Leghorn', 'Pekin'],
    canards: ['Coureur indien', 'Cayuga', 'Barbarie'],
    oie: ['Guinée', 'Toulouse'],
    lapin: ['Fermier'],
    chèvre: ['Alpine', 'Saanen', 'Poitevine', 'Angora']
  };

  const characteristics = {
    Adoption: {
      poules: {
        Marans: {
          multiSelect: ['Plumes aux pattes', 'Bonne pondeuse', 'Calme', 'Rustique'],
          colors: ['Noir', 'Marron', 'Orange', 'Cuivré'],
          genders: ['Coq', 'Poule']
        },
        Araucana: {
          multiSelect: ['Sans queue', 'Œufs bleus', 'Résistante au froid', 'Vive'],
          colors: ['Noir', 'Blanc', 'Argenté', 'Doré'],
          genders: ['Coq', 'Poule']
        },
        'Cream Legbar': {
          multiSelect: ['Œufs bleus', 'Autosexable', 'Bonne pondeuse', 'Active'],
          colors: ['Crème', 'Doré', 'Argenté'],
          genders: ['Coq', 'Poule']
        },
        Leghorn: {
          multiSelect: ['Excellente pondeuse', 'Légère', 'Vive', 'Résistante'],
          colors: ['Blanc', 'Noir', 'Marron', 'Argenté'],
          genders: ['Coq', 'Poule']
        },
        Pekin: {
          multiSelect: ['Plumes aux pattes', 'Naine', 'Calme', 'Ornementale'],
          colors: ['Blanc', 'Noir', 'Buff', 'Bleu'],
          genders: ['Coq', 'Poule']
        }
      },
      canards: {
        'Coureur indien': {
          multiSelect: ['Bonne pondeuse', 'Port dressé', 'Active', 'Insectivore'],
          colors: ['Blanc', 'Fauve', 'Noir', 'Pie'],
          genders: ['Mâle', 'Femelle']
        },
        Cayuga: {
          multiSelect: ['Reflets verts', 'Calme', 'Bonne chair', 'Rustique'],
          colors: ['Noir verdâtre', 'Noir'],
          genders: ['Mâle', 'Femelle']
        },
        Barbarie: {
          multiSelect: ['Grande taille', 'Viande savoureuse', 'Calme', 'Rustique'],
          colors: ['Blanc', 'Noir', 'Chocolat', 'Pie'],
          genders: ['Mâle', 'Femelle']
        }
      },
      oie: {
        Guinée: {
          multiSelect: ['Petite taille', 'Bonne chair', 'Rustique', 'Gardienne'],
          colors: ['Gris', 'Blanc'],
          genders: ['Mâle', 'Femelle']
        },
        Toulouse: {
          multiSelect: ['Grande taille', 'Lourde', 'Calme', 'Bon foie gras'],
          colors: ['Gris', 'Blanc'],
          genders: ['Mâle', 'Femelle']
        }
      },
      lapin: {
        Fermier: {
          multiSelect: ['Rustique', 'Bonne reproduction', 'Chair savoureuse', 'Docile'],
          colors: ['Fauve', 'Gris', 'Blanc', 'Noir'],
          genders: ['Mâle', 'Femelle']
        }
      },
      chèvre: {
        Alpine: {
          multiSelect: ['Bonne laitière', 'Rustique', 'Adaptable', 'Sociable'],
          colors: ['Chamoisée', 'Sundgau', 'Cou clair', 'Polychrome'],
          genders: ['Mâle', 'Femelle']
        },
        Saanen: {
          multiSelect: ['Excellente laitière', 'Blanche', 'Calme', 'Grande taille'],
          colors: ['Blanc', 'Crème'],
          genders: ['Mâle', 'Femelle']
        },
        Poitevine: {
          multiSelect: ['Race locale', 'Rustique', 'Lait de qualité', 'Résistante'],
          colors: ['Brun', 'Fauve', 'Pie'],
          genders: ['Mâle', 'Femelle']
        },
        Angora: {
          multiSelect: ['Poil mohair', 'Tonte 2 fois/an', 'Docile', 'Rustique'],
          colors: ['Blanc', 'Brun', 'Gris', 'Noir'],
          genders: ['Mâle', 'Femelle']
        }
      }
    }
  };

  const orderStatuses = ['En attente', 'Confirmée', 'En préparation', 'Prête', 'Livrée', 'Annulée'];

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    // Mock data - replace with API call
    const mockOrders = [
      {
        id: 1,
        orderType: 'Adoption',
        animalType: 'poules',
        race: 'Marans',
        ageMonths: '3',
        ageWeeks: '2',
        customerName: 'Marie Dupont',
        customerPhone: '+33123456789',
        customerEmail: 'marie@email.com',
        totalPrice: 45.00,
        deliveryDate: '2024-01-20',
        status: 'Confirmée',
        orderDate: '2024-01-15'
      },
      {
        id: 2,
        orderType: 'Œufs de conso',
        customerName: 'Pierre Martin',
        customerPhone: '+33123456790',
        quantity: 24,
        totalPrice: 16.00,
        deliveryDate: '2024-01-22',
        status: 'En attente',
        orderDate: '2024-01-16'
      },
      {
        id: 3,
        orderType: 'Fromage',
        customerName: 'Sophie Bernard',
        customerPhone: '+33123456791',
        product: 'Fromage de chèvre',
        quantity: 2,
        totalPrice: 35.00,
        deliveryDate: '2024-01-18',
        status: 'Prête',
        orderDate: '2024-01-14'
      }
    ];
    setOrders(mockOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)));
  };

  const openAddModal = () => {
    setEditingOrder(null);
    setExpandedAnimals({ poules: true }); // Expand default animal
    setOrderForm({
      orderType: 'Adoption',
      selectedAnimals: ['poules'],
      animalDetails: {
        poules: {
          races: { 'Marans': 1 },
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
    setModalVisible(true);
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    
    // Handle legacy orders and new structure
    const formData = {
      orderType: order.orderType || 'Adoption',
      selectedAnimals: order.selectedAnimals || ['poules'],
      animalDetails: order.animalDetails || {
        poules: {
          races: { 'Marans': 1 },
          characteristics: [],
          colors: {},
          genders: {}
        }
      },
      ageMonths: order.ageMonths || '',
      ageWeeks: order.ageWeeks || '',
      deliveryDate: order.deliveryDate || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || '',
      otherDetails: order.otherDetails || '',
      product: order.product || '',
      quantity: order.quantity ? order.quantity.toString() : '',
      totalPrice: order.totalPrice.toString(),
      status: order.status
    };
    
    setOrderForm(formData);
    setModalVisible(true);
  };

  const saveOrder = () => {
    if (!orderForm.customerName) {
      Alert.alert('Erreur', 'Veuillez remplir le nom du client');
      return;
    }

    const newOrder = {
      id: editingOrder ? editingOrder.id : Date.now(),
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
      deliveryDate: orderForm.deliveryDate,
      status: orderForm.status,
      orderDate: editingOrder ? editingOrder.orderDate : new Date().toISOString().split('T')[0]
    };

    if (editingOrder) {
      setOrders(orders.map(o => o.id === editingOrder.id ? newOrder : o)
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)));
    } else {
      setOrders([newOrder, ...orders]);
    }

    setModalVisible(false);
    Alert.alert('Succès', `Commande ${editingOrder ? 'mise à jour' : 'créée'} avec succès!`);
  };

  const deleteOrder = (id) => {
    Alert.alert(
      'Supprimer la commande',
      'Êtes-vous sûr de vouloir supprimer cette commande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => {
          setOrders(orders.filter(o => o.id !== id));
        }}
      ]
    );
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    ));
    Alert.alert('Statut mis à jour', `Le statut de la commande a été changé à ${newStatus}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'En attente': return '#FF9800';
      case 'Confirmée': return '#2196F3';
      case 'En préparation': return '#9C27B0';
      case 'Prête': return '#4CAF50';
      case 'Livrée': return '#4CAF50';
      case 'Annulée': return '#F44336';
      default: return '#607D8B';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'En attente': return '⏳';
      case 'Confirmée': return '✅';
      case 'En préparation': return '👨‍🍳';
      case 'Prête': return '📦';
      case 'Livrée': return '🚚';
      case 'Annulée': return '❌';
      default: return '📋';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non défini';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCurrentCharacteristics = () => {
    if (orderForm.orderType === 'Adoption' && 
        characteristics[orderForm.orderType] &&
        characteristics[orderForm.orderType][orderForm.animalType] &&
        characteristics[orderForm.orderType][orderForm.animalType][orderForm.race]) {
      return characteristics[orderForm.orderType][orderForm.animalType][orderForm.race];
    }
    return null;
  };

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
          races: { [racesByAnimal[animal][0]]: 1 },
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

  const toggleAnimalExpansion = (animal) => {
    setExpandedAnimals({
      ...expandedAnimals,
      [animal]: !expandedAnimals[animal]
    });
  };

  const getAnimalTotalQuantity = (animal) => {
    if (!orderForm.animalDetails[animal]?.races) return 0;
    return Object.values(orderForm.animalDetails[animal].races)
      .reduce((total, quantity) => total + (parseInt(quantity) || 0), 0);
  };

  const updateRaceQuantity = (animal, race, quantity) => {
    const newDetails = {
      ...orderForm.animalDetails,
      [animal]: {
        ...orderForm.animalDetails[animal],
        races: {
          ...orderForm.animalDetails[animal].races,
          [race]: parseInt(quantity) || 0
        }
      }
    };
    
    setOrderForm({
      ...orderForm,
      animalDetails: newDetails
    });
  };

  const OrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderTitleSection}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.orderDate}>Commande: {formatDate(item.orderDate)}</Text>
          <Text style={styles.orderType}>Type: {item.orderType}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
          onPress={() => {
            Alert.alert(
              'Changer le statut',
              'Sélectionnez le nouveau statut:',
              orderStatuses.map(status => ({
                text: `${getStatusIcon(status)} ${status}`,
                onPress: () => updateOrderStatus(item.id, status)
              }))
            );
          }}
        >
          <Text style={styles.statusText}>
            {getStatusIcon(item.status)} {item.status}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.orderDetails}>
        {item.orderType === 'Adoption' && (
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
          <Text style={styles.orderInfo}>🚚 Livraison: {formatDate(item.deliveryDate)}</Text>
        )}
      </View>

      <View style={styles.orderActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionBtnText}>✏️ Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.callBtn]}
          onPress={() => Alert.alert('Appeler le client', `Appeler ${item.customerName}?\n${item.customerPhone}`)}
        >
          <Text style={styles.actionBtnText}>📞 Appeler</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => deleteOrder(item.id)}
        >
          <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Commandes</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Nouvelle Commande</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: '#FF9800' }]}>
            <Text style={styles.statNumber}>{stats['En attente'] || 0}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#2196F3' }]}>
            <Text style={styles.statNumber}>{stats['Confirmée'] || 0}</Text>
            <Text style={styles.statLabel}>Confirmées</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#4CAF50' }]}>
            <Text style={styles.statNumber}>{stats['Prête'] || 0}</Text>
            <Text style={styles.statLabel}>Prêtes</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#4CAF50' }]}>
            <Text style={styles.statNumber}>{stats.totalRevenue.toFixed(0)}€</Text>
            <Text style={styles.statLabel}>Revenus</Text>
          </View>
        </View>
      </ScrollView>

      <FlatList
        data={orders}
        renderItem={({ item }) => <OrderItem item={item} />}
        keyExtractor={item => item.id.toString()}
        style={styles.orderList}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingOrder ? 'Modifier la commande' : 'Nouvelle Commande'}
              </Text>

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
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
              <TextInput
                style={styles.input}
                        placeholder="Sélectionner la date (YYYY-MM-DD)"
                        value={orderForm.deliveryDate}
                        onChangeText={(text) => setOrderForm({...orderForm, deliveryDate: text})}
                      />
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
                            {/* Races for this animal - directly under animal title */}
                            {racesByAnimal[animal]?.map((race) => (
                              <View key={race} style={styles.raceContainer}>
                                <Text style={styles.raceName}>{race}:</Text>
                                <View style={styles.quantityControlsContainer}>
                                  <TouchableOpacity 
                                    style={styles.quantityButton}
                                    onPress={() => {
                                      const current = parseInt(orderForm.animalDetails[animal]?.races[race]) || 0;
                                      if (current > 0) {
                                        updateRaceQuantity(animal, race, (current - 1).toString());
                                      }
                                    }}
                                  >
                                    <Text style={styles.quantityButtonText}>-</Text>
                                  </TouchableOpacity>
                                  <TextInput
                                    style={[styles.input, styles.quantityInputWithControls]}
                                    placeholder="0"
                                    value={orderForm.animalDetails[animal]?.races[race]?.toString() || '0'}
                                    onChangeText={(text) => updateRaceQuantity(animal, race, text)}
                                    keyboardType="number-pad"
                                  />
                                  <TouchableOpacity 
                                    style={styles.quantityButton}
                                    onPress={() => {
                                      const current = parseInt(orderForm.animalDetails[animal]?.races[race]) || 0;
                                      updateRaceQuantity(animal, race, (current + 1).toString());
                                    }}
                                  >
                                    <Text style={styles.quantityButtonText}>+</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </>
                        )}
                      </View>
                    ))}

                    {/* Age */}
                    <View style={styles.ageContainer}>
                      <Text style={styles.dropdownLabel}>Âge souhaité</Text>
                      <View style={styles.ageInputs}>
                        <View style={styles.ageInputContainer}>
                          <Text style={styles.ageLabel}>Mois:</Text>
                          <View style={styles.quantityControlsContainer}>
                            <TouchableOpacity 
                              style={styles.quantityButton}
                              onPress={() => {
                                const current = parseInt(orderForm.ageMonths) || 0;
                                if (current > 0) {
                                  setOrderForm({...orderForm, ageMonths: (current - 1).toString()});
                                }
                              }}
                            >
                              <Text style={styles.quantityButtonText}>-</Text>
                            </TouchableOpacity>
                            <TextInput
                              style={[styles.input, styles.ageInputWithControls]}
                              placeholder="0"
                              value={orderForm.ageMonths}
                              onChangeText={(text) => setOrderForm({...orderForm, ageMonths: text})}
                              keyboardType="number-pad"
                            />
                            <TouchableOpacity 
                              style={styles.quantityButton}
                              onPress={() => {
                                const current = parseInt(orderForm.ageMonths) || 0;
                                setOrderForm({...orderForm, ageMonths: (current + 1).toString()});
                              }}
                            >
                              <Text style={styles.quantityButtonText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.ageInputContainer}>
                          <Text style={styles.ageLabel}>Semaines:</Text>
                          <View style={styles.quantityControlsContainer}>
                            <TouchableOpacity 
                              style={styles.quantityButton}
                              onPress={() => {
                                const current = parseInt(orderForm.ageWeeks) || 0;
                                if (current > 0) {
                                  setOrderForm({...orderForm, ageWeeks: (current - 1).toString()});
                                }
                              }}
                            >
                              <Text style={styles.quantityButtonText}>-</Text>
                            </TouchableOpacity>
                            <TextInput
                              style={[styles.input, styles.ageInputWithControls]}
                              placeholder="0"
                              value={orderForm.ageWeeks}
                              onChangeText={(text) => setOrderForm({...orderForm, ageWeeks: text})}
                              keyboardType="number-pad"
                            />
                            <TouchableOpacity 
                              style={styles.quantityButton}
                              onPress={() => {
                                const current = parseInt(orderForm.ageWeeks) || 0;
                                setOrderForm({...orderForm, ageWeeks: (current + 1).toString()});
                              }}
                            >
                              <Text style={styles.quantityButtonText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
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

              <TextInput
                style={styles.input}
                  placeholder="Prix total"
                value={orderForm.totalPrice}
                onChangeText={(text) => setOrderForm({...orderForm, totalPrice: text})}
                keyboardType="decimal-pad"
              />

                {orderForm.orderType !== 'Adoption' && (
              <TextInput
                style={styles.input}
                    placeholder="Date de livraison (YYYY-MM-DD)"
                value={orderForm.deliveryDate}
                onChangeText={(text) => setOrderForm({...orderForm, deliveryDate: text})}
              />
                )}

              <View style={styles.statusSelector}>
                  <Text style={styles.statusSelectorLabel}>Statut de la commande:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

                {/* Buttons inside scroll area */}
                <View style={styles.modalActionsInside}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                    <Text style={styles.modalBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[
                      styles.modalBtn, 
                      styles.saveBtn,
                      (!orderForm.customerName || orderForm.orderType === '') && styles.saveBtnDisabled
                    ]}
                  onPress={saveOrder}
                >
                    <Text style={[
                      styles.modalBtnText, 
                      { color: 'white' },
                      (!orderForm.customerName || orderForm.orderType === '') && styles.saveBtnTextDisabled
                    ]}>
                      {editingOrder ? 'Modifier' : 'Créer'}
                  </Text>
                </TouchableOpacity>
            </View>
          </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#005F6B',
    padding: 10,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
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
  statsContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 15,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderLeftWidth: 4,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
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
  editBtn: {
    backgroundColor: '#2196F3',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalScrollView: {
    maxHeight: 400,
    paddingBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
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
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  statusOptionText: {
    fontSize: 11,
    fontWeight: '600',
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
    backgroundColor: '#005F6B',
  },
  modalBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
  modalActionsTop: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  ageContainer: {
    marginBottom: 20,
  },
  ageInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  ageInput: {
    flex: 1,
    marginBottom: 0,
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
  orderType: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
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
  modalActionsBottom: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  quantityInput: {
    flex: 0,
    width: 80,
    marginBottom: 0,
    textAlign: 'center',
  },
  animalSection: {
    backgroundColor: '#f9f9f9',
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
  raceSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  raceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  raceName: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  raceQuantityInput: {
    width: 60,
    marginBottom: 0,
    textAlign: 'center',
  },
  dateContainer: {
    marginBottom: 20,
  },
  // New quantity control styles
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
  // Age input styles
  ageInputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  ageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  ageInputWithControls: {
    marginBottom: 0,
    textAlign: 'center',
  },
  // Updated modal actions
  modalActionsInside: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(0, 95, 107, 0.5)',
  },
  saveBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
}); 