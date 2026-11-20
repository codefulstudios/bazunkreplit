import {ScrollView,Text} from '../components/ThemedNative';
import {Button,ui} from '../components/UI';
import {NativeAd} from '../components/NativeAd';
import {useMarketplaceSettings} from '../components/MarketplaceSettings';
import {openWebsite} from '../components/AppMenu';
export default function Support(){const {snapshot}=useMarketplaceSettings();const settings=snapshot?.settings||{};return <ScrollView contentContainerStyle={ui.page}><Text style={ui.title}>Help & support</Text><Text style={ui.copy}>Get help with your Bazunk account, listings or purchases.</Text>{!!settings.contact_email&&<Text selectable style={ui.copy}>Email: {settings.contact_email}</Text>}{!!settings.contact_phone&&<Text selectable style={ui.copy}>Phone: {settings.contact_phone}</Text>}<NativeAd slot="support_mid"/><Button label="Open Bazunk support website" onPress={()=>void openWebsite('/support')}/></ScrollView>}
