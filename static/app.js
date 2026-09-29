const API = "";
const statusLabels = {
  preparing: "Preparing",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
};

const $ = (id) => document.getElementById(id);
const dialog = $("createDialog");

function showMessage(text, error = false) {
  const el = $("message");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("error", error);
  el.hidden = false;
  window.setTimeout(() => (el.hidden = true), 3200);
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

async function loadStats() {
  const stats = await api("/stats/overview");
  $("totalOrders").textContent = stats.total_orders;
  $("activeOrders").textContent = stats.active_orders;
  $("deliveredOrders").textContent = stats.delivered_orders;
  $("todayOrders").textContent = stats.today_orders;

  const max = Math.max(1, ...Object.values(stats.by_status));
  $("pipeline").innerHTML = Object.entries(statusLabels).map(([key, label]) => {
    const value = stats.by_status[key] || 0;
    const width = Math.max(value ? 8 : 0, Math.round((value / max) * 100));
    return `<a class="pipeline-item pipeline-link" href="/orders-page?status=${key}">
      <header><span>${label}</span><strong>${value}</strong></header>
      <div class="pipeline-bar"><i style="width:${width}%"></i></div>
    </a>`;
  }).join("");

  $("lastUpdated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

async function refreshDashboard() {
  try {
    await loadStats();
  } catch (error) {
    showMessage(error.message, true);
  }
}

$("openCreate")?.addEventListener("click", () => dialog?.showModal());
$("closeCreate")?.addEventListener("click", () => dialog?.close());
$("cancelCreate")?.addEventListener("click", () => dialog?.close());

$("createForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  // event.currentTarget becomes null after an await in browser event handlers.
  // Keep a stable reference before making the API call.
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
    showMessage("Order created successfully.");
    await refreshDashboard();

    // Take the user directly to the newly-created order on the dedicated Orders page.
    window.setTimeout(() => {
      window.location.href = `/orders-page?order_id=${createdOrder.id}`;
    }, 450);
  } catch (error) {
    showMessage(error.message, true);
  }
});

refreshDashboard();
