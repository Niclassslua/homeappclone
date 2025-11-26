const dotenv = require('dotenv');
// Lade die .env-Datei (sollte im Root-Verzeichnis liegen)
dotenv.config({ path: '../.env' });

//
// Setze globale Variablen – so kann der rnv-data-client auf diese zugreifen
//
global.CLIENT_API_URL = process.env.CLIENT_API_URL;
global.OAUTH_URL = process.env.OAUTH_URL;
global.CLIENT_ID = process.env.CLIENT_ID;
global.CLIENT_SECRET = process.env.CLIENT_SECRET;
global.RESOURCE_ID = process.env.RESOURCE_ID;
global.ACCESS_TOKEN_CACHE_PATH = process.env.ACCESS_TOKEN_CACHE_PATH;

console.log("process.env:", {
    CLIENT_API_URL: process.env.CLIENT_API_URL,
    OAUTH_URL: process.env.OAUTH_URL,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    RESOURCE_ID: process.env.RESOURCE_ID,
    ACCESS_TOKEN_CACHE_PATH: process.env.ACCESS_TOKEN_CACHE_PATH,
});
console.log("global:", {
    CLIENT_API_URL: global.CLIENT_API_URL,
    OAUTH_URL: global.OAUTH_URL,
    CLIENT_ID: global.CLIENT_ID,
    CLIENT_SECRET: global.CLIENT_SECRET,
    RESOURCE_ID: global.RESOURCE_ID,
    ACCESS_TOKEN_CACHE_PATH: global.ACCESS_TOKEN_CACHE_PATH,
});

//
// Importe
//
const express = require("express");
const cors = require("cors");
const { client } = require("rnv-data-client");

const app = express();

// CORS-Konfiguration (das Frontend läuft z. B. auf http://localhost:3000)
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

//
// 📌 Neuer Endpoint: GraphQL-Schema abrufen
//
app.get("/graphql-schema", async (req, res) => {
    try {
        const accessToken = await client.obtainAccessToken();
        console.log("Token für /graphql-schema:", accessToken);

        const schemaQuery = `
        query {
          __schema {
            queryType {
              name
              fields {
                name
                description
                args {
                  name
                  description
                  type {
                    name
                    kind
                  }
                }
                type {
                  name
                  kind
                }
              }
            }
            mutationType {
              name
              fields {
                name
                description
                args {
                  name
                  description
                  type {
                    name
                    kind
                  }
                }
                type {
                  name
                  kind
                }
              }
            }
            types {
              name
              kind
              fields {
                name
                description
                args {
                  name
                  type {
                    name
                    kind
                  }
                }
                type {
                  name
                  kind
                }
              }
              enumValues {
                name
                description
              }
            }
            directives {
              name
              description
              locations
              args {
                name
                type {
                  name
                  kind
                }
              }
            }
          }
        }
        `;

        const schemaData = await client.doQuery(schemaQuery, accessToken);
        res.json(schemaData);
    } catch (error) {
        console.error("Fehler beim Abrufen des GraphQL-Schemas:", error);
        res.status(500).json({ error: error.message });
    }
});

//
// Endpoint: Access Token abrufen
//
app.get("/get-token", async (req, res) => {
    try {
        const accessToken = await client.obtainAccessToken();
        if (!accessToken) {
            console.error("Kein Token erhalten!");
            return res.status(500).json({ error: "Kein Token erhalten" });
        }
        console.log("Token:", accessToken);
        res.json({ access_token: accessToken });
    } catch (error) {
        console.error("Fehler beim Abrufen des Tokens:", error);
        res.status(500).json({ error: error.message });
    }
});

