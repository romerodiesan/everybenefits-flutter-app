import { config } from "./config.mjs";
import { commitInBatches, db, log } from "./admin.mjs";

/**
 * Build org tree:
 *   root (organization)
 *   → divisions
 *   → regions
 *   → agencies (target ~SEED_AGENCIES)
 *
 * Returns { rootId, agencyIds: string[], allNodeIds: string[] }
 */
export async function seedOrgs() {
  log("orgs", "building hierarchy");
  const firestore = db();
  const ops = [];
  const allNodeIds = [];
  const agencyIds = [];

  const rootId = "root";
  ops.push({
    type: "set",
    ref: firestore.doc(`orgNodes/${rootId}`),
    data: {
      id: rootId,
      name: "Every Benefits",
      type: "organization",
      depth: 1,
      parentId: null,
      path: [rootId],
      managerUids: [],
      active: true,
    },
  });
  allNodeIds.push(rootId);

  const divisionIds = [];
  for (let d = 0; d < config.divisions; d++) {
    const id = `div-${String(d).padStart(2, "0")}`;
    divisionIds.push(id);
    allNodeIds.push(id);
    ops.push({
      type: "set",
      ref: firestore.doc(`orgNodes/${id}`),
      data: {
        id,
        name: `Division ${d + 1}`,
        type: "division",
        depth: 2,
        parentId: rootId,
        path: [rootId, id],
        managerUids: [],
        active: true,
      },
    });
  }

  const regionIds = [];
  for (let r = 0; r < config.regions; r++) {
    const parent = divisionIds[r % divisionIds.length];
    const id = `reg-${String(r).padStart(3, "0")}`;
    regionIds.push(id);
    allNodeIds.push(id);
    ops.push({
      type: "set",
      ref: firestore.doc(`orgNodes/${id}`),
      data: {
        id,
        name: `Region ${r + 1}`,
        type: "region",
        depth: 3,
        parentId: parent,
        path: [rootId, parent, id],
        managerUids: [],
        active: true,
      },
    });
  }

  for (let a = 0; a < config.agencies; a++) {
    const parent = regionIds[a % regionIds.length];
    const div = divisionIds[a % divisionIds.length];
    const id = `agency-${String(a).padStart(4, "0")}`;
    agencyIds.push(id);
    allNodeIds.push(id);
    ops.push({
      type: "set",
      ref: firestore.doc(`orgNodes/${id}`),
      data: {
        id,
        name: `Agency ${a + 1}`,
        type: "agency",
        depth: 4,
        parentId: parent,
        path: [rootId, div, parent, id],
        managerUids: [],
        active: a % 47 !== 0, // sprinkle a few inactive
      },
    });
  }

  await commitInBatches(ops);
  log(
    "orgs",
    `${allNodeIds.length} nodes (${agencyIds.length} agencies, ${regionIds.length} regions, ${divisionIds.length} divisions)`,
  );
  return { rootId, agencyIds, allNodeIds };
}
