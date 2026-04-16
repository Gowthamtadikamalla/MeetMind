# MeetMind -- Live AI Meeting Copilot

MeetMind is a real-time AI meeting copilot that listens to your microphone, transcribes speech in chunks, generates context-aware suggestions, and provides a session-only chat for detailed answers and direct questions.

## Assignment Goal

Build a 3-column web application that:

1. **Left column** -- Captures live microphone audio, transcribes it in chunks, and displays a running transcript.
2. **Middle column** -- Generates exactly 3 fresh, useful suggestions after each new transcript chunk and on manual refresh.
3. **Right column** -- Clicking a suggestion opens a detailed answer in chat. Users can also ask direct questions grounded in the transcript.

The entire session is ephemeral (no persistence). Users can export the full session as JSON for evaluation.

## Implemented Feature Set

- Live microphone capture via browser MediaRecorder (~30s chunks)
- Real-time speech-to-text via Groq Whisper Large V3
- Automatic suggestion generation after each transcript chunk
- Manual refresh with partial-chunk flush
- Exactly 3 suggestions per batch with enforced Zod schema validation
- Five suggestion types: answer, question_to_ask, talking_point, fact_check, clarification
- Clicked suggestion expands into a detailed, transcript-grounded answer
- Direct chat questions grounded in transcript and rolling summary
- Streaming chat responses via Server-Sent Events (SSE)
- Rolling session summary updated with each suggestion batch
- Deduplication guards (chunk index, count, basis signature)
- Full session export as evaluator-friendly JSON
- New Session reset with full cleanup
- Retry for failed transcription, suggestions, and chat
- Editable prompts and context window settings
- User-provided API key via Settings (primary flow)
- Markdown rendering for assistant messages (safe, no raw HTML)

## Architecture

```
Browser (Client)                     Next.js Route Handlers (Server)
+------------------+                 +-------------------------+
| MediaRecorder    | --audio blob--> | POST /api/transcribe    |
| (30s chunks)     |                 |   Groq Whisper Large V3 |
+------------------+                 +-------------------------+
        |                                       |
        v                                       v
+------------------+                 +-------------------------+
| Zustand Store    | <--transcript-- | returns { text }        |
| (session state)  |                 +-------------------------+
+------------------+
        |
        v (auto-trigger)
+------------------+                 +-------------------------+
| generateSuggestions() -----------> | POST /api/suggestions   |
|                  |                 |   Groq GPT-OSS 120B     |
|                  | <--3 suggestions + updatedSummary          |
+------------------+                 +-------------------------+
        |
        v (user clicks or types)
+------------------+                 +-------------------------+
| streamChatResponse() -----------> | POST /api/chat (SSE)    |
|                  |                 |   Groq GPT-OSS 120B     |
|                  | <--streaming tokens                       |
+------------------+                 +-------------------------+
```

All state lives in a Zustand store (session-only, no persistence). Audio blobs are stored in an external Map to avoid serialization issues.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 with @tailwindcss/typography |
| State | Zustand |
| Validation | Zod |
| AI Provider | Groq |
| STT Model | whisper-large-v3 |
| LLM Model | openai/gpt-oss-120b (GPT-OSS 120B) |
| Markdown | react-markdown (safe rendering, no raw HTML) |
| Deployment | Vercel |

## Model Choices

| Operation | Model | Rationale |
|-----------|-------|-----------|
| Transcription | `whisper-large-v3` | Assignment requirement. Best-in-class open-source STT via Groq. |
| Suggestions | `openai/gpt-oss-120b` | Assignment requirement. GPT-OSS 120B via Groq for high-quality structured output. |
| Chat / Detailed Answers | `openai/gpt-oss-120b` | Same model ensures consistent quality across suggestion expansion and direct Q&A. |

Model slugs are centralized in `lib/models.ts`.

## How the 3-Column Flow Works

1. **Start Recording** -- The user clicks "Start Recording" in the left column. The browser requests microphone access and begins capturing audio.
2. **Audio Chunking** -- MediaRecorder fires `ondataavailable` every ~30 seconds. Each chunk is stored as a blob and queued for transcription.
3. **Transcription** -- Chunks are processed sequentially via `POST /api/transcribe`. Each successful transcription creates a `TranscriptChunk` appended to the transcript.
4. **Auto Suggestions** -- When a new transcript chunk is added, `useAutoRefresh` automatically triggers suggestion generation if dedup guards pass.
5. **Manual Refresh** -- The user can click "Refresh" in the middle column. If recording, this first flushes the current partial audio chunk via `requestData()`, then generates suggestions.
6. **Suggestion Click** -- Clicking a suggestion card adds a user message to chat (with structured metadata) and triggers `generateResponse`, which calls `POST /api/chat` with SSE streaming.
7. **Direct Question** -- Typing in the chat input and pressing Send adds a user message and triggers the same streaming chat generation.
8. **Export** -- The Export button downloads a complete JSON file with transcript, suggestions, chat, summary, metadata, and sanitized settings.
9. **New Session** -- Stops recording, aborts active chat stream, clears audio blobs, and resets all state. Settings (including API key) are preserved within the same page session.

