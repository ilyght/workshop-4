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

  

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
