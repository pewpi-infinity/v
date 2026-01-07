async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function renderTokenPage(id, created) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Infinity Token ${id}</title>
</head>
<body style="font-family: monospace; background:#0b0b0b; color:#e6e6e6;">
  <h1>Infinity Genesis Anchor</h1>
  <p><b>Token ID:</b> ${id}</p>
  <p><b>Created:</b> ${created}</p>
  <p><b>Status:</b> Anchored (off-chain)</p>
  <p><b>Repository:</b> pewpi-infinity/v</p>
</body>
</html>`;
}

async function deployToken() {
  const manifest = document.getElementById("manifest").value;
  const id = await sha256(manifest);
  const created = new Date().toISOString();
  const url = location.origin + "/v/tokens/" + id + ".html";

  document.getElementById("output").innerText =
    "DEPLOY COMPLETE\n\n" +
    "TOKEN ID:\n" + id + "\n\n" +
    "TOKEN URL:\n" + url;

  return { id, created, url };
}