//
// Endpoint: Stationdaten abrufen – kombiniert Fahrplandaten (Departures) und Verbindungsauskunft (Trips)
//
app.post("/station-data", async (req, res) => {
    const { stationId, origin, destination, departureTime, selectedLines } = req.body;
    if (!stationId) {
        return res.status(400).json({ error: "Kein stationId angegeben!" });
    }
    try {
        const accessToken = await client.obtainAccessToken();
        console.log("Token in /station-data:", accessToken);

        const startTime = new Date().toISOString();
        const endTime = new Date(new Date().getTime() + 10 * 3600000)
            .toISOString()
            .replace(/\.\d{3}Z$/, "Z");

        // Baue den journeys-Argument-Block zusammen
        let journeysArgs = `startTime: "${startTime}", endTime: "${endTime}", first: 10`;
        if (selectedLines && Array.isArray(selectedLines) && selectedLines.length > 0) {
            // Erstelle ein kommagetrenntes Array von String-Literalen, z. B. ["1-1", "4-4"]
            const linesArray = selectedLines.map((line) => `"${line}-${line}"`).join(", ");
            journeysArgs += `, lineIDs: [${linesArray}]`;
        }

        const fullQuery = `
      query {
        station(id: "${stationId}") {
          id
          hafasID
          globalID
          shortName
          name
          longName
          place
          style {
            primary { hex }
            secondary { hex }
            contrast { hex }
            icon { address }
            image { address }
            video { address }
            audio { address }
            font { address }
            misc { address }
          }
          location { lat long hash }
          journeys(${journeysArgs}) {
            totalCount
            cursor
            elements {
              ... on Journey {
                id
                capacity {
                  total
                  seats
                  standing
                  special
                }
                canceled
                cancelled
                vehicles
                line { 
                  id 
                }
                loadsForecastType
                loads(onlyHafasID: "${stationId}") {
                  realtime
                  forecast
                  adjusted
                  loadType
                  ratio
                }
                stops(onlyHafasID: "${stationId}") {
                  plannedDeparture { isoString }
                  realtimeDeparture { isoString }
                  destinationLabel
                  pole {
                    platform {
                      id
                      label
                      barrierFreeType
                    }
                  }
                }
                type
              }
            }
          }
          lines {
            totalCount
            elements {
              ... on Line {
                id
                lineGroup { id label }
                style { primary { hex } }
              }
            }
          }
          platforms {
            totalCount
            elements {
              ... on Platform {
                id
                label
                type
                barrierFreeType
                locationType
              }
            }
          }
          poles {
            totalCount
            elements {
              ... on Pole {
                id
                location { lat long }
                hasStops
              }
            }
          }
          uffbasses {
            totalCount
            cursor
            elements {
              ... on Uffbasse {
                id
                type
                validFrom { isoString }
                validUntil { isoString }
                displayFrom { isoString }
                date { isoString }
                title
                text
                rawTitle
                rawText
                links {
                  protocol
                  host
                  port
                  path
                  pathname
                  query
                  search
                  address
                }
                images {
                  protocol
                  host
                  port
                  path
                  pathname
                  query
                  search
                  address
                }
                thumbs {
                  protocol
                  host
                  port
                  path
                  pathname
                  query
                  search
                  address
                }
              }
            }
          }
          informations(first: 10) {
            totalCount
            cursor
            elements {
              ... on Information {
                id
                validFrom { isoString }
                validUntil { isoString }
                displayFrom { isoString }
                date { isoString }
                title
                text
                affectedStations {
                  totalCount
                  cursor
                  elements {
                    ... on Station {
                      id
                      name
                      shortName
                      longName
                    }
                  }
                }
                affectedPlatforms {
                  totalCount
                  cursor
                  elements {
                    ... on Platform {
                      id
                      label
                      type
                    }
                  }
                }
                affectedPoles {
                  totalCount
                  cursor
                  elements {
                    ... on Pole {
                      id
                      location { lat long }
                    }
                  }
                }
                regions {
                  totalCount
                  cursor
                  elements {
                    ... on Region {
                      id
                      title
                      description
                    }
                  }
                }
                links {
                  protocol
                  host
                  port
                  path
                  pathname
                  query
                  search
                  address
                }
              }
            }
          }
          announcements(first: 10) {
            totalCount
            cursor
            elements {
              ... on Announcement {
                id
                validFrom { isoString }
                validUntil { isoString }
                displayFrom { isoString }
                date { isoString }
                announceFromDate { isoString }
                announceUntilDate { isoString }
                announceOnDays
                announceOnStartTime
                announceOnEndTime
                announceOnTimingInMinutes
                title
                text
                affectedStations {
                  totalCount
                  cursor
                  elements {
                    ... on Station {
                      id
                      name
                    }
                  }
                }
                affectedPlatforms {
                  totalCount
                  cursor
                  elements {
                    ... on Platform {
                      id
                      label
                    }
                  }
                }
                affectedPoles {
                  totalCount
                  cursor
                  elements {
                    ... on Pole {
                      id
                    }
                  }
                }
                regions {
                  totalCount
                  cursor
                  elements {
                    ... on Region {
                      id
                      title
                    }
                  }
                }
                links {
                  protocol
                  host
                  port
                  path
                  pathname
                  query
                  search
                  address
                }
              }
            }
          }
          regions(first: 10) {
            totalCount
            cursor
            elements {
              ... on Region {
                id
                title
                description
                scope
                affectedLines {
                  totalCount
                  cursor
                  elements {
                    ... on Line {
                      id
                    }
                  }
                }
                affectedStations {
                  totalCount
                  cursor
                  elements {
                    ... on Station {
                      id
                      name
                    }
                  }
                }
                affectedPlatforms {
                  totalCount
                  cursor
                  elements {
                    ... on Platform {
                      id
                      label
                    }
                  }
                }
                affectedPoles {
                  totalCount
                  cursor
                  elements {
                    ... on Pole {
                      id
                    }
                  }
                }
                regions {
                  totalCount
                  cursor
                  elements {
                    ... on Region {
                      id
                      title
                    }
                  }
                }
                links {
                  protocol
                  host
                  port
                  path
                  pathname
                  query
                  search
                  address
                }
                informations {
                  totalCount
                  cursor
                  elements {
                    ... on Information {
                      id
                      title
                    }
                  }
                }
                tickers {
                  totalCount
                  cursor
                  elements {
                    ... on Ticker {
                      id
                      title
                    }
                  }
                }
                announcements {
                  totalCount
                  cursor
                  elements {
                    ... on Announcement {
                      id
                      title
                    }
                  }
                }
              }
            }
          }
          vrnStops {
            timetabledTime { isoString }
            platform
            estimatedTime { isoString }
            service {
              type
              name
              description
              destinationLabel
              lineGroup { id label }
            }
            stopsChain {
              timetabledTime { isoString }
              platform
              estimatedTime { isoString }
              globalID
              name
              stopSequence
              station { id }
              VRNStation { 
                place
                location { lat long }
              }
            }
            situations {
              created { isoString }
              validFrom { isoString }
              validUntil { isoString }
              title
              rawTitle
              text
              rawText
            }
          }
          hasVRNStops
          tags(first: 10) {
            totalCount
            cursor
            elements {
              ... on Tag {
                id
                key
                value
                references {
                  totalCount
                  cursor
                  elements {
                    ... on Tag {
                      id
                      key
                      value
                    }
                  }
                }
              }
            }
          }
        }
        trips(
          originGlobalID: "${origin || stationId}",
          destinationGlobalID: "${destination || 'de:08222:ZIEL'}",
          departureTime: "${departureTime || new Date().toISOString()}"
        ) {
          startTime { isoString }
          endTime { isoString }
          interchanges
          legs {
            ... on TimedLeg {
              board {
                point { ... on StopPoint { ref } }
                timetabledTime { isoString }
                estimatedTime { isoString }
              }
              alight {
                point { ... on StopPoint { ref } }
                timetabledTime { isoString }
                estimatedTime { isoString }
              }
              service {
                type
                name
                description
                destinationLabel
                lineGroup { id label }
              }
            }
            ... on InterchangeLeg {
              mode
              start { ... on StopPoint { ref } }
              end { ... on StopPoint { ref } }
              startTime { isoString }
              endTime { isoString }
            }
            ... on ContinuousLeg {
              mode
              start { ... on StopPoint { ref } }
              end { ... on StopPoint { ref } }
              startTime { isoString }
              endTime { isoString }
            }
          }
        }
        # Zusätzliche Root-Felder:
        lineGroups(first: 10) {
          totalCount
          cursor
          elements {
            ... on LineGroup {
              id
              label
              style { primary { hex } }
              type
            }
          }
        }
        vrnStations(first: 10) {
          totalCount
          cursor
          elements {
            ... on VRNStation {
              place
              location { lat long }
            }
          }
        }
        ping {
          realtimeStatus
          dbStatus
        }
      }
    `;

        const fullData = await client.doQuery(fullQuery, accessToken);

        // Filtere in jedem Journey-Objekt die stops, bei denen plannedDeparture.isoString null ist
        if (
            fullData &&
            fullData.data &&
            fullData.data.station &&
            fullData.data.station.journeys &&
            fullData.data.station.journeys.elements
        ) {
            fullData.data.station.journeys.elements = fullData.data.station.journeys.elements.map((journey) => {
                if (journey.stops) {
                    journey.stops = journey.stops.filter(
                        (stop) => stop.plannedDeparture && stop.plannedDeparture.isoString !== null
                    );
                }
                return journey;
            });
        }

        res.json(fullData);
    } catch (error) {
        console.error("❌ Fehler beim Abrufen der Stationsdaten:", JSON.stringify(error, null, 2));
        res.status(500).json({ error: error.message });
    }
});

//
// Server starten
//
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`✅ Backend läuft auf http://localhost:${PORT}`);
});