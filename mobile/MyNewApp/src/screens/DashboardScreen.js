import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Alert 
} from 'react-native';
import database from '../services/database';

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [products, orders] = await Promise.all([
        database.getProducts(),
        database.getOrders()
      ]);

      const pendingOrders = orders.filter(order => order.status === 'pending');
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const lowStockItems = products.filter(product => (product.quantity || 0) < 10).length;

      setStats({
        totalProducts: products.length,
        totalOrders: orders.length,
        pendingOrders: pendingOrders.length,
        totalRevenue: totalRevenue,
        lowStockItems: lowStockItems
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleExport = async (tableName) => {
    try {
      await database.exportToCSV(tableName);
      Alert.alert('Success', `${tableName} data exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', `Failed to export ${tableName} data`);
    }
  };

  const handleBackup = async () => {
    try {
      await database.backupDatabase();
      Alert.alert('Success', 'Database backup created successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Error', 'Failed to create backup');
    }
  };

  const StatCard = ({ title, value, color, icon }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐓 La Ferme Aux oeufs bleus</Text>
        <Text style={styles.headerDate}>
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          title="Total Produits" 
          value={stats.totalProducts} 
          color="#4CAF50" 
        />
        <StatCard 
          title="Total Commandes" 
          value={stats.totalOrders} 
          color="#2196F3" 
        />
        <StatCard 
          title="Commandes en Attente" 
          value={stats.pendingOrders} 
          color="#FF9800" 
        />
        <StatCard 
          title="Revenus" 
          value={`${stats.totalRevenue.toFixed(2)}€`} 
          color="#4CAF50" 
        />
        <StatCard 
          title="Stock Faible" 
          value={stats.lowStockItems} 
          color="#F44336" 
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activité Récente</Text>
        <View style={styles.activityItem}>
          <Text style={styles.activityText}>🥚 Nouvelle commande d'œufs de consommation (2 douzaines)</Text>
          <Text style={styles.activityTime}>Il y a 2 heures</Text>
        </View>
        <View style={styles.activityItem}>
          <Text style={styles.activityText}>🐓 Inventaire des poules pondeuses mis à jour</Text>
          <Text style={styles.activityTime}>Il y a 4 heures</Text>
        </View>
        <View style={styles.activityItem}>
          <Text style={styles.activityText}>✅ Adoption #1234 finalisée</Text>
          <Text style={styles.activityTime}>Il y a 1 jour</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions Rapides</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📝 Ajouter Produit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📅 Voir Calendrier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 Statistiques</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export de Données</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleExport('products')}
          >
            <Text style={styles.actionButtonText}>📤 Exporter Produits</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleExport('orders')}
          >
            <Text style={styles.actionButtonText}>📤 Exporter Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleBackup}
          >
            <Text style={styles.actionButtonText}>💾 Sauvegarder Tout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerDate: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  statsGrid: {
    padding: 15,
    gap: 10,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    margin: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  activityItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 3,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#005F6B',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});