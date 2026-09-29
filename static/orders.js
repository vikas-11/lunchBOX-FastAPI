const API = "";
const statusLabels = {
  preparing: "Preparing",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
};
const nextStatus = {
  preparing: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
};

const $ = (id) => document.getElementById(id);
const dialog = $("createDialog");
const queryParams = new URLSearchParams(window.location.search);
const selectedOrderId = queryParams.get("order_id");
let searchTimer;

function showMessage(text, error = false) {
  const el = $("message");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("error", error);
  el.hidden = false;
  window.setTimeout(() => (el.hidden = true), 3200);
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch (_) {}
    throw new Error(detail);
  }
  if (response.status === 204) return null;
  return response.json();
}

function orderMarkup(order, single = false) {
  const next = nextStatus[order.status];
  return `<article class="order-row ${single ? "single-order-card" : "clickable-order"}" data-order-row="${order.id}">
    <div class="order-main">
      <strong>#${order.id} · ${escapeHtml(order.customer_name)}</strong>
      <small>${escapeHtml(order.items)}</small>
    </div>
    <div class="order-address">${escapeHtml(order.delivery_address)}</div>
    <div class="order-meta">
      <span class="status-pill status-${order.status}">${statusLabels[order.status] || order.status}</span>
      <small>Updated ${formatDate(order.updated_at)}</small>
      ${single ? `<small>Created ${formatDate(order.created_at)}</small>` : ""}
    </div>
    <div class="order-actions">
      ${!single ? `<a class="view-btn button-link" href="/orders-page?order_id=${order.id}">View</a>` : ""}
      ${next ? `<button class="status-btn" data-id="${order.id}" data-status="${next}">→ ${statusLabels[next]}</button>` : ""}
      <button class="danger-btn" data-delete="${order.id}">Delete</button>
    </div>
  </article>`;
}

function historyMarkup(history) {
  if (!history.length) {
    return `<div class="history-empty">No status changes yet. This order is still in its initial state.</div>`;
  }
  return `<div class="history-block">
    <div class="detail-section-head"><p class="eyebrow">STATUS HISTORY</p><h2>Order timeline</h2></div>
    <div class="history-list">
      ${history.map((item) => `<div class="history-item">
        <span class="history-dot"></span>
        <div><strong>${statusLabels[item.old_status] || item.old_status} → ${statusLabels[item.new_status] || item.new_status}</strong><small>${formatDate(item.changed_at)}</small></div>
      </div>`).join("")}
    </div>
  </div>`;
}

async function loadSingleOrder(orderId) {
  $("pageTitle").textContent = `Order #${orderId}`;
  $("pageSubtitle").textContent = "Focused order view with delivery status and history.";
  $("listControls").innerHTML = `<div><p class="eyebrow">ORDER DETAILS</p><h2>Delivery record</h2></div><a class="ghost-btn button-link" href="/orders-page">← All orders</a>`;

  const [order, history] = await Promise.all([
    api(`/orders/${orderId}`),
    api(`/orders/${orderId}/history`),
  ]);

  $("ordersContainer").innerHTML = `${orderMarkup(order, true)}${historyMarkup(history)}`;
}

async function loadOrders() {
  if (selectedOrderId) {
    await loadSingleOrder(selectedOrderId);
    return;
  }

  const params = new URLSearchParams({ limit: "100" });
  const status = $("statusFilter")?.value || "";
  const search = $("searchInput")?.value.trim() || "";

  if (status) {
    params.set("status", status);
    if ($("statusFilter")) $("statusFilter").value = status;
  }
  if (search) params.set("search", search);

  const orders = await api(`/orders/?${params}`);
  $("ordersContainer").innerHTML = orders.length
    ? orders.map((order) => orderMarkup(order)).join("")
    : `<div class="empty-state"><strong>No orders found</strong><br>Try another filter or create a new order.</div>`;
}

async function refreshOrders() {
  try {
    await loadOrders();
  } catch (error) {
    $("ordersContainer").innerHTML = `<div class="empty-state"><strong>Unable to load orders</strong><br>${escapeHtml(error.message)}</div>`;
    showMessage(error.message, true);
  }
}

$("openCreate")?.addEventListener("click", () => dialog?.showModal());
$("closeCreate")?.addEventListener("click", () => dialog?.close());
$("cancelCreate")?.addEventListener("click", () => dialog?.close());
$("refreshBtn")?.addEventListener("click", refreshOrders);
$("statusFilter")?.addEventListener("change", loadOrders);
$("searchInput")?.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = window.setTimeout(loadOrders, 280);
});

$("createForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const formData = new FormData(formElement);
  const payload = Object.fromEntries(formData.entries());

  try {
    const createdOrder = await api("/orders/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    formElement.reset();
    dialog?.close();
    window.location.href = `/orders-page?order_id=${createdOrder.id}`;
  } catch (error) {
    showMessage(error.message, true);
  }
});

$("ordersContainer")?.addEventListener("click", async (event) => {
  const statusButton = event.target.closest("[data-status]");
  const deleteButton = event.target.closest("[data-delete]");
  const row = event.target.closest("[data-order-row]");

  try {
    if (statusButton) {
      event.preventDefault();
      event.stopPropagation();
      const id = statusButton.dataset.id;
      const status = statusButton.dataset.status;
      await api(`/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      showMessage(`Order #${id} moved to ${statusLabels[status]}.`);
      await refreshOrders();
      return;
    }

    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      const id = deleteButton.dataset.delete;
      if (!confirm(`Delete order #${id}?`)) return;
      await api(`/orders/${id}`, { method: "DELETE" });
      showMessage(`Order #${id} deleted.`);
      if (selectedOrderId) {
        window.setTimeout(() => { window.location.href = "/orders-page"; }, 350);
      } else {
        await refreshOrders();
      }
      return;
    }

    if (row && !selectedOrderId && !event.target.closest("a, button")) {
      window.location.href = `/orders-page?order_id=${row.dataset.orderRow}`;
    }
  } catch (error) {
    showMessage(error.message, true);
  }
});

const initialStatus = queryParams.get("status");
if (!selectedOrderId && initialStatus && $("statusFilter")) {
  $("statusFilter").value = initialStatus;
}

refreshOrders();
