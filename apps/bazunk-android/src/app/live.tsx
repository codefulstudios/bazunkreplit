import {NativeAd} from '../components/NativeAd';
import {ActivityIndicator, ScrollView, Text, TextInput, View} from '../components/ThemedNative';
import { useRef, useState } from "react";
import {Alert} from 'react-native';
import { router } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { Feedback, ListingPicker, useTask } from "../components/BusinessUI";
import { CaseLink } from "../components/CaseLink";
import { useMemberData, useMemberRequest } from "../hooks";
import { usePublicData } from "../publicData";
import { rows, ref, saved } from "../business";
export default function Live() {
  const list = usePublicData("/mobile/live", rows),
    [selected, setSelected] = useState<Record<string, unknown> | null>(null),
    [hosting, setHosting] = useState(false);
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      <Text style={ui.title}>Bazunk live selling</Text>
      <Text style={ui.copy}>
        Discover YouTube and Twitch streams. Video opens in the provider’s app
        or browser; product links and Bazunk chat stay here.
      </Text>
      <Button
        label={hosting ? "Close host controls" : "Host a stream"}
        onPress={() => setHosting((v) => !v)}
      />
      {hosting && (
        <SellerAccess>
          <Host />
        </SellerAccess>
      )}
      {selected ? (
        <>
          <Button label="Back to streams" onPress={() => setSelected(null)} />
          <Stream key={String(selected.id)} stream={selected} />
        </>
      ) : (
        <>
          <Button
            label="Refresh streams"
            disabled={list.loading}
            onPress={list.reload}
          />
          {list.loading ? (
            <ActivityIndicator />
          ) : list.error ? (
            <Text style={ui.error}>{list.error}</Text>
          ) : !list.data?.length ? (
            <Text style={ui.copy}>No streams are listed right now.</Text>
          ) : (
            list.data.map((s) => (
              <View key={String(s.id)} style={ui.card}>
                <Text style={ui.link}>{String(s.title)}</Text>
                <Text style={ui.copy}>
                  {String(s.sellerName)} · {String(s.platform)}
                </Text>
                <Button
                  label="Open live session"
                  onPress={() => setSelected(s)}
                />
              </View>
            ))
          )}
        </>
      )}
    <NativeAd slot="live_left"/><NativeAd slot="live_bottom"/></ScrollView>
  );
}
function Host() {
  const request = useMemberRequest(),
    task = useTask(),
    mine = useMemberData("/mobile/live/mine", rows),
    id = useRef(ref()),
    [title, setTitle] = useState(""),
    [platform, setPlatform] = useState("youtube"),
    [url, setUrl] = useState(""),
    [listing, setListing] = useState(0);
  return (
    <View style={ui.card}>
      <Text style={ui.link}>Publish your stream link</Text>
      <Text style={ui.copy}>
        Start broadcasting in YouTube or Twitch first. Bazunk does not capture
        or broadcast your camera here. Ending a Bazunk session removes its
        listing; stop the broadcast separately in your provider.
      </Text>
      <TextInput
        style={ui.input}
        placeholder="Stream title"
        value={title}
        onChangeText={setTitle}
        maxLength={150}
        editable={!task.busy}
      />
      {["youtube", "twitch"].map((p) => (
        <Button
          key={p}
          label={(platform === p ? "✓ " : "") + p}
          disabled={task.busy}
          onPress={() => setPlatform(p)}
        />
      ))}
      <TextInput
        style={ui.input}
        placeholder="HTTPS stream URL"
        autoCapitalize="none"
        value={url}
        onChangeText={setUrl}
        maxLength={1000}
        editable={!task.busy}
      />
      <ListingPicker
        value={listing}
        onChange={setListing}
        disabled={task.busy}
      />
      <Button
        label="Publish live session"
        disabled={task.busy || !title || !url}
        onPress={() =>
          void task.run(async () => {
            saved(
              await request("/mobile/live", {
                method: "POST",
                body: {
                  id: id.current,
                  title,
                  platform,
                  streamUrl: url,
                  productIds: listing ? [listing] : [],
                },
              }),
            );
            task.setNotice("Stream listed on Bazunk.");
            mine.reload();
          })
        }
      />
      <Button
        label="Refresh my sessions"
        onPress={mine.reload}
        disabled={task.busy || mine.loading}
      />
      {mine.error && <Text style={ui.error}>{mine.error}</Text>}
      {mine.data
        ?.filter((s) => s.isLive)
        .map((s) => (
          <View key={String(s.id)} style={ui.card}>
            <Text style={ui.copy}>{String(s.title)}</Text>
            <Button
              label="End Bazunk session"
              disabled={task.busy}
              onPress={() =>
                Alert.alert(
                  "End this Bazunk session?",
                  "This removes the session from Bazunk's live list. Stop the video separately on YouTube or Twitch.",
                  [
                    { text: "Keep live", style: "cancel" },
                    {
                      text: "End session",
                      style: "destructive",
                      onPress: () =>
                        void task.run(async () => {
                          saved(
                            await request(
                              `/mobile/live/${encodeURIComponent(String(s.id))}/end`,
                              { method: "POST" },
                            ),
                          );
                          if (s.id === id.current) id.current = ref();
                          mine.reload();
                        }),
                    },
                  ],
                )
              }
            />
          </View>
        ))}
      <Feedback {...task} />
    </View>
  );
}
function Stream({ stream: s }: { stream: Record<string, unknown> }) {
  const chat = usePublicData(
    `/mobile/live/${encodeURIComponent(String(s.id))}/messages`,
    rows,
  );
  return (
    <>
      <Text style={ui.title}>{String(s.title)}</Text>
      <CaseLink label={`Watch on ${s.platform}`} url={String(s.streamUrl)} />
      <Text style={ui.link}>Featured products</Text>
      {Array.isArray(s.productIds) &&
        s.productIds
          .filter((n) => Number.isSafeInteger(n) && n > 0)
          .map((n) => (
            <Button
              key={n}
              label={`Open product ${n}`}
              onPress={() =>
                router.push({ pathname: "/listing", params: { id: String(n) } })
              }
            />
          ))}
      <Button
        label="Refresh chat"
        disabled={chat.loading}
        onPress={chat.reload}
      />
      <Text style={ui.link}>
        Live chat{chat.data ? ` · ${chat.data.length} recent messages` : ""}
      </Text>
      {!chat.loading && !chat.error && chat.data?.length === 0 && (
        <Text style={ui.copy}>
          No messages yet. Start the conversation below.
        </Text>
      )}
      {chat.loading ? (
        <ActivityIndicator />
      ) : chat.error ? (
        <Text style={ui.error}>{chat.error}</Text>
      ) : (
        chat.data?.map((m) => (
          <View key={String(m.id)} style={ui.card}>
            <Text style={ui.link}>{String(m.name)}</Text>
            <Text selectable style={ui.copy}>
              {String(m.text)}
            </Text>
            {typeof m.createdAt === "string" &&
              Number.isFinite(Date.parse(m.createdAt)) && (
                <Text style={ui.copy}>
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              )}
          </View>
        ))
      )}
      {!!chat.data?.length && (
        <Button
          label="Refresh latest messages"
          disabled={chat.loading}
          onPress={chat.reload}
        />
      )}
      <SellerAccess>
        <Chat id={String(s.id)} reload={chat.reload} />
      </SellerAccess>
    </>
  );
}
function Chat({ id, reload }: { id: string; reload: () => void }) {
  const request = useMemberRequest(),
    task = useTask(),
    [text, setText] = useState("");
  return (
    <View style={ui.card}>
      <TextInput
        style={ui.input}
        placeholder="Message to the live session"
        value={text}
        onChangeText={setText}
        maxLength={500}
        editable={!task.busy}
      />
      <Button
        label="Send to live chat"
        disabled={task.busy || !text.trim()}
        onPress={() =>
          void task.run(async () => {
            saved(
              await request(`/mobile/live/${encodeURIComponent(id)}/messages`, {
                method: "POST",
                body: { text },
              }),
            );
            setText("");
            reload();
          })
        }
      />
      <Text style={ui.copy}>
        If sending is interrupted, refresh chat before trying again.
      </Text>
      <Feedback {...task} />
    </View>
  );
}
