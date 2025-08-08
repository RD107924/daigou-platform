// 這個檔案將被所有後台頁面共用
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  if (!token) return; // 如果未登入，不執行任何操作

  const API_BASE_URL = "https://daigou-platform-api.onrender.com";
  const authHeaders = { Authorization: `Bearer ${token}` };

  const ordersBadge = document.getElementById("orders-badge");
  const requestsBadge = document.getElementById("requests-badge");

  // 函式：檢查並更新通知
  window.checkNotifications = async function () {
    if (!token) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/summary`,
        { headers: authHeaders }
      );
      if (!response.ok) return;
      const data = await response.json();

      // 更新訂單通知
      if (ordersBadge && data.newOrdersCount > 0) {
        ordersBadge.textContent = data.newOrdersCount;
        ordersBadge.style.display = "inline-block";
      } else if (ordersBadge) {
        ordersBadge.textContent = "";
        ordersBadge.style.display = "none";
      }

      // 更新代採購請求通知
      if (requestsBadge && data.newRequestsCount > 0) {
        requestsBadge.textContent = data.newRequestsCount;
        requestsBadge.style.display = "inline-block";
      } else if (requestsBadge) {
        requestsBadge.textContent = "";
        requestsBadge.style.display = "none";
      }
    } catch (error) {
      console.error("檢查通知失敗:", error);
    }
  };

  // 頁面載入時先檢查一次
  checkNotifications();
  // 每 30 秒自動檢查一次
  setInterval(checkNotifications, 30000);
});
