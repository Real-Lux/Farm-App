import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';

export default function AddOrderScreen({ navigation, route }) {
  const { editingOrder, onSaveOrder } = route.params || {};
  
  const [expandedAnimals, setExpandedAnimals] = useState({ poules: true });
  const [orderForm, setOrderForm] = useState(editingOrder ? {
    orderType: editingOrder.orderType || 'Adoption',
    selectedAnimals: editingOrder.selectedAnimals || ['poules'],
    animalDetails: editingOrder.animalDetails || {
      poules: {
        races: { 'Marans': 1 },
        characteristics: [],
        colors: {},
        genders: {}
      }
    },
    ageMonths: editingOrder.ageMonths || '',
    ageWeeks: editingOrder.ageWeeks || '',
    deliveryDate: editingOrder.deliveryDate || '',
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

  const orderStatuses = ['En attente', 'Confirmée', 'En préparation', 'Prête', 'Livrée', 'Annulée'];

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

    onSaveOrder(newOrder, !!editingOrder);
    navigation.goBack();
    Alert.alert('Succès', `Commande ${editingOrder ? 'mise à jour' : 'créée'} avec succès!`);
  };

  const isFormValid = orderForm.customerName && orderForm.orderType;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingOrder ? 'Modifier la commande' : 'Nouvelle Commande'}
        </Text>
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

        {/* Bottom padding for scroll */}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
    padding: 15,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginHorizontal: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  raceName: {
    fontSize: 13,
    color: '#666',
    flex: 1,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
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
  bottomPadding: {
    height: 50,
  },
});
