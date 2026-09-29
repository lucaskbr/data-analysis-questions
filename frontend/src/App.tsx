import { useMutation } from "@tanstack/react-query";
import { type SubmitEvent, useEffect, useRef, useState } from "react";

import { postChatMutation, type ChatResponse, type QueryResult, type Visualization } from "./api";
import { ChartCard } from "./ChartCard";

import "./App.css";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  title?: string;
  visualization?: Visualization;
  result?: QueryResult;
};

function createConversationId() {
  return crypto.randomUUID();
}

function App() {
  const [conversationId, setConversationId] = useState(createConversationId);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastResponse, setLastResponse] = useState<ChatResponse>();
  const conversationRef = useRef<HTMLElement>(null);

  const chat = useMutation({
    ...postChatMutation(),
    onSuccess: (response, variables) => {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", content: variables.body.message },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          title: response.response.title,
          content: response.response.content,
          visualization: response.visualization,
          result: response.queryTrace.at(-1)?.result,
        },
      ]);
      setLastResponse(response);
      setMessage("");
    },
  });

  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, chat.isPending]);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || chat.isPending) return;

    chat.mutate({ body: { conversationId, message: text } });
  }

  function startNewConversation() {
    setConversationId(createConversationId());
    setMessages([]);
    setLastResponse(undefined);
    setMessage("");
    chat.reset();
  }

  return (
    <main className="chat-page">
      <header className="chat-header">
        <div>
          <p className="eyebrow">Analytics assistant</p>
          <h1>Ask your data a question</h1>
          <p className="subtitle">This page sends requests to the local analytics-chat API.</p>
        </div>
        <button className="secondary-button" type="button" onClick={startNewConversation}>
          New conversation
        </button>
      </header>

      <section className="conversation" aria-live="polite" ref={conversationRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Try a question like:</p>
            <button
              type="button"
              onClick={() => setMessage("How many active users did we have yesterday?")}
            >
              How many active users did we have yesterday?
            </button>
          </div>
        ) : (
          messages.map((item) => (
            <article className={`message ${item.role}`} key={item.id}>
              <p className="message-role">{item.role === "user" ? "You" : item.title}</p>
              <p>{item.content}</p>
              {item.role === "assistant" && item.visualization && (
                <ChartCard visualization={item.visualization} result={item.result} />
              )}
            </article>
          ))
        )}

        {chat.isPending && (
          <article className="message assistant loading">
            <p className="message-role">Analytics assistant</p>
            <p>Looking into it…</p>
          </article>
        )}
      </section>

      {chat.isError && (
        <p className="error" role="alert">
          {chat.error.error || "The API request failed. Is the backend running?"}
        </p>
      )}

      <form className="composer" onSubmit={submit}>
        <label htmlFor="message">Your question</label>
        <div className="composer-row">
          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask about your analytics…"
            rows={3}
            disabled={chat.isPending}
          />
          <button
            className="send-button"
            type="submit"
            disabled={!message.trim() || chat.isPending}
          >
            {chat.isPending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>

      {lastResponse && (
        <details className="request-details">
          <summary>Last response details ({lastResponse.queryTrace.length} queries)</summary>
          <pre>{JSON.stringify(lastResponse, null, 2)}</pre>
        </details>
      )}
    </main>
  );
}

export default App;
