import bcrypt from "bcrypt";

const plainPassword = "randy1007"; // 您指定的密碼
const saltRounds = 10; // 加密的複雜度，10 是個安全且常見的選擇

bcrypt.hash(plainPassword, saltRounds, function (err, hash) {
  if (err) {
    console.error("加密時發生錯誤:", err);
    return;
  }
  console.log("您的明碼是:", plainPassword);
  console.log("加密後的雜湊值是:");
  console.log(hash);
  console.log("\n請將這個雜湊值複製到您的 db.json 檔案中！");
});
