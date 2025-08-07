// 取得頁面上的元素
const bankAccountEl = document.getElementById("bank-account");
const copyBtn = document.getElementById("copy-btn");
const confirmationInput = document.getElementById("confirmation-input");
const submitBtn = document.getElementById("submit-btn");

// --- 功能1: 一鍵複製銀行帳號 ---
copyBtn.addEventListener("click", function () {
  // 使用瀏覽器的 Clipboard API
  navigator.clipboard.writeText(bankAccountEl.innerText).then(
    function () {
      // 複製成功後的回饋
      copyBtn.innerText = "已複製!";
      setTimeout(function () {
        copyBtn.innerText = "一鍵複製";
      }, 2000); // 2秒後恢復原狀
    },
    function (err) {
      // 複製失敗時的處理 (較少見)
      alert("複製失敗: " + err);
    }
  );
});

// --- 功能2: 驗證「我了解」以啟用按鈕 ---
confirmationInput.addEventListener("input", function () {
  // 檢查輸入框的值是否完全等於 "我了解"
  if (confirmationInput.value.trim() === "我了解") {
    submitBtn.disabled = false; // 啟用按鈕
    submitBtn.classList.remove("disabled");
    submitBtn.classList.add("enabled");
  } else {
    submitBtn.disabled = true; // 禁用按鈕
    submitBtn.classList.remove("enabled");
    submitBtn.classList.add("disabled");
  }
});

// --- 功能3: 模擬點擊下單按鈕 ---
submitBtn.addEventListener("click", function (event) {
  // 由於我們還沒有後端，這裡先用 alert 模擬提交
  // event.preventDefault() 可以防止表單真的被送出 (如果它在 <form> 標籤裡)

  const paopaohuId = document.getElementById("paopaohu-id").value;
  const lastFive = document.getElementById("last-five").value;

  if (!paopaohuId || !lastFive) {
    alert("請務必填寫跑跑虎會員編號與匯款末五碼！");
    return; // 停止執行
  }

  alert("訂單已送出！\n(此為前端範例，尚未連接後端資料庫)");

  // 在真實情境中，這裡會是呼叫後端 API 的程式碼
});
