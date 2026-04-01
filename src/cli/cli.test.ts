import { decomposeKeys } from "@bemedev/decompose";
import { run } from "cmd-ts";
import editJson from "edit-json-file";
import { safeParse } from "valibot";
import { CODEBASE_FILE } from "../constants";
import { CodebaseAnalysisSchema } from "../schemas";
import { cli } from "./cli";

describe("Test the .codebase analysis module", () => {
  let json: any;
  let keys: string[] = [];
  test("#00 => Generate the .json file", () => run(cli, []));

  test("#01 => Read the .json file", () => {
    console.warn("Reading JSON file...");
    json = editJson(CODEBASE_FILE).read();
    console.warn("File read successfully!");
  });

  test(`#02 => the JSON file is defined`, () => {
    expect(json).toBeDefined();
  });

  test("#03 => Get the keys of the .json file", () => {
    keys = decomposeKeys.low(json);
  });

  test("#04 => the keys are defined", () => {
    expect(keys).toBeDefined();
  });

  test("#05 => the keys are not empty", () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  describe("#06 => the keys are correct", () => {
    test("STATS.files", () => {
      expect(keys).toContain("STATS.files");
    });

    test("STATS.imports", () => {
      expect(keys).toContain("STATS.imports");
    });

    test("STATS.exports", () => {
      expect(keys).toContain("STATS.exports");
    });

    test("CODEBASE_ANALYSIS", () => {
      expect(keys).toContain("CODEBASE_ANALYSIS");
    });
  });

  test("#07 => the JSON file respects the format", () => {
    const actual = safeParse(
      CodebaseAnalysisSchema,
      json.CODEBASE_ANALYSIS,
    ).success;

    expect(actual).toBe(true);
  });
});
