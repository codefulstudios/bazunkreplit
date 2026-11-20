import {ActivityIndicator, ScrollView, Text, TextInput, View} from '../components/ThemedNative';
import { useRef, useState } from "react";
import {Alert} from 'react-native';
import { router, useLocalSearchParams } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { RatingPicker, ReviewCard } from "../components/ReviewUI";
import { useMemberData, useMemberRequest } from "../hooks";
import {
  parseOrderReviews,
  parseReviewSaved,
  type OrderReviews,
} from "../reviews";
export default function OrderReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SellerAccess>
      <Order key={id} id={id || ""} />
    </SellerAccess>
  );
}
function Order({ id }: { id: string }) {
  const { data, error, loading, reload } = useMemberData(
    `/reviews/mobile/order/${encodeURIComponent(id)}`,
    parseOrderReviews,
  );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      <Text style={ui.title}>Order reviews</Text>
      <Button
        label="Refresh review status"
        disabled={loading}
        onPress={reload}
      />
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={ui.error}>{error}</Text>
      ) : (
        data && (
          <>
            <Text style={ui.link}>{data.title}</Text>
            <Text style={ui.copy}>
              {data.orderId} · {data.status.replace(/_/g, " ")}
            </Text>
            {data.mine ? (
              <>
                <Text style={ui.link}>Your review</Text>
                {data.mine.removed ? (
                  <Text style={ui.copy}>
                    This review was removed. A replacement review cannot be
                    submitted for the same order.
                  </Text>
                ) : (
                  <ReviewCard review={data.mine} />
                )}
              </>
            ) : (
              !data.canCreate && (
                <Text style={ui.copy}>
                  Reviews become available once the order has been sent.
                </Text>
              )
            )}
            {(data.canCreate || data.mine?.canEdit || data.mine?.canDelete) && (
              <Editor
                key={`${data.mine?.id ?? "new"}:${data.mine?.editedAt ?? data.mine?.createdAt ?? ""}`}
                data={data}
                reload={reload}
              />
            )}{" "}
            {!!data.received && (
              <>
                <Text style={ui.link}>Review you received</Text>
                <ReviewCard review={data.received} />
                <Button
                  label="Report received review"
                  onPress={() =>
                    router.push({
                      pathname: "/review-report",
                      params: { id: data.received!.id },
                    })
                  }
                />
                {data.received.canReply && (
                  <Reply id={data.received.id} reload={reload} />
                )}
              </>
            )}
            <Text style={ui.copy}>
              Reviews are shared with the website and subject to moderation.
              Refresh after an interrupted request before submitting again.
            </Text>
          </>
        )
      )}
    </ScrollView>
  );
}
function Editor({ data, reload }: { data: OrderReviews; reload: () => void }) {
  const request = useMemberRequest(),
    lock = useRef(false);
  const [rating, setRating] = useState<number | null>(
      data.mine?.rating ?? null,
    ),
    [comment, setComment] = useState(data.mine?.comment ?? ""),
    [item, setItem] = useState<number | null>(
      data.mine?.itemAsDescribed ?? null,
    ),
    [dispatch, setDispatch] = useState<number | null>(
      data.mine?.dispatchRating ?? null,
    ),
    [packaging, setPackaging] = useState<number | null>(
      data.mine?.packagingRating ?? null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function action(remove = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      parseReviewSaved(
        await request(
          remove
            ? `/reviews/${data.mine!.id}/mine`
            : data.mine
              ? `/reviews/${data.mine.id}`
              : "/reviews",
          {
            method: remove ? "DELETE" : data.mine ? "PATCH" : "POST",
            body: remove
              ? undefined
              : {
                  orderId: data.orderId,
                  rating,
                  comment,
                  itemAsDescribed: item,
                  dispatchRating: dispatch,
                  packagingRating: packaging,
                },
          },
        ),
      );
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review could not be saved.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={ui.card}>
      {(data.canCreate || data.mine?.canEdit) && (
        <>
          <Text style={ui.link}>
            {data.mine ? "Edit your review" : "Leave a review"}
          </Text>
          {data.mine && (
            <Text style={ui.copy}>
              Editable until {new Date(data.mine.editDeadline).toLocaleString()}
              .
            </Text>
          )}
          <RatingPicker
            label="Overall rating"
            value={rating}
            onChange={setRating}
            disabled={busy}
          />
          {data.role === "buyer_to_seller" && (
            <>
              <RatingPicker
                label="Item as described"
                value={item}
                onChange={setItem}
                optional
                disabled={busy}
              />
              <RatingPicker
                label="Dispatch"
                value={dispatch}
                onChange={setDispatch}
                optional
                disabled={busy}
              />
              <RatingPicker
                label="Packaging"
                value={packaging}
                onChange={setPackaging}
                optional
                disabled={busy}
              />
            </>
          )}
          <TextInput
            accessibilityLabel="Review comment"
            style={ui.input}
            multiline
            maxLength={1000}
            value={comment}
            onChangeText={setComment}
            editable={!busy}
            placeholder="Share your transaction experience (optional)"
          />
          <Button
            label={
              busy
                ? "Saving…"
                : data.mine
                  ? "Save review changes"
                  : "Submit review"
            }
            disabled={busy || rating === null}
            onPress={() => void action()}
          />
        </>
      )}
      {data.mine?.canDelete && (
        <Button
          label="Remove my review"
          disabled={busy}
          onPress={() =>
            Alert.alert(
              "Remove your review?",
              "It will no longer appear publicly. You cannot submit another review for this order.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove",
                  style: "destructive",
                  onPress: () => void action(true),
                },
              ],
            )
          }
        />
      )}{" "}
      {!!error && <Text style={ui.error}>{error}</Text>}
    </View>
  );
}
function Reply({ id, reload }: { id: number; reload: () => void }) {
  const request = useMemberRequest(),
    lock = useRef(false);
  const [reply, setReply] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      parseReviewSaved(
        await request(`/reviews/${id}/reply`, {
          method: "POST",
          body: { reply },
        }),
      );
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reply.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={ui.card}>
      <Text style={ui.copy}>You can add one public seller reply.</Text>
      <TextInput
        accessibilityLabel="Seller reply"
        multiline
        maxLength={1000}
        value={reply}
        onChangeText={setReply}
        style={ui.input}
        editable={!busy}
      />
      <Button
        label="Publish reply"
        disabled={busy || !reply.trim()}
        onPress={() =>
          Alert.alert(
            "Publish reply?",
            "Your reply is public and cannot be edited here.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Publish", onPress: () => void save() },
            ],
          )
        }
      />
      {!!error && <Text style={ui.error}>{error}</Text>}
    </View>
  );
}
