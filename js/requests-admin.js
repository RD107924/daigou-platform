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

  const requestListBody = document.getElementById("request-list-body");
  const API_BASE_URL = "https://daigou-platform-api.onrender.com"; // 請確認是您的後端網址
  const statusOptions = ["待報價", "已報價", "處理中", "已轉訂單", "已取消"];

  async function fetchAndRenderRequests() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/requests`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error("無法獲取請求列表");
      const requests = await response.json();

      requestListBody.innerHTML = "";
      requests.forEach((req) => {
        const statusSelectHtml = `
                    <select class="status-select" data-request-id="${
                      req.requestId
                    }">
                        ${statusOptions
                          .map(
                            (status) =>
                              `<option value="${status}" ${
                                req.status === status ? "selected" : ""
                              }>${status}</option>`
                          )
                          .join("")}
                    </select>`;
        const row = `
                    <tr>
                        <td>${new Date(req.receivedAt).toLocaleString()}</td>
                        <td>${req.paopaohuId || "N/A"}</td>
                        <td>${req.contactInfo}</td>
                        <td><a href="${
                          req.productUrl
                        }" target="_blank">點擊查看</a></td>
                        <td>
                            <b>${req.productName}</b><br>
                            規格: ${req.specs}<br>
                            數量: ${req.quantity}
                        </td>
                        <td>${req.notes || ""}</td>
                        <td>${statusSelectHtml}</td>
                    </tr>
                `;
        requestListBody.insertAdjacentHTML("beforeend", row);
      });
    } catch (error) {
      console.error("錯誤:", error);
      requestListBody.innerHTML = `<tr><td colspan="7">載入請求失敗...</td></tr>`;
    }
  }

  requestListBody.addEventListener("change", async (event) => {
    if (event.target.classList.contains("status-select")) {
      const requestId = event.target.dataset.requestId;
      const newStatus = event.target.value;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/requests/${requestId}/status`,
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
        alert("更新請求狀態時發生錯誤。");
        fetchAndRenderRequests();
      }
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  });

  fetchAndRenderRequests();
});
