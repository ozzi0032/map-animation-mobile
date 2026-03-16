import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  visible: boolean;
}

export const LoadingOverlay: React.FC<Props> = ({ visible }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.container}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: Colors.surface,
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
