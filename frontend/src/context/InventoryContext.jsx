import { createContext, useEffect, useMemo, useState } from "react";

export const InventoryContext = createContext();

const STORAGE_KEY = "inventory_saas_v3";

const nowISO = () => new Date().toISOString();
const yearNow = () => new Date().getFullYear();

function safeParse(json, fallback) {
  try {
    const x = JSON.parse(json);
    return x ?? fallback;
  } catch {
    return fallback;
  }
}

function pad(num, size = 4) {
  const s = String(num);
  return s.length >= size ? s : "0".repeat(size - s.length) + s;
}

// короткие коды для инвентарного номера
function code3(s) {
  if (!s) return "UNK";
  return String(s)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
}

function code4(s) {
  if (!s) return "UNKN";
  return String(s)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
}

/**
 * National/SaaS inv number:
 * INV-YYYY-CC-REG-CITY-ORG-BLD-ROOM-0001
 * Example:
 * INV-2026-KG-CHU-BIS-SCH1-A-101-0001
 */
function generateInvNumber({ countryCode, region, city, organization, building, room, seq }) {
  return `INV-${yearNow()}-${code3(countryCode)}-${code3(region)}-${code3(city)}-${code4(
    organization
  )}-${String(building).toUpperCase()}-${String(room)}-${pad(seq, 4)}`;
}

