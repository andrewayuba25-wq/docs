import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { api } from '../../../src/lib/api';
import { connectSocket } from '../../../src/lib/socket';
import { useAuth } from '../../../src/lib/store';
import { useTheme } from '../../../src/theme/tokens';

type Msg = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
};

export default function Chat() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuth((s) => s.user);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    api<{ messages: Msg[] }>(`/v1/threads/${id}/messages`)
      .then(({ messages }) => setMessages(messages.slice().reverse()))
      .catch(() => {});

    let off: (() => void) | null = null;
    (async () => {
      const s = await connectSocket();
      const handler = (payload: { bookingId: string; message: Msg }) => {
        if (payload.bookingId === id) {
          setMessages((prev) => [...prev, payload.message]);
        }
      };
      s.on('chat:new', handler);
      off = () => s.off('chat:new', handler);
    })();
    return () => {
      off?.();
    };
  }, [id]);

  async function send() {
    if (!draft.trim()) return;
    const body = draft.trim();
    setDraft('');
    const msg = await api<Msg>(`/v1/threads/${id}/messages`, {
      method: 'POST',
      body: { body, kind: 'TEXT' },
    });
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 12, gap: 6 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.senderId === me?.id;
            return (
              <View
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  backgroundColor: mine ? t.primary : t.surfaceAlt,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: mine ? '#fff' : t.text }}>{item.body}</Text>
              </View>
            );
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 10,
            borderTopWidth: 1,
            borderTopColor: t.border,
            gap: 8,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message…"
            placeholderTextColor={t.textMuted}
            style={{
              flex: 1,
              borderRadius: t.radii.pill,
              backgroundColor: t.surface,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: t.text,
              borderWidth: 1,
              borderColor: t.border,
            }}
          />
          <Pressable
            onPress={send}
            style={{
              width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
              backgroundColor: t.primary,
            }}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
