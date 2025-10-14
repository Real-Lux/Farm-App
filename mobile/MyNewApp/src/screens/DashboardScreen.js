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
import { SafeAreaView } from 'react-native-safe-area-context';
import database from '../services/database';
import emailService from '../services/emailService';
import * as Sharing from 'expo-sharing';

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
      // Show loading alert
      Alert.alert('Export en cours', 'Génération du fichier CSV...');
      
      // Export data to CSV
      console.log(`Exporting ${tableName}...`);
      const exportResult = await database.exportToCSV(tableName);
      console.log(`Export result for ${tableName}:`, exportResult);
      
      if (exportResult.fileUri) {
        // List all files after creation
        await database.listDocumentFiles();
        
        // Share the file locally first
        if (await Sharing.isAvailableAsync()) {
          console.log('📤 Sharing file:', exportResult.fileUri);
          await Sharing.shareAsync(exportResult.fileUri, {
            mimeType: 'text/csv',
            dialogTitle: `Export ${tableName}`
          });
          console.log('✅ Share dialog completed');
        } else {
          console.log('❌ Sharing not available');
        }
        
        // Ask if user wants to send via email
        Alert.alert(
          'Export réussi',
          `Fichier ${tableName} exporté avec succès!\n\nVoulez-vous l'envoyer par email à ${emailService.backupEmail}?`,
          [
            { text: 'Non', style: 'cancel' },
            { 
              text: 'Envoyer par email', 
              onPress: async () => {
                try {
                  await emailService.sendSingleExport(tableName, exportResult.fileUri);
                } catch (emailError) {
                  console.error('Email error:', emailError);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Succès', `${tableName} exporté avec succès!`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erreur', error.message || `Impossible d'exporter ${tableName}`);
    }
  };

  const handleCalendarWithOrdersExport = async () => {
    try {
      Alert.alert('Export en cours', 'Génération du calendrier avec commandes...');
      
      console.log('Exporting calendar with orders...');
      const exportResult = await database.exportCalendarWithOrders();
      console.log('Calendar with orders export result:', exportResult);
      
      if (exportResult.fileUri) {
        // List all files after creation
        await database.listDocumentFiles();
        
        // Share the file locally first
        if (await Sharing.isAvailableAsync()) {
          console.log('📤 Sharing calendar file:', exportResult.fileUri);
          await Sharing.shareAsync(exportResult.fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Calendrier + Commandes'
          });
          console.log('✅ Share dialog completed');
        } else {
          console.log('❌ Sharing not available');
        }
        
        // Ask if user wants to send via email
        Alert.alert(
          'Export réussi',
          `Fichier calendrier avec commandes exporté avec succès!\n\nVoulez-vous l'envoyer par email à ${emailService.backupEmail}?`,
          [
            { text: 'Non', style: 'cancel' },
            { 
              text: 'Envoyer par email', 
              onPress: async () => {
                try {
                  await emailService.sendSingleExport('calendrier_commandes', exportResult.fileUri);
                } catch (emailError) {
                  console.error('Email error:', emailError);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Succès', 'Calendrier avec commandes exporté avec succès!');
      }
    } catch (error) {
      console.error('Calendar export error:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'exporter le calendrier avec commandes');
    }
  };

  const handleBackup = async () => {
    try {
      Alert.alert('Sauvegarde en cours', 'Création de la sauvegarde complète...');
      
      const filesToSend = [];
      const tables = ['products', 'orders', 'calendar_events', 'elevage_lots', 'elevage_races', 'elevage_historique'];
      
      // Export each table to CSV
      for (const tableName of tables) {
        try {
          console.log(`Attempting to export ${tableName}...`);
          const exportResult = await database.exportToCSV(tableName);
          console.log(`Export result for ${tableName}:`, exportResult);
          
          if (exportResult.fileUri || exportResult.data) {
            filesToSend.push({
              uri: exportResult.fileUri,
              filename: exportResult.fileName
            });
            console.log(`Added ${tableName} to files to send`);
          }
        } catch (error) {
          console.log(`Skipping ${tableName} - error:`, error.message);
        }
      }
      
      // Create calendar with orders export
      try {
        console.log('Creating calendar with orders export...');
        const calendarResult = await database.exportCalendarWithOrders();
        console.log('Calendar with orders result:', calendarResult);
        
        if (calendarResult.fileUri || calendarResult.data) {
          filesToSend.push({
            uri: calendarResult.fileUri,
            filename: calendarResult.fileName
          });
          console.log('Added calendar with orders to files to send');
        }
      } catch (error) {
        console.log('Skipping calendar with orders - no data available');
      }

      // Create main backup JSON file
      try {
        console.log('Creating main backup...');
        const backupResult = await database.backupDatabase();
        console.log('Backup result:', backupResult);
        
        if (backupResult.fileUri || backupResult.data) {
          filesToSend.push({
            uri: backupResult.fileUri,
            filename: backupResult.fileName
          });
          console.log('Added main backup to files to send');
        }
      } catch (error) {
        console.error('Error creating main backup:', error);
      }
      
      console.log(`Total files to send: ${filesToSend.length}`, filesToSend);
      
      if (filesToSend.length === 0) {
        Alert.alert('Erreur', 'Aucune donnée à sauvegarder');
        return;
      }
      
      // Send all files via email
      Alert.alert(
        'Sauvegarde prête',
        `${filesToSend.length} fichier(s) créé(s).\n\nEnvoyer la sauvegarde complète par email à ${emailService.backupEmail}?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Envoyer par email', 
            onPress: async () => {
              try {
                await emailService.sendFullBackup(filesToSend);
              } catch (emailError) {
                console.error('Email backup error:', emailError);
                Alert.alert('Erreur', 'Impossible d\'envoyer l\'email de sauvegarde');
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Erreur', 'Impossible de créer la sauvegarde');
    }
  };

  const StatCard = ({ title, value, color, icon }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView 
        style={styles.scrollView}
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
            onPress={() => handleExport('calendar_events')}
          >
            <Text style={styles.actionButtonText}>📅 Exporter Calendrier</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCalendarWithOrdersExport}
          >
            <Text style={styles.actionButtonText}>📋 Calendrier + Commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleBackup}
          >
            <Text style={styles.actionButtonText}>💾 Sauvegarder Tout</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
            onPress={async () => {
              console.log('🔍 DEBUG: Listing all files...');
              await database.listDocumentFiles();
              Alert.alert('Debug', 'Check console for file list');
            }}
          >
            <Text style={styles.actionButtonText}>🔍 Debug: List Files</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff', // Light blue-gray instead of white
  },
  scrollView: {
    flex: 1,
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