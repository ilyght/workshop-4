import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";
import {exportPrvKey, generateRsaKeyPair} from "../crypto";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

type Payload = {
  result: string | null; // string is the base64 version of the private key
};
let nodeRegistry: Node[] = [];

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // TODO implement the status route
  _registry.get("/status", (req, res) => {
    res.send("live");
  });
  let getNodeRegistryBody: GetNodeRegistryBody = { nodes: [] };


  _registry.post("/registerNode", (req, res) => {
    const { nodeId, pubKey } = req.body as RegisterNodeBody;

    // Check if the node already exists in the registry
    const existingNode = nodeRegistry.find((node) => node.nodeId === nodeId);
    if (existingNode) {
      return res.status(400).json({ error: "Node already registered" });
    }

    // Add the node to the registry
    const newNode: Node = { nodeId, pubKey };
    nodeRegistry.push(newNode);

    // Respond with success message
    return res.status(200).json({ message: "Node registered successfully", node: newNode });
  });


  _registry.get("/getNodeRegistry", (req: Request, res: Response<GetNodeRegistryBody>) => {
    const response: GetNodeRegistryBody = {
      nodes: nodeRegistry
    };
    res.json(response);
  });



  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}