## Prompt Strategy

All prompts are centralized in `lib/prompts.ts` and editable via the Settings screen.

**Suggestion Prompt** (`DEFAULT_SUGGESTION_PROMPT`):
- Frames the model as a real-time meeting copilot
- Requires exactly 3 suggestions in valid JSON
- Emphasizes grounding in the recent transcript
- Enforces specificity over generic advice
- Instructs deduplication against recent prior batches
- Allows contextual type mixing (not fixed rotation)

**Detailed Answer Prompt** (`DEFAULT_DETAILED_ANSWER_PROMPT`):
- Expands the clicked suggestion with transcript grounding
- Prioritizes quick-scanning structure (bullets, short paragraphs)
- Admits gaps honestly when transcript context is insufficient

**Chat Prompt** (`DEFAULT_CHAT_PROMPT`):
- Direct, concise answers grounded in transcript
- Transparent about context limitations

**Summary Prompt** (`DEFAULT_SUMMARY_PROMPT`):
- Maintains rolling session memory under 300 words
- Captures topics, questions, decisions, action items, risks, entities

## Rolling Summary Strategy

Instead of a separate LLM call per chunk, the rolling summary is updated inline within the `/api/suggestions` response. The model returns both 3 suggestions and an `updatedSummary` in a single JSON object. This reduces round trips and latency.

The summary is used as context for both suggestions and chat, giving the model broader meeting awareness without sending the full transcript.

## Duplicate-Prevention Strategy

Three guards prevent auto-generating redundant suggestion batches:

1. **lastSuggestedChunkIndex** -- The newest transcript chunk index must have advanced since the last generation.
2. **lastSuggestedTranscriptCount** -- The count of meaningful (non-empty) chunks must have increased.
3. **lastSuggestedBasisSignature** -- A hash of recent chunk IDs must differ from the previous basis.

All three guards apply to auto-refresh. Manual refresh bypasses them.

## Retry Semantics

| Failure | Retry Behavior |
|---------|---------------|
| Transcription | Resets failed audio chunks to "recorded" status, re-entering the transcription pipeline. Blob is preserved until successful transcription. |
| Suggestions | Retry triggers a fresh manual regeneration from the current transcript state (not a replay of the exact failed request). The transcript may have advanced since the failure. |
| Chat | Removes the failed assistant message and re-generates from the original user message using current transcript context. |

## Local Setup

### Prerequisites

