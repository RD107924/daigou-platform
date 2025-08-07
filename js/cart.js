// --- 購物車公用函式 ---

// 從 localStorage 獲取購物車資料
function getCart() {
  const cartJson = localStorage.getItem("shoppingCart");
  return cartJson ? JSON.parse(cartJson) : [];
}

// 將購物車資料儲存到 localStorage
function saveCart(cart) {
  localStorage.setItem("shoppingCart", JSON.stringify(cart));
}

// 加入商品到購物車
function addToCart(productId, productTitle, productPrice, serviceFee) {
  const cart = getCart();
  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    // 如果有，數量 +1
    existingItem.quantity += 1;
  } else {
    // 如果沒有，新增一筆商品
    cart.push({
      id: productId,
      title: productTitle,
      price: productPrice,
      serviceFee: serviceFee || 0, // 新增服務費欄位
      quantity: 1,
      notes: "", // 新增備註欄位
    });
  }
  saveCart(cart);
}

// 更新購物車中商品的數量
function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find((item) => item.id === productId);
  if (item) {
    if (quantity > 0) {
      item.quantity = quantity;
    } else {
      // 如果數量小於等於0，則移除該商品
      removeFromCart(productId);
      return; // 直接返回，因為 saveCart 會在 removeFromCart 中被呼叫
    }
  }
  saveCart(cart);
}

// 更新購物車中商品的備註
function updateCartNotes(productId, notes) {
  const cart = getCart();
  const item = cart.find((item) => item.id === productId);
  if (item) {
    item.notes = notes;
  }
  saveCart(cart);
}

// 從購物車移除商品
function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter((item) => item.id !== productId);
  saveCart(cart);
}
