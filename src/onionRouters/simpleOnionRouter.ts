import bodyParser from "body-parser";
import express from "express";
import {BASE_ONION_ROUTER_PORT, REGISTRY_PORT} from "../config";
import {Node} from "../registry/registry";
import {exportPrvKey, exportPubKey, generateRsaKeyPair, importPrvKey, rsaDecrypt, symDecrypt} from "../crypto";

let lastReceivedEncryptedMessage: string | null = null;
let lastReceivedDecryptedMessage: string | null = null;
let lastMessageDestinationPort: number | null = null;



export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());


  let rsaKeyPair = await generateRsaKeyPair();
  let pubKey = await exportPubKey(rsaKeyPair.publicKey);
  let privateKey = await exportPrvKey(rsaKeyPair.privateKey);

  let node: Node = { nodeId: nodeId, pubKey: pubKey };
  let nodeRegistry: Node[] = [];
  // TODO implement the status route
  // TODO implement the status route
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  // 2.1
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage});
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage});
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestinationPort });
  });

  const response = await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
    method: "POST",
    body: JSON.stringify({
      nodeId,
      pubKey: pubKey,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  console.log(await response.json());

  // /getPrivateKey
  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: privateKey });
  });

  onionRouter.post("/message", async (req, res) => {
    const layer = req.body.message;
    const encryptedSymKey = layer.slice(0, 344);
    const symKey = privateKey ? await rsaDecrypt(encryptedSymKey, await importPrvKey(privateKey)) : null;
    const encryptedMessage = layer.slice(344) as string;
    const message = symKey ? await symDecrypt(symKey, encryptedMessage) : null;
    lastReceivedEncryptedMessage = layer;
    lastReceivedDecryptedMessage = message ? message.slice(10) : null;
    lastMessageDestinationPort = message ? parseInt(message.slice(0, 10), 10) : null;
    await fetch(`http://localhost:${lastMessageDestinationPort}/message`, {
      method: "POST",
      body: JSON.stringify({ message: lastReceivedDecryptedMessage }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    res.send("success");
  });


  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });



  return server;
}
