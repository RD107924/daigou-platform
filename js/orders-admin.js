document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const orderListBody = document.getElementById("order-list-body");
  const API_BASE_URL = "http://localhost:3000";
  const statusOptions = [
    "待處理",
    "已通知廠商發貨",
    "已發貨",
    "已完成",
    "訂單取消",
  ];

  async function fetchAndRenderOrders() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: authHeaders, // <--- 使用帶有 token 的 headers
      });
      if (!response.ok) throw new Error("無法獲取訂單列表");
      const orders = await response.json();
      orderListBody.innerHTML = "";
      orders.forEach((order) => {
        const itemsHtml = order.items
          .map((item) => `<li>${item.title} (x${item.quantity})</li>`)
          .join("");
        const statusSelectHtml = `<select class="status-select" data-order-id="${
          order.orderId
        }">${statusOptions
          .map(
            (status) =>
              `<option value="${status}" ${
                order.status === status ? "selected" : ""
              }>${status}</option>`
          )
          .join("")}</select>`;
        const row = `<tr><td>${order.orderId}</td><td>${new Date(
          order.createdAt
        ).toLocaleString()}</td><td>${order.paopaohuId} (末五碼: ${
          order.lastFiveDigits
        })</td><td>$${
          order.totalAmount
        }</td><td><ul>${itemsHtml}</ul></td><td>${statusSelectHtml}</td></tr>`;
        orderListBody.insertAdjacentHTML("beforeend", row);
      });
    } catch (error) {
      console.error("錯誤:", error);
      orderListBody.innerHTML = `<tr><td colspan="6">載入訂單失敗...</td></tr>`;
    }
  }

  orderListBody.addEventListener("change", async (event) => {
    if (event.target.classList.contains("status-select")) {
      const orderId = event.target.dataset.orderId;
      const newStatus = event.target.value;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/orders/${orderId}/status`,
          {
            method: "PATCH",
            headers: authHeaders, // <--- 使用帶有 token 的 headers
            body: JSON.stringify({ status: newStatus }),
          }
        );
        if (!response.ok) throw new Error("更新狀態失敗");
        const result = await response.json();
        console.log(result.message);
        event.target.closest("tr").style.backgroundColor = "#d4edda";
        setTimeout(() => {
          event.target.closest("tr").style.backgroundColor = "";
        }, 1000);
      } catch (error) {
        console.error("錯誤:", error);
        alert("更新訂單狀態時發生錯誤。");
        fetchAndRenderOrders();
      }
    }
  });

  fetchAndRenderOrders();
});
