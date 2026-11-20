import {ActivityIndicator, ScrollView, Text, TextInput, View} from '../components/ThemedNative';
import { router } from "expo-router";
import { useState } from "react";
import {Alert} from 'react-native';
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { Feedback, useTask } from "../components/BusinessUI";
import { CaseLink } from "../components/CaseLink";
import { useMemberData, useMemberRequest } from "../hooks";
import { usePublicData } from "../publicData";
import { parseKeys, record, rows, saved } from "../business";
import { decimalValue, positiveQuantity, validEbayImage, supplierPrice, importCounts } from "../utils/importValidation";
export default function Importers() {
  return (
    <SellerAccess>
      <Import />
    </SellerAccess>
  );
}
function Import() {
  const request = useMemberRequest(),
    task = useTask(),
    connection = useMemberData("/user/rapidapi", parseKeys),
    categories = usePublicData("/mobile/listing-categories", rows);
  const [mode, setMode] = useState("own"),
    [key, setKey] = useState(""),
    [category, setCategory] = useState(""),
    [categorySearch, setCategorySearch] = useState(""),
    [condition, setCondition] = useState("used"),
    [image, setImage] = useState(""),
    [query, setQuery] = useState(""),
    [products, setProducts] = useState<Record<string, unknown>[]>([]),
    [page, setPage] = useState(1),
    [markup, setMarkup] = useState("35"),
    [itemId, setItem] = useState(""),
    [aliExpressId, setAliExpressId] = useState(""),
    [searched, setSearched] = useState(false),
    [title, setTitle] = useState(""),
    [price, setPrice] = useState(""),
    [quantity, setQuantity] = useState("1"),
    [description, setDescription] = useState("");
  const parsedPrice = decimalValue(price),
    parsedMarkup = decimalValue(markup),
    parsedQuantity = positiveQuantity(quantity);
  const connectionReady = !connection.loading && !connection.error && !!connection.data?.connected;
  const ownValid = !!category && !!itemId.trim() && !!title.trim() &&
    parsedPrice !== null && parsedPrice > 0 && parsedQuantity !== null &&
    validEbayImage(image);
  function changeSearch(value: string) {
    setQuery(value);
    setPage(1);
    setProducts([]);
    setSearched(false);
  }
  function changePage(value: number) {
    setPage(value);
    setProducts([]);
    setSearched(false);
  }
  function result(x: unknown) {
    const r = record(x);
    const counts = importCounts(r.imported, r.skipped);
    task.setNotice(
      `${counts.imported} imported; ${counts.skipped} skipped. Review the listing and stock before selling.`,
    );
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      <Text style={ui.title}>Import your inventory</Text>
      <Button label="Back to home" onPress={() => router.push("/")} disabled={task.busy} />
      <Text style={ui.copy}>
        Use content you have permission to list and products you can fulfil.
        Free eBay import is one-time, with no API or monthly limit. RapidAPI
        allowance and charges depend on your subscribed plan.
      </Text>
      {["own", "amazon", "ebay", "aliexpress"].map((m) => (
        <Button
          key={m}
          label={
            (mode === m ? "✓ " : "") +
            (m === "own" ? "Free eBay: your items" : m)
          }
          disabled={task.busy}
          onPress={() => {
            setMode(m);
            setProducts([]);
            setSearched(false);
            setPage(1);
          }}
        />
      ))}
      <Text style={ui.link}>Bazunk category</Text>
      {!!category && (
        <Text style={ui.copy}>
          Selected:{" "}
          {String(
            categories.data?.find((c) => c.slug === category)?.name ?? category,
          )}
        </Text>
      )}
      <TextInput
        style={ui.input}
        accessibilityLabel="Find a category"
        placeholder="Find a category"
        value={categorySearch}
        onChangeText={setCategorySearch}
        editable={!task.busy}
      />
      {categories.loading ? (
        <ActivityIndicator />
      ) : categories.error ? (
        <>
          <Text style={ui.error}>{categories.error}</Text>
          <Button label="Retry categories" onPress={categories.reload} />
        </>
      ) : (
        categories.data
          ?.filter((c) =>
            String(c.name)
              .toLowerCase()
              .includes(categorySearch.trim().toLowerCase()),
          )
          .map((c) => (
            <Button
              key={String(c.slug)}
              label={(category === c.slug ? "✓ " : "") + String(c.name)}
              disabled={task.busy}
              onPress={() => setCategory(String(c.slug))}
            />
          ))
      )}
      {!categories.loading &&
        !categories.error &&
        categories.data &&
        !categories.data.some((c) =>
          String(c.name)
            .toLowerCase()
            .includes(categorySearch.trim().toLowerCase()),
        ) && (
          <Text style={ui.copy}>No matching categories. Try another name.</Text>
        )}
      <Button
        label="My listings"
        onPress={() => router.push("/my-listings")}
        disabled={task.busy}
      />
      {mode === "own" ? (
        <>
          <TextInput
            style={ui.input}
            accessibilityLabel="Your eBay item number"
            placeholder="Your eBay item number"
            value={itemId}
            onChangeText={setItem}
            editable={!task.busy}
          />
          <TextInput
            style={ui.input}
            placeholder="Item title"
            value={title}
            onChangeText={setTitle}
            editable={!task.busy}
          />
          <TextInput
            style={ui.input}
            placeholder="Item price in GBP"
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
            editable={!task.busy}
          />
          <TextInput
            style={ui.input}
            placeholder="Quantity you own"
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
            editable={!task.busy}
          />
          <TextInput
            style={ui.input}
            placeholder="Description and condition details"
            multiline
            value={description}
            onChangeText={setDescription}
            editable={!task.busy}
          />
          <Text style={ui.link}>Item condition</Text>
          {[
            "new",
            "new-with-tags",
            "new-without-tags",
            "open-box",
            "refurbished",
            "like-new",
            "used",
            "for-parts",
          ].map((c) => (
            <Button
              key={c}
              label={(condition === c ? "✓ " : "") + c.replace(/-/g, " ")}
              disabled={task.busy}
              onPress={() => setCondition(c)}
            />
          ))}
          <TextInput
            style={ui.input}
            accessibilityLabel="Optional eBay photo URL"
            placeholder="Photo URL (https://i.ebayimg.com/...)"
            value={image}
            onChangeText={setImage}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!task.busy}
            maxLength={2000}
          />
          <Text style={ui.copy}>
            Optional: paste the HTTPS image address from your eBay listing. Only
            ebayimg.com photos are accepted. You can also add photos later in My
            listings.
          </Text>
          {!ownValid && (
            <Text style={ui.copy}>
              Choose a category and enter an item number, title, price above zero
              and a whole quantity of at least 1. Use up to two decimal places
              for the price. An optional photo must use HTTPS on ebayimg.com.
            </Text>
          )}
          <Button
            label="Import my eBay item"
            disabled={task.busy || !ownValid}
            onPress={() =>
              Alert.alert(
                "Your own stock?",
                "Confirm this is your listing and inventory, and that you may use its content. Your selected condition and optional eBay photo will be copied. Review the imported listing before selling.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Confirm and import",
                    onPress: () =>
                      void task.run(async () =>
                        result(
                          await request("/user/import-ebay-own", {
                            method: "POST",
                            body: {
                              ownsItems: true,
                              category,
                              products: [
                                {
                                  itemId: itemId.trim(),
                                  title: title.trim(),
                                  price: parsedPrice,
                                  quantity: parsedQuantity,
                                  currency: "GBP",
                                  condition,
                                  description,
                                  image: image.trim(),
                                },
                              ],
                            },
                          }),
                        ),
                      ),
                  },
                ],
              )
            }
          />
        </>
      ) : (
        <>
          <Text style={ui.link}>Your RapidAPI connection</Text>
          {connection.loading ? (
            <ActivityIndicator accessibilityLabel="Checking API connection" />
          ) : connection.error ? (
            <Text style={ui.error}>{connection.error}</Text>
          ) : (
            <Text style={ui.copy}>
              {connection.data?.connected
                ? String(connection.data.masked)
                : "No API key connected"}
            </Text>
          )}
          {!connection.loading && !connection.error && !connection.data?.bazunk && (
            <>
              <TextInput
                accessibilityLabel="RapidAPI key"
                style={ui.input}
                placeholder="X-RapidAPI-Key"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                value={key}
                onChangeText={setKey}
                editable={!task.busy}
              />
              <Button
                label="Save my API key"
                disabled={task.busy || key.trim().length < 20}
                onPress={() =>
                  void task.run(async () => {
                    saved(
                      await request("/user/rapidapi", {
                        method: "PUT",
                        body: { key: key.trim() },
                      }),
                    );
                    setKey("");
                    connection.reload();
                  })
                }
              />
              <Button
                label="Remove saved API key"
                disabled={task.busy || !connection.data?.connected}
                onPress={() =>
                  Alert.alert(
                    "Disconnect API key?",
                    "Search and synced imports using this key will stop working.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        onPress: () =>
                          void task.run(async () => {
                            saved(
                              await request("/user/rapidapi", {
                                method: "DELETE",
                              }),
                            );
                            setProducts([]);
                            setSearched(false);
                            connection.reload();
                          }),
                      },
                    ],
                  )
                }
              />
            </>
          )}
          <Text style={ui.copy}>
            Subscribe on RapidAPI to Real-Time Amazon Data, Real-Time eBay Data
            or AliExpress DataHub. Their own subscriptions determine allowances;
            adding a key alone does not subscribe you.
          </Text>
          <CaseLink
            url="https://rapidapi.com/hub"
            label="Open RapidAPI catalogue"
          />
          <TextInput
            style={ui.input}
            placeholder="Markup percentage"
            keyboardType="decimal-pad"
            value={markup}
            onChangeText={setMarkup}
            editable={!task.busy}
          />
          {parsedMarkup === null && (
            <Text style={ui.error}>Enter a markup of zero or more, with up to two decimal places.</Text>
          )}
          {mode === "aliexpress" ? (
            <>
              <TextInput
                style={ui.input}
                placeholder="AliExpress product ID"
                accessibilityLabel="AliExpress product ID"
                value={aliExpressId}
                onChangeText={setAliExpressId}
                editable={!task.busy}
              />
              <Text style={ui.copy}>
                Imports to drafts once, without automatic sync. Review price,
                rights, delivery and stock before publishing.
              </Text>
              <Button
                label="Import AliExpress draft"
                disabled={task.busy || !category || !connectionReady || !aliExpressId.trim() || parsedMarkup === null}
                onPress={() =>
                  void task.run(async () =>
                    result(
                      await request("/user/import-aliexpress", {
                        method: "POST",
                        body: {
                          productId: aliExpressId.trim(),
                          category,
                          markup: parsedMarkup,
                        },
                      }),
                    ),
                  )
                }
              />
            </>
          ) : (
            <>
              <TextInput
                style={ui.input}
                placeholder="Search UK products"
                value={query}
                onChangeText={changeSearch}
                editable={!task.busy}
              />
              <Button
                label={`Search page ${page}`}
                disabled={
                  task.busy || !query.trim() || !connectionReady
                }
                onPress={() =>
                  void task.run(async () => {
                    setProducts([]);
                    setSearched(false);
                    const r = record(
                      await request(
                        `/user/search-${mode}?q=${encodeURIComponent(query.trim())}&page=${page}&site=uk`,
                      ),
                    );
                    if (!Array.isArray(r.products)) throw Error("Search returned an invalid response. Please try again.");
                    setProducts(rows(r.products));
                    setSearched(true);
                  })
                }
              />
              {page > 1 && (
                <Button
                  label="Previous page"
                  disabled={task.busy}
                  onPress={() => changePage(page - 1)}
                />
              )}
              <Button
                label="Next search page"
                disabled={task.busy || !products.length}
                onPress={() => changePage(page + 1)}
              />
              {searched && !products.length && (
                <Text style={ui.copy} accessibilityLiveRegion="polite">No products found on page {page}. Try another search or return to the previous page.</Text>
              )}
              {products.map((p, i) => {
                const productPrice = supplierPrice(p.price_gbp ?? p.price);
                return (
                <View key={i} style={ui.card}>
                  <Text style={ui.link}>{String(p.title)}</Text>
                  <Text style={ui.copy}>
                    {productPrice === null ? "Supplier price unavailable. This product cannot be imported." : `Supplier price £${productPrice.toFixed(2)}.`}{" "}
                    Import markup: {markup}%; delivery allowance £3.99.
                  </Text>
                  <Button
                    label="Import this product"
                    disabled={task.busy || !category || parsedMarkup === null || !connectionReady || productPrice === null}
                    onPress={() =>
                      Alert.alert(
                        "Import product?",
                        "Confirm your right to use the content and fulfil this item. Review the imported listing before selling.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Import",
                            onPress: () =>
                              void task.run(async () =>
                                result(
                                  await request("/user/import-" + mode, {
                                    method: "POST",
                                    body: {
                                      products: [p],
                                      site: "uk",
                                      category,
                                      markup: parsedMarkup,
                                      shipping: 3.99,
                                    },
                                  }),
                                ),
                              ),
                          },
                        ],
                      )
                    }
                  />
                </View>
                );
              })}
            </>
          )}
        </>
      )}
      <Button
        label="Refresh API connection"
        disabled={task.busy}
        onPress={connection.reload}
      />
      <Feedback {...task} />
    </ScrollView>
  );
}
