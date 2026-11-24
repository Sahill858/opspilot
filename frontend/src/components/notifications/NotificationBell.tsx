
"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const [notificationsResponse, countResponse] = await Promise.all([
        fetch("/api/notifications", { cache: "no-store" }),
        fetch("/api/notifications?unread=count", { cache: "no-store" }),
      ]);

      if (!notificationsResponse.ok || !countResponse.ok) {
        throw new Error("Unable to load notifications");
      }

      const notificationsData = await notificationsResponse.json();
      const countData = await countResponse.json();

      setNotifications(notificationsData);
      setUnreadCount(countData.unread_count);
    } catch (error) {
      console.error("Notification fetch error:", error);
      setError("Could not load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        const response = await fetch(
          `/api/notifications/${notification.id}/read`,
          { method: "PATCH" }
        );

        if (!response.ok) {
          throw new Error("Failed to mark notification as read");
        }

        setNotifications((previous) =>
          previous.map((item) =>
            item.id === notification.id
              ? { ...item, is_read: true }
              : item
          )
        );

        setUnreadCount((previous) => Math.max(0, previous - 1));
      } catch (error) {
        console.error("Mark as read error:", error);
        setError("Could not mark notification as read.");
        return;
      }
    }

    setIsOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);

          if (nextState) {
            fetchNotifications();
          }
        }}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        className="relative rounded-xl p-2.5 text-gray-600 transition hover:bg-gray-100"
      >
        <Bell size={21} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Click outside to close */}
          <button
            aria-label="Close notifications"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          {/* Notification Dropdown */}
          <div
  className="
    absolute right-0 top-12 z-50
    flex max-h-[min(75vh,520px)] w-[min(360px,calc(100vw-2rem))]
    flex-col overflow-hidden rounded-xl
    border border-gray-200 bg-white shadow-2xl

    md:fixed md:left-[264px] md:right-auto
    md:bottom-4 md:top-auto md:w-[360px]
  "
>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Notifications
                </h3>

                <p className="mt-0.5 text-xs text-gray-500">
                  {unreadCount} unread notifications
                </p>
              </div>

              <button
                onClick={fetchNotifications}
                disabled={loading}
                aria-label="Refresh notifications"
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {/* Notification List */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  Loading notifications...
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-red-600">{error}</p>

                  <button
                    onClick={fetchNotifications}
                    className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell
                    size={28}
                    className="mx-auto mb-2 text-gray-300"
                  />

                  <p className="text-sm font-medium text-gray-700">
                    No notifications yet
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    You&apos;re all caught up!
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleMarkAsRead(notification)}
                    className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-4 text-left transition hover:bg-gray-50 ${
                      !notification.is_read ? "bg-blue-50/60" : ""
                    }`}
                  >
                    {/* Read / Unread Indicator */}
                    <div className="mt-1 shrink-0">
                      {!notification.is_read ? (
                        <span className="block h-2.5 w-2.5 rounded-full bg-blue-600" />
                      ) : (
                        <CheckCheck
                          size={16}
                          className="text-gray-400"
                        />
                      )}
                    </div>

                    {/* Notification Content */}
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-5 text-gray-900">
                        {notification.title}
                      </p>

                      <p className="mt-1 break-words text-xs leading-5 text-gray-600">
                        {notification.message}
                      </p>

                      <p className="mt-2 text-[11px] font-medium text-gray-400">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-center text-xs text-gray-500">
                Showing your latest notifications
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
