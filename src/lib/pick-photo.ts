import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

import { askPhotoSource, type PhotoSource } from '@/components/photo-source-sheet';

type Options = { title: string; /** Crop to a square (profile pictures). */ square?: boolean };

function denied(what: string) {
  Alert.alert(`Allow ${what} access`, `Spice Kart needs ${what} access for this. You can turn it on in Settings.`, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ]);
}

async function launch(source: PhotoSource, square?: boolean) {
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
export async function pickPhoto({ title, square }: Options): Promise<string | null> {
  const source = await askPhotoSource(title);
  if (!source) return null;
  try {
    return await launch(source, square);
  } catch {
    // The camera isn't available on simulators.
    Alert.alert('Camera unavailable', 'Please choose a photo from your library instead.');
    return null;
  }
}
