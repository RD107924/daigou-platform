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

      if (orders.length === 0) {
        orderListBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">目前沒有任何訂單。</td></tr>`;
      } else {
        orders.forEach((order) => {
          const itemsHtml = order.items
            .map(
              (item) =>
                `<li>${item.title} (x${item.quantity}) - $${
                  (item.price + (item.serviceFee || 0)) * item.quantity
                }</li>`
            )
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

          let lastOperationHtml = "無紀錄";
          if (order.activityLog && order.activityLog.length > 0) {
            const lastLog = order.activityLog[order.activityLog.length - 1];
            lastOperationHtml = `
                            <div><strong>${lastLog.updatedBy}</strong></div>
                            <div style="font-size: 0.8em; color: #6c757d;">${new Date(
                              lastLog.timestamp
                            ).toLocaleString()}</div>
                        `;
          }

          // 組裝客戶資訊 HTML
          const customerInfoHtml = `
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9em;">
                            <li><strong>跑跑虎ID:</strong> ${
                              order.paopaohuId
                            }</li>
                            <li><strong>Email:</strong> ${order.email}</li>
                            <li><strong>末五碼:</strong> ${
                              order.lastFiveDigits
                            }</li>
                            <li><strong>統編:</strong> ${
                              order.taxId || "無"
                            }</li>
                        </ul>
                    `;

          // 組裝訂單資訊 HTML
          const orderInfoHtml = `
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9em;">
                            <li><strong>編號:</strong> ${order.orderId}</li>
                            <li><strong>時間:</strong> ${new Date(
                              order.createdAt
                            ).toLocaleString()}</li>
                        </ul>
                    `;

          const row = `
                        <tr>
                            <td data-label="訂單資訊">${orderInfoHtml}</td>
                            <td data-label="客戶資訊">${customerInfoHtml}</td>
                            <td data-label="商品詳情"><ul style="padding-left: 15px; margin: 0;">${itemsHtml}</ul></td>
                            <td data-label="總金額">$${order.totalAmount}</td>
                            <td data-label="狀態">${statusSelectHtml}</td>
                            <td data-label="最後操作">${lastOperationHtml}</td>
                        </tr>`;
          orderListBody.insertAdjacentHTML("beforeend", row);
        });
      }

      if (window.checkNotifications) {
        checkNotifications();
      }
    } catch (error) {
      console.error("錯誤:", error);
      orderListBody.innerHTML = `<tr><td colspan="6">載入訂單失敗: ${error.message}</td></tr>`;
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

        fetchAndRenderOrders();
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
