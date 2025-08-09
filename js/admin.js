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
  const API_BASE_URL = "https://daigou-platform-api.onrender.com";
  const productListBody = document.getElementById("product-list-body");
  const saveSortBtn = document.getElementById("save-sort-btn");
  const addProductForm = document.getElementById("add-product-form");
  const editModal = document.getElementById("edit-modal");
  const editForm = document.getElementById("edit-product-form");
  const closeModalBtn = document.querySelector(".modal-close-btn");
  const editProductId = document.getElementById("edit-product-id");
  const categorySelect = document.getElementById("category");
  const editCategorySelect = document.getElementById("edit-category");
  let sortableInstance = null;
  let availableCategories = [];
  async function fetchAndPopulateCategories() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      if (!response.ok) throw new Error("無法獲取分類");
      availableCategories = await response.json();
      categorySelect.innerHTML = '<option value="">請選擇分類</option>';
      editCategorySelect.innerHTML = '<option value="">請選擇分類</option>';
      availableCategories.forEach((cat) => {
        categorySelect.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
        editCategorySelect.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
      });
    } catch (error) {
      console.error(error);
      categorySelect.innerHTML = '<option value="">無法載入分類</option>';
      editCategorySelect.innerHTML = '<option value="">無法載入分類</option>';
    }
  }
  async function fetchAndRenderProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`);
      if (!response.ok) throw new Error("無法獲取商品列表");
      const products = await response.json();
      productListBody.innerHTML = "";
      products.forEach((product) => {
        const serviceFee = product.serviceFee || 0;
        const row = `<tr data-id="${product.id}"><td data-label="ID">${product.id}</td><td data-label="分類">${product.category}</td><td data-label="名稱">${product.title}</td><td data-label="最終售價">$${product.price}</td><td data-label="服務費">$${serviceFee}</td><td data-label="操作"><button class="btn-small btn-secondary btn-edit" data-id="${product.id}">編輯</button><button class="btn-small btn-danger btn-delete" data-id="${product.id}">刪除</button></td></tr>`;
        productListBody.insertAdjacentHTML("beforeend", row);
      });
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
  function initializeSortable() {
    if (!productListBody) return;
    sortableInstance = new Sortable(productListBody, {
      animation: 150,
      ghostClass: "sortable-ghost",
      onEnd: () => {
        saveSortBtn.style.display = "inline-block";
      },
    });
  }
  saveSortBtn.addEventListener("click", async () => {
    if (!sortableInstance) return;
    const orderedIds = sortableInstance.toArray();
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/order`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ orderedIds }),
      });
      if (!response.ok) throw new Error("儲存排序失敗");
      alert("商品排序已成功儲存！");
      saveSortBtn.style.display = "none";
    } catch (error) {
      console.error("錯誤:", error);
      alert("儲存排序時發生錯誤。");
    }
  });
  async function openEditModal(productId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
      if (!response.ok) throw new Error("無法獲取商品資料");
      const product = await response.json();
      editProductId.value = product.id;
      editCategorySelect.value = product.category;
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
  productListBody.addEventListener("click", async (event) => {
    const target = event.target;
    const productId = target.dataset.id;
    if (target.classList.contains("btn-delete")) {
      if (confirm(`您確定要刪除 ID 為 ${productId} 的商品嗎？`)) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/products/${productId}`,
            { method: "DELETE", headers: authHeaders }
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
  closeModalBtn.addEventListener("click", closeEditModal);
  window.addEventListener("click", (event) => {
    if (event.target == editModal) closeEditModal();
  });

  async function initializePage() {
    await fetchAndPopulateCategories();
    await fetchAndRenderProducts();
  }
  initializePage();
});
