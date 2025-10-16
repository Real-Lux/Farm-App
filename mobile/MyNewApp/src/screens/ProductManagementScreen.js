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

export default function ProductManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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

  useEffect(() => {
    loadProducts();
  }, []);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={[styles.statusBarOverlay, { height: insets.top }]} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>📦 Produits</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.elevageButton}
              onPress={() => navigation.navigate('ElevageScreen')}
            >
              <Text style={styles.elevageButtonText}>🐓 Élevage</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
              <Text style={styles.addButtonText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <FlatList
          data={products}
          renderItem={({ item }) => <ProductItem item={item} />}
          keyExtractor={item => item.id.toString()}
          style={styles.productList}
          showsVerticalScrollIndicator={false}
        />

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
    backgroundColor: '#005F6B', // Darker blue, like duck blue (bleu canard)
    paddingTop: 15,
  },
  headerContent: {
    padding: 10,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  elevageButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  elevageButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
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
  productList: {
    padding: 15,
  },
  productCard: {
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
}); 