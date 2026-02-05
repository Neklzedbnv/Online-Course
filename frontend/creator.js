const $ = (id) => document.getElementById(id);

$("connectBtn").onclick = async () => {
  try {
    await connectWallet();
    await setWalletUI();
    $("out").textContent = "Connected ✅";
  } catch (e) {
    $("out").textContent = e?.message || "Connect failed";
  }
};

$("completeBtn").onclick = async () => {
  try {
    if (!platform) throw new Error("Connect wallet first");
    const courseId = BigInt($("courseId").value.trim());
    const student = $("student").value.trim();
    const tx = await platform.markCompleted(courseId, student);
    $("out").textContent = `Marking completed... tx: ${tx.hash}`;
    await tx.wait();
    $("out").textContent = `Completed ✅ tx: ${tx.hash}`;
  } catch (e) {
    $("out").textContent = e?.shortMessage || e?.message || "Failed";
  }
};

$("claimBtn").onclick = async () => {
  try {
    if (!platform) throw new Error("Connect wallet first");
    const courseId = BigInt($("courseId").value.trim());
    const tx = await platform.claimReward(courseId);
    $("out").textContent = `Claiming... tx: ${tx.hash}`;
    await tx.wait();
    await setWalletUI();
    $("out").textContent = `Claimed ✅ tx: ${tx.hash}`;
  } catch (e) {
    $("out").textContent = e?.shortMessage || e?.message || "Failed";
  }
};

$("withdrawBtn").onclick = async () => {
  try {
    if (!platform) throw new Error("Connect wallet first");
    const courseId = BigInt($("courseId").value.trim());
    const tx = await platform.creatorWithdraw(courseId);
    $("out").textContent = `Withdrawing... tx: ${tx.hash}`;
    await tx.wait();
    await setWalletUI();
    $("out").textContent = `Withdrawn ✅ tx: ${tx.hash}`;
  } catch (e) {
    $("out").textContent = e?.shortMessage || e?.message || "Failed";
  }
};
