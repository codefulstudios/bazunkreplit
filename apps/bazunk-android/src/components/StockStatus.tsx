import { ActivityIndicator, Text, View } from "react-native";
import { usePublicData } from "../publicData";
import { parseInventory } from "../inventory";
import { Button, ui } from "./UI";
export function StockStatus({ id }: { id: number }) {
  const { data, error, loading, reload } = usePublicData(
    `/inventory/listings/${id}`,
    parseInventory,
  );
  return (
    <View style={ui.card}>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <>
          <Text style={ui.error}>{error}</Text>
          <Button label="Retry stock" onPress={reload} />
        </>
      ) : (
        data && (
          <Text style={ui.copy}>
            {data.available > 0
              ? `${data.available} available`
              : "Currently sold out or reserved in checkout"}
          </Text>
        )
      )}
    </View>
  );
}
