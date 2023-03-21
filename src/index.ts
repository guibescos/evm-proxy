import express from "express";
import axios, { AxiosError } from "axios";
import bodyParser from "body-parser";
import ganache from "ganache";
import {ethers} from "ethers"


const UNDERLYING_URL = "https://rpc.ankr.com/eth";
const FORK_PORT_NUMBER = "9545";

const app = express();
const port = 8080;

const GANACHE_CONFIG = {
  chain: {
    chainId: 1,
  },
  fork: {
    url: UNDERLYING_URL,
  },
  miner: {
    blockTime: 1
  },
  logging: {
    logger: {
      log: () => {}
    }
  },
  port : FORK_PORT_NUMBER,
  rpc : UNDERLYING_URL
}

// @ts-ignore
async function estimateGas(tx : ethers.ethers.Transaction) : Promise<string>{
  const options = Object.assign({}, GANACHE_CONFIG);
  const provider = new ethers.providers.Web3Provider(ganache.provider(options) as any);
  return await provider.perform("estimateGas", {transaction : tx})
}
// Use body-parser to parse JSON request bodies
app.use(bodyParser.json());

// Handle POST requests to /
app.post("/", async (req, res) => {
  try {
    if (req.method == "POST") {
      const { id, method, params } = req.body;
      console.log(method);
      if (method == "eth_estimateGas"){
        const tx = params[0];
        const cost = await estimateGas(tx);

        const SUCESS = 200;
        const data = { jsonrpc: '2.0', id, result: cost };
        res.status(SUCESS).send(data)
        
      }
      else {
      // default fallback is to proxy the data to the underlying rpc node.
      const destUrl = `${UNDERLYING_URL}${req.path}`;
      const response = await axios.post(destUrl, req.body);

      res.status(response.status).send(response.data);
      }
    } else {
      res.status(405).send(`Unsupported method: ${req.method} is not allowed`);
    }
  } catch (error) {
    console.log(error)
    // Handle errors and return an error response
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      res.status(axiosError.response?.status || 500).send(axiosError.message);
    } else {
      res.status(500).send(error);
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Proxy server listening at http://localhost:${port}`);
});
