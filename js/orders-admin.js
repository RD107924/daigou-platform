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

        // --- 新增：處理最後操作紀錄的顯示 ---
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

        const row = `<tr>
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
            <td data-label="最後操作">${lastOperationHtml}</td>
        </tr>`;
        orderListBody.insertAdjacentHTML("beforeend", row);
      });

      // --- 新增：渲染完成後，立即再次檢查通知，讓紅點消失 ---
      if (window.checkNotifications) {
        checkNotifications();
      }
    } catch (error) {
      console.error("錯誤:", error);
      orderListBody.innerHTML = `<tr><td colspan="7">載入訂單失敗...</td></tr>`;
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

        // 更新成功後，重新載入整個列表以顯示最新的操作紀錄
        // 這裡會自動再次呼叫 checkNotifications
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
