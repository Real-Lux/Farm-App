import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';

class EmailService {
  constructor() {
    this.backupEmail = 'lescurtils@gmail.com';
  }

  async isEmailAvailable() {
    return await MailComposer.isAvailableAsync();
  }

  async sendBackupEmail(attachments = [], subject = 'Farm App - Sauvegarde de données') {
    try {
      const isAvailable = await this.isEmailAvailable();
      
      if (!isAvailable) {
        Alert.alert(
          'Email non disponible',
          'Aucune application email n\'est configurée sur cet appareil. Les fichiers ont été sauvegardés localement.',
          [{ text: 'OK' }]
        );
        return false;
      }

      const emailBody = `
Bonjour,

Voici la sauvegarde automatique des données de l'application Farm App.

Date de sauvegarde: ${new Date().toLocaleDateString('fr-FR')}
Heure: ${new Date().toLocaleTimeString('fr-FR')}

Fichiers inclus:
${attachments.map(att => `- ${att.filename}`).join('\n')}

Cette sauvegarde a été générée automatiquement par l'application Farm App.

Cordialement,
L'équipe Farm App
      `;

      const result = await MailComposer.composeAsync({
        recipients: [this.backupEmail],
        subject: subject,
        body: emailBody,
        attachments: attachments.map(att => att.uri)
      });

      if (result.status === 'sent') {
        Alert.alert('Succès', 'Email de sauvegarde envoyé avec succès!');
        return true;
      } else if (result.status === 'cancelled') {
        Alert.alert('Annulé', 'L\'envoi de l\'email a été annulé.');
        return false;
      } else {
        Alert.alert('Erreur', 'Erreur lors de l\'envoi de l\'email.');
        return false;
      }
    } catch (error) {
      console.error('Error sending backup email:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'email de sauvegarde.');
      return false;
    }
  }

  async sendSingleExport(tableName, fileUri) {
    const fileName = `${tableName}_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    try {
      await this.sendBackupEmail(
        [{ uri: fileUri, filename: fileName }],
        `Farm App - Export ${tableName}`
      );
    } catch (error) {
      console.error('Error sending single export:', error);
      throw error;
    }
  }

  async sendFullBackup(files) {
    try {
      const attachments = files.map(file => ({
        uri: file.uri,
        filename: file.filename
      }));

      await this.sendBackupEmail(
        attachments,
        'Farm App - Sauvegarde complète'
      );
    } catch (error) {
      console.error('Error sending full backup:', error);
      throw error;
    }
  }
}

export default new EmailService();
