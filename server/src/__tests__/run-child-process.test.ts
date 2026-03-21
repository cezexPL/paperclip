import { describe, expect, it } from "vitest";
import { runChildProcess } from "@paperclipai/adapter-utils/server-utils";

describe("runChildProcess", () => {
  it(
    "forces SIGKILL after the grace period when the child ignores SIGTERM",
    async () => {
      const result = await runChildProcess(
        "timeout-escalation-test",
        process.execPath,
        [
          "-e",
          [
            "process.on('SIGTERM', () => {});",
            "console.log('ready');",
            "setInterval(() => {}, 1000);",
          ].join(" "),
        ],
        {
          cwd: process.cwd(),
          env: {},
          timeoutSec: 1,
          graceSec: 1,
          onLog: async () => {},
        },
      );

      expect(result.timedOut).toBe(true);
      expect(result.signal).toBe("SIGKILL");
      expect(result.stdout).toContain("ready");
    },
    10_000,
  );
});
