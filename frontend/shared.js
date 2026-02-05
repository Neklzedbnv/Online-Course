const PLATFORM_ADDRESS = "0x6f1D7b91279e9CC2732937feC1857D8867E250a3";
const TOKEN_ADDRESS = "0x6b8732ab511c3Da0f808d4D5d60fEAa9609df8c2";

const PLATFORM_ABI = [
  "function roleOf(address) view returns (uint8)",
  "function registerStudent()",
  "function registerCreator()",
  "function createCourse(string,string,uint8,uint256) returns (uint256)",
  "function enroll(uint256) payable",
  "function markCompleted(uint256,address)",
  "function claimReward(uint256)",
  "function creatorWithdraw(uint256)",
  "function nextCourseId() view returns (uint256)",
  "function courses(uint256) view returns (uint256 id, address creator, string category, string title, uint8 tier, uint256 priceWei, uint256 totalPaid, uint256 withdrawn, bool exists)"
];

const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

let provider, signer, platform, tokenRead;
let tokenDecimals = 18;
let tokenSymbol = "";
let currentRole = 0n;

const el = (id) => document.getElementById(id);

const setText = (id, value) => {
  const node = el(id);
  if (node) node.textContent = value;
};

function tierLabel(t) {
  if (t === 0) return "Basic";
  if (t === 1) return "Premium";
  return "VIP";
}

function openRegModal(msg) {
  const modal = el("regModal");
  const text = el("regModalText");
  if (text) text.textContent = msg || "You must register once to use the platform.";
  if (modal) modal.style.display = "flex";
}

function closeRegModal() {
  const modal = el("regModal");
  if (modal) modal.style.display = "none";
}

async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask not found");

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  const net = await provider.getNetwork();
  if (net.chainId !== 11155111n) throw new Error("Switch MetaMask to Sepolia");

  signer = await provider.getSigner();
  platform = new ethers.Contract(PLATFORM_ADDRESS, PLATFORM_ABI, signer);

  tokenRead = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
  tokenDecimals = await tokenRead.decimals();
  tokenSymbol = await tokenRead.symbol();
}

async function walletInfo() {
  const addr = await signer.getAddress();
  const net = await provider.getNetwork();
  const ethBal = await provider.getBalance(addr);
  const tokBal = await tokenRead.balanceOf(addr);

  return {
    addr,
    net: `${net.name} (${net.chainId})`,
    eth: ethers.formatEther(ethBal),
    tok: `${ethers.formatUnits(tokBal, tokenDecimals)} ${tokenSymbol}`
  };
}

async function setWalletUI() {
  if (!provider || !signer || !tokenRead) return;
  const w = await walletInfo();
  setText("addr", w.addr);
  setText("net", w.net);
  setText("ethBal", w.eth);
  setText("tokBal", w.tok);
}

async function checkAndPromptRegistration() {
  if (!platform || !signer) return;

  const addr = await signer.getAddress();
  currentRole = await platform.roleOf(addr);

  if (currentRole === 0n) openRegModal();
  else closeRegModal();
}

function wireRegModalButtons() {
  const closeBtn = el("regCloseBtn");
  if (closeBtn) closeBtn.onclick = closeRegModal;

  const overlay = el("regModal");
  if (overlay) overlay.onclick = (e) => { if (e.target === overlay) closeRegModal(); };

  const studentBtn = el("regStudentBtn");
  if (studentBtn) {
    studentBtn.onclick = async () => {
      try {
        if (!platform) throw new Error("Connect wallet first");
        const tx = await platform.registerStudent();
        setText("out", `Registering Student... ${tx.hash}`);
        await tx.wait();
        setText("out", "Registered as Student ✅");
        await checkAndPromptRegistration();
        await setWalletUI();
      } catch (e) {
        setText("out", e?.shortMessage || e?.message || "Failed");
      }
    };
  }

  const creatorBtn = el("regCreatorBtn");
  if (creatorBtn) {
    creatorBtn.onclick = async () => {
      try {
        if (!platform) throw new Error("Connect wallet first");
        const tx = await platform.registerCreator();
        setText("out", `Registering Creator... ${tx.hash}`);
        await tx.wait();
        setText("out", "Registered as Creator ✅");
        await checkAndPromptRegistration();
        await setWalletUI();
      } catch (e) {
        setText("out", e?.shortMessage || e?.message || "Failed");
      }
    };
  }
}

function wireConnectButton() {
  const btn = el("connectBtn");
  if (!btn) return;

  btn.onclick = async () => {
    try {
      await connectWallet();
      await setWalletUI();
      await checkAndPromptRegistration();
      setText("out", "Connected ✅");
      document.dispatchEvent(new Event("wallet:connected"));
    } catch (e) {
      setText("out", e?.message || "Connect failed");
    }
  };
}

function wireMetaMaskEvents() {
  if (!window.ethereum) return;

  window.ethereum.on("accountsChanged", async () => {
    if (provider) signer = await provider.getSigner();
    if (signer) platform = new ethers.Contract(PLATFORM_ADDRESS, PLATFORM_ABI, signer);
    await setWalletUI();
    await checkAndPromptRegistration();
    document.dispatchEvent(new Event("wallet:changed"));
  });

  window.ethereum.on("chainChanged", () => window.location.reload());
}

window.shared = {
  connectWallet,
  setWalletUI,
  checkAndPromptRegistration,
  tierLabel,
  getPlatform: () => platform,
  getRole: () => currentRole
};

window.addEventListener("DOMContentLoaded", () => {
  wireRegModalButtons();
  wireConnectButton();
  wireMetaMaskEvents();
  closeRegModal();
  const createBtn = el("createBtn");
  if (createBtn) createBtn.disabled = true;
});
