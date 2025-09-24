import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  FlatList
} from 'react-native';

export default function BookingSystemScreen({ navigation, orders: externalOrders, setOrders: setExternalOrders }) {
  const [orders, setOrders] = useState(externalOrders || []);

  const orderStatuses = ['En attente', 'Confirmée', 'En préparation', 'Prête', 'Livrée', 'Annulée'];

  useEffect(() => {
    if (externalOrders && externalOrders.length > 0) {
      setOrders(externalOrders);
    } else {
      loadOrders();
    }
  }, [externalOrders]);

  // Update external orders when internal orders change
  useEffect(() => {
    if (setExternalOrders && orders.length > 0) {
      setExternalOrders(orders);
    }
  }, [orders, setExternalOrders]);

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
    navigation.navigate('AddOrder', {
      editingOrder: null,
      onSaveOrder: handleSaveOrder
    });
  };

  const openEditModal = (order) => {
    navigation.navigate('AddOrder', {
      editingOrder: order,
      onSaveOrder: handleSaveOrder
    });
  };

  const handleSaveOrder = (newOrder, isEditing) => {
    if (isEditing) {
      setOrders(orders.map(o => o.id === newOrder.id ? newOrder : o)
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)));
    } else {
      setOrders([newOrder, ...orders]);
    }
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
  orderType: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
}); 