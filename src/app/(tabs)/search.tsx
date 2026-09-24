import { useMemo, useRef } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { BackIcon, ChevronRight, SearchIcon } from '@/components/icons';
import { ProductCard, QtyStepper } from '@/components/product-card';
import { Photo, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { money, photo, searchProducts, type Product } from '@/data/catalog';
import { goBack, goTab, openCategory, openProduct } from '@/lib/nav';
import { useApp } from '@/store/app-store';
import { useCatalogVersion, useCategories, useProducts } from '@/lib/remote-catalog';
import { logSearch, useTrending } from '@/lib/search-trending';


const card = [{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden' as const }, cardShadow];

/** Section label (`font:600 10.5px/1;letter-spacing:.6px;color:#8C8C86`). */
function Label({ children }: { children: string }) {
  return (
    <Txt numberOfLines={1} style={[f(600, 10.5, 1), { letterSpacing: 0.6, color: C.muted2 }]}>
      {children}
    </Txt>
  );
}

/** A search result row (58px thumb, name, weight · brand, price, ADD / stepper). */
function ResultRow({ p, onOpen }: { p: Product; onOpen: () => void }) {
  const qty = useApp((s) => s.cart[p.id] ?? 0);
  const bump = useApp((s) => s.bump);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, padding: 8 }, cardShadow]}>
      <Tap onPress={onOpen} pressedStyle={{ opacity: 0.85 }} style={{ flexShrink: 0 }}>
        <Photo source={p.img} style={{ width: 58, height: 58, borderRadius: 7 }} />
      </Tap>
      <Tap onPress={onOpen} pressedStyle={{ opacity: 0.85 }} style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <Txt style={f(600, 12.5, 1.3)}>{p.name}</Txt>
        <Txt style={[f(400, 11, 1.2), { color: C.muted }]}>
          {p.weight} · {p.brand}
        </Txt>
        <Txt style={[f(700, 13, 1.2), { marginTop: 2 }]}>{money(p.price)}</Txt>
      </Tap>
      {qty > 0 ? (
        <View style={{ flexShrink: 0 }}>
          <QtyStepper id={p.id} qty={qty} height={30} width={26} />
        </View>
      ) : (
        <Tap
          onPress={() => bump(p.id, 1)}
          pressedStyle={{ backgroundColor: C.limeHover }}
          style={{ flexShrink: 0, height: 30, paddingHorizontal: 14, borderWidth: 1, borderColor: C.limeBorder, backgroundColor: C.lime, borderRadius: 6, justifyContent: 'center' }}>
          <Txt style={[f(700, 11, 1), { color: C.forest }]}>ADD</Txt>
        </Tap>
      )}
    </View>
  );
}

