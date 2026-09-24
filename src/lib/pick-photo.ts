import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

type Options = { title: string; /** Crop to a square (profile pictures). */ square?: boolean };

function denied(what: string) {
  Alert.alert(`Allow ${what} access`, `Spice Kart needs ${what} access for this. You can turn it on in Settings.`, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ]);
}

async function launch(source: 'camera' | 'library', square?: boolean) {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', allowsEditing: !!square, aspect: [1, 1], quality: 0.7 };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      denied('camera');
      return null;
    }
    const res = await ImagePicker.launchCameraAsync(options);
    return res.canceled ? null : res.assets[0].uri;
  }
  const res = await ImagePicker.launchImageLibraryAsync(options);
  return res.canceled ? null : res.assets[0].uri;
}

/** Ask "Take photo / Choose from library" and resolve with the picked image URI (null if cancelled). */
export function pickPhoto({ title, square }: Options): Promise<string | null> {
  return new Promise((resolve) => {
    const run = (source: 'camera' | 'library') =>
      launch(source, square)
        .then(resolve)
        .catch(() => {
          // The camera isn't available on simulators.
          Alert.alert('Camera unavailable', 'Please choose a photo from your library instead.');
          resolve(null);
        });
    Alert.alert(title, undefined, [
      { text: 'Take photo', onPress: () => run('camera') },
      { text: 'Choose from library', onPress: () => run('library') },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}
