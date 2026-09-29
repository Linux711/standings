const CARD_COLUMNS = [
    ["IG", "IH", "IK"],
    ["IL", "IO", "IP"],
    ["IS", "IT", "IW"]
];

let cardMap = {};


/**
 * Load ID → card name mappings from chars.csv
 *
 * CSV format:
 * 50,Yaoyao,Character
 * 51,Baizhu,Character
 * 52,Fatui Cryo Cicin Mage,Character
 */
async function loadCardMapping() {
    const response = await fetch("chars.csv");

    if (!response.ok) {
        throw new Error("Failed to load chars.csv");
    }

    const csv = await response.text();

    csv.split(/\r?\n/).forEach(line => {
        if (!line.trim()) return;

        const columns = line.split(",");

        if (columns.length >= 2) {
            const id = parseInt(columns[0].trim(), 10);
            const name = columns[1].trim();

            if (!isNaN(id)) {
                cardMap[id] = name;
            }
        }
    });
}


/**
 * Convert an Excel column name to its 1-based number.
 *
 * A  = 1
 * Z  = 26
 * AA = 27
 * IG = 243
 */
function excelColumnNumber(column) {
    let result = 0;

    for (const char of column.toUpperCase()) {
        result =
            result * 26 +
            (char.charCodeAt(0) - "A".charCodeAt(0) + 1);
    }

    return result;
}


/**
 * Get the zero-based position relative to IG.
 */
function excelColumnOffset(column) {
    return (
        excelColumnNumber(column) -
        excelColumnNumber("IG")
    );
}


/**
 * Convert Base64 deck code into an uppercase hex string.
 */
function base64ToHexStream(base64String) {
    const binary = atob(base64String);

    let hex = "";

    for (let i = 0; i < binary.length; i++) {
        hex += binary
            .charCodeAt(i)
            .toString(16)
            .padStart(2, "0");
    }

    return hex.toUpperCase();
}


/**
 * Extract a card ID using the same logic as the Python version.
 */
function extractCardId(hexStream, columns) {
    const positions = columns.map(column => {
        let position = excelColumnOffset(column);

        // Same wraparound behavior as Python
        position =
            ((position % hexStream.length) +
                hexStream.length) %
            hexStream.length;

        return position;
    });

    const hexDigits = positions
        .map(position => hexStream[position])
        .join("");

    return parseInt(hexDigits, 16);
}


/**
 * Decode the deck and return ONLY the 3 character names.
 */
async function decodeCharacters(deckCode) {

    // Load chars.csv if it hasn't been loaded yet
    if (Object.keys(cardMap).length === 0) {
        await loadCardMapping();
    }

    const hexStream = base64ToHexStream(deckCode);

    const characters = [];

    for (const columns of CARD_COLUMNS) {

        const cardId = extractCardId(
            hexStream,
            columns
        );

        const cardName =
            cardMap[cardId] ||
            `Unknown (${cardId})`;

        characters.push(cardName);
    }

    return characters;
}