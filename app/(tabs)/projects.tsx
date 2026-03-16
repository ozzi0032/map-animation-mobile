import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/constants/colors';

export default function ProjectsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>📁 Projects — Coming in Iteration 3</Text>
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
