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
import database from '../services/database';

export default function ProductManagementScreen() {
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
      Alert.alert('Error', 'Failed to load products');
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
      Alert.alert('Error', 'Please fill all fields');
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
      Alert.alert('Success', `Product ${editingProduct ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', `Failed to ${editingProduct ? 'update' : 'add'} product`);
    }
  };

  const deleteProduct = (id) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await database.deleteProduct(id);
            loadProducts(); // Reload the list
            Alert.alert('Success', 'Product deleted successfully!');
          } catch (error) {
            console.error('Error deleting product:', error);
            Alert.alert('Error', 'Failed to delete product');
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
          {item.quantity < 20 ? '⚠️ Low Stock' : '✅ In Stock'}
        </Text>
      </View>
      
      <View style={styles.productDetails}>
        <Text style={styles.productInfo}>💰 ${item.price.toFixed(2)} per {item.unit}</Text>
        <Text style={styles.productInfo}>📦 {item.quantity} {item.unit} available</Text>
        <Text style={styles.productInfo}>🏷️ {item.category}</Text>
      </View>

      <View style={styles.productActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => deleteProduct(item.id)}
        >
          <Text style={styles.actionBtnText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 Product Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

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
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Product Name"
              value={productForm.name}
              onChangeText={(text) => setProductForm({...productForm, name: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Price"
              value={productForm.price}
              onChangeText={(text) => setProductForm({...productForm, price: text})}
              keyboardType="decimal-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Quantity"
              value={productForm.quantity}
              onChangeText={(text) => setProductForm({...productForm, quantity: text})}
              keyboardType="number-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Unit (kg, heads, boxes, etc.)"
              value={productForm.unit}
              onChangeText={(text) => setProductForm({...productForm, unit: text})}
            />

            <TextInput
              style={styles.input}
              placeholder="Category"
              value={productForm.category}
              onChangeText={(text) => setProductForm({...productForm, category: text})}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveProduct}
              >
                <Text style={[styles.modalBtnText, { color: 'white' }]}>
                  {editingProduct ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: '#005F6B', // Darker blue, like duck blue (bleu canard)
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