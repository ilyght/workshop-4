import bodyParser from "body-parser";
import express from "express";
import {BASE_ONION_ROUTER_PORT, BASE_USER_PORT, REGISTRY_PORT} from "../config";
import {createRandomSymmetricKey, exportSymKey, importSymKey, rsaEncrypt, symEncrypt} from "../crypto";
import {GetNodeRegistryBody, Node} from "../registry/registry";


let lastReceivedMessage: string | null = null;
let lastSentMessage: string | null = null;
let lastCircuit: Node[] = [];

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // TODO implement the status route
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  //2
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  _user.post("/message", (req, res) => {
    lastReceivedMessage = req.body.message;
    res.status(200).send("success");
  });


  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;
    let circuit: Node[] = [];

    // on recupere les nodes présents dans le registre
    const nodes = await fetch(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`)
        .then((res) => res.json())
        .then((body: any) => body.nodes);
    //on en choisit 3 (cf illustrations dans le cours => 3 nodes)
    while (circuit.length < 3) {
      const randomIndex = Math.floor(Math.random() * nodes.length);
      if (!circuit.includes(nodes[randomIndex])) {
        circuit.push(nodes[randomIndex]);
      }
    }
    // on a donc notre circuit de node

    lastSentMessage = message;
    let messageToSend = lastSentMessage;
    let destination = `${BASE_USER_PORT + destinationUserId}`.padStart(10, "0");

    for (let i = 0; i < circuit.length; i++) {
      const node = circuit[i];
      // chaque node a son duo de clés différents avec laquelle on encode le message et la destination
      const symKey = await createRandomSymmetricKey();
      const messageToEncrypt = `${destination + messageToSend}`;
      destination = `${BASE_ONION_ROUTER_PORT + node.nodeId}`.padStart(10, "0");
      const encryptedMessage = await symEncrypt(symKey, messageToEncrypt);
      const encryptedSymKey = await rsaEncrypt(await exportSymKey(symKey), node.pubKey);
      messageToSend = encryptedSymKey + encryptedMessage;
    }
    // on inverse le circuit
    circuit.reverse();

    // envoi du message encrypté au premier node
    const entryNode = circuit[0];
    lastCircuit = circuit;
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + entryNode.nodeId}/message`, {
      method: "POST",
      body: JSON.stringify({ message: messageToSend }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    res.send("success");
  });

  // pour recuperer le ids des nodes dans le circuit
  _user.get("/getLastCircuit", (req, res) => {
    res.json({ result: lastCircuit.map((node) => node.nodeId) });
  });


  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
