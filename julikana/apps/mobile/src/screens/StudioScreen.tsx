import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { generateVideo, hasToken, videoSource, videoStatus, VideoStatus } from "../api";
import { Theme } from "../theme";

type Ratio = "9:16" | "16:9" | "1:1";
const RATIOS: Ratio[] = ["9:16", "16:9", "1:1"];
const IDEAS = [
  "A cinematic 8s ad for fresh Nairobi street coffee, steam rising, golden light",
  "UGC-style clip: a happy customer unboxing new sneakers, handheld, upbeat",
  "Product reel: a smartphone spinning on a marble table, studio lighting",
];

export function StudioScreen({ theme }: { theme: Theme }) {
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<Ratio>("9:16");
  const [status, setStatus] = useState<VideoStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const polling = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => stopPolling(), []);

  function stopPolling() {
    if (polling.current) clearTimeout(polling.current);
    polling.current = null;
  }

  async function start() {
    if (!prompt.trim() || busy) return;
    if (!hasToken()) {
      setError("Sign in first — video generation runs on your live workspace, not in demo mode.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    stopPolling();
    try {
      const { contentItemId } = await generateVideo({ prompt: prompt.trim(), aspectRatio: ratio });
      setStatus({
        contentItemId,
        status: "GENERATING",
        title: prompt.trim(),
        caption: null,
        playbackUrl: null,
        error: null,
      });
      poll(contentItemId);
    } catch {
      setError("Couldn't start generation. The server may be waking up (try again in ~30s), or no video provider key is set.");
      setBusy(false);
    }
  }

  function poll(id: string) {
    polling.current = setTimeout(async () => {
      try {
        const s = await videoStatus(id);
        setStatus(s);
        if (s.status === "GENERATING") {
          poll(id);
        } else {
          setBusy(false);
          stopPolling();
        }
      } catch {
        poll(id); // transient error — keep trying
      }
    }, 6000);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View>
        <Text style={{ color: theme.ink, fontSize: 15, fontWeight: "700" }}>Video Studio</Text>
        <Text style={{ color: theme.ink2, fontSize: 12, marginTop: 3, lineHeight: 17 }}>
          Describe a clip and Domo renders it with your AI video provider (Veo on your Gemini key by
          default). Generation takes ~1–3 minutes.
        </Text>
      </View>

      <TextInput
        value={prompt}
        onChangeText={setPrompt}
        placeholder="Describe the video you want…"
        placeholderTextColor={theme.muted}
        multiline
        style={{
          color: theme.ink,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.hairline,
          borderRadius: 12,
          padding: 12,
          fontSize: 14,
          minHeight: 90,
          textAlignVertical: "top",
        }}
      />

      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {IDEAS.map((idea) => (
          <Pressable
            key={idea}
            onPress={() => setPrompt(idea)}
            style={{
              borderWidth: 1,
              borderColor: theme.hairline,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color: theme.ink2, fontSize: 11 }}>{idea.slice(0, 28)}…</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {RATIOS.map((r) => {
          const active = r === ratio;
          return (
            <Pressable
              key={r}
              onPress={() => setRatio(r)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: active ? theme.brand : theme.hairline,
                backgroundColor: active ? theme.brand : "transparent",
              }}
            >
              <Text
                style={{ color: active ? "#fff" : theme.ink2, fontSize: 12, fontWeight: active ? "700" : "400" }}
              >
                {r}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={start}
        disabled={busy}
        style={{
          backgroundColor: theme.brand,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
          {busy ? "Generating…" : "Generate video"}
        </Text>
      </Pressable>

      {error && <Text style={{ color: theme.critical, fontSize: 12 }}>{error}</Text>}

      {status && <StatusCard theme={theme} status={status} />}
    </ScrollView>
  );
}

function StatusCard({ theme, status }: { theme: Theme; status: VideoStatus }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.hairline,
        borderRadius: 14,
        padding: 14,
        backgroundColor: theme.surface,
        gap: 8,
      }}
    >
      {status.status === "GENERATING" && (
        <Text style={{ color: theme.ink2, fontSize: 13 }}>
          ⏳ Rendering your clip… this usually takes 1–3 minutes. You can keep using the app.
        </Text>
      )}
      {status.status === "FAILED" && (
        <Text style={{ color: theme.critical, fontSize: 13 }}>
          ✕ {status.error ?? "Generation failed."}
        </Text>
      )}
      {status.status === "READY" && status.playbackUrl && (
        <>
          <Text style={{ color: theme.ink, fontSize: 13, fontWeight: "700" }}>✅ Your video is ready</Text>
          <VideoPreview theme={theme} playbackUrl={status.playbackUrl} />
          {status.caption ? (
            <Text style={{ color: theme.ink2, fontSize: 12, marginTop: 4 }}>{status.caption}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

/** Rendered only once a video exists, so the expo-video hook stays stable. */
function VideoPreview({ theme, playbackUrl }: { theme: Theme; playbackUrl: string }) {
  const player = useVideoPlayer(videoSource(playbackUrl), (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width: "100%", aspectRatio: 9 / 16, borderRadius: 10, backgroundColor: theme.plane }}
      contentFit="contain"
      allowsFullscreen
    />
  );
}
