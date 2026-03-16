import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/constants/colors';

export default function QueueScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>⏳ Queue — Coming in Iteration 4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.text,
    fontSize: 18,
  },
});