// ===== demo справочники (потом заменим на API) =====
const TENANTS = [
  {
    id: "KG",
    name: "Kyrgyzstan",
    countryCode: "KG",
    regions: [
      {
        name: "Chui",
        cities: [
          {
            name: "Bishkek",
            organizations: ["SCH1", "SCH12", "COLL3"],
            buildings: ["A", "B"],
            rooms: [
              { id: 1, name: "101", building: "A" },
              { id: 2, name: "102", building: "A" },
              { id: 3, name: "201", building: "B" },
              { id: 4, name: "202", building: "B" },
            ],
          },
        ],
      },
      {
        name: "Osh",
        cities: [
          {
            name: "Osh",
            organizations: ["SCH7", "LYC2"],
            buildings: ["A"],
            rooms: [
              { id: 11, name: "11", building: "A" },
              { id: 12, name: "12", building: "A" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "KZ",
    name: "Kazakhstan",
    countryCode: "KZ",
    regions: [
      {
        name: "Almaty",
        cities: [
          {
            name: "Almaty",
            organizations: ["SCH5", "UNI1"],
            buildings: ["A", "C"],
            rooms: [
              { id: 21, name: "A-10", building: "A" },
              { id: 22, name: "A-11", building: "A" },
              { id: 23, name: "C-20", building: "C" },
            ],
          },
        ],
      },
    ],
  },
];

// справочники предметов
const FURNITURE_TYPES = ["Desk", "Chair", "Table", "Cabinet"];
const CONDITIONS = ["Excellent", "Good", "Fair", "Needs Repair"];
const STATUSES = ["Active", "In Repair", "Written Off", "Archived"];

export const InventoryProvider = ({ children }) => {
  // ===== store =====
  const defaultStore = useMemo(() => {
    const tenantId = "KG";
    const tenant = TENANTS.find((t) => t.id === tenantId);
    const region = tenant.regions[0].name;
    const city = tenant.regions[0].cities[0].name;
    const organization = tenant.regions[0].cities[0].organizations[0];
    const building = tenant.regions[0].cities[0].buildings[0];
    const room = tenant.regions[0].cities[0].rooms[0].name;

    const seq = 1;

    return {
      version: 3,
      activeTenantId: tenantId,
      seqByTenant: { [tenantId]: seq },
      furnitureByTenant: {
        [tenantId]: [
          {
            id: 1,
            invNumber: generateInvNumber({
              countryCode: tenant.countryCode,
              region,
              city,
              organization,
              building,
              room,
              seq,
            }),

            name: "Student Desk",
            price: 0,
            type: "Desk",
            condition: "Good",
            status: "Active",
            photo: null,

            countryCode: tenant.countryCode,
            region,
            city,
            organization,
            building,
            room,

            history: [
              {
                at: nowISO(),
                action: "CREATE",
                from: null,
                to: { region, city, organization, building, room },
                note: "Initial placement",
              },
            ],
          },
        ],
      },
    };
  }, []);

  const [store, setStore] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? safeParse(saved, null) : null;
    if (parsed && parsed.version === 3) return parsed;
    return defaultStore;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  // ===== tenant =====
  const tenants = useMemo(() => TENANTS, []);
  const activeTenantId = store.activeTenantId;
  const activeTenant = tenants.find((t) => t.id === activeTenantId) || tenants[0];

  const setActiveTenantId = (tenantId) => {
    setStore((prev) => ({
      ...prev,
      activeTenantId: tenantId,
      // если впервые переключили на новый tenant — создадим пустую коллекцию
      seqByTenant: {
        ...prev.seqByTenant,
        [tenantId]: prev.seqByTenant?.[tenantId] ?? 0,
      },
      furnitureByTenant: {
        ...prev.furnitureByTenant,
        [tenantId]: prev.furnitureByTenant?.[tenantId] ?? [],
      },
    }));
  };

  const furniture = store.furnitureByTenant?.[activeTenantId] ?? [];
  const seq = store.seqByTenant?.[activeTenantId] ?? 0;

  // ===== динамические справочники по стране =====
  const regions = useMemo(() => activeTenant.regions.map((r) => r.name), [activeTenant]);
  const getCitiesByRegion = (regionName) => {
    const r = activeTenant.regions.find((x) => x.name === regionName);
    return r ? r.cities.map((c) => c.name) : [];
  };
  const getOrgsByRegionCity = (regionName, cityName) => {
    const r = activeTenant.regions.find((x) => x.name === regionName);
    const c = r?.cities.find((x) => x.name === cityName);
    return c ? c.organizations : [];
  };
  const getBuildingsByRegionCity = (regionName, cityName) => {
    const r = activeTenant.regions.find((x) => x.name === regionName);
    const c = r?.cities.find((x) => x.name === cityName);
    return c ? c.buildings : [];
  };
  const getRoomsByRegionCityBuilding = (regionName, cityName, building) => {
    const r = activeTenant.regions.find((x) => x.name === regionName);
    const c = r?.cities.find((x) => x.name === cityName);
    const list = c ? c.rooms : [];
    return list.filter((rm) => rm.building === building);
  };

  // ===== CRUD =====
  const addFurniture = (item) => {
    const nextSeq = seq + 1;

    const tenant = activeTenant;
    const newId = furniture.length ? Math.max(...furniture.map((f) => f.id)) + 1 : 1;

    const invNumber = generateInvNumber({
      countryCode: tenant.countryCode,
      region: item.region,
      city: item.city,
      organization: item.organization,
      building: item.building,
      room: item.room,
      seq: nextSeq,
    });

    const newItem = {
      id: newId,
      invNumber,

      name: item.name,
      price: item.price ?? null,
      type: item.type,
      condition: item.condition || "Good",
      status: item.status || "Active",
      photo: item.photo || null,

      countryCode: tenant.countryCode,
      region: item.region,
      city: item.city,
      organization: item.organization,
      building: item.building,
      room: item.room,

      history: [
        {
          at: nowISO(),
          action: "CREATE",
          from: null,
          to: {
            region: item.region,
            city: item.city,
            organization: item.organization,
            building: item.building,
            room: item.room,
          },
          note: "Initial placement",
        },
      ],
    };

    setStore((prev) => ({
      ...prev,
      seqByTenant: { ...prev.seqByTenant, [activeTenantId]: nextSeq },
      furnitureByTenant: {
        ...prev.furnitureByTenant,
        [activeTenantId]: [...(prev.furnitureByTenant?.[activeTenantId] ?? []), newItem],
      },
    }));
  };

  const updateFurniture = (id, updatedItem) => {
    setStore((prev) => {
      const list = prev.furnitureByTenant?.[activeTenantId] ?? [];
      const before = list.find((x) => x.id === id);
      if (!before) return prev;

      const beforeLoc = {
        region: before.region,
        city: before.city,
        organization: before.organization,
        building: before.building,
        room: before.room,
      };

      const afterLoc = {
        region: updatedItem.region ?? before.region,
        city: updatedItem.city ?? before.city,
        organization: updatedItem.organization ?? before.organization,
        building: updatedItem.building ?? before.building,
        room: updatedItem.room ?? before.room,
      };

      const locationChanged =
        beforeLoc.region !== afterLoc.region ||
        beforeLoc.city !== afterLoc.city ||
        beforeLoc.organization !== afterLoc.organization ||
        beforeLoc.building !== afterLoc.building ||
        beforeLoc.room !== afterLoc.room;

      const nextHistory = locationChanged
        ? [
            ...(before.history || []),
            {
              at: nowISO(),
              action: "MOVE",
              from: beforeLoc,
              to: afterLoc,
              note: "Location updated",
            },
          ]
        : before.history || [];

      const nextList = list.map((x) =>
        x.id === id
          ? {
              ...x,
              ...updatedItem,
              invNumber: x.invNumber, // инв номер НЕ меняется
              history: nextHistory,
            }
          : x
      );

      return {
        ...prev,
        furnitureByTenant: { ...prev.furnitureByTenant, [activeTenantId]: nextList },
      };
    });
  };

  const deleteFurniture = (id) => {
    setStore((prev) => {
      const list = prev.furnitureByTenant?.[activeTenantId] ?? [];
      return {
        ...prev,
        furnitureByTenant: {
          ...prev.furnitureByTenant,
          [activeTenantId]: list.filter((x) => x.id !== id),
        },
      };
    });
  };

  const getFurnitureById = (id) => furniture.find((x) => x.id === Number(id));

  // ===== KPI (National view внутри tenant) =====
  const kpi = useMemo(() => {
    const total = furniture.length;

    const byStatus = STATUSES.reduce((acc, s) => {
      acc[s] = furniture.filter((f) => f.status === s).length;
      return acc;
    }, {});

    const needsRepair = furniture.filter((f) => f.condition === "Needs Repair").length;

    const byRegion = {};
    for (const f of furniture) byRegion[f.region] = (byRegion[f.region] || 0) + 1;

    const byOrg = {};
    for (const f of furniture) byOrg[f.organization] = (byOrg[f.organization] || 0) + 1;

    const topRegions = Object.entries(byRegion)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const topOrgs = Object.entries(byOrg)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const recentMoves = furniture
      .flatMap((f) =>
        (f.history || [])
          .filter((h) => h.action === "MOVE")
          .map((h) => ({ invNumber: f.invNumber, name: f.name, at: h.at, from: h.from, to: h.to }))
      )
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 8);

    return { total, byStatus, needsRepair, topRegions, topOrgs, recentMoves };
  }, [furniture]);

  return (
    <InventoryContext.Provider
      value={{
        // tenant
        tenants,
        activeTenant,
        activeTenantId,
        setActiveTenantId,

        // data
        furniture,
        addFurniture,
        updateFurniture,
        deleteFurniture,
        getFurnitureById,

        // catalogs
        furnitureTypes: FURNITURE_TYPES,
        conditions: CONDITIONS,
        statuses: STATUSES,

        regions,
        getCitiesByRegion,
        getOrgsByRegionCity,
        getBuildingsByRegionCity,
        getRoomsByRegionCityBuilding,

        // analytics
        kpi,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};