- Node.js 18+ and npm
- A Groq API key (get one at [console.groq.com](https://console.groq.com))

### Install and Run

```bash
git clone <repo-url> meetmind
cd meetmind
npm install
```

Create a `.env.local` file for local development convenience:

```bash
cp .env.example .env.local
# Edit .env.local and replace the placeholder with your real Groq API key
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser that supports MediaRecorder (Chrome, Edge, Firefox).

### API Key Flow

The assignment requires users to paste their Groq API key in the Settings screen. This is the primary and required flow.

**Priority order:**
1. Key from the Settings screen (entered by the user at runtime)
2. `GROQ_API_KEY` from `.env.local` (local development fallback only)

The env fallback exists solely for local development convenience. It never replaces the settings-key flow. The API key is never persisted to localStorage, never exported, and never hard-coded.

## Deployment (Vercel)

### Quick Deploy

```bash
npm run build   # Verify production build passes
vercel deploy   # Deploy to Vercel
```

### Environment Variables

In the Vercel dashboard, optionally set:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GROQ_API_KEY` | No | Optional fallback for testing. The primary flow is the user pasting their key in Settings. |

### SSE / Streaming Considerations

The chat endpoint (`/api/chat`) streams responses via Server-Sent Events. Vercel's Edge and Serverless runtimes both support streaming responses. The route uses `runtime = "nodejs"` (serverless), which handles SSE correctly on Vercel.

If deploying behind a reverse proxy or CDN, ensure:
- The proxy does not buffer SSE responses (disable response buffering)
- Connection timeouts allow for the full stream duration (~10-30 seconds)

### New Session Behavior

When the user clicks "New Session":
- Recording stops
- Active chat stream is aborted
- Audio blobs are cleared from memory
- All session state resets (transcript, suggestions, chat, summary, dedup guards)
- **Settings are preserved** (including the in-memory API key) within the same page session
- The API key is never persisted or exported

## Prompt Tuning Guide

All prompts live in `lib/prompts.ts` and are editable at runtime via the Settings screen.

### Tuning Suggestion Quality

The suggestion prompt is the highest-impact lever. Key areas to tune:

- **Type distribution instructions**: Adjust how the model chooses between answer, question_to_ask, talking_point, fact_check, and clarification.
- **Specificity emphasis**: Strengthen or relax the "never generic" constraint.
- **Dedup instructions**: The prompt includes "do not repeat or near-duplicate recent prior batches." You can make this more or less strict.
- **Context window** (`suggestionContextChunks`): Default 3. Increasing gives richer context but uses more tokens and increases latency.

### Tuning Chat / Detailed Answer Quality

- **detailedAnswerPrompt**: Controls suggestion expansion. Adjust structure preferences (bullets vs. paragraphs) and grounding strictness.
- **chatPrompt**: Controls direct questions. Adjust conciseness vs. thoroughness.
- **Context window** (`detailedAnswerContextChunks`): Default 8. Larger window gives better grounding for complex questions.

### Tuning Summary Quality

- **summaryPrompt**: Controls what the rolling summary captures. Adjust the list of tracked elements (topics, decisions, action items, etc.) and the word limit.

## QA Checklist

### Test Scenarios

| Scenario | What to Test | Expected Behavior |
|----------|-------------|-------------------|
| Brainstorming / product discussion | Start recording, discuss product ideas for 2-3 minutes | Suggestions should surface relevant questions, talking points, and clarifications. Types should vary naturally. |
| Technical debugging meeting | Discuss a specific bug or system issue | Suggestions should include fact_check and answer types. Detailed answers should reference specific technical details from transcript. |
| Planning / action-items conversation | Discuss timelines, assignments, next steps | Summary should capture action items. Suggestions should surface questions about ownership and deadlines. |
| Direct question flow | Stop recording, ask a question about the transcript | Chat should provide a grounded answer referencing transcript content. |
| Suggestion click expansion | Click a suggestion card | Chat should show the user message (with "from suggestion" label) and a detailed, structured assistant response. |
| Export session | Click Export after a session | Downloaded JSON should contain transcript, suggestions, chat, summary, metadata, and sanitized settings (no API key). |
| New session | Click New Session | All state should reset. Settings should be preserved. Recording should stop. |
| Manual refresh while recording | Click Refresh in the middle column while recording | Should flush partial audio chunk, transcribe it, then generate suggestions from fresh transcript. |

### Edge Cases

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Long session (15+ minutes) | Rolling summary keeps context compact. Suggestion quality should remain high. Token usage stays bounded. |
| Network interruption during chat | Stream should fail gracefully. Assistant message marked as error. Retry button appears. |
| Failed transcription | Error shown in transcript panel. Retry button appears. Audio blob preserved for retry. |
| Empty transcript chunk | Silently skipped. No suggestion generation triggered. |
| Missing API key | Warning banner shown. Transcription and suggestions fail with clear error message. |
| Aborted chat stream | User clicks "Stop" during generation. Partial message preserved, streaming indicator removed. |

## Demo Flow

For a live interview or demo, follow this sequence:

1. **Open the app** at your deployed URL or localhost:3000
2. **Paste your Groq API key** in Settings (click Settings in the header, paste key, close)
3. **Start Recording** -- Click the button in the left column
4. **Speak for 30-60 seconds** about a topic (e.g., product planning, technical architecture)
5. **Wait for transcript** to appear in the left column (first chunk at ~30 seconds)
6. **Watch suggestions appear** automatically in the middle column
7. **Click a suggestion** to see the detailed answer expand in the chat (right column)
8. **Ask a direct question** in the chat input about something in the transcript
9. **Click Refresh** in the middle column to trigger manual suggestion generation
10. **Click Export** to download the session JSON
11. **Click New Session** to reset and start fresh

### Troubleshooting

| Issue | Solution |
|-------|---------|
| Microphone permission denied | Click the lock/site-settings icon in your browser's address bar and allow microphone access. Reload the page. |
| "No Groq API key set" warning | Open Settings and paste your Groq API key. |
| No transcript appearing | Check that your microphone is working (try another app). Ensure the API key is valid. Check the error banner for specific messages. |
| Suggestions not generating | Ensure at least one non-empty transcript chunk exists. Check the error banner. Try manual Refresh. |
| Chat not responding | Ensure the API key is valid. Check for error messages below the chat. Try the Retry button. |

## Limitations

- **Session-only state**: All data is lost on page refresh. This is by design for the assignment.
- **Single language**: Transcription is hardcoded to English (`language: "en"`).
- **Browser support**: Requires MediaRecorder API (Chrome, Edge, Firefox). Safari has limited MediaRecorder support.
- **Audio quality**: Depends on the user's microphone and environment. Noisy environments may reduce transcription accuracy.
- **Rate limits**: Groq API rate limits may affect performance during rapid-fire suggestion generation.
- **Token limits**: Very long meetings may approach model token limits for context windows, though the rolling summary strategy mitigates this.

## Tradeoffs

| Decision | Tradeoff |
|----------|----------|
| Rolling summary inline with suggestions | Reduces latency (one LLM call instead of two) but couples summary updates to suggestion generation cadence. |
| Sequential transcription processing | Ensures transcript ordering but means chunks queue if one takes long. |
| Zustand (no persistence) | Simple and correct for session-only requirement, but no recovery from accidental page refresh. |
| SSE for chat streaming | Works well with Vercel serverless but requires careful proxy configuration in some environments. |
| 30-second audio chunks | Balances latency (user waits ~30s for first transcript) with transcription quality (longer chunks give better context to Whisper). |
| Settings preserved across New Session | Convenient for the user (no re-entering API key) but means the key stays in memory until the tab is closed. |

## Future Improvements

- Speaker diarization (identify who is speaking)
- Multi-language transcription support
- Persistent sessions with optional local storage or database
- Collaborative mode (multiple participants see the same copilot)
- Custom model selection (allow switching between available Groq models)
- Audio playback for transcript chunks
- Keyboard shortcuts for common actions
- Mobile-optimized layout
- Suggestion quality feedback (thumbs up/down) for prompt tuning iteration

## Project Structure

```
meetmind/
  app/
    api/
      transcribe/route.ts   -- Whisper transcription endpoint
      suggestions/route.ts  -- Suggestion generation endpoint
      chat/route.ts         -- Streaming chat endpoint
    globals.css             -- Tailwind imports and theme
    layout.tsx              -- Root layout with fonts and metadata
    page.tsx                -- Main 3-column page with context providers
  components/
    Header.tsx              -- App header with New Session, Export, Settings
    MicPanel.tsx            -- Microphone controls and recording timer
    TranscriptPanel.tsx     -- Scrolling transcript display with retry
    SuggestionsPanel.tsx    -- Suggestion batches with manual refresh
    SuggestionCard.tsx      -- Individual suggestion card component
    ChatPanel.tsx           -- Chat messages, input, streaming, retry
    MarkdownContent.tsx     -- Safe markdown renderer for assistant messages
    SettingsDrawer.tsx      -- Settings panel with validation
    ExportButton.tsx        -- Session export trigger
    ApiKeyWarning.tsx       -- Missing API key banner
    ErrorBanner.tsx         -- Granular error display
    DevToolbar.tsx          -- Dev-only seed/reset toolbar (hidden in production)
  hooks/
    useSessionStore.ts      -- Zustand store with all session state and actions
    useMicRecorder.ts       -- MediaRecorder hook with blob management
    useMicRecorderContext.tsx -- Context for sharing mic controls
    useTranscriptionPipeline.ts -- Sequential audio-to-transcript processing
    useAutoRefresh.ts       -- Auto-trigger suggestions on new transcript
    useChatGeneration.ts    -- Streaming chat generation with retry
    useChatGenerationContext.tsx -- Context for sharing chat controls
    useHasMounted.ts        -- Hydration safety hook
  lib/
    models.ts               -- Centralized model slug constants
    prompts.ts              -- Default system prompts and settings
    groq.ts                 -- Groq client factory
    resolveApiKey.ts        -- API key priority resolution
    validateSettings.ts     -- Settings normalization at request boundary
    schemas.ts              -- Zod schemas for API responses
    suggestionPromptBuilder.ts -- Builds suggestion LLM messages
    chatPromptBuilder.ts    -- Builds chat LLM messages
    generateSuggestions.ts  -- Client-side suggestion generation orchestrator
    streamChatResponse.ts   -- Client-side SSE stream reader
    transcriptWindow.ts     -- Transcript chunk windowing utilities
    suggestionDedupe.ts     -- Suggestion history formatting for prompts
    sessionSummary.ts       -- Standalone summary builder (reserved for future use)
    exportSession.ts        -- Export payload builder
    devSeed.ts              -- Dev-only mock data
  types/
    session.ts              -- All TypeScript types for the session
```
