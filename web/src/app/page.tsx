"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  sampleMessages,
  type Platform,
  type SocialMessage,
} from "../data/sampleMessages";

type PlatformFilter = "all" | Platform;
type StatusFilter = "all" | "unread" | "responded" | "snoozed";

type AutomationStatus = "active" | "paused";

interface AutomationRule {
  id: string;
  name: string;
  platform: PlatformFilter;
  channel: "comment" | "message";
  trigger: string;
  response: string;
  status: AutomationStatus;
}

interface ActivityEntry {
  id: string;
  messageId: string;
  platform: Platform;
  summary: string;
  timestamp: string;
  outcome: "scheduled" | "sent" | "error";
  meta?: Record<string, unknown>;
}

interface AccountCredentials {
  facebookPageId: string;
  facebookToken: string;
  instagramBusinessId: string;
  instagramToken: string;
  webhookUrl: string;
}

const initialAutomations: AutomationRule[] = [
  {
    id: "auto-lead",
    name: "Lead capture (comments)",
    platform: "all",
    channel: "comment",
    trigger: "contains 'pricing' OR 'cost'",
    response:
      "Thanks for your interest! I just sent you a DM with pricing and onboarding details. 🚀",
    status: "active",
  },
  {
    id: "auto-support",
    name: "Support escalation (DM)",
    platform: "facebook",
    channel: "message",
    trigger: "contains 'help' OR 'issue'",
    response:
      "I’m looping in our support team now. Could you share the email tied to your account so we can investigate?",
    status: "active",
  },
];

const defaultCredentials: AccountCredentials = {
  facebookPageId: "",
  facebookToken: "",
  instagramBusinessId: "",
  instagramToken: "",
  webhookUrl: "",
};

const formatRelativeTime = (value: string) => {
  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });
  const now = Date.now();
  const date = new Date(value).getTime();
  const diff = date - now;
  const abs = Math.abs(diff);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];

  for (const [unit, milliseconds] of units) {
    if (abs > milliseconds || unit === "minute") {
      const value = Math.round(diff / milliseconds);
      return formatter.format(value, unit);
    }
  }
  return "just now";
};

const getChannelFromMessage = (message: SocialMessage) =>
  message.type === "comment" ? "comment" : "message";

const resolvePlatformColor = (platform: Platform) =>
  platform === "facebook" ? "bg-[#1877f2]/10 text-[#0f5ed7]" : "bg-[#ff5da6]/10 text-[#d61b72]";

