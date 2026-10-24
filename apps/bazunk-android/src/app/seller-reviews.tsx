import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { usePublicData } from "../publicData";
import { parseSellerReviews } from "../reviews";
import { ReputationCard, ReviewCard } from "../components/ReviewUI";
import { Button, ui } from "../components/UI";
export default function SellerReviews() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Reviews key={id} id={id || ""} />;
}
function Reviews({ id }: { id: string }) {
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = usePublicData(
    `/reviews/mobile/listing/${encodeURIComponent(id)}?offset=${page * 10}`,
    parseSellerReviews,
  );
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>Seller reputation and reviews</Text>
      <Button label="Refresh reviews" disabled={loading} onPress={reload} />
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={ui.error}>{error}</Text>
      ) : (
        data && (
          <>
            <ReputationCard data={data.reputation} />
            {data.reviews.length === 0 && (
              <Text style={ui.copy}>No reviews on this page.</Text>
            )}
            {data.reviews.map((review) => (
              <View key={review.id}>
                <ReviewCard review={review} />
                <Button
                  label="Report review"
                  onPress={() =>
                    router.push({
                      pathname: "/review-report",
                      params: { id: review.id },
                    })
                  }
                />
              </View>
            ))}
          </>
        )
      )}
      {page > 0 && (
        <Button
          label="Previous reviews"
          disabled={loading}
          onPress={() => setPage((n) => n - 1)}
        />
      )}{" "}
      {data?.reviews.length === 10 && (
        <Button
          label="Next reviews"
          disabled={loading}
          onPress={() => setPage((n) => n + 1)}
        />
      )}
      <Text style={ui.copy}>
        These figures describe recorded activity, not a guarantee of future
        service. Removed reviews are excluded. Delivery, returns and dispute
        outcomes may require support review.
      </Text>
    </ScrollView>
  );
}
