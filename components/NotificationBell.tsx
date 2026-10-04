"use client";
import React from "react";
import { OverlayPanel } from "primereact/overlaypanel";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/NotificationContext";

interface NotificationBellProps {
  enabled: boolean;
}

const timeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const NotificationBell: React.FC<NotificationBellProps> = ({ enabled }) => {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAllRead,
    markOneRead,
    deleteOne,
    clearAll,
  } = useNotifications();
  const overlayRef = React.useRef<OverlayPanel>(null);
  const [confirmVisible, setConfirmVisible] = React.useState(false);

  const handleItemClick = async (n: (typeof notifications)[number]) => {
    overlayRef.current?.hide();
    if (!n.isRead) await markOneRead(n._id);
    if (n.orderId) router.push(`/dashboard/orders/${n.orderId}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // item click (navigate) trigger hobe na
    await deleteOne(id);
  };

  // Clear all click -> panel bondho kore confirm modal kholo
  const openClearAllModal = () => {
    overlayRef.current?.hide();
    setConfirmVisible(true);
  };

  const handleConfirmClearAll = async () => {
    await clearAll();
    setConfirmVisible(false);
  };

  if (!enabled) return null;

  return (
    <div className="relative">
      <button
        onClick={(e) => overlayRef.current?.toggle(e)}
        aria-label="Notifications"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1px solid var(--border)",
          background: "var(--surface-soft)",
          cursor: "pointer",
        }}
      >
        <i className="pi pi-bell" style={{ fontSize: 17, color: "var(--brand-primary-dark)" }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              padding: "0 4px",
              borderRadius: 999,
              background: "#e53935",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid var(--surface)",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <OverlayPanel ref={overlayRef} className="amp-notif-panel" style={{ width: 360, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--brand-primary-dark)" }}>Notifications</h3>
            {unreadCount > 0 && <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted)" }}>{unreadCount} unread</p>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} disabled={loading} style={{ fontSize: 12, fontWeight: 600, color: "var(--brand-blue)", background: "none", border: "none", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={openClearAllModal} disabled={loading} style={{ fontSize: 12, fontWeight: 600, color: "#e53935", background: "none", border: "none", cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
                Clear all
              </button>
            )}
          </div>
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
              <i className="pi pi-bell-slash" style={{ fontSize: 28, color: "var(--muted)", marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleItemClick(n)}
                className="amp-notif-item"
                style={{ display: "flex", gap: 10, padding: "12px 16px", cursor: "pointer", background: n.isRead ? "transparent" : "rgba(33, 150, 211, 0.06)", borderBottom: "1px solid var(--border)" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: n.isRead ? "var(--surface-soft)" : "rgba(33, 150, 211, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="pi pi-shopping-cart" style={{ fontSize: 14, color: n.isRead ? "var(--muted)" : "var(--brand-blue)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</p>
                    {!n.isRead && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--brand-blue)", flexShrink: 0 }} />}
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>{timeAgo(n.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(e, n._id)}
                  aria-label="Delete notification"
                  title="Delete"
                  className="amp-notif-delete"
                  style={{ alignSelf: "center", flexShrink: 0, width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <i className="pi pi-trash" style={{ fontSize: 13, color: "var(--muted)" }} />
                </button>
              </div>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div style={{ padding: "10px 16px", textAlign: "center", borderTop: "1px solid var(--border)" }}>
            <button onClick={() => { overlayRef.current?.hide(); router.push("/dashboard/orders"); }} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--brand-blue)", background: "none", border: "none", cursor: "pointer" }}>
              View all orders
            </button>
          </div>
        )}
      </OverlayPanel>

      {/* Clear all confirm modal (OverlayPanel er baire) */}
      <Dialog
        visible={confirmVisible}
        onHide={() => !loading && setConfirmVisible(false)}
        modal
        draggable={false}
        resizable={false}
        closable={false}
        showHeader={false}
        dismissableMask={!loading}
        blockScroll
        className="amp-confirm-dialog"
        style={{ width: "92vw", maxWidth: 400 }}
        contentStyle={{ padding: 0, borderRadius: 20 }}
      >
        <div style={{ padding: "28px 24px 20px", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(229, 57, 53, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <i className="pi pi-trash" style={{ fontSize: 26, color: "#e53935" }} />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--brand-primary-dark)" }}>
            Clear all notifications?
          </h3>
          <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.5, color: "var(--muted)" }}>
            Your all notifications will be permanently deleted. This action cannot be undone.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "0 24px 24px" }}>
          <Button
            label="Cancel"
            onClick={() => setConfirmVisible(false)}
            disabled={loading}
            outlined
            severity="secondary"
            className="amp-confirm-btn"
            style={{ flex: 1, borderRadius: 12, justifyContent: "center" }}
          />
          <Button
            label="Yes, delete all"
            icon="pi pi-trash"
            onClick={handleConfirmClearAll}
            loading={loading}
            severity="danger"
            className="amp-confirm-btn"
            style={{ flex: 1, borderRadius: 12, justifyContent: "center" }}
          />
        </div>
      </Dialog>

      <style jsx global>{`
        .amp-notif-panel .p-overlaypanel-content { padding: 0 !important; }
        .amp-notif-item:hover { background: var(--surface-soft) !important; }
        .amp-notif-delete:hover { background: rgba(229, 57, 53, 0.12) !important; }
        .amp-notif-delete:hover i { color: #e53935 !important; }
        .amp-confirm-dialog.p-dialog {
          border-radius: 20px !important;
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: 0 24px 60px rgba(15, 28, 53, 0.25) !important;
        }
        .amp-confirm-dialog .p-dialog-content { border-radius: 20px !important; }
        .amp-confirm-btn { font-weight: 600 !important; padding: 10px 14px !important; }
      `}</style>
    </div>
  );
};

export default NotificationBell;