export default function Home() {
  const [messages, setMessages] = useState<SocialMessage[]>(sampleMessages);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    sampleMessages[0]?.id ?? null,
  );
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [automations, setAutomations] =
    useState<AutomationRule[]>(initialAutomations);
  const [newAutomation, setNewAutomation] = useState<Omit<AutomationRule, "id" | "status">>({
    name: "",
    platform: "all",
    channel: "comment",
    trigger: "",
    response: "",
  });
  const [automationStatus, setAutomationStatus] =
    useState<AutomationStatus>("active");
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [credentials, setCredentials] =
    useState<AccountCredentials>(defaultCredentials);
  const [composerValue, setComposerValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composerFeedback, setComposerFeedback] =
    useState<string | null>(null);
  const [automationFeedback, setAutomationFeedback] =
    useState<string | null>(null);

  useEffect(() => {
    const storedAutomations =
      typeof window !== "undefined"
        ? window.localStorage.getItem("agentic-automations-v1")
        : null;
    if (storedAutomations) {
      try {
        const parsed = JSON.parse(storedAutomations) as AutomationRule[];
        setAutomations(parsed);
      } catch {
        // ignore corrupted payloads
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "agentic-automations-v1",
        JSON.stringify(automations),
      );
    }
  }, [automations]);

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      const platformMatch =
        platformFilter === "all" || message.platform === platformFilter;
      const statusMatch =
        statusFilter === "all" || message.status === statusFilter;
      const searchMatch =
        !searchTerm ||
        message.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.snippet.toLowerCase().includes(searchTerm.toLowerCase());
      return platformMatch && statusMatch && searchMatch;
    });
  }, [messages, platformFilter, statusFilter, searchTerm]);

  const selectedMessage = messages.find(
    (message) => message.id === selectedMessageId,
  );

  useEffect(() => {
    if (!selectedMessage && filteredMessages.length > 0) {
      setSelectedMessageId(filteredMessages[0].id);
    }
  }, [filteredMessages, selectedMessage]);

  const connectionScore = useMemo(() => {
    const score =
      (credentials.facebookPageId && credentials.facebookToken ? 0.5 : 0) +
      (credentials.instagramBusinessId && credentials.instagramToken ? 0.5 : 0);
    return Math.round(score * 100);
  }, [credentials]);

  const handleCredentialChange = <K extends keyof AccountCredentials>(
    key: K,
    value: AccountCredentials[K],
  ) => {
    setCredentials((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const addAutomation = () => {
    if (
      !newAutomation.name ||
      !newAutomation.trigger ||
      !newAutomation.response
    ) {
      setAutomationFeedback(
        "Please provide a name, trigger, and response for the automation.",
      );
      return;
    }
    const rule: AutomationRule = {
      id: `automation-${Date.now()}`,
      status: automationStatus,
      ...newAutomation,
    };
    setAutomations((prev) => [rule, ...prev]);
    setNewAutomation({
      name: "",
      platform: "all",
      channel: "comment",
      trigger: "",
      response: "",
    });
    setAutomationFeedback(`Automation "${rule.name}" created.`);
  };

  const toggleAutomationStatus = (id: string) => {
    setAutomations((prev) =>
      prev.map((rule) =>
        rule.id === id
          ? { ...rule, status: rule.status === "active" ? "paused" : "active" }
          : rule,
      ),
    );
  };

  const deleteAutomation = (id: string) => {
    setAutomations((prev) => prev.filter((rule) => rule.id !== id));
  };

  const hydrateQuickReplies = () => {
    if (!selectedMessage) {
      return [];
    }

    const firstName = selectedMessage.author.split(" ")[0];

    return [
      {
        id: "thanks",
        label: "Thank + CTA",
        message: `Hey ${firstName}! Really appreciate you reaching out. I just sent a DM with the next steps—let me know what you think!`,
      },
      {
        id: "support",
        label: "Support handoff",
        message: `Thanks for the heads up, ${firstName}. Can you share the email tied to your account so I can connect you with support right away?`,
      },
      {
        id: "partnership",
        label: "Collab invite",
        message: `Love this idea, ${firstName}. I'd be keen to explore a partnership. What's the best email for you?`,
      },
    ];
  };

  const quickReplies = hydrateQuickReplies();

  const handleSendReply = async (reply: string) => {
    if (!selectedMessage) return;
    setIsSending(true);
    setComposerFeedback(null);

    try {
      const payload = {
        platform: selectedMessage.platform,
        targetId: selectedMessage.id,
        message: reply,
        channel: getChannelFromMessage(selectedMessage),
        dryRun: true,
        instagramBusinessAccountId:
          selectedMessage.platform === "instagram"
            ? credentials.instagramBusinessId
            : undefined,
        accessToken:
          selectedMessage.platform === "facebook"
            ? credentials.facebookToken
            : credentials.instagramToken,
      };

      const response = await fetch("/api/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          (data && data.error) ||
            "Meta API rejected the request. Double-check credentials.",
        );
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === selectedMessage.id
            ? { ...message, status: "responded" }
            : message,
        ),
      );

      setActivityLog((prev) => [
        {
          id: `log-${Date.now()}`,
          platform: selectedMessage.platform,
          messageId: selectedMessage.id,
          summary: `Sent ${selectedMessage.platform} ${selectedMessage.type} reply`,
          timestamp: new Date().toISOString(),
          outcome: data.result?.dryRun ? "scheduled" : "sent",
          meta: data.result ?? undefined,
        },
        ...prev,
      ]);

      setComposerValue("");
      setComposerFeedback(
        data.result?.dryRun
          ? "Reply simulated successfully (dry run). Provide a Meta token to send for real."
          : "Reply dispatched successfully.",
      );
    } catch (error) {
      setActivityLog((prev) => [
        {
          id: `log-error-${Date.now()}`,
          platform: selectedMessage.platform,
          messageId: selectedMessage.id,
          summary: `Failed to reply: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          timestamp: new Date().toISOString(),
          outcome: "error",
        },
        ...prev,
      ]);
      setComposerFeedback(
        error instanceof Error
          ? error.message
          : "Unexpected error while sending reply.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-10 sm:px-8 lg:px-12">
      <header className="glass-surface relative flex flex-col gap-6 rounded-3xl px-8 py-10 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#171f38] text-white shadow-lg">
            <span className="text-2xl font-semibold">AG</span>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2rem] text-slate-500">
              Agent workstation
            </p>
            <h1 className="mt-1 max-w-xl text-3xl font-semibold text-slate-900 md:text-4xl">
              Respond to every Facebook & Instagram touchpoint with one agentic
              cockpit.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
              Connect your Meta accounts, auto-triage inbound comments & DMs, and
              ship personalised replies in seconds. Built for creators, solo
              founders, and lean marketing teams.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-white/60 bg-white/70 px-5 py-4 shadow-inner backdrop-blur">
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Connection coverage
          </span>
          <span className="text-3xl font-semibold text-slate-900">
            {connectionScore}%
          </span>
          <p className="text-xs text-slate-500">
            Connect both platforms to unlock full automation.
          </p>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="flex flex-col gap-6">
          <div className="glass-surface rounded-3xl p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Meta account connections
                </h2>
                <p className="text-sm text-slate-600">
                  Paste long-lived tokens from Meta Business Suite. Tokens stay in
                  your browser only.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Local storage only
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-inner">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">
                    Facebook Page
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      credentials.facebookToken
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {credentials.facebookToken ? "Connected" : "Pending"}
                  </span>
                </div>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Page ID
                  <input
                    value={credentials.facebookPageId}
                    onChange={(event) =>
                      handleCredentialChange("facebookPageId", event.target.value)
                    }
                    placeholder="123456789"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Long-lived Page token
                  <textarea
                    value={credentials.facebookToken}
                    onChange={(event) =>
                      handleCredentialChange("facebookToken", event.target.value)
                    }
                    placeholder="EAAG..."
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-inner">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">
                    Instagram Business
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      credentials.instagramToken
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {credentials.instagramToken ? "Connected" : "Pending"}
                  </span>
                </div>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Business account ID
                  <input
                    value={credentials.instagramBusinessId}
                    onChange={(event) =>
                      handleCredentialChange(
                        "instagramBusinessId",
                        event.target.value,
                      )
                    }
                    placeholder="178414..."
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Long-lived user token
                  <textarea
                    value={credentials.instagramToken}
                    onChange={(event) =>
                      handleCredentialChange(
                        "instagramToken",
                        event.target.value,
                      )
                    }
                    placeholder="IGQVJ..."
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Webhook URL (Meta callback)
                <input
                  value={credentials.webhookUrl}
                  onChange={(event) =>
                    handleCredentialChange("webhookUrl", event.target.value)
                  }
                  placeholder="https://yourdomain.com/api/meta/webhook"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
          </div>

          <div className="glass-surface rounded-3xl p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Unified inbox
                </h2>
                <p className="text-sm text-slate-600">
                  Triage comments and DMs. Filters are client-side; plug in the
                  Meta webhook to hydrate this list in real-time.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {["all", "facebook", "instagram"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setPlatformFilter(filter as PlatformFilter)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      platformFilter === filter
                        ? "bg-slate-900 text-white shadow-md"
                        : "bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    {filter === "all"
                      ? "All"
                      : filter === "facebook"
                        ? "Facebook"
                        : "Instagram"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {["all", "unread", "responded", "snoozed"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status as StatusFilter)}
                    className={`rounded-full px-3 py-1.5 font-medium transition ${
                      statusFilter === status
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white/70 text-slate-600 hover:bg-white"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:max-w-xs">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name or keyword..."
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <svg
                  className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 5.25 5.25a7.5 7.5 0 0 0 11.4 11.4Z"
                  />
                </svg>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {filteredMessages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-sm text-slate-500">
                  No conversations match those filters.
                </div>
              )}
              {filteredMessages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => setSelectedMessageId(message.id)}
                  className={`flex items-start gap-4 rounded-2xl border border-transparent bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-[1px] hover:shadow-lg ${
                    selectedMessageId === message.id
                      ? "border-blue-500 shadow-lg ring-2 ring-blue-100"
                      : ""
                  }`}
                >
                  <Image
                    src={message.avatar}
                    alt={message.author}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {message.author}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${resolvePlatformColor(message.platform)}`}
                      >
                        {message.platform === "facebook" ? "Facebook" : "Instagram"}{" "}
                        · {message.type.toUpperCase()}
                      </span>
                      {message.status && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {message.status}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {message.snippet}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatRelativeTime(message.timestamp)}</span>
                      {message.permalink ? (
                        <Link
                          href={message.permalink}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          Open thread
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            fill="none"
                            className="h-3.5 w-3.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                            />
                          </svg>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-surface rounded-3xl p-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Automation studio
              </h2>
              <p className="text-sm text-slate-600">
                Create keyword or intent rules. Deploy via Meta webhooks + the{" "}
                <span className="font-semibold text-slate-800">/api/respond</span>{" "}
                endpoint to auto-reply within seconds.
              </p>
            </div>
            <div className="mt-5 grid gap-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-inner">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                  <input
                    value={newAutomation.name}
                    onChange={(event) =>
                      setNewAutomation((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Give this automation a mission name"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Trigger logic
                  <input
                    value={newAutomation.trigger}
                    onChange={(event) =>
                      setNewAutomation((prev) => ({
                        ...prev,
                        trigger: event.target.value,
                      }))
                    }
                    placeholder="contains 'price' OR sentiment = negative"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Platform
                  <select
                    value={newAutomation.platform}
                    onChange={(event) =>
                      setNewAutomation((prev) => ({
                        ...prev,
                        platform: event.target.value as PlatformFilter,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="all">All</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Channel
                  <select
                    value={newAutomation.channel}
                    onChange={(event) =>
                      setNewAutomation((prev) => ({
                        ...prev,
                        channel: event.target.value as "comment" | "message",
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="comment">Comment reply</option>
                    <option value="message">Direct message</option>
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                  <select
                    value={automationStatus}
                    onChange={(event) =>
                      setAutomationStatus(event.target.value as AutomationStatus)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </label>
              </div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Response copy
                <textarea
                  value={newAutomation.response}
                  onChange={(event) =>
                    setNewAutomation((prev) => ({
                      ...prev,
                      response: event.target.value,
                    }))
                  }
                  placeholder="Hey {{name}}, appreciate you reaching out..."
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Use double braces for variables e.g. {"{{name}}"}, {"{{product}}"}.
                  Map them in your webhook handler before calling <code>POST /api/respond</code>.
                </p>
                <button
                  type="button"
                  onClick={addAutomation}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add automation
                </button>
              </div>
              {automationFeedback && (
                <p className="rounded-xl bg-slate-900/80 px-4 py-3 text-xs font-medium text-white shadow-lg">
                  {automationFeedback}
                </p>
              )}
            </div>

            <div className="mt-6 grid gap-3">
              {automations.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-2xl border border-white/60 bg-white/80 px-5 py-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {rule.name}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {rule.platform === "all"
                          ? "All platforms"
                          : rule.platform === "facebook"
                            ? "Facebook"
                            : "Instagram"}{" "}
                        · {rule.channel === "comment" ? "Comments" : "Messages"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          rule.status === "active"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {rule.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleAutomationStatus(rule.id)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Toggle
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAutomation(rule.id)}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-600">Trigger</p>
                    <p className="mt-1">{rule.trigger}</p>
                  </div>
                  <div className="mt-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-600">
                      Response preview
                    </p>
                    <p className="mt-1 text-slate-600">{rule.response}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="glass-surface rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Reply composer
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Personalise messages and dispatch via the <code>/api/respond</code>{" "}
                  endpoint. Defaults to dry-run until a token is provided.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Real-time safe
              </span>
            </div>

            {selectedMessage ? (
              <div className="mt-6 space-y-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-inner">
                <div className="flex items-start gap-3">
                  <Image
                    src={selectedMessage.avatar}
                    alt={selectedMessage.author}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-2xl object-cover"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedMessage.author}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${resolvePlatformColor(selectedMessage.platform)}`}
                      >
                        {selectedMessage.platform === "facebook"
                          ? "Facebook"
                          : "Instagram"}{" "}
                        · {selectedMessage.type === "comment" ? "Comment" : "DM"}
                      </span>
                      {selectedMessage.intent && (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                          {selectedMessage.intent}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {selectedMessage.snippet}
                    </p>
                    <p className="text-xs text-slate-400">
                      Arrived {formatRelativeTime(selectedMessage.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply.id}
                      type="button"
                      onClick={() => setComposerValue(reply.message)}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                    >
                      {reply.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={composerValue}
                  onChange={(event) => setComposerValue(event.target.value)}
                  placeholder="Write a personalised reply…"
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Shipping as{" "}
                    <span className="font-semibold text-slate-700">
                      {selectedMessage.type === "comment"
                        ? "Thread reply"
                        : "Direct message"}
                    </span>{" "}
                    via{" "}
                    <span className="font-semibold text-slate-700">
                      {selectedMessage.platform === "facebook"
                        ? "Facebook Graph API"
                        : "Instagram Graph API"}
                    </span>
                  </p>
                  <button
                    type="button"
                    disabled={!composerValue || isSending}
                    onClick={() => handleSendReply(composerValue)}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSending ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12a7.5 7.5 0 0 1 12.89-4.975M19.5 12a7.5 7.5 0 0 1-12.89 4.975"
                          />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12 15-8.25-3.102 8.25 3.102 8.25-15-8.25Z"
                          />
                        </svg>
                        Send reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-sm text-slate-500">
                Select a message from the inbox to compose a reply.
              </div>
            )}

            {composerFeedback && (
              <p className="mt-4 rounded-xl bg-slate-900/80 px-4 py-3 text-xs font-medium text-white shadow-lg">
                {composerFeedback}
              </p>
            )}
          </div>

          <div className="glass-surface rounded-3xl p-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Activity stream
              </h2>
              <p className="text-sm text-slate-600">
                Observe outbound replies, automation triggers, or webhook errors.
                Useful for auditing what goes live.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {activityLog.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-8 text-center text-sm text-slate-500">
                  Replies will appear here once you send or schedule them.
                </div>
              ) : (
                activityLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${resolvePlatformColor(entry.platform)}`}
                          >
                            {entry.platform}
                          </span>
                          <p className="text-sm font-semibold text-slate-900">
                            {entry.summary}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatRelativeTime(entry.timestamp)} · Thread{" "}
                          <span className="font-mono text-slate-600">
                            {entry.messageId}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          entry.outcome === "sent"
                            ? "bg-emerald-100 text-emerald-600"
                            : entry.outcome === "scheduled"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-red-100 text-red-600"
                        }`}
                      >
                        {entry.outcome}
                      </span>
                    </div>
                    {entry.meta ? (
                      <pre className="mt-3 max-h-32 overflow-y-auto rounded-xl bg-slate-900/90 px-3 py-2 text-[11px] text-slate-100">
                        {JSON.stringify(entry.meta, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
