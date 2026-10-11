import { Alert } from 'react-native';

// Local changes are saved before a shelf is updated, so a failed shelf update
// only means the shared copy is behind — tell the user rather than pretend.
export function alertShelfSyncFailed() {
  Alert.alert(
    'Shelves Not Updated',
    'Your change is saved in your library, but your shared shelves couldn\'t be updated. Check your connection and try again.',
  );
}
