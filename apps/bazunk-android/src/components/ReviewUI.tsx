import {Pressable, Text, View} from './ThemedNative';

import { ui } from "./UI";
import type { Review, Reputation } from "../reviews";
export function RatingPicker({
  label,
  value,
  onChange,
  optional = false,
  disabled = false,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  optional?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.copy}>
        {label}
        {optional ? " (optional)" : ""}: {value ?? "not rated"}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(optional ? [null, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5]).map((n) => (
          <Pressable
            key={n ?? "none"}
            accessibilityRole="button"
            accessibilityLabel={
              n === null ? `Clear ${label}` : `${label}: ${n} stars`
            }
            accessibilityState={{ selected: value === n, disabled }}
            disabled={disabled}
            onPress={() => onChange(n)}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: value === n ? "#ef8a20" : "#e8effb",
            }}
          >
            <Text style={ui.copy}>{n === null ? "None" : `${n} ★`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function ReviewCard({ review }: { review: Review }) {
  return (
    <View style={ui.card}>
      <Text style={{ fontSize: 22, color: "#b66809" }}>
        {"★".repeat(review.rating)}
        {"☆".repeat(5 - review.rating)}
      </Text>
      <Text style={ui.link}>{review.itemTitle}</Text>
      <Text style={ui.copy}>
        Verified transaction · {new Date(review.createdAt).toLocaleDateString()}
        {review.editedAt ? " · Edited" : ""}
      </Text>
      {!!review.comment && <Text style={ui.copy}>{review.comment}</Text>}
      {[
        [review.itemAsDescribed, "Item as described"],
        [review.dispatchRating, "Dispatch"],
        [review.packagingRating, "Packaging"],
      ].map(
        ([rating, label]) =>
          rating !== null && (
            <Text key={String(label)} style={ui.copy}>
              {label}: {rating}/5
            </Text>
          ),
      )}
      {!!review.reply && (
        <View
          style={{ padding: 12, backgroundColor: "#fff3e5", borderRadius: 12 }}
        >
          <Text style={ui.link}>Seller reply</Text>
          <Text style={ui.copy}>{review.reply}</Text>
        </View>
      )}
    </View>
  );
}
export function ReputationCard({ data }: { data: Reputation }) {
  return (
    <View style={ui.card}>
      <Text style={ui.title}>{data.profile.username || data.profile.name}</Text>
      <Text style={ui.copy}>
        {data.profile.verified ? "Verified seller" : "Seller profile"}
        {data.memberSince
          ? ` · Member since ${new Date(data.memberSince).toLocaleDateString()}`
          : ""}
      </Text>
      <Text style={ui.copy}>
        {data.reviews.total
          ? `${data.reviews.average.toFixed(2)}/5 from ${data.reviews.total} reviews`
          : "No seller reviews yet"}
      </Text>
      <Text style={ui.copy}>
        {data.positivePercent === null
          ? "Positive percentage appears after 3 reviews."
          : `${data.positivePercent}% positive (4–5 stars)`}
      </Text>
      <Text style={ui.copy}>
        {data.successfulSales} sent sales · {data.repeatBuyers} repeat buyers
      </Text>
      <Text style={ui.copy}>
        Median dispatch:{" "}
        {data.dispatchMedianHours === null
          ? "not enough data"
          : `${data.dispatchMedianHours} hours`}
        . Based on {data.dispatchSampleSize} dispatches in the last 90 days; at
        least 3 required.
      </Text>
      <Text style={ui.copy}>
        Median first reply:{" "}
        {data.replyMedianHours === null
          ? "not enough data"
          : `${data.replyMedianHours} hours`}
        .
      </Text>
    </View>
  );
}
