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
  const API_BASE_URL = "https://daigou-platform-api.onrender.com"; // 請確認這是您正確的後端網址

  // 功能1: 獲取並顯示所有商品
  async function fetchAndRenderProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) throw new Error("無法獲取商品列表");
      const products = await response.json();
      productListBody.innerHTML = "";
      products.forEach((product) => {
        // 修改點：在表格中顯示 serviceFee，如果沒有則顯示 0
        const serviceFee = product.serviceFee || 0;
        const row = `
          <tr>
            <td>${product.id}</td>
            <td>${product.category}</td>
            <td>${product.title}</td>
            <td>$${product.price}</td>
            <td>$${serviceFee}</td>
            <td>
              <button class="btn-small btn-secondary btn-edit" data-id="${product.id}">編輯</button>
              <button class="btn-small btn-danger btn-delete" data-id="${product.id}">刪除</button>
            </td>
          </tr>`;
        productListBody.insertAdjacentHTML("beforeend", row);
      });
    } catch (error) {
      console.error("錯誤:", error);
      productListBody.innerHTML = `<tr><td colspan="6">載入失敗...</td></tr>`;
    }
  }

  // 功能2: 打開編輯 Modal 並填充資料
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
      // 修改點：填充 serviceFee，如果沒有則給預設值 0
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

  // 事件監聽: 新增商品
  addProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newProduct = {
      category: document.getElementById("category").value,
      title: document.getElementById("title").value,
      price: parseInt(document.getElementById("price").value, 10),
      imageUrl: document.getElementById("imageUrl").value,
      // 修改點：收集 serviceFee
      serviceFee: parseInt(document.getElementById("serviceFee").value, 10),
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

  // 事件監聽: 列表點擊 (編輯/刪除)
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

  // 事件監聽: 編輯表單提交
  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const productId = editProductId.value;
    const updatedProduct = {
      category: document.getElementById("edit-category").value,
      title: document.getElementById("edit-title").value,
      price: parseInt(document.getElementById("edit-price").value, 10),
      imageUrl: document.getElementById("edit-imageUrl").value,
      // 修改點：收集 serviceFee
      serviceFee: parseInt(
        document.getElementById("edit-serviceFee").value,
        10
      ),
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

  // 其他事件監聽
  closeModalBtn.addEventListener("click", closeEditModal);
  window.addEventListener("click", (event) => {
    if (event.target == editModal) {
      closeEditModal();
    }
  });
  // 增加登出按鈕的事件監聽
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  });

  // 頁面載入時，立即執行一次商品載入
  fetchAndRenderProducts();
});
