document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  // 如果沒有 token，直接踢回登入頁
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // 準備好要重複使用的 headers
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
  const API_BASE_URL = "https://daigou-platform-api.onrender.com";

  async function fetchAndRenderProducts() {
    try {
      // 注意：取得商品列表是公開的，不需要 token
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) throw new Error("無法獲取商品列表");
      const products = await response.json();
      productListBody.innerHTML = "";
      products.forEach((product) => {
        const row = `<tr><td>${product.id}</td><td>${product.category}</td><td>${product.title}</td><td>$${product.price}</td><td><button class="btn-small btn-secondary btn-edit" data-id="${product.id}">編輯</button><button class="btn-small btn-danger btn-delete" data-id="${product.id}">刪除</button></td></tr>`;
        productListBody.insertAdjacentHTML("beforeend", row);
      });
    } catch (error) {
      console.error("錯誤:", error);
      productListBody.innerHTML = `<tr><td colspan="5">載入失敗...</td></tr>`;
    }
  }

  async function openEditModal(productId) {
    try {
      // 注意：取得單一商品是公開的，不需要 token
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
      if (!response.ok) throw new Error("無法獲取商品資料");
      const product = await response.json();
      editProductId.value = product.id;
      document.getElementById("edit-category").value = product.category;
      document.getElementById("edit-title").value = product.title;
      document.getElementById("edit-price").value = product.price;
      document.getElementById("edit-imageUrl").value = product.imageUrl;
      editModal.style.display = "block";
    } catch (error) {
      console.error("錯誤:", error);
      alert("無法載入商品資料進行編輯。");
    }
  }

  function closeEditModal() {
    editModal.style.display = "none";
  }

  addProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newProduct = {
      category: document.getElementById("category").value,
      title: document.getElementById("title").value,
      price: parseInt(document.getElementById("price").value, 10),
      imageUrl: document.getElementById("imageUrl").value,
    };
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: authHeaders, // <--- 使用帶有 token 的 headers
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
              headers: authHeaders, // <--- 使用帶有 token 的 headers
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

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const productId = editProductId.value;
    const updatedProduct = {
      category: document.getElementById("edit-category").value,
      title: document.getElementById("edit-title").value,
      price: parseInt(document.getElementById("edit-price").value, 10),
      imageUrl: document.getElementById("edit-imageUrl").value,
    };
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/products/${productId}`,
        {
          method: "PUT",
          headers: authHeaders, // <--- 使用帶有 token 的 headers
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

  closeModalBtn.addEventListener("click", closeEditModal);
  window.addEventListener("click", (event) => {
    if (event.target == editModal) {
      closeEditModal();
    }
  });

  fetchAndRenderProducts();
});