/** Search tab (prototype `sSearch`): idle suggestions, results and no-results states. */
export default function SearchScreen() {
  const pad = usePad();
  const q = useApp((s) => s.q);
  const recentTerms = useApp((s) => s.recentTerms);
  const set = useApp((s) => s.set);

  const term = q.trim();
  const products = useProducts();
  const categories = useCategories();
  const catalogVersion = useCatalogVersion((s) => s.version);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion changes when admin products load
  const results = useMemo(() => searchProducts(q), [q, catalogVersion]);
  const viewedIds = useApp((s) => s.viewedIds);
  const trending = useTrending();

  // Recently viewed products that still exist; new arrivals until the user has viewed any.
  const viewed = viewedIds.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);
  const browsing = viewed.length > 0 ? viewed.slice(0, 6) : products.slice(0, 6);

  // A search counts once it's submitted or a result is opened (not on every keystroke).
  const lastLogged = useRef('');
  const commitSearch = () => {
    const t = q.trim();
    if (t.length < 2 || t.toLowerCase() === lastLogged.current) return;
    lastLogged.current = t.toLowerCase();
    useApp.getState().addRecentTerm(t);
    logSearch(t);
  };
  const idle = term.length === 0;
  const hasResults = !idle && results.length > 0;
  const noResults = !idle && results.length === 0;

  return (
    <Screen>
      {/* Header */}
      <View
        style={{
          flexShrink: 0,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: C.divider,
          paddingTop: pad.top(52),
          paddingHorizontal: 14,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
        }}>
        <Tap
          accessibilityLabel="Back"
          onPress={goBack}
          hitSlop={8}
          style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BackIcon />
        </Tap>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: 38,
            paddingHorizontal: 11,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 8,
            backgroundColor: C.field,
          }}>
          <SearchIcon size={15} />
          <TextInput
            value={q}
            onChangeText={(t) => set({ q: t })}
            placeholder="Search for groceries, milk, vegetables..."
            placeholderTextColor={C.muted2}
            allowFontScaling={false}
            returnKeyType="search"
            onSubmitEditing={commitSearch}
            autoCorrect={false}
            style={[f(500, 12.5, 1.2), { flex: 1, minWidth: 0, padding: 0, color: C.ink }]}
          />
          {q.length > 0 && (
            <Tap
              accessibilityLabel="Clear"
              onPress={() => set({ q: '' })}
              hitSlop={8}
              style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#E8E8E4', alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={[f(600, 11, 1), { color: '#5F5F5A' }]}>×</Txt>
            </Tap>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 170 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        {idle && (
          <Animated.View key="idle" entering={FadeIn.duration(180)} style={{ gap: 20 }}>
            {/* Recent searches (this device) */}
            {recentTerms.length > 0 && (
            <View style={{ gap: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Label>RECENT SEARCHES</Label>
                <Tap onPress={() => useApp.getState().clearRecentTerms()} hitSlop={6}>
                  <Txt numberOfLines={1} style={[f(600, 11, 1), { color: C.green }]}>
                    Clear all
                  </Txt>
                </Tap>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {recentTerms.map((t) => (
                  <Tap
                    key={t}
                    onPress={() => set({ q: t })}
                    pressedStyle={{ borderColor: C.lime }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                      height: 32,
                      paddingHorizontal: 11,
                      borderWidth: 1,
                      borderColor: C.border,
                      backgroundColor: '#fff',
                      borderRadius: 9,
                      boxShadow: '0 1px 2px rgba(16,24,16,0.04)',
                    }}>
                    <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
                      <Circle cx={8} cy={8} r={5.6} stroke={C.muted3} strokeWidth={1.4} />
                      <Path d="M8 5.4V8l1.9 1.2" stroke={C.muted3} strokeWidth={1.4} strokeLinecap="round" />
                    </Svg>
                    <Txt numberOfLines={1} style={f(500, 12, 1)}>
                      {t}
                    </Txt>
                  </Tap>
                ))}
              </View>
            </View>
            )}

            {/* Trending (live, from Supabase) */}
            {trending.terms.length > 0 && (
            <View style={{ gap: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Label>TRENDING IN MELBOURNE</Label>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Svg width={11} height={11} viewBox="0 0 14 14" fill="none">
                    <Path d="M2 10l3.4-3.6 2.4 2.2L12 4.4" stroke={C.green} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M9.2 4.4H12v2.8" stroke={C.green} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Txt numberOfLines={1} style={[f(600, 10, 1), { color: C.green }]}>
                    Live
                  </Txt>
                </View>
              </View>
              <View style={card}>
                {trending.terms.map((t, i) => (
                  <Tap
                    key={t.term}
                    onPress={() => set({ q: t.term })}
                    pressedStyle={{ backgroundColor: '#FAFBF7' }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 11,
                      borderBottomWidth: 1,
                      borderBottomColor: C.dividerSoft,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                    }}>
                    <Txt style={[f(700, 11, 1), { color: '#B0B0AA', width: 14, flexShrink: 0 }]}>{i + 1}</Txt>
                    <Photo source={t.image_url ?? photo('basket')} crop={false} style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0 }} />
                    <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
                      <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>
                        {t.term}
                      </Txt>
                      <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: C.muted2 }]}>
                        {t.searches} {t.searches === 1 ? 'search' : 'searches'} this week · {t.product_count} {t.product_count === 1 ? 'product' : 'products'}
                      </Txt>
                    </View>
                    <View style={{ backgroundColor: C.selectedBgAlt, paddingVertical: 5, paddingHorizontal: 7, borderRadius: 5 }}>
                      <Txt numberOfLines={1} style={[f(600, 10, 1), { color: C.green }]}>
                        {t.change_pct == null ? 'New' : (t.change_pct >= 0 ? '+' : '') + t.change_pct + '%'}
                      </Txt>
                    </View>
                  </Tap>
                ))}
              </View>
            </View>
            )}

            {/* Continue browsing: recently viewed, else new arrivals */}
            {browsing.length > 0 && (
            <View style={{ gap: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Label>CONTINUE BROWSING</Label>
                <Txt numberOfLines={1} style={[f(400, 10.5, 1), { color: C.muted3 }]}>
                  {viewed.length > 0 ? 'Recently viewed' : 'New in store'}
                </Txt>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingBottom: 2 }}>
                {browsing.map((p) => (
                  <ProductCard key={p.id} p={p} style={{ flexShrink: 0, width: 128 }} />
                ))}
              </ScrollView>
            </View>
            )}

            {/* Browse aisles */}
            <View style={{ gap: 9 }}>
              <Label>BROWSE AISLES</Label>
              <View style={card}>
                {categories.map((c) => (
                  <Tap
                    key={c.id}
                    onPress={() => openCategory(c.id)}
                    pressedStyle={{ backgroundColor: '#FAFBF7' }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: C.dividerSoft,
                      paddingVertical: 9,
                      paddingHorizontal: 11,
                    }}>
                    <Photo source={c.img} crop={false} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: c.bg, flexShrink: 0 }} />
                    <Txt numberOfLines={1} style={[f(500, 12.5, 1.2), { flex: 1 }]}>
                      {c.name}
                    </Txt>
                    <Txt numberOfLines={1} style={[f(400, 10.5, 1), { color: C.muted2 }]}>
                      {products.filter((p) => p.cat === c.id).length} products
                    </Txt>
                    <ChevronRight />
                  </Tap>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {hasResults && (
          <Animated.View key="results" entering={FadeIn.duration(160)} style={{ gap: 8 }}>
            <Txt style={[f(400, 11.5, 1), { color: C.muted }]}>
              {results.length} results for &quot;{q}&quot;
            </Txt>
            {results.slice(0, 14).map((p) => (
              <ResultRow
                key={p.id}
                p={p}
                onOpen={() => {
                  commitSearch();
                  openProduct(p.id);
                }}
              />
            ))}
          </Animated.View>
        )}

        {noResults && (
          <Animated.View key="none" entering={FadeIn.duration(160)} style={{ alignItems: 'center', gap: 8, paddingVertical: 56, paddingHorizontal: 20 }}>
            <Txt style={[f(700, 15.5, 1.3), { textAlign: 'center' }]}>We couldn&apos;t find that</Txt>
            <Txt style={[f(400, 12.5, 1.5), { color: C.muted, maxWidth: 220, textAlign: 'center' }]}>Try searching for something else.</Txt>
            <Tap
              onPress={() => goTab('categories')}
              pressedStyle={{ backgroundColor: C.forestHover }}
              style={{ marginTop: 6, height: 38, paddingHorizontal: 18, borderRadius: 8, backgroundColor: C.forest, justifyContent: 'center' }}>
              <Txt style={[f(600, 12.5, 1), { color: '#fff' }]}>Browse categories</Txt>
            </Tap>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}
