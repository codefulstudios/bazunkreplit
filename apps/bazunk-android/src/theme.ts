import {useColorScheme} from 'react-native';
import {useMarketplaceSettings} from './components/MarketplaceSettings';
import {resolveNativePalette,type DesignMode} from './design-palette';
export const resolveTheme=resolveNativePalette;
export function useTheme(){const {snapshot}=useMarketplaceSettings();const mode:DesignMode=useColorScheme()==='dark'?'dark':'light';const settings=snapshot?.settings||{};return {mode,settings,palette:resolveTheme(settings,mode)}}
