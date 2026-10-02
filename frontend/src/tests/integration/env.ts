import path from "path"
import dotenv from "dotenv"


dotenv.config({
  path: path.resolve(
    process.cwd(),
    ".env.integration",
  ),
})


function requireEnv(
  name: string,
): string {
  const value =
    process.env[name]

  if (!value) {
    throw new Error(
      `Missing required integration env: ${name}`,
    )
  }

  return value
}


export const integrationUsers = {
  operator: {
    username: requireEnv(
      "TEST_OPERATOR_USERNAME",
    ),
    password: requireEnv(
      "TEST_OPERATOR_PASSWORD",
    ),
  },

  worker: {
    username: requireEnv(
      "TEST_WORKER_USERNAME",
    ),
    password: requireEnv(
      "TEST_WORKER_PASSWORD",
    ),
  },

  liveWorker: {
    username: requireEnv(
      "TEST_LIVE_WORKER_USERNAME",
    ),
    password: requireEnv(
      "TEST_LIVE_WORKER_PASSWORD",
    ),
  },

  researcher: {
    username: requireEnv(
      "TEST_RESEARCHER_USERNAME",
    ),
    password: requireEnv(
      "TEST_RESEARCHER_PASSWORD",
    ),
  },
}


export const integrationDevices = {
  deterministic: requireEnv(
    "TEST_INTEGRATION_DEVICE_CODE",
  ),

  live: requireEnv(
    "TEST_LIVE_DEVICE_CODE",
  ),
}