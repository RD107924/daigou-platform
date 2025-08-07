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
  const API_BASE_URL = "https://daigou-platform-api.onrender.com";
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
        headers: authHeaders,
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
        const row = `
            <tr>
                <td data-label="訂單編號">${order.orderId}</td>
                <td data-label="下單時間">${new Date(
                  order.createdAt
                ).toLocaleString()}</td>
                <td data-label="跑跑虎編號">${order.paopaohuId} (末五碼: ${
          order.lastFiveDigits
        })</td>
                <td data-label="總金額">$${order.totalAmount}</td>
                <td data-label="商品詳情"><ul>${itemsHtml}</ul></td>
                <td data-label="狀態">${statusSelectHtml}</td>
            </tr>`;
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
            headers: authHeaders,
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

  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  });

  fetchAndRenderOrders();
});
