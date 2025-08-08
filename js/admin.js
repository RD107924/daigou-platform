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

  const productListBody = document.getElementById("product-list-body");
  const addProductForm = document.getElementById("add-product-form");
  const editModal = document.getElementById("edit-modal");
  const editForm = document.getElementById("edit-product-form");
  const closeModalBtn = document.querySelector(".modal-close-btn");
  const editProductId = document.getElementById("edit-product-id");
  const saveSortBtn = document.getElementById("save-sort-btn"); // 獲取儲存排序按鈕
  const API_BASE_URL = "https://daigou-platform-api.onrender.com";

  let sortableInstance = null; // 用來存放 Sortable 的實體

  // 功能1: 獲取並顯示所有商品
  async function fetchAndRenderProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) throw new Error("無法獲取商品列表");
      const products = await response.json();
      productListBody.innerHTML = "";
      products.forEach((product) => {
        const serviceFee = product.serviceFee || 0;
        // 修改點：在 <tr> 標籤上新增 data-id=${product.id}
        const row = `
          <tr data-id="${product.id}">
            <td data-label="ID">${product.id}</td>
            <td data-label="分類">${product.category}</td>
            <td data-label="名稱">${product.title}</td>
            <td data-label="最終售價">$${product.price}</td>
            <td data-label="服務費">$${serviceFee}</td>
            <td data-label="操作">
              <button class="btn-small btn-secondary btn-edit" data-id="${product.id}">編輯</button>
              <button class="btn-small btn-danger btn-delete" data-id="${product.id}">刪除</button>
            </td>
          </tr>`;
        productListBody.insertAdjacentHTML("beforeend", row);
      });

      // 初始化或重新啟用 SortableJS
      if (sortableInstance) {
        sortableInstance.option("disabled", false);
      } else {
        initializeSortable();
      }
    } catch (error) {
      console.error("錯誤:", error);
      productListBody.innerHTML = `<tr><td colspan="6">載入失敗...</td></tr>`;
    }
  }

  // 新增功能：初始化拖曳排序
  function initializeSortable() {
    if (!productListBody) return;
    sortableInstance = new Sortable(productListBody, {
      animation: 150, // 拖曳動畫毫秒
      ghostClass: "sortable-ghost", // 拖曳時占位符的 class (可選)
      onEnd: function (evt) {
        // 當拖曳結束時，顯示「儲存排序」按鈕
        saveSortBtn.style.display = "inline-block";
      },
    });
  }

  // 新增事件監聽：儲存排序按鈕
  saveSortBtn.addEventListener("click", async () => {
    if (!sortableInstance) return;

    // 從 Sortable 實體獲取最新的 ID 順序陣列
    const orderedIds = sortableInstance.toArray();

    try {
      const response = await fetch(`${API_BASE_URL}/api/products/order`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ orderedIds: orderedIds }),
      });
      if (!response.ok) throw new Error("儲存排序失敗");
      alert("商品排序已成功儲存！");
      saveSortBtn.style.display = "none"; // 儲存成功後隱藏按鈕
    } catch (error) {
      console.error("錯誤:", error);
      alert("儲存排序時發生錯誤。");
    }
  });

  // 功能2: 打開編輯 Modal (維持不變)
  async function openEditModal(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
      if (!response.ok) throw new Error("無法獲取商品資料");
      const product = await response.json();
      editProductId.value = product.id;
      document.getElementById("edit-category").value = product.category;
      document.getElementById("edit-title").value = product.title;
      document.getElementById("edit-price").value = product.price;
      document.getElementById("edit-imageUrl").value = product.imageUrl;
      document.getElementById("edit-serviceFee").value =
        product.serviceFee || 0;
      editModal.style.display = "block";
    } catch (error) {
      console.error("錯誤:", error);
      alert("無法載入商品資料進行編輯。");
    }
  }

  function closeEditModal() {
    editModal.style.display = "none";
  }

  // 事件監聽: 新增商品 (維持不變)
  addProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newProduct = {
      category: document.getElementById("category").value,
      title: document.getElementById("title").value,
      price: parseInt(document.getElementById("price").value, 10),
      serviceFee: parseInt(document.getElementById("serviceFee").value, 10),
      imageUrl: document.getElementById("imageUrl").value,
    };
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newProduct),
      });
      if (!response.ok) throw new Error("新增商品失敗");
      alert("商品新增成功！");
      addProductForm.reset();
      fetchAndRenderProducts();
    } catch (error) {
      console.error("錯誤:", error);
      alert("新增商品時發生錯誤。");
    }
  });

  // 事件監聽: 列表點擊 (編輯/刪除) (維持不變)
  productListBody.addEventListener("click", async (event) => {
    const target = event.target;
    const productId = target.dataset.id;
    if (target.classList.contains("btn-delete")) {
      if (confirm(`您確定要刪除 ID 為 ${productId} 的商品嗎？`)) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/products/${productId}`,
            {
              method: "DELETE",
              headers: authHeaders,
            }
          );
          if (!response.ok) throw new Error("刪除商品失敗");
          alert("商品刪除成功");
          fetchAndRenderProducts();
        } catch (error) {
          console.error("錯誤:", error);
          alert("刪除商品時發生錯誤。");
        }
      }
    }
    if (target.classList.contains("btn-edit")) {
      openEditModal(productId);
    }
  });

  // 事件監聽: 編輯表單提交 (維持不變)
  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const productId = editProductId.value;
    const updatedProduct = {
      category: document.getElementById("edit-category").value,
      title: document.getElementById("edit-title").value,
      price: parseInt(document.getElementById("edit-price").value, 10),
      serviceFee: parseInt(
        document.getElementById("edit-serviceFee").value,
        10
      ),
      imageUrl: document.getElementById("edit-imageUrl").value,
    };
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/products/${productId}`,
        {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(updatedProduct),
        }
      );
      if (!response.ok) throw new Error("更新商品失敗");
      alert("商品更新成功！");
      closeEditModal();
      fetchAndRenderProducts();
    } catch (error) {
      console.error("錯誤:", error);
      alert("更新商品時發生錯誤。");
    }
  });

  // 其他事件監聽 (維持不變)
  closeModalBtn.addEventListener("click", closeEditModal);
  window.addEventListener("click", (event) => {
    if (event.target == editModal) {
      closeEditModal();
    }
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  });

  // 頁面載入時，立即執行一次商品載入
  fetchAndRenderProducts();
});
