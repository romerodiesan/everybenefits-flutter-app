import { describe, expect, it } from "vitest";
import { parsePlaceAddressComponents } from "./load-places";

describe("parsePlaceAddressComponents", () => {
  it("fills a standard US street address", () => {
    expect(
      parsePlaceAddressComponents([
        { long_name: "1600", short_name: "1600", types: ["street_number"] },
        {
          long_name: "Pennsylvania Avenue Northwest",
          short_name: "Pennsylvania Ave NW",
          types: ["route"],
        },
        { long_name: "Washington", short_name: "Washington", types: ["locality"] },
        {
          long_name: "District of Columbia",
          short_name: "DC",
          types: ["administrative_area_level_1"],
        },
        { long_name: "20500", short_name: "20500", types: ["postal_code"] },
      ]),
    ).toEqual({
      street: "1600 Pennsylvania Ave NW",
      city: "Washington",
      state: "DC",
      zip: "20500",
    });
  });

  it("accepts the new Places camelCase fields and missing street number", () => {
    expect(
      parsePlaceAddressComponents([
        {
          longText: "Broadway",
          shortText: "Broadway",
          types: ["route"],
        },
        {
          longText: "Manhattan",
          shortText: "Manhattan",
          types: ["sublocality_level_1", "sublocality"],
        },
        {
          longText: "New York",
          shortText: "NY",
          types: ["administrative_area_level_1"],
        },
        { longText: "10007", shortText: "10007", types: ["postal_code"] },
      ]),
    ).toEqual({
      street: "Broadway",
      city: "Manhattan",
      state: "NY",
      zip: "10007",
    });
  });

  it("still returns city/state when ZIP is missing so the form can be completed", () => {
    expect(
      parsePlaceAddressComponents([
        { long_name: "10", types: ["street_number"] },
        { short_name: "Main St", types: ["route"] },
        { long_name: "Miami", types: ["locality"] },
        { short_name: "FL", types: ["administrative_area_level_1"] },
      ]),
    ).toEqual({
      street: "10 Main St",
      city: "Miami",
      state: "FL",
      zip: "",
    });
  });